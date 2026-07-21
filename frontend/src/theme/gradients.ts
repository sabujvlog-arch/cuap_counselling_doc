/**
 * CUAP WCCMS — Gradient System
 *
 * All gradients used across the application, centralized here.
 * Components must import from this file — NO hardcoded gradients in components.
 */

export const gradients = {
  // ── Primary Gradients ──────────────────────────────────────────
  primary: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 50%, #60A5FA 100%)',
  primaryShort: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
  secondary: 'linear-gradient(135deg, #1D4ED8 0%, #2563EB 100%)',
  accent: 'linear-gradient(135deg, #0EA5E9 0%, #38BDF8 100%)',

  // ── Dark Mode Primary ──────────────────────────────────────────
  darkPrimary: 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)',
  darkSecondary: 'linear-gradient(135deg, #1D4ED8 0%, #3B82F6 100%)',

  // ── Semantic ───────────────────────────────────────────────────
  success: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
  warning: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)',
  danger: 'linear-gradient(135deg, #EF4444 0%, #F87171 100%)',
  info: 'linear-gradient(135deg, #06B6D4 0%, #38BDF8 100%)',

  // ── Portal Gradients ───────────────────────────────────────────
  student: 'linear-gradient(135deg, #2563EB 0%, #60A5FA 100%)',
  provider: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
  admin: 'linear-gradient(135deg, #0F172A 0%, #1E3A8A 100%)',

  // ── Backgrounds ────────────────────────────────────────────────
  pageLight: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 60%, #E2E8F0 100%)',
  pageDark: 'linear-gradient(135deg, #0F172A 0%, #1E293B 60%, #0F172A 100%)',

  // ── CSS var strings (used in Tailwind arbitrary values) ───────
  css: {
    primary: 'from-blue-600 via-blue-500 to-blue-400',
    secondary: 'from-blue-700 to-blue-600',
    success: 'from-green-500 to-green-600',
    warning: 'from-amber-500 to-amber-400',
    danger: 'from-red-500 to-red-400',
    info: 'from-cyan-500 to-sky-400',
    student: 'from-blue-600 to-blue-400',
    provider: 'from-blue-600 to-indigo-650',
    admin: 'from-slate-900 to-blue-950',
  },
} as const;
