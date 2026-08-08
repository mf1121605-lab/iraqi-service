-- Founder-controlled color for the mobile app's cinematic screen-edge
-- frame (mobile/components/ui/CinematicFrame.tsx). NULL/absent falls back
-- to the existing gold in the app.
alter table public.founder_settings add column if not exists frame_color text;
