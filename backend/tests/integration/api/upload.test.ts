/**
 * Integration tests for /api/v1/upload endpoints
 */

import request from 'supertest';
import { createTestApp } from '../../helpers/testApp.js';
import { pool } from '../../../src/db/pool.js';
import { S3Service } from '../../../src/services/s3Service.js';

// Mock database pool
jest.mock('../../../src/db/pool.js', () => ({
  pool: {
    query: jest.fn(),
  },
}));

// Mock S3Service
jest.mock('../../../src/services/s3Service.js');

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

describe('POST /api/v1/upload', () => {
  const app = createTestApp();
  const mockPoolQuery = pool.query as jest.MockedFunction<typeof pool.query>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('/request - Request presigned URL', () => {
    it('should generate presigned URL for valid IFC file', async () => {
      const mockFileId = 'test-file-id-123';
      const mockPresignedUrl = 'https://s3.amazonaws.com/bucket/file.ifc?signature=...';

      mockPoolQuery.mockResolvedValue({
        rows: [
          {
            id: mockFileId,
            fileName: 'test.ifc',
            fileSize: 1024000,
            s3Key: 'ifc-raw/test.ifc',
            uploadStatus: 'pending',
            processingStatus: 'not_started',
          },
        ],
        command: 'INSERT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      // Mock S3Service.generatePresignedUrl
      const mockS3Service = S3Service as jest.MockedClass<typeof S3Service>;
      mockS3Service.prototype.generatePresignedUrl = jest
        .fn()
        .mockResolvedValue(mockPresignedUrl);

      const response = await request(app)
        .post('/api/v1/upload/request')
        .send({
          fileName: 'test.ifc',
          fileSize: 1024000,
          contentType: 'application/x-step',
        })
        .expect(200);

      expect(response.body).toHaveProperty('fileId', mockFileId);
      expect(response.body).toHaveProperty('presignedUrl', mockPresignedUrl);
      expect(response.body).toHaveProperty('s3Key');
      expect(response.body).toHaveProperty('expiresIn', 900);
    });

    it('should reject non-IFC files', async () => {
      const response = await request(app)
        .post('/api/v1/upload/request')
        .send({
          fileName: 'document.pdf',
          fileSize: 1024000,
          contentType: 'application/pdf',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Only .ifc files are supported');
    });

    it('should reject invalid content types', async () => {
      const response = await request(app)
        .post('/api/v1/upload/request')
        .send({
          fileName: 'test.ifc',
          fileSize: 1024000,
          contentType: 'application/pdf',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid content type');
    });

    it('should validate request body with Zod', async () => {
      const response = await request(app)
        .post('/api/v1/upload/request')
        .send({
          fileName: '',
          fileSize: -1,
          contentType: 'invalid',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation Error');
      expect(response.body).toHaveProperty('details');
    });

    it('should handle database errors', async () => {
      mockPoolQuery.mockRejectedValue(new Error('Database error'));

      const mockS3Service = S3Service as jest.MockedClass<typeof S3Service>;
      mockS3Service.prototype.generatePresignedUrl = jest
        .fn()
        .mockResolvedValue('https://s3.amazonaws.com/bucket/file.ifc');

      const response = await request(app)
        .post('/api/v1/upload/request')
        .send({
          fileName: 'test.ifc',
          fileSize: 1024000,
          contentType: 'application/x-step',
        })
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Internal Server Error');
    });
  });

  describe('/complete - Mark upload as complete', () => {
    it('should mark upload as complete when file exists in S3', async () => {
      const fileId = 'test-file-id-123';
      const s3Key = 'ifc-raw/test.ifc';

      // Mock finding existing file
      mockPoolQuery.mockResolvedValueOnce({
        rows: [
          {
            id: fileId,
            fileName: 'test.ifc',
            fileSize: 1024000,
            s3Key,
            uploadStatus: 'pending',
            processingStatus: 'not_started',
          },
        ],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      // Mock updating file status
      mockPoolQuery.mockResolvedValueOnce({
        rows: [
          {
            id: fileId,
            fileName: 'test.ifc',
            fileSize: 1024000,
            s3Key,
            uploadStatus: 'completed',
            processingStatus: 'not_started',
          },
        ],
        command: 'UPDATE',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      // Mock S3Service.fileExists
      const mockS3Service = S3Service as jest.MockedClass<typeof S3Service>;
      mockS3Service.prototype.fileExists = jest.fn().mockResolvedValue(true);

      const response = await request(app)
        .post('/api/v1/upload/complete')
        .send({
          fileId,
          s3Key,
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('fileId', fileId);
      expect(response.body).toHaveProperty('uploadStatus', 'completed');
    });

    it('should return 404 when file record not found', async () => {
      mockPoolQuery.mockResolvedValue({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: [],
      });

      const response = await request(app)
        .post('/api/v1/upload/complete')
        .send({
          fileId: 'non-existent-id',
          s3Key: 'ifc-raw/test.ifc',
        })
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('File record not found');
    });

    it('should return 400 when S3 key mismatch', async () => {
      mockPoolQuery.mockResolvedValue({
        rows: [
          {
            id: 'test-id',
            fileName: 'test.ifc',
            fileSize: 1024000,
            s3Key: 'ifc-raw/original.ifc',
            uploadStatus: 'pending',
            processingStatus: 'not_started',
          },
        ],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const response = await request(app)
        .post('/api/v1/upload/complete')
        .send({
          fileId: 'test-id',
          s3Key: 'ifc-raw/different.ifc',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('S3 key mismatch');
    });

    it('should return 400 when file not found in S3', async () => {
      const fileId = 'test-id';
      const s3Key = 'ifc-raw/test.ifc';

      mockPoolQuery.mockResolvedValue({
        rows: [
          {
            id: fileId,
            fileName: 'test.ifc',
            fileSize: 1024000,
            s3Key,
            uploadStatus: 'pending',
            processingStatus: 'not_started',
          },
        ],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      // Mock S3Service.fileExists returning false
      const mockS3Service = S3Service as jest.MockedClass<typeof S3Service>;
      mockS3Service.prototype.fileExists = jest.fn().mockResolvedValue(false);

      const response = await request(app)
        .post('/api/v1/upload/complete')
        .send({
          fileId,
          s3Key,
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('File not found in storage');
    });

    it('should validate request body with Zod', async () => {
      const response = await request(app)
        .post('/api/v1/upload/complete')
        .send({
          fileId: 'invalid-uuid',
          s3Key: '',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation Error');
      expect(response.body).toHaveProperty('details');
    });
  });
});
