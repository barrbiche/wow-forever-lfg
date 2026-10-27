-- Nouveau type d'annonce: « Quêtes » (leveling). À coller dans Supabase: SQL Editor > New query > Run.
-- Se roule après ameliorations10.sql. On peut le relancer sans problème.

-- 1) La base accepte l'activité « quete ».
alter table public.annonces drop constraint if exists annonces_activite_check;
alter table public.annonces
  add constraint annonces_activite_check check (activite in ('donjon', 'raid', 'pvp', 'quete'));

-- 2) Un groupe de quêtes compte 5 joueurs au plus (4 à accepter, sans le chef), comme un donjon.
create or replace function public.groupe_places_max(p_annonce uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select case
    when a.activite in ('donjon', 'quete') then 4
    when a.activite = 'raid' and a.roles_nb is not null then
      (select coalesce(sum(case when value ~ '^[0-9]+$' then value::int else 0 end), 0)::int from jsonb_each_text(a.roles_nb))
    else null
  end
  from public.annonces a where a.id = p_annonce;
$$;
revoke all on function public.groupe_places_max(uuid) from public, anon, authenticated;
