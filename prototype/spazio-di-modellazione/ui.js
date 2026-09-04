// PROTOTIPO usa-e-getta (#8). Pezzi di interfaccia condivisi dalle tre varianti:
// ispettore della selezione, controlli della corsa, cronologia, albero, tabella,
// diagramma M srotolato, elenco modi. Tutti renderizzano dentro un contenitore.
import { SEZIONI, kN, fmt, ingombro } from "./model.js";

const h = (html) => { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstChild; };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export function ispettore(box, s, ctx) {
  box.innerHTML = "";
  const sel = s.selezione; const m = s.modello;
  if (!sel) { box.appendChild(h(`<div class="pannello"><h2>NESSUNA SELEZIONE</h2><div class="riga"><span>clic su un nodo o un'asta</span></div><div class="riga"><span>${m.nodi.length} nodi · ${m.aste.length} aste · ${m.carichi.length} carichi</span></div></div>`)); return; }
  const r = s.risultati && !s.stantii ? s.risultati : null;
  if (sel.tipo === "nodo") {
    const n = m.nodi.find((n) => n.id === sel.id); if (!n) return;
    const v = n.vincolo; const nomeV = !v ? "" : v.ry ? "incastro" : v.ux ? "cerniera" : "carrello";
    const f = m.carichi.find((c) => c.tipo === "nodale" && c.nodo === n.id);
    const p = h(`<div class="pannello"><h2>${n.id} · NODO</h2>
      <div class="riga"><span>x; z</span><span><input type="text" data-c="xz" value="${fmt(n.x)}; ${fmt(n.z)}" style="width:110px;text-align:right"></span></div>
      <div class="riga"><span>vincolo</span><span><select data-c="v"><option value="">libero</option><option value="incastro">incastro</option><option value="cerniera">cerniera</option><option value="carrello">carrello</option></select></span></div>
      <div class="riga"><span>F<sub>x</sub>; F<sub>z</sub> [kN]</span><span><input type="text" data-c="f" value="${f ? kN(f.Fx) + "; " + kN(f.Fz) : "0; 0"}" style="width:110px;text-align:right"></span></div>
      ${r ? `<div class="riga"><span>u<sub>x</sub>; u<sub>z</sub></span><span>${fmt(r.spostamenti[n.id].ux * 1e3, 3)}; ${fmt(r.spostamenti[n.id].uz * 1e3, 3)} mm</span></div>` : ""}
      ${r && r.reazioni[n.id] ? `<div class="riga"><span>R<sub>x</sub>; R<sub>z</sub></span><span>${kN(r.reazioni[n.id].Rx)}; ${kN(r.reazioni[n.id].Rz)} kN</span></div>` : ""}
      <div class="riga"><span>aste</span><span>${m.aste.filter((a) => a.i === n.id || a.j === n.id).map((a) => a.id).join(" ") || "—"}</span></div>
      <div class="riga"><span></span><span><button data-c="del" class="rosso">elimina</button></span></div></div>`);
    p.querySelector('[data-c="v"]').value = nomeV;
    p.querySelector('[data-c="v"]').addEventListener("change", (e) => s.assegnaVincolo(n.id, e.target.value || null));
    p.querySelector('[data-c="xz"]').addEventListener("change", (e) => { const [x, z] = leggiCoppia(e.target.value); if (isFinite(x) && isFinite(z)) s.spostaNodo(n.id, x, z); });
    p.querySelector('[data-c="f"]').addEventListener("change", (e) => { const [x, z] = leggiCoppia(e.target.value); s.forzaNodale(n.id, x || 0, z || 0); });
    p.querySelector('[data-c="del"]').addEventListener("click", () => s.elimina(sel));
    box.appendChild(p);
  } else {
    const a = m.aste.find((a) => a.id === sel.id); if (!a) return;
    const sz = SEZIONI[a.sezione]; const ni = m.nodi.find((n) => n.id === a.i), nj = m.nodi.find((n) => n.id === a.j);
    const L = Math.hypot(nj.x - ni.x, nj.z - ni.z); const q = m.carichi.find((c) => c.tipo === "distribuito" && c.asta === a.id);
    const so = r?.sollecitazioni[a.id];
    const p = h(`<div class="pannello"><h2>${a.id} · ${sz.tipo.toUpperCase()} · ${a.i}→${a.j}</h2>
      <div class="riga"><span>lunghezza</span><span>${fmt(L)} m</span></div>
      <div class="riga"><span>sezione</span><span><select data-c="s">${Object.entries(SEZIONI).map(([k, v]) => `<option value="${k}" ${k === a.sezione ? "selected" : ""}>${k} ${v.nome}</option>`).join("")}</select></span></div>
      <div class="riga"><span>armatura</span><span>${sz.armatura}</span></div>
      <div class="riga"><span>materiale</span><span>C25/30 · B450C</span></div>
      <div class="riga"><span>q [kN/m]</span><span><input type="text" data-c="q" value="${q ? kN(q.q) : "0"}" style="width:70px;text-align:right"></span></div>
      <div class="riga"><span>suddivisioni</span><span>1</span></div>
      ${so ? `<div class="riga"><span>M<sub>max</sub></span><span class="${Math.abs(so.Mmax) > 0 ? "" : ""}">${kN(so.Mmax)} kN·m</span></div><div class="riga"><span>N<sub>i</sub>; N<sub>j</sub></span><span>${kN(so.stazioni[0].N)}; ${kN(so.stazioni[20].N)} kN</span></div>` : ""}
      <div class="riga"><span></span><span><button data-c="del" class="rosso">elimina</button></span></div></div>`);
    p.querySelector('[data-c="s"]').addEventListener("change", (e) => s.assegnaSezione(a.id, e.target.value));
    p.querySelector('[data-c="q"]').addEventListener("change", (e) => s.caricoDistribuito(a.id, parseFloat(e.target.value.replace(",", ".")) || 0));
    p.querySelector('[data-c="del"]').addEventListener("click", () => s.elimina(sel));
    box.appendChild(p);
  }
}
const leggiCoppia = (v) => v.split(/[;,\s]+/).filter(Boolean).map((x) => parseFloat(x.replace(",", ".")));

export function controlli(box, s) {
  box.innerHTML = "";
  const r = s.risultati;
  if (!r) { box.appendChild(h(`<div class="pannello controlli"><h2>CONTROLLI</h2><div class="riga"><span class="margine">nessuna corsa — premi <b>A</b> per analizzare</span></div></div>`)); return; }
  if (r.errore) { box.appendChild(h(`<div class="pannello controlli"><h2>CONTROLLI</h2><div class="riga non_passato"><span><i class="punto"></i>${esc(r.errore)}</span></div></div>`)); return; }
  const p = h(`<div class="pannello controlli"><h2>CONTROLLI · ${s.stantii ? '<span style="color:var(--rosso)">RISULTATI STANTII</span>' : "CORSA VALIDA"}</h2></div>`);
  for (const c of s.controlli()) p.appendChild(h(`<div class="riga ${c.esito}"><span><i class="punto"></i>${c.nome}</span><span>${c.esito === "non_applicabile" ? "n.a." : esc(c.valore)}<br><span class="margine">${esc(c.margine || (c.esito === "non_applicabile" ? c.valore : ""))}</span></span></div>`));
  box.appendChild(p);
}

export function cronologia(box, s) {
  box.innerHTML = "";
  const p = h(`<div class="pannello"><h2>CRONOLOGIA · ⌘Z / ⇧⌘Z</h2><div class="cronologia"></div></div>`);
  const c = p.querySelector(".cronologia");
  s.cronologia.forEach((v, i) => { const d = h(`<div class="${i === s.indice ? "corrente" : ""}">${String(i).padStart(3, "0")} ${esc(v.etichetta)}</div>`); d.addEventListener("click", () => s.vaiA(i)); c.appendChild(d); });
  box.appendChild(p); c.scrollTop = c.scrollHeight;
}

export function modi(box, s, ctx) {
  box.innerHTML = "";
  const r = s.risultati; if (!r || r.errore) return;
  const p = h(`<div class="pannello"><h2>MODI · ${s.vista.mostra === "modo" ? "animazione · 1 2 3" : "O per animare"}</h2></div>`);
  let cum = 0;
  r.modi.forEach((m, i) => { cum += m.px; const d = h(`<div class="riga" style="cursor:pointer;${s.vista.mostra === "modo" && s.vista.modo === i + 1 ? "color:var(--rosso);font-weight:700" : ""}"><span>modo ${i + 1} · ${fmt(m.f, 2)} Hz</span><span>m<sub>x</sub> ${(m.px * 100).toFixed(0)} % · Σ ${(cum * 100).toFixed(0)} %</span></div>`); d.addEventListener("click", () => ctx.mostra("modo", i + 1)); p.appendChild(d); });
  box.appendChild(p);
}

export function albero(box, s) {
  box.innerHTML = ""; const m = s.modello, sel = s.selezione;
  const voce = (tipo, id, testo) => { const d = h(`<div class="v ${sel?.tipo === tipo && sel.id === id ? "sel" : ""}">${esc(testo)}</div>`); d.addEventListener("click", () => s.seleziona({ tipo, id })); return d; };
  box.appendChild(h(`<div class="g">NODI (${m.nodi.length})</div>`));
  for (const n of m.nodi) box.appendChild(voce("nodo", n.id, `${n.id}  (${fmt(n.x)}; ${fmt(n.z)})${n.vincolo ? (n.vincolo.ry ? "  incastro" : n.vincolo.ux ? "  cerniera" : "  carrello") : ""}`));
  box.appendChild(h(`<div class="g">ASTE (${m.aste.length})</div>`));
  for (const a of m.aste) box.appendChild(voce("asta", a.id, `${a.id}  ${a.i}→${a.j}  ${SEZIONI[a.sezione].nome.split(" ")[0]}`));
  box.appendChild(h(`<div class="g">SEZIONI</div>`));
  for (const [k, v] of Object.entries(SEZIONI)) box.appendChild(h(`<div class="v" style="cursor:default">${k}  ${esc(v.nome)}</div>`));
  box.appendChild(h(`<div class="g">CARICHI (${m.carichi.length})</div>`));
  for (const c of m.carichi) box.appendChild(h(`<div class="v" style="cursor:default">${c.id}  ${c.tipo === "distribuito" ? `q ${kN(c.q)} kN/m → ${c.asta}` : `F (${kN(c.Fx)}; ${kN(c.Fz)}) kN → ${c.nodo}`}</div>`));
}

export function tabella(box, s) {
  box.innerHTML = ""; const m = s.modello, sel = s.selezione, r = s.risultati && !s.stantii ? s.risultati : null;
  const t = h(`<table class="foglio"><thead><tr><th>id</th><th>x [m]</th><th>z [m]</th><th>vincolo</th><th>u<sub>x</sub> [mm]</th><th>u<sub>z</sub> [mm]</th></tr></thead><tbody></tbody></table>`);
  const tb = t.querySelector("tbody");
  for (const n of m.nodi) { const tr = h(`<tr class="${sel?.tipo === "nodo" && sel.id === n.id ? "sel" : ""}"><td>${n.id}</td><td>${fmt(n.x)}</td><td>${fmt(n.z)}</td><td>${n.vincolo ? (n.vincolo.ry ? "incastro" : n.vincolo.ux ? "cerniera" : "carrello") : "—"}</td><td>${r ? fmt(r.spostamenti[n.id].ux * 1e3, 3) : ""}</td><td>${r ? fmt(r.spostamenti[n.id].uz * 1e3, 3) : ""}</td></tr>`); tr.addEventListener("click", () => s.seleziona({ tipo: "nodo", id: n.id })); tb.appendChild(tr); }
  box.appendChild(t);
  const t2 = h(`<table class="foglio" style="margin-top:14px"><thead><tr><th>id</th><th>i→j</th><th>sezione</th><th>L [m]</th><th>q [kN/m]</th><th>M<sub>max</sub> [kN·m]</th></tr></thead><tbody></tbody></table>`);
  const tb2 = t2.querySelector("tbody");
  for (const a of m.aste) { const ni = m.nodi.find((n) => n.id === a.i), nj = m.nodi.find((n) => n.id === a.j); const q = m.carichi.find((c) => c.tipo === "distribuito" && c.asta === a.id); const tr = h(`<tr class="${sel?.tipo === "asta" && sel.id === a.id ? "sel" : ""}"><td>${a.id}</td><td>${a.i}→${a.j}</td><td>${a.sezione} ${SEZIONI[a.sezione].nome.split(" ")[0]}</td><td>${fmt(Math.hypot(nj.x - ni.x, nj.z - ni.z))}</td><td>${q ? kN(q.q) : ""}</td><td>${r ? kN(r.sollecitazioni[a.id].Mmax) : ""}</td></tr>`); tr.addEventListener("click", () => s.seleziona({ tipo: "asta", id: a.id })); tb2.appendChild(tr); }
  box.appendChild(t2);
}

// Diagramma M «srotolato»: ogni asta come una striscia, in ordine, con il picco scritto.
export function diagrammaSrotolato(box, s) {
  box.innerHTML = ""; const r = s.risultati; const m = s.modello;
  if (!r || r.errore) { box.appendChild(h(`<div class="vuoto">nessuna corsa — premi <span class="k">A</span></div>`)); return; }
  const W = box.clientWidth || 800, H = box.clientHeight || 200; const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg"); svg.setAttribute("width", W); svg.setAttribute("height", H); box.appendChild(svg);
  const Ltot = m.aste.reduce((t, a) => { const ni = m.nodi.find((n) => n.id === a.i), nj = m.nodi.find((n) => n.id === a.j); return t + Math.hypot(nj.x - ni.x, nj.z - ni.z); }, 0) || 1;
  const Mmax = Math.max(...Object.values(r.sollecitazioni).map((x) => x.Mmax)) || 1;
  let x0 = 40; const y0 = H / 2, hh = H / 2 - 28; const sx = (W - 80) / Ltot;
  const add = (tag, at, txt) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(at)) e.setAttribute(k, v); if (txt != null) e.textContent = txt; svg.appendChild(e); return e; };
  add("line", { x1: 30, y1: y0, x2: W - 30, y2: y0, stroke: "#141414", "stroke-width": 1 });
  for (const a of m.aste) {
    const ni = m.nodi.find((n) => n.id === a.i), nj = m.nodi.find((n) => n.id === a.j); const L = Math.hypot(nj.x - ni.x, nj.z - ni.z);
    const so = r.sollecitazioni[a.id]; const attiva = s.selezione?.tipo === "asta" && s.selezione.id === a.id;
    const pts = so.stazioni.map((st) => [x0 + st.x_rel * L * sx, y0 + (st.M / Mmax) * hh]); // M>0 verso il basso = lato teso in basso
    add("path", { d: `M${x0},${y0} L${pts.map((p) => p.join(",")).join(" L")} L${x0 + L * sx},${y0} Z`, fill: "#b8321e", "fill-opacity": attiva ? .3 : .14, stroke: "#b8321e", "stroke-width": attiva ? 1.6 : 1 });
    add("line", { x1: x0, y1: y0 - hh - 6, x2: x0, y2: y0 + hh + 6, stroke: "#a9a8a3", "stroke-width": 1, "stroke-dasharray": "3 3" });
    add("text", { x: x0 + 4, y: 14, "font-family": "SF Mono, Menlo, monospace", "font-size": 11, fill: attiva ? "#b8321e" : "#141414", "font-weight": attiva ? 700 : 400 }, `${a.id} ${a.i}→${a.j}`);
    const picco = so.stazioni.reduce((b, st) => (Math.abs(st.M) > Math.abs(b.M) ? st : b), so.stazioni[0]);
    add("text", { x: x0 + picco.x_rel * L * sx, y: y0 + (picco.M / Mmax) * hh + (picco.M > 0 ? 14 : -5), "font-family": "SF Mono, Menlo, monospace", "font-size": 11, fill: "#b8321e", "text-anchor": "middle" }, `${kN(picco.M)}`);
    x0 += L * sx;
  }
  add("text", { x: W - 30, y: H - 8, "font-family": "SF Mono, Menlo, monospace", "font-size": 11, fill: "#6f6f6b", "text-anchor": "end" }, `M [kN·m] · lato teso in basso · scala ${kN(Mmax)} = ${Math.round(hh)} px`);
}

export function barraAlto(s, ctx) {
  const b = h(`<div class="barra-alto"><b>NOVA</b><span>telaio-lab · prototipo</span><span class="dx"></span></div>`);
  const dx = b.querySelector(".dx");
  const aggiorna = () => {
    dx.innerHTML = "";
    const st = h(`<span class="stato-corsa ${s.stantii ? "stantio" : ""}">${!s.risultati ? "nessuna corsa" : s.stantii ? "risultati stantii · rilancia (A)" : "corsa valida"}</span>`);
    dx.appendChild(st);
    for (const [k, v] of [["modello", "modello"], ["deformata", "deformata"], ["M", "momento"], ["modo", "modo"]]) { const bt = h(`<button ${s.vista.mostra === v ? 'style="background:var(--inchiostro);color:var(--terra)"' : ""}>${k}</button>`); bt.addEventListener("click", () => ctx.mostra(v)); dx.appendChild(bt); }
    const an = h(`<button class="rosso">analizza · A</button>`); an.addEventListener("click", () => ctx.analizza()); dx.appendChild(an);
  };
  aggiorna(); return { el: b, aggiorna };
}

export function barraBasso(tasti, ctx) {
  const b = h(`<div class="barra-basso"><span class="tasti"></span><span class="suggerimento"></span><span class="dx">piano XZ · griglia 0,50 m · m-kN a video, mm-N-MPa nel modello</span></div>`);
  const t = b.querySelector(".tasti");
  t.innerHTML = tasti.map(([k, n]) => `<span><span class="k">${k}</span>${n}</span>`).join(" ");
  return { el: b, suggerisci: (s, rosso) => { const e = b.querySelector(".suggerimento"); e.textContent = s || ""; e.style.color = rosso ? "var(--rosso)" : "var(--inchiostro)"; } };
}

export function scalaDeformata(s, ctx) {
  const d = h(`<div class="scala"></div>`);
  const aggiorna = () => {
    if (!s.risultati || s.risultati.errore) { d.textContent = ""; return; }
    if (s.vista.mostra === "deformata") { const k = s.scalaDeformata(ingombro(s.modello).w); d.innerHTML = `deformata <b>×${k}</b> ${s.vista.scala ? "(a mano)" : "(auto)"} · u<sub>max</sub> ${fmt(s.risultati.umax * 1e3, 3)} mm · ombra indeformata`; }
    else if (s.vista.mostra === "modo") { const m = s.risultati.modi[s.vista.modo - 1]; d.innerHTML = m ? `modo <b>${s.vista.modo}</b> · ${fmt(m.f, 2)} Hz · T ${fmt(1 / m.f, 3)} s · ampiezza arbitraria · 1 2 3 cambiano modo` : ""; }
    else if (s.vista.mostra === "momento") { d.innerHTML = `M · lato teso · <b>${kN(Math.max(...Object.values(s.risultati.sollecitazioni).map((x) => x.Mmax)))} kN·m</b> al picco`; }
    else d.textContent = "";
  };
  aggiorna(); return { el: d, aggiorna };
}
export { h, esc };
