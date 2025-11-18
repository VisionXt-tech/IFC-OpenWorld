import { create } from 'zustand';
import { getBuildings, getBuildingById } from '@/services/api';
import type { Building, BuildingFeature } from '@/types';
import { logger } from '@/utils/logger';

/**
 * Buildings Store
 *
 * Manages building data fetched from the backend.
 * Handles spatial queries and caching.
 *
 * @see specs/001-plan.md Task 3.4
 */

interface BuildingsStore {
  // State
  buildings: BuildingFeature[];
  selectedBuilding: Building | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchBuildings: (bbox?: [number, number, number, number]) => Promise<void>;
  fetchBuildingById: (id: string) => Promise<void>;
  addBuilding: (building: BuildingFeature) => void;
  selectBuilding: (building: Building | null) => void;
  clearError: () => void;
}

export const useBuildingsStore = create<BuildingsStore>((set) => ({
  // Initial state
  buildings: [],
  selectedBuilding: null,
  isLoading: false,
  error: null,

  fetchBuildings: async (bbox) => {
    set({ isLoading: true, error: null });

    try {
      const response = await getBuildings(bbox ? { bbox } : undefined);

      set({
        buildings: response.features,
        isLoading: false,
      });

      logger.debug(`[BuildingsStore] Fetched ${response.features.length} buildings`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to fetch buildings';

      set({
        error: errorMessage,
        isLoading: false,
      });

      logger.error('[BuildingsStore] Fetch failed:', error);
    }
  },

  fetchBuildingById: async (id: string) => {
    set({ isLoading: true, error: null });

    try {
      const building = await getBuildingById(id);

      set({
        selectedBuilding: building,
        isLoading: false,
      });

      logger.debug('[BuildingsStore] Fetched building:', building.name);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to fetch building details';

      set({
        error: errorMessage,
        isLoading: false,
      });

      logger.error('[BuildingsStore] Fetch building failed:', error);
    }
  },

  addBuilding: (building: BuildingFeature) => {
    set((state) => ({
      buildings: [...state.buildings, building],
    }));

    logger.debug('[BuildingsStore] Added building:', building.properties.name);
  },

  selectBuilding: (building: Building | null) => {
    set({ selectedBuilding: building });
  },

  clearError: () => {
    set({ error: null });
  },
}));
