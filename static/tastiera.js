// La mappa dei tasti, e da qui la barra in basso. Story 14 chiede che le scorciatoie
// stampate siano quelle che funzionano: due elenchi separati divergono al primo cambio,
// quindi ce n'è uno solo e la barra lo legge.

// `esempio` è il segnaposto del campo di comando (`app.js:apriComando`), e sta qui perché è
// la stessa cosa che `aiuto` dice nella barra, detta col formato invece che a parole: due
// elenchi divergerebbero al primo ripensamento, come già la barra e le scorciatoie.
//
// `campo` è l'etichetta del campo di comando, e non è `etichetta`: quella è il **verbo** del
// tasto, e la barra la stampa già; una `<label>` risponde invece a «cosa va in questa
// casella», che è un sostantivo. Porta con sé la preposizione quando il comando ha un
// bersaglio da nominare (`etichettaCampo` qui sotto), perché è lì che cambia: `N` non ha
// nessun bersaglio, `B` parte **da** un nodo, `M` e `R` agiscono **di**/su un nodo.
export const TASTI = [
  { codice: "nodo",      tasto: "N",     etichetta: "nodo",      aiuto: "x; z in mm",      contesto: "salvo-ghost", esempio: "0; 3000", campo: "coordinate" },
  // Non più ⇥: quello resta del browser (fix round 1, A2). ⇥ da pagina appena caricata
  // restava sempre su `body` — mai passato a un vero controllo — perché questo codice lo
  // intercettava e faceva `preventDefault` a ogni pressione, pure quella che avrebbe dovuto
  // spostare il fuoco. G("ira") gira fra i nodi, libero, non collide con n b a v m r.
  { codice: "seleziona", tasto: "G",     etichetta: "seleziona", aiuto: "gira fra i nodi", contesto: "salvo-ghost" },
  { codice: "apri",      tasto: "⌘O",    etichetta: "apri",      aiuto: null,              contesto: "salvo-ghost", modificatore: "comando" },
  { codice: "salva",     tasto: "⌘S",    etichetta: "salva",     aiuto: null,              contesto: "salvo-ghost", modificatore: "comando" },
  { codice: "importa",   tasto: "⌘I",    etichetta: "importa",   aiuto: "il 12_wall.json scritto nel campo", contesto: "salvo-ghost", modificatore: "comando" },
  { codice: "verifica",  tasto: "⇧⌘⏎",  etichetta: "verifica",  aiuto: "il Check Model",  contesto: "salvo-ghost", modificatore: "comando" },
  { codice: "corri",     tasto: "⌘⏎",   etichetta: "corri",     aiuto: "tutte le analisi del modello", contesto: "salvo-ghost", modificatore: "comando" },
  // I risultati (giornata 13): una vista alla volta. Compare solo con una corsa da mostrare.
  { codice: "vista",     tasto: "0-4",   etichetta: "vista",     aiuto: "0 niente · 1 deformata · 2 M · 3 V · 4 N", contesto: "risultati" },
  // La 14a: un modo si guarda muoversi, e fermarlo è il gesto che serve per leggerne la forma.
  // Stesso contesto della vista — senza una corsa da mostrare non c'è niente da fermare.
  { codice: "pausa",     tasto: "Spazio", etichetta: "ferma / riprendi", aiuto: "l'animazione del modo", contesto: "risultati" },
  // «disfa», non «annulla»: l'etichetta era la stessa di Esc (`:41`), e in un elenco che
  // stampa il verbo — la barra, e ora la palette — le due voci si distinguevano solo dal
  // tasto accanto. «disfa» fa coppia con «rifai», che è la relazione vera fra le due.
  { codice: "disfa",     tasto: "⌘Z",    etichetta: "disfa",     aiuto: null,              contesto: "salvo-ghost", modificatore: "comando" },
  { codice: "rifai",     tasto: "⇧⌘Z",   etichetta: "rifai",     aiuto: null,              contesto: "salvo-ghost", modificatore: "comando" },
  { codice: "estrudi",   tasto: "B",     etichetta: "estrudi",   aiuto: "lunghezza, poi freccia", contesto: "selezione", esempio: "3000", campo: "lunghezza da" },
  { codice: "asta",      tasto: "A",     etichetta: "asta",      aiuto: "poi il secondo nodo",    contesto: "selezione" },
  { codice: "vincolo",   tasto: "V",     etichetta: "vincolo",   aiuto: null,              contesto: "selezione" },
  { codice: "sposta",    tasto: "M",     etichetta: "sposta",    aiuto: "x; z in mm",      contesto: "selezione", esempio: "0; 3000", campo: "coordinate di" },
  { codice: "rinomina",  tasto: "R",     etichetta: "rinomina",  aiuto: "un nome libero",  contesto: "selezione", esempio: "piede sinistro", campo: "nome di" },
  { codice: "sezione",   tasto: "S",     etichetta: "sezione",   aiuto: "b × h in mm, o il nome di una sezione", contesto: "salvo-ghost", esempio: "300 × 500", campo: "sezione" },
  { codice: "materiale", tasto: "C",     etichetta: "materiale", aiuto: "una classe: C25/30 o B450C", contesto: "salvo-ghost", esempio: "C25/30", campo: "classe" },
  // `tipi` restringe la voce ai soli tipi di selezione su cui il comando esiste davvero:
  // `D` con una sezione selezionata prometteva «danno» e `app.js` rispondeva «vuole un'asta».
  { codice: "danno",     tasto: "D",     etichetta: "danno",     aiuto: "fattori su E; fc, poi la nota", contesto: "selezione", esempio: "0,8; 0,9; martinetto 3", campo: "danno di", tipi: ["asta"] },
  { codice: "azione",       tasto: "Z",  etichetta: "azione",       aiuto: "nome; natura (G1, G2, Q con categoria, E)", contesto: "salvo-ghost", esempio: "permanenti travi; G2", campo: "azione" },
  { codice: "carico",       tasto: "Q",  etichetta: "carico",       aiuto: "su un nodo «Fx 20000», su un'asta «q» in N/mm", contesto: "selezione", esempio: "-12,5", campo: "carico su", tipi: ["nodo", "asta"] },
  { codice: "combinazione", tasto: "K",  etichetta: "combinazione", aiuto: "nome; tipo (facoltativo)", contesto: "salvo-ghost", esempio: "SLU; fondamentale", campo: "combinazione" },
  { codice: "palette",      tasto: "⌘K", etichetta: "comandi",      aiuto: "cerca un comando, anche col valore", contesto: "salvo-ghost", modificatore: "comando" },
  // La 15a: lo schermo per l'aula (story 62). Contesto `salvo-ghost`: dietro un'estrusione aperta
  // `P` è una lettera del gesto, non un cambio di layout.
  { codice: "presentazione", tasto: "P", etichetta: "presentazione", aiuto: "lo schermo per l'aula; P o Esc per uscire", contesto: "salvo-ghost" },
  { codice: "elimina",   tasto: "⌫",     etichetta: "elimina",   aiuto: null,              contesto: "selezione" },
  { codice: "conferma",  tasto: "Invio", etichetta: "conferma",  aiuto: null,              contesto: "ghost" },
  { codice: "annulla",   tasto: "Esc",   etichetta: "annulla",   aiuto: null,              contesto: "ghost" },
  // Col ghost aperto la freccia non è una comodità, è il gesto obbligatorio: la lunghezza
  // è già digitata e manca la direzione. Prima della barra non la nominava nessuno — l'unico
  // tasto che restava da premere, e a schermo non c'era scritto da nessuna parte.
  { codice: "direzione", tasto: "← ↑ → ↓", etichetta: "direzione", aiuto: null,            contesto: "ghost" },
];

/** L'etichetta del campo di comando: il sostantivo, e il bersaglio quando ce n'è uno.
 *
 *  Il bersaglio è congelato all'apertura (`app.js:apriComando`) mentre la selezione resta
 *  viva: senza nominarlo, `R` col nodo 1 e un clic sul nodo 6 rinominava il nodo 1 e niente
 *  a schermo diceva quale dei due. `${tipo} ${id}` è la stessa forma che le etichette della
 *  cronologia usano («nome di nodo 1»), non una seconda convenzione. */
export const etichettaCampo = (voce, bersaglio) =>
  bersaglio ? `${voce.campo} ${bersaglio.tipo} ${bersaglio.id}` : voce.campo;

// `key` dell'evento → codice, separati per modificatore. Le **etichette** stampate sono
// quelle di questa tastiera, che è un Mac (`⌫`, `R`); la mappa riconosce comunque `delete`
// e `f2` per chi lavora su un PC — è solo l'etichetta a scegliere.
const SENZA_MODIFICATORE = new Map([
  ["n", "nodo"], ["g", "seleziona"], ["b", "estrudi"], ["a", "asta"], ["v", "vincolo"],
  ["m", "sposta"], ["r", "rinomina"], ["f2", "rinomina"],
  // `s` nudo e `⌘S` stanno in due mappe: il modificatore le separa prima del `get` (`voceDaEvento`).
  ["s", "sezione"], ["c", "materiale"], ["d", "danno"],
  // `z` nudo e `⌘Z`, `k` nudo e `⌘K`: due mappe, il modificatore le separa prima del `get`
  // (`voceDaEvento`).
  ["z", "azione"], ["q", "carico"], ["k", "combinazione"], ["p", "presentazione"],
  // Le cifre della vista dei risultati: `0`-`4` nude. Da `5` a `9` non c'è niente, e la cifra
  // resta al browser. Col comando pure: `⌘1` è la scheda 1, non nostra (`CON_COMANDO`).
  ["0", "vista"], ["1", "vista"], ["2", "vista"], ["3", "vista"], ["4", "vista"],
  // Spazio nudo ferma il modo; ⌘Spazio è di Spotlight e non sta in `CON_COMANDO`.
  [" ", "pausa"],
  ["backspace", "elimina"], ["delete", "elimina"],
  ["enter", "conferma"], ["escape", "annulla"],
  ["arrowup", "direzione"], ["arrowdown", "direzione"],
  ["arrowleft", "direzione"], ["arrowright", "direzione"],
]);
// `enter` è qui **e** in `SENZA_MODIFICATORE`: il modificatore le separa prima del `get`
// (`voceDaEvento`), quindi Invio nudo resta «conferma» del ghost e ⌘⏎ lancia la corsa.
const CON_COMANDO = new Map([["o", "apri"], ["s", "salva"], ["z", "disfa"], ["k", "palette"], ["i", "importa"],
                             ["enter", "corri"]]);
// Solo ⇧⌘Z e ⇧⌘⏎ hanno un senso qui: ⇧⌘S resta «salva con nome» del browser, ⇧⌘O non è nostro.
const CON_COMANDO_E_SHIFT = new Map([["z", "rifai"], ["enter", "verifica"]]);

// Ciò che un bottone o una casella si tiene: quello che li attiva o li modifica, e basta.
// Il ⌫ è qui perché era il difetto originale — premuto su «cerniera» eliminava il nodo.
const ATTIVANO = new Set(["enter", " ", "backspace", "delete"]);
const NON_TESTUALI = new Set(["checkbox", "radio", "button", "submit", "reset", "range", "color", "file"]);
// R6, e la sua correzione: la freccia resta al controllo **solo** dove ci si naviga davvero.
// In un gruppo di radio — i cinque della vista — la freccia *è* il modo di cambiare selezione
// (ARIA), e `←`/`→` per il passo della pushover gliela rubavano. Su un bottone no: una voce
// dell'albero gestisce Invio e Spazio e basta (`albero.js:16-22`), e lasciarle le frecce
// significava che dopo aver scelto un nodo da lì i passi non si scorrevano più.
const NAVIGANO = new Set(["arrowleft", "arrowright", "arrowup", "arrowdown"]);
const CON_FRECCE = new Set(["radio", "checkbox", "range"]);

/** Se il controllo a fuoco si tiene **questo** tasto. La domanda non è «l'evento viene da un
 *  controllo» ma «il controllo lo userebbe»: la guardia larga di prima spegneva tutti e dodici
 *  i comandi ogni volta che il fuoco stava su un bottone o in un campo — e `pannello.js` il
 *  fuoco ce lo riporta apposta dopo ogni ricostruzione dell'editor, quindi restava lì.
 *
 *  Un campo di testo si tiene le lettere nude (ci si sta scrivendo) e le frecce (muovono il
 *  cursore), mai il modificatore di comando: `⌘S` e `⌘O` in un campo non scrivono niente.
 *  Un bottone o una casella si tengono solo ciò che li attiva — Spazio, Invio, ⌫ — e lasciano
 *  passare le lettere.
 *
 *  **Bottone qui vuol dire anche `role="button"`**, non solo il tag: l'albero e la Storia
 *  costruiscono le voci come `<li tabindex=0 role="button">`, e cercare i soli tag le lasciava
 *  fuori. L'Invio che salta a uno snapshot risaliva **anche** al listener globale, che lo
 *  leggeva come «conferma»: il comando eseguito lì potava la coda del rifà e gli snapshot
 *  dopo il salto sparivano senza che nessun annulla li riportasse. Stessa strada per ⌫, che
 *  su una voce a fuoco eliminava il nodo selezionato.
 *
 *  `?.` regge un evento senza target, o un target senza `closest`. */
export function daControllo(evento) {
  const elemento = evento?.target?.closest?.('input, button, select, textarea, [role="button"]');
  if (!elemento) return false;
  if (evento.metaKey || evento.ctrlKey) return false;
  const tag = String(elemento.tagName ?? "").toLowerCase();
  // Il ruolo conta quanto il tag, e per la stessa ragione: un `<li role="button">` che si
  // tenesse anche le lettere spegnerebbe dodici comandi ogni volta che il fuoco sta su una
  // voce — `N` da lì deve continuare ad aprire il campo.
  const bottone = tag === "button" || elemento.getAttribute?.("role") === "button";
  const tipo = String(elemento.type ?? "").toLowerCase();
  const testuale = !bottone && !NON_TESTUALI.has(tipo);
  const tasto = String(evento.key).toLowerCase();
  return testuale || ATTIVANO.has(tasto) || (!bottone && CON_FRECCE.has(tipo) && NAVIGANO.has(tasto));
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
/** Il nome accessibile di un tasto: «⇧⌘⏎» a voce è «maiuscolo comando invio», non «upwards white
 *  arrow place of interest sign return symbol». Le lettere restano lettere; i glifi diventano
 *  parole, nell'ordine in cui si premono. */
const PAROLE_DEI_GLIFI = [["⇧", "maiuscolo "], ["⌘", "comando "], ["⏎", "invio"], ["⌫", "cancella"],
                          ["Invio", "invio"], ["Esc", "escape"], ["← ↑ → ↓", "frecce"],
                          ["Spazio", "spazio"]];
export const nomeTasto = (tasto) => {
  let nome = String(tasto ?? "");
  for (const [glifo, parola] of PAROLE_DEI_GLIFI) nome = nome.split(glifo).join(parola);
  return nome.trim();
};

export const vociDellaBarra = (contesto, tipoSelezionato = null, { risultati = false } = {}) =>
  TASTI.filter((v) => {
    // Prima di tutto il resto: una voce che vale per un solo tipo di selezione non compare
    // sugli altri, in nessun contesto. La barra stampa ciò che funziona (story 14).
    if (v.tipi && !v.tipi.includes(tipoSelezionato)) return false;
    // Col campo di comando aperto restano due tasti soli: le lettere le prende il campo, e
    // le frecce muovono il cursore nel testo, non il ghost. Estrudendo no: lì la freccia è
    // il gesto che manca — la lunghezza si sta scrivendo, la direzione la dà solo lei —
    // quindi il campo gliela lascia (`app.js`) e la barra la promette.
    if (contesto === "comando" || contesto === "comando-direzione") {
      return v.codice === "conferma" || v.codice === "annulla" ||
             (contesto === "comando-direzione" && v.codice === "direzione");
    }
    // La vista si promette solo con una corsa da mostrare: senza, il tasto risponde «nessuna
    // corsa» e la barra direbbe il falso (story 14). Col ghost aperto il gesto è un altro.
    if (v.contesto === "risultati") return risultati && (contesto === "sempre" || contesto === "selezione");
    if (v.codice === "seleziona") return contesto !== "ghost";
    if (v.codice === "direzione") return contesto === "ghost";
    if (v.contesto === "salvo-ghost") return contesto !== "ghost" && contesto !== "asta";
    if (v.contesto === "ghost") return contesto === "ghost" || contesto === "asta";
    return v.contesto === contesto;
  });
