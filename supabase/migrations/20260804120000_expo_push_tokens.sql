-- Expo push tokens (mobile app) — the existing push_subscriptions table only
-- stores Web Push (VAPID) subscriptions for the browser; a native Expo app
-- uses a completely different token format sent through Expo's own push
-- service, so it needs its own table. Same self-service RLS shape as
-- push_subscriptions: a user registers/removes only their own token.
create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  expo_push_token text not null unique,
  platform text,
  updated_at timestamptz not null default now()
);

create index push_tokens_user_idx on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;

create policy push_tokens_select_own
  on public.push_tokens for select
  to authenticated
  using (user_id = auth.uid());

create policy push_tokens_insert_own
  on public.push_tokens for insert
  to authenticated
  with check (user_id = auth.uid());

create policy push_tokens_update_own
  on public.push_tokens for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy push_tokens_delete_own
  on public.push_tokens for delete
  to authenticated
  using (user_id = auth.uid());
