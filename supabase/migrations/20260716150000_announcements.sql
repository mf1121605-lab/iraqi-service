-- Richer replacement for the customer-dashboard hero banner carousel
-- previously driven by service_links (badge, per-item colors, a mobile-
-- specific image, and start/end scheduling) — service_links itself is
-- left in place untouched, just no longer read by the customer dashboard,
-- since running two banner-editing surfaces for the same hero slot would
-- just confuse the founder about which one is live.
--
-- Adapted from a schema pasted in chat, with three real issues fixed
-- before shipping:
--   1. Its RLS write policy was `to authenticated using (true)` — every
--      signed-in customer/employee, not just the founder, could create,
--      edit, or delete site-wide announcements.
--   2. title/description/badge/button_text were single-locale; every
--      other content table in this schema (service_links, products,
--      categories) is bilingual ar/ckb, and the app has no non-bilingal
--      rendering path.
--   3. starts_at/ends_at were stored but never enforced anywhere, so
--      scheduling an announcement to start/end at a given time wouldn't
--      actually have done anything.
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title_ar text not null,
  title_ckb text not null,
  description_ar text,
  description_ckb text,
  image_url text,
  mobile_image_url text,
  badge_ar text,
  badge_ckb text,
  button_text_ar text,
  button_text_ckb text,
  button_link text,
  background_color text not null default '#0f172a',
  text_color text not null default '#ffffff',
  display_order integer not null default 0,
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index announcements_active_order_idx on public.announcements (is_active, display_order);

create trigger trg_announcements_updated_at
before update on public.announcements
for each row execute function public.set_updated_at();

create trigger trg_audit_announcements
after insert or update or delete on public.announcements
for each row execute function public.fn_audit_log_generic();

alter table public.announcements enable row level security;

-- Scheduling is enforced here, not just left to the client, so an
-- announcement outside its start/end window is never returned to a
-- customer session even via a direct API call.
create policy announcements_select_public
  on public.announcements for select
  to anon, authenticated
  using (
    is_active = true
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at >= now())
  );

create policy announcements_select_staff_all
  on public.announcements for select
  to authenticated
  using (public.is_founder() or public.is_co_admin());

create policy announcements_write_founder
  on public.announcements for all
  to authenticated
  using (public.is_founder() or public.is_co_admin())
  with check (public.is_founder() or public.is_co_admin());

alter publication supabase_realtime add table public.announcements;
