# Backend Setup Guide

## Prerequisites

Before starting, ensure you have:

- **Node.js** 20.10.0+ LTS installed ([Download](https://nodejs.org/))
- **Yarn** 1.22+ installed (Windows requirement, see below)
- **Docker Desktop** installed and running ([Download](https://www.docker.com/products/docker-desktop/))
- **Git** for version control

### Windows Requirement: Use Yarn

**IMPORTANT**: On Windows, you MUST use Yarn instead of npm due to a Rollup installation bug (npm issue #4828).

```bash
# Install Yarn globally
npm install -g yarn

# Verify installation
yarn --version
```

## Step 1: Install Dependencies

```bash
cd backend
yarn install
```

This will install all required packages:
- Express.js (web framework)
- pg (node-postgres driver)
- TypeScript (strict mode enabled)
- AWS SDK v3 (S3 client)
- Winston (logging)
- Zod (validation)
- And all development dependencies

## Step 2: Start Docker Services

The backend requires PostgreSQL with PostGIS extension and MinIO for S3-compatible storage.

### Start Docker Desktop

1. Open Docker Desktop application
2. Wait for Docker Engine to start (green indicator)
3. Verify Docker is running:

```bash
docker ps
```

### Start Database and Storage Services

```bash
# Start all services in background
docker-compose up -d

# View logs (Ctrl+C to exit, containers keep running)
docker-compose logs -f postgres
docker-compose logs -f minio
```

**Services Started:**
- **PostgreSQL 15** + **PostGIS 3.4** (Docker port 5433 → container 5432)
- **MinIO** S3-compatible storage (port 9000, console 9001)
- **MinIO buckets** automatically created: `ifc-raw`, `ifc-processed`

**Note**: PostgreSQL is mapped to port **5433** to avoid conflicts with Windows PostgreSQL installations that may use the default port 5432.

### Verify Services Are Running

```bash
# Check container status (should show 3 containers running)
docker-compose ps

# Expected output:
# NAME                    STATUS
# ifc-openworld-db        Up (healthy)
# ifc-openworld-s3        Up (healthy)
# ifc-openworld-s3-init   Exited (0)
```

### Access MinIO Console

Open http://localhost:9001 in your browser:
- **Username**: minioadmin
- **Password**: minioadmin

You should see two buckets: `ifc-raw` and `ifc-processed`.

## Step 3: Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env if needed (defaults work for local development)
```

**Default Configuration:**
```env
DATABASE_URL=postgresql://ifc_user:ifc_password@127.0.0.1:5433/ifc_openworld
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
PORT=3000
```

**Important**: Note the DATABASE_URL uses port **5433** (not 5432) to connect to the Docker PostgreSQL instance.

## Step 4: Run Database Migrations

Since we use the `pg` (node-postgres) driver instead of Prisma, run the manual migration SQL script:

```bash
# Wait 10 seconds for PostgreSQL to fully initialize
Start-Sleep -Seconds 10

# Execute migration SQL
Get-Content .\prisma\manual-migration.sql | docker exec -i ifc-openworld-db psql -U ifc_user -d ifc_openworld
```

This will:
1. Enable PostGIS extension
2. Create UUID extension
3. Create ENUM types for status tracking
4. Create tables: `ifc_files`, `buildings`
5. Create GIST index on `buildings.location`
5. Create spatial indexes

**Expected Output:**
```
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma
...
Your database is now in sync with your schema.
```

## Step 6: Start Development Server

```bash
# Start with hot reload (uses tsx watch)
yarn dev
```

**Expected Output:**
```
🚀 Server running on http://0.0.0.0:3000
📝 Environment: development
```

## Step 7: Verify Installation

### Test Health Endpoint

```bash
curl http://localhost:3000/api/v1/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-27T12:00:00.000Z",
  "environment": "development",
  "database": "connected"
}
```

### Test Upload Request

```bash
curl -X POST http://localhost:3000/api/v1/upload/request \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "test.ifc",
    "fileSize": 1024000,
    "contentType": "application/x-step"
  }'
```

**Expected Response:**
```json
{
  "fileId": "550e8400-e29b-41d4-a716-446655440000",
  "presignedUrl": "http://localhost:9000/ifc-raw/...",
  "s3Key": "ifc-raw/1698765432-abc123-test.ifc",
  "expiresIn": 900
}
```

## Troubleshooting

### Docker Connection Failed

**Error**: `open //./pipe/dockerDesktopLinuxEngine: Impossibile trovare il file specificato`

**Solution**: Docker Desktop is not running. Start Docker Desktop application and wait for it to initialize.

### Database Connection Failed

**Error**: `database "ifc_openworld" does not exist`

**Solution**:
```bash
# Check PostgreSQL logs
docker-compose logs postgres

# Restart database service
docker-compose restart postgres

# Wait 10 seconds, then run migrations again
yarn db:migrate
```

### Port Already in Use

**Error**: `Error: listen EADDRINUSE: address already in use :::3000`

**Solutions**:
1. Change port in `.env`: `PORT=3001`
2. Or stop other process using port 3000

### Prisma Client Not Found

**Error**: `Cannot find module '@prisma/client'`

**Solution**:
```bash
yarn db:generate
```

### PostGIS Extension Missing

**Error**: `ERROR: type "geography" does not exist`

**Solution**: PostGIS extension not enabled. This should happen automatically, but if not:

```bash
# Connect to database
docker exec -it ifc-openworld-db psql -U ifc_user -d ifc_openworld

# Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

# Verify
SELECT PostGIS_Version();

# Exit
\q
```

## Development Commands

```bash
# Development
yarn dev              # Start with hot reload (recommended)
yarn build            # Compile TypeScript to JavaScript
yarn start            # Run production build

# Database
yarn db:generate      # Generate Prisma client
yarn db:migrate       # Create and apply migrations
yarn db:studio        # Open Prisma Studio (GUI for database)

# Code Quality
yarn typecheck        # TypeScript type checking (strict mode)
yarn lint             # Run ESLint
yarn lint:fix         # Auto-fix ESLint errors
yarn format           # Format with Prettier

# Testing (TBD - Milestone 2)
yarn test             # Run all tests
yarn test:watch       # Run tests in watch mode
yarn test:coverage    # Generate coverage report (target: ≥85%)
```

## Docker Management

```bash
# Stop services
docker-compose down

# Stop and remove volumes (⚠️ deletes all data)
docker-compose down -v

# View logs
docker-compose logs -f postgres
docker-compose logs -f minio

# Restart single service
docker-compose restart postgres

# Check container health
docker-compose ps
```

## Database Tools

### Prisma Studio

Visual database browser:

```bash
yarn db:studio
```

Opens http://localhost:5555 with GUI to view/edit database records.

### Direct Database Access

```bash
# Connect with psql
docker exec -it ifc-openworld-db psql -U ifc_user -d ifc_openworld

# Useful queries
\dt                    # List all tables
\d buildings          # Describe buildings table
SELECT COUNT(*) FROM ifc_files;
SELECT PostGIS_Full_Version();

# Exit
\q
```

## Next Steps

Once setup is complete:

1. Read [API.md](./API.md) for endpoint documentation
2. Read [README.md](./README.md) for project overview
3. Start implementing IFC processor (Milestone 2)
4. Write unit tests (target: ≥85% coverage)

## Support

- **Issues**: Report at https://github.com/anthropics/claude-code/issues
- **Constitution**: See [../CONSTITUTION.md](../CONSTITUTION.md)
- **Specifications**: See [../specs/001-ifc-upload-visualization.md](../specs/001-ifc-upload-visualization.md)

---

**Last Updated**: 2025-10-27
**Milestone**: M1 - Backend API Implementation ✅
