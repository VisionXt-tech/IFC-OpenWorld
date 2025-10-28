import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { config } from '@/config';
import './CesiumGlobe.css';

/**
 * CesiumGlobe Component
 *
 * Displays a 3D globe using CesiumJS for geospatial visualization of buildings.
 * Validated in POC-2: 0.06s initialization (50x faster than 3s target).
 *
 * @see specs/001-plan.md Task 3.5
 * @see poc/POC-2-cesium-viewer/RESULTS.md
 */

export interface CesiumGlobeProps {
  /**
   * Optional initial camera position
   * Default: Rome, Italy (Colosseum coordinates from POC-1)
   */
  initialPosition?: {
    longitude: number;
    latitude: number;
    height: number;
  };
  /**
   * Callback when globe is ready
   */
  onReady?: (viewer: Cesium.Viewer) => void;
  /**
   * Callback for errors during initialization
   */
  onError?: (error: Error) => void;
}

function CesiumGlobe({
  initialPosition = {
    longitude: 12.492333, // Rome, Colosseum
    latitude: 41.890222,
    height: 5000
  },
  onReady,
  onError
}: CesiumGlobeProps) {
  const cesiumContainer = useRef<HTMLDivElement>(null);
  const viewer = useRef<Cesium.Viewer | null>(null);

  useEffect(() => {
    if (!cesiumContainer.current) return;

    const startTime = performance.now();

    try {
      // Set Cesium Ion access token from environment
      if (config.cesium.ionToken) {
        Cesium.Ion.defaultAccessToken = config.cesium.ionToken;
      } else {
        console.warn('[CesiumGlobe] No Ion token provided. Using OpenStreetMap fallback.');
      }

      // Initialize Cesium Viewer
      const viewerInstance = new Cesium.Viewer(cesiumContainer.current, {
        // Use Cesium Ion World Imagery if token available, otherwise OSM
        baseLayer: config.cesium.ionToken
          ? Cesium.ImageryLayer.fromWorldImagery({})
          : new Cesium.ImageryLayer(
              new Cesium.OpenStreetMapImageryProvider({
                url: 'https://tile.openstreetmap.org/'
              })
            ),
        // Minimal UI for clean interface
        animation: false,
        timeline: false,
        geocoder: false,
        homeButton: true,
        sceneModePicker: false,
        navigationHelpButton: true,
        baseLayerPicker: false,
        fullscreenButton: true,
        // Enable shadows for better 3D visualization
        shadows: true,
        // Enable terrain for realistic elevation
        terrain: config.cesium.ionToken
          ? Cesium.Terrain.fromWorldTerrain()
          : undefined,
      });

      viewer.current = viewerInstance;

      // Fly to initial position
      viewerInstance.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(
          initialPosition.longitude,
          initialPosition.latitude,
          initialPosition.height
        ),
        orientation: {
          heading: Cesium.Math.toRadians(0),
          pitch: Cesium.Math.toRadians(-45),
          roll: 0.0
        },
        duration: 2
      });

      const elapsed = performance.now() - startTime;

      if (config.features.debug) {
        console.log(`[CesiumGlobe] Initialized in ${(elapsed / 1000).toFixed(3)}s`);
        console.log(`[CesiumGlobe] Camera: ${initialPosition.latitude}°, ${initialPosition.longitude}°`);
        console.log(`[CesiumGlobe] Ion token: ${config.cesium.ionToken ? 'Configured' : 'Not set'}`);
      }

      // Call onReady callback
      onReady?.(viewerInstance);

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error('[CesiumGlobe] Initialization error:', err);
      onError?.(err);
    }

    // Cleanup on unmount
    return () => {
      if (viewer.current) {
        viewer.current.destroy();
        viewer.current = null;
      }
    };
  }, [initialPosition.longitude, initialPosition.latitude, initialPosition.height, onReady, onError]);

  return (
    <div className="cesium-globe-container">
      <div
        ref={cesiumContainer}
        className="cesium-viewer"
        aria-label="3D Globe Viewer"
        role="application"
      />
    </div>
  );
}

export default CesiumGlobe;
