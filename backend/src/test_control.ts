import { initDb, query } from './config/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const BASE_URL = 'http://localhost:5000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'cuap-secret-key-2026';

const runTests = async () => {
  console.log('========================================================');
  console.log('   WCCMS END-TO-END MULTI-ROLE LOGIN VALIDATION');
  console.log('========================================================\n');

  try {
    // 1. Init Database
    await initDb();

    // ----------------------------------------------------
    // TEST 1: Student Login Flow (Bypassing 2FA)
    // ----------------------------------------------------
    console.log('[TEST 1/4] Student Login Flow (Bypassing 2FA)...');
    const studentLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: '25bec01', password: '25BEC01' }),
    });

    if (!studentLoginRes.ok) {
      const errText = await studentLoginRes.text();
      throw new Error(
        `Student login failed with status: ${studentLoginRes.status}. Body: ${errText}`,
      );
    }

    const studentData = (await studentLoginRes.json()) as any;
    console.log('  -> Status:', studentLoginRes.status);
    console.log('  -> Requires 2FA?', studentData.requires2FA);
    console.log('  -> Session Token Received:', studentData.token ? 'YES' : 'NO');
    if (studentData.requires2FA || !studentData.token) {
      throw new Error('Student login failed to bypass 2FA or did not receive token');
    }
    console.log('  [PASS] Student Login verified.\n');

    // ----------------------------------------------------
    // TEST 2: Admin Login Flow (Requiring 2FA Verification)
    // ----------------------------------------------------
    console.log('[TEST 2/4] Admin Login Flow (Requiring 2FA)...');
    const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: '2026' }),
    });

    if (!adminLoginRes.ok) {
      const errText = await adminLoginRes.text();
      throw new Error(`Admin login failed with status: ${adminLoginRes.status}. Body: ${errText}`);
    }

    const adminData = (await adminLoginRes.json()) as any;
    console.log('  -> Status:', adminLoginRes.status);
    console.log('  -> Requires 2FA?', adminData.requires2FA);
    if (!adminData.requires2FA) {
      throw new Error('Admin login failed: 2FA was not requested');
    }

    // Query the database directly to get the generated OTP code for admin
    const adminOtpRes = await query('SELECT otp_code FROM users WHERE username = ?', ['admin']);
    const adminOtp = adminOtpRes.rows[0]?.otp_code;
    console.log('  -> Fetched 2FA OTP from Database:', adminOtp);

    const adminVerifyRes = await fetch(`${BASE_URL}/auth/verify-2fa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', otpCode: adminOtp }),
    });

    if (!adminVerifyRes.ok) {
      const errText = await adminVerifyRes.text();
      throw new Error(`Admin 2FA verification failed: ${adminVerifyRes.status}. Body: ${errText}`);
    }

    const adminSession = (await adminVerifyRes.json()) as any;
    console.log('  -> Session Token Received:', adminSession.token ? 'YES' : 'NO');
    if (!adminSession.token) {
      throw new Error('Admin 2FA verification did not return token');
    }
    console.log('  [PASS] Admin Login verified.\n');

    // ----------------------------------------------------
    // TEST 3: Provider Login Flow (Requiring 2FA Verification)
    // ----------------------------------------------------
    console.log('[TEST 3/4] Provider Login Flow (Requiring 2FA)...');
    const providerLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'provider', password: '2026' }),
    });

    if (!providerLoginRes.ok) {
      const errText = await providerLoginRes.text();
      throw new Error(`Provider login failed: ${providerLoginRes.status}. Body: ${errText}`);
    }

    const providerData = (await providerLoginRes.json()) as any;
    console.log('  -> Status:', providerLoginRes.status);
    console.log('  -> Requires 2FA?', providerData.requires2FA);
    if (!providerData.requires2FA) {
      throw new Error('Provider login failed: 2FA was not requested');
    }

    // Query the database directly to get the generated OTP code for provider
    const providerOtpRes = await query('SELECT otp_code FROM users WHERE username = ?', [
      'provider',
    ]);
    const providerOtp = providerOtpRes.rows[0]?.otp_code;
    console.log('  -> Fetched 2FA OTP from Database:', providerOtp);

    const providerVerifyRes = await fetch(`${BASE_URL}/auth/verify-2fa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'provider', otpCode: providerOtp }),
    });

    if (!providerVerifyRes.ok) {
      const errText = await providerVerifyRes.text();
      throw new Error(
        `Provider 2FA verification failed: ${providerVerifyRes.status}. Body: ${errText}`,
      );
    }

    const providerSession = (await providerVerifyRes.json()) as any;
    console.log('  -> Session Token Received:', providerSession.token ? 'YES' : 'NO');
    if (!providerSession.token) {
      throw new Error('Provider 2FA verification did not return token');
    }
    console.log('  [PASS] Provider Login verified.\n');

    // ----------------------------------------------------
    // TEST 4: Forgot & Reset Password Flow
    // ----------------------------------------------------
    console.log('[TEST 4/4] Forgot & Reset Password Flow...');

    // Trigger Forgot Password API
    const forgotRes = await fetch(`${BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: '25bec01' }),
    });

    if (!forgotRes.ok) {
      const errText = await forgotRes.text();
      throw new Error(`Forgot password API request failed: ${forgotRes.status}. Body: ${errText}`);
    }

    const forgotData = (await forgotRes.json()) as any;
    console.log('  -> Forgot Password API Response:', forgotData.message);

    // Generate a valid JWT token signed with same secret to bypass the email transport wait
    const resetToken = jwt.sign({ username: '25bec01' }, JWT_SECRET, { expiresIn: '15m' });
    console.log('  -> Generated verification token locally');

    // Call Reset Password API to change password to 'NEW_SECRET_2026'
    const resetRes = await fetch(`${BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: '25bec01',
        token: resetToken,
        newPassword: 'NEW_SECRET_2026',
      }),
    });

    if (!resetRes.ok) {
      const errText = await resetRes.text();
      throw new Error(`Reset password API request failed: ${resetRes.status}. Body: ${errText}`);
    }

    const resetData = (await resetRes.json()) as any;
    console.log('  -> Reset Password API Response:', resetData.message || 'Success');

    // Verify login with new password
    const studentNewLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: '25bec01', password: 'NEW_SECRET_2026' }),
    });

    if (!studentNewLoginRes.ok) {
      const errText = await studentNewLoginRes.text();
      throw new Error(
        `Login verification with new password failed: ${studentNewLoginRes.status}. Body: ${errText}`,
      );
    }

    const studentNewData = (await studentNewLoginRes.json()) as any;
    console.log('  -> New Password Login Status:', studentNewLoginRes.status);
    console.log('  -> Requires 2FA?', studentNewData.requires2FA);
    console.log('  -> Session Token Received:', studentNewData.token ? 'YES' : 'NO');
    if (!studentNewData.token) {
      throw new Error('New password login verification failed to return token');
    }

    // Revert password back to default '25BEC01' to keep environment consistent for subsequent runs
    const revertToken = jwt.sign({ username: '25bec01' }, JWT_SECRET, { expiresIn: '15m' });
    await fetch(`${BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: '25bec01', token: revertToken, newPassword: '25BEC01' }),
    });
    console.log('  -> Reverted student password to default seed value');
    console.log('  [PASS] Forgot & Reset Password flow verified.\n');

    console.log('========================================================');
    console.log('   [SUCCESS] ALL WCCMS AUTH FLOWS ARE FULLY FUNCTIONAL');
    console.log('========================================================');
  } catch (err: any) {
    console.error('\n[FAIL] Integration test failed:', err.message);
    process.exit(1);
  }
};

runTests();
