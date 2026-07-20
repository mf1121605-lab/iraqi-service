const BUNDLE_WINDOW_MS = 2 * 60 * 1000;

// Consecutive messages from the same sender within 2 minutes collapse
// visually (no repeated avatar/name, tighter spacing) — shared by every
// chat surface (group rooms, private request chat) so the threshold and
// same-sender check only live in one place.
export function isBundled(message, previousMessage) {
  if (!message || !previousMessage) return false;
  if (previousMessage.sender_id !== message.sender_id) return false;
  return new Date(message.created_at) - new Date(previousMessage.created_at) < BUNDLE_WINDOW_MS;
}

// Messenger-style compound corners for a bubble stack: the corner facing
// away from the tail always stays fully rounded; the corner(s) facing the
// tail flatten while a stack continues, and only the true first/last
// message of a run gets the full/point radius there. Written as fully
// literal class strings (not interpolated) so Tailwind's static content
// scanner can find them.
const CORNER_CLASSES = {
  mine: {
    firstLast: 'rounded-2xl rounded-se-2xl rounded-ee-none',
    firstOnly: 'rounded-2xl rounded-se-2xl rounded-ee-md',
    middle: 'rounded-2xl rounded-se-md rounded-ee-md',
    lastOnly: 'rounded-2xl rounded-se-md rounded-ee-none',
  },
  theirs: {
    firstLast: 'rounded-2xl rounded-ss-2xl rounded-es-none',
    firstOnly: 'rounded-2xl rounded-ss-2xl rounded-es-md',
    middle: 'rounded-2xl rounded-ss-md rounded-es-md',
    lastOnly: 'rounded-2xl rounded-ss-md rounded-es-none',
  },
};

export function bubbleCorners(isMine, isFirst, isLast) {
  const variant = isMine ? CORNER_CLASSES.mine : CORNER_CLASSES.theirs;
  if (isFirst && isLast) return variant.firstLast;
  if (isFirst) return variant.firstOnly;
  if (isLast) return variant.lastOnly;
  return variant.middle;
}
