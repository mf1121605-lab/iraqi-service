import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { Bell, X } from 'lucide-react';
import { supabaseClient } from '../../lib/supabaseClient';
import { translate } from '../../utils/i18n';
import { playNewTicketPing } from '../../utils/notificationSound';
import { categoryLabel, useCategories } from '../../utils/useCategories';

// The "Big Bell" — mounted for founder/employee in AppShell's header.
// Every active employee sees every new unclaimed request now (per
// requests_update_staff RLS, category no longer restricts who can claim
// what), so this fires for founder and employee alike with no filtering.
export default function RequestAlertBell({ profile, locale }) {
  const router = useRouter();
  const t = (path) => translate(locale, path);
  const categories = useCategories({ activeOnly: false });
  const [queue, setQueue] = useState([]);
  const [open, setOpen] = useState(false);
  const [pulsing, setPulsing] = useState(false);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    if (!profile || (profile.role !== 'founder' && profile.role !== 'employee')) return undefined;

    function matches(row) {
      // Every active employee sees every new request now — the founder
      // wants each employee to decide themselves whether to take it,
      // rather than pre-filtering by their self-selected active_services.
      return !row.assigned_employee_id;
    }

    const channel = supabaseClient
      .channel('request-alert-bell')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'requests' }, ({ new: row }) => {
        if (!matches(row)) return;
        setQueue((current) => [...current, row]);
        playNewTicketPing();
        setPulsing(true);
        setTimeout(() => setPulsing(false), 4000);
      })
      .subscribe();

    return () => supabaseClient.removeChannel(channel);
  }, [profile]);

  if (!profile || (profile.role !== 'founder' && profile.role !== 'employee')) return null;

  const current = queue[0];

  function dismiss() {
    setQueue((rest) => rest.slice(1));
  }

  async function handleApprove() {
    if (!current) return;
    setClaiming(true);
    await supabaseClient.from('requests').update({ assigned_employee_id: profile.id }).eq('id', current.id);
    setClaiming(false);
    dismiss();
    setOpen(false);
    router.push(`/employee/dashboard?request=${current.id}`);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('requestAlertBell.title')}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300 hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-brand-400 dark:hover:bg-white/10"
      >
        <motion.span
          animate={pulsing ? { rotate: [0, -15, 15, -10, 10, 0] } : {}}
          transition={{ duration: 0.6, repeat: pulsing ? Infinity : 0, repeatDelay: 0.4 }}
        >
          <Bell className={`h-4 w-4 ${pulsing ? 'text-red-500' : ''}`} strokeWidth={2} aria-hidden="true" />
        </motion.span>
        {queue.length > 0 && (
          <span className="absolute -end-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {queue.length}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="relative z-10 w-full max-w-sm rounded-[1.5rem] border border-gold-400/20 bg-surface-dark p-6 text-white shadow-[0_0_60px_-15px_rgba(230,171,44,0.4)]">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t('common.close')}
              className="absolute end-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-white/60 hover:bg-white/10"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>

            {current ? (
              <>
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gold-400/15 text-gold-300">
                  <Bell className="h-6 w-6" aria-hidden="true" />
                </span>
                <h3 className="mt-3 text-center font-display text-lg font-bold">{t('requestAlertBell.newRequestTitle')}</h3>
                <p className="mt-1 text-center text-sm text-white/70">{current.title}</p>
                <p className="mt-1 text-center text-xs text-white/50">
                  {categories?.find((c) => c.key === current.category) ? categoryLabel(categories.find((c) => c.key === current.category), locale) : current.category}
                </p>
                <div className="mt-5 flex gap-2">
                  <button
                    type="button"
                    onClick={dismiss}
                    className="flex-1 rounded-xl2 border border-white/15 px-4 py-2.5 text-sm font-semibold text-white/80 transition-colors hover:bg-white/5"
                  >
                    {t('requestAlertBell.dismissCta')}
                  </button>
                  <button
                    type="button"
                    onClick={handleApprove}
                    disabled={claiming}
                    className="btn-cinematic-gold flex-1 px-4 py-2.5 text-sm disabled:opacity-50"
                  >
                    {t('requestAlertBell.approveCta')}
                  </button>
                </div>
                {queue.length > 1 && (
                  <p className="mt-3 text-center text-xs text-white/40">
                    {t('requestAlertBell.moreWaiting').replace('{count}', queue.length - 1)}
                  </p>
                )}
              </>
            ) : (
              <p className="py-6 text-center text-sm text-white/60">{t('requestAlertBell.empty')}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
