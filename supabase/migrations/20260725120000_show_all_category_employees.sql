-- Customer-facing request matching now shows every active employee in the
-- requested category during the card shuffle, not only ones who happen to
-- be online in the last 15 minutes — the founder wants the shuffle to
-- reflect full team capacity, not just who's currently logged in. The
-- actual claim mechanism (assigned_employee_id, first-to-claim wins via
-- requests_update_staff RLS) is completely unaffected: only an employee
-- who actually opens the app can claim a request, this only changes who
-- is shown during the decorative preview.
drop function if exists public.get_active_employee_candidates(text);

create function public.get_active_employee_candidates(p_category text)
returns table (id uuid, given_name text, family_name text, avatar_key text, specialization text, is_verified boolean)
language sql stable security definer set search_path = public as $$
  select id, given_name, family_name, avatar_key, specialization, is_verified
  from public.profiles
  where role = 'employee'
    and account_status = 'active'
    and p_category = any(active_services);
$$;

grant execute on function public.get_active_employee_candidates(text) to authenticated;
