import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { config } from '@/config';
import { useBuildingsStore } from '@/store';
import { sanitizeCesiumLabel } from '@/utils/sanitize';
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
  /**
   * Show 3D models instead of 2D markers
   * Default: false (2D markers)
   */
  show3DModels?: boolean;
}

/**
 * Helper function to fly camera to specific coordinates
 * Use this after upload to zoom to building location
 */
export function flyToLocation(
  viewer: Cesium.Viewer,
  longitude: number,
  latitude: number,
  height = 5000,
  duration = 2
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
  onBuildingClick,
  show3DModels = false,
}: CesiumGlobeProps) {
  const cesiumContainer = useRef<HTMLDivElement>(null);
  const viewer = useRef<Cesium.Viewer | null>(null);
  const markerMap = useRef<Map<string, Cesium.Entity>>(new Map()); // OPT-003: Track markers for incremental updates
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
      // BUGFIX: Store handler reference for proper cleanup
      if (onBuildingClick) {
        viewerInstance.screenSpaceEventHandler.setInputAction((movement: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
          const pickedObject = viewerInstance.scene.pick(movement.position) as
            | { id?: Cesium.Entity | { id?: string } }
            | undefined;
          // BUGFIX: Type-safe checking instead of unsafe cast
          if (
            Cesium.defined(pickedObject) &&
            pickedObject.id instanceof Cesium.Entity &&
            typeof pickedObject.id.id === 'string'
          ) {
            onBuildingClick(pickedObject.id.id);
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
      // BUGFIX: Clear marker map to prevent memory leak
      markerMap.current.clear();

      // BUGFIX: Remove click event handler to prevent memory leak
      if (viewer.current) {
        try {
          viewer.current.screenSpaceEventHandler.removeInputAction(
            Cesium.ScreenSpaceEventType.LEFT_CLICK
          );
        } catch (error) {
          // Ignore error if handler was never set
          console.debug('[CesiumGlobe] Event handler cleanup (already removed or not set)');
        }

        viewer.current.destroy();
        viewer.current = null;
      }
    };
  }, []); // Empty dependency array - initialize only once

  // Add building markers when buildings data changes
  // OPT-003: Incremental marker updates (10x-100x faster than removeAll)
  // VULN-003: XSS protection with sanitization
  useEffect(() => {
    if (!viewer.current) return;

    console.log(`[CesiumGlobe] Updating markers (${buildings.length} buildings)`);

    // Create a set of current building IDs for fast lookup
    const currentBuildingIds = new Set(buildings.map((b) => b.id));

    // Remove markers for deleted buildings
    markerMap.current.forEach((entity, id) => {
      if (!currentBuildingIds.has(id) && viewer.current) {
        viewer.current.entities.remove(entity);
        markerMap.current.delete(id);
        console.log(`[CesiumGlobe] Removed marker: ${id}`);
      }
    });

    // Add new markers (skip existing ones)
    let addedCount = 0;
    buildings.forEach((buildingFeature) => {
      // Skip if marker already exists or viewer is not ready
      if (markerMap.current.has(buildingFeature.id) || !viewer.current) {
        return;
      }

      const { geometry, properties } = buildingFeature;
      const [longitude, latitude] = geometry.coordinates;

      // VULN-003 FIX: Sanitize building name to prevent XSS
      const safeName = sanitizeCesiumLabel(properties.name);

      // Check if 3D model is available and user wants 3D view
      const has3DModel = !!properties.modelUrl;
      const use3D = show3DModels && has3DModel;

      if (use3D) {
        // Load 3D model (glTF/glB)
        console.log(`[CesiumGlobe] Loading 3D model for ${safeName}:`, properties.modelUrl);

        try {
          // Calculate height offset - position model at ground level or use building height if available
          const heightOffset = 0; // Models should be at ground level

          // Create entity with 3D model
          const entity = viewer.current.entities.add({
            id: buildingFeature.id,
            name: safeName,
            position: Cesium.Cartesian3.fromDegrees(longitude, latitude, heightOffset),
            model: {
              uri: `${config.api.baseUrl}${properties.modelUrl}`,
              minimumPixelSize: 64, // Reduced from 128 for better performance
              maximumScale: 20000,
              scale: 1.0,
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND, // Clamp to terrain
              silhouetteColor: Cesium.Color.fromCssColorString('#00bcd4'),
              silhouetteSize: 0, // No silhouette by default
            },
            label: {
              text: safeName, // Safe: sanitized
              font: '14px sans-serif',
              fillColor: Cesium.Color.WHITE,
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 2,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
              pixelOffset: new Cesium.Cartesian2(0, -60), // Increased offset for 3D models
              showBackground: true,
              backgroundColor: new Cesium.Color(0, 0, 0, 0.7),
              disableDepthTestDistance: Number.POSITIVE_INFINITY, // Always show label
            },
          });

          // Add silhouette on hover (for better visibility)
          if (entity.model) {
            entity.model.silhouetteSize = new Cesium.ConstantProperty(2);
          }

          markerMap.current.set(buildingFeature.id, entity);
          addedCount++;

          console.log(`[CesiumGlobe] 3D model loaded successfully for ${safeName}`);
        } catch (error) {
          console.error(`[CesiumGlobe] Error loading 3D model for ${safeName}:`, error);
          console.warn(`[CesiumGlobe] Falling back to 2D marker for ${safeName}`);

          // Fallback to 2D marker on error
          const entity = viewer.current.entities.add({
            id: buildingFeature.id,
            name: safeName,
            position: Cesium.Cartesian3.fromDegrees(longitude, latitude),
            point: {
              pixelSize: 15,
              color: Cesium.Color.ORANGE, // Orange for fallback markers
              outlineColor: Cesium.Color.WHITE,
              outlineWidth: 2,
            },
            label: {
              text: `${safeName} (3D load failed)`,
              font: '14px sans-serif',
              fillColor: Cesium.Color.WHITE,
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 2,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
              pixelOffset: new Cesium.Cartesian2(0, -20),
            },
          });

          markerMap.current.set(buildingFeature.id, entity);
          addedCount++;
        }
      } else {
        // Show 2D marker (default or fallback)
        const entity = viewer.current.entities.add({
          id: buildingFeature.id,
          name: safeName,
          position: Cesium.Cartesian3.fromDegrees(longitude, latitude),
          point: {
            pixelSize: 15,
            color: Cesium.Color.RED,
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 2,
          },
          label: {
            text: safeName, // Safe: sanitized
            font: '14px sans-serif',
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -20),
          },
        });

        markerMap.current.set(buildingFeature.id, entity);
        addedCount++;
      }
    });

    if (addedCount > 0) {
      console.log(`[CesiumGlobe] Added ${addedCount} new markers`);
    }
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
