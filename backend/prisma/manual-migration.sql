-- Manual migration for IFC-OpenWorld
-- Based on prisma/schema.prisma
-- Run this if Prisma migrate fails

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUM types
CREATE TYPE upload_status AS ENUM ('pending', 'completed', 'failed');
CREATE TYPE processing_status AS ENUM ('not_started', 'processing', 'completed', 'failed');

-- Create IFC Files table
CREATE TABLE IF NOT EXISTS ifc_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER NOT NULL,
    s3_key VARCHAR(512) NOT NULL,
    upload_status upload_status NOT NULL DEFAULT 'pending',
    processing_status processing_status NOT NULL DEFAULT 'not_started',
    uploaded_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create Buildings table with PostGIS geography
CREATE TABLE IF NOT EXISTS buildings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ifc_file_id UUID NOT NULL REFERENCES ifc_files(id) ON DELETE CASCADE,
    name VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    height DECIMAL,
    floor_count INTEGER,
    location geography(Point, 4326) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create spatial index on buildings location (GiST)
CREATE INDEX IF NOT EXISTS idx_buildings_location ON buildings USING GIST (location);

-- Create Prisma migrations table (for Prisma to recognize the schema)
CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    id VARCHAR(36) PRIMARY KEY,
    checksum VARCHAR(64) NOT NULL,
    finished_at TIMESTAMP,
    migration_name VARCHAR(255) NOT NULL,
    logs TEXT,
    rolled_back_at TIMESTAMP,
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    applied_steps_count INTEGER NOT NULL DEFAULT 0
);

-- Insert a fake migration record so Prisma knows the schema is up to date
INSERT INTO "_prisma_migrations" (id, checksum, migration_name, applied_steps_count, finished_at)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'manual_migration_checksum',
    '00000000000000_manual_init',
    1,
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- Verify installation
SELECT 'IFC Files table created' as status, COUNT(*) as count FROM ifc_files
UNION ALL
SELECT 'Buildings table created', COUNT(*) FROM buildings
UNION ALL
SELECT 'PostGIS version', 1 FROM (SELECT PostGIS_Version()) as v;
