import { test } from "node:test";
import assert from "node:assert/strict";
import { OGGETTO_PER_CONTROLLO, PAROLA, righeVerdetti, testoSolutore, testoAttesa, testoUltima, stantia, verdettiDi }
  from "../corsa.js";

const v = (controllo, esito, extra = {}) => ({ controllo, oggetto: null, stazione: null, caso: null, esito,
  ragione: "r", articolo: null, valori: {}, rimedio: null, ...extra });

test("righeVerdetti: una riga per verdetto, la parola e il «vai» dal primo oggetto", () => {
  const righe = righeVerdetti([
    v("nodi_coincidenti", "non_passato", { oggetto: [[3, 5]], rimedio: "unisci i nodi" }),
    v("nodo_su_asta", "non_passato", { oggetto: [[2, 7]] }),
    v("carico_termico", "non_passato", { oggetto: [["Z1", 4]] }),
    v("armatura_mancante", "non_passato", { oggetto: [2] }),
    v("vincoli", "non_passato", { rimedio: "vincola un nodo" }),
    v("unita", "passato"),
    v("moti_rigidi", "non_applicabile", { ragione: "" }),
  ]);
  assert.equal(righe.length, 7);
  assert.deepEqual(righe[0].vai, { tipo: "nodo", id: 3 });
  assert.equal(righe[0].parola, "non passato");
  assert.equal(righe[0].rimedio, "unisci i nodi");
  assert.deepEqual(righe[1].vai, { tipo: "nodo", id: 2 });
  assert.deepEqual(righe[2].vai, { tipo: "azione", id: "Z1" });
  assert.deepEqual(righe[3].vai, { tipo: "sezione", id: 2 });
  assert.equal(righe[4].vai, null);
  assert.equal(righe[5].parola, "passato");
  assert.equal(righe[6].parola, "non applicabile");
  assert.equal(righe[6].ragione, "—", "la ragione non è mai vuota");
  assert.equal(righe[0].chiave, "nodi_coincidenti|");
});

test("righeVerdetti: riferimenti e pushover leggono il dict, e non promettono un «vai» che non c'è", () => {
  const righe = righeVerdetti([
    v("riferimenti", "non_passato", { oggetto: [{ analisi: "statica", caso: "Z9" }] }),
    v("riferimenti", "non_passato", { oggetto: [{ azione: 3, carico: 0, nodo: 12 }] }),
    v("riferimenti", "non_passato", { oggetto: [{ sezione: 4, calcestruzzo: 9 }] }),
    v("pushover", "non_passato", { oggetto: [{ analisi: "pushover", nodo_controllo: 4, dof: "ux" }] }),
    // Il contenitore, non il rotto: qui `azione` è l'azione che manca (`check.py:179`, `:192`).
    v("riferimenti", "non_passato", { oggetto: [{ combinazione: 2, azione: 9 }] }),
    v("riferimenti", "non_passato", { oggetto: [{ analisi: "modale", azione: 9 }] }),
    v("pushover", "non_passato", { oggetto: [{ analisi: "pushover", dichiarate: 2 }] }),
    v("pushover", "non_passato", { oggetto: [{ analisi: "pushover", nodo_controllo: 44 }] }),  // il nodo 44 non esiste
  ]);
  assert.equal(righe[0].vai, null);
  assert.deepEqual(righe[1].vai, { tipo: "azione", id: 3 });
  assert.deepEqual(righe[2].vai, { tipo: "sezione", id: 4 });
  assert.deepEqual(righe[3].vai, { tipo: "nodo", id: 4 });
  assert.deepEqual(righe[4].vai, { tipo: "combinazione", id: 2 }, "si va alla combinazione, non all'azione 9 che non esiste");
  assert.equal(righe[5].vai, null, "l'azione 9 della modale non esiste: nessun «vai»");
  assert.equal(righe[6].vai, null);
  assert.equal(righe[7].vai, null, "nodo_controllo senza dof è il nodo che manca: niente «vai»");
});

// Ingressi degeneri: liste vuote o assenti, oggetto vuoto.
test("righeVerdetti: niente non solleva, e un oggetto vuoto non ha «vai»", () => {
  assert.deepEqual(righeVerdetti([]), []);
  assert.deepEqual(righeVerdetti(null), []);
  assert.deepEqual(righeVerdetti(undefined), []);
  assert.equal(righeVerdetti([v("nodi_liberi", "passato", { oggetto: [] })])[0].vai, null);
});

test("righeVerdetti: un esito fuori dai tre non sparisce, la parola è l'esito stesso", () => {
  const righe = righeVerdetti([v("controllo_futuro", "boh")]);
  assert.equal(righe.length, 1);
  assert.equal(righe[0].parola, "boh");
});

test("righeVerdetti: i C3 portano il caso nella chiave — convergenza esce per ogni caso a fibre", () => {
  const righe = righeVerdetti([v("convergenza", "passato", { caso: "Z1" }), v("convergenza", "passato", { caso: "Z2" })]);
  assert.deepEqual(righe.map((r) => r.chiave), ["convergenza|Z1", "convergenza|Z2"]);
  assert.equal(new Set(Object.values(PAROLA)).size, 3);
  assert.equal(OGGETTO_PER_CONTROLLO.vincoli_dedotti, "nodo");
});

test("testoSolutore: ok con percorso e versione, assente con dove prenderlo, rotto col motivo, niente in verifica", () => {
  assert.equal(testoSolutore({ esito: "ok", percorso: "/opt/homebrew/bin/OpenSees" }), "OpenSees · /opt/homebrew/bin/OpenSees");
  assert.equal(testoSolutore({ esito: "ok", percorso: "/x/OpenSees" }, "3.8.0"), "OpenSees 3.8.0 · /x/OpenSees");
  assert.equal(testoSolutore({ esito: "assente", dove_prenderlo: "da https://opensees.berkeley.edu/" }),
               "OpenSees assente — da https://opensees.berkeley.edu/");
  assert.equal(testoSolutore({ esito: "assente", dove_prenderlo: null }), "OpenSees assente — dove prenderlo: non dichiarato");
  assert.equal(testoSolutore({ esito: "rotto", motivo: "esce 1" }), "OpenSees rotto: esce 1");
  assert.equal(testoSolutore(null), "solutore: in verifica…");
});

test("testoAttesa: le fasi finora, la corrente, i secondi al decimo — mai negativi né NaN", () => {
  const lavoro = { avvioMs: 1000, fasi: ["check model", "scrivo il deck e lancio OpenSees"] };
  const a = testoAttesa(lavoro, 4250);
  assert.deepEqual(a.fasi, lavoro.fasi);
  assert.equal(a.corrente, "scrivo il deck e lancio OpenSees");
  // R14: l'attesa arrotonda al decimo (3,25 s → 3,3 s), a differenza di testoUltima che stampa
  // la durata misurata dal server senza arrotondare.
  assert.equal(a.secondi, "3,3 s");
  assert.equal(testoAttesa({ avvioMs: 1000, fasi: [] }, 500).secondi, "0 s");
  assert.equal(testoAttesa({ avvioMs: 1000, fasi: [] }, 500).corrente, null);
  assert.equal(testoAttesa({ fasi: [] }, 1000).secondi, "0 s", "senza avvioMs: 0 s, mai NaN s");
});

test("testoUltima: ok, solido, rifiutata, errore, assente", () => {
  assert.equal(testoUltima({ run_id: "a1b2c3d4e5f6", secondi: 3.2, fin: { esito: "ok" } }), "corsa a1b2c3d4e5f6 · 3,2 s");
  assert.equal(testoUltima({ run_id: "a1b2c3d4e5f6", secondi: 7.5, solido: true, fin: { esito: "ok" } }), "corsa del solido a1b2c3d4e5f6 · 7,5 s");
  assert.equal(testoUltima({ run_id: "a1b2c3d4e5f6", secondi: 0.1, fin: { esito: "rifiutato" } }), "corsa a1b2c3d4e5f6 · rifiutata dal Check Model");
  assert.equal(testoUltima({ run_id: "a1b2c3d4e5f6", secondi: 2, fin: { esito: "errore", fase: "solutore", motivo: "esce 1" } }),
               "corsa a1b2c3d4e5f6 · errore in solutore: esce 1");
  assert.equal(testoUltima({ run_id: "a1b2c3d4e5f6", secondi: 0, fin: { esito: "assente" } }), "corsa a1b2c3d4e5f6 · OpenSees assente");
});

test("stantia: è l'identità dello snapshot, non un confronto di contenuto", () => {
  const m = { nodi: [] }, m2 = { nodi: [] };
  assert.equal(stantia({ modello: m }, m), false);
  assert.equal(stantia({ modello: m }, m2), true, "stesso contenuto, altro snapshot: stantia");
  assert.equal(stantia(null, m), false);
  assert.equal(stantia({ modello: m }, undefined), true);
});

test("verdettiDi: prima i verdetti del Check, poi i sette controlli sui risultati; niente → []", () => {
  const fin = { verdetti_check: [v("unita", "passato")], risultati: { verdetti: [v("reazioni", "passato", { caso: "Z1" })] } };
  assert.deepEqual(verdettiDi(fin).map((x) => x.controllo), ["unita", "reazioni"]);
  assert.deepEqual(verdettiDi({}), []);
  assert.deepEqual(verdettiDi({ verdetti_check: null }), []);
});
