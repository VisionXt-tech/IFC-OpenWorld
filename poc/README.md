# IFC-OpenWorld - POC Validation (Budget Zero)

**Obiettivo**: Validare lo stack tecnologico principale con risorse locali prima di investire 320+ ore nell'implementazione completa.

**Budget**: €0 (tutto in locale con Docker + filesystem)
**Tempo Stimato**: 20 ore totali (4-8 ore per POC)
**Prerequisiti Hardware**: 8GB RAM, 10GB storage libero, CPU i5+ o equivalente

---

## 📊 Status POC

| ID | Validazione | Status | Tempo | Critico? | Risultato |
|----|-------------|--------|-------|----------|-----------|
| **POC-1** | IFC Coordinate Extraction (IfcOpenShell) | ⏳ TODO | 4h | 🔴 SI | - |
| **POC-2** | CesiumJS + web-ifc Rendering | ⏳ TODO | 8h | 🔴 SI | - |
| **POC-3** | File Upload Simulation (50MB) | ⏳ TODO | 4h | 🟡 NO | - |
| **POC-4** | PostgreSQL+PostGIS Spatial Queries | ⏳ TODO | 4h | 🟡 NO | - |

**Legenda Status**:
- ⏳ TODO - Non iniziato
- 🔄 IN PROGRESS - In corso
- ✅ PASS - Validazione superata
- ❌ FAIL - Validazione fallita (richiede pivot)
- ⚠️ PARTIAL - Funziona con limitazioni

---

## 🎯 Ordine di Esecuzione Raccomandato

### **Fase 1: Validazioni Critiche** (POC-1 + POC-2)
Queste sono **BLOCCANTI** - se falliscono, l'intero progetto deve cambiare architettura.

1. **POC-1 PRIMA** (4 ore)
   - Se IfcOpenShell non funziona su Windows → cercare alternative (IFC.js)
   - Se non estrae coordinate → revisione Constitution §2.7

2. **POC-2 DOPO** (8 ore)
   - Se web-ifc non parsa IFC → fallback a server-side parsing
   - Se CesiumJS performance <30fps → considerare Three.js standalone

**Decision Point 1**: Se POC-1 o POC-2 falliscono → STOP e rivedi architettura

---

### **Fase 2: Validazioni Non-Critiche** (POC-3 + POC-4)
Questi possono essere aggiustati senza riscrivere tutto.

3. **POC-3** (4 ore)
   - Se upload 50MB fallisce → riduci limite a 20MB o chunked upload

4. **POC-4** (4 ore)
   - Se PostGIS troppo complesso → fallback a SQLite + SpatiaLite

---

## 🛠️ Setup Globale (Fare UNA VOLTA)

### Prerequisiti da Installare

```bash
# 1. Node.js 20 LTS
# Download: https://nodejs.org/en/download/
node --version  # Verifica: v20.x.x

# 2. Python 3.11
# Download: https://www.python.org/downloads/
python --version  # Verifica: 3.11.x

# 3. Docker Desktop (per PostgreSQL+PostGIS)
# Download: https://www.docker.com/products/docker-desktop/
docker --version  # Verifica: Docker version 24.x

# 4. Git (se non già installato)
git --version
```

### Verifica Sistema

```bash
# Controlla RAM disponibile
# Windows PowerShell:
Get-CimInstance Win32_OperatingSystem | Select FreePhysicalMemory

# Controlla spazio disco
# Windows:
dir C:\

# Dovrebbe mostrare almeno 10GB liberi
```

---

## 📁 Struttura POC

```
poc/
├── README.md (questo file)
├── POC-SUMMARY.md (compilare DOPO aver finito tutti i POC)
│
├── POC-1-ifcopenshell/
│   ├── README.md              # Istruzioni setup
│   ├── requirements.txt       # Python dependencies
│   ├── extract_coordinates.py # Script validazione
│   ├── sample_files/          # IFC test files
│   └── RESULTS.md             # Documentare findings
│
├── POC-2-cesium-viewer/
│   ├── README.md
│   ├── package.json
│   ├── vite.config.ts
│   ├── src/
│   │   ├── main.tsx
│   │   ├── CesiumTest.tsx
│   │   └── IFCLoader.worker.ts
│   └── RESULTS.md
│
├── POC-3-upload-test/
│   ├── README.md
│   ├── package.json
│   ├── server.js
│   ├── client.html
│   ├── uploads/              # Storage locale (gitignored)
│   └── RESULTS.md
│
└── POC-4-postgis-test/
    ├── README.md
    ├── docker-compose.yml
    ├── seed_data.sql
    ├── spatial_queries.sql
    └── RESULTS.md
```

---

## 🚦 Go/No-Go Decision Matrix

Dopo aver completato tutti i POC, compila questa matrice:

### Scenario A: ✅ Tutti PASS
**Decisione**: GO - Procedi con Milestone 0 (Research) della spec completa
**Next Step**: Crea repository Git ufficiale, setup CI/CD

### Scenario B: ❌ POC-1 o POC-2 FAIL
**Decisione**: PIVOT ARCHITETTURA
**Next Step**:
- Se POC-1 fail → Valuta IFC.js (JavaScript-native parser)
- Se POC-2 fail → Valuta Three.js standalone o Babylon.js
- Aggiorna Constitution §2.2 (Technology Stack)
- Rigenera PLAN-001 con nuova architettura

### Scenario C: ⚠️ POC-1/2 PASS, POC-3/4 PARTIAL
**Decisione**: GO con modifiche minori
**Next Step**:
- Aggiorna requisiti (es: max 20MB invece di 100MB)
- Modifica NFR-002, NFR-005 nella spec
- Procedi con Milestone 0

### Scenario D: ❌ Multiple FAIL
**Decisione**: NO-GO - Ripensa progetto
**Next Step**:
- Semplifica scope (es: solo viewer statico, no upload)
- Considera stack completamente diverso
- O abbandona progetto (meglio 20 ore perse che 320)

---

## 📝 Come Documentare i Risultati

In ogni `RESULTS.md` usa questo formato:

```markdown
# POC-X Results

**Data**: 2025-10-23
**Tempo Impiegato**: X ore
**Status Finale**: ✅ PASS / ❌ FAIL / ⚠️ PARTIAL

## Setup Issues
- Issue 1: [descrizione]
  - Soluzione: [come risolto]

## Test Eseguiti
1. Test nome
   - Expected: [cosa ti aspettavi]
   - Actual: [cosa è successo]
   - Result: ✅/❌

## Performance Metrics
- Metric 1: [valore]
- Metric 2: [valore]

## Learnings Chiave
- Learning 1
- Learning 2

## Raccomandazioni per Spec
- [ ] Modifica da fare in SPEC-001
- [ ] Modifica da fare in PLAN-001
```

---

## 🎓 Learning Goals per POC

Alla fine dei 4 POC dovresti saper rispondere:

1. **IfcOpenShell funziona sul mio sistema?** (Windows/Mac/Linux)
2. **web-ifc può parsare IFC 50MB in <5 secondi?**
3. **CesiumJS mantiene 30+ fps con 1 building?**
4. **Upload 50MB completa senza crash?**
5. **PostGIS query <100ms su 1000 records?**
6. **Ho le skill per implementare questo stack?** (onestà!)
7. **Posso debuggare quando qualcosa non funziona?**

Se rispondi **"Sì"** a 5/7 domande → GO
Se rispondi **"No"** a 3+ domande → PIVOT

---

## 🔗 Collegamenti Utili

- **SPEC-001**: `../specs/001-ifc-upload-visualization.md`
- **PLAN-001**: `../specs/001-plan.md`
- **TASKS-001**: `../specs/001-tasks.md`
- **Constitution**: `../CONSTITUTION.md`

---

## 🚀 Quick Start

```bash
# 1. Naviga alla cartella POC
cd poc/

# 2. Inizia con POC-1 (il più critico)
cd POC-1-ifcopenshell/
cat README.md  # Leggi le istruzioni

# 3. Quando POC-1 completato, documenta
# Compila RESULTS.md con findings

# 4. Passa a POC-2
cd ../POC-2-cesium-viewer/
cat README.md

# ... ripeti per tutti i POC

# 5. Alla fine, compila summary
cd ..
# Crea POC-SUMMARY.md con decisione GO/NO-GO/PIVOT
```

---

## ❓ Troubleshooting

### "Non ho 10GB liberi"
- Riduci sample IFC files (usa solo 1-2 file da 10MB invece di 50MB)
- PostGIS: usa 100 records invece di 1000

### "Docker non parte"
- POC-4 è opzionale se Docker problematico
- Alternativa: PostgreSQL installato localmente (più complesso)

### "Python/Node non installano librerie"
- Controlla firewall/antivirus
- Usa VPN se azienda blocca NPM registry
- Alternativa: scarica dependencies offline

### "Tutto è troppo complicato"
- STOP - questo è un segnale importante
- Considera stack più semplice (es: solo frontend statico)
- O trova un collaboratore con più esperienza

---

**Pronto per iniziare? Vai a `POC-1-ifcopenshell/README.md`** 🚀
