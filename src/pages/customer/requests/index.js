import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ClipboardList, GraduationCap, Inbox, LayoutGrid, Search } from 'lucide-react';
import AppShell, { useLocale } from '../../../components/Layout/AppShell';
import LoadingSpinner from '../../../components/LoadingSpinner';
import StatusBadge from '../../../components/UI/StatusBadge';
import { supabaseClient } from '../../../lib/supabaseClient';
import { useRequireRole } from '../../../utils/useSession';
import { translate } from '../../../utils/i18n';

const STATUS_FILTERS = [
  { key: 'all', labelAr: 'الكل', labelCkb: 'هەمووی' },
  { key: 'pending', labelAr: 'انتظار', labelCkb: 'چاوەڕێ' },
  { key: 'in_progress', labelAr: 'جارٍ', labelCkb: 'بەردەوامە' },
  { key: 'approved', labelAr: 'مكتمل', labelCkb: 'تەواو' },
  { key: 'rejected', labelAr: 'مرفوض', labelCkb: 'ڕەتکراوە' },
];

export default function CustomerRequests() {
  const { profile, loading, signOut, refreshProfile } = useRequireRole(['customer']);
  const locale = useLocale();
  const t = (path) => translate(locale, path);
  const [requests, setRequests] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    if (!profile) return;
    supabaseClient
      .from('requests')
      .select('id, title, category, status, created_at')
      .order('created_at', { ascending: false })
      .then(({ data }) => setRequests(data ?? []));
  }, [profile]);

  const counts = useMemo(() => {
    if (!requests) return {};
    return requests.reduce((acc, r) => {
      acc.all = (acc.all ?? 0) + 1;
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    }, {});
  }, [requests]);

  const filtered = useMemo(
    () => (activeFilter === 'all' ? (requests ?? []) : (requests ?? []).filter((r) => r.status === activeFilter)),
    [requests, activeFilter]
  );

  if (loading || !profile) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-gradient-hero text-white">
        <LoadingSpinner locale={locale} />
      </main>
    );
  }

  const navItems = [
    { href: '/customer/dashboard', label: t('customerHub.categoriesTitle'), icon: LayoutGrid },
    { href: '/customer/search', label: t('search.navLabel'), icon: Search },
    { href: '/customer/requests', label: t('customerHub.myRequestsCta'), active: true, icon: ClipboardList },
    { href: '/customer/tutor', label: t('aiTutor.navCta'), icon: GraduationCap },
  ];

  return (
    <AppShell navItems={navItems} onSignOut={signOut} userId={profile.id} profile={profile} onProfileUpdated={refreshProfile}>
      {/* Header + stats */}
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-xl font-bold">
          <ClipboardList className="h-5 w-5" aria-hidden="true" />
          {t('customerHub.myRequestsCta')}
        </h2>
        {requests !== null && (
          <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-bold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
            {counts.all ?? 0}
          </span>
        )}
      </div>

      {/* Quick-stat chips */}
      {requests !== null && (
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            { key: 'approved', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
            { key: 'in_progress', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
            { key: 'pending', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
          ].map(({ key, color }) =>
            counts[key] ? (
              <span key={key} className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${color}`}>
                {STATUS_FILTERS.find((f) => f.key === key)?.[locale === 'ar' ? 'labelAr' : 'labelCkb']} ·{' '}
                {counts[key]}
              </span>
            ) : null
          )}
        </div>
      )}

      {/* Filter tabs */}
      <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setActiveFilter(f.key)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeFilter === f.key
                ? 'bg-brand-600 text-white'
                : 'bg-black/5 text-ink-muted hover:bg-black/10 dark:bg-white/5 dark:text-ink-dark-muted dark:hover:bg-white/10'
            }`}
          >
            {locale === 'ar' ? f.labelAr : f.labelCkb}
            {counts[f.key] ? (
              <span className="ms-1 opacity-70">({counts[f.key]})</span>
            ) : null}
          </button>
        ))}
      </div>

      {/* List */}
      {requests === null ? (
        <LoadingSpinner inline locale={locale} className="mt-4" />
      ) : filtered.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-black/10 p-10 text-center dark:border-white/10">
          <Inbox className="h-10 w-10 text-ink-muted opacity-50 dark:text-ink-dark-muted" aria-hidden="true" />
          <p className="text-sm text-ink-muted dark:text-ink-dark-muted">{t('common.noResults')}</p>
        </div>
      ) : (
        <ul className="mt-3 space-y-2">
          {filtered.map((request, index) => (
            <li key={request.id} style={{ animationDelay: `${index * 40}ms` }} className="animate-slide-up">
              <Link
                href={`/customer/requests/${request.id}`}
                className="flex items-center justify-between rounded-xl2 border border-black/5 p-4 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-elevate dark:border-white/10"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{request.title}</p>
                  <p className="mt-0.5 text-xs text-ink-muted dark:text-ink-dark-muted">
                    {new Date(request.created_at).toLocaleDateString(locale === 'ar' ? 'ar-IQ' : 'ckb')}
                  </p>
                </div>
                <div className="ms-3 flex shrink-0 items-center gap-2">
                  <StatusBadge status={request.status} locale={locale} />
                  <ChevronLeft className="h-4 w-4 text-ink-muted opacity-40 rtl:rotate-180 dark:text-ink-dark-muted" aria-hidden="true" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
