import type { ReactionOption } from '@/components/ui/ReactionPickerOverlay';

/**
 * Sentinel key for the reply slot in the chat reaction bar.
 *
 * Chat reactions are stored as the raw emoji string (unlike posts/comments,
 * which use a DB-constrained enum), so a key that is not an emoji can never
 * collide with a real reaction.
 */
export const REPLY_KEY = '__reply__';

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
