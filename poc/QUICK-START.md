# POC Quick Start Guide

**5-Minute Setup** per iniziare la validazione tech stack.

---

## ⚡ Prerequisites Check

```bash
# Verifica che hai tutto installato
node --version    # Serve v20+
python --version  # Serve v3.11+
docker --version  # Serve per POC-4
```

**Non hai qualcosa?** Vedi [README.md](README.md) section "Setup Globale"

---

## 🚀 Quick Start by Priority

### **FASE 1: Validazioni Critiche** (12 ore)

#### POC-1: IfcOpenShell (4h) - START HERE 🔴

```bash
cd POC-1-ifcopenshell/

# Setup
python -m venv venv
.\venv\Scripts\Activate.ps1  # Windows PowerShell
pip install -r requirements.txt

# Test
python extract_coordinates.py

# Documenta
# Compila RESULTS.md
```

**Se FAIL** → STOP e valuta IFC.js alternative
**Se PASS** → Continua POC-2

---

#### POC-2: CesiumJS (8h) 🔴

```bash
cd ../POC-2-cesium-viewer/

# Setup
npm create vite@latest . -- --template react-ts
npm install
npm install cesium web-ifc web-ifc-three three

# IMPORTANTE: Copia vite.config.ts fornito (vedi README)

# Get Cesium token (GRATIS)
# https://ion.cesium.com/signup

# Test
npm run dev
# Apri http://localhost:5173

# Documenta
# Compila RESULTS.md
```

**Se FAIL** → PIVOT architettura frontend
**Se PASS** → ✅ Core validato! Continua POC-3/4

---

### **FASE 2: Validazioni Non-Critiche** (8 ore)

#### POC-3: Upload (4h) 🟡

```bash
cd ../POC-3-upload-test/

npm install

# Crea file test 50MB
node -e "require('fs').writeFileSync('test_50mb.bin', Buffer.alloc(50*1024*1024))"

node server.js
# Apri client.html in browser
```

---

#### POC-4: PostGIS (4h) 🟡

```bash
cd ../POC-4-postgis-test/

docker-compose up -d
sleep 10  # Wait for PostgreSQL startup

docker exec -i postgis-test psql -U test -d testdb < seed_data.sql
docker exec -i postgis-test psql -U test -d testdb < spatial_queries.sql

# Guarda execution times nella console
```

---

## 📋 After All POC

```bash
cd ..

# Compila POC-SUMMARY.md
# Decisione: GO / PIVOT / NO-GO

# Se GO:
# - Aggiorna specs/ con learnings
# - Inizia Milestone 0
```

---

## 🆘 Emergency Contacts

**Se bloccato >2 ore su un POC**:
1. Documenta blocker in RESULTS.md
2. Passa al POC successivo
3. Torna dopo con mente fresca

**Se POC-1 o POC-2 FAIL**:
→ Leggi "Alternative Approaches" in POC-SUMMARY.md

---

## ⏱️ Time Budget

- **POC-1**: Max 4h (se stuck → documenta e STOP)
- **POC-2**: Max 8h (più complesso, OK prendere tempo)
- **POC-3**: Max 4h (semplice, se >4h c'è problema)
- **POC-4**: Max 4h (può skippare se Docker problematico)

**TOTAL**: 20 ore max

**Regola d'oro**: Se un POC prende >2x tempo stimato → c'è un problema sistemico, non è solo "debugging normale".

---

## ✅ Success Indicators

Sai che stai andando bene se:
- [ ] Installation smooth, pochi problemi
- [ ] Error messages comprensibili
- [ ] Quando blocchi, Google trova soluzioni
- [ ] Ti diverti! (Se frustrante = red flag)

---

**Ready?** → Vai a `POC-1-ifcopenshell/README.md` 🚀
