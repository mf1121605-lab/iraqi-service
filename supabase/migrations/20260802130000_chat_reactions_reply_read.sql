-- Chat upgrade: reply-to, read receipts, and per-message emoji reactions.
-- Voice notes and images already work via attachment_url.
--
-- request_messages.read_at + its column-scoped update policy already
-- exist (20260728120000_request_messages_read_receipts.sql) — this only
-- adds the equivalent for chat_messages (group rooms) and direct_messages,
-- plus reply_to_id and reactions across all three tables.

-- ── message_type: add 'image' and 'voice' alongside the existing
--    'text' | 'sticker' (+ 'payment_proposal' on request_messages) so
--    attachment rendering doesn't have to guess from the file extension ──
ALTER TABLE public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_message_type_check;
ALTER TABLE public.chat_messages ADD CONSTRAINT chat_messages_message_type_check
  CHECK (message_type IN ('text', 'sticker', 'image', 'voice'));

ALTER TABLE public.request_messages DROP CONSTRAINT IF EXISTS request_messages_message_type_check;
ALTER TABLE public.request_messages ADD CONSTRAINT request_messages_message_type_check
  CHECK (message_type IN ('text', 'sticker', 'payment_proposal', 'image', 'voice'));

ALTER TABLE public.direct_messages DROP CONSTRAINT IF EXISTS direct_messages_message_type_check;
ALTER TABLE public.direct_messages ADD CONSTRAINT direct_messages_message_type_check
  CHECK (message_type IN ('text', 'sticker', 'image', 'voice'));

-- ── reply-to columns ─────────────────────────────────────────────────
ALTER TABLE public.chat_messages    ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES public.chat_messages(id) ON DELETE SET NULL;
ALTER TABLE public.request_messages ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES public.request_messages(id) ON DELETE SET NULL;
ALTER TABLE public.direct_messages  ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES public.direct_messages(id) ON DELETE SET NULL;

-- ── read receipts for direct_messages (1:1 — exactly one recipient) ──
ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS read_at timestamptz;

CREATE POLICY direct_messages_update_read_receipt ON public.direct_messages
  FOR UPDATE TO authenticated
  USING (
    sender_id <> auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.direct_message_threads t
      WHERE t.id = direct_messages.thread_id
        AND (t.user_a_id = auth.uid() OR t.user_b_id = auth.uid())
    )
  )
  WITH CHECK (
    sender_id <> auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.direct_message_threads t
      WHERE t.id = direct_messages.thread_id
        AND (t.user_a_id = auth.uid() OR t.user_b_id = auth.uid())
    )
  );

GRANT UPDATE (read_at) ON public.direct_messages TO authenticated;

-- chat_messages (group rooms) gets the column for schema consistency,
-- but the UI intentionally shows only a "delivered" tick there, never
-- "read" — a single read_at can't represent "read by which member" in
-- a multi-person room, so no write path is exposed for it here.
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS read_at timestamptz;

-- ── per-message emoji reactions (one per user per message; switching
--    reaction is delete-then-insert client-side, same as social_reactions) ──
--
-- chat_message_reactions already exists (20260716130000_advanced_chat_
-- system.sql) but with UNIQUE(message_id, user_id, emoji) — allowing a
-- user to stack multiple *different* emoji on the same message — while
-- its only caller (chat/[slug] toggleReaction) upserts with
-- onConflict: 'message_id,user_id', a 2-column target that constraint
-- doesn't satisfy. That mismatch means the upsert has never actually
-- worked (Postgres validates the ON CONFLICT target against a real
-- constraint at plan time, so every call errors, not just genuine
-- conflicts). Align it with the one-reaction-per-user model used
-- everywhere else instead of duplicating the table.
ALTER TABLE public.chat_message_reactions DROP CONSTRAINT IF EXISTS chat_message_reactions_message_id_user_id_emoji_key;
ALTER TABLE public.chat_message_reactions ADD CONSTRAINT chat_message_reactions_message_id_user_id_key UNIQUE (message_id, user_id);

CREATE TABLE IF NOT EXISTS public.request_message_reactions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.request_messages(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji      text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id)
);
CREATE TABLE IF NOT EXISTS public.direct_message_reactions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.direct_messages(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji      text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id)
);

-- chat_message_reactions already has RLS enabled + select/insert/delete
-- policies from its original migration — nothing to add there.
ALTER TABLE public.request_message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_message_reactions  ENABLE ROW LEVEL SECURITY;

CREATE POLICY request_message_reactions_select ON public.request_message_reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY request_message_reactions_insert ON public.request_message_reactions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY request_message_reactions_delete ON public.request_message_reactions FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY direct_message_reactions_select ON public.direct_message_reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY direct_message_reactions_insert ON public.direct_message_reactions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY direct_message_reactions_delete ON public.direct_message_reactions FOR DELETE TO authenticated USING (user_id = auth.uid());

-- chat_message_reactions is already in the realtime publication.
ALTER PUBLICATION supabase_realtime ADD TABLE public.request_message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_message_reactions;
