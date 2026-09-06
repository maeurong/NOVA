import { test } from "node:test";
import assert from "node:assert/strict";
import { leggiNumero, stampaNumero } from "../numeri.js";

test("la virgola separa i decimali", () => {
  assert.equal(leggiNumero("2,5"), 2.5);
});

test("il punto decimale inglese si legge lo stesso, non come migliaia", () => {
  assert.equal(leggiNumero("2.5"), 2.5);
});

test("il punto separa le migliaia quando la virgola c'è già", () => {
  assert.equal(leggiNumero("1.234,5"), 1234.5);
});

test("gli spazi attorno non contano", () => {
  assert.equal(leggiNumero("  1200 "), 1200);
});

test("quel che non è un numero è null, mai NaN", () => {
  for (const t of ["", "   ", "abc", "1,2,3", "--3", "1,2.3"]) {
    assert.equal(leggiNumero(t), null, `«${t}» doveva essere null`);
  }
});

test("stampa con la virgola decimale", () => {
  assert.equal(stampaNumero(2.5), "2,5");
});

test("stampa le migliaia col punto solo se richiesto", () => {
  assert.equal(stampaNumero(1234.5, { migliaia: true }), "1.234,5");
  assert.equal(stampaNumero(1234.5), "1234,5");
});

test("le migliaia senza decimali non lasciano una coda vuota", () => {
  assert.equal(stampaNumero(5000, { decimali: 0, migliaia: true }), "5.000");
  assert.equal(stampaNumero(-5000, { decimali: 0, migliaia: true }), "-5.000");
  assert.equal(stampaNumero(0, { decimali: 0, migliaia: true }), "0");
});

test("un numero che non è finito si stampa come trattino, mai NaN", () => {
  assert.equal(stampaNumero(NaN), "—");
  assert.equal(stampaNumero(Infinity), "—");
});

test("uno zero non porta mai il segno meno", () => {
  assert.equal(stampaNumero(-0.4, { decimali: 0 }), "0");
  assert.equal(stampaNumero(-0, { decimali: 1 }), "0,0");
  assert.equal(stampaNumero(-0.6, { decimali: 0 }), "-1", "il meno resta quando il numero non è zero");
});
