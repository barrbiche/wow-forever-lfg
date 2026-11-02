-- ============================================================
-- Événements planifiés avec inscriptions (raid de guilde, soirée donjons, tournoi PvP…)
-- ============================================================
-- Un joueur annonce un événement jusqu'à 60 jours d'avance. Les autres s'inscrivent avec un de leurs personnages
-- (même faction, région et type de serveur que l'événement), avec leur rôle, en « présent » ou « peut-être ».
-- Quand il y a un nombre de places, seuls les « présents » comptent et l'inscription est refusée quand c'est plein.
--
-- Qui voit quoi:
--   - Les visiteurs voient l'événement et les totaux, mais ni les noms des inscrits ni le contact.
--   - Les gens connectés voient la liste des inscrits (personnage, rôle, statut) et le contact.
-- Tout passe par des fonctions: les tables ne se lisent pas directement.
-- Se roule après ameliorations19.sql. Peut être relancé sans problème.

do $$
begin
  if to_regprocedure('public.persos_de(uuid)') is null or to_regclass('public.bannis') is null
     or to_regprocedure('public.est_moderateur()') is null then
    raise exception 'Roule ameliorations5 et 19 avant celui-ci.';
  end if;
end
$$;

-- ------------------------------------------------------------
-- 1. Les tables
-- ------------------------------------------------------------
create table if not exists public.evenements (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  created_at   timestamptz not null default now(),
  debut        timestamptz not null,
  titre        text not null check (char_length(titre) between 2 and 60),
  type         text not null check (type in ('raid', 'donjon', 'pvp', 'soiree')),
  faction      text not null check (faction in ('alliance', 'horde')),
  region       text not null check (region in ('US', 'EU')),
  ruleset      text not null check (ruleset in ('normal', 'pvp', 'rp', 'rp_pvp')),
  niveau_min   int  not null check (niveau_min between 1 and 60),
  niveau_max   int  not null check (niveau_max between 1 and 60 and niveau_max >= niveau_min),
  places       int  check (places is null or places between 2 and 40),
  description  text not null default '' check (char_length(description) <= 240),
  perso        text not null check (char_length(perso) between 1 and 24),
  guilde       text not null default '' check (char_length(guilde) <= 40),
  langue       text not null default 'fr' check (langue in ('fr', 'en')),
  contact      text not null default '' check (char_length(contact) <= 80)
);

create index if not exists evenements_debut_idx on public.evenements (debut);
create index if not exists evenements_user_idx on public.evenements (user_id);

create table if not exists public.inscriptions_evenement (
  evenement_id uuid not null references public.evenements (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  created_at   timestamptz not null default now(),
  perso        text not null check (char_length(perso) between 1 and 24),
  role         text not null check (role in ('tank', 'heal', 'dps')),
  statut       text not null check (statut in ('oui', 'peut_etre')),
  primary key (evenement_id, user_id)
);

alter table public.evenements enable row level security;
alter table public.inscriptions_evenement enable row level security;
revoke all on public.evenements from anon, authenticated;
revoke all on public.inscriptions_evenement from anon, authenticated;

-- ------------------------------------------------------------
-- 2. La liste (visiteurs inclus): contact et noms des inscrits seulement pour les gens connectés
-- ------------------------------------------------------------
drop function if exists public.lister_evenements();

create function public.lister_evenements()
returns table (
  id          uuid,
  user_id     uuid,
  created_at  timestamptz,
  debut       timestamptz,
  titre       text,
  type        text,
  faction     text,
  region      text,
  ruleset     text,
  niveau_min  int,
  niveau_max  int,
  places      int,
  description text,
  perso       text,
  guilde      text,
  langue      text,
  contact     text,
  nb_oui      int,
  nb_peut_etre int,
  nb_tank     int,
  nb_heal     int,
  nb_dps      int,
  inscrits    jsonb,
  mon_statut  text,
  mon_role    text,
  mon_perso   text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    e.id, e.user_id, e.created_at, e.debut, e.titre, e.type, e.faction, e.region, e.ruleset, e.niveau_min, e.niveau_max,
    e.places, e.description, e.perso, e.guilde, e.langue,
    case when auth.uid() is not null then e.contact else null end,
    coalesce(t.oui, 0), coalesce(t.peut_etre, 0), coalesce(t.tank, 0), coalesce(t.heal, 0), coalesce(t.dps, 0),
    case when auth.uid() is not null then coalesce(t.liste, '[]'::jsonb) else null end,
    m.statut, m.role, m.perso
  from public.evenements e
  left join lateral (
    select
      count(*) filter (where i.statut = 'oui')::int as oui,
      count(*) filter (where i.statut = 'peut_etre')::int as peut_etre,
      count(*) filter (where i.statut = 'oui' and i.role = 'tank')::int as tank,
      count(*) filter (where i.statut = 'oui' and i.role = 'heal')::int as heal,
      count(*) filter (where i.statut = 'oui' and i.role = 'dps')::int as dps,
      jsonb_agg(jsonb_build_object('perso', i.perso, 'role', i.role, 'statut', i.statut) order by i.created_at) as liste
    from public.inscriptions_evenement i
    where i.evenement_id = e.id
  ) t on true
  left join public.inscriptions_evenement m on m.evenement_id = e.id and m.user_id = auth.uid()
  where e.debut > now() - interval '3 hours'
    and not exists (select 1 from public.bannis b where b.user_id = e.user_id)
  order by e.debut
  limit 100;
$$;

revoke all on function public.lister_evenements() from public;
grant execute on function public.lister_evenements() to anon, authenticated;

-- ------------------------------------------------------------
-- 3. Créer un événement
-- ------------------------------------------------------------
create or replace function public.creer_evenement(
  p_titre text, p_type text, p_debut timestamptz, p_faction text, p_region text, p_ruleset text,
  p_niveau_min int, p_niveau_max int, p_places int, p_description text, p_perso text, p_guilde text,
  p_langue text, p_contact text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare nouveau uuid;
begin
  if auth.uid() is null then
    raise exception 'connexion requise' using errcode = '28000';
  end if;
  if exists (select 1 from public.bannis b where b.user_id = auth.uid()) then
    raise exception 'compte suspendu' using errcode = '42501';
  end if;
  if p_debut is null or p_debut < now() + interval '10 minutes' or p_debut > now() + interval '60 days' then
    raise exception 'date invalide' using errcode = '22023';
  end if;
  if (select count(*) from public.evenements e where e.user_id = auth.uid() and e.debut > now()) >= 3 then
    raise exception 'trop d''événements à venir' using errcode = '22023';
  end if;
  -- Comme pour une annonce: avec un profil, l'événement correspond à l'un de tes personnages.
  if exists (select 1 from public.persos_de(auth.uid()))
     and not exists (
       select 1 from public.persos_de(auth.uid()) p
       where p.faction = p_faction and p.region = p_region and p.ruleset = p_ruleset
     ) then
    raise exception 'aucun de tes personnages ne correspond à cet événement' using errcode = '22023';
  end if;
  insert into public.evenements
    (user_id, debut, titre, type, faction, region, ruleset, niveau_min, niveau_max, places, description, perso, guilde, langue, contact)
  values
    (auth.uid(), p_debut, btrim(p_titre), p_type, p_faction, p_region, p_ruleset, p_niveau_min, p_niveau_max, p_places,
     coalesce(btrim(p_description), ''), btrim(p_perso), coalesce(btrim(p_guilde), ''), coalesce(p_langue, 'fr'), coalesce(btrim(p_contact), ''))
  returning id into nouveau;
  return nouveau;
end;
$$;

revoke all on function public.creer_evenement(text, text, timestamptz, text, text, text, int, int, int, text, text, text, text, text) from public, anon;
grant execute on function public.creer_evenement(text, text, timestamptz, text, text, text, int, int, int, text, text, text, text, text) to authenticated;

-- ------------------------------------------------------------
-- 4. Annuler (l'organisateur ou un modérateur)
-- ------------------------------------------------------------
create or replace function public.annuler_evenement(p_evenement uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'connexion requise' using errcode = '28000';
  end if;
  delete from public.evenements e
  where e.id = p_evenement and (e.user_id = auth.uid() or public.est_moderateur());
end;
$$;

revoke all on function public.annuler_evenement(uuid) from public, anon;
grant execute on function public.annuler_evenement(uuid) to authenticated;

-- ------------------------------------------------------------
-- 5. S'inscrire (ou changer son inscription) et se désinscrire
-- ------------------------------------------------------------
create or replace function public.inscrire_evenement(p_evenement uuid, p_perso text, p_role text, p_statut text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare ev public.evenements; mien record; pris int;
begin
  if auth.uid() is null then
    raise exception 'connexion requise' using errcode = '28000';
  end if;
  if exists (select 1 from public.bannis b where b.user_id = auth.uid()) then
    raise exception 'compte suspendu' using errcode = '42501';
  end if;
  if p_role not in ('tank', 'heal', 'dps') or p_statut not in ('oui', 'peut_etre') then
    raise exception 'inscription invalide' using errcode = '22023';
  end if;
  select * into ev from public.evenements where id = p_evenement;
  if not found or ev.debut <= now() then
    raise exception 'événement terminé ou introuvable' using errcode = '22023';
  end if;
  select * into mien from public.persos_de(auth.uid()) p where p.perso = p_perso;
  if not found then
    raise exception 'personnage inconnu' using errcode = '22023';
  end if;
  if mien.faction <> ev.faction or mien.region <> ev.region or mien.ruleset <> ev.ruleset then
    raise exception 'personnage incompatible' using errcode = '22023';
  end if;
  if p_statut = 'oui' and ev.places is not null then
    select count(*) into pris from public.inscriptions_evenement i
      where i.evenement_id = ev.id and i.statut = 'oui' and i.user_id <> auth.uid();
    if pris >= ev.places then
      raise exception 'complet' using errcode = '22023';
    end if;
  end if;
  insert into public.inscriptions_evenement (evenement_id, user_id, perso, role, statut)
  values (ev.id, auth.uid(), mien.perso, p_role, p_statut)
  on conflict (evenement_id, user_id)
  do update set perso = excluded.perso, role = excluded.role, statut = excluded.statut;
end;
$$;

revoke all on function public.inscrire_evenement(uuid, text, text, text) from public, anon;
grant execute on function public.inscrire_evenement(uuid, text, text, text) to authenticated;

create or replace function public.desinscrire_evenement(p_evenement uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'connexion requise' using errcode = '28000';
  end if;
  delete from public.inscriptions_evenement where evenement_id = p_evenement and user_id = auth.uid();
end;
$$;

revoke all on function public.desinscrire_evenement(uuid) from public, anon;
grant execute on function public.desinscrire_evenement(uuid) to authenticated;
