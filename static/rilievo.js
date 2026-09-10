// Il rendiconto dell'importazione: ciò che il rilievo ha dato e ciò che ha bocciato, tradotto
// in testi per una persona. Puro. Vive **accanto** al modello, non dentro (spec v1, «Importatore
// dal prior»; brief 2026-09-07 §3): non entra nel file, non entra nella cronologia.

import { cifre, conciso, stampaNumero, senzaZeriInCoda } from "./numeri.js";

const manca = (v) => v === null || v === undefined || !Number.isFinite(v);
const num = (v) => (manca(v) ? "—" : conciso(v));
// Le scartate: due decimali al massimo, senza zeri in coda. Nella stessa colonna «1,19» sta
// sopra «0,57», e `conciso` (quattro decimali sotto 1) ci metteva «0,5717» — stessa unità, due
// grafie. I millimetri delle giunzioni restano a `conciso`: «154 mm», non «153,6».
const misura = (v) => (manca(v) ? "—" : senzaZeriInCoda(stampaNumero(v, { decimali: 2, migliaia: true })));

/** La risposta di `POST /api/importa` nello stato che l'interfaccia tiene. Liste sempre
 *  presenti: un rendiconto senza `scartate` è un rendiconto con zero scartate, non un errore. */
export function daRisposta(risposta, percorso) {
  const r = risposta ?? {};
  const p = typeof percorso === "string" ? percorso : "";
  return {
    percorso: p,
    nome: p.slice(p.lastIndexOf("/") + 1),
    resoconto: r.resoconto ?? {},
    scartate: r.scartate ?? [],
    giunzioni: r.giunzioni ?? [],
    proposte: r.proposte_vincoli ?? [],
    mancano: r.mancano ?? [],
  };
}

/** Una riga per controllo fallito, com'è nel prior (P1: il valore col suo contraddittore). */
export function righeScartate(rilievo) {
  return rilievo.scartate.map((s) => ({
    titolo: `regione ${s.regione ?? "—"} · ${s.punti == null ? "—" : cifre(s.punti)} punti · ${s.controllo ?? "—"}`,
    valore: `${misura(s.valore)} contro soglia ${misura(s.soglia)}${s.unita && s.unita !== "-" ? ` ${s.unita}` : ""}`,
    spiegazione: s.spiegazione || "—",
  }));
}

export const giunzioneDelNodo = (rilievo, id) => rilievo.giunzioni.find((g) => g.nodo === id) ?? null;
export const propostaPerNodo = (rilievo, id) => rilievo.proposte.find((p) => p.nodo === id)?.vincolo ?? null;

/** Le proposte ancora da decidere: il nodo esiste e non ha un vincolo **dichiarato** — libero
 *  dichiarato è dichiarato (`nova/modello.py`: «una scelta dell'utente, non una dimenticanza»). */
export function proposteAperte(rilievo, m) {
  return rilievo.proposte.filter((p) => {
    const n = m.nodi.find((k) => k.id === p.nodo);
    return n && (n.vincolo === null || n.vincolo === undefined);
  });
}

export const testoMancano = (mancano) => (mancano.length ? mancano.join(", ") : "niente: il rilievo ha dato tutto");

export function riassunto(rilievo) {
  const r = rilievo.resoconto;
  const corpo = r.membrature ? `${r.membrature} membrature → ${r.aste ?? 0} aste, ${r.nodi ?? 0} nodi` : "nessuna membratura";
  const mancano = rilievo.mancano.length ? ` · mancano: ${rilievo.mancano.join(", ")}` : "";
  return `${rilievo.nome} · ${corpo} · ${r.scartate ?? 0} scartate${mancano}`;
}

export function etichettaStoria(rilievo) {
  const r = rilievo.resoconto;
  const corpo = r.membrature ? `${r.aste ?? 0} aste` : "nessuna membratura";
  return `importato ${rilievo.nome}: ${corpo}, ${r.scartate ?? 0} regioni scartate`;
}

export const testoGiunzione = (g) =>
  `nodo ${g.nodo} · scostamento ${num(g.scostamento_nodo)} mm · proiezione ${num(g.distanza_proiezione)} mm · membratura ${g.cede} cede a ${g.resta}`;
