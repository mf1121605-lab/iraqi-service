import { useEffect, useState } from 'react';
import { BarChart3, ClipboardList, Coins, Star, Trophy, UserCog, Users } from 'lucide-react';
import AppShell, { useLocale } from '../../components/Layout/AppShell';
import LoadingSpinner from '../../components/LoadingSpinner';
import { supabaseClient } from '../../lib/supabaseClient';
import { useRequireRole } from '../../utils/useSession';
import { useFounderNav } from '../../utils/founderNav';
import { translate } from '../../utils/i18n';
import { categoryLabel, useCategories } from '../../utils/useCategories';

export default function FounderStats() {
  const { profile, loading, signOut, refreshProfile } = useRequireRole(['founder']);
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
    <AppShell navItems={navItems} onSignOut={signOut} userId={profile.id} profile={profile} onProfileUpdated={refreshProfile}>
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
              <Trophy className="h-4 w-4 text-gold-500" aria-hidden="true" />
              {t('founderStats.leaderboardTitle')}
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              {(stats.employee_avg_response_minutes ?? []).map((row, index) => (
                <li
                  key={row.employee_id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-black/[0.03] px-3 py-2 dark:bg-white/5"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600/10 text-xs font-bold text-brand-700 dark:text-brand-300">
                      {index + 1}
                    </span>
                    <span className="truncate">{[row.given_name, row.family_name].filter(Boolean).join(' ') || row.employee_id}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 text-xs text-ink-muted dark:text-ink-dark-muted">
                    <span className="font-semibold text-ink-light dark:text-ink-dark">
                      {row.requests_handled} {t('founderStats.requestsHandledLabel')}
                    </span>
                    <span>
                      {row.avg_minutes ?? '—'} {t('founderStats.minutesLabel')}
                    </span>
                    {row.avg_stars ? (
                      <span className="flex items-center gap-0.5 text-gold-500">
                        <Star className="h-3.5 w-3.5 fill-gold-400 text-gold-400" aria-hidden="true" />
                        {row.avg_stars}
                      </span>
                    ) : (
                      <span className="text-ink-muted/60 dark:text-ink-dark-muted/60">{t('founderStats.noRatingsYet')}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-black/5 bg-white/60 p-6 shadow-soft transition-shadow duration-300 hover:shadow-elevate dark:border-white/10 dark:bg-surface-dark-alt/60">
            <h3 className="flex items-center gap-2 font-semibold">
              <Coins className="h-4 w-4 text-emerald-500" aria-hidden="true" />
              {t('founderStats.revenueTitle')}
            </h3>
            {(stats.revenue_by_product ?? []).length === 0 ? (
              <p className="mt-3 text-sm text-ink-muted dark:text-ink-dark-muted">{t('founderStats.revenueEmpty')}</p>
            ) : (
              (() => {
                const rows = stats.revenue_by_product ?? [];
                const total = rows.reduce((sum, row) => sum + Number(row.revenue), 0);
                const colors = ['bg-brand-500', 'bg-gold-500', 'bg-emerald-500', 'bg-rose-500', 'bg-sky-500', 'bg-violet-500'];
                return (
                  <>
                    <div className="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
                      {rows.map((row, index) => (
                        <div
                          key={row.title}
                          className={colors[index % colors.length]}
                          style={{ width: `${total > 0 ? (Number(row.revenue) / total) * 100 : 0}%` }}
                          title={row.title}
                        />
                      ))}
                    </div>
                    <ul className="mt-4 space-y-1.5 text-sm">
                      {rows.map((row, index) => (
                        <li key={row.title} className="flex items-center justify-between gap-2">
                          <span className="flex min-w-0 items-center gap-2">
                            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${colors[index % colors.length]}`} aria-hidden="true" />
                            <span className="truncate">{row.title}</span>
                          </span>
                          <span className="shrink-0 font-semibold" dir="ltr">
                            {Number(row.revenue).toLocaleString()}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </>
                );
              })()
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
