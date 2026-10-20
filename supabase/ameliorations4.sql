-- Quatrième mise à jour de la base: la page « Joueurs » (profils, pouces de réputation,
-- signalements de joueurs).
-- À coller dans Supabase: SQL Editor > New query > Run.
-- À rouler après ameliorations3.sql. On peut le rouler plus d'une fois sans problème.
-- Il ne touche ni aux annonces, ni aux guildes, ni aux adresses de webhook déjà rangées dans « reglages ».
--
-- Ce qui est visible, et par qui:
--   - La liste des joueurs n'est visible que pour les gens connectés (jamais pour les visiteurs).
--   - Un profil contient le personnage (nom, classe, spécialisation, niveau, rôles, faction, région, langue, style, guilde,
--     petit mot) et, seulement si le joueur l'écrit lui-même, son BattleTag (colonne « battletag »). Pas de
--     courriel, pas d'autre contact. Le BattleTag n'est visible que pour les gens connectés.
--   - Un joueur peut se cacher de la liste en tout temps (colonne « visible »).
--   - Qui a donné un pouce ou un signalement n'est jamais montré aux autres joueurs.
--   - Trois signalements de trois personnes différentes mettent la réputation du joueur « en vérification »:
--     ses pouces ne sont plus affichés. Pour la rétablir, supprime les lignes de la table
--     « signalements_joueurs » dans Supabase > Table Editor.

-- ============================================================
-- 1. Profils de joueurs
-- ============================================================
create table if not exists public.profils (
  user_id    uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  perso      text not null check (char_length(perso) between 1 and 24),
  classe     text check (classe in ('guerrier', 'paladin', 'chasseur', 'voleur', 'pretre', 'chaman', 'mage', 'demoniste', 'druide')),
  niveau     int  check (niveau between 1 and 60),
  roles      text[] not null default '{}'
             check (roles <@ array['tank', 'heal', 'dps']::text[] and cardinality(roles) <= 3),
  faction    text not null check (faction in ('alliance', 'horde')),
  region     text not null check (region in ('US', 'EU')),
  langue     text not null default 'fr' check (langue in ('fr', 'en')),
  style      text not null default 'relax' check (style in ('apprentissage', 'relax', 'competitif', 'carry')),
  guilde     text not null default '' check (char_length(guilde) <= 40),
  bio        text not null default '' check (char_length(bio) <= 160),
  visible    boolean not null default true,
  created_at timestamptz not null default now(),
  vu_le      timestamptz not null default now()
);

-- BattleTag facultatif (Nom#1234), écrit par le joueur. Vide = rien n'est montré aux autres.
-- Format: un nom de 3 à 12 caractères sans espace, un dièse, puis 4 à 8 chiffres.
alter table public.profils
  add column if not exists battletag text not null default ''
  check (battletag = '' or battletag ~ '^[^[:space:]#]{3,12}#[0-9]{4,8}$');

-- Spécialisation (arbre de talents): trois par classe dans Forever. Vide = pas encore choisie. Le site la rend
-- obligatoire avant de publier une annonce. La base vérifie qu'elle va avec la classe.
alter table public.profils add column if not exists specialisation text not null default '';

alter table public.profils drop constraint if exists profils_specialisation_ok;
alter table public.profils add constraint profils_specialisation_ok check (
  specialisation = ''
  or (classe is not null and specialisation = any (case classe
        when 'guerrier'  then array['armes', 'fureur', 'protection']
        when 'paladin'   then array['sacre', 'protection', 'vindicte']
        when 'chasseur'  then array['maitrise_des_betes', 'precision', 'survie']
        when 'voleur'    then array['assassinat', 'combat', 'finesse']
        when 'pretre'    then array['discipline', 'sacre', 'ombre']
        when 'chaman'    then array['elementaire', 'amelioration', 'restauration']
        when 'mage'      then array['arcanes', 'feu', 'givre']
        when 'demoniste' then array['affliction', 'demonologie', 'destruction']
        when 'druide'    then array['equilibre', 'combat_farouche', 'restauration']
      end))
);

alter table public.profils enable row level security;

-- Chacun ne voit directement que son propre profil; la liste des autres passe par lister_joueurs().
drop policy if exists "lecture de son profil" on public.profils;
create policy "lecture de son profil" on public.profils
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "creation de son profil" on public.profils;
create policy "creation de son profil" on public.profils
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "modification de son profil" on public.profils;
create policy "modification de son profil" on public.profils
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "suppression de son profil" on public.profils;
create policy "suppression de son profil" on public.profils
  for delete to authenticated using (user_id = auth.uid());

revoke all on public.profils from anon, authenticated;
grant select, delete on public.profils to authenticated;
grant insert (user_id, perso, classe, specialisation, niveau, roles, faction, region, langue, style, guilde, bio, battletag, visible)
  on public.profils to authenticated;
-- user_id figure dans la liste parce que le site enregistre son profil en « upsert » (qui réécrit toutes les
-- colonnes envoyées). La règle de sécurité exige de toute façon user_id = auth.uid() avant et après.
grant update (user_id, perso, classe, specialisation, niveau, roles, faction, region, langue, style, guilde, bio, battletag, visible, vu_le)
  on public.profils to authenticated;

-- ============================================================
-- 2. Pouces de réputation (accessibles seulement par les fonctions plus bas)
-- ============================================================
create table if not exists public.recommandations (
  id         uuid primary key default gen_random_uuid(),
  de         uuid not null references auth.users (id) on delete cascade,
  pour       uuid not null references public.profils (user_id) on delete cascade,
  etiquettes text[] not null default '{}'
             check (etiquettes <@ array['ponctuel', 'sympa', 'competent', 'patient', 'bon_chef']::text[]
                    and cardinality(etiquettes) <= 5),
  created_at timestamptz not null default now(),
  check (de <> pour),
  unique (de, pour)
);

create index if not exists recommandations_pour_idx on public.recommandations (pour);

alter table public.recommandations enable row level security;
revoke all on public.recommandations from anon, authenticated;

-- ============================================================
-- 3. Signalements de joueurs (visibles seulement par toi, dans Supabase > Table Editor)
-- ============================================================
create table if not exists public.signalements_joueurs (
  id         uuid primary key default gen_random_uuid(),
  de         uuid not null references auth.users (id) on delete cascade,
  pour       uuid not null references auth.users (id) on delete cascade,
  motif      text not null check (motif in ('comportement', 'faux_profil', 'arnaque', 'autre')),
  created_at timestamptz not null default now(),
  check (de <> pour),
  unique (de, pour)
);

create index if not exists signalements_joueurs_pour_idx on public.signalements_joueurs (pour);

alter table public.signalements_joueurs enable row level security;
revoke all on public.signalements_joueurs from anon, authenticated;

-- ============================================================
-- 4. La liste des joueurs
-- ============================================================
-- Retourne les profils visibles (et le tien, même caché) avec la réputation calculée.
-- Quand un joueur a trois signalements de personnes différentes, ses pouces et étiquettes sont retirés
-- et « en_revision » vaut vrai. Les visiteurs non connectés reçoivent une liste vide.
-- (drop: la liste des colonnes retournées a changé, ce qu'un simple « create or replace » refuse.)
drop function if exists public.lister_joueurs();

create function public.lister_joueurs()
returns table (
  user_id         uuid,
  perso           text,
  classe          text,
  specialisation  text,
  niveau          int,
  roles           text[],
  faction         text,
  region          text,
  langue          text,
  style           text,
  guilde          text,
  bio             text,
  battletag       text,
  visible         boolean,
  vu_le           timestamptz,
  pouces          int,
  etiquettes      jsonb,
  en_revision     boolean,
  moi             boolean,
  ma_reco         boolean,
  mon_signalement boolean,
  annonce_id      uuid
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.user_id, p.perso, p.classe, p.specialisation, p.niveau, p.roles, p.faction, p.region, p.langue, p.style, p.guilde, p.bio,
    p.battletag,
    p.visible,
    date_bin('10 minutes', p.vu_le, timestamptz '2000-01-01'),
    case when coalesce(s.nb, 0) >= 3 then null else coalesce(r.nb, 0) end,
    case when coalesce(s.nb, 0) >= 3 then null else coalesce(r.etiq, '{}'::jsonb) end,
    coalesce(s.nb, 0) >= 3,
    p.user_id = auth.uid(),
    exists (select 1 from public.recommandations x where x.de = auth.uid() and x.pour = p.user_id),
    exists (select 1 from public.signalements_joueurs y where y.de = auth.uid() and y.pour = p.user_id),
    (select a.id from public.annonces a
       where a.user_id = p.user_id and a.expires_at > now()
       order by a.created_at desc limit 1)
  from public.profils p
  left join lateral (
    select count(*)::int as nb,
           coalesce((
             select jsonb_object_agg(q.e, q.n)
             from (
               select t.e, count(*)::int as n
               from public.recommandations x2
               cross join lateral unnest(x2.etiquettes) as t(e)
               where x2.pour = p.user_id
               group by t.e
             ) q
           ), '{}'::jsonb) as etiq
    from public.recommandations x
    where x.pour = p.user_id
  ) r on true
  left join lateral (
    select count(distinct z.de)::int as nb
    from public.signalements_joueurs z
    where z.pour = p.user_id
  ) s on true
  where auth.uid() is not null
    and (p.visible or p.user_id = auth.uid())
  order by p.vu_le desc
  limit 500;
$$;

revoke all on function public.lister_joueurs() from public, anon;
grant execute on function public.lister_joueurs() to authenticated;

-- ============================================================
-- 5. Donner, changer ou retirer un pouce
-- ============================================================
-- Règles: il faut être connecté et avoir son propre profil, on ne se recommande pas soi-même, le joueur doit
-- apparaître dans la liste, un seul pouce par joueur (le redonner change ses étiquettes), 10 nouveaux pouces
-- par 24 heures au maximum.
create or replace function public.recommander(p_pour uuid, p_etiquettes text[] default '{}')
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'connexion requise' using errcode = '28000';
  end if;
  if p_pour = auth.uid() then
    raise exception 'on ne se recommande pas soi-même' using errcode = '22023';
  end if;
  if not exists (select 1 from public.profils where user_id = auth.uid()) then
    raise exception 'crée ton profil avant de recommander quelqu''un' using errcode = '22023';
  end if;
  if not exists (select 1 from public.profils where user_id = p_pour and visible) then
    raise exception 'joueur introuvable' using errcode = 'P0002';
  end if;
  if not exists (select 1 from public.recommandations where de = auth.uid() and pour = p_pour)
     and (select count(*) from public.recommandations
          where de = auth.uid() and created_at > now() - interval '24 hours') >= 10 then
    raise exception 'trop de pouces aujourd''hui' using errcode = '54000';
  end if;
  insert into public.recommandations (de, pour, etiquettes)
  values (auth.uid(), p_pour, coalesce(p_etiquettes, '{}'))
  on conflict (de, pour) do update set etiquettes = excluded.etiquettes;
end;
$$;

revoke all on function public.recommander(uuid, text[]) from public, anon;
grant execute on function public.recommander(uuid, text[]) to authenticated;

create or replace function public.retirer_reco(p_pour uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'connexion requise' using errcode = '28000';
  end if;
  delete from public.recommandations where de = auth.uid() and pour = p_pour;
end;
$$;

revoke all on function public.retirer_reco(uuid) from public, anon;
grant execute on function public.retirer_reco(uuid) to authenticated;

-- ============================================================
-- 6. Signaler un joueur
-- ============================================================
-- 5 signalements par 24 heures au maximum. Signaler deux fois le même joueur ne compte qu'une fois.
create or replace function public.signaler_joueur(p_pour uuid, p_motif text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'connexion requise' using errcode = '28000';
  end if;
  if p_pour = auth.uid() then
    raise exception 'on ne se signale pas soi-même' using errcode = '22023';
  end if;
  if not exists (select 1 from public.profils where user_id = p_pour and visible) then
    raise exception 'joueur introuvable' using errcode = 'P0002';
  end if;
  if not exists (select 1 from public.signalements_joueurs where de = auth.uid() and pour = p_pour)
     and (select count(*) from public.signalements_joueurs
          where de = auth.uid() and created_at > now() - interval '24 hours') >= 5 then
    raise exception 'trop de signalements aujourd''hui' using errcode = '54000';
  end if;
  insert into public.signalements_joueurs (de, pour, motif)
  values (auth.uid(), p_pour, p_motif)
  on conflict (de, pour) do nothing;
end;
$$;

revoke all on function public.signaler_joueur(uuid, text) from public, anon;
grant execute on function public.signaler_joueur(uuid, text) to authenticated;

-- Si une adresse « discord_webhook_moderation » est rangée dans « reglages », chaque signalement de joueur y est
-- envoyé (nom du personnage seulement, jamais de contact).
create or replace function public.signalement_joueur_traite()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  nb      int;
  nom     text;
  webhook text;
  motif   text;
begin
  select count(distinct de) into nb from public.signalements_joueurs where pour = new.pour;
  select perso into nom from public.profils where user_id = new.pour;

  select valeur into webhook from public.reglages where cle = 'discord_webhook_moderation';
  if webhook is not null then
    motif := case new.motif
      when 'comportement' then 'comportement'
      when 'faux_profil' then 'faux profil'
      when 'arnaque' then 'arnaque ou vente'
      else 'autre'
    end;
    perform net.http_post(
      url     := webhook,
      body    := jsonb_build_object(
                   'content', '🚩 Signalement de joueur ' || nb || '/3 (' || motif || '): ' || coalesce(nom, '?')
                              || case when nb >= 3 then ' — réputation en vérification' else '' end,
                   'allowed_mentions', jsonb_build_object('parse', '[]'::jsonb)
                 ),
      headers := jsonb_build_object('Content-Type', 'application/json')
    );
  end if;
  return new;
exception when others then
  return new;
end;
$$;

drop trigger if exists signalement_joueur_apres on public.signalements_joueurs;
create trigger signalement_joueur_apres
  after insert on public.signalements_joueurs
  for each row execute function public.signalement_joueur_traite();

notify pgrst, 'reload schema';
