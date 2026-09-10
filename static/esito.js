// Il blocco «Risultati» del pannello destro e la striscia dell'M srotolato sotto il piano
// (giornata 13). Lo stato non vive qui: `app.js` lo tiene e lo passa a `disegna`; i controlli
// chiamano `suCambio` con i tre valori, e `app.js` ridisegna.

import { casiDi, testoEquilibrio, srotolato, testoValore, picchi, assiDi } from "./risultati.js";
import { leggiEspressione } from "./numeri.js";
import { nodo } from "./modello.js";

const NS = "http://www.w3.org/2000/svg";
const INCHIOSTRO = "#141414", ROSSO = "#b8321e", MONO = 'ui-monospace, "SF Mono", "Menlo", monospace';

export function creaEsito(radice, { suCambio, suAvviso = () => {} }) {
  const q = (sel) => radice.querySelector(sel);
  const vuotoEl = q("#risultati-vuoto"), controlliEl = q("#risultati-controlli");
  const casoEl = q("#risultati-caso"), scalaEl = q("#risultati-scala"), equilibrioEl = q("#risultati-equilibrio");
  const radio = () => [...radice.querySelectorAll('input[name="vista"]')];
  let stato = null;   // l'ultimo `risultati` disegnato: i controlli leggono da qui, non dal DOM
  let casiScritti = null;

  const cambio = () => {
    if (!stato) return;
    const vista = radio().find((r) => r.checked)?.value ?? "";
    // Una scala che non si legge, zero o negativa torna ad «auto». Ma tornare in silenzio è il
    // modo peggiore di dirlo: il campo si riscrive vuoto e chi ha scritto «−3» non sa se ha
    // sbagliato lui o se il programma ha deciso da sé. L'avviso lo dice, con un esempio.
    const grezzo = scalaEl.value.trim();
    const letta = grezzo === "" ? null : leggiEspressione(grezzo);
    const scalaMano = Number.isFinite(letta) && letta > 0 ? letta : null;
    if (grezzo !== "" && scalaMano === null) suAvviso("la scala è un numero positivo, per esempio 50 o 1/4 — torno ad auto");
    suCambio({ caso: casoEl.value, vista: vista === "" ? null : vista, scalaMano });
  };
  casoEl.addEventListener("change", cambio);
  scalaEl.addEventListener("change", cambio);
  for (const r of radio()) r.addEventListener("change", cambio);

  function disegna({ risultati, stantia = false }) {
    stato = risultati;
    vuotoEl.hidden = Boolean(risultati);
    controlliEl.hidden = !risultati;
    if (!risultati) { casiScritti = null; return; }
    const dati = risultati.lavoro.fin.risultati;
    const casi = casiDi(dati);
    // Le opzioni si riscrivono solo se i casi sono cambiati: ricostruirle a ogni ridisegno
    // staccherebbe dal DOM il select che l'utente sta usando (stessa regola di `pannello.js`).
    const chiave = casi.join("|");
    if (chiave !== casiScritti) {
      casoEl.replaceChildren(...casi.map((c) => { const o = document.createElement("option"); o.value = c; o.textContent = c; return o; }));
      casiScritti = chiave;
    }
    const caso = casi.includes(risultati.caso) ? risultati.caso : casi[0];
    casoEl.value = caso;
    for (const r of radio()) r.checked = r.value === (risultati.vista ?? "");
    if (document.activeElement !== scalaEl) scalaEl.value = risultati.scalaMano === null ? "" : String(risultati.scalaMano).replace(".", ",");
    // Σ reazioni contro Σ carichi è il numero che contraddice, e di una corsa superata dal modello
    // parla del modello di prima: dirlo in nero sarebbe farlo passare per attuale. Doppio canale
    // come `#corsa-ultima`: il filetto rosso **e** la parola (story 63, WCAG 1.4.1).
    // La classe si aggiunge, non si riscrive: `numero` (il mono dell'HTML) deve restare.
    equilibrioEl.className = stantia ? "numero stantia" : "numero";
    equilibrioEl.textContent = `${stantia ? "stantia · " : ""}${testoEquilibrio(dati, caso)}`;
    // Il select è stato corretto sul primo caso: lo stato deve seguirlo, o il blocco mostra
    // `Z1` mentre il piano disegna il caso che non c'è (cioè niente). In coda a questo giro e
    // non qui dentro: `suCambio` richiama `ridisegna`, che sta ancora girando — la seconda
    // passata finirebbe sotto la prima, che riprenderebbe con la vista vecchia in mano.
    if (caso !== risultati.caso) queueMicrotask(() => suCambio({ caso, vista: risultati.vista, scalaMano: risultati.scalaMano }));
  }
  return { disegna };
}

/** La striscia dell'M srotolato: l'asta selezionata, tutte le stazioni, i picchi scritti. */
export function creaSrotolato(contenitore) {
  const el = (nome, attributi = {}) => { const e = document.createElementNS(NS, nome); for (const [k, v] of Object.entries(attributi)) e.setAttribute(k, v); return e; };
  const titolo = () => { const p = document.createElement("p"); p.className = "titolo"; return p; };

  function disegna({ risultati, modello, selezione }) {
    contenitore.hidden = !risultati;
    if (!risultati) { contenitore.replaceChildren(); return; }
    const p = titolo();
    if (risultati.stantia) p.className = "titolo stantia";
    const id = selezione?.tipo === "asta" ? selezione.id : null;
    const asta = id !== null ? (modello?.aste ?? []).find((a) => a.id === id) : null;
    if (!asta) { p.textContent = "Seleziona un'asta per il suo M srotolato."; contenitore.replaceChildren(p); return; }
    const stazioni = risultati.perCaso?.sollecitazioni?.[String(asta.id)];
    // La chiave la decide la giacitura dell'asta, non una costante: su un pilastro è `Mz` (R1).
    const assi = assiDi(nodo(modello, asta.nodo_i) ?? {}, nodo(modello, asta.nodo_j) ?? {});
    p.textContent = `${risultati.stantia ? "stantia · " : ""}M dell'asta ${asta.id} · ${risultati.caso} · kN·m`;
    // Un'asta i cui nodi non ci sono più, o lunga zero, non ha assi: senza assi non c'è chiave, e
    // niente striscia. Niente `?? "My"`: su un pilastro sarebbe la chiave sbagliata, non un ripiego
    // — si leggerebbe una riga piatta al posto della flessione vera.
    if (!assi) { p.textContent += " · nessuna stazione per quest'asta"; contenitore.replaceChildren(p); return; }
    const chiave = assi.M;
    const { punti, massimo } = srotolato(stazioni, chiave);
    if (punti.length === 0) { p.textContent += " · nessuna stazione per quest'asta"; contenitore.replaceChildren(p); return; }
    const colore = risultati.stantia ? ROSSO : INCHIOSTRO;
    // Niente `viewBox`: si disegna **in pixel**, misurando il contenitore come fa `piano.js`
    // (`millimetriPerPixel`). Un `viewBox` con `preserveAspectRatio="none"` stira
    // il disegno a tutta larghezza e con lui i glifi e i cerchi delle stazioni — a 1280 px la
    // colonna del piano è larga ~400 px contro i 1000 del `viewBox`, cioè testo schiacciato di
    // 2,4 a 1 (R7). ponytail: la striscia si rimisura al prossimo `ridisegna` — che dalla 13
    // arriva anche dal `resize` (`app.js`), quindi la larghezza segue la finestra.
    //
    // `clientWidth || 200` e **mai** un massimo con 200: la larghezza misurata non si supera
    // mai, o l'SVG sfora il contenuto e (con `min-width: auto` sulla traccia) la allarga, e il
    // giro dopo si misura più larga — +16 px a ogni ridisegno, senza tetto. I 200 valgono per
    // il solo contenitore non ancora impaginato, dove `clientWidth` è 0.
    const W = contenitore.clientWidth || 200, H = 96, M = 14;
    const svg = el("svg", { width: W, height: H, "aria-label": `M srotolato dell'asta ${asta.id}` });
    const y0 = H / 2;
    const y = (v) => (massimo > 0 ? y0 + (v / massimo) * (H / 2 - M) : y0);   // M positivo verso il basso: il lato teso
    const x = (r) => r * W;
    svg.append(el("line", { x1: 0, y1: y0, x2: W, y2: y0, stroke: colore, "stroke-width": 1 }));
    svg.append(el("polygon", { points: [`0,${y0}`, ...punti.map((q) => `${x(q.x_rel)},${y(q.valore)}`), `${W},${y0}`].join(" "),
                               fill: colore, "fill-opacity": 0.08, stroke: colore, "stroke-width": 1.5, "stroke-dasharray": "5 3" }));
    for (const q of punti) svg.append(el("circle", { cx: x(q.x_rel), cy: y(q.valore), r: 2.5, fill: colore }));
    // Niente `disponi`: i picchi sono al massimo due e `picchi` rende il secondo **solo** se ha
    // segno opposto al primo (`risultati.js`), quindi uno sta sopra la linea e l'altro sotto e
    // non possono sovrapporsi. Un posatore qui sarebbe codice che non risolve niente.
    for (const picco of picchi(stazioni, chiave)) {
      const sopra = picco.valore > 0;   // il testo dalla parte opposta al diagramma, che qui è sotto per M > 0
      const t = el("text", { x: x(picco.x_rel), y: sopra ? y0 - 4 : y0 + 12, "font-size": 11, fill: colore, "font-family": MONO,
                             "text-anchor": picco.x_rel < 0.1 ? "start" : picco.x_rel > 0.9 ? "end" : "middle" });
      t.textContent = testoValore("M", picco.valore);
      svg.append(t);
    }
    contenitore.replaceChildren(p, svg);
  }
  return { disegna };
}
