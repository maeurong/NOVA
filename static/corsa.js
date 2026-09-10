// La corsa dall'interfaccia (giornata 12): il Check Model, il lavoro con le sue fasi, l'ultima
// corsa che invecchia. Nessun riduttore: la corsa non tocca il modello. Le funzioni pure stanno
// in testa e si provano senza DOM; `creaCorsa` (Task 4) possiede il blocco del pannello.

import { conciso, stampaNumero, senzaZeriInCoda } from "./numeri.js";
import { chiediJson } from "./file.js";

/** Il tipo selezionabile dell'oggetto di un verdetto, per controllo (`nova/check.py:81-284`):
 *  delle coppie si prende il primo. `riferimenti` e `pushover` portano dict e si leggono da
 *  `CONTENITORI`; i controlli senza oggetto non hanno «vai». */
export const OGGETTO_PER_CONTROLLO = Object.freeze({
  nodi_coincidenti: "nodo", aste_sconnesse: "asta", aste_lunghezza_zero: "asta", aste_duplicate: "asta",
  nodi_liberi: "nodo", nodo_su_asta: "nodo", sezione_nulla: "asta", armatura_mancante: "sezione",
  carico_termico: "azione", vincoli_dedotti: "nodo",
});
// Il «vai» punta al **contenitore** sano, mai al riferimento rotto: nel dict di `riferimenti`
// la chiave che nomina il posto da cui si corregge è la prima (`sezione` col materiale sparito,
// `azione` col nodo sparito, `combinazione` con l'azione sparita), e `nodo`/`asta`/`azione` in
// seconda posizione sono proprio ciò che manca (`nova/check.py:167-179`). Con la sola `analisi`
// non c'è niente da selezionare, tranne il `nodo_controllo` della pushover (`:205-223`).
const CONTENITORI = ["combinazione", "sezione", "azione"];   // la chiave del dict è il tipo

export const PAROLA = Object.freeze({ passato: "passato", non_passato: "non passato", non_applicabile: "non applicabile" });

function vaiDi(verdetto) {
  const primo = Array.isArray(verdetto.oggetto) ? verdetto.oggetto[0] : null;
  if (primo === null || primo === undefined) return null;
  if (primo && typeof primo === "object" && !Array.isArray(primo)) {
    // `nodo_controllo` da solo è il nodo che **manca** (`check.py:55-57`); con `dof` è il nodo che
    // c'è ma è vincolato nella direzione di spinta (`:58-60`): solo il secondo si può selezionare.
    if (primo.nodo_controllo !== undefined && primo.nodo_controllo !== null) return primo.dof !== undefined ? { tipo: "nodo", id: primo.nodo_controllo } : null;
    if (primo.analisi !== undefined) return null;
    for (const tipo of CONTENITORI) if (primo[tipo] !== undefined && primo[tipo] !== null) return { tipo, id: primo[tipo] };
    return null;
  }
  const tipo = OGGETTO_PER_CONTROLLO[verdetto.controllo];
  if (!tipo) return null;
  const id = Array.isArray(primo) ? primo[0] : primo;
  return id === undefined || id === null ? null : { tipo, id };
}

/** Una riga per verdetto, nella forma che il blocco disegna: la parola è il canale (WCAG 1.4.1). */
export function righeVerdetti(verdetti) {
  return (Array.isArray(verdetti) ? verdetti : []).map((x) => ({
    controllo: x.controllo, esito: x.esito, parola: PAROLA[x.esito] ?? String(x.esito),
    ragione: x.ragione || "—", rimedio: x.rimedio || null, caso: x.caso ?? null,
    vai: vaiDi(x), chiave: `${x.controllo}|${x.caso ?? ""}`,
  }));
}

/** «Version 3.8.0 64-Bit (6e55…)» del registro di OpenSees → «3.8.0»: la riga del solutore
 *  porta il numero, non l'impronta del binario. Senza un numero dentro, `null`. */
export const versioneBreve = (testo) => String(testo ?? "").match(/\d+(?:\.\d+)+/)?.[0] ?? null;

export function testoSolutore(salute, versione = null) {
  // Senza la salute (un 409 all'avvio, una rete caduta) la versione da una corsa buona basta
  // a dire che il solutore c'è: «in verifica…» resta solo finché non si sa niente.
  if (!salute) return versione ? `OpenSees ${versione}` : "solutore: in verifica…";
  const nome = versione ? `OpenSees ${versione}` : "OpenSees";
  if (salute.esito === "ok") return `${nome} · ${salute.percorso}`;
  if (salute.esito === "assente") return `OpenSees assente — ${salute.dove_prenderlo || "dove prenderlo: non dichiarato"}`;
  return `OpenSees rotto: ${salute.motivo || "—"}`;
}

// La durata misurata dal server, a due decimali al massimo e senza zeri in coda: «1,25 s»,
// «0,13 s», «3,2 s». Con `conciso` sotto 1 s uscivano quattro decimali («0,1291 s», visto a
// schermo sul telaio 2×1): un centesimo basta a chi legge quanto è durata una corsa.
const secondiTesto = (s) => `${senzaZeriInCoda(stampaNumero(Math.max(0, s), { decimali: 2, migliaia: true }))} s`;
// R14: sotto 1 s `cifre` dà quattro decimali (`numeri.js:183`), e un cronometro che scrive
// «0,5231 s» ogni mezzo secondo è rumore, non attesa parlante. L'attesa arrotonda al decimo;
// la durata **misurata** (`testoUltima`) no: «1,25 s» è un fatto del server.
const secondiAttesa = (s) => `${conciso(Math.round(Math.max(0, s) * 10) / 10)} s`;

export function testoAttesa(lavoro, adessoMs) {
  const fasi = lavoro.fasi ?? [];
  const trascorsi = (adessoMs - lavoro.avvioMs) / 1000;
  return { fasi, corrente: fasi.length ? fasi[fasi.length - 1] : null,
           secondi: secondiAttesa(Number.isFinite(trascorsi) ? trascorsi : 0) };
}

export function testoUltima(lavoro) {
  const testa = `corsa${lavoro.solido ? " del solido" : ""} ${lavoro.run_id}`;
  const fin = lavoro.fin ?? {};
  if (fin.esito === "ok") return `${testa} · ${secondiTesto(lavoro.secondi ?? 0)}`;
  if (fin.esito === "rifiutato") return `${testa} · rifiutata dal Check Model`;
  if (fin.esito === "assente") return `${testa} · OpenSees assente`;
  return `${testa} · errore in ${fin.fase ?? "—"}: ${fin.motivo ?? "—"}`;
}

/** Stantia = il modello a schermo non è lo snapshot su cui la corsa ha girato. L'identità
 *  dell'oggetto immutabile della cronologia è più stretta dell'impronta e non costa una rotta:
 *  `⌘Z` fino a quello snapshot la fa tornare fresca. */
export const stantia = (lavoro, modello) => Boolean(lavoro && lavoro.modello !== modello);

export const verdettiDi = (fin) => [...(fin?.verdetti_check ?? []), ...(fin?.risultati?.verdetti ?? [])];

// --- il blocco «Corsa» del pannello ------------------------------------------

// Il punto pieno per passato e non passato (la differenza la fa il rosso, e la parola accanto),
// vuoto per il non applicabile.
const punto_ = (esito) => (esito === "non_applicabile" ? "○" : "●");
// Il nome accessibile del «vai» comincia dal testo visibile (WCAG 2.5.3) e nomina il
// bersaglio: tre «vai» identici a voce sono tre bersagli indistinguibili.
const ARTICOLO = { nodo: "al nodo", asta: "all'asta", sezione: "alla sezione",
                   azione: "all'azione", combinazione: "alla combinazione" };

/** Il blocco «Corsa»: lo stato del solutore, «verifica», «corri», «corri il solido»,
 *  l'attesa a fasi col cronometro, l'ultima corsa che invecchia, i verdetti a doppio canale.
 *
 *  Il polling non ha un timer suo: il cronometro si riscrive a ogni giro della `GET`, che è
 *  già la cadenza dell'attesa. Un `setInterval` in più sarebbe un secondo orologio da fermare
 *  in tutte le uscite — compresa quella che nessuno ricorda, la rete che cade. */
export function creaCorsa(radice, { modello, suVai, suErrore, suEsito, prima = () => null,
                                    orologio = () => Date.now(), attesaMs = 500 }) {
  // `prima()`: il chiamante dice perché **adesso** non si corre (un ghost aperto in `app.js`),
  // o `null`. Vale per i bottoni come per i tasti: la guardia sta qui, una volta sola.
  const q = (sel) => radice.querySelector(sel);
  const solutoreEl = q("#corsa-solutore"), bVerifica = q("#corsa-verifica"), bCorri = q("#corsa-corri");
  const campoInp = q("#corsa-inp"), bSolido = q("#corsa-corri-solido");
  const attesaEl = q("#corsa-attesa"), fasiEl = q("#corsa-fasi"), secondiEl = q("#corsa-secondi");
  const ultimaEl = q("#corsa-ultima"), registroEl = q("#corsa-registro"), codaEl = q("#corsa-coda");
  const vuotoEl = q("#corsa-vuoto"), verdettiEl = q("#corsa-verdetti");

  let lavoro = null;        // l'ultima corsa: {run_id, secondi, fin, fasi, modello, solido, cartella?}
  let verdetti = [];        // le righe a schermo (dal Check o dall'ultima corsa)
  let occupato = false;     // una verifica o un lavoro in corso: uno scatto alla volta, come `file.js`
  let avvisato = false;     // «una corsa è già in corso» è a schermo: lo togliamo noi, a corsa finita
  // Il messaggio è nostro, quindi lo puliamo noi — e solo quello: un `dì(null)` a ogni esito
  // cancellerebbe anche un errore di sezione scritto mentre la corsa girava.
  const avvisaOccupato = () => { avvisato = true; suErrore("una corsa è già in corso"); };
  const pulisciAvviso = () => { if (avvisato) { avvisato = false; suErrore(null); } };
  let generazione = 0;      // `azzera()` la incrementa: una risposta di prima non si registra
  let salute = null, versione = null;

  const bottoni = (liberi) => { for (const b of [bVerifica, bCorri, bSolido]) if (b) b.disabled = !liberi; };

  function impostaSolutore(s, v) {
    if (s != null) salute = s;   // `!= null`, non `if (s)`: un valore definito ma falso non è «tieni il vecchio»
    if (v != null) versione = v;
    solutoreEl.textContent = testoSolutore(salute, versione);
  }

  function disegnaVerdetti() {
    const righe = righeVerdetti(verdetti);
    verdettiEl.hidden = righe.length === 0;
    verdettiEl.replaceChildren(...righe.map((r) => {
      const li = document.createElement("li");
      li.className = `verdetto ${r.esito}`;
      const punto = document.createElement("span");
      punto.className = "punto";
      punto.setAttribute("aria-hidden", "true");   // doppione della parola: a voce si sentirebbe due volte
      punto.textContent = punto_(r.esito);
      const controllo = document.createElement("span");
      controllo.className = "controllo numero";
      controllo.textContent = r.caso ? `${r.caso} · ${r.controllo}` : r.controllo;
      const parola = document.createElement("span");
      parola.className = "parola";
      parola.textContent = r.parola;
      const ragione = document.createElement("span");
      ragione.className = "ragione";
      ragione.textContent = r.ragione;
      li.append(punto, controllo, parola, ragione);
      if (r.rimedio) {
        const s = document.createElement("span");
        s.className = "rimedio";
        s.textContent = `→ ${r.rimedio}`;
        li.append(s);
      }
      if (r.vai) {
        li.className += " con-vai";
        const b = document.createElement("button");
        b.type = "button";
        b.textContent = "vai";
        b.setAttribute("aria-label", `vai ${ARTICOLO[r.vai.tipo]} ${r.vai.id}`);
        // R11: il ridisegno è di `app.js`. Qui si dice solo dove andare.
        b.addEventListener("click", () => suVai(r.vai));
        li.append(b);
      }
      return li;
    }));
    vuotoEl.hidden = righe.length > 0 || lavoro !== null;
  }

  /** La riga dell'ultima corsa, che è una live region (`aria-live` in `index.html`). Due cose
   *  che non sono dettagli:
   *
   *  - si scrive **solo se cambia**. `app.js` ridisegna a ogni comando, e riscrivere una live
   *    region con lo stesso identico testo la fa riannunciare: la riga parlerebbe a ogni clic.
   *  - non si nasconde con `hidden`. Vuota resta resa ad altezza zero (`:empty` nel CSS, come
   *    `#palette-stato`): una regione nascosta e poi mostrata non viene annunciata da tutte le AT. */
  function disegnaUltima(m) {
    // Il solido non invecchia mai: ha girato su un `.inp` su disco, non sullo snapshot, e
    // chiamarlo stantio prometterebbe un rilancio che non cambierebbe niente.
    const vecchia = Boolean(lavoro) && !lavoro.solido && stantia(lavoro, m);
    let nuovo = "";
    if (lavoro) {
      nuovo = testoUltima(lavoro);
      if (lavoro.solido && lavoro.cartella) nuovo += ` · cartella ${lavoro.cartella}`;
      if (vecchia) nuovo += " · stantia";   // la parola è il canale, il filetto l'accompagna
    }
    if (ultimaEl.textContent !== nuovo) ultimaEl.textContent = nuovo;
    ultimaEl.className = vecchia ? "numero stantia" : "numero";
  }

  function disegnaAttesa(l) {
    const a = testoAttesa(l, orologio());
    fasiEl.replaceChildren(...a.fasi.map((nome, i) => {
      const li = document.createElement("li");
      li.textContent = nome;
      if (i === a.fasi.length - 1) { li.className = "corrente"; li.setAttribute("aria-current", "step"); }
      return li;
    }));
    secondiEl.textContent = a.secondi;
    attesaEl.hidden = false;
  }

  const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

  /** La POST del lavoro. Un 409 con `run_id` è una corsa già in corso sul server (la pagina
   *  ricaricata a metà, o un'altra scheda): ci si riaggancia invece di rifiutare — lo snapshot
   *  su cui gira non lo sappiamo, quindi il lavoro nasce senza modello, cioè stantio. */
  async function avvia(rotta, corpo, comando) {
    try {
      const r = await chiediJson(rotta, corpo);
      return { ...r, riagganciata: false };
    } catch (e) {
      // Solo una corsa **dello stesso tipo**: riagganciarsi a una corsa del telaio da «corri il
      // solido» la presenterebbe come solido, senza verdetti e senza «stantia».
      if (e.stato === 409 && e.dati?.run_id && e.dati.comando === comando) {
        return { run_id: e.dati.run_id, cartella: e.dati.cartella ?? null, riagganciata: true };
      }
      throw e;
    }
  }

  /** Il lavoro: la POST, poi la `GET` ogni `attesaMs` finché non è finita. Ritorna il lavoro
   *  registrato, o `null` se nel frattempo `azzera()` ha cambiato generazione. `m` è lo
   *  snapshot letto **al gesto** dal chiamante: se il modello cambia durante la corsa, quella
   *  corsa è già stantia. */
  async function lavora(rotta, corpo, solido, m) {
    const mia = generazione;
    const avvio = await avvia(rotta, corpo, solido ? "ccx" : "corsa");
    if (avvio.riagganciata) { m = null; suErrore("una corsa era già in corso: la seguo da qui"); }
    const l = { run_id: avvio.run_id, fasi: [], avvioMs: orologio(), modello: m, solido,
                cartella: avvio.cartella ?? null };
    disegnaAttesa(l);
    for (;;) {
      await pausa(attesaMs);
      // In testa al ciclo, non alla fine: `azzera()` a metà corsa deve fermare **il polling**,
      // non solo scartarne il risultato. Dopo, il ciclo restava a riscrivere l'attesa e a tenere
      // i bottoni spenti finché il server non diceva «finita» — momento che su una corsa
      // abbandonata può non arrivare mai.
      if (mia !== generazione) { attesaEl.hidden = true; return null; }
      const s = await chiediJson(`/api/corsa/${l.run_id}`);
      l.fasi = s.fasi ?? [];
      // Il cronometro dal server, non da qui: una corsa riagganciata gira da prima di noi.
      if (avvio.riagganciata && typeof s.secondi === "number") l.avvioMs = orologio() - s.secondi * 1000;
      if (s.stato !== "finita") { disegnaAttesa(l); continue; }
      attesaEl.hidden = true;
      // La seconda: `azzera()` può cadere **durante** la GET, e allora il ciclo non ci ripassa.
      if (mia !== generazione) return null;
      const { run_id, stato, fasi, secondi, ...fin } = s;
      lavoro = { run_id: l.run_id, secondi: secondi ?? 0, fin, fasi: l.fasi, modello: m, solido,
                 cartella: s.cartella ?? l.cartella };
      return lavoro;
    }
  }

  /** Il registro del solutore: c'è solo quando c'è davvero qualcosa da leggere. Un `<details>`
   *  che si apre sul nulla è una promessa non mantenuta. */
  function disegnaRegistro(fin) {
    registroEl.hidden = !(fin.esito === "errore" && fin.coda_log);
    codaEl.textContent = fin.coda_log ?? "";
  }

  const fermo = () => { const perché = prima(); if (perché) suErrore(perché); return Boolean(perché); };

  /** L'involucro dei tre gesti: uno scatto alla volta, il bottone che dice cosa sta facendo, i
   *  bottoni spenti finché dura, l'avviso «già in corso» tolto alla fine. `fn` ritorna il lavoro
   *  (o `null` per la verifica) quando c'è un esito da dare al chiamante, `undefined` se no;
   *  `suEsito` sta **fuori** dal `try`: un errore del ridisegno di `app.js` non è un errore
   *  della corsa, e non deve travestirsi da tale. */
  async function conBottone(b, etichetta, fn) {
    // `occupato` lo guarda il chiamante, prima di `fermo()` e della lettura del campo: qui non
    // si ricontrolla, l'ordine è suo.
    const riposo = b.textContent;
    occupato = true; bottoni(false); b.textContent = etichetta;
    let esito;
    try {
      esito = await fn();
    } catch (e) {
      // I motivi arrivano da `chiediJson`, già in italiano; il 400 di `fase: deck` porta i
      // verdetti del Check che l'hanno preceduto (R4): si mostrano, non si buttano.
      attesaEl.hidden = true;
      if (Array.isArray(e.dati?.verdetti_check)) { verdetti = e.dati.verdetti_check; disegnaVerdetti(); }
      suErrore(e.message);
    } finally {
      occupato = false; bottoni(true); pulisciAvviso(); b.textContent = riposo;
    }
    // Fuori dal `try` (non è un errore della corsa), ma non muto: un ridisegno che solleva si dice.
    if (esito !== undefined) { try { suEsito(esito); } catch (e) { suErrore(e.message); } }
  }

  function corri() {
    if (occupato) return avvisaOccupato();
    if (fermo()) return;
    return conBottone(bCorri, "corro…", async () => {
      const m = modello();   // una lettura sola: il corpo della POST e lo snapshot registrato sono lo stesso oggetto
      const l = await lavora("/api/corsa", { modello: m, casi: null }, false, m);
      if (!l) return undefined;
      verdetti = verdettiDi(l.fin);
      disegnaRegistro(l.fin);
      if (l.fin.esito === "assente") impostaSolutore({ esito: "assente", dove_prenderlo: l.fin.dove_prenderlo });
      if (l.fin.esito === "ok" && l.fin.risultati?.run?.versione_opensees) impostaSolutore(salute, versioneBreve(l.fin.risultati.run.versione_opensees));
      disegnaVerdetti(); disegnaUltima(modello());   // il corrente: cambiato durante la corsa = già stantia
      return l;
    });
  }

  function verifica() {
    if (occupato) return avvisaOccupato();
    if (fermo()) return;
    return conBottone(bVerifica, "verifico…", async () => {
      const mia = generazione;   // come in `lavora`: «apri» durante la verifica butta la risposta in ritardo
      const r = await chiediJson("/api/check", { modello: modello() });
      if (mia !== generazione) return undefined;
      verdetti = r.verdetti ?? [];
      disegnaVerdetti();
      return null;   // nessun lavoro: il chiamante ridisegna e basta
    });
  }

  function corriSolido() {
    if (occupato) return avvisaOccupato();
    // Niente `fermo()`: il solido gira su un `.inp` del disco, il ghost aperto non c'entra.
    const inp = (campoInp?.value ?? "").trim();
    // Non «un deck .inp»: l'estensione qui nessuno la controlla, e un messaggio non promette
    // una verifica che non fa.
    if (inp === "") return suErrore("scrivi il percorso del deck del solido");
    return conBottone(bSolido, "corro il solido…", async () => {
      const l = await lavora("/api/ccx", { inp }, true, modello());
      if (!l) return undefined;
      verdetti = [];               // il deck del solido non passa dal Check Model: non ci sono verdetti da mostrare
      disegnaRegistro(l.fin);
      disegnaVerdetti(); disegnaUltima(modello());   // il corrente: cambiato durante la corsa = già stantia
      return l;
    });
  }

  function azzera() {
    generazione++;
    lavoro = null; verdetti = [];
    registroEl.hidden = true; codaEl.textContent = "";
    disegnaVerdetti(); disegnaUltima(null);
  }

  const disegna = ({ modello: m }) => disegnaUltima(m);

  bVerifica.addEventListener("click", () => verifica());
  bCorri.addEventListener("click", () => corri());
  bSolido?.addEventListener("click", () => corriSolido());
  // Invio **nudo** soltanto: `⌘⏎` e `⇧⌘⏎` risalgono a `window`, dove `app.js` li legge come
  // «corri» e «verifica». Senza il filtro, un `⌘⏎` scritto qui dentro partiva due volte.
  campoInp?.addEventListener("keydown", (ev) => {
    if (ev.key !== "Enter" || ev.metaKey || ev.ctrlKey || ev.shiftKey) return;
    ev.preventDefault();
    corriSolido();
  });
  disegnaVerdetti(); disegnaUltima(null);

  return { verifica, corri, corriSolido, disegna, azzera, impostaSolutore, inCorso: () => occupato };
}
