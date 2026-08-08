-- Surfaces average rating on the employee-candidate shuffle cards
-- (get_active_employee_candidates already exposes is_verified/is_online
-- the same way — this follows the identical drop+recreate pattern since
-- Postgres won't let CREATE OR REPLACE change a function's return type).
drop function if exists public.get_active_employee_candidates(text);

create function public.get_active_employee_candidates(p_category text)
returns table (
  id uuid, given_name text, family_name text, avatar_key text, specialization text,
  is_verified boolean, is_online boolean, avg_rating numeric, rating_count int
)
language sql stable security definer set search_path = public as $$
  select
    p.id, p.given_name, p.family_name, p.avatar_key, p.specialization, p.is_verified,
    (p.last_active_at is not null and p.last_active_at > now() - interval '15 minutes') as is_online,
    r.avg_rating, r.rating_count
  from public.profiles p
  left join (
    select employee_id, round(avg(stars)::numeric, 1) as avg_rating, count(*) as rating_count
    from public.request_ratings
    group by employee_id
  ) r on r.employee_id = p.id
  where p.role = 'employee'
    and p.account_status = 'active';
$$;

grant execute on function public.get_active_employee_candidates(text) to authenticated;
