import { useEffect, useState } from 'react';
import AppShell, { useLocale } from '../../components/Layout/AppShell';
import { supabaseClient } from '../../lib/supabaseClient';
import { useRequireRole } from '../../utils/useSession';
import { useFounderNav } from '../../utils/founderNav';
import { translate } from '../../utils/i18n';

export default function FounderAuditLog() {
  const { profile, loading, signOut } = useRequireRole(['founder']);
  const locale = useLocale();
  const t = (path) => translate(locale, path);
  const navItems = useFounderNav(locale, 'audit-log');
  const [entries, setEntries] = useState(null);

  useEffect(() => {
    if (!profile) return;
    supabaseClient
      .from('audit_log')
      .select('id, actor_id, action, table_name, record_id, created_at')
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data }) => setEntries(data ?? []));
  }, [profile]);

  if (loading || !profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-hero text-white">
        {t('common.loading')}
      </main>
    );
  }

  return (
    <AppShell navItems={navItems} onSignOut={signOut}>
      <h2 className="font-display text-lg font-bold">{t('founderAuditLog.title')}</h2>

      {entries === null ? (
        <p className="mt-4 text-sm">{t('common.loading')}</p>
      ) : entries.length === 0 ? (
        <p className="mt-4 text-sm text-ink-muted dark:text-ink-dark-muted">{t('founderAuditLog.empty')}</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-black/5 dark:border-white/10">
          <table className="w-full text-start text-sm">
            <thead className="bg-black/5 dark:bg-white/5">
              <tr>
                <th className="p-3 text-start">{t('founderAuditLog.whenLabel')}</th>
                <th className="p-3 text-start">{t('founderAuditLog.actorLabel')}</th>
                <th className="p-3 text-start">{t('founderAuditLog.actionLabel')}</th>
                <th className="p-3 text-start">{t('founderAuditLog.tableLabel')}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-t border-black/5 dark:border-white/10">
                  <td className="p-3 text-xs text-ink-muted dark:text-ink-dark-muted">
                    {new Date(entry.created_at).toLocaleString(locale === 'ar' ? 'ar-IQ' : 'ckb')}
                  </td>
                  <td className="p-3 text-xs">{entry.actor_id ?? '—'}</td>
                  <td className="p-3 text-xs">{entry.action}</td>
                  <td className="p-3 text-xs">{entry.table_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
