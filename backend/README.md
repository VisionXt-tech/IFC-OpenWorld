# IFC-OpenWorld Backend API

REST API server for IFC-OpenWorld platform - handles file uploads, building queries, and spatial operations.

## 🚀 Quick Start

### Prerequisites
- Node.js 20.10.0+ LTS
- **Yarn** (Windows) or npm (macOS/Linux)
- Docker 20.10+ (for PostgreSQL + MinIO)

### Installation

```bash
# Install dependencies
yarn install  # or npm install

# Copy environment file
cp .env.example .env

# Start Docker services (PostgreSQL + MinIO)
docker-compose up -d

# Wait for database to be ready (check logs)
docker-compose logs -f postgres

# Generate Prisma client
yarn db:generate

# Run database migrations
yarn db:migrate

# Start development server
yarn dev
```

Server will start on http://localhost:3000

### Verify Installation

```bash
# Health check
curl http://localhost:3000/api/v1/health

# Expected response:
# {"status":"healthy","timestamp":"...","environment":"development","database":"connected"}
```

## 📁 Project Structure

```
backend/
├── src/
│   ├── api/v1/              # API routes
│   │   ├── health.ts        # Health check endpoint
│   │   ├── upload.ts        # File upload endpoints
│   │   └── buildings.ts     # Building query endpoints
│   ├── services/            # Business logic
│   │   ├── s3Service.ts     # S3/MinIO operations
│   │   └── buildingService.ts # Spatial queries
│   ├── middleware/          # Express middleware
│   │   ├── errorHandler.ts # Global error handling
│   │   └── rateLimit.ts    # Rate limiting
│   ├── models/              # Prisma models
│   ├── config/              # Configuration
│   ├── utils/               # Utilities
│   └── index.ts             # Entry point
├── tests/
│   ├── unit/                # Unit tests
│   └── integration/         # Integration tests
├── prisma/
│   ├── schema.prisma        # Database schema
│   └── migrations/          # SQL migrations
├── docker-compose.yml       # Development services
├── tsconfig.json            # TypeScript config (strict mode)
├── .eslintrc.json           # ESLint rules
└── package.json
```

## 🛠️ Development

### Available Scripts

```bash
# Development
yarn dev              # Start with hot reload
yarn build            # Compile TypeScript
yarn start            # Run production build

# Testing
yarn test             # Run all tests
yarn test:watch       # Run tests in watch mode
yarn test:coverage    # Generate coverage report (target: ≥85%)

# Code Quality
yarn lint             # Run ESLint
yarn lint:fix         # Fix ESLint errors
yarn format           # Format with Prettier
yarn typecheck        # TypeScript type checking

# Database
yarn db:generate      # Generate Prisma client
yarn db:migrate       # Run migrations
yarn db:studio        # Open Prisma Studio
```

### Docker Services

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f postgres
docker-compose logs -f minio

# Stop services
docker-compose down

# Remove volumes (⚠️ deletes data)
docker-compose down -v
```

## 📚 API Endpoints

### Health Check
```http
GET /api/v1/health
```

### File Upload
```http
POST /api/v1/upload/request
POST /api/v1/upload/complete
```

### Building Queries
```http
GET /api/v1/buildings?bbox=minLon,minLat,maxLon,maxLat
GET /api/v1/buildings/:id
```

Full API documentation available at `/api/docs` (Swagger UI) - coming soon.

## 🗄️ Database

### PostgreSQL + PostGIS

- **PostgreSQL**: 15.5
- **PostGIS**: 3.4.1
- **Extensions**: uuid-ossp, postgis

### Schema

- `ifc_files` - Uploaded IFC file metadata
- `buildings` - Georeferenced building records with PostGIS GEOGRAPHY type

### Migrations

Located in `prisma/migrations/`. Applied automatically with `yarn db:migrate`.

## 📦 S3 Storage (MinIO)

MinIO provides S3-compatible storage for development.

- **Console**: http://localhost:9001
- **Credentials**: minioadmin / minioadmin
- **Buckets**:
  - `ifc-raw` - Original IFC uploads
  - `ifc-processed` - Converted 3D Tiles

## 🧪 Testing

### Unit Tests

```bash
yarn test tests/unit
```

### Integration Tests

```bash
# Requires Docker services running
yarn test tests/integration
```

### Coverage Requirements

Per Constitution §1.5:
- **Minimum**: 85% coverage for critical paths
- **Target**: 90%+ overall

```bash
yarn test:coverage
```

## 🔒 Security

- **Helmet.js**: Security headers
- **CORS**: Configured for frontend origin
- **Rate Limiting**: 100 req/min per IP
- **Input Validation**: Zod schemas
- **SQL Injection**: Prisma parameterized queries

## 📝 Code Quality

### TypeScript Strict Mode

Enabled per Constitution §1.5:
- `strict: true`
- `noImplicitAny: true`
- `strictNullChecks: true`

### ESLint Rules

- Zero warnings in production
- Prettier integration
- TypeScript-specific rules

## 🐛 Troubleshooting

### Database Connection Failed

```bash
# Check PostgreSQL is running
docker-compose ps

# View database logs
docker-compose logs postgres

# Restart services
docker-compose restart postgres
```

### Prisma Client Not Found

```bash
# Regenerate Prisma client
yarn db:generate
```

### Port Already in Use

```bash
# Change PORT in .env
PORT=3001
```

## 📖 Related Documentation

- [SPEC-001](../specs/001-ifc-upload-visualization.md) - Feature specification
- [PLAN-001](../specs/001-plan.md) - Implementation plan
- [CONSTITUTION](../CONSTITUTION.md) - Project principles

## 🤝 Contributing

See root [CONTRIBUTING.md](../CONTRIBUTING.md) (TBD)

---

**Built with TypeScript + Express + Prisma + PostGIS**