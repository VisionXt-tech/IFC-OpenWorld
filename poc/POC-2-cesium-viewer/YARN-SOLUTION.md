# Soluzione: Windows + Vite + Rollup

## Problema
Su Windows, `npm` ha un bug con le dipendenze opzionali che impedisce l'installazione di `@rollup/rollup-win32-x64-msvc`, causando il crash di Vite all'avvio.

## Soluzione: Usare Yarn

### Installazione

```bash
# 1. Installa Yarn globalmente
npm install -g yarn

# 2. Pulisci dipendenze npm
rm -rf node_modules package-lock.json

# 3. Installa con Yarn
yarn install

# 4. Avvia il dev server
yarn dev
```

### Risultato
- ✅ Vite si avvia correttamente
- ✅ vite-plugin-cesium funziona
- ✅ Rollup native binaries installati senza errori
- ✅ Tempo di avvio: <500ms

## Perché Funziona?

**npm**: Gestisce male le dipendenze opzionali su Windows (bug #4828)
**Yarn**: Gestisce correttamente le dipendenze opzionali multipiattaforma

## Raccomandazione per SPEC-001

Aggiornare `PLAN-001` e `README.md`:

```markdown
### Setup Ambiente di Sviluppo (Windows)

**IMPORTANTE**: Su Windows, usare **Yarn** invece di npm per evitare problemi con Rollup:

\`\`\`bash
npm install -g yarn
yarn install
yarn dev
\`\`\`

**Alternative**:
- Usare WSL (Windows Subsystem for Linux)
- Usare pnpm invece di npm
```

## Tempo Risoluzione
- Tentativo con npm: 2 ore (fallito)
- Soluzione con Yarn: 5 minuti (successo)

## Impatto
- ⚠️ **NFR-011** (Platform): OK con Yarn, FAIL con npm
- ✅ Tutti i target di performance mantenuti
- ✅ Nessuna modifica al codice necessaria
