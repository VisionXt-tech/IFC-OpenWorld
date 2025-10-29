import { create } from 'zustand';
import { uploadIFCFile, getProcessingStatus } from '@/services/api';
import type { UploadStatus, ProcessingStatusResponse } from '@/types';

/**
 * Upload Store
 *
 * Manages IFC file upload state and processing status.
 * Uses Zustand for lightweight state management.
 *
 * @see specs/001-plan.md Task 3.4
 */

interface UploadStore {
  // State
  uploadStatus: UploadStatus;
  taskId: string | null;
  fileId: string | null;
  processingResult: ProcessingStatusResponse['result'] | null;

  // Actions
  startUpload: (file: File) => Promise<void>;
  cancelUpload: () => void;
  pollProcessingStatus: () => Promise<void>;
  resetUpload: () => void;
}

const initialState: Pick<
  UploadStore,
  'uploadStatus' | 'taskId' | 'fileId' | 'processingResult'
> = {
  uploadStatus: {
    status: 'idle',
    progress: 0,
    fileName: null,
    fileSize: null,
    error: null,
    uploadedFileId: null,
  },
  taskId: null,
  fileId: null,
  processingResult: null,
};

export const useUploadStore = create<UploadStore>((set, get) => ({
  ...initialState,

  startUpload: async (file: File) => {
    // Reset previous state
    set({
      ...initialState,
      uploadStatus: {
        status: 'uploading',
        progress: 0,
        fileName: file.name,
        fileSize: file.size,
        error: null,
        uploadedFileId: null,
      },
    });

    try {
      // Upload file with progress tracking
      const { taskId, fileId } = await uploadIFCFile(file, (progress) => {
        set((state) => ({
          uploadStatus: {
            ...state.uploadStatus,
            progress,
          },
        }));
      });

      // Upload complete, start processing
      set({
        taskId,
        fileId,
        uploadStatus: {
          status: 'processing',
          progress: 100,
          fileName: file.name,
          fileSize: file.size,
          error: null,
          uploadedFileId: fileId,
        },
      });

      // Start polling processing status
      get().pollProcessingStatus();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Upload failed. Please try again.';

      set((state) => ({
        uploadStatus: {
          ...state.uploadStatus,
          status: 'error',
          error: errorMessage,
        },
      }));

      console.error('[UploadStore] Upload failed:', error);
    }
  },

  cancelUpload: () => {
    // TODO: Implement actual cancellation (abort XHR request)
    set({
      uploadStatus: {
        ...get().uploadStatus,
        status: 'idle',
        progress: 0,
        error: 'Upload cancelled by user',
      },
    });
  },

  pollProcessingStatus: async () => {
    const { taskId } = get();
    if (!taskId) return;

    try {
      const statusResponse = await getProcessingStatus(taskId);

      if (statusResponse.status === 'completed') {
        set({
          processingResult: statusResponse.result || null,
          uploadStatus: {
            ...get().uploadStatus,
            status: 'success',
          },
        });

        console.log('[UploadStore] Processing complete:', statusResponse.result);
      } else if (statusResponse.status === 'failed') {
        set({
          uploadStatus: {
            ...get().uploadStatus,
            status: 'error',
            error: statusResponse.error || 'Processing failed',
          },
        });

        console.error('[UploadStore] Processing failed:', statusResponse.error);
      } else {
        // Still processing, poll again in 2 seconds
        setTimeout(() => {
          get().pollProcessingStatus();
        }, 2000);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to check processing status';

      set({
        uploadStatus: {
          ...get().uploadStatus,
          status: 'error',
          error: errorMessage,
        },
      });

      console.error('[UploadStore] Status polling failed:', error);
    }
  },

  resetUpload: () => {
    set(initialState);
  },
}));