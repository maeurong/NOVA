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

// Tokenizzatore + parser a precedenza scritti a mano: niente `eval`, niente `new Function`,
// niente costruttori dinamici. Il campo dove si scrive accetterà incolla da fuori (P9).
function tokenizza(testo) {
  const token = [];
  let i = 0;
  while (i < testo.length) {
    const c = testo[i];
    if (c === " " || c === "\t") {
      i++;
    } else if ("+-*/()".includes(c)) {
      token.push({ tipo: c });
      i++;
    } else if (/[0-9.,]/.test(c)) {
      let j = i;
      while (j < testo.length && /[0-9.,]/.test(testo[j])) j++;
      token.push({ tipo: "num", testo: testo.slice(i, j) });
      i = j;
    } else {
      throw new Error(`carattere non valido: ${c}`);
    }
  }
  return token;
}

/** Legge un'espressione con le quattro operazioni e le parentesi. `null` se non è valida. */
export function leggiEspressione(testo) {
  if (typeof testo !== "string") return null;
  const senzaSpazi = testo.trim();
  if (senzaSpazi === "") return null;
  try {
    const token = tokenizza(senzaSpazi);
    let pos = 0;
    const picco = () => token[pos];
    const avanza = () => token[pos++];
    // I letterali passano sempre da `leggiNumero`: è l'unica porta della notazione italiana.
    function fattore() {
      const t = avanza();
      if (t === undefined) throw new Error("atteso un numero");
      // Segno unario. `leggiNumero` accetta già «-5» da solo, e senza questo un'espressione
      // sarebbe **più povera** del campo che sostituisce: una coordinata negativa è normale
      // quanto una positiva. Ricorsivo perché «3*-2» e «(-5)*2» sono la stessa regola.
      if (t.tipo === "-") return -fattore();
      if (t.tipo === "+") return fattore();
      if (t.tipo === "num") {
        const v = leggiNumero(t.testo);
        if (v === null) throw new Error("numero non valido");
        return v;
      }
      if (t.tipo === "(") {
        const v = espressione();
        if (!avanza() || token[pos - 1].tipo !== ")") throw new Error("parentesi non chiusa");
        return v;
      }
      throw new Error("atteso un numero o una parentesi");
    }
    function termine() {
      let v = fattore();
      while (picco() && (picco().tipo === "*" || picco().tipo === "/")) {
        const op = avanza().tipo;
        const d = fattore();
        if (op === "*") v *= d;
        else {
          if (d === 0) throw new Error("divisione per zero");
          v /= d;
        }
      }
      return v;
    }
    function espressione() {
      let v = termine();
      while (picco() && (picco().tipo === "+" || picco().tipo === "-")) {
        const op = avanza().tipo;
        const d = termine();
        v = op === "+" ? v + d : v - d;
      }
      return v;
    }
    const risultato = espressione();
    if (pos !== token.length) throw new Error("testo in eccesso dopo l'espressione");
    return Number.isFinite(risultato) ? risultato : null;
  } catch {
    return null;
  }
}

const FATTORE_UNITA = { mm: 1, cm: 10, m: 1000 };

/** Legge una lunghezza — espressione più suffisso d'unità opzionale — e torna millimetri. */
export function leggiLunghezza(testo) {
  if (typeof testo !== "string") return null;
  const t = testo.trim();
  if (t === "") return null;
  let unita = "mm";
  let corpo = t;
  for (const suf of ["mm", "cm", "m"]) {
    if (t.toLowerCase().endsWith(suf)) {
      unita = suf;
      corpo = t.slice(0, t.length - suf.length).trim();
      break;
    }
  }
  const valore = leggiEspressione(corpo);
  if (valore === null) return null;
  return valore * FATTORE_UNITA[unita];
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
