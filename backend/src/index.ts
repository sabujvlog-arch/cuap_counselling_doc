import express from 'express';
import cors from 'cors';
import path from 'path';
import { initDb } from './config/db';
import apiRouter from './routes/api';

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Set higher size limit for JSON bodies to accommodate base64 uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static upload previews if requested
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

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
