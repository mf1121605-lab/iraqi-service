import { useState } from 'react';
import { Sticker as StickerIcon } from 'lucide-react';
import { translate } from '../../utils/i18n';

// Emoji-based sticker packs — no CDN/asset dependency, render crisply at any
// size, and work offline. Expanded to 8 thematic packs to match the variety
// of a world-class messenger.
export const STICKER_PACKS = [
  {
    id: 'happy',
    icon: '😊',
    labelKey: 'chat.stickerPackHappy',
    stickers: ['😊', '😄', '😁', '🤩', '😍', '🥰', '😘', '🤗', '😎', '🥳', '😜', '🤑'],
  },
  {
    id: 'expressions',
    icon: '😢',
    labelKey: 'chat.stickerPackExpressions',
    stickers: ['😢', '😭', '😱', '😤', '🤯', '😴', '🙄', '🤔', '😶', '😬', '🤭', '🥺'],
  },
  {
    id: 'hearts',
    icon: '❤️',
    labelKey: 'chat.stickerPackHearts',
    stickers: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💖', '💝', '💕', '💞'],
  },
  {
    id: 'gestures',
    icon: '👍',
    labelKey: 'chat.stickerPackGestures',
    stickers: ['👍', '👏', '🙌', '🤝', '💪', '✌️', '🤞', '🤙', '☝️', '👌', '🤌', '🫶'],
  },
  {
    id: 'celebrations',
    icon: '🎉',
    labelKey: 'chat.stickerPackCelebrations',
    stickers: ['🎉', '🎊', '🎁', '🎈', '🏆', '🥇', '🎖️', '✨', '💫', '⭐', '🌟', '🔥'],
  },
  {
    id: 'animals',
    icon: '🐶',
    labelKey: 'chat.stickerPackAnimals',
    stickers: ['🐶', '🐱', '🐼', '🦊', '🦁', '🐯', '🐨', '🦄', '🐝', '🦋', '🦅', '🐙'],
  },
  {
    id: 'food',
    icon: '🍕',
    labelKey: 'chat.stickerPackFood',
    stickers: ['🍕', '🍔', '🌮', '🎂', '🍦', '🍩', '☕', '🍵', '🥤', '🍾', '🥂', '🍻'],
  },
  {
    id: 'cultural',
    icon: '🕌',
    labelKey: 'chat.stickerPackCultural',
    stickers: ['🕌', '🌙', '⭐', '🌴', '🌿', '🇮🇶', '🏺', '🌾', '🌻', '🌺', '🌊', '🏔️'],
  },
];

export default function StickerPicker({ onPick, locale }) {
  const t = (path) => translate(locale, path);
  const [open, setOpen] = useState(false);
  const [activePackId, setActivePackId] = useState(STICKER_PACKS[0].id);
  const activePack = STICKER_PACKS.find((pack) => pack.id === activePackId) ?? STICKER_PACKS[0];

  return (
    <span className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label={t('chat.stickerCta')}
        aria-expanded={open}
        className="flex h-11 w-11 items-center justify-center rounded-xl text-brand-700 transition-colors hover:bg-brand-500/10 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:text-brand-300"
      >
        <StickerIcon className="h-4 w-4" aria-hidden="true" />
      </button>
      {open && (
        <div className="glass-panel-dark absolute bottom-full end-0 z-20 mb-2 w-64 animate-scale-in rounded-2xl p-3 [transform-origin:bottom_right] rtl:[transform-origin:bottom_left]">
          {/* Pack tab row — icon-only so 8 tabs fit comfortably */}
          <div className="mb-2 flex items-center gap-0.5 overflow-x-auto border-b border-white/[0.08] pb-2 scrollbar-none">
            {STICKER_PACKS.map((pack) => (
              <button
                key={pack.id}
                type="button"
                onClick={() => setActivePackId(pack.id)}
                aria-pressed={pack.id === activePackId}
                aria-label={t(pack.labelKey)}
                title={t(pack.labelKey)}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xl transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400 ${
                  pack.id === activePackId ? 'bg-brand-500/25 ring-1 ring-brand-400/40' : 'hover:bg-white/10'
                }`}
              >
                {pack.icon}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-1">
            {activePack.stickers.map((sticker) => (
              <button
                key={sticker}
                type="button"
                onClick={() => {
                  onPick(sticker);
                  setOpen(false);
                }}
                className="flex h-14 w-14 items-center justify-center rounded-xl text-3xl transition-all duration-150 hover:scale-125 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                {sticker}
              </button>
            ))}
          </div>
        </div>
      )}
    </span>
  );
}
