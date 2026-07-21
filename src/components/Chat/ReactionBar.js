import { useState } from 'react';
import { SmilePlus } from 'lucide-react';
import { translate } from '../../utils/i18n';

const EMOJI_OPTIONS = ['👍', '❤️', '😂', '😮'];

function groupReactions(reactions) {
  const groups = new Map();
  (reactions ?? []).forEach((reaction) => {
    const entry = groups.get(reaction.emoji) ?? { emoji: reaction.emoji, count: 0, mine: false };
    entry.count += 1;
    if (reaction.user_id === reaction.currentUserId) entry.mine = true;
    groups.set(reaction.emoji, entry);
  });
  return Array.from(groups.values());
}

// dark=true when the bubble background is light-colored — the icon needs
// to use dark colors to stay visible. dark=false (default) = dark bubble.
export default function ReactionBar({ reactions, currentUserId, onToggle, locale, dark }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const t = (path) => translate(locale, path);
  const grouped = groupReactions((reactions ?? []).map((r) => ({ ...r, currentUserId })));

  const addBtnCls = dark
    ? 'text-gray-500 hover:bg-black/10 hover:text-gray-700 focus:ring-gray-400'
    : 'text-white/50 hover:bg-white/10 hover:text-white focus:ring-gold-300';

  return (
    <div className="relative mt-1 flex flex-wrap items-center gap-1">
      {grouped.map((group) => (
        <button
          key={group.emoji}
          type="button"
          onClick={() => onToggle(group.emoji)}
          className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors ${
            group.mine ? 'border-gold-400/60 bg-gold-400/15 text-gold-200' : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
          }`}
        >
          <span>{group.emoji}</span>
          <span>{group.count}</span>
        </button>
      ))}

      <div className="relative">
        <button
          type="button"
          onClick={() => setPickerOpen((open) => !open)}
          aria-label={t('chat.addReactionCta')}
          aria-expanded={pickerOpen}
          className={`flex h-6 w-6 items-center justify-center rounded-full transition-colors focus:outline-none focus:ring-2 ${addBtnCls}`}
        >
          <SmilePlus className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        {pickerOpen && (
          <div className="absolute bottom-full start-0 z-20 mb-1 flex gap-1 rounded-full border border-white/10 bg-surface-dark px-2 py-1.5 shadow-elevate">
            {EMOJI_OPTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  onToggle(emoji);
                  setPickerOpen(false);
                }}
                className="flex h-7 w-7 items-center justify-center rounded-full text-base transition-transform hover:scale-125"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
