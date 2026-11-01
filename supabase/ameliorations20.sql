-- ============================================================
-- Les alertes suivent mes personnages
-- ============================================================
-- Une alerte ne te prévient plus (site fermé) que pour les groupes que l'un de tes personnages peut rejoindre
-- (même faction, même région, même type de serveur), à moins que tu aies demandé « Voir aussi les groupes que je ne
-- peux pas rejoindre » dans les filtres. Sans personnage dans ton profil, rien ne change.
-- Se roule après ameliorations16.sql et ameliorations19.sql. Peut être relancé sans problème.

do $$
begin
  if to_regprocedure('public.persos_de(uuid)') is null or to_regclass('public.alertes_annonces') is null then
    raise exception 'Roule ameliorations16.sql et ameliorations19.sql avant celui-ci.';
  end if;
end
$$;

create or replace function public.enregistrer_alerte_annonces(p_filtres jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  moi uuid := auth.uid();
  propre jsonb := '{}'::jsonb;
  cle text;
  valeur text;
begin
  if moi is null then
    raise exception 'connexion requise' using errcode = '28000';
  end if;
  if exists (select 1 from public.bannis where user_id = moi) then
    raise exception 'compte suspendu' using errcode = '42501';
  end if;
  if p_filtres is null or jsonb_typeof(p_filtres) <> 'object' then
    raise exception 'filtres invalides' using errcode = '22023';
  end if;
  foreach cle in array array['activite', 'faction', 'region', 'role', 'niveau', 'style', 'langue', 'genre'] loop
    valeur := coalesce(p_filtres ->> cle, '');
    if valeur !~ '^[A-Za-z0-9_-]{0,20}$' then
      raise exception 'filtre invalide: %', cle using errcode = '22023';
    end if;
    if cle = 'niveau' and valeur <> '' and (valeur !~ '^[0-9]{1,2}$' or valeur::int not between 1 and 60) then
      raise exception 'niveau invalide' using errcode = '22023';
    end if;
    propre := propre || jsonb_build_object(cle, valeur);
  end loop;
  propre := propre || jsonb_build_object('planifies', coalesce(p_filtres ->> 'planifies', 'false') = 'true');
  propre := propre || jsonb_build_object('tousLesGroupes', coalesce(p_filtres ->> 'tousLesGroupes', 'false') = 'true');
  insert into public.alertes_annonces (user_id, filtres, updated_at) values (moi, propre, now())
  on conflict (user_id) do update set filtres = excluded.filtres, updated_at = now();
end;
$$;

create or replace function public.push_nouvelle_annonce()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  dest   uuid[];
  genre  text := coalesce(new.genre, 'groupe');
  roles  text;
  niveaux text;
  texte  text;
begin
  if new.expires_at <= now() then
    return new;
  end if;

  select coalesce(array_agg(t.user_id), '{}') into dest
  from (
    select a.user_id
    from public.alertes_annonces a
    where a.user_id <> new.user_id
      and exists (select 1 from public.push_abonnements s where s.user_id = a.user_id)
      and not exists (select 1 from public.bannis b where b.user_id = a.user_id)
      and coalesce(a.filtres ->> 'activite', 'tout') in ('', 'tout', new.activite)
      and coalesce(nullif(a.filtres ->> 'genre', ''), genre) = genre
      and (coalesce(a.filtres ->> 'planifies', 'false') <> 'true' or new.debut is not null)
      and coalesce(nullif(a.filtres ->> 'faction', ''), new.faction) = new.faction
      and coalesce(nullif(a.filtres ->> 'region', ''), new.region) = new.region
      and (
        coalesce(a.filtres ->> 'tousLesGroupes', 'false') = 'true'
        or not exists (select 1 from public.persos_de(a.user_id))
        or exists (
          select 1 from public.persos_de(a.user_id) pp
          where pp.faction = new.faction and pp.region = new.region and pp.ruleset = new.ruleset
        )
      )
      and (coalesce(a.filtres ->> 'style', '') = '' or a.filtres ->> 'style' = new.style)
      and (coalesce(a.filtres ->> 'langue', '') = '' or a.filtres ->> 'langue' = new.langue)
      and (coalesce(a.filtres ->> 'role', '') = '' or new.roles @> array[a.filtres ->> 'role'])
      and (
        coalesce(a.filtres ->> 'niveau', '') = ''
        or case
             when genre = 'joueur' then abs((a.filtres ->> 'niveau')::int - new.niveau_min) <= 3
             else (a.filtres ->> 'niveau')::int between new.niveau_min and new.niveau_max
           end
      )
    limit 500
  ) t;

  if cardinality(dest) = 0 then
    return new;
  end if;

  select string_agg(case r when 'tank' then 'Tank' when 'heal' then 'Heal' when 'dps' then 'DPS' else r end, ', ')
    into roles from unnest(new.roles) as r;
  niveaux := case when new.niveau_min = new.niveau_max then 'niveau ' || new.niveau_min
                  else 'niveaux ' || new.niveau_min || '–' || new.niveau_max end;
  texte := concat_ws(' · ',
    case new.activite when 'donjon' then 'Donjon' when 'raid' then 'Raid' when 'pvp' then 'PvP' when 'quete' then 'Quêtes' else 'Groupe' end
      || ': ' || new.cible,
    niveaux,
    case when roles is null then null when genre = 'joueur' then 'joue ' || roles else 'cherche ' || roles end,
    case when new.perso <> '' then '(' || new.perso || ')' end);

  perform public.notifier_push_lien(
    dest, 'n', 'Nouvelle annonce ' || case new.faction when 'alliance' then 'Alliance' when 'horde' then 'Horde' else '' end,
    texte, '/?annonce=' || new.id::text, 3);
  return new;
exception when others then
  return new; -- jamais au prix d'une annonce refusée
end;
$$;

drop trigger if exists annonce_push on public.annonces;
create trigger annonce_push
  after insert on public.annonces
  for each row execute function public.push_nouvelle_annonce();
