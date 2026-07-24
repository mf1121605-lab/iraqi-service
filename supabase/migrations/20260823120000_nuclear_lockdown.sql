-- Nuclear kill-switch: a singleton table that the Next.js middleware reads
-- on every page request to decide whether to show the lockdown page.
-- Separated from founder_settings so the anon role can read it without
-- exposing any other settings data.

CREATE TABLE IF NOT EXISTS public.site_lockdown (
  id         smallint PRIMARY KEY DEFAULT 1,
  active     boolean  NOT NULL DEFAULT false,
  activated_at timestamptz,
  CONSTRAINT site_lockdown_singleton CHECK (id = 1)
);

INSERT INTO public.site_lockdown (id, active) VALUES (1, false)
  ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.site_lockdown ENABLE ROW LEVEL SECURITY;

-- Public read so Next.js middleware (using the anon key) can check the state.
CREATE POLICY site_lockdown_public_read
  ON public.site_lockdown FOR SELECT
  TO anon, authenticated
  USING (true);

-- Only the service role (supabaseAdmin) can write — no authenticated client policy.

-- Nuclear wipe: deletes all user-generated content while preserving the
-- platform structure (categories, settings, banners) and the founder's own
-- profile so they can restore the site.
CREATE OR REPLACE FUNCTION public.fn_nuclear_wipe()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- User-generated content — order matters (child rows before parents)
  DELETE FROM public.request_payments;
  DELETE FROM public.request_messages;
  DELETE FROM public.requests;
  DELETE FROM public.social_comments;
  DELETE FROM public.social_reactions;
  DELETE FROM public.social_posts;
  DELETE FROM public.urgent_news;
  DELETE FROM public.chat_messages;
  DELETE FROM public.direct_messages;
  DELETE FROM public.chat_room_invitations;
  DELETE FROM public.notifications;
  DELETE FROM public.login_audit_logs;
  DELETE FROM public.rate_limit_attempts;

  -- Tables added in later migrations — skip gracefully if absent
  BEGIN
    DELETE FROM public.tutor_messages;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;
  BEGIN
    DELETE FROM public.tutor_chat_sessions;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;
  BEGIN
    DELETE FROM public.quick_requests;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  -- Remove all customer and employee profiles last.
  -- Founder + co-admin profiles survive so the site can be restored.
  DELETE FROM public.profiles
  WHERE role IN ('customer', 'employee');
END;
$$;

-- Revoke public execute — only the service role (used by the API route) can call this.
REVOKE EXECUTE ON FUNCTION public.fn_nuclear_wipe() FROM PUBLIC;
