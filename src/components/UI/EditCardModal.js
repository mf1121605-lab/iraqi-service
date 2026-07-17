import { useState } from 'react';
import { motion } from 'framer-motion';
import { Film, ImageIcon, X } from 'lucide-react';
import MediaStudioModal from './MediaStudioModal';
import { translate } from '../../utils/i18n';

// Reusable pencil-icon-triggered edit surface: a bilingual title plus a
// Media Studio picker for the card's background (image or a ≤5s video).
// Shared by founder/categories.js and founder/banners.js so the "click
// pencil → modal with title + media picker" pattern is the same
// everywhere it appears, rather than each admin page rebuilding it.
export default function EditCardModal({
  open,
  onClose,
  locale,
  titleAr,
  titleCkb,
  onTitleArChange,
  onTitleCkbChange,
  mediaUrl,
  mediaType,
  onMediaSelect,
  onMediaClear,
  onSave,
  saving,
  error,
  extraFields,
  maxVideoSeconds,
}) {
  const t = (path) => translate(locale, path);
  const [mediaStudioOpen, setMediaStudioOpen] = useState(false);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        className="relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-[1.5rem] border border-gold-400/20 bg-surface-dark shadow-[0_0_60px_-15px_rgba(230,171,44,0.4)]"
      >
        <div className="flex items-center justify-between border-b border-white/10 p-5">
          <h2 className="font-display text-lg font-bold text-white">{t('editModal.title')}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-gold-300"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-white/60">{t('editModal.titleArLabel')}</label>
              <input value={titleAr} onChange={(e) => onTitleArChange(e.target.value)} className="input-cinematic text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-white/60">{t('editModal.titleCkbLabel')}</label>
              <input value={titleCkb} onChange={(e) => onTitleCkbChange(e.target.value)} className="input-cinematic text-sm" />
            </div>
          </div>

          {extraFields}

          {onMediaSelect && (
          <div>
            <label className="mb-1 block text-xs text-white/60">{t('mediaStudio.title')}</label>
            <div className="flex items-center gap-3">
              {mediaUrl && (
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/20">
                  {mediaType === 'video' ? (
                    <video src={mediaUrl} muted loop autoPlay playsInline className="h-full w-full object-cover" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={mediaUrl} alt="" className="h-full w-full object-cover" />
                  )}
                  {mediaType === 'video' && (
                    <span className="absolute end-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white">
                      <Film className="h-2.5 w-2.5" aria-hidden="true" />
                    </span>
                  )}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setMediaStudioOpen(true)}
                  className="flex items-center gap-1.5 rounded-xl2 border border-white/15 px-3 py-2 text-sm font-semibold text-white/80 transition-colors hover:bg-white/5"
                >
                  <ImageIcon className="h-4 w-4" aria-hidden="true" />
                  {t('editModal.chooseMediaCta')}
                </button>
                {mediaUrl && onMediaClear && (
                  <button
                    type="button"
                    onClick={onMediaClear}
                    className="rounded-xl2 border border-red-400/30 px-3 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/10"
                  >
                    {t('editModal.removeMediaCta')}
                  </button>
                )}
              </div>
            </div>
          </div>
          )}

          {error && (
            <p className="text-sm text-red-400" dir="ltr">
              {error}
            </p>
          )}
        </div>

        <div className="flex gap-2 border-t border-white/10 p-5">
          <button type="button" onClick={onSave} disabled={saving} className="btn-cinematic-gold px-5 py-2 text-sm disabled:opacity-50">
            {t('common.save')}
          </button>
          <button type="button" onClick={onClose} className="btn-cinematic-outline px-5 py-2 text-sm">
            {t('common.cancel')}
          </button>
        </div>
      </motion.div>

      <MediaStudioModal
        open={mediaStudioOpen}
        onClose={() => setMediaStudioOpen(false)}
        onSelect={(item) => {
          onMediaSelect(item);
          setMediaStudioOpen(false);
        }}
        locale={locale}
        {...(maxVideoSeconds ? { maxVideoSeconds } : {})}
      />
    </div>
  );
}
