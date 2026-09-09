import { test } from "node:test";
import assert from "node:assert/strict";
import { versoLibero, estensione, creaPiano } from "../piano.js";
import { modelloVuoto } from "../modello.js";
import { creaNodo, estrudi, creaAzione, aggiungiCarico } from "../comandi.js";

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

globalThis.document = { createElementNS: (_ns, nome) => elementoSvgFinto(nome) };

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
  return { piano, svg: contenitore._figli[0] };
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
const titoli = (svg) => tutti(svg, "text").filter((t) => t.getAttribute("class") === "carichi-titolo");
const scritte = (svg) => JSON.stringify(tutti(svg, "text").map((t) => t.textContent));

test("creaPiano: l'azione in vista disegna le frecce e il titolo, senza toccare il riquadro", () => {
  const { piano, svg } = pianoFinto();
  let modello = estrudi(creaNodo(modelloVuoto(), { x: 0, z: 0 }), { da: 1, dx: 5000, dz: 0 });
  modello = creaAzione(modello, { nome: "permanenti travi", natura: "G2" });
  modello = aggiungiCarico(modello, { azione: 1, carico: { tipo: "distribuito", asta: 1, q: -12.5 } });
  piano.disegna(modello, {});
  const riquadro = svg.getAttribute("viewBox");
  assert.equal(linee(svg).length, 0, "senza azione in vista nessuna freccia");
  assert.equal(titoli(svg).length, 0, "senza azione in vista nessun titolo");
  piano.disegna(modello, { azione: modello.azioni[0] });
  assert.equal(linee(svg).length, 3, "un distribuito porta tre frecce: a un quarto, a metà, a tre quarti");
  assert.equal(svg.getAttribute("viewBox"), riquadro, "il riquadro non si muove quando compare un carico");
  assert.ok(tutti(svg, "text").some((t) => t.textContent === "carichi: permanenti travi"),
    `nessun titolo dell'azione: ${scritte(svg)}`);
});

test("creaPiano: la sola gravità non ha frecce ma sta nel titolo", () => {
  const { piano, svg } = pianoFinto();
  let modello = creaAzione(creaNodo(modelloVuoto(), { x: 0, z: 0 }), { nome: "peso proprio", natura: "G1" });
  modello = aggiungiCarico(modello, { azione: 1, carico: { tipo: "gravita", fattore_z: -1 } });
  piano.disegna(modello, { azione: modello.azioni[0] });
  assert.equal(linee(svg).length, 0, "la gravità non ha una geometria da disegnare");
  assert.ok(tutti(svg, "text").some((t) => /carichi: peso proprio · g z ×−1/.test(t.textContent)),
    `la gravità deve dirsi nel titolo: ${scritte(svg)}`);
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
  piano.disegna(modello, { azione });
  assert.equal(linee(svg).length, 3, "restano le tre frecce del distribuito, nessuna per il nodo sparito");
  assert.equal(tutti(svg, "circle").length, 2, "i due nodi restano disegnati");
});

test("creaPiano: un'azione i cui carichi puntano tutti nel vuoto tiene comunque il titolo", () => {
  const { piano, svg } = pianoFinto();
  const modello = estrudi(creaNodo(modelloVuoto(), { x: 0, z: 0 }), { da: 1, dx: 5000, dz: 0 });
  const azione = { id: 1, nome: "residui", natura: "G2", categoria: null, generata: false, carichi: [
    { tipo: "nodale", nodo: 99, Fx: 0, Fy: 0, Fz: -10000, Mx: 0, My: 0, Mz: 0 },
    { tipo: "distribuito", asta: 42, q: -12.5, direzione: "z" },
  ] };
  piano.disegna(modello, { azione });
  assert.equal(linee(svg).length, 0, "nessun carico ha una geometria a cui appendersi");
  assert.equal(titoli(svg).length, 1, "l'azione esiste, e il titolo lo dice");
});

test("creaPiano: un'azione su un modello senza nodi scrive il titolo dentro il riquadro", () => {
  const { piano, svg } = pianoFinto();
  const azione = { id: 1, nome: "vuota", natura: "Q", categoria: "vento", generata: false, carichi: [] };
  assert.doesNotThrow(() => piano.disegna(modelloVuoto(), { azione }));
  assert.equal(titoli(svg).length, 1);
  const [x0, z0, larghezza, altezza] = svg.getAttribute("viewBox").split(" ").map(Number);
  const t = titoli(svg)[0];
  assert.ok(Number(t.getAttribute("x")) >= x0 && Number(t.getAttribute("x")) <= x0 + larghezza, "il titolo sta dentro in x");
  assert.ok(Number(t.getAttribute("y")) >= z0 && Number(t.getAttribute("y")) <= z0 + altezza, "il titolo sta dentro in y");
});
