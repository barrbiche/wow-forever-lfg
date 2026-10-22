-- Huitième mise à jour de la base: demandes pour rejoindre un groupe, chat de groupe et chat entre amis.
-- À coller dans Supabase: SQL Editor > New query > Run. À rouler APRÈS ameliorations7.sql.
-- On peut la rouler plus d'une fois sans problème. Elle ne supprime aucune annonce, guilde, profil ni amitié.
--
-- Comment ça marche:
--   - Chaque annonce a un « groupe » (créé tout seul). Un joueur connecté, avec un profil, peut y envoyer une demande
--     (avec son rôle et un petit mot). Le chef (l'auteur de l'annonce) accepte, refuse ou retire quelqu'un.
--   - Le contact (BattleTag) d'une annonce n'est plus visible pour les autres joueurs. Il est donné seulement
--     au chef et aux joueurs acceptés, dans le chat du groupe.
--   - Le chat de groupe est lisible par le chef et les joueurs acceptés seulement. Il est effacé 24 heures
--     après la fin de l'annonce (expirée, retirée par le chef ou retirée par la modération).
--   - Les amis ont aussi un chat privé. Ses messages sont effacés après 30 jours.
--   - Un message peut être signalé. À trois signalements de trois personnes différentes, il est masqué.
--     La page « Modération » montre les messages signalés (avec les quelques messages d'avant) pour décider.
--   - Limites: 15 messages par 30 secondes et 1000 par jour par joueur; 10 demandes en attente et 20 par jour;
--     500 caractères par message; 40 joueurs par groupe. Les comptes suspendus ne peuvent plus rien écrire.
--   - Les tables ne sont pas lisibles directement: tout passe par les fonctions plus bas.

do $$
begin
  if to_regclass('public.amities') is null or to_regclass('public.bannis') is null or to_regclass('public.profils') is null then
    raise exception 'Roule ameliorations4.sql à ameliorations7.sql avant celui-ci.';
  end if;
end
$$;

-- ============================================================
-- 1. Tables
-- ============================================================
create table if not exists public.groupes (
  id         uuid primary key default gen_random_uuid(),
  annonce_id uuid unique references public.annonces (id) on delete set null,
  chef       uuid not null references auth.users (id) on delete cascade,
  titre      text not null check (char_length(titre) between 1 and 80),
  perso      text not null default '',
  genre      text not null default 'groupe' check (genre in ('groupe', 'joueur')),
  contact    text not null default '',
  created_at timestamptz not null default now(),
  fin_le     timestamptz not null,
  ferme      boolean not null default false
);
create index if not exists groupes_chef_idx on public.groupes (chef);
create index if not exists groupes_fin_idx on public.groupes (fin_le);

create table if not exists public.demandes (
  id          uuid primary key default gen_random_uuid(),
  groupe_id   uuid not null references public.groupes (id) on delete cascade,
  de          uuid not null references public.profils (user_id) on delete cascade,
  role        text check (role in ('tank', 'heal', 'dps')),
  message     text not null default '' check (char_length(message) <= 140),
  statut      text not null default 'en_attente'
              check (statut in ('en_attente', 'acceptee', 'refusee', 'quitte', 'expulse')),
  created_at  timestamptz not null default now(),
  repondu_le  timestamptz,
  unique (groupe_id, de)
);
create index if not exists demandes_de_idx on public.demandes (de, statut);

create table if not exists public.messages_groupe (
  id         bigint generated always as identity primary key,
  groupe_id  uuid not null references public.groupes (id) on delete cascade,
  de         uuid not null references auth.users (id) on delete cascade,
  genre      text not null default 'texte' check (genre in ('texte', 'rejoint', 'quitte', 'expulse')),
  texte      text not null default '' check (char_length(texte) <= 500),
  masque     boolean not null default false,
  created_at timestamptz not null default now(),
  check (genre <> 'texte' or char_length(btrim(texte)) >= 1)
);
create index if not exists messages_groupe_idx on public.messages_groupe (groupe_id, id);
create index if not exists messages_groupe_auteur_idx on public.messages_groupe (de, created_at);

create table if not exists public.messages_amis (
  id         bigint generated always as identity primary key,
  de         uuid not null references auth.users (id) on delete cascade,
  pour       uuid not null references auth.users (id) on delete cascade,
  texte      text not null check (char_length(btrim(texte)) between 1 and 500),
  masque     boolean not null default false,
  created_at timestamptz not null default now(),
  check (de <> pour)
);
create index if not exists messages_amis_paire_idx
  on public.messages_amis (least(de, pour), greatest(de, pour), id);
create index if not exists messages_amis_auteur_idx on public.messages_amis (de, created_at);
create index if not exists messages_amis_date_idx on public.messages_amis (created_at);

-- Jusqu'où chaque joueur a lu chaque conversation (type: 'groupe' ou 'ami'; cible: id du groupe ou de l'ami).
create table if not exists public.chat_lectures (
  user_id uuid not null references auth.users (id) on delete cascade,
  type    text not null check (type in ('groupe', 'ami')),
  cible   uuid not null,
  dernier bigint not null default 0,
  primary key (user_id, type, cible)
);

create table if not exists public.signalements_messages (
  id         uuid primary key default gen_random_uuid(),
  type       text not null check (type in ('groupe', 'ami')),
  message_id bigint not null,
  signaleur  uuid not null references auth.users (id) on delete cascade,
  auteur     uuid not null references auth.users (id) on delete cascade,
  motif      text not null check (motif in ('harcelement', 'spam', 'inapproprie', 'autre')),
  texte      text not null default '',
  contexte   text not null default '',
  lieu       text not null default '',
  created_at timestamptz not null default now(),
  unique (type, message_id, signaleur)
);
create index if not exists signalements_messages_idx on public.signalements_messages (type, message_id);

alter table public.groupes enable row level security;
alter table public.demandes enable row level security;
alter table public.messages_groupe enable row level security;
alter table public.messages_amis enable row level security;
alter table public.chat_lectures enable row level security;
alter table public.signalements_messages enable row level security;
revoke all on public.groupes from anon, authenticated;
revoke all on public.demandes from anon, authenticated;
revoke all on public.messages_groupe from anon, authenticated;
revoke all on public.messages_amis from anon, authenticated;
revoke all on public.chat_lectures from anon, authenticated;
revoke all on public.signalements_messages from anon, authenticated;

-- ============================================================
-- 2. Le contact d'une annonce n'est plus visible pour les autres joueurs
-- ============================================================
-- Les visiteurs ne l'avaient déjà pas. Maintenant, les joueurs connectés non plus: il passe par le groupe.
revoke select on public.annonces from authenticated;
grant select (id, user_id, created_at, expires_at, activite, cible, faction, ruleset, region,
              niveau_min, niveau_max, roles, perso, note, style, langue, debut, genre, classe, roles_nb)
  on public.annonces to authenticated;

-- ============================================================
-- 3. Un groupe par annonce (créé et suivi automatiquement)
-- ============================================================
create or replace function public.purger_chats()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.groupes where fin_le < now() - interval '24 hours';
  delete from public.messages_amis where created_at < now() - interval '30 days';
  delete from public.signalements_messages where created_at < now() - interval '30 days';
  delete from public.chat_lectures l
   where l.type = 'groupe' and not exists (select 1 from public.groupes g where g.id = l.cible);
end;
$$;
revoke all on function public.purger_chats() from public, anon, authenticated;

create or replace function public.annonce_vers_groupe()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.purger_chats();
    insert into public.groupes (annonce_id, chef, titre, perso, genre, contact, fin_le)
    values (new.id, new.user_id, left(new.activite || ': ' || new.cible, 80), new.perso, new.genre, new.contact, new.expires_at)
    on conflict (annonce_id) do nothing;
    return new;
  elsif tg_op = 'UPDATE' then
    if new.expires_at is distinct from old.expires_at then
      if new.expires_at <= now() then
        -- retirée par la modération (ou trois signalements): le groupe se ferme.
        update public.groupes set fin_le = now(), ferme = true where annonce_id = new.id;
      else
        update public.groupes set fin_le = new.expires_at, ferme = false where annonce_id = new.id;
      end if;
    end if;
    return new;
  else
    -- le chef retire son annonce: le chat reste 24 heures de plus, puis il est effacé.
    update public.groupes set fin_le = least(fin_le, now()) where annonce_id = old.id;
    return old;
  end if;
end;
$$;

drop trigger if exists annonce_groupe_ajout on public.annonces;
create trigger annonce_groupe_ajout
  after insert on public.annonces
  for each row execute function public.annonce_vers_groupe();

drop trigger if exists annonce_groupe_maj on public.annonces;
create trigger annonce_groupe_maj
  after update of expires_at on public.annonces
  for each row execute function public.annonce_vers_groupe();

drop trigger if exists annonce_groupe_retrait on public.annonces;
create trigger annonce_groupe_retrait
  before delete on public.annonces
  for each row execute function public.annonce_vers_groupe();

-- Les groupes des annonces déjà en ligne (ou finies depuis moins de 24 heures).
insert into public.groupes (annonce_id, chef, titre, perso, genre, contact, fin_le)
select a.id, a.user_id, left(a.activite || ': ' || a.cible, 80), a.perso, a.genre, a.contact, a.expires_at
from public.annonces a
where a.expires_at > now() - interval '24 hours'
on conflict (annonce_id) do nothing;

-- Un compte suspendu: ses groupes se ferment (plus de messages ni de nouvelles demandes).
create or replace function public.suspension_ferme_groupes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.groupes set ferme = true where chef = new.user_id;
  return new;
end;
$$;

drop trigger if exists suspension_groupes on public.bannis;
create trigger suspension_groupes
  after insert on public.bannis
  for each row execute function public.suspension_ferme_groupes();

-- ============================================================
-- 4. Petites fonctions internes (non appelables depuis le site)
-- ============================================================
create or replace function public.chat_est_membre(p_groupe uuid, p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.groupes g
    where g.id = p_groupe
      and g.fin_le > now() - interval '24 hours'
      and (g.chef = p_user
           or exists (select 1 from public.demandes d
                      where d.groupe_id = g.id and d.de = p_user and d.statut = 'acceptee'))
  );
$$;

create or replace function public.chat_sont_amis(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_a is not null and p_b is not null and p_a <> p_b
     and exists (select 1 from public.amities a
                 where a.statut = 'acceptee'
                   and ((a.demandeur = p_a and a.destinataire = p_b) or (a.demandeur = p_b and a.destinataire = p_a)))
     and not exists (select 1 from public.blocages b
                     where (b.bloqueur = p_a and b.bloque = p_b) or (b.bloqueur = p_b and b.bloque = p_a));
$$;

create or replace function public.chat_est_bloque(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.blocages b
                 where (b.bloqueur = p_a and b.bloque = p_b) or (b.bloqueur = p_b and b.bloque = p_a));
$$;

create or replace function public.chat_marquer_lu(p_user uuid, p_type text, p_cible uuid, p_dernier bigint)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.chat_lectures (user_id, type, cible, dernier)
  values (p_user, p_type, p_cible, coalesce(p_dernier, 0))
  on conflict (user_id, type, cible) do update set dernier = greatest(public.chat_lectures.dernier, excluded.dernier);
$$;

create or replace function public.chat_verifier_ecriture(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  recents int;
  jour    int;
begin
  if p_user is null then
    raise exception 'connexion requise' using errcode = '28000';
  end if;
  if exists (select 1 from public.bannis where user_id = p_user) then
    raise exception 'compte suspendu' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('chat' || p_user::text, 0));
  select
    (select count(*) from public.messages_groupe where de = p_user and genre = 'texte' and created_at > now() - interval '30 seconds')
    + (select count(*) from public.messages_amis where de = p_user and created_at > now() - interval '30 seconds'),
    (select count(*) from public.messages_groupe where de = p_user and genre = 'texte' and created_at > now() - interval '24 hours')
    + (select count(*) from public.messages_amis where de = p_user and created_at > now() - interval '24 hours')
  into recents, jour;
  if recents >= 15 then
    raise exception 'trop de messages, attends un peu' using errcode = '54000';
  end if;
  if jour >= 1000 then
    raise exception 'limite de messages par jour atteinte' using errcode = '54000';
  end if;
end;
$$;

revoke all on function public.chat_est_membre(uuid, uuid) from public, anon, authenticated;
revoke all on function public.chat_sont_amis(uuid, uuid) from public, anon, authenticated;
revoke all on function public.chat_est_bloque(uuid, uuid) from public, anon, authenticated;
revoke all on function public.chat_marquer_lu(uuid, text, uuid, bigint) from public, anon, authenticated;
revoke all on function public.chat_verifier_ecriture(uuid) from public, anon, authenticated;

-- ============================================================
-- 5. Demander à rejoindre
-- ============================================================
-- Retourne le statut: 'en_attente' (ou 'acceptee' si c'était déjà le cas).
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

-- Mes demandes (pour afficher l'état sur les cartes d'annonces).
create or replace function public.mes_demandes()
returns table (id uuid, annonce_id uuid, groupe_id uuid, statut text, role text)
language sql
stable
security definer
set search_path = public
as $$
  select d.id, g.annonce_id, g.id, d.statut, d.role
  from public.demandes d
  join public.groupes g on g.id = d.groupe_id
  where d.de = auth.uid()
    and d.statut in ('en_attente', 'acceptee', 'refusee', 'expulse')
    and g.annonce_id is not null
    and g.fin_le > now() - interval '24 hours'
  order by d.created_at desc
  limit 200;
$$;

-- Les demandes d'un groupe, pour son chef.
create or replace function public.lister_demandes(p_groupe uuid)
returns table (
  id        uuid,
  user_id   uuid,
  statut    text,
  role      text,
  message   text,
  created_at timestamptz,
  perso     text,
  classe    text,
  specialisation text,
  niveau    int,
  roles     text[],
  guilde    text,
  langue    text,
  style     text,
  bio       text
)
language sql
stable
security definer
set search_path = public
as $$
  select d.id, d.de, d.statut, d.role, d.message, d.created_at,
         p.perso, p.classe, p.specialisation, p.niveau, p.roles, p.guilde, p.langue, p.style, p.bio
  from public.demandes d
  join public.groupes g on g.id = d.groupe_id
  join public.profils p on p.user_id = d.de
  where d.groupe_id = p_groupe
    and g.chef = auth.uid()
    and g.fin_le > now() - interval '24 hours'
    and d.statut in ('en_attente', 'acceptee', 'refusee')
    and not exists (select 1 from public.bannis b where b.user_id = d.de)
  order by case d.statut when 'en_attente' then 0 when 'acceptee' then 1 else 2 end, d.created_at desc
  limit 120;
$$;

-- Répondre à une demande.
--   Le chef: 'accepter', 'refuser', 'expulser'.
--   Le joueur: 'annuler' (retirer sa demande en attente), 'quitter' (quitter un groupe où il est accepté).
-- Retourne le nouveau statut ('aucun' quand la demande disparaît).
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
    return 'expulse';
  end if;
end;
$$;

-- ============================================================
-- 6. Les conversations (groupes où je suis chef ou accepté + amis avec qui j'ai écrit)
-- ============================================================
create or replace function public.mes_conversations()
returns table (
  type         text,
  cible        uuid,
  annonce_id   uuid,
  titre        text,
  sous_titre   text,
  classe       text,
  est_chef     boolean,
  contact      text,
  nb_membres   int,
  nb_en_attente int,
  non_lus      int,
  dernier_le   timestamptz,
  dernier_genre text,
  extrait      text,
  fin_le       timestamptz,
  ferme        boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with moi as (select auth.uid() as id),
  mes_groupes as (
    select g.*
    from public.groupes g, moi
    where moi.id is not null
      and g.fin_le > now() - interval '24 hours'
      and (g.chef = moi.id
           or exists (select 1 from public.demandes d where d.groupe_id = g.id and d.de = moi.id and d.statut = 'acceptee'))
  ),
  lignes_groupes as (
    select 'groupe'::text as type, g.id as cible, g.annonce_id, g.titre::text as titre,
           case when g.chef = moi.id then 'Ton groupe' else 'Chef: ' || coalesce(nullif(g.perso, ''), '?') end as sous_titre,
           null::text as classe,
           (g.chef = moi.id) as est_chef,
           g.contact::text as contact,
           1 + (select count(*)::int from public.demandes d where d.groupe_id = g.id and d.statut = 'acceptee') as nb_membres,
           case when g.chef = moi.id
                then (select count(*)::int from public.demandes d where d.groupe_id = g.id and d.statut = 'en_attente')
                else 0 end as nb_en_attente,
           greatest(
             (select count(*)::int from public.messages_groupe m
               where m.groupe_id = g.id and m.id > coalesce(l.dernier, 0) and m.de <> moi.id and not m.masque
                 and not exists (select 1 from public.blocages b where b.bloqueur = moi.id and b.bloque = m.de)),
             case when l.user_id is null and g.chef <> moi.id then 1 else 0 end
           ) as non_lus,
           dm.created_at as dernier_le, dm.genre as dernier_genre,
           case when dm.genre = 'texte' and not dm.masque then left(dm.texte, 80) else '' end as extrait,
           g.fin_le, g.ferme
    from mes_groupes g
    cross join moi
    left join public.chat_lectures l on l.user_id = moi.id and l.type = 'groupe' and l.cible = g.id
    left join lateral (
      select m.created_at, m.genre, m.texte, m.masque from public.messages_groupe m
      where m.groupe_id = g.id order by m.id desc limit 1
    ) dm on true
  ),
  lignes_amis as (
    select 'ami'::text, p.user_id, null::uuid, p.perso::text,
           ''::text, p.classe::text, false, ''::text, 2, 0,
           (select count(*)::int from public.messages_amis m
             where m.de = p.user_id and m.pour = moi.id and m.id > coalesce(l.dernier, 0) and not m.masque),
           dm.created_at, 'texte'::text,
           case when dm.masque then '' else left(dm.texte, 80) end,
           null::timestamptz, false
    from moi
    join public.amities a on a.statut = 'acceptee' and moi.id in (a.demandeur, a.destinataire)
    join public.profils p on p.user_id = case when a.demandeur = moi.id then a.destinataire else a.demandeur end
    left join public.chat_lectures l on l.user_id = moi.id and l.type = 'ami' and l.cible = p.user_id
    join lateral (
      select m.created_at, m.texte, m.masque from public.messages_amis m
      where least(m.de, m.pour) = least(moi.id, p.user_id) and greatest(m.de, m.pour) = greatest(moi.id, p.user_id)
      order by m.id desc limit 1
    ) dm on true
    where moi.id is not null
      and not exists (select 1 from public.blocages b
                      where (b.bloqueur = moi.id and b.bloque = p.user_id) or (b.bloqueur = p.user_id and b.bloque = moi.id))
  )
  select * from (select * from lignes_groupes union all select * from lignes_amis) t
  order by t.dernier_le desc nulls last
  limit 150;
$$;

-- Le petit chiffre rouge: demandes à traiter + messages non lus.
create or replace function public.mes_notifications()
returns table (demandes int, messages int)
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(c.nb_en_attente), 0)::int, coalesce(sum(c.non_lus), 0)::int
  from public.mes_conversations() c;
$$;

-- Les membres d'un groupe (le chef d'abord).
create or replace function public.membres_groupe(p_groupe uuid)
returns table (user_id uuid, perso text, classe text, specialisation text, niveau int, role text, est_chef boolean)
language sql
stable
security definer
set search_path = public
as $$
  select * from (
    select g.chef as user_id, coalesce(p.perso, nullif(g.perso, ''), '?')::text as perso, p.classe::text, p.specialisation::text,
           p.niveau, null::text as role, true as est_chef
    from public.groupes g
    left join public.profils p on p.user_id = g.chef
    where g.id = p_groupe
    union all
    select d.de, p.perso::text, p.classe::text, p.specialisation::text, p.niveau, d.role::text, false
    from public.demandes d
    join public.profils p on p.user_id = d.de
    where d.groupe_id = p_groupe and d.statut = 'acceptee'
  ) t
  where public.chat_est_membre(p_groupe, auth.uid())
  order by t.est_chef desc, t.perso
  limit 60;
$$;

-- ============================================================
-- 7. Chat de groupe
-- ============================================================
-- Lire les messages (les 100 derniers, ou ceux après p_apres) et marquer la conversation comme lue.
create or replace function public.lire_groupe(p_groupe uuid, p_apres bigint default 0)
returns table (
  id         bigint,
  user_id    uuid,
  genre      text,
  texte      text,
  masque     boolean,
  created_at timestamptz,
  perso      text,
  classe     text,
  moi        boolean
)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  me  uuid := auth.uid();
  max_id bigint;
begin
  if me is null then
    raise exception 'connexion requise' using errcode = '28000';
  end if;
  if not public.chat_est_membre(p_groupe, me) then
    raise exception 'groupe introuvable' using errcode = 'P0002';
  end if;
  select max(m.id) into max_id from public.messages_groupe m where m.groupe_id = p_groupe;
  perform public.chat_marquer_lu(me, 'groupe', p_groupe, max_id);
  return query
    select x.* from (
      select m.id, m.de, m.genre, case when m.masque then ''::text else m.texte end, m.masque, m.created_at,
             p.perso::text, p.classe::text, (m.de = me)
      from public.messages_groupe m
      left join public.profils p on p.user_id = m.de
      where m.groupe_id = p_groupe
        and m.id > coalesce(p_apres, 0)
        and not exists (select 1 from public.blocages b where b.bloqueur = me and b.bloque = m.de)
      order by m.id desc
      limit 100
    ) x
    order by x.id;
end;
$$;

create or replace function public.ecrire_groupe(p_groupe uuid, p_texte text)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  me    uuid := auth.uid();
  g     public.groupes;
  contenu text := btrim(coalesce(p_texte, ''));
  nouveau bigint;
begin
  if me is null then
    raise exception 'connexion requise' using errcode = '28000';
  end if;
  if char_length(contenu) < 1 or char_length(contenu) > 500 then
    raise exception 'message invalide' using errcode = '22023';
  end if;
  perform public.chat_verifier_ecriture(me);
  if not public.chat_est_membre(p_groupe, me) then
    raise exception 'groupe introuvable' using errcode = 'P0002';
  end if;
  select * into g from public.groupes where id = p_groupe;
  if g.ferme then
    raise exception 'ce groupe est fermé' using errcode = '42501';
  end if;
  if (select count(*) from public.messages_groupe where groupe_id = p_groupe) >= 1500 then
    raise exception 'ce chat est plein' using errcode = '54000';
  end if;
  perform public.purger_chats();
  insert into public.messages_groupe (groupe_id, de, texte) values (p_groupe, me, contenu) returning id into nouveau;
  perform public.chat_marquer_lu(me, 'groupe', p_groupe, nouveau);
  return nouveau;
end;
$$;

-- ============================================================
-- 8. Chat entre amis
-- ============================================================
create or replace function public.lire_ami(p_ami uuid, p_apres bigint default 0)
returns table (
  id         bigint,
  user_id    uuid,
  texte      text,
  masque     boolean,
  created_at timestamptz,
  perso      text,
  classe     text,
  moi        boolean
)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  me  uuid := auth.uid();
  max_id bigint;
begin
  if me is null then
    raise exception 'connexion requise' using errcode = '28000';
  end if;
  if not public.chat_sont_amis(me, p_ami) then
    raise exception 'conversation introuvable' using errcode = 'P0002';
  end if;
  select max(m.id) into max_id
    from public.messages_amis m
    where least(m.de, m.pour) = least(me, p_ami) and greatest(m.de, m.pour) = greatest(me, p_ami);
  perform public.chat_marquer_lu(me, 'ami', p_ami, max_id);
  return query
    select x.* from (
      select m.id, m.de, case when m.masque then ''::text else m.texte end, m.masque, m.created_at,
             p.perso::text, p.classe::text, (m.de = me)
      from public.messages_amis m
      left join public.profils p on p.user_id = m.de
      where least(m.de, m.pour) = least(me, p_ami) and greatest(m.de, m.pour) = greatest(me, p_ami)
        and m.id > coalesce(p_apres, 0)
        and m.created_at > now() - interval '30 days'
      order by m.id desc
      limit 100
    ) x
    order by x.id;
end;
$$;

create or replace function public.ecrire_ami(p_ami uuid, p_texte text)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  me    uuid := auth.uid();
  contenu text := btrim(coalesce(p_texte, ''));
  nouveau bigint;
begin
  if me is null then
    raise exception 'connexion requise' using errcode = '28000';
  end if;
  if char_length(contenu) < 1 or char_length(contenu) > 500 then
    raise exception 'message invalide' using errcode = '22023';
  end if;
  perform public.chat_verifier_ecriture(me);
  if not public.chat_sont_amis(me, p_ami) then
    raise exception 'conversation introuvable' using errcode = 'P0002';
  end if;
  if (select count(*) from public.messages_amis
       where least(de, pour) = least(me, p_ami) and greatest(de, pour) = greatest(me, p_ami)) >= 2000 then
    raise exception 'ce chat est plein' using errcode = '54000';
  end if;
  perform public.purger_chats();
  insert into public.messages_amis (de, pour, texte) values (me, p_ami, contenu) returning id into nouveau;
  perform public.chat_marquer_lu(me, 'ami', p_ami, nouveau);
  return nouveau;
end;
$$;

-- Effacer un de ses propres messages.
create or replace function public.effacer_message(p_type text, p_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'connexion requise' using errcode = '28000';
  end if;
  if p_type = 'groupe' then
    delete from public.messages_groupe where id = p_id and de = auth.uid() and genre = 'texte';
  elsif p_type = 'ami' then
    delete from public.messages_amis where id = p_id and de = auth.uid();
  else
    raise exception 'type inconnu' using errcode = '22023';
  end if;
end;
$$;

-- ============================================================
-- 9. Signaler un message
-- ============================================================
create or replace function public.signaler_message(p_type text, p_id bigint, p_motif text)
returns void
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  me      uuid := auth.uid();
  auteur  uuid;
  contenu text;
  lieu    text;
  ctx     text;
  nb      int;
  gid     uuid;
begin
  if me is null then
    raise exception 'connexion requise' using errcode = '28000';
  end if;
  if p_motif is null or p_motif not in ('harcelement', 'spam', 'inapproprie', 'autre') then
    raise exception 'motif inconnu' using errcode = '22023';
  end if;
  if (select count(*) from public.signalements_messages where signaleur = me and created_at > now() - interval '24 hours') >= 20 then
    raise exception 'trop de signalements aujourd''hui' using errcode = '54000';
  end if;

  if p_type = 'groupe' then
    select m.de, m.texte, m.groupe_id into auteur, contenu, gid
      from public.messages_groupe m where m.id = p_id and m.genre = 'texte';
    if auteur is null or auteur = me or not public.chat_est_membre(gid, me) then
      raise exception 'message introuvable' using errcode = 'P0002';
    end if;
    select 'Groupe « ' || g.titre || ' »' into lieu from public.groupes g where g.id = gid;
    select string_agg(coalesce(p.perso, '?') || ': ' || left(c.texte, 200), E'\n' order by c.id)
      into ctx
      from (select * from public.messages_groupe
             where groupe_id = gid and id < p_id and genre = 'texte' order by id desc limit 4) c
      left join public.profils p on p.user_id = c.de;
  elsif p_type = 'ami' then
    select m.de, m.texte into auteur, contenu
      from public.messages_amis m where m.id = p_id and m.pour = me;
    if auteur is null then
      raise exception 'message introuvable' using errcode = 'P0002';
    end if;
    lieu := 'Message privé entre amis';
    select string_agg(coalesce(p.perso, '?') || ': ' || left(c.texte, 200), E'\n' order by c.id)
      into ctx
      from (select * from public.messages_amis
             where least(de, pour) = least(me, auteur) and greatest(de, pour) = greatest(me, auteur)
               and id < p_id order by id desc limit 4) c
      left join public.profils p on p.user_id = c.de;
  else
    raise exception 'type inconnu' using errcode = '22023';
  end if;

  insert into public.signalements_messages (type, message_id, signaleur, auteur, motif, texte, contexte, lieu)
  values (p_type, p_id, me, auteur, p_motif, left(contenu, 500), coalesce(left(ctx, 1200), ''), coalesce(lieu, ''))
  on conflict (type, message_id, signaleur) do nothing;

  select count(distinct signaleur) into nb
    from public.signalements_messages where type = p_type and message_id = p_id;
  if nb >= 3 then
    if p_type = 'groupe' then
      update public.messages_groupe set masque = true where id = p_id;
    else
      update public.messages_amis set masque = true where id = p_id;
    end if;
  end if;
end;
$$;

-- ============================================================
-- 10. Modération des messages signalés
-- ============================================================
create or replace function public.mod_messages_signales()
returns table (
  type        text,
  message_id  bigint,
  nb          int,
  motifs      text[],
  dernier     timestamptz,
  auteur      uuid,
  auteur_perso text,
  texte       text,
  contexte    text,
  lieu        text,
  masque      boolean,
  suspendu    boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select s.type, s.message_id, s.nb, s.motifs, s.dernier, s.auteur,
         coalesce(p.perso, '?')::text,
         s.texte, s.contexte, s.lieu,
         coalesce(case s.type
           when 'groupe' then (select m.masque from public.messages_groupe m where m.id = s.message_id)
           else (select m.masque from public.messages_amis m where m.id = s.message_id)
         end, false),
         exists (select 1 from public.bannis b where b.user_id = s.auteur)
  from (
    select r.type, r.message_id, count(distinct r.signaleur)::int as nb, array_agg(distinct r.motif order by r.motif) as motifs,
           max(r.created_at) as dernier, (array_agg(r.auteur))[1] as auteur,
           max(r.texte) as texte, max(r.contexte) as contexte, max(r.lieu) as lieu
    from public.signalements_messages r
    group by r.type, r.message_id
  ) s
  left join public.profils p on p.user_id = s.auteur
  where public.est_moderateur()
  order by s.nb desc, s.dernier desc
  limit 200;
$$;

-- Garder le message: on efface les signalements et on le démasque.
create or replace function public.mod_message_ecarter(p_type text, p_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  auteur uuid;
begin
  if not public.est_moderateur() then
    raise exception 'réservé aux modérateurs' using errcode = '42501';
  end if;
  if p_type not in ('groupe', 'ami') then
    raise exception 'type inconnu' using errcode = '22023';
  end if;
  select r.auteur into auteur from public.signalements_messages r where r.type = p_type and r.message_id = p_id limit 1;
  delete from public.signalements_messages where type = p_type and message_id = p_id;
  if p_type = 'groupe' then
    update public.messages_groupe set masque = false where id = p_id;
  else
    update public.messages_amis set masque = false where id = p_id;
  end if;
  insert into public.moderation_journal (par, action, cible_type, cible_id, note)
  values (auth.uid(), 'ecarter', 'message', auteur, 'message ' || p_type || ' ' || p_id);
end;
$$;

-- Effacer le message (et ses signalements).
create or replace function public.mod_message_effacer(p_type text, p_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  auteur uuid;
begin
  if not public.est_moderateur() then
    raise exception 'réservé aux modérateurs' using errcode = '42501';
  end if;
  if p_type not in ('groupe', 'ami') then
    raise exception 'type inconnu' using errcode = '22023';
  end if;
  select r.auteur into auteur from public.signalements_messages r where r.type = p_type and r.message_id = p_id limit 1;
  delete from public.signalements_messages where type = p_type and message_id = p_id;
  if p_type = 'groupe' then
    delete from public.messages_groupe where id = p_id;
  else
    delete from public.messages_amis where id = p_id;
  end if;
  insert into public.moderation_journal (par, action, cible_type, cible_id, note)
  values (auth.uid(), 'effacer', 'message', auteur, 'message ' || p_type || ' ' || p_id);
end;
$$;

-- ============================================================
-- 11. Droits d'exécution
-- ============================================================
revoke all on function public.demander_rejoindre(uuid, text, text) from public, anon;
revoke all on function public.mes_demandes() from public, anon;
revoke all on function public.lister_demandes(uuid) from public, anon;
revoke all on function public.agir_demande(uuid, text) from public, anon;
revoke all on function public.mes_conversations() from public, anon;
revoke all on function public.mes_notifications() from public, anon;
revoke all on function public.membres_groupe(uuid) from public, anon;
revoke all on function public.lire_groupe(uuid, bigint) from public, anon;
revoke all on function public.ecrire_groupe(uuid, text) from public, anon;
revoke all on function public.lire_ami(uuid, bigint) from public, anon;
revoke all on function public.ecrire_ami(uuid, text) from public, anon;
revoke all on function public.effacer_message(text, bigint) from public, anon;
revoke all on function public.signaler_message(text, bigint, text) from public, anon;
revoke all on function public.mod_messages_signales() from public, anon;
revoke all on function public.mod_message_ecarter(text, bigint) from public, anon;
revoke all on function public.mod_message_effacer(text, bigint) from public, anon;
grant execute on function public.demander_rejoindre(uuid, text, text) to authenticated;
grant execute on function public.mes_demandes() to authenticated;
grant execute on function public.lister_demandes(uuid) to authenticated;
grant execute on function public.agir_demande(uuid, text) to authenticated;
grant execute on function public.mes_conversations() to authenticated;
grant execute on function public.mes_notifications() to authenticated;
grant execute on function public.membres_groupe(uuid) to authenticated;
grant execute on function public.lire_groupe(uuid, bigint) to authenticated;
grant execute on function public.ecrire_groupe(uuid, text) to authenticated;
grant execute on function public.lire_ami(uuid, bigint) to authenticated;
grant execute on function public.ecrire_ami(uuid, text) to authenticated;
grant execute on function public.effacer_message(text, bigint) to authenticated;
grant execute on function public.signaler_message(text, bigint, text) to authenticated;
grant execute on function public.mod_messages_signales() to authenticated;
grant execute on function public.mod_message_ecarter(text, bigint) to authenticated;
grant execute on function public.mod_message_effacer(text, bigint) to authenticated;
