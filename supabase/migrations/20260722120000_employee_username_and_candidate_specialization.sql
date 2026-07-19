-- Lets a founder create employee accounts with a username+password login
-- (profiles.username already exists/unique from the customer username
-- feature, no schema change needed for that) and closes a pre-existing gap
-- where the "3D Stacked Card Shuffle" candidate preview never actually
-- showed the employee's specialization/degree, because the RPC powering it
-- didn't select that column (only the post-match "winner" query did).
create or replace function public.get_active_employee_candidates(p_category text)
returns table (id uuid, given_name text, family_name text, avatar_key text, specialization text)
language sql stable security definer set search_path = public as $$
  select id, given_name, family_name, avatar_key, specialization
  from public.profiles
  where role = 'employee'
    and account_status = 'active'
    and p_category = any(active_services)
    and last_active_at is not null
    and last_active_at > now() - interval '15 minutes';
$$;
