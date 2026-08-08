-- Interactive multi-level categories: a founder-defined service (e.g.
-- "تقديم ذوي الاحتياجات الخاصة") can carry its own set of sub-questions
-- that pop up on the request form only when that service is selected —
-- the third, interactive level on top of category -> service.

create table public.service_dynamic_fields (
  id          uuid primary key default gen_random_uuid(),
  service_id  uuid not null references public.category_services (id) on delete cascade,
  field_key   text not null,
  label_ar    text not null,
  label_ckb   text,
  field_type  text not null check (field_type in ('text', 'textarea', 'number', 'select', 'checkbox', 'date')),
  -- Only meaningful for field_type = 'select': [{"value": "...", "label_ar": "..."}, ...]
  options     jsonb,
  is_required boolean not null default false,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  unique (service_id, field_key)
);

create index service_dynamic_fields_service_idx on public.service_dynamic_fields (service_id, sort_order);

alter table public.service_dynamic_fields enable row level security;

-- Anyone building the request form (including anonymous browsing before
-- login) can read which questions a service needs — same openness as
-- category_services_select_active_public.
create policy service_dynamic_fields_select_public
  on public.service_dynamic_fields for select
  to anon, authenticated
  using (true);

create policy service_dynamic_fields_write_founder
  on public.service_dynamic_fields for all
  to authenticated
  using (public.is_founder() or public.is_co_admin())
  with check (public.is_founder() or public.is_co_admin());

-- Where the customer's filled-in answers land — keyed by field_key,
-- values are whatever the field type produced (string, or boolean for
-- checkbox). Nullable: most requests have no dynamic fields at all.
alter table public.requests add column if not exists dynamic_answers jsonb;

notify pgrst, 'reload schema';
