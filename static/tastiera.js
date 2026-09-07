// La mappa dei tasti, e da qui la barra in basso. Story 14 chiede che le scorciatoie
// stampate siano quelle che funzionano: due elenchi separati divergono al primo cambio,
// quindi ce n'è uno solo e la barra lo legge.

export const TASTI = [
  { codice: "nodo",      tasto: "N",     etichetta: "nodo",      aiuto: "x; z",            contesto: "salvo-ghost" },
  { codice: "seleziona", tasto: "⇥",     etichetta: "seleziona", aiuto: "gira fra i nodi", contesto: "salvo-ghost" },
  { codice: "apri",      tasto: "⌘O",    etichetta: "apri",      aiuto: null,              contesto: "salvo-ghost", modificatore: "comando" },
  { codice: "salva",     tasto: "⌘S",    etichetta: "salva",     aiuto: null,              contesto: "salvo-ghost", modificatore: "comando" },
  { codice: "estrudi",   tasto: "B",     etichetta: "estrudi",   aiuto: "lunghezza, poi freccia", contesto: "selezione" },
  { codice: "asta",      tasto: "A",     etichetta: "asta",      aiuto: "poi il secondo nodo",    contesto: "selezione" },
  { codice: "vincolo",   tasto: "V",     etichetta: "vincolo",   aiuto: null,              contesto: "selezione" },
  { codice: "sposta",    tasto: "M",     etichetta: "sposta",    aiuto: "x; z",            contesto: "selezione" },
  { codice: "rinomina",  tasto: "R",     etichetta: "rinomina",  aiuto: null,              contesto: "selezione" },
  { codice: "elimina",   tasto: "⌫",     etichetta: "elimina",   aiuto: null,              contesto: "selezione" },
  { codice: "conferma",  tasto: "Invio", etichetta: "conferma",  aiuto: null,              contesto: "ghost" },
  { codice: "annulla",   tasto: "Esc",   etichetta: "annulla",   aiuto: null,              contesto: "ghost" },
];

// `key` dell'evento → codice, separati per modificatore. Le **etichette** stampate sono
// quelle di questa tastiera, che è un Mac (`⌫`, `R`); la mappa riconosce comunque `delete`
// e `f2` per chi lavora su un PC — è solo l'etichetta a scegliere.
const SENZA_MODIFICATORE = new Map([
  ["n", "nodo"], ["tab", "seleziona"], ["b", "estrudi"], ["a", "asta"], ["v", "vincolo"],
  ["m", "sposta"], ["r", "rinomina"], ["f2", "rinomina"],
  ["backspace", "elimina"], ["delete", "elimina"],
  ["enter", "conferma"], ["escape", "annulla"],
]);
const CON_COMANDO = new Map([["o", "apri"], ["s", "salva"]]);

export function voceDaEvento(evento) {
  // ⌘ sul Mac, Ctrl sul PC: lo stesso modificatore di comando. `alt` non lo è mai, e una
  // combinazione non mappata resta al browser — rubarla è peggio che ignorarla.
  if (evento.altKey) return null;
  const comando = Boolean(evento.metaKey || evento.ctrlKey);
  // `⇧` conta solo col comando: `⌘⇧S` è «salva con nome» del browser. Da solo no —
  // chi preme `⇧N` per la maiuscola manda `shiftKey: true`, e deve creare un nodo lo stesso.
  if (comando && evento.shiftKey) return null;
  const tavola = comando ? CON_COMANDO : SENZA_MODIFICATORE;
  const codice = tavola.get(String(evento.key).toLowerCase());
  return codice ? TASTI.find((v) => v.codice === codice) : null;
}

// `salvo-ghost` vuol dire «sempre, tranne mentre c'è un modo aperto». `seleziona` fa
// eccezione: mentre si sceglie il secondo nodo di un'asta, `⇥` **è** il gesto.
export const vociDellaBarra = (contesto) =>
  TASTI.filter((v) => {
    if (v.codice === "seleziona") return contesto !== "ghost";
    if (v.contesto === "salvo-ghost") return contesto !== "ghost" && contesto !== "asta";
    if (v.contesto === "ghost") return contesto === "ghost" || contesto === "asta";
    return v.contesto === contesto;
  });
