import { useState } from 'react';
import { motion } from 'framer-motion';
import { bubbleCorners } from '../../utils/chatBundling';
import { useLongPress } from '../../utils/useLongPress';
import MessageUnsendMenu from './MessageUnsendMenu';

function formatMsgTime(isoString) {
  if (!isoString) return '';
  return new Date(isoString).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit', hour12: true });
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
  timestamp,
  locale,
  children,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { onTouchStart, onTouchEnd, onTouchMove, onContextMenu, isPressing } = useLongPress(() => {
    if (canDelete ?? isMine) setMenuOpen(true);
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
        // Long-press feedback: bubble shrinks + gold ring glows while held.
        // When the 500ms fires, isPressing resets and the menu opens.
        animate={{
          scale: isPressing ? 0.93 : 1,
          boxShadow: isPressing
            ? '0 0 0 3px rgba(230,171,44,0.65), 0 6px 24px rgba(230,171,44,0.25)'
            : '0 0 0 0px rgba(230,171,44,0)',
        }}
        transition={{ type: 'spring', stiffness: 380, damping: 22 }}
        whileHover={!isPressing ? { scale: 1.01 } : undefined}
        className={`group relative ${corners} ${bubbleClassName}`}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onTouchMove={onTouchMove}
        onContextMenu={onContextMenu}
      >
        {children}
        {timestamp && !isSticker && (
          <time
            className="mt-0.5 block text-end text-[10px] leading-none opacity-40 transition-opacity group-hover:opacity-80"
            dateTime={timestamp}
          >
            {formatMsgTime(timestamp)}
          </time>
        )}
        {(canDelete ?? isMine) && (
          <MessageUnsendMenu
            open={menuOpen}
            onClose={() => setMenuOpen(false)}
            onDelete={onDelete}
            isMine={isMine}
            locale={locale}
          />
        )}
      </motion.div>
    </motion.div>
  );
}
