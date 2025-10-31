/**
 * Celery Service
 * Triggers and monitors Celery tasks in Python IFC processor
 */

import { createClient } from 'redis';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';

const REDIS_URL = process.env['REDIS_URL'] || 'redis://localhost:6379';

/**
 * Celery task message format (Protocol v2)
 * https://docs.celeryq.dev/en/stable/internals/protocol.html
 */
interface CeleryTaskMessage {
  body: string; // Base64 encoded JSON of [args, kwargs, embed]
  'content-encoding': string;
  'content-type': string;
  headers: {
    lang: string;
    task: string;
    id: string;
    retries: number;
    eta: string | null;
    expires: string | null;
    group: string | null;
    root_id: string;
    parent_id: string | null;
  };
  properties: {
    correlation_id: string;
    reply_to: string;
    delivery_mode: number;
    delivery_info: {
      exchange: string;
      routing_key: string;
    };
    priority: number;
    body_encoding: string;
    delivery_tag: string;
  };
}

/**
 * Celery task result format
 */
interface CeleryTaskResult {
  status: 'PENDING' | 'STARTED' | 'SUCCESS' | 'FAILURE' | 'RETRY';
  result: unknown;
  traceback: string | null;
  children: unknown[];
}

class CeleryService {
  private redisClient;

  constructor() {
    this.redisClient = createClient({
      url: REDIS_URL,
    });

    this.redisClient.on('error', (err) => {
      logger.error('Redis Client Error', { error: err.message });
    });
  }

  /**
   * Connect to Redis
   */
  async connect(): Promise<void> {
    if (!this.redisClient.isOpen) {
      await this.redisClient.connect();
      logger.info('Connected to Redis for Celery tasks');
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (this.redisClient.isOpen) {
      await this.redisClient.disconnect();
      logger.info('Disconnected from Redis');
    }
  }

  /**
   * Trigger IFC processing task in Celery worker
   *
   * @param fileId - UUID of the file record
   * @param s3Key - S3 object key
   * @returns Task ID for status polling
   */
  async triggerIFCProcessing(fileId: string, s3Key: string): Promise<string> {
    await this.connect();

    const taskId = uuidv4();
    const taskName = 'app.workers.ifc_processing.process_ifc_file';

    // Build Celery task body (protocol v2)
    const taskBody = [[fileId, s3Key], {}, { callbacks: null, errbacks: null, chain: null, chord: null }];
    const bodyEncoded = Buffer.from(JSON.stringify(taskBody)).toString('base64');

    const message: CeleryTaskMessage = {
      body: bodyEncoded,
      'content-encoding': 'utf-8',
      'content-type': 'application/json',
      headers: {
        lang: 'py',
        task: taskName,
        id: taskId,
        retries: 0,
        eta: null,
        expires: null,
        group: null,
        root_id: taskId,
        parent_id: null,
      },
      properties: {
        correlation_id: taskId,
        reply_to: uuidv4(),
        delivery_mode: 2,
        delivery_info: {
          exchange: '',
          routing_key: 'celery',
        },
        priority: 0,
        body_encoding: 'base64',
        delivery_tag: uuidv4(),
      },
    };

    // Celery uses list 'celery' as default queue
    const queueName = 'celery';

    logger.info('Triggering Celery task', {
      taskId,
      taskName,
      fileId,
      s3Key,
      queue: queueName,
    });

    try {
      // Push task to Celery queue (Redis list)
      await this.redisClient.lPush(queueName, JSON.stringify(message));

      logger.info('Celery task queued successfully', { taskId });

      return taskId;
    } catch (error) {
      logger.error('Failed to queue Celery task', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error('Failed to trigger IFC processing');
    }
  }

  /**
   * Get Celery task status
   *
   * @param taskId - UUID of the task
   * @returns Task result or null if not found
   */
  async getTaskStatus(taskId: string): Promise<CeleryTaskResult | null> {
    await this.connect();

    const key = `celery-task-meta-${taskId}`;

    try {
      const result = await this.redisClient.get(key);

      if (!result) {
        // Task not found or still pending
        return {
          status: 'PENDING',
          result: null,
          traceback: null,
          children: [],
        };
      }

      const parsed = JSON.parse(result) as CeleryTaskResult;

      logger.info('Retrieved task status', {
        taskId,
        status: parsed.status,
      });

      return parsed;
    } catch (error) {
      logger.error('Failed to get task status', {
        taskId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Health check for Celery worker
   *
   * @returns True if worker is responsive
   */
  async checkWorkerHealth(): Promise<boolean> {
    await this.connect();

    const taskId = uuidv4();
    const taskName = 'app.workers.ifc_processing.health_check';

    // Build Celery task body (protocol v2)
    const taskBody = [[], {}, { callbacks: null, errbacks: null, chain: null, chord: null }];
    const bodyEncoded = Buffer.from(JSON.stringify(taskBody)).toString('base64');

    const message: CeleryTaskMessage = {
      body: bodyEncoded,
      'content-encoding': 'utf-8',
      'content-type': 'application/json',
      headers: {
        lang: 'py',
        task: taskName,
        id: taskId,
        retries: 0,
        eta: null,
        expires: null,
        group: null,
        root_id: taskId,
        parent_id: null,
      },
      properties: {
        correlation_id: taskId,
        reply_to: uuidv4(),
        delivery_mode: 2,
        delivery_info: {
          exchange: '',
          routing_key: 'celery',
        },
        priority: 0,
        body_encoding: 'base64',
        delivery_tag: uuidv4(),
      },
    };

    try {
      await this.redisClient.lPush('celery', JSON.stringify(message));

      // Wait for response (max 5 seconds)
      for (let i = 0; i < 10; i++) {
        await new Promise((resolve) => setTimeout(resolve, 500));

        const status = await this.getTaskStatus(taskId);

        if (status && status.status === 'SUCCESS') {
          logger.info('Celery worker is healthy');
          return true;
        }
      }

      logger.warn('Celery worker health check timeout');
      return false;
    } catch (error) {
      logger.error('Celery worker health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }
}

// Singleton instance
export const celeryService = new CeleryService();
