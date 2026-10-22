-- Dixième mise à jour de la base: groupe complet, stats d'achalandage, annonces récurrentes, alertes push.
-- À coller dans Supabase: SQL Editor > New query > Run. À rouler APRÈS ameliorations8.sql (et ameliorations9.sql).
-- On peut la rouler plus d'une fois sans problème. Elle remplace deux fonctions de ameliorations8.sql (demander_rejoindre et
-- agir_demande): si tu relances ameliorations8.sql un jour, relance ameliorations10.sql juste après.
-- Quatre parties (les titres « PARTIE n » les séparent): groupe complet, statistiques, annonces qui se répètent, alertes.

do $$
begin
  if to_regclass('public.groupes') is null or to_regclass('public.demandes') is null then
    raise exception 'Roule ameliorations8.sql avant celui-ci.';
  end if;
end
$$;

-- ############################################################
-- PARTIE 1: groupe complet et places
-- ############################################################
-- Le chef peut marquer son groupe « complet » (plus de nouvelles demandes). Pour un donjon (chef + 4) et pour un raid avec
-- composition (nombre de joueurs cherchés), le groupe devient complet tout seul quand le dernier joueur est accepté,
-- et se rouvre si quelqu'un part ou est retiré.
alter table public.groupes add column if not exists complet boolean not null default false;

-- Nombre de joueurs à accepter (sans le chef) pour que le groupe soit plein, ou null si on ne le sait pas.
create or replace function public.groupe_places_max(p_annonce uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select case
    when a.activite = 'donjon' then 4
    when a.activite = 'raid' and a.roles_nb is not null then
      (select coalesce(sum(case when value ~ '^[0-9]+$' then value::int else 0 end), 0)::int from jsonb_each_text(a.roles_nb))
    else null
  end
  from public.annonces a where a.id = p_annonce;
$$;
revoke all on function public.groupe_places_max(uuid) from public, anon, authenticated;

create or replace function public.groupe_ajuster_complet(p_groupe uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  g public.groupes;
  maxi int;
  nb int;
begin
  select * into g from public.groupes where id = p_groupe;
  if not found or g.annonce_id is null then return; end if;
  maxi := public.groupe_places_max(g.annonce_id);
  if maxi is null or maxi <= 0 then return; end if;
  select count(*) into nb from public.demandes where groupe_id = p_groupe and statut = 'acceptee';
  if nb >= maxi and not g.complet then
    update public.groupes set complet = true where id = p_groupe;
  elsif nb < maxi and g.complet then
    update public.groupes set complet = false where id = p_groupe;
  end if;
end;
$$;
revoke all on function public.groupe_ajuster_complet(uuid) from public, anon, authenticated;

-- Le chef ferme ou rouvre les demandes.
create or replace function public.groupe_complet(p_groupe uuid, p_complet boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  moi uuid := auth.uid();
  g public.groupes;
begin
  if moi is null then
    raise exception 'connexion requise' using errcode = '28000';
  end if;
  if p_complet is null then
    raise exception 'valeur invalide' using errcode = '22023';
  end if;
  select * into g from public.groupes where id = p_groupe for update;
  if not found or g.chef <> moi then
    raise exception 'réservé au chef du groupe' using errcode = '42501';
  end if;
  if g.ferme or g.fin_le <= now() or exists (select 1 from public.bannis where user_id = moi) then
    raise exception 'groupe fermé' using errcode = '42501';
  end if;
  update public.groupes set complet = p_complet where id = p_groupe;
  return p_complet;
end;
$$;
revoke all on function public.groupe_complet(uuid, boolean) from public, anon;
grant execute on function public.groupe_complet(uuid, boolean) to authenticated;

-- Pour les cartes: qui est déjà dans le groupe (nombre seulement, par rôle), et si le groupe est complet. Public (aucun nom).
create or replace function public.places_groupes()
returns table (annonce_id uuid, complet boolean, acceptes int, par_role jsonb)
language sql
stable
security definer
set search_path = public
as $$
  select g.annonce_id, g.complet,
         (select count(*)::int from public.demandes d where d.groupe_id = g.id and d.statut = 'acceptee'),
         coalesce((select jsonb_object_agg(q.role, q.n)
                     from (select d2.role, count(*)::int as n from public.demandes d2
                            where d2.groupe_id = g.id and d2.statut = 'acceptee' and d2.role is not null
                            group by d2.role) q), '{}'::jsonb)
  from public.groupes g
  join public.annonces a on a.id = g.annonce_id and a.expires_at > now()
  where not g.ferme
    and (g.complet or exists (select 1 from public.demandes x where x.groupe_id = g.id and x.statut = 'acceptee'));
$$;
revoke all on function public.places_groupes() from public;
grant execute on function public.places_groupes() to anon, authenticated;

-- Les fonctions du chat qui changent (les anciennes versions sont remplacées).
create or replace function public.demander_rejoindre(p_annonce uuid, p_role text default null, p_message text default '')
returns text
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  moi uuid := auth.uid();
  g   public.groupes;
  d   public.demandes;
  msg text := btrim(coalesce(p_message, ''));
begin
  if moi is null then
    raise exception 'connexion requise' using errcode = '28000';
  end if;
  if p_annonce is null or (p_role is not null and p_role not in ('tank', 'heal', 'dps')) or char_length(msg) > 140 then
    raise exception 'demande invalide' using errcode = '22023';
  end if;
  if not exists (select 1 from public.profils where user_id = moi) then
    raise exception 'crée ton profil avant de demander à rejoindre' using errcode = '22023';
  end if;
  if exists (select 1 from public.bannis where user_id = moi) then
    raise exception 'compte suspendu' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('demande' || moi::text, 0));
  perform public.purger_chats();

  select gr.* into g
    from public.groupes gr
    join public.annonces a on a.id = gr.annonce_id
    where a.id = p_annonce and a.expires_at > now() and not gr.ferme;
  if not found then
    raise exception 'annonce introuvable' using errcode = 'P0002';
  end if;
  if g.chef = moi then
    raise exception 'c''est ta propre annonce' using errcode = '22023';
  end if;
  if public.chat_est_bloque(moi, g.chef) or exists (select 1 from public.bannis where user_id = g.chef) then
    raise exception 'demande impossible' using errcode = '42501';
  end if;

  select * into d from public.demandes where groupe_id = g.id and de = moi;
  if found then
    if d.statut in ('en_attente', 'acceptee') then
      return d.statut;
    elsif d.statut <> 'quitte' then
      raise exception 'demande refusée' using errcode = '42501';
    end if;
  end if;

  if g.complet then
    raise exception 'groupe complet' using errcode = '55000';
  end if;
  if (select count(*) from public.demandes where de = moi and statut = 'en_attente') >= 10 then
    raise exception 'trop de demandes en attente' using errcode = '54000';
  end if;
  if (select count(*) from public.demandes where de = moi and created_at > now() - interval '24 hours') >= 20 then
    raise exception 'trop de demandes aujourd''hui' using errcode = '54000';
  end if;
  if (select count(*) from public.demandes where groupe_id = g.id and statut = 'en_attente') >= 40 then
    raise exception 'ce groupe a déjà beaucoup de demandes' using errcode = '54000';
  end if;

  if d.id is not null then
    update public.demandes
       set statut = 'en_attente', role = p_role, message = msg, created_at = now(), repondu_le = null
     where id = d.id;
  else
    insert into public.demandes (groupe_id, de, role, message) values (g.id, moi, p_role, msg);
  end if;
  return 'en_attente';
end;
$$;

create or replace function public.agir_demande(p_demande uuid, p_action text)
returns text
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  moi uuid := auth.uid();
  d   public.demandes;
  g   public.groupes;
begin
  if moi is null then
    raise exception 'connexion requise' using errcode = '28000';
  end if;
  if p_action is null or p_action not in ('accepter', 'refuser', 'expulser', 'annuler', 'quitter') then
    raise exception 'action inconnue' using errcode = '22023';
  end if;

  select * into d from public.demandes where id = p_demande for update;
  if not found then
    raise exception 'demande introuvable' using errcode = 'P0002';
  end if;
  select * into g from public.groupes where id = d.groupe_id;
  if g.fin_le <= now() - interval '24 hours' then
    raise exception 'ce groupe est terminé' using errcode = 'P0002';
  end if;

  if p_action in ('annuler', 'quitter') then
    if d.de <> moi then
      raise exception 'pas ta demande' using errcode = '42501';
    end if;
    if p_action = 'annuler' then
      if d.statut <> 'en_attente' then
        raise exception 'demande déjà traitée' using errcode = '22023';
      end if;
      delete from public.demandes where id = d.id;
      return 'aucun';
    end if;
    if d.statut <> 'acceptee' then
      raise exception 'tu n''es pas dans ce groupe' using errcode = '22023';
    end if;
    update public.demandes set statut = 'quitte', repondu_le = now() where id = d.id;
    insert into public.messages_groupe (groupe_id, de, genre) values (g.id, moi, 'quitte');
    perform public.groupe_ajuster_complet(g.id);
    return 'quitte';
  end if;

  -- Actions du chef
  if g.chef <> moi then
    raise exception 'réservé au chef du groupe' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('groupe' || g.id::text, 0));

  if p_action = 'accepter' then
    if d.statut = 'acceptee' then
      return 'acceptee';
    end if;
    if d.statut not in ('en_attente', 'refusee') then
      raise exception 'demande terminée' using errcode = '22023';
    end if;
    if g.ferme or exists (select 1 from public.bannis where user_id = moi) then
      raise exception 'groupe fermé' using errcode = '42501';
    end if;
    if exists (select 1 from public.bannis where user_id = d.de) or public.chat_est_bloque(moi, d.de) then
      raise exception 'impossible d''accepter ce joueur' using errcode = '42501';
    end if;
    if (select count(*) from public.demandes where groupe_id = g.id and statut = 'acceptee') >= 39 then
      raise exception 'le groupe est plein' using errcode = '54000';
    end if;
    update public.demandes set statut = 'acceptee', repondu_le = now() where id = d.id;
    insert into public.messages_groupe (groupe_id, de, genre) values (g.id, d.de, 'rejoint');
    perform public.groupe_ajuster_complet(g.id);
    return 'acceptee';
  elsif p_action = 'refuser' then
    if d.statut <> 'en_attente' then
      raise exception 'demande déjà traitée' using errcode = '22023';
    end if;
    update public.demandes set statut = 'refusee', repondu_le = now() where id = d.id;
    return 'refusee';
  else
    if d.statut <> 'acceptee' then
      raise exception 'ce joueur n''est pas dans le groupe' using errcode = '22023';
    end if;
    update public.demandes set statut = 'expulse', repondu_le = now() where id = d.id;
    insert into public.messages_groupe (groupe_id, de, genre) values (g.id, d.de, 'expulse');
    perform public.groupe_ajuster_complet(g.id);
    return 'expulse';
  end if;
end;
$$;
revoke all on function public.demander_rejoindre(uuid, text, text) from public, anon;
grant execute on function public.demander_rejoindre(uuid, text, text) to authenticated;
revoke all on function public.agir_demande(uuid, text) from public, anon;
grant execute on function public.agir_demande(uuid, text) to authenticated;

-- ############################################################
-- PARTIE 2: statistiques d'achalandage (quand les groupes se forment)
-- ############################################################
-- Seulement des compteurs: combien d'annonces par semaine, jour et heure de départ (heure de l'Est). Aucun nom, aucun lien
-- avec un compte. Les compteurs de plus de 12 semaines sont effacés.
create table if not exists public.activite_horaire (
  semaine  date     not null,
  jour     smallint not null check (jour between 0 and 6),   -- 0 = dimanche
  heure    smallint not null check (heure between 0 and 23),
  annonces int      not null default 0,
  primary key (semaine, jour, heure)
);
alter table public.activite_horaire enable row level security;
revoke all on public.activite_horaire from anon, authenticated;

create or replace function public.compter_activite(p_quand timestamptz)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  local timestamp := p_quand at time zone 'America/Toronto';
begin
  insert into public.activite_horaire (semaine, jour, heure, annonces)
  values (date_trunc('week', local)::date, extract(dow from local)::int, extract(hour from local)::int, 1)
  on conflict (semaine, jour, heure) do update set annonces = public.activite_horaire.annonces + 1;
end;
$$;
revoke all on function public.compter_activite(timestamptz) from public, anon, authenticated;

create or replace function public.annonce_vers_activite()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.compter_activite(coalesce(new.debut, new.created_at, now()));
  if random() < 0.05 then
    delete from public.activite_horaire where semaine < (now() - interval '12 weeks')::date;
  end if;
  return new;
end;
$$;
revoke all on function public.annonce_vers_activite() from public, anon, authenticated;

drop trigger if exists annonce_activite on public.annonces;
create trigger annonce_activite
  after insert on public.annonces
  for each row execute function public.annonce_vers_activite();

-- Les annonces déjà publiées comptent aussi (une seule fois: seulement si le tableau est vide).
do $$
begin
  if not exists (select 1 from public.activite_horaire) then
    insert into public.activite_horaire (semaine, jour, heure, annonces)
    select date_trunc('week', t.local)::date, extract(dow from t.local)::int, extract(hour from t.local)::int, count(*)::int
    from (select coalesce(a.debut, a.created_at) at time zone 'America/Toronto' as local from public.annonces a) t
    group by 1, 2, 3;
  end if;
end
$$;

-- Les 8 dernières semaines, additionnées par jour et heure. Public (aucun renseignement personnel).
create or replace function public.stats_achalandage()
returns table (jour int, heure int, n int)
language sql
stable
security definer
set search_path = public
as $$
  select h.jour::int, h.heure::int, sum(h.annonces)::int
  from public.activite_horaire h
  where h.semaine >= (now() - interval '8 weeks')::date
  group by h.jour, h.heure
  order by h.jour, h.heure;
$$;
revoke all on function public.stats_achalandage() from public;
grant execute on function public.stats_achalandage() to anon, authenticated;

-- ############################################################
-- PARTIE 3: annonces qui se répètent chaque semaine
-- ############################################################
-- Une annonce planifiée (avec une heure de départ) peut être répétée chaque semaine, à la même heure (heure de l'Est).
-- La nouvelle annonce est publiée 24 heures avant le départ, par la première personne connectée qui ouvre le site à ce
-- moment-là (pas de tâche programmée à installer). Maximum 3 répétitions par personne.
create table if not exists public.recurrences (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  source     uuid,                       -- l'annonce à partir de laquelle la répétition a été créée
  derniere   uuid,                       -- la dernière annonce publiée par la répétition
  modele     jsonb not null,             -- ce qu'il faut republier (contact compris: la table reste fermée)
  prochain   timestamptz not null,       -- prochain départ à publier
  created_at timestamptz not null default now()
);
create index if not exists recurrences_user_idx on public.recurrences (user_id);
create index if not exists recurrences_prochain_idx on public.recurrences (prochain);
create unique index if not exists recurrences_source_idx on public.recurrences (source) where source is not null;
alter table public.recurrences enable row level security;
revoke all on public.recurrences from anon, authenticated;

-- Le même départ, une semaine plus tard (à la même heure locale, même quand l'heure avance ou recule).
create or replace function public.semaine_suivante(p_quand timestamptz)
returns timestamptz
language sql
immutable
as $$
  select (((p_quand at time zone 'America/Toronto') + interval '7 days') at time zone 'America/Toronto');
$$;
revoke all on function public.semaine_suivante(timestamptz) from public, anon, authenticated;

create or replace function public.creer_recurrence(p_annonce uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  moi uuid := auth.uid();
  a   public.annonces;
  rid uuid;
begin
  if moi is null then
    raise exception 'connexion requise' using errcode = '28000';
  end if;
  if exists (select 1 from public.bannis where user_id = moi) then
    raise exception 'compte suspendu' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('recurrence' || moi::text, 0));

  select * into a from public.annonces where id = p_annonce and user_id = moi and expires_at > now();
  if not found then
    raise exception 'annonce introuvable' using errcode = 'P0002';
  end if;
  if a.debut is null or a.genre <> 'groupe' then
    raise exception 'seule une annonce de groupe avec une heure de départ peut se répéter' using errcode = '22023';
  end if;

  select id into rid from public.recurrences where user_id = moi and (source = p_annonce or derniere = p_annonce);
  if found then
    return rid;
  end if;
  if (select count(*) from public.recurrences where user_id = moi) >= 3 then
    raise exception 'trop de répétitions' using errcode = '54000';
  end if;

  insert into public.recurrences (user_id, source, derniere, modele, prochain)
  values (moi, a.id, a.id,
          jsonb_build_object('genre', a.genre, 'activite', a.activite, 'cible', a.cible, 'faction', a.faction, 'ruleset', a.ruleset,
                             'region', a.region, 'niveau_min', a.niveau_min, 'niveau_max', a.niveau_max, 'roles', to_jsonb(a.roles),
                             'roles_nb', a.roles_nb, 'perso', a.perso, 'contact', a.contact, 'note', a.note, 'style', a.style,
                             'langue', a.langue, 'classe', a.classe),
          public.semaine_suivante(a.debut))
  returning id into rid;
  return rid;
end;
$$;

create or replace function public.mes_recurrences()
returns table (id uuid, source uuid, derniere uuid, prochain timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, r.source, r.derniere, r.prochain from public.recurrences r where r.user_id = auth.uid() order by r.prochain;
$$;

create or replace function public.arreter_recurrence(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'connexion requise' using errcode = '28000';
  end if;
  delete from public.recurrences where id = p_id and user_id = auth.uid();
end;
$$;

-- Publie les annonces dont le départ tombe dans les prochaines 24 heures. Appelée par le site quand quelqu'un est connecté.
-- Retourne le nombre d'annonces publiées.
create or replace function public.generer_recurrences()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  r      record;
  p      timestamptz;
  nouvel uuid;
  n      int := 0;
begin
  if auth.uid() is null then
    raise exception 'connexion requise' using errcode = '28000';
  end if;
  for r in
    select * from public.recurrences where prochain <= now() + interval '24 hours' order by prochain limit 20 for update skip locked
  loop
    p := r.prochain;
    -- personne n'a ouvert le site pendant cette semaine-là: on saute à la prochaine
    while p < now() - interval '10 minutes' loop
      p := public.semaine_suivante(p);
    end loop;

    if exists (select 1 from public.bannis where user_id = r.user_id) then
      delete from public.recurrences where id = r.id;
    elsif p > now() + interval '24 hours' then
      update public.recurrences set prochain = p where id = r.id;
    elsif (select count(*) from public.annonces a where a.user_id = r.user_id and a.expires_at > now()) >= 5 then
      null;  -- trop d'annonces actives: on réessaie à la prochaine visite
    else
      begin
        insert into public.annonces (user_id, expires_at, debut, genre, activite, cible, faction, ruleset, region, niveau_min, niveau_max,
                                     roles, roles_nb, perso, contact, note, style, langue, classe)
        select r.user_id, p + interval '1 hour', p, x.genre, x.activite, x.cible, x.faction, x.ruleset, x.region, x.niveau_min, x.niveau_max,
               coalesce(x.roles, '{}'), x.roles_nb, x.perso, x.contact, coalesce(x.note, ''), x.style, x.langue, x.classe
        from jsonb_populate_record(null::public.annonces, r.modele) x
        returning id into nouvel;
        update public.recurrences set derniere = nouvel, prochain = public.semaine_suivante(p) where id = r.id;
        n := n + 1;
      exception when others then
        update public.recurrences set prochain = public.semaine_suivante(p) where id = r.id;
      end;
    end if;
  end loop;
  return n;
end;
$$;

revoke all on function public.creer_recurrence(uuid) from public, anon;
revoke all on function public.mes_recurrences() from public, anon;
revoke all on function public.arreter_recurrence(uuid) from public, anon;
revoke all on function public.generer_recurrences() from public, anon;
grant execute on function public.creer_recurrence(uuid) to authenticated;
grant execute on function public.mes_recurrences() to authenticated;
grant execute on function public.arreter_recurrence(uuid) to authenticated;
grant execute on function public.generer_recurrences() to authenticated;

-- ############################################################
-- PARTIE 4: alertes sur l'appareil (notifications push)
-- ############################################################
-- Quand quelqu'un demande à rejoindre ton groupe, accepte ta demande, écrit dans ton groupe ou t'écrit comme ami,
-- ton téléphone ou ton ordinateur peut afficher une alerte, même si le site est fermé. Chaque personne l'active elle-même,
-- appareil par appareil (onglet Messages). L'alerte ne contient jamais le texte du message.
--
-- Pour que ça marche, il faut aussi les réglages « push_url » et « push_secret » (voir le README, section « Alertes »).
-- Sans eux, rien n'est envoyé et le reste du site marche normalement.
create table if not exists public.push_abonnements (
  endpoint   text primary key check (char_length(endpoint) between 20 and 1000),
  user_id    uuid not null references auth.users (id) on delete cascade,
  p256dh     text not null check (char_length(p256dh) between 10 and 200),
  auth       text not null check (char_length(auth) between 10 and 100),
  created_at timestamptz not null default now(),
  vu_le      timestamptz not null default now()
);
create index if not exists push_abonnements_user_idx on public.push_abonnements (user_id);
alter table public.push_abonnements enable row level security;
revoke all on public.push_abonnements from anon, authenticated;

-- Une alerte au plus toutes les 2 minutes par conversation et par personne.
create table if not exists public.push_envois (
  user_id uuid not null references auth.users (id) on delete cascade,
  cle     text not null,
  dernier timestamptz not null default now(),
  primary key (user_id, cle)
);
alter table public.push_envois enable row level security;
revoke all on public.push_envois from anon, authenticated;

create table if not exists public.reglages (
  cle    text primary key,
  valeur text not null
);
alter table public.reglages enable row level security;
revoke all on public.reglages from anon, authenticated;

create extension if not exists pg_net with schema extensions;

create or replace function public.enregistrer_push(p_endpoint text, p_p256dh text, p_auth text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  moi uuid := auth.uid();
begin
  if moi is null then
    raise exception 'connexion requise' using errcode = '28000';
  end if;
  if p_endpoint !~ '^https://' or char_length(coalesce(p_p256dh, '')) < 10 or char_length(coalesce(p_auth, '')) < 10 then
    raise exception 'abonnement invalide' using errcode = '22023';
  end if;
  delete from public.push_abonnements where vu_le < now() - interval '60 days';
  -- au plus 5 appareils par personne: les plus anciens sont remplacés
  delete from public.push_abonnements
   where user_id = moi and endpoint <> p_endpoint
     and endpoint not in (select endpoint from public.push_abonnements where user_id = moi and endpoint <> p_endpoint order by vu_le desc limit 4);
  insert into public.push_abonnements (endpoint, user_id, p256dh, auth)
  values (p_endpoint, moi, p_p256dh, p_auth)
  on conflict (endpoint) do update set user_id = moi, p256dh = excluded.p256dh, auth = excluded.auth, vu_le = now();
end;
$$;

create or replace function public.retirer_push(p_endpoint text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'connexion requise' using errcode = '28000';
  end if;
  delete from public.push_abonnements where endpoint = p_endpoint and user_id = auth.uid();
end;
$$;

-- Combien d'appareils j'ai activés (pour afficher l'état dans le site).
create or replace function public.mes_appareils_push()
returns int
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int from public.push_abonnements where user_id = auth.uid();
$$;

revoke all on function public.enregistrer_push(text, text, text) from public, anon;
revoke all on function public.retirer_push(text) from public, anon;
revoke all on function public.mes_appareils_push() from public, anon;
grant execute on function public.enregistrer_push(text, text, text) to authenticated;
grant execute on function public.retirer_push(text) to authenticated;
grant execute on function public.mes_appareils_push() to authenticated;

-- Envoie l'alerte à la fonction du site (Netlify), qui la remet aux appareils. Ne fait jamais échouer le message ou la demande.
create or replace function public.notifier_push(p_users uuid[], p_cle text, p_texte text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  adresse text;
  secret  text;
  abonnes jsonb;
begin
  select valeur into adresse from public.reglages where cle = 'push_url';
  select valeur into secret from public.reglages where cle = 'push_secret';
  if adresse is null or secret is null or p_users is null or cardinality(p_users) = 0 then
    return;
  end if;

  with cibles as (
    select s.user_id, s.endpoint, s.p256dh, s.auth
    from public.push_abonnements s
    where s.user_id = any (p_users)
      and not exists (
        select 1 from public.push_envois e
         where e.user_id = s.user_id and e.cle = p_cle and e.dernier > now() - interval '2 minutes'
      )
  ), notes as (
    insert into public.push_envois (user_id, cle, dernier)
    select distinct c.user_id, p_cle, now() from cibles c
    on conflict (user_id, cle) do update set dernier = now()
    returning 1
  )
  select jsonb_agg(jsonb_build_object('endpoint', c.endpoint, 'p256dh', c.p256dh, 'auth', c.auth))
    into abonnes
  from cibles c;

  if abonnes is null then
    return;
  end if;

  perform net.http_post(
    url     := adresse,
    body    := jsonb_build_object('titre', 'Babillard Forever', 'texte', p_texte, 'url', '/?vue=messages', 'abonnes', abonnes),
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || secret)
  );
exception when others then
  null; -- une alerte perdue vaut mieux qu'une demande ou un message refusé
end;
$$;
revoke all on function public.notifier_push(uuid[], text, text) from public, anon, authenticated;

-- Déclencheurs
create or replace function public.push_demande()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  g public.groupes;
begin
  select * into g from public.groupes where id = new.groupe_id;
  if not found then
    return new;
  end if;
  if new.statut = 'en_attente' and (tg_op = 'INSERT' or old.statut is distinct from 'en_attente') then
    perform public.notifier_push(array[g.chef], 'd:' || g.id::text,
      case when g.genre = 'joueur' then 'Quelqu’un te propose un groupe.' else 'Nouvelle demande pour rejoindre ton groupe.' end);
  elsif new.statut = 'acceptee' and tg_op = 'UPDATE' and old.statut is distinct from 'acceptee' then
    perform public.notifier_push(array[new.de], 'a:' || new.id::text, 'Ta demande a été acceptée. Ouvre le chat du groupe.');
  end if;
  return new;
end;
$$;
drop trigger if exists demande_push on public.demandes;
create trigger demande_push
  after insert or update of statut on public.demandes
  for each row execute function public.push_demande();

create or replace function public.push_message_groupe()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  g public.groupes;
  destinataires uuid[];
begin
  if new.genre <> 'texte' then
    return new;
  end if;
  select * into g from public.groupes where id = new.groupe_id;
  if not found then
    return new;
  end if;
  select coalesce(array_agg(u), '{}') into destinataires
  from (
    select g.chef as u
    union
    select d.de from public.demandes d where d.groupe_id = g.id and d.statut = 'acceptee'
  ) t
  where u <> new.de;
  perform public.notifier_push(destinataires, 'g:' || g.id::text, 'Nouveau message dans ton groupe.');
  return new;
end;
$$;
drop trigger if exists message_groupe_push on public.messages_groupe;
create trigger message_groupe_push
  after insert on public.messages_groupe
  for each row execute function public.push_message_groupe();

create or replace function public.push_message_ami()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  nom text;
begin
  select perso into nom from public.profils where user_id = new.de;
  perform public.notifier_push(array[new.pour], 'f:' || new.de::text,
    case when nom is null then 'Nouveau message d’un ami.' else 'Nouveau message de ' || nom || '.' end);
  return new;
end;
$$;
drop trigger if exists message_ami_push on public.messages_amis;
create trigger message_ami_push
  after insert on public.messages_amis
  for each row execute function public.push_message_ami();
