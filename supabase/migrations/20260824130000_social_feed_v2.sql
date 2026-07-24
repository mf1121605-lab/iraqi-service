-- Social Feed v2: 5 reactions, multi-image, nested replies, post approval, pinned posts

-- 1. Expand reactions to 5 types (overrides the previous like/dislike-only constraint)
ALTER TABLE public.social_reactions
  DROP CONSTRAINT IF EXISTS social_reactions_reaction_type_check;
ALTER TABLE public.social_reactions
  ADD CONSTRAINT social_reactions_reaction_type_check
  CHECK (reaction_type IN ('like', 'dislike', 'love', 'laugh', 'angry'));

-- 2. Add new columns to social_posts
--    approved: DEFAULT true keeps existing posts visible; new customer posts set false via app
--    image_urls: replaces single image_url with an array (old column kept for backward compat)
--    pinned: founder can pin important posts to the top
ALTER TABLE public.social_posts ADD COLUMN IF NOT EXISTS approved   boolean  NOT NULL DEFAULT true;
ALTER TABLE public.social_posts ADD COLUMN IF NOT EXISTS image_urls text[]   NOT NULL DEFAULT '{}';
ALTER TABLE public.social_posts ADD COLUMN IF NOT EXISTS pinned     boolean  NOT NULL DEFAULT false;

-- 3. Add nested replies to social_comments
ALTER TABLE public.social_comments
  ADD COLUMN IF NOT EXISTS parent_comment_id uuid REFERENCES public.social_comments(id) ON DELETE CASCADE;

-- 4. Replace the permissive SELECT policy with one that hides unapproved posts from customers
DROP POLICY IF EXISTS social_posts_select   ON public.social_posts;
DROP POLICY IF EXISTS social_posts_select_all ON public.social_posts;

CREATE POLICY social_posts_select ON public.social_posts FOR SELECT TO authenticated
  USING (
    approved = true
    OR public.is_founder()
    OR public.is_co_admin()
    OR public.is_staff()
  );

-- 5. Allow staff to update posts (approve / reject / pin)
DROP POLICY IF EXISTS social_posts_update_staff ON public.social_posts;
CREATE POLICY social_posts_update_staff ON public.social_posts FOR UPDATE TO authenticated
  USING  (public.is_founder() OR public.is_co_admin() OR public.is_staff())
  WITH CHECK (public.is_founder() OR public.is_co_admin() OR public.is_staff());

-- 6. Index for efficient pending-posts lookup
CREATE INDEX IF NOT EXISTS social_posts_pending_idx ON public.social_posts (approved, created_at DESC)
  WHERE approved = false;

CREATE INDEX IF NOT EXISTS social_posts_pinned_idx ON public.social_posts (pinned, created_at DESC)
  WHERE pinned = true;
