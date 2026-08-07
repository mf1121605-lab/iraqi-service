-- Frame thickness and corner rounding for the mobile CinematicFrame overlay.
-- frame_color / frame_enabled already existed; the weight of the frame was a
-- hardcoded constant in the app, so the founder could recolour it but not
-- restyle it.
--
-- background_color and background_image_path are NOT added here — they already
-- exist (20260716120000_admin_dashboard_content.sql) and are what the web's
-- SiteBackground reads. The mobile settings screen simply never exposed them
-- before, and mobile's ScreenBg never read bg_color; both are app-side fixes.

alter table public.founder_settings
  add column if not exists frame_width  smallint default 2,
  add column if not exists frame_radius smallint default 1;

-- Matches the clamp applied app-side. A stroke thick enough to cover the
-- status bar, or a radius larger than the corner accent itself, reads as
-- broken rather than styled.
alter table public.founder_settings
  drop constraint if exists founder_settings_frame_width_check;
alter table public.founder_settings
  add constraint founder_settings_frame_width_check
  check (frame_width is null or (frame_width >= 1 and frame_width <= 6));

alter table public.founder_settings
  drop constraint if exists founder_settings_frame_radius_check;
alter table public.founder_settings
  add constraint founder_settings_frame_radius_check
  check (frame_radius is null or (frame_radius >= 0 and frame_radius <= 14));

-- PostgREST caches the table schema; without this the new columns 404 from
-- the API even though they exist in the database.
notify pgrst, 'reload schema';
