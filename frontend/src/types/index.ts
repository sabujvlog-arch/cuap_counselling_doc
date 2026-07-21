/**
 * CUAP WCCMS — Shared TypeScript Types
 *
 * Central type definitions for the entire frontend.
 * All components should import types from here — never use `any`.
 */

// ─────────────────────────────────────────────────────────────────
// User & Auth
// ─────────────────────────────────────────────────────────────────
export type UserRole =
  | 'student'
  | 'provider'
  | 'clinician'
  | 'admin'
  | 'super-admin'
  | 'front-desk'
  | 'technician'
  | 'dept-head';

export interface User {
  id: number;
  username: string;
  role: UserRole;
  phone?: string;
  email?: string;
}

export interface StudentProfile {
  id: number;
  user_id: number;
  registration_number: string;
  name: string;
  age: number;
  gender: string;
  dob: string;
  department: string;
  semester: string;
  phone: string;
  email: string;
  hostel_scholar: string;
  emergency_contact: string;
  emergency_phone: string;
  blood_group: string;
  address: string;
  informed_consent_signed: boolean;
  consent_date?: string;
  created_at: string;
}

export interface ProviderProfile {
  id: number;
  user_id: number;
  name: string;
  employee_id: string;
  department: string;
  qualification: string;
  specialization: string;
  photo_url?: string;
  signature_url?: string;
  phone?: string;
  email?: string;
}

export interface Session {
  user: User;
  profile: StudentProfile | ProviderProfile | null;
}

// ─────────────────────────────────────────────────────────────────
// Appointments
// ─────────────────────────────────────────────────────────────────
export type AppointmentStatus =
  'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed' | 'waitlisted';

export interface Appointment {
  id: number;
  student_id: number;
  provider_id: number;
  slot_date: string;
  slot_time: string;
  status: AppointmentStatus;
  reason: string;
  qr_code?: string;
  waitlist_position: number;
  created_at: string;
  student_name?: string;
  provider_name?: string;
}

// ─────────────────────────────────────────────────────────────────
// Clinical
// ─────────────────────────────────────────────────────────────────
export type RiskLevel = 'low' | 'medium' | 'high' | 'severe';

export interface ClinicalSession {
  id: number;
  appointment_id?: number;
  student_id: number;
  provider_id: number;
  session_date: string;
  presenting_complaint: string;
  history: string;
  mse: string;
  diagnosis: string;
  case_formulation: string;
  risk_assessment: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  version: number;
  created_at: string;
}

export interface Prescription {
  id: number;
  session_id: number;
  student_id: number;
  provider_id: number;
  prescription_date: string;
  diagnosis: string;
  advice?: string;
  lifestyle_recommendations?: string;
  follow_up_date?: string;
  items?: PrescriptionItem[];
}

export interface PrescriptionItem {
  id: number;
  prescription_id: number;
  medicine_name: string;
  dose: string;
  frequency: string;
  duration: string;
}

// ─────────────────────────────────────────────────────────────────
// Assessments
// ─────────────────────────────────────────────────────────────────
export type AssessmentType = 'PHQ-9' | 'GAD-7' | 'DASS-21' | 'BDI-II' | 'GHQ-12' | 'C-SSRS';

export interface Assessment {
  id: number;
  student_id: number;
  provider_id?: number;
  type: AssessmentType;
  assessment_date: string;
  scores: Record<string, number>;
  report: string;
  created_at: string;
}

// ─────────────────────────────────────────────────────────────────
// Messaging
// ─────────────────────────────────────────────────────────────────
export interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  attachment_url?: string;
  read_at?: string;
  created_at: string;
}

export interface Contact {
  id: number;
  username: string;
  role: UserRole;
  name?: string;
}

// ─────────────────────────────────────────────────────────────────
// Documents
// ─────────────────────────────────────────────────────────────────
export interface Document {
  id: number;
  student_id: number;
  category: string;
  file_name: string;
  file_url: string;
  uploaded_by: number;
  version: number;
  created_at: string;
}

// ─────────────────────────────────────────────────────────────────
// Test Orders
// ─────────────────────────────────────────────────────────────────
export type TestStatus = 'pending' | 'completed' | 'cancelled';

export interface TestOrder {
  id: number;
  student_id: number;
  provider_id: number;
  test_name: string;
  category: string;
  status: TestStatus;
  results?: string;
  technician_id?: number;
  report?: string;
  created_at: string;
  student_name?: string;
}

// ─────────────────────────────────────────────────────────────────
// Analytics
// ─────────────────────────────────────────────────────────────────
export interface AnalyticsData {
  totalStudents: number;
  totalAppointments: number;
  completedSessions: number;
  pendingAppointments: number;
  totalProviders: number;
  assessmentsThisMonth: number;
}

// ─────────────────────────────────────────────────────────────────
// Chat
// ─────────────────────────────────────────────────────────────────
export interface ChatMessage {
  sender: 'user' | 'assistant' | 'ai';
  text: string;
}

// ─────────────────────────────────────────────────────────────────
// UI Helpers
// ─────────────────────────────────────────────────────────────────
export interface SelectOption {
  value: string;
  label: string;
}

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
}
