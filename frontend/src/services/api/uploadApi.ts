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
  onProgress?: (progress: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Track upload progress
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress?.(progress);
      }
    });

    // Handle completion
    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        resolve();
      } else {
        reject(new Error(`S3 upload failed: ${xhr.status} ${xhr.statusText}`));
      }
    });

    // Handle errors
    xhr.addEventListener('error', () => {
      reject(new Error('S3 upload failed: Network error'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('S3 upload cancelled'));
    });

    // Start upload
    xhr.open('PUT', presignedUrl);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.send(file);
  });
}

/**
 * Step 3: Notify backend that upload is complete and start processing
 */
export async function completeUpload(params: UploadCompleteRequest): Promise<{ taskId: string }> {
  return apiClient.post<{ taskId: string }>('/upload/complete', params);
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
  const { uploadUrl, fileId, expiresAt } = await requestUploadUrl({
    fileName: file.name,
    fileSize: file.size,
    contentType: file.type || 'application/octet-stream',
  });

  console.log('[UploadAPI] Presigned URL received:', {
    fileId,
    expiresAt,
    fileName: file.name,
  });

  // Step 2: Upload to S3
  await uploadToS3(uploadUrl, file, onProgress);

  console.log('[UploadAPI] S3 upload complete');

  // Step 3: Notify backend
  const { taskId } = await completeUpload({
    fileId,
    fileName: file.name,
    fileSize: file.size,
  });

  console.log('[UploadAPI] Processing started:', { taskId });

  return { taskId, fileId };
}