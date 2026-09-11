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

/** Il titolo dell'`<details>` avanzato, qui e non nel markup: il codice gli aggiunge «(in uso)» e
 *  glielo toglie, quindi la stringa di riposo è sua. Il test la confronta con `index.html`. */
export const TITOLO_AVANZATO = "avanzato: mappa_casi in JSON";

/** Il blocco «Confronto»: tre percorsi, la mappa dei casi (form o JSON), «confronta», la tabella.
 *  Il DOM è suo come in `creaCorsa` (`corsa.js:113`): `app.js` gli passa lo stato e ridisegna. */
export function creaConfronto(radice, { suErrore, appunti = (globalThis.navigator?.clipboard ?? null) }) {
  const q = (sel) => radice.querySelector(sel);
  const vuotoEl = q("#confronto-vuoto"), campoTelaio = q("#confronto-telaio"), campoSolido = q("#confronto-solido");
  const campoAbaqus = q("#confronto-abaqus"), campoNodi = q("#confronto-nodi"), casiEl = q("#confronto-casi");
  const assiEl = q("#confronto-assi"), titoloAvanzato = q("#confronto-avanzato-titolo"), jsonEl = q("#confronto-json");
  const bConfronta = q("#confronto-confronta"), statoEl = q("#confronto-stato"), scorriEl = q("#confronto-scorri");
  const didascaliaEl = q("#confronto-didascalia"), testaEl = q("#confronto-testa"), corpoEl = q("#confronto-corpo");
  const noteEl = q("#confronto-note"), provenienzaEl = q("#confronto-provenienza"), cartellaEl = q("#confronto-cartella");
  const percorsoEl = q("#confronto-percorso"), bCopia = q("#confronto-copia");

  // «toccato» per campo: una corsa nuova riscrive solo i campi che l'utente non ha mai scritto.
  const toccato = { telaio: false, solido: false, nodi: false };
  let jsonInUso = false;       // il textarea ha ricevuto un `input`: da lì comanda lui
  let casiInForm = [];         // i casi delle righe caso → passo, per rifarle solo se cambiano
  let cartella = null;         // della tabella a schermo, per «copia»
  let occupato = false;
  let gen = 0;                 // `azzera()` la fa avanzare: la risposta ancora in volo si scarta

  const righeCasi = () => casiEl.querySelectorAll("input");
  const statoForm = () => ({
    casi: [...righeCasi()].map((i) => ({ caso: i.dataset.caso, passo: i.value })),
    nodi: campoNodi.value, assiScambiati: Boolean(assiEl.checked),
  });
  const mappaCorrente = () => (jsonInUso ? leggiMappaJson(jsonEl.value) : mappaDalForm(statoForm()));
  function specchiaJson() {
    if (jsonInUso) return;
    let testo = "";
    try { testo = JSON.stringify(mappaDalForm(statoForm()), null, 1); } catch { testo = ""; }   // nodi rotti: lo dirà «confronta»
    if (jsonEl.value !== testo) jsonEl.value = testo;
  }

  function rifaiCasi(casi) {
    if (casi.length === casiInForm.length && casi.every((c, k) => c === casiInForm[k])) return;
    casiInForm = casi;
    casiEl.replaceChildren(...casi.map((caso) => {
      const label = document.createElement("label");
      label.className = "riga";
      label.textContent = `${caso} → `;
      const campo = document.createElement("input");
      campo.type = "text"; campo.className = "numero";
      // Un `Z<n>` è un'azione del telaio (`nova/casi.py`), non un passo del solido: proporlo come
      // passo farebbe un 400 al primo clic. Riga sì — la mappa si scrive a mano — valore no.
      campo.value = /^Z\d+$/.test(caso) ? "" : caso;
      campo.dataset.caso = caso;
      campo.setAttribute("aria-label", `passo del solido per il caso ${caso}`);
      campo.addEventListener("input", specchiaJson);
      label.append(campo);
      return label;
    }));
  }

  function disegna({ modello: m, telaio, solido }) {
    // Un percorso vuoto non cancella quello a schermo: una corsa riagganciata senza cartella
    // butterebbe via un percorso buono, e l'utente non saprebbe perché.
    const pTelaio = percorsoRisultati(telaio, "telaio");
    if (!toccato.telaio && pTelaio !== "") campoTelaio.value = pTelaio;
    const pSolido = percorsoRisultati(solido, "solido");
    if (!toccato.solido && pSolido !== "") campoSolido.value = pSolido;
    if (!toccato.nodi) campoNodi.value = nodiInSommita(m).join("; ");
    rifaiCasi(casiCorsi(telaio));
    specchiaJson();
    bConfronta.disabled = occupato || campoTelaio.value.trim() === "";
    bCopia.textContent = "copia";
  }

  const th = (testo, scope = "col") => { const e = document.createElement("th"); e.textContent = testo; e.setAttribute("scope", scope); return e; };
  const td = (testo) => { const e = document.createElement("td"); e.textContent = testo; return e; };
  // I numeri delle note in apice, nella cella della classe: «lontano 1», «non confrontabile 2 3».
  // Un `<sup>` dopo un nodo di testo, non un carattere in più nel testo: chi guarda distingue il
  // numero dalla parola, e l'`aria-label` lo legge «nota 2, 3» invece di sillabarlo attaccato.
  const conNote = (cella, note) => {
    if (!note.length) return cella;
    const sup = document.createElement("sup");
    sup.textContent = note.join(" ");
    sup.setAttribute("role", "note");   // senza un ruolo, l'`aria-label` di un `<sup>` non viene esposto
    sup.setAttribute("aria-label", `nota ${note.join(", ")}`);
    cella.append(document.createTextNode(" "), sup);
    return cella;
  };

  function disegnaTabella(tabella) {
    const abq = conAbaqus(tabella);
    const intestazioni = abq ? ["grandezza", "caso", "telaio", "solido", "Abaqus", "scarto solido", "scarto Abaqus", "classe solido", "classe Abaqus"]
                             : ["grandezza", "caso", "telaio", "solido", "scarto", "classe"];
    const tr = document.createElement("tr");
    tr.append(...intestazioni.map((t) => th(t)));
    testaEl.replaceChildren(tr);
    corpoEl.replaceChildren(...righeDaMostrare(tabella).map((r) => {
      const riga = document.createElement("tr");
      riga.className = r.attenuata ? "attenuata" : "";
      // L'unità una volta per riga, accanto al valore del telaio — ma mai appiccicata a un «—»,
      // che è l'assenza del valore, non un valore senza unità.
      const celle = [th(r.grandezza, "row"), td(r.caso), td(r.telaio === "—" ? "—" : `${r.telaio} ${r.unita}`), td(r.solido)];
      if (abq) celle.push(td(r.abaqus), td(r.scartoSolido), td(r.scartoAbaqus), td(r.classeSolido), td(r.classeAbaqus));
      else celle.push(td(r.scartoSolido), td(r.classeSolido));
      conNote(celle.at(-1), r.note);
      riga.append(...celle);
      return riga;
    }));
    didascaliaEl.textContent = testoDidascalia(tabella, { abaqusChiesto: campoAbaqus.value.trim() !== "" });
    const { note } = noteDellaTabella(tabella);
    noteEl.replaceChildren(...note.map(({ testo }) => { const li = document.createElement("li"); li.textContent = testo; return li; }));
    noteEl.hidden = note.length === 0;
    statoEl.textContent = testoConteggio(tabella);
    provenienzaEl.textContent = testoProvenienza(tabella.provenienza);
    scorriEl.hidden = false; vuotoEl.hidden = true;
  }

  async function confronta() {
    if (occupato) return;
    let mappa_casi;
    try { mappa_casi = mappaCorrente(); } catch (e) { suErrore(e.message); return; }
    const telaio = campoTelaio.value.trim();
    if (telaio === "") { suErrore("scrivi il percorso dei risultati del telaio"); return; }
    const vuotoANull = (campo) => (campo.value.trim() === "" ? null : campo.value.trim());
    occupato = true; bConfronta.disabled = true;
    bConfronta.textContent = "confronto…";
    const g = gen;
    try {
      const r = await chiediJson("/api/confronto", { telaio, solido: vuotoANull(campoSolido), abaqus: vuotoANull(campoAbaqus), mappa_casi });
      // Azzerato mentre girava: questa risposta è di una schermata che non c'è più. Niente DOM,
      // niente messaggio, e soprattutto niente `cartella` — «copia» copierebbe un percorso che
      // non è scritto da nessuna parte.
      if (g !== gen) return;
      cartella = r.cartella ?? null;
      percorsoEl.textContent = cartella ?? "";
      cartellaEl.hidden = cartella === null;
      // Dopo la cartella: se il disegno solleva, «copia» offre comunque quel che è a schermo.
      disegnaTabella(r.tabella ?? { righe: [], provenienza: null, avvertenza: "" });
      suErrore(null);
    } catch (e) {
      if (g === gen) suErrore(e.message);
    } finally {
      occupato = false; bConfronta.textContent = "confronta";
      if (g === gen) bConfronta.disabled = false;   // azzerato, il bottone lo ha già spento `azzera()`
    }
  }

  async function copia() {
    if (cartella === null) return;
    if (!appunti?.writeText) { suErrore("gli appunti non sono disponibili: copia il percorso a mano"); return; }
    try { await appunti.writeText(cartella); bCopia.textContent = "copiato"; }
    catch { suErrore("gli appunti non sono disponibili: copia il percorso a mano"); }
  }

  function azzera() {
    gen++;                      // una richiesta in volo non scriverà più su questa schermata
    for (const k of Object.keys(toccato)) toccato[k] = false;
    campoTelaio.value = ""; campoSolido.value = ""; campoAbaqus.value = ""; campoNodi.value = "";
    jsonInUso = false; jsonEl.value = ""; titoloAvanzato.textContent = TITOLO_AVANZATO;
    casiInForm = []; casiEl.replaceChildren();
    cartella = null; percorsoEl.textContent = "";
    testaEl.replaceChildren(); corpoEl.replaceChildren(); noteEl.replaceChildren();
    statoEl.textContent = ""; provenienzaEl.textContent = "";
    scorriEl.hidden = true; noteEl.hidden = true; cartellaEl.hidden = true; vuotoEl.hidden = false;
    bConfronta.disabled = true;
  }

  campoTelaio.addEventListener("input", () => { toccato.telaio = true; bConfronta.disabled = occupato || campoTelaio.value.trim() === ""; });
  campoSolido.addEventListener("input", () => { toccato.solido = true; });
  campoNodi.addEventListener("input", () => { toccato.nodi = true; specchiaJson(); });
  assiEl.addEventListener("change", specchiaJson);
  jsonEl.addEventListener("input", () => { jsonInUso = true; titoloAvanzato.textContent = `${TITOLO_AVANZATO} (in uso)`; });
  bConfronta.addEventListener("click", () => confronta());
  bCopia.addEventListener("click", () => copia());

  return { disegna, azzera };
}
