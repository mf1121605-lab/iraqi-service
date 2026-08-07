-- Lets a user remove someone who follows them.
--
-- follows_delete_self only allowed follower_id = auth.uid(), i.e. you could
-- unfollow but never drop a follower. The profile screen's new "remove
-- follower" action needs the other direction, and without this it would be a
-- button that changes nothing: PostgREST answers an RLS-blocked delete with a
-- successful zero-row response rather than an error.
--
-- Both directions are safe: each side of a follow edge may sever it. Nobody
-- gains the ability to touch a row they are not part of.

drop policy if exists follows_delete_self on public.follows;
create policy follows_delete_self on public.follows
  for delete to authenticated
  using (follower_id = auth.uid() or following_id = auth.uid());

notify pgrst, 'reload schema';
