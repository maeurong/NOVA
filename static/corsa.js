// La corsa dall'interfaccia (giornata 12): il Check Model, il lavoro con le sue fasi, l'ultima
// corsa che invecchia. Nessun riduttore: la corsa non tocca il modello. Le funzioni pure stanno
// in testa e si provano senza DOM; `creaCorsa` (Task 4) possiede il blocco del pannello.

import { conciso } from "./numeri.js";

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
