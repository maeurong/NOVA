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
        // `p0 === 0 && p1 === 0` non basta (#84 fix round 1): un'asta incastro-incastro vera ha
        // anch'essa le rotazioni a zero esatto (`fix` in OpenSees, non un residuo), e finirebbe
        // dritta con una freccia vera in mezzo. Solo `formaComeSpostamenti` (sotto) sa di essere
        // un modo: legge il suo segnale esplicito, non deduce dai numeri. Chi non lo dichiara
        // resta sull'Hermite di sempre — il default è il comportamento vecchio.
        const dritta = perCaso?.modale === true;
        const w = dritta
          ? (1 - s) * w0 + s * w1
          : (1 - 3 * s2 + 2 * s3) * w0 + (s - 2 * s2 + s3) * Lt * p0 + (3 * s2 - 2 * s3) * w1 + (-s2 + s3) * Lt * p1;
        const u = (1 - s) * a0 + s * a1;
        const r = q0.x_rel + s * (q1.x_rel - q0.x_rel);
        const x = i.x + e1.x * (r * L + scala * u) + e2.x * scala * w;
        const z = i.z + e1.z * (r * L + scala * u) + e2.z * scala * w;
        const uy = (1 - s) * q0.u[1] + s * q1.u[1];
        const y = i.y + r * (j.y - i.y) + scala * uy;
        // `r` **dentro** il punto, non in un array parallelo: due liste da tenere allineate a mano
        // sono un allineamento che prima o poi salta. `spazio.js` legge `x`, `y`, `z` e ignora il
        // resto; il piano scrive `points` da `x`/`y`.
        // |u| **senza scala**: la scala e il fattore dell'animazione spostano il disegno, non il
        // valore — la legenda dei colori resta ferma mentre il modo respira (15a).
        punti.push({ x, y, z, r, u: Math.hypot(u, w, uy) });
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
/** Il badge, coi separatori attaccati a quel che li precede da uno spazio insecabile (C7a): la riga
 *  si spezza **dopo** il `·`, mai prima, e la scala scende intera invece di aprire la seconda riga
 *  con «· ×2 (auto)» — misurato a 1920 in presentazione. Un passaggio solo qui, invece di sedici
 *  `·` da ricordarsi uno per uno dentro `badgeGrezzo`. */
export const testoBadge = (campi) => badgeGrezzo(campi).replaceAll(" · ", "\u00a0· ");

function badgeGrezzo({ vista, caso, scala, auto, stantia = false, ruotate = 0,
                             modo = null, passo = null, caduta = null, fermo = false, motivoFermo = null }) {
  if (!vista) return "";
  const testa = stantia ? "stantia · " : "";
  // La scala **dichiarata** è l'ampiezza massima: il fattore dell'animazione non entra nel badge,
  // o il numero cambierebbe sessanta volte al secondo su una grandezza che invece è ferma.
  const scalaTesto = `×${conciso(scala)} (${auto ? "auto" : "a mano"})`;
  if (modo) {
    // La massa partecipante **non** sta qui: la dicono già la voce del menu («modo 2 · 31,85 Hz ·
    // ux 46 %») e la riga dell'equilibrio, tutte e due sott'occhio nella colonna a destra mentre
    // si guarda il piano (`07-ux-modellatore.md:103` chiede che stia accanto al numero del modo,
    // e lì ci sta). Nel badge erano dieci caratteri che a 1280 px, su un modo a forma nulla,
    // costavano il taglio di tutta la riga a sinistra.
    const f = Number.isFinite(modo.f) && modo.f > 0
      ? `${conciso(modo.f)} Hz · T ${conciso(modo.T)} s` : "frequenza non fisica";
    if (vista !== "deformata") return `${testa}modo ${modo.n} · ${vista} · nessun diagramma per un modo`;
    // R2: nove modi su 42 del MURO 1 hanno la forma nulla sui nodi del modello — il modo vive
    // tutto sui nodi delle suddivisioni, che `forma` non porta. Una figura ferma senza una parola
    // che dica perché si legge come un'animazione rotta, e il modo 6 partecipa il 39,8 % in y.
    const nulla = ampiezzaModo(modo) === 0 ? " · forma nulla sui nodi" : "";
    // Fermo perché l'utente ha premuto Spazio, o perché il sistema chiede meno movimento: la
    // seconda è una cosa che l'utente non ha fatto, e senza il motivo il badge la fa passare per
    // un'animazione che non parte (R13, D2a).
    const fermata = fermo ? (motivoFermo ? ` · ferma (${motivoFermo})` : " · ferma") : "";
    return `${testa}modo ${modo.n} · ${f} · ${scalaTesto}${nulla}${fermata}`;
  }
  if (passo) {
    // «passo» non c'è: a 1280 px la colonna del piano è larga ~430 px e il badge intero veniva
    // tagliato a sinistra («er · passo…»). Il numero del passo si legge dalla frazione, e il
    // taglio della scala in coda sarebbe stato peggio (`07-ux-modellatore.md:99`).
    const p = `pushover · ${passo.k + 1}/${passo.quanti}`;
    if (vista !== "deformata") return `${testa}${p} · ${vista} · nessun diagramma per un passo`;
    // Il numero del passo caduto è quello del server (`caduta.n`), non l'indice stretto alla lista.
    // Qui solo passo e motivo: spostamento e algoritmo stanno nella riga dell'equilibrio, che ha
    // la larghezza per dirli — il badge ne ha ~430 px a 1280 (punto 2 della review).
    const c = caduta ? ` · caduta al passo ${caduta.n}: ${motivoInParole(caduta.motivo)}` : "";
    // Il taglio a una cifra decimale: «70,93 kN» contro «70,9 kN» sono tre caratteri su un badge
    // che non ci sta, e il centesimo di kN su una spinta non lo guarda nessuno.
    return `${testa}${p} · u ${conciso(passo.u)} mm · V ${conciso(Math.round(passo.V * 10) / 10)} kN · ${scalaTesto}${c}`;
  }
  const coda = vista === "deformata" ? scalaTesto : LEGENDA[vista];
  // Le aste che i diagrammi saltano vanno dette: una che manca senza avviso si legge come «zero».
  // La deformata invece le disegna — è in terna globale e la rotazione della sezione non la tocca.
  const salti = ruotate > 0 && vista !== "deformata"
    ? ` · ${ruotate} ${ruotate === 1 ? "asta" : "aste"} con sezione ruotata non ${ruotate === 1 ? "disegnata" : "disegnate"}` : "";
  return `${testa}${vista} · ${caso} · ${coda}${salti}`;
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
 *  al numero (`docs/ricerca/07-ux-modellatore.md:101`). Il caso che non c'è dà un trattino.
 *
 *  Un modo e un passo non hanno un equilibrio da controllare, ma hanno il numero che si guarda
 *  nello stesso posto: la massa partecipante (NTC 7.3.3.1 chiede l'85 % cumulato) e il conto dei
 *  passi convergenti col taglio massimo. */
export function testoEquilibrio(risultati, caso) {
  if (typeof caso === "string" && caso.startsWith("modo:")) {
    const m = modiDi(risultati).find((x) => x.n === Number(caso.slice(5)));
    if (!m) return "—";
    const terna = (o) => ["x", "y", "z"].map((k) => `${k} ${percento(o?.[k])}`).join(" · ");
    return `massa partecipante ${terna(m.massa_partecipante)} · cumulata ${terna(m.cumulata)}`;
  }
  if (caso === "pushover") {
    const passi = passiDi(risultati);
    if (!passi.length) return "—";
    const c = curvaPushover(passi, risultati?.caduta);
    const kMax = c.punti.reduce((a, p) => (p.V > c.punti[a].V ? p.k : a), 0);
    const u0 = risultati?.run?.pushover?.u0;
    // I passi in lista sono quelli **convergenti**: la caduta è il passo su cui il solutore si è
    // fermato, e sta scritta a parte perché è un fatto, non un numero da leggere nella curva.
    const quanti = `${passi.length} ${passi.length === 1 ? "passo convergente" : "passi convergenti"}`;
    // Story 50: la caduta si dichiara per intero — dove, di quanto, e quale algoritmo si è arreso.
    // È la riga larga della colonna a destra, quella che può permetterselo; il badge nel piano ne
    // tiene la versione corta. `algoritmo` assente → trattino, mai una stringa inventata.
    const caduta = c.caduta
      ? `al passo ${c.caduta.n}, u ${conciso(c.caduta.u)} mm, ultimo algoritmo ${c.caduta.algoritmo ?? "—"}` +
        ` (${motivoInParole(c.caduta.motivo)})`
      : "nessuna";
    return `${quanti} · u₀ ${Number.isFinite(u0) ? `${conciso(u0)} mm` : "—"}` +
           ` · taglio massimo ${conciso(c.vMax)} kN al passo ${passi[kMax]?.n ?? kMax + 1} · caduta: ${caduta}`;
  }
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

// --- la 14a: il caso a tre forme (statico, modo, passo della pushover) --------------
//
// Il contratto del server: `nova/modale.py:60-97` per `modi[] = {n, f|null, T|null, forma,
// massa_partecipante, cumulata}` (la forma è adimensionale, di ordine 1, sui soli nodi del
// modello), `nova/passi.py:187-252` per `passi[] = {n, spostamento, taglio_base, spostamenti,
// stato_sezioni, algoritmo}`, `caduta` e `run.pushover.u0`.

export const CHIAVE_MODO = (n) => `modo:${n}`;

/** La forma della chiave del caso, in un posto solo: `app.js` ne aveva tre copie
 *  (`startsWith("modo:")` due volte, `=== "pushover"` una) mentre il Global Constraint dice che
 *  a interpretare la stringa è questo modulo. Tre copie sono tre posti da cui dimenticarsi una
 *  forma nuova. */
export const tipoDelCaso = (caso) => (caso === "pushover" ? "pushover"
  : String(caso ?? "").startsWith("modo:") ? "modo" : "caso");
const XI_LOBATTO = [0, 0.1726731646, 0.5, 0.8273268354, 1];   // `nova/deck.py:34`, 5 punti per elemento

/** R3: intero, non «45,62 %». `conciso` terrebbe due decimali sotto 100, e in un menu di 46 voci
 *  i centesimi di punto non dicono niente. Un valore che non è un numero vale 0, non «NaN %». */
export const percento = (v) => `${Math.round(100 * (Number(v) || 0))} %`;

/** R3: la direzione della massa partecipante, o `null` sotto l'1 %. Un `reduce` che parte da `"x"`
 *  renderebbe `"x"` anche con le tre masse a zero esatto — il modo 3 del MURO 1 — e la voce
 *  direbbe «ux 0 %» accanto a una frequenza vera. Sotto la soglia non c'è una direzione da dire. */
export function direzioneDominante(mp) {
  let scelta = null, massimo = 0.01;
  for (const k of ["x", "y", "z"]) {
    const v = Number(mp?.[k]) || 0;
    if (v >= massimo) { massimo = v; scelta = k; }
  }
  return scelta;
}

const modiDi = (risultati) => (Array.isArray(risultati?.modi) ? risultati.modi : []);
const passiDi = (risultati) => (Array.isArray(risultati?.passi) ? risultati.passi : []);

/** Il massimo `|u|` sulle **tre** componenti della forma. Zero vuol dire forma identicamente nulla
 *  sui nodi del modello (R2): chi disegna lo distingue da «non ho misurato» e lo scrive nel badge. */
export const ampiezzaModo = (modo) => Object.values(modo?.forma ?? {})
  .reduce((a, u) => Math.max(a, Math.abs(Number(u?.[0]) || 0), Math.abs(Number(u?.[1]) || 0), Math.abs(Number(u?.[2]) || 0)), 0);

/** R1: la scala di un modo si misura sulle tre componenti, non sul solo piano. `scalaAuto` passa
 *  da `frecciaMassima`, che ignora la `y` — giusto per una statica nel piano, sbagliato qui: venti
 *  modi su 42 del MURO 1 sono fuori piano (`ux = uz = 0`) e uscivano «×1 (auto)», cioè una figura
 *  sovrapposta all'ombra. Ampiezza nulla → 1 (R2): non c'è niente da amplificare. */
export function scalaModo(m, modo, frazione = 0.05) {
  const dmax = ampiezzaModo(modo);
  return dmax > 0 ? scala125(frazione * latoMaggiore(m) / dmax) : 1;
}

/** Le voci del menu del caso: i casi statici, poi la pushover, poi i modi. La direzione e la massa
 *  stanno accanto alla frequenza perché è su quelle che si decide se un modo è locale
 *  (`docs/ricerca/07-ux-modellatore.md:103`); una frequenza non fisica lo dice invece di stampare
 *  un numero senza senso (`docs/ricerca/11-modi-sulla-tangente-opensees.md:212-226`). */
export function vociDelCaso(stato) {
  const r = stato?.lavoro?.fin?.risultati;
  if (!r) return [];
  const voci = casiDi(r).map((c) => ({ valore: c, testo: c, tipo: "caso" }));
  const passi = passiDi(r);
  if (passi.length) voci.push({ valore: "pushover", testo: `pushover · ${passi.length} ${passi.length === 1 ? "passo" : "passi"}`, tipo: "pushover" });
  for (const m of modiDi(r)) {
    const d = direzioneDominante(m.massa_partecipante);
    const testo = Number.isFinite(m.f) && m.f > 0
      ? `modo ${m.n} · ${conciso(m.f)} Hz · ${d ? `u${d} ${percento(m.massa_partecipante?.[d])}` : "massa trascurabile"}`
      : `modo ${m.n} · frequenza non fisica`;
    voci.push({ valore: CHIAVE_MODO(m.n), testo, tipo: "modo", n: m.n });
  }
  return voci;
}

/** La forma modale nella stessa forma di `per_caso[caso]`, così il piano e il 3D la disegnano con
 *  il codice della deformata. Niente rotazioni: la forma è lineare fra i nodi (R4), e una rotazione
 *  inventata darebbe una curva che il solutore non ha mai calcolato. `modale: true` è il segnale
 *  esplicito che `puntiDeformata` legge per scegliere la retta (#84 fix round 1): solo chi
 *  costruisce una forma modale sa di esserlo, non si deduce dalle rotazioni a zero, che un
 *  incastro-incastro vero ha anche lui. */
export const formaComeSpostamenti = (modo) => ({
  modale: true,
  spostamenti: Object.fromEntries(Object.entries(modo?.forma ?? {})
    .map(([id, u]) => [id, [Number(u?.[0]) || 0, Number(u?.[1]) || 0, Number(u?.[2]) || 0, 0, 0, 0]])),
});

/** La chiave del caso è a tre forme — `"<caso>"`, `"modo:<n>"`, `"pushover"` — e si traduce qui:
 *  nessun altro modulo interpreta la stringa. `passo` fuori da [0, quanti) si stringe ai limiti,
 *  non intero (o assente) vale l'ultimo.
 *
 *  Il conteggio dei passi si chiama `quanti` e non `n`: `n` nel ramo del modo è il **numero** del
 *  modo, e due campi omonimi che vogliono dire due cose diverse nello stesso oggetto sono un
 *  errore che si scrive da sé. */
export function casoScelto(stato, caso, passo = null) {
  const r = stato?.lavoro?.fin?.risultati;
  if (!r || typeof caso !== "string") return null;
  if (caso === "pushover") {
    const passi = passiDi(r);
    if (!passi.length) return null;
    const k = Math.min(passi.length - 1, Math.max(0, Number.isInteger(passo) ? passo : passi.length - 1));
    return { tipo: "pushover", k, quanti: passi.length, passo: passi[k], perCaso: { spostamenti: passi[k].spostamenti ?? {} },
             // Niente `u0` qui: lo legge `testoEquilibrio` da `run.pushover.u0`, che è dove il
             // server lo scrive. Portarlo anche di qua era un secondo cammino per lo stesso
             // numero, e nessuno lo percorreva.
             stati: passi[k].stato_sezioni ?? null, caduta: r.caduta ?? null };
  }
  if (caso.startsWith("modo:")) {
    const n = Number(caso.slice(5));
    const modo = modiDi(r).find((m) => m.n === n);
    return modo ? { tipo: "modo", n, modo, perCaso: formaComeSpostamenti(modo) } : null;
  }
  const perCaso = r.per_caso?.[caso];
  return perCaso ? { tipo: "caso", perCaso } : null;
}

/** Il passo su cui si misura la scala della pushover: quello di spostamento massimo in modulo.
 *  La scala è **una per corsa**, non una per passo — con `scalaAuto` sul passo corrente usciva
 *  ×10 al passo 30 e ×2 al 120, cioè scorrendo i passi la deformata «respirava» invece di
 *  crescere, e il confronto fra due passi (che è tutto il senso dello scrubber) diceva il falso.
 *  Lista vuota → `null`: non c'è nessun passo da misurare. */
export function passoDiRiferimento(passi) {
  const lista = Array.isArray(passi) ? passi : [];
  let k = null, massimo = -1;
  for (let i = 0; i < lista.length; i++) {
    const u = Math.abs(Number(lista[i]?.spostamento) || 0);
    if (u > massimo) { massimo = u; k = i; }
  }
  return k;
}

/** Le stazioni di un'asta come le scrive `nova/passi.py:stato_sezioni`: 5 di Lobatto per elemento,
 *  la prima degli elementi interni saltata → `4n + 1`. `quante` è il conteggio letto dai risultati:
 *  se non combacia (un file di un'altra versione) si ripiega su stazioni equispaziate, perché
 *  posare nove simboli su cinque ascisse è peggio che posarli male. */
export function stazioniDiAsta(a, quante = null) {
  const n = Math.max(1, Math.floor(Number(a?.suddivisioni) || 1));
  const x = [];
  for (let e = 0; e < n; e++) for (let k = 0; k < XI_LOBATTO.length; k++) { if (e > 0 && k === 0) continue; x.push((e + XI_LOBATTO[k]) / n); }
  if (quante === null || quante === x.length) return x;
  if (quante <= 0) return [];
  return quante === 1 ? [0.5] : Array.from({ length: quante }, (_, k) => k / (quante - 1));
}

// I due canali di `nova/passi.py:31-32`, uno per materiale: il riempimento dice il calcestruzzo,
// il contorno l'acciaio. Un valore che non è in tabella — o una stazione `null`, che `_peggiore`
// (`nova/passi.py:109-110`) rende su una lista di fibre vuota — non ha simbolo: inventare
// «elastica» sarebbe dichiarare un controllo che nessuno ha fatto (R9).
const RIEMPIMENTO = { elastica: 0, fessurata: 0.5, schiacciata: 1 };
const CONTORNO = { elastica: "sottile", snervata: "spesso", rotta: "croce" };
export function simboloStato(stato) {
  const r = RIEMPIMENTO[stato?.calcestruzzo], c = CONTORNO[stato?.acciaio];
  return r === undefined || c === undefined ? null : { riempimento: r, contorno: c };
}

/** La curva taglio–spostamento: `u` in mm (relativo a `u0`, come lo manda il server) e `V` in kN.
 *  `k` è l'indice del passo nella lista, cioè quello che la striscia e `←`/`→` scorrono.
 *
 *  La caduta porta **due** numeri, e non sono lo stesso. `n` è il passo come lo conta il server ed
 *  è quello che va nei testi; `k` è dove la curva si ferma ed è quello che va nel disegno. Con una
 *  caduta per non convergenza il passo caduto **non** sta in `passi[]`:
 *  `tests/test_pushover_binario.py:153` asserisce `caduta["passo"] == len(passi) + 1`, perché
 *  `nova/deck.py:980-984` dichiara la caduta e rompe il ciclo **prima** della riga che registra il
 *  passo. Stringere `passo − 1` alla lista e poi stamparlo darebbe «caduta al passo 109» dove il
 *  server dice 110 — e il 109 è un passo convergente, che risulterebbe caduto. Con
 *  `motivo: "passi_max"` invece il passo c'è (`caduta["passo"] == len(passi)`) e i due coincidono. */
export function curvaPushover(passi, caduta) {
  const lista = Array.isArray(passi) ? passi : [];
  const punti = lista.map((p, k) => ({ k, u: Number(p.spostamento) || 0, V: (Number(p.taglio_base) || 0) / 1e3 }));
  const uMax = punti.reduce((a, p) => Math.max(a, p.u), 0), vMax = punti.reduce((a, p) => Math.max(a, p.V), 0);
  const c = caduta && Number.isFinite(caduta.passo)
    ? { k: Math.min(lista.length - 1, Math.max(0, caduta.passo - 1)), n: caduta.passo,
        u: Number(caduta.spostamento) || 0, motivo: String(caduta.motivo ?? ""),
        // Story 50 chiede anche **quale algoritmo** si è arreso: il server lo scrive
        // (`nova/deck.py:982,997`, «l'ultimo tentato») e finora nessuno lo leggeva. Assente → il
        // trattino, la stessa grafia degli altri numeri che mancano.
        algoritmo: caduta.algoritmo ? String(caduta.algoritmo) : null } : null;
  return { punti, uMax, vMax, caduta: c };
}

// I due motivi che il server emette (`nova/deck.py:982,997`) scritti come si leggono. Uno che non
// è in tabella esce **grezzo**: una versione nuova del solutore ne porterà altri, e una stringa
// vuota o inventata al posto di un motivo vero è peggio di un identificatore brutto da leggere.
const MOTIVI = { non_convergenza: "non convergenza", passi_max: "tetto dei passi" };
// Un motivo vuoto o assente non è «nessun motivo»: la caduta c'è, e la riga non può tacere.
export const motivoInParole = (motivo) => MOTIVI[motivo] ?? (motivo ? String(motivo) : "motivo sconosciuto");

/** La legenda degli stati serve solo se **almeno un simbolo non è quello dell'elastica** (C7b): con
 *  tutte le sezioni elastiche i simboli sono tutti uguali e la riga che spiega i due canali è gergo
 *  — in aula, 114 px su tre righe, con «rotta» da sola sull'ultima. Uno stato senza simbolo
 *  (`simboloStato` rende `null`) non è uno stato diverso: il disegno lo salta, e la legenda pure. */
export const legendaStatiServe = (stati) => Object.values(stati ?? {}).flat()
  .some((s) => simboloStato(s) && (s.calcestruzzo !== "elastica" || s.acciaio !== "elastica"));

/** `compatta`: il testo dell'aula (15b, R18). Il testo lungo è di 119 caratteri e in aula va a
 *  quattro righe: 152 px che il telaio paga in altezza, perché la fascia delle strisce gli toglie
 *  riquadro. Una riga sola è il bersaglio.
 *
 *  **Il tetto è 38 caratteri, non 27.** In aula la striscia rende a **32 px**, non a 46:
 *  `stile.css:549` (`body[data-presentazione] #piano :is(…, .risultati-legenda, …)`, specificità
 *  (1,2,1)) batte il `font-size: var(--etichetta, 11px)` di `stile.css:110` (1,1,0). I 46 px sono le
 *  etichette dentro l'SVG, non queste strisce. Conto: 0,602 em × 32 px = 19,26 px per carattere, e
 *  nei 751 px utili di un piano a 1280×657 una riga ne tiene **38**. Misurato in Chrome il 13/09:
 *  27 caratteri resi larghi 520 px, cioè 19,26 px l'uno — stima e vero combaciano.
 *
 *  Con 38 caratteri i nomi ci stanno, e a 8 m un simbolo nudo non si decifra
 *  (`docs/ricerca/07-ux-modellatore.md:157`). `○` resta fuori per scelta: è la sezione **illesa**, e
 *  la legenda si mostra solo quando almeno un simbolo non è quello dell'elastica
 *  (`legendaStatiServe`) — chi la legge sta cercando i danneggiati. Alla scrivania il testo lungo ci
 *  sta, e resta quello. */
export const testoLegendaStati = (compatta = false) =>
  compatta
    ? "◐ fessurata ● schiacciata · ✕ rotta"
    : "calcestruzzo: ○ elastica · ◐ fessurata · ● schiacciata — acciaio: contorno sottile elastica · spesso snervata · ✕ rotta";

/** La forma modale del nodo nell'ispettore: adimensionale, senza unità e senza rotazioni. */
export function righeModo(modo, id) {
  const u = modo?.forma?.[String(id)];
  if (!Array.isArray(u) || u.length < 3) return [];
  // «adimensionale» scritto, non sottinteso: le righe accanto nell'ispettore sono spostamenti in
  // mm, e tre numeri di ordine uno senza unità si leggono come millimetri di una struttura ferma.
  return [[`forma modale (modo ${modo.n}, adimensionale)`, `ux ${conciso(u[0])} · uy ${conciso(u[1])} · uz ${conciso(u[2])}`]];
}

/** Viridis (matplotlib, van der Walt e Smith): percettiva, monotona in luminanza — si legge anche in
 *  bianco e nero (story 63, `docs/ricerca/07-ux-modellatore.md:154`). Dieci tappe, interpolate in RGB. */
export const VIRIDIS = ["#440154", "#482878", "#3e4989", "#31688e", "#26828e",
                        "#1f9e89", "#35b779", "#6ece58", "#b5de2b", "#fde725"];

export function viridis(t) {
  const x = Number.isFinite(t) ? Math.min(1, Math.max(0, t)) : 0;
  const pos = x * (VIRIDIS.length - 1);
  const i = Math.min(VIRIDIS.length - 2, Math.floor(pos)), f = pos - i;
  const a = parseInt(VIRIDIS[i].slice(1), 16), b = parseInt(VIRIDIS[i + 1].slice(1), 16);
  const canale = (sh) => Math.round(((a >> sh) & 255) * (1 - f) + ((b >> sh) & 255) * f);
  return `#${[16, 8, 0].map((sh) => canale(sh).toString(16).padStart(2, "0")).join("")}`;
}

export function massimoSpostamento(deformate) {
  let max = 0;
  for (const d of deformate ?? []) for (const p of d?.punti ?? []) if (Number.isFinite(p?.u) && p.u > max) max = p.u;
  return max;
}

export const coloreSpostamento = (u, uMax) => viridis(uMax > 0 ? u / uMax : 0);

/** Gli estremi della rampa viridis. C2 — «|u|» da solo è gergo da vicino e illeggibile da 8 m: la
 *  grandezza si scrive per nome. C3 — «max» davanti al numero perché il badge, due righe sopra,
 *  dice «u 60 mm» (lo spostamento del **nodo di controllo**) mentre qui c'è «64,34 mm» (il massimo
 *  di |u| su tutto il telaio): due numeri della stessa grandezza, e niente diceva quale fosse quale.
 *  Un modo non ha millimetri, e il suo titolo dice già cosa valgono 0 e 1: lì «max» sarebbe un terzo
 *  modo di dire la stessa cosa.
 *
 *  `compatta`: il testo dell'aula (15b, Task 3), gemello di `testoLegendaStati` e con lo stesso
 *  tetto — **38 caratteri, non 27**. In aula la striscia rende a **32 px**, non a 46: `stile.css:549`
 *  (`body[data-presentazione] #piano :is(…, .risultati-colori)`, specificità (1,2,1)) batte il
 *  `font-size: var(--etichetta, 11px)` del blocco a `stile.css:136` (1,1,0), e i 46 px sono le
 *  etichette dentro l'SVG, non queste strisce. Conto: 0,602 em × 32 px = 19,26 px per carattere, e
 *  nei 751 px utili di un piano a 1280×657 una riga ne tiene 38. Della riga fanno parte anche la
 *  rampa (6 em, cioè dieci caratteri del mono) e i tre `gap` da 0,4 em (due caratteri): col titolo
 *  intero la somma fa 43, la striscia va a capo su 89 px e si posa su «piede sx», «piede dx» e i loro
 *  cerchi — che non passano da `disponi`, e che nessun ostacolo può spostare. Con «|u|» la somma fa
 *  31, la striscia torna alta una riga e i piedi restano scoperti. Si perde la parola «spostamento»,
 *  che il simbolo ridice in tre caratteri; le unità no, quelle restano su entrambi gli estremi.
 *  Alla scrivania, dove i 43 caratteri ci stanno, il testo resta intero. */
export function testoScalaColori({ uMax, tipo, compatta = false }) {
  if (tipo === "modo") return { min: "0", max: "1", titolo: compatta ? "forma del modo" : "forma del modo · 0 fermo, 1 massimo" };
  return { min: "0 mm", max: `max ${conciso(Number.isFinite(uMax) ? uMax : 0)} mm`,
           titolo: compatta ? "|u|" : "spostamento |u|" };
}
