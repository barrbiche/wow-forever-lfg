-- Mise à jour de la base: style de jeu, langue, heure de départ et raids.
-- À coller dans Supabase: SQL Editor > New query > Run.
-- On peut le rouler plus d'une fois sans problème, et les annonces déjà publiées restent intactes.
-- L'adresse du webhook Discord n'est pas touchée.

-- 1. Nouvelles colonnes (les annonces existantes reçoivent « Relax » et « Français »).
alter table public.annonces
  add column if not exists style  text not null default 'relax'
    check (style in ('apprentissage', 'relax', 'competitif', 'carry')),
  add column if not exists langue text not null default 'fr'
    check (langue in ('fr', 'en')),
  add column if not exists debut  timestamptz;

-- 2. Les raids deviennent un type d'activité.
alter table public.annonces drop constraint if exists annonces_activite_check;
alter table public.annonces
  add constraint annonces_activite_check check (activite in ('donjon', 'raid', 'pvp'));

-- 3. Publication: annonce « maintenant » (7 h max) ou planifiée (départ dans les 72 prochaines heures,
--    l'annonce reste affichée jusqu'à 1 h après le départ). Toujours 5 annonces actives max par joueur.
drop policy if exists "publication" on public.annonces;
create policy "publication" on public.annonces
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and expires_at > now()
    and (
      (debut is null and expires_at <= now() + interval '7 hours')
      or (
        debut is not null
        and debut > now() - interval '10 minutes'
        and debut <= now() + interval '72 hours'
        and expires_at <= debut + interval '2 hours'
      )
    )
    and (
      select count(*) from public.annonces a
      where a.user_id = auth.uid() and a.expires_at > now()
    ) < 5
  );

-- 4. Le message Discord montre maintenant les règles, le style, la langue et l'heure de départ
--    (l'heure s'affiche dans le fuseau de chaque lecteur).
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
begin
  select valeur into webhook from public.reglages where cle = 'discord_webhook';
  if webhook is null then
    return new;
  end if;

  select coalesce(string_agg(
           case t.r when 'tank' then 'Tank' when 'heal' then 'Heal' when 'dps' then 'DPS' else t.r end,
           ', '), '')
    into roles_txt
    from unnest(new.roles) as t(r);

  details := 'Niveaux ' || new.niveau_min || ' à ' || new.niveau_max;
  if new.activite <> 'pvp' then
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

  message :=
    case new.activite when 'donjon' then '🛡️ Donjon' when 'raid' then '🏰 Raid' else '⚔️ PvP' end
    || ' **' || new.cible || '**, '
    || case new.faction when 'alliance' then 'Alliance' else 'Horde' end
    || ' (' || new.region || E')\n' || details
    || case when new.debut is not null
         then E'\nDépart: <t:' || extract(epoch from new.debut)::bigint
              || ':F> (<t:' || extract(epoch from new.debut)::bigint || ':R>)'
         else '' end
    || case when roles_txt <> '' then E'\nCherche: ' || roles_txt else '' end
    || E'\nContact: ' || new.contact
    || case when new.note <> '' then E'\n> ' || replace(new.note, E'\n', ' ') else '' end
    || E'\nhttps://babillard-forever.netlify.app';

  -- allowed_mentions vide: un @everyone écrit dans une annonce ne notifie personne.
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
  -- Si Discord ne répond pas, l'annonce est quand même publiée.
  return new;
end;
$$;
