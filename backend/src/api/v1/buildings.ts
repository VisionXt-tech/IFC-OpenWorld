/**
 * Buildings endpoints
 * GET /api/v1/buildings?bbox=minLon,minLat,maxLon,maxLat - Query by bounding box
 * GET /api/v1/buildings/:id - Get building by ID
 */

import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { buildingService } from '../../services/buildingService.js';
import { logger } from '../../utils/logger.js';
import { AppError } from '../../middleware/errorHandler.js';
import { validateCsrfToken } from '../../middleware/csrf.js';

const router = Router();

// Query string schema for bounding box
const bboxQuerySchema = z.object({
  bbox: z.string().regex(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?$/, {
    message: 'bbox must be in format: minLon,minLat,maxLon,maxLat',
  }).optional(),
  limit: z.coerce.number().int().min(1).max(1000).optional().default(100),
  cursor: z.string().uuid().optional(),
});

// Path parameter schema for building ID
const buildingIdSchema = z.object({
  id: z.string().uuid({ message: 'Invalid building ID format' }),
});

/**
 * GET /api/v1/buildings?bbox=minLon,minLat,maxLon,maxLat&limit=100&cursor=uuid
 * Query buildings within a bounding box (or all buildings if bbox not provided)
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate query parameters
    const { bbox: bboxString, limit, cursor } = bboxQuerySchema.parse(req.query);

    // Parse bounding box coordinates if provided
    let bbox: { minLon: number; minLat: number; maxLon: number; maxLat: number } | undefined;

    if (bboxString) {
      const coords = bboxString.split(',').map(Number);
      const [minLon, minLat, maxLon, maxLat] = coords;
      bbox = {
        minLon: minLon!,
        minLat: minLat!,
        maxLon: maxLon!,
        maxLat: maxLat!,
      };
    }

    // Query buildings (with or without bbox)
    const featureCollection = await buildingService.queryByBoundingBox(bbox, limit, cursor);

    logger.info('Buildings query successful', {
      bbox: bbox || 'all',
      limit,
      cursor,
      resultCount: featureCollection.features.length,
    });

    // Add pagination links if more results available
    const response: {
      type: string;
      features: typeof featureCollection.features;
      metadata: typeof featureCollection.metadata & {
        nextCursor?: string;
      };
    } = {
      ...featureCollection,
      metadata: {
        ...featureCollection.metadata,
      },
    };

    // If we got the full limit, there might be more results
    if (featureCollection.features.length === limit) {
      const lastFeature = featureCollection.features[featureCollection.features.length - 1];
      if (lastFeature) {
        response.metadata.nextCursor = lastFeature.id;
      }
    }

    // OPT-002: Add caching headers for performance
    // Cache for 5 minutes (buildings don't change frequently)
    res.setHeader('Cache-Control', 'public, max-age=300, must-revalidate');

    // Generate ETag based on response content
    const etag = `W/"${Buffer.from(JSON.stringify(response)).toString('base64').substring(0, 27)}"`;
    res.setHeader('ETag', etag);

    // Check if client has cached version
    if (req.headers['if-none-match'] === etag) {
      res.status(304).end(); // Not Modified
      return;
    }

    res.status(200).json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation Error',
        details: error.errors,
      });
      return;
    }

    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }

    logger.error('Buildings query failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * GET /api/v1/buildings/:id
 * Get building by UUID
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate path parameter
    const { id } = buildingIdSchema.parse(req.params);

    // Get building
    const building = await buildingService.getById(id);

    logger.info('Building retrieved', { id });

    res.status(200).json(building);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation Error',
        details: error.errors,
      });
      return;
    }

    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }

    logger.error('Building retrieval failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * DELETE /api/v1/buildings/:id
 * Delete building by UUID (including associated IFC file)
 */
router.delete('/:id', validateCsrfToken, async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate path parameter
    const { id } = buildingIdSchema.parse(req.params);

    // Delete building (cascade deletes IFC file)
    await buildingService.deleteById(id);

    logger.info('Building deleted', { id });

    res.status(204).send();
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation Error',
        details: error.errors,
      });
      return;
    }

    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }

    logger.error('Building deletion failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export { router as buildingsRouter };
