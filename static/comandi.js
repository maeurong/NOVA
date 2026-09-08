// Un riduttore per comando: `(modello, argomenti) → modello nuovo`. Nessuno di questi
// tocca il modello che riceve, perché la cronologia tiene gli snapshot precedenti e un
// riduttore che muta cancellerebbe il passato invece di aggiungerci un presente.
//
// Tre delle cose che il Check Model rifiuterebbe dopo (`nova/check.py`) sono già rifiutate
// qui: nodi coincidenti, aste a lunghezza zero, riferimenti a oggetti inesistenti.
// Fermarle qui costa un messaggio; fermarle là costa una corsa. Le altre — `aste_duplicate`,
// `nodo_su_asta`, i vincoli, le unità — restano al Check Model della giornata 12: rifarle
// qui vorrebbe dire tenere due oracoli allineati a mano, ed è così che divergono.

import { prossimoId, nodo, asteDelNodo, nodoVicino, TOLLERANZA_MM, sezione, materiale, asteDellaSezione, sezioniDelMateriale } from "./modello.js";
import { GRADI } from "./vincoli.js";
import { LATI, VESTI, geometriaImpossibile } from "./sezione.js";
import { stampaNumero } from "./numeri.js";

/** L'errore che l'interfaccia sa mostrare. Tutto il resto è un difetto del programma. */
export class ErroreComando extends Error {
  constructor(messaggio, rimedio = null) {
    super(messaggio);
    this.name = "ErroreComando";
    this.rimedio = rimedio;
  }
}

const numero = (v, nome) => {
  if (!Number.isFinite(v)) throw new ErroreComando(`${nome} deve essere un numero`, "scrivi un numero, con la virgola per i decimali");
  return v;
};

const copia = (m) => structuredClone(m);

export function creaNodo(m, { x, z, y = 0 }) {
  numero(x, "x"); numero(y, "y"); numero(z, "z");
  const esistente = nodoVicino(m, x, y, z);
  if (esistente) {
    throw new ErroreComando(`qui c'è già il nodo ${esistente.id}`, "sposta le coordinate di almeno un millimetro");
  }
  const n = copia(m);
  const id = prossimoId(n, "nodo");
  n.nodi.push({ id, nome: null, x, y, z });
  n.contatori.nodo = id;
  return n;
}

/** Estrusione: dal nodo `da`, per lo spostamento dato, nasce un'asta. Il nodo di arrivo si
 *  crea solo se là non c'è già niente: due nodi entro il millimetro sono nodi coincidenti,
 *  e il solutore li accetta senza dire nulla (`nova/check.py`, `nodi_coincidenti`). */
export function estrudi(m, { da, dx, dz, dy = 0, sezione = null }) {
  const partenza = nodo(m, da);
  if (!partenza) throw new ErroreComando(`il nodo ${da} non esiste`, "seleziona un nodo e ripeti");
  numero(dx, "dx"); numero(dy, "dy"); numero(dz, "dz");
  if (Math.hypot(dx, dy, dz) < TOLLERANZA_MM) {
    throw new ErroreComando("l'asta sarebbe lunga zero", "dai una lunghezza di almeno un millimetro");
  }
  const x = partenza.x + dx, y = partenza.y + dy, z = partenza.z + dz;
  let n = copia(m);
  const arrivo = nodoVicino(n, x, y, z);
  let idArrivo;
  if (arrivo) {
    idArrivo = arrivo.id;
  } else {
    idArrivo = prossimoId(n, "nodo");
    n.nodi.push({ id: idArrivo, nome: null, x, y, z });
    n.contatori.nodo = idArrivo;
  }
  const idAsta = prossimoId(n, "asta");
  // `sezione: null` è lecito finché il catalogo delle sezioni non esiste (giornata 11):
  // il modello vive in memoria, non va su disco, e il Check Model lo direbbe comunque.
  n.aste.push({ id: idAsta, nome: null, nodo_i: partenza.id, nodo_j: idArrivo, sezione });
  n.contatori.asta = idAsta;
  return n;
}

export function spostaNodo(m, { id, x, z, y }) {
  const vecchio = nodo(m, id);
  if (!vecchio) throw new ErroreComando(`il nodo ${id} non esiste`, "seleziona un nodo e ripeti");
  const nx = x === undefined ? vecchio.x : numero(x, "x");
  const ny = y === undefined ? vecchio.y : numero(y, "y");
  const nz = z === undefined ? vecchio.z : numero(z, "z");
  const altro = m.nodi.find((n) => n.id !== id && Math.hypot(n.x - nx, n.y - ny, n.z - nz) < TOLLERANZA_MM);
  if (altro) throw new ErroreComando(`là c'è già il nodo ${altro.id}`, "scegli un'altra quota");
  const n = copia(m);
  const bersaglio = n.nodi.find((k) => k.id === id);
  bersaglio.x = nx; bersaglio.y = ny; bersaglio.z = nz;
  marcaModificata(bersaglio);
  return n;  // le aste referenziano gli identificatori: seguono da sole
}

/** Elimina un nodo e tutto ciò che lo nomina: le aste che lo toccano, i carichi su quel
 *  nodo e i carichi su quelle aste. Un riferimento orfano è esattamente il difetto che
 *  `nova/check.py` chiama `riferimenti`, e nessuno vuole scoprirlo alla corsa. */
export function eliminaNodo(m, { id }) {
  if (!nodo(m, id)) throw new ErroreComando(`il nodo ${id} non esiste`, "seleziona un nodo e ripeti");
  const asteVia = new Set(asteDelNodo(m, id).map((a) => a.id));
  const n = copia(m);
  n.nodi = n.nodi.filter((k) => k.id !== id);
  n.aste = n.aste.filter((a) => !asteVia.has(a.id));
  n.azioni = n.azioni.map((a) => ({
    ...a,
    carichi: (a.carichi ?? []).filter((c) => c.nodo !== id && !asteVia.has(c.asta)),
  }));
  return n;  // i contatori restano dov'erano: un identificatore eliminato non si riusa
}

const LISTE = { nodo: "nodi", asta: "aste", sezione: "sezioni", materiale: "materiali" };

/** Il nome è libero e non tocca l'identità (story 12): due entità possono chiamarsi uguale,
 *  i riferimenti e i risultati continuano a viaggiare sull'identificatore. */
export function rinomina(m, { tipo, id, nome }) {
  const chiave = LISTE[tipo];
  if (chiave === undefined) throw new ErroreComando(`tipo sconosciuto: ${tipo}`);
  if (typeof nome !== "string" || nome.trim() === "") {
    throw new ErroreComando("il nome non può essere vuoto", "scrivi un nome, o lascia stare");
  }
  const n = copia(m);
  const bersaglio = n[chiave].find((e) => e.id === id);
  if (!bersaglio) throw new ErroreComando(`${tipo} ${id} non esiste`, "seleziona un nodo o un'asta che esista e ripeti");
  bersaglio.nome = nome.trim();
  marcaModificata(bersaglio);
  return n;
}

/** L'asta fra due nodi già scelti. Non passa da `estrudi`: gli identificatori sono noti,
 *  e calcolare uno spostamento per poi sperare che l'arrivo ricada entro la tolleranza
 *  sarebbe un giro in più con un modo in più di sbagliare. */
export function collega(m, { da, a, sezione = null }) {
  if (da === a) throw new ErroreComando("un'asta da un nodo a sé stesso è lunga zero",
                                        "scegli due nodi diversi");
  for (const id of [da, a]) {
    if (!nodo(m, id)) throw new ErroreComando(`il nodo ${id} non esiste`, "scegli un nodo che c'è");
  }
  // Due nodi già uniti sono quasi sempre un secondo clic per sbaglio, e un'asta duplicata
  // il solutore la accetta senza dire niente: la vede solo il Check Model, alla corsa.
  const gia = m.aste.find((k) => (k.nodo_i === da && k.nodo_j === a) || (k.nodo_i === a && k.nodo_j === da));
  if (gia) throw new ErroreComando(`i nodi ${da} e ${a} sono già uniti dall'asta ${gia.id}`,
                                   "scegli un'altra coppia");
  const n = copia(m);
  const id = prossimoId(n, "asta");
  n.aste.push({ id, nome: null, nodo_i: da, nodo_j: a, sezione });
  n.contatori.asta = id;
  return n;
}

/** Il vincolo di un nodo: i sei gradi, o `null` per liberarlo. Si tengono **solo** i sei
 *  gradi noti — un campo in più diventerebbe un rifiuto di `/api/modello/salva`, che ha
 *  `extra="forbid"` (`nova/modello.py:39`). */
export function impostaVincolo(m, { id, vincolo }) {
  if (!nodo(m, id)) throw new ErroreComando(`il nodo ${id} non esiste`, "seleziona un nodo e ripeti");
  const n = copia(m);
  const bersaglio = n.nodi.find((k) => k.id === id);
  if (vincolo === null || vincolo === undefined) delete bersaglio.vincolo;
  else bersaglio.vincolo = Object.fromEntries(GRADI.map((g) => [g, Boolean(vincolo[g])]));
  marcaModificata(bersaglio);
  return n;
}

// --- story 55: l'editing non cancella l'origine, la marca -------------------------------
/** Una riga in ogni riduttore che modifica un'entità: se viene dal rilievo, ora è anche
 *  dell'utente. Senza `origine` non si inventa niente (`nova/modello.py:43-49`). */
const marcaModificata = (e) => { if (e.origine) e.origine = { ...e.origine, modificata: true }; };

// --- sezioni ------------------------------------------------------------------------------
export const DEFAULT_CALCESTRUZZO = "C25/30";
export const DEFAULT_ACCIAIO = "B450C";
const TIPI_MATERIALE = ["calcestruzzo", "acciaio"];

const positivo = (v, nome) => {
  numero(v, nome);
  if (v <= 0) throw new ErroreComando(`${nome} deve essere maggiore di zero`, "scrivi una misura in millimetri");
  return v;
};
const materialeDiTipo = (m, id, tipo) => {
  const k = materiale(m, id);
  if (!k) throw new ErroreComando(`il materiale ${id} non esiste`, "premi C e scrivi una classe, per esempio C25/30");
  if (k.tipo !== tipo) throw new ErroreComando(`il materiale ${id} è ${k.tipo}, non ${tipo}`, `scegli un ${tipo}`);
  return k;
};
const sezioneEsistente = (m, id) => {
  const s = sezione(m, id);
  if (!s) throw new ErroreComando(`la sezione ${id} non esiste`, "seleziona una sezione dall'albero e ripeti");
  return s;
};
/** La geometria si giudica **dopo** la modifica, sul risultato: è quello che il deck vedrà. */
const geometriaAccettabile = (s) => {
  const motivo = geometriaImpossibile(s);
  if (motivo) throw new ErroreComando(motivo, "riduci il copriferro, il diametro o il numero delle barre");
};
const copriferroValido = (v) => {
  numero(v, "copriferro");
  if (v < 0) throw new ErroreComando("il copriferro non può essere negativo", "scrivi zero o una misura");
  return v;
};

export function creaSezione(m, { nome = null, b, h, calcestruzzo, acciaio, copriferro = 30 }) {
  positivo(b, "b"); positivo(h, "h"); copriferroValido(copriferro);
  materialeDiTipo(m, calcestruzzo, "calcestruzzo"); materialeDiTipo(m, acciaio, "acciaio");
  const n = copia(m);
  const id = prossimoId(n, "sezione");
  const mm = (v) => stampaNumero(v, { decimali: 0, migliaia: true });
  n.sezioni.push({ id, nome: nome ?? `${mm(b)} × ${mm(h)}`, tipo: "rettangolare", b, h, calcestruzzo, acciaio, copriferro, file: [], staffe: null });
  n.contatori.sezione = id;
  return n;
}

export function modificaSezione(m, { id, ...campi }) {
  sezioneEsistente(m, id);
  const n = copia(m);
  const s = n.sezioni.find((k) => k.id === id);
  if ("b" in campi) s.b = positivo(campi.b, "b");
  if ("h" in campi) s.h = positivo(campi.h, "h");
  if ("copriferro" in campi) s.copriferro = copriferroValido(campi.copriferro);
  if ("calcestruzzo" in campi) { materialeDiTipo(n, campi.calcestruzzo, "calcestruzzo"); s.calcestruzzo = campi.calcestruzzo; }
  if ("acciaio" in campi) { materialeDiTipo(n, campi.acciaio, "acciaio"); s.acciaio = campi.acciaio; }
  if ("staffe" in campi) {
    if (campi.staffe === null) s.staffe = null;
    else {
      const { diametro, passo, bracci = 2 } = campi.staffe;
      positivo(diametro, "diametro delle staffe"); positivo(passo, "passo delle staffe");
      if (!Number.isInteger(bracci) || bracci < 2) throw new ErroreComando("i bracci delle staffe sono almeno due", "scrivi 2 o più");
      s.staffe = { diametro, passo, bracci };
    }
  }
  if ("riduzione" in campi) {
    if (campi.riduzione === null) delete s.riduzione;
    else {
      const r = Object.fromEntries(LATI.map((l) => [l, campi.riduzione[l] ?? 0]));
      for (const l of LATI) { numero(r[l], `riduzione ${l}`); if (r[l] < 0) throw new ErroreComando(`la riduzione ${l} non può essere negativa`, "millimetri mancanti, zero o più"); }
      s.riduzione = r;
    }
  }
  geometriaAccettabile(s);
  marcaModificata(s);
  return n;
}

export function impostaFila(m, { id, lato, n: quante, diametro }) {
  sezioneEsistente(m, id);
  if (!LATI.includes(lato)) throw new ErroreComando(`lato «${lato}» sconosciuto`, `i lati sono ${LATI.join(", ")}`);
  if (!Number.isInteger(quante) || quante < 0) throw new ErroreComando("il numero di barre è un intero, zero o più", "zero toglie la fila");
  const n = copia(m);
  const s = n.sezioni.find((k) => k.id === id);
  s.file = s.file.filter((f) => f.lato !== lato);
  if (quante > 0) { positivo(diametro, "diametro"); s.file.push({ lato, n: quante, diametro }); }
  s.file.sort((a, b) => LATI.indexOf(a.lato) - LATI.indexOf(b.lato));
  geometriaAccettabile(s);
  marcaModificata(s);
  return n;
}

export function assegnaSezione(m, { asta, sezione: idSezione }) {
  const a = m.aste.find((k) => k.id === asta);
  if (!a) throw new ErroreComando(`l'asta ${asta} non esiste`, "seleziona un'asta e ripeti");
  if (idSezione !== null) sezioneEsistente(m, idSezione);
  const n = copia(m);
  const b = n.aste.find((k) => k.id === asta);
  b.sezione = idSezione;
  marcaModificata(b);
  return n;
}

export function eliminaSezione(m, { id }) {
  sezioneEsistente(m, id);
  const usata = asteDellaSezione(m, id).map((a) => a.id);
  if (usata.length) throw new ErroreComando(`la sezione ${id} la usano le aste ${usata.join(", ")}`, "assegna loro un'altra sezione, poi elimina");
  const n = copia(m);
  n.sezioni = n.sezioni.filter((s) => s.id !== id);
  return n;  // i contatori restano: un identificatore eliminato non si riusa
}

// --- materiali ----------------------------------------------------------------------------
export function creaMateriale(m, { tipo, classe, nome = null, classi = null }) {
  if (!TIPI_MATERIALE.includes(tipo)) throw new ErroreComando(`tipo «${tipo}» sconosciuto`, "calcestruzzo o acciaio");
  const c = String(classe ?? "").trim();
  if (c === "") throw new ErroreComando("la classe non può essere vuota", "per esempio C25/30 o B450C");
  if (classi && !classi.some((k) => k.toUpperCase() === c.toUpperCase())) {
    throw new ErroreComando(`classe «${c}» non a catalogo`, `le classi sono ${classi.join(", ")}`);
  }
  const n = copia(m);
  const id = prossimoId(n, "materiale");
  n.materiali.push({ id, nome: nome ?? c, tipo, classe: c, valori: {}, personalizzato: false });
  n.contatori.materiale = id;
  return n;
}

export function modificaMateriale(m, { id, ...campi }) {
  if (!materiale(m, id)) throw new ErroreComando(`il materiale ${id} non esiste`, "seleziona un materiale dall'albero");
  const n = copia(m);
  const k = n.materiali.find((x) => x.id === id);
  if ("classe" in campi) { const c = String(campi.classe ?? "").trim(); if (c === "") throw new ErroreComando("la classe non può essere vuota"); k.classe = c; }
  if ("personalizzato" in campi) k.personalizzato = Boolean(campi.personalizzato);
  if ("valori" in campi) {
    for (const [chiave, v] of Object.entries(campi.valori ?? {})) {
      if (v === null) delete k.valori[chiave];
      else { numero(v, chiave); k.valori[chiave] = v; }
    }
  }
  if ("legame" in campi) k.legame = { ...(k.legame ?? {}), ...campi.legame };
  marcaModificata(k);
  return n;
}

export function eliminaMateriale(m, { id }) {
  if (!materiale(m, id)) throw new ErroreComando(`il materiale ${id} non esiste`);
  const usato = sezioniDelMateriale(m, id).map((s) => s.id);
  if (usato.length) throw new ErroreComando(`il materiale ${id} lo usano le sezioni ${usato.join(", ")}`, "cambia loro il materiale, poi elimina");
  const n = copia(m);
  n.materiali = n.materiali.filter((k) => k.id !== id);
  return n;
}

/** I due materiali che una sezione pretende, se mancano. La prima sezione di un modello
 *  disegnato da zero li porta con sé (decisione 2 del piano): la Storia dice quali. */
export function materialiDiDefault(m) {
  const aggiunti = [];
  let n = m;
  for (const [tipo, classe] of [["calcestruzzo", DEFAULT_CALCESTRUZZO], ["acciaio", DEFAULT_ACCIAIO]]) {
    if (!n.materiali.some((k) => k.tipo === tipo)) { n = creaMateriale(n, { tipo, classe }); aggiunti.push(classe); }
  }
  return { modello: n, aggiunti };
}

// --- danno e veste ------------------------------------------------------------------------
export function impostaDanno(m, { asta, danno }) {
  if (!m.aste.some((k) => k.id === asta)) throw new ErroreComando(`l'asta ${asta} non esiste`, "seleziona un'asta e ripeti");
  const n = copia(m);
  const a = n.aste.find((k) => k.id === asta);
  if (danno === null || danno === undefined) delete a.danno;
  else {
    const { fattore_E, fattore_fc, nota = "" } = danno;
    for (const [v, nome] of [[fattore_E, "fattore su E"], [fattore_fc, "fattore su fc"]]) {
      numero(v, nome);
      if (v <= 0 || v > 1) throw new ErroreComando(`${nome} deve stare fra 0 escluso e 1 compreso`, "1 vuol dire integro, 0,8 vuol dire un quinto in meno");
    }
    a.danno = { fattore_E, fattore_fc, nota: String(nota) };
  }
  marcaModificata(a);
  return n;
}

export function impostaVeste(m, { veste }) {
  if (!VESTI.includes(veste)) throw new ErroreComando(`veste «${veste}» sconosciuta`, `le vesti sono ${VESTI.join(", ")}`);
  const n = copia(m);
  n.impostazioni_analisi = { ...(n.impostazioni_analisi ?? { fibre: 10 }), veste };
  return n;
}
