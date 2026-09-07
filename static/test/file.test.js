import { test } from "node:test";
import assert from "node:assert/strict";
import { corto, messaggioErrore, testoStato, separaPercorso, depositoSicuro, creaFile }
  from "../file.js";

// `creaFile` chiama `document.createElement` solo dentro `disegnaRecenti()`, mai
// nell'inizializzazione dei test qui sotto in cui l'elenco parte vuoto — ma lo stub serve
// comunque perché `disegnaRecenti()` gira una volta alla creazione.
globalThis.document = { createElement: () => elementoFinto() };

function elementoFinto() {
  return {
    value: "",
    textContent: "",
    hidden: false,
    title: "",
    className: "",
    _figli: [],
    addEventListener() {},
    append(...figli) { this._figli.push(...figli); },
    replaceChildren(...figli) { this._figli = figli; },
  };
}

function radiceFinta() {
  const elementi = {
    "#file-percorso": elementoFinto(),
    "#file-stato": elementoFinto(),
    "#file-recenti": elementoFinto(),
    "#file-recenti-vuoto": elementoFinto(),
    "#file-apri": elementoFinto(),
  };
  return { elementi, querySelector: (sel) => elementi[sel] ?? null };
}

// --- corto ---

test("corto: assente torna un trattino", () => {
  assert.equal(corto(undefined), "—");
  assert.equal(corto(null), "—");
  assert.equal(corto(""), "—");
});

test("corto: le prime 8 cifre, non 7 né tutta l'impronta", () => {
  const lunga = "0137e564e923ec1e62688bfa9e12591acb4ae6125d3a6e1b1dfefdcfe2169bb0";
  assert.equal(corto(lunga), "0137e564");
  assert.equal(corto(lunga).length, 8);
});

// --- messaggioErrore ---

test("messaggioErrore: usa il motivo del server quando c'è", () => {
  assert.equal(messaggioErrore({ motivo: "nodi.0.pinguino: campo non previsto" }, 400),
    "nodi.0.pinguino: campo non previsto");
});

test("messaggioErrore: senza motivo dice lo stato, mai «undefined»", () => {
  assert.equal(messaggioErrore({}, 503), "il server ha risposto 503");
});

// --- testoStato ---

test("testoStato: niente percorso, niente modello aperto", () => {
  assert.equal(testoStato({ percorso: null, impronta: null, modificato: false }),
    "nessun modello aperto");
});

test("testoStato: percorso aperto mostra l'impronta corta, modificato in coda", () => {
  assert.equal(testoStato({ percorso: "/a", impronta: "0137e564e9...", modificato: false }),
    "impronta 0137e564");
  assert.equal(testoStato({ percorso: "/a", impronta: "0137e564e9...", modificato: true }),
    "impronta 0137e564 · modificato");
});

// --- separaPercorso ---

test("separaPercorso: senza cartella, il nome è il percorso intero", () => {
  assert.deepEqual(separaPercorso("muro_1.nova.json"), { cartella: "", nome: "muro_1.nova.json" });
});

test("separaPercorso: stringa vuota non solleva", () => {
  assert.deepEqual(separaPercorso(""), { cartella: "", nome: "" });
});

test("separaPercorso: divide all'ultimo separatore", () => {
  assert.deepEqual(separaPercorso("docs/caso-studio/muro_1.nova.json"),
    { cartella: "docs/caso-studio", nome: "muro_1.nova.json" });
});

// --- depositoSicuro (mutante 1: try/catch tolto, sostituito col `typeof` di prima) ---

test("depositoSicuro: senza un deposito reale, non solleva e torna un valore falso", () => {
  // In Node il globale `localStorage` esiste ma senza `--localstorage-file` vale `undefined`
  // (non lancia): il contratto che conta è «non solleva, e ciò che torna è falso», non un
  // confronto rigido con `null` che dipende dalla versione del runtime.
  assert.doesNotThrow(() => depositoSicuro());
  assert.ok(!depositoSicuro());
});

test("depositoSicuro: un getter che solleva torna null, non fa sollevare creaFile", (t) => {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get() { throw new DOMException("bloccato", "SecurityError"); },
  });
  t.after(() => { delete globalThis.localStorage; });
  assert.equal(depositoSicuro(), null);
});

// --- ingresso degenere: localStorage che solleva, nessun deposito iniettato ---

test("creaFile: localStorage bloccato e nessun deposito iniettato — l'area funziona, elenco vuoto", (t) => {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get() { throw new DOMException("bloccato", "SecurityError"); },
  });
  t.after(() => { delete globalThis.localStorage; });
  const radice = radiceFinta();
  assert.doesNotThrow(() => creaFile(radice, { suApertura() {}, suErrore() {}, suSalvataggio() {} }));
  assert.equal(radice.elementi["#file-recenti"].hidden, true);
  assert.equal(radice.elementi["#file-recenti-vuoto"].hidden, false);
});

// --- ingresso degenere + mutante 7: l'oggetto evento al posto di una stringa ---

test("apri: un oggetto evento al posto del percorso legge il campo, non solleva", async () => {
  const originale = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({ modello: { nodi: [] }, impronta: "abc" }),
  });
  const radice = radiceFinta();
  radice.elementi["#file-percorso"].value = "/tmp/dal-campo.json";
  let apertoCon = null;
  const f = creaFile(radice, {
    suApertura: (p) => { apertoCon = p; },
    suErrore: () => { throw new Error("non doveva fallire"); },
    suSalvataggio() {},
  });
  await assert.doesNotReject(() => f.apri({ type: "click" }));
  assert.equal(apertoCon, "/tmp/dal-campo.json");
  globalThis.fetch = originale;
});

// --- ingresso degenere + mutante 6: doppio Invio in corsa ---

test("apri: due chiamate in corsa producono una sola fetch", async () => {
  const originale = globalThis.fetch;
  let chiamate = 0;
  globalThis.fetch = async () => {
    chiamate++;
    await new Promise((r) => setTimeout(r, 5));
    return { ok: true, json: async () => ({ modello: { nodi: [] }, impronta: "abc" }) };
  };
  const radice = radiceFinta();
  radice.elementi["#file-percorso"].value = "/tmp/a.json";
  const f = creaFile(radice, { suApertura() {}, suErrore() {}, suSalvataggio() {} });
  await Promise.all([f.apri(), f.apri()]);
  assert.equal(chiamate, 1);
  globalThis.fetch = originale;
});
