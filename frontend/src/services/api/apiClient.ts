import { config } from '@/config';
import type { ApiError } from '@/types';

/**
 * API Client
 *
 * Base HTTP client for making requests to the backend API.
 * Handles errors, authentication, CSRF protection, and response formatting.
 *
 * @see specs/001-plan.md Task 3.4
 */

/**
 * Get CSRF token from cookie
 * Backend sets csrf_token cookie with httpOnly=false so we can read it
 */
function getCsrfTokenFromCookie(): string | null {
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'csrf_token') {
      return decodeURIComponent(value);
    }
  }
  return null;
}

class ApiClient {
  private baseUrl: string;
  private csrfToken: string | null = null;
  private fetchingToken = false;
  private tokenPromise: Promise<void> | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Ensure we have a valid CSRF token
   * Fetch from /csrf-token endpoint if not in cookie
   */
  private async ensureCsrfToken(): Promise<void> {
    // If already fetching, wait for it
    if (this.fetchingToken && this.tokenPromise) {
      return this.tokenPromise;
    }

    // Try to get token from cookie first
    const cookieToken = getCsrfTokenFromCookie();
    if (cookieToken) {
      this.csrfToken = cookieToken;
      return;
    }

    // Token not in cookie, fetch from server
    this.fetchingToken = true;
    this.tokenPromise = this.fetchCsrfToken();

    try {
      await this.tokenPromise;
    } finally {
      this.fetchingToken = false;
      this.tokenPromise = null;
    }
  }

  /**
   * Fetch CSRF token from backend
   */
  private async fetchCsrfToken(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/csrf-token`, {
        credentials: 'include', // Important: send/receive cookies
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch CSRF token: ${response.status}`);
      }

      const data = await response.json() as { csrfToken: string };
      this.csrfToken = data.csrfToken;

      if (config.features.debug) {
        console.log('[ApiClient] CSRF token fetched');
      }
    } catch (error) {
      console.error('[ApiClient] Failed to fetch CSRF token:', error);
      throw error;
    }
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
    // Ensure we have CSRF token before making POST request
    await this.ensureCsrfToken();

    return this.request<T>(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.csrfToken && { 'X-CSRF-Token': this.csrfToken }),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * Make a DELETE request
   */
  async delete<T>(endpoint: string): Promise<T> {
    // Ensure we have CSRF token before making DELETE request
    await this.ensureCsrfToken();

    return this.request<T>(endpoint, {
      method: 'DELETE',
      headers: {
        ...(this.csrfToken && { 'X-CSRF-Token': this.csrfToken }),
      },
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
      // Include credentials to send/receive cookies
      const response = await fetch(url, {
        ...options,
        credentials: 'include',
      });

      // Handle non-JSON responses (like 204 No Content)
      if (response.status === 204) {
        return {} as T;
      }

      const data = (await response.json()) as {
        error?: string;
        message?: string;
      };

      if (!response.ok) {
        // Backend error response
        const apiError: ApiError = {
          error: data.error ?? 'Unknown error',
          message: data.message ?? response.statusText,
          statusCode: response.status,
        };

        if (config.features.debug) {
          console.error('[ApiClient] Error:', apiError);
        }

        const error = new Error(apiError.message);
        Object.assign(error, apiError);
        throw error;
      }

      return data as T;
    } catch (error) {
      if (config.features.debug) {
        console.error('[ApiClient] Request failed:', error);
      }

      // Re-throw ApiError as-is (already an Error object from above)
      if (error instanceof Error && 'statusCode' in error) {
        throw error;
      }

      // Network error or other non-API error
      const networkError = new Error(
        error instanceof Error ? error.message : 'Network request failed'
      );
      Object.assign(networkError, {
        error: 'NetworkError',
        statusCode: 0,
      } as Partial<ApiError>);
      throw networkError;
    }
  }
}

// Export singleton instance
export const apiClient = new ApiClient(config.api.baseUrl);