-- Site-wide background music/sound clip, managed by the founder and
-- toggled on by a visitor's own click on the speaker icon (never
-- autoplayed — a page load with no prior click can't reliably play
-- audio with sound in any browser, so the UI is designed around a real
-- user gesture instead of fighting that restriction).
alter table public.founder_settings add column site_ambient_audio_url text;
