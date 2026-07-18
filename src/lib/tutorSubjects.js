// Shared between the API route (system prompt) and the frontend (labels) —
// single source of truth for which subjects exist, matching the real
// Iraqi 3rd-intermediate (الثالث متوسط) ministerial exam subjects.
export const TUTOR_SUBJECTS = [
  { key: 'arabic', nameAr: 'اللغة العربية', nameCkb: 'زمانی عەرەبی' },
  { key: 'english', nameAr: 'اللغة الإنكليزية', nameCkb: 'زمانی ئینگلیزی' },
  { key: 'math', nameAr: 'الرياضيات', nameCkb: 'بیرکاری' },
  { key: 'science', nameAr: 'العلوم', nameCkb: 'زانست' },
  { key: 'social_studies', nameAr: 'الاجتماعيات', nameCkb: 'کۆمەڵایەتی' },
  { key: 'islamic_education', nameAr: 'التربية الإسلامية', nameCkb: 'پەروەردەی ئیسلامی' },
];

export function tutorSubjectLabel(key, locale) {
  const subject = TUTOR_SUBJECTS.find((item) => item.key === key);
  if (!subject) return key;
  return locale === 'ckb' ? subject.nameCkb : subject.nameAr;
}
