-- Expands search_content beyond categories + own requests to also cover
-- employees (public directory, matches what the matching/search screens
-- already expose), approved social posts, and the caller's own request
-- messages — the security-definer function still self-filters to rows
-- the caller is actually allowed to see (own messages, approved posts,
-- active employees only) since it bypasses RLS.
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
    c.id::text, 'category', c.label_ar, coalesce(c.label_ckb, c.label_ar), null, null,
    '/customer/dashboard'
  from public.categories c
  where c.is_active = true and c.label_ar ilike '%' || p_query || '%'

  union all

  -- requests owned by the caller
  select
    req.id::text, 'request', req.title, req.title, req.status, req.status,
    '/customer/requests/' || req.id
  from public.requests req
  where req.customer_id = auth.uid() and req.title ilike '%' || p_query || '%'

  union all

  -- active employees (public directory)
  select
    p.id::text, 'employee',
    coalesce(p.given_name || ' ' || p.family_name, p.given_name, 'موظف'),
    coalesce(p.given_name || ' ' || p.family_name, p.given_name, 'موظف'),
    p.specialization, p.specialization,
    '/customer/employee/' || p.id
  from public.profiles p
  where p.role = 'employee'
    and p.account_status = 'active'
    and (
      p.given_name ilike '%' || p_query || '%'
      or p.family_name ilike '%' || p_query || '%'
      or p.specialization ilike '%' || p_query || '%'
    )

  union all

  -- approved posts (news feed)
  select
    sp.id::text, 'post', left(sp.content, 60), left(sp.content, 60), null, null,
    '/customer/news?postId=' || sp.id
  from public.social_posts sp
  where sp.approved = true and sp.content ilike '%' || p_query || '%'

  union all

  -- the caller's own request-chat messages
  select
    rm.id::text, 'message', left(rm.body, 60), left(rm.body, 60), req.title, req.title,
    '/customer/requests/' || rm.request_id
  from public.request_messages rm
  join public.requests req on req.id = rm.request_id
  where rm.body is not null
    and rm.body ilike '%' || p_query || '%'
    and (req.customer_id = auth.uid() or req.assigned_employee_id = auth.uid())

  limit 40;
$$;

grant execute on function public.search_content(text) to authenticated;

NOTIFY pgrst, 'reload schema';
