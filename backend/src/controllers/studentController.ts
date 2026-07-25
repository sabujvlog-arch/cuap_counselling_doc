import { Response } from 'express';
import { query } from '../config/db';
import { AuthRequest } from '../middleware/auth';

export const toggleAssessments = async (req: AuthRequest, res: Response) => {
  const { studentId, enabled } = req.body;
  if (!studentId) {
    return res.status(400).json({ error: 'Student ID is required.' });
  }

  try {
    await query('UPDATE students SET assessments_enabled = $1 WHERE id = $2', [enabled, studentId]);
    return res.json({ message: `Assessments ${enabled ? 'enabled' : 'disabled'} successfully.` });
  } catch (err) {
    console.error('Toggle assessments error:', err);
    return res.status(500).json({ error: 'Internal server error' });
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
      `SELECT id, name, phone, email, emergency_contact, emergency_phone, hostel_scholar, address 
       FROM students 
       WHERE LOWER(registration_number) = $1`,
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
