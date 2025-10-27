# IFC-OpenWorld Backend API Documentation

## Base URL
```
http://localhost:3000/api/v1
```

## Rate Limiting

- **Global**: 100 requests per 15 minutes per IP
- **Upload Endpoints**: 10 requests per hour per IP

Rate limit headers:
- `RateLimit-Limit`: Maximum requests allowed
- `RateLimit-Remaining`: Requests remaining
- `RateLimit-Reset`: Time when rate limit resets (Unix timestamp)

## Authentication

Currently, no authentication is required. Authentication will be added in future milestones.

---

## Endpoints

### Health Check

#### `GET /api/v1/health`

Check API and database health status.

**Response** (200 OK):
```json
{
  "status": "healthy",
  "timestamp": "2025-10-27T12:00:00.000Z",
  "environment": "development",
  "database": "connected"
}
```

**Response** (503 Service Unavailable):
```json
{
  "status": "unhealthy",
  "timestamp": "2025-10-27T12:00:00.000Z",
  "environment": "development",
  "database": "disconnected",
  "error": "Connection refused"
}
```

---

### File Upload

#### `POST /api/v1/upload/request`

Request a presigned URL for direct browser upload to S3.

**Request Body**:
```json
{
  "fileName": "building.ifc",
  "fileSize": 52428800,
  "contentType": "application/x-step"
}
```

**Validation Rules**:
- `fileName`: Required, 1-255 characters, must end with `.ifc`
- `fileSize`: Required, positive integer, max 100 MB (104857600 bytes)
- `contentType`: Required, must be one of:
  - `application/x-step`
  - `application/ifc`
  - `text/plain`

**Response** (200 OK):
```json
{
  "fileId": "550e8400-e29b-41d4-a716-446655440000",
  "presignedUrl": "http://localhost:9000/ifc-raw/...",
  "s3Key": "ifc-raw/1698765432-abc123-building.ifc",
  "expiresIn": 900
}
```

**Error Responses**:
- `400 Bad Request`: Invalid request body or file validation failed
- `429 Too Many Requests`: Upload rate limit exceeded (max 10/hour)
- `500 Internal Server Error`: Server error

#### `POST /api/v1/upload/complete`

Mark upload as complete after browser finishes uploading to S3.

**Request Body**:
```json
{
  "fileId": "550e8400-e29b-41d4-a716-446655440000",
  "s3Key": "ifc-raw/1698765432-abc123-building.ifc"
}
```

**Validation Rules**:
- `fileId`: Required, valid UUID
- `s3Key`: Required, must match database record

**Response** (200 OK):
```json
{
  "success": true,
  "fileId": "550e8400-e29b-41d4-a716-446655440000",
  "fileName": "building.ifc",
  "uploadStatus": "completed",
  "processingStatus": "not_started"
}
```

**Error Responses**:
- `400 Bad Request`: Invalid request body, S3 key mismatch, or file not found in storage
- `404 Not Found`: File record not found in database
- `500 Internal Server Error`: Server error

---

### Buildings

#### `GET /api/v1/buildings?bbox=minLon,minLat,maxLon,maxLat&limit=100&cursor=uuid`

Query buildings within a geographic bounding box using PostGIS.

**Query Parameters**:
- `bbox` (required): Bounding box in format `minLon,minLat,maxLon,maxLat`
  - Example: `bbox=-122.5,37.7,-122.3,37.9`
  - Longitude range: -180 to 180
  - Latitude range: -90 to 90
  - minLon must be < maxLon
  - minLat must be < maxLat
- `limit` (optional): Maximum results per request (default: 100, max: 1000)
- `cursor` (optional): Building UUID for pagination (returns buildings after this ID)

**Response** (200 OK):
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "geometry": {
        "type": "Point",
        "coordinates": [-122.4194, 37.7749]
      },
      "properties": {
        "name": "San Francisco Tower",
        "address": "123 Market St",
        "city": "San Francisco",
        "country": "USA",
        "height": 120.5,
        "floorCount": 30,
        "ifcFileId": "660e8400-e29b-41d4-a716-446655440001",
        "createdAt": "2025-10-27T12:00:00.000Z",
        "updatedAt": "2025-10-27T12:00:00.000Z"
      }
    }
  ],
  "metadata": {
    "count": 1,
    "bbox": {
      "minLon": -122.5,
      "minLat": 37.7,
      "maxLon": -122.3,
      "maxLat": 37.9
    },
    "nextCursor": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

**Pagination**:
- If `metadata.nextCursor` is present, use it in the next request to get more results
- Example: `/api/v1/buildings?bbox=-122.5,37.7,-122.3,37.9&cursor=550e8400...`

**Error Responses**:
- `400 Bad Request`: Invalid query parameters or validation failed
- `429 Too Many Requests`: Rate limit exceeded (max 100/15min)
- `500 Internal Server Error`: Server error

#### `GET /api/v1/buildings/:id`

Get a single building by UUID.

**Path Parameters**:
- `id` (required): Building UUID

**Response** (200 OK):
```json
{
  "type": "Feature",
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "geometry": {
    "type": "Point",
    "coordinates": [-122.4194, 37.7749]
  },
  "properties": {
    "name": "San Francisco Tower",
    "address": "123 Market St",
    "city": "San Francisco",
    "country": "USA",
    "height": 120.5,
    "floorCount": 30,
    "ifcFileId": "660e8400-e29b-41d4-a716-446655440001",
    "createdAt": "2025-10-27T12:00:00.000Z",
    "updatedAt": "2025-10-27T12:00:00.000Z"
  }
}
```

**Error Responses**:
- `400 Bad Request`: Invalid UUID format
- `404 Not Found`: Building not found
- `500 Internal Server Error`: Server error

---

## GeoJSON Format

All building responses follow the [GeoJSON RFC 7946](https://datatracker.ietf.org/doc/html/rfc7946) specification.

### Coordinate Reference System

- **SRID**: 4326 (WGS 84)
- **Coordinate Order**: `[longitude, latitude]` (NOT lat, lon!)
- **Format**: `[-180 to 180, -90 to 90]`

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message",
  "details": []  // Optional, for validation errors
}
```

### HTTP Status Codes

- `200 OK`: Success
- `400 Bad Request`: Client error (invalid input, validation failed)
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error
- `503 Service Unavailable`: Database unavailable

---

## Database Schema

### IFCFile Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| fileName | VARCHAR(255) | Original filename |
| fileSize | INTEGER | File size in bytes |
| s3Key | VARCHAR(512) | S3 object key |
| uploadStatus | ENUM | `pending`, `completed`, `failed` |
| processingStatus | ENUM | `not_started`, `processing`, `completed`, `failed` |
| uploadedAt | TIMESTAMP | Upload completion time |
| createdAt | TIMESTAMP | Record creation time |
| updatedAt | TIMESTAMP | Last update time |

### Building Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | VARCHAR(255) | Building name (nullable) |
| address | TEXT | Street address (nullable) |
| city | VARCHAR(100) | City name (nullable) |
| country | VARCHAR(100) | Country name (nullable) |
| height | DECIMAL | Height in meters (nullable) |
| floorCount | INTEGER | Number of floors (nullable) |
| location | GEOGRAPHY(Point, 4326) | PostGIS geographic point |
| ifcFileId | UUID | Foreign key to IFCFile |
| createdAt | TIMESTAMP | Record creation time |
| updatedAt | TIMESTAMP | Last update time |

### Indexes

- `idx_buildings_location` (GiST): Spatial index on `location` for fast geographic queries

---

## Development

### Testing with curl

**Health check**:
```bash
curl http://localhost:3000/api/v1/health
```

**Request upload URL**:
```bash
curl -X POST http://localhost:3000/api/v1/upload/request \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "test.ifc",
    "fileSize": 1024000,
    "contentType": "application/x-step"
  }'
```

**Query buildings**:
```bash
curl "http://localhost:3000/api/v1/buildings?bbox=-122.5,37.7,-122.3,37.9&limit=10"
```

**Get building by ID**:
```bash
curl http://localhost:3000/api/v1/buildings/550e8400-e29b-41d4-a716-446655440000
```

---

## Future Milestones

- [ ] Swagger/OpenAPI UI (`/api/docs`)
- [ ] Authentication (JWT)
- [ ] WebSocket for processing status updates
- [ ] 3D Tiles endpoint integration
- [ ] Advanced spatial queries (radius, polygon)
- [ ] Building search by name/address

---

**Last Updated**: 2025-10-27
**API Version**: 1.0.0
**Milestone**: M1 - Backend API Implementation
