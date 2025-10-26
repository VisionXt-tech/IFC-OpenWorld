# IFC-OpenWorld

Open-source platform for uploading, geolocating, and visualizing IFC (Industry Foundation Classes) building models on a 3D globe.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Status](https://img.shields.io/badge/Status-POC%20Validated-green)]()
[![Architecture](https://img.shields.io/badge/Architecture-Server--Side-blue)]()

---

## ⚠️ **IMPORTANT: Windows Developers**

**If you are on Windows, you MUST use Yarn instead of npm.**

### Why?
npm on Windows has a [known bug (#4828)](https://github.com/npm/cli/issues/4828) with optional dependencies that prevents installation of `@rollup/rollup-win32-x64-msvc`, causing Vite to fail with:

```
Error: Cannot find module @rollup/rollup-win32-x64-msvc
```

### Solution

**Install Yarn globally (one-time setup):**
```bash
npm install -g yarn
```

**Use Yarn for all commands:**
```bash
yarn install       # instead of npm install
yarn dev           # instead of npm run dev
yarn build         # instead of npm run build
```

**Verified**: This solution is tested and validated in [POC-2](poc/POC-2-cesium-viewer/YARN-SOLUTION.md).

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20.10.0 LTS or higher
- **Yarn** 1.22+ (Windows) or npm 10+ (macOS/Linux)
- **Python** 3.11+ (for IFC processing service)
- **Docker** 20.10+ (for PostgreSQL + PostGIS)
- **Git** 2.40+

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_ORG/IFC-OpenWorld.git
cd IFC-OpenWorld

# Frontend setup
cd frontend
yarn install  # or npm install on macOS/Linux
yarn dev

# Backend setup
cd ../backend
yarn install  # or npm install on macOS/Linux
yarn dev

# IFC Processor (Python)
cd ../ifc-processor
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app/main.py

# Database (Docker)
cd ../infrastructure
docker-compose up -d
```

---

## 📚 Documentation

- **[Specification](specs/001-ifc-upload-visualization.md)** - Feature requirements and architecture
- **[Implementation Plan](specs/001-plan.md)** - Technical implementation strategy
- **[Constitution](CONSTITUTION.md)** - Project principles and governance
- **[POC Summary](poc/POC-SUMMARY-FINAL.md)** - Proof-of-concept validation results
- **[Tasks Breakdown](specs/001-tasks.md)** - Sprint planning and task list

---

## 🏗️ Architecture

```
┌─────────────┐
│   Browser   │
│  (React +   │
│   CesiumJS) │
└──────┬──────┘
       │
       │ HTTPS
       ↓
┌─────────────────────────────────────┐
│         Node.js API Server          │
│  (Express + Prisma + S3 Presigned)  │
└────────┬────────────────────┬───────┘
         │                    │
         ↓                    ↓
┌─────────────────┐  ┌─────────────────┐
│  Python Service │  │  PostgreSQL +   │
│  (IfcOpenShell  │  │     PostGIS     │
│  + Celery)      │  │  (WGS84 coords) │
└─────────────────┘  └─────────────────┘
         │
         ↓
┌─────────────────┐
│    S3 Storage   │
│  (IFC files +   │
│   3D Tiles)     │
└─────────────────┘
```

### Key Design Decisions

- **Server-Side IFC Parsing**: All IFC processing happens server-side with Python IfcOpenShell (more reliable than browser WASM)
- **3D Tiles Streaming**: Pre-generated 3D Tiles streamed to CesiumJS (no client-side parsing)
- **Dual Backend**: Node.js for API + I/O, Python for IFC-specific operations
- **Spatial Database**: PostGIS for geospatial queries (validated 4-500x faster than targets)

**Rationale**: Browser-side IFC parsing (web-ifc) proved incompatible with Vite 5.x. Server-side architecture provides better reliability, performance, and security. See [T119 Analysis](poc/POC-2-cesium-viewer/T119-RESULTS.md).

---

## 🧪 POC Validation Results

All core components validated (2025-10-26):

| Component | Status | Performance | Details |
|-----------|--------|-------------|---------|
| **IFC Parsing** (IfcOpenShell) | ✅ PASS | Instant (0.00s) | [POC-1](poc/POC-1-ifcopenshell/RESULTS.md) |
| **3D Rendering** (CesiumJS) | ✅ PASS | 0.06s init (50x faster) | [POC-2](poc/POC-2-cesium-viewer/RESULTS.md) |
| **File Upload** (50MB) | ✅ PASS | 0.41s (24x faster) | [POC-3](poc/POC-3-upload-test/RESULTS.md) |
| **Spatial Queries** (PostGIS) | ✅ PASS | 23.8ms (4x faster) | [POC-4](poc/POC-4-postgis-test/RESULTS.md) |

**Confidence**: 9.5/10 - Ready for implementation

---

## 🛠️ Tech Stack

### Frontend
- **React** 18.2.0 + TypeScript 5.3 (strict mode)
- **CesiumJS** 1.112.0 (3D globe + 3D Tiles rendering)
- **Vite** 5.0 (build tool - **Yarn required on Windows**)
- **Zustand** 4.4 (state management)

### Backend
- **Node.js** 20.10 LTS + TypeScript 5.3
- **Express** 4.18 (REST API) or **Fastify** 4.25
- **Prisma** 5.7 (ORM)
- **AWS SDK** 3.x (S3 presigned URLs)

### IFC Processing
- **Python** 3.11+ + **FastAPI** 0.108
- **IfcOpenShell** 0.8.3 (IFC parsing)
- **Celery** 5.3 + **Redis** 7.2 (async jobs)

### Database
- **PostgreSQL** 15.5 + **PostGIS** 3.4 (spatial queries)
- **Docker** 20.10+ (containerization)

---

## 🚧 Development Status

**Current Phase**: POC Validation Complete ✅

**Next Steps**:
1. Sprint 1: Backend API implementation (Weeks 2-3)
2. Sprint 2: IFC Processor service (Week 4)
3. Sprint 3: Frontend components (Weeks 5-6)

**Timeline**: 8-10 weeks (2 developers)

---

## 🤝 Contributing

We welcome contributions! Please read our:
- [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidelines (TBD)
- [CONSTITUTION.md](CONSTITUTION.md) - Project principles
- [Code of Conduct](CODE_OF_CONDUCT.md) (TBD)

**Development Requirements**:
- TypeScript strict mode enabled
- 85% test coverage for critical paths
- ESLint + Prettier (zero warnings)
- **Windows developers must use Yarn**

---

## 📖 Key Concepts

### IFC (Industry Foundation Classes)
Open standard for BIM (Building Information Modeling) data exchange. Contains 3D geometry, materials, coordinates, and metadata.

### WGS84 Georeferencing
IFC files can include `IfcSite` with `RefLatitude`/`RefLongitude` coordinates (WGS84 datum) to position buildings on Earth.

### 3D Tiles
Open standard for streaming massive 3D geospatial datasets. Used by CesiumJS for efficient rendering.

---

## 📜 License

This project is licensed under the **MIT License** - see [LICENSE](LICENSE) for details.

### Data Licensing
User-uploaded IFC models must be licensed under:
- **CC-BY 4.0** (Attribution) - Default
- **CC0** (Public Domain) - Optional

See [CONSTITUTION.md §1.7](CONSTITUTION.md#17-data-licensing--attribution) for details.

---

## 🙏 Acknowledgments

- [buildingSMART](https://www.buildingsmart.org/) - IFC standards
- [IfcOpenShell](http://ifcopenshell.org/) - IFC parsing library
- [CesiumJS](https://cesium.com/cesiumjs/) - 3D globe visualization
- [OpenStreetMap](https://www.openstreetmap.org/) - Basemap provider

---

## 📞 Support

- **Documentation**: [specs/](specs/)
- **POC Results**: [poc/POC-SUMMARY-FINAL.md](poc/POC-SUMMARY-FINAL.md)
- **Issues**: [GitHub Issues](https://github.com/YOUR_ORG/IFC-OpenWorld/issues)
- **Discussions**: [GitHub Discussions](https://github.com/YOUR_ORG/IFC-OpenWorld/discussions)

---

**Built with ❤️ for the open BIM community**

---

## 🔗 Quick Links

- [Live Demo](https://ifc-openworld.demo) (Coming soon)
- [API Documentation](https://api.ifc-openworld.demo/docs) (Coming soon)
- [Roadmap](https://github.com/YOUR_ORG/IFC-OpenWorld/projects) (TBD)
- [Changelog](CHANGELOG.md) (TBD)
