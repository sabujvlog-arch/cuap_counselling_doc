/**
 * CUAP WCCMS — Application Constants
 *
 * All static configuration values, labels, and settings.
 * Change here to update the entire application.
 */

import type { UserRole } from '@/types';
import { GraduationCap, Stethoscope, ShieldCheck } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────
// Application Identity
// ─────────────────────────────────────────────────────────────────
export const APP = {
  name: 'CUAP E-Campus',
  fullName: 'Central University of Andhra Pradesh E-Campus',
  university: 'Central University of Andhra Pradesh',
  system: 'WCCMS',
  systemFull: 'Wellness Counseling Centre Management System',
  copyright: `© ${new Date().getFullYear()} Central University of Andhra Pradesh`,
  tagline: 'Unified Digital Identity',
  version: '2.0.0',
} as const;

// ─────────────────────────────────────────────────────────────────
// Storage Keys
// ─────────────────────────────────────────────────────────────────
export const STORAGE_KEYS = {
  authToken: 'cuap_wccms_token',
  theme: 'cuap_wccms_theme',
} as const;

// ─────────────────────────────────────────────────────────────────
// User Roles
// ─────────────────────────────────────────────────────────────────
export const ROLES = {
  STUDENT: 'student' as UserRole,
  PROVIDER: 'provider' as UserRole,
  CLINICIAN: 'clinician' as UserRole,
  ADMIN: 'admin' as UserRole,
  SUPER_ADMIN: 'super-admin' as UserRole,
  FRONT_DESK: 'front-desk' as UserRole,
  TECHNICIAN: 'technician' as UserRole,
  DEPT_HEAD: 'dept-head' as UserRole,
} as const;

export const CLINICAL_ROLES: UserRole[] = [
  ROLES.PROVIDER,
  ROLES.CLINICIAN,
  ROLES.DEPT_HEAD,
  ROLES.SUPER_ADMIN,
];

export const ADMIN_ROLES: UserRole[] = [ROLES.ADMIN, ROLES.SUPER_ADMIN];

// ─────────────────────────────────────────────────────────────────
// Login Portals
// ─────────────────────────────────────────────────────────────────
export const PORTALS = [
  {
    id: 'student' as const,
    title: 'Student Portal',
    subtitle: 'CUAP E-Campus',
    description:
      'Access counselling appointments, EMR reports, prescriptions, assessments, secure messaging, and upcoming university services — all with one login.',
    icon: GraduationCap,
    gradientTw: 'from-sky-500 to-blue-600',
    gradientCss: 'linear-gradient(135deg, #0EA5E9 0%, #2563EB 100%)',
    accent: 'sky',
    badge: 'Students',
    placeholder: 'e.g. 23BEC04',
    loginLabel: 'Registration Number',
    passwordHint: 'Your CUAP E-Campus password',
  },
  {
    id: 'provider' as const,
    title: 'Counselor Portal',
    subtitle: 'Clinical EMR System',
    description:
      'Manage counselling schedules, write SOAP notes, access the full EMR, and review patient case histories with advanced clinical tools.',
    icon: Stethoscope,
    gradientTw: 'from-blue-600 to-indigo-650',
    gradientCss: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
    accent: 'blue',
    badge: 'Counselors & Doctors',
    placeholder: 'e.g. counselor.username',
    loginLabel: 'Staff Username',
    passwordHint: 'Your counselor account password',
  },
  {
    id: 'admin' as const,
    title: 'Admin Portal',
    subtitle: 'WCCMS Admin Console',
    description:
      'Manage counselors, student records, audit logs, system settings, analytics dashboards, and database operations.',
    icon: ShieldCheck,
    gradientTw: 'from-slate-900 to-blue-950',
    gradientCss: 'linear-gradient(135deg, #0F172A 0%, #1E3A8A 100%)',
    accent: 'slate',
    badge: 'System Administrators',
    placeholder: 'e.g. admin',
    loginLabel: 'Admin Username',
    passwordHint: 'Your administrator password',
  },
] as const;

export type PortalId = (typeof PORTALS)[number]['id'];

// ─────────────────────────────────────────────────────────────────
// Upcoming Services (Landing Page)
// ─────────────────────────────────────────────────────────────────
export const UPCOMING_SERVICES = [
  { label: 'Hostel Management' },
  { label: 'Mess Management' },
  { label: 'Library Portal' },
  { label: 'Academic Services' },
  { label: 'Support Tickets' },
  { label: 'Placement Portal' },
] as const;

// ─────────────────────────────────────────────────────────────────
// Assessment Types
// ─────────────────────────────────────────────────────────────────
export const ASSESSMENT_TYPES = [
  { value: 'PHQ-9', label: 'PHQ-9 (Depression)' },
  { value: 'GAD-7', label: 'GAD-7 (Anxiety)' },
  { value: 'DASS-21', label: 'DASS-21 (Depression/Anxiety/Stress)' },
  { value: 'BDI-II', label: 'BDI-II (Beck Depression Inventory)' },
  { value: 'GHQ-12', label: 'GHQ-12 (General Health)' },
  { value: 'C-SSRS', label: 'C-SSRS (Suicide Risk)' },
] as const;

// ─────────────────────────────────────────────────────────────────
// Document Categories
// ─────────────────────────────────────────────────────────────────
export const DOCUMENT_CATEGORIES = [
  { value: 'consent', label: 'Consent Form' },
  { value: 'report', label: 'Medical Report' },
  { value: 'prescription', label: 'Prescription' },
  { value: 'referral', label: 'Referral Letter' },
  { value: 'id', label: 'ID Document' },
  { value: 'other', label: 'Other' },
] as const;

// ─────────────────────────────────────────────────────────────────
// Appointment Statuses
// ─────────────────────────────────────────────────────────────────
export const APPOINTMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  completed: 'Completed',
  waitlisted: 'Waitlisted',
};

// ─────────────────────────────────────────────────────────────────
// Genders
// ─────────────────────────────────────────────────────────────────
export const GENDERS = ['Male', 'Female', 'Non-binary', 'Prefer not to say'] as const;

// ─────────────────────────────────────────────────────────────────
// Blood Groups
// ─────────────────────────────────────────────────────────────────
export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'] as const;

// ─────────────────────────────────────────────────────────────────
// Semesters
// ─────────────────────────────────────────────────────────────────
export const SEMESTERS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'] as const;

// ─────────────────────────────────────────────────────────────────
// Referral Sources
// ─────────────────────────────────────────────────────────────────
export const REFERRAL_SOURCES = [
  'Self-Referral',
  'Faculty Referral',
  'Peer Referral',
  "Dean's Office",
  'Online Portal',
  'Other',
] as const;

// ─────────────────────────────────────────────────────────────────
// Chatbot Initial Message
// ─────────────────────────────────────────────────────────────────
export const CHATBOT_WELCOME =
  "Hello! I'm your CUAP Wellness Assistant. Ask me about counselling slots, WCCMS, or mental health tips! 😊";

export const CHATBOT_QUICK_PROMPTS = [
  'How to book a slot?',
  'What is WCCMS?',
  'Exam stress tips',
] as const;
