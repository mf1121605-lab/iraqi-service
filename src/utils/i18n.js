// Internationalization utilities for the Iraqi Services Platform.
//
// Supports two locales:
//   - 'ar'  : Arabic (default), right-to-left
//   - 'ckb' : Central Kurdish (Sorani), right-to-left
//
// Translations live in a nested dictionary and are looked up via dot-separated
// paths, e.g. translate('ar', 'common.save') -> 'حفظ'.
//
// The active locale is persisted in localStorage under STORAGE_KEY so the
// user's choice survives page reloads.

export const defaultLocale = 'ar';

export const LOCALE_META = [
  { code: 'ar', nativeName: 'العربية', dir: 'rtl' },
  { code: 'ckb', nativeName: 'کوردی', dir: 'rtl' },
];

const STORAGE_KEY = 'platform_locale';

const LOCALE_BY_CODE = LOCALE_META.reduce((acc, meta) => {
  acc[meta.code] = meta;
  return acc;
}, {});

export function getDirection(locale) {
  const meta = LOCALE_BY_CODE[locale];
  return meta ? meta.dir : 'rtl';
}

export function getStoredLocale() {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && LOCALE_BY_CODE[stored]) return stored;
  } catch (_err) {
    // localStorage may be unavailable (private mode, disabled storage); ignore.
  }
  return null;
}

export function setStoredLocale(locale) {
  if (typeof window === 'undefined') return;
  if (!LOCALE_BY_CODE[locale]) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, locale);
  } catch (_err) {
    // Ignore write failures (e.g. storage quota or disabled storage).
  }
}

export function translate(locale, path) {
  const dict = DICTIONARIES[locale] || DICTIONARIES[defaultLocale];
  const segments = String(path).split('.');
  let current = dict;
  for (let i = 0; i < segments.length; i += 1) {
    if (current && typeof current === 'object' && segments[i] in current) {
      current = current[segments[i]];
    } else {
      // Fall back to the default locale, then to the raw path, so the UI never
      // renders an empty string when a key is missing.
      const fallback = DICTIONARIES[defaultLocale];
      let alt = fallback;
      for (let j = 0; j < segments.length; j += 1) {
        if (alt && typeof alt === 'object' && segments[j] in alt) {
          alt = alt[segments[j]];
        } else {
          return path;
        }
      }
      return typeof alt === 'string' ? alt : path;
    }
  }
  return typeof current === 'string' ? current : path;
}

// ---------------------------------------------------------------------------
// Translation dictionaries
// ---------------------------------------------------------------------------

const ar = {
  common: {
    platformName: 'منصة الخدمات العراقية',
    loading: 'جارٍ التحميل…',
    save: 'حفظ',
    cancel: 'إلغاء',
    signOut: 'تسجيل الخروج',
    errorGeneric: 'حدث خطأ ما. حاول مرة أخرى لاحقاً.',
    noResults: 'لا توجد نتائج',
    lightMode: 'الوضع الفاتح',
    darkMode: 'الوضع الداكن',
  },
  gateway: {
    switchLanguage: 'تغيير اللغة',
  },
  authCustomer: {
    title: 'تسجيل الدخول كعميل',
    phoneLabel: 'رقم الهاتف',
    phonePlaceholder: '07XXXXXXXXX',
    sendCodeCta: 'إرسال الرمز',
    otpSentMessage: 'تم إرسال رمز التحقق إلى هاتفك',
    otpLabel: 'رمز التحقق',
    otpPlaceholder: 'XXXXXX',
    verifyCta: 'تأكيد',
    resendCta: 'إعادة إرسال الرمز',
    orDivider: 'أو',
    continueWithFacebook: 'المتابعة عبر فيسبوك',
    continueWithGoogle: 'المتابعة عبر جوجل',
    backCta: 'رجوع',
    errorInvalidPhone: 'رقم الهاتف غير صالح. أدخل رقماً عراقياً صحيحاً.',
    errorOAuth: 'تعذّر تسجيل الدخول عبر مزود الخدمة. حاول مرة أخرى.',
  },
  authEmployee: {
    title: 'تسجيل الدخول كموظف',
    identifierLabel: 'المعرّف',
    identifierPlaceholder: 'البريد الإلكتروني أو رقم الهاتف',
    passwordLabel: 'كلمة المرور',
    passwordPlaceholder: '••••••••',
    submitCta: 'تسجيل الدخول',
    backCta: 'رجوع',
    errorInvalid: 'البيانات غير صحيحة. تأكد من المعرّف وكلمة المرور.',
  },
  onboarding: {
    title: 'أهلاً بك',
    subtitle: 'دعنا نجهّز حسابك في خطوات بسيطة',
    continueCta: 'متابعة',
  },
  customerHub: {
    categoriesTitle: 'الأقسام',
    heroFallbackTitle: 'مرحباً بك في المنصة',
    heroFallbackSubtitle: 'تصفّح الخدمات المتاحة واطلب ما تحتاجه',
    dealsTitle: 'العروض',
    dealsEmpty: 'لا توجد عروض حالياً',
    orderCta: 'اطلب الآن',
    myRequestsCta: 'طلباتي',
  },
  requestForm: {
    title: 'طلب خدمة',
    titleLabel: 'العنوان',
    titlePlaceholder: 'مثال: استخراج وثيقة',
    descriptionLabel: 'الوصف',
    descriptionPlaceholder: 'اشرح طلبك بالتفصيل…',
    submitCta: 'إرسال الطلب',
    successMessage: 'تم إرسال طلبك بنجاح',
  },
  requestStatus: {
    submitted: 'تم الإرسال',
    in_review: 'قيد المراجعة',
    needs_changes: 'يتطلب تعديلات',
    approved: 'تمت الموافقة',
    rejected: 'مرفوض',
  },
  employeeDesk: {
    profileTitle: 'الملف الوظيفي',
    specializationLabel: 'التخصص',
    specializationPlaceholder: 'مثال: الأحوال المدنية',
    activeServicesTitle: 'الخدمات النشطة',
    queueTitle: 'قائمة الانتظار',
    queueEmpty: 'لا توجد طلبات في قائمة الانتظار',
    assignToMeCta: 'إسناد إليّ',
    updateStatusCta: 'تحديث الحالة',
    noteLabel: 'ملاحظة',
    statusHistoryTitle: 'سجل الحالات',
    messagesTitle: 'الرسائل',
    messagePlaceholder: 'اكتب رسالة…',
    sendCta: 'إرسال',
  },
  chat: {
    roomsTitle: 'غرف المحادثة',
    backToRooms: 'العودة إلى الغرف',
    messagePlaceholder: 'اكتب رسالة…',
    sendCta: 'إرسال',
    attachCta: 'إرفاق',
    uploading: 'جارٍ الرفع…',
    attachmentTypeInvalid: 'نوع الملف غير مدعوم',
    attachmentTooLarge: 'حجم الملف كبير جداً',
    hiddenMessage: 'تم إخفاء هذه الرسالة',
    hideCta: 'إخفاء',
    audioPlay: 'تشغيل',
    audioPause: 'إيقاف مؤقت',
  },
  notifications: {
    title: 'الإشعارات',
    empty: 'لا توجد إشعارات',
    markAllRead: 'تعليم الكل كمقروء',
    enablePush: 'تفعيل الإشعارات',
    pushError: 'تعذّر تفعيل الإشعارات',
  },
  payment: {
    checkoutTitle: 'إتمام الدفع',
    orderSummary: 'ملخّص الطلب',
    amountLabel: 'المبلغ',
    choosePaymentMethod: 'اختر طريقة الدفع',
    zaincashName: 'زين كاش',
    rafidainName: 'مصرف الرافدين',
    payCta: 'ادفع الآن',
    processing: 'جارٍ المعالجة…',
    gatewayError: 'حدث خطأ أثناء الاتصال ببوابة الدفع',
    resultSuccessTitle: 'تمت العملية بنجاح',
    resultSuccessBody: 'تم إتمام الدفع بنجاح',
    resultFailedTitle: 'فشلت العملية',
    resultFailedBody: 'لم يكتمل الدفع. حاول مرة أخرى.',
    tryAgainCta: 'إعادة المحاولة',
    backToDashboard: 'العودة إلى لوحة التحكم',
  },
  founderNav: {
    dashboard: 'الرئيسية',
    categories: 'الأقسام',
    banners: 'البانرات',
    products: 'المنتجات',
    chatRooms: 'غرف المحادثة',
    employees: 'الموظفون',
    settings: 'الإعدادات',
    auditLog: 'سجل التدقيق',
  },
  founderDashboard: {
    title: 'لوحة تحكم المؤسس',
    statsTotalUsers: 'إجمالي المستخدمين',
    statsTotalRequests: 'إجمالي الطلبات',
    statsTotalRevenue: 'إجمالي الإيرادات',
    statsTotalProducts: 'إجمالي المنتجات',
    recentEmployees: 'أحدث الموظفين',
    recentRequests: 'أحدث الطلبات',
    noEmployees: 'لا يوجد موظفون بعد',
    noRequests: 'لا توجد طلبات بعد',
  },
  founderCategories: {
    title: 'إدارة الأقسام',
    keyLabel: 'المفتاح',
    labelArLabel: 'الاسم بالعربية',
    labelCkbLabel: 'الاسم بالكردية',
    addCta: 'إضافة قسم',
    empty: 'لا توجد أقسام بعد',
  },
  founderBanners: {
    title: 'إدارة البانرات',
    titleLabel: 'العنوان',
    titleArLabel: 'العنوان بالعربية',
    titleCkbLabel: 'العنوان بالكردية',
    subtitleArLabel: 'العنوان الفرعي بالعربية',
    subtitleCkbLabel: 'العنوان الفرعي بالكردية',
    urlLabel: 'الرابط',
    imageLabel: 'الصورة',
    addCta: 'إضافة بانر',
    empty: 'لا توجد بانرات بعد',
  },
  founderProducts: {
    title: 'إدارة المنتجات',
    titleLabel: 'العنوان',
    titleArLabel: 'العنوان بالعربية',
    titleCkbLabel: 'العنوان بالكردية',
    descriptionArLabel: 'الوصف بالعربية',
    descriptionCkbLabel: 'الوصف بالكردية',
    priceLabel: 'السعر',
    discountLabel: 'الخصم',
    imageLabel: 'الصورة',
    addCta: 'إضافة منتج',
    empty: 'لا توجد منتجات بعد',
  },
  founderChatRooms: {
    title: 'إدارة غرف المحادثة',
    nameLabel: 'الاسم',
    nameArLabel: 'الاسم بالعربية',
    nameCkbLabel: 'الاسم بالكردية',
    addCta: 'إضافة غرفة',
    empty: 'لا توجد غرف بعد',
  },
  founderEmployees: {
    title: 'إدارة الموظفين',
    createCta: 'إنشاء موظف',
    phoneLabel: 'رقم الهاتف',
    emailLabel: 'البريد الإلكتروني',
    passwordLabel: 'كلمة المرور',
    givenNameLabel: 'الاسم',
    fatherNameLabel: 'اسم الأب',
    grandfatherNameLabel: 'اسم الجد',
    familyNameLabel: 'اللقب',
    specializationLabel: 'التخصص',
    suspendCta: 'تعليق الحساب',
    activateCta: 'تفعيل الحساب',
    assignCoAdminCta: 'تعيين كمسؤول ثانٍ',
    removeCoAdminCta: 'إزالة من المسؤولين',
    empty: 'لا يوجد موظفون بعد',
  },
  founderSettings: {
    title: 'إعدادات المنصة',
    chatAudioTrackLabel: 'مسار صوت المحادثة',
    chatBackgroundLabel: 'خلفية المحادثة',
    saveCta: 'حفظ',
  },
  founderAuditLog: {
    title: 'سجل التدقيق',
    empty: 'لا توجد سجلات بعد',
    whenLabel: 'التوقيت',
    actorLabel: 'المنفّذ',
    actionLabel: 'الإجراء',
    tableLabel: 'الجدول',
  },
  landing: {
    heroTitle: 'منصة الخدمات العراقية',
    heroSubtitle: 'كل خدماتك في مكان واحد، بسرعة وبسهولة',
    customerCta: 'ادخل كعميل',
    employeeCta: 'ادخل كموظف',
    footerDisclaimer: '© منصة الخدمات العراقية. جميع الحقوق محفوظة.',
  },
};

const ckb = {
  common: {
    platformName: 'پلاتفۆرمی خزمەتگوزارییەکانی عێراق',
    loading: 'بارکردن…',
    save: 'پاشەکەوتکردن',
    cancel: 'هەڵوەشاندنەوە',
    signOut: 'چوونەدەرەوە',
    errorGeneric: 'هەڵەیەک ڕوویدا. دواتر دووبارە هەوڵبدەوە.',
    noResults: 'هیچ ئەنجامێک نییە',
    lightMode: 'دۆخی ڕووناک',
    darkMode: 'دۆخی تاریک',
  },
  gateway: {
    switchLanguage: 'گۆڕینی زمان',
  },
  authCustomer: {
    title: 'چوونەژوورەوە وەک کڕیار',
    phoneLabel: 'ژمارەی مۆبایل',
    phonePlaceholder: '07XXXXXXXXX',
    sendCodeCta: 'ناردنی کۆد',
    otpSentMessage: 'کۆدی پشتڕاستکردنەوە بۆ مۆبایلەکەت نێردرا',
    otpLabel: 'کۆدی پشتڕاستکردنەوە',
    otpPlaceholder: 'XXXXXX',
    verifyCta: 'پشتڕاستکردنەوە',
    resendCta: 'دووبارە ناردنی کۆد',
    orDivider: 'یان',
    continueWithFacebook: 'بەردەوامبوون لە ڕێگەی فەیسبووک',
    continueWithGoogle: 'بەردەوامبوون لە ڕێگەی گووگڵ',
    backCta: 'گەڕانەوە',
    errorInvalidPhone: 'ژمارەی مۆبایل نادروستە. ژمارەیەکی عێراقی دروست بنووسە.',
    errorOAuth: 'نەتوانرا چوونەژوورەوە لە ڕێگەی دابینکەرەکەوە بکرێت. دووبارە هەوڵبدەوە.',
  },
  authEmployee: {
    title: 'چوونەژوورەوە وەک کارمەند',
    identifierLabel: 'ناسێنەر',
    identifierPlaceholder: 'ئیمەیل یان ژمارەی مۆبایل',
    passwordLabel: 'وشەی نهێنی',
    passwordPlaceholder: '••••••••',
    submitCta: 'چوونەژوورەوە',
    backCta: 'گەڕانەوە',
    errorInvalid: 'زانیارییەکان هەڵەن. دڵنیابە لە ناسێنەر و وشەی نهێنی.',
  },
  onboarding: {
    title: 'بەخێربێیت',
    subtitle: 'با هەژمارەکەت لە چەند هەنگاوێکی سادەدا ئامادە بکەین',
    continueCta: 'بەردەوامبوون',
  },
  customerHub: {
    categoriesTitle: 'بەشەکان',
    heroFallbackTitle: 'بەخێربێیت بۆ پلاتفۆرم',
    heroFallbackSubtitle: 'خزمەتگوزارییە بەردەستەکان ببینە و داواکاری خۆت تۆمار بکە',
    dealsTitle: 'ئۆفەرەکان',
    dealsEmpty: 'ئێستا ئۆفەر نییە',
    orderCta: 'ئێستا داوا بکە',
    myRequestsCta: 'داواکارییەکانم',
  },
  requestForm: {
    title: 'داواکاری خزمەتگوزاری',
    titleLabel: 'ناونیشان',
    titlePlaceholder: 'نموونە: وەرگرتنی بەڵگەنامە',
    descriptionLabel: 'ڕوونکردنەوە',
    descriptionPlaceholder: 'داواکارییەکەت بە وردی ڕوون بکەرەوە…',
    submitCta: 'ناردنی داواکاری',
    successMessage: 'داواکارییەکەت بە سەرکەوتوویی نێردرا',
  },
  requestStatus: {
    submitted: 'نێردرا',
    in_review: 'لە ژێر پێداچوونەوەدایە',
    needs_changes: 'پێویستی بە گۆڕانکاری هەیە',
    approved: 'پەسەندکرا',
    rejected: 'ڕەتکرایەوە',
  },
  employeeDesk: {
    profileTitle: 'پرۆفایلی کارمەندی',
    specializationLabel: 'پسپۆریی',
    specializationPlaceholder: 'نموونە: بارودۆخی مەدەنی',
    activeServicesTitle: 'خزمەتگوزارییە چالاکەکان',
    queueTitle: 'ڕیزی چاوەڕوانی',
    queueEmpty: 'هیچ داواکارییەک لە ڕیزی چاوەڕوانیدا نییە',
    assignToMeCta: 'تەرخانکردن بۆ من',
    updateStatusCta: 'نوێکردنەوەی دۆخ',
    noteLabel: 'تێبینی',
    statusHistoryTitle: 'مێژووی دۆخەکان',
    messagesTitle: 'پەیامەکان',
    messagePlaceholder: 'پەیامێک بنووسە…',
    sendCta: 'ناردن',
  },
  chat: {
    roomsTitle: 'ژوورەکانی گفتوگۆ',
    backToRooms: 'گەڕانەوە بۆ ژوورەکان',
    messagePlaceholder: 'پەیامێک بنووسە…',
    sendCta: 'ناردن',
    attachCta: 'هاوپێچکردن',
    uploading: 'بارکردن…',
    attachmentTypeInvalid: 'جۆری فایلەکە پشتگیری نەکراوە',
    attachmentTooLarge: 'قەبارەی فایلەکە زۆر گەورەیە',
    hiddenMessage: 'ئەم پەیامە شاردراوەتەوە',
    hideCta: 'شارتنەوە',
    audioPlay: 'لێدان',
    audioPause: 'وەستاندنی کاتی',
  },
  notifications: {
    title: 'ئاگادارکردنەوەکان',
    empty: 'هیچ ئاگادارکردنەوەیەک نییە',
    markAllRead: 'هەمووی وەک خوێندراوە نیشان بکە',
    enablePush: 'چالاککردنی ئاگادارکردنەوەکان',
    pushError: 'نەتوانرا ئاگادارکردنەوەکان چالاک بکرێن',
  },
  payment: {
    checkoutTitle: 'تەواوکردنی پارەدان',
    orderSummary: 'کورتەی داواکاری',
    amountLabel: 'بڕی پارە',
    choosePaymentMethod: 'ڕێگای پارەدان هەڵبژێرە',
    zaincashName: 'زەینکاش',
    rafidainName: 'بانکی ڕافیدەین',
    payCta: 'ئێستا پارە بدە',
    processing: 'ئامادەکردن…',
    gatewayError: 'هەڵەیەک ڕوویدا لە کاتی پەیوەندیکردن بە دەروازەی پارەدانەوە',
    resultSuccessTitle: 'ئۆپەراسیۆن بە سەرکەوتوویی تەواو بوو',
    resultSuccessBody: 'پارەدان بە سەرکەوتوویی تەواو بوو',
    resultFailedTitle: 'ئۆپەراسیۆن سەرکەوتوو نەبوو',
    resultFailedBody: 'پارەدان تەواو نەبوو. دووبارە هەوڵبدەوە.',
    tryAgainCta: 'دووبارە هەوڵدان',
    backToDashboard: 'گەڕانەوە بۆ تەختەی کۆنترۆڵ',
  },
  founderNav: {
    dashboard: 'سەرەکی',
    categories: 'بەشەکان',
    banners: 'بانەرەکان',
    products: 'بەرهەمەکان',
    chatRooms: 'ژوورەکانی گفتوگۆ',
    employees: 'کارمەندەکان',
    settings: 'ڕێکخستنەکان',
    auditLog: 'تۆماری پشکنین',
  },
  founderDashboard: {
    title: 'تەختەی کۆنترۆڵی دامەزرێنەر',
    statsTotalUsers: 'کۆی بەکارهێنەران',
    statsTotalRequests: 'کۆی داواکارییەکان',
    statsTotalRevenue: 'کۆی داهات',
    statsTotalProducts: 'کۆی بەرهەمەکان',
    recentEmployees: 'نوێترین کارمەندەکان',
    recentRequests: 'نوێترین داواکارییەکان',
    noEmployees: 'هێشتا هیچ کارمەندێک نییە',
    noRequests: 'هێشتا هیچ داواکارییەک نییە',
  },
  founderCategories: {
    title: 'بەڕێوەبردنی بەشەکان',
    keyLabel: 'کلیل',
    labelArLabel: 'ناونیشان بە عەرەبی',
    labelCkbLabel: 'ناونیشان بە کوردی',
    addCta: 'زیادکردنی بەش',
    empty: 'هێشتا هیچ بەشێک نییە',
  },
  founderBanners: {
    title: 'بەڕێوەبردنی بانەرەکان',
    titleLabel: 'ناونیشان',
    titleArLabel: 'ناونیشان بە عەرەبی',
    titleCkbLabel: 'ناونیشان بە کوردی',
    subtitleArLabel: 'ناونیشانی لاوەکی بە عەرەبی',
    subtitleCkbLabel: 'ناونیشانی لاوەکی بە کوردی',
    urlLabel: 'بەستەر',
    imageLabel: 'وێنە',
    addCta: 'زیادکردنی بانەر',
    empty: 'هێشتا هیچ بانەرێک نییە',
  },
  founderProducts: {
    title: 'بەڕێوەبردنی بەرهەمەکان',
    titleLabel: 'ناونیشان',
    titleArLabel: 'ناونیشان بە عەرەبی',
    titleCkbLabel: 'ناونیشان بە کوردی',
    descriptionArLabel: 'ڕوونکردنەوە بە عەرەبی',
    descriptionCkbLabel: 'ڕوونکردنەوە بە کوردی',
    priceLabel: 'نرخ',
    discountLabel: 'داشکاندن',
    imageLabel: 'وێنە',
    addCta: 'زیادکردنی بەرهەم',
    empty: 'هێشتا هیچ بەرهەمێک نییە',
  },
  founderChatRooms: {
    title: 'بەڕێوەبردنی ژوورەکانی گفتوگۆ',
    nameLabel: 'ناو',
    nameArLabel: 'ناو بە عەرەبی',
    nameCkbLabel: 'ناو بە کوردی',
    addCta: 'زیادکردنی ژوور',
    empty: 'هێشتا هیچ ژوورێک نییە',
  },
  founderEmployees: {
    title: 'بەڕێوەبردنی کارمەندەکان',
    createCta: 'دروستکردنی کارمەند',
    phoneLabel: 'ژمارەی مۆبایل',
    emailLabel: 'ئیمەیل',
    passwordLabel: 'وشەی نهێنی',
    givenNameLabel: 'ناو',
    fatherNameLabel: 'ناوی باوک',
    grandfatherNameLabel: 'ناوی باپیر',
    familyNameLabel: 'ناوی خێزان',
    specializationLabel: 'پسپۆریی',
    suspendCta: 'ڕاگرتنی هەژمار',
    activateCta: 'چالاککردنی هەژمار',
    assignCoAdminCta: 'دانان وەک بەڕێوەبەری دووەم',
    removeCoAdminCta: 'لابردن لە بەڕێوەبەرەکان',
    empty: 'هێشتا هیچ کارمەندێک نییە',
  },
  founderSettings: {
    title: 'ڕێکخستنەکانی پلاتفۆرم',
    chatAudioTrackLabel: 'تراکی دەنگی گفتوگۆ',
    chatBackgroundLabel: 'پاشخانی گفتوگۆ',
    saveCta: 'پاشەکەوتکردن',
  },
  founderAuditLog: {
    title: 'تۆماری پشکنین',
    empty: 'هێشتا هیچ تۆمارێک نییە',
    whenLabel: 'کات',
    actorLabel: 'جێبەجێکەر',
    actionLabel: 'کردەوە',
    tableLabel: 'خشتە',
  },
  landing: {
    heroTitle: 'پلاتفۆرمی خزمەتگوزارییەکانی عێراق',
    heroSubtitle: 'هەموو خزمەتگوزارییەکانت لە یەک شوێندا، بە خێرایی و ئاسانی',
    customerCta: 'وەک کڕیار بچۆ ژوورەوە',
    employeeCta: 'وەک کارمەند بچۆ ژوورەوە',
    footerDisclaimer: '© پلاتفۆرمی خزمەتگوزارییەکانی عێراق. هەموو مافەکان پارێزراون.',
  },
};

const DICTIONARIES = { ar, ckb };
