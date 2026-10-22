-- Neuvième mise à jour de la base: le badge « Supporter » (pour remercier les gens qui font un don).
-- À coller dans Supabase: SQL Editor > New query > Run. À rouler APRÈS ameliorations8.sql.
-- On peut la rouler plus d'une fois sans problème. Elle ne touche à aucune autre table.
--
-- Comment donner le badge à quelqu'un: Table Editor > supporters > Insert row, et colle son « user_id »
-- (l'identifiant du compte: Authentication > Users, colonne « User UID »). Pour le retirer, supprime la ligne.
-- Ce qui est visible: les gens connectés voient le badge à côté du nom du personnage. Rien d'autre (ni courriel, ni montant).

create table if not exists public.supporters (
  user_id uuid primary key references auth.users (id) on delete cascade,
  depuis  timestamptz not null default now()
);

alter table public.supporters enable row level security;
revoke all on public.supporters from anon, authenticated;

create or replace function public.lister_supporters()
returns setof uuid
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Connexion requise' using errcode = '28000';
  end if;
  return query select s.user_id from public.supporters s;
end;
$$;

revoke all on function public.lister_supporters() from public, anon;
grant execute on function public.lister_supporters() to authenticated;
