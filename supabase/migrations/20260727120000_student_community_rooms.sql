-- Create the 3 fixed student community chat rooms
-- Run this in Supabase SQL Editor

INSERT INTO public.chat_rooms (slug, name, room_type, created_by)
SELECT slug, name, 'group', (SELECT id FROM public.profiles WHERE role = 'founder' LIMIT 1)
FROM (VALUES
  ('grade-9-community',         'تجمع طلبة الثالث المتوسط'),
  ('grade-12-science-community','تجمع طلبة السادس علمي'),
  ('masters-community',         'تجمع طلبة الماجستير')
) AS t(slug, name)
ON CONFLICT (slug) DO NOTHING;
