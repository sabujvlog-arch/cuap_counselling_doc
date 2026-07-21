'use client';

import React from 'react';
import { ChevronLeft, Pin, PinOff, LogOut, LucideIcon } from 'lucide-react';
import SidebarItem from './SidebarItem';

interface NavigationItem {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: string | number;
}

interface SidebarProps {
  navItems: NavigationItem[];
  activeTab: string;
  setActiveTab: (id: any) => void;
  onLogout: () => void;
  userName: string;
  userRoleLabel: string;
  userSubLabel?: string;

  // hook state overrides passed from parent to allow reactivity
  sidebarCollapsed: boolean;
  sidebarPinned: boolean;
  toggleCollapse: () => void;
  togglePin: () => void;
  handleMouseEnter: () => void;
  handleMouseLeave: () => void;
  handleMouseMove: () => void;
  isTabletOrMobile: boolean;
}

/**
 * Sidebar — Industrial-grade Collapsible Navigation System.
 * Notion/Linear style, featuring auto-collapse timers, hover triggers, lock pin status,
 * rotating edge toggles, keyboard focus navigation, and custom segment layouts.
 */
export default function Sidebar({
  navItems,
  activeTab,
  setActiveTab,
  onLogout,
  userName,
  userRoleLabel,
  userSubLabel,
  sidebarCollapsed,
  sidebarPinned,
  toggleCollapse,
  togglePin,
  handleMouseEnter,
  handleMouseLeave,
  handleMouseMove,
  isTabletOrMobile,
}: SidebarProps) {
  return (
    <>
      {/* Mobile Drawer Overlay Backdrop */}
      {!sidebarCollapsed && (
        <div
          onClick={toggleCollapse}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
        />
      )}

      <aside
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseMove={handleMouseMove}
        className={`shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-850 flex flex-col justify-between transition-all duration-300 ease-in-out z-50 select-none fixed inset-y-0 left-0 w-64 p-6 shadow-2xl lg:shadow-none lg:static lg:translate-x-0 ${
          sidebarCollapsed ? '-translate-x-full lg:w-16 lg:p-3' : 'translate-x-0 lg:w-64 lg:p-6'
        }`}
        aria-label="Sidebar navigation"
        aria-expanded={!sidebarCollapsed}
      >
        {/* ── 1. Edge Collapse Chevron Toggle (Desktop only) ── */}
        <button
          onClick={toggleCollapse}
          className="absolute top-1/2 -right-3 -translate-y-1/2 w-6 h-6 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-850 dark:hover:text-slate-200 flex items-center justify-center shadow-sm cursor-pointer z-50 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 hidden lg:flex"
          title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          aria-label={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          <ChevronLeft
            size={14}
            className={`transition-transform duration-300 ${sidebarCollapsed ? 'rotate-180' : ''}`}
          />
        </button>

        {/* ── 2. Header Area (Logo & Pinned Lock Button) ── */}
        <div>
          <div
            className={`flex items-center mb-8 justify-between ${sidebarCollapsed ? 'lg:flex-col lg:gap-4' : 'gap-3'}`}
          >
            <div
              className={`flex items-center ${sidebarCollapsed ? 'lg:flex-col lg:gap-2' : 'gap-3'}`}
            >
              <img
                src="/logo.png"
                className="w-10 h-10 object-contain shrink-0 rounded-full"
                alt="CUAP Logo"
              />
              <div className={`animate-fade-in truncate ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
                <h1 className="text-xs font-black leading-tight text-slate-800 dark:text-slate-200">
                  CUAP SWCC
                </h1>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                  {userRoleLabel}
                </p>
              </div>
            </div>

            {/* Pin/Unpin Mode Icon Switch (Desktop only) */}
            <div className={`hidden lg:block ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
              <button
                onClick={togglePin}
                className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                  sidebarPinned
                    ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-slate-800 dark:border-slate-700 dark:text-blue-400'
                    : 'border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                }`}
                title={
                  sidebarPinned
                    ? 'Sidebar pinned: Unpin to allow auto-collapse'
                    : 'Sidebar unpinned: Pin to lock expanded'
                }
                aria-label={sidebarPinned ? 'Unpin sidebar' : 'Pin sidebar'}
              >
                {sidebarPinned ? <Pin size={13} /> : <PinOff size={13} />}
              </button>
            </div>
          </div>

          {/* ── 3. Navigation Links ── */}
          <nav className="space-y-1">
            {navItems.map((item) => (
              <SidebarItem
                key={item.id}
                id={item.id}
                label={item.label}
                icon={item.icon}
                active={activeTab === item.id}
                collapsed={sidebarCollapsed}
                onClick={() => {
                  setActiveTab(item.id);
                  if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                    toggleCollapse();
                  }
                }}
                badge={item.badge}
              />
            ))}
          </nav>
        </div>

        {/* ── 4. Footer Area (User Details & Sign Out) ── */}
        <div className="pt-6 border-t border-slate-150 dark:border-slate-800">
          <div
            className={`flex items-center gap-3 mb-4 ${sidebarCollapsed ? 'lg:flex-col lg:items-center' : ''}`}
          >
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-slate-800 flex items-center justify-center text-blue-600 dark:text-blue-400 text-xs font-bold font-mono shrink-0">
              {userName.slice(0, 2).toUpperCase()}
            </div>
            <div
              className={`animate-fade-in truncate max-w-[140px] ${sidebarCollapsed ? 'lg:hidden' : ''}`}
            >
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                {userName}
              </p>
              {userSubLabel && (
                <p className="text-[10px] text-slate-450 dark:text-slate-400 font-mono truncate">
                  {userSubLabel}
                </p>
              )}
            </div>
          </div>

          {/* Sign Out Action Button */}
          <button
            onClick={onLogout}
            className={`w-full flex items-center gap-2 px-3 py-2 border border-slate-200 dark:border-slate-800 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20 text-xs font-bold rounded-xl transition cursor-pointer ${
              sidebarCollapsed ? 'lg:justify-center lg:px-1' : ''
            }`}
            title={sidebarCollapsed ? 'Sign Out' : undefined}
          >
            <LogOut size={13} className="shrink-0" />
            <span className={sidebarCollapsed ? 'lg:hidden' : ''}>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
