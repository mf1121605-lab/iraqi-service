import { useEffect, useState } from 'react';
import { LayoutDashboard, Users, ClipboardList, ShoppingBag, DollarSign } from 'lucide-react';
import AppShell, { useLocale } from '../../components/Layout/AppShell';
import { supabaseClient } from '../../lib/supabaseClient';
import { useRequireRole } from '../../utils/useSession';
import { useFounderNav } from '../../utils/founderNav';
import { translate } from '../../utils/i18n';

export default function FounderDashboard() {
  const { profile, loading, signOut } = useRequireRole(['founder']);
  const locale = useLocale();
  const t = (path) => translate(locale, path);
  const navItems = useFounderNav(locale, 'dashboard');
  const [stats, setStats] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    if (!profile) return;
    Promise.all([
      supabaseClient.from('profiles').select('id', { count: 'exact', head: true }),
      supabaseClient.from('requests').select('id', { count: 'exact', head: true }),
      supabaseClient.from('products').select('id', { count: 'exact', head: true }),
      supabaseClient.from('orders').select('total_price').eq('payment_status', 'paid'),
      supabaseClient.from('profiles').select('id, given_name, father_name, role, specialization, created_at').eq('role', 'employee').order('created_at', { ascending: false }).limit(5),
      supabaseClient.from('requests').select('id, title, status, created_at').order('created_at', { ascending: false }).limit(5),
    ]).then(([usersRes, reqRes, prodRes, ordersRes, empRes, reqListRes]) => {
      const revenue = (ordersRes.data ?? []).reduce((sum, o) => sum + Number(o.total_price || 0), 0);
      setStats({ users: usersRes.count ?? 0, requests: reqRes.count ?? 0, products: prodRes.count ?? 0, revenue });
      setEmployees(empRes.data ?? []);
      setRequests(reqListRes.data ?? []);
    });
  }, [profile]);

  if (loading || !profile) {
    return <main className="flex min-h-screen items-center justify-center bg-gradient-hero text-white">{t('common.loading')}</main>;
  }

  return (
    <AppShell navItems={navItems} onSignOut={signOut} userId={profile.id}>
      <h2 className="flex items-center gap-2 font-display text-xl font-bold">
        <LayoutDashboard className="h-5 w-5" aria-hidden="true" />
        {t('founderDashboard.title')}
      </h2>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: Users, label: t('founderDashboard.statsTotalUsers'), value: stats?.users ?? '—' },
          { icon: ClipboardList, label: t('founderDashboard.statsTotalRequests'), value: stats?.requests ?? '—' },
          { icon: DollarSign, label: t('founderDashboard.statsTotalRevenue'), value: `${stats?.revenue ?? 0} IQD` },
          { icon: ShoppingBag, label: t('founderDashboard.statsTotalProducts'), value: stats?.products ?? '—' },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="glass-panel-dark animate-slide-up rounded-2xl p-6 shadow-soft" style={{ animationDelay: `${i * 60}ms` }}>
              <Icon className="h-6 w-6 text-white/70" aria-hidden="true" />
              <p className="mt-3 text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-white/60">{stat.label}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <h3 className="font-semibold">{t('founderDashboard.recentEmployees')}</h3>
          {employees.length === 0 ? (
            <p className="mt-2 text-sm text-ink-muted dark:text-ink-dark-muted">{t('founderDashboard.noEmployees')}</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {employees.map((emp) => (
                <li key={emp.id} className="rounded-xl2 border border-black/5 p-3 text-sm dark:border-white/10">
                  <p className="font-semibold">{[emp.given_name, emp.father_name].filter(Boolean).join(' ') || '—'}</p>
                  <p className="text-xs text-ink-muted dark:text-ink-dark-muted">{emp.specialization || ''}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h3 className="font-semibold">{t('founderDashboard.recentRequests')}</h3>
          {requests.length === 0 ? (
            <p className="mt-2 text-sm text-ink-muted dark:text-ink-dark-muted">{t('founderDashboard.noRequests')}</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {requests.map((req) => (
                <li key={req.id} className="rounded-xl2 border border-black/5 p-3 text-sm dark:border-white/10">
                  <p className="font-semibold">{req.title}</p>
                  <p className="text-xs text-ink-muted dark:text-ink-dark-muted">{req.status}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}
