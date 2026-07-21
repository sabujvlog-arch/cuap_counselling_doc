/**
 * CUAP WCCMS — Role-Based Access Control (RBAC)
 *
 * Centralized permission system for the entire application.
 * Add new roles or permissions HERE ONLY — no hardcoded checks in components.
 *
 * Architecture is designed to support future:
 * - JWT refresh tokens
 * - Fine-grained field-level access control
 * - Audit log triggers per permission
 * - Dynamic permission assignment from DB
 */

import type { UserRole } from '@/types';

// ─────────────────────────────────────────────────────────────────
// Permission Keys
// Every permission in the system is listed here.
// Components import these constants — never use raw strings.
// ─────────────────────────────────────────────────────────────────
export const PERMISSIONS = {
  // ── Admin Operations ─────────────────────────────────────────
  MANAGE_STUDENTS: 'admin:manage_students',
  MANAGE_PROVIDERS: 'admin:manage_providers',
  MANAGE_DEPARTMENTS: 'admin:manage_departments',
  MANAGE_USER_ACCOUNTS: 'admin:manage_user_accounts',
  MANAGE_ANNOUNCEMENTS: 'admin:manage_announcements',
  VIEW_AUDIT_LOGS: 'admin:view_audit_logs',
  VIEW_SYSTEM_HEALTH: 'admin:view_system_health',
  VIEW_ANALYTICS: 'admin:view_analytics',
  VIEW_OPD_REGISTER: 'admin:view_opd_register',
  EXPORT_REPORTS: 'admin:export_reports',
  BACKUP_RESTORE: 'admin:backup_restore',
  CONFIGURE_SETTINGS: 'admin:configure_settings',

  // ── Appointment Operations ────────────────────────────────────
  BOOK_APPOINTMENT: 'appointments:book',
  VIEW_OWN_APPOINTMENTS: 'appointments:view_own',
  VIEW_ALL_APPOINTMENTS: 'appointments:view_all',
  MANAGE_APPOINTMENTS: 'appointments:manage',
  APPROVE_APPOINTMENTS: 'appointments:approve',
  VERIFY_QR: 'appointments:verify_qr',

  // ── Clinical Operations (CONFIDENTIAL) ────────────────────────
  VIEW_CLINICAL_SESSIONS: 'clinical:view_sessions',
  WRITE_CLINICAL_SESSIONS: 'clinical:write_sessions',
  VIEW_SOAP_NOTES: 'clinical:view_soap',
  WRITE_SOAP_NOTES: 'clinical:write_soap',
  VIEW_MSE: 'clinical:view_mse',
  WRITE_MSE: 'clinical:write_mse',
  VIEW_CASE_FORMULATION: 'clinical:view_case_formulation',
  WRITE_CASE_FORMULATION: 'clinical:write_case_formulation',
  VIEW_CASE_HISTORY: 'clinical:view_case_history',
  WRITE_CASE_HISTORY: 'clinical:write_case_history',
  VIEW_PRESCRIPTIONS: 'clinical:view_prescriptions',
  WRITE_PRESCRIPTIONS: 'clinical:write_prescriptions',
  VIEW_RISK_DETAILS: 'clinical:view_risk_details', // detailed risk - provider only
  VIEW_RISK_CATEGORY: 'clinical:view_risk_category', // Low/Med/High label only - admin
  COSIGN_SESSIONS: 'clinical:cosign_sessions',
  VIEW_HIGH_RISK_SESSIONS: 'clinical:view_high_risk',
  GRANT_REPORT_ACCESS: 'clinical:grant_report_access',
  USE_AI_ASSIST: 'clinical:use_ai_assist',

  // ── Assessment Operations ─────────────────────────────────────
  SUBMIT_ASSESSMENT: 'assessments:submit',
  VIEW_OWN_ASSESSMENTS: 'assessments:view_own',
  VIEW_ALL_ASSESSMENTS: 'assessments:view_all',

  // ── Messaging ─────────────────────────────────────────────────
  SEND_MESSAGE: 'messages:send',
  VIEW_MESSAGES: 'messages:view',

  // ── Documents ────────────────────────────────────────────────
  UPLOAD_DOCUMENTS: 'documents:upload',
  VIEW_OWN_DOCUMENTS: 'documents:view_own',
  VIEW_ALL_DOCUMENTS: 'documents:view_all',
  DELETE_DOCUMENTS: 'documents:delete',

  // ── Test Orders (Technician) ──────────────────────────────────
  ORDER_TESTS: 'tests:order',
  VIEW_PENDING_TESTS: 'tests:view_pending',
  SUBMIT_TEST_RESULTS: 'tests:submit_results',
  VIEW_OWN_TESTS: 'tests:view_own',

  // ── Student Registration (Front Desk) ─────────────────────────
  REGISTER_STUDENT: 'frontdesk:register_student',
  VIEW_STUDENT_LIST: 'frontdesk:view_student_list',
  CHECK_IN_PATIENT: 'frontdesk:check_in',

  // ── Provider Self-Access ───────────────────────────────────────
  VIEW_OWN_SCHEDULE: 'provider:view_schedule',
  VIEW_OWN_PATIENTS: 'provider:view_patients',

  // ── Student Self-Access ───────────────────────────────────────
  VIEW_OWN_PROFILE: 'student:view_profile',
  VIEW_OWN_PRESCRIPTIONS: 'student:view_prescriptions',
  VIEW_ASSIGNED_PROVIDER: 'student:view_assigned_provider',
  ACCESS_AI_CHAT: 'student:ai_chat',
  VIEW_ACCESSIBLE_REPORTS: 'student:view_reports',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// ─────────────────────────────────────────────────────────────────
// Role → Permission Map
//
// IMPORTANT: Admin deliberately does NOT have clinical permissions.
// This enforces the privacy firewall between admin and clinical data.
// ─────────────────────────────────────────────────────────────────
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  // ── Super Admin ─────────────────────────────────────────────
  // Has all permissions including clinical oversight
  'super-admin': Object.values(PERMISSIONS) as Permission[],

  // ── Administrator ────────────────────────────────────────────
  // Full access — administrative operations AND complete clinical record visibility.
  // Admins can see: therapy notes, MSE, case formulations, CBT/DBT worksheets,
  // psychological reports, AI therapy conversations, counselor notes, etc.
  admin: [
    // Administrative
    PERMISSIONS.MANAGE_STUDENTS,
    PERMISSIONS.MANAGE_PROVIDERS,
    PERMISSIONS.MANAGE_DEPARTMENTS,
    PERMISSIONS.MANAGE_USER_ACCOUNTS,
    PERMISSIONS.MANAGE_ANNOUNCEMENTS,
    PERMISSIONS.VIEW_AUDIT_LOGS,
    PERMISSIONS.VIEW_SYSTEM_HEALTH,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.VIEW_OPD_REGISTER,
    PERMISSIONS.EXPORT_REPORTS,
    PERMISSIONS.BACKUP_RESTORE,
    PERMISSIONS.CONFIGURE_SETTINGS,
    // Appointments
    PERMISSIONS.VIEW_ALL_APPOINTMENTS,
    PERMISSIONS.MANAGE_APPOINTMENTS,
    PERMISSIONS.APPROVE_APPOINTMENTS,
    PERMISSIONS.VERIFY_QR,
    // Full clinical record access
    PERMISSIONS.VIEW_CLINICAL_SESSIONS,
    PERMISSIONS.VIEW_SOAP_NOTES,
    PERMISSIONS.VIEW_MSE,
    PERMISSIONS.VIEW_CASE_FORMULATION,
    PERMISSIONS.VIEW_CASE_HISTORY,
    PERMISSIONS.VIEW_PRESCRIPTIONS,
    PERMISSIONS.VIEW_RISK_DETAILS,
    PERMISSIONS.VIEW_RISK_CATEGORY,
    PERMISSIONS.VIEW_HIGH_RISK_SESSIONS,
    PERMISSIONS.VIEW_ALL_ASSESSMENTS,
    PERMISSIONS.USE_AI_ASSIST,
    // Documents & Tests
    PERMISSIONS.VIEW_ALL_DOCUMENTS,
    PERMISSIONS.DELETE_DOCUMENTS,
    PERMISSIONS.VIEW_PENDING_TESTS,
    // Student registration
    PERMISSIONS.REGISTER_STUDENT,
    PERMISSIONS.VIEW_STUDENT_LIST,
    PERMISSIONS.CHECK_IN_PATIENT,
    // Reports
    PERMISSIONS.GRANT_REPORT_ACCESS,
    PERMISSIONS.COSIGN_SESSIONS,
  ],

  // ── Provider / Psychologist / Counselor ─────────────────────
  // Full clinical workspace access
  provider: [
    PERMISSIONS.VIEW_OWN_APPOINTMENTS,
    PERMISSIONS.VIEW_ALL_APPOINTMENTS,
    PERMISSIONS.MANAGE_APPOINTMENTS,
    PERMISSIONS.APPROVE_APPOINTMENTS,
    PERMISSIONS.VERIFY_QR,
    PERMISSIONS.VIEW_CLINICAL_SESSIONS,
    PERMISSIONS.WRITE_CLINICAL_SESSIONS,
    PERMISSIONS.VIEW_SOAP_NOTES,
    PERMISSIONS.WRITE_SOAP_NOTES,
    PERMISSIONS.VIEW_MSE,
    PERMISSIONS.WRITE_MSE,
    PERMISSIONS.VIEW_CASE_FORMULATION,
    PERMISSIONS.WRITE_CASE_FORMULATION,
    PERMISSIONS.VIEW_CASE_HISTORY,
    PERMISSIONS.WRITE_CASE_HISTORY,
    PERMISSIONS.VIEW_PRESCRIPTIONS,
    PERMISSIONS.WRITE_PRESCRIPTIONS,
    PERMISSIONS.VIEW_RISK_DETAILS,
    PERMISSIONS.VIEW_RISK_CATEGORY,
    PERMISSIONS.GRANT_REPORT_ACCESS,
    PERMISSIONS.USE_AI_ASSIST,
    PERMISSIONS.VIEW_ALL_ASSESSMENTS,
    PERMISSIONS.SEND_MESSAGE,
    PERMISSIONS.VIEW_MESSAGES,
    PERMISSIONS.UPLOAD_DOCUMENTS,
    PERMISSIONS.VIEW_ALL_DOCUMENTS,
    PERMISSIONS.ORDER_TESTS,
    PERMISSIONS.VIEW_OWN_SCHEDULE,
    PERMISSIONS.VIEW_OWN_PATIENTS,
  ],

  // ── Clinician (alias for provider with same permissions) ─────
  clinician: [
    PERMISSIONS.VIEW_OWN_APPOINTMENTS,
    PERMISSIONS.VIEW_ALL_APPOINTMENTS,
    PERMISSIONS.MANAGE_APPOINTMENTS,
    PERMISSIONS.VIEW_CLINICAL_SESSIONS,
    PERMISSIONS.WRITE_CLINICAL_SESSIONS,
    PERMISSIONS.VIEW_SOAP_NOTES,
    PERMISSIONS.WRITE_SOAP_NOTES,
    PERMISSIONS.VIEW_MSE,
    PERMISSIONS.WRITE_MSE,
    PERMISSIONS.VIEW_CASE_FORMULATION,
    PERMISSIONS.WRITE_CASE_FORMULATION,
    PERMISSIONS.VIEW_CASE_HISTORY,
    PERMISSIONS.WRITE_CASE_HISTORY,
    PERMISSIONS.VIEW_PRESCRIPTIONS,
    PERMISSIONS.WRITE_PRESCRIPTIONS,
    PERMISSIONS.VIEW_RISK_DETAILS,
    PERMISSIONS.VIEW_RISK_CATEGORY,
    PERMISSIONS.GRANT_REPORT_ACCESS,
    PERMISSIONS.USE_AI_ASSIST,
    PERMISSIONS.VIEW_ALL_ASSESSMENTS,
    PERMISSIONS.SEND_MESSAGE,
    PERMISSIONS.VIEW_MESSAGES,
    PERMISSIONS.UPLOAD_DOCUMENTS,
    PERMISSIONS.VIEW_ALL_DOCUMENTS,
    PERMISSIONS.ORDER_TESTS,
    PERMISSIONS.VIEW_OWN_SCHEDULE,
    PERMISSIONS.VIEW_OWN_PATIENTS,
  ],

  // ── Department Head ──────────────────────────────────────────
  // Clinical + cosign + high-risk review
  'dept-head': [
    PERMISSIONS.VIEW_OWN_APPOINTMENTS,
    PERMISSIONS.VIEW_ALL_APPOINTMENTS,
    PERMISSIONS.MANAGE_APPOINTMENTS,
    PERMISSIONS.VIEW_CLINICAL_SESSIONS,
    PERMISSIONS.WRITE_CLINICAL_SESSIONS,
    PERMISSIONS.VIEW_SOAP_NOTES,
    PERMISSIONS.WRITE_SOAP_NOTES,
    PERMISSIONS.VIEW_MSE,
    PERMISSIONS.WRITE_MSE,
    PERMISSIONS.VIEW_CASE_FORMULATION,
    PERMISSIONS.WRITE_CASE_FORMULATION,
    PERMISSIONS.VIEW_CASE_HISTORY,
    PERMISSIONS.WRITE_CASE_HISTORY,
    PERMISSIONS.VIEW_PRESCRIPTIONS,
    PERMISSIONS.WRITE_PRESCRIPTIONS,
    PERMISSIONS.VIEW_RISK_DETAILS,
    PERMISSIONS.VIEW_RISK_CATEGORY,
    PERMISSIONS.COSIGN_SESSIONS,
    PERMISSIONS.VIEW_HIGH_RISK_SESSIONS,
    PERMISSIONS.GRANT_REPORT_ACCESS,
    PERMISSIONS.USE_AI_ASSIST,
    PERMISSIONS.VIEW_ALL_ASSESSMENTS,
    PERMISSIONS.SEND_MESSAGE,
    PERMISSIONS.VIEW_MESSAGES,
    PERMISSIONS.VIEW_ALL_DOCUMENTS,
    PERMISSIONS.ORDER_TESTS,
    PERMISSIONS.VIEW_OWN_SCHEDULE,
    PERMISSIONS.VIEW_OWN_PATIENTS,
    PERMISSIONS.VIEW_ANALYTICS,
  ],

  // ── Front Desk / Receptionist ────────────────────────────────
  // Registration + basic appointment ops, NO clinical access
  'front-desk': [
    PERMISSIONS.REGISTER_STUDENT,
    PERMISSIONS.VIEW_STUDENT_LIST,
    PERMISSIONS.CHECK_IN_PATIENT,
    PERMISSIONS.VIEW_ALL_APPOINTMENTS,
    PERMISSIONS.MANAGE_APPOINTMENTS,
    PERMISSIONS.APPROVE_APPOINTMENTS,
    PERMISSIONS.VERIFY_QR,
    PERMISSIONS.VIEW_RISK_CATEGORY,
    PERMISSIONS.SEND_MESSAGE,
    PERMISSIONS.VIEW_MESSAGES,
  ],

  // ── Technician ───────────────────────────────────────────────
  // Lab/test result management only
  technician: [
    PERMISSIONS.VIEW_PENDING_TESTS,
    PERMISSIONS.SUBMIT_TEST_RESULTS,
    PERMISSIONS.VIEW_ALL_DOCUMENTS,
    PERMISSIONS.UPLOAD_DOCUMENTS,
  ],

  // ── Student ──────────────────────────────────────────────────
  // Self-service only — own data only
  student: [
    PERMISSIONS.BOOK_APPOINTMENT,
    PERMISSIONS.VIEW_OWN_APPOINTMENTS,
    PERMISSIONS.SUBMIT_ASSESSMENT,
    PERMISSIONS.VIEW_OWN_ASSESSMENTS,
    PERMISSIONS.SEND_MESSAGE,
    PERMISSIONS.VIEW_MESSAGES,
    PERMISSIONS.UPLOAD_DOCUMENTS,
    PERMISSIONS.VIEW_OWN_DOCUMENTS,
    PERMISSIONS.VIEW_OWN_TESTS,
    PERMISSIONS.VIEW_OWN_PROFILE,
    PERMISSIONS.VIEW_OWN_PRESCRIPTIONS,
    PERMISSIONS.VIEW_ASSIGNED_PROVIDER,
    PERMISSIONS.ACCESS_AI_CHAT,
    PERMISSIONS.VIEW_ACCESSIBLE_REPORTS,
  ],
};

// ─────────────────────────────────────────────────────────────────
// Permission Checker
// ─────────────────────────────────────────────────────────────────

/**
 * Check if a role has a specific permission.
 * Use this in components, guards, and API middleware.
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Check if a role has ALL of the given permissions.
 */
export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

/**
 * Check if a role has ANY of the given permissions.
 */
export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

/**
 * Get all permissions for a role.
 */
export function getPermissionsForRole(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

// ─────────────────────────────────────────────────────────────────
// Portal → Allowed Roles
// ─────────────────────────────────────────────────────────────────
export const PORTAL_ROLES = {
  admin: ['admin', 'super-admin'] as UserRole[],
  provider: ['provider', 'clinician', 'dept-head'] as UserRole[],
  student: ['student'] as UserRole[],
  frontdesk: ['front-desk'] as UserRole[],
  tech: ['technician'] as UserRole[],
} as const;

// ─────────────────────────────────────────────────────────────────
// Clinical Write-Only Roles
//
// These roles can VIEW clinical data (including admin) but cannot
// WRITE clinical records. Front-desk, technician, and student
// are completely restricted from writing clinical notes.
// ─────────────────────────────────────────────────────────────────

/** Roles that can never write clinical records (SOAP, MSE, case notes, etc.) */
export const CLINICAL_WRITE_RESTRICTED_ROLES: UserRole[] = [
  'admin',
  'front-desk',
  'technician',
  'student',
];

/** Roles that have full read+write clinical access */
export const CLINICAL_FULL_ACCESS_ROLES: UserRole[] = [
  'super-admin',
  'provider',
  'clinician',
  'dept-head',
];

/**
 * Check if a role can write clinical data (SOAP notes, MSE, case formulation, etc.)
 * Admin can READ all clinical data but cannot WRITE clinical records.
 */
export function canWriteClinical(role: UserRole): boolean {
  return CLINICAL_FULL_ACCESS_ROLES.includes(role);
}

/**
 * Check if a role can read clinical data.
 * Admin + all clinical roles can read. Students and front-desk cannot.
 */
export function canReadClinical(role: UserRole): boolean {
  return !['student', 'front-desk', 'technician'].includes(role);
}
