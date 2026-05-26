import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import { httpRateLimiter } from '../middleware/rate-limit.middleware';

const app = express();

// Standard Enterprise HTTP Securing Layer
app.use(helmet());
app.use(compression());
app.use(cors({ origin: '*' }));
app.use(express.json());

// Apply global application ingestion standard rate limiters
app.use('/api/', httpRateLimiter);

// System Health Check Endpoint for Infrastructure Orchestrators (Railway Probe Ready)
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage()
  });
});

export default app;
