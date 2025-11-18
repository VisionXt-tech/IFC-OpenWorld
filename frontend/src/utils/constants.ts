/**
 * Application Constants
 *
 * Centralized constants for timeouts, intervals, limits, and other magic numbers
 * to improve code maintainability and avoid hardcoded values
 */

/**
 * Time intervals in milliseconds
 */
export const TIME_INTERVALS = {
  /** Polling interval for upload processing status */
  UPLOAD_POLLING: 2000,

  /** Delay before flying to building after upload */
  FLY_TO_DELAY: 500,

  /** Delay before resetting upload state after success */
  UPLOAD_SUCCESS_RESET: 3000,

  /** Cache auto-cleanup interval */
  CACHE_CLEANUP: 5 * 60 * 1000, // 5 minutes

  /** Default debounce delay for search inputs */
  SEARCH_DEBOUNCE: 300,

  /** Debounce delay for resize events */
  RESIZE_DEBOUNCE: 150,

  /** Throttle delay for scroll events */
  SCROLL_THROTTLE: 100,
} as const;

/**
 * Cache TTL (Time To Live) values in milliseconds
 */
export const CACHE_TTL = {
  /** Default TTL for cached data */
  DEFAULT: 5 * 60 * 1000, // 5 minutes

  /** TTL for building data */
  BUILDINGS: 10 * 60 * 1000, // 10 minutes

  /** TTL for processing status */
  PROCESSING_STATUS: 30 * 1000, // 30 seconds

  /** TTL for upload URLs */
  UPLOAD_URL: 5 * 60 * 1000, // 5 minutes
} as const;

/**
 * Pagination defaults
 */
export const PAGINATION = {
  /** Default page size */
  DEFAULT_PAGE_SIZE: 20,

  /** Available page size options */
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100] as const,

  /** Maximum visible page numbers in pagination */
  MAX_VISIBLE_PAGES: 5,
} as const;

/**
 * Search and filter defaults
 */
export const SEARCH = {
  /** Minimum query length to trigger search */
  MIN_QUERY_LENGTH: 2,

  /** Fuzzy search similarity threshold (0-1) */
  FUZZY_THRESHOLD: 0.6,

  /** Maximum search results to display */
  MAX_RESULTS: 1000,
} as const;

/**
 * File upload limits
 */
export const UPLOAD = {
  /** Maximum file size in bytes (100 MB) */
  MAX_FILE_SIZE: 100 * 1024 * 1024,

  /** Allowed file extensions */
  ALLOWED_EXTENSIONS: ['.ifc'] as const,

  /** Allowed MIME types */
  ALLOWED_MIME_TYPES: [
    'application/x-step',
    'application/step',
    'application/octet-stream',
  ] as const,
} as const;

/**
 * Cesium 3D visualization settings
 */
export const CESIUM = {
  /** Default fly-to duration in seconds */
  FLY_TO_DURATION: 3,

  /** Default camera height offset in meters */
  CAMERA_HEIGHT_OFFSET: 5000,

  /** Default marker size in pixels */
  MARKER_SIZE: 48,

  /** 3D model scale factor */
  MODEL_SCALE: 1.0,
} as const;

/**
 * API request settings
 */
export const API = {
  /** Default request timeout in milliseconds */
  DEFAULT_TIMEOUT: 30 * 1000, // 30 seconds

  /** Upload request timeout (longer for large files) */
  UPLOAD_TIMEOUT: 5 * 60 * 1000, // 5 minutes

  /** Maximum retry attempts */
  MAX_RETRIES: 3,

  /** Retry backoff multiplier */
  RETRY_BACKOFF: 2,

  /** Initial retry delay in milliseconds */
  INITIAL_RETRY_DELAY: 1000,
} as const;

/**
 * UI Animation durations in milliseconds
 */
export const ANIMATION = {
  /** Fast animations (buttons, hover effects) */
  FAST: 150,

  /** Normal animations (modals, tooltips) */
  NORMAL: 300,

  /** Slow animations (page transitions) */
  SLOW: 500,

  /** Toast notification display duration */
  TOAST_DURATION: 3000,

  /** Toast notification with action display duration */
  TOAST_ACTION_DURATION: 5000,
} as const;

/**
 * Local storage keys
 */
export const STORAGE_KEYS = {
  /** User theme preference */
  THEME: 'ifc-openworld:theme',

  /** Last viewed buildings list filters */
  BUILDINGS_FILTERS: 'ifc-openworld:buildings-filters',

  /** User's last map position */
  MAP_POSITION: 'ifc-openworld:map-position',

  /** Keyboard shortcuts customization */
  KEYBOARD_SHORTCUTS: 'ifc-openworld:keyboard-shortcuts',
} as const;

/**
 * Performance thresholds
 */
export const PERFORMANCE = {
  /** Warn if component render takes longer than this (ms) */
  SLOW_RENDER_WARNING: 16, // ~60fps

  /** Warn if Web Vitals FCP exceeds this (ms) */
  SLOW_FCP_WARNING: 2000,

  /** Warn if Web Vitals LCP exceeds this (ms) */
  SLOW_LCP_WARNING: 2500,

  /** Warn if Web Vitals CLS exceeds this */
  HIGH_CLS_WARNING: 0.1,
} as const;

/**
 * Validation rules
 */
export const VALIDATION = {
  /** Minimum building name length */
  MIN_NAME_LENGTH: 1,

  /** Maximum building name length */
  MAX_NAME_LENGTH: 200,

  /** Maximum address length */
  MAX_ADDRESS_LENGTH: 500,

  /** Latitude range */
  LATITUDE_RANGE: [-90, 90] as const,

  /** Longitude range */
  LONGITUDE_RANGE: [-180, 180] as const,
} as const;

/**
 * Z-index layers for consistent stacking order
 */
export const Z_INDEX = {
  /** Base layer (map, globe) */
  BASE: 0,

  /** Overlay buttons and controls */
  OVERLAY: 1000,

  /** Modals and dialogs */
  MODAL: 3000,

  /** Toast notifications */
  TOAST: 5000,

  /** Loading spinners and overlays */
  LOADING: 4000,
} as const;
