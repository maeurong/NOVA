// La cucitura. Due modi di disegno oltre alla selezione libera: l'estrusione, dove la
// selezione resta ferma mentre si conferma un ghost, e l'asta fra due nodi, dove la
// selezione **è** il gesto — la stessa guardia renderebbe impossibile scegliere il
// secondo nodo. `ponytail: ridisegno intero; si passa a un diff quando un modello vero
// lo rende lento, non prima.`

import { modelloVuoto, nodo } from "./modello.js";
import { ErroreComando, creaNodo, estrudi, collega, spostaNodo, eliminaNodo, rinomina, impostaVincolo } from "./comandi.js";
import { nuovaCronologia, applica, corrente, indietro, avanti, vaiA, etichette } from "./cronologia.js";
import { voceDaEvento, vociDellaBarra, daControllo } from "./tastiera.js";
import { creaPiano } from "./piano.js";
import { creaSpazio } from "./spazio.js";
import { creaAlbero } from "./albero.js";
import { creaPannello } from "./pannello.js";
import { creaFile } from "./file.js";
import { creaStoria } from "./storia.js";
import { ghostDisegnabile, esitoScelta, contestoBarra, ruotaGhost, modoValido,
         esitoComando, esitoLunghezza, ghostDelComando } from "./modo.js";
import { alternaIncastro } from "./vincoli.js";
import { stampaNumero } from "./numeri.js";

let cronologia = nuovaCronologia(modelloVuoto());
let selezione = null;
// null · {tipo:"estrusione", da, dx, dz} · {tipo:"asta", da, a}
// Due modi e non un ghost solo: in estrusione la selezione è ferma, in asta la selezione
// **è** il gesto. La stessa guardia per entrambi renderebbe l'asta impossibile.
let modo = null;
// Il campo di comando: `null` quando è chiuso, `{ tipo, testo, bersaglio }` quando è aperto.
// Fuori da `modo` perché non è un modo — `nodo` non ha un nodo di partenza, e `modoValido`
// lo chiuderebbe a ogni ridisegno cercandogli un `da` che non ha mai avuto. Un campo solo per
// quattro comandi: `N`, `B`, `M`, `R`. Da qui `window.prompt` non è più nel programma (P2).
let comando = null;
// Niente `modificato` qui: lo deriva `file.js` confrontando il modello in memoria con quello
// che è stato spedito su disco. Una variabile propria mente a ogni corsa del salvataggio, e
// per tenerla onesta servirebbe un aggiornamento in ogni punto che tocca la cronologia.
let percorso = null, impronta = null;

const $ = (id) => document.getElementById(id);
const messaggio = $("messaggio");
function dì(testo) { messaggio.textContent = testo ?? ""; }

function scegli(tipo, id) {
  const { permesso, messaggio, aggiornaA } = esitoScelta(modo, tipo);
  if (messaggio) dì(messaggio);
  if (!permesso) return;
  if (aggiornaA) modo = { ...modo, a: id };
  selezione = { tipo, id };
  ridisegna();
}

const piano = creaPiano($("piano"), { suSelezione: scegli, suSfondo: () => { if (!modo) { selezione = null; ridisegna(); } } });
const albero = creaAlbero($("albero-elenco"), $("albero-vuoto"), { suSelezione: scegli });
const pannello = creaPannello(
  { dati: $("pannello-dati"), vuoto: $("pannello-vuoto"), editor: $("pannello-vincolo") },
  { suVincolo: (id, vincolo) => {
    esegui((m) => impostaVincolo(m, { id, vincolo }), `vincolo del nodo ${id}`);
    ridisegna();
  } },
);
// Senza `await`, e non per eleganza: `import("./vendor/three.module.js")` sono 2 MB, e con
// l'attesa qui in cima il `keydown` là in fondo si registrava **dopo**. La pagina pareva
// pronta — colonna disegnata, «Premi N» negli stati vuoti — e la tastiera era morta: i tasti
// del primo secondo cadevano nel vuoto senza che niente lo dicesse (P5, «attesa parlante»).
// Adesso i listener ci sono dal primo disegno e la vista 3D si aggiunge quando arriva; nel
// frattempo `#spazio` porta scritto che sta caricando, che è l'altra metà di P5.
let spazio = null;
creaSpazio($("spazio")).then((s) => { spazio = s; ridisegna(); });
const storia = creaStoria($("storia-elenco"), {
  suSalto: (i) => {
    if (i === cronologia.indice) return;  // già lì: nessun ridisegno inutile
    cronologia = vaiA(cronologia, i);
    ridisegna();
  },
});
const file = creaFile(document, {
  suApertura: (p, m, i) => {
    cronologia = nuovaCronologia(m, `aperto ${p}`);
    selezione = null; modo = null;
    percorso = p; impronta = i;
    dì(null);
    ridisegna();
  },
  // Salvare non tocca né il modello né la cronologia: cambia solo l'impronta di riferimento.
  suSalvataggio: (p, i) => { percorso = p; impronta = i; dì(null); ridisegna(); },
  suErrore: (msg) => dì(msg),
});
// Il percorso aperto, non il campo: il campo è la sorgente di `apri`. `null` solo finché
// non c'è nessun modello aperto, ed è l'unica volta in cui salva legge il campo.
$("file-salva").addEventListener("click", () => file.salva(percorso, corrente(cronologia)));

// Aprire un modo lo rende il gesto della tastiera globale, quindi il fuoco deve lasciare
// il controllo su cui si trovava: `pannello.js` lo riporta apposta sul bottone dopo ogni
// ridisegno, e `Invio` su un bottone a fuoco lo **attiva** invece di confermare il gesto che
// la barra sta annunciando — si riscriverebbe il vincolo invece di chiudere l'asta.
function apriModo(nuovo) {
  modo = nuovo;
  document.activeElement?.blur?.();
  ridisegna();
}

// --- Il campo di comando -------------------------------------------------------------
// La differenza con `prompt` è tutta qui: mentre è aperto la pagina resta viva, il modello
// si vede, e il ghost si muove a ogni tasto invece di comparire dopo la conferma (P2, P4).

const rigaComando = $("comando");
const campoComando = $("comando-campo");
const etichettaComando = rigaComando.querySelector("label");
const aiutoComando = rigaComando.querySelector(".aiuto");

/** Apre il campo per una voce della tastiera (`N`, `B`, `M`, `R`). L'etichetta, l'aiuto e il
 *  segnaposto vengono da lì: la barra e il campo dicono la stessa cosa perché la leggono
 *  dallo stesso elenco. `bersaglio` è la selezione **al momento del tasto**, congelata: da
 *  aperto il campo non blocca più la pagina, e un clic nel piano sposterebbe la selezione
 *  sotto i piedi del comando — con `prompt` era impossibile, adesso no. */
function apriComando(voce, { bersaglio = null, esempio = voce.esempio } = {}) {
  comando = { tipo: voce.codice, testo: "", bersaglio };
  campoComando.value = "";
  etichettaComando.textContent = voce.etichetta;
  campoComando.placeholder = esempio;
  aiutoComando.textContent = voce.aiuto ?? "";
  dì(null);       // un errore di prima non resta a schermo sopra un campo appena aperto
  ridisegna();    // prima: il campo è `hidden` finché non serve, e `hidden` non prende fuoco
  campoComando.focus();
}

/** Chiude il campo e con lui il modo che gli appartiene: estrudendo il verso sta nel `modo`
 *  e la misura nel campo, quindi sono un gesto solo e si chiudono insieme — lasciare il modo
 *  aperto vorrebbe dire un ghost senza più nessuno che gli detti la lunghezza. Non ridisegna:
 *  chi chiude ridisegna comunque, e `ridisegna` chiude a sua volta quando il bersaglio sparisce. */
function chiudiComando() {
  comando = null;
  modo = null;
  campoComando.value = "";
}

// Il testo è la sorgente del ghost, quindi ogni tasto ridisegna. `comando.testo` rispecchia
// il campo e non il contrario: riscrivere `value` a ogni ridisegno sposterebbe il cursore.
campoComando.addEventListener("input", () => { comando = { ...comando, testo: campoComando.value }; ridisegna(); });

// Esc e le frecce qui e non nel listener globale: `daControllo` si tiene ogni tasto che arriva
// da un campo di testo — è la stessa regola per cui `n` lì dentro scrive una lettera.
campoComando.addEventListener("keydown", (ev) => {
  if (ev.key === "Escape") {
    ev.preventDefault();
    chiudiComando();
    dì(null);
    ridisegna();
    return;
  }
  // Estrudendo la freccia gira il ghost invece di muovere il cursore: è il gesto obbligatorio
  // — la lunghezza si sta scrivendo, la direzione non la dà nient'altro — ed è quello che la
  // barra promette. Il prezzo, dichiarato: mentre si estrude ←→ non spostano il cursore nel
  // testo. Negli altri comandi la freccia resta del campo, e questo `if` non scatta.
  const girato = ruotaGhost(modo, ev.key);
  if (!girato) return;
  ev.preventDefault();
  modo = girato;
  ridisegna();
});

// Invio conferma perché il campo sta in un `<form>`: è il comportamento della piattaforma,
// non un tasto da riconoscere a mano. Da qui in poi ogni comando che chiedeva un testo passa
// di qui, e `window.prompt` non esiste più in nessuna strada del programma (P2).
rigaComando.addEventListener("submit", (ev) => {
  ev.preventDefault();
  if (!comando) return;
  if (comando.tipo === "estrudi") return confermaEstrusione();
  if (comando.tipo === "rinomina") return confermaNome();
  confermaPunto();  // `nodo` e `sposta`: la stessa grammatica, «x; z»
});

// Campo vuoto: niente da eseguire **e** niente da dire. Un testo che c'è ma non si legge
// parla, e solo adesso — mentre si scriveva era un testo a metà, non uno sbagliato.
function confermaPunto() {
  const { punto, messaggio } = esitoComando(comando.testo);
  if (!punto) { if (messaggio) dì(messaggio); return; }
  const { x, z } = punto;
  const q = (v) => stampaNumero(v, { decimali: 0 });
  if (comando.tipo === "sposta") {
    const id = comando.bersaglio.id;
    if (!esegui((m) => spostaNodo(m, { id, x, z }), `sposta nodo ${id}`)) { ridisegna(); return; }
    // Le aste seguono da sole: referenziano l'identificatore, non le coordinate.
    chiudiComando();
    ridisegna();
    return;
  }
  const fatto = esegui((m) => creaNodo(m, { x, z }), `nodo ${q(x)}; ${q(z)}`);
  if (!fatto) { ridisegna(); return; }  // rifiutato (un nodo c'era già lì): il campo resta col testo
  // Il nodo appena posato è selezionato: è da lì che si estrude, e senza questo servirebbe
  // il mouse per riprenderlo — con il Goal che dice «senza il mouse».
  const m = corrente(cronologia);
  selezione = { tipo: "nodo", id: m.nodi[m.nodi.length - 1].id };
  chiudiComando();
  ridisegna();
}

// Estrude **il ghost che si sta guardando**, non un secondo conto sullo stesso testo: se il
// ghost non c'è non c'è niente da confermare, e il perché lo dice `esitoLunghezza` — che tace
// sul campo vuoto e parla su zero, negativo e illeggibile.
function confermaEstrusione() {
  const g = ghostDelComando(comando, modo);
  if (!g) {
    const { messaggio } = esitoLunghezza(comando.testo);
    if (messaggio) dì(messaggio);
    return;
  }
  if (esegui((m) => estrudi(m, g), `asta da ${g.da}`)) {
    // La punta è il `nodo_j` dell'asta appena nata, non l'ultimo nodo dell'elenco: quando
    // l'estrusione arriva su un nodo che c'era già, di nodi non ne nasce nessuno.
    const m = corrente(cronologia);
    selezione = { tipo: "nodo", id: m.aste[m.aste.length - 1].nodo_j };
    chiudiComando();
  }
  ridisegna();
}

// Il nome vuoto e quello di soli spazi li tratta `comandi.js:rinomina`, che è dove la regola
// stava già: il campo non ne scrive una seconda che diverga alla prima riflessione.
function confermaNome() {
  const { tipo, id } = comando.bersaglio;
  const nome = comando.testo;
  if (esegui((m) => rinomina(m, { tipo, id, nome }), `nome di ${tipo} ${id}`)) chiudiComando();
  ridisegna();
}

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
  const esiste = (s) => (s.tipo === "nodo" ? m.nodi : m.aste).some((e) => e.id === s.id);
  // Una selezione che punta a un oggetto sparito è peggio di nessuna selezione.
  if (selezione && !esiste(selezione)) selezione = null;
  // Il nodo di partenza di un modo sparito è nella stessa condizione di una selezione sparita.
  modo = modoValido(m, modo);
  // E il bersaglio di un comando aperto pure: ⌘Z lavora anche col campo aperto, e un campo
  // che chiede il nome di un nodo appena disfatto non ha più a chi parlare.
  if (comando?.bersaglio && !esiste(comando.bersaglio)) chiudiComando();

  // Un ghost solo, di due forme: la punta dell'asta — dal modo, o dal campo mentre si scrive
  // la lunghezza — oppure il punto in anteprima. Il secondo non è un `{da, dx, dz}`, non
  // parte da nessun nodo, e darglielo vorrebbe dire inventargli un'origine: `piano.js` lo
  // riconosce da `punto`.
  const ghost = comando ? ghostDelComando(comando, modo) : ghostDisegnabile(m, modo);
  rigaComando.hidden = !comando;
  piano.disegna(m, { selezione, ghost });
  spazio?.disegna(m, { selezione });  // finché three.js non è arrivato, il piano regge da solo
  albero.disegna(m, { selezione });
  pannello.disegna(m, selezione);
  file.disegna({ percorso, impronta, modello: m });
  storia.disegna(etichette(cronologia));
  disegnaBarra();
}

function disegnaBarra() {
  const contesto = contestoBarra(modo, selezione, comando);
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

// Un `keydown` solo su `window`, con la guardia in un posto solo: due listener sulla stessa
// finestra con regole d'ingresso diverse è il difetto, non il sintomo — quello delle frecce
// non ne aveva nessuna e rubava ↑↓←→ anche a chi stava scrivendo nel campo del percorso.
window.addEventListener("keydown", (ev) => {
  // Il controllo a fuoco si tiene i tasti che userebbe — le lettere in un campo, ⌫ e Spazio
  // su un bottone — e lascia passare gli altri: `daControllo` guarda il tasto, non solo il
  // bersaglio, altrimenti spegne dodici comandi ogni volta che il fuoco è su un controllo.
  if (daControllo(ev)) return;
  const voce = voceDaEvento(ev);
  if (!voce) return;

  // Prima del `preventDefault`: senza un'estrusione aperta la freccia non è nostra, e
  // rubarla vorrebbe dire togliere al browser lo scorrimento della pagina.
  if (voce.codice === "direzione") {
    const girato = ruotaGhost(modo, ev.key);
    if (!girato) return;
    ev.preventDefault();
    modo = girato;
    ridisegna();
    return;
  }
  ev.preventDefault();

  if (voce.codice === "annulla") { modo = null; chiudiComando(); dì(null); ridisegna(); return; }

  // Disfa e rifai funzionano anche con un modo aperto, come annulla: un ghost o un'asta
  // appesi a un nodo appena disfatto si chiudono da soli in `ridisegna` (`modoValido`).
  if (voce.codice === "disfa") {
    const nuova = indietro(cronologia);
    if (nuova !== cronologia) { cronologia = nuova; dì(null); ridisegna(); }
    return;
  }
  if (voce.codice === "rifai") {
    const nuova = avanti(cronologia);
    if (nuova !== cronologia) { cronologia = nuova; dì(null); ridisegna(); }
    return;
  }

  // Col campo aperto il gesto è la scrittura. Da dentro il campo qui non arriva niente
  // (`daControllo` filtra sopra), ma il fuoco può uscirne con un clic nel piano: da lì un
  // tasto aprirebbe un secondo comando e lascerebbe due anteprime appese. Torna nel campo.
  if (comando) { campoComando.focus(); return; }

  // Qui sotto il modo può essere solo l'asta: l'estrusione vive con il campo aperto, e col
  // campo aperto si è già tornati indietro alla riga sopra. Passano conferma, annulla e la
  // selezione, che dell'asta **è** il gesto.
  if (modo && voce.codice !== "conferma" && voce.codice !== "seleziona") {
    dì("scegli il secondo nodo, poi Invio — Esc per annullare");
    return;
  }

  if (voce.codice === "apri") { file.apri(); return; }
  if (voce.codice === "salva") { file.salva(percorso, corrente(cronologia)); return; }

  // `N` non chiede più niente: apre il campo, e da lì in poi il ghost segue i tasti.
  // Con un modo già in corso non ci arriva mai — lo ferma la guardia qui sopra, che dice
  // di chiudere prima il ghost. Il comando non parte, e nessuno dei due stati resta appeso.
  if (voce.codice === "nodo") { apriComando(voce); return; }

  if (voce.codice === "seleziona") {
    // G gira fra i nodi in ordine di identificatore. In modo asta è il gesto stesso: passa
    // da `scegli`, che aggiorna anche `modo.a`, non solo `selezione`.
    const m = corrente(cronologia);
    if (m.nodi.length === 0) { dì("nessun nodo da selezionare: premi N"); return; }
    const ids = m.nodi.map((n) => n.id);
    const dove = selezione?.tipo === "nodo" ? ids.indexOf(selezione.id) : -1;
    scegli("nodo", ids[(dove + 1) % ids.length]);
    return;
  }

  if (voce.codice === "estrudi") {
    if (selezione?.tipo !== "nodo") { dì("estrudere parte da un nodo: selezionane uno"); return; }
    // Il modo tiene **solo** la direzione, in su di default: un versore, non una lunghezza —
    // quella la scrive il campo, e il ghost la stende (`ghostDelComando`). Le due metà si
    // aprono insieme e si chiudono insieme (`chiudiComando`), perché sono un gesto solo.
    modo = { tipo: "estrusione", da: selezione.id, dx: 0, dz: 1 };
    apriComando(voce, { bersaglio: { ...selezione } });
    return;
  }

  if (voce.codice === "asta") {
    if (selezione?.tipo !== "nodo") { dì("un'asta parte da un nodo: selezionane uno"); return; }
    apriModo({ tipo: "asta", da: selezione.id, a: null });
    return;
  }

  if (voce.codice === "vincolo") {
    if (selezione?.tipo !== "nodo") { dì("il vincolo è di un nodo: selezionane uno"); return; }
    const n = nodo(corrente(cronologia), selezione.id);
    const id = selezione.id;
    // `V` alterna fra incastro e libero **dichiarato**: spegnere l'ultimo grado acceso
    // dichiara il nodo libero, non cancella il campo — sono due stati diversi per
    // `nova/check.py:274` (vedi la correzione C3 del brief). Le altre preimpostazioni e i
    // gradi singoli stanno nel pannello, dove si vedono.
    esegui((m) => impostaVincolo(m, { id, vincolo: alternaIncastro(n.vincolo) }),
           `vincolo del nodo ${id}`);
    ridisegna();
    return;
  }

  // L'estrusione la conferma Invio nel campo (`confermaEstrusione`): qui arriva solo l'asta.
  if (voce.codice === "conferma") {
    if (!modo) return;
    if (modo.a === null) { dì("scegli il secondo nodo, poi Invio"); return; }
    const { da, a } = modo;
    if (esegui((m) => collega(m, { da, a }), `asta ${da} → ${a}`)) { modo = null; selezione = { tipo: "nodo", id: a }; }
    ridisegna();
    return;
  }

  // `M` apre lo stesso campo di `N`, con la stessa grammatica: l'esempio sono le coordinate
  // di adesso, che dicono da dove si parte meglio di qualunque frase.
  if (voce.codice === "sposta") {
    if (selezione?.tipo !== "nodo") { dì("si sposta un nodo: selezionane uno"); return; }
    const n = nodo(corrente(cronologia), selezione.id);
    const q = (v) => stampaNumero(v, { decimali: 0 });
    apriComando(voce, { bersaglio: { ...selezione }, esempio: `${q(n.x)}; ${q(n.z)}` });
    return;
  }

  if (voce.codice === "elimina") {
    if (selezione?.tipo !== "nodo") { dì("si elimina un nodo: selezionane uno (l'asta non ancora)"); return; }
    const id = selezione.id;
    esegui((m) => eliminaNodo(m, { id }), `elimina nodo ${id}`);
    ridisegna();
    return;
  }

  // `R` è testuale e basta: nessun ghost da mostrare, perché un nome non ha una geometria da
  // anticipare. L'esempio resta quello della tastiera; il nome di adesso si legge nel pannello.
  if (voce.codice === "rinomina") {
    if (!selezione) { dì("seleziona qualcosa da rinominare"); return; }
    apriComando(voce, { bersaglio: { ...selezione } });
  }
});

ridisegna();
