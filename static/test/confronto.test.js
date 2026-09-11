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

// --- creaConfronto: il blocco «Confronto» del pannello (Task 2) --------------------------------
import { creaConfronto } from "../confronto.js";

// In più rispetto a `corsa.test.js`: `checked` (la casella degli assi), `dataset` (il caso di ogni
// riga), `querySelectorAll("input")` sul contenitore delle righe, `dispatch` che **restituisce** la
// promessa dei listener (il clic su «confronta» è asincrono e il test lo aspetta), e un
// `textContent` che si legge dai figli quando ci sono — come nel DOM vero, dove la cella della
// classe è «lontano» + un nodo di testo + un `<sup>`.
function elementoFinto(iniziale = {}) {
  const listeners = {};
  let testo = "";
  const el = {
    value: "", hidden: false, title: "", className: "", type: "", checked: false, open: false,
    disabled: false, _figli: [], _attrs: {}, dataset: {},
    addEventListener(ev, fn) { (listeners[ev] ??= []).push(fn); },
    dispatch(ev, argomento) { return Promise.all((listeners[ev] ?? []).map((fn) => fn(argomento))); },
    setAttribute(nome, valore) { this._attrs[nome] = String(valore); },
    getAttribute(nome) { return this._attrs[nome] ?? null; },
    append(...figli) { this._figli.push(...figli); },
    replaceChildren(...figli) { this._figli = figli; },
    querySelectorAll(sel) { return sel === "input" ? this._figli.flatMap((f) => f._figli.filter((g) => g.nome === "input")) : []; },
  };
  Object.defineProperty(el, "textContent", {
    enumerable: true,
    get: () => testo + el._figli.map((f) => f.textContent).join(""),
    set(v) { testo = String(v); el._figli = []; },   // come nel DOM: scrivere il testo butta i figli
  });
  return Object.assign(el, iniziale);
}
globalThis.document = {
  createElement: (nome) => elementoFinto({ nome }),
  createTextNode: (t) => ({ nome: "#text", textContent: String(t), _figli: [] }),
};
// `globalThis.navigator = {}` non si può scrivere: da Node 21 `navigator` è un accessore di sola
// lettura su globalThis, e un ESM gira in strict mode — l'assegnamento solleva. `defineProperty` sì.
Object.defineProperty(globalThis, "navigator", { value: {}, configurable: true });

function radiceConfronto() {
  const ids = ["vuoto", "telaio", "solido", "abaqus", "nodi", "casi", "assi", "avanzato", "avanzato-titolo", "json", "confronta",
               "stato", "scorri", "tabella", "didascalia", "testa", "corpo", "note", "provenienza", "cartella", "percorso", "copia"];
  const elementi = Object.fromEntries(ids.map((id) => [`#confronto-${id}`, elementoFinto({ id: `confronto-${id}` })]));
  for (const id of ["scorri", "note", "cartella"]) elementi[`#confronto-${id}`].hidden = true;
  elementi["#confronto-confronta"].disabled = true;
  elementi["#confronto-avanzato-titolo"].textContent = "avanzato: mappa_casi in JSON";
  return { radice: { querySelector: (sel) => elementi[sel] ?? null }, el: (sel) => elementi[`#confronto-${sel}`] };
}

/** `attendi` è una promessa che il test scioglie quando vuole: tiene una richiesta aperta e prova
 *  che un secondo clic, mentre quella gira, non parte. */
function fetchFinta(risposte) {
  const spia = { rotte: [], corpi: [] };
  let i = 0;
  globalThis.fetch = async (rotta, opzioni) => {
    spia.rotte.push(rotta); spia.corpi.push(opzioni?.body ? JSON.parse(opzioni.body) : null);
    const r = risposte[Math.min(i++, risposte.length - 1)];
    if (r.attendi) await r.attendi;
    if (r.cade) throw new TypeError("Failed to fetch");
    return { ok: r.stato < 400, status: r.stato, json: async () => r.dati };
  };
  return spia;
}

const MURO = { nodi: [{ id: 1, x: 0, z: 0 }, { id: 2, x: 2262, z: 0 }, { id: 3, x: 0, z: 1607.5 }, { id: 4, x: 2262, z: 1607.5 }] };
const telaioLavoro = () => ({ run_id: "t1", solido: false, cartella: "corse/t1", fin: { esito: "ok", risultati: { run: { casi: ["C1", "C2", "C3"] } } } });
const conCasi = (casi) => ({ ...telaioLavoro(), fin: { esito: "ok", risultati: { run: { casi } } } });
const solidoLavoro = () => ({ run_id: "s1", solido: true, cartella: "corse/s1", fin: { esito: "ok" } });
const risposta = () => ({ run_id: "k1", cartella: "corse/k1", esito: "ok", file: {}, tabella: tabella() });

test("disegna: precompila i percorsi dalle corse, i nodi dal modello, una riga per caso; il bottone si accende col telaio", () => {
  const { radice, el } = radiceConfronto();
  const c = creaConfronto(radice, { suErrore: () => {} });
  c.disegna({ modello: null, telaio: null, solido: null });        // niente di niente: non solleva
  assert.equal(el("confronta").disabled, true);
  assert.equal(el("telaio").value, "");
  assert.equal(el("solido").value, "");
  assert.equal(el("nodi").value, "");
  c.disegna({ modello: MURO, telaio: null, solido: null });
  assert.equal(el("confronta").disabled, true);
  assert.equal(el("telaio").value, "");
  assert.equal(el("nodi").value, "3; 4");
  c.disegna({ modello: MURO, telaio: telaioLavoro(), solido: solidoLavoro() });
  assert.equal(el("telaio").value, "corse/t1/risultati.nova.risultati.json");
  assert.equal(el("solido").value, "corse/s1/risultati_solido.json");
  assert.equal(el("confronta").disabled, false);
  const righe = el("casi")._figli;
  assert.equal(righe.length, 3);
  assert.equal(righe[0].textContent, "C1 → ");
  assert.equal(righe[0]._figli[0].value, "C1", "il passo del solido parte uguale al caso");
  assert.equal(el("json").value, JSON.stringify({ C1: "C1", C2: "C2", C3: "C3", nodi_sommita: [3, 4] }, null, 1));
  assert.equal(el("vuoto").hidden, false, "finché non c'è una tabella lo stato vuoto resta");
  // Un `Z<n>` è un'azione del telaio, non un passo del solido: la riga c'è, il passo parte vuoto e
  // `mappaDalForm` lo scarta — col solido mappato «Z1» sarebbe un 400 al primo clic.
  c.disegna({ modello: MURO, telaio: conCasi(["C1", "C2", "C3", "Z1"]), solido: solidoLavoro() });
  const conZ = el("casi")._figli;
  assert.equal(conZ.length, 4);
  assert.equal(conZ[3].textContent, "Z1 → ");
  assert.equal(conZ[3]._figli[0].value, "");
  assert.equal(el("json").value, JSON.stringify({ C1: "C1", C2: "C2", C3: "C3", nodi_sommita: [3, 4] }, null, 1));
});

test("un campo toccato non si riscrive; una corsa nuova riscrive quello non toccato", () => {
  const { radice, el } = radiceConfronto();
  const c = creaConfronto(radice, { suErrore: () => {} });
  c.disegna({ modello: MURO, telaio: telaioLavoro(), solido: null });
  el("telaio").value = "mio/telaio.json"; el("telaio").dispatch("input");
  c.disegna({ modello: MURO, telaio: { ...telaioLavoro(), cartella: "corse/t2" }, solido: solidoLavoro() });
  assert.equal(el("telaio").value, "mio/telaio.json");
  assert.equal(el("solido").value, "corse/s1/risultati_solido.json");
  c.azzera();
  assert.equal(el("telaio").value, "");
  c.disegna({ modello: MURO, telaio: { ...telaioLavoro(), cartella: "corse/t3" }, solido: null });
  assert.equal(el("telaio").value, "corse/t3/risultati.nova.risultati.json", "azzera() toglie anche il «toccato»");
});

test("una corsa senza cartella non cancella il percorso già a schermo; azzerato resta vuoto", () => {
  const { radice, el } = radiceConfronto();
  const c = creaConfronto(radice, { suErrore: () => {} });
  c.disegna({ modello: MURO, telaio: telaioLavoro(), solido: solidoLavoro() });
  c.disegna({ modello: MURO, telaio: { ...telaioLavoro(), cartella: null }, solido: { ...solidoLavoro(), cartella: null } });
  assert.equal(el("telaio").value, "corse/t1/risultati.nova.risultati.json", "un percorso vuoto non svuota il campo");
  assert.equal(el("solido").value, "corse/s1/risultati_solido.json");
  assert.equal(el("confronta").disabled, false);
  c.azzera();
  c.disegna({ modello: MURO, telaio: { ...telaioLavoro(), cartella: null }, solido: null });
  assert.equal(el("telaio").value, "", "azzerato e senza cartella: resta vuoto");
  assert.equal(el("confronta").disabled, true);
});

test("gli stessi casi non rifanno le righe: i passi scritti a mano restano", () => {
  const { radice, el } = radiceConfronto();
  const c = creaConfronto(radice, { suErrore: () => {} });
  c.disegna({ modello: MURO, telaio: telaioLavoro(), solido: null });
  const prima = el("casi")._figli;
  prima[0]._figli[0].value = "GRAVITA"; prima[0]._figli[0].dispatch("input");
  c.disegna({ modello: MURO, telaio: { ...telaioLavoro(), cartella: "corse/t9" }, solido: null });
  assert.equal(el("casi")._figli, prima, "stesse righe, non rifatte");
  assert.equal(el("casi")._figli[0]._figli[0].value, "GRAVITA");
  c.disegna({ modello: MURO, telaio: conCasi(["C1", "C2"]), solido: null });
  assert.notEqual(el("casi")._figli, prima, "casi diversi: le righe si rifanno");
});

test("confronta: la POST porta i percorsi (vuoti → null) e la mappa dal form; la tabella, le note, il conteggio e la cartella", async () => {
  const { radice, el } = radiceConfronto();
  const spia = fetchFinta([{ stato: 200, dati: risposta() }]);
  const errori = [];
  const c = creaConfronto(radice, { suErrore: (m) => errori.push(m) });
  c.disegna({ modello: MURO, telaio: telaioLavoro(), solido: null });
  el("casi")._figli[0]._figli[0].value = "GRAVITA"; el("casi")._figli[0]._figli[0].dispatch("input");
  el("abaqus").value = "tests/fixture/abaqus_esempio.csv"; el("abaqus").dispatch("input");
  el("assi").checked = true; el("assi").dispatch("change");
  await el("confronta").dispatch("click");
  assert.deepEqual(spia.rotte, ["/api/confronto"]);
  assert.deepEqual(spia.corpi[0], { telaio: "corse/t1/risultati.nova.risultati.json", solido: null, abaqus: "tests/fixture/abaqus_esempio.csv",
                                    mappa_casi: { C1: "GRAVITA", C2: "C2", C3: "C3", nodi_sommita: [3, 4], assi: { x: "y", y: "x" } } });
  assert.deepEqual(errori, [null], "il successo pulisce il messaggio, come `suSalvataggio`");
  assert.equal(el("scorri").hidden, false);
  assert.equal(el("vuoto").hidden, true);
  assert.equal(el("corpo")._figli.length, 5);
  const prima = el("corpo")._figli[0];
  assert.equal(prima._figli[0].textContent, "massa", "la massa è la prima riga (story 57)");
  assert.equal(prima._figli[0].nome, "th", "la grandezza è l'intestazione di riga");
  assert.equal(el("corpo")._figli[1].className, "attenuata");
  assert.equal(prima.className, "");
  // le colonne Abaqus ci sono perché la tabella le porta (f1 ha un valore Abaqus)
  assert.equal(el("testa")._figli[0]._figli.length, 9);
  assert.equal(el("didascalia").textContent, "telaio ↔ solido ↔ Abaqus");
  assert.equal(el("note").hidden, false);
  assert.equal(el("note")._figli.length, 3);
  assert.equal(el("note")._figli[1].textContent, RUMORE);
  assert.equal(el("stato").textContent, "5 righe · 1 non confrontabile · verifica del codice, non validazione");
  assert.ok(el("provenienza").textContent.startsWith("commit fa3b2e3 · run telaio 3fb8d0907967"), el("provenienza").textContent);
  assert.equal(el("cartella").hidden, false);
  assert.equal(el("percorso").textContent, "corse/k1");
});

test("senza Abaqus le colonne sono sei; la nota della riga sta nella cella della classe, in un `<sup>`", async () => {
  const { radice, el } = radiceConfronto();
  const r = risposta(); r.tabella.righe[4].abaqus = null; r.tabella.righe[4].classe_abaqus = "non_confrontabile";
  fetchFinta([{ stato: 200, dati: r }]);
  const c = creaConfronto(radice, { suErrore: () => {} });
  c.disegna({ modello: MURO, telaio: telaioLavoro(), solido: solidoLavoro() });
  await el("confronta").dispatch("click");
  assert.equal(el("testa")._figli[0]._figli.length, 6);
  assert.deepEqual(el("testa")._figli[0]._figli.map((th) => th.textContent), ["grandezza", "caso", "telaio", "solido", "scarto", "classe"]);
  const celle = el("corpo")._figli[0]._figli;
  assert.equal(celle[5].textContent, "lontano 1");
  assert.equal(celle[5]._figli.at(-1)?.nome, "sup", "il numero della nota è un `<sup>`, non un carattere nel testo");
  assert.equal(celle[5]._figli.at(-1)?.getAttribute("aria-label"), "nota 1");
  assert.equal(celle[0].textContent, "massa");
  assert.equal(celle[0].getAttribute("scope"), "row");
  assert.equal(celle[2].textContent, "0,7694 t", "l'unità sta accanto al valore del telaio, una volta per riga");
  assert.equal(el("corpo")._figli[3]._figli[3].textContent, "-0,17", "il solido resta nudo: l'unità è già scritta nella colonna del telaio");
  assert.equal(el("didascalia").textContent, "telaio ↔ solido");
});

test("un CSV Abaqus chiesto ma senza righe appaiate: sei colonne, e la didascalia dice perché", async () => {
  const { radice, el } = radiceConfronto();
  const r = risposta(); r.tabella.righe[4].abaqus = null; r.tabella.righe[4].classe_abaqus = "non_confrontabile";
  fetchFinta([{ stato: 200, dati: r }]);
  const c = creaConfronto(radice, { suErrore: () => {} });
  c.disegna({ modello: MURO, telaio: telaioLavoro(), solido: solidoLavoro() });
  el("abaqus").value = "tests/fixture/abaqus_esempio.csv";
  await el("confronta").dispatch("click");
  assert.equal(el("testa")._figli[0]._figli.length, 6);
  assert.equal(el("didascalia").textContent, "telaio ↔ solido · il CSV Abaqus non ha righe appaiate ai casi");
});

test("una tabella assente o senza righe: sola intestazione, «nessuna riga», note nascoste", async () => {
  const { radice, el } = radiceConfronto();
  fetchFinta([{ stato: 200, dati: { run_id: "k2", cartella: null, esito: "ok", file: {} } },
              { stato: 200, dati: { run_id: "k3", cartella: "corse/k3", esito: "ok", file: {},
                                    tabella: { righe: [], provenienza: null, avvertenza: "nessun caso appaiato" } } }]);
  const c = creaConfronto(radice, { suErrore: () => {} });
  c.disegna({ modello: MURO, telaio: telaioLavoro(), solido: null });
  await el("confronta").dispatch("click");
  assert.equal(el("stato").textContent, "nessuna riga · ");
  assert.equal(el("corpo")._figli.length, 0);
  assert.equal(el("note").hidden, true);
  assert.equal(el("cartella").hidden, true, "senza cartella non si offre il «copia»");
  assert.equal(el("provenienza").textContent, "");
  await el("confronta").dispatch("click");
  assert.equal(el("stato").textContent, "nessuna riga · nessun caso appaiato");
  assert.equal(el("testa")._figli[0]._figli.length, 6);
  assert.equal(el("didascalia").textContent, "telaio ↔ solido");
  assert.equal(el("cartella").hidden, false);
});

test("un JSON toccato comanda, e il titolo lo dice; un JSON rotto ferma la richiesta col messaggio", async () => {
  const { radice, el } = radiceConfronto();
  const spia = fetchFinta([{ stato: 200, dati: risposta() }]);
  const errori = [];
  const c = creaConfronto(radice, { suErrore: (m) => errori.push(m) });
  c.disegna({ modello: MURO, telaio: telaioLavoro(), solido: null });
  el("json").value = '{"C1": "GRAVITA", "nodi_sommita": [3]}'; el("json").dispatch("input");
  assert.equal(el("avanzato-titolo").textContent, "avanzato: mappa_casi in JSON (in uso)");
  el("nodi").value = "4"; el("nodi").dispatch("input");
  assert.equal(el("json").value, '{"C1": "GRAVITA", "nodi_sommita": [3]}', "il form non riscrive un JSON in uso");
  await el("confronta").dispatch("click");
  assert.deepEqual(spia.corpi[0].mappa_casi, { C1: "GRAVITA", nodi_sommita: [3] });
  el("json").value = '{"C1": '; el("json").dispatch("input");
  await el("confronta").dispatch("click");
  assert.equal(spia.rotte.length, 1, "nessuna richiesta con un JSON rotto");
  assert.match(errori.at(-1), /mappa_casi: JSON non valido/);
  c.azzera();
  assert.equal(el("avanzato-titolo").textContent, "avanzato: mappa_casi in JSON");
});

test("un JSON svuotato ma in uso vale «nessun caso mappato», non il form", async () => {
  const { radice, el } = radiceConfronto();
  const spia = fetchFinta([{ stato: 200, dati: risposta() }]);
  const c = creaConfronto(radice, { suErrore: () => {} });
  c.disegna({ modello: MURO, telaio: telaioLavoro(), solido: null });
  el("json").value = ""; el("json").dispatch("input");
  await el("confronta").dispatch("click");
  assert.deepEqual(spia.corpi[0].mappa_casi, {}, "solo massa e modi: il server accetta");
});

test("un 400 del server arriva in parole e la tabella di prima resta; la rete che cade pure", async () => {
  const { radice, el } = radiceConfronto();
  const spia = fetchFinta([{ stato: 200, dati: risposta() },
                           { stato: 400, dati: { esito: "errore", fase: "confronto", motivo: "mappa_casi nomina il passo «X», assente nel solido (passi validi: GRAVITA)" } },
                           { stato: 200, cade: true }]);
  const errori = [];
  const c = creaConfronto(radice, { suErrore: (m) => errori.push(m) });
  c.disegna({ modello: MURO, telaio: telaioLavoro(), solido: solidoLavoro() });
  await el("confronta").dispatch("click");
  await el("confronta").dispatch("click");
  assert.equal(errori.at(-1), "mappa_casi nomina il passo «X», assente nel solido (passi validi: GRAVITA)");
  assert.equal(el("corpo")._figli.length, 5, "la tabella buona resta");
  await el("confronta").dispatch("click");
  assert.equal(errori.at(-1), "il server non risponde");
  assert.equal(spia.rotte.length, 3);
  assert.equal(el("confronta").disabled, false, "il bottone si riaccende dopo l'errore");
});

test("nodi non interi: messaggio, nessuna richiesta; «copia» scrive la cartella negli appunti e lo dice", async () => {
  const { radice, el } = radiceConfronto();
  const spia = fetchFinta([{ stato: 200, dati: risposta() }]);
  const errori = [], scritto = [];
  const c = creaConfronto(radice, { suErrore: (m) => errori.push(m), appunti: { writeText: async (t) => { scritto.push(t); } } });
  c.disegna({ modello: MURO, telaio: telaioLavoro(), solido: null });
  el("nodi").value = "3; quattro"; el("nodi").dispatch("input");
  await el("confronta").dispatch("click");
  assert.equal(spia.rotte.length, 0);
  assert.match(errori.at(-1), /nodi in sommità/);
  el("nodi").value = "3; 4"; el("nodi").dispatch("input");
  await el("confronta").dispatch("click");
  await el("copia").dispatch("click");
  assert.deepEqual(scritto, ["corse/k1"]);
  assert.equal(el("copia").textContent, "copiato");
  c.disegna({ modello: MURO, telaio: telaioLavoro(), solido: null });
  assert.equal(el("copia").textContent, "copia", "al ridisegno il bottone torna «copia»");
});

test("senza appunti (http non sicuro) «copia» dice perché, senza sollevare", async () => {
  const { radice, el } = radiceConfronto();
  fetchFinta([{ stato: 200, dati: risposta() }]);
  const errori = [];
  const c = creaConfronto(radice, { suErrore: (m) => errori.push(m), appunti: null });
  c.disegna({ modello: MURO, telaio: telaioLavoro(), solido: null });
  await el("confronta").dispatch("click");
  await el("copia").dispatch("click");
  assert.equal(errori.at(-1), "gli appunti non sono disponibili: copia il percorso a mano");
});

test("un clic mentre uno gira è ignorato; azzera() due volte è idempotente", async () => {
  const { radice, el } = radiceConfronto();
  let sciogli;
  const cancello = new Promise((r) => { sciogli = r; });
  const spia = fetchFinta([{ stato: 200, dati: risposta(), attendi: cancello }]);
  const c = creaConfronto(radice, { suErrore: () => {} });
  c.disegna({ modello: MURO, telaio: telaioLavoro(), solido: null });
  const primo = el("confronta").dispatch("click");
  await el("confronta").dispatch("click");
  assert.equal(spia.rotte.length, 1, "il secondo clic non parte: uno alla volta");
  sciogli();
  await primo;
  assert.equal(spia.rotte.length, 1);
  assert.equal(el("corpo")._figli.length, 5);
  c.azzera(); c.azzera();
  assert.equal(el("telaio").value, "");
  assert.equal(el("confronta").disabled, true);
  assert.equal(el("scorri").hidden, true);
  assert.equal(el("note").hidden, true);
  assert.equal(el("cartella").hidden, true);
  assert.equal(el("vuoto").hidden, false);
  assert.equal(el("casi")._figli.length, 0);
  assert.equal(el("corpo")._figli.length, 0);
  assert.equal(el("stato").textContent, "");
});
