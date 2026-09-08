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
test("con staffe e nessuna fila non c'è nessuna barra", () => {
  const s = { ...FIXTURE.sezione, file: [] };
  assert.deepEqual(posizioniBarre(s), []);
  assert.equal(geometriaImpossibile(s), null);
});
test("due file sullo stesso lato: il messaggio nomina il lato, come nova/deck.py:227-230", () => {
  const s = { ...FIXTURE.sezione, file: [...FIXTURE.sezione.file, { lato: "inf", n: 1, diametro: 16 }] };
  assert.match(geometriaImpossibile(s), /due file sul lato inf/);
  assert.deepEqual(posizioniBarre(s), []);
});
test("sx e dx si distinguono per segno: 2Ø12 sx e 1Ø16 dx sulla 300×500 (uccide il mutante che scambia i segni)", () => {
  const s = { ...FIXTURE.sezione, file: [{ lato: "sx", n: 2, diametro: 12 }, { lato: "dx", n: 1, diametro: 16 }] };
  const barre = posizioniBarre(s);
  const sx = barre.filter((b) => b.y < 0);
  const dx = barre.filter((b) => b.y > 0);
  assert.equal(sx.length, 2);
  assert.equal(dx.length, 1);
  for (const b of sx) assert.equal(b.y, -106);
  const passo = 412 / 3;
  const zSx = sx.map((b) => b.z).sort((a, b) => a - b);
  assert.ok(Math.abs(zSx[0] - (-206 + passo)) < 1e-9, `z atteso ${-206 + passo}, avuto ${zSx[0]}`);
  assert.ok(Math.abs(zSx[1] - (-206 + 2 * passo)) < 1e-9, `z atteso ${-206 + 2 * passo}, avuto ${zSx[1]}`);
  assert.equal(dx[0].y, 104);
  assert.equal(dx[0].z, 0);
});
test("sup senza inf: 2Ø16 sole sulla 300×500 stanno in alto, specchiate come deck.py:260-263", () => {
  const s = { ...FIXTURE.sezione, file: [{ lato: "sup", n: 2, diametro: 16 }] };
  const barre = posizioniBarre(s).sort((a, b) => a.y - b.y);
  assert.deepEqual(barre, [
    { y: -104, z: 204, diametro: 16 },
    { y: 104, z: 204, diametro: 16 },
  ]);
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
test("una riduzione che non lascia sezione si rifiuta anche senza staffe, come nova/deck.py:396-400", () => {
  const s = { ...SENZA_STAFFE, file: [], riduzione: { sup: 300, inf: 300, sx: 0, dx: 0 } };
  assert.match(geometriaImpossibile(s), /non lascia sezione/);
  assert.match(geometriaImpossibile(s), /su h=500/);
  assert.match(geometriaImpossibile({ ...s, riduzione: { sup: 0, inf: 0, sx: 150, dx: 150 } }), /su b=300/);
  assert.equal(geometriaImpossibile({ ...s, riduzione: { sup: 20, inf: 20, sx: 0, dx: 0 } }), null);
});


// --- fix di fine ramo 11b: la guardia su `b`, che nessun test toccava ---
// Il ciclo di `geometriaImpossibile` gira su due quote, «h» e «b»: quella su h era coperta,
// quella su b no. Una sezione stretta — 60 mm di anima, una barra sul lato sx — la fa
// scattare: copriferro 30 + staffa 8 + mezza barra 8 = 46, e 2·46 ≥ 60.
test("una sezione stretta con una barra di lato: i copriferri opposti si sovrappongono su b", () => {
  const s = { b: 60, h: 500, copriferro: 30, staffe: { diametro: 8, passo: 150, bracci: 2 },
              file: [{ lato: "sx", n: 1, diametro: 16 }] };
  const motivo = geometriaImpossibile(s);
  assert.match(motivo, /copriferri opposti/);
  assert.match(motivo, /su b/);
  assert.deepEqual(posizioniBarre(s), [], "e il deck non ne colloca nessuna");
  // la stessa fila su una sezione larga passa: la guardia è su `b`, non sulla fila
  assert.equal(geometriaImpossibile({ ...s, b: 300 }), null);
});
