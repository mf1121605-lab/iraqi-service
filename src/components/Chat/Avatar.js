import { avatarSrc } from '../UI/AvatarPicker';
import SafeImage from '../UI/SafeImage';

const INITIAL_COLORS = ['bg-brand-600', 'bg-gold-600', 'bg-emerald-600', 'bg-rose-600', 'bg-sky-600'];

function colorFor(seed) {
  if (!seed) return INITIAL_COLORS[0];
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return INITIAL_COLORS[hash % INITIAL_COLORS.length];
}

// Shared avatar circle: an uploaded avatar image, or an initials badge
// colored deterministically from the name/id so the same person keeps the
// same color across renders without storing one.
export default function Avatar({ avatarKey, name, seed, className = 'h-8 w-8' }) {
  const src = avatarSrc(avatarKey);
  if (src) {
    return (
      <SafeImage
        src={src}
        alt=""
        className={`${className} shrink-0 rounded-full object-cover ring-1 ring-inset ring-white/15`}
      />
    );
  }

  const initial = (name || '?').trim().charAt(0).toUpperCase();
  return (
    <span
      className={`${className} flex shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ring-1 ring-inset ring-white/15 ${colorFor(seed || name)}`}
      aria-hidden="true"
    >
      {initial}
    </span>
  );
}
