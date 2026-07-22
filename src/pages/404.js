import Link from 'next/link';
import { useLocale } from '../components/Layout/AppShell';
import { translate } from '../utils/i18n';
import { useSession } from '../utils/useSession';

function dashboardPath(role) {
  if (role === 'founder' || role === 'co_admin') return '/founder/dashboard';
  if (role === 'employee') return '/employee/dashboard';
  if (role === 'customer') return '/customer/dashboard';
  return '/login';
}

export default function NotFound() {
  const locale = useLocale();
  const t = (path) => translate(locale, path);
  const { profile } = useSession();
  const homeHref = profile ? dashboardPath(profile.role) : '/';

  return (
    <main
      className="dark flex min-h-dvh flex-col items-center justify-center gap-5 bg-[#0d1117] p-6 text-center text-white"
      dir={locale === 'ckb' ? 'rtl' : 'rtl'}
    >
      <p className="text-6xl font-black text-gold-400">404</p>
      <h1 className="font-display text-2xl font-bold">
        {locale === 'ckb' ? 'ئەم پەڕەیە نەدۆزرایەوە' : 'الصفحة غير موجودة'}
      </h1>
      <p className="max-w-xs text-sm text-white/60">
        {locale === 'ckb'
          ? 'ئەم بەستەرە بوونی نییە یان ڕووی تێداوە.'
          : 'الرابط الذي تبحث عنه غير موجود أو تم نقله.'}
      </p>
      <Link
        href={homeHref}
        className="btn-cinematic-gold mt-2 inline-block rounded-full px-6 py-2.5 text-sm font-bold"
      >
        {locale === 'ckb' ? 'بگەڕێوە' : 'العودة للرئيسية'}
      </Link>
    </main>
  );
}
