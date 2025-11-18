/**
 * User-Friendly Error Messages Utility
 *
 * Converts technical error messages into user-friendly, actionable messages
 */

export interface ErrorContext {
  operation?: string;
  resourceType?: string;
  statusCode?: number;
  originalError?: string;
}

/**
 * Network error types
 */
export function getNetworkErrorMessage(error: Error): string {
  const message = error.message.toLowerCase();

  // Connection errors
  if (message.includes('failed to fetch') || message.includes('network')) {
    return 'Unable to connect to the server. Please check your internet connection and try again.';
  }

  // Timeout errors
  if (message.includes('timeout') || message.includes('timed out')) {
    return 'The request took too long to complete. Please try again.';
  }

  // Abort errors
  if (error.name === 'AbortError' || message.includes('abort')) {
    return 'The request was cancelled.';
  }

  // CORS errors
  if (message.includes('cors')) {
    return 'Unable to connect to the server due to security restrictions. Please contact support.';
  }

  // Default network error
  return 'A network error occurred. Please check your connection and try again.';
}

/**
 * HTTP status code error messages
 */
export function getHttpErrorMessage(statusCode: number, context?: ErrorContext): string {
  const { operation = 'operation', resourceType = 'resource' } = context || {};

  switch (statusCode) {
    case 400:
      return `Invalid request. Please check your input and try again.`;

    case 401:
      return `You are not authorized to perform this ${operation}. Please log in and try again.`;

    case 403:
      return `You don't have permission to ${operation} this ${resourceType}.`;

    case 404:
      return `The ${resourceType} you're looking for was not found. It may have been deleted.`;

    case 409:
      return `This ${operation} conflicts with existing data. Please refresh and try again.`;

    case 413:
      return `The file is too large. Please choose a smaller file (max 100 MB).`;

    case 422:
      return `The data you provided is invalid. Please check your input and try again.`;

    case 429:
      return `Too many requests. Please wait a moment and try again.`;

    case 500:
      return `A server error occurred. Please try again in a few moments.`;

    case 502:
    case 503:
      return `The server is temporarily unavailable. Please try again in a few moments.`;

    case 504:
      return `The server took too long to respond. Please try again.`;

    default:
      if (statusCode >= 500) {
        return `A server error occurred (Error ${statusCode}). Please try again later.`;
      }
      if (statusCode >= 400) {
        return `Request failed (Error ${statusCode}). Please try again.`;
      }
      return `An unexpected error occurred (Error ${statusCode}). Please try again.`;
  }
}

/**
 * Upload-specific error messages
 */
export function getUploadErrorMessage(statusCode?: number, error?: string): string {
  if (!statusCode) {
    if (error?.includes('size')) {
      return 'The file is too large. Please choose a file smaller than 100 MB.';
    }
    if (error?.includes('type') || error?.includes('format')) {
      return 'Invalid file format. Please upload an IFC (.ifc) file.';
    }
    return 'Failed to upload file. Please try again.';
  }

  switch (statusCode) {
    case 413:
      return 'The file is too large. Maximum file size is 100 MB.';
    case 415:
      return 'Invalid file format. Only IFC (.ifc) files are supported.';
    case 403:
      return 'Upload failed due to security restrictions. The upload URL may have expired. Please try again.';
    default:
      return getHttpErrorMessage(statusCode, { operation: 'upload', resourceType: 'file' });
  }
}

/**
 * Processing error messages
 */
export function getProcessingErrorMessage(error?: string): string {
  if (!error) {
    return 'Failed to process the file. Please try uploading again.';
  }

  const lowerError = error.toLowerCase();

  if (lowerError.includes('coordinates') || lowerError.includes('location')) {
    return 'Could not extract location coordinates from the IFC file. Please ensure the file contains valid geographic data.';
  }

  if (lowerError.includes('parse') || lowerError.includes('invalid')) {
    return 'The IFC file format is invalid or corrupted. Please check the file and try again.';
  }

  if (lowerError.includes('timeout')) {
    return 'Processing took too long. The file may be too complex. Please try a simpler file or contact support.';
  }

  if (lowerError.includes('memory') || lowerError.includes('size')) {
    return 'The file is too large or complex to process. Please try a smaller file.';
  }

  return `Processing failed: ${error}`;
}

/**
 * Building deletion error messages
 */
export function getDeletionErrorMessage(count: number, error?: string): string {
  const plural = count > 1;
  const resource = plural ? `${count} buildings` : 'building';

  if (error) {
    const lowerError = error.toLowerCase();

    if (lowerError.includes('permission') || lowerError.includes('403')) {
      return `You don't have permission to delete ${resource}.`;
    }

    if (lowerError.includes('not found') || lowerError.includes('404')) {
      return `The ${resource} ${plural ? 'were' : 'was'} already deleted.`;
    }
  }

  return `Failed to delete ${resource}. Please try again.`;
}

/**
 * Generic error message with fallback
 */
export function getUserFriendlyError(
  error: unknown,
  context?: ErrorContext
): string {
  // Handle Error objects
  if (error instanceof Error) {
    // Network errors
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return getNetworkErrorMessage(error);
    }

    // Return original message if it's already user-friendly
    if (error.message.length > 10 && !error.message.includes('Error:')) {
      return error.message;
    }
  }

  // Handle string errors
  if (typeof error === 'string') {
    return error;
  }

  // Handle objects with status code
  if (typeof error === 'object' && error !== null && 'statusCode' in error) {
    const statusCode = (error as { statusCode: number }).statusCode;
    return getHttpErrorMessage(statusCode, context);
  }

  // Fallback with context
  if (context?.operation) {
    return `Failed to ${context.operation}. Please try again.`;
  }

  // Generic fallback
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Check if user is offline
 */
export function isOffline(): boolean {
  return typeof navigator !== 'undefined' && !navigator.onLine;
}

/**
 * Get offline error message
 */
export function getOfflineMessage(action?: string): string {
  if (action) {
    return `You are offline. Please reconnect to ${action}.`;
  }
  return 'You are offline. Please check your internet connection.';
}
