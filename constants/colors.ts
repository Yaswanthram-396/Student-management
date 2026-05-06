export const colors = {
  // Role colors
  parent: '#1D9E75',
  teacher: '#185FA5',
  principal: '#534AB7',

  // Base
  background: '#FAFAFA',
  surface: '#FFFFFF',
  border: '#EEEEEE',

  // Text
  textPrimary: '#111111',
  textSecondary: '#666666',
  textMuted: '#AAAAAA',

  // Status
  success: '#1D9E75',
  successBg: '#E1F5EE',
  warning: '#D97706',
  warningBg: '#FEF3C7',
  danger: '#DC2626',
  dangerBg: '#FEE2E2',
} as const;

export type ColorKey = keyof typeof colors;
