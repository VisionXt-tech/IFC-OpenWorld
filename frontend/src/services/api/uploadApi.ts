import { apiClient } from './apiClient';
import type {
  PresignedUrlResponse,
  UploadCompleteRequest,
  ProcessingStatusResponse,
} from '@/types';
import { logger } from '@/utils/logger';

/**
 * Upload API Service
 *
 * Handles IFC file upload workflow:
 * 1. Request presigned S3 URL
 * 2. Upload file directly to S3
 * 3. Notify backend to start processing
 * 4. Poll processing status
 *
 * @see specs/001-plan.md Task 3.4
 * @see backend/src/api/v1/upload.ts
 */

export interface RequestUploadParams {
  fileName: string;
  fileSize: number;
  contentType: string;
}

/**
 * Step 1: Request presigned upload URL from backend
 */
export async function requestUploadUrl(
  params: RequestUploadParams
): Promise<PresignedUrlResponse> {
  return apiClient.post<PresignedUrlResponse>('/upload/request', params);
}

/**
 * Step 2: Upload file directly to S3 using presigned URL
 * Returns upload progress via onProgress callback
 * Supports cancellation via AbortSignal
 */
export async function uploadToS3(
  presignedUrl: string,
  file: File,
  onProgress?: (progress: number) => void,
  contentType?: string,
  signal?: AbortSignal
): Promise<void> {
  logger.debug('[UploadAPI] Starting S3 upload:', {
    url: presignedUrl,
    fileSize: file.size,
    contentType: (contentType ?? file.type) || 'application/x-step',
  });

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Handle abort signal
    if (signal) {
      if (signal.aborted) {
        reject(new Error('Upload cancelled before start'));
        return;
      }

      signal.addEventListener('abort', () => {
        logger.debug('[UploadAPI] Aborting XHR upload...');
        xhr.abort();
      });
    }

    // Track upload progress
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const progress = Math.round((event.loaded / event.total) * 100);
        logger.debug(`[UploadAPI] Upload progress: ${progress}% (${event.loaded}/${event.total} bytes)`);
        onProgress?.(progress);
      }
    });

    // Handle completion
    xhr.addEventListener('load', () => {
      logger.debug('[UploadAPI] XHR load event:', {
        status: xhr.status,
        statusText: xhr.statusText,
        responseURL: xhr.responseURL,
      });

      if (xhr.status === 200 || xhr.status === 204) {
        logger.debug('[UploadAPI] Upload successful');
        resolve();
      } else {
        // Try to get error message from response, but don't fail if responseText is unavailable
        let errorMessage = `S3 upload failed: ${xhr.status} ${xhr.statusText}`;
        try {
          if (xhr.responseType === '' || xhr.responseType === 'text') {
            const responseText = xhr.responseText;
            if (responseText) {
              errorMessage += ` - ${responseText}`;
            }
          }
        } catch (e) {
          // Ignore error reading responseText
          logger.warn('[UploadAPI] Could not read response text:', e);
        }
        reject(new Error(errorMessage));
      }
    });

    // Handle errors
    xhr.addEventListener('error', (event) => {
      logger.error('[UploadAPI] XHR error event:', event);
      reject(new Error('S3 upload failed: Network error'));
    });

    xhr.addEventListener('abort', () => {
      logger.error('[UploadAPI] XHR abort event');
      reject(new Error('S3 upload cancelled'));
    });

    xhr.addEventListener('timeout', () => {
      logger.error('[UploadAPI] XHR timeout event');
      reject(new Error('S3 upload timeout'));
    });

    // Start upload with correct content type
    xhr.open('PUT', presignedUrl);
    xhr.setRequestHeader('Content-Type', (contentType ?? file.type) || 'application/x-step');
    // Do NOT set Content-Length - browser sets it automatically and setting it manually causes issues

    logger.debug('[UploadAPI] Sending XHR request...');
    xhr.send(file);
  });
}

/**
 * Step 3: Notify backend that upload is complete
 * Backend triggers Celery processing and returns taskId
 */
export async function completeUpload(params: UploadCompleteRequest): Promise<{
  success: boolean;
  fileId: string;
  fileName: string;
  uploadStatus: string;
  processingStatus: string;
  taskId: string;
}> {
  return apiClient.post('/upload/complete', params);
}

/**
 * Step 4: Check processing status
 */
export async function getProcessingStatus(taskId: string): Promise<ProcessingStatusResponse> {
  return apiClient.get<ProcessingStatusResponse>(`/upload/status/${taskId}`);
}

/**
 * Complete upload workflow (all 4 steps)
 * Supports cancellation via AbortSignal
 */
export async function uploadIFCFile(
  file: File,
  onProgress?: (progress: number) => void,
  signal?: AbortSignal
): Promise<{ taskId: string; fileId: string }> {
  // Step 1: Request presigned URL
  // Use application/x-step as default MIME type for IFC files (STEP format)
  // Backend accepts: application/x-step, application/ifc, text/plain
  const contentType = file.type || 'application/x-step';

  const { presignedUrl, fileId, s3Key, expiresIn } = await requestUploadUrl({
    fileName: file.name,
    fileSize: file.size,
    contentType,
  });

  logger.debug('[UploadAPI] Presigned URL received:', {
    fileId,
    s3Key,
    expiresIn,
    fileName: file.name,
    contentType,
  });

  // Step 2: Upload to S3 with same content type and abort signal
  await uploadToS3(presignedUrl, file, onProgress, contentType, signal);

  logger.debug('[UploadAPI] S3 upload complete');

  // Step 3: Notify backend (send s3Key, not fileName/fileSize)
  const response = await completeUpload({
    fileId,
    s3Key,
  });

  logger.debug('[UploadAPI] Upload marked as complete:', response);

  // Backend has triggered Celery task, return taskId for status polling
  return { taskId: response.taskId, fileId };
}