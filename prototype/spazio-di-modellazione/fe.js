// PROTOTIPO usa-e-getta (#8). Solutore di telaio piano XZ a rigidezza diretta:
// 3 gdl per nodo (ux, uz, ry), aste Eulero-Bernoulli, carichi nodali e
// distribuiti uniformi, incastri/cerniere/carrelli come gdl bloccati, modi
// per iterazione inversa con masse concentrate. Unità interne: N, m.
// ponytail: niente sparse, niente condensazione — un telaio 2×1 ha 18 gdl.

export function analizza(modello) {
  const { nodi, aste, sezioni, carichi } = modello;
  const idx = new Map(nodi.map((n, i) => [n.id, i]));
  const n = nodi.length * 3;
  const K = mat(n), F = new Float64Array(n);
  const E = 31.476e9; // C25/30 E_cm [Pa]
  const rho = 2500;   // kg/m³
  const el = [];
  for (const a of aste) {
    const ni = nodi[idx.get(a.i)], nj = nodi[idx.get(a.j)];
    const s = sezioni[a.sezione];
    const A = s.b * s.h, I = s.b * s.h ** 3 / 12;
    const dx = nj.x - ni.x, dz = nj.z - ni.z, L = Math.hypot(dx, dz);
    const c = dx / L, sn = dz / L;
    const kl = kLocale(E, A, I, L);
    const T = trasf(c, sn);
    const kg = mul(tr(T), mul(kl, T));
    const dof = [3 * idx.get(a.i), 3 * idx.get(a.i) + 1, 3 * idx.get(a.i) + 2, 3 * idx.get(a.j), 3 * idx.get(a.j) + 1, 3 * idx.get(a.j) + 2];
    for (let r = 0; r < 6; r++) for (let q = 0; q < 6; q++) K[dof[r]][dof[q]] += kg[r][q];
    // carico distribuito verticale (globale -z) uniforme q [N/m] → nodali equivalenti
    const q = carichi.filter((c) => c.tipo === "distribuito" && c.asta === a.id).reduce((t, c) => t + c.q, 0);
    let fl = [0, 0, 0, 0, 0, 0];
    if (q) {
      const qn = -q * c, qa = -q * sn; // componente normale (locale y = -z ruotata) e assiale
      // in locale: assiale uniforme qa, trasversale qn
      fl = [qa * L / 2, qn * L / 2, qn * L * L / 12, qa * L / 2, qn * L / 2, -qn * L * L / 12];
      const fg = mulv(tr(T), fl);
      for (let r = 0; r < 6; r++) F[dof[r]] += fg[r];
    }
    el.push({ a, ni, nj, L, c, sn, T, kl, dof, fl, q, A, rho });
  }
  for (const c of carichi) if (c.tipo === "nodale") {
    const i = idx.get(c.nodo); F[3 * i] += c.Fx || 0; F[3 * i + 1] += c.Fz || 0; F[3 * i + 2] += c.My || 0;
  }
  const bloccati = new Set();
  nodi.forEach((nd, i) => { const v = nd.vincolo; if (v) { if (v.ux) bloccati.add(3 * i); if (v.uz) bloccati.add(3 * i + 1); if (v.ry) bloccati.add(3 * i + 2); } });
  if (bloccati.size === 0) return { errore: "nessun vincolo: il telaio è un moto rigido" };
  const liberi = [...Array(n).keys()].filter((d) => !bloccati.has(d));
  const Kr = liberi.map((r) => liberi.map((q) => K[r][q]));
  const Fr = liberi.map((r) => F[r]);
  const ur = risolvi(Kr, Fr);
  if (!ur) return { errore: "matrice singolare: parte del telaio è libera di muoversi" };
  const u = new Float64Array(n); liberi.forEach((d, k) => (u[d] = ur[k]));
  // reazioni = K u − F sui gdl bloccati
  const reazioni = {};
  nodi.forEach((nd, i) => {
    if (!nd.vincolo) return;
    const r = [0, 1, 2].map((k) => { const d = 3 * i + k; let s = 0; for (let q = 0; q < n; q++) s += K[d][q] * u[q]; return s - F[d]; });
    reazioni[nd.id] = { Rx: r[0], Rz: r[1], My: r[2] };
  });
  // sollecitazioni per asta: forze d'estremità locali, poi M(x) con q
  const sollecitazioni = {};
  for (const e of el) {
    const ug = e.dof.map((d) => u[d]);
    const ul = mulv(e.T, ug);
    const f = mulv(e.kl, ul).map((v, k) => v - e.fl[k]); // locali: [N_i, V_i, M_i, N_j, V_j, M_j]
    const qn = -e.q * e.c;
    const stazioni = [];
    const NP = 21;
    for (let k = 0; k < NP; k++) {
      const x = (e.L * k) / (NP - 1);
      // convenzione: M positivo = fibre inferiori tese (lato +y locale in basso)
      const M = -f[2] + f[1] * x + qn * x * x / 2;
      const V = f[1] + qn * x;
      const N = -f[0];
      stazioni.push({ x_rel: k / (NP - 1), N, V, M });
    }
    sollecitazioni[e.a.id] = { stazioni, Mmax: Math.max(...stazioni.map((s) => Math.abs(s.M))) };
  }
  const spostamenti = {};
  nodi.forEach((nd, i) => (spostamenti[nd.id] = { ux: u[3 * i], uz: u[3 * i + 1], ry: u[3 * i + 2] }));
  const umax = Math.max(...nodi.map((nd) => Math.hypot(spostamenti[nd.id].ux, spostamenti[nd.id].uz)));
  const sommaF = { Fx: 0, Fz: 0 }; for (let i = 0; i < nodi.length; i++) { sommaF.Fx += F[3 * i]; sommaF.Fz += F[3 * i + 1]; }
  const sommaR = Object.values(reazioni).reduce((t, r) => ({ Fx: t.Fx + r.Rx, Fz: t.Fz + r.Rz }), { Fx: 0, Fz: 0 });
  // modi: masse concentrate (metà asta per nodo), rotazionale m L²/24
  const M = new Float64Array(n);
  for (const e of el) {
    const m = e.rho * e.A * e.L;
    for (const [ii, k] of [[e.dof[0], 0], [e.dof[3], 3]]) { M[ii] += m / 2; M[ii + 1] += m / 2; M[ii + 2] += (m * e.L * e.L) / 24; }
  }
  const modi = modiPropri(Kr, liberi.map((d) => M[d]), 3).map((md) => {
    const forma = {}; const phi = new Float64Array(n); liberi.forEach((d, k) => (phi[d] = md.phi[k]));
    let mx = 0; nodi.forEach((nd, i) => { mx = Math.max(mx, Math.hypot(phi[3 * i], phi[3 * i + 1])); });
    nodi.forEach((nd, i) => (forma[nd.id] = { ux: phi[3 * i] / (mx || 1), uz: phi[3 * i + 1] / (mx || 1) }));
    // massa partecipante in x e z
    const part = (dir) => { let L = 0, Mn = 0; liberi.forEach((d, k) => { const mm = M[d]; if (d % 3 === dir) L += mm * md.phi[k]; Mn += mm * md.phi[k] * md.phi[k]; }); return (L * L) / Mn; };
    return { f: Math.sqrt(md.lambda) / (2 * Math.PI), forma, mx: part(0), mz: part(1) };
  });
  const mtot = { x: 0, z: 0 }; for (let i = 0; i < nodi.length; i++) { if (!bloccati.has(3 * i)) mtot.x += M[3 * i]; if (!bloccati.has(3 * i + 1)) mtot.z += M[3 * i + 1]; }
  modi.forEach((m) => { m.px = m.mx / mtot.x; m.pz = m.mz / mtot.z; });
  return { spostamenti, reazioni, sollecitazioni, umax, sommaF, sommaR, modi, gdl: liberi.length };
}

function kLocale(E, A, I, L) {
  const a = (E * A) / L, b = (12 * E * I) / L ** 3, c = (6 * E * I) / L ** 2, d = (4 * E * I) / L, e = (2 * E * I) / L;
  return [
    [a, 0, 0, -a, 0, 0],
    [0, b, c, 0, -b, c],
    [0, c, d, 0, -c, e],
    [-a, 0, 0, a, 0, 0],
    [0, -b, -c, 0, b, -c],
    [0, c, e, 0, -c, d],
  ];
}
// locale x lungo l'asta, locale y = z globale ruotato (positivo verso il "basso" della trave orizzontale, cioè -z)
function trasf(c, s) {
  return [
    [c, s, 0, 0, 0, 0],
    [-s, c, 0, 0, 0, 0],
    [0, 0, 1, 0, 0, 0],
    [0, 0, 0, c, s, 0],
    [0, 0, 0, -s, c, 0],
    [0, 0, 0, 0, 0, 1],
  ];
}
const mat = (n) => Array.from({ length: n }, () => new Float64Array(n));
const tr = (A) => A[0].map((_, j) => A.map((r) => r[j]));
const mul = (A, B) => A.map((r) => B[0].map((_, j) => r.reduce((s, v, k) => s + v * B[k][j], 0)));
const mulv = (A, v) => A.map((r) => r.reduce((s, x, k) => s + x * v[k], 0));

function risolvi(A, b) {
  const n = b.length, M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-12) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c] / M[c][c]; if (f) for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
  }
  return M.map((r, i) => r[n] / r[i]);
}

// Iterazione inversa con deflazione di Gram-Schmidt in metrica M (diagonale).
function modiPropri(K, m, quanti) {
  const n = m.length, out = [];
  for (let k = 0; k < quanti && k < n; k++) {
    let v = Array.from({ length: n }, (_, i) => Math.sin(i * 1.7 + k));
    let lambda = 0;
    for (let it = 0; it < 200; it++) {
      for (const p of out) { const a = dot(v, p.phi, m) / dot(p.phi, p.phi, m); v = v.map((x, i) => x - a * p.phi[i]); }
      const w = risolvi(K, v.map((x, i) => x * m[i]));
      if (!w) return out;
      const nrm = Math.sqrt(dot(w, w, m)); v = w.map((x) => x / nrm);
      const Kv = mulv(K, v); const l = dot(v, Kv, null) / dot(v, v, m);
      if (Math.abs(l - lambda) < 1e-9 * l) { lambda = l; break; } lambda = l;
    }
    out.push({ lambda, phi: v });
  }
  return out;
}
const dot = (a, b, m) => a.reduce((s, x, i) => s + x * b[i] * (m ? m[i] : 1), 0);

// verifica minima: trave appoggiata L=6, q=10 kN/m → M_max = qL²/8 = 45 kN·m, f = 5qL⁴/(384EI)
export function autotest() {
  const s = { b: 0.3, h: 0.5 };
  const m = {
    nodi: [{ id: "N1", x: 0, z: 0, vincolo: { ux: 1, uz: 1, ry: 0 } }, { id: "N2", x: 3, z: 0 }, { id: "N3", x: 6, z: 0, vincolo: { ux: 0, uz: 1, ry: 0 } }],
    aste: [{ id: "A1", i: "N1", j: "N2", sezione: "S" }, { id: "A2", i: "N2", j: "N3", sezione: "S" }],
    sezioni: { S: s }, carichi: [{ tipo: "distribuito", asta: "A1", q: 10e3 }, { tipo: "distribuito", asta: "A2", q: 10e3 }],
  };
  const r = analizza(m);
  const Mmez = r.sollecitazioni.A1.stazioni[20].M;
  const EI = 31.476e9 * s.b * s.h ** 3 / 12;
  const fatteso = (5 * 10e3 * 6 ** 4) / (384 * EI);
  const ok = Math.abs(Mmez - 45e3) < 1 && Math.abs(-r.spostamenti.N2.uz - fatteso) / fatteso < 1e-6;
  console.assert(ok, "fe.js: trave appoggiata", Mmez, r.spostamenti.N2.uz, fatteso);
  return ok;
}
