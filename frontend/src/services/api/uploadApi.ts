import { apiClient } from './apiClient';
import type {
  PresignedUrlResponse,
  UploadCompleteRequest,
  ProcessingStatusResponse,
} from '@/types';

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
 */
export async function uploadToS3(
  presignedUrl: string,
  file: File,
  onProgress?: (progress: number) => void,
  contentType?: string
): Promise<void> {
  console.log('[UploadAPI] Starting S3 upload:', {
    url: presignedUrl,
    fileSize: file.size,
    contentType: contentType || file.type || 'application/x-step',
  });

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Track upload progress
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const progress = Math.round((event.loaded / event.total) * 100);
        console.log(`[UploadAPI] Upload progress: ${progress}% (${event.loaded}/${event.total} bytes)`);
        onProgress?.(progress);
      }
    });

    // Handle completion
    xhr.addEventListener('load', () => {
      console.log('[UploadAPI] XHR load event:', {
        status: xhr.status,
        statusText: xhr.statusText,
        responseURL: xhr.responseURL,
      });

      if (xhr.status === 200) {
        resolve();
      } else {
        reject(new Error(`S3 upload failed: ${xhr.status} ${xhr.statusText}`));
      }
    });

    // Handle errors
    xhr.addEventListener('error', (event) => {
      console.error('[UploadAPI] XHR error event:', event);
      reject(new Error('S3 upload failed: Network error'));
    });

    xhr.addEventListener('abort', () => {
      console.error('[UploadAPI] XHR abort event');
      reject(new Error('S3 upload cancelled'));
    });

    xhr.addEventListener('timeout', () => {
      console.error('[UploadAPI] XHR timeout event');
      reject(new Error('S3 upload timeout'));
    });

    // Start upload with correct content type
    xhr.open('PUT', presignedUrl);
    xhr.setRequestHeader('Content-Type', contentType || file.type || 'application/x-step');
    // Do NOT set Content-Length - browser sets it automatically and setting it manually causes issues

    console.log('[UploadAPI] Sending XHR request...');
    xhr.send(file);
  });
}

/**
 * Step 3: Notify backend that upload is complete
 * Returns upload status (backend does not yet trigger Celery processing)
 */
export async function completeUpload(params: UploadCompleteRequest): Promise<{
  success: boolean;
  fileId: string;
  fileName: string;
  uploadStatus: string;
  processingStatus: string;
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
 */
export async function uploadIFCFile(
  file: File,
  onProgress?: (progress: number) => void
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

  console.log('[UploadAPI] Presigned URL received:', {
    fileId,
    s3Key,
    expiresIn,
    fileName: file.name,
    contentType,
  });

  // Step 2: Upload to S3 with same content type
  await uploadToS3(presignedUrl, file, onProgress, contentType);

  console.log('[UploadAPI] S3 upload complete');

  // Step 3: Notify backend (send s3Key, not fileName/fileSize)
  const response = await completeUpload({
    fileId,
    s3Key,
  });

  console.log('[UploadAPI] Upload marked as complete:', response);

  // TODO (Milestone 4): Backend needs to trigger Celery task and return taskId
  // For now, we just return the fileId as taskId (no actual processing happens)
  // The uploadStore will skip polling since there's no real task to poll
  return { taskId: fileId, fileId };
}