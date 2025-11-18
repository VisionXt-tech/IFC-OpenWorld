import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import cesium from 'vite-plugin-cesium';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    cesium()
  ],
  server: {
    port: 5173, // Use Vite default port to match backend CORS config
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@/components': resolve(__dirname, 'src/components'),
      '@/services': resolve(__dirname, 'src/services'),
      '@/store': resolve(__dirname, 'src/store'),
      '@/hooks': resolve(__dirname, 'src/hooks'),
      '@/utils': resolve(__dirname, 'src/utils'),
      '@/types': resolve(__dirname, 'src/types')
    }
  },
  build: {
    target: 'esnext',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // React core (stable, rarely changes)
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react-vendor';
          }

          // Cesium (huge library ~10MB, separate chunk)
          if (id.includes('node_modules/cesium') || id.includes('node_modules/@cesium')) {
            return 'cesium-vendor';
          }

          // Utility libraries (DOMPurify, etc.)
          if (id.includes('node_modules/dompurify')) {
            return 'utils-vendor';
          }

          // State management (Zustand)
          if (id.includes('node_modules/zustand')) {
            return 'state-vendor';
          }

          // File upload libraries (react-dropzone)
          if (id.includes('node_modules/react-dropzone') || id.includes('node_modules/file-selector')) {
            return 'upload-vendor';
          }

          // All other node_modules
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      }
    }
  }
});
