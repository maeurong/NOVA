import { test } from "node:test";
import assert from "node:assert/strict";
import { TETTO, aggiungi, leggi, scrivi } from "../recenti.js";

const deposito = (iniziale = {}) => {
  const dati = { ...iniziale };
  return {
    getItem: (k) => (k in dati ? dati[k] : null),
    setItem: (k, v) => { dati[k] = String(v); },
    _dati: dati,
  };
};

test("un percorso nuovo va in cima", () => {
  assert.deepEqual(aggiungi(["/b"], "/a"), ["/a", "/b"]);
});

test("un percorso già presente risale invece di duplicarsi", () => {
  assert.deepEqual(aggiungi(["/a", "/b", "/c"], "/c"), ["/c", "/a", "/b"]);
});

test("un percorso vuoto o di soli spazi non entra", () => {
  assert.deepEqual(aggiungi(["/a"], ""), ["/a"]);
  assert.deepEqual(aggiungi(["/a"], "   "), ["/a"]);
});

test("oltre il tetto cadono i più vecchi, in ordine", () => {
  const molti = Array.from({ length: TETTO }, (_, i) => `/f${i}`);
  const dopo = aggiungi(molti, "/nuovo");
  assert.equal(dopo.length, TETTO);
  assert.equal(dopo[0], "/nuovo");
  assert.equal(dopo.at(-1), `/f${TETTO - 2}`, "l'ultimo di prima è caduto");
});

test("legge quel che è stato scritto", () => {
  const d = deposito();
  scrivi(d, ["/a", "/b"]);
  assert.deepEqual(leggi(d), ["/a", "/b"]);
});

test("un deposito che solleva non rompe niente", () => {
  const rotto = {
    getItem() { throw new Error("dati del sito bloccati"); },
    setItem() { throw new Error("dati del sito bloccati"); },
  };
  assert.deepEqual(leggi(rotto), []);
  assert.doesNotThrow(() => scrivi(rotto, ["/a"]));
});

test("contenuto malformato nel deposito vale come elenco vuoto", () => {
  assert.deepEqual(leggi(deposito({ "nova.recenti": "{" })), []);
  assert.deepEqual(leggi(deposito({ "nova.recenti": '{"a":1}' })), []);
  assert.deepEqual(leggi(deposito({ "nova.recenti": '["/a", 7]' })), []);
});
