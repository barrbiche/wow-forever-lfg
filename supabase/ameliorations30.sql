-- ============================================================
-- Fiche du personnage, suite: race et sexe (portrait au centre de la fiche)
-- ============================================================
-- Ajoute une colonne « apparence » (ex. « NightElf:3 » = elfe de la nuit, femme; 2 = homme, 3 = femme), une petite
-- fonction pour l'enregistrer et fait renvoyer la valeur par fiche_de. Ne touche pas à enregistrer_fiche (le 29 reste valide).
-- Après ameliorations26.sql. Peut être relancé sans problème.

do $$
begin
  if to_regprocedure('public.fiche_de(uuid)') is null then
    raise exception 'Roule ameliorations26 avant celui-ci.';
  end if;
end
$$;

alter table public.fiches_perso add column if not exists apparence text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fiches_perso_apparence_forme') then
    alter table public.fiches_perso
      add constraint fiches_perso_apparence_forme check (apparence is null or apparence ~ '^[A-Za-z]{2,20}:[23]$');
  end if;
end
$$;

drop function if exists public.enregistrer_apparence(text);

create function public.enregistrer_apparence(p_apparence text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'connexion requise' using errcode = '28000';
  end if;
  if p_apparence is null or p_apparence !~ '^[A-Za-z]{2,20}:[23]$' then
    raise exception 'apparence invalide' using errcode = '22023';
  end if;
  update public.fiches_perso set apparence = p_apparence where user_id = auth.uid();
end;
$$;

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
         || case when f.apparence is not null then jsonb_build_object('apparence', f.apparence) else '{}'::jsonb end
  from public.fiches_perso f
  join public.profils p on p.user_id = f.user_id
  where auth.uid() is not null
    and f.user_id = p_user
    and (p.visible or p.user_id = auth.uid());
$$;

revoke all on function public.enregistrer_apparence(text) from public, anon;
revoke all on function public.fiche_de(uuid) from public, anon;
grant execute on function public.enregistrer_apparence(text) to authenticated;
grant execute on function public.fiche_de(uuid) to authenticated;
