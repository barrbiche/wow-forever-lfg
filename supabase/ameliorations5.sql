-- Modération: une page réservée aux modérateurs (signalements à traiter, retrait, suspension de comptes).
-- À coller dans Supabase: SQL Editor > New query > Run. À rouler APRÈS ameliorations4.sql.
-- Sans danger si tu le relances.
--
-- Ce que ça ajoute:
--   - « moderateurs »: la liste des comptes qui ont accès à la page « Modération » du site.
--   - « bannis »: les comptes suspendus (ils ne peuvent plus publier d'annonce ni de guilde, et leur profil reste caché).
--   - « moderation_journal »: qui a fait quoi et quand (à lire dans Table Editor).
--   - Des fonctions qui ne marchent que pour les modérateurs (chacune vérifie le compte à chaque appel).
--
-- Pour te donner l'accès (une seule fois), après avoir roulé ce fichier:
--   1) Connecte-toi une fois au site avec ton compte.
--   2) Dans le SQL Editor, trouve ton compte (le plus récent est toi):
--        select id, email, raw_user_meta_data->>'full_name' as nom, last_sign_in_at
--        from auth.users order by last_sign_in_at desc nulls last limit 5;
--   3) Copie ton « id », puis roule:
--        insert into public.moderateurs (user_id) values ('COLLE-TON-ID-ICI');
--   Recharge le site: un lien « Modération » apparaît à côté de « Mon profil ».
-- Pour retirer un modérateur: delete from public.moderateurs where user_id = '...';

-- ============================================================
-- 1. Tables (aucune n'est lisible directement: tout passe par les fonctions plus bas)
-- ============================================================
create table if not exists public.moderateurs (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.bannis (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  raison     text not null default '' check (char_length(raison) <= 200),
  par        uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.moderation_journal (
  id         uuid primary key default gen_random_uuid(),
  par        uuid references auth.users (id) on delete set null,
  action     text not null,
  cible_type text not null,
  cible_id   uuid,
  note       text not null default '',
  created_at timestamptz not null default now()
);

alter table public.moderateurs enable row level security;
alter table public.bannis enable row level security;
alter table public.moderation_journal enable row level security;
revoke all on public.moderateurs from anon, authenticated;
revoke all on public.bannis from anon, authenticated;
revoke all on public.moderation_journal from anon, authenticated;

-- ============================================================
-- 2. Qui est modérateur
-- ============================================================
create or replace function public.est_moderateur()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.moderateurs where user_id = auth.uid());
$$;

revoke all on function public.est_moderateur() from public, anon;
grant execute on function public.est_moderateur() to authenticated;

-- ============================================================
-- 3. La file « à traiter »: tout ce qui a été signalé (annonces, guildes, joueurs)
-- ============================================================
-- Retourne une liste vide pour qui n'est pas modérateur. Les modérateurs voient le contact (ils sont connectés).
create or replace function public.mod_a_traiter()
returns table (
  type      text,
  cible_id  uuid,
  nb        int,
  motifs    text[],
  dernier   timestamptz,
  auteur    uuid,
  perso     text,
  titre     text,
  detail    text,
  contact   text,
  actif     boolean,
  suspendu  boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select t.*
  from (
    select 'annonce'::text as type, a.id as cible_id, s.nb, s.motifs, s.dernier, a.user_id as auteur, a.perso,
           (a.activite || ': ' || a.cible)::text as titre, a.note as detail, a.contact::text as contact,
           (a.expires_at > now()) as actif,
           exists (select 1 from public.bannis b where b.user_id = a.user_id) as suspendu
    from (
      select annonce_id, count(distinct user_id)::int as nb, array_agg(distinct motif order by motif) as motifs,
             max(created_at) as dernier
      from public.signalements where annonce_id is not null group by annonce_id
    ) s
    join public.annonces a on a.id = s.annonce_id
    union all
    select 'guilde'::text, g.id, s.nb, s.motifs, s.dernier, g.user_id, g.perso, g.nom::text, g.description, g.contact::text,
           (g.expires_at > now()),
           exists (select 1 from public.bannis b where b.user_id = g.user_id)
    from (
      select guilde_id, count(distinct user_id)::int as nb, array_agg(distinct motif order by motif) as motifs,
             max(created_at) as dernier
      from public.signalements where guilde_id is not null group by guilde_id
    ) s
    join public.guildes g on g.id = s.guilde_id
    union all
    select 'joueur'::text, p.user_id, s.nb, s.motifs, s.dernier, p.user_id, p.perso, p.perso::text, p.bio, p.battletag::text,
           p.visible,
           exists (select 1 from public.bannis b where b.user_id = p.user_id)
    from (
      select pour, count(distinct de)::int as nb, array_agg(distinct motif order by motif) as motifs,
             max(created_at) as dernier
      from public.signalements_joueurs group by pour
    ) s
    join public.profils p on p.user_id = s.pour
  ) t
  where public.est_moderateur()
  order by t.nb desc, t.dernier desc
  limit 200;
$$;

revoke all on function public.mod_a_traiter() from public, anon;
grant execute on function public.mod_a_traiter() to authenticated;

-- Les comptes suspendus
create or replace function public.mod_suspendus()
returns table (user_id uuid, raison text, depuis timestamptz, perso text)
language sql
stable
security definer
set search_path = public
as $$
  select b.user_id, b.raison, b.created_at,
         (select p.perso from public.profils p where p.user_id = b.user_id)
  from public.bannis b
  where public.est_moderateur()
  order by b.created_at desc
  limit 200;
$$;

revoke all on function public.mod_suspendus() from public, anon;
grant execute on function public.mod_suspendus() to authenticated;

-- ============================================================
-- 4. Les actions (type: 'annonce', 'guilde' ou 'joueur')
-- ============================================================
-- Écarter: « rien à signaler ». Les signalements sont effacés (pour un joueur, sa réputation n'est plus « en
-- vérification »).
create or replace function public.mod_ecarter(p_type text, p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.est_moderateur() then
    raise exception 'réservé aux modérateurs' using errcode = '42501';
  end if;
  if p_type = 'annonce' then
    delete from public.signalements where annonce_id = p_id;
  elsif p_type = 'guilde' then
    delete from public.signalements where guilde_id = p_id;
  elsif p_type = 'joueur' then
    delete from public.signalements_joueurs where pour = p_id;
  else
    raise exception 'type inconnu' using errcode = '22023';
  end if;
  insert into public.moderation_journal (par, action, cible_type, cible_id) values (auth.uid(), 'ecarter', p_type, p_id);
end;
$$;

-- Retirer du site: l'annonce ou la guilde disparaît tout de suite; un profil de joueur est caché de la liste.
-- Les signalements restent là, pour mémoire.
create or replace function public.mod_retirer(p_type text, p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.est_moderateur() then
    raise exception 'réservé aux modérateurs' using errcode = '42501';
  end if;
  if p_type = 'annonce' then
    update public.annonces set expires_at = now() where id = p_id and expires_at > now();
  elsif p_type = 'guilde' then
    update public.guildes set expires_at = now() where id = p_id and expires_at > now();
  elsif p_type = 'joueur' then
    update public.profils set visible = false where user_id = p_id;
  else
    raise exception 'type inconnu' using errcode = '22023';
  end if;
  insert into public.moderation_journal (par, action, cible_type, cible_id) values (auth.uid(), 'retirer', p_type, p_id);
end;
$$;

-- Remettre en ligne une annonce ou une guilde retirée à tort (2 heures pour une annonce, 7 jours pour une guilde),
-- et effacer ses signalements.
create or replace function public.mod_remettre(p_type text, p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.est_moderateur() then
    raise exception 'réservé aux modérateurs' using errcode = '42501';
  end if;
  if p_type = 'annonce' then
    update public.annonces set expires_at = greatest(expires_at, now() + interval '2 hours') where id = p_id;
    delete from public.signalements where annonce_id = p_id;
  elsif p_type = 'guilde' then
    update public.guildes set expires_at = greatest(expires_at, now() + interval '7 days') where id = p_id;
    delete from public.signalements where guilde_id = p_id;
  else
    raise exception 'type inconnu' using errcode = '22023';
  end if;
  insert into public.moderation_journal (par, action, cible_type, cible_id) values (auth.uid(), 'remettre', p_type, p_id);
end;
$$;

-- Suspendre un compte: ses annonces et guildes actives sont retirées, son profil est caché, et il ne peut plus
-- publier. On ne peut suspendre ni soi-même ni un autre modérateur.
create or replace function public.mod_suspendre(p_user uuid, p_raison text default '')
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.est_moderateur() then
    raise exception 'réservé aux modérateurs' using errcode = '42501';
  end if;
  if p_user = auth.uid() or exists (select 1 from public.moderateurs where user_id = p_user) then
    raise exception 'ce compte ne peut pas être suspendu' using errcode = '22023';
  end if;
  insert into public.bannis (user_id, raison, par)
  values (p_user, left(coalesce(p_raison, ''), 200), auth.uid())
  on conflict (user_id) do update set raison = excluded.raison, par = excluded.par;
  update public.annonces set expires_at = now() where user_id = p_user and expires_at > now();
  update public.guildes set expires_at = now() where user_id = p_user and expires_at > now();
  update public.profils set visible = false where user_id = p_user;
  insert into public.moderation_journal (par, action, cible_type, cible_id, note)
  values (auth.uid(), 'suspendre', 'joueur', p_user, left(coalesce(p_raison, ''), 200));
end;
$$;

-- Rétablir un compte suspendu (son profil reste caché jusqu'à ce que la personne le montre elle-même).
create or replace function public.mod_retablir(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.est_moderateur() then
    raise exception 'réservé aux modérateurs' using errcode = '42501';
  end if;
  delete from public.bannis where user_id = p_user;
  insert into public.moderation_journal (par, action, cible_type, cible_id) values (auth.uid(), 'retablir', 'joueur', p_user);
end;
$$;

revoke all on function public.mod_ecarter(text, uuid) from public, anon;
revoke all on function public.mod_retirer(text, uuid) from public, anon;
revoke all on function public.mod_remettre(text, uuid) from public, anon;
revoke all on function public.mod_suspendre(uuid, text) from public, anon;
revoke all on function public.mod_retablir(uuid) from public, anon;
grant execute on function public.mod_ecarter(text, uuid) to authenticated;
grant execute on function public.mod_retirer(text, uuid) to authenticated;
grant execute on function public.mod_remettre(text, uuid) to authenticated;
grant execute on function public.mod_suspendre(uuid, text) to authenticated;
grant execute on function public.mod_retablir(uuid) to authenticated;

-- ============================================================
-- 5. Un compte suspendu ne peut plus publier
-- ============================================================
create or replace function public.refuser_compte_suspendu()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.bannis where user_id = auth.uid()) then
    raise exception 'compte suspendu' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists refuser_suspendu on public.annonces;
create trigger refuser_suspendu
  before insert on public.annonces
  for each row execute function public.refuser_compte_suspendu();

drop trigger if exists refuser_suspendu on public.guildes;
create trigger refuser_suspendu
  before insert on public.guildes
  for each row execute function public.refuser_compte_suspendu();

-- Le profil d'un compte suspendu reste caché de la liste, même s'il essaie de le montrer.
create or replace function public.profil_compte_suspendu()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.bannis where user_id = new.user_id) then
    new.visible := false;
  end if;
  return new;
end;
$$;

drop trigger if exists profil_suspendu on public.profils;
create trigger profil_suspendu
  before insert or update on public.profils
  for each row execute function public.profil_compte_suspendu();
