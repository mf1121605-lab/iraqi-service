-- Feature 2: HQ links box + live order-alert cards inside the HQ chat.

-- ---------------------------------------------------------------
-- 1. صندوق الروابط — staff-curated list of per-service links shown as a
--    horizontal expandable bar at the top of the HQ room.
-- ---------------------------------------------------------------
create table public.hq_service_links (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  url text not null,
  sort_order int not null default 0,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

alter table public.hq_service_links enable row level security;

create policy hq_service_links_select_staff
  on public.hq_service_links for select
  to authenticated
  using (public.is_staff() or public.is_founder() or public.is_co_admin());

create policy hq_service_links_write_staff
  on public.hq_service_links for all
  to authenticated
  using (public.is_staff() or public.is_founder() or public.is_co_admin())
  with check (public.is_staff() or public.is_founder() or public.is_co_admin());

alter publication supabase_realtime add table public.hq_service_links;

-- ---------------------------------------------------------------
-- 2. order_alert message type — a live claimable card posted into the HQ
--    room whenever a new request comes in. Claiming itself still goes
--    through the existing requests.assigned_employee_id update (same
--    path the employee dashboard's claim button already uses) — the
--    card just reads/reflects that column live via Realtime, it isn't a
--    parallel claim mechanism.
-- ---------------------------------------------------------------
ALTER TABLE public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_message_type_check;
ALTER TABLE public.chat_messages ADD CONSTRAINT chat_messages_message_type_check
  CHECK (message_type IN ('text', 'sticker', 'image', 'voice', 'order_alert'));

create or replace function public.fn_notify_new_request() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hq_room_id uuid;
  v_sender_id uuid;
  v_customer_name text;
begin
  insert into public.notifications (user_id, title, body, link)
  select p.id, 'طلب جديد بانتظار الاستلام', new.title, '/employee/dashboard'
  from public.profiles p
  where p.role = 'employee'
    and p.account_status = 'active'
    and new.category = any(p.active_services);

  select id into v_hq_room_id from public.chat_rooms where slug = 'hq' limit 1;
  select id into v_sender_id from public.profiles where role = 'founder' limit 1;
  select coalesce(given_name || ' ' || family_name, given_name, 'زبون') into v_customer_name
  from public.profiles where id = new.customer_id;

  if v_hq_room_id is not null and v_sender_id is not null then
    insert into public.chat_messages (room_id, sender_id, body, message_type)
    values (
      v_hq_room_id,
      v_sender_id,
      jsonb_build_object(
        'request_id', new.id,
        'category', new.category,
        'title', new.title,
        'customer_name', v_customer_name
      )::text,
      'order_alert'
    );
  end if;

  return new;
end;
$$;
