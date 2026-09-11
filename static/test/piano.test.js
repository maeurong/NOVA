import { test } from "node:test";
import assert from "node:assert/strict";
import { versoLibero, estensione, creaPiano } from "../piano.js";
import { modelloVuoto } from "../modello.js";
import { creaNodo, estrudi, creaAzione, aggiungiCarico, impostaVincolo } from "../comandi.js";
import { siSovrappongono } from "../etichette.js";

const LATO_MINIMO = 2000;
const MARGINE = 0.12;
const conMargine = (lato) => lato + 2 * lato * MARGINE;

const m = (nodi, aste = []) => ({ nodi, aste });
const n = (id, x, z) => ({ id, x, y: 0, z });
const a = (id, i, j) => ({ id, nodo_i: i, nodo_j: j });

const angoloTra = (v1, v2) => Math.acos(Math.max(-1, Math.min(1, v1.x * v2.x + v1.z * v2.z)));
const unitario = (x, z) => { const l = Math.hypot(x, z); return { x: x / l, z: z / l }; };

test("versoLibero: nodo isolato prende il primo verso", () => {
  const nodo1 = n(1, 0, 0);
  const scelto = versoLibero(m([nodo1]), nodo1);
  assert.ok(Math.abs(scelto.x - Math.SQRT1_2) < 1e-9);
  assert.ok(Math.abs(scelto.z - Math.SQRT1_2) < 1e-9);
});

test("versoLibero: un'asta a 45° tiene il verso scelto ad almeno 45° da lei", () => {
  const nodo1 = n(1, 0, 0), nodo2 = n(2, 1000, 1000); // direzione esatta di VERSI[0]
  const modello = m([nodo1, nodo2], [a(1, 1, 2)]);
  const scelto = versoLibero(modello, nodo1);
  const direzioneAsta = unitario(1000, 1000);
  assert.ok(angoloTra(scelto, direzioneAsta) >= Math.PI / 4 - 1e-9,
    `atteso >=45°, trovato ${(angoloTra(scelto, direzioneAsta) * 180 / Math.PI).toFixed(1)}°`);
});

test("versoLibero: due aste ad angolo retto, il verso lontano da entrambe", () => {
  const nodo1 = n(1, 0, 0), nodo2 = n(2, 1000, 0), nodo3 = n(3, 0, 1000);
  const modello = m([nodo1, nodo2, nodo3], [a(1, 1, 2), a(2, 1, 3)]);
  const scelto = versoLibero(modello, nodo1);
  const dirX = { x: 1, z: 0 }, dirZ = { x: 0, z: 1 };
  assert.ok(angoloTra(scelto, dirX) >= Math.PI / 4 - 1e-9, "troppo vicino all'asta lungo x");
  assert.ok(angoloTra(scelto, dirZ) >= Math.PI / 4 - 1e-9, "troppo vicino all'asta lungo z");
});

test("versoLibero: nodo passante con due tratti opposti sceglie perpendicolare, mai lungo il tratto", () => {
  // Una media vettoriale delle due direzioni (1,0) e (-1,0) darebbe il vettore nullo:
  // qui il verso deve restare definito e perpendicolare al tratto, non lungo di esso.
  const nodo1 = n(1, 0, 0), nodo2 = n(2, -1000, 0), nodo3 = n(3, 1000, 0);
  const modello = m([nodo1, nodo2, nodo3], [a(1, 1, 2), a(2, 1, 3)]);
  const scelto = versoLibero(modello, nodo1);
  assert.ok(Math.abs(scelto.x) < 1e-9, `atteso perpendicolare al tratto (x≈0), trovato x=${scelto.x}`);
  assert.ok(Math.abs(scelto.z) > 0.99, "il verso deve avere componente z piena");
  // Qui su e qui giù pareggiano (entrambi a 90° dal tratto): a parità vince il **primo**
  // di `VERSI`, che è quello in alto. Senza questa riga il pareggio si può sciogliere al
  // contrario e l'etichetta cambia lato nelle geometrie simmetriche, coi test verdi.
  assert.ok(scelto.z > 0.99, "a parità di punteggio vince il primo verso, quello in alto");
});

test("versoLibero: tre aste convergenti non solleva e resta deterministico", () => {
  const nodo1 = n(1, 0, 0);
  const nodo2 = n(2, 1000, 0);
  const nodo3 = n(3, -500, 866);
  const nodo4 = n(4, -500, -866);
  const modello = m([nodo1, nodo2, nodo3, nodo4], [a(1, 1, 2), a(2, 1, 3), a(3, 1, 4)]);
  assert.doesNotThrow(() => versoLibero(modello, nodo1));
  const primo = versoLibero(modello, nodo1);
  const secondo = versoLibero(modello, nodo1);
  assert.deepEqual(primo, secondo, "stessa geometria, stesso verso");
});

test("estensione: modello vuoto dà il riquadro minimo centrato nell'origine", () => {
  const box = estensione(m([]));
  assert.equal(box.larghezza, LATO_MINIMO);
  assert.equal(box.altezza, LATO_MINIMO);
  assert.equal(box.x0, -LATO_MINIMO / 2);
  assert.equal(box.z0, -LATO_MINIMO / 2);
});

test("estensione: un nodo solo tiene il lato minimo, mai zero", () => {
  const box = estensione(m([n(1, 5000, 3000)]));
  assert.equal(box.larghezza, conMargine(LATO_MINIMO));
  assert.equal(box.altezza, conMargine(LATO_MINIMO));
  assert.ok(box.larghezza > 0 && box.altezza > 0);
  assert.ok(box.x0 <= 5000 && 5000 <= box.x0 + box.larghezza, "il nodo sta dentro il riquadro");
});

test("estensione: il ghost entra nell'inquadratura anche se punta fuori dal riquadro minimo", () => {
  const nodo1 = n(1, 0, 0);
  const senzaGhost = estensione(m([nodo1]));
  const conGhost = estensione(m([nodo1]), { da: 1, dx: 20000, dz: 0 });
  assert.ok(conGhost.larghezza > senzaGhost.larghezza, "la punta del ghost allarga il riquadro");
  assert.ok(conGhost.x0 <= 20000 && 20000 <= conGhost.x0 + conGhost.larghezza, "la punta del ghost sta dentro");
});

// Mutante 2 del brief (giornata 11c, C1): `estensione` ignora il punto in anteprima e
// l'inquadratura non si allarga — si digitano coordinate fuori vista e non si vede niente,
// che è il difetto che il campo di comando doveva chiudere.
test("estensione: il punto in anteprima entra nell'inquadratura come la punta del ghost", () => {
  const nodo1 = n(1, 0, 0);
  const senza = estensione(m([nodo1]));
  const con = estensione(m([nodo1]), { punto: { x: 20000, z: -8000 } });
  assert.ok(con.larghezza > senza.larghezza, "il punto in anteprima allarga il riquadro");
  assert.ok(con.x0 <= 20000 && 20000 <= con.x0 + con.larghezza, "il punto sta dentro in x");
  assert.ok(con.z0 <= -8000 && -8000 <= con.z0 + con.altezza, "il punto sta dentro in z");
});

test("estensione: il punto in anteprima non ha bisogno di un nodo di partenza", () => {
  const box = estensione(m([]), { punto: { x: 5000, z: 5000 } });
  assert.ok(box.x0 <= 5000 && 5000 <= box.x0 + box.larghezza);
  assert.ok(box.z0 <= 5000 && 5000 <= box.z0 + box.altezza);
});

// --- creaPiano: il contratto di presenza del ghost (11c/F) ---------------------
// `creaPiano` non aveva **nessun** test: si poteva spegnere il ramo che disegna l'anteprima e
// i 277 test restavano verdi, mentre in pagina si premeva `N`, si scrivevano le coordinate e
// non compariva niente. Stesso finto DOM di `pannello.test.js` e `storia.test.js`, con
// `createElementNS` invece di `createElement` perché qui gli elementi sono SVG.

function elementoSvgFinto(nome) {
  return {
    nome, textContent: "", _figli: [], _attrs: {},
    setAttribute(k, v) { this._attrs[k] = String(v); },
    getAttribute(k) { return this._attrs[k]; },
    addEventListener() {},
    append(...figli) { this._figli.push(...figli); },
    replaceChildren(...figli) { this._figli = figli; },
  };
}

// `createElement` per il solo `<p class="carichi-titolo">`: il titolo dei carichi è testo del
// documento, non un `<text>` nel `viewBox` (fix di fine ramo, A1).
globalThis.document = {
  createElementNS: (_ns, nome) => elementoSvgFinto(nome),
  // `style` c'è perché un `<p>` vero ce l'ha: `piano.js` scrive `legenda.style.top` per farla
  // scendere sotto un badge andato a capo. `offsetHeight` invece **non** c'è, ed è giusto così —
  // qui non c'è layout, e il codice ha i suoi ripieghi (14 px per il badge, 28 per la legenda).
  createElement: (nome) => ({ ...elementoSvgFinto(nome), className: "", hidden: false, style: {} }),
};

const contenitoreFinto = () => ({
  clientWidth: 800, clientHeight: 600, _figli: [],
  replaceChildren(...figli) { this._figli = figli; },
});

// Tutti i discendenti con quel nome di tag, a qualunque profondità: il disegno annida
// `svg → g → g(nodo) → circle`, e il livello esatto non è ciò che questi test difendono.
function tutti(radice, nome) {
  const trovati = radice.nome === nome ? [radice] : [];
  for (const f of radice._figli ?? []) trovati.push(...tutti(f, nome));
  return trovati;
}

// L'anteprima è l'unico cerchio **vuoto**: i nodi posati sono pieni. È il doppio canale che
// dice «c'è, ma non ancora», ed è anche il modo di riconoscerla da qui.
const anteprime = (svg) => tutti(svg, "circle").filter((c) => c.getAttribute("fill") === "none");

function pianoFinto() {
  const contenitore = contenitoreFinto();
  const piano = creaPiano(contenitore, { suSelezione: () => {}, suSfondo: () => {} });
  return { piano, svg: contenitore._figli[0], titolo: contenitore._figli[1] };
}

test("creaPiano: un ghost con punto disegna il cerchio dell'anteprima, tratteggiato e vuoto", () => {
  const { piano, svg } = pianoFinto();
  piano.disegna(m([n(1, 0, 0)]), { ghost: { punto: { x: 3000, z: 1500 } } });
  const cerchi = anteprime(svg);
  assert.equal(cerchi.length, 1, "premuto N e scritte le coordinate, l'anteprima deve comparire");
  assert.ok(cerchi[0].getAttribute("stroke-dasharray"), "l'anteprima è tratteggiata: c'è ma non ancora");
});

test("creaPiano: l'anteprima porta scritte le coordinate che si stanno digitando", () => {
  const { piano, svg } = pianoFinto();
  piano.disegna(m([]), { ghost: { punto: { x: 12500, z: -3000 } } });
  const etichette = tutti(svg, "text").map((t) => t.textContent);
  assert.ok(etichette.some((t) => t.includes("12") && t.includes("500") && t.includes("3")),
    `nessuna etichetta con le coordinate del punto: ${JSON.stringify(etichette)}`);
});

// --- ingresso degenere: un ghost senza `punto` ---------------------------------

test("creaPiano: senza punto nessun cerchio d'anteprima, e il resto del piano resta intatto", () => {
  const { piano, svg } = pianoFinto();
  piano.disegna(m([n(1, 0, 0), n(2, 3000, 0)], [a(1, 1, 2)]), { ghost: null });
  assert.equal(anteprime(svg).length, 0, "senza punto non si disegna nessuna anteprima");
  assert.equal(tutti(svg, "circle").length, 2, "i due nodi restano disegnati");
  assert.equal(tutti(svg, "line").length, 1, "l'asta resta disegnata");
});

test("creaPiano: il ghost dell'estrusione è una riga, non il cerchio dell'anteprima", () => {
  const { piano, svg } = pianoFinto();
  piano.disegna(m([n(1, 0, 0)]), { ghost: { da: 1, dx: 3000, dz: 0 } });
  assert.equal(anteprime(svg).length, 0);
  assert.equal(tutti(svg, "line").length, 1, "la riga tratteggiata dell'estrusione");
});

test("creaPiano: modello vuoto e nessun ghost non sollevano e non disegnano niente", () => {
  const { piano, svg } = pianoFinto();
  assert.doesNotThrow(() => piano.disegna(m([])));
  assert.equal(tutti(svg, "circle").length, 0);
  assert.equal(tutti(svg, "line").length, 0);
});

// --- i carichi dell'azione in vista (11c/task 6) -------------------------------
// Una freccia è un'annotazione, non una misura del modello: se entrasse in `estensione` il
// riquadro salterebbe a ogni carico aggiunto, e il telaio si rimpicciolirebbe da sé. Il
// confronto del `viewBox` prima e dopo è la difesa di quella proprietà.

const linee = (svg) => tutti(svg, "line").filter((l) => l.getAttribute("class") === "carico");
// Dentro l'SVG di titoli non ce ne deve essere **nessuno**: si scalavano coi millimetri e
// finivano addosso all'etichetta del primo nodo. Il titolo è il `<p>` accanto all'SVG.
const titoliNellSvg = (svg) => tutti(svg, "text").filter((t) => t.getAttribute("class") === "carichi-titolo");
const scritte = (svg) => JSON.stringify(tutti(svg, "text").map((t) => t.textContent));
// L'ordine dei figli **è** l'ordine del disegno: in SVG non c'è z-index, chi viene dopo sta sopra.
const inOrdine = (radice) => [radice, ...(radice._figli ?? []).flatMap(inOrdine)];

test("creaPiano: l'azione in vista disegna le frecce e il titolo, senza toccare il riquadro", () => {
  const { piano, svg, titolo } = pianoFinto();
  let modello = estrudi(creaNodo(modelloVuoto(), { x: 0, z: 0 }), { da: 1, dx: 5000, dz: 0 });
  modello = creaAzione(modello, { nome: "permanenti travi", natura: "G2" });
  modello = aggiungiCarico(modello, { azione: 1, carico: { tipo: "distribuito", asta: 1, q: -12.5 } });
  piano.disegna(modello, {});
  const riquadro = svg.getAttribute("viewBox");
  assert.equal(linee(svg).length, 0, "senza azione in vista nessuna freccia");
  assert.equal(titolo.hidden, true, "senza azione in vista il titolo è nascosto");
  assert.equal(titolo.textContent, "", "senza azione in vista il titolo è vuoto");
  piano.disegna(modello, { azioneInVista: modello.azioni[0] });
  assert.equal(linee(svg).length, 3, "un distribuito porta tre frecce: a un quarto, a metà, a tre quarti");
  assert.equal(svg.getAttribute("viewBox"), riquadro, "il riquadro non si muove quando compare un carico");
  assert.equal(titolo.textContent, "carichi: permanenti travi");
  assert.equal(titolo.hidden, false);
  assert.equal(titoliNellSvg(svg).length, 0, "il titolo non sta più dentro l'SVG");
});

test("creaPiano: la sola gravità non ha frecce ma sta nel titolo", () => {
  const { piano, svg, titolo } = pianoFinto();
  let modello = creaAzione(creaNodo(modelloVuoto(), { x: 0, z: 0 }), { nome: "peso proprio", natura: "G1" });
  modello = aggiungiCarico(modello, { azione: 1, carico: { tipo: "gravita", fattore_z: -1 } });
  piano.disegna(modello, { azioneInVista: modello.azioni[0] });
  assert.equal(linee(svg).length, 0, "la gravità non ha una geometria da disegnare");
  assert.match(titolo.textContent, /carichi: peso proprio · g z ×−1/, "la gravità deve dirsi nel titolo");
});

// --- ingressi degeneri: riferimenti spariti ------------------------------------
// I comandi rifiutano un carico su un nodo che non c'è (`comandi.js:433`), ma un modello letto
// da file può portarne uno: l'azione arriva a `disegna` com'è, e queste sono scritte a mano.

test("creaPiano: un nodale su un nodo sparito non si disegna, il resto sì", () => {
  const { piano, svg } = pianoFinto();
  const modello = estrudi(creaNodo(modelloVuoto(), { x: 0, z: 0 }), { da: 1, dx: 5000, dz: 0 });
  const azione = { id: 1, nome: "misti", natura: "G2", categoria: null, generata: false, carichi: [
    { tipo: "nodale", nodo: 99, Fx: 0, Fy: 0, Fz: -10000, Mx: 0, My: 0, Mz: 0 },
    { tipo: "distribuito", asta: 1, q: -12.5, direzione: "z" },
  ] };
  piano.disegna(modello, { azioneInVista: azione });
  assert.equal(linee(svg).length, 3, "restano le tre frecce del distribuito, nessuna per il nodo sparito");
  assert.equal(tutti(svg, "circle").length, 2, "i due nodi restano disegnati");
});

test("creaPiano: un'azione i cui carichi puntano tutti nel vuoto tiene comunque il titolo", () => {
  const { piano, svg, titolo } = pianoFinto();
  const modello = estrudi(creaNodo(modelloVuoto(), { x: 0, z: 0 }), { da: 1, dx: 5000, dz: 0 });
  const azione = { id: 1, nome: "residui", natura: "G2", categoria: null, generata: false, carichi: [
    { tipo: "nodale", nodo: 99, Fx: 0, Fy: 0, Fz: -10000, Mx: 0, My: 0, Mz: 0 },
    { tipo: "distribuito", asta: 42, q: -12.5, direzione: "z" },
  ] };
  piano.disegna(modello, { azioneInVista: azione });
  assert.equal(linee(svg).length, 0, "nessun carico ha una geometria a cui appendersi");
  assert.equal(titolo.textContent, "carichi: residui", "l'azione esiste, e il titolo lo dice");
  assert.equal(titolo.hidden, false);
});

// Fuori dall'SVG il titolo non ha più coordinate da sbagliare: sta in alto a sinistra di
// `#piano` in px costanti, qualunque sia il riquadro. Quel che resta da difendere è che
// nell'SVG non ne rientri uno di nascosto.
test("creaPiano: un'azione su un modello senza nodi porta il titolo fuori dall'SVG", () => {
  const { piano, svg, titolo } = pianoFinto();
  const azione = { id: 1, nome: "vuota", natura: "Q", categoria: "vento", generata: false, carichi: [] };
  assert.doesNotThrow(() => piano.disegna(modelloVuoto(), { azioneInVista: azione }));
  assert.equal(titolo.textContent, "carichi: vuota");
  assert.equal(titolo.className, "carichi-titolo");
  assert.equal(titoliNellSvg(svg).length, 0, `nessun titolo dentro l'SVG: ${scritte(svg)}`);
});

// Ingresso degenere: `disegna(m, {})`, cioè nessuna azione in vista.
test("creaPiano: senza azione il titolo è vuoto e nascosto, e nell'SVG non ce n'è nessuno", () => {
  const { piano, svg, titolo } = pianoFinto();
  piano.disegna(modelloVuoto(), {});
  assert.equal(titolo.textContent, "");
  assert.equal(titolo.hidden, true);
  assert.equal(titoliNellSvg(svg).length, 0);
});

// --- ingressi degeneri del giro di correzione (fix round 1) --------------------

test("creaPiano: un'azione senza la chiave carichi non solleva, e il titolo non parla di gravità", () => {
  const { piano, titolo } = pianoFinto();
  const azione = { id: 1, nome: "monca", natura: "G2", categoria: null, generata: false };
  assert.doesNotThrow(() => piano.disegna(modelloVuoto(), { azioneInVista: azione }));
  assert.equal(titolo.textContent, "carichi: monca", "senza carichi non c'è gravità da dire");
});

// La punta del nodale finisce esattamente sul centro del nodo (`frecceDeiCarichi`: `a` è il nodo),
// e il cerchio del nodo è pieno: se si disegnasse dopo, se la mangerebbe.
test("creaPiano: la freccia di un nodale si disegna sopra il cerchio del nodo", () => {
  const { piano, svg } = pianoFinto();
  const modello = creaNodo(modelloVuoto(), { x: 0, z: 0 });
  const azione = { id: 1, nome: "vento", natura: "Q", categoria: "vento", generata: false, carichi: [
    { tipo: "nodale", nodo: 1, Fx: 20000, Fy: 0, Fz: 0, Mx: 0, My: 0, Mz: 0 },
  ] };
  piano.disegna(modello, { azioneInVista: azione });
  const ordine = inOrdine(svg);
  const freccia = linee(svg).at(-1);
  const cerchio = tutti(svg, "circle").filter((c) => c.getAttribute("fill") !== "none").at(-1);
  assert.ok(freccia && cerchio, "servono una freccia e il cerchio del nodo");
  assert.ok(ordine.indexOf(freccia) > ordine.indexOf(cerchio),
    "la freccia deve venire dopo il cerchio del nodo, o il cerchio la copre");
});

// --- i simboli dei vincoli (11d/task 4) ---------------------------------------
// Il triangolo del disegno tecnico sotto il nodo: pieno se il vincolo è dichiarato,
// tratteggiato se è una proposta del rilievo. Doppio canale con l'ispettore, che la
// parola la scrive (`docs/ricerca/07-ux-modellatore.md:154`); il tratteggio da solo
// direbbe soltanto «diverso», non «proposto».

const INCASTRO = { ux: true, uy: true, uz: true, rx: true, ry: true, rz: true };
const LIBERO = { ux: false, uy: false, uz: false, rx: false, ry: false, rz: false };
const simboli = (svg, classe) => tutti(svg, "line").filter((l) => l.getAttribute("class") === classe);

test("creaPiano: un vincolo dichiarato è pieno, una proposta è tratteggiata, il libero dichiarato non si disegna", () => {
  const { piano, svg } = pianoFinto();
  let modello = estrudi(creaNodo(modelloVuoto(), { x: 0, z: 0 }), { da: 1, dx: 0, dz: 3000 });
  modello = impostaVincolo(modello, { id: 1, vincolo: INCASTRO });
  piano.disegna(modello, {});
  assert.equal(simboli(svg, "vincolo").length, 6, "l'incastro è il triangolo più i tre tratti di terra");
  assert.equal(simboli(svg, "vincolo-proposto").length, 0, "senza proposte niente tratteggio");
  const riquadro = svg.getAttribute("viewBox");
  piano.disegna(modello, { proposte: [{ nodo: 2, vincolo: INCASTRO }, { nodo: 9, vincolo: INCASTRO }] });
  const proposti = simboli(svg, "vincolo-proposto");
  assert.ok(proposti.length === 6 && proposti.every((l) => l.getAttribute("stroke-dasharray")),
    "la proposta è un ghost: tratteggiata, e sul nodo 9 che non esiste non si disegna niente");
  assert.equal(svg.getAttribute("viewBox"), riquadro, "il riquadro non si muove quando compare una proposta");
  modello = impostaVincolo(modello, { id: 1, vincolo: LIBERO });
  piano.disegna(modello, {});
  assert.equal(simboli(svg, "vincolo").length, 0, "il libero dichiarato non ha niente da disegnare");
});

test("creaPiano: una proposta su un nodo già vincolato disegna solo il pieno", () => {
  const { piano, svg } = pianoFinto();
  const modello = impostaVincolo(creaNodo(modelloVuoto(), { x: 0, z: 0 }), { id: 1, vincolo: INCASTRO });
  piano.disegna(modello, { proposte: [{ nodo: 1, vincolo: INCASTRO }] });
  assert.equal(simboli(svg, "vincolo-proposto").length, 0, "il pieno vince: la proposta è già decisa");
});

// Ingresso degenere: nessun vincolo dichiarato e nessuna proposta.
test("creaPiano: un nodo senza vincolo non porta nessun simbolo", () => {
  const { piano, svg } = pianoFinto();
  piano.disegna(creaNodo(modelloVuoto(), { x: 0, z: 0 }), {});
  assert.equal(simboli(svg, "vincolo").length, 0);
  assert.equal(simboli(svg, "vincolo-proposto").length, 0);
});

// I tratti di «terra» sono dell'incastro, non di ogni vincolo: un solo grado bloccato è
// il triangolo nudo, tre linee. E il simbolo viene dopo il nodo, o il cerchio pieno del
// nodo si mangerebbe il vertice.
test("creaPiano: un vincolo che non è un incastro è il triangolo nudo, dopo il nodo", () => {
  const { piano, svg } = pianoFinto();
  const modello = impostaVincolo(creaNodo(modelloVuoto(), { x: 0, z: 0 }), { id: 1, vincolo: { ...LIBERO, uz: true } });
  piano.disegna(modello, {});
  const tratti = simboli(svg, "vincolo");
  assert.equal(tratti.length, 3, "base e due obliqui, nessun tratto di terra");
  const ordine = inOrdine(svg);
  const cerchio = tutti(svg, "circle").at(-1);
  assert.ok(ordine.indexOf(tratti[0]) > ordine.indexOf(cerchio), "il simbolo si disegna dopo il nodo");
});

// Ingresso degenere: il chiamante che non conosce ancora `proposte`.
test("creaPiano: senza il parametro proposte non si solleva e non si tratteggia niente", () => {
  const { piano, svg } = pianoFinto();
  const modello = impostaVincolo(creaNodo(modelloVuoto(), { x: 0, z: 0 }), { id: 1, vincolo: INCASTRO });
  assert.doesNotThrow(() => piano.disegna(modello));
  assert.doesNotThrow(() => piano.disegna(modello, { proposte: undefined }));
  assert.doesNotThrow(() => piano.disegna(modello, { proposte: null }), "null non prende il default del parametro");
  assert.equal(simboli(svg, "vincolo-proposto").length, 0);
});

// Visto sul caso studio: il «piede sx» finiva sulla base del triangolo. Con due aste a destra e
// in alto, il verso libero sarebbe il basso — ma lì sta il simbolo del vincolo.
test("creaPiano: l'etichetta di un nodo con simbolo di vincolo non va in basso", () => {
  const m = { nodi: [{ id: 1, x: 0, z: 0 }, { id: 2, x: 1000, z: 0 }, { id: 3, x: 0, z: 1000 }],
              aste: [{ id: 1, nodo_i: 1, nodo_j: 2 }, { id: 2, nodo_i: 1, nodo_j: 3 }] };
  const n = m.nodi[0];
  assert.ok(versoLibero(m, n).z < 0, "senza simbolo il basso è il verso libero");
  const v = versoLibero(m, n, [{ x: 0, z: -1 }]);
  assert.ok(v.z >= 0, `con il simbolo sotto l'etichetta sale: ${JSON.stringify(v)}`);
  const { piano, svg } = pianoFinto();
  const modello = impostaVincolo(estrudi(creaNodo(modelloVuoto(), { x: 0, z: 0 }), { da: 1, dx: 0, dz: 3000 }),
                                 { id: 1, vincolo: INCASTRO });
  piano.disegna(modello, {});
  const [c1] = tutti(svg, "circle");
  const t1 = tutti(svg, "text").find((t) => t.textContent === "1");
  assert.ok(Number(t1.getAttribute("y")) <= Number(c1.getAttribute("cy")), "l'etichetta del piede non sta sotto il nodo");
  piano.disegna(estrudi(creaNodo(modelloVuoto(), { x: 0, z: 0 }), { da: 1, dx: 0, dz: 3000 }),
                { proposte: [{ nodo: 1, vincolo: INCASTRO }] });
  const t2 = tutti(svg, "text").find((t) => t.textContent === "1");
  assert.ok(Number(t2.getAttribute("y")) <= Number(tutti(svg, "circle")[0].getAttribute("cy")), "vale anche per la proposta");
});

// --- lo strato dei risultati (giornata 13) ---------------------------------------
const traveR = (() => { let mo = modelloVuoto(); mo = creaNodo(mo, { x: 0, z: 0 }); mo = creaNodo(mo, { x: 6000, z: 0 });
  return { ...mo, aste: [{ id: 1, nodo_i: 1, nodo_j: 2 }] }; })();
const XI = [0, 0.1726731646, 0.5, 0.8273268354, 1];
const xRel = [...XI.map((x) => x / 2), ...XI.slice(1).map((x) => 0.5 + x / 2)];
const stazioniR = xRel.map((r) => ({ x_rel: r, N: 0, Vy: 0, Vz: 10 * (3000 - r * 6000), T: 0, My: 10 * r * 6000 * (6000 - r * 6000) / 2, Mz: 0 }));
const Z1R = { spostamenti: { 1: [0, 0, 0, 0, 0.004, 0], 2: [0, 0, 0, 0, -0.004, 0] }, reazioni: { 1: [0, 0, 30000, 0, 0, 0], 2: [0, 0, 30000, 0, 0, 0] }, sollecitazioni: { 1: stazioniR } };
const conRisultati = (vista, extra = {}) => ({ vista, caso: "Z1", perCaso: Z1R, scala: 100, auto: true, stantia: false, ...extra });
const strato = (svg) => tutti(svg, "g").find((g) => g.getAttribute("class") === "risultati");
const badgeDi = (contenitore) => contenitore._figli[2];

test("piano con vista M: un poligono tratteggiato, nove ordinate di stazione, l'etichetta «45 kN·m» al picco", () => {
  const contenitore = contenitoreFinto();
  const piano = creaPiano(contenitore, { suSelezione: () => {}, suSfondo: () => {} });
  piano.disegna(traveR, { risultati: conRisultati("M") });
  const svg = contenitore._figli[0];
  const g = strato(svg);
  assert.ok(g, "lo strato «risultati» c'è");
  const poligoni = tutti(g, "polygon");
  assert.equal(poligoni.length, 1);
  assert.ok(poligoni[0].getAttribute("stroke-dasharray"), "inchiostro tratteggiato (story 63)");
  assert.equal(poligoni[0].getAttribute("stroke"), "#141414");
  assert.equal(tutti(g, "line").filter((l) => l.getAttribute("class") === "stazione").length, 9);
  const testi = tutti(g, "text").map((t) => t.textContent);
  assert.ok(testi.includes("45 kN·m"), `il picco è scritto: ${testi}`);
  const badge = badgeDi(contenitore);
  assert.equal(badge.hidden, false);
  assert.equal(badge.textContent, "M · Z1 · kN·m · lato teso");
});

test("piano con vista M: il picco sta sotto la trave (lato teso), l'etichetta non tocca le etichette dei nodi", () => {
  const contenitore = contenitoreFinto();
  const piano = creaPiano(contenitore, { suSelezione: () => {}, suSfondo: () => {} });
  piano.disegna(traveR, { risultati: conRisultati("M") });
  const svg = contenitore._figli[0];
  const [poligono] = tutti(strato(svg), "polygon");
  const punti = poligono.getAttribute("points").split(" ").map((p) => p.split(",").map(Number));
  const yBase = punti[0][1];
  assert.ok(punti.some(([, y]) => y > yBase + 1), "in SVG y cresce in basso: il diagramma sta sotto");
  // Nessun `<text>` dello strato dei risultati ha lo stesso x e y di un'etichetta di nodo.
  const nodi = tutti(svg, "g").filter((g) => g.getAttribute("data-tipo") === "nodo").flatMap((g) => tutti(g, "text"));
  for (const t of tutti(strato(svg), "text")) for (const n of nodi) {
    assert.ok(t.getAttribute("x") !== n.getAttribute("x") || t.getAttribute("y") !== n.getAttribute("y"));
  }
});

test("piano con vista deformata: una polilinea tratteggiata per asta, le aste diventano ombra, il badge stampa la scala", () => {
  const contenitore = contenitoreFinto();
  const piano = creaPiano(contenitore, { suSelezione: () => {}, suSfondo: () => {} });
  piano.disegna(traveR, { risultati: conRisultati("deformata", { scala: 120, auto: true }) });
  const svg = contenitore._figli[0];
  const polilinee = tutti(strato(svg), "polyline");
  assert.equal(polilinee.length, 1);
  assert.ok(polilinee[0].getAttribute("stroke-dasharray"));
  const punti = polilinee[0].getAttribute("points").split(" ");
  assert.equal(punti.length, 9, "otto segmenti di Hermite");
  const aste = tutti(svg, "line").filter((l) => l.getAttribute("data-tipo") === "asta");
  assert.equal(aste[0].getAttribute("stroke-opacity"), "0.3", "l'indeformata è l'ombra");
  assert.equal(badgeDi(contenitore).textContent, "deformata · Z1 · ×120 (auto)");
  piano.disegna(traveR, { risultati: conRisultati("deformata", { scala: 50, auto: false }) });
  assert.equal(badgeDi(contenitore).textContent, "deformata · Z1 · ×50 (a mano)");
});

test("piano stantio: strato e badge in rosso, la parola «stantia» nel badge", () => {
  const contenitore = contenitoreFinto();
  const piano = creaPiano(contenitore, { suSelezione: () => {}, suSfondo: () => {} });
  piano.disegna(traveR, { risultati: conRisultati("V", { stantia: true }) });
  const svg = contenitore._figli[0];
  const [poligono] = tutti(strato(svg), "polygon");
  assert.equal(poligono.getAttribute("stroke"), "#b8321e");
  const badge = badgeDi(contenitore);
  assert.ok(badge.textContent.startsWith("stantia · V · Z1"));
  assert.equal(badge.className, "risultati-badge stantia");
});

test("piano senza risultati o con vista nulla: nessuno strato, badge nascosto, aste piene", () => {
  const contenitore = contenitoreFinto();
  const piano = creaPiano(contenitore, { suSelezione: () => {}, suSfondo: () => {} });
  piano.disegna(traveR, { risultati: null });
  assert.equal(strato(contenitore._figli[0]), undefined);
  assert.equal(badgeDi(contenitore).hidden, true);
  piano.disegna(traveR, { risultati: conRisultati(null) });
  assert.equal(strato(contenitore._figli[0]), undefined);
  piano.disegna(traveR, {});
  const aste = tutti(contenitore._figli[0], "line").filter((l) => l.getAttribute("data-tipo") === "asta");
  assert.equal(aste[0].getAttribute("stroke-opacity"), undefined);
});

test("piano con vista M: lo strato sta fra le aste e i nodi, non sopra i nodi", () => {
  // Il DOM finto tiene i figli in ordine, quindi l'ordine di disegno **è** verificabile: senza
  // questo test spostare `gruppo.append(g)` dopo il ciclo dei nodi resta verde, e in pagina il
  // diagramma copre i cerchi cliccabili. (Il mutante che il piano dava per non uccidibile, R5.)
  const contenitore = contenitoreFinto();
  const piano = creaPiano(contenitore, { suSelezione: () => {}, suSfondo: () => {} });
  piano.disegna(traveR, { risultati: conRisultati("M") });
  const figli = contenitore._figli[0]._figli[0]._figli;   // svg → gruppo → i figli, in ordine
  const tipi = figli.map((f) => f.getAttribute?.("data-tipo"));
  const iStrato = figli.findIndex((f) => f.getAttribute?.("class") === "risultati");
  assert.ok(iStrato > tipi.lastIndexOf("asta"), `strato ${iStrato} dopo l'ultima asta ${tipi.lastIndexOf("asta")}`);
  assert.ok(iStrato < tipi.indexOf("nodo"), `strato ${iStrato} prima del primo nodo ${tipi.indexOf("nodo")}`);
});

test("piano con vista M su un pilastro: si legge Mz, e il diagramma non è una riga piatta", () => {
  // La prova che una mappa costante non basta (R1): con `My` a 1e-9 il pilastro uscirebbe
  // schiacciato sul proprio asse e il picco non si scriverebbe mai.
  const pil = (() => { let mo = modelloVuoto(); mo = creaNodo(mo, { x: 0, z: 0 }); mo = creaNodo(mo, { x: 0, z: 3000 });
    return { ...mo, aste: [{ id: 1, nodo_i: 1, nodo_j: 2 }] }; })();
  const perCaso = { spostamenti: {}, reazioni: {}, sollecitazioni: { 1: [
    { x_rel: 0, N: -1000, Vy: 2000, Vz: 1e-10, T: 0, My: 1e-9, Mz: 6e6 },
    { x_rel: 0.5, N: -1000, Vy: 2000, Vz: 1e-10, T: 0, My: 1e-9, Mz: 3e6 },
    { x_rel: 1, N: -1000, Vy: 2000, Vz: 1e-10, T: 0, My: 1e-9, Mz: 0 }] } };
  const contenitore = contenitoreFinto();
  const piano = creaPiano(contenitore, { suSelezione: () => {}, suSfondo: () => {} });
  piano.disegna(pil, { risultati: conRisultati("M", { perCaso }) });
  const g = strato(contenitore._figli[0]);
  const xs = tutti(g, "polygon")[0].getAttribute("points").split(" ").map((p) => Number(p.split(",")[0]));
  assert.ok(Math.max(...xs) - Math.min(...xs) > 1, `il diagramma ha larghezza: ${xs}`);
  assert.ok(tutti(g, "text").map((t) => t.textContent).includes("6 kN·m"));
});

test("piano con risultati di un caso senza stazioni né spostamenti: strato vuoto, non solleva", () => {
  const contenitore = contenitoreFinto();
  const piano = creaPiano(contenitore, { suSelezione: () => {}, suSfondo: () => {} });
  piano.disegna(traveR, { risultati: conRisultati("M", { perCaso: { spostamenti: {}, reazioni: {}, sollecitazioni: {} } }) });
  assert.equal(tutti(strato(contenitore._figli[0]), "polygon").length, 0);
  piano.disegna(traveR, { risultati: conRisultati("deformata", { perCaso: { spostamenti: {} }, scala: 1 }) });
  assert.equal(tutti(strato(contenitore._figli[0]), "polyline").length, 1, "la deformata senza spostamenti è l'ombra, e si disegna");
  assert.equal(tutti(strato(contenitore._figli[0]), "text").length, 0, "niente da scrivere su spostamenti nulli");
});

// Ingresso degenere: `perCaso` senza la chiave `sollecitazioni`, e stazioni di un'asta che nel
// modello non c'è. Nessun poligono orfano, nessuna etichetta appesa al nulla, nessun errore.
test("piano con vista M: sollecitazioni assenti o di un'asta fuori dal modello non disegnano niente", () => {
  const contenitore = contenitoreFinto();
  const piano = creaPiano(contenitore, { suSelezione: () => {}, suSfondo: () => {} });
  assert.doesNotThrow(() => piano.disegna(traveR, { risultati: conRisultati("M", { perCaso: { spostamenti: {}, reazioni: {} } }) }));
  assert.equal(tutti(strato(contenitore._figli[0]), "polygon").length, 0);
  assert.equal(tutti(strato(contenitore._figli[0]), "text").length, 0);
  piano.disegna(traveR, { risultati: conRisultati("M", { perCaso: { spostamenti: {}, reazioni: {}, sollecitazioni: { 99: stazioniR } } }) });
  assert.equal(tutti(strato(contenitore._figli[0]), "polygon").length, 0, "l'asta 99 non è nel modello");
  assert.equal(tutti(strato(contenitore._figli[0]), "text").length, 0);
});

// Ingresso degenere: la scala dichiarata non dipende da cosa c'è da disegnare (story 36).
test("piano con risultati e un modello senza aste: strato vuoto, e il badge si scrive lo stesso", () => {
  const contenitore = contenitoreFinto();
  const piano = creaPiano(contenitore, { suSelezione: () => {}, suSfondo: () => {} });
  piano.disegna(creaNodo(modelloVuoto(), { x: 0, z: 0 }), { risultati: conRisultati("M") });
  const g = strato(contenitore._figli[0]);
  assert.ok(g, "lo strato c'è anche senza niente da disegnarci dentro");
  assert.equal(g._figli.length, 0);
  const badge = badgeDi(contenitore);
  assert.equal(badge.hidden, false);
  assert.equal(badge.textContent, "M · Z1 · kN·m · lato teso");
});

// Ingresso degenere: il riquadro non ancora impaginato. `clientWidth`/`clientHeight` a 0 danno
// `s` finito (`|| 1`, `piano.js:118-122`), quindi nessun `NaN` scritto in un attributo.
test("piano con il riquadro a 0×0: nessun NaN nei punti, nelle ordinate, nelle etichette", () => {
  const contenitore = contenitoreFinto();
  contenitore.clientWidth = 0;
  contenitore.clientHeight = 0;
  const piano = creaPiano(contenitore, { suSelezione: () => {}, suSfondo: () => {} });
  assert.doesNotThrow(() => piano.disegna(traveR, { risultati: conRisultati("M") }));
  const g = strato(contenitore._figli[0]);
  for (const e of [...tutti(g, "polygon"), ...tutti(g, "line"), ...tutti(g, "text")]) {
    for (const [k, v] of Object.entries(e._attrs)) assert.ok(!v.includes("NaN"), `${e.nome} ${k}="${v}"`);
  }
  assert.equal(badgeDi(contenitore).textContent, "M · Z1 · kN·m · lato teso");
});

// La soglia del 2 % vale per il **secondo** picco, quello di segno opposto: è un di più. Il picco
// principale di un'asta si scrive sempre, o una trave accanto a un pilastro grosso resta muta —
// e il suo numero, che è il numero di quella trave, non si legge da nessuna parte sul disegno.
test("piano con vista M: il picco principale di un'asta piccola si scrive lo stesso", () => {
  let mo = modelloVuoto();
  for (const p of [{ x: 0, z: 0 }, { x: 6000, z: 0 }, { x: 12000, z: 0 }, { x: 18000, z: 0 }]) mo = creaNodo(mo, p);
  const due = { ...mo, aste: [{ id: 1, nodo_i: 1, nodo_j: 2 }, { id: 2, nodo_i: 3, nodo_j: 4 }] };
  const sta = (x_rel, My) => ({ x_rel, N: 0, Vy: 0, Vz: 0, T: 0, My, Mz: 0 });
  const perCaso = { spostamenti: {}, reazioni: {}, sollecitazioni: {
    1: [sta(0, 0), sta(0.5, 2e7), sta(1, 0)],      // il pilastro grosso della storia
    2: [sta(0, 0), sta(0.5, 3e5), sta(1, 0)] } };  // 1,5 % del massimo: prima spariva
  const contenitore = contenitoreFinto();
  const piano = creaPiano(contenitore, { suSelezione: () => {}, suSfondo: () => {} });
  piano.disegna(due, { risultati: conRisultati("M", { perCaso }) });
  const testi = tutti(strato(contenitore._figli[0]), "text").map((t) => t.textContent);
  assert.ok(testi.includes("20 kN·m"), `il grande: ${testi}`);
  assert.ok(testi.includes("0,3 kN·m"), `e il piccolo, che è il suo: ${testi}`);
});

// Il secondo picco — quello di segno opposto — resta un di più, e sotto il 2 % non si scrive.
test("piano con vista M: il secondo picco sotto il 2 % del massimo globale non si scrive", () => {
  let mo = modelloVuoto();
  for (const p of [{ x: 0, z: 0 }, { x: 6000, z: 0 }, { x: 12000, z: 0 }, { x: 18000, z: 0 }]) mo = creaNodo(mo, p);
  const due = { ...mo, aste: [{ id: 1, nodo_i: 1, nodo_j: 2 }, { id: 2, nodo_i: 3, nodo_j: 4 }] };
  const sta = (x_rel, My) => ({ x_rel, N: 0, Vy: 0, Vz: 0, T: 0, My, Mz: 0 });
  const perCaso = { spostamenti: {}, reazioni: {}, sollecitazioni: {
    1: [sta(0, 0), sta(0.5, 100e6), sta(1, 0)],
    // Il secondo picco vale il 10 % del massimo della **sua** asta (e `picchi` lo rende), ma
    // l'1 % del massimo globale: sotto soglia.
    2: [sta(0, -1e6), sta(0.5, 10e6), sta(1, 0)] } };
  const contenitore = contenitoreFinto();
  const piano = creaPiano(contenitore, { suSelezione: () => {}, suSfondo: () => {} });
  piano.disegna(due, { risultati: conRisultati("M", { perCaso }) });
  const testi = tutti(strato(contenitore._figli[0]), "text").map((t) => t.textContent);
  assert.ok(testi.includes("10 kN·m"), `il principale della seconda asta c'è: ${testi}`);
  assert.ok(!testi.includes("-1 kN·m"), `il secondo no: ${testi}`);
});

// Ingresso degenere: più etichette dello stesso valore nello stesso punto. `disponi` ha quattro
// versi per tre distanze; esaurite le posizioni libere l'ultima si nasconde invece di finire
// addosso a un'altra — il valore resta nell'ispettore e nella striscia.
test("piano con vista M: l'etichetta che non trova posto si nasconde, nessuna si sovrappone", () => {
  const sette = { ...traveR, aste: Array.from({ length: 7 }, (_, k) => ({ id: k + 1, nodo_i: 1, nodo_j: 2 })) };
  const perCaso = { spostamenti: {}, reazioni: {}, sollecitazioni: Object.fromEntries(sette.aste.map((a) => [a.id, stazioniR])) };
  const contenitore = contenitoreFinto();
  const piano = creaPiano(contenitore, { suSelezione: () => {}, suSfondo: () => {} });
  piano.disegna(sette, { risultati: conRisultati("M", { perCaso }) });
  const g = strato(contenitore._figli[0]);
  assert.equal(tutti(g, "polygon").length, 7, "i sette diagrammi si disegnano tutti");
  const testi = tutti(g, "text");
  assert.ok(testi.length < 7, `almeno un'etichetta nascosta: ${testi.length} di 7`);
  const posti = testi.map((t) => `${t.getAttribute("x")}|${t.getAttribute("y")}|${t.getAttribute("text-anchor")}`);
  assert.equal(new Set(posti).size, posti.length, "nessuna etichetta posata sopra un'altra");
});

// --- fix round 1 -----------------------------------------------------------------

// Alto 1: il poligono ha `fill`, e sopra l'asta il clic finiva sullo strato invece che sull'asta
// (`ev.target.closest("[data-tipo]")` non trova niente → `suSfondo()`). Lo strato non si tocca.
test("piano con vista M: lo strato dei risultati non intercetta i clic", () => {
  const contenitore = contenitoreFinto();
  const piano = creaPiano(contenitore, { suSelezione: () => {}, suSfondo: () => {} });
  piano.disegna(traveR, { risultati: conRisultati("M") });
  assert.equal(strato(contenitore._figli[0]).getAttribute("pointer-events"), "none");
});

// Medio 3: con `ux = uz = 0` in ogni fixture il ramo dell'etichetta del massimo spostamento non
// era mai eseguito. Qui il nodo 2 scende di 10 mm.
test("piano con vista deformata: il massimo spostamento è scritto in mm sul nodo che si è mosso", () => {
  const perCaso = { spostamenti: { 1: [0, 0, 0, 0, 0, 0], 2: [0, 0, -10, 0, 0, 0] }, reazioni: {}, sollecitazioni: {} };
  const contenitore = contenitoreFinto();
  const piano = creaPiano(contenitore, { suSelezione: () => {}, suSfondo: () => {} });
  piano.disegna(traveR, { risultati: conRisultati("deformata", { perCaso, scala: 100 }) });
  const testi = tutti(strato(contenitore._figli[0]), "text").map((t) => t.textContent);
  assert.deepEqual(testi, ["10 mm"], `una sola etichetta, il massimo: ${testi}`);
});

// Medio 4: il ramo `!scelta` dell'ombra. L'asta scelta resta piena e rossa — è l'unica cosa che
// il rosso può dire qui — e solo le altre sbiadiscono.
test("piano con vista deformata: l'asta selezionata resta piena e rossa, le altre sono ombra", () => {
  let mo = modelloVuoto();
  mo = creaNodo(mo, { x: 0, z: 0 }); mo = creaNodo(mo, { x: 6000, z: 0 }); mo = creaNodo(mo, { x: 12000, z: 0 });
  const due = { ...mo, aste: [{ id: 1, nodo_i: 1, nodo_j: 2 }, { id: 2, nodo_i: 2, nodo_j: 3 }] };
  const contenitore = contenitoreFinto();
  const piano = creaPiano(contenitore, { suSelezione: () => {}, suSfondo: () => {} });
  piano.disegna(due, { selezione: { tipo: "asta", id: 1 }, risultati: conRisultati("deformata") });
  const aste = tutti(contenitore._figli[0], "line").filter((l) => l.getAttribute("data-tipo") === "asta");
  const scelta = aste.find((l) => l.getAttribute("data-id") === "1");
  const altra = aste.find((l) => l.getAttribute("data-id") === "2");
  assert.equal(scelta.getAttribute("stroke"), "#b8321e");
  assert.equal(scelta.getAttribute("stroke-opacity"), undefined, "la selezione non sbiadisce");
  assert.equal(altra.getAttribute("stroke-opacity"), "0.3");
});

// R6: il badge è un ostacolo, e questo è l'oracolo che lo prova. Telaio 8000×6000 in un riquadro
// 800×600: il `viewBox` esce 4:3 esatto, quindi il viewport **coincide** con lui e il badge sta
// sullo spigolo del disegno, non fuori. Il picco della trave alta, che senza ostacolo finisce a
// un passo a destra e ci va sotto, deve stare altrove o non essere scritto.
const telaio43 = (() => {
  let mo = modelloVuoto();
  for (const p of [{ x: 0, z: 0 }, { x: 8000, z: 0 }, { x: 8000, z: 6000 }, { x: 0, z: 6000 }]) mo = creaNodo(mo, p);
  return { ...mo, aste: [{ id: 1, nodo_i: 1, nodo_j: 2 }, { id: 2, nodo_i: 2, nodo_j: 3 },
                         { id: 3, nodo_i: 3, nodo_j: 4 }, { id: 4, nodo_i: 4, nodo_j: 1 }] };
})();
const stazione = (x_rel, My) => ({ x_rel, N: 0, Vy: 0, Vz: 0, T: 0, My, Mz: 0 });
const perCaso43 = { spostamenti: {}, reazioni: {}, sollecitazioni: {
  1: [stazione(0, 0), stazione(0.5, 100e6), stazione(1, 0)],         // trave bassa: il massimo globale, e scende
  3: [stazione(0, -55e6), stazione(0.5, -27.5e6), stazione(1, 0)] } };  // trave alta: sale di 352 mm, sotto il badge

test("piano 4:3: il badge è un ostacolo, e nessun picco finisce sotto il suo testo", () => {
  const contenitore = contenitoreFinto();
  const piano = creaPiano(contenitore, { suSelezione: () => {}, suSfondo: () => {} });
  piano.disegna(telaio43, {});
  assert.equal(badgeDi(contenitore).hidden, true, "senza risultati il badge non c'è");
  piano.disegna(telaio43, { risultati: conRisultati("M", { perCaso: perCaso43 }) });
  const badge = badgeDi(contenitore);
  assert.equal(badge.hidden, false);
  // Il box del badge come lo calcola il codice: `viewBox` {−960, −720, 9920, 7440}, s = 12,4;
  // il viewport è centro ± mezza misura in px per `s`, e con il 4:3 combacia col `viewBox`.
  // Il badge sta su una riga sua: parte 22 px sotto il bordo, non a filo (fix round 2), ed è
  // alto una riga sola. La larghezza non è tagliata: la scala non si tronca.
  const s = 12.4, cx = -960 + 9920 / 2, cy = -720 + 7440 / 2;
  const x1 = cx + 800 * s / 2, bordo = cy - 600 * s / 2;
  const scatola = { x0: x1 - (badge.textContent.length * 6.6 + 8) * s, y0: bordo + 22 * s, x1, y1: bordo + 36 * s };
  assert.deepEqual([scatola.x0, scatola.y0, scatola.x1, scatola.y1].map((v) => Math.round(v * 10) / 10),
                   [6814.8, -447.2, 8960, -273.6], "22 px sotto il bordo, alto una riga");
  const testi = tutti(strato(contenitore._figli[0]), "text");
  assert.ok(testi.length >= 1, "il picco della trave bassa si scrive: il test non è vuoto");
  // Il **box**, non il punto d'ancoraggio: un'etichetta ancorata appena sopra il badge ci finisce
  // sotto lo stesso con la sua metà bassa, ed è quello che si legge sovrapposto.
  for (const t of testi) {
    assert.ok(!siSovrappongono(boxTesto(t, s), scatola), `«${t.textContent}» finisce sotto il badge`);
  }
});

// --- fix round 2 -----------------------------------------------------------------

// Il box di un `<text>` come lo intende chi lo posa: `dominant-baseline: middle` centra sul
// punto, la linea di base (l'assenza dell'attributo) lo tiene sopra. Serve a confrontare fra
// loro etichette posate da mani diverse — nodi, picchi, carichi.
const boxTesto = (t, s) => {
  const x = Number(t.getAttribute("x")), y = Number(t.getAttribute("y"));
  const larghezza = t.textContent.length * 6.6 * s, altezza = 11 * s;
  const ancora = t.getAttribute("text-anchor") ?? "start";
  const x0 = ancora === "end" ? x - larghezza : ancora === "middle" ? x - larghezza / 2 : x;
  const mezzo = t.getAttribute("dominant-baseline") === "middle";
  return { x0, x1: x0 + larghezza, y0: mezzo ? y - altezza / 2 : y - altezza, y1: mezzo ? y + altezza / 2 : y };
};
const millimetriPerPixelDi = (svg) => {
  const [, , larghezza, altezza] = svg.getAttribute("viewBox").split(" ").map(Number);
  return Math.max(larghezza / 800, altezza / 600);
};

// Il fumo del Task 6 sul telaio 2×1 a 1280 px: «Fx 20 000 N» finiva addosso all'etichetta del
// nodo 4 e al picco. Le etichette dei carichi non passavano da `disponi` e non erano ostacoli.
test("piano: l'etichetta di un carico passa da `disponi` e non si sovrappone a nessun'altra", () => {
  const azione = { id: 1, nome: "vento", natura: "Q", categoria: "vento", generata: false, carichi: [
    { tipo: "nodale", nodo: 4, Fx: 20000, Fy: 0, Fz: 0, Mx: 0, My: 0, Mz: 0 },
  ] };
  const contenitore = contenitoreFinto();
  const piano = creaPiano(contenitore, { suSelezione: () => {}, suSfondo: () => {} });
  piano.disegna(telaio43, { azioneInVista: azione, risultati: conRisultati("M", { perCaso: perCaso43 }) });
  const svg = contenitore._figli[0];
  const s = millimetriPerPixelDi(svg);
  const testi = tutti(svg, "text");
  assert.ok(testi.some((t) => t.textContent.startsWith("Fx")), `l'etichetta del carico si scrive: ${testi.map((t) => t.textContent)}`);
  for (let i = 0; i < testi.length; i++) for (let j = i + 1; j < testi.length; j++) {
    assert.ok(!siSovrappongono(boxTesto(testi[i], s), boxTesto(testi[j], s)),
      `«${testi[i].textContent}» e «${testi[j].textContent}» si sovrappongono`);
  }
});

// Il carico è il contorno, il picco è il soggetto: a parità di posto vince il picco.
test("piano: fra un picco e un carico che si contendono il posto, il picco resta dov'è", () => {
  const azione = { id: 1, nome: "vento", natura: "Q", categoria: "vento", generata: false, carichi: [
    { tipo: "nodale", nodo: 4, Fx: 20000, Fy: 0, Fz: 0, Mx: 0, My: 0, Mz: 0 },
  ] };
  const senza = contenitoreFinto(), con = contenitoreFinto();
  creaPiano(senza, { suSelezione: () => {}, suSfondo: () => {} })
    .disegna(telaio43, { risultati: conRisultati("M", { perCaso: perCaso43 }) });
  creaPiano(con, { suSelezione: () => {}, suSfondo: () => {} })
    .disegna(telaio43, { azioneInVista: azione, risultati: conRisultati("M", { perCaso: perCaso43 }) });
  const posti = (contenitore) => tutti(strato(contenitore._figli[0]), "text")
    .map((t) => `${t.textContent}@${t.getAttribute("x")},${t.getAttribute("y")}`);
  assert.deepEqual(posti(con), posti(senza), "il carico non sposta i picchi");
});

// Ingresso degenere: il primo disegno arriva prima che il layout misuri il riquadro. Con `|| 1`
// `s` valeva l'intero modello per pixel e **tutto** — cerchi, ostacoli, larghezza delle
// etichette — usciva grande quanto il telaio: nessun picco entrava nei limiti e sparivano tutti.
test("piano con il riquadro non ancora misurato: i picchi si scrivono lo stesso", () => {
  const contenitore = contenitoreFinto();
  contenitore.clientWidth = 0;
  contenitore.clientHeight = 0;
  const piano = creaPiano(contenitore, { suSelezione: () => {}, suSfondo: () => {} });
  piano.disegna(traveR, { risultati: conRisultati("M") });
  const testi = tutti(strato(contenitore._figli[0]), "text").map((t) => t.textContent);
  assert.deepEqual(testi, ["45 kN·m"], `il picco c'è anche senza misura del riquadro: ${testi}`);
});

// --- fix di fine ramo (prova a mano su Chrome: trave appoggiata e MURO 1) ---------

// Sul muro «0,2056 kN·m» era attraversata dalla linea tratteggiata del diagramma e dalle sue
// ordinate: l'etichetta partiva da «sopra» anche quando il diagramma stava sopra.
test("piano con vista M: l'etichetta del picco sta dalla parte del vuoto, fuori dal diagramma", () => {
  const contenitore = contenitoreFinto();
  const piano = creaPiano(contenitore, { suSelezione: () => {}, suSfondo: () => {} });
  piano.disegna(traveR, { risultati: conRisultati("M") });
  const g = strato(contenitore._figli[0]);
  const punti = tutti(g, "polygon")[0].getAttribute("points").split(" ").map((p) => p.split(",").map(Number));
  const yPicco = Math.max(...punti.map(([, y]) => y));   // M positivo: il diagramma scende
  const t = tutti(g, "text").find((x) => x.textContent === "45 kN·m");
  assert.ok(t, "il picco si scrive");
  assert.ok(Number(t.getAttribute("y")) > yPicco,
    `l'etichetta sta sotto il picco (${t.getAttribute("y")} > ${yPicco}), non dentro il diagramma`);
});

// Al nodo d'angolo la trave e il pilastro hanno lo stesso momento all'estremo comune (equilibrio),
// e ognuno lo scriveva per conto suo: «0,2056 kN·m» due volte a «sommità dx» su MURO 1. Il
// riquadro di prova è largo 360 px come `#piano` a 1280.
const angolo = (() => {
  let mo = modelloVuoto();
  for (const p of [{ x: 0, z: 0 }, { x: 6000, z: 0 }, { x: 6000, z: 3000 }, { x: 12000, z: 0 }]) mo = creaNodo(mo, p);
  return { ...mo, aste: [{ id: 1, nodo_i: 1, nodo_j: 2 }, { id: 2, nodo_i: 2, nodo_j: 3 },
                         { id: 3, nodo_i: 2, nodo_j: 4 }] };
})();
const staM = (x_rel, M) => ({ x_rel, N: 0, Vy: 0, Vz: 0, T: 0, My: M, Mz: M });
const perCasoAngolo = { spostamenti: {}, reazioni: {}, sollecitazioni: {
  1: [staM(0, 0), staM(0.5, 1.25e6), staM(1, 2.5e6)],     // trave: il suo picco è all'angolo
  2: [staM(0, 2.5e6), staM(0.5, 1.25e6), staM(1, 0)],     // pilastro: lo stesso momento, stesso punto
  3: [staM(0, 0), staM(0.5, 100e6), staM(1, 0)] } };      // l'altra campata porta il massimo globale

test("piano con vista M: la trave e il pilastro all'angolo non scrivono due volte lo stesso valore", () => {
  const contenitore = contenitoreFinto();
  contenitore.clientWidth = 360;
  const piano = creaPiano(contenitore, { suSelezione: () => {}, suSfondo: () => {} });
  piano.disegna(angolo, { risultati: conRisultati("M", { perCaso: perCasoAngolo }) });
  const testi = tutti(strato(contenitore._figli[0]), "text").map((t) => t.textContent);
  // «Esattamente una», di nuovo, e la storia in tre righe: con le linee dei diagrammi fra gli
  // ostacoli allo spigolo si incrociano tre tratti, i quattro versi assiali erano tutti presi a
  // tutte e tre le distanze e l'etichetta usciva **zero** volte — l'assert era stato allentato a
  // «al più una». Con gli otto versi la diagonale libera c'è, il picco torna, e con lui il doppione
  // torna osservabile: la fusione ha di nuovo un test che la uccide.
  assert.equal(testi.filter((t) => t === "2,5 kN·m").length, 1, `una volta sola: ${testi}`);
});

// Preesistente dalla 11b, chiuso qui perché la giornata promette zero testo tagliato: l'etichetta
// del nodo di sinistra va a sinistra, e il margine del 12 % non basta a «cerniera».
test("piano: un nome lungo allarga il riquadro invece di uscirne", () => {
  let mo = modelloVuoto();
  mo = creaNodo(mo, { x: 0, z: 0 }); mo = creaNodo(mo, { x: 6000, z: 0 });
  const nominata = { ...mo, aste: [{ id: 1, nodo_i: 1, nodo_j: 2 }],
                     nodi: mo.nodi.map((n) => ({ ...n, nome: n.id === 1 ? "cerniera" : "carrello" })) };
  const contenitore = contenitoreFinto();
  contenitore.clientWidth = 360;   // `#piano` a 1280 px, la misura in cui il difetto si vede
  const piano = creaPiano(contenitore, { suSelezione: () => {}, suSfondo: () => {} });
  piano.disegna(nominata, {});
  const svg = contenitore._figli[0];
  const [x0, , larghezza, altezza] = svg.getAttribute("viewBox").split(" ").map(Number);
  const s = Math.max(larghezza / 360, altezza / 600);
  const nomi = tutti(svg, "text").filter((t) => t.textContent.startsWith("c"));
  assert.equal(nomi.length, 2, "i due nomi si scrivono");
  for (const t of nomi) {
    const b = boxTesto(t, s);
    assert.ok(b.x0 >= x0, `«${t.textContent}» esce a sinistra: ${b.x0} < ${x0}`);
    assert.ok(b.x1 <= x0 + larghezza, `«${t.textContent}» esce a destra: ${b.x1} > ${x0 + larghezza}`);
  }
});

// Il picco è il soggetto della vista, il carico il contorno: anche un picco piccolo (0,15 del
// massimo) sta sopra un'etichetta di carico, che vale 0,5 fissa.
test("piano: un picco piccolo non cede il posto all'etichetta di un carico", () => {
  let mo = modelloVuoto();
  for (const p of [{ x: 0, z: 0 }, { x: 6000, z: 0 }, { x: 12000, z: 0 }]) mo = creaNodo(mo, p);
  const due = { ...mo, aste: [{ id: 1, nodo_i: 1, nodo_j: 2 }, { id: 2, nodo_i: 2, nodo_j: 3 }] };
  const perCaso = { spostamenti: {}, reazioni: {}, sollecitazioni: {
    1: [staM(0, 15e6), staM(0.5, 7.5e6), staM(1, 0)],     // picco all'estremo, 0,15 del massimo
    2: [staM(0, 0), staM(0.5, 100e6), staM(1, 0)] } };
  const azione = { id: 1, nome: "vento", natura: "Q", categoria: "vento", generata: false, carichi: [
    { tipo: "nodale", nodo: 1, Fx: 0, Fy: 0, Fz: 10000, Mx: 0, My: 0, Mz: 0 },
  ] };
  const posto = (opzioni) => {
    const contenitore = contenitoreFinto();
    const piano = creaPiano(contenitore, { suSelezione: () => {}, suSfondo: () => {} });
    piano.disegna(due, { risultati: conRisultati("M", { perCaso }), ...opzioni });
    const t = tutti(strato(contenitore._figli[0]), "text").find((x) => x.textContent === "15 kN·m");
    return t && `${t.getAttribute("x")},${t.getAttribute("y")}`;
  };
  const solo = posto({});
  assert.ok(solo, "senza carichi il picco piccolo si scrive");
  assert.equal(posto({ azioneInVista: azione }), solo, "il carico non sposta il picco: passa lui per primo");
});

// --- la review di ramo ------------------------------------------------------------

// Il box dell'etichetta di un nodo finiva sulla linea di base: «piede sx» ha una `p` che scende
// sotto, e un picco posato lì sotto le entrava dentro. Tre pixel di discendente, e i due di
// margine per lato che hanno anche i picchi.
//
// **Questo test non uccide il mutante**, e va detto: sulla trave del brief il picco cade in
// mezzeria e i nomi stanno agli appoggi, quindi la fascia del discendente non decide niente. Ho
// provato a costruire la geometria in cui decide — picco a un estremo, 56-112 mm sopra il nodo,
// così l'etichetta spinta in basso aprirebbe proprio dentro il discendente — e ogni volta
// `disponi` la porta prima a «destra», che a queste misure resta libera. Vale come invariante: se
// domani una geometria li avvicina, il test se ne accorge.
test("piano con vista M: nessun picco entra nel box di un nome di nodo, discendente compreso", () => {
  const nominata = { ...traveR, nodi: traveR.nodi.map((n) => ({ ...n, nome: n.id === 1 ? "piede sx" : "piede dx" })) };
  const contenitore = contenitoreFinto();
  const piano = creaPiano(contenitore, { suSelezione: () => {}, suSfondo: () => {} });
  piano.disegna(nominata, { risultati: conRisultati("M") });
  const svg = contenitore._figli[0];
  const s = millimetriPerPixelDi(svg);
  // Il box del nome come lo mette `piano.js` fra gli ostacoli: 11 px sopra la base, 3 sotto.
  const boxNome = (t) => {
    const b = boxTesto(t, s);
    return { ...b, x0: b.x0 - s, x1: b.x1 + s, y1: b.y1 + 3 * s };
  };
  const nomi = tutti(svg, "text").filter((t) => t.textContent.startsWith("piede"));
  const picchi = tutti(strato(svg), "text");
  assert.equal(nomi.length, 2, "i due nomi si scrivono");
  assert.ok(picchi.length >= 1, "il picco si scrive");
  for (const n of nomi) for (const p of picchi) {
    assert.ok(!siSovrappongono(boxTesto(p, s), boxNome(n)),
      `«${p.textContent}» entra nel nome «${n.textContent}»`);
  }
});

// --- le linee del disegno sono ostacoli (debito 3) --------------------------------
// Su MURO 1 «0,2056 kN·m» era attraversata dalla linea tratteggiata del diagramma e dalle sue
// ordinate: `disponi` conosceva i cerchi e i nomi dei nodi, non le linee.
test("piano con vista M: nessuna etichetta finisce sopra un'ordinata o un tratto del diagramma", () => {
  const contenitore = contenitoreFinto();
  const piano = creaPiano(contenitore, { suSelezione: () => {}, suSfondo: () => {} });
  piano.disegna(telaio43, { risultati: conRisultati("M", { perCaso: perCaso43 }) });
  const svg = contenitore._figli[0];
  const s = millimetriPerPixelDi(svg);
  const g = strato(svg);
  // Il bbox di un segmento come lo mette `piano.js`: un pixel di margine per lato.
  const boxLinea = (x1, y1, x2, y2) => ({ x0: Math.min(x1, x2) - s, y0: Math.min(y1, y2) - s,
                                          x1: Math.max(x1, x2) + s, y1: Math.max(y1, y2) + s });
  const linee = tutti(g, "line").map((l) => boxLinea(...["x1", "y1", "x2", "y2"].map((k) => Number(l.getAttribute(k)))));
  for (const p of tutti(g, "polygon")) {
    const punti = p.getAttribute("points").split(" ").map((c) => c.split(",").map(Number));
    for (let k = 1; k < punti.length; k++) linee.push(boxLinea(...punti[k - 1], ...punti[k]));
  }
  const testi = tutti(g, "text");
  assert.ok(testi.length >= 1, "qualche picco si scrive: il test non è vuoto");
  assert.ok(linee.length >= 8, `le linee ci sono: ${linee.length}`);
  for (const t of testi) for (const l of linee) {
    assert.ok(!siSovrappongono(boxTesto(t, s), l), `«${t.textContent}» passa sopra una linea del diagramma`);
  }
});

// --- il lato del positivo uniforme (debito 4) -------------------------------------
test("piano con vista V: il positivo sta a sinistra di i→j su ogni asta, e il badge lo dice", () => {
  const contenitore = contenitoreFinto();
  const piano = creaPiano(contenitore, { suSelezione: () => {}, suSfondo: () => {} });
  // Trave (i→j verso +x): `e2` è in alto in modello, cioè `y` **minore** sullo schermo.
  const perCaso = { spostamenti: {}, reazioni: {}, sollecitazioni: {
    1: [{ x_rel: 0, N: 0, Vy: 0, Vz: 30000, T: 0, My: 0, Mz: 0 },
        { x_rel: 1, N: 0, Vy: 0, Vz: 30000, T: 0, My: 0, Mz: 0 }] } };
  piano.disegna(traveR, { risultati: conRisultati("V", { perCaso }) });
  const svg = contenitore._figli[0];
  const punti = tutti(strato(svg), "polygon")[0].getAttribute("points").split(" ").map((p) => p.split(",").map(Number));
  const yBase = punti[0][1];
  assert.ok(punti.some(([, y]) => y < yBase - 1), "V positivo sopra la trave: a sinistra di i→j");
  assert.equal(badgeDi(contenitore).textContent, "V · Z1 · kN · + verso i→j, a sinistra di i→j");
});

// --- la sezione ruotata (debito 6) ------------------------------------------------
test("piano: un'asta con la sezione ruotata non entra nei diagrammi, e il badge la conta", () => {
  const ruotata = { ...traveR, aste: [{ ...traveR.aste[0], rotazione_deg: 30 }] };
  const contenitore = contenitoreFinto();
  const piano = creaPiano(contenitore, { suSelezione: () => {}, suSfondo: () => {} });
  piano.disegna(ruotata, { risultati: conRisultati("M") });
  assert.equal(tutti(strato(contenitore._figli[0]), "polygon").length, 0, "nessun diagramma sbagliato");
  assert.equal(badgeDi(contenitore).textContent,
    "M · Z1 · kN·m · lato teso · 1 asta con sezione ruotata non disegnata");
  // La deformata sì: è in terna globale, e la rotazione della sezione non la tocca.
  piano.disegna(ruotata, { risultati: conRisultati("deformata", { scala: 100 }) });
  assert.equal(tutti(strato(contenitore._figli[0]), "polyline").length, 1);
  assert.equal(badgeDi(contenitore).textContent, "deformata · Z1 · ×100 (auto)");
});


// --- il simbolo del vincolo è un ostacolo (coda dei debiti) -----------------------
// Sul MURO 1 «−0,1021 kN·m» al piede sinistro finiva sopra il triangolo del vincolo. `versoLibero`
// lo sapeva già (l'etichetta del nodo non va in basso dove c'è il simbolo); `disponi` no. La
// geometria è quella del caso studio: piede di pilastro d'angolo, con nome, vincolo e due diagrammi
// che ci si incrociano sopra.
const INCASTRO_TOTALE = { ux: true, uy: true, uz: true, rx: true, ry: true, rz: true };
const angoloVincolato = (() => {
  let mo = modelloVuoto();
  for (const p of [{ x: 0, z: 0 }, { x: 0, z: 3000 }, { x: 4000, z: 3000 }]) mo = creaNodo(mo, p);
  return { ...mo,
    nodi: mo.nodi.map((n) => (n.id === 1 ? { ...n, nome: "piede sx", vincolo: INCASTRO_TOTALE } : n)),
    aste: [{ id: 1, nodo_i: 1, nodo_j: 2 }, { id: 2, nodo_i: 2, nodo_j: 3 }] };
})();
const staAngolo = (x_rel, M) => ({ x_rel, N: 0, Vy: 0, Vz: 0, T: 0, My: M, Mz: M });
const perCasoPiede = { spostamenti: {}, reazioni: {}, sollecitazioni: {
  1: [staAngolo(0, -0.693e6), staAngolo(0.5, -0.3e6), staAngolo(1, 0)],   // il pilastro: picco al piede
  2: [staAngolo(0, 0), staAngolo(0.5, 2e6), staAngolo(1, 0)] } };         // la trave: il massimo globale

const pianoDelPiede = () => {
  const contenitore = contenitoreFinto();
  contenitore.clientWidth = 360;   // `#piano` a 1280 px, come sul caso studio
  creaPiano(contenitore, { suSelezione: () => {}, suSfondo: () => {} })
    .disegna(angoloVincolato, { risultati: conRisultati("M", { perCaso: perCasoPiede }) });
  return contenitore._figli[0];
};

test("piano con vista M: un picco non finisce sopra il triangolo di un vincolo", () => {
  const svg = pianoDelPiede();
  const [, , larghezza, altezza] = svg.getAttribute("viewBox").split(" ").map(Number);
  const s = Math.max(larghezza / 360, altezza / 600);
  // Il box del simbolo come lo mette `piano.js`: mezza larghezza `RAGGIO·3·s`, dal nodo fino sotto
  // i tratti di terra (`RAGGIO·2·s + 4·s`). Il nodo 1 è l'unico vincolato.
  const c = tutti(svg, "circle").filter((x) => x.getAttribute("fill") !== "none")[0];
  const x = Number(c.getAttribute("cx")), y = Number(c.getAttribute("cy"));
  const simbolo = { x0: x - 15 * s, y0: y, x1: x + 15 * s, y1: y + 14 * s };
  const testi = tutti(strato(svg), "text");
  assert.ok(testi.length >= 1, "il picco si scrive: il test non è vuoto");
  for (const t of testi) {
    assert.ok(!siSovrappongono(boxTesto(t, s), simbolo), `«${t.textContent}» finisce sopra il vincolo`);
  }
});

// La geometria che sul MURO 1 faceva sparire il picco: fra nome del nodo, vincolo e le ordinate di
// due aste, senza le diagonali di `disponi` i quattro assi sono tutti presi e l'etichetta non si
// scrive affatto.
test("piano con vista M: il picco alla base di un pilastro d'angolo trova posto", () => {
  const testi = tutti(strato(pianoDelPiede()), "text").map((t) => t.textContent);
  assert.ok(testi.includes("-0,693 kN·m"), `il picco del piede è posato: ${testi}`);
});

// --- il fattore dell'animazione, lo stato delle sezioni, la legenda (giornata 14a, Task 2) ------

// La legenda degli stati è il quarto figlio del contenitore, come il badge è il terzo
// (`piano.js`: `replaceChildren(svg, titolo, badge, legenda)`).
const legendaDi = (contenitore) => contenitore._figli[3];
const statiDi = (svg) => tutti(svg, "circle").filter((c) => c.getAttribute("class") === "stato");
const nuovoPiano = () => {
  const contenitore = contenitoreFinto();
  const piano = creaPiano(contenitore, { suSelezione: () => {}, suSfondo: () => {} });
  return { contenitore, piano, svg: () => contenitore._figli[0] };
};
const ultimoPunto = (svg) =>
  tutti(strato(svg), "polyline")[0].getAttribute("points").split(" ").at(-1).split(",").map(Number);

// Una forma modale: nessuna rotazione, il nodo 2 alzato di 3 mm in z (R4: fra i nodi è una retta).
const FORMA_2 = { spostamenti: { 1: [0, 0, 0, 0, 0, 0], 2: [0, 0, -3, 0, 0, 0] } };
const MODO_2 = { n: 2, f: 31.85, T: 0.0314, massa_partecipante: { x: 0.456215, y: 0, z: 0 } };

test("piano: il fattore dell'animazione moltiplica la scala del disegno, non il numero nel badge", () => {
  const { contenitore, piano, svg } = nuovoPiano();
  const base = { vista: "deformata", caso: "modo:2", perCaso: FORMA_2, scala: 100, auto: true,
                 stantia: false, tipo: "modo", badge: { modo: MODO_2 } };
  piano.disegna(traveR, { risultati: { ...base, fattore: 1 } });
  const pieno = ultimoPunto(svg());
  piano.disegna(traveR, { risultati: { ...base, fattore: 0.5 } });
  const mezzo = ultimoPunto(svg());
  piano.disegna(traveR, { risultati: { ...base, fattore: 0 } });
  const fermo = ultimoPunto(svg());
  // Lo scostamento dall'indeformata (fattore 0) è esattamente la metà: niente `schermoDi` da
  // replicare, si confronta il disegno con sé stesso a tre fattori.
  assert.ok(Math.abs((mezzo[1] - fermo[1]) * 2 - (pieno[1] - fermo[1])) < 1e-9);
  assert.ok(Math.abs(pieno[1] - fermo[1]) > 1, "a fattore 1 la deformata si vede");
  // il badge dice la scala **dichiarata**, che è l'ampiezza massima: il fattore non ci entra
  assert.ok(badgeDi(contenitore).textContent.startsWith("modo 2 · 31,85 Hz"));
  assert.ok(badgeDi(contenitore).textContent.includes("×100 (auto)"));
});

test("piano: `fattore` assente vale 1, e a fattore 0 la deformata cade sull'ombra senza NaN", () => {
  const { piano, svg } = nuovoPiano();
  const base = { vista: "deformata", caso: "modo:2", perCaso: FORMA_2, scala: 100, auto: true,
                 stantia: false, tipo: "modo", badge: { modo: MODO_2 } };
  piano.disegna(traveR, { risultati: base });                      // niente `fattore`
  const senza = ultimoPunto(svg());
  piano.disegna(traveR, { risultati: { ...base, fattore: 1 } });
  assert.deepEqual(ultimoPunto(svg()), senza, "`fattore` assente = 1");
  piano.disegna(traveR, { risultati: { ...base, fattore: 0 } });
  assert.ok(ultimoPunto(svg()).every(Number.isFinite), "nessun NaN a fattore zero");
});

test("piano: gli stati delle sezioni sono simboli sulla deformata, con la legenda; senza `stati` niente", () => {
  const { contenitore, piano, svg } = nuovoPiano();
  const E = { calcestruzzo: "elastica", acciaio: "elastica" };
  const stati = { 1: [E, { calcestruzzo: "fessurata", acciaio: "snervata" },
                      { calcestruzzo: "schiacciata", acciaio: "rotta" }, E, E] };
  piano.disegna(traveR, { risultati: { vista: "deformata", caso: "pushover", perCaso: { spostamenti: {} },
                                       scala: 1, auto: true, stantia: false, stati, tipo: "pushover",
                                       badge: { passo: { k: 0, n: 1, u: 0.5, V: 1.2 } } } });
  const simboli = statiDi(svg());
  assert.equal(simboli.length, 5, "cinque stazioni di Lobatto su un'asta non suddivisa");
  assert.equal(simboli[0].getAttribute("fill-opacity"), "0");      // elastica: vuoto
  assert.equal(simboli[1].getAttribute("fill-opacity"), "0.5");    // fessurata: mezzo
  assert.equal(simboli[2].getAttribute("fill-opacity"), "1");      // schiacciata: pieno
  assert.ok(Number(simboli[1].getAttribute("stroke-width")) > Number(simboli[0].getAttribute("stroke-width")),
            "acciaio snervato: contorno spesso");
  assert.equal(tutti(svg(), "line").filter((l) => l.getAttribute("class") === "stato-croce").length, 2,
               "rotta: una croce, cioè due tratti");
  // I simboli sono inchiostro, non colore: il doppio canale è riempimento + contorno
  // (`07-ux-modellatore.md:100`). Il rosso resta a stantia e selezione.
  assert.equal(simboli[2].getAttribute("fill"), "#141414");
  assert.equal(legendaDi(contenitore).hidden, false);
  assert.ok(legendaDi(contenitore).textContent.startsWith("calcestruzzo:"));
  piano.disegna(traveR, { risultati: conRisultati("deformata") });
  assert.equal(statiDi(svg()).length, 0, "un caso statico non ha stati");
  assert.equal(legendaDi(contenitore).hidden, true);
});

test("piano: stati con un conteggio che non combacia → equispaziati; un'asta che non c'è → niente, mai un errore", () => {
  const { piano, svg } = nuovoPiano();
  const E = { calcestruzzo: "elastica", acciaio: "elastica" };
  const conStati = (stati) => ({ vista: "deformata", caso: "pushover", perCaso: { spostamenti: {} },
                                 scala: 1, auto: true, stantia: false, stati, tipo: "pushover",
                                 badge: { passo: { k: 0, n: 1, u: 0, V: 0 } } });
  piano.disegna(traveR, { risultati: conStati({ 1: [E, E] }) });
  assert.equal(statiDi(svg()).length, 2);
  piano.disegna(traveR, { risultati: conStati({ 99: [E] }) });
  assert.equal(statiDi(svg()).length, 0, "un'asta che non c'è non ha simboli");
  piano.disegna(traveR, { risultati: conStati({ 1: [] }) });
  assert.equal(statiDi(svg()).length, 0, "lista vuota: nessun simbolo");
});

test("piano: una stazione con uno stato sconosciuto o nullo si salta, le altre si disegnano (R9)", () => {
  const { piano, svg } = nuovoPiano();
  const E = { calcestruzzo: "elastica", acciaio: "elastica" };
  // `_peggiore` rende `null` su una lista vuota di fibre: è quel che arriva davvero dal server.
  const stati = { 1: [E, { calcestruzzo: null, acciaio: "elastica" }, null,
                      { calcestruzzo: "boh", acciaio: "elastica" }, E] };
  piano.disegna(traveR, { risultati: { vista: "deformata", caso: "pushover", perCaso: { spostamenti: {} },
                                       scala: 1, auto: true, stantia: false, stati, tipo: "pushover",
                                       badge: { passo: { k: 0, n: 1, u: 0, V: 0 } } } });
  assert.equal(statiDi(svg()).length, 2, "le due elastiche restano, le tre senza stato si saltano");
});

test("piano: con un modo o un passo non si scrive l'etichetta della freccia (R5), e in vista M il badge lo dice", () => {
  const { contenitore, piano, svg } = nuovoPiano();
  piano.disegna(traveR, { risultati: { vista: "deformata", caso: "modo:2", perCaso: FORMA_2, scala: 100,
                                       auto: true, stantia: false, fattore: 1, tipo: "modo",
                                       badge: { modo: MODO_2 } } });
  assert.deepEqual(tutti(strato(svg()), "text").map((t) => t.textContent), [],
                   "la forma modale è adimensionale: nessun numero sulla freccia");
  piano.disegna(traveR, { risultati: { vista: "M", caso: "modo:2", perCaso: FORMA_2, scala: 1,
                                       auto: true, stantia: false, tipo: "modo", badge: { modo: MODO_2 } } });
  assert.ok(badgeDi(contenitore).textContent.includes("nessun diagramma per un modo"));
  // L'ingresso degenere «vista M/V/N con un modo»: lo strato resta vuoto, cioè nessun poligono —
  // la forma modale non porta sollecitazioni e `diagramma` salta l'asta senza stazioni.
  assert.equal(tutti(strato(svg()), "polygon").length, 0, "nessun diagramma da una forma modale");
});

// D: la prova di prima girava su **zero** `<text>` — con `tipo: "pushover"` l'etichetta della
// freccia non si scrive affatto (R5), quindi il `for` non asseriva niente e l'ostacolo poteva
// sparire senza che nessuno se ne accorgesse. Qui il caso è statico (`tipo: "caso"`, che
// l'etichetta ce l'ha) **con** gli stati delle sezioni, che è la corsa a fibre vera: la legenda
// c'è e l'etichetta pure. Telaio 4:3 come per il badge, così il viewport coincide col `viewBox`.
test("piano: la legenda è un ostacolo, e l'etichetta della freccia non le finisce sotto", () => {
  const contenitore = contenitoreFinto();
  const piano = creaPiano(contenitore, { suSelezione: () => {}, suSfondo: () => {} });
  const E = { calcestruzzo: "elastica", acciaio: "elastica" };
  // Il nodo 3 è lo spigolo in alto a destra: abbassato di 50 mm, la freccia massima cade
  // **dentro** la fascia della legenda, che è il caso che l'ostacolo esiste per risolvere.
  const perCaso = { spostamenti: { 1: [0, 0, 0, 0, 0, 0], 2: [0, 0, 0, 0, 0, 0],
                                   3: [0, 0, -50, 0, 0, 0], 4: [0, 0, 0, 0, 0, 0] }, reazioni: {} };
  piano.disegna(telaio43, { risultati: { vista: "deformata", caso: "C1", perCaso, scala: 1,
                                         auto: true, stantia: false, tipo: "caso",
                                         stati: { 1: [E, E, E, E, E] }, badge: {} } });
  const legenda = legendaDi(contenitore);
  assert.equal(legenda.hidden, false);
  // Il box della legenda come lo calcola `piano.js`, con gli stessi numeri del test del badge:
  // `top: 38px`, alta `offsetHeight || 28` (il DOM finto non ce l'ha → due righe), e larga al
  // massimo quanto il `max-width` di `stile.css` — la riga intera ne vorrebbe il doppio.
  const s = 12.4, cx = -960 + 9920 / 2, cy = -720 + 7440 / 2;
  const x1 = cx + 800 * s / 2, bordo = cy - 600 * s / 2;
  const larga = Math.min(legenda.textContent.length * 6.6 + 8, 800 - 16) * s;
  const scatola = { x0: x1 - larga, y0: bordo + 38 * s, x1, y1: bordo + (38 + 28) * s };
  assert.deepEqual([scatola.x0, scatola.y0, scatola.x1, scatola.y1].map((v) => Math.round(v * 10) / 10),
                   [-761.6, -248.8, 8960, 98.4], "38 px sotto il bordo, due righe, larga quanto il `max-width`");
  const testi = tutti(strato(contenitore._figli[0]), "text");
  assert.ok(testi.length >= 1, "l'etichetta della freccia si scrive: il test non è vuoto");
  for (const t of testi) {
    assert.ok(!siSovrappongono(boxTesto(t, s), scatola), `«${t.textContent}» finisce sotto la legenda`);
  }
});
