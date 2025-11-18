/**
 * Cesium 3D Globe Configuration
 *
 * Centralized configuration for CesiumJS viewer and 3D model rendering.
 * Adjust these values to optimize performance and visual quality.
 */

export const CESIUM_CONFIG = {
  /**
   * Camera settings
   */
  CAMERA: {
    /** Initial camera altitude in meters (global view) */
    GLOBAL_VIEW_ALTITUDE: 20_000_000,

    /** Camera altitude when flying to building (meters) */
    BUILDING_VIEW_ALTITUDE: 5000,

    /** Camera pitch angle when viewing building (degrees) */
    BUILDING_VIEW_PITCH: -45,

    /** Camera animation duration (seconds) */
    FLY_DURATION: 2,
  },

  /**
   * 3D Model rendering settings
   */
  MODEL: {
    /** Minimum pixel size for 3D models (smaller = better performance) */
    MIN_PIXEL_SIZE: 64,

    /** Maximum scale for 3D models */
    MAX_SCALE: 20_000,

    /** Default model scale */
    DEFAULT_SCALE: 1.0,

    /** Model height offset from terrain (meters) */
    HEIGHT_OFFSET: 0,

    /** Silhouette size for selected models (pixels) */
    SILHOUETTE_SIZE: 2,

    /** Silhouette color (CSS color) */
    SILHOUETTE_COLOR: '#00bcd4',
  },

  /**
   * 2D Marker settings
   */
  MARKER: {
    /** Point size for 2D markers (pixels) */
    POINT_SIZE: 15,

    /** Default marker color (Cesium.Color.RED) */
    DEFAULT_COLOR: 'RED',

    /** Fallback marker color when 3D load fails (Cesium.Color.ORANGE) */
    FALLBACK_COLOR: 'ORANGE',

    /** Outline color (Cesium.Color.WHITE) */
    OUTLINE_COLOR: 'WHITE',

    /** Outline width (pixels) */
    OUTLINE_WIDTH: 2,
  },

  /**
   * Label settings
   */
  LABEL: {
    /** Font for building labels */
    FONT: '14px sans-serif',

    /** Text color (Cesium.Color.WHITE) */
    TEXT_COLOR: 'WHITE',

    /** Outline color (Cesium.Color.BLACK) */
    OUTLINE_COLOR: 'BLACK',

    /** Outline width (pixels) */
    OUTLINE_WIDTH: 2,

    /** Background color (RGBA) */
    BACKGROUND_COLOR: { r: 0, g: 0, b: 0, a: 0.7 },

    /** Vertical offset for 2D marker labels (pixels) */
    OFFSET_2D: -20,

    /** Vertical offset for 3D model labels (pixels) */
    OFFSET_3D: -60,
  },

  /**
   * Performance settings
   */
  PERFORMANCE: {
    /** Enable shadows (higher quality, lower performance) */
    SHADOWS_ENABLED: true,

    /** Enable terrain (requires Ion token) */
    TERRAIN_ENABLED: true,

    /** Maximum number of 3D models to load simultaneously */
    MAX_CONCURRENT_MODELS: 50,

    /** Distance-based model loading (future implementation) */
    LAZY_LOAD_DISTANCE: 100_000, // meters
  },

  /**
   * UI settings
   */
  UI: {
    /** Show home button */
    HOME_BUTTON: true,

    /** Show navigation help button */
    NAV_HELP_BUTTON: true,

    /** Show fullscreen button */
    FULLSCREEN_BUTTON: true,

    /** Show animation widget */
    ANIMATION: false,

    /** Show timeline widget */
    TIMELINE: false,

    /** Show geocoder (search) */
    GEOCODER: false,

    /** Show scene mode picker (3D/2D/Columbus) */
    SCENE_MODE_PICKER: false,

    /** Show base layer picker */
    BASE_LAYER_PICKER: false,

    /** Show info box (default click behavior) */
    INFO_BOX: false,

    /** Show selection indicator */
    SELECTION_INDICATOR: false,
  },
} as const;

/**
 * Helper function to create Cesium Color from config
 * Usage: getCesiumColor('DEFAULT_COLOR', Cesium)
 */
export function getCesiumColor(
  colorName: keyof typeof CESIUM_CONFIG.MARKER,
  Cesium: typeof import('cesium')
): import('cesium').Color {
  const color = CESIUM_CONFIG.MARKER[colorName];
  return Cesium.Color[color as keyof typeof Cesium.Color] as import('cesium').Color;
}

/**
 * Helper function to create Cesium Cartesian2 for label offset
 */
export function getLabelOffset(
  is3D: boolean,
  Cesium: typeof import('cesium')
): import('cesium').Cartesian2 {
  const offset = is3D ? CESIUM_CONFIG.LABEL.OFFSET_3D : CESIUM_CONFIG.LABEL.OFFSET_2D;
  return new Cesium.Cartesian2(0, offset);
}

/**
 * Helper function to create Cesium Color from RGBA
 */
export function createCesiumColor(
  rgba: { r: number; g: number; b: number; a: number },
  Cesium: typeof import('cesium')
): import('cesium').Color {
  return new Cesium.Color(rgba.r, rgba.g, rgba.b, rgba.a);
}
