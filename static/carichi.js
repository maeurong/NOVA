// I carichi e le azioni: costanti dello schema, le grammatiche del campo di comando, il testo
// per una persona e le frecce per il piano. Puro: niente DOM, niente modello mutato.
// Le costanti sono quelle di `nova/modello.py:231-306` **alla lettera**: `extra="forbid"`
// rifiuta al salvataggio qualunque chiave o valore inventato qui.

import { leggiEspressione } from "./numeri.js";
import { cifre } from "./legame.js";
import { nodo, asta } from "./modello.js";

export const NATURE = ["G1", "G2", "Q", "E"];
export const TIPI_CARICO = ["nodale", "distribuito", "gravita", "cedimento", "termico"];
export const DIREZIONI = ["x", "y", "z", "locale_y", "locale_z"];
export const TIPI_COMBINAZIONE = ["fondamentale", "caratteristica", "frequente", "quasi_permanente", "sismica"];
export const COMPONENTI = ["Fx", "Fy", "Fz", "Mx", "My", "Mz"];
export const GRADI_CEDIMENTO = ["ux", "uy", "uz", "rx", "ry", "rz"];

// A schermo: la chiave grezza è un nome di variabile, non una parola.
export const NOME_TIPO = { nodale: "nodale", distribuito: "distribuito", gravita: "gravità", cedimento: "cedimento", termico: "termico" };
export const NOME_TIPO_COMBINAZIONE = {
  fondamentale: "fondamentale (SLU)", caratteristica: "caratteristica (rara)", frequente: "frequente",
  quasi_permanente: "quasi permanente", sismica: "sismica",
};

export const AVVISO_AZIONE = "azione non letta: scrivi «nome; natura» — le nature sono G1, G2, Q, E; con Q anche la categoria: «spinta; Q; vento»";
export const AVVISO_NODALE = `carico non letto: scrivi «Fx 20000», o più componenti «Fx 20000; Fz -5000» — le componenti sono ${COMPONENTI.join(", ")} (N, N·mm)`;
export const AVVISO_DISTRIBUITO = `carico non letto: scrivi q in N/mm, «-12,5», e se serve la direzione «-12,5; x» — le direzioni sono ${DIREZIONI.join(", ")}`;
export const AVVISO_COMBINAZIONE = `combinazione non letta: scrivi «nome» o «nome; tipo» — i tipi sono ${TIPI_COMBINAZIONE.join(", ")}`;

const finito = (v) => typeof v === "number" && Number.isFinite(v);
const finitoONullo = (v) => v === null || v === undefined || finito(v);
const parti = (testo) => String(testo ?? "").split(";").map((p) => p.trim());
// «locale z» e «quasi permanente» come li scrive una persona: lo spazio vale l'underscore.
const chiave = (testo) => String(testo ?? "").trim().toLowerCase().replace(/\s+/g, "_");

/** Il carico con le sole chiavi del suo schema e i default del backend, o il messaggio. */
export function normalizzaCarico(c) {
  const tipo = c?.tipo;
  const no = (messaggio) => ({ carico: null, messaggio });
  if (!TIPI_CARICO.includes(tipo)) return no(`tipo di carico «${tipo}» sconosciuto: i tipi sono ${TIPI_CARICO.join(", ")}`);
  if (tipo === "nodale") {
    if (!Number.isInteger(c.nodo)) return no("il carico nodale vuole un nodo");
    const out = { tipo, nodo: c.nodo };
    for (const k of COMPONENTI) { const v = c[k] ?? 0; if (!finito(v)) return no(`${k} deve essere un numero`); out[k] = v; }
    return { carico: out, messaggio: null };
  }
  if (tipo === "distribuito") {
    if (!Number.isInteger(c.asta)) return no("il carico distribuito vuole un'asta");
    if (!finito(c.q)) return no("q è obbligatorio, in N/mm");
    const direzione = c.direzione ?? "z";
    if (!DIREZIONI.includes(direzione)) return no(`direzione «${direzione}» sconosciuta: le direzioni sono ${DIREZIONI.join(", ")}`);
    return { carico: { tipo, asta: c.asta, q: c.q, direzione }, messaggio: null };
  }
  if (tipo === "gravita") {
    const out = { tipo };
    for (const k of ["fattore_x", "fattore_y", "fattore_z"]) { const v = c[k] ?? 0; if (!finito(v)) return no(`${k} deve essere un numero`); out[k] = v; }
    return { carico: out, messaggio: null };
  }
  if (tipo === "cedimento") {
    if (!Number.isInteger(c.nodo)) return no("il cedimento vuole un nodo");
    const out = { tipo, nodo: c.nodo };
    for (const k of GRADI_CEDIMENTO) { const v = c[k] ?? null; if (!finitoONullo(v)) return no(`${k} deve essere un numero, o vuoto per «libero»`); out[k] = v; }
    return { carico: out, messaggio: null };
  }
  if (!Number.isInteger(c.asta)) return no("il carico termico vuole un'asta");
  const dT = c.dT_uniforme ?? 0, gradiente = c.gradiente ?? null;
  if (!finito(dT)) return no("dT_uniforme deve essere un numero");
  if (!finitoONullo(gradiente)) return no("il gradiente deve essere un numero, o vuoto");
  return { carico: { tipo, asta: c.asta, dT_uniforme: dT, gradiente }, messaggio: null };
}

/** «nome; natura; categoria». Il campo vuoto non è un testo sbagliato (`modo.js:esitoComando`). */
export function leggiAzione(testo) {
  if (String(testo ?? "").trim() === "") return { azione: null, messaggio: null };
  const [nome, natura0 = "", categoria0 = "", ...altro] = parti(testo);
  const natura = natura0.toUpperCase();
  if (!nome || !NATURE.includes(natura) || altro.length) return { azione: null, messaggio: AVVISO_AZIONE };
  const categoria = categoria0 || null;
  if (natura === "Q" && !categoria) return { azione: null, messaggio: "natura Q senza categoria d'uso: scrivi «nome; Q; categoria», per esempio «spinta; Q; vento»" };
  return { azione: { nome, natura, categoria }, messaggio: null };
}

/** «Fx 20000; Fz -5000»: coppie nome-valore. Un numero da solo non dice dove va. */
export function leggiNodale(testo) {
  if (String(testo ?? "").trim() === "") return { carico: null, messaggio: null };
  const carico = {};
  for (const p of parti(testo)) {
    const [nome, ...resto] = p.split(/\s+/);
    const k = COMPONENTI.find((c) => c.toLowerCase() === (nome ?? "").toLowerCase());
    const v = leggiEspressione(resto.join(" "));
    if (!k || v === null || k in carico) return { carico: null, messaggio: AVVISO_NODALE };
    carico[k] = v;
  }
  return { carico, messaggio: null };
}

/** «q» oppure «q; direzione». Zero è un carico che si può scrivere. */
export function leggiDistribuito(testo) {
  if (String(testo ?? "").trim() === "") return { carico: null, messaggio: null };
  const [q0, direzione0 = "z", ...altro] = parti(testo);
  const q = leggiEspressione(q0);
  const direzione = chiave(direzione0);
  if (q === null || !DIREZIONI.includes(direzione) || altro.length) return { carico: null, messaggio: AVVISO_DISTRIBUITO };
  return { carico: { q, direzione }, messaggio: null };
}

/** «nome» oppure «nome; tipo». */
export function leggiCombinazione(testo) {
  if (String(testo ?? "").trim() === "") return { combinazione: null, messaggio: null };
  const [nome, tipo0 = "", ...altro] = parti(testo);
  const tipo = tipo0 ? chiave(tipo0) : null;
  if (!nome || altro.length || (tipo !== null && !TIPI_COMBINAZIONE.includes(tipo))) return { combinazione: null, messaggio: AVVISO_COMBINAZIONE };
  return { combinazione: { nome, tipo }, messaggio: null };
}

// `cifre(-12.5)` stampa «-12,50» (due decimali sotto 100, `legame.js:49-52`): gli zeri in coda
// dopo la virgola cadono, come fa `conciso` in `pannello.js:16`, e il meno diventa tipografico.
const num = (v) => cifre(v).replace(/(,\d*?)0+$/, "$1").replace(/,$/, "").replace("-", "−");

// Precondizione: un carico già passato da `normalizzaCarico` (chiavi complete); `direzione`
// si difende da sola perché un file scritto a mano può ometterla.
/** Una riga per persona, unità su ogni numero, e le componenti nulle taciute. */
export function testoCarico(c) {
  if (c.tipo === "nodale") {
    const p = COMPONENTI.filter((k) => c[k]).map((k) => `${k} ${num(c[k])} ${k[0] === "F" ? "N" : "N·mm"}`);
    return `nodo ${c.nodo} · ${p.length ? p.join(" · ") : "nullo"}`;
  }
  if (c.tipo === "distribuito") return `asta ${c.asta} · q ${num(c.q)} N/mm lungo ${(c.direzione ?? "z").replace("_", " ")}`;
  if (c.tipo === "gravita") {
    const p = ["x", "y", "z"].filter((k) => c[`fattore_${k}`]).map((k) => `${k} ×${num(c[`fattore_${k}`])}`);
    return `gravità · ${p.length ? p.join(" · ") : "nulla"}`;
  }
  if (c.tipo === "cedimento") {
    const p = GRADI_CEDIMENTO.filter((k) => c[k] !== null && c[k] !== undefined).map((k) => `${k} ${num(c[k])} ${k[0] === "u" ? "mm" : "rad"}`);
    return `cedimento nodo ${c.nodo} · ${p.length ? p.join(" · ") : "nessuna componente"}`;
  }
  if (c.tipo === "termico") {
    const g = c.gradiente === null || c.gradiente === undefined ? "" : ` · gradiente ${num(c.gradiente)} °C/mm`;
    return `termico asta ${c.asta} · ΔT ${num(c.dT_uniforme)} °C${g}`;
  }
  // Un tipo fuori da `TIPI_CARICO` è un difetto del programma, non un testo sbagliato da
  // mostrare a una persona: si solleva, come `valoriDaMostrare` (`legame.js:41`). Senza
  // questo, un typo usciva stampato come un carico termico con l'asta «undefined».
  throw new Error(`tipo di carico sconosciuto: ${c?.tipo}`);
}

/** Il versore nel piano x–z lungo cui spinge un distribuito, o `null` se è fuori dal piano. */
function versoDistribuito(c, i, j) {
  const segno = Math.sign(c.q);
  if (c.direzione === "x") return { x: segno, z: 0 };
  if (c.direzione === "z") return { x: 0, z: segno };
  if (c.direzione === "locale_z") {
    const L = Math.hypot(j.x - i.x, j.z - i.z) || 1;
    // La normale sinistra al tratto i→j: per una trave da sinistra a destra è «in su».
    return { x: (-(j.z - i.z) / L) * segno, z: ((j.x - i.x) / L) * segno };
  }
  return null;  // y e locale_y: fuori dal piano di lavoro
}

/** Le frecce di un'azione, in mm, lunghe `lunghezza`: la punta sta dove il carico agisce.
 *  Chi non ha una geometria nel piano (gravità, cedimento, termico, momenti, `y`) non ne ha. */
export function frecceDeiCarichi(m, azione, lunghezza) {
  const frecce = [];
  for (const c of azione?.carichi ?? []) {
    if (c.tipo === "nodale") {
      const n = nodo(m, c.nodo);
      const modulo = Math.hypot(c.Fx ?? 0, c.Fz ?? 0);
      if (!n || modulo === 0) continue;
      const ux = (c.Fx ?? 0) / modulo, uz = (c.Fz ?? 0) / modulo;
      const forze = ["Fx", "Fz"].filter((k) => c[k]).map((k) => `${k} ${num(c[k])} N`).join(" · ");
      frecce.push({ da: { x: n.x - ux * lunghezza, z: n.z - uz * lunghezza }, a: { x: n.x, z: n.z }, testo: forze });
    } else if (c.tipo === "distribuito") {
      const a = asta(m, c.asta);
      const i = a && nodo(m, a.nodo_i), j = a && nodo(m, a.nodo_j);
      if (!i || !j || !c.q) continue;
      const verso = versoDistribuito(c, i, j);
      if (!verso) continue;
      for (const t of [0.25, 0.5, 0.75]) {
        const p = { x: i.x + (j.x - i.x) * t, z: i.z + (j.z - i.z) * t };
        frecce.push({ da: { x: p.x - verso.x * lunghezza, z: p.z - verso.z * lunghezza }, a: p,
                      testo: t === 0.5 ? `q ${num(c.q)} N/mm` : null });
      }
    }
  }
  return frecce;
}
