import { useState } from 'react';
import { ImageOff } from 'lucide-react';

// A plain <img> with no error handling shows the browser's broken-image
// glyph the moment a signed URL expires or a path 404s — this wraps that
// with a graceful, on-brand placeholder instead.
export default function SafeImage({ src, alt = '', className = '', iconClassName = '', ...rest }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <span
        role="img"
        aria-label={alt || undefined}
        className={`flex items-center justify-center bg-black/5 text-ink-muted dark:bg-white/5 dark:text-ink-dark-muted ${className}`}
      >
        <ImageOff className={`h-6 w-6 opacity-40 ${iconClassName}`} strokeWidth={1.5} aria-hidden="true" />
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} onError={() => setFailed(true)} {...rest} />
  );
}
