-- Dynamic service sections, mapped onto the schema this project actually has.
--
-- IMPORTANT — why this does not match the proposed schema verbatim:
--
--   * categories ALREADY EXISTS with `key text` as its primary key (a stable
--     slug used in URLs and referenced by requests.category and the
--     request-routing RLS policies). Recreating it as `id uuid` would break
--     request routing, claiming, and current_active_services().
--
--   * The proposed media_url/media_type are ALREADY THERE as icon_path and
--     icon_video_url, and the founder's category admin already uploads to
--     both. Adding a second pair would have split the same data in two and
--     silently orphaned everything already uploaded.
--
--   * The proposed `services` table is category_services, which already exists
--     with the same meaning (founder-managed service list per category). It
--     carries bilingual labels rather than a single `title`, so it stays.
--
--   * orders ALREADY EXISTS for the product shop (product_id, total_price,
--     payment_status) and the founder dashboard reads it for revenue. Service
--     submissions are the `requests` table, which already has the customer,
--     category, free-text details, status and assigned employee. A second
--     orders table would split that in two.
--
-- Genuinely new here: service_employees, plus media on categories and an
-- optional description on services.

-- 1) Optional blurb under a service in the picker.
alter table public.category_services
  add column if not exists description text;

-- 2) Which employees may take which service. Absence of any row for a service
--    is deliberately read by the app as "no restriction" — that keeps every
--    service that predates this table working instead of silently becoming
--    unassignable.
create table if not exists public.service_employees (
  service_id  uuid not null references public.category_services (id) on delete cascade,
  employee_id uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (service_id, employee_id)
);

create index if not exists service_employees_service_idx  on public.service_employees (service_id);
create index if not exists service_employees_employee_idx on public.service_employees (employee_id);

alter table public.service_employees enable row level security;

-- Customers must read this to see who can take a service they are requesting.
drop policy if exists service_employees_select on public.service_employees;
create policy service_employees_select on public.service_employees
  for select to authenticated using (true);

-- Only the founder and co-admins assign staff to services.
drop policy if exists service_employees_write_staff on public.service_employees;
create policy service_employees_write_staff on public.service_employees
  for all to authenticated
  using (public.is_founder() or public.is_co_admin())
  with check (public.is_founder() or public.is_co_admin());

-- 3) requests gains a link to the chosen service, so the employee sees exactly
--    which one was picked rather than only the broad category.
alter table public.requests
  add column if not exists service_id uuid references public.category_services (id) on delete set null;

create index if not exists requests_service_idx on public.requests (service_id);

notify pgrst, 'reload schema';
