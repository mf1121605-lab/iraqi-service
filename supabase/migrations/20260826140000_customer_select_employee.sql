-- The mobile matching screen lets a customer tap a specific employee
-- candidate card to pick them (checkmark animation, then chat). That
-- currently does a plain client-side `update requests set
-- assigned_employee_id = ...` — but requests_update_staff (see
-- 20260726120000_remove_category_routing_restriction.sql) only allows
-- the assigned employee / founder / co_admin / an unassigned-claiming
-- employee to update a request. A customer is never in that policy's
-- USING clause, so every one of those taps has always been silently
-- rejected by RLS (0 rows updated, no error) — the request stayed
-- unassigned no matter which card was tapped.
--
-- This function grants that one specific, narrow write via security
-- definer while re-implementing the exact same safety invariant the
-- employee-claim race already relies on: the assignment only succeeds
-- if the request is still unclaimed (assigned_employee_id is null) and
-- belongs to the calling customer. If an employee claims it first, this
-- returns null and the app can show "already matched" instead of lying
-- about a successful pick.
create function public.customer_select_employee(p_request_id uuid, p_employee_id uuid)
returns public.requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result public.requests;
begin
  update public.requests
  set assigned_employee_id = p_employee_id,
      status = 'in_review'
  where id = p_request_id
    and customer_id = auth.uid()
    and assigned_employee_id is null
  returning * into v_result;

  return v_result;
end;
$$;

grant execute on function public.customer_select_employee(uuid, uuid) to authenticated;
