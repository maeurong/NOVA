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
