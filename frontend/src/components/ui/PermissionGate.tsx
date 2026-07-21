'use client';

import React from 'react';
import type { Permission } from '@/constants/permissions';
import { useAuth } from '@/context/AuthContext';
import type { UserRole } from '@/types';

interface PermissionGateProps {
  /** Show children only if user has this permission */
  permission?: Permission;
  /** Show children only if user has ANY of these permissions */
  anyOf?: Permission[];
  /** Show children only if user has ALL of these permissions */
  allOf?: Permission[];
  /** Show children only if user has one of these roles */
  roles?: UserRole[];
  /** Fallback to render when permission is denied */
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * PermissionGate — Conditionally renders children based on RBAC permissions.
 *
 * This is the PRIMARY mechanism for portal separation.
 * Wrap any sensitive UI element in <PermissionGate> to ensure it only
 * renders for authorized roles — even if a bug bypasses server-side guards.
 *
 * Usage:
 *   <PermissionGate permission={PERMISSIONS.VIEW_SOAP_NOTES}>
 *     <SOAPNotesPanel />
 *   </PermissionGate>
 *
 *   <PermissionGate anyOf={[PERMISSIONS.VIEW_CLINICAL_SESSIONS, PERMISSIONS.MANAGE_STUDENTS]}>
 *     <SensitiveWidget />
 *   </PermissionGate>
 *
 *   <PermissionGate roles={['admin', 'super-admin']} fallback={<p>No access</p>}>
 *     <AdminPanel />
 *   </PermissionGate>
 */
export default function PermissionGate({
  permission,
  anyOf,
  allOf,
  roles,
  fallback = null,
  children,
}: PermissionGateProps) {
  const { can, canAny, canAll, role } = useAuth();

  let isAllowed = true;

  if (permission && !can(permission)) isAllowed = false;
  if (anyOf && !canAny(anyOf)) isAllowed = false;
  if (allOf && !canAll(allOf)) isAllowed = false;
  if (roles && role && !roles.includes(role)) isAllowed = false;
  if (!role) isAllowed = false;

  return isAllowed ? <>{children}</> : <>{fallback}</>;
}
