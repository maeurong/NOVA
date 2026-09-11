import { test } from "node:test";
import assert from "node:assert/strict";
import { fase, movimentoRidotto, creaAnimazione, PERIODO_MS } from "../animazione.js";

test("fase: seno di un ciclo al secondo", () => {
  assert.equal(fase(0), 0);
  assert.ok(Math.abs(fase(250) - 1) < 1e-9);
  assert.ok(Math.abs(fase(750) + 1) < 1e-9);
  assert.ok(Math.abs(fase(PERIODO_MS)) < 1e-9);
  assert.ok(Math.abs(fase(500, 2000) - 1) < 1e-9);
});
test("movimentoRidotto: legge matchMedia, senza matchMedia è falso", () => {
  assert.equal(movimentoRidotto({ matchMedia: () => ({ matches: true }) }), true);
  assert.equal(movimentoRidotto({ matchMedia: () => ({ matches: false }) }), false);
  assert.equal(movimentoRidotto({}), false);
});
test("creaAnimazione: i fotogrammi arrivano finché non si ferma; avvia due volte non raddoppia", () => {
  const coda = [];
  let t = 0;
  const fotogrammi = [];
  const a = creaAnimazione({ suFotogramma: (f) => fotogrammi.push(f), orologio: () => t, richiedi: (fn) => coda.push(fn) });
  assert.equal(a.inCorso(), false);
  a.avvia(); a.avvia();
  assert.equal(coda.length, 1, "una sola richiesta in volo");
  t = 250; coda.shift()();          // primo fotogramma
  assert.ok(Math.abs(fotogrammi[0] - 1) < 1e-9);
  assert.equal(coda.length, 1);
  a.ferma();
  t = 500; coda.shift()();          // un fotogramma già richiesto arriva dopo `ferma`: non chiama più
  assert.equal(fotogrammi.length, 1);
  assert.equal(coda.length, 0);
  assert.equal(a.inCorso(), false);
});
test("creaAnimazione: riprende dalla fase dov'era, non da capo", () => {
  // D2a dice «riprende»: con `t0` azzerato a ogni `avvia` la forma saltava da fase 0,998 a 0,063,
  // cioè un centinaio di millimetri a ×50 su uno `Spazio` che si legge come «continua».
  const coda = [];
  let t = 0;
  const fotogrammi = [];
  const a = creaAnimazione({ suFotogramma: (f) => fotogrammi.push(f), orologio: () => t, richiedi: (fn) => coda.push(fn) });
  a.avvia();
  t = 250; coda.shift()();
  assert.ok(Math.abs(fotogrammi[0] - 1) < 1e-9, "fase 1: la forma è al massimo");
  a.ferma();
  t = 1000; a.avvia();              // tre quarti di secondo di pausa
  coda.shift()();
  assert.ok(Math.abs(fotogrammi[1] - 1) < 1e-9, `riprende da fase 1, non da 0: ${fotogrammi[1]}`);
  t = 1250; coda.shift()();
  assert.ok(Math.abs(fotogrammi[2]) < 1e-9, "e da lì il tempo scorre di nuovo");
});
test("creaAnimazione: `ferma` senza `avvia` non solleva, e `avvia` dopo parte da fase 0", () => {
  const coda = [];
  let t = 0;
  const fotogrammi = [];
  const a = creaAnimazione({ suFotogramma: (f) => fotogrammi.push(f), orologio: () => t, richiedi: (fn) => coda.push(fn) });
  a.ferma();
  assert.equal(coda.length, 0);
  assert.equal(a.inCorso(), false);
  t = 1234; a.avvia();              // il tempo riparte dall'istante di `avvia`, non dal caricamento
  assert.equal(a.inCorso(), true);
  t = 1234 + 250; coda.shift()();
  assert.ok(Math.abs(fotogrammi[0] - 1) < 1e-9);
  a.ferma(); coda.shift()();
  assert.equal(fotogrammi.length, 1);
  // Riavviata dopo un `ferma` che aveva lasciato un fotogramma in volo: una richiesta sola.
  a.avvia();
  assert.equal(coda.length, 1);
});
