import { Response } from 'express';
import { query } from '../config/db';
import { AuthRequest } from '../middleware/auth';

export const toggleAssessments = async (req: AuthRequest, res: Response) => {
  const { studentId, enabled } = req.body;
  if (!studentId) {
    return res.status(400).json({ error: 'Student ID is required.' });
  }

  try {
    await query(
      'UPDATE students SET assessments_enabled = $1, assessment_desk_unlocked = $2 WHERE id = $3',
      [enabled, enabled, studentId],
    );
    return res.json({
      message: `Assessment Desk ${enabled ? 'unlocked' : 'locked'} successfully.`,
    });
  } catch (err) {
    console.error('Toggle assessments error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const unlockAssessmentDesk = async (req: AuthRequest, res: Response) => {
  const { studentId, unlocked } = req.body;
  if (!studentId) {
    return res.status(400).json({ error: 'studentId is required.' });
  }

  try {
    const isUnlocked = unlocked !== undefined ? unlocked : true;
    await query(
      'UPDATE students SET assessment_desk_unlocked = $1, assessments_enabled = $2 WHERE id = $3',
      [isUnlocked, isUnlocked, studentId],
    );

    await query(
      `INSERT INTO audit_logs (user_id, action, resource, details)
       VALUES ($1, 'ASSESSMENT_DESK_UNLOCKED', 'students', $2)`,
      [
        req.user?.id || 1,
        `Assessment desk ${isUnlocked ? 'unlocked' : 'locked'} for student ID ${studentId}`,
      ],
    );

    return res.json({
      message: `Assessment desk ${isUnlocked ? 'unlocked' : 'locked'} successfully.`,
      unlocked: isUnlocked,
    });
  } catch (err) {
    console.error('Unlock assessment desk error:', err);
    return res.status(500).json({ error: 'Failed to update assessment desk unlock status.' });
  }
};

export const updateStudentConsentDetails = async (req: AuthRequest, res: Response) => {
  const { isMinor, guardianName, guardianContact, consentConfirmed } = req.body;
  const studentId = req.user?.student_id || req.user?.id;

  try {
    const guardianConsentStatus = isMinor ? 'PENDING' : 'NOT_REQUIRED';
    await query(
      `UPDATE students 
       SET is_minor = $1, 
           guardian_name = $2, 
           guardian_contact = $3, 
           guardian_consent_status = $4
       WHERE id = $5`,
      [
        isMinor ? true : false,
        guardianName || null,
        guardianContact || null,
        guardianConsentStatus,
        studentId,
      ],
    );

    return res.json({
      message: 'Student consent workflow updated.',
      isMinor: !!isMinor,
      guardianConsentStatus,
    });
  } catch (err) {
    console.error('Update student consent error:', err);
    return res.status(500).json({ error: 'Failed to update consent details.' });
  }
};

export const getStudentByRegNo = async (req: AuthRequest, res: Response) => {
  const { regNo } = req.params;
  if (!regNo) {
    return res.status(400).json({ error: 'Registration number is required.' });
  }

  try {
    const regNorm = regNo.toLowerCase().trim();
    const studentRes = await query(
      `SELECT id, name, phone, email, emergency_contact, emergency_phone, hostel_scholar, address,
              is_minor, guardian_name, guardian_contact, guardian_consent_status, assessment_desk_unlocked, assessments_enabled
       FROM students 
       WHERE LOWER(registration_number) = $1 OR LOWER(registration_no) = $1`,
      [regNorm],
    );

    if (studentRes.rows.length === 0) {
      return res.status(404).json({ error: 'Student profile not found.' });
    }

    return res.json(studentRes.rows[0]);
  } catch (err) {
    console.error('Get student by reg number error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
