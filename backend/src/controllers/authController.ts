import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/db';
import { AuthRequest } from '../middleware/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'cuap-secret-key-2026';

export const login = async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const userRes = await query('SELECT * FROM users WHERE username = $1', [(username || '').toLowerCase().trim()]);
    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = userRes.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Generate random 6-digit OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiration

    // Save OTP to DB
    await query(
      'UPDATE users SET otp_code = $1, otp_expires_at = $2 WHERE id = $3',
      [otpCode, expiresAt.toISOString(), user.id]
    );

    // Simulation: Write OTP to server log console
    console.log(`\n======================================================`);
    console.log(` [2FA SIMULATOR] OTP Code for ${user.username.toUpperCase()}: ${otpCode} `);
    console.log(` Expiration: 5 minutes (${expiresAt.toLocaleTimeString()})`);
    console.log(`======================================================\n`);

    return res.json({
      requires2FA: true,
      username: user.username,
      message: '2FA verification code sent successfully. Check system logs for simulated code.'
    });
  } catch (err) {
    console.error('Login 2FA initialization error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const verify2FA = async (req: Request, res: Response) => {
  const { username, otpCode } = req.body;

  if (!username || !otpCode) {
    return res.status(400).json({ error: 'Username and OTP code are required' });
  }

  try {
    const userRes = await query('SELECT * FROM users WHERE username = $1', [(username || '').toLowerCase().trim()]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userRes.rows[0];

    // Check if OTP matches and has not expired
    if (!user.otp_code || user.otp_code !== otpCode) {
      return res.status(400).json({ error: 'Incorrect 2FA verification code' });
    }

    const expiresAt = new Date(user.otp_expires_at);
    if (expiresAt.getTime() < Date.now()) {
      return res.status(400).json({ error: 'OTP verification code has expired' });
    }

    // Clear OTP fields in database
    await query('UPDATE users SET otp_code = NULL, otp_expires_at = NULL WHERE id = $1', [user.id]);

    // Check if password is still the default (for students, default is registration number)
    let changePasswordRequired = false;
    if (user.role === 'student') {
      // In student creation, default password is their username
      // We check if password_hash matches a hashed version of username
      const usernameMatch = await bcrypt.compare(user.username, user.password_hash);
      if (usernameMatch) {
        changePasswordRequired = true;
      }
    }

    // Sign token
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Audit logs
    await query(
      'INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES ($1, $2, $3, $4)',
      [user.id, 'LOGIN', `User ${user.username} passed 2FA and logged in successfully`, req.ip]
    );

    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
      changePasswordRequired
    });
  } catch (err) {
    console.error('Verify 2FA error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const userRes = await query('SELECT id, username, role, created_at FROM users WHERE id = $1', [req.user.id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userRes.rows[0];
    let profile = null;

    if (user.role === 'provider') {
      const providerRes = await query('SELECT * FROM providers WHERE user_id = $1', [user.id]);
      profile = providerRes.rows[0] || null;
    } else if (user.role === 'student') {
      const studentRes = await query('SELECT * FROM students WHERE user_id = $1', [user.id]);
      profile = studentRes.rows[0] || null;
    }

    return res.json({ user, profile });
  } catch (err) {
    console.error('getMe error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const changePassword = async (req: AuthRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;

  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required' });
  }

  try {
    const userRes = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const user = userRes.rows[0];

    const match = await bcrypt.compare(currentPassword, user.password_hash);
    if (!match) {
      return res.status(400).json({ error: 'Incorrect current password' });
    }

    const hashedNew = await bcrypt.hash(newPassword, 10);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashedNew, req.user.id]);

    await query(
      'INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES ($1, $2, $3, $4)',
      [req.user.id, 'CHANGE_PASSWORD', 'User changed their password', req.ip]
    );

    return res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const createProvider = async (req: AuthRequest, res: Response) => {
  const { username, password, name, employeeId, department, qualification, specialization, photoUrl, signatureUrl } = req.body;

  if (!username || !password || !name || !employeeId || !department || !qualification || !specialization) {
    return res.status(400).json({ error: 'All primary provider details are required' });
  }

  try {
    const checkUser = await query('SELECT id FROM users WHERE username = $1', [(username || '').toLowerCase().trim()]);
    if (checkUser.rows.length > 0) {
      return res.status(400).json({ error: 'Username is already taken' });
    }

    const checkEmp = await query('SELECT id FROM providers WHERE employee_id = $1', [employeeId]);
    if (checkEmp.rows.length > 0) {
      return res.status(400).json({ error: 'Employee ID already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    await query(
      'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3)',
      [(username || '').toLowerCase().trim(), hashedPassword, 'provider']
    );

    const userRes = await query('SELECT id FROM users WHERE username = $1', [(username || '').toLowerCase().trim()]);
    const userId = userRes.rows[0].id;

    await query(
      'INSERT INTO providers (user_id, name, employee_id, department, qualification, specialization, photo_url, signature_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [userId, name, employeeId, department, qualification, specialization, photoUrl || null, signatureUrl || null]
    );

    for (let day = 1; day <= 5; day++) {
      await query(
        'INSERT INTO availability (provider_id, day_of_week, start_time, end_time, break_start, break_end, is_holiday) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [userId, day, '09:00', '17:00', '13:00', '14:00', false]
      );
    }

    await query(
      'INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES ($1, $2, $3, $4)',
      [req.user?.id || null, 'CREATE_PROVIDER', `Admin created provider ${name} (${employeeId})`, req.ip]
    );

    return res.status(201).json({ message: 'Provider created successfully' });
  } catch (err) {
    console.error('Create provider error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const createStudent = async (req: AuthRequest, res: Response) => {
  const {
    registrationNumber,
    name,
    age,
    gender,
    dob,
    department,
    semester,
    phone,
    email,
    hostelScholar,
    emergencyContact,
    emergencyPhone,
    bloodGroup,
    address
  } = req.body;

  if (!registrationNumber || !name || !age || !gender || !dob || !department || !semester || !phone || !email || !hostelScholar || !emergencyContact || !emergencyPhone || !bloodGroup || !address) {
    return res.status(400).json({ error: 'All student fields are required' });
  }

  try {
    const regNorm = (registrationNumber || '').toLowerCase().trim();
    const checkUser = await query('SELECT id FROM users WHERE username = $1', [regNorm]);
    if (checkUser.rows.length > 0) {
      return res.status(400).json({ error: 'Student registration number already exists' });
    }

    const hashedPassword = await bcrypt.hash(regNorm, 10);
    
    await query(
      'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3)',
      [regNorm, hashedPassword, 'student']
    );

    const userRes = await query('SELECT id FROM users WHERE username = $1', [regNorm]);
    const userId = userRes.rows[0].id;

    await query(
      'INSERT INTO students (user_id, registration_number, name, age, gender, dob, department, semester, phone, email, hostel_scholar, emergency_contact, emergency_phone, blood_group, address) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)',
      [userId, regNorm, name, parseInt(age), gender, dob, department, semester, phone, email, hostelScholar, emergencyContact, emergencyPhone, bloodGroup, address]
    );

    await query(
      'INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES ($1, $2, $3, $4)',
      [req.user?.id || null, 'CREATE_STUDENT', `Admin created student ${name} (${regNorm})`, req.ip]
    );

    return res.status(201).json({ message: 'Student registered successfully' });
  } catch (err) {
    console.error('Create student error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
