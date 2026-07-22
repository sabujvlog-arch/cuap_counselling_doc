import express from 'express'; // Activated theme toggle server update
import cors from 'cors';
import path from 'path';
import { initDb, query } from './config/db';
import apiRouter from './routes/api';
import { monitorMiddleware } from './middleware/monitor';

const app = express();
const PORT = process.env.PORT || 5000;

// Enable instrumentation monitoring
app.use(monitorMiddleware);

// Enforce Security Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' *",
  );
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }
  next();
});

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

// Automated 24-hour background cleanup scheduler
const startAutoCleanupJob = () => {
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  const runCleanup = async () => {
    console.log('[AUTO-CLEANUP] Running database version history and log pruning...');
    try {
      const isPG = process.env.DB_TYPE === 'postgres' || process.env.DB_TYPE === 'postgresql';

      let cleanNotifQuery =
        "DELETE FROM notifications WHERE created_at < datetime('now', '-30 days')";
      let cleanLogsQuery = "DELETE FROM audit_logs WHERE created_at < datetime('now', '-90 days')";
      let cleanHistoryQuery =
        "DELETE FROM session_history WHERE created_at < datetime('now', '-90 days')";

      if (isPG) {
        cleanNotifQuery = "DELETE FROM notifications WHERE created_at < NOW() - INTERVAL '30 days'";
        cleanLogsQuery = "DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '90 days'";
        cleanHistoryQuery =
          "DELETE FROM session_history WHERE created_at < NOW() - INTERVAL '90 days'";
      }

      await query('BEGIN');
      const cleanNotif = await query(cleanNotifQuery);
      const cleanLogs = await query(cleanLogsQuery);
      const cleanHistory = await query(cleanHistoryQuery);
      await query('COMMIT');

      // Safeguard for count properties on result payloads depending on pg vs sqlite drivers
      const notifPruned = cleanNotif
        ? cleanNotif.rowCount !== undefined
          ? cleanNotif.rowCount
          : (cleanNotif as any).changes || 0
        : 0;
      const logsPruned = cleanLogs
        ? cleanLogs.rowCount !== undefined
          ? cleanLogs.rowCount
          : (cleanLogs as any).changes || 0
        : 0;
      const historyPruned = cleanHistory
        ? cleanHistory.rowCount !== undefined
          ? cleanHistory.rowCount
          : (cleanHistory as any).changes || 0
        : 0;

      console.log(
        `[AUTO-CLEANUP] Success: notifications pruned: ${notifPruned}, audit logs pruned: ${logsPruned}, session history pruned: ${historyPruned}`,
      );
    } catch (err) {
      try {
        await query('ROLLBACK');
      } catch (_) {}
      console.error('[AUTO-CLEANUP] Error during database pruning:', err);
    }
  };

  // Run initial cleanup after 10 seconds, then repeat daily
  setTimeout(runCleanup, 10000);
  setInterval(runCleanup, ONE_DAY_MS);
};

// Bootstrap application
const startServer = async () => {
  try {
    await initDb();

    app.listen(PORT, () => {
      console.log(`================================================`);
      console.log(` WCCMS Express Backend running on port ${PORT} `);
      console.log(` Health check: http://localhost:${PORT}/health   `);
      console.log(`================================================`);

      // Initialize automated database cleanup task
      startAutoCleanupJob();
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

startServer();
