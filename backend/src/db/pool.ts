/**
 * PostgreSQL connection pool using node-postgres (pg)
 * This replaces Prisma due to Windows + Docker authentication issues
 */

import { Pool, type PoolConfig } from 'pg';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

const poolConfig: PoolConfig = {
  connectionString: config.database.url,
  max: 20, // Maximum pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// Create connection pool
export const pool = new Pool(poolConfig);

// Log pool errors
pool.on('error', (err) => {
  logger.error('Unexpected error on idle client', err);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Closing database pool...');
  await pool.end();
  logger.info('Database pool closed');
});

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
  let client;
  try {
    client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    logger.info('Database connection successful', {
      timestamp: result.rows[0].now,
    });
    return true;
  } catch (error) {
    logger.error('Database connection failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  } finally {
    // BUGFIX: Ensure client is released even if query fails to prevent connection leaks
    if (client) {
      client.release();
    }
  }
}

/**
 * Execute a query with parameters
 */
export async function query<T = unknown>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug('Query executed', {
      text,
      duration,
      rows: result.rowCount,
    });
    return result.rows as T[];
  } catch (error) {
    logger.error('Query failed', {
      text,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

logger.info('Database pool initialized', {
  max: poolConfig.max,
  database: config.database.url.split('@')[1]?.split('/')[1]?.split('?')[0],
});
