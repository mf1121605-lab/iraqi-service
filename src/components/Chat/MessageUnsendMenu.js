import { Trash2 } from 'lucide-react';
import { translate } from '../../utils/i18n';

// Renders as an absolutely-positioned panel to the SIDE of the bubble (not below
// it) so it never overlaps the message below. A fixed backdrop covers the rest
// of the screen so a tap anywhere outside dismisses the menu on mobile.
// Note: onPin/canPin/isPinned props are intentionally removed — pin feature removed.
export default function MessageUnsendMenu({ open, onClose, onDelete, isMine, locale }) {
  const t = (path) => translate(locale, path);
  if (!open) return null;

  const deleteLabel = isMine ? t('chat.unsendCta') : t('chat.removeMessageCta');

  return (
    <>
      {/* Full-screen backdrop — tap outside to close (mobile + desktop) */}
      <button
        type="button"
        className="fixed inset-0 z-20 cursor-default"
        onClick={onClose}
        tabIndex={-1}
        aria-hidden="true"
      />
      {/* Side panel — appears to the left of mine / right of theirs, never below */}
      <div
        className={`glass-panel-dark absolute top-1/2 z-30 -translate-y-1/2 animate-scale-in rounded-xl p-1 shadow-lg ${
          isMine ? 'end-full me-1' : 'start-full ms-1'
        }`}
      >
        <button
          type="button"
          onClick={() => { onDelete(); onClose(); }}
          className="flex min-h-[44px] w-full items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/10 focus:outline-none focus:ring-2 focus:ring-red-400"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          {deleteLabel}
        </button>
      </div>
    </>
  );
}
