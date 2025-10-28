import { useState } from 'react';
import type { Viewer } from 'cesium';
import CesiumGlobe from '@/components/CesiumGlobe';
import UploadZone from '@/components/UploadZone';
import './App.css';

function App() {
  const [globeReady, setGlobeReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUploadZone, setShowUploadZone] = useState(true);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleGlobeReady = (viewer: Viewer) => {
    setGlobeReady(true);
    console.log('[App] CesiumGlobe ready', viewer);
  };

  const handleGlobeError = (err: Error) => {
    setError(err.message);
    console.error('[App] CesiumGlobe error:', err);
  };

  const handleFileAccepted = (file: File) => {
    console.log('[App] File accepted:', file.name);
    setIsUploading(true);
    setUploadError(null);

    // TODO: Implement actual upload logic in Task 3.4 with Zustand store
    // For now, simulate upload progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setUploadProgress(progress);

      if (progress >= 100) {
        clearInterval(interval);
        setIsUploading(false);
        setShowUploadZone(false);
        console.log('[App] Upload complete (simulated)');
      }
    }, 500);
  };

  const handleCancelUpload = () => {
    console.log('[App] Upload cancelled');
    setIsUploading(false);
    setUploadProgress(0);
  };

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
            progress={uploadProgress}
            isUploading={isUploading}
            error={uploadError}
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
        <p>Milestone 3 - Task 3.3: UploadZone Component Complete</p>
      </footer>
    </div>
  );
}

export default App;
