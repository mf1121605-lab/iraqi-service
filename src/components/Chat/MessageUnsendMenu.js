import { Trash2 } from 'lucide-react';
import { translate } from '../../utils/i18n';

// Real security boundary = sender-only DELETE RLS policy (or moderator hide).
// This menu is purely a UX affordance — label differs for sender vs moderator.
export default function MessageUnsendMenu({ open, onClose, onDelete, isMine, locale }) {
  const t = (path) => translate(locale, path);
  if (!open) return null;

  const label = isMine ? t('chat.unsendCta') : t('chat.removeMessageCta');

  return (
    <div
      className={`glass-panel-dark absolute top-full z-30 mt-1 animate-scale-in rounded-xl p-1 shadow-lg ${
        isMine ? 'end-0' : 'start-0'
      }`}
      onMouseLeave={onClose}
    >
      <button
        type="button"
        onClick={() => {
          onDelete();
          onClose();
        }}
        className="flex min-h-[44px] items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/10 focus:outline-none focus:ring-2 focus:ring-red-400"
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        {label}
      </button>
    </div>
  );
}
