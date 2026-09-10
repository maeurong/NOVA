import { test } from "node:test";
import assert from "node:assert/strict";
import { disponi, siSovrappongono, sottoSoglia } from "../etichette.js";

const box = (x0, y0, x1, y1) => ({ x0, y0, x1, y1 });
const richiesta = (id, x, y, extra = {}) => ({ id, x, y, testo: String(id), priorita: 1, larghezza: 60, altezza: 12, ...extra });
const nessunaSovrapposizione = (poste) => {
  const visibili = poste.filter((p) => !p.nascosta);
  for (let i = 0; i < visibili.length; i++) for (let j = i + 1; j < visibili.length; j++) {
    assert.ok(!siSovrappongono(visibili[i].box, visibili[j].box), `${visibili[i].id} e ${visibili[j].id} si sovrappongono`);
  }
};

test("siSovrappongono: i bordi che si toccano non contano", () => {
  assert.ok(siSovrappongono(box(0, 0, 10, 10), box(5, 5, 15, 15)));
  assert.ok(!siSovrappongono(box(0, 0, 10, 10), box(10, 0, 20, 10)));
  assert.ok(!siSovrappongono(box(0, 0, 10, 10), box(0, 10, 10, 20)));
  assert.ok(!siSovrappongono(box(0, 0, 10, 10), box(11, 11, 12, 12)));
});

test("disponi: una sola etichetta va sopra il punto, centrata, senza guida", () => {
  const [p] = disponi([richiesta("a", 100, 100)], [], { passo: 6 });
  assert.equal(p.nascosta, false);
  assert.equal(p.guida, null);
  assert.equal(p.ancora, "middle");
  assert.equal(p.x, 100);
  assert.ok(p.box.y1 <= 100 - 6 + 1e-9, "il box sta sopra il punto, a un passo");
  assert.ok(p.box.x0 < 100 && p.box.x1 > 100);
});

test("disponi: due etichette sullo stesso punto non si sovrappongono; la meno prioritaria si sposta", () => {
  const poste = disponi([richiesta("a", 100, 100, { priorita: 1 }), richiesta("b", 100, 100, { priorita: 2 })], [], { passo: 6 });
  nessunaSovrapposizione(poste);
  const a = poste.find((p) => p.id === "a"), b = poste.find((p) => p.id === "b");
  assert.equal(b.ancora, "middle", "la più prioritaria prende il primo posto (sopra)");
  assert.notEqual(a.ancora + a.x + a.y, b.ancora + b.x + b.y);
  assert.deepEqual(poste.map((p) => p.id), ["a", "b"], "l'ordine di uscita è quello d'ingresso");
});

test("disponi: un ostacolo su tutti i primi posti spinge l'etichetta a due passi, con la guida", () => {
  // Largo abbastanza da coprire i 4 versi al primo passo (±6mm), basso abbastanza
  // da liberare "sopra" al secondo passo (±12mm): altezza 9mm scelta apposta.
  const ostacolo = box(100 - 80, 100 - 9, 100 + 80, 100 + 9);
  const [p] = disponi([richiesta("a", 100, 100)], [ostacolo], { passo: 6 });
  assert.equal(p.nascosta, false);
  assert.ok(p.guida, "una linea guida dal punto all'etichetta");
  assert.deepEqual([p.guida.x1, p.guida.y1], [100, 100]);
  assert.ok(!siSovrappongono(p.box, ostacolo));
});

test("disponi: nessun posto libero → nascosta, mai sovrapposta", () => {
  const tutto = box(-1e9, -1e9, 1e9, 1e9);
  const [p] = disponi([richiesta("a", 0, 0)], [tutto], { passo: 6 });
  assert.equal(p.nascosta, true);
  assert.equal(p.testo, "a");
});

test("disponi: dieci etichette fitte — le visibili non si sovrappongono e ogni richiesta ha una risposta", () => {
  const richieste = Array.from({ length: 10 }, (_, k) => richiesta(`e${k}`, 100 + k * 3, 100, { priorita: 10 - k }));
  const poste = disponi(richieste, [], { passo: 6 });
  assert.equal(poste.length, 10);
  nessunaSovrapposizione(poste);
  assert.ok(poste.filter((p) => !p.nascosta).length >= 4, "almeno i quattro versi del primo passo si riempiono");
});

test("disponi: ingressi degeneri — lista vuota, richiesta senza ingombro, coordinate non finite", () => {
  assert.deepEqual(disponi([], [], { passo: 6 }), []);
  assert.deepEqual(disponi(null), []);
  const [p] = disponi([richiesta("a", 5, 5, { larghezza: 0, altezza: 0 })], [], { passo: 6 });
  assert.equal(p.nascosta, false);
  const [q] = disponi([richiesta("b", NaN, 5)], [], { passo: 6 });
  assert.equal(q.nascosta, true, "un punto senza coordinate non si etichetta");
  const [r] = disponi([richiesta("c", 5, 5)]);   // senza opzioni: un passo di default, non NaN
  assert.equal(r.nascosta, false);
  assert.ok(Number.isFinite(r.x) && Number.isFinite(r.y));
});

test("sottoSoglia: il 2 % del massimo; con massimo nullo tutto è sotto soglia", () => {
  assert.ok(sottoSoglia(1, 100));
  assert.ok(!sottoSoglia(3, 100));
  assert.ok(sottoSoglia(-1, -100));
  assert.ok(sottoSoglia(0, 0));
  assert.ok(sottoSoglia(5, 0));
  assert.ok(sottoSoglia(NaN, 100));
});

test("sottoSoglia: massimo null o non finito → sempre sotto soglia (ingresso degenere riga 8)", () => {
  assert.ok(sottoSoglia(5, null));
  assert.ok(sottoSoglia(5, undefined));
  assert.ok(sottoSoglia(5, NaN));
});

test("disponi: ostacoli null → default [] (ingresso degenere riga 4)", () => {
  const [p] = disponi([richiesta("a", 100, 100)], null, { passo: 6 });
  assert.equal(p.nascosta, false);
  assert.equal(p.x, 100);
});

test("disponi: priorità assente o NaN → vale 0, ordine d'arrivo decide (ingresso degenere riga 5)", () => {
  const richieste = [
    richiesta("a", 100, 100, { priorita: undefined }),
    richiesta("b", 100, 100, { priorita: NaN }),
    richiesta("c", 100, 100, { priorita: 0 }),
  ];
  const poste = disponi(richieste, [], { passo: 6 });
  assert.equal(poste.length, 3, "un elemento per richiesta");
  assert.deepEqual(poste.map((p) => p.id), ["a", "b", "c"], "ordine d'uscita = ordine d'ingresso");
  assert.equal(poste.find((p) => p.id === "a").ancora, "middle", "tutte a priorità 0 → vince chi arriva prima");
});

// --- i limiti del riquadro (fix round 1, medio 2) ---------------------------------
// Senza, un'etichetta spinta oltre il bordo esce `nascosta: false` e poi sparisce nel ritaglio
// dell'SVG: visibile per chi la posa, invisibile a chi guarda.

test("disponi: i limiti scartano le posizioni il cui box esce dal riquadro", () => {
  // Il tetto a 90 taglia il verso «sopra» (box 82–94) ma lascia «destra» (box 94–106).
  const limiti = box(0, 90, 400, 400);
  const [p] = disponi([richiesta("a", 100, 100)], [], { passo: 6, limiti });
  assert.equal(p.nascosta, false);
  assert.equal(p.ancora, "start", "sopra non ci sta: resta il verso destro");
  assert.ok(p.box.y0 >= limiti.y0 && p.box.y1 <= limiti.y1, `dentro in y: ${JSON.stringify(p.box)}`);
  assert.ok(p.box.x0 >= limiti.x0 && p.box.x1 <= limiti.x1, `dentro in x: ${JSON.stringify(p.box)}`);
});

test("disponi: limiti che non lasciano posto a nessuna posizione → nascosta", () => {
  const [p] = disponi([richiesta("a", 100, 100)], [], { passo: 6, limiti: box(99, 99, 101, 101) });
  assert.equal(p.nascosta, true);
  assert.equal(p.box, null);
});

test("disponi: senza limiti, o con limiti nulli, niente cambia", () => {
  const senza = disponi([richiesta("a", 100, 100), richiesta("b", 100, 100)], [], { passo: 6 });
  assert.deepEqual(disponi([richiesta("a", 100, 100), richiesta("b", 100, 100)], [], { passo: 6, limiti: null }), senza);
  assert.deepEqual(disponi([richiesta("a", 100, 100), richiesta("b", 100, 100)], [], { passo: 6, limiti: undefined }), senza);
});
