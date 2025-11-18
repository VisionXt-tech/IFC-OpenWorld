# 🚀 Quick Start Guide

This guide will help you start the IFC-OpenWorld development environment in seconds.

## Prerequisites

- Docker and Docker Compose installed
- Node.js 20.10+ installed
- Git installed

## One-Command Setup

Start everything (Docker + Backend + Frontend):

```bash
./start-dev.sh
```

That's it! The script will:
1. ✅ Start all Docker services (PostgreSQL, Redis, MinIO, IFC Processor)
2. ✅ Install dependencies if needed (npm install)
3. ✅ Start the Backend API server
4. ✅ Start the Frontend dev server
5. ✅ Display real-time logs

## Access the Application

Once started, you can access:

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **MinIO Console**: http://localhost:9001 (minioadmin/minioadmin)
- **API Health Check**: http://localhost:3001/api/v1/health

## Available Commands

### Start Development Environment
```bash
./start-dev.sh
```
Starts all services and displays combined logs.

### Stop Development Environment
```bash
./stop-dev.sh
```
Stops all running services gracefully.

**Or press `Ctrl+C`** in the terminal where `start-dev.sh` is running.

### Restart Everything
```bash
./restart-dev.sh
```
Stops and starts all services (useful after config changes).

## View Logs

### Combined Logs (Real-time)
The `start-dev.sh` script shows combined logs automatically.

### Individual Service Logs
```bash
# Backend logs
tail -f backend.log

# Frontend logs
tail -f frontend.log

# Docker services logs
docker-compose logs -f

# Specific Docker service
docker-compose logs -f postgres
docker-compose logs -f ifc-processor
```

## First Time Setup

### 1. Clone and Navigate
```bash
git clone https://github.com/VisionXt-tech/IFC-OpenWorld.git
cd IFC-OpenWorld
```

### 2. Configure Environment Variables

**Backend** (`backend/.env`):
```bash
cd backend
cp .env.example .env
# Edit .env if needed
cd ..
```

**Frontend** (`frontend/.env`):
```bash
cd frontend
cp .env.example .env
# Edit .env if needed
cd ..
```

The `start-dev.sh` script will create these automatically if they don't exist.

### 3. Start Everything
```bash
./start-dev.sh
```

## Troubleshooting

### Port Already in Use

If you get port conflict errors:

```bash
# Check what's using the port
lsof -i :5173  # Frontend
lsof -i :3001  # Backend
lsof -i :5433  # PostgreSQL
lsof -i :6379  # Redis
lsof -i :9000  # MinIO API
lsof -i :9001  # MinIO Console

# Kill the process using the port
kill -9 <PID>
```

### Docker Not Running

Start Docker:
```bash
# Linux
sudo systemctl start docker

# macOS
open -a Docker
```

### Services Won't Start

1. Check logs:
```bash
tail -50 backend.log
tail -50 frontend.log
docker-compose logs
```

2. Clean restart:
```bash
./stop-dev.sh
docker-compose down -v  # Remove volumes
./start-dev.sh
```

### Database Issues

Reset the database:
```bash
./stop-dev.sh
docker-compose down -v
docker volume prune -f
./start-dev.sh
```

### Node Modules Issues

Reinstall dependencies:
```bash
# Backend
cd backend
rm -rf node_modules package-lock.json
npm install
cd ..

# Frontend
cd frontend
rm -rf node_modules package-lock.json
npm install
cd ..
```

## Development Workflow

### 1. Start Development
```bash
./start-dev.sh
```

### 2. Make Changes
- Frontend code: Auto-reloads via Vite HMR
- Backend code: Auto-restarts via tsx watch mode

### 3. View Changes
Open http://localhost:5173 in your browser

### 4. Stop Development
Press `Ctrl+C` or run:
```bash
./stop-dev.sh
```

## Advanced Usage

### Run Individual Services

If you want more control, run services separately:

#### Docker Services Only
```bash
docker-compose up -d
```

#### Backend Only
```bash
cd backend
npm run dev
```

#### Frontend Only
```bash
cd frontend
npm run dev
```

### Check Service Health

```bash
# Backend health
curl http://localhost:3001/api/v1/health

# PostgreSQL
docker-compose exec postgres pg_isready -U ifc_user

# Redis
docker-compose exec redis redis-cli ping

# MinIO
curl http://localhost:9000/minio/health/live
```

### Database Access

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U ifc_user -d ifc_openworld

# Redis CLI
docker-compose exec redis redis-cli
```

## Testing the Application

### 1. Upload an IFC File

1. Open http://localhost:5173
2. Click "Upload IFC"
3. Drag & drop or select an IFC file
4. Wait for processing (status will update automatically)

### 2. View 3D Models

1. Toggle "🏢 3D View" button
2. Buildings with 3D models will be displayed on the globe
3. Click on a building to see details

### 3. Check Processing Status

Monitor IFC processing in real-time:
```bash
docker-compose logs -f ifc-processor
```

## Configuration

### Backend Configuration

Edit `backend/.env`:

```env
# Database
DATABASE_URL=postgresql://ifc_user:ifc_password@localhost:5433/ifc_openworld

# Redis
REDIS_URL=redis://localhost:6379

# S3/MinIO
AWS_ENDPOINT=http://localhost:9000
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
AWS_BUCKET_NAME=ifc-files
AWS_REGION=us-east-1

# Server
PORT=3001
NODE_ENV=development
```

### Frontend Configuration

Edit `frontend/.env`:

```env
# API Base URL
VITE_API_BASE_URL=http://localhost:3001/api/v1

# CesiumJS Ion Token (optional, for better imagery)
VITE_CESIUM_ION_TOKEN=your_cesium_ion_token_here

# File Upload Limits
VITE_MAX_UPLOAD_SIZE_MB=100
VITE_ALLOWED_FILE_EXTENSIONS=.ifc

# Debug Mode
VITE_ENABLE_DEBUG=true
```

## Next Steps

- Read the full [README.md](./README.md) for architecture details
- Check [docs/](./docs/) for technical documentation
- Review [specs/](./specs/) for feature specifications
- Explore [poc/](./poc/) for proof of concepts

## Support

If you encounter issues:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review logs: `backend.log`, `frontend.log`, `docker-compose logs`
3. Open an issue on GitHub

---

**Happy coding! 🎨**
