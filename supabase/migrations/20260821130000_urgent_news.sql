-- Urgent / breaking news posts — visible to all authenticated users when
-- is_active=true, writable only by staff (founder + employees).
create table public.urgent_news (
  id          uuid primary key default gen_random_uuid(),
  title_ar    text not null,
  title_ckb   text,
  content_ar  text,
  content_ckb text,
  image_url   text,
  created_by  uuid references public.profiles(id),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index urgent_news_active_idx on public.urgent_news(is_active, created_at desc);

create trigger trg_urgent_news_updated_at
  before update on public.urgent_news
  for each row execute function public.set_updated_at();

alter table public.urgent_news enable row level security;

create policy urgent_news_select_active
  on public.urgent_news for select
  to anon, authenticated
  using (is_active = true);

create policy urgent_news_select_staff
  on public.urgent_news for select
  to authenticated
  using (public.is_staff() or public.is_founder() or public.is_co_admin());

create policy urgent_news_write_staff
  on public.urgent_news for all
  to authenticated
  using  (public.is_staff() or public.is_founder() or public.is_co_admin())
  with check (public.is_staff() or public.is_founder() or public.is_co_admin());

alter publication supabase_realtime add table public.urgent_news;
