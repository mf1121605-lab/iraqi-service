import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { CreditCard, Landmark, Loader2, Receipt, Smartphone } from 'lucide-react';
import { useLocale } from '../../../../components/Layout/AppShell';
import { supabaseClient } from '../../../../lib/supabaseClient';
import { useRequireRole } from '../../../../utils/useSession';
import { translate } from '../../../../utils/i18n';

async function callPaymentApi(path, body) {
  const {
    data: { session },
  } = await supabaseClient.auth.getSession();
  const response = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token}`,
    },
    body: JSON.stringify(body),
  });
  return response.json();
}

function loadScriptOnce(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('script failed to load'));
    document.body.appendChild(script);
  });
}

export default function Checkout() {
  const { profile, loading } = useRequireRole(['customer']);
  const router = useRouter();
  const { id: orderId } = router.query;
  const locale = useLocale();
  const t = (path) => translate(locale, path);

  const [order, setOrder] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!profile || !orderId) return;
    supabaseClient
      .from('orders')
      .select('id, quantity, unit_price, total_price, payment_status, products(title_ar, title_ckb)')
      .eq('id', orderId)
      .single()
      .then(({ data }) => setOrder(data));
  }, [profile, orderId]);

  async function handleZainCash() {
    setError('');
    setProcessing(true);
    const result = await callPaymentApi('/api/payment/zaincash-init', { orderId });
    if (result.error || !result.payUrl) {
      setProcessing(false);
      setError(t('payment.gatewayError'));
      return;
    }
    window.location.href = result.payUrl;
  }

  async function handleRafidain() {
    setError('');
    setProcessing(true);
    const result = await callPaymentApi('/api/payment/rafidain-init', { orderId });
    if (result.error || !result.sessionId) {
      setProcessing(false);
      setError(t('payment.gatewayError'));
      return;
    }

    const checkoutJsUrl = process.env.NEXT_PUBLIC_RAFIDAIN_CHECKOUT_JS_URL;
    try {
      await loadScriptOnce(checkoutJsUrl);
      window.Checkout.configure({
        merchant: result.merchantId,
        session: { id: result.sessionId },
      });
      window.Checkout.showPaymentPage();
    } catch {
      setProcessing(false);
      setError(t('payment.gatewayError'));
    }
  }

  if (loading || !profile || !order) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-hero text-white">
        {t('common.loading')}
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-hero p-6 text-white">
      <div className="pointer-events-none absolute -left-16 top-16 h-56 w-56 animate-float rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-10 bottom-16 h-72 w-72 animate-float rounded-full bg-gold-400/20 blur-3xl [animation-delay:1.5s]" />

      <div className="glass-panel relative w-full max-w-md animate-scale-in rounded-4xl p-10 shadow-elevate-lg">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 shadow-inner-glass">
          <CreditCard className="h-7 w-7" strokeWidth={2} aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-center font-display text-2xl font-bold">{t('payment.checkoutTitle')}</h1>

        <div className="mt-6 flex items-center gap-3 rounded-xl2 bg-white/10 p-4 shadow-inner-glass">
          <Receipt className="h-8 w-8 shrink-0 text-white/70" strokeWidth={1.75} aria-hidden="true" />
          <div className="flex-1">
            <p className="text-sm text-white/70">{t('payment.orderSummary')}</p>
            <p className="mt-1 font-semibold">
              {locale === 'ckb' ? order.products?.title_ckb || order.products?.title_ar : order.products?.title_ar}
            </p>
            <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
              <span className="text-sm text-white/70">{t('payment.amountLabel')}</span>
              <span className="font-display text-lg font-bold">{order.total_price} IQD</span>
            </div>
          </div>
        </div>

        <p className="mt-6 text-sm text-white/70">{t('payment.choosePaymentMethod')}</p>
        <div className="mt-3 space-y-3">
          <button
            type="button"
            onClick={handleZainCash}
            disabled={processing}
            className="glass-panel-dark flex w-full items-center justify-between rounded-xl2 px-5 py-4 font-semibold transition-all duration-300 hover:scale-[1.01] hover:shadow-glow disabled:opacity-50 disabled:hover:scale-100"
          >
            <span className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" aria-hidden="true" />
              {t('payment.zaincashName')}
            </span>
            <span className="text-sm text-white/60">{t('payment.payCta')}</span>
          </button>
          <button
            type="button"
            onClick={handleRafidain}
            disabled={processing}
            className="glass-panel-dark flex w-full items-center justify-between rounded-xl2 px-5 py-4 font-semibold transition-all duration-300 hover:scale-[1.01] hover:shadow-glow disabled:opacity-50 disabled:hover:scale-100"
          >
            <span className="flex items-center gap-2">
              <Landmark className="h-4 w-4" aria-hidden="true" />
              {t('payment.rafidainName')}
            </span>
            <span className="text-sm text-white/60">{t('payment.payCta')}</span>
          </button>
        </div>

        {processing && (
          <p className="mt-4 flex items-center justify-center gap-2 text-center text-sm text-white/70">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            {t('payment.processing')}
          </p>
        )}
        {error && <p className="mt-4 animate-slide-down text-center text-sm text-red-200">{error}</p>}
      </div>
    </main>
  );
}
