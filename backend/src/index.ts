/**
 * IFC-OpenWorld Backend API Server
 * Entry point for Express application
 */

import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { pool } from './db/pool.js';
import { redisService } from './services/redisService.js';
import { errorHandler } from './middleware/errorHandler.js';
import { globalRateLimiter, uploadRateLimiter } from './middleware/rateLimit.js';
import { csrfErrorHandler } from './middleware/csrf.js';
import { healthRouter } from './api/v1/health.js';
import { uploadRouter } from './api/v1/upload.js';
import { buildingsRouter } from './api/v1/buildings.js';
import { csrfRouter } from './api/v1/csrf.js';

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
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'CSRF-Token'],
  })
);

// Cookie parsing (required for CSRF protection)
app.use(cookieParser());

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/v1/health', healthRouter);
app.use('/api/v1', csrfRouter); // CSRF token endpoint
app.use('/api/v1/upload', uploadRateLimiter, uploadRouter);
app.use('/api/v1/buildings', buildingsRouter);

// Error handling (must be last)
app.use(csrfErrorHandler); // CSRF error handler
app.use(errorHandler);

// Start server
const server = app.listen(config.server.port, config.server.host, () => {
  logger.info(`🚀 Server running on http://${config.server.host}:${config.server.port}`);
  logger.info(`📝 Environment: ${config.server.env}`);
});

// Graceful shutdown
// BUGFIX: Handle both SIGTERM and SIGINT (Ctrl+C) for proper cleanup
async function gracefulShutdown(signal: string): Promise<void> {
  logger.info(`${signal} received, shutting down gracefully`);

  server.close(async () => {
    try {
      // Close database pool
      await pool.end();
      logger.info('Database pool closed');

      // Close Redis connection if enabled
      await redisService.disconnect();
      logger.info('Redis connection closed');

      logger.info('Server closed successfully');
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      process.exit(1);
    }
  });

  // Force shutdown after 10 seconds if graceful shutdown fails
  setTimeout(() => {
    logger.error('Forcefully shutting down after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => void gracefulShutdown('SIGINT'));

export { app };
