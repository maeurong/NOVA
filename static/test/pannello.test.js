import { test } from "node:test";
import assert from "node:assert/strict";
import { righe, prossimoVincolo, copiaPreimpostazione, presetPremuto, creaPannello }
  from "../pannello.js";
import { GRADI, PREIMPOSTAZIONI, vincoloVuoto } from "../vincoli.js";
import { creaNodo, estrudi, creaSezione, materialiDiDefault,
         creaAzione, aggiungiCarico, creaCombinazione, impostaTermine, impostaVincolo } from "../comandi.js";
import { modelloVuoto } from "../modello.js";
import { leggiNumero, stampaNumero } from "../numeri.js";
import { daRisposta } from "../rilievo.js";

function elementoFinto() {
  const listeners = {};
  return {
    type: "", textContent: "", checked: false, hidden: false, className: "", id: "",
    // `value` e `selected` per i campi e le voci dei tre editor della 11b; `innerHTML` perché
    // il disegno della sezione e la curva del legame arrivano come stringa SVG già fatta.
    value: "", selected: false, innerHTML: "",
    _figli: [], _attrs: {},
    setAttribute(k, v) { this._attrs[k] = String(v); },
    getAttribute(k) { return this._attrs[k]; },
    addEventListener(ev, fn) { (listeners[ev] ??= []).push(fn); },
    dispatch(ev, bersaglio) { (listeners[ev] ?? []).forEach((fn) => fn(bersaglio ? { target: bersaglio } : undefined)); },
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

// Tutto l'albero finto sotto una radice, radice compresa.
function tutti(radice) {
  const out = [radice];
  for (const f of radice._figli ?? []) out.push(...tutti(f));
  return out;
}
// I controlli dell'editor, a qualunque profondità, che portano un `aria-label`.
const controlliCon = (radice, testo) =>
  tutti(radice).filter((e) => (e._attrs?.["aria-label"] ?? "").includes(testo));

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

const AZIONI = ["suVincolo", "suSezione", "suFila", "suAssegna", "suDanno", "suMateriale",
                "suVeste", "suAvviso", "suAzione", "suCarico", "suTogliCarico",
                "suAggiungiCarico", "suCombinazione", "suTermine",
                "suConfermaVincolo", "suConfermaTutti"];

// Un registratore per azione: un solo argomento entra com'è (`suAvviso("…")`, `suVeste("media")`),
// due o più entrano come lista (`suAssegna(1, null)` → `[1, null]`).
function pannelloFinto(suVincolo = null) {
  const chiamate = Object.fromEntries(AZIONI.map((k) => [k, []]));
  const azioni = Object.fromEntries(AZIONI.map((k) =>
    [k, (...a) => chiamate[k].push(a.length === 1 ? a[0] : a)]));
  if (suVincolo) azioni.suVincolo = suVincolo;
  const dati = elementoFinto(), vuoto = elementoFinto(), editor = elementoFinto();
  const p = creaPannello({ dati, vuoto, editor }, azioni);
  return { p, pannello: p, dati, vuoto, editor, chiamate };
}

// Due nodi, un'asta (id 1), i due materiali di default (1 calcestruzzo, 2 acciaio) e una
// sezione 300 × 500 (id 1). `conSezione` è lo stesso senza nodi né aste.
function conSezione() {
  const { modello } = materialiDiDefault(modelloVuoto());
  return creaSezione(modello, { b: 300, h: 500, calcestruzzo: 1, acciaio: 2 });
}
function conSezioneEAsta() {
  const { modello } = materialiDiDefault(CON_CERNIERA());
  return creaSezione(modello, { b: 300, h: 500, calcestruzzo: 1, acciaio: 2 });
}
const conStaffe = (m) => {
  m.sezioni[0].staffe = { diametro: 8, passo: 150, bracci: 2 };
  return m;
};

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

test("disegna: un'asta selezionata mostra i dati e il suo editor, non quello del vincolo", () => {
  const m = CON_CERNIERA();
  const { p, dati, vuoto, editor } = pannelloFinto();
  p.disegna(m, { tipo: "asta", id: m.aste[0].id });
  // C1: le tre direzioni «visibile», non solo «nascosto» — un mutante che tiene tutto
  // nascosto passerebbe se si asserisse solo la forma dell'editor.
  assert.equal(vuoto.hidden, true);
  assert.equal(dati.hidden, false);
  assert.equal(editor.hidden, false);
  // Dalla 11b l'asta ha il suo editor: i due gruppi sono «sezione» e «danno dal rilievo»,
  // e i sei gradi del vincolo non compaiono (quelli restano dei nodi).
  assert.deepEqual(editor._figli.map((f) => f._figli[0].textContent), ["sezione", "danno dal rilievo"]);
  assert.ok(editor._figli.every((f) => !f.className.includes("vincolo")));
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

test("disegna: passare da un nodo a un'asta sostituisce l'editor, non ci accumula sopra", () => {
  const m = CON_CERNIERA();
  const { p, editor } = pannelloFinto();
  p.disegna(m, { tipo: "nodo", id: 1 });
  assert.deepEqual(editor._figli.map((f) => f.className),
    ["vincolo-preimpostazioni", "vincolo-gradi"]);
  p.disegna(m, { tipo: "asta", id: m.aste[0].id });
  assert.deepEqual(editor._figli.map((f) => f._figli[0].textContent), ["sezione", "danno dal rilievo"]);
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

// ==========================================================================================
// 11b: gli editor di asta, sezione e materiale
// ==========================================================================================

// Il legame come lo consegna il server (Task 1 → Task 9): `{valori, catalogo, legame}`.
const LEGAME_C25 = {
  valori: { avvisi: [], note: ["valori medi, §C8.5.4"] },
  catalogo: { E: 31476, nu: 0.2, densita: 2.5e-9, fck: 25 },
  legame: { tipo: "concrete02", fpc: -25, epsc0: -0.002, fpcu: -5, epsU: -0.0035,
            ft: 2.5, Ec: 31476, lambda: 0.1, articolo: "NTC 2018 §4.1.2.1.2.2" },
};

// --- riga 1: la sezione selezionata sparisce sotto i piedi (⌘Z dopo S) ---

test("righe: selezione su una sezione sparita torna null, editor vuoto, nessuna eccezione", () => {
  const m = conSezione();
  const { p, dati, vuoto, editor } = pannelloFinto();
  assert.equal(righe(m, { tipo: "sezione", id: 99 }), null);
  assert.doesNotThrow(() => p.disegna(m, { tipo: "sezione", id: 99 }));
  assert.equal(vuoto.hidden, false);
  assert.equal(dati.hidden, true);
  assert.equal(editor.hidden, true);
  assert.deepEqual(editor._figli, []);
});

// --- riga extra del controller: un tipo che l'ispettore non conosce ---

test("righe: una selezione di tipo ignoto torna null e non solleva", () => {
  const m = conSezione();
  const { p, editor } = pannelloFinto();
  assert.equal(righe(m, { tipo: "azione", id: 1 }), null);
  assert.doesNotThrow(() => p.disegna(m, { tipo: "azione", id: 1 }));
  assert.deepEqual(editor._figli, []);
});

// --- riga 2: asta senza sezione ---

test("editorAsta: asta senza sezione dice «non assegnata» e tiene il select sulla voce vuota", () => {
  const m = conSezioneEAsta();
  const { p, editor } = pannelloFinto();
  p.disegna(m, { tipo: "asta", id: 1 });
  const r = new Map(righe(m, { tipo: "asta", id: 1 }));
  assert.equal(r.get("sezione"), "non assegnata");
  const opzioni = editor._figli[0]._figli[1]._figli[1]._figli;
  assert.deepEqual(opzioni.map((o) => [o.textContent, o.selected]),
    [["— non assegnata", true], ["300 × 500", false]]);
});

test("righe: asta con sezione la dice per nome, non per identificatore", () => {
  const m = conSezioneEAsta();
  m.aste[0].sezione = 1;
  assert.equal(new Map(righe(m, { tipo: "asta", id: 1 })).get("sezione"), "300 × 500");
});

// --- riga 3: danno senza nota, niente trattino appeso ---

test("righe: il danno senza nota non appende il separatore", () => {
  const m = CON_CERNIERA();
  m.aste[0].danno = { fattore_E: 0.8, fattore_fc: 0.9, nota: "" };
  assert.equal(new Map(righe(m, { tipo: "asta", id: 1 })).get("danno"), "E ×0,8 · fc ×0,9");
});

test("righe: il danno con nota la mette in coda, e senza danno dice «nessuno»", () => {
  const m = CON_CERNIERA();
  assert.equal(new Map(righe(m, { tipo: "asta", id: 1 })).get("danno"), "nessuno");
  m.aste[0].danno = { fattore_E: 0.8, fattore_fc: 0.9, nota: "martinetto 3" };
  assert.equal(new Map(righe(m, { tipo: "asta", id: 1 })).get("danno"),
    "E ×0,8 · fc ×0,9 · martinetto 3");
});

// --- riga 4: senza staffe il deck non colloca le barre ---

test("editorSezione: senza staffe e con file non c'è nessun cerchio, e lo dice", () => {
  const m = conSezione();
  m.sezioni[0].file = [{ lato: "inf", n: 3, diametro: 16 }];
  const { p, editor } = pannelloFinto();
  p.disegna(m, { tipo: "sezione", id: 1 });
  const disegno = editor._figli.find((e) => e.className === "sezione-disegno");
  assert.ok(disegno.innerHTML.includes("<rect"), "il contorno c'è");
  assert.ok(!disegno.innerHTML.includes("<circle"), "nessuna barra collocata");
  const nota = editor._figli.at(-1);
  assert.equal(nota.className, "nota");
  assert.equal(nota.textContent, "senza staffe il deck non colloca le barre: aggiungile per vederle");
});

// --- riga 5: geometria impossibile ---

test("editorSezione: geometria impossibile disegna il contorno, nessun cerchio, e avvisa col motivo", () => {
  const m = conStaffe(conSezione());
  m.sezioni[0].file = [{ lato: "inf", n: 20, diametro: 16 }];
  const { p, editor } = pannelloFinto();
  p.disegna(m, { tipo: "sezione", id: 1 });
  const disegno = editor._figli.find((e) => e.className === "sezione-disegno");
  assert.ok(disegno.innerHTML.includes("<rect"), "contorno e staffa restano");
  assert.ok(!disegno.innerHTML.includes("<circle"), "nessuna barra collocata");
  const avviso = editor._figli.at(-1);
  assert.equal(avviso.className, "avviso");
  // Il rosso non è l'unico canale: la parola viene prima del colore.
  assert.ok(avviso.textContent.startsWith("attenzione: "), avviso.textContent);
  assert.ok(avviso.textContent.includes("ingombrano"), avviso.textContent);
});

// --- riga 6: il catalogo delle classi non è arrivato ---

test("editorMateriale: senza catalogo il select della classe ha la sola classe corrente, abilitato", () => {
  const m = conSezione();
  const { p, editor } = pannelloFinto();
  p.disegna(m, { tipo: "materiale", id: 1 }, { catalogo: null, legame: LEGAME_C25 });
  const sel = editor._figli[0]._figli[1]._figli[1];
  assert.deepEqual(sel._figli.map((o) => o.textContent), ["C25/30"]);
  assert.notEqual(sel.disabled, true);
  assert.equal(sel.getAttribute("disabled"), undefined);
});

test("editorMateriale: col catalogo il select elenca le classi del tipo, con la corrente scelta", () => {
  const m = conSezione();
  const { p, editor } = pannelloFinto();
  p.disegna(m, { tipo: "materiale", id: 1 },
    { catalogo: { calcestruzzo: ["C20/25", "C25/30", "C30/37"], acciaio: ["B450C"] }, legame: LEGAME_C25 });
  const opzioni = editor._figli[0]._figli[1]._figli[1]._figli;
  // la classe corrente apre l'elenco: è l'unico modo di mostrarla anche quando è fuori
  // catalogo (materiale `personalizzato`, `nova/modello.py:202-209`)
  assert.deepEqual(opzioni.map((o) => [o.textContent, o.selected]),
    [["C25/30", true], ["C20/25", false], ["C30/37", false]]);
});

// --- riga 7: il legame non è ancora arrivato ---

test("editorMateriale: legame null dice che i valori sono in arrivo, e non stampa la dl", () => {
  const m = conSezione();
  const { p, editor } = pannelloFinto();
  p.disegna(m, { tipo: "materiale", id: 1 }, { catalogo: null, legame: null });
  const lg = editor._figli.at(-1);
  assert.equal(lg._figli[1].textContent, "valori in arrivo dal server…");
  assert.equal(lg._figli.length, 2, "solo la legenda e la riga d'attesa");
});

// --- riga extra del controller: il terzo argomento manca del tutto ---

test("disegna: senza il terzo argomento vale {catalogo: null, legame: null}", () => {
  const m = conSezione();
  const { p, editor } = pannelloFinto();
  assert.doesNotThrow(() => p.disegna(m, { tipo: "materiale", id: 1 }));
  const sel = editor._figli[0]._figli[1]._figli[1];
  assert.deepEqual(sel._figli.map((o) => o.textContent), ["C25/30"]);
  assert.equal(editor._figli.at(-1)._figli[1].textContent, "valori in arrivo dal server…");
});

// --- riga 8: il server ha risposto con un errore ---

test("editorMateriale: legame con errore mostra l'avviso e nessuna curva", () => {
  const m = conSezione();
  const { p, editor } = pannelloFinto();
  p.disegna(m, { tipo: "materiale", id: 1 }, { catalogo: null, legame: { errore: "classe X9 sconosciuta" } });
  const lg = editor._figli.at(-1);
  assert.equal(lg._figli[1].className, "avviso");
  assert.equal(lg._figli[1].textContent, "attenzione: classe X9 sconosciuta");
  assert.ok(!lg._figli.some((e) => (e.innerHTML ?? "").includes("<svg")), "nessuna curva");
});

test("editorMateriale: col legame arriva la curva, la dl dei valori e l'articolo", () => {
  const m = conSezione();
  const { p, editor } = pannelloFinto();
  p.disegna(m, { tipo: "materiale", id: 1 }, { catalogo: null, legame: LEGAME_C25 });
  const lg = editor._figli.at(-1);
  const [disegno, segni, dl, art] = lg._figli.slice(1);
  assert.ok(disegno.innerHTML.includes("<path"), disegno.innerHTML.slice(0, 80));
  assert.match(segni.textContent, /compressione negativa/);
  assert.equal(dl._figli[0].textContent, "f_c");
  assert.equal(dl._figli[1].textContent, "25 MPa");
  assert.equal(art.textContent, "NTC 2018 §4.1.2.1.2.2");
  assert.equal(lg._figli.at(-1).textContent, "valori medi, §C8.5.4");
});

// --- riga 9 (e uno dei due test «per intero» del brief) ---

test("editorSezione: un testo che non è un numero avvisa, non modifica, e ripristina", () => {
  const { pannello, editor, chiamate } = pannelloFinto();
  pannello.disegna(conSezione(), { tipo: "sezione", id: 1 });
  // `_figli[0]` è il disegno: i gruppi di campi partono da 1
  const campoB = editor._figli[1]._figli[1]._figli[1];  // fieldset «dimensioni» → label b → input
  assert.equal(campoB.value, "300");
  campoB.value = "trecento"; campoB.dispatch("change");
  assert.equal(chiamate.suSezione.length, 0);
  assert.equal(chiamate.suAvviso[0], "«trecento» non è un numero");
  assert.equal(campoB.value, "300");
});

test("editorSezione: un numero scritto all'italiana passa a suSezione letto, non come testo", () => {
  const { pannello, editor, chiamate } = pannelloFinto();
  pannello.disegna(conSezione(), { tipo: "sezione", id: 1 });
  const campoB = editor._figli[1]._figli[1]._figli[1];
  campoB.value = "1.234,5"; campoB.dispatch("change");
  assert.deepEqual(chiamate.suSezione, [[1, { b: 1234.5 }]]);
});

// --- riga 10: il fuoco per indice in `controlli` ---

test("editorSezione: il campo a fuoco resta a fuoco dopo il ridisegno", () => {
  const m = conSezione();
  const { p, editor } = pannelloFinto();
  p.disegna(m, { tipo: "sezione", id: 1 });
  const prima = editor._figli[1]._figli[2]._figli[1];  // il campo h
  prima.focus();
  m.sezioni[0].h = 600;
  p.disegna(m, { tipo: "sezione", id: 1 });
  const dopo = editor._figli[1]._figli[2]._figli[1];
  assert.notEqual(dopo, prima, "l'editor si è ricostruito davvero");
  assert.equal(dopo.value, "600");
  assert.equal(globalThis.document.activeElement, dopo);
});

// --- riga 11: suDanno manda sempre i tre valori ---

test("editorAsta: cambiare un fattore manda tutti e tre i valori, gli altri due ai default", () => {
  const m = conSezioneEAsta();
  const { p, editor, chiamate } = pannelloFinto();
  p.disegna(m, { tipo: "asta", id: 1 });
  const campoE = editor._figli[1]._figli[1]._figli[1];
  campoE.value = "0,8"; campoE.dispatch("change");
  assert.deepEqual(chiamate.suDanno, [[1, { fattore_E: 0.8, fattore_fc: 1, nota: "" }]]);
});

test("editorAsta: il bottone «togli danno» c'è solo se un danno c'è, e manda null", () => {
  const m = conSezioneEAsta();
  const { p, editor, chiamate } = pannelloFinto();
  p.disegna(m, { tipo: "asta", id: 1 });
  assert.ok(!editor._figli[1]._figli.some((e) => e.textContent === "togli danno"));
  m.aste[0].danno = { fattore_E: 0.8, fattore_fc: 0.9, nota: "" };
  p.disegna(m, { tipo: "asta", id: 1 });
  const via = editor._figli[1]._figli.find((e) => e.textContent === "togli danno");
  via.dispatch("click");
  assert.deepEqual(chiamate.suDanno, [[1, null]]);
});

// --- l'altro test «per intero» del brief ---

test("editorAsta: scegliere una sezione dal select chiama suAssegna con l'identificatore", () => {
  const { pannello, editor, chiamate } = pannelloFinto();
  const m = conSezioneEAsta();
  pannello.disegna(m, { tipo: "asta", id: 1 });
  const select = editor._figli[0]._figli[1]._figli[1];  // fieldset «sezione» → label → select
  select.value = "1"; select.dispatch("change");
  assert.deepEqual(chiamate.suAssegna, [[1, 1]]);
  select.value = ""; select.dispatch("change");
  assert.deepEqual(chiamate.suAssegna[1], [1, null]);
});

// --- ruling 2: «1 asta», non «1 aste» ---

test("righe: la sezione usata da una sola asta dice «1 asta», non «1 aste»", () => {
  const m = conSezioneEAsta();
  const r = new Map(righe(m, { tipo: "sezione", id: 1 }));
  assert.equal(r.get("usata da"), "0 aste");
  m.aste[0].sezione = 1;
  assert.equal(new Map(righe(m, { tipo: "sezione", id: 1 })).get("usata da"), "1 asta");
});

// --- le altre righe di `righeDiMateriale` ---
// Quelle di `righeDiSezione` stanno in fondo, col fix di fine ramo che le ha ridotte a quattro.

test("righe: il materiale dice tipo, classe, personalizzato e origine", () => {
  const m = conSezione();
  const k = new Map(righe(m, { tipo: "materiale", id: 1 }));
  assert.deepEqual([k.get("identificatore"), k.get("nome"), k.get("tipo"), k.get("classe")],
    ["1", "C25/30", "calcestruzzo", "C25/30"]);
  assert.equal(k.get("personalizzato"), "no");
  assert.equal(k.get("origine"), "—");
  m.materiali[0].personalizzato = true;
  m.materiali[0].origine = { sorgente: "utente", modificata: false };
  const p = new Map(righe(m, { tipo: "materiale", id: 1 }));
  assert.equal(p.get("personalizzato"), "sì");
  assert.equal(p.get("origine"), "utente");
});

// --- gli altri comandi degli editor, uno per azione ---

test("editorSezione: senza staffe il bottone le aggiunge Ø8 / 150; con le staffe le toglie", () => {
  const m = conSezione();
  const { p, editor, chiamate } = pannelloFinto();
  p.disegna(m, { tipo: "sezione", id: 1 });
  const staffe = editor._figli[3];
  assert.equal(staffe._figli[1].textContent, "aggiungi staffe Ø8 / 150");
  staffe._figli[1].dispatch("click");
  assert.deepEqual(chiamate.suSezione, [[1, { staffe: { diametro: 8, passo: 150, bracci: 2 } }]]);

  p.disegna(conStaffe(conSezione()), { tipo: "sezione", id: 1 });
  const via = editor._figli[3]._figli.find((e) => e.textContent === "togli staffe");
  via.dispatch("click");
  assert.deepEqual(chiamate.suSezione[1], [1, { staffe: null }]);
});

test("editorSezione: una fila manda a suFila il numero e il diametro correnti insieme", () => {
  const m = conStaffe(conSezione());
  m.sezioni[0].file = [{ lato: "inf", n: 3, diametro: 16 }];
  const { p, editor, chiamate } = pannelloFinto();
  p.disegna(m, { tipo: "sezione", id: 1 });
  const barre = editor._figli[4];
  const campoN = barre._figli[1]._figli[1];
  campoN.value = "4"; campoN.dispatch("change");
  assert.deepEqual(chiamate.suFila, [[1, "inf", 4, 16]]);
  const campoDia = barre._figli[2]._figli[1];
  campoDia.value = "20"; campoDia.dispatch("change");
  // 4, non 3: senza ridisegno in mezzo, il numero corrente è quello **nella casella**, non
  // quello del modello. Prima qui c'era `3`, ed era il difetto scritto come se fosse la regola.
  assert.deepEqual(chiamate.suFila[1], [1, "inf", 4, 20]);
});

test("editorSezione: il select del calcestruzzo elenca i soli calcestruzzi e manda un numero", () => {
  const { p, editor, chiamate } = pannelloFinto();
  p.disegna(conSezione(), { tipo: "sezione", id: 1 });
  const sel = editor._figli[2]._figli[1]._figli[1];
  assert.deepEqual(sel._figli.map((o) => o.textContent), ["C25/30"]);
  sel.value = "1"; sel.dispatch("change");
  assert.deepEqual(chiamate.suSezione, [[1, { calcestruzzo: 1 }]]);
});

test("editorMateriale: la spunta «personalizzato» apre i valori del catalogo del legame", () => {
  const m = conSezione();
  const { p, editor, chiamate } = pannelloFinto();
  p.disegna(m, { tipo: "materiale", id: 1 }, { catalogo: null, legame: LEGAME_C25 });
  assert.ok(!editor._figli.some((e) => (e._figli[0]?.textContent ?? "") === "valori"));
  const spunta = editor._figli[0]._figli[2]._figli[0];
  spunta.checked = true; spunta.dispatch("change");
  assert.deepEqual(chiamate.suMateriale, [[1, { personalizzato: true }]]);

  m.materiali[0].personalizzato = true;
  p.disegna(m, { tipo: "materiale", id: 1 }, { catalogo: null, legame: LEGAME_C25 });
  const val = editor._figli[1];
  assert.equal(val._figli[0].textContent, "valori");
  assert.equal(val._figli[1].className, "nota", "la parentesi è una nota sotto la legenda");
  assert.deepEqual(val._figli.slice(2).map((et) => et._figli[0].textContent),
    ["E, modulo elastico", "ν, Poisson", "densità", "f_ck"]);
  const campoE = val._figli[2]._figli[1];
  campoE.value = "30000"; campoE.dispatch("change");
  assert.deepEqual(chiamate.suMateriale[1], [1, { valori: { E: 30000 } }]);
});

test("editorMateriale: la veste è del modello intero e manda suVeste", () => {
  const { p, editor, chiamate } = pannelloFinto();
  p.disegna(conSezione(), { tipo: "materiale", id: 1 }, { catalogo: null, legame: LEGAME_C25 });
  const ve = editor._figli.at(-2);
  assert.equal(ve._figli[0].textContent, "veste per l'analisi");
  assert.equal(ve._figli[1].textContent, "vale per tutto il modello");
  const sel = ve._figli[2]._figli[1];
  assert.deepEqual(sel._figli.map((o) => [o.textContent, o.selected]),
    [["caratteristica", false], ["media", true], ["progetto", false], ["esistente", false]]);
  sel.value = "progetto"; sel.dispatch("change");
  assert.deepEqual(chiamate.suVeste, ["progetto"]);
});

// ==========================================================================================
// Fix round 1
// ==========================================================================================

// Il testo visibile di un'etichetta e il nome accessibile del suo controllo, per ogni campo
// dell'editor in piedi. L'ordine dentro la `<label>` non è fisso: la spunta «personalizzato»
// mette il controllo prima del testo, i campi numerici dopo.
// A qualunque profondità: i campi di un carico stanno dentro il `<fieldset>` del carico,
// dentro il gruppo «carichi» — due livelli più giù delle etichette degli altri editor.
function nomiDeiCampi(editor) {
  const coppie = [];
  for (const et of tutti(editor)) {
    const testo = (et._figli ?? []).find((x) => x.nodeType === 3);
    const c = (et._figli ?? []).find((x) => x._attrs?.["aria-label"]);
    if (testo && c) coppie.push([testo.textContent, c._attrs["aria-label"]]);
  }
  return coppie;
}

const controlliDi = (editor) =>
  editor._figli.flatMap((g) => (g._figli ?? []).flatMap((x) =>
    x._attrs?.["aria-label"] ? [x] : (x._figli ?? []).filter((y) => y._attrs?.["aria-label"])));

// --- la classe fuori catalogo, che `personalizzato` rende lecita ---

test("editorMateriale: una classe fuori catalogo è la prima option ed è scelta, non sparisce", () => {
  const m = conSezione();
  m.materiali[0].classe = "C-opera-1";
  m.materiali[0].personalizzato = true;
  const { p, editor } = pannelloFinto();
  p.disegna(m, { tipo: "materiale", id: 1 },
    { catalogo: { calcestruzzo: ["C20/25", "C25/30"], acciaio: ["B450C"] }, legame: LEGAME_C25 });
  const opzioni = editor._figli[0]._figli[1]._figli[1]._figli;
  assert.deepEqual(opzioni.map((o) => [o.textContent, o.selected]),
    [["C-opera-1", true], ["C20/25", false], ["C25/30", false]]);
});

test("editorMateriale: una classe già a catalogo non compare due volte", () => {
  const m = conSezione();
  const { p, editor } = pannelloFinto();
  p.disegna(m, { tipo: "materiale", id: 1 },
    { catalogo: { calcestruzzo: ["C20/25", "C25/30", "C30/37"] }, legame: LEGAME_C25 });
  const opzioni = editor._figli[0]._figli[1]._figli[1]._figli;
  assert.deepEqual(opzioni.map((o) => o.textContent), ["C25/30", "C20/25", "C30/37"]);
  assert.deepEqual(opzioni.filter((o) => o.selected).map((o) => o.textContent), ["C25/30"]);
});

// --- il fuoco si ritrova per nome, non per posto nella lista ---

test("editorSezione: aggiungere le staffe non sposta il fuoco su un altro campo", () => {
  const m = conSezione();
  const { p, editor } = pannelloFinto();
  p.disegna(m, { tipo: "sezione", id: 1 });
  const prima = controlliDi(editor);
  const campoN = prima.find((c) => c._attrs["aria-label"].startsWith("inf n"));
  const indicePrima = prima.indexOf(campoN);
  campoN.focus();

  // le staffe compaiono **prima** delle file: tre campi e un bottone in più, gli indici slittano
  p.disegna(conStaffe(conSezione()), { tipo: "sezione", id: 1 });
  const dopo = controlliDi(editor);
  const omologo = dopo.find((c) => c._attrs["aria-label"].startsWith("inf n"));
  assert.notEqual(dopo.indexOf(omologo), indicePrima, "gli indici sono davvero slittati");
  assert.equal(globalThis.document.activeElement, omologo);
});

test("editorAsta: se il controllo a fuoco sparisce il fuoco va al primo, non al body", () => {
  const m = conSezioneEAsta();
  m.aste[0].danno = { fattore_E: 0.8, fattore_fc: 0.9, nota: "" };
  const { p, editor } = pannelloFinto();
  p.disegna(m, { tipo: "asta", id: 1 });
  const via = editor._figli[1]._figli.find((e) => e.textContent === "togli danno");
  via.focus();
  delete m.aste[0].danno;
  p.disegna(m, { tipo: "asta", id: 1 });
  assert.ok(!editor._figli[1]._figli.some((e) => e.textContent === "togli danno"),
    "il bottone è sparito davvero");
  assert.equal(globalThis.document.activeElement, controlliDi(editor)[0]);
});

test("disegna: il fuoco fuori dall'editor non viene rubato nemmeno dagli editor nuovi", () => {
  const { p } = pannelloFinto();
  const altrove = elementoFinto();
  globalThis.document.activeElement = altrove;
  p.disegna(conSezione(), { tipo: "sezione", id: 1 });
  assert.equal(globalThis.document.activeElement, altrove);
});

// --- `suFila` legge le due caselle, non il modello ---

test("editorSezione: Ø scritto e poi n legge quel Ø, non quello del modello", () => {
  const m = conStaffe(conSezione());
  const { p, editor, chiamate } = pannelloFinto();
  p.disegna(m, { tipo: "sezione", id: 1 });
  const c = controlliDi(editor);
  const campoDia = c.find((x) => x._attrs["aria-label"].startsWith("Ø delle barre sul lato sup"));
  const campoN = c.find((x) => x._attrs["aria-label"].startsWith("sup n"));
  campoDia.value = "20"; campoDia.dispatch("change");
  // il lato era vuoto e resta vuoto: niente da togliere, nessun comando (e nessuna riga di Storia)
  assert.deepEqual(chiamate.suFila, []);
  campoN.value = "3"; campoN.dispatch("change");
  assert.deepEqual(chiamate.suFila, [[1, "sup", 3, 20]]);
});

test("editorSezione: azzerare una fila che c'è resta un comando, e toglie la fila", () => {
  const m = conStaffe(conSezione());
  m.sezioni[0].file = [{ lato: "inf", n: 3, diametro: 16 }];
  const { p, editor, chiamate } = pannelloFinto();
  p.disegna(m, { tipo: "sezione", id: 1 });
  const campoN = controlliDi(editor).find((x) => x._attrs["aria-label"].startsWith("inf n"));
  campoN.value = "0"; campoN.dispatch("change");
  assert.deepEqual(chiamate.suFila, [[1, "inf", 0, 16]]);
});

test("editorSezione: se l'altra casella non è un numero, avvisa e non manda la fila", () => {
  const m = conStaffe(conSezione());
  m.sezioni[0].file = [{ lato: "inf", n: 3, diametro: 16 }];
  const { p, editor, chiamate } = pannelloFinto();
  p.disegna(m, { tipo: "sezione", id: 1 });
  const c = controlliDi(editor);
  const campoDia = c.find((x) => x._attrs["aria-label"].startsWith("Ø delle barre sul lato inf"));
  const campoN = c.find((x) => x._attrs["aria-label"].startsWith("inf n"));
  campoDia.value = "sedici";  // scritto e non ancora confermato
  campoN.value = "4"; campoN.dispatch("change");
  assert.deepEqual(chiamate.suFila, []);
  assert.equal(chiamate.suAvviso[0], "«sedici» non è un numero");
});

// --- WCAG 2.5.3: il nome accessibile comincia da ciò che si vede ---

const conBarre = () => {
  const m = conStaffe(conSezioneEAsta());
  m.materiali[0].personalizzato = true;
  return m;
};

const CASI_EDITOR = [
  ["asta", { tipo: "asta", id: 1 }, conBarre],
  ["sezione", { tipo: "sezione", id: 1 }, conBarre],
  ["materiale", { tipo: "materiale", id: 1 }, conBarre],
  // Tutti e cinque i tipi di carico in un colpo: è qui che un campo nuovo rompe in silenzio.
  ["Azione", { tipo: "azione", id: 1 }, () => {
    let m = conCarichi();
    m = aggiungiCarico(m, { azione: 1, carico: { tipo: "gravita", fattore_z: -1 } });
    m = aggiungiCarico(m, { azione: 1, carico: { tipo: "cedimento", nodo: 1, uz: -5 } });
    return aggiungiCarico(m, { azione: 1, carico: { tipo: "termico", asta: 1, dT_uniforme: 20 } });
  }],
  ["Combinazione", { tipo: "combinazione", id: 1 }, () => impostaTermine(
    creaCombinazione(conCarichi(), { nome: "SLU", tipo: "fondamentale" }),
    { id: 1, azione: 1, coefficiente: 1.3 })],
];

for (const [nome, selezione, modello] of CASI_EDITOR) {
  test(`editor${nome}: ogni nome accessibile comincia dal testo visibile (WCAG 2.5.3)`, () => {
    const m = modello();
    const { p, editor } = pannelloFinto();
    p.disegna(m, selezione, { catalogo: null, legame: LEGAME_C25 });
    const coppie = nomiDeiCampi(editor);
    assert.ok(coppie.length > 0, "l'editor ha almeno un campo etichettato");
    for (const [visibile, accessibile] of coppie) {
      assert.ok(accessibile.startsWith(visibile),
        `«${accessibile}» non comincia da «${visibile}»`);
    }
  });
}

// Un nome accessibile ripetuto è peggio di un nome assente: `creaPannello` ritrova il fuoco
// per nome (`chiave`), e due controlli omonimi lo riportano sempre sul primo dei due.
for (const [nome, selezione, modello] of CASI_EDITOR) {
  test(`editor${nome}: i nomi accessibili sono unici dentro l'editor`, () => {
    const { p, editor } = pannelloFinto();
    p.disegna(modello(), selezione, { catalogo: null, legame: LEGAME_C25 });
    const nomi = tutti(editor).filter((e) => e._attrs?.["aria-label"]).map((c) => c._attrs["aria-label"]);
    const doppi = nomi.filter((n, i) => nomi.indexOf(n) !== i);
    assert.deepEqual(doppi, [], `nomi ripetuti: ${doppi.join(" · ")}`);
    assert.equal(new Set(nomi).size, nomi.length);
  });
}

// --- `danno` senza `nota` non scrive «undefined» nella casella ---

test("editorAsta: un danno senza nota lascia la casella vuota, non «undefined»", () => {
  const m = conSezioneEAsta();
  m.aste[0].danno = { fattore_E: 0.8, fattore_fc: 0.9 };
  const { p, editor } = pannelloFinto();
  p.disegna(m, { tipo: "asta", id: 1 });
  assert.equal(editor._figli[1]._figli[3]._figli[1].value, "");
});

// --- un legame di tipo ignoto avvisa, non ammazza il ridisegno ---

test("editorMateriale: un legame di tipo ignoto avvisa e non solleva", () => {
  const m = conSezione();
  const { p, editor } = pannelloFinto();
  const ignoto = { valori: { avvisi: [], note: [] }, catalogo: null,
                   legame: { tipo: "concrete04", articolo: "—" } };
  assert.doesNotThrow(() => p.disegna(m, { tipo: "materiale", id: 1 }, { catalogo: null, legame: ignoto }));
  const lg = editor._figli.at(-1);
  assert.equal(lg._figli[1].className, "avviso");
  assert.equal(lg._figli[1].textContent, "attenzione: legame «concrete04» non mostrabile");
  assert.ok(!lg._figli.some((e) => (e.innerHTML ?? "").includes("<svg")), "nessuna curva");
});

// --- un fattore piccolissimo non diventa «0» ---

test("righe: un fattore di danno piccolo resta leggibile, non si arrotonda a zero", () => {
  const m = CON_CERNIERA();
  m.aste[0].danno = { fattore_E: 0.0001, fattore_fc: 0.9, nota: "" };
  assert.equal(new Map(righe(m, { tipo: "asta", id: 1 })).get("danno"), "E ×0,0001 · fc ×0,9");
});

// --- il campo rientra dalla propria porta ---

test("i valori piccolissimi si stampano in modo che `leggiNumero` li rilegga uguali", () => {
  const m = conSezione();
  m.materiali[0].personalizzato = true;
  const { p, editor } = pannelloFinto();
  const lg = { ...LEGAME_C25, catalogo: { densita: 2.5e-9, nu: 0.2, E: 31476 } };
  p.disegna(m, { tipo: "materiale", id: 1 }, { catalogo: null, legame: lg });
  const campo = controlliDi(editor).find((c) => c._attrs["aria-label"].startsWith("densità"));
  // niente notazione esponenziale: `leggiNumero` non la legge (misurato), e un campo che
  // non si rilegge è un campo che mente
  assert.ok(!campo.value.includes("e"), campo.value);
  assert.notEqual(leggiNumero(campo.value), 0);
  assert.equal(leggiNumero(campo.value), 2.5e-9);
});

test("i valori normali non cambiano forma per colpa dei piccolissimi", () => {
  const { pannello, editor } = pannelloFinto();
  pannello.disegna(conSezione(), { tipo: "sezione", id: 1 });
  const c = controlliDi(editor);
  assert.equal(c.find((x) => x._attrs["aria-label"].startsWith("b ")).value, "300");
  assert.equal(c.find((x) => x._attrs["aria-label"].startsWith("copriferro")).value, "30");
});


// ==========================================================================================
// Fix di fine ramo 11b: l'ispettore
// ==========================================================================================

test("righe: nodo e asta portano l'origine, come sezione e materiale (story 55)", () => {
  const m = CON_CERNIERA();
  assert.equal(new Map(righe(m, { tipo: "nodo", id: 1 })).get("origine"), "—");
  assert.equal(new Map(righe(m, { tipo: "asta", id: 1 })).get("origine"), "—");
  m.nodi[0].origine = { sorgente: "rilievo", modificata: false };
  m.aste[0].origine = { sorgente: "rilievo", modificata: true };
  assert.equal(new Map(righe(m, { tipo: "nodo", id: 1 })).get("origine"), "rilievo");
  assert.equal(new Map(righe(m, { tipo: "asta", id: 1 })).get("origine"), "rilievo, modificata");
});

// La `<dl>` ripeteva sette righe che i campi dell'editor mostrano già, e spingeva il disegno
// fuori schermo a 1440 × 900. Restano le quattro che l'editor non dice.
test("righe: la sezione dice identificatore, nome, usata da e origine, e nient'altro", () => {
  const m = conStaffe(conSezione());
  m.sezioni[0].file = [{ lato: "inf", n: 3, diametro: 16 }];
  m.sezioni[0].riduzione = { sup: 0, inf: 10, sx: 0, dx: 5 };
  m.sezioni[0].origine = { sorgente: "rilievo", modificata: true };
  const r = righe(m, { tipo: "sezione", id: 1 });
  assert.deepEqual(r.map(([k]) => k), ["identificatore", "nome", "usata da", "origine"]);
  const v = new Map(r);
  assert.equal(v.get("nome"), "300 × 500");
  assert.equal(v.get("usata da"), "0 aste");
  assert.equal(v.get("origine"), "rilievo, modificata");
});

test("editorSezione: il disegno è il primo elemento, non l'ultimo", () => {
  const { p, editor } = pannelloFinto();
  p.disegna(conSezione(), { tipo: "sezione", id: 1 });
  assert.equal(editor._figli[0].className, "sezione-disegno");
  assert.match(editor._figli[0].innerHTML, /<svg/);
  assert.deepEqual(editor._figli.slice(1).map((f) => f._figli[0].textContent),
    ["dimensioni", "materiali", "staffe", "barre per lato", "riduzione, mm mancanti"]);
});

// Le chiavi grezze sono i nomi delle variabili di `nova/catalogo.py`, non quelli della norma.
test("editorMateriale: le chiavi grezze diventano etichetta e unità", () => {
  const m = conSezione();
  m.materiali[0].personalizzato = true;
  const { p, editor } = pannelloFinto();
  p.disegna(m, { tipo: "materiale", id: 1 }, { catalogo: null, legame: LEGAME_C25 });
  const campi = editor._figli[1]._figli.filter((e) => (e._figli ?? []).some((x) => x._attrs?.["aria-label"]));
  assert.deepEqual(campi.map((e) => e._figli[0].textContent),
    ["E, modulo elastico", "ν, Poisson", "densità", "f_ck"]);
  const unita = campi.map((e) => e._figli.filter((x) => x.nodeType === 3).slice(1).map((x) => x.textContent).join(""));
  assert.deepEqual(unita, [" MPa", "", " t/mm³", " MPa"]);
  for (const e of campi) {
    const c = e._figli.find((x) => x._attrs?.["aria-label"]);
    assert.ok(c._attrs["aria-label"].startsWith(e._figli[0].textContent), c._attrs["aria-label"]);
  }
});

test("editorMateriale: solo il valore sovrascritto porta «scritto a mano»", () => {
  const m = conSezione();
  m.materiali[0].personalizzato = true;
  m.materiali[0].valori = { E: 31000 };
  const { p, editor } = pannelloFinto();
  p.disegna(m, { tipo: "materiale", id: 1 }, { catalogo: null, legame: LEGAME_C25 });
  const conMano = editor._figli[1]._figli
    .filter((e) => (e._figli ?? []).some((x) => x.textContent === "scritto a mano"));
  assert.equal(conMano.length, 1);
  assert.equal(conMano[0]._figli[0].textContent, "E, modulo elastico");
});

test("editorMateriale: «torna ai valori di tabella» compare solo con una chiave scritta a mano", () => {
  const m = conSezione();
  m.materiali[0].personalizzato = true;
  const { p, editor, chiamate } = pannelloFinto();
  const bottone = () => editor._figli[1]._figli.find((e) => e.textContent === "torna ai valori di tabella");
  p.disegna(m, { tipo: "materiale", id: 1 }, { catalogo: null, legame: LEGAME_C25 });
  assert.equal(bottone(), undefined, "senza valori a mano non c'è niente a cui tornare");
  m.materiali[0].valori = { fcm: 40, E: 31000 };
  p.disegna(m, { tipo: "materiale", id: 1 }, { catalogo: null, legame: LEGAME_C25 });
  bottone().dispatch("click");
  assert.deepEqual(chiamate.suMateriale, [[1, { valori: { fcm: null, E: null } }]]);
});

// L'errore del legame arrivava lungo 220 caratteri: la classe e tutto il catalogo dentro
// l'avviso, mentre le classi stanno già nel select qui sopra.
test("editorMateriale: l'errore del legame si tronca alla prima «;»", () => {
  const { p, editor } = pannelloFinto();
  p.disegna(conSezione(), { tipo: "materiale", id: 1 },
    { catalogo: null, legame: { errore: "classe di materiale sconosciuta: 'C99'; il catalogo porta C8/10, C12/15" } });
  const lg = editor._figli.at(-1);
  assert.equal(lg._figli[1].textContent, "attenzione: classe di materiale sconosciuta: 'C99'");
});

test("editorMateriale: l'attesa dei valori è una nota, non uno stato vuoto", () => {
  const { p, editor } = pannelloFinto();
  p.disegna(conSezione(), { tipo: "materiale", id: 1 }, { catalogo: null, legame: null });
  const lg = editor._figli.at(-1);
  assert.equal(lg._figli[1].className, "nota");
  assert.equal(lg._figli[1].textContent, "valori in arrivo dal server…");
});

// `catalogo.vesti` lo manda `/api/catalogo` (`nova/server.py`) e nessuno lo leggeva.
test("editorMateriale: le vesti vengono dal catalogo quando c'è, da VESTI quando non c'è", () => {
  const { p, editor } = pannelloFinto();
  p.disegna(conSezione(), { tipo: "materiale", id: 1 },
    { catalogo: { vesti: ["media", "progetto"] }, legame: LEGAME_C25 });
  const ve = editor._figli.at(-2);
  const sel = ve._figli.find((e) => (e._figli ?? []).some((x) => x._attrs?.["aria-label"]))._figli[1];
  assert.deepEqual(sel._figli.map((o) => o.textContent), ["media", "progetto"]);
});

// Il verso dei segni: la `<dl>` scrive «f_c 33 MPa», l'asse della curva «-33».
test("editorMateriale: sotto la curva del calcestruzzo c'è la nota sui segni", () => {
  const { p, editor } = pannelloFinto();
  p.disegna(conSezione(), { tipo: "materiale", id: 1 }, { catalogo: null, legame: LEGAME_C25 });
  const lg = editor._figli.at(-1);
  const note = lg._figli.filter((e) => e.className === "nota").map((e) => e.textContent);
  assert.ok(note.some((t) => t.includes("compressione negativa") && t.includes("in modulo")),
    JSON.stringify(note));
});


// --- round 2: «scritto a mano» fuori dal nome accessibile ---
// Il nome accessibile e' la **chiave del fuoco** (`creaPannello`): infilarci «, scritto a
// mano» la cambiava alla prima scrittura, la chiave vecchia non si ritrovava e il fuoco
// scappava al `<select>` della classe — dove una lettera cambia la classe.

test("editorMateriale: l'aria-label dei valori non cambia quando il valore è scritto a mano", () => {
  const nomi = (m) => {
    const { p, editor } = pannelloFinto();
    p.disegna(m, { tipo: "materiale", id: 1 }, { catalogo: null, legame: LEGAME_C25 });
    return controlliDi(editor).map((c) => c._attrs["aria-label"]);
  };
  const m = conSezione();
  m.materiali[0].personalizzato = true;
  const prima = nomi(m);
  m.materiali[0].valori = { fck: 28 };
  assert.deepEqual(nomi(m), prima, "la chiave del fuoco non si muove");
});

test("editorMateriale: dopo una scrittura a mano il fuoco resta sul suo campo", () => {
  const m = conSezione();
  m.materiali[0].personalizzato = true;
  const lg = { ...LEGAME_C25, catalogo: { ...LEGAME_C25.catalogo, fcm: 33 } };
  const { p, editor } = pannelloFinto();
  p.disegna(m, { tipo: "materiale", id: 1 }, { catalogo: null, legame: lg });
  const prima = controlliDi(editor).find((c) => c._attrs["aria-label"].startsWith("f_cm"));
  prima.focus();
  m.materiali[0].valori = { fcm: 40 };
  p.disegna(m, { tipo: "materiale", id: 1 }, { catalogo: null, legame: lg });
  const dopo = globalThis.document.activeElement;
  assert.notEqual(dopo, prima, "l'editor si è ricostruito davvero");
  assert.ok(dopo._attrs["aria-label"].startsWith("f_cm"), dopo._attrs["aria-label"]);
});


// --- round 3: i valori restano a schermo mentre il legame è in volo ---
// Scrivere un valore cambia il materiale, quindi la chiave della cache di `legamePer`
// (`app.js`): cache miss, `legame: null`, e il gruppo «valori» spariva per un ridisegno —
// il campo a fuoco non c'era più e il cursore finiva sul `<select>` della classe. Le chiavi
// della tabella dipendono da tipo e classe, non dai valori scritti: l'ultima risposta buona
// per la stessa coppia le porta già, e non è un'anteprima inventata.

const TABELLA_C25 = { E: 31476, nu: 0.2, densita: 2.5e-9, fck: 25, fcm: 33 };

test("editorMateriale: col legame in volo il gruppo «valori» resta, con le chiavi della tabella", () => {
  const m = conSezione();
  m.materiali[0].personalizzato = true;
  const { p, editor } = pannelloFinto();
  p.disegna(m, { tipo: "materiale", id: 1 }, { catalogo: null, legame: null, tabella: TABELLA_C25 });
  const val = editor._figli[1];
  assert.equal(val._figli[0].textContent, "valori");
  const campi = val._figli.filter((e) => (e._figli ?? []).some((x) => x._attrs?.["aria-label"]));
  assert.deepEqual(campi.map((e) => e._figli[0].textContent),
    ["E, modulo elastico", "ν, Poisson", "densità", "f_ck", "f_cm"]);
  const fcm = campi.find((e) => e._figli[0].textContent === "f_cm")._figli[1];
  assert.equal(fcm.value, "33", "senza valore a mano si vede quello di tabella");
});

test("editorMateriale: col legame in volo il valore scritto a mano vince sulla tabella", () => {
  const m = conSezione();
  m.materiali[0].personalizzato = true;
  m.materiali[0].valori = { fcm: 40 };
  const { p, editor } = pannelloFinto();
  p.disegna(m, { tipo: "materiale", id: 1 }, { catalogo: null, legame: null, tabella: TABELLA_C25 });
  const campi = editor._figli[1]._figli.filter((e) => (e._figli ?? []).some((x) => x._attrs?.["aria-label"]));
  const fcm = campi.find((e) => e._figli[0].textContent === "f_cm");
  assert.equal(fcm._figli[1].value, "40");
  assert.ok(fcm._figli.some((x) => x.textContent === "scritto a mano"));
});

// Il sintomo misurato in browser: scritto 40 in `f_cm` e battuto `9`, il `9` finiva nel
// `<select>` della classe — che con una lettera cambia la classe del materiale.
test("editorMateriale: il fuoco su f_cm regge il ridisegno col legame in volo", () => {
  const m = conSezione();
  m.materiali[0].personalizzato = true;
  const lg = { ...LEGAME_C25, catalogo: TABELLA_C25 };
  const { p, editor } = pannelloFinto();
  p.disegna(m, { tipo: "materiale", id: 1 }, { catalogo: null, legame: lg, tabella: TABELLA_C25 });
  const prima = controlliDi(editor).find((c) => c._attrs["aria-label"].startsWith("f_cm"));
  prima.focus();
  // lo scatto vero: il valore entra nel modello e il legame riparte in volo
  m.materiali[0].valori = { fcm: 40 };
  p.disegna(m, { tipo: "materiale", id: 1 }, { catalogo: null, legame: null, tabella: TABELLA_C25 });
  const dopo = globalThis.document.activeElement;
  assert.notEqual(dopo, prima, "l'editor si è ricostruito davvero");
  assert.ok(dopo._attrs["aria-label"].startsWith("f_cm"), dopo._attrs["aria-label"]);
});

// Ingresso degenere: la prima risposta non è mai arrivata, nessuna tabella da mostrare.
test("editorMateriale: senza legame e senza tabella il gruppo «valori» non c'è", () => {
  const m = conSezione();
  m.materiali[0].personalizzato = true;
  const { p, editor } = pannelloFinto();
  p.disegna(m, { tipo: "materiale", id: 1 }, { catalogo: null, legame: null, tabella: null });
  assert.ok(!editor._figli.some((e) => e._figli?.[0]?.textContent === "valori"));
});

// --- le azioni e le combinazioni (11c) -----------------------------------------------------

// Due nodi, un'asta, un'azione con due carichi: il distribuito sull'asta 1 (indice 0) e il
// nodale sul nodo 2 (indice 1).
const conCarichi = () => {
  let m = CON_CERNIERA();
  m = creaAzione(m, { nome: "permanenti travi", natura: "G2" });
  m = aggiungiCarico(m, { azione: 1, carico: { tipo: "distribuito", asta: 1, q: -12.5 } });
  m = aggiungiCarico(m, { azione: 1, carico: { tipo: "nodale", nodo: 2, Fx: 20000 } });
  return m;
};

test("righe di un'azione: natura con categoria, il nome del caso, il conteggio dei carichi", () => {
  let m = creaAzione(modelloVuoto(), { nome: "spinta", natura: "Q", categoria: "vento" });
  assert.deepEqual(righe(m, { tipo: "azione", id: 1 }),
    [["identificatore", "1"], ["nome", "spinta"], ["natura", "Q · vento"], ["caso", "Z1"],
     ["carichi", "0"], ["generata", "no"]]);
  assert.equal(righe(m, { tipo: "azione", id: 9 }), null);
  m = creaCombinazione(m, { nome: "SLU", tipo: "fondamentale" });
  assert.deepEqual(righe(m, { tipo: "combinazione", id: 1 }),
    [["identificatore", "1"], ["nome", "SLU"], ["tipo", "fondamentale (SLU)"], ["caso", "C1"],
     ["termini", "0"], ["generata", "no"]]);
});

// `TIPI_COMBINAZIONE` e `NOME_TIPO_COMBINAZIONE` sono due costanti gemelle: chi aggiunge un
// tipo alla prima e si scorda la seconda leggeva «undefined» qui, mentre l'albero stampava
// già la chiave grezza (`albero.js:80`). Due verità sullo stesso modello, in due riquadri
// che si vedono insieme.
test("righe di una combinazione: un tipo senza nome a schermo stampa la chiave, non «undefined»", () => {
  const m = { ...modelloVuoto(), combinazioni: [{ id: 1, nome: "SLV", tipo: "eccezionale", termini: [], generata: false }] };
  assert.deepEqual(righe(m, { tipo: "combinazione", id: 1 }),
    [["identificatore", "1"], ["nome", "SLV"], ["tipo", "eccezionale"], ["caso", "C1"],
     ["termini", "0"], ["generata", "no"]]);
});

test("editor dell'azione: il campo q cambiato manda il carico intero, e un testo illeggibile solo un avviso", () => {
  const { p, editor, chiamate } = pannelloFinto();
  p.disegna(conCarichi(), { tipo: "azione", id: 1 });
  const [q] = controlliCon(editor, "q del carico 1");
  q.value = "-15"; q.dispatch("change");
  assert.deepEqual(chiamate.suCarico, [[1, 0, { tipo: "distribuito", asta: 1, q: -15, direzione: "z" }]]);
  q.value = "molto"; q.dispatch("change");
  assert.equal(chiamate.suCarico.length, 1);
  assert.equal(chiamate.suAvviso.length, 1);
  // Il campo torna al valore del **modello** con cui è stato disegnato: il -15 di prima non è
  // ancora rientrato da un ridisegno (qui non c'è `app.js` a farlo), e inventarlo sarebbe la
  // stessa bugia del campo che tiene «molto» a schermo.
  assert.equal(q.value, "-12,5", "gli zeri in coda non dicono niente: la grafia è quella dell'albero");
});

// --- 6: il campo scrive quel che sa rileggere ---------------------------------------------
// `conciso` sopra cento non tiene decimali: «20 000,5» uscirebbe «20 001», e il campo direbbe
// un numero diverso da quello del modello. Sotto l'unità invece tiene quattro decimali, e
// 0,0035 non diventa «0,004». Il campo prende la forma corta solo se rientra dalla sua porta.
test("editor dell'azione: il campo non arrotonda ciò che non saprebbe rileggere", () => {
  const { p, editor } = pannelloFinto();
  const m = aggiungiCarico(conCarichi(), { azione: 1, carico: { tipo: "nodale", nodo: 1, Fz: -20000.5 } });
  p.disegna(m, { tipo: "azione", id: 1 });
  const [fz] = controlliCon(editor, "Fz del carico 3");
  assert.equal(leggiNumero(fz.value), -20000.5, `il campo dice ${fz.value}, che non è il numero del modello`);
  assert.ok(!/,\d*0$/.test(fz.value), `nessuno zero in coda: ${fz.value}`);
});

test("editor dell'azione: sotto l'unità il campo tiene le cifre che servono", () => {
  const { p, editor } = pannelloFinto();
  const m = aggiungiCarico(conCarichi(), { azione: 1, carico: { tipo: "distribuito", asta: 1, q: 0.0035 } });
  p.disegna(m, { tipo: "azione", id: 1 });
  const [q] = controlliCon(editor, "q del carico 3");
  assert.equal(q.value, "0,0035");
  assert.equal(leggiNumero(q.value), 0.0035);
});

// Le migliaia come nella `<dl>` due centimetri sopra: «20 000», non «20000». Lo spazio è
// U+202F, e `leggiNumero` lo toglie — l'uscita rientra dalla propria porta (`numeri.test.js`).
test("editor dell'azione: Fx illeggibile avvisa e rimette il numero di prima, con le migliaia", () => {
  const { p, editor, chiamate } = pannelloFinto();
  p.disegna(conCarichi(), { tipo: "azione", id: 1 });
  const [fx] = controlliCon(editor, "Fx del carico 2");
  const atteso = stampaNumero(20000, { decimali: 0, migliaia: true });
  assert.equal(fx.value, atteso);
  assert.notEqual(atteso, "20000");
  assert.equal(leggiNumero(atteso), 20000);
  fx.value = "ventimila"; fx.dispatch("change");
  assert.deepEqual(chiamate.suCarico, []);
  assert.equal(chiamate.suAvviso[0], "«ventimila» non è un numero");
  assert.equal(fx.value, atteso);
});

// Il select sceglie e basta; il bottone accanto esegue. Con l'azione sul `change`, scorrere
// le voci con le frecce — l'unico modo di aprirlo da tastiera — nasceva un carico per tasto.
test("editor dell'azione: «aggiungi carico» è select più bottone, togli passa l'indice, il termico avverte", () => {
  const { p, editor, chiamate } = pannelloFinto();
  let m = conCarichi();
  p.disegna(m, { tipo: "azione", id: 1 });
  const [aggiungi] = controlliCon(editor, "aggiungi carico");
  const eseguiAggiunta = () => tutti(editor).find((e) => e.textContent === "aggiungi").dispatch("click");
  aggiungi.value = "termico"; aggiungi.dispatch("change");
  assert.deepEqual(chiamate.suAggiungiCarico, [], "scegliere il tipo non aggiunge niente");
  eseguiAggiunta();
  assert.deepEqual(chiamate.suAggiungiCarico, [[1, "termico"]]);
  const togli = tutti(editor).find((e) => e.textContent === "togli carico 2");
  togli.dispatch("click");
  assert.deepEqual(chiamate.suTogliCarico, [[1, 1]]);
  m = aggiungiCarico(m, { azione: 1, carico: { tipo: "termico", asta: 1, dT_uniforme: 20 } });
  p.disegna(m, { tipo: "azione", id: 1 });
  // un comando, non uno stato: al ridisegno il select è di nuovo sulla prima voce
  const [dopo] = controlliCon(editor, "aggiungi carico");
  assert.equal(dopo.value, "");
  assert.equal(dopo._figli[0].textContent, "— scegli il tipo");
  assert.equal(dopo._figli[0].selected, true);
  // 8: niente «Check Model», niente percorso di file, niente «v1» — la frase è per chi legge.
  const avviso = tutti(editor).find((e) => e.className === "avviso");
  assert.equal(avviso.textContent, "attenzione: la verifica del modello rifiuta il carico termico in questa versione");
});

// Ingresso degenere: «aggiungi» col select ancora su «— scegli il tipo».
test("editor dell'azione: «aggiungi» senza tipo avvisa, e non aggiunge niente", () => {
  const { p, editor, chiamate } = pannelloFinto();
  p.disegna(conCarichi(), { tipo: "azione", id: 1 });
  const [aggiungi] = controlliCon(editor, "aggiungi carico");
  assert.equal(aggiungi.value, "");
  tutti(editor).find((e) => e.textContent === "aggiungi").dispatch("click");
  assert.deepEqual(chiamate.suAggiungiCarico, []);
  assert.deepEqual(chiamate.suAvviso, ["scegli il tipo del carico"]);
});

test("editor dell'azione: senza carichi c'è la nota e il comando, non un gruppo vuoto", () => {
  const { p, editor } = pannelloFinto();
  p.disegna(creaAzione(modelloVuoto(), { nome: "peso proprio", natura: "G1" }), { tipo: "azione", id: 1 });
  assert.ok(tutti(editor).some((e) => e.className === "nota" && /nessun carico/.test(e.textContent)));
  assert.equal(controlliCon(editor, "aggiungi carico").length, 1);
  assert.equal(tutti(editor).filter((e) => /^togli carico/.test(e.textContent)).length, 0);
});

test("editor dell'azione: il grado di un cedimento svuotato è «libero», non un avviso", () => {
  const { p, editor, chiamate } = pannelloFinto();
  let m = creaAzione(CON_CERNIERA(), { nome: "cedimento appoggio", natura: "G1" });
  m = aggiungiCarico(m, { azione: 1, carico: { tipo: "cedimento", nodo: 1, uz: -5 } });
  p.disegna(m, { tipo: "azione", id: 1 });
  const [uz] = controlliCon(editor, "uz del carico 1");
  uz.value = ""; uz.dispatch("change");
  assert.equal(chiamate.suAvviso.length, 0);
  assert.deepEqual(chiamate.suCarico[0][2].uz, null);
});

test("editor dell'azione: la categoria svuotata è «nessuna», non una stringa vuota", () => {
  const { p, editor, chiamate } = pannelloFinto();
  const m = creaAzione(modelloVuoto(), { nome: "spinta", natura: "Q", categoria: "vento" });
  p.disegna(m, { tipo: "azione", id: 1 });
  const [cat] = controlliCon(editor, "categoria d'uso");
  assert.equal(cat.value, "vento");
  cat.value = "  "; cat.dispatch("change");
  assert.deepEqual(chiamate.suAzione, [[1, { categoria: null }]]);
});

// Decisione 1: il flag si mostra, non blocca. Un'azione generata dalla norma resta modificabile.
test("editor dell'azione: un'azione generata ha il suo editor, e la riga dice «sì»", () => {
  const m = creaAzione(modelloVuoto(), { nome: "sisma X", natura: "E" });
  m.azioni[0].generata = true;
  const { p, editor } = pannelloFinto();
  p.disegna(m, { tipo: "azione", id: 1 });
  assert.deepEqual(righe(m, { tipo: "azione", id: 1 }).find(([k]) => k === "generata"), ["generata", "sì"]);
  assert.equal(editor.hidden, false);
  assert.equal(controlliCon(editor, "natura dell'azione").length, 1);
});

// Ingresso degenere: un file dove il nodo del carico non c'è più. L'identificatore grezzo si
// mostra e resta scelto — un `select` che ridisegna non può cancellarlo da sé.
test("editor dell'azione: un carico su un nodo sparito mostra l'id grezzo, non solleva", () => {
  let m = conCarichi();
  m = { ...m, nodi: m.nodi.filter((n) => n.id !== 2) };
  const { p, editor } = pannelloFinto();
  p.disegna(m, { tipo: "azione", id: 1 });
  const [sel] = controlliCon(editor, "nodo del carico 2");
  assert.deepEqual(sel._figli.map((o) => [o.textContent, o.selected]),
    [["nodo 2 (sparito)", true], ["nodo 1", false]]);
});

test("editor della combinazione: un campo per azione, vuoto toglie, il tipo si sceglie", () => {
  const { p, editor, chiamate } = pannelloFinto();
  let m = creaCombinazione(conCarichi(), { nome: "SLU" });
  m = impostaTermine(m, { id: 1, azione: 1, coefficiente: 1.5 });
  p.disegna(m, { tipo: "combinazione", id: 1 });
  const [coeff] = controlliCon(editor, "permanenti travi: coefficiente");
  assert.equal(coeff.value, "1,5");
  coeff.value = "1,3"; coeff.dispatch("change");
  coeff.value = ""; coeff.dispatch("change");
  assert.deepEqual(chiamate.suTermine, [[1, 1, 1.3], [1, 1, null]]);
  const [tipo] = controlliCon(editor, "tipo della combinazione");
  tipo.value = "sismica"; tipo.dispatch("change");
  assert.deepEqual(chiamate.suCombinazione, [[1, { tipo: "sismica" }]]);
});

// Il deck somma i due termini (`nova/deck.py:305-309`): il campo mostra il numero che conta.
test("editor della combinazione: due termini sulla stessa azione mostrano la somma", () => {
  const m = creaCombinazione(conCarichi(), { nome: "SLU" });
  m.combinazioni[0].termini = [{ azione: 1, coefficiente: 1 }, { azione: 1, coefficiente: 0.5 }];
  const { p, editor } = pannelloFinto();
  p.disegna(m, { tipo: "combinazione", id: 1 });
  const [coeff] = controlliCon(editor, "permanenti travi: coefficiente");
  assert.equal(coeff.value, "1,5");
});

test("editor della combinazione: senza azioni nel modello la nota dice cosa premere", () => {
  const { p, editor } = pannelloFinto();
  p.disegna(creaCombinazione(modelloVuoto(), { nome: "SLU" }), { tipo: "combinazione", id: 1 });
  assert.ok(tutti(editor).some((e) => e.className === "nota" && /premi Z/.test(e.textContent)));
});

// Ingresso degenere: una combinazione di un file vecchio, senza il campo `termini`.
test("combinazione senza «termini»: le righe dicono 0 e l'editor non solleva", () => {
  const m = creaCombinazione(conCarichi(), { nome: "SLU" });
  delete m.combinazioni[0].termini;
  assert.deepEqual(righe(m, { tipo: "combinazione", id: 1 }).find(([k]) => k === "termini"),
    ["termini", "0"]);
  const { p, editor } = pannelloFinto();
  p.disegna(m, { tipo: "combinazione", id: 1 });
  assert.equal(controlliCon(editor, "permanenti travi: coefficiente")[0].value, "");
});

// Ingresso degenere: due azioni con lo stesso nome. Il nome accessibile porta anche il caso
// (Z1, Z2), che è unico; senza, il fuoco tornerebbe sempre sul primo dei due campi.
test("editor della combinazione: due azioni omonime hanno nomi accessibili diversi", () => {
  let m = creaAzione(modelloVuoto(), { nome: "neve", natura: "G2" });
  m = creaAzione(m, { nome: "neve", natura: "G2" });
  m = creaCombinazione(m, { nome: "SLU" });
  const { p, editor } = pannelloFinto();
  p.disegna(m, { tipo: "combinazione", id: 1 });
  const nomi = controlliCon(editor, "neve: coefficiente").map((c) => c._attrs["aria-label"]);
  assert.equal(nomi.length, 2);
  assert.equal(new Set(nomi).size, 2);
  for (const n of nomi) assert.ok(n.startsWith("neve: coefficiente"), n);
});

// Un tipo fuori da `TIPI_CARICO` è un difetto del programma: si solleva, come `testoCarico`
// (`carichi.js:143`). L'`else` nudo di prima gli disegnava i campi del termico.
test("editor dell'azione: un tipo di carico sconosciuto solleva, non finge un termico", () => {
  const m = creaAzione(CON_CERNIERA(), { nome: "peso proprio", natura: "G1" });
  m.azioni[0].carichi = [{ tipo: "vento", asta: 1 }];
  const { p } = pannelloFinto();
  assert.throws(() => p.disegna(m, { tipo: "azione", id: 1 }), /tipo di carico sconosciuto: vento/);
});

// Due termini nel file: il campo mostra la somma, e la nota dice cosa succede a svuotarlo —
// `impostaTermine` li toglie entrambi, ed è l'unica scrittura che non perde un dato in silenzio.
test("editor della combinazione: due termini sulla stessa azione lo dicono nella nota", () => {
  const m = creaCombinazione(conCarichi(), { nome: "SLU" });
  m.combinazioni[0].termini = [{ azione: 1, coefficiente: 1 }, { azione: 1, coefficiente: 0.5 }];
  const { p, editor } = pannelloFinto();
  p.disegna(m, { tipo: "combinazione", id: 1 });
  assert.ok(tutti(editor).some((e) => e.className === "nota" && /due termini nel file/.test(e.textContent)));
});

test("editor della combinazione: con un termine solo la nota dei doppi non c'è", () => {
  const m = impostaTermine(creaCombinazione(conCarichi(), { nome: "SLU" }),
    { id: 1, azione: 1, coefficiente: 1.3 });
  const { p, editor } = pannelloFinto();
  p.disegna(m, { tipo: "combinazione", id: 1 });
  assert.ok(!tutti(editor).some((e) => /due termini nel file/.test(e.textContent ?? "")));
});

test("dopo «togli carico» il fuoco non cade su body", () => {
  const { p, editor } = pannelloFinto();
  let m = conCarichi();
  p.disegna(m, { tipo: "azione", id: 1 });
  tutti(editor).find((e) => e.textContent === "togli carico 2").focus();
  m = { ...m, azioni: [{ ...m.azioni[0], carichi: m.azioni[0].carichi.slice(0, 1) }] };
  p.disegna(m, { tipo: "azione", id: 1 });
  assert.notEqual(globalThis.document.activeElement, null);
  assert.ok(tutti(editor).includes(globalThis.document.activeElement));
});

// --- il rendiconto del rilievo (11d) ---
//
// Il rilievo non sta nel modello: vive accanto (`rilievo.js`), e arriva all'ispettore come
// un'opzione di `disegna`, come il catalogo e il legame. Da qui i due casi che nessun altro
// editor ha: la selezione può puntare a un'entità **assente** (nessun file importato), e
// l'editor è fatto di soli bottoni — nessuna coppia etichetta+campo, quindi `CASI_EDITOR`
// non lo può contare (i suoi cicli pretendono `coppie.length > 0`) e il test WCAG è suo.

const INCASTRO = { ux: true, uy: true, uz: true, rx: true, ry: true, rz: true };

const rilievoDa = (r) => daRisposta(r, "tests/fixture/prior_sintetico/12_wall.json");

const rilievoPieno = () => rilievoDa({
  scartate: [{ regione: 2, punti: 3866, controllo: "costanza_sezione", valore: 0.31,
               soglia: 0.15, unita: "-", spiegazione: "sintetico" }],
  giunzioni: [{ nodo: 2, scostamento_nodo: 27.1733, distanza_proiezione: 153.6, cede: 2, resta: 1 }],
  proposte_vincoli: [{ nodo: 1, vincolo: INCASTRO }, { nodo: 2, vincolo: INCASTRO }],
  mancano: ["armature", "classe", "vincoli"],
  resoconto: { membrature: 4, aste: 80, nodi: 80, scartate: 1, giunzioni_scartate: 0 },
});

test("righe del rilievo e testoOrigine con riferimento e nota", () => {
  assert.deepEqual(righe(modelloVuoto(), { tipo: "rilievo", id: 0 }, { rilievo: rilievoPieno() })[0],
                   ["file", "12_wall.json"]);
  const m = CON_CERNIERA();
  m.nodi[0].origine = { sorgente: "rilievo", riferimento: "12_wall.json", modificata: true,
                        nota: "riempimento 1.00" };
  assert.ok(righe(m, { tipo: "nodo", id: 1 })
    .some(([k, v]) => k === "origine" && v === "rilievo (12_wall.json), modificata · riempimento 1.00"));
});

test("testoOrigine: sorgente sola, riferimento, nota, e niente", () => {
  const conOrigine = (o) => {
    const m = CON_CERNIERA();
    m.nodi[0].origine = o;
    return righe(m, { tipo: "nodo", id: 1 }).find(([k]) => k === "origine")[1];
  };
  assert.equal(conOrigine({ sorgente: "rilievo" }), "rilievo");
  assert.equal(conOrigine({ sorgente: "rilievo", riferimento: "12_wall.json" }), "rilievo (12_wall.json)");
  assert.equal(conOrigine({ sorgente: "utente", nota: "classe assunta" }), "utente · classe assunta");
  assert.equal(conOrigine(null), "—");
});

test("rendiconto: scartate col filetto, mancano come gesti, proposte con conferma e conferma tutte", () => {
  const { p, editor, chiamate } = pannelloFinto();
  p.disegna(CON_CERNIERA(), { tipo: "rilievo", id: 0 }, { rilievo: rilievoPieno() });
  assert.equal(tutti(editor).filter((e) => e.className === "scartata").length, 1);
  assert.ok(tutti(editor).some((e) => /armature — apri una sezione/.test(e.textContent)));
  const conferme = tutti(editor).filter((e) => e.textContent === "conferma");
  assert.equal(conferme.length, 2);
  conferme[1].dispatch("click");
  assert.deepEqual(chiamate.suConfermaVincolo, [2]);
  tutti(editor).find((e) => e.textContent === "conferma tutte").dispatch("click");
  assert.equal(chiamate.suConfermaTutti.length, 1);
});

test("rendiconto senza rilievo mostra il vuoto; il nodo con giunzione e proposta le dice", () => {
  const { p, vuoto, dati } = pannelloFinto();
  p.disegna(CON_CERNIERA(), { tipo: "rilievo", id: 0 }, {});
  assert.equal(vuoto.hidden, false);
  p.disegna(CON_CERNIERA(), { tipo: "nodo", id: 2 }, { rilievo: rilievoPieno() });
  const testi = dati._figli.map((e) => e.textContent);
  assert.ok(testi.includes("giunzione") && testi.includes("vincolo proposto")
            && testi.includes("incastro (dal rilievo)"));
});

test("rendiconto: ogni bottone ha un nome accessibile che comincia dal testo visibile, e i nomi sono unici (WCAG 2.5.3)", () => {
  const { p, editor } = pannelloFinto();
  p.disegna(CON_CERNIERA(), { tipo: "rilievo", id: 0 }, { rilievo: rilievoPieno() });
  const bottoni = tutti(editor).filter((e) => e.type === "button" || (e._attrs["aria-label"] && e.textContent));
  const nomi = bottoni.map((b) => b._attrs["aria-label"] ?? b.textContent);
  for (const b of bottoni) assert.ok((b._attrs["aria-label"] ?? b.textContent).startsWith(b.textContent), b.textContent);
  assert.equal(new Set(nomi).size, nomi.length);
});

test("editor del nodo con una proposta aperta: il bottone conferma chiama suConfermaVincolo", () => {
  const { p, editor, chiamate } = pannelloFinto();
  p.disegna(CON_CERNIERA(), { tipo: "nodo", id: 1 }, { rilievo: rilievoPieno() });
  tutti(editor).find((e) => e.textContent === "conferma il vincolo proposto").dispatch("click");
  assert.deepEqual(chiamate.suConfermaVincolo, [1]);
});

// Il prior che non ha dato niente: quattordici regioni bocciate e zero membrature. «mancano»
// non può dire «niente: il rilievo ha dato tutto» — non ha dato nulla — e l'elenco dei gesti
// manderebbe l'utente ad aprire una sezione che non esiste.
test("rendiconto del prior vuoto: quattordici scartate, e «mancano» non promette niente", () => {
  const r = rilievoDa({
    scartate: Array.from({ length: 14 }, (_, i) => ({ regione: i + 1, punti: 100, controllo: "snellezza",
                                                      valore: 1.2, soglia: 3, unita: "-", spiegazione: "troppo tozza" })),
    mancano: ["armature", "classe", "vincoli"],
    resoconto: { membrature: 0, aste: 0, nodi: 0, scartate: 14, giunzioni_scartate: 0 },
  });
  const { p, editor, dati } = pannelloFinto();
  p.disegna(modelloVuoto(), { tipo: "rilievo", id: 0 }, { rilievo: r });
  assert.equal(tutti(editor).filter((e) => e.className === "scartata").length, 14);
  assert.deepEqual(righe(modelloVuoto(), { tipo: "rilievo", id: 0 }, { rilievo: r }).find(([k]) => k === "mancano"),
                   ["mancano", "— (nessuna membratura importata)"]);
  assert.ok(!tutti(editor).some((e) => /apri una sezione/.test(e.textContent ?? "")));
  assert.ok(!dati._figli.some((e) => e.textContent === "niente: il rilievo ha dato tutto"));
});

test("rendiconto: con membrature e niente da completare «mancano» dice che il rilievo ha dato tutto", () => {
  const r = rilievoDa({ mancano: [],
                        resoconto: { membrature: 4, aste: 80, nodi: 80, scartate: 0, giunzioni_scartate: 0 } });
  assert.deepEqual(righe(modelloVuoto(), { tipo: "rilievo", id: 0 }, { rilievo: r }).find(([k]) => k === "mancano"),
                   ["mancano", "niente: il rilievo ha dato tutto"]);
});

// Ventuno proposte: un bottone per nodo più «conferma tutte». Confermato un vincolo, quel
// nodo esce dall'elenco al ridisegno — l'elenco è ciò che resta **da decidere**, non lo
// storico di ciò che il rilievo aveva proposto.
test("rendiconto: ventuno proposte, ventuno bottoni, e il nodo confermato esce dall'elenco", () => {
  let m = modelloVuoto();
  for (let i = 0; i < 21; i += 1) m = creaNodo(m, { x: i * 100, z: 0 });
  const r = rilievoDa({
    proposte_vincoli: Array.from({ length: 21 }, (_, i) => ({ nodo: i + 1, vincolo: INCASTRO })),
    mancano: ["vincoli"],
    resoconto: { membrature: 21, aste: 20, nodi: 21, scartate: 0, giunzioni_scartate: 0 },
  });
  const { p, editor } = pannelloFinto();
  p.disegna(m, { tipo: "rilievo", id: 0 }, { rilievo: r });
  assert.equal(tutti(editor).filter((e) => e.textContent === "conferma").length, 21);
  assert.equal(tutti(editor).filter((e) => e.textContent === "conferma tutte").length, 1);
  const nomi = tutti(editor).filter((e) => e._attrs["aria-label"]).map((e) => e._attrs["aria-label"]);
  assert.equal(new Set(nomi).size, nomi.length);
  p.disegna(impostaVincolo(m, { id: 1, vincolo: INCASTRO }), { tipo: "rilievo", id: 0 }, { rilievo: r });
  assert.equal(tutti(editor).filter((e) => e.textContent === "conferma").length, 20);
  assert.ok(!tutti(editor).some((e) => (e._attrs["aria-label"] ?? "") === "conferma il vincolo proposto del nodo 1"));
});

// Una proposta sola: «conferma tutte» non compare — un bottone che fa quel che fa il bottone
// di fianco è una scelta in più senza una decisione in più.
test("rendiconto: con una proposta sola non c'è «conferma tutte»", () => {
  const r = rilievoDa({ proposte_vincoli: [{ nodo: 1, vincolo: INCASTRO }],
                        resoconto: { membrature: 1, aste: 1, nodi: 2, scartate: 0, giunzioni_scartate: 0 } });
  const { p, editor } = pannelloFinto();
  p.disegna(CON_CERNIERA(), { tipo: "rilievo", id: 0 }, { rilievo: r });
  assert.equal(tutti(editor).filter((e) => e.textContent === "conferma").length, 1);
  assert.ok(!tutti(editor).some((e) => e.textContent === "conferma tutte"));
});

// Senza scartate, senza giunzioni, senza proposte i gruppi restano, con la loro nota: un
// gruppo che sparisce lascia credere che il controllo non sia stato fatto.
test("rendiconto senza niente da dire: le note al posto degli elenchi", () => {
  const r = rilievoDa({ mancano: [],
                        resoconto: { membrature: 4, aste: 80, nodi: 80, scartate: 0, giunzioni_scartate: 0 } });
  const { p, editor } = pannelloFinto();
  p.disegna(CON_CERNIERA(), { tipo: "rilievo", id: 0 }, { rilievo: r });
  const testi = tutti(editor).map((e) => e.textContent ?? "");
  for (const atteso of ["nessuna regione scartata", "nessuna giunzione", "nessuna proposta aperta",
                        "il rendiconto vale per questa sessione: riaprendo il file non torna"]) {
    assert.equal(testi.filter((t) => t === atteso).length, 1, atteso);
  }
});

// `nota_vincoli` sta in due posti perché risponde a due domande diverse: nella `<dl>` è un
// fatto del file, nel gruppo delle proposte è il motivo per cui non c'è niente da confermare.
// Due volte nello stesso posto sarebbe rumore; una volta per posto no.
test("rendiconto: la nota dei vincoli sta nella <dl> e nel gruppo, una volta per posto", () => {
  const r = rilievoDa({ mancano: [],
                        resoconto: { membrature: 4, aste: 80, nodi: 80, scartate: 0, giunzioni_scartate: 0,
                                     nota_vincoli: "il prior non porta vincoli" } });
  const { p, editor, dati } = pannelloFinto();
  p.disegna(CON_CERNIERA(), { tipo: "rilievo", id: 0 }, { rilievo: r });
  assert.deepEqual(righe(CON_CERNIERA(), { tipo: "rilievo", id: 0 }, { rilievo: r }).filter(([k]) => k === "nota"),
                   [["nota", "il prior non porta vincoli"]]);
  assert.equal(dati._figli.filter((e) => e.textContent === "il prior non porta vincoli").length, 1);
  assert.equal(tutti(editor).filter((e) => e.textContent === "il prior non porta vincoli").length, 1);
});

// Il nodo con la giunzione ma senza proposta: la giunzione è un fatto misurato e si dice, la
// riga della proposta no — non c'è niente da proporre.
test("righe del nodo: giunzione senza proposta, e la proposta tace sul vincolo dichiarato", () => {
  const r = rilievoDa({ giunzioni: [{ nodo: 2, scostamento_nodo: 27.1733, distanza_proiezione: 153.6, cede: 2, resta: 1 }],
                        proposte_vincoli: [{ nodo: 1, vincolo: INCASTRO }],
                        resoconto: { membrature: 1, aste: 1, nodi: 2 } });
  const chiavi = (id, m = CON_CERNIERA()) => righe(m, { tipo: "nodo", id }, { rilievo: r }).map(([k]) => k);
  assert.ok(chiavi(2).includes("giunzione"));
  assert.ok(!chiavi(2).includes("vincolo proposto"));
  assert.deepEqual(righe(CON_CERNIERA(), { tipo: "nodo", id: 2 }, { rilievo: r }).find(([k]) => k === "giunzione"),
                   ["giunzione", "scostamento 27,17 mm · membratura 2 cede a 1"]);
  assert.ok(chiavi(1).includes("vincolo proposto"));
  assert.ok(!chiavi(1).includes("giunzione"));
  assert.ok(!chiavi(1, impostaVincolo(CON_CERNIERA(), { id: 1, vincolo: INCASTRO })).includes("vincolo proposto"));
});

// Il vincolo dichiarato è una decisione presa: il gruppo «dal rilievo» sparisce dall'editor,
// altrimenti il bottone rifarebbe una scelta che l'utente ha già fatto.
test("editorVincolo: con il vincolo dichiarato il gruppo «dal rilievo» non c'è", () => {
  const { p, editor } = pannelloFinto();
  const m = impostaVincolo(CON_CERNIERA(), { id: 1, vincolo: INCASTRO });
  p.disegna(m, { tipo: "nodo", id: 1 }, { rilievo: rilievoPieno() });
  assert.ok(!tutti(editor).some((e) => e.textContent === "conferma il vincolo proposto"));
  assert.ok(!tutti(editor).some((e) => (e.textContent ?? "") === "dal rilievo"));
});

// I chiamanti a due argomenti restano validi: `righe(m, selezione)` non pretende le opzioni,
// e senza rilievo il nodo torna le sue sei righe di sempre.
test("righe: il terzo argomento è facoltativo", () => {
  assert.equal(righe(CON_CERNIERA(), { tipo: "nodo", id: 1 }).length, 6);
  assert.equal(righe(CON_CERNIERA(), { tipo: "rilievo", id: 0 }), null);
});
