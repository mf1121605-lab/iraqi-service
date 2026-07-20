import { useEffect, useState } from 'react';
import { Download, FileSpreadsheet, FileText, FileType } from 'lucide-react';
import { supabaseClient } from '../../lib/supabaseClient';
import SafeImage from '../UI/SafeImage';

function displayName(path) {
  const basename = path.split('/').pop() ?? path;
  return basename.replace(/^[0-9a-f-]{36}-?/i, '');
}

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const FILE_KINDS = {
  pdf: { icon: FileText, className: 'bg-red-500/15 text-red-400' },
  word: { icon: FileType, className: 'bg-blue-500/15 text-blue-400' },
  excel: { icon: FileSpreadsheet, className: 'bg-emerald-500/15 text-emerald-400' },
  other: { icon: FileText, className: 'bg-white/10 text-white/70' },
};

function fileKindFor(mime, name) {
  const lowerName = (name || '').toLowerCase();
  if (mime === 'application/pdf' || lowerName.endsWith('.pdf')) return 'pdf';
  if (
    mime === 'application/msword' ||
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    /\.docx?$/.test(lowerName)
  ) {
    return 'word';
  }
  if (
    mime === 'application/vnd.ms-excel' ||
    mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    /\.xlsx?$/.test(lowerName)
  ) {
    return 'excel';
  }
  return 'other';
}

export default function MessageAttachment({ path, name, size, mime }) {
  const [signedUrl, setSignedUrl] = useState(null);

  useEffect(() => {
    let active = true;
    // Private bucket, so links are generated on demand rather than stored —
    // a signed URL saved at message-send time would just expire later.
    supabaseClient.storage
      .from('attachments')
      .createSignedUrl(path, 3600)
      .then(({ data }) => {
        if (active) setSignedUrl(data?.signedUrl ?? null);
      });
    return () => {
      active = false;
    };
  }, [path]);

  if (!signedUrl) return null;

  const fileName = name || displayName(path);
  const isImage = mime ? mime.startsWith('image/') : /\.(png|jpe?g)$/i.test(path);
  const isAudio = mime ? mime.startsWith('audio/') : /\.(webm|m4a|ogg|mp3)$/i.test(path);

  if (isAudio) {
    return (
      // eslint-disable-next-line jsx-a11y/media-has-caption
      <audio src={signedUrl} controls preload="metadata" className="mt-2 h-9 w-full max-w-[16rem]" />
    );
  }

  if (isImage) {
    return (
      <a href={signedUrl} target="_blank" rel="noreferrer" className="mt-2 block overflow-hidden rounded-xl2 shadow-soft">
        <SafeImage
          src={signedUrl}
          alt={fileName}
          className="max-h-48 w-full rounded-xl2 object-cover transition-transform duration-300 hover:scale-[1.02]"
        />
      </a>
    );
  }

  const kind = FILE_KINDS[fileKindFor(mime, fileName)];
  const Icon = kind.icon;

  return (
    <a
      href={signedUrl}
      target="_blank"
      rel="noreferrer"
      download={fileName}
      className="mt-2 flex items-center gap-3 rounded-xl2 bg-black/5 p-2.5 pe-3 transition-colors hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10"
    >
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${kind.className}`}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{fileName}</span>
        {size ? <span className="block text-xs text-ink-muted dark:text-ink-dark-muted">{formatSize(size)}</span> : null}
      </span>
      <Download className="h-4 w-4 shrink-0 opacity-60" aria-hidden="true" />
    </a>
  );
}
