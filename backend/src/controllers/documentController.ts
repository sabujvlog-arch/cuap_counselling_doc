import { Response } from 'express';
import path from 'path';
import fs from 'fs';
import { query } from '../config/db';
import { AuthRequest } from '../middleware/auth';

const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

export const uploadDocument = async (req: AuthRequest, res: Response) => {
  const { studentId, category, fileName, fileData } = req.body; // fileData in base64 format

  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!studentId || !category || !fileName || !fileData) {
    return res.status(400).json({ error: 'studentId, category, fileName, and fileData (base64) are required.' });
  }

  try {
    // Check if the current user can upload for this student
    if (req.user.role === 'student') {
      const studentProfile = await query('SELECT id FROM students WHERE user_id = $1', [req.user.id]);
      if (studentProfile.rows.length === 0 || studentProfile.rows[0].id !== parseInt(studentId)) {
        return res.status(403).json({ error: 'Forbidden. Students can only upload for themselves.' });
      }
    }

    // Process base64 file data
    const buffer = Buffer.from(fileData, 'base64');
    
    // Ensure uploads folder exists
    const studentUploadDir = path.join(UPLOADS_DIR, studentId.toString());
    if (!fs.existsSync(studentUploadDir)) {
      fs.mkdirSync(studentUploadDir, { recursive: true });
    }

    const filePath = path.join(studentUploadDir, fileName);
    fs.writeFileSync(filePath, buffer);

    const relativeUrl = `/uploads/${studentId}/${fileName}`;

    // Version management: Check if a file with same name and student ID exists
    const existingRes = await query(
      'SELECT id, version FROM documents WHERE student_id = $1 AND file_name = $2',
      [studentId, fileName]
    );

    let finalVersion = 1;
    if (existingRes.rows.length > 0) {
      const existing = existingRes.rows[0];
      finalVersion = existing.version + 1;
      
      // Update existing document meta
      await query(
        `UPDATE documents 
         SET category = $1, file_url = $2, uploaded_by = $3, version = $4, created_at = CURRENT_TIMESTAMP
         WHERE id = $5`,
        [category, relativeUrl, req.user.id, finalVersion, existing.id]
      );
    } else {
      // Insert new document meta
      await query(
        `INSERT INTO documents (student_id, category, file_name, file_url, uploaded_by, version) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [studentId, category, fileName, relativeUrl, req.user.id, finalVersion]
      );
    }

    await query(
      'INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES ($1, $2, $3, $4)',
      [req.user.id, 'UPLOAD_DOCUMENT', `Uploaded document ${fileName} (v${finalVersion}) for Student ID ${studentId}`, req.ip]
    );

    return res.status(201).json({ 
      message: 'Document uploaded successfully.', 
      fileUrl: relativeUrl,
      version: finalVersion 
    });
  } catch (err) {
    console.error('Upload document error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getDocuments = async (req: AuthRequest, res: Response) => {
  const { studentId, category } = req.query;

  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    let sql = `
      SELECT d.*, u.username as uploaded_by_username, s.name as student_name, s.registration_number
      FROM documents d
      JOIN students s ON d.student_id = s.id
      LEFT JOIN users u ON d.uploaded_by = u.id
    `;
    const params: any[] = [];

    // Access control: Students can only view their own files.
    if (req.user.role === 'student') {
      const studentRes = await query('SELECT id FROM students WHERE user_id = $1', [req.user.id]);
      if (studentRes.rows.length === 0) return res.json([]);
      sql += ' WHERE d.student_id = $1';
      params.push(studentRes.rows[0].id);
    } else {
      sql += ' WHERE 1=1';
    }

    if (studentId && req.user.role !== 'student') {
      sql += ` AND d.student_id = $${params.length + 1}`;
      params.push(studentId);
    }

    if (category) {
      sql += ` AND d.category = $${params.length + 1}`;
      params.push(category);
    }

    sql += ' ORDER BY d.created_at DESC';

    const dbRes = await query(sql, params);
    return res.json(dbRes.rows);
  } catch (err) {
    console.error('Get documents error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const downloadDocument = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const docRes = await query('SELECT * FROM documents WHERE id = $1', [id]);
    if (docRes.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const doc = docRes.rows[0];

    // Access control check
    if (req.user.role === 'student') {
      const studentRes = await query('SELECT id FROM students WHERE user_id = $1', [req.user.id]);
      if (studentRes.rows.length === 0 || studentRes.rows[0].id !== doc.student_id) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    // Construct local path and send file
    const localPath = path.join(UPLOADS_DIR, doc.student_id.toString(), doc.file_name);
    if (!fs.existsSync(localPath)) {
      return res.status(404).json({ error: 'Physical file not found on disk' });
    }

    return res.sendFile(localPath);
  } catch (err) {
    console.error('Download document error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteDocument = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can delete document records' });
  }

  try {
    const docRes = await query('SELECT * FROM documents WHERE id = $1', [id]);
    if (docRes.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const doc = docRes.rows[0];
    const localPath = path.join(UPLOADS_DIR, doc.student_id.toString(), doc.file_name);
    
    // Delete database entry
    await query('DELETE FROM documents WHERE id = $1', [id]);

    // Attempt to delete physical file
    if (fs.existsSync(localPath)) {
      fs.unlinkSync(localPath);
    }

    await query(
      'INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES ($1, $2, $3, $4)',
      [req.user.id, 'DELETE_DOCUMENT', `Deleted document ID ${id} (${doc.file_name})`, req.ip]
    );

    return res.json({ message: 'Document deleted successfully' });
  } catch (err) {
    console.error('Delete document error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
