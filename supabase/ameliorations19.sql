-- ============================================================
-- Trois personnages par joueur, deuxième nom, quatre types de serveur et règle pour rejoindre
-- ============================================================
-- Ce que ça ajoute:
--   - Les types de serveur de WoW Forever: Normal (PvE), PvP, Jeu de rôle (RP) et Jeu de rôle PvP (RP-PvP).
--     Ils s'appliquent aux annonces, aux guildes et aux personnages.
--   - Un joueur a jusqu'à 3 personnages: le principal (le profil) et 2 autres (table « personnages »).
--     Seul leur propriétaire les lit. Les autres voient seulement le personnage avec lequel on postule.
--   - Pour rejoindre un groupe, il faut la même région, le même type de serveur et la même faction.
--     La base le vérifie: un personnage qui ne convient pas ne peut pas envoyer de demande.
--   - La spécialisation du personnage qui publie une annonce.
--   - Le personnage choisi pour postuler est gardé avec la demande, donc le chef et le chat voient le bon nom.
-- Se roule après ameliorations10.sql et ameliorations18.sql. Peut être relancé sans problème.

do $$
begin
  if to_regclass('public.profils') is null or to_regclass('public.demandes') is null or to_regclass('public.groupes') is null
     or to_regclass('public.reproches') is null then
    raise exception 'Roule ameliorations4, 8, 10 et 18 avant celui-ci.';
  end if;
end
$$;

-- ------------------------------------------------------------
-- 1. Quatre types de serveur
-- ------------------------------------------------------------
do $$
declare c record;
begin
  for c in
    select con.conrelid::regclass as t, con.conname
    from pg_constraint con
    where con.contype = 'c'
      and con.conrelid in ('public.annonces'::regclass, 'public.guildes'::regclass)
      and pg_get_constraintdef(con.oid) like '%ruleset%'
  loop
    execute format('alter table %s drop constraint %I', c.t, c.conname);
  end loop;
end
$$;

alter table public.annonces
  add constraint annonces_ruleset_check check (ruleset in ('normal', 'pvp', 'rp', 'rp_pvp'));
alter table public.guildes
  add constraint guildes_ruleset_check check (ruleset in ('normal', 'pvp', 'rp', 'rp_pvp'));

-- Le personnage principal (le profil) a son type de serveur.
alter table public.profils drop constraint if exists profils_ruleset_check;
alter table public.profils add column if not exists ruleset text not null default 'normal';
alter table public.profils add constraint profils_ruleset_check check (ruleset in ('normal', 'pvp', 'rp', 'rp_pvp'));

grant insert (ruleset) on public.profils to authenticated;
grant update (ruleset) on public.profils to authenticated;

-- La spécialisation du personnage qui publie une annonce (ex.: Guerrier Armes).
alter table public.annonces add column if not exists specialisation text not null default '';
alter table public.annonces drop constraint if exists annonces_specialisation_longueur;
alter table public.annonces add constraint annonces_specialisation_longueur check (char_length(specialisation) <= 24);
grant select (specialisation) on public.annonces to anon, authenticated;

-- ------------------------------------------------------------
-- 2. Les personnages en plus (2 au maximum)
-- ------------------------------------------------------------
create table if not exists public.personnages (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profils (user_id) on delete cascade,
  slot           int  not null check (slot in (2, 3)),
  perso          text not null check (char_length(perso) between 1 and 24),
  classe         text check (classe in ('guerrier', 'paladin', 'chasseur', 'voleur', 'pretre', 'chaman', 'mage', 'demoniste', 'druide')),
  specialisation text not null default '' check (char_length(specialisation) <= 24),
  niveau         int  check (niveau between 1 and 60),
  roles          text[] not null default '{}' check (roles <@ array['tank', 'heal', 'dps']::text[] and cardinality(roles) <= 3),
  faction        text not null check (faction in ('alliance', 'horde')),
  region         text not null check (region in ('US', 'EU')),
  ruleset        text not null default 'normal' check (ruleset in ('normal', 'pvp', 'rp', 'rp_pvp')),
  unique (user_id, slot)
);

alter table public.personnages enable row level security;
revoke all on public.personnages from anon, authenticated;

-- Tous mes personnages: le principal (slot 1, le profil) puis les autres.
drop function if exists public.persos_de(uuid);

create function public.persos_de(p_user uuid)
returns table (slot int, perso text, classe text, specialisation text, niveau int, roles text[], faction text, region text, ruleset text)
language sql
stable
security definer
set search_path = public
as $$
  select 1, p.perso::text, p.classe::text, p.specialisation::text, p.niveau, p.roles, p.faction::text, p.region::text, p.ruleset::text
  from public.profils p where p.user_id = p_user
  union all
  select x.slot, x.perso::text, x.classe::text, x.specialisation::text, x.niveau, x.roles, x.faction::text, x.region::text, x.ruleset::text
  from public.personnages x where x.user_id = p_user
  order by 1;
$$;

revoke all on function public.persos_de(uuid) from public, anon, authenticated;

drop function if exists public.mes_persos();

create function public.mes_persos()
returns table (slot int, perso text, classe text, specialisation text, niveau int, roles text[], faction text, region text, ruleset text)
language sql
stable
security definer
set search_path = public
as $$
  select * from public.persos_de(auth.uid()) where auth.uid() is not null;
$$;

-- Remplace mes personnages en plus par cette liste (2 au maximum, le profil reste le personnage principal).
drop function if exists public.definir_persos_extra(jsonb);

create function public.definir_persos_extra(p_extras jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  moi uuid := auth.uid();
  e jsonb;
  n int := 0;
begin
  if moi is null then
    raise exception 'connexion requise' using errcode = '28000';
  end if;
  if not exists (select 1 from public.profils where user_id = moi) then
    raise exception 'crée ton profil d''abord' using errcode = '22023';
  end if;
  if p_extras is null or jsonb_typeof(p_extras) <> 'array' or jsonb_array_length(p_extras) > 2 then
    raise exception 'deux personnages en plus au maximum' using errcode = '22023';
  end if;

  delete from public.personnages where user_id = moi;
  for e in select * from jsonb_array_elements(p_extras)
  loop
    n := n + 1;
    insert into public.personnages (user_id, slot, perso, classe, specialisation, niveau, roles, faction, region, ruleset)
    values (
      moi, n + 1,
      btrim(coalesce(e->>'perso', '')),
      nullif(e->>'classe', ''),
      coalesce(e->>'specialisation', ''),
      nullif(e->>'niveau', '')::int,
      coalesce(array(select jsonb_array_elements_text(coalesce(e->'roles', '[]'::jsonb))), '{}'::text[]),
      e->>'faction',
      e->>'region',
      coalesce(nullif(e->>'ruleset', ''), 'normal')
    );
  end loop;
end;
$$;

revoke all on function public.mes_persos() from public, anon;
revoke all on function public.definir_persos_extra(jsonb) from public, anon;
grant execute on function public.mes_persos() to authenticated;
grant execute on function public.definir_persos_extra(jsonb) to authenticated;

-- ------------------------------------------------------------
-- 3. Le personnage avec lequel on postule est gardé dans la demande
-- ------------------------------------------------------------
alter table public.demandes add column if not exists perso_slot   int;
alter table public.demandes add column if not exists perso_nom    text;
alter table public.demandes add column if not exists perso_classe text;
alter table public.demandes add column if not exists perso_spec   text;
alter table public.demandes add column if not exists perso_niveau int;

-- Il faut la même région, le même type de serveur et la même faction. La base le vérifie.
drop function if exists public.demander_rejoindre(uuid, text, text);
drop function if exists public.demander_rejoindre(uuid, text, text, int);

create function public.demander_rejoindre(p_annonce uuid, p_role text default null, p_message text default '', p_perso int default 1)
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
  an  public.annonces;
  ch  record;
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

  select * into an from public.annonces where id = p_annonce;
  select * into ch from public.persos_de(moi) x where x.slot = coalesce(p_perso, 1);
  if ch.slot is null then
    raise exception 'personnage introuvable' using errcode = '22023';
  end if;
  if ch.region <> an.region then
    raise exception 'ce personnage est dans une autre région' using errcode = '42501';
  end if;
  if ch.faction <> an.faction then
    raise exception 'ce personnage est d''une autre faction' using errcode = '42501';
  end if;
  if ch.ruleset <> an.ruleset then
    raise exception 'ce personnage a un autre type de serveur' using errcode = '42501';
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
       set statut = 'en_attente', role = p_role, message = msg, created_at = now(), repondu_le = null,
           perso_slot = ch.slot, perso_nom = ch.perso, perso_classe = ch.classe, perso_spec = ch.specialisation, perso_niveau = ch.niveau
     where id = d.id;
  else
    insert into public.demandes (groupe_id, de, role, message, perso_slot, perso_nom, perso_classe, perso_spec, perso_niveau)
    values (g.id, moi, p_role, msg, ch.slot, ch.perso, ch.classe, ch.specialisation, ch.niveau);
  end if;
  return 'en_attente';
end;
$$;

revoke all on function public.demander_rejoindre(uuid, text, text, int) from public, anon;
grant execute on function public.demander_rejoindre(uuid, text, text, int) to authenticated;

-- Les demandes d'un groupe, pour son chef: le personnage avec lequel la personne postule.
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
         coalesce(d.perso_nom, p.perso), coalesce(d.perso_classe, p.classe),
         case when d.perso_nom is not null then coalesce(d.perso_spec, '') else p.specialisation end,
         coalesce(d.perso_niveau, p.niveau), p.roles, p.guilde, p.langue, p.style, p.bio
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

-- Les membres d'un groupe (le chef d'abord), avec le personnage choisi pour chaque joueur.
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
    select d.de, coalesce(d.perso_nom, p.perso)::text, coalesce(d.perso_classe, p.classe)::text,
           (case when d.perso_nom is not null then coalesce(d.perso_spec, '') else p.specialisation end)::text,
           coalesce(d.perso_niveau, p.niveau), d.role::text, false
    from public.demandes d
    join public.profils p on p.user_id = d.de
    where d.groupe_id = p_groupe and d.statut = 'acceptee'
  ) t
  where public.chat_est_membre(p_groupe, auth.uid())
  order by t.est_chef desc, t.perso
  limit 60;
$$;

-- Le chat du groupe montre le nom du personnage avec lequel chacun a postulé.
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
             coalesce(dm.perso_nom, p.perso)::text, coalesce(dm.perso_classe, p.classe)::text, (m.de = me)
      from public.messages_groupe m
      left join public.profils p on p.user_id = m.de
      left join public.demandes dm on dm.groupe_id = m.groupe_id and dm.de = m.de
      where m.groupe_id = p_groupe
        and m.id > coalesce(p_apres, 0)
        and not exists (select 1 from public.blocages b where b.bloqueur = me and b.bloque = m.de)
      order by m.id desc
      limit 100
    ) x
    order by x.id;
end;
$$;

-- La liste des pouces vers le bas (ameliorations18.sql) montre aussi le bon personnage.
create or replace function public.membres_groupe_reproches(p_groupe uuid)
returns table (user_id uuid, perso text, classe text, specialisation text, niveau int, a_quitte boolean, mes_reproches text[])
language sql
stable
security definer
set search_path = public
as $$
  select t.user_id, t.perso, t.classe, t.specialisation, t.niveau, t.a_quitte,
         coalesce((select array_agg(r.categorie order by r.categorie) from public.reproches r
                   where r.de = auth.uid() and r.pour = t.user_id), '{}'::text[])
  from (
    select g.chef as user_id, coalesce(p.perso, nullif(g.perso, ''), '?')::text as perso, p.classe::text as classe,
           p.specialisation::text as specialisation, p.niveau, false as a_quitte, true as est_chef
    from public.groupes g
    left join public.profils p on p.user_id = g.chef
    where g.id = p_groupe
    union all
    select d.de, coalesce(d.perso_nom, p.perso)::text, coalesce(d.perso_classe, p.classe)::text,
           (case when d.perso_nom is not null then coalesce(d.perso_spec, '') else p.specialisation end)::text,
           coalesce(d.perso_niveau, p.niveau), d.statut = 'quitte', false
    from public.demandes d
    join public.profils p on p.user_id = d.de
    where d.groupe_id = p_groupe and d.statut in ('acceptee', 'quitte')
  ) t
  where public.chat_est_membre(p_groupe, auth.uid())
    and t.user_id <> auth.uid()
  order by t.est_chef desc, t.perso
  limit 60;
$$;
