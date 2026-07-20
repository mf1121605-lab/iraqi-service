import { useState } from 'react';
import { Sticker as StickerIcon } from 'lucide-react';
import { translate } from '../../utils/i18n';

// Emoji-based stickers rather than hosted image assets — no image CDN/
// storage dependency to break, and they render crisply at any size.
// Curated to match the platform's service categories.
export const STICKERS = ['🎓', '🎖️', '⚖️', '🏛️', '📋', '✅', '📚', '🤝', '👍', '❤️', '🎉', '🙏'];

export default function StickerPicker({ onPick, locale }) {
  const t = (path) => translate(locale, path);
  const [open, setOpen] = useState(false);

  return (
    <span className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label={t('chat.stickerCta')}
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-xl text-brand-700 transition-colors hover:bg-brand-500/10 dark:text-brand-300"
      >
        <StickerIcon className="h-4 w-4" aria-hidden="true" />
      </button>
      {open && (
        <div className="glass-panel-dark absolute bottom-full end-0 z-20 mb-2 grid w-56 animate-scale-in grid-cols-4 gap-1 rounded-2xl p-3 [transform-origin:bottom_right] rtl:[transform-origin:bottom_left]">
          {STICKERS.map((sticker) => (
            <button
              key={sticker}
              type="button"
              onClick={() => {
                onPick(sticker);
                setOpen(false);
              }}
              className="flex h-11 w-11 items-center justify-center rounded-xl text-2xl transition-colors hover:bg-white/10"
            >
              {sticker}
            </button>
          ))}
        </div>
      )}
    </span>
  );
}
