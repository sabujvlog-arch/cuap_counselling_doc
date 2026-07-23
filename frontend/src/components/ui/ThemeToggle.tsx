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
  const { setTheme, isDark } = useTheme();

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={`flex items-center justify-center h-9 w-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors duration-200 cursor-pointer shrink-0 ${className}`}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      {isDark ? (
        <Sun size={18} className="text-amber-500" />
      ) : (
        <Moon size={18} className="text-indigo-500" />
      )}
    </button>
  );
}
