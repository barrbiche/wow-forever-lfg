-- Onzième mise à jour de la base: la boîte à messages « Bogue ou idée » (le formulaire du site).
-- À coller dans Supabase: SQL Editor > New query > Run. On peut la rouler plus d'une fois sans problème.
-- Elle ne touche à aucune autre table.
--
-- Pour lire les messages: Table Editor > retours. Les plus récents en premier (clique sur « created_at »).
-- Pour marquer un message comme réglé, mets la colonne « regle » à true (ou supprime la ligne).
-- Seules les personnes connectées peuvent écrire (10 messages par jour au maximum). Personne d'autre que toi
-- ne peut lire la table: le site n'a aucun moyen de la lire.

create table if not exists public.retours (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users (id) on delete set null,
  perso      text,
  categorie  text not null check (categorie in ('bogue', 'idee', 'autre')),
  texte      text not null check (char_length(texte) between 1 and 1000),
  navigateur text,
  regle      boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists retours_recents_idx on public.retours (created_at desc);

alter table public.retours enable row level security;
revoke all on public.retours from anon, authenticated;

create or replace function public.envoyer_retour(p_categorie text, p_texte text, p_navigateur text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  t text := btrim(coalesce(p_texte, ''));
begin
  if auth.uid() is null then
    raise exception 'connexion requise' using errcode = '28000';
  end if;
  if p_categorie not in ('bogue', 'idee', 'autre') then
    raise exception 'catégorie inconnue' using errcode = '22023';
  end if;
  if char_length(t) < 1 or char_length(t) > 1000 then
    raise exception 'message trop court ou trop long' using errcode = '22023';
  end if;
  if (select count(*) from public.retours
      where user_id = auth.uid() and created_at > now() - interval '24 hours') >= 10 then
    raise exception 'trop de messages aujourd''hui' using errcode = '54000';
  end if;
  insert into public.retours (user_id, perso, categorie, texte, navigateur)
  values (
    auth.uid(),
    (select perso from public.profils where user_id = auth.uid()),
    p_categorie,
    t,
    left(p_navigateur, 200)
  );
end;
$$;

revoke all on function public.envoyer_retour(text, text, text) from public, anon;
grant execute on function public.envoyer_retour(text, text, text) to authenticated;
