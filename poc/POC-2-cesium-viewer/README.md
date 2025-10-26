# POC-2: CesiumJS + web-ifc 3D Rendering

**Priorità**: 🔴 CRITICA
**Tempo Stimato**: 8 ore
**Difficoltà**: ⭐⭐⭐ Alto (integrazione complessa)

---

## 🎯 Obiettivo

Validare che:
1. **CesiumJS** globe viewer funziona in browser
2. **web-ifc** (WebAssembly) può parsare IFC in Web Worker
3. **web-ifc-three** converte geometria IFC → Three.js meshes
4. Geometria IFC visibile su Cesium globe a coordinate corrette
5. Performance ≥30 FPS durante navigazione

---

## ✅ Criteri di Successo

- [ ] Cesium globe inizializza entro 3 secondi
- [ ] web-ifc parsa file 10MB in <5 secondi (in Web Worker)
- [ ] Geometria IFC visibile su globe
- [ ] FPS ≥30 durante pan/zoom
- [ ] Building posizionato alle coordinate corrette

---

## 🛠️ Quick Setup

```bash
cd poc/POC-2-cesium-viewer/

# Crea progetto Vite + React + TypeScript
npm create vite@latest . -- --template react-ts

# Installa dependencies
npm install

# Installa Cesium + IFC libraries
npm install cesium@1.112.0
npm install web-ifc@0.0.53
npm install web-ifc-three@0.0.124
npm install three@0.159.0

# Setup Vite config per Cesium
# (vedi vite.config.ts fornito)

# Start dev server
npm run dev
```

---

## 📝 Files Forniti

- `vite.config.ts` - Configurazione Vite per CesiumJS
- `src/CesiumTest.tsx` - Componente Cesium base
- `src/IFCLoader.worker.ts` - Web Worker per parsing IFC
- `src/types.ts` - TypeScript definitions
- `RESULTS.md` - Template per documentare findings

---

## 🧪 Test Sequence

### Test 1: Cesium Globe (5 min)
1. Start `npm run dev`
2. Apri http://localhost:5173
3. Verifica globe 3D visibile
4. Testa pan/zoom con mouse
5. Verifica FPS in DevTools (F12 → Performance)

**Expected**: Globe 3D, 60 FPS smooth

### Test 2: web-ifc Parsing (30 min)
1. Copia 1 IFC file (10MB max) in `public/test.ifc`
2. Clicca "Load IFC" button
3. Monitora console per progress
4. Verifica parsing completa senza crash

**Expected**: Console log "IFC parsed: X triangles", tempo <5s

### Test 3: 3D Visualization (2 ore)
1. Parsing completato → converti a Three.js mesh
2. Posiziona mesh su Cesium globe
3. Verifica geometria visibile
4. Testa coordinate corrette (es: Roma)

**Expected**: Building visibile su globe alla posizione corretta

### Test 4: Performance (1 ora)
1. Open DevTools → Performance tab
2. Registra 10 secondi di pan/zoom
3. Analizza FPS
4. Verifica memory usage <200MB

**Expected**: FPS ≥30, no memory leak

---

## 🚨 Common Issues & Solutions

### Issue: Cesium "Ion token" error
**Solution**:
```typescript
// In CesiumTest.tsx
Cesium.Ion.defaultAccessToken = 'YOUR_FREE_TOKEN';
// Get free token: https://ion.cesium.com/signup
```

### Issue: web-ifc WASM not loading
**Solution**: Aggiungi in vite.config.ts:
```typescript
optimizeDeps: {
  exclude: ['web-ifc']
}
```

### Issue: Three.js geometry invisible
**Solution**: Verifica material color e lighting:
```typescript
const material = new THREE.MeshStandardMaterial({ color: 0x0080ff });
scene.add(new THREE.AmbientLight(0xffffff, 0.5));
```

---

## 📊 Performance Metrics da Raccogliere

| Metric | Target | Actual | Pass? |
|--------|--------|--------|-------|
| Cesium init time | <3s | ____s | ✅/❌ |
| IFC parse time (10MB) | <5s | ____s | ✅/❌ |
| FPS during navigation | ≥30 | ____ | ✅/❌ |
| Memory usage | <200MB | ____MB | ✅/❌ |
| Triangle count | - | ____k | - |

---

## 🎯 Decision Criteria

**✅ PASS** if:
- Geometry visible at correct location
- FPS ≥25 (acceptable for POC)
- No major crashes

**❌ FAIL** if:
- web-ifc cannot parse IFC4
- FPS <15 (unusable)
- Memory leak crashes browser

**⚠️ PARTIAL** if:
- Works but FPS 15-25 (needs optimization)
- Geometry correct but lighting issues

---

**Time Budget**: Max 8 hours. If stuck after 4 hours → document blockers e STOP.

**Next**: Se PASS → POC-3 (Upload), altrimenti rivedi architettura frontend.
