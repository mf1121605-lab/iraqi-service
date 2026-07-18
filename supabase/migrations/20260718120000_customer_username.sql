-- Optional username alias for login, alongside the existing native phone
-- identity. Resolved server-side to the account's real phone before
-- signing in — never used as a Supabase Auth identity itself.
alter table public.profiles add column username text unique;

alter table public.profiles
  add constraint profiles_username_format
  check (username is null or username ~ '^[a-z][a-z0-9_]{2,}$');
