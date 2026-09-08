// Un riduttore per comando: `(modello, argomenti) → modello nuovo`. Nessuno di questi
// tocca il modello che riceve, perché la cronologia tiene gli snapshot precedenti e un
// riduttore che muta cancellerebbe il passato invece di aggiungerci un presente.
//
// Tre delle cose che il Check Model rifiuterebbe dopo (`nova/check.py`) sono già rifiutate
// qui: nodi coincidenti, aste a lunghezza zero, riferimenti a oggetti inesistenti.
// Fermarle qui costa un messaggio; fermarle là costa una corsa. Le altre — `aste_duplicate`,
// `nodo_su_asta`, i vincoli, le unità — restano al Check Model della giornata 12: rifarle
// qui vorrebbe dire tenere due oracoli allineati a mano, ed è così che divergono.

import { prossimoId, nodo, asteDelNodo, nodoVicino, TOLLERANZA_MM } from "./modello.js";

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
  return n;
}
