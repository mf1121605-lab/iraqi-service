import { defaultLocale, translate } from '../utils/i18n';

// Three concentric arcs (not full rings — each covers ~70% of its
// circumference via strokeDasharray) rotating at different speeds and
// directions, so they never line up the same way twice. Pure SVG + CSS,
// no video/GIF asset to download.
function MotionGraphic({ size }) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className="mx-auto"
      role="img"
      aria-hidden="true"
    >
      <circle
        cx="50"
        cy="50"
        r="42"
        fill="none"
        stroke="#e6ab2c"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray="185 264"
        className="origin-center animate-spin-slow"
        style={{ filter: 'drop-shadow(0 0 6px rgba(230,171,44,0.65))' }}
      />
      <circle
        cx="50"
        cy="50"
        r="31"
        fill="none"
        stroke="#4bb096"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray="136 195"
        className="origin-center animate-spin-medium-reverse"
        style={{ filter: 'drop-shadow(0 0 6px rgba(75,176,150,0.65))' }}
      />
      <circle
        cx="50"
        cy="50"
        r="20"
        fill="none"
        stroke="#faedc9"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray="88 126"
        className="origin-center animate-spin-fast"
        style={{ filter: 'drop-shadow(0 0 5px rgba(250,237,201,0.7))' }}
      />
    </svg>
  );
}

// Global loading indicator — usable full-screen (a blurred overlay that
// blocks interaction while something loads) or inline (dropped straight
// into a button/table cell, no label, sized down).
//
// <LoadingSpinner fullScreen />
// <LoadingSpinner inline size={20} showLabel={false} />
export default function LoadingSpinner({ fullScreen = false, inline = false, size, showLabel = true, label, locale = defaultLocale, className = '' }) {
  const resolvedSize = size ?? (fullScreen ? 96 : inline ? 20 : 56);
  const resolvedLabel = label ?? translate(locale, 'common.loading');

  const content = (
    <div className={`flex flex-col items-center justify-center gap-3 ${inline ? 'flex-row gap-2' : ''} ${className}`}>
      <MotionGraphic size={resolvedSize} />
      {showLabel && (
        <p className={`font-display font-bold text-white animate-pulse ${inline ? 'text-sm' : 'text-base'}`}>
          {resolvedLabel}
        </p>
      )}
    </div>
  );

  if (!fullScreen) return content;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-md">
      {content}
    </div>
  );
}
