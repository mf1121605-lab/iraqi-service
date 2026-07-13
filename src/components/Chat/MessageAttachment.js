import { useEffect, useState } from 'react';
import { supabaseClient } from '../../lib/supabaseClient';

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
      <a href={signedUrl} target="_blank" rel="noreferrer" className="mt-2 block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={signedUrl} alt={displayName(path)} className="max-h-48 rounded-xl2" />
      </a>
    );
  }

  return (
    <a href={signedUrl} target="_blank" rel="noreferrer" className="mt-2 block text-sm underline">
      {displayName(path)}
    </a>
  );
}
