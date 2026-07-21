import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { ArrowRight, BadgeCheck, ClipboardList, GraduationCap, LayoutGrid, Search, Star } from 'lucide-react';
import AppShell, { useLocale } from '../../../components/Layout/AppShell';
import LoadingSpinner from '../../../components/LoadingSpinner';
import Avatar from '../../../components/Chat/Avatar';
import { supabaseClient } from '../../../lib/supabaseClient';
import { useRequireRole } from '../../../utils/useSession';
import { translate } from '../../../utils/i18n';

export default function EmployeePublicProfile() {
  const { profile, loading, signOut, refreshProfile } = useRequireRole(['customer']);
  const router = useRouter();
  const { id } = router.query;
  const locale = useLocale();
  const t = (path) => translate(locale, path);

  const [employee, setEmployee] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!profile || !id) return;

    async function load() {
      const { data } = await supabaseClient.rpc('get_employee_public_profile', { p_employee_id: id });
      if (!data || data.length === 0) {
        router.replace('/customer/dashboard');
        return;
      }
      setEmployee(data[0]);

      const { data: ratingRows } = await supabaseClient
        .from('request_ratings')
        .select('stars, comment, created_at')
        .eq('employee_id', id)
        .eq('customer_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(5);
      setRatings(ratingRows ?? []);
      setFetching(false);
    }

    load();
  }, [profile, id, router]);

  if (loading || !profile || fetching) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-gradient-hero text-white">
        <LoadingSpinner locale={locale} />
      </main>
    );
  }

  if (!employee) return null;

  const navItems = [
    { href: '/customer/dashboard', label: t('customerHub.categoriesTitle'), icon: LayoutGrid },
    { href: '/customer/search', label: t('search.navLabel'), icon: Search },
    { href: '/customer/requests', label: t('customerHub.myRequestsCta'), icon: ClipboardList },
    { href: '/customer/tutor', label: t('aiTutor.navCta'), icon: GraduationCap },
  ];

  const fullName = [employee.given_name, employee.family_name].filter(Boolean).join(' ');
  const avgStars = Number(employee.avg_stars) || 0;

  return (
    <AppShell navItems={navItems} onSignOut={signOut} userId={profile.id} profile={profile} onProfileUpdated={refreshProfile}>
      <div className="mx-auto max-w-lg">
        <Link
          href="/customer/requests"
          className="mb-4 flex items-center gap-1.5 text-sm text-ink-muted underline underline-offset-4 transition-colors hover:text-ink-light dark:text-ink-dark-muted"
        >
          <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden="true" />
          {t('common.back')}
        </Link>

        <div className="rounded-2xl border border-gold-400/20 bg-white/60 p-6 shadow-soft dark:bg-surface-dark-alt/60">
          <div className="flex items-center gap-4">
            <Avatar avatarKey={employee.avatar_key} name={employee.given_name} seed={employee.id} className="h-20 w-20 text-2xl" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-xl font-bold">{fullName}</h2>
                {employee.is_verified && (
                  <span className="flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                    <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('employeeProfile.verifiedLabel')}
                  </span>
                )}
              </div>
              {employee.specialization && (
                <p className="mt-0.5 text-sm text-ink-muted dark:text-ink-dark-muted">{employee.specialization}</p>
              )}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 divide-x divide-black/5 rounded-xl bg-black/[0.03] py-4 dark:divide-white/5 dark:bg-white/[0.04]" dir="ltr">
            <div className="px-4 text-center">
              <p className="font-display text-2xl font-bold text-gold-500">{avgStars > 0 ? avgStars.toFixed(1) : '—'}</p>
              <p className="mt-0.5 text-[11px] text-ink-muted dark:text-ink-dark-muted">{t('employeeProfile.avgRating')}</p>
            </div>
            <div className="px-4 text-center">
              <p className="font-display text-2xl font-bold">{Number(employee.rating_count)}</p>
              <p className="mt-0.5 text-[11px] text-ink-muted dark:text-ink-dark-muted">{t('employeeProfile.ratingCount')}</p>
            </div>
            <div className="px-4 text-center">
              <p className="font-display text-2xl font-bold text-emerald-600 dark:text-emerald-400">{Number(employee.completed_count)}</p>
              <p className="mt-0.5 text-[11px] text-ink-muted dark:text-ink-dark-muted">{t('employeeProfile.completedCount')}</p>
            </div>
          </div>

          {avgStars > 0 && (
            <div className="mt-4 flex items-center justify-center gap-1" dir="ltr" aria-label={`${avgStars} ${t('requestRating.starsLabel')}`}>
              {[1, 2, 3, 4, 5].map((v) => (
                <Star
                  key={v}
                  className={`h-6 w-6 ${v <= Math.round(avgStars) ? 'fill-gold-400 text-gold-400' : 'text-black/10 dark:text-white/10'}`}
                  aria-hidden="true"
                />
              ))}
            </div>
          )}
        </div>

        {ratings.length > 0 && (
          <div className="mt-6">
            <h3 className="font-display text-sm font-bold">{t('employeeProfile.myRatingsTitle')}</h3>
            <ul className="mt-3 space-y-3">
              {ratings.map((r, i) => (
                <li key={i} className="rounded-2xl border border-black/5 bg-white/60 p-4 shadow-soft dark:border-white/10 dark:bg-surface-dark-alt/60">
                  <div className="flex items-center gap-1" dir="ltr">
                    {[1, 2, 3, 4, 5].map((v) => (
                      <Star
                        key={v}
                        className={`h-4 w-4 ${v <= r.stars ? 'fill-gold-400 text-gold-400' : 'text-black/10 dark:text-white/10'}`}
                        aria-hidden="true"
                      />
                    ))}
                    <span className="me-auto text-xs text-ink-muted dark:text-ink-dark-muted">
                      {new Date(r.created_at).toLocaleDateString(locale === 'ar' ? 'ar-IQ' : 'ckb')}
                    </span>
                  </div>
                  {r.comment && <p className="mt-1.5 text-sm text-ink-light dark:text-ink-dark">{r.comment}</p>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </AppShell>
  );
}
