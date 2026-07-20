/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,jsx}',
    './src/components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eefaf6',
          100: '#d5f2e7',
          200: '#ade4d0',
          300: '#7ccdb3',
          400: '#4bb096',
          500: '#2f9480',
          600: '#227667',
          700: '#1e5f55',
          800: '#1c4c46',
          900: '#193f3b',
          950: '#0a2422',
        },
        gold: {
          50: '#fdf8ed',
          100: '#faedc9',
          200: '#f4d98d',
          300: '#edc151',
          400: '#e6ab2c',
          500: '#d38f1d',
          600: '#b46f17',
          700: '#8f5217',
          800: '#754319',
          900: '#623918',
        },
        surface: {
          light: '#f7f8fa',
          DEFAULT: '#ffffff',
          dark: '#12181b',
          'dark-alt': '#1a2226',
        },
        ink: {
          light: '#1f2937',
          muted: '#5b6773',
          dark: '#e6edf0',
          'dark-muted': '#9fb0b7',
        },
        service: {
          military: '#3f5f8a',
          education: '#3f8a6e',
          welfare: '#8a6a3f',
          general: '#6a5b8a',
        },
      },
      fontFamily: {
        sans: ['var(--font-noto-sans-arabic)', 'Tahoma', 'system-ui', 'sans-serif'],
        display: ['var(--font-cairo)', 'var(--font-noto-sans-arabic)', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-hero': 'linear-gradient(135deg, #193f3b 0%, #227667 45%, #2f9480 100%)',
        'gradient-gold': 'linear-gradient(135deg, #d38f1d 0%, #edc151 100%)',
        'gradient-glass': 'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.04) 100%)',
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(10, 36, 34, 0.18)',
        'glass-sm': '0 4px 16px 0 rgba(10, 36, 34, 0.12)',
        soft: '0 2px 10px 0 rgba(31, 41, 55, 0.06)',
        elevate:
          '0 1px 2px 0 rgba(10, 36, 34, 0.06), 0 8px 24px -4px rgba(10, 36, 34, 0.12), 0 24px 48px -12px rgba(10, 36, 34, 0.16)',
        'elevate-lg':
          '0 2px 4px 0 rgba(10, 36, 34, 0.08), 0 16px 32px -8px rgba(10, 36, 34, 0.18), 0 40px 80px -16px rgba(10, 36, 34, 0.22)',
        glow: '0 0 0 1px rgba(227, 178, 44, 0.25), 0 8px 24px -4px rgba(211, 143, 29, 0.35)',
        'inner-glass': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.16), inset 0 -1px 0 0 rgba(0, 0, 0, 0.08)',
        'card-dark': '0 1px 2px 0 rgba(0, 0, 0, 0.24), 0 16px 40px -12px rgba(0, 0, 0, 0.5)',
      },
      backdropBlur: {
        xs: '2px',
      },
      borderRadius: {
        xl2: '1.25rem',
        '3xl': '1.75rem',
        '4xl': '2.25rem',
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'spotlight-sweep': {
          '0%, 100%': { opacity: '0.5', transform: 'translateX(-10%) scale(1)' },
          '50%': { opacity: '0.85', transform: 'translateX(10%) scale(1.08)' },
        },
        'gold-sweep': {
          '0%': { transform: 'translateX(-150%) skewX(-20deg)' },
          '100%': { transform: 'translateX(250%) skewX(-20deg)' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.94)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-down': {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'wave-drift': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'particle-fall': {
          '0%': { transform: 'translateY(-10%) translateX(0)', opacity: '0' },
          '10%': { opacity: '0.8' },
          '90%': { opacity: '0.5' },
          '100%': { transform: 'translateY(110vh) translateX(20px)', opacity: '0' },
        },
        'spark-rise': {
          '0%': { transform: 'translateY(0) scale(0.3)', opacity: '0' },
          '15%': { opacity: '1' },
          '70%': { opacity: '0.7' },
          '100%': { transform: 'translateY(-46px) scale(1)', opacity: '0' },
        },
      },

      animation: {
        float: 'float 6s ease-in-out infinite',
        'fade-in': 'fade-in 0.5s ease-out both',
        'pulse-soft': 'pulse-soft 3s ease-in-out infinite',
        'scale-in': 'scale-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) both',
        'slide-up': 'slide-up 0.45s cubic-bezier(0.16, 1, 0.3, 1) both',
        'slide-down': 'slide-down 0.25s cubic-bezier(0.16, 1, 0.3, 1) both',
        shimmer: 'shimmer 2.5s ease-in-out infinite',
        'spotlight-sweep': 'spotlight-sweep 10s ease-in-out infinite',
        'wave-drift': 'wave-drift 18s linear infinite',
        'wave-drift-fast': 'wave-drift 11s linear infinite',
        'particle-fall': 'particle-fall 12s linear infinite',
        'spark-rise': 'spark-rise 1.8s ease-out infinite',
        'spin-slow': 'spin 2.4s cubic-bezier(0.65, 0, 0.35, 1) infinite',
        'spin-medium-reverse': 'spin 1.7s cubic-bezier(0.45, 0, 0.55, 1) infinite reverse',
        'spin-fast': 'spin 1s cubic-bezier(0.34, 1.56, 0.64, 1) infinite',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    function ({ addComponents }) {
      addComponents({
        '.glass-panel': {
          backgroundImage:
            'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.04) 100%)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.16)',
        },
        '.glass-panel-dark': {
          backgroundImage:
            'linear-gradient(135deg, rgba(18,24,27,0.55) 0%, rgba(18,24,27,0.25) 100%)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.08)',
        },
        '.glass-nav': {
          backgroundColor: 'rgba(255,255,255,0.72)',
          backdropFilter: 'blur(20px) saturate(160%)',
          WebkitBackdropFilter: 'blur(20px) saturate(160%)',
        },
        '.glass-nav-dark': {
          backgroundColor: 'rgba(18,24,27,0.72)',
          backdropFilter: 'blur(20px) saturate(160%)',
          WebkitBackdropFilter: 'blur(20px) saturate(160%)',
        },
        '.cinematic-card': {
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '2rem',
          border: '1px solid rgba(230, 171, 44, 0.18)',
          backgroundColor: '#ffffff',
          backgroundImage:
            'linear-gradient(165deg, rgba(255,255,255,0.9) 0%, #fffdf7 55%, #fbf5e6 100%)',
          boxShadow: '0 24px 60px -20px rgba(180,111,23,0.18), 0 1px 3px rgba(0,0,0,0.04)',
        },
        '.dark .cinematic-card': {
          backgroundColor: 'transparent',
          backgroundImage:
            'linear-gradient(165deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 55%, rgba(0,0,0,0.1) 100%)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: '0 30px 80px -20px rgba(0,0,0,0.85), 0 0 0 1px rgba(230,171,44,0.06)',
        },
        '.cinematic-card::before': {
          content: '""',
          position: 'absolute',
          insetInlineStart: 0,
          insetInlineEnd: 0,
          top: 0,
          height: '1px',
          backgroundImage:
            'linear-gradient(90deg, transparent 0%, rgba(211,143,29,0.7) 50%, transparent 100%)',
        },
        '.dark .cinematic-card::before': {
          backgroundImage:
            'linear-gradient(90deg, transparent 0%, rgba(244,217,141,0.9) 50%, transparent 100%)',
        },
        '.cinematic-emblem': {
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '9999px',
          backgroundImage: 'linear-gradient(160deg, rgba(230,171,44,0.22), rgba(230,171,44,0.02))',
          border: '1px solid rgba(230,171,44,0.35)',
          boxShadow: '0 0 0 6px rgba(230,171,44,0.05), 0 12px 30px -10px rgba(230,171,44,0.35)',
        },
        '.btn-cinematic-gold': {
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          borderRadius: '1.25rem',
          backgroundImage: 'linear-gradient(135deg, #f4d98d 0%, #e6ab2c 55%, #b46f17 100%)',
          color: '#1c1204',
          fontWeight: '700',
          boxShadow: '0 10px 30px -8px rgba(230,171,44,0.55), inset 0 1px 0 0 rgba(255,255,255,0.35)',
          transition: 'transform 300ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 300ms ease',
        },
        '.btn-cinematic-gold:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 16px 40px -8px rgba(230,171,44,0.7), inset 0 1px 0 0 rgba(255,255,255,0.4)',
        },
        '.btn-cinematic-gold:active': {
          transform: 'translateY(0)',
        },
        '.btn-cinematic-gold::after': {
          content: '""',
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          width: '30%',
          backgroundImage:
            'linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)',
          transform: 'translateX(-150%) skewX(-20deg)',
        },
        '.btn-cinematic-gold:hover::after': {
          animation: 'gold-sweep 900ms ease',
        },
        '.btn-cinematic-outline': {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          borderRadius: '1.25rem',
          border: '1px solid rgba(230,171,44,0.3)',
          backgroundColor: 'rgba(255,255,255,0.04)',
          color: 'inherit',
          fontWeight: '600',
          transition: 'all 300ms ease',
        },
        '.btn-cinematic-outline:hover': {
          borderColor: 'rgba(230,171,44,0.6)',
          backgroundColor: 'rgba(230,171,44,0.08)',
          transform: 'translateY(-1px)',
        },
        '.input-cinematic': {
          width: '100%',
          borderRadius: '1.25rem',
          border: '1px solid rgba(28,25,23,0.12)',
          backgroundColor: '#ffffff',
          padding: '0.9rem 1.1rem',
          color: '#1c1917',
          fontWeight: '700',
          transition: 'all 250ms ease',
        },
        '.dark .input-cinematic': {
          border: '1px solid rgba(255,255,255,0.14)',
          backgroundColor: 'rgba(255,255,255,0.05)',
          color: '#fff',
        },
        '.input-cinematic:focus': {
          outline: 'none',
          borderColor: 'rgba(230,171,44,0.6)',
          backgroundColor: '#fffdf7',
          boxShadow: '0 0 0 4px rgba(230,171,44,0.12)',
        },
        '.dark .input-cinematic:focus': {
          backgroundColor: 'rgba(255,255,255,0.08)',
          boxShadow: '0 0 0 4px rgba(230,171,44,0.15)',
        },
        '.input-cinematic::placeholder': {
          color: 'rgba(28,25,23,0.4)',
          fontWeight: '700',
        },
        '.dark .input-cinematic::placeholder': {
          color: 'rgba(255,255,255,0.4)',
        },
        '.section-title-cinematic': {
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.75rem',
        },
        '.section-title-cinematic::after': {
          content: '""',
          height: '2px',
          width: '2.5rem',
          backgroundImage: 'linear-gradient(90deg, #e6ab2c, transparent)',
          borderRadius: '9999px',
        },
        '.metal-panel': {
          position: 'relative',
          borderRadius: '1.5rem',
          backgroundColor: '#ffffff',
          backgroundImage: 'linear-gradient(145deg, #ffffff 0%, #fffdf7 55%, #fbf5e6 100%)',
          border: '1px solid rgba(28,25,23,0.08)',
          boxShadow: '0 20px 40px -18px rgba(180,111,23,0.18), 0 1px 3px rgba(0,0,0,0.04)',
          transition: 'box-shadow 300ms ease, transform 300ms ease',
        },
        '.dark .metal-panel': {
          backgroundColor: 'transparent',
          backgroundImage: 'linear-gradient(145deg, #2c2f36 0%, #1a1c20 45%, #101113 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow:
            'inset 0 1px 0 0 rgba(255,255,255,0.12), inset 0 -2px 6px 0 rgba(0,0,0,0.6), 0 20px 40px -12px rgba(0,0,0,0.7)',
        },
        '.dark .metal-panel::before': {
          content: '""',
          position: 'absolute',
          inset: '3px',
          borderRadius: 'calc(1.5rem - 3px)',
          border: '1px solid rgba(255,255,255,0.06)',
          backgroundImage:
            'repeating-linear-gradient(115deg, rgba(255,255,255,0.035) 0px, rgba(255,255,255,0.035) 1px, transparent 1px, transparent 5px)',
          pointerEvents: 'none',
        },
        '.dark .metal-panel::after': {
          content: '""',
          position: 'absolute',
          inset: 0,
          borderRadius: 'inherit',
          pointerEvents: 'none',
          backgroundRepeat: 'no-repeat',
          backgroundSize: '9px 9px',
          backgroundImage: Array(4)
            .fill('radial-gradient(circle at 3px 3px, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.08) 55%, transparent 70%)')
            .join(', '),
          backgroundPosition: '14px 14px, calc(100% - 14px) 14px, 14px calc(100% - 14px), calc(100% - 14px) calc(100% - 14px)',
        },
        '.metal-panel:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 24px 50px -16px rgba(180,111,23,0.28), 0 0 0 1px rgba(230,171,44,0.25)',
        },
        '.dark .metal-panel:hover': {
          boxShadow:
            'inset 0 1px 0 0 rgba(255,255,255,0.16), inset 0 -2px 6px 0 rgba(0,0,0,0.6), 0 0 0 1px rgba(230,171,44,0.35), 0 24px 50px -12px rgba(0,0,0,0.85), 0 0 28px -4px rgba(230,171,44,0.3)',
        },
        '.icon-medallion': {
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '9999px',
          backgroundImage: 'radial-gradient(circle at 50% 32%, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.02) 45%, transparent 70%)',
          boxShadow:
            'inset 0 2px 6px rgba(255,255,255,0.15), inset 0 -6px 14px rgba(0,0,0,0.55), 0 0 26px -2px var(--medallion-glow, rgba(230,171,44,0.5))',
        },
        '.iraq-flag-watermark': {
          backgroundImage: "url('/assets/decorative/iraq-flag-watermark.svg')",
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          backgroundSize: 'contain',
        },
        '.grain-overlay': {
          position: 'fixed',
          inset: 0,
          zIndex: 1,
          pointerEvents: 'none',
          opacity: 0.05,
          mixBlendMode: 'overlay',
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        },
      });
    },
  ],
};
