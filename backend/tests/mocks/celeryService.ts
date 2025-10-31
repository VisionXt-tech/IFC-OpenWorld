/**
 * Mock for celeryService
 * Used in tests to avoid Redis dependency
 */

export class CeleryService {
  async connect(): Promise<void> {
    // Mock: do nothing
  }

  async disconnect(): Promise<void> {
    // Mock: do nothing
  }

  async triggerIFCProcessing(
    fileId: string,
    filename: string
  ): Promise<{ taskId: string; queuedAt: Date }> {
    return {
      taskId: `mock-task-${fileId}`,
      queuedAt: new Date(),
    };
  }

  async getTaskStatus(taskId: string): Promise<any> {
    return {
      taskId,
      status: 'SUCCESS',
      result: {
        status: 'completed',
        message: 'Mock processing completed',
      },
    };
  }

  async isHealthy(): Promise<boolean> {
    return true;
  }
}

export const celeryService = new CeleryService();
