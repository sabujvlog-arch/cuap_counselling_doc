/**
 * CUAP WCCMS — Theme Index
 *
 * The main export for the theme system.
 * Import everything you need from '@/theme'.
 */

export { palette } from './colors';
export { gradients } from './gradients';
export { typography } from './typography';
export { spacing, borderRadius } from './spacing';
export { shadows } from './shadows';
export { lightTheme } from './lightTheme';
export { darkTheme } from './darkTheme';
export type { ThemeTokens } from './lightTheme';

/**
 * Theme mode type
 */
export type ThemeMode = 'light' | 'dark';

/**
 * Map of all themes — add new themes here when needed
 */
import { lightTheme } from './lightTheme';
import { darkTheme } from './darkTheme';

export const themes = {
  light: lightTheme,
  dark: darkTheme,
} as const;

/**
 * CSS variable name mapping
 * These correspond to the variables defined in globals.css
 */
export const CSS_VARS = {
  background: '--bg',
  surface: '--surface',
  card: '--card',
  cardHover: '--card-hover',
  border: '--border',
  borderFocus: '--border-focus',
  text: '--text',
  textSecondary: '--text-secondary',
  textMuted: '--text-muted',
  primary: '--primary',
  primaryHover: '--primary-hover',
  primaryLight: '--primary-light',
  accent: '--accent',
  hover: '--hover',
  sidebar: '--sidebar',
  sidebarBorder: '--sidebar-border',
  navbar: '--navbar',
  navbarBorder: '--navbar-border',
  success: '--success',
  successBg: '--success-bg',
  warning: '--warning',
  warningBg: '--warning-bg',
  danger: '--danger',
  dangerBg: '--danger-bg',
  info: '--info',
  infoBg: '--info-bg',
  inputBg: '--input-bg',
  inputBorder: '--input-border',
  tableHeader: '--table-header',
  tableRow: '--table-row',
  tableRowHover: '--table-row-hover',
  tableBorder: '--table-border',
  chartPrimary: '--chart-primary',
  chartGrid: '--chart-grid',
  chartText: '--chart-text',
  tooltipBg: '--tooltip-bg',
  scrollbarThumb: '--scrollbar-thumb',
} as const;
