import { useEffect, useState } from 'react';
import AppShell, { useLocale } from '../../../components/Layout/AppShell';
import StatusBadge from '../../../components/UI/StatusBadge';
import { supabaseClient } from '../../../lib/supabaseClient';
import { useRequireRole } from '../../../utils/useSession';
import { translate } from '../../../utils/i18n';

export default function CustomerRequests() {
  const { profile, loading, signOut } = useRequireRole(['customer']);
  const locale = useLocale();
  const t = (path) => translate(locale, path);
  const [requests, setRequests] = useState(null);

  useEffect(() => {
    if (!profile) return;
    supabaseClient
      .from('requests')
      .select('id, title, category, status, created_at')
      .order('created_at', { ascending: false })
      .then(({ data }) => setRequests(data ?? []));
  }, [profile]);

  if (loading || !profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-hero text-white">
        {t('common.loading')}
      </main>
    );
  }

  const navItems = [
    { href: '/customer/dashboard', label: t('customerHub.categoriesTitle') },
    { href: '/customer/requests', label: t('customerHub.myRequestsCta'), active: true },
  ];

  return (
    <AppShell navItems={navItems} onSignOut={signOut}>
      <h2 className="font-display text-xl font-bold">{t('customerHub.myRequestsCta')}</h2>
      {requests === null ? (
        <p className="mt-4 text-sm">{t('common.loading')}</p>
      ) : requests.length === 0 ? (
        <p className="mt-4 text-sm text-ink-muted dark:text-ink-dark-muted">{t('common.noResults')}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {requests.map((request) => (
            <li
              key={request.id}
              className="flex items-center justify-between rounded-xl2 border border-black/5 p-4 shadow-soft dark:border-white/10"
            >
              <div>
                <p className="font-semibold">{request.title}</p>
                <p className="text-xs text-ink-muted dark:text-ink-dark-muted">
                  {new Date(request.created_at).toLocaleDateString(locale === 'ar' ? 'ar-IQ' : 'ckb')}
                </p>
              </div>
              <StatusBadge status={request.status} locale={locale} />
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
