import { useState } from 'react';
import { Loader as Loader2, Paperclip } from 'lucide-react';
import { supabaseClient } from '../../lib/supabaseClient';
import { translate } from '../../utils/i18n';

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'application/pdf'];
const MAX_BYTES = 5 * 1024 * 1024;

export default function AttachmentUploader({ pathPrefix, onUploaded, locale }) {
  const t = (path) => translate(locale, path);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setError('');
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError(t('chat.attachmentTypeInvalid'));
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(t('chat.attachmentTooLarge'));
      return;
    }

    setUploading(true);
    const path = `${pathPrefix}/${crypto.randomUUID()}-${file.name}`;
    const { error: uploadError } = await supabaseClient.storage.from('attachments').upload(path, file);
    setUploading(false);

    if (uploadError) {
      setError(t('common.errorGeneric'));
      return;
    }
    onUploaded(path);
  }

  return (
    <label className="flex cursor-pointer items-center gap-1.5 rounded-xl px-2 py-2 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-500/10 dark:text-brand-300">
      <input
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        onChange={handleFileChange}
        disabled={uploading}
        className="hidden"
      />
      {uploading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <Paperclip className="h-4 w-4" aria-hidden="true" />
      )}
      <span className="hidden sm:inline">{uploading ? t('chat.uploading') : t('chat.attachCta')}</span>
      {error && <span className="ms-2 text-xs font-normal text-red-600 dark:text-red-300">{error}</span>}
    </label>
  );
}
