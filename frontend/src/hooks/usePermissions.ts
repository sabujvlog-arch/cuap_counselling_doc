'use client';

import { useAuth } from '@/context/AuthContext';
import type { Permission } from '@/constants/permissions';
import type { UserRole } from '@/types';

/**
 * usePermissions — Permission checking hook
 *
 * Usage:
 *   const { can, canAny, role, isClinical } = usePermissions();
 *   if (can(PERMISSIONS.VIEW_SOAP_NOTES)) { ... }
 */
export function usePermissions() {
  const { can, canAny, canAll, role, permissions } = useAuth();

  return {
    can,
    canAny,
    canAll,
    role,
    permissions,

    // Convenience role checks
    isAdmin: role === 'admin' || role === 'super-admin',
    isSuperAdmin: role === 'super-admin',
    isProvider: role === 'provider' || role === 'clinician',
    isClinician: role === 'clinician',
    isDeptHead: role === 'dept-head',
    isStudent: role === 'student',
    isFrontDesk: role === 'front-desk',
    isTechnician: role === 'technician',

    // Clinical access check (never true for admin/front-desk/student/tech)
    hasClinicalAccess: ['provider', 'clinician', 'dept-head', 'super-admin'].includes(role ?? ''),

    // Check role membership
    hasRole: (roles: UserRole[]) => (role ? roles.includes(role) : false),
  };
}
