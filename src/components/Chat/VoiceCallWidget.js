import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Mic, MicOff, Phone, PhoneOff, Volume2, VolumeX } from 'lucide-react';
import Avatar from './Avatar';
import { translate } from '../../utils/i18n';

// Visual mockup only — no real WebRTC signaling/peer connection wired up
// yet (postponed per explicit request). Deliberately labeled "قريبًا" so
// it can't be mistaken for a working call by whoever sees it. Mute/speaker
// buttons toggle local UI state only.
export default function VoiceCallWidget({ locale, recipientName, recipientAvatarKey, recipientSeed }) {
  const t = (path) => translate(locale, path);
  const [open, setOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);

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

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 120, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
            className="mt-2 flex items-center justify-between gap-3 overflow-hidden rounded-2xl border border-gold-400/20 bg-gradient-to-b from-gold-400/10 to-transparent px-4"
          >
            <div className="relative flex shrink-0 items-center justify-center">
              <span className="absolute h-12 w-12 animate-ping rounded-full bg-gold-400/30" aria-hidden="true" />
              <span
                className="absolute h-12 w-12 animate-ping rounded-full bg-gold-400/20"
                style={{ animationDelay: '0.5s' }}
                aria-hidden="true"
              />
              <Avatar avatarKey={recipientAvatarKey} name={recipientName} seed={recipientSeed} className="h-10 w-10" />
            </div>

            <div className="flex flex-1 flex-col items-center gap-1">
              <span className="text-xs font-semibold text-white/70">{t('chat.voiceCallComingSoon')}</span>
              <div className="flex items-center gap-1" aria-hidden="true">
                {[6, 12, 18, 10, 16, 8, 14].map((height, index) => (
                  <span
                    key={index}
                    className="w-1 animate-pulse-soft rounded-full bg-gold-400/60"
                    style={{ height: `${height}px`, animationDelay: `${index * 120}ms` }}
                  />
                ))}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setIsMuted((current) => !current)}
                aria-label={isMuted ? t('chat.voiceCallUnmuteCta') : t('chat.voiceCallMuteCta')}
                aria-pressed={isMuted}
                className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                  isMuted ? 'bg-white/20 text-white' : 'bg-white/10 text-white/70 hover:bg-white/15'
                }`}
              >
                {isMuted ? <MicOff className="h-4 w-4" aria-hidden="true" /> : <Mic className="h-4 w-4" aria-hidden="true" />}
              </button>
              <button
                type="button"
                onClick={() => setIsSpeakerOn((current) => !current)}
                aria-label={isSpeakerOn ? t('chat.voiceCallSpeakerOffCta') : t('chat.voiceCallSpeakerOnCta')}
                aria-pressed={isSpeakerOn}
                className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                  isSpeakerOn ? 'bg-white/10 text-white/70 hover:bg-white/15' : 'bg-white/20 text-white'
                }`}
              >
                {isSpeakerOn ? <Volume2 className="h-4 w-4" aria-hidden="true" /> : <VolumeX className="h-4 w-4" aria-hidden="true" />}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t('chat.voiceCallEndCta')}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-red-400 transition-colors hover:bg-red-500/25"
              >
                <PhoneOff className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
