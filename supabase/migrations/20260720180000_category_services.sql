-- Founder-managed predefined service list per category, shown as a
-- selectable menu on the request form; the customer can also skip it and
-- type a fully custom request in the free-text details box instead.
create table public.category_services (
  id uuid primary key default gen_random_uuid(),
  category_key text not null references public.categories (key) on delete cascade,
  label_ar text not null,
  label_ckb text not null,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index category_services_category_idx on public.category_services (category_key, sort_order);

create trigger trg_category_services_updated_at
before update on public.category_services
for each row execute function public.set_updated_at();

alter table public.category_services enable row level security;

create policy category_services_select_active_public
  on public.category_services for select
  to anon, authenticated
  using (is_active = true);

create policy category_services_select_staff_all
  on public.category_services for select
  to authenticated
  using (public.is_staff() or public.is_co_admin());

create policy category_services_write_founder
  on public.category_services for all
  to authenticated
  using (public.is_founder())
  with check (public.is_founder());

alter publication supabase_realtime add table public.category_services;
