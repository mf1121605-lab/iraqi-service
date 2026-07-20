-- Denormalized at send-time, same pattern as sender_display_name/
-- sender_avatar_key — lets the group-room avatar-click profile card show
-- a "staff" badge without needing a live profiles lookup for other users
-- (which row-level security on profiles wouldn't allow from a customer's
-- session anyway).
alter table public.chat_messages add column if not exists sender_role text;
