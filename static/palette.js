// La palette ⌘K (story 8, P3): cerca ogni comando per nome, mostra la scorciatoia accanto, e
// accetta il valore nella query — «sezione 300 × 500», «q -12,5». Non esegue niente da sé:
// passa voce e valore a `app.js`, che li serve con lo stesso ramo del tasto.

export const NESSUN_COMANDO = "nessun comando: prova «nodo», «sezione», «carico»";

/** Quanto `nome` risponde a `q`, che arriva già in minuscolo e mai vuota. */
export function punteggio(nome, q) {
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
    .map((voce) => {
      const tasto = voce.modificatore ? "" : String(voce.tasto).toLowerCase();
      const punti = tasto === q ? 120 : Math.max(punteggio(voce.etichetta.toLowerCase(), q), punteggio(voce.codice.toLowerCase(), q));
      return { voce, valore, punti };
    })
    .filter((x) => x.punti > 0)
    // ponytail: `sort` è stabile da ES2019, quindi a parità di punti resta l'ordine di `voci`.
    // Non serve portarsi dietro un indice e rispogliarlo dopo.
    .sort((a, b) => b.punti - a.punti)
    .slice(0, 9);
}

export function creaPalette(radice, { suScelta, suChiusura = null }) {
  const campo = radice.querySelector("input");
  const elenco = radice.querySelector("ul");
  const stato = radice.querySelector("#palette-stato");
  let voci = [], disponibili = new Set(), risultati = [], attiva = 0;

  function riga(r, i) {
    const li = document.createElement("li");
    li.id = `palette-voce-${i}`;
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
  }

  // «nessun comando» non è una voce di lista: un `listbox` possiede solo `option`. Sta nel
  // `<p id="palette-stato" role="status">` sotto l'elenco, che lo mostra a chi guarda e lo
  // annuncia una volta a chi ascolta. L'elenco resta vuoto e collassa: a schermo è lo stesso
  // riquadro di prima, ma la frase è scritta in un posto solo.
  function disegna() {
    risultati = filtraVoci(voci, campo.value);
    attiva = Math.min(attiva, Math.max(0, risultati.length - 1));
    elenco.replaceChildren(...risultati.map(riga));
    stato.textContent = risultati.length ? "" : NESSUN_COMANDO;
    // `aria-expanded` fisso a «true» in `index.html` diceva a chi ascolta che l'elenco c'è
    // anche quando «nessun comando» lo aveva svuotato: il combobox va con la lista che ha.
    campo.setAttribute("aria-expanded", String(risultati.length > 0));
    campo.setAttribute("aria-activedescendant", risultati.length ? `palette-voce-${attiva}` : "");
  }

  // Le frecce non ridisegnano: con 22 voci in `max-height: 50vh` ogni `replaceChildren`
  // azzerava lo scorrimento, e la voce attiva finiva fuori dalla vista (fix round 1, ALTO).
  // Si sposta `aria-selected` da un `<li>` all'altro, e la lista scorre quel tanto che basta.
  function evidenzia(nuova) {
    if (!risultati.length) return;
    elenco.children[attiva]?.setAttribute("aria-selected", "false");
    attiva = nuova;
    const li = elenco.children[attiva];
    li?.setAttribute("aria-selected", "true");
    li?.scrollIntoView?.({ block: "nearest" });  // `?.`: il DOM finto dei test non ce l'ha
    campo.setAttribute("aria-expanded", String(risultati.length > 0));
    campo.setAttribute("aria-activedescendant", `palette-voce-${attiva}`);
  }

  const scegli = (i) => { const r = risultati[i]; if (!r) return; chiudi(); suScelta(r.voce, r.valore); };

  /** Chiudere lascia il fuoco sul `body`, e chi aveva un campo aperto sotto la palette si
   *  ritrovava a battere cifre che non arrivavano da nessuna parte: `suChiusura` dice a chi
   *  possiede la pagina dove rimetterlo. Anche da `scegli`, ma lì `suScelta` viene subito dopo
   *  e riapre il campo che vuole lui, quindi l'ultimo `focus` è il suo.
   *
   *  La guardia non è una micro-ottimizzazione: `radice.hidden = true` fa partire il `blur` del
   *  campo, che richiama `chiudi` — senza, `suChiusura` girerebbe due volte per una chiusura. */
  function chiudi() {
    if (radice.hidden) return;
    radice.hidden = true;
    suChiusura?.();
  }

  campo.addEventListener("input", () => { attiva = 0; disegna(); });
  // Il fuoco che se ne va chiude: una palette aperta ma spenta terrebbe il campo davanti al
  // modello senza ricevere più un tasto. Le voci si scelgono su `pointerdown`, che precede
  // il `blur` — con `click`, che arriva dopo, il riquadro era già chiuso e il clic cadeva
  // nel vuoto.
  campo.addEventListener("blur", chiudi);
  campo.addEventListener("keydown", (ev) => {
    if (ev.key === "ArrowDown") evidenzia(Math.min(risultati.length - 1, attiva + 1));
    else if (ev.key === "ArrowUp") evidenzia(Math.max(0, attiva - 1));
    // Solo l'Invio nudo sceglie: `⌘⏎`/`⇧⌘⏎` sono corri e verifica (giornata 12) e qui dentro
    // non fanno niente — né la scelta né la corsa, perché il tasto non risale.
    else if (ev.key === "Enter") { if (!(ev.metaKey || ev.ctrlKey || ev.shiftKey)) scegli(attiva); }
    else if (ev.key === "Escape" || ev.key === "Tab") chiudi();
    else return;  // le lettere restano al campo, e non arrivano al listener globale perché `daControllo` le lascia lì
    ev.preventDefault(); ev.stopPropagation();
  });
  elenco.addEventListener("pointerdown", (ev) => { const li = ev.target.closest("[data-i]"); if (li) scegli(Number(li.dataset.i)); });

  return {
    apri({ voci: v, disponibili: d }) {
      voci = v; disponibili = d ?? new Set();  // senza il set, tutto è «non ora»: mai un TypeError
      campo.value = ""; attiva = 0; radice.hidden = false; disegna(); campo.focus();
    },
    chiudi,
    get aperta() { return !radice.hidden; },
  };
}
