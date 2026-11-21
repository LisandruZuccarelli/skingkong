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

-- submit_run : la cadence ignore les temps rattrapés (sinon un niveau fini juste après la connexion serait refusé)
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
