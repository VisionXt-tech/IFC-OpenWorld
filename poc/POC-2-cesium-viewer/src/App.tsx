import { useState } from 'react';
import CesiumViewer from './components/CesiumViewer';
import { IfcTest } from './components/IfcTest';
import './App.css';

type ViewMode = 'cesium' | 'ifc-test';

function App() {
  const [status, setStatus] = useState<string>('Ready');
  const [viewMode, setViewMode] = useState<ViewMode>('ifc-test'); // Default to IFC test

  return (
    <div className="app">
      <div className="status-bar">
        <h1>POC-2: CesiumJS + web-ifc Viewer</h1>
        <div className="view-toggle">
          <button
            onClick={() => setViewMode('cesium')}
            className={viewMode === 'cesium' ? 'active' : ''}
          >
            🌍 Cesium Globe
          </button>
          <button
            onClick={() => setViewMode('ifc-test')}
            className={viewMode === 'ifc-test' ? 'active' : ''}
          >
            🧪 IFC Test (T119)
          </button>
        </div>
        <div className="status">{status}</div>
      </div>

      {viewMode === 'cesium' ? (
        <CesiumViewer onStatusChange={setStatus} />
      ) : (
        <IfcTest />
      )}
    </div>
  );
}

export default App;
