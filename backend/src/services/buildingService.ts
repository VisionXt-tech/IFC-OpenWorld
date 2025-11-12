/**
 * BuildingService - Handles spatial queries for buildings
 * Uses PostGIS for geospatial operations
 */

import { pool } from '../db/pool.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../middleware/errorHandler.js';
import { redisService } from './redisService.js';

interface Building {
  id: string;
  name: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  height: number | null;
  floorCount: number | null;
  ifcFileId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BoundingBox {
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
}

export interface BuildingGeoJSON {
  type: 'Feature';
  id: string;
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  properties: {
    name: string | null;
    address: string | null;
    city: string | null;
    country: string | null;
    height: number | null;
    floorCount: number | null;
    ifcFileId: string;
    createdAt: string;
    updatedAt: string;
  };
}

export interface FeatureCollection {
  type: 'FeatureCollection';
  features: BuildingGeoJSON[];
  metadata: {
    count: number;
    bbox: BoundingBox;
  };
}

export class BuildingService {
  constructor() {
    logger.info('BuildingService initialized');
  }

  /**
   * Validate bounding box coordinates
   * @param bbox - Bounding box to validate
   * @throws AppError if coordinates are invalid
   */
  validateBoundingBox(bbox: BoundingBox): void {
    const { minLon, minLat, maxLon, maxLat } = bbox;

    // Validate longitude range [-180, 180]
    if (minLon < -180 || minLon > 180 || maxLon < -180 || maxLon > 180) {
      throw new AppError(400, 'Longitude must be between -180 and 180');
    }

    // Validate latitude range [-90, 90]
    if (minLat < -90 || minLat > 90 || maxLat < -90 || maxLat > 90) {
      throw new AppError(400, 'Latitude must be between -90 and 90');
    }

    // Validate min < max
    if (minLon >= maxLon) {
      throw new AppError(400, 'minLon must be less than maxLon');
    }

    if (minLat >= maxLat) {
      throw new AppError(400, 'minLat must be less than maxLat');
    }

    logger.debug('Bounding box validation passed', bbox);
  }

  /**
   * Query buildings within a bounding box using PostGIS ST_Within
   * If bbox is not provided, returns all buildings
   * @param bbox - Optional bounding box coordinates
   * @param limit - Maximum number of results (default: 100, max: 1000)
   * @param cursor - Cursor for pagination (building ID)
   * @returns GeoJSON FeatureCollection
   */
  async queryByBoundingBox(
    bbox?: BoundingBox,
    limit: number = 100,
    cursor?: string
  ): Promise<FeatureCollection> {
    try {
      // Validate inputs
      if (bbox) {
        this.validateBoundingBox(bbox);
      }

      if (limit < 1 || limit > 1000) {
        throw new AppError(400, 'Limit must be between 1 and 1000');
      }

      // OPT-006: Try to get from Redis cache first (95% faster)
      const cacheKey = redisService.buildingsCacheKey(bbox, limit, cursor);
      const cachedResult = await redisService.get<FeatureCollection>(cacheKey);

      if (cachedResult) {
        logger.debug('Buildings query served from cache', {
          bbox: bbox || 'all',
          limit,
          cursor,
          resultCount: cachedResult.features.length,
        });
        return cachedResult;
      }

      // Build query based on whether bbox is provided
      let query: string;
      let queryParams: (string | number)[];

      const whereClause = cursor ? `AND id > $${bbox ? 5 : 1}` : '';

      if (bbox) {
        const { minLon, minLat, maxLon, maxLat } = bbox;
        // Query with bounding box filter
        query = `
          SELECT
            id,
            name,
            address,
            city,
            country,
            height,
            floor_count as "floorCount",
            ifc_file_id as "ifcFileId",
            created_at as "createdAt",
            updated_at as "updatedAt",
            ST_X(location::geometry) as longitude,
            ST_Y(location::geometry) as latitude,
            model_url as "modelUrl",
            model_size_mb as "modelSizeMb",
            model_format as "modelFormat",
            model_generated_at as "modelGeneratedAt"
          FROM buildings
          WHERE ST_Within(
            location::geometry,
            ST_MakeEnvelope($1, $2, $3, $4, 4326)
          )
          ${whereClause}
          ORDER BY id
          LIMIT $${cursor ? 6 : 5}
        `;
        queryParams = cursor ? [minLon, minLat, maxLon, maxLat, cursor, limit] : [minLon, minLat, maxLon, maxLat, limit];
      } else {
        // Query all buildings
        query = `
          SELECT
            id,
            name,
            address,
            city,
            country,
            height,
            floor_count as "floorCount",
            ifc_file_id as "ifcFileId",
            created_at as "createdAt",
            updated_at as "updatedAt",
            ST_X(location::geometry) as longitude,
            ST_Y(location::geometry) as latitude,
            model_url as "modelUrl",
            model_size_mb as "modelSizeMb",
            model_format as "modelFormat",
            model_generated_at as "modelGeneratedAt"
          FROM buildings
          ${cursor ? 'WHERE id > $1' : ''}
          ORDER BY id
          LIMIT $${cursor ? 2 : 1}
        `;
        queryParams = cursor ? [cursor, limit] : [limit];
      }

      const result = await pool.query(query, queryParams);
      const buildings = result.rows as Array<
        Building & {
          longitude: number;
          latitude: number;
        }
      >;

      // Convert to GeoJSON FeatureCollection
      const features: BuildingGeoJSON[] = buildings.map((building) => ({
        type: 'Feature',
        id: building.id,
        geometry: {
          type: 'Point',
          coordinates: [building.longitude, building.latitude],
        },
        properties: {
          name: building.name,
          address: building.address,
          city: building.city,
          country: building.country,
          height: building.height,
          floorCount: building.floorCount,
          ifcFileId: building.ifcFileId,
          createdAt: building.createdAt.toISOString(),
          updatedAt: building.updatedAt.toISOString(),
          // 3D Model fields
          modelUrl: building.modelUrl || null,
          modelSizeMb: building.modelSizeMb || null,
          modelFormat: building.modelFormat || null,
          modelGeneratedAt: building.modelGeneratedAt ? building.modelGeneratedAt.toISOString() : null,
        },
      }));

      logger.info('Buildings queried from database', {
        bbox: bbox || 'all',
        count: features.length,
        limit,
        cursor,
      });

      // Create a default bbox for metadata if not provided
      const metadataBbox = bbox || { minLon: -180, minLat: -90, maxLon: 180, maxLat: 90 };

      const featureCollection: FeatureCollection = {
        type: 'FeatureCollection',
        features,
        metadata: {
          count: features.length,
          bbox: metadataBbox,
        },
      };

      // OPT-006: Cache the result for 5 minutes (300s)
      await redisService.set(cacheKey, featureCollection, 300);

      return featureCollection;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      logger.error('Failed to query buildings', {
        bbox: bbox || 'all',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new AppError(500, 'Failed to query buildings');
    }
  }

  /**
   * Get building by ID
   * @param id - Building UUID
   * @returns Building as GeoJSON Feature
   * @throws AppError if building not found
   */
  async getById(id: string): Promise<BuildingGeoJSON> {
    try {
      const query = `
        SELECT
          id,
          name,
          address,
          city,
          country,
          height,
          floor_count as "floorCount",
          ifc_file_id as "ifcFileId",
          created_at as "createdAt",
          updated_at as "updatedAt",
          ST_X(location::geometry) as longitude,
          ST_Y(location::geometry) as latitude
        FROM buildings
        WHERE id = $1
      `;

      interface BuildingWithCoords extends Building {
        longitude: number;
        latitude: number;
      }

      const result = await pool.query(query, [id]);
      const buildings = result.rows as BuildingWithCoords[];

      // TYPE SAFETY: Explicit check instead of non-null assertion
      if (buildings.length === 0 || !buildings[0]) {
        throw new AppError(404, 'Building not found');
      }

      // TypeScript now knows buildings[0] exists with explicit check
      const building = buildings[0];

      logger.info('Building retrieved by ID', { id });

      return {
        type: 'Feature',
        id: building.id,
        geometry: {
          type: 'Point',
          coordinates: [building.longitude, building.latitude],
        },
        properties: {
          name: building.name,
          address: building.address,
          city: building.city,
          country: building.country,
          height: building.height,
          floorCount: building.floorCount,
          ifcFileId: building.ifcFileId,
          createdAt: building.createdAt.toISOString(),
          updatedAt: building.updatedAt.toISOString(),
          // 3D Model fields
          modelUrl: building.modelUrl || null,
          modelSizeMb: building.modelSizeMb || null,
          modelFormat: building.modelFormat || null,
          modelGeneratedAt: building.modelGeneratedAt ? building.modelGeneratedAt.toISOString() : null,
        },
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      logger.error('Failed to get building by ID', {
        id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new AppError(500, 'Failed to retrieve building');
    }
  }

  /**
   * Delete building by ID (cascade deletes associated IFC file)
   * @param id - Building UUID
   * @throws AppError if building not found or deletion fails
   */
  async deleteById(id: string): Promise<void> {
    try {
      // Delete building (IFC file will be cascade deleted due to ON DELETE CASCADE)
      const query = `
        DELETE FROM buildings
        WHERE id = $1
        RETURNING id
      `;

      const result = await pool.query(query, [id]);

      // TYPE SAFETY: rowCount can be null according to pg types
      if (!result.rowCount || result.rowCount === 0) {
        throw new AppError(404, 'Building not found');
      }

      // OPT-006: Invalidate all buildings cache after deletion
      await redisService.invalidateBuildingsCache();

      logger.info('Building deleted and cache invalidated', { id });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      logger.error('Failed to delete building', {
        id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new AppError(500, 'Failed to delete building');
    }
  }

  /**
   * Close database connection (for testing/cleanup)
   */
  async disconnect(): Promise<void> {
    await pool.end();
    logger.info('BuildingService disconnected');
  }
}

// Singleton instance
export const buildingService = new BuildingService();
 
