// Le misure del disegno — raggio dei nodi, tratti, corpo delle etichette, opacità dell'ombra —
// dichiarate in un posto solo: le variabili CSS di `stile.css`, che `body[data-presentazione]`
// ridefinisce per l'aula (story 62, `PRODUCT.md:96-101`). Il piano e lo spazio le leggono a ogni
// disegno; i ripieghi sono i numeri che stavano scritti a mano in `piano.js` e `spazio.js`, così
// fuori dalla presentazione il disegno resta identico al pixel.
export const MISURE_BASE = Object.freeze({ raggioNodo: 5, trattoAsta: 2, trattoScelta: 3, trattoDeformata: 2,
                                           bordoDeformata: 2, carattere: 11, ombra: 0.3, srotolatoAlto: 96, curvaAlta: 96 });
export const VARIABILI = Object.freeze({ raggioNodo: "--nodo-raggio", trattoAsta: "--asta-tratto",
                                         trattoScelta: "--asta-tratto-scelta", trattoDeformata: "--deformata-tratto",
                                         bordoDeformata: "--deformata-bordo", carattere: "--etichetta", ombra: "--ombra-opacita",
                                         srotolatoAlto: "--srotolato-alto", curvaAlta: "--curva-alta" });

export function leggiMisure(stile) {
  const misure = { ...MISURE_BASE };
  for (const [chiave, nome] of Object.entries(VARIABILI)) {
    const n = parseFloat(stile?.getPropertyValue?.(nome));
    if (Number.isFinite(n) && n > 0) misure[chiave] = n;
  }
  return misure;
}

let misureInCache = null;
/** Le misure d'oggi, lette una volta e ricordate finché non si `dimenticaMisure()`: cache
 *  **globale** (R14) — le nove variabili si definiscono solo in `:root`/`body[data-presentazione]`,
 *  nessun elemento le ridefinisce, quindi non serve una chiave per elemento. `sorgenteStile` è
 *  **solo** l'elemento su cui chiamare `getComputedStyle` la prima volta (i mock di `piano.test.js`
 *  lo richiedono, legato al contenitore); a cache piena è ignorato in silenzio — chiamarla con un
 *  elemento diverso da un giro all'altro non forza una rilettura, serve `dimenticaMisure()`. */
export function misureDi(sorgenteStile) {
  if (misureInCache) return misureInCache;
  const stile = globalThis.getComputedStyle?.(sorgenteStile ?? globalThis.document?.body);
  // Senza `getComputedStyle` (DOM finto dei test) i numeri d'oggi, ma non si cachano: altrimenti
  // il primo test a girare senza `getComputedStyle` avvelenerebbe la cache per tutti i successivi.
  if (!stile) return { ...MISURE_BASE };
  misureInCache = leggiMisure(stile);
  return misureInCache;
}
/** Svuota la cache di `misureDi`: da chiamare dove il layout cambia davvero — `resize`, e i due
 *  attributi del `body` (`data-presentazione`/`data-pannelli`) che lo alterano senza scatenarlo. */
export function dimenticaMisure() { misureInCache = null; }

// ponytail: 0,6 em è l'avanzamento dei mono di sistema (SF Mono, Menlo); una stima, non una misura —
// `getComputedTextLength` vorrebbe disegnare, misurare e ridisegnare a ogni giro.
export const avanzamentoMono = (carattere) => 0.6 * carattere;
