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

/** Il modo dopo un cambio di modello (un comando, o un salto della cronologia): sparisce se
 *  il nodo di partenza non c'è più, e in asta perde il secondo nodo se è lui a sparire —
 *  un annulla che cancella il nodo dietro un ghost o un'asta non deve lasciarlo appeso
 *  (giornata 11c, P4). */
export function modoValido(m, modo) {
  if (!modo) return null;
  if (!m.nodi.some((n) => n.id === modo.da)) return null;
  if (modo.tipo === "asta" && modo.a !== null && !m.nodi.some((n) => n.id === modo.a)) {
    return { ...modo, a: null };
  }
  return modo;
}

/** Il modo dopo una freccia, o `null` se la freccia non è nostra. Le frecce girano il ghost
 *  dell'estrusione (story 2): la lunghezza è già digitata, resta la direzione. In modo asta
 *  il ghost segue il secondo nodo, e senza nessun modo aperto la freccia resta del browser,
 *  che con quella scorre — per questo `null` e non un modo invariato. */
export function ruotaGhost(modo, key) {
  if (modo?.tipo !== "estrusione") return null;
  const l = Math.hypot(modo.dx, modo.dz);
  const verso = { ArrowUp: [0, l], ArrowDown: [0, -l], ArrowRight: [l, 0], ArrowLeft: [-l, 0] }[key];
  return verso ? { ...modo, dx: verso[0], dz: verso[1] } : null;
}

/** Lo dice `esitoScelta` quando si clicca sotto un ghost, e `app.js` quando si preme un tasto
 *  che lì non passa: una frase, un posto solo. Due copie verbatim divergono al primo
 *  ripensamento, ed erano nate lo stesso giorno in due file diversi. */
export const AVVISO_ESTRUSIONE = "c'è un'estrusione in corso: Invio per confermarla, Esc per annullarla";

/** La decisione di `scegli`: se il bersaglio è accettato, cosa dire se non lo è, e se
 *  `modo.a` va aggiornato. La stessa guardia blocca in `estrusione` (la selezione è ferma)
 *  e lascia passare in `asta` (la selezione **è** il gesto) — la differenza sta qui, non
 *  nell'effetto: `scegli` resta l'unica a toccare `selezione`, `modo` e `ridisegna`. */
export function esitoScelta(modo, tipo) {
  if (modo?.tipo === "estrusione") {
    return { permesso: false, messaggio: AVVISO_ESTRUSIONE, aggiornaA: false };
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
