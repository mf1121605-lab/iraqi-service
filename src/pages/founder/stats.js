import { useEffect, useState } from 'react';
import { BarChart3, ClipboardList, Timer, UserCog, Users } from 'lucide-react';
import AppShell, { useLocale } from '../../components/Layout/AppShell';
import LoadingSpinner from '../../components/LoadingSpinner';
import { supabaseClient } from '../../lib/supabaseClient';
import { useRequireRole } from '../../utils/useSession';
import { useFounderNav } from '../../utils/founderNav';
import { translate } from '../../utils/i18n';
import { categoryLabel, useCategories } from '../../utils/useCategories';

export default function FounderStats() {
  const { profile, loading, signOut } = useRequireRole(['founder']);
  const locale = useLocale();
  const t = (path) => translate(locale, path);
  const navItems = useFounderNav(locale, 'stats');
  // All categories, including deactivated ones — historical stats can
  // still reference a category the founder has since turned off.
  const categories = useCategories({ activeOnly: false });
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!profile) return;
    supabaseClient.rpc('get_founder_stats').then(({ data }) => setStats(data));
  }, [profile]);

  if (loading || !profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-hero text-white">
        <LoadingSpinner locale={locale} />
      </main>
    );
  }

  return (
    <AppShell navItems={navItems} onSignOut={signOut} userId={profile.id}>
      <h2 className="flex items-center gap-2 font-display text-lg font-bold">
        <BarChart3 className="h-5 w-5" aria-hidden="true" />
        {t('founderStats.title')}
      </h2>

      {!stats ? (
        <LoadingSpinner inline locale={locale} className="mt-4" />
      ) : (
        <div className="mt-6 animate-fade-in space-y-8">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-black/5 bg-white/60 p-6 text-center shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-elevate dark:border-white/10 dark:bg-surface-dark-alt/60">
              <ClipboardList className="mx-auto h-6 w-6 text-brand-600 dark:text-brand-300" aria-hidden="true" />
              <p className="mt-2 text-3xl font-bold">{stats.total_requests}</p>
              <p className="text-sm text-ink-muted dark:text-ink-dark-muted">{t('founderStats.totalRequests')}</p>
            </div>
            <div className="rounded-2xl border border-black/5 bg-white/60 p-6 text-center shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-elevate dark:border-white/10 dark:bg-surface-dark-alt/60">
              <UserCog className="mx-auto h-6 w-6 text-brand-600 dark:text-brand-300" aria-hidden="true" />
              <p className="mt-2 text-3xl font-bold">{stats.total_employees}</p>
              <p className="text-sm text-ink-muted dark:text-ink-dark-muted">{t('founderStats.totalEmployees')}</p>
            </div>
            <div className="rounded-2xl border border-black/5 bg-white/60 p-6 text-center shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-elevate dark:border-white/10 dark:bg-surface-dark-alt/60">
              <Users className="mx-auto h-6 w-6 text-brand-600 dark:text-brand-300" aria-hidden="true" />
              <p className="mt-2 text-3xl font-bold">{stats.total_customers}</p>
              <p className="text-sm text-ink-muted dark:text-ink-dark-muted">{t('founderStats.totalCustomers')}</p>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-2xl border border-black/5 bg-white/60 p-6 shadow-soft transition-shadow duration-300 hover:shadow-elevate dark:border-white/10 dark:bg-surface-dark-alt/60">
              <h3 className="font-semibold">{t('founderStats.byStatus')}</h3>
              <ul className="mt-3 space-y-1 text-sm">
                {Object.entries(stats.requests_by_status ?? {}).map(([status, count]) => (
                  <li key={status} className="flex justify-between">
                    <span>{t(`requestStatus.${status}`)}</span>
                    <span className="font-semibold">{count}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-black/5 bg-white/60 p-6 shadow-soft transition-shadow duration-300 hover:shadow-elevate dark:border-white/10 dark:bg-surface-dark-alt/60">
              <h3 className="font-semibold">{t('founderStats.byCategory')}</h3>
              <ul className="mt-3 space-y-1 text-sm">
                {Object.entries(stats.requests_by_category ?? {}).map(([categoryKey, count]) => (
                  <li key={categoryKey} className="flex justify-between">
                    <span>
                      {(() => {
                        const match = categories?.find((category) => category.key === categoryKey);
                        return match ? categoryLabel(match, locale) : categoryKey;
                      })()}
                    </span>
                    <span className="font-semibold">{count}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="rounded-2xl border border-black/5 bg-white/60 p-6 shadow-soft transition-shadow duration-300 hover:shadow-elevate dark:border-white/10 dark:bg-surface-dark-alt/60">
            <h3 className="flex items-center gap-2 font-semibold">
              <Timer className="h-4 w-4" aria-hidden="true" />
              {t('founderStats.avgResponse')}
            </h3>
            <ul className="mt-3 space-y-1 text-sm">
              {(stats.employee_avg_response_minutes ?? []).map((row) => (
                <li key={row.employee_id} className="flex justify-between">
                  <span>{[row.given_name, row.family_name].filter(Boolean).join(' ') || row.employee_id}</span>
                  <span className="font-semibold">{row.avg_minutes ?? '—'}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </AppShell>
  );
}
