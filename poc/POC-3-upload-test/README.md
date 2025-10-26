# POC-3: File Upload Simulation (50MB)

**Priorità**: 🟡 Non-Critica
**Tempo Stimato**: 4 ore
**Difficoltà**: ⭐ Facile

---

## 🎯 Obiettivo

Validare upload 50MB file senza crash o memory leak.

---

## ✅ Criteri di Successo

- [ ] Upload 50MB completa entro 10 secondi
- [ ] File salvato correttamente su filesystem locale
- [ ] Nessun memory leak (RAM stabile)
- [ ] Progress bar funzionante

---

## 🛠️ Setup

```bash
cd poc/POC-3-upload-test/

npm init -y
npm install express multer cors

# Crea file test 50MB
node -e "require('fs').writeFileSync('test_50mb.bin', Buffer.alloc(50*1024*1024))"

node server.js
# Open client.html in browser
```

---

## 🧪 Test

1. Open `client.html` in browser
2. Select `test_50mb.bin`
3. Click "Upload"
4. Verifica progress bar → 100%
5. Check `uploads/` folder → file presente

**Expected**: Upload completo, file salvato, no crash

---

## 📊 Metrics

- Upload time: ____s (target <10s)
- RAM before: ____MB
- RAM peak: ____MB
- RAM after: ____MB

**PASS** se: File caricato, RAM peak <500MB
**FAIL** se: Crash browser o Node.js

---

**Next**: Se PASS → POC-4 (PostGIS)
