-- Founder-controlled employee verification: a manual "موثّق" toggle the
-- founder flips after reviewing an employee's certificate/ID off-platform,
-- surfaced to customers as a blue badge during the 3D card-shuffle
-- matching preview.
alter table public.profiles add column is_verified boolean not null default false;

-- get_active_employee_candidates' OUT columns are changing again, and
-- Postgres rejects `create or replace` across an OUT-column change — drop
-- first so this can run as a single paste.
drop function if exists public.get_active_employee_candidates(text);

create function public.get_active_employee_candidates(p_category text)
returns table (id uuid, given_name text, family_name text, avatar_key text, specialization text, is_verified boolean)
language sql stable security definer set search_path = public as $$
  select id, given_name, family_name, avatar_key, specialization, is_verified
  from public.profiles
  where role = 'employee'
    and account_status = 'active'
    and p_category = any(active_services)
    and last_active_at is not null
    and last_active_at > now() - interval '15 minutes';
$$;
