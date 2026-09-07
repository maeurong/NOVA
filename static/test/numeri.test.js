import { test } from "node:test";
import assert from "node:assert/strict";
import { leggiNumero, stampaNumero, leggiEspressione, leggiLunghezza } from "../numeri.js";

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

test("senza virgola il punto resta decimale, anche quando sembra migliaia", () => {
  assert.equal(leggiNumero("1.234"), 1.234);
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

test("l'espressione vuota o solo spazi è null, non zero", () => {
  assert.equal(leggiEspressione(""), null);
  assert.equal(leggiEspressione("   "), null);
});

test("un'espressione incompleta o malformata è null", () => {
  for (const t of ["2.5*", "*5", "2 3"]) {
    assert.equal(leggiEspressione(t), null, `«${t}» doveva essere null`);
  }
});

test("le parentesi non bilanciate sono null", () => {
  assert.equal(leggiEspressione("(3+2"), null);
  assert.equal(leggiEspressione("3+2)"), null);
});

test("la divisione per zero è null, non Infinity", () => {
  assert.equal(leggiEspressione("5/0"), null);
});

test("la moltiplicazione precede l'addizione", () => {
  assert.equal(leggiEspressione("2+3*4"), 14);
});

test("le parentesi cambiano la precedenza", () => {
  assert.equal(leggiEspressione("(2+3)*4"), 20);
});

test("la virgola decimale italiana vive dentro le espressioni", () => {
  assert.equal(leggiEspressione("2,5*3"), 7.5);
});

test("anche la forma con le migliaia vive dentro le espressioni", () => {
  assert.equal(leggiEspressione("1.234,5+0,5"), 1235);
});

test("senza virgola il punto resta decimale anche dentro un'espressione", () => {
  assert.equal(leggiEspressione("1.234"), 1.234);
});

test("un ingresso che non è una stringa è null, non solleva", () => {
  for (const v of [null, undefined, 42, {}]) {
    assert.equal(leggiEspressione(v), null);
  }
});

test("un'espressione lunga non sfonda lo stack", () => {
  const t = Array(100).fill("1").join("+");
  assert.equal(leggiEspressione(t), 100);
});

test("il suffisso d'unità converte in millimetri", () => {
  assert.equal(leggiLunghezza("30cm"), 300);
  assert.equal(leggiLunghezza("2,5m"), 2500);
  assert.equal(leggiLunghezza("1200"), 1200);
});

test("lo spazio prima dell'unità non cambia il senso", () => {
  assert.equal(leggiLunghezza("30 cm"), 300);
});

test("un'unità non prevista è null, non un'ipotesi", () => {
  assert.equal(leggiLunghezza("30km"), null);
  assert.equal(leggiLunghezza("30 pollici"), null);
});

test("un ingresso che non è una stringa è null anche per la lunghezza", () => {
  for (const v of [null, undefined, 42, {}]) {
    assert.equal(leggiLunghezza(v), null);
  }
});

// --- segno unario ---
// `leggiNumero("-5")` funziona da sempre: senza questi casi l'espressione accetterebbe **meno**
// del campo che sostituisce, e una coordinata negativa è normale quanto una positiva.

test("espressione: il meno unario, da solo e dentro un'operazione", () => {
  assert.equal(leggiEspressione("-5"), -5);
  assert.equal(leggiEspressione("3*-2"), -6);
  assert.equal(leggiEspressione("-5+3"), -2);
  assert.equal(leggiEspressione("(-5)*2"), -10);
});

test("espressione: il più unario non cambia il segno", () => {
  assert.equal(leggiEspressione("+5"), 5);
  assert.equal(leggiEspressione("2*+3"), 6);
});

test("espressione: due meno di fila si annullano, come in aritmetica", () => {
  assert.equal(leggiEspressione("2--3"), 5);
  assert.equal(leggiEspressione("--5"), 5);
});

test("espressione: il segno unario coerente con leggiNumero, che lo accetta da sempre", () => {
  assert.equal(leggiEspressione("-1.234,5"), leggiNumero("-1.234,5"));
  assert.equal(leggiEspressione("-2,5"), -2.5);
});

test("lunghezza: una quota negativa con l'unità", () => {
  assert.equal(leggiLunghezza("-30cm"), -300);
  assert.equal(leggiLunghezza("-2,5m"), -2500);
});

test("espressione: un segno senza operando resta null", () => {
  for (const t of ["-", "+", "3*-", "-)"]) {
    assert.equal(leggiEspressione(t), null, `«${t}» doveva essere null`);
  }
});
