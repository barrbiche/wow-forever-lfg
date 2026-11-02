-- ============================================================
-- « Je suis dispo maintenant »: un statut temporaire dans la liste des joueurs
-- ============================================================
-- Un joueur peut se déclarer disponible pour 30 min, 1 h ou 2 h. Il remonte alors en haut de la liste et les autres le voient
-- avec une pastille « Dispo maintenant ». Le statut s'éteint tout seul à la fin (ou quand il l'arrête). Il faut un profil
-- visible. Se roule après ameliorations21.sql. Peut être relancé sans problème.

do $$
begin
  if not exists (
    select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profils' and column_name = 'ruleset'
  ) or to_regprocedure('public.lister_amis()') is null then
    raise exception 'Roule ameliorations19.sql et ameliorations21.sql avant celui-ci.';
  end if;
end
$$;

alter table public.profils add column if not exists dispo_jusqu_a timestamptz;

-- Se déclarer dispo (p_minutes entre 1 et 120) ou arrêter (0). Retourne la fin du statut, ou null.
create or replace function public.etre_disponible(p_minutes int)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare fin timestamptz;
begin
  if auth.uid() is null then
    raise exception 'connexion requise' using errcode = '28000';
  end if;
  if p_minutes is null or p_minutes < 0 or p_minutes > 120 then
    raise exception 'durée invalide' using errcode = '22023';
  end if;
  if p_minutes = 0 then
    update public.profils set dispo_jusqu_a = null where user_id = auth.uid();
    return null;
  end if;
  if exists (select 1 from public.bannis b where b.user_id = auth.uid()) then
    raise exception 'compte suspendu' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profils where user_id = auth.uid() and visible) then
    raise exception 'profil visible requis' using errcode = '22023';
  end if;
  fin := now() + make_interval(mins => p_minutes);
  update public.profils set dispo_jusqu_a = fin where user_id = auth.uid();
  return fin;
end;
$$;

revoke all on function public.etre_disponible(int) from public, anon;
grant execute on function public.etre_disponible(int) to authenticated;

-- La liste des joueurs montre qui est dispo.
drop function if exists public.lister_joueurs();

create function public.lister_joueurs()
returns table (
  user_id         uuid,
  perso           text,
  classe          text,
  specialisation  text,
  niveau          int,
  roles           text[],
  faction         text,
  region          text,
  ruleset         text,
  langue          text,
  style           text,
  guilde          text,
  bio             text,
  battletag       text,
  visible         boolean,
  vu_le           timestamptz,
  pouces          int,
  etiquettes      jsonb,
  en_revision     boolean,
  moi             boolean,
  ma_reco         boolean,
  mon_signalement boolean,
  annonce_id      uuid,
  dispo_jusqu_a   timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.user_id, p.perso, p.classe, p.specialisation, p.niveau, p.roles, p.faction, p.region, p.ruleset::text, p.langue, p.style, p.guilde, p.bio,
    p.battletag,
    p.visible,
    date_bin('10 minutes', p.vu_le, timestamptz '2000-01-01'),
    case when coalesce(s.nb, 0) >= 3 then null else coalesce(r.nb, 0) end,
    case when coalesce(s.nb, 0) >= 3 then null else coalesce(r.etiq, '{}'::jsonb) end,
    coalesce(s.nb, 0) >= 3,
    p.user_id = auth.uid(),
    exists (select 1 from public.recommandations x where x.de = auth.uid() and x.pour = p.user_id),
    exists (select 1 from public.signalements_joueurs y where y.de = auth.uid() and y.pour = p.user_id),
    (select a.id from public.annonces a
       where a.user_id = p.user_id and a.expires_at > now()
       order by a.created_at desc limit 1),
    case when p.dispo_jusqu_a > now() then p.dispo_jusqu_a end
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
  where auth.uid() is not null
    and (p.visible or p.user_id = auth.uid())
  order by p.vu_le desc
  limit 500;
$$;

revoke all on function public.lister_joueurs() from public, anon;
grant execute on function public.lister_joueurs() to authenticated;
