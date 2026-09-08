// Notazione numerica italiana (AGENTS.md, «Convenzioni»): la virgola separa i decimali,
// sempre; il punto separa le migliaia o le migliaia non si separano. Un'unica porta di
// ingresso e una sola d'uscita, così nessun campo la reinventa a modo suo.

// La regola, dichiarata una volta perché «1.234» è ambiguo e indovinare è peggio che
// scegliere: **il punto è decimale finché non compare una virgola**. Con la virgola in
// campo, il punto diventa separatore di migliaia. Così «2.5» è due e mezzo e «1.234,5» è
// milleduecentotrentaquattro e mezzo, e nessuno dei due dipende dal contesto.
const INGLESE = /^-?\d+(\.\d+)?$/;                  // 2.5 · 1200
const MIGLIAIA = /^-?\d{1,3}(\.\d{3})+(,\d+)?$/;    // 1.234,5 · 1.234.567
const VIRGOLA = /^-?\d+(,\d+)?$/;                   // 2,5 · 1200

/** Legge un numero scritto da una persona. Torna `null` — mai `NaN` — se non è un numero. */
export function leggiNumero(testo) {
  if (typeof testo !== "string") return null;
  const t = testo.trim();
  if (t === "") return null;
  if (t.includes(",")) {
    if (!MIGLIAIA.test(t) && !VIRGOLA.test(t)) return null;
    return Number(t.replaceAll(".", "").replace(",", "."));
  }
  if (!INGLESE.test(t)) return null;
  return Number(t);
}

/** Stampa un numero per una persona. Quel che non è finito esce come trattino, non come «NaN». */
export function stampaNumero(valore, { decimali = 1, migliaia = false } = {}) {
  if (!Number.isFinite(valore)) return "—";
  // `(-0,4).toFixed(0)` è «-0»: un meno che non dice niente su una quota che è zero.
  const arrotondato = Number(valore.toFixed(decimali)) === 0 ? 0 : valore;
  const fisso = arrotondato.toFixed(decimali).replace(".", ",");
  if (!migliaia) return fisso;
  const [intera, frazione] = fisso.split(",");
  const segno = intera.startsWith("-") ? "-" : "";
  const cifre = segno ? intera.slice(1) : intera;
  const puntata = cifre.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  // con `decimali: 0` la frazione non esiste: senza questo uscirebbe «5.000,undefined»
  return frazione === undefined ? `${segno}${puntata}` : `${segno}${puntata},${frazione}`;
}
