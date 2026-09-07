// La mappa dei tasti, e da qui la barra in basso. Story 14 chiede che le scorciatoie
// stampate siano quelle che funzionano: due elenchi separati divergono al primo cambio,
// quindi ce n'è uno solo e la barra lo legge.

// `esempio` è il segnaposto del campo di comando (`app.js:apriComando`), e sta qui perché è
// la stessa cosa che `aiuto` dice nella barra, detta col formato invece che a parole: due
// elenchi divergerebbero al primo ripensamento, come già la barra e le scorciatoie.
export const TASTI = [
  { codice: "nodo",      tasto: "N",     etichetta: "nodo",      aiuto: "x; z in mm",      contesto: "salvo-ghost", esempio: "0; 3000" },
  // Non più ⇥: quello resta del browser (fix round 1, A2). ⇥ da pagina appena caricata
  // restava sempre su `body` — mai passato a un vero controllo — perché questo codice lo
  // intercettava e faceva `preventDefault` a ogni pressione, pure quella che avrebbe dovuto
  // spostare il fuoco. G("ira") gira fra i nodi, libero, non collide con n b a v m r.
  { codice: "seleziona", tasto: "G",     etichetta: "seleziona", aiuto: "gira fra i nodi", contesto: "salvo-ghost" },
  { codice: "apri",      tasto: "⌘O",    etichetta: "apri",      aiuto: null,              contesto: "salvo-ghost", modificatore: "comando" },
  { codice: "salva",     tasto: "⌘S",    etichetta: "salva",     aiuto: null,              contesto: "salvo-ghost", modificatore: "comando" },
  { codice: "disfa",     tasto: "⌘Z",    etichetta: "annulla",   aiuto: null,              contesto: "salvo-ghost", modificatore: "comando" },
  { codice: "rifai",     tasto: "⇧⌘Z",   etichetta: "rifai",     aiuto: null,              contesto: "salvo-ghost", modificatore: "comando" },
  { codice: "estrudi",   tasto: "B",     etichetta: "estrudi",   aiuto: "lunghezza, poi freccia", contesto: "selezione", esempio: "3000" },
  { codice: "asta",      tasto: "A",     etichetta: "asta",      aiuto: "poi il secondo nodo",    contesto: "selezione" },
  { codice: "vincolo",   tasto: "V",     etichetta: "vincolo",   aiuto: null,              contesto: "selezione" },
  { codice: "sposta",    tasto: "M",     etichetta: "sposta",    aiuto: "x; z in mm",      contesto: "selezione", esempio: "0; 3000" },
  { codice: "rinomina",  tasto: "R",     etichetta: "rinomina",  aiuto: "un nome libero",  contesto: "selezione", esempio: "piede sinistro" },
  { codice: "elimina",   tasto: "⌫",     etichetta: "elimina",   aiuto: null,              contesto: "selezione" },
  { codice: "conferma",  tasto: "Invio", etichetta: "conferma",  aiuto: null,              contesto: "ghost" },
  { codice: "annulla",   tasto: "Esc",   etichetta: "annulla",   aiuto: null,              contesto: "ghost" },
  // Col ghost aperto la freccia non è una comodità, è il gesto obbligatorio: la lunghezza
  // è già digitata e manca la direzione. Finora era nominata solo dentro il `prompt`, che
  // è già sparito quando serve — la barra taceva sull'unico tasto che restava da premere.
  { codice: "direzione", tasto: "← ↑ → ↓", etichetta: "direzione", aiuto: null,            contesto: "ghost" },
];

// `key` dell'evento → codice, separati per modificatore. Le **etichette** stampate sono
// quelle di questa tastiera, che è un Mac (`⌫`, `R`); la mappa riconosce comunque `delete`
// e `f2` per chi lavora su un PC — è solo l'etichetta a scegliere.
const SENZA_MODIFICATORE = new Map([
  ["n", "nodo"], ["g", "seleziona"], ["b", "estrudi"], ["a", "asta"], ["v", "vincolo"],
  ["m", "sposta"], ["r", "rinomina"], ["f2", "rinomina"],
  ["backspace", "elimina"], ["delete", "elimina"],
  ["enter", "conferma"], ["escape", "annulla"],
  ["arrowup", "direzione"], ["arrowdown", "direzione"],
  ["arrowleft", "direzione"], ["arrowright", "direzione"],
]);
const CON_COMANDO = new Map([["o", "apri"], ["s", "salva"], ["z", "disfa"]]);
// Solo ⇧⌘Z ha un senso qui: ⇧⌘S resta «salva con nome» del browser, ⇧⌘O non è nostro.
const CON_COMANDO_E_SHIFT = new Map([["z", "rifai"]]);

// Ciò che un bottone o una casella si tiene: quello che li attiva o li modifica, e basta.
// Il ⌫ è qui perché era il difetto originale — premuto su «cerniera» eliminava il nodo.
const ATTIVANO = new Set(["enter", " ", "backspace", "delete"]);
const NON_TESTUALI = new Set(["checkbox", "radio", "button", "submit", "reset", "range", "color", "file"]);

/** Se il controllo a fuoco si tiene **questo** tasto. La domanda non è «l'evento viene da un
 *  controllo» ma «il controllo lo userebbe»: la guardia larga di prima spegneva tutti e dodici
 *  i comandi ogni volta che il fuoco stava su un bottone o in un campo — e `pannello.js` il
 *  fuoco ce lo riporta apposta dopo ogni ricostruzione dell'editor, quindi restava lì.
 *
 *  Un campo di testo si tiene le lettere nude (ci si sta scrivendo) e le frecce (muovono il
 *  cursore), mai il modificatore di comando: `⌘S` e `⌘O` in un campo non scrivono niente.
 *  Un bottone o una casella si tengono solo ciò che li attiva — Spazio, Invio, ⌫ — e lasciano
 *  passare le lettere. `?.` regge un evento senza target, o un target senza `closest`. */
export function daControllo(evento) {
  const elemento = evento?.target?.closest?.("input, button, select, textarea");
  if (!elemento) return false;
  if (evento.metaKey || evento.ctrlKey) return false;
  const tag = String(elemento.tagName ?? "").toLowerCase();
  const testuale = tag !== "button" && !NON_TESTUALI.has(String(elemento.type ?? "").toLowerCase());
  return testuale || ATTIVANO.has(String(evento.key).toLowerCase());
}

export function voceDaEvento(evento) {
  // ⌘ sul Mac, Ctrl sul PC: lo stesso modificatore di comando. `alt` non lo è mai, e una
  // combinazione non mappata resta al browser — rubarla è peggio che ignorarla.
  if (evento.altKey) return null;
  const comando = Boolean(evento.metaKey || evento.ctrlKey);
  // `⇧` conta solo col comando: `⌘⇧S` resta «salva con nome» del browser, `⌘⇧O` non è
  // nostro — nessuna delle due è in `CON_COMANDO_E_SHIFT`. `⌘⇧Z` sì: rifà, non annulla.
  // Chi preme `⇧N` per la maiuscola manda `shiftKey: true` senza comando, e crea un nodo lo stesso.
  const tavola = comando && evento.shiftKey ? CON_COMANDO_E_SHIFT
    : comando ? CON_COMANDO
    : SENZA_MODIFICATORE;
  const codice = tavola.get(String(evento.key).toLowerCase());
  return codice ? TASTI.find((v) => v.codice === codice) : null;
}

// `salvo-ghost` vuol dire «sempre, tranne mentre c'è un modo aperto». Due eccezioni, opposte
// e per la stessa ragione — la barra stampa solo ciò che funziona (story 14): `seleziona`
// compare anche in asta, dove `G` **è** il gesto; `direzione` compare solo col ghost, perché
// in asta la direzione la dà il secondo nodo e le frecce lì non fanno niente.
export const vociDellaBarra = (contesto) =>
  TASTI.filter((v) => {
    // Col campo di comando aperto restano due tasti soli: le lettere le prende il campo, e
    // le frecce muovono il cursore nel testo, non il ghost. Estrudendo no: lì la freccia è
    // il gesto che manca — la lunghezza si sta scrivendo, la direzione la dà solo lei —
    // quindi il campo gliela lascia (`app.js`) e la barra la promette.
    if (contesto === "comando" || contesto === "comando-direzione") {
      return v.codice === "conferma" || v.codice === "annulla" ||
             (contesto === "comando-direzione" && v.codice === "direzione");
    }
    if (v.codice === "seleziona") return contesto !== "ghost";
    if (v.codice === "direzione") return contesto === "ghost";
    if (v.contesto === "salvo-ghost") return contesto !== "ghost" && contesto !== "asta";
    if (v.contesto === "ghost") return contesto === "ghost" || contesto === "asta";
    return v.contesto === contesto;
  });
