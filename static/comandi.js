// Un riduttore per comando: `(modello, argomenti) → modello nuovo`. Nessuno di questi
// tocca il modello che riceve, perché la cronologia tiene gli snapshot precedenti e un
// riduttore che muta cancellerebbe il passato invece di aggiungerci un presente.
//
// Tre delle cose che il Check Model rifiuterebbe dopo (`nova/check.py`) sono già rifiutate
// qui: nodi coincidenti, aste a lunghezza zero, riferimenti a oggetti inesistenti.
// Fermarle qui costa un messaggio; fermarle là costa una corsa. Le altre — `aste_duplicate`,
// `nodo_su_asta`, i vincoli, le unità — restano al Check Model della giornata 12: rifarle
// qui vorrebbe dire tenere due oracoli allineati a mano, ed è così che divergono.

import { prossimoId, nodo, asta, asteDelNodo, nodoVicino, TOLLERANZA_MM, sezione, materiale, asteDellaSezione, sezioniDelMateriale,
         azione, combinazione, combinazioniDellAzione, analisiCheUsano, analisiConMassaDa, nomeCaso } from "./modello.js";
import { TIPI_COMBINAZIONE, NATURE, normalizzaCarico } from "./carichi.js";
import { GRADI } from "./vincoli.js";
import { LATI, VESTI, geometriaImpossibile } from "./sezione.js";
import { millimetri } from "./numeri.js";

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

// --- story 55: l'editing non cancella l'origine, la marca -------------------------------
/** Una riga in ogni riduttore che modifica un'entità: se viene dal rilievo, ora è anche
 *  dell'utente. Senza `origine` non si inventa niente (`nova/modello.py:43-49`). */
const marcaModificata = (e) => { if (e.origine) e.origine = { ...e.origine, modificata: true }; };

// --- P4: un comando che non cambia niente non è un comando --------------------------------
/** L'entità dopo la modifica è identica a com'era prima (`docs/ricerca/07-ux-modellatore.md:152`).
 *  Chi risponde `false` restituisce **il modello ricevuto**, per riferimento: `applica`
 *  (`cronologia.js`) legge quella identità e non spinge lo snapshot. Il confronto va fatto
 *  **prima** di `marcaModificata`, che è essa stessa una modifica.
 *  ponytail: `JSON.stringify` e non un confronto profondo — sono oggetti di soli dati, e la
 *  copia viene da `structuredClone`, che conserva l'ordine delle chiavi. Un ordine diverso
 *  (un modello riletto da un file scritto altrove) direbbe «cambiata» quando non lo è: è il
 *  verso innocuo, una voce in più nella Storia, che è ciò che succedeva a ogni comando. */
const cambiata = (prima, dopo) => JSON.stringify(prima) !== JSON.stringify(dopo);

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
  if (!cambiata(vecchio, bersaglio)) return m;
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

const LISTE = { nodo: "nodi", asta: "aste", sezione: "sezioni", materiale: "materiali",
                azione: "azioni", combinazione: "combinazioni" };

/** Il nome è libero e non tocca l'identità (story 12): due entità possono chiamarsi uguale,
 *  i riferimenti e i risultati continuano a viaggiare sull'identificatore. */
export function rinomina(m, { tipo, id, nome }) {
  const chiave = LISTE[tipo];
  if (chiave === undefined) throw new ErroreComando(`tipo sconosciuto: ${tipo}`);
  if (typeof nome !== "string" || nome.trim() === "") {
    throw new ErroreComando("il nome non può essere vuoto", "scrivi un nome, o lascia stare");
  }
  const vecchio = m[chiave].find((e) => e.id === id);
  if (!vecchio) throw new ErroreComando(`${tipo} ${id} non esiste`, "seleziona qualcosa che esista e ripeti");
  const n = copia(m);
  const bersaglio = n[chiave].find((e) => e.id === id);
  bersaglio.nome = nome.trim();
  if (!cambiata(vecchio, bersaglio)) return m;
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
  const vecchio = nodo(m, id);
  if (!vecchio) throw new ErroreComando(`il nodo ${id} non esiste`, "seleziona un nodo e ripeti");
  const n = copia(m);
  const bersaglio = n.nodi.find((k) => k.id === id);
  if (vincolo === null || vincolo === undefined) delete bersaglio.vincolo;
  else bersaglio.vincolo = Object.fromEntries(GRADI.map((g) => [g, Boolean(vincolo[g])]));
  // La preimpostazione già premuta è il caso di tutti i giorni: senza questa riga ogni clic
  // su «incastro» su un nodo già incastrato scriveva una voce nella Storia.
  if (!cambiata(vecchio, bersaglio)) return m;
  marcaModificata(bersaglio);
  return n;
}

// --- sezioni ------------------------------------------------------------------------------
export const DEFAULT_CALCESTRUZZO = "C25/30";
export const DEFAULT_ACCIAIO = "B450C";
const TIPI_MATERIALE = ["calcestruzzo", "acciaio"];
/** Le chiavi di `Legame` (`nova/modello.py:164-186`), `lambda` compresa: è l'alias JSON di
 *  `lambda_`. `Legame` ha `extra="forbid"`, quindi una chiave inventata qui non è un campo
 *  in più, è un rifiuto di `/api/modello/salva`. Nota: il «legame» di `static/legame.js` è
 *  un'altra cosa — là sono i punti della curva, qui i parametri che la governano. */
const CHIAVI_LEGAME = ["confinamento", "epsU_copriferro", "epsU_nucleo", "lambda", "fpcu_su_fpc",
                       "Es", "fym", "b", "R0", "cR1", "cR2"];
/** Lo stesso pattern di `nova/modello.py:196`, che non è una convenzione: `deck.py` scrive
 *  la classe in un commento Tcl, e `\n` `{` `}` là dentro sono un comando. */
const FORMA_CLASSE = /^[A-Za-z0-9 /_.-]+$/;
const classeValida = (v) => {
  const c = String(v ?? "").trim();
  if (c === "") throw new ErroreComando("la classe non può essere vuota", "per esempio C25/30 o B450C");
  if (!FORMA_CLASSE.test(c)) throw new ErroreComando("la classe può avere solo lettere, cifre, spazi e / _ . -", "per esempio C25/30 o B450C");
  return c;
};

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
  // `rinomina` rifiuta il nome vuoto; qui vuoto vuol dire «non me ne curo»: il default.
  const dato = typeof nome === "string" ? nome.trim() : "";
  n.sezioni.push({ id, nome: dato || `${millimetri(b)} × ${millimetri(h)}`, tipo: "rettangolare", b, h, calcestruzzo, acciaio, copriferro, file: [], staffe: null });
  n.contatori.sezione = id;
  return n;
}

export function modificaSezione(m, { id, ...campi }) {
  const vecchia = sezioneEsistente(m, id);
  const n = copia(m);
  const s = n.sezioni.find((k) => k.id === id);
  if ("b" in campi) s.b = positivo(campi.b, "b");
  if ("h" in campi) s.h = positivo(campi.h, "h");
  if ("copriferro" in campi) s.copriferro = copriferroValido(campi.copriferro);
  if ("calcestruzzo" in campi) { materialeDiTipo(n, campi.calcestruzzo, "calcestruzzo"); s.calcestruzzo = campi.calcestruzzo; }
  if ("acciaio" in campi) { materialeDiTipo(n, campi.acciaio, "acciaio"); s.acciaio = campi.acciaio; }
  if ("staffe" in campi) {
    if (campi.staffe == null) s.staffe = null;  // `undefined` è «toglile», non un oggetto
    else {
      const { diametro, passo, bracci = 2 } = campi.staffe;
      positivo(diametro, "diametro delle staffe"); positivo(passo, "passo delle staffe");
      // Due rifiuti, non uno: «2,5» non è «almeno due», e chi legge «almeno due» davanti a
      // un 2,5 scritto da sé non capisce che il problema è la virgola.
      if (!Number.isInteger(bracci)) throw new ErroreComando("i bracci delle staffe devono essere un numero intero", "2, 3, 4 — non 2,5");
      if (bracci < 2) throw new ErroreComando("i bracci delle staffe sono almeno due", "scrivi 2 o più");
      s.staffe = { diametro, passo, bracci };
    }
  }
  if ("riduzione" in campi) {
    if (campi.riduzione == null) delete s.riduzione;
    else {
      const dato = campi.riduzione;
      if (typeof dato !== "object" || Array.isArray(dato)) {
        throw new ErroreComando("la riduzione è un oggetto con i lati", `i lati sono ${LATI.join(", ")}`);
      }
      // Una chiave fuori posto diventerebbe uno zero in silenzio, e la sezione resterebbe
      // intera senza che nessuno lo dica.
      for (const l of Object.keys(dato)) {
        if (!LATI.includes(l)) throw new ErroreComando(`la riduzione non ha un lato «${l}»`, `i lati sono ${LATI.join(", ")}`);
      }
      const r = Object.fromEntries(LATI.map((l) => [l, dato[l] ?? 0]));
      for (const l of LATI) { numero(r[l], `riduzione ${l}`); if (r[l] < 0) throw new ErroreComando(`la riduzione ${l} non può essere negativa`, "millimetri mancanti, zero o più"); }
      s.riduzione = r;
    }
  }
  geometriaAccettabile(s);
  if (!cambiata(vecchia, s)) return m;
  marcaModificata(s);
  return n;
}

export function impostaFila(m, { id, lato, n: quante, diametro }) {
  const vecchia = sezioneEsistente(m, id);
  if (!LATI.includes(lato)) throw new ErroreComando(`lato «${lato}» sconosciuto`, `i lati sono ${LATI.join(", ")}`);
  if (!Number.isInteger(quante) || quante < 0) throw new ErroreComando("il numero di barre è un intero, zero o più", "zero toglie la fila");
  const n = copia(m);
  const s = n.sezioni.find((k) => k.id === id);
  s.file = s.file.filter((f) => f.lato !== lato);
  if (quante > 0) { positivo(diametro, "diametro"); s.file.push({ lato, n: quante, diametro }); }
  s.file.sort((a, b) => LATI.indexOf(a.lato) - LATI.indexOf(b.lato));
  geometriaAccettabile(s);
  if (!cambiata(vecchia, s)) return m;
  marcaModificata(s);
  return n;
}

export function assegnaSezione(m, { asta, sezione: idSezione }) {
  const a = m.aste.find((k) => k.id === asta);
  if (!a) throw new ErroreComando(`l'asta ${asta} non esiste`, "seleziona un'asta e ripeti");
  if (idSezione === undefined) throw new ErroreComando("manca la sezione", "scegli una sezione, o null per toglierla");
  if (idSezione !== null) sezioneEsistente(m, idSezione);
  const n = copia(m);
  const b = n.aste.find((k) => k.id === asta);
  b.sezione = idSezione;
  if (!cambiata(a, b)) return m;
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
  const c = classeValida(classe);
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
  const vecchio = materiale(m, id);
  if (!vecchio) throw new ErroreComando(`il materiale ${id} non esiste`, "seleziona un materiale dall'albero");
  const n = copia(m);
  const k = n.materiali.find((x) => x.id === id);
  if ("classe" in campi) k.classe = classeValida(campi.classe);
  if ("personalizzato" in campi) k.personalizzato = Boolean(campi.personalizzato);
  if ("valori" in campi) {
    k.valori ??= {};  // un modello importato a mano può non portare il campo
    for (const [chiave, v] of Object.entries(campi.valori ?? {})) {
      if (v === null) delete k.valori[chiave];
      else { numero(v, chiave); k.valori[chiave] = v; }
    }
  }
  if ("legame" in campi) {
    for (const chiave of Object.keys(campi.legame ?? {})) {
      if (!CHIAVI_LEGAME.includes(chiave)) throw new ErroreComando(`il legame non ha una chiave «${chiave}»`, `le chiavi sono ${CHIAVI_LEGAME.join(", ")}`);
    }
    k.legame = { ...(k.legame ?? {}), ...campi.legame };
  }
  if (!cambiata(vecchio, k)) return m;
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
  let n = copia(m);  // mai la stessa referenza: due snapshot aliasati non sono cronologia
  for (const [tipo, classe] of [["calcestruzzo", DEFAULT_CALCESTRUZZO], ["acciaio", DEFAULT_ACCIAIO]]) {
    if (!n.materiali.some((k) => k.tipo === tipo)) { n = creaMateriale(n, { tipo, classe }); aggiunti.push(classe); }
  }
  return { modello: n, aggiunti };
}

// --- danno e veste ------------------------------------------------------------------------
export function impostaDanno(m, { asta, danno }) {
  const vecchia = m.aste.find((k) => k.id === asta);
  if (!vecchia) throw new ErroreComando(`l'asta ${asta} non esiste`, "seleziona un'asta e ripeti");
  const n = copia(m);
  const a = n.aste.find((k) => k.id === asta);
  if (danno === null || danno === undefined) delete a.danno;
  else {
    const { fattore_E, fattore_fc, nota = "" } = danno;
    for (const [v, nome] of [[fattore_E, "fattore su E"], [fattore_fc, "fattore su fc"]]) {
      numero(v, nome);
      if (v <= 0 || v > 1) throw new ErroreComando(`${nome} deve stare fra 0 escluso e 1 compreso`, "1 vuol dire integro, 0,8 vuol dire un quinto in meno");
    }
    a.danno = { fattore_E, fattore_fc, nota: nota == null ? "" : String(nota) };
  }
  if (!cambiata(vecchia, a)) return m;
  marcaModificata(a);
  return n;
}

export function impostaVeste(m, { veste }) {
  if (!VESTI.includes(veste)) throw new ErroreComando(`veste «${veste}» sconosciuta`, `le vesti sono ${VESTI.join(", ")}`);
  const n = copia(m);
  n.impostazioni_analisi = { ...(n.impostazioni_analisi ?? { fibre: 10 }), veste };
  // La veste già scelta nel menu: sceglierla di nuovo non è un comando. Il campo che prima
  // non c'era invece sì, anche sulla veste di default — il modello lo porta da adesso.
  return cambiata(m.impostazioni_analisi, n.impostazioni_analisi) ? n : m;
}

// --- azioni e carichi (story 25-26) --------------------------------------------------------
const azioneEsistente = (m, id) => {
  const a = azione(m, id);
  if (!a) throw new ErroreComando(`l'azione ${id} non esiste`, "seleziona un'azione nell'albero e ripeti");
  return a;
};
const combinazioneEsistente = (m, id) => {
  const c = combinazione(m, id);
  if (!c) throw new ErroreComando(`la combinazione ${id} non esiste`, "seleziona una combinazione nell'albero e ripeti");
  return c;
};
/** Gli spazi del dito non entrano nel modello: `rinomina` (:139) e `creaSezione` (:236) li
 *  tolgono già, e due strade per lo stesso campo che non concordano si notano al salvataggio.
 *  Il campo svuotato è «nessuna categoria», non una stringa vuota. */
const ripulisci = (e) => {
  if (typeof e.nome === "string") e.nome = e.nome.trim();
  if (typeof e.categoria === "string") e.categoria = e.categoria.trim() || null;
};
// La stessa regola del backend (`nova/modello.py:288-292`), con la stessa frase: l'azione che
// il riduttore accetta è quella che il server accetterà al salvataggio.
const azioneValida = (a) => {
  if (typeof a.nome !== "string" || a.nome.trim() === "") throw new ErroreComando("l'azione vuole un nome", "scrivi «nome; natura»");
  if (!NATURE.includes(a.natura)) throw new ErroreComando(`natura «${a.natura}» sconosciuta: le nature sono ${NATURE.join(", ")}`, "con Q anche la categoria d'uso");
  if (a.categoria != null && typeof a.categoria !== "string") throw new ErroreComando("la categoria d'uso è un testo", "scrivi per esempio «residenziale» o «neve»");
  if (a.natura === "Q" && !a.categoria) throw new ErroreComando(`azione ${a.id} «${a.nome}»: natura Q senza categoria d'uso`, "scrivi la categoria, per esempio «vento» o «residenziale»");
};
/** Il carico con le sole chiavi dello schema, e i riferimenti che esistono davvero. */
const caricoAccettabile = (m, c) => {
  const { carico, messaggio } = normalizzaCarico(c);
  if (!carico) throw new ErroreComando(messaggio, "scegli un tipo fra nodale, distribuito, gravita, cedimento, termico");
  if ("nodo" in carico && !nodo(m, carico.nodo)) throw new ErroreComando(`il nodo ${carico.nodo} non esiste`, "scegli un nodo del modello");
  if ("asta" in carico && !asta(m, carico.asta)) throw new ErroreComando(`l'asta ${carico.asta} non esiste`, "scegli un'asta del modello");
  return carico;
};
/** Un'azione letta da un file può non portare `carichi`: il server lo riempie col default,
 *  e qui si fa lo stesso invece di sollevare un TypeError (come `eliminaNodo`, :119). */
const carichiDi = (a) => a.carichi ?? [];
const indiceValido = (a, indice) => {
  if (!Number.isInteger(indice) || indice < 0 || indice >= carichiDi(a).length) {
    throw new ErroreComando(`l'azione ${a.id} ha ${carichiDi(a).length} carichi`, "scegli un carico dell'elenco");
  }
};
// L'analisi non ha ancora un editor (T6): il rimedio manda dove la si può correggere davvero.
const NEL_FILE = "l'analisi si corregge nel file (.nova.json): togli quel riferimento, poi elimina";

export function creaAzione(m, { nome, natura, categoria = null }) {
  const id = prossimoId(m, "azione");
  const a = { id, nome, natura, categoria, generata: false, carichi: [] };
  ripulisci(a);
  azioneValida(a);
  const n = copia(m);
  n.azioni.push(a);
  n.contatori.azione = id;
  return n;
}

export function modificaAzione(m, { id, ...campi }) {
  const vecchia = azioneEsistente(m, id);
  const n = copia(m);
  const a = azioneEsistente(n, id);
  for (const k of ["nome", "natura", "categoria"]) if (k in campi) a[k] = campi[k];
  ripulisci(a);
  azioneValida(a);
  return cambiata(vecchia, a) ? n : m;
}

export function aggiungiCarico(m, { azione: idAzione, carico }) {
  azioneEsistente(m, idAzione);
  const c = caricoAccettabile(m, carico);
  const n = copia(m);
  const a = azioneEsistente(n, idAzione);
  (a.carichi ??= []).push(c);
  return n;
}

export function modificaCarico(m, { azione: idAzione, indice, carico }) {
  const a = azioneEsistente(m, idAzione);
  indiceValido(a, indice);
  const c = caricoAccettabile(m, carico);
  if (!cambiata(a.carichi[indice], c)) return m;
  const n = copia(m);
  azioneEsistente(n, idAzione).carichi[indice] = c;
  return n;
}

export function togliCarico(m, { azione: idAzione, indice }) {
  const a = azioneEsistente(m, idAzione);
  indiceValido(a, indice);
  const n = copia(m);
  azioneEsistente(n, idAzione).carichi.splice(indice, 1);
  return n;
}

export function eliminaAzione(m, { id }) {
  const a = azioneEsistente(m, id);
  // I nomi, non gli identificatori: nell'albero l'utente legge «SLU», e un «2, 3» nudo lo
  // costringe a contare le righe per capire di quali combinazioni si parla.
  const usata = combinazioniDellAzione(m, id).map((c) => `«${c.nome}»`);
  if (usata.length) throw new ErroreComando(`l'azione «${a.nome}» la usano le combinazioni ${usata.join(", ")}`, "togli il termine dalle combinazioni, poi elimina");
  const caso = nomeCaso("azione", id);
  if (analisiCheUsano(m, caso).length) throw new ErroreComando(`l'azione «${a.nome}» la usa un'analisi, come caso ${caso}`, NEL_FILE);
  // La modale nomina l'azione per identificatore, non per caso: `analisiCheUsano` non la vede.
  if (analisiConMassaDa(m, id).length) throw new ErroreComando(`l'azione «${a.nome}» dà massa a un'analisi modale`, NEL_FILE);
  const n = copia(m);
  n.azioni = n.azioni.filter((a) => a.id !== id);
  return n;  // i contatori restano: un identificatore eliminato non si riusa
}

// --- combinazioni (story 27) ---------------------------------------------------------------
const tipoCombinazioneValido = (tipo) => {
  if (tipo !== null && !TIPI_COMBINAZIONE.includes(tipo)) {
    throw new ErroreComando(`tipo di combinazione «${tipo}» sconosciuto: i tipi sono ${TIPI_COMBINAZIONE.join(", ")}`, "o nessun tipo");
  }
};

const nomeCombinazioneValido = (nome) => {
  if (typeof nome !== "string" || nome.trim() === "") throw new ErroreComando("la combinazione vuole un nome", "scrivi «nome» o «nome; tipo»");
};

export function creaCombinazione(m, { nome, tipo = null }) {
  nomeCombinazioneValido(nome);
  tipoCombinazioneValido(tipo);
  const n = copia(m);
  const id = prossimoId(n, "combinazione");
  const c = { id, nome, termini: [], tipo, generata: false };
  ripulisci(c);
  n.combinazioni.push(c);
  n.contatori.combinazione = id;
  return n;
}

export function modificaCombinazione(m, { id, ...campi }) {
  const vecchia = combinazioneEsistente(m, id);
  if ("tipo" in campi) tipoCombinazioneValido(campi.tipo);
  if ("nome" in campi) nomeCombinazioneValido(campi.nome);
  const n = copia(m);
  const c = combinazioneEsistente(n, id);
  for (const k of ["nome", "tipo"]) if (k in campi) c[k] = campi[k];
  ripulisci(c);
  return cambiata(vecchia, c) ? n : m;
}

/** Un termine per azione, dall'interfaccia: due termini sulla stessa azione il deck li somma
 *  (`nova/deck.py:305-309`), e una somma nascosta in un elenco è una bugia da leggere. */
export function impostaTermine(m, { id, azione: idAzione, coefficiente }) {
  const vecchia = combinazioneEsistente(m, id);
  const a = azioneEsistente(m, idAzione);  // una ricerca sola: il nome nel messaggio viene da qui
  // Un file può portare due termini sulla stessa azione (il deck li somma): sostituirli con uno
  // perderebbe un dato senza dirlo. Si rifiuta, e si dice dove correggere.
  //
  // Svuotare no: `coefficiente: null` li toglie **entrambi**, ed è l'unica scrittura su una
  // doppia che non perde niente in silenzio. Rifiutare anche quella lasciava il campo
  // dell'ispettore senza una sola mossa lecita — mostrava la somma e diceva «vuoto = non
  // entra», e poi nemmeno il vuoto passava.
  const prima = vecchia.termini ?? [];  // sola lettura: la guardia e il posto del termine
  if (coefficiente !== null && prima.filter((t) => t.azione === idAzione).length > 1) {
    // «il deck li somma» è gergo di dentro: chi legge sa cos'è un'analisi, non cos'è un deck.
    throw new ErroreComando(`la combinazione «${vecchia.nome}» ha due termini sull'azione «${a.nome}»: i due si sommano nell'analisi`,
                            "correggi il file: un termine per azione");
  }
  if (coefficiente !== null) numero(coefficiente, "il coefficiente");
  const n = copia(m);
  const c = combinazioneEsistente(n, id);
  // Si filtra da `c.termini`, che `copia` ha già clonato. Filtrando da `vecchia.termini` i
  // termini non toccati resterebbero gli **stessi oggetti** del modello vecchio, e la Storia
  // finirebbe con due snapshot che ne condividono uno: mutarlo riscriverebbe il passato.
  c.termini = (c.termini ?? []).filter((t) => t.azione !== idAzione);
  if (coefficiente !== null) {
    // L'ordine dell'elenco è quello che si legge nell'albero: il termine aggiornato resta
    // dov'era, e solo quello nuovo va in coda.
    const dove = prima.findIndex((t) => t.azione === idAzione);
    c.termini.splice(dove === -1 ? c.termini.length : dove, 0, { azione: idAzione, coefficiente });
  }
  return cambiata(vecchia, c) ? n : m;
}

export function eliminaCombinazione(m, { id }) {
  const c = combinazioneEsistente(m, id);
  const caso = nomeCaso("combinazione", id);
  if (analisiCheUsano(m, caso).length) throw new ErroreComando(`la combinazione «${c.nome}» la usa un'analisi, come caso ${caso}`, NEL_FILE);
  const n = copia(m);
  n.combinazioni = n.combinazioni.filter((c) => c.id !== id);
  return n;
}
