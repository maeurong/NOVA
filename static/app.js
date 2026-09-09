// La cucitura. Due modi di disegno oltre alla selezione libera: l'estrusione, dove la
// selezione resta ferma mentre si conferma un ghost, e l'asta fra due nodi, dove la
// selezione **è** il gesto — la stessa guardia renderebbe impossibile scegliere il
// secondo nodo. `ponytail: ridisegno intero; si passa a un diff quando un modello vero
// lo rende lento, non prima.`

import { modelloVuoto, nodo, materiale, vesteDi } from "./modello.js";
import { ErroreComando, creaNodo, estrudi, collega, spostaNodo, eliminaNodo, rinomina, impostaVincolo,
         creaSezione, modificaSezione, impostaFila, assegnaSezione, eliminaSezione, creaMateriale,
         modificaMateriale, eliminaMateriale, impostaDanno, impostaVeste, materialiDiDefault } from "./comandi.js";
import { leggiDimensioni } from "./sezione.js";
import { nuovaCronologia, applica, corrente, indietro, avanti, vaiA, etichette } from "./cronologia.js";
import { voceDaEvento, vociDellaBarra, daControllo, etichettaCampo } from "./tastiera.js";
import { creaPiano } from "./piano.js";
import { creaSpazio } from "./spazio.js";
import { creaAlbero } from "./albero.js";
import { creaPannello } from "./pannello.js";
import { creaFile, chiediJson } from "./file.js";
import { creaStoria } from "./storia.js";
import { ghostDisegnabile, esitoScelta, contestoBarra, ruotaGhost, modoValido,
         esitoComando, esitoLunghezza, ghostDelComando, serveUnNodo, AVVISO_SECONDO_NODO } from "./modo.js";
import { alternaIncastro } from "./vincoli.js";
import { stampaNumero, leggiEspressione, millimetri } from "./numeri.js";

let cronologia = nuovaCronologia(modelloVuoto());
let selezione = null;
// null · {tipo:"estrusione", da, dx, dz} · {tipo:"asta", da, a}
// Due modi e non un ghost solo: in estrusione la selezione è ferma, in asta la selezione
// **è** il gesto. La stessa guardia per entrambi renderebbe l'asta impossibile.
let modo = null;
// Il campo di comando: `null` quando è chiuso, `{ tipo, testo, bersaglio }` quando è aperto.
// Fuori da `modo` perché non è un modo — `nodo` non ha un nodo di partenza, e `modoValido`
// lo chiuderebbe a ogni ridisegno cercandogli un `da` che non ha mai avuto. Un campo solo per
// sette comandi: `N`, `B`, `M`, `R`, `S`, `C`, `D`. Da qui `window.prompt` non è più nel
// programma (P2).
let comando = null;
// Niente `modificato` qui: lo deriva `file.js` confrontando il modello in memoria con quello
// che è stato spedito su disco. Una variabile propria mente a ogni corsa del salvataggio, e
// per tenerla onesta servirebbe un aggiornamento in ogni punto che tocca la cronologia.
let percorso = null, impronta = null;

// Il catalogo delle classi e i legami dei materiali vengono dal server, dove i numeri di
// norma vivono già (`nova/catalogo.py`, `nova/legami.py`): qui non ce n'è nessuno. Il
// catalogo si chiede una volta; il legame per materiale e veste, con una cache — cambiare
// veste cambia la chiave, e una risposta vecchia non può atterrare sopra una nuova.
let catalogo = null;
const legami = new Map();
// Le chiavi della tabella di norma (`E`, `nu`, `densita`, `fck`, …) dipendono da **tipo e
// classe**, non dai valori scritti a mano: l'ultima risposta buona per la stessa coppia le
// porta già, e serve a tenere in piedi il gruppo «valori» mentre la POST successiva viaggia
// (`pannello.js`). Chiave a parte da quella di `legami`, che invece porta il materiale intero.
const tabelle = new Map();
const chiaveTabella = (k) => `${k.tipo}|${k.classe}`;

chiediJson("/api/catalogo").then((c) => { catalogo = c; ridisegna(); })
  .catch(() => { catalogo = null; });  // l'editor regge senza: mostra la classe che c'è (P5)

/** Il legame del materiale `id` nella veste corrente, o `null` finché non è arrivato — che
 *  l'editor dice, invece di lasciare un riquadro muto (P5). La chiave porta **anche** la
 *  veste: cambiarla fa ripartire le richieste, e la risposta di prima non può atterrare
 *  sopra quella di adesso. Una chiave già in cache non chiede due volte. */
function legamePer(m, id) {
  const k = materiale(m, id);
  if (!k) return null;
  const chiave = JSON.stringify([k, vesteDi(m)]);
  if (legami.has(chiave)) return legami.get(chiave);
  legami.set(chiave, null);  // in volo: «valori in arrivo», e nessuna seconda richiesta
  // L'errore **resta** in cache. Cancellarlo subito dopo il ridisegno lo rimetteva in volo al
  // ridisegno successivo: la POST ripartiva a ogni disegno e l'avviso lampeggiava. Il server
  // riavviato si riprova su un gesto — `scegli` svuota le chiavi in errore quando si
  // riseleziona un materiale — non su un disegno.
  const arrivo = (v) => {
    legami.set(chiave, v);
    // ponytail: la tabella si tiene com'è arrivata, override compresi (`catalogo.valori` li
    // scrive sopra i numeri di norma). Chi toglie una scrittura a mano vede il numero vecchio
    // per un giro di POST, poi la risposta nuova lo rimette a posto.
    if (v.valori) tabelle.set(chiaveTabella(k), v.catalogo);
    ridisegna();
  };
  chiediJson("/api/materiale/legame", { materiale: k, veste: vesteDi(m) })
    // Un 200 con un corpo illeggibile non è un legame: `chiediJson` in quel caso torna `{}`,
    // e `pannello.js` leggerebbe `legame.legame.tipo` su `undefined`.
    .then((d) => arrivo(d.valori ? d : { errore: "risposta del server illeggibile" }))
    .catch((e) => arrivo({ errore: e.message }));
  return null;
}

const $ = (id) => document.getElementById(id);
const messaggio = $("messaggio");
function dì(testo) { messaggio.textContent = testo ?? ""; }

// Una quota come la scrive l'albero: migliaia separate e unità sul numero (`albero.js`,
// PRODUCT.md «unità dichiarate in un punto e su ogni numero»). Non vale per il segnaposto
// del campo, che è un testo da **ricopiare**: lì l'unità sarebbe da cancellare a mano.
const quota = (v) => `${millimetri(v)} mm`;

function scegli(tipo, id) {
  const { permesso, messaggio, aggiornaA } = esitoScelta(modo, tipo);
  if (messaggio) dì(messaggio);
  if (!permesso) return;
  // Il gesto che riporta su un materiale è la richiesta di riprovare: qui, e solo qui, le
  // chiavi che portano un errore escono dalla cache (`legamePer`).
  if (tipo === "materiale") {
    for (const [k, v] of legami) if (v?.errore) legami.delete(k);
  }
  if (aggiornaA) modo = { ...modo, a: id };
  selezione = { tipo, id };
  ridisegna();
}

const piano = creaPiano($("piano"), { suSelezione: scegli, suSfondo: () => { if (!modo) { selezione = null; ridisegna(); } } });
const albero = creaAlbero($("albero-elenco"), $("albero-vuoto"), { suSelezione: scegli });
const pannello = creaPannello(
  { dati: $("pannello-dati"), vuoto: $("pannello-vuoto"), editor: $("pannello-editor") },
  {
    suVincolo: (id, vincolo) => { esegui((m) => impostaVincolo(m, { id, vincolo }), `vincolo del nodo ${id}`); ridisegna(); },
    suSezione: (id, campi) => { esegui((m) => modificaSezione(m, { id, ...campi }), `sezione ${id}: ${Object.keys(campi).join(", ")}`); ridisegna(); },
    suFila: (id, lato, n, diametro) => { esegui((m) => impostaFila(m, { id, lato, n, diametro }), `fila ${lato} della sezione ${id}`); ridisegna(); },
    suAssegna: (asta, sezione) => { esegui((m) => assegnaSezione(m, { asta, sezione }), `sezione dell'asta ${asta}`); ridisegna(); },
    suDanno: (asta, danno) => { esegui((m) => impostaDanno(m, { asta, danno }), `danno dell'asta ${asta}`); ridisegna(); },
    suMateriale: (id, campi) => { esegui((m) => modificaMateriale(m, { id, ...campi }), `materiale ${id}: ${Object.keys(campi).join(", ")}`); ridisegna(); },
    suVeste: (veste) => { esegui((m) => impostaVeste(m, { veste }), `veste ${veste}`); ridisegna(); },
    // Un numero illeggibile in un campo dell'editor è un avviso, non un comando: non entra
    // nella Storia e non tocca il modello — il campo si rimette da solo sul valore di prima.
    suAvviso: dì,
  },
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
    // Anche il campo, non solo selezione e modo: il bersaglio è congelato per id, gli id
    // ripartono da 1 in ogni file, e la guardia di `ridisegna` chiede che il bersaglio
    // *esista*, non che sia dello stesso modello. Senza questo, «sposta il nodo 3» aperto
    // sul file di prima confermava sul nodo 3 del file appena aperto.
    chiudiComando();
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
 *  sotto i piedi del comando — con `prompt` era impossibile, adesso no.
 *
 *  Congelato **e** scritto: l'etichetta nomina il bersaglio (`etichettaCampo`), perché un
 *  bersaglio che non si muove mentre la selezione si muove, e non è detto da nessuna parte,
 *  agisce su un nodo diverso da quello evidenziato a schermo. */
function apriComando(voce, { bersaglio = null, esempio = voce.esempio } = {}) {
  comando = { tipo: voce.codice, testo: "", bersaglio };
  campoComando.value = "";
  etichettaComando.textContent = etichettaCampo(voce, bersaglio);
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
// `dì(null)` per la stessa ragione per cui lo fa `apriComando`: l'errore di prima parla di un
// testo che non c'è più, e un rosso sopra un campo che si sta scrivendo è un rimprovero a
// metà parola (`modo.js`, «un testo a metà non è un testo sbagliato»).
campoComando.addEventListener("input", () => {
  comando = { ...comando, testo: campoComando.value };
  dì(null);
  ridisegna();
});

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
  conferma();
});

/** Il dispatch della conferma, fuori dal listener: `Invio` nel campo non è l'unica strada che
 *  porta qui. Il campo chiuso non ha niente da confermare, e tacere è la risposta giusta. */
function conferma() {
  if (!comando) return;
  if (comando.tipo === "estrudi") return confermaEstrusione();
  if (comando.tipo === "rinomina") return confermaNome();
  if (comando.tipo === "sezione") return confermaSezione();
  if (comando.tipo === "materiale") return confermaMateriale();
  if (comando.tipo === "danno") return confermaDanno();
  confermaPunto();  // `nodo` e `sposta`: la stessa grammatica, «x; z»
}

// Campo vuoto: niente da eseguire **e** niente da dire. Un testo che c'è ma non si legge
// parla, e solo adesso — mentre si scriveva era un testo a metà, non uno sbagliato.
function confermaPunto() {
  const { punto, messaggio } = esitoComando(comando.testo);
  if (!punto) { if (messaggio) dì(messaggio); return; }
  const { x, z } = punto;
  if (comando.tipo === "sposta") {
    const id = comando.bersaglio.id;
    if (!esegui((m) => spostaNodo(m, { id, x, z }), `sposta nodo ${id}`)) { ridisegna(); return; }
    // Le aste seguono da sole: referenziano l'identificatore, non le coordinate.
    chiudiComando();
    ridisegna();
    return;
  }
  // Le stesse cifre dell'albero, e l'unità su ogni numero (PRODUCT.md): la cronologia
  // scriveva «nodo 1200; 3300» dove l'albero dice «1 200 mm; 3 300 mm» — due convenzioni
  // per lo stesso nodo, a due dita di distanza nella stessa pagina.
  const fatto = esegui((m) => creaNodo(m, { x, z }), `nodo ${quota(x)}; ${quota(z)}`);
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

// `S` fa due cose con una grammatica sola, perché all'utente sono la stessa: dare una
// sezione a un'asta. «300 × 500» la disegna e gliela dà, il nome di una che c'è già gliela
// dà e basta — e nella Storia resta **una** voce, che dice tutto quello che è successo
// (P4: l'annulla è visibile solo se le sue voci sono leggibili).
function confermaSezione() {
  const testo = comando.testo.trim();
  if (testo === "") return;
  const m = corrente(cronologia);
  const dims = leggiDimensioni(testo);
  const esistente = dims ? null : m.sezioni.find((s) => s.nome === testo || String(s.id) === testo);
  if (!dims && !esistente) { dì(`«${testo}» non è né b × h né il nome di una sezione`); return; }
  const asta = comando.bersaglio?.id ?? null;
  // Il nome di una sezione che c'è già, e nessuna asta a cui darla: il modello non cambia.
  // Selezionarla e basta — una voce della Storia che non ha cambiato niente è una bugia
  // dentro l'unica lista che dice cosa è successo.
  if (!dims && asta === null) {
    selezione = { tipo: "sezione", id: esistente.id };
    chiudiComando();
    ridisegna();
    return;
  }
  // L'etichetta della Storia si compone **prima**: `applica` la riceve insieme al riduttore.
  // `materialiDiDefault` è pura e costa niente: qui dice cosa nascerà, dentro il riduttore
  // lo fa davvero sul modello che riceve.
  const { aggiunti } = dims ? materialiDiDefault(m) : { aggiunti: [] };
  const etichetta = (dims ? `sezione ${millimetri(dims.b)} × ${millimetri(dims.h)} mm` : `sezione ${esistente.nome}`)
    + (aggiunti.length ? `, con ${aggiunti.join(" e ")}` : "")
    + (asta !== null ? ` → asta ${asta}` : "");
  const fatto = esegui((stato) => {
    // Senza dimensioni resta solo l'assegnazione: il ramo «nome esistente e nessuna asta» è
    // già uscito qui sopra, quindi qui `asta` c'è per forza.
    if (!dims) return assegnaSezione(stato, { asta, sezione: esistente.id });
    // I due `find` non tornano `null` perché i materiali li ha appena messi la riga sopra:
    // gli id si prendono dal modello che `materialiDiDefault` restituisce, non da uno cercato
    // altrove dove la dipendenza non si vedrebbe.
    const conMateriali = materialiDiDefault(stato).modello;
    const cls = conMateriali.materiali.find((k) => k.tipo === "calcestruzzo").id;
    const acc = conMateriali.materiali.find((k) => k.tipo === "acciaio").id;
    const n = creaSezione(conMateriali, { b: dims.b, h: dims.h, calcestruzzo: cls, acciaio: acc });
    const id = n.sezioni[n.sezioni.length - 1].id;
    return asta === null ? n : assegnaSezione(n, { asta, sezione: id });
  }, etichetta);
  if (!fatto) { ridisegna(); return; }  // rifiutato: il campo resta col testo
  // Senza asta la sezione appena nata è il soggetto: l'editor si apre su di lei. Con l'asta
  // la selezione resta l'asta, che è quella che si sta armando.
  if (asta === null) { const n = corrente(cronologia); selezione = { tipo: "sezione", id: n.sezioni[n.sezioni.length - 1].id }; }
  chiudiComando();
  ridisegna();
}

// Il tipo lo dice la classe, non un secondo campo da scegliere: «C» e «B» sono le lettere
// della norma, e chiederlo due volte sarebbe chiedere all'utente di ripetersi.
function confermaMateriale() {
  const classe = comando.testo.trim();
  if (classe === "") return;
  const tipo = /^c\s*\d/i.test(classe) ? "calcestruzzo" : /^b\s*\d/i.test(classe) ? "acciaio" : null;
  if (!tipo) { dì("una classe comincia per C (calcestruzzo, C25/30) o per B (acciaio, B450C)"); return; }
  // `classi` solo se il catalogo è arrivato: senza server la classe si scrive comunque, ed
  // è il salvataggio a dire di no — meglio che un campo muto che rifiuta tutto (P5).
  if (esegui((m) => creaMateriale(m, { tipo, classe, classi: catalogo?.[tipo] ?? null }), `materiale ${classe}`)) {
    const n = corrente(cronologia);
    selezione = { tipo: "materiale", id: n.materiali[n.materiali.length - 1].id };
    chiudiComando();
  }
  ridisegna();
}

// «fE; ffc[; nota]», con il `;` di «x; z»: una grammatica sola per tutto il campo. I due
// fattori passano da `leggiEspressione`, quindi «1/1,25» vale quanto «0,8» (P9); i limiti
// (fra 0 escluso e 1) restano a `impostaDanno`, che è dove la regola sta già.
function confermaDanno() {
  if (comando.testo.trim() === "") return;
  const parti = comando.testo.split(";").map((p) => p.trim());
  if (parti.length < 2) { dì("scrivi due fattori, «E; fc», e se vuoi una nota: «0,8; 0,9; martinetto 3»"); return; }
  const [fattore_E, fattore_fc] = parti.slice(0, 2).map(leggiEspressione);
  const asta = comando.bersaglio.id;
  if (esegui((m) => impostaDanno(m, { asta, danno: { fattore_E, fattore_fc, nota: parti.slice(2).join("; ") } }),
             `danno dell'asta ${asta}`)) chiudiComando();
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
  // Quattro tipi selezionabili da quando l'albero porta sezioni e materiali: un tipo che
  // non è nell'elenco non esiste, e la selezione cade — non solleva.
  const esiste = (s) => ({ nodo: m.nodi, asta: m.aste, sezione: m.sezioni, materiale: m.materiali }[s.tipo] ?? [])
    .some((e) => e.id === s.id);
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
  const scelto = selezione?.tipo === "materiale" ? materiale(m, selezione.id) : null;
  pannello.disegna(m, selezione, {
    catalogo,
    legame: scelto ? legamePer(m, selezione.id) : null,
    tabella: scelto ? (tabelle.get(chiaveTabella(scelto)) ?? null) : null,
  });
  file.disegna({ percorso, impronta, modello: m });
  storia.disegna(etichette(cronologia));
  disegnaBarra();
}

function disegnaBarra() {
  const contesto = contestoBarra(modo, selezione, comando);
  // Il tipo della selezione, non solo il contesto: `D` esiste sulla sola asta, e una barra
  // che lo promette con una sezione selezionata mente (story 14).
  $("barra").replaceChildren(...vociDellaBarra(contesto, selezione?.tipo ?? null).map((v) => {
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
  eseguiVoce(voce);
});

/** Una voce della tastiera, eseguita. Fuori dal listener perché `ev` qui dentro non serve più
 *  — il ramo `direzione`, l'unico che legge `ev.key`, resta di là — e perché il tasto non è
 *  l'unica strada che porta a un comando. */
function eseguiVoce(voce) {
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

  // Apri e salva stanno con disfa e rifai, e **sopra** la guardia del campo: `daControllo`
  // lascia passare il modificatore di comando apposta (è così che ⌘Z funziona mentre si
  // scrive), quindi ⌘S da dentro il campo arriva fin qui — e sotto la guardia finiva a
  // rimettere il fuoco dove già stava, con il `preventDefault` già fatto. Salvare mentre si
  // scrive un nome non faceva niente e non diceva niente.
  if (voce.codice === "apri") { file.apri(); return; }
  if (voce.codice === "salva") { file.salva(percorso, corrente(cronologia)); return; }

  // Col campo aperto il gesto è la scrittura. Da dentro il campo qui arrivano solo le
  // combinazioni col modificatore, già servite qui sopra; ma il fuoco può uscire dal campo
  // con un clic nel piano, e da lì un tasto aprirebbe un secondo comando lasciando due
  // anteprime appese. Torna nel campo.
  if (comando) { campoComando.focus(); return; }

  // Qui sotto il modo può essere solo l'asta: l'estrusione vive con il campo aperto, e col
  // campo aperto si è già tornati indietro alla riga sopra. Passano conferma, annulla e la
  // selezione, che dell'asta **è** il gesto.
  if (modo && voce.codice !== "conferma" && voce.codice !== "seleziona") {
    dì(AVVISO_SECONDO_NODO);
    return;
  }

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
    if (selezione?.tipo !== "nodo") { dì(serveUnNodo("estrudere")); return; }
    // Il modo tiene **solo** la direzione, in su di default: un versore, non una lunghezza —
    // quella la scrive il campo, e il ghost la stende (`ghostDelComando`). Le due metà si
    // aprono insieme e si chiudono insieme (`chiudiComando`), perché sono un gesto solo.
    modo = { tipo: "estrusione", da: selezione.id, dx: 0, dz: 1 };
    apriComando(voce, { bersaglio: { ...selezione } });
    return;
  }

  if (voce.codice === "asta") {
    if (selezione?.tipo !== "nodo") { dì(serveUnNodo("un'asta")); return; }
    apriModo({ tipo: "asta", da: selezione.id, a: null });
    return;
  }

  if (voce.codice === "vincolo") {
    if (selezione?.tipo !== "nodo") { dì(serveUnNodo("il vincolo")); return; }
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
    if (modo.a === null) { dì(AVVISO_SECONDO_NODO); return; }
    const { da, a } = modo;
    if (esegui((m) => collega(m, { da, a }), `asta ${da} → ${a}`)) { modo = null; selezione = { tipo: "nodo", id: a }; }
    ridisegna();
    return;
  }

  // `M` apre lo stesso campo di `N`, con la stessa grammatica: l'esempio sono le coordinate
  // di adesso, che dicono da dove si parte meglio di qualunque frase.
  if (voce.codice === "sposta") {
    if (selezione?.tipo !== "nodo") { dì(serveUnNodo("spostare")); return; }
    const n = nodo(corrente(cronologia), selezione.id);
    const q = (v) => stampaNumero(v, { decimali: 0 });
    apriComando(voce, { bersaglio: { ...selezione }, esempio: `${q(n.x)}; ${q(n.z)}` });
    return;
  }

  if (voce.codice === "elimina") {
    // Sezioni e materiali si eliminano come i nodi. Chi è ancora in uso lo rifiuta da sé e
    // dice **chi** lo usa (`comandi.js:eliminaSezione`, `eliminaMateriale`): una guardia qui
    // sarebbe un secondo oracolo da tenere allineato a mano.
    if (selezione?.tipo === "sezione" || selezione?.tipo === "materiale") {
      const { tipo, id } = selezione;
      const via = tipo === "sezione" ? eliminaSezione : eliminaMateriale;
      esegui((m) => via(m, { id }), `elimina ${tipo} ${id}`);
      ridisegna();
      return;
    }
    // L'asta resta fuori davvero (`comandi.js` elimina solo nodi): la frase lo dice, invece
    // di lasciar credere che basti selezionarne una.
    if (selezione?.tipo !== "nodo") { dì(`${serveUnNodo("eliminare")} — l'asta non si elimina ancora`); return; }
    const id = selezione.id;
    esegui((m) => eliminaNodo(m, { id }), `elimina nodo ${id}`);
    ridisegna();
    return;
  }

  // `R` è testuale e basta: nessun ghost da mostrare, perché un nome non ha una geometria da
  // anticipare. L'esempio resta quello della tastiera; chi rinomina lo dice l'etichetta del
  // campo, che nomina il bersaglio congelato — il pannello no, quello segue la selezione, e
  // la selezione da qui in poi si può muovere.
  //
  // È l'unico comando che accetta anche un'asta, quindi non passa da `serveUnNodo`.
  if (voce.codice === "rinomina") {
    if (!selezione) { dì("rinominare vuole qualcosa di selezionato: premi G per girare fra i nodi, o clicca un'asta, una sezione o un materiale nell'albero"); return; }
    apriComando(voce, { bersaglio: { ...selezione } });
    return;
  }

  // `S` con un'asta selezionata è il gesto più frequente della giornata — disegnare la
  // sezione e darla all'asta — quindi il bersaglio si congela come per `M` e `R`, e
  // l'etichetta del campo lo nomina: «sezione di asta 3» dice a chi finirà.
  if (voce.codice === "sezione") {
    const bersaglio = selezione?.tipo === "asta" ? { ...selezione } : null;
    apriComando(bersaglio ? { ...voce, campo: "sezione di" } : voce, { bersaglio });
    return;
  }

  // `C` non chiede nessun bersaglio: un materiale non è di nessuno finché una sezione non
  // lo prende.
  if (voce.codice === "materiale") { apriComando(voce); return; }

  if (voce.codice === "danno") {
    if (selezione?.tipo !== "asta") { dì("il danno vuole un'asta: clicca un'asta nel piano o nell'albero"); return; }
    apriComando(voce, { bersaglio: { ...selezione } });
  }
}

ridisegna();
