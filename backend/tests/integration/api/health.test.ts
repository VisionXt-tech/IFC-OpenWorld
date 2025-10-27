/**
 * Integration tests for /api/v1/health endpoint
 */

import request from 'supertest';
import { createTestApp } from '../../helpers/testApp.js';
import { pool } from '../../../src/db/pool.js';

// Mock database pool
jest.mock('../../../src/db/pool.js', () => ({
  pool: {
    query: jest.fn(),
  },
}));

// Mock logger
jest.mock('../../../src/utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock config
jest.mock('../../../src/config/index.js', () => ({
  config: {
    server: {
      env: 'test',
      port: 3002,
      host: 'localhost',
    },
    database: {
      url: 'postgresql://test:test@localhost:5433/test',
    },
    s3: {
      endpoint: 'http://localhost:9000',
      region: 'us-east-1',
      bucket: 'test-bucket',
      accessKeyId: 'test',
      secretAccessKey: 'test',
      forcePathStyle: true,
      presignedUrlExpiry: 900,
    },
    upload: {
      maxFileSizeMB: 100,
    },
    rateLimit: {
      windowMs: 900000,
      maxRequests: 100,
    },
    cors: {
      origin: 'http://localhost:5173',
    },
  },
}));

describe('GET /api/v1/health', () => {
  const app = createTestApp();
  const mockPoolQuery = pool.query as jest.MockedFunction<typeof pool.query>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 200 with healthy status when database is connected', async () => {
    const mockDbResult = {
      rows: [
        {
          now: new Date('2025-10-27T12:00:00Z'),
          version: 'PostgreSQL 15.8 on x86_64-pc-linux-musl',
        },
      ],
      command: 'SELECT',
      rowCount: 1,
      oid: 0,
      fields: [],
    };

    mockPoolQuery.mockResolvedValue(mockDbResult);

    const response = await request(app).get('/api/v1/health').expect(200);

    expect(response.body).toHaveProperty('status', 'healthy');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('environment', 'test');
    expect(response.body).toHaveProperty('database');
    expect(response.body.database).toHaveProperty('status', 'connected');
    expect(response.body.database).toHaveProperty('version', 'PostgreSQL 15.8');
    expect(response.body.database).toHaveProperty('timestamp');
  });

  it('should return 503 when database connection fails', async () => {
    mockPoolQuery.mockRejectedValue(new Error('Connection refused'));

    const response = await request(app).get('/api/v1/health').expect(503);

    expect(response.body).toHaveProperty('status', 'unhealthy');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('environment', 'test');
    expect(response.body).toHaveProperty('database');
    expect(response.body.database).toHaveProperty('status', 'disconnected');
    expect(response.body.database).toHaveProperty('error', 'Connection refused');
  });

  it('should return JSON content-type', async () => {
    mockPoolQuery.mockResolvedValue({
      rows: [
        {
          now: new Date(),
          version: 'PostgreSQL 15.8',
        },
      ],
      command: 'SELECT',
      rowCount: 1,
      oid: 0,
      fields: [],
    });

    const response = await request(app).get('/api/v1/health');

    expect(response.headers['content-type']).toMatch(/application\/json/);
  });

  it('should parse PostgreSQL version correctly', async () => {
    mockPoolQuery.mockResolvedValue({
      rows: [
        {
          now: new Date(),
          version:
            'PostgreSQL 15.8 (Debian 15.8-1.pgdg120+1) on x86_64-pc-linux-gnu, compiled by gcc',
        },
      ],
      command: 'SELECT',
      rowCount: 1,
      oid: 0,
      fields: [],
    });

    const response = await request(app).get('/api/v1/health').expect(200);

    expect(response.body.database.version).toBe('PostgreSQL 15.8');
  });
});
