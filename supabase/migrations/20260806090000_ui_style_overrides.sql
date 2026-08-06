-- Per-element style overrides for the mobile app's founder-controlled
-- "design mode": the founder taps any individual text/box in the live app
-- and changes its font color/size/family or box background color. Each
-- themeable element carries a stable string id (e.g. "login.title") baked
-- into the mobile code; this table stores the override for that id, or has
-- no row at all when an element still uses its default style.
create table public.ui_style_overrides (
  element_id  text primary key,
  font_color  text,
  font_size   numeric,
  font_family text,
  bg_color    text,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.profiles(id)
);

alter table public.ui_style_overrides enable row level security;

-- Readable by everyone, including anonymous — the login screen itself is
-- themeable and renders before any session exists.
create policy ui_style_overrides_select
  on public.ui_style_overrides for select
  to anon, authenticated
  using (true);

-- Only the founder (or a promoted co_admin) can write.
create policy ui_style_overrides_write
  on public.ui_style_overrides for all
  to authenticated
  using (public.is_founder() or public.is_co_admin())
  with check (public.is_founder() or public.is_co_admin());

alter publication supabase_realtime add table public.ui_style_overrides;
