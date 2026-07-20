import { useState } from 'react';
import { motion } from 'framer-motion';
import { bubbleCorners } from '../../utils/chatBundling';
import { useLongPress } from '../../utils/useLongPress';
import MessageUnsendMenu from './MessageUnsendMenu';

function formatMsgTime(isoString) {
  if (!isoString) return '';
  return new Date(isoString).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit', hour12: true });
}

// Shared row + bubble wrapper for every chat surface: handles the
// Messenger-style compound corner radii, spring entry/exit animation
// (AnimatePresence lives at the call site around the .map), the
// long-press/right-click unsend menu, and the WhatsApp-style timestamp shown
// on hover (desktop) / always (mobile touch).
export default function MessageBubble({
  isMine,
  isFirst,
  isLast,
  bundled,
  isSticker,
  bubbleClassName,
  avatar,
  onDelete,
  timestamp,
  locale,
  children,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const longPress = useLongPress(() => {
    if (isMine) setMenuOpen(true);
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
        whileHover={{ scale: 1.01 }}
        className={`group relative ${corners} ${bubbleClassName}`}
        {...longPress}
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
        {isMine && <MessageUnsendMenu open={menuOpen} onClose={() => setMenuOpen(false)} onDelete={onDelete} locale={locale} />}
      </motion.div>
    </motion.div>
  );
}
