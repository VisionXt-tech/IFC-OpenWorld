-- POC-4: Seed Data for PostGIS Performance Testing

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create buildings table
DROP TABLE IF EXISTS buildings;

CREATE TABLE buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  elevation_meters NUMERIC(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Generate 1000 random buildings in Italy (roughly around Rome)
-- Latitude range: 41.5 - 42.5 (Rome area)
-- Longitude range: 12.0 - 13.0
INSERT INTO buildings (name, location, elevation_meters)
SELECT
  'Building_' || generate_series,
  ST_SetSRID(
    ST_MakePoint(
      12.0 + (random() * 1.0),  -- Longitude 12.0 - 13.0
      41.5 + (random() * 1.0)   -- Latitude 41.5 - 42.5
    ),
    4326
  )::geography,
  (random() * 100)::numeric(10,2)  -- Elevation 0-100m
FROM generate_series(1, 1000);

-- Create GiST spatial index (THIS IS CRITICAL FOR PERFORMANCE)
CREATE INDEX idx_buildings_location ON buildings USING GIST(location);

-- Analyze table for query optimizer
ANALYZE buildings;

-- Show stats
SELECT
  COUNT(*) as total_buildings,
  pg_size_pretty(pg_total_relation_size('buildings')) as table_size,
  pg_size_pretty(pg_total_relation_size('idx_buildings_location')) as index_size
FROM buildings;

\echo '✅ Seed data loaded: 1000 buildings with spatial index'
