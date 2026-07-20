-- Extends get_founder_stats() with two additions to the founder analytics
-- page:
-- 1. Each employee's existing response-time row also gets their average
--    star rating + rating count, and the array is now ordered by
--    requests_handled (a genuine leaderboard, not just a response-time
--    list) — same key name kept for backward compatibility with the one
--    page that reads it.
-- 2. Revenue distribution: the founder's spec asked for this "by service
--    category," but requests/categories carry no price at all — only the
--    separate products/orders marketplace has real money attached, with
--    no category on products. Grouping by product (paid orders only) is
--    the closest honest, buildable equivalent.
--
-- Return type is still jsonb (only the object's keys/contents change), so
-- create or replace works here — unlike get_active_employee_candidates,
-- this isn't a RETURNS TABLE column-set change.
create or replace function public.get_founder_stats() returns jsonb
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
          count(distinct r.id) as requests_handled,
          (select round(avg(rr.stars)::numeric, 1) from public.request_ratings rr where rr.employee_id = p.id) as avg_stars,
          (select count(*) from public.request_ratings rr where rr.employee_id = p.id) as total_ratings
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
        order by requests_handled desc, avg_stars desc nulls last
      ) t
    ),
    'revenue_by_product', (
      select coalesce(jsonb_agg(row_to_json(rp)), '[]'::jsonb)
      from (
        select pr.title, sum(o.total_price) as revenue
        from public.orders o
        join public.products pr on pr.id = o.product_id
        where o.payment_status = 'paid'
        group by pr.title
        order by revenue desc
      ) rp
    )
  );
end;
$$;
