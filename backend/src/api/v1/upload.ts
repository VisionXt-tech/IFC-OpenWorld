/**
 * Upload endpoints
 * POST /api/v1/upload/request - Request presigned upload URL
 * POST /api/v1/upload/complete - Mark upload as complete
 */

import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { pool } from '../../db/pool.js';
import { s3Service } from '../../services/s3Service.js';
import { logger } from '../../utils/logger.js';
import { AppError } from '../../middleware/errorHandler.js';

const router = Router();

// Request body schema for upload request
const uploadRequestSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileSize: z.number().positive().int(),
  contentType: z.string().regex(/^[\w-]+\/[\w-+.]+$/), // MIME type validation
});

// Request body schema for upload complete
const uploadCompleteSchema = z.object({
  fileId: z.string().uuid(),
  s3Key: z.string().min(1),
});

/**
 * POST /api/v1/upload/request
 * Request presigned URL for direct browser upload
 */
router.post('/request', async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request body
    const { fileName, fileSize, contentType } = uploadRequestSchema.parse(req.body);

    // Validate file extension (IFC only)
    if (!fileName.toLowerCase().endsWith('.ifc')) {
      throw new AppError(400, 'Only .ifc files are supported');
    }

    // Validate MIME type
    const allowedMimeTypes = ['application/x-step', 'application/ifc', 'text/plain'];
    if (!allowedMimeTypes.includes(contentType)) {
      throw new AppError(400, `Invalid content type. Allowed: ${allowedMimeTypes.join(', ')}`);
    }

    // Generate unique S3 key (without bucket name prefix)
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 15);
    const s3Key = `${timestamp}-${randomSuffix}-${fileName}`;

    // Generate presigned URL
    const presignedUrl = await s3Service.generatePresignedUrl(s3Key, contentType, fileSize);

    // Create database record (status: pending)
    const result = await pool.query(
      `INSERT INTO ifc_files (file_name, file_size, s3_key, upload_status, processing_status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, file_name as "fileName", file_size as "fileSize", s3_key as "s3Key",
                 upload_status as "uploadStatus", processing_status as "processingStatus"`,
      [fileName, fileSize, s3Key, 'pending', 'not_started']
    );
    const ifcFile = result.rows[0] as {
      id: string;
      fileName: string;
      fileSize: number;
      s3Key: string;
      uploadStatus: string;
      processingStatus: string;
    };

    logger.info('Upload request created', {
      fileId: ifcFile.id,
      fileName,
      fileSize,
      s3Key,
    });

    res.status(200).json({
      fileId: ifcFile.id,
      presignedUrl,
      s3Key,
      expiresIn: 900, // 15 minutes
    });
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

    logger.error('Upload request failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * POST /api/v1/upload/complete
 * Mark upload as complete after browser finishes uploading
 */
router.post('/complete', async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request body
    const { fileId, s3Key } = uploadCompleteSchema.parse(req.body);

    // Find existing file record
    const findResult = await pool.query(
      `SELECT id, file_name as "fileName", file_size as "fileSize", s3_key as "s3Key",
              upload_status as "uploadStatus", processing_status as "processingStatus"
       FROM ifc_files
       WHERE id = $1`,
      [fileId]
    );

    if (findResult.rows.length === 0) {
      throw new AppError(404, 'File record not found');
    }

    const ifcFile = findResult.rows[0] as {
      id: string;
      fileName: string;
      fileSize: number;
      s3Key: string;
      uploadStatus: string;
      processingStatus: string;
    };

    // Verify S3 key matches
    if (ifcFile.s3Key !== s3Key) {
      throw new AppError(400, 'S3 key mismatch');
    }

    // Verify file exists in S3
    const fileExists = await s3Service.fileExists(s3Key);
    if (!fileExists) {
      throw new AppError(400, 'File not found in storage');
    }

    // Update status to completed
    const updateResult = await pool.query(
      `UPDATE ifc_files
       SET upload_status = $1, uploaded_at = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING id, file_name as "fileName", file_size as "fileSize", s3_key as "s3Key",
                 upload_status as "uploadStatus", processing_status as "processingStatus"`,
      ['completed', new Date(), fileId]
    );
    const updatedFile = updateResult.rows[0] as {
      id: string;
      fileName: string;
      fileSize: number;
      s3Key: string;
      uploadStatus: string;
      processingStatus: string;
    };

    logger.info('Upload completed', {
      fileId,
      s3Key,
      fileName: updatedFile.fileName,
    });

    res.status(200).json({
      success: true,
      fileId: updatedFile.id,
      fileName: updatedFile.fileName,
      uploadStatus: updatedFile.uploadStatus,
      processingStatus: updatedFile.processingStatus,
    });
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

    logger.error('Upload complete failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export { router as uploadRouter };
