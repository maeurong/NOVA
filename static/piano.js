// Il piano di lavoro: SVG, perché qui vivono i gesti e le etichette, e un'etichetta che
// non si sovrappone è più facile da garantire con il testo del documento che con una
// texture. Lo spazio three.js legge lo stesso modello e non tocca niente.
//
// Terna: `x` a destra, `z` in alto (l'alzado del telaio). In SVG `y` cresce verso il basso,
// quindi `z` si specchia una volta sola, qui dentro, e nessun altro modulo se ne accorge.

import { millimetri } from "./numeri.js";
import { nodo, asteDelNodo } from "./modello.js";
import { frecceDeiCarichi, testoCarico } from "./carichi.js";

const NS = "http://www.w3.org/2000/svg";
const MARGINE = 0.12;      // frazione dell'estensione, per non incollare il telaio ai bordi
const LATO_MINIMO = 2000;  // mm: un modello con un solo nodo ha estensione zero
const RAGGIO = 5;          // px del nodo, in coordinate schermo
// px, distanza dell'etichetta dal nodo: 9 bastava sulla diagonale (9√2≈12.7 di ipotenusa)
// ma non sul verso assiale puro (su/giù/dx/sx), dove l'offset è tutto su un asse solo e
// l'etichetta tocca il proprio cerchio — misurato, 6px di sovrapposizione reale.
const OFFSET_ETICHETTA = 16;

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

const el = (nome, attributi = {}) => {
  const e = document.createElementNS(NS, nome);
  for (const [k, v] of Object.entries(attributi)) e.setAttribute(k, v);
  return e;
};

/** L'estensione da inquadrare: i nodi **più il ghost**. Senza il ghost, il primo gesto su
 *  un modello con un nodo solo (riquadro 2000 mm) disegnerebbe un'estrusione da 3000 fuori
 *  dal riquadro, senza sollevare niente: si vedrebbe solo sparire. Vale identico per il
 *  punto in anteprima del campo di comando, che di coordinate fuori vista ne accetta
 *  quante ne vuole e senza questo le disegnerebbe dove non si guarda. */
export function estensione(m, ghost = null) {
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
  const mx = larghezza * MARGINE, mz = altezza * MARGINE;
  return { x0: x0 - mx, z0: z0 - mz, larghezza: larghezza + 2 * mx, altezza: altezza + 2 * mz };
}

/** Il verso in cui posare l'etichetta di un nodo: quello più lontano da tutte le sue aste.
 *  Un nodo isolato non ha vincoli e prende il primo, in alto a destra. */
export function versoLibero(m, n) {
  const direzioni = [];
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
  contenitore.replaceChildren(svg, titolo);
  let vista = estensione({ nodi: [] });

  svg.addEventListener("click", (ev) => {
    const bersaglio = ev.target.closest("[data-tipo]");
    if (bersaglio) suSelezione(bersaglio.dataset.tipo, Number(bersaglio.dataset.id));
    else suSfondo();
  });

  // `z` verso l'alto: si specchia qui, in un punto solo. Il fondo del riquadro è `z0`, la
  // cima è `z0 + altezza`, quindi `y = 2·z0 + altezza − z` porta l'uno sull'altro.
  const schermo = (n) => ({ x: n.x, y: 2 * vista.z0 + vista.altezza - n.z });

  function inquadra(m, ghost) {
    vista = estensione(m, ghost);
    svg.setAttribute("viewBox", `${vista.x0} ${vista.z0} ${vista.larghezza} ${vista.altezza}`);
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  }

  /** Millimetri per pixel. Con `preserveAspectRatio="… meet"` il riquadro ci sta **intero**,
   *  quindi comanda il lato più stretto: prendere la sola larghezza dà tratti ed etichette
   *  della misura sbagliata in un riquadro alto e magro, che è come nasce a 1280 px. */
  function millimetriPerPixel() {
    const w = Math.max(contenitore.clientWidth || 1, 1);
    const h = Math.max(contenitore.clientHeight || 1, 1);
    return Math.max(vista.larghezza / w, vista.altezza / h);
  }

  // `azioneInVista` e non `azione`: è l'oggetto azione, non un identificatore, e in tutto il
  // resto del programma un `azione` nudo è un id (`comando.azione`, `carico.azione`).
  function disegna(m, { selezione = null, ghost = null, azioneInVista = null } = {}) {
    inquadra(m, ghost);
    const s = millimetriPerPixel();
    const gruppo = el("g");

    for (const a of m.aste) {
      const i = nodo(m, a.nodo_i), j = nodo(m, a.nodo_j);
      if (!i || !j) continue;  // un'asta orfana non si disegna: la eliminerà il Check Model
      const pi = schermo(i), pj = schermo(j);
      const scelta = selezione?.tipo === "asta" && selezione.id === a.id;
      gruppo.append(el("line", {
        x1: pi.x, y1: pi.y, x2: pj.x, y2: pj.y,
        stroke: scelta ? ROSSO : INCHIOSTRO,
        "stroke-width": (scelta ? 3 : 2) * s,
        "stroke-linecap": "round", "data-tipo": "asta", "data-id": a.id,
      }));
    }

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
    for (const n of m.nodi) {
      const p = schermo(n);
      const scelto = selezione?.tipo === "nodo" && selezione.id === n.id;
      // Un `<g>` unico per cerchio ed etichetta: senza, un clic sull'etichetta non trova
      // `[data-tipo]` risalendo da un `<text>` nudo e scivola a `suSfondo()`.
      const nodoEl = el("g", { "data-tipo": "nodo", "data-id": n.id });
      nodoEl.append(el("circle", {
        cx: p.x, cy: p.y, r: (scelto ? RAGGIO * 1.6 : RAGGIO) * s,  // doppio canale: rosso e più grosso
        fill: scelto ? ROSSO : INCHIOSTRO,
      }));
      // Un'etichetta per posizione: due nodi coincidenti (da un file, non dai comandi)
      // scriverebbero due volte nello stesso punto, e il risultato è illeggibile.
      const posto = `${Math.round(n.x)}|${Math.round(n.z)}`;
      if (!etichettate.has(posto)) {
        etichettate.add(posto);
        const v = versoLibero(m, n);
        const testo = el("text", {
          x: p.x + OFFSET_ETICHETTA * s * v.x, y: p.y - OFFSET_ETICHETTA * s * v.z, "font-size": 11 * s,
          fill: INCHIOSTRO, "font-family": MONO,
          "text-anchor": v.x < -0.3 ? "end" : v.x > 0.3 ? "start" : "middle",
        });
        testo.textContent = n.nome ?? String(n.id);
        nodoEl.append(testo);
      }
      gruppo.append(nodoEl);
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
          const t = el("text", { x: pd.x + 4 * s, y: pd.y - 4 * s, "font-size": 11 * s, fill: INCHIOSTRO, "font-family": MONO });
          t.textContent = f.testo; gruppo.append(t);
        }
      }
    }

    // La gravità non ha una freccia — nessun punto d'applicazione nel piano — quindi o si
    // dice nel titolo o non si vede da nessuna parte. Senza azione il titolo non parla: vuoto
    // **e** nascosto, che una riga vuota alta 11px è comunque un buco nell'angolo.
    const g = azioneInVista && (azioneInVista.carichi ?? []).find((c) => c.tipo === "gravita");
    titolo.textContent = azioneInVista
      ? `carichi: ${azioneInVista.nome}${g ? ` · ${testoCarico(g).replace("gravità · ", "g ")}` : ""}`
      : "";
    titolo.hidden = !azioneInVista;

    svg.replaceChildren(gruppo);
  }

  return { disegna };  // `inquadra` se la chiama `disegna` da sé: fuori non serve a nessuno
}
