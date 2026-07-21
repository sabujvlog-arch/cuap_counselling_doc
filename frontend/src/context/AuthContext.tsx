'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { api } from '@/lib/api';
import type { User, Session, StudentProfile, ProviderProfile, UserRole } from '@/types';
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getPermissionsForRole,
} from '@/constants/permissions';
import type { Permission } from '@/constants/permissions';

// ─────────────────────────────────────────────────────────────────
// Context Types
// ─────────────────────────────────────────────────────────────────
interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  user: User | null;
  role: UserRole | null;
  profile: StudentProfile | ProviderProfile | null;
  isAuthenticated: boolean;

  // Permission helpers
  can: (permission: Permission) => boolean;
  canAny: (permissions: Permission[]) => boolean;
  canAll: (permissions: Permission[]) => boolean;
  permissions: Permission[];

  // Auth actions
  login: (credentials: { username: string; password: string }) => Promise<LoginResult>;
  logout: () => void;
  refreshSession: () => Promise<void>;
}

export interface LoginResult {
  success: boolean;
  requires2FA: boolean;
  username?: string;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue>({
  session: null,
  loading: true,
  user: null,
  role: null,
  profile: null,
  isAuthenticated: false,
  can: () => false,
  canAny: () => false,
  canAll: () => false,
  permissions: [],
  login: async () => ({ success: false, requires2FA: false }),
  logout: () => {},
  refreshSession: async () => {},
});

// ─────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Inactivity / Auto-Logout state & refs
  const [showIdleWarning, setShowIdleWarning] = useState(false);
  const [idleCountdown, setIdleCountdown] = useState(60);
  const idleTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  const refreshSession = useCallback(async () => {
    const token = api.getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const data = await api.auth.me();
      setSession(data);
    } catch {
      api.clearToken();
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const login = useCallback(
    async (credentials: { username: string; password: string }): Promise<LoginResult> => {
      try {
        const res = await api.auth.login(credentials);
        if (res.requires2FA) {
          return { success: false, requires2FA: true, username: res.username };
        }
        const data = await api.auth.me();
        setSession(data);
        return { success: true, requires2FA: false };
      } catch (err: unknown) {
        const error = err instanceof Error ? err.message : 'Invalid credentials';
        return { success: false, requires2FA: false, error };
      }
    },
    [],
  );

  const logout = useCallback(() => {
    api.clearToken();
    setSession(null);
    setShowIdleWarning(false);
  }, []);

  // Idle Timer Reset logic
  const resetIdleTimer = useCallback(() => {
    if (showIdleWarning) return; // Don't reset from window movement if warning is open

    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);

    // 14 minutes of inactivity before showing the warning dialog (total 15 mins timeout)
    idleTimerRef.current = setTimeout(
      () => {
        setShowIdleWarning(true);
        setIdleCountdown(60);
      },
      14 * 60 * 1000,
    );
  }, [showIdleWarning]);

  // Keep working action button
  const handleKeepWorking = useCallback(() => {
    setShowIdleWarning(false);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);

    idleTimerRef.current = setTimeout(
      () => {
        setShowIdleWarning(true);
        setIdleCountdown(60);
      },
      14 * 60 * 1000,
    );
  }, []);

  // Track window activities
  useEffect(() => {
    if (!session) {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      setShowIdleWarning(false);
      return;
    }

    resetIdleTimer();

    const activityEvents = ['mousemove', 'keydown', 'mousedown', 'scroll', 'touchstart'];
    const handleActivity = () => {
      resetIdleTimer();
    };

    activityEvents.forEach((event) => {
      window.addEventListener(event, handleActivity);
    });

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [session, resetIdleTimer]);

  // Countdown timer decrement effect
  useEffect(() => {
    if (!showIdleWarning) {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      return;
    }

    countdownIntervalRef.current = setInterval(() => {
      setIdleCountdown((prev) => {
        if (prev <= 1) {
          if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
          logout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [showIdleWarning, logout]);

  const role = session?.user?.role ?? null;
  const permissions: Permission[] = role ? getPermissionsForRole(role) : [];

  const can = useCallback((p: Permission) => (role ? hasPermission(role, p) : false), [role]);
  const canAny = useCallback(
    (ps: Permission[]) => (role ? hasAnyPermission(role, ps) : false),
    [role],
  );
  const canAll = useCallback(
    (ps: Permission[]) => (role ? hasAllPermissions(role, ps) : false),
    [role],
  );

  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        user: session?.user ?? null,
        role,
        profile: session?.profile ?? null,
        isAuthenticated: !!session,
        can,
        canAny,
        canAll,
        permissions,
        login,
        logout,
        refreshSession,
      }}
    >
      {children}
      {showIdleWarning && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="idle-warning-title"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl max-w-sm w-full text-center">
            <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/20 text-amber-500 rounded-full flex items-center justify-center text-xl mx-auto mb-4">
              ⚠️
            </div>
            <h3
              id="idle-warning-title"
              className="text-base font-black text-slate-850 dark:text-white mb-2"
            >
              Security Inactivity Warning
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
              For patient confidentiality and system security, your session will expire in{' '}
              <span className="font-mono font-black text-amber-600 dark:text-amber-400 text-sm">
                {idleCountdown}
              </span>{' '}
              seconds due to inactivity.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={logout}
                className="flex-1 py-2.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-350 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Sign Out
              </button>
              <button
                type="button"
                onClick={handleKeepWorking}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition cursor-pointer"
              >
                Keep Working
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────
export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
