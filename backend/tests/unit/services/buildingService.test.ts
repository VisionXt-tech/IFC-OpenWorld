/**
 * Unit tests for BuildingService
 * Tests spatial query logic and validation
 */

import { BuildingService, type BoundingBox } from '../../../src/services/buildingService.js';
import { pool } from '../../../src/db/pool.js';
import { AppError } from '../../../src/middleware/errorHandler.js';

// Mock the database pool
jest.mock('../../../src/db/pool.js', () => ({
  pool: {
    query: jest.fn(),
    end: jest.fn(),
  },
}));

// Mock logger to avoid console noise
jest.mock('../../../src/utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('BuildingService', () => {
  let service: BuildingService;
  const mockPoolQuery = pool.query as jest.MockedFunction<typeof pool.query>;

  beforeEach(() => {
    service = new BuildingService();
    jest.clearAllMocks();
  });

  describe('validateBoundingBox', () => {
    it('should accept valid bounding box', () => {
      const bbox: BoundingBox = {
        minLon: -10,
        minLat: 40,
        maxLon: 10,
        maxLat: 50,
      };

      expect(() => service.validateBoundingBox(bbox)).not.toThrow();
    });

    it('should reject longitude out of range (-180 to 180)', () => {
      const bbox: BoundingBox = {
        minLon: -200,
        minLat: 40,
        maxLon: 10,
        maxLat: 50,
      };

      expect(() => service.validateBoundingBox(bbox)).toThrow(AppError);
      expect(() => service.validateBoundingBox(bbox)).toThrow('Longitude must be between -180 and 180');
    });

    it('should reject latitude out of range (-90 to 90)', () => {
      const bbox: BoundingBox = {
        minLon: -10,
        minLat: -100,
        maxLon: 10,
        maxLat: 50,
      };

      expect(() => service.validateBoundingBox(bbox)).toThrow(AppError);
      expect(() => service.validateBoundingBox(bbox)).toThrow('Latitude must be between -90 and 90');
    });

    it('should reject minLon >= maxLon', () => {
      const bbox: BoundingBox = {
        minLon: 10,
        minLat: 40,
        maxLon: 10,
        maxLat: 50,
      };

      expect(() => service.validateBoundingBox(bbox)).toThrow(AppError);
      expect(() => service.validateBoundingBox(bbox)).toThrow('minLon must be less than maxLon');
    });

    it('should reject minLat >= maxLat', () => {
      const bbox: BoundingBox = {
        minLon: -10,
        minLat: 50,
        maxLon: 10,
        maxLat: 50,
      };

      expect(() => service.validateBoundingBox(bbox)).toThrow(AppError);
      expect(() => service.validateBoundingBox(bbox)).toThrow('minLat must be less than maxLat');
    });

    it('should accept worldwide bounding box', () => {
      const bbox: BoundingBox = {
        minLon: -180,
        minLat: -90,
        maxLon: 180,
        maxLat: 90,
      };

      expect(() => service.validateBoundingBox(bbox)).not.toThrow();
    });
  });

  describe('queryByBoundingBox', () => {
    it('should query buildings within bounding box', async () => {
      const bbox: BoundingBox = {
        minLon: 12.4,
        minLat: 41.8,
        maxLon: 12.6,
        maxLat: 42.0,
      };

      const mockBuildings = [
        {
          id: 'test-id-1',
          name: 'Test Building 1',
          address: 'Test Address 1',
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

      const result = await service.queryByBoundingBox(bbox, 100);

      expect(result.type).toBe('FeatureCollection');
      expect(result.features).toHaveLength(1);
      expect(result.features[0]!.type).toBe('Feature');
      expect(result.features[0]!.geometry.type).toBe('Point');
      expect(result.features[0]!.geometry.coordinates).toEqual([12.4924, 41.8902]);
      expect(result.features[0]!.properties.name).toBe('Test Building 1');
      expect(result.metadata.count).toBe(1);
      expect(result.metadata.bbox).toEqual(bbox);

      // Verify SQL query was called with correct parameters
      expect(mockPoolQuery).toHaveBeenCalledWith(
        expect.stringContaining('ST_Within'),
        [12.4, 41.8, 12.6, 42.0, 100]
      );
    });

    it('should reject limit out of range (1-1000)', async () => {
      const bbox: BoundingBox = {
        minLon: 12.4,
        minLat: 41.8,
        maxLon: 12.6,
        maxLat: 42.0,
      };

      await expect(service.queryByBoundingBox(bbox, 0)).rejects.toThrow(AppError);
      await expect(service.queryByBoundingBox(bbox, 0)).rejects.toThrow('Limit must be between 1 and 1000');

      await expect(service.queryByBoundingBox(bbox, 1001)).rejects.toThrow(AppError);
    });

    it('should return empty FeatureCollection when no buildings found', async () => {
      const bbox: BoundingBox = {
        minLon: 0,
        minLat: 0,
        maxLon: 1,
        maxLat: 1,
      };

      mockPoolQuery.mockResolvedValue({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: [],
      });

      const result = await service.queryByBoundingBox(bbox, 100);

      expect(result.type).toBe('FeatureCollection');
      expect(result.features).toHaveLength(0);
      expect(result.metadata.count).toBe(0);
    });

    it('should handle database errors gracefully', async () => {
      const bbox: BoundingBox = {
        minLon: 12.4,
        minLat: 41.8,
        maxLon: 12.6,
        maxLat: 42.0,
      };

      mockPoolQuery.mockRejectedValue(new Error('Database connection failed'));

      await expect(service.queryByBoundingBox(bbox, 100)).rejects.toThrow(AppError);
      await expect(service.queryByBoundingBox(bbox, 100)).rejects.toThrow('Failed to query buildings');
    });

    it('should use cursor for pagination', async () => {
      const bbox: BoundingBox = {
        minLon: 12.4,
        minLat: 41.8,
        maxLon: 12.6,
        maxLat: 42.0,
      };

      mockPoolQuery.mockResolvedValue({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: [],
      });

      await service.queryByBoundingBox(bbox, 50, 'cursor-id-123');

      expect(mockPoolQuery).toHaveBeenCalledWith(
        expect.stringContaining("AND id > 'cursor-id-123'"),
        [12.4, 41.8, 12.6, 42.0, 50]
      );
    });
  });

  describe('getById', () => {
    it('should retrieve building by ID', async () => {
      const buildingId = 'test-id-1';
      const mockBuilding = {
        id: buildingId,
        name: 'Colosseum',
        address: 'Piazza del Colosseo, 1',
        city: 'Rome',
        country: 'Italy',
        height: 48.5,
        floorCount: 4,
        ifcFileId: 'file-id-1',
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

      const result = await service.getById(buildingId);

      expect(result.type).toBe('Feature');
      expect(result.id).toBe(buildingId);
      expect(result.geometry.type).toBe('Point');
      expect(result.geometry.coordinates).toEqual([12.4924, 41.8902]);
      expect(result.properties.name).toBe('Colosseum');
      expect(result.properties.city).toBe('Rome');

      expect(mockPoolQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1'),
        [buildingId]
      );
    });

    it('should throw 404 when building not found', async () => {
      const buildingId = 'non-existent-id';

      mockPoolQuery.mockResolvedValue({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: [],
      });

      await expect(service.getById(buildingId)).rejects.toThrow(AppError);
      await expect(service.getById(buildingId)).rejects.toThrow('Building not found');
    });

    it('should handle database errors', async () => {
      const buildingId = 'test-id-1';

      mockPoolQuery.mockRejectedValue(new Error('Connection lost'));

      await expect(service.getById(buildingId)).rejects.toThrow(AppError);
      await expect(service.getById(buildingId)).rejects.toThrow('Failed to retrieve building');
    });
  });

  describe('disconnect', () => {
    it('should close database connection', async () => {
      const mockPoolEnd = pool.end as jest.MockedFunction<typeof pool.end>;
      mockPoolEnd.mockResolvedValue();

      await service.disconnect();

      expect(mockPoolEnd).toHaveBeenCalled();
    });
  });
});
