import { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { supabaseClient } from '../../lib/supabaseClient';
import { safeSlug } from '../../utils/safeStorageName';
import { useLocale } from '../Layout/AppShell';
import { translate } from '../../utils/i18n';

export const AVATAR_KEYS = [
  'char-1', 'char-2', 'char-3', 'char-4',
  'char-5', 'char-6', 'char-7', 'char-8',
];

export function avatarSrc(avatarKey) {
  if (!avatarKey) return null;
  if (/^https?:\/\//i.test(avatarKey)) return avatarKey;
  // Legacy: full path already stored (e.g. '/assets/avatars/char-1.svg')
  if (avatarKey.startsWith('/')) return avatarKey;
  return `/assets/avatars/${avatarKey}.png`;
}

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export default function AvatarPicker({ value, onSelect, profileId }) {
  const locale = useLocale();
  const t = (path) => translate(locale, path);
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  async function handleCameraFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !ALLOWED_TYPES.includes(file.type)) return;
    if (!profileId) return;
    setUploadError('');
    setUploading(true);
    const path = `avatars/${profileId}/${crypto.randomUUID()}-${safeSlug(file.name)}`;
    const { error: uploadErr } = await supabaseClient.storage.from('site-assets').upload(path, file);
    if (uploadErr) {
      setUploadError(uploadErr.message);
      setUploading(false);
      return;
    }
    const { data } = supabaseClient.storage.from('site-assets').getPublicUrl(path);
    onSelect(data.publicUrl);
    setUploading(false);
  }

  return (
    <div className="space-y-5">
      {/* Cartoon character preset grid */}
      <div className="grid grid-cols-4 gap-3">
        {AVATAR_KEYS.map((key, index) => {
          const src = avatarSrc(key);
          // Match on key ('char-1'), legacy full-path, or http URL
          const isSelected = value === key || value === src || value === `/assets/avatars/${key}.svg`;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(key)}
              aria-pressed={isSelected}
              aria-label={t('onboarding.avatarOption').replace('{n}', index + 1)}
              className={`group relative flex flex-col items-center gap-1 rounded-2xl p-2 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-gold-300 ${
                isSelected
                  ? 'bg-white/15 shadow-[0_0_16px_rgba(245,158,11,0.4)] ring-2 ring-gold-300'
                  : 'hover:bg-white/10'
              }`}
            >
              <span
                className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-white/10 p-1 shadow-inner-glass transition-transform duration-300 group-hover:scale-110"
                style={{ animation: `float 6s ease-in-out ${index * 0.4}s infinite` }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt=""
                  className="h-full w-full object-contain"
                  loading="lazy"
                />
              </span>
              {isSelected && (
                <span className="absolute -top-1 -end-1 flex h-5 w-5 items-center justify-center rounded-full bg-gold-400 text-[10px] font-bold text-black">✓</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Camera / custom photo option */}
      <div className="flex items-center gap-3">
        <div className="flex-1 border-t border-white/10" />
        <span className="text-xs text-white/40">{t('onboarding.orTakePhoto')}</span>
        <div className="flex-1 border-t border-white/10" />
      </div>

      <label className={`flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-white/20 px-6 py-4 transition-colors hover:border-gold-400/50 hover:bg-white/5 ${uploading ? 'pointer-events-none opacity-50' : ''}`}>
        {uploading ? (
          <Loader2 className="h-6 w-6 animate-spin text-gold-300" aria-hidden="true" />
        ) : (
          <Camera className="h-6 w-6 text-white/50 group-hover:text-gold-300" aria-hidden="true" />
        )}
        <span className="text-sm font-medium text-white/70">{t('onboarding.takePhotoCta')}</span>
        <span className="text-xs text-white/40">{t('onboarding.takePhotoHint')}</span>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          capture="user"
          className="hidden"
          onChange={handleCameraFile}
          disabled={uploading}
        />
      </label>

      {uploadError && <p className="text-center text-xs text-red-400">{uploadError}</p>}

      {/* Show custom photo preview if a non-preset URL is selected */}
      {value && /^https?:\/\//i.test(value) && (
        <div className="flex flex-col items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="h-20 w-20 rounded-full object-cover ring-2 ring-gold-400 shadow-glow" />
          <span className="text-xs text-emerald-400">{t('onboarding.photoSelected')}</span>
        </div>
      )}
    </div>
  );
}
