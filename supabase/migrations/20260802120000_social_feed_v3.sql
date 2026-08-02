-- Social Feed v3: 6-reaction Facebook-style set, video posts, comment
-- images, comment likes.
-- (image_urls[], nested comments via parent_comment_id, and post
--  approval/pinning already shipped in social_feed_v2.)

-- Replace the 5-value set (like/dislike/love/laugh/angry) with the
-- classic Facebook 6: like, love, laugh, wow, sad, angry — matches the
-- founder's explicit spec (👍 ❤️ 😆 😮 😢 😡). Drop existing 'dislike'
-- rows first since it's leaving the allowed set.
DELETE FROM public.social_reactions WHERE reaction_type = 'dislike';
ALTER TABLE public.social_reactions
  DROP CONSTRAINT IF EXISTS social_reactions_reaction_type_check;
ALTER TABLE public.social_reactions
  ADD CONSTRAINT social_reactions_reaction_type_check
  CHECK (reaction_type IN ('like', 'love', 'laugh', 'wow', 'sad', 'angry'));

ALTER TABLE public.social_posts ADD COLUMN IF NOT EXISTS video_url text;

ALTER TABLE public.social_comments ADD COLUMN IF NOT EXISTS image_url text;

CREATE TABLE IF NOT EXISTS public.social_comment_reactions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.social_comments(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (comment_id, user_id)
);

ALTER TABLE public.social_comment_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY social_comment_reactions_select ON public.social_comment_reactions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY social_comment_reactions_insert ON public.social_comment_reactions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY social_comment_reactions_delete ON public.social_comment_reactions
  FOR DELETE TO authenticated USING (user_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.social_comment_reactions;

CREATE INDEX IF NOT EXISTS social_comments_parent_idx ON public.social_comments (parent_comment_id);
