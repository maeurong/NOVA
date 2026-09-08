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
    // Il fuoco: un `focus()` finto che sposta `document.activeElement`, per provare che
    // `creaPannello` lo ritrova dopo un `replaceChildren` (fix round 1, A3).
    focus() { globalThis.document.activeElement = this; },
  };
}

globalThis.document = {
  activeElement: null,
  createElement: () => elementoFinto(),
  createTextNode: (t) => ({ nodeType: 3, textContent: t }),
};

// Naviga dentro il DOM finto costruito da `editorVincolo`: editor → [fila, gradi], ognuno
// con la legenda come primo figlio (fix round 1, D: `<fieldset>`/`<legend>`).
function contenutoEditor(editor) {
  const [fila, gradi] = editor._figli;
  return { bottoni: fila._figli.slice(1), caselle: gradi._figli.slice(1).map((et) => et._figli[0]) };
}

const CON_CERNIERA = () => estrudi(creaNodo(modelloVuoto(), { x: 0, z: 0 }), { da: 1, dx: 3000, dz: 0 });

// --- righe (logica pura) ---

// C: un nodo appena nato non ha il campo `vincolo` (`comandi.js:creaNodo`), ed è lo stato
// che il Check Model segnala al piede. Dirlo «libero» lo confonde con la scelta opposta.
test("righe: nodo mai toccato mostra «non dichiarato», mai «undefined» né «libero»", () => {
  const m = creaNodo(modelloVuoto(), { x: 0, z: 3000 });
  const r = righe(m, { tipo: "nodo", id: 1 });
  assert.deepEqual(r.find(([k]) => k === "vincolo"), ["vincolo", "non dichiarato"]);
});

test("righe: nodo dichiarato libero mostra «libero», non «non dichiarato»", () => {
  const m = creaNodo(modelloVuoto(), { x: 0, z: 3000 });
  m.nodi[0].vincolo = vincoloVuoto();
  const r = righe(m, { tipo: "nodo", id: 1 });
  assert.deepEqual(r.find(([k]) => k === "vincolo"), ["vincolo", "libero"]);
});

// --- mutante D5: `mm(n.x)` e `mm(n.z)` scambiati ---

test("righe: x e z non si scambiano, e portano l'unità", () => {
  const m = creaNodo(modelloVuoto(), { x: 1200, z: 3000 });
  const r = new Map(righe(m, { tipo: "nodo", id: 1 }));
  // Lo spazio fine unificatore, non il punto (11c/D): quel che l'ispettore scrive dev'essere
  // ricopiabile nel campo di comando senza valere mille volte meno.
  assert.equal(r.get("x"), "1\u202F200 mm");
  assert.equal(r.get("z"), "3\u202F000 mm");
});

test("righe: nodo con id inesistente torna null, non solleva", () => {
  const m = creaNodo(modelloVuoto(), { x: 0, z: 0 });
  assert.equal(righe(m, { tipo: "nodo", id: 999 }), null);
});

test("righe: asta con id inesistente torna null, non solleva", () => {
  const m = CON_CERNIERA();
  assert.equal(righe(m, { tipo: "asta", id: 999 }), null);
});

test("righe: asta senza sezione la dice non assegnata, senza il nome della tappa interna", () => {
  const m = CON_CERNIERA();
  const r = righe(m, { tipo: "asta", id: m.aste[0].id });
  assert.deepEqual(r.find(([k]) => k === "sezione"), ["sezione", "non assegnata"]);
});

// --- mutante D6: la lunghezza dell'asta sempre «0 mm» ---

test("righe: la lunghezza dell'asta è quella vera, non zero", () => {
  const m = CON_CERNIERA();  // nodo 1 in (0,0), estrusione di 3000 mm lungo x
  const r = new Map(righe(m, { tipo: "asta", id: m.aste[0].id }));
  assert.equal(r.get("lunghezza"), "3\u202F000 mm");
});

// --- prossimoVincolo (mutante: scrivere solo il proprio grado) ---

test("prossimoVincolo ricostruisce i sei gradi, non solo quello toccato", () => {
  const attuale = { ...PREIMPOSTAZIONI.cerniera };  // ux,uy,uz true; rx,ry,rz false
  const risultato = prossimoVincolo(attuale, "rx", true);
  assert.deepEqual(risultato, { ux: true, uy: true, uz: true, rx: true, ry: false, rz: false });
});

test("prossimoVincolo da nessun vincolo accende solo il grado toccato", () => {
  assert.deepEqual(prossimoVincolo(undefined, "ux", true),
    { ux: true, uy: false, uz: false, rx: false, ry: false, rz: false });
});

// --- B: "libero" dichiara, non cancella (fix round 1) ---

test("prossimoVincolo che spegne l'ultimo grado acceso dichiara libero (sei falsi), non cancella", () => {
  assert.deepEqual(prossimoVincolo({ ux: true }, "ux", false), vincoloVuoto());
});

test("prossimoVincolo ignora chiavi sconosciute nel vincolo attuale: il risultato ne ha solo sei", () => {
  const risultato = prossimoVincolo({ ...vincoloVuoto(), pinguino: true }, "uy", true);
  assert.deepEqual(Object.keys(risultato).sort(), [...GRADI].sort());
});

// --- copiaPreimpostazione (mutante: per riferimento invece che copiata) ---

test("copiaPreimpostazione non ritorna la costante congelata per riferimento", () => {
  const copia = copiaPreimpostazione("incastro");
  assert.notEqual(copia, PREIMPOSTAZIONI.incastro);
  assert.deepEqual(copia, PREIMPOSTAZIONI.incastro);
});

test("copiaPreimpostazione('libero') dichiara libero (sei falsi), non cancella", () => {
  assert.deepEqual(copiaPreimpostazione("libero"), vincoloVuoto());
});

// --- presetPremuto (mutante: il vincolo vuoto letto come «incastro») ---

test("presetPremuto: nessun vincolo, o tutto libero, non preme nessuna preimpostazione", () => {
  for (const nome of Object.keys(PREIMPOSTAZIONI)) {
    assert.equal(presetPremuto(nome, undefined), false);
    assert.equal(presetPremuto(nome, vincoloVuoto()), false);
  }
});

// --- C: «libero» premuto è la scelta, non la dimenticanza ---
// Su un nodo mai toccato il bottone deve restare **da premere**: premerlo è esattamente il
// rimedio al «nodi al piede senza vincolo dichiarato» del Check Model.

test("presetPremuto: «libero» non è premuto su un nodo mai toccato", () => {
  assert.equal(presetPremuto("libero", null), false);
  assert.equal(presetPremuto("libero", undefined), false);
});

test("presetPremuto: «libero» è premuto su un nodo dichiarato libero", () => {
  assert.equal(presetPremuto("libero", vincoloVuoto()), true);
  assert.equal(presetPremuto("libero", {}), true);
});

test("presetPremuto: la preimpostazione giusta è premuta, le altre no", () => {
  assert.equal(presetPremuto("incastro", PREIMPOSTAZIONI.incastro), true);
  assert.equal(presetPremuto("cerniera", PREIMPOSTAZIONI.incastro), false);
  assert.equal(presetPremuto("libero", PREIMPOSTAZIONI.incastro), false);
});

// --- creaPannello: wiring DOM ---

function pannelloFinto(suVincolo = () => {}) {
  const dati = elementoFinto(), vuoto = elementoFinto(), editor = elementoFinto();
  const p = creaPannello({ dati, vuoto, editor }, { suVincolo });
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

test("disegna: un'asta selezionata mostra i dati ma non l'editor del vincolo", () => {
  const m = CON_CERNIERA();
  const { p, dati, vuoto, editor } = pannelloFinto();
  p.disegna(m, { tipo: "asta", id: m.aste[0].id });
  // C1: le tre direzioni «visibile», non solo «nascosto» — un mutante che tiene tutto
  // nascosto passerebbe se si asserisse solo l'assenza dell'editor.
  assert.equal(vuoto.hidden, true);
  assert.equal(dati.hidden, false);
  assert.equal(editor.hidden, true);
  assert.deepEqual(editor._figli, []);
});

// --- mutante: campi precedenti non ripuliti al cambio di selezione ---

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

test("disegna: un nodo mostra dati ed editor (C1), 4 bottoni e 6 caselle coerenti col vincolo", () => {
  let m = creaNodo(modelloVuoto(), { x: 0, z: 0 });
  m.nodi[0].vincolo = { ...PREIMPOSTAZIONI.cerniera };
  const { p, dati, vuoto, editor } = pannelloFinto();
  p.disegna(m, { tipo: "nodo", id: 1 });
  assert.equal(vuoto.hidden, true);
  assert.equal(dati.hidden, false);
  assert.equal(editor.hidden, false);
  const { bottoni, caselle } = contenutoEditor(editor);
  assert.equal(bottoni.length, 4);
  assert.deepEqual(bottoni.map((b) => [b.textContent, b.getAttribute("aria-pressed")]),
    [["incastro", "false"], ["cerniera", "true"], ["carrello", "false"], ["libero", "false"]]);
  assert.equal(caselle.length, 6);
  assert.deepEqual(caselle.map((c) => c.checked), [true, true, true, false, false, false]);
});

// --- C2: il vincolo non-preset, l'ingresso più frequente ---

test("disegna: un vincolo non-preset {ux, rx} non preme nessun bottone e spunta solo le sue caselle", () => {
  let m = creaNodo(modelloVuoto(), { x: 0, z: 0 });
  m.nodi[0].vincolo = { ...vincoloVuoto(), ux: true, rx: true };
  const { p, dati, editor } = pannelloFinto();
  p.disegna(m, { tipo: "nodo", id: 1 });
  const { bottoni, caselle } = contenutoEditor(editor);
  assert.ok(bottoni.every((b) => b.getAttribute("aria-pressed") === "false"), "nessuna preimpostazione combacia");
  assert.deepEqual(caselle.map((c) => c.checked), [true, false, false, true, false, false]);
  const riga = dati._figli.find((el) => el.textContent === "vincolo");
  // la `<dd>` segue la sua `<dt>`: stessa posizione nell'elenco appiattito
  const indice = dati._figli.indexOf(riga);
  assert.equal(dati._figli[indice + 1].textContent, "bloccati: ux, rx");
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

test("disegna: clic su «libero» chiama suVincolo dichiarando libero (sei falsi), non con null", () => {
  let m = creaNodo(modelloVuoto(), { x: 0, z: 0 });
  m.nodi[0].vincolo = { ...PREIMPOSTAZIONI.incastro };
  let ricevuto = "non chiamato";
  const { p, editor } = pannelloFinto((id, vincolo) => { ricevuto = vincolo; });
  p.disegna(m, { tipo: "nodo", id: 1 });
  const { bottoni } = contenutoEditor(editor);
  bottoni.find((b) => b.textContent === "libero").dispatch("click");
  assert.deepEqual(ricevuto, vincoloVuoto());
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

// --- A3: il fuoco sopravvive a un `replaceChildren` (mutante: fuoco non ripristinato) ---

test("disegna: la casella a fuoco resta a fuoco dopo che il vincolo cambia e l'editor si ricostruisce", () => {
  let m = creaNodo(modelloVuoto(), { x: 0, z: 0 });
  m.nodi[0].vincolo = { ...PREIMPOSTAZIONI.cerniera };
  const { p, editor } = pannelloFinto();
  p.disegna(m, { tipo: "nodo", id: 1 });
  const primaVolta = contenutoEditor(editor);
  const indiceRx = GRADI.indexOf("rx");
  primaVolta.caselle[indiceRx].focus();
  assert.equal(globalThis.document.activeElement, primaVolta.caselle[indiceRx]);

  // Il vincolo cambia (come farebbe `suVincolo` dopo l'evento reale) e si ridisegna: l'editor
  // si ricostruisce da zero, ma il fuoco deve seguire l'omologo nuovo, non tornare a `body`.
  m.nodi[0].vincolo = { ...m.nodi[0].vincolo, rx: true };
  p.disegna(m, { tipo: "nodo", id: 1 });
  const dopo = contenutoEditor(editor);
  assert.notEqual(dopo.caselle[indiceRx], primaVolta.caselle[indiceRx], "l'editor si è ricostruito davvero");
  assert.equal(globalThis.document.activeElement, dopo.caselle[indiceRx]);
});

test("disegna: il fuoco altrove non viene rubato quando l'editor si ricostruisce", () => {
  const m = creaNodo(modelloVuoto(), { x: 0, z: 0 });
  const { p, editor } = pannelloFinto();
  const altrove = elementoFinto();
  globalThis.document.activeElement = altrove;
  p.disegna(m, { tipo: "nodo", id: 1 });
  assert.equal(globalThis.document.activeElement, altrove);
});
