import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ToastProvider } from './contexts/ToastContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

// Suppress DevTools/extension errors trying to read responseText on blob/arraybuffer responses
// This is a known issue with Chrome DevTools and Cesium resource loading
const originalError = console.error;
console.error = (...args: unknown[]) => {
  const message = args[0];
  if (typeof message === 'string') {
    // Check if this is a DevTools/inspector XHR inspection error
    if (
      (message.includes('responseText') && message.includes('InvalidStateError')) ||
      (message.includes('inspector.js') && message.includes('XMLHttpRequest')) ||
      message.includes('Error processing XMLHttpRequest response')
    ) {
      // Silently ignore these DevTools inspection errors
      return;
    }
  }
  originalError.apply(console, args);
};

// Also suppress window error events from inspector.js
window.addEventListener('error', (event): boolean | undefined => {
  const message = event.message || '';
  if (
    message.includes('responseText') ||
    message.includes('InvalidStateError') ||
    message.includes('Error processing XMLHttpRequest')
  ) {
    event.preventDefault();
    event.stopPropagation();
    return false;
  }
  return undefined;
});

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
