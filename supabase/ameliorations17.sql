-- ============================================================
-- Aperçu des joueurs pour les visiteurs non connectés
-- ============================================================
-- Donne aux gens qui n'ont pas de compte un avant-goût du site: les profils les plus récemment actifs
-- (seulement ceux qui ont choisi d'apparaître dans la liste). Ne sort JAMAIS: l'identifiant du compte,
-- le BattleTag, le petit mot (bio), l'annonce du joueur ni qui a donné quel pouce.
-- Se roule après ameliorations4.sql (profils et pouces). Peut être relancé sans problème.

do $$
begin
  if to_regclass('public.profils') is null or to_regclass('public.recommandations') is null or to_regclass('public.bannis') is null then
    raise exception 'Roule ameliorations4.sql et ameliorations5.sql avant celui-ci.';
  end if;
end
$$;

drop function if exists public.apercu_joueurs();

create function public.apercu_joueurs()
returns table (
  perso          text,
  classe         text,
  specialisation text,
  niveau         int,
  roles          text[],
  faction        text,
  region         text,
  langue         text,
  style          text,
  guilde         text,
  vu_le          timestamptz,
  pouces         int,
  etiquettes     jsonb,
  en_revision    boolean,
  total          int
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.perso, p.classe, p.specialisation, p.niveau, p.roles, p.faction, p.region, p.langue, p.style, p.guilde,
    date_bin('10 minutes', p.vu_le, timestamptz '2000-01-01'),
    case when coalesce(s.nb, 0) >= 3 then null else coalesce(r.nb, 0) end,
    case when coalesce(s.nb, 0) >= 3 then null else coalesce(r.etiq, '{}'::jsonb) end,
    coalesce(s.nb, 0) >= 3,
    (count(*) over ())::int
  from public.profils p
  left join lateral (
    select count(*)::int as nb,
           coalesce((
             select jsonb_object_agg(q.e, q.n)
             from (
               select t.e, count(*)::int as n
               from public.recommandations x2
               cross join lateral unnest(x2.etiquettes) as t(e)
               where x2.pour = p.user_id
               group by t.e
             ) q
           ), '{}'::jsonb) as etiq
    from public.recommandations x
    where x.pour = p.user_id
  ) r on true
  left join lateral (
    select count(distinct z.de)::int as nb
    from public.signalements_joueurs z
    where z.pour = p.user_id
  ) s on true
  where p.visible
    and not exists (select 1 from public.bannis b where b.user_id = p.user_id)
  order by p.vu_le desc
  limit 24;
$$;

revoke all on function public.apercu_joueurs() from public;
grant execute on function public.apercu_joueurs() to anon, authenticated;
