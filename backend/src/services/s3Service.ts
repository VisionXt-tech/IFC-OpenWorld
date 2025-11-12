/**
 * S3Service - Handles file uploads to S3-compatible storage (MinIO)
 * Generates presigned URLs for direct browser uploads
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../middleware/errorHandler.js';

export class S3Service {
  private s3Client: S3Client;
  private bucketName: string;

  constructor() {
    this.bucketName = config.s3.bucket;
    this.s3Client = new S3Client({
      endpoint: config.s3.endpoint,
      region: config.s3.region,
      credentials: {
        accessKeyId: config.s3.accessKeyId,
        secretAccessKey: config.s3.secretAccessKey,
      },
      forcePathStyle: true, // Required for MinIO
      // Disable automatic checksums to avoid CORS issues with x-amz-checksum-* headers
      requestChecksumCalculation: 'WHEN_REQUIRED',
    });

    logger.info('S3Service initialized', {
      endpoint: config.s3.endpoint,
      bucket: this.bucketName,
      region: config.s3.region,
    });
  }

  /**
   * Validate file size against configured maximum
   * @param fileSizeBytes - File size in bytes
   * @throws AppError if file exceeds maximum size
   */
  validateFileSize(fileSizeBytes: number): void {
    const maxSizeBytes = config.upload.maxFileSizeMB * 1024 * 1024;

    if (fileSizeBytes > maxSizeBytes) {
      const fileSizeMB = (fileSizeBytes / (1024 * 1024)).toFixed(2);
      throw new AppError(
        400,
        `File size ${fileSizeMB} MB exceeds maximum allowed size of ${config.upload.maxFileSizeMB} MB`
      );
    }

    logger.debug('File size validation passed', {
      fileSizeBytes,
      maxSizeBytes,
    });
  }

  /**
   * Generate presigned URL for direct browser upload
   * @param key - S3 object key (file path)
   * @param contentType - MIME type of file
   * @param fileSizeBytes - File size for validation
   * @returns Presigned URL valid for 15 minutes
   */
  async generatePresignedUrl(
    key: string,
    contentType: string,
    fileSizeBytes: number
  ): Promise<string> {
    try {
      // Validate file size first
      this.validateFileSize(fileSizeBytes);

      // Create PutObject command
      // Do NOT include ContentLength in presigned URL - browser will set it automatically
      // Including it causes AWS signature mismatch when browser sends the actual request
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        ContentType: contentType,
      });

      // Generate presigned URL (valid for 15 minutes)
      const presignedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: 900, // 15 minutes in seconds
      });

      logger.info('Presigned URL generated', {
        key,
        contentType,
        fileSizeBytes,
        expiresIn: 900,
      });

      return presignedUrl;
    } catch (error) {
      if (error instanceof AppError) {
        throw error; // Re-throw validation errors
      }

      logger.error('Failed to generate presigned URL', {
        key,
        contentType,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new AppError(500, 'Failed to generate upload URL');
    }
  }

  /**
   * Check if a file exists in S3
   * @param key - S3 object key
   * @returns true if file exists, false otherwise
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      const { HeadObjectCommand } = await import('@aws-sdk/client-s3');
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'name' in error) {
        const err = error as { name: string };
        if (err.name === 'NotFound') {
          return false;
        }
      }
      throw error;
    }
  }

  /**
   * Delete a file from S3
   * @param key - S3 object key
   * @throws AppError if deletion fails
   */
  async deleteFile(key: string): Promise<void> {
    try {
      const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);

      logger.info('File deleted from S3', {
        key,
        bucket: this.bucketName,
      });
    } catch (error) {
      logger.error('Failed to delete file from S3', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new AppError(500, 'Failed to delete file from storage');
    }
  }

  /**
   * Get public URL for uploaded file
   * @param key - S3 object key
   * @returns Public URL for the file
   */
  getPublicUrl(key: string): string {
    return `${config.s3.endpoint}/${this.bucketName}/${key}`;
  }

  /**
   * Download file from S3 and return as Node.js stream
   * @param key - S3 object key
   * @returns Node.js Readable stream of the file
   * @throws AppError if download fails
   */
  async downloadFile(key: string): Promise<NodeJS.ReadableStream> {
    try {
      const { GetObjectCommand } = await import('@aws-sdk/client-s3');
      const { Readable } = await import('stream');

      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.s3Client.send(command);

      if (!response.Body) {
        throw new AppError(500, 'Empty response body from S3');
      }

      logger.info('File downloaded from S3', {
        key,
        bucket: this.bucketName,
      });

      // Convert AWS SDK stream to Node.js Readable stream
      return response.Body as NodeJS.ReadableStream;
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'name' in error) {
        const err = error as { name: string };
        if (err.name === 'NoSuchKey' || err.name === 'NotFound') {
          throw new AppError(404, 'File not found');
        }
      }

      logger.error('Failed to download file from S3', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new AppError(500, 'Failed to download file from storage');
    }
  }

  /**
   * Get file metadata from S3
   * @param key - S3 object key
   * @returns File metadata including content type and size
   * @throws AppError if metadata retrieval fails
   */
  async getFileMetadata(key: string): Promise<{ contentType: string; contentLength: number }> {
    try {
      const { HeadObjectCommand } = await import('@aws-sdk/client-s3');
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.s3Client.send(command);

      return {
        contentType: response.ContentType || 'application/octet-stream',
        contentLength: response.ContentLength || 0,
      };
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'name' in error) {
        const err = error as { name: string };
        if (err.name === 'NoSuchKey' || err.name === 'NotFound') {
          throw new AppError(404, 'File not found');
        }
      }

      logger.error('Failed to get file metadata from S3', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new AppError(500, 'Failed to get file metadata');
    }
  }

  /**
   * Download partial file content from S3 (for magic bytes validation)
   * @param key - S3 object key
   * @param start - Start byte position
   * @param end - End byte position
   * @returns Buffer with requested bytes
   * @throws AppError if download fails
   */
  async getObjectPartial(key: string, start: number, end: number): Promise<Buffer> {
    try {
      const { GetObjectCommand } = await import('@aws-sdk/client-s3');
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Range: `bytes=${start}-${end}`, // HTTP Range header
      });

      const response = await this.s3Client.send(command);

      if (!response.Body) {
        throw new Error('Empty response body');
      }

      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      const stream = response.Body as any;

      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      const buffer = Buffer.concat(chunks);

      logger.debug('Downloaded partial file from S3', {
        key,
        start,
        end,
        bytesRead: buffer.length,
      });

      return buffer;
    } catch (error) {
      logger.error('Failed to download partial file from S3', {
        key,
        start,
        end,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new AppError(500, 'Failed to read file from storage');
    }
  }
}

// Singleton instance
export const s3Service = new S3Service();
