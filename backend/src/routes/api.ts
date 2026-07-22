import { Router } from 'express';
import { authenticateToken, requireRoles } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { loginSchema, changePasswordSchema, saveSessionSchema } from '../utils/schemas';
import { performanceMetrics } from '../middleware/monitor';

// Controller Imports
import {
  login,
  verify2FA,
  getMe,
  getPermissions,
  changePassword,
  createProvider,
  createStudent,
  forgotPassword,
  resetPassword,
  getNotifications,
  markNotificationsRead,
} from '../controllers/authController';

import {
  bookAppointment,
  getAppointments,
  updateAppointmentStatus,
  getAvailableSlots,
  verifyAppointmentQR,
  getProviders,
  getCounselorSettings,
  updateCounselorSettings,
  bookOnBehalf,
  registerEmergency,
  registerSpot,
  scheduleFollowUp,
} from '../controllers/appointmentController';

import {
  saveSession,
  getSession,
  getSessionVersions,
  getStudentEMR,
  getAllAssessments,
  saveMSELog,
  getMSELogs,
  saveCaseHistory,
  getCaseHistories,
  getMSEPrintLayout,
  getCaseHistoryPrintLayout,
  createPrescription,
  getPrescription,
  getPrescriptionPrintLayout,
  orderTest,
  getPendingTests,
  submitTestResults,
  getStudentTests,
  getCompiledClientReport,
  cosignSession,
  getHighRiskSessions,
  // Phase 3 — Report Access Control
  grantReportAccess,
  revokeReportAccess,
  getStudentAccessibleReports,
  // Phase 4 — UniMind AI
  aiClinicalSuggestions,
  aiDraftToReport,
  // Phase 5 — Session Drafts
  saveSessionDraft,
  getSessionDraft,
  toggleReportVisibility,
  getGeneratedReports,
} from '../controllers/clinicalController';

import {
  sendMessage,
  getMessages,
  getConversations,
  markAsRead,
  getAvailableContacts,
} from '../controllers/messageController';

import {
  uploadDocument,
  getDocuments,
  downloadDocument,
  deleteDocument,
  submitConsent,
} from '../controllers/documentController';

import { toggleAssessments } from '../controllers/studentController';

import {
  submitAssessment,
  getAssessments,
  getAssessmentDetails,
  downloadAssessmentPDF,
} from '../controllers/assessmentController';

import {
  getAnalytics,
  getOPDRegister,
  exportOPDRegisterCSV,
  getAuditLogs,
  backupDatabase,
  restoreDatabase,
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  listBackups,
  deleteBackup,
  downloadBackup,
  sanitizeDatabase,
  getAdminStudents,
  updateAdminStudent,
  deleteAdminStudent,
} from '../controllers/adminController';

import { aiAssist } from '../controllers/aiController';
import { publicChat, studentChat } from '../controllers/publicChatController';
import { createRateLimiter } from '../middleware/rateLimiter';

// Rate Limiter Configurations
const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: 'Too many login attempts from this IP, please try again after 15 minutes.',
});

const chatbotRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: 'Too many chat requests from this IP, please wait a minute.',
});

const quizRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: 'Too many assessment submissions. Maximum 5 submissions per hour are allowed.',
});

const router = Router();

// ==========================================
// Authentication Routes
// ==========================================
router.post('/auth/login', authRateLimiter, validateRequest(loginSchema), login);
router.post('/auth/verify-2fa', verify2FA);
router.post('/public/chat', chatbotRateLimiter, publicChat);
router.post('/student/chat', authenticateToken, requireRoles(['student']), studentChat);
router.get('/auth/me', authenticateToken, getMe);
router.get('/auth/permissions', authenticateToken, getPermissions);
router.post(
  '/auth/change-password',
  authenticateToken,
  validateRequest(changePasswordSchema),
  changePassword,
);
router.post('/auth/forgot-password', authRateLimiter, forgotPassword);
router.post('/auth/reset-password', authRateLimiter, resetPassword);
router.get('/notifications', authenticateToken, getNotifications);
router.post('/notifications/read', authenticateToken, markNotificationsRead);

// Provider and Student registrations (Admin & Front-desk)
router.post(
  '/admin/providers',
  authenticateToken,
  requireRoles(['admin', 'super-admin']),
  createProvider,
);
router.post(
  '/admin/students',
  authenticateToken,
  requireRoles(['admin', 'front-desk', 'super-admin']),
  createStudent,
);
router.get(
  '/admin/students',
  authenticateToken,
  requireRoles(['admin', 'front-desk', 'super-admin']),
  getAdminStudents,
);
router.put(
  '/admin/students/:id',
  authenticateToken,
  requireRoles(['admin', 'front-desk', 'super-admin']),
  updateAdminStudent,
);
router.delete(
  '/admin/students/:id',
  authenticateToken,
  requireRoles(['admin', 'super-admin']),
  deleteAdminStudent,
);

// ==========================================
// Provider List (for student booking)
// ==========================================
router.get('/providers', authenticateToken, getProviders);

// ==========================================
// Appointment Routes
// ==========================================
router.post('/appointments', authenticateToken, bookAppointment);
router.post('/appointments/book-on-behalf', authenticateToken, bookOnBehalf);
router.post('/appointments/emergency', authenticateToken, registerEmergency);
router.post('/appointments/spot', authenticateToken, registerSpot);
router.post('/appointments/follow-up', authenticateToken, scheduleFollowUp);
router.get('/appointments', authenticateToken, getAppointments);
router.patch('/appointments/:id/status', authenticateToken, updateAppointmentStatus);
router.get('/appointments/available-slots', authenticateToken, getAvailableSlots);
router.get('/counselor/settings', authenticateToken, getCounselorSettings);
router.post('/counselor/settings', authenticateToken, updateCounselorSettings);
router.post(
  '/appointments/verify-qr',
  authenticateToken,
  requireRoles(['admin', 'provider']),
  verifyAppointmentQR,
);

// ==========================================
// Clinical EMR & Prescription Routes
// ==========================================
router.post(
  '/clinical/sessions',
  authenticateToken,
  requireRoles(['provider', 'clinician', 'dept-head', 'super-admin']),
  validateRequest(saveSessionSchema),
  saveSession,
);
router.get('/clinical/sessions/:id', authenticateToken, getSession);
router.get(
  '/clinical/sessions/:id/versions',
  authenticateToken,
  requireRoles(['provider', 'clinician', 'dept-head', 'super-admin']),
  getSessionVersions,
);
router.get('/clinical/emr/student/:studentId', authenticateToken, getStudentEMR);
router.get('/clinical/generated-reports', authenticateToken, getGeneratedReports);
router.post('/clinical/reports/:type/:id/release', authenticateToken, toggleReportVisibility);
router.get(
  '/clinical/assessments',
  authenticateToken,
  requireRoles(['admin', 'provider', 'dept-head', 'super-admin']),
  getAllAssessments,
);
router.post(
  '/clinical/ai-assist',
  authenticateToken,
  requireRoles(['provider', 'clinician', 'dept-head', 'super-admin']),
  aiAssist,
);
router.post(
  '/clinical/mse',
  authenticateToken,
  requireRoles(['provider', 'clinician', 'dept-head', 'super-admin']),
  saveMSELog,
);
router.get('/clinical/mse/student/:studentId', authenticateToken, getMSELogs);
router.get(
  '/clinical/mse/:id/print',
  authenticateToken,
  requireRoles(['provider', 'dept-head', 'admin', 'super-admin']),
  getMSEPrintLayout,
);

router.post(
  '/clinical/case-history',
  authenticateToken,
  requireRoles(['provider', 'clinician', 'dept-head', 'super-admin']),
  saveCaseHistory,
);
router.get('/clinical/case-history/student/:studentId', authenticateToken, getCaseHistories);
router.get(
  '/clinical/case-history/:id/print',
  authenticateToken,
  requireRoles(['provider', 'dept-head', 'admin', 'super-admin']),
  getCaseHistoryPrintLayout,
);

router.post(
  '/clinical/prescriptions',
  authenticateToken,
  requireRoles(['provider', 'clinician', 'dept-head', 'super-admin']),
  createPrescription,
);
router.get('/clinical/prescriptions/:id', authenticateToken, getPrescription);
// Secure print route, prints individual prescriptions for staff and authorized students
router.get(
  '/clinical/prescriptions/:id/print',
  authenticateToken,
  requireRoles(['provider', 'dept-head', 'admin', 'super-admin', 'student']),
  getPrescriptionPrintLayout,
);

// Investigations/Tests and Compiled Report Routes
router.post(
  '/clinical/tests',
  authenticateToken,
  requireRoles(['provider', 'clinician', 'dept-head', 'super-admin']),
  orderTest,
);
router.get(
  '/clinical/tests/pending',
  authenticateToken,
  requireRoles(['technician', 'admin', 'super-admin']),
  getPendingTests,
);
router.post(
  '/clinical/tests/:id/results',
  authenticateToken,
  requireRoles(['technician', 'admin', 'super-admin']),
  submitTestResults,
);
router.get('/clinical/tests/student/:studentId', authenticateToken, getStudentTests);
router.get(
  '/clinical/sessions/:id/compiled-report',
  authenticateToken,
  requireRoles(['provider', 'dept-head', 'admin', 'super-admin']),
  getCompiledClientReport,
);
router.post(
  '/clinical/sessions/:id/cosign',
  authenticateToken,
  requireRoles(['dept-head', 'super-admin']),
  cosignSession,
);
router.get(
  '/clinical/sessions/high-risk/pending',
  authenticateToken,
  requireRoles(['dept-head', 'admin', 'super-admin']),
  getHighRiskSessions,
);

// ==========================================
// Phase 3 — Report Access Control
// ==========================================
router.post(
  '/clinical/sessions/:id/grant-access',
  authenticateToken,
  requireRoles(['provider', 'clinician', 'dept-head', 'super-admin']),
  grantReportAccess,
);
router.post(
  '/clinical/sessions/:id/revoke-access',
  authenticateToken,
  requireRoles(['provider', 'clinician', 'dept-head', 'super-admin']),
  revokeReportAccess,
);
router.get(
  '/student/my-reports',
  authenticateToken,
  requireRoles(['student']),
  getStudentAccessibleReports,
);

// ==========================================
// Phase 4 — UniMind AI Clinical Assistant
// ==========================================
router.post(
  '/clinical/ai/suggestions',
  authenticateToken,
  requireRoles(['provider', 'clinician', 'dept-head', 'super-admin']),
  aiClinicalSuggestions,
);
router.post(
  '/clinical/ai/draft-to-report',
  authenticateToken,
  requireRoles(['provider', 'clinician', 'dept-head', 'super-admin']),
  aiDraftToReport,
);

// ==========================================
// Phase 5 — Session Drafts (Private Workspace)
// ==========================================
router.post(
  '/clinical/session-drafts',
  authenticateToken,
  requireRoles(['provider', 'clinician', 'dept-head', 'super-admin']),
  saveSessionDraft,
);
router.get(
  '/clinical/session-drafts/:sessionId',
  authenticateToken,
  requireRoles(['provider', 'clinician', 'dept-head', 'super-admin']),
  getSessionDraft,
);

// ==========================================
// Secure Messaging Routes
// ==========================================
router.post('/messages', authenticateToken, sendMessage);
router.get('/messages/conversations', authenticateToken, getConversations);
router.get('/messages/history/:otherUserId', authenticateToken, getMessages);
router.post('/messages/read/:otherUserId', authenticateToken, markAsRead);
router.get('/messages/contacts', authenticateToken, getAvailableContacts);

// ==========================================
// Document Centre Routes
// ==========================================
router.post('/documents/upload', authenticateToken, uploadDocument);
router.get('/documents', authenticateToken, getDocuments);
router.get('/documents/download/:id', authenticateToken, downloadDocument);
router.delete('/documents/:id', authenticateToken, requireRoles(['admin']), deleteDocument);
router.post('/student/consent', authenticateToken, requireRoles(['student']), submitConsent);
router.post('/student/toggle-assessments', authenticateToken, toggleAssessments);

// ==========================================
// Assessments Module Routes
// ==========================================
router.post('/assessments', authenticateToken, quizRateLimiter, submitAssessment);
router.get('/assessments', authenticateToken, getAssessments);
router.get('/assessments/:id', authenticateToken, getAssessmentDetails);
router.get('/assessments/:id/pdf', authenticateToken, downloadAssessmentPDF);

// ==========================================
// Admin Reports & System Settings Routes
// ==========================================
router.get('/admin/analytics', authenticateToken, requireRoles(['admin']), getAnalytics);
router.get('/admin/metrics', authenticateToken, requireRoles(['admin']), (req, res) => {
  const avgResponseTime =
    performanceMetrics.totalRequests > 0
      ? Math.round(performanceMetrics.totalResponseTimeMs / performanceMetrics.totalRequests)
      : 0;

  res.json({
    uptimeSeconds: Math.round(process.uptime()),
    totalRequests: performanceMetrics.totalRequests,
    successfulRequests: performanceMetrics.successfulRequests,
    failedRequests: performanceMetrics.failedRequests,
    avgResponseTimeMs: avgResponseTime,
    slowRequestsCount: performanceMetrics.slowRequestsCount,
    endpointBreakdown: Object.entries(performanceMetrics.endpointStats).map(([route, stat]) => ({
      route,
      requestsCount: stat.count,
      avgTimeMs: Math.round(stat.totalTimeMs / stat.count),
      errorsCount: stat.errors,
    })),
  });
});
router.get(
  '/admin/opd-register',
  authenticateToken,
  requireRoles(['admin', 'provider']),
  getOPDRegister,
);
router.get(
  '/admin/opd-register/export',
  authenticateToken,
  requireRoles(['admin', 'provider']),
  exportOPDRegisterCSV,
);
router.get('/admin/audit-logs', authenticateToken, requireRoles(['admin']), getAuditLogs);
router.post('/admin/backup', authenticateToken, requireRoles(['admin']), backupDatabase);
router.post('/admin/restore', authenticateToken, requireRoles(['admin']), restoreDatabase);
router.get('/admin/backups', authenticateToken, requireRoles(['admin']), listBackups);
router.delete('/admin/backups/:fileName', authenticateToken, requireRoles(['admin']), deleteBackup);
router.get('/admin/backups/:fileName/download', downloadBackup); // Direct download handles auth internally if query token is present
router.post('/admin/sanitize', authenticateToken, requireRoles(['admin']), sanitizeDatabase);
router.get('/admin/announcements', authenticateToken, getAnnouncements);
router.post('/admin/announcements', authenticateToken, requireRoles(['admin']), createAnnouncement);
router.put(
  '/admin/announcements/:id',
  authenticateToken,
  requireRoles(['admin']),
  updateAnnouncement,
);
router.delete(
  '/admin/announcements/:id',
  authenticateToken,
  requireRoles(['admin']),
  deleteAnnouncement,
);

export default router;
// Trigger nodemon reload final rbac unimind reboot complete final touch monitoring complete final
