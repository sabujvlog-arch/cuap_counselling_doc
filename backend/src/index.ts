import express from 'express'; // Activated theme toggle server update
import cors from 'cors';
import path from 'path';
import { initDb } from './config/db';
import apiRouter from './routes/api';

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// Set higher size limit for JSON bodies to accommodate base64 uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static upload previews if requested
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Helper to restrict access to CUAP Campus Network subnets (local and private IPs)
const isCampusNetwork = (ip: string): boolean => {
  let cleanIp = ip.trim();
  if (cleanIp.startsWith('::ffff:')) {
    cleanIp = cleanIp.substring(7);
  }

  // Local loopback
  if (cleanIp === '127.0.0.1' || cleanIp === '::1' || cleanIp === 'localhost') {
    return true;
  }

  // Private subnets typical for campus Wi-Fi / networks:
  // 1. 10.0.0.0/8
  if (cleanIp.startsWith('10.')) {
    return true;
  }

  // 2. 192.168.0.0/16
  if (cleanIp.startsWith('192.168.')) {
    return true;
  }

  // 3. 172.16.0.0/12 (172.16.x.x through 172.31.x.x)
  if (cleanIp.startsWith('172.')) {
    const parts = cleanIp.split('.');
    if (parts.length >= 2) {
      const secondOctet = parseInt(parts[1], 10);
      if (secondOctet >= 16 && secondOctet <= 31) {
        return true;
      }
    }
  }

  return false;
};

// Enforce Campus Network Only restriction middleware
app.use((req, res, next) => {
  const clientIp = req.ip || req.socket.remoteAddress || '';
  if (!isCampusNetwork(clientIp)) {
    console.warn(`[BLOCK] Access attempt from non-campus network IP: ${clientIp}`);
    return res.status(403).json({
      error: 'Access Denied: This application is restricted to the CUAP campus network only.',
    });
  }
  next();
});

// Log requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Map API routes
app.use('/api', apiRouter);

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('GLOBAL ERROR CAUGHT:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// Basic health check route
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'wccms-backend-api' });
});

// Bootstrap application
const startServer = async () => {
  try {
    await initDb();

    app.listen(PORT, () => {
      console.log(`================================================`);
      console.log(` WCCMS Express Backend running on port ${PORT} `);
      console.log(` Health check: http://localhost:${PORT}/health   `);
      console.log(`================================================`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

startServer();

// Trigger nodemon reboot final.
