import { motion } from 'framer-motion';
import { MessageCirclePlus, ShieldCheck, ShieldOff } from 'lucide-react';
import Avatar from './Avatar';
import { translate } from '../../utils/i18n';

export default function MemberProfileCard({
  member,
  currentUserId,
  isPending,
  onInviteMember,
  onClose,
  locale,
  isFounder,
  moderatorId,
  onAssignModerator,
}) {
  const t = (path) => translate(locale, path);
  if (!member) return null;
  const isSelf = member.id === currentUserId;
  const isStaff = member.role === 'founder' || member.role === 'employee';
  const isModerator = member.id === moderatorId;
  const rank = member.rank;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden="true" />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="glass-panel-dark fixed start-1/2 top-1/2 z-50 w-68 -translate-x-1/2 -translate-y-1/2 rounded-2xl p-5 text-center text-white rtl:translate-x-1/2"
      >
        <Avatar avatarKey={member.avatarKey} name={member.name} seed={member.id} className="mx-auto h-16 w-16" />
        <p className="mt-3 truncate text-sm font-bold">{member.name}</p>

        <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
          {isStaff && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gold-400/15 px-2.5 py-1 text-[11px] font-semibold text-gold-300">
              <ShieldCheck className="h-3 w-3" aria-hidden="true" />
              {t('chat.staffBadge')}
            </span>
          )}
          {isModerator && (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/20 px-2.5 py-1 text-[11px] font-semibold text-blue-300">
              <ShieldCheck className="h-3 w-3" aria-hidden="true" />
              {t('chat.moderatorBadge')}
            </span>
          )}
          {rank && rank.id !== 'new' && (
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${rank.badgeClass}`}>
              {rank.emoji} {rank.label[locale] || rank.label.ar}
            </span>
          )}
        </div>

        {!isSelf && (
          <div className="mt-4 space-y-2">
            <button
              type="button"
              onClick={() => {
                if (!isPending) onInviteMember(member.id);
              }}
              disabled={isPending}
              className="btn-cinematic-gold flex w-full items-center justify-center gap-1.5 px-3 py-2 text-xs disabled:opacity-50"
            >
              <MessageCirclePlus className="h-3.5 w-3.5" aria-hidden="true" />
              {isPending ? t('chat.invitePending') : t('chat.inviteMemberCta')}
            </button>

            {isFounder && !isStaff && (
              <button
                type="button"
                onClick={() => {
                  onAssignModerator(member.id);
                  onClose();
                }}
                className={`flex w-full items-center justify-center gap-1.5 rounded-xl2 px-3 py-2 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                  isModerator
                    ? 'bg-red-500/15 text-red-400 hover:bg-red-500/25'
                    : 'bg-blue-500/15 text-blue-300 hover:bg-blue-500/25'
                }`}
              >
                {isModerator ? (
                  <>
                    <ShieldOff className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('chat.removeModerator')}
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('chat.assignModerator')}
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </motion.div>
    </>
  );
}
