import SparkOverlay from './SparkOverlay';

const THEMES = {
  welcome: {
    accent: '#e6ab2c',
    main: '🌟',
    secondary: [
      { emoji: '⭐', style: { top: '12%', left: '14%', animation: 'mg-float-y 4s ease-in-out infinite', animationDelay: '0.3s' } },
      { emoji: '✨', style: { bottom: '20%', right: '16%', animation: 'mg-float-y 5s ease-in-out infinite', animationDelay: '1.2s' } },
    ],
    mainAnim: 'mg-pulse-scale 2s ease-in-out infinite',
    glowColor: 'rgba(230,171,44,0.20)',
  },
  military: {
    accent: '#c9d3dc',
    main: '🪖',
    secondary: [
      { emoji: '⚔️', style: { top: '14%', left: '12%', animation: 'mg-sway 4s ease-in-out infinite', animationDelay: '0s' } },
      { emoji: '🎖️', style: { bottom: '18%', right: '14%', animation: 'mg-float-y 3.5s ease-in-out infinite', animationDelay: '0.8s' } },
    ],
    mainAnim: 'mg-sway 3s ease-in-out infinite',
    glowColor: 'rgba(201,211,220,0.16)',
  },
  education: {
    accent: '#4f8bff',
    main: '🎓',
    secondary: [
      { emoji: '📚', style: { top: '16%', left: '10%', animation: 'mg-float-y 3.5s ease-in-out infinite', animationDelay: '0.5s' } },
      { emoji: '✏️', style: { bottom: '16%', right: '12%', animation: 'mg-sway 4s ease-in-out infinite', animationDelay: '1s' } },
    ],
    mainAnim: 'mg-float-y 3s ease-in-out infinite',
    glowColor: 'rgba(79,139,255,0.18)',
  },
  welfare: {
    accent: '#e14b6a',
    main: '❤️',
    secondary: [
      { emoji: '🤝', style: { top: '14%', left: '10%', animation: 'mg-float-y 4s ease-in-out infinite', animationDelay: '0s' } },
      { emoji: '🌿', style: { bottom: '18%', right: '12%', animation: 'mg-float-y 3.5s ease-in-out infinite', animationDelay: '0.9s' } },
    ],
    mainAnim: 'mg-heartbeat 1.2s ease-in-out infinite',
    glowColor: 'rgba(225,75,106,0.18)',
  },
  general: {
    accent: '#e6ab2c',
    main: '⭐',
    secondary: [
      { emoji: '🔧', style: { top: '18%', left: '11%', animation: 'mg-sway 3.5s ease-in-out infinite', animationDelay: '0.4s' } },
      { emoji: '🗂️', style: { bottom: '16%', right: '13%', animation: 'mg-float-y 4s ease-in-out infinite', animationDelay: '1s' } },
    ],
    mainAnim: 'mg-spin-slow 8s linear infinite',
    glowColor: 'rgba(230,171,44,0.18)',
  },
};

export default function MotionGraphicsBanner({ type, titleAr, titleCkb, locale }) {
  const theme = THEMES[type] ?? THEMES.general;
  const title = locale === 'ckb' ? (titleCkb || titleAr) : titleAr;

  return (
    <div
      className="absolute inset-0 h-full w-full overflow-hidden"
      style={{
        background: `radial-gradient(ellipse 65% 60% at 72% 55%, ${theme.glowColor} 0%, transparent 70%), #060a0f`,
      }}
    >
      {/* Ambient light orb */}
      <div
        className="pointer-events-none absolute rounded-full"
        style={{
          width: '45%',
          height: '45%',
          top: '5%',
          right: '5%',
          background: `radial-gradient(circle, ${theme.accent}14 0%, transparent 70%)`,
          animation: 'glow-fade 6s ease-in-out infinite',
        }}
        aria-hidden="true"
      />

      {/* Secondary emojis */}
      {theme.secondary.map((s, i) => (
        <span
          key={i}
          className="pointer-events-none absolute select-none text-4xl leading-none"
          style={s.style}
          aria-hidden="true"
        >
          {s.emoji}
        </span>
      ))}

      {/* Main emoji */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ paddingBottom: '2.5rem' }}
      >
        <span
          className="select-none leading-none"
          style={{
            fontSize: '5.5rem',
            animation: theme.mainAnim,
            display: 'inline-block',
            transformOrigin: 'center center',
            filter: `drop-shadow(0 0 18px ${theme.accent}60)`,
          }}
          aria-hidden="true"
        >
          {theme.main}
        </span>
      </div>

      {/* Title text — slides up on mount */}
      <div
        className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-1.5 px-4 pb-5"
        style={{ animation: 'mg-slide-up 0.6s ease forwards' }}
      >
        <p
          className="text-center text-base font-bold leading-tight sm:text-lg"
          style={{
            color: '#ffffff',
            textShadow: `0 0 20px ${theme.accent}80`,
            direction: 'rtl',
          }}
        >
          {title}
        </p>
        {/* Shimmer bar */}
        <div
          className="h-0.5 w-16 rounded-full"
          style={{
            background: `linear-gradient(90deg, transparent, ${theme.accent}, transparent)`,
            backgroundSize: '200% 100%',
            animation: 'mg-shimmer-sweep 2.4s ease-in-out infinite',
          }}
          aria-hidden="true"
        />
      </div>

      {/* Gold sparks overlay */}
      <SparkOverlay />
    </div>
  );
}
