import { test } from "node:test";
import assert from "node:assert/strict";
import { righe, prossimoVincolo, copiaPreimpostazione, presetPremuto, creaPannello }
  from "../pannello.js";
import { GRADI, PREIMPOSTAZIONI, vincoloVuoto } from "../vincoli.js";
import { creaNodo, estrudi } from "../comandi.js";
import { modelloVuoto } from "../modello.js";

function elementoFinto() {
  const listeners = {};
  return {
    type: "", textContent: "", checked: false, hidden: false, className: "", id: "",
    _figli: [], _attrs: {},
    setAttribute(k, v) { this._attrs[k] = String(v); },
    getAttribute(k) { return this._attrs[k]; },
    addEventListener(ev, fn) { (listeners[ev] ??= []).push(fn); },
    dispatch(ev) { (listeners[ev] ?? []).forEach((fn) => fn()); },
    append(...figli) { this._figli.push(...figli); },
    replaceChildren(...figli) { this._figli = figli; },
  };
}

globalThis.document = {
  createElement: () => elementoFinto(),
  createTextNode: (t) => ({ nodeType: 3, textContent: t }),
};

// Naviga dentro il DOM finto costruito da `editorVincolo`: box → [fila, gradi].
function contenutoEditor(editor) {
  const box = editor._figli[0];
  const [fila, gradi] = box._figli;
  return { bottoni: fila._figli, caselle: gradi._figli.map((et) => et._figli[0]) };
}

const CON_CERNIERA = () => estrudi(creaNodo(modelloVuoto(), { x: 0, z: 0 }), { da: 1, dx: 3000, dz: 0 });

// --- righe (logica pura) ---

test("righe: nodo senza vincolo mostra «libero», mai «undefined»", () => {
  const m = creaNodo(modelloVuoto(), { x: 0, z: 3000 });
  const r = righe(m, { tipo: "nodo", id: 1 });
  assert.deepEqual(r.find(([k]) => k === "vincolo"), ["vincolo", "libero"]);
});

test("righe: nodo con id inesistente torna null, non solleva", () => {
  const m = creaNodo(modelloVuoto(), { x: 0, z: 0 });
  assert.equal(righe(m, { tipo: "nodo", id: 999 }), null);
});

test("righe: asta con id inesistente torna null, non solleva", () => {
  const m = CON_CERNIERA();
  assert.equal(righe(m, { tipo: "asta", id: 999 }), null);
});

test("righe: asta senza sezione la dice non assegnata (giornata 11b)", () => {
  const m = CON_CERNIERA();
  const r = righe(m, { tipo: "asta", id: m.aste[0].id });
  assert.deepEqual(r.find(([k]) => k === "sezione"), ["sezione", "non assegnata (giornata 11b)"]);
});

// --- prossimoVincolo (mutante 3: scrivere solo il proprio grado) ---

test("prossimoVincolo ricostruisce i sei gradi, non solo quello toccato", () => {
  const attuale = { ...PREIMPOSTAZIONI.cerniera };  // ux,uy,uz true; rx,ry,rz false
  const risultato = prossimoVincolo(attuale, "rx", true);
  assert.deepEqual(risultato, { ux: true, uy: true, uz: true, rx: true, ry: false, rz: false });
});

test("prossimoVincolo da nessun vincolo accende solo il grado toccato", () => {
  assert.deepEqual(prossimoVincolo(undefined, "ux", true),
    { ux: true, uy: false, uz: false, rx: false, ry: false, rz: false });
});

test("prossimoVincolo che spegne l'ultimo grado acceso torna null, non un oggetto tutto falso", () => {
  assert.equal(prossimoVincolo({ ux: true }, "ux", false), null);
});

test("prossimoVincolo ignora chiavi sconosciute nel vincolo attuale: il risultato ne ha solo sei", () => {
  const risultato = prossimoVincolo({ ...vincoloVuoto(), pinguino: true }, "uy", true);
  assert.deepEqual(Object.keys(risultato).sort(), [...GRADI].sort());
});

// --- copiaPreimpostazione (mutante 1: per riferimento invece che copiata) ---

test("copiaPreimpostazione non ritorna la costante congelata per riferimento", () => {
  const copia = copiaPreimpostazione("incastro");
  assert.notEqual(copia, PREIMPOSTAZIONI.incastro);
  assert.deepEqual(copia, PREIMPOSTAZIONI.incastro);
});

test("copiaPreimpostazione('libero') è null, per liberare il nodo", () => {
  assert.equal(copiaPreimpostazione("libero"), null);
});

// --- presetPremuto (mutante 5: il vincolo vuoto letto come «incastro») ---

test("presetPremuto: nessun vincolo, o tutto libero, non preme nessuna preimpostazione", () => {
  for (const nome of Object.keys(PREIMPOSTAZIONI)) {
    assert.equal(presetPremuto(nome, undefined), false);
    assert.equal(presetPremuto(nome, vincoloVuoto()), false);
  }
  assert.equal(presetPremuto("libero", undefined), true);
  assert.equal(presetPremuto("libero", vincoloVuoto()), true);
});

test("presetPremuto: la preimpostazione giusta è premuta, le altre no", () => {
  assert.equal(presetPremuto("incastro", PREIMPOSTAZIONI.incastro), true);
  assert.equal(presetPremuto("cerniera", PREIMPOSTAZIONI.incastro), false);
  assert.equal(presetPremuto("libero", PREIMPOSTAZIONI.incastro), false);
});

// --- creaPannello: wiring DOM ---

function pannelloFinto(suVincolo = () => {}) {
  const dati = elementoFinto(), vuoto = elementoFinto(), editor = elementoFinto();
  const p = creaPannello(dati, vuoto, editor, { suVincolo });
  return { p, dati, vuoto, editor };
}

test("disegna: nessuna selezione mostra il vuoto, dati ed editor spariscono davvero", () => {
  const { p, dati, vuoto, editor } = pannelloFinto();
  p.disegna(modelloVuoto(), null);
  assert.equal(vuoto.hidden, false);
  assert.equal(dati.hidden, true);
  assert.deepEqual(dati._figli, []);
  assert.equal(editor.hidden, true);
  assert.deepEqual(editor._figli, []);
});

test("disegna: selezione su un id sparito non solleva, e si comporta come nessuna selezione", () => {
  const { p, dati, vuoto } = pannelloFinto();
  assert.doesNotThrow(() => p.disegna(creaNodo(modelloVuoto(), { x: 0, z: 0 }), { tipo: "nodo", id: 999 }));
  assert.equal(vuoto.hidden, false);
  assert.equal(dati.hidden, true);
});

test("disegna: un'asta selezionata non mostra l'editor del vincolo", () => {
  const m = CON_CERNIERA();
  const { p, editor } = pannelloFinto();
  p.disegna(m, { tipo: "asta", id: m.aste[0].id });
  assert.equal(editor.hidden, true);
  assert.deepEqual(editor._figli, []);
});

// --- mutante 2: campi precedenti non ripuliti al cambio di selezione ---

test("disegna: passare da un nodo a nessuna selezione svuota l'editor, non solo lo nasconde", () => {
  const m = creaNodo(modelloVuoto(), { x: 0, z: 0 });
  const { p, editor } = pannelloFinto();
  p.disegna(m, { tipo: "nodo", id: 1 });
  assert.ok(editor._figli.length > 0);
  p.disegna(m, null);
  assert.deepEqual(editor._figli, []);
});

test("disegna: passare da un nodo a un'asta svuota l'editor, non solo lo nasconde", () => {
  const m = CON_CERNIERA();
  const { p, editor } = pannelloFinto();
  p.disegna(m, { tipo: "nodo", id: 1 });
  assert.ok(editor._figli.length > 0);
  p.disegna(m, { tipo: "asta", id: m.aste[0].id });
  assert.deepEqual(editor._figli, []);
});

// --- l'editor per un nodo: tre preimpostazioni + libero, sei caselle ---

test("disegna: un nodo mostra 4 bottoni e 6 caselle coerenti col vincolo", () => {
  let m = creaNodo(modelloVuoto(), { x: 0, z: 0 });
  m.nodi[0].vincolo = { ...PREIMPOSTAZIONI.cerniera };
  const { p, editor } = pannelloFinto();
  p.disegna(m, { tipo: "nodo", id: 1 });
  const { bottoni, caselle } = contenutoEditor(editor);
  assert.equal(bottoni.length, 4);
  assert.deepEqual(bottoni.map((b) => [b.textContent, b.getAttribute("aria-pressed")]),
    [["incastro", "false"], ["cerniera", "true"], ["carrello", "false"], ["libero", "false"]]);
  assert.equal(caselle.length, 6);
  assert.deepEqual(caselle.map((c) => c.checked), [true, true, true, false, false, false]);
});

test("disegna: clic su una preimpostazione chiama suVincolo con una copia, non l'originale", () => {
  const m = creaNodo(modelloVuoto(), { x: 0, z: 0 });
  let ricevuto = "non chiamato";
  const { p, editor } = pannelloFinto((id, vincolo) => { ricevuto = vincolo; });
  p.disegna(m, { tipo: "nodo", id: 1 });
  const { bottoni } = contenutoEditor(editor);
  bottoni.find((b) => b.textContent === "incastro").dispatch("click");
  assert.deepEqual(ricevuto, PREIMPOSTAZIONI.incastro);
  assert.notEqual(ricevuto, PREIMPOSTAZIONI.incastro);
});

test("disegna: clic su «libero» chiama suVincolo con null", () => {
  let m = creaNodo(modelloVuoto(), { x: 0, z: 0 });
  m.nodi[0].vincolo = { ...PREIMPOSTAZIONI.incastro };
  let ricevuto = "non chiamato";
  const { p, editor } = pannelloFinto((id, vincolo) => { ricevuto = vincolo; });
  p.disegna(m, { tipo: "nodo", id: 1 });
  const { bottoni } = contenutoEditor(editor);
  bottoni.find((b) => b.textContent === "libero").dispatch("click");
  assert.equal(ricevuto, null);
});

test("disegna: spuntare una casella ricostruisce i sei gradi, non solo quello toccato", () => {
  let m = creaNodo(modelloVuoto(), { x: 0, z: 0 });
  m.nodi[0].vincolo = { ...PREIMPOSTAZIONI.cerniera };
  let ricevuto = null;
  const { p, editor } = pannelloFinto((id, vincolo) => { ricevuto = vincolo; });
  p.disegna(m, { tipo: "nodo", id: 1 });
  const { caselle } = contenutoEditor(editor);
  const casellaRx = caselle[GRADI.indexOf("rx")];
  casellaRx.checked = true;
  casellaRx.dispatch("change");
  assert.deepEqual(ricevuto, { ux: true, uy: true, uz: true, rx: true, ry: false, rz: false });
});
