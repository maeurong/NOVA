import { test } from "node:test";
import assert from "node:assert/strict";
import { NATURE, TIPI_CARICO, DIREZIONI, TIPI_COMBINAZIONE, COMPONENTI, normalizzaCarico, leggiAzione,
         leggiNodale, leggiDistribuito, leggiCombinazione, testoCarico, frecceDeiCarichi,
         caricoVuoto } from "../carichi.js";
import { creaNodo, estrudi } from "../comandi.js";
import { modelloVuoto } from "../modello.js";
import { cifre } from "../numeri.js";

// Una trave orizzontale 0→5000 (asta 1) e un pilastro 0→3000 in su (asta 2).
const telaio = () => {
  let m = creaNodo(modelloVuoto(), { x: 0, z: 0 });
  m = estrudi(m, { da: 1, dx: 5000, dz: 0 });
  return estrudi(m, { da: 1, dx: 0, dz: 3000 });
};

test("le costanti sono quelle dello schema, alla lettera", () => {
  assert.deepEqual(NATURE, ["G1", "G2", "Q", "E"]);
  assert.deepEqual(TIPI_CARICO, ["nodale", "distribuito", "gravita", "cedimento", "termico"]);
  assert.deepEqual(DIREZIONI, ["x", "y", "z", "locale_y", "locale_z"]);
  assert.deepEqual(TIPI_COMBINAZIONE, ["fondamentale", "caratteristica", "frequente", "quasi_permanente", "sismica"]);
  assert.deepEqual(COMPONENTI, ["Fx", "Fy", "Fz", "Mx", "My", "Mz"]);
});
test("normalizzaCarico: un nodale porta le sei componenti a zero e nessuna chiave in più", () => {
  const { carico, messaggio } = normalizzaCarico({ tipo: "nodale", nodo: 4, colore: "rosso" });
  assert.equal(messaggio, null);
  assert.deepEqual(carico, { tipo: "nodale", nodo: 4, Fx: 0, Fy: 0, Fz: 0, Mx: 0, My: 0, Mz: 0 });
});
test("normalizzaCarico: tipo sconosciuto, numero non finito, direzione sconosciuta", () => {
  assert.match(normalizzaCarico({ tipo: "vento" }).messaggio, /nodale, distribuito, gravita, cedimento, termico/);
  assert.notEqual(normalizzaCarico({ tipo: "nodale", nodo: 1, Fx: "20" }).messaggio, null);
  assert.notEqual(normalizzaCarico({ tipo: "nodale", nodo: 1, Fx: NaN }).messaggio, null);
  assert.match(normalizzaCarico({ tipo: "distribuito", asta: 1, q: -1, direzione: "nord" }).messaggio, /x, y, z, locale_y, locale_z/);
  assert.notEqual(normalizzaCarico({ tipo: "distribuito", asta: 1 }).messaggio, null);
});
test("normalizzaCarico: un distribuito senza direzione è lungo z", () => {
  assert.deepEqual(normalizzaCarico({ tipo: "distribuito", asta: 1, q: -12.5 }).carico,
                   { tipo: "distribuito", asta: 1, q: -12.5, direzione: "z" });
});
test("normalizzaCarico: cedimento tutto libero e termico senza gradiente sono leciti", () => {
  assert.deepEqual(normalizzaCarico({ tipo: "cedimento", nodo: 1 }).carico,
                   { tipo: "cedimento", nodo: 1, ux: null, uy: null, uz: null, rx: null, ry: null, rz: null });
  assert.deepEqual(normalizzaCarico({ tipo: "termico", asta: 1 }).carico, { tipo: "termico", asta: 1, dT_uniforme: 0, gradiente: null });
});
test("normalizzaCarico: un grado di cedimento non numerico è un messaggio", () => {
  assert.notEqual(normalizzaCarico({ tipo: "cedimento", nodo: 1, ux: "x" }).messaggio, null);
});
test("leggiAzione: la natura è obbligatoria, Q vuole la categoria", () => {
  assert.deepEqual(leggiAzione(""), { azione: null, messaggio: null });
  assert.notEqual(leggiAzione("permanenti travi").messaggio, null);
  assert.notEqual(leggiAzione("spinta; q").messaggio, null);
  assert.deepEqual(leggiAzione("spinta; q; vento").azione, { nome: "spinta", natura: "Q", categoria: "vento" });
  assert.match(leggiAzione("x; G3").messaggio, /G1, G2, Q, E/);
  assert.notEqual(leggiAzione("; G1").messaggio, null);
});
test("leggiNodale: coppie nome valore, senza distinzione di maiuscole, con le espressioni", () => {
  assert.deepEqual(leggiNodale("Fx 20000").carico, { Fx: 20000 });
  assert.deepEqual(leggiNodale("fz -5000; mx 2000000").carico, { Fz: -5000, Mx: 2000000 });
  assert.deepEqual(leggiNodale("Fx (1+1)*10000").carico, { Fx: 20000 });
  for (const t of ["20000", "Fw 3", "Fx 1; Fx 2", "Mx 2e6"]) assert.notEqual(leggiNodale(t).messaggio, null, t);
});
test("leggiDistribuito: q e direzione facoltativa", () => {
  assert.deepEqual(leggiDistribuito("-12,5").carico, { q: -12.5, direzione: "z" });
  assert.deepEqual(leggiDistribuito("-12,5; x").carico, { q: -12.5, direzione: "x" });
  assert.deepEqual(leggiDistribuito("-12,5; locale z").carico, { q: -12.5, direzione: "locale_z" });
  assert.deepEqual(leggiDistribuito("0").carico, { q: 0, direzione: "z" });
  assert.notEqual(leggiDistribuito("abc").messaggio, null);
});
test("leggiCombinazione: il tipo è facoltativo e «quasi permanente» si scrive con lo spazio", () => {
  assert.deepEqual(leggiCombinazione("SLU").combinazione, { nome: "SLU", tipo: null });
  assert.deepEqual(leggiCombinazione("SLU; fondamentale").combinazione, { nome: "SLU", tipo: "fondamentale" });
  assert.deepEqual(leggiCombinazione("rara; quasi permanente").combinazione, { nome: "rara", tipo: "quasi_permanente" });
  assert.match(leggiCombinazione("x; slu").messaggio, /fondamentale, caratteristica, frequente, quasi_permanente, sismica/);
});
test("testoCarico: unità su ogni numero, e le componenti nulle non si stampano", () => {
  // `cifre(20000)` separa le migliaia con U+202F (`numeri.js:143`): la stringa attesa si
  // costruisce con la stessa funzione, così il test non dipende da uno spazio invisibile.
  assert.equal(testoCarico({ tipo: "nodale", nodo: 4, Fx: 20000, Fy: 0, Fz: 0, Mx: 0, My: 0, Mz: 0 }), `nodo 4 · Fx ${cifre(20000)} N`);
  assert.equal(testoCarico({ tipo: "nodale", nodo: 4, Fx: 0, Fy: 0, Fz: 0, Mx: 0, My: 0, Mz: 0 }), "nodo 4 · nullo");
  assert.equal(testoCarico({ tipo: "distribuito", asta: 4, q: -12.5, direzione: "z" }), "asta 4 · q −12,5 N/mm lungo z");
  assert.equal(testoCarico({ tipo: "gravita", fattore_x: 0, fattore_y: 0, fattore_z: -1 }), "gravità · z ×−1");
  assert.equal(testoCarico({ tipo: "cedimento", nodo: 2, ux: null, uy: null, uz: -5, rx: null, ry: null, rz: null }), "cedimento nodo 2 · uz −5 mm");
  assert.equal(testoCarico({ tipo: "termico", asta: 3, dT_uniforme: 20, gradiente: null }), "termico asta 3 · ΔT 20 °C");
});
test("testoCarico: una gravità senza fattori dice «nulla», non «undefined»", () => {
  const t = testoCarico({ tipo: "gravita" });
  assert.equal(t, "gravità · nulla");
  assert.doesNotMatch(t, /undefined|NaN/);
});
test("testoCarico: un tipo sconosciuto solleva, non scivola nel ramo del termico", () => {
  assert.throws(() => testoCarico({ tipo: "vento" }), /sconosciuto/);
});
test("testoCarico: un distribuito senza direzione è lungo z", () => {
  assert.equal(testoCarico({ tipo: "distribuito", asta: 4, q: -12.5 }), "asta 4 · q −12,5 N/mm lungo z");
});
test("frecceDeiCarichi: un distribuito verso il basso su una trave dà tre frecce che scendono", () => {
  const az = { id: 1, nome: "g", natura: "G2", categoria: null, generata: false,
               carichi: [{ tipo: "distribuito", asta: 1, q: -12.5, direzione: "z" }] };
  const f = frecceDeiCarichi(telaio(), az, 500);
  assert.equal(f.length, 3);
  for (const k of f) { assert.ok(k.da.z > k.a.z); assert.equal(k.da.z - k.a.z, 500); }
  assert.deepEqual(f.map((k) => k.a.x), [1250, 2500, 3750]);
  assert.equal(f.filter((k) => k.testo).length, 1);
  assert.match(f[1].testo, /12,5 N\/mm/);
});
test("frecceDeiCarichi: il nodale punta sul nodo nel verso della forza", () => {
  const az = { id: 1, nome: "s", natura: "Q", categoria: "vento", generata: false,
               carichi: [{ tipo: "nodale", nodo: 3, Fx: 20000, Fy: 0, Fz: 0, Mx: 0, My: 0, Mz: 0 }] };
  const [f] = frecceDeiCarichi(telaio(), az, 500);
  assert.deepEqual(f.a, { x: 0, z: 3000 });
  assert.deepEqual(f.da, { x: -500, z: 3000 });
});
test("frecceDeiCarichi: niente frecce per gravità, y, momenti, q nullo, riferimenti rotti, azione nulla", () => {
  const m = telaio();
  const con = (c) => frecceDeiCarichi(m, { id: 1, nome: "x", natura: "G1", categoria: null, generata: false, carichi: [c] }, 500);
  assert.deepEqual(frecceDeiCarichi(m, null, 500), []);
  assert.deepEqual(con({ tipo: "gravita", fattore_x: 0, fattore_y: 0, fattore_z: -1 }), []);
  assert.deepEqual(con({ tipo: "distribuito", asta: 1, q: -1, direzione: "y" }), []);
  assert.deepEqual(con({ tipo: "distribuito", asta: 1, q: 0, direzione: "z" }), []);
  assert.deepEqual(con({ tipo: "distribuito", asta: 9, q: -1, direzione: "z" }), []);
  assert.deepEqual(con({ tipo: "nodale", nodo: 1, Fx: 0, Fy: 100, Fz: 0, Mx: 0, My: 5, Mz: 0 }), []);
  assert.deepEqual(con({ tipo: "nodale", nodo: 9, Fx: 1, Fy: 0, Fz: 0, Mx: 0, My: 0, Mz: 0 }), []);
});
test("frecceDeiCarichi: un'azione senza carichi non dà frecce", () => {
  const az = { id: 1, nome: "vuota", natura: "G1", categoria: null, generata: false, carichi: [] };
  assert.deepEqual(frecceDeiCarichi(telaio(), az, 500), []);
});
test("frecceDeiCarichi: locale_z su un pilastro è perpendicolare all'asta", () => {
  const az = { id: 1, nome: "w", natura: "Q", categoria: "vento", generata: false,
               carichi: [{ tipo: "distribuito", asta: 2, q: 3, direzione: "locale_z" }] };
  const [f] = frecceDeiCarichi(telaio(), az, 500);
  assert.equal(f.a.z - f.da.z, 0);        // nessuna componente lungo il pilastro
  assert.equal(Math.abs(f.a.x - f.da.x), 500);
});
test("frecceDeiCarichi: lunghezza zero dà frecce degeneri, non un'eccezione", () => {
  const az = { id: 1, nome: "g", natura: "G2", categoria: null, generata: false,
               carichi: [{ tipo: "nodale", nodo: 3, Fx: 20000, Fy: 0, Fz: 0, Mx: 0, My: 0, Mz: 0 },
                         { tipo: "distribuito", asta: 1, q: -12.5, direzione: "z" }] };
  const f = frecceDeiCarichi(telaio(), az, 0);
  assert.equal(f.length, 4);
  for (const k of f) assert.deepEqual(k.da, k.a);
});

// --- il carico vuoto del «+» dell'editor (fix di fine ramo, C16) -------------------------
// La regola stava dentro `app.js`, dove per provarla serviva il DOM: quale bersaglio prende
// un carico appena nato, e cosa si risponde quando quel bersaglio non c'è. È una regola sui
// carichi, e sta con loro; `app.js` ne fa solo `dì` e `esegui`.

const spoglio = () => ({ nodi: [], aste: [] });
const soloUnNodo = () => ({ nodi: [{ id: 1, x: 0, y: 0, z: 0 }], aste: [] });

test("caricoVuoto: il nodale nasce sul primo nodo, passato da normalizzaCarico", () => {
  const { carico, messaggio } = caricoVuoto(telaio(), "nodale");
  assert.equal(messaggio, null);
  assert.deepEqual(carico, { tipo: "nodale", nodo: 1, Fx: 0, Fy: 0, Fz: 0, Mx: 0, My: 0, Mz: 0 });
});

test("caricoVuoto: il distribuito nasce sulla prima asta, con q zero e direzione z", () => {
  const { carico, messaggio } = caricoVuoto(telaio(), "distribuito");
  assert.equal(messaggio, null);
  assert.deepEqual(carico, { tipo: "distribuito", asta: 1, q: 0, direzione: "z" });
});

test("caricoVuoto: il cedimento prende il nodo, il termico l'asta", () => {
  assert.equal(caricoVuoto(telaio(), "cedimento").carico.nodo, 1);
  assert.equal(caricoVuoto(telaio(), "termico").carico.asta, 1);
});

// Ingresso degenere: la gravità non vuole nessun riferimento, quindi nasce anche su un
// modello vuoto — ed è l'unico tipo che ci riesce.
test("caricoVuoto: la gravità nasce su un modello vuoto, e tira in giù", () => {
  assert.deepEqual(caricoVuoto(spoglio(), "gravita"),
    { carico: { tipo: "gravita", fattore_x: 0, fattore_y: 0, fattore_z: -1 }, messaggio: null });
});

// Ingresso degenere: nessun bersaglio a cui appendere il carico. Il messaggio nomina il tasto.
test("caricoVuoto: senza bersaglio il carico non nasce, e si dice cosa manca", () => {
  assert.deepEqual(caricoVuoto(spoglio(), "nodale"), { carico: null, messaggio: "serve un nodo: premi N" });
  assert.deepEqual(caricoVuoto(spoglio(), "cedimento"), { carico: null, messaggio: "serve un nodo: premi N" });
  assert.deepEqual(caricoVuoto(soloUnNodo(), "distribuito"), { carico: null, messaggio: "serve un'asta" });
  assert.deepEqual(caricoVuoto(soloUnNodo(), "termico"), { carico: null, messaggio: "serve un'asta" });
});

// Ingresso degenere: un tipo che non esiste — il select non lo produce, un file scritto a
// mano sì. Messaggio, mai un'eccezione.
test("caricoVuoto: un tipo sconosciuto dà il messaggio di normalizzaCarico, non solleva", () => {
  const { carico, messaggio } = caricoVuoto(telaio(), "vento");
  assert.equal(carico, null);
  assert.match(messaggio, /«vento» sconosciuto/);
});
