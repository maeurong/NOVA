// La corsa dall'interfaccia (giornata 12): il Check Model, il lavoro con le sue fasi, l'ultima
// corsa che invecchia. Nessun riduttore: la corsa non tocca il modello. Le funzioni pure stanno
// in testa e si provano senza DOM; `creaCorsa` (Task 4) possiede il blocco del pannello.

import { conciso } from "./numeri.js";
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
const CONTENITORI = [["combinazione", "combinazione"], ["sezione", "sezione"], ["azione", "azione"]];

export const PAROLA = Object.freeze({ passato: "passato", non_passato: "non passato", non_applicabile: "non applicabile" });

function vaiDi(verdetto) {
  const primo = Array.isArray(verdetto.oggetto) ? verdetto.oggetto[0] : null;
  if (primo === null || primo === undefined) return null;
  if (primo && typeof primo === "object" && !Array.isArray(primo)) {
    // `nodo_controllo` da solo è il nodo che **manca** (`check.py:55-57`); con `dof` è il nodo che
    // c'è ma è vincolato nella direzione di spinta (`:58-60`): solo il secondo si può selezionare.
    if (primo.nodo_controllo !== undefined && primo.nodo_controllo !== null) return primo.dof !== undefined ? { tipo: "nodo", id: primo.nodo_controllo } : null;
    if (primo.analisi !== undefined) return null;
    for (const [chiave, tipo] of CONTENITORI) if (primo[chiave] !== undefined && primo[chiave] !== null) return { tipo, id: primo[chiave] };
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

export function testoSolutore(salute, versione = null) {
  if (!salute) return "solutore: in verifica…";
  const nome = versione ? `OpenSees ${versione}` : "OpenSees";
  if (salute.esito === "ok") return `${nome} · ${salute.percorso}`;
  if (salute.esito === "assente") return `OpenSees assente — ${salute.dove_prenderlo || "dove prenderlo: non dichiarato"}`;
  return `OpenSees rotto: ${salute.motivo || "—"}`;
}

const secondiTesto = (s) => `${conciso(Math.max(0, s))} s`;
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

const PUNTO = { passato: "●", non_passato: "●", non_applicabile: "○" };
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
export function creaCorsa(radice, { modello, suVai, suErrore, suEsito, orologio = () => Date.now(), attesaMs = 500 }) {
  const q = (sel) => radice.querySelector(sel);
  const solutoreEl = q("#corsa-solutore"), bVerifica = q("#corsa-verifica"), bCorri = q("#corsa-corri");
  const campoInp = q("#corsa-inp"), bSolido = q("#corsa-corri-solido");
  const attesaEl = q("#corsa-attesa"), fasiEl = q("#corsa-fasi"), secondiEl = q("#corsa-secondi");
  const ultimaEl = q("#corsa-ultima"), registroEl = q("#corsa-registro"), codaEl = q("#corsa-coda");
  const vuotoEl = q("#corsa-vuoto"), verdettiEl = q("#corsa-verdetti");

  let lavoro = null;        // l'ultima corsa: {run_id, secondi, fin, fasi, modello, solido, cartella?}
  let verdetti = [];        // le righe a schermo (dal Check o dall'ultima corsa)
  let occupato = false;     // una verifica o un lavoro in corso: uno scatto alla volta, come `file.js`
  let generazione = 0;      // `azzera()` la incrementa: una risposta di prima non si registra
  let salute = null, versione = null;

  const bottoni = (liberi) => { for (const b of [bVerifica, bCorri, bSolido]) if (b) b.disabled = !liberi; };

  function impostaSolutore(s, v = versione) {
    salute = s ?? salute;
    versione = v ?? versione;
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
      punto.textContent = PUNTO[r.esito] ?? "●";
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
        b.setAttribute("aria-label", `vai ${ARTICOLO[r.vai.tipo] ?? "a"} ${r.vai.id}`);
        // R11: il ridisegno è di `app.js`. Qui si dice solo dove andare.
        b.addEventListener("click", () => suVai(r.vai));
        li.append(b);
      }
      return li;
    }));
    vuotoEl.hidden = righe.length > 0 || lavoro !== null;
  }

  function disegnaUltima(m) {
    if (!lavoro) { ultimaEl.hidden = true; ultimaEl.className = "numero"; return; }
    const vecchia = stantia(lavoro, m);
    let testo = testoUltima(lavoro);
    if (lavoro.solido && lavoro.cartella) testo += ` · cartella ${lavoro.cartella}`;
    ultimaEl.textContent = vecchia ? `${testo} · stantia` : testo;   // la parola è il canale, il filetto l'accompagna
    ultimaEl.className = vecchia ? "numero stantia" : "numero";
    ultimaEl.hidden = false;
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

  /** Il lavoro: la POST, poi la `GET` ogni `attesaMs` finché non è finita. Ritorna il lavoro
   *  registrato, o `null` se nel frattempo `azzera()` ha cambiato generazione. */
  async function lavora(rotta, corpo, solido) {
    const m = modello();          // letto **al gesto**: se il modello cambia durante la corsa, quella corsa è già stantia
    const mia = generazione;
    const avvio = await chiediJson(rotta, corpo);
    const l = { run_id: avvio.run_id, fasi: [], avvioMs: orologio(), modello: m, solido,
                cartella: avvio.cartella ?? null };
    disegnaAttesa(l);
    for (;;) {
      await pausa(attesaMs);
      const s = await chiediJson(`/api/corsa/${l.run_id}`);
      l.fasi = s.fasi ?? [];
      if (s.stato !== "finita") { disegnaAttesa(l); continue; }
      attesaEl.hidden = true;
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

  async function corri() {
    if (occupato) return suErrore("una corsa è già in corso");
    occupato = true; bottoni(false); bCorri.textContent = "corro…";
    try {
      const l = await lavora("/api/corsa", { modello: modello(), casi: null }, false);
      if (!l) return;
      verdetti = verdettiDi(l.fin);
      disegnaRegistro(l.fin);
      if (l.fin.esito === "assente") impostaSolutore({ esito: "assente", dove_prenderlo: l.fin.dove_prenderlo });
      if (l.fin.esito === "ok" && l.fin.risultati?.run?.versione_opensees) impostaSolutore(salute, l.fin.risultati.run.versione_opensees);
      disegnaVerdetti(); disegnaUltima(l.modello);
      suEsito(l);
    } catch (e) {
      // Il 409 arriva da `chiediJson` col `motivo` del server, già in italiano.
      attesaEl.hidden = true; suErrore(e.message);
    } finally {
      occupato = false; bottoni(true); bCorri.textContent = "corri";
    }
  }

  async function verifica() {
    if (occupato) return suErrore("una corsa è già in corso");
    occupato = true; bottoni(false); bVerifica.textContent = "verifico…";
    try {
      const r = await chiediJson("/api/check", { modello: modello() });
      verdetti = r.verdetti ?? [];
      disegnaVerdetti();
    } catch (e) {
      suErrore(e.message);
    } finally {
      occupato = false; bottoni(true); bVerifica.textContent = "verifica";
    }
  }

  async function corriSolido() {
    if (occupato) return suErrore("una corsa è già in corso");
    const inp = (campoInp?.value ?? "").trim();
    if (inp === "") return suErrore("scrivi il percorso di un deck .inp");
    occupato = true; bottoni(false); bSolido.textContent = "corro il solido…";
    try {
      const l = await lavora("/api/ccx", { inp }, true);
      if (!l) return;
      verdetti = [];               // il deck del solido non passa dal Check Model: non ci sono verdetti da mostrare
      disegnaRegistro(l.fin);
      disegnaVerdetti(); disegnaUltima(l.modello); suEsito(l);
    } catch (e) {
      attesaEl.hidden = true; suErrore(e.message);
    } finally {
      occupato = false; bottoni(true); bSolido.textContent = "corri il solido";
    }
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
  campoInp?.addEventListener("keydown", (ev) => { if (ev.key === "Enter") { ev.preventDefault(); corriSolido(); } });
  disegnaVerdetti(); disegnaUltima(null);

  return { verifica, corri, corriSolido, disegna, azzera, impostaSolutore, inCorso: () => occupato };
}
