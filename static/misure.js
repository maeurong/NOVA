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

// Cache globale (R14): le sette variabili si definiscono in due punti soli, `:root` e
// `body[data-presentazione]`, e nessun elemento le ridefinisce — non serve una chiave per
// elemento. `elemento` sceglie solo su cosa chiamare `getComputedStyle` (piano e spazio hanno
// ciascuno il proprio riquadro in chiusura); non è una chiave di cache, e due chiamanti diversi
// nello stesso giro condividono lo stesso risultato. `dimenticaMisure()` la svuota dove il layout
// cambia davvero: `resize` e i due attributi del `body` che lo alterano senza scatenarlo (app.js).
let misureInCache = null;
export function misureDi(elemento) {
  if (misureInCache) return misureInCache;
  const stile = globalThis.getComputedStyle?.(elemento ?? globalThis.document?.body);
  // Senza `getComputedStyle` (DOM finto dei test) i numeri d'oggi, ma non si cachano: altrimenti
  // il primo test a girare senza `getComputedStyle` avvelenerebbe la cache per tutti i successivi.
  if (!stile) return { ...MISURE_BASE };
  misureInCache = leggiMisure(stile);
  return misureInCache;
}
export function dimenticaMisure() { misureInCache = null; }

// ponytail: 0,6 em è l'avanzamento dei mono di sistema (SF Mono, Menlo); una stima, non una misura —
// `getComputedTextLength` vorrebbe disegnare, misurare e ridisegnare a ogni giro.
export const avanzamentoMono = (carattere) => 0.6 * carattere;
