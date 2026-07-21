'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface SidebarItemProps {
  id: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
  badge?: string | number;
}

/**
 * SidebarItem — Custom accessible button for navigation items.
 * Handles label fading, collapsed centering, accessibility focus states, and tooltips.
 */
export default function SidebarItem({
  id,
  label,
  icon: Icon,
  active,
  collapsed,
  onClick,
  badge,
}: SidebarItemProps) {
  // Safe trigger for keyboard press
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div className="relative group/item w-full">
      <button
        onClick={onClick}
        onKeyDown={handleKeyDown}
        className={`w-full flex items-center rounded-xl text-sm font-bold transition-all duration-300 relative focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 cursor-pointer ${
          collapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-4 py-2.5'
        } ${
          active
            ? 'bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400'
            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/30 hover:text-slate-800 dark:hover:text-slate-200'
        }`}
        aria-label={label}
        aria-pressed={active}
      >
        {/* Left Indicator bar */}
        {active && (
          <span className="absolute left-0 top-2 bottom-2 w-1 bg-blue-600 dark:bg-blue-400 rounded-r" />
        )}

        <Icon
          size={18}
          className="shrink-0 transition-transform duration-300 group-hover/item:scale-105"
        />

        {/* Text Label - Fades out on collapse */}
        <span
          className={`truncate transition-all duration-300 font-sans tracking-wide ${
            collapsed
              ? 'opacity-0 max-w-0 -translate-x-2 pointer-events-none'
              : 'opacity-100 max-w-[200px] translate-x-0'
          }`}
        >
          {label}
        </span>

        {/* Optional Badge */}
        {badge && !collapsed && (
          <span className="ml-auto bg-blue-100 dark:bg-slate-800 text-blue-700 dark:text-blue-300 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
            {badge}
          </span>
        )}
      </button>

      {/* Modern Floating Hover Tooltip (Notion style, shown only when collapsed) */}
      {collapsed && (
        <div
          role="tooltip"
          className="absolute left-full ml-4 top-1/2 -translate-y-1/2 bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-[11px] px-2.5 py-1.5 rounded-lg shadow-xl font-bold font-sans tracking-wide opacity-0 translate-x-2 pointer-events-none group-hover/item:opacity-100 group-hover/item:translate-x-0 transition-all duration-200 ease-out z-[999] whitespace-nowrap"
        >
          {label}
          {badge && (
            <span className="ml-2 bg-blue-600 dark:bg-slate-100 text-white dark:text-slate-900 px-1 py-0.2 rounded font-black text-[9px]">
              {badge}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
