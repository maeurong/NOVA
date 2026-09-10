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
import { puntiDeformata, diagramma, scalaDiagrammaAuto, picchi, testoValore, testoBadge, spostamentoMassimo } from "./risultati.js";
import { disponi, sottoSoglia } from "./etichette.js";

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
  contenitore.replaceChildren(svg, titolo, badge);
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
  function disegna(m, { selezione = null, ghost = null, azioneInVista = null, proposte = [], risultati = null } = {}) {
    inquadra(m, ghost);
    const s = millimetriPerPixel();
    const gruppo = el("g");
    // `vistaRis` e non `vista`: `vista` qui sopra è il **riquadro**, e serve al badge più giù.
    const vistaRis = risultati?.vista ?? null;
    const attivo = vistaRis ? risultati : null;
    let stratoRisultati = null;

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
        // Con la deformata l'indeformata resta come ombra: si vede di quanto si è mosso, non
        // solo dove sta adesso. L'asta selezionata no — quella è l'unica cosa piena e rossa.
        ...(attivo && vistaRis === "deformata" && !scelta ? { "stroke-opacity": 0.3 } : {}),
      }));
    }

    // Lo strato dei risultati fra le aste e i nodi: i nodi restano sopra e cliccabili. Un solo
    // colore, inchiostro; rosso quando la corsa è stantia — il rosso dice attenzione (story 63).
    const richiesteEtichette = [];   // i picchi (o il massimo spostamento): li posa `disponi` dopo i nodi
    if (attivo) {
      const colore = attivo.stantia ? ROSSO : INCHIOSTRO;
      // `pointer-events: none`: il poligono ha un `fill` e passa sopra l'asta, quindi senza questo
      // il clic sull'asta finisce sullo strato, che non porta `[data-tipo]`, e scivola a `suSfondo()`.
      stratoRisultati = el("g", { class: "risultati", "pointer-events": "none" });
      const coppia = (p) => `${p.x},${p.y}`;
      if (vistaRis === "deformata") {
        for (const d of puntiDeformata(m, attivo.perCaso, attivo.scala)) {
          stratoRisultati.append(el("polyline", {
            class: "deformata", points: d.punti.map((p) => coppia(schermo(p))).join(" "),
            fill: "none", stroke: colore, "stroke-width": 2 * s,
            "stroke-dasharray": `${6 * s} ${4 * s}`, "stroke-linejoin": "round" }));
        }
        const dmax = spostamentoMassimo(m, attivo.perCaso);
        if (dmax > 0) {
          // La stessa validazione di `spostamentoDi` (`risultati.js`): un `u` corto o con un `NaN`
          // non deve arrivare a `schermo` come coordinata.
          const buono = (u) => Array.isArray(u) && u.length >= 6 && u.every(Number.isFinite);
          const n = m.nodi.find((k) => { const u = attivo.perCaso.spostamenti?.[String(k.id)]; return buono(u) && Math.hypot(u[0], u[2]) === dmax; });
          if (n) {
            const u = attivo.perCaso.spostamenti[String(n.id)];
            const p = schermo({ x: n.x + attivo.scala * u[0], z: n.z + attivo.scala * u[2] });
            richiesteEtichette.push({ id: `u${n.id}`, x: p.x, y: p.y, testo: testoValore("deformata", dmax), priorita: 1 });
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
          stratoRisultati.append(el("polygon", {
            class: "diagramma", points: [pi, ...punti, pj].map(coppia).join(" "),
            fill: colore, "fill-opacity": 0.08, stroke: colore, "stroke-width": 1.5 * s,
            "stroke-dasharray": `${5 * s} ${3 * s}` }));
          // Le ordinate per stazione: si vede dove il solutore ha misurato (story 38). `x_rel`
          // guasto sta sul nodo i, come in `diagramma`, invece di scrivere `x1="NaN"`.
          for (const p of d.punti) {
            const r = Number.isFinite(p.x_rel) ? p.x_rel : 0;
            const b = schermo({ x: d.base[0].x + (d.base[1].x - d.base[0].x) * r, z: d.base[0].z + (d.base[1].z - d.base[0].z) * r });
            const q = schermo(p);
            stratoRisultati.append(el("line", { class: "stazione", x1: b.x, y1: b.y, x2: q.x, y2: q.y, stroke: colore, "stroke-width": 0.75 * s }));
          }
          // `d.chiave`, non una costante: sui pilastri è `Mz`/`Vy` (R1).
          for (const picco of picchi(attivo.perCaso?.sollecitazioni?.[String(d.id)], d.chiave)) {
            if (sottoSoglia(picco.valore, massimo)) continue;
            const p = d.punti.find((q) => q.x_rel === picco.x_rel);
            if (!p) continue;
            const q = schermo(p);
            richiesteEtichette.push({ id: `${d.id}@${picco.x_rel}`, x: q.x, y: q.y, testo: testoValore(vistaRis, picco.valore),
                                      priorita: Math.abs(picco.valore) / massimo });
          }
        }
      }
      gruppo.append(stratoRisultati);
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

    // I nodi che porteranno un simbolo di vincolo (dichiarato, o proposto e non dichiarato):
    // l'etichetta del nodo non va in basso, dove il simbolo sta. Visto sul caso studio: il
    // «piede sx» finiva sulla base del triangolo.
    const dichiarati = new Set(m.nodi.filter((n) => n.vincolo && GRADI.some((g) => n.vincolo[g])).map((n) => n.id));
    const conSimbolo = new Set(dichiarati);
    for (const p of proposte ?? []) if (nodo(m, p.nodo)) conSimbolo.add(p.nodo);  // pieno o ghost, il basso è preso
    const etichettate = new Set();
    // Gli ostacoli per le etichette dei risultati: i cerchi e le etichette dei nodi non si
    // spostano (le posa `versoLibero`), quindi sono loro il terreno e i picchi ci girano attorno.
    const ostacoli = [];
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
      ostacoli.push({ x0: p.x - RAGGIO * s, y0: p.y - RAGGIO * s, x1: p.x + RAGGIO * s, y1: p.y + RAGGIO * s });
      // Un'etichetta per posizione: due nodi coincidenti (da un file, non dai comandi)
      // scriverebbero due volte nello stesso punto, e il risultato è illeggibile.
      const posto = `${Math.round(n.x)}|${Math.round(n.z)}`;
      if (!etichettate.has(posto)) {
        etichettate.add(posto);
        const v = versoLibero(m, n, conSimbolo.has(n.id) ? [{ x: 0, z: -1 }] : []);
        const testo = el("text", {
          x: p.x + OFFSET_ETICHETTA * s * v.x, y: p.y - OFFSET_ETICHETTA * s * v.z, "font-size": 11 * s,
          fill: INCHIOSTRO, "font-family": MONO,
          "text-anchor": v.x < -0.3 ? "end" : v.x > 0.3 ? "start" : "middle",
        });
        testo.textContent = n.nome ?? String(n.id);
        // Il box dell'etichetta del nodo: `y` è la linea di base (niente `dominant-baseline`
        // qui), quindi il testo sta **sopra** di essa.
        const larghezza = testo.textContent.length * 6.6 * s, altezza = 11 * s;
        const x = p.x + OFFSET_ETICHETTA * s * v.x, y = p.y - OFFSET_ETICHETTA * s * v.z;
        const x0 = v.x < -0.3 ? x - larghezza : v.x > 0.3 ? x : x - larghezza / 2;
        ostacoli.push({ x0, y0: y - altezza, x1: x0 + larghezza, y1: y });
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
    badge.textContent = attivo ? testoBadge(attivo) : "";
    badge.hidden = !attivo;
    badge.className = attivo?.stantia ? "risultati-badge stantia" : "risultati-badge";

    // Le due strisce di testo stanno **fuori** dal `viewBox` ma sopra il piano: senza questi
    // ostacoli un picco negli angoli in alto finisce sotto il loro testo (R6). Il riquadro
    // `viewBox` non è il ritaglio: con `preserveAspectRatio="xMidYMid meet"` a ritagliare è il
    // **viewport**, che contiene il riquadro e coincide con lui sul lato stretto. In coordinate
    // del `viewBox` è il centro più mezza misura in pixel per `s`.
    const larghezzaPx = contenitore.clientWidth || 1, altezzaPx = contenitore.clientHeight || 1;
    const cx = vista.x0 + vista.larghezza / 2, cy = vista.z0 + vista.altezza / 2;   // `vista` = il riquadro
    const viewport = { x0: cx - larghezzaPx * s / 2, y0: cy - altezzaPx * s / 2,
                       x1: cx + larghezzaPx * s / 2, y1: cy + altezzaPx * s / 2 };
    // I numeri vengono da `stile.css`, `.carichi-titolo` e `.risultati-badge`: `top: 6px` più una
    // riga di 14 fanno 20 di altezza; `left`/`right: 8px` più ~6,6 px per carattere del mono a
    // 11px fanno la larghezza, fino al `max-width: 45%` che il CSS impone. Se là cambiano, qui
    // le etichette iniziano a passare sotto il testo senza che nessun test se ne accorga.
    const striscia = (testo) => Math.min((testo.length * 6.6 + 8) * s, 0.45 * larghezzaPx * s);
    const alta = { y0: viewport.y0, y1: viewport.y0 + 20 * s };
    if (!badge.hidden) ostacoli.push({ x0: viewport.x1 - striscia(badge.textContent), x1: viewport.x1, ...alta });
    if (!titolo.hidden) ostacoli.push({ x0: viewport.x0, x1: viewport.x0 + striscia(titolo.textContent), ...alta });

    // I vincoli: il triangolo del disegno tecnico sotto il nodo, pieno se dichiarato,
    // tratteggiato se è una proposta del rilievo — un ghost, non un errore, quindi inchiostro
    // e non rosso. Px costanti come le frecce: non entrano in `estensione`.
    const simbolo = (n, incastro, classe, tratteggio) => {
      const p = schermo(n);
      const b = RAGGIO * 2 * s, w = RAGGIO * 3 * s;
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

    // Le etichette dei picchi: dopo i nodi, perché i loro cerchi e le loro etichette sono gli
    // ostacoli. Una nascosta è meglio di due testi addosso — il valore resta nell'ispettore e
    // nella striscia, e qui si perde solo la comodità di leggerlo sul disegno.
    if (stratoRisultati && richiesteEtichette.length) {
      const colore = attivo.stantia ? ROSSO : INCHIOSTRO;
      const richieste = richiesteEtichette.map((r) => ({ ...r, larghezza: r.testo.length * 6.6 * s, altezza: 12 * s }));
      // `limiti`: il viewport è ciò che ritaglia l'SVG. Un'etichetta spinta oltre non è `nascosta`
      // — è posata e invisibile, e tiene occupato un posto contro le altre.
      for (const e of disponi(richieste, ostacoli, { passo: 6 * s, limiti: viewport })) {
        if (e.nascosta) continue;
        if (e.guida) stratoRisultati.append(el("line", { class: "guida", x1: e.guida.x1, y1: e.guida.y1, x2: e.guida.x2, y2: e.guida.y2, stroke: colore, "stroke-width": 0.75 * s }));
        const t = el("text", { class: "picco", x: e.x, y: e.y, "font-size": 11 * s, fill: colore, "font-family": MONO,
                               "text-anchor": e.ancora, "dominant-baseline": "middle" });
        t.textContent = e.testo;
        stratoRisultati.append(t);
      }
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
          // sulla stessa trave non si scrivono addosso e nessun fusto passa nel testo.
          const pt = f.ancora ? schermo(f.ancora) : pd;
          const t = el("text", { x: pt.x + 4 * s, y: pt.y - 4 * s, "font-size": 11 * s, fill: INCHIOSTRO, "font-family": MONO });
          t.textContent = f.testo; gruppo.append(t);
        }
      }
    }

    svg.replaceChildren(gruppo);
  }

  return { disegna };  // `inquadra` se la chiama `disegna` da sé: fuori non serve a nessuno
}
