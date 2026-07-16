const localtunnel = require('localtunnel');

(async () => {
  console.log('Starting public tunnels for CUAP WCCMS...');

  // Start Backend Tunnel
  try {
    const backendTunnel = await localtunnel({ port: 5000 });
    console.log('🎉 Backend API Tunnel is live at:', backendTunnel.url);
    
    backendTunnel.on('close', () => {
      console.log('Backend tunnel closed.');
    });
  } catch (err) {
    console.error('Error starting backend tunnel:', err);
  }

  // Start Frontend Tunnel
  try {
    const frontendTunnel = await localtunnel({ port: 3000 });
    console.log('🎉 Frontend Portal Tunnel is live at:', frontendTunnel.url);
    
    frontendTunnel.on('close', () => {
      console.log('Frontend tunnel closed.');
    });
  } catch (err) {
    console.error('Error starting frontend tunnel:', err);
  }
})();
