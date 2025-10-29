import { config } from '@/config';
import type { ApiError } from '@/types';

/**
 * API Client
 *
 * Base HTTP client for making requests to the backend API.
 * Handles errors, authentication, and response formatting.
 *
 * @see specs/001-plan.md Task 3.4
 */

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Make a GET request
   */
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'GET',
    });
  }

  /**
   * Make a POST request
   */
  async post<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * Make a PUT request (for S3 presigned URL upload)
   */
  async put<T>(url: string, body: Blob | File, contentType?: string): Promise<T> {
    const headers: Record<string, string> = {};
    if (contentType) {
      headers['Content-Type'] = contentType;
    }

    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
    }

    // S3 PUT returns empty body on success
    return {} as T;
  }

  /**
   * Generic request method
   */
  private async request<T>(endpoint: string, options: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    if (config.features.debug) {
      console.log(`[ApiClient] ${options.method} ${url}`);
    }

    try {
      const response = await fetch(url, options);

      // Handle non-JSON responses (like 204 No Content)
      if (response.status === 204) {
        return {} as T;
      }

      const data = await response.json();

      if (!response.ok) {
        // Backend error response
        const error: ApiError = {
          error: data.error || 'Unknown error',
          message: data.message || response.statusText,
          statusCode: response.status,
        };

        if (config.features.debug) {
          console.error('[ApiClient] Error:', error);
        }

        throw error;
      }

      return data as T;
    } catch (error) {
      if (config.features.debug) {
        console.error('[ApiClient] Request failed:', error);
      }

      // Re-throw ApiError as-is
      if (typeof error === 'object' && error !== null && 'statusCode' in error) {
        throw error;
      }

      // Network error or other non-API error
      throw {
        error: 'NetworkError',
        message: error instanceof Error ? error.message : 'Network request failed',
        statusCode: 0,
      } as ApiError;
    }
  }
}

// Export singleton instance
export const apiClient = new ApiClient(config.api.baseUrl);