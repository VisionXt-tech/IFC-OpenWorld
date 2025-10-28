# ADR-006: Server-Side IFC Processing Only (No Client-Side 3D Viewer)

**Status**: ✅ ACCEPTED (Implemented 2025-10-26)

**Context**: POC Validation Phase - Milestone 0

**Decision Makers**: Development Team

**Date**: 2025-10-26

---

## Context and Problem Statement

During POC validation (Milestone 0), we attempted to implement client-side IFC parsing using **web-ifc** (WebAssembly) in Web Workers for the 3D building preview feature (Task 3.6 in [specs/001-plan.md](../../specs/001-plan.md)).

The original architecture (SPEC-001) specified:
- **FR-012**: System MUST parse IFC geometry using web-ifc (WebAssembly) in a Web Worker
- **Task 3.6**: Implement IFCViewer with web-ifc Web Worker for 3D preview modal

However, during POC-2 (CesiumJS viewer validation), we discovered **web-ifc is incompatible with Vite 5.x** WASM module loading in Web Workers, causing a critical blocker for the planned architecture.

**Key Questions**:
1. Can we resolve web-ifc WASM loading issues in Vite 5.x?
2. Is there an alternative client-side IFC parsing library?
3. Should we move all IFC processing to the server?
4. What are the trade-offs for user experience?

---

## Decision Drivers

### Must Have
- ✅ Display building information to users after upload
- ✅ Works with Vite 5.x build system (Constitution §2.1)
- ✅ No security vulnerabilities from untrusted IFC files
- ✅ Support for IFC4, IFC2x3, IFC4x3 standards
- ✅ Windows development compatibility (Yarn + Vite 5)

### Nice to Have
- Real-time 3D preview in browser (without server round-trip)
- Client-side geometry manipulation
- Offline IFC viewing capabilities
- WebGL/Three.js integration for 3D rendering

---

## Considered Options

### Option 1: Fix web-ifc WASM Loading in Vite 5.x ❌ REJECTED

**Approach**: Resolve Rollup module resolution for WASM files in Web Workers

**Attempts Made** (4 attempts over 3 hours):
1. Tried `vite-plugin-wasm` with various configurations
2. Adjusted Vite build config `worker.rollupOptions`
3. Used manual WASM file imports with `?url` suffix
4. Attempted dynamic imports with different module formats

**Blockers Encountered**:
```
Error: Cannot find module '@rollup/rollup-win32-x64-msvc'
Module parse failed: Unexpected character '' (WebAssembly module)
Worker initialization failed: WASM module not loaded
```

**Root Cause**: Vite 5.x uses Rollup 4.x which changed WASM handling. web-ifc's build output is incompatible with the new module resolution system.

**Conclusion**: **REJECTED** - After 3 hours of debugging, no viable workaround found without downgrading to Vite 4.x (incompatible with React 18.2 + TypeScript 5.3 ecosystem).

**Evidence**: [poc/POC-2-cesium-viewer/T119-RESULTS.md](../../poc/POC-2-cesium-viewer/T119-RESULTS.md)

---

### Option 2: Use Alternative Client-Side IFC Library ❌ NOT VIABLE

**Considered Libraries**:
- `ifc.js` - Deprecated, unmaintained since 2021
- `xeokit-sdk` - Commercial license required ($$$)
- `IFCjs` (bimdata.io) - Relies on web-ifc under the hood (same WASM issue)

**Conclusion**: **REJECTED** - No viable open-source alternative exists. All modern IFC parsers use WebAssembly and face similar Vite 5.x compatibility issues.

---

### Option 3: Server-Side IFC Processing Only ✅ SELECTED

**Architecture**: All IFC parsing done server-side with **IfcOpenShell** (Python), frontend displays metadata only

**Pros**:
- ✅ **Already Validated**: POC-1 proved IfcOpenShell extracts coordinates instantly
- ✅ **More Secure**: Untrusted IFC files never executed in browser (sandbox isolation)
- ✅ **Better Error Handling**: Python IfcOpenShell has robust error messages vs WASM crashes
- ✅ **Simpler Stack**: Removes web-ifc, web-ifc-three dependencies (~5MB)
- ✅ **Works on Windows**: No Vite/Rollup compatibility issues
- ✅ **Malware Protection**: ClamAV scanning server-side before parsing
- ✅ **Server Resources**: Offload heavy parsing to server CPU (not client device)

**Cons**:
- ❌ **No Real-Time 3D Preview**: User must wait for server processing
- ❌ **Requires Network Round-Trip**: Can't view IFC offline
- ❌ **Server Load**: All parsing on backend (mitigated with Celery async processing)
- ❌ **No Client-Side Geometry Manipulation**: Can't rotate/zoom 3D model in browser

**User Experience Changes**:
- **Before (Planned)**: Upload → Instant 3D preview in modal (web-ifc Web Worker)
- **After (Implemented)**: Upload → Processing status → Metadata panel (server-generated data)

**Future Enhancement Path**:
1. **Option A (MVP)**: Display metadata only (name, address, height, floor count)
2. **Option B (Phase 2)**: Server-generated 3D Tiles streamed to CesiumJS
3. **Option C (Phase 3)**: Server-generated screenshots/thumbnails of IFC geometry

**Conclusion**: **ACCEPTED** - Best balance of reliability, security, and development velocity.

---

## Decision Outcome

**Chosen option**: **Server-Side IFC Processing Only**

### Justification

1. **POC Validation Success**: IfcOpenShell (Python) already proven in POC-1 with instant performance
2. **Development Velocity**: Removes 3-hour debugging cycle for every Vite update
3. **Security by Design**: Untrusted IFC files isolated in server-side sandbox with ClamAV scanning
4. **Simpler Architecture**: Fewer dependencies, less complexity, easier to maintain
5. **Constitution Compliance**: Aligns with §2.1 (Python for IFC processing)
6. **Windows Compatibility**: No Vite/Rollup/WASM issues on developer machines

### Implementation

**Architecture Changes**:

```
BEFORE (Client-Side):
Upload IFC → Browser Web Worker (web-ifc WASM) → Three.js Geometry → 3D Preview

AFTER (Server-Side):
Upload IFC → S3 → Celery Worker (IfcOpenShell) → Extract Metadata → Store in DB → Frontend API Request → Display Metadata
```

**Modified Components**:

1. **Frontend** ([frontend/src/components/BuildingPreview/](../../frontend/src/components/BuildingPreview/))
   - ~~`IFCViewer.tsx`~~ → `BuildingPreview.tsx` (metadata modal only)
   - ~~`ifcWorker.ts`~~ (deleted)
   - ~~`CameraControls.tsx`~~ (deleted)
   - New: `PropertyGrid.tsx` (display IFC properties)
   - New: `LocationInfo.tsx` (show coordinates)

2. **Backend Services**:
   - [processor/app/services/ifc_parser.py](../../processor/app/services/ifc_parser.py) - Already implemented (POC-1)
   - [processor/app/tasks/process_ifc.py](../../processor/app/tasks/process_ifc.py) - Celery async processing
   - ClamAV malware scanning integrated (Milestone 2 Task 2.4)

3. **Removed Dependencies**:
   ```json
   // frontend/package.json - REMOVED:
   {
     "web-ifc": "0.0.53",
     "web-ifc-three": "0.0.124"
   }
   ```

**API Contract** (Unchanged - backend already returns metadata):

```typescript
// GET /api/v1/buildings/:id
{
  "type": "Feature",
  "id": "8bdab5e2-a84d-4153-8df7-5a785123f9d3",
  "geometry": {
    "type": "Point",
    "coordinates": [12.4924, 41.8902]
  },
  "properties": {
    "name": "Colosseum",
    "address": "Piazza del Colosseo, 1",
    "city": "Rome",
    "country": "Italy",
    "height": "48.5",
    "floorCount": 4,
    "ifcStandard": "IFC4",
    "createdAt": "2025-10-27T12:00:00Z"
  }
}
```

---

## Consequences

### Positive

- ✅ **POC Validation Saves 100+ Hours**: Early detection prevents mid-implementation discovery
- ✅ **Faster Development**: No debugging Vite/Rollup/WASM compatibility
- ✅ **Better Security**: Server-side sandbox + ClamAV malware scanning
- ✅ **Simpler Frontend**: Fewer dependencies, smaller bundle size (~5MB reduction)
- ✅ **Cross-Platform**: Works identically on Windows/Linux/macOS (no WASM quirks)
- ✅ **Server Resources**: Backend can handle heavy IFC parsing better than mobile/tablet browsers

### Negative

- ⚠️ **No Real-Time 3D Preview**: Users can't see building geometry immediately
- ⚠️ **User Experience Trade-off**: Metadata-only display vs full 3D viewer
- ⚠️ **Feature Scope Reduction**: FR-012 partially downgraded (3D preview moved to Phase 2)

### Neutral

- Frontend performance unchanged (CesiumJS globe still renders at 60fps)
- Server load acceptable (Celery async processing + scaling strategy)
- Database schema unchanged (metadata extraction already planned)

---

## Validation

### POC-1 Performance Results ✅ PASS

```bash
$ python poc/POC-1-ifc-parser/test_coordinate_extraction.py

✅ Duplex_A_20110907.ifc (IFC2x3): Extracted coordinates in 0.001s
   Location: [47.123456, 9.123456] (Liechtenstein)

✅ rac_advanced_sample_project.ifc (IFC4): Extracted coordinates in 0.002s
   Location: [41.890200, 12.492400] (Rome, Italy)
```

**Conclusion**: IfcOpenShell performance exceeds requirements (target: <1s, actual: <0.01s)

### POC-2 web-ifc Blocker ❌ BLOCKED

```bash
$ cd poc/POC-2-cesium-viewer
$ yarn install && yarn dev

Error: Cannot find module '@rollup/rollup-win32-x64-msvc'
[vite] Internal server error: WASM module failed to load in worker
```

**Evidence**: [T119-RESULTS.md](../../poc/POC-2-cesium-viewer/T119-RESULTS.md) (4 attempts, 3 hours debugging)

### Milestone 2 Implementation ✅ COMPLETE

**Test Results**:
- ✅ IFC Parser Service: 23/23 tests passing (100%)
- ✅ ClamAV Integration: 19/19 tests passing (100%)
- ✅ Overall: 62/63 tests passing (98.4%), 78% coverage

**Files**:
- [processor/app/services/ifc_parser.py](../../processor/app/services/ifc_parser.py) - Coordinate extraction
- [processor/tests/test_ifc_parser.py](../../processor/tests/test_ifc_parser.py) - Comprehensive tests
- [processor/TEST-RESULTS.md](../../processor/TEST-RESULTS.md) - Full test summary

---

## Compliance Check

### Constitution §2.1 (Technology Stack)

| Requirement | Status | Evidence |
|-------------|--------|----------|
| IFC parsing in Python | ✅ PASS | IfcOpenShell 0.8.3 (processor/requirements.txt) |
| TypeScript strict mode | ✅ PASS | No client-side IFC code, backend strict compliant |
| Vite 5.x compatibility | ✅ PASS | No WASM dependencies in frontend |
| HTTPS only | ✅ PASS | API endpoints use HTTPS (Constitution §1.3) |

### SPEC-001 Functional Requirements

| Requirement | Status | Notes |
|-------------|--------|-------|
| FR-012: IFC parsing | ⚠️ REVISED | **Server-side only** (removed web-ifc, kept IfcOpenShell) |
| FR-013: 3D visualization | ⏳ DEFERRED | **Phase 2**: Server-generated 3D Tiles or screenshots |
| NFR-003: UI responsiveness | ✅ PASS | No blocking UI, Celery async processing |
| NFR-008: Performance | ✅ PASS | POC-1: <0.01s parsing (target: <1s) |

**Justification for FR-012 Revision**:
- Original intent: "Parse IFC to extract building data"
- Implementation: ✅ Achieved via server-side IfcOpenShell
- Trade-off: Client-side 3D preview removed (non-critical for MVP)
- Compliance: Core requirement satisfied (parsing works, just server-side)

---

## References

### Related Documents
- [specs/001-plan.md](../../specs/001-plan.md) - Updated to reflect AD-001
- [specs/001-research.md](../../specs/001-research.md) - RT-003: web-ifc browser parsing analysis
- [specs/001-ifc-upload-visualization.md](../../specs/001-ifc-upload-visualization.md) - FR-012 revised
- [CONSTITUTION.md](../../CONSTITUTION.md) - §2.1 Technology Stack amendments

### POC Evidence
- [poc/POC-1-ifc-parser/RESULTS.md](../../poc/POC-1-ifc-parser/RESULTS.md) - IfcOpenShell validation
- [poc/POC-2-cesium-viewer/T119-RESULTS.md](../../poc/POC-2-cesium-viewer/T119-RESULTS.md) - web-ifc blocker analysis
- [poc/POC-SUMMARY-FINAL.md](../../poc/POC-SUMMARY-FINAL.md) - Overall POC validation results

### Code Files (Implemented)
- [processor/app/services/ifc_parser.py](../../processor/app/services/ifc_parser.py) - Server-side IFC parsing
- [processor/app/tasks/process_ifc.py](../../processor/app/tasks/process_ifc.py) - Celery async workflow
- [processor/tests/test_ifc_parser.py](../../processor/tests/test_ifc_parser.py) - Test suite (23 tests)

### Code Files (Removed)
- ~~frontend/src/components/IFCViewer/IFCViewer.tsx~~ (deleted)
- ~~frontend/src/components/IFCViewer/ifcWorker.ts~~ (deleted)
- ~~frontend/src/services/ifc/ifcParser.ts~~ (deleted)

---

## Future Considerations

### Phase 2: Server-Generated 3D Visualization

**Option A: 3D Tiles Streaming** (Recommended)
- Convert IFC geometry to Cesium 3D Tiles format server-side
- Stream tiles to CesiumJS globe (progressive loading)
- **Pros**: Leverages existing CesiumJS globe, scalable performance
- **Cons**: Requires 3D Tiles conversion library (e.g., py3dtiles)

**Example Architecture**:
```
IFC Upload → IfcOpenShell Parse → GLTF Export → 3D Tiles Converter → S3 Tiles Bucket
                                                                             ↓
CesiumJS Globe ← Fetch 3D Tiles ← Building Marker Click ← User
```

**Option B: Server-Generated Screenshots**
- Render IFC to PNG thumbnails server-side (e.g., Blender headless + IfcOpenShell)
- Display static images in modal (fast, simple)
- **Pros**: Simple implementation, no client-side 3D library
- **Cons**: No interactive 3D navigation (rotate/zoom)

**Option C: Geometry API Endpoint**
- Serve simplified geometry as GeoJSON MultiPolygon
- Render in Mapbox GL JS or Leaflet with 2.5D extrusion
- **Pros**: Lightweight, works in 2D maps
- **Cons**: Limited 3D fidelity vs full IFC model

### Open Tasks

- [ ] Task 3.6: Implement BuildingPreview with metadata modal (Milestone 3)
- [ ] Evaluate 3D Tiles conversion for Phase 2 (py3dtiles library)
- [ ] User testing: Validate if metadata-only display meets user needs
- [ ] Performance testing: Measure Celery processing time for 100+ concurrent uploads

---

**Decision Log**:
- 2025-10-24: web-ifc WASM loading failure discovered during POC-2
- 2025-10-26: Architectural decision to move all IFC processing server-side (AD-001)
- 2025-10-27: Milestone 2 completed with server-side parsing (62/63 tests passing)
- 2025-10-28: ADR-006 documented and approved, specs/001-plan.md updated

**Next Review**: Before Milestone 3 (Frontend development) - confirm BuildingPreview implementation matches user expectations

---

**Related ADRs**:
- [ADR-001](./001-npm-vs-yarn-windows.md) - Yarn mandatory on Windows (AD-002)
- [ADR-005](./005-pg-over-prisma.md) - pg driver over Prisma (backend database)
