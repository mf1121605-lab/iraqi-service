import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { BadgeCheck, CircleCheck as CheckCircle2, Radar, Users } from 'lucide-react';
import { useLocale } from '../../../../components/Layout/AppShell';
import LoadingSpinner from '../../../../components/LoadingSpinner';
import Avatar from '../../../../components/Chat/Avatar';
import { supabaseClient } from '../../../../lib/supabaseClient';
import { useRequireRole } from '../../../../utils/useSession';
import { translate } from '../../../../utils/i18n';

const CLAIM_WINDOW_SECONDS = 60;
const DECK_ROTATE_INTERVAL_MS = 900;
const DECK_EXIT_DURATION_MS = 400;
const DECK_VISIBLE_DEPTH = 3;

function candidateName(candidate, t) {
  return [candidate.given_name, candidate.family_name].filter(Boolean).join(' ') || t('requestMatching.anonymousEmployee');
}

function CandidateCard({ candidate, t }) {
  return (
    <div className="glass-panel-dark flex w-56 flex-col items-center gap-2 rounded-2xl p-5 text-center shadow-[0_20px_45px_-15px_rgba(0,0,0,0.6)]">
      <Avatar avatarKey={candidate.avatar_key} name={candidate.given_name} seed={candidate.id} className="h-16 w-16 ring-2 ring-gold-400/30" />
      <p className="flex items-center gap-1 truncate text-sm font-bold text-white">
        {candidateName(candidate, t)}
        {candidate.is_verified && (
          <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-blue-400" aria-label={t('requestMatching.verifiedBadgeLabel')} />
        )}
      </p>
      {candidate.specialization && <p className="truncate text-xs text-white/50">{candidate.specialization}</p>}
    </div>
  );
}

// The "3D Stacked Card Shuffle": every DECK_ROTATE_INTERVAL_MS, the front
// card is marked exiting (flies out + fades), then DECK_EXIT_DURATION_MS
// later it actually moves to the back of the deck array and the next card
// is promoted. Re-scheduled via a plain effect keyed on `deck` (not a
// setInterval) so each cycle's timers are always cleaned up on unmount —
// no leaked timers, no stale-closure risk on which card is "front."
function ShuffleDeck({ candidates, t }) {
  const [deck, setDeck] = useState(candidates);
  const [exitingId, setExitingId] = useState(null);

  useEffect(() => {
    setDeck(candidates);
    setExitingId(null);
  }, [candidates]);

  useEffect(() => {
    if (deck.length < 2) return undefined;
    let exitTimer;
    const startTimer = setTimeout(() => {
      setExitingId(deck[0].id);
      exitTimer = setTimeout(() => {
        setDeck((current) => {
          if (current.length < 2) return current;
          const [first, ...rest] = current;
          return [...rest, first];
        });
        setExitingId(null);
      }, DECK_EXIT_DURATION_MS);
    }, DECK_ROTATE_INTERVAL_MS);
    return () => {
      clearTimeout(startTimer);
      clearTimeout(exitTimer);
    };
  }, [deck]);

  if (deck.length === 0) return null;

  return (
    <div className="relative h-48 w-56">
      {deck.slice(0, DECK_VISIBLE_DEPTH).map((candidate, position) => {
        const isExiting = position === 0 && candidate.id === exitingId;
        const target = isExiting
          ? { x: -150, y: 0, opacity: 0, rotate: -10, scale: 1 }
          : position === 0
          ? { x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }
          : position === 1
          ? { x: 0, y: -12, opacity: 0.6, rotate: 0, scale: 0.95 }
          : { x: 0, y: -24, opacity: 0.3, rotate: 0, scale: 0.9 };
        return (
          <motion.div
            key={candidate.id}
            className="absolute inset-x-0 top-0"
            style={{ zIndex: 30 - position * 10 }}
            initial={{ x: 0, y: 24, opacity: 0, scale: 0.85 }}
            animate={target}
            transition={{ duration: isExiting ? 0.4 : 0.5, ease: 'easeInOut' }}
          >
            <CandidateCard candidate={candidate} t={t} />
          </motion.div>
        );
      })}
    </div>
  );
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
            .select('id, given_name, family_name, avatar_key, specialization, is_verified')
            .eq('id', updatedRow.assigned_employee_id)
            .maybeSingle();
          if (!active) return;
          // Kill the shuffle instantly — driven by `phase` below, since
          // ShuffleDeck's own timers get torn down the moment it unmounts.
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

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-gradient-hero px-4 py-10 text-center text-white">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[36rem] w-[36rem] -translate-x-1/2 animate-spotlight-sweep rounded-full bg-gold-400/10 blur-[110px]" />

      {phase === 'matched' && winner && (
        <motion.div
          className="relative z-10 flex flex-col items-center gap-4"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: [0.9, 1.05, 1], opacity: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <CheckCircle2 className="h-10 w-10 text-emerald-400" aria-hidden="true" />
          <p className="font-display text-lg font-bold">{t('requestMatching.matchedTitle')}</p>
          <Avatar avatarKey={winner.avatar_key} name={winner.given_name} seed={winner.id} className="h-24 w-24 ring-4 ring-gold-400/40" />
          <div>
            <p className="flex items-center justify-center gap-1 font-display text-xl font-bold">
              {[winner.given_name, winner.family_name].filter(Boolean).join(' ')}
              {winner.is_verified && (
                <BadgeCheck className="h-4 w-4 shrink-0 text-blue-400" aria-label={t('requestMatching.verifiedBadgeLabel')} />
              )}
            </p>
            {winner.specialization && <p className="mt-1 text-sm text-white/60">{winner.specialization}</p>}
          </div>
          <LoadingSpinner inline showLabel={false} size={20} />
        </motion.div>
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

          {candidates.length > 0 ? (
            <ShuffleDeck candidates={candidates} t={t} />
          ) : (
            <p className="text-sm text-white/50">{t('requestMatching.noCandidates')}</p>
          )}

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
