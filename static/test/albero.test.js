import { test } from "node:test";
import assert from "node:assert/strict";
import { creaAlbero } from "../albero.js";
import { creaMateriale, creaSezione, creaNodo, creaAzione, aggiungiCarico, creaCombinazione } from "../comandi.js";
import { modelloVuoto } from "../modello.js";
import { daRisposta } from "../rilievo.js";

// Il DOM finto di `pannello.test.js`, con in più `dataset`, `style` e `closest`.
function elementoFinto() {
  const listeners = {};
  return {
    textContent: "", hidden: false, className: "", tabIndex: -1, dataset: {}, style: {},
    _figli: [], _attrs: {},
    setAttribute(k, v) { this._attrs[k] = String(v); },
    getAttribute(k) { return this._attrs[k]; },
    addEventListener(ev, fn) { (listeners[ev] ??= []).push(fn); },
    // `target` passato vince su `this`: i listener stanno sull'elenco (`albero.js:10,14`), ma
    // l'evento viene dalla voce, ed è la voce che `closest` deve trovare.
    dispatch(ev, dati = {}) {
      (listeners[ev] ?? []).forEach((fn) => fn({ target: this, preventDefault() {}, ...dati }));
    },
    append(...f) { this._figli.push(...f); },
    replaceChildren(...f) { this._figli = f; },
    // `closest("[data-tipo]")`: una riga «gruppo» non ha `data-tipo` e non si trova da sola.
    closest() { return this.dataset.tipo ? this : null; },
  };
}

globalThis.document = {
  createElement: () => elementoFinto(),
  createTextNode: (t) => ({ textContent: t }),
};

function alberoFinto() {
  const elenco = elementoFinto(), vuoto = elementoFinto(), scelte = [];
  const albero = creaAlbero(elenco, vuoto, { suSelezione: (t, id) => scelte.push([t, id]) });
  return { albero, elenco, vuoto, scelte };
}

// La fixture passa dai riduttori veri (`comandi.js`), non da voci ricopiate a mano: i nomi di
// default — «300 × 500» per la sezione, la classe per il materiale — sono quelli che l'utente
// leggerà davvero, e se là cambiano è qui che si vede.
function conSezione() {
  let m = creaMateriale(modelloVuoto(), { tipo: "calcestruzzo", classe: "C25/30" });
  m = creaMateriale(m, { tipo: "acciaio", classe: "B450C" });
  return creaSezione(m, { b: 300, h: 500, calcestruzzo: 1, acciaio: 2 });
}

const testi = (elenco) => elenco._figli.map((li) => li.textContent);

test("l'albero elenca sezioni e materiali con i loro gruppi, e i gruppi vuoti non compaiono", () => {
  const { albero, elenco, scelte } = alberoFinto();
  albero.disegna(conSezione(), {});
  const t = testi(elenco);
  assert.ok(t.includes("Sezioni") && t.includes("Materiali"), JSON.stringify(t));
  assert.ok(!t.includes("Nodi") && !t.includes("Aste"), "senza nodi né aste quei gruppi non ci sono");
  assert.ok(t.includes("300 × 500 · 0 aste"), JSON.stringify(t));
  assert.ok(t.includes("C25/30 · C25/30") && t.includes("B450C · B450C"), JSON.stringify(t));
  const voce = elenco._figli.find((li) => li.dataset.tipo === "sezione");
  elenco.dispatch("keydown", { key: "Enter", target: voce });
  assert.deepEqual(scelte, [["sezione", 1]]);
});

// P8, divulgazione progressiva (`docs/ricerca/07-ux-modellatore.md:149`): un indice di rami
// che non esistono è rumore per chi conosce il programma e una bugia per chi arriva dopo.
test("un modello con soli nodi porta «Nodi» e nessun gruppo «Sezioni» o «Materiali»", () => {
  const { albero, elenco } = alberoFinto();
  const m = modelloVuoto();
  m.nodi.push({ id: 1, nome: null, x: 0, y: 0, z: 0 });
  albero.disegna(m, {});
  const t = testi(elenco);
  assert.ok(t.includes("Nodi"), JSON.stringify(t));
  assert.ok(!t.includes("Sezioni") && !t.includes("Materiali"), JSON.stringify(t));
  assert.equal(elenco._figli.length, 2, "il gruppo e il suo nodo, niente altro");
});

// Mutante: il conteggio scritto zero fisso passerebbe l'ingresso degenere «0 aste».
// E il singolare è singolare: «1 asta», non «1 aste» (zero resta plurale, riga 56).
test("il conteggio delle aste della sezione è quello vero, non sempre zero", () => {
  const { albero, elenco } = alberoFinto();
  const m = conSezione();
  m.aste.push({ id: 1, nome: null, nodo_i: 1, nodo_j: 2, sezione: 1 },
               { id: 2, nome: null, nodo_i: 2, nodo_j: 3, sezione: null });
  albero.disegna(m, {});
  assert.ok(testi(elenco).includes("300 × 500 · 1 asta"), JSON.stringify(testi(elenco)));
});

test("«personalizzato» compare sul materiale che lo è, e su nessun altro", () => {
  const { albero, elenco } = alberoFinto();
  const m = conSezione();
  m.materiali[1].personalizzato = true;
  albero.disegna(m, {});
  const t = testi(elenco);
  assert.ok(t.includes("B450C · B450C · personalizzato"), JSON.stringify(t));
  assert.ok(t.includes("C25/30 · C25/30"), "quello non personalizzato non guadagna la parola");
});

test("il clic su una riga «gruppo» non seleziona niente: non ha data-tipo", () => {
  const { albero, elenco, scelte } = alberoFinto();
  albero.disegna(conSezione(), {});
  const gruppo = elenco._figli.find((li) => li.textContent === "Sezioni");
  assert.equal(gruppo.dataset.tipo, undefined);
  assert.equal(gruppo.tabIndex, -1, "un'intestazione non entra nel giro del tabulatore");
  assert.equal(gruppo.getAttribute("role"), "presentation");
  assert.equal(gruppo.className, "gruppo");
  elenco.dispatch("click", { target: gruppo });
  assert.deepEqual(scelte, []);
});

// Il rosso vuol dire attenzione e nient'altro (ticket #14): la selezione lo prende come
// **filetto**, con il segno accanto (doppio canale, WCAG 1.4.1); un'intestazione non è
// un'attenzione. Come inchiostro no: `--rosso` su `--fondo` è 4,28:1, sotto AA a 11px — la
// classe `scelto` porta la regola in `stile.css`, e `style.color` non si scrive più.
test("una sezione selezionata prende «▸» e la classe «scelto»; il suo gruppo non li prende", () => {
  const { albero, elenco } = alberoFinto();
  albero.disegna(conSezione(), { selezione: { tipo: "sezione", id: 1 } });
  const voce = elenco._figli.find((li) => li.dataset.tipo === "sezione");
  assert.equal(voce.textContent, "▸ 300 × 500 · 0 aste");
  assert.equal(voce.className, "numero scelto");
  assert.equal(voce.style.color, undefined, "il rosso fa il filetto, non l'inchiostro del testo");
  assert.equal(voce.getAttribute("aria-pressed"), "true");
  const gruppo = elenco._figli.find((li) => li.textContent === "Sezioni");
  assert.equal(gruppo.className, "gruppo");
  assert.equal(gruppo.style.color, undefined);
  assert.equal(gruppo.getAttribute("aria-pressed"), undefined);
});

test("una voce non selezionata resta «numero», senza la classe del filetto", () => {
  const { albero, elenco } = alberoFinto();
  albero.disegna(conSezione(), {});
  const voce = elenco._figli.find((li) => li.dataset.tipo === "sezione");
  assert.equal(voce.className, "numero");
});


// --- fix di fine ramo 11b: le dimensioni non si stampano due volte ---
// Il nome di default di una sezione **è** «b × h» (`comandi.js:creaSezione`): stamparlo e poi
// stampare le dimensioni dava «300 × 500 · 300 × 500 mm · 0 aste».

test("l'albero non ripete le dimensioni quando il nome è già «b × h»", () => {
  const { albero, elenco } = alberoFinto();
  const m = conSezione();
  albero.disegna(m, {});
  assert.ok(testi(elenco).includes("300 × 500 · 0 aste"), JSON.stringify(testi(elenco)));
});

test("con un nome suo la sezione porta anche le dimensioni", () => {
  const { albero, elenco } = alberoFinto();
  const m = conSezione();
  m.sezioni[0].nome = "colonna";
  m.aste.push({ id: 1, nome: null, nodo_i: 1, nodo_j: 2, sezione: 1 },
               { id: 2, nome: null, nodo_i: 2, nodo_j: 3, sezione: 1 });
  albero.disegna(m, {});
  assert.ok(testi(elenco).includes("colonna · 300 × 500 mm · 2 aste"), JSON.stringify(testi(elenco)));
});


// Solo Invio e Spazio attivano una voce (WCAG 2.1.1). `N` su una voce a fuoco deve arrivare
// al comando globale, non selezionare la voce sotto il cursore; le frecce muovono il fuoco,
// che è del browser. Un `keydown` che non guardasse `key` le prenderebbe tutte.
test("una lettera o una freccia su una voce a fuoco non chiama suSelezione", () => {
  const { albero, elenco, scelte } = alberoFinto();
  albero.disegna(conSezione(), {});
  const voce = elenco._figli.find((li) => li.dataset.tipo === "sezione");
  for (const key of ["n", "d", "r", "ArrowDown", "ArrowRight", "Escape", "Tab"]) {
    elenco.dispatch("keydown", { key, target: voce });
  }
  assert.deepEqual(scelte, []);
  elenco.dispatch("keydown", { key: " ", target: voce });
  assert.deepEqual(scelte, [["sezione", 1]], "Spazio invece attiva, come Invio");
});


// --- ramo 11c: i rami «Azioni» e «Combinazioni» ------------------------------------------

test("l'albero elenca azioni e combinazioni, con natura, categoria, conteggi al singolare e «generata»", () => {
  let m = creaNodo(modelloVuoto(), { x: 0, z: 0 });
  m = creaAzione(m, { nome: "spinta in testa", natura: "Q", categoria: "vento" });
  m = aggiungiCarico(m, { azione: 1, carico: { tipo: "nodale", nodo: 1, Fx: 20000 } });
  m = creaAzione(m, { nome: "peso proprio", natura: "G1" });
  m.azioni[1].generata = true;
  m = creaCombinazione(m, { nome: "SLU" });
  const { elenco, albero } = alberoFinto();
  albero.disegna(m);
  const t = testi(elenco);
  assert.ok(t.includes("Azioni"), JSON.stringify(t));
  assert.ok(t.includes("spinta in testa · Q vento · 1 carico"), JSON.stringify(t));
  assert.ok(t.includes("peso proprio · G1 · 0 carichi · generata"), JSON.stringify(t));
  assert.ok(t.includes("Combinazioni"), JSON.stringify(t));
  assert.ok(t.includes("SLU · senza tipo · 0 termini"), JSON.stringify(t));
});

test("senza azioni né combinazioni i due gruppi non compaiono", () => {
  const { elenco, albero } = alberoFinto();
  albero.disegna(creaNodo(modelloVuoto(), { x: 0, z: 0 }));
  const t = testi(elenco);
  assert.ok(!t.includes("Azioni") && !t.includes("Combinazioni"), JSON.stringify(t));
});

// Ingresso degenere: un'azione sola, nessuna combinazione — i due gruppi non vanno di pari
// passo, ognuno compare o no secondo il proprio conteggio (P8).
test("un'azione senza combinazioni: «Azioni» compare, «Combinazioni» no", () => {
  const m = creaAzione(modelloVuoto(), { nome: "peso proprio", natura: "G1" });
  const { elenco, albero } = alberoFinto();
  albero.disegna(m);
  const t = testi(elenco);
  assert.ok(t.includes("Azioni"), JSON.stringify(t));
  assert.ok(!t.includes("Combinazioni"), JSON.stringify(t));
});

// Ingresso degenere: il clic (non solo Invio/Spazio) su una voce azione chiama lo stesso
// listener delle altre voci — nessun codice nuovo in `albero.js`, ma qui lo si prova.
test("il clic su una voce azione chiama suSelezione(\"azione\", id)", () => {
  const m = creaAzione(modelloVuoto(), { nome: "peso proprio", natura: "G1" });
  const { elenco, albero, scelte } = alberoFinto();
  albero.disegna(m);
  const voce = elenco._figli.find((li) => li.dataset.tipo === "azione");
  elenco.dispatch("click", { target: voce });
  assert.deepEqual(scelte, [["azione", 1]]);
});

// Ingresso degenere: `categoria: null` (nessuna categoria) non lascia uno spazio doppio né
// la parola «null» nel testo.
test("azione con categoria null: niente spazio doppio né «null» nel testo", () => {
  let m = creaAzione(modelloVuoto(), { nome: "permanenti travi", natura: "G2" });
  m = aggiungiCarico(m, { azione: 1, carico: { tipo: "gravita" } });
  m = aggiungiCarico(m, { azione: 1, carico: { tipo: "gravita" } });
  const { elenco, albero } = alberoFinto();
  albero.disegna(m);
  const t = testi(elenco);
  assert.ok(t.includes("permanenti travi · G2 · 2 carichi"), JSON.stringify(t));
  assert.ok(!t.some((s) => s.includes("null")), JSON.stringify(t));
});

// Ingresso degenere: un tipo che `TIPI_COMBINAZIONE` conosce e `NOME_TIPO_COMBINAZIONE` no:
// la chiave grezza, non «undefined» — guardia contro la deriva fra le due costanti gemelle di
// `carichi.js`, non contro un file vecchio (un file così è respinto prima di arrivare qui).
test("un tipo che TIPI_COMBINAZIONE conosce e NOME_TIPO_COMBINAZIONE no: la chiave grezza, non «undefined»", () => {
  let m = creaCombinazione(modelloVuoto(), { nome: "SLU" });
  m.combinazioni[0].tipo = "eccezionale";
  const { elenco, albero } = alberoFinto();
  albero.disegna(m);
  assert.ok(testi(elenco).includes("SLU · eccezionale · 0 termini"), JSON.stringify(testi(elenco)));
});


// --- ramo 11d: il ramo «Rilievo» ----------------------------------------------------------

const rilievoVuoto = () => daRisposta({ scartate: [{ regione: 0, punti: 1, controllo: "x", valore: 1, soglia: 0.5, unita: "-", spiegazione: "" }], resoconto: { membrature: 0, aste: 0, nodi: 0, scartate: 8 } }, "lab/12_wall.json");

test("con un rilievo l'albero apre col ramo «Rilievo», anche a modello vuoto, e la voce si seleziona", () => {
  const { elenco, vuoto, albero, scelte } = alberoFinto();
  albero.disegna(modelloVuoto(), { rilievo: rilievoVuoto(), selezione: { tipo: "rilievo", id: 0 } });
  const t = testi(elenco);
  assert.equal(t[0], "Rilievo");
  assert.equal(t[1], "▸ 12_wall.json · nessuna membratura · 8 scartate");
  assert.equal(vuoto.hidden, true);
  assert.equal(elenco._figli[1].dataset.tipo, "rilievo");
  assert.equal(elenco._figli[1].className, "numero scelto");
  elenco.dispatch("click", { target: elenco._figli[1] });
  assert.deepEqual(scelte.at(-1), ["rilievo", 0]);
});

test("senza rilievo l'albero non ha il ramo", () => {
  const { elenco, albero } = alberoFinto();
  albero.disegna(creaNodo(modelloVuoto(), { x: 0, z: 0 }), {});
  assert.ok(!testi(elenco).includes("Rilievo"));
});

// Ingresso degenere: `resoconto: {}` (nessuna chiave) non è un errore, è zero membrature e
// zero scartate — `riassunto` (Task 1) già lo gestisce, qui si verifica solo che l'albero lo
// passi senza saltare in aria.
test("rilievo con resoconto vuoto: nessuna membratura, 0 scartate, nessuna eccezione", () => {
  const { elenco, albero } = alberoFinto();
  const rilievo = daRisposta({}, "x/y.json");
  assert.doesNotThrow(() => albero.disegna(modelloVuoto(), { rilievo }));
  assert.ok(testi(elenco).includes("y.json · nessuna membratura · 0 scartate"), JSON.stringify(testi(elenco)));
});

// Ingresso degenere: con un modello pieno il ramo «Rilievo» viene comunque prima di «Nodi», e
// i gruppi del modello non ne risentono.
test("con un rilievo e un modello pieno, «Rilievo» viene prima di «Nodi» e gli altri gruppi restano", () => {
  const { elenco, albero } = alberoFinto();
  const m = conSezione();
  m.nodi.push({ id: 1, nome: null, x: 0, y: 0, z: 0 });
  albero.disegna(m, { rilievo: rilievoVuoto() });
  const t = testi(elenco);
  assert.ok(t.includes("Rilievo"), JSON.stringify(t));
  assert.ok(t.indexOf("Rilievo") < t.indexOf("Nodi"), JSON.stringify(t));
  assert.ok(t.includes("Sezioni") && t.includes("Materiali"), JSON.stringify(t));
});
