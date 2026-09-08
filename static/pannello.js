// L'ispettore della selezione, con l'editor di ciò che è selezionato. Fuori da `app.js` perché
// con i sei gradi, le tre preimpostazioni e i tre editor della 11b (asta, sezione, materiale)
// raddoppia due volte, e `app.js` ha già i due modi e la cucitura.

import { leggiNumero, stampaNumero } from "./numeri.js";
import { nodo, asta, sezione, materiale, asteDellaSezione, vesteDi } from "./modello.js";
import { LATI, VESTI, svgSezione, geometriaImpossibile } from "./sezione.js";
import { puntiConcrete02, puntiSteel02, valoriDaMostrare, svgCurva } from "./legame.js";
import { GRADI, PREIMPOSTAZIONI, vincoloVuoto, nomePreimpostazione, descrizione } from "./vincoli.js";

const mmNudo = (v) => stampaNumero(v, { decimali: 0, migliaia: true });
const mm = (v) => `${mmNudo(v)} mm`;
// «0,8» e non «0,800»: gli zeri in coda di un fattore di danno non dicono niente in più.
const conciso = (v) => stampaNumero(v, { decimali: 3 }).replace(/,?0+$/, "");

const CERCA = { nodo, asta, sezione, materiale };

/** L'entità selezionata, o `null` — anche quando il tipo è uno che l'ispettore non mostra
 *  (le azioni, le combinazioni). Le quattro vie sono esplicite: un `else` che faceva cadere
 *  tutto ciò che non è nodo su `aste.find` mostrava i numeri di un'asta con una **sezione**
 *  selezionata, perché gli identificatori delle due liste partono entrambi da 1. */
function entitaSelezionata(m, selezione) {
  return CERCA[selezione.tipo]?.(m, selezione.id) ?? null;
}

function righeDiNodo(m, n) {
  return [["identificatore", String(n.id)], ["nome", n.nome ?? "—"],
          ["x", mm(n.x)], ["z", mm(n.z)], ["vincolo", descrizione(n.vincolo)]];
}

/** «E ×0,8 · fc ×0,9 · martinetto 3», e senza nota niente separatore appeso. */
function testoDanno(d) {
  if (!d) return "nessuno";
  const parti = [`E ×${conciso(d.fattore_E)}`, `fc ×${conciso(d.fattore_fc)}`];
  if (d.nota) parti.push(d.nota);
  return parti.join(" · ");
}

/** «rilievo, modificata» / «utente» / «—». Senza `origine` non si inventa niente: il campo
 *  manca su tutto ciò che è stato disegnato prima della story 55. */
const testoOrigine = (o) => (o ? `${o.sorgente}${o.modificata ? ", modificata" : ""}` : "—");

function righeDiAsta(m, a) {
  const i = nodo(m, a.nodo_i), j = nodo(m, a.nodo_j);
  const lunghezza = i && j ? mm(Math.hypot(j.x - i.x, j.y - i.y, j.z - i.z)) : "—";
  const idSezione = a.sezione ?? null;
  // Per nome, non per identificatore: «300 × 500» dice cosa porta l'asta, «1» no.
  const nomeSezione = idSezione === null
    ? "non assegnata" : (sezione(m, idSezione)?.nome ?? String(idSezione));
  return [["identificatore", String(a.id)], ["nome", a.nome ?? "—"],
          ["da → a", `${a.nodo_i} → ${a.nodo_j}`], ["lunghezza", lunghezza],
          ["sezione", nomeSezione], ["danno", testoDanno(a.danno)]];
}

const nomeMateriale = (m, id) => materiale(m, id)?.nome ?? "—";

function righeDiSezione(m, s) {
  const st = s.staffe;
  const r = s.riduzione ?? {};
  const ridotti = LATI.filter((l) => r[l]);
  const quante = asteDellaSezione(m, s.id).length;
  return [
    ["identificatore", String(s.id)],
    ["nome", s.nome],
    ["dimensioni", `${mmNudo(s.b)} × ${mmNudo(s.h)} mm`],
    ["copriferro", mm(s.copriferro)],
    ["calcestruzzo", nomeMateriale(m, s.calcestruzzo)],
    ["acciaio", nomeMateriale(m, s.acciaio)],
    ["staffe", st ? `Ø${mmNudo(st.diametro)} / ${mmNudo(st.passo)}, ${st.bracci} bracci` : "nessuna"],
    ["barre", s.file.length
      ? s.file.map((f) => `${f.lato} ${f.n}Ø${mmNudo(f.diametro)}`).join(" · ") : "nessuna"],
    ["riduzione", ridotti.length
      ? `${ridotti.map((l) => `${l} ${mmNudo(r[l])}`).join(" · ")} mm` : "nessuna"],
    // «1 asta», non «1 aste»: il plurale scritto a macchina è il primo segno che nessuno ha
    // riletto la riga. Zero resta plurale, in italiano.
    ["usata da", `${quante} ${quante === 1 ? "asta" : "aste"}`],
    ["origine", testoOrigine(s.origine)],
  ];
}

function righeDiMateriale(m, k) {
  return [["identificatore", String(k.id)], ["nome", k.nome], ["tipo", k.tipo],
          ["classe", k.classe], ["personalizzato", k.personalizzato ? "sì" : "no"],
          ["origine", testoOrigine(k.origine)]];
}

const RIGHE = { nodo: righeDiNodo, asta: righeDiAsta, sezione: righeDiSezione, materiale: righeDiMateriale };
const righeDe = (m, tipo, e) => RIGHE[tipo](m, e);

/** Le righe della `<dl>` per la selezione corrente, o `null` se punta a un oggetto sparito o
 *  a un tipo che l'ispettore non mostra — chi chiama azzera già la selezione, ma qui non ci
 *  si conta lo stesso. */
export function righe(m, selezione) {
  const e = entitaSelezionata(m, selezione);
  return e ? righeDe(m, selezione.tipo, e) : null;
}

/** Il vincolo con un solo grado cambiato, ricostruito sui sei — mai solo quello toccato:
 *  `impostaVincolo` (`comandi.js:143`) sovrascrive tutto il campo che riceve. Sempre i sei
 *  booleani, mai `null`: spegnere l'ultimo grado acceso **dichiara** il nodo libero, non
 *  cancella il campo — sono due stati diversi per `nova/check.py` (vedi `copiaPreimpostazione`). */
export function prossimoVincolo(vincoloAttuale, grado, acceso) {
  const nuovo = Object.fromEntries(GRADI.map((g) => [g, Boolean(vincoloAttuale?.[g])]));
  nuovo[grado] = acceso;
  return nuovo;
}

/** Una preimpostazione copiata, mai la costante congelata per riferimento — chi la riceve
 *  non deve poter far viaggiare la stessa identità fino a `vincoli.js`. "libero" dichiara il
 *  nodo libero (sei booleani falsi, `vincoloVuoto()`), non lo cancella: `null` resta lo stato
 *  di un nodo **mai toccato** (`nova/modello.py`, «una scelta dell'utente, non una
 *  dimenticanza»). Da qui `null` non esce mai, e il ramo che lo cancella in `impostaVincolo`
 *  (`comandi.js:147`) oggi è raggiungibile solo dai test. */
export function copiaPreimpostazione(nome) {
  return nome === "libero" ? vincoloVuoto() : { ...PREIMPOSTAZIONI[nome] };
}

/** Se il bottone `nome` va mostrato premuto per questo vincolo. «libero» è premuto solo da
 *  un vincolo **dichiarato**: su un nodo mai toccato il bottone resta da premere, perché
 *  premerlo è il rimedio al «nodi al piede senza vincolo dichiarato» del Check Model, e un
 *  bottone già premuto non suggerisce niente. */
export function presetPremuto(nome, vincolo) {
  if (nome === "libero") return Boolean(vincolo) && !GRADI.some((g) => vincolo[g]);
  return nome === nomePreimpostazione(vincolo);
}

// --- i mattoni comuni ai quattro editor ----------------------------------------------------

const testoNumero = (v) =>
  (v === null || v === undefined ? "" : stampaNumero(v, { decimali: Number.isInteger(v) ? 0 : 3 }));

/** Un campo numerico con nome accessibile intero, che legge con `leggiNumero` al `change`
 *  (P9: unità ed espressioni scritte come le scrive una persona). Se il testo non si legge,
 *  torna com'era e lo dice: un campo che tiene «trecento» a schermo e un modello che tiene
 *  300 sono due verità. */
function campoNumero({ etichetta, nome = etichetta, valore, unita = "", alCambio, suAvviso }) {
  const et = document.createElement("label");
  const c = document.createElement("input");
  c.type = "text"; c.className = "numero"; c.value = testoNumero(valore);
  c.setAttribute("inputmode", "decimal"); c.setAttribute("aria-label", nome);
  c.addEventListener("change", () => {
    const v = leggiNumero(c.value);
    if (v === null) { suAvviso(`«${c.value}» non è un numero`); c.value = testoNumero(valore); return; }
    alCambio(v);
  });
  et.append(document.createTextNode(etichetta), c);
  if (unita) et.append(document.createTextNode(unita));
  return { etichetta: et, controllo: c };
}

function scelta({ etichetta, nome = etichetta, opzioni, valore, alCambio }) {
  const et = document.createElement("label");
  const s = document.createElement("select");
  s.setAttribute("aria-label", nome);
  for (const [v, testo] of opzioni) {
    const o = document.createElement("option"); o.value = String(v); o.textContent = testo;
    if (String(v) === String(valore ?? "")) o.selected = true;
    s.append(o);
  }
  s.addEventListener("change", () => alCambio(s.value));
  et.append(document.createTextNode(etichetta), s);
  return { etichetta: et, controllo: s };
}

function gruppo(legenda, classe) {
  const f = document.createElement("fieldset"); f.className = classe;
  const l = document.createElement("legend"); l.textContent = legenda; f.append(l);
  return f;
}

function bottone(testo, alClic) {
  const b = document.createElement("button");
  b.type = "button"; b.textContent = testo;
  b.addEventListener("click", alClic);
  return b;
}

const NOME_GRADO = {
  ux: "traslazione X (ux)", uy: "traslazione Y (uy)", uz: "traslazione Z (uz)",
  rx: "rotazione X (rx)", ry: "rotazione Y (ry)", rz: "rotazione Z (rz)",
};

function editorVincolo(m, n, azioni) {
  const fila = document.createElement("fieldset");
  fila.className = "vincolo-preimpostazioni";
  const legendaFila = document.createElement("legend");
  legendaFila.textContent = "preimpostazione";
  fila.append(legendaFila);
  const bottoni = [];
  for (const nome of [...Object.keys(PREIMPOSTAZIONI), "libero"]) {
    const b = bottone(nome, () => azioni.suVincolo(n.id, copiaPreimpostazione(nome)));
    // doppio canale: premuto è uno stato, non un colore (stile.css)
    b.setAttribute("aria-pressed", String(presetPremuto(nome, n.vincolo)));
    fila.append(b);
    bottoni.push(b);
  }

  const gradi = document.createElement("fieldset");
  gradi.className = "vincolo-gradi";
  const legendaGradi = document.createElement("legend");
  legendaGradi.textContent = "gradi bloccati";
  gradi.append(legendaGradi);
  const caselle = [];
  for (const g of GRADI) {
    const et = document.createElement("label");
    const c = document.createElement("input");
    c.type = "checkbox";
    c.checked = Boolean(n.vincolo?.[g]);
    // il testo visibile resta "ux": il nome accessibile lo contiene e basta (WCAG 2.5.3)
    c.setAttribute("aria-label", NOME_GRADO[g]);
    c.addEventListener("change", () => azioni.suVincolo(n.id, prossimoVincolo(n.vincolo, g, c.checked)));
    et.append(c, document.createTextNode(g));
    gradi.append(et);
    caselle.push(c);
  }

  return { elementi: [fila, gradi], controlli: [...bottoni, ...caselle] };
}

function editorAsta(m, a, azioni) {
  const controlli = [];
  const sez = gruppo("sezione", "editor");
  const s = scelta({ etichetta: "sezione", nome: `sezione dell'asta ${a.id}`,
                     opzioni: [["", "— non assegnata"], ...m.sezioni.map((k) => [k.id, k.nome])],
                     valore: a.sezione,
                     alCambio: (v) => azioni.suAssegna(a.id, v === "" ? null : Number(v)) });
  sez.append(s.etichetta); controlli.push(s.controllo);

  // I tre valori partono sempre interi: `impostaDanno` vuole il dizionario completo, e un
  // fattore mandato da solo lascerebbe l'altro a `undefined` invece che a «integro».
  const d = a.danno ?? { fattore_E: 1, fattore_fc: 1, nota: "" };
  const danno = gruppo("danno dal rilievo", "editor editor-campi");
  const invia = (campo, v) => azioni.suDanno(a.id, { ...d, [campo]: v });
  for (const [campo, etichetta] of [["fattore_E", "fattore su E"], ["fattore_fc", "fattore su fc"]]) {
    const c = campoNumero({ etichetta, nome: `${etichetta} dell'asta ${a.id}`, valore: d[campo],
                            alCambio: (v) => invia(campo, v), suAvviso: azioni.suAvviso });
    danno.append(c.etichetta); controlli.push(c.controllo);
  }
  const et = document.createElement("label");
  const nota = document.createElement("input");
  nota.type = "text"; nota.value = d.nota;
  nota.setAttribute("aria-label", `nota sul danno dell'asta ${a.id}`);
  nota.addEventListener("change", () => invia("nota", nota.value));
  et.append(document.createTextNode("nota"), nota);
  danno.append(et); controlli.push(nota);
  if (a.danno) {
    const via = bottone("togli danno", () => azioni.suDanno(a.id, null));
    danno.append(via); controlli.push(via);
  }
  return { elementi: [sez, danno], controlli };
}

function editorSezione(m, s, azioni) {
  const controlli = [];
  const agg = (f, c) => { f.append(c.etichetta); controlli.push(c.controllo); };
  const num = (etichetta, nome, valore, alCambio, unita = " mm") =>
    campoNumero({ etichetta, nome, valore, unita, alCambio, suAvviso: azioni.suAvviso });
  const campi = (c) => azioni.suSezione(s.id, c);

  const dim = gruppo("dimensioni", "editor editor-campi");
  for (const campo of ["b", "h", "copriferro"]) {
    agg(dim, num(campo, `${campo} della sezione ${s.nome}`, s[campo], (v) => campi({ [campo]: v })));
  }

  const mat = gruppo("materiali", "editor");
  for (const tipo of ["calcestruzzo", "acciaio"]) {
    agg(mat, scelta({ etichetta: tipo, nome: `${tipo} della sezione ${s.nome}`,
                      opzioni: m.materiali.filter((k) => k.tipo === tipo).map((k) => [k.id, k.nome]),
                      valore: s[tipo], alCambio: (v) => campi({ [tipo]: Number(v) }) }));
  }

  // P8, divulgazione progressiva: senza staffe non ci sono diametro, passo e bracci da
  // mostrare — c'è un comando solo, quello che le fa esistere.
  const staffe = gruppo("staffe", "editor editor-campi");
  if (!s.staffe) {
    const b = bottone("aggiungi staffe Ø8 / 150",
                      () => campi({ staffe: { diametro: 8, passo: 150, bracci: 2 } }));
    staffe.append(b); controlli.push(b);
  } else {
    for (const [campo, etichetta, nome, unita] of [
      ["diametro", "Ø", "diametro delle staffe", " mm"],
      ["passo", "passo", "passo delle staffe", " mm"],
      ["bracci", "bracci", "bracci delle staffe", ""],
    ]) {
      agg(staffe, num(etichetta, nome, s.staffe[campo],
                      (v) => campi({ staffe: { ...s.staffe, [campo]: v } }), unita));
    }
    const via = bottone("togli staffe", () => campi({ staffe: null }));
    staffe.append(via); controlli.push(via);
  }

  // `suFila` vuole numero e diametro insieme: ogni campo manda il proprio valore nuovo e
  // quello corrente dell'altro, altrimenti cambiare «n» riporterebbe il diametro al default.
  const barre = gruppo("barre per lato", "editor editor-campi");
  for (const lato of LATI) {
    const f = s.file.find((k) => k.lato === lato) ?? { n: 0, diametro: 16 };
    const invia = (n, diametro) => azioni.suFila(s.id, lato, n, diametro);
    agg(barre, num(`${lato} n`, `numero di barre ${lato}`, f.n, (v) => invia(v, f.diametro), ""));
    agg(barre, num("Ø", `diametro delle barre ${lato}`, f.diametro, (v) => invia(f.n, v)));
  }

  const rid = gruppo("riduzione, mm mancanti", "editor editor-campi");
  const r = s.riduzione ?? { sup: 0, inf: 0, sx: 0, dx: 0 };
  for (const lato of LATI) {
    agg(rid, num(lato, `riduzione ${lato} della sezione ${s.nome}`, r[lato] ?? 0,
                 (v) => campi({ riduzione: { ...r, [lato]: v } })));
  }

  const disegno = document.createElement("div");
  disegno.className = "sezione-disegno";
  disegno.innerHTML = svgSezione(s);
  const elementi = [dim, mat, staffe, barre, rid, disegno];
  // Il rosso non è mai il primo canale: la parola «attenzione» apre la riga, il colore la
  // conferma. Chi non distingue il rosso legge lo stesso che cosa non va.
  const motivo = geometriaImpossibile(s);
  if (motivo) {
    const p = document.createElement("p"); p.className = "avviso";
    p.textContent = `attenzione: ${motivo}`;
    elementi.push(p);
  } else if (!s.staffe && s.file.length) {
    // Il disegno senza cerchi non è un difetto del disegno: è quello che il deck farebbe.
    const p = document.createElement("p"); p.className = "nota";
    p.textContent = "senza staffe il deck non colloca le barre: aggiungile per vederle";
    elementi.push(p);
  }
  return { elementi, controlli };
}

function editorMateriale(m, k, azioni, { catalogo, legame }) {
  const controlli = [];
  // Senza catalogo il select resta **abilitato** con la sola classe corrente: disabilitarlo
  // direbbe «non si cambia», mentre la verità è «le altre non sono ancora arrivate».
  const classi = catalogo?.[k.tipo] ?? [k.classe];
  const cl = gruppo("classe", "editor");
  const s = scelta({ etichetta: "classe di norma", nome: `classe di ${k.nome}`,
                     opzioni: classi.map((c) => [c, c]), valore: k.classe,
                     alCambio: (v) => azioni.suMateriale(k.id, { classe: v }) });
  cl.append(s.etichetta); controlli.push(s.controllo);
  const et = document.createElement("label");
  const pers = document.createElement("input");
  pers.type = "checkbox"; pers.checked = k.personalizzato;
  pers.setAttribute("aria-label", "valori personalizzati, sovrascrivono la tabella");
  pers.addEventListener("change", () => azioni.suMateriale(k.id, { personalizzato: pers.checked }));
  et.append(pers, document.createTextNode("personalizzato")); cl.append(et); controlli.push(pers);

  // P8: i valori a mano compaiono solo con la spunta, non prima.
  const elementi = [cl];
  if (k.personalizzato && legame?.catalogo) {
    const val = gruppo("valori (sovrascrivono la tabella NTC)", "editor editor-campi");
    for (const [chiave, v] of Object.entries(legame.catalogo)) {
      const c = campoNumero({ etichetta: chiave, nome: `${chiave} di ${k.nome}`, valore: v,
                              alCambio: (x) => azioni.suMateriale(k.id, { valori: { [chiave]: x } }),
                              suAvviso: azioni.suAvviso });
      val.append(c.etichetta); controlli.push(c.controllo);
    }
    elementi.push(val);
  }

  const ve = gruppo("veste per l'analisi (tutto il modello)", "editor");
  const v = scelta({ etichetta: "veste", nome: "veste per l'analisi, tutto il modello",
                     opzioni: VESTI.map((x) => [x, x]), valore: vesteDi(m),
                     alCambio: (x) => azioni.suVeste(x) });
  ve.append(v.etichetta); controlli.push(v.controllo);
  elementi.push(ve);

  const lg = gruppo("legame", "editor curva");
  if (legame === null || legame === undefined) {
    // Attesa dichiarata, non un riquadro muto (P5): i valori arrivano da `/api/materiale/legame`.
    const p = document.createElement("p"); p.className = "vuoto";
    p.textContent = "valori in arrivo dal server…"; lg.append(p);
  } else if (legame.errore) {
    const p = document.createElement("p"); p.className = "avviso";
    p.textContent = `attenzione: ${legame.errore}`; lg.append(p);
  } else {
    const c = legame.legame;
    const disegno = document.createElement("div");
    disegno.innerHTML = svgCurva(c.tipo === "concrete02" ? puntiConcrete02(c) : puntiSteel02(c));
    const dl = document.createElement("dl");
    for (const [nome, valore, unita] of valoriDaMostrare(c)) {
      const dt = document.createElement("dt"); dt.textContent = nome;
      const dd = document.createElement("dd"); dd.className = "numero";
      dd.textContent = `${stampaNumero(valore, { decimali: Math.abs(valore) < 1 ? 4 : 0, migliaia: true })}${unita ? ` ${unita}` : ""}`;
      dl.append(dt, dd);
    }
    const art = document.createElement("p"); art.className = "nota"; art.textContent = c.articolo;
    lg.append(disegno, dl, art);
    for (const a of legame.valori?.avvisi ?? []) {
      const p = document.createElement("p"); p.className = "avviso";
      p.textContent = `attenzione: ${a}`; lg.append(p);
    }
    for (const n of legame.valori?.note ?? []) {
      const p = document.createElement("p"); p.className = "nota"; p.textContent = n; lg.append(p);
    }
  }
  elementi.push(lg);
  return { elementi, controlli };
}

const EDITORI = { nodo: editorVincolo, asta: editorAsta, sezione: editorSezione, materiale: editorMateriale };

export function creaPannello({ dati, vuoto, editor }, azioni) {
  // L'editor in piedi ora, per ritrovare il controllo a fuoco dopo un `replaceChildren`:
  // ricostruirlo staccherebbe dal DOM il controllo che l'utente sta usando, e il fuoco
  // tornerebbe a `body` — sei ripartenze di tabulazione per spuntare sei gradi. Dalla 11b
  // i controlli sono una lista sola: l'indice basta, perché l'ordine è quello di costruzione
  // e la ricostruzione lo rifà identico.
  let editorAttuale = null;

  const fuocoAttuale = () =>
    (editorAttuale ? editorAttuale.controlli.indexOf(document.activeElement) : -1);

  function disegna(m, selezione, { catalogo = null, legame = null } = {}) {
    const e = selezione ? entitaSelezionata(m, selezione) : null;
    const r = e ? righeDe(m, selezione.tipo, e) : null;
    vuoto.hidden = r !== null;
    dati.hidden = r === null;
    if (r === null) {
      dati.replaceChildren(); editor.replaceChildren(); editor.hidden = true; editorAttuale = null;
      return;
    }

    dati.replaceChildren(...r.flatMap(([k, v]) => {
      const dt = document.createElement("dt"); dt.textContent = k;
      const dd = document.createElement("dd"); dd.textContent = v; dd.className = "numero";
      return [dt, dd];
    }));

    // Dalla 11b ogni tipo ha il suo editor, e sta **fuori** dalla `<dl>` — bottoni, caselle e
    // campi dentro una lista di definizioni non sono né un termine né una descrizione, e uno
    // screen reader li leggerebbe come se lo fossero.
    const fuoco = fuocoAttuale();
    const { elementi, controlli } = EDITORI[selezione.tipo](m, e, azioni, { catalogo, legame });
    editor.replaceChildren(...elementi);
    editorAttuale = { controlli };
    editor.hidden = false;
    if (fuoco !== -1) controlli[fuoco]?.focus?.();
  }

  return { disegna };
}
