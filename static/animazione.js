// L'animazione dei modi: una fase sinusoidale a un ciclo al secondo (la frequenza vera non si
// vede — 20 Hz sono un tremolio, e il badge la dice a parole), e un runner con un solo fotogramma
// in volo. `prefers-reduced-motion` spegne il moto: la forma resta ferma al massimo, e il badge lo
// dice (D2a). Puro quanto basta: l'orologio e la richiesta del fotogramma entrano dalla porta,
// così i test non hanno bisogno né di `performance` né di `requestAnimationFrame`.
export const PERIODO_MS = 1000;
export const fase = (t, periodo = PERIODO_MS) => Math.sin(2 * Math.PI * (t / periodo));

/** La preferenza di sistema, letta a ogni chiamata: `matchMedia` è viva e cambia a caldo, quindi
 *  leggerla una volta al caricamento del modulo congelerebbe la scelta per tutta la sessione.
 *  Chi la chiama lo fa sul gesto (`ridisegna`), mai dentro `suFotogramma` (R13). */
export const movimentoRidotto = (finestra = globalThis) =>
  Boolean(finestra.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);

export function creaAnimazione({ suFotogramma, orologio = () => performance.now(), richiedi = (f) => requestAnimationFrame(f) }) {
  let attiva = false, inVolo = false, t0 = 0;
  const passo = () => {
    inVolo = false;
    if (!attiva) return;           // fermata dopo la richiesta: il fotogramma arriva e non disegna
    suFotogramma(fase(orologio() - t0));
    inVolo = true; richiedi(passo);
  };
  return {
    // `inVolo` regge il caso del riavvio mentre un fotogramma della corsa precedente è ancora in
    // coda: senza, `avvia` dopo `ferma` ne metterebbe un secondo e il moto andrebbe al doppio.
    avvia() { if (attiva) return; attiva = true; t0 = orologio(); if (!inVolo) { inVolo = true; richiedi(passo); } },
    ferma() { attiva = false; },
    inCorso: () => attiva,
  };
}
