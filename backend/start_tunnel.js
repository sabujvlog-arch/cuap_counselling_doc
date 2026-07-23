const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const BACKEND_PORT = 5000;
const FRONTEND_PORT = 3000;

console.log('========================================================');
console.log('       STARTING SECURE CLOUDFLARE PUBLIC TUNNELS        ');
console.log('========================================================\n');

// Paths
const cloudflaredPath = path.join(__dirname, 'cloudflared.exe');
const envLocalPath = path.join(__dirname, '../frontend/.env.local');
const configPath = path.join(__dirname, '../frontend/next.config.ts');

let backendUrl = null;
let frontendUrl = null;

// Start Backend Tunnel
console.log(`[TUNNEL] Launching backend tunnel on port ${BACKEND_PORT}...`);
const backendProc = spawn(cloudflaredPath, ['tunnel', '--url', `http://localhost:${BACKEND_PORT}`]);

backendProc.stderr.on('data', (data) => {
  const output = data.toString();
  const match = output.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
  if (match && !backendUrl) {
    backendUrl = match[0];
    console.log(`\n🎉 BACKEND API PUBLIC URL: ${backendUrl}`);

    // Write env file
    fs.writeFileSync(envLocalPath, `NEXT_PUBLIC_API_URL=${backendUrl}/api\n`);
    console.log(`[ENV] Wrote NEXT_PUBLIC_API_URL to frontend/.env.local`);

    // Touch Next config to trigger hot-reload of env variables
    if (fs.existsSync(configPath)) {
      const current = fs.readFileSync(configPath, 'utf8');
      fs.writeFileSync(configPath, current + '\n// touch');
      console.log(`[ENV] Touched next.config.ts for environment hot-reloads`);
    }

    // Now start Frontend Tunnel
    startFrontendTunnel();
  }
});

function startFrontendTunnel() {
  console.log(`[TUNNEL] Launching frontend tunnel on port ${FRONTEND_PORT}...`);
  const frontendProc = spawn(cloudflaredPath, [
    'tunnel',
    '--url',
    `http://localhost:${FRONTEND_PORT}`,
  ]);

  frontendProc.stderr.on('data', (data) => {
    const output = data.toString();
    const match = output.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
    if (match && !frontendUrl) {
      frontendUrl = match[0];
      console.log(`\n🎉 FRONTEND PORTAL PUBLIC URL: ${frontendUrl}`);
      console.log('\n========================================================');
      console.log('🚀 WCCMS IS NOW ACCESSIBLE INTERNALLY AND EXTERNALLY!');
      console.log(`👉 Access Portal: ${frontendUrl}`);
      console.log(`👉 API Endpoint:  ${backendUrl}/api`);
      console.log('========================================================\n');
    }
  });

  frontendProc.on('close', () => {
    console.log('Frontend tunnel process exited.');
  });
}

backendProc.on('close', () => {
  console.log('Backend tunnel process exited.');
});
