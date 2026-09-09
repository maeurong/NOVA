import { test } from "node:test";
import assert from "node:assert/strict";
import { filtraVoci, punteggio, creaPalette, NESSUN_COMANDO } from "../palette.js";
import { TASTI } from "../tastiera.js";

const primo = (q) => filtraVoci(TASTI, q)[0];

// --- filtraVoci / punteggio (puri) ------------------------------------------

test("query vuota: tutte le voci, nell'ordine della tastiera, senza valore", () => {
  const r = filtraVoci(TASTI, "  ");
  assert.equal(r.length, TASTI.length);  // nessun tetto a query vuota: è la lista che insegna le scorciatoie
  assert.deepEqual(r.map((x) => x.voce.codice), TASTI.map((v) => v.codice));
  assert.ok(r.some((x) => x.voce.codice === "carico"));
  assert.ok(r.every((x) => x.valore === null));
});
test("query vuota per davvero, non solo di spazi", () => {
  assert.equal(filtraVoci(TASTI, "").length, TASTI.length);
});
test("la prima parola trova il comando, il resto è il valore", () => {
  assert.equal(primo("sezione 300 × 500").voce.codice, "sezione");
  assert.equal(primo("sezione 300 × 500").valore, "300 × 500");
  assert.equal(primo("rinomina piede sinistro").valore, "piede sinistro");
  assert.equal(primo("nodo").valore, null);
});
test("il tasto vale come nome: «q -12,5» è il carico", () => {
  assert.equal(primo("q -12,5").voce.codice, "carico");
  assert.equal(primo("q -12,5").valore, "-12,5");
});
test("il tasto si cerca senza distinzione di maiuscole", () => {
  assert.equal(primo("Q").voce.codice, "carico");
});
// Le voci con `modificatore` non entrano nel match del tasto: «⌘k» non è un nome che si
// digita, e la palette si trova per etichetta come ogni altro comando.
test("il tasto col modificatore non fa nome, l'etichetta sì", () => {
  assert.deepEqual(filtraVoci(TASTI, "⌘k"), []);
  assert.ok(filtraVoci(TASTI, "com").some((x) => x.voce.codice === "palette"));
});
// ⌘Z si chiama «disfa» dal fix round 1: prima «annulla» ne trovava due, distinguibili solo
// dal tasto stampato a destra.
test("«annulla» trova una voce sola: l'etichetta non è di due comandi", () => {
  const r = filtraVoci(TASTI, "annulla");
  assert.equal(r.length, 1);
  assert.equal(r[0].voce.codice, "annulla");
});
test("sottosequenza e assenza", () => {
  assert.ok(filtraVoci(TASTI, "sz").some((x) => x.voce.codice === "sezione"));
  assert.deepEqual(filtraVoci(TASTI, "xyz"), []);
  assert.deepEqual(filtraVoci([], "nodo"), []);
});
test("con una query il tetto è nove, e chi porta la lettera in testa viene prima", () => {
  const r = filtraVoci(TASTI, "a");
  assert.equal(r.length, 9);
  assert.equal(r[0].voce.codice, "asta");  // il tasto A vale 120, più di ogni nome
  const dove = (c) => r.findIndex((x) => x.voce.codice === c);
  // `salva` porta la «a» in seconda lettera: sta dopo tutti quelli che ce l'hanno in testa.
  for (const c of ["apri", "azione", "annulla"]) assert.ok(dove(c) >= 0 && dove(c) < dove("salva"), c);
});
test("punteggio: la sottostringa in testa vale più di quella in coda, e più della sottosequenza", () => {
  assert.ok(punteggio("asta", "a") > punteggio("materiale", "a"));
  assert.ok(punteggio("sezione", "sez") > punteggio("sezione", "sz"));
  assert.equal(punteggio("nodo", "x"), 0);
});

// --- il riquadro, sul DOM finto ---------------------------------------------
// Stampo di `test/pannello.test.js:10-35`, con tre aggiunte che lì non servivano:
// `querySelector` (la palette cerca campo, elenco e stato dentro la radice), `children`
// (le frecce spostano `aria-selected` sui figli invece di ridisegnare) e un `dispatch` che
// porta l'evento vero — `key`, `preventDefault`, `stopPropagation` — che il finto del
// pannello non ha perché lì nessun listener li leggeva.

function elementoFinto() {
  const listeners = {};
  return {
    textContent: "", hidden: false, className: "", id: "", value: "",
    dataset: {}, _figli: [], _attrs: {},
    get children() { return this._figli; },
    setAttribute(k, v) { this._attrs[k] = String(v); },
    getAttribute(k) { return this._attrs[k]; },
    addEventListener(ev, fn) { (listeners[ev] ??= []).push(fn); },
    dispatch(ev, dettaglio = {}) {
      (listeners[ev] ?? []).forEach((fn) => fn({ preventDefault() {}, stopPropagation() {}, ...dettaglio }));
    },
    append(...figli) { this._figli.push(...figli); },
    replaceChildren(...figli) { this._figli = figli; },
    focus() { globalThis.document.activeElement = this; },
  };
}

globalThis.document = {
  activeElement: null,
  createElement: () => elementoFinto(),
  createTextNode: (t) => ({ nodeType: 3, textContent: t }),
};

function riquadroFinto() {
  const campo = elementoFinto(), elenco = elementoFinto(), stato = elementoFinto();
  const radice = elementoFinto();
  radice.querySelector = (s) => ({ input: campo, ul: elenco, p: stato }[s]);
  return { radice, campo, elenco, stato };
}

const conPalette = (suScelta = () => {}) => {
  const parti = riquadroFinto();
  return { ...parti, p: creaPalette(parti.radice, { suScelta }) };
};

test("apri due volte: un riquadro solo, campo svuotato", () => {
  const { p, campo, elenco } = conPalette();
  p.apri({ voci: TASTI, disponibili: new Set() });
  campo.value = "sezione";
  p.apri({ voci: TASTI, disponibili: new Set() });
  assert.equal(campo.value, "");
  assert.equal(p.aperta, true);
  assert.equal(elenco.children.length, TASTI.length);  // ridisegnata, non accodata
});

test("chiudi su una palette chiusa non solleva", () => {
  const { p } = conPalette();
  p.chiudi();
  p.chiudi();
  assert.equal(p.aperta, false);
});

test("Invio senza voci: nessuna scelta, la palette resta aperta", () => {
  let scelte = 0;
  const { p, campo, elenco, stato } = conPalette(() => { scelte++; });
  p.apri({ voci: TASTI, disponibili: new Set() });
  campo.value = "xyz";
  campo.dispatch("input");
  campo.dispatch("keydown", { key: "Enter" });
  assert.equal(scelte, 0);
  assert.equal(p.aperta, true);
  // La frase sta nel `role="status"` e in nessun altro posto: il `listbox` resta vuoto
  // invece di ospitare un `<li>` che non è un `option`, e non la si legge due volte.
  assert.equal(stato.textContent, NESSUN_COMANDO);
  assert.equal(elenco.children.length, 0);
  assert.equal(campo.getAttribute("aria-activedescendant"), "");
});

test("tornata a trovare qualcosa, lo stato tace", () => {
  const { p, campo, stato } = conPalette();
  p.apri({ voci: TASTI, disponibili: new Set() });
  campo.value = "xyz"; campo.dispatch("input");
  campo.value = "nodo"; campo.dispatch("input");
  assert.equal(stato.textContent, "");
});

test("le frecce restano ai bordi, e aria-activedescendant le segue", () => {
  const { p, campo, elenco } = conPalette();
  p.apri({ voci: TASTI, disponibili: new Set() });
  campo.dispatch("keydown", { key: "ArrowUp" });  // ↑ sulla prima resta sulla prima
  assert.equal(campo.getAttribute("aria-activedescendant"), "palette-voce-0");
  assert.equal(elenco.children[0].getAttribute("aria-selected"), "true");
  const ultima = TASTI.length - 1;
  for (let i = 0; i < TASTI.length + 5; i++) campo.dispatch("keydown", { key: "ArrowDown" });
  assert.equal(campo.getAttribute("aria-activedescendant"), `palette-voce-${ultima}`);
  assert.equal(elenco.children[ultima].getAttribute("aria-selected"), "true");
  assert.equal(elenco.children[0].getAttribute("aria-selected"), "false");
});

// Il difetto del round 1: ogni freccia rifaceva la lista, e con 22 voci in `max-height: 50vh`
// il ridisegno azzerava lo scorrimento — la voce attiva finiva fuori dalla vista.
test("le frecce non rifanno la lista: lo scorrimento non si azzera", () => {
  const { p, campo, elenco } = conPalette();
  p.apri({ voci: TASTI, disponibili: new Set() });
  const terza = elenco.children[2];
  campo.dispatch("keydown", { key: "ArrowDown" });
  campo.dispatch("keydown", { key: "ArrowDown" });
  assert.equal(elenco.children[2], terza, "la freccia ha ricreato i <li>");
});

test("apri senza disponibili: tutte «non ora», nessuna eccezione", () => {
  const { p, elenco } = conPalette();
  p.apri({ voci: TASTI });
  assert.equal(elenco.children.length, TASTI.length);
  assert.ok(elenco.children.every((li) => li.className === "non-ora"));
});

test("Invio sceglie la voce attiva col suo valore, e chiude", () => {
  let visto = null;
  const { p, campo } = conPalette((voce, valore) => { visto = [voce.codice, valore]; });
  p.apri({ voci: TASTI, disponibili: new Set(["sezione"]) });
  campo.value = "sezione 300 × 500";
  campo.dispatch("input");
  campo.dispatch("keydown", { key: "Enter" });
  assert.deepEqual(visto, ["sezione", "300 × 500"]);
  assert.equal(p.aperta, false);
});

test("Esc e Tab chiudono, e il fuoco che se ne va pure", () => {
  for (const key of ["Escape", "Tab"]) {
    const { p, campo } = conPalette();
    p.apri({ voci: TASTI, disponibili: new Set() });
    campo.dispatch("keydown", { key });
    assert.equal(p.aperta, false, key);
  }
  const { p, campo } = conPalette();
  p.apri({ voci: TASTI, disponibili: new Set() });
  campo.dispatch("blur");
  assert.equal(p.aperta, false);
});
