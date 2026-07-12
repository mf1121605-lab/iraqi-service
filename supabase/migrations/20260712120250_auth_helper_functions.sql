-- SECURITY DEFINER is required here, not optional: a policy on `profiles`
-- that queries `profiles` again (even through a function) causes Postgres
-- to report "infinite recursion detected in policy for relation profiles".
-- Making these two base lookups SECURITY DEFINER lets them read the row
-- directly, bypassing RLS, which breaks the recursion. Everything else
-- below is a thin SQL wrapper around these two and stays SECURITY INVOKER.
create function public.current_role() returns user_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create function public.current_admin_level() returns text
language sql stable security definer set search_path = public as $$
  select admin_level from public.profiles where id = auth.uid();
$$;

create function public.current_active_services() returns service_category[]
language sql stable security definer set search_path = public as $$
  select active_services from public.profiles where id = auth.uid();
$$;

create function public.is_founder() returns boolean
language sql stable as $$
  select public.current_role() = 'founder';
$$;

create function public.is_co_admin() returns boolean
language sql stable as $$
  select public.current_admin_level() = 'co_admin';
$$;

-- "Staff" = founder or employee, i.e. the two roles that can answer
-- customers per the permission matrix.
create function public.is_staff() returns boolean
language sql stable as $$
  select public.current_role() in ('founder', 'employee');
$$;
