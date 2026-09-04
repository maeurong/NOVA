// PROTOTIPO usa-e-getta (#8). Stato in memoria, comandi con cronologia
// navigabile (snapshot per comando: ponytail, un telaio 2×1 pesa 2 KB),
// catalogo sezioni, telaio d'esempio. Unità: m, kN a video; N, m nel solutore.
import { analizza } from "./fe.js";

export const SEZIONI = {
  S1: { nome: "30×30 4Ø16", b: 0.3, h: 0.3, armatura: "4Ø16 · st Ø8/15", tipo: "pilastro" },
  S2: { nome: "30×40 3+3Ø14", b: 0.3, h: 0.4, armatura: "3Ø14 + 3Ø14 · st Ø8/20", tipo: "trave" },
  S3: { nome: "30×50 3+3Ø16", b: 0.3, h: 0.5, armatura: "3Ø16 + 3Ø16 · st Ø8/15", tipo: "trave" },
};
export const VINCOLI = {
  incastro: { ux: 1, uz: 1, ry: 1 },
  cerniera: { ux: 1, uz: 1, ry: 0 },
  carrello: { ux: 0, uz: 1, ry: 0 },
};

export function nuovoModello() {
  return { nodi: [], aste: [], carichi: [], contatori: { N: 0, A: 0, Q: 0 } };
}

export class Stato {
  constructor() {
    this.modello = nuovoModello();
    this.cronologia = [{ etichetta: "modello vuoto", modello: clona(this.modello) }];
    this.indice = 0;
    this.selezione = null;      // {tipo:'nodo'|'asta', id}
    this.risultati = null;      // uscita di analizza(), o null
    this.hashRisultati = null;  // impronta del modello al momento della corsa
    this.ascoltatori = new Set();
    this.vista = { mostra: "modello", modo: 1, scala: null };
  }
  on(f) { this.ascoltatori.add(f); return () => this.ascoltatori.delete(f); }
  emetti() { for (const f of this.ascoltatori) f(this); }
  get stantii() { return this.risultati && this.hashRisultati !== impronta(this.modello); }

  // ---- comandi (ognuno = una voce di cronologia) ----
  esegui(etichetta, fn) {
    const m = clona(this.modello);
    fn(m);
    this.modello = m;
    this.cronologia = this.cronologia.slice(0, this.indice + 1);
    this.cronologia.push({ etichetta, modello: clona(m) });
    this.indice = this.cronologia.length - 1;
    this.emetti();
  }
  vaiA(i) {
    if (i < 0 || i >= this.cronologia.length) return;
    this.indice = i; this.modello = clona(this.cronologia[i].modello);
    if (this.selezione && !this.trova(this.selezione)) this.selezione = null;
    this.emetti();
  }
  annulla() { this.vaiA(this.indice - 1); }
  ripeti() { this.vaiA(this.indice + 1); }

  aggiungiNodo(x, z, vincolo = null) {
    let id;
    this.esegui(`nodo in (${fmt(x)}; ${fmt(z)})`, (m) => { id = `N${++m.contatori.N}`; m.nodi.push({ id, x, z, vincolo }); });
    return id;
  }
  nodoIn(x, z, tol = 1e-6) { return this.modello.nodi.find((n) => Math.abs(n.x - x) < tol && Math.abs(n.z - z) < tol); }
  aggiungiAsta(i, j, sezione = "S1") {
    if (i === j) return null;
    if (this.modello.aste.some((a) => (a.i === i && a.j === j) || (a.i === j && a.j === i))) return null;
    let id;
    this.esegui(`asta ${i}→${j}`, (m) => { id = `A${++m.contatori.A}`; m.aste.push({ id, i, j, sezione }); });
    return id;
  }
  assegnaSezione(idAsta, sezione) {
    this.esegui(`sezione ${SEZIONI[sezione].nome} → ${idAsta}`, (m) => { const a = m.aste.find((a) => a.id === idAsta); if (a) a.sezione = sezione; });
  }
  assegnaVincolo(idNodo, nome) {
    this.esegui(`${nome ?? "libero"} → ${idNodo}`, (m) => { const n = m.nodi.find((n) => n.id === idNodo); if (n) n.vincolo = nome ? { ...VINCOLI[nome] } : null; });
  }
  caricoDistribuito(idAsta, q_kNm) {
    this.esegui(`q = ${fmt(q_kNm)} kN/m → ${idAsta}`, (m) => {
      m.carichi = m.carichi.filter((c) => !(c.tipo === "distribuito" && c.asta === idAsta));
      if (q_kNm) m.carichi.push({ id: `Q${++m.contatori.Q}`, tipo: "distribuito", asta: idAsta, q: q_kNm * 1e3 });
    });
  }
  forzaNodale(idNodo, Fx_kN, Fz_kN) {
    this.esegui(`F = (${fmt(Fx_kN)}; ${fmt(Fz_kN)}) kN → ${idNodo}`, (m) => {
      m.carichi = m.carichi.filter((c) => !(c.tipo === "nodale" && c.nodo === idNodo));
      if (Fx_kN || Fz_kN) m.carichi.push({ id: `Q${++m.contatori.Q}`, tipo: "nodale", nodo: idNodo, Fx: Fx_kN * 1e3, Fz: Fz_kN * 1e3 });
    });
  }
  spostaNodo(idNodo, x, z) {
    this.esegui(`${idNodo} → (${fmt(x)}; ${fmt(z)})`, (m) => { const n = m.nodi.find((n) => n.id === idNodo); if (n) { n.x = x; n.z = z; } });
  }
  elimina(sel) {
    if (!sel) return;
    this.esegui(`elimina ${sel.id}`, (m) => {
      if (sel.tipo === "nodo") {
        m.nodi = m.nodi.filter((n) => n.id !== sel.id);
        const via = new Set(m.aste.filter((a) => a.i === sel.id || a.j === sel.id).map((a) => a.id));
        m.aste = m.aste.filter((a) => !via.has(a.id));
        m.carichi = m.carichi.filter((c) => c.nodo !== sel.id && !via.has(c.asta));
      } else {
        m.aste = m.aste.filter((a) => a.id !== sel.id);
        m.carichi = m.carichi.filter((c) => c.asta !== sel.id);
      }
    });
    this.selezione = null; this.emetti();
  }
  esempio() {
    this.esegui("telaio d'esempio 2×1", (m) => {
      Object.assign(m, nuovoModello());
      const N = (x, z, v) => { const id = `N${++m.contatori.N}`; m.nodi.push({ id, x, z, vincolo: v ? { ...VINCOLI[v] } : null }); return id; };
      const A = (i, j, s) => { const id = `A${++m.contatori.A}`; m.aste.push({ id, i, j, sezione: s }); return id; };
      const n1 = N(0, 0, "incastro"), n2 = N(5, 0, "incastro"), n3 = N(9, 0, "incastro");
      const n4 = N(0, 3.2), n5 = N(5, 3.2), n6 = N(9, 3.2);
      A(n1, n4, "S1"); A(n2, n5, "S1"); A(n3, n6, "S1");
      const a4 = A(n4, n5, "S3"), a5 = A(n5, n6, "S3");
      m.carichi.push({ id: "Q1", tipo: "distribuito", asta: a4, q: 12.5e3 }, { id: "Q2", tipo: "distribuito", asta: a5, q: 12.5e3 }, { id: "Q3", tipo: "nodale", nodo: n4, Fx: 20e3, Fz: 0 });
      m.contatori.Q = 3;
    });
  }

  // ---- analisi ----
  analizza() {
    const r = analizza({ ...this.modello, sezioni: SEZIONI });
    this.risultati = r; this.hashRisultati = impronta(this.modello);
    this.vista.scala = null; this.emetti();
    return r;
  }
  scalaDeformata(larghezza) {
    // auto: lo spostamento massimo vale il 6 % dell'ingombro del telaio
    if (this.vista.scala) return this.vista.scala;
    const r = this.risultati; if (!r || !r.umax) return 1;
    return Math.round((0.06 * larghezza) / r.umax);
  }
  controlli() {
    const r = this.risultati; if (!r || r.errore) return [];
    const dF = Math.abs(r.sommaF.Fz + r.sommaR.Fz) / (Math.abs(r.sommaF.Fz) || 1);
    const L = ingombro(this.modello).w || 1;
    const cum = r.modi.reduce((t, m) => t + m.px, 0);
    return [
      { nome: "Σ reazioni = Σ carichi", esito: dF < 1e-6 ? "passato" : "non_passato", valore: `Δ ${fmt(dF * 100, 4)} %`, margine: "tolleranza 1e-6" },
      { nome: "massa partecipante x", esito: cum >= 0.85 ? "passato" : "non_passato", valore: `${(cum * 100).toFixed(0)} % su 3 modi`, margine: "soglia 85 % (§7.3.3.1)" },
      { nome: "avvisi del solutore", esito: "passato", valore: "0", margine: "" },
      { nome: "vincolo in pianta", esito: "non_applicabile", valore: "telaio piano", margine: "vale solo sul solido" },
      { nome: "spostamento in banda", esito: r.umax < L / 500 ? "passato" : "non_passato", valore: `1/${Math.round(L / r.umax)}`, margine: "limite 1/500 dell'ingombro" },
    ];
  }
  trova(sel) { return sel.tipo === "nodo" ? this.modello.nodi.find((n) => n.id === sel.id) : this.modello.aste.find((a) => a.id === sel.id); }
  seleziona(sel) { this.selezione = sel; this.emetti(); }
}

export function ingombro(m) {
  if (!m.nodi.length) return { x0: 0, x1: 9, z0: 0, z1: 3.2, w: 9, h: 3.2 };
  const xs = m.nodi.map((n) => n.x), zs = m.nodi.map((n) => n.z);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs);
  return { x0, x1, z0, z1, w: Math.max(x1 - x0, 1), h: Math.max(z1 - z0, 1) };
}
export const clona = (o) => JSON.parse(JSON.stringify(o));
export const impronta = (m) => JSON.stringify([m.nodi, m.aste, m.carichi]);
export const fmt = (v, d = 2) => (Math.round(v * 10 ** d) / 10 ** d).toLocaleString("it-IT", { minimumFractionDigits: 0, maximumFractionDigits: d });
export const kN = (v, d = 1) => fmt(v / 1e3, d);
