-- Powers the competitive "first-claim" request matching UI: the actual
-- claim mechanism (assigned_employee_id, requests_update_staff RLS) is
-- unchanged and already race-safe — this only adds what the UI needs on
-- top of it: live updates, a way to preview the candidate pool before a
-- match, a way for the customer to see who won, and a rating table.

-- Both tables already have RLS restricting what a given row-level select
-- returns; realtime respects that, so publishing them only lets each
-- client be *notified* to re-fetch, never see rows they couldn't already
-- query directly.
alter publication supabase_realtime add table public.requests;
alter publication supabase_realtime add table public.request_messages;

-- A customer has no RLS path to read any employee's profile today
-- (profiles_select_self / profiles_select_staff_all only) — needed once a
-- request is claimed, so the customer can see their matched employee's
-- name/avatar/specialization on the request detail + chat page.
create policy profiles_select_assigned_employee
  on public.profiles for select
  to authenticated
  using (
    role = 'employee'
    and exists (
      select 1 from public.requests r
      where r.assigned_employee_id = profiles.id
        and r.customer_id = auth.uid()
    )
  );

-- Deliberately NOT a broader profiles policy: before a request is
-- claimed, the "spinning carousel" needs to preview which employees are
-- currently active for the category, but a customer still has no
-- business reading arbitrary employee profile rows. A narrow
-- SECURITY DEFINER function returns just enough (name + avatar) for the
-- decorative carousel without opening that up.
create function public.get_active_employee_candidates(p_category text)
returns table (id uuid, given_name text, family_name text, avatar_key text)
language sql stable security definer set search_path = public as $$
  select id, given_name, family_name, avatar_key
  from public.profiles
  where role = 'employee'
    and account_status = 'active'
    and p_category = any(active_services)
    and last_active_at is not null
    and last_active_at > now() - interval '15 minutes';
$$;

grant execute on function public.get_active_employee_candidates(text) to authenticated;

create table public.request_ratings (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.requests (id) on delete cascade,
  customer_id uuid not null references public.profiles (id),
  employee_id uuid not null references public.profiles (id),
  stars smallint not null,
  comment text,
  created_at timestamptz not null default now(),
  constraint request_ratings_stars_range check (stars between 1 and 5)
);

create index request_ratings_employee_idx on public.request_ratings (employee_id);

alter table public.request_ratings enable row level security;

create policy request_ratings_select_participants
  on public.request_ratings for select
  to authenticated
  using (
    customer_id = auth.uid()
    or employee_id = auth.uid()
    or public.is_founder()
    or public.is_co_admin()
  );

-- One rating per request, only by that request's own customer, only
-- after the request has actually finished (status has left the
-- in-progress states) — enforced here, not just in the UI, since this is
-- a plain client insert.
create policy request_ratings_insert_own_finished_request
  on public.request_ratings for insert
  to authenticated
  with check (
    customer_id = auth.uid()
    and exists (
      select 1 from public.requests r
      where r.id = request_id
        and r.customer_id = auth.uid()
        and r.assigned_employee_id = employee_id
        and r.status in ('approved', 'rejected')
    )
  );

alter publication supabase_realtime add table public.request_ratings;
