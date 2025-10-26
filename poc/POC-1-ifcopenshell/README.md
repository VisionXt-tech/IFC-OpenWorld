# POC-1: IFC Coordinate Extraction with IfcOpenShell

**Priorità**: 🔴 CRITICA - Questo è il POC più importante. Se fallisce, tutto il progetto deve essere ripensato.

**Tempo Stimato**: 4 ore
**Difficoltà**: ⭐⭐ Medio (installazione Python può dare problemi)

---

## 🎯 Obiettivo

Validare che **IfcOpenShell** (libreria Python di buildingSMART) può:
1. Installarsi correttamente sul tuo sistema Windows
2. Aprire file IFC4 senza crash
3. Estrarre coordinate geografiche da `IfcSite.RefLatitude` e `RefLongitude`
4. Convertire formato DMS (degrees, minutes, seconds) → decimal degrees
5. Processare file 50MB in <5 secondi

---

## 📋 Criteri di Successo

### ✅ PASS se:
- [ ] IfcOpenShell installa senza errori
- [ ] Script estrae coordinate da almeno 2/3 sample IFC files
- [ ] Conversione DMS → decimal corretta (es: 41°53'24.8"N → 41.890222)
- [ ] Tempo elaborazione <5 secondi per file 50MB
- [ ] Coordinate validate in range: lat [-90, +90], lon [-180, +180]

### ❌ FAIL se:
- IfcOpenShell non compila su Windows
- Crash su IFC4 files validi
- Coordinate estratte sbagliate (off by >100 meters)
- Tempo elaborazione >10 secondi per 50MB

### ⚠️ PARTIAL se:
- Funziona solo su IFC2x3 (non IFC4)
- Alcuni IFC files non hanno IfcSite (gestibile con fallback UI)

---

## 🛠️ Setup (Step-by-Step)

### Step 1: Crea Virtual Environment

```bash
# Naviga alla cartella POC-1
cd poc/POC-1-ifcopenshell/

# Crea virtual environment Python
python -m venv venv

# Attiva environment
# Windows (PowerShell):
.\venv\Scripts\Activate.ps1

# Windows (CMD):
venv\Scripts\activate.bat

# Verifica attivazione (dovresti vedere "(venv)" nel prompt)
```

### Step 2: Installa IfcOpenShell

```bash
# Installa dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Verifica installazione
python -c "import ifcopenshell; print(ifcopenshell.version)"
# Expected output: 0.7.0 o superiore
```

**⚠️ Troubleshooting**:
- Se `pip install ifcopenshell` fallisce su Windows:
  ```bash
  # Prova con pre-built wheel:
  pip install ifcopenshell --pre --extra-index-url https://blenderbim.org/builds/
  ```
- Se ancora fallisce: documenta in RESULTS.md → questo è un BLOCKER critico

### Step 3: Download Sample IFC Files

**Opzione A - Manual Download** (raccomandato):
1. Vai a https://github.com/buildingSMART/Sample-Test-Files/tree/master/IFC%204.0
2. Scarica 2-3 file IFC4 (preferibilmente con IfcSite):
   - `Clinic_A_20110906.ifc` (1.6 MB)
   - `rac_advanced_sample_project.ifc` (5.3 MB)
3. Copia i file in `sample_files/`

**Opzione B - Test File Minimale**:
Se non trovi file con coordinate, usa il test file minimale già incluso in questo repo (vedi `sample_files/minimal_with_site.ifc` - lo creerò dopo).

### Step 4: Esegui Script di Validazione

```bash
# Esegui extraction su tutti i file nella cartella
python extract_coordinates.py

# Output atteso:
# ✅ File: Clinic_A_20110906.ifc
#    Coordinates: (51.234567, -0.123456, 12.5)
#    Processing time: 1.2s
#
# ❌ File: file_without_site.ifc
#    Error: No IfcSite found
```

---

## 📝 Script di Test

Il file `extract_coordinates.py` è già fornito e fa:

1. **Load IFC**: Apre file con IfcOpenShell
2. **Find IfcSite**: Cerca entità IfcSite nel modello
3. **Extract Coordinates**: Legge RefLatitude, RefLongitude, RefElevation
4. **Convert DMS → Decimal**: Converte formato buildingSMART
5. **Validate Range**: Verifica lat/lon in range valido
6. **Measure Time**: Cronometra performance

---

## 🧪 Test Cases da Verificare

### Test 1: IFC4 File con Coordinate (Happy Path)
```bash
python extract_coordinates.py sample_files/Clinic_A_20110906.ifc
```
**Expected**: Coordinate estratte correttamente, tempo <3s

### Test 2: IFC4 File SENZA IfcSite
```bash
python extract_coordinates.py sample_files/no_site.ifc
```
**Expected**: Warning "No IfcSite found", exit gracefully (no crash)

### Test 3: File IFC2x3 (Legacy)
```bash
python extract_coordinates.py sample_files/legacy_ifc2x3.ifc
```
**Expected**: Funziona lo stesso (IfcSite esiste anche in 2x3)

### Test 4: File IFC Grande (50MB+)
```bash
# Se hai un file 50MB, testa performance
python extract_coordinates.py sample_files/large_building.ifc
```
**Expected**: Tempo <5s (se >10s, potrebbe essere problematico)

---

## 📊 Metriche da Raccogliere

Documenta in `RESULTS.md`:

```markdown
## Performance Metrics

| File Name | Size | IFC Schema | Has IfcSite? | Extraction Time | Coordinates | Valid? |
|-----------|------|------------|--------------|-----------------|-------------|--------|
| Clinic_A  | 1.6MB | IFC4      | ✅ Yes       | 1.2s            | (51.23, -0.12, 12.5) | ✅ |
| ...       | ...   | ...        | ...          | ...             | ...         | ... |
```

---

## 🔍 Cosa Osservare Durante Test

1. **Installazione smooth?**
   - Se IfcOpenShell richiede compilazione da sorgenti → PROBLEMA (troppo complesso per utenti)

2. **Error messages comprensibili?**
   - Se crash con stack trace incomprensibile → UX problem

3. **Conversione DMS corretta?**
   - Verifica manualmente 1-2 coordinate con Google Maps:
     - Paste coordinate in Maps
     - Controlla che building sia nel paese giusto (no in mezzo oceano!)

4. **Memory usage**
   - Apri Task Manager durante test
   - Python dovrebbe usare <500MB RAM per file 50MB

---

## 🚨 Red Flags (Stop Signals)

Se vedi uno di questi, STOP e documenta in RESULTS.md:

❌ **BLOCKER**: IfcOpenShell non installa dopo 2 ore di troubleshooting
   → Decisione: Valuta IFC.js (JavaScript alternative)

❌ **BLOCKER**: Crash su tutti gli IFC4 files
   → Decisione: Check versione Python (richiede 3.9+?)

⚠️ **WARNING**: Coordinate estratte sempre (0, 0, 0)
   → Potrebbe essere problema di sample files (scarica altri file)

⚠️ **WARNING**: Tempo elaborazione >10s per 10MB file
   → Potrebbe essere problema performance PC (continua comunque)

---

## 📖 Riferimenti Tecnici

- **IfcOpenShell Docs**: https://blenderbim.org/docs-python/
- **IFC Schema Browser**: https://ifc43-docs.standards.buildingsmart.org/
- **IfcSite Documentation**: https://standards.buildingsmart.org/IFC/RELEASE/IFC4/ADD2_TC1/HTML/link/ifcsite.htm
- **DMS Format Spec**: https://standards.buildingsmart.org/IFC/RELEASE/IFC4/ADD2_TC1/HTML/schema/ifcmeasureresource/lexical/ifccompoundplaneanglemeasure.htm

---

## ✅ Completion Checklist

Prima di passare a POC-2, verifica:

- [ ] IfcOpenShell installato senza errori
- [ ] Testato su almeno 2 IFC files diversi
- [ ] Coordinate validate manualmente con Google Maps (1 file)
- [ ] Performance misurata e documentata
- [ ] `RESULTS.md` compilato con findings
- [ ] Decisione GO/NO-GO documentata

---

## 🎓 Learning Outcomes

Dopo questo POC dovresti saper rispondere:

1. IfcOpenShell è stabile sul mio sistema? (Sì/No)
2. Posso debuggare errori Python quando IfcOpenShell crasha? (Sì/No)
3. La conversione coordinate è affidabile? (Sì/No/Parziale)
4. Performance è accettabile per MVP? (Sì/No)

---

**Pronto?** Esegui lo script e documenta tutto in `RESULTS.md`!

**Next Step**: Se ✅ PASS → vai a `../POC-2-cesium-viewer/`
