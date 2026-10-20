-- Septième mise à jour de la base: les annonces et les guildes ne sont plus envoyées dans Discord.
-- À coller dans Supabase: SQL Editor > New query > Run. À rouler APRÈS ameliorations6.sql.
-- On peut la rouler plus d'une fois sans problème. Elle ne change rien aux annonces, aux guildes ni aux profils.
--
-- Ce qui s'arrête: chaque nouvelle annonce et chaque nouvelle guilde dans le canal Discord.
-- Ce qui reste: l'alerte privée de signalement (réglage « discord_webhook_moderation », si tu l'as rangé dans « reglages »).

drop trigger if exists annonce_discord on public.annonces;
drop trigger if exists guilde_discord on public.guildes;
drop function if exists public.annonce_vers_discord();
drop function if exists public.guilde_vers_discord();

-- Les adresses de webhook des annonces et des guildes, et les rôles à mentionner, ne servent plus: on les efface.
-- (« discord_webhook_moderation » n'est pas touchée.)
do $$
begin
  if to_regclass('public.reglages') is not null then
    delete from public.reglages
     where cle in ('discord_webhook', 'discord_webhook_donjon', 'discord_webhook_raid', 'discord_webhook_pvp',
                   'discord_webhook_guilde', 'discord_role_tank', 'discord_role_heal', 'discord_role_dps');
  end if;
end
$$;
