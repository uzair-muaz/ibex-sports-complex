/**
 * IBEX Sports Arena Theme Configuration
 *
 * Centralized theme colors based on logo colors:
 * - Primary: Teal/Mint Green (from logo border and sports equipment)
 * - Secondary: Dark Navy Blue (from logo background)
 * - Accent: Light Teal/Mint for highlights
 *
 * To change the theme colors, update the values below.
 */

export const theme = {
  // Primary brand color (teal/mint green from logo)
  primary: {
    DEFAULT: "#2DD4BF", // Teal/mint green
    hover: "#14B8A6", // Darker teal for hover states
    light: "#5EEAD4", // Lighter teal for highlights
    // RGB values for opacity variations
    rgb: "45, 212, 191",
  },

  // Secondary color (dark navy blue from logo)
  secondary: {
    DEFAULT: "#0F172A", // Dark navy blue
    light: "#1E293B", // Slightly lighter navy
    deep: "#020617", // Darker navy
  },

  // Accent colors
  accent: {
    DEFAULT: "#06B6D4", // Cyan accent
    light: "#22D3EE", // Light cyan
  },

  // Text colors
  text: {
    primary: "#FFFFFF", // White
    secondary: "#E2E8F0", // Light gray
    muted: "#94A3B8", // Muted gray
    onPrimary: "#0F172A", // Dark text on primary background
  },

  // Background colors
  background: {
    DEFAULT: "#000000", // Black
    secondary: "#0F172A", // Dark navy
    card: "#1E293B", // Card background
  },
} as const;

/**
 * Helper function to get primary color with opacity
 */
export function primaryWithOpacity(opacity: number): string {
  return `rgba(${theme.primary.rgb}, ${opacity})`;
}

/**
 * Tailwind CSS color classes for easy use in components
 * Use these in className instead of hardcoded colors
 */
export const themeClasses = {
  primary: "text-[#2DD4BF]",
  primaryBg: "bg-[#2DD4BF]",
  primaryBorder: "border-[#2DD4BF]",
  primaryHover: "hover:bg-[#14B8A6]",
  primaryLight: "bg-[#5EEAD4]",

  secondary: "text-[#0F172A]",
  secondaryBg: "bg-[#0F172A]",

  accent: "text-[#06B6D4]",
  accentBg: "bg-[#06B6D4]",
} as const;
