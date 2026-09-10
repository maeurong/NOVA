import { test } from "node:test";
import assert from "node:assert/strict";
import { creaEsito, creaSrotolato } from "../esito.js";

// Il DOM finto è quello di `corsa.test.js:127-160` e di `piano.test.js:117-133`, copiato invece
// che importato: un test che importa dall'altro li lega, e il giorno che uno dei due cambia
// elemento l'altro si rompe per una ragione che non lo riguarda.

function elementoFinto(iniziale = {}) {
  const listeners = {};
  const el = {
    nome: "", type: "", value: "", textContent: "", className: "", hidden: false,
    _figli: [], _attrs: {},
    setAttribute(k, v) { this._attrs[k] = String(v); },
    getAttribute(k) { return this._attrs[k] ?? null; },
    addEventListener(ev, fn) { (listeners[ev] ??= []).push(fn); },
    dispatch(ev, argomento) { (listeners[ev] ?? []).forEach((fn) => fn(argomento)); },
    append(...figli) { this._figli.push(...figli); },
    replaceChildren(...figli) { this._figli = figli; },
  };
  return Object.assign(el, iniziale);
}

function elementoSvgFinto(nome) {
  return {
    nome, textContent: "", _figli: [], _attrs: {},
    setAttribute(k, v) { this._attrs[k] = String(v); },
    getAttribute(k) { return this._attrs[k] ?? null; },
    append(...figli) { this._figli.push(...figli); },
    replaceChildren(...figli) { this._figli = figli; },
  };
}

globalThis.document = {
  activeElement: null,
  createElement: (nome) => elementoFinto({ nome }),
  createElementNS: (_ns, nome) => elementoSvgFinto(nome),
};

const contenitoreFinto = (clientWidth = 800) => ({
  hidden: false, clientWidth, _figli: [],
  replaceChildren(...figli) { this._figli = figli; },
});

// Tutti i discendenti con quel nome di tag, a qualunque profondità, come in `piano.test.js`.
function tutti(radice, nome) {
  const trovati = radice?.nome === nome ? [radice] : [];
  for (const f of radice?._figli ?? []) trovati.push(...tutti(f, nome));
  return trovati;
}

/** I cinque elementi del blocco, più i cinque radio della vista. I radio sono un **gruppo**:
 *  accenderne uno spegne gli altri, come nel DOM vero. Senza questo il finto ne tiene due
 *  accesi e `find((r) => r.checked)` rende sempre il primo, cioè il test passerebbe verde
 *  su un `cambio` che legge la vista sbagliata. */
function radiceFinta() {
  const elementi = {
    "#risultati-vuoto": elementoFinto({ nome: "p" }),
    "#risultati-controlli": elementoFinto({ nome: "div", hidden: true }),
    "#risultati-caso": elementoFinto({ nome: "select" }),
    "#risultati-scala": elementoFinto({ nome: "input", type: "text" }),
    "#risultati-equilibrio": elementoFinto({ nome: "p" }),
  };
  const gruppo = [];
  for (const valore of ["", "deformata", "M", "V", "N"]) {
    const r = elementoFinto({ nome: "input", type: "radio", value: valore });
    let acceso = false;
    Object.defineProperty(r, "checked", {
      enumerable: true,
      get: () => acceso,
      set(v) { acceso = Boolean(v); if (acceso) for (const a of gruppo) if (a !== r) a.checked = false; },
    });
    gruppo.push(r);
  }
  return {
    radice: {
      querySelector: (sel) => elementi[sel] ?? null,
      querySelectorAll: (sel) => (sel === 'input[name="vista"]' ? gruppo : []),
    },
    el: (sel) => elementi[sel],
  };
}

const risultatiDi = (casi) => ({ lavoro: { fin: { risultati: { run: { carico_totale: Object.fromEntries(casi.map((c) => [c, [0, 0, -60000]])) },
  per_caso: Object.fromEntries(casi.map((c) => [c, { spostamenti: {}, reazioni: { 1: [0, 0, 60000, 0, 0, 0] }, sollecitazioni: { 1: [{ x_rel: 0, My: 0 }, { x_rel: 0.5, My: 45e6 }, { x_rel: 1, My: 0 }] } }])) } } },
  vista: "deformata", caso: casi[0], scalaMano: null });

test("creaEsito: senza risultati lo stato vuoto; con risultati il select dei casi, la vista spuntata, l'equilibrio", () => {
  const { radice, el } = radiceFinta();
  const cambi = [];
  const esito = creaEsito(radice, { suCambio: (c) => cambi.push(c) });
  esito.disegna({ risultati: null, modello: {} });
  assert.equal(el("#risultati-vuoto").hidden, false);
  assert.equal(el("#risultati-controlli").hidden, true);
  esito.disegna({ risultati: risultatiDi(["Z1", "Z2"]), modello: {} });
  assert.equal(el("#risultati-vuoto").hidden, true);
  assert.equal(el("#risultati-controlli").hidden, false);
  assert.deepEqual(el("#risultati-caso")._figli.map((o) => o.value), ["Z1", "Z2"]);
  assert.equal(el("#risultati-caso").value, "Z1");
  assert.equal(radice.querySelectorAll('input[name="vista"]').find((r) => r.checked).value, "deformata");
  assert.equal(el("#risultati-equilibrio").textContent, "Σ reazioni (0; 0; 60) kN · Σ carichi (0; 0; -60) kN");
  assert.equal(el("#risultati-scala").value, "", "scala auto: campo vuoto");
});

test("creaEsito: cambiare caso, vista o scala chiama suCambio con i tre valori; una scala illeggibile torna auto", () => {
  const { radice, el } = radiceFinta();
  const cambi = [];
  const esito = creaEsito(radice, { suCambio: (c) => cambi.push(c) });
  esito.disegna({ risultati: risultatiDi(["Z1", "Z2"]), modello: {} });
  el("#risultati-caso").value = "Z2"; el("#risultati-caso").dispatch("change");
  assert.deepEqual(cambi.at(-1), { caso: "Z2", vista: "deformata", scalaMano: null });
  const radioM = radice.querySelectorAll('input[name="vista"]').find((r) => r.value === "M");
  radioM.checked = true; radioM.dispatch("change");
  assert.deepEqual(cambi.at(-1), { caso: "Z2", vista: "M", scalaMano: null });
  el("#risultati-scala").value = "50"; el("#risultati-scala").dispatch("change");
  assert.equal(cambi.at(-1).scalaMano, 50);
  el("#risultati-scala").value = "1/4"; el("#risultati-scala").dispatch("change");
  assert.equal(cambi.at(-1).scalaMano, 0.25, "leggiEspressione: «1/4» è una scala");
  el("#risultati-scala").value = "boh"; el("#risultati-scala").dispatch("change");
  assert.equal(cambi.at(-1).scalaMano, null, "illeggibile = auto");
  el("#risultati-scala").value = "0"; el("#risultati-scala").dispatch("change");
  assert.equal(cambi.at(-1).scalaMano, null, "zero o negativo = auto");
  el("#risultati-scala").value = "-3"; el("#risultati-scala").dispatch("change");
  assert.equal(cambi.at(-1).scalaMano, null, "negativa = auto");
  // La vista «niente» (il radio a valore vuoto) è `null`, non la stringa vuota: è quel che
  // `piano.js` legge per spegnere lo strato (`piano.js:141`).
  const radioNiente = radice.querySelectorAll('input[name="vista"]').find((r) => r.value === "");
  radioNiente.checked = true; radioNiente.dispatch("change");
  assert.equal(cambi.at(-1).vista, null);
});

test("creaEsito: senza risultati un cambio non chiama suCambio, e il campo a fuoco non si riscrive sotto le dita", () => {
  const { radice, el } = radiceFinta();
  const cambi = [];
  const esito = creaEsito(radice, { suCambio: (c) => cambi.push(c) });
  esito.disegna({ risultati: null, modello: {} });
  el("#risultati-scala").dispatch("change");
  assert.equal(cambi.length, 0);
  esito.disegna({ risultati: { ...risultatiDi(["Z1"]), scalaMano: 50 }, modello: {} });
  assert.equal(el("#risultati-scala").value, "50");
  globalThis.document.activeElement = el("#risultati-scala");
  el("#risultati-scala").value = "12";
  esito.disegna({ risultati: { ...risultatiDi(["Z1"]), scalaMano: 50 }, modello: {} });
  assert.equal(el("#risultati-scala").value, "12", "il campo a fuoco resta com'è");
  globalThis.document.activeElement = null;
});

test("creaEsito: un ridisegno con lo stesso caso non riscrive il select (il fuoco resta), con un caso sparito torna al primo", () => {
  const { radice, el } = radiceFinta();
  const esito = creaEsito(radice, { suCambio: () => {} });
  esito.disegna({ risultati: risultatiDi(["Z1", "Z2"]), modello: {} });
  const opzioniPrima = el("#risultati-caso")._figli;
  esito.disegna({ risultati: { ...risultatiDi(["Z1", "Z2"]), caso: "Z2" }, modello: {} });
  assert.equal(el("#risultati-caso")._figli, opzioniPrima, "stesse opzioni: non si ricostruiscono");
  assert.equal(el("#risultati-caso").value, "Z2");
  esito.disegna({ risultati: { ...risultatiDi(["Z1"]), caso: "Z9" }, modello: {} });
  assert.equal(el("#risultati-caso").value, "Z1");
});

test("creaSrotolato: senza risultati nascosta; con risultati e nessuna asta il gesto; con l'asta il diagramma e il picco scritto", () => {
  const contenitore = contenitoreFinto();
  const striscia = creaSrotolato(contenitore);
  const modello = { nodi: [{ id: 1, x: 0, z: 0 }, { id: 2, x: 6000, z: 0 }], aste: [{ id: 1, nodo_i: 1, nodo_j: 2 }] };
  striscia.disegna({ risultati: null, modello, selezione: { tipo: "asta", id: 1 } });
  assert.equal(contenitore.hidden, true);
  const inVista = { vista: "M", caso: "Z1", perCaso: risultatiDi(["Z1"]).lavoro.fin.risultati.per_caso.Z1, stantia: false };
  striscia.disegna({ risultati: inVista, modello, selezione: null });
  assert.equal(contenitore.hidden, false);
  assert.ok(contenitore._figli[0].textContent.includes("Seleziona un'asta"));
  striscia.disegna({ risultati: inVista, modello, selezione: { tipo: "asta", id: 1 } });
  const svg = contenitore._figli.find((f) => f.nome === "svg");
  assert.ok(svg, "un SVG per l'asta");
  assert.equal(contenitore._figli[0].textContent, "M dell'asta 1 · Z1 · kN·m");
  const testi = tutti(svg, "text").map((t) => t.textContent);
  assert.ok(testi.includes("45 kN·m"));
  assert.equal(tutti(svg, "circle").length, 3, "un punto per stazione");
  striscia.disegna({ risultati: { ...inVista, stantia: true }, modello, selezione: { tipo: "asta", id: 1 } });
  assert.equal(contenitore._figli[0].className, "titolo stantia");
});

test("creaSrotolato: un'asta senza stazioni o sparita non solleva e dice che non c'è niente", () => {
  const contenitore = contenitoreFinto();
  const striscia = creaSrotolato(contenitore);
  const modello = { nodi: [], aste: [{ id: 7, nodo_i: 1, nodo_j: 2 }] };
  const inVista = { vista: "deformata", caso: "Z1", perCaso: { sollecitazioni: {} }, stantia: false };
  striscia.disegna({ risultati: inVista, modello, selezione: { tipo: "asta", id: 7 } });
  assert.equal(contenitore.hidden, false);
  assert.ok(contenitore._figli[0].textContent.includes("nessuna stazione"));
  striscia.disegna({ risultati: inVista, modello, selezione: { tipo: "asta", id: 99 } });
  assert.ok(contenitore._figli[0].textContent.includes("Seleziona un'asta"));
});

test("creaSrotolato: il pilastro legge `Mz`, e un contenitore largo 0 disegna comunque a 200 px", () => {
  const contenitore = contenitoreFinto(0);
  const striscia = creaSrotolato(contenitore);
  // In piedi: `assiDi` dà `M: "Mz"` (R1). Con una chiave costante `My` uscirebbe una riga piatta.
  const modello = { nodi: [{ id: 1, x: 0, z: 0 }, { id: 2, x: 0, z: 3000 }], aste: [{ id: 1, nodo_i: 1, nodo_j: 2 }] };
  const perCaso = { sollecitazioni: { 1: [{ x_rel: 0, My: 0, Mz: 0 }, { x_rel: 1, My: 0, Mz: 21e6 }] } };
  striscia.disegna({ risultati: { vista: "M", caso: "Z1", perCaso, stantia: false }, modello, selezione: { tipo: "asta", id: 1 } });
  const svg = contenitore._figli.find((f) => f.nome === "svg");
  assert.equal(svg.getAttribute("width"), "200", "clientWidth a 0: larghezza minima, mai 0 né NaN");
  assert.ok(tutti(svg, "text").map((t) => t.textContent).includes("21 kN·m"), "la chiave del pilastro è Mz");
  for (const p of svg._figli) for (const v of Object.values(p._attrs)) assert.ok(!v.includes("NaN"), `NaN in ${v}`);
});
