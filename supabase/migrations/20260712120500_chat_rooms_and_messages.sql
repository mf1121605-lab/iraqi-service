-- The 5 community rooms (seeded in a later migration). moderator_id is
-- always assigned directly by the founder, never self-claimed.
create table public.chat_rooms (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_ar text not null,
  name_ckb text not null,
  moderator_id uuid references public.profiles (id),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create trigger trg_audit_chat_rooms
after insert or update or delete on public.chat_rooms
for each row execute function public.fn_audit_log_generic();

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.chat_rooms (id) on delete cascade,
  sender_id uuid not null references public.profiles (id),
  body text,
  attachment_url text,
  -- Moderation hides a message instead of deleting it, keeping the same
  -- append-only trail used everywhere else in this schema.
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  constraint chat_messages_body_or_attachment check (body is not null or attachment_url is not null)
);

create index chat_messages_room_created_idx on public.chat_messages (room_id, created_at);
