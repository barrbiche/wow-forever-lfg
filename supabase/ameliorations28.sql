-- ============================================================
-- Fiche du personnage, suite: icônes du jeu et place des talents dans leur arbre (affichage « comme en jeu »)
-- ============================================================
-- Remplace enregistrer_fiche pour garder aussi:
--   - l'icône de chaque pièce, arbre et talent (un nom comme « inv_helmet_01 »: minuscules, chiffres et soulignés
--     seulement, 64 caractères au plus);
--   - la place de chaque talent dans son arbre: rangée 1-9, colonne 1-4 et rangs max 1-5 (les trois ensemble ou aucun;
--     le rang appris ne dépasse pas le maximum).
-- Ce fichier REMPLACE ameliorations27.sql (il fait tout ce que le 27 faisait): si le 27 est déjà roulé, rouler celui-ci
-- quand même; sinon, celui-ci suffit. Se roule après ameliorations26.sql. Peut être relancé sans problème.

do $$
begin
  if to_regprocedure('public.enregistrer_fiche(jsonb, jsonb, jsonb)') is null then
    raise exception 'Roule ameliorations26 avant celui-ci.';
  end if;
end
$$;

create or replace function public.enregistrer_fiche(p_equipement jsonb, p_arbres jsonb, p_talents jsonb)
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
       or coalesce(e->>'enchant', '') !~ '^[0-9]{1,6}$'
       or coalesce(e->>'icone', '')   !~ '^[a-z0-9_]{0,64}$' then
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
      'qualite', (e->>'qualite')::int, 'enchant', (e->>'enchant')::int, 'nom', v_nom)
      || case when coalesce(e->>'icone', '') <> '' then jsonb_build_object('icone', e->>'icone') else '{}'::jsonb end);
  end loop;

  for e in select * from jsonb_array_elements(p_arbres)
  loop
    v_nom := btrim(regexp_replace(coalesce(e->>'nom', ''), '[[:cntrl:]<>]', '', 'g'));
    if jsonb_typeof(e) <> 'object' or coalesce(e->>'points', '') !~ '^[0-9]{1,2}$'
       or coalesce(e->>'icone', '') !~ '^[a-z0-9_]{0,64}$'
       or char_length(v_nom) not between 1 and 30 or (e->>'points')::int > 60 then
      raise exception 'arbre de talents invalide' using errcode = '22023';
    end if;
    v_ar := v_ar || jsonb_build_array(jsonb_build_object('nom', v_nom, 'points', (e->>'points')::int)
      || case when coalesce(e->>'icone', '') <> '' then jsonb_build_object('icone', e->>'icone') else '{}'::jsonb end);
  end loop;

  for e in select * from jsonb_array_elements(p_talents)
  loop
    v_nom := btrim(regexp_replace(coalesce(e->>'nom', ''), '[[:cntrl:]<>]', '', 'g'));
    if jsonb_typeof(e) <> 'object' or coalesce(e->>'rang', '') !~ '^[1-5]$' or coalesce(e->>'arbre', '') !~ '^[1-3]$'
       or coalesce(e->>'icone', '') !~ '^[a-z0-9_]{0,64}$'
       or char_length(v_nom) not between 1 and 40 then
      raise exception 'talent invalide' using errcode = '22023';
    end if;
    -- Place dans l'arbre: soit les trois champs (ligne, col, max), soit aucun.
    if (e ? 'ligne') or (e ? 'col') or (e ? 'max') then
      if coalesce(e->>'ligne', '') !~ '^[1-9]$' or coalesce(e->>'col', '') !~ '^[1-4]$' or coalesce(e->>'max', '') !~ '^[1-5]$'
         or (e->>'rang')::int > (e->>'max')::int then
        raise exception 'talent invalide' using errcode = '22023';
      end if;
    end if;
    v_ta := v_ta || jsonb_build_array(jsonb_build_object(
      'nom', v_nom, 'rang', (e->>'rang')::int, 'arbre', (e->>'arbre')::int)
      || case when coalesce(e->>'icone', '') <> '' then jsonb_build_object('icone', e->>'icone') else '{}'::jsonb end
      || case when e ? 'ligne' then jsonb_build_object('ligne', (e->>'ligne')::int, 'col', (e->>'col')::int, 'max', (e->>'max')::int) else '{}'::jsonb end);
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

revoke all on function public.enregistrer_fiche(jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.enregistrer_fiche(jsonb, jsonb, jsonb) to authenticated;
