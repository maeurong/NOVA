import { test } from "node:test";
import assert from "node:assert/strict";
import { NOME_RISULTATI, percorsoRisultati, nodiInSommita, casiCorsi, mappaDalForm, leggiMappaJson,
         PAROLA_CLASSE, conAbaqus, noteDellaTabella, righeDaMostrare, testoConteggio, testoProvenienza,
         testoDidascalia } from "../confronto.js";

const riga = (grandezza, caso, extra = {}) => ({
  grandezza, caso, unita: "N", telaio: 7545.4, solido: 4200.1, abaqus: null,
  scarto_solido_pct: 79.65, scarto_abaqus_pct: null, classe_solido: "lontano", classe_abaqus: "non_confrontabile",
  bias_atteso: "", ragione: null, ...extra,
});
const BIAS = "massa: zapatas e tamponatura fuori dal telaio";
const RUMORE = "entrambi i valori sotto il pavimento di rumore per «N» (< 0.01)";
const tabella = () => ({
  avvertenza: "verifica del codice, non validazione",
  provenienza: { commit_nova: "fa3b2e3", run_id_telaio: "3fb8d0907967", hash_modello: "0137", run_id_solido: "68f88432812d",
                 sha256_deck_solido: "c8d0", versione_opensees: "Version 3.8.0 64-Bit (6e55)", versione_calculix: "CalculiX Version 2.22, Copyright(C) 1998-2024 Guido Dhondt",
                 data: "2026-09-05T17:51:19" },
  righe: [
    riga("massa", null, { unita: "t", telaio: 0.7694, solido: 0.5551, scarto_solido_pct: 38.62, bias_atteso: BIAS }),
    riga("reazione_x", "C1", { telaio: 0, solido: 1.7e-5, scarto_solido_pct: null, classe_solido: "non_confrontabile", ragione: RUMORE }),
    riga("reazione_z", "C1"),
    riga("u_sommita_x", "C2", { unita: "mm", telaio: -0.19, solido: -0.17, scarto_solido_pct: 11.76, classe_solido: "vicino", bias_atteso: "tetraedri lineari più rigidi" }),
    riga("f1", null, { unita: "Hz", telaio: 20.45, solido: 21.1, scarto_solido_pct: 3.08, classe_solido: "concorde", abaqus: 20.9, scarto_abaqus_pct: 2.24, classe_abaqus: "concorde" }),
  ],
});

test("percorsoRisultati: cartella + nome fisso per tipo; senza lavoro o cartella → stringa vuota", () => {
  assert.equal(percorsoRisultati({ cartella: "corse/ab12" }, "telaio"), "corse/ab12/risultati.nova.risultati.json");
  assert.equal(percorsoRisultati({ cartella: "/tmp/c" }, "solido"), "/tmp/c/risultati_solido.json");
  assert.equal(NOME_RISULTATI.solido, "risultati_solido.json");
  assert.equal(percorsoRisultati(null, "telaio"), "");
  assert.equal(percorsoRisultati({ cartella: null }, "telaio"), "");
  assert.equal(percorsoRisultati({}, "solido"), "");
});

test("nodiInSommita: i nodi alla quota massima entro la tolleranza, id crescenti; nessun nodo → []", () => {
  const m = { nodi: [{ id: 4, x: 2262, z: 1607.5 }, { id: 1, x: 0, z: 0 }, { id: 3, x: 0, z: 1607.5 }, { id: 2, x: 2262, z: 0 }] };
  assert.deepEqual(nodiInSommita(m), [3, 4]);
  assert.deepEqual(nodiInSommita({ nodi: [{ id: 7, x: 0, z: 100 }, { id: 8, x: 1, z: 99.5 }] }), [7, 8]);   // entro 1 mm
  assert.deepEqual(nodiInSommita({ nodi: [{ id: 7, x: 0, z: 100 }, { id: 8, x: 1, z: 98 }] }), [7]);
  assert.deepEqual(nodiInSommita({ nodi: [] }), []);
  assert.deepEqual(nodiInSommita(null), []);
});

test("casiCorsi: i casi della corsa dal run, o [] senza risultati", () => {
  assert.deepEqual(casiCorsi({ fin: { risultati: { run: { casi: ["C1", "C2"] } } } }), ["C1", "C2"]);
  assert.deepEqual(casiCorsi({ fin: { esito: "errore" } }), []);
  assert.deepEqual(casiCorsi(null), []);
});

test("mappaDalForm: un caso per riga con passo non vuoto, nodi da «3; 4», assi solo se scambiati", () => {
  const mappa = mappaDalForm({ casi: [{ caso: "C1", passo: " GRAVITA " }, { caso: "C2", passo: "" }, { caso: "C3", passo: "CARICO_TOP" }],
                               nodi: "3; 4", assiScambiati: true });
  assert.deepEqual(mappa, { C1: "GRAVITA", C3: "CARICO_TOP", nodi_sommita: [3, 4], assi: { x: "y", y: "x" } });
  assert.deepEqual(mappaDalForm({ casi: [], nodi: "", assiScambiati: false }), {});
  assert.deepEqual(mappaDalForm({ casi: [], nodi: "3,4 5", assiScambiati: false }), { nodi_sommita: [3, 4, 5] });
  assert.throws(() => mappaDalForm({ casi: [], nodi: "3; quattro", assiScambiati: false }), /nodi in sommità: scrivi gli id separati da «;»/);
});

test("leggiMappaJson: un oggetto; array, null, numero e testo rotto → errore in parole", () => {
  assert.deepEqual(leggiMappaJson('{"C1": "GRAVITA", "nodi_sommita": [3]}'), { C1: "GRAVITA", nodi_sommita: [3] });
  assert.deepEqual(leggiMappaJson("  "), {});                                      // vuoto = nessuna mappa, non un errore
  for (const t of ["[1]", "null", "3", '{"C1": ']) assert.throws(() => leggiMappaJson(t), /mappa_casi: JSON non valido/, t);
});

test("conAbaqus: falso finché nessuna riga porta un valore o una classe Abaqus", () => {
  const t = tabella();
  assert.equal(conAbaqus(t), true);
  t.righe[4].abaqus = null; t.righe[4].classe_abaqus = "non_confrontabile";
  assert.equal(conAbaqus(t), false);
  assert.equal(conAbaqus({ righe: [] }), false);
});

test("noteDellaTabella: bias poi ragione, dedup per testo, numerate da 1, una lista di numeri per riga", () => {
  const { note, perRiga } = noteDellaTabella(tabella());
  assert.deepEqual(note.map((n) => n.testo), [BIAS, RUMORE, "tetraedri lineari più rigidi"]);
  assert.deepEqual(note.map((n) => n.n), [1, 2, 3]);
  assert.deepEqual(perRiga, [[1], [2], [], [3], []]);
  assert.deepEqual(noteDellaTabella({ righe: [] }), { note: [], perRiga: [] });
});

test("righeDaMostrare: numeri con la virgola, null → «—», classi in parole, attenuata solo se entrambe non confrontabili", () => {
  const r = righeDaMostrare(tabella());
  assert.equal(r.length, 5);
  assert.deepEqual([r[0].grandezza, r[0].caso, r[0].unita, r[0].telaio, r[0].solido, r[0].abaqus], ["massa", "—", "t", "0,7694", "0,5551", "—"]);
  assert.equal(r[0].scartoSolido, "38,6 %");
  assert.equal(r[0].scartoAbaqus, "—");
  assert.equal(r[0].classeSolido, "lontano");
  assert.equal(r[0].classeAbaqus, "non confrontabile");
  assert.equal(r[0].attenuata, false);
  assert.deepEqual(r[0].note, [1]);
  assert.equal(r[1].telaio, "0");
  assert.equal(r[1].scartoSolido, "—");
  assert.equal(r[1].attenuata, true, "rumore su entrambi i lati e niente Abaqus: attenuata");
  assert.deepEqual(r[1].note, [2]);
  assert.equal(r[2].telaio, "7 545", "sopra cento `conciso` toglie i decimali: le cifre piene stanno nel CSV");
  assert.equal(r[4].scartoAbaqus, "2,2 %");
  assert.equal(PAROLA_CLASSE.non_confrontabile, "non confrontabile");
  assert.deepEqual(righeDaMostrare({ righe: [] }), []);
});

test("testoConteggio: righe, quante attenuate, e l'avvertenza del server — mai cablata", () => {
  assert.equal(testoConteggio(tabella()), "5 righe · 1 non confrontabile · verifica del codice, non validazione");
  const t = tabella(); t.righe[2].classe_solido = "non_confrontabile";
  assert.equal(testoConteggio(t), "5 righe · 2 non confrontabili · verifica del codice, non validazione");
  assert.equal(testoConteggio({ righe: [], avvertenza: "prova" }), "nessuna riga · prova");
  assert.equal(testoConteggio({ righe: [tabella().righe[0]], avvertenza: "x" }), "1 riga · 0 non confrontabili · x");
});

test("testoProvenienza: commit, run, versioni brevi, data italiana; i null dicono n/d; null → vuoto", () => {
  assert.equal(testoProvenienza(tabella().provenienza),
    "commit fa3b2e3 · run telaio 3fb8d0907967 · run solido 68f88432812d · OpenSees 3.8.0 · CalculiX 2.22 · 05/09/2026 17:51");
  assert.equal(testoProvenienza({ commit_nova: null, run_id_telaio: "a", run_id_solido: null, versione_opensees: null, versione_calculix: null, data: "2026-01-02T03:04:05" }),
    "commit n/d · run telaio a · run solido n/d · OpenSees n/d · CalculiX n/d · 02/01/2026 03:04");
  assert.equal(testoProvenienza(null), "");
});

test("testoDidascalia: telaio+solido, +Abaqus solo se davvero appaiato, la frase del CSV solo se richiesto", () => {
  assert.equal(testoDidascalia(tabella()), "telaio ↔ solido ↔ Abaqus");
  const t = tabella();
  t.righe[4].abaqus = null; t.righe[4].classe_abaqus = "non_confrontabile";
  assert.equal(testoDidascalia(t), "telaio ↔ solido");
  assert.equal(testoDidascalia(t, { abaqusChiesto: true }), "telaio ↔ solido · il CSV Abaqus non ha righe appaiate ai casi");
  assert.equal(testoDidascalia({ righe: [] }), "telaio ↔ solido");
});
