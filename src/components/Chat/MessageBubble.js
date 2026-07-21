import { useState } from 'react';
import { CheckCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { bubbleCorners } from '../../utils/chatBundling';
import { useLongPress } from '../../utils/useLongPress';
import MessageUnsendMenu from './MessageUnsendMenu';

function formatMsgTime(isoString, locale) {
  if (!isoString) return '';
  return new Date(isoString).toLocaleTimeString(locale ?? 'ar', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Baghdad',
  });
}

// canDelete: true for the message sender AND for moderators (passed from call
// site). The real security boundary is the Postgres RLS policy — this prop
// only controls whether the long-press menu renders.
export default function MessageBubble({
  isMine,
  isFirst,
  isLast,
  bundled,
  isSticker,
  bubbleClassName,
  avatar,
  onDelete,
  canDelete,
  onPin,
  canPin,
  isPinned,
  timestamp,
  locale,
  children,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const showMenu = canDelete ?? isMine;
  const { onTouchStart, onTouchEnd, onTouchMove, onContextMenu, isPressing } = useLongPress(() => {
    if (showMenu) setMenuOpen(true);
  });

  const corners = isSticker ? '' : bubbleCorners(isMine, isFirst, isLast);
  const rowAlignment = avatar ? (isMine ? 'flex-row-reverse' : '') : isMine ? 'justify-end' : 'justify-start';

  return (
    <motion.div
      layout
      initial={{ scale: 0.85, opacity: 0, y: 25 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      className={`flex ${avatar ? 'items-end gap-2' : ''} ${rowAlignment} ${bundled ? 'mt-0.5' : 'mt-3'}`}
    >
      {avatar}
      <motion.div
        animate={{
          scale: isPressing ? 0.93 : 1,
          boxShadow: isPressing
            ? '0 0 0 3px rgba(230,171,44,0.65), 0 6px 24px rgba(230,171,44,0.25)'
            : '0 0 0 0px rgba(230,171,44,0)',
        }}
        transition={{ type: 'spring', stiffness: 380, damping: 22 }}
        whileHover={!isPressing ? { scale: 1.01 } : undefined}
        className={`group relative ${corners} ${bubbleClassName}${!isSticker ? ' bubble-sparkle' : ''}`}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onTouchMove={onTouchMove}
        onContextMenu={onContextMenu}
      >
        {children}
        {timestamp && !isSticker && (
          <div className="mt-1 flex items-center justify-end gap-1 text-[10px] leading-none opacity-55 transition-opacity group-hover:opacity-90">
            <time dateTime={timestamp}>{formatMsgTime(timestamp, locale)}</time>
            {isMine && <CheckCheck className="h-3.5 w-3.5 text-sky-200" aria-label="تم الإرسال" />}
          </div>
        )}
        {showMenu && (
          <MessageUnsendMenu
            open={menuOpen}
            onClose={() => setMenuOpen(false)}
            onDelete={onDelete}
            onPin={onPin}
            isMine={isMine}
            canPin={canPin}
            isPinned={isPinned}
            locale={locale}
          />
        )}
      </motion.div>
    </motion.div>
  );
}
