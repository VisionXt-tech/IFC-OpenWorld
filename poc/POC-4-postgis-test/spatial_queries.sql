-- POC-4: Spatial Query Performance Tests

\timing on

\echo ''
\echo '========================================'
\echo 'Test 1: Buildings within 5km of Rome'
\echo '========================================'
EXPLAIN ANALYZE
SELECT
  id,
  name,
  ST_Y(location::geometry) as latitude,
  ST_X(location::geometry) as longitude,
  ST_Distance(location, ST_SetSRID(ST_MakePoint(12.4964, 41.9028), 4326)::geography) as distance_meters
FROM buildings
WHERE ST_DWithin(
  location,
  ST_SetSRID(ST_MakePoint(12.4964, 41.9028), 4326)::geography,
  5000  -- 5km radius
)
ORDER BY distance_meters
LIMIT 100;

\echo ''
\echo '========================================'
\echo 'Test 2: Count buildings in bounding box'
\echo '========================================'
EXPLAIN ANALYZE
SELECT COUNT(*)
FROM buildings
WHERE location && ST_MakeEnvelope(12.4, 41.8, 12.6, 42.0, 4326);

\echo ''
\echo '========================================'
\echo 'Test 3: Nearest 10 buildings to point'
\echo '========================================'
EXPLAIN ANALYZE
SELECT
  id,
  name,
  ST_Distance(location, ST_SetSRID(ST_MakePoint(12.4964, 41.9028), 4326)::geography) as distance_meters
FROM buildings
ORDER BY location <-> ST_SetSRID(ST_MakePoint(12.4964, 41.9028), 4326)::geography
LIMIT 10;

\echo ''
\echo '========================================'
\echo 'Test 4: Index usage check'
\echo '========================================'
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE tablename = 'buildings';

\echo ''
\echo '✅ Spatial queries completed. Check execution times above.'
\echo 'Target: <100ms for query 1, <50ms for query 2'
