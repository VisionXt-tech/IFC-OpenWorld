# IFC-OpenWorld Constitution

**Version:** 1.1
**Last Updated:** 2025-10-23
**Status:** Amended
**POC Validation:** ✅ **Technology Stack Validated** (2025-10-24) - [4/4 POC PASS](poc/POC-SUMMARY-FINAL.md)

This document defines the immutable principles, technical standards, and governance model for the IFC-OpenWorld project. All contributions, architectural decisions, and feature implementations must align with these foundational rules.

> **POC Validation Completed (2025-10-24):** All core technologies defined in §2 Technology Stack have been validated through proof-of-concept implementations. See [POC-SUMMARY-FINAL.md](poc/POC-SUMMARY-FINAL.md) for detailed results.

---

## Table of Contents

1. [Non-Negotiable Principles](#non-negotiable-principles)
   - 1.7 [Data Licensing & Attribution](#17-data-licensing--attribution)
2. [Technology Stack](#technology-stack)
   - 2.2 [Backend Architecture](#22-backend-architecture)
   - 2.7 [IFC & Geospatial Standards](#27-ifc--geospatial-standards)
3. [Architecture Principles](#architecture-principles)
4. [Quality Standards](#quality-standards)
   - 4.4 [Accessibility & Internationalization](#44-accessibility--internationalization)
5. [Governance Model](#governance-model)
   - 5.5 [Sustainability & Financial Model](#55-sustainability--financial-model)
6. [Amendment Process](#amendment-process)

---

## Non-Negotiable Principles

### 1.1 Open Standards First

**Mandate:** IFC-OpenWorld is built exclusively on open, vendor-neutral standards.

- **IFC Compliance:** Full support for IFC4 and IFC4x3 schemas via [buildingSMART](https://www.buildingsmart.org/) specifications
- **Geospatial Standards:** WGS84 coordinate reference system for all geographic data
- **Mapping Data:** OpenStreetMap as the primary basemap provider
- **No Proprietary Formats:** Reject closed file formats that require vendor-specific tools
- **API Contracts:** OpenAPI 3.0+ for all REST endpoints with public schema documentation

**Rationale:** Open standards ensure long-term sustainability, prevent vendor lock-in, and enable global collaboration.

### 1.2 Performance Excellence

**Mandate:** User experience must never be compromised by performance issues.

- **First Contentful Paint (FCP):** <1.5 seconds on 3G connections (simulated)
- **3D Navigation:** Maintain 60fps during camera movements and model interactions
- **Scalability:** Support rendering 1000+ building models simultaneously
- **Responsiveness:** UI interactions must respond within 100ms
- **Progressive Loading:** Implement Level of Detail (LOD) and streaming for large datasets

**Enforcement:** CI/CD pipeline includes Lighthouse performance audits; PRs failing thresholds are auto-rejected.

### 1.3 Security by Design

**Mandate:** Security is a first-class requirement, not an afterthought.

- **Transport Security:** HTTPS mandatory for all endpoints (no HTTP fallback)
- **Input Validation:** Rigorous server-side validation for all IFC uploads (file size limits, schema validation, malware scanning)
- **Injection Prevention:** Use parameterized queries for all database operations (zero tolerance for SQL injection)
- **Authentication:** OAuth 2.0 with PKCE for user authentication
- **Secrets Management:** No credentials in source code; use environment variables with rotation policies
- **Dependency Scanning:** Automated CVE detection via Snyk/Dependabot with 48-hour SLA for high-severity patches

**Rationale:** A single security breach can destroy user trust and violate legal obligations.

### 1.4 Privacy & GDPR Compliance

**Mandate:** User privacy is a fundamental right, not a checkbox.

- **Data Minimization:** Collect only data essential for core functionality
- **Explicit Consent:** Obtain clear, affirmative consent for data processing (no pre-checked boxes)
- **Right to Erasure:** Implement user data deletion within 30 days of request
- **Data Portability:** Provide export functionality for user-generated IFC models
- **Anonymous Usage:** Allow usage without account creation where feasible
- **Third-Party Processors:** Document and limit external data processors; ensure GDPR-compliant contracts

**Enforcement:** Annual privacy audits by external GDPR consultants.

### 1.5 Code Quality Excellence

**Mandate:** Technical debt is not acceptable as a long-term strategy.

- **Type Safety:** TypeScript strict mode enabled project-wide (`"strict": true`)
- **Test Coverage:** Minimum 85% coverage for critical paths (IFC parsing, 3D rendering, API layer)
- **Error Handling:** No silent failures; all errors must be logged with context
- **Code Review:** Mandatory peer review for all PRs (minimum 1 maintainer approval)
- **Linting:** ESLint + Prettier with zero warnings allowed in production code
- **Documentation:** JSDoc for public APIs; architecture decision records (ADRs) for major changes

**Rationale:** High-quality code reduces bugs, eases maintenance, and accelerates development.

### 1.6 Open Source Commitment

**Mandate:** IFC-OpenWorld is a public good, not a commercial product.

- **License:** MIT License for maximum permissiveness and commercial compatibility
- **Public Repository:** All source code hosted on GitHub with full history
- **Transparent Development:** Roadmap, issues, and discussions publicly accessible
- **No Paywalls:** Core functionality remains free forever (optional paid services for hosting/compute)
- **Contributor License Agreement (CLA):** Lightweight CLA to protect legal integrity

**Rationale:** Open source accelerates innovation, ensures transparency, and builds trust.

### 1.7 Data Licensing & Attribution

**Mandate:** User-contributed IFC models must have clear, open licensing to ensure reusability.

#### Default Upload License

**Required License for Public Models:**

- **Creative Commons Attribution 4.0 International (CC-BY 4.0)**
  - Allows: Sharing, remixing, commercial use
  - Requires: Attribution to original creator
  - Rationale: Balances openness with creator recognition

**Optional Alternative:**

- **CC0 (Public Domain Dedication)**
  - Allows: Unrestricted use without attribution
  - Use case: Government buildings, fully open datasets

**Forbidden:**

- CC-BY-NC (Non-Commercial) - conflicts with open source ethos
- CC-BY-ND (No Derivatives) - prevents remix culture
- Proprietary/All Rights Reserved - contradicts project mission

#### Upload Consent Flow

**Mandatory Checkbox Before Upload:**

```
☐ I certify that:
  1. I have the legal right to share this IFC model
  2. I agree to license it under CC-BY 4.0 (or CC0 if selected)
  3. The model does not contain sensitive/classified information
  4. I have removed personal data of building occupants (GDPR compliance)
```

**Metadata Capture:**

- Creator name (display name or real name)
- Upload date (automatic)
- License selection (CC-BY 4.0 default, CC0 opt-in)
- Optional: Project name, building year, architect name

#### Attribution Display

**In 3D Viewer (Cesium UI):**

When user clicks on a building:

```
Building Name: Example Hospital
Contributed by: @johndoe (2025-10-15)
License: CC-BY 4.0
Source IFC: Download | View Details
```

**In Export (IFC/glTF/JSON):**

Update IFC metadata:

```ifc
#1=IFCPERSON($,'Smith',$,$,$,$,$,$);
#2=IFCORGANIZATION($,'IFC-OpenWorld Community',$,$,$);
#3=IFCPERSONANDORGANIZATION(#1,#2,$);
#4=IFCAPPLICATION(#2,'1.0','IFC-OpenWorld Platform','IFC-OW');
#5=IFCOWNERHISTORY(#3,#4,$,.ADDED.,$,$,$,1729699200);
```

Include sidecar JSON:

```json
{
  "metadata": {
    "contributor": "johndoe",
    "uploadDate": "2025-10-15T14:30:00Z",
    "license": "CC-BY-4.0",
    "licenseURL": "https://creativecommons.org/licenses/by/4.0/",
    "sourceURL": "https://ifc-openworld.org/buildings/abc123",
    "attribution": "This model was contributed by @johndoe via IFC-OpenWorld (CC-BY 4.0)"
  }
}
```

#### Prohibited Content

**Auto-Reject on Upload:**

1. **Malware:** ClamAV scan on all files; quarantine if positive
2. **Military/Security Facilities:** Unless publicly documented (e.g., historical forts)
   - Detection: Keyword filter (IfcBuilding.Name contains "military", "base", "classified")
   - Manual review queue for flagged items
3. **Private Residences with Interior Details:** Privacy violation risk
   - Allow: Exterior massing only (IfcWall, IfcRoof)
   - Reject: Furniture, room layouts, personal items (IfcFurnishingElement)
   - Exception: Historical homes open to public (e.g., museums)

**Community Moderation:**

- Flag button in 3D viewer ("Report inappropriate content")
- Creates GitHub Issue with category tags:
  - `content/copyright` - DMCA claim
  - `content/privacy` - Personal data exposure
  - `content/security` - Sensitive infrastructure
  - `content/quality` - Broken geometry, spam

**Review SLA:**

- High priority (security/privacy): 24 hours
- Medium priority (copyright): 48 hours
- Low priority (quality): 7 days

**Decision Outcomes:**

- **Approved:** Close issue, no action
- **Remove:** Delete model, notify uploader via email
- **Appeal:** Uploader has 14 days to provide counter-evidence

#### DMCA Takedown Process

**Contact Email:** `dmca@ifc-openworld.org`

**Takedown Request Requirements:**

1. Signed statement under penalty of perjury
2. Identification of copyrighted work
3. URL of allegedly infringing content
4. Contact information of claimant
5. Good faith statement

**Timeline:**

- **Day 0:** Receive DMCA notice
- **Day 1:** Remove content, notify uploader
- **Day 15:** Uploader may file counter-notice
- **Day 30:** If no counter-notice, deletion is permanent
- **If Counter-Notice:** Restore content after 10-14 business days (per DMCA safe harbor)

**Permanent Record:**

- Maintain hash of removed content to prevent re-upload
- Log all takedown requests in `docs/dmca-log.md` (redacted PII)

#### License Compatibility

**External Data Sources:**

- **OpenStreetMap:** ODbL license; cannot mix OSM building footprints with CC-BY IFC data without proper attribution
- **Government Data:** Often CC0 or public domain; verify per-country
- **Commercial BIM Libraries:** Forbidden unless contributor owns rights

**Derivative Works:**

If user downloads IFC, modifies it, and re-uploads:
- Must credit original creator + indicate changes
- Example: `"Modified version of @johndoe's Hospital model (added solar panels)"`

#### Privacy Considerations

**Automatic PII Scrubbing:**

Before making model public, remove:
- IfcPerson attributes (building occupants, not contributors)
- IfcPostalAddress with unit numbers
- IfcPropertySet containing names, phone numbers, emails

**Example Allowed:**

```ifc
#10=IFCBUILDING('2vQ8R3fLD0HwHqLGxzVIlK',$,'City Hall',$,$,#11,$,$,.ELEMENT.,$,$,#12);
```

**Example Forbidden (PII leak):**

```ifc
#20=IFCPERSON($,'Rossi','Mario',$,$,$,$,$); // Building manager's name
#21=IFCPOSTALADDRESS($,$,$,$,('Apt 305'),$,'Rome','Lazio','00100','Italy'); // Specific apartment
```

#### Enforcement

**First Violation:**

- Warning email
- Content removed
- Account flagged

**Second Violation:**

- 30-day upload suspension
- Mandatory training on licensing/privacy

**Third Violation:**

- Permanent ban
- All content reviewed for compliance

---

## Technology Stack

### 2.1 Frontend Architecture

**Mandatory Technologies:**

- **UI Framework:** React 18+ with TypeScript
  - Hooks-based architecture (no class components)
  - Context API or Zustand for state management
- **3D Rendering:** [CesiumJS](https://cesium.com/cesiumjs/) for geospatial 3D visualization
  - 3D Tiles format for streaming large models
  - WebGL 2.0 minimum requirement
  - ✅ **POC-2 Validated**: 0.06s initialization, 50x faster than 3s target ([Details](poc/POC-2-cesium-viewer/RESULTS.md))
- **IFC Rendering:** Server-generated 3D Tiles only (no client-side IFC parsing)
  - Server converts IFC → glTF/3D Tiles via Python IfcOpenShell
  - Client renders pre-processed tiles via CesiumJS
  - ❌ **web-ifc Removed**: Incompatible with Vite 5.x + Web Workers ([T119 Blocker Analysis](poc/POC-2-cesium-viewer/T119-RESULTS.md))
  - ✅ **Architecture Decision (2025-10-26)**: Server-side parsing is more reliable, performant, and secure
- **Build Tooling:** Vite for fast development and optimized production builds
  - ⚠️ **Windows Requirement**: Must use **Yarn** instead of npm (npm bug #4828) - [Solution](poc/POC-2-cesium-viewer/YARN-SOLUTION.md)
- **Progressive Web App (PWA):** Service workers for offline capability, manifest for installability

**Forbidden:**

- Angular, Vue, or framework-hopping
- Proprietary 3D engines (e.g., Unity WebGL)
- jQuery or legacy DOM manipulation libraries

### 2.2 Backend Architecture

**Mandate:** Use specialized tools for each backend concern: Node.js for API/I/O, Python for IFC processing.

#### Node.js API Server

**Primary Backend:**

- **Runtime:** Node.js 20+ LTS with TypeScript
- **Framework:** Express.js or Fastify for REST API
  - Express: Mature ecosystem, middleware-rich
  - Fastify: 2x faster, better TypeScript support
- **Database ORM:** Prisma or TypeORM
  - Must generate efficient queries (log all queries in dev mode)
  - Migrations version-controlled in `migrations/` directory
- **Validation:** Zod or Joi for request/response schemas
- **Authentication:** Passport.js with OAuth 2.0 + PKCE strategy

**Responsibilities:**

- User authentication & authorization
- API endpoint routing (OpenAPI 3.0 spec)
- Database CRUD operations (PostgreSQL + PostGIS)
- File upload handling (S3 presigned URLs)
- WebSocket connections for real-time updates (Socket.io)

**Forbidden:**

- GraphQL (not in v1.0; may reconsider for v2.0 based on community demand)
- Koa, Hapi, or framework proliferation
- Raw SQL queries without parameterization (SQL injection risk)

#### Python IFC Processing Microservice

**Secondary Service (Containerized):**

- **Runtime:** Python 3.11+ with type hints
- **Framework:** FastAPI (async support, auto-generated OpenAPI docs)
- **IFC Library:** IfcOpenShell (no stable Node.js bindings available)
  - Geometry extraction
  - Schema validation
  - Coordinate transformation (GDAL/OGR)
  - ✅ **POC-1 Validated**: Instant (0.00s) coordinate extraction from IFC4 files ([Details](poc/POC-1-ifcopenshell/RESULTS.md))
- **Async Jobs:** Celery + Redis for background tasks
  - Task: Convert IFC → glTF/3D Tiles
  - Queue: Redis as message broker
  - Workers: Separate Docker containers, horizontally scalable

**Communication:**

- **Option 1 (Simple):** REST API calls from Node.js to FastAPI
  - Pros: Stateless, easy to debug
  - Cons: Synchronous blocking for long tasks
- **Option 2 (Scalable):** Message queue (RabbitMQ/Redis)
  - Node.js publishes job to queue
  - Python workers consume and process
  - Callback webhook on completion

**Example API Endpoint (FastAPI):**

```python
from fastapi import FastAPI, UploadFile
from ifcopenshell import open as ifc_open

app = FastAPI()

@app.post("/api/ifc/validate")
async def validate_ifc(file: UploadFile):
    ifc_file = ifc_open(file.file)
    return {
        "schema": ifc_file.schema,
        "entities": len(ifc_file.by_type("IfcBuildingElement")),
        "georeferenced": ifc_file.by_type("IfcSite")[0].RefLatitude is not None
    }
```

**Deployment:**

- Separate Docker container (`services/ifc-processor/Dockerfile`)
- Kubernetes Service for load balancing (optional)
- Health check endpoint: `GET /health`

#### Database Layer

**Primary Database:**

- **PostgreSQL 15+** with extensions:
  - **PostGIS 3.3+** for spatial queries (ST_Distance, ST_Within, etc.)
    - ✅ **POC-4 Validated**: 23.8ms for 5km radius queries (4x faster than 100ms target), GiST index performing optimally ([Details](poc/POC-4-postgis-test/RESULTS.md))
  - **pg_trgm** for fuzzy text search
  - **uuid-ossp** for UUID generation
- **Connection Pooling:** pg-pool (max 20 connections per instance)
- **Backup Strategy:**
  - Daily full backups (pg_dump)
  - WAL archiving for point-in-time recovery
  - 30-day retention policy

**Schema Design Principles:**

- **Normalization:** 3NF minimum (avoid data duplication)
- **Indexes:** B-tree for primary keys, GiST for geometry columns
- **Constraints:** Foreign keys enforced, NOT NULL where applicable
- **Auditing:** `created_at`, `updated_at` timestamps on all tables

**Example Table:**

```sql
CREATE TABLE buildings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ifc_file_id UUID REFERENCES ifc_files(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    location GEOGRAPHY(POINT, 4326) NOT NULL, -- WGS84
    elevation NUMERIC(10, 2),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_buildings_location ON buildings USING GIST(location);
```

#### File Storage

**Object Storage:**

- **S3-Compatible:** AWS S3, MinIO (self-hosted), DigitalOcean Spaces
  - ✅ **POC-3 Validated**: 50MB upload in 0.41s (24x faster than 10s target), Express + Multer performing exceptionally ([Details](poc/POC-3-upload-test/RESULTS.md))
- **Bucket Structure:**
  - `ifc-raw/` - Original uploaded IFC files
  - `ifc-processed/` - Converted glTF/3D Tiles
  - `user-avatars/` - Profile pictures
- **Access Control:**
  - Private by default (presigned URLs for downloads)
  - Public CDN for 3D tiles (cache TTL: 1 year)
- **Lifecycle Policies:**
  - Move to cold storage after 90 days of inactivity
  - Delete orphaned files (no database reference) after 7 days

**Upload Flow:**

1. Client requests upload URL: `POST /api/upload/request`
2. Server generates presigned S3 URL (15-minute expiry)
3. Client uploads directly to S3 (no server bandwidth)
4. Client notifies server: `POST /api/upload/complete`
5. Server validates file, creates database record

#### Caching Strategy

**Allowed (Performance):**

- **Redis:** Session storage, rate limiting, job queues
- **CDN:** CloudFront/Cloudflare for static assets and 3D tiles
- **In-Memory:** Node.js cache for frequently accessed data (LRU eviction)

**Forbidden:**

- MongoDB as primary database (spatial queries inferior to PostGIS)
- Memcached (Redis is superior for our use case)

#### Monitoring & Observability

**Mandatory:**

- **Metrics:** Prometheus exporters for Node.js, Python, PostgreSQL
- **Logs:** Structured JSON with correlation IDs (winston/pino for Node.js)
- **Tracing:** OpenTelemetry for distributed tracing
- **Alerting:** Grafana dashboards + PagerDuty for critical errors

**Health Checks:**

```
GET /health
{
  "status": "healthy",
  "services": {
    "database": "up",
    "redis": "up",
    "ifc-processor": "up",
    "s3": "up"
  },
  "uptime": 86400 // seconds
}
```

### 2.3 Infrastructure & DevOps

**Mandatory Technologies:**

- **Containerization:** Docker + Docker Compose for local development
- **Orchestration:** Kubernetes for production (optional for small deployments)
- **CI/CD:** GitHub Actions for automated testing, building, and deployment
- **Monitoring:** Prometheus + Grafana for metrics; Sentry for error tracking
- **Logging:** Structured JSON logs with correlation IDs

**Forbidden:**

- Proprietary CI/CD systems (Jenkins acceptable if self-hosted)
- Serverless-only architecture (vendor lock-in risk)

### 2.7 IFC & Geospatial Standards

**Mandate:** All IFC models must be properly georeferenced and validated for spatial accuracy.

#### IFC Schema Support

**Primary Versions:**
- **IFC4** (ISO 16739:2013) - Recommended for new projects
- **IFC4x3** (ISO 16739-1:2024) - Preferred for infrastructure projects

**Legacy Support:**
- **IFC2x3** (ISO 16739:2005) - Read-only, auto-convert to IFC4 on upload
- **Migration Path:** Automatic schema upgrade with validation warnings

**Forbidden:**
- Proprietary BIM formats (RVT, DGN, SKP) without IFC export
- IFC files with encrypted or obfuscated data

#### Georeferencing Requirements

**Mandatory IFC Entities:**

All uploaded models MUST contain:

1. **IfcSite** with valid geographic coordinates
   - `RefLatitude` and `RefLongitude` in WGS84 decimal degrees
   - Format: `[degrees, minutes, seconds, microseconds]` or decimal

2. **IfcBuilding** with proper nesting
   - Parent-child relationship: IfcSite → IfcBuilding → IfcStorey → IfcSpace

3. **IfcProject** with coordinate reference system
   - `MapConversion` attribute for local engineering coordinates
   - `TargetCRS` must reference WGS84 (EPSG:4326)

**Coordinate Precision:**
- **Latitude/Longitude:** 6 decimal places (±0.1m accuracy)
- **Elevation:** 2 decimal places (±0.01m accuracy)
- **Validation Range:**
  - Latitude: -90° to +90°
  - Longitude: -180° to +180°
  - Elevation: -500m to +9000m (Dead Sea to Everest range)

**Example Valid IfcSite:**

```ifc
#10=IFCSITE('2vQ8R3fLD0HwHqLGxzVIlK',$,'Building Site',$,$,#11,$,$,.ELEMENT.,
  (41,53,24,123456), // Latitude: 41°53'24.123456"
  (12,29,32,654321), // Longitude: 12°29'32.654321"
  50.00,             // Elevation in meters
  $);
```

#### Fallback Georeferencing (Missing Coordinates)

**For IFC files without IfcSite coordinates:**

1. **Upload Status:** Model marked as `pending_geolocation`
2. **User Notification:** Email sent with link to georeferencing UI
3. **Interactive Placement:**
   - Drag-and-drop model icon on Cesium map
   - Snap to OpenStreetMap building footprints (optional)
   - Set elevation via slider or manual input
4. **Timeout Policy:** After 30 days, model archived with warning
5. **Community Georeferencing:** Allow trusted users to suggest coordinates (requires original uploader approval)

**Validation on Save:**
- Check coordinate format compliance
- Verify coordinates fall within expected country/region (optional warning)
- Detect duplicate buildings at same coordinates (±10m tolerance)

#### 3D Tiles Conversion

**Trigger Conditions:**

Convert IFC to Cesium 3D Tiles when:
- File size >5 MB
- Triangle count >100,000
- User requests tiled format for performance

**LOD Strategy:**

| LOD Level | Distance from Camera | Triangle Budget | Detail Level |
|-----------|---------------------|-----------------|--------------|
| LOD 0     | >1000m              | <1,000 tris     | Bounding box only |
| LOD 1     | 500-1000m           | <10,000 tris    | Simplified massing |
| LOD 2     | 100-500m            | <100,000 tris   | Exterior with windows |
| LOD 3     | <100m               | Full resolution | All details + interiors |

**Processing Pipeline:**

1. **IFC → glTF:** Use IfcOpenShell to extract geometry
2. **glTF → 3D Tiles:** Cesium's 3d-tiles-tools (async job)
3. **Texture Optimization:** KTX2 compression with Basis Universal
4. **Storage:** Upload tiles to S3-compatible object storage
5. **CDN:** Serve via CloudFront or equivalent (cache TTL: 1 year)

**Processing Time SLA:**
- <5 MB: <2 minutes
- 5-50 MB: <15 minutes
- 50-200 MB: <1 hour
- >200 MB: Community tier = best effort; Pro tier = 4-hour SLA

#### Coordinate Transformation

**Use Case:** Convert between engineering coordinates (local origin) and geographic coordinates.

**Libraries:**
- **Frontend:** Proj4js for client-side transformations
- **Backend:** GDAL/OGR for batch processing

**Supported CRS:**
- EPSG:4326 (WGS84 - primary)
- EPSG:3857 (Web Mercator - for tile rendering)
- EPSG:32600-32660 (UTM zones - engineering coords)

**API Endpoint:**

```
POST /api/v1/transform-coordinates
{
  "sourceCRS": "EPSG:32633", // UTM Zone 33N
  "targetCRS": "EPSG:4326",  // WGS84
  "coordinates": [
    [294409.2, 4640341.8, 50.0] // [easting, northing, elevation]
  ]
}

Response:
{
  "transformedCoordinates": [
    [12.492345, 41.890221, 50.0] // [lon, lat, elevation]
  ]
}
```

#### Quality Assurance

**Automated Checks on Upload:**

1. **Schema Validation:** IFC file conforms to buildingSMART spec
2. **Geometry Validation:** No self-intersecting surfaces, closed volumes
3. **Georeferencing Validation:** Coordinates within plausible range
4. **Metadata Completeness:** Required attributes present (IfcProject.Name, IfcSite.Name)
5. **Performance Check:** Estimate rendering cost (warn if >500k triangles)

**Rejection Criteria:**

- Malformed IFC (fails schema validation)
- Missing IfcProject or IfcSite
- Coordinates outside Earth bounds
- File size >200 MB (community tier)
- Known malware signature

**Warnings (allow upload but flag):**

- IFC2x3 instead of IFC4
- High triangle count (performance impact)
- Missing textures referenced in IFC
- Duplicate building at same location

---

## Architecture Principles

### 3.1 Clean Architecture

**Mandate:** Enforce strict separation of concerns.

**Layer Structure:**

1. **Presentation Layer:** React components, CesiumJS views
2. **Application Layer:** Use cases, business logic, API controllers
3. **Domain Layer:** IFC entities, geospatial models, validation rules
4. **Infrastructure Layer:** Database, file storage, external APIs

**Rules:**

- Outer layers depend on inner layers (never reverse)
- Domain layer has zero external dependencies
- Infrastructure details are injected, not hard-coded

### 3.2 API Design

**Mandate:** APIs are contracts that must be versioned and documented.

- **OpenAPI 3.0+:** Every endpoint must have a schema definition
- **Versioning:** URL-based versioning (`/api/v1/`, `/api/v2/`)
- **RESTful Conventions:** Use standard HTTP methods (GET, POST, PUT, DELETE)
- **Pagination:** Cursor-based pagination for large result sets
- **Rate Limiting:** Protect public endpoints (e.g., 100 req/min per IP)

### 3.3 Progressive Web App

**Mandate:** Deliver a native-like experience on all devices.

- **Mobile-First Design:** Optimize for touch interactions and small screens
- **Offline Support:** Cache critical assets and enable basic functionality offline
- **Installability:** Web App Manifest with theme colors and icons
- **Responsive:** Single codebase for desktop, tablet, and mobile

### 3.4 3D Performance Optimization

**Mandate:** Efficiently render large-scale 3D models.

- **3D Tiles:** Convert IFC models to Cesium 3D Tiles format
- **Level of Detail (LOD):** Adaptive detail based on camera distance
- **Frustum Culling:** Only render visible geometry
- **Texture Compression:** Use KTX2/Basis Universal for GPU compression

---

## Quality Standards

### 4.1 Testing Requirements

**Mandatory Coverage:**

- **Unit Tests:** 85% coverage for business logic and IFC parsing
- **Integration Tests:** All API endpoints with mock database
- **E2E Tests:** Critical user flows (upload IFC, view on map, export data)
- **Performance Tests:** Lighthouse CI on every PR
- **Visual Regression:** Chromatic or Percy for UI changes

**Tools:**

- Jest for unit/integration tests
- Playwright for E2E tests
- React Testing Library for component tests

### 4.2 Code Review Process

**Requirements:**

1. All code changes require a PR (no direct commits to `main`)
2. At least 1 maintainer approval required
3. All CI checks must pass (tests, linting, type checking)
4. PRs open >48 hours without activity are flagged for review

**Maintainer Responsibilities:**

- Review within 48 hours
- Provide constructive, actionable feedback
- Approve only if code meets quality standards

### 4.3 Security Standards

**Mandatory Practices:**

- **Secrets Scanning:** GitHub secret scanning enabled
- **Dependency Audits:** Weekly `npm audit` / `pip-audit` reports
- **Penetration Testing:** Annual third-party security audit (community-funded)
- **Bug Bounty:** Responsible disclosure policy with acknowledgment

### 4.4 Accessibility & Internationalization

**Mandate:** IFC-OpenWorld must be usable by everyone, regardless of ability or language.

#### WCAG 2.1 AA Compliance

**Required Standards:**

- **Perceivable:**
  - Alt text for all 3D model thumbnails
  - Closed captions for tutorial videos
  - Color contrast ratio ≥4.5:1 for text, ≥3:1 for UI components
  - No information conveyed by color alone (use icons + text)

- **Operable:**
  - Full keyboard navigation (Tab, Enter, Space, Arrow keys)
  - No keyboard traps (can exit all modals/dialogs)
  - Focus indicators visible (2px outline, accent color)
  - Skip to main content link for screen readers

- **Understandable:**
  - Clear error messages with recovery suggestions
  - Consistent navigation across pages
  - Form labels explicitly associated with inputs

- **Robust:**
  - Semantic HTML5 (nav, main, article, aside)
  - ARIA labels for custom 3D controls (e.g., "Rotate camera left")
  - Valid HTML (W3C validator passes)

**Testing Tools:**

- **Automated:** axe DevTools, Lighthouse accessibility audit (score ≥90)
- **Manual:** NVDA/JAWS screen reader testing (monthly)
- **User Testing:** Community members with disabilities (quarterly feedback)

#### Keyboard Navigation in 3D Viewer

**Cesium Camera Controls:**

| Key                  | Action                          |
|----------------------|---------------------------------|
| Arrow keys           | Pan camera (N/S/E/W)           |
| Shift + Arrow keys   | Rotate camera                  |
| + / -                | Zoom in/out                    |
| Home                 | Reset to default view          |
| Tab                  | Cycle through buildings        |
| Enter                | Select focused building        |
| Esc                  | Close info panel               |

**Announcement for Screen Readers:**

```html
<div aria-live="polite" aria-atomic="true" class="sr-only">
  Camera moved to Building: City Hall.
  Coordinates: 41.89°N, 12.49°E.
  Press Enter to view details.
</div>
```

#### Color & Contrast

**Theme Support:**

- **Light Mode (Default):**
  - Background: #FFFFFF
  - Text: #212121 (contrast 16:1)
  - Primary: #1976D2 (blue, WCAG AA compliant)

- **Dark Mode:**
  - Background: #121212
  - Text: #E0E0E0 (contrast 14:1)
  - Primary: #90CAF9 (lighter blue for dark bg)

- **High Contrast Mode:**
  - Forced colors for Windows High Contrast
  - Test with `@media (prefers-contrast: high)`

**Colorblind-Friendly Palette:**

- Avoid red-green combinations
- Use patterns + colors (e.g., striped vs solid)
- Test with Coblis colorblind simulator

#### Internationalization (i18n)

**Supported Languages (Priority Order):**

1. **English (en)** - Default, 100% coverage
2. **Italian (it)** - Native support (project origin)
3. **Spanish (es)** - 2nd most spoken language
4. **French (fr)** - Major BIM market
5. **German (de)** - Engineering community
6. **Chinese (zh)** - Growing BIM adoption

**Future (Community-Driven):**

- Portuguese (pt-BR)
- Japanese (ja)
- Arabic (ar) - Requires RTL support
- Russian (ru)

**Implementation:**

- **Library:** i18next (React integration)
- **File Structure:**
  ```
  locales/
    en/
      common.json
      errors.json
      ifc-terms.json
    it/
      common.json
      ...
  ```
- **Dynamic Loading:** Load only active language (reduce bundle size)
- **Fallback Chain:** it → en → key name

**Translation Keys:**

```json
{
  "upload.button": "Upload IFC Model",
  "upload.error.invalidFormat": "Invalid file format. Only .ifc files are supported.",
  "viewer.controls.rotate": "Rotate camera",
  "ifc.entity.IfcWall": "Wall",
  "ifc.entity.IfcSlab": "Slab"
}
```

**RTL (Right-to-Left) Support:**

For Arabic/Hebrew:

- Flip layout direction: `<html dir="rtl">`
- Mirror UI components (sidebar on right)
- Keep 3D viewer controls consistent (camera left/right = west/east, not RTL-sensitive)

**Crowdsourced Translations:**

- Platform: Crowdin or Lokalise
- Community contributors earn badges
- Maintainers approve translations before merge
- Minimum 80% completion before enabling language

#### Geospatial Localization

**Coordinate Display Formats:**

Allow user to choose preferred format:

- **Decimal Degrees (DD):** 41.890221, 12.492345
- **Degrees Minutes Seconds (DMS):** 41°53'24.8"N, 12°29'32.4"E
- **Military Grid Reference System (MGRS):** 33TTG 94 40
- **Plus Codes (Open Location Code):** 8FRHVFRR+2V

**Unit System:**

- **Metric (Default):** Meters, square meters, cubic meters
- **Imperial (Optional):** Feet, square feet, cubic feet
- Toggle in user settings

**Date/Time Formats:**

- **Locale-Aware:** `new Intl.DateTimeFormat(userLocale).format(date)`
- Examples:
  - en-US: 10/23/2025, 2:30 PM
  - it-IT: 23/10/2025, 14:30
  - ISO 8601 in API responses: `2025-10-23T14:30:00Z`

#### Compliance Monitoring

**CI/CD Checks:**

- ESLint plugin: `eslint-plugin-jsx-a11y` (error on violations)
- Lighthouse CI: Accessibility score ≥90 (blocks merge)
- i18next scanner: Detect missing translation keys

**Manual Audits:**

- Quarterly WCAG audit by accessibility consultant
- Annual report published in `docs/accessibility-audit-YYYY.md`

---

## Governance Model

### 5.1 RFC Process

**For Breaking Changes:**

1. Create RFC issue with `[RFC]` prefix
2. Describe problem, proposed solution, alternatives considered
3. Minimum 14-day comment period
4. Core maintainers vote (simple majority required)
5. Decision documented in `docs/rfcs/` directory

**Examples of Breaking Changes:**

- Changing API response formats
- Removing support for IFC4 in favor of IFC4x3
- Migrating from CesiumJS to another 3D engine

### 5.2 Feature Prioritization

**Community-Driven:**

1. Features proposed via GitHub Issues
2. Community votes using 👍 reactions (1 vote = 1 👍)
3. Quarterly roadmap published based on votes + maintainer priorities
4. Maintainers have veto power for features conflicting with constitution

### 5.3 Decision-Making Transparency

**Principles:**

- All architectural decisions documented as ADRs (Architecture Decision Records)
- Public issue tracking for bugs, features, and technical debt
- Maintainer meetings summarized in GitHub Discussions
- No private channels for technical decisions (Slack/Discord for community only)

### 5.4 Maintainer Roles

**Core Maintainers:**

- Final authority on technical decisions
- Merge rights to `main` branch
- Appointed via community nomination + majority vote

**Contributors:**

- Anyone submitting PRs
- No special permissions required
- Path to maintainer role through sustained contribution

### 5.5 Sustainability & Financial Model

**Mandate:** IFC-OpenWorld must be financially sustainable without compromising open source values.

#### Data Retention Policy

**Active Accounts:**

- **IFC Models:** Stored indefinitely while account is active
- **3D Tiles:** Regenerate on demand if deleted for space
- **User Data:** Retained per GDPR (right to access, export, delete)

**Inactive Accounts:**

- **Definition:** No login for 24 months
- **Warning Email:** Sent at 18 months, 22 months, 23 months
- **Grace Period:** 30 days after account marked inactive
- **Deletion:** User data deleted, IFC models transferred to "Community Archive" (if CC0) or deleted (if CC-BY with no response)

**Deleted Accounts:**

- **Immediate:** Mark account as deleted, disable login
- **30 Days:** Soft delete (data flagged, not removed)
- **After 30 Days:** Hard delete from database, remove from backups
- **Exception:** Preserve public IFC models if license permits (re-attribute to "Anonymous Contributor")

#### Backup Strategy

**Frequency:**

- **Daily:** Incremental backups (changed data only)
- **Weekly:** Full database dump (pg_dump)
- **Monthly:** Long-term archive (AWS Glacier, 7-year retention for legal compliance)

**Geo-Redundancy:**

- **Primary Region:** EU-Central (Frankfurt) for GDPR compliance
- **Secondary Region:** US-East (Virginia) for disaster recovery
- **Replication:** Asynchronous PostgreSQL streaming replication

**Recovery Time Objective (RTO):**

- **Critical Failure:** Service restored within 4 hours
- **Data Loss:** RPO (Recovery Point Objective) = 1 hour (via WAL archives)

**Testing:**

- Quarterly disaster recovery drill (restore from backup to staging environment)

#### Infrastructure Costs (Estimated)

**Self-Hosted Option (Small Scale):**

- **Hardware:** Dell PowerEdge R450 or equivalent
  - 32GB RAM, 500GB SSD, 4TB HDD
  - €2,500 one-time cost
- **Bandwidth:** 10TB/month (avg for 500 active users)
- **Electricity:** ~100W continuous = €70/month
- **Total Monthly:** €70-140 (electricity + internet)

**Cloud-Hosted Option (Production Scale):**

| Service              | Provider       | Monthly Cost (EUR) |
|----------------------|----------------|--------------------|
| Compute (Node.js API) | AWS EC2 t3.large (2vCPU, 8GB) | €60 |
| Compute (IFC Processor) | AWS EC2 t3.medium x2 (autoscale) | €80 |
| Database (PostgreSQL) | AWS RDS db.t3.large (PostGIS) | €140 |
| Object Storage (S3) | AWS S3 (1TB + requests) | €30 |
| CDN (CloudFront) | AWS (10TB traffic) | €70 |
| Monitoring (Grafana Cloud) | Grafana | €20 |
| **Total** | | **€400/month** |

**Scaling to 10,000 Users:**

- Double compute instances: €280 → €560
- Increase database size: €140 → €300
- CDN traffic (100TB): €70 → €600
- **Estimated Total:** €1,200/month

#### Funding Model

**Core Principle:** No paywalls for essential features. Optional paid services for convenience.

**Free Tier (Community):**

- Unlimited IFC uploads (max 200 MB/file)
- Unlimited public models
- 3D Tiles conversion (best-effort processing, may take hours)
- Community support (GitHub Discussions)

**Optional Pro Tier (€5/month per individual user):**

- **Priority Processing:** IFC → 3D Tiles in <15 minutes (SLA-backed)
- **Private Models:** Host models not visible to public (max 10GB storage)
- **Advanced Analytics:** Download statistics, viewer heatmaps
- **API Access:** 10,000 requests/month (vs 1,000 for free tier)
- **Support:** Email support with 48-hour response time

**Enterprise Tier (€500/month per organization):**

- **White-Label Deployment:** Custom domain (e.g., bim.company.com)
- **SSO Integration:** SAML/OAuth for corporate identity providers
- **Dedicated Compute:** Isolated infrastructure (no resource sharing)
- **SLA:** 99.9% uptime guarantee, 24/7 phone support
- **Training:** Quarterly webinars for employees

**Funding Sources (Ranked by Priority):**

1. **Open Collective:** Transparent crowdfunding (one-time + recurring donations)
2. **GitHub Sponsors:** Direct support to maintainers
3. **Pro/Enterprise Subscriptions:** Reinvested into infrastructure
4. **Grants:** EU Horizon Europe, Open Technology Fund, Sovereign Tech Fund
5. **Consulting:** Paid custom features for enterprises (must be open-sourced)

**Prohibited Revenue Streams:**

- Selling user data to third parties
- Display advertising (banner ads, Google AdSense)
- Paywalling core IFC viewer functionality
- Exclusive features that violate open source principles
- Charging for bug fixes (security patches always free)

#### Financial Transparency

**Quarterly Reports (Published on GitHub):**

- **Income Breakdown:** Donations, subscriptions, grants
- **Expense Breakdown:** Infrastructure, development, legal fees
- **Reserves:** Minimum 6-month runway in emergency fund
- **Allocation:** % spent on development vs operations vs community

**Example Report:**

```markdown
## Q4 2025 Financial Report

**Income:**
- Open Collective donations: €3,200
- GitHub Sponsors: €1,800
- Pro subscriptions (120 users): €600
- Enterprise subscriptions (2 orgs): €1,000
- **Total:** €6,600

**Expenses:**
- AWS infrastructure: €1,200
- Domain/SSL: €50
- Developer stipends (2 part-time): €3,000
- Legal (CLA review): €200
- **Total:** €4,450

**Net:** +€2,150 (added to reserve fund)
**Reserve Fund Balance:** €18,500 (8.3 months runway)
```

#### Community Ownership

**Long-Term Vision:**

- Transition to a **nonprofit foundation** (e.g., "IFC-OpenWorld Foundation")
- Governed by elected board (maintainers + community representatives)
- Financial decisions require board vote (simple majority)

**Exit Strategy (If Project Ends):**

1. Archive all code, data, documentation to Zenodo (DOI-assigned, permanent)
2. Transfer domain to Internet Archive
3. Distribute remaining funds to similar open source projects (community vote)
4. Publish final report explaining closure reasons

#### Environmental Sustainability

**Carbon Footprint:**

- Measure cloud infrastructure emissions (AWS Customer Carbon Footprint Tool)
- Target: Carbon-neutral by 2027 (via renewable energy credits or offsets)

**Data Center Selection:**

- Prefer regions with renewable energy (e.g., AWS Frankfurt uses 100% renewable electricity)

**Optimization:**

- Compress 3D Tiles to reduce bandwidth (KTX2 = 50% size reduction)
- Delete orphaned files to save storage
- Auto-scale compute during off-peak hours

---

## Amendment Process

### 6.1 Changing the Constitution

**Requirements:**

- Proposed amendment via RFC with `[CONSTITUTIONAL AMENDMENT]` tag
- Minimum 30-day comment period
- Supermajority vote: 2/3 of core maintainers + 2/3 of community votes (weighted by contribution history)
- Ratified amendments become effective immediately

**Immutable Clauses:**

The following principles cannot be amended without forking the project:

1. Open source license (must remain MIT or more permissive)
2. Open standards requirement (IFC, WGS84, OpenStreetMap)
3. Public repository requirement (must remain public)

### 6.2 Version History

| Version | Date       | Changes                                                    |
|---------|------------|------------------------------------------------------------|
| 1.0     | 2025-10-23 | Initial constitution ratified                              |
| 1.1     | 2025-10-23 | Added IFC standards, data licensing, accessibility, costs  |

---

## Signatures

**Ratified by:**

- [Maintainer signatures will be collected via GitHub commit signatures]

**Community Endorsement:**

- [Link to RFC issue with community votes]

---

## Appendix: Key Resources

- **IFC Specifications:** https://www.buildingsmart.org/standards/bsi-standards/industry-foundation-classes/
- **WGS84 Reference:** https://epsg.io/4326
- **OpenStreetMap:** https://www.openstreetmap.org/
- **CesiumJS Docs:** https://cesium.com/docs/
- **web-ifc GitHub:** https://github.com/IFCjs/web-ifc
- **IfcOpenShell Docs:** http://ifcopenshell.org/docs

---

**End of Constitution**

*"In code we trust, through openness we thrive."*
