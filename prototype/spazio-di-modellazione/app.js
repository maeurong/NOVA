// PROTOTIPO usa-e-getta (#8). Tre varianti dello spazio di modellazione,
// commutabili con ?variant=A|B|C e con la barra flottante in basso.
//   A «Richiami»    — nessun albero; ispettore agganciato alla selezione; click su griglia; risultati overlay; 3D in angolo
//   B «Doppia vista» — albero + pannello fisso; creazione da tastiera (estrusione); piano e 3D affiancati; M srotolato sotto
//   C «Foglio»       — riga di comando; tabella al posto dell'albero; risultati in schede sotto il viewport
import { Stato, SEZIONI, fmt, kN, ingombro } from "./model.js";
import { Piano } from "./plane.js";
import { Spazio } from "./space.js";
import { Palette } from "./palette.js";
import * as UI from "./ui.js";
import { autotest } from "./fe.js";

const VARIANTI = { A: "Richiami", B: "Doppia vista", C: "Foglio" };
const stato = new Stato();
window.stato = stato; // per curiosare dalla console
autotest();

const url = new URL(location.href);
let variante = VARIANTI[url.searchParams.get("variant")] ? url.searchParams.get("variant") : "A";
let corrente = null;

function monta(v) {
  corrente?.smonta(); document.getElementById("app").innerHTML = "";
  variante = v; url.searchParams.set("variant", v); history.replaceState(null, "", url);
  corrente = ({ A: varianteA, B: varianteB, C: varianteC })[v](document.getElementById("app"));
  montaSwitcher();
  stato.emetti();
  // ?demo=momento|deformata|modo carica l'esempio, analizza e mostra: per screenshot e link diretti
  const demo = url.searchParams.get("demo");
  if (demo && !stato.modello.nodi.length) requestAnimationFrame(() => { stato.esempio(); corrente.ctx.piano?.fit(); corrente.ctx.analizza(); corrente.ctx.mostra(demo === "1" ? "deformata" : demo); if (demo !== "modo") stato.seleziona({ tipo: "asta", id: "A4" }); });
}

// ---------- contesto comune ----------
function contesto(root, piano, spazio, barra) {
  let strumento = null; // {tipo:'nodo'} | {tipo:'asta', da} | {tipo:'estrudi', da, testo, dir}
  const ctx = {
    piano, spazio, barra, stato,
    get strumento() { return strumento; },
    mostra(che, n) {
      stato.vista.mostra = che; if (n) stato.vista.modo = n;
      const anim = che === "modo" && stato.risultati && !stato.risultati.errore;
      piano?.anima(anim); spazio?.anima(anim); stato.emetti();
    },
    analizza() { const r = stato.analizza(); if (r.errore) barra.suggerisci(r.errore, true); else { barra.suggerisci(`corsa ok · ${r.gdl} gdl · umax ${fmt(r.umax * 1e3, 3)} mm · 3 modi`); if (stato.vista.mostra === "modello") ctx.mostra("deformata"); else ctx.mostra(stato.vista.mostra, stato.vista.modo); } },
    strumento(t) { strumento = t; piano?.setGhost(t ? { tipo: t.tipo === "estrudi" ? "asta" : t.tipo, da: t.da, a: t.a } : null); ctx.suggerisci(); },
    suggerisci() {
      const t = strumento;
      if (!t) barra.suggerisci("");
      else if (t.tipo === "nodo") barra.suggerisci("nodo: clic sulla griglia · Esc annulla");
      else if (t.tipo === "asta" && !t.da) barra.suggerisci("asta: clic sul primo nodo · Esc annulla");
      else if (t.tipo === "asta") barra.suggerisci(`asta da ${t.da}: clic sul secondo nodo o su un punto della griglia · Esc annulla`);
      else if (t.tipo === "estrudi") barra.suggerisci(`estrudi da ${t.da}: lunghezza «${t.testo || "…"}» m · frecce = direzione (${t.dir}) · Invio conferma · Esc annulla`);
    },
    annullaStrumento() { ctx.strumento(null); },
    comandi() {
      const sel = stato.selezione;
      return [
        { nome: "Nuovo nodo", tasto: "N", accettaValore: true, esegui: (arg) => { const [x, z] = (arg || "").split(/\s+/).map((v) => parseFloat(v.replace(",", "."))); if (isFinite(x) && isFinite(z)) { const id = stato.aggiungiNodo(x, z); stato.seleziona({ tipo: "nodo", id }); } else ctx.strumento({ tipo: "nodo" }); } },
        { nome: "Nuova asta", tasto: "B", esegui: () => ctx.strumento({ tipo: "asta", da: sel?.tipo === "nodo" ? sel.id : null }) },
        { nome: "Assegna sezione", tasto: "S", accettaValore: true, esegui: (arg) => { if (sel?.tipo !== "asta") return barra.suggerisci("seleziona prima un'asta", true); const k = Object.keys(SEZIONI).find((k) => SEZIONI[k].nome.replace("×", "x").startsWith((arg || "").replace("×", "x"))) || Object.keys(SEZIONI)[(Object.keys(SEZIONI).indexOf(stato.modello.aste.find((a) => a.id === sel.id).sezione) + 1) % 3]; stato.assegnaSezione(sel.id, k); } },
        { nome: "Carico distribuito q [kN/m]", tasto: "Q", accettaValore: true, esegui: (arg) => { if (sel?.tipo !== "asta") return barra.suggerisci("seleziona prima un'asta", true); stato.caricoDistribuito(sel.id, parseFloat((arg || "12.5").replace(",", ".")) || 0); } },
        { nome: "Vincolo: incastro", tasto: "V", esegui: () => sel?.tipo === "nodo" ? stato.assegnaVincolo(sel.id, "incastro") : barra.suggerisci("seleziona prima un nodo", true) },
        { nome: "Vincolo: cerniera", esegui: () => sel?.tipo === "nodo" ? stato.assegnaVincolo(sel.id, "cerniera") : barra.suggerisci("seleziona prima un nodo", true) },
        { nome: "Vincolo: libero", esegui: () => sel?.tipo === "nodo" ? stato.assegnaVincolo(sel.id, null) : barra.suggerisci("seleziona prima un nodo", true) },
        { nome: "Forza nodale Fx Fz [kN]", accettaValore: true, esegui: (arg) => { if (sel?.tipo !== "nodo") return barra.suggerisci("seleziona prima un nodo", true); const [fx, fz] = (arg || "20 0").split(/\s+/).map((v) => parseFloat(v.replace(",", "."))); stato.forzaNodale(sel.id, fx || 0, fz || 0); } },
        { nome: "Analizza (statica + modale)", tasto: "A", rosso: true, esegui: () => ctx.analizza() },
        { nome: "Mostra modello", esegui: () => ctx.mostra("modello") },
        { nome: "Mostra deformata (scala)", tasto: "D", accettaValore: true, esegui: (arg) => { stato.vista.scala = parseFloat(arg) || null; ctx.mostra("deformata"); } },
        { nome: "Mostra momento M", tasto: "M", esegui: () => ctx.mostra("momento") },
        { nome: "Mostra modo n", tasto: "O", accettaValore: true, esegui: (arg) => ctx.mostra("modo", parseInt(arg) || 1) },
        { nome: "Annulla", tasto: "⌘Z", esegui: () => stato.annulla() },
        { nome: "Ripeti", tasto: "⇧⌘Z", esegui: () => stato.ripeti() },
        { nome: "Elimina selezione", tasto: "⌫", esegui: () => stato.elimina(sel) },
        { nome: "Telaio d'esempio 2×1", tasto: "E", esegui: () => { stato.esempio(); piano?.fit(); stato.emetti(); } },
        { nome: "Adatta la vista", tasto: "F", esegui: () => { piano?.fit(); piano?.render(); } },
        { nome: "Cancella tutto", esegui: () => stato.esegui("cancella tutto", (m) => { m.nodi = []; m.aste = []; m.carichi = []; }) },
      ];
    },
  };
  const palette = new Palette(() => ctx.comandi());
  ctx.palette = palette;
  // ---- gesti sul piano (A e B; C li usa solo per selezione) ----
  piano?.on("click", (ev) => {
    const t = strumento;
    if (!t) { stato.seleziona(ev.colpito); return; }
    if (t.tipo === "nodo") { if (ev.colpito?.tipo === "nodo") { stato.seleziona(ev.colpito); return; } const id = stato.aggiungiNodo(ev.sx, ev.sz); stato.seleziona({ tipo: "nodo", id }); if (!ev.shift) ctx.strumento(null); return; }
    if (t.tipo === "asta") {
      if (!t.da) { if (ev.colpito?.tipo === "nodo") { ctx.strumento({ tipo: "asta", da: ev.colpito.id }); stato.seleziona(ev.colpito); } else barra.suggerisci("asta: il primo clic deve cadere su un nodo", true); return; }
      let a = ev.colpito?.tipo === "nodo" ? ev.colpito.id : null;
      if (!a) { const esiste = stato.nodoIn(ev.sx, ev.sz); a = esiste ? esiste.id : stato.aggiungiNodo(ev.sx, ev.sz); }
      const da = stato.modello.nodi.find((n) => n.id === t.da), aN = stato.modello.nodi.find((n) => n.id === a); const id = stato.aggiungiAsta(t.da, a, Math.abs(aN.z - da.z) > Math.abs(aN.x - da.x) ? "S1" : "S3"); if (id) stato.seleziona({ tipo: "asta", id }); else barra.suggerisci("asta già presente o nodi coincidenti", true);
      ctx.strumento(ev.shift ? { tipo: "asta", da: a } : null);
    }
  });
  // ---- tastiera ----
  const suTasto = (e) => {
    const inCampo = ["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement?.tagName);
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); palette.aperta ? palette.chiudi() : palette.apri(); return; }
    if (palette.aperta) return;
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? stato.ripeti() : stato.annulla(); return; }
    if (e.key === "Escape") { if (inCampo) document.activeElement.blur(); else if (strumento) ctx.strumento(null); else stato.seleziona(null); return; }
    if (inCampo) return;
    if (ctx.tastieraVariante?.(e)) return;
    const t = strumento;
    if (t?.tipo === "estrudi") {
      if (/^[0-9.,]$/.test(e.key)) { t.testo = (t.testo || "") + e.key.replace(",", "."); }
      else if (e.key === "Backspace") { t.testo = (t.testo || "").slice(0, -1); }
      else if (e.key.startsWith("Arrow")) { t.dir = { ArrowRight: "+x", ArrowLeft: "−x", ArrowUp: "+z", ArrowDown: "−z" }[e.key]; e.preventDefault(); }
      else if (e.key === "Enter") { const L = parseFloat(t.testo); if (!L) return barra.suggerisci("lunghezza mancante", true); const da = stato.modello.nodi.find((n) => n.id === t.da); const [dx, dz] = { "+x": [L, 0], "−x": [-L, 0], "+z": [0, L], "−z": [0, -L] }[t.dir]; const x = da.x + dx, z = da.z + dz; const esiste = stato.nodoIn(x, z); const a = esiste ? esiste.id : stato.aggiungiNodo(x, z); const id = stato.aggiungiAsta(t.da, a, dz ? "S1" : "S3"); stato.seleziona(id ? { tipo: "asta", id } : { tipo: "nodo", id: a }); piano.fit(); piano.render(); ctx.strumento(e.shiftKey ? { tipo: "estrudi", da: a, testo: "", dir: t.dir } : null); return; }
      else return;
      const da = stato.modello.nodi.find((n) => n.id === t.da); const L = parseFloat(t.testo) || 0; const [dx, dz] = { "+x": [L, 0], "−x": [-L, 0], "+z": [0, L], "−z": [0, -L] }[t.dir];
      t.a = L ? [da.x + dx, da.z + dz] : null; ctx.strumento({ ...t }); return;
    }
    const k = e.key.toLowerCase(); const sel = stato.selezione;
    if (k === "n") ctx.strumento({ tipo: "nodo" });
    else if (k === "b") { if (ctx.estrusione && sel?.tipo === "nodo") ctx.strumento({ tipo: "estrudi", da: sel.id, testo: "", dir: "+x", a: null }); else ctx.strumento({ tipo: "asta", da: sel?.tipo === "nodo" ? sel.id : null }); }
    else if (k === "s") ctx.comandi().find((c) => c.tasto === "S").esegui("");
    else if (k === "q") ctx.comandi().find((c) => c.tasto === "Q").esegui("");
    else if (k === "v") ctx.comandi().find((c) => c.tasto === "V").esegui();
    else if (k === "a") ctx.analizza();
    else if (k === "e") ctx.comandi().find((c) => c.tasto === "E").esegui();
    else if (k === "d") ctx.mostra("deformata");
    else if (k === "m") ctx.mostra("momento");
    else if (k === "o") ctx.mostra("modo", stato.vista.modo);
    else if (k === "f") { piano?.fit(); piano?.render(); }
    else if (/^[1-3]$/.test(k) && stato.vista.mostra === "modo") ctx.mostra("modo", +k);
    else if (e.key === "Backspace" || e.key === "Delete") { if (sel) stato.elimina(sel); }
    else if (e.key === "Enter" && t?.tipo === "asta" && t.da && piano?.hover) piano.svg.dispatchEvent(new PointerEvent("pointerdown", { button: 0, clientX: piano.hover.px + piano.c.getBoundingClientRect().left, clientY: piano.hover.py + piano.c.getBoundingClientRect().top }));
    else if (e.key === "ArrowLeft" || e.key === "ArrowRight") cambiaVariante(e.key === "ArrowRight" ? 1 : -1);
    else return;
    e.preventDefault();
  };
  window.addEventListener("keydown", suTasto);
  ctx.smonta = () => { window.removeEventListener("keydown", suTasto); palette.chiudi(); piano?.anima(false); spazio?.anima(false); };
  return ctx;
}

const TASTI_COMUNI = [["⌘K", "palette"], ["A", "analizza"], ["D", "deformata"], ["M", "momento"], ["O", "modo"], ["E", "esempio"], ["⌘Z", "annulla"]];
function vuoto(vp, s, testo) {
  const v = UI.h(`<div class="vuoto"><div></div></div>`); vp.appendChild(v);
  return () => { v.firstChild.innerHTML = s.modello.nodi.length ? "" : testo; };
}

// ---------- A «Richiami» ----------
function varianteA(root) {
  root.style.gridTemplateRows = "40px 1fr 34px";
  const vp = UI.h(`<div class="vp"></div>`);
  const barra = UI.barraBasso([["N", "nodo"], ["B", "asta"], ["S", "sezione"], ["Q", "carico"], ["V", "vincolo"], ...TASTI_COMUNI]);
  const piano = new Piano(vp, stato, { snapVisibile: true, margini: { dx: 400, basso: 210, sx: 140, alto: 110 } });
  const pip = UI.h(`<div style="position:absolute;left:12px;bottom:12px;width:260px;height:170px;border:1px solid var(--inchiostro);background:var(--terra)"><div style="position:absolute;left:6px;top:4px;font:11px var(--mono);color:var(--grigio);pointer-events:none">spazio · trascina per orbitare</div></div>`);
  vp.appendChild(pip); const spazio = new Spazio(pip, stato);
  const alto = UI.barraAlto(stato, null);
  root.append(alto.el, vp, barra.el);
  const ctx = contesto(root, piano, spazio, barra); alto.aggiorna = (() => { const f = UI.barraAlto(stato, ctx); alto.el.replaceWith(f.el); alto.el = f.el; return f.aggiorna; })();
  vp.appendChild(UI.h(`<div class="titolo">piano XZ · A «Richiami» — clic sulla griglia, l'ispettore segue la selezione</div>`));
  const scala = UI.scalaDeformata(stato, ctx); vp.appendChild(scala.el);
  const richiami = UI.h(`<div style="position:absolute;inset:0;pointer-events:none"></div>`); vp.appendChild(richiami);
  const linee = document.createElementNS("http://www.w3.org/2000/svg", "svg"); linee.setAttribute("style", "position:absolute;inset:0;width:100%;height:100%;pointer-events:none"); vp.appendChild(linee);
  const isp = UI.h(`<div class="richiamo ispettore" style="pointer-events:auto"></div>`); richiami.appendChild(isp);
  const dx = UI.h(`<div style="position:absolute;right:14px;top:46px;width:340px;display:grid;gap:14px;pointer-events:auto"></div>`); richiami.appendChild(dx);
  const boxC = document.createElement("div"), boxM = document.createElement("div"), boxH = document.createElement("div"); dx.append(boxC, boxM, boxH);
  const aggiornaVuoto = vuoto(vp, stato, `<b>Nessun nodo.</b><br>Premi <span class="k">N</span> e clicca sulla griglia, oppure <span class="k">E</span> per il telaio d'esempio.<br><span class="k">⌘K</span> apre la palette dei comandi.`);
  const posiziona = () => {
    linee.innerHTML = ""; const sel = stato.selezione; const m = stato.modello;
    if (!sel) { isp.style.display = "none"; return; }
    let x, y; if (sel.tipo === "nodo") { const n = m.nodi.find((n) => n.id === sel.id); if (!n) return; [x, y] = piano.aSchermo(n.x, n.z); } else { const a = m.aste.find((a) => a.id === sel.id); if (!a) return; const ni = m.nodi.find((n) => n.id === a.i), nj = m.nodi.find((n) => n.id === a.j); const [x1, y1] = piano.aSchermo(ni.x, ni.z), [x2, y2] = piano.aSchermo(nj.x, nj.z); x = (x1 + x2) / 2; y = (y1 + y2) / 2; }
    isp.style.display = ""; const r = vp.getBoundingClientRect(); const w = isp.offsetWidth || 240, h = isp.offsetHeight || 160;
    let ix = x + 70, iy = y - h - 40; if (ix + w > r.width - 330) ix = x - w - 70; if (iy < 50) iy = y + 40; isp.style.left = ix + "px"; isp.style.top = iy + "px";
    const ax = ix + w > x ? (ix < x ? x : ix) : ix + w; const ay = iy > y ? iy : iy + h;
    const l = (a) => { const e = document.createElementNS("http://www.w3.org/2000/svg", "polyline"); for (const [k, v] of Object.entries(a)) e.setAttribute(k, v); linee.appendChild(e); };
    l({ points: `${x},${y} ${ax},${ay}`, fill: "none", stroke: "#141414", "stroke-width": 1 });
    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle"); c.setAttribute("cx", ax); c.setAttribute("cy", ay); c.setAttribute("r", 3); c.setAttribute("fill", "#dcdad5"); c.setAttribute("stroke", "#141414"); linee.appendChild(c);
  };
  piano.on("render", posiziona);
  const off = stato.on(() => { alto.aggiorna(); UI.ispettore(isp, stato, ctx); UI.controlli(boxC, stato); UI.modi(boxM, stato, ctx); UI.cronologia(boxH, stato); scala.aggiorna(); aggiornaVuoto(); piano.render(); spazio.ricostruisci(); posiziona(); });
  requestAnimationFrame(() => { piano.fit(); piano.render(); });
  return { ctx, smonta: () => { off(); ctx.smonta(); } };
}

// ---------- B «Doppia vista» ----------
function varianteB(root) {
  root.style.gridTemplateRows = "40px 1fr 34px";
  const main = UI.h(`<div style="display:grid;grid-template-columns:210px 1fr 1fr 340px;min-height:0"></div>`);
  const albero = UI.h(`<div class="albero"></div>`);
  const colPiano = UI.h(`<div class="split" style="min-width:0"></div>`); const vp = UI.h(`<div class="vp"></div>`); const diag = UI.h(`<div class="diag"></div>`); colPiano.append(vp, diag);
  const vp3 = UI.h(`<div class="vp" style="border-left:1px solid var(--inchiostro)"></div>`);
  const dx = UI.h(`<div style="padding:12px 14px;display:grid;gap:16px;align-content:start;overflow:auto;border-left:1px solid var(--inchiostro)"></div>`);
  main.append(albero, colPiano, vp3, dx);
  const barra = UI.barraBasso([["N", "nodo (x; z)"], ["B", "estrudi dal nodo"], ["S", "sezione"], ["Q", "carico"], ["V", "vincolo"], ...TASTI_COMUNI]);
  const piano = new Piano(vp, stato, { snapVisibile: false, margini: { sx: 110, dx: 60, alto: 100, basso: 60 } }); const spazio = new Spazio(vp3, stato);
  const alto = UI.barraAlto(stato, null); root.append(alto.el, main, barra.el);
  const ctx = contesto(root, piano, spazio, barra); ctx.estrusione = true;
  alto.aggiorna = (() => { const f = UI.barraAlto(stato, ctx); alto.el.replaceWith(f.el); alto.el = f.el; return f.aggiorna; })();
  vp.appendChild(UI.h(`<div class="titolo">piano XZ · B «Doppia vista» — seleziona un nodo, B, digita la lunghezza, freccia, Invio</div>`));
  vp3.appendChild(UI.h(`<div class="titolo">spazio · le sezioni b×h vere · trascina per orbitare</div>`));
  const scala = UI.scalaDeformata(stato, ctx); vp.appendChild(scala.el);
  const boxI = document.createElement("div"), boxC = document.createElement("div"), boxM = document.createElement("div"), boxH = document.createElement("div"); dx.append(boxI, boxC, boxM, boxH);
  const aggiornaVuoto = vuoto(vp, stato, `<b>Nessun nodo.</b><br><span class="k">N</span> poi «0; 0» Invio crea il primo nodo; <span class="k">B</span> estrude un'asta dal nodo selezionato.<br><span class="k">E</span> carica il telaio d'esempio.`);
  // N in B: campo inline nella barra
  ctx.tastieraVariante = (e) => {
    if (e.key.toLowerCase() === "n" && !ctx.strumento) { e.preventDefault(); const inp = UI.h(`<input type="text" placeholder="x; z" style="width:120px" aria-label="coordinate nuovo nodo">`); barra.el.querySelector(".suggerimento").replaceChildren("nuovo nodo in ", inp); inp.focus(); inp.addEventListener("keydown", (k) => { if (k.key === "Enter") { const [x, z] = inp.value.split(/[;,\s]+/).filter(Boolean).map((v) => parseFloat(v.replace(",", "."))); if (isFinite(x) && isFinite(z)) { const id = stato.aggiungiNodo(x, z); stato.seleziona({ tipo: "nodo", id }); } barra.suggerisci(""); } if (k.key === "Escape") barra.suggerisci(""); k.stopPropagation(); }); return true; }
    return false;
  };
  const off = stato.on(() => { alto.aggiorna(); UI.albero(albero, stato); UI.ispettore(boxI, stato, ctx); UI.controlli(boxC, stato); UI.modi(boxM, stato, ctx); UI.cronologia(boxH, stato); scala.aggiorna(); aggiornaVuoto(); piano.render(); spazio.ricostruisci(); UI.diagrammaSrotolato(diag, stato); });
  requestAnimationFrame(() => { piano.fit(); piano.render(); });
  return { ctx, smonta: () => { off(); ctx.smonta(); } };
}

// ---------- C «Foglio» ----------
function varianteC(root) {
  root.style.gridTemplateRows = "40px 1fr 34px 260px 40px 34px";
  const vp = UI.h(`<div class="vp"></div>`);
  const schede = UI.h(`<div class="schede"></div>`); const contenuto = UI.h(`<div style="overflow:auto;padding:10px 14px;position:relative"></div>`);
  const riga = UI.h(`<div class="riga-comando"><span>›</span><input type="text" placeholder="N 5 0   ·   B N4 N5   ·   S A4 S3   ·   Q A4 12.5   ·   V N1 incastro   ·   F N4 20 0   ·   A   ·   E" aria-label="riga di comando"><span class="eco"></span></div>`);
  const barra = UI.barraBasso([["›", "riga di comando"], ["Tab", "schede"], ...TASTI_COMUNI]);
  const piano = new Piano(vp, stato, { snapVisibile: false }); let spazio = null;
  const alto = UI.barraAlto(stato, null); root.append(alto.el, vp, schede, contenuto, riga, barra.el);
  const ctx = contesto(root, piano, null, barra);
  alto.aggiorna = (() => { const f = UI.barraAlto(stato, ctx); alto.el.replaceWith(f.el); alto.el = f.el; return f.aggiorna; })();
  vp.appendChild(UI.h(`<div class="titolo">piano XZ · C «Foglio» — comandi dalla riga in basso, dati nelle schede</div>`));
  const scala = UI.scalaDeformata(stato, ctx); vp.appendChild(scala.el);
  const aggiornaVuoto = vuoto(vp, stato, `<b>Nessun nodo.</b><br>Scrivi nella riga in basso: <b>N 0 0</b>, poi <b>N 5 0</b>, poi <b>B N1 N2</b>.<br><b>E</b> carica il telaio d'esempio.`);
  const NOMI = ["Tabella", "Selezione", "Controlli", "Modi", "M srotolato", "Cronologia", "Spazio 3D"]; let scheda = 0;
  const inp = riga.querySelector("input"), eco = riga.querySelector(".eco");
  const renderSchede = () => {
    schede.innerHTML = ""; NOMI.forEach((n, i) => { const b = UI.h(`<button class="${i === scheda ? "attiva" : ""}">${n}</button>`); b.addEventListener("click", () => { scheda = i; stato.emetti(); }); schede.appendChild(b); });
    contenuto.innerHTML = "";
    if (scheda === 0) UI.tabella(contenuto, stato); else if (scheda === 1) UI.ispettore(contenuto, stato, ctx); else if (scheda === 2) UI.controlli(contenuto, stato); else if (scheda === 3) UI.modi(contenuto, stato, ctx);
    else if (scheda === 4) { contenuto.style.padding = "0"; UI.diagrammaSrotolato(contenuto, stato); contenuto.style.padding = ""; }
    else if (scheda === 5) UI.cronologia(contenuto, stato);
    else { contenuto.style.padding = "0"; const box = UI.h(`<div class="vp" style="height:100%"></div>`); contenuto.appendChild(box); spazio = new Spazio(box, stato); spazio.ricostruisci(); contenuto.style.padding = ""; }
  };
  const esegui = (t) => {
    const p = t.trim().split(/\s+/); const c = (p[0] || "").toUpperCase(); const n = (i) => parseFloat((p[i] || "").replace(",", "."));
    const nodo = (id) => stato.modello.nodi.find((x) => x.id === (id || "").toUpperCase()); const asta = (id) => stato.modello.aste.find((x) => x.id === (id || "").toUpperCase());
    try {
      if (c === "N" && isFinite(n(1)) && isFinite(n(2))) { const id = stato.aggiungiNodo(n(1), n(2)); stato.seleziona({ tipo: "nodo", id }); return `${id} creato in (${fmt(n(1))}; ${fmt(n(2))})`; }
      if (c === "B" && nodo(p[1]) && nodo(p[2])) { const id = stato.aggiungiAsta(nodo(p[1]).id, nodo(p[2]).id, p[3]?.toUpperCase() in SEZIONI ? p[3].toUpperCase() : "S1"); if (!id) throw "asta già presente"; stato.seleziona({ tipo: "asta", id }); return `${id} creata`; }
      if (c === "S" && asta(p[1]) && p[2]?.toUpperCase() in SEZIONI) { stato.assegnaSezione(asta(p[1]).id, p[2].toUpperCase()); return `sezione ${p[2].toUpperCase()} → ${asta(p[1]).id}`; }
      if (c === "Q" && asta(p[1]) && isFinite(n(2))) { stato.caricoDistribuito(asta(p[1]).id, n(2)); return `q = ${fmt(n(2))} kN/m → ${asta(p[1]).id}`; }
      if (c === "V" && nodo(p[1])) { const v = (p[2] || "libero").toLowerCase(); stato.assegnaVincolo(nodo(p[1]).id, ["incastro", "cerniera", "carrello"].includes(v) ? v : null); return `${v} → ${nodo(p[1]).id}`; }
      if (c === "F" && nodo(p[1])) { stato.forzaNodale(nodo(p[1]).id, n(2) || 0, n(3) || 0); return `F → ${nodo(p[1]).id}`; }
      if (c === "A") { ctx.analizza(); return "corsa lanciata"; }
      if (c === "E") { stato.esempio(); piano.fit(); stato.emetti(); return "telaio d'esempio"; }
      if (c === "D") { stato.vista.scala = n(1) || null; ctx.mostra("deformata"); return "deformata"; }
      if (c === "M") { ctx.mostra("momento"); return "momento"; }
      if (c === "O") { ctx.mostra("modo", parseInt(p[1]) || 1); return `modo ${parseInt(p[1]) || 1}`; }
      if (c === "X" && (nodo(p[1]) || asta(p[1]))) { stato.elimina(nodo(p[1]) ? { tipo: "nodo", id: nodo(p[1]).id } : { tipo: "asta", id: asta(p[1]).id }); return "eliminato"; }
      if (c === "Z") { stato.annulla(); return "annullato"; }
      throw `comando non riconosciuto: «${t}» — N x z · B Ni Nj [S] · S A S · Q A q · V N tipo · F N Fx Fz · A · E · D [scala] · M · O n · X id · Z`;
    } catch (err) { throw typeof err === "string" ? err : String(err); }
  };
  // ghost mentre si digita
  inp.addEventListener("input", () => {
    const p = inp.value.trim().split(/\s+/); const c = (p[0] || "").toUpperCase();
    if (c === "N" && isFinite(parseFloat(p[1])) && isFinite(parseFloat(p[2]))) { piano.hover = { sx: parseFloat(p[1]), sz: parseFloat(p[2]) }; piano.setGhost({ tipo: "nodo" }); }
    else if (c === "B" && p[1] && p[2]) { const a = stato.modello.nodi.find((x) => x.id === p[1].toUpperCase()), b = stato.modello.nodi.find((x) => x.id === p[2].toUpperCase()); if (a && b) piano.setGhost({ tipo: "asta", da: a.id, a: [b.x, b.z] }); else piano.setGhost(null); }
    else piano.setGhost(null);
    eco.textContent = ""; eco.classList.remove("rosso");
  });
  inp.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { try { eco.textContent = esegui(inp.value); eco.classList.remove("rosso"); inp.value = ""; } catch (err) { eco.textContent = err; eco.classList.add("rosso"); } piano.setGhost(null); }
    if (e.key === "Escape") { inp.value = ""; piano.setGhost(null); inp.blur(); }
    e.stopPropagation();
  });
  ctx.tastieraVariante = (e) => {
    if (e.key === "Tab") { e.preventDefault(); scheda = (scheda + (e.shiftKey ? NOMI.length - 1 : 1)) % NOMI.length; stato.emetti(); return true; }
    if (e.key === "›" || e.key === "/" || e.key === ":") { e.preventDefault(); inp.focus(); return true; }
    if (/^[nbsqvfx]$/i.test(e.key) && !e.metaKey) { e.preventDefault(); inp.value = e.key.toUpperCase() + " "; inp.focus(); return true; }
    return false;
  };
  const off = stato.on(() => { alto.aggiorna(); renderSchede(); scala.aggiorna(); aggiornaVuoto(); piano.render(); spazio?.ricostruisci(); });
  requestAnimationFrame(() => { piano.fit(); piano.render(); inp.focus(); });
  return { ctx, smonta: () => { off(); ctx.smonta(); } };
}

// ---------- switcher del prototipo ----------
function cambiaVariante(d) { const k = Object.keys(VARIANTI); monta(k[(k.indexOf(variante) + d + k.length) % k.length]); }
function montaSwitcher() {
  document.querySelector(".switcher")?.remove();
  const s = UI.h(`<div class="switcher" title="barra del prototipo, non fa parte del design"><button aria-label="variante precedente">←</button><span><span class="n">${variante}</span> · ${VARIANTI[variante]}</span><button aria-label="variante successiva">→</button></div>`);
  s.children[0].addEventListener("click", () => cambiaVariante(-1)); s.children[2].addEventListener("click", () => cambiaVariante(1));
  document.body.appendChild(s);
}
monta(variante);
