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
        // Deep teal — distinct from the Iraqi flag palette on purpose, since
        // this platform is legally a private intermediary, not a government
        // site (see the mandatory footer disclaimer in the spec).
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
        // One accent per service category, used consistently across menu
        // cards, badges, and request status timelines.
        service: {
          military: '#3f5f8a',
          education: '#3f8a6e',
          welfare: '#8a6a3f',
          general: '#6a5b8a',
        },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans Arabic"', '"Noto Kufi Arabic"', 'Tajawal', 'system-ui', 'sans-serif'],
        display: ['Cairo', '"IBM Plex Sans Arabic"', 'system-ui', 'sans-serif'],
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
      },
      backdropBlur: {
        xs: '2px',
      },
      borderRadius: {
        xl2: '1.25rem',
        '3xl': '1.75rem',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        'fade-in': 'fade-in 0.5s ease-out both',
        'pulse-soft': 'pulse-soft 3s ease-in-out infinite',
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
      });
    },
  ],
};
