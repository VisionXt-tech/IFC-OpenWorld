import { useState, useRef, useEffect } from 'react';
import type { Viewer } from 'cesium';
import CesiumGlobe, { flyToLocation } from '@/components/CesiumGlobe';
import UploadZone from '@/components/UploadZone';
import { useUploadStore } from '@/store';
import './App.css';

function App() {
  const [globeReady, setGlobeReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUploadZone, setShowUploadZone] = useState(true);
  const viewerRef = useRef<Viewer | null>(null);

  // Zustand store
  const { uploadStatus, processingResult, startUpload, cancelUpload, resetUpload } =
    useUploadStore();

  const handleGlobeReady = (viewer: Viewer) => {
    viewerRef.current = viewer;
    setGlobeReady(true);
    console.log('[App] CesiumGlobe ready', viewer);
  };

  const handleGlobeError = (err: Error) => {
    setError(err.message);
    console.error('[App] CesiumGlobe error:', err);
  };

  const handleFileAccepted = async (file: File) => {
    console.log('[App] File accepted:', file.name);
    await startUpload(file);
  };

  const handleCancelUpload = () => {
    console.log('[App] Upload cancelled');
    cancelUpload();
  };

  // Watch for successful upload
  // TODO (Milestone 4): When Celery processing returns coordinates, fly to building location
  useEffect(() => {
    if (uploadStatus.status === 'success') {
      console.log('[App] Upload complete!', { fileId: uploadStatus.uploadedFileId });

      // If we have processing result with coordinates, fly to building
      if (processingResult && viewerRef.current) {
        const { latitude, longitude } = processingResult.coordinates;

        console.log('[App] Flying to building:', {
          name: processingResult.metadata.name,
          coordinates: { latitude, longitude },
        });

        // Close upload panel
        setShowUploadZone(false);

        // Fly to building location after a short delay
        setTimeout(() => {
          flyToLocation(viewerRef.current!, longitude, latitude, 5000, 3);
        }, 500);
      }

      // Reset upload state after a short delay
      setTimeout(() => {
        resetUpload();
      }, 3000);
    }
  }, [uploadStatus.status, processingResult, uploadStatus.uploadedFileId, resetUpload]);

  if (error) {
    return (
      <div className="app error-state">
        <header className="app-header">
          <h1>IFC OpenWorld</h1>
          <p className="error-message">❌ Error: {error}</p>
        </header>
        <main>
          <div className="card">
            <h2>Globe Initialization Failed</h2>
            <p>Please check your configuration:</p>
            <ul>
              <li>Ensure VITE_CESIUM_ION_TOKEN is set in .env file</li>
              <li>Verify internet connection for Cesium Ion services</li>
              <li>Check browser console for detailed error messages</li>
            </ul>
          </div>
        </main>
      </div>
    );
  }

  const isUploading = uploadStatus.status === 'uploading' || uploadStatus.status === 'processing';

  return (
    <div className="app">
      <header className="app-header-overlay">
        <h1>IFC OpenWorld</h1>
        <p className="status">
          {globeReady ? '✅ Globe Ready' : '⏳ Loading Globe...'}
        </p>
      </header>

      <CesiumGlobe onReady={handleGlobeReady} onError={handleGlobeError} />

      {showUploadZone && (
        <div className="upload-panel-overlay">
          <UploadZone
            onFileAccepted={handleFileAccepted}
            progress={uploadStatus.progress}
            isUploading={isUploading}
            error={uploadStatus.error}
            onCancel={handleCancelUpload}
          />
          <button
            className="close-upload-button"
            onClick={() => setShowUploadZone(false)}
            aria-label="Close upload panel"
            type="button"
          >
            ✕
          </button>
        </div>
      )}

      {!showUploadZone && (
        <button
          className="open-upload-button"
          onClick={() => setShowUploadZone(true)}
          aria-label="Open upload panel"
          type="button"
        >
          📤 Upload IFC
        </button>
      )}

      <footer className="app-footer-overlay">
        <p>Milestone 3 - Task 3.4: Zustand Stores & API Integration Complete</p>
      </footer>
    </div>
  );
}

export default App;
