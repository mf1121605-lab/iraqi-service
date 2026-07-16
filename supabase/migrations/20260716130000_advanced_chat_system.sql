-- Emoji reactions on community chat messages. A separate table rather
-- than a column on chat_messages: chat_messages' UPDATE grant is locked
-- to the is_hidden column only (see chat_enhancements/rls_policies), and
-- a reaction is inherently per-user-per-message, not a single mutable
-- field on the message row.
create table public.chat_message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.chat_messages (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  unique (message_id, user_id, emoji)
);

create index chat_message_reactions_message_idx on public.chat_message_reactions (message_id);

alter table public.chat_message_reactions enable row level security;

create policy chat_message_reactions_select
  on public.chat_message_reactions for select
  to authenticated
  using (true);

create policy chat_message_reactions_insert
  on public.chat_message_reactions for insert
  to authenticated
  with check (user_id = auth.uid());

create policy chat_message_reactions_delete
  on public.chat_message_reactions for delete
  to authenticated
  using (user_id = auth.uid());

alter publication supabase_realtime add table public.chat_message_reactions;

-- Sender avatar and attachment metadata, denormalized onto chat_messages
-- at send time — same reasoning as sender_display_name in
-- chat_enhancements.sql: profiles RLS doesn't let one user read another
-- user's avatar_key, and the rich file card needs a name/size/type it
-- otherwise has no way to know without a storage.objects read.
alter table public.chat_messages add column if not exists sender_avatar_key text;
alter table public.chat_messages add column if not exists attachment_name text;
alter table public.chat_messages add column if not exists attachment_size bigint;
alter table public.chat_messages add column if not exists attachment_mime text;

-- Per-user pinned community chat rooms, stored on the user's own profile
-- row (an array) rather than a join table.
alter table public.profiles add column if not exists pinned_room_ids uuid[] not null default '{}';

-- profiles' UPDATE privilege is locked to an explicit column allow-list
-- (see rls_policies.sql) so self-service pin/unpin would otherwise
-- silently no-op instead of erroring or saving.
grant update (pinned_room_ids) on public.profiles to authenticated;

-- Word/Excel alongside the existing image/PDF types, for the rich file
-- cards. This is a hard bucket-level constraint, not just client
-- validation, so it must change here too.
update storage.buckets
set allowed_mime_types = array[
  'image/png', 'image/jpeg', 'application/pdf',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]
where id = 'attachments';
