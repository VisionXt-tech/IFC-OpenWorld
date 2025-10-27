#!/bin/bash
# PostgreSQL initialization script
# This runs automatically when the database is first created

set -e

echo "Initializing IFC-OpenWorld database..."

# Enable PostGIS extension
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Enable PostGIS extension
    CREATE EXTENSION IF NOT EXISTS postgis;
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    -- Verify extensions
    SELECT PostGIS_Version() AS postgis_version;
    SELECT uuid_generate_v4() AS uuid_test;
EOSQL

echo "Database initialization complete!"
