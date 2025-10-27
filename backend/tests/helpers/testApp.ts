/**
 * Test helper - Express app configuration for integration tests
 */

import express, { type Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { healthRouter } from '../../src/api/v1/health.js';
import { uploadRouter } from '../../src/api/v1/upload.js';
import { buildingsRouter } from '../../src/api/v1/buildings.js';
import { errorHandler } from '../../src/middleware/errorHandler.js';
import { globalRateLimiter } from '../../src/middleware/rateLimit.js';

export function createTestApp(): Application {
  const app = express();

  // Middleware
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(globalRateLimiter);

  // Routes
  app.use('/api/v1/health', healthRouter);
  app.use('/api/v1/upload', uploadRouter);
  app.use('/api/v1/buildings', buildingsRouter);

  // Error handler
  app.use(errorHandler);

  return app;
}
