-- Widens DELETE beyond "author only" for the two cases the app's new trash
-- action exposes. Without these the button would appear for a moderator and
-- then silently do nothing: PostgREST reports a policy-blocked delete as a
-- successful no-op, not an error.
--
-- Deliberately NOT widened: direct_messages and request_messages. Those are
-- 1:1 conversations where no third party has standing, so sender-only stays
-- correct (see 20260803120000_message_unsend.sql).

-- 1) A post's author can moderate comments on their own post, on top of the
--    comment author and platform staff who already could.
drop policy if exists social_comments_delete on public.social_comments;
create policy social_comments_delete on public.social_comments
  for delete to authenticated
  using (
    author_id = auth.uid()
    or public.is_founder()
    or public.is_co_admin()
    or exists (
      select 1 from public.social_posts p
      where p.id = social_comments.post_id
        and p.author_id = auth.uid()
    )
  );

-- 2) Group-room moderation. The schema has no per-room admin role — chat_rooms
--    only records created_by — so the honest mapping for "group admin" is
--    platform staff, who already hold every other moderation power.
drop policy if exists chat_messages_delete_sender on public.chat_messages;
create policy chat_messages_delete_sender on public.chat_messages
  for delete to authenticated
  using (
    sender_id = auth.uid()
    or public.is_founder()
    or public.is_co_admin()
  );

notify pgrst, 'reload schema';
