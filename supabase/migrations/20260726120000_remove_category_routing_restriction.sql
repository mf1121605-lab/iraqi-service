-- Every request is now visible to every active employee, not only ones
-- who had self-selected that category in "active_services" — the founder
-- wants any employee to see any incoming request and decide themselves
-- whether to approve it, rather than pre-filtering by specialization.
-- The underlying claim mechanism (first employee to set
-- assigned_employee_id wins) is unchanged, only who's eligible to try.
drop policy requests_select_participants on public.requests;
drop policy requests_update_staff on public.requests;

create policy requests_select_participants
  on public.requests for select
  to authenticated
  using (
    customer_id = auth.uid()
    or assigned_employee_id = auth.uid()
    or public.is_founder()
    or public.is_co_admin()
    or (
      public.current_role() = 'employee'
      and assigned_employee_id is null
    )
  );

create policy requests_update_staff
  on public.requests for update
  to authenticated
  using (
    assigned_employee_id = auth.uid()
    or public.is_founder()
    or public.is_co_admin()
    or (
      public.current_role() = 'employee'
      and assigned_employee_id is null
    )
  )
  with check (
    assigned_employee_id = auth.uid()
    or public.is_founder()
    or public.is_co_admin()
    or public.current_role() = 'employee'
  );

-- New-request notifications now reach every active employee, not only
-- ones whose active_services matched the request's category.
create or replace function public.fn_notify_new_request() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, title, body, link)
  select p.id, 'طلب جديد بانتظار الاستلام', new.title, '/employee/dashboard'
  from public.profiles p
  where p.role = 'employee'
    and p.account_status = 'active';

  return new;
end;
$$;

-- The customer-facing candidate shuffle also drops the category filter:
-- every active employee is shown as a candidate for every category now.
drop function if exists public.get_active_employee_candidates(text);

create function public.get_active_employee_candidates(p_category text)
returns table (id uuid, given_name text, family_name text, avatar_key text, specialization text, is_verified boolean)
language sql stable security definer set search_path = public as $$
  select id, given_name, family_name, avatar_key, specialization, is_verified
  from public.profiles
  where role = 'employee'
    and account_status = 'active';
$$;

grant execute on function public.get_active_employee_candidates(text) to authenticated;
