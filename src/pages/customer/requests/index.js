import { useEffect, useState } from 'react';
import { ClipboardList, GraduationCap, Inbox, LayoutGrid } from 'lucide-react';
import AppShell, { useLocale } from '../../../components/Layout/AppShell';
import LoadingSpinner from '../../../components/LoadingSpinner';
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
      <main className="flex min-h-dvh items-center justify-center bg-gradient-hero text-white">
        <LoadingSpinner locale={locale} />
      </main>
    );
  }

  const navItems = [
    { href: '/customer/dashboard', label: t('customerHub.categoriesTitle'), icon: LayoutGrid },
    { href: '/customer/requests', label: t('customerHub.myRequestsCta'), active: true, icon: ClipboardList },
    { href: '/customer/tutor', label: t('aiTutor.navCta'), icon: GraduationCap },
  ];

  return (
    <AppShell navItems={navItems} onSignOut={signOut} userId={profile.id}>
      <h2 className="flex items-center gap-2 font-display text-xl font-bold">
        <ClipboardList className="h-5 w-5" aria-hidden="true" />
        {t('customerHub.myRequestsCta')}
      </h2>
      {requests === null ? (
        <LoadingSpinner inline locale={locale} className="mt-4" />
      ) : requests.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-black/10 p-10 text-center dark:border-white/10">
          <Inbox className="h-10 w-10 text-ink-muted opacity-50 dark:text-ink-dark-muted" aria-hidden="true" />
          <p className="text-sm text-ink-muted dark:text-ink-dark-muted">{t('common.noResults')}</p>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {requests.map((request, index) => (
            <li
              key={request.id}
              style={{ animationDelay: `${index * 40}ms` }}
              className="flex animate-slide-up items-center justify-between rounded-xl2 border border-black/5 p-4 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-elevate dark:border-white/10"
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
