/**
 * Lazy Loading Utility for 3D Models
 *
 * Implements distance-based lazy loading for 3D models to improve performance.
 * Only loads models that are within a certain distance from the camera.
 */

import * as Cesium from 'cesium';
import { logger } from './logger';

/**
 * Configuration for lazy loading
 */
export interface Lazy3DConfig {
  /** Distance threshold in meters (default: 100km) */
  loadDistance: number;

  /** Distance to unload models (default: 150km) */
  unloadDistance: number;

  /** Maximum number of models to load simultaneously (default: 50) */
  maxConcurrentLoads: number;

  /** Check interval in milliseconds (default: 1000ms) */
  checkInterval: number;
}

const DEFAULT_CONFIG: Lazy3DConfig = {
  loadDistance: 100_000, // 100km
  unloadDistance: 150_000, // 150km
  maxConcurrentLoads: 50,
  checkInterval: 1000,
};

/**
 * Model state tracking
 */
interface ModelState {
  id: string;
  position: Cesium.Cartesian3;
  loaded: boolean;
  entity?: Cesium.Entity;
  modelUrl: string;
}

/**
 * Lazy 3D Model Manager
 */
export class Lazy3DManager {
  private viewer: Cesium.Viewer;
  private config: Lazy3DConfig;
  private models: Map<string, ModelState>;
  private intervalId: number | null;
  private loadingCount: number;

  constructor(viewer: Cesium.Viewer, config: Partial<Lazy3DConfig> = {}) {
    this.viewer = viewer;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.models = new Map();
    this.intervalId = null;
    this.loadingCount = 0;

    logger.info('[Lazy3D] Manager initialized with config:', this.config);
  }

  /**
   * Register a model for lazy loading
   */
  registerModel(id: string, position: Cesium.Cartesian3, modelUrl: string): void {
    this.models.set(id, {
      id,
      position,
      loaded: false,
      modelUrl,
    });

    logger.debug(`[Lazy3D] Registered model: ${id}`);
  }

  /**
   * Unregister a model
   */
  unregisterModel(id: string): void {
    const model = this.models.get(id);

    if (model) {
      // Remove entity if loaded
      if (model.entity) {
        this.viewer.entities.remove(model.entity);
      }

      this.models.delete(id);
      logger.debug(`[Lazy3D] Unregistered model: ${id}`);
    }
  }

  /**
   * Start lazy loading manager
   */
  start(): void {
    if (this.intervalId !== null) {
      logger.warn('[Lazy3D] Manager already started');
      return;
    }

    this.intervalId = window.setInterval(() => {
      this.checkAndLoadModels();
    }, this.config.checkInterval);

    // Initial check
    this.checkAndLoadModels();

    logger.info('[Lazy3D] Manager started');
  }

  /**
   * Stop lazy loading manager
   */
  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('[Lazy3D] Manager stopped');
    }
  }

  /**
   * Check distances and load/unload models accordingly
   */
  private checkAndLoadModels(): void {
    const cameraPosition = this.viewer.camera.positionWC;

    for (const [id, model] of this.models) {
      const distance = Cesium.Cartesian3.distance(cameraPosition, model.position);

      // Load model if within load distance and not already loaded
      if (distance <= this.config.loadDistance && !model.loaded) {
        if (this.loadingCount < this.config.maxConcurrentLoads) {
          this.loadModel(id, model);
        }
      }

      // Unload model if beyond unload distance and loaded
      else if (distance > this.config.unloadDistance && model.loaded) {
        this.unloadModel(id, model);
      }
    }
  }

  /**
   * Load a 3D model
   */
  private async loadModel(id: string, model: ModelState): Promise<void> {
    try {
      this.loadingCount++;
      model.loaded = true; // Optimistic

      logger.debug(`[Lazy3D] Loading model: ${id} (${this.loadingCount}/${this.config.maxConcurrentLoads})`);

      // Create entity with 3D model
      const entity = this.viewer.entities.add({
        id,
        position: model.position,
        model: {
          uri: model.modelUrl,
          minimumPixelSize: 64,
          maximumScale: 20000,
          scale: 1.0,
        },
      });

      model.entity = entity;

      logger.info(`[Lazy3D] Model loaded: ${id}`);
    } catch (error) {
      logger.error(`[Lazy3D] Failed to load model ${id}:`, error);
      model.loaded = false;
    } finally {
      this.loadingCount--;
    }
  }

  /**
   * Unload a 3D model
   */
  private unloadModel(id: string, model: ModelState): void {
    if (model.entity) {
      this.viewer.entities.remove(model.entity);
      model.entity = undefined;
    }

    model.loaded = false;

    logger.debug(`[Lazy3D] Model unloaded: ${id}`);
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalModels: number;
    loadedModels: number;
    loadingCount: number;
  } {
    let loadedCount = 0;

    for (const model of this.models.values()) {
      if (model.loaded) loadedCount++;
    }

    return {
      totalModels: this.models.size,
      loadedModels: loadedCount,
      loadingCount: this.loadingCount,
    };
  }

  /**
   * Log statistics
   */
  logStats(): void {
    const stats = this.getStats();
    logger.info('[Lazy3D] Statistics:', stats);
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.stop();

    // Unload all models
    for (const id of this.models.keys()) {
      this.unregisterModel(id);
    }

    logger.info('[Lazy3D] Manager destroyed');
  }
}

/**
 * Calculate distance between two Cartesian3 positions in meters
 */
export function calculateDistance(
  position1: Cesium.Cartesian3,
  position2: Cesium.Cartesian3
): number {
  return Cesium.Cartesian3.distance(position1, position2);
}

/**
 * Check if position is within camera view frustum
 */
export function isInView(
  viewer: Cesium.Viewer,
  position: Cesium.Cartesian3
): boolean {
  const cullingVolume = viewer.camera.frustum.computeCullingVolume(
    viewer.camera.position,
    viewer.camera.direction,
    viewer.camera.up
  );

  const visibility = cullingVolume.computeVisibility(
    new Cesium.BoundingSphere(position, 1.0)
  );

  return visibility !== Cesium.Intersect.OUTSIDE;
}

/**
 * Get camera distance to position in meters
 */
export function getCameraDistance(
  viewer: Cesium.Viewer,
  position: Cesium.Cartesian3
): number {
  return Cesium.Cartesian3.distance(viewer.camera.positionWC, position);
}
