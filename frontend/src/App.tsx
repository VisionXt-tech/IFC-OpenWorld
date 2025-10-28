import { useState } from 'react';
import './App.css';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="app">
      <header className="app-header">
        <h1>IFC OpenWorld</h1>
        <p>Upload and visualize IFC building models on a 3D globe</p>
      </header>
      <main>
        <div className="card">
          <button onClick={() => setCount((count) => count + 1)}>
            count is {count}
          </button>
          <p>
            Frontend setup complete. Ready for Milestone 3 implementation.
          </p>
        </div>
      </main>
      <footer className="app-footer">
        <p>Milestone 3: Frontend Components - Task 3.1 Complete</p>
      </footer>
    </div>
  );
}

export default App;
