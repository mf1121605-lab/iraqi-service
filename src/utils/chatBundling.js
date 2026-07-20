const BUNDLE_WINDOW_MS = 2 * 60 * 1000;

// Consecutive messages from the same sender within 2 minutes collapse
// visually (no repeated avatar/name, tighter spacing) — shared by every
// chat surface (group rooms, private request chat) so the threshold and
// same-sender check only live in one place.
export function isBundled(message, previousMessage) {
  if (!previousMessage) return false;
  if (previousMessage.sender_id !== message.sender_id) return false;
  return new Date(message.created_at) - new Date(previousMessage.created_at) < BUNDLE_WINDOW_MS;
}
