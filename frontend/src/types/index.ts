// Building types (matching backend GeoJSON response)
export interface Building {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string;
  height: number | null;
  floorCount: number | null;
  ifcFileId: string;
  createdAt: string;
  updatedAt: string;
  longitude: number;
  latitude: number;
  // 3D Model fields
  modelUrl?: string | null;
  modelSizeMb?: number | null;
  modelFormat?: string | null;
  modelGeneratedAt?: string | null;
}

export interface BuildingFeature {
  type: 'Feature';
  id: string;
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  properties: Omit<Building, 'id' | 'longitude' | 'latitude'>;
}

export interface BuildingCollection {
  type: 'FeatureCollection';
  features: BuildingFeature[];
}

// Upload types
export interface UploadStatus {
  status: 'idle' | 'uploading' | 'processing' | 'success' | 'error';
  progress: number;
  fileName: string | null;
  fileSize: number | null;
  error: string | null;
  uploadedFileId: string | null;
}

export interface PresignedUrlResponse {
  presignedUrl: string; // Backend sends presignedUrl, not uploadUrl
  fileId: string;
  s3Key: string;
  expiresIn: number; // Backend sends expiresIn (seconds), not expiresAt (ISO date)
}

export interface UploadCompleteRequest {
  fileId: string;
  s3Key: string; // Backend expects s3Key, not fileName/fileSize
}

export interface ProcessingStatusResponse {
  taskId: string;
  status: 'PENDING' | 'STARTED' | 'SUCCESS' | 'FAILURE' | 'RETRY';
  result?: {
    status: 'completed';
    coordinates: {
      latitude: number;
      longitude: number;
    };
    metadata: {
      name?: string;
      address?: string;
      city?: string;
      country?: string;
      height?: number;
      floorCount?: number;
    };
  } | {
    status: 'failed';
    file_id: string;
    error: string;
  };
  error?: string;
}

// API Error types
export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

// Environment variables
export interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_CESIUM_ION_TOKEN: string;
  readonly VITE_MAX_UPLOAD_SIZE_MB: string;
  readonly VITE_ALLOWED_FILE_EXTENSIONS: string;
  readonly VITE_ENABLE_DEBUG: string;
  readonly DEV: boolean; // Vite built-in: true in development, false in production
  readonly PROD: boolean; // Vite built-in: true in production, false in development
  readonly MODE: string; // Vite built-in: current mode (development, production, etc.)
}

declare global {
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}
