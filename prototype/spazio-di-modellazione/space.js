// PROTOTIPO usa-e-getta (#8). Vista spaziale in three.js r180: le aste come
// prismi b×h veri, vincoli, deformata/modo sincronizzati con il piano.
// Orbita a mano (trascina), zoom a rotella: niente OrbitControls vendorizzato.
import * as THREE from "./vendor/three.module.min.js";
import { SEZIONI, ingombro } from "./model.js";

export class Spazio {
  constructor(contenitore, stato) {
    this.c = contenitore; this.s = stato;
    try { this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); }
    catch (e) { this.renderer = null; contenitore.appendChild(Object.assign(document.createElement("div"), { className: "vuoto", textContent: "WebGL non disponibile: la vista spaziale resta vuota" })); }
    if (!this.renderer) { this.ricostruisci = () => {}; this.anima = () => {}; this.disegna = () => {}; return; }
    this.renderer.setPixelRatio(Math.min(2, devicePixelRatio));
    contenitore.appendChild(this.renderer.domElement);
    this.scena = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 500);
    this.orbita = { theta: -0.55, phi: 1.15, r: 16, cx: 4.5, cz: 1.6, cy: 0 };
    this.scena.add(new THREE.AmbientLight(0xffffff, 1.6));
    const luce = new THREE.DirectionalLight(0xffffff, 1.4); luce.position.set(6, 10, 8); this.scena.add(luce);
    const griglia = new THREE.GridHelper(30, 30, 0xc0bfb9, 0xd0cec8); griglia.position.set(4.5, 0, -1.6); this.scena.add(griglia);
    this.gruppo = new THREE.Group(); this.scena.add(this.gruppo);
    this.materiali = { asta: new THREE.MeshLambertMaterial({ color: 0x141414 }), sel: new THREE.MeshLambertMaterial({ color: 0xb8321e }), ombra: new THREE.MeshBasicMaterial({ color: 0xa9a8a3, wireframe: true }) };
    this.tempo = 0; this.animazione = null;
    this._eventi();
    new ResizeObserver(() => this.ridimensiona()).observe(contenitore);
    this.ridimensiona();
  }
  ridimensiona() {
    const r = this.c.getBoundingClientRect(); if (!r.width || !r.height) return;
    this.renderer.setSize(r.width, r.height, false); this.camera.aspect = r.width / r.height; this.camera.updateProjectionMatrix(); this.disegna();
  }
  _eventi() {
    const d = this.renderer.domElement; let drag = null;
    d.addEventListener("pointerdown", (e) => { this.orbita.toccata = true; drag = { x: e.clientX, y: e.clientY, t: this.orbita.theta, p: this.orbita.phi }; d.setPointerCapture(e.pointerId); });
    d.addEventListener("pointermove", (e) => { if (!drag) return; this.orbita.theta = drag.t - (e.clientX - drag.x) * 0.008; this.orbita.phi = Math.max(0.15, Math.min(1.5, drag.p - (e.clientY - drag.y) * 0.006)); this.disegna(); });
    d.addEventListener("pointerup", () => (drag = null));
    d.addEventListener("wheel", (e) => { e.preventDefault(); this.orbita.toccata = true; this.orbita.r = Math.max(4, Math.min(60, this.orbita.r * (e.deltaY > 0 ? 1.1 : 1 / 1.1))); this.disegna(); }, { passive: false });
  }
  // mondo NOVA (x, z verticale) → three (x, y=z, z=-y)
  p3(x, z, y = 0) { return new THREE.Vector3(x, z, -y); }
  ricostruisci() {
    const g = this.gruppo; while (g.children.length) g.remove(g.children[0]);
    const m = this.s.modello, sel = this.s.selezione, r = this.s.risultati;
    const b = ingombro(m); this.orbita.cx = (b.x0 + b.x1) / 2; this.orbita.cz = (b.z0 + b.z1) / 2;
    if (!this.orbita.toccata) this.orbita.r = Math.max(6, 3.2 * Math.max(b.w, b.h * 1.6));
    const deform = this.deformazione();
    const pos = (n) => { const d = deform?.(n.id) || { ux: 0, uz: 0 }; return this.p3(n.x + d.ux, n.z + d.uz); };
    for (const a of m.aste) {
      const ni = m.nodi.find((n) => n.id === a.i), nj = m.nodi.find((n) => n.id === a.j); if (!ni || !nj) continue;
      const s = SEZIONI[a.sezione]; const attiva = sel?.tipo === "asta" && sel.id === a.id;
      const P = pos(ni), Q = pos(nj); const L = P.distanceTo(Q);
      const geo = new THREE.BoxGeometry(s.h, L, s.b); // asse locale lungo y; h nel piano XZ (verticale della trave), b fuori piano
      const mesh = new THREE.Mesh(geo, attiva ? this.materiali.sel : this.materiali.asta);
      const dir = Q.clone().sub(P).normalize();
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      // ruota il prisma perché h stia nel piano del telaio: per una trave orizzontale h è verticale, per un pilastro h è lungo x
      mesh.position.copy(P.clone().add(Q).multiplyScalar(0.5));
      g.add(mesh);
      if (deform) { const om = new THREE.Mesh(new THREE.BoxGeometry(s.h, L, s.b), this.materiali.ombra); const P0 = this.p3(ni.x, ni.z), Q0 = this.p3(nj.x, nj.z); om.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), Q0.clone().sub(P0).normalize()); om.position.copy(P0.clone().add(Q0).multiplyScalar(0.5)); g.add(om); }
    }
    for (const n of m.nodi) {
      const attiva = sel?.tipo === "nodo" && sel.id === n.id;
      const sf = new THREE.Mesh(new THREE.SphereGeometry(attiva ? 0.11 : 0.07, 16, 12), attiva ? this.materiali.sel : this.materiali.asta); sf.position.copy(pos(n)); g.add(sf);
      if (n.vincolo) { const pir = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.28, 4), this.materiali.asta); pir.position.copy(this.p3(n.x, n.z - 0.14)); g.add(pir); }
    }
    // carichi distribuiti: fila di frecce
    for (const c of m.carichi) if (c.tipo === "distribuito") {
      const a = m.aste.find((a) => a.id === c.asta); if (!a) continue; const ni = m.nodi.find((n) => n.id === a.i), nj = m.nodi.find((n) => n.id === a.j);
      const s = SEZIONI[a.sezione]; const n = 7;
      for (let k = 0; k <= n; k++) { const x = ni.x + ((nj.x - ni.x) * k) / n, z = ni.z + ((nj.z - ni.z) * k) / n; const fr = new THREE.ArrowHelper(new THREE.Vector3(0, -1, 0), this.p3(x, z + s.h / 2 + 0.5), 0.45, 0x141414, 0.12, 0.06); g.add(fr); }
    }
    this.disegna();
  }
  deformazione() {
    const s = this.s, r = s.risultati; if (!r || r.errore) return null;
    if (s.vista.mostra === "deformata") { const k = s.scalaDeformata(ingombro(s.modello).w); return (id) => ({ ux: r.spostamenti[id].ux * k, uz: r.spostamenti[id].uz * k }); }
    if (s.vista.mostra === "modo") { const md = r.modi[s.vista.modo - 1]; if (!md) return null; const amp = 0.05 * ingombro(s.modello).w * Math.sin(this.tempo); return (id) => ({ ux: md.forma[id].ux * amp, uz: md.forma[id].uz * amp }); }
    return null;
  }
  disegna() {
    const o = this.orbita;
    this.camera.position.set(o.cx + o.r * Math.sin(o.phi) * Math.sin(o.theta), o.cz + o.r * Math.cos(o.phi), -o.cy + o.r * Math.sin(o.phi) * Math.cos(o.theta));
    this.camera.lookAt(o.cx, o.cz, -o.cy);
    this.renderer.render(this.scena, this.camera);
  }
  anima(attivo) {
    if (this.animazione) { cancelAnimationFrame(this.animazione); this.animazione = null; }
    if (!attivo) { this.tempo = 0; return; }
    const passo = () => { this.tempo += 0.06; this.ricostruisci(); this.animazione = requestAnimationFrame(passo); };
    passo();
  }
}
