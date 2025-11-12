/**
 * 3D Models endpoints
 * GET /api/v1/models/:filename - Download 3D model file (glTF/glB) from S3
 */

import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { s3Service } from '../../services/s3Service.js';
import { logger } from '../../utils/logger.js';
import { AppError } from '../../middleware/errorHandler.js';
import { Readable } from 'stream';

const router = Router();

// Path parameter schema for filename
const filenameSchema = z.object({
  filename: z.string().regex(/^[a-f0-9-]+\.(glb|gltf)$/, {
    message: 'Filename must be a UUID with .glb or .gltf extension',
  }),
});

/**
 * GET /api/v1/models/:filename
 * Download 3D model file from S3/MinIO storage
 *
 * Example: GET /api/v1/models/550e8400-e29b-41d4-a716-446655440000.glb
 */
router.get('/:filename', async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate filename parameter
    const { filename } = filenameSchema.parse(req.params);

    logger.info('3D model download requested', { filename });

    // Construct S3 key: models/{filename}
    const s3Key = `models/${filename}`;

    // Get file metadata first (content type and size)
    const metadata = await s3Service.getFileMetadata(s3Key);

    // Set appropriate content type for glTF files
    const contentType = filename.endsWith('.glb')
      ? 'model/gltf-binary'
      : 'model/gltf+json';

    // Set response headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', metadata.contentLength);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year (immutable)
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

    // Enable CORS for 3D model files (needed for Cesium)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Download file from S3 and pipe to response
    const fileStream = await s3Service.downloadFile(s3Key);

    // Pipe the stream to response
    if (fileStream instanceof Readable) {
      fileStream.pipe(res);

      // Handle stream errors
      fileStream.on('error', (error) => {
        logger.error('Stream error while downloading 3D model', {
          filename,
          error: error.message,
        });

        if (!res.headersSent) {
          res.status(500).json({
            error: 'Failed to stream file',
            message: 'An error occurred while downloading the file',
          });
        }
      });
    } else {
      throw new AppError(500, 'Invalid stream type');
    }

    logger.info('3D model download completed', { filename });
  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Invalid filename',
        message: error.errors[0]?.message || 'Invalid filename format',
      });
      return;
    }

    // Handle AppError (from s3Service)
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        error: error.message,
        message: error.statusCode === 404 ? 'Model file not found' : 'Failed to download model',
      });
      return;
    }

    // Handle unexpected errors
    logger.error('Unexpected error downloading 3D model', {
      filename: req.params.filename,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred',
    });
  }
});

/**
 * OPTIONS /api/v1/models/:filename
 * Handle preflight CORS requests
 */
router.options('/:filename', (req: Request, res: Response): void => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.status(204).send();
});

export { router as modelsRouter };
