-- WhatsApp-style "unsend": the sender of a message may permanently delete
-- it. No prior DELETE policy existed on any of the three message tables
-- (chat_messages only ever supported hiding via is_hidden moderation). All
-- three tables are already in the supabase_realtime publication, so once
-- this policy exists, the DELETE broadcasts to every connected client
-- automatically — no publication change needed.
grant delete on public.chat_messages to authenticated;
create policy chat_messages_delete_sender
  on public.chat_messages for delete
  to authenticated
  using (sender_id = auth.uid());

grant delete on public.request_messages to authenticated;
create policy request_messages_delete_sender
  on public.request_messages for delete
  to authenticated
  using (sender_id = auth.uid());

grant delete on public.direct_messages to authenticated;
create policy direct_messages_delete_sender
  on public.direct_messages for delete
  to authenticated
  using (sender_id = auth.uid());
