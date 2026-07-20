-- Permission-gated 1:1 direct messages: any chat room member can send
-- another member a DM request from the member directory; a private
-- thread only comes into existence once the receiver accepts.
create table public.direct_message_threads (
  id uuid primary key default gen_random_uuid(),
  user_a_id uuid not null references public.profiles (id),
  user_b_id uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  -- Canonical ordering (always least, greatest) so a pair can never end
  -- up with two separate threads regardless of who initiated.
  constraint direct_message_threads_ordered_pair check (user_a_id < user_b_id),
  constraint direct_message_threads_unique_pair unique (user_a_id, user_b_id)
);

create table public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.direct_message_threads (id) on delete cascade,
  sender_id uuid not null references public.profiles (id),
  body text,
  attachment_url text,
  created_at timestamptz not null default now(),
  constraint direct_messages_body_or_attachment check (body is not null or attachment_url is not null)
);

create index direct_messages_thread_created_idx on public.direct_messages (thread_id, created_at);

create table public.chat_room_invitations (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles (id),
  receiver_id uuid not null references public.profiles (id),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  thread_id uuid references public.direct_message_threads (id),
  created_at timestamptz not null default now(),
  constraint chat_room_invitations_not_self check (sender_id <> receiver_id)
);

-- Only one pending invitation per pair at a time, regardless of who sent it.
create unique index chat_room_invitations_pending_pair_idx
  on public.chat_room_invitations (least(sender_id, receiver_id), greatest(sender_id, receiver_id))
  where status = 'pending';

alter table public.direct_message_threads enable row level security;

create policy direct_message_threads_select_participants
  on public.direct_message_threads for select
  to authenticated
  using (auth.uid() in (user_a_id, user_b_id));

-- No client INSERT/UPDATE/DELETE policy: a thread only ever comes into
-- existence via accept_chat_invitation() below (security definer), so
-- "permission-gated" is enforced by Postgres, not just app code.

alter table public.direct_messages enable row level security;

create policy direct_messages_select_participants
  on public.direct_messages for select
  to authenticated
  using (
    exists (
      select 1 from public.direct_message_threads t
      where t.id = direct_messages.thread_id
        and auth.uid() in (t.user_a_id, t.user_b_id)
    )
  );

create policy direct_messages_insert_participants
  on public.direct_messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.direct_message_threads t
      where t.id = thread_id
        and auth.uid() in (t.user_a_id, t.user_b_id)
    )
  );

-- No UPDATE/DELETE: transcript is immutable, same as request_messages/
-- chat_messages elsewhere in this schema.

alter table public.chat_room_invitations enable row level security;

create policy chat_room_invitations_select_participants
  on public.chat_room_invitations for select
  to authenticated
  using (auth.uid() in (sender_id, receiver_id));

create policy chat_room_invitations_insert_sender
  on public.chat_room_invitations for insert
  to authenticated
  with check (sender_id = auth.uid());

create policy chat_room_invitations_update_receiver
  on public.chat_room_invitations for update
  to authenticated
  using (receiver_id = auth.uid() and status = 'pending')
  with check (receiver_id = auth.uid());

-- The receiver may only ever flip status themselves (rejecting is a plain
-- client update); accepting goes through the function below since it also
-- has to create/reuse the thread atomically.
revoke update on public.chat_room_invitations from authenticated;
grant update (status) on public.chat_room_invitations to authenticated;
grant update on public.chat_room_invitations to postgres;

create function public.accept_chat_invitation(p_invitation_id uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_sender uuid;
  v_receiver uuid;
  v_thread_id uuid;
begin
  select sender_id, receiver_id into v_sender, v_receiver
  from public.chat_room_invitations
  where id = p_invitation_id and receiver_id = auth.uid() and status = 'pending';

  if v_sender is null then
    raise exception 'invitation not found or already resolved';
  end if;

  insert into public.direct_message_threads (user_a_id, user_b_id)
  values (least(v_sender, v_receiver), greatest(v_sender, v_receiver))
  on conflict (user_a_id, user_b_id) do nothing;

  select id into v_thread_id
  from public.direct_message_threads
  where user_a_id = least(v_sender, v_receiver) and user_b_id = greatest(v_sender, v_receiver);

  update public.chat_room_invitations
  set status = 'accepted', thread_id = v_thread_id
  where id = p_invitation_id;

  return v_thread_id;
end;
$$;

grant execute on function public.accept_chat_invitation(uuid) to authenticated;

alter publication supabase_realtime add table public.chat_room_invitations;
alter publication supabase_realtime add table public.direct_messages;
alter publication supabase_realtime add table public.direct_message_threads;
