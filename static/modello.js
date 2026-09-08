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

/** Il nodo entro la tolleranza da un punto, se c'è. Serve a non creare nodi coincidenti,
 *  che il Check Model rifiuta e che il solutore invece accetta in silenzio. */
export function nodoVicino(m, x, y, z) {
  for (const n of m.nodi) {
    if (Math.hypot(n.x - x, n.y - y, n.z - z) < TOLLERANZA_MM) return n;
  }
  return null;
}
