import { useState } from 'react';
import { motion } from 'framer-motion';
import { bubbleCorners } from '../../utils/chatBundling';
import { useLongPress } from '../../utils/useLongPress';
import MessageUnsendMenu from './MessageUnsendMenu';

// Shared row + bubble wrapper for every chat surface: handles the
// Messenger-style compound corner radii, spring entry/exit animation
// (AnimatePresence lives at the call site around the .map), and the
// long-press/right-click unsend menu. `avatar`, when supplied, renders the
// per-message avatar beside the bubble (only the group chat room uses this);
// everything else stays a simple aligned row.
export default function MessageBubble({
  isMine,
  isFirst,
  isLast,
  bundled,
  isSticker,
  bubbleClassName,
  avatar,
  onDelete,
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
      <motion.div whileHover={{ scale: 1.01 }} className={`relative ${corners} ${bubbleClassName}`} {...longPress}>
        {children}
        {isMine && <MessageUnsendMenu open={menuOpen} onClose={() => setMenuOpen(false)} onDelete={onDelete} locale={locale} />}
      </motion.div>
    </motion.div>
  );
}
