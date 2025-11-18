import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { Viewer } from 'cesium';
import CesiumGlobe, { flyToLocation } from '@/components/CesiumGlobe';
import UploadZone from '@/components/UploadZone';
import BuildingsManager from '@/components/BuildingsManager';
import InfoPanel from '@/components/InfoPanel';
import { ThemeToggle } from '@/components/ThemeToggle';
import { KeyboardShortcutsHelp } from '@/components/KeyboardShortcutsHelp';
import { useUploadStore, useBuildingsStore } from '@/store';
import { useToast } from '@/contexts/ToastContext';
import { useKeyboardShortcut } from '@/utils/keyboardShortcuts';
import { logger } from '@/utils/logger';
import { useWebVitals, useRenderTime } from '@/hooks/usePerformance';
import { stopCacheAutoCleanup } from '@/utils/cache';
import './App.css';

function App() {
  // Performance monitoring
  useWebVitals();
  useRenderTime('App');

  // Cleanup cache interval on app unmount
  useEffect(() => {
    return () => {
      stopCacheAutoCleanup();
    };
  }, []);

  const [globeReady, setGlobeReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUploadZone, setShowUploadZone] = useState(false); // Start closed to allow free navigation
  const [showBuildingsManager, setShowBuildingsManager] = useState(false);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [show3DModels, setShow3DModels] = useState(false); // Toggle between 2D markers and 3D models
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const viewerRef = useRef<Viewer | null>(null);

  // Zustand stores
  const { uploadStatus, processingResult, startUpload, cancelUpload, resetUpload } =
    useUploadStore();
  const { buildings, fetchBuildings } = useBuildingsStore();
  const { info, warning } = useToast();

  // Calculate how many buildings have 3D models (memoized for performance)
  const buildingsWithModels = useMemo(
    () => buildings.filter((b) => b.properties.modelUrl).length,
    [buildings]
  );

  // PERFORMANCE: Memoize callbacks to prevent unnecessary re-renders
  const handleGlobeReady = useCallback((viewer: Viewer) => {
    viewerRef.current = viewer;
    setGlobeReady(true);
    logger.debug('[App] CesiumGlobe ready', viewer);
  }, []);

  const handleGlobeError = useCallback((err: Error) => {
    setError(err.message);
    logger.error('[App] CesiumGlobe error:', err);
  }, []);

  const handleFileAccepted = useCallback(async (file: File) => {
    logger.debug('[App] File accepted:', file.name);
    try {
      await startUpload(file);
    } catch (error) {
      logger.error('[App] Upload failed:', error);
      setError(error instanceof Error ? error.message : 'Upload failed');
    }
  }, [startUpload]);

  const handleCancelUpload = useCallback(() => {
    logger.debug('[App] Upload cancelled');
    cancelUpload();
  }, [cancelUpload]);

  const handleBuildingClick = useCallback((buildingId: string) => {
    logger.debug('[App] Building clicked:', buildingId);
    setSelectedBuildingId(buildingId);
  }, []);

  const handleCloseInfoPanel = useCallback(() => {
    setSelectedBuildingId(null);
  }, []);

  const handleToggleUploadZone = useCallback(() => {
    setShowUploadZone((prev) => !prev);
  }, []);

  const handleToggleBuildingsManager = useCallback(() => {
    setShowBuildingsManager((prev) => !prev);
  }, []);

  const handleToggle3DView = useCallback(() => {
    const newMode = !show3DModels;
    setShow3DModels(newMode);

    // Show notifications based on state
    if (newMode) {
      // Switching to 3D
      if (buildingsWithModels === 0) {
        warning('No 3D models available yet. Upload IFC files with geometry to see 3D buildings.', 5000);
      } else if (buildingsWithModels < buildings.length) {
        info(`3D View enabled. Showing ${buildingsWithModels} building(s) in 3D (${buildings.length - buildingsWithModels} without 3D models will show as markers).`, 4000);
      } else {
        info(`3D View enabled. All ${buildingsWithModels} building(s) have 3D models.`, 3000);
      }
    } else {
      // Switching to 2D
      info('2D View enabled. Showing all buildings as markers.', 2000);
    }
  }, [show3DModels, buildingsWithModels, buildings.length, info, warning]);

  // Find the selected building from the store
  // CODE QUALITY: Use nullish coalescing (??) instead of || for better handling of falsy values
  const selectedBuilding = selectedBuildingId
    ? buildings.find((b) => b.id === selectedBuildingId) ?? null
    : null;

  // Load buildings when globe is ready
  // BUGFIX: Handle promise properly and use stable reference
  useEffect(() => {
    if (globeReady) {
      logger.debug('[App] Globe ready, fetching buildings...');
      void fetchBuildings().catch((error) => {
        logger.error('[App] Failed to fetch buildings:', error);
        setError('Failed to load buildings');
      });
    }
    // fetchBuildings is from Zustand store and is stable, no need in deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globeReady]);

  // Keyboard Shortcuts - Centralized with useKeyboardShortcut
  // Escape: Close any open panel
  useKeyboardShortcut(
    'app.closePanel',
    {
      key: 'Escape',
      description: 'Close open panels',
      handler: () => {
        if (showUploadZone) {
          setShowUploadZone(false);
        } else if (showBuildingsManager) {
          setShowBuildingsManager(false);
        } else if (selectedBuildingId) {
          setSelectedBuildingId(null);
        }
      },
    },
    [showUploadZone, showBuildingsManager, selectedBuildingId]
  );

  // U: Toggle upload zone
  useKeyboardShortcut(
    'app.toggleUpload',
    {
      key: 'u',
      description: 'Toggle upload panel',
      handler: () => setShowUploadZone((prev) => !prev),
    },
    []
  );

  // B: Toggle buildings manager
  useKeyboardShortcut(
    'app.toggleBuildings',
    {
      key: 'b',
      description: 'Toggle buildings manager',
      handler: () => setShowBuildingsManager((prev) => !prev),
    },
    []
  );

  // M: Toggle 3D models
  useKeyboardShortcut(
    'app.toggle3D',
    {
      key: 'm',
      description: 'Toggle 3D models',
      handler: () => {
        setShow3DModels((prev) => {
          const newMode = !prev;
          // Use updated value instead of stale closure
          info(newMode ? '3D models enabled' : '2D markers enabled');
          return newMode;
        });
      },
    },
    [info]
  );

  // ?: Show keyboard shortcuts help
  useKeyboardShortcut(
    'app.showHelp',
    {
      key: '?',
      shift: true,
      description: 'Show keyboard shortcuts help',
      handler: () => setShowShortcutsHelp(true),
    },
    []
  );

  // Watch for successful upload
  // BUGFIX: Handle promises properly
  useEffect(() => {
    if (uploadStatus.status === 'success') {
      logger.debug('[App] Upload complete!', { fileId: uploadStatus.uploadedFileId });

      // Reload buildings from database to show the new marker
      logger.debug('[App] Reloading buildings from database...');
      void fetchBuildings().catch((error) => {
        logger.error('[App] Failed to reload buildings:', error);
        setError('Failed to reload buildings after upload');
      });

      // If we have processing result with coordinates, fly to building
      if (processingResult && processingResult.status === 'completed' && viewerRef.current) {
        const { latitude, longitude } = processingResult.coordinates;

        logger.debug('[App] Flying to building:', {
          name: processingResult.metadata.name,
          coordinates: { latitude, longitude },
        });

        // Close upload panel
        setShowUploadZone(false);

        // BUGFIX: Type-safe null check before flying
        // Fly to building location after a short delay
        setTimeout(() => {
          if (viewerRef.current) {
            flyToLocation(viewerRef.current, longitude, latitude, 5000, 3);
          }
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
      {/* Skip links for keyboard navigation */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <a href="#controls" className="skip-link">
        Skip to controls
      </a>

      <header className="app-header-overlay">
        <div className="header-content">
          <div className="header-left">
            <h1>IFC OpenWorld</h1>
            <p className="status">
              {globeReady ? '✅ Globe Ready' : '⏳ Loading Globe...'}
            </p>
          </div>
          <div className="header-right">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main id="main-content">
        <CesiumGlobe
          onReady={handleGlobeReady}
          onError={handleGlobeError}
          onBuildingClick={handleBuildingClick}
          show3DModels={show3DModels}
        />
      </main>

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
            onClick={handleToggleUploadZone}
            aria-label="Close upload panel"
            type="button"
          >
            ✕
          </button>
        </div>
      )}

      <div id="controls" role="toolbar" aria-label="Application controls">
        {!showUploadZone && (
          <button
            className="open-upload-button"
            onClick={handleToggleUploadZone}
            aria-label="Open upload panel"
            type="button"
          >
            📤 Upload IFC
          </button>
        )}

        {!showUploadZone && (
          <button
            className="open-manager-button"
            onClick={handleToggleBuildingsManager}
            aria-label="Open buildings manager"
            type="button"
          >
            🏗️ Manage Buildings
          </button>
        )}

        {!showUploadZone && (
          <button
            className="toggle-3d-button"
            onClick={handleToggle3DView}
            aria-label={show3DModels ? 'Switch to 2D markers' : 'Switch to 3D models'}
            type="button"
            title={buildingsWithModels > 0
              ? `${buildingsWithModels} of ${buildings.length} building(s) have 3D models`
              : 'No 3D models available yet'}
          >
            {show3DModels ? '📍 2D View' : `🏢 3D View${buildingsWithModels > 0 ? ` (${buildingsWithModels})` : ''}`}
          </button>
        )}
      </div>

      {showBuildingsManager && (
        <BuildingsManager
          onClose={handleToggleBuildingsManager}
        />
      )}

      {selectedBuilding && (
        <InfoPanel building={selectedBuilding} onClose={handleCloseInfoPanel} />
      )}

      {/* Keyboard Shortcuts Help Modal */}
      <KeyboardShortcutsHelp
        isOpen={showShortcutsHelp}
        onClose={() => setShowShortcutsHelp(false)}
      />
    </div>
  );
}

export default App;
