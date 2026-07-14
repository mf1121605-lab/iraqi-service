create table if not exists public.app_config (
  key text not null primary key,
  value text not null,
  description text,
  updated_at timestamp with time zone not null default now()
);

alter table if exists public.app_config enable row level security;

grant select on table public.app_config to anon, authenticated;

insert into public.app_config (key, value, description) values
  ('push_dispatch_secret', '', 'Shared secret for push notification dispatch triggers'),
  ('chat_audio_enabled', 'false', 'Enable audio playback in chat rooms'),
  ('chat_background_image', '', 'Background image URL for chat rooms')
on conflict (key) do nothing;
