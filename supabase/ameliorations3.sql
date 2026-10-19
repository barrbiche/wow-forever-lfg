-- Troisième mise à jour de la base: composition de raid (nombre de joueurs par rôle),
-- renouvellement d'une annonce et message Discord qui montre les nombres.
-- À coller dans Supabase: SQL Editor > New query > Run.
-- On peut le rouler plus d'une fois sans problème. Il ne touche ni aux annonces existantes,
-- ni aux adresses de webhook rangées dans la table « reglages ».
-- Il se roule APRÈS ameliorations2.sql, et avant ou après la mise en ligne du nouveau site (les deux ordres fonctionnent).

-- ============================================================
-- 1. Raids: nombre de joueurs recherchés par rôle (ex.: {"tank": 2, "heal": 5, "dps": 12})
-- ============================================================
alter table public.annonces add column if not exists roles_nb jsonb;

create or replace function public.roles_nb_valide(j jsonb)
returns boolean
language sql
immutable
as $$
  select j is null or (
    jsonb_typeof(j) = 'object'
    and not exists (select 1 from jsonb_object_keys(j) k where k not in ('tank', 'heal', 'dps'))
    and not exists (
      select 1 from jsonb_each(j) e
      where jsonb_typeof(e.value) <> 'number' or e.value::text !~ '^[0-9]{1,2}$'
    )
    and (select coalesce(sum(e.value::text::int), 0) from jsonb_each(j) e) <= 39
  )
$$;

alter table public.annonces drop constraint if exists annonces_roles_nb_check;
alter table public.annonces
  add constraint annonces_roles_nb_check
  check (public.roles_nb_valide(roles_nb) and (roles_nb is null or activite = 'raid'));

-- Les visiteurs peuvent lire ce nombre (pas le contact), et le propriétaire peut le diminuer (« Tank trouvé »).
grant select (roles_nb) on public.annonces to anon;
revoke update on public.annonces from anon, authenticated;
grant update (roles, roles_nb) on public.annonces to authenticated;

-- ============================================================
-- 2. Renouveler une annonce
-- ============================================================
-- Le propriétaire peut relancer son annonce (même durée qu'au départ) quand il lui reste moins de la moitié
-- de son temps. Une annonce planifiée ne se renouvelle pas. Rien n'est reposté sur Discord.
create or replace function public.renouveler_annonce(p_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  a       public.annonces;
  duree   interval;
  nouvelle timestamptz;
begin
  select * into a
    from public.annonces
    where id = p_id and user_id = auth.uid() and expires_at > now()
    for update;
  if not found then
    raise exception 'annonce introuvable' using errcode = 'P0002';
  end if;
  if a.debut is not null then
    raise exception 'une annonce planifiée ne se renouvelle pas' using errcode = 'P0001';
  end if;

  duree := least(a.expires_at - a.created_at, interval '6 hours');
  if a.expires_at - now() > duree / 2 then
    raise exception 'trop tôt pour renouveler' using errcode = 'P0001';
  end if;

  nouvelle := now() + duree;
  update public.annonces set created_at = now(), expires_at = nouvelle where id = p_id;
  return nouvelle;
end;
$$;

revoke all on function public.renouveler_annonce(uuid) from public, anon;
grant execute on function public.renouveler_annonce(uuid) to authenticated;

-- ============================================================
-- 3. Message Discord: les rôles montrent le nombre voulu pour les raids
-- ============================================================
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

  -- Rôles recherchés, dans l'ordre Tank / Heal / DPS. Pour un raid, le nombre voulu s'ajoute (« Heal ×5 »).
  select coalesce(string_agg(
           case t.r when 'tank' then 'Tank' when 'heal' then 'Heal' when 'dps' then 'DPS' else t.r end
           || case when coalesce((new.roles_nb ->> t.r)::int, 0) > 0 then ' ×' || (new.roles_nb ->> t.r) else '' end,
           ', ' order by case t.r when 'tank' then 1 when 'heal' then 2 else 3 end), '')
    into roles_txt
    from (select distinct x.r from unnest(new.roles) as x(r)) as t;

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

-- Dit à l'API de relire la structure de la base.
notify pgrst, 'reload schema';
