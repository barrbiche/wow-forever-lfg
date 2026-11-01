-- ============================================================
-- Pouces vers le bas: les reproches (Rageux, Leave ninja, Need sur tout, Irrespectueux)
-- ============================================================
-- Règles:
--   - Seulement entre gens qui ont fait un groupe ensemble: celui qui donne le reproche est le chef ou un joueur
--     accepté du groupe (tant que le chat existe, jusqu'à 24 h après la fin); celui qui le reçoit est le chef, un
--     joueur accepté ou un joueur qui a quitté ce groupe (le « leave ninja »).
--   - Une personne ne donne qu'une fois chaque catégorie à un joueur (elle peut les changer ou les retirer).
--   - Un reproche ne devient visible qu'à partir de 4 personnes différentes pour la même catégorie.
--   - 10 nouveaux reproches par 24 heures au maximum.
--   - Qui a donné quoi n'est jamais montré, même à toi.
-- Se roule après ameliorations8.sql (groupes) et ameliorations4.sql (profils). Peut être relancé sans problème.

do $$
begin
  if to_regclass('public.profils') is null or to_regclass('public.groupes') is null or to_regclass('public.demandes') is null then
    raise exception 'Roule ameliorations4.sql et ameliorations8.sql avant celui-ci.';
  end if;
end
$$;

create table if not exists public.reproches (
  id         uuid primary key default gen_random_uuid(),
  de         uuid not null references auth.users (id) on delete cascade,
  pour       uuid not null references public.profils (user_id) on delete cascade,
  categorie  text not null check (categorie in ('rageux', 'leaver', 'need_tout', 'irrespectueux')),
  created_at timestamptz not null default now(),
  check (de <> pour),
  unique (de, pour, categorie)
);

create index if not exists reproches_pour_idx on public.reproches (pour, categorie);

alter table public.reproches enable row level security;
revoke all on public.reproches from anon, authenticated;

-- Les membres d'un groupe à qui on peut donner un pouce ou un reproche: le chef, les joueurs acceptés et ceux qui ont quitté.
drop function if exists public.membres_groupe_reproches(uuid);

create function public.membres_groupe_reproches(p_groupe uuid)
returns table (user_id uuid, perso text, classe text, specialisation text, niveau int, a_quitte boolean, mes_reproches text[])
language sql
stable
security definer
set search_path = public
as $$
  select t.user_id, t.perso, t.classe, t.specialisation, t.niveau, t.a_quitte,
         coalesce((select array_agg(r.categorie order by r.categorie) from public.reproches r
                   where r.de = auth.uid() and r.pour = t.user_id), '{}'::text[])
  from (
    select g.chef as user_id, coalesce(p.perso, nullif(g.perso, ''), '?')::text as perso, p.classe::text as classe,
           p.specialisation::text as specialisation, p.niveau, false as a_quitte, true as est_chef
    from public.groupes g
    left join public.profils p on p.user_id = g.chef
    where g.id = p_groupe
    union all
    select d.de, p.perso::text, p.classe::text, p.specialisation::text, p.niveau, d.statut = 'quitte', false
    from public.demandes d
    join public.profils p on p.user_id = d.de
    where d.groupe_id = p_groupe and d.statut in ('acceptee', 'quitte')
  ) t
  where public.chat_est_membre(p_groupe, auth.uid())
    and t.user_id <> auth.uid()
  order by t.est_chef desc, t.perso
  limit 60;
$$;

-- Les reproches visibles (4 personnes différentes ou plus pour la même catégorie).
drop function if exists public.reproches_visibles();

create function public.reproches_visibles()
returns table (pour uuid, categorie text, n int)
language sql
stable
security definer
set search_path = public
as $$
  select r.pour, r.categorie::text, count(distinct r.de)::int
  from public.reproches r
  where auth.uid() is not null
  group by r.pour, r.categorie
  having count(distinct r.de) >= 4;
$$;

-- Ce que j'ai donné moi-même (pour que mon écran montre mes choix).
drop function if exists public.mes_reproches();

create function public.mes_reproches()
returns table (pour uuid, categories text[])
language sql
stable
security definer
set search_path = public
as $$
  select r.pour, array_agg(r.categorie::text order by r.categorie)
  from public.reproches r
  where r.de = auth.uid()
  group by r.pour;
$$;

-- Donner, changer ou retirer ses reproches à un joueur de son groupe. p_categories remplace ce que tu avais donné.
create or replace function public.reprocher(p_groupe uuid, p_pour uuid, p_categories text[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  cats text[] := coalesce(p_categories, '{}');
  nouveaux int;
begin
  if auth.uid() is null then
    raise exception 'connexion requise' using errcode = '28000';
  end if;
  if p_pour = auth.uid() then
    raise exception 'on ne se reproche rien à soi-même' using errcode = '22023';
  end if;
  if not (cats <@ array['rageux', 'leaver', 'need_tout', 'irrespectueux']::text[]) then
    raise exception 'catégorie inconnue' using errcode = '22023';
  end if;
  if not exists (select 1 from public.profils where user_id = auth.uid()) then
    raise exception 'crée ton profil d''abord' using errcode = '22023';
  end if;
  if not public.chat_est_membre(p_groupe, auth.uid()) then
    raise exception 'groupe introuvable' using errcode = 'P0002';
  end if;
  if not exists (
    select 1 from public.groupes g
    where g.id = p_groupe
      and (g.chef = p_pour
           or exists (select 1 from public.demandes d
                      where d.groupe_id = g.id and d.de = p_pour and d.statut in ('acceptee', 'quitte')))
  ) then
    raise exception 'cette personne n''était pas dans ton groupe' using errcode = 'P0002';
  end if;

  select count(*) into nouveaux
  from unnest(cats) c
  where not exists (select 1 from public.reproches where de = auth.uid() and pour = p_pour and categorie = c);
  if nouveaux > 0 and (select count(*) from public.reproches
                       where de = auth.uid() and created_at > now() - interval '24 hours') + nouveaux > 10 then
    raise exception 'trop de reproches aujourd''hui' using errcode = '54000';
  end if;

  delete from public.reproches where de = auth.uid() and pour = p_pour and not (categorie = any (cats));
  insert into public.reproches (de, pour, categorie)
  select auth.uid(), p_pour, c from unnest(cats) c
  on conflict (de, pour, categorie) do nothing;
end;
$$;

revoke all on function public.membres_groupe_reproches(uuid) from public, anon;
revoke all on function public.reproches_visibles() from public, anon;
revoke all on function public.mes_reproches() from public, anon;
revoke all on function public.reprocher(uuid, uuid, text[]) from public, anon;
grant execute on function public.membres_groupe_reproches(uuid) to authenticated;
grant execute on function public.reproches_visibles() to authenticated;
grant execute on function public.mes_reproches() to authenticated;
grant execute on function public.reprocher(uuid, uuid, text[]) to authenticated;
