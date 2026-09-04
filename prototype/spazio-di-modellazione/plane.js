// PROTOTIPO usa-e-getta (#8). Vista del piano di lavoro XZ in SVG: griglia con
// snap, nodi, aste, vincoli, carichi, ghost prima del commit, deformata con
// scala dichiarata, diagramma M sul lato teso, modi animati. Lo spazio 3D sta
// in space.js (three.js): il foglio da disegno è terreno dell'SVG.
import { SEZIONI, kN, fmt, ingombro } from "./model.js";

const NS = "http://www.w3.org/2000/svg";
const el = (tag, attrs = {}, parent) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
};

export class Piano {
  constructor(contenitore, stato, opzioni = {}) {
    this.c = contenitore; this.s = stato; this.o = { snap: 0.5, etichette: true, ...opzioni };
    this.svg = el("svg", { class: "piano" }, contenitore);
    this.gGriglia = el("g", {}, this.svg);
    this.gModello = el("g", {}, this.svg);
    this.gRisultati = el("g", {}, this.svg);
    this.gGhost = el("g", {}, this.svg);
    this.gTesti = el("g", {}, this.svg);
    this.scala = 60; this.ox = 120; this.oz = 0; // px per metro; origine schermo
    this.ghost = null; this.hover = null; this.tempo = 0; this.animazione = null;
    this.ascoltatori = {};
    this._eventi();
    new ResizeObserver(() => { this.fit(); this.render(); }).observe(contenitore);
  }
  on(nome, f) { this.ascoltatori[nome] = f; }
  // ---- trasformazioni ----
  aSchermo(x, z) { const r = this.c.getBoundingClientRect(); return [this.ox + x * this.scala, r.height - this.oz - z * this.scala]; }
  aMondo(px, py) { const r = this.c.getBoundingClientRect(); return [(px - this.ox) / this.scala, (r.height - this.oz - py) / this.scala]; }
  snap(x, z) { const s = this.o.snap; return [Math.round(x / s) * s, Math.round(z / s) * s]; }
  fit() {
    const r = this.c.getBoundingClientRect(); if (!r.width) return;
    const b = ingombro(this.s.modello);
    const M = { sx: 80, dx: 80, alto: 90, basso: 70, ...(this.o.margini || {}) };
    const W = r.width - M.sx - M.dx, H = r.height - M.alto - M.basso;
    this.scala = Math.min(W / b.w, H / b.h, 110);
    this.ox = M.sx + (W - b.w * this.scala) / 2 - b.x0 * this.scala;
    this.oz = M.basso + (H - b.h * this.scala) / 2 - b.z0 * this.scala;
  }
  // ---- eventi ----
  _eventi() {
    const svg = this.svg; let pan = null;
    svg.addEventListener("pointermove", (ev) => {
      const r = this.c.getBoundingClientRect(); const px = ev.clientX - r.left, py = ev.clientY - r.top;
      if (pan) { this.ox = pan.ox + (px - pan.px); this.oz = pan.oz - (py - pan.py); this.render(); return; }
      const [x, z] = this.aMondo(px, py); const [sx, sz] = this.snap(x, z);
      const colpito = this.colpisci(px, py);
      this.hover = { x, z, sx, sz, px, py, colpito };
      this.ascoltatori.hover?.(this.hover);
      this.renderGhost();
    });
    svg.addEventListener("pointerdown", (ev) => {
      if (ev.button === 1 || (ev.button === 0 && ev.altKey)) { pan = { px: ev.clientX - this.c.getBoundingClientRect().left, py: ev.clientY - this.c.getBoundingClientRect().top, ox: this.ox, oz: this.oz }; svg.setPointerCapture(ev.pointerId); return; }
      if (ev.button !== 0) return;
      const r = this.c.getBoundingClientRect(); const px = ev.clientX - r.left, py = ev.clientY - r.top;
      const [x, z] = this.aMondo(px, py); const [sx, sz] = this.snap(x, z);
      this.ascoltatori.click?.({ x, z, sx, sz, px, py, colpito: this.colpisci(px, py), shift: ev.shiftKey });
    });
    svg.addEventListener("pointerup", () => { pan = null; });
    svg.addEventListener("wheel", (ev) => {
      ev.preventDefault();
      const r = this.c.getBoundingClientRect(); const px = ev.clientX - r.left, py = ev.clientY - r.top;
      const [x, z] = this.aMondo(px, py);
      this.scala = Math.max(15, Math.min(400, this.scala * (ev.deltaY < 0 ? 1.1 : 1 / 1.1)));
      const [nx, ny] = this.aSchermo(x, z); this.ox += px - nx; this.oz -= py - ny; this.render();
    }, { passive: false });
    svg.addEventListener("pointerleave", () => { this.hover = null; this.renderGhost(); this.ascoltatori.hover?.(null); });
  }
  colpisci(px, py) {
    const m = this.s.modello;
    for (const n of m.nodi) { const [x, y] = this.aSchermo(n.x, n.z); if (Math.hypot(px - x, py - y) < 9) return { tipo: "nodo", id: n.id }; }
    let best = null, bd = 7;
    for (const a of m.aste) {
      const ni = m.nodi.find((n) => n.id === a.i), nj = m.nodi.find((n) => n.id === a.j); if (!ni || !nj) continue;
      const [x1, y1] = this.aSchermo(ni.x, ni.z), [x2, y2] = this.aSchermo(nj.x, nj.z);
      const d = distSeg(px, py, x1, y1, x2, y2); if (d < bd) { bd = d; best = { tipo: "asta", id: a.id }; }
    }
    return best;
  }
  // ---- disegno ----
  render() {
    const r = this.c.getBoundingClientRect(); if (!r.width) return;
    this.renderGriglia(r); this.renderModello(); this.renderRisultati(); this.renderGhost();
    this.ascoltatori.render?.();
  }
  renderGriglia(r) {
    const g = this.gGriglia; g.innerHTML = "";
    const passo = this.o.snap * this.scala; if (passo < 6) return;
    const [x0, z1] = this.aMondo(0, 0), [x1, z0] = this.aMondo(r.width, r.height);
    const s = this.o.snap; const forte = 1; // metro
    for (let x = Math.floor(x0 / s) * s; x <= x1; x += s) {
      const [px] = this.aSchermo(x, 0); const m = Math.abs(x % forte) < 1e-6;
      el("line", { x1: px, y1: 0, x2: px, y2: r.height, stroke: m ? "#c9c7c1" : "#d5d3ce", "stroke-width": m ? 1 : .5 }, g);
    }
    for (let z = Math.floor(z0 / s) * s; z <= z1; z += s) {
      const [, py] = this.aSchermo(0, z); const m = Math.abs(z % forte) < 1e-6;
      el("line", { x1: 0, y1: py, x2: r.width, y2: py, stroke: m ? "#c9c7c1" : "#d5d3ce", "stroke-width": m ? 1 : .5 }, g);
    }
    // assi
    const [ax, ay] = this.aSchermo(0, 0);
    el("line", { x1: ax - 8, y1: ay, x2: ax + 26, y2: ay, stroke: "#8a8985", "stroke-width": 1 }, g);
    el("line", { x1: ax, y1: ay + 8, x2: ax, y2: ay - 26, stroke: "#8a8985", "stroke-width": 1 }, g);
    el("text", { x: ax + 28, y: ay + 4, "font-family": "SF Mono, Menlo, monospace", "font-size": 10, fill: "#8a8985" }, g).textContent = "x";
    el("text", { x: ax + 4, y: ay - 28, "font-family": "SF Mono, Menlo, monospace", "font-size": 10, fill: "#8a8985" }, g).textContent = "z";
  }
  renderModello() {
    const g = this.gModello; g.innerHTML = ""; const t = this.gTesti; t.innerHTML = "";
    const m = this.s.modello, sel = this.s.selezione;
    const deform = this.deformazione();
    const pos = (n) => { const d = deform?.(n.id) || { ux: 0, uz: 0 }; return this.aSchermo(n.x + d.ux, n.z + d.uz); };
    // ombra indeformata
    if (deform) for (const a of m.aste) {
      const ni = m.nodi.find((n) => n.id === a.i), nj = m.nodi.find((n) => n.id === a.j); if (!ni || !nj) continue;
      const [x1, y1] = this.aSchermo(ni.x, ni.z), [x2, y2] = this.aSchermo(nj.x, nj.z);
      el("line", { x1, y1, x2, y2, stroke: "#a9a8a3", "stroke-width": 1, "stroke-dasharray": "4 4" }, g);
    }
    for (const a of m.aste) {
      const ni = m.nodi.find((n) => n.id === a.i), nj = m.nodi.find((n) => n.id === a.j); if (!ni || !nj) continue;
      const attiva = sel?.tipo === "asta" && sel.id === a.id;
      const hov = this.hover?.colpito?.tipo === "asta" && this.hover.colpito.id === a.id;
      const pts = deform ? this.curvaDeformata(a, ni, nj, deform) : [pos(ni), pos(nj)];
      el("polyline", { points: pts.map((p) => p.join(",")).join(" "), fill: "none", stroke: attiva ? "#b8321e" : "#141414", "stroke-width": attiva ? 4.5 : hov ? 4 : 3, "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
      if (this.o.etichette) {
        const [x1, y1] = pos(ni), [x2, y2] = pos(nj); const vert = Math.abs(x2 - x1) < 1;
        this.testo(t, (x1 + x2) / 2 + (vert ? 12 : 0), (y1 + y2) / 2 + (vert ? 4 : -9), a.id, attiva ? "#b8321e" : "#141414", vert ? "start" : "middle");
      }
    }
    // carichi
    for (const c of m.carichi) {
      if (c.tipo === "distribuito") {
        const a = m.aste.find((a) => a.id === c.asta); if (!a) continue;
        const ni = m.nodi.find((n) => n.id === a.i), nj = m.nodi.find((n) => n.id === a.j);
        const [x1, y1] = pos(ni), [x2, y2] = pos(nj); const L = Math.hypot(x2 - x1, y2 - y1); const n = Math.max(2, Math.floor(L / 34));
        const h = 34;
        for (let k = 0; k <= n; k++) { const x = x1 + ((x2 - x1) * k) / n, y = y1 + ((y2 - y1) * k) / n; el("line", { x1: x, y1: y - h, x2: x, y2: y - 6, stroke: "#141414", "stroke-width": 1 }, g); el("path", { d: `M${x - 3},${y - 11} l3,5 l3,-5`, fill: "none", stroke: "#141414", "stroke-width": 1 }, g); }
        el("line", { x1, y1: y1 - h, x2, y2: y2 - h, stroke: "#141414", "stroke-width": 1 }, g);
        if (this.o.etichette) this.testo(t, (x1 + x2) / 2, Math.min(y1, y2) - h - 6, `q = ${kN(c.q)} kN/m`, "#141414", "middle");
      } else {
        const nd = m.nodi.find((n) => n.id === c.nodo); if (!nd) continue; const [x, y] = pos(nd);
        const L = 44; const fx = Math.sign(c.Fx || 0), fz = Math.sign(c.Fz || 0);
        if (fx) { el("line", { x1: x - fx * L, y1: y, x2: x - fx * 8, y2: y, stroke: "#141414", "stroke-width": 1.4 }, g); el("path", { d: `M${x - fx * 14},${y - 4} L${x - fx * 7},${y} L${x - fx * 14},${y + 4}`, fill: "none", stroke: "#141414", "stroke-width": 1.4 }, g); }
        if (fz) { el("line", { x1: x, y1: y + fz * L, x2: x, y2: y + fz * 8, stroke: "#141414", "stroke-width": 1.4 }, g); el("path", { d: `M${x - 4},${y + fz * 14} L${x},${y + fz * 7} L${x + 4},${y + fz * 14}`, fill: "none", stroke: "#141414", "stroke-width": 1.4 }, g); }
        if (this.o.etichette) this.testo(t, x - (fx ? fx * L + 6 : 0), y - (fz ? fz * L + 8 : 16), `F = ${kN(Math.hypot(c.Fx || 0, c.Fz || 0))} kN`, "#141414", fx > 0 ? "end" : "start");
      }
    }
    for (const n of m.nodi) {
      const [x, y] = pos(n); const attiva = sel?.tipo === "nodo" && sel.id === n.id;
      const hov = this.hover?.colpito?.tipo === "nodo" && this.hover.colpito.id === n.id;
      if (n.vincolo) this.vincolo(g, x, y, n.vincolo);
      el("circle", { cx: x, cy: y, r: attiva ? 6.5 : hov ? 6 : 4.5, fill: attiva ? "#b8321e" : "#141414" }, g);
      if (attiva) el("circle", { cx: x, cy: y, r: 11, fill: "none", stroke: "#b8321e", "stroke-width": 1, "stroke-dasharray": "3 3" }, g);
      if (this.o.etichette) this.testo(t, x + 9, y + (n.vincolo ? 18 : -8), n.id, attiva ? "#b8321e" : "#141414", "start");
    }
  }
  vincolo(g, x, y, v) {
    if (v.ux && v.uz && v.ry) { el("path", { d: `M${x - 13},${y + 7} h26 M${x - 10},${y + 7} l-6,8 M${x - 2},${y + 7} l-6,8 M${x + 6},${y + 7} l-6,8 M${x + 14},${y + 7} l-6,8`, stroke: "#141414", "stroke-width": 1.2, fill: "none" }, g); }
    else if (v.ux && v.uz) { el("path", { d: `M${x},${y} l-10,16 h20 z M${x - 14},${y + 20} h28`, stroke: "#141414", "stroke-width": 1.2, fill: "none" }, g); }
    else { el("path", { d: `M${x},${y} l-10,14 h20 z`, stroke: "#141414", "stroke-width": 1.2, fill: "none" }, g); el("circle", { cx: x - 5, cy: y + 18, r: 3, fill: "none", stroke: "#141414" }, g); el("circle", { cx: x + 5, cy: y + 18, r: 3, fill: "none", stroke: "#141414" }, g); }
  }
  testo(t, x, y, s, fill = "#141414", anchor = "start") { const e = el("text", { x, y, fill, "text-anchor": anchor, "font-family": "SF Mono, Menlo, monospace", "font-size": 11.5, "paint-order": "stroke", stroke: "#dcdad5", "stroke-width": 3 }, t); e.textContent = s; return e; }
  // ---- risultati ----
  deformazione() {
    const s = this.s, r = s.risultati; if (!r || r.errore) return null;
    if (s.vista.mostra === "deformata") { const k = s.scalaDeformata(ingombro(s.modello).w); return (id) => ({ ux: r.spostamenti[id].ux * k, uz: r.spostamenti[id].uz * k }); }
    if (s.vista.mostra === "modo") { const md = r.modi[s.vista.modo - 1]; if (!md) return null; const amp = 0.05 * ingombro(s.modello).w * Math.sin(this.tempo); return (id) => ({ ux: md.forma[id].ux * amp, uz: md.forma[id].uz * amp }); }
    return null;
  }
  curvaDeformata(a, ni, nj, deform) {
    // Hermite cubica con le rotazioni nodali: leggibile, non esatta con q — è un prototipo
    const r = this.s.risultati, k = this.s.vista.mostra === "deformata" ? this.s.scalaDeformata(ingombro(this.s.modello).w) : 0;
    const di = deform(ni.id), dj = deform(nj.id);
    const ri = k ? r.spostamenti[ni.id].ry * k : 0, rj = k ? r.spostamenti[nj.id].ry * k : 0;
    const dx = nj.x - ni.x, dz = nj.z - ni.z, L = Math.hypot(dx, dz), c = dx / L, sn = dz / L;
    const pts = [];
    for (let t = 0; t <= 1.0001; t += 1 / 12) {
      // spostamento trasversale locale interpolato fra i nodi (Hermite) + assiale lineare
      const ui = -di.ux * sn + di.uz * c, uj = -dj.ux * sn + dj.uz * c; // componente locale y
      const h1 = 1 - 3 * t * t + 2 * t ** 3, h2 = L * (t - 2 * t * t + t ** 3), h3 = 3 * t * t - 2 * t ** 3, h4 = L * (-t * t + t ** 3);
      const v = h1 * ui + h2 * ri + h3 * uj + h4 * rj;
      const ax = di.ux * c + di.uz * sn, bx = dj.ux * c + dj.uz * sn; const u = ax * (1 - t) + bx * t;
      const x = ni.x + dx * t + u * c - v * sn, z = ni.z + dz * t + u * sn + v * c;
      pts.push(this.aSchermo(x, z));
    }
    return pts;
  }
  renderRisultati() {
    const g = this.gRisultati; g.innerHTML = ""; const s = this.s, r = s.risultati;
    if (!r || r.errore || s.vista.mostra !== "momento") return;
    const m = s.modello; const Mmax = Math.max(...Object.values(r.sollecitazioni).map((x) => x.Mmax)) || 1;
    const hmax = 0.09 * ingombro(m).w * this.scala; // px
    for (const a of m.aste) {
      const so = r.sollecitazioni[a.id]; if (!so) continue;
      const ni = m.nodi.find((n) => n.id === a.i), nj = m.nodi.find((n) => n.id === a.j);
      const dx = nj.x - ni.x, dz = nj.z - ni.z, L = Math.hypot(dx, dz), c = dx / L, sn = dz / L;
      // lato teso: M>0 = fibre a -y locale tese → diagramma verso -y locale; -y locale in schermo = (sn, c)·(+) ... calcolo in mondo
      const attiva = s.selezione?.tipo === "asta" && s.selezione.id === a.id;
      const pts = so.stazioni.map((st) => { const x = ni.x + dx * st.x_rel, z = ni.z + dz * st.x_rel; const h = (st.M / Mmax) * (hmax / this.scala); return this.aSchermo(x + sn * h, z - c * h); });
      const base = [this.aSchermo(ni.x, ni.z), this.aSchermo(nj.x, nj.z)];
      el("path", { d: `M${base[0]} L${pts.map((p) => p.join(",")).join(" L")} L${base[1]} Z`, fill: "#b8321e", "fill-opacity": attiva ? .28 : .14, stroke: "#b8321e", "stroke-width": attiva ? 1.6 : 1 }, g);
      const picco = so.stazioni.reduce((b, st) => (Math.abs(st.M) > Math.abs(b.M) ? st : b), so.stazioni[0]);
      const pp = pts[so.stazioni.indexOf(picco)];
      this.testo(g, pp[0] + 6, pp[1] + (picco.M > 0 ? 14 : -6), `M = ${kN(picco.M)} kN·m`, "#b8321e");
    }
  }
  renderGhost() {
    const g = this.gGhost; g.innerHTML = ""; const gh = this.ghost, h = this.hover;
    if (h && this.o.snapVisibile && gh?.tipo) { const [x, y] = this.aSchermo(h.sx, h.sz); el("circle", { cx: x, cy: y, r: 3, fill: "none", stroke: "#141414", "stroke-width": 1 }, g); }
    if (!gh) return;
    if (gh.tipo === "nodo" && h) { const [x, y] = this.aSchermo(h.sx, h.sz); el("circle", { cx: x, cy: y, r: 5, fill: "none", stroke: "#141414", "stroke-width": 1.2, "stroke-dasharray": "3 2" }, g); this.testo(g, x + 9, y - 8, `(${fmt(h.sx)}; ${fmt(h.sz)})`, "#6f6f6b"); }
    if (gh.tipo === "asta") {
      const a = this.s.modello.nodi.find((n) => n.id === gh.da); if (!a) return; const [x1, y1] = this.aSchermo(a.x, a.z);
      let x2, y2, tx, tz;
      if (gh.a) { [tx, tz] = gh.a; } else if (h) { const c = h.colpito?.tipo === "nodo" ? this.s.modello.nodi.find((n) => n.id === h.colpito.id) : null; [tx, tz] = c ? [c.x, c.z] : [h.sx, h.sz]; } else return;
      [x2, y2] = this.aSchermo(tx, tz);
      el("line", { x1, y1, x2, y2, stroke: "#141414", "stroke-width": 3, "stroke-dasharray": "6 5", "stroke-linecap": "round", opacity: .7 }, g);
      el("circle", { cx: x2, cy: y2, r: 5, fill: "none", stroke: "#141414", "stroke-width": 1.2, "stroke-dasharray": "3 2" }, g);
      this.testo(g, (x1 + x2) / 2, (y1 + y2) / 2 - 10, `${fmt(Math.hypot(tx - a.x, tz - a.z))} m · Invio conferma · Esc annulla`, "#6f6f6b", "middle");
    }
  }
  setGhost(g) { this.ghost = g; this.renderGhost(); }
  anima(attivo) {
    if (this.animazione) { cancelAnimationFrame(this.animazione); this.animazione = null; }
    if (!attivo) { this.tempo = 0; return; }
    const passo = () => { this.tempo += 0.06; this.renderModello(); this.animazione = requestAnimationFrame(passo); };
    passo();
  }
}
function distSeg(px, py, x1, y1, x2, y2) {
  const L2 = (x2 - x1) ** 2 + (y2 - y1) ** 2; if (!L2) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / L2; t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
}
