// Each locale below is a plain object with the exact same key shape. Adding
// a new language later (e.g. English) means adding one more entry with the
// same keys — no component needs to change.

export const LOCALE_META = [
  { code: 'ar', nativeName: 'العربية', dir: 'rtl' },
  { code: 'ckb', nativeName: 'کوردی', dir: 'rtl' },
];

export const locales = LOCALE_META.map((meta) => meta.code);
export const defaultLocale = 'ar';

const STORAGE_KEY = 'iraqi-services:locale';

const dictionaries = {
  ar: {
    common: {
      platformName: 'منصة الخدمات العراقية',
      tagline: 'بوابتك لتسهيل معاملاتك مع الجهات العراقية',
      footerDisclaimer:
        'هذه منصة إلكترونية خاصة وسيطة تهدف لتسهيل تقديم المواطنين على الخدمات، وهي غير تابعة رسميًا لأي وزارة أو جهة حكومية عراقية. جميع الطلبات تُعالج من قبل فريق المنصة، والقرار النهائي يعود للجهات الرسمية المختصة.',
      back: 'رجوع',
    },
    languageSelect: {
      title: 'مرحبًا بك',
      subtitle: 'اختر لغة الواجهة للمتابعة',
    },
    gateway: {
      welcomeTitle: 'منصة الخدمات العراقية',
      welcomeSubtitle: 'اختر طريقة الدخول للمتابعة',
      employeeCta: 'دخول الموظفين',
      employeeDesc: 'للموظفين المعتمدين من قبل المؤسس فقط',
      customerCta: 'بوابة المواطنين',
      customerDesc: 'تسجيل دخول سريع أو حساب جديد',
      switchLanguage: 'تغيير اللغة',
    },
  },
  ckb: {
    common: {
      platformName: 'پلاتفۆرمی خزمەتگوزاریی عێراقی',
      tagline: 'دەروازەت بۆ ئاسانکردنی کارەکانت لەگەڵ دامەزراوە عێراقییەکان',
      footerDisclaimer:
        'ئەمە پلاتفۆرمێکی ئەلیکترۆنی تایبەتی ناوبژیوانە کە ئامانجی ئاسانکردنی پێشکەشکردنی داواکارییەکانی هاوڵاتیانە بۆ خزمەتگوزارییەکان، و بە فەرمی پەیوەندی بە هیچ وەزارەت یان دامەزراوەیەکی حکوومی عێراقییەوە نییە. هەموو داواکارییەکان لەلایەن تیمی پلاتفۆرمەوە پرۆسێس دەکرێن، و بڕیاری کۆتایی هی دامەزراوە فەرمییە پەیوەندیدارەکانە.',
      back: 'گەڕانەوە',
    },
    languageSelect: {
      title: 'بەخێربێیت',
      subtitle: 'زمانی ڕووکار هەڵبژێرە بۆ بەردەوامبوون',
    },
    gateway: {
      welcomeTitle: 'پلاتفۆرمی خزمەتگوزاریی عێراقی',
      welcomeSubtitle: 'شێوازی چوونەژوورەوە هەڵبژێرە بۆ بەردەوامبوون',
      employeeCta: 'چوونەژوورەوەی فەرمانبەران',
      employeeDesc: 'تەنها بۆ فەرمانبەرانی پەسەندکراو لەلایەن دامەزرێنەرەوە',
      customerCta: 'دەروازەی هاوڵاتیان',
      customerDesc: 'چوونەژوورەوەی خێرا یان هەژماری نوێ',
      switchLanguage: 'گۆڕینی زمان',
    },
  },
};

export function getDirection(locale) {
  return LOCALE_META.find((meta) => meta.code === locale)?.dir ?? 'ltr';
}

export function translate(locale, path) {
  const lookup = (dict) =>
    path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), dict);

  return lookup(dictionaries[locale]) ?? lookup(dictionaries[defaultLocale]) ?? path;
}

export function getDictionary(locale) {
  return dictionaries[locale] ?? dictionaries[defaultLocale];
}

export function getStoredLocale() {
  if (typeof window === 'undefined') return null;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return locales.includes(stored) ? stored : null;
}

export function setStoredLocale(locale) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, locale);
}
