-- last_active_at is deliberately excluded from the client SELECT grant
-- (20260718172700_last_active_at.sql) so a user can never read anyone's
-- raw timestamp directly. The request-chat screen still needs to show a
-- live active/inactive badge for the assigned employee, so this exposes
-- only the derived boolean via a security-definer RPC — same pattern
-- already used by get_active_employee_candidates for the same reason.
create function public.get_employee_online_status(p_employee_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(last_active_at > now() - interval '15 minutes', false)
  from public.profiles
  where id = p_employee_id and role = 'employee';
$$;

grant execute on function public.get_employee_online_status(uuid) to authenticated;
