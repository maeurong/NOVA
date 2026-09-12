import { test } from "node:test";
import assert from "node:assert/strict";
import { dimensioniSicure, calcolaAspect, calcolaInquadratura, creaSpazio, pixelInMondo, tratti,
         trattiDellaDeformata, raggioCilindro } from "../spazio.js";
import { coloreSpostamento, massimoSpostamento, VIRIDIS } from "../risultati.js";

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

test("pixelInMondo: mm per pixel alla distanza data; riquadro non misurato o distanza non finita → 0", () => {
  assert.ok(Math.abs(pixelInMondo(1000, 90, 500) - 4) < 1e-9); // 2·1000·tan 45° / 500, rende 3,9999999999999996
  assert.equal(pixelInMondo(1000, 45, 0), 0);
  assert.equal(pixelInMondo(NaN, 45, 500), 0);
  assert.equal(pixelInMondo(Infinity, 45, 500), 0);
});

test("tratti: uno per coppia di punti consecutivi, colorato sulla media di |u|", () => {
  const p = [{ x: 0, y: 0, z: 0, u: 0 }, { x: 1, y: 0, z: 0, u: 2 }, { x: 2, y: 0, z: 0, u: 4 }];
  assert.deepEqual(tratti(p, 4), [
    { a: { x: 0, y: 0, z: 0 }, b: { x: 1, y: 0, z: 0 }, colore: coloreSpostamento(1, 4) },
    { a: { x: 1, y: 0, z: 0 }, b: { x: 2, y: 0, z: 0 }, colore: coloreSpostamento(3, 4) },
  ]);
  assert.deepEqual(tratti([], 4), []);
  assert.deepEqual(tratti([p[0]], 4), []);
});

test("tratti: u assente → colore della tappa bassa", () => {
  const [t] = tratti([{ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 5 }], 4);
  assert.equal(t.colore, VIRIDIS[0]);
});

test("tratti: due punti coincidenti (o non finiti) → saltati, niente direzione nulla", () => {
  const p = [{ x: 1, y: 1, z: 1, u: 1 }, { x: 1, y: 1, z: 1, u: 1 }, { x: 2, y: 1, z: 1, u: 1 }, { x: NaN, y: 1, z: 1, u: 1 }];
  const fuori = tratti(p, 1);
  assert.equal(fuori.length, 1);
  assert.deepEqual(fuori[0].a, { x: 1, y: 1, z: 1 });
  assert.deepEqual(fuori[0].b, { x: 2, y: 1, z: 1 });
});

test("trattiDellaDeformata: la scala arriva da `app.js`, non se la ricalcola (N6)", () => {
  const aste = [{ id: 1, punti: [{ x: 0, y: 0, z: 0, u: 0 }, { x: 1, y: 0, z: 0, u: 8 }] },
                { id: 2, punti: [{ x: 1, y: 0, z: 0, u: 8 }, { x: 1, y: 0, z: 1, u: 2 }] }];
  assert.deepEqual(trattiDellaDeformata({ aste, stantia: false, uMax: 10 }).map((t) => t.colore),
                   [coloreSpostamento(4, 10), coloreSpostamento(5, 10)]);
  // **N6** — il massimo aveva tre padroni (`app.js`, `piano.js`, questo) e coincidevano solo perché
  // `u` non porta la scala. Ora lo calcola `app.js` e basta: senza, la rampa resta alla tappa bassa
  // invece di inventare una scala che diverga da quella del piano e della legenda.
  assert.deepEqual(trattiDellaDeformata({ aste, stantia: false }).map((t) => t.colore),
                   [VIRIDIS[0], VIRIDIS[0]]);
  assert.equal(massimoSpostamento(aste), 8, "il massimo si sa ancora calcolare: lo fa `app.js`");
  assert.deepEqual(trattiDellaDeformata(null), []);
});

test("trattiDellaDeformata: stantia → tratti senza colore (rossi, nessun materiale di viridis)", () => {
  const aste = [{ id: 1, punti: [{ x: 0, y: 0, z: 0, u: 0 }, { x: 1, y: 0, z: 0, u: 8 }] }];
  const fuori = trattiDellaDeformata({ aste, stantia: true });
  assert.equal(fuori.length, 1);
  assert.equal(fuori[0].colore, null);
});

test("raggioCilindro: preso sull'estremo lontano, mai sotto tratto/2 px su nessuno dei due capi", () => {
  const occhio = { x: 0, y: 0, z: 0 };
  const estremi = [{ x: 0, y: 0, z: 1000 }, { x: 0, y: 0, z: 2000 }];
  const r = raggioCilindro(occhio, estremi, 90, 500, 6);
  assert.ok(Math.abs(r - pixelInMondo(2000, 90, 500) * 3) < 1e-9);
  for (const p of estremi) {
    const pxAlCapo = r / pixelInMondo(Math.hypot(p.x, p.y, p.z), 90, 500);
    assert.ok(pxAlCapo >= 3 - 1e-9, `capo a ${p.z}: ${pxAlCapo} px`);
  }
  assert.equal(raggioCilindro(occhio, estremi, 90, 0, 6), 0); // riquadro non misurato: spessore nullo, non NaN
});
