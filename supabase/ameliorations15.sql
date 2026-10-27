-- Quinzième mise à jour de la base: le compteur « groupes formés aujourd'hui ».
-- À coller dans Supabase: SQL Editor > New query > Run. On peut la rouler plus d'une fois sans problème.
--
-- Un groupe compte comme « formé » quand son chef a accepté au moins une personne aujourd'hui (heure du Québec).
-- La fonction retourne seulement un nombre: aucun nom, aucun identifiant.

create or replace function public.groupes_formes_aujourdhui()
returns int
language sql
stable
security definer
set search_path = public
as $$
  select count(distinct d.groupe_id)::int
  from public.demandes d
  where d.statut = 'acceptee'
    and (d.repondu_le at time zone 'America/Toronto')::date = (now() at time zone 'America/Toronto')::date;
$$;

revoke all on function public.groupes_formes_aujourdhui() from public;
grant execute on function public.groupes_formes_aujourdhui() to anon, authenticated;
