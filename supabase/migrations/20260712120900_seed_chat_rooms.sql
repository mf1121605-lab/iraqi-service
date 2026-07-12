-- The 5 rooms from the spec. moderator_id is left null here — the founder
-- assigns a specific employee as moderator for each room from the admin
-- panel after employee accounts exist.
insert into public.chat_rooms (slug, name_ar, name_ckb) values
  ('third-intermediate', 'محادثة وزاري الثالث متوسط', 'گفتوگۆی وەزاری پۆلی سێیەم ناوەندی'),
  ('sixth-literary', 'محادثة وزاري السادس الأدبي', 'گفتوگۆی وەزاری پۆلی شەشەم ئەدەبی'),
  ('sixth-scientific', 'محادثة وزاري السادس العلمي', 'گفتوگۆی وەزاری پۆلی شەشەم زانستی'),
  ('masters-research', 'محادثة خريجين الماجستير للبحوث الأكاديمية', 'گفتوگۆی دەرچووانی ماستەر بۆ توێژینەوەی ئەکادیمی'),
  ('english-development', 'محادثة تجمع العراقيين لتطوير اللغة الإنجليزية', 'گفتوگۆی کۆمەڵگای عێراقییەکان بۆ گەشەپێدانی زمانی ئینگلیزی');
