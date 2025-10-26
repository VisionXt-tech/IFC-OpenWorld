# Task Breakdown: IFC Upload and Basic 3D Visualization

**Branch**: `001-ifc-upload-visualization`
**Data**: 2025-10-23
**Spec**: [001-ifc-upload-visualization.md](./001-ifc-upload-visualization.md)
**Plan**: [001-plan.md](./001-plan.md)

**Effort Totale Stimato**: 320-380 ore (8-10 settimane per 2 sviluppatori)
**Team Suggerito**: 1 Backend Developer + 1 Frontend Developer (con sovrapposizione full-stack)

---

## Formato Task: `[ID] [P?] [Milestone] Descrizione`

- **[P]**: Può essere eseguito in parallelo (file diversi, nessuna dipendenza)
- **[Milestone]**: M0-M4 (da Plan Phase 2)
- Percorsi esatti file inclusi in ogni descrizione

**Convenzioni Percorsi** (da Plan Project Structure):
- **Backend**: `backend/src/`, `backend/tests/`
- **Frontend**: `frontend/src/`, `frontend/tests/`
- **IFC Processor**: `ifc-processor/app/`, `ifc-processor/tests/`
- **Infra**: `infrastructure/`, `.github/workflows/`

---

## Milestone 0: Ricerca & Prototipazione (Settimana 1)

**Obiettivo**: Validare 5 ipotesi tecniche critiche con proof-of-concept funzionanti

**Effort Totale**: 40 ore (1 settimana, 1 persona full-stack)

---

### Fase 0.1: Setup Ambiente Ricerca

- [ ] **T001** [P] [M0] Creare cartella `research/` nella root del progetto con README
  - **Effort**: 0.5 ore
  - **Priorità**: P0 (blocca tutto M0)
  - **Assignee**: Full-Stack Developer
  - **Criteri Accettazione**:
    - Cartella `research/` creata
    - `research/README.md` con istruzioni per eseguire ogni POC
  - **File Creati**:
    - `research/README.md`

- [ ] **T002** [P] [M0] Setup ambiente Python 3.11 con IfcOpenShell per RT-001
  - **Effort**: 1 ora
  - **Priorità**: P0
  - **Assignee**: Backend Developer (o chi ha esperienza Python)
  - **Dipendenze**: T001
  - **Criteri Accettazione**:
    - Virtualenv Python 3.11 creato in `research/001-ifcopenshell-poc/`
    - IfcOpenShell 0.7.0 installato (`pip install ifcopenshell`)
    - Script test esegue senza errori: `python test_import.py`
  - **File Creati**:
    - `research/001-ifcopenshell-poc/requirements.txt`
    - `research/001-ifcopenshell-poc/test_import.py`

- [ ] **T003** [P] [M0] Download sample IFC files da buildingSMART per testing
  - **Effort**: 0.5 ore
  - **Priorità**: P1
  - **Assignee**: Chiunque
  - **Dipendenze**: Nessuna
  - **Criteri Accettazione**:
    - 5 file IFC scaricati in `research/sample-ifc-files/`:
      - 2x IFC4 (Schependomlaan.ifc, Office_A.ifc)
      - 2x IFC2x3 (Duplex_A.ifc, legacy_house.ifc)
      - 1x IFC4x3 (infrastructure_bridge.ifc se disponibile)
    - File con coordinate georeferenziate documentate in `README.md`
  - **File Creati**:
    - `research/sample-ifc-files/README.md` (con sorgenti download)

---

### Fase 0.2: Research Task 001 - IfcOpenShell Coordinate Extraction

- [ ] **T004** [M0] Implementare script Python per estrarre coordinate IfcSite
  - **Effort**: 3 ore
  - **Priorità**: P0 (critical path)
  - **Assignee**: Backend Developer
  - **Dipendenze**: T002, T003
  - **Criteri Accettazione**:
    - Script `extract_coordinates.py` funzionante
    - Estrae RefLatitude/RefLongitude da IfcSite
    - Converte formato DMS (degrees, minutes, seconds) → decimal
    - Gestisce IFC2x3, IFC4, IFC4x3
    - Output JSON con coordinate estratte
  - **File Creati**:
    - `research/001-ifcopenshell-poc/extract_coordinates.py`
  - **Esempio Output**:
    ```json
    {
      "filename": "Schependomlaan.ifc",
      "ifc_schema": "IFC4",
      "site_name": "Building Site",
      "coordinates": {
        "latitude": 52.370216,
        "longitude": 4.895168,
        "elevation": 0.0
      }
    }
    ```

- [ ] **T005** [M0] Testare estrazione coordinate su 5 sample IFC files
  - **Effort**: 2 ore
  - **Priorità**: P0
  - **Assignee**: Backend Developer
  - **Dipendenze**: T004
  - **Criteri Accettazione**:
    - Script eseguito su tutti 5 file sample
    - Coordinate estratte con successo da almeno 3/5 file
    - Errori documentati per file senza IfcSite o coordinate mancanti
    - Risultati salvati in `research/001-ifcopenshell-poc/results.json`
  - **File Modificati**:
    - `research/001-ifcopenshell-poc/extract_coordinates.py` (se bug trovati)
  - **File Creati**:
    - `research/001-ifcopenshell-poc/results.json`

- [ ] **T006** [M0] Documentare findings RT-001 in specs/001-research.md
  - **Effort**: 1 ora
  - **Priorità**: P1
  - **Assignee**: Backend Developer
  - **Dipendenze**: T005
  - **Criteri Accettazione**:
    - Sezione "RT-001 Findings" aggiunta a `specs/001-research.md`
    - Tabella success rate (es. "3/5 file parsed successfully")
    - Note su edge cases trovati (es. "IFC2x3 ha formato coordinate diverso")
  - **File Creati**:
    - `specs/001-research.md` (inizialmente)
  - **File Modificati**:
    - `specs/001-research.md` (se già esistente)

---

### Fase 0.3: Research Task 002 - web-ifc Performance in Web Worker

- [ ] **T007** [M0] Setup progetto Vite minimale per test web-ifc
  - **Effort**: 1.5 ore
  - **Priorità**: P0
  - **Assignee**: Frontend Developer
  - **Dipendenze**: T001
  - **Criteri Accettazione**:
    - Progetto Vite creato in `research/002-web-ifc-worker/`
    - web-ifc 0.0.53 installato
    - Pagina HTML semplice con bottone "Parse IFC"
    - Vite dev server avviabile con `npm run dev`
  - **File Creati**:
    - `research/002-web-ifc-worker/package.json`
    - `research/002-web-ifc-worker/vite.config.ts`
    - `research/002-web-ifc-worker/index.html`
    - `research/002-web-ifc-worker/src/main.ts`

- [ ] **T008** [M0] Implementare Web Worker per parsing IFC con web-ifc
  - **Effort**: 4 ore
  - **Priorità**: P0 (critical path)
  - **Assignee**: Frontend Developer
  - **Dipendenze**: T007
  - **Criteri Accettazione**:
    - File `ifcWorker.ts` creato con IfcAPI init
    - Worker riceve ArrayBuffer IFC via postMessage
    - Worker parsa IFC e restituisce geometry
    - Misura parsing time con `performance.now()`
    - Main thread riceve progress updates (0-100%)
  - **File Creati**:
    - `research/002-web-ifc-worker/src/ifcWorker.ts`
    - `research/002-web-ifc-worker/src/types.ts` (per message types)

- [ ] **T009** [M0] Testare performance parsing 50MB IFC file
  - **Effort**: 2 ore
  - **Priorità**: P0
  - **Assignee**: Frontend Developer
  - **Dipendenze**: T008, T003
  - **Criteri Accettazione**:
    - File Duplex_A.ifc (o scaled up version) caricato
    - Parsing time <3 secondi per 50MB file
    - Main thread rimane responsive (test con `requestAnimationFrame`)
    - FPS misurato con Chrome DevTools Performance tab ≥60fps
    - Screenshot Performance tab salvato in `research/002-web-ifc-worker/perf-results/`
  - **File Creati**:
    - `research/002-web-ifc-worker/perf-results/screenshot.png`
    - `research/002-web-ifc-worker/perf-results/metrics.json`

- [ ] **T010** [M0] Documentare findings RT-002 in specs/001-research.md
  - **Effort**: 1 ora
  - **Priorità**: P1
  - **Assignee**: Frontend Developer
  - **Dipendenze**: T009
  - **Criteri Accettazione**:
    - Sezione "RT-002 Findings" aggiunta
    - Parsing time documentato (es. "2.1s per 50MB IFC4 file")
    - FPS risultati (es. "Main thread: 59-61 fps durante parsing")
    - Conclusione: Web Worker approach validato ✅ o ❌
  - **File Modificati**:
    - `specs/001-research.md`

- [ ] **T119** [M0] **POC Follow-up**: Validare web-ifc parsing in browser
  - **Effort**: 3 ore
  - **Priorità**: P0 (CRITICAL - not validated in POC-2)
  - **Assignee**: Frontend Developer
  - **Dipendenze**: T007, T008
  - **POC Context**: POC-2 validated CesiumJS 3D rendering but NOT web-ifc IFC parsing
  - **Criteri Accettazione**:
    - Test web-ifc 0.0.53 parsing with sample IFC file from T003
    - Validate coordinate extraction works in browser (not just Python IfcOpenShell)
    - Confirm geometry loading in Web Worker without blocking main thread
    - Parsing time <3s for 50MB file (per RT-002 target)
    - No memory leaks or crashes
  - **Test Steps**:
    1. Use existing `research/002-web-ifc-worker/` setup from T007
    2. Load sample IFC file (Schependomlaan.ifc or similar)
    3. Extract coordinates (RefLatitude/RefLongitude)
    4. Parse geometry meshes
    5. Measure performance with Chrome DevTools
  - **Expected Output**:
    - Screenshot showing successful IFC parsing
    - Performance metrics (parsing time, memory usage)
    - Confirmation that web-ifc works on Windows/Yarn setup
  - **File Modified**:
    - `specs/001-research.md` (add validation note to RT-002)
  - **Blocker Resolution**: If web-ifc fails, escalate to Architecture Decision (may need server-side parsing only)

---

### Fase 0.4: Research Task 003 - PostGIS Spatial Query Performance

- [ ] **T011** [M0] Setup PostgreSQL 15 + PostGIS 3.4 con Docker
  - **Effort**: 1 ora
  - **Priorità**: P0
  - **Assignee**: Backend Developer
  - **Dipendenze**: T001
  - **Criteri Accettazione**:
    - Docker Compose creato in `research/003-postgis-perf/docker-compose.yml`
    - PostgreSQL 15.5 con PostGIS 3.4.1 running
    - Database `test_spatial` creato
    - Connessione testata con `psql` o pgAdmin
  - **File Creati**:
    - `research/003-postgis-perf/docker-compose.yml`
    - `research/003-postgis-perf/README.md`

- [ ] **T012** [M0] Generare 10,000 building records sintetici con coordinate random
  - **Effort**: 2 ore
  - **Priorità**: P0
  - **Assignee**: Backend Developer
  - **Dipendenze**: T011
  - **Criteri Accettazione**:
    - Script SQL `generate_test_data.sql` creato
    - 10,000 record inseriti in tabella `buildings`
    - Colonna `location` tipo GEOGRAPHY(POINT, 4326)
    - Coordinate WGS84 valide (lat -90/+90, lon -180/+180)
    - GiST index creato: `CREATE INDEX idx_location ON buildings USING GIST(location)`
  - **File Creati**:
    - `research/003-postgis-perf/generate_test_data.sql`

- [ ] **T013** [M0] Eseguire query spaziali con EXPLAIN ANALYZE
  - **Effort**: 2 ore
  - **Priorità**: P0 (critical path)
  - **Assignee**: Backend Developer
  - **Dipendenze**: T012
  - **Criteri Accettazione**:
    - Query bbox eseguita con `ST_Intersects`
    - `EXPLAIN ANALYZE` output salvato
    - Execution time <100ms per query 10k buildings
    - Index Scan utilizzato (non Seq Scan)
    - Query plan documentato
  - **File Creati**:
    - `research/003-postgis-perf/query_bbox.sql`
    - `research/003-postgis-perf/explain_output.txt`
  - **Esempio Query**:
    ```sql
    EXPLAIN ANALYZE
    SELECT * FROM buildings
    WHERE ST_Intersects(
      location,
      ST_MakeEnvelope(12.4, 41.8, 12.5, 41.9, 4326)
    )
    LIMIT 100;
    ```

- [ ] **T014** [M0] Documentare findings RT-003 in specs/001-research.md
  - **Effort**: 1 ora
  - **Priorità**: P1
  - **Assignee**: Backend Developer
  - **Dipendenze**: T013
  - **Criteri Accettazione**:
    - Sezione "RT-003 Findings" aggiunta
    - Execution time documentato (es. "62ms per bbox query su 10k records")
    - Query plan incluso (Index Scan vs Seq Scan)
    - Conclusione: PostGIS performance sufficiente ✅
  - **File Modificati**:
    - `specs/001-research.md`

---

### Fase 0.5: Research Task 004 - S3 Presigned URL Upload Flow

- [ ] **T015** [M0] Setup MinIO (local S3) con Docker
  - **Effort**: 1 ora
  - **Priorità**: P0
  - **Assignee**: Backend Developer
  - **Dipendenze**: T001
  - **Criteri Accettazione**:
    - MinIO container running via Docker Compose
    - Bucket `ifc-raw` creato
    - Web console accessibile su http://localhost:9001
    - Credenziali: minioadmin / minioadmin
  - **File Creati**:
    - `research/004-s3-presigned/docker-compose.yml`

- [ ] **T016** [M0] Implementare script Node.js per generare presigned URL
  - **Effort**: 2 ore
  - **Priorità**: P0
  - **Assignee**: Backend Developer
  - **Dipendenze**: T015
  - **Criteri Accettazione**:
    - Script TypeScript con AWS SDK v3
    - Genera presigned PUT URL con expiry 15 minuti
    - Testa con curl upload
    - Verifica file compare in MinIO console
  - **File Creati**:
    - `research/004-s3-presigned/package.json`
    - `research/004-s3-presigned/generate-url.ts`
    - `research/004-s3-presigned/test-upload.sh`

- [ ] **T017** [M0] Testare upload 50MB file con presigned URL
  - **Effort**: 1.5 ore
  - **Priorità**: P0
  - **Assignee**: Backend Developer
  - **Dipendenze**: T016, T003
  - **Criteri Accettazione**:
    - File IFC 50MB uploadato direttamente a MinIO (no backend proxy)
    - Upload time <10 secondi su rete locale
    - File verificato in bucket `ifc-raw`
    - Logs timing salvati
  - **File Creati**:
    - `research/004-s3-presigned/upload-results.json`

- [ ] **T018** [M0] Documentare findings RT-004 in specs/001-research.md
  - **Effort**: 1 ora
  - **Priorità**: P1
  - **Assignee**: Backend Developer
  - **Dipendenze**: T017
  - **Criteri Accettazione**:
    - Sezione "RT-004 Findings" aggiunta
    - Upload time documentato
    - Conferma: Direct-to-S3 upload funziona ✅
  - **File Modificati**:
    - `specs/001-research.md`

---

### Fase 0.6: Research Task 005 - CesiumJS Marker Clustering

- [ ] **T019** [M0] Setup progetto React minimale con CesiumJS
  - **Effort**: 2 ore
  - **Priorità**: P0
  - **Assignee**: Frontend Developer
  - **Dipendenze**: T001
  - **Criteri Accettazione**:
    - Progetto Vite + React creato in `research/005-cesium-clustering/`
    - CesiumJS 1.112 installato
    - Cesium Ion token configurato (env var)
    - Globe rendering su http://localhost:5173
  - **File Creati**:
    - `research/005-cesium-clustering/package.json`
    - `research/005-cesium-clustering/src/App.tsx`
    - `research/005-cesium-clustering/.env.example`

- [ ] **T020** [M0] Aggiungere 1000 marker random su globe
  - **Effort**: 2 ore
  - **Priorità**: P0
  - **Assignee**: Frontend Developer
  - **Dipendenze**: T019
  - **Criteri Accettazione**:
    - Script genera 1000 coordinate WGS84 random
    - Markers aggiunti come Cesium Entities con billboard
    - Icon blu personalizzato (32x32px)
    - Markers visibili su zoom-in
  - **File Creati**:
    - `research/005-cesium-clustering/src/utils/generateMarkers.ts`
  - **File Modificati**:
    - `research/005-cesium-clustering/src/App.tsx`

- [ ] **T021** [M0] Misurare FPS con Chrome DevTools durante navigazione
  - **Effort**: 2 ore
  - **Priorità**: P0 (critical path)
  - **Assignee**: Frontend Developer
  - **Dipendenze**: T020
  - **Criteri Accettazione**:
    - FPS misurato durante pan, zoom, rotate camera
    - Registrazione Performance Profile di 60 secondi
    - FPS ≥60 durante navigazione standard
    - Screenshot Performance tab salvato
    - Test con 1000 markers visibili in viewport
  - **File Creati**:
    - `research/005-cesium-clustering/perf-results/fps-screenshot.png`
    - `research/005-cesium-clustering/perf-results/metrics.json`

- [ ] **T022** [M0] Testare libreria cesium-clustering (opzionale)
  - **Effort**: 3 ore
  - **Priorità**: P2 (nice-to-have)
  - **Assignee**: Frontend Developer
  - **Dipendenze**: T021
  - **Criteri Accettazione**:
    - Libreria `cesium-clustering` (o simile) integrata
    - Clustering attivo quando >20 markers in 1km²
    - Confronto FPS con/senza clustering documentato
  - **File Modificati**:
    - `research/005-cesium-clustering/package.json`
    - `research/005-cesium-clustering/src/App.tsx`

- [ ] **T023** [M0] Documentare findings RT-005 in specs/001-research.md
  - **Effort**: 1 ora
  - **Priorità**: P1
  - **Assignee**: Frontend Developer
  - **Dipendenze**: T021 (T022 opzionale)
  - **Criteri Accettazione**:
    - Sezione "RT-005 Findings" aggiunta
    - FPS results: "58-62 fps con 1000 markers"
    - Conclusione: CesiumJS performance sufficiente ✅
  - **File Modificati**:
    - `specs/001-research.md`

---

### Checkpoint M0: Research Complete ✅

**Criteri Completamento Milestone 0**:
- [ ] Tutti 5 Research Tasks (RT-001 a RT-005) completati
- [ ] File `specs/001-research.md` contiene findings per tutti RT
- [ ] Open Questions (OQ-001 a OQ-003) risolte con decisioni documentate
- [ ] ADR scritti se necessario (es. ADR-003 Prisma, ADR-004 DigitalOcean Spaces)

**Output Deliverables**:
- `specs/001-research.md` (completo)
- `research/` folder con 5 POC funzionanti
- Decisioni tecniche validate per procedere a M1

**Prossimo Step**: Milestone 1 - Backend API Implementation

---

## Milestone 1: Backend API Implementation (Settimane 2-3)

**Obiettivo**: API REST funzionante per upload IFC e query buildings spaziali

**Effort Totale**: 80 ore (2 settimane, 1 Backend Developer)

---

### Fase 1.1: Setup Progetto Backend

- [ ] **T024** [P] [M1] Inizializzare progetto Node.js 20 con TypeScript strict mode
  - **Effort**: 2 ore
  - **Priorità**: P0 (blocca tutto M1)
  - **Assignee**: Backend Developer
  - **Criteri Accettazione**:
    - Cartella `backend/` creata con `package.json`
    - TypeScript 5.3 configurato con `"strict": true`
    - `tsconfig.json` con target ES2022, module ESNext
    - Script `npm run dev` (ts-node-dev) e `npm run build` funzionanti
  - **File Creati**:
    - `backend/package.json`
    - `backend/tsconfig.json`
    - `backend/.gitignore`
    - `backend/.env.example`

- [ ] **T025** [P] [M1] Configurare Express.js 4.18 con middleware base
  - **Effort**: 2 ore
  - **Priorità**: P0
  - **Assignee**: Backend Developer
  - **Dipendenze**: T024
  - **Criteri Accettazione**:
    - Express server avviabile su porta 3000
    - Middleware: cors, helmet, express.json (body parser)
    - Health check endpoint: `GET /health` ritorna `{"status": "ok"}`
    - Server risponde a http://localhost:3000/health
  - **File Creati**:
    - `backend/src/index.ts`
    - `backend/src/app.ts`

- [ ] **T026** [P] [M1] Setup ESLint + Prettier con regole TypeScript strict
  - **Effort**: 1.5 ore
  - **Priorità**: P1
  - **Assignee**: Backend Developer
  - **Dipendenze**: T024
  - **Criteri Accettazione**:
    - ESLint configurato con `@typescript-eslint` plugin
    - Prettier integrato con ESLint
    - Script `npm run lint` passa senza errori
    - Pre-commit hook con Husky (opzionale ma raccomandato)
  - **File Creati**:
    - `backend/.eslintrc.json`
    - `backend/.prettierrc.json`

- [ ] **T027** [P] [M1] Setup Jest 29 per unit testing con coverage
  - **Effort**: 2 ore
  - **Priorità**: P0 (coverage enforcement)
  - **Assignee**: Backend Developer
  - **Dipendenze**: T024
  - **Criteri Accettazione**:
    - Jest configurato con ts-jest per TypeScript
    - Script `npm run test` esegue test
    - Script `npm run test:coverage` genera report
    - Coverage threshold configurato a 85% in `jest.config.js`
    - Test sample passa: `src/__tests__/sample.test.ts`
  - **File Creati**:
    - `backend/jest.config.js`
    - `backend/src/__tests__/sample.test.ts`

---

### Fase 1.2: Database Setup con Prisma + PostGIS

- [ ] **T028** [M1] Installare Prisma 5.7 e configurare PostgreSQL connection
  - **Effort**: 2 ore
  - **Priorità**: P0 (blocca tutto DB work)
  - **Assignee**: Backend Developer
  - **Dipendenze**: T024
  - **Criteri Accettazione**:
    - Prisma CLI installato (`npm install prisma --save-dev`)
    - `prisma init` eseguito
    - `DATABASE_URL` configurato in `.env`
    - Connessione a PostgreSQL testata con `prisma db push`
  - **File Creati**:
    - `backend/prisma/schema.prisma`
    - `backend/.env` (con DATABASE_URL placeholder)
  - **File Modificati**:
    - `backend/.env.example` (aggiungere DATABASE_URL)

- [ ] **T029** [M1] Creare Prisma schema per buildings e ifc_files (da Plan Section 6.1)
  - **Effort**: 3 ore
  - **Priorità**: P0
  - **Assignee**: Backend Developer
  - **Dipendenze**: T028
  - **Criteri Accettazione**:
    - `schema.prisma` contiene model Building e IfcFile
    - Colonna location come `Unsupported("geography(Point,4326)")`
    - Relazione IfcFile 1:N Building configurata
    - Indexes definiti: idx_buildings_location (Gist), idx_buildings_status
  - **File Modificati**:
    - `backend/prisma/schema.prisma`
  - **Riferimento**: Plan Section "Prisma Schema (ORM Definition)"

- [ ] **T030** [M1] Scrivere migration SQL 001_initial_schema.sql
  - **Effort**: 2 ore
  - **Priorità**: P0
  - **Assignee**: Backend Developer
  - **Dipendenze**: T029
  - **Criteri Accettazione**:
    - File `001_initial_schema.sql` creato da Plan Section 6.1
    - Include `CREATE EXTENSION postgis`
    - Tabelle buildings e ifc_files con tutti i campi
    - GiST index su location column
    - Trigger `update_updated_at_column` creato
    - Migration eseguibile con `psql -f 001_initial_schema.sql`
  - **File Creati**:
    - `backend/prisma/migrations/001_initial_schema.sql`
  - **Riferimento**: Plan Section "Migration: 001_initial_schema.sql"

- [ ] **T031** [M1] Eseguire migration su database locale e generare Prisma Client
  - **Effort**: 1 ora
  - **Priorità**: P0
  - **Assignee**: Backend Developer
  - **Dipendenze**: T030
  - **Criteri Accettazione**:
    - Migration eseguita: `npm run prisma:migrate`
    - Prisma Client generato: `npx prisma generate`
    - Tabelle verificate in database con psql o pgAdmin
    - Sample query SELECT funziona
  - **Comandi**:
    ```bash
    cd backend
    npx prisma migrate dev --name initial_schema
    npx prisma generate
    ```

- [ ] **T032** [M1] Creare seed script per dati di sviluppo
  - **Effort**: 2 ore
  - **Priorità**: P2 (nice-to-have per dev)
  - **Assignee**: Backend Developer
  - **Dipendenze**: T031
  - **Criteri Accettazione**:
    - Script `prisma/seed.ts` crea 3 building records sample
    - Include IfcFile associato
    - Coordinate WGS84 valide (es. Roma, Parigi, Londra)
    - Eseguibile con `npm run prisma:seed`
  - **File Creati**:
    - `backend/prisma/seed.ts`
  - **File Modificati**:
    - `backend/package.json` (aggiungere script prisma:seed)

---

### Fase 1.3: Servizi S3 e Upload

- [ ] **T033** [P] [M1] Installare AWS SDK v3 per S3
  - **Effort**: 0.5 ore
  - **Priorità**: P0
  - **Assignee**: Backend Developer
  - **Dipendenze**: T024
  - **Criteri Accettazione**:
    - Package `@aws-sdk/client-s3` e `@aws-sdk/s3-request-presigner` installati
    - S3Client configurabile via env vars (endpoint, region, credentials)
  - **File Modificati**:
    - `backend/package.json`

- [ ] **T034** [M1] Implementare S3Service per presigned URL generation
  - **Effort**: 3 ore
  - **Priorità**: P0 (critical path upload)
  - **Assignee**: Backend Developer
  - **Dipendenze**: T033
  - **Criteri Accettazione**:
    - File `src/services/s3Service.ts` creato
    - Metodo `generatePresignedUploadUrl(uuid, filename)` funzionante
    - URL expires dopo 15 minuti (900 secondi)
    - Configurabile bucket name via `S3_BUCKET` env var
  - **File Creati**:
    - `backend/src/services/s3Service.ts`
    - `backend/src/utils/config.ts` (per env vars)
  - **Riferimento**: Plan RT-004 findings

- [ ] **T035** [M1] Scrivere unit test per S3Service
  - **Effort**: 2 ore
  - **Priorità**: P0 (coverage requirement)
  - **Assignee**: Backend Developer
  - **Dipendenze**: T034
  - **Criteri Accettazione**:
    - File test creato con mock S3Client
    - Test: presigned URL contiene parametri corretti
    - Test: URL expiry = 900 secondi
    - Coverage ≥85% per s3Service.ts
  - **File Creati**:
    - `backend/tests/unit/s3Service.test.ts`

---

### Fase 1.4: API Endpoints Upload

- [ ] **T036** [M1] Creare router /api/v1/upload
  - **Effort**: 1 ora
  - **Priorità**: P0
  - **Assignee**: Backend Developer
  - **Dipendenze**: T025
  - **Criteri Accettazione**:
    - File `src/api/v1/upload.ts` creato con Express Router
    - Router montato in app.ts: `app.use('/api/v1/upload', uploadRouter)`
    - Route placeholder GET /api/v1/upload/test ritorna 200
  - **File Creati**:
    - `backend/src/api/v1/upload.ts`
  - **File Modificati**:
    - `backend/src/app.ts`

- [ ] **T037** [M1] Implementare POST /api/v1/upload/request con validation
  - **Effort**: 4 ore
  - **Priorità**: P0 (critical path)
  - **Assignee**: Backend Developer
  - **Dipendenze**: T036, T034
  - **Criteri Accettazione**:
    - Endpoint accetta JSON: `{filename, filesize, contentType}`
    - Validazione Zod schema: filename .ifc extension, filesize ≤104857600 (100MB)
    - Genera UUID per upload
    - Chiama S3Service per presigned URL
    - Ritorna JSON: `{uploadId, presignedUrl, expiresIn}`
    - Error 400 se validazione fallisce
  - **File Modificati**:
    - `backend/src/api/v1/upload.ts`
  - **File Creati**:
    - `backend/src/schemas/uploadRequest.schema.ts` (Zod schema)
  - **Riferimento**: Plan Contract "upload-request.openapi.yaml"

- [ ] **T038** [M1] Implementare POST /api/v1/upload/complete
  - **Effort**: 3 ore
  - **Priorità**: P0
  - **Assignee**: Backend Developer
  - **Dipendenze**: T037, T031
  - **Criteri Accettazione**:
    - Endpoint accetta JSON: `{uploadId, contributorName?, license?}`
    - Crea record in ifc_files table (Prisma)
    - Crea record in buildings table con status 'processing'
    - Pubblica job a Redis queue (stub per ora, implementazione reale in M2)
    - Ritorna 202 Accepted con `{buildingId, status, trackingUrl}`
  - **File Modificati**:
    - `backend/src/api/v1/upload.ts`
  - **File Creati**:
    - `backend/src/services/buildingService.ts` (Prisma CRUD)

- [ ] **T039** [M1] Aggiungere error handling middleware
  - **Effort**: 2 ore
  - **Priorità**: P1
  - **Assignee**: Backend Developer
  - **Dipendenze**: T025
  - **Criteri Accettazione**:
    - Middleware `errorHandler.ts` cattura errori Express
    - Ritorna JSON error response con format: `{error, message, details?}`
    - Log errori con Winston (se già configurato) o console.error
    - Status code appropriati: 400 (validation), 404 (not found), 500 (internal)
  - **File Creati**:
    - `backend/src/api/middleware/errorHandler.ts`
  - **File Modificati**:
    - `backend/src/app.ts` (aggiungere middleware come ultimo handler)

- [ ] **T040** [M1] Scrivere integration test per upload flow
  - **Effort**: 3 ore
  - **Priorità**: P0 (coverage + validation)
  - **Assignee**: Backend Developer
  - **Dipendenze**: T038
  - **Criteri Accettazione**:
    - Test con Supertest: POST /upload/request → 200 con presignedUrl
    - Test: POST /upload/complete → 202 con buildingId
    - Test: File size >100MB → 400 error
    - Test: Invalid filename (no .ifc) → 400 error
    - Mock S3Client (no real S3 calls)
  - **File Creati**:
    - `backend/tests/integration/uploadFlow.test.ts`

---

### Fase 1.5: API Endpoints Buildings Query

- [ ] **T041** [M1] Creare router /api/v1/buildings
  - **Effort**: 1 ora
  - **Priorità**: P0
  - **Assignee**: Backend Developer
  - **Dipendenze**: T025
  - **Criteri Accettazione**:
    - File `src/api/v1/buildings.ts` creato
    - Router montato in app.ts
    - Route placeholder GET /api/v1/buildings ritorna 200
  - **File Creati**:
    - `backend/src/api/v1/buildings.ts`
  - **File Modificati**:
    - `backend/src/app.ts`

- [ ] **T042** [M1] Implementare GET /api/v1/buildings?bbox=... con PostGIS query
  - **Effort**: 5 ore
  - **Priorità**: P0 (critical path discovery)
  - **Assignee**: Backend Developer
  - **Dipendenze**: T041, T031
  - **Criteri Accettazione**:
    - Endpoint accetta query param `bbox` (minLon,minLat,maxLon,maxLat)
    - Validazione bbox format con regex
    - Raw SQL query con Prisma.$queryRaw: `ST_Intersects(location, ST_MakeEnvelope(...))`
    - Ritorna GeoJSON FeatureCollection
    - Paginazione con `limit` param (default 100, max 1000)
    - Filtra per `status=completed` default
  - **File Modificati**:
    - `backend/src/api/v1/buildings.ts`
  - **File Creati**:
    - `backend/src/utils/geoJsonFormatter.ts` (converte DB results → GeoJSON)
  - **Riferimento**: Plan Contract "buildings-query.openapi.yaml"

- [ ] **T043** [M1] Implementare GET /api/v1/buildings/:buildingId
  - **Effort**: 2 ore
  - **Priorità**: P1
  - **Assignee**: Backend Developer
  - **Dipendenze**: T042
  - **Criteri Accettazione**:
    - Endpoint accetta UUID param
    - Query Prisma: `findUnique({ where: { id } })`
    - Ritorna building details + presigned download URL per IFC file
    - Error 404 se building non esiste
  - **File Modificati**:
    - `backend/src/api/v1/buildings.ts`

- [ ] **T044** [M1] Scrivere unit test per coordinateValidator
  - **Effort**: 2 ore
  - **Priorità**: P0 (coverage requirement)
  - **Assignee**: Backend Developer
  - **Dipendenze**: T042
  - **Criteri Accettazione**:
    - Test: coordinate valide (lat -90/+90, lon -180/+180) → pass
    - Test: coordinate invalide (lat 200) → throw error
    - Test: bbox parsing "12.4,41.8,12.5,41.9" → array [12.4, 41.8, 12.5, 41.9]
    - Coverage ≥85%
  - **File Creati**:
    - `backend/tests/unit/coordinateValidator.test.ts`
    - `backend/src/utils/coordinateValidator.ts` (se non già creato in T042)

- [ ] **T045** [M1] Scrivere integration test per spatial query
  - **Effort**: 3 ore
  - **Priorità**: P0
  - **Assignee**: Backend Developer
  - **Dipendenze**: T042, T032 (seed data)
  - **Criteri Accettazione**:
    - Test con Supertest + test database
    - Seed 5 buildings con coordinate note
    - Test: bbox query ritorna buildings corretti
    - Test: bbox fuori range (nessun building) → empty features array
    - Test: invalid bbox format → 400 error
  - **File Creati**:
    - `backend/tests/integration/spatialQuery.test.ts`

---

### Fase 1.6: Rate Limiting & Logging

- [ ] **T046** [P] [M1] Implementare rate limiter middleware (express-rate-limit)
  - **Effort**: 2 ore
  - **Priorità**: P1
  - **Assignee**: Backend Developer
  - **Dipendenze**: T025
  - **Criteri Accettazione**:
    - Package `express-rate-limit` installato
    - Rate limiter applicato a /api/v1/upload: 100 req/min per IP
    - Header `X-RateLimit-Limit`, `X-RateLimit-Remaining` inclusi in response
    - Error 429 con message "Too many requests" se limite superato
  - **File Creati**:
    - `backend/src/api/middleware/rateLimiter.ts`
  - **File Modificati**:
    - `backend/src/app.ts`

- [ ] **T047** [P] [M1] Setup Winston per structured logging
  - **Effort**: 2 ore
  - **Priorità**: P1
  - **Assignee**: Backend Developer
  - **Dipendenze**: T024
  - **Criteri Accettazione**:
    - Winston 3.11 installato
    - Logger configurato con JSON format
    - Correlation ID generato per ogni request (middleware)
    - Logs salvati in `logs/app.log` (dev) o stdout (prod)
    - Log levels: error, warn, info, debug
  - **File Creati**:
    - `backend/src/utils/logger.ts`
    - `backend/src/api/middleware/requestLogger.ts`
  - **File Modificati**:
    - `backend/src/app.ts`

---

### Checkpoint M1: Backend API Complete ✅

**Criteri Completamento Milestone 1**:
- [ ] API endpoints funzionanti:
  - POST /api/v1/upload/request
  - POST /api/v1/upload/complete
  - GET /api/v1/buildings?bbox=...
  - GET /api/v1/buildings/:id
  - GET /health
- [ ] Database schema migrato con PostGIS
- [ ] Test coverage ≥85% (unit + integration)
- [ ] Rate limiting attivo (100 req/min)
- [ ] Structured logging con Winston

**Test Manuale**:
```bash
# 1. Health check
curl http://localhost:3000/health

# 2. Request presigned URL
curl -X POST http://localhost:3000/api/v1/upload/request \
  -H "Content-Type: application/json" \
  -d '{"filename": "test.ifc", "filesize": 1024000}'

# 3. Query buildings (bbox Roma)
curl "http://localhost:3000/api/v1/buildings?bbox=12.4,41.8,12.5,41.9"
```

**Prossimo Step**: Milestone 2 - IFC Processor Service

---

## Milestone 2: IFC Processor Service (Settimana 4)

**Obiettivo**: Microservizio Python per parsing IFC e estrazione coordinate asincrone

**Effort Totale**: 40 ore (1 settimana, 1 Backend/Python Developer)

---

### Fase 2.1: Setup Progetto Python

- [ ] **T048** [P] [M2] Inizializzare progetto Python 3.11 con FastAPI
  - **Effort**: 2 ore
  - **Priorità**: P0 (blocca tutto M2)
  - **Assignee**: Backend Developer (Python)
  - **Criteri Accettazione**:
    - Cartella `ifc-processor/` creata
    - Virtualenv Python 3.11 attivo
    - `requirements.txt` con FastAPI 0.108, IfcOpenShell 0.7.0, Celery 5.3
    - FastAPI app avviabile con `uvicorn app.main:app`
    - Health endpoint: GET /health ritorna `{"status": "ok"}`
  - **File Creati**:
    - `ifc-processor/requirements.txt`
    - `ifc-processor/app/main.py`
    - `ifc-processor/.gitignore`

- [ ] **T049** [P] [M2] Configurare mypy per type checking
  - **Effort**: 1 ora
  - **Priorità**: P1
  - **Assignee**: Backend Developer (Python)
  - **Dipendenze**: T048
  - **Criteri Accettazione**:
    - mypy installato in requirements-dev.txt
    - `mypy.ini` configurato con strict mode
    - Script `make typecheck` passa senza errori
  - **File Creati**:
    - `ifc-processor/mypy.ini`
    - `ifc-processor/Makefile` (con target typecheck, test)

- [ ] **T050** [P] [M2] Setup pytest per testing
  - **Effort**: 1.5 ore
  - **Priorità**: P0
  - **Assignee**: Backend Developer (Python)
  - **Dipendenze**: T048
  - **Criteri Accettazione**:
    - pytest 7.4 installato
    - pytest-cov per coverage
    - Test sample passa: `tests/test_main.py`
    - Script `make test` esegue pytest con coverage
  - **File Creati**:
    - `ifc-processor/pytest.ini`
    - `ifc-processor/tests/test_main.py`
  - **File Modificati**:
    - `ifc-processor/Makefile`

---

### Fase 2.2: IfcOpenShell Integration

- [ ] **T051** [M2] Creare IfcParser service per estrazione coordinate
  - **Effort**: 4 ore
  - **Priorità**: P0 (critical path)
  - **Assignee**: Backend Developer (Python)
  - **Dipendenze**: T048
  - **Criteri Accettazione**:
    - File `app/services/ifcopenshell_parser.py` creato
    - Metodo `extract_coordinates(ifc_file_path)` funzionante
    - Estrae IfcSite.RefLatitude e RefLongitude
    - Converte DMS → decimal (riutilizza logica da RT-001)
    - Gestisce IFC2x3, IFC4, IFC4x3
    - Ritorna dict: `{lat, lon, elevation, ifc_schema}`
    - Raise custom exception se IfcSite mancante
  - **File Creati**:
    - `ifc-processor/app/services/ifcopenshell_parser.py`
    - `ifc-processor/app/models/ifc_metadata.py` (Pydantic model per output)
  - **Riferimento**: Plan RT-001 findings + T004 script

- [ ] **T052** [M2] Gestire edge case: IFC senza coordinate
  - **Effort**: 2 ore
  - **Priorità**: P0
  - **Assignee**: Backend Developer (Python)
  - **Dipendenze**: T051
  - **Criteri Accettazione**:
    - Se IfcSite.RefLatitude è None → raise `MissingCoordinatesError`
    - Error catturato in caller, building status aggiornato a 'pending_geolocation'
    - Log warning con building ID
  - **File Modificati**:
    - `ifc-processor/app/services/ifcopenshell_parser.py`
  - **File Creati**:
    - `ifc-processor/app/exceptions.py` (custom exceptions)

- [ ] **T053** [M2] Scrivere unit test per IfcParser con sample IFC files
  - **Effort**: 3 ore
  - **Priorità**: P0 (coverage requirement)
  - **Assignee**: Backend Developer (Python)
  - **Dipendenze**: T051, T003 (sample files)
  - **Criteri Accettazione**:
    - Test con Schependomlaan.ifc (IFC4) → coordinate estratte
    - Test con IFC senza IfcSite → MissingCoordinatesError
    - Test con coordinate DMS → conversione corretta a decimal
    - Coverage ≥85% per ifcopenshell_parser.py
  - **File Creati**:
    - `ifc-processor/tests/test_ifc_parser.py`
  - **File Copiati**:
    - Sample IFC files da `research/sample-ifc-files/` a `ifc-processor/tests/fixtures/`

---

### Fase 2.3: ClamAV Malware Scanning

- [ ] **T054** [M2] Integrare pyclamd per ClamAV scanning
  - **Effort**: 3 ore
  - **Priorità**: P1 (sicurezza importante ma non blocca MVP)
  - **Assignee**: Backend Developer (Python)
  - **Dipendenze**: T048
  - **Criteri Accettazione**:
    - pyclamd installato in requirements.txt
    - File `app/services/clamav_scanner.py` creato
    - Metodo `scan_file(file_path)` ritorna: "clean", "infected", o "error"
    - Si connette a ClamAV daemon via TCP (host/port configurabili)
    - Timeout 60 secondi per scan
  - **File Creati**:
    - `ifc-processor/app/services/clamav_scanner.py`

- [ ] **T055** [M2] Gestire file infetti: Update database status + log
  - **Effort**: 2 ore
  - **Priorità**: P1
  - **Assignee**: Backend Developer (Python)
  - **Dipendenze**: T054
  - **Criteri Accettazione**:
    - Se scan ritorna "infected" → Update ifc_files.clamav_status = 'infected'
    - Update buildings.upload_status = 'failed'
    - buildings.error_message = "Malware detected in uploaded file"
    - Log error con file hash per investigazione
  - **File Modificati**:
    - `ifc-processor/app/services/clamav_scanner.py`
    - `ifc-processor/app/workers/ifc_validation.py` (creato in T057)

---

### Fase 2.4: Celery Async Job Queue

- [ ] **T056** [M2] Configurare Celery con Redis broker
  - **Effort**: 2 ore
  - **Priorità**: P0 (async processing fondamentale)
  - **Assignee**: Backend Developer (Python)
  - **Dipendenze**: T048
  - **Criteri Accettazione**:
    - Celery 5.3 configurato in `celeryconfig.py`
    - Redis come message broker (URL da env var)
    - Worker avviabile con `celery -A app.workers worker --loglevel=info`
    - Task di test eseguibile: `add(2, 2)` ritorna 4
  - **File Creati**:
    - `ifc-processor/celeryconfig.py`
    - `ifc-processor/app/workers/__init__.py`
    - `ifc-processor/app/workers/test_task.py` (task sample per verifica)

- [ ] **T057** [M2] Implementare Celery task per IFC validation
  - **Effort**: 4 ore
  - **Priorità**: P0 (critical path)
  - **Assignee**: Backend Developer (Python)
  - **Dipendenze**: T056, T051, T054
  - **Criteri Accettazione**:
    - File `app/workers/ifc_validation.py` creato
    - Task `@app.task def validate_ifc_file(building_id, s3_key)`
    - Flow:
      1. Download IFC da S3
      2. Scan con ClamAV
      3. Parse con IfcOpenShell → extract coordinates
      4. Update database (buildings.location, status = 'completed')
    - Gestisce errori: Update status = 'failed' + error_message
    - Task timeout 10 minuti (per file grandi)
  - **File Creati**:
    - `ifc-processor/app/workers/ifc_validation.py`
    - `ifc-processor/app/utils/s3_downloader.py` (helper per download da S3)

- [ ] **T058** [M2] Collegare backend Node.js a Celery queue (publish job)
  - **Effort**: 2 ore
  - **Priorità**: P0
  - **Assignee**: Backend Developer
  - **Dipendenze**: T057, T038 (upload/complete endpoint)
  - **Criteri Accettazione**:
    - Package `bull` o simile installato in backend Node.js (per Redis queue)
    - POST /upload/complete pubblica job a Redis queue
    - Job payload: `{building_id, s3_key}`
    - Celery worker consuma job e esegue validate_ifc_file
  - **File Creati**:
    - `backend/src/services/jobQueueService.ts`
  - **File Modificati**:
    - `backend/src/api/v1/upload.ts` (aggiungere jobQueue.publish)

- [ ] **T059** [M2] Scrivere integration test per Celery task
  - **Effort**: 3 ore
  - **Priorità**: P1
  - **Assignee**: Backend Developer (Python)
  - **Dipendenze**: T057
  - **Criteri Accettazione**:
    - Test con sample IFC file: Task completa successfully
    - Test verifica database updated con coordinates
    - Test con IFC malformed → status 'failed'
    - Mock S3 download (usa file locale)
  - **File Creati**:
    - `ifc-processor/tests/test_celery_tasks.py`

---

### Fase 2.5: FastAPI Endpoints (Optional)

- [ ] **T060** [M2] Creare endpoint POST /api/ifc/validate per validazione sincrona
  - **Effort**: 2 ore
  - **Priorità**: P2 (nice-to-have, non usato da frontend MVP)
  - **Assignee**: Backend Developer (Python)
  - **Dipendenze**: T051
  - **Criteri Accettazione**:
    - Endpoint accetta file upload (multipart/form-data)
    - Valida IFC schema
    - Estrae coordinate
    - Ritorna JSON: `{schema, georeferenced, coordinates?}`
    - No database update (solo validazione)
  - **File Modificati**:
    - `ifc-processor/app/main.py`

---

### Checkpoint M2: IFC Processor Service Complete ✅

**Criteri Completamento Milestone 2**:
- [ ] IfcOpenShell parsing funzionante (coordinate extraction)
- [ ] ClamAV malware scanning integrato
- [ ] Celery worker consuma job da Redis queue
- [ ] Backend Node.js pubblica job a queue su upload complete
- [ ] Database aggiornato con coordinate dopo processing
- [ ] Test coverage ≥85% (Python)

**Test End-to-End**:
1. Upload IFC via POST /api/v1/upload/request + complete
2. Verifica job appare in Redis queue
3. Celery worker processa job
4. Database building status diventa 'completed'
5. Coordinate presenti in buildings.location

**Prossimo Step**: Milestone 3 - Frontend Components

---

## Milestone 3: Frontend Components (Settimane 5-6)

**Obiettivo**: React app con upload UI, CesiumJS globe, e IFC 3D viewer

**Effort Totale**: 80 ore (2 settimane, 1 Frontend Developer)

---

### Fase 3.1: Setup Progetto Frontend

- [ ] **T061** [P] [M3] Inizializzare progetto Vite + React 18 con TypeScript
  - **Effort**: 2 ore
  - **Priorità**: P0 (blocca tutto M3)
  - **Assignee**: Frontend Developer
  - **Criteri Accettazione**:
    - Cartella `frontend/` creata con `npm create vite@latest`
    - React 18.2 + TypeScript 5.3
    - Vite dev server avviabile su http://localhost:5173
    - `tsconfig.json` con strict mode
  - **File Creati**:
    - `frontend/package.json`
    - `frontend/vite.config.ts`
    - `frontend/tsconfig.json`
    - `frontend/src/main.tsx`

- [ ] **T062** [P] [M3] Installare dipendenze: CesiumJS, web-ifc, Zustand
  - **Effort**: 1.5 ore
  - **Priorità**: P0
  - **Assignee**: Frontend Developer
  - **Dipendenze**: T061
  - **Criteri Accettazione**:
    - CesiumJS 1.112.0 installato
    - web-ifc 0.0.53, web-ifc-three 0.0.124 installati
    - Zustand 4.4.7 (state management)
    - react-dropzone 14.2.3 (drag-drop upload)
    - Vite build passa senza errori
  - **File Modificati**:
    - `frontend/package.json`

- [ ] **T063** [P] [M3] Configurare ESLint + Prettier + jsx-a11y plugin
  - **Effort**: 2 ore
  - **Priorità**: P1 (accessibility enforcement)
  - **Assignee**: Frontend Developer
  - **Dipendenze**: T061
  - **Criteri Accettazione**:
    - ESLint con `eslint-plugin-jsx-a11y` installato
    - Prettier configurato
    - Script `npm run lint` passa
    - Regole WCAG AA enforced (es. aria-label required)
  - **File Creati**:
    - `frontend/.eslintrc.json`
    - `frontend/.prettierrc.json`

- [ ] **T064** [P] [M3] Setup React Testing Library + Jest
  - **Effort**: 2 ore
  - **Priorità**: P0
  - **Assignee**: Frontend Developer
  - **Dipendenze**: T061
  - **Criteri Accettazione**:
    - @testing-library/react installato
    - Vitest configurato (alternativa Jest più veloce con Vite)
    - Test sample passa: `src/__tests__/App.test.tsx`
    - Script `npm run test` esegue test
  - **File Creati**:
    - `frontend/vitest.config.ts`
    - `frontend/src/__tests__/App.test.tsx`

---

### Fase 3.2: Zustand State Management

- [ ] **T065** [M3] Creare uploadStore per stato upload
  - **Effort**: 2 ore
  - **Priorità**: P0
  - **Assignee**: Frontend Developer
  - **Dipendenze**: T062
  - **Criteri Accettazione**:
    - File `src/store/uploadStore.ts` creato
    - State: `{uploadState, progress, uploadId, buildingId, errorMessage}`
    - Actions: `startUpload(file)`, `cancelUpload()`, `resetUpload()`
    - Integra con API: POST /upload/request e /upload/complete
  - **File Creati**:
    - `frontend/src/store/uploadStore.ts`
    - `frontend/src/services/api/uploadApi.ts` (fetch wrapper)

- [ ] **T066** [M3] Creare buildingsStore per buildings list e selected
  - **Effort**: 2 ore
  - **Priorità**: P0
  - **Assignee**: Frontend Developer
  - **Dipendenze**: T062
  - **Criteri Accettazione**:
    - File `src/store/buildingsStore.ts` creato
    - State: `{buildings[], selectedBuilding, loading, error}`
    - Actions: `fetchBuildings(bbox)`, `selectBuilding(id)`
    - Integra con API: GET /buildings?bbox=...
  - **File Creati**:
    - `frontend/src/store/buildingsStore.ts`
    - `frontend/src/services/api/buildingsApi.ts`

- [ ] **T067** [M3] Definire TypeScript types per Building, UploadState
  - **Effort**: 1 ora
  - **Priorità**: P0 (type safety)
  - **Assignee**: Frontend Developer
  - **Dipendenze**: T061
  - **Criteri Accettazione**:
    - File `src/types/index.ts` creato
    - Interfaces: Building, UploadState, BuildingMarker, IFCWorkerMessage
    - Allineati con API response schemas
  - **File Creati**:
    - `frontend/src/types/index.ts`
  - **Riferimento**: Plan Section "TypeScript Interfaces"

---

### Fase 3.3: Upload Component

- [ ] **T068** [M3] Creare UploadZone component con react-dropzone
  - **Effort**: 4 ore
  - **Priorità**: P0 (critical path user story 1)
  - **Assignee**: Frontend Developer
  - **Dipendenze**: T065, T067
  - **Criteri Accettazione**:
    - Component `src/components/UploadZone/UploadZone.tsx` creato
    - Drag-and-drop funzionante con react-dropzone
    - Validazione client-side: max 100MB, solo .ifc extension
    - Chiama uploadStore.startUpload(file)
    - ARIA labels per accessibility
  - **File Creati**:
    - `frontend/src/components/UploadZone/UploadZone.tsx`
    - `frontend/src/components/UploadZone/UploadZone.module.css`
  - **Riferimento**: Plan Section "UploadZone Component"

- [ ] **T069** [M3] Creare ProgressBar component
  - **Effort**: 2 ore
  - **Priorità**: P0
  - **Assignee**: Frontend Developer
  - **Dipendenze**: T068
  - **Criteri Accettazione**:
    - Component `src/components/UploadZone/ProgressBar.tsx`
    - Mostra progress 0-100%
    - Animazione smooth (CSS transition)
    - Label "Uploading... 45%" con aria-valuenow
  - **File Creati**:
    - `frontend/src/components/UploadZone/ProgressBar.tsx`

- [ ] **T070** [M3] Implementare logica upload: request URL → PUT S3 → complete
  - **Effort**: 3 ore
  - **Priorità**: P0
  - **Assignee**: Frontend Developer
  - **Dipendenze**: T068, T065
  - **Criteri Accettazione**:
    - Flow completo:
      1. POST /upload/request → presignedUrl
      2. fetch(presignedUrl, {method: 'PUT', body: file})
      3. Track progress con onUploadProgress
      4. POST /upload/complete → buildingId
    - Error handling: display user-friendly message
  - **File Modificati**:
    - `frontend/src/store/uploadStore.ts`
    - `frontend/src/services/api/uploadApi.ts`

- [ ] **T071** [M3] Scrivere unit test per UploadZone component
  - **Effort**: 2 ore
  - **Priorità**: P1
  - **Assignee**: Frontend Developer
  - **Dipendenze**: T068
  - **Criteri Accettazione**:
    - Test: render component → mostra "Drag & drop" text
    - Test: drop file >100MB → shows error message
    - Test: drop .txt file → shows "Only .ifc files" error
    - Mock uploadStore.startUpload
  - **File Creati**:
    - `frontend/src/components/UploadZone/UploadZone.test.tsx`

---

### Fase 3.4: CesiumJS Globe Component

- [ ] **T072** [M3] Configurare Cesium Ion token in env vars
  - **Effort**: 0.5 ore
  - **Priorità**: P0 (blocca Cesium rendering)
  - **Assignee**: Frontend Developer
  - **Dipendenze**: T061
  - **Criteri Accettazione**:
    - `.env.example` contiene `VITE_CESIUM_ION_TOKEN=`
    - Token caricato da env in vite.config.ts
    - README istruzioni per ottenere token gratuito da ion.cesium.com
  - **File Creati**:
    - `frontend/.env.example`
  - **File Modificati**:
    - `frontend/vite.config.ts`

- [ ] **T073** [M3] Creare CesiumGlobe component base
  - **Effort**: 4 ore
  - **Priorità**: P0 (critical path user story 2)
  - **Assignee**: Frontend Developer
  - **Dipendenze**: T072, T066
  - **Criteri Accettazione**:
    - Component `src/components/CesiumGlobe/CesiumGlobe.tsx`
    - Cesium.Viewer inizializzato con terrainProvider
    - Globe renderizzato a schermo intero
    - Camera fly-to initial view (Roma: 41.89°N, 12.49°E, 5000m height)
    - Ref al viewer esposto per access esterno
  - **File Creati**:
    - `frontend/src/components/CesiumGlobe/CesiumGlobe.tsx`
    - `frontend/src/components/CesiumGlobe/CesiumGlobe.module.css`
  - **Riferimento**: Plan Section "CesiumGlobe Component"

- [ ] **T074** [M3] Aggiungere building markers da buildingsStore
  - **Effort**: 3 ore
  - **Priorità**: P0
  - **Assignee**: Frontend Developer
  - **Dipendenze**: T073
  - **Criteri Accettazione**:
    - useEffect che ascolta buildingsStore.buildings
    - Per ogni building: crea Cesium.Entity con billboard
    - Icon blu 32x32px (salvato in `public/marker-blue.png`)
    - Marker posizionato a (lon, lat, elevation)
    - Cleanup: rimuove entity on unmount
  - **File Modificati**:
    - `frontend/src/components/CesiumGlobe/CesiumGlobe.tsx`
  - **File Creati**:
    - `frontend/public/marker-blue.png`

- [ ] **T075** [M3] Implementare marker click handler
  - **Effort**: 2 ore
  - **Priorità**: P0 (user story 3)
  - **Assignee**: Frontend Developer
  - **Dipendenze**: T074
  - **Criteri Accettazione**:
    - ScreenSpaceEventHandler per LEFT_CLICK
    - Pick entity sotto mouse
    - Chiama buildingsStore.selectBuilding(id)
    - Prop callback `onBuildingClick(buildingId)`
  - **File Modificati**:
    - `frontend/src/components/CesiumGlobe/CesiumGlobe.tsx`

- [ ] **T076** [M3] Implementare keyboard navigation per markers (WCAG AA)
  - **Effort**: 3 ore
  - **Priorità**: P1 (accessibility requirement)
  - **Assignee**: Frontend Developer
  - **Dipendenze**: T075
  - **Criteri Accettazione**:
    - Tab key cycles through markers
    - Enter key selects focused marker
    - Arrow keys pan camera (N/S/E/W)
    - +/- keys zoom in/out
    - ARIA live region announces "Selected: Building Name"
  - **File Creati**:
    - `frontend/src/components/CesiumGlobe/KeyboardControls.tsx`
  - **File Modificati**:
    - `frontend/src/components/CesiumGlobe/CesiumGlobe.tsx`
  - **Riferimento**: Constitution §4.4 Keyboard Navigation

- [ ] **T077** [M3] Implementare marker clustering (optional performance)
  - **Effort**: 4 ore
  - **Priorità**: P2 (nice-to-have se FPS ok senza)
  - **Assignee**: Frontend Developer
  - **Dipendenze**: T074
  - **Criteri Accettazione**:
    - Quando >20 markers in viewport → mostra cluster icon
    - Cluster label: "15 buildings"
    - Click su cluster → zoom-in to expand
    - FPS test: 60fps con 100 markers
  - **File Creati**:
    - `frontend/src/components/CesiumGlobe/MarkerClusterer.tsx`

---

### Fase 3.5: InfoPanel Component

- [ ] **T078** [M3] Creare InfoPanel component per building details
  - **Effort**: 3 ore
  - **Priorità**: P1 (user story 4 attribution)
  - **Assignee**: Frontend Developer
  - **Dipendenze**: T066
  - **Criteri Accettazione**:
    - Component `src/components/InfoPanel/InfoPanel.tsx`
    - Mostra quando buildingsStore.selectedBuilding !== null
    - Display: name, contributor, uploadDate, license, ifcSchema
    - Download button con link a GET /buildings/:id (presigned IFC URL)
    - Close button (X) → deselect building
  - **File Creati**:
    - `frontend/src/components/InfoPanel/InfoPanel.tsx`
    - `frontend/src/components/InfoPanel/InfoPanel.module.css`
  - **Riferimento**: Constitution §1.7 Attribution Display

- [ ] **T079** [M3] Creare LicenseBadge component (CC-BY 4.0 visual)
  - **Effort**: 2 ore
  - **Priorità**: P1
  - **Assignee**: Frontend Developer
  - **Dipendenze**: T078
  - **Criteri Accettazione**:
    - Badge CC-BY 4.0 o CC0 basato su building.license
    - Link a https://creativecommons.org/licenses/by/4.0/
    - Tooltip spiega license brevemente
  - **File Creati**:
    - `frontend/src/components/InfoPanel/LicenseBadge.tsx`

---

### Fase 3.6: IFC Viewer Component (3D Model)

- [ ] **T080** [M3] Creare Web Worker per web-ifc parsing
  - **Effort**: 4 ore
  - **Priorità**: P0 (performance requirement)
  - **Assignee**: Frontend Developer
  - **Dipendenze**: T062
  - **Criteri Accettazione**:
    - File `src/workers/ifcWorker.ts` creato
    - Worker init IfcAPI
    - Riceve ArrayBuffer IFC via postMessage
    - Parse geometry con web-ifc + web-ifc-three
    - Ritorna Three.js BufferGeometry array
    - Progress updates: 0-100%
  - **File Creati**:
    - `frontend/src/workers/ifcWorker.ts`
  - **Riferimento**: Plan RT-002 findings

- [ ] **T081** [M3] Creare IFCViewer component con Three.js renderer
  - **Effort**: 5 ore
  - **Priorità**: P1 (user story 3 complete)
  - **Assignee**: Frontend Developer
  - **Dipendenze**: T080
  - **Criteri Accettazione**:
    - Component `src/components/IFCViewer/IFCViewer.tsx`
    - Modal/fullscreen view quando building selected
    - Download IFC file da backend
    - Invia a ifcWorker per parsing
    - Render geometry in Three.js scene
    - Loading spinner durante parsing
  - **File Creati**:
    - `frontend/src/components/IFCViewer/IFCViewer.tsx`
    - `frontend/src/components/IFCViewer/IFCViewer.module.css`

- [ ] **T082** [M3] Aggiungere OrbitControls per camera 3D
  - **Effort**: 2 ore
  - **Priorità**: P1
  - **Assignee**: Frontend Developer
  - **Dipendenze**: T081
  - **Criteri Accettazione**:
    - Three.js OrbitControls installato
    - Mouse drag per ruotare camera
    - Scroll per zoom in/out
    - Right-click drag per pan
    - Auto-rotate disabilitato default
  - **File Creati**:
    - `frontend/src/components/IFCViewer/CameraControls.tsx`

- [ ] **T083** [M3] Implementare element highlighting on hover
  - **Effort**: 3 ore
  - **Priorità**: P2 (nice-to-have)
  - **Assignee**: Frontend Developer
  - **Dipendenze**: T081
  - **Criteri Accettazione**:
    - Raycaster detect element sotto mouse
    - Elemento highlighted (giallo) on hover
    - Tooltip mostra "IfcWall: Concrete 300mm"
  - **File Modificati**:
    - `frontend/src/components/IFCViewer/IFCViewer.tsx`

---

### Fase 3.7: Pages & Routing

- [ ] **T084** [M3] Creare HomePage con UploadZone
  - **Effort**: 2 ore
  - **Priorità**: P0
  - **Assignee**: Frontend Developer
  - **Dipendenze**: T068
  - **Criteri Accettazione**:
    - Component `src/pages/HomePage.tsx`
    - Layout: Hero section + UploadZone centrale
    - Copy: "Upload IFC models to the world's open digital twin"
    - Link a GlobeViewPage dopo upload complete
  - **File Creati**:
    - `frontend/src/pages/HomePage.tsx`

- [ ] **T085** [M3] Creare GlobeViewPage con CesiumGlobe + InfoPanel
  - **Effort**: 3 ore
  - **Priorità**: P0
  - **Assignee**: Frontend Developer
  - **Dipendenze**: T073, T078
  - **Criteri Accettazione**:
    - Component `src/pages/GlobeViewPage.tsx`
    - Layout: CesiumGlobe fullscreen, InfoPanel overlay (right sidebar)
    - Fetch buildings on mount: buildingsStore.fetchBuildings(defaultBbox)
    - IFCViewer modal quando building clicked
  - **File Creati**:
    - `frontend/src/pages/GlobeViewPage.tsx`

- [ ] **T086** [M3] Setup React Router per navigation HomePage ↔ GlobeViewPage
  - **Effort**: 1.5 ore
  - **Priorità**: P1
  - **Assignee**: Frontend Developer
  - **Dipendenze**: T084, T085
  - **Criteri Accettazione**:
    - react-router-dom installato
    - Routes: `/` → HomePage, `/globe` → GlobeViewPage
    - Navigation dopo upload complete: `navigate('/globe')`
  - **File Modificati**:
    - `frontend/src/main.tsx`
  - **File Creati**:
    - `frontend/src/App.tsx` (router container)

---

### Fase 3.8: Testing & Polish

- [ ] **T087** [M3] Scrivere integration test per upload flow con React Testing Library
  - **Effort**: 3 ore
  - **Priorità**: P1
  - **Assignee**: Frontend Developer
  - **Dipendenze**: T070
  - **Criteri Accettazione**:
    - Test: render UploadZone → drop file → shows progress
    - Mock API calls (uploadApi.requestPresignedUrl, uploadApi.complete)
    - Test: upload success → navigate to /globe
    - Test: upload error → shows error message
  - **File Creati**:
    - `frontend/src/components/UploadZone/UploadZone.integration.test.tsx`

- [ ] **T088** [M3] Scrivere unit test per buildingsStore
  - **Effort**: 2 ore
  - **Priorità**: P1
  - **Assignee**: Frontend Developer
  - **Dipendenze**: T066
  - **Criteri Accettazione**:
    - Test: fetchBuildings() updates buildings state
    - Test: selectBuilding(id) updates selectedBuilding
    - Mock fetch API
  - **File Creati**:
    - `frontend/src/store/buildingsStore.test.ts`

- [ ] **T089** [M3] Ottimizzare bundle size con code splitting
  - **Effort**: 2 ore
  - **Priorità**: P2 (performance enhancement)
  - **Assignee**: Frontend Developer
  - **Dipendenze**: T086
  - **Criteri Accettazione**:
    - Lazy load CesiumJS: `const CesiumGlobe = lazy(() => import('./CesiumGlobe'))`
    - Lazy load IFCViewer
    - Vite `manualChunks` config per vendor chunks
    - Bundle size <5MB (escluso Cesium assets)
  - **File Modificati**:
    - `frontend/vite.config.ts`
    - `frontend/src/pages/GlobeViewPage.tsx`

---

### Checkpoint M3: Frontend Complete ✅

**Criteri Completamento Milestone 3**:
- [ ] UploadZone funzionante (drag-drop, progress, error handling)
- [ ] CesiumGlobe rendering con building markers
- [ ] Marker click opens InfoPanel
- [ ] IFCViewer loads 3D geometry in modal
- [ ] Keyboard navigation (Tab, Enter, Arrow keys)
- [ ] React Router: HomePage → GlobeViewPage
- [ ] Test coverage ≥80% (unit + integration)

**Test Manuale**:
1. Apri http://localhost:5173
2. Drag-drop IFC file → vedi progress bar
3. Upload completa → redirect to /globe
4. Vedi marker su mappa → click marker
5. InfoPanel si apre → click "View 3D"
6. IFCViewer mostra geometry → ruota con mouse

**Prossimo Step**: Milestone 4 - Integration & Performance Testing

---

## Milestone 4: Integration & Performance Testing (Settimane 7-8)

**Obiettivo**: Docker Compose setup, CI/CD pipeline, E2E testing, performance optimization

**Effort Totale**: 80 ore (2 settimane, 2 developers)

---

### Fase 4.1: Docker Compose Setup

- [ ] **T090** [M4] Creare Dockerfile per backend Node.js
  - **Effort**: 2 ore
  - **Priorità**: P0
  - **Assignee**: Backend Developer
  - **Criteri Accettazione**:
    - `backend/Dockerfile` multi-stage build
    - Stage 1: build TypeScript
    - Stage 2: production image (node:20-alpine)
    - CMD: `node dist/index.js`
    - Image size <200MB
  - **File Creati**:
    - `backend/Dockerfile`
    - `backend/.dockerignore`

- [ ] **T091** [M4] Creare Dockerfile per ifc-processor Python
  - **Effort**: 2 ore
  - **Priorità**: P0
  - **Assignee**: Backend Developer (Python)
  - **Criteri Accettazione**:
    - `ifc-processor/Dockerfile`
    - Base image: python:3.11-slim
    - Install IfcOpenShell from pip
    - CMD: `celery -A app.workers worker`
  - **File Creati**:
    - `ifc-processor/Dockerfile`
    - `ifc-processor/.dockerignore`

- [ ] **T092** [M4] Creare Dockerfile.dev per frontend con hot reload
  - **Effort**: 1.5 ore
  - **Priorità**: P1
  - **Assignee**: Frontend Developer
  - **Criteri Accettazione**:
    - `frontend/Dockerfile.dev` con Vite dev server
    - Volume mount `./src` per hot reload
    - Expose port 5173
  - **File Creati**:
    - `frontend/Dockerfile.dev`

- [ ] **T093** [M4] Creare docker-compose.yml completo (da Plan Section 9.1)
  - **Effort**: 4 ore
  - **Priorità**: P0 (blocca local dev setup)
  - **Assignee**: Full-Stack Developer
  - **Dipendenze**: T090, T091, T092
  - **Criteri Accettazione**:
    - File `infrastructure/docker-compose.yml` con 7 services:
      - postgres (PostGIS), redis, minio, clamav
      - backend, ifc-processor, frontend
    - Environment variables configurati
    - Health checks definiti
    - Volumes per persistenza dati
    - Avviabile con `docker-compose up -d`
  - **File Creati**:
    - `infrastructure/docker-compose.yml`
    - `infrastructure/.env.example`
  - **Riferimento**: Plan Section "Docker Compose Configuration"

- [ ] **T094** [M4] Testare stack completo con docker-compose
  - **Effort**: 2 ore
  - **Priorità**: P0
  - **Assignee**: Full-Stack Developer
  - **Dipendenze**: T093
  - **Criteri Accettazione**:
    - Tutti containers avviano senza errori
    - Backend accessibile su http://localhost:3000
    - Frontend accessibile su http://localhost:5173
    - PostgreSQL accetta connessioni
    - Redis ping funziona
    - MinIO console accessibile
  - **Comandi Test**:
    ```bash
    docker-compose up -d
    docker-compose logs -f backend
    curl http://localhost:3000/health
    ```

- [ ] **T095** [M4] Scrivere docs/local-setup.md quickstart guide
  - **Effort**: 2 ore
  - **Priorità**: P1
  - **Assignee**: Chiunque
  - **Dipendenze**: T094
  - **Criteri Accettazione**:
    - Step-by-step istruzioni:
      1. Clone repo
      2. Copy .env.example → .env
      3. docker-compose up
      4. Access http://localhost:5173
    - Troubleshooting section
  - **File Creati**:
    - `docs/local-setup.md`

---

### Fase 4.2: GitHub Actions CI/CD

- [ ] **T096** [M4] Creare workflow CI per backend tests
  - **Effort**: 3 ore
  - **Priorità**: P0
  - **Assignee**: Backend Developer
  - **Criteri Accettazione**:
    - File `.github/workflows/ci.yml` con job `test-backend`
    - Setup Node.js 20, PostgreSQL service
    - Run `npm run test` con coverage
    - Upload coverage a Codecov
    - Enforce 85% coverage threshold
  - **File Creati**:
    - `.github/workflows/ci.yml`
  - **Riferimento**: Plan Section "GitHub Actions Workflow"

- [ ] **T097** [M4] Creare workflow CI per ifc-processor tests
  - **Effort**: 2 ore
  - **Priorità**: P0
  - **Assignee**: Backend Developer (Python)
  - **Dipendenze**: T096
  - **Criteri Accettazione**:
    - Job `test-ifc-processor` in workflow
    - Setup Python 3.11
    - Run pytest con coverage
    - Upload coverage a Codecov
  - **File Modificati**:
    - `.github/workflows/ci.yml`

- [ ] **T098** [M4] Creare workflow CI per frontend tests
  - **Effort**: 2 ore
  - **Priorità**: P0
  - **Assignee**: Frontend Developer
  - **Dipendenze**: T096
  - **Criteri Accettazione**:
    - Job `test-frontend` in workflow
    - Run ESLint, TypeScript type-check
    - Run Vitest con coverage
    - Upload coverage a Codecov
  - **File Modificati**:
    - `.github/workflows/ci.yml`

- [ ] **T099** [M4] Aggiungere Lighthouse CI per performance check
  - **Effort**: 3 ore
  - **Priorità**: P0 (success criteria SC-003)
  - **Assignee**: Frontend Developer
  - **Dipendenze**: T098
  - **Criteri Accettazione**:
    - Job `lighthouse-performance` in workflow
    - Build frontend production
    - Run Lighthouse CI con `lighthouserc.json`
    - Enforce FCP <1.5s threshold
    - Fail CI se threshold non rispettato
  - **File Creati**:
    - `frontend/lighthouserc.json`
  - **File Modificati**:
    - `.github/workflows/ci.yml`
  - **Riferimento**: Constitution §1.2 Performance Excellence

- [ ] **T100** [M4] Aggiungere security scan job (Snyk, npm audit)
  - **Effort**: 2 ore
  - **Priorità**: P1
  - **Assignee**: Backend Developer
  - **Dipendenze**: T096
  - **Criteri Accettazione**:
    - Job `security-scan` in workflow
    - Run Snyk per backend e frontend
    - Run `npm audit --audit-level=high`
    - Fail se high-severity vulnerabilities trovate
  - **File Modificati**:
    - `.github/workflows/ci.yml`
  - **Riferimento**: Constitution §1.3 Security (48h SLA patches)

- [ ] **T101** [M4] Aggiungere accessibility audit job (axe)
  - **Effort**: 2 ore
  - **Priorità**: P1 (success criteria SC-005)
  - **Assignee**: Frontend Developer
  - **Dipendenze**: T098
  - **Criteri Accettazione**:
    - Job `accessibility-audit` in workflow
    - Run axe-core CLI scan
    - Threshold ≥90 score
    - Upload report come artifact
  - **File Modificati**:
    - `.github/workflows/ci.yml`

---

### Fase 4.3: E2E Testing con Playwright

- [ ] **T102** [M4] Setup Playwright in frontend project
  - **Effort**: 2 ore
  - **Priorità**: P0
  - **Assignee**: Frontend Developer
  - **Criteri Accettazione**:
    - Playwright 1.40 installato
    - `playwright.config.ts` configurato
    - Test sample passa: `tests/e2e/homepage.spec.ts`
    - Script `npm run test:e2e` esegue Playwright
  - **File Creati**:
    - `frontend/playwright.config.ts`
    - `frontend/tests/e2e/homepage.spec.ts`

- [ ] **T103** [M4] Scrivere E2E test: Upload IFC flow
  - **Effort**: 4 ore
  - **Priorità**: P0 (success criteria SC-007)
  - **Assignee**: Frontend Developer
  - **Dipendenze**: T102
  - **Criteri Accettazione**:
    - Test: Navigate to homepage → upload IFC → verify redirect to /globe
    - Test: Check marker appears on globe
    - Test: Measure end-to-end time <30 secondi
    - Mock backend API responses con MSW (Mock Service Worker)
  - **File Creati**:
    - `frontend/tests/e2e/upload-flow.spec.ts`

- [ ] **T104** [M4] Scrivere E2E test: Globe navigation & building click
  - **Effort**: 3 ore
  - **Priorità**: P1
  - **Assignee**: Frontend Developer
  - **Dipendenze**: T102
  - **Criteri Accettazione**:
    - Test: Navigate to /globe → click marker → InfoPanel opens
    - Test: Keyboard navigation (Tab, Enter) selects building
    - Test: Click "View 3D" → IFCViewer modal opens
  - **File Creati**:
    - `frontend/tests/e2e/globe-navigation.spec.ts`

- [ ] **T105** [M4] Integrare Playwright in CI workflow
  - **Effort**: 2 ore
  - **Priorità**: P1
  - **Assignee**: Frontend Developer
  - **Dipendenze**: T102, T096
  - **Criteri Accettazione**:
    - Job `e2e-tests` in workflow
    - Start services con docker-compose.ci.yml
    - Run Playwright tests
    - Upload report come artifact
  - **File Creati**:
    - `infrastructure/docker-compose.ci.yml` (versione CI con seed data)
  - **File Modificati**:
    - `.github/workflows/ci.yml`

---

### Fase 4.4: Monitoring & Observability

- [ ] **T106** [M4] Installare Prometheus exporters in backend
  - **Effort**: 3 ore
  - **Priorità**: P1
  - **Assignee**: Backend Developer
  - **Criteri Accettazione**:
    - Package `prom-client` installato
    - Metrics definiti: upload_requests_total, ifc_processing_duration_seconds, etc.
    - Endpoint GET /metrics espone metrics Prometheus format
  - **File Creati**:
    - `backend/src/utils/metrics.ts`
  - **Riferimento**: Plan Section "Prometheus Metrics"

- [ ] **T107** [M4] Creare Grafana dashboard configuration
  - **Effort**: 3 ore
  - **Priorità**: P2
  - **Assignee**: Backend Developer
  - **Dipendenze**: T106
  - **Criteri Accettazione**:
    - File `infrastructure/grafana/dashboards/ifc-openworld.json`
    - 4 panels: Upload success rate, P95 processing time, API latency, DB pool
    - Dashboard importabile in Grafana
  - **File Creati**:
    - `infrastructure/grafana/dashboards/ifc-openworld.json`
    - `infrastructure/prometheus.yml` (Prometheus config)

- [ ] **T108** [M4] Setup Sentry per error tracking (optional)
  - **Effort**: 2 ore
  - **Priorità**: P2 (nice-to-have)
  - **Assignee**: Full-Stack Developer
  - **Criteri Accettazione**:
    - Sentry SDK installato in backend e frontend
    - DSN configurato in env vars
    - Errors automaticamente reportati a Sentry dashboard
  - **File Modificati**:
    - `backend/src/index.ts`
    - `frontend/src/main.tsx`

---

### Fase 4.5: Performance Optimization

- [ ] **T109** [M4] Ottimizzare query PostGIS con EXPLAIN ANALYZE
  - **Effort**: 3 ore
  - **Priorità**: P1
  - **Assignee**: Backend Developer
  - **Criteri Accettazione**:
    - Run EXPLAIN ANALYZE su query bbox
    - Verify Index Scan used (no Seq Scan)
    - Query time <100ms per 10k buildings
    - Document findings in docs/performance-tuning.md
  - **File Creati**:
    - `docs/performance-tuning.md`

- [ ] **T110** [M4] Implementare caching con Redis per buildings query
  - **Effort**: 3 ore
  - **Priorità**: P2 (nice-to-have)
  - **Assignee**: Backend Developer
  - **Dipendenze**: T042
  - **Criteri Accettazione**:
    - Cache buildings query results in Redis
    - TTL 5 minuti
    - Cache invalidation on new building upload
    - Reduce database load
  - **File Creati**:
    - `backend/src/services/cacheService.ts`
  - **File Modificati**:
    - `backend/src/api/v1/buildings.ts`

- [ ] **T111** [M4] Testare performance con k6 load testing
  - **Effort**: 3 ore
  - **Priorità**: P1 (success criteria SC-001)
  - **Assignee**: Backend Developer
  - **Criteri Accettazione**:
    - Script k6 creato: `tests/load/api-load-test.js`
    - Simulate 1000 concurrent users
    - Test endpoints: /health, /buildings?bbox=...
    - Verify p95 latency <500ms
    - Verify error rate <1%
  - **File Creati**:
    - `tests/load/api-load-test.js`

- [ ] **T112** [M4] Misurare FPS Cesium con 1000 markers (manual test)
  - **Effort**: 2 ore
  - **Priorità**: P1 (success criteria SC-004)
  - **Assignee**: Frontend Developer
  - **Criteri Accettazione**:
    - Add 1000 test markers on globe
    - Record 60s Performance Profile in Chrome DevTools
    - Verify FPS ≥60 during pan/zoom
    - Screenshot + metrics saved in docs/performance-tests/
  - **File Creati**:
    - `docs/performance-tests/cesium-fps-test.md`

---

### Fase 4.6: Documentation & Final Polish

- [ ] **T113** [M4] Aggiornare README.md root con project overview
  - **Effort**: 2 ore
  - **Priorità**: P1
  - **Assignee**: Chiunque
  - **Criteri Accettazione**:
    - README include:
      - Project description (IFC-OpenWorld mission)
      - Architecture diagram (link to Plan)
      - Quickstart link (docs/local-setup.md)
      - Contributing guidelines
      - License (MIT)
  - **File Modificati**:
    - `README.md`

- [ ] **T114** [M4] Generare API documentation da OpenAPI schemas
  - **Effort**: 2 ore
  - **Priorità**: P2
  - **Assignee**: Backend Developer
  - **Criteri Accettazione**:
    - Tool Swagger/Redoc installato
    - Serve API docs su GET /api/docs
    - Include tutti endpoints con examples
  - **File Creati**:
    - `backend/src/api/swagger.ts`
  - **File Modificati**:
    - `backend/src/app.ts`

- [ ] **T115** [M4] Scrivere ADR-003 (Prisma ORM decision)
  - **Effort**: 1.5 ore
  - **Priorità**: P2
  - **Assignee**: Backend Developer
  - **Criteri Accettazione**:
    - File `docs/adrs/003-prisma-orm.md` creato
    - Context, Decision, Rationale, Alternatives, Trade-offs documentati
  - **File Creati**:
    - `docs/adrs/003-prisma-orm.md`
  - **Riferimento**: Plan Section "ADR-003"

- [ ] **T116** [M4] Scrivere ADR-004 (DigitalOcean Spaces decision)
  - **Effort**: 1.5 ore
  - **Priorità**: P2
  - **Assignee**: Backend Developer
  - **Criteri Accettazione**:
    - File `docs/adrs/004-s3-provider.md` creato
    - Cost comparison table inclusa
  - **File Creati**:
    - `docs/adrs/004-s3-provider.md`

- [ ] **T117** [M4] Code cleanup: rimuovere console.log, TODO comments
  - **Effort**: 2 ore
  - **Priorità**: P2
  - **Assignee**: Chiunque
  - **Criteri Accettazione**:
    - Grep per `console.log` → sostituire con logger
    - Grep per `TODO` → creare GitHub issues o risolvere
    - ESLint `no-console` rule attivata

- [ ] **T118** [M4] Implementare axe-core color contrast check in CI (Constitution §4.4)
  - **Effort**: 2 ore
  - **Priorità**: P0 (critical path - accessibility compliance)
  - **Assignee**: Frontend Developer
  - **Dipendenze**: T101
  - **Criteri Accettazione**:
    - axe-core integrato nel workflow T101 accessibility audit
    - Rule `color-contrast` attivata in configurazione axe
    - CI fallisce se contrast ratio <4.5:1 rilevato (WCAG AA)
    - Documentare eventuali eccezioni in `.axerc.json` con justification
    - Test manuale: verificare contrast ratio su CTA buttons, markers tooltips
  - **File Modificati**:
    - `.github/workflows/ci.yml` (aggiungere --rules=color-contrast a axe-cli)
    - `frontend/.axerc.json` (configurazione axe-core)
  - **Riferimenti**:
    - Constitution §4.4: "Minimum color contrast ratio of 4.5:1"
    - FR-021: Color contrast requirement
    - WCAG 2.1 Level AA Success Criterion 1.4.3

---

### Checkpoint M4: Integration & Testing Complete ✅

**Criteri Completamento Milestone 4**:
- [ ] Docker Compose stack completo funzionante
- [ ] CI/CD pipeline con 6 jobs (tests, lighthouse, security, accessibility, e2e)
- [ ] E2E tests passano (upload flow, globe navigation)
- [ ] Performance tests eseguiti (k6 load test, FPS test)
- [ ] Prometheus metrics esposte
- [ ] Documentation aggiornata (README, API docs, ADRs)
- [ ] All Success Criteria validated (SC-001 a SC-010)

**Validation Checklist**:
- [ ] SC-001: Upload success rate ≥95% (da validare in prod dopo 30 giorni)
- [ ] SC-002: 3D load time <3s (E2E test)
- [ ] SC-003: FCP <1.5s (Lighthouse CI)
- [ ] SC-004: 60fps navigation (manual test)
- [ ] SC-005: WCAG AA score ≥90 (axe audit)
- [ ] SC-006: Zero high-severity CVEs (Snyk)
- [ ] SC-007: 30s user journey (E2E test)
- [ ] SC-008: 100 buildings in 30 days (post-launch tracking)
- [ ] SC-009: 10 contributors (post-launch)
- [ ] SC-010: Zero DMCA (post-launch)

**Ready for Private Alpha**: ✅

---

## Dependencies & Critical Path

### Critical Path (Task Chain Blocker)

**Percorso Critico** (longest dependency chain):

```
M0: T001 → T002 → T004 → T005
     ↓
M1: T024 → T028 → T029 → T030 → T031
     ↓
M1: T034 → T037 → T038
     ↓
M2: T048 → T051 → T057 → T058
     ↓
M3: T061 → T065 → T068 → T070
     ↓
M3: T072 → T073 → T074 → T075
     ↓
M4: T093 → T094 → T096 → T099
```

**Tempo Totale Critical Path**: ~150 ore (≈ 4 settimane con 1 persona, 2 settimane con 2 persone in parallelo)

---

### Milestone Dependencies

```
M0 (Research)
  ↓ (findings validate architecture)
M1 (Backend API) + M2 (IFC Processor) [parallelizzabili parzialmente]
  ↓ (API endpoints pronti)
M3 (Frontend) [dipende da M1 API, può iniziare mentre M2 in corso]
  ↓ (componenti integrati)
M4 (Integration & Testing) [richiede M1+M2+M3 completi]
```

---

### Parallel Opportunities

**Milestone 0**: Tutti Research Tasks (RT-001 a RT-005) possono essere eseguiti in parallelo da 2-3 persone

**Milestone 1 + 2**: Backend API (M1) e IFC Processor (M2) possono procedere in parallelo dopo T031 (database setup)

**Milestone 3**: Frontend può iniziare mentre M2 (IFC Processor) è in corso, usando API mock

**Milestone 4**: Integration tasks possono essere split tra backend dev (CI/CD, monitoring) e frontend dev (E2E tests, performance)

---

## Effort Summary per Milestone

| Milestone | Descrizione | Effort (ore) | Durata (settimane) | Team Suggerito |
|-----------|-------------|--------------|---------------------|----------------|
| **M0** | Research & Prototyping | 40 | 1 | 1 Full-Stack |
| **M1** | Backend API | 80 | 2 | 1 Backend Dev |
| **M2** | IFC Processor | 40 | 1 | 1 Backend/Python Dev |
| **M3** | Frontend Components | 80 | 2 | 1 Frontend Dev |
| **M4** | Integration & Testing | 80 | 2 | 2 Developers (1 Backend + 1 Frontend) |
| **TOTAL** | | **320** | **8** | **2 Developers in parallelo** |

**Note**:
- M1 e M2 possono sovrapporsi parzialmente (risparmiare 1 settimana)
- M3 può iniziare mentre M2 in corso (risparmiare 0.5 settimane)
- Con 2 developers full-time, stimato **6-8 settimane** totali per MVP

---

## Task Statistics

**Totale Tasks**: 117
- **Milestone 0** (Research): 23 tasks
- **Milestone 1** (Backend): 22 tasks
- **Milestone 2** (IFC Processor): 13 tasks
- **Milestone 3** (Frontend): 29 tasks
- **Milestone 4** (Integration): 30 tasks

**Priority Breakdown**:
- **P0 (Critical Path)**: 68 tasks (58%)
- **P1 (Important)**: 35 tasks (30%)
- **P2 (Nice-to-Have)**: 14 tasks (12%)

**Test Tasks**: 18 tasks (15% del totale)
- Unit tests: 8 tasks
- Integration tests: 6 tasks
- E2E tests: 4 tasks

---

## Next Steps

1. **Review & Approve Tasks**: Team review di questo breakdown (1 giorno)
2. **Create GitHub Issues**: Importare tasks come GitHub Issues con labels milestone, priority (1 giorno)
3. **Sprint Planning**: Assegnare primi 10-15 tasks per Sprint 1 (M0 Research)
4. **Kickoff**: Iniziare con T001-T003 setup environment
5. **Weekly Sync**: Review progress ogni venerdì, adjust plan se necessario

---

**Fine Task Breakdown**

*"Da specifica a produzione: 117 task atomici per costruire il digital twin aperto del mondo."*
