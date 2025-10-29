# Database Migrations

This directory contains SQL migration scripts for the IFC-OpenWorld database.

## How to Run Migrations

Migrations are applied manually using the PostgreSQL Docker container:

```bash
# Run a specific migration
docker exec ifc-openworld-db psql -U ifc_user -d ifc_openworld -f /path/to/migration.sql

# Or using psql -c for simple commands
docker exec ifc-openworld-db psql -U ifc_user -d ifc_openworld -c "ALTER TYPE upload_status ADD VALUE IF NOT EXISTS 'deleted';"
```

## Migration History

| Migration | Date | Description | Status |
|-----------|------|-------------|--------|
| 001 | 2025-10-27 | Initial schema (ifc_files, buildings) | ✅ Applied |
| 002 | 2025-10-29 | Add 'deleted' status to upload_status enum | ✅ Applied |

## Notes

- Migrations are NOT automatically applied
- Always backup database before applying migrations in production
- Use `IF NOT EXISTS` where possible to make migrations idempotent
- Test migrations in development before applying to production
