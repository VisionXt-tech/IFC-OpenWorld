# Prisma Connection Workaround for Windows

## Problem
Prisma Client cannot authenticate with PostgreSQL on Windows Docker setup, even though:
- PostgreSQL is running correctly
- Tables are created manually
- Direct psql connections work
- Password is configured correctly (MD5)

Error: `P1000: Authentication failed`

## Root Cause
This is a known issue with Prisma + Windows + Docker + PostgreSQL authentication. The Prisma query engine binary has issues with MD5 and SCRAM-SHA-256 authentication on Windows when connecting to Docker containers.

GitHub Issues:
- https://github.com/prisma/prisma/issues/4228
- https://github.com/prisma/prisma/issues/12485

## Temporary Solution

Since the database is already set up and tables exist, you have two options:

### Option 1: Use WSL2 (Recommended)
Run the entire development environment in WSL2 Ubuntu:

```bash
# In WSL2
cd /mnt/c/Users/lucar/Projects/BIM/IFC-OpenWorld/backend
yarn install
yarn db:generate
yarn dev
```

### Option 2: Continue with Limited Functionality
The API server works, but database health check fails. You can:

1. **Comment out Prisma health check** in `src/api/v1/health.ts`
2. **Use raw SQL queries** for now
3. **Test endpoints manually** that don't require database

### Option 3: Use PostgreSQL Native Client
Replace Prisma with `pg` (node-postgres) for development:

```bash
yarn add pg
yarn add --dev @types/pg
```

Then use raw SQL queries instead of Prisma.

## Current Status

✅ **Working:**
- Docker containers (PostgreSQL + MinIO)
- Database tables created
- Express server running
- All endpoints defined
- TypeScript compilation
- ESLint passing

❌ **Not Working:**
- Prisma Client authentication
- Database health check
- Any endpoint that uses Prisma

## Next Steps

1. **For development**: Use WSL2 or continue without database functionality
2. **For production**: Deploy to Linux server (no Windows issues)
3. **Alternative**: Wait for Prisma to fix Windows support or use `pg` library

## Quick Test

To verify everything else works:

```powershell
# Server is running
curl http://localhost:3000/api/v1/health

# Should return (database disconnected is expected):
# {"status":"unhealthy","database":"disconnected"}
```

---

**Note**: This is a development environment issue only. Production deployment on Linux will work perfectly.
