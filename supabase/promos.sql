-- Classement par promo (à exécuter une fois après schema.sql / harden.sql).
-- La promo est déclarée par le joueur (inscription ou menu Compte) ; elle ne sert qu'aux classements.
alter table public.profiles add column if not exists promo text
  check (promo is null or promo in ('1A', '2A', '3A', '4A', '5A', 'ALUMNI', 'EXT'));
grant update (promo) on public.profiles to authenticated;
create index if not exists profiles_promo on public.profiles (promo) where promo is not null;

-- profil créé à l'inscription : la promo vient des métadonnées si elle est valide
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare p text := new.raw_user_meta_data ->> 'promo';
begin
  insert into public.profiles (id, pseudo, estp, promo)
  values (new.id, new.raw_user_meta_data ->> 'pseudo', false,
          case when p in ('1A', '2A', '3A', '4A', '5A', 'ALUMNI', 'EXT') then p end);
  return new;
end $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- classements : nouvelle colonne promo et filtre « promo » (même promo que le joueur connecté)
drop function if exists public.leaderboard(text, text, text, int);
create function public.leaderboard(p_scope text, p_filter text default 'all', p_level text default null, p_limit int default 50)
returns table (rank bigint, user_id uuid, pseudo text, skin text, estp boolean, promo text, total_time numeric, levels bigint, is_me boolean, total bigint)
language sql stable security definer set search_path = public as $$
  with params as (select floor(extract(epoch from now()) / 86400)::int as d),
  mine as (select p.promo from profiles p where p.id = auth.uid()),
  src as (
    select r.user_id, r.level, r.time from runs r, params
    where (p_scope = 'global' or r.level = p_level)
      and (p_scope <> 'daily' or r.day = params.d)
      and (p_scope <> 'weekly' or r.week = floor((params.d + 3) / 7.0)::int)
  ),
  best as (select s.user_id, s.level, min(s.time) as t from src s group by s.user_id, s.level),
  agg as (select b.user_id, sum(b.t) as total_time, count(*) as levels from best b group by b.user_id),
  filt as (
    select a.*, p.pseudo::text as pseudo, p.skin, p.estp, p.promo from agg a join profiles p on p.id = a.user_id
    where p_filter = 'all'
       or (p_filter = 'estp' and p.estp)
       or (p_filter = 'promo' and p.promo is not null and p.promo = (select m.promo from mine m))
       or (p_filter = 'friends' and (a.user_id = auth.uid()
           or exists (select 1 from friends f where f.user_id = auth.uid() and f.friend_id = a.user_id)))
  ),
  ranked as (
    select rank() over (order by case when p_scope = 'global' then -f.levels else 0 end, f.total_time, f.pseudo) as rank,
           f.user_id, f.pseudo, f.skin, f.estp, f.promo, f.total_time, f.levels,
           coalesce(f.user_id = auth.uid(), false) as is_me, count(*) over () as total
    from filt f
  )
  select * from ranked where rank <= least(greatest(p_limit, 1), 100) or is_me order by rank
$$;
grant execute on function public.leaderboard(text, text, text, int) to anon, authenticated;

-- bataille des promos : un point par niveau terminé par un membre (niveau du jour exclu)
create or replace function public.promo_board()
returns table (rank bigint, promo text, players bigint, levels bigint, is_mine boolean)
language sql stable security definer set search_path = public as $$
  with done as (select distinct r.user_id, r.level from runs r where r.level <> 'DAY'),
  agg as (
    select p.promo, count(distinct d.user_id) as players, count(*) as levels
    from done d join profiles p on p.id = d.user_id
    where p.promo is not null group by p.promo
  )
  select rank() over (order by a.levels desc, a.players desc), a.promo, a.players, a.levels,
         coalesce(a.promo = (select m.promo from profiles m where m.id = auth.uid()), false)
  from agg a order by 1, a.promo
$$;
revoke execute on function public.promo_board() from public;
grant execute on function public.promo_board() to anon, authenticated;
