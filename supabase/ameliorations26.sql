-- ============================================================
-- Fiche du personnage: équipement, arbres de talents et talents, importés depuis l'addon Babillard Forever FR
-- ============================================================
-- Dans le jeu, /bf perso puis « Copier mon code »; sur le site, « Mon profil » > « Remplir avec mon personnage du
-- jeu ». Le code contient maintenant l'équipement porté et les talents. Cette fiche se garde avec le profil.
--
-- Qui voit quoi:
--   - Les visiteurs non connectés ne voient rien.
--   - Les gens connectés voient la fiche d'un joueur dont le profil est visible (comme le reste du profil).
--   - Un joueur qui cache son profil cache aussi sa fiche; la sienne, il la voit toujours.
--   - La fiche vient d'un texte copié par le joueur: ce n'est PAS une preuve (n'importe qui peut en écrire une à la
--     main). Le site l'indique à côté de la fiche. La base vérifie seulement le format et les tailles.
-- Tout passe par des fonctions: la table ne se lit pas directement.
-- Se roule après ameliorations4.sql. Peut être relancé sans problème.

do $$
begin
  if to_regclass('public.profils') is null then
    raise exception 'Roule ameliorations4 (et les suivants) avant celui-ci.';
  end if;
end
$$;

-- ------------------------------------------------------------
-- 1. La table (une fiche par joueur, celle de son personnage principal)
-- ------------------------------------------------------------
create table if not exists public.fiches_perso (
  user_id    uuid primary key references public.profils (user_id) on delete cascade,
  perso      text  not null check (char_length(perso) between 1 and 24),
  maj        timestamptz not null default now(),
  equipement jsonb not null default '[]'::jsonb
             check (jsonb_typeof(equipement) = 'array' and jsonb_array_length(equipement) <= 17),
  arbres     jsonb not null default '[]'::jsonb
             check (jsonb_typeof(arbres) = 'array' and jsonb_array_length(arbres) <= 3),
  talents    jsonb not null default '[]'::jsonb
             check (jsonb_typeof(talents) = 'array' and jsonb_array_length(talents) <= 70)
);

alter table public.fiches_perso enable row level security;
revoke all on public.fiches_perso from anon, authenticated;

-- ------------------------------------------------------------
-- 2. Enregistrer ma fiche (remplace l'ancienne)
-- ------------------------------------------------------------
-- Chaque élément est revérifié ici (le site l'a déjà fait, mais la base ne lui fait pas confiance): nombres dans
-- leurs limites, noms courts, aucune autre clé gardée. Une donnée invalide fait échouer l'enregistrement en entier.
drop function if exists public.enregistrer_fiche(jsonb, jsonb, jsonb);

create function public.enregistrer_fiche(p_equipement jsonb, p_arbres jsonb, p_talents jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  moi uuid := auth.uid();
  v_perso text;
  e jsonb;
  v_eq jsonb := '[]'::jsonb;
  v_ar jsonb := '[]'::jsonb;
  v_ta jsonb := '[]'::jsonb;
  v_nom text;
  vus int[] := '{}';
  v_slot int;
begin
  if moi is null then
    raise exception 'connexion requise' using errcode = '28000';
  end if;
  select p.perso into v_perso from public.profils p where p.user_id = moi;
  if v_perso is null then
    raise exception 'crée ton profil d''abord' using errcode = '22023';
  end if;

  p_equipement := coalesce(p_equipement, '[]'::jsonb);
  p_arbres := coalesce(p_arbres, '[]'::jsonb);
  p_talents := coalesce(p_talents, '[]'::jsonb);
  if jsonb_typeof(p_equipement) <> 'array' or jsonb_typeof(p_arbres) <> 'array' or jsonb_typeof(p_talents) <> 'array'
     or jsonb_array_length(p_equipement) > 17 or jsonb_array_length(p_arbres) > 3 or jsonb_array_length(p_talents) > 70 then
    raise exception 'fiche trop grande ou mal formée' using errcode = '22023';
  end if;

  for e in select * from jsonb_array_elements(p_equipement)
  loop
    if jsonb_typeof(e) <> 'object'
       or coalesce(e->>'slot', '')    !~ '^[0-9]{1,2}$'
       or coalesce(e->>'id', '')      !~ '^[0-9]{1,7}$'
       or coalesce(e->>'ilvl', '')    !~ '^[0-9]{1,4}$'
       or coalesce(e->>'qualite', '') !~ '^[0-9]$'
       or coalesce(e->>'enchant', '') !~ '^[0-9]{1,6}$' then
      raise exception 'pièce d''équipement invalide' using errcode = '22023';
    end if;
    v_slot := (e->>'slot')::int;
    v_nom := btrim(regexp_replace(coalesce(e->>'nom', ''), '[[:cntrl:]<>]', '', 'g'));
    if v_slot not between 1 and 19 or (e->>'ilvl')::int > 1000 or (e->>'qualite')::int > 6
       or char_length(v_nom) not between 1 and 60 or v_slot = any (vus) then
      raise exception 'pièce d''équipement invalide' using errcode = '22023';
    end if;
    vus := vus || v_slot;
    v_eq := v_eq || jsonb_build_array(jsonb_build_object(
      'slot', v_slot, 'id', (e->>'id')::int, 'ilvl', (e->>'ilvl')::int,
      'qualite', (e->>'qualite')::int, 'enchant', (e->>'enchant')::int, 'nom', v_nom));
  end loop;

  for e in select * from jsonb_array_elements(p_arbres)
  loop
    v_nom := btrim(regexp_replace(coalesce(e->>'nom', ''), '[[:cntrl:]<>]', '', 'g'));
    if jsonb_typeof(e) <> 'object' or coalesce(e->>'points', '') !~ '^[0-9]{1,2}$'
       or char_length(v_nom) not between 1 and 30 or (e->>'points')::int > 60 then
      raise exception 'arbre de talents invalide' using errcode = '22023';
    end if;
    v_ar := v_ar || jsonb_build_array(jsonb_build_object('nom', v_nom, 'points', (e->>'points')::int));
  end loop;

  for e in select * from jsonb_array_elements(p_talents)
  loop
    v_nom := btrim(regexp_replace(coalesce(e->>'nom', ''), '[[:cntrl:]<>]', '', 'g'));
    if jsonb_typeof(e) <> 'object' or coalesce(e->>'rang', '') !~ '^[1-5]$' or coalesce(e->>'arbre', '') !~ '^[1-3]$'
       or char_length(v_nom) not between 1 and 40 then
      raise exception 'talent invalide' using errcode = '22023';
    end if;
    v_ta := v_ta || jsonb_build_array(jsonb_build_object(
      'nom', v_nom, 'rang', (e->>'rang')::int, 'arbre', (e->>'arbre')::int));
  end loop;

  if jsonb_array_length(v_eq) = 0 and jsonb_array_length(v_ar) = 0 then
    raise exception 'fiche vide' using errcode = '22023';
  end if;

  insert into public.fiches_perso (user_id, perso, maj, equipement, arbres, talents)
  values (moi, v_perso, now(), v_eq, v_ar, v_ta)
  on conflict (user_id) do update
    set perso = excluded.perso, maj = excluded.maj,
        equipement = excluded.equipement, arbres = excluded.arbres, talents = excluded.talents;
end;
$$;

-- ------------------------------------------------------------
-- 3. Lire la fiche d'un joueur (connecté seulement; profil visible, ou le mien)
-- ------------------------------------------------------------
drop function if exists public.fiche_de(uuid);

create function public.fiche_de(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
           'perso', f.perso, 'maj', f.maj,
           'equipement', f.equipement, 'arbres', f.arbres, 'talents', f.talents)
  from public.fiches_perso f
  join public.profils p on p.user_id = f.user_id
  where auth.uid() is not null
    and f.user_id = p_user
    and (p.visible or p.user_id = auth.uid());
$$;

-- ------------------------------------------------------------
-- 4. Effacer ma fiche
-- ------------------------------------------------------------
drop function if exists public.effacer_fiche();

create function public.effacer_fiche()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'connexion requise' using errcode = '28000';
  end if;
  delete from public.fiches_perso where user_id = auth.uid();
end;
$$;

revoke all on function public.enregistrer_fiche(jsonb, jsonb, jsonb) from public, anon;
revoke all on function public.fiche_de(uuid) from public, anon;
revoke all on function public.effacer_fiche() from public, anon;
grant execute on function public.enregistrer_fiche(jsonb, jsonb, jsonb) to authenticated;
grant execute on function public.fiche_de(uuid) to authenticated;
grant execute on function public.effacer_fiche() to authenticated;
