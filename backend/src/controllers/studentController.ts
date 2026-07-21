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
