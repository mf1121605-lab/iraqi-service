// Design tokens extracted directly from tailwind.config.js + globals.css
// Every value here matches the web platform exactly.

export const COLORS = {
  // Background hierarchy
  bg:       '#0d1117',   // body background (surface.dark)
  bgAlt:    '#161b22',   // elevated surface (surface.dark-alt)
  bgDeep:   '#080c12',   // deepest layer used in gradients

  // Gold / accent (gold.400 = primary, .300 = light, .600 = dark)
  gold:     '#e6ab2c',   // gold.400
  goldBright: '#fcd34d', // amber.300 — button highlight
  goldDark:   '#d97706', // amber.600 — button shadow end
  goldDim:  'rgba(230,171,44,0.15)',
  goldBorder: 'rgba(230,171,44,0.20)',    // cinematic-card border
  goldBorderHover: 'rgba(245,158,11,0.28)',

  // Card / panel
  card:       '#161b22',
  cardBorder: 'rgba(230,171,44,0.20)',
  cardShimmer: 'rgba(245,158,11,0.06)',   // top shimmer line fill

  // Text
  white:    '#ffffff',
  white70:  'rgba(255,255,255,0.7)',
  white50:  'rgba(255,255,255,0.5)',
  white40:  'rgba(255,255,255,0.4)',
  white20:  'rgba(255,255,255,0.2)',
  white10:  'rgba(255,255,255,0.1)',
  white06:  'rgba(255,255,255,0.06)',
  muted:    'rgba(255,255,255,0.5)',       // ink.dark-muted equivalent

  // Status
  red:    '#ef4444',
  green:  '#22c55e',
  blue:   '#3b82f6',
};

export const FONTS = {
  regular: 'Cairo_400Regular',
  bold:    'Cairo_700Bold',
};

export const RADIUS = {
  sm:  10,   // 0.625rem
  md:  14,   // 0.875rem — input-cinematic, btn-cinematic
  lg:  20,   // 1.25rem  — metal-panel
  xl:  24,   // 1.5rem   — cinematic-card
  xxl: 28,   // 1.75rem  — 3xl
};

export const SHADOWS = {
  gold: {
    shadowColor:  '#e6ab2c',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.30,
    shadowRadius: 20,
    elevation: 8,
  },
  card: {
    shadowColor:  '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.50,
    shadowRadius: 40,
    elevation: 12,
  },
  btn: {
    shadowColor:  '#f59e0b',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.55,
    shadowRadius: 20,
    elevation: 10,
  },
};
