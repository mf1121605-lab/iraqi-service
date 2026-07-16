-- Reusable media gallery for the founder's Media Studio picker (images
-- and short videos used as card/announcement backgrounds). Founder/
-- co_admin only — this is an authoring tool, not public content itself;
-- the URLs it hands out get copied onto categories/announcements rows,
-- which have their own public-read policies already.
create table public.media_library (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  type text not null check (type in ('image', 'video')),
  name text not null,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index media_library_type_idx on public.media_library (type, created_at desc);

alter table public.media_library enable row level security;

create policy media_library_select_staff
  on public.media_library for select
  to authenticated
  using (public.is_founder() or public.is_co_admin());

create policy media_library_write_founder
  on public.media_library for all
  to authenticated
  using (public.is_founder() or public.is_co_admin())
  with check (public.is_founder() or public.is_co_admin());

alter publication supabase_realtime add table public.media_library;

-- Video-background support alongside the existing image fields. Duration
-- (max 5s) is enforced client-side at upload time in the Media Studio —
-- Supabase Storage has no server-side video inspection to enforce it
-- against a direct API upload, so this is a soft gate for the founder's
-- own authoring flow, not a hard security boundary.
alter table public.categories add column if not exists icon_video_url text;
alter table public.announcements add column if not exists video_url text;

-- Real per-room ambient audio, replacing the old founder_settings
-- chat_audio_track_key text field: that field pointed at
-- /assets/audio/{key}.mp3, and no such directory or upload path has ever
-- existed in the app, so it has never actually played anything. The
-- "current track" for a room is just its most recent row, so setting a
-- new one is a plain insert rather than needing a separate is_active flag.
create table public.chat_ambient_audio (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.chat_rooms (id) on delete cascade,
  title text not null,
  audio_url text not null,
  uploaded_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index chat_ambient_audio_room_idx on public.chat_ambient_audio (room_id, created_at desc);

alter table public.chat_ambient_audio enable row level security;

-- Every authenticated user can read a room's ambient track (it has to
-- play for every participant), matching chat_messages_select_authenticated.
create policy chat_ambient_audio_select
  on public.chat_ambient_audio for select
  to authenticated
  using (true);

-- Founder/co_admin, or that specific room's own moderator ("group
-- admin") — same authority model as chat_messages moderation.
create policy chat_ambient_audio_insert
  on public.chat_ambient_audio for insert
  to authenticated
  with check (
    public.is_founder()
    or public.is_co_admin()
    or exists (select 1 from public.chat_rooms cr where cr.id = room_id and cr.moderator_id = auth.uid())
  );

create policy chat_ambient_audio_delete
  on public.chat_ambient_audio for delete
  to authenticated
  using (
    public.is_founder()
    or public.is_co_admin()
    or exists (select 1 from public.chat_rooms cr where cr.id = room_id and cr.moderator_id = auth.uid())
  );

alter publication supabase_realtime add table public.chat_ambient_audio;

-- Widen site-assets for video/audio uploads (Media Studio videos, chat
-- ambient audio tracks) and raise the size cap accordingly — 5MB was
-- sized for still images only.
update storage.buckets
set
  file_size_limit = 26214400,
  allowed_mime_types = array[
    'image/png', 'image/jpeg', 'image/webp', 'image/svg+xml',
    'video/mp4', 'video/webm',
    'audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/wav'
  ]
where id = 'site-assets';

-- A room's moderator can only upload under that room's own chat-audio/
-- prefix (mirrors the requests/{request_id}/ path-scoping already used
-- on the private attachments bucket) — founder/co_admin keep the
-- blanket site_assets_write_founder policy from the admin-dashboard
-- migration for everything else (media library, backgrounds, icons).
create policy site_assets_write_room_moderator
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'site-assets'
    and (storage.foldername(name))[1] = 'chat-audio'
    and exists (
      select 1 from public.chat_rooms cr
      where cr.id::text = (storage.foldername(name))[2]
        and cr.moderator_id = auth.uid()
    )
  );
