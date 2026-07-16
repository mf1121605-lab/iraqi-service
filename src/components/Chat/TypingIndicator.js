import { translate } from '../../utils/i18n';

// Renders nothing when no one else is typing, so callers can mount this
// unconditionally at the bottom of the message list.
export default function TypingIndicator({ names, locale }) {
  const t = (path) => translate(locale, path);
  if (!names || names.length === 0) return null;

  const label =
    names.length === 1
      ? `${names[0]} ${t('chat.typingSingular')}`
      : `${names.slice(0, 2).join('، ')} ${t('chat.typingPlural')}`;

  return (
    <div className="flex items-center gap-2 px-1 text-xs text-white/50">
      <span className="flex items-center gap-0.5">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/50 [animation-delay:0ms]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/50 [animation-delay:150ms]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/50 [animation-delay:300ms]" />
      </span>
      <span>{label}</span>
    </div>
  );
}
