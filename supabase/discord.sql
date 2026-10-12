-- Envoie chaque nouvelle annonce dans un canal Discord.
-- À rouler dans Supabase: SQL Editor > New query > Run.
-- L'adresse du webhook Discord n'est PAS dans ce fichier (le repo est public):
-- elle se range dans la table "reglages", voir la fin du fichier.

create table if not exists public.reglages (
  cle    text primary key,
  valeur text not null
);

-- RLS activée et aucune policy: personne ne peut lire cette table depuis le site.
alter table public.reglages enable row level security;

create extension if not exists pg_net with schema extensions;

create or replace function public.annonce_vers_discord()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  webhook   text;
  roles_txt text;
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

  message := format(
    E'%s **%s**, %s (%s)\nNiveaux %s à %s%s\nContact: %s%s\nhttps://babillard-forever.netlify.app',
    case new.activite when 'donjon' then '🛡️ Donjon' else '⚔️ PvP' end,
    new.cible,
    case new.faction when 'alliance' then 'Alliance' else 'Horde' end,
    new.region,
    new.niveau_min,
    new.niveau_max,
    case when roles_txt <> '' then E'\nCherche: ' || roles_txt else '' end,
    new.contact,
    case when new.note <> '' then E'\n> ' || replace(new.note, E'\n', ' ') else '' end
  );

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

drop trigger if exists annonce_discord on public.annonces;
create trigger annonce_discord
  after insert on public.annonces
  for each row execute function public.annonce_vers_discord();

-- Ensuite, dans une AUTRE requête, range l'adresse du webhook (remplace le texte entre guillemets):
--
-- insert into public.reglages (cle, valeur)
-- values ('discord_webhook', 'COLLE_ICI_L_ADRESSE_DU_WEBHOOK')
-- on conflict (cle) do update set valeur = excluded.valeur;
