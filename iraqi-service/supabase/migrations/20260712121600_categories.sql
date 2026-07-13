-- Converts the 4 service categories from a fixed enum into a
-- founder-editable table, per explicit request: the founder gets full
-- CRUD over categories, not just over content like banners/products.
--
-- This requires unwinding two things that depended on the enum type:
-- the request-routing/claiming RLS policies and current_active_services(),
-- since Postgres won't let a function's return type change via
-- CREATE OR REPLACE, and the policies reference that function directly.

create table public.categories (
  id uuid unique default gen_random_uuid(),
  -- Stable slug used in code, URLs (?category=education), and as the
  -- natural key requests/active_services point to — so existing links
  -- and query params keep working even as labels/order change. Made the
  -- real primary key just below.
  key text primary key,
  label_ar text not null,
  label_ckb text not null,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.categories (key, label_ar, label_ckb, sort_order) values
  ('military', 'الخدمات العسكرية', 'خزمەتگوزارییە سەربازییەکان', 0),
  ('education', 'الخدمات الدراسية', 'خزمەتگوزارییە خوێندنییەکان', 1),
  ('welfare', 'الرعاية الاجتماعية', 'چاودێری کۆمەڵایەتی', 2),
  ('general', 'خدمات أخرى تهم المواطن العراقي', 'خزمەتگوزارییە ترەکان', 3);

create trigger trg_categories_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

create trigger trg_audit_categories
after insert or update or delete on public.categories
for each row execute function public.fn_audit_log_generic();

alter table public.categories enable row level security;

create policy categories_select_active_public
  on public.categories for select
  to anon, authenticated
  using (is_active = true);

create policy categories_select_staff_all
  on public.categories for select
  to authenticated
  using (public.is_staff() or public.is_co_admin());

create policy categories_write_founder
  on public.categories for all
  to authenticated
  using (public.is_founder())
  with check (public.is_founder());

-- --- Unwind the enum-typed columns and their dependents ---

drop policy requests_select_participants on public.requests;
drop policy requests_update_staff on public.requests;
drop function public.current_active_services();

-- The column's existing DEFAULT '{}' literal stays tied to the old enum
-- array type even after ALTER COLUMN ... TYPE, which later blocks
-- DROP TYPE service_category — reset it explicitly.
alter table public.profiles
  alter column active_services type text[] using active_services::text[];
alter table public.profiles
  alter column active_services set default '{}'::text[];

alter table public.requests
  alter column category type text using category::text;
alter table public.requests
  add constraint requests_category_fkey foreign key (category) references public.categories (key);
-- Deliberately no ON DELETE behavior override: the default RESTRICT means
-- the founder can delete a category through RLS/the API, but Postgres
-- itself refuses if any request still references it — full CRUD
-- capability, without a delete silently orphaning existing requests.

create function public.current_active_services() returns text[]
language sql stable security definer set search_path = public as $$
  select active_services from public.profiles where id = auth.uid();
$$;

create policy requests_select_participants
  on public.requests for select
  to authenticated
  using (
    customer_id = auth.uid()
    or assigned_employee_id = auth.uid()
    or public.is_founder()
    or public.is_co_admin()
    or (
      public.current_role() = 'employee'
      and assigned_employee_id is null
      and category = any (public.current_active_services())
    )
  );

create policy requests_update_staff
  on public.requests for update
  to authenticated
  using (
    assigned_employee_id = auth.uid()
    or public.is_founder()
    or public.is_co_admin()
    or (
      public.current_role() = 'employee'
      and assigned_employee_id is null
      and category = any (public.current_active_services())
    )
  )
  with check (
    assigned_employee_id = auth.uid()
    or public.is_founder()
    or public.is_co_admin()
    or (
      public.current_role() = 'employee'
      and category = any (public.current_active_services())
    )
  );

-- Postgres can't put a foreign key on individual array elements, so a
-- trigger does the equivalent check: every key in active_services must
-- exist in categories. Self-service updates (employee toggling their own
-- expertise) and founder edits both go through this the same way.
create function public.validate_active_services() returns trigger
language plpgsql as $$
begin
  if new.active_services is not null and array_length(new.active_services, 1) > 0 then
    if exists (
      select 1 from unnest(new.active_services) as requested(key)
      where not exists (select 1 from public.categories c where c.key = requested.key)
    ) then
      raise exception 'active_services contains an unknown category key';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_validate_active_services
before insert or update of active_services on public.profiles
for each row execute function public.validate_active_services();

drop type public.service_category;

-- --- Real-time propagation for everything the founder now fully controls ---
-- Founder edits to any of these must reach already-open customer/employee
-- sessions without a page reload.
alter publication supabase_realtime add table public.categories;
alter publication supabase_realtime add table public.service_links;
alter publication supabase_realtime add table public.products;
alter publication supabase_realtime add table public.founder_settings;
alter publication supabase_realtime add table public.chat_rooms;
