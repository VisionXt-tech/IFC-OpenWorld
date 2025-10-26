/**
 * IFC Parsing Test Component
 * POC Task T119: Validate web-ifc parsing in browser
 */

import React, { useState, useRef, useEffect } from 'react';
import './IfcTest.css';

interface TestResults {
  initTime?: number;
  parseTime?: number;
  memoryUsed?: number;
  modelID?: number;
  lineCount?: number;
  entities?: {
    projects: number;
    sites: number;
    buildings: number;
  };
  coordinates?: {
    siteName: string;
    latitude: number | null;
    longitude: number | null;
    elevation: number | null;
  };
  geometry?: {
    walls: number;
    slabs: number;
    beams: number;
    columns: number;
    total: number;
  };
}

interface TestStatus {
  phase: 'idle' | 'init' | 'loading' | 'parsing' | 'extracting' | 'complete' | 'error';
  message: string;
  progress: number;
}

export const IfcTest: React.FC = () => {
  const [status, setStatus] = useState<TestStatus>({
    phase: 'idle',
    message: 'Ready to test web-ifc parsing',
    progress: 0
  });
  const [results, setResults] = useState<TestResults>({});
  const [error, setError] = useState<string | null>(null);
  const [fps, setFps] = useState<number>(60);

  const workerRef = useRef<Worker | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fpsIntervalRef = useRef<number | null>(null);

  // Initialize worker on component mount
  useEffect(() => {
    // Create worker
    const worker = new Worker(
      new URL('../workers/ifcWorker.ts', import.meta.url),
      { type: 'module' }
    );

    // Handle worker messages
    worker.onmessage = (event) => {
      const { type, data, error, metrics } = event.data;

      if (type === 'ERROR') {
        setError(error || 'Unknown error');
        setStatus({
          phase: 'error',
          message: error || 'Unknown error',
          progress: 0
        });
        stopFpsMonitoring();
        return;
      }

      switch (type) {
        case 'INIT_COMPLETE':
          setResults(prev => ({ ...prev, initTime: metrics?.initTime }));
          setStatus({
            phase: 'loading',
            message: `Initialized in ${metrics?.initTime}ms. Select IFC file to parse.`,
            progress: 25
          });
          break;

        case 'PARSE_COMPLETE':
          setResults(prev => ({
            ...prev,
            parseTime: metrics?.parseTime,
            memoryUsed: metrics?.memoryUsed,
            modelID: data.modelID,
            lineCount: data.lineCount,
            entities: data.entities
          }));
          setStatus({
            phase: 'extracting',
            message: `Parsed ${data.lineCount} lines in ${metrics?.parseTime}ms. Extracting coordinates...`,
            progress: 50
          });

          // Extract coordinates
          worker.postMessage({ type: 'GET_COORDINATES', data: data.modelID });
          break;

        case 'COORDINATES':
          setResults(prev => ({ ...prev, coordinates: data }));
          setStatus({
            phase: 'extracting',
            message: `Coordinates extracted: ${data.latitude?.toFixed(6)}, ${data.longitude?.toFixed(6)}. Getting geometry...`,
            progress: 75
          });

          // Get geometry stats
          worker.postMessage({ type: 'GET_GEOMETRY', data: results.modelID });
          break;

        case 'GEOMETRY':
          setResults(prev => ({ ...prev, geometry: data }));
          setStatus({
            phase: 'complete',
            message: 'All tests complete!',
            progress: 100
          });
          stopFpsMonitoring();
          break;
      }
    };

    worker.onerror = (err) => {
      setError(err.message);
      setStatus({
        phase: 'error',
        message: err.message,
        progress: 0
      });
      stopFpsMonitoring();
    };

    workerRef.current = worker;

    // Cleanup
    return () => {
      worker.terminate();
      stopFpsMonitoring();
    };
  }, []);

  // Start FPS monitoring
  const startFpsMonitoring = () => {
    let lastTime = performance.now();
    let frames = 0;

    const measureFps = () => {
      const currentTime = performance.now();
      frames++;

      if (currentTime >= lastTime + 1000) {
        setFps(Math.round(frames * 1000 / (currentTime - lastTime)));
        frames = 0;
        lastTime = currentTime;
      }

      fpsIntervalRef.current = requestAnimationFrame(measureFps);
    };

    fpsIntervalRef.current = requestAnimationFrame(measureFps);
  };

  const stopFpsMonitoring = () => {
    if (fpsIntervalRef.current) {
      cancelAnimationFrame(fpsIntervalRef.current);
      fpsIntervalRef.current = null;
    }
  };

  // Initialize web-ifc
  const handleInit = () => {
    setError(null);
    setStatus({
      phase: 'init',
      message: 'Initializing web-ifc WASM module...',
      progress: 0
    });

    startFpsMonitoring();
    workerRef.current?.postMessage({ type: 'INIT' });
  };

  // Handle file selection
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setStatus({
      phase: 'parsing',
      message: `Parsing ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)...`,
      progress: 30
    });

    try {
      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();

      // Send to worker
      workerRef.current?.postMessage(
        { type: 'PARSE_IFC', data: arrayBuffer },
        [arrayBuffer] // Transfer ownership for performance
      );

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read file');
      setStatus({
        phase: 'error',
        message: 'Failed to read file',
        progress: 0
      });
    }
  };

  // Load test file
  const handleLoadTestFile = async () => {
    setError(null);
    setStatus({
      phase: 'parsing',
      message: 'Loading minimal_with_site.ifc test file...',
      progress: 30
    });

    try {
      // Fetch the test IFC file
      const response = await fetch('/minimal_with_site.ifc');
      if (!response.ok) throw new Error('Test file not found');

      const arrayBuffer = await response.arrayBuffer();

      // Send to worker
      workerRef.current?.postMessage(
        { type: 'PARSE_IFC', data: arrayBuffer },
        [arrayBuffer]
      );

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load test file');
      setStatus({
        phase: 'error',
        message: 'Failed to load test file',
        progress: 0
      });
    }
  };

  return (
    <div className="ifc-test">
      <h2>🧪 Task T119: web-ifc Validation Test</h2>

      {/* Status Card */}
      <div className={`status-card status-${status.phase}`}>
        <div className="status-header">
          <span className="status-phase">{status.phase.toUpperCase()}</span>
          <span className="fps-monitor">FPS: {fps}</span>
        </div>
        <p className="status-message">{status.message}</p>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${status.progress}%` }} />
        </div>
      </div>

      {/* Controls */}
      <div className="controls">
        <button
          onClick={handleInit}
          disabled={status.phase !== 'idle'}
          className="btn-primary"
        >
          1. Initialize web-ifc
        </button>

        <button
          onClick={handleLoadTestFile}
          disabled={status.phase !== 'loading' && status.phase !== 'complete'}
          className="btn-secondary"
        >
          2. Load Test File (Rome)
        </button>

        <label className="btn-secondary file-label">
          Or Upload IFC File
          <input
            ref={fileInputRef}
            type="file"
            accept=".ifc"
            onChange={handleFileSelect}
            disabled={status.phase !== 'loading' && status.phase !== 'complete'}
            style={{ display: 'none' }}
          />
        </label>
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-card">
          <strong>❌ Error:</strong> {error}
        </div>
      )}

      {/* Results Display */}
      {Object.keys(results).length > 0 && (
        <div className="results">
          <h3>📊 Test Results</h3>

          {/* Performance Metrics */}
          <div className="result-section">
            <h4>⚡ Performance</h4>
            <table>
              <tbody>
                {results.initTime !== undefined && (
                  <tr>
                    <td>WASM Init Time:</td>
                    <td className="metric-value">
                      {results.initTime}ms
                      {results.initTime < 500 && <span className="badge-pass">✅ PASS</span>}
                      {results.initTime >= 500 && <span className="badge-fail">❌ FAIL</span>}
                    </td>
                  </tr>
                )}
                {results.parseTime !== undefined && (
                  <tr>
                    <td>Parse Time:</td>
                    <td className="metric-value">
                      {results.parseTime}ms
                      {results.parseTime < 3000 && <span className="badge-pass">✅ PASS</span>}
                      {results.parseTime >= 3000 && <span className="badge-fail">❌ FAIL</span>}
                    </td>
                  </tr>
                )}
                {results.memoryUsed !== undefined && (
                  <tr>
                    <td>Memory Used:</td>
                    <td className="metric-value">{results.memoryUsed} MB</td>
                  </tr>
                )}
                <tr>
                  <td>Main Thread FPS:</td>
                  <td className="metric-value">
                    {fps} fps
                    {fps >= 60 && <span className="badge-pass">✅ PASS</span>}
                    {fps < 60 && <span className="badge-warn">⚠️ WARNING</span>}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* IFC Entities */}
          {results.entities && (
            <div className="result-section">
              <h4>🏗️ IFC Entities</h4>
              <table>
                <tbody>
                  <tr>
                    <td>Total Lines:</td>
                    <td className="metric-value">{results.lineCount}</td>
                  </tr>
                  <tr>
                    <td>Projects:</td>
                    <td className="metric-value">{results.entities.projects}</td>
                  </tr>
                  <tr>
                    <td>Sites:</td>
                    <td className="metric-value">{results.entities.sites}</td>
                  </tr>
                  <tr>
                    <td>Buildings:</td>
                    <td className="metric-value">{results.entities.buildings}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Coordinates */}
          {results.coordinates && (
            <div className="result-section">
              <h4>🌍 Geospatial Coordinates</h4>
              <table>
                <tbody>
                  <tr>
                    <td>Site Name:</td>
                    <td className="metric-value">{results.coordinates.siteName}</td>
                  </tr>
                  <tr>
                    <td>Latitude:</td>
                    <td className="metric-value">
                      {results.coordinates.latitude?.toFixed(6)}°
                      {results.coordinates.latitude && <span className="badge-pass">✅ EXTRACTED</span>}
                      {!results.coordinates.latitude && <span className="badge-fail">❌ MISSING</span>}
                    </td>
                  </tr>
                  <tr>
                    <td>Longitude:</td>
                    <td className="metric-value">
                      {results.coordinates.longitude?.toFixed(6)}°
                      {results.coordinates.longitude && <span className="badge-pass">✅ EXTRACTED</span>}
                      {!results.coordinates.longitude && <span className="badge-fail">❌ MISSING</span>}
                    </td>
                  </tr>
                  <tr>
                    <td>Elevation:</td>
                    <td className="metric-value">{results.coordinates.elevation?.toFixed(2)}m</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Geometry */}
          {results.geometry && (
            <div className="result-section">
              <h4>📐 Geometry Elements</h4>
              <table>
                <tbody>
                  <tr>
                    <td>Walls:</td>
                    <td className="metric-value">{results.geometry.walls}</td>
                  </tr>
                  <tr>
                    <td>Slabs:</td>
                    <td className="metric-value">{results.geometry.slabs}</td>
                  </tr>
                  <tr>
                    <td>Beams:</td>
                    <td className="metric-value">{results.geometry.beams}</td>
                  </tr>
                  <tr>
                    <td>Columns:</td>
                    <td className="metric-value">{results.geometry.columns}</td>
                  </tr>
                  <tr>
                    <td>Total:</td>
                    <td className="metric-value"><strong>{results.geometry.total}</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Final Verdict */}
          {status.phase === 'complete' && (
            <div className="verdict">
              {results.initTime! < 500 && results.parseTime! < 3000 && fps >= 60 && results.coordinates?.latitude ? (
                <div className="verdict-pass">
                  <h3>✅ TASK T119: PASS</h3>
                  <p>web-ifc parsing validated successfully in browser!</p>
                  <ul>
                    <li>✅ WASM loaded in {results.initTime}ms (&lt;500ms target)</li>
                    <li>✅ Parsing completed in {results.parseTime}ms (&lt;3s target)</li>
                    <li>✅ Main thread maintained {fps} FPS (≥60 target)</li>
                    <li>✅ Coordinates extracted successfully</li>
                  </ul>
                </div>
              ) : (
                <div className="verdict-fail">
                  <h3>❌ TASK T119: NEEDS REVIEW</h3>
                  <p>Some metrics did not meet targets:</p>
                  <ul>
                    {results.initTime! >= 500 && <li>⚠️ WASM init slow: {results.initTime}ms (target &lt;500ms)</li>}
                    {results.parseTime! >= 3000 && <li>⚠️ Parsing slow: {results.parseTime}ms (target &lt;3s)</li>}
                    {fps < 60 && <li>⚠️ FPS degraded: {fps} (target ≥60)</li>}
                    {!results.coordinates?.latitude && <li>❌ Failed to extract coordinates</li>}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
