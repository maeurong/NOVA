// PROTOTIPO usa-e-getta (#8). Palette ⌘K: ricerca fuzzy sui comandi, scorciatoia
// visibile su ogni voce, valori dentro la query («sezione 30x50», «q 12.5»).
export class Palette {
  constructor(comandi) { this.comandi = comandi; this.el = null; this.attivo = 0; }
  apri() {
    if (this.el) return;
    const d = document.createElement("div"); d.className = "palette";
    d.innerHTML = `<input type="text" placeholder="comando o valore… (es. «sezione 30x50», «q 12.5», «modo 2»)" aria-label="palette comandi"><div class="voci"></div>`;
    document.body.appendChild(d); this.el = d;
    const inp = d.querySelector("input"); inp.focus();
    inp.addEventListener("input", () => { this.attivo = 0; this.render(); });
    inp.addEventListener("keydown", (e) => {
      const v = this.filtra(inp.value);
      if (e.key === "ArrowDown") { this.attivo = Math.min(v.length - 1, this.attivo + 1); this.render(); e.preventDefault(); }
      else if (e.key === "ArrowUp") { this.attivo = Math.max(0, this.attivo - 1); this.render(); e.preventDefault(); }
      else if (e.key === "Enter") { const c = v[this.attivo]; if (c) { this.chiudi(); c.esegui(c.arg); } e.preventDefault(); }
      else if (e.key === "Escape") { this.chiudi(); e.preventDefault(); }
      e.stopPropagation();
    });
    d.addEventListener("pointerdown", (e) => { const v = e.target.closest(".voce"); if (v) { const c = this.filtra(inp.value)[+v.dataset.i]; this.chiudi(); c?.esegui(c.arg); } });
    this.render();
  }
  chiudi() { this.el?.remove(); this.el = null; }
  get aperta() { return !!this.el; }
  filtra(q) {
    const s = q.trim().toLowerCase(); const parole = s.split(/\s+/).filter(Boolean);
    const testo = parole.filter((p) => !/^[\d.,x×]+$/.test(p)).join(" ");
    const numeri = parole.filter((p) => /^[\d.,x×]+$/.test(p));
    return this.comandi()
      .map((c) => ({ ...c, punti: punteggio(c.nome.toLowerCase(), testo), arg: numeri.join(" ") }))
      .filter((c) => c.punti > 0 && (!numeri.length || c.accettaValore))
      .sort((a, b) => b.punti - a.punti).slice(0, 9);
  }
  render() {
    const inp = this.el.querySelector("input"); const v = this.filtra(inp.value); const box = this.el.querySelector(".voci");
    box.innerHTML = v.length ? v.map((c, i) => `<div class="voce ${i === this.attivo ? "attiva" : ""} ${c.rosso ? "rosso" : ""}" data-i="${i}"><span>${c.nome}${c.arg ? " <b>" + c.arg + "</b>" : ""}</span><span class="k">${c.tasto || ""}</span></div>`).join("") : `<div class="nulla">nessun comando — prova «nodo», «asta», «analizza»</div>`;
  }
}
function punteggio(nome, q) {
  if (!q) return 1;
  if (nome.includes(q)) return 100 - nome.indexOf(q);
  // fuzzy: ogni carattere in ordine
  let i = 0, p = 0; for (const ch of nome) { if (ch === q[i]) { i++; p += 3; } } return i === q.length ? p : 0;
}
