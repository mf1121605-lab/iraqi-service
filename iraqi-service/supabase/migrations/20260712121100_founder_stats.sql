-- Backs /founder/stats: request counts by category/status, plus each
-- employee's average time-to-first-response (first status_history row
-- after submission). Computed in SQL rather than pulled client-side and
-- aggregated in JS, since that would mean shipping every request row to
-- the browser just to count them.
--
-- SECURITY DEFINER means this bypasses RLS to read across every request/
-- profile, so it must enforce the founder-only check itself in the
-- function body — granting EXECUTE alone would let any authenticated
-- user call it and read everyone's stats.
create function public.get_founder_stats() returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_founder() then
    raise exception 'founder only';
  end if;

  return jsonb_build_object(
    'requests_by_status', (
      select coalesce(jsonb_object_agg(status, request_count), '{}'::jsonb)
      from (
        select status, count(*) as request_count
        from public.requests
        group by status
      ) s
    ),
    'requests_by_category', (
      select coalesce(jsonb_object_agg(category, request_count), '{}'::jsonb)
      from (
        select category, count(*) as request_count
        from public.requests
        group by category
      ) c
    ),
    'total_requests', (select count(*) from public.requests),
    'total_employees', (select count(*) from public.profiles where role = 'employee'),
    'total_customers', (select count(*) from public.profiles where role = 'customer'),
    'employee_avg_response_minutes', (
      select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      from (
        select
          p.id as employee_id,
          p.given_name,
          p.family_name,
          round(avg(extract(epoch from (first_response.created_at - r.created_at)) / 60)::numeric, 1)
            as avg_minutes,
          count(distinct r.id) as requests_handled
        from public.profiles p
        join public.requests r on r.assigned_employee_id = p.id
        join lateral (
          select created_at
          from public.request_status_history h
          where h.request_id = r.id
          order by h.created_at
          limit 1
        ) first_response on true
        where p.role = 'employee'
        group by p.id, p.given_name, p.family_name
      ) t
    )
  );
end;
$$;

grant execute on function public.get_founder_stats() to authenticated;
