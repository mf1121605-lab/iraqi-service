import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { CircleCheck as CheckCircle2, Radar, Users } from 'lucide-react';
import { useLocale } from '../../../../components/Layout/AppShell';
import LoadingSpinner from '../../../../components/LoadingSpinner';
import Avatar from '../../../../components/Chat/Avatar';
import { supabaseClient } from '../../../../lib/supabaseClient';
import { useRequireRole } from '../../../../utils/useSession';
import { translate } from '../../../../utils/i18n';

const CLAIM_WINDOW_SECONDS = 60;

function candidateName(candidate, locale, t) {
  return [candidate.given_name, candidate.family_name].filter(Boolean).join(' ') || t('requestMatching.anonymousEmployee');
}

export default function RequestMatching() {
  const { profile, loading, signOut } = useRequireRole(['customer']);
  const router = useRouter();
  const { id } = router.query;
  const locale = useLocale();
  const t = (path) => translate(locale, path);

  const [request, setRequest] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [phase, setPhase] = useState('loading'); // loading | searching | matched | timeout
  const [winner, setWinner] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(CLAIM_WINDOW_SECONDS);
  const redirectedRef = useRef(false);

  useEffect(() => {
    if (!profile || !id) return undefined;
    let active = true;

    async function init() {
      const { data: requestRow } = await supabaseClient
        .from('requests')
        .select('id, category, title, assigned_employee_id, created_at')
        .eq('id', id)
        .maybeSingle();
      if (!active) return;
      if (!requestRow) {
        router.replace('/customer/requests');
        return;
      }
      setRequest(requestRow);

      if (requestRow.assigned_employee_id) {
        router.replace(`/customer/requests/${id}`);
        return;
      }

      const { data: candidateRows } = await supabaseClient.rpc('get_active_employee_candidates', {
        p_category: requestRow.category,
      });
      if (!active) return;
      setCandidates(candidateRows ?? []);

      const elapsedSeconds = Math.floor((Date.now() - new Date(requestRow.created_at).getTime()) / 1000);
      setSecondsLeft(Math.max(CLAIM_WINDOW_SECONDS - elapsedSeconds, 0));
      setPhase(elapsedSeconds >= CLAIM_WINDOW_SECONDS ? 'timeout' : 'searching');
    }

    init();

    const channel = supabaseClient
      .channel(`request-matching-${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'requests', filter: `id=eq.${id}` },
        async () => {
          const { data: updatedRow } = await supabaseClient
            .from('requests')
            .select('id, category, title, assigned_employee_id, created_at')
            .eq('id', id)
            .maybeSingle();
          if (!active || !updatedRow?.assigned_employee_id) return;

          const { data: employeeRow } = await supabaseClient
            .from('profiles')
            .select('id, given_name, family_name, avatar_key, specialization')
            .eq('id', updatedRow.assigned_employee_id)
            .maybeSingle();
          if (!active) return;
          setWinner(employeeRow);
          setPhase('matched');
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabaseClient.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, id]);

  useEffect(() => {
    if (phase !== 'searching') return undefined;
    if (secondsLeft <= 0) {
      setPhase('timeout');
      return undefined;
    }
    const timer = setTimeout(() => setSecondsLeft((current) => current - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, secondsLeft]);

  useEffect(() => {
    if (phase !== 'matched' || redirectedRef.current) return undefined;
    redirectedRef.current = true;
    const timer = setTimeout(() => router.push(`/customer/requests/${id}`), 2200);
    return () => clearTimeout(timer);
  }, [phase, id, router]);

  if (loading || !profile || phase === 'loading') {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-gradient-hero text-white">
        <LoadingSpinner locale={locale} />
      </main>
    );
  }

  const marqueeCandidates = candidates.length > 0 ? [...candidates, ...candidates] : [];

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-gradient-hero px-4 py-10 text-center text-white">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[36rem] w-[36rem] -translate-x-1/2 animate-spotlight-sweep rounded-full bg-gold-400/10 blur-[110px]" />

      {phase === 'matched' && winner && (
        <div className="relative z-10 flex animate-scale-in flex-col items-center gap-4">
          <CheckCircle2 className="h-10 w-10 text-emerald-400" aria-hidden="true" />
          <p className="font-display text-lg font-bold">{t('requestMatching.matchedTitle')}</p>
          <Avatar avatarKey={winner.avatar_key} name={winner.given_name} seed={winner.id} className="h-24 w-24 ring-4 ring-gold-400/40" />
          <div>
            <p className="font-display text-xl font-bold">{[winner.given_name, winner.family_name].filter(Boolean).join(' ')}</p>
            {winner.specialization && <p className="mt-1 text-sm text-white/60">{winner.specialization}</p>}
          </div>
          <LoadingSpinner inline showLabel={false} size={20} />
        </div>
      )}

      {phase === 'searching' && (
        <div className="relative z-10 flex w-full max-w-lg flex-col items-center gap-6">
          <Radar className="h-10 w-10 animate-spin text-gold-300 [animation-duration:3s]" aria-hidden="true" />
          <div>
            <p className="font-display text-lg font-bold">{t('requestMatching.searchingTitle')}</p>
            <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-white/70">
              <Users className="h-4 w-4" aria-hidden="true" />
              {t('requestMatching.sentToCount').replace('{count}', candidates.length)}
            </p>
          </div>

          <div className="relative w-full overflow-hidden py-2" style={{ maskImage: 'linear-gradient(90deg, transparent, black 15%, black 85%, transparent)' }}>
            {marqueeCandidates.length > 0 ? (
              <motion.div
                className="flex items-center gap-4"
                animate={{ x: ['0%', '-50%'] }}
                transition={{ duration: Math.max(marqueeCandidates.length * 1.4, 6), repeat: Infinity, ease: 'linear' }}
              >
                {marqueeCandidates.map((candidate, index) => (
                  <div key={`${candidate.id}-${index}`} className="flex shrink-0 flex-col items-center gap-1.5">
                    <Avatar avatarKey={candidate.avatar_key} name={candidate.given_name} seed={candidate.id} className="h-14 w-14 ring-2 ring-white/10" />
                    <span className="max-w-[4.5rem] truncate text-[11px] text-white/50">{candidateName(candidate, locale, t)}</span>
                  </div>
                ))}
              </motion.div>
            ) : (
              <p className="text-sm text-white/50">{t('requestMatching.noCandidates')}</p>
            )}
          </div>

          <p className="text-xs text-white/40" dir="ltr">
            {secondsLeft}s
          </p>
        </div>
      )}

      {phase === 'timeout' && (
        <div className="relative z-10 flex animate-scale-in flex-col items-center gap-4">
          <p className="font-display text-lg font-bold">{t('requestMatching.timeoutTitle')}</p>
          <p className="max-w-sm text-sm text-white/70">{t('requestMatching.timeoutSubtitle')}</p>
          <button
            type="button"
            onClick={() => router.push('/customer/requests')}
            className="btn-cinematic-gold px-6 py-3 text-sm"
          >
            {t('requestMatching.timeoutCta')}
          </button>
        </div>
      )}
    </main>
  );
}
