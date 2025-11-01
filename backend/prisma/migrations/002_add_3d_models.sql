-- Migration: Add 3D model fields to buildings table
-- Date: 2025-11-01
-- Purpose: Support glTF/glB 3D model visualization

-- Add model_url column for S3/MinIO storage path
ALTER TABLE buildings
ADD COLUMN IF NOT EXISTS model_url TEXT;

-- Add model metadata
ALTER TABLE buildings
ADD COLUMN IF NOT EXISTS model_size_mb DECIMAL(10,2);

ALTER TABLE buildings
ADD COLUMN IF NOT EXISTS model_format VARCHAR(10) DEFAULT 'glb';

ALTER TABLE buildings
ADD COLUMN IF NOT EXISTS model_generated_at TIMESTAMP;

-- Add comment for documentation
COMMENT ON COLUMN buildings.model_url IS '3D model URL (glTF/glB format) stored in S3/MinIO';
COMMENT ON COLUMN buildings.model_size_mb IS 'Size of 3D model file in megabytes';
COMMENT ON COLUMN buildings.model_format IS 'Format of 3D model (glb, gltf)';
COMMENT ON COLUMN buildings.model_generated_at IS 'Timestamp when model was generated';

-- Verify migration
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'buildings'
AND column_name LIKE 'model%'
ORDER BY ordinal_position;
