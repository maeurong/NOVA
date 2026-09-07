// Le tre decisioni pure della cucitura, fuori da `app.js` perché testabili in Node solo se
// non portano dietro il prezzo del suo caricamento: `app.js` tocca il DOM già ai primi
// `const` del modulo, quindi importarlo per il test eseguirebbe (e farebbe fallire) tutto.

import { nodo } from "./modello.js";

/** Il ghost che `piano.js` disegna per il modo corrente, o `null`: nessun modo, o un'asta
 *  il cui secondo nodo non è ancora scelto, o il cui nodo di partenza (o d'arrivo) è
 *  sparito dal modello nel frattempo. */
export function ghostDisegnabile(m, modo) {
  if (!modo) return null;
  if (modo.tipo === "estrusione") return { da: modo.da, dx: modo.dx, dz: modo.dz };
  const da = nodo(m, modo.da), a = modo.a === null ? null : nodo(m, modo.a);
  if (!da || !a) return null;
  return { da: modo.da, dx: a.x - da.x, dz: a.z - da.z };
}

/** La decisione di `scegli`: se il bersaglio è accettato, cosa dire se non lo è, e se
 *  `modo.a` va aggiornato. La stessa guardia blocca in `estrusione` (la selezione è ferma)
 *  e lascia passare in `asta` (la selezione **è** il gesto) — la differenza sta qui, non
 *  nell'effetto: `scegli` resta l'unica a toccare `selezione`, `modo` e `ridisegna`. */
export function esitoScelta(modo, tipo) {
  if (modo?.tipo === "estrusione") {
    return { permesso: false, messaggio: "c'è un'estrusione in corso: Invio per confermarla, Esc per annullarla", aggiornaA: false };
  }
  if (modo?.tipo === "asta") {
    if (tipo !== "nodo") {
      return { permesso: false, messaggio: "scegli un nodo, non un'asta — Esc per annullare", aggiornaA: false };
    }
    return { permesso: true, messaggio: null, aggiornaA: true };
  }
  return { permesso: true, messaggio: null, aggiornaA: false };
}

/** Il contesto che decide quali voci della barra mostrare (`tastiera.js:vociDellaBarra`). */
export function contestoBarra(modo, selezione) {
  return modo ? (modo.tipo === "asta" ? "asta" : "ghost") : (selezione ? "selezione" : "sempre");
}
