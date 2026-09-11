// La scheda «Confronto» (story 56-57, 61): telaio NOVA ↔ solido CalculiX ↔ CSV Abaqus, per caso e
// grandezza, con scarto, classe a tre valori e bias atteso. Il server fa tutto il calcolo
// (`POST /api/confronto`); qui stanno i percorsi, la mappa dei casi, e la tabella da mostrare.
import { conciso, stampaNumero } from "./numeri.js";
import { versioneBreve } from "./corsa.js";
import { chiediJson } from "./file.js";

// I nomi fissi dei file dei risultati (`nova/corsa.py:23`, `nova/ccx.py:44`): il server risponde
// con la **cartella** della corsa, e il file dentro ha sempre questo nome.
export const NOME_RISULTATI = Object.freeze({ telaio: "risultati.nova.risultati.json", solido: "risultati_solido.json" });

export function percorsoRisultati(lavoro, tipo) {
  const cartella = lavoro?.cartella;
  return typeof cartella === "string" && cartella !== "" ? `${cartella}/${NOME_RISULTATI[tipo]}` : "";
}

/** I nodi alla quota massima: la selezione è una sola (`app.js`), e i «nodi in sommità» del
 *  confronto sono quelli del piano più alto — su un telaio piano, i due (o più) a z massima. */
export function nodiInSommita(m, tolleranza = 1) {
  const nodi = m?.nodi ?? [];
  if (nodi.length === 0) return [];
  const zMax = Math.max(...nodi.map((n) => n.z));
  return nodi.filter((n) => n.z >= zMax - tolleranza).map((n) => n.id).sort((a, b) => a - b);
}

export const casiCorsi = (lavoro) => lavoro?.fin?.risultati?.run?.casi ?? [];

const leggiNodi = (testo) => {
  const pezzi = String(testo ?? "").split(/[;,\s]+/).filter((p) => p !== "");
  const nodi = pezzi.map((p) => (/^\d+$/.test(p) ? Number(p) : NaN));
  if (nodi.some((n) => Number.isNaN(n))) throw new Error("nodi in sommità: scrivi gli id separati da «;»");
  return nodi;
};

export function mappaDalForm({ casi, nodi, assiScambiati }) {
  const mappa = {};
  for (const { caso, passo } of casi ?? []) {
    const p = String(passo ?? "").trim();
    if (p !== "") mappa[caso] = p;
  }
  const ids = leggiNodi(nodi);
  if (ids.length) mappa.nodi_sommita = ids;
  if (assiScambiati) mappa.assi = { x: "y", y: "x" };
  return mappa;
}

export function leggiMappaJson(testo) {
  const t = String(testo ?? "").trim();
  if (t === "") return {};
  let letto;
  try { letto = JSON.parse(t); } catch (e) { throw new Error(`mappa_casi: JSON non valido — ${e.message}`); }
  if (letto === null || typeof letto !== "object" || Array.isArray(letto)) {
    throw new Error("mappa_casi: JSON non valido — serve un oggetto {\"C1\": \"GRAVITA\", …}");
  }
  return letto;
}

export const PAROLA_CLASSE = Object.freeze({ concorde: "concorde", vicino: "vicino", lontano: "lontano", non_confrontabile: "non confrontabile" });

export const conAbaqus = (tabella) => (tabella?.righe ?? []).some((r) => r.abaqus != null || (r.classe_abaqus ?? "non_confrontabile") !== "non_confrontabile");

/** La didascalia sopra la tabella: dice se Abaqus è davvero appaiato ai casi, o solo chiesto
 *  (CSV caricato ma nessuna riga corrisponde) — l'utente ha premuto un bottone, merita di sapere
 *  perché la terza colonna non compare. */
export function testoDidascalia(tabella, { abaqusChiesto = false } = {}) {
  if (conAbaqus(tabella)) return "telaio ↔ solido ↔ Abaqus";
  return abaqusChiesto ? "telaio ↔ solido · il CSV Abaqus non ha righe appaiate ai casi" : "telaio ↔ solido";
}

/** Bias e ragioni fuori dalle celle (data-ink, `07-ux-modellatore.md:105`): una nota per testo
 *  distinto, nell'ordine in cui compare, e per ogni riga la lista dei suoi numeri. */
export function noteDellaTabella(tabella) {
  const note = [], indice = new Map(), perRiga = [];
  const numero = (testo) => {
    if (!indice.has(testo)) { indice.set(testo, note.length + 1); note.push({ n: note.length + 1, testo }); }
    return indice.get(testo);
  };
  for (const r of tabella?.righe ?? []) {
    const mie = [];
    if (r.bias_atteso) mie.push(numero(r.bias_atteso));
    if (r.ragione) mie.push(numero(r.ragione));
    perRiga.push(mie);
  }
  return { note, perRiga };
}

const valore = (v) => (v == null ? "—" : conciso(v));
const percento = (v) => (v == null ? "—" : `${stampaNumero(v, { decimali: 1 })} %`);
const parola = (classe) => PAROLA_CLASSE[classe] ?? String(classe ?? "—");
const nonConfrontabile = (r) => r.classe_solido === "non_confrontabile" && r.classe_abaqus === "non_confrontabile";

export function righeDaMostrare(tabella) {
  const { perRiga } = noteDellaTabella(tabella);
  return (tabella?.righe ?? []).map((r, k) => ({
    grandezza: r.grandezza, caso: r.caso ?? "—", unita: r.unita,
    telaio: valore(r.telaio), solido: valore(r.solido), abaqus: valore(r.abaqus),
    scartoSolido: percento(r.scarto_solido_pct), scartoAbaqus: percento(r.scarto_abaqus_pct),
    classeSolido: parola(r.classe_solido), classeAbaqus: parola(r.classe_abaqus),
    attenuata: nonConfrontabile(r), note: perRiga[k],
  }));
}

export function testoConteggio(tabella) {
  const righe = tabella?.righe ?? [];
  const avvertenza = tabella?.avvertenza ?? "";
  if (righe.length === 0) return `nessuna riga · ${avvertenza}`;
  const n = righe.filter(nonConfrontabile).length;
  return `${righe.length} ${righe.length === 1 ? "riga" : "righe"} · ${n} non confrontabil${n === 1 ? "e" : "i"} · ${avvertenza}`;
}

const dataItaliana = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(String(iso ?? ""));
  return m ? `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}` : "n/d";
};

export function testoProvenienza(p) {
  if (!p) return "";
  const nd = (v) => (v == null || v === "" ? "n/d" : String(v));
  return [`commit ${nd(p.commit_nova)}`, `run telaio ${nd(p.run_id_telaio)}`, `run solido ${nd(p.run_id_solido)}`,
          `OpenSees ${nd(versioneBreve(p.versione_opensees))}`, `CalculiX ${nd(versioneBreve(p.versione_calculix))}`,
          dataItaliana(p.data)].join(" · ");
}
