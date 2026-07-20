import { Trash2 } from 'lucide-react';
import { translate } from '../../utils/i18n';

// Purely a UX affordance — the real security boundary is the sender-only
// DELETE RLS policy in Postgres, not this menu's visibility.
export default function MessageUnsendMenu({ open, onClose, onDelete, locale, isMine: alignEnd = true }) {
  const t = (path) => translate(locale, path);
  if (!open) return null;

  return (
    <div
      className={`glass-panel-dark absolute top-full z-30 mt-1 animate-scale-in rounded-xl p-1 shadow-lg ${
        alignEnd ? 'end-0' : 'start-0'
      }`}
      onMouseLeave={onClose}
    >
      <button
        type="button"
        onClick={() => {
          onDelete();
          onClose();
        }}
        className="flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/10"
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        {t('chat.unsendCta')}
      </button>
    </div>
  );
}
