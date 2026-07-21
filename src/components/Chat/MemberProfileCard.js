import { motion } from 'framer-motion';
import { Ban, MessageCirclePlus, ShieldCheck, ShieldOff, X } from 'lucide-react';
import Avatar from './Avatar';
import { translate } from '../../utils/i18n';

export default function MemberProfileCard({
  member,
  currentUserId,
  isPending,
  onInviteMember,
  onCancelInvite,
  onClose,
  locale,
  isFounder,
  isModerator: viewerIsModerator,
  moderatorId,
  onAssignModerator,
  onBanMember,
  isBanned,
}) {
  const t = (path) => translate(locale, path);
  if (!member) return null;
  const isSelf = member.id === currentUserId;
  const isStaff = member.role === 'founder' || member.role === 'employee';
  const memberIsModerator = member.id === moderatorId;
  const rank = member.rank;
  const canBan = (isFounder || viewerIsModerator) && !isSelf && !isStaff;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden="true" />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="glass-panel-dark fixed start-1/2 top-1/2 z-50 w-72 -translate-x-1/2 -translate-y-1/2 rounded-2xl p-5 text-center text-white rtl:translate-x-1/2"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t('common.close')}
          className="absolute end-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-white/50 hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="relative mx-auto h-16 w-16">
          <Avatar avatarKey={member.avatarKey} name={member.name} seed={member.id} className="h-16 w-16" />
          <span
            className={`absolute -end-0.5 -top-0.5 h-3 w-3 rounded-full ring-2 ring-surface-dark ${
              member.online ? 'bg-emerald-400' : 'bg-white/20'
            }`}
            aria-hidden="true"
          />
        </div>
        <p className="mt-3 truncate text-sm font-bold">{member.name}</p>
        <p className="text-xs text-white/50">{member.online ? t('chat.memberOnline') : t('chat.memberOffline')}</p>

        <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
          {isStaff && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gold-400/15 px-2.5 py-1 text-[11px] font-semibold text-gold-300">
              <ShieldCheck className="h-3 w-3" aria-hidden="true" />
              {t('chat.staffBadge')}
            </span>
          )}
          {memberIsModerator && (
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
                if (isPending) {
                  onCancelInvite(member.id);
                } else {
                  onInviteMember(member.id);
                }
              }}
              className={`flex w-full items-center justify-center gap-1.5 px-3 py-2 text-xs ${
                isPending
                  ? 'btn-cinematic-ghost border border-white/20 text-white/70'
                  : 'btn-cinematic-gold'
              }`}
            >
              <MessageCirclePlus className="h-3.5 w-3.5" aria-hidden="true" />
              {isPending ? t('chat.cancelInviteCta') : t('chat.inviteMemberCta')}
            </button>

            {isFounder && !isStaff && (
              <button
                type="button"
                onClick={() => {
                  onAssignModerator(member.id);
                  onClose();
                }}
                className={`flex w-full items-center justify-center gap-1.5 rounded-xl2 px-3 py-2 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                  memberIsModerator
                    ? 'bg-red-500/15 text-red-400 hover:bg-red-500/25'
                    : 'bg-blue-500/15 text-blue-300 hover:bg-blue-500/25'
                }`}
              >
                {memberIsModerator ? (
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

            {canBan && (
              <button
                type="button"
                onClick={() => {
                  onBanMember(member.id);
                  onClose();
                }}
                className={`flex w-full items-center justify-center gap-1.5 rounded-xl2 px-3 py-2 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-red-400 ${
                  isBanned
                    ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
                    : 'bg-red-500/15 text-red-400 hover:bg-red-500/25'
                }`}
              >
                <Ban className="h-3.5 w-3.5" aria-hidden="true" />
                {isBanned ? t('chat.unbanMemberCta') : t('chat.banMemberCta')}
              </button>
            )}
          </div>
        )}
      </motion.div>
    </>
  );
}
