import { test } from "node:test";
import assert from "node:assert/strict";
import { modelloVuoto } from "../modello.js";
import { ErroreComando, creaNodo, estrudi, spostaNodo, eliminaNodo, rinomina } from "../comandi.js";

test("crea un nodo con l'identificatore 1 e le coordinate date", () => {
  const m = creaNodo(modelloVuoto(), { x: 1200, z: 3400 });
  assert.equal(m.nodi.length, 1);
  assert.deepEqual(m.nodi[0], { id: 1, nome: null, x: 1200, y: 0, z: 3400 });
  assert.equal(m.contatori.nodo, 1);
});

test("il riduttore non tocca il modello che riceve", () => {
  const prima = modelloVuoto();
  creaNodo(prima, { x: 0, z: 0 });
  assert.deepEqual(prima.nodi, []);
});

test("coordinate che non sono numeri finiti si rifiutano", () => {
  for (const arg of [{ x: NaN, z: 0 }, { x: 0, z: Infinity }, { x: null, z: 0 }]) {
    assert.throws(() => creaNodo(modelloVuoto(), arg), ErroreComando);
  }
});

test("creaNodo su un punto già occupato entro la tolleranza si rifiuta", () => {
  const m = creaNodo(modelloVuoto(), { x: 0, z: 0 });
  assert.throws(() => creaNodo(m, { x: 0.5, z: 0 }), ErroreComando);
});

test("estrudi crea il nodo di arrivo e l'asta fra i due", () => {
  const m = estrudi(creaNodo(modelloVuoto(), { x: 0, z: 0 }), { da: 1, dx: 5000, dz: 0 });
  assert.equal(m.nodi.length, 2);
  assert.deepEqual(m.nodi[1], { id: 2, nome: null, x: 5000, y: 0, z: 0 });
  assert.deepEqual(m.aste[0], { id: 1, nome: null, nodo_i: 1, nodo_j: 2, sezione: null });
});

test("estrudi più corto della tolleranza si rifiuta: niente aste a lunghezza zero", () => {
  const uno = creaNodo(modelloVuoto(), { x: 0, z: 0 });
  assert.throws(() => estrudi(uno, { da: 1, dx: 0, dz: 0 }), ErroreComando);
  assert.throws(() => estrudi(uno, { da: 1, dx: 0.5, dz: 0 }), ErroreComando);
});

test("estrudi che arriva su un nodo esistente lo riusa invece di sdoppiarlo", () => {
  let m = creaNodo(modelloVuoto(), { x: 0, z: 0 });
  m = creaNodo(m, { x: 5000, z: 0 });
  m = estrudi(m, { da: 1, dx: 5000, dz: 0 });
  assert.equal(m.nodi.length, 2, "il nodo di arrivo esisteva già");
  assert.equal(m.aste[0].nodo_j, 2);
});

test("estrudi da un nodo che non esiste si rifiuta", () => {
  assert.throws(() => estrudi(modelloVuoto(), { da: 9, dx: 1000, dz: 0 }), ErroreComando);
});

test("estrudi non tocca il modello che riceve", () => {
  const prima = creaNodo(modelloVuoto(), { x: 0, z: 0 });
  const snapshot = structuredClone(prima);
  estrudi(prima, { da: 1, dx: 5000, dz: 0 });
  assert.deepEqual(prima, snapshot);
});

test("sposta un nodo e le aste lo seguono senza cambiare", () => {
  let m = estrudi(creaNodo(modelloVuoto(), { x: 0, z: 0 }), { da: 1, dx: 5000, dz: 0 });
  const asteprima = structuredClone(m.aste);
  m = spostaNodo(m, { id: 2, x: 5000, z: 3000 });
  assert.deepEqual(m.aste, asteprima, "l'asta referenzia gli identificatori, non le coordinate");
  assert.equal(m.nodi[1].z, 3000);
});

test("spostaNodo non tocca il modello che riceve", () => {
  const prima = estrudi(creaNodo(modelloVuoto(), { x: 0, z: 0 }), { da: 1, dx: 5000, dz: 0 });
  const snapshot = structuredClone(prima);
  spostaNodo(prima, { id: 2, x: 5000, z: 3000 });
  assert.deepEqual(prima, snapshot);
});

test("spostaNodo su coordinate che coincidono con un altro nodo si rifiuta", () => {
  let m = creaNodo(modelloVuoto(), { x: 0, z: 0 });
  m = creaNodo(m, { x: 5000, z: 0 });
  assert.throws(() => spostaNodo(m, { id: 1, x: 5000, z: 0 }), ErroreComando);
  assert.deepEqual(m.nodi[0], { id: 1, nome: null, x: 0, y: 0, z: 0 }, "il modello resta intatto");
});

test("elimina un nodo e con lui aste e carichi che lo nominano", () => {
  let m = estrudi(creaNodo(modelloVuoto(), { x: 0, z: 0 }), { da: 1, dx: 5000, dz: 0 });
  m = { ...m, azioni: [{ id: 1, nome: "Q", natura: "Q", generata: false, carichi: [
    { tipo: "nodale", nodo: 2, fz: -1200 },
    { tipo: "distribuito", asta: 1, q: -3, direzione: "z" },
    { tipo: "gravita", fattore_z: -1 },
  ] }] };
  m = eliminaNodo(m, { id: 2 });
  assert.deepEqual(m.nodi.map((n) => n.id), [1]);
  assert.deepEqual(m.aste, [], "l'asta toccava il nodo eliminato");
  assert.deepEqual(m.azioni[0].carichi, [{ tipo: "gravita", fattore_z: -1 }],
    "restano solo i carichi che non nominano né il nodo né l'asta spariti");
});

test("elimina un nodo che non esiste si rifiuta e lascia il modello intatto", () => {
  const m = creaNodo(modelloVuoto(), { x: 0, z: 0 });
  assert.throws(() => eliminaNodo(m, { id: 9 }), ErroreComando);
  assert.equal(m.nodi.length, 1);
});

test("eliminaNodo non tocca il modello che riceve, aste e carichi compresi", () => {
  let m = estrudi(creaNodo(modelloVuoto(), { x: 0, z: 0 }), { da: 1, dx: 5000, dz: 0 });
  m = { ...m, azioni: [{ id: 1, nome: "Q", natura: "Q", generata: false, carichi: [
    { tipo: "nodale", nodo: 2, fz: -1200 },
    { tipo: "distribuito", asta: 1, q: -3, direzione: "z" },
    { tipo: "gravita", fattore_z: -1 },
  ] }] };
  const snapshot = structuredClone(m);
  eliminaNodo(m, { id: 2 });
  assert.deepEqual(m, snapshot);
});

test("rinomina cambia il nome e mai l'identificatore", () => {
  const m = rinomina(creaNodo(modelloVuoto(), { x: 0, z: 0 }), { tipo: "nodo", id: 1, nome: "piede sinistro" });
  assert.equal(m.nodi[0].nome, "piede sinistro");
  assert.equal(m.nodi[0].id, 1);
});

test("rinomina accetta un nome già usato: il nome è libero, l'identità no", () => {
  let m = estrudi(creaNodo(modelloVuoto(), { x: 0, z: 0 }), { da: 1, dx: 5000, dz: 0 });
  m = rinomina(m, { tipo: "nodo", id: 1, nome: "piede" });
  m = rinomina(m, { tipo: "nodo", id: 2, nome: "piede" });
  assert.deepEqual(m.nodi.map((n) => [n.id, n.nome]), [[1, "piede"], [2, "piede"]]);
});

test("rinomina a nome vuoto si rifiuta", () => {
  const m = creaNodo(modelloVuoto(), { x: 0, z: 0 });
  assert.throws(() => rinomina(m, { tipo: "nodo", id: 1, nome: "   " }), ErroreComando);
});

test("rinomina non tocca il modello che riceve", () => {
  const prima = creaNodo(modelloVuoto(), { x: 0, z: 0 });
  const snapshot = structuredClone(prima);
  rinomina(prima, { tipo: "nodo", id: 1, nome: "piede" });
  assert.deepEqual(prima, snapshot);
});
