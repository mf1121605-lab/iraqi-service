import { useState } from 'react';
import { ImagePlus, Loader as Loader2, X } from 'lucide-react';
import { supabaseClient } from '../../lib/supabaseClient';
import { translate } from '../../utils/i18n';
import { safeSlug } from '../../utils/safeStorageName';

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;

// Uploads into the public 'site-assets' bucket and hands back a public URL
// (not a storage path) — callers store that URL directly on the row, so
// display code (SafeImage, <img>) never needs to resolve a signed URL.
export default function ImageUploader({ pathPrefix, value, onUploaded, onClear, locale, className = '' }) {
  const t = (path) => translate(locale, path);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setError('');
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError(t('common.imageTypeInvalid'));
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(t('common.imageTooLarge'));
      return;
    }

    setUploading(true);
    const path = `${pathPrefix}/${crypto.randomUUID()}-${safeSlug(file.name)}`;
    const { error: uploadError } = await supabaseClient.storage.from('site-assets').upload(path, file);
    if (uploadError) {
      setUploading(false);
      setError(uploadError.message || t('common.errorGeneric'));
      return;
    }
    const { data } = supabaseClient.storage.from('site-assets').getPublicUrl(path);
    setUploading(false);
    onUploaded(data.publicUrl);
  }

  return (
    <div className={className}>
      <div className="flex items-center gap-3">
        {value && (
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="" className="h-full w-full object-cover" />
            {onClear && (
              <button
                type="button"
                onClick={onClear}
                aria-label={t('common.remove')}
                className="absolute -end-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/80 text-white transition-colors hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-gold-300"
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            )}
          </div>
        )}
        <label className="flex cursor-pointer items-center gap-1.5 rounded-xl2 border border-white/15 px-3 py-2 text-sm font-semibold text-white/80 transition-colors hover:bg-white/5">
          <input type="file" accept={ALLOWED_TYPES.join(',')} onChange={handleFileChange} disabled={uploading} className="hidden" />
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ImagePlus className="h-4 w-4" aria-hidden="true" />}
          <span>{uploading ? t('common.uploading') : t('common.uploadImage')}</span>
        </label>
      </div>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
