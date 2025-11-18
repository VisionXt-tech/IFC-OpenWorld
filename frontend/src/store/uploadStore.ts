import { create } from 'zustand';
import { uploadIFCFile, getProcessingStatus } from '@/services/api';
import type { UploadStatus, ProcessingStatusResponse } from '@/types';
import { logger } from '@/utils/logger';

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
  pollingTimeoutId: NodeJS.Timeout | null; // BUGFIX: Track timeout to prevent race conditions
  isPolling: boolean; // BUGFIX: Prevent concurrent polling requests
  abortController: AbortController | null; // Upload cancellation controller

  // Actions
  startUpload: (file: File) => Promise<void>;
  cancelUpload: () => void;
  pollProcessingStatus: () => Promise<void>;
  resetUpload: () => void;
}

const initialState: Pick<
  UploadStore,
  'uploadStatus' | 'taskId' | 'fileId' | 'processingResult' | 'pollingTimeoutId' | 'isPolling' | 'abortController'
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
  pollingTimeoutId: null,
  isPolling: false,
  abortController: null,
};

export const useUploadStore = create<UploadStore>((set, get) => ({
  ...initialState,

  startUpload: async (file: File) => {
    // Create AbortController for cancellation
    const abortController = new AbortController();

    // Reset previous state
    set({
      ...initialState,
      abortController,
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
      // Upload file with progress tracking and abort signal
      const { taskId, fileId } = await uploadIFCFile(
        file,
        (progress) => {
          set((state) => ({
            uploadStatus: {
              ...state.uploadStatus,
              progress,
            },
          }));
        },
        abortController.signal
      );

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

      logger.debug('[UploadStore] Upload complete, starting IFC processing', { taskId, fileId });

      // Start polling for processing status
      void get().pollProcessingStatus();
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

      logger.error('[UploadStore] Upload failed:', error);
    }
  },

  cancelUpload: () => {
    const state = get();

    // Abort ongoing upload if any
    if (state.abortController) {
      logger.debug('[UploadStore] Aborting upload...');
      state.abortController.abort();
    }

    // Clear polling timeout to prevent race conditions
    if (state.pollingTimeoutId) {
      clearTimeout(state.pollingTimeoutId);
    }

    set({
      uploadStatus: {
        ...get().uploadStatus,
        status: 'idle',
        progress: 0,
        error: 'Upload cancelled by user',
      },
      pollingTimeoutId: null,
      abortController: null,
    });

    logger.info('[UploadStore] Upload cancelled successfully');
  },

  pollProcessingStatus: async () => {
    const state = get();
    const { taskId, pollingTimeoutId, isPolling } = state;
    if (!taskId) return;

    // BUGFIX: Prevent concurrent polling requests (race condition)
    if (isPolling) {
      logger.debug('[UploadStore] Polling already in progress, skipping');
      return;
    }

    // BUGFIX: Clear existing timeout to prevent race conditions
    if (pollingTimeoutId) {
      clearTimeout(pollingTimeoutId);
      set({ pollingTimeoutId: null });
    }

    // Mark as polling
    set({ isPolling: true });

    try {
      const statusResponse = await getProcessingStatus(taskId);

      logger.debug('[UploadStore] Task status:', statusResponse);

      if (statusResponse.status === 'SUCCESS') {
        // Processing complete - but check if result contains an error
        const result = statusResponse.result;

        // Check if the task returned an error (status: 'failed' in result)
        if (result && typeof result === 'object' && 'status' in result && result.status === 'failed') {
          // Task completed but processing failed (e.g., missing coordinates)
          const errorMessage = 'error' in result && typeof result.error === 'string'
            ? result.error
            : 'Processing failed';

          set({
            uploadStatus: {
              ...get().uploadStatus,
              status: 'error',
              error: errorMessage,
            },
            pollingTimeoutId: null,
            isPolling: false,
          });

          logger.error('[UploadStore] Processing failed:', errorMessage);
        } else if (result && typeof result === 'object' && 'status' in result) {
          // Task completed successfully with coordinates
          set({
            processingResult: result,
            uploadStatus: {
              ...get().uploadStatus,
              status: 'success',
            },
            pollingTimeoutId: null,
            isPolling: false,
          });

          logger.debug('[UploadStore] Processing complete:', result);
        } else {
          // Unexpected result format
          set({
            uploadStatus: {
              ...get().uploadStatus,
              status: 'error',
              error: 'Processing completed but returned unexpected result format',
            },
            pollingTimeoutId: null,
            isPolling: false,
          });

          logger.error('[UploadStore] Unexpected result format:', result);
        }
      } else if (statusResponse.status === 'FAILURE') {
        set({
          uploadStatus: {
            ...get().uploadStatus,
            status: 'error',
            error: statusResponse.error ?? 'Processing failed',
          },
          pollingTimeoutId: null,
          isPolling: false,
        });

        logger.error('[UploadStore] Processing failed:', statusResponse.error);
      } else {
        // BUGFIX: Still processing (PENDING, STARTED, RETRY), schedule next poll and track timeout ID
        // Reset isPolling flag before scheduling next poll
        set({ isPolling: false });

        const timeoutId = setTimeout(() => {
          get().pollProcessingStatus().catch((error) => {
            logger.error('[UploadStore] Polling error:', error);
            set({
              uploadStatus: {
                ...get().uploadStatus,
                status: 'error',
                error: 'Failed to check processing status',
              },
              isPolling: false,
            });
          });
        }, 2000);

        set({ pollingTimeoutId: timeoutId });
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
        pollingTimeoutId: null,
        isPolling: false,
      });

      logger.error('[UploadStore] Status polling failed:', error);
    }
  },

  resetUpload: () => {
    // BUGFIX: Clear polling timeout before reset
    const state = get();
    if (state.pollingTimeoutId) {
      clearTimeout(state.pollingTimeoutId);
    }
    set(initialState);
  },
}));