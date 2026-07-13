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
          className={`group flex flex-col items-center gap-2 rounded-xl2 p-3 transition hover:bg-white/10 ${
            value === key ? 'ring-2 ring-gold-300' : ''
          }`}
        >
          <span
            className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 p-2 transition group-hover:scale-105"
            style={{ animation: `float 6s ease-in-out ${index * 0.4}s infinite` }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={avatarSrc(key)} alt="" className="h-full w-full" />
          </span>
        </button>
      ))}
    </div>
  );
}
