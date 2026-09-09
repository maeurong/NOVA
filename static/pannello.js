// L'ispettore della selezione, con l'editor di ciò che è selezionato. Fuori da `app.js` perché
// con i sei gradi, le tre preimpostazioni e i tre editor della 11b (asta, sezione, materiale)
// raddoppia due volte, e `app.js` ha già i due modi e la cucitura.

import { leggiNumero, stampaNumero, millimetri } from "./numeri.js";
import { nodo, asta, sezione, materiale, azione, combinazione, asteDellaSezione, vesteDi,
         nomeCaso } from "./modello.js";
import { NATURE, TIPI_CARICO, DIREZIONI, TIPI_COMBINAZIONE, COMPONENTI, GRADI_CEDIMENTO,
         NOME_TIPO, NOME_TIPO_COMBINAZIONE } from "./carichi.js";
import { LATI, VESTI, svgSezione, geometriaImpossibile } from "./sezione.js";
import { puntiConcrete02, puntiSteel02, valoriDaMostrare, svgCurva, cifre } from "./legame.js";
import { GRADI, PREIMPOSTAZIONI, vincoloVuoto, nomePreimpostazione, descrizione } from "./vincoli.js";

const mm = (v) => `${millimetri(v)} mm`;
/** «0,8» e non «0,800»: gli zeri in coda di un fattore di danno non dicono niente in più.
 *  Le cifre le sceglie `cifre` (`legame.js`), non una regola scritta un'altra volta qui: a
 *  tre decimali fissi un fattore di 0,0001 usciva come «0». Si tagliano solo gli zeri **dopo
 *  la virgola** — `,?0+$` da solo mangiava anche lo zero di «10». */
const conciso = (v) => cifre(v).replace(/(,\d*?)0+$/, "$1").replace(/,$/, "");

const CERCA = { nodo, asta, sezione, materiale, azione, combinazione };

/** L'entità selezionata, o `null`. Le sei vie sono esplicite: un `else` che faceva cadere
 *  tutto ciò che non è nodo su `aste.find` mostrava i numeri di un'asta con una **sezione**
 *  selezionata, perché gli identificatori delle due liste partono entrambi da 1. */
function entitaSelezionata(m, selezione) {
  return CERCA[selezione.tipo]?.(m, selezione.id) ?? null;
}

/** «rilievo, modificata» / «utente» / «—». Senza `origine` non si inventa niente: il campo
 *  manca su tutto ciò che è stato disegnato prima della story 55. */
const testoOrigine = (o) => (o ? `${o.sorgente}${o.modificata ? ", modificata" : ""}` : "—");

function righeDiNodo(m, n) {
  return [["identificatore", String(n.id)], ["nome", n.nome ?? "—"],
          ["x", mm(n.x)], ["z", mm(n.z)], ["vincolo", descrizione(n.vincolo)],
          ["origine", testoOrigine(n.origine)]];
}

/** «E ×0,8 · fc ×0,9 · martinetto 3», e senza nota niente separatore appeso. */
function testoDanno(d) {
  if (!d) return "nessuno";
  const parti = [`E ×${conciso(d.fattore_E)}`, `fc ×${conciso(d.fattore_fc)}`];
  if (d.nota) parti.push(d.nota);
  return parti.join(" · ");
}

function righeDiAsta(m, a) {
  const i = nodo(m, a.nodo_i), j = nodo(m, a.nodo_j);
  const lunghezza = i && j ? mm(Math.hypot(j.x - i.x, j.y - i.y, j.z - i.z)) : "—";
  const idSezione = a.sezione ?? null;
  // Per nome, non per identificatore: «300 × 500» dice cosa porta l'asta, «1» no.
  const nomeSezione = idSezione === null
    ? "non assegnata" : (sezione(m, idSezione)?.nome ?? String(idSezione));
  return [["identificatore", String(a.id)], ["nome", a.nome ?? "—"],
          ["da → a", `${a.nodo_i} → ${a.nodo_j}`], ["lunghezza", lunghezza],
          ["sezione", nomeSezione], ["danno", testoDanno(a.danno)],
          ["origine", testoOrigine(a.origine)]];
}

/** Le quattro righe che l'editor qui sotto **non** dice. Dimensioni, copriferro, materiali,
 *  staffe, barre e riduzione hanno già il loro campo: nella `<dl>` erano sette righe scritte
 *  due volte sullo stesso schermo, e spingevano il disegno della sezione fuori dai 900 pixel
 *  di un portatile. Il disegno adesso apre l'editor (`editorSezione`). */
function righeDiSezione(m, s) {
  const quante = asteDellaSezione(m, s.id).length;
  return [
    ["identificatore", String(s.id)],
    ["nome", s.nome],
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

/** «Q · vento» quando la categoria c'è: la natura da sola non dice quale Q. */
function righeDiAzione(m, a) {
  return [["identificatore", String(a.id)], ["nome", a.nome],
          ["natura", a.categoria ? `${a.natura} · ${a.categoria}` : a.natura],
          ["caso", nomeCaso("azione", a.id)], ["carichi", String((a.carichi ?? []).length)],
          ["generata", a.generata ? "sì" : "no"]];
}

/** `?? []`: una combinazione di un file vecchio può non avere il campo `termini`. */
function righeDiCombinazione(m, c) {
  return [["identificatore", String(c.id)], ["nome", c.nome],
          ["tipo", c.tipo ? NOME_TIPO_COMBINAZIONE[c.tipo] : "—"],
          ["caso", nomeCaso("combinazione", c.id)], ["termini", String((c.termini ?? []).length)],
          ["generata", c.generata ? "sì" : "no"]];
}

const RIGHE = { nodo: righeDiNodo, asta: righeDiAsta, sezione: righeDiSezione,
                materiale: righeDiMateriale, azione: righeDiAzione, combinazione: righeDiCombinazione };
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

/** Il testo di un campo numerico. Regola d'oro: quel che il campo scrive, `leggiNumero` lo
 *  deve rileggere uguale — il campo rientra dalla propria porta, come i numeri del piano.
 *  Perciò **niente notazione esponenziale** sotto la soglia: misurato in questo worktree,
 *  `leggiNumero("2,549e-9")` è `null`, e anche `toPrecision` la produce, quindi né l'una né
 *  l'altra si rileggono. Sotto un millesimo si stampano i decimali che servono a tenere
 *  quattro cifre significative: `2,5e-9` diventa «0,000000002500», lungo ma vero, mentre a
 *  tre decimali fissi diventava «0,000», cioè uno zero che zero non è.
 *  ponytail: il tetto è 100 decimali (il massimo di `toFixed`); sotto 1e-97 il campo
 *  mostrerebbe zero — nessuna grandezza di questo modello ci arriva. */
const testoNumero = (v) => {
  if (v === null || v === undefined) return "";
  if (Number.isInteger(v)) return stampaNumero(v, { decimali: 0 });
  const piccolo = Math.abs(v) < 0.001;
  const decimali = piccolo ? Math.min(100, 3 - Math.floor(Math.log10(Math.abs(v)))) : 3;
  return stampaNumero(v, { decimali });
};

// WCAG 2.5.3 (livello A): il nome accessibile di ogni campo qui sotto **comincia** dal testo
// visibile della sua etichetta, mai lo sostituisce. «Ø» a schermo e «diametro delle staffe»
// nel nome erano due comandi diversi per chi detta a voce: pronunciava quello che leggeva e
// non succedeva niente. Il nome aggiunge, non rimpiazza. Un test lo verifica su tutti e tre
// gli editor, così nessun campo nuovo può romperlo in silenzio.

/** Un campo numerico con nome accessibile intero, che legge con `leggiNumero` al `change`
 *  (P9: unità ed espressioni scritte come le scrive una persona). Se il testo non si legge,
 *  torna com'era e lo dice: un campo che tiene «trecento» a schermo e un modello che tiene
 *  300 sono due verità. */
function campoNumero({ etichetta, nome = etichetta, valore, unita = "", alCambio, suAvviso,
                       vuotoAmmesso = false }) {
  const et = document.createElement("label");
  const c = document.createElement("input");
  c.type = "text"; c.className = "numero"; c.value = testoNumero(valore);
  c.setAttribute("inputmode", "decimal"); c.setAttribute("aria-label", nome);
  c.addEventListener("change", () => {
    // Con `vuotoAmmesso` il campo vuoto è un valore, non un errore: «nessun grado imposto»,
    // «nessun gradiente», «l'azione non entra nella combinazione». `testoNumero(null)` è già
    // la stringa vuota, quindi il giro campo → modello → campo si chiude su sé stesso.
    if (vuotoAmmesso && c.value.trim() === "") { alCambio(null); return; }
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

function gruppo(legenda, classe, nota = null) {
  const f = document.createElement("fieldset"); f.className = classe;
  const l = document.createElement("legend"); l.textContent = legenda; f.append(l);
  // La parentesi dentro la legenda la faceva lunga il doppio del gruppo che intitola. La
  // legenda resta un'etichetta; ciò che spiega sta sotto, dove si legge una volta sola.
  if (nota) {
    const p = document.createElement("p"); p.className = "nota"; p.textContent = nota;
    f.append(p);
  }
  return f;
}

function bottone(testo, alClic) {
  const b = document.createElement("button");
  b.type = "button"; b.textContent = testo;
  b.addEventListener("click", alClic);
  return b;
}

/** Chiave di `nova/catalogo.py` → etichetta e unità. Le chiavi grezze («fctm», «epsuk»,
 *  «densita») sono nomi di variabili: a schermo valgono meno del nome che la norma usa, e
 *  senza unità un numero non è una grandezza (PRODUCT.md, «unità dichiarate su ogni numero»).
 *  Stessa forma di `NOME_GRADO`: una tabella, non un `switch` sparso nei campi. */
const NOME_VALORE = {
  E: ["E, modulo elastico", " MPa"], nu: ["ν, Poisson", ""], densita: ["densità", " t/mm³"],
  fck: ["f_ck", " MPa"], fcm: ["f_cm", " MPa"], fctm: ["f_ctm", " MPa"],
  fyk: ["f_yk", " MPa"], ftk: ["f_tk", " MPa"], epsuk: ["ε_uk", ""],
};

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
  // `?? ""`: un `danno` letto da un file senza `nota` scriveva «undefined» nella casella.
  nota.type = "text"; nota.value = d.nota ?? "";
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
      ["diametro", "Ø", "Ø delle staffe, in mm", " mm"],
      ["passo", "passo", "passo delle staffe, in mm", " mm"],
      ["bracci", "bracci", "bracci delle staffe", ""],
    ]) {
      agg(staffe, num(etichetta, nome, s.staffe[campo],
                      (v) => campi({ staffe: { ...s.staffe, [campo]: v } }), unita));
    }
    const via = bottone("togli staffe", () => campi({ staffe: null }));
    staffe.append(via); controlli.push(via);
  }

  // `suFila` vuole numero e diametro insieme, e li legge dalle **due caselle**, non dal
  // modello: il modello è quello del disegno di prima, e su un lato vuoto scrivere Ø 20 e poi
  // n 3 dava 3Ø16 — il diametro appena scritto spariva.
  const barre = gruppo("barre per lato", "editor editor-campi");
  for (const lato of LATI) {
    const f = s.file.find((k) => k.lato === lato) ?? { n: 0, diametro: 16 };
    const manda = () => {
      const n = leggiNumero(cN.controllo.value), diametro = leggiNumero(cD.controllo.value);
      if (n === null || diametro === null) {
        // la casella *toccata* ha già avvisato da sé: qui parla solo per l'altra
        azioni.suAvviso(`«${(n === null ? cN : cD).controllo.value}» non è un numero`);
        return;
      }
      // Lato vuoto che resta vuoto: non c'è niente da togliere. Senza questa guardia il solo
      // fatto di scrivere il diametro mandava `suFila(…, 0, 20)`, `impostaFila` scartava la
      // fila con `n = 0` e col ridisegno il 20 tornava 16: il difetto di sopra rientrava
      // dalla porta di servizio.
      if (n === 0 && f.n === 0) return;
      azioni.suFila(s.id, lato, n, diametro);
    };
    const cN = num(`${lato} n`, `${lato} n, numero di barre sul lato ${lato}`, f.n, manda, "");
    const cD = num("Ø", `Ø delle barre sul lato ${lato}, in mm`, f.diametro, manda);
    agg(barre, cN); agg(barre, cD);
  }

  const rid = gruppo("riduzione, mm mancanti", "editor editor-campi");
  const r = s.riduzione ?? { sup: 0, inf: 0, sx: 0, dx: 0 };
  for (const lato of LATI) {
    agg(rid, num(lato, `${lato}, riduzione della sezione ${s.nome}, in mm`, r[lato] ?? 0,
                 (v) => campi({ riduzione: { ...r, [lato]: v } })));
  }

  // Il disegno apre l'editor: è la sola cosa che dica in un colpo com'è fatta la sezione, e
  // in fondo alla colonna, dopo cinque gruppi di campi, restava fuori schermo a 1440 × 900.
  const disegno = document.createElement("div");
  disegno.className = "sezione-disegno";
  disegno.innerHTML = svgSezione(s);
  const elementi = [disegno, dim, mat, staffe, barre, rid];
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

function editorMateriale(m, k, azioni, { catalogo, legame, tabella = null }) {
  const controlli = [];
  // La classe corrente apre sempre l'elenco, anche quando il catalogo non la contiene: con
  // `personalizzato` una classe fuori norma è lecita (`nova/modello.py:202-209`), e un
  // `<select>` senza la sua `option` mostra la prima voce del catalogo — cioè dice che il
  // materiale è un altro. Senza catalogo resta la sola corrente, e il select **abilitato**:
  // disabilitarlo direbbe «non si cambia», mentre la verità è «le altre non sono arrivate».
  const classi = [...new Set([k.classe, ...(catalogo?.[k.tipo] ?? [])])];
  const cl = gruppo("classe", "editor");
  const s = scelta({ etichetta: "classe di norma", nome: `classe di norma di ${k.nome}`,
                     opzioni: classi.map((c) => [c, c]), valore: k.classe,
                     alCambio: (v) => azioni.suMateriale(k.id, { classe: v }) });
  cl.append(s.etichetta); controlli.push(s.controllo);
  const et = document.createElement("label");
  const pers = document.createElement("input");
  pers.type = "checkbox"; pers.checked = k.personalizzato;
  pers.setAttribute("aria-label", "personalizzato: i valori scritti a mano sovrascrivono la tabella");
  pers.addEventListener("change", () => azioni.suMateriale(k.id, { personalizzato: pers.checked }));
  et.append(pers, document.createTextNode("personalizzato")); cl.append(et); controlli.push(pers);

  // P8: i valori a mano compaiono solo con la spunta, non prima.
  const elementi = [cl];
  // Mentre il legame è in volo il gruppo resta, con le chiavi dell'ultima tabella: sparire
  // per un ridisegno mandava il fuoco al `<select>` della classe — misurato in browser,
  // scritto «40» in f_cm e battuto «9», il «9» finiva nel select. Senza nemmeno una tabella
  // (la prima risposta non è mai arrivata) il gruppo non c'è, e il fuoco va al primo
  // controllo come ha sempre fatto.
  const daMostrare = legame?.catalogo ?? tabella;
  if (k.personalizzato && daMostrare) {
    const val = gruppo("valori", "editor editor-campi editor-valori", "sovrascrivono la tabella NTC");
    const aMano = Object.keys(k.valori ?? {});
    for (const chiave of Object.keys(daMostrare)) {
      // Col legame arrivato i due rami danno lo stesso numero — `catalogo.valori` gli
      // override li ha già scritti sopra — ma in volo la tabella non li porta ancora.
      const v = k.valori?.[chiave] ?? daMostrare[chiave];
      const [etichetta, unita] = NOME_VALORE[chiave] ?? [chiave, ""];
      const scritto = aMano.includes(chiave);
      // WCAG 2.5.3: il nome comincia dal testo visibile. «scritto a mano» resta **fuori**:
      // questo nome è anche la chiave con cui `creaPannello` ritrova il fuoco dopo il
      // ridisegno, e infilarcelo la cambiava alla prima scrittura — la chiave vecchia non si
      // ritrovava più e il cursore saltava al `<select>` della classe, dove una lettera
      // cambia la classe.
      // ponytail: lo stato resta visibile ma fuori dal nome accessibile; se deve entrarci,
      // la via è un `aria-describedby` sullo `<span>`, che ha bisogno di un id per campo.
      const c = campoNumero({ etichetta, unita, valore: v, nome: `${etichetta} di ${k.nome}`,
                              alCambio: (x) => azioni.suMateriale(k.id, { valori: { [chiave]: x } }),
                              suAvviso: azioni.suAvviso });
      // Il valore che vince sulla tabella si vede: senza, la casella col numero misurato e
      // quella col numero di norma erano la stessa casella.
      if (scritto) {
        const segno = document.createElement("span");
        segno.className = "nota"; segno.textContent = "scritto a mano";
        c.etichetta.append(segno);
      }
      val.append(c.etichetta); controlli.push(c.controllo);
    }
    // Un bottone solo, non uno per casella: `modificaMateriale` cancella la chiave quando
    // riceve `null` (`comandi.js`), e ricopiare a mano sei numeri di norma non è un rimedio.
    if (aMano.length) {
      const via = bottone("torna ai valori di tabella",
                          () => azioni.suMateriale(k.id, { valori: Object.fromEntries(aMano.map((x) => [x, null])) }));
      val.append(via); controlli.push(via);
    }
    elementi.push(val);
  }

  const ve = gruppo("veste per l'analisi", "editor", "vale per tutto il modello");
  // `/api/catalogo` manda già `vesti` (`nova/server.py`) e nessuno la leggeva: `VESTI` resta
  // la risposta quando il server non ha risposto, non la prima scelta.
  const v = scelta({ etichetta: "veste", nome: "veste per l'analisi, tutto il modello",
                     opzioni: (catalogo?.vesti ?? VESTI).map((x) => [x, x]), valore: vesteDi(m),
                     alCambio: (x) => azioni.suVeste(x) });
  ve.append(v.etichetta); controlli.push(v.controllo);
  elementi.push(ve);

  const lg = gruppo("legame", "editor curva");
  if (legame === null || legame === undefined) {
    // Attesa dichiarata, non un riquadro muto (P5): i valori arrivano da `/api/materiale/legame`.
    // `.nota` e non `.vuoto`: `.vuoto` è lo stato di una colonna intera senza niente dentro,
    // con il suo `padding` e la sua misura; qui è una riga dentro un gruppo di campi.
    const p = document.createElement("p"); p.className = "nota";
    p.textContent = "valori in arrivo dal server…"; lg.append(p);
  } else if (legame.errore) {
    // Alla prima «;»: il rifiuto del catalogo elenca tutte e diciannove le classi dopo il
    // punto e virgola, duecentoventi caratteri di avviso — e le classi stanno già nel
    // `<select>` qui sopra, che è dove si sceglie.
    const p = document.createElement("p"); p.className = "avviso";
    p.textContent = `attenzione: ${legame.errore.split(";")[0]}`; lg.append(p);
  } else if (legame.legame?.tipo !== "concrete02" && legame.legame?.tipo !== "steel02") {
    // Un tipo che non sappiamo disegnare si dice, non si solleva: `valoriDaMostrare` lancia,
    // e da qui l'eccezione ammazzava `ridisegna` — pannello, piano e albero fermi insieme,
    // senza una riga che spiegasse perché.
    const p = document.createElement("p"); p.className = "avviso";
    p.textContent = `attenzione: legame «${legame.legame?.tipo}» non mostrabile`; lg.append(p);
  } else {
    const c = legame.legame;
    const disegno = document.createElement("div");
    disegno.innerHTML = svgCurva(c.tipo === "concrete02" ? puntiConcrete02(c) : puntiSteel02(c));
    const dl = document.createElement("dl");
    for (const [nome, valore, unita] of valoriDaMostrare(c)) {
      const dt = document.createElement("dt"); dt.textContent = nome;
      const dd = document.createElement("dd"); dd.className = "numero";
      dd.textContent = `${cifre(valore)}${unita ? ` ${unita}` : ""}`;
      dl.append(dt, dd);
    }
    const art = document.createElement("p"); art.className = "nota"; art.textContent = c.articolo;
    lg.append(disegno);
    // La `<dl>` scrive «f_c 33 MPa» e l'asse della curva «-33»: sono lo stesso numero, letto
    // con la convenzione di OpenSees. Solo per il calcestruzzo — l'acciaio qui è tutto
    // positivo, e la nota sarebbe rumore.
    if (c.tipo === "concrete02") {
      const segni = document.createElement("p"); segni.className = "nota";
      segni.textContent = "compressione negativa, come la scrive OpenSees; nella tabella i valori sono in modulo";
      lg.append(segni);
    }
    lg.append(dl, art);
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

const nomeNodo = (n) => n.nome ?? `nodo ${n.id}`;
const nomeAsta = (a) => a.nome ?? `asta ${a.id}`;

/** I campi di un carico, per tipo, appesi nel `box` del carico. Ogni cambio manda **il carico
 *  intero** con il campo nuovo: il riduttore lo normalizza e lo confronta, e qui non si tiene
 *  un secondo stato. Niente `DocumentFragment`: il DOM finto dei test non lo ha, e il box c'è già. */
function campiDelCarico(m, c, i, box, invia, azioni, controlli) {
  const chi = `del carico ${i + 1}`;
  const agg = (x) => { box.append(x.etichetta); controlli.push(x.controllo); };
  const num = (campo, etichetta, unita, vuotoAmmesso = false) =>
    agg(campoNumero({ etichetta, nome: `${etichetta} ${chi}`, valore: c[campo], unita, vuotoAmmesso,
                      alCambio: (v) => invia({ ...c, [campo]: v }), suAvviso: azioni.suAvviso }));
  const rif = (campo, lista, nome) => {
    const opzioni = lista.map((e) => [e.id, nome(e)]);
    // Un file può portare un carico su un nodo (o un'asta) che non c'è più. L'identificatore
    // grezzo resta a schermo ed è quello scelto: senza questa voce il `select` mostrerebbe il
    // primo della lista, cioè un carico spostato che nessuno ha spostato.
    if (!lista.some((e) => e.id === c[campo])) opzioni.unshift([c[campo], `${campo} ${c[campo]} (sparito)`]);
    agg(scelta({ etichetta: campo, nome: `${campo} ${chi}`, opzioni, valore: c[campo],
                 alCambio: (v) => invia({ ...c, [campo]: Number(v) }) }));
  };
  if (c.tipo === "nodale") { rif("nodo", m.nodi, nomeNodo); for (const k of COMPONENTI) num(k, k, k[0] === "F" ? " N" : " N·mm"); }
  else if (c.tipo === "distribuito") {
    rif("asta", m.aste, nomeAsta); num("q", "q", " N/mm");
    agg(scelta({ etichetta: "direzione", nome: `direzione ${chi}`, opzioni: DIREZIONI.map((d) => [d, d.replace("_", " ")]),
                 valore: c.direzione, alCambio: (v) => invia({ ...c, direzione: v }) }));
  }
  else if (c.tipo === "gravita") { for (const k of ["x", "y", "z"]) num(`fattore_${k}`, `fattore ${k}`, ""); }
  else if (c.tipo === "cedimento") { rif("nodo", m.nodi, nomeNodo); for (const k of GRADI_CEDIMENTO) num(k, k, k[0] === "u" ? " mm" : " rad", true); }
  else { rif("asta", m.aste, nomeAsta); num("dT_uniforme", "ΔT uniforme", " °C"); num("gradiente", "gradiente", " °C/mm", true); }
}

function editorAzione(m, a, azioni) {
  const controlli = [];
  const nat = gruppo("natura", "editor");
  const n = scelta({ etichetta: "natura", nome: `natura dell'azione ${a.nome}`, opzioni: NATURE.map((k) => [k, k]),
                     valore: a.natura, alCambio: (v) => azioni.suAzione(a.id, { natura: v }) });
  nat.append(n.etichetta); controlli.push(n.controllo);
  const et = document.createElement("label");
  const cat = document.createElement("input");
  cat.type = "text"; cat.value = a.categoria ?? "";
  cat.setAttribute("aria-label", `categoria d'uso dell'azione ${a.nome}`);
  cat.addEventListener("change", () => azioni.suAzione(a.id, { categoria: cat.value.trim() || null }));
  et.append(document.createTextNode("categoria d'uso"), cat); nat.append(et); controlli.push(cat);

  const carichi = a.carichi ?? [];
  const car = gruppo("carichi", "editor",
                     carichi.length ? null : "nessun carico: premi Q su un nodo o un'asta, o scegli un tipo qui sotto");
  carichi.forEach((c, i) => {
    const box = gruppo(`carico ${i + 1} · ${NOME_TIPO[c.tipo]}`, "editor editor-campi carico");
    campiDelCarico(m, c, i, box, (nuovo) => azioni.suCarico(a.id, i, nuovo), azioni, controlli);
    if (c.tipo === "termico") {
      const p = document.createElement("p"); p.className = "avviso";
      p.textContent = "attenzione: il Check Model rifiuta il carico termico in v1 (nova/check.py)";
      box.append(p);
    }
    const via = bottone(`togli carico ${i + 1}`, () => azioni.suTogliCarico(a.id, i));
    box.append(via); controlli.push(via);
    car.append(box);
  });
  // Un comando, non uno stato: al ridisegno il select torna sulla prima voce, e la Storia lo racconta.
  const agg = scelta({ etichetta: "aggiungi carico", nome: "aggiungi carico: scegli il tipo",
                       opzioni: [["", "— scegli il tipo"], ...TIPI_CARICO.map((t) => [t, NOME_TIPO[t]])], valore: "",
                       alCambio: (v) => { if (v) azioni.suAggiungiCarico(a.id, v); } });
  car.append(agg.etichetta); controlli.push(agg.controllo);
  return { elementi: [nat, car], controlli };
}

function editorCombinazione(m, c, azioni) {
  const controlli = [];
  const tipo = gruppo("tipo", "editor");
  const t = scelta({ etichetta: "tipo", nome: `tipo della combinazione ${c.nome}`,
                     opzioni: [["", "— nessuno"], ...TIPI_COMBINAZIONE.map((k) => [k, NOME_TIPO_COMBINAZIONE[k]])],
                     valore: c.tipo ?? "", alCambio: (v) => azioni.suCombinazione(c.id, { tipo: v || null }) });
  tipo.append(t.etichetta); controlli.push(t.controllo);
  const ter = gruppo("termini", "editor editor-campi",
                     m.azioni.length ? "coefficiente per azione; vuoto = l'azione non entra" : "nessuna azione nel modello: premi Z");
  const termini = c.termini ?? [];
  for (const a of m.azioni) {
    // La somma, non il primo: un file con due termini sulla stessa azione mostra il numero che il
    // deck userà (`nova/deck.py:305-309`); scriverci sopra lo rifiuta `impostaTermine`, che lo dice.
    const suoi = termini.filter((k) => k.azione === a.id);
    const coeff = suoi.length ? suoi.reduce((s, k) => s + k.coefficiente, 0) : null;
    const campo = campoNumero({ etichetta: a.nome, nome: `${a.nome}: coefficiente nella combinazione ${c.nome}`, valore: coeff,
                                vuotoAmmesso: true, alCambio: (v) => azioni.suTermine(c.id, a.id, v), suAvviso: azioni.suAvviso });
    ter.append(campo.etichetta); controlli.push(campo.controllo);
  }
  return { elementi: [tipo, ter], controlli };
}

const EDITORI = { nodo: editorVincolo, asta: editorAsta, sezione: editorSezione,
                  materiale: editorMateriale, azione: editorAzione, combinazione: editorCombinazione };

export function creaPannello({ dati, vuoto, editor }, azioni) {
  // L'editor in piedi ora, per ritrovare il controllo a fuoco dopo un `replaceChildren`:
  // ricostruirlo staccherebbe dal DOM il controllo che l'utente sta usando, e il fuoco
  // tornerebbe a `body` — sei ripartenze di tabulazione per spuntare sei gradi.
  //
  // Il controllo si ritrova **per nome**, non per posto nella lista: l'ordine non è stabile.
  // «aggiungi staffe» fa comparire tre campi e un bottone *prima* delle file, e ogni indice
  // dopo quel punto slitta — chi stava scrivendo «inf n» si ritrovava dentro «bracci».
  // Il nome accessibile è unico per controllo e non si sposta con esso; i bottoni non ne
  // hanno uno e valgono per il loro testo. Se il controllo non c'è più (il bottone «togli
  // danno» dopo che il danno è andato via) il fuoco va al primo dell'editor, mai a `body`.
  let editorAttuale = null;

  const chiave = (c) => c?.getAttribute?.("aria-label") ?? c?.textContent ?? null;
  const fuocoAttuale = () =>
    (editorAttuale?.controlli.includes(document.activeElement) ? chiave(document.activeElement) : null);

  function disegna(m, selezione, { catalogo = null, legame = null, tabella = null } = {}) {
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
    const { elementi, controlli } = EDITORI[selezione.tipo](m, e, azioni, { catalogo, legame, tabella });
    editor.replaceChildren(...elementi);
    editorAttuale = { controlli };
    editor.hidden = false;
    if (fuoco !== null) (controlli.find((c) => chiave(c) === fuoco) ?? controlli[0])?.focus?.();
  }

  return { disegna };
}
