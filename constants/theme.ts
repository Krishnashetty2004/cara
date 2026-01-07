// CARA Design System - Calm, Human-Centric Theme
// "Early morning light" - thoughtful, minimal, emotionally grounding

export const colors = {
  // Backgrounds
  calm: '#F2F3F4',        // Primary background - warm neutral
  warm: '#DED1C6',        // Secondary surfaces, cards
  surface: '#FFFFFF',     // White cards
  surfaceHover: '#F8F8F7',

  // Primary palette
  emotional: '#A77693',   // Accent, CTAs, emotional depth
  focus: '#174871',       // Body text, intellectual elements
  trust: '#0F2D4D',       // Headers, deep trust

  // Text hierarchy
  textPrimary: '#0F2D4D',   // Headers, important text
  textBody: '#174871',      // Body text
  textMuted: '#6B7B8A',     // Secondary text
  textLight: '#9BA5B0',     // Tertiary, hints

  // Semantic colors (muted, not aggressive)
  success: '#5A9A7A',
  warning: '#C99A5A',
  error: '#B85A5A',

  // Legacy aliases for compatibility
  bg: '#F2F3F4',
  primary: '#A77693',
  primaryDark: '#8A6179',
  primaryLight: '#C49AAF',
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,  // For generous breathing room
}

export const radius = {
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  full: 9999,
}

// Warm shadows (not blue-tinted)
export const shadows = {
  sm: {
    shadowColor: '#0F2D4D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  md: {
    shadowColor: '#0F2D4D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  lg: {
    shadowColor: '#0F2D4D',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },
}

// Animation durations (slow, intentional)
export const animation = {
  fast: 200,
  normal: 400,
  slow: 600,
  verySlow: 800,
}

export const typography = {
  // Display - Playfair for emotional moments
  displayLarge: {
    fontSize: 36,
    fontWeight: '400' as const,
    letterSpacing: -0.5,
    lineHeight: 44,
  },
  displayMedium: {
    fontSize: 28,
    fontWeight: '400' as const,
    letterSpacing: -0.3,
    lineHeight: 36,
  },

  // Headings - Inter for clarity
  h1: {
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 32,
  },
  h2: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  h3: {
    fontSize: 18,
    fontWeight: '500' as const,
    lineHeight: 26,
  },

  // Body - optimized for reading
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 26,  // 1.6 ratio for comfort
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 22,
  },

  // Labels
  label: {
    fontSize: 12,
    fontWeight: '500' as const,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 18,
  },
}
