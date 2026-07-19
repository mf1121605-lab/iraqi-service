import { useState } from 'react';
import { Loader as Loader2, Music, X } from 'lucide-react';
import { supabaseClient } from '../../lib/supabaseClient';
import { translate } from '../../utils/i18n';
import { safeSlug } from '../../utils/safeStorageName';

const ALLOWED_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/wav'];
const MAX_BYTES = 10 * 1024 * 1024;

// Same interface/behavior as ImageUploader.js, for the same 'site-assets'
// bucket — hands back a public URL the caller stores directly.
export default function AudioUploader({ pathPrefix, value, onUploaded, onClear, locale, className = '' }) {
  const t = (path) => translate(locale, path);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setError('');
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError(t('mediaStudio.unsupportedType'));
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
      <div className="flex flex-wrap items-center gap-3">
        {value && (
          <div className="flex items-center gap-2 rounded-xl2 border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/80">
            <Music className="h-4 w-4 shrink-0 text-gold-300" aria-hidden="true" />
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <audio src={value} controls className="h-8 max-w-[220px]" />
            {onClear && (
              <button
                type="button"
                onClick={onClear}
                aria-label={t('common.remove')}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-gold-300"
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            )}
          </div>
        )}
        <label className="flex cursor-pointer items-center gap-1.5 rounded-xl2 border border-white/15 px-3 py-2 text-sm font-semibold text-white/80 transition-colors hover:bg-white/5">
          <input type="file" accept={ALLOWED_TYPES.join(',')} onChange={handleFileChange} disabled={uploading} className="hidden" />
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Music className="h-4 w-4" aria-hidden="true" />}
          <span>{uploading ? t('common.uploading') : value ? t('founderSettings.audioChangeCta') : t('founderSettings.audioUploadCta')}</span>
        </label>
      </div>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
