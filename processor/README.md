# IFC Processor Service

Microservice for processing IFC (Industry Foundation Classes) files and extracting geographical coordinates.

## Overview

This service handles asynchronous IFC file processing:
1. Downloads IFC files from S3/MinIO storage
2. Extracts IfcSite coordinates using IfcOpenShell
3. Converts DMS (degrees, minutes, seconds) to decimal degrees
4. Extracts building metadata (name, address, floors, height)
5. Creates building records in PostgreSQL/PostGIS database
6. Updates file processing status

## Architecture

- **FastAPI**: REST API for task management
- **Celery**: Async task queue for IFC processing
- **Redis**: Message broker for Celery
- **IfcOpenShell**: IFC file parsing library
- **PostgreSQL/PostGIS**: Spatial database for building coordinates

## Prerequisites

- Python 3.11+
- Redis server
- PostgreSQL 15+ with PostGIS extension
- S3/MinIO storage

## Installation

### 1. Create Virtual Environment

```bash
cd processor
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env with your configuration
```

Required environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`
- `CLAMAV_HOST`, `CLAMAV_PORT`, `CLAMAV_ENABLED`: ClamAV malware scanning

## Running the Service

### Start Required Services

```bash
# Start all services (PostgreSQL, Redis, MinIO, ClamAV)
cd ../backend
docker-compose up -d

# Or start individual services:
# Redis
docker run -d -p 6379:6379 redis:7-alpine

# ClamAV
docker run -d -p 3310:3310 clamav/clamav:latest
```

**Note**: ClamAV takes ~2 minutes to start as it downloads virus definitions on first run.

### Start Celery Worker

```bash
celery -A app.tasks.process_ifc worker --loglevel=info
```

### Start FastAPI Server

```bash
# Development
python -m app.main

# Or with uvicorn
uvicorn app.main:app --reload --port 8000
```

## API Endpoints

### POST /process

Queue IFC file for processing

**Request**:
```json
{
  "file_id": "uuid-of-ifc-file-record",
  "s3_key": "ifc-raw/filename.ifc"
}
```

**Response** (202 Accepted):
```json
{
  "task_id": "celery-task-id",
  "status": "queued",
  "file_id": "uuid-of-ifc-file-record"
}
```

### GET /task/{task_id}

Get status of processing task

**Response**:
```json
{
  "task_id": "celery-task-id",
  "state": "SUCCESS",
  "status": "Task completed successfully",
  "result": {
    "status": "success",
    "file_id": "...",
    "building_id": "...",
    "latitude": 41.8902,
    "longitude": 12.4924,
    "metadata": {
      "name": "Building Name",
      "address": "...",
      "city": "...",
      "country": "...",
      "height": 48.5,
      "floor_count": 4
    }
  }
}
```

### GET /health

Health check endpoint

**Response**:
```json
{
  "status": "healthy",
  "service": "ifc-processor",
  "environment": "development"
}
```

## IFC Coordinate Extraction

### Supported Formats

The service handles two IFC coordinate formats:

1. **DMS (Degrees, Minutes, Seconds)**:
   ```python
   RefLatitude = (41, 53, 24, 72000)  # 41°53'24"N
   RefLongitude = (12, 29, 32, 64000)  # 12°29'32"E
   ```

2. **Decimal Degrees**:
   ```python
   RefLatitude = 41.8902
   RefLongitude = 12.4924
   ```

### Conversion Logic

DMS to decimal degrees:
```
decimal = degrees + minutes/60 + seconds/3600 + microseconds/3600000000
```

### Validation

- Latitude: -90° to 90°
- Longitude: -180° to 180°

## Error Handling

Processing can fail for various reasons:

1. **Invalid IFC file**: Malformed or corrupted file
2. **Missing coordinates**: No IfcSite or missing RefLatitude/RefLongitude
3. **Invalid coordinates**: Out of range values
4. **S3 download failure**: File not found or network error
5. **Database error**: Connection or constraint violations

Failed tasks update the database with:
- `upload_status`: "completed"
- `processing_status`: "failed"
- Error logged for debugging

## Testing

### Run Tests

```bash
# Run all tests with coverage
pytest tests/ -v --cov=app --cov-report=term-missing

# Run with HTML coverage report
pytest tests/ --cov=app --cov-report=html

# Run specific test file
pytest tests/test_ifc_parser.py -v

# Run with markers
pytest tests/ -m unit  # Run only unit tests
```

**Test Results** (2025-10-28 Updated):
- ✅ 62/63 tests passing (98.4%)
- ✅ 78% code coverage
- ✅ 3.96 seconds execution time
- ✅ **ClamAV malware scanning tests included**

See [TEST-RESULTS.md](TEST-RESULTS.md) for detailed test report.

### Test with Sample IFC File

```bash
python -c "
from app.services.ifc_parser import parse_ifc_file
result = parse_ifc_file('path/to/sample.ifc')
print(result)
"
```

## Development

### Project Structure

```
processor/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application
│   ├── config.py            # Configuration management
│   ├── services/
│   │   ├── __init__.py
│   │   └── ifc_parser.py    # IFC coordinate extraction
│   └── tasks/
│       ├── __init__.py
│       └── process_ifc.py   # Celery tasks
├── tests/
│   └── (test files)
├── .env.example
├── requirements.txt
└── README.md
```

### Adding New Features

1. **New IFC extraction logic**: Modify `app/services/ifc_parser.py`
2. **New task types**: Add to `app/tasks/`
3. **New API endpoints**: Add to `app/main.py`

## Monitoring

### Celery Task Status

```bash
# Inspect active workers
celery -A app.tasks.process_ifc inspect active

# Monitor tasks
celery -A app.tasks.process_ifc events
```

### Logs

Logs are written to stdout with configurable level (`LOG_LEVEL` in .env).

## Troubleshooting

### IfcOpenShell Installation Issues

If `pip install` fails for ifcopenshell on Windows:

```bash
# Try using conda
conda install -c conda-forge ifcopenshell

# Or download pre-built wheel
# https://github.com/IfcOpenShell/IfcOpenShell/releases
```

### Redis Connection Errors

```bash
# Test Redis connection
redis-cli ping
# Should return: PONG
```

### Database Connection Errors

```bash
# Test PostgreSQL connection
psql "postgresql://user:password@host:port/database"

# Check PostGIS extension
psql -c "SELECT PostGIS_version();"
```

## Production Deployment

### Docker

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Environment Variables

Set in production:
- `ENVIRONMENT=production`
- `LOG_LEVEL=WARNING`
- Secure credentials (DATABASE_URL, S3 keys)

### Scaling

- **Horizontal**: Run multiple Celery workers
- **Vertical**: Increase worker concurrency (`--concurrency=4`)

## License

MIT

## Related Services

- **Backend API** (`../backend`): Node.js REST API for file uploads
- **Frontend** (`../frontend`): React web application
