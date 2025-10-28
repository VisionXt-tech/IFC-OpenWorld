/**
 * Application configuration loaded from environment variables
 * See .env.example for all available options
 */

export const config = {
  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1',
  },
  cesium: {
    ionToken: import.meta.env.VITE_CESIUM_ION_TOKEN || '',
  },
  upload: {
    maxSizeMB: parseInt(import.meta.env.VITE_MAX_UPLOAD_SIZE_MB || '100', 10),
    maxSizeBytes: parseInt(import.meta.env.VITE_MAX_UPLOAD_SIZE_MB || '100', 10) * 1024 * 1024,
    allowedExtensions: (import.meta.env.VITE_ALLOWED_FILE_EXTENSIONS || '.ifc')
      .split(',')
      .map((ext) => ext.trim()),
  },
  features: {
    debug: import.meta.env.VITE_ENABLE_DEBUG === 'true',
  },
} as const;

// Validation: Warn if required config is missing
if (!config.cesium.ionToken && config.features.debug) {
  console.warn('VITE_CESIUM_ION_TOKEN is not set. CesiumJS may not work correctly.');
}
