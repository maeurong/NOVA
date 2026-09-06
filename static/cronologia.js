// Uno snapshot per comando, cronologia lineare: la spec la sceglie perché un telaio pesa
// pochi KB e perché un comando invertibile va scritto due volte e sbagliato una.
// `applica` lascia risalire l'errore del riduttore senza toccare nulla: un comando
// rifiutato non è un passo della storia.

export function nuovaCronologia(m, etichetta = "modello vuoto") {
  return { snapshot: [m], etichetta: [etichetta], indice: 0 };
}

export const corrente = (c) => c.snapshot[c.indice];

export function applica(c, fn, etichetta) {
  const m = fn(corrente(c));  // se solleva, esce di qui e `c` resta com'era
  const snapshot = c.snapshot.slice(0, c.indice + 1);
  const etichette = c.etichetta.slice(0, c.indice + 1);
  snapshot.push(m);
  etichette.push(etichetta);
  return { snapshot, etichetta: etichette, indice: snapshot.length - 1 };
}

export const indietro = (c) => (c.indice > 0 ? { ...c, indice: c.indice - 1 } : c);
export const avanti = (c) => (c.indice < c.snapshot.length - 1 ? { ...c, indice: c.indice + 1 } : c);

export const etichette = (c) => c.etichetta.map((etichetta, i) => ({ etichetta, attiva: i === c.indice }));
