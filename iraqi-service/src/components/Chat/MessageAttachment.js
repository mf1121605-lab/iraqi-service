import { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import { supabaseClient } from '../../lib/supabaseClient';
import SafeImage from '../UI/SafeImage';

function displayName(path) {
  const basename = path.split('/').pop() ?? path;
  return basename.replace(/^[0-9a-f-]{36}-/i, '');
}

export default function MessageAttachment({ path }) {
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

  const isImage = /\.(png|jpe?g)$/i.test(path);

  if (isImage) {
    return (
      <a href={signedUrl} target="_blank" rel="noreferrer" className="mt-2 block overflow-hidden rounded-xl2 shadow-soft">
        <SafeImage
          src={signedUrl}
          alt={displayName(path)}
          className="max-h-48 w-full rounded-xl2 object-cover transition-transform duration-300 hover:scale-[1.02]"
        />
      </a>
    );
  }

  return (
    <a
      href={signedUrl}
      target="_blank"
      rel="noreferrer"
      className="mt-2 flex items-center gap-2 rounded-lg bg-black/5 px-3 py-2 text-sm underline decoration-dotted underline-offset-2 dark:bg-white/5"
    >
      <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
      {displayName(path)}
    </a>
  );
}
