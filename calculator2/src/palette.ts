/**
 * Hex mirrors of the CSS custom properties in styles/tokens.css, for the few
 * places (Stat's tint()/hexToRgb() in components/ui/shared.tsx) that need to do
 * arithmetic on the colour rather than just hand it to CSS. `var(--nlc-*)` works
 * fine as a plain CSS colour value everywhere else — only use these where a
 * component parses the string itself.
 */
export const PALETTE = {
  blue: "#0b5cab",
  blueDark: "#084a8c",
  good: "#059669",
  bad: "#dc2626",
  warn: "#d97706",
  purple: "#6a1b9a",
  teal: "#00695c",
} as const;
