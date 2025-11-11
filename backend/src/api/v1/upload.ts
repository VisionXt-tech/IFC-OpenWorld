/**
 * Upload endpoints
 * POST /api/v1/upload/request - Request presigned upload URL
 * POST /api/v1/upload/complete - Mark upload as complete
 */

import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { pool } from '../../db/pool.js';
import { s3Service } from '../../services/s3Service.js';
import { celeryService } from '../../services/celeryService.js';
import { logger } from '../../utils/logger.js';
import { AppError } from '../../middleware/errorHandler.js';
import { validateCsrfToken } from '../../middleware/csrf.js';

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
router.post('/request', validateCsrfToken, async (req: Request, res: Response): Promise<void> => {
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

    // AUTO-CLEANUP: Delete all previous uploads (one-file-at-a-time mode for development)
    logger.info('Cleaning up previous uploads before new upload');

    // Get all existing files from database
    const existingFilesResult = await pool.query(
      `SELECT id, s3_key FROM ifc_files WHERE upload_status != 'deleted' ORDER BY created_at DESC`
    );

    const existingFiles = existingFilesResult.rows as Array<{ id: string; s3_key: string }>;

    if (existingFiles.length > 0) {
      logger.info(`Found ${existingFiles.length} existing file(s) to delete`);

      // Mark all existing files as deleted in database
      await pool.query(
        `UPDATE ifc_files SET upload_status = 'deleted', updated_at = NOW() WHERE upload_status != 'deleted'`
      );

      // Delete all existing files from S3
      for (const file of existingFiles) {
        try {
          await s3Service.deleteFile(file.s3_key);
          logger.info(`Deleted file from S3: ${file.s3_key}`);
        } catch (error) {
          logger.warn(`Failed to delete file from S3: ${file.s3_key}`, {
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          // Continue even if S3 deletion fails
        }
      }

      logger.info('Cleanup complete');
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
router.post('/complete', validateCsrfToken, async (req: Request, res: Response): Promise<void> => {
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

    // Update status to completed and start processing
    const updateResult = await pool.query(
      `UPDATE ifc_files
       SET upload_status = $1, uploaded_at = $2, processing_status = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING id, file_name as "fileName", file_size as "fileSize", s3_key as "s3Key",
                 upload_status as "uploadStatus", processing_status as "processingStatus"`,
      ['completed', new Date(), 'processing', fileId]
    );
    const updatedFile = updateResult.rows[0] as {
      id: string;
      fileName: string;
      fileSize: number;
      s3Key: string;
      uploadStatus: string;
      processingStatus: string;
    };

    logger.info('Upload completed, triggering IFC processing', {
      fileId,
      s3Key,
      fileName: updatedFile.fileName,
    });

    // Trigger Celery task for IFC processing
    const taskId = await celeryService.triggerIFCProcessing(fileId, s3Key);

    logger.info('IFC processing task queued', {
      fileId,
      taskId,
    });

    res.status(200).json({
      success: true,
      fileId: updatedFile.id,
      fileName: updatedFile.fileName,
      uploadStatus: updatedFile.uploadStatus,
      processingStatus: updatedFile.processingStatus,
      taskId, // Return task ID for status polling
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

/**
 * GET /api/v1/upload/status/:taskId
 * Get processing task status
 */
router.get('/status/:taskId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { taskId } = req.params;

    if (!taskId) {
      throw new AppError(400, 'Task ID is required');
    }

    // Get task status from Celery
    const taskResult = await celeryService.getTaskStatus(taskId);

    if (!taskResult) {
      throw new AppError(404, 'Task not found');
    }

    logger.info('Retrieved task status', {
      taskId,
      status: taskResult.status,
    });

    // Extract error message - prefer error from result over traceback
    let errorMessage: string | undefined;
    if (taskResult.status === 'FAILURE') {
      errorMessage = taskResult.traceback || undefined;
    } else if (taskResult.result && typeof taskResult.result === 'object' && 'error' in taskResult.result) {
      // Task returned successfully but with an error in the result
      errorMessage = taskResult.result.error as string;
    }

    res.status(200).json({
      taskId,
      status: taskResult.status,
      result: taskResult.result,
      error: errorMessage,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }

    logger.error('Failed to get task status', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export { router as uploadRouter };
