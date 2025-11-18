/**
 * Retry Utility with Exponential Backoff
 *
 * Provides retry logic for failed operations with configurable
 * backoff strategy and error handling.
 */

import { logger } from './logger';

export interface RetryOptions {
  /**
   * Maximum number of retry attempts
   * @default 3
   */
  maxAttempts?: number;

  /**
   * Initial delay in milliseconds
   * @default 1000
   */
  initialDelay?: number;

  /**
   * Backoff multiplier
   * @default 2
   */
  backoffMultiplier?: number;

  /**
   * Maximum delay in milliseconds
   * @default 10000
   */
  maxDelay?: number;

  /**
   * Function to determine if error is retryable
   * @default () => true
   */
  shouldRetry?: (error: unknown, attempt: number) => boolean;

  /**
   * Callback when retry happens
   */
  onRetry?: (error: unknown, attempt: number, delay: number) => void;
}

/**
 * Default retry options
 */
const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelay: 1000,
  backoffMultiplier: 2,
  maxDelay: 10000,
  shouldRetry: () => true,
  onRetry: () => {},
};

/**
 * Execute function with retry logic
 *
 * @example
 * ```ts
 * const data = await retryWithBackoff(
 *   () => fetch('/api/data'),
 *   { maxAttempts: 5, initialDelay: 2000 }
 * );
 * ```
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: unknown;
  let delay = opts.initialDelay;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry
      if (attempt >= opts.maxAttempts || !opts.shouldRetry(error, attempt)) {
        logger.error(`[Retry] Failed after ${attempt} attempts:`, error);
        throw error;
      }

      // Calculate next delay with exponential backoff
      const nextDelay = Math.min(delay, opts.maxDelay);

      logger.warn(
        `[Retry] Attempt ${attempt}/${opts.maxAttempts} failed. Retrying in ${nextDelay}ms...`,
        error
      );

      // Call onRetry callback
      opts.onRetry(error, attempt, nextDelay);

      // Wait before retrying
      await sleep(nextDelay);

      // Increase delay for next attempt
      delay *= opts.backoffMultiplier;
    }
  }

  throw lastError;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Common retry predicates
 */
export const RetryPredicates = {
  /**
   * Retry on network errors only
   */
  networkErrors: (error: unknown) => {
    if (error instanceof Error) {
      return (
        error.message.includes('network') ||
        error.message.includes('fetch') ||
        error.message.includes('timeout')
      );
    }
    return false;
  },

  /**
   * Retry on HTTP 5xx errors only
   */
  serverErrors: (error: unknown) => {
    if (typeof error === 'object' && error !== null && 'status' in error) {
      const status = (error as { status: number }).status;
      return status >= 500 && status < 600;
    }
    return false;
  },

  /**
   * Retry on specific HTTP status codes
   */
  statusCodes: (codes: number[]) => (error: unknown) => {
    if (typeof error === 'object' && error !== null && 'status' in error) {
      const status = (error as { status: number }).status;
      return codes.includes(status);
    }
    return false;
  },

  /**
   * Never retry (useful for testing)
   */
  never: () => false,

  /**
   * Always retry (default)
   */
  always: () => true,
};

/**
 * Retry with jitter (randomized delay)
 * Helps prevent thundering herd problem
 */
export async function retryWithJitter<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  return retryWithBackoff(fn, {
    ...options,
    onRetry: (error, attempt, delay) => {
      // Add random jitter (±25%)
      const jitter = delay * (0.75 + Math.random() * 0.5);
      options.onRetry?.(error, attempt, jitter);
    },
  });
}

/**
 * Create a retryable version of a function
 *
 * @example
 * ```ts
 * const fetchWithRetry = makeRetryable(
 *   (url: string) => fetch(url),
 *   { maxAttempts: 5 }
 * );
 *
 * const response = await fetchWithRetry('/api/data');
 * ```
 */
export function makeRetryable<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  options: RetryOptions = {}
): (...args: TArgs) => Promise<TReturn> {
  return (...args: TArgs) => retryWithBackoff(() => fn(...args), options);
}

/**
 * Retry decorator for class methods
 *
 * @example
 * ```ts
 * class ApiClient {
 *   @retry({ maxAttempts: 3 })
 *   async fetchData() {
 *     return fetch('/api/data');
 *   }
 * }
 * ```
 */
export function retry(options: RetryOptions = {}) {
  return function (
    _target: unknown,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      return retryWithBackoff(() => originalMethod.apply(this, args), options);
    };

    return descriptor;
  };
}
