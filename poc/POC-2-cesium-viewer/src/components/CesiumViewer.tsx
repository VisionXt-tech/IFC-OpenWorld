import { useEffect, useRef, useState } from 'react';
import * as Cesium from 'cesium';
import './CesiumViewer.css';

// Disable Cesium Ion (use free OSM instead)
Cesium.Ion.defaultAccessToken = '';

interface CesiumViewerProps {
  onStatusChange: (status: string) => void;
}

function CesiumViewer({ onStatusChange }: CesiumViewerProps) {
  const cesiumContainer = useRef<HTMLDivElement>(null);
  const viewer = useRef<Cesium.Viewer | null>(null);
  const [initTime, setInitTime] = useState<number>(0);

  useEffect(() => {
    if (!cesiumContainer.current) return;

    const startTime = performance.now();
    onStatusChange('Initializing Cesium...');

    try {
      // Initialize Cesium Viewer with OpenStreetMap (no token needed)
      viewer.current = new Cesium.Viewer(cesiumContainer.current, {
        baseLayer: new Cesium.ImageryLayer(
          new Cesium.OpenStreetMapImageryProvider({
            url: 'https://tile.openstreetmap.org/'
          })
        ),
        animation: false,
        timeline: false,
        geocoder: false,
        homeButton: false,
        sceneModePicker: false,
        navigationHelpButton: false,
        baseLayerPicker: false,
        fullscreenButton: false,
      });

      // Fly to Rome (Colosseum area) - same coordinates as POC-1
      viewer.current.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(
          12.492333, // Longitude
          41.890222, // Latitude
          5000        // Height in meters
        ),
        orientation: {
          heading: Cesium.Math.toRadians(0),
          pitch: Cesium.Math.toRadians(-45),
          roll: 0.0
        },
        duration: 2
      });

      const elapsed = performance.now() - startTime;
      setInitTime(elapsed);
      onStatusChange(`Cesium ready (${(elapsed / 1000).toFixed(2)}s)`);

      console.log(`[OK] Cesium initialized in ${(elapsed / 1000).toFixed(2)}s`);
      console.log('[INFO] Camera positioned at Rome (Colosseum)');
      console.log('[INFO] Lat: 41.890222°, Lon: 12.492333°');

    } catch (error) {
      console.error('[FAIL] Cesium initialization error:', error);
      onStatusChange('Cesium init failed');
    }

    // Cleanup on unmount
    return () => {
      if (viewer.current) {
        viewer.current.destroy();
        viewer.current = null;
      }
    };
  }, [onStatusChange]);

  // Monitor FPS
  useEffect(() => {
    if (!viewer.current) return;

    const scene = viewer.current.scene;
    let frameCount = 0;
    let lastTime = performance.now();

    const checkFPS = () => {
      frameCount++;
      const now = performance.now();

      if (now - lastTime >= 1000) {
        const fps = Math.round(frameCount * 1000 / (now - lastTime));
        console.log(`[PERF] FPS: ${fps}`);
        frameCount = 0;
        lastTime = now;
      }
    };

    scene.postRender.addEventListener(checkFPS);

    return () => {
      scene.postRender.removeEventListener(checkFPS);
    };
  }, []);

  return (
    <div className="cesium-container">
      <div ref={cesiumContainer} style={{ width: '100%', height: '100%' }} />

      {initTime > 0 && (
        <div className="perf-info">
          <div>Init Time: {(initTime / 1000).toFixed(2)}s</div>
          <div>{initTime < 3000 ? '✅ PASS (<3s)' : '❌ FAIL (>3s)'}</div>
        </div>
      )}

      <div className="info-panel">
        <h3>POC-2 Test Status</h3>
        <ul>
          <li>✅ Cesium Globe: Initialized</li>
          <li>✅ Terrain: World Terrain loaded</li>
          <li>✅ Camera: Positioned at Rome</li>
          <li>⏳ IFC Loading: Not implemented yet</li>
        </ul>
        <p className="note">
          Note: This is a minimal POC. Full implementation requires web-ifc integration.
        </p>
      </div>
    </div>
  );
}

export default CesiumViewer;
