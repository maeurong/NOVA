// I percorsi aperti di recente. Vivono nel deposito del browser, che è una comodità:
// se non c'è o solleva, il programma apre i file lo stesso — non si rompe per una lista.
// Il deposito arriva come argomento e non da `window`, così il test lo può fingere.

export const TETTO = 8;
const CHIAVE = "nova.recenti";

/** Il percorso in cima, senza duplicati, entro il tetto. Vuoto o spazi: non entra. */
export function aggiungi(elenco, percorso) {
  const p = typeof percorso === "string" ? percorso.trim() : "";
  if (p === "") return elenco;
  return [p, ...elenco.filter((x) => x !== p)].slice(0, TETTO);
}

export function leggi(deposito) {
  try {
    const grezzo = deposito.getItem(CHIAVE);
    if (!grezzo) return [];
    const dati = JSON.parse(grezzo);
    // un JSON valido ma della forma sbagliata è come nessun dato: non si indovina
    if (!Array.isArray(dati) || !dati.every((x) => typeof x === "string")) return [];
    return dati.slice(0, TETTO);
  } catch {
    return [];
  }
}

export function scrivi(deposito, elenco) {
  try {
    deposito.setItem(CHIAVE, JSON.stringify(elenco.slice(0, TETTO)));
  } catch {
    // finestra privata, dati del sito bloccati: si perde la lista, non il lavoro
  }
}
