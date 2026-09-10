// Le etichette dei risultati posate senza sovrapporsi: priorità, otto versi a tre distanze — i
// quattro assiali, poi le quattro diagonali —, linea guida oltre il primo passo e sempre in
// diagonale, nascosta quando non c'è posto. Deterministico: stessi ingressi, stesso disegno
// (`piano.js`, «a parità di punteggio vince la prima»).
//
// Coordinate dello schermo SVG (`y` in basso), in mm del `viewBox`: chi chiama converte i pixel.

export const siSovrappongono = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

/** |v| sotto `soglia` del massimo in modulo. Con massimo nullo o non finito tutto è sotto soglia:
 *  di un diagramma piatto non si scrive niente. */
export const sottoSoglia = (v, massimo, soglia = 0.02) =>
  !massimo || !Number.isFinite(v) || !Number.isFinite(massimo) || Math.abs(v) < soglia * Math.abs(massimo);

// I quattro versi assiali, nell'ordine fisso in cui si provano: sopra, destra, sotto, sinistra.
const ASSIALI = [
  { dx: 0, dy: -1, ancora: "middle" },
  { dx: 1, dy: 0, ancora: "start" },
  { dx: 0, dy: 1, ancora: "middle" },
  { dx: -1, dy: 0, ancora: "end" },
];

// E quattro diagonali, **dopo** gli assiali e nel loro ordine fisso: alto-destra, basso-destra,
// basso-sinistra, alto-sinistra. Servono da quando anche le linee dei diagrammi sono ostacoli: alla
// base di un pilastro del MURO 1 il nome del nodo, il simbolo del vincolo e le ordinate di due aste
// prendono tutti e quattro gli assi a tutte e tre le distanze, e il picco spariva del tutto.
// In diagonale il posto c'è, e ci si arriva con la guida — che lì serve davvero, perché fuori
// dagli assi il legame fra il numero e il suo punto non si legge da sé.
const DIAGONALI = [
  { dx: 1, dy: -1, ancora: "start" },
  { dx: 1, dy: 1, ancora: "start" },
  { dx: -1, dy: 1, ancora: "end" },
  { dx: -1, dy: -1, ancora: "end" },
];

/** L'ordine in cui provare gli otto versi. Con un `preferito` — un versore in coordinate schermo,
 *  che non serve normalizzare — si parte dall'**assiale** che gli somiglia di più, e gli altri
 *  restano nel solito ordine: chi chiede sa da che parte è il vuoto (un picco lo punta fuori dal
 *  proprio diagramma) ma non deve poter imporre una posizione occupata. A parità di somiglianza
 *  vince il primo dei quattro, così il disegno resta identico a parità di stato. Le diagonali
 *  vengono dopo, sempre nello stesso ordine: sono il ripiego, non una scelta. */
const versiPer = (preferito) => {
  if (!Number.isFinite(preferito?.dx) || !Number.isFinite(preferito?.dy)) return [...ASSIALI, ...DIAGONALI];
  let migliore = ASSIALI[0], punteggio = -Infinity;
  for (const v of ASSIALI) {
    const p = v.dx * preferito.dx + v.dy * preferito.dy;
    if (p > punteggio) { punteggio = p; migliore = v; }
  }
  return [migliore, ...ASSIALI.filter((v) => v !== migliore), ...DIAGONALI];
};

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
      const versi = versiPer(r.preferito);
      cerca: for (const multiplo of [1, 2, 3]) {
        for (const v of versi) {
          const d = passo * multiplo;
          // Il punto d'ancoraggio: a un passo dal bordo del testo, non dal suo centro.
          const x = r.x + v.dx * d, y = r.y + v.dy * (d + (v.dy ? altezza / 2 : 0));
          const box = boxDi(x, y, v.ancora, larghezza, altezza);
          if (!dentro(box)) continue;
          if ([...listaOstacoli, ...posate.map((p) => p.box)].some((o) => siSovrappongono(box, o))) continue;
          // La guida arriva al bordo del box che guarda il punto: da sopra è `y1`, da sotto `y0`.
          const bordo = v.dy < 0 ? box.y1 : box.y0;
          // Guida da oltre il primo passo, e **sempre** in diagonale: lì l'etichetta non sta su
          // nessuno dei due assi del punto, e senza un filo che la lega si legge come un numero
          // qualunque messo in un buco.
          const guida = multiplo === 1 && !(v.dx && v.dy) ? null
            : { x1: r.x, y1: r.y, x2: v.dx ? x : r.x, y2: v.dy ? bordo : r.y };
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
