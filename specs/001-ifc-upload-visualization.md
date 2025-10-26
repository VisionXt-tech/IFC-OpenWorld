# Feature Specification: IFC Upload and Basic 3D Visualization

**Feature ID**: `SPEC-001`
**Feature Branch**: `001-ifc-upload-visualization`
**Created**: 2025-10-23
**Status**: APPROVED - READY FOR IMPLEMENTATION (POC Validated 2025-10-24)
**Priority**: P0 (Core MVP Feature)
**Constitution References**: §1.2, §1.7, §2.2, §2.7, §4.4
**POC Validation**: ✅ 4/4 POC PASS - Stack tecnologico validato ([Dettagli](../poc/POC-SUMMARY-FINAL.md))

---

## Executive Summary

This specification defines the **minimum viable product (MVP)** for IFC-OpenWorld: enabling users to upload IFC building models and visualize them on a 3D geospatial globe. This feature is the foundation upon which all other platform capabilities will be built.

**Core Value Proposition**: Transform isolated BIM files into a globally accessible, georeferenced digital twin ecosystem.

**Success Definition**: An architect in Rome can upload an IFC4 file of a hospital, and a viewer in Tokyo can see it positioned on a 3D globe and explore its geometry—all within 30 seconds.

---

## User Scenarios & Testing

### User Story 1 - Upload IFC File with Validation Feedback (Priority: P1)

**As an architect**, I want to upload an IFC4 file from my computer **so that** I can share my building model with the global community and contribute to an open digital twin of the world.

**Why this priority**: Without this capability, the platform cannot exist. This is the primary entry point for all content and must be bulletproof.

**Independent Test**: Can be fully tested by:
1. Accessing upload UI
2. Selecting a valid IFC4 file
3. Receiving success confirmation
4. Verifying database record created

This delivers immediate value: content enters the system.

**Acceptance Scenarios**:

1. **Given** user is on the homepage with no authentication
   **When** user drags-and-drops a valid IFC4 file (50MB) onto the upload zone
   **Then** system displays progress bar, completes upload in <10 seconds, shows success message with building name extracted from IfcProject

2. **Given** user selects an IFC2x3 file (legacy schema)
   **When** upload completes
   **Then** system shows warning "IFC2x3 detected. Auto-converting to IFC4. Some features may differ." and proceeds with conversion

3. **Given** user uploads a 150MB IFC file (exceeds 100MB limit)
   **When** file validation runs
   **Then** system rejects upload immediately with error "File too large (150MB). Maximum 100MB. Consider splitting model or upgrading to Pro tier (200MB limit)."

4. **Given** user uploads a .rvt file (Revit proprietary format)
   **When** file type detection runs
   **Then** system rejects with error "Unsupported format (.rvt). Please export to IFC4 from Revit: File → Export → IFC."

5. **Given** upload is in progress (40% complete)
   **When** user clicks "Cancel" button
   **Then** system aborts upload, removes partial file from S3, shows "Upload cancelled" message

---

### User Story 2 - See Building Positioned on Globe (Priority: P1)

**As a user**, I want uploaded buildings to automatically appear on a 3D globe map at their real-world location **so that** I can discover models in my city or explore infrastructure worldwide.

**Why this priority**: Geospatial visualization is the **unique selling point** of IFC-OpenWorld vs. traditional BIM viewers. This differentiates us from competitors.

**Independent Test**: Can be tested by:
1. Uploading IFC with valid IfcSite coordinates
2. Navigating to Cesium globe view
3. Verifying building marker appears at correct lat/lon
4. Measuring position accuracy (should be within ±10 meters)

Delivers value: Discovery mechanism, spatial context.

**Acceptance Scenarios**:

1. **Given** IFC file contains IfcSite with coordinates (41.890221°N, 12.492345°E, elevation 50m)
   **When** upload completes successfully
   **Then** system displays building marker (blue pin icon) on Cesium globe at Rome, Italy, and marker tooltip shows "Hospital Building - Uploaded 2 minutes ago"

2. **Given** uploaded building is in user's current location (detected via browser geolocation)
   **When** globe initializes
   **Then** camera automatically flies to user's location and highlights nearby buildings (within 5km radius)

3. **Given** 50 buildings exist in Manhattan area
   **When** user zooms out to view entire New York City
   **Then** system clusters nearby markers (shows "15 buildings" badge) and expands cluster on zoom-in for performance

4. **Given** IFC file has NO IfcSite or missing RefLatitude/RefLongitude
   **When** validation completes
   **Then** system marks upload status as "pending_geolocation", sends email with link to "Position your building" UI, and archives model after 30 days if not georeferenced

5. **Given** building coordinates are (200°N, 400°E) - invalid values
   **When** validation runs
   **Then** system rejects upload with error "Invalid coordinates. Latitude must be -90 to +90, Longitude -180 to +180. Found: 200, 400."

---

### User Story 3 - Click to Load 3D Geometry (Priority: P2)

**As a viewer**, I want to click on a building marker and see its detailed 3D geometry loaded in the Cesium viewer **so that** I can explore the architectural design and spatial relationships.

**Why this priority**: This completes the user journey (upload → discover → explore). Without this, buildings are just dots on a map—no value beyond a static map service.

**Independent Test**: Can be tested by:
1. Clicking on any existing building marker
2. Verifying 3D geometry loads within 3 seconds
3. Testing camera controls (orbit, pan, zoom)
4. Confirming attribution panel displays

Delivers value: Actual BIM data visualization, the core promise.

**Acceptance Scenarios**:

1. **Given** user clicks on a building marker for "City Hall" (10MB IFC file)
   **When** 3D loading begins
   **Then** system shows loading spinner, parses IFC in Web Worker (non-blocking), displays geometry in <3 seconds, and enables camera orbit controls

2. **Given** 3D model is fully loaded
   **When** user presses arrow keys (←↑↓→)
   **Then** camera pans in corresponding direction (WCAG 2.1 AA keyboard navigation requirement per Constitution §4.4)

3. **Given** user hovers mouse over a wall element in 3D view
   **When** raycast detects intersection
   **Then** system highlights wall in yellow and shows tooltip "IfcWall: Concrete 300mm"

4. **Given** IFC file has 500,000 triangles (high complexity)
   **When** geometry loads
   **Then** system displays at reduced LOD (Level of Detail) if FPS drops below 30, and shows banner "High-poly model detected. Performance may be affected." (Note: Pro tier 3D Tiles optimization is out-of-scope for MVP per Section 7)

5. **Given** user clicks "View in Fullscreen" button
   **When** 3D viewer expands
   **Then** Cesium canvas resizes to fill viewport, maintains 60fps performance, and shows "Press ESC to exit fullscreen" hint

---

### User Story 4 - View Attribution and Metadata (Priority: P3)

**As a contributor**, I want clear attribution displayed when someone views my uploaded model **so that** I receive recognition for my work and comply with CC-BY 4.0 license requirements.

**Why this priority**: Legal compliance (Constitution §1.7). Without attribution, we violate Creative Commons terms and risk DMCA issues. However, feature is functional without UI polish in early MVP.

**Independent Test**: Can be tested by:
1. Uploading IFC as "@johndoe"
2. Clicking building marker
3. Verifying info panel shows contributor name
4. Checking exported IFC includes updated metadata

Delivers value: Community trust, legal protection.

**Acceptance Scenarios**:

1. **Given** user clicks on building "Example Hospital"
   **When** info panel opens
   **Then** panel displays:
   ```
   Building Name: Example Hospital
   Contributed by: @johndoe (2025-10-15)
   License: CC-BY 4.0 (Learn more)
   Source IFC: [Download Button] [View Details]
   ```

2. **Given** user clicks "Download" button
   **When** IFC export is generated
   **Then** file includes updated IfcOwnerHistory with:
   - IfcApplication: "IFC-OpenWorld Platform v1.0"
   - IfcPerson: "@johndoe"
   - IfcOrganization: "IFC-OpenWorld Community"
   - And sidecar `metadata.json` with CC-BY 4.0 license URL

3. **Given** uploader selected "CC0 (Public Domain)" license during upload
   **When** info panel displays
   **Then** license badge shows "CC0 1.0" instead of CC-BY 4.0, and "No attribution required" hint

4. **Given** user clicks "Report inappropriate content" link
   **When** report form opens
   **Then** form has categories: Copyright (DMCA), Privacy violation, Security risk, Quality issue, and creates GitHub issue with tag `content/[category]`

---

### Edge Cases

#### File Validation Edge Cases

1. **What happens when IFC file is valid but contains zero geometry?**
   - System accepts upload, displays marker on globe, but shows warning in info panel: "This model has no 3D geometry (0 IfcBuildingElements). Only metadata is available."

2. **What happens when IFC has multiple IfcSite entities with different coordinates?**
   - System uses the **first** IfcSite with valid coordinates, logs warning: "Multiple sites detected. Using: Site-001 (41.89°N, 12.49°E). Other sites ignored."

3. **What happens when RefLatitude/RefLongitude are in degrees-minutes-seconds format vs decimal?**
   - System detects format: `(41, 53, 24, 123456)` → converts to `41.890034°` automatically. Validates precision to 6 decimal places per Constitution §2.7.

4. **What happens when IFC has valid coordinates but building is in Antarctica (-80°S)?**
   - System accepts upload (valid lat/lon range) but warns: "Extreme location detected. Verify coordinates. Building will be hard to find due to low population."

#### Performance Edge Cases

5. **What happens when 1000 buildings are clustered in Manhattan?**
   - Cesium uses **spatial indexing**: Only render buildings in camera frustum. Cluster markers when >20 buildings in 1km² area. Performance target: 60fps maintained.

6. **What happens when user uploads IFC during peak traffic (1000 concurrent uploads)?**
   - S3 presigned URL approach ensures **direct client-to-S3 upload** (no server bandwidth). Backend queue processes validation jobs asynchronously via Celery + Redis. Max queue depth: 5000 jobs.

#### Accessibility Edge Cases

7. **What happens when screen reader user navigates building markers?**
   - Each marker has ARIA label: `aria-label="Building: City Hall. Location: Rome, Italy. Uploaded 3 days ago. Press Enter to load 3D view."`. Tab key cycles through markers.

8. **What happens when user has reduced motion preference enabled (`prefers-reduced-motion`)?**
   - Disable camera fly-to animations. Use instant camera jumps instead. No auto-rotating models.

#### Security Edge Cases

9. **What happens when IFC contains malicious embedded scripts (XSS attack)?**
   - IFC parsing uses **IfcOpenShell** (C++ library), which does NOT execute scripts. Web-ifc is WebAssembly—sandboxed. No eval() or innerHTML used in frontend.

10. **What happens when uploaded IFC is actually a renamed malware.exe?**
    - ClamAV virus scan runs on upload. File quarantined if signature detected. User receives error: "Security scan failed. File rejected." Admin notified via Sentry alert.

---

## Requirements

### Functional Requirements

#### Upload & Validation

- **FR-001**: System MUST accept IFC files with extensions `.ifc` (text format) and `.ifczip` (compressed) via drag-and-drop or file picker
- **FR-002**: System MUST enforce maximum file size of **100MB** for Community tier (Constitution reference: §5.5 Free Tier)
- **FR-003**: System MUST validate IFC schema version during upload: Accept IFC4 (ISO 16739:2013), IFC4x3 (ISO 16739-1:2024), auto-convert IFC2x3 with warning
- **FR-004**: System MUST extract `IfcSite.RefLatitude` and `IfcSite.RefLongitude` using IfcOpenShell Python microservice (Constitution §2.2)
- **FR-005**: System MUST validate coordinates are within Earth bounds: Latitude -90° to +90°, Longitude -180° to +180°, Elevation -500m to +9000m (Constitution §2.7)
- **FR-006**: System MUST reject files if:
  - File size exceeds tier limit
  - File is not valid IFC (fails buildingSMART schema validation)
  - Malware detected by ClamAV scan
  - Missing mandatory entities: IfcProject AND (IfcSite OR user provides coordinates manually)

#### Storage & Database

- **FR-007**: System MUST store uploaded IFC files in **S3-compatible object storage** in bucket `ifc-raw/` with naming convention: `{uuid}/{original-filename}.ifc` (Constitution §2.2)
- **FR-008**: System MUST create database record in PostgreSQL with PostGIS extension containing:
  - `id` (UUID primary key)
  - `filename` (VARCHAR 255)
  - `filesize_bytes` (BIGINT)
  - `ifc_schema` (ENUM: IFC2x3, IFC4, IFC4x3)
  - `location` (GEOGRAPHY(POINT, 4326) - WGS84)
  - `elevation_meters` (NUMERIC 10,2)
  - `contributor_name` (VARCHAR 100, defaults to "Anonymous")
  - `license` (ENUM: CC-BY-4.0, CC0, defaults to CC-BY-4.0)
  - `upload_status` (ENUM: pending, processing, completed, failed, pending_geolocation)
  - `created_at`, `updated_at` (TIMESTAMP)

- **FR-009**: System MUST index location column using **GiST (Generalized Search Tree)** for spatial queries: `CREATE INDEX idx_buildings_location ON buildings USING GIST(location);`

#### 3D Visualization

- **FR-010**: System MUST display building markers on **CesiumJS globe** using WGS84 coordinates (EPSG:4326) with blue pin icon (Constitution §2.1)
- **FR-011**: System MUST cluster markers when >20 buildings exist within 1km² viewport area to maintain 60fps performance (Constitution §1.2)
- **FR-012**: ~~System MUST parse IFC geometry using web-ifc (WebAssembly) in a Web Worker~~ **REVISED (2025-10-26)**: System MUST parse IFC geometry **server-side** using **IfcOpenShell** (Python) and convert to 3D Tiles format for streaming ([Architecture Decision](../poc/POC-2-cesium-viewer/T119-RESULTS.md))
- **FR-013**: System MUST stream pre-generated **3D Tiles** to CesiumJS viewer for rendering (no client-side IFC parsing due to Vite/WASM incompatibility)
- **FR-014**: System MUST load 3D geometry within **3 seconds** for files <50MB (Success Criteria SC-002) - Server-side conversion + streaming
- **FR-015**: System MUST display loading spinner with progress percentage during IFC parsing: "Loading geometry... 45%"

#### Attribution & Metadata

- **FR-016**: System MUST display info panel when building marker clicked, showing:
  - Building name (from IfcBuilding.Name or IfcProject.Name)
  - Contributor username (default "Anonymous" if not authenticated)
  - Upload date (human-readable: "3 days ago")
  - License badge (CC-BY 4.0 or CC0)
  - Download button (exports IFC with updated IfcOwnerHistory)

- **FR-017**: System MUST inject attribution metadata into exported IFC files per Constitution §1.7:
  ```ifc
  #1=IFCPERSON($,'ContributorLastName','ContributorFirstName',$,$,$,$,$);
  #2=IFCORGANIZATION($,'IFC-OpenWorld Community',$,$,$);
  #3=IFCPERSONANDORGANIZATION(#1,#2,$);
  #4=IFCAPPLICATION(#2,'1.0','IFC-OpenWorld Platform','IFC-OW');
  #5=IFCOWNERHISTORY(#3,#4,$,.ADDED.,$,$,$,{unix_timestamp});
  ```

- **FR-018**: System MUST generate sidecar `metadata.json` file with license info:
  ```json
  {
    "contributor": "johndoe",
    "uploadDate": "2025-10-15T14:30:00Z",
    "license": "CC-BY-4.0",
    "licenseURL": "https://creativecommons.org/licenses/by/4.0/",
    "sourceURL": "https://ifc-openworld.org/buildings/abc123",
    "attribution": "This model was contributed by @johndoe via IFC-OpenWorld (CC-BY 4.0)"
  }
  ```

#### Accessibility (WCAG 2.1 AA Compliance)

- **FR-019**: System MUST support **keyboard navigation** for building selection (Constitution §4.4):
  - `Tab`: Cycle through building markers
  - `Enter`: Load selected building's 3D view
  - `Arrow keys`: Pan camera (N/S/E/W)
  - `+/-`: Zoom in/out
  - `Esc`: Close info panel or exit fullscreen

- **FR-020**: System MUST provide ARIA labels for screen readers:
  - Building markers: `aria-label="Building: {name}. Location: {city}, {country}. Uploaded {relative_time}. Press Enter to view."`
  - Upload button: `aria-label="Upload IFC file. Drag and drop or click to select file."`

- **FR-021**: System MUST maintain **minimum color contrast ratio of 4.5:1** for all text (Constitution §4.4 WCAG AA):
  - Light mode: `#212121` text on `#FFFFFF` background (16:1 ratio)
  - Dark mode: `#E0E0E0` text on `#121212` background (14:1 ratio)

### Non-Functional Requirements

#### Performance (Constitution §1.2)

- **NFR-001**: **First Contentful Paint (FCP)** MUST be <1.5 seconds on 3G connection (simulated 400Kbps, 400ms latency)
- **NFR-002**: Cesium globe MUST maintain **60fps** during camera movements and building marker rendering
- **NFR-003**: IFC parsing MUST occur in **Web Worker** (separate thread) to prevent UI freezing
- **NFR-004**: S3 upload MUST use **presigned URLs** (direct client-to-S3) to avoid server bandwidth bottleneck
- **NFR-005**: Database queries MUST execute in <100ms for single building lookup, <500ms for spatial queries within 10km radius

#### Security (Constitution §1.3)

- **NFR-006**: All API endpoints MUST use **HTTPS** (no HTTP fallback) with TLS 1.3
- **NFR-007**: File uploads MUST be scanned with **ClamAV** antivirus before storage
- **NFR-008**: IFC parsing MUST be sandboxed in isolated Docker container (IfcOpenShell Python service only - client-side parsing removed per T119 decision)
- **NFR-009**: Database queries MUST use **parameterized statements** (zero tolerance for SQL injection per Constitution §1.3)

#### Scalability

- **NFR-010**: System MUST handle **1000 concurrent users** viewing globe without performance degradation (Constitution §1.2)
- **NFR-011**: Upload queue MUST support **5000 pending jobs** (Celery + Redis) with auto-scaling workers

#### Code Quality (Constitution §1.5)

- **NFR-012**: All code MUST use **TypeScript strict mode** (`"strict": true` in tsconfig.json)
- **NFR-013**: Unit tests MUST achieve **85% coverage** for:
  - IFC validation logic (`src/services/ifcValidator.ts`)
  - Coordinate parsing (`src/utils/coordinateParser.ts`)
  - Upload API endpoints (`src/api/upload.ts`)
- **NFR-014**: ESLint + Prettier MUST pass with **zero warnings** in production build
- **NFR-015**: All errors MUST be logged with structured JSON format including `correlationId` for tracing

### Key Entities

#### Building
- **Represents**: A single IFC building model uploaded to the platform
- **Attributes**:
  - `id`: Unique identifier (UUID)
  - `name`: Human-readable building name
  - `location`: WGS84 coordinates (lat, lon, elevation)
  - `ifcSchema`: Version (IFC2x3, IFC4, IFC4x3)
  - `s3Key`: Path to stored IFC file
  - `status`: Upload/processing state
  - `license`: CC-BY-4.0 or CC0
- **Relationships**:
  - Belongs to `Contributor` (1:N)
  - Has many `GeometryElements` (1:N, lazy-loaded)

#### Contributor
- **Represents**: User who uploaded building(s)
- **Attributes**:
  - `username`: Display name (defaults to "Anonymous")
  - `email`: Contact (optional, for notifications)
- **Relationships**:
  - Has many `Buildings` (1:N)
- **Note**: Full authentication system out of scope for MVP. Only capture username during upload.

#### GeometryElement
- **Represents**: Individual IFC element (wall, slab, window) for future filtering
- **Attributes**:
  - `ifcType`: Element class (IfcWall, IfcSlab, IfcWindow)
  - `globalId`: IFC GUID
- **Relationships**:
  - Belongs to `Building` (N:1)
- **Note**: Stored in database but not used in MVP. Enables future "Show only walls" filter.

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: **95% upload success rate** - Users can upload valid IFC4 files without errors (measured over 30-day period)

- **SC-002**: **3-second 3D load time** - 90th percentile load time for 50MB IFC file from click-to-render is <3 seconds (Lighthouse performance test)

- **SC-003**: **<1.5s First Contentful Paint** - Globe loads within 1.5 seconds on 3G connection per Constitution §1.2 (Lighthouse CI enforced)

- **SC-004**: **60fps globe navigation** - Cesium maintains 60fps when panning/zooming with 100 buildings visible (measured via Chrome DevTools Performance tab)

- **SC-005**: **WCAG 2.1 AA compliance** - Lighthouse accessibility audit score ≥90 (CI/CD enforced per Constitution §4.4)

- **SC-006**: **Zero SQL injections** - All Snyk/Dependabot security scans pass with no high-severity vulnerabilities (48-hour SLA per Constitution §1.3)

- **SC-007**: **30-second end-to-end user journey** - From landing page to seeing uploaded building on globe takes <30 seconds for 50MB file (user testing target)

### Business/Community Metrics

- **SC-008**: **100 buildings in 30 days** - Achieve 100 uploaded models within first month of public launch (adoption metric)

- **SC-009**: **10 active contributors** - At least 10 unique users upload models in first month (community engagement)

- **SC-010**: **Zero DMCA takedowns** - No copyright violations due to proper CC-BY 4.0 attribution display (legal compliance per Constitution §1.7)

---

## Technical Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React 18)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐   │
│  │ Upload UI    │  │ Cesium Globe │  │ 3D Viewer          │   │
│  │ (Drag-Drop)  │  │ (Markers)    │  │ (web-ifc + Three)  │   │
│  └──────────────┘  └──────────────┘  └────────────────────┘   │
│         │                  │                    │                │
│         └──────────────────┴────────────────────┘                │
│                            │ HTTPS                                │
└────────────────────────────┼────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (Node.js 20 + Express)                │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐   │
│  │ Upload API   │  │ Buildings API│  │ Auth Middleware    │   │
│  │ POST /upload │  │ GET /api/v1  │  │ (Future: OAuth)    │   │
│  └──────────────┘  └──────────────┘  └────────────────────┘   │
│         │                  │                    │                │
│         └──────────────────┴────────────────────┘                │
│                            │                                      │
│         ┌──────────────────┴──────────────────┐                 │
│         ▼                                      ▼                 │
│  ┌──────────────┐                      ┌────────────────────┐  │
│  │ PostgreSQL   │                      │ S3 Object Storage  │  │
│  │ + PostGIS    │                      │ (ifc-raw bucket)   │  │
│  └──────────────┘                      └────────────────────┘  │
│         │                                                        │
│         └────────────────┐                                      │
│                          ▼                                      │
│                   ┌──────────────┐                              │
│                   │ Redis Queue  │                              │
│                   │ (Celery)     │                              │
│                   └──────────────┘                              │
│                          │                                      │
└──────────────────────────┼──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│              IFC PROCESSING MICROSERVICE (Python FastAPI)        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ IfcOpenShell Worker                                       │  │
│  │ - Extract IfcSite coordinates                            │  │
│  │ - Validate schema (buildingSMART)                        │  │
│  │ - Parse geometry (future: glTF conversion)               │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow: Upload Journey

1. **Client**: User drags IFC file → React Upload component
2. **Client → Backend**: Request presigned S3 URL (`POST /api/v1/upload/request`)
3. **Backend → Client**: Returns presigned URL (15-minute expiry)
4. **Client → S3**: Direct upload to `ifc-raw/{uuid}/file.ifc`
5. **Client → Backend**: Notify upload complete (`POST /api/v1/upload/complete`)
6. **Backend**: Create database record with status `processing`
7. **Backend → Redis Queue**: Publish validation job
8. **Python Worker**: Consume job, run IfcOpenShell validation
9. **Python Worker**: Extract IfcSite coordinates, update database
10. **Backend → Client**: WebSocket notification "Processing complete"
11. **Client**: Poll for building status, refresh globe markers

### API Endpoints

#### Upload Flow

```
POST /api/v1/upload/request
Request:
{
  "filename": "hospital.ifc",
  "filesize": 52428800,  // 50MB in bytes
  "contentType": "application/x-step"
}

Response:
{
  "uploadId": "550e8400-e29b-41d4-a716-446655440000",
  "presignedUrl": "https://s3.amazonaws.com/ifc-raw/...",
  "expiresIn": 900  // 15 minutes
}
```

```
POST /api/v1/upload/complete
Request:
{
  "uploadId": "550e8400-e29b-41d4-a716-446655440000",
  "contributorName": "johndoe",  // Optional
  "license": "CC-BY-4.0"  // Default
}

Response:
{
  "buildingId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing",
  "estimatedTime": "2-3 minutes"
}
```

#### Buildings Query

```
GET /api/v1/buildings?bbox=12.4,41.8,12.5,41.9&limit=100

Response:
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [12.492345, 41.890221, 50]  // [lon, lat, elevation]
      },
      "properties": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Example Hospital",
        "contributor": "johndoe",
        "uploadDate": "2025-10-15T14:30:00Z",
        "license": "CC-BY-4.0",
        "ifcSchema": "IFC4"
      }
    }
  ]
}
```

---

## Out of Scope (Future Iterations)

The following features are **explicitly excluded** from this specification to maintain MVP focus:

### Authentication & User Management
- User registration/login system
- OAuth 2.0 integration
- User profiles with upload history
- **Rationale**: Allow anonymous uploads for MVP to reduce friction. Add auth in SPEC-002.

### Advanced 3D Features
- 3D Tiles conversion for LOD optimization (Constitution §2.7 - Pro tier feature)
- IFC property visualization (click wall → see thermal properties)
- Measurement tools (distance, area)
- **Rationale**: Basic geometry visualization sufficient for MVP. Add in SPEC-003.

### Search & Discovery
- Text search ("Find hospitals in Rome")
- Filters (by year built, building type, contributor)
- Saved searches
- **Rationale**: Works with small dataset (<100 buildings). Add when >500 buildings exist.

### Social Features
- Comments on buildings
- Likes/favorites
- Forking models (create derivative)
- **Rationale**: Community features require critical mass. Add in SPEC-005.

### Private Models
- Pro tier uploads (200MB limit)
- Private visibility toggle
- Organization workspaces
- **Rationale**: Monetization feature. Add after validating free tier adoption.

---

## Dependencies & Prerequisites

### External Dependencies

1. **Constitution v1.1** - Ratified and approved (defines technical constraints)
2. **AWS Account** - S3 bucket `ifc-openworld-ifc-raw` created with CORS configured
3. **PostgreSQL 15+** - Installed with PostGIS 3.3+ extension enabled
4. **Redis 7+** - Running for Celery job queue
5. **ClamAV** - Virus scanner installed and updated (daily signature refresh)

### Tech Stack Versions (per Constitution §2)

- **Frontend**:
  - React 18.2.0
  - CesiumJS 1.112.0 (3D globe + 3D Tiles rendering)
  - ~~web-ifc 0.0.53~~ **REMOVED** (incompatible with Vite 5.x - see T119)
  - ~~web-ifc-three 0.0.124~~ **REMOVED** (server-side 3D Tiles instead)
  - Vite 5.0.0 (build tool) - **Yarn required on Windows**

- **Backend**:
  - Node.js 20.10.0 LTS
  - Express 4.18.2 or Fastify 4.25.0
  - Prisma 5.7.0 (ORM)
  - PostgreSQL 15.5 + PostGIS 3.4.1
  - Redis 7.2.3

- **IFC Processing**:
  - Python 3.11.7
  - FastAPI 0.108.0
  - IfcOpenShell 0.7.0
  - Celery 5.3.4

### Infrastructure Setup

- **Docker Compose** configuration for local development:
  - PostgreSQL container with PostGIS
  - Redis container
  - Python FastAPI container (IfcOpenShell)
  - ClamAV daemon container

- **GitHub Actions CI/CD**:
  - Automated testing (Jest, Playwright)
  - Lighthouse performance checks (FCP <1.5s enforced)
  - ESLint + TypeScript strict mode validation
  - Snyk security scans

---

## Testing Strategy

### Unit Tests (85% Coverage Target)

**Files requiring tests**:

1. `src/utils/coordinateParser.ts` - Parse IFC degrees-minutes-seconds to decimal
2. `src/services/ifcValidator.ts` - Validate schema version, file size, coordinates
3. `src/api/upload.ts` - API endpoint logic (presigned URL generation, DB writes)
4. `src/utils/licenseHandler.ts` - Inject IfcOwnerHistory metadata

**Test Framework**: Jest 29.7.0

**Example Test**:
```typescript
describe('coordinateParser', () => {
  it('should convert DMS to decimal degrees', () => {
    const dms = [41, 53, 24, 123456]; // IFC format
    const decimal = parseDMSToDecimal(dms);
    expect(decimal).toBeCloseTo(41.890034, 6); // 6 decimal places
  });

  it('should reject coordinates outside Earth bounds', () => {
    expect(() => validateCoordinates(200, 100)).toThrow('Invalid latitude');
  });
});
```

### Integration Tests

**Scenarios to test**:

1. **End-to-end upload flow**:
   - Mock S3 upload with MinIO local instance
   - Verify database record created
   - Check Redis queue receives job

2. **IFC parsing with IfcOpenShell**:
   - Test with sample IFC4 file (Schependomlaan model from buildingSMART)
   - Verify coordinates extracted correctly
   - Check auto-conversion of IFC2x3

**Test Framework**: Supertest (API testing) + Testcontainers (Docker)

### E2E Tests

**User Journeys** (via Playwright):

1. **Happy Path**:
   - Navigate to homepage
   - Drag-drop valid IFC file
   - Wait for success message
   - Verify building marker appears on globe
   - Click marker → 3D loads in <3 seconds

2. **Error Handling**:
   - Upload 150MB file → See "File too large" error
   - Upload .rvt file → See "Unsupported format" error

3. **Accessibility**:
   - Navigate with keyboard only (Tab, Enter, Arrow keys)
   - Run axe DevTools scan → 0 violations

### Performance Tests

**Lighthouse CI** (automated in GitHub Actions):
- FCP <1.5s on 3G connection
- Accessibility score ≥90
- Performance score ≥85

**Load Testing** (K6):
- Simulate 1000 concurrent users viewing globe
- Verify API response times <500ms
- Check database connection pool doesn't exhaust

---

## Risks & Mitigations

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| ~~**web-ifc parsing crashes on malformed IFC**~~ | ~~High~~ | ~~High~~ | **RESOLVED (2025-10-26)**: Client-side parsing removed. All IFC processing server-side with IfcOpenShell (more robust error handling). |
| **S3 costs exceed budget with many uploads** | Medium | Medium | Implement lifecycle policy: Move to Glacier after 90 days inactivity (Constitution §5.5). |
| **Cesium performance degrades with 1000+ buildings** | Medium | High | Use spatial clustering (already planned in FR-011). Add pagination: Load only buildings in viewport. |
| **Database spatial queries slow on large dataset** | Low | Medium | PostGIS GiST index handles 1M+ points efficiently. Monitor with Prometheus, add read replicas if needed. |
| **Python microservice bottleneck (IFC processing)** | Medium | High | Horizontal scaling: Add more Celery workers. Consider async processing with email notification for large files. |

### Legal/Compliance Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **User uploads copyrighted BIM model without permission** | High | High | Display CC-BY 4.0 checkbox during upload (Constitution §1.7). Implement DMCA takedown process. |
| **GDPR violation if IFC contains PII (building occupant names)** | Medium | Critical | Auto-scrub IfcPerson entities before making public (Constitution §1.7 Privacy Considerations). Warn users during upload. |
| **Accessibility lawsuit (WCAG non-compliance)** | Low | High | Enforce Lighthouse accessibility score ≥90 in CI/CD. Quarterly audit by consultant (Constitution §4.4). |

### Business Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **No one uploads models (adoption failure)** | Medium | Critical | Launch with 50 seed models (public domain buildings). Partner with architecture schools for content. |
| **High infrastructure costs with low revenue** | Medium | High | Start with free tier only. Add Pro tier (€5/month) after proving value. Apply for EU Horizon grants (Constitution §5.5). |
| **Competitor launches similar platform first** | Low | Medium | Focus on unique value: Open source + geospatial focus. Build community early. |

---

## Rollout Plan

### Phase 1: Private Alpha (Weeks 1-2)

**Goal**: Validate core upload + visualization with 5-10 alpha testers.

**Participants**:
- 3 architecture students (upload real projects)
- 2 BIM consultants (test edge cases)

**Success Criteria**:
- 20 buildings uploaded
- 0 critical bugs
- Average upload-to-visualization time <30 seconds

### Phase 2: Public Beta (Weeks 3-6)

**Goal**: Stress-test with 100+ users, refine UX.

**Promotion**:
- Post on r/BIM, r/architecture subreddits
- Share on buildingSMART LinkedIn
- Email to open source BIM mailing lists

**Success Criteria**:
- 100 buildings uploaded
- 50 active contributors
- Lighthouse performance maintained (FCP <1.5s)

### Phase 3: Public Launch (Week 7+)

**Goal**: Official v1.0 release with press coverage.

**Launch Checklist**:
- [ ] All acceptance criteria met
- [ ] Documentation complete (README, API docs)
- [ ] Monitoring dashboards configured (Grafana)
- [ ] DMCA email address set up (dmca@ifc-openworld.org)
- [ ] Legal pages live (Terms, Privacy Policy)

**Press Targets**:
- ArchDaily, Dezeen (architecture press)
- Open Source Initiative blog
- buildingSMART newsletter

---

## Documentation Requirements

### User-Facing Docs

1. **Upload Guide** (`docs/upload-guide.md`):
   - How to export IFC from Revit, ArchiCAD, Blender
   - Troubleshooting coordinate issues
   - Best practices for file size

2. **Licensing FAQ** (`docs/licensing-faq.md`):
   - What is CC-BY 4.0?
   - When to use CC0?
   - DMCA process

### Developer Docs

3. **API Reference** (`docs/api-reference.md`):
   - OpenAPI 3.0 schema (auto-generated from code)
   - Authentication (future)
   - Rate limits

4. **Contributing Guide** (`CONTRIBUTING.md`):
   - How to set up local development (Docker Compose)
   - Code style (ESLint + Prettier)
   - How to run tests

### Architecture Docs

5. **ADR-001: Why CesiumJS over MapLibre?** (`docs/adrs/001-cesiumjs.md`):
   - Decision: Use CesiumJS for 3D globe
   - Rationale: Built-in 3D Tiles support, terrain, better BIM integration
   - Tradeoffs: Larger bundle size vs MapLibre

6. **ADR-002: Dual Backend (Node.js + Python)** (`docs/adrs/002-dual-backend.md`):
   - Decision: Node.js for API, Python for IFC processing
   - Rationale: IfcOpenShell has no stable Node.js bindings
   - Tradeoffs: Operational complexity vs dev productivity

---

## Open Questions (Require Decision Before Implementation)

### Question 1: Anonymous Upload vs. Required Email? ✅ RESOLVED

**Context**: MVP allows anonymous uploads (no authentication). But how do we notify user when IFC processing completes?

**Options**:
- A) Require email address during upload (no password, just email for notifications)
- B) Use WebSocket connection while user stays on page
- C) Display unique URL after upload: "Bookmark this page to check status"

**Decision**: ✅ **Option C (URL bookmark)** - Approved 2025-10-23

**Rationale**:
- GDPR-compliant (no PII collection required per Constitution §1.4)
- Lowest friction for MVP user experience
- Simple implementation (HTTP polling, see Q3)
- Acceptable tradeoff: User may lose URL, but no account recovery overhead for MVP

**Implementation Details**:
- Upload success returns: `{uploadId: "uuid", statusUrl: "/status/{uuid}"}`
- Status page shows: Real-time processing status + "Bookmark this page" banner
- URL expires after 7 days (configurable in backend)
- Future: Add Option A (email notifications) in SPEC-002 (User Accounts)

---

### Question 2: Which S3-Compatible Provider for Production? ✅ RESOLVED

**Context**: Constitution §2.2 specifies "S3-compatible" but doesn't mandate AWS.

**Options**:
- A) AWS S3 (most reliable, higher cost: €30/TB + egress fees)
- B) DigitalOcean Spaces (simpler, cheaper: €5/month flat with 250GB + 1TB bandwidth)
- C) MinIO self-hosted (cheapest, requires DevOps effort)

**Decision**: ✅ **Option B (DigitalOcean Spaces)** - Approved 2025-10-23

**Rationale**:
- **45% cost savings** vs AWS S3 (€5/month vs €9.20/month for 100GB storage)
- Flat pricing simplifies budget forecasting (no surprise egress charges)
- S3-compatible API ensures vendor lock-in prevention (see ADR-004 in PLAN-001)
- Production-ready infrastructure (99.9% SLA, CDN integration)
- Easy migration path: AWS SDK used throughout codebase (only endpoint URL changes)

**Implementation Details**:
- Development: MinIO (Docker container, see docker-compose.yml)
- Production: DigitalOcean Spaces (endpoint: `{region}.digitaloceanspaces.com`)
- Environment variable: `S3_ENDPOINT_URL` controls provider
- Cost monitoring: Alert if monthly storage exceeds 200GB (trigger migration review)
- Documented in: ADR-004 (specs/001-plan.md Section 11.2)

---

### Question 3: Real-Time Updates or Polling for Processing Status? ✅ RESOLVED

**Context**: After upload, how does client know when IFC processing completes?

**Options**:
- A) WebSocket (Socket.io) for real-time push notifications
- B) HTTP polling every 5 seconds
- C) Email notification with link to view building

**Decision**: ✅ **Option B (HTTP polling)** - Approved 2025-10-23

**Rationale**:
- **Simplicity for MVP**: No WebSocket server state, easier horizontal scaling
- **Acceptable overhead**: Avg processing time 2.5 min = max 30 polling requests (~15 KB traffic)
- **Stateless architecture**: Each poll is independent HTTP request (load balancer friendly)
- **Progressive enhancement**: Can add WebSocket in SPEC-004 without breaking existing clients
- **Constitution compliance**: Meets NFR-005 (<500ms query performance for status endpoint)

**Implementation Details**:
- Frontend: `usePolling` hook checks `GET /api/v1/uploads/:id/status` every 5s
- Backend: Returns `{status: "pending"|"processing"|"completed"|"failed", progress: 0-100}`
- Optimization: Client stops polling after 10 minutes (timeout) or on "completed"/"failed"
- Future enhancement: WebSocket in SPEC-004 when concurrent uploads exceed 100/hour
- Documented in: PLAN-001 Section 11.3 (Open Question OQ-003)

---

## POC Validation Results

**POC Completion Date**: 2025-10-24
**Total POC Time**: ~5 hours
**Overall Result**: ✅ **4/4 POC PASS** (100% success rate)
**Confidence Level**: 9.5/10

### Technical Stack Validation

| Component | POC | Result | Performance | Notes |
|-----------|-----|--------|-------------|-------|
| IFC Parsing | POC-1 | ✅ PASS | Instant (0.00s) | IfcOpenShell 0.8.3 validated |
| 3D Rendering | POC-2 | ✅ PASS | 0.06s init (50x faster) | CesiumJS validated, **Yarn required on Windows** |
| File Upload | POC-3 | ✅ PASS | 0.41s for 50MB (24x faster) | Express + Multer validated |
| Spatial Queries | POC-4 | ✅ PASS | 23.8ms (4x faster) | PostGIS + GiST index validated |

**Detailed Results**: [POC Summary](../poc/POC-SUMMARY-FINAL.md)

### Critical Findings

1. **✅ Stack Validated**: All core technologies (IfcOpenShell, CesiumJS, PostGIS) work as expected
2. **⚠️ Windows Requirement**: **MUST use Yarn instead of npm** on Windows (npm bug with Rollup native modules)
3. **❌ web-ifc Blocked**: Browser IFC parsing incompatible with Vite 5.x ([T119 Analysis](../poc/POC-2-cesium-viewer/T119-RESULTS.md))
4. **✅ Architecture Decision**: Server-side parsing only (IfcOpenShell) - more reliable and performant

### Performance Validation

All performance targets exceeded:
- IFC coordinate extraction: Instant (target: <5s) ✅
- Cesium initialization: 0.06s (target: <3s) ✅
- File upload 50MB: 0.41s (target: <10s) ✅
- Spatial query 5km: 23.8ms (target: <100ms) ✅

### Required Specification Changes

**Architecture Revision (2025-10-26):**
- ❌ Removed: Client-side IFC parsing with web-ifc (Vite incompatibility)
- ✅ Updated: Server-side only parsing with IfcOpenShell → 3D Tiles streaming
- Impact: FR-012, FR-013, NFR-008 revised (see above)
- Benefit: More reliable, better performance, improved security

**Rationale:**
After 4 fix attempts (3 hours), web-ifc WASM loading in Vite workers proved incompatible. Server-side architecture (already validated in POC-1) provides superior reliability and was adopted per Constitution Amendment Process.

---

## Approval & Sign-Off

**Specification Author**: @claude-ifc-openworld
**Reviewers**:
- [x] Technical Lead (architecture review) - Approved 2025-10-23
- [x] Product Owner (acceptance criteria validation) - Approved 2025-10-23
- [x] Constitution Compliance (all 10 principles validated) - Approved 2025-10-23
- [x] POC Validation (technical stack feasibility) - Approved 2025-10-24

**Approval Status**: ✅ **APPROVED - READY FOR IMPLEMENTATION (POC VALIDATED)**

**Decisions Finalized**:
- ✅ Q1: Anonymous upload with URL bookmark notification
- ✅ Q2: DigitalOcean Spaces for production S3 storage
- ✅ Q3: HTTP polling for status updates (5-second interval)
- ✅ POC: Stack tecnologico validato (4/4 PASS)

**Approval Date**: 2025-10-23
**POC Validation Date**: 2025-10-24
**Implementation Start Date**: 2025-10-24 (Milestone 0: Research & Prototyping)
**Target MVP Launch**: 2025-12-15 (8 weeks from start)

---

## Appendix A: Sample IFC Files for Testing

### Minimal Valid IFC4 (for unit tests)

```ifc
ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');
FILE_NAME('minimal-test.ifc','2025-10-23T12:00:00',('Test Author'),('IFC-OpenWorld'),'IfcOpenShell','IfcOpenShell','');
FILE_SCHEMA(('IFC4'));
ENDSEC;

DATA;
#1=IFCPROJECT('0vPqr8NfD9_Q5j7W8EXAMPLE',$,'Test Project',$,$,$,$,(#10),#20);
#10=IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.0E-5,#11,$);
#11=IFCAXIS2PLACEMENT3D(#12,$,$);
#12=IFCCARTESIANPOINT((0.,0.,0.));
#20=IFCUNITASSIGNMENT((#21));
#21=IFCSIUNIT(*,.LENGTHUNIT.,$,.METRE.);
#30=IFCSITE('2vQ8R3fLD0HwHqLGxzVIlK',$,'Test Site',$,$,#31,$,$,.ELEMENT.,(41,53,24,123456),(12,29,32,654321),50.00,$);
#31=IFCLOCALPLACEMENT($,#32);
#32=IFCAXIS2PLACEMENT3D(#12,$,$);
#40=IFCBUILDING('3AbCdEfGhI1234567890XYZ',$,'Test Building',$,$,#31,$,$,.ELEMENT.,$,$,$);
ENDSEC;

END-ISO-10303-21;
```

### Public Test Models (for E2E tests)

1. **Schependomlaan.ifc** - Open source house model from buildingSMART
   - Source: https://github.com/buildingSMART/Sample-Test-Files
   - Coordinates: Already georeferenced in Netherlands
   - File size: 2.3MB

2. **Duplex_A.ifc** - Small apartment building from IFC.js examples
   - Source: https://github.com/IFCjs/test-ifc-files
   - Coordinates: **Missing** (good for testing fallback UI)
   - File size: 1.1MB

---

## Appendix B: Glossary

- **IFC (Industry Foundation Classes)**: ISO 16739 standard for BIM data exchange
- **WGS84**: World Geodetic System 1984 (EPSG:4326), standard GPS coordinate system
- **3D Tiles**: Cesium format for streaming large 3D datasets with LOD
- **IfcSite**: IFC entity representing building location (contains RefLatitude/RefLongitude)
- **PostGIS**: PostgreSQL extension for spatial/geographic data types and queries
- **GiST Index**: Generalized Search Tree, PostgreSQL index type for spatial queries
- **Presigned URL**: Time-limited S3 upload URL that bypasses server bandwidth
- **Web Worker**: JavaScript runs in separate thread (doesn't block UI)
- **CC-BY 4.0**: Creative Commons Attribution license (allows commercial use with attribution)
- **S3-Compatible Storage**: Any object storage service that implements the AWS S3 API standard. Enables vendor-agnostic code using AWS SDK.
  - **Local Development**: MinIO (Docker container, open source S3 simulator)
  - **Production (Default)**: DigitalOcean Spaces (see ADR-004 for cost analysis)
  - **Alternative Options**: AWS S3, Backblaze B2, Cloudflare R2, Wasabi
  - **Why S3-Compatible?**: Single codebase works across all providers; migration requires only endpoint URL change

---

**End of Specification**

*"Building the world's open digital twin, one IFC at a time."*
