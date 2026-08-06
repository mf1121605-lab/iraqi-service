-- App-wide typography controls for the mobile app, driven from the founder
-- panel and read live by mobile/hooks/useAppTheme.tsx.
--
-- These live on founder_settings (the project's existing single-row settings
-- table, already holding background_color / frame_color / particles_enabled)
-- rather than a separate app_settings table, so there is one source of truth
-- and the existing realtime UPDATE subscription already covers them.
--
-- All three are nullable with app-side defaults, so an install that has not
-- run this migration keeps its current appearance.

alter table public.founder_settings
  add column if not exists app_font_family text,
  add column if not exists app_text_color  text,
  add column if not exists app_font_scale  numeric(3,2) default 1.0;

-- Only the five Arabic families already bundled in the app are selectable;
-- anything else would resolve to a missing font at runtime.
alter table public.founder_settings
  drop constraint if exists founder_settings_app_font_family_check;
alter table public.founder_settings
  add constraint founder_settings_app_font_family_check
  check (
    app_font_family is null
    or app_font_family in ('Cairo','Tajawal','Almarai','IBMPlexSansArabic','NotoKufiArabic')
  );

-- Matches the clamp applied app-side, so a bad value can never make the app
-- unreadable even if written directly via SQL.
alter table public.founder_settings
  drop constraint if exists founder_settings_app_font_scale_check;
alter table public.founder_settings
  add constraint founder_settings_app_font_scale_check
  check (app_font_scale is null or (app_font_scale >= 0.85 and app_font_scale <= 1.40));

-- PostgREST caches the table schema; without this the new columns 404 from
-- the API even though they exist in the database.
notify pgrst, 'reload schema';
