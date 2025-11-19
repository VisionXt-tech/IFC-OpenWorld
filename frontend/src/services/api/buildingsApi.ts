import { apiClient } from './apiClient';
import type { BuildingCollection, Building } from '@/types';

/**
 * Buildings API Service
 *
 * Handles fetching building data from the backend.
 *
 * @see specs/001-plan.md Task 3.4
 * @see backend/src/api/v1/buildings.ts
 */

export interface GetBuildingsParams {
  bbox?: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
  limit?: number;
  bypassCache?: boolean; // Force fresh data (useful after delete)
}

/**
 * Get all buildings (with optional bounding box filter)
 */
export async function getBuildings(params?: GetBuildingsParams): Promise<BuildingCollection> {
  let endpoint = '/buildings';

  if (params?.bbox) {
    const [minLon, minLat, maxLon, maxLat] = params.bbox;
    endpoint += `?bbox=${minLon},${minLat},${maxLon},${maxLat}`;

    if (params.limit) {
      endpoint += `&limit=${params.limit}`;
    }
  } else if (params?.limit) {
    endpoint += `?limit=${params.limit}`;
  }

  return apiClient.get<BuildingCollection>(endpoint, params?.bypassCache ?? false);
}

/**
 * Get single building by ID
 */
export async function getBuildingById(id: string): Promise<Building> {
  const response = await apiClient.get<{ building: Building }>(`/buildings/${id}`);
  return response.building;
}

/**
 * Delete building by ID
 * Also deletes associated IFC file from S3
 */
export async function deleteBuilding(id: string): Promise<{ success: boolean }> {
  return apiClient.delete<{ success: boolean }>(`/buildings/${id}`);
}