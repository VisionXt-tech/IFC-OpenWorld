-- Insert test building data
INSERT INTO ifc_files (file_name, file_size, s3_key, upload_status, processing_status)
VALUES ('test-building.ifc', 1024000, 'test/test-building.ifc', 'completed', 'completed')
RETURNING id;

-- Insert test building (Rome, Italy - Colosseum coordinates)
INSERT INTO buildings (
  ifc_file_id,
  name,
  address,
  city,
  country,
  height,
  floor_count,
  location
)
SELECT
  id,
  'Colosseum Test Building',
  'Piazza del Colosseo, 1',
  'Rome',
  'Italy',
  48.5,
  4,
  ST_GeogFromText('POINT(12.4924 41.8902)')
FROM ifc_files
WHERE file_name = 'test-building.ifc'
RETURNING id, name, ST_AsText(location) as location_wkt;
