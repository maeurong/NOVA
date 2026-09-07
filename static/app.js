// La cucitura. Due sole cose di stato: la cronologia (da cui esce il modello corrente) e
// la selezione. Tutto il resto è derivato e si ridisegna intero a ogni cambio: con un
// telaio da qualche decina di aste il ridisegno costa meno di un aggiornamento parziale
// sbagliato. `ponytail: ridisegno intero; si passa a un diff quando un modello vero lo
// rende lento, non prima.`

import { modelloVuoto, nodo } from "./modello.js";
import { ErroreComando, creaNodo, estrudi, spostaNodo, eliminaNodo, rinomina } from "./comandi.js";
import { nuovaCronologia, applica, corrente } from "./cronologia.js";
import { voceDaEvento, vociDellaBarra } from "./tastiera.js";
import { creaPiano } from "./piano.js";
import { creaSpazio } from "./spazio.js";
import { creaAlbero } from "./albero.js";
import { leggiNumero, stampaNumero } from "./numeri.js";

let cronologia = nuovaCronologia(modelloVuoto());
let selezione = null;
let ghost = null;  // {da, dx, dz} mentre si digita: non entra nel modello finché non si conferma

const $ = (id) => document.getElementById(id);
const messaggio = $("messaggio");

const piano = creaPiano($("piano"), {
  suSelezione: (tipo, id) => { selezione = { tipo, id }; ridisegna(); },
  suSfondo: () => { selezione = null; ridisegna(); },
});
const albero = creaAlbero($("albero-elenco"), $("albero-vuoto"), {
  suSelezione: (tipo, id) => { selezione = { tipo, id }; ridisegna(); },
});
const spazio = await creaSpazio($("spazio"));

function dì(testo) { messaggio.textContent = testo ?? ""; }

function esegui(fn, etichetta) {
  try {
    cronologia = applica(cronologia, fn, etichetta);
    dì(null);
    return true;
  } catch (e) {
    if (!(e instanceof ErroreComando)) throw e;  // un difetto del programma non si traveste da messaggio
    dì(e.rimedio ? `${e.message} — ${e.rimedio}` : e.message);
    return false;
  }
}

function ridisegna() {
  const m = corrente(cronologia);
  // Una selezione che punta a un oggetto sparito è peggio di nessuna selezione.
  if (selezione && !(selezione.tipo === "nodo" ? m.nodi : m.aste).some((e) => e.id === selezione.id)) {
    selezione = null;
  }
  piano.disegna(m, { selezione, ghost });
  spazio.disegna(m, { selezione });
  albero.disegna(m, { selezione });
  disegnaPannello(m);
  disegnaBarra();
}

function disegnaPannello(m) {
  const dati = $("pannello-dati"), vuoto = $("pannello-vuoto");
  vuoto.hidden = selezione !== null;
  dati.hidden = selezione === null;
  if (!selezione) return;
  const righe = [];
  if (selezione.tipo === "nodo") {
    const n = nodo(m, selezione.id);
    righe.push(["identificatore", String(n.id)], ["nome", n.nome ?? "—"],
               ["x", `${stampaNumero(n.x, { decimali: 0, migliaia: true })} mm`],
               ["z", `${stampaNumero(n.z, { decimali: 0, migliaia: true })} mm`]);
  } else {
    const a = m.aste.find((k) => k.id === selezione.id);
    const i = nodo(m, a.nodo_i), j = nodo(m, a.nodo_j);
    righe.push(["identificatore", String(a.id)], ["nome", a.nome ?? "—"],
               ["da → a", `${a.nodo_i} → ${a.nodo_j}`],
               ["lunghezza", `${stampaNumero(Math.hypot(j.x - i.x, j.y - i.y, j.z - i.z), { decimali: 0, migliaia: true })} mm`],
               ["sezione", a.sezione === null ? "non assegnata (giornata 11)" : String(a.sezione)]);
  }
  dati.replaceChildren(...righe.flatMap(([k, v]) => {
    const dt = document.createElement("dt"); dt.textContent = k;
    const dd = document.createElement("dd"); dd.textContent = v; dd.className = "numero";
    return [dt, dd];
  }));
}

function disegnaBarra() {
  const contesto = ghost ? "ghost" : (selezione ? "selezione" : "sempre");
  $("barra").replaceChildren(...vociDellaBarra(contesto).map((v) => {
    const span = document.createElement("span");
    span.className = "tasto";
    const kbd = document.createElement("kbd"); kbd.textContent = v.tasto;
    span.append(kbd, document.createTextNode(v.etichetta));
    if (v.aiuto) {
      const aiuto = document.createElement("span");
      aiuto.className = "aiuto"; aiuto.textContent = v.aiuto;
      span.append(aiuto);
    }
    return span;
  }));
}

// Le coordinate e le lunghezze si chiedono con `prompt`: è il campo che non si può
// sbagliare, e la palette ⌘K con i valori nella query è la giornata 11 (story 8).
// `ponytail: prompt oggi, campo nella palette domani.`
function chiedi(domanda, esempio) {
  const t = window.prompt(`${domanda}  (${esempio})`);
  return t === null ? null : t;
}

window.addEventListener("keydown", (ev) => {
  if (ev.target instanceof HTMLInputElement) return;
  const voce = voceDaEvento(ev);
  if (!voce) return;
  // `seleziona` decide da sé: solo lui può lasciare l'evento al browser (vedi sotto).
  if (voce.codice !== "seleziona") ev.preventDefault();

  if (voce.codice === "annulla") { ghost = null; dì(null); ridisegna(); return; }

  if (voce.codice === "nodo") {
    const t = chiedi("Coordinate del nodo, x; z in mm", "0; 3000");
    if (t === null) return;
    const [sx, sz] = t.split(";");
    const x = leggiNumero(sx ?? ""), z = leggiNumero(sz ?? "");
    if (x === null || z === null) { dì("coordinate non lette: scrivi «x; z», per esempio «0; 3000»"); return; }
    if (esegui((m) => creaNodo(m, { x, z }), `nodo ${stampaNumero(x, { decimali: 0 })}; ${stampaNumero(z, { decimali: 0 })}`)) {
      // Il nodo appena posato è selezionato: è da lì che si estrude, e senza questo
      // servirebbe il mouse per riprenderlo — con il Goal che dice «senza il mouse».
      const m = corrente(cronologia);
      selezione = { tipo: "nodo", id: m.nodi[m.nodi.length - 1].id };
    }
    ridisegna();
    return;
  }

  if (voce.codice === "seleziona") {
    // ⇥ gira fra i nodi in ordine di identificatore. È l'unico modo di avere una selezione
    // senza mouse, e senza selezione metà dei comandi non parte.
    //
    // Ma solo con il fuoco sul corpo della pagina: dentro l'albero o il pannello, ⇥ resta
    // il ⇥ del browser. Rubarlo ovunque significherebbe che chi naviga da tastiera non
    // raggiunge più nulla — un difetto di accessibilità peggiore di quello che risolve.
    if (document.activeElement !== document.body) return;
    ev.preventDefault();
    const m = corrente(cronologia);
    if (m.nodi.length === 0) { dì("nessun nodo da selezionare: premi N"); return; }
    const ids = m.nodi.map((n) => n.id);
    const dove = selezione?.tipo === "nodo" ? ids.indexOf(selezione.id) : -1;
    selezione = { tipo: "nodo", id: ids[(dove + 1) % ids.length] };
    ridisegna();
    return;
  }

  if (voce.codice === "estrudi") {
    if (selezione?.tipo !== "nodo") { dì("estrudere parte da un nodo: selezionane uno"); return; }
    const t = chiedi("Lunghezza in mm, poi la direzione con una freccia", "3000");
    if (t === null) return;
    const l = leggiNumero(t);
    if (l === null || l <= 0) { dì("lunghezza non letta: scrivi un numero maggiore di zero"); return; }
    ghost = { da: selezione.id, dx: 0, dz: l };  // in su di default; le frecce la girano
    dì("freccia per la direzione, Invio per confermare, Esc per annullare");
    ridisegna();
    return;
  }

  if (voce.codice === "conferma") {
    if (!ghost) return;
    const g = ghost;
    if (esegui((m) => estrudi(m, g), `asta da ${g.da}`)) {
      ghost = null;
      // La punta è il `nodo_j` dell'asta appena nata, non l'ultimo nodo dell'elenco:
      // quando l'estrusione arriva su un nodo che c'era già, di nodi non ne nasce nessuno.
      const m = corrente(cronologia);
      selezione = { tipo: "nodo", id: m.aste[m.aste.length - 1].nodo_j };
    }
    ridisegna();
    return;
  }

  if (voce.codice === "sposta") {
    if (selezione?.tipo !== "nodo") { dì("si sposta un nodo: selezionane uno"); return; }
    const id = selezione.id;
    const n = nodo(corrente(cronologia), id);
    const t = chiedi(`Nuove coordinate del nodo ${id}, x; z in mm`,
                     `${stampaNumero(n.x, { decimali: 0 })}; ${stampaNumero(n.z, { decimali: 0 })}`);
    if (t === null) return;
    const [sx, sz] = t.split(";");
    const x = leggiNumero(sx ?? ""), z = leggiNumero(sz ?? "");
    if (x === null || z === null) { dì("coordinate non lette: scrivi «x; z», per esempio «0; 3000»"); return; }
    esegui((m) => spostaNodo(m, { id, x, z }), `sposta nodo ${id}`);
    ridisegna();  // le aste seguono da sole: referenziano l'identificatore, non le coordinate
    return;
  }

  if (voce.codice === "elimina") {
    if (selezione?.tipo !== "nodo") { dì("oggi si elimina un nodo; l'asta arriva domani"); return; }
    const id = selezione.id;
    esegui((m) => eliminaNodo(m, { id }), `elimina nodo ${id}`);
    ridisegna();
    return;
  }

  if (voce.codice === "rinomina") {
    if (!selezione) { dì("seleziona qualcosa da rinominare"); return; }
    const t = chiedi(`Nome per ${selezione.tipo} ${selezione.id}`, "piede sinistro");
    if (t === null) return;
    const s = { ...selezione };
    esegui((m) => rinomina(m, { tipo: s.tipo, id: s.id, nome: t }), `nome di ${s.tipo} ${s.id}`);
    ridisegna();
  }
});

// Le frecce girano il ghost: la lunghezza è già digitata, resta la direzione (story 2).
window.addEventListener("keydown", (ev) => {
  if (!ghost) return;
  const l = Math.hypot(ghost.dx, ghost.dz);
  const verso = { ArrowUp: [0, l], ArrowDown: [0, -l], ArrowRight: [l, 0], ArrowLeft: [-l, 0] }[ev.key];
  if (!verso) return;
  ev.preventDefault();
  ghost = { ...ghost, dx: verso[0], dz: verso[1] };
  ridisegna();
});

ridisegna();
