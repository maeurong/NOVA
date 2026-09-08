// La curva di un legame dai suoi parametri, e i valori da stampare accanto (story 22:
// «nessuna costante resti nascosta»). I parametri vengono dal server (`/api/materiale/legame`,
// `nova/legami.py`): qui non c'è un numero di norma, solo il disegno.

import { stampaNumero } from "./numeri.js";

/** `Concrete02`: parabola di Kent-Park fino al picco, retta fino a (εU, fpcu); trazione lineare
 *  fino a `ft` con `Ec`. Segni di OpenSees: compressione negativa. Ordinati per ε crescente. */
// `−0` non è un numero da mostrare né da confrontare: `epsc0 · 0` con `epsc0` negativo dà
// `-0`, e `assert/strict` lo distingue da `0` (misurato dall'architect). Si normalizza qui.
const zero = (v) => (v === 0 ? 0 : v);

export function puntiConcrete02({ fpc, epsc0, fpcu, epsU, ft = 0, Ec = null }, n = 24) {
  const punti = [[epsU, fpcu]];
  for (let i = n; i >= 0; i--) {
    const r = i / n;               // r = ε/ε0 in [0, 1], ε0 negativo
    punti.push([zero(epsc0 * r), zero(fpc * (2 * r - r * r))]);
  }
  if (ft > 0 && Ec) punti.push([ft / Ec, ft]);
  return punti;
}

/** `Steel02` come lo definisce la norma (§4.1.2.1.2.2 (a)): retta elastica fino a (εy, Fy),
 *  retta incrudente fino a (ε_ud, Fy + b·E·(ε_ud − εy)). La transizione R0 non si disegna. */
export function puntiSteel02({ Fy, E, b, eps_ud }) {
  const ey = Fy / E;
  return [[0, 0], [ey, Fy], [eps_ud, Fy + b * E * (eps_ud - ey)]];
}

export function valoriDaMostrare(lg) {
  if (lg.tipo === "concrete02") {
    return [["f_c", -lg.fpc, "MPa"], ["E_c", lg.Ec, "MPa"], ["ε_c0", -lg.epsc0, ""], ["ε_U", -lg.epsU, ""],
            ["f_cu", -lg.fpcu, "MPa"], ["f_t", lg.ft, "MPa"], ["λ", lg.lambda, ""]];
  }
  if (lg.tipo === "steel02") {
    return [["f_y", lg.Fy, "MPa"], ["E_s", lg.E, "MPa"], ["b", lg.b, ""], ["ε_ud", lg.eps_ud, ""], ["k", lg.k, ""]];
  }
  throw new Error(`legame sconosciuto: ${lg.tipo}`);
}

const cifre = (v) => stampaNumero(v, { decimali: Math.abs(v) < 1 ? 4 : 0, migliaia: true });

/** Un SVG con la curva, gli assi per lo zero e i due estremi stampati. Inchiostro su niente. */
export function svgCurva(punti, { larghezza = 220, altezza = 120 } = {}) {
  const m = 24;  // margine per le etichette
  if (punti.length === 0) return `<svg viewBox="0 0 ${larghezza} ${altezza}" width="${larghezza}" height="${altezza}" role="img" aria-label="nessuna curva"></svg>`;
  const es = punti.map((p) => p[0]), ss = punti.map((p) => p[1]);
  const e0 = Math.min(0, ...es), e1 = Math.max(0, ...es);
  const s0 = Math.min(0, ...ss), s1 = Math.max(0, ...ss);
  const de = Math.max(e1 - e0, 1e-9), ds = Math.max(s1 - s0, 1);
  const X = (e) => m + ((e - e0) / de) * (larghezza - 2 * m);
  const Y = (s) => altezza - m - ((s - s0) / ds) * (altezza - 2 * m);
  const d = punti.map(([e, s], i) => `${i === 0 ? "M" : "L"}${X(e).toFixed(1)} ${Y(s).toFixed(1)}`).join(" ");
  return `<svg viewBox="0 0 ${larghezza} ${altezza}" width="${larghezza}" height="${altezza}" role="img" aria-label="curva del legame">`
    + `<line x1="${m}" y1="${Y(0)}" x2="${larghezza - m}" y2="${Y(0)}" stroke="currentColor" stroke-opacity="0.35"/>`
    + `<line x1="${X(0)}" y1="${m}" x2="${X(0)}" y2="${altezza - m}" stroke="currentColor" stroke-opacity="0.35"/>`
    + `<path d="${d}" fill="none" stroke="currentColor" stroke-width="1.5"/>`
    + `<text x="${m}" y="${altezza - 6}" font-size="9" fill="currentColor">ε ${cifre(e0)}</text>`
    + `<text x="${larghezza - m}" y="${altezza - 6}" font-size="9" text-anchor="end" fill="currentColor">${cifre(e1)}</text>`
    + `<text x="2" y="${m}" font-size="9" fill="currentColor">${cifre(s1)} MPa</text>`
    + `<text x="2" y="${altezza - m}" font-size="9" fill="currentColor">${cifre(s0)}</text>`
    + `</svg>`;
}
