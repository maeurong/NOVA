import { test } from "node:test";
import assert from "node:assert/strict";
import { dimensioniSicure, calcolaAspect, calcolaInquadratura, creaSpazio } from "../spazio.js";

test("contenitore di dimensione 0: nessun NaN nell'aspect della camera", () => {
  assert.deepEqual(dimensioniSicure(0, 0), { w: 1, h: 1 });
  assert.equal(calcolaAspect(0, 0), 1);
  assert.ok(Number.isFinite(calcolaAspect(0, 0)));
});

test("modello vuoto: centro nell'origine, nessuna divisione per zero nella distanza", () => {
  const { centro, distanza } = calcolaInquadratura([]);
  assert.deepEqual(centro, { x: 0, y: 0, z: 0 });
  assert.equal(distanza, 4000);
  assert.ok(Number.isFinite(distanza) && distanza > 0);
});

test("modello con un solo nodo: distanza minima fissa, non zero", () => {
  const { centro, distanza } = calcolaInquadratura([{ x: 1200, y: 300, z: 900 }]);
  assert.deepEqual(centro, { x: 1200, y: 300, z: 900 });
  assert.equal(distanza, 4000); // l'estensione è zero: vince la distanza minima, non 0
});

test("three.js/WebGL assente: creaSpazio non solleva, dichiara indisponibile, scrive nel riquadro", async () => {
  // node non ha DOM/WebGL: `new THREE.WebGLRenderer()` fallisce qui esattamente come su un
  // browser senza WebGL. `assente()` tocca `document`, quindi lo stub minimo copre solo quello.
  const scritti = [];
  globalThis.document = { createElement: () => ({ set className(v) {}, set textContent(v) { scritti.push(v); } }) };
  const contenitore = { clientWidth: 0, clientHeight: 0, replaceChildren(...figli) { this.figli = figli; } };
  try {
    const s = await creaSpazio(contenitore);
    assert.equal(s.disponibile, false);
    assert.equal(scritti.length, 1); // il riquadro riceve un messaggio, non resta bianco
    assert.doesNotThrow(() => s.disegna({ nodi: [], aste: [] }));
  } finally {
    delete globalThis.document;
  }
});
