import { test } from "node:test";
import assert from "node:assert/strict";
import { modelloVuoto } from "../modello.js";
import { ErroreComando, creaNodo } from "../comandi.js";
import { nuovaCronologia, applica, corrente, indietro, avanti, etichette } from "../cronologia.js";

test("la cronologia nasce con il modello ricevuto e una sola voce", () => {
  const c = nuovaCronologia(modelloVuoto());
  assert.deepEqual(corrente(c).nodi, []);
  assert.equal(etichette(c).length, 1);
  assert.equal(etichette(c)[0].attiva, true);
});

test("applica aggiunge uno snapshot e sposta il presente in fondo", () => {
  const c = applica(nuovaCronologia(modelloVuoto()), (m) => creaNodo(m, { x: 0, z: 0 }), "nodo 1");
  assert.equal(corrente(c).nodi.length, 1);
  assert.deepEqual(etichette(c).map((e) => e.etichetta), ["modello vuoto", "nodo 1"]);
});

test("indietro torna allo snapshot di prima senza perdere quello dopo", () => {
  let c = applica(nuovaCronologia(modelloVuoto()), (m) => creaNodo(m, { x: 0, z: 0 }), "nodo 1");
  c = indietro(c);
  assert.equal(corrente(c).nodi.length, 0);
  c = avanti(c);
  assert.equal(corrente(c).nodi.length, 1);
});

test("indietro sulla cronologia appena nata non va sotto zero", () => {
  const c = nuovaCronologia(modelloVuoto());
  assert.deepEqual(indietro(c), c);
  assert.deepEqual(avanti(c), c);
});

test("un comando che si rifiuta non lascia traccia nella cronologia", () => {
  const c = applica(nuovaCronologia(modelloVuoto()), (m) => creaNodo(m, { x: 0, z: 0 }), "nodo 1");
  assert.throws(() => applica(c, (m) => creaNodo(m, { x: NaN, z: 0 }), "nodo storto"), ErroreComando);
  assert.equal(etichette(c).length, 2, "la cronologia di prima è intatta");
});

test("un comando dopo un indietro taglia il futuro invece di biforcarlo", () => {
  let c = applica(nuovaCronologia(modelloVuoto()), (m) => creaNodo(m, { x: 0, z: 0 }), "nodo 1");
  c = applica(c, (m) => creaNodo(m, { x: 5000, z: 0 }), "nodo 2");
  c = indietro(c);
  c = applica(c, (m) => creaNodo(m, { x: 0, z: 3000 }), "nodo 3");
  assert.deepEqual(etichette(c).map((e) => e.etichetta), ["modello vuoto", "nodo 1", "nodo 3"]);
  assert.equal(corrente(c).nodi.length, 2, "nodo 3 c'è, nodo 2 no");
  assert.equal(etichette(c).length, 3, "snapshot ed etichette restano allineati");
  assert.equal(c.snapshot.length, etichette(c).length, "stessa lunghezza, nessun disallineamento");
  c = indietro(c);
  assert.equal(corrente(c).nodi.length, 1, "indietro dopo il taglio torna a nodo 1, non a nodo 2");
});
