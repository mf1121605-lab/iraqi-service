import Link from 'next/link';
import { useRouter } from 'next/router';
import { useLocale } from '../../../../components/Layout/AppShell';
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
        {t('common.loading')}
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-hero p-6 text-white">
      <div className="glass-panel w-full max-w-md animate-fade-in rounded-3xl p-10 text-center shadow-glass">
        <h1 className="font-display text-2xl font-bold">
          {success ? t('payment.resultSuccessTitle') : t('payment.resultFailedTitle')}
        </h1>
        <p className="mt-3 text-white/80">{success ? t('payment.resultSuccessBody') : t('payment.resultFailedBody')}</p>

        <div className="mt-8 space-y-2">
          {!success && (
            <button
              type="button"
              onClick={() => router.back()}
              className="w-full rounded-xl2 bg-gradient-gold px-4 py-3 font-bold text-brand-950 transition hover:opacity-90"
            >
              {t('payment.tryAgainCta')}
            </button>
          )}
          <Link
            href="/customer/dashboard"
            className="block rounded-xl2 border border-white/20 px-4 py-3 font-semibold hover:bg-white/10"
          >
            {t('payment.backToDashboard')}
          </Link>
        </div>
      </div>
    </main>
  );
}
