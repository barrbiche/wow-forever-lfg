-- Deuxième mise à jour de la base: joueurs seuls, classe, contacts cachés aux visiteurs,
-- signalements, guildes et alertes Discord par type d'annonce.
-- À coller dans Supabase: SQL Editor > New query > Run.
-- On peut le rouler plus d'une fois sans problème. Il ne touche ni aux annonces existantes,
-- ni aux adresses de webhook déjà rangées dans la table « reglages ».

-- ============================================================
-- 1. Annonces: « joueur seul » et classe du personnage
-- ============================================================
alter table public.annonces
  add column if not exists genre  text not null default 'groupe'
    check (genre in ('groupe', 'joueur')),
  add column if not exists classe text
    check (classe in ('guerrier', 'paladin', 'chasseur', 'voleur', 'pretre', 'chaman', 'mage', 'demoniste', 'druide'));

-- ============================================================
-- 2. Les contacts (Discord / BattleTag) ne sont visibles que pour les gens connectés
-- ============================================================
revoke select on public.annonces from anon;
grant select (id, user_id, created_at, expires_at, activite, cible, faction, ruleset, region,
              niveau_min, niveau_max, roles, perso, note, style, langue, debut, genre, classe)
  on public.annonces to anon;
grant select on public.annonces to authenticated;

-- ============================================================
-- 3. Guildes qui recrutent
-- ============================================================
create table if not exists public.guildes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  nom         text not null check (char_length(nom) between 2 and 40),
  faction     text not null check (faction in ('alliance', 'horde')),
  region      text not null check (region in ('US', 'EU')),
  ruleset     text not null check (ruleset in ('normal', 'pvp', 'rp')),
  langue      text not null default 'fr' check (langue in ('fr', 'en')),
  focus       text[] not null default '{}',
  style       text not null default 'relax' check (style in ('apprentissage', 'relax', 'competitif', 'carry')),
  roles       text[] not null default '{}',
  niveau_min  int  not null default 1 check (niveau_min between 1 and 60),
  description text not null default '' check (char_length(description) <= 240),
  perso       text not null check (char_length(perso) between 1 and 24),
  contact     text not null check (char_length(contact) between 1 and 80)
);

create index if not exists guildes_expires_idx on public.guildes (expires_at desc);
create index if not exists guildes_user_idx on public.guildes (user_id);

alter table public.guildes enable row level security;

drop policy if exists "lecture des guildes actives" on public.guildes;
create policy "lecture des guildes actives" on public.guildes
  for select using (expires_at > now());

-- Il faut être connecté. Une inscription dure 31 jours maximum, 2 guildes actives par joueur.
drop policy if exists "inscription de guilde" on public.guildes;
create policy "inscription de guilde" on public.guildes
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and expires_at > now()
    and expires_at <= now() + interval '31 days'
    and (
      select count(*) from public.guildes g
      where g.user_id = auth.uid() and g.expires_at > now()
    ) < 2
  );

drop policy if exists "retrait de sa guilde" on public.guildes;
create policy "retrait de sa guilde" on public.guildes
  for delete to authenticated
  using (user_id = auth.uid());

revoke all on public.guildes from anon, authenticated;
grant select (id, user_id, created_at, expires_at, nom, faction, region, ruleset, langue, focus,
              style, roles, niveau_min, description, perso)
  on public.guildes to anon;
grant select, insert, delete on public.guildes to authenticated;

-- ============================================================
-- 4. Signalements (visibles seulement par toi, dans Supabase > Table Editor)
-- ============================================================
create table if not exists public.signalements (
  id         uuid primary key default gen_random_uuid(),
  annonce_id uuid references public.annonces (id) on delete cascade,
  guilde_id  uuid references public.guildes (id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  motif      text not null check (motif in ('spam', 'faux_contact', 'inapproprie', 'autre')),
  created_at timestamptz not null default now(),
  check ((annonce_id is null) <> (guilde_id is null)),
  unique (annonce_id, user_id),
  unique (guilde_id, user_id)
);

alter table public.signalements enable row level security;

drop policy if exists "signaler" on public.signalements;
create policy "signaler" on public.signalements
  for insert to authenticated
  with check (user_id = auth.uid());

revoke all on public.signalements from anon, authenticated;
grant insert on public.signalements to authenticated;

-- Trois signalements de trois personnes différentes retirent l'annonce (ou la guilde) du site.
-- Si une adresse « discord_webhook_moderation » est rangée dans « reglages », chaque signalement y est aussi envoyé.
create or replace function public.signalement_traite()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  nb      int;
  titre   text;
  webhook text;
  motif   text;
begin
  if new.annonce_id is not null then
    select count(distinct user_id) into nb from public.signalements where annonce_id = new.annonce_id;
    select 'annonce « ' || a.cible || ' » de ' || a.perso || ' (' || a.contact || ')'
      into titre from public.annonces a where a.id = new.annonce_id;
    if nb >= 3 then
      update public.annonces set expires_at = now() where id = new.annonce_id and expires_at > now();
    end if;
  else
    select count(distinct user_id) into nb from public.signalements where guilde_id = new.guilde_id;
    select 'guilde « ' || g.nom || ' » de ' || g.perso || ' (' || g.contact || ')'
      into titre from public.guildes g where g.id = new.guilde_id;
    if nb >= 3 then
      update public.guildes set expires_at = now() where id = new.guilde_id and expires_at > now();
    end if;
  end if;

  select valeur into webhook from public.reglages where cle = 'discord_webhook_moderation';
  if webhook is not null then
    motif := case new.motif
      when 'spam' then 'spam'
      when 'faux_contact' then 'faux contact'
      when 'inapproprie' then 'contenu inapproprié'
      else 'autre'
    end;
    perform net.http_post(
      url     := webhook,
      body    := jsonb_build_object(
                   'content', '🚩 Signalement ' || nb || '/3 (' || motif || '): ' || coalesce(titre, '?'),
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

drop trigger if exists signalement_apres on public.signalements;
create trigger signalement_apres
  after insert on public.signalements
  for each row execute function public.signalement_traite();

-- ============================================================
-- 5. Discord: canal par type d'annonce, pings par rôle, joueurs seuls, guildes
-- ============================================================
-- Adresses facultatives dans « reglages » (cle / valeur):
--   discord_webhook          canal par défaut (déjà en place)
--   discord_webhook_donjon   canal des donjons      discord_webhook_raid    canal des raids
--   discord_webhook_pvp      canal du PvP           discord_webhook_guilde  canal des guildes
--   discord_role_tank / discord_role_heal / discord_role_dps   numéro du rôle Discord à mentionner
create or replace function public.annonce_vers_discord()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  webhook   text;
  roles_txt text;
  details   text;
  message   text;
  entete    text;
  role_id   text;
  r         text;
  ids       text[] := '{}';
  pings     text := '';
begin
  select valeur into webhook from public.reglages where cle = 'discord_webhook_' || new.activite;
  if webhook is null then
    select valeur into webhook from public.reglages where cle = 'discord_webhook';
  end if;
  if webhook is null then
    return new;
  end if;

  select coalesce(string_agg(
           case t.r when 'tank' then 'Tank' when 'heal' then 'Heal' when 'dps' then 'DPS' else t.r end,
           ', '), '')
    into roles_txt
    from unnest(new.roles) as t(r);

  -- Seuls les groupes qui cherchent des rôles mentionnent les rôles Discord choisis par toi.
  if new.genre = 'groupe' then
    foreach r in array new.roles loop
      select valeur into role_id from public.reglages where cle = 'discord_role_' || r;
      if role_id is not null and role_id ~ '^[0-9]{5,25}$' then
        ids := array_append(ids, role_id);
      end if;
    end loop;
    select coalesce(array_agg(distinct x), '{}') into ids from unnest(ids) as x;
    select coalesce(string_agg('<@&' || x || '>', ' '), '') into pings from unnest(ids) as x;
  end if;

  entete := case new.activite when 'donjon' then '🛡️ Donjon' when 'raid' then '🏰 Raid' else '⚔️ PvP' end
    || ' **' || new.cible || '**, '
    || case new.faction when 'alliance' then 'Alliance' else 'Horde' end
    || ' (' || new.region || ')';
  if new.genre = 'joueur' then
    entete := '🙋 Joueur seul · ' || entete;
  end if;

  details := case when new.niveau_min = new.niveau_max
                then 'Niveau ' || new.niveau_min
                else 'Niveaux ' || new.niveau_min || ' à ' || new.niveau_max end;
  if new.classe is not null then
    details := details || ' · ' || case new.classe
      when 'guerrier' then 'Guerrier' when 'paladin' then 'Paladin' when 'chasseur' then 'Chasseur'
      when 'voleur' then 'Voleur' when 'pretre' then 'Prêtre' when 'chaman' then 'Chaman'
      when 'mage' then 'Mage' when 'demoniste' then 'Démoniste' else 'Druide' end;
  end if;
  -- Les règles de jeu ne sont plus demandées dans le formulaire: on les écrit seulement si elles ne sont pas « normales ».
  if new.activite <> 'pvp' and new.ruleset <> 'normal' then
    details := details || ' · ' || case new.ruleset
      when 'pvp' then 'Règles PvP'
      when 'rp' then 'Règles jeu de rôle'
      else 'Règles normales'
    end;
  end if;
  details := details
    || ' · ' || case new.style
         when 'apprentissage' then 'Apprentissage'
         when 'competitif' then 'Compétitif'
         when 'carry' then 'Carry offert'
         else 'Relax'
       end
    || ' · ' || case new.langue when 'en' then 'English' else 'Français' end;

  message := entete || E'\n' || details
    || case when new.debut is not null
         then E'\nDépart: <t:' || extract(epoch from new.debut)::bigint
              || ':F> (<t:' || extract(epoch from new.debut)::bigint || ':R>)'
         else '' end
    || case when roles_txt <> ''
         then E'\n' || case when new.genre = 'joueur' then 'Joue: ' else 'Cherche: ' end || roles_txt
              || case when pings <> '' then ' ' || pings else '' end
         else '' end
    || coalesce(E'\nContact: ' || new.contact, '')
    || case when new.note <> '' then E'\n> ' || replace(new.note, E'\n', ' ') else '' end
    || E'\nhttps://babillard-forever.netlify.app';

  -- allowed_mentions: personne n'est mentionné par le texte d'un joueur; seuls tes rôles choisis le sont.
  perform net.http_post(
    url     := webhook,
    body    := jsonb_build_object(
                 'content', message,
                 'allowed_mentions', jsonb_build_object('parse', '[]'::jsonb, 'roles', to_jsonb(ids))
               ),
    headers := jsonb_build_object('Content-Type', 'application/json')
  );
  return new;
exception when others then
  -- Si Discord ne répond pas, l'annonce est quand même publiée.
  return new;
end;
$$;

-- Nouvelles guildes: envoyées seulement si « discord_webhook_guilde » est rangée dans « reglages ».
create or replace function public.guilde_vers_discord()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  webhook text;
  focus_txt text;
  message text;
begin
  select valeur into webhook from public.reglages where cle = 'discord_webhook_guilde';
  if webhook is null then
    return new;
  end if;

  select coalesce(string_agg(
           case t.f when 'donjon' then 'Donjons' when 'raid' then 'Raids' when 'pvp' then 'PvP' else t.f end,
           ', '), '')
    into focus_txt
    from unnest(new.focus) as t(f);

  message := '⚜️ Guilde **' || new.nom || '**, '
    || case new.faction when 'alliance' then 'Alliance' else 'Horde' end
    || ' (' || new.region || E') recrute'
    || case when focus_txt <> '' then E'\n' || focus_txt else '' end
    || case when new.niveau_min > 1 then ' · dès le niveau ' || new.niveau_min else '' end
    || ' · ' || case new.langue when 'en' then 'English' else 'Français' end
    || case when new.description <> '' then E'\n> ' || replace(new.description, E'\n', ' ') else '' end
    || coalesce(E'\nContact: ' || new.contact, '')
    || E'\nhttps://babillard-forever.netlify.app';

  perform net.http_post(
    url     := webhook,
    body    := jsonb_build_object(
                 'content', message,
                 'allowed_mentions', jsonb_build_object('parse', '[]'::jsonb)
               ),
    headers := jsonb_build_object('Content-Type', 'application/json')
  );
  return new;
exception when others then
  return new;
end;
$$;

drop trigger if exists guilde_discord on public.guildes;
create trigger guilde_discord
  after insert on public.guildes
  for each row execute function public.guilde_vers_discord();

-- Dit à l'API de relire la structure de la base.
notify pgrst, 'reload schema';
