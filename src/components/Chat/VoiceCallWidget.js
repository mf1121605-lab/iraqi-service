import { useState } from 'react';
import { Phone, PhoneOff } from 'lucide-react';
import { translate } from '../../utils/i18n';

// Visual mockup only — no real WebRTC signaling/peer connection wired up
// yet (postponed per explicit request). Deliberately labeled "قريبًا" so
// it can't be mistaken for a working call by whoever sees it.
export default function VoiceCallWidget({ locale }) {
  const t = (path) => translate(locale, path);
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-3">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex items-center gap-1.5 rounded-xl2 border border-gold-400/20 px-3 py-1.5 text-xs font-semibold text-gold-300 transition-colors hover:bg-gold-400/10"
      >
        <Phone className="h-3.5 w-3.5" aria-hidden="true" />
        {t('chat.voiceCallCta')}
      </button>

      {open && (
        <div
          style={{ height: '120px' }}
          className="mt-2 flex items-center justify-between gap-3 rounded-2xl border border-gold-400/20 bg-gradient-to-b from-gold-400/10 to-transparent px-4"
        >
          <div className="flex items-center gap-1" aria-hidden="true">
            {[6, 12, 18, 10, 16, 8, 14].map((height, index) => (
              <span
                key={index}
                className="w-1 animate-pulse-soft rounded-full bg-gold-400/60"
                style={{ height: `${height}px`, animationDelay: `${index * 120}ms` }}
              />
            ))}
          </div>
          <span className="text-xs font-semibold text-white/50">{t('chat.voiceCallComingSoon')}</span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={t('chat.voiceCallEndCta')}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-red-400 transition-colors hover:bg-red-500/25"
          >
            <PhoneOff className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
