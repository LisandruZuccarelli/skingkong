-- SkingKong : schéma Supabase (étape 6). À exécuter une fois dans Supabase > SQL Editor,
-- puis exécuter supabase/levels.sql (limites anti-triche des niveaux, généré par `npm run sql`).
-- Sécurité :
--  * les mots de passe sont gérés par Supabase Auth (hachage bcrypt côté serveur) ; l'e-mail reste dans auth.users, jamais exposé ;
--  * Row Level Security partout : chacun ne lit / n'écrit que sa sauvegarde et sa liste d'amis ;
--  * les résultats passent uniquement par submit_run(), qui vérifie le niveau, le temps minimal plausible,
--    les forfaits, le temps réellement écoulé et limite le débit (2 s entre deux envois, 300 par jour).

create extension if not exists citext;

-- ---------------------------------------------------------------- profils publics
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  pseudo citext unique not null check (pseudo ~ '^[A-Za-z0-9_-]{3,16}$'),
  estp boolean not null default false,          -- membre de la liste ESTP Cachan (classement dédié)
  skin text not null default 'classic' check (length(skin) <= 24),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists "profils lisibles" on public.profiles;
create policy "profils lisibles" on public.profiles for select using (true);
drop policy if exists "modifier son profil" on public.profiles;
create policy "modifier son profil" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (skin) on public.profiles to authenticated;   -- le pseudo ne se change pas

-- profil créé à l'inscription à partir des métadonnées (pseudo, estp)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, pseudo, estp)
  values (new.id, new.raw_user_meta_data ->> 'pseudo', false);
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.pseudo_available(p_pseudo text) returns boolean
language sql stable security definer set search_path = public as $$
  select p_pseudo ~ '^[A-Za-z0-9_-]{3,16}$' and not exists (select 1 from profiles where pseudo = p_pseudo::citext)
$$;

-- ---------------------------------------------------------------- sauvegarde cloud
create table if not exists public.saves (
  user_id uuid primary key references auth.users on delete cascade,
  data jsonb not null check (pg_column_size(data) < 262144),
  updated_at timestamptz not null default now()
);
alter table public.saves enable row level security;
drop policy if exists "sa sauvegarde" on public.saves;
create policy "sa sauvegarde" on public.saves for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create or replace function public.touch_save() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists saves_touch on public.saves;
create trigger saves_touch before insert or update on public.saves for each row execute function public.touch_save();

-- ---------------------------------------------------------------- niveaux et résultats
create table if not exists public.level_limits (
  level text primary key,
  min_time numeric(8,2) not null,
  max_coins int not null
);
alter table public.level_limits enable row level security;
drop policy if exists "limites lisibles" on public.level_limits;
create policy "limites lisibles" on public.level_limits for select using (true);

create table if not exists public.runs (
  id bigserial primary key,
  user_id uuid not null references auth.users on delete cascade,
  level text not null references public.level_limits,
  time numeric(8,2) not null,
  coins int not null,
  deaths int not null,
  day int not null,      -- jour UTC (epoch / 86400)
  week int not null,     -- semaine UTC commençant le lundi
  created_at timestamptz not null default now()
);
alter table public.runs enable row level security;   -- aucune politique : accès uniquement via les fonctions ci-dessous
create index if not exists runs_level_time on public.runs (level, time);
create index if not exists runs_level_day on public.runs (level, day);
create index if not exists runs_user_time on public.runs (user_id, created_at desc);

create or replace function public.submit_run(p_level text, p_time numeric, p_coins int, p_deaths int) returns json
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  lim level_limits;
  last_at timestamptz;
  n int;
  d int := floor(extract(epoch from now()) / 86400);
  r bigint; tot bigint;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  select * into lim from level_limits where level = p_level;
  if not found then raise exception 'unknown_level'; end if;
  if p_time is null or p_time < lim.min_time then raise exception 'impossible_time'; end if;
  if p_time > 3600 or p_coins is null or p_coins < 0 or p_coins > lim.max_coins or p_deaths is null or p_deaths < 0 then raise exception 'bad_run'; end if;
  select max(created_at) into last_at from runs where user_id = uid and day >= 0; -- les temps rattrapés (day = -1) ne comptent pas
  if last_at is not null and now() - last_at < interval '2 seconds' then raise exception 'too_fast'; end if;
  -- on ne peut pas finir un niveau en 40 s si le résultat précédent date d'il y a 10 s
  if last_at is not null and extract(epoch from now() - last_at) < p_time * 0.8 then raise exception 'impossible_time'; end if;
  select count(*) into n from runs where user_id = uid and day = d;
  if n >= 300 then raise exception 'too_many'; end if;
  insert into runs (user_id, level, time, coins, deaths, day, week)
  values (uid, p_level, round(p_time, 2), p_coins, p_deaths, d, floor((d + 3) / 7.0));
  with best as (select user_id, min(time) t from runs where level = p_level group by user_id),
       ranked as (select user_id, rank() over (order by t) rk, count(*) over () total from best)
  select rk, total into r, tot from ranked where user_id = uid;
  return json_build_object('rank', r, 'total', tot);
end $$;

-- ---------------------------------------------------------------- amis
create table if not exists public.friends (
  user_id uuid not null references auth.users on delete cascade,
  friend_id uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);
alter table public.friends enable row level security;
drop policy if exists "ses amis" on public.friends;
create policy "ses amis" on public.friends for select using (auth.uid() = user_id);

create or replace function public.add_friend(p_pseudo text) returns json
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); f profiles; n int;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  select * into f from profiles where pseudo = p_pseudo::citext;
  if not found then raise exception 'no_player'; end if;
  if f.id = uid then raise exception 'self'; end if;
  select count(*) into n from friends where user_id = uid;
  if n >= 200 then raise exception 'too_many'; end if;
  insert into friends (user_id, friend_id) values (uid, f.id) on conflict do nothing;
  return json_build_object('id', f.id, 'pseudo', f.pseudo, 'estp', f.estp, 'skin', f.skin);
end $$;

create or replace function public.remove_friend(p_friend uuid) returns void
language sql security definer set search_path = public as $$
  delete from friends where user_id = auth.uid() and friend_id = p_friend
$$;

create or replace function public.my_friends() returns table (id uuid, pseudo text, estp boolean, skin text)
language sql stable security definer set search_path = public as $$
  select p.id, p.pseudo::text, p.estp, p.skin from friends f join profiles p on p.id = f.friend_id
  where f.user_id = auth.uid() order by p.pseudo
$$;

-- ---------------------------------------------------------------- classements
-- p_scope : global (niveaux terminés puis somme des meilleurs temps) | level | daily | weekly (meilleur temps sur p_level)
-- p_filter : all | friends | estp. Renvoie le haut du tableau + la ligne du joueur connecté.
create or replace function public.leaderboard(p_scope text, p_filter text default 'all', p_level text default null, p_limit int default 50)
returns table (rank bigint, user_id uuid, pseudo text, skin text, estp boolean, total_time numeric, levels bigint, is_me boolean, total bigint)
language sql stable security definer set search_path = public as $$
  with params as (select floor(extract(epoch from now()) / 86400)::int as d),
  src as (
    select r.user_id, r.level, r.time from runs r, params
    where (p_scope = 'global' or r.level = p_level)
      and (p_scope <> 'daily' or r.day = params.d)
      and (p_scope <> 'weekly' or r.week = floor((params.d + 3) / 7.0)::int)
  ),
  best as (select s.user_id, s.level, min(s.time) as t from src s group by s.user_id, s.level),
  agg as (select b.user_id, sum(b.t) as total_time, count(*) as levels from best b group by b.user_id),
  filt as (
    select a.*, p.pseudo::text as pseudo, p.skin, p.estp from agg a join profiles p on p.id = a.user_id
    where p_filter = 'all'
       or (p_filter = 'estp' and p.estp)
       or (p_filter = 'friends' and (a.user_id = auth.uid()
           or exists (select 1 from friends f where f.user_id = auth.uid() and f.friend_id = a.user_id)))
  ),
  ranked as (
    select rank() over (order by case when p_scope = 'global' then -f.levels else 0 end, f.total_time, f.pseudo) as rank,
           f.user_id, f.pseudo, f.skin, f.estp, f.total_time, f.levels,
           coalesce(f.user_id = auth.uid(), false) as is_me, count(*) over () as total
    from filt f
  )
  select * from ranked where rank <= least(greatest(p_limit, 1), 100) or is_me order by rank
$$;

-- droits, politiques optimisées et index : voir harden.sql (inclus ici pour une installation neuve)
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.submit_run(text, numeric, int, int) from public, anon;
revoke execute on function public.add_friend(text) from public, anon;
revoke execute on function public.remove_friend(uuid) from public, anon;
revoke execute on function public.my_friends() from public, anon;
grant execute on function public.submit_run(text, numeric, int, int) to authenticated;
grant execute on function public.add_friend(text) to authenticated;
grant execute on function public.remove_friend(uuid) to authenticated;
grant execute on function public.my_friends() to authenticated;
grant execute on function public.leaderboard(text, text, text, int) to anon, authenticated;
grant execute on function public.pseudo_available(text) to anon, authenticated;
revoke execute on function public.touch_save() from public, anon, authenticated;
alter function public.touch_save() set search_path = '';

-- politiques réservées aux connectés, auth.uid() évalué une seule fois par requête
drop policy if exists "modifier son profil" on public.profiles;
create policy "modifier son profil" on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
drop policy if exists "sa sauvegarde" on public.saves;
create policy "sa sauvegarde" on public.saves for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "ses amis" on public.friends;
create policy "ses amis" on public.friends for select to authenticated
  using ((select auth.uid()) = user_id);

create index if not exists friends_friend_id on public.friends (friend_id);

-- rattrapage des meilleurs temps (voir backfill.sql)
-- Rattrapage des meilleurs temps : niveaux terminés en invité (avant la création du compte),
-- sur un autre appareil, ou dont l'envoi a échoué. Le jeu envoie les temps de la sauvegarde à la connexion.
--  - mêmes contrôles de vraisemblance que submit_run (temps minimum, forfaits, chutes) ;
--  - pas de contrôle de cadence (plusieurs niveaux partent d'un coup) ;
--  - inséré seulement s'il bat le meilleur temps du joueur sur ce niveau ;
--  - day = week = -1 : n'entre jamais dans les classements du jour et de la semaine.
create or replace function public.submit_best(p_level text, p_time numeric, p_coins int, p_deaths int) returns json
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  lim level_limits;
  n int;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  select * into lim from level_limits where level = p_level;
  if not found then raise exception 'unknown_level'; end if;
  if p_time is null or p_time < lim.min_time then raise exception 'impossible_time'; end if;
  if p_time > 3600 or p_coins is null or p_coins < 0 or p_coins > lim.max_coins or p_deaths is null or p_deaths < 0 then raise exception 'bad_run'; end if;
  if exists (select 1 from runs where user_id = uid and level = p_level and time <= round(p_time, 2)) then
    return json_build_object('inserted', false);
  end if;
  select count(*) into n from runs where user_id = uid and created_at > now() - interval '1 day';
  if n >= 300 then raise exception 'too_many'; end if;
  insert into runs (user_id, level, time, coins, deaths, day, week)
  values (uid, p_level, round(p_time, 2), p_coins, p_deaths, -1, -1);
  return json_build_object('inserted', true);
end $$;

revoke execute on function public.submit_best(text, numeric, int, int) from public, anon;
grant execute on function public.submit_best(text, numeric, int, int) to authenticated;

