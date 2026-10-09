-- À coller dans Supabase: SQL Editor > New query > Run.

create table public.annonces (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  activite    text not null check (activite in ('donjon', 'pvp')),
  cible       text not null check (char_length(cible) between 1 and 60),
  faction     text not null check (faction in ('alliance', 'horde')),
  ruleset     text not null check (ruleset in ('normal', 'pvp', 'rp')),
  region      text not null check (region in ('US', 'EU')),
  niveau_min  int  not null check (niveau_min between 1 and 60),
  niveau_max  int  not null check (niveau_max between 1 and 60 and niveau_max >= niveau_min),
  roles       text[] not null default '{}',
  perso       text not null check (char_length(perso) between 1 and 24),
  contact     text not null check (char_length(contact) between 1 and 48),
  note        text not null default '' check (char_length(note) <= 160)
);

create index annonces_expires_idx on public.annonces (expires_at desc);
create index annonces_user_idx on public.annonces (user_id);

alter table public.annonces enable row level security;

-- Tout le monde (même sans compte) peut lire les annonces encore actives.
create policy "lecture des annonces actives" on public.annonces
  for select using (expires_at > now());

-- Il faut être connecté pour publier. Une annonce dure 7 heures maximum,
-- et chaque joueur a au plus 5 annonces actives à la fois.
create policy "publication" on public.annonces
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and expires_at > now()
    and expires_at <= now() + interval '7 hours'
    and (
      select count(*) from public.annonces a
      where a.user_id = auth.uid() and a.expires_at > now()
    ) < 5
  );

-- Chacun peut retirer ses propres annonces.
create policy "retrait de ses annonces" on public.annonces
  for delete to authenticated
  using (user_id = auth.uid());

-- Chacun peut modifier la liste des rôles de ses annonces (« Tank trouvé »), rien d'autre.
create policy "modification des rôles" on public.annonces
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

revoke update on public.annonces from anon, authenticated;
grant update (roles) on public.annonces to authenticated;
