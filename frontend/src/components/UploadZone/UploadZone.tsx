import { useCallback, useState } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { config } from '@/config';
import { logger } from '@/utils/logger';
import './UploadZone.css';

/**
 * UploadZone Component
 *
 * Drag-and-drop file upload zone for IFC files.
 * Supports validation (file size, extension) and progress tracking.
 *
 * @see specs/001-plan.md Task 3.3
 */

export interface UploadZoneProps {
  /**
   * Callback when file is accepted and ready to upload
   */
  onFileAccepted?: (file: File) => void;
  /**
   * Callback when upload progress changes (0-100)
   */
  onProgress?: (progress: number) => void;
  /**
   * Upload progress (0-100)
   */
  progress?: number;
  /**
   * Whether an upload is currently in progress
   */
  isUploading?: boolean;
  /**
   * Error message to display
   */
  error?: string | null;
  /**
   * Callback to cancel upload
   */
  onCancel?: () => void;
  /**
   * Callback to reset/clear error state
   */
  onReset?: () => void;
}

function UploadZone({
  onFileAccepted,
  progress = 0,
  isUploading = false,
  error = null,
  onCancel,
  onReset
}: UploadZoneProps) {
  const [validationError, setValidationError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[], fileRejections: FileRejection[]) => {
    setValidationError(null);

    // Handle file rejections
    if (fileRejections.length > 0) {
      const rejection = fileRejections[0];
      if (!rejection) return;

      const errorCode = rejection.errors[0]?.code;

      if (errorCode === 'file-too-large') {
        setValidationError(
          `File size exceeds ${config.upload.maxSizeMB}MB limit. Please choose a smaller file.`
        );
      } else if (errorCode === 'file-invalid-type') {
        setValidationError(
          `Only IFC files are accepted. Please upload a file with ${config.upload.allowedExtensions.join(', ')} extension.`
        );
      } else {
        setValidationError('File validation failed. Please try again.');
      }
      return;
    }

    // Handle accepted file
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      if (!file) return;

      if (config.features.debug) {
        logger.debug('[UploadZone] File accepted:', {
          name: file.name,
          size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
          type: file.type
        });
      }

      onFileAccepted?.(file);
    }
  }, [onFileAccepted]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'application/x-step': ['.ifc'],
      'application/octet-stream': ['.ifc']
    },
    maxSize: config.upload.maxSizeBytes,
    maxFiles: 1,
    disabled: isUploading,
    multiple: false
  });

  const displayError = error ?? validationError;

  return (
    <div className="upload-zone-container">
      <div
        {...getRootProps()}
        className={`upload-zone ${isDragActive ? 'drag-active' : ''} ${isDragReject ? 'drag-reject' : ''} ${isUploading ? 'uploading' : ''} ${displayError ? 'error' : ''}`}
        aria-label="File upload zone"
        role="button"
        tabIndex={0}
      >
        <input {...getInputProps()} aria-label="File input" />

        {isUploading ? (
          <div className="upload-progress">
            <div className="upload-icon">📤</div>
            <h3>Uploading...</h3>
            <div className="progress-bar-container">
              <div className="progress-bar" style={{ width: `${progress}%` }} />
            </div>
            <p className="progress-text">{progress}%</p>
            {onCancel && (
              <button
                className="cancel-button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCancel();
                }}
                type="button"
              >
                Cancel Upload
              </button>
            )}
          </div>
        ) : displayError ? (
          <div className="upload-error">
            <div className="error-icon">❌</div>
            <h3>Upload Failed</h3>
            <p className="error-message">{displayError}</p>
            <button
              className="retry-button"
              onClick={(e) => {
                e.stopPropagation();
                setValidationError(null);
                onReset?.();
              }}
              type="button"
            >
              Try Again
            </button>
          </div>
        ) : isDragActive ? (
          <div className="upload-active">
            <div className="upload-icon">📥</div>
            <h3>Drop your IFC file here</h3>
          </div>
        ) : (
          <div className="upload-idle">
            <div className="upload-icon">📁</div>
            <h3>Drag & drop your IFC file here</h3>
            <p className="upload-hint">or click to browse</p>
            <div className="upload-requirements">
              <p>Requirements:</p>
              <ul>
                <li>File type: {config.upload.allowedExtensions.join(', ')}</li>
                <li>Max size: {config.upload.maxSizeMB}MB</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default UploadZone;
