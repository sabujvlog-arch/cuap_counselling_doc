/**
 * CUAP WCCMS — Central Color Palette
 *
 * This is the SINGLE SOURCE OF TRUTH for all colors in the application.
 * Every theme, component, and gradient must reference values from here.
 * To change the application's appearance, edit this file ONLY.
 */

export const palette = {
  // ── Blue Scale (Primary Brand) ──────────────────────────────────
  blue: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6',
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
    950: '#172554',
  },

  // ── Sky Scale (Accent) ──────────────────────────────────────────
  sky: {
    300: '#7DD3FC',
    400: '#38BDF8',
    500: '#0EA5E9',
    600: '#0284C7',
  },

  // ── Slate Scale (Neutrals) ──────────────────────────────────────
  slate: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    850: '#172033',
    900: '#0F172A',
    950: '#020617',
  },

  // ── Semantic Colors ─────────────────────────────────────────────
  green: {
    400: '#4ADE80',
    500: '#22C55E',
    600: '#16A34A',
    700: '#15803D',
  },
  amber: {
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706',
  },
  red: {
    400: '#F87171',
    500: '#EF4444',
    600: '#DC2626',
    700: '#B91C1C',
  },
  cyan: {
    400: '#22D3EE',
    500: '#06B6D4',
    600: '#0891B2',
  },
  violet: {
    500: '#8B5CF6',
    600: '#7C3AED',
  },
  emerald: {
    400: '#34D399',
    500: '#10B981',
    600: '#059669',
  },

  // ── Base ────────────────────────────────────────────────────────
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;
