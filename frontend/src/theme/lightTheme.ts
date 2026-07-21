import { palette } from './colors';

/**
 * CUAP WCCMS — Theme Token Interface
 *
 * Explicit interface using `string` for all color values.
 * Both lightTheme and darkTheme satisfy this interface.
 * This is the CORRECT approach — using `typeof lightTheme` would
 * create literal string types incompatible with dark mode values.
 */
export interface ThemeTokens {
  // Backgrounds
  background: string;
  surface: string;
  card: string;
  cardHover: string;
  // Borders
  border: string;
  borderFocus: string;
  // Text
  text: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  // Primary
  primary: string;
  primaryHover: string;
  primaryLight: string;
  primaryText: string;
  // Accent
  accent: string;
  accentHover: string;
  // Interactive
  hover: string;
  selected: string;
  selectedText: string;
  // Sidebar
  sidebar: string;
  sidebarBorder: string;
  sidebarItem: string;
  sidebarItemHover: string;
  sidebarItemActive: string;
  sidebarActiveText: string;
  // Navbar
  navbar: string;
  navbarBorder: string;
  // Semantic — Success
  success: string;
  successBg: string;
  successBorder: string;
  successText: string;
  // Semantic — Warning
  warning: string;
  warningBg: string;
  warningBorder: string;
  warningText: string;
  // Semantic — Danger
  danger: string;
  dangerBg: string;
  dangerBorder: string;
  dangerText: string;
  // Semantic — Info
  info: string;
  infoBg: string;
  infoBorder: string;
  infoText: string;
  // Input
  inputBg: string;
  inputBorder: string;
  inputText: string;
  inputPlaceholder: string;
  // Table
  tableHeader: string;
  tableRow: string;
  tableRowHover: string;
  tableRowAlt: string;
  tableBorder: string;
  // Chart
  chartPrimary: string;
  chartSecondary: string;
  chartGrid: string;
  chartText: string;
  // Tooltip
  tooltipBg: string;
  tooltipText: string;
  // Badge
  badgePrimary: { bg: string; text: string };
  badgeSuccess: { bg: string; text: string };
  badgeWarning: { bg: string; text: string };
  badgeDanger: { bg: string; text: string };
  badgeInfo: { bg: string; text: string };
  // Scrollbar
  scrollbarThumb: string;
  scrollbarHover: string;
  // Transition
  transition: string;
}

// ─────────────────────────────────────────────────────────────────
// Light Theme
// ─────────────────────────────────────────────────────────────────
export const lightTheme: ThemeTokens = {
  // Backgrounds
  background: palette.slate[50],
  surface: palette.slate[100],
  card: palette.white,
  cardHover: palette.slate[50],

  // Borders
  border: palette.slate[200],
  borderFocus: palette.blue[400],

  // Text
  text: palette.slate[900],
  textSecondary: palette.slate[500],
  textMuted: palette.slate[400],
  textInverse: palette.white,

  // Primary
  primary: palette.blue[600],
  primaryHover: palette.blue[700],
  primaryLight: palette.blue[100],
  primaryText: palette.blue[700],

  // Accent
  accent: palette.sky[500],
  accentHover: palette.sky[600],

  // Interactive
  hover: palette.blue[100],
  selected: palette.blue[600],
  selectedText: palette.white,

  // Sidebar
  sidebar: palette.white,
  sidebarBorder: palette.slate[200],
  sidebarItem: palette.slate[500],
  sidebarItemHover: palette.blue[100],
  sidebarItemActive: palette.blue[600],
  sidebarActiveText: palette.white,

  // Navbar
  navbar: 'rgba(255,255,255,0.85)',
  navbarBorder: palette.slate[200],

  // Success
  success: palette.green[500],
  successBg: '#F0FDF4',
  successBorder: '#BBF7D0',
  successText: palette.green[700],

  // Warning
  warning: palette.amber[500],
  warningBg: '#FFFBEB',
  warningBorder: '#FDE68A',
  warningText: palette.amber[600],

  // Danger
  danger: palette.red[500],
  dangerBg: '#FEF2F2',
  dangerBorder: '#FECACA',
  dangerText: palette.red[700],

  // Info
  info: palette.cyan[500],
  infoBg: '#ECFEFF',
  infoBorder: '#A5F3FC',
  infoText: palette.cyan[600],

  // Input
  inputBg: palette.slate[50],
  inputBorder: palette.slate[200],
  inputText: palette.slate[900],
  inputPlaceholder: palette.slate[400],

  // Table
  tableHeader: palette.slate[50],
  tableRow: palette.white,
  tableRowHover: '#EFF6FF',
  tableRowAlt: palette.slate[50],
  tableBorder: palette.slate[200],

  // Chart
  chartPrimary: palette.blue[500],
  chartSecondary: palette.blue[300],
  chartGrid: palette.slate[200],
  chartText: palette.slate[500],

  // Tooltip
  tooltipBg: palette.slate[900],
  tooltipText: palette.white,

  // Badge
  badgePrimary: { bg: palette.blue[100], text: palette.blue[700] },
  badgeSuccess: { bg: '#DCFCE7', text: palette.green[700] },
  badgeWarning: { bg: '#FEF3C7', text: palette.amber[600] },
  badgeDanger: { bg: '#FEE2E2', text: palette.red[700] },
  badgeInfo: { bg: '#CFFAFE', text: palette.cyan[600] },

  // Scrollbar
  scrollbarThumb: 'rgba(148, 163, 184, 0.4)',
  scrollbarHover: 'rgba(148, 163, 184, 0.7)',

  // Transition
  transition: 'all 0.25s ease',
};
