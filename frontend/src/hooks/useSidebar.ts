'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useMediaQuery } from './useMediaQuery';

/**
 * Custom hook to manage the state of an industrial-grade collapsible sidebar.
 * Includes inactivity timeouts, hover-expansion, pin modes, and localStorage caching.
 */
export function useSidebar() {
  const isTabletOrMobile = useMediaQuery('(max-width: 1023px)');

  // Collapse state: false = expanded, true = collapsed
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(true);

  // Pin state: true = locked (no auto-collapse/hover expansion), false = dynamic
  const [sidebarPinned, setSidebarPinned] = useState<boolean>(true);

  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Read initial preferences from localStorage on mount
  useEffect(() => {
    const savedCollapsed = localStorage.getItem('sidebar_collapsed');
    const savedPinned = localStorage.getItem('sidebar_pinned');

    if (isTabletOrMobile) {
      // Auto-collapse by default on smaller viewports
      setSidebarCollapsed(true);
      setSidebarPinned(false);
    } else {
      setSidebarCollapsed(savedCollapsed === null ? false : savedCollapsed === 'true');
      setSidebarPinned(savedPinned === null ? true : savedPinned === 'true');
    }
  }, [isTabletOrMobile]);

  // Write changes to localStorage when states update (desktop only)
  const persistCollapsed = useCallback(
    (collapsed: boolean) => {
      if (!isTabletOrMobile) {
        localStorage.setItem('sidebar_collapsed', String(collapsed));
      }
      setSidebarCollapsed(collapsed);
    },
    [isTabletOrMobile],
  );

  const persistPinned = useCallback(
    (pinned: boolean) => {
      if (!isTabletOrMobile) {
        localStorage.setItem('sidebar_pinned', String(pinned));
      }
      setSidebarPinned(pinned);
    },
    [isTabletOrMobile],
  );

  // Reset inactivity timer (5 seconds)
  const resetInactivityTimer = useCallback(() => {
    if (sidebarPinned || sidebarCollapsed || isTabletOrMobile) {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      return;
    }

    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);

    inactivityTimerRef.current = setTimeout(() => {
      // Auto-collapse due to inactivity
      setSidebarCollapsed(true);
    }, 5000); // 5 seconds inactivity limit
  }, [sidebarPinned, sidebarCollapsed, isTabletOrMobile]);

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, []);

  // Hover triggers (only if unpinned)
  const handleMouseEnter = useCallback(() => {
    if (!sidebarPinned && sidebarCollapsed && !isTabletOrMobile) {
      setSidebarCollapsed(false);
    }
    resetInactivityTimer();
  }, [sidebarPinned, sidebarCollapsed, isTabletOrMobile, resetInactivityTimer]);

  const handleMouseLeave = useCallback(() => {
    if (!sidebarPinned && !sidebarCollapsed && !isTabletOrMobile) {
      setSidebarCollapsed(true);
    }
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
  }, [sidebarPinned, sidebarCollapsed, isTabletOrMobile]);

  const handleMouseMove = useCallback(() => {
    resetInactivityTimer();
  }, [resetInactivityTimer]);

  // Manual toggle trigger (affects collapse state)
  const toggleCollapse = useCallback(() => {
    const nextState = !sidebarCollapsed;
    persistCollapsed(nextState);
    if (!nextState) {
      resetInactivityTimer();
    } else {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    }
  }, [sidebarCollapsed, persistCollapsed, resetInactivityTimer]);

  // Manual pin/unpin trigger
  const togglePin = useCallback(() => {
    const nextState = !sidebarPinned;
    persistPinned(nextState);
    if (nextState) {
      // If pinning, lock in expanded state and clear timers
      setSidebarCollapsed(false);
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    } else {
      // If unpinning, trigger the inactivity countdown
      resetInactivityTimer();
    }
  }, [sidebarPinned, persistPinned, resetInactivityTimer]);

  return {
    sidebarCollapsed,
    sidebarPinned,
    toggleCollapse,
    togglePin,
    handleMouseEnter,
    handleMouseLeave,
    handleMouseMove,
    isTabletOrMobile,
  };
}
