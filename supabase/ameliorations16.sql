-- Seizième mise à jour de la base: plus d'alertes sur l'appareil (notifications push).
-- À coller dans Supabase: SQL Editor > New query > Run. On peut la rouler plus d'une fois sans problème.
-- À rouler APRÈS ameliorations10.sql (partie 4: alertes) et avec les réglages push_url / push_secret déjà en place.
--
-- Quatre nouvelles alertes, envoyées même quand le site est fermé (à ceux qui ont activé les alertes sur leur appareil):
--   1. Nouvelle annonce qui correspond à tes filtres (le bouton « M'alerter des nouvelles annonces »).
--   2. Rappel 15 minutes avant le départ d'un groupe planifié (au chef et aux membres acceptés).
--   3. Le groupe est fermé ou son annonce est retirée (aux membres et aux gens en attente).
--   4. Le groupe est complet (aux gens dont la demande est en attente).
-- L'alerte ne contient jamais le texte d'un message. Elle ne contient que des choses déjà publiques sur l'annonce.
--
-- Le rappel de départ a besoin que la tâche planifiée pg_cron soit active (Supabase: Database > Extensions > pg_cron).
-- Si elle ne l'est pas, ce fichier le dit dans l'onglet Messages du SQL Editor; active-la puis relance le fichier.

do $$
begin
  if to_regclass('public.push_abonnements') is null or to_regclass('public.push_envois') is null or to_regclass('public.reglages') is null then
    raise exception 'Roule ameliorations10.sql avant celui-ci.';
  end if;
end
$$;

-- ============================================================
-- 1. Envoi d'une alerte avec un titre et une adresse choisis (par groupes de 50 appareils, la limite de la fonction du site)
-- ============================================================
create or replace function public.notifier_push_lien(
  p_users uuid[], p_cle text, p_titre text, p_texte text, p_url text, p_minutes int default 2
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  adresse text;
  secret  text;
  lot     record;
begin
  select valeur into adresse from public.reglages where cle = 'push_url';
  select valeur into secret from public.reglages where cle = 'push_secret';
  if adresse is null or secret is null or p_users is null or cardinality(p_users) = 0 then
    return;
  end if;

  for lot in
    with cibles as (
      select s.user_id, s.endpoint, s.p256dh, s.auth
      from public.push_abonnements s
      where s.user_id = any (p_users)
        and not exists (
          select 1 from public.push_envois e
           where e.user_id = s.user_id and e.cle = p_cle and e.dernier > now() - make_interval(mins => p_minutes)
        )
      order by s.endpoint
      limit 500
    ), notes as (
      insert into public.push_envois (user_id, cle, dernier)
      select distinct c.user_id, p_cle, now() from cibles c
      on conflict (user_id, cle) do update set dernier = now()
      returning 1
    ), numerotes as (
      select c.*, (row_number() over (order by c.endpoint) - 1) / 50 as groupe from cibles c
    )
    select jsonb_agg(jsonb_build_object('endpoint', n.endpoint, 'p256dh', n.p256dh, 'auth', n.auth)) as abonnes
    from numerotes n
    group by n.groupe
  loop
    perform net.http_post(
      url     := adresse,
      body    := jsonb_build_object('titre', left(p_titre, 80), 'texte', left(p_texte, 200), 'url', p_url, 'abonnes', lot.abonnes),
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || secret)
    );
  end loop;
exception when others then
  null; -- une alerte perdue vaut mieux qu'une annonce, une demande ou un message refusé
end;
$$;
revoke all on function public.notifier_push_lien(uuid[], text, text, text, text, int) from public, anon, authenticated;

-- « donjon: The Deadmines » devient « Donjon: The Deadmines » (le titre d'un groupe est écrit comme ça par la base).
create or replace function public.titre_groupe_joli(p_titre text)
returns text
language sql
immutable
as $$
  select case
    when p_titre like 'donjon: %' then 'Donjon: ' || substr(p_titre, 9)
    when p_titre like 'raid: %'   then 'Raid: ' || substr(p_titre, 7)
    when p_titre like 'pvp: %'    then 'PvP: ' || substr(p_titre, 6)
    when p_titre like 'quete: %'  then 'Quêtes: ' || substr(p_titre, 8)
    else coalesce(p_titre, '')
  end;
$$;

-- ============================================================
-- 2. L'alerte « nouvelle annonce » de chaque personne (les filtres de l'onglet Groupes), gardée pour le serveur
-- ============================================================
create table if not exists public.alertes_annonces (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  filtres    jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.alertes_annonces enable row level security;
revoke all on public.alertes_annonces from anon, authenticated;

-- Les filtres permis (les mêmes que dans le site) et leurs valeurs: du texte court sans symboles, ou vrai/faux.
create or replace function public.enregistrer_alerte_annonces(p_filtres jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  moi uuid := auth.uid();
  propre jsonb := '{}'::jsonb;
  cle text;
  valeur text;
begin
  if moi is null then
    raise exception 'connexion requise' using errcode = '28000';
  end if;
  if exists (select 1 from public.bannis where user_id = moi) then
    raise exception 'compte suspendu' using errcode = '42501';
  end if;
  if p_filtres is null or jsonb_typeof(p_filtres) <> 'object' then
    raise exception 'filtres invalides' using errcode = '22023';
  end if;
  foreach cle in array array['activite', 'faction', 'region', 'role', 'niveau', 'style', 'langue', 'genre'] loop
    valeur := coalesce(p_filtres ->> cle, '');
    if valeur !~ '^[A-Za-z0-9_-]{0,20}$' then
      raise exception 'filtre invalide: %', cle using errcode = '22023';
    end if;
    if cle = 'niveau' and valeur <> '' and (valeur !~ '^[0-9]{1,2}$' or valeur::int not between 1 and 60) then
      raise exception 'niveau invalide' using errcode = '22023';
    end if;
    propre := propre || jsonb_build_object(cle, valeur);
  end loop;
  propre := propre || jsonb_build_object('planifies', coalesce(p_filtres ->> 'planifies', 'false') = 'true');
  insert into public.alertes_annonces (user_id, filtres, updated_at) values (moi, propre, now())
  on conflict (user_id) do update set filtres = excluded.filtres, updated_at = now();
end;
$$;

create or replace function public.retirer_alerte_annonces()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'connexion requise' using errcode = '28000';
  end if;
  delete from public.alertes_annonces where user_id = auth.uid();
end;
$$;

-- Les filtres de mon alerte (null s'il n'y en a pas), pour que le site sache si elle est active sur le serveur.
create or replace function public.mon_alerte_annonces()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select filtres from public.alertes_annonces where user_id = auth.uid();
$$;

revoke all on function public.enregistrer_alerte_annonces(jsonb) from public, anon;
revoke all on function public.retirer_alerte_annonces() from public, anon;
revoke all on function public.mon_alerte_annonces() from public, anon;
grant execute on function public.enregistrer_alerte_annonces(jsonb) to authenticated;
grant execute on function public.retirer_alerte_annonces() to authenticated;
grant execute on function public.mon_alerte_annonces() to authenticated;

-- ============================================================
-- 3. Nouvelle annonce: alerte aux gens dont les filtres correspondent (et qui ont activé les alertes sur un appareil)
-- ============================================================
create or replace function public.push_nouvelle_annonce()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  dest   uuid[];
  genre  text := coalesce(new.genre, 'groupe');
  roles  text;
  niveaux text;
  texte  text;
begin
  if new.expires_at <= now() then
    return new;
  end if;

  select coalesce(array_agg(t.user_id), '{}') into dest
  from (
    select a.user_id
    from public.alertes_annonces a
    where a.user_id <> new.user_id
      and exists (select 1 from public.push_abonnements s where s.user_id = a.user_id)
      and not exists (select 1 from public.bannis b where b.user_id = a.user_id)
      and coalesce(a.filtres ->> 'activite', 'tout') in ('', 'tout', new.activite)
      and coalesce(nullif(a.filtres ->> 'genre', ''), genre) = genre
      and (coalesce(a.filtres ->> 'planifies', 'false') <> 'true' or new.debut is not null)
      and coalesce(nullif(a.filtres ->> 'faction', ''), new.faction) = new.faction
      and coalesce(nullif(a.filtres ->> 'region', ''), new.region) = new.region
      and (coalesce(a.filtres ->> 'style', '') = '' or a.filtres ->> 'style' = new.style)
      and (coalesce(a.filtres ->> 'langue', '') = '' or a.filtres ->> 'langue' = new.langue)
      and (coalesce(a.filtres ->> 'role', '') = '' or new.roles @> array[a.filtres ->> 'role'])
      and (
        coalesce(a.filtres ->> 'niveau', '') = ''
        or case
             when genre = 'joueur' then abs((a.filtres ->> 'niveau')::int - new.niveau_min) <= 3
             else (a.filtres ->> 'niveau')::int between new.niveau_min and new.niveau_max
           end
      )
    limit 500
  ) t;

  if cardinality(dest) = 0 then
    return new;
  end if;

  select string_agg(case r when 'tank' then 'Tank' when 'heal' then 'Heal' when 'dps' then 'DPS' else r end, ', ')
    into roles from unnest(new.roles) as r;
  niveaux := case when new.niveau_min = new.niveau_max then 'niveau ' || new.niveau_min
                  else 'niveaux ' || new.niveau_min || '–' || new.niveau_max end;
  texte := concat_ws(' · ',
    case new.activite when 'donjon' then 'Donjon' when 'raid' then 'Raid' when 'pvp' then 'PvP' when 'quete' then 'Quêtes' else 'Groupe' end
      || ': ' || new.cible,
    niveaux,
    case when roles is null then null when genre = 'joueur' then 'joue ' || roles else 'cherche ' || roles end,
    case when new.perso <> '' then '(' || new.perso || ')' end);

  perform public.notifier_push_lien(
    dest, 'n', 'Nouvelle annonce ' || case new.faction when 'alliance' then 'Alliance' when 'horde' then 'Horde' else '' end,
    texte, '/?annonce=' || new.id::text, 3);
  return new;
exception when others then
  return new; -- jamais au prix d'une annonce refusée
end;
$$;
drop trigger if exists annonce_push on public.annonces;
create trigger annonce_push
  after insert on public.annonces
  for each row execute function public.push_nouvelle_annonce();

-- ============================================================
-- 4. Rappel 15 minutes avant le départ d'un groupe planifié
-- ============================================================
create table if not exists public.rappels_envoyes (
  groupe_id uuid primary key references public.groupes (id) on delete cascade,
  envoye_le timestamptz not null default now()
);
alter table public.rappels_envoyes enable row level security;
revoke all on public.rappels_envoyes from anon, authenticated;

-- Une seule fois par groupe. Pas de rappel quand l'annonce a été publiée moins de 20 minutes avant le départ.
create or replace function public.rappels_depart()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  dest uuid[];
  nb int := 0;
begin
  for r in
    select g.id, g.titre, g.chef, a.debut
    from public.groupes g
    join public.annonces a on a.id = g.annonce_id
    where a.debut is not null
      and a.debut > now()
      and a.debut <= now() + interval '15 minutes'
      and a.created_at <= a.debut - interval '20 minutes'
      and not g.ferme
      and g.fin_le > now()
      and not exists (select 1 from public.rappels_envoyes e where e.groupe_id = g.id)
  loop
    insert into public.rappels_envoyes (groupe_id) values (r.id) on conflict do nothing;
    select coalesce(array_agg(t.u), '{}') into dest
    from (
      select r.chef as u
      union
      select d.de from public.demandes d where d.groupe_id = r.id and d.statut = 'acceptee'
    ) t;
    perform public.notifier_push_lien(
      dest, 'r:' || r.id::text, 'Babillard Forever',
      'Ton groupe part dans ' || greatest(1, round(extract(epoch from (r.debut - now())) / 60)::int) || ' min: ' || public.titre_groupe_joli(r.titre) || '.',
      '/?vue=messages', 1);
    nb := nb + 1;
  end loop;
  return nb;
end;
$$;
revoke all on function public.rappels_depart() from public, anon, authenticated;

-- Tâche planifiée: chaque minute. Sans pg_cron, le reste du fichier marche quand même (sauf ce rappel).
do $$
begin
  create extension if not exists pg_cron;
  perform cron.unschedule(jobid) from cron.job where jobname = 'rappels-depart';
  perform cron.schedule('rappels-depart', '* * * * *', 'select public.rappels_depart()');
exception when others then
  raise notice 'Rappels de départ pas planifiés: active pg_cron (Database > Extensions) puis relance ce fichier. Détail: %', sqlerrm;
end
$$;

-- ============================================================
-- 5. Groupe fermé, annonce retirée, groupe complet
-- ============================================================
create or replace function public.push_groupe_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  dest uuid[];
  nom  text := public.titre_groupe_joli(new.titre);
begin
  if (new.ferme and not old.ferme) or (new.fin_le <= now() and old.fin_le > now()) then
    select coalesce(array_agg(distinct d.de), '{}') into dest
    from public.demandes d
    where d.groupe_id = new.id and d.statut in ('acceptee', 'en_attente') and d.de <> new.chef;
    perform public.notifier_push_lien(dest, 'x:' || new.id::text, 'Babillard Forever',
      'Le groupe « ' || nom || ' » est fermé ou son annonce a été retirée.', '/?vue=messages', 1);
  elsif new.complet and not old.complet then
    select coalesce(array_agg(distinct d.de), '{}') into dest
    from public.demandes d
    where d.groupe_id = new.id and d.statut = 'en_attente' and d.de <> new.chef;
    perform public.notifier_push_lien(dest, 'c:' || new.id::text, 'Babillard Forever',
      'Le groupe « ' || nom || ' » est complet.', '/?vue=messages', 1);
  end if;
  return new;
exception when others then
  return new;
end;
$$;
drop trigger if exists groupe_push on public.groupes;
create trigger groupe_push
  after update of ferme, fin_le, complet on public.groupes
  for each row execute function public.push_groupe_change();
