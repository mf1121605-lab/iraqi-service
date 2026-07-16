import { useEffect, useState } from 'react';
import { Check, Palette } from 'lucide-react';
import { translate } from '../../utils/i18n';

const STORAGE_KEY = 'iraqi-services:chat-background';
const VARIANTS = ['default', 'waves', 'library'];

export function useChatBackgroundPreference() {
  const [variant, setVariant] = useState('default');

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && VARIANTS.includes(stored)) setVariant(stored);
  }, []);

  function select(next) {
    setVariant(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }

  return [variant, select];
}

// Pure CSS/SVG, no canvas: a handful of GPU-composited transform/opacity
// animations rather than a per-frame draw loop, so this stays cheap even
// on low-end phones.
function WavesBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-gradient-to-b from-sky-950 via-brand-950 to-slate-950">
      <svg className="absolute bottom-0 h-40 w-[200%] animate-wave-drift opacity-40" viewBox="0 0 2400 200" preserveAspectRatio="none">
        <path
          d="M0,100 C300,180 600,20 900,100 C1200,180 1500,20 1800,100 C2000,150 2200,60 2400,100 L2400,200 L0,200 Z"
          fill="#38bdf8"
        />
      </svg>
      <svg className="absolute bottom-0 h-52 w-[200%] animate-wave-drift-fast opacity-30" viewBox="0 0 2400 260" preserveAspectRatio="none">
        <path
          d="M0,140 C350,220 650,60 1000,140 C1300,210 1600,50 1950,140 C2150,180 2250,110 2400,140 L2400,260 L0,260 Z"
          fill="#0ea5e9"
        />
      </svg>
      <svg className="absolute bottom-0 h-24 w-[200%] animate-wave-drift opacity-60 [animation-duration:24s]" viewBox="0 0 2400 120" preserveAspectRatio="none">
        <path d="M0,60 C400,110 800,10 1200,60 C1600,110 2000,10 2400,60 L2400,120 L0,120 Z" fill="#075985" />
      </svg>
    </div>
  );
}

const LEAF_COUNT = 14;
const LEAVES = Array.from({ length: LEAF_COUNT }, (_, i) => ({
  left: (i * 137) % 100,
  delay: (i * 1.3) % 12,
  duration: 10 + (i % 5) * 2,
  size: 4 + (i % 3) * 2,
}));

function LibraryBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-gradient-to-b from-amber-950 via-brand-950 to-black">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(230,171,44,0.12),transparent)]" />
      {LEAVES.map((leaf, i) => (
        <span
          key={i}
          className="absolute top-0 animate-particle-fall rounded-full bg-gold-300/50"
          style={{
            left: `${leaf.left}%`,
            width: `${leaf.size}px`,
            height: `${leaf.size}px`,
            animationDelay: `${leaf.delay}s`,
            animationDuration: `${leaf.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

export function ChatBackgroundLayer({ variant }) {
  if (variant === 'waves') return <WavesBackground />;
  if (variant === 'library') return <LibraryBackground />;
  return null;
}

export function ChatBackgroundPicker({ variant, onSelect, locale }) {
  const [open, setOpen] = useState(false);
  const t = (path) => translate(locale, path);
  const options = [
    { key: 'default', label: t('chat.backgroundDefault') },
    { key: 'waves', label: t('chat.backgroundWaves') },
    { key: 'library', label: t('chat.backgroundLibrary') },
  ];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t('chat.backgroundPickerCta')}
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white/80 transition-colors hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-gold-300"
      >
        <Palette className="h-4 w-4" aria-hidden="true" />
      </button>
      {open && (
        <div className="absolute end-0 z-20 mt-2 w-48 rounded-xl2 border border-white/10 bg-surface-dark p-1.5 shadow-elevate">
          {options.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => {
                onSelect(option.key);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm text-white/80 transition-colors hover:bg-white/10"
            >
              {option.label}
              {variant === option.key && <Check className="h-3.5 w-3.5 text-gold-300" aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
