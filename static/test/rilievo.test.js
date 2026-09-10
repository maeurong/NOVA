import { test } from "node:test";
import assert from "node:assert/strict";
import { daRisposta, righeScartate, giunzioneDelNodo, propostaPerNodo, proposteAperte, riassunto,
         etichettaStoria, testoMancano, testoGiunzione } from "../rilievo.js";
import { cifre } from "../numeri.js";
import { creaNodo, impostaVincolo } from "../comandi.js";
import { modelloVuoto } from "../modello.js";

const vuoto = () => daRisposta({
  esito: "ok", modello: {}, scartate: [
    { regione: 0, punti: 4215879, controllo: "costanza_sezione", valore: 1.1872, soglia: 0.1, unita: "frazione", spiegazione: "dispersione relativa della sezione lungo l'asse" },
    { regione: 0, punti: 4215879, controllo: "copertura_faccia", valore: null, soglia: 0.5, unita: "-", spiegazione: null },
  ], giunzioni: [], proposte_vincoli: [], mancano: [],
  resoconto: { membrature: 0, aste: 0, nodi: 0, scartate: 8, giunzioni_scartate: 0 },
}, "/Users/mario/GitHub/NOVA/lab_telaio_v2/12_wall.json");

const sintetico = () => daRisposta({
  esito: "ok", modello: {}, scartate: [],
  giunzioni: [{ nodo: 41, scostamento_nodo: 27.1733, distanza_proiezione: 153.6, cede: 2, resta: 1 }],
  proposte_vincoli: [{ nodo: 1, vincolo: { ux: true, uy: true, uz: true, rx: true, ry: true, rz: true } },
                     { nodo: 2, vincolo: { ux: true, uy: true, uz: true, rx: true, ry: true, rz: true } }],
  mancano: ["armature", "classe", "vincoli"],
  resoconto: { membrature: 4, aste: 80, nodi: 80, scartate: 0, giunzioni_scartate: 0 },
}, "tests/fixture/prior_sintetico/12_wall.json");

test("daRisposta: liste sempre presenti, il nome è l'ultimo segmento", () => {
  assert.equal(vuoto().nome, "12_wall.json");
  const r = daRisposta({}, "x/12_wall.json");
  assert.deepEqual([r.scartate, r.giunzioni, r.proposte, r.mancano, r.resoconto], [[], [], [], [], {}]);
  assert.equal(daRisposta(null, "").nome, "");
});
test("daRisposta: le liste a `null` esplicito sono liste vuote, non un errore", () => {
  const r = daRisposta({ scartate: null, giunzioni: null, proposte_vincoli: null, mancano: null, resoconto: null }, "x/a.json");
  assert.deepEqual([r.scartate, r.giunzioni, r.proposte, r.mancano, r.resoconto], [[], [], [], [], {}]);
  assert.deepEqual(righeScartate(r), []);
});
test("righeScartate: valore contro soglia con l'unità, migliaia sui punti, trattino dove manca", () => {
  const [a, b] = righeScartate(vuoto());
  assert.equal(a.titolo, `regione 0 · ${cifre(4215879)} punti · costanza_sezione`, "la regione 0 è «regione 0», non «—»");
  assert.equal(a.valore, "1,19 contro soglia 0,1 frazione");  // due decimali al massimo, senza zeri in coda
  // Sotto 1 non si sale a quattro decimali (`conciso` lo farebbe): stessa colonna, stessa grafia.
  const [c] = righeScartate({ scartate: [{ regione: 6, punti: 2513, controllo: "costanza_sezione", valore: 0.5717, soglia: 0.1, unita: "frazione", spiegazione: "x" }] });
  assert.equal(c.valore, "0,57 contro soglia 0,1 frazione");
  assert.equal(a.spiegazione, "dispersione relativa della sezione lungo l'asse");
  assert.equal(b.valore, "— contro soglia 0,5");
  assert.equal(b.spiegazione, "—");
});
test("giunzione e proposta per nodo, null se non ci sono", () => {
  assert.equal(giunzioneDelNodo(sintetico(), 41).cede, 2);
  assert.equal(giunzioneDelNodo(sintetico(), 7), null);
  assert.equal(propostaPerNodo(sintetico(), 1).ux, true);
  assert.equal(propostaPerNodo(sintetico(), 9), null);
});
test("proposteAperte: solo i nodi che esistono e non hanno un vincolo dichiarato", () => {
  let m = creaNodo(creaNodo(modelloVuoto(), { x: 0, z: 0 }), { x: 1000, z: 0 });
  assert.deepEqual(proposteAperte(sintetico(), m).map((p) => p.nodo), [1, 2]);
  m = impostaVincolo(m, { id: 1, vincolo: { ux: false, uy: false, uz: false, rx: false, ry: false, rz: false } });
  assert.deepEqual(proposteAperte(sintetico(), m).map((p) => p.nodo), [2], "libero dichiarato è dichiarato");
  assert.deepEqual(proposteAperte(sintetico(), creaNodo(modelloVuoto(), { x: 0, z: 0 })).map((p) => p.nodo), [1]);
});
test("riassunto ed etichetta della Storia, sul vuoto e sul pieno", () => {
  assert.equal(riassunto(vuoto()), "12_wall.json · nessuna membratura · 8 scartate");
  assert.equal(riassunto(sintetico()), "12_wall.json · 4 membrature → 80 aste, 80 nodi · 0 scartate · mancano: armature, classe, vincoli");
  assert.equal(etichettaStoria(vuoto()), "importato 12_wall.json: nessuna membratura, 8 regioni scartate");
  assert.equal(etichettaStoria(sintetico()), "importato 12_wall.json: 80 aste, 0 regioni scartate");
  assert.equal(riassunto(daRisposta({}, "a.json")), "a.json · nessuna membratura · 0 scartate");
});
test("testoMancano e testoGiunzione", () => {
  assert.equal(testoMancano(["armature", "classe", "vincoli"]), "armature, classe, vincoli");
  assert.equal(testoMancano([]), "niente: il rilievo ha dato tutto");
  // `cifre` sopra 100 non tiene decimali: 153,6 esce «154» (numeri.js:182-195).
  assert.equal(testoGiunzione(sintetico().giunzioni[0]), "nodo 41 · scostamento 27,17 mm · proiezione 154 mm · membratura 2 cede a 1");
});
