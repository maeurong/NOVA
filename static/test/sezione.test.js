import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { leggiDimensioni, geometriaImpossibile, posizioniBarre, contornoRidotto, svgSezione, LATI } from "../sezione.js";

const FIXTURE = JSON.parse(readFileSync(new URL("../../tests/fixture/barre_300x500.json", import.meta.url), "utf8"));
const ordina = (b) => [...b].sort((p, q) => p.y - q.y || p.z - q.z);
const SENZA_STAFFE = { ...FIXTURE.sezione, staffe: null };

test("le barre stanno dove le mette nova/deck.py:_barre (fixture condivisa)", () => {
  assert.deepEqual(ordina(posizioniBarre(FIXTURE.sezione)), ordina(FIXTURE.barre));
});
test("senza staffe non c'è nessuna barra e nessun giudizio", () => {
  assert.deepEqual(posizioniBarre(SENZA_STAFFE), []);
  assert.equal(geometriaImpossibile(SENZA_STAFFE), null);
});
test("copriferri opposti che si scavalcano: il messaggio nomina h", () => {
  const s = { ...FIXTURE.sezione, h: 100, copriferro: 40, file: [{ lato: "inf", n: 1, diametro: 16 }] };
  assert.match(geometriaImpossibile(s), /copriferri opposti.*\bh\b/);
  assert.deepEqual(posizioniBarre(s), []);
});
test("troppe barre in una fila: il messaggio dà ingombro e luce", () => {
  const s = { ...FIXTURE.sezione, file: [{ lato: "inf", n: 20, diametro: 16 }] };
  assert.match(geometriaImpossibile(s), /320 mm.*224/);
});
test("leggiDimensioni legge x, ×, * e le unità", () => {
  for (const t of ["300x500", "300 × 500", "30 cm × 50 cm", "300*500"]) assert.deepEqual(leggiDimensioni(t), { b: 300, h: 500 });
  for (const t of ["300", "0 × 500", "", "a × b", "300 × 500 × 2"]) assert.equal(leggiDimensioni(t), null);
});
test("contornoRidotto restringe dal lato dichiarato", () => {
  assert.deepEqual(contornoRidotto(FIXTURE.sezione), { y0: -150, y1: 150, z0: -250, z1: 250 });
  assert.deepEqual(contornoRidotto({ ...FIXTURE.sezione, riduzione: { sup: 20, inf: 0, sx: 0, dx: 0 } }), { y0: -150, y1: 150, z0: -250, z1: 230 });
});
test("svgSezione disegna un cerchio per barra e niente cerchi senza staffe", () => {
  assert.equal((svgSezione(FIXTURE.sezione).match(/<circle/g) ?? []).length, 7);
  assert.equal((svgSezione(SENZA_STAFFE).match(/<circle/g) ?? []).length, 0);
  assert.match(svgSezione(SENZA_STAFFE), /<rect/);
});
test("LATI è l'ordine del deck", () => assert.deepEqual(LATI, ["inf", "sup", "sx", "dx"]));
