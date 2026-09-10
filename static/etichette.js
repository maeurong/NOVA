// Le etichette dei risultati posate senza sovrapporsi: priorità, quattro versi a tre distanze,
// linea guida oltre il primo passo, nascosta quando non c'è posto. Deterministico: stessi
// ingressi, stesso disegno (`piano.js`, «a parità di punteggio vince la prima»).
//
// Coordinate dello schermo SVG (`y` in basso), in mm del `viewBox`: chi chiama converte i pixel.

export const siSovrappongono = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

/** |v| sotto `soglia` del massimo in modulo. Con massimo nullo o non finito tutto è sotto soglia:
 *  di un diagramma piatto non si scrive niente. */
export const sottoSoglia = (v, massimo, soglia = 0.02) =>
  !massimo || !Number.isFinite(v) || !Number.isFinite(massimo) || Math.abs(v) < soglia * Math.abs(massimo);

// I quattro versi, nell'ordine fisso in cui si provano: sopra, destra, sotto, sinistra.
const VERSI = [
  { dx: 0, dy: -1, ancora: "middle" },
  { dx: 1, dy: 0, ancora: "start" },
  { dx: 0, dy: 1, ancora: "middle" },
  { dx: -1, dy: 0, ancora: "end" },
];

/** Il box di un testo ancorato in (x, y): `y` è il **centro verticale** del box, e chi disegna
 *  scrive il `<text>` con `dominant-baseline: middle`. Un solo modo di stare, così il box che
 *  si controlla e il testo che si vede combaciano. */
function boxDi(x, y, ancora, larghezza, altezza) {
  const x0 = ancora === "middle" ? x - larghezza / 2 : ancora === "end" ? x - larghezza : x;
  return { x0, y0: y - altezza / 2, x1: x0 + larghezza, y1: y + altezza / 2 };
}

/** `limiti` (facoltativi, `{x0, y0, x1, y1}`) sono il riquadro che ritaglia il disegno: una
 *  posizione il cui box ne esce si scarta come se collidesse. Senza, un'etichetta spinta oltre il
 *  bordo esce `nascosta: false` e poi sparisce nel ritaglio — posata per chi la posa, invisibile
 *  a chi guarda, e il posto che occupa resta prenotato contro le altre. */
export function disponi(richieste, ostacoli = [], { passo = 6, limiti = null } = {}) {
  const dentro = (b) => !limiti || (b.x0 >= limiti.x0 && b.y0 >= limiti.y0 && b.x1 <= limiti.x1 && b.y1 <= limiti.y1);
  const lista = Array.isArray(richieste) ? richieste : [];
  const listaOstacoli = Array.isArray(ostacoli) ? ostacoli : [];
  const priorita = (r) => (Number.isFinite(r.priorita) ? r.priorita : 0);
  const ordine = lista.map((r, k) => ({ r, k })).sort((a, b) => priorita(b.r) - priorita(a.r) || a.k - b.k);
  const posate = [];
  const fuori = new Array(lista.length);
  for (const { r, k } of ordine) {
    const larghezza = Math.max(0, r.larghezza ?? 0), altezza = Math.max(0, r.altezza ?? 0);
    let scelta = null;
    if (Number.isFinite(r.x) && Number.isFinite(r.y)) {
      cerca: for (const multiplo of [1, 2, 3]) {
        for (const v of VERSI) {
          const d = passo * multiplo;
          // Il punto d'ancoraggio: a un passo dal bordo del testo, non dal suo centro.
          const x = r.x + v.dx * d, y = r.y + v.dy * (d + (v.dy ? altezza / 2 : 0));
          const box = boxDi(x, y, v.ancora, larghezza, altezza);
          if (!dentro(box)) continue;
          if ([...listaOstacoli, ...posate.map((p) => p.box)].some((o) => siSovrappongono(box, o))) continue;
          const guida = multiplo === 1 ? null : { x1: r.x, y1: r.y, x2: v.dx ? x : r.x, y2: v.dy ? (v.dy < 0 ? box.y1 : box.y0) : r.y };
          scelta = { x, y, ancora: v.ancora, box, guida };
          break cerca;
        }
      }
    }
    const posta = scelta
      ? { id: r.id, testo: r.testo, nascosta: false, ...scelta }
      : { id: r.id, testo: r.testo, nascosta: true, x: null, y: null, ancora: null, box: null, guida: null };
    if (scelta) posate.push(posta);
    fuori[k] = posta;
  }
  return fuori;
}
