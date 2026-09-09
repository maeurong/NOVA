import { test } from "node:test";
import assert from "node:assert/strict";
import {
  UNITA, modelloVuoto, prossimoId, nodo, asta, asteDelNodo, nodoVicino,
  sezione, materiale, asteDellaSezione, sezioniDelMateriale, vesteDi,
  azione, combinazione, combinazioniDellAzione, analisiCheUsano, analisiConMassaDa, nomeCaso,
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
test("lookup delle azioni e delle combinazioni, e chi usa chi", () => {
  const m = modelloVuoto();
  m.azioni.push({ id: 1, nome: "g", natura: "G2", categoria: null, generata: false, carichi: [] });
  m.combinazioni.push({ id: 1, nome: "SLU", termini: [{ azione: 1, coefficiente: 1.5 }], tipo: null, generata: false });
  m.analisi.push({ tipo: "statica", casi: ["Z1", "C1"] });
  assert.equal(azione(m, 1).nome, "g");
  assert.equal(azione(m, 2), null);
  assert.equal(combinazione(m, 1).nome, "SLU");
  assert.deepEqual(combinazioniDellAzione(m, 1).map((c) => c.id), [1]);
  assert.deepEqual(combinazioniDellAzione(m, 7), []);
  assert.equal(analisiCheUsano(m, "Z1").length, 1);
  assert.equal(analisiCheUsano(m, "Z9").length, 0);
  assert.equal(nomeCaso("azione", 3), "Z3");
  assert.equal(nomeCaso("combinazione", 1), "C1");
});

test("un caso lo nomina anche la pushover, in caso_gravita, e non solo la statica", () => {
  const m = modelloVuoto();
  m.analisi.push({ tipo: "pushover", distribuzione: "modo1", nodo_controllo: 1, dof: "ux",
                   incremento: 1, spostamento_max: 100, caso_gravita: "C1" });
  assert.equal(analisiCheUsano(m, "C1").length, 1, "caso_gravita non sta in casi, ma è un uso");
  assert.equal(analisiCheUsano(m, "Z1").length, 0);
  const scarica = { ...m, analisi: [{ ...m.analisi[0], caso_gravita: null }] };
  assert.equal(analisiCheUsano(scarica, "C1").length, 0);
  // Un'analisi senza `casi` (una modale, o una statica scritta a mano) non è un TypeError.
  assert.equal(analisiCheUsano({ ...m, analisi: [{ tipo: "modale" }, { tipo: "statica" }] }, "C1").length, 0);
});

test("la modale prende massa dall'azione per identificatore, non per nome di caso", () => {
  const m = modelloVuoto();
  m.analisi.push({ tipo: "modale", modi: "auto", masse_da_azioni: [{ azione: 2, coefficiente: 0.3 }] });
  assert.equal(analisiConMassaDa(m, 2).length, 1);
  assert.equal(analisiConMassaDa(m, 1).length, 0);
  assert.equal(analisiCheUsano(m, "Z2").length, 0, "nessun `casi` la nomina: serve il lookup suo");
  assert.equal(analisiConMassaDa({ ...m, analisi: [{ tipo: "modale" }] }, 2).length, 0);
  assert.equal(analisiConMassaDa(modelloVuoto(), 2).length, 0);
});
