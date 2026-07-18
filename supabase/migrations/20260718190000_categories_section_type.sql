-- Splits the dashboard's category tiles into two admin-managed groups —
-- "الخدمات" (services) and "الأدوات المهمة" (tools) — rendered as two
-- separate ordered sections on the customer dashboard instead of one grid.
-- Both behave identically under the hood (same request-routing, same
-- employee active_services matching); section_type is purely a display
-- grouping, so no other constraint/policy/trigger needs to change.
-- Defaulting to 'services' means every existing row is mapped there
-- automatically — no data is lost or reclassified.
alter table public.categories add column section_type text not null default 'services';

alter table public.categories
  add constraint categories_section_type_valid
  check (section_type in ('services', 'tools'));
