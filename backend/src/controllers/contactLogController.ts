import { Response } from 'express';
import { query } from '../config/db';
import { AuthRequest } from '../middleware/auth';

/**
 * Log Out-of-Band Communication with a Student (Phone, Email, In-Person)
 * Provides an immutable audit trail for external follow-ups outside WCCMS messenger.
 */
export const createContactLog = async (req: AuthRequest, res: Response) => {
  if (
    !req.user ||
    (req.user.role !== 'provider' &&
      req.user.role !== 'admin' &&
      req.user.role !== 'dept-head' &&
      req.user.role !== 'super-admin')
  ) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const { studentId, channel, outcome, notes } = req.body;

  if (!studentId || !channel || !outcome) {
    return res.status(400).json({ error: 'studentId, channel, and outcome are required.' });
  }

  try {
    const studentCheck = await query('SELECT id FROM students WHERE id = $1', [studentId]);
    if (studentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Student profile not found.' });
    }

    const logRes = await query(
      `INSERT INTO contact_logs (student_id, counsellor_user_id, counsellor_name, channel, outcome, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, student_id, counsellor_name, channel, outcome, notes, logged_at`,
      [
        studentId,
        req.user.id,
        req.user.full_name || req.user.username || 'CUAP Counsellor',
        channel,
        outcome,
        notes || '',
      ],
    );

    // Audit log entry
    await query(
      `INSERT INTO audit_logs (user_id, action, resource, details)
       VALUES ($1, 'OUT_OF_BAND_CONTACT_LOGGED', 'contact_logs', $2)`,
      [
        req.user.id,
        `Logged out-of-band communication (${channel} - ${outcome}) for student ID ${studentId}`,
      ],
    );

    return res.status(201).json({
      message: 'Contact log recorded successfully.',
      contactLog: logRes.rows[0],
    });
  } catch (err: any) {
    console.error('Create contact log error:', err);
    return res.status(500).json({ error: 'Failed to record contact log.' });
  }
};

/**
 * Get Out-of-Band Contact Logs for a Student
 */
export const getContactLogs = async (req: AuthRequest, res: Response) => {
  const { studentId } = req.params;

  if (!studentId) {
    return res.status(400).json({ error: 'studentId is required.' });
  }

  try {
    const logsRes = await query(
      `SELECT id, student_id, counsellor_user_id, counsellor_name, channel, outcome, notes, logged_at
       FROM contact_logs
       WHERE student_id = $1
       ORDER BY logged_at DESC`,
      [studentId],
    );

    return res.json({ contactLogs: logsRes.rows || [] });
  } catch (err: any) {
    console.error('Get contact logs error:', err);
    return res.status(500).json({ error: 'Failed to retrieve contact logs.' });
  }
};
