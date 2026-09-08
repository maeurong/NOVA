import { test } from "node:test";
import assert from "node:assert/strict";
import {
  UNITA, modelloVuoto, prossimoId, nodo, asta, asteDelNodo, nodoVicino,
  sezione, materiale, asteDellaSezione, sezioniDelMateriale, vesteDi,
} from "../modello.js";

const conNodi = () => ({
  ...modelloVuoto(),
  contatori: { nodo: 2, asta: 1 },
  nodi: [{ id: 1, x: 0, y: 0, z: 0 }, { id: 2, x: 5000, y: 0, z: 0 }],
  aste: [{ id: 1, nodo_i: 1, nodo_j: 2, sezione: null }],
});

test("il modello vuoto dichiara unità e schema come nova/modello.py", () => {
  const m = modelloVuoto();
  assert.equal(m.unita, UNITA);
  assert.equal(m.unita, "mm-N-MPa-t-s");
  assert.equal(m.schema_version, 1);
  assert.deepEqual(m.nodi, []);
  assert.deepEqual(m.aste, []);
});

test("il primo identificatore di una lista vuota è 1, non -Infinity", () => {
  assert.equal(prossimoId(modelloVuoto(), "nodo"), 1);
});

test("un identificatore cancellato non si riusa: vince il contatore", () => {
  const m = { ...modelloVuoto(), contatori: { nodo: 7 }, nodi: [{ id: 3, x: 0, y: 0, z: 0 }] };
  assert.equal(prossimoId(m, "nodo"), 8);
});

test("un tipo sconosciuto solleva invece di produrre NaN", () => {
  assert.throws(() => prossimoId(modelloVuoto(), "pinguino"), /pinguino/);
});

test("le letture su un modello vuoto non sollevano", () => {
  const m = modelloVuoto();
  assert.equal(nodo(m, 1), null);
  assert.equal(asta(m, 1), null);
  assert.deepEqual(asteDelNodo(m, 1), []);
  assert.equal(nodoVicino(m, 0, 0, 0), null);
  assert.equal(sezione(m, 1), null);
  assert.equal(materiale(m, 1), null);
  assert.deepEqual(asteDellaSezione(m, 1), []);
  assert.deepEqual(sezioniDelMateriale(m, 1), []);
});

test("asteDelNodo trova l'asta da entrambe le estremità", () => {
  const m = conNodi();
  assert.deepEqual(asteDelNodo(m, 1).map((a) => a.id), [1]);
  assert.deepEqual(asteDelNodo(m, 2).map((a) => a.id), [1]);
});

test("nodoVicino trova un nodo entro il millimetro e non oltre", () => {
  const m = conNodi();
  assert.equal(nodoVicino(m, 0.4, 0, 0).id, 1);
  assert.equal(nodoVicino(m, 3, 0, 0), null);
});

test("il confine della tolleranza è stretto: a un millimetro esatto il nodo non è vicino", () => {
  const m = conNodi();
  assert.equal(nodoVicino(m, 1.0, 0, 0), null, "1,0 mm è già fuori, come in nova/check.py");
  assert.equal(nodoVicino(m, 0.999, 0, 0).id, 1, "appena sotto è dentro");
});

test("il modello vuoto porta le impostazioni dell'analisi con la veste media", () => {
  assert.deepEqual(modelloVuoto().impostazioni_analisi, { fibre: 10, veste: "media" });
});
test("vesteDi regge un modello salvato senza impostazioni", () => {
  const m = modelloVuoto(); delete m.impostazioni_analisi;
  assert.equal(vesteDi(m), "media");
});
test("sezione e materiale tornano null su un identificatore assente", () => {
  assert.equal(sezione(modelloVuoto(), 99), null);
  assert.equal(materiale(modelloVuoto(), 99), null);
});
test("asteDellaSezione e sezioniDelMateriale elencano chi referenzia", () => {
  const m = modelloVuoto();
  m.materiali.push({ id: 1, nome: "C25/30", tipo: "calcestruzzo", classe: "C25/30", valori: {}, personalizzato: false });
  m.sezioni.push({ id: 1, nome: "300 × 500", tipo: "rettangolare", b: 300, h: 500, calcestruzzo: 1, acciaio: 2, copriferro: 30, file: [], staffe: null });
  m.aste.push({ id: 1, nome: null, nodo_i: 7, nodo_j: 2, sezione: 1 }, { id: 2, nome: null, nodo_i: 2, nodo_j: 3, sezione: null });
  assert.deepEqual(asteDellaSezione(m, 1).map((a) => a.id), [1]);
  assert.deepEqual(sezioniDelMateriale(m, 1).map((s) => s.id), [1]);
  assert.deepEqual(sezioniDelMateriale(m, 2).map((s) => s.id), [1]);
});
