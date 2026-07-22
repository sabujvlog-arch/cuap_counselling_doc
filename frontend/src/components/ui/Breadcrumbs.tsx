'use client';

import React from 'react';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbsProps {
  portalName: string;
  activeTabLabel: string;
}

export default function Breadcrumbs({ portalName, activeTabLabel }: BreadcrumbsProps) {
  return (
    <nav className="flex items-center gap-2 py-3 px-1 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest select-none">
      <span className="flex items-center gap-1 hover:text-slate-650 dark:hover:text-slate-350 transition-colors">
        <Home size={11} className="text-slate-400 dark:text-slate-500" />
        {portalName}
      </span>
      <ChevronRight size={10} className="text-slate-300 dark:text-slate-700" />
      <span className="text-blue-600 dark:text-blue-450">{activeTabLabel}</span>
    </nav>
  );
}
