import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Film, Loader as Loader2, UploadCloud, X } from 'lucide-react';
import { supabaseClient } from '../../lib/supabaseClient';
import { translate } from '../../utils/i18n';
import { safeSlug } from '../../utils/safeStorageName';
import CanvaDesignLink from './CanvaDesignLink';

const DEFAULT_MAX_VIDEO_SECONDS = 5;
// Small grace window for encoder rounding (a "5 second" export can read
// back as 5.03s) — reject meaningfully long clips, not float noise.
const GRACE_SECONDS = 0.5;

function fileKind(file) {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  return null;
}

// Reads a video file's duration without uploading it first, by loading it
// into an off-DOM <video> from a local object URL.
function readVideoDuration(file) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    const objectUrl = URL.createObjectURL(file);
    video.src = objectUrl;
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(video.duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('cannot-read-video'));
    };
  });
}

// Founder-only reusable media picker: browse previously uploaded
// images/videos, or drag-and-drop a new one in. Videos are duration-capped
// (checked client-side before upload, not just server-side — Supabase
// Storage has no video-duration inspection to enforce it on a direct API
// upload) since these are meant as short looping backgrounds, not general
// video hosting. Callers can raise the cap (e.g. announcements allow
// longer clips than category icons) via maxVideoSeconds.
export default function MediaStudioModal({ open, onClose, onSelect, locale, maxVideoSeconds = DEFAULT_MAX_VIDEO_SECONDS, filterType }) {
  const t = (path) => translate(locale, path);
  const maxWithGrace = maxVideoSeconds + GRACE_SECONDS;
  const acceptAttr = filterType === 'image' ? 'image/png,image/jpeg,image/webp,image/svg+xml' : filterType === 'video' ? 'video/mp4,video/webm' : 'image/png,image/jpeg,image/webp,image/svg+xml,video/mp4,video/webm';
  const [items, setItems] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    let active = true;

    function load() {
      supabaseClient
        .from('media_library')
        .select('*')
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          if (active) setItems(data ?? []);
        });
    }

    load();
    const channel = supabaseClient
      .channel('media-library-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'media_library' }, load)
      .subscribe();

    return () => {
      active = false;
      supabaseClient.removeChannel(channel);
    };
  }, [open]);

  async function handleFile(file) {
    setError('');
    const kind = fileKind(file);
    if (!kind || (filterType && kind !== filterType)) {
      setError(t('mediaStudio.unsupportedType'));
      return;
    }

    if (kind === 'video') {
      try {
        const duration = await readVideoDuration(file);
        if (duration > maxWithGrace) {
          setError(t('mediaStudio.videoTooLong').replace('{max}', String(maxVideoSeconds)));
          return;
        }
      } catch {
        setError(t('mediaStudio.unsupportedType'));
        return;
      }
    }

    setUploading(true);
    const path = `media-library/${crypto.randomUUID()}-${safeSlug(file.name)}`;
    const { error: uploadError } = await supabaseClient.storage.from('site-assets').upload(path, file);
    if (uploadError) {
      setUploading(false);
      setError(uploadError.message || t('common.errorGeneric'));
      return;
    }
    const { data } = supabaseClient.storage.from('site-assets').getPublicUrl(path);
    const { error: insertError } = await supabaseClient
      .from('media_library')
      .insert({ url: data.publicUrl, type: kind, name: file.name });
    setUploading(false);
    if (insertError) {
      setError(insertError.message || t('common.errorGeneric'));
      return;
    }
    // A fresh upload should behave exactly like clicking an existing
    // library thumbnail — select it immediately instead of leaving the
    // founder to notice the new tile and click it themselves.
    onSelect({ url: data.publicUrl, type: kind, name: file.name });
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        className="relative z-10 flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-[1.5rem] border border-gold-400/20 bg-surface-dark shadow-[0_0_60px_-15px_rgba(230,171,44,0.4)]"
      >
        <div className="flex items-center justify-between border-b border-white/10 p-5">
          <h2 className="font-display text-lg font-bold text-white">{t('mediaStudio.title')}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-gold-300"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="p-5">
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${
              dragActive ? 'border-gold-400 bg-gold-400/10' : 'border-white/15 hover:border-white/30'
            }`}
          >
            {uploading ? (
              <Loader2 className="h-6 w-6 animate-spin text-gold-300" aria-hidden="true" />
            ) : (
              <UploadCloud className="h-6 w-6 text-white/50" aria-hidden="true" />
            )}
            <p className="text-sm text-white/70">{t('mediaStudio.uploadZoneLabel')}</p>
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptAttr}
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (file) handleFile(file);
              }}
            />
          </div>
          {error && (
            <p className="mt-2 text-sm text-red-400" dir="ltr">
              {error}
            </p>
          )}
          <div className="mt-2 flex justify-center">
            <CanvaDesignLink locale={locale} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-5">
          {(() => {
            if (items === null) return <p className="text-sm text-white/50">{t('common.loading')}</p>;
            const visibleItems = filterType ? items.filter((item) => item.type === filterType) : items;
            if (visibleItems.length === 0) return <p className="text-sm text-white/50">{t('mediaStudio.empty')}</p>;
            return (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {visibleItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelect(item)}
                  className="group relative aspect-square overflow-hidden rounded-xl2 border border-white/10 transition-colors hover:border-gold-400/50 focus:outline-none focus:ring-2 focus:ring-gold-300"
                >
                  {item.type === 'video' ? (
                    <video src={item.url} muted loop autoPlay playsInline className="h-full w-full object-cover" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.url} alt={item.name} className="h-full w-full object-cover" />
                  )}
                  {item.type === 'video' && (
                    <span className="absolute end-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white">
                      <Film className="h-3 w-3" aria-hidden="true" />
                    </span>
                  )}
                  <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-sm font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
                    {t('mediaStudio.selectCta')}
                  </span>
                </button>
              ))}
            </div>
            );
          })()}
        </div>
      </motion.div>
    </div>
  );
}
