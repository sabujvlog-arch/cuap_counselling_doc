import { palette } from './colors';
import type { ThemeTokens } from './lightTheme';

/**
 * CUAP WCCMS — Dark Theme
 *
 * Professionally designed dark mode — NOT a simple color inversion.
 * Uses slate-based backgrounds with carefully chosen contrast ratios (WCAG AA).
 * Typed as ThemeTokens (string interface) — no literal type conflicts.
 */
export const darkTheme: ThemeTokens = {
  // Backgrounds
  background: palette.slate[900], // #0F172A
  surface: palette.slate[800], // #1E293B
  card: palette.slate[800], // #1E293B
  cardHover: palette.slate[700], // #334155

  // Borders
  border: palette.slate[700], // #334155
  borderFocus: palette.blue[400], // #60A5FA

  // Text
  text: palette.slate[50], // #F8FAFC
  textSecondary: palette.slate[300], // #CBD5E1
  textMuted: palette.slate[400], // #94A3B8
  textInverse: palette.slate[900], // #0F172A

  // Primary
  primary: palette.blue[500], // #3B82F6
  primaryHover: palette.blue[400], // #60A5FA
  primaryLight: 'rgba(59,130,246,0.15)',
  primaryText: palette.blue[400], // #60A5FA

  // Accent
  accent: palette.sky[400], // #38BDF8
  accentHover: palette.sky[300], // #7DD3FC

  // Interactive
  hover: palette.slate[700], // #334155
  selected: palette.blue[600], // #2563EB
  selectedText: palette.white,

  // Sidebar
  sidebar: palette.slate[900], // #0F172A
  sidebarBorder: palette.slate[700], // #334155
  sidebarItem: palette.slate[400], // #94A3B8
  sidebarItemHover: palette.slate[700], // #334155
  sidebarItemActive: palette.blue[600], // #2563EB
  sidebarActiveText: palette.white,

  // Navbar
  navbar: 'rgba(15,23,42,0.90)',
  navbarBorder: palette.slate[700], // #334155

  // Success
  success: palette.green[400], // #4ADE80
  successBg: 'rgba(34,197,94,0.12)',
  successBorder: 'rgba(34,197,94,0.25)',
  successText: palette.green[400],

  // Warning
  warning: palette.amber[400], // #FBBF24
  warningBg: 'rgba(245,158,11,0.12)',
  warningBorder: 'rgba(245,158,11,0.25)',
  warningText: palette.amber[400],

  // Danger
  danger: palette.red[400], // #F87171
  dangerBg: 'rgba(239,68,68,0.12)',
  dangerBorder: 'rgba(239,68,68,0.25)',
  dangerText: palette.red[400],

  // Info
  info: palette.cyan[400], // #22D3EE
  infoBg: 'rgba(6,182,212,0.12)',
  infoBorder: 'rgba(6,182,212,0.25)',
  infoText: palette.cyan[400],

  // Input
  inputBg: palette.slate[800], // #1E293B
  inputBorder: palette.slate[700], // #334155
  inputText: palette.slate[50], // #F8FAFC
  inputPlaceholder: palette.slate[500], // #64748B

  // Table
  tableHeader: palette.slate[800], // #1E293B
  tableRow: palette.slate[800], // #1E293B
  tableRowHover: palette.slate[700], // #334155
  tableRowAlt: 'rgba(30,41,59,0.5)',
  tableBorder: palette.slate[700], // #334155

  // Chart
  chartPrimary: palette.blue[400], // #60A5FA
  chartSecondary: palette.blue[300], // #93C5FD
  chartGrid: palette.slate[700], // #334155
  chartText: palette.slate[400], // #94A3B8

  // Tooltip
  tooltipBg: palette.slate[700], // #334155
  tooltipText: palette.slate[50], // #F8FAFC

  // Badge
  badgePrimary: { bg: 'rgba(59,130,246,0.2)', text: palette.blue[400] },
  badgeSuccess: { bg: 'rgba(34,197,94,0.15)', text: palette.green[400] },
  badgeWarning: { bg: 'rgba(245,158,11,0.15)', text: palette.amber[400] },
  badgeDanger: { bg: 'rgba(239,68,68,0.15)', text: palette.red[400] },
  badgeInfo: { bg: 'rgba(6,182,212,0.15)', text: palette.cyan[400] },

  // Scrollbar
  scrollbarThumb: 'rgba(51, 65, 85, 0.8)',
  scrollbarHover: 'rgba(71, 85, 105, 0.9)',

  // Transition
  transition: 'all 0.25s ease',
};
