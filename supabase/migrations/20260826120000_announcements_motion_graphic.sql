-- Add motion_graphic_key to announcements so the slider can render
-- a code-only animated banner instead of a video file.
ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS motion_graphic_key text
  CHECK (
    motion_graphic_key IS NULL OR
    motion_graphic_key IN ('welcome','military','education','welfare','general')
  );
