-- One-way Telegram support deep-link (no bot, no webhook, no data flows back
-- into Supabase) — the founder configures a Telegram username/bot handle
-- here, and the app builds a https://t.me/<handle>?text=... link from it.
alter table public.founder_settings add column if not exists support_telegram_username text;

notify pgrst, 'reload schema';
