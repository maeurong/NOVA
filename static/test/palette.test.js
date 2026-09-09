import { test } from "node:test";
import assert from "node:assert/strict";
import { filtraVoci, punteggio } from "../palette.js";
import { TASTI } from "../tastiera.js";

const primo = (q) => filtraVoci(TASTI, q)[0];

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
