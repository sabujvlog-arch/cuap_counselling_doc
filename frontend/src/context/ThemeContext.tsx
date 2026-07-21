'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ThemeMode, ThemeTokens } from '@/theme';
import { lightTheme, darkTheme } from '@/theme';

// ─────────────────────────────────────────────────────────────────
// Context types
// ─────────────────────────────────────────────────────────────────
interface ThemeContextValue {
  mode: ThemeMode;
  theme: ThemeTokens;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
  isDark: boolean;
}

// ─────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────
const ThemeContext = createContext<ThemeContextValue>({
  mode: 'light',
  theme: lightTheme,
  toggleTheme: () => {},
  setTheme: () => {},
  isDark: false,
});

// ─────────────────────────────────────────────────────────────────
// Storage key
// ─────────────────────────────────────────────────────────────────
const THEME_STORAGE_KEY = 'cuap_wccms_theme';

// ─────────────────────────────────────────────────────────────────
// Helper: apply CSS variables to :root
// ─────────────────────────────────────────────────────────────────
function applyCSSVariables(tokens: ThemeTokens): void {
  const root = document.documentElement;

  // Backgrounds
  root.style.setProperty('--bg', tokens.background);
  root.style.setProperty('--surface', tokens.surface);
  root.style.setProperty('--card', tokens.card);
  root.style.setProperty('--card-hover', tokens.cardHover);

  // Borders
  root.style.setProperty('--border', tokens.border);
  root.style.setProperty('--border-focus', tokens.borderFocus);

  // Text
  root.style.setProperty('--text', tokens.text);
  root.style.setProperty('--text-secondary', tokens.textSecondary);
  root.style.setProperty('--text-muted', tokens.textMuted);
  root.style.setProperty('--text-inverse', tokens.textInverse);

  // Primary
  root.style.setProperty('--primary', tokens.primary);
  root.style.setProperty('--primary-hover', tokens.primaryHover);
  root.style.setProperty('--primary-light', tokens.primaryLight);
  root.style.setProperty('--primary-text', tokens.primaryText);

  // Accent
  root.style.setProperty('--accent', tokens.accent);
  root.style.setProperty('--accent-hover', tokens.accentHover);

  // Interactive
  root.style.setProperty('--hover', tokens.hover);

  // Sidebar
  root.style.setProperty('--sidebar', tokens.sidebar);
  root.style.setProperty('--sidebar-border', tokens.sidebarBorder);
  root.style.setProperty('--sidebar-item', tokens.sidebarItem);
  root.style.setProperty('--sidebar-item-hover', tokens.sidebarItemHover);
  root.style.setProperty('--sidebar-item-active', tokens.sidebarItemActive);
  root.style.setProperty('--sidebar-active-text', tokens.sidebarActiveText);

  // Navbar
  root.style.setProperty('--navbar', tokens.navbar);
  root.style.setProperty('--navbar-border', tokens.navbarBorder);

  // Semantic
  root.style.setProperty('--success', tokens.success);
  root.style.setProperty('--success-bg', tokens.successBg);
  root.style.setProperty('--success-border', tokens.successBorder);
  root.style.setProperty('--success-text', tokens.successText);

  root.style.setProperty('--warning', tokens.warning);
  root.style.setProperty('--warning-bg', tokens.warningBg);
  root.style.setProperty('--warning-border', tokens.warningBorder);
  root.style.setProperty('--warning-text', tokens.warningText);

  root.style.setProperty('--danger', tokens.danger);
  root.style.setProperty('--danger-bg', tokens.dangerBg);
  root.style.setProperty('--danger-border', tokens.dangerBorder);
  root.style.setProperty('--danger-text', tokens.dangerText);

  root.style.setProperty('--info', tokens.info);
  root.style.setProperty('--info-bg', tokens.infoBg);
  root.style.setProperty('--info-border', tokens.infoBorder);
  root.style.setProperty('--info-text', tokens.infoText);

  // Input
  root.style.setProperty('--input-bg', tokens.inputBg);
  root.style.setProperty('--input-border', tokens.inputBorder);
  root.style.setProperty('--input-text', tokens.inputText);
  root.style.setProperty('--input-placeholder', tokens.inputPlaceholder);

  // Table
  root.style.setProperty('--table-header', tokens.tableHeader);
  root.style.setProperty('--table-row', tokens.tableRow);
  root.style.setProperty('--table-row-hover', tokens.tableRowHover);
  root.style.setProperty('--table-row-alt', tokens.tableRowAlt);
  root.style.setProperty('--table-border', tokens.tableBorder);

  // Chart
  root.style.setProperty('--chart-primary', tokens.chartPrimary);
  root.style.setProperty('--chart-secondary', tokens.chartSecondary);
  root.style.setProperty('--chart-grid', tokens.chartGrid);
  root.style.setProperty('--chart-text', tokens.chartText);

  // Tooltip
  root.style.setProperty('--tooltip-bg', tokens.tooltipBg);
  root.style.setProperty('--tooltip-text', tokens.tooltipText);

  // Scrollbar
  root.style.setProperty('--scrollbar-thumb', tokens.scrollbarThumb);
  root.style.setProperty('--scrollbar-hover', tokens.scrollbarHover);
}

// ─────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('light');

  const applyMode = useCallback((newMode: ThemeMode) => {
    const tokens = newMode === 'dark' ? darkTheme : lightTheme;
    setMode(newMode);
    localStorage.setItem(THEME_STORAGE_KEY, newMode);

    // Set data-theme attribute for CSS selectors
    document.documentElement.setAttribute('data-theme', newMode);
    // Also set class for Tailwind dark mode
    if (newMode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    applyCSSVariables(tokens);
  }, []);

  // On mount: detect system preference, then override with stored preference
  useEffect(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
    if (stored === 'light' || stored === 'dark') {
      applyMode(stored);
    } else {
      // Respect OS preference on first visit
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      applyMode(prefersDark ? 'dark' : 'light');
    }
  }, [applyMode]);

  const toggleTheme = useCallback(() => {
    applyMode(mode === 'light' ? 'dark' : 'light');
  }, [mode, applyMode]);

  const handleSetTheme = useCallback(
    (newMode: ThemeMode) => {
      applyMode(newMode);
    },
    [applyMode],
  );

  const theme = mode === 'dark' ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider
      value={{
        mode,
        theme,
        toggleTheme,
        setTheme: handleSetTheme,
        isDark: mode === 'dark',
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────
export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
