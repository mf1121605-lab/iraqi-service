import React, { useState } from 'react';

export default function App() {
  const [lang, setLang] = useState<'ar' | 'ku'>('ar');

  return (
    <div className={min-h-screen bg-slate-950 text-slate-100 ${lang === 'ku' ? 'rtl' : 'rtl'} font-sans}>
      {/* شريط التنقل */}
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold bg-gradient-to-l from-amber-400 to-yellow-200 bg-clip-text text-transparent">
              {lang === 'ar' ? 'الخدمة العراقية' : 'خزمەتگوزاری عێراقی'}
            </span>
          </div>
          <button 
            onClick={() => setLang(lang === 'ar' ? 'ku' : 'ar')}
            className="px-4 py-2 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-all text-sm font-semibold"
          >
            {lang === 'ar' ? 'کوردی' : 'العربية'}
          </button>
        </div>
      </nav>

      {/* الواجهة السينمائية الرئيسية */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center space-y-6 max-w-3xl mx-auto my-12">
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
            {lang === 'ar' ? 'بوابتك الذكية للخدمات العراقية' : 'دەروازەی زیرەکت بۆ خزمەتگوزارییە عێراقییەکان'}
          </h1>
          <p className="text-lg text-slate-400">
            {lang === 'ar' 
              ? 'تصفح وأنجز معاملاتك وخدماتك الحكومية والإلكترونية بكل سهولة وأمان وفي مكان واحد.' 
              : 'مامەڵە و خزمەتگوزارییە حکومی و ئەلیکترۆنییەکانت بە ئاسانی و سەلامەتی لە یەک شوێندا ئەنجام بدە.'}
          </p>
        </div>
      </main>
    </div>
  );
}
