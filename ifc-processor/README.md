# IFC Processor Service

Python microservice for processing IFC (Industry Foundation Classes) building files.

## Features

- **IFC Parsing**: Extract coordinates and metadata using IfcOpenShell
- **Async Processing**: Celery worker with Redis queue
- **S3 Integration**: Download files from MinIO/S3
- **PostGIS Integration**: Store geographic coordinates in PostgreSQL

## Architecture

```
Backend (Node.js) → Redis Queue → Celery Worker (Python)
                                        ↓
                                  IfcOpenShell
                                        ↓
                                  PostgreSQL + PostGIS
```

## Dependencies

- Python 3.11+
- IfcOpenShell 0.7.0
- Celery 5.3.4
- Redis 5.0.1
- psycopg2 2.9.9
- boto3 1.29.7

## Setup

### Local Development

1. **Copy environment file**:
   ```bash
   cp .env.example .env
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Start Redis** (via Docker):
   ```bash
   docker run -d -p 6379:6379 redis:7-alpine
   ```

4. **Run Celery worker**:
   ```bash
   celery -A app.workers.ifc_processing worker --loglevel=info
   ```

### Docker

```bash
docker build -t ifc-processor .
docker run --env-file .env ifc-processor
```

## Usage

### Trigger Processing Task

From Node.js backend:

```javascript
const redis = require('redis');
const client = redis.createClient();

// Trigger Celery task
client.lpush('celery', JSON.stringify({
  task: 'app.workers.ifc_processing.process_ifc_file',
  args: [fileId, s3Key],
  kwargs: {},
  id: taskId,
}));
```

### Check Task Status

```javascript
const result = await client.get(`celery-task-meta-${taskId}`);
const status = JSON.parse(result);
console.log(status.state); // PENDING, SUCCESS, FAILURE
```

## IFC File Requirements

The IFC file must contain:

- **IfcSite** entity with:
  - `RefLatitude`: Geographic latitude (DMS or decimal)
  - `RefLongitude`: Geographic longitude (DMS or decimal)

Example:
```
#123=IFCSITE('id','SiteName',$,$,$,#100,$,$,.ELEMENT.,(41,54,12,0),(12,29,46,0),0.,$,$);
```

Coordinates format:
- **DMS**: `(degrees, minutes, seconds, milliseconds)`
- **Decimal**: `41.9028` (automatically detected)

## Processing Flow

1. **Download**: Get IFC file from S3/MinIO
2. **Parse**: Extract coordinates using IfcOpenShell
3. **Extract Metadata**: Building name, address, height, floors
4. **Save**: Update database with coordinates and metadata
5. **Cleanup**: Delete temporary file

## Error Handling

- **S3 Errors**: Retry 3 times with 60s delay
- **Parsing Errors**: Mark as failed, no retry (invalid file)
- **Database Errors**: Retry 3 times with 60s delay
- **Unexpected Errors**: Retry 3 times with 60s delay

## Logging

Structured JSON logging with:
- Task ID
- File ID
- Processing steps
- Errors with stack traces

Example log:
```json
{
  "timestamp": "2025-10-29T15:30:00",
  "level": "INFO",
  "task": "process_ifc_file",
  "task_id": "abc-123",
  "file_id": "def-456",
  "message": "Extracted coordinates: lat=41.9028, lon=12.4964"
}
```

## Testing

Run tests:
```bash
pytest tests/ --cov=app --cov-report=term-missing
```

## Performance

- **Average processing time**: 2-5 seconds per file
- **Peak throughput**: 10 files/minute (2 concurrent workers)
- **Memory usage**: ~200MB per worker

## Monitoring

Health check task:
```python
from app.workers.ifc_processing import health_check

result = health_check.delay()
print(result.get())  # {'status': 'healthy', 'worker': 'ifc_processor'}
```

## Troubleshooting

### IfcOpenShell import error

```bash
pip install --upgrade ifcopenshell
```

### Redis connection refused

Check Redis is running:
```bash
redis-cli ping
# Should return: PONG
```

### Database connection error

Check PostgreSQL is running and credentials are correct:
```bash
psql $DATABASE_URL -c "SELECT version();"
```

## License

Part of IFC-OpenWorld project.