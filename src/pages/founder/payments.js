import { useEffect, useState } from 'react';
import { CreditCard, FileDown } from 'lucide-react';
import AppShell, { useLocale } from '../../components/Layout/AppShell';
import LoadingSpinner from '../../components/LoadingSpinner';
import { supabaseClient } from '../../lib/supabaseClient';
import { useRequireRole } from '../../utils/useSession';
import { useFounderNav } from '../../utils/founderNav';
import { translate } from '../../utils/i18n';

function methodBadge(method) {
  if (method === 'zaincash') {
    return (
      <span className="inline-flex items-center rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-semibold text-green-400">
        ZainCash
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-blue-500/15 px-2 py-0.5 text-xs font-semibold text-blue-400">
      Qi Card
    </span>
  );
}

function filterByPeriod(payments, period) {
  if (period === 'all') return payments;
  const now = new Date();
  const start = new Date(now);
  if (period === 'week') {
    const day = start.getDay();
    start.setDate(start.getDate() - day);
  } else {
    start.setDate(1);
  }
  start.setHours(0, 0, 0, 0);
  return payments.filter((p) => new Date(p.created_at) >= start);
}

export default function FounderPayments() {
  const { profile, loading, signOut, refreshProfile } = useRequireRole(['founder', 'co_admin']);
  const locale = useLocale();
  const t = (path) => translate(locale, path);
  const navItems = useFounderNav(locale, 'payments');

  const [payments, setPayments] = useState(null);
  const [period, setPeriod] = useState('all');

  useEffect(() => {
    if (!profile) return;
    supabaseClient
      .from('request_payments')
      .select(`
        id, method, amount, notes, created_at,
        request:requests(id, title, category),
        employee:profiles!employee_id(given_name, family_name),
        customer:profiles!customer_id(given_name, family_name)
      `)
      .order('created_at', { ascending: false })
      .then(({ data }) => setPayments(data ?? []));
  }, [profile]);

  if (loading || !profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-hero text-white">
        <LoadingSpinner locale={locale} />
      </main>
    );
  }

  const filtered = filterByPeriod(payments ?? [], period);
  const totalAmount = filtered.reduce((sum, p) => sum + Number(p.amount), 0);
  const zainCount = filtered.filter((p) => p.method === 'zaincash').length;
  const qiCount = filtered.filter((p) => p.method === 'qi_card').length;

  const formatDate = (iso) =>
    new Date(iso).toLocaleString(locale === 'ar' ? 'ar-IQ' : 'ckb', { timeZone: 'Asia/Baghdad' });
  const empName = (emp) => [emp?.given_name, emp?.family_name].filter(Boolean).join(' ') || '—';

  return (
    <AppShell navItems={navItems} onSignOut={signOut} userId={profile.id} profile={profile} onProfileUpdated={refreshProfile}>
      <style>{`
        @media print {
          nav, header, aside, .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          .print-table { width: 100%; border-collapse: collapse; font-size: 12px; }
          .print-table th, .print-table td { border: 1px solid #ccc; padding: 6px 8px; text-align: right; }
          .print-table th { background: #f3f4f6; font-weight: bold; }
          .print-summary { margin-top: 16px; font-size: 13px; }
        }
      `}</style>

      <div className="flex flex-wrap items-center justify-between gap-4 no-print">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold">
          <CreditCard className="h-5 w-5" aria-hidden="true" />
          {t('payments.pageTitle')}
        </h2>
        <div className="flex items-center gap-2">
          {['all', 'week', 'month'].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                period === p
                  ? 'bg-amber-500 text-white'
                  : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
              }`}
            >
              {p === 'all' ? t('payments.filterAll') : p === 'week' ? t('payments.filterThisWeek') : t('payments.filterThisMonth')}
            </button>
          ))}
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-lg bg-gold-400/20 px-3 py-1.5 text-sm font-semibold text-gold-300 transition-colors hover:bg-gold-400/30"
          >
            <FileDown className="h-4 w-4" aria-hidden="true" />
            {t('payments.exportPdfCta')}
          </button>
        </div>
      </div>

      {payments === null ? (
        <LoadingSpinner inline locale={locale} className="mt-6" />
      ) : filtered.length === 0 ? (
        <p className="mt-8 text-center text-sm text-ink-muted dark:text-ink-dark-muted">{t('payments.empty')}</p>
      ) : (
        <>
          <div className="mt-6 overflow-x-auto rounded-2xl border border-black/5 bg-white/60 shadow-soft dark:border-white/10 dark:bg-surface-dark-alt/60">
            <table className="print-table w-full text-sm">
              <thead>
                <tr className="border-b border-black/5 dark:border-white/10">
                  {[t('payments.employeeCol'), t('payments.customerCol'), t('payments.serviceCol'), t('payments.methodCol'), t('payments.amountCol'), t('payments.dateTimeCol')].map((header) => (
                    <th key={header} className="px-4 py-3 text-right text-xs font-semibold text-ink-muted dark:text-ink-dark-muted">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {filtered.map((p) => (
                  <tr key={p.id} className="transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-medium">{empName(p.employee)}</td>
                    <td className="px-4 py-3">{empName(p.customer)}</td>
                    <td className="px-4 py-3 max-w-[160px] truncate">{p.request?.title || '—'}</td>
                    <td className="px-4 py-3">{methodBadge(p.method)}</td>
                    <td className="px-4 py-3 font-semibold text-amber-600 dark:text-amber-400" dir="ltr">
                      {Number(p.amount).toLocaleString('ar-IQ')} IQD
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-muted dark:text-ink-dark-muted">{formatDate(p.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="print-summary mt-4 flex flex-wrap gap-4">
            <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3">
              <p className="text-xs text-amber-300/70">{t('payments.totalLabel')}</p>
              <p className="mt-0.5 font-bold text-amber-400" dir="ltr">{totalAmount.toLocaleString('ar-IQ')} IQD</p>
            </div>
            <div className="rounded-xl border border-green-400/20 bg-green-400/10 px-4 py-3">
              <p className="text-xs text-green-300/70">ZainCash</p>
              <p className="mt-0.5 font-bold text-green-400">{zainCount}</p>
            </div>
            <div className="rounded-xl border border-blue-400/20 bg-blue-400/10 px-4 py-3">
              <p className="text-xs text-blue-300/70">Qi Card</p>
              <p className="mt-0.5 font-bold text-blue-400">{qiCount}</p>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
