/**
 * Health check endpoint
 * GET /api/v1/health
 */

import { Router, type Request, type Response } from 'express';
import { pool } from '../../db/pool.js';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    // Check database connection (simple query without exposing version info)
    // SECURITY FIX: Removed database version from public endpoint to prevent information disclosure
    await pool.query('SELECT 1');

    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        api: 'operational',
      },
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'disconnected',
        api: 'operational',
      },
      message: 'Service degraded - database connection failed',
    });
  }
});

export { router as healthRouter };
