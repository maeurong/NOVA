// Le misure del disegno — raggio dei nodi, tratti, corpo delle etichette, opacità dell'ombra —
// dichiarate in un posto solo: le variabili CSS di `stile.css`, che `body[data-presentazione]`
// ridefinisce per l'aula (story 62, `PRODUCT.md:96-101`). Il piano e lo spazio le leggono a ogni
// disegno; i ripieghi sono i numeri che stavano scritti a mano in `piano.js` e `spazio.js`, così
// fuori dalla presentazione il disegno resta identico al pixel.
export const MISURE_BASE = Object.freeze({ raggioNodo: 5, trattoAsta: 2, trattoScelta: 3, trattoDeformata: 2,
                                           bordoDeformata: 2, carattere: 11, ombra: 0.3 });
export const VARIABILI = Object.freeze({ raggioNodo: "--nodo-raggio", trattoAsta: "--asta-tratto",
                                         trattoScelta: "--asta-tratto-scelta", trattoDeformata: "--deformata-tratto",
                                         bordoDeformata: "--deformata-bordo", carattere: "--etichetta", ombra: "--ombra-opacita" });

export function leggiMisure(stile) {
  const misure = { ...MISURE_BASE };
  for (const [chiave, nome] of Object.entries(VARIABILI)) {
    const n = parseFloat(stile?.getPropertyValue?.(nome));
    if (Number.isFinite(n) && n > 0) misure[chiave] = n;
  }
  return misure;
}

// ponytail: 0,6 em è l'avanzamento dei mono di sistema (SF Mono, Menlo); una stima, non una misura —
// `getComputedTextLength` vorrebbe disegnare, misurare e ridisegnare a ogni giro.
export const avanzamentoMono = (carattere) => 0.6 * carattere;
