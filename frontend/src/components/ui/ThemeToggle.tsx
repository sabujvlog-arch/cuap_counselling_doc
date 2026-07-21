'use client';

import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

interface ThemeToggleProps {
  className?: string;
}

/**
 * ThemeToggle — Premium Segmented Sliding Pill Selector.
 * Beautifully shifts active state background segment between light/dark mode.
 */
export default function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const { mode, setTheme, isDark } = useTheme();

  return (
    <div
      className={`relative inline-flex h-9 w-[136px] items-center rounded-full bg-slate-100 dark:bg-slate-950 p-0.5 border border-slate-200 dark:border-slate-800 transition-colors duration-300 ease-in-out shrink-0 select-none ${className}`}
    >
      {/* Sliding Highlight Pill Backdrop */}
      <span
        className={`absolute top-0.5 bottom-0.5 left-0.5 w-[64px] rounded-full bg-white dark:bg-slate-800 shadow-sm transition-transform duration-300 ease-in-out pointer-events-none ${
          isDark ? 'translate-x-[64px]' : 'translate-x-0'
        }`}
      />

      {/* Light option segment */}
      <button
        type="button"
        onClick={() => setTheme('light')}
        className={`relative z-10 flex h-full flex-1 items-center justify-center gap-1.5 rounded-full text-[11px] font-bold transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 cursor-pointer ${
          !isDark ? 'text-slate-800 dark:text-white' : 'text-slate-400 hover:text-slate-350'
        }`}
        aria-label="Switch to Light mode"
      >
        <Sun size={14} className="shrink-0 text-amber-500" />
        <span>Light</span>
      </button>

      {/* Dark option segment */}
      <button
        type="button"
        onClick={() => setTheme('dark')}
        className={`relative z-10 flex h-full flex-1 items-center justify-center gap-1.5 rounded-full text-[11px] font-bold transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 cursor-pointer ${
          isDark ? 'text-slate-800 dark:text-white' : 'text-slate-500 hover:text-slate-450'
        }`}
        aria-label="Switch to Dark mode"
      >
        <Moon size={14} className="shrink-0 text-indigo-400 dark:text-indigo-300" />
        <span>Dark</span>
      </button>
    </div>
  );
}
