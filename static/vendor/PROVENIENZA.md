# Provenienza dei file vendorizzati

NOVA gira senza rete: quel che serve a tempo d'uso sta qui, con la sua licenza e la sua
impronta. Nessun `import` remoto, nessun CDN.

## three.module.js e three.core.js

Dalla 0.185.0, il build ufficiale di three.js divide `three.module.js` in due file: il primo
importa `./three.core.js` con `import { ... } from './three.core.js'` alla riga 6. Il brief di
questo task citava solo `three.module.js`: senza `three.core.js` accanto, ogni `import` fallisce
sempre (404 sul percorso relativo), non solo nei casi limite. Vendorizzati entrambi.

- **Versione**: three.js 0.185.0 (r185)
- **Origine**:
  - `https://cdn.jsdelivr.net/npm/three@0.185.0/build/three.module.js`
  - `https://cdn.jsdelivr.net/npm/three@0.185.0/build/three.core.js`
- **Scaricato**: 06/09/2026
- **sha256**:
  - `three.module.js`: `bbf5ed13fe4373f5bd38b14ea8e62e9f157327da5638edc6d3863e08b167c9c7`
  - `three.core.js`: `78b2c4218834ca8670547ed2315bfc21a00ff4dc3403bbffc8c31493d31d14de`
- **Licenza**: MIT, copia verbatim in `three.LICENSE`
  (`https://raw.githubusercontent.com/mrdoob/three.js/r185/LICENSE`), vale per entrambi i file:
  stesso pacchetto, stessa licenza.

Per rifare la verifica: `shasum -a 256 static/vendor/three.module.js static/vendor/three.core.js`.
