import { Router } from 'express';
import { authenticateToken, requireRoles } from '../middleware/auth';

// Controller Imports
import {
  login,
  verify2FA,
  getMe,
  changePassword,
  createProvider,
  createStudent,
  forgotPassword,
  resetPassword
} from '../controllers/authController';

import {
  bookAppointment,
  getAppointments,
  updateAppointmentStatus,
  getAvailableSlots,
  verifyAppointmentQR
} from '../controllers/appointmentController';

import {
  saveSession,
  getSession,
  getSessionVersions,
  getStudentEMR,
  saveMSELog,
  getMSELogs,
  createPrescription,
  getPrescription,
  getPrescriptionPrintLayout
} from '../controllers/clinicalController';

import {
  sendMessage,
  getMessages,
  getConversations,
  markAsRead,
  getAvailableContacts
} from '../controllers/messageController';

import {
  uploadDocument,
  getDocuments,
  downloadDocument,
  deleteDocument
} from '../controllers/documentController';

import {
  submitAssessment,
  getAssessments,
  getAssessmentDetails
} from '../controllers/assessmentController';

import {
  getAnalytics,
  getOPDRegister,
  exportOPDRegisterCSV,
  getAuditLogs,
  backupDatabase,
  restoreDatabase,
  getAnnouncements,
  createAnnouncement
} from '../controllers/adminController';

import { aiAssist } from '../controllers/aiController';
import { publicChat } from '../controllers/publicChatController';

const router = Router();

// ==========================================
// Authentication Routes
// ==========================================
router.post('/auth/login', login);
router.post('/auth/verify-2fa', verify2FA);
router.post('/public/chat', publicChat);
router.get('/auth/me', authenticateToken, getMe);
router.post('/auth/change-password', authenticateToken, changePassword);
router.post('/auth/forgot-password', forgotPassword);
router.post('/auth/reset-password', resetPassword);

// Provider and Student registrations (Admin only)
router.post('/admin/providers', authenticateToken, requireRoles(['admin']), createProvider);
router.post('/admin/students', authenticateToken, requireRoles(['admin']), createStudent);

// ==========================================
// Appointment Routes
// ==========================================
router.post('/appointments', authenticateToken, requireRoles(['student']), bookAppointment);
router.get('/appointments', authenticateToken, getAppointments);
router.patch('/appointments/:id/status', authenticateToken, updateAppointmentStatus);
router.get('/appointments/available-slots', authenticateToken, getAvailableSlots);
router.post('/appointments/verify-qr', authenticateToken, requireRoles(['admin', 'provider']), verifyAppointmentQR);

// ==========================================
// Clinical EMR & Prescription Routes
// ==========================================
router.post('/clinical/sessions', authenticateToken, requireRoles(['provider']), saveSession);
router.get('/clinical/sessions/:id', authenticateToken, getSession);
router.get('/clinical/sessions/:id/versions', authenticateToken, requireRoles(['provider']), getSessionVersions);
router.get('/clinical/emr/student/:studentId', authenticateToken, getStudentEMR);
router.post('/clinical/ai-assist', authenticateToken, requireRoles(['provider']), aiAssist);
router.post('/clinical/mse', authenticateToken, requireRoles(['provider']), saveMSELog);
router.get('/clinical/mse/student/:studentId', authenticateToken, getMSELogs);

router.post('/clinical/prescriptions', authenticateToken, requireRoles(['provider']), createPrescription);
router.get('/clinical/prescriptions/:id', authenticateToken, getPrescription);
// Public print route, prints individual prescriptions
router.get('/clinical/prescriptions/:id/print', getPrescriptionPrintLayout);

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

// ==========================================
// Assessments Module Routes
// ==========================================
router.post('/assessments', authenticateToken, submitAssessment);
router.get('/assessments', authenticateToken, getAssessments);
router.get('/assessments/:id', authenticateToken, getAssessmentDetails);

// ==========================================
// Admin Reports & System Settings Routes
// ==========================================
router.get('/admin/analytics', authenticateToken, requireRoles(['admin']), getAnalytics);
router.get('/admin/opd-register', authenticateToken, requireRoles(['admin', 'provider']), getOPDRegister);
router.get('/admin/opd-register/export', authenticateToken, requireRoles(['admin', 'provider']), exportOPDRegisterCSV);
router.get('/admin/audit-logs', authenticateToken, requireRoles(['admin']), getAuditLogs);
router.post('/admin/backup', authenticateToken, requireRoles(['admin']), backupDatabase);
router.post('/admin/restore', authenticateToken, requireRoles(['admin']), restoreDatabase);
router.get('/admin/announcements', authenticateToken, getAnnouncements);
router.post('/admin/announcements', authenticateToken, requireRoles(['admin']), createAnnouncement);

export default router;
