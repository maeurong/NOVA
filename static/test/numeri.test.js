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

// 11c/D: il separatore stampato è lo spazio fine unificatore, non il punto. Col punto
// «3.000» rientrava da `leggiNumero` come **3** — mille volte meno, e in silenzio.
const SF = "\u202F";

test("stampa le migliaia con lo spazio fine solo se richiesto, mai col punto", () => {
  assert.equal(stampaNumero(1234.5, { migliaia: true }), `1${SF}234,5`);
  assert.equal(stampaNumero(1234.5), "1234,5");
  assert.ok(!stampaNumero(1234.5, { migliaia: true }).includes("."), "il punto non è più il separatore");
});

test("le migliaia senza decimali non lasciano una coda vuota", () => {
  assert.equal(stampaNumero(5000, { decimali: 0, migliaia: true }), `5${SF}000`);
  assert.equal(stampaNumero(-5000, { decimali: 0, migliaia: true }), `-5${SF}000`);
  assert.equal(stampaNumero(0, { decimali: 0, migliaia: true }), "0");
});

// --- ingresso degenere: quel che il piano stampa, riletto dal campo -------------
// Il contratto che mancava: l'uscita di `stampaNumero` deve rientrare dalla propria porta.
// Prima non ci rientrava mai con `migliaia: true`, perché la virgola non compare con
// `decimali: 0` e il punto resta decimale (`leggiNumero`, regola in testa al modulo).
test("quel che stampaNumero scrive, leggiNumero lo rilegge identico", () => {
  for (const v of [3000, 12500, 1234.5, -5000, 0, 999, 1000000]) {
    for (const decimali of [0, 1]) {
      const scritto = stampaNumero(v, { migliaia: true, decimali });
      assert.equal(leggiNumero(scritto), Number(v.toFixed(decimali)),
        `«${scritto}» (da ${v}, ${decimali} decimali) non rientra dalla propria porta`);
    }
  }
});

test("e ci rientra anche passando dal campo, che legge espressioni e unità", () => {
  assert.equal(leggiLunghezza(`${stampaNumero(12500, { migliaia: true, decimali: 0 })} mm`), 12500);
  assert.equal(leggiEspressione(stampaNumero(3000, { migliaia: true, decimali: 0 })), 3000);
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

// --- 11c/C: la moltiplicazione per l'unità sta **dopo** la guardia sul finito ---
// `leggiEspressione` guarda il proprio risultato, non i millimetri: «1e306 m» arriva finito
// e ne esce `Infinity`, che diventa un `viewBox` di `NaN` e svuota il piano mentre si scrive.
test("lunghezza: un valore che eccede il finito è null, non Infinity", () => {
  const enorme = "1" + "0".repeat(306);      // 1e306: finito, finché non lo si porta in mm
  const enormissimo = "1" + "0".repeat(308); // 1e308: finito, e ×10 non lo è più
  assert.equal(leggiLunghezza(`${enorme}m`), null);
  assert.equal(leggiLunghezza(`${enormissimo}cm`), null);
  assert.equal(leggiLunghezza(`-${enorme}m`), null);
  // e la stessa cifra in millimetri, che finita lo è, continua a passare
  assert.equal(leggiLunghezza(`${enorme}mm`), Number(enorme));
});
