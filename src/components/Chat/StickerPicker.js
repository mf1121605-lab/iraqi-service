import { useState } from 'react';
import { Sticker as StickerIcon } from 'lucide-react';
import { translate } from '../../utils/i18n';

// Emoji-based stickers rather than hosted image assets — no image CDN/
// storage dependency to break, and they render crisply at any size.
// Grouped into packs the user can switch between via the tab row below.
export const STICKER_PACKS = [
  { id: 'academic', labelKey: 'chat.stickerPackAcademic', stickers: ['🎓', '📚', '📋', '✏️', '🧮', '🔬'] },
  { id: 'seals', labelKey: 'chat.stickerPackSeals', stickers: ['🏛️', '⚖️', '📜', '🖋️', '🔖', '🗂️'] },
  { id: 'expressive', labelKey: 'chat.stickerPackExpressive', stickers: ['👍', '❤️', '🎉', '🤝', '🙏', '✅'] },
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
        <div className="glass-panel-dark absolute bottom-full end-0 z-20 mb-2 w-56 animate-scale-in rounded-2xl p-3 [transform-origin:bottom_right] rtl:[transform-origin:bottom_left]">
          <div className="mb-2 flex items-center gap-1 border-b border-white/[0.08] pb-2">
            {STICKER_PACKS.map((pack) => (
              <button
                key={pack.id}
                type="button"
                onClick={() => setActivePackId(pack.id)}
                aria-pressed={pack.id === activePackId}
                className={`flex-1 truncate rounded-lg px-1.5 py-2 text-[11px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400 ${
                  pack.id === activePackId ? 'bg-brand-500/20 text-brand-200' : 'text-white/50 hover:bg-white/5'
                }`}
              >
                {t(pack.labelKey)}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-1">
            {activePack.stickers.map((sticker) => (
              <button
                key={sticker}
                type="button"
                onClick={() => {
                  onPick(sticker);
                  setOpen(false);
                }}
                className="flex h-14 w-14 items-center justify-center rounded-xl text-3xl transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-amber-400"
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
