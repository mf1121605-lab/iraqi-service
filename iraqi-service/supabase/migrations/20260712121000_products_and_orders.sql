-- Minimal catalog + order-intent tables backing the Customer Hub's "Deals"
-- section (student textbooks/study guides). No payment gateway wiring yet
-- — "Direct Order" just records intent; ZainCash integration is a later
-- step per the roadmap, at which point payment_status starts moving.
create table public.products (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  price numeric(12, 2) not null,
  discount_price numeric(12, 2),
  image_path text,
  is_active boolean not null default true,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_discount_lower check (discount_price is null or discount_price <= price)
);

create index products_active_idx on public.products (is_active);

create trigger trg_products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

create trigger trg_audit_products
after insert or update or delete on public.products
for each row execute function public.fn_audit_log_generic();

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id),
  product_id uuid not null references public.products (id),
  quantity int not null default 1,
  unit_price numeric(12, 2) not null,
  total_price numeric(12, 2) not null,
  status text not null default 'pending',
  payment_status text not null default 'unpaid',
  created_at timestamptz not null default now(),
  constraint orders_quantity_positive check (quantity > 0),
  constraint orders_status_valid check (status in ('pending', 'confirmed', 'cancelled')),
  constraint orders_payment_status_valid check (payment_status in ('unpaid', 'pending', 'paid', 'failed'))
);

create index orders_customer_idx on public.orders (customer_id);

alter table public.products enable row level security;

create policy products_select_active_public
  on public.products for select
  to anon, authenticated
  using (is_active = true);

create policy products_select_staff_all
  on public.products for select
  to authenticated
  using (public.is_staff() or public.is_co_admin());

create policy products_write_founder
  on public.products for all
  to authenticated
  using (public.is_founder())
  with check (public.is_founder());

alter table public.orders enable row level security;

create policy orders_select_own_or_staff
  on public.orders for select
  to authenticated
  using (customer_id = auth.uid() or public.is_staff() or public.is_co_admin());

create policy orders_insert_customer_only
  on public.orders for insert
  to authenticated
  with check (public.current_role() = 'customer' and customer_id = auth.uid());

-- Only staff move an order along (confirm/cancel/payment status); no
-- customer edits after placing it.
create policy orders_update_staff
  on public.orders for update
  to authenticated
  using (public.is_staff() or public.is_co_admin())
  with check (public.is_staff() or public.is_co_admin());
