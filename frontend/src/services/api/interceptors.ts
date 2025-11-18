/**
 * API Interceptors
 *
 * Provides request/response interceptor system for API calls.
 * Supports authentication, logging, error handling, retry logic, and caching.
 */

import { logger } from '@/utils/logger';
import { retryWithBackoff } from '@/utils/retry';
import { cache } from '@/utils/cache';
import type { ApiError } from '@/types';

/**
 * Request configuration
 */
export interface RequestConfig {
  url: string;
  method?: string;
  headers?: HeadersInit;
  body?: BodyInit | null;
  signal?: AbortSignal;
  baseUrl?: string;
  params?: Record<string, string | number | boolean>;
  timeout?: number;
  retry?: boolean;
  retryAttempts?: number;
  cache?: boolean;
  cacheTTL?: number;
  metadata?: Record<string, unknown>;
  credentials?: RequestCredentials;
  mode?: RequestMode;
  redirect?: RequestRedirect;
  referrer?: string;
  referrerPolicy?: ReferrerPolicy;
  integrity?: string;
  keepalive?: boolean;
}

/**
 * Response data
 */
export interface ResponseData<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Headers;
  config: RequestConfig;
}

/**
 * Request interceptor function
 */
export type RequestInterceptor = (
  config: RequestConfig
) => RequestConfig | Promise<RequestConfig>;

/**
 * Response interceptor function
 */
export type ResponseInterceptor = <T>(
  response: ResponseData<T>
) => ResponseData<T> | Promise<ResponseData<T>>;

/**
 * Error interceptor function
 */
export type ErrorInterceptor = (error: Error & Partial<ApiError>) => Promise<never>;

/**
 * Interceptor manager
 */
class InterceptorManager {
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private errorInterceptors: ErrorInterceptor[] = [];

  /**
   * Add request interceptor
   */
  addRequestInterceptor(interceptor: RequestInterceptor): () => void {
    this.requestInterceptors.push(interceptor);
    return () => {
      const index = this.requestInterceptors.indexOf(interceptor);
      if (index !== -1) {
        this.requestInterceptors.splice(index, 1);
      }
    };
  }

  /**
   * Add response interceptor
   */
  addResponseInterceptor(interceptor: ResponseInterceptor): () => void {
    this.responseInterceptors.push(interceptor);
    return () => {
      const index = this.responseInterceptors.indexOf(interceptor);
      if (index !== -1) {
        this.responseInterceptors.splice(index, 1);
      }
    };
  }

  /**
   * Add error interceptor
   */
  addErrorInterceptor(interceptor: ErrorInterceptor): () => void {
    this.errorInterceptors.push(interceptor);
    return () => {
      const index = this.errorInterceptors.indexOf(interceptor);
      if (index !== -1) {
        this.errorInterceptors.splice(index, 1);
      }
    };
  }

  /**
   * Run request interceptors
   */
  async runRequestInterceptors(config: RequestConfig): Promise<RequestConfig> {
    let currentConfig = config;
    for (const interceptor of this.requestInterceptors) {
      currentConfig = await interceptor(currentConfig);
    }
    return currentConfig;
  }

  /**
   * Run response interceptors
   */
  async runResponseInterceptors<T>(response: ResponseData<T>): Promise<ResponseData<T>> {
    let currentResponse = response;
    for (const interceptor of this.responseInterceptors) {
      currentResponse = await interceptor(currentResponse);
    }
    return currentResponse;
  }

  /**
   * Run error interceptors
   */
  async runErrorInterceptors(error: Error & Partial<ApiError>): Promise<never> {
    for (const interceptor of this.errorInterceptors) {
      await interceptor(error);
    }
    throw error;
  }

  /**
   * Clear all interceptors
   */
  clearAll(): void {
    this.requestInterceptors = [];
    this.responseInterceptors = [];
    this.errorInterceptors = [];
  }
}

export const interceptorManager = new InterceptorManager();

/**
 * Built-in interceptors
 */
export const builtInInterceptors = {
  /**
   * Logging interceptor - logs all requests and responses
   */
  logging: {
    request: (config: RequestConfig): RequestConfig => {
      const startTime = Date.now();
      config.metadata = { ...config.metadata, startTime };
      logger.debug(`[API] → ${config.method} ${config.url}`, {
        params: config.params,
        body: config.body,
      });
      return config;
    },

    response: <T>(response: ResponseData<T>): ResponseData<T> => {
      const duration = Date.now() - (response.config.metadata?.startTime as number || 0);
      logger.debug(`[API] ← ${response.status} ${response.config.method} ${response.config.url} (${duration}ms)`, {
        data: response.data,
      });
      return response;
    },

    error: async (error: Error & Partial<ApiError>): Promise<never> => {
      logger.error('[API] ✕ Request failed:', {
        message: error.message,
        status: error.statusCode,
        error: error.error,
      });
      throw error;
    },
  },

  /**
   * Auth interceptor - adds authentication headers
   */
  auth: {
    request: (config: RequestConfig): RequestConfig => {
      // Get auth token from localStorage
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers = {
          ...config.headers,
          Authorization: `Bearer ${token}`,
        };
      }
      return config;
    },
  },

  /**
   * Timeout interceptor - adds timeout to requests
   */
  timeout: (timeoutMs = 30000) => ({
    request: (config: RequestConfig): RequestConfig => {
      if (!config.signal && !config.timeout) {
        const controller = new AbortController();
        config.signal = controller.signal;
        config.metadata = { ...config.metadata, abortController: controller };

        setTimeout(() => controller.abort(), timeoutMs);
      }
      return config;
    },
  }),

  /**
   * Retry interceptor - retries failed requests with exponential backoff
   */
  retry: {
    error: async (error: Error & Partial<ApiError>): Promise<never> => {
      const config = (error as unknown as { config?: RequestConfig }).config;

      // Only retry if config has retry enabled
      if (config?.retry) {
        const attempts = config.retryAttempts || 3;
        const shouldRetry = (err: unknown) => {
          const apiError = err as Partial<ApiError>;
          // Retry on network errors or 5xx errors
          return !apiError.statusCode || apiError.statusCode >= 500;
        };

        try {
          // Re-run the request with retry logic
          const retryFn = async () => {
            // Extract only fetch-compatible properties
            const fetchConfig: RequestInit = {
              method: config.method,
              headers: config.headers,
              body: config.body,
              signal: config.signal,
              credentials: config.credentials,
              mode: config.mode,
              redirect: config.redirect,
              referrer: config.referrer,
            };
            const response = await fetch(config.url, fetchConfig);
            if (!response.ok) {
              const error = new Error(response.statusText);
              Object.assign(error, { statusCode: response.status });
              throw error;
            }
            return response;
          };

          await retryWithBackoff(retryFn, {
            maxAttempts: attempts,
            shouldRetry,
          });
        } catch (retryError) {
          logger.error('[API] Retry failed after all attempts');
          throw retryError;
        }
      }

      throw error;
    },
  },

  /**
   * Cache interceptor - caches GET requests
   */
  cache: {
    request: async (config: RequestConfig): Promise<RequestConfig> => {
      // Only cache GET requests
      if (config.method === 'GET' && config.cache !== false) {
        const cacheKey = `api:${config.url}${config.params ? '?' + new URLSearchParams(config.params as Record<string, string>) : ''}`;
        const cached = cache.get(cacheKey);

        if (cached) {
          logger.debug(`[API] Cache HIT: ${config.url}`);
          // Throw a special "cached" response that will be caught
          const cachedResponse = {
            data: cached,
            status: 200,
            statusText: 'OK (Cached)',
            headers: new Headers(),
            config,
            cached: true,
          };
          throw cachedResponse; // Will be caught and returned by response interceptor
        } else {
          logger.debug(`[API] Cache MISS: ${config.url}`);
          config.metadata = { ...config.metadata, cacheKey };
        }
      }
      return config;
    },

    response: <T>(response: ResponseData<T>): ResponseData<T> => {
      // Check if this is a cached response
      if ((response as unknown as { cached?: boolean }).cached) {
        return response;
      }

      // Cache successful GET responses
      if (response.config.method === 'GET' && response.status === 200 && response.config.cache !== false) {
        const cacheKey = response.config.metadata?.cacheKey as string;
        if (cacheKey) {
          const ttl = response.config.cacheTTL || 5 * 60 * 1000; // 5 minutes default
          cache.set(cacheKey, response.data, ttl);
          logger.debug(`[API] Cached response: ${response.config.url}`);
        }
      }
      return response;
    },
  },

  /**
   * Query params interceptor - adds query params to URL
   */
  queryParams: {
    request: (config: RequestConfig): RequestConfig => {
      if (config.params) {
        const url = new URL(config.url, config.baseUrl || window.location.origin);
        Object.entries(config.params).forEach(([key, value]) => {
          url.searchParams.append(key, String(value));
        });
        config.url = url.toString();
      }
      return config;
    },
  },

  /**
   * Error normalizer - normalizes error format
   */
  errorNormalizer: {
    error: async (error: Error & Partial<ApiError>): Promise<never> => {
      // Normalize network errors
      if (!error.statusCode) {
        error.statusCode = 0;
        error.error = 'NetworkError';
        error.message = error.message || 'Network request failed';
      }

      // Add user-friendly messages
      if (error.statusCode === 401) {
        error.message = 'Authentication required. Please log in.';
      } else if (error.statusCode === 403) {
        error.message = 'You do not have permission to perform this action.';
      } else if (error.statusCode === 404) {
        error.message = 'The requested resource was not found.';
      } else if (error.statusCode >= 500) {
        error.message = 'Server error. Please try again later.';
      }

      throw error;
    },
  },

  /**
   * Rate limit handler
   */
  rateLimit: {
    response: <T>(response: ResponseData<T>): ResponseData<T> => {
      const remaining = response.headers.get('X-RateLimit-Remaining');
      const reset = response.headers.get('X-RateLimit-Reset');

      if (remaining && parseInt(remaining) < 10) {
        logger.warn(`[API] Rate limit warning: ${remaining} requests remaining (resets at ${reset})`);
      }

      return response;
    },

    error: async (error: Error & Partial<ApiError>): Promise<never> => {
      if (error.statusCode === 429) {
        const retryAfter = (error as unknown as { headers?: Headers }).headers?.get('Retry-After');
        logger.error(`[API] Rate limit exceeded. Retry after ${retryAfter || 'unknown'} seconds`);
        error.message = `Too many requests. Please try again in ${retryAfter || 'a few'} seconds.`;
      }
      throw error;
    },
  },

  /**
   * CSRF token interceptor
   */
  csrf: {
    request: (config: RequestConfig): RequestConfig => {
      // Only add CSRF token for state-changing methods
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(config.method || '')) {
        const csrfToken = document.cookie
          .split(';')
          .find((c) => c.trim().startsWith('csrf_token='))
          ?.split('=')[1];

        if (csrfToken) {
          config.headers = {
            ...config.headers,
            'X-CSRF-Token': decodeURIComponent(csrfToken),
          };
        }
      }
      return config;
    },
  },
};

/**
 * Setup default interceptors
 */
export function setupDefaultInterceptors(): void {
  // Request interceptors (run in order)
  interceptorManager.addRequestInterceptor(builtInInterceptors.logging.request);
  interceptorManager.addRequestInterceptor(builtInInterceptors.auth.request);
  interceptorManager.addRequestInterceptor(builtInInterceptors.csrf.request);
  interceptorManager.addRequestInterceptor(builtInInterceptors.queryParams.request);
  interceptorManager.addRequestInterceptor(builtInInterceptors.cache.request);
  interceptorManager.addRequestInterceptor(builtInInterceptors.timeout(30000).request);

  // Response interceptors (run in reverse order)
  interceptorManager.addResponseInterceptor(builtInInterceptors.cache.response);
  interceptorManager.addResponseInterceptor(builtInInterceptors.rateLimit.response);
  interceptorManager.addResponseInterceptor(builtInInterceptors.logging.response);

  // Error interceptors (run in order)
  interceptorManager.addErrorInterceptor(builtInInterceptors.retry.error);
  interceptorManager.addErrorInterceptor(builtInInterceptors.errorNormalizer.error);
  interceptorManager.addErrorInterceptor(builtInInterceptors.rateLimit.error);
  interceptorManager.addErrorInterceptor(builtInInterceptors.logging.error);

  logger.info('[API] Default interceptors configured');
}

/**
 * Make request with interceptors
 */
export async function makeRequest<T>(config: RequestConfig): Promise<ResponseData<T>> {
  try {
    // Run request interceptors
    let processedConfig = await interceptorManager.runRequestInterceptors(config);

    // Extract only fetch-compatible properties
    const fetchConfig: RequestInit = {
      method: processedConfig.method,
      headers: processedConfig.headers,
      body: processedConfig.body,
      signal: processedConfig.signal,
      credentials: processedConfig.credentials,
      mode: processedConfig.mode,
      redirect: processedConfig.redirect,
      referrer: processedConfig.referrer,
    };

    // Make the request
    const response = await fetch(processedConfig.url, fetchConfig);

    // Parse response
    let data: T;
    const contentType = response.headers.get('Content-Type');
    if (contentType?.includes('application/json')) {
      data = await response.json() as T;
    } else if (response.status === 204) {
      data = {} as T;
    } else {
      data = (await response.text()) as unknown as T;
    }

    const responseData: ResponseData<T> = {
      data,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      config: processedConfig,
    };

    // Handle non-ok responses as errors
    if (!response.ok) {
      const error = new Error(responseData.statusText) as Error & Partial<ApiError>;
      error.statusCode = response.status;
      error.error = (data as { error?: string }).error || 'RequestError';
      error.message = (data as { message?: string }).message || response.statusText;
      throw error;
    }

    // Run response interceptors
    return await interceptorManager.runResponseInterceptors(responseData);
  } catch (error) {
    // Check if it's a cached response (thrown by cache interceptor)
    if (error && typeof error === 'object' && 'cached' in error) {
      return error as unknown as ResponseData<T>;
    }

    // Run error interceptors
    return await interceptorManager.runErrorInterceptors(error as Error & Partial<ApiError>);
  }
}
