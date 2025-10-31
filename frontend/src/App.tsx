import { useState, useRef, useEffect } from 'react';
import type { Viewer } from 'cesium';
import CesiumGlobe, { flyToLocation } from '@/components/CesiumGlobe';
import UploadZone from '@/components/UploadZone';
import BuildingsManager from '@/components/BuildingsManager';
import InfoPanel from '@/components/InfoPanel';
import { useUploadStore, useBuildingsStore } from '@/store';
import './App.css';

function App() {
  const [globeReady, setGlobeReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUploadZone, setShowUploadZone] = useState(false); // Start closed to allow free navigation
  const [showBuildingsManager, setShowBuildingsManager] = useState(false);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const viewerRef = useRef<Viewer | null>(null);

  // Zustand stores
  const { uploadStatus, processingResult, startUpload, cancelUpload, resetUpload } =
    useUploadStore();
  const { buildings, fetchBuildings } = useBuildingsStore();

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

  const handleBuildingClick = (buildingId: string) => {
    console.log('[App] Building clicked:', buildingId);
    setSelectedBuildingId(buildingId);
  };

  const handleCloseInfoPanel = () => {
    setSelectedBuildingId(null);
  };

  // Find the selected building from the store
  const selectedBuilding = selectedBuildingId
    ? buildings.find((b) => b.id === selectedBuildingId) || null
    : null;

  // Load buildings when globe is ready
  useEffect(() => {
    if (globeReady) {
      console.log('[App] Globe ready, fetching buildings...');
      fetchBuildings();
    }
  }, [globeReady, fetchBuildings]);

  // Keyboard navigation: Escape to close panels
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Close upload zone if open
        if (showUploadZone) {
          setShowUploadZone(false);
        }
        // Close buildings manager if open
        if (showBuildingsManager) {
          setShowBuildingsManager(false);
        }
        // Close info panel if open
        if (selectedBuildingId) {
          setSelectedBuildingId(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showUploadZone, showBuildingsManager, selectedBuildingId]);

  // Watch for successful upload
  useEffect(() => {
    if (uploadStatus.status === 'success') {
      console.log('[App] Upload complete!', { fileId: uploadStatus.uploadedFileId });

      // Reload buildings from database to show the new marker
      console.log('[App] Reloading buildings from database...');
      fetchBuildings();

      // If we have processing result with coordinates, fly to building
      if (processingResult && processingResult.status === 'completed' && viewerRef.current) {
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
  }, [uploadStatus.status, processingResult, uploadStatus.uploadedFileId, resetUpload, fetchBuildings]);

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

      <CesiumGlobe
        onReady={handleGlobeReady}
        onError={handleGlobeError}
        onBuildingClick={handleBuildingClick}
      />

      {showUploadZone && (
        <div className="upload-panel-overlay">
          <UploadZone
            onFileAccepted={handleFileAccepted}
            progress={uploadStatus.progress}
            isUploading={isUploading}
            error={uploadStatus.error}
            onCancel={handleCancelUpload}
            onReset={resetUpload}
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

      {!showUploadZone && (
        <button
          className="open-manager-button"
          onClick={() => setShowBuildingsManager(true)}
          aria-label="Open buildings manager"
          type="button"
        >
          🏗️ Manage Buildings
        </button>
      )}

      {showBuildingsManager && (
        <BuildingsManager onClose={() => setShowBuildingsManager(false)} />
      )}

      {selectedBuilding && (
        <InfoPanel building={selectedBuilding} onClose={handleCloseInfoPanel} />
      )}

      <footer className="app-footer-overlay">
        <p>Milestone 3 - Task 3.8: Keyboard Navigation Complete</p>
      </footer>
    </div>
  );
}

export default App;
