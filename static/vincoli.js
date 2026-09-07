// Il vincolo sono sei booleani, come in `nova/modello.py:51`. Le tre preimpostazioni
// della story 23 la spec le nomina e non le definisce: sono definite qui, e questo è
// l'unico posto dove esistono.

export const GRADI = ["ux", "uy", "uz", "rx", "ry", "rz"];

export const vincoloVuoto = () => Object.fromEntries(GRADI.map((g) => [g, false]));

// Congelate: sono una costante condivisa fra i moduli, e una costante condivisa che si
// può modificare è un difetto che viaggia. Un `incastro` a cui qualcuno togliesse `ux`
// smetterebbe di essere riconosciuto da `nomePreimpostazione` ovunque, non solo lì.
export const PREIMPOSTAZIONI = Object.freeze({
  incastro: Object.freeze({ ...vincoloVuoto(), ux: true, uy: true, uz: true, rx: true, ry: true, rz: true }),
  cerniera: Object.freeze({ ...vincoloVuoto(), ux: true, uy: true, uz: true }),
  // `uy` bloccato anche qui: il modello è spaziale, e un telaio piano senza ritegno fuori
  // piano ha un moto rigido — il Check Model lo rifiuta con `moti_rigidi`. Un carrello che
  // lascia `uy` libero è corretto sulla carta e inservibile in questo modello.
  carrello: Object.freeze({ ...vincoloVuoto(), uy: true, uz: true }),
});

const uguali = (a, b) => GRADI.every((g) => Boolean(a[g]) === Boolean(b[g]));

/** Il nome della preimpostazione che combacia, o `null`. Un vincolo tutto libero **non**
 *  è una preimpostazione: è l'assenza di vincolo, e si dice così. */
export function nomePreimpostazione(vincolo) {
  if (!vincolo) return null;
  if (GRADI.every((g) => !vincolo[g])) return null;
  return Object.keys(PREIMPOSTAZIONI).find((nome) => uguali(PREIMPOSTAZIONI[nome], vincolo)) ?? null;
}

export function descrizione(vincolo) {
  const nome = nomePreimpostazione(vincolo);
  if (nome) return nome;
  const bloccati = vincolo ? GRADI.filter((g) => vincolo[g]) : [];
  return bloccati.length === 0 ? "libero" : `bloccati: ${bloccati.join(", ")}`;
}

/** Il vincolo dopo il tasto `V`, che alterna fra incastro e libero. Un nodo che non ha
 *  niente di bloccato si incastra; uno che ha qualcosa torna **dichiarato** libero — sei
 *  booleani falsi, mai il campo cancellato. `null` e `vincoloVuoto()` sono due stati
 *  diversi per `nova/check.py`: il primo è una dimenticanza che il Check Model segnala al
 *  piede, il secondo una scelta dell'utente. Da qui esce solo la scelta. */
export const alternaIncastro = (vincolo) =>
  (GRADI.some((g) => vincolo?.[g]) ? vincoloVuoto() : { ...PREIMPOSTAZIONI.incastro });
