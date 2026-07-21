-- Persistent per-room message count for member rank calculation.
-- Client falls back to counting from loaded messages when this table is empty;
-- once the migration runs, new messages will increment these counters in real-time
-- and provide accurate historical points across sessions.

create table public.chat_member_stats (
  room_id        uuid    not null references public.chat_rooms(id) on delete cascade,
  user_id        uuid    not null references auth.users(id) on delete cascade,
  message_count  integer not null default 0,
  last_message_at timestamptz,
  primary key (room_id, user_id)
);

alter table public.chat_member_stats enable row level security;

create policy chat_member_stats_select
  on public.chat_member_stats for select
  to authenticated
  using (true);

grant select on public.chat_member_stats to authenticated;

-- Trigger: increment counter each time a message is inserted
create or replace function public.increment_member_stats()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.chat_member_stats (room_id, user_id, message_count, last_message_at)
  values (new.room_id, new.sender_id, 1, new.created_at)
  on conflict (room_id, user_id) do update
    set message_count    = chat_member_stats.message_count + 1,
        last_message_at  = new.created_at;
  return new;
end;
$$;

create trigger on_chat_message_insert
  after insert on public.chat_messages
  for each row execute function public.increment_member_stats();
