// Re-export from theme.ts for backward compatibility
// Use @/constants/theme for new code

export { colors } from './theme'

// Legacy color mappings for backward compatibility
export const legacyColors = {
  // Backgrounds
  background: '#E8F1FA',
  backgroundPure: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceHover: '#F5F9FC',

  // Primary
  primary: '#4A8FD4',
  primaryLight: '#7AB4E8',
  primaryDark: '#2B5A87',

  // Accent
  accent: '#5BA3E0',
  accentLight: '#D4E5F7',

  // Text
  textPrimary: '#1E3A5F',
  textSecondary: '#3D5A7A',
  textMuted: '#6B8CAE',
  textLight: '#9BB3CC',

  // Semantic
  success: '#4CAF7A',
  error: '#E05A5A',
  warning: '#E8A035',

  // Borders
  border: '#D4E3F2',
  borderLight: '#E8F1FA',

  // Avatar
  avatarBg: '#4A8FD4',
}
