import { useState } from 'react';
import { Loader as Loader2, Paperclip } from 'lucide-react';
import { supabaseClient } from '../../lib/supabaseClient';
import { translate } from '../../utils/i18n';

const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];
// Some mobile browsers/file pickers report a generic or blank file.type for
// Office documents instead of the exact MIME string (observed as a real
// "can't send files" failure, not just a sandbox quirk) — the extension is
// a reliable fallback since file.name is always present.
const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.pdf', '.doc', '.docx', '.xls', '.xlsx'];
const MAX_BYTES = 5 * 1024 * 1024;

function isAllowedFile(file) {
  if (ALLOWED_MIME_TYPES.includes(file.type)) return true;
  const lowerName = file.name.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
}

// Supabase Storage rejects non-ASCII characters in the object key itself
// ("Invalid key") — and Arabic/Kurdish file names are the norm for this
// app's users, not an edge case. The real name (Arabic and all) is always
// carried separately via onUploaded's `name` field, which is what the
// chat UI displays — but request-chat attachments have nowhere to store
// that (request_messages has no metadata columns), so the storage key
// still keeps an ASCII-transliterated slug as a readable fallback name
// for that one caller, rather than dropping the filename entirely.
function safeExtension(fileName) {
  const match = /\.([a-zA-Z0-9]+)$/.exec(fileName);
  return match ? `.${match[1].toLowerCase()}` : '';
}

function safeSlug(fileName) {
  const ext = safeExtension(fileName);
  const base = fileName.slice(0, fileName.length - ext.length);
  const asciiBase = base
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return `${asciiBase || 'file'}${ext}`;
}

export default function AttachmentUploader({ pathPrefix, onUploaded, locale }) {
  const t = (path) => translate(locale, path);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setError('');
    if (!isAllowedFile(file)) {
      setError(t('chat.attachmentTypeInvalid'));
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(t('chat.attachmentTooLarge'));
      return;
    }

    setUploading(true);
    const path = `${pathPrefix}/${crypto.randomUUID()}-${safeSlug(file.name)}`;
    const { error: uploadError } = await supabaseClient.storage.from('attachments').upload(path, file);
    setUploading(false);

    if (uploadError) {
      setError(uploadError.message || t('common.errorGeneric'));
      return;
    }
    onUploaded({ path, name: file.name, size: file.size, mime: file.type });
  }

  return (
    <label className="flex cursor-pointer items-center gap-1.5 rounded-xl px-2 py-2 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-500/10 dark:text-brand-300">
      <input
        type="file"
        accept={[...ALLOWED_MIME_TYPES, ...ALLOWED_EXTENSIONS].join(',')}
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
      {error && <span className="ms-2 text-xs font-normal text-red-600 dark:text-red-300" dir="ltr">{error}</span>}
    </label>
  );
}
