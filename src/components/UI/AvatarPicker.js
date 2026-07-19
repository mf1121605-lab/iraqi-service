import SafeImage from './SafeImage';
import { useLocale } from '../Layout/AppShell';
import { translate } from '../../utils/i18n';

export const AVATAR_KEYS = [
  'avatar-male-1',
  'avatar-male-2',
  'avatar-male-3',
  'avatar-female-1',
  'avatar-female-2',
  'avatar-female-3',
];

export function avatarSrc(avatarKey) {
  if (!avatarKey) return null;
  // Profile Drawer uploads a real photo and stores its public storage URL
  // directly in avatar_key, alongside the older preset-picker keys below —
  // pass a full URL through unchanged instead of mangling it into
  // "/assets/avatars/https://...svg".
  if (/^https?:\/\//i.test(avatarKey)) return avatarKey;
  return `/assets/avatars/${avatarKey}.svg`;
}

export default function AvatarPicker({ value, onSelect }) {
  const locale = useLocale();

  return (
    <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
      {AVATAR_KEYS.map((key, index) => (
        <button
          key={key}
          type="button"
          onClick={() => onSelect(key)}
          aria-pressed={value === key}
          aria-label={translate(locale, 'onboarding.avatarOption').replace('{n}', index + 1)}
          className={`group flex flex-col items-center gap-2 rounded-2xl p-3 transition-all duration-300 hover:bg-white/10 hover:shadow-glow focus:outline-none focus:ring-2 focus:ring-gold-300 ${
            value === key ? 'bg-white/10 shadow-glow ring-2 ring-gold-300' : ''
          }`}
        >
          <span
            className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 p-2 shadow-inner-glass transition-transform duration-300 group-hover:scale-110"
            style={{ animation: `float 6s ease-in-out ${index * 0.4}s infinite` }}
          >
            <SafeImage src={avatarSrc(key)} alt="" className="h-full w-full rounded-full" />
          </span>
        </button>
      ))}
    </div>
  );
}
