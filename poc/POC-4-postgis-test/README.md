# POC-4: PostgreSQL + PostGIS Spatial Queries

**Priorità**: 🟡 Non-Critica
**Tempo Stimato**: 4 ore
**Difficoltà**: ⭐⭐ Medio

---

## 🎯 Obiettivo

Validare che PostGIS spatial queries sono veloci abbastanza (<100ms per 1000 buildings).

---

## ✅ Criteri di Successo

- [ ] PostgreSQL + PostGIS installato via Docker
- [ ] GiST index creato su location column
- [ ] Query "buildings entro 5km" <100ms su 1000 records
- [ ] Query <500ms su 10,000 records

---

## 🛠️ Setup

```bash
cd poc/POC-4-postgis-test/

# Start PostgreSQL + PostGIS in Docker
docker-compose up -d

# Wait 10 secondi per startup
sleep 10

# Connect e run seed data
docker exec -i postgis-test psql -U test -d testdb < seed_data.sql

# Run spatial queries
docker exec -i postgis-test psql -U test -d testdb < spatial_queries.sql
```

---

## 🧪 Test Queries

### Test 1: Buildings Near Me (Rome)
```sql
EXPLAIN ANALYZE
SELECT id, name, ST_Distance(location, ST_SetSRID(ST_MakePoint(12.4964, 41.9028), 4326)::geography) as distance_m
FROM buildings
WHERE ST_DWithin(
  location,
  ST_SetSRID(ST_MakePoint(12.4964, 41.9028), 4326)::geography,
  5000  -- 5km radius
)
ORDER BY distance_m
LIMIT 100;
```

**Expected**: Execution time <100ms

### Test 2: Count Buildings in Bounding Box
```sql
EXPLAIN ANALYZE
SELECT COUNT(*)
FROM buildings
WHERE location && ST_MakeEnvelope(12.4, 41.8, 12.6, 42.0, 4326);
```

**Expected**: Execution time <50ms

---

## 📊 Performance Targets

| Query Type | Dataset Size | Target Time | Actual | Pass? |
|------------|--------------|-------------|--------|-------|
| Radius 5km | 1,000 | <100ms | ____ms | ✅/❌ |
| Radius 5km | 10,000 | <500ms | ____ms | ✅/❌ |
| BBox count | 1,000 | <50ms | ____ms | ✅/❌ |

---

## 🎯 Decision

**✅ PASS** se: Tutte query <500ms
**⚠️ PARTIAL** se: Query 100-500ms (OK per MVP)
**❌ FAIL** se: Query >1 secondo (troppo lento)

**Alternative se FAIL**: SQLite + SpatiaLite (più semplice, meno feature)

---

**Next**: Se tutti POC completati → compila `../POC-SUMMARY.md`
