// Il piano di lavoro: SVG, perché qui vivono i gesti e le etichette, e un'etichetta che
// non si sovrappone è più facile da garantire con il testo del documento che con una
// texture. Lo spazio three.js legge lo stesso modello e non tocca niente.
//
// Terna: `x` a destra, `z` in alto (l'alzado del telaio). In SVG `y` cresce verso il basso,
// quindi `z` si specchia una volta sola, qui dentro, e nessun altro modulo se ne accorge.

import { millimetri } from "./numeri.js";
import { nodo, asteDelNodo } from "./modello.js";
import { frecceDeiCarichi, testoCarico } from "./carichi.js";
import { GRADI, nomePreimpostazione } from "./vincoli.js";
import { puntiDeformata, diagramma, scalaDiagrammaAuto, picchi, testoValore, testoBadge, frecciaMassima,
         asteRuotate, simboloStato, stazioniDiAsta, testoLegendaStati, VIRIDIS, massimoSpostamento,
         coloreSpostamento, testoScalaColori } from "./risultati.js";
import { disponi, sottoSoglia } from "./etichette.js";
import { leggiMisure, avanzamentoMono } from "./misure.js";

const NS = "http://www.w3.org/2000/svg";
const MARGINE = 0.12;      // frazione dell'estensione, per non incollare il telaio ai bordi
const LATO_MINIMO = 2000;  // mm: un modello con un solo nodo ha estensione zero
// px, il metro dei simboli dei vincoli e del ghost, che restano come sono; i nodi leggono `--nodo-raggio`.
const RAGGIO = 5;
// px, distanza dell'etichetta dal nodo: 9 bastava sulla diagonale (9√2≈12.7 di ipotenusa)
// ma non sul verso assiale puro (su/giù/dx/sx), dove l'offset è tutto su un asse solo e
// l'etichetta tocca il proprio cerchio — misurato, 6px di sovrapposizione reale.
// È il minimo: a corpi grandi `disegna` lo porta a raggio + 0,6 em, o l'occhio del testo tocca il cerchio.
const OFFSET_ETICHETTA = 16;
// Il riquadro da usare finché il layout non l'ha misurato. Con `|| 1` (com'era) `s` diventava
// l'intero modello per pixel, e **ogni** misura in px — tratti, cerchi, etichette, ostacoli —
// usciva grande quanto il telaio: nessun picco trovava posto e sparivano tutti. Un riquadro
// nominale è un'ipotesi, ma è coerente per tutto il disegno, e il `resize` di `app.js` ridisegna
// con la misura vera appena c'è.
const LARGHEZZA_NOMINALE = 800, ALTEZZA_NOMINALE = 600;

// Le otto direzioni candidate per l'etichetta, in ordine fisso: a parità di punteggio
// vince la prima, e il disegno resta identico a parità di stato.
const VERSI = [
  { x: 1, z: 1 }, { x: 1, z: 0 }, { x: 0, z: 1 }, { x: -1, z: 1 },
  { x: -1, z: 0 }, { x: -1, z: -1 }, { x: 0, z: -1 }, { x: 1, z: -1 },
].map(({ x, z }) => { const l = Math.hypot(x, z); return { x: x / l, z: z / l }; });

// I colori scritti a mano, non come `var(--…)`: le presentation attribute dell'SVG non
// risolvono le variabili CSS, e un `fill="var(--rosso)"` esce nero senza dire niente.
// Sono gli stessi valori di `stile.css`; se là cambiano, cambiano qui.
const INCHIOSTRO = "#141414";
const ROSSO = "#b8321e";
const MONO = 'ui-monospace, "SF Mono", "Menlo", monospace';

/** La larghezza di un testo mono al corpo `carattere` (px), in millimetri del `viewBox`: 0,6 em per
 *  carattere (`avanzamentoMono`), una **stima**, non una misura — `getComputedTextLength` vorrebbe
 *  disegnare, misurare e ridisegnare a ogni giro. `extraPx` è il margine che il chiamante vuole
 *  attorno: 2 per il box di un'etichetta, 8 per il rientro di una striscia dal bordo. Con `s = 1`
 *  esce in pixel, che è come la legge il conto del riquadro.
 *  Stava scritta a mano in cinque punti con quattro margini diversi; qui è una sola. */
const larghezzaMono = (testo, s, extraPx, carattere) => (testo.length * avanzamentoMono(carattere) + extraPx) * s;

const el = (nome, attributi = {}) => {
  const e = document.createElementNS(NS, nome);
  for (const [k, v] of Object.entries(attributi)) e.setAttribute(k, v);
  return e;
};

/** L'estensione da inquadrare: i nodi **più il ghost**. Senza il ghost, il primo gesto su
 *  un modello con un nodo solo (riquadro 2000 mm) disegnerebbe un'estrusione da 3000 fuori
 *  dal riquadro, senza sollevare niente: si vedrebbe solo sparire. Vale identico per il
 *  punto in anteprima del campo di comando, che di coordinate fuori vista ne accetta
 *  quante ne vuole e senza questo le disegnerebbe dove non si guarda.
 *
 *  `extraMm`: millimetri in più a destra e a sinistra, oltre al margine del 12 %. Serve alle
 *  etichette dei nodi, che stanno in pixel fuori dal nodo e che il 12 % non conosce: su MURO 1 il
 *  margine vale 40 px e «cerniera» ne chiede 90, quindi il nome usciva dal riquadro e l'SVG lo
 *  tagliava a metà. Chi disegna lo misura e lo passa (`piano.js`, `disegna`). In z no (R3): il nome
 *  sta di fianco al nodo, e l'extra in altezza serviva solo a far comandare l'altro lato. */
export function estensione(m, ghost = null, extraMm = 0) {
  const punti = m.nodi.map((n) => ({ x: n.x, z: n.z }));
  const da = ghost && nodo(m, ghost.da);
  if (da) punti.push({ x: da.x + ghost.dx, z: da.z + ghost.dz });
  if (ghost?.punto) punti.push(ghost.punto);
  if (punti.length === 0) return { x0: -LATO_MINIMO / 2, z0: -LATO_MINIMO / 2, larghezza: LATO_MINIMO, altezza: LATO_MINIMO };
  const xs = punti.map((p) => p.x), zs = punti.map((p) => p.z);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  const z0 = Math.min(...zs), z1 = Math.max(...zs);
  const larghezza = Math.max(x1 - x0, LATO_MINIMO);
  const altezza = Math.max(z1 - z0, LATO_MINIMO);
  const extra = Number.isFinite(extraMm) && extraMm > 0 ? extraMm : 0;
  const mx = larghezza * MARGINE + extra, mz = altezza * MARGINE;
  return { x0: x0 - mx, z0: z0 - mz, larghezza: larghezza + 2 * mx, altezza: altezza + 2 * mz };
}

/** Il verso in cui posare l'etichetta di un nodo: quello più lontano da tutte le sue aste.
 *  Un nodo isolato non ha vincoli e prende il primo, in alto a destra. */
export function versoLibero(m, n, occupate = []) {
  // `occupate`: versori che il chiamante sa già presi — il simbolo del vincolo sotto il nodo,
  // per esempio, che non è un'asta ma occupa il basso quanto un'asta.
  const direzioni = [...occupate];
  for (const a of asteDelNodo(m, n.id)) {
    const altro = nodo(m, a.nodo_i === n.id ? a.nodo_j : a.nodo_i);
    if (!altro) continue;
    const l = Math.hypot(altro.x - n.x, altro.z - n.z);
    if (l > 0) direzioni.push({ x: (altro.x - n.x) / l, z: (altro.z - n.z) / l });
  }
  if (direzioni.length === 0) return VERSI[0];
  let scelto = VERSI[0], peggiore = Infinity;
  for (const v of VERSI) {
    // Il prodotto scalare più alto è l'asta angolarmente più vicina a questo verso: è lei
    // che deciderebbe la collisione. Fra i versi si tiene quello il cui vicino più stretto
    // è il **meno** vicino di tutti — cioè il minimo dei massimi.
    const vicino = Math.max(...direzioni.map((d) => d.x * v.x + d.z * v.z));
    if (vicino < peggiore) { peggiore = vicino; scelto = v; }
  }
  return scelto;
}

export function creaPiano(contenitore, { suSelezione, suSfondo }) {
  const svg = el("svg", { "aria-label": "piano di lavoro x–z" });
  // Il titolo dei carichi è testo del documento, non un `<text>` nel `viewBox`: dentro l'SVG
  // scalava coi millimetri e finiva addosso alla prima etichetta in alto a sinistra. Fuori,
  // è un `<p>` in posizione assoluta su `#piano` (`stile.css`, già `position: relative`),
  // sempre 11px, e nessun modello lo può spostare.
  const titolo = document.createElement("p");
  titolo.className = "carichi-titolo";
  titolo.textContent = "";
  titolo.hidden = true;
  // Il badge dei risultati, dall'altra parte: la scala della deformata e le unità sono
  // dichiarate sempre, anche quando non c'è niente da disegnare (`docs/ricerca/07-ux-modellatore.md:99`).
  const badge = document.createElement("p");
  badge.className = "risultati-badge";
  // `aria-live="polite"`: cambiare vista o caso non sposta il fuoco, e senza questo chi legge
  // con lo schermo non sa che la scala del disegno è cambiata sotto le dita.
  badge.setAttribute("aria-live", "polite");
  badge.hidden = true;
  // La legenda dei simboli dello stato delle sezioni, sotto il badge: i due canali (riempimento
  // per il calcestruzzo, contorno per l'acciaio) non si indovinano, vanno scritti
  // (`docs/ricerca/07-ux-modellatore.md:100`). Si vede solo con la pushover in vista deformata.
  const legenda = document.createElement("p");
  legenda.className = "risultati-legenda";
  legenda.hidden = true;
  // La legenda dei colori della deformata (15a): |u|, lo zero, la rampa viridis, il massimo. Senza, un
  // colore non dice quanti millimetri sono (`docs/ricerca/07-ux-modellatore.md:154`). In coda ai figli:
  // badge e legenda degli stati restano il terzo e il quarto.
  const colori = document.createElement("div");
  colori.className = "risultati-colori";
  colori.hidden = true;
  const parte = (classe) => { const e = document.createElement("span"); e.className = classe; return e; };
  const titoloColori = parte("titolo"), minColori = parte("min"), maxColori = parte("max");
  const gradiente = el("linearGradient", { id: "viridis-legenda" });
  VIRIDIS.forEach((c, k) => gradiente.append(el("stop", { offset: k / (VIRIDIS.length - 1), "stop-color": c })));
  const defs = el("defs");
  defs.append(gradiente);
  // La rampa bordata d'inchiostro come la deformata: il giallo in cima sul fondo chiaro non ha bordo suo.
  const rampa = el("svg", { viewBox: "0 0 120 10", preserveAspectRatio: "none", "aria-hidden": "true" });
  rampa.append(defs, el("rect", { x: 0.5, y: 0.5, width: 119, height: 9, fill: "url(#viridis-legenda)",
                                  stroke: INCHIOSTRO, "stroke-width": 1, "vector-effect": "non-scaling-stroke" }));
  colori.append(titoloColori, minColori, rampa, maxColori);
  contenitore.replaceChildren(svg, titolo, badge, legenda, colori);
  let vista = estensione({ nodi: [] });

  svg.addEventListener("click", (ev) => {
    const bersaglio = ev.target.closest("[data-tipo]");
    if (bersaglio) suSelezione(bersaglio.dataset.tipo, Number(bersaglio.dataset.id));
    else suSfondo();
  });

  // `z` verso l'alto: si specchia qui, in un punto solo. Il fondo del riquadro è `z0`, la
  // cima è `z0 + altezza`, quindi `y = 2·z0 + altezza − z` porta l'uno sull'altro.
  const schermo = (n) => ({ x: n.x, y: 2 * vista.z0 + vista.altezza - n.z });

  function inquadra(m, ghost, extraMm = 0) {
    vista = estensione(m, ghost, extraMm);
    svg.setAttribute("viewBox", `${vista.x0} ${vista.z0} ${vista.larghezza} ${vista.altezza}`);
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  }

  /** Millimetri per pixel. Con `preserveAspectRatio="… meet"` il riquadro ci sta **intero**,
   *  quindi comanda il lato più stretto: prendere la sola larghezza dà tratti ed etichette
   *  della misura sbagliata in un riquadro alto e magro, che è come nasce a 1280 px. */
  const pixelDelRiquadro = () => ({ w: contenitore.clientWidth || LARGHEZZA_NOMINALE,
                                    h: contenitore.clientHeight || ALTEZZA_NOMINALE });
  function millimetriPerPixel() {
    const { w, h } = pixelDelRiquadro();
    return Math.max(vista.larghezza / w, vista.altezza / h);
  }

  /** Lo strato dei risultati: la deformata o i diagrammi M/V/N, in un `<g>` che il chiamante
   *  appende **fra le aste e i nodi** — i nodi restano sopra e cliccabili (R5). Le etichette non
   *  si scrivono qui: si accodano a `richieste`, che `disegna` posa con `disponi` dopo i nodi,
   *  quando i loro cerchi e i loro nomi sono ostacoli noti. Un solo colore, inchiostro; rosso
   *  quando la corsa è stantia — il rosso dice attenzione (story 63). La deformata fresca è l'unica
   *  eccezione: viridis sopra un bordo d'inchiostro, e `raccolto.uMax` porta la scala alla legenda. */
  function stratoDeiRisultati(m, attivo, vistaRis, s, misure, raccolto) {
    const { richieste, linee } = raccolto;
    const colore = attivo.stantia ? ROSSO : INCHIOSTRO;
    // Il bbox di un segmento, con un pixel di margine per lato. Le linee del disegno — le ordinate
    // di stazione, i tratti fra due stazioni, la polilinea della deformata — sono ostacoli quanto
    // un cerchio: un'etichetta che ci passa sopra si legge barrata (visto su MURO 1). Il rettangolo
    // di un segmento obliquo è più largo del segmento: è la lettura pessimista, e costa qualche
    // etichetta spostata invece di qualcuna illeggibile.
    // ponytail: bbox e non distanza punto-segmento. Su un diagramma quasi piatto — che è il caso
    // che conta — le due coincidono; su una diagonale lunga il bbox prende anche l'aria attorno,
    // e allora si passa alla distanza vera.
    const segmento = (a, b, margine = s) => linee.push({ x0: Math.min(a.x, b.x) - margine, y0: Math.min(a.y, b.y) - margine,
                                                         x1: Math.max(a.x, b.x) + margine, y1: Math.max(a.y, b.y) + margine });
    const spezzata = (punti, margine = s) => { for (let k = 1; k < punti.length; k++) segmento(punti[k - 1], punti[k], margine); };
    // `pointer-events: none`: il poligono ha un `fill` e passa sopra l'asta, quindi senza questo
    // il clic sull'asta finisce sullo strato, che non porta `[data-tipo]`, e scivola a `suSfondo()`.
    const g = el("g", { class: "risultati", "pointer-events": "none" });
    const coppia = (p) => `${p.x},${p.y}`;
    if (vistaRis === "deformata") {
      // Il fattore dell'animazione moltiplica la **scala del disegno**, non la scala dichiarata:
      // il badge dice l'ampiezza massima, che è ferma, mentre il disegno respira (Global
      // Constraints). Assente = 1; a 0 la deformata cade esattamente sull'ombra indeformata.
      const scalaDisegno = attivo.scala * (attivo.fattore ?? 1);
      const deformate = puntiDeformata(m, attivo.perCaso, scalaDisegno);
      // |u|max della legenda: quello che `app.js` passa (fisso per la corsa della pushover) o quello
      // che si vede. Stantia non si colora: numeri vecchi in viridis si leggerebbero come nuovi.
      const uMax = Number.isFinite(attivo.uMax) ? attivo.uMax : massimoSpostamento(deformate);
      raccolto.uMax = uMax;
      for (const d of deformate) {
        const punti = d.punti.map((p) => ({ ...schermo(p), u: p.u }));
        const coppie = punti.map(coppia).join(" ");
        if (attivo.stantia) {
          g.append(el("polyline", { class: "deformata", points: coppie, fill: "none", stroke: ROSSO,
            "stroke-width": misure.trattoDeformata * s,
            "stroke-dasharray": `${6 * s} ${4 * s}`, "stroke-linejoin": "round" }));
        } else {
          // Viridis sotto 3:1 sul fondo da metà scala in su: il bordo in inchiostro tiene la forma, il
          // colore porta il valore (story 62-63, `07-ux-modellatore.md:100`). SVG non ha gradienti lungo
          // il percorso: un tratto per coppia di punti, del colore della loro media.
          g.append(el("polyline", { class: "deformata-bordo", points: coppie, fill: "none", stroke: INCHIOSTRO,
            "stroke-width": (misure.trattoDeformata + 2 * misure.bordoDeformata) * s,
            "stroke-linejoin": "round", "stroke-linecap": "round" }));
          for (let k = 1; k < punti.length; k++) {
            const a = punti[k - 1], b = punti[k];
            g.append(el("line", { class: "deformata", x1: a.x, y1: a.y, x2: b.x, y2: b.y,
              stroke: coloreSpostamento((a.u + b.u) / 2, uMax),
              "stroke-width": misure.trattoDeformata * s, "stroke-linecap": "round" }));
          }
        }
        // Il bordo sporge dalla linea di mezzo tratto più il bordo: col pixel dei diagrammi un'etichetta ci
        // entrava con la metà (la freccia a 2 px sul telaio spostato). La stantia è un tratto solo.
        spezzata(punti, attivo.stantia ? s : (misure.trattoDeformata / 2 + misure.bordoDeformata) * s);
      }
      // La freccia massima sta **fra** i nodi, non su un nodo: su una trave appoggiata gli
      // appoggi sono fermi. L'etichetta va dove la freccia è, e `frecciaMassima` dice dove.
      // Con un modo o un passo non si scrive affatto — la forma modale è adimensionale, e lo
      // spostamento del passo è già nel badge — quindi `frecciaMassima` non si chiama nemmeno:
      // è il 26 % del costo per fotogramma speso per un'etichetta che poi non esce (R5).
      if (attivo.tipo !== "modo" && attivo.tipo !== "pushover") {
        const { valore, punto, indeformato } = frecciaMassima(m, attivo.perCaso);
        if (valore > 0 && punto) {
          // Il punto campionato è a scala 1: sul disegno lo scostamento è amplificato di `scala`.
          const p = schermo({ x: indeformato.x + scalaDisegno * (punto.x - indeformato.x),
                              z: indeformato.z + scalaDisegno * (punto.z - indeformato.z) });
          const base = schermo(indeformato);
          richieste.push({ id: "freccia", x: p.x, y: p.y, testo: testoValore("deformata", valore),
                                    priorita: 2, preferito: { dx: p.x - base.x, dy: p.y - base.y } });
        }
      }
      // Lo stato delle sezioni per stazione, sull'asta deformata: due canali di inchiostro, il
      // riempimento per il calcestruzzo e il contorno per l'acciaio (`07-ux-modellatore.md:100`).
      // Niente colore: il rosso resta ad attenzione e selezione (story 63).
      // La tavola degli id una volta sola, non un `find` per asta dentro il ciclo: su un telaio
      // con qualche centinaio di aste erano n² confronti a fotogramma. Un `id` che non c'è più nel
      // modello rende `undefined`, e `stazioniDiAsta` lo regge come oggi (suddivisioni → 1).
      const perId = attivo.stati ? new Map(m.aste.map((a) => [a.id, a])) : null;
      for (const d of attivo.stati ? deformate : []) {
        const lista = attivo.stati[String(d.id)];
        if (!Array.isArray(lista) || lista.length === 0 || d.punti.length === 0) continue;
        const xr = stazioniDiAsta(perId.get(d.id), lista.length);
        for (let k = 0; k < xr.length; k++) {
          const sim = simboloStato(lista[k]);
          if (!sim) continue;   // stazione senza stato: nessun simbolo, mai uno inventato (R9)
          // Il punto della deformata più vicino per `r`: le stazioni di Lobatto non cadono sui
          // campioni della cubica, e spostare il simbolo di un campione costa meno che
          // ricalcolare la deformata in un'ascissa sua.
          // ponytail: scansione lineare su una decina di punti per asta; se un giorno i
          // campioni diventassero centinaia, si passa a una ricerca binaria su `r` crescente.
          const q = d.punti.reduce((a, b) => (Math.abs(b.r - xr[k]) < Math.abs(a.r - xr[k]) ? b : a));
          const p = schermo(q);
          g.append(el("circle", { class: "stato", cx: p.x, cy: p.y, r: 3.5 * s,
                                  fill: colore, "fill-opacity": sim.riempimento, stroke: colore,
                                  "stroke-width": (sim.contorno === "spesso" ? 2.5 : 1) * s }));
          if (sim.contorno === "croce") for (const verso of [-1, 1]) {
            g.append(el("line", { class: "stato-croce", x1: p.x - 4 * s, y1: p.y - 4 * s * verso,
                                  x2: p.x + 4 * s, y2: p.y + 4 * s * verso,
                                  stroke: colore, "stroke-width": 1.5 * s }));
          }
          linee.push({ x0: p.x - 4 * s, y0: p.y - 4 * s, x1: p.x + 4 * s, y1: p.y + 4 * s });
        }
      }
    } else {
      const scalaD = scalaDiagrammaAuto(m, attivo.perCaso, vistaRis);
      let massimo = 0;
      const diagrammi = diagramma(m, attivo.perCaso, vistaRis, scalaD);
      for (const d of diagrammi) for (const p of d.punti) massimo = Math.max(massimo, Math.abs(p.valore));
      for (const d of diagrammi) {
        const pi = schermo(d.base[0]), pj = schermo(d.base[1]);
        const punti = d.punti.map((p) => schermo(p));
        g.append(el("polygon", {
          class: "diagramma", points: [pi, ...punti, pj].map(coppia).join(" "),
          fill: colore, "fill-opacity": 0.08, stroke: colore, "stroke-width": 1.5 * s,
          "stroke-dasharray": `${5 * s} ${3 * s}` }));
        // Il contorno **chiuso**, gli stessi punti del poligono: i due lati che tornano alla base
        // (`pi→punti[0]` e l'ultimo→`pj`) sono linee come le altre, e un'etichetta all'estremo di
        // un'asta ci finiva sopra.
        spezzata([pi, ...punti, pj]);
        // Le ordinate per stazione: si vede dove il solutore ha misurato (story 38). `x_rel`
        // guasto sta sul nodo i, come in `diagramma`, invece di scrivere `x1="NaN"`.
        for (const p of d.punti) {
          const r = Number.isFinite(p.x_rel) ? p.x_rel : 0;
          const b = schermo({ x: d.base[0].x + (d.base[1].x - d.base[0].x) * r, z: d.base[0].z + (d.base[1].z - d.base[0].z) * r });
          const q = schermo(p);
          g.append(el("line", { class: "stazione", x1: b.x, y1: b.y, x2: q.x, y2: q.y, stroke: colore, "stroke-width": 0.75 * s }));
          segmento(b, q);
        }
        // `d.chiave`, non una costante: sui pilastri è `Mz`/`Vy` (R1).
        picchi(attivo.perCaso?.sollecitazioni?.[String(d.id)], d.chiave).forEach((picco, ordine) => {
          // Il picco **principale** di un'asta si scrive sempre: è il numero che quell'asta ha da
          // dire, e tacerlo perché un'altra asta è più caricata lascia una trave muta accanto a un
          // pilastro grosso. La soglia vale per il secondo picco, quello di segno opposto, che è
          // un di più. `forEach` e non `for…of`: serve l'indice, e `continue` diventa `return`.
          if (ordine > 0 && sottoSoglia(picco.valore, massimo)) return;
          const p = d.punti.find((q) => q.x_rel === picco.x_rel);
          if (!p) return;
          const q = schermo(p);
          // Il verso preferito: dalla base del diagramma verso il picco, cioè **fuori** dal
          // poligono. Senza, l'etichetta parte da «sopra» e su un diagramma disegnato in su la
          // linea tratteggiata e le ordinate le passano dentro (visto su MURO 1, «0,2056 kN·m»).
          const b = schermo({ x: d.base[0].x + (d.base[1].x - d.base[0].x) * p.x_rel,
                              z: d.base[0].z + (d.base[1].z - d.base[0].z) * p.x_rel });
          // `1 +`: un picco piccolo resta comunque più importante di un'etichetta di carico
          // (`0.5`). È il soggetto della vista; il carico è il contorno.
          richieste.push({ id: `${d.id}@${picco.x_rel}`, x: q.x, y: q.y, testo: testoValore(vistaRis, picco.valore),
                                    priorita: 1 + Math.abs(picco.valore) / massimo,
                                    preferito: { dx: q.x - b.x, dy: q.y - b.y } });
        });
      }
    }
    return g;
  }

  // `azioneInVista` e non `azione`: è l'oggetto azione, non un identificatore, e in tutto il
  // resto del programma un `azione` nudo è un id (`comando.azione`, `carico.azione`).
  function disegna(m, { selezione = null, ghost = null, azioneInVista = null, proposte = [], risultati = null } = {}) {
    // Le misure a ogni disegno, dalle variabili CSS del riquadro, che la presentazione ridefinisce per
    // l'aula. Senza `getComputedStyle` (i test) o senza variabili: i numeri d'oggi (`misure.js`).
    const misure = leggiMisure(globalThis.getComputedStyle?.(contenitore));
    const offset = Math.max(OFFSET_ETICHETTA, misure.raggioNodo + misure.carattere * 0.6);
    inquadra(m, ghost);
    let s = millimetriPerPixel();
    // Le etichette dei nodi stanno in pixel fuori dal nodo, e il margine del 12 % non le conosce:
    // su MURO 1 vale 40 px, mentre «cerniera» ne chiede 53 di solo testo, e usciva dal riquadro
    // tagliata a metà. Il conto si fa **in pixel**, perché è lì che il problema vive: il margine
    // del 12 % vale sempre 9,68 % della misura del riquadro in pixel (`mx/s = 0,0968·W`), qualunque
    // sia il modello, quindi allargare in proporzione non sposta niente — il margine cresce insieme
    // a `s`. Serve un margine **assoluto** in più, e la formula lo porta esattamente a `P` pixel.
    //
    // Il grilletto guarda il **solo nome**, non nome più stacco, e la ragione è misurata: allargare
    // il riquadro rimpicciolisce il modello sullo schermo mentre le etichette restano di 11 px, e
    // così si avvicinano fra loro. Col grilletto sul totale, il telaio 2×1 a zoom 200 % — nomi di
    // **una** cifra, nessun nome da salvare, ma un riquadro di 120 px dove i 16 di stacco già non
    // ci stanno — si allargava del 31 % e «2» e «3» finivano a toccarsi: il fumo da 12/12 a 8/12.
    // I nomi lunghi sono il difetto visto a mano, e solo loro pagano il riquadro più largo.
    // I nodi che porteranno un simbolo di vincolo (dichiarato, o proposto e non dichiarato):
    // l'etichetta del nodo non va in basso, dove il simbolo sta. Visto sul caso studio: il
    // «piede sx» finiva sulla base del triangolo.
    const dichiarati = new Set(m.nodi.filter((n) => n.vincolo && GRADI.some((g) => n.vincolo[g])).map((n) => n.id));
    const conSimbolo = new Set(dichiarati);
    for (const p of proposte ?? []) if (nodo(m, p.nodo)) conSimbolo.add(p.nodo);  // pieno o ghost, il basso è preso
    const nomeDi = (n) => String(n.nome ?? n.id);
    const nomePiuLungo = m.nodi.map(nomeDi).reduce((a, b) => (b.length > a.length ? b : a), "");
    // Il verso di ogni nome, una chiamata sola per nodo: serve qui al conto del riquadro e più giù a posarli.
    const versi = new Map(m.nodi.map((n) => [n.id, versoLibero(m, n, conSimbolo.has(n.id) ? [{ x: 0, z: -1 }] : [])]));
    // Sempre la larghezza (R3): il nome sta di fianco al nodo e l'extra va solo in x (`estensione`). Col
    // lato che comanda, a 46 px l'extra finiva anche in z, comandava l'altro lato e il MURO 1 usciva
    // 356×253 px su 1151×944.
    const W = pixelDelRiquadro().w, L0 = vista.larghezza;
    // I pixel che il nome più sporgente chiede, su tutti i nodi: dello stacco conta la sola componente in x
    // del verso (sul MURO 1 «sommità sx» sta a ↖, 0,71; con lo stacco intero il telaio usciva 526 px invece
    // di 545), e a pari lunghezza un nome di fianco sporge più di uno sopra. `max` coi 16 d'oggi: a 11 px
    // il conto resta quello di prima.
    const P = Math.max(0, ...m.nodi.map((n) => larghezzaMono(nomeDi(n), 1,
      Math.max(OFFSET_ETICHETTA, offset * Math.abs(versi.get(n.id).x)) + 4, misure.carattere)));
    // `W > 2·P`: oltre metà del riquadro l'etichetta non ci sta comunque, e allargare peggiora e
    // basta. ponytail: lì si taglia, e il rimedio vero sarebbe posare anche i nomi con `disponi`.
    if (larghezzaMono(nomePiuLungo, 1, 0, misure.carattere) > MARGINE / (1 + 2 * MARGINE) * W && W > 2 * P) {
      const m0 = L0 * MARGINE / (1 + 2 * MARGINE);
      inquadra(m, ghost, (P * L0 - W * m0) / (W - 2 * P));
      s = millimetriPerPixel();
    }
    const gruppo = el("g");
    // `vistaRis` e non `vista`: `vista` qui sopra è il **riquadro**, e serve al badge più giù.
    const vistaRis = risultati?.vista ?? null;
    const attivo = vistaRis ? risultati : null;

    for (const a of m.aste) {
      const i = nodo(m, a.nodo_i), j = nodo(m, a.nodo_j);
      if (!i || !j) continue;  // un'asta orfana non si disegna: la eliminerà il Check Model
      const pi = schermo(i), pj = schermo(j);
      const scelta = selezione?.tipo === "asta" && selezione.id === a.id;
      gruppo.append(el("line", {
        x1: pi.x, y1: pi.y, x2: pj.x, y2: pj.y,
        stroke: scelta ? ROSSO : INCHIOSTRO,
        "stroke-width": (scelta ? misure.trattoScelta : misure.trattoAsta) * s,
        "stroke-linecap": "round", "data-tipo": "asta", "data-id": a.id,
        // Con la deformata l'indeformata resta come ombra: si vede di quanto si è mosso, non
        // solo dove sta adesso. L'asta selezionata no — quella è l'unica cosa piena e rossa.
        ...(attivo && vistaRis === "deformata" && !scelta ? { "stroke-opacity": misure.ombra } : {}),
      }));
    }

    // Lo strato dei risultati fra le aste e i nodi: i nodi restano sopra e cliccabili.
    // `richieste`: picchi e carichi, li posa `disponi` dopo i nodi, insieme. `linee`: i bbox delle
    // linee dei diagrammi, ostacoli come i cerchi. Un oggetto solo, che due array posizionali dello
    // stesso tipo si scambiano di posto senza che niente se ne accorga.
    const raccolto = { richieste: [], linee: [], uMax: 0 };
    const stratoRisultati = attivo ? stratoDeiRisultati(m, attivo, vistaRis, s, misure, raccolto) : null;
    const richiesteEtichette = raccolto.richieste;
    if (stratoRisultati) gruppo.append(stratoRisultati);

    // Il punto in anteprima del campo di comando: un ghost senza nodo di partenza, quindi
    // una forma sua invece di un `{da, dx, dz}` con un'origine inventata. Cerchio vuoto e
    // tratteggiato — «c'è, ma non ancora»: il nodo posato è pieno, questo no.
    if (ghost?.punto) {
      const p = schermo(ghost.punto);
      gruppo.append(el("circle", {
        cx: p.x, cy: p.y, r: RAGGIO * 1.6 * s, fill: "none",
        stroke: ROSSO, "stroke-width": 2 * s, "stroke-dasharray": `${3 * s} ${3 * s}`,
      }));
      const testo = el("text", {
        x: p.x + OFFSET_ETICHETTA * s, y: p.y - OFFSET_ETICHETTA * s,
        "font-size": 11 * s, fill: ROSSO, "font-family": MONO,
      });
      testo.textContent = `${millimetri(ghost.punto.x)}; ${millimetri(ghost.punto.z)}`;
      gruppo.append(testo);
    } else if (ghost) {
      const da = nodo(m, ghost.da);
      if (da) {  // un ghost su un nodo sparito è solo un ghost che non si disegna
        const p0 = schermo(da);
        const p1 = schermo({ x: da.x + ghost.dx, z: da.z + ghost.dz });
        gruppo.append(el("line", {
          x1: p0.x, y1: p0.y, x2: p1.x, y2: p1.y,
          stroke: ROSSO, "stroke-width": 2 * s,
          "stroke-dasharray": `${6 * s} ${5 * s}`,
        }));
        const testo = el("text", {
          x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 - 8 * s,
          "font-size": 12 * s, fill: ROSSO, "text-anchor": "middle", "font-family": MONO,
        });
        testo.textContent = `${millimetri(Math.hypot(ghost.dx, ghost.dz))} mm`;
        gruppo.append(testo);
      }
    }

    const etichettate = new Set();
    // Gli ostacoli per le etichette dei risultati: i cerchi e le etichette dei nodi non si
    // spostano (le posa `versoLibero`), quindi sono loro il terreno e i picchi ci girano attorno.
    const ostacoli = [...raccolto.linee];
    for (const n of m.nodi) {
      const p = schermo(n);
      const scelto = selezione?.tipo === "nodo" && selezione.id === n.id;
      // Un `<g>` unico per cerchio ed etichetta: senza, un clic sull'etichetta non trova
      // `[data-tipo]` risalendo da un `<text>` nudo e scivola a `suSfondo()`.
      const nodoEl = el("g", { "data-tipo": "nodo", "data-id": n.id });
      nodoEl.append(el("circle", {
        cx: p.x, cy: p.y, r: (scelto ? misure.raggioNodo * 1.6 : misure.raggioNodo) * s,  // doppio canale: rosso e più grosso
        fill: scelto ? ROSSO : INCHIOSTRO,
      }));
      const r = misure.raggioNodo * s;
      ostacoli.push({ x0: p.x - r, y0: p.y - r, x1: p.x + r, y1: p.y + r });
      // Un'etichetta per posizione: due nodi coincidenti (da un file, non dai comandi)
      // scriverebbero due volte nello stesso punto, e il risultato è illeggibile.
      const posto = `${Math.round(n.x)}|${Math.round(n.z)}`;
      if (!etichettate.has(posto)) {
        etichettate.add(posto);
        const v = versi.get(n.id);
        const testo = el("text", {
          x: p.x + offset * s * v.x, y: p.y - offset * s * v.z, "font-size": misure.carattere * s,
          fill: INCHIOSTRO, "font-family": MONO,
          "text-anchor": v.x < -0.3 ? "end" : v.x > 0.3 ? "start" : "middle",
        });
        testo.textContent = n.nome ?? String(n.id);
        // Il box dell'etichetta del nodo: `y` è la linea di base (niente `dominant-baseline`
        // qui), quindi il testo sta **sopra** di essa — ma non tutto: «piede sx» ha una `p` che
        // scende sotto la base, e con `y1 = y` un picco ci finiva dentro. Un quarto di corpo di
        // discendente sotto (3 px a 11, 11,5 a 46) e un corpo sopra, più i due di margine per lato
        // che hanno anche i picchi.
        const larghezza = larghezzaMono(testo.textContent, s, 2, misure.carattere), altezza = misure.carattere * s;
        const x = p.x + offset * s * v.x, y = p.y - offset * s * v.z;
        const x0 = v.x < -0.3 ? x - larghezza : v.x > 0.3 ? x : x - larghezza / 2;
        ostacoli.push({ x0, y0: y - altezza, x1: x0 + larghezza, y1: y + Math.max(3, 0.25 * misure.carattere) * s });
        nodoEl.append(testo);
      }
      gruppo.append(nodoEl);
    }

    // La gravità non ha una freccia — nessun punto d'applicazione nel piano — quindi o si
    // dice nel titolo o non si vede da nessuna parte. Senza azione il titolo non parla: vuoto
    // **e** nascosto, che una riga vuota alta 11px è comunque un buco nell'angolo.
    // Scritti qui, prima dei picchi, perché i due `<p>` sono ostacoli e le etichette li leggono.
    const g = azioneInVista && (azioneInVista.carichi ?? []).find((c) => c.tipo === "gravita");
    titolo.textContent = azioneInVista
      ? `carichi: ${azioneInVista.nome}${g ? ` · ${testoCarico(g).replace("gravità · ", "g ")}` : ""}`
      : "";
    titolo.hidden = !azioneInVista;
    // La scala e le unità si stampano sempre, anche su un modello senza aste: dichiarano come
    // va letto il disegno, non cosa c'è dentro. Stantia = rosso **e** la parola (story 63).
    // `...attivo.badge`: modo, passo, caduta e fermo arrivano in un sotto-oggetto, e `testoBadge`
    // li vuole al primo livello insieme a vista, caso e scala.
    badge.textContent = attivo ? testoBadge({ ...attivo, ...(attivo.badge ?? {}), ruotate: asteRuotate(m) }) : "";
    badge.hidden = !attivo;
    badge.className = attivo?.stantia ? "risultati-badge stantia" : "risultati-badge";
    // La legenda parla solo quando i simboli ci sono: in vista M non c'è niente da decifrare.
    legenda.textContent = testoLegendaStati();
    legenda.hidden = !(attivo && attivo.stati && vistaRis === "deformata");
    // La legenda dei colori parla quando i colori ci sono: deformata non stantia. `raccolto.uMax` è la
    // stessa scala con cui lo strato ha colorato i tratti.
    const estremi = testoScalaColori({ uMax: raccolto.uMax, tipo: attivo?.tipo });
    titoloColori.textContent = estremi.titolo;
    minColori.textContent = estremi.min;
    maxColori.textContent = estremi.max;
    colori.hidden = !(attivo && vistaRis === "deformata" && !attivo.stantia);

    // Le strisce di testo stanno **fuori** dal `viewBox` ma sopra il piano: senza questi
    // ostacoli un picco negli angoli in alto finisce sotto il loro testo (R6). Il riquadro
    // `viewBox` non è il ritaglio: con `preserveAspectRatio="xMidYMid meet"` a ritagliare è il
    // **viewport**, che contiene il riquadro e coincide con lui sul lato stretto. In coordinate
    // del `viewBox` è il centro più mezza misura in pixel per `s`.
    const { w: larghezzaPx, h: altezzaPx } = pixelDelRiquadro();
    const cx = vista.x0 + vista.larghezza / 2, cy = vista.z0 + vista.altezza / 2;   // `vista` = il riquadro
    const viewport = { x0: cx - larghezzaPx * s / 2, y0: cy - altezzaPx * s / 2,
                       x1: cx + larghezzaPx * s / 2, y1: cy + altezzaPx * s / 2 };
    // I numeri vengono da `stile.css`: `left`/`right: 8px` più 0,6 em per carattere del corpo
    // `--etichetta` fanno la larghezza. Il titolo sta a `top: 6` e si tronca al `max-width: 45%`; il
    // badge sta su una riga sua e non si tronca — la scala non può mancare. Se là cambiano, qui le
    // etichette iniziano a passare sotto il testo senza che nessun test se ne accorga.
    // Le altezze le sa solo il browser — il badge va a capo, il corpo cambia in aula — quindi si
    // **misurano**, e i `top` li scrive qui chi misura: il badge sotto il titolo, la legenda degli
    // stati sotto il badge, quella dei colori sotto l'ultima visibile. I ripieghi sono per il DOM
    // finto dei test, senza `offsetHeight`, e a 11 px danno i numeri d'oggi (R9): badge a 22 e alto
    // 14, legenda alta 28, titolo fino a 20. La larghezza non supera il `max-width`: 8 px per lato.
    const dentro = (testo) => Math.min(larghezzaMono(testo, s, 8, misure.carattere), (larghezzaPx - 16) * s);
    // Scrive il `top`, fa l'ostacolo se la striscia si vede, e rende il `top` di quella che le va sotto.
    const striscia = (e, top, alta, testo) => {
      e.style.top = `${top}px`;
      if (e.hidden) return top;
      ostacoli.push({ x0: viewport.x1 - dentro(testo), x1: viewport.x1,
                      y0: viewport.y0 + top * s, y1: viewport.y0 + (top + alta) * s });
      return top + alta + 2;
    };
    const carattere = misure.carattere;
    let sotto = striscia(badge, 6 + Math.max(16, titolo.offsetHeight || carattere + 5),
                         badge.offsetHeight || carattere + 3, badge.textContent);
    sotto = striscia(legenda, sotto, legenda.offsetHeight || 2 * (carattere + 3), legenda.textContent);
    // La rampa è larga 6 em, cioè dieci caratteri del mono, e i tre `gap` valgono circa tre spazi.
    striscia(colori, sotto, colori.offsetHeight || carattere + 3,
             `${estremi.titolo} ${estremi.min} ${"x".repeat(10)} ${estremi.max}`);
    // `6 +`: l'altezza misurata del titolo parte dal suo `top`, non dal bordo.
    if (!titolo.hidden) ostacoli.push({ x0: viewport.x0, y0: viewport.y0, y1: viewport.y0 + (6 + (titolo.offsetHeight || carattere + 3)) * s,
                                        x1: viewport.x0 + Math.min(larghezzaMono(titolo.textContent, s, 8, carattere), 0.45 * larghezzaPx * s) });

    // I vincoli: il triangolo del disegno tecnico sotto il nodo, pieno se dichiarato,
    // tratteggiato se è una proposta del rilievo — un ghost, non un errore, quindi inchiostro
    // e non rosso. Px costanti come le frecce: non entrano in `estensione`.
    const simbolo = (n, incastro, classe, tratteggio) => {
      const p = schermo(n);
      const b = RAGGIO * 2 * s, w = RAGGIO * 3 * s;
      // Il simbolo occupa il basso del nodo quanto un'asta, e finora nessuno lo diceva a `disponi`:
      // sul MURO 1 «−0,1021 kN·m» finiva sopra il triangolo del piede sinistro. `versoLibero` lo
      // sapeva già (l'etichetta del nodo non va in basso dove c'è il simbolo); ora lo sanno anche
      // i picchi. Il box arriva sotto i tratti di terra dell'incastro, che sono la parte più bassa.
      ostacoli.push({ x0: p.x - w, y0: p.y, x1: p.x + w, y1: p.y + b + 4 * s });
      const attr = { stroke: INCHIOSTRO, "stroke-width": 1.5 * s, class: classe,
                     ...(tratteggio ? { "stroke-dasharray": `${3 * s} ${3 * s}` } : {}) };
      gruppo.append(el("line", { x1: p.x - w, y1: p.y + b, x2: p.x + w, y2: p.y + b, ...attr }));
      gruppo.append(el("line", { x1: p.x - w, y1: p.y + b, x2: p.x, y2: p.y, ...attr }));
      gruppo.append(el("line", { x1: p.x + w, y1: p.y + b, x2: p.x, y2: p.y, ...attr }));
      // I tratti di «terra» sono dell'incastro soltanto: è quel che lo distingue a colpo
      // d'occhio da una cerniera, che lascia libere le rotazioni.
      if (incastro) for (const k of [-1, 0, 1]) {
        gruppo.append(el("line", { x1: p.x + k * w * 0.6, y1: p.y + b,
                                   x2: p.x + k * w * 0.6 - 3 * s, y2: p.y + b + 4 * s, ...attr }));
      }
    };
    for (const n of m.nodi) {
      if (dichiarati.has(n.id)) simbolo(n, nomePreimpostazione(n.vincolo) === "incastro", "vincolo", false);
    }
    for (const p of proposte ?? []) {  // `null` non prende il default del parametro: si copre qui
      const n = nodo(m, p.nodo);  // una proposta su un nodo sparito è una proposta che non si disegna
      if (n && !dichiarati.has(n.id)) simbolo(n, nomePreimpostazione(p.vincolo) === "incastro", "vincolo-proposto", true);
    }

    // I carichi dell'azione in vista, in px costanti: una freccia non è una misura del modello
    // e non entra in `estensione` — il riquadro non si muove quando si aggiunge un carico.
    // Le frecce stanno sopra i nodi perché la punta del nodale finisce sul nodo e un cerchio
    // pieno la coprirebbe; il ghost resta sotto: è un'anteprima, e ci sta un attimo.
    if (azioneInVista) {
      const L = 28 * s;
      for (const f of frecceDeiCarichi(m, azioneInVista, L)) {
        const pa = schermo(f.a), pd = schermo(f.da);
        gruppo.append(el("line", { x1: pd.x, y1: pd.y, x2: pa.x, y2: pa.y, stroke: INCHIOSTRO,
                                   "stroke-width": 1.5 * s, class: "carico" }));
        const ang = Math.atan2(pa.y - pd.y, pa.x - pd.x);
        for (const d of [-1, 1]) {
          const a2 = ang + Math.PI + d * Math.PI / 6;
          gruppo.append(el("line", { x1: pa.x, y1: pa.y, x2: pa.x + Math.cos(a2) * 6 * s, y2: pa.y + Math.sin(a2) * 6 * s,
                                     stroke: INCHIOSTRO, "stroke-width": 1.5 * s, class: "carico-punta" }));
        }
        if (f.testo) {
          // `ancora`, se c'è, sta sopra la coda più alta dell'asta (`carichi.js`): due carichi
          // sulla stessa trave non si scrivono addosso e nessun fusto passa nel testo. Il punto
          // però non basta: sul telaio 2×1 a 1280 px «Fx 20 000 N» finiva addosso all'etichetta
          // del nodo 4 e al picco. Il testo passa da `disponi` insieme ai picchi, che di
          // priorità ne hanno di più — sono il soggetto della vista, il carico è il contorno.
          const pt = f.ancora ? schermo(f.ancora) : pd;
          richiesteEtichette.push({ id: `c${richiesteEtichette.length}`, x: pt.x, y: pt.y, testo: f.testo,
                                    priorita: 0.5, carico: true });
        }
      }
    }

    // Le etichette, tutte in una chiamata sola: picchi e carichi si contendono lo stesso spazio,
    // e due `disponi` separate non lo saprebbero. Ostacoli: i cerchi e le etichette dei nodi (che
    // non si spostano), le due strisce di testo, e il ritaglio del viewport come `limiti` — oltre
    // il bordo un'etichetta non è `nascosta`, è posata e invisibile, e tiene occupato un posto.
    // Una nascosta è meglio di due testi addosso: il valore resta nell'ispettore e nella striscia.
    if (richiesteEtichette.length) {
      // L'equilibrio al nodo: la trave e il pilastro che si incontrano in un angolo hanno lo
      // stesso momento all'estremo comune, e ognuno lo scriveva per conto suo — «0,2056 kN·m»
      // due volte a «sommità dx», visto su MURO 1. Stesso testo entro un pixel = una richiesta
      // sola, con la priorità più alta delle due.
      // ponytail: confronto a coppie, non una griglia arrotondata: i due punti staccano di mezzo
      // pixel e cadono spesso in celle vicine ma diverse, e la griglia se li perde. Le richieste
      // sono una manciata (un picco o due per asta), quindi O(n²) qui non si sente.
      const uniche = [];
      for (const r of richiesteEtichette) {
        const gemella = uniche.find((u) => u.testo === r.testo && Math.hypot(u.x - r.x, u.y - r.y) <= s);
        if (gemella) gemella.priorita = Math.max(gemella.priorita, r.priorita);
        else uniche.push(r);
      }
      // Un pixel di margine per lato, e la riga intera (corpo + 3) invece del solo occhio: la
      // larghezza per carattere è una stima del mono, e uno spazio fine unificatore
      // (`millimetri`, «20 000») non misura come una cifra. Misurato sul telaio 2×1 a 1920 px:
      // senza il margine «6,98 kN·m» e «Fx 20 000 N» si toccavano per pochi pixel. Picchi e freccia
      // al corpo delle etichette dei nodi (R9): a 11 px accanto a nomi da 46 non si leggono da 8 m.
      const richieste = uniche.map((r) => ({ ...r, larghezza: larghezzaMono(r.testo, s, 2, misure.carattere),
                                             altezza: (misure.carattere + 3) * s }));
      const poste = disponi(richieste, ostacoli, { passo: 6 * s, limiti: viewport });
      for (let k = 0; k < poste.length; k++) {   // `disponi` rende un elemento per richiesta, in ordine
        const e = poste[k];
        if (e.nascosta) continue;
        const carico = uniche[k].carico;
        const dove = carico ? gruppo : stratoRisultati;
        const colore = !carico && attivo.stantia ? ROSSO : INCHIOSTRO;
        if (e.guida) dove.append(el("line", { class: "guida", x1: e.guida.x1, y1: e.guida.y1, x2: e.guida.x2, y2: e.guida.y2, stroke: colore, "stroke-width": 0.75 * s }));
        const t = el("text", { class: carico ? "carico-testo" : "picco", x: e.x, y: e.y, "font-size": misure.carattere * s,
                               fill: colore, "font-family": MONO, "text-anchor": e.ancora, "dominant-baseline": "middle" });
        t.textContent = e.testo;
        dove.append(t);
      }
    }

    svg.replaceChildren(gruppo);
  }

  return { disegna };  // `inquadra` se la chiama `disegna` da sé: fuori non serve a nessuno
}
