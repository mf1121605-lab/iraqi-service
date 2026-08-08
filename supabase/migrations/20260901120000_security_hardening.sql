-- Security & scalability hardening batch.
--
-- 1) Lock down rate_limit_attempts (it had no RLS and no explicit grant
--    revocation, so under Supabase's default per-table grants any signed-in
--    client could read/insert/delete rows directly via the REST API and
--    defeat rate limiting entirely, or leak the bucket keys of others).
-- 2) DB-level rate limiting for the writes that go straight from the mobile
--    client to Postgres with no server API in front of them to gate
--    (requests, chat/request/direct messages, social comments) — a
--    BEFORE INSERT trigger reusing the existing rate_limit_attempts table.
-- 3) Defense-in-depth text sanitization on free-text columns that ever
--    reach a chat bubble, comment, or request field.
-- 4) profiles added to the realtime publication — required for the new
--    mobile auth-guard subscription (force sign-out on remote role change
--    or suspension) to receive anything at all.
-- 5) Indexes for the request queue and the social feed's hot paths.

-- ============================================================
-- 1) rate_limit_attempts: deny all direct client access
-- ============================================================
alter table public.rate_limit_attempts enable row level security;
revoke all on public.rate_limit_attempts from anon, authenticated;
-- No policies created on purpose: RLS on + zero grants + zero policies
-- means anon/authenticated get nothing. Only security-definer functions
-- (which run as the table owner and bypass RLS) and the service-role key
-- can still read/write it.

-- ============================================================
-- 2) DB-level rate limiting for direct client writes
-- ============================================================
create or replace function public.enforce_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text := tg_table_name || ':' || coalesce(auth.uid()::text, 'anon');
  v_max int := tg_argv[0]::int;
  v_window_seconds int := tg_argv[1]::int;
  v_count int;
begin
  select count(*) into v_count
  from public.rate_limit_attempts
  where key = v_key
    and attempted_at > now() - (v_window_seconds || ' seconds')::interval;

  if v_count >= v_max then
    raise exception 'لقد تجاوزت الحد المسموح من العمليات، يرجى الانتظار قليلاً والمحاولة مجدداً';
  end if;

  insert into public.rate_limit_attempts (key) values (v_key);
  return new;
end;
$$;

drop trigger if exists trg_rate_limit_requests on public.requests;
create trigger trg_rate_limit_requests
  before insert on public.requests
  for each row execute function public.enforce_rate_limit('5', '60');

drop trigger if exists trg_rate_limit_chat_messages on public.chat_messages;
create trigger trg_rate_limit_chat_messages
  before insert on public.chat_messages
  for each row execute function public.enforce_rate_limit('10', '60');

drop trigger if exists trg_rate_limit_request_messages on public.request_messages;
create trigger trg_rate_limit_request_messages
  before insert on public.request_messages
  for each row execute function public.enforce_rate_limit('10', '60');

drop trigger if exists trg_rate_limit_direct_messages on public.direct_messages;
create trigger trg_rate_limit_direct_messages
  before insert on public.direct_messages
  for each row execute function public.enforce_rate_limit('10', '60');

drop trigger if exists trg_rate_limit_social_comments on public.social_comments;
create trigger trg_rate_limit_social_comments
  before insert on public.social_comments
  for each row execute function public.enforce_rate_limit('10', '60');

-- ============================================================
-- 3) Defense-in-depth text sanitization
-- ============================================================
-- Both real render surfaces already neutralize this today — React escapes
-- interpolated text by default (no dangerouslySetInnerHTML exists anywhere
-- in the web app's own components for user content) and React Native's
-- <Text> never interprets HTML at all — so this is a second, independent
-- layer at the data layer itself, not a fix for a live exploit.
create or replace function public.sanitize_text(input text)
returns text
language sql
immutable
as $$
  select case when input is null then null else
    regexp_replace(
      regexp_replace(
        regexp_replace(input, '<\s*script\b[^>]*>.*?<\s*/\s*script\s*>', '', 'gis'),
        '<\s*iframe\b[^>]*>.*?<\s*/\s*iframe\s*>', '', 'gis'
      ),
      '(on[a-z]+\s*=|javascript\s*:)', '', 'gi'
    )
  end;
$$;

create or replace function public.sanitize_chat_messages() returns trigger language plpgsql as $$
begin
  new.body := public.sanitize_text(new.body);
  return new;
end;
$$;
drop trigger if exists trg_sanitize_chat_messages on public.chat_messages;
create trigger trg_sanitize_chat_messages
  before insert or update on public.chat_messages
  for each row execute function public.sanitize_chat_messages();

create or replace function public.sanitize_request_messages() returns trigger language plpgsql as $$
begin
  new.body := public.sanitize_text(new.body);
  return new;
end;
$$;
drop trigger if exists trg_sanitize_request_messages on public.request_messages;
create trigger trg_sanitize_request_messages
  before insert or update on public.request_messages
  for each row execute function public.sanitize_request_messages();

create or replace function public.sanitize_direct_messages() returns trigger language plpgsql as $$
begin
  new.body := public.sanitize_text(new.body);
  return new;
end;
$$;
drop trigger if exists trg_sanitize_direct_messages on public.direct_messages;
create trigger trg_sanitize_direct_messages
  before insert or update on public.direct_messages
  for each row execute function public.sanitize_direct_messages();

create or replace function public.sanitize_social_posts() returns trigger language plpgsql as $$
begin
  new.content := public.sanitize_text(new.content);
  return new;
end;
$$;
drop trigger if exists trg_sanitize_social_posts on public.social_posts;
create trigger trg_sanitize_social_posts
  before insert or update on public.social_posts
  for each row execute function public.sanitize_social_posts();

create or replace function public.sanitize_social_comments() returns trigger language plpgsql as $$
begin
  new.content := public.sanitize_text(new.content);
  return new;
end;
$$;
drop trigger if exists trg_sanitize_social_comments on public.social_comments;
create trigger trg_sanitize_social_comments
  before insert or update on public.social_comments
  for each row execute function public.sanitize_social_comments();

create or replace function public.sanitize_requests() returns trigger language plpgsql as $$
begin
  new.title := public.sanitize_text(new.title);
  new.description := public.sanitize_text(new.description);
  return new;
end;
$$;
drop trigger if exists trg_sanitize_requests on public.requests;
create trigger trg_sanitize_requests
  before insert or update on public.requests
  for each row execute function public.sanitize_requests();

-- ============================================================
-- 4) Realtime: profiles was never added to the publication, so the new
--    mobile auth-guard subscription (force sign-out on remote suspension
--    or role change) would otherwise never receive anything.
-- ============================================================
-- Guarded: ALTER PUBLICATION ... ADD TABLE errors outright if the table is
-- already a member (e.g. added once via the Supabase dashboard's Realtime
-- toggle rather than through a migration) — this repo has hit that exact
-- class of drift before, so check first instead of assuming.
do $pub$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'profiles'
  ) then
    execute 'alter publication supabase_realtime add table public.profiles';
  end if;
end
$pub$;

-- ============================================================
-- 5) Indexes for the request queue and the social feed's hot paths.
--    (Corrections vs. the originally-suggested index list: there is no
--    `messages` table — the real equivalent, chat_messages(room_id,
--    created_at), already exists as chat_messages_room_created_idx; and
--    service_employees has no category_id column to index — its two
--    existing single-column indexes already cover its real access
--    patterns. Adding either as literally specified would either be a
--    pointless duplicate or fail outright, so both are skipped here in
--    favor of indexes the schema actually needs.)
create index if not exists idx_requests_status_assigned on public.requests (status, assigned_employee_id);
create index if not exists social_posts_created_idx on public.social_posts (created_at desc);
create index if not exists social_comments_post_created_idx on public.social_comments (post_id, created_at);
create index if not exists social_reactions_post_idx on public.social_reactions (post_id);

notify pgrst, 'reload schema';
