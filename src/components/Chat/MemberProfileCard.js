import { motion } from 'framer-motion';
import { MessageCirclePlus, ShieldCheck } from 'lucide-react';
import Avatar from './Avatar';
import { translate } from '../../utils/i18n';

// Small floating card spawned by clicking a message avatar in a group
// room — reuses the same invite/DM-request mechanism already wired up in
// ChatSettingsSidebar's member list, just triggered from a different spot.
export default function MemberProfileCard({ member, currentUserId, isPending, onInviteMember, onClose, locale }) {
  const t = (path) => translate(locale, path);
  if (!member) return null;
  const isSelf = member.id === currentUserId;
  const isStaff = member.role === 'founder' || member.role === 'employee';

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden="true" />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="glass-panel-dark fixed start-1/2 top-1/2 z-50 w-64 -translate-x-1/2 -translate-y-1/2 rounded-2xl p-5 text-center text-white rtl:translate-x-1/2"
      >
        <Avatar avatarKey={member.avatarKey} name={member.name} seed={member.id} className="mx-auto h-16 w-16" />
        <p className="mt-3 truncate text-sm font-bold">{member.name}</p>
        {isStaff && (
          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-gold-400/15 px-2.5 py-1 text-[11px] font-semibold text-gold-300">
            <ShieldCheck className="h-3 w-3" aria-hidden="true" />
            {t('chat.staffBadge')}
          </span>
        )}
        {!isSelf && (
          <button
            type="button"
            onClick={() => {
              if (!isPending) onInviteMember(member.id);
            }}
            disabled={isPending}
            className="btn-cinematic-gold mt-4 flex w-full items-center justify-center gap-1.5 px-3 py-2 text-xs disabled:opacity-50"
          >
            <MessageCirclePlus className="h-3.5 w-3.5" aria-hidden="true" />
            {isPending ? t('chat.invitePending') : t('chat.inviteMemberCta')}
          </button>
        )}
      </motion.div>
    </>
  );
}
