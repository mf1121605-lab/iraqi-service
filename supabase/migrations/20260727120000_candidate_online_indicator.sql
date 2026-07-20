-- Adds a live online/offline flag back to the candidate shuffle — every
-- active employee still shows regardless of presence (per the founder's
-- prior request), this only adds a visual signal distinguishing who's
-- currently online from who isn't, it doesn't filter anyone out.
drop function if exists public.get_active_employee_candidates(text);

create function public.get_active_employee_candidates(p_category text)
returns table (id uuid, given_name text, family_name text, avatar_key text, specialization text, is_verified boolean, is_online boolean)
language sql stable security definer set search_path = public as $$
  select
    id, given_name, family_name, avatar_key, specialization, is_verified,
    (last_active_at is not null and last_active_at > now() - interval '15 minutes') as is_online
  from public.profiles
  where role = 'employee'
    and account_status = 'active';
$$;

grant execute on function public.get_active_employee_candidates(text) to authenticated;
