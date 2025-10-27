/**
 * IFC-OpenWorld Backend API Server
 * Entry point for Express application
 */

import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { globalRateLimiter, uploadRateLimiter } from './middleware/rateLimit.js';
import { healthRouter } from './api/v1/health.js';
import { uploadRouter } from './api/v1/upload.js';
import { buildingsRouter } from './api/v1/buildings.js';

const app: Express = express();

// Security middleware
app.use(helmet());
app.use(globalRateLimiter);
app.use(
  cors({
    origin: config.cors.origin,
    credentials: true,
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
