-- ============================================================
-- Une annonce se publie avec l'un de ses personnages
-- ============================================================
-- Quand tu as un profil, l'annonce doit avoir la faction, la région et le type de serveur de l'un de tes personnages
-- (le principal ou l'un des 2 autres). Le site le fait déjà tout seul; ceci empêche de contourner la règle.
-- Seule ta propre publication est vérifiée: les annonces qui se répètent (générées pour toi) ne sont pas touchées.
-- Se roule après ameliorations19.sql. Peut être relancé sans problème.

do $$
begin
  if to_regprocedure('public.persos_de(uuid)') is null then
    raise exception 'Roule ameliorations19.sql avant celui-ci.';
  end if;
end
$$;

create or replace function public.annonce_selon_mes_persos()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or auth.uid() <> new.user_id then
    return new;
  end if;
  if exists (select 1 from public.persos_de(new.user_id))
     and not exists (
       select 1 from public.persos_de(new.user_id) p
       where p.faction = new.faction and p.region = new.region and p.ruleset = new.ruleset
     ) then
    raise exception 'aucun de tes personnages ne correspond à cette annonce' using errcode = '22023';
  end if;
  return new;
end;
$$;

drop trigger if exists annonce_selon_persos on public.annonces;
create trigger annonce_selon_persos
  before insert on public.annonces
  for each row execute function public.annonce_selon_mes_persos();
