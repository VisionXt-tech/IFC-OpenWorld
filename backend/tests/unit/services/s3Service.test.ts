/**
 * Unit tests for S3Service
 * Tests presigned URL generation and file validation
 */

import { S3Service } from '../../../src/services/s3Service.js';
import { AppError } from '../../../src/middleware/errorHandler.js';
import { S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Mock AWS SDK
jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/s3-request-presigner');

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
    s3: {
      endpoint: 'http://localhost:9000',
      region: 'us-east-1',
      bucket: 'ifc-raw-test',
      accessKeyId: 'minioadmin',
      secretAccessKey: 'minioadmin',
      forcePathStyle: true,
      presignedUrlExpiry: 900,
    },
    upload: {
      maxFileSizeMB: 100,
    },
  },
}));

describe('S3Service', () => {
  let service: S3Service;
  const mockS3Client = S3Client as jest.MockedClass<typeof S3Client>;
  const mockGetSignedUrl = getSignedUrl as jest.MockedFunction<typeof getSignedUrl>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockS3Client.mockImplementation(() => ({
      send: jest.fn(),
    }) as any);
    service = new S3Service();
  });

  describe('validateFileSize', () => {
    it('should accept file within size limit', () => {
      const fileSizeBytes = 50 * 1024 * 1024; // 50 MB

      expect(() => service.validateFileSize(fileSizeBytes)).not.toThrow();
    });

    it('should reject file exceeding max size', () => {
      const fileSizeBytes = 101 * 1024 * 1024; // 101 MB

      expect(() => service.validateFileSize(fileSizeBytes)).toThrow(AppError);
      expect(() => service.validateFileSize(fileSizeBytes)).toThrow(/exceeds maximum allowed size/);
    });

    it('should accept file at exact max size', () => {
      const fileSizeBytes = 100 * 1024 * 1024; // 100 MB exactly

      expect(() => service.validateFileSize(fileSizeBytes)).not.toThrow();
    });

    it('should accept small files', () => {
      const fileSizeBytes = 1024; // 1 KB

      expect(() => service.validateFileSize(fileSizeBytes)).not.toThrow();
    });
  });

  describe('generatePresignedUrl', () => {
    it('should generate presigned URL for valid file', async () => {
      const key = 'test-folder/test-file.ifc';
      const contentType = 'application/x-step';
      const fileSizeBytes = 10 * 1024 * 1024; // 10 MB

      const mockPresignedUrl = 'https://s3.amazonaws.com/bucket/test-file.ifc?X-Amz-Signature=...';
      mockGetSignedUrl.mockResolvedValue(mockPresignedUrl);

      const result = await service.generatePresignedUrl(key, contentType, fileSizeBytes);

      expect(result).toBe(mockPresignedUrl);
      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(Object),
        expect.objectContaining({ expiresIn: 900 })
      );
    });

    it('should reject file exceeding size limit', async () => {
      const key = 'test-folder/large-file.ifc';
      const contentType = 'application/x-step';
      const fileSizeBytes = 150 * 1024 * 1024; // 150 MB (exceeds 100 MB limit)

      await expect(
        service.generatePresignedUrl(key, contentType, fileSizeBytes)
      ).rejects.toThrow(AppError);
    });

    it('should handle AWS SDK errors gracefully', async () => {
      const key = 'test-folder/test-file.ifc';
      const contentType = 'application/x-step';
      const fileSizeBytes = 10 * 1024 * 1024;

      mockGetSignedUrl.mockRejectedValue(new Error('AWS service unavailable'));

      await expect(
        service.generatePresignedUrl(key, contentType, fileSizeBytes)
      ).rejects.toThrow(AppError);
      await expect(
        service.generatePresignedUrl(key, contentType, fileSizeBytes)
      ).rejects.toThrow(/Failed to generate/);
    });
  });

  describe('fileExists', () => {
    it('should return true when file exists', async () => {
      const key = 'test-folder/existing-file.ifc';

      // Mock successful HeadObject response
      const mockSend = jest.fn().mockResolvedValue({
        ContentLength: 1024,
        ContentType: 'application/x-step',
      });

      mockS3Client.mockImplementation(() => ({
        send: mockSend,
      }) as any);

      // Recreate service with new mock
      service = new S3Service();

      const result = await service.fileExists(key);

      expect(result).toBe(true);
      expect(mockSend).toHaveBeenCalled();
    });

    it('should return false when file does not exist', async () => {
      const key = 'test-folder/non-existent-file.ifc';

      // Mock NotFound error
      const mockSend = jest.fn().mockRejectedValue({
        name: 'NotFound',
        $metadata: { httpStatusCode: 404 },
      });

      mockS3Client.mockImplementation(() => ({
        send: mockSend,
      }) as any);

      service = new S3Service();

      const result = await service.fileExists(key);

      expect(result).toBe(false);
    });
  });

  describe('getPublicUrl', () => {
    it('should generate correct public URL with path style', () => {
      const key = 'test-folder/test-file.ifc';

      const result = service.getPublicUrl(key);

      expect(result).toContain('http://localhost:9000');
      expect(result).toContain('ifc-raw-test');
      expect(result).toContain(key);
      expect(result).toBe('http://localhost:9000/ifc-raw-test/test-folder/test-file.ifc');
    });

    it('should handle nested paths', () => {
      const key = 'level1/level2/level3/file.ifc';

      const result = service.getPublicUrl(key);

      expect(result).toBe('http://localhost:9000/ifc-raw-test/level1/level2/level3/file.ifc');
    });
  });
});
