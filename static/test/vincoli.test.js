import { test } from "node:test";
import assert from "node:assert/strict";
import { GRADI, PREIMPOSTAZIONI, vincoloVuoto, nomePreimpostazione, descrizione } from "../vincoli.js";

test("i sei gradi sono nell'ordine di nova/modello.py", () => {
  assert.deepEqual(GRADI, ["ux", "uy", "uz", "rx", "ry", "rz"]);
});

test("l'incastro blocca tutto", () => {
  assert.deepEqual(PREIMPOSTAZIONI.incastro, { ux: true, uy: true, uz: true, rx: true, ry: true, rz: true });
});

test("la cerniera lascia libere le rotazioni", () => {
  const c = PREIMPOSTAZIONI.cerniera;
  assert.deepEqual([c.ux, c.uy, c.uz], [true, true, true]);
  assert.deepEqual([c.rx, c.ry, c.rz], [false, false, false]);
});

test("il carrello lascia libero ux e trattiene il fuori piano", () => {
  const c = PREIMPOSTAZIONI.carrello;
  assert.equal(c.ux, false, "il carrello scorre lungo x");
  assert.equal(c.uy, true, "fuori piano trattenuto: il modello e' spaziale");
  assert.equal(c.uz, true);
});

test("ogni preimpostazione si riconosce da sé", () => {
  for (const [nome, v] of Object.entries(PREIMPOSTAZIONI)) {
    assert.equal(nomePreimpostazione(v), nome);
  }
});

test("nessun vincolo, o tutto libero, non è una preimpostazione", () => {
  assert.equal(nomePreimpostazione(null), null);
  assert.equal(nomePreimpostazione(undefined), null);
  assert.equal(nomePreimpostazione(vincoloVuoto()), null);
});

test("un vincolo che non corrisponde a nessuna torna null", () => {
  assert.equal(nomePreimpostazione({ ...vincoloVuoto(), rx: true }), null);
});

test("chiavi in più non confondono il riconoscimento", () => {
  assert.equal(nomePreimpostazione({ ...PREIMPOSTAZIONI.incastro, pinguino: true }), "incastro");
});

test("un vincolo scritto a mano con 1 e 0 si riconosce lo stesso", () => {
  assert.equal(nomePreimpostazione(Object.fromEntries(GRADI.map((g) => [g, 1]))), "incastro");
  assert.equal(nomePreimpostazione(Object.fromEntries(GRADI.map((g) => [g, 0]))), null);
});

test("le preimpostazioni sono congelate: un modulo non le rompe per gli altri", () => {
  // Una costante condivisa modificabile è un difetto che viaggia: un `incastro` senza `ux`
  // smetterebbe di essere riconosciuto ovunque, non solo dove è stato toccato.
  const prima = { ...PREIMPOSTAZIONI.incastro };
  assert.throws(() => { PREIMPOSTAZIONI.incastro.ux = false; }, TypeError);
  assert.deepEqual(PREIMPOSTAZIONI.incastro, prima);
});

test("la descrizione elenca i gradi nell'ordine di GRADI, non delle chiavi", () => {
  assert.equal(descrizione({ rz: true, ux: true, uy: false, uz: false, rx: false, ry: false }),
               "bloccati: ux, rz");
});

test("la descrizione dice il nome quando c'è, i gradi quando non c'è", () => {
  assert.equal(descrizione(PREIMPOSTAZIONI.incastro), "incastro");
  assert.equal(descrizione(null), "libero");
  assert.equal(descrizione(vincoloVuoto()), "libero");
  assert.equal(descrizione({ ...vincoloVuoto(), ux: true, rz: true }), "bloccati: ux, rz");
});
