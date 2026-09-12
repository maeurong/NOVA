// Il blocco «Risultati» del pannello destro e la striscia dell'M srotolato sotto il piano
// (giornata 13). Lo stato non vive qui: `app.js` lo tiene e lo passa a `disegna`; i controlli
// chiamano `suCambio` con i tre valori, e `app.js` ridisegna.

import { vociDelCaso, testoEquilibrio, srotolato, testoValore, picchi, assiDi } from "./risultati.js";
import { conciso, leggiEspressione } from "./numeri.js";
import { misureDi, MISURE_BASE } from "./misure.js";
import { nodo } from "./modello.js";

const NS = "http://www.w3.org/2000/svg";
const INCHIOSTRO = "#141414", ROSSO = "#b8321e", MONO = 'ui-monospace, "SF Mono", "Menlo", monospace';

// R12: il MURO 1 dà 4 casi e 42 modi, e una lista piatta di 46 voci non si scorre — il gruppo
// nativo del `<select>` è la cosa che il browser già sa fare, anche con lo screen reader
// («casi, voce 1 di 4»). Un gruppo vuoto non si scrive: due intestazioni senza niente sotto
// sarebbero rumore in un modello senza modi e senza pushover.
const ETICHETTE_GRUPPO = { caso: "casi", pushover: "pushover", modo: "modi" };

function gruppiDelMenu(voci) {
  const gruppi = [];
  for (const [tipo, etichetta] of Object.entries(ETICHETTE_GRUPPO)) {
    const dentro = voci.filter((v) => v.tipo === tipo);
    if (!dentro.length) continue;
    const g = document.createElement("optgroup");
    g.setAttribute("label", etichetta);
    g.replaceChildren(...dentro.map((v) => {
      const o = document.createElement("option");
      o.value = v.valore; o.textContent = v.testo; return o;
    }));
    gruppi.push(g);
  }
  return gruppi;
}

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
    const voci = vociDelCaso(risultati);
    const valori = voci.map((v) => v.valore);
    // Le opzioni si riscrivono solo se i casi sono cambiati: ricostruirle a ogni ridisegno
    // staccherebbe dal DOM il select che l'utente sta usando (stessa regola di `pannello.js`).
    // La chiave porta **anche i testi**: una seconda corsa sullo stesso modello ha gli stessi
    // valori — `modo:1…42`, `pushover` — e testi tutti diversi (le frequenze sono altre, i passi
    // sono meno). Sui soli valori il menu restava quello di prima, con i numeri della corsa morta.
    // Il separatore è scritto come **escape** e non come byte vero: `c3307c9` ce l'aveva messo
    // in chiaro, e un NUL nel sorgente fa dichiarare binario il file a git — il diff di questo
    // file usciva «Bin 16078 -> 17086 bytes», cioè irrevisionabile. A tempo d'uso è la stessa
    // stringa, e il NUL resta la scelta giusta: non può comparire in un valore né in un testo.
    const chiave = voci.map((v) => `${v.valore}\u0000${v.testo}`).join("|");
    if (chiave !== casiScritti) {
      casoEl.replaceChildren(...gruppiDelMenu(voci));
      casiScritti = chiave;
    }
    const caso = valori.includes(risultati.caso) ? risultati.caso : valori[0];
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

// La striscia segue la vista del piano: guardare V nel piano e M nella striscia è leggere due
// grandezze diverse per lo stesso gesto. Con la deformata, o senza vista, resta M — che è il
// diagramma della flessione, quello che si legge accanto a una deformata.
const VISTA_STRISCIA = { V: "V", N: "N" };
const UNITA_STRISCIA = { M: "kN·m", V: "kN", N: "kN" };

/** La striscia della sollecitazione srotolata: l'asta selezionata, tutte le stazioni, i picchi.
 *  Con la pushover scelta la striscia cambia mestiere: lì la curva taglio–spostamento è *il*
 *  diagramma da leggere, e un M srotolato del passo corrente non direbbe dove sta la struttura
 *  lungo la corsa. `suPasso(k)` è il clic su un punto della curva. */
export function creaSrotolato(contenitore, { suPasso = null } = {}) {
  const el = (nome, attributi = {}) => { const e = document.createElementNS(NS, nome); for (const [k, v] of Object.entries(attributi)) e.setAttribute(k, v); return e; };
  const titolo = () => { const p = document.createElement("p"); p.className = "titolo"; return p; };
  // Le misure dell'aula dalle variabili CSS, come fanno `piano.js` e `spazio.js` — l'altezza della
  // striscia (`--srotolato-alto`) e il corpo dei testi (`--etichetta`), lette una volta per cambio
  // di layout (15b, Task 6) e non a ogni disegno: la stessa cache di `misureDi`, o questa finestra
  // potrebbe mostrare due misure diverse — la striscia fresca, piano e spazio in cache.
  const misure = () => misureDi(contenitore);
  // Gli scostamenti dei testi sono scritti per un corpo di 11: a un corpo diverso valgono
  // `n · carattere / 11`, o in aula il numero resterebbe posato dove stava a 11 px.
  const scalato = (n, carattere) => (n * carattere) / 11;

  function disegna({ risultati, modello, selezione }) {
    contenitore.hidden = !risultati;
    if (!risultati) { contenitore.replaceChildren(); return; }
    const p = titolo();
    if (risultati.stantia) p.className = "titolo stantia";
    const prefisso = risultati.stantia ? "stantia · " : "";
    // Il nome accessibile del riquadro segue quel che ci finisce dentro: fisso nell'HTML
    // prometteva «M srotolato dell'asta selezionata» anche con la curva della pushover — a voce
    // la striscia annunciava una cosa e ne conteneva un'altra.
    const aVoce = (t) => contenitore.setAttribute("aria-label", t);
    // Il `tipo` che non si conosce — o che non c'è, come in tutti i chiamanti di prima della
    // 14a — ricade sulla striscia di sempre: un ramo che solleva su un `tipo` nuovo spegnerebbe
    // anche l'M srotolato, che con quel tipo non c'entra niente.
    if (risultati.tipo === "pushover") { aVoce("curva taglio–spostamento della pushover"); disegnaCurva(p, prefisso, risultati); return; }
    if (risultati.tipo === "modo") {
      const n = risultati.modo?.n ?? String(risultati.caso ?? "").split(":")[1];
      aVoce(`modo ${n}`);
      p.textContent = `${prefisso}modo ${n}: nessuna sollecitazione da srotolare`;
      contenitore.replaceChildren(p);
      return;
    }
    const id = selezione?.tipo === "asta" ? selezione.id : null;
    const asta = id !== null ? (modello?.aste ?? []).find((a) => a.id === id) : null;
    const vista = VISTA_STRISCIA[risultati.vista] ?? "M";
    aVoce(`${vista} srotolato dell'asta selezionata`);
    if (!asta) { p.textContent = `Seleziona un'asta per il suo ${vista} srotolato.`; contenitore.replaceChildren(p); return; }
    const stazioni = risultati.perCaso?.sollecitazioni?.[String(asta.id)];
    // La chiave la decide la giacitura dell'asta, non una costante: su un pilastro è `Mz` (R1).
    const assi = assiDi(nodo(modello, asta.nodo_i) ?? {}, nodo(modello, asta.nodo_j) ?? {});
    p.textContent = `${prefisso}${vista} dell'asta ${asta.id} · ${risultati.caso} · ${UNITA_STRISCIA[vista]}`;
    // Un'asta i cui nodi non ci sono più, o lunga zero, non ha assi: senza assi non c'è chiave, e
    // niente striscia. Niente `?? "My"`: su un pilastro sarebbe la chiave sbagliata, non un ripiego
    // — si leggerebbe una riga piatta al posto della flessione vera.
    if (!assi) { p.textContent += " · nessuna stazione per quest'asta"; contenitore.replaceChildren(p); return; }
    const chiave = assi[vista];
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
    //
    // `H` viene da `--srotolato-alto` (96 alla scrivania, 160 in aula): sotto i 119 px il numero
    // del picco di sopra **esce** dall'SVG, che a 46 px di corpo ha 43 px d'ascesa sopra la linea
    // di base (misurati in Chrome il 13/09) e sta a `y0 − 4·c/11`. `M` invece **non** scala: è il
    // solo margine del diagramma, i testi non ci passano (stanno dall'altra parte della linea), e
    // scalarlo schiaccerebbe l'ampiezza proprio in aula — a `H = 160` resterebbero 21 px contro i
    // 66 che dà il 14 di sempre. Sulla curva è l'opposto, e infatti là scala: vedi `disegnaCurva`.
    const { carattere, srotolatoAlto } = misure();
    const W = contenitore.clientWidth || 200, H = srotolatoAlto, M = 14;
    const svg = el("svg", { width: W, height: H, "aria-label": `${vista} srotolato dell'asta ${asta.id}` });
    const y0 = H / 2;
    // M positivo in giù (il lato teso), V e N positivi in su — a sinistra di i→j, come nel piano
    // da quando il lato è uno solo (`diagramma`). Senza il segno la stessa asta usciva specchiata
    // fra i due pannelli: nel piano il taglio positivo sopra la trave, qui sotto la linea.
    const segno = vista === "M" ? 1 : -1;
    const y = (v) => (massimo > 0 ? y0 + segno * (v / massimo) * (H / 2 - M) : y0);
    const x = (r) => r * W;
    svg.append(el("line", { x1: 0, y1: y0, x2: W, y2: y0, stroke: colore, "stroke-width": 1 }));
    svg.append(el("polygon", { points: [`0,${y0}`, ...punti.map((q) => `${x(q.x_rel)},${y(q.valore)}`), `${W},${y0}`].join(" "),
                               fill: colore, "fill-opacity": 0.08, stroke: colore, "stroke-width": 1.5, "stroke-dasharray": "5 3" }));
    for (const q of punti) svg.append(el("circle", { cx: x(q.x_rel), cy: y(q.valore), r: 2.5, fill: colore }));
    // Niente `disponi`: i picchi sono al massimo due e `picchi` rende il secondo **solo** se ha
    // segno opposto al primo (`risultati.js`), quindi uno sta sopra la linea e l'altro sotto e
    // non possono sovrapporsi. Un posatore qui sarebbe codice che non risolve niente.
    for (const picco of picchi(stazioni, chiave)) {
      const sopra = segno * picco.valore > 0;   // il testo dalla parte opposta al diagramma
      const t = el("text", { x: x(picco.x_rel), y: sopra ? y0 - scalato(4, carattere) : y0 + scalato(12, carattere),
                             "font-size": carattere, fill: colore, "font-family": MONO,
                             "text-anchor": picco.x_rel < 0.1 ? "start" : picco.x_rel > 0.9 ? "end" : "middle" });
      t.textContent = testoValore(vista, picco.valore);
      svg.append(t);
    }
    contenitore.replaceChildren(p, svg);
  }

  /** La curva taglio–spostamento: un cerchio per passo, il corrente rosso e più grande, la
   *  caduta segnata con una croce. In pixel come il resto della striscia (R7 della 13): un
   *  `viewBox` stirato a tutta larghezza schiaccerebbe i glifi di 2,4 a 1. */
  function disegnaCurva(p, prefisso, risultati) {
    p.textContent = `${prefisso}pushover · taglio alla base – spostamento del nodo di controllo · kN, mm`;
    const { punti = [], uMax = 0, vMax = 0, caduta = null } = risultati.curva ?? {};
    const colore = risultati.stantia ? ROSSO : INCHIOSTRO;
    // 28 px a sinistra per il numero del taglio, 14 sopra e sotto: sotto ci va lo spostamento.
    // Qui il margine **scala**, al contrario dello srotolato: sotto l'asse ci va un numero, posato
    // a `H − M + 10·c/11`, che a 46 px di corpo scende di altri 11 px sotto la linea di base
    // (discesa misurata in Chrome il 13/09). Con `M = 14` fisso uscirebbe dall'SVG; `14·c/11` vale
    // 58,5 a 46, sopra i 52,5 che il contenimento chiede. `ML` scala per la stessa ragione: a
    // sinistra dell'asse ci sta lo zero, che a 46 px è largo 28 px.
    //
    // E l'altezza è **sua**, `--curva-alta`, non quella dello srotolato: i due riquadri hanno
    // mestieri diversi. Lo srotolato è un diagramma di servizio e a 160 px sta comodo; la curva in
    // pushover è *il* diagramma che si legge, e i suoi numeri stanno **dentro** l'area utile, che
    // vale `H − 2M`. A 160 l'area utile è 43 px, più bassa dei 46 px del testo che ci va: il taglio
    // massimo finiva addosso ai valori del passo. Nessuna collocazione diversa lo risolve — il
    // riquadro è più corto di una riga — quindi la leva è l'altezza (fix round 1 della 15b).
    const { carattere, curvaAlta } = misure();
    const sc = (n) => scalato(n, carattere);
    // Lo stesso interruttore di `testoLegendaStati(compatta)` in `piano.js`: il corpo è il solo
    // segnale che il disegno ha dell'aula, e fuori dalla presentazione vale il ripiego, quindi
    // alla scrivania il ramo è quello di sempre e non cambia un pixel.
    const inAula = carattere > MISURE_BASE.carattere;
    const W = contenitore.clientWidth || 200, H = curvaAlta, M = sc(14), ML = sc(28);
    const larghezza = Math.max(0, W - M - ML), altezza = Math.max(0, H - 2 * M);
    // Una corsa che si ferma al primo passo ha `uMax` e `vMax` a zero: il rapporto non si fa,
    // il punto sta nell'origine. Senza questa guardia uscirebbe `cx="NaN"` e nessun cerchio.
    const x = (u) => ML + (uMax > 0 ? (Number(u) || 0) / uMax : 0) * larghezza;
    const y = (V) => H - M - (vMax > 0 ? (Number(V) || 0) / vMax : 0) * altezza;
    const svg = el("svg", { width: W, height: H, "aria-label": "curva taglio–spostamento della pushover" });
    const testo = (attributi, contenuto) => { const t = el("text", { "font-size": carattere, fill: colore, "font-family": MONO, ...attributi }); t.textContent = contenuto; return t; };
    svg.append(el("line", { x1: ML, y1: H - M, x2: W - M, y2: H - M, stroke: colore, "stroke-width": 1 }),
               el("line", { x1: ML, y1: M, x2: ML, y2: H - M, stroke: colore, "stroke-width": 1 }),
               testo({ x: ML - sc(3), y: H - M + sc(10), "text-anchor": "end" }, "0"),
               testo({ x: W - M, y: H - M + sc(10), "text-anchor": "end" }, `${conciso(uMax)} mm`),
               // Il taglio massimo. **Dentro** il grafico alla scrivania, in alto a sinistra: là a
               // sinistra dell'asse ci sono 28 px e «72,12 kN» ne vuole più del doppio — usciva
               // tagliato a «2 kN», cioè un numero diverso e plausibile.
               //
               // In aula no: dentro il grafico è il posto dove passa la curva, e le due etichette
               // del passo gli finiscono addosso ogni volta che il taglio è già alto e lo
               // spostamento ancora piccolo. Misurati i rettangoli resi su 14 passi del MURO 1:
               // dentro sono **8** scontri (passi 1, 3, 10, 15, 21), sopra l'asse ancora **3**
               // (10, 15, 21) — il margine alto è già dove vanno quelle etichette — e nella banda
               // sotto l'asse, al centro, **nessuno**: «0» finisce a 105 e «60 mm» comincia a 954,
               // in mezzo c'è solo posto. Non è l'altezza a risolverlo: a 160 px l'area utile era
               // troppo bassa (fix round 1), ma anche a 500 il numero fisso restava sulla strada.
               inAula
                 ? testo({ x: (ML + (W - M)) / 2, y: H - M + sc(10), "text-anchor": "middle" }, `${conciso(vMax)} kN`)
                 : testo({ x: ML + sc(2), y: M + sc(10), "text-anchor": "start" }, `${conciso(vMax)} kN`));
    svg.append(el("polyline", { points: punti.map((q) => `${x(q.u)},${y(q.V)}`).join(" "),
                                fill: "none", stroke: colore, "stroke-width": 1.5 }));
    const corrente = risultati.passo?.k;
    for (const q of punti) {
      const sceltoQ = q.k === corrente;
      // R10: con la corsa stantia la curva è **tutta** rossa (un solo rosso, story 63), quindi
      // il colore non distingue più niente: il passo corrente si legge dal raggio.
      svg.append(el("circle", { class: "passo", "data-k": q.k, "aria-label": `passo ${q.k + 1}`,
                                cx: x(q.u), cy: y(q.V), r: sceltoQ ? 4.5 : 2.5, fill: sceltoQ ? ROSSO : colore }));
    }
    if (risultati.passo) {
      const { k, u, V } = risultati.passo;
      // I due numeri accanto al punto, dalla parte dove c'è spazio: a metà corsa in poi il
      // testo a destra uscirebbe dalla striscia, e il troncamento mangerebbe proprio il valore.
      // Il conteggio è `punti.length`, lo stesso che porta `passo.quanti`. Prima quel campo si
      // chiamava `n`, che nella caduta è il **numero** del passo del server: letto come conteggio
      // teneva i due testi sempre a destra, e il commento raccontava la confusione al contrario.
      const destra = k < punti.length / 2;
      const cx = x(u) + (destra ? sc(7) : -sc(7)), ancora = destra ? "start" : "end";
      svg.append(testo({ x: cx, y: y(V) - sc(4), "text-anchor": ancora }, `u ${conciso(u)} mm`),
                 testo({ x: cx, y: y(V) + sc(12), "text-anchor": ancora }, `V ${conciso(V)} kN`));
    }
    const qCaduta = caduta ? punti[caduta.k] : null;
    if (qCaduta) {
      const cx = x(qCaduta.u), cy = y(qCaduta.V), b = 5;
      svg.append(el("line", { x1: cx - b, y1: cy - b, x2: cx + b, y2: cy + b, stroke: ROSSO, "stroke-width": 1.5 }),
                 el("line", { x1: cx - b, y1: cy + b, x2: cx + b, y2: cy - b, stroke: ROSSO, "stroke-width": 1.5 }),
                 // `caduta.n` è il numero del passo che manda il server, e `curvaPushover` lo
                 // mette sempre: `k` è l'indice nella lista, che con una caduta fuori scala non
                 // è lo stesso numero.
                 // Story 50: dove si è fermata **e di quanto**. L'algoritmo no — qui è una riga
                 // sopra la croce, e ci sta un numero, non una frase; sta nell'equilibrio.
                 testo({ x: cx, y: M - sc(4), "text-anchor": "middle", fill: ROSSO },
                       `caduta al passo ${caduta.n} · u ${conciso(caduta.u)} mm`));
    }
    // R11: 120 cerchi da 2,5 px non si prendono col mouse, e 120 listener sono 120 chiusure da
    // ricostruire a ogni ridisegno. Un solo bersaglio largo quanto la striscia, e il passo si
    // trova dall'ascissa: i cerchi restano disegno. `transparent` e non `none` — `fill: none`
    // lascia passare il clic attraverso il rettangolo.
    const bersaglio = el("rect", { class: "passi", x: 0, y: 0, width: W, height: H, fill: "transparent" });
    bersaglio.addEventListener("click", (evento) => {
      if (!suPasso || !punti.length) return;
      const dove = Number(evento?.offsetX) || 0;
      let vicino = punti[0];
      for (const q of punti) if (Math.abs(x(q.u) - dove) < Math.abs(x(vicino.u) - dove)) vicino = q;
      suPasso(vicino.k);
    });
    svg.append(bersaglio);
    contenitore.replaceChildren(p, svg);
  }

  return { disegna };
}
