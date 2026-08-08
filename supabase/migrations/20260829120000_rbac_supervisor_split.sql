-- RBAC restructuring: split the founder's full-control panel from a
-- simplified supervisor/employee panel, add explicit accept/reject on
-- requests (replacing the old instant-claim-only model), scope which
-- requests a supervisor can even see to the categories/services they're
-- assigned to, and tighten several admin/moderation RLS write policies
-- that had been left open to every employee via is_staff().

-- ============================================================
-- 1. profiles: qualification + is_active
-- ============================================================
alter table public.profiles add column if not exists qualification text;
alter table public.profiles add column if not exists is_active boolean not null default true;

-- Both are self-service fields (edited from the supervisor's own settings
-- screen), so they join the existing non-sensitive column grant rather
-- than requiring a server-only API route.
revoke update on public.profiles from authenticated;
grant update (
  given_name, father_name, grandfather_name, family_name,
  avatar_key, specialization, active_services, phone, email,
  qualification, is_active
) on public.profiles to authenticated;

-- ============================================================
-- 2. request_declines — records a supervisor explicitly rejecting a
--    request, so it drops out of their own queue without touching the
--    request's visibility to any other eligible supervisor.
-- ============================================================
create table public.request_declines (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests (id) on delete cascade,
  employee_id uuid not null references public.profiles (id) on delete cascade,
  reason text,
  created_at timestamptz not null default now(),
  unique (request_id, employee_id)
);

create index request_declines_request_idx on public.request_declines (request_id);

alter table public.request_declines enable row level security;

create policy request_declines_select_own_or_staff
  on public.request_declines for select
  to authenticated
  using (employee_id = auth.uid() or public.is_founder() or public.is_co_admin());

-- No INSERT/UPDATE policy: rows are only ever written by decline_request()
-- below (SECURITY DEFINER), the same "no direct client insert" pattern
-- already used for notifications and request_status_history.

-- ============================================================
-- 3. employee_can_serve_request — shared eligibility check used by both
--    the requests RLS policies and the accept/reject RPCs, so the two
--    can never drift apart. Mirrors the routing already used by
--    fn_notify_new_request (20260828170000): a service with explicit
--    service_employees assignments restricts to that set; otherwise
--    fall back to the employee's active_services matching the category.
-- ============================================================
create or replace function public.employee_can_serve_request(
  p_employee_id uuid,
  p_category text,
  p_service_id uuid
) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce((select p.is_active from public.profiles p where p.id = p_employee_id), false)
    and (
      case
        when p_service_id is not null and exists (
          select 1 from public.service_employees se where se.service_id = p_service_id
        ) then exists (
          select 1 from public.service_employees se
          where se.service_id = p_service_id and se.employee_id = p_employee_id
        )
        else exists (
          select 1 from public.profiles p
          where p.id = p_employee_id and p_category = any(p.active_services)
        )
      end
    );
$$;

grant execute on function public.employee_can_serve_request(uuid, text, uuid) to authenticated;

-- ============================================================
-- 4. requests RLS — a supervisor now only sees/claims an unassigned
--    request when they're actually eligible for its category/service,
--    and no longer sees one they've already declined.
-- ============================================================
drop policy if exists requests_select_participants on public.requests;
drop policy if exists requests_update_staff on public.requests;

create policy requests_select_participants
  on public.requests for select
  to authenticated
  using (
    customer_id = auth.uid()
    or assigned_employee_id = auth.uid()
    or public.is_founder()
    or public.is_co_admin()
    or (
      public.current_role() = 'employee'
      and assigned_employee_id is null
      and public.employee_can_serve_request(auth.uid(), category, service_id)
      and not exists (
        select 1 from public.request_declines d
        where d.request_id = requests.id and d.employee_id = auth.uid()
      )
    )
  );

create policy requests_update_staff
  on public.requests for update
  to authenticated
  using (
    assigned_employee_id = auth.uid()
    or public.is_founder()
    or public.is_co_admin()
    or (
      public.current_role() = 'employee'
      and assigned_employee_id is null
      and public.employee_can_serve_request(auth.uid(), category, service_id)
    )
  )
  with check (
    assigned_employee_id = auth.uid()
    or public.is_founder()
    or public.is_co_admin()
    or public.current_role() = 'employee'
  );

-- ============================================================
-- 5. accept_request / decline_request — the supervisor dashboard's two
--    explicit buttons. The customer never picks a specific supervisor
--    (confirmed unchanged from the existing system) — every unassigned
--    request stays in the organic queue, visible to every supervisor
--    eligible for its category/service, and whichever one accepts it
--    first takes it.
--
--    Accepting does NOT spin up a separate direct_message_threads row —
--    the customer<->employee chat for a request already exists the
--    instant assigned_employee_id is set (request_messages, already
--    RLS-scoped to the two participants) and the customer is already
--    notified of the status change by the existing
--    fn_log_request_status_change trigger. Adding a second, general-DM
--    thread here would just duplicate that channel and clutter the
--    founder's DM inbox with one entry per accepted request.
-- ============================================================
create or replace function public.accept_request(p_request_id uuid)
returns public.requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req public.requests;
begin
  select * into v_req from public.requests where id = p_request_id for update;
  if v_req.id is null then
    raise exception 'request not found';
  end if;

  if v_req.assigned_employee_id is not null and v_req.assigned_employee_id <> auth.uid() then
    raise exception 'already claimed by another employee';
  end if;

  if v_req.assigned_employee_id is null then
    if not public.employee_can_serve_request(auth.uid(), v_req.category, v_req.service_id) then
      raise exception 'not permitted for this request';
    end if;
    update public.requests
    set assigned_employee_id = auth.uid(), status = 'in_review'
    where id = p_request_id
    returning * into v_req;
  end if;

  return v_req;
end;
$$;

grant execute on function public.accept_request(uuid) to authenticated;

create or replace function public.decline_request(p_request_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req public.requests;
begin
  select * into v_req from public.requests where id = p_request_id for update;
  if v_req.id is null then
    raise exception 'request not found';
  end if;

  if v_req.assigned_employee_id is not null and v_req.assigned_employee_id <> auth.uid() then
    raise exception 'not permitted';
  end if;

  insert into public.request_declines (request_id, employee_id, reason)
  values (p_request_id, auth.uid(), p_reason)
  on conflict (request_id, employee_id) do update set reason = excluded.reason, created_at = now();

  update public.requests
  set assigned_employee_id = null, status = 'submitted'
  where id = p_request_id and assigned_employee_id = auth.uid();
end;
$$;

grant execute on function public.decline_request(uuid, text) to authenticated;

-- ============================================================
-- 6. get_active_employee_candidates — restore real category scoping
--    (dropped in 20260726120000) and add qualification/is_active, per
--    the founder's supervisor-selection card requirement.
-- ============================================================
drop function if exists public.get_active_employee_candidates(text);

create function public.get_active_employee_candidates(p_category text)
returns table (
  id uuid, given_name text, family_name text, avatar_key text, specialization text,
  qualification text, is_verified boolean, is_online boolean, avg_rating numeric, rating_count int
)
language sql stable security definer set search_path = public as $$
  select
    p.id, p.given_name, p.family_name, p.avatar_key, p.specialization, p.qualification, p.is_verified,
    (p.last_active_at is not null and p.last_active_at > now() - interval '15 minutes') as is_online,
    r.avg_rating, r.rating_count
  from public.profiles p
  left join (
    select employee_id, round(avg(stars)::numeric, 1) as avg_rating, count(*) as rating_count
    from public.request_ratings group by employee_id
  ) r on r.employee_id = p.id
  where p.role = 'employee'
    and p.account_status = 'active'
    and p.is_active = true
    and p_category = any(p.active_services);
$$;

grant execute on function public.get_active_employee_candidates(text) to authenticated;

-- ============================================================
-- 7. Tighten moderation/admin write policies that had been left open to
--    every employee via is_staff() — these are the "أدوات الإدارة" the
--    founder wants reserved for founder + co_admin only. Read access is
--    left untouched (a supervisor can still see published news/urgent
--    items; only the ability to create/edit/moderate them is removed).
-- ============================================================

-- news_links (HQ hub)
drop policy if exists news_links_write_staff on public.news_links;
create policy news_links_write_staff
  on public.news_links for all
  to authenticated
  using (public.is_founder() or public.is_co_admin())
  with check (public.is_founder() or public.is_co_admin());

-- hq_service_links
drop policy if exists hq_service_links_write_staff on public.hq_service_links;
create policy hq_service_links_write_staff
  on public.hq_service_links for all
  to authenticated
  using (public.is_founder() or public.is_co_admin())
  with check (public.is_founder() or public.is_co_admin());

-- urgent_news
drop policy if exists urgent_news_write_staff on public.urgent_news;
create policy urgent_news_write_staff
  on public.urgent_news for all
  to authenticated
  using (public.is_founder() or public.is_co_admin())
  with check (public.is_founder() or public.is_co_admin());

-- quick_requests moderation
drop policy if exists quick_requests_update_staff on public.quick_requests;
create policy quick_requests_update_staff
  on public.quick_requests for update
  to authenticated
  using (public.is_founder() or public.is_co_admin())
  with check (public.is_founder() or public.is_co_admin());

-- social_posts: unapproved-post visibility and moderation (approve/reject/pin)
drop policy if exists social_posts_select on public.social_posts;
create policy social_posts_select on public.social_posts for select to authenticated
  using (
    approved = true
    or public.is_founder()
    or public.is_co_admin()
  );

drop policy if exists social_posts_update_staff on public.social_posts;
create policy social_posts_update_staff on public.social_posts for update to authenticated
  using (public.is_founder() or public.is_co_admin())
  with check (public.is_founder() or public.is_co_admin());

-- post_reports
drop policy if exists post_reports_select_staff on public.post_reports;
create policy post_reports_select_staff
  on public.post_reports for select
  to authenticated
  using (public.is_founder() or public.is_co_admin());

drop policy if exists post_reports_update_staff on public.post_reports;
create policy post_reports_update_staff
  on public.post_reports for update
  to authenticated
  using (public.is_founder() or public.is_co_admin())
  with check (public.is_founder() or public.is_co_admin());

drop policy if exists post_reports_delete_staff on public.post_reports;
create policy post_reports_delete_staff
  on public.post_reports for delete
  to authenticated
  using (public.is_founder() or public.is_co_admin());

notify pgrst, 'reload schema';
