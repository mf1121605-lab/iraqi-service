import SafeImage from './SafeImage';

export const AVATAR_KEYS = [
  'avatar-male-1',
  'avatar-male-2',
  'avatar-male-3',
  'avatar-female-1',
  'avatar-female-2',
  'avatar-female-3',
];

export function avatarSrc(avatarKey) {
  return avatarKey ? `/assets/avatars/${avatarKey}.svg` : null;
}

export default function AvatarPicker({ value, onSelect }) {
  return (
    <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
      {AVATAR_KEYS.map((key, index) => (
        <button
          key={key}
          type="button"
          onClick={() => onSelect(key)}
          className={`group flex flex-col items-center gap-2 rounded-2xl p-3 transition-all duration-300 hover:bg-white/10 hover:shadow-glow ${
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
