const http = require('http');
const sqlite3 = require('./backend/node_modules/sqlite3');
const path = require('path');

// Helper to make POST request
const post = (urlPath, payload) => {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: urlPath,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };
    
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, body: JSON.parse(body) });
      });
    });
    
    req.on('error', (e) => reject(e));
    req.write(data);
    req.end();
  });
};

const run = async () => {
  try {
    console.log('1. Starting login for provider...');
    const loginRes = await post('/api/auth/login', { username: 'provider', password: '2026' });
    console.log('Login Response:', loginRes);

    // Read OTP from database
    console.log('2. Reading OTP from database...');
    const dbPath = path.resolve(__dirname, 'backend/wccms.db');
    const db = new sqlite3.Database(dbPath);
    
    db.get("SELECT otp_code FROM users WHERE username = 'provider'", async (err, row) => {
      if (err) {
        console.error('DB error:', err);
        return;
      }
      
      const otpCode = row.otp_code;
      console.log(`Found OTP code: ${otpCode}`);

      console.log('3. Verifying 2FA...');
      const verifyRes = await post('/api/auth/verify-2fa', { username: 'admin', otpCode });
      console.log('Verify 2FA Response:', verifyRes);
      db.close();
    });
  } catch (err) {
    console.error('Test run failed:', err);
  }
};

run();
