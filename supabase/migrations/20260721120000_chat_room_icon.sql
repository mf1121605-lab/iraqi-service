-- Add custom icon to chat rooms so founders can set a room avatar image
alter table public.chat_rooms
  add column if not exists icon_url text;
