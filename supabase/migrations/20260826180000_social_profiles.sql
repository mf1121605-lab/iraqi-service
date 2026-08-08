-- Public-profile feature: bio + a follow graph. Message requests reuse the
-- existing chat_room_invitations/accept_chat_invitation machinery
-- (20260730120000_dm_invitations.sql) as-is — no changes needed there.
alter table public.profiles add column if not exists bio text;
alter table public.profiles drop constraint if exists profiles_bio_length;
alter table public.profiles add constraint profiles_bio_length check (bio is null or char_length(bio) <= 150);

grant select (bio) on public.profiles to authenticated;
grant update (bio) on public.profiles to authenticated;

create table if not exists public.follows (
  follower_id  uuid not null references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint follows_no_self check (follower_id <> following_id)
);

alter table public.follows enable row level security;

create policy follows_select on public.follows
  for select to authenticated using (true);

create policy follows_insert_self on public.follows
  for insert to authenticated with check (follower_id = auth.uid());

create policy follows_delete_self on public.follows
  for delete to authenticated using (follower_id = auth.uid());

alter publication supabase_realtime add table public.follows;
