-- Sixième mise à jour de la base: les amis (demandes d'amitié, liste d'amis, blocage).
-- À coller dans Supabase: SQL Editor > New query > Run.
-- À rouler APRÈS ameliorations5.sql (qui vient après ameliorations4.sql). On peut le rouler plus d'une fois
-- sans problème. Il ne touche ni aux annonces, ni aux guildes, ni aux profils déjà créés.
--
-- Comment ça marche:
--   - Une personne connectée, avec son profil, envoie une demande d'ami à un joueur visible dans la liste.
--     L'autre accepte, refuse ou bloque. Si les deux se demandent mutuellement, c'est accepté tout de suite.
--   - Ce que voit la personne qui reçoit la demande: le personnage (nom, classe, spécialisation, niveau, rôles, faction, région,
--     langue, style, guilde, petit mot). Jamais le BattleTag, jamais le contact des annonces, jamais de courriel.
--   - Être ami ne donne pas accès à plus d'information: la liste d'amis montre ce que la liste des joueurs montre
--     déjà pour un profil visible (BattleTag, heure de dernière visite). Un ami qui cache son profil reste dans la
--     liste, sans BattleTag ni « en ligne ».
--   - Refuser n'avertit personne. Après un refus, la personne ne peut pas redemander avant 30 jours.
--     Bloquer retire l'amitié ou la demande et empêche l'autre d'en envoyer: sa demande a l'air d'être envoyée,
--     mais rien n'arrive.
--   - Limites: 10 nouvelles demandes par 24 heures, 30 demandes en attente, 100 amis, 200 blocages.
--   - Les comptes suspendus (ameliorations5.sql) ne peuvent pas envoyer de demande, et leurs demandes ne
--     s'affichent pas.
--   - Supprimer son profil (ou son compte) efface ses amitiés, ses demandes et ses blocages.
--   - Les tables ne sont pas lisibles directement: tout passe par lister_amis() et agir_ami().

-- Verrou: ce fichier a besoin de la table « bannis » créée par ameliorations5.sql.
do $$
begin
  if to_regclass('public.bannis') is null or to_regclass('public.profils') is null then
    raise exception 'Roule ameliorations4.sql puis ameliorations5.sql avant celui-ci.';
  end if;
end
$$;

-- ============================================================
-- 1. Tables
-- ============================================================
create table if not exists public.amities (
  demandeur    uuid not null references public.profils (user_id) on delete cascade,
  destinataire uuid not null references public.profils (user_id) on delete cascade,
  statut       text not null default 'en_attente' check (statut in ('en_attente', 'acceptee', 'refusee')),
  created_at   timestamptz not null default now(),
  repondu_le   timestamptz,
  primary key (demandeur, destinataire),
  check (demandeur <> destinataire)
);

-- Une seule ligne par paire de joueurs, peu importe qui a demandé.
create unique index if not exists amities_paire_idx
  on public.amities (least(demandeur, destinataire), greatest(demandeur, destinataire));
create index if not exists amities_destinataire_idx on public.amities (destinataire);

create table if not exists public.blocages (
  bloqueur   uuid not null references public.profils (user_id) on delete cascade,
  bloque     uuid not null references public.profils (user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (bloqueur, bloque),
  check (bloqueur <> bloque)
);

create index if not exists blocages_bloque_idx on public.blocages (bloque);

alter table public.amities enable row level security;
alter table public.blocages enable row level security;
revoke all on public.amities from anon, authenticated;
revoke all on public.blocages from anon, authenticated;

-- ============================================================
-- 2. La liste: amis, demandes reçues, demandes envoyées, personnes bloquées
-- ============================================================
-- « lien » vaut 'ami', 'recue', 'envoyee' ou 'bloque'. Le BattleTag et l'heure de visite ne sont donnés que pour
-- un ami dont le profil est visible (comme dans lister_joueurs). Les demandes refusées n'apparaissent pas (ni chez l'un, ni chez l'autre).
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
    r.perso, r.classe, r.specialisation, r.niveau, r.roles, r.faction, r.region, r.langue, r.style, r.guilde, r.bio,
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

-- ============================================================
-- 3. Agir sur une relation
-- ============================================================
-- p_action: 'demander', 'accepter', 'refuser', 'annuler' (retirer sa demande), 'retirer' (un ami),
-- 'bloquer', 'debloquer'. Retourne le nouveau lien: 'aucun', 'envoyee', 'ami' ou 'bloque'.
create or replace function public.agir_ami(p_user uuid, p_action text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  moi   uuid := auth.uid();
  ligne public.amities%rowtype;
begin
  if moi is null then
    raise exception 'connexion requise' using errcode = '28000';
  end if;
  if p_user is null or p_user = moi then
    raise exception 'joueur invalide' using errcode = '22023';
  end if;
  if p_action is null or p_action not in ('demander', 'accepter', 'refuser', 'annuler', 'retirer', 'bloquer', 'debloquer') then
    raise exception 'action inconnue' using errcode = '22023';
  end if;
  if not exists (select 1 from public.profils where user_id = moi) then
    raise exception 'crée ton profil avant d''ajouter des amis' using errcode = '22023';
  end if;

  -- Une seule action à la fois pour une même paire de joueurs.
  perform pg_advisory_xact_lock(hashtextextended(least(moi, p_user)::text || greatest(moi, p_user)::text, 0));

  if p_action = 'demander' then
    if exists (select 1 from public.bannis where user_id = moi) then
      raise exception 'compte suspendu' using errcode = '42501';
    end if;
    if not exists (select 1 from public.profils where user_id = p_user and visible) then
      raise exception 'joueur introuvable' using errcode = 'P0002';
    end if;
    if exists (select 1 from public.blocages where bloqueur = moi and bloque = p_user) then
      raise exception 'tu as bloqué cette personne, débloque-la d''abord' using errcode = '22023';
    end if;

    select * into ligne from public.amities
      where (demandeur = moi and destinataire = p_user) or (demandeur = p_user and destinataire = moi);
    if found then
      if ligne.statut = 'acceptee' then
        return 'ami';
      elsif ligne.demandeur = moi then
        if ligne.statut = 'en_attente' then
          return 'envoyee';
        end if;
        if ligne.repondu_le > now() - interval '30 days' then
          raise exception 'tu as déjà envoyé une demande à cette personne récemment' using errcode = '54000';
        end if;
        delete from public.amities where demandeur = moi and destinataire = p_user;
      elsif ligne.statut = 'en_attente' then
        -- L'autre voulait déjà être ami avec moi: c'est accepté.
        if (select count(*) from public.amities where statut = 'acceptee' and (demandeur = moi or destinataire = moi)) >= 100
           or (select count(*) from public.amities where statut = 'acceptee' and (demandeur = p_user or destinataire = p_user)) >= 100 then
          raise exception 'liste d''amis pleine' using errcode = '54000';
        end if;
        update public.amities set statut = 'acceptee', repondu_le = now()
          where demandeur = p_user and destinataire = moi;
        return 'ami';
      else
        -- J'avais refusé sa demande et je change d'idée.
        delete from public.amities where demandeur = p_user and destinataire = moi;
      end if;
    end if;

    -- Si l'autre m'a bloqué, la demande a l'air d'être envoyée, mais rien n'est enregistré.
    if exists (select 1 from public.blocages where bloqueur = p_user and bloque = moi) then
      return 'envoyee';
    end if;

    if (select count(*) from public.amities
        where demandeur = moi and created_at > now() - interval '24 hours') >= 10 then
      raise exception 'trop de demandes aujourd''hui' using errcode = '54000';
    end if;
    if (select count(*) from public.amities where demandeur = moi and statut = 'en_attente') >= 30 then
      raise exception 'trop de demandes en attente' using errcode = '54000';
    end if;
    if (select count(*) from public.amities where statut = 'acceptee' and (demandeur = moi or destinataire = moi)) >= 100 then
      raise exception 'liste d''amis pleine' using errcode = '54000';
    end if;

    insert into public.amities (demandeur, destinataire) values (moi, p_user);
    return 'envoyee';

  elsif p_action = 'accepter' then
    if not exists (select 1 from public.amities
                   where demandeur = p_user and destinataire = moi and statut = 'en_attente') then
      raise exception 'demande introuvable' using errcode = 'P0002';
    end if;
    if (select count(*) from public.amities where statut = 'acceptee' and (demandeur = moi or destinataire = moi)) >= 100
       or (select count(*) from public.amities where statut = 'acceptee' and (demandeur = p_user or destinataire = p_user)) >= 100 then
      raise exception 'liste d''amis pleine' using errcode = '54000';
    end if;
    update public.amities set statut = 'acceptee', repondu_le = now()
      where demandeur = p_user and destinataire = moi;
    return 'ami';

  elsif p_action = 'refuser' then
    update public.amities set statut = 'refusee', repondu_le = now()
      where demandeur = p_user and destinataire = moi and statut = 'en_attente';
    return 'aucun';

  elsif p_action = 'annuler' then
    delete from public.amities where demandeur = moi and destinataire = p_user and statut = 'en_attente';
    return 'aucun';

  elsif p_action = 'retirer' then
    delete from public.amities
      where statut = 'acceptee'
        and ((demandeur = moi and destinataire = p_user) or (demandeur = p_user and destinataire = moi));
    return 'aucun';

  elsif p_action = 'bloquer' then
    if not exists (select 1 from public.profils where user_id = p_user) then
      raise exception 'joueur introuvable' using errcode = 'P0002';
    end if;
    if not exists (select 1 from public.blocages where bloqueur = moi and bloque = p_user)
       and (select count(*) from public.blocages where bloqueur = moi) >= 200 then
      raise exception 'liste de blocage pleine' using errcode = '54000';
    end if;
    delete from public.amities
      where (demandeur = moi and destinataire = p_user) or (demandeur = p_user and destinataire = moi);
    insert into public.blocages (bloqueur, bloque) values (moi, p_user) on conflict do nothing;
    return 'bloque';

  else -- debloquer
    delete from public.blocages where bloqueur = moi and bloque = p_user;
    return 'aucun';
  end if;
end;
$$;

revoke all on function public.agir_ami(uuid, text) from public, anon;
grant execute on function public.agir_ami(uuid, text) to authenticated;
