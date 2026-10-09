-- À coller dans Supabase: SQL Editor > New query > Run.

create table public.annonces (
  id          uuid primary key default gen_random_uuid(),
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

alter table public.annonces enable row level security;

-- Tout le monde peut lire les annonces encore actives.
create policy "lecture des annonces actives" on public.annonces
  for select using (expires_at > now());

-- Tout le monde peut publier, mais une annonce dure 7 heures maximum.
create policy "publication" on public.annonces
  for insert with check (expires_at > now() and expires_at <= now() + interval '7 hours');

-- Pas de policy update/delete: personne ne peut modifier ni effacer depuis le site.
