import { test } from "node:test";
import assert from "node:assert/strict";
import { ghostDisegnabile, esitoScelta, contestoBarra, ruotaGhost, AVVISO_ESTRUSIONE } from "../modo.js";

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

// --- ruotaGhost (B2) -----------------------------------------------------------
// La decisione delle frecce sta qui e non in un secondo listener di `app.js`: due `keydown`
// sulla stessa `window` con regole d'ingresso diverse erano la causa, non il sintomo.

test("ruotaGhost: ogni freccia gira il ghost tenendone la lunghezza", () => {
  const modo = { tipo: "estrusione", da: 1, dx: 0, dz: 3000 };
  assert.deepEqual(ruotaGhost(modo, "ArrowUp"), { ...modo, dx: 0, dz: 3000 });
  assert.deepEqual(ruotaGhost(modo, "ArrowDown"), { ...modo, dx: 0, dz: -3000 });
  assert.deepEqual(ruotaGhost(modo, "ArrowRight"), { ...modo, dx: 3000, dz: 0 });
  assert.deepEqual(ruotaGhost(modo, "ArrowLeft"), { ...modo, dx: -3000, dz: 0 });
});

test("ruotaGhost: la lunghezza è quella del ghost intero, non di una sua componente", () => {
  const modo = { tipo: "estrusione", da: 1, dx: 3000, dz: 4000 };
  assert.deepEqual(ruotaGhost(modo, "ArrowRight"), { ...modo, dx: 5000, dz: 0 });
});

test("ruotaGhost: senza estrusione aperta la freccia non è nostra — resta al browser", () => {
  assert.equal(ruotaGhost(null, "ArrowUp"), null);
  assert.equal(ruotaGhost(undefined, "ArrowUp"), null);
  assert.equal(ruotaGhost({ tipo: "asta", da: 1, a: null }, "ArrowUp"), null);
});

test("ruotaGhost: un tasto che non è una freccia non gira niente", () => {
  assert.equal(ruotaGhost({ tipo: "estrusione", da: 1, dx: 0, dz: 1 }, "n"), null);
  assert.equal(ruotaGhost({ tipo: "estrusione", da: 1, dx: 0, dz: 1 }, undefined), null);
});

test("ruotaGhost: non tocca il modo che riceve", () => {
  const modo = { tipo: "estrusione", da: 1, dx: 0, dz: 3000 };
  ruotaGhost(modo, "ArrowRight");
  assert.deepEqual(modo, { tipo: "estrusione", da: 1, dx: 0, dz: 3000 });
});

// --- E: l'avviso dell'estrusione in corso, una stringa sola --------------------

test("l'avviso dell'estrusione in corso vive in un posto solo", () => {
  assert.equal(esitoScelta({ tipo: "estrusione", da: 1, dx: 0, dz: 1 }, "nodo").messaggio,
               AVVISO_ESTRUSIONE);
  assert.match(AVVISO_ESTRUSIONE, /Invio per confermarla, Esc per annullarla/);
});
