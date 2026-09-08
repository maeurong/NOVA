import { test } from "node:test";
import assert from "node:assert/strict";
import { puntiConcrete02, puntiSteel02, valoriDaMostrare, svgCurva, cifre } from "../legame.js";

const C25 = { tipo: "concrete02", fpc: -33, epsc0: -0.002, fpcu: -6.6, epsU: -0.0035, lambda: 0.1, ft: 2.6, Ets: 1300, Ec: 33000 };
const B450 = { tipo: "steel02", Fy: 450, E: 200000, b: 0.0052, R0: 18, cR1: 0.925, cR2: 0.15, eps_ud: 0.0675, k: 1.15 };

test("la curva del calcestruzzo passa per il picco e finisce alla deformazione ultima", () => {
  const p = puntiConcrete02(C25);
  assert.deepEqual(p[0], [-0.0035, -6.6]);
  assert.ok(p.some(([e, s]) => e === -0.002 && Math.abs(s - -33) < 1e-9));
  assert.deepEqual(p[p.length - 1], [2.6 / 33000, 2.6]);
});
test("la parabola non è una retta: il punto a metà strada non è a metà tensione", () => {
  const p = puntiConcrete02(C25);
  const meta = p.find(([e]) => Math.abs(e - -0.001) < 1e-12);
  assert.ok(meta, "manca il punto a r = 0,5");
  assert.ok(Math.abs(meta[1] - -24.75) < 1e-9);
});
test("senza trazione la curva finisce nello zero", () => {
  const p = puntiConcrete02({ ...C25, ft: 0 });
  assert.deepEqual(p[p.length - 1], [0, 0]);
});
test("l'acciaio è bilineare, e con b = 0 è elastico-perfetto", () => {
  assert.deepEqual(puntiSteel02(B450)[1], [450 / 200000, 450]);
  assert.equal(puntiSteel02({ ...B450, b: 0 })[2][1], 450);
});
test("i valori accanto alla curva hanno nome, valore e unità", () => {
  const v = valoriDaMostrare(C25);
  assert.deepEqual(v[0], ["f_c", 33, "MPa"]);
  assert.ok(v.some(([n]) => n === "E_c") && v.some(([n]) => n === "ε_U"));
  assert.deepEqual(valoriDaMostrare(B450)[0], ["f_y", 450, "MPa"]);
  assert.throws(() => valoriDaMostrare({ tipo: "concrete04" }), /concrete04/);
});
test("svgCurva regge la lista vuota e le curve piatte", () => {
  assert.match(svgCurva([]), /<svg/); assert.doesNotMatch(svgCurva([]), /<path/);
  assert.match(svgCurva([[0, 0], [0.01, 0]]), /<path/);
  assert.match(svgCurva(puntiSteel02(B450)), /<path d="M/);
});

// --- le cifre stanno in un posto solo ---

test("cifre: 2,56 non diventa 3, un intero non prende decimali, sopra cento le migliaia", () => {
  // f_t = 2,56 MPa arrotondata a «3» cancellava la resistenza a trazione dalla `<dl>`.
  assert.equal(cifre(2.56), "2,56");
  assert.equal(cifre(33), "33");
  // lo spazio fine unificatore, quello che `stampaNumero` emette per le migliaia
  assert.equal(cifre(200000), "200 000");
  // sotto uno restano quattro decimali: sono le deformazioni della curva
  assert.equal(cifre(0.0035), "0,0035");
  assert.equal(cifre(-2.56), "-2,56");
});


// --- fix di fine ramo 11b: i nomi accanto alla curva, per intero e nell'ordine ---
// `valoriDaMostrare` scrive le etichette della `<dl>` dell'ispettore: un nome tolto o
// scambiato non lo vedeva nessuno, perché il test guardava solo il primo e due a campione.

test("valoriDaMostrare: i sette nomi del concrete02, nell'ordine", () => {
  assert.deepEqual(valoriDaMostrare(C25).map(([n]) => n),
    ["f_c", "E_c", "ε_c0", "ε_U", "f_cu", "f_t", "λ"]);
});

test("valoriDaMostrare: i cinque nomi dello steel02, nell'ordine", () => {
  assert.deepEqual(valoriDaMostrare(B450).map(([n]) => n),
    ["f_y", "E_s", "b", "ε_ud", "k"]);
});
