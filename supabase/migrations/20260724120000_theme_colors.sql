-- Add theme color customization columns to founder_settings.
-- accent_color: the primary accent/border/glow color (default gold #f59e0b).
-- bg_color: the site-wide deep background color (default near-black #0d1117).
ALTER TABLE public.founder_settings
  ADD COLUMN IF NOT EXISTS accent_color text,
  ADD COLUMN IF NOT EXISTS bg_color text;

-- Soft constraint: if set, must be a valid 6-digit hex color.
ALTER TABLE public.founder_settings
  DROP CONSTRAINT IF EXISTS founder_settings_accent_color_fmt,
  DROP CONSTRAINT IF EXISTS founder_settings_bg_color_fmt;

ALTER TABLE public.founder_settings
  ADD CONSTRAINT founder_settings_accent_color_fmt
    CHECK (accent_color IS NULL OR accent_color ~ '^#[0-9a-fA-F]{6}$'),
  ADD CONSTRAINT founder_settings_bg_color_fmt
    CHECK (bg_color IS NULL OR bg_color ~ '^#[0-9a-fA-F]{6}$');
