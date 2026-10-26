-- Douzième mise à jour de la base: « La Taverne », le salon de discussion ouvert à tous les joueurs connectés.
-- À coller dans Supabase: SQL Editor > New query > Run. À rouler APRÈS ameliorations8.sql (et 5, pour la modération).
-- On peut la rouler plus d'une fois sans problème. Elle ne touche ni aux annonces, ni aux chats de groupe ou d'amis.
--
-- Les règles du salon:
--   - Il faut être connecté et avoir un personnage dans « Mon profil » pour écrire (ton nom s'affiche avec ta classe).
--   - 500 caractères par message. Les messages sont effacés après 48 heures.
--   - Pas de pourriel: 3 messages par 10 secondes au maximum, et le même message ne peut pas être renvoyé dans les 2 minutes.
--   - Trois personnes différentes qui signalent un message le masquent. Les modérateurs voient les signalements dans la
--     fenêtre « Modération » (comme pour les autres chats) et peuvent suspendre le compte: ses messages disparaissent du salon.
--   - Tu ne vois pas les messages des joueurs que tu as bloqués.

alter table public.signalements_messages drop constraint if exists signalements_messages_type_check;
alter table public.signalements_messages
  add constraint signalements_messages_type_check check (type in ('groupe', 'ami', 'salon'));

create table if not exists public.messages_salon (
  id         bigint generated always as identity primary key,
  de         uuid not null references auth.users (id) on delete cascade,
  texte      text not null check (char_length(texte) <= 500 and char_length(btrim(texte)) >= 1),
  masque     boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists messages_salon_date_idx on public.messages_salon (created_at);
create index if not exists messages_salon_auteur_idx on public.messages_salon (de, created_at);

alter table public.messages_salon enable row level security;
revoke all on public.messages_salon from anon, authenticated;

-- ------------------------------------------------------------
-- Fonctions déjà existantes, étendues pour connaître le salon
-- ------------------------------------------------------------

create or replace function public.purger_chats()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.groupes where fin_le < now() - interval '24 hours';
  delete from public.messages_amis where created_at < now() - interval '30 days';
  delete from public.messages_salon where created_at < now() - interval '48 hours';
  delete from public.signalements_messages where created_at < now() - interval '30 days';
  delete from public.chat_lectures l
   where l.type = 'groupe' and not exists (select 1 from public.groupes g where g.id = l.cible);
end;
$$;

create or replace function public.chat_verifier_ecriture(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  recents int;
  jour    int;
begin
  if p_user is null then
    raise exception 'connexion requise' using errcode = '28000';
  end if;
  if exists (select 1 from public.bannis where user_id = p_user) then
    raise exception 'compte suspendu' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('chat' || p_user::text, 0));
  select
    (select count(*) from public.messages_groupe where de = p_user and genre = 'texte' and created_at > now() - interval '30 seconds')
    + (select count(*) from public.messages_amis where de = p_user and created_at > now() - interval '30 seconds')
    + (select count(*) from public.messages_salon where de = p_user and created_at > now() - interval '30 seconds'),
    (select count(*) from public.messages_groupe where de = p_user and genre = 'texte' and created_at > now() - interval '24 hours')
    + (select count(*) from public.messages_amis where de = p_user and created_at > now() - interval '24 hours')
    + (select count(*) from public.messages_salon where de = p_user and created_at > now() - interval '24 hours')
  into recents, jour;
  if recents >= 15 then
    raise exception 'trop de messages, attends un peu' using errcode = '54000';
  end if;
  if jour >= 1000 then
    raise exception 'limite de messages par jour atteinte' using errcode = '54000';
  end if;
end;
$$;

create or replace function public.effacer_message(p_type text, p_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'connexion requise' using errcode = '28000';
  end if;
  if p_type = 'groupe' then
    delete from public.messages_groupe where id = p_id and de = auth.uid() and genre = 'texte';
  elsif p_type = 'ami' then
    delete from public.messages_amis where id = p_id and de = auth.uid();
  elsif p_type = 'salon' then
    delete from public.messages_salon where id = p_id and de = auth.uid();
  else
    raise exception 'type inconnu' using errcode = '22023';
  end if;
end;
$$;

create or replace function public.signaler_message(p_type text, p_id bigint, p_motif text)
returns void
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  me      uuid := auth.uid();
  auteur  uuid;
  contenu text;
  lieu    text;
  ctx     text;
  nb      int;
  gid     uuid;
begin
  if me is null then
    raise exception 'connexion requise' using errcode = '28000';
  end if;
  if p_motif is null or p_motif not in ('harcelement', 'spam', 'inapproprie', 'autre') then
    raise exception 'motif inconnu' using errcode = '22023';
  end if;
  if (select count(*) from public.signalements_messages where signaleur = me and created_at > now() - interval '24 hours') >= 20 then
    raise exception 'trop de signalements aujourd''hui' using errcode = '54000';
  end if;

  if p_type = 'groupe' then
    select m.de, m.texte, m.groupe_id into auteur, contenu, gid
      from public.messages_groupe m where m.id = p_id and m.genre = 'texte';
    if auteur is null or auteur = me or not public.chat_est_membre(gid, me) then
      raise exception 'message introuvable' using errcode = 'P0002';
    end if;
    select 'Groupe « ' || g.titre || ' »' into lieu from public.groupes g where g.id = gid;
    select string_agg(coalesce(p.perso, '?') || ': ' || left(c.texte, 200), E'\n' order by c.id)
      into ctx
      from (select * from public.messages_groupe
             where groupe_id = gid and id < p_id and genre = 'texte' order by id desc limit 4) c
      left join public.profils p on p.user_id = c.de;
  elsif p_type = 'ami' then
    select m.de, m.texte into auteur, contenu
      from public.messages_amis m where m.id = p_id and m.pour = me;
    if auteur is null then
      raise exception 'message introuvable' using errcode = 'P0002';
    end if;
    lieu := 'Message privé entre amis';
    select string_agg(coalesce(p.perso, '?') || ': ' || left(c.texte, 200), E'\n' order by c.id)
      into ctx
      from (select * from public.messages_amis
             where least(de, pour) = least(me, auteur) and greatest(de, pour) = greatest(me, auteur)
               and id < p_id order by id desc limit 4) c
      left join public.profils p on p.user_id = c.de;
  elsif p_type = 'salon' then
    select m.de, m.texte into auteur, contenu
      from public.messages_salon m where m.id = p_id;
    if auteur is null or auteur = me then
      raise exception 'message introuvable' using errcode = 'P0002';
    end if;
    lieu := 'Salon public « La Taverne »';
    select string_agg(coalesce(p.perso, '?') || ': ' || left(c.texte, 200), E'\n' order by c.id)
      into ctx
      from (select * from public.messages_salon where id < p_id order by id desc limit 4) c
      left join public.profils p on p.user_id = c.de;
  else
    raise exception 'type inconnu' using errcode = '22023';
  end if;

  insert into public.signalements_messages (type, message_id, signaleur, auteur, motif, texte, contexte, lieu)
  values (p_type, p_id, me, auteur, p_motif, left(contenu, 500), coalesce(left(ctx, 1200), ''), coalesce(lieu, ''))
  on conflict (type, message_id, signaleur) do nothing;

  select count(distinct signaleur) into nb
    from public.signalements_messages where type = p_type and message_id = p_id;
  if nb >= 3 then
    if p_type = 'groupe' then
      update public.messages_groupe set masque = true where id = p_id;
    elsif p_type = 'salon' then
      update public.messages_salon set masque = true where id = p_id;
    else
      update public.messages_amis set masque = true where id = p_id;
    end if;
  end if;
end;
$$;

create or replace function public.mod_messages_signales()
returns table (
  type        text,
  message_id  bigint,
  nb          int,
  motifs      text[],
  dernier     timestamptz,
  auteur      uuid,
  auteur_perso text,
  texte       text,
  contexte    text,
  lieu        text,
  masque      boolean,
  suspendu    boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select s.type, s.message_id, s.nb, s.motifs, s.dernier, s.auteur,
         coalesce(p.perso, '?')::text,
         s.texte, s.contexte, s.lieu,
         coalesce(case s.type
           when 'groupe' then (select m.masque from public.messages_groupe m where m.id = s.message_id)
           when 'salon' then (select m.masque from public.messages_salon m where m.id = s.message_id)
           else (select m.masque from public.messages_amis m where m.id = s.message_id)
         end, false),
         exists (select 1 from public.bannis b where b.user_id = s.auteur)
  from (
    select r.type, r.message_id, count(distinct r.signaleur)::int as nb, array_agg(distinct r.motif order by r.motif) as motifs,
           max(r.created_at) as dernier, (array_agg(r.auteur))[1] as auteur,
           max(r.texte) as texte, max(r.contexte) as contexte, max(r.lieu) as lieu
    from public.signalements_messages r
    group by r.type, r.message_id
  ) s
  left join public.profils p on p.user_id = s.auteur
  where public.est_moderateur()
  order by s.nb desc, s.dernier desc
  limit 200;
$$;

create or replace function public.mod_message_ecarter(p_type text, p_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  auteur uuid;
begin
  if not public.est_moderateur() then
    raise exception 'réservé aux modérateurs' using errcode = '42501';
  end if;
  if p_type not in ('groupe', 'ami', 'salon') then
    raise exception 'type inconnu' using errcode = '22023';
  end if;
  select r.auteur into auteur from public.signalements_messages r where r.type = p_type and r.message_id = p_id limit 1;
  delete from public.signalements_messages where type = p_type and message_id = p_id;
  if p_type = 'groupe' then
    update public.messages_groupe set masque = false where id = p_id;
  elsif p_type = 'salon' then
    update public.messages_salon set masque = false where id = p_id;
  else
    update public.messages_amis set masque = false where id = p_id;
  end if;
  insert into public.moderation_journal (par, action, cible_type, cible_id, note)
  values (auth.uid(), 'ecarter', 'message', auteur, 'message ' || p_type || ' ' || p_id);
end;
$$;

create or replace function public.mod_message_effacer(p_type text, p_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  auteur uuid;
begin
  if not public.est_moderateur() then
    raise exception 'réservé aux modérateurs' using errcode = '42501';
  end if;
  if p_type not in ('groupe', 'ami', 'salon') then
    raise exception 'type inconnu' using errcode = '22023';
  end if;
  select r.auteur into auteur from public.signalements_messages r where r.type = p_type and r.message_id = p_id limit 1;
  delete from public.signalements_messages where type = p_type and message_id = p_id;
  if p_type = 'groupe' then
    delete from public.messages_groupe where id = p_id;
  elsif p_type = 'salon' then
    delete from public.messages_salon where id = p_id;
  else
    delete from public.messages_amis where id = p_id;
  end if;
  insert into public.moderation_journal (par, action, cible_type, cible_id, note)
  values (auth.uid(), 'effacer', 'message', auteur, 'message ' || p_type || ' ' || p_id);
end;
$$;

-- ------------------------------------------------------------
-- Lire et écrire dans le salon
-- ------------------------------------------------------------
create or replace function public.lire_salon(p_apres bigint default 0)
returns table (
  id         bigint,
  user_id    uuid,
  genre      text,
  texte      text,
  masque     boolean,
  created_at timestamptz,
  perso      text,
  classe     text,
  moi        boolean
)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'connexion requise' using errcode = '28000';
  end if;
  return query
    select x.* from (
      select m.id, m.de, 'texte'::text, case when m.masque then ''::text else m.texte end, m.masque, m.created_at,
             p.perso::text, p.classe::text, (m.de = me)
      from public.messages_salon m
      left join public.profils p on p.user_id = m.de
      where m.id > coalesce(p_apres, 0)
        and not exists (select 1 from public.bannis b where b.user_id = m.de)
        and not exists (select 1 from public.blocages b where b.bloqueur = me and b.bloque = m.de)
      order by m.id desc
      limit 100
    ) x
    order by x.id;
end;
$$;

create or replace function public.ecrire_salon(p_texte text)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  me      uuid := auth.uid();
  contenu text := btrim(coalesce(p_texte, ''));
  nouveau bigint;
begin
  if me is null then
    raise exception 'connexion requise' using errcode = '28000';
  end if;
  if char_length(contenu) < 1 or char_length(contenu) > 500 then
    raise exception 'message invalide' using errcode = '22023';
  end if;
  perform public.chat_verifier_ecriture(me);
  if not exists (select 1 from public.profils p where p.user_id = me and btrim(p.perso) <> '') then
    raise exception 'personnage requis' using errcode = '22023';
  end if;
  if (select count(*) from public.messages_salon where de = me and created_at > now() - interval '10 seconds') >= 3 then
    raise exception 'trop vite, attends un peu' using errcode = '54000';
  end if;
  if exists (select 1 from public.messages_salon where de = me and texte = contenu and created_at > now() - interval '2 minutes') then
    raise exception 'trop de messages identiques' using errcode = '54000';
  end if;
  perform public.purger_chats();
  insert into public.messages_salon (de, texte) values (me, contenu) returning id into nouveau;
  return nouveau;
end;
$$;

-- ------------------------------------------------------------
-- Droits d'exécution
-- ------------------------------------------------------------
revoke all on function public.lire_salon(bigint) from public, anon;
revoke all on function public.ecrire_salon(text) from public, anon;
grant execute on function public.lire_salon(bigint) to authenticated;
grant execute on function public.ecrire_salon(text) to authenticated;
-- Ces fonctions étaient déjà accessibles aux joueurs connectés: on garde les mêmes droits.
revoke all on function public.purger_chats() from public, anon, authenticated;
revoke all on function public.chat_verifier_ecriture(uuid) from public, anon, authenticated;
revoke all on function public.effacer_message(text, bigint) from public, anon;
revoke all on function public.signaler_message(text, bigint, text) from public, anon;
revoke all on function public.mod_messages_signales() from public, anon;
revoke all on function public.mod_message_ecarter(text, bigint) from public, anon;
revoke all on function public.mod_message_effacer(text, bigint) from public, anon;
grant execute on function public.effacer_message(text, bigint) to authenticated;
grant execute on function public.signaler_message(text, bigint, text) to authenticated;
grant execute on function public.mod_messages_signales() to authenticated;
grant execute on function public.mod_message_ecarter(text, bigint) to authenticated;
grant execute on function public.mod_message_effacer(text, bigint) to authenticated;
