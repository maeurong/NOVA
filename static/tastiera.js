// La mappa dei tasti, e da qui la barra in basso. Story 14 chiede che le scorciatoie
// stampate siano quelle che funzionano: due elenchi separati divergono al primo cambio,
// quindi ce n'è uno solo e la barra lo legge.

export const TASTI = [
  { codice: "nodo",      tasto: "N",     etichetta: "nodo",      aiuto: "x; z",            contesto: "sempre" },
  { codice: "seleziona", tasto: "⇥",     etichetta: "seleziona", aiuto: "gira fra i nodi", contesto: "sempre" },
  { codice: "estrudi",  tasto: "B",     etichetta: "estrudi",  aiuto: "lunghezza, poi freccia", contesto: "selezione" },
  { codice: "sposta",   tasto: "M",     etichetta: "sposta",   aiuto: "x; z",                  contesto: "selezione" },
  { codice: "rinomina", tasto: "R",     etichetta: "rinomina", aiuto: null,                    contesto: "selezione" },
  { codice: "elimina",  tasto: "⌫",     etichetta: "elimina",  aiuto: null,                    contesto: "selezione" },
  { codice: "conferma", tasto: "Invio", etichetta: "conferma", aiuto: null,                    contesto: "ghost" },
  { codice: "annulla",  tasto: "Esc",   etichetta: "annulla",  aiuto: null,                    contesto: "ghost" },
];

// `key` dell'evento → codice. I tasti **stampati** sopra sono quelli che stanno sulla
// tastiera di questa macchina, che è un Mac: stampare «Canc» o «F2» sarebbe la bugia che
// story 14 vieta, perché la barra è il manuale. Chi ha un PC preme Canc o F2 lo stesso —
// qui sotto sono riconosciuti entrambi; è solo l'etichetta a scegliere.
const DA_KEY = new Map([
  ["n", "nodo"], ["tab", "seleziona"], ["b", "estrudi"], ["m", "sposta"],
  ["r", "rinomina"], ["f2", "rinomina"],
  ["backspace", "elimina"], ["delete", "elimina"],
  ["enter", "conferma"], ["escape", "annulla"],
]);

export function voceDaEvento(evento) {
  // ⌘K (palette) e ⌘Z (cronologia) sono giornata 11: qui non si tocca niente di modificato,
  // altrimenti oggi rubiamo il tasto e domani si scopre che non arriva.
  if (evento.metaKey || evento.ctrlKey || evento.altKey) return null;
  const codice = DA_KEY.get(String(evento.key).toLowerCase());
  return codice ? TASTI.find((v) => v.codice === codice) : null;
}

export const vociDellaBarra = (contesto) =>
  TASTI.filter((v) => v.contesto === "sempre" || v.contesto === contesto);
