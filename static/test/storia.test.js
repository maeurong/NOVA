import { test } from "node:test";
import assert from "node:assert/strict";
import { creaStoria } from "../storia.js";

// Stesso finto DOM di `pannello.test.js`: `dispatch(ev)` chiama i listener registrati per
// quel nome di evento, senza costruire un vero oggetto evento — click e keydown Invio/Spazio
// non ne leggono le proprietà nel loro ramo utile.
function elementoFinto() {
  const listeners = {};
  return {
    className: "", textContent: "", tabIndex: -1, _figli: [], _attrs: {},
    setAttribute(k, v) { this._attrs[k] = String(v); },
    getAttribute(k) { return this._attrs[k]; },
    addEventListener(ev, fn) { (listeners[ev] ??= []).push(fn); },
    dispatch(ev) { (listeners[ev] ?? []).forEach((fn) => fn()); },
    append(...figli) { this._figli.push(...figli); },
    replaceChildren(...figli) { this._figli = figli; },
    // Il vero `scrollIntoView` non esiste in Node: qui registra come è stato chiamato, che è
    // l'unica cosa che il codice gli chiede (fix round 2, grave 2).
    scrollIntoView(opzioni) { this._scrollato = opzioni ?? true; },
  };
}

globalThis.document = { createElement: () => elementoFinto() };

// --- ingresso degenere: cronologia con una voce sola (appena aperto) -------

test("disegna: una cronologia con una voce sola la mostra attiva, non uno spazio vuoto", () => {
  const elenco = elementoFinto();
  const s = creaStoria(elenco, { suSalto: () => {} });
  s.disegna([{ etichetta: "modello vuoto", attiva: true }]);
  assert.equal(elenco._figli.length, 1);
  assert.equal(elenco._figli[0].getAttribute("aria-current"), "true");
  // Con una voce sola non c'è niente da scorrere, e `block: "nearest"` è proprio la forma
  // che non muove nulla quando la voce è già in campo: nessuna barra, nessun salto.
  assert.deepEqual(elenco._figli[0]._scrollato, { block: "nearest" });
});

// --- fix round 2, grave 2: la voce attiva resta nel campo visibile -------------
// Misurato dal revisore: alla sedicesima voce il fondo dell'elenco sta a 821px su 833 di
// pannello, alla diciassettesima a 841 con `scrollTop` a 0. Da lì in poi la voce attiva è
// fuori campo e niente la riporta dentro — e l'unico contenitore che scorreva era
// `#pannello`, quindi cercare nella cronologia spingeva fuori la sezione «Selezione».

test("a venti comandi la voce attiva viene riportata in campo, non lasciata fuori", () => {
  const elenco = elementoFinto();
  const s = creaStoria(elenco, { suSalto: () => {} });
  const voci = Array.from({ length: 20 }, (_, i) => ({ etichetta: `comando ${i}`, attiva: i === 19 }));
  s.disegna(voci);
  assert.deepEqual(elenco._figli[19]._scrollato, { block: "nearest" },
                   "la voce attiva non viene riportata nel campo visibile");
  // e solo lei: scorrere anche le altre le farebbe la guerra a vicenda
  assert.equal(elenco._figli[0]._scrollato, undefined);
});

test("dopo un salto indietro è la nuova voce attiva a rientrare in campo", () => {
  const elenco = elementoFinto();
  const s = creaStoria(elenco, { suSalto: () => {} });
  const voci = Array.from({ length: 20 }, (_, i) => ({ etichetta: `comando ${i}`, attiva: i === 2 }));
  s.disegna(voci);
  assert.deepEqual(elenco._figli[2]._scrollato, { block: "nearest" });
  assert.equal(elenco._figli[19]._scrollato, undefined);
});

// --- 11c/F: le voci sono raggiungibili da tastiera, e lo dicono ---------------
// Togliere `tabIndex = 0` e il `role` lasciava i 277 test verdi e la Storia irraggiungibile
// con ⇥: un elenco che si apre solo al clic è un comando che chi usa la tastiera non ha
// (WCAG 2.1.1). Il `role` porta anche la seconda metà: è lui che `daControllo` riconosce,
// e senza di lui l'Invio che salta a uno snapshot risale al listener globale come «conferma».

test("ogni voce è raggiungibile con ⇥ e si dichiara un bottone", () => {
  const elenco = elementoFinto();
  const s = creaStoria(elenco, { suSalto: () => {} });
  s.disegna([{ etichetta: "a", attiva: true }, { etichetta: "b", attiva: false }]);
  for (const li of elenco._figli) {
    assert.equal(li.tabIndex, 0, "la voce deve stare nell'ordine di tabulazione");
    assert.equal(li.getAttribute("role"), "button");
  }
});

// --- mutante 3: la voce attiva è marcata solo dal colore --------------------

test("la voce attiva porta un segno anche fuori dal colore: aria-current e «▸», non il solo class", () => {
  const elenco = elementoFinto();
  const s = creaStoria(elenco, { suSalto: () => {} });
  s.disegna([{ etichetta: "modello vuoto", attiva: false }, { etichetta: "nodo 1", attiva: true }]);
  const [prima, seconda] = elenco._figli;
  assert.equal(prima.getAttribute("aria-current"), "false");
  assert.equal(seconda.getAttribute("aria-current"), "true");
  assert.ok(seconda.textContent.includes("▸"), "manca il segno testuale sulla voce attiva");
  assert.ok(!prima.textContent.includes("▸"));
});

test("le voci dopo l'attiva sono distinte da quelle prima: il futuro rifacibile si riconosce", () => {
  const elenco = elementoFinto();
  const s = creaStoria(elenco, { suSalto: () => {} });
  s.disegna([
    { etichetta: "a", attiva: false },
    { etichetta: "b", attiva: true },
    { etichetta: "c", attiva: false },
  ]);
  const [passato, attivo, futuro] = elenco._figli;
  assert.equal(passato.className, "");
  assert.equal(futuro.className, "storia-futuro");
  assert.notEqual(attivo.className, futuro.className);
  assert.notEqual(attivo.className, passato.className);
});

// --- mutante 4: il clic su una voce salta all'indice sbagliato (fuori di uno) ---

test("clic sulla voce i chiama suSalto(i), non un indice fuori di uno", () => {
  let ricevuto = null;
  const elenco = elementoFinto();
  const s = creaStoria(elenco, { suSalto: (i) => { ricevuto = i; } });
  s.disegna([{ etichetta: "a", attiva: false }, { etichetta: "b", attiva: true }, { etichetta: "c", attiva: false }]);
  elenco._figli[2].dispatch("click");
  assert.equal(ricevuto, 2);
  elenco._figli[0].dispatch("click");
  assert.equal(ricevuto, 0);
  elenco._figli[1].dispatch("click");
  assert.equal(ricevuto, 1);
});
