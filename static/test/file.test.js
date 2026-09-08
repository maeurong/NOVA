import { test } from "node:test";
import assert from "node:assert/strict";
import { corto, messaggioErrore, testoStato, separaPercorso, depositoSicuro, creaFile, chiediJson }
  from "../file.js";

// `creaFile` chiama `document.createElement` solo dentro `disegnaRecenti()`, mai
// nell'inizializzazione dei test qui sotto in cui l'elenco parte vuoto — ma lo stub serve
// comunque perché `disegnaRecenti()` gira una volta alla creazione.
globalThis.document = { createElement: () => elementoFinto() };

function elementoFinto() {
  const listeners = {};
  return {
    value: "",
    textContent: "",
    hidden: false,
    title: "",
    className: "",
    _figli: [],
    addEventListener(ev, fn) { (listeners[ev] ??= []).push(fn); },
    // I bottoni disegnati vanno premuti davvero: un listener mai collegato lascia un bottone
    // morto, e un `addEventListener` che butta via la funzione non se ne accorge mai.
    dispatch(ev, argomento) { (listeners[ev] ?? []).forEach((fn) => fn(argomento)); },
    append(...figli) { this._figli.push(...figli); },
    replaceChildren(...figli) { this._figli = figli; },
  };
}

function radiceFinta() {
  const elementi = {
    "#file-percorso": elementoFinto(),
    "#file-stato": elementoFinto(),
    "#file-recenti": elementoFinto(),
    "#file-recenti-vuoto": elementoFinto(),
    "#file-apri": elementoFinto(),
  };
  return { elementi, querySelector: (sel) => elementi[sel] ?? null };
}

const depositoCon = (...percorsi) => ({ getItem: () => JSON.stringify(percorsi), setItem() {} });

/** Una `fetch` finta che risponde dopo `ritardo` ms, contando chiamate e corpi spediti. */
function fetchFinta({ dati = { modello: { nodi: [] }, impronta: "abc" }, ritardo = 0, ok = true, stato = 200 } = {}) {
  const spia = { chiamate: 0, corpi: [] };
  globalThis.fetch = async (rotta, opzioni) => {
    spia.chiamate++;
    spia.corpi.push(JSON.parse(opzioni.body));
    if (ritardo) await new Promise((r) => setTimeout(r, ritardo));
    return { ok, status: stato, json: async () => dati };
  };
  return spia;
}

/** I bottoni dei recenti, come `disegnaRecenti` li ha appesi: `<ul>` → `<li>` → `<button>`. */
const bottoniRecenti = (elenco) => elenco._figli.map((li) => li._figli[0]);

// --- corto ---

test("corto: assente torna un trattino", () => {
  assert.equal(corto(undefined), "—");
  assert.equal(corto(null), "—");
  assert.equal(corto(""), "—");
});

test("corto: le prime 8 cifre, non 7 né tutta l'impronta", () => {
  const lunga = "0137e564e923ec1e62688bfa9e12591acb4ae6125d3a6e1b1dfefdcfe2169bb0";
  assert.equal(corto(lunga), "0137e564");
  assert.equal(corto(lunga).length, 8);
});

// --- messaggioErrore ---

test("messaggioErrore: usa il motivo del server quando c'è", () => {
  assert.equal(messaggioErrore({ motivo: "nodi.0.pinguino: campo non previsto" }, 400),
    "nodi.0.pinguino: campo non previsto");
});

test("messaggioErrore: senza motivo dice lo stato, mai «undefined»", () => {
  assert.equal(messaggioErrore({}, 503), "il server ha risposto 503");
});

// --- chiediJson ---

// Server spento: `fetch` cade con «Failed to fetch», che è inglese e non dice niente. La
// frase la scrive un posto solo, e la scrive per tutti — l'area file e l'ispettore.
test("chiediJson: una `fetch` che solleva diventa «il server non risponde»", async (t) => {
  const originale = globalThis.fetch;
  t.after(() => { globalThis.fetch = originale; });
  globalThis.fetch = async () => { throw new TypeError("Failed to fetch"); };
  await assert.rejects(() => chiediJson("/api/catalogo"), /il server non risponde/);
});

test("chiediJson: senza corpo è una GET — nessun `body` da spedire", async (t) => {
  const originale = globalThis.fetch;
  t.after(() => { globalThis.fetch = originale; });
  let viste = null;
  globalThis.fetch = async (_, opzioni) => { viste = opzioni; return { ok: true, status: 200, json: async () => ({ a: 1 }) }; };
  assert.deepEqual(await chiediJson("/api/catalogo"), { a: 1 });
  assert.deepEqual(viste, {});
});

test("chiediJson: un rifiuto porta il motivo del server, non lo stato nudo", async (t) => {
  const originale = globalThis.fetch;
  t.after(() => { globalThis.fetch = originale; });
  globalThis.fetch = async () => ({ ok: false, status: 400, json: async () => ({ motivo: "veste «piano» sconosciuta" }) });
  await assert.rejects(() => chiediJson("/api/materiale/legame", { veste: "piano" }), /veste «piano» sconosciuta/);
});

// --- testoStato ---

test("testoStato: niente percorso, niente modello aperto", () => {
  assert.equal(testoStato({ percorso: null, impronta: null, modificato: false }),
    "nessun modello aperto");
});

test("testoStato: percorso aperto mostra l'impronta corta, modificato in coda", () => {
  assert.equal(testoStato({ percorso: "/a", impronta: "0137e564e9...", modificato: false }),
    "a · impronta 0137e564");
  assert.equal(testoStato({ percorso: "/a", impronta: "0137e564e9...", modificato: true }),
    "a · impronta 0137e564 · modificato");
});

// --- separaPercorso ---

test("separaPercorso: senza cartella, il nome è il percorso intero", () => {
  assert.deepEqual(separaPercorso("muro_1.nova.json"), { cartella: "", nome: "muro_1.nova.json" });
});

test("separaPercorso: stringa vuota non solleva", () => {
  assert.deepEqual(separaPercorso(""), { cartella: "", nome: "" });
});

test("separaPercorso: divide all'ultimo separatore", () => {
  assert.deepEqual(separaPercorso("docs/caso-studio/muro_1.nova.json"),
    { cartella: "docs/caso-studio", nome: "muro_1.nova.json" });
});

// --- depositoSicuro (mutante 1: try/catch tolto, sostituito col `typeof` di prima) ---

test("depositoSicuro: senza un deposito reale, non solleva e torna un valore falso", () => {
  // In Node il globale `localStorage` esiste ma senza `--localstorage-file` vale `undefined`
  // (non lancia): il contratto che conta è «non solleva, e ciò che torna è falso», non un
  // confronto rigido con `null` che dipende dalla versione del runtime.
  assert.doesNotThrow(() => depositoSicuro());
  assert.ok(!depositoSicuro());
});

test("depositoSicuro: un getter che solleva torna null, non fa sollevare creaFile", (t) => {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get() { throw new DOMException("bloccato", "SecurityError"); },
  });
  t.after(() => { delete globalThis.localStorage; });
  assert.equal(depositoSicuro(), null);
});

// --- ingresso degenere: localStorage che solleva, nessun deposito iniettato ---

test("creaFile: localStorage bloccato e nessun deposito iniettato — l'area funziona, elenco vuoto", (t) => {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get() { throw new DOMException("bloccato", "SecurityError"); },
  });
  t.after(() => { delete globalThis.localStorage; });
  const radice = radiceFinta();
  assert.doesNotThrow(() => creaFile(radice, { suApertura() {}, suErrore() {}, suSalvataggio() {} }));
  assert.equal(radice.elementi["#file-recenti"].hidden, true);
  assert.equal(radice.elementi["#file-recenti-vuoto"].hidden, false);
});

// --- ingresso degenere + mutante 7: l'oggetto evento al posto di una stringa ---

test("apri: un oggetto evento al posto del percorso legge il campo, non solleva", async () => {
  const originale = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({ modello: { nodi: [] }, impronta: "abc" }),
  });
  const radice = radiceFinta();
  radice.elementi["#file-percorso"].value = "/tmp/dal-campo.json";
  let apertoCon = null;
  const f = creaFile(radice, {
    suApertura: (p) => { apertoCon = p; },
    suErrore: () => { throw new Error("non doveva fallire"); },
    suSalvataggio() {},
  });
  await assert.doesNotReject(() => f.apri({ type: "click" }));
  assert.equal(apertoCon, "/tmp/dal-campo.json");
  globalThis.fetch = originale;
});

// --- ingresso degenere + mutante 6: doppio Invio in corsa ---

test("apri: due chiamate in corsa producono una sola fetch", async () => {
  const originale = globalThis.fetch;
  let chiamate = 0;
  globalThis.fetch = async () => {
    chiamate++;
    await new Promise((r) => setTimeout(r, 5));
    return { ok: true, json: async () => ({ modello: { nodi: [] }, impronta: "abc" }) };
  };
  const radice = radiceFinta();
  radice.elementi["#file-percorso"].value = "/tmp/a.json";
  const f = creaFile(radice, { suApertura() {}, suErrore() {}, suSalvataggio() {} });
  await Promise.all([f.apri(), f.apri()]);
  assert.equal(chiamate, 1);
  globalThis.fetch = originale;
});

// =====================================================================================
// A2 — «salva» scrive sul modello aperto, non sul campo di testo
// =====================================================================================

test("salva: col percorso aperto non guarda il campo, nemmeno se il campo dice altro", async (t) => {
  const originale = globalThis.fetch;
  t.after(() => { globalThis.fetch = originale; });
  const spia = fetchFinta({ dati: { impronta: "f1" } });
  const radice = radiceFinta();
  radice.elementi["#file-percorso"].value = "/tmp/B.json";   // il recente cliccato, che ha fallito
  const f = creaFile(radice, { suApertura() {}, suErrore() {}, suSalvataggio() {} });
  await f.salva("/tmp/A.json", { nodi: [] });
  assert.equal(spia.corpi[0].percorso, "/tmp/A.json");
});

// L'unico caso in cui il campo è la destinazione: un modello mai salvato non ha un percorso
// aperto, e il chiamante passa `null`.
test("salva: senza nessun modello aperto usa il campo — è l'unica volta", async (t) => {
  const originale = globalThis.fetch;
  t.after(() => { globalThis.fetch = originale; });
  const spia = fetchFinta({ dati: { impronta: "f1" } });
  const radice = radiceFinta();
  radice.elementi["#file-percorso"].value = "  /tmp/nuovo.json  ";
  const f = creaFile(radice, { suApertura() {}, suErrore() {}, suSalvataggio() {} });
  await f.salva(null, { nodi: [] });
  assert.equal(spia.corpi[0].percorso, "/tmp/nuovo.json");
});

test("salva: campo vuoto e nessun percorso aperto lo dice, e non spedisce niente", async (t) => {
  const originale = globalThis.fetch;
  t.after(() => { globalThis.fetch = originale; });
  const spia = fetchFinta();
  const radice = radiceFinta();
  let detto = null;
  const f = creaFile(radice, { suApertura() {}, suErrore: (m) => { detto = m; }, suSalvataggio() {} });
  await f.salva(null, { nodi: [] });
  assert.equal(spia.chiamate, 0);
  assert.match(detto, /scrivi il percorso/);
});

// Il clic su un recente non scriveva il campo prima di sapere se l'apertura riusciva: da lì
// il campo e il percorso aperto divergevano, e il ⌘S dopo finiva nel file sbagliato.
test("recenti: un'apertura fallita non sporca il campo del percorso", async (t) => {
  const originale = globalThis.fetch;
  t.after(() => { globalThis.fetch = originale; });
  fetchFinta({ ok: false, stato: 404, dati: { motivo: "il file non esiste" } });
  const radice = radiceFinta();
  radice.elementi["#file-percorso"].value = "/tmp/A.json";
  const f = creaFile(radice, { suApertura() {}, suErrore() {}, suSalvataggio() {},
                               deposito: depositoCon("/tmp/B.json") });
  const [bottoneB] = bottoniRecenti(radice.elementi["#file-recenti"]);
  await bottoneB.dispatch("click");
  await new Promise((r) => setTimeout(r, 5));
  assert.equal(radice.elementi["#file-percorso"].value, "/tmp/A.json");
});

test("recenti: un'apertura riuscita il campo lo scrive — dopo, non prima", async (t) => {
  const originale = globalThis.fetch;
  t.after(() => { globalThis.fetch = originale; });
  fetchFinta();
  const radice = radiceFinta();
  const f = creaFile(radice, { suApertura() {}, suErrore() {}, suSalvataggio() {},
                               deposito: depositoCon("/tmp/B.json") });
  const [bottoneB] = bottoniRecenti(radice.elementi["#file-recenti"]);
  await bottoneB.dispatch("click");
  await new Promise((r) => setTimeout(r, 5));
  assert.equal(radice.elementi["#file-percorso"].value, "/tmp/B.json");
});

// =====================================================================================
// A1 — «modificato» è derivato: il modello in memoria contro quello finito su disco
// =====================================================================================

const M1 = { nodi: [] };
const M2 = { nodi: [{ id: 1, x: 0, y: 0, z: 0 }] };

test("modificato: un comando eseguito mentre il salvataggio è in volo resta modificato", async (t) => {
  const originale = globalThis.fetch;
  t.after(() => { globalThis.fetch = originale; });
  fetchFinta({ dati: { impronta: "0137e564" }, ritardo: 5 });
  const radice = radiceFinta();
  const stato = radice.elementi["#file-stato"];
  const f = creaFile(radice, { suApertura() {}, suErrore() {}, suSalvataggio() {} });

  const inVolo = f.salva("/tmp/A.json", M1);       // parte con M1
  f.disegna({ percorso: "/tmp/A.json", impronta: null, modello: M2 });  // la cronologia avanza
  await inVolo;                                     // il server risponde con l'impronta di M1
  f.disegna({ percorso: "/tmp/A.json", impronta: "0137e564", modello: M2 });
  assert.match(stato.textContent, /· modificato/,
    "su disco c'è M1 e in memoria M2: dire «salvato» qui fa perdere il lavoro");
});

test("modificato: sul modello davvero spedito il salvataggio pulisce", async (t) => {
  const originale = globalThis.fetch;
  t.after(() => { globalThis.fetch = originale; });
  fetchFinta({ dati: { impronta: "0137e564" } });
  const radice = radiceFinta();
  const stato = radice.elementi["#file-stato"];
  const f = creaFile(radice, { suApertura() {}, suErrore() {}, suSalvataggio() {} });
  await f.salva("/tmp/A.json", M1);
  f.disegna({ percorso: "/tmp/A.json", impronta: "0137e564", modello: M1 });
  assert.equal(stato.textContent, "A.json · impronta 0137e564");
});

test("modificato: un salvataggio fallito non dichiara salvato niente", async (t) => {
  const originale = globalThis.fetch;
  t.after(() => { globalThis.fetch = originale; });
  fetchFinta({ ok: false, stato: 500, dati: { motivo: "disco pieno" } });
  const radice = radiceFinta();
  const stato = radice.elementi["#file-stato"];
  const f = creaFile(radice, { suApertura() {}, suErrore() {}, suSalvataggio() {} });
  await f.salva("/tmp/A.json", M1);
  f.disegna({ percorso: "/tmp/A.json", impronta: "vecchia", modello: M1 });
  assert.match(stato.textContent, /· modificato/);
});

test("modificato: appena aperto il modello è quello su disco, non modificato", async (t) => {
  const originale = globalThis.fetch;
  t.after(() => { globalThis.fetch = originale; });
  fetchFinta({ dati: { modello: M2, impronta: "aaa11122" } });
  const radice = radiceFinta();
  const stato = radice.elementi["#file-stato"];
  radice.elementi["#file-percorso"].value = "/tmp/A.json";
  const f = creaFile(radice, { suApertura() {}, suErrore() {}, suSalvataggio() {} });
  await f.apri();
  f.disegna({ percorso: "/tmp/A.json", impronta: "aaa11122", modello: M2 });
  assert.equal(stato.textContent, "A.json · impronta aaa11122");
  f.disegna({ percorso: "/tmp/A.json", impronta: "aaa11122", modello: M1 });
  assert.match(stato.textContent, /· modificato/);
});

// =====================================================================================
// E — il rifiuto in silenzio, e i mutanti sopravvissuti della sezione D
// =====================================================================================

test("un'operazione già in corso lo dice, invece di non fare niente in silenzio", async (t) => {
  const originale = globalThis.fetch;
  t.after(() => { globalThis.fetch = originale; });
  const spia = fetchFinta({ ritardo: 5 });
  const radice = radiceFinta();
  radice.elementi["#file-percorso"].value = "/tmp/a.json";
  const detti = [];
  const f = creaFile(radice, { suApertura() {}, suErrore: (m) => detti.push(m), suSalvataggio() {} });
  await Promise.all([f.apri(), f.apri()]);
  assert.equal(spia.chiamate, 1);
  assert.equal(detti.length, 1);
  assert.match(detti[0], /già in corso/);
});

// Mutante D1: la guardia `inCorso` tolta da `salva` (restava solo in `apri`).
test("salva: due salvataggi in corsa producono una sola fetch, e il secondo lo dice", async (t) => {
  const originale = globalThis.fetch;
  t.after(() => { globalThis.fetch = originale; });
  const spia = fetchFinta({ dati: { impronta: "f1" }, ritardo: 5 });
  const radice = radiceFinta();
  const detti = [];
  const f = creaFile(radice, { suApertura() {}, suErrore: (m) => detti.push(m), suSalvataggio() {} });
  await Promise.all([f.salva("/tmp/A.json", M1), f.salva("/tmp/A.json", M2)]);
  assert.equal(spia.chiamate, 1, "vincerebbe chi risponde per ultimo, non chi è partito per ultimo");
  assert.match(detti[0], /già in corso/);
});

// Mutante D2: `spanNome` e `spanCartella` scambiati — due file omonimi in cartelle diverse
// diventerebbero indistinguibili proprio nell'unico punto che li separa.
test("recenti: ogni riga porta il nome per primo e la cartella sotto, non il contrario", () => {
  const radice = radiceFinta();
  creaFile(radice, { suApertura() {}, suErrore() {}, suSalvataggio() {},
                     deposito: depositoCon("docs/caso-studio/muro_1.nova.json") });
  const [bottone] = bottoniRecenti(radice.elementi["#file-recenti"]);
  const [primo, secondo] = bottone._figli;
  assert.equal(primo.className, "nome");
  assert.equal(primo.textContent, "muro_1.nova.json");
  assert.equal(secondo.className, "cartella");
  assert.equal(secondo.textContent, "docs/caso-studio");
  assert.equal(bottone.title, "docs/caso-studio/muro_1.nova.json");
});

test("recenti: un percorso senza cartella non appende una riga vuota", () => {
  const radice = radiceFinta();
  creaFile(radice, { suApertura() {}, suErrore() {}, suSalvataggio() {},
                     deposito: depositoCon("muro_1.nova.json") });
  const [bottone] = bottoniRecenti(radice.elementi["#file-recenti"]);
  assert.equal(bottone._figli.length, 1);
  assert.equal(bottone._figli[0].textContent, "muro_1.nova.json");
});

// Mutante D3: la riga che riempie il campo, in una funzione che nessun test chiamava.
test("disegna: su un modello già aperto il campo vuoto si riempie col percorso", () => {
  const radice = radiceFinta();
  const f = creaFile(radice, { suApertura() {}, suErrore() {}, suSalvataggio() {} });
  f.disegna({ percorso: "/tmp/A.json", impronta: "abc", modello: M1 });
  assert.equal(radice.elementi["#file-percorso"].value, "/tmp/A.json");
});

test("disegna: un campo già scritto non viene sovrascritto sotto le dita", () => {
  const radice = radiceFinta();
  radice.elementi["#file-percorso"].value = "/tmp/sto-scrivendo.json";
  const f = creaFile(radice, { suApertura() {}, suErrore() {}, suSalvataggio() {} });
  f.disegna({ percorso: "/tmp/A.json", impronta: "abc", modello: M1 });
  assert.equal(radice.elementi["#file-percorso"].value, "/tmp/sto-scrivendo.json");
});

test("disegna: senza nessun modello aperto lo stato lo dice, e il campo resta vuoto", () => {
  const radice = radiceFinta();
  const f = creaFile(radice, { suApertura() {}, suErrore() {}, suSalvataggio() {} });
  f.disegna({ percorso: null, impronta: null, modello: M1 });
  assert.equal(radice.elementi["#file-stato"].textContent, "nessun modello aperto");
  assert.equal(radice.elementi["#file-percorso"].value, "");
});

// Mutante D4: il listener di `#file-apri` scollegato — restava solo l'Invio nel campo.
test("il bottone «apri» è collegato: il clic apre il percorso del campo", async (t) => {
  const originale = globalThis.fetch;
  t.after(() => { globalThis.fetch = originale; });
  const spia = fetchFinta();
  const radice = radiceFinta();
  radice.elementi["#file-percorso"].value = "/tmp/A.json";
  let aperto = null;
  creaFile(radice, { suApertura: (p) => { aperto = p; }, suErrore() {}, suSalvataggio() {} });
  await radice.elementi["#file-apri"].dispatch("click");
  await new Promise((r) => setTimeout(r, 5));
  assert.equal(spia.chiamate, 1);
  assert.equal(spia.corpi[0].percorso, "/tmp/A.json");
  assert.equal(aperto, "/tmp/A.json");
});

test("il campo apre con Invio, e ignora gli altri tasti", async (t) => {
  const originale = globalThis.fetch;
  t.after(() => { globalThis.fetch = originale; });
  const spia = fetchFinta();
  const radice = radiceFinta();
  radice.elementi["#file-percorso"].value = "/tmp/A.json";
  creaFile(radice, { suApertura() {}, suErrore() {}, suSalvataggio() {} });
  await radice.elementi["#file-percorso"].dispatch("keydown", { key: "n", preventDefault() {} });
  assert.equal(spia.chiamate, 0);
  await radice.elementi["#file-percorso"].dispatch("keydown", { key: "Enter", preventDefault() {} });
  await new Promise((r) => setTimeout(r, 5));
  assert.equal(spia.chiamate, 1);
});

// La riga di stato nomina il file **aperto**, non quello scritto nel campo. Da quando `salva`
// usa il percorso aperto invece del campo, i due possono divergere: si digita un percorso e
// non lo si apre, e senza questo nome l'unico posto che mostra un percorso mostrerebbe quello
// sbagliato senza dirlo — l'utente crederebbe di aver salvato dove non ha salvato.
test("stato: nomina il file aperto, non quello digitato nel campo", () => {
  assert.equal(testoStato({ percorso: "/tmp/aperto.json", impronta: "0137e564e9", modificato: false }),
    "aperto.json · impronta 0137e564");
});

test("stato: un modello non ancora definito non è «modificato»", () => {
  const radice = radiceFinta();
  const stato = radice.elementi["#file-stato"];
  const f = creaFile(radice, { suApertura() {}, suErrore() {}, suSalvataggio() {} });
  f.disegna({ percorso: "/tmp/A.json", impronta: "abc12345", modello: undefined });
  assert.doesNotMatch(stato.textContent, /· modificato/);
});
