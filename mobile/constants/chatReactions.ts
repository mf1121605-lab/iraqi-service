import type { ReactionOption } from '@/components/ui/ReactionPickerOverlay';

/**
 * Sentinel key for the reply slot in the chat reaction bar.
 *
 * Chat reactions are stored as the raw emoji string (unlike posts/comments,
 * which use a DB-constrained enum), so a key that is not an emoji can never
 * collide with a real reaction.
 */
export const REPLY_KEY = '__reply__';

/** Sentinel key for the destructive delete slot. */
export const DELETE_KEY = '__delete__';

/**
 * The chat bar carries the same six reactions the old tap-only popover had,
 * plus reply as a seventh slot — that popover had a trailing reply button, and
 * dropping it when switching to scrubbing would have silently removed
 * reply-on-long-press from every chat surface.
 */
export const CHAT_REACTIONS: ReactionOption[] = [
  { key: '👍', emoji: '👍', label: 'أعجبني' },
  { key: '❤️', emoji: '❤️', label: 'أحببته' },
  { key: '😂', emoji: '😂', label: 'ضحك' },
  { key: '😮', emoji: '😮', label: 'واو' },
  { key: '😢', emoji: '😢', label: 'حزين' },
  { key: '🙏', emoji: '🙏', label: 'شكراً' },
  { key: REPLY_KEY, emoji: '↩️', label: 'رد' },
];

/**
 * Builds the bar for one message. Delete is appended only when the viewer may
 * actually perform it — showing it otherwise would produce a button that
 * PostgREST answers with a successful zero-row delete, i.e. silent failure.
 */
export function buildChatReactions(canDelete: boolean): ReactionOption[] {
  return canDelete
    ? [...CHAT_REACTIONS, { key: DELETE_KEY, emoji: '🗑️', label: 'حذف', tone: 'danger' as const }]
    : CHAT_REACTIONS;
}
