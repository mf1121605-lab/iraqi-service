-- pg_net lets a trigger fire an async, non-blocking HTTP call — Supabase
-- ships this extension specifically for calling out to application code
-- from the database (their documented pattern for "database webhooks").
create extension if not exists pg_net;

alter publication supabase_realtime add table public.notifications;

-- One row per subscribed browser/device. Self-service only: a user
-- registers/removes their own push endpoint, nobody else's.
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy push_subscriptions_select_own
  on public.push_subscriptions for select
  to authenticated
  using (user_id = auth.uid());

create policy push_subscriptions_insert_own
  on public.push_subscriptions for insert
  to authenticated
  with check (user_id = auth.uid());

create policy push_subscriptions_delete_own
  on public.push_subscriptions for delete
  to authenticated
  using (user_id = auth.uid());

-- Deploy-time configuration for the push dispatcher, deliberately NOT
-- exposed to any client role (not even founder) — push_dispatch_secret is
-- a server-to-server shared secret between this trigger and the Next.js
-- dispatch API route, and must never reach a browser. Set both values
-- once via the Supabase SQL editor after deploying:
--   update public.app_config set value = 'https://your-domain.com/api/push/dispatch' where key = 'push_dispatch_url';
--   update public.app_config set value = '<a long random string>' where key = 'push_dispatch_secret';
create table public.app_config (
  key text primary key,
  value text
);

insert into public.app_config (key, value) values
  ('push_dispatch_url', ''),
  ('push_dispatch_secret', '');

alter table public.app_config enable row level security;
-- No policies at all: this table has zero client access, by design. Only
-- the SECURITY DEFINER trigger function below (and direct SQL-editor
-- access) can read it.

-- Fires on every insert into notifications, regardless of source — the
-- existing request-status, request-message, and payment-outcome code
-- paths that already insert into notifications need no changes at all.
-- If push isn't configured yet (empty push_dispatch_url), this is a no-op
-- and the notification row is still created normally.
create function public.fn_dispatch_push_notification() returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_url text;
  v_secret text;
begin
  select value into v_url from public.app_config where key = 'push_dispatch_url';
  select value into v_secret from public.app_config where key = 'push_dispatch_secret';

  if v_url is null or v_url = '' then
    return new;
  end if;

  perform net.http_post(
    url => v_url,
    headers => jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', coalesce(v_secret, '')),
    body => jsonb_build_object(
      'notificationId', new.id,
      'userId', new.user_id,
      'title', new.title,
      'body', new.body,
      'link', new.link
    )
  );

  return new;
end;
$$;

create trigger trg_dispatch_push_notification
after insert on public.notifications
for each row execute function public.fn_dispatch_push_notification();
