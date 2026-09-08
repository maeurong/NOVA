// Uno snapshot per comando, cronologia lineare: la spec la sceglie perché un telaio pesa
// pochi KB e perché un comando invertibile va scritto due volte e sbagliato una.
// `applica` lascia risalire l'errore del riduttore senza toccare nulla: un comando
// rifiutato non è un passo della storia — e nemmeno un comando che non ha cambiato niente.

export function nuovaCronologia(m, etichetta = "modello vuoto") {
  return { snapshot: [m], etichetta: [etichetta], indice: 0 };
}

export const corrente = (c) => c.snapshot[c.indice];

export function applica(c, fn, etichetta) {
  const m = fn(corrente(c));  // se solleva, esce di qui e `c` resta com'era
  // Un comando che non ha cambiato niente non è un passo della storia (P4,
  // `docs/ricerca/07-ux-modellatore.md:152`): la preimpostazione già premuta, «300,0»
  // scritto su 300, la rinomina con lo stesso nome. Il riduttore lo dichiara restituendo
  // **il modello che ha ricevuto**, per riferimento — l'unica forma di «non è cambiato
  // niente» che non costa un secondo confronto qui dentro. Nemmeno la coda del rifà si
  // pota: non c'è niente da mettere al suo posto.
  if (m === corrente(c)) return c;
  const snapshot = c.snapshot.slice(0, c.indice + 1);
  const nuoveEtichette = c.etichetta.slice(0, c.indice + 1);
  snapshot.push(m);
  nuoveEtichette.push(etichetta);
  return { snapshot, etichetta: nuoveEtichette, indice: snapshot.length - 1 };
}

export const indietro = (c) => (c.indice > 0 ? { ...c, indice: c.indice - 1 } : c);
export const avanti = (c) => (c.indice < c.snapshot.length - 1 ? { ...c, indice: c.indice + 1 } : c);

// Il salto diretto per la cronologia cliccabile: stesso contratto di `indietro`/`avanti`,
// fuori intervallo torna `c` invariata invece di sollevare.
export const vaiA = (c, i) => (i >= 0 && i < c.snapshot.length ? { ...c, indice: i } : c);

export const etichette = (c) => c.etichetta.map((etichetta, i) => ({ etichetta, attiva: i === c.indice }));
