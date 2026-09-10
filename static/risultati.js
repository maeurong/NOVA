// La geometria dei risultati statici nel piano x–z, pura: niente DOM, niente three.js. Il piano
// e lo spazio disegnano quel che esce da qui; l'ispettore e il blocco «Risultati» stampano i testi.
//
// Il contratto è quello di `nova/corsa.py:_stazioni` e `risultati_da_uscite`: `per_caso[caso]` con
// `spostamenti["<id>"][6]` (ux uy uz rx ry rz in mm e rad), `reazioni["<id>"][6]` (N e N·mm, solo
// i vincolati), `sollecitazioni["<id_asta>"]` liste di stazioni `{x_rel, N, Vy, Vz, T, My, Mz}`.
// Nel piano x–z contano `ux`, `uz`, `ry`, e **due** coppie di sollecitazioni, non una: le travi
// e le aste inclinate flettono con `My`/`Vz`, i pilastri con `Mz`/`Vy` (il perché sta in `assiDi`).
// `N` vale per tutte e due.

import { conciso } from "./numeri.js";
import { nodo } from "./modello.js";

export const VISTE = ["deformata", "M", "V", "N"];
const LATO_MINIMO = 2000;   // mm, come `piano.js`: un modello con un nodo non ha estensione
const COSENO_VERTICALE = 0.999;   // `_COSENO_VERTICALE`, `nova/deck.py:35`: la stessa soglia del deck

export const casiDi = (risultati) => Object.keys(risultati?.per_caso ?? {});

/** La serie 1-2-5: 37 → 50, 120 → 100, 1,4 → 1. Un valore non positivo o non finito dà 1. */
export function scala125(v) {
  if (!Number.isFinite(v) || v <= 0) return 1;
  const esp = Math.floor(Math.log10(v));
  const mantissa = v / 10 ** esp;
  // Il candidato più vicino nel rapporto (in scala logaritmica), fra 1, 2, 5 e 10.
  let scelto = 1, distanza = Infinity;
  for (const c of [1, 2, 5, 10]) {
    const d = Math.abs(Math.log10(mantissa / c));
    if (d < distanza) { distanza = d; scelto = c; }
  }
  return scelto * 10 ** esp;
}

export function latoMaggiore(m) {
  const nodi = m?.nodi ?? [];
  if (nodi.length === 0) return LATO_MINIMO;
  const xs = nodi.map((n) => n.x), zs = nodi.map((n) => n.z);
  return Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs), LATO_MINIMO);
}

/** I nodi lungo un'asta: i due estremi più i nodi interni delle `suddivisioni`, quando il server
 *  li manda (`spostamenti_interni["<id>"]`, ordinati per `x_rel`). La chiave può mancare del tutto
 *  — sono risultati corsi prima che esistesse — e allora restano i due estremi, com'era.
 *  Una stazione con `x_rel` fuori da (0, 1), o con un `u` corto o non finito, si salta: meglio un
 *  tratto in meno che un ginocchio inventato nella deformata. */
function nodiLungoAsta(perCaso, idAsta, ui, uj) {
  const interni = perCaso?.spostamenti_interni?.[String(idAsta)];
  const buoni = (Array.isArray(interni) ? interni : [])
    .filter((p) => Number.isFinite(p?.x_rel) && p.x_rel > 0 && p.x_rel < 1
                   && Array.isArray(p.u) && p.u.length >= 6 && p.u.every(Number.isFinite))
    .map((p) => ({ x_rel: p.x_rel, u: p.u }))
    // Il contratto li dà crescenti; costa una riga non crederci, e un ordine sbagliato qui
    // darebbe un'asta ripiegata su sé stessa senza che nessuno sollevi niente.
    .sort((p, q) => p.x_rel - q.x_rel)
    // Due stazioni sulla stessa ascissa farebbero un tratto lungo zero: la cubica ne uscirebbe con
    // otto punti sovrapposti e un `Lt` nullo nei termini di rotazione. Vince la prima.
    .filter((p, k, ordinati) => k === 0 || p.x_rel !== ordinati[k - 1].x_rel);
  return [{ x_rel: 0, u: ui }, ...buoni, { x_rel: 1, u: uj }];
}

const spostamentoDi = (perCaso, id) => {
  const u = perCaso?.spostamenti?.[String(id)];
  return Array.isArray(u) && u.length >= 6 && u.every(Number.isFinite) ? u : null;
};

// Sotto un milionesimo del lato maggiore non c'è uno spostamento: c'è l'aritmetica del solutore.
// Su una trave appoggiata i due appoggi rendono `1e-20` di rumore, e amplificarlo fino al 5 % del
// telaio vuol dire una scala di `2e20` e una deformata che spara fuori dal riquadro.
const RUMORE = 1e-6;

/** La freccia massima **lungo le aste**, non sui soli nodi, e **dove** sta.
 *
 *  Sui nodi non c'è quasi mai niente da vedere: su una trave appoggiata gli appoggi non si
 *  spostano e la freccia sta in mezzeria, dove la portano le rotazioni degli estremi. Misurato a
 *  mano su Chrome il 10/09/2026: col massimo preso sui nodi il badge diceva
 *  «×200 000 000 000 000 000 000 (auto)» sulla trave appoggiata (rumore `1e-20` agli appoggi) e
 *  «×50 000» sul MURO 1 (`0,0021` mm ai piedi), con le travi fuori dal telaio in tutti e due i casi.
 *
 *  Si campiona quindi la stessa `puntiDeformata` che il piano disegna, a scala 1, e per ogni punto
 *  si misura la distanza dal punto **indeformato** corrispondente. `punto` e `indeformato` escono
 *  con il valore perché l'etichetta della freccia va scritta lì, non su un nodo fermo.
 *
 *  ponytail: otto tratti per asta, gli stessi del disegno. Il vero massimo di una cubica sta fra
 *  due campioni, e su una campata sola l'errore è dell'ordine del per mille — dentro il passo della
 *  serie 1-2-5, che è quello che decide la scala. Se un giorno servisse esatto, si annulla la
 *  derivata della cubica invece di infittire il campionamento. */
export function frecciaMassima(m, perCaso) {
  let valore = 0, punto = null, indeformato = null;
  // Il primo `id` vince, come fa `nodo()` coi nodi doppi: `new Map(entries)` terrebbe l'ultimo, e
  // un file con due aste sullo stesso id campionerebbe la deformata di una contro la geometria
  // dell'altra — scala sbagliata, in silenzio. Il doppione lo segnala il Check Model, non questa.
  const perId = new Map();
  for (const a of m?.aste ?? []) if (!perId.has(a.id)) perId.set(a.id, a);
  const conAsta = new Set();
  for (const d of puntiDeformata(m, perCaso, 1)) {
    const a = perId.get(d.id);
    const i = nodo(m, a.nodo_i), j = nodo(m, a.nodo_j);
    conAsta.add(i.id).add(j.id);
    // `p.r`, non `k/n`: con i nodi interni i tratti possono essere disuguali e i campioni non sono
    // equispaziati — il punto indeformato va preso all'ascissa vera, o la freccia si misura contro
    // il punto sbagliato.
    for (const p of d.punti) {
      const r = p.r;
      const base = { x: i.x + (j.x - i.x) * r, z: i.z + (j.z - i.z) * r };
      const v = Math.hypot(p.x - base.x, p.z - base.z);
      if (v > valore) { valore = v; punto = { x: p.x, z: p.z }; indeformato = base; }
    }
  }
  // Un nodo che nessun'asta tocca non ha una deformata da campionare: vale per sé.
  for (const k of m?.nodi ?? []) {
    if (conAsta.has(k.id)) continue;
    const u = spostamentoDi(perCaso, k.id);
    if (!u) continue;
    const v = Math.hypot(u[0], u[2]);
    if (v > valore) { valore = v; punto = { x: k.x + u[0], z: k.z + u[2] }; indeformato = { x: k.x, z: k.z }; }
  }
  return valore >= RUMORE * latoMaggiore(m) ? { valore, punto, indeformato }
                                            : { valore: 0, punto: null, indeformato: null };
}

// Il solo numero, per chi non ha bisogno di sapere dove sta. Non esportata: `scalaAuto` è l'unica
// che la usa, e chi vuole il valore da fuori chiede `frecciaMassima(...).valore`.
const spostamentoMassimo = (m, perCaso) => frecciaMassima(m, perCaso).valore;

/** La scala che porta il massimo spostamento nel piano a `frazione` del lato maggiore, in 1-2-5.
 *  Spostamenti nulli → 1: la deformata coincide con l'ombra, e il badge dice «×1». */
export function scalaAuto(m, perCaso, frazione = 0.05) {
  const dmax = spostamentoMassimo(m, perCaso);
  return dmax > 0 ? scala125(frazione * latoMaggiore(m) / dmax) : 1;
}

/** La terna di un'asta nel piano **e** l'asse su cui il solutore misura la flessione in questo
 *  piano. `e1` lungo i→j, `e2` la normale sinistra dello schermo; `n` l'asse trasversale del
 *  solutore in coordinate schermo, ed è lui — non `e2` — che decide da che parte va disegnato
 *  un diagramma.
 *
 *  Perché non coincidono: `nova/deck.py:_terna` (`:172-191`) prende `e2_deck` = verticale
 *  proiettata e `e1_deck = e2_deck × a`. Per un'asta **coricata** la `z` locale (`a × e1_deck`)
 *  vale `ẑ` qualunque sia l'ordine dei nodi, cioè `sign(e1.x)·e2`; per un'asta **in piedi** la
 *  `z` locale è la `y` globale, fuori dal piano, e quello che resta in piano è `e1_deck` (la `y`
 *  locale) = `−e2`. Da qui le due coppie di chiavi: trave → `My`/`Vz`, pilastro → `Mz`/`Vy`.
 *
 *  Misurato sul telaio 2×1 il 10/09/2026 (`tests/fixture/telaio_2x1.nova.json`, tutti i casi):
 *  pilastri `|My|max ≤ 2,2e-9` e `|Mz|max` fino a 2,1e7; travi `|Mz|max ≤ 9,3e-10` e `|My|max`
 *  fino a 5,4e7. Con una mappa costante `{M:"My"}` ogni pilastro sarebbe una riga piatta.
 *
 *  `verticale` si decide sull'asse **in 3D**, `|a·ẑ| / |a|`, con la `y` dei nodi dentro: è la
 *  stessa riga del deck (`nova/deck.py:428`, `abs(asse[2]) > _COSENO_VERTICALE`). Guardando la
 *  sola proiezione su x–z, una controventatura che sale di 3 m salendo di 4 in `y` usciva
 *  «verticale» qui e trave là, con la chiave sbagliata e un diagramma piatto. La terna del
 *  disegno resta nel piano: quel che si vede è l'alzado.
 *
 *  ponytail: resta fuori `rotazione_deg`. La terna del deck ruota attorno all'asse, e con una
 *  rotazione che non sia multipla di 180° nessuna delle due coppie di chiavi è quella giusta:
 *  quell'asta non si disegna affatto (`diagramma`), invece di mostrarne una sbagliata. Il giorno
 *  del fuori-piano vero, la chiave la deve dire il server insieme alle stazioni. */
export function assiDi(i, j) {
  const L = Math.hypot(j.x - i.x, j.z - i.z);
  if (!(L > 0)) return null;
  const e1 = { x: (j.x - i.x) / L, z: (j.z - i.z) / L };
  const e2 = { x: -e1.z, z: e1.x };
  const dy = (Number(j.y) || 0) - (Number(i.y) || 0);
  const verticale = Math.abs(j.z - i.z) / Math.hypot(L, dy) > COSENO_VERTICALE;
  const s = verticale ? -1 : (Math.sign(e1.x) || 1);
  return { L, e1, e2, verticale, n: { x: s * e2.x, z: s * e2.z },
           M: verticale ? "Mz" : "My", V: verticale ? "Vy" : "Vz", N: "N" };
}

/** Una sezione ruotata di un angolo che non sia multiplo di 180° porta la terna del solutore fuori
 *  dal piano del disegno: né `My`/`Vz` né `Mz`/`Vy` sono la flessione che si vede. Quell'asta i
 *  diagrammi la saltano, e il badge lo dice — un diagramma sbagliato è peggio di uno assente. */
export const sezioneRuotata = (a) => {
  const g = Number(a?.rotazione_deg);
  return Number.isFinite(g) && ((g % 180) + 180) % 180 !== 0;
};

/** La deformata per asta, con le funzioni di forma di Hermite nel piano (`docs/ricerca/03-stack-tecnico.md:94`):
 *  spostamento assiale lineare, trasversale cubico dalle frecce e dalle rotazioni degli estremi.
 *  La rotazione attorno a `y` con la regola della mano destra dà `dw/ds = −θy` (θ × r sull'asse
 *  dell'asta, proiettato sulla normale sinistra). `y` fuori dal piano: lineare.
 *
 *  **Tratto per tratto.** I nodi dell'asta sono `[i, …interni…, j]`: gli interni sono quelli delle
 *  `suddivisioni`, che il server manda in `per_caso[caso].spostamenti_interni["<id>"]`. La cubica
 *  si fa fra nodi **consecutivi**, con la `L` del tratto, così sotto un carico distribuito la
 *  deformata passa per la freccia vera invece di tagliarla.
 *
 *  **Il limite, e quando vale.** Senza quella chiave — risultati corsi prima che il server la
 *  esportasse — la cubica interpola i soli estremi e fra un nodo e l'altro manca il termine
 *  quartico che il carico distribuito ci mette. Sulla trave appoggiata di 6 m con q = −10 N/mm la
 *  mezzeria usciva a −1,2568 mm contro i −1,5709 mm veri: rapporto 0,80, che è l'algebra e non il
 *  caso — Hermite dà `qL⁴/(96EI)`, l'esatta `5qL⁴/(384EI)`, e 384/(96·5) = 4/5. Con la chiave, e
 *  con almeno una suddivisione, quel −1,5709 è un nodo vero e la deformata ci passa sopra. Fra due
 *  nodi interni consecutivi resta la stessa approssimazione, su un tratto però lungo la metà o
 *  meno: l'errore va con la quarta potenza della campata, quindi cala di 16 volte a ogni bisezione.
 *
 *  Ogni punto porta la sua `r` (l'ascissa relativa sull'asta): con i tratti disuguali i campioni
 *  **non** sono equispaziati, e chi vuole il punto indeformato corrispondente (`frecciaMassima`)
 *  non può dedurlo da `k/n`. */
export function puntiDeformata(m, perCaso, scala, segmenti = 8) {
  // `segmenti = 8` copre `undefined`, non `Infinity` (ciclo infinito) né `NaN` (`punti: []`).
  const n = Number.isFinite(segmenti) ? Math.max(1, Math.floor(segmenti)) : 8;
  const zero = [0, 0, 0, 0, 0, 0];
  const fuori = [];
  if (!Array.isArray(m?.nodi)) return fuori;   // `nodo()` (modello.js:45) solleva senza `m.nodi`
  for (const a of m?.aste ?? []) {
    const i = nodo(m, a.nodo_i), j = nodo(m, a.nodo_j);
    if (!i || !j) continue;
    const t = assiDi(i, j);
    if (!t) continue;
    const ui = spostamentoDi(perCaso, i.id) ?? zero, uj = spostamentoDi(perCaso, j.id) ?? zero;
    const { L, e1, e2 } = t;
    const nodiAsta = nodiLungoAsta(perCaso, a.id, ui, uj);
    const punti = [];
    for (let t2 = 0; t2 < nodiAsta.length - 1; t2++) {
      const q0 = nodiAsta[t2], q1 = nodiAsta[t2 + 1];
      const Lt = (q1.x_rel - q0.x_rel) * L;
      const a0 = q0.u[0] * e1.x + q0.u[2] * e1.z, a1 = q1.u[0] * e1.x + q1.u[2] * e1.z;   // assiali
      const w0 = q0.u[0] * e2.x + q0.u[2] * e2.z, w1 = q1.u[0] * e2.x + q1.u[2] * e2.z;   // trasversali
      const p0 = -q0.u[4], p1 = -q1.u[4];                                                 // dw/ds = −θy
      // Il primo tratto scrive anche il suo nodo iniziale; gli altri no, o il nodo in comune
      // uscirebbe due volte e la polilinea avrebbe un punto doppio a ogni suddivisione.
      for (let k = t2 === 0 ? 0 : 1; k <= n; k++) {
        const s = k / n, s2 = s * s, s3 = s2 * s;
        const w = (1 - 3 * s2 + 2 * s3) * w0 + (s - 2 * s2 + s3) * Lt * p0 + (3 * s2 - 2 * s3) * w1 + (-s2 + s3) * Lt * p1;
        const u = (1 - s) * a0 + s * a1;
        const r = q0.x_rel + s * (q1.x_rel - q0.x_rel);
        const x = i.x + e1.x * (r * L + scala * u) + e2.x * scala * w;
        const z = i.z + e1.z * (r * L + scala * u) + e2.z * scala * w;
        const y = i.y + r * (j.y - i.y) + scala * ((1 - s) * q0.u[1] + s * q1.u[1]);
        // `r` **dentro** il punto, non in un array parallelo: due liste da tenere allineate a mano
        // sono un allineamento che prima o poi salta. `spazio.js` legge `x`, `y`, `z` e ignora il
        // resto; il piano scrive `points` da `x`/`y`.
        punti.push({ x, y, z, r });
      }
    }
    fuori.push({ id: a.id, punti });
  }
  return fuori;
}

const controllaVista = (vista) => {
  if (!["M", "V", "N"].includes(vista)) throw new Error(`vista sconosciuta: ${vista}`);
  return vista;
};

const stazioniDi = (perCaso, id) => {
  const s = perCaso?.sollecitazioni?.[String(id)];
  return Array.isArray(s) ? s : [];
};

/** Le aste disegnabili con la loro chiave: la coppia (asta, chiave) in un punto solo, così
 *  `scalaDiagrammaAuto` e `diagramma` non possono divergere sul nome della grandezza. */
function asteConAssi(m, perCaso, vista) {
  const fuori = [];
  if (!Array.isArray(m?.nodi)) return fuori;   // `nodo()` (modello.js:45) solleva senza `m.nodi`
  for (const a of m?.aste ?? []) {
    const i = nodo(m, a.nodo_i), j = nodo(m, a.nodo_j);
    if (!i || !j) continue;
    const t = assiDi(i, j);
    if (!t) continue;
    if (sezioneRuotata(a)) continue;   // la chiave sarebbe sbagliata: si conta, non si disegna
    fuori.push({ a, i, j, t, chiave: t[vista], stazioni: stazioniDi(perCaso, a.id) });
  }
  return fuori;
}

/** Quante aste i diagrammi saltano per via della sezione ruotata. Il badge lo stampa: un'asta che
 *  manca dal disegno senza che nessuno lo dica è un'asta che si legge come «zero». */
export function asteRuotate(m) {
  return (m?.aste ?? []).filter(sezioneRuotata).length;
}

/** Millimetri per unità (N o N·mm) che portano il massimo a `frazione` del lato maggiore.
 *  Il massimo si prende **con la chiave di ciascuna asta**: su un telaio la scala deve tenere
 *  insieme il `My` delle travi e il `Mz` dei pilastri, che sono lo stesso momento nel piano. */
export function scalaDiagrammaAuto(m, perCaso, vista, frazione = 0.08) {
  let massimo = 0;
  for (const { chiave, stazioni } of asteConAssi(m, perCaso, controllaVista(vista))) {
    for (const s of stazioni) if (Number.isFinite(s[chiave])) massimo = Math.max(massimo, Math.abs(s[chiave]));
  }
  return massimo > 0 ? frazione * latoMaggiore(m) / massimo : 0;
}

/** I diagrammi per stazione, e da che parte sta il positivo.
 *
 *  **M** sul lato teso: verso **−n**, dove `n` è l'asse trasversale del solutore (`assiDi`). È
 *  sotto una trave qualunque sia l'ordine dei suoi nodi, e a sinistra di un pilastro che sale.
 *
 *  **V e N** verso **e2**, la normale sinistra di i→j, e non su `n`: la convenzione del taglio e
 *  dello sforzo assiale è già nel segno del valore («+ verso i→j», «+ trazione»), e appendere
 *  anche il lato all'asse del solutore la faceva cambiare da asta ad asta — su un telaio il
 *  positivo del taglio stava sopra le travi e a sinistra dei pilastri, e la legenda del badge
 *  valeva per metà disegno. Con `e2` il lato è uno solo, dichiarabile in una riga.
 *
 *  `chiave` esce insieme ai punti perché chi disegna i picchi e la striscia deve leggere le stesse
 *  stazioni con lo stesso nome. */
export function diagramma(m, perCaso, vista, scalaD) {
  controllaVista(vista);
  const fuori = [];
  for (const { a, i, j, t, chiave, stazioni } of asteConAssi(m, perCaso, vista)) {
    if (stazioni.length === 0) continue;
    const { L, e1, e2, n } = t;
    const lato = vista === "M" ? { x: -n.x, z: -n.z } : e2;
    const punti = stazioni.map((s) => {
      const valore = Number.isFinite(s[chiave]) ? s[chiave] : 0;
      // Una stazione con `x_rel` guasto sta sul nodo i: il poligono resta chiuso invece di
      // portarsi dietro un NaN che cancella tutto il `points` dell'asta.
      const r = Number.isFinite(s.x_rel) ? s.x_rel : 0;
      const d = valore * scalaD;
      return { x: i.x + e1.x * r * L + lato.x * d, z: i.z + e1.z * r * L + lato.z * d, x_rel: s.x_rel, valore };
    });
    fuori.push({ id: a.id, chiave, base: [{ x: i.x, z: i.z }, { x: j.x, z: j.z }], punti });
  }
  return fuori;
}

/** I picchi da scrivere: il massimo in modulo e, se cambia segno in modo visibile (≥ 5 % del
 *  massimo), anche l'estremo opposto. Tutto nullo → niente da scrivere. */
export function picchi(stazioni, grandezza) {
  const valide = (stazioni ?? []).filter((s) => Number.isFinite(s?.[grandezza]) && Number.isFinite(s?.x_rel));
  if (valide.length === 0) return [];
  const max = valide.reduce((a, s) => (s[grandezza] > a[grandezza] ? s : a));
  const min = valide.reduce((a, s) => (s[grandezza] < a[grandezza] ? s : a));
  const [primo, secondo] = Math.abs(max[grandezza]) >= Math.abs(min[grandezza]) ? [max, min] : [min, max];
  if (primo[grandezza] === 0) return [];
  const fuori = [{ x_rel: primo.x_rel, valore: primo[grandezza] }];
  if (Math.sign(secondo[grandezza]) === -Math.sign(primo[grandezza]) &&
      Math.abs(secondo[grandezza]) >= 0.05 * Math.abs(primo[grandezza])) {
    fuori.push({ x_rel: secondo.x_rel, valore: secondo[grandezza] });
  }
  return fuori;
}

const UNITA = { M: [1e6, "kN·m"], V: [1e3, "kN"], N: [1e3, "kN"], deformata: [1, "mm"] };
export function testoValore(vista, v) {
  if (!Number.isFinite(v)) return "—";
  const [fattore, unita] = UNITA[vista] ?? [1, ""];
  return `${conciso(v / fattore)} ${unita}`.trim();
}

// Il lato del positivo sta nella legenda perché ora è uno solo per tutto il disegno (`diagramma`):
// scritto «a sinistra di i→j» si legge sul disegno senza contare i nodi.
const LEGENDA = { M: "kN·m · lato teso", V: "kN · + verso i→j, a sinistra di i→j",
                  N: "kN · + trazione, a sinistra di i→j" };
export function testoBadge({ vista, caso, scala, auto, stantia = false, ruotate = 0 }) {
  if (!vista) return "";
  const coda = vista === "deformata" ? `×${conciso(scala)} (${auto ? "auto" : "a mano"})` : LEGENDA[vista];
  // Le aste che i diagrammi saltano vanno dette: una che manca senza avviso si legge come «zero».
  // La deformata invece le disegna — è in terna globale e la rotazione della sezione non la tocca.
  const salti = ruotate > 0 && vista !== "deformata"
    ? ` · ${ruotate} ${ruotate === 1 ? "asta" : "aste"} con sezione ruotata non ${ruotate === 1 ? "disegnata" : "disegnate"}` : "";
  return `${stantia ? "stantia · " : ""}${vista} · ${caso} · ${coda}${salti}`;
}

const kN = (v) => `${conciso(v / 1e3)} kN`;
const kNm = (v) => `${conciso(v / 1e6)} kN·m`;
const mm = (v) => `${conciso(v)} mm`;
const mrad = (v) => `${conciso(v * 1e3)} mrad`;
const terna_ = (nomi, valori, f) => nomi.map((n, k) => `${n} ${f(valori[k])}`).join(" · ");

export function righeSpostamenti(perCaso, id) {
  const u = spostamentoDi(perCaso, id);
  if (!u) return [];
  return [["spostamenti", terna_(["ux", "uy", "uz"], u.slice(0, 3), mm)],
          ["rotazioni", terna_(["φx", "φy", "φz"], u.slice(3, 6), mrad)]];
}

export function righeReazioni(perCaso, id) {
  const r = perCaso?.reazioni?.[String(id)];
  if (!Array.isArray(r) || r.length < 6 || !r.every(Number.isFinite)) return [];
  return [["reazioni", terna_(["Rx", "Ry", "Rz"], r.slice(0, 3), kN)],
          ["momenti di reazione", terna_(["Mx", "My", "Mz"], r.slice(3, 6), kNm)]];
}

/** «Σ reazioni (0; 0; 60) kN · Σ carichi (0; 0; −60) kN»: il controllo che contraddice, accanto
 *  al numero (`docs/ricerca/07-ux-modellatore.md:101`). Il caso che non c'è dà un trattino. */
export function testoEquilibrio(risultati, caso) {
  const perCaso = risultati?.per_caso?.[caso];
  if (!perCaso) return "—";
  const somma = [0, 0, 0];
  for (const r of Object.values(perCaso.reazioni ?? {})) for (let k = 0; k < 3; k++) somma[k] += Number(r?.[k]) || 0;
  const vettore = (v) => `(${v.map((x) => conciso(x / 1e3)).join("; ")}) kN`;
  const carichi = risultati?.run?.carico_totale?.[caso];
  const testoCarichi = Array.isArray(carichi) && carichi.length >= 3 ? vettore(carichi.slice(0, 3)) : "—";
  return `Σ reazioni ${vettore(somma)} · Σ carichi ${testoCarichi}`;
}

export function srotolato(stazioni, grandezza) {
  const punti = (stazioni ?? []).filter((s) => Number.isFinite(s?.[grandezza]) && Number.isFinite(s?.x_rel))
    .map((s) => ({ x_rel: s.x_rel, valore: s[grandezza] }));
  return { punti, massimo: punti.reduce((a, p) => Math.max(a, Math.abs(p.valore)), 0) };
}
