# Testing Strategy - IFC OpenWorld

**Document Version**: 1.0
**Date**: 2025-10-31
**Status**: Ready for Implementation
**Related**: specs/001-plan.md Tasks 3.9, 3.10

---

## Overview

This document outlines the testing strategy for IFC OpenWorld, covering unit tests, integration tests, and end-to-end tests. The strategy is designed to achieve 85% code coverage as required by the Constitution (§1.5).

---

## Testing Pyramid

```
        /\
       /  \     E2E Tests (Playwright)
      /____\    ~10 tests - Critical user flows
     /      \
    /________\  Integration Tests (Jest + Supertest)
   /          \ ~50 tests - API + Component integration
  /____________\
 /              \
/________________\ Unit Tests (Jest + RTL)
                   ~150 tests - Component logic, utilities, stores
```

---

## 1. Unit Tests (Jest + React Testing Library)

### 1.1 Components

#### UploadZone Component
**File**: `frontend/src/components/UploadZone/UploadZone.test.tsx`

**Priority**: HIGH

**Test Cases**:
- ✓ Renders with initial state (idle)
- ✓ Accepts valid IFC file via drag-and-drop
- ✓ Rejects files exceeding max size (100MB)
- ✓ Rejects non-IFC file extensions
- ✓ Shows progress bar during upload (0-100%)
- ✓ Displays error message on failure
- ✓ Cancel button works during upload
- ✓ Retry button appears after error
- ✓ Calls onFileAccepted callback with File object
- ✓ Drag-active state styling applied on hover

**Estimated**: 10 tests

---

#### CesiumGlobe Component
**File**: `frontend/src/components/CesiumGlobe/CesiumGlobe.test.tsx`

**Priority**: MEDIUM (Complex - mock Cesium)

**Test Cases**:
- ✓ Initializes Cesium Viewer with correct options
- ✓ Calls onReady callback when viewer is ready
- ✓ Calls onError callback on initialization failure
- ✓ Renders building markers from buildings array
- ✓ Calls onBuildingClick when marker is clicked
- ✓ Cleans up viewer on unmount
- ✓ Uses Ion token from config if available
- ✓ Fallback to OpenStreetMap if no token

**Estimated**: 8 tests (with Cesium mocks)

**Note**: Cesium is complex to mock - consider integration test instead.

---

#### InfoPanel Component
**File**: `frontend/src/components/InfoPanel/InfoPanel.test.tsx`

**Priority**: HIGH

**Test Cases**:
- ✓ Renders building metadata correctly
- ✓ Displays coordinates with 6 decimal precision
- ✓ Shows height and floor count when available
- ✓ Hides height/floors section when null
- ✓ Formats upload date correctly
- ✓ Shows CC-BY 4.0 license with icons
- ✓ Copy link button copies to clipboard
- ✓ Close button calls onClose callback
- ✓ Closes on Escape key press
- ✓ Closes when clicking overlay
- ✓ Does not close when clicking panel content

**Estimated**: 11 tests

---

#### BuildingsManager Component
**File**: `frontend/src/components/BuildingsManager/BuildingsManager.test.tsx`

**Priority**: HIGH

**Test Cases**:
- ✓ Renders list of buildings from store
- ✓ Shows empty state when no buildings
- ✓ Select/deselect individual building
- ✓ Select All button selects all buildings
- ✓ Deselect All when all are selected
- ✓ Selection count updates correctly
- ✓ Delete button disabled when no selection
- ✓ Confirmation dialog appears on delete
- ✓ Deletes selected buildings via API
- ✓ Refreshes list after successful delete
- ✓ Shows error banner on delete failure
- ✓ Closes on Escape key press
- ✓ Closes on close button click

**Estimated**: 13 tests

---

### 1.2 Zustand Stores

#### uploadStore
**File**: `frontend/src/store/uploadStore.test.ts`

**Priority**: HIGH

**Test Cases**:
- ✓ Initial state is idle
- ✓ startUpload sets status to uploading
- ✓ Updates progress during upload
- ✓ Sets success status on completion
- ✓ Sets error status on failure
- ✓ cancelUpload aborts upload
- ✓ resetUpload clears state
- ✓ Polls processing status until complete
- ✓ Stores processing result coordinates
- ✓ Handles processing errors

**Estimated**: 10 tests

---

#### buildingsStore
**File**: `frontend/src/store/buildingsStore.test.ts`

**Priority**: HIGH

**Test Cases**:
- ✓ Initial state is empty array
- ✓ fetchBuildings loads from API
- ✓ Stores buildings in GeoJSON format
- ✓ Handles fetch errors gracefully
- ✓ Updates state on successful fetch

**Estimated**: 5 tests

---

### 1.3 Utilities & Services

#### API Services
**Files**: `frontend/src/services/api/*.test.ts`

**Priority**: MEDIUM

**Test Cases** (per service):
- ✓ Builds correct request URLs
- ✓ Sends correct headers
- ✓ Handles 200 responses
- ✓ Handles 4xx errors
- ✓ Handles 5xx errors
- ✓ Handles network errors
- ✓ Retries on timeout (if implemented)

**Estimated**: ~20 tests (4 services × 5 tests)

---

### 1.4 Coverage Target

**Minimum Coverage**: 85% (per Constitution §1.5)

**Priority Coverage**:
- Stores: 95%+
- Critical components (UploadZone, InfoPanel): 90%+
- Other components: 80%+
- Utilities: 90%+

**Exclusions**:
- CesiumGlobe (too complex to mock - use E2E)
- CSS files
- Type definitions

---

## 2. Integration Tests (Jest + Supertest)

### 2.1 API Endpoints

**Location**: `backend/tests/integration/`

**Status**: Partially Complete (51 tests, 80% passing)

**Remaining Work**:
- Fix Zod error format assertions (10 failing tests)
- Add middleware tests for rate limiting
- Add DELETE /buildings/:id tests (new endpoint)

**New Tests Needed**:

#### DELETE /buildings/:id
**File**: `backend/tests/integration/buildings.test.ts`

**Test Cases**:
- ✓ Returns 204 on successful delete
- ✓ Returns 404 when building not found
- ✓ Returns 400 for invalid UUID
- ✓ Cascade deletes associated IFC file
- ✓ Removes building from PostGIS database

**Estimated**: 5 tests

---

## 3. End-to-End Tests (Playwright)

### 3.1 Critical User Flows

**Location**: `frontend/tests/e2e/`

**Browser Matrix**: Chrome, Firefox, Safari (WebKit)

**Viewports**: Desktop (1920×1080), Tablet (768×1024), Mobile (375×667)

---

#### Test Suite 1: Upload Flow (Happy Path)
**File**: `upload-flow.spec.ts`

**Priority**: CRITICAL

**Steps**:
1. Navigate to home page
2. Click "Upload IFC" button
3. Upload panel appears
4. Drag-drop valid IFC file (test fixture)
5. Progress bar animates 0% → 100%
6. Processing status updates
7. Globe flies to building location
8. Marker appears on map
9. Upload panel closes

**Assertions**:
- Upload panel visible
- Progress reaches 100%
- "Processing" message appears
- Globe camera moves
- Red marker visible at coordinates
- Building label shows correct name

**Estimated**: 1 test × 3 browsers = 3 test runs

---

#### Test Suite 2: Upload Flow (Error Cases)
**File**: `upload-errors.spec.ts`

**Priority**: HIGH

**Test Cases**:
- ✓ Reject file > 100MB (show error)
- ✓ Reject non-IFC file (show error)
- ✓ Handle network timeout (show retry)
- ✓ Handle server error 500 (show retry)
- ✓ Cancel upload mid-progress
- ✓ Retry after error

**Estimated**: 6 tests × 1 browser (Chrome) = 6 test runs

---

#### Test Suite 3: Building Info Panel
**File**: `info-panel.spec.ts`

**Priority**: HIGH

**Steps**:
1. Navigate with pre-seeded building data
2. Click on building marker
3. InfoPanel appears
4. Verify all metadata displayed
5. Click "Copy Link" button
6. Verify clipboard contains URL
7. Click close button
8. Panel closes

**Assertions**:
- Panel appears with animation
- Name, coordinates, height, floors visible
- CC-BY license visible with icons
- Clipboard contains shareable URL
- Panel closes on X button
- Panel closes on Escape key
- Panel closes on overlay click

**Estimated**: 1 test × 3 browsers = 3 test runs

---

#### Test Suite 4: Buildings Manager
**File**: `buildings-manager.spec.ts`

**Priority**: MEDIUM

**Steps**:
1. Navigate with 5 pre-seeded buildings
2. Click "Manage Buildings" button
3. Manager panel appears
4. Select 2 buildings
5. Click "Delete Selected"
6. Confirm deletion
7. Buildings removed
8. Markers disappear from map

**Assertions**:
- Panel shows all 5 buildings
- Checkboxes work
- Selection count updates (2 of 5 selected)
- Delete confirmation dialog appears
- API DELETE requests sent
- Buildings removed from list
- Map markers removed

**Estimated**: 1 test × 1 browser = 1 test run

---

#### Test Suite 5: Keyboard Navigation
**File**: `keyboard-navigation.spec.ts`

**Priority**: MEDIUM (WCAG 2.1 AA requirement)

**Steps**:
1. Navigate to home page
2. Tab through all interactive elements
3. Open upload panel with Enter
4. Close with Escape
5. Open manager with keyboard
6. Navigate checkboxes with Tab
7. Activate with Space/Enter

**Assertions**:
- All buttons receive focus
- Visual focus indicator visible
- Tab order is logical
- Enter activates buttons
- Escape closes modals
- No keyboard traps

**Estimated**: 1 test × 1 browser = 1 test run

---

#### Test Suite 6: Mobile Responsive
**File**: `mobile-responsive.spec.ts`

**Priority**: LOW

**Viewports**: 375×667 (iPhone SE), 390×844 (iPhone 12)

**Test Cases**:
- ✓ Upload panel fits screen
- ✓ Buttons are tappable (min 44×44px)
- ✓ InfoPanel scrolls on small screen
- ✓ Manager panel scrolls
- ✓ No horizontal overflow

**Estimated**: 1 test × 2 viewports = 2 test runs

---

### 3.2 E2E Test Fixtures

**Location**: `frontend/tests/fixtures/`

**Required Files**:
- `sample-building.ifc` - Valid IFC file with coordinates (~1MB)
- `large-building.ifc` - File exceeding 100MB (for rejection test)
- `invalid.txt` - Non-IFC file
- `building-data.json` - Mock building data for pre-seeding database

---

### 3.3 E2E Coverage Target

**Total E2E Tests**: ~16 test runs

**Critical Flows**: 100% coverage
- Upload → Process → Display
- Click marker → View info
- Delete buildings

**Secondary Flows**: 80% coverage
- Error handling
- Keyboard navigation
- Mobile responsive

---

## 4. Performance Tests (Lighthouse CI)

### 4.1 Metrics (per Constitution §1.2)

**Target**: FCP < 1.5s on 3G connection

**Lighthouse Config**:
```json
{
  "settings": {
    "onlyCategories": ["performance", "accessibility"],
    "throttling": {
      "rttMs": 150,
      "throughputKbps": 1638.4,
      "cpuSlowdownMultiplier": 4
    }
  },
  "assertions": {
    "first-contentful-paint": ["error", {"maxNumericValue": 1500}],
    "speed-index": ["error", {"maxNumericValue": 3000}],
    "interactive": ["error", {"maxNumericValue": 5000}]
  }
}
```

**Run Frequency**: Every PR via GitHub Actions

---

## 5. Accessibility Tests (WCAG 2.1 AA)

### 5.1 Automated Checks

**Tool**: axe-core via Playwright

**Test Cases**:
- ✓ Color contrast ≥ 4.5:1 (normal text)
- ✓ Color contrast ≥ 3:1 (large text)
- ✓ All interactive elements focusable
- ✓ Focus indicators visible
- ✓ ARIA labels present on icons
- ✓ Form inputs have labels
- ✓ Headings in logical order

**Target Score**: ≥ 90/100 (per plan Task 4.7)

---

### 5.2 Manual Checks

**Keyboard Navigation**:
- [ ] Tab through entire app
- [ ] No keyboard traps
- [ ] Logical focus order
- [ ] Escape closes modals

**Screen Reader**:
- [ ] Test with NVDA (Windows)
- [ ] Test with JAWS (Windows)
- [ ] Test with VoiceOver (macOS)

---

## 6. Test Data Management

### 6.1 Backend Test Database

**Strategy**: Testcontainers with PostgreSQL + PostGIS

**Setup**:
```typescript
// backend/tests/setup.ts
import { GenericContainer } from 'testcontainers';

let postgisContainer: StartedTestContainer;

beforeAll(async () => {
  postgisContainer = await new GenericContainer('postgis/postgis:15-3.4')
    .withExposedPorts(5432)
    .withEnv('POSTGRES_DB', 'ifc_test')
    .withEnv('POSTGRES_USER', 'test')
    .withEnv('POSTGRES_PASSWORD', 'test')
    .start();

  // Run migrations
  await runMigrations(postgisContainer.getHost(), postgisContainer.getMappedPort(5432));
});

afterAll(async () => {
  await postgisContainer.stop();
});
```

---

### 6.2 Frontend Test Data

**Mocking Strategy**: MSW (Mock Service Worker)

**Example**:
```typescript
// frontend/tests/mocks/handlers.ts
import { rest } from 'msw';

export const handlers = [
  rest.get('/api/v1/buildings', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        type: 'FeatureCollection',
        features: [
          {
            id: 'test-building-1',
            geometry: { type: 'Point', coordinates: [-70.87, 42.409] },
            properties: {
              name: 'Test Building',
              height: 16500,
              floorCount: 4,
              // ...
            }
          }
        ]
      })
    );
  })
];
```

---

## 7. CI/CD Integration

### 7.1 GitHub Actions Workflow

**File**: `.github/workflows/test.yml`

```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgis/postgis:15-3.4
        env:
          POSTGRES_PASSWORD: test
    steps:
      - uses: actions/checkout@v4
      - run: npm run test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/

  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: treosh/lighthouse-ci-action@v9
        with:
          configPath: './lighthouserc.json'
          uploadArtifacts: true
```

---

## 8. Implementation Checklist

### Phase 1: Unit Tests (Week 1)
- [ ] Setup Jest + React Testing Library
- [ ] Configure coverage reporting (codecov)
- [ ] Write UploadZone tests (10 tests)
- [ ] Write InfoPanel tests (11 tests)
- [ ] Write BuildingsManager tests (13 tests)
- [ ] Write uploadStore tests (10 tests)
- [ ] Write buildingsStore tests (5 tests)
- [ ] Write API service tests (20 tests)
- [ ] Achieve 85%+ coverage

**Estimated**: 2-3 days

---

### Phase 2: Integration Tests (Week 1-2)
- [ ] Fix existing Zod assertion failures (10 tests)
- [ ] Add DELETE /buildings tests (5 tests)
- [ ] Add rate limiting middleware tests
- [ ] Achieve 100% API endpoint coverage

**Estimated**: 1 day

---

### Phase 3: E2E Tests (Week 2)
- [ ] Setup Playwright
- [ ] Create test fixtures (IFC files)
- [ ] Write upload flow tests (3 browsers)
- [ ] Write error handling tests (6 tests)
- [ ] Write InfoPanel tests (3 browsers)
- [ ] Write BuildingsManager tests (1 test)
- [ ] Write keyboard navigation tests (1 test)
- [ ] Write mobile responsive tests (2 viewports)

**Estimated**: 2-3 days

---

### Phase 4: CI/CD (Week 2)
- [ ] Create GitHub Actions workflow
- [ ] Setup Codecov integration
- [ ] Configure Lighthouse CI
- [ ] Add PR status checks
- [ ] Document test commands in README

**Estimated**: 1 day

---

## 9. Test Commands

### Frontend
```bash
# Unit tests
npm run test                    # Run all unit tests
npm run test:watch             # Watch mode
npm run test:coverage          # With coverage report

# E2E tests
npm run test:e2e               # Run Playwright tests
npm run test:e2e:ui            # Interactive mode
npm run test:e2e:debug         # Debug mode
```

### Backend
```bash
# Unit tests
npm run test                    # Run all tests
npm run test:watch             # Watch mode
npm run test:coverage          # With coverage

# Integration tests
npm run test:integration       # API integration tests
```

---

## 10. Success Criteria

✅ **Unit Tests**: 85%+ coverage, all critical components tested
✅ **Integration Tests**: All API endpoints tested, 100% passing
✅ **E2E Tests**: Critical flows covered, runs on 3 browsers
✅ **Performance**: FCP < 1.5s on 3G (Lighthouse)
✅ **Accessibility**: Score ≥ 90/100 (axe-core)
✅ **CI/CD**: Automated test suite runs on every PR

---

## Next Steps

1. **Immediate** (Before Milestone 4):
   - Review this strategy document
   - Prioritize critical tests (UploadZone, InfoPanel, stores)
   - Setup Jest configuration

2. **Short-term** (Milestone 4 - Week 5):
   - Implement Phase 1: Unit tests
   - Implement Phase 2: Integration tests
   - Setup CI/CD pipeline

3. **Medium-term** (Post-Milestone 4):
   - Implement Phase 3: E2E tests
   - Performance optimization based on Lighthouse results
   - Accessibility improvements based on axe-core results

---

**Document Status**: Ready for Implementation
**Next Review**: After Milestone 4 completion
