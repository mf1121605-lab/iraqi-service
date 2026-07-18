-- Security/audit trail of login events (IP + user agent + timestamp).
-- Written only by the service-role key from src/pages/api/auth/log-login.js
-- after independently verifying the caller's session token — never trust a
-- client-supplied user id here.
create table public.login_audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  ip_address text,
  user_agent text,
  logged_at timestamptz not null default now()
);

create index login_audit_logs_user_id_idx on public.login_audit_logs (user_id);

alter table public.login_audit_logs enable row level security;
