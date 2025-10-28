# IFC OpenWorld - Frontend

React + TypeScript + Vite frontend for IFC OpenWorld application.

## Prerequisites

- **Node.js 20.10.0 LTS** or later
- **Yarn** (required on Windows due to npm rollup bug #4828)

## Setup

### 1. Install Yarn (Windows - One-time Setup)

```bash
npm install -g yarn
```

### 2. Install Dependencies

```bash
yarn install
```

### 3. Configure Environment Variables

Copy `.env.example` to `.env` and update values:

```bash
cp .env.example .env
```

**Required**:
- `VITE_CESIUM_ION_TOKEN` - Get your token from [https://cesium.com/ion/tokens](https://cesium.com/ion/tokens)

**Optional**:
- `VITE_API_BASE_URL` - Backend API URL (default: http://localhost:3001/api/v1)
- `VITE_MAX_UPLOAD_SIZE_MB` - Max file upload size (default: 100)

## Development

### Start Development Server

```bash
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Run Type Checking

```bash
yarn typecheck
```

### Run Linting

```bash
yarn lint
```

### Fix Linting Issues

```bash
yarn lint:fix
```

## Building

### Production Build

```bash
yarn build
```

### Preview Production Build

```bash
yarn preview
```

## Testing

### Run Unit Tests

```bash
yarn test
```

### Run Tests with UI

```bash
yarn test:ui
```

### Run Tests with Coverage

```bash
yarn test:coverage
```

## Architecture

### Directory Structure

```
frontend/
├── src/
│   ├── components/        # React components
│   │   ├── UploadZone/    # File upload component
│   │   ├── CesiumGlobe/   # 3D globe viewer
│   │   ├── BuildingPreview/ # Building metadata modal
│   │   └── InfoPanel/     # Attribution and info
│   ├── services/          # API services
│   │   └── api/           # API client
│   ├── store/             # Zustand state management
│   ├── hooks/             # Custom React hooks
│   ├── utils/             # Utility functions
│   ├── types/             # TypeScript types
│   ├── App.tsx            # Main app component
│   └── main.tsx           # Entry point
├── public/                # Static assets
├── index.html             # HTML template
├── vite.config.ts         # Vite configuration
├── tsconfig.json          # TypeScript configuration
├── .eslintrc.cjs          # ESLint configuration
└── .prettierrc.json       # Prettier configuration
```

### Key Technologies

- **React 18.2** - UI framework
- **TypeScript 5.3** - Type safety (strict mode)
- **Vite 5.0** - Build tool and dev server
- **CesiumJS 1.112** - 3D globe visualization
- **Zustand 4.4** - State management
- **react-dropzone 14.2** - File upload UI

### State Management

Uses Zustand for lightweight state management:
- `buildingsStore` - List of uploaded buildings
- `uploadStore` - Upload progress and status

### API Integration

Backend API endpoints:
- `POST /api/v1/upload/request` - Request presigned upload URL
- `POST /api/v1/upload/complete` - Complete upload and trigger processing
- `GET /api/v1/buildings` - Get buildings by bbox
- `GET /api/v1/buildings/:id` - Get building details

## Milestone 3 Progress

### Task 3.1: Project Setup ✅ COMPLETE
- ✅ React + Vite + TypeScript configured
- ✅ ESLint + Prettier with strict rules
- ✅ Path aliases configured (@/components, @/services, etc.)
- ✅ Environment variables setup
- ✅ Yarn installation validated on Windows

### Remaining Tasks
- ⏳ Task 3.2: Configure CesiumJS with Ion token
- ⏳ Task 3.3: Implement UploadZone with react-dropzone
- ⏳ Task 3.4: Create Zustand stores (buildings, upload)
- ⏳ Task 3.5: Implement CesiumGlobe with marker rendering
- ⏳ Task 3.6: Implement BuildingPreview with metadata modal
- ⏳ Task 3.7: Implement InfoPanel with CC-BY attribution
- ⏳ Task 3.8: Add keyboard navigation
- ⏳ Task 3.9: Write React Testing Library unit tests
- ⏳ Task 3.10: Write Playwright E2E tests

## Known Issues

### Windows: npm rollup bug
**Problem**: npm fails to install `@rollup/rollup-win32-x64-msvc` due to bug #4828

**Solution**: Use Yarn instead of npm (see Setup section)

## License

MIT License - See LICENSE file for details
