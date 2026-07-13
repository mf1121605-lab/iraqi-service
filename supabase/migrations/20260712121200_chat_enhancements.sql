-- Customers can only SELECT their own profile row (profiles_select_self);
-- profiles_select_staff_all is staff/co_admin-only. Widening that so any
-- customer could look up any other customer's profile just to resolve a
-- display name in community chat would be a real privacy regression. A
-- denormalized name captured at insert time (from the sender's own,
-- self-readable profile) avoids that entirely.
alter table public.chat_messages add column sender_display_name text;

-- Realtime must be explicitly enabled per table in Supabase (it's off by
-- default) — without this, postgres_changes subscriptions in the chat room
-- UI never receive INSERT events.
alter publication supabase_realtime add table public.chat_messages;
