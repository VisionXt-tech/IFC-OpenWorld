/**
 * Health check endpoint
 * GET /api/v1/health
 */

import { Router, type Request, type Response } from 'express';
import { pool } from '../../db/pool.js';
import { config } from '../../config/index.js';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    // Check database connection
    const result = await pool.query('SELECT NOW() as now, version() as version');
    const dbInfo = result.rows[0] as { now: Date; version: string };

    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: config.server.env,
      database: {
        status: 'connected',
        timestamp: dbInfo.now,
        version: dbInfo.version.split(' ')[0] + ' ' + dbInfo.version.split(' ')[1],
      },
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      environment: config.server.env,
      database: {
        status: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
});

export { router as healthRouter };
