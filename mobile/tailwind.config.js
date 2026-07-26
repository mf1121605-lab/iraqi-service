/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        gold: {
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
        dark: {
          900: '#0d1117',
          800: '#161b22',
          700: '#21262d',
          600: '#30363d',
        },
      },
      fontFamily: {
        arabic: ['Cairo_700Bold', 'Cairo_400Regular'],
      },
    },
  },
  plugins: [],
};
