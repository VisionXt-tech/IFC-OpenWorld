# Windows Setup Notes

## Port Configuration Issue Resolution

### Problem

During development on Windows, we encountered a port conflict issue:
- A native Windows PostgreSQL installation was running on port 5432
- Docker PostgreSQL container was also trying to use port 5432
- Node.js applications were connecting to the **wrong** PostgreSQL instance

### Solution

Changed Docker port mapping in [docker-compose.yml:17](docker-compose.yml#L17):

```yaml
ports:
  - "5433:5432"  # Map host port 5433 to container port 5432
```

**Database URL updated** in [.env](..env) and [.env.example](.env.example):
```env
DATABASE_URL="postgresql://ifc_user:ifc_password@127.0.0.1:5433/ifc_openworld"
```

### Verification

To verify which PostgreSQL instance you're connecting to:

```powershell
# Check what's listening on PostgreSQL ports
netstat -ano | findstr ":5432"
netstat -ano | findstr ":5433"

# Check process details
tasklist | findstr "<PID>"
```

**Expected result**:
- Port 5432: Windows PostgreSQL (if installed)
- Port 5433: Docker PostgreSQL (ifc-openworld-db container)

## Database Driver: pg instead of Prisma

### Decision

We use **pg (node-postgres)** driver instead of Prisma ORM for Windows compatibility.

### Rationale

1. **Windows Authentication Issues**: Prisma had persistent authentication failures on Windows with Docker PostgreSQL, even with trust authentication configured
2. **Simpler Debugging**: Direct SQL queries are easier to debug than ORM abstraction layers
3. **Better PostGIS Support**: Writing raw PostGIS queries provides more control and clarity
4. **Production Ready**: node-postgres is battle-tested and widely used in production

### Implementation

Database connection pool: [src/db/pool.ts](src/db/pool.ts)

```typescript
import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: config.database.url,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

All database operations use parameterized queries:

```typescript
const result = await pool.query(
  'SELECT * FROM buildings WHERE id = $1',
  [buildingId]
);
```

### Migration Scripts

Since Prisma migrations don't work reliably on Windows, use manual SQL migration:

**File**: [prisma/manual-migration.sql](prisma/manual-migration.sql)

**Execute**:
```powershell
Get-Content .\prisma\manual-migration.sql | docker exec -i ifc-openworld-db psql -U ifc_user -d ifc_openworld
```

## Common Issues

### Issue 1: Port 3000 Already in Use

**Error**: `EADDRINUSE: address already in use ::1:3000`

**Solution**: Either stop the process using port 3000 or change PORT in .env:
```env
PORT=3001
```

### Issue 2: Docker PostgreSQL Not Starting

**Error**: Port conflict or initialization failure

**Solution**:
1. Stop local PostgreSQL service:
   ```powershell
   Stop-Service postgresql-x64-15
   ```
2. Or keep both by using different ports (5432 for Windows, 5433 for Docker)

### Issue 3: Cannot Connect to Database

**Error**: `ECONNREFUSED` or timeout

**Checklist**:
1. Is Docker running? `docker ps`
2. Is PostgreSQL container healthy? `docker-compose ps`
3. Are you using the correct port (5433)?
4. Is DATABASE_URL in .env correct?

**Test connection**:
```powershell
# Test with psql inside container
docker exec -it ifc-openworld-db psql -U ifc_user -d ifc_openworld -c "SELECT version();"
```

## Development Workflow

### Clean Restart

```powershell
# Stop all containers and remove volumes
docker-compose down -v

# Start fresh
docker-compose up -d

# Wait for PostgreSQL initialization
Start-Sleep -Seconds 10

# Run migrations
Get-Content .\prisma\manual-migration.sql | docker exec -i ifc-openworld-db psql -U ifc_user -d ifc_openworld

# Start dev server
yarn dev
```

### Check Logs

```powershell
# Backend logs
yarn dev  # Watch mode with auto-reload

# Docker logs
docker-compose logs -f postgres
docker-compose logs -f minio
```

## Future Improvements

If you prefer to use Prisma in the future:

1. **Option A**: Migrate to WSL2 for better Linux compatibility
2. **Option B**: Use native Windows PostgreSQL (not Docker) with Prisma
3. **Option C**: Continue with pg driver (recommended for production)

The current pg-based solution is production-ready and performs well.
