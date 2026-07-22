-- Lightweight serverless rate limiting: track attempt timestamps per key.
-- Rows older than 1 hour are inert and cleaned up by the vacuum cron.
-- No RLS needed — this table is service-role-only (never touched by clients).

create table if not exists public.rate_limit_attempts (
  id         bigserial primary key,
  key        text        not null,
  attempted_at timestamptz not null default now()
);

create index rate_limit_attempts_key_time_idx
  on public.rate_limit_attempts (key, attempted_at desc);

-- Clean up rows older than 2 hours to keep the table small.
-- Vercel Cron or a Postgres scheduled task can run this periodically;
-- it is not critical for correctness (old rows are filtered in application logic).
create or replace function public.prune_rate_limit_attempts()
returns void language sql security definer set search_path = public as $$
  delete from public.rate_limit_attempts
  where attempted_at < now() - interval '2 hours';
$$;
