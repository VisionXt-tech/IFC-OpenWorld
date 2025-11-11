/**
 * IFC-OpenWorld Backend API Server
 * Entry point for Express application
 */

import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { globalRateLimiter, uploadRateLimiter } from './middleware/rateLimit.js';
import { healthRouter } from './api/v1/health.js';
import { uploadRouter } from './api/v1/upload.js';
import { buildingsRouter } from './api/v1/buildings.js';

const app: Express = express();

// HTTPS enforcement in production (VULN-007)
if (config.server.env === 'production') {
  app.use((req, res, next) => {
    if (!req.secure && req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
  });
}

// Security middleware with enhanced CSP (VULN-006)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", 'https://cesium.com', 'https://cdn.jsdelivr.net'],
        styleSrc: ["'self'", "'unsafe-inline'"], // Required for CesiumJS
        imgSrc: ["'self'", 'https:', 'data:', 'blob:'],
        connectSrc: ["'self'", config.cors.origin],
        workerSrc: ["'self'", 'blob:'],
        fontSrc: ["'self'", 'https:', 'data:'],
      },
    },
  })
);

// Compression middleware (OPT-001) - 40-60% size reduction
app.use(
  compression({
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    },
    level: 6, // Balance between speed and compression
    threshold: 1024, // Only compress responses > 1KB
  })
);

app.use(globalRateLimiter);
app.use(
  cors({
    origin: config.cors.origin.split(',').map((o) => o.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/v1/health', healthRouter);
app.use('/api/v1/upload', uploadRateLimiter, uploadRouter);
app.use('/api/v1/buildings', buildingsRouter);

// Error handling (must be last)
app.use(errorHandler);

// Start server
const server = app.listen(config.server.port, config.server.host, () => {
  logger.info(`🚀 Server running on http://${config.server.host}:${config.server.port}`);
  logger.info(`📝 Environment: ${config.server.env}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

export { app };
