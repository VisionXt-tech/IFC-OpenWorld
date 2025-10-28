import { useState } from 'react';
import type { Viewer } from 'cesium';
import CesiumGlobe from '@/components/CesiumGlobe';
import './App.css';

function App() {
  const [globeReady, setGlobeReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGlobeReady = (viewer: Viewer) => {
    setGlobeReady(true);
    console.log('[App] CesiumGlobe ready', viewer);
  };

  const handleGlobeError = (err: Error) => {
    setError(err.message);
    console.error('[App] CesiumGlobe error:', err);
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

      <CesiumGlobe
        onReady={handleGlobeReady}
        onError={handleGlobeError}
      />

      <footer className="app-footer-overlay">
        <p>Milestone 3 - Task 3.2: CesiumJS Configuration Complete</p>
      </footer>
    </div>
  );
}

export default App;
