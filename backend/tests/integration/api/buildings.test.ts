/**
 * Integration tests for /api/v1/buildings endpoints
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

describe('GET /api/v1/buildings', () => {
  const app = createTestApp();
  const mockPoolQuery = pool.query as jest.MockedFunction<typeof pool.query>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Bounding box query', () => {
    it('should return buildings within bounding box', async () => {
      const mockBuildings = [
        {
          id: 'test-id-1',
          name: 'Test Building',
          address: 'Test Address',
          city: 'Rome',
          country: 'Italy',
          height: 48.5,
          floorCount: 4,
          ifcFileId: 'file-id-1',
          createdAt: new Date('2025-01-01'),
          updatedAt: new Date('2025-01-01'),
          longitude: 12.4924,
          latitude: 41.8902,
        },
      ];

      mockPoolQuery.mockResolvedValue({
        rows: mockBuildings,
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const response = await request(app)
        .get('/api/v1/buildings?bbox=12.4,41.8,12.6,42.0')
        .expect(200);

      expect(response.body).toHaveProperty('type', 'FeatureCollection');
      expect(response.body).toHaveProperty('features');
      expect(response.body.features).toHaveLength(1);
      expect(response.body.features[0]).toMatchObject({
        type: 'Feature',
        id: 'test-id-1',
        geometry: {
          type: 'Point',
          coordinates: [12.4924, 41.8902],
        },
        properties: {
          name: 'Test Building',
          city: 'Rome',
          country: 'Italy',
        },
      });
      expect(response.body).toHaveProperty('metadata');
      expect(response.body.metadata).toHaveProperty('count', 1);
    });

    it('should return 400 for invalid bbox format', async () => {
      const response = await request(app)
        .get('/api/v1/buildings?bbox=invalid')
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Validation Error');
    });

    it('should return 400 for longitude out of range', async () => {
      const response = await request(app)
        .get('/api/v1/buildings?bbox=-200,40,10,50')
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Longitude must be between -180 and 180');
    });

    it('should return 400 for latitude out of range', async () => {
      const response = await request(app)
        .get('/api/v1/buildings?bbox=-10,-100,10,50')
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Latitude must be between -90 and 90');
    });

    it('should accept optional limit parameter', async () => {
      mockPoolQuery.mockResolvedValue({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: [],
      });

      await request(app)
        .get('/api/v1/buildings?bbox=12.4,41.8,12.6,42.0&limit=50')
        .expect(200);

      expect(mockPoolQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([12.4, 41.8, 12.6, 42.0, 50])
      );
    });

    it('should return empty FeatureCollection when no buildings found', async () => {
      mockPoolQuery.mockResolvedValue({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: [],
      });

      const response = await request(app)
        .get('/api/v1/buildings?bbox=0,0,1,1')
        .expect(200);

      expect(response.body).toHaveProperty('type', 'FeatureCollection');
      expect(response.body.features).toHaveLength(0);
      expect(response.body.metadata.count).toBe(0);
    });

    it('should handle database errors gracefully', async () => {
      mockPoolQuery.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/v1/buildings?bbox=12.4,41.8,12.6,42.0')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Get by ID', () => {
    it('should return building by ID', async () => {
      const buildingId = '123e4567-e89b-12d3-a456-426614174000';
      const mockBuilding = {
        id: buildingId,
        name: 'Colosseum',
        address: 'Piazza del Colosseo, 1',
        city: 'Rome',
        country: 'Italy',
        height: 48.5,
        floorCount: 4,
        ifcFileId: '123e4567-e89b-12d3-a456-426614174001',
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
        longitude: 12.4924,
        latitude: 41.8902,
      };

      mockPoolQuery.mockResolvedValue({
        rows: [mockBuilding],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const response = await request(app)
        .get(`/api/v1/buildings/${buildingId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        type: 'Feature',
        id: buildingId,
        geometry: {
          type: 'Point',
          coordinates: [12.4924, 41.8902],
        },
        properties: {
          name: 'Colosseum',
          city: 'Rome',
        },
      });
    });

    it('should return 404 when building not found', async () => {
      mockPoolQuery.mockResolvedValue({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: [],
      });

      const response = await request(app)
        .get('/api/v1/buildings/00000000-0000-0000-0000-000000000000')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Building not found');
    });

    it('should handle database errors', async () => {
      mockPoolQuery.mockRejectedValue(new Error('Connection lost'));

      const response = await request(app)
        .get('/api/v1/buildings/123e4567-e89b-12d3-a456-426614174000')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });
});
