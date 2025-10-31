import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { config } from '@/config';
import { useBuildingsStore } from '@/store';
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
   * Callback when globe is ready
   * Provides viewer instance for camera control
   */
  onReady?: (viewer: Cesium.Viewer) => void;
  /**
   * Callback for errors during initialization
   */
  onError?: (error: Error) => void;
  /**
   * Callback when a building marker is clicked
   * Provides the building ID for showing InfoPanel
   */
  onBuildingClick?: (buildingId: string) => void;
}

/**
 * Helper function to fly camera to specific coordinates
 * Use this after upload to zoom to building location
 */
export function flyToLocation(
  viewer: Cesium.Viewer,
  longitude: number,
  latitude: number,
  height: number = 5000,
  duration: number = 2
): void {
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(longitude, latitude, height),
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-45),
      roll: 0.0
    },
    duration
  });
}

function CesiumGlobe({
  onReady,
  onError,
  onBuildingClick
}: CesiumGlobeProps) {
  const cesiumContainer = useRef<HTMLDivElement>(null);
  const viewer = useRef<Cesium.Viewer | null>(null);
  const buildings = useBuildingsStore((state) => state.buildings);

  useEffect(() => {
    if (!cesiumContainer.current) return;

    const startTime = performance.now();

    try {
      // Set Cesium Ion access token from environment
      if (config.cesium.ionToken) {
        Cesium.Ion.defaultAccessToken = config.cesium.ionToken;
      }
      // Note: If no Ion token is provided, OpenStreetMap imagery is used as fallback

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
        // Disable default InfoBox and SelectionIndicator - we use custom InfoPanel
        infoBox: false,
        selectionIndicator: false,
        // Enable shadows for better 3D visualization
        shadows: true,
        // Enable terrain for realistic elevation
        terrain: config.cesium.ionToken
          ? Cesium.Terrain.fromWorldTerrain()
          : undefined,
      });

      viewer.current = viewerInstance;

      // Set initial camera to view the whole Earth
      viewerInstance.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(0, 20, 20000000), // Global view
        orientation: {
          heading: 0,
          pitch: Cesium.Math.toRadians(-90), // Look straight down
          roll: 0
        }
      });

      const elapsed = performance.now() - startTime;

      if (config.features.debug) {
        console.log(`[CesiumGlobe] Initialized in ${(elapsed / 1000).toFixed(3)}s`);
        console.log(`[CesiumGlobe] Camera: Global view (20M meters altitude)`);
        console.log(`[CesiumGlobe] Ion token: ${config.cesium.ionToken ? 'Configured' : 'Not set'}`);
      }

      // Add click handler for building selection
      if (onBuildingClick) {
        viewerInstance.screenSpaceEventHandler.setInputAction((movement: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
          const pickedObject = viewerInstance.scene.pick(movement.position);
          if (Cesium.defined(pickedObject) && pickedObject.id) {
            const entity = pickedObject.id as Cesium.Entity;
            if (entity.id) {
              onBuildingClick(entity.id);
            }
          }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
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
  }, []); // Empty dependency array - initialize only once

  // Add building markers when buildings data changes
  useEffect(() => {
    if (!viewer.current || buildings.length === 0) return;

    console.log(`[CesiumGlobe] Adding ${buildings.length} buildings to map`);

    // Clear existing entities
    viewer.current.entities.removeAll();

    // Add each building as a marker
    buildings.forEach((buildingFeature) => {
      const { geometry, properties } = buildingFeature;
      const [longitude, latitude] = geometry.coordinates;

      viewer.current!.entities.add({
        id: buildingFeature.id,
        name: properties.name,
        position: Cesium.Cartesian3.fromDegrees(longitude, latitude),
        point: {
          pixelSize: 15,
          color: Cesium.Color.RED,
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2,
        },
        label: {
          text: properties.name,
          font: '14px sans-serif',
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -20),
        },
      });
    });

    console.log(`[CesiumGlobe] Added ${buildings.length} markers`);
  }, [buildings]);

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
