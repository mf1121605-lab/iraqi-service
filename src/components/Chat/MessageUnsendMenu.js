import { Pin, PinOff, Trash2 } from 'lucide-react';
import { translate } from '../../utils/i18n';

// Real security boundary = RLS policy on the DB.
// This menu is purely a UX affordance — labels differ by actor/role.
export default function MessageUnsendMenu({ open, onClose, onDelete, onPin, isMine, canPin, isPinned, locale }) {
  const t = (path) => translate(locale, path);
  if (!open) return null;

  const deleteLabel = isMine ? t('chat.unsendCta') : t('chat.removeMessageCta');

  return (
    <div
      className={`glass-panel-dark absolute top-full z-30 mt-1 animate-scale-in rounded-xl p-1 shadow-lg ${
        isMine ? 'end-0' : 'start-0'
      }`}
      onMouseLeave={onClose}
    >
      {canPin && (
        <button
          type="button"
          onClick={() => {
            onPin();
            onClose();
          }}
          className="flex min-h-[44px] w-full items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm text-blue-300 transition-colors hover:bg-blue-500/10 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          {isPinned ? (
            <>
              <PinOff className="h-4 w-4" aria-hidden="true" />
              {t('chat.unpinMessageCta')}
            </>
          ) : (
            <>
              <Pin className="h-4 w-4" aria-hidden="true" />
              {t('chat.pinMessageCta')}
            </>
          )}
        </button>
      )}
      <button
        type="button"
        onClick={() => {
          onDelete();
          onClose();
        }}
        className="flex min-h-[44px] w-full items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/10 focus:outline-none focus:ring-2 focus:ring-red-400"
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        {deleteLabel}
      </button>
    </div>
  );
}
