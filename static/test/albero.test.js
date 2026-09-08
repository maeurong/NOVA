import { test } from "node:test";
import assert from "node:assert/strict";
import { creaAlbero } from "../albero.js";
import { creaMateriale, creaSezione } from "../comandi.js";
import { modelloVuoto } from "../modello.js";

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
  assert.ok(t.includes("300 × 500 · 300 × 500 mm · 0 aste"), JSON.stringify(t));
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
  assert.ok(testi(elenco).includes("300 × 500 · 300 × 500 mm · 1 asta"), JSON.stringify(testi(elenco)));
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

// Il rosso vuol dire attenzione e nient'altro (ticket #14): la selezione lo prende, con il
// segno accanto (doppio canale, WCAG 1.4.1); un'intestazione non è un'attenzione.
test("una sezione selezionata prende «▸» e il rosso; il suo gruppo non li prende", () => {
  const { albero, elenco } = alberoFinto();
  albero.disegna(conSezione(), { selezione: { tipo: "sezione", id: 1 } });
  const voce = elenco._figli.find((li) => li.dataset.tipo === "sezione");
  assert.equal(voce.textContent, "▸ 300 × 500 · 300 × 500 mm · 0 aste");
  assert.equal(voce.style.color, "var(--rosso)");
  assert.equal(voce.getAttribute("aria-pressed"), "true");
  const gruppo = elenco._figli.find((li) => li.textContent === "Sezioni");
  assert.equal(gruppo.style.color, undefined);
  assert.equal(gruppo.getAttribute("aria-pressed"), undefined);
});
