-- Quick contextual requests (customer → employee direct channel)
create table public.quick_requests (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  section_name text not null,
  content     text not null,
  status      text not null default 'pending'
                check (status in ('pending', 'accepted', 'rejected')),
  employee_id uuid references public.profiles(id) on delete set null,
  thread_id   uuid references public.direct_message_threads(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index quick_requests_customer_idx on public.quick_requests(customer_id, created_at desc);
create index quick_requests_status_idx   on public.quick_requests(status, created_at desc);

alter table public.quick_requests enable row level security;

-- Customers: read/insert own rows
create policy quick_requests_select_customer
  on public.quick_requests for select
  to authenticated
  using (customer_id = auth.uid() or public.is_staff() or public.is_founder() or public.is_co_admin());

create policy quick_requests_insert_customer
  on public.quick_requests for insert
  to authenticated
  with check (customer_id = auth.uid());

-- Staff can update status/employee_id/thread_id
create policy quick_requests_update_staff
  on public.quick_requests for update
  to authenticated
  using  (public.is_staff() or public.is_founder() or public.is_co_admin())
  with check (public.is_staff() or public.is_founder() or public.is_co_admin());

alter publication supabase_realtime add table public.quick_requests;

-- Chat templates saved per employee (3 stages)
create table public.employee_chat_templates (
  id          uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles(id) on delete cascade,
  stage       text not null check (stage in ('welcome', 'requirements', 'payment')),
  content     text not null,
  updated_at  timestamptz not null default now(),
  unique(employee_id, stage)
);

alter table public.employee_chat_templates enable row level security;

-- Employees can read/write their own templates; founders/co-admins can read all
create policy employee_chat_templates_select
  on public.employee_chat_templates for select
  to authenticated
  using (employee_id = auth.uid() or public.is_founder() or public.is_co_admin());

create policy employee_chat_templates_upsert
  on public.employee_chat_templates for insert
  to authenticated
  with check (employee_id = auth.uid());

create policy employee_chat_templates_update
  on public.employee_chat_templates for update
  to authenticated
  using  (employee_id = auth.uid())
  with check (employee_id = auth.uid());

-- RPC: employee accepts a quick request → creates DM thread, updates row
create function public.accept_quick_request(p_request_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request  public.quick_requests%rowtype;
  v_a_id     uuid;
  v_b_id     uuid;
  v_thread_id uuid;
begin
  select * into v_request from public.quick_requests
  where id = p_request_id and status = 'pending'
  for update;

  if not found then
    raise exception 'quick request not found or already handled';
  end if;

  -- Enforce user_a_id < user_b_id ordering
  v_a_id := least(auth.uid(), v_request.customer_id);
  v_b_id := greatest(auth.uid(), v_request.customer_id);

  insert into public.direct_message_threads (user_a_id, user_b_id)
  values (v_a_id, v_b_id)
  on conflict (user_a_id, user_b_id) do nothing;

  select id into v_thread_id
  from public.direct_message_threads
  where user_a_id = v_a_id and user_b_id = v_b_id;

  update public.quick_requests
  set status      = 'accepted',
      employee_id = auth.uid(),
      thread_id   = v_thread_id
  where id = p_request_id;

  return v_thread_id;
end;
$$;

-- RPC: employee rejects a quick request
create function public.reject_quick_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.quick_requests
  set status = 'rejected'
  where id = p_request_id and status = 'pending';
end;
$$;

-- Allow founder/co-admin to view any DM thread (supervision)
create policy direct_message_threads_select_founder
  on public.direct_message_threads for select
  to authenticated
  using (public.is_founder() or public.is_co_admin());

-- Allow founder/co-admin to read messages in any thread (supervision)
create policy direct_messages_select_founder
  on public.direct_messages for select
  to authenticated
  using (public.is_founder() or public.is_co_admin());
