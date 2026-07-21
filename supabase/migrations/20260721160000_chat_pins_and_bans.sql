-- Add is_pinned column to chat_messages
alter table public.chat_messages
  add column if not exists is_pinned boolean not null default false;

-- Extend column-level grant to include is_pinned
-- (must revoke the old single-column grant first, then re-grant both)
revoke update (is_hidden) on public.chat_messages from authenticated;
grant update (is_hidden, is_pinned) on public.chat_messages to authenticated;

-- chat_room_bans: moderator/staff can ban a user from a specific room
create table if not exists public.chat_room_bans (
  room_id       uuid not null references public.chat_rooms(id) on delete cascade,
  banned_user_id uuid not null references auth.users(id)       on delete cascade,
  banned_by      uuid         references auth.users(id)        on delete set null,
  created_at     timestamptz  not null default now(),
  primary key (room_id, banned_user_id)
);

alter table public.chat_room_bans enable row level security;

-- Any authenticated user may read bans for rooms they're in (needed to
-- check whether the current viewer is banned before showing the input form).
create policy chat_room_bans_select
  on public.chat_room_bans for select
  to authenticated
  using (true);

-- Only founder/staff or the room moderator may insert a ban.
create policy chat_room_bans_insert
  on public.chat_room_bans for insert
  to authenticated
  with check (
    public.is_founder()
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'employee')
    or exists (select 1 from public.chat_rooms where id = room_id and moderator_id = auth.uid())
  );

-- Same actors may remove a ban.
create policy chat_room_bans_delete
  on public.chat_room_bans for delete
  to authenticated
  using (
    public.is_founder()
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'employee')
    or exists (select 1 from public.chat_rooms where id = room_id and moderator_id = auth.uid())
  );

grant select, insert, delete on public.chat_room_bans to authenticated;

alter publication supabase_realtime add table public.chat_room_bans;
