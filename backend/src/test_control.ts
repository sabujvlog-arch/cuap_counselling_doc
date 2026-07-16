import { initDb, query } from './config/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const BASE_URL = 'http://localhost:5000/api';

const runTests = async () => {
  console.log('========================================================');
  console.log('   WCCMS DIAGNOSTIC DATABASE TESTING');
  console.log('========================================================\n');

  try {
    // 1. Init Database
    await initDb();

    // 2. Fetch student user
    const studentUserRes = await query('SELECT * FROM users WHERE role = ? LIMIT 1', ['student']);
    console.log('  -> Seeded Student User Row:', studentUserRes.rows[0]);

    if (studentUserRes.rows.length > 0) {
      const student = studentUserRes.rows[0];
      const match = await bcrypt.compare(student.username, student.password_hash);
      console.log('  -> Default password verification match:', match);
    }

    console.log('\n========================================================\n');

    // 3. Make HTTP request to local server
    console.log('[TEST 1/4] Student Login Flow (Bypassing 2FA)...');
    const studentLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: '25bec01', password: '25BEC01' })
    });
    
    if (!studentLoginRes.ok) {
      const errText = await studentLoginRes.text();
      throw new Error(`Student login failed with status: ${studentLoginRes.status}. Body: ${errText}`);
    }
    
    const studentData = await studentLoginRes.json() as any;
    console.log('  -> Status:', studentLoginRes.status);
    console.log('  -> Requires 2FA?', studentData.requires2FA);
    console.log('  -> Session Token Received:', studentData.token ? 'YES (Bypassed successfully!)' : 'NO');
    console.log('  [PASS] Student Login verified.\n');

  } catch (err: any) {
    console.error('\n[FAIL] Integration test failed:', err.message);
    process.exit(1);
  }
};

runTests();
