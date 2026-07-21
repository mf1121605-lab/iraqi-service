import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Inbox, MessageCircle } from 'lucide-react';
import AppShell, { useLocale } from '../../components/Layout/AppShell';
import LoadingSpinner from '../../components/LoadingSpinner';
import { supabaseClient } from '../../lib/supabaseClient';
import { useRequireRole } from '../../utils/useSession';
import { translate } from '../../utils/i18n';
import { useFounderNav } from '../../utils/founderNav';

const STATUS_COLORS = {
  pending:  'bg-amber-500/20 text-amber-300',
  accepted: 'bg-emerald-500/20 text-emerald-300',
  rejected: 'bg-red-500/20 text-red-300',
};

export default function FounderQuickRequests() {
  const { profile, loading, signOut, refreshProfile } = useRequireRole(['founder', 'co_admin']);
  const locale = useLocale();
  const t = (path) => translate(locale, path);
  const navItems = useFounderNav(locale, 'quick-requests');

  const [requests, setRequests] = useState(null);

  async function loadRequests() {
    const { data } = await supabaseClient
      .from('quick_requests')
      .select('id, section_name, content, status, thread_id, created_at, customer:profiles!customer_id(given_name, family_name, phone), employee:profiles!employee_id(given_name)')
      .order('created_at', { ascending: false });
    setRequests(data ?? []);
  }

  useEffect(() => {
    if (!profile) return undefined;
    loadRequests();
    const channel = supabaseClient
      .channel('founder-quick-requests-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quick_requests' }, loadRequests)
      .subscribe();
    return () => supabaseClient.removeChannel(channel);
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading || !profile) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <LoadingSpinner locale={locale} />
      </main>
    );
  }

  return (
    <AppShell
      onSignOut={signOut}
      userId={profile.id}
      profile={profile}
      onProfileUpdated={refreshProfile}
      navItems={navItems}
    >
      <div className="mx-auto max-w-4xl space-y-6">
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-white">
          <Inbox className="h-6 w-6 text-amber-400" aria-hidden="true" />
          {t('founderPanel.navQuickRequests')}
        </h1>

        {requests === null ? (
          <LoadingSpinner inline locale={locale} />
        ) : requests.length === 0 ? (
          <p className="text-center text-sm text-white/50">{t('quickRequest.empty')}</p>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => {
              const customerName = [req.customer?.given_name, req.customer?.family_name].filter(Boolean).join(' ') || req.customer?.phone || '—';
              const employeeName = req.employee?.given_name ?? '—';
              return (
                <div key={req.id} className="metal-panel p-4 text-white">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_COLORS[req.status]}`}>
                          {t(`quickRequest.status_${req.status}`)}
                        </span>
                        <span className="text-xs text-white/50">{req.section_name}</span>
                        <span className="text-xs text-white/40">
                          {new Date(req.created_at).toLocaleString(locale === 'ar' ? 'ar-IQ' : 'ckb')}
                        </span>
                      </div>
                      <p className="font-semibold">{customerName}</p>
                      <p className="text-sm text-white/70">{req.content}</p>
                      {req.status === 'accepted' && (
                        <p className="text-xs text-white/50">
                          {t('quickRequest.assignedTo')} {employeeName}
                        </p>
                      )}
                    </div>
                    {req.status === 'accepted' && req.thread_id && (
                      <Link
                        href={`/chat/dm/${req.thread_id}`}
                        className="flex shrink-0 items-center gap-1.5 rounded-xl bg-amber-500/20 px-3 py-2 text-xs font-semibold text-amber-300 transition-colors hover:bg-amber-500/30"
                      >
                        <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                        {t('quickRequest.viewChatCta')}
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
