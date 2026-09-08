// La geometria della sezione rettangolare come la vede il deck: y lungo b, z lungo h, dal
// baricentro. **La regola è una** e sta in `nova/deck.py:_barre` (righe 200-274) con
// `meshrec/core/armatura.py:_fila` (256-272): qui è ricopiata riga per riga, e la fixture
// `tests/fixture/barre_300x500.json` la prova da tutti e due i lati. Se divergono, il disegno
// dell'ispettore mente sul deck — che è peggio di non disegnare.

import { leggiLunghezza, stampaNumero } from "./numeri.js";

export const LATI = ["inf", "sup", "sx", "dx"];
export const VESTI = ["caratteristica", "media", "progetto", "esistente"];

/** Scostamento di una barra dal filo esterno: copriferro alla staffa + staffa (`armatura.py:169`). */
const scostamento = (s) => s.copriferro + s.staffe.diametro;
const mm = (v) => stampaNumero(v, { decimali: 0, migliaia: true });

/** «b × h» in millimetri, con `x`, `×` o `*` in mezzo e le unità di `leggiLunghezza` (P9).
 *  Esattamente due misure positive, o `null`: con tre la terza sparirebbe in silenzio. */
export function leggiDimensioni(testo) {
  const parti = String(testo ?? "").split(/[x×*]/i);
  if (parti.length !== 2) return null;
  const [b, h] = parti.map((p) => leggiLunghezza(p.trim()));
  return b > 0 && h > 0 ? { b, h } : null;
}

/** Il motivo per cui il deck rifiuterebbe questa armatura, o `null`. Le stesse guardie di
 *  `deck._barre` (copriferri opposti su h per tutte le file, su b per sx/dx) e di
 *  `armatura._fila` (n·Ø nella luce fra le staffe, solo inf/sup: sx/dx là non sono verificate). */
export function geometriaImpossibile(s) {
  // `deck.py:227-230`: il lato doppio si rifiuta prima di ogni altro conto, anche senza staffe.
  for (const lato of LATI) {
    if (s.file.filter((f) => f.lato === lato).length > 1) return `due file sul lato ${lato}: una fila per lato`;
  }
  if (!s.staffe || s.file.length === 0) return null;  // senza staffe non c'è barra da collocare
  const st = scostamento(s);
  for (const [quota, dim, gruppo] of [["h", s.h, LATI], ["b", s.b, ["sx", "dx"]]]) {
    const diametri = s.file.filter((f) => gruppo.includes(f.lato)).map((f) => f.diametro);
    if (diametri.length === 0) continue;
    const mezza = Math.max(...diametri) / 2;
    const ingombro = st + mezza;
    if (2 * ingombro >= dim) {
      return `i copriferri opposti si sovrappongono su ${quota} (copriferro ${mm(s.copriferro)} + staffa ${mm(s.staffe.diametro)} + mezza barra ${stampaNumero(mezza, { decimali: 1 })} = ${mm(ingombro)} mm, metà di ${quota} = ${mm(dim / 2)} mm)`;
    }
  }
  const luce = s.b - 2 * st;
  for (const f of s.file) {
    if ((f.lato === "inf" || f.lato === "sup") && f.n * f.diametro > luce) {
      return `${f.n} barre da ${mm(f.diametro)} mm ingombrano ${mm(f.n * f.diametro)} mm e fra le staffe ce ne sono ${mm(luce)}`;
    }
  }
  return null;
}

/** Le barre nel piano della sezione, `{y, z, diametro}` dal baricentro. Vuoto senza staffe,
 *  senza file, o con una geometria impossibile: il deck in quei casi non ne colloca nessuna. */
export function posizioniBarre(s) {
  if (!s.staffe || s.file.length === 0 || geometriaImpossibile(s)) return [];
  const st = scostamento(s);
  const luce = s.b - 2 * st;
  // `armatura._fila`: interferro costante, le due estreme a filo, una sola sta in mezzo
  const fila = (f, z) => {
    if (f.n === 1) return [{ y: 0, z, diametro: f.diametro }];
    const passo = (luce - f.diametro) / (f.n - 1);
    const primo = -s.b / 2 + st + f.diametro / 2;
    return Array.from({ length: f.n }, (_, i) => ({ y: primo + i * passo, z, diametro: f.diametro }));
  };
  const barre = [];
  for (const f of s.file) {
    if (f.lato === "inf") barre.push(...fila(f, -(s.h / 2 - st - f.diametro / 2)));
    if (f.lato === "sup") barre.push(...fila(f, s.h / 2 - st - f.diametro / 2));
  }
  // sx/dx: a filo dei lati, equidistanti fra i due strati (`deck.py:266-273`)
  for (const [lato, segno] of [["sx", -1], ["dx", 1]]) {
    const f = s.file.find((k) => k.lato === lato);
    if (!f) continue;
    const y = segno * (s.b / 2 - st - f.diametro / 2);
    const z0 = -(s.h / 2 - st - f.diametro / 2);
    const passo = (-2 * z0) / (f.n + 1);
    for (let k = 0; k < f.n; k++) barre.push({ y, z: z0 + passo * (k + 1), diametro: f.diametro });
  }
  return barre;
}

/** Il contorno dopo la riduzione: restringe, non sposta le barre (glossario «Riduzione»). */
export function contornoRidotto(s) {
  const r = s.riduzione ?? { sup: 0, inf: 0, sx: 0, dx: 0 };
  return { y0: -s.b / 2 + (r.sx ?? 0), y1: s.b / 2 - (r.dx ?? 0), z0: -s.h / 2 + (r.inf ?? 0), z1: s.h / 2 - (r.sup ?? 0) };
}

/** Il disegno: contorno nominale, contorno ridotto tratteggiato se c'è riduzione, staffa al
 *  copriferro, una circonferenza per barra, «b × h» sotto. Un SVG in scala, inchiostro su
 *  niente: il rosso qui non ha posto, un disegno non è un'attenzione. z cresce in su, come
 *  nel piano di lavoro. */
export function svgSezione(s, { lato = 180 } = {}) {
  const scala = lato / Math.max(s.b, s.h);
  const X = (y) => y * scala, Y = (z) => -z * scala;
  const rect = (y0, y1, z0, z1, extra = "") =>
    `<rect x="${X(y0)}" y="${Y(z1)}" width="${(y1 - y0) * scala}" height="${(z1 - z0) * scala}" fill="none" stroke="currentColor" ${extra}/>`;
  const mezzo = lato / 2 + 10;
  const parti = [rect(-s.b / 2, s.b / 2, -s.h / 2, s.h / 2, 'stroke-width="1.5"')];
  const c = contornoRidotto(s);
  if (s.riduzione && (c.y0 !== -s.b / 2 || c.y1 !== s.b / 2 || c.z0 !== -s.h / 2 || c.z1 !== s.h / 2)) {
    parti.push(rect(c.y0, c.y1, c.z0, c.z1, 'stroke-dasharray="4 3"'));
  }
  if (s.staffe) {
    const k = s.copriferro;
    parti.push(rect(-s.b / 2 + k, s.b / 2 - k, -s.h / 2 + k, s.h / 2 - k, `rx="${s.staffe.diametro * scala}" stroke-width="${Math.max(1, s.staffe.diametro * scala)}"`));
  }
  for (const b of posizioniBarre(s)) {
    parti.push(`<circle cx="${X(b.y)}" cy="${Y(b.z)}" r="${(b.diametro / 2) * scala}" fill="currentColor"/>`);
  }
  parti.push(`<text x="0" y="${lato / 2 + 14}" text-anchor="middle" font-size="11" fill="currentColor">${mm(s.b)} × ${mm(s.h)} mm</text>`);
  return `<svg viewBox="${-mezzo} ${-mezzo} ${2 * mezzo} ${2 * mezzo + 8}" width="${2 * mezzo}" height="${2 * mezzo + 8}" role="img" aria-label="sezione ${mm(s.b)} per ${mm(s.h)} millimetri">${parti.join("")}</svg>`;
}
