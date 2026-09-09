// I campi che la giornata 10 tocca, con i nomi di `nova/modello.py:354` (classe `Modello`).
// Le chiavi coincidono alla lettera perché il modello viaggia così com'è verso
// `/api/modello/salva` e verso `/api/check`: qualunque rinomina qui diventerebbe un campo
// rifiutato là (`extra="forbid"` su `_Base`, `nova/modello.py:40`).
//
// `impostazioni_analisi` c'è dalla giornata 11b: `nova/modello.py:349-351`, la veste
// è una per modello.

export const UNITA = "mm-N-MPa-t-s";

/** La stessa soglia del Check Model `nodi_coincidenti` (`nova/check.py:13`). */
export const TOLLERANZA_MM = 1.0;

const LISTE = {
  nodo: "nodi", asta: "aste", sezione: "sezioni",
  materiale: "materiali", azione: "azioni", combinazione: "combinazioni",
};

export function modelloVuoto() {
  return {
    schema_version: 1,
    unita: UNITA,
    contatori: {},
    nodi: [],
    aste: [],
    sezioni: [],
    materiali: [],
    azioni: [],
    combinazioni: [],
    analisi: [],
    impostazioni_analisi: { fibre: 10, veste: "media" },
  };
}

/** Il prossimo identificatore libero, con la regola di `nova/modello.py:479`: mai riusato.
 *  Il contatore ricorda anche ciò che è stato cancellato, e per questo entra nel massimo. */
export function prossimoId(m, tipo) {
  const chiave = LISTE[tipo];
  if (chiave === undefined) throw new Error(`tipo sconosciuto: ${tipo}`);
  // `?? 0` regge la lista vuota: senza un primo argomento sempre presente, `Math.max()`
  // su una lista senza identificatori tornerebbe -Infinity.
  return Math.max(m.contatori[tipo] ?? 0, ...m[chiave].map((e) => e.id)) + 1;
}

export const nodo = (m, id) => m.nodi.find((n) => n.id === id) ?? null;
export const asta = (m, id) => m.aste.find((a) => a.id === id) ?? null;
export const asteDelNodo = (m, id) => m.aste.filter((a) => a.nodo_i === id || a.nodo_j === id);
export const sezione = (m, id) => m.sezioni.find((s) => s.id === id) ?? null;
export const materiale = (m, id) => m.materiali.find((k) => k.id === id) ?? null;
export const asteDellaSezione = (m, id) => m.aste.filter((a) => a.sezione === id);
export const sezioniDelMateriale = (m, id) => m.sezioni.filter((s) => s.calcestruzzo === id || s.acciaio === id);
/** La veste dell'analisi, una per modello (`nova/modello.py:349-351`). I file salvati prima
 *  della 11b non portano il campo: il server lo riempie col default, e qui si fa lo stesso. */
export const vesteDi = (m) => m.impostazioni_analisi?.veste ?? "media";
export const azione = (m, id) => m.azioni.find((a) => a.id === id) ?? null;
/** L'azione a cui `Q` dà il carico e di cui il piano disegna le frecce: quella scelta o creata
 *  per ultima, altrimenti l'ultima del modello, altrimenti nessuna. La regola sta qui e non in
 *  `app.js` perché è una regola sul modello, e là non si poteva provare senza il DOM. */
export const azioneInVista = (m, idCorrente) => azione(m, idCorrente) ?? m.azioni.at(-1) ?? null;
export const combinazione = (m, id) => m.combinazioni.find((c) => c.id === id) ?? null;
export const combinazioniDellAzione = (m, id) => m.combinazioni.filter((c) => (c.termini ?? []).some((t) => t.azione === id));
/** Le analisi che nominano quel caso: la statica in `casi` (`nova/modello.py:317`), la
 *  pushover in `caso_gravita` (`:358`), che è un caso come gli altri ma sta in un campo suo.
 *  Un'azione o una combinazione che una corsa aspetta non si elimina sotto i suoi piedi. */
export const analisiCheUsano = (m, caso) => (m.analisi ?? []).filter(
  (a) => (a.tipo === "statica" && (a.casi ?? []).includes(caso)) || (a.tipo === "pushover" && a.caso_gravita === caso));
/** Le analisi modali che prendono massa da quell'azione (`nova/modello.py:322-330`): qui il
 *  riferimento viaggia sull'identificatore, non sul nome del caso, e nessun `casi` lo contiene. */
export const analisiConMassaDa = (m, id) => (m.analisi ?? []).filter(
  (a) => a.tipo === "modale" && (a.masse_da_azioni ?? []).some((x) => x.azione === id));
/** `Z<id>` per un'azione, `C<id>` per una combinazione: il nome del caso è quello che la corsa
 *  riceve (`nova/deck.py:296-311`), e l'ispettore lo stampa perché è ciò che si scrive in `analisi`. */
export const nomeCaso = (tipo, id) => `${tipo === "azione" ? "Z" : "C"}${id}`;

/** Il nodo entro la tolleranza da un punto, se c'è. Serve a non creare nodi coincidenti,
 *  che il Check Model rifiuta e che il solutore invece accetta in silenzio. */
export function nodoVicino(m, x, y, z) {
  for (const n of m.nodi) {
    if (Math.hypot(n.x - x, n.y - y, n.z - z) < TOLLERANZA_MM) return n;
  }
  return null;
}
