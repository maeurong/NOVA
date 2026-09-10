import { test } from "node:test";
import assert from "node:assert/strict";
import { OGGETTO_PER_CONTROLLO, PAROLA, righeVerdetti, testoSolutore, testoAttesa, testoUltima, stantia, verdettiDi, creaCorsa, versioneBreve }
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
  // Senza salute ma con una corsa buona alle spalle: il numero basta a dire che il solutore c'è.
  assert.equal(testoSolutore(null, "3.8.0"), "OpenSees 3.8.0");
  assert.equal(versioneBreve("Version 3.8.0 64-Bit (6e55293513192aa05c7e1205e66a5a1a1ed088c4)"), "3.8.0");
  assert.equal(versioneBreve("3.7"), "3.7");
  assert.equal(versioneBreve(null), null);
  assert.equal(versioneBreve("senza numero"), null);
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
  // Due decimali al massimo: «0,13 s», non «0,1291 s» (visto a schermo); «1,25 s» resta.
  assert.equal(testoUltima({ run_id: "a1b2c3d4e5f6", secondi: 0.1291, fin: { esito: "ok" } }), "corsa a1b2c3d4e5f6 · 0,13 s");
  assert.equal(testoUltima({ run_id: "a1b2c3d4e5f6", secondi: 1.25, fin: { esito: "ok" } }), "corsa a1b2c3d4e5f6 · 1,25 s");
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

// --- creaCorsa: il blocco «Corsa» del pannello (Task 4) ----------------------
// Il DOM finto è quello di `file.test.js:9-53`, copiato invece che importato — un test che
// importa dall'altro li lega, e il giorno che uno dei due cambia elemento l'altro si rompe
// per una ragione che non lo riguarda. Qui in più: `disabled` (i bottoni si spengono mentre
// la corsa gira) e `setAttribute` (`aria-current` sulla fase, `aria-label` sul «vai»).

function elementoFinto(iniziale = {}) {
  const listeners = {};
  const el = {
    value: "", hidden: false, title: "", className: "", type: "",
    disabled: false, _figli: [], _attrs: {}, _scritture: 0,
    addEventListener(ev, fn) { (listeners[ev] ??= []).push(fn); },
    dispatch(ev, argomento) { (listeners[ev] ?? []).forEach((fn) => fn(argomento)); },
    setAttribute(nome, valore) { this._attrs[nome] = String(valore); },
    getAttribute(nome) { return this._attrs[nome] ?? null; },
    append(...figli) { this._figli.push(...figli); },
    replaceChildren(...figli) { this._figli = figli; },
  };
  // `textContent` conta le scritture: `#corsa-ultima` è una live region, e riscriverla con lo
  // stesso testo la fa riannunciare — un accesso, non una proprietà, è l'unico modo di vederlo.
  let testo = "";
  Object.defineProperty(el, "textContent", {
    enumerable: true,
    get: () => testo,
    set(v) { testo = v; el._scritture++; },
  });
  Object.assign(el, iniziale);
  el._scritture = 0;          // l'allestimento non è una scrittura da contare
  return el;
}

globalThis.document = { createElement: () => elementoFinto() };

/** I tredici elementi del blocco, con gli `hidden` che il markup dichiara. */
function radiceCorsa() {
  const elementi = {
    "#corsa-solutore": elementoFinto({ textContent: "solutore: in verifica…" }),
    "#corsa-verifica": elementoFinto({ textContent: "verifica" }),
    "#corsa-corri": elementoFinto({ textContent: "corri" }),
    "#corsa-inp": elementoFinto(),
    "#corsa-corri-solido": elementoFinto({ textContent: "corri il solido" }),
    "#corsa-attesa": elementoFinto({ hidden: true }),
    "#corsa-fasi": elementoFinto(),
    "#corsa-secondi": elementoFinto(),
    // Niente `hidden` nel markup: è una live region, e vuota resta resa ad altezza zero (`:empty`).
    "#corsa-ultima": elementoFinto({ className: "numero" }),
    "#corsa-registro": elementoFinto({ hidden: true }),
    "#corsa-coda": elementoFinto(),
    "#corsa-vuoto": elementoFinto(),
    "#corsa-verdetti": elementoFinto({ hidden: true }),
  };
  return { radice: { querySelector: (sel) => elementi[sel] ?? null }, el: (sel) => elementi[sel] };
}

/** Una `fetch` finta **a sequenza**: risponde nell'ordine e registra rotta e corpo. L'ultima
 *  risposta resta quella buona per ogni chiamata in più (il polling ne fa quante ne servono).
 *  `cade` è la rete che salta, `attendi` una promessa che il test scioglie quando vuole. */
function fetchSequenza(risposte) {
  const spia = { chiamate: 0, rotte: [], corpi: [] };
  let i = 0;
  globalThis.fetch = async (rotta, opzioni) => {
    spia.chiamate++;
    spia.rotte.push(rotta);
    // La `GET` di `chiediJson` passa `{}`: senza corpo si registra `null`, non si solleva.
    spia.corpi.push(opzioni.body ? JSON.parse(opzioni.body) : null);
    const r = risposte[Math.min(i++, risposte.length - 1)];
    if (r.attendi) await r.attendi;
    if (r.cade) throw new TypeError("Failed to fetch");
    return { ok: r.stato < 400, status: r.stato, json: async () => r.dati };
  };
  return spia;
}

const respira = () => new Promise((r) => setTimeout(r, 1));
async function finoA(condizione, quanti = 500) {
  for (let i = 0; i < quanti; i++) { if (condizione()) return; await respira(); }
  throw new Error("la condizione non si è mai avverata");
}

const zero = { modello: () => ({}), suVai: () => {}, suErrore: () => {}, suEsito: () => {}, attesaMs: 1 };

test("creaCorsa: corri fa la POST, interroga finché non è finita, e scrive fasi, secondi e verdetti", async () => {
  const m = { nodi: [{ id: 1 }] };
  const spia = fetchSequenza([
    { stato: 202, dati: { run_id: "a1b2c3d4e5f6", stato: "in corso" } },
    { stato: 200, dati: { run_id: "a1b2c3d4e5f6", stato: "in corso", fasi: ["check model"], secondi: 0.4 } },
    { stato: 200, dati: { run_id: "a1b2c3d4e5f6", stato: "finita", fasi: ["check model", "leggo i recorder"], secondi: 1.25,
                          esito: "ok", verdetti_check: [v("unita", "passato")],
                          risultati: { verdetti: [v("reazioni", "passato", { caso: "Z1" })], run: { versione_opensees: "3.8.0" } } } },
  ]);
  const { radice, el } = radiceCorsa();
  const esiti = [];
  const c = creaCorsa(radice, { ...zero, modello: () => m, suEsito: (l) => esiti.push(l) });
  c.impostaSolutore({ esito: "ok", percorso: "/usr/bin/OpenSees" });   // quel che `app.js` fa con /api/salute
  const p = c.corri();
  assert.equal(el("#corsa-corri").disabled, true);
  assert.equal(el("#corsa-corri").textContent, "corro…");
  assert.equal(c.inCorso(), true);
  await p;
  assert.deepEqual(spia.rotte, ["/api/corsa", "/api/corsa/a1b2c3d4e5f6", "/api/corsa/a1b2c3d4e5f6"]);
  assert.deepEqual(spia.corpi[0], { modello: m, casi: null });
  assert.equal(el("#corsa-attesa").hidden, true);
  assert.equal(el("#corsa-ultima").textContent, "corsa a1b2c3d4e5f6 · 1,25 s");
  assert.equal(el("#corsa-verdetti")._figli.length, 2);
  assert.equal(el("#corsa-verdetti").hidden, false);
  assert.equal(el("#corsa-corri").disabled, false);
  assert.equal(el("#corsa-corri").textContent, "corri");
  assert.equal(c.inCorso(), false);
  assert.equal(esiti.length, 1);
  assert.equal(esiti[0].modello, m, "il lavoro porta lo snapshot su cui ha girato");
  // La versione arriva dai risultati della corsa, non da /api/salute: la riga in testa la prende.
  assert.equal(el("#corsa-solutore").textContent, "OpenSees 3.8.0 · /usr/bin/OpenSees");
});

test("creaCorsa: mentre gira l'attesa dice la fase corrente e i secondi; la corrente è in grassetto", async () => {
  let sblocca;
  const cancello = new Promise((r) => { sblocca = r; });
  fetchSequenza([
    { stato: 202, dati: { run_id: "b2", stato: "in corso" } },
    { stato: 200, dati: { run_id: "b2", stato: "in corso", fasi: ["check model", "scrivo il deck"], secondi: 0.4 } },
    { stato: 200, attendi: cancello, dati: { run_id: "b2", stato: "finita", fasi: ["check model", "scrivo il deck"],
                                             secondi: 2, esito: "ok", verdetti_check: [] } },
  ]);
  const { radice, el } = radiceCorsa();
  // La prima lettura è l'avvio, le altre il cronometro: 2,4 s di attesa dichiarata.
  let letture = 0;
  const c = creaCorsa(radice, { ...zero, orologio: () => (letture++ === 0 ? 1000 : 3400) });
  const p = c.corri();
  await finoA(() => el("#corsa-fasi")._figli.length === 2);
  assert.equal(el("#corsa-attesa").hidden, false);
  const fasi = el("#corsa-fasi")._figli;
  assert.deepEqual(fasi.map((li) => li.textContent), ["check model", "scrivo il deck"]);
  assert.equal(fasi[0].className, "");
  assert.equal(fasi[0]._attrs["aria-current"], undefined);
  assert.equal(fasi[1].className, "corrente");
  assert.equal(fasi[1]._attrs["aria-current"], "step", "la fase corrente si annuncia, non solo si ingrassa");
  assert.equal(el("#corsa-secondi").textContent, "2,4 s", "il decimo, non i quattro decimali di `cifre`");
  sblocca();
  await p;
  assert.equal(el("#corsa-attesa").hidden, true);
});

test("creaCorsa: stantia — dopo un altro snapshot la riga porta la parola e la classe", async () => {
  const m = { nodi: [] };
  fetchSequenza([
    { stato: 202, dati: { run_id: "c3", stato: "in corso" } },
    { stato: 200, dati: { run_id: "c3", stato: "finita", fasi: [], secondi: 1, esito: "ok", verdetti_check: [] } },
  ]);
  const { radice, el } = radiceCorsa();
  const c = creaCorsa(radice, { ...zero, modello: () => m });
  await c.corri();
  c.disegna({ modello: m });
  assert.equal(el("#corsa-ultima").textContent, "corsa c3 · 1 s");
  assert.ok(!el("#corsa-ultima").className.includes("stantia"));
  c.disegna({ modello: { ...m } });
  assert.ok(el("#corsa-ultima").textContent.endsWith(" · stantia"), el("#corsa-ultima").textContent);
  assert.ok(el("#corsa-ultima").className.includes("stantia"), "il filetto accompagna la parola, non la sostituisce");
  c.disegna({ modello: m });
  assert.equal(el("#corsa-ultima").textContent, "corsa c3 · 1 s", "⌘Z fino a quello snapshot la fa tornare fresca");
  assert.ok(!el("#corsa-ultima").className.includes("stantia"));
});

test("creaCorsa: 409 dice che un'altra corsa è in corso e libera i bottoni", async () => {
  const spia = fetchSequenza([{ stato: 409, dati: { motivo: "un'altra corsa è in corso" } }]);
  const { radice, el } = radiceCorsa();
  const errori = [];
  const c = creaCorsa(radice, { ...zero, suErrore: (t) => errori.push(t) });
  await c.corri();
  assert.deepEqual(errori, ["un'altra corsa è in corso"]);
  assert.equal(spia.chiamate, 1, "il 409 ferma tutto sulla POST: nessun polling di una corsa che non è nostra");
  assert.equal(el("#corsa-corri").disabled, false);
  assert.equal(el("#corsa-verifica").disabled, false);
  assert.equal(el("#corsa-corri-solido").disabled, false);
  assert.equal(el("#corsa-ultima").textContent, "");
});

// Due modi di perdere il polling a metà, stesso oracolo: nessun lavoro registrato. La rete
// che salta (server spento) e il 404 (server riavviato sotto, il run_id non esiste più).
test("creaCorsa: la rete che cade a metà polling non lascia un lavoro a metà, e nemmeno il 404", async () => {
  fetchSequenza([
    { stato: 202, dati: { run_id: "d4", stato: "in corso" } },
    { cade: true },
  ]);
  const primo = radiceCorsa();
  const errori = [];
  const esiti = [];
  const c = creaCorsa(primo.radice, { ...zero, suErrore: (t) => errori.push(t), suEsito: (l) => esiti.push(l) });
  await c.corri();
  assert.deepEqual(errori, ["il server non risponde"]);
  assert.equal(primo.el("#corsa-attesa").hidden, true);
  assert.equal(primo.el("#corsa-ultima").textContent, "", "nessun lavoro registrato: la riga resta muta invece di mentire");
  assert.equal(esiti.length, 0);
  assert.equal(primo.el("#corsa-corri").disabled, false);
  assert.equal(c.inCorso(), false);

  fetchSequenza([
    { stato: 202, dati: { run_id: "d5", stato: "in corso" } },
    { stato: 404, dati: { motivo: "nessuna corsa d5" } },
  ]);
  const secondo = radiceCorsa();
  const errori2 = [];
  const esiti2 = [];
  const c2 = creaCorsa(secondo.radice, { ...zero, suErrore: (t) => errori2.push(t), suEsito: (l) => esiti2.push(l) });
  await c2.corri();
  assert.deepEqual(errori2, ["nessuna corsa d5"]);
  assert.equal(secondo.el("#corsa-attesa").hidden, true);
  assert.equal(secondo.el("#corsa-ultima").textContent, "");
  assert.equal(esiti2.length, 0);
  assert.equal(secondo.el("#corsa-corri").disabled, false);
});

test("creaCorsa: rifiutata dal Check Model — riga e verdetti, niente registro", async () => {
  fetchSequenza([
    { stato: 202, dati: { run_id: "e5", stato: "in corso" } },
    { stato: 200, dati: { run_id: "e5", stato: "finita", fasi: ["check model"], secondi: 0.3, esito: "rifiutato",
                          verdetti_check: [v("nodi_liberi", "non_passato", { oggetto: [3], rimedio: "elimina il nodo" })] } },
  ]);
  const { radice, el } = radiceCorsa();
  const andati = [];
  const c = creaCorsa(radice, { ...zero, suVai: (x) => andati.push(x) });
  await c.corri();
  assert.equal(el("#corsa-ultima").textContent, "corsa e5 · rifiutata dal Check Model");
  assert.equal(el("#corsa-registro").hidden, true, "il Check Model non ha un registro del solutore: non è mai partito");
  assert.equal(el("#corsa-verdetti")._figli.length, 1);
  const li = el("#corsa-verdetti")._figli[0];
  assert.ok(li.className.includes("verdetto"));
  assert.ok(li.className.includes("non_passato"));
  assert.ok(li.className.includes("con-vai"));
  assert.deepEqual(li._figli.map((s) => s.textContent),
    ["●", "nodi_liberi", "non passato", "r", "→ elimina il nodo", "vai"]);
  assert.equal(li._figli[0]._attrs["aria-hidden"], "true", "il punto è un doppione della parola: a voce non si sente");
  const bottone = li._figli.at(-1);
  assert.equal(bottone._attrs["aria-label"], "vai al nodo 3");
  bottone.dispatch("click");
  assert.deepEqual(andati, [{ tipo: "nodo", id: 3 }]);
});

test("creaCorsa: errore del solutore — motivo nella riga e la coda del registro nel details", async () => {
  fetchSequenza([
    { stato: 202, dati: { run_id: "f6", stato: "in corso" } },
    { stato: 200, dati: { run_id: "f6", stato: "finita", fasi: ["corro"], secondi: 3, esito: "errore",
                          fase: "solutore", motivo: "esce 1", coda_log: "...ultime righe" } },
  ]);
  const primo = radiceCorsa();
  await creaCorsa(primo.radice, { ...zero }).corri();
  assert.equal(primo.el("#corsa-ultima").textContent, "corsa f6 · errore in solutore: esce 1");
  assert.equal(primo.el("#corsa-coda").textContent, "...ultime righe");
  assert.equal(primo.el("#corsa-registro").hidden, false);

  // Coda vuota: un `<details>` che si apre sul nulla è una promessa non mantenuta.
  fetchSequenza([
    { stato: 202, dati: { run_id: "f7", stato: "in corso" } },
    { stato: 200, dati: { run_id: "f7", stato: "finita", fasi: [], secondi: 3, esito: "errore",
                          fase: "solutore", motivo: "esce 1", coda_log: "" } },
  ]);
  const secondo = radiceCorsa();
  await creaCorsa(secondo.radice, { ...zero }).corri();
  assert.equal(secondo.el("#corsa-registro").hidden, true);
});

test("creaCorsa: solutore assente — la riga del solutore si aggiorna con dove prenderlo", async () => {
  fetchSequenza([
    { stato: 202, dati: { run_id: "g7", stato: "in corso" } },
    { stato: 200, dati: { run_id: "g7", stato: "finita", fasi: [], secondi: 0.1, esito: "assente",
                          dove_prenderlo: "da X" } },
  ]);
  const { radice, el } = radiceCorsa();
  await creaCorsa(radice, { ...zero }).corri();
  assert.equal(el("#corsa-solutore").textContent, "OpenSees assente — da X");
  assert.equal(el("#corsa-ultima").textContent, "corsa g7 · OpenSees assente");
});

test("creaCorsa: verifica fa la POST a /api/check e mostra i verdetti anche se tutti passati", async () => {
  const m = { nodi: [] };
  const spia = fetchSequenza([{ stato: 200, dati: { esito: "ok", verdetti: [v("unita", "passato"), v("vincoli", "passato")] } }]);
  const { radice, el } = radiceCorsa();
  const esiti = [];
  const c = creaCorsa(radice, { ...zero, modello: () => m, suEsito: (l) => esiti.push(l) });
  const p = c.verifica();
  assert.equal(el("#corsa-verifica").textContent, "verifico…");
  assert.equal(el("#corsa-verifica").disabled, true);
  await p;
  assert.deepEqual(spia.rotte, ["/api/check"]);
  assert.deepEqual(spia.corpi[0], { modello: m });
  assert.equal(el("#corsa-verdetti")._figli.length, 2, "il verde si vede: due passati sono due righe, non il silenzio");
  assert.equal(el("#corsa-verdetti").hidden, false);
  assert.equal(el("#corsa-vuoto").hidden, true);
  assert.equal(el("#corsa-ultima").textContent, "", "la verifica non è una corsa: nessuna riga dell'ultima");
  assert.deepEqual(esiti, [null], "la verifica chiama suEsito senza lavoro: il chiamante ridisegna e pulisce");
  assert.equal(el("#corsa-verifica").textContent, "verifica");
  assert.equal(el("#corsa-verifica").disabled, false);
});

// La guardia del modo vale anche per i bottoni, non solo per ⌘⏎: `prima()` dice perché non si
// corre adesso, e nessuna richiesta parte.
test("creaCorsa: prima() che dice di no ferma corri, verifica e il solido senza richieste", async () => {
  // La seconda risposta cade apposta: se `prima()` venisse ignorata la corsa partirebbe e il test
  // deve finire rosso, non restare appeso sul polling.
  const spia = fetchSequenza([{ stato: 202, dati: { run_id: "h9", stato: "in corso" } }, { cade: true }]);
  const { radice } = radiceCorsa();
  const errori = [];
  const c = creaCorsa(radice, { ...zero, prima: () => "chiudi il gesto (Esc) prima di correre", suErrore: (t) => errori.push(t) });
  await c.corri(); await c.verifica();
  assert.deepEqual(errori, Array(2).fill("chiudi il gesto (Esc) prima di correre"));
  assert.equal(spia.chiamate, 0);
  // Il solido non legge il modello: il ghost aperto non lo ferma (parte, e qui la rete cade).
  radice.querySelector("#corsa-inp").value = "/x/trave.inp";
  await c.corriSolido();
  assert.equal(spia.chiamate, 2, "POST e la GET che cade");
  assert.equal(errori.at(-1), "il server non risponde");
  assert.equal(c.inCorso(), false);
});

// Come `lavora`: «apri» mentre la verifica è in volo butta la risposta in ritardo, altrimenti i
// verdetti del file vecchio ricompaiono sotto il modello nuovo con «vai» a id che non esistono.
test("creaCorsa: azzera() durante la verifica butta i verdetti in ritardo", async () => {
  let sblocca;
  const cancello = new Promise((r) => { sblocca = r; });
  fetchSequenza([{ stato: 200, attendi: cancello, dati: { esito: "rifiutato", verdetti: [v("nodi_liberi", "non_passato", { oggetto: [99] })] } }]);
  const { radice, el } = radiceCorsa();
  const esiti = [];
  const c = creaCorsa(radice, { ...zero, suEsito: (l) => esiti.push(l) });
  const p = c.verifica();
  c.azzera();
  sblocca(); await p;
  assert.equal(el("#corsa-verdetti")._figli.length, 0);
  assert.equal(el("#corsa-verdetti").hidden, true);
  assert.equal(esiti.length, 0, "nessun esito per una verifica azzerata");
  assert.equal(c.inCorso(), false);
});

test("creaCorsa: corri mentre gira è un rifiuto che parla, senza richiesta", async () => {
  let sblocca;
  const cancello = new Promise((r) => { sblocca = r; });
  const spia = fetchSequenza([
    { stato: 202, attendi: cancello, dati: { run_id: "h8", stato: "in corso" } },
    { stato: 200, dati: { run_id: "h8", stato: "finita", fasi: [], secondi: 1, esito: "ok", verdetti_check: [] } },
  ]);
  const { radice } = radiceCorsa();
  const errori = [];
  const c = creaCorsa(radice, { ...zero, suErrore: (t) => errori.push(t) });
  const p = c.corri();
  await finoA(() => spia.chiamate === 1);
  await c.corri();
  await c.verifica();
  assert.deepEqual(errori, ["una corsa è già in corso", "una corsa è già in corso"]);
  assert.equal(spia.chiamate, 1, "rifiutare in silenzio è peggio che rifiutare; una seconda richiesta è peggio di entrambi");
  sblocca();
  await p;
  // A corsa finita l'avviso se ne va — `suErrore(null)` — e solo perché era nostro.
  assert.equal(errori.at(-1), null, "l'avviso «già in corso» non sopravvive alla corsa finita");
  assert.equal(errori.length, 3);
});

test("creaCorsa: senza l'avviso «già in corso» una corsa finita non tocca il messaggio", async () => {
  fetchSequenza([
    { stato: 202, dati: { run_id: "h8", stato: "in corso" } },
    { stato: 200, dati: { run_id: "h8", stato: "finita", fasi: [], secondi: 1, esito: "ok", verdetti_check: [] } },
  ]);
  const { radice } = radiceCorsa();
  const errori = [];
  const c = creaCorsa(radice, { ...zero, suErrore: (t) => errori.push(t) });
  await c.corri();
  assert.deepEqual(errori, [], "nessun suErrore(null) gratuito: un messaggio altrui resterebbe");
});

test("creaCorsa: corri il solido — campo vuoto rifiuta; con il percorso fa la POST a /api/ccx e scrive la cartella", async () => {
  let spia = fetchSequenza([{ stato: 202, dati: {} }]);
  const { radice, el } = radiceCorsa();
  const errori = [];
  const c = creaCorsa(radice, { ...zero, suErrore: (t) => errori.push(t) });
  await c.corriSolido();
  assert.deepEqual(errori, ["scrivi il percorso del deck del solido"]);
  assert.equal(spia.chiamate, 0);

  spia = fetchSequenza([
    { stato: 202, dati: { run_id: "i9", stato: "in corso", cartella: "/c/x" } },
    { stato: 200, dati: { run_id: "i9", stato: "finita", fasi: ["scrivo il deck"], secondi: 7.5, esito: "ok", cartella: "/c/x" } },
  ]);
  el("#corsa-inp").value = "  docs/caso-studio/muro_1.inp  ";
  await c.corriSolido();
  assert.deepEqual(spia.rotte, ["/api/ccx", "/api/corsa/i9"]);
  assert.deepEqual(spia.corpi[0], { inp: "docs/caso-studio/muro_1.inp" });
  assert.equal(el("#corsa-ultima").textContent, "corsa del solido i9 · 7,5 s · cartella /c/x");
  assert.equal(el("#corsa-verdetti").hidden, true, "il solido non passa dal Check Model: nessun verdetto da mostrare");
  assert.equal(el("#corsa-corri-solido").textContent, "corri il solido");
  assert.equal(el("#corsa-corri-solido").disabled, false);
});

test("creaCorsa: azzera dimentica lavoro e verdetti e rimette lo stato vuoto; una risposta in ritardo non lo riporta", async () => {
  fetchSequenza([
    { stato: 202, dati: { run_id: "l1", stato: "in corso" } },
    { stato: 200, dati: { run_id: "l1", stato: "finita", fasi: [], secondi: 1, esito: "ok",
                          verdetti_check: [v("unita", "passato")] } },
  ]);
  const { radice, el } = radiceCorsa();
  const esiti = [];
  const c = creaCorsa(radice, { ...zero, suEsito: (l) => esiti.push(l) });
  await c.corri();
  assert.ok(el("#corsa-ultima").textContent.startsWith("corsa l1"));
  assert.equal(el("#corsa-verdetti")._figli.length, 1);
  c.azzera();
  assert.equal(el("#corsa-ultima").textContent, "");
  assert.equal(el("#corsa-verdetti").hidden, true);
  assert.equal(el("#corsa-verdetti")._figli.length, 0);
  assert.equal(el("#corsa-registro").hidden, true);
  assert.equal(el("#corsa-vuoto").hidden, false, "senza lavoro né verdetti lo stato vuoto torna a insegnare il gesto");

  // La risposta che arriva dopo l'azzera è di un'altra generazione: si butta.
  let sblocca;
  const cancello = new Promise((r) => { sblocca = r; });
  const spia = fetchSequenza([
    { stato: 202, dati: { run_id: "l2", stato: "in corso" } },
    { stato: 200, attendi: cancello, dati: { run_id: "l2", stato: "finita", fasi: [], secondi: 1, esito: "ok",
                                             verdetti_check: [v("unita", "passato")] } },
  ]);
  const p = c.corri();
  await finoA(() => spia.chiamate === 2);
  c.azzera();
  sblocca();
  await p;
  assert.equal(el("#corsa-ultima").textContent, "", "il lavoro finisce, ma non si registra");
  assert.equal(el("#corsa-verdetti")._figli.length, 0);
  assert.equal(esiti.length, 1, "solo la prima corsa ha chiamato suEsito");
  assert.equal(el("#corsa-corri").disabled, false);
});

test("creaCorsa: ogni bottone ha un nome accessibile che comincia dal testo visibile, e i «vai» sono distinti", async () => {
  fetchSequenza([
    { stato: 202, dati: { run_id: "m2", stato: "in corso" } },
    { stato: 200, dati: { run_id: "m2", stato: "finita", fasi: [], secondi: 1, esito: "rifiutato",
                          verdetti_check: [v("nodi_liberi", "non_passato", { oggetto: [3] }),
                                           v("nodo_su_asta", "non_passato", { oggetto: [[7, 2]] }),
                                           v("armatura_mancante", "non_passato", { oggetto: [4] })] } },
  ]);
  const { radice, el } = radiceCorsa();
  const c = creaCorsa(radice, { ...zero });
  await c.corri();
  const vai = el("#corsa-verdetti")._figli.map((li) => li._figli.at(-1));
  const tutti = [el("#corsa-verifica"), el("#corsa-corri"), el("#corsa-corri-solido"), ...vai];
  for (const b of tutti) {
    const nome = b._attrs["aria-label"] ?? b.textContent;
    assert.ok(nome.startsWith(b.textContent), `«${nome}» non comincia da «${b.textContent}» (WCAG 2.5.3)`);
  }
  const etichette = vai.map((b) => b._attrs["aria-label"]);
  assert.deepEqual(etichette, ["vai al nodo 3", "vai al nodo 7", "vai alla sezione 4"]);
  assert.equal(new Set(etichette).size, 3, "tre «vai» identici a voce sono tre bersagli indistinguibili");
});

// --- fix round 1 ---------------------------------------------------------------

// A1. Il `keydown` del campo e il listener globale di `app.js` guardano lo stesso tasto: senza
// il filtro sui modificatori, `⌘⏎` scritto qui dentro partiva **due volte** — una da questo
// listener come «corri il solido», una da `window` come «corri». Invio nudo resta di questo campo.
test("creaCorsa: ⌘⏎ nel campo del deck non lancia il solido — quella scorciatoia è di app.js", async () => {
  const spia = fetchSequenza([
    { stato: 202, dati: { run_id: "n1", stato: "in corso" } },
    { stato: 200, dati: { run_id: "n1", stato: "finita", fasi: [], secondi: 1, esito: "ok" } },
  ]);
  const { radice, el } = radiceCorsa();
  const c = creaCorsa(radice, { ...zero });
  el("#corsa-inp").value = "docs/caso-studio/muro_1.inp";
  let impedito = 0;
  const tasto = (extra) => el("#corsa-inp").dispatch("keydown",
    { key: "Enter", preventDefault: () => impedito++, ...extra });
  tasto({ metaKey: true });
  tasto({ ctrlKey: true });
  tasto({ shiftKey: true });
  assert.equal(spia.chiamate, 0, "⌘⏎ risale a window come «corri»: partire anche di qui è una corsa di troppo");
  assert.equal(impedito, 0, "e nemmeno si mangia il tasto che non è suo");
  tasto({});
  await finoA(() => !c.inCorso());
  assert.equal(impedito, 1);
  assert.equal(spia.rotte[0], "/api/ccx", "Invio nudo resta il gesto del campo");
});

// A2. Il solido gira su un `.inp` su disco, non sullo snapshot: cambiare il modello non lo
// invecchia, e dirgli «stantia» prometterebbe un rilancio che non cambia niente.
test("creaCorsa: la corsa del solido non invecchia — ha girato su un .inp, non sullo snapshot", async () => {
  const m = { nodi: [] };
  fetchSequenza([
    { stato: 202, dati: { run_id: "s1", stato: "in corso", cartella: "/c/y" } },
    { stato: 200, dati: { run_id: "s1", stato: "finita", fasi: [], secondi: 2, esito: "ok", cartella: "/c/y" } },
  ]);
  const { radice, el } = radiceCorsa();
  const c = creaCorsa(radice, { ...zero, modello: () => m });
  el("#corsa-inp").value = "docs/caso-studio/muro_1.inp";
  await c.corriSolido();
  const testo = el("#corsa-ultima").textContent;
  assert.ok(testo.startsWith("corsa del solido s1"));
  c.disegna({ modello: { ...m } });
  assert.equal(el("#corsa-ultima").textContent, testo, "un altro snapshot non invecchia una corsa che il modello non l'ha mai toccato");
  assert.ok(!el("#corsa-ultima").className.includes("stantia"));
});

// C. `#corsa-ultima` è una live region, e `app.js` ridisegna a ogni comando: riscriverla con lo
// stesso testo la fa riannunciare a ogni clic.
test("creaCorsa: la riga dell'ultima parla una volta sola — due disegni uguali non la riscrivono", async () => {
  const m = { nodi: [] };
  fetchSequenza([
    { stato: 202, dati: { run_id: "u1", stato: "in corso" } },
    { stato: 200, dati: { run_id: "u1", stato: "finita", fasi: [], secondi: 1, esito: "ok", verdetti_check: [] } },
  ]);
  const { radice, el } = radiceCorsa();
  const c = creaCorsa(radice, { ...zero, modello: () => m });
  await c.corri();
  const dopoLaCorsa = el("#corsa-ultima")._scritture;
  c.disegna({ modello: m });
  c.disegna({ modello: m });
  c.disegna({ modello: m });
  assert.equal(el("#corsa-ultima")._scritture, dopoLaCorsa,
    "tre ridisegni identici sono tre annunci identici: la riga si scrive solo quando cambia");
  c.disegna({ modello: { ...m } });
  assert.equal(el("#corsa-ultima")._scritture, dopoLaCorsa + 1, "quando cambia davvero, parla");
  // E non si nasconde: vuota o piena, `hidden` non è più il canale (lo fa `:empty` nel CSS).
  assert.equal(el("#corsa-ultima").hidden, false);
  c.azzera();
  assert.equal(el("#corsa-ultima").textContent, "");
  assert.equal(el("#corsa-ultima").hidden, false);
});

// D. La guardia di generazione stava dopo il ciclo: `azzera()` a metà corsa lasciava il polling
// a riscrivere l'attesa e i bottoni spenti finché il server non diceva «finita» — e su una corsa
// abbandonata quel momento poteva non arrivare mai. La terza risposta è una rete che cade: serve
// solo a **terminare** il ciclo se la guardia non c'è — con la guardia al posto giusto quella
// risposta non viene mai chiesta, ed è proprio quella l'asserzione.
test("creaCorsa: azzera a metà polling ferma l'attesa al giro dopo", { timeout: 5000 }, async () => {
  const spia = fetchSequenza([
    { stato: 202, dati: { run_id: "p1", stato: "in corso" } },
    { stato: 200, dati: { run_id: "p1", stato: "in corso", fasi: ["check model"], secondi: 0.4 } },
    { cade: true },
  ]);
  const { radice, el } = radiceCorsa();
  const errori = [];
  const c = creaCorsa(radice, { ...zero, suErrore: (t) => errori.push(t) });
  const p = c.corri();
  await finoA(() => el("#corsa-fasi")._figli.length === 1);
  const giri = spia.chiamate;
  c.azzera();
  await p;
  assert.equal(spia.chiamate, giri, "dopo l'azzera non si interroga più una corsa che nessuno vuole");
  assert.deepEqual(errori, [], "l'azzera è un gesto dell'utente, non un guasto: nessun errore da leggere");
  assert.equal(el("#corsa-attesa").hidden, true, "l'attesa sparisce invece di restare a girare");
  assert.equal(el("#corsa-fasi")._figli.length, 1, "e le fasi non si riscrivono più");
  assert.equal(el("#corsa-corri").disabled, false);
  assert.equal(c.inCorso(), false);
});
