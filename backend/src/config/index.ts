/**
 * Application configuration
 * Loads from environment variables with validation
 */

import { config as dotenvConfig } from 'dotenv';
import { z } from 'zod';

dotenvConfig();

const configSchema = z.object({
  server: z.object({
    env: z.enum(['development', 'production', 'test']).default('development'),
    port: z.coerce.number().min(1).max(65535).default(3000),
    host: z.string().default('localhost'),
  }),
  database: z.object({
    url: z.string().url(),
  }),
  s3: z.object({
    endpoint: z.string().url().optional(),
    bucket: z.string().min(1),
    accessKeyId: z.string().min(1),
    secretAccessKey: z.string().min(1),
    region: z.string().default('us-east-1'),
    forcePathStyle: z.coerce.boolean().default(false),
  }),
  upload: z.object({
    maxFileSizeMB: z.coerce.number().min(1).max(1000).default(100),
    presignedUrlExpirySeconds: z.coerce.number().min(60).max(3600).default(900),
  }),
  rateLimit: z.object({
    windowMs: z.coerce.number().default(60000),
    maxRequests: z.coerce.number().default(100),
  }),
  cors: z.object({
    origin: z.string().default('http://localhost:5173'),
  }),
  redis: z.object({
    enabled: z.coerce.boolean().default(false),
    host: z.string().default('localhost'),
    port: z.coerce.number().min(1).max(65535).default(6379),
    password: z.string().optional(),
    db: z.coerce.number().min(0).max(15).default(0),
    url: z.string().url().optional(), // Alternative to host/port/password
  }),
  logging: z.object({
    level: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  }),
});

export const config = configSchema.parse({
  server: {
    env: process.env['NODE_ENV'],
    port: process.env['PORT'],
    host: process.env['HOST'],
  },
  database: {
    url: process.env['DATABASE_URL'],
  },
  s3: {
    endpoint: process.env['S3_ENDPOINT'],
    bucket: process.env['S3_BUCKET'],
    accessKeyId: process.env['S3_ACCESS_KEY_ID'],
    secretAccessKey: process.env['S3_SECRET_ACCESS_KEY'],
    region: process.env['S3_REGION'],
    forcePathStyle: process.env['S3_FORCE_PATH_STYLE'],
  },
  upload: {
    maxFileSizeMB: process.env['MAX_FILE_SIZE_MB'],
    presignedUrlExpirySeconds: process.env['PRESIGNED_URL_EXPIRY_SECONDS'],
  },
  rateLimit: {
    windowMs: process.env['RATE_LIMIT_WINDOW_MS'],
    maxRequests: process.env['RATE_LIMIT_MAX_REQUESTS'],
  },
  cors: {
    origin: process.env['CORS_ORIGIN'],
  },
  redis: {
    enabled: process.env['REDIS_ENABLED'],
    host: process.env['REDIS_HOST'],
    port: process.env['REDIS_PORT'],
    password: process.env['REDIS_PASSWORD'],
    db: process.env['REDIS_DB'],
    url: process.env['REDIS_URL'],
  },
  logging: {
    level: process.env['LOG_LEVEL'],
  },
});

export type Config = z.infer<typeof configSchema>;
