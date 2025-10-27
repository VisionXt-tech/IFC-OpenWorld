/**
 * BuildingService - Handles spatial queries for buildings
 * Uses PostGIS for geospatial operations
 */

import { pool } from '../db/pool.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../middleware/errorHandler.js';

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
   * @param bbox - Bounding box coordinates
   * @param limit - Maximum number of results (default: 100, max: 1000)
   * @param cursor - Cursor for pagination (building ID)
   * @returns GeoJSON FeatureCollection
   */
  async queryByBoundingBox(
    bbox: BoundingBox,
    limit: number = 100,
    cursor?: string
  ): Promise<FeatureCollection> {
    try {
      // Validate inputs
      this.validateBoundingBox(bbox);

      if (limit < 1 || limit > 1000) {
        throw new AppError(400, 'Limit must be between 1 and 1000');
      }

      const { minLon, minLat, maxLon, maxLat } = bbox;

      // Build PostGIS ST_Within query
      // ST_Within(location, ST_MakeEnvelope(minLon, minLat, maxLon, maxLat, 4326))
      const whereClause = cursor ? `AND id > '${cursor}'` : '';

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
        WHERE ST_Within(
          location::geometry,
          ST_MakeEnvelope($1, $2, $3, $4, 4326)
        )
        ${whereClause}
        ORDER BY id
        LIMIT $5
      `;

      const result = await pool.query(query, [minLon, minLat, maxLon, maxLat, limit]);
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
        },
      }));

      logger.info('Buildings queried by bounding box', {
        bbox,
        count: features.length,
        limit,
        cursor,
      });

      return {
        type: 'FeatureCollection',
        features,
        metadata: {
          count: features.length,
          bbox,
        },
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      logger.error('Failed to query buildings by bounding box', {
        bbox,
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

      if (buildings.length === 0) {
        throw new AppError(404, 'Building not found');
      }

      const building = buildings[0]!;

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
   * Close database connection (for testing/cleanup)
   */
  async disconnect(): Promise<void> {
    await pool.end();
    logger.info('BuildingService disconnected');
  }
}

// Singleton instance
export const buildingService = new BuildingService();
