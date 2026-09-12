import { test } from "node:test";
import assert from "node:assert/strict";
import { creaEsito, creaSrotolato } from "../esito.js";
import { avanzamentoMono } from "../misure.js";

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
  const listeners = {};
  return {
    nome, textContent: "", _figli: [], _attrs: {},
    setAttribute(k, v) { this._attrs[k] = String(v); },
    getAttribute(k) { return this._attrs[k] ?? null; },
    // Il bersaglio della curva (R11) è un `rect` con **un** listener: senza `dispatch` qui
    // il clic non si potrebbe provare, e i 120 cerchi tornerebbero cliccabili uno per uno.
    addEventListener(ev, fn) { (listeners[ev] ??= []).push(fn); },
    dispatch(ev, argomento) { (listeners[ev] ?? []).forEach((fn) => fn(argomento)); },
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
  hidden: false, clientWidth, _figli: [], _attrs: {},
  setAttribute(k, v) { this._attrs[k] = String(v); },
  getAttribute(k) { return this._attrs[k] ?? null; },
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
  esito.disegna({ risultati: null });
  assert.equal(el("#risultati-vuoto").hidden, false);
  assert.equal(el("#risultati-controlli").hidden, true);
  esito.disegna({ risultati: risultatiDi(["Z1", "Z2"]) });
  assert.equal(el("#risultati-vuoto").hidden, true);
  assert.equal(el("#risultati-controlli").hidden, false);
  assert.deepEqual(tutti(el("#risultati-caso"), "option").map((o) => o.value), ["Z1", "Z2"]);
  assert.equal(el("#risultati-caso").value, "Z1");
  assert.equal(radice.querySelectorAll('input[name="vista"]').find((r) => r.checked).value, "deformata");
  assert.equal(el("#risultati-equilibrio").textContent, "Σ reazioni (0; 0; 60) kN · Σ carichi (0; 0; -60) kN");
  assert.equal(el("#risultati-scala").value, "", "scala auto: campo vuoto");
});

test("creaEsito: cambiare caso, vista o scala chiama suCambio con i tre valori; una scala illeggibile torna auto", () => {
  const { radice, el } = radiceFinta();
  const cambi = [];
  const esito = creaEsito(radice, { suCambio: (c) => cambi.push(c) });
  esito.disegna({ risultati: risultatiDi(["Z1", "Z2"]) });
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
  esito.disegna({ risultati: null });
  el("#risultati-scala").dispatch("change");
  assert.equal(cambi.length, 0);
  esito.disegna({ risultati: { ...risultatiDi(["Z1"]), scalaMano: 50 } });
  assert.equal(el("#risultati-scala").value, "50");
  globalThis.document.activeElement = el("#risultati-scala");
  el("#risultati-scala").value = "12";
  esito.disegna({ risultati: { ...risultatiDi(["Z1"]), scalaMano: 50 } });
  assert.equal(el("#risultati-scala").value, "12", "il campo a fuoco resta com'è");
  globalThis.document.activeElement = null;
});

test("creaEsito: un ridisegno con lo stesso caso non riscrive il select (il fuoco resta), con un caso sparito torna al primo e lo stato lo segue", async () => {
  const { radice, el } = radiceFinta();
  const cambi = [];
  const esito = creaEsito(radice, { suCambio: (c) => cambi.push(c) });
  esito.disegna({ risultati: risultatiDi(["Z1", "Z2"]) });
  const opzioniPrima = el("#risultati-caso")._figli;
  esito.disegna({ risultati: { ...risultatiDi(["Z1", "Z2"]), caso: "Z2" } });
  assert.equal(el("#risultati-caso")._figli, opzioniPrima, "stesse opzioni: non si ricostruiscono");
  assert.equal(el("#risultati-caso").value, "Z2");
  assert.equal(cambi.length, 0, "un caso che c'è non fa parlare nessuno");
  esito.disegna({ risultati: { ...risultatiDi(["Z1"]), caso: "Z9", vista: "M", scalaMano: 50 } });
  assert.equal(el("#risultati-caso").value, "Z1");
  // La correzione arriva in coda al giro, non dentro: `suCambio` richiama `ridisegna`, che sta
  // ancora girando. Senza questo il blocco mostrerebbe Z1 e il piano il caso che non c'è.
  await Promise.resolve();
  assert.deepEqual(cambi.at(-1), { caso: "Z1", vista: "M", scalaMano: 50 });
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

// La striscia non deve **mai** poter allargare la colonna che la misura: l'SVG più largo del
// contenuto faceva crescere la traccia `1fr`, e il giro dopo `clientWidth` era più grande —
// +16 px a ogni ridisegno, senza tetto (misurato dal reviewer: 375 → 487 in otto giri).
test("creaSrotolato: nessuna coordinata esce dalla larghezza misurata, e ridisegnare non la fa crescere", () => {
  const contenitore = contenitoreFinto(375);
  const striscia = creaSrotolato(contenitore);
  const modello = { nodi: [{ id: 1, x: 0, z: 0 }, { id: 2, x: 6000, z: 0 }], aste: [{ id: 1, nodo_i: 1, nodo_j: 2 }] };
  const perCaso = { sollecitazioni: { 1: [{ x_rel: 0, My: 0 }, { x_rel: 0.5, My: 45e6 }, { x_rel: 1, My: -12e6 }] } };
  const quadro = { vista: "M", caso: "Z1", perCaso, stantia: false };
  for (let giro = 0; giro < 8; giro++) {
    striscia.disegna({ risultati: quadro, modello, selezione: { tipo: "asta", id: 1 } });
    const svg = contenitore._figli.find((f) => f.nome === "svg");
    assert.ok(Number(svg.getAttribute("width")) <= 375, `giro ${giro}: ${svg.getAttribute("width")} px`);
    for (const e of tutti(svg, "line").concat(tutti(svg, "circle"), tutti(svg, "text"))) {
      for (const [k, v] of Object.entries(e._attrs)) {
        if (["x", "x1", "x2", "cx"].includes(k)) assert.ok(Number(v) >= 0 && Number(v) <= 375, `${k}=${v}`);
      }
    }
  }
});

// --- la review di ramo ------------------------------------------------------------

// Σ reazioni contro Σ carichi è il numero che contraddice, e di una corsa superata dal modello
// parla del modello di prima: in nero passava per attuale. Doppio canale come `#corsa-ultima`.
test("creaEsito: con una corsa stantia l'equilibrio porta la classe e la parola", () => {
  const { radice, el } = radiceFinta();
  const esito = creaEsito(radice, { suCambio: () => {} });
  esito.disegna({ risultati: risultatiDi(["Z1"]), stantia: true });
  assert.equal(el("#risultati-equilibrio").className, "numero stantia", "il mono resta con il filetto");
  assert.ok(el("#risultati-equilibrio").textContent.startsWith("stantia · Σ reazioni"),
    el("#risultati-equilibrio").textContent);
  esito.disegna({ risultati: risultatiDi(["Z1"]), stantia: false });
  assert.equal(el("#risultati-equilibrio").className, "numero", "corsa fresca: nessun filetto, il mono resta");
  assert.ok(el("#risultati-equilibrio").textContent.startsWith("Σ reazioni"));
  esito.disegna({ risultati: risultatiDi(["Z1"]) });
  assert.equal(el("#risultati-equilibrio").className, "numero", "senza il parametro vale fresca");
});

// Tornare ad auto in silenzio è il modo peggiore di dirlo: il campo si riscrive vuoto e chi ha
// scritto «−3» non sa se ha sbagliato lui o se ha deciso il programma.
test("creaEsito: una scala illeggibile, zero o negativa avvisa, con un esempio", () => {
  const { radice, el } = radiceFinta();
  const avvisi = [];
  const esito = creaEsito(radice, { suCambio: () => {}, suAvviso: (t) => avvisi.push(t) });
  esito.disegna({ risultati: risultatiDi(["Z1"]) });
  for (const scritto of ["pippo", "0", "-3"]) {
    el("#risultati-scala").value = scritto;
    el("#risultati-scala").dispatch("change");
  }
  assert.equal(avvisi.length, 3, `un avviso per ciascuna: ${JSON.stringify(avvisi)}`);
  assert.match(avvisi[0], /^la scala è un numero positivo, per esempio 50 o 1\/4 — torno ad auto$/);
  el("#risultati-scala").value = "50"; el("#risultati-scala").dispatch("change");
  el("#risultati-scala").value = ""; el("#risultati-scala").dispatch("change");
  assert.equal(avvisi.length, 3, "una scala buona e un campo vuoto non avvisano di niente");
});

test("creaEsito: senza `suAvviso` una scala illeggibile non solleva", () => {
  const { radice, el } = radiceFinta();
  const esito = creaEsito(radice, { suCambio: () => {} });
  esito.disegna({ risultati: risultatiDi(["Z1"]) });
  el("#risultati-scala").value = "pippo";
  assert.doesNotThrow(() => el("#risultati-scala").dispatch("change"));
});

// --- la striscia segue la vista (debito 7) ----------------------------------------
// Guardare V nel piano e M nella striscia è leggere due grandezze diverse per lo stesso gesto.

test("creaSrotolato: in vista V la striscia srotola V, con la chiave della giacitura e le sue unità", () => {
  const modello = { nodi: [{ id: 1, x: 0, y: 0, z: 0 }, { id: 2, x: 0, y: 0, z: 3000 }],
                    aste: [{ id: 3, nodo_i: 1, nodo_j: 2 }] };   // un pilastro: la chiave è Vy
  const perCaso = { sollecitazioni: { 3: [
    { x_rel: 0, N: -1000, Vy: 12000, Vz: 1e-10, T: 0, My: 1e-9, Mz: 6e6 },
    { x_rel: 1, N: -1000, Vy: 12000, Vz: 1e-10, T: 0, My: 1e-9, Mz: 0 }] } };
  const contenitore = contenitoreFinto();
  const srot = creaSrotolato(contenitore);
  const disegna = (vista) => {
    srot.disegna({ risultati: { vista, caso: "Z1", perCaso, stantia: false }, modello, selezione: { tipo: "asta", id: 3 } });
    return contenitore._figli;
  };
  assert.equal(disegna("V")[0].textContent, "V dell'asta 3 · Z1 · kN");
  assert.deepEqual(tutti(disegna("V")[1], "text").map((t) => t.textContent), ["12 kN"], "il picco in kN, non in kN·m");
  assert.equal(disegna("N")[0].textContent, "N dell'asta 3 · Z1 · kN");
  assert.deepEqual(tutti(disegna("N")[1], "text").map((t) => t.textContent), ["-1 kN"]);
  // M in vista M, e anche in deformata o senza vista: accanto a una deformata si legge la flessione.
  for (const vista of ["M", "deformata", null]) {
    assert.equal(disegna(vista)[0].textContent, `M dell'asta 3 · Z1 · kN·m`, `vista ${vista}`);
    assert.deepEqual(tutti(disegna(vista)[1], "text").map((t) => t.textContent), ["6 kN·m"]);
  }
});

test("creaSrotolato: senza un'asta selezionata l'invito nomina la vista", () => {
  const contenitore = contenitoreFinto();
  const srot = creaSrotolato(contenitore);
  const invito = (vista) => {
    srot.disegna({ risultati: { vista, caso: "Z1", perCaso: {}, stantia: false }, modello: { nodi: [], aste: [] }, selezione: null });
    return contenitore._figli[0].textContent;
  };
  assert.equal(invito("V"), "Seleziona un'asta per il suo V srotolato.");
  assert.equal(invito("deformata"), "Seleziona un'asta per il suo M srotolato.");
});

// Il piano disegna V positivo **sopra** la trave (a sinistra di i→j); la striscia lo disegnava
// sotto la linea, e la stessa asta usciva specchiata fra i due pannelli.
test("creaSrotolato: V e N positivi vanno in su come nel piano, M positivo resta in giù", () => {
  const modello = { nodi: [{ id: 1, x: 0, y: 0, z: 0 }, { id: 2, x: 6000, y: 0, z: 0 }],
                    aste: [{ id: 3, nodo_i: 1, nodo_j: 2 }] };   // una trave: le chiavi sono My/Vz
  const perCaso = { sollecitazioni: { 3: [
    { x_rel: 0, N: 5000, Vy: 0, Vz: 30000, T: 0, My: 45e6, Mz: 0 },
    { x_rel: 1, N: 5000, Vy: 0, Vz: 30000, T: 0, My: 45e6, Mz: 0 }] } };
  const contenitore = contenitoreFinto();
  const srot = creaSrotolato(contenitore);
  const ordinate = (vista) => {
    srot.disegna({ risultati: { vista, caso: "Z1", perCaso, stantia: false }, modello, selezione: { tipo: "asta", id: 3 } });
    return tutti(contenitore._figli[1], "circle").map((c) => Number(c.getAttribute("cy")));
  };
  const y0 = 96 / 2;   // `H / 2`, la linea di base della striscia
  assert.ok(ordinate("M").every((y) => y > y0), `M positivo in giù, il lato teso: ${ordinate("M")}`);
  assert.ok(ordinate("V").every((y) => y < y0), `V positivo in su: ${ordinate("V")}`);
  assert.ok(ordinate("N").every((y) => y < y0), `N positivo in su: ${ordinate("N")}`);
});

// --- la 14a: il caso a tre forme nel menu, e la curva della pushover nella striscia ---

const M2 = { n: 2, f: 31.85, T: 0.0314, forma: { 1: [0, 0, 0], 3: [1, 0, -0.03] },
             massa_partecipante: { x: 0.456215, y: 0, z: 0 }, cumulata: { x: 0.95, y: 0.78, z: 1 } };
const PASSI = [
  { n: 1, spostamento: 0.5, taglio_base: 1200, spostamenti: { 3: [0.5, 0, 0, 0, 0, 0] }, stato_sezioni: {} },
  { n: 2, spostamento: 1.0, taglio_base: 2300, spostamenti: { 3: [1.0, 0, 0, 0, 0, 0] }, stato_sezioni: {} },
];
const conModiEPassi = () => ({
  lavoro: { fin: { risultati: {
    run: { carico_totale: { Z1: [0, 0, -60000] }, pushover: { u0: 0.0002494 } },
    per_caso: { Z1: { spostamenti: {}, reazioni: { 1: [0, 0, 60000, 0, 0, 0] }, sollecitazioni: {} } },
    modi: [M2], passi: PASSI, caduta: null } } },
  vista: "deformata", caso: "Z1", scalaMano: null });

test("creaEsito: il menu porta casi, pushover e modi, raggruppati; il valore scelto passa a suCambio", () => {
  const { radice, el } = radiceFinta();
  const cambi = [];
  const esito = creaEsito(radice, { suCambio: (c) => cambi.push(c) });
  esito.disegna({ risultati: conModiEPassi() });
  const select = el("#risultati-caso");
  assert.deepEqual(tutti(select, "option").map((o) => o.value), ["Z1", "pushover", "modo:2"]);
  assert.deepEqual(tutti(select, "option").map((o) => o.textContent),
                   ["Z1", "pushover · 2 passi", "modo 2 · 31,85 Hz · ux 46 %"]);
  // R12: tre gruppi nativi, non una lista piatta di 46 voci (MURO 1: 4 casi + 42 modi)
  assert.deepEqual(select._figli.map((g) => g.getAttribute("label")), ["casi", "pushover", "modi"]);
  select.value = "modo:2"; select.dispatch("change");
  assert.deepEqual(cambi.at(-1), { caso: "modo:2", vista: "deformata", scalaMano: null });
});

test("creaEsito: con un modo scelto l'equilibrio dice le masse; con la pushover dice i passi", () => {
  const { radice, el } = radiceFinta();
  const esito = creaEsito(radice, { suCambio: () => {} });
  esito.disegna({ risultati: { ...conModiEPassi(), caso: "modo:2" } });
  assert.equal(el("#risultati-equilibrio").textContent,
               "massa partecipante x 46 % · y 0 % · z 0 % · cumulata x 95 % · y 78 % · z 100 %");
  esito.disegna({ risultati: { ...conModiEPassi(), caso: "pushover" } });
  assert.equal(el("#risultati-equilibrio").textContent,
               "2 passi convergenti · u₀ 0,0002 mm · taglio massimo 2,3 kN al passo 2 · caduta: nessuna");
});

test("creaSrotolato con la pushover: la curva in pixel, un cerchio per passo, il corrente rosso, la caduta segnata", () => {
  const contenitore = contenitoreFinto(400);
  const passi = [];
  const striscia = creaSrotolato(contenitore, { suPasso: (k) => passi.push(k) });
  // `caduta.n` è il numero del passo che manda il server, e `curvaPushover` lo mette sempre:
  // è quello che va scritto, non l'indice nella lista.
  const curva = { punti: [{ k: 0, u: 0.5, V: 1.2 }, { k: 1, u: 1, V: 2.3 }], uMax: 1, vMax: 2.3,
                  caduta: { k: 1, n: 2, u: 1, motivo: "non converge" } };
  striscia.disegna({ risultati: { tipo: "pushover", vista: "deformata", caso: "pushover",
                                  passo: { k: 1, n: 2, u: 1, V: 2.3 }, curva, stantia: false },
                     modello: null, selezione: null });
  const [titolo] = contenitore._figli;
  assert.equal(titolo.textContent,
               "pushover · taglio alla base – spostamento del nodo di controllo · kN, mm");
  const svg = contenitore._figli[1];
  assert.equal(tutti(svg, "polyline").length, 1);
  const cerchi = tutti(svg, "circle").filter((c) => c.getAttribute("class") === "passo");
  assert.equal(cerchi.length, 2);
  assert.deepEqual(cerchi.map((c) => c.getAttribute("data-k")), ["0", "1"]);
  assert.equal(cerchi[1].getAttribute("fill"), "#b8321e", "il passo corrente è una selezione");
  assert.ok(Number(cerchi[1].getAttribute("r")) > Number(cerchi[0].getAttribute("r")),
            "R10: il raggio è il secondo canale, e regge anche quando la curva è tutta rossa");
  assert.deepEqual(cerchi.map((c) => c.getAttribute("aria-label")), ["passo 1", "passo 2"]);
  const testi = tutti(svg, "text").map((t) => t.textContent);
  assert.ok(testi.includes("u 1 mm") && testi.includes("V 2,3 kN"));
  assert.ok(testi.some((t) => t === "caduta al passo 2 · u 1 mm"));
  // nessuna coordinata fuori dalla larghezza misurata (la regola della 13, R7)
  for (const c of cerchi) assert.ok(Number(c.getAttribute("cx")) <= 400);
  // `hidden` era già `false` prima del disegno: asserirlo qui non provava niente. Quel che
  // cambia è il bersaglio dei clic, che senza la curva non c'è.
  assert.ok(tutti(svg, "rect").some((r) => r.getAttribute("class") === "passi"));
});

test("creaSrotolato: il clic su un passo lo dice, con un solo bersaglio largo quanto la striscia (R11)", () => {
  const contenitore = contenitoreFinto(400);
  const passi = [];
  const striscia = creaSrotolato(contenitore, { suPasso: (k) => passi.push(k) });
  const punti = Array.from({ length: 120 }, (_, k) => ({ k, u: (k + 1) / 2, V: k }));
  striscia.disegna({ risultati: { tipo: "pushover", vista: "deformata", caso: "pushover",
                                  passo: { k: 119, n: 120, u: 60, V: 119 },
                                  curva: { punti, uMax: 60, vMax: 119, caduta: null }, stantia: false },
                     modello: null, selezione: null });
  const svg = contenitore._figli[1];
  const bersaglio = tutti(svg, "rect").find((r) => r.getAttribute("class") === "passi");
  assert.ok(bersaglio, "un solo rettangolo, non 120 cerchi con un listener ciascuno");
  assert.equal(bersaglio.getAttribute("fill"), "transparent", "`none` non prenderebbe i clic");
  assert.equal(Number(bersaglio.getAttribute("width")), 400);
  bersaglio.dispatch("click", { offsetX: 0 });
  assert.equal(passi.at(-1), 0);
  bersaglio.dispatch("click", { offsetX: 400 });
  assert.equal(passi.at(-1), 119, "l'ultimo passo si prende dal bordo destro");
  bersaglio.dispatch("click", { offsetX: -50 });
  assert.equal(passi.at(-1), 0, "fuori a sinistra: stretto al primo");
});

test("creaSrotolato: senza `suPasso` un clic non solleva; con un passo solo la curva non divide per zero", () => {
  const contenitore = contenitoreFinto(400);
  const striscia = creaSrotolato(contenitore, {});
  striscia.disegna({ risultati: { tipo: "pushover", vista: "deformata", caso: "pushover",
                                  passo: { k: 0, n: 1, u: 0, V: 0 },
                                  curva: { punti: [{ k: 0, u: 0, V: 0 }], uMax: 0, vMax: 0, caduta: null },
                                  stantia: false }, modello: null, selezione: null });
  const svg = contenitore._figli[1];
  const [c] = tutti(svg, "circle").filter((x) => x.getAttribute("class") === "passo");
  assert.ok(Number.isFinite(Number(c.getAttribute("cx"))) && Number.isFinite(Number(c.getAttribute("cy"))));
  tutti(svg, "rect").find((r) => r.getAttribute("class") === "passi").dispatch("click", { offsetX: 10 });
});

test("creaSrotolato con un modo: la striscia dice che una forma modale non ha sollecitazioni", () => {
  const contenitore = contenitoreFinto(400);
  const striscia = creaSrotolato(contenitore, { suPasso: () => {} });
  striscia.disegna({ risultati: { tipo: "modo", vista: "deformata", caso: "modo:2",
                                  modo: M2, stantia: false }, modello: null, selezione: null });
  assert.equal(contenitore._figli.length, 1, "nessun svg");
  assert.equal(contenitore._figli[0].textContent, "modo 2: nessuna sollecitazione da srotolare");
});

test("creaSrotolato: un `tipo` sconosciuto o assente torna alla striscia di oggi", () => {
  const contenitore = contenitoreFinto(400);
  const striscia = creaSrotolato(contenitore, { suPasso: () => {} });
  striscia.disegna({ risultati: { vista: "M", caso: "Z1", perCaso: { sollecitazioni: {} }, stantia: false },
                     modello: { aste: [] }, selezione: null });
  assert.ok(contenitore._figli[0].textContent.includes("Seleziona un'asta"));
});

// La curva senza punti: gli assi si disegnano lo stesso, ma non c'è niente da cliccare e
// nessuna divisione per zero (ingresso degenere del brief).
test("creaSrotolato: una curva senza punti disegna gli assi, nessun cerchio, e il clic non solleva", () => {
  const contenitore = contenitoreFinto(400);
  const visti = [];
  const striscia = creaSrotolato(contenitore, { suPasso: (k) => visti.push(k) });
  striscia.disegna({ risultati: { tipo: "pushover", vista: "deformata", caso: "pushover",
                                  passo: { k: 0, n: 0, u: 0, V: 0 },
                                  curva: { punti: [], uMax: 0, vMax: 0, caduta: null }, stantia: false },
                     modello: null, selezione: null });
  const svg = contenitore._figli[1];
  assert.equal(tutti(svg, "circle").filter((c) => c.getAttribute("class") === "passo").length, 0);
  tutti(svg, "rect").find((r) => r.getAttribute("class") === "passi").dispatch("click", { offsetX: 200 });
  assert.deepEqual(visti, [], "senza punti non c'è un passo più vicino da dire");
  for (const e of tutti(svg, "line").concat(tutti(svg, "text"), tutti(svg, "rect"))) {
    for (const v of Object.values(e._attrs)) assert.ok(!String(v).includes("NaN"), `NaN in ${v}`);
  }
});

// R10: con la corsa stantia la curva è tutta rossa, e il passo corrente si distingue dal solo
// raggio — il colore non è più un canale libero (un solo rosso, `#b8321e`).
test("creaSrotolato: con la corsa stantia la curva è rossa e il raggio resta il canale del passo", () => {
  const contenitore = contenitoreFinto(400);
  const striscia = creaSrotolato(contenitore, { suPasso: () => {} });
  const curva = { punti: [{ k: 0, u: 0.5, V: 1.2 }, { k: 1, u: 1, V: 2.3 }], uMax: 1, vMax: 2.3, caduta: null };
  striscia.disegna({ risultati: { tipo: "pushover", vista: "deformata", caso: "pushover",
                                  passo: { k: 0, n: 2, u: 0.5, V: 1.2 }, curva, stantia: true },
                     modello: null, selezione: null });
  assert.equal(contenitore._figli[0].className, "titolo stantia");
  assert.ok(contenitore._figli[0].textContent.startsWith("stantia · "));
  const cerchi = tutti(contenitore._figli[1], "circle").filter((c) => c.getAttribute("class") === "passo");
  assert.deepEqual(cerchi.map((c) => c.getAttribute("fill")), ["#b8321e", "#b8321e"]);
  assert.ok(Number(cerchi[0].getAttribute("r")) > Number(cerchi[1].getAttribute("r")));
});

// --- fix round 1 ------------------------------------------------------------------

// Una seconda corsa sullo stesso modello (una sezione cambiata) ha gli stessi `valore` —
// `modo:1…42`, `pushover` — e testi tutti diversi: le frequenze sono altre e i passi sono
// meno. Con la chiave sui soli valori il menu restava quello di prima, in silenzio.
test("creaEsito: il menu si riscrive quando cambiano i testi, non solo i valori", () => {
  const { radice, el } = radiceFinta();
  const esito = creaEsito(radice, { suCambio: () => {} });
  esito.disegna({ risultati: conModiEPassi() });
  const prima = el("#risultati-caso")._figli;
  // stessi valori, stessi testi: non si tocca niente (il fuoco resta dov'è)
  esito.disegna({ risultati: conModiEPassi() });
  assert.equal(el("#risultati-caso")._figli, prima, "niente di cambiato: le opzioni restano");
  // stesso `modo:2`, frequenza nuova e un passo in meno
  const dopo = conModiEPassi();
  dopo.lavoro.fin.risultati.modi = [{ ...M2, f: 28.4 }];
  dopo.lavoro.fin.risultati.passi = [PASSI[0]];
  esito.disegna({ risultati: dopo });
  const testi = tutti(el("#risultati-caso"), "option").map((o) => o.textContent);
  assert.deepEqual(tutti(el("#risultati-caso"), "option").map((o) => o.value), ["Z1", "pushover", "modo:2"],
                   "gli stessi valori, sì");
  assert.ok(testi.includes("modo 2 · 28,4 Hz · ux 46 %"), `frequenza vecchia nel menu: ${testi}`);
  assert.ok(testi.includes("pushover · 1 passo"), `conteggio vecchio nel menu: ${testi}`);
});

// I due numeri accanto al passo corrente vanno dalla parte dove c'è spazio, e «dove sta il
// passo» si misura sui punti della curva: `passo.n` è il numero del passo del server (fino a
// 120), non il conteggio — leggendolo lì i testi finivano sempre a destra, fuori dalla striscia.
test("creaSrotolato: i valori del passo stanno dalla parte dove c'è spazio, misurata sui punti", () => {
  const punti = Array.from({ length: 120 }, (_, k) => ({ k, u: (k + 1) / 2, V: k }));
  const ancore = (k) => {
    const contenitore = contenitoreFinto(400);
    creaSrotolato(contenitore, {}).disegna({
      risultati: { tipo: "pushover", vista: "deformata", caso: "pushover",
                   passo: { k, n: k + 1, u: punti[k].u, V: punti[k].V },
                   curva: { punti, uMax: 60, vMax: 119, caduta: null }, stantia: false },
      modello: null, selezione: null });
    return tutti(contenitore._figli[1], "text")
      .filter((t) => t.textContent.startsWith("u ") || t.textContent.startsWith("V "))
      .map((t) => t.getAttribute("text-anchor"));
  };
  assert.deepEqual(ancore(100), ["end", "end"], "oltre la metà: i numeri a sinistra del punto");
  assert.deepEqual(ancore(10), ["start", "start"], "sotto la metà: a destra");
});

// L'`aria-label` del riquadro era fisso «M srotolato dell'asta selezionata» anche con la curva
// della pushover dentro: a voce la striscia prometteva una cosa e ne conteneva un'altra.
test("creaSrotolato: il riquadro dice a voce quel che porta davvero", () => {
  const contenitore = contenitoreFinto(400);
  const striscia = creaSrotolato(contenitore, {});
  const modello = { nodi: [{ id: 1, x: 0, z: 0 }, { id: 2, x: 6000, z: 0 }], aste: [{ id: 1, nodo_i: 1, nodo_j: 2 }] };
  striscia.disegna({ risultati: { tipo: "pushover", vista: "deformata", caso: "pushover",
                                  passo: { k: 0, n: 1, u: 0, V: 0 },
                                  curva: { punti: [{ k: 0, u: 0, V: 0 }], uMax: 0, vMax: 0, caduta: null },
                                  stantia: false }, modello, selezione: null });
  assert.equal(contenitore.getAttribute("aria-label"), "curva taglio–spostamento della pushover");
  striscia.disegna({ risultati: { tipo: "modo", vista: "deformata", caso: "modo:2", modo: M2, stantia: false },
                     modello, selezione: null });
  assert.equal(contenitore.getAttribute("aria-label"), "modo 2");
  const perCaso = { sollecitazioni: { 1: [{ x_rel: 0, My: 0 }, { x_rel: 1, My: 12e6 }] } };
  striscia.disegna({ risultati: { vista: "V", caso: "Z1", perCaso, stantia: false },
                     modello, selezione: { tipo: "asta", id: 1 } });
  assert.equal(contenitore.getAttribute("aria-label"), "V srotolato dell'asta selezionata");
});

// --- la 15b: lo srotolato e la curva della pushover tornano in aula ----------------

// `esito.js` legge le variabili CSS come `piano.js` e `spazio.js`: `getComputedStyle` del
// contenitore. Nel DOM finto la globale non c'è, e `leggiMisure` cade sui numeri d'oggi — che è
// esattamente il regime «fuori dalla presentazione». `null` lo lascia così com'è.
function conVariabili(variabili, azione) {
  const prima = globalThis.getComputedStyle;
  if (variabili) globalThis.getComputedStyle = () => ({ getPropertyValue: (n) => variabili[n] ?? "" });
  try { return azione(); } finally {
    if (prima === undefined) delete globalThis.getComputedStyle; else globalThis.getComputedStyle = prima;
  }
}

const AULA = { "--srotolato-alto": "160px", "--curva-alta": "240px", "--etichetta": "46px" };
const TRAVE = { nodi: [{ id: 1, x: 0, z: 0 }, { id: 2, x: 6000, z: 0 }], aste: [{ id: 1, nodo_i: 1, nodo_j: 2 }] };
const STAZIONI = { sollecitazioni: { 1: [{ x_rel: 0, My: 0 }, { x_rel: 0.5, My: 45e6 }, { x_rel: 1, My: -12e6 }] } };

const srotolatoCon = (variabili, larghezza = 800) => conVariabili(variabili, () => {
  const contenitore = contenitoreFinto(larghezza);
  creaSrotolato(contenitore).disegna({ risultati: { vista: "M", caso: "Z1", perCaso: STAZIONI, stantia: false },
                                       modello: TRAVE, selezione: { tipo: "asta", id: 1 } });
  return contenitore;
});
const svgDi = (c) => c._figli.find((f) => f.nome === "svg");
const testiDi = (c) => tutti(svgDi(c), "text");

test("creaSrotolato: fuori dall'aula 96 px e testi a 11; in aula 160 px e testi a 46", () => {
  const fuori = srotolatoCon(null);
  assert.equal(svgDi(fuori).getAttribute("height"), "96");
  assert.equal(testiDi(fuori)[0].getAttribute("font-size"), "11");
  const aula = srotolatoCon(AULA);
  assert.equal(svgDi(aula).getAttribute("height"), "160");
  assert.equal(testiDi(aula)[0].getAttribute("font-size"), "46");
});

// R9 — il vincolo dell'altezza non è la sovrapposizione dei due numeri (non si sovrappongono mai,
// a nessuna altezza: stanno ai due lati della linea di base) ma il **contenimento**. Ascesa e
// discesa del mono di sistema misurate in Chrome il 13/09 su un `<text>` SVG vero, con lo stesso
// `font-family` di `esito.js`: 43 e 11 px a un corpo di 46, 10 e 3 a un corpo di 11.
const ASCESA_46 = 43, DISCESA_46 = 11;

test("creaSrotolato in aula: i numeri dei picchi stanno dentro l'SVG — a 96 px uscirebbero", () => {
  const y = (c) => testiDi(c).map((t) => Number(t.getAttribute("y")));
  for (const yPicco of y(srotolatoCon(AULA))) {
    assert.ok(yPicco - ASCESA_46 >= 0, `il picco esce di sopra: ${yPicco - ASCESA_46} px`);
    assert.ok(yPicco + DISCESA_46 <= 160, `il picco esce di sotto: ${yPicco + DISCESA_46 - 160} px`);
  }
  // Il lato che discrimina: sono i 160 a contenerli, non i testi a stare buoni da sé. Con
  // l'altezza d'oggi e i testi d'aula il numero di sopra esce dal riquadro.
  const basso = Math.min(...y(srotolatoCon({ ...AULA, "--srotolato-alto": "96px" })));
  assert.ok(basso - ASCESA_46 < 0, `a 96 px il picco di sopra deve uscire, esce di ${ASCESA_46 - basso}`);
});

const CURVA = { punti: [{ k: 0, u: 0.5, V: 1.2 }, { k: 1, u: 1, V: 2.3 }], uMax: 1, vMax: 2.3,
                caduta: { k: 1, n: 2, u: 1, motivo: "non converge" } };
// I numeri veri del MURO 1: «72,12 kN» e «60 mm» sono i testi più lunghi che la banda sotto l'asse
// deve tenere, e sono quelli che il patto rischia di far toccare. Un fixture coi numeri piccoli
// direbbe di sì a un disegno che in aula si sovrappone.
const CURVA_MURO1 = { punti: [{ k: 0, u: 0.5, V: 11.05 }, { k: 119, u: 60, V: 70.93 }],
                      uMax: 60, vMax: 72.12, caduta: null };
// **1151 e non 400**: è la larghezza vera della striscia a 1920 in aula, misurata. Con un riquadro
// finto stretto i tre numeri della banda bassa si sovrappongono comunque, e un test che gira lì
// dentro passa verde su un disegno rotto — il patto dipende dalla larghezza, quindi la larghezza
// dev'essere quella vera.
const curvaCon = (variabili, larghezza = 1151, curva = CURVA, passo = { k: 1, n: 2, u: 1, V: 2.3 }) =>
  conVariabili(variabili, () => {
    const contenitore = contenitoreFinto(larghezza);
    creaSrotolato(contenitore, { suPasso: () => {} }).disegna({
      risultati: { tipo: "pushover", vista: "deformata", caso: "pushover",
                   passo, curva, stantia: false },
      modello: null, selezione: null });
    return contenitore;
  });

// La banda orizzontale che un testo occupa davvero, ancora compresa: le larghezze si stimano con
// `avanzamentoMono`, lo stesso attrezzo con cui `piano.js` stima gli ostacoli delle etichette.
const bandaDi = (t, carattere = 46) => {
  const x = Number(t.getAttribute("x")), w = t.textContent.length * avanzamentoMono(carattere);
  const ancora = t.getAttribute("text-anchor");
  return ancora === "end" ? [x - w, x] : ancora === "middle" ? [x - w / 2, x + w / 2] : [x, x + w];
};

// R10 — i due margini non sono lo stesso numero. Sulla curva, sotto l'asse, ci sta un numero: il
// margine deve tenerci dentro anche la sua discesa, e `M = carattere` non basta.
test("creaSrotolato con la pushover in aula: l'etichetta sotto l'asse resta dentro l'SVG; con `M = carattere` uscirebbe", () => {
  const sotto = (c) => tutti(c._figli[1], "text")
    .map((t) => Number(t.getAttribute("y"))).filter((y) => y > 240 / 2);
  const aula = sotto(curvaCon(AULA));
  assert.ok(aula.length > 0, "il test non è vuoto: sotto l'asse un'etichetta c'è");
  for (const y of aula) assert.ok(y + DISCESA_46 <= 240, `esce di sotto di ${y + DISCESA_46 - 240} px`);
  // Con `M = carattere` (il margine che il piano dava per unico) la stessa etichetta sta a
  // `H − 46 + 10·c/11` e con la sua discesa esce: è la misura che separa i due margini.
  const M = 46, yStretto = 240 - M + (10 * 46) / 11;
  assert.ok(yStretto + DISCESA_46 > 240, "con M = carattere l'etichetta uscirebbe: il margine della curva è più largo");
});

// «variabile CSS assente o 0 → ripiego ai numeri d'oggi, disegno identico al pixel»: non «quasi
// identico». Il confronto è su **tutti** gli attributi di **tutti** gli elementi dell'SVG.
test("creaSrotolato: senza variabili, con variabili vuote o a zero il disegno è identico al pixel", () => {
  const attributi = (c) => tutti(svgDi(c), "text").concat(tutti(svgDi(c), "line"), tutti(svgDi(c), "circle"),
                                                          tutti(svgDi(c), "polygon")).map((e) => ({ ...e._attrs }));
  const oggi = attributi(srotolatoCon(null));
  assert.deepEqual(attributi(srotolatoCon({})), oggi, "variabili assenti: i numeri d'oggi");
  assert.deepEqual(attributi(srotolatoCon({ "--srotolato-alto": "0px", "--etichetta": "0px" })), oggi, "a zero: i numeri d'oggi");
  assert.equal(svgDi(srotolatoCon({})).getAttribute("height"), "96");
});

// Lo stesso patto per la **curva**, che di scostamenti convertiti ne ha otto e alla scrivania era
// provata da tre asserzioni sparse. Oggi non c'è difetto perché `n · 11 / 11` è esatto in binario;
// il confronto totale è il ripiego che regge il giorno che uno di quegli otto cambia forma.
test("creaSrotolato: la curva senza variabili, con variabili vuote o a zero è identica al pixel", () => {
  const attributi = (c) => tutti(c._figli[1], "text").concat(tutti(c._figli[1], "line"), tutti(c._figli[1], "circle"),
                                                             tutti(c._figli[1], "polyline"), tutti(c._figli[1], "rect"))
    .map((e) => ({ ...e._attrs }));
  const oggi = attributi(curvaCon(null));
  assert.deepEqual(attributi(curvaCon({})), oggi, "variabili assenti: i numeri d'oggi");
  assert.deepEqual(attributi(curvaCon({ "--curva-alta": "0px", "--etichetta": "0px" })), oggi, "a zero: i numeri d'oggi");
  assert.equal(curvaCon({})._figli[1].getAttribute("height"), "96");
});

// La guardia dello zero vale anche in aula: i numeri nuovi sono più grandi, non più sicuri.
test("creaSrotolato in aula: una curva a un passo solo (uMax = vMax = 0) disegna gli assi senza NaN", () => {
  const contenitore = conVariabili(AULA, () => {
    const c = contenitoreFinto(400);
    creaSrotolato(c, { suPasso: () => {} }).disegna({
      risultati: { tipo: "pushover", vista: "deformata", caso: "pushover", passo: { k: 0, n: 1, u: 0, V: 0 },
                   curva: { punti: [{ k: 0, u: 0, V: 0 }], uMax: 0, vMax: 0, caduta: null }, stantia: false },
      modello: null, selezione: null });
    return c;
  });
  const svg = contenitore._figli[1];
  assert.equal(svg.getAttribute("height"), "240");
  const cerchi = tutti(svg, "circle").filter((c) => c.getAttribute("class") === "passo");
  assert.equal(cerchi.length, 1);
  // L'origine: `ML` e `H − M`, coi margini dell'aula — non `NaN`, e non i numeri di 11 px.
  assert.equal(Number(cerchi[0].getAttribute("cx")).toFixed(2), ((28 * 46) / 11).toFixed(2));
  for (const e of tutti(svg, "line").concat(tutti(svg, "text"), tutti(svg, "rect"), cerchi)) {
    for (const [k, v] of Object.entries(e._attrs)) assert.ok(!String(v).includes("NaN"), `NaN in ${k}=${v}`);
  }
});

// Fix round 1 — la curva ha un'altezza sua. Lo srotolato è un diagramma di servizio; la curva in
// pushover è *il* diagramma che si legge, e i suoi numeri stanno **dentro** l'area utile `H − 2M`.
test("creaSrotolato: la curva legge `--curva-alta`, non l'altezza dello srotolato", () => {
  const curva = curvaCon({ ...AULA, "--curva-alta": "280px" });
  assert.equal(curva._figli[1].getAttribute("height"), "280");
  // Lo srotolato non la segue: due variabili, due riquadri, due mestieri.
  assert.equal(svgDi(srotolatoCon({ ...AULA, "--curva-alta": "280px" })).getAttribute("height"), "160");
  // E fuori dall'aula la curva resta quella d'oggi, al pixel.
  assert.equal(curvaCon(null)._figli[1].getAttribute("height"), "96");
});

// Fix round 2 — in aula il taglio massimo esce dal grafico. Dentro è il posto dove passa la curva:
// misurati i rettangoli resi su 14 passi del MURO 1, dentro sono 8 scontri (passi 1, 3, 10, 15, 21)
// e sopra l'asse ancora 3 (10, 15, 21), perché il margine alto è già dove vanno le etichette del
// passo quando il taglio è alto e lo spostamento ancora piccolo. La banda sotto l'asse, al centro,
// è l'unica libera: «0» finisce a 105, lo spostamento massimo comincia a 954.
test("creaSrotolato: in aula il taglio massimo sta sotto l'asse e non tocca gli altri due numeri della banda", () => {
  const c = curvaCon(AULA, 1151, CURVA_MURO1, { k: 119, n: 120, u: 60, V: 70.93 });
  const testi = tutti(c._figli[1], "text");
  const H = 240, M = (14 * 46) / 11;
  const tagliomax = testi.find((t) => t.textContent === "72,12 kN");
  assert.ok(tagliomax, "il taglio massimo si scrive anche in aula");
  assert.equal(tagliomax.getAttribute("text-anchor"), "middle");
  // Sotto l'asse, non dentro il grafico: la linea dell'ascissa sta a `H − M`.
  assert.ok(Number(tagliomax.getAttribute("y")) > H - M,
            `sotto l'asse: y=${tagliomax.getAttribute("y")} contro l'asse a ${H - M}`);
  // **Il patto, non la formula.** Asserire `x === (ML + (W − M)) / 2` ricopia il calcolo: l'unico
  // numero che la farebbe cadere è la formula stessa, né la larghezza della striscia né la
  // lunghezza del numero — cioè nessuno dei due da cui il patto dipende davvero. Quel che conta è
  // che nella banda sotto l'asse i tre numeri non si tocchino.
  const [, destraZero] = bandaDi(testi.find((t) => t.textContent === "0"));
  const [sinistraSpostamento] = bandaDi(testi.find((t) => t.textContent === "60 mm"));
  const [sinistra, destra] = bandaDi(tagliomax);
  assert.ok(sinistra > destraZero,
            `il taglio massimo tocca lo zero: comincia a ${sinistra.toFixed(0)}, lo zero finisce a ${destraZero.toFixed(0)}`);
  assert.ok(destra < sinistraSpostamento,
            `il taglio massimo tocca lo spostamento massimo: finisce a ${destra.toFixed(0)}, l'altro comincia a ${sinistraSpostamento.toFixed(0)}`);
  // Alla scrivania non cambia un pixel: dentro il grafico, in alto a sinistra, ancorato a `start`.
  const scrivania = tutti(curvaCon(null, 1151, CURVA_MURO1)._figli[1], "text").find((t) => t.textContent === "72,12 kN");
  assert.equal(scrivania.getAttribute("text-anchor"), "start");
  assert.equal(Number(scrivania.getAttribute("y")), 14 + 10);
  assert.equal(Number(scrivania.getAttribute("x")), 28 + 2);
});
