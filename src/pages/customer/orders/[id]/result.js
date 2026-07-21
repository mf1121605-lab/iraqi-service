import Link from 'next/link';
import { useRouter } from 'next/router';
import { CircleCheck as CheckCircle2, LayoutGrid, RotateCcw, Circle as XCircle } from 'lucide-react';
import { useLocale } from '../../../../components/Layout/AppShell';
import LoadingSpinner from '../../../../components/LoadingSpinner';
import { useRequireRole } from '../../../../utils/useSession';
import { translate } from '../../../../utils/i18n';

export default function PaymentResult() {
  const { profile, loading } = useRequireRole(['customer']);
  const router = useRouter();
  const locale = useLocale();
  const t = (path) => translate(locale, path);
  const success = router.query.status === 'success';

  if (loading || !profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-hero text-white">
        <LoadingSpinner locale={locale} />
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-hero p-6 text-white">
      <div className="pointer-events-none absolute -left-16 top-16 h-56 w-56 animate-float rounded-full bg-white/10 blur-xl [will-change:transform]" />
      <div className="pointer-events-none absolute -right-10 bottom-16 h-72 w-72 animate-float rounded-full bg-gold-400/20 blur-xl [will-change:transform] [animation-delay:1.5s]" />

      <div className="glass-panel relative w-full max-w-md animate-scale-in rounded-4xl p-10 text-center shadow-elevate-lg">
        <span
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl shadow-inner-glass ${
            success ? 'bg-brand-500/20 text-brand-200' : 'bg-red-500/20 text-red-200'
          }`}
        >
          {success ? (
            <CheckCircle2 className="h-8 w-8" strokeWidth={2} aria-hidden="true" />
          ) : (
            <XCircle className="h-8 w-8" strokeWidth={2} aria-hidden="true" />
          )}
        </span>
        <h1 className="mt-4 font-display text-2xl font-bold">
          {success ? t('payment.resultSuccessTitle') : t('payment.resultFailedTitle')}
        </h1>
        <p className="mt-3 text-white/80">{success ? t('payment.resultSuccessBody') : t('payment.resultFailedBody')}</p>

        <div className="mt-8 space-y-2">
          {!success && (
            <button
              type="button"
              onClick={() => router.back()}
              className="flex w-full items-center justify-center gap-2 rounded-xl2 bg-gradient-gold px-4 py-3 font-bold text-brand-950 shadow-glow transition-all duration-300 hover:scale-[1.01] hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-brand-900"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              {t('payment.tryAgainCta')}
            </button>
          )}
          <Link
            href="/customer/dashboard"
            className="flex items-center justify-center gap-2 rounded-xl2 border border-white/20 px-4 py-3 font-semibold transition-all duration-300 hover:bg-white/10"
          >
            <LayoutGrid className="h-4 w-4" aria-hidden="true" />
            {t('payment.backToDashboard')}
          </Link>
        </div>
      </div>
    </main>
  );
}
