import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/db';
import { AuthRequest } from '../middleware/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'cuap-secret-key-2026';

const sendSMS = async (recipient: string, message: string): Promise<boolean> => {
  const deviceId = '6a3273c8d2404ce643bc9ef7';
  const apiKey = 'b64912c1-ed9f-4776-80b9-0f237663e71d';
  
  let formattedPhone = recipient.trim();
  if (!formattedPhone.startsWith('+')) {
    if (formattedPhone.length === 10) {
      formattedPhone = '+91' + formattedPhone;
    } else if (formattedPhone.length === 12 && formattedPhone.startsWith('91')) {
      formattedPhone = '+' + formattedPhone;
    }
  }

  try {
    console.log(`Sending SMS to ${formattedPhone} via Textbee...`);
    const response = await fetch(`https://api.textbee.dev/api/v1/gateway/devices/${deviceId}/send-sms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify({
        recipients: [formattedPhone],
        message: message
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('Textbee SMS sent successfully:', data);
      return true;
    } else {
      const errText = await response.text();
      console.error('Textbee SMS failed with status:', response.status, errText);
      return false;
    }
  } catch (err) {
    console.error('Error calling Textbee SMS API:', err);
    return false;
  }
};

const sendEmail = async (recipient: string, subject: string, htmlContent: string): Promise<boolean> => {
  const apiKey = process.env.BREVO_API_KEY || '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';
  const senderEmail = process.env.SENDER_EMAIL || 'sabujd880@gmail.com';
  const senderName = process.env.SENDER_NAME || 'Sabuj Counseling Support';

  try {
    console.log(`Sending Brevo Email to ${recipient}...`);
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: {
          name: senderName,
          email: senderEmail
        },
        to: [{ email: recipient }],
        subject: subject,
        htmlContent: htmlContent
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('Brevo Email sent successfully:', data);
      return true;
    } else {
      const errText = await response.text();
      console.error('Brevo Email failed with status:', response.status, errText);
      return false;
    }
  } catch (err) {
    console.error('Error calling Brevo Email API:', err);
    return false;
  }
};

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

    // Retrieve user's phone number and email
    let userPhone = null;
    let userEmail = null;
    
    if (user.role === 'student') {
      const studRes = await query('SELECT phone, email FROM students WHERE user_id = $1', [user.id]);
      userPhone = studRes.rows[0]?.phone || null;
      userEmail = studRes.rows[0]?.email || null;
    } else if (user.role === 'provider') {
      const provRes = await query('SELECT phone, email FROM providers WHERE user_id = $1', [user.id]);
      userPhone = provRes.rows[0]?.phone || null;
      userEmail = provRes.rows[0]?.email || null;
    } else if (user.role === 'admin') {
      const uRes = await query('SELECT phone, email FROM users WHERE id = $1', [user.id]);
      userPhone = uRes.rows[0]?.phone || null;
      userEmail = uRes.rows[0]?.email || null;
    }

    // Dispatch SMS via Textbee
    let smsSent = false;
    if (userPhone) {
      smsSent = await sendSMS(userPhone, `[CUAP SWCC] Your login OTP is ${otpCode}. Valid for 5 minutes.`);
    }

    // Dispatch Email via Brevo
    let emailSent = false;
    if (userEmail) {
      const emailHtml = `
        <div style="font-family: sans-serif; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; max-width: 480px; margin: 0 auto; background-color: #ffffff;">
          <h2 style="color: #1e3a8a; margin-top: 0; font-family: sans-serif; border-bottom: 2px solid #3b82f6; padding-bottom: 12px;">CUAP Student Wellness Centre</h2>
          <p style="font-size: 14px; color: #475569;">Hello <strong>${user.username.toUpperCase()}</strong>,</p>
          <p style="font-size: 14px; color: #475569;">Your two-factor security OTP code for WCCMS is:</p>
          <div style="background-color: #f1f5f9; padding: 16px; border-radius: 8px; font-size: 24px; font-weight: bold; letter-spacing: 4px; text-align: center; margin: 20px 0; color: #2563eb; border: 1px dashed #cbd5e1;">
            ${otpCode}
          </div>
          <p style="font-size: 12px; color: #94a3b8; line-height: 1.5;">This code is valid for 5 minutes. If you did not request this login, please change your password immediately.</p>
        </div>
      `;
      emailSent = await sendEmail(userEmail, "Your CUAP WCCMS Security OTP Code", emailHtml);
    }

    // Logging without sensitive OTP disclosure
    console.log(`\n======================================================`);
    console.log(` [2FA DISPATCH] Generated secure OTP for ${user.username.toUpperCase()}`);
    console.log(` Recipients: Phone (${userPhone || 'None'}), Email (${userEmail || 'None'})`);
    console.log(` SMS Status: ${smsSent ? 'SENT' : 'FAILED/SKIPPED'}`);
    console.log(` Email Status: ${emailSent ? 'SENT' : 'FAILED/SKIPPED'}`);
    console.log(` Expiration: 5 minutes (${expiresAt.toLocaleTimeString()})`);
    console.log(`======================================================\n`);

    return res.json({
      requires2FA: true,
      username: user.username,
      message: `2FA verification code dispatched. ${smsSent ? `SMS sent to ***${userPhone?.slice(-4)}. ` : ''}${emailSent ? `Email sent to ${userEmail?.slice(0, 3)}***@${userEmail?.split('@')[1]}.` : ''}`
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

export const forgotPassword = async (req: Request, res: Response) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ error: 'Username or Registration number is required' });
  }

  try {
    const userRes = await query('SELECT * FROM users WHERE username = $1', [(username || '').toLowerCase().trim()]);
    if (userRes.rows.length === 0) {
      // Return 200 to prevent username harvesting
      return res.json({ message: 'If the username is registered, a password reset link has been sent to your email.' });
    }

    const user = userRes.rows[0];

    // Find email address
    let userEmail = user.email;
    if (!userEmail) {
      if (user.role === 'student') {
        const studRes = await query('SELECT email FROM students WHERE user_id = $1', [user.id]);
        userEmail = studRes.rows[0]?.email || null;
      } else if (user.role === 'provider') {
        const provRes = await query('SELECT email FROM providers WHERE user_id = $1', [user.id]);
        userEmail = provRes.rows[0]?.email || null;
      }
    }

    if (!userEmail) {
      return res.status(400).json({ error: 'No registered email found for this user. Please contact the administrator.' });
    }

    // Generate JWT token valid for 15 minutes
    const token = jwt.sign(
      { username: user.username },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    const resetLink = `http://localhost:3000/reset-password?token=${token}&username=${user.username}`;
    const emailHtml = `
      <div style="font-family: sans-serif; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; max-width: 480px; margin: 0 auto; background-color: #ffffff;">
        <h2 style="color: #1e3a8a; margin-top: 0; font-family: sans-serif; border-bottom: 2px solid #3b82f6; padding-bottom: 12px;">CUAP Student Wellness Centre</h2>
        <p style="font-size: 14px; color: #475569;">Hello <strong>${user.username.toUpperCase()}</strong>,</p>
        <p style="font-size: 14px; color: #475569;">We received a request to reset your portal password. Please click the button below to set a new password:</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${resetLink}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">Reset Password</a>
        </div>
        <p style="font-size: 12px; color: #64748b; line-height: 1.5;">This link will expire in 15 minutes. If you did not request this, you can safely ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 11px; color: #94a3b8; word-break: break-all;">If the button doesn't work, copy and paste this link into your browser: <br/>${resetLink}</p>
      </div>
    `;

    const emailSent = await sendEmail(userEmail, "Reset Your CUAP WCCMS Password", emailHtml);
    if (!emailSent) {
      return res.status(500).json({ error: 'Failed to dispatch recovery email. Please check SMTP configuration.' });
    }

    return res.json({ message: 'If the username is registered, a password reset link has been sent to your email.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  const { username, token, newPassword } = req.body;

  if (!username || !token || !newPassword) {
    return res.status(400).json({ error: 'Username, token, and new password are required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { username: string };
    if (decoded.username.toLowerCase() !== username.toLowerCase()) {
      return res.status(400).json({ error: 'Invalid reset token' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await query('UPDATE users SET password_hash = $1 WHERE username = $2', [hashedPassword, username.toLowerCase().trim()]);

    const userRes = await query('SELECT id FROM users WHERE username = $1', [username.toLowerCase().trim()]);
    const userId = userRes.rows[0]?.id || null;

    await query(
      'INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES ($1, $2, $3, $4)',
      [userId, 'RESET_PASSWORD', `User reset password successfully via email verification link`, req.ip]
    );

    return res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (err: any) {
    console.error('Reset password error:', err);
    if (err.name === 'TokenExpiredError') {
      return res.status(400).json({ error: 'Reset link has expired. Please request a new one.' });
    }
    return res.status(400).json({ error: 'Invalid or corrupted reset link.' });
  }
};
