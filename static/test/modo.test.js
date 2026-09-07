import { test } from "node:test";
import assert from "node:assert/strict";
import { ghostDisegnabile, esitoScelta, contestoBarra } from "../modo.js";

const m = { nodi: [{ id: 1, x: 0, y: 0, z: 0 }, { id: 2, x: 1000, y: 0, z: 2000 }] };

// --- ghostDisegnabile -------------------------------------------------------

test("ghostDisegnabile: nessun modo → null, non solleva", () => {
  assert.equal(ghostDisegnabile(m, null), null);
});

test("ghostDisegnabile: estrusione → il ghost è dx/dz del modo, uguale al nodo di arrivo", () => {
  const modo = { tipo: "estrusione", da: 1, dx: 500, dz: -300 };
  assert.deepEqual(ghostDisegnabile(m, modo), { da: 1, dx: 500, dz: -300 });
});

test("ghostDisegnabile: asta con secondo nodo scelto → dx/dz da 'da' verso 'a', non invertiti", () => {
  const modo = { tipo: "asta", da: 1, a: 2 };
  // mutante 4: da - a invece di a - da darebbe {dx:-1000, dz:-2000}
  assert.deepEqual(ghostDisegnabile(m, modo), { da: 1, dx: 1000, dz: 2000 });
});

test("ghostDisegnabile: asta con a === null → null (niente ghost finché non c'è il secondo nodo)", () => {
  const modo = { tipo: "asta", da: 1, a: null };
  assert.equal(ghostDisegnabile(m, modo), null);
});

test("ghostDisegnabile: asta il cui nodo di partenza è sparito dal modello → null, non solleva", () => {
  const modo = { tipo: "asta", da: 99, a: 2 };
  assert.equal(ghostDisegnabile(m, modo), null);
});

test("ghostDisegnabile: asta il cui nodo d'arrivo è sparito dal modello → null, non solleva", () => {
  const modo = { tipo: "asta", da: 1, a: 99 };
  assert.equal(ghostDisegnabile(m, modo), null);
});

// --- esitoScelta -------------------------------------------------------------

test("esitoScelta: in estrusione, bersaglio nodo → non permesso, messaggio dell'estrusione in corso", () => {
  const e = esitoScelta({ tipo: "estrusione", da: 1, dx: 0, dz: 1 }, "nodo");
  assert.equal(e.permesso, false);
  assert.match(e.messaggio, /estrusione in corso/);
  assert.equal(e.aggiornaA, false);
});

test("esitoScelta: in asta, bersaglio asta → non permesso, messaggio «scegli un nodo, non un'asta»", () => {
  const e = esitoScelta({ tipo: "asta", da: 1, a: null }, "asta");
  assert.equal(e.permesso, false);
  assert.match(e.messaggio, /scegli un nodo, non un'asta/);
  assert.equal(e.aggiornaA, false);
});

test("esitoScelta: in asta, bersaglio nodo → permesso, modo.a va aggiornato", () => {
  const e = esitoScelta({ tipo: "asta", da: 1, a: null }, "nodo");
  assert.equal(e.permesso, true);
  assert.equal(e.messaggio, null);
  assert.equal(e.aggiornaA, true);
});

test("esitoScelta: nessun modo aperto → permesso, nessun messaggio, niente da aggiornare", () => {
  const e = esitoScelta(null, "nodo");
  assert.equal(e.permesso, true);
  assert.equal(e.messaggio, null);
  assert.equal(e.aggiornaA, false);
});

// --- contestoBarra -------------------------------------------------------------

test("contestoBarra: senza modo e senza selezione → 'sempre'", () => {
  assert.equal(contestoBarra(null, null), "sempre");
});

test("contestoBarra: senza modo, con selezione → 'selezione'", () => {
  assert.equal(contestoBarra(null, { tipo: "nodo", id: 1 }), "selezione");
});

test("contestoBarra: modo estrusione → 'ghost', non 'asta'", () => {
  assert.equal(contestoBarra({ tipo: "estrusione", da: 1, dx: 0, dz: 1 }, { tipo: "nodo", id: 1 }), "ghost");
});

test("contestoBarra: modo asta → 'asta', non 'ghost' (la barra deve promettere G, non solo Invio/Esc)", () => {
  assert.equal(contestoBarra({ tipo: "asta", da: 1, a: null }, { tipo: "nodo", id: 1 }), "asta");
});
