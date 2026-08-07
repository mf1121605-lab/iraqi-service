-- Create the 3 fixed student community chat rooms
-- Run this in Supabase SQL Editor
--
-- Original version of this file referenced columns that don't exist on
-- chat_rooms (name, room_type, created_by — the real schema only has
-- name_ar/name_ckb/moderator_id, see 20260712120500_chat_rooms_and_messages.sql).
-- That means this INSERT always failed and the 3 rooms below, which
-- mobile/app/(customer)/communities/index.tsx hard-codes by slug, were
-- never actually created. Corrected to the real columns.

INSERT INTO public.chat_rooms (slug, name_ar, name_ckb)
VALUES
  ('grade-9-community',          'تجمع طلبة الثالث المتوسط', 'کۆمەڵگەی خوێندکارانی پۆلی نۆیەم'),
  ('grade-12-science-community', 'تجمع طلبة السادس علمي',    'کۆمەڵگەی خوێندکارانی زانستی دوازدەیەم'),
  ('masters-community',          'تجمع طلبة الماجستير',      'کۆمەڵگەی خوێندکارانی ماستەر')
ON CONFLICT (slug) DO NOTHING;
