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

-- coalesce(..., false) is not decorative: when auth.uid() has no matching
-- profile (anonymous requests, or any uid that doesn't resolve), the
-- comparisons above evaluate to SQL NULL, not false. That's harmless
-- inside an RLS USING clause (Postgres denies on non-TRUE, so it fails
-- closed either way) but it is NOT harmless in a plpgsql
-- `if not is_founder() then raise exception`: PL/pgSQL treats a NULL
-- condition the same as false, so `if not null` -> `if null` -> the
-- branch is skipped and the exception never fires. Every caller of these
-- three functions must get a definite boolean.
create function public.is_founder() returns boolean
language sql stable as $$
  select coalesce(public.current_role() = 'founder', false);
$$;

create function public.is_co_admin() returns boolean
language sql stable as $$
  select coalesce(public.current_admin_level() = 'co_admin', false);
$$;

-- "Staff" = founder or employee, i.e. the two roles that can answer
-- customers per the permission matrix.
create function public.is_staff() returns boolean
language sql stable as $$
  select coalesce(public.current_role() in ('founder', 'employee'), false);
$$;
