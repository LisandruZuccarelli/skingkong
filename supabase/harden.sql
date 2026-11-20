-- Correctif de sécurité (à exécuter une fois sur un projet créé avec l'ancien schema.sql).
-- En Postgres, une fonction est exécutable par PUBLIC par défaut, et anon en hérite :
-- « revoke ... from anon » ne suffit pas. On ferme à PUBLIC puis on rouvre au strict nécessaire.
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
