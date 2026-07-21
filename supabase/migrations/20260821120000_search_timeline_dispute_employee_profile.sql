-- 1. Dispute columns on requests
alter table public.requests
  add column if not exists is_disputed boolean not null default false,
  add column if not exists dispute_reason text;

-- 2. Security-definer function: file a dispute
create or replace function public.file_dispute(p_request_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
  v_status text;
  v_is_disputed boolean;
begin
  select customer_id, status, is_disputed
    into v_customer_id, v_status, v_is_disputed
    from public.requests
    where id = p_request_id;

  if v_customer_id is null then
    raise exception 'request not found';
  end if;
  if v_customer_id <> auth.uid() then
    raise exception 'not your request';
  end if;
  if v_status not in ('approved', 'rejected') then
    raise exception 'dispute only allowed on finished requests';
  end if;
  if v_is_disputed then
    raise exception 'dispute already filed';
  end if;

  update public.requests
    set is_disputed = true,
        dispute_reason = trim(p_reason)
    where id = p_request_id;

  -- Notify all founders
  insert into public.notifications (user_id, title, body, link)
    select id, 'نزاع جديد', 'تم تقديم نزاع على طلب بواسطة عميل', '/founder/requests'
    from public.profiles
    where role = 'founder';
end;
$$;

grant execute on function public.file_dispute(uuid, text) to authenticated;

-- 3. Security-definer function: get employee public profile
create or replace function public.get_employee_public_profile(p_employee_id uuid)
returns table (
  id uuid,
  given_name text,
  family_name text,
  avatar_key text,
  specialization text,
  is_verified boolean,
  avg_stars numeric,
  rating_count bigint,
  completed_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.given_name,
    p.family_name,
    p.avatar_key,
    p.specialization,
    coalesce(p.is_verified, false) as is_verified,
    coalesce(avg(r.stars), 0)     as avg_stars,
    count(r.id)                    as rating_count,
    count(req.id) filter (where req.status = 'approved') as completed_count
  from public.profiles p
  left join public.request_ratings r on r.employee_id = p.id
  left join public.requests req on req.assigned_employee_id = p.id
  where p.id = p_employee_id
    and p.role = 'employee'
  group by p.id;
$$;

grant execute on function public.get_employee_public_profile(uuid) to authenticated;

-- 4. Security-definer search function
create or replace function public.search_content(p_query text)
returns table (
  id text,
  result_type text,
  title_ar text,
  title_ckb text,
  subtitle_ar text,
  subtitle_ckb text,
  href text
)
language sql
stable
security definer
set search_path = public
as $$
  -- categories
  select
    c.id::text,
    'category',
    c.label_ar,
    coalesce(c.label_ckb, c.label_ar),
    null,
    null,
    '/customer/dashboard'
  from public.categories c
  where c.is_active = true
    and c.label_ar ilike '%' || p_query || '%'

  union all

  -- requests owned by the caller
  select
    req.id::text,
    'request',
    req.title,
    req.title,
    req.status,
    req.status,
    '/customer/requests/' || req.id
  from public.requests req
  where req.customer_id = auth.uid()
    and req.title ilike '%' || p_query || '%'

  limit 30;
$$;

grant execute on function public.search_content(text) to authenticated;
