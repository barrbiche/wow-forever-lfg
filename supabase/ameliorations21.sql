-- ============================================================
-- La liste des joueurs montre aussi leur type de serveur
-- ============================================================
-- Pour grouper, il faut la même faction, la même région ET le même type de serveur. La liste des joueurs ne donnait
-- pas ce dernier: maintenant oui, ce qui permet au site de n'afficher « Inviter dans le jeu » que pour les joueurs
-- avec qui tu peux vraiment grouper. Se roule après ameliorations19.sql. Peut être relancé sans problème.

do $$
begin
  if not exists (
    select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profils' and column_name = 'ruleset'
  ) then
    raise exception 'Roule ameliorations19.sql avant celui-ci.';
  end if;
end
$$;

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
  annonce_id      uuid
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
       order by a.created_at desc limit 1)
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

-- Même chose pour la liste d'amis.
drop function if exists public.lister_amis();

create function public.lister_amis()
returns table (
  user_id   uuid,
  lien      text,
  depuis    timestamptz,
  perso     text,
  classe    text,
  specialisation text,
  niveau    int,
  roles     text[],
  faction   text,
  region    text,
  ruleset   text,
  langue    text,
  style     text,
  guilde    text,
  bio       text,
  battletag text,
  visible   boolean,
  vu_le     timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with liens as (
    select
      case when a.demandeur = auth.uid() then a.destinataire else a.demandeur end as autre,
      case
        when a.statut = 'acceptee' then 'ami'
        when a.statut = 'en_attente' and a.demandeur = auth.uid() then 'envoyee'
        when a.statut = 'en_attente' then 'recue'
      end as lien,
      coalesce(a.repondu_le, a.created_at) as depuis
    from public.amities a
    where auth.uid() in (a.demandeur, a.destinataire)
    union all
    select b.bloque, 'bloque', b.created_at
    from public.blocages b
    where b.bloqueur = auth.uid()
  ),
  rangees as (
    select p.*, l.lien, l.depuis as depuis_le,
           row_number() over (partition by l.lien order by l.depuis desc) as rang
    from liens l
    join public.profils p on p.user_id = l.autre
    where auth.uid() is not null
      and l.lien is not null
      and (l.lien <> 'recue' or not exists (select 1 from public.bannis x where x.user_id = p.user_id))
  )
  select
    r.user_id, r.lien, r.depuis_le,
    r.perso, r.classe, r.specialisation, r.niveau, r.roles, r.faction, r.region, r.ruleset::text, r.langue, r.style, r.guilde, r.bio,
    case when r.lien = 'ami' and r.visible then r.battletag else '' end,
    r.visible,
    case when r.lien = 'ami' and r.visible
         then date_bin('10 minutes', r.vu_le, timestamptz '2000-01-01') end
  from rangees r
  where r.rang <= case r.lien when 'ami' then 100 when 'recue' then 50 when 'envoyee' then 30 else 200 end
  order by case r.lien when 'recue' then 0 when 'ami' then 1 when 'envoyee' then 2 else 3 end, r.depuis_le desc;
$$;

revoke all on function public.lister_amis() from public, anon;
grant execute on function public.lister_amis() to authenticated;
