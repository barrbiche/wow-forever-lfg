-- ============================================================
-- Compteur par serveur: combien de joueurs et de groupes, par région et type de serveur
-- ============================================================
-- Pour choisir où jouer le soir du lancement. Ne donne que des totaux (aucun nom, aucun identifiant), et seulement
-- les profils visibles de comptes non bannis. Public (visiteurs inclus). Se roule après ameliorations19.sql.
-- Peut être relancé sans problème.

do $$
begin
  if to_regclass('public.profils') is null or to_regclass('public.annonces') is null or to_regclass('public.guildes') is null then
    raise exception 'Roule ameliorations4 et 19 avant celui-ci.';
  end if;
  if not exists (
    select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profils' and column_name = 'ruleset'
  ) then
    raise exception 'Roule ameliorations19.sql avant celui-ci.';
  end if;
end
$$;

drop function if exists public.stats_serveurs();

create function public.stats_serveurs()
returns table (
  region   text,
  ruleset  text,
  faction  text,
  joueurs  int,
  actifs   int,
  groupes  int,
  guildes  int
)
language sql
stable
security definer
set search_path = public
as $$
  with brut as (
    select p.region, p.ruleset::text as ruleset, p.faction,
           1 as joueurs,
           case when p.vu_le > now() - interval '1 hour' then 1 else 0 end as actifs,
           0 as groupes, 0 as guildes
    from public.profils p
    where p.visible
      and not exists (select 1 from public.bannis b where b.user_id = p.user_id)
    union all
    select a.region, a.ruleset::text, a.faction, 0, 0, 1, 0
    from public.annonces a
    where a.expires_at > now()
    union all
    select g.region, g.ruleset::text, g.faction, 0, 0, 0, 1
    from public.guildes g
    where g.expires_at > now()
  )
  select b.region, b.ruleset, b.faction,
         sum(b.joueurs)::int, sum(b.actifs)::int, sum(b.groupes)::int, sum(b.guildes)::int
  from brut b
  group by b.region, b.ruleset, b.faction;
$$;

revoke all on function public.stats_serveurs() from public;
grant execute on function public.stats_serveurs() to anon, authenticated;
