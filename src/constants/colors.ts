// ─── AasPaas Design System ────────────────────────────────────────────────────
// Premium hyperlocal community app design tokens

export const Colors = {
  // Core brand
  primary: '#FF385C',       // Coral red — energetic, vibrant, community
  primaryLight: '#FFF1F2',  // Very light coral tint
  primaryMid: '#FF5A78',    // Mid coral for hover/active
  accent: '#F4A24D',        // Warm amber — warmth, local, inviting
  accentLight: '#FEF3E8',   // Light amber tint

  // Semantic
  danger: '#D93025',        // Danger / SOS red
  dangerLight: '#FEF0EE',
  warning: '#E07B39',
  warningLight: '#FEF3E8',
  success: '#10B981',
  successLight: '#D1FAE5',
  info: '#2563EB',
  infoLight: '#EFF6FF',

  // Neutrals (warm-tinted white)
  bg: '#FAFAF8',            // Warm off-white background
  card: '#FFFFFF',
  surface: '#F4F4F1',       // Slightly warm surface
  border: '#E8E8E4',        // Warm border
  borderLight: '#F0F0EC',   // Very light border
  divider: '#EFEFEB',

  // Text
  text: '#1A1A1A',          // Near-black, warm
  textSecondary: '#6B6B6B', // Medium warm gray
  textTertiary: '#9B9B9B',  // Light warm gray
  textInverse: '#FFFFFF',

  // Dark (for auth screens)
  dark: {
    background: '#0F1117',
    card: '#1A1D26',
    surface: '#22263A',
    border: 'rgba(255,255,255,0.08)',
    text: '#F5F5F5',
    textSecondary: '#A0A0A8',
  },
};

export type ThemeType = typeof Colors;
