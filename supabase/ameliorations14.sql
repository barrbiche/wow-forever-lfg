-- Quatorzième mise à jour de la base: le compteur de visiteurs par jour.
-- À coller dans Supabase: SQL Editor > New query > Run. On peut la rouler plus d'une fois sans problème.
--
-- Le site compte une visite par navigateur et par jour (le navigateur retient seulement la date de sa dernière visite
-- comptée). La base ne garde qu'un nombre par jour: aucune adresse IP, aucun identifiant, aucun profil.
-- Pour voir l'historique: Table Editor > visites_jour. Le jour suit l'heure du Québec.

create table if not exists public.visites_jour (
  jour      date primary key,
  visiteurs int not null default 0
);

alter table public.visites_jour enable row level security;
revoke all on public.visites_jour from anon, authenticated;

-- Ajoute une visite à aujourd'hui et retourne le total du jour.
create or replace function public.compter_visite()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  j date := (now() at time zone 'America/Toronto')::date;
  total int;
begin
  insert into public.visites_jour (jour, visiteurs) values (j, 1)
  on conflict (jour) do update set visiteurs = public.visites_jour.visiteurs + 1
  returning visiteurs into total;
  return total;
end;
$$;

-- Le total d'aujourd'hui, sans rien ajouter.
create or replace function public.visites_aujourdhui()
returns int
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select visiteurs from public.visites_jour where jour = (now() at time zone 'America/Toronto')::date), 0);
$$;

revoke all on function public.compter_visite() from public;
revoke all on function public.visites_aujourdhui() from public;
grant execute on function public.compter_visite() to anon, authenticated;
grant execute on function public.visites_aujourdhui() to anon, authenticated;
