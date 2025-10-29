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
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  result?: {
    buildingId: string;
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
}

declare global {
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}
