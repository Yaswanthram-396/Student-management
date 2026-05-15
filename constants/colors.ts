export const colors = {
  // Primary
  primary: "#1D9E75",
  primaryLight: "#E8F8F3",
  primaryDark: "#0F6E52",

  // Semantic
  amber: "#F59E0B",
  amberLight: "#FEF3C7",
  red: "#EF4444",
  redLight: "#FEE2E2",

  // Surfaces
  background: "#F7F8FA",
  surface: "#FFFFFF",
  surface2: "#F2F4F7",

  // Text
  textPrimary: "#0D1117",
  textSecondary: "#4B5563",
  textMuted: "#9CA3AF",

  // Border
  border: "#E5E7EB",

  // Role colors (kept for compatibility)
  parent: "#1D9E75",
  teacher: "#185FA5",
  principal: "#534AB7",
  // Backwards-compatible aliases
  success: "#1D9E75",
  successBg: "#E8F8F3",
  warning: "#F59E0B",
  warningBg: "#FEF3C7",
  danger: "#EF4444",
  dangerBg: "#FEE2E2",
  textMutedAlt: "#9CA3AF",
} as const;

export type ColorKey = keyof typeof colors;
