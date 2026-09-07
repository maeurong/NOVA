import { test } from "node:test";
import assert from "node:assert/strict";
import { ghostDisegnabile, esitoScelta, contestoBarra, ruotaGhost, modoValido,
         puntoDelComando, esitoComando, AVVISO_ESTRUSIONE } from "../modo.js";

const m = { nodi: [{ id: 1, x: 0, y: 0, z: 0 }, { id: 2, x: 1000, y: 0, z: 2000 }] };

// --- modoValido (giornata 11c: un annulla non lascia un modo appeso) --------
// Mutante 5 del brief: annullare non chiude un modo aperto, che resta appeso a un nodo
// sparito. Estratta da `app.js` (già inline in `ridisegna`) per lo stesso motivo di
// `ghostDisegnabile` & co.: testabile in Node solo fuori dal modulo che tocca il DOM.

test("modoValido: nessun modo resta nessun modo", () => {
  assert.equal(modoValido(m, null), null);
});

test("modoValido: il nodo di partenza sparito chiude il modo, non lo lascia appeso", () => {
  const modo = { tipo: "estrusione", da: 99, dx: 0, dz: 3000 };
  assert.equal(modoValido(m, modo), null);
});

test("modoValido: in asta, il secondo nodo sparito torna a `a: null` invece di restare appeso", () => {
  const modo = { tipo: "asta", da: 1, a: 99 };
  assert.deepEqual(modoValido(m, modo), { tipo: "asta", da: 1, a: null });
});

test("modoValido: coi nodi ancora tutti presenti il modo non cambia", () => {
  const modo = { tipo: "asta", da: 1, a: 2 };
  assert.deepEqual(modoValido(m, modo), modo);
});

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

test("contestoBarra: col campo aperto → 'comando', e vince su tutto il resto", () => {
  assert.equal(contestoBarra(null, null, { testo: "" }), "comando");
  assert.equal(contestoBarra(null, { tipo: "nodo", id: 1 }, { testo: "0; 3" }), "comando");
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

// --- F: il campo di comando (giornata 11c, task C1) ----------------------------
// Il campo sostituisce `window.prompt` per N, e il ghost si muove **a ogni tasto**: per
// questo la lettura del testo è pura e sta qui, non dentro `app.js`, che il DOM lo tocca
// già ai primi `const` del modulo. Due funzioni e non una perché le domande sono due, e
// hanno risposte opposte sullo stesso testo: mentre si scrive «si disegna qualcosa?»
// (silenziosa), alla conferma «si esegue qualcosa, e se no cosa dico?».

test("puntoDelComando: «x; z» completo dà il punto", () => {
  assert.deepEqual(puntoDelComando("0; 3000"), { x: 0, z: 3000 });
});

// Mutante 6 del brief: la conferma esegue anche col campo vuoto.
test("puntoDelComando: campo vuoto non è un punto — nessun ghost, e Invio non esegue", () => {
  assert.equal(puntoDelComando(""), null);
  assert.equal(puntoDelComando("   "), null);
  assert.deepEqual(esitoComando(""), { punto: null, messaggio: null });
  assert.deepEqual(esitoComando("   "), { punto: null, messaggio: null });
});

// Mutante 5 del brief: un testo a metà produce un messaggio d'errore mentre si scrive.
test("puntoDelComando: il testo a metà non è un ghost e non è un errore — si sta scrivendo", () => {
  assert.equal(puntoDelComando("0;"), null);
  assert.equal(puntoDelComando("0; "), null);
  assert.equal(puntoDelComando("0"), null, "senza il punto e virgola manca la seconda coordinata");
  // Mentre si scrive il messaggio non esiste come possibilità, non è «esiste ma è vuoto»:
  // la strada del ghost passa solo di qui, e di qui esce un punto o niente. `esitoComando`,
  // che un messaggio ce l'ha, la percorre solo Invio.
  assert.equal(puntoDelComando("0; "), null);
});

test("esitoComando: il testo non valido parla alla conferma, e dice cosa scrivere", () => {
  const esito = esitoComando("pippo");
  assert.equal(esito.punto, null);
  assert.match(esito.messaggio, /coordinate non lette/);
  assert.match(esito.messaggio, /x; z/);
});

test("esitoComando: il testo che si legge torna il punto e nessun messaggio", () => {
  assert.deepEqual(esitoComando("0; 3000"), { punto: { x: 0, z: 3000 }, messaggio: null });
});

// Mutante 3 del brief: il campo usa `leggiNumero` invece di `leggiLunghezza`.
test("puntoDelComando: le unità si leggono — «2,5m» sono 2500 mm", () => {
  assert.deepEqual(puntoDelComando("0; 2,5m"), { x: 0, z: 2500 });
  assert.deepEqual(puntoDelComando("1,5m; 30cm"), { x: 1500, z: 300 });
});

test("puntoDelComando: le espressioni si leggono, con le parentesi", () => {
  assert.deepEqual(puntoDelComando("0; (1+1)*1500"), { x: 0, z: 3000 });
});

test("puntoDelComando: il segno unario si legge — una coordinata negativa è normale", () => {
  assert.deepEqual(puntoDelComando("-2262; 0"), { x: -2262, z: 0 });
  assert.deepEqual(puntoDelComando("0; -3*1000"), { x: 0, z: -3000 });
});

// Il ghost mostra solo ciò che c'è scritto: con tre numeri il terzo sparirebbe in
// silenzio, e l'anteprima direbbe una cosa che il testo non dice.
test("puntoDelComando: più di due coordinate non si legge, non si tronca", () => {
  assert.equal(puntoDelComando("0; 1000; 2000"), null);
});

test("puntoDelComando: un argomento che non è una stringa non solleva", () => {
  assert.equal(puntoDelComando(null), null);
  assert.equal(puntoDelComando(undefined), null);
  assert.equal(puntoDelComando(42), null);
});
