// La palette ⌘K (story 8, P3): cerca ogni comando per nome, mostra la scorciatoia accanto, e
// accetta il valore nella query — «sezione 300 × 500», «q -12,5». Non esegue niente da sé:
// passa voce e valore a `app.js`, che li serve con lo stesso ramo del tasto.

export function punteggio(nome, q) {
  if (!q) return 1;
  const i = nome.indexOf(q);
  if (i >= 0) return 100 - i;
  let k = 0, p = 0;
  for (const ch of nome) if (ch === q[k]) { k++; p += 3; }
  return k === q.length ? p : 0;
}

/** Le voci che rispondono alla query, con il valore che la segue. Con una query, al massimo nove. */
export function filtraVoci(voci, query) {
  const testo = String(query ?? "").trim();
  if (testo === "") return voci.map((voce) => ({ voce, valore: null, punti: 1 }));  // tutte: la lista che insegna i tasti
  const [parola, ...resto] = testo.split(/\s+/);
  const q = parola.toLowerCase();
  const valore = resto.length ? resto.join(" ") : null;
  return voci
    .map((voce, ordine) => {
      const tasto = voce.modificatore ? "" : String(voce.tasto).toLowerCase();
      const punti = tasto === q ? 120 : Math.max(punteggio(voce.etichetta.toLowerCase(), q), punteggio(voce.codice.toLowerCase(), q));
      return { voce, valore, punti, ordine };
    })
    .filter((x) => x.punti > 0)
    .sort((a, b) => b.punti - a.punti || a.ordine - b.ordine)
    .slice(0, 9)
    .map(({ voce, valore: v, punti }) => ({ voce, valore: v, punti }));
}

export function creaPalette(radice, { suScelta }) {
  const campo = radice.querySelector("input");
  const elenco = radice.querySelector("ul");
  let voci = [], disponibili = new Set(), risultati = [], attiva = 0;

  function disegna() {
    risultati = filtraVoci(voci, campo.value);
    attiva = Math.min(attiva, Math.max(0, risultati.length - 1));
    elenco.replaceChildren(...(risultati.length ? risultati.map((r, i) => {
      const li = document.createElement("li");
      li.setAttribute("role", "option");
      li.setAttribute("aria-selected", String(i === attiva));
      li.dataset.i = i;
      const ora = disponibili.has(r.voce.codice);
      if (!ora) li.className = "non-ora";
      const nome = document.createElement("span");
      nome.append(document.createTextNode(r.voce.etichetta));
      if (r.valore) { const b = document.createElement("b"); b.textContent = ` ${r.valore}`; nome.append(b); }
      if (!ora) nome.append(document.createTextNode(" · non ora"));
      if (r.voce.aiuto) { const s = document.createElement("small"); s.textContent = r.voce.aiuto; nome.append(s); }
      const kbd = document.createElement("kbd"); kbd.textContent = r.voce.tasto;
      li.append(nome, kbd);
      return li;
    }) : [(() => { const li = document.createElement("li"); li.className = "nulla"; li.textContent = "nessun comando: prova «nodo», «sezione», «carico»"; return li; })()]));
  }
  const scegli = (i) => { const r = risultati[i]; if (!r) return; chiudi(); suScelta(r.voce, r.valore); };
  function chiudi() { radice.hidden = true; }

  campo.addEventListener("input", () => { attiva = 0; disegna(); });
  campo.addEventListener("keydown", (ev) => {
    if (ev.key === "ArrowDown") { attiva = Math.min(risultati.length - 1, attiva + 1); disegna(); }
    else if (ev.key === "ArrowUp") { attiva = Math.max(0, attiva - 1); disegna(); }
    else if (ev.key === "Enter") scegli(attiva);
    else if (ev.key === "Escape") chiudi();
    else return;  // le lettere restano al campo, e non arrivano al listener globale perché `daControllo` le lascia lì
    ev.preventDefault(); ev.stopPropagation();
  });
  elenco.addEventListener("click", (ev) => { const li = ev.target.closest("[data-i]"); if (li) scegli(Number(li.dataset.i)); });

  return {
    apri({ voci: v, disponibili: d }) { voci = v; disponibili = d; campo.value = ""; attiva = 0; radice.hidden = false; disegna(); campo.focus(); },
    chiudi,
    get aperta() { return !radice.hidden; },
  };
}
