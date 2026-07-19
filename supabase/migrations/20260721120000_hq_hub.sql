-- Internal HQ: a staff-only chat room, a real-time "new request" alert
-- feeding the existing push-notification pipeline, and a manually-curated
-- news/application-links panel the founder/employees publish to
-- customers on demand.

-- ---------------------------------------------------------------
-- 1. Staff-only chat room
-- ---------------------------------------------------------------
alter table public.chat_rooms add column is_staff_only boolean not null default false;

drop policy chat_rooms_select_public on public.chat_rooms;
create policy chat_rooms_select_public
  on public.chat_rooms for select
  to anon, authenticated
  using (not is_staff_only or public.is_staff() or public.is_co_admin());

drop policy chat_messages_select_authenticated on public.chat_messages;
create policy chat_messages_select_authenticated
  on public.chat_messages for select
  to authenticated
  using (
    exists (
      select 1 from public.chat_rooms cr
      where cr.id = chat_messages.room_id
        and (not cr.is_staff_only or public.is_staff() or public.is_co_admin())
    )
  );

drop policy chat_messages_insert_authenticated on public.chat_messages;
create policy chat_messages_insert_authenticated
  on public.chat_messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.chat_rooms cr
      where cr.id = room_id
        and (not cr.is_staff_only or public.is_staff() or public.is_co_admin())
    )
  );

insert into public.chat_rooms (slug, name_ar, name_ckb, is_active, is_staff_only)
values ('hq', 'المقر الداخلي', 'بارەگای ناوخۆیی', true, true);

-- ---------------------------------------------------------------
-- 2. New-request alert -> feeds the existing notifications/push pipeline
--    (trg_dispatch_push_notification already fires on any notifications
--    insert, so this is the only piece missing — nothing about push
--    delivery itself needs to change).
-- ---------------------------------------------------------------
create function public.fn_notify_new_request() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, title, body, link)
  select p.id, 'طلب جديد بانتظار الاستلام', new.title, '/employee/dashboard'
  from public.profiles p
  where p.role = 'employee'
    and p.account_status = 'active'
    and new.category = any(p.active_services);

  return new;
end;
$$;

create trigger trg_notify_new_request
after insert on public.requests
for each row execute function public.fn_notify_new_request();

-- ---------------------------------------------------------------
-- 3. News & application links — manually curated, not auto-scraped (see
--    the founder-facing explanation for why: no persistent background
--    worker on this hosting, and scraping Facebook specifically breaks
--    its terms of service). is_published gates customer visibility.
-- ---------------------------------------------------------------
create table public.news_links (
  id uuid primary key default gen_random_uuid(),
  title_ar text not null,
  title_ckb text,
  url text not null,
  source text,
  is_published boolean not null default false,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index news_links_published_idx on public.news_links (is_published, created_at desc);

create trigger trg_news_links_updated_at
before update on public.news_links
for each row execute function public.set_updated_at();

alter table public.news_links enable row level security;

create policy news_links_select_published_public
  on public.news_links for select
  to anon, authenticated
  using (is_published = true);

create policy news_links_select_staff_all
  on public.news_links for select
  to authenticated
  using (public.is_staff() or public.is_co_admin());

create policy news_links_write_staff
  on public.news_links for all
  to authenticated
  using (public.is_staff() or public.is_co_admin())
  with check (public.is_staff() or public.is_co_admin());

alter publication supabase_realtime add table public.news_links;
