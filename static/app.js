// La cucitura. Due modi di disegno oltre alla selezione libera: l'estrusione, dove la
// selezione resta ferma mentre si conferma un ghost, e l'asta fra due nodi, dove la
// selezione **è** il gesto — la stessa guardia renderebbe impossibile scegliere il
// secondo nodo. `ponytail: ridisegno intero; si passa a un diff quando un modello vero
// lo rende lento, non prima.`

import { modelloVuoto, nodo, materiale, azione, azioneInVista, vesteDi } from "./modello.js";
import { ErroreComando, creaNodo, estrudi, collega, spostaNodo, eliminaNodo, rinomina, impostaVincolo,
         creaSezione, modificaSezione, impostaFila, assegnaSezione, eliminaSezione, creaMateriale,
         modificaMateriale, eliminaMateriale, impostaDanno, impostaVeste, materialiDiDefault,
         creaAzione, modificaAzione, eliminaAzione, aggiungiCarico, modificaCarico, togliCarico,
         creaCombinazione, modificaCombinazione, impostaTermine, eliminaCombinazione } from "./comandi.js";
import { leggiAzione, leggiNodale, leggiDistribuito, leggiCombinazione, caricoVuoto, NOME_TIPO } from "./carichi.js";
import { leggiDimensioni } from "./sezione.js";
import { nuovaCronologia, applica, corrente, indietro, avanti, vaiA, etichette } from "./cronologia.js";
import { TASTI, voceDaEvento, vociDellaBarra, daControllo, etichettaCampo, nomeTasto } from "./tastiera.js";
import { creaPalette } from "./palette.js";
import { creaPiano } from "./piano.js";
import { creaSpazio } from "./spazio.js";
import { creaAlbero } from "./albero.js";
import { creaPannello } from "./pannello.js";
import { creaFile, chiediJson } from "./file.js";
import { creaStoria } from "./storia.js";
import { creaCorsa, stantia } from "./corsa.js";
import { creaEsito, creaSrotolato } from "./esito.js";
import { creaConfronto } from "./confronto.js";
import { VISTE, scalaAuto, puntiDeformata, vociDelCaso, casoScelto, scalaModo,
         curvaPushover, passoDiRiferimento, tipoDelCaso, massimoSpostamento } from "./risultati.js";
import { creaAnimazione, movimentoRidotto } from "./animazione.js";
import { ghostDisegnabile, esitoScelta, contestoBarra, ruotaGhost, modoValido,
         esitoComando, esitoLunghezza, ghostDelComando, serveUnNodo, AVVISO_SECONDO_NODO } from "./modo.js";
import { alternaIncastro, descrizione } from "./vincoli.js";
import { stampaNumero, leggiEspressione, millimetri } from "./numeri.js";
import { daRisposta, propostaPerNodo, proposteAperte, etichettaStoria } from "./rilievo.js";
import { dimenticaMisure } from "./misure.js";

let cronologia = nuovaCronologia(modelloVuoto());
let selezione = null;
// null · {tipo:"estrusione", da, dx, dz} · {tipo:"asta", da, a}
// Due modi e non un ghost solo: in estrusione la selezione è ferma, in asta la selezione
// **è** il gesto. La stessa guardia per entrambi renderebbe l'asta impossibile.
let modo = null;
// Il campo di comando: `null` quando è chiuso, `{ tipo, testo, bersaglio }` quando è aperto.
// Fuori da `modo` perché non è un modo — `nodo` non ha un nodo di partenza, e `modoValido`
// lo chiuderebbe a ogni ridisegno cercandogli un `da` che non ha mai avuto. Un campo solo per
// dieci comandi: `N`, `B`, `M`, `R`, `S`, `C`, `D`, `Z`, `Q`, `K`. Da qui `window.prompt` non
// è più nel programma (P2).
let comando = null;
// L'azione a cui `Q` dà il carico e di cui il piano disegna le frecce: l'ultima scelta o
// creata, altrimenti l'ultima del modello. Una regola sola, scritta nell'aiuto del campo.
let azioneCorrente = null;
const azioneDestinazione = (m) => azioneInVista(m, azioneCorrente);
// Niente `modificato` qui: lo deriva `file.js` confrontando il modello in memoria con quello
// che è stato spedito su disco. Una variabile propria mente a ogni corsa del salvataggio, e
// per tenerla onesta servirebbe un aggiornamento in ogni punto che tocca la cronologia.
let percorso = null, impronta = null;
// Il rendiconto dell'importazione: fuori dal modello e dalla cronologia (spec, «Importatore dal
// prior» §3). Azzerato in `suApertura` — aprire un file lascia il rilievo di prima senza senso.
let rilievo = null;
// L'ultima corsa da mostrare, e come: `null` quando non c'è niente da vedere, altrimenti
// `{ lavoro, vista, caso, scalaMano, passo, animazione }`. `lavoro` è quel che `suEsito` ha
// ricevuto — snapshot del modello compreso, che è come `stantia` sa se i numeri parlano ancora
// di questo disegno. `vista` è `null` (niente) o una di `VISTE`; `scalaMano` è `null` per la
// scala automatica. Dalla 14a `caso` è una chiave a tre forme (`"Z1"`, `"modo:2"`, `"pushover"`,
// e a tradurla è `casoScelto`), `passo` è l'indice del passo della pushover (`null` = l'ultimo)
// e `animazione` è `"va"` o `"ferma"` — quel che Spazio alterna.
let risultati = null;
// La preferenza di sistema, letta **al gesto** e non per fotogramma (R13): `matchMedia` è viva,
// e costruirne una sessanta volte al secondo per una scelta che cambia una volta in un'ora è
// spreco. `ridisegna` la rinfresca; `risultatiInVista` la legge da qui, anche quando gira dentro
// un fotogramma dell'animazione. Un cambio a caldo si raccoglie al gesto dopo.
let motoRidotto = false;
// Le due ultime corse per la scheda Confronto: `corsa.js` ne tiene una sola (`:124`) e il solido
// sovrascrive il telaio.
let ultimoTelaio = null, ultimoSolido = null;

// La scala della pushover si misura **una volta per corsa**, sul passo di spostamento massimo, e
// non sul passo corrente: con `scalaAuto(passo[k])` usciva ×10 al passo 30 e ×2 al 120, cioè
// scorrendo lo scrubber la deformata respirava invece di crescere, e confrontare due passi — che
// è tutto il senso dello scrubber — diceva il falso. La cache sta su `passi` **e** sul modello:
// `scalaAuto` misura anche `latoMaggiore(m)`, e un modello modificato con la stessa corsa in mano
// (una corsa stantia) darebbe una scala vecchia per un disegno nuovo.
// 15a: |u|max della legenda dei colori sta nella stessa cache, per la stessa ragione — fisso sul passo di
// riferimento, così al passo 1 la deformata è tutta viola e la legenda non respira.
let scalaCache = { passi: null, m: null, scala: 1, uMax: 0 };
function pushoverDiRiferimento(m, passi) {
  if (scalaCache.passi !== passi || scalaCache.m !== m) {
    const k = passoDiRiferimento(passi);
    const perCaso = { spostamenti: k === null ? {} : (passi[k].spostamenti ?? {}) };
    scalaCache = { passi, m, scala: k === null ? 1 : scalaAuto(m, perCaso),
                   uMax: massimoSpostamento(puntiDeformata(m, perCaso, 1)) };
  }
  return scalaCache;
}

/** Lo stato dei risultati tradotto in **vista**, cioè in quel che piano, spazio e striscia
 *  sanno disegnare (il contratto di `piano.disegna` più `curva` e `passo` per la striscia), o
 *  `null` quando non c'è niente da mostrare. La scala si calcola qui una volta sola: piano e
 *  spazio devono disegnare la **stessa** deformata, e due `scalaAuto` chiamate in due posti
 *  divergerebbero al primo cambio di frazione.
 *
 *  `fattore` è la fase dell'animazione, in [−1, 1]: moltiplica la scala del **disegno**, mai
 *  quella dichiarata nel badge (Global Constraints). */
function risultatiInVista(m, fattore = 1) {
  if (!risultati?.vista) return null;
  const scelto = casoScelto(risultati, risultati.caso, risultati.passo);
  if (!scelto) return null;
  const auto = risultati.scalaMano === null;
  // `scalaAuto` solo in vista deformata: passa da `frecciaMassima` → `puntiDeformata`, cioè un
  // campionamento di Hermite su ogni asta, e in vista M/V/N nessuno lo guarderebbe. Là la scala
  // del disegno la fa `scalaDiagrammaAuto` (`piano.js`), e questa vale 1 per non mentire nel badge.
  // R1: un modo si misura con `scalaModo`, che guarda le **tre** componenti della forma —
  // `scalaAuto` ignora la `y`, e venti modi su 42 del MURO 1 uscirebbero «×1 (auto)».
  const scalaDeformata = () => (scelto.tipo === "modo" ? scalaModo(m, scelto.modo)
    : scelto.tipo === "pushover" ? pushoverDiRiferimento(m, risultati.lavoro?.fin?.risultati?.passi).scala
    : scalaAuto(m, scelto.perCaso));
  const scala = auto ? (risultati.vista === "deformata" ? scalaDeformata() : 1) : risultati.scalaMano;
  // |u|max dei colori, calcolato **qui per tutti** (N6): la pushover dal passo di riferimento, dove
  // la scala dev'essere quella fissa della corsa — altrimenti al passo 1 la deformata sarebbe tutta
  // viola e la legenda respirerebbe (E3) — caso e modo dal massimo delle loro deformate. Il ruling
  // E3 del giro prima lasciava il conto ai ripieghi di `piano.js` e `spazio.js`: tre padroni dello
  // stesso numero, che coincidono solo finché `u` non porta la scala. Misurato 0,011-0,034 ms a
  // chiamata: un padrone solo vale più di quel risparmio. La scala passata è 1 e non cambia niente:
  // `u` è in mm del modello, senza scala del disegno (`risultati.js`, `puntiDeformata`).
  const uMax = risultati.vista !== "deformata" ? null
    : scelto.tipo === "pushover" ? pushoverDiRiferimento(m, risultati.lavoro?.fin?.risultati?.passi).uMax
    : massimoSpostamento(puntiDeformata(m, scelto.perCaso, 1));
  const curva = scelto.tipo === "pushover"
    ? curvaPushover(risultati.lavoro?.fin?.risultati?.passi, scelto.caduta) : null;
  // Un oggetto solo per il badge e per la striscia: due copie dello stesso passo divergerebbero
  // al primo campo aggiunto. Il conteggio si chiama `quanti` fin qui, come in `casoScelto`:
  // chiamarlo `n` lo faceva collidere con `caduta.n`, che è il **numero** del passo del server —
  // due campi omonimi nello stesso badge, e il commento della striscia li raccontava al contrario.
  const passo = scelto.tipo === "pushover"
    ? { k: scelto.k, quanti: scelto.quanti, u: Number(scelto.passo?.spostamento) || 0,
        V: (Number(scelto.passo?.taglio_base) || 0) / 1e3 } : null;
  return { vista: risultati.vista, caso: risultati.caso, perCaso: scelto.perCaso, scala, auto,
           stantia: stantia(risultati.lavoro, m), fattore,
           tipo: scelto.tipo, stati: scelto.stati ?? null, curva, passo, uMax,
           badge: { modo: scelto.modo ?? null, passo, caduta: curva?.caduta ?? null,
                    // Fermo perché l'utente ha premuto Spazio, o perché il sistema chiede meno
                    // movimento: la seconda l'utente non l'ha fatta, e senza il motivo il badge
                    // la fa passare per un'animazione rotta (D2a, R13).
                    fermo: risultati.animazione !== "va" || motoRidotto,
                    motivoFermo: motoRidotto ? "preferenza di sistema" : null } };
}

// Il catalogo delle classi e i legami dei materiali vengono dal server, dove i numeri di
// norma vivono già (`nova/catalogo.py`, `nova/legami.py`): qui non ce n'è nessuno. Il
// catalogo si chiede una volta; il legame per materiale e veste, con una cache — cambiare
// veste cambia la chiave, e una risposta vecchia non può atterrare sopra una nuova.
let catalogo = null;
const legami = new Map();
// Le chiavi della tabella di norma (`E`, `nu`, `densita`, `fck`, …) dipendono da **tipo e
// classe**, non dai valori scritti a mano: l'ultima risposta buona per la stessa coppia le
// porta già, e serve a tenere in piedi il gruppo «valori» mentre la POST successiva viaggia
// (`pannello.js`). Chiave a parte da quella di `legami`, che invece porta il materiale intero.
const tabelle = new Map();
const chiaveTabella = (k) => `${k.tipo}|${k.classe}`;

chiediJson("/api/catalogo").then((c) => { catalogo = c; ridisegna(); })
  .catch(() => { catalogo = null; });  // l'editor regge senza: mostra la classe che c'è (P5)

/** Il legame del materiale `id` nella veste corrente, o `null` finché non è arrivato — che
 *  l'editor dice, invece di lasciare un riquadro muto (P5). La chiave porta **anche** la
 *  veste: cambiarla fa ripartire le richieste, e la risposta di prima non può atterrare
 *  sopra quella di adesso. Una chiave già in cache non chiede due volte. */
function legamePer(m, id) {
  const k = materiale(m, id);
  if (!k) return null;
  const chiave = JSON.stringify([k, vesteDi(m)]);
  if (legami.has(chiave)) return legami.get(chiave);
  legami.set(chiave, null);  // in volo: «valori in arrivo», e nessuna seconda richiesta
  // L'errore **resta** in cache. Cancellarlo subito dopo il ridisegno lo rimetteva in volo al
  // ridisegno successivo: la POST ripartiva a ogni disegno e l'avviso lampeggiava. Il server
  // riavviato si riprova su un gesto — `scegli` svuota le chiavi in errore quando si
  // riseleziona un materiale — non su un disegno.
  const arrivo = (v) => {
    legami.set(chiave, v);
    // ponytail: la tabella si tiene com'è arrivata, override compresi (`catalogo.valori` li
    // scrive sopra i numeri di norma). Chi toglie una scrittura a mano vede il numero vecchio
    // per un giro di POST, poi la risposta nuova lo rimette a posto.
    if (v.valori) tabelle.set(chiaveTabella(k), v.catalogo);
    ridisegna();
  };
  chiediJson("/api/materiale/legame", { materiale: k, veste: vesteDi(m) })
    // Un 200 con un corpo illeggibile non è un legame: `chiediJson` in quel caso torna `{}`,
    // e `pannello.js` leggerebbe `legame.legame.tipo` su `undefined`.
    .then((d) => arrivo(d.valori ? d : { errore: "risposta del server illeggibile" }))
    .catch((e) => arrivo({ errore: e.message }));
  return null;
}

const $ = (id) => document.getElementById(id);
const messaggio = $("messaggio");
function dì(testo) { messaggio.textContent = testo ?? ""; }

// Una quota come la scrive l'albero: migliaia separate e unità sul numero (`albero.js`,
// PRODUCT.md «unità dichiarate in un punto e su ogni numero»). Non vale per il segnaposto
// del campo, che è un testo da **ricopiare**: lì l'unità sarebbe da cancellare a mano.
const quota = (v) => `${millimetri(v)} mm`;

function scegli(tipo, id) {
  const { permesso, messaggio, aggiornaA } = esitoScelta(modo, tipo);
  if (messaggio) dì(messaggio);
  if (!permesso) return;
  // Il gesto che riporta su un materiale è la richiesta di riprovare: qui, e solo qui, le
  // chiavi che portano un errore escono dalla cache (`legamePer`).
  if (tipo === "materiale") {
    for (const [k, v] of legami) if (v?.errore) legami.delete(k);
  }
  // Scegliere un'azione la rende la destinazione di `Q` e il soggetto delle frecce nel piano:
  // il gesto che la mostra è lo stesso che la elegge, e non ce n'è un secondo da imparare.
  if (tipo === "azione") azioneCorrente = id;
  if (aggiornaA) modo = { ...modo, a: id };
  selezione = { tipo, id };
  ridisegna();
}

const piano = creaPiano($("piano"), { suSelezione: scegli, suSfondo: () => { if (!modo) { selezione = null; ridisegna(); } } });
const albero = creaAlbero($("albero-elenco"), $("albero-vuoto"), { suSelezione: scegli });
const pannello = creaPannello(
  { dati: $("pannello-dati"), vuoto: $("pannello-vuoto"), editor: $("pannello-editor") },
  {
    suVincolo: (id, vincolo) => { esegui((m) => impostaVincolo(m, { id, vincolo }), `vincolo del nodo ${id}`); ridisegna(); },
    suSezione: (id, campi) => { esegui((m) => modificaSezione(m, { id, ...campi }), `sezione ${id}: ${Object.keys(campi).join(", ")}`); ridisegna(); },
    suFila: (id, lato, n, diametro) => { esegui((m) => impostaFila(m, { id, lato, n, diametro }), `fila ${lato} della sezione ${id}`); ridisegna(); },
    suAssegna: (asta, sezione) => { esegui((m) => assegnaSezione(m, { asta, sezione }), `sezione dell'asta ${asta}`); ridisegna(); },
    suDanno: (asta, danno) => { esegui((m) => impostaDanno(m, { asta, danno }), `danno dell'asta ${asta}`); ridisegna(); },
    suMateriale: (id, campi) => { esegui((m) => modificaMateriale(m, { id, ...campi }), `materiale ${id}: ${Object.keys(campi).join(", ")}`); ridisegna(); },
    suVeste: (veste) => { esegui((m) => impostaVeste(m, { veste }), `veste ${veste}`); ridisegna(); },
    suAzione: (id, campi) => { esegui((m) => modificaAzione(m, { id, ...campi }), `azione ${id}: ${Object.keys(campi).join(", ")}`); ridisegna(); },
    suCarico: (idAzione, indice, carico) => { esegui((m) => modificaCarico(m, { azione: idAzione, indice, carico }), `carico ${indice + 1} dell'azione ${idAzione}`); ridisegna(); },
    suTogliCarico: (idAzione, indice) => { esegui((m) => togliCarico(m, { azione: idAzione, indice }), `via il carico ${indice + 1} dell'azione ${idAzione}`); ridisegna(); },
    suAggiungiCarico: (idAzione, tipo) => { aggiungiCaricoVuoto(idAzione, tipo); ridisegna(); },
    suCombinazione: (id, campi) => { esegui((m) => modificaCombinazione(m, { id, ...campi }), `combinazione ${id}: ${Object.keys(campi).join(", ")}`); ridisegna(); },
    // Metti, cambia e togli sono tre gesti diversi che scrivevano la stessa riga nella Storia:
    // «termine 1 della combinazione 1», tre volte, e l'annulla non diceva più a cosa tornava.
    // Il nome dell'azione e il coefficiente le distinguono (P4).
    suTermine: (idCombinazione, idAzione, coefficiente) => {
      const nome = azione(corrente(cronologia), idAzione)?.nome ?? idAzione;
      esegui((m) => impostaTermine(m, { id: idCombinazione, azione: idAzione, coefficiente }),
             coefficiente === null
               ? `via il termine «${nome}» dalla combinazione ${idCombinazione}`
               : `termine «${nome}» della combinazione ${idCombinazione}: ${stampaNumero(coefficiente, { decimali: 2 })}`);
      ridisegna();
    },
    // Un numero illeggibile in un campo dell'editor è un avviso, non un comando: non entra
    // nella Storia e non tocca il modello — il campo si rimette da solo sul valore di prima.
    suAvviso: dì,
    // Una voce della Storia per nodo, come un vincolo scritto a mano: ⌘Z le disfa una per una,
    // che è il patto della cronologia lineare (nessuna voce composita solo per «conferma tutte»).
    suConfermaVincolo: (id) => {
      const v = rilievo ? propostaPerNodo(rilievo, id) : null;  // senza rendiconto niente da confermare
      if (!v) return;
      esegui((m) => impostaVincolo(m, { id, vincolo: v }), `vincolo del nodo ${id} dal rilievo: ${descrizione(v)}`);
      ridisegna();
    },
    suConfermaTutti: () => {
      for (const p of proposteAperte(rilievo, corrente(cronologia))) {
        esegui((m) => impostaVincolo(m, { id: p.nodo, vincolo: p.vincolo }),
               `vincolo del nodo ${p.nodo} dal rilievo: ${descrizione(p.vincolo)}`);
      }
      ridisegna();
    },
  },
);
// Senza `await`, e non per eleganza: `import("./vendor/three.module.js")` sono 2 MB, e con
// l'attesa qui in cima il `keydown` là in fondo si registrava **dopo**. La pagina pareva
// pronta — colonna disegnata, «Premi N» negli stati vuoti — e la tastiera era morta: i tasti
// del primo secondo cadevano nel vuoto senza che niente lo dicesse (P5, «attesa parlante»).
// Adesso i listener ci sono dal primo disegno e la vista 3D si aggiunge quando arriva; nel
// frattempo `#spazio` porta scritto che sta caricando, che è l'altra metà di P5.
let spazio = null;
creaSpazio($("spazio")).then((s) => { spazio = s; ridisegna(); });
const storia = creaStoria($("storia-elenco"), {
  suSalto: (i) => {
    if (i === cronologia.indice) return;  // già lì: nessun ridisegno inutile
    cronologia = vaiA(cronologia, i);
    ridisegna();
  },
});
const file = creaFile(document, {
  suApertura: (p, m, i) => {
    cronologia = nuovaCronologia(m, `aperto ${p}`);
    // Un modello nuovo (aperto o importato) non porta con sé l'ultima corsa di un altro (R5),
    // né la vista che ne mostrava i numeri. Il solido cade con il telaio: il file dei suoi
    // risultati resta valido su disco, ma la sua pertinenza al modello aperto adesso no, e
    // `confronto.azzera()` rimette il campo a «mai toccato» — il ridisegno subito dopo lo
    // ricompilerebbe col solido di prima, e sarebbe telaio B contro solido A senza un segnale.
    corsa.azzera();
    risultati = null;
    ultimoTelaio = null; ultimoSolido = null; confronto.azzera();
    // Anche il campo, non solo selezione e modo: il bersaglio è congelato per id, gli id
    // ripartono da 1 in ogni file, e la guardia di `ridisegna` chiede che il bersaglio
    // *esista*, non che sia dello stesso modello. Senza questo, «sposta il nodo 3» aperto
    // sul file di prima confermava sul nodo 3 del file appena aperto.
    chiudiComando();
    selezione = null; modo = null;
    // Gli id ripartono da 1 in ogni file: l'azione 3 di prima non è l'azione 3 di adesso, e
    // `azioneDestinazione` cadrebbe su un'omonima. Azzerata, il piano mostra l'ultima del file.
    azioneCorrente = null;
    percorso = p; impronta = i;
    // Il rendiconto di un'importazione precedente non sopravvive a un file aperto sul serio.
    rilievo = null;
    dì(null);
    ridisegna();
  },
  // Salvare non tocca né il modello né la cronologia: cambia solo l'impronta di riferimento.
  suSalvataggio: (p, i) => { percorso = p; impronta = i; dì(null); ridisegna(); },
  // Il prior come modello: cronologia nuova (non è un `⌘Z` su ciò che c'era prima), nessun
  // percorso — il modello non è su disco, e `⌘S` deve chiedere dove (`file.js:importa` ha già
  // svuotato il campo, che porta ancora il percorso del prior).
  suImportazione: (p, m, risposta) => {
    cronologia = nuovaCronologia(m, etichettaStoria(daRisposta(risposta, p)));
    rilievo = daRisposta(risposta, p);
    corsa.azzera();  // idem: una cronologia nuova non porta l'ultima corsa (R5)
    risultati = null;
    ultimoTelaio = null; ultimoSolido = null; confronto.azzera();
    chiudiComando();
    selezione = { tipo: "rilievo", id: 0 };
    modo = null;
    azioneCorrente = null;
    percorso = null; impronta = null;
    dì(null);
    ridisegna();
  },
  suErrore: (msg) => dì(msg),
});
// Il percorso aperto, non il campo: il campo è la sorgente di `apri`. `null` solo finché
// non c'è nessun modello aperto, ed è l'unica volta in cui salva legge il campo.
$("file-salva").addEventListener("click", () => file.salva(percorso, corrente(cronologia)));

// La corsa: `modello` letta al gesto (non qui), `suVai` riusa la stessa `scegli` di piano e
// albero, `suEsito` si limita a ridisegnare — la versione di OpenSees la aggiorna `corsa.js` da sé.
const corsa = creaCorsa(document, {
  modello: () => corrente(cronologia),
  suVai: ({ tipo, id }) => scegli(tipo, id),
  suErrore: (msg) => dì(msg),
  // Una corsa con risultati diventa la vista: parte dalla deformata, primo caso. Una corsa
  // senza (rifiutata, in errore, del solido) azzera la vista: i diagrammi di prima parlerebbero
  // di una corsa che non è più l'ultima. La `verifica` (esito `null`) non tocca niente.
  // Il messaggio «già in corso» lo toglie `corsa.js`, che sa se è suo.
  suEsito: (esito) => {
    if (esito === null) { ridisegna(); return; }
    // Una corsa rifiutata o in errore è comunque «l'ultima»: `percorsoRisultati` la scarta se non
    // ha cartella, e `casiCorsi` dà `[]`.
    if (esito.solido) ultimoSolido = esito; else ultimoTelaio = esito;
    // `vociDelCaso` e non `casiDi`: dalla 14a una corsa può portare modi e passi senza nessun
    // caso statico (una modale sola), e partire dal primo caso di `casiDi` vorrebbe dire
    // buttare via dei risultati che ci sono. La prima voce del menu è il caso di partenza.
    const voci = vociDelCaso({ lavoro: esito });
    risultati = voci.length
      ? { lavoro: esito, vista: "deformata", caso: voci[0].valore, scalaMano: null, passo: null, animazione: "va" }
      : null;
    ridisegna();
  },
  // Un ghost aperto (estrusione o asta) va chiuso a mano prima di correre: vale per i bottoni
  // del blocco come per ⌘⏎, e `AVVISO_SECONDO_NODO` parlerebbe della cosa sbagliata.
  prima: () => (modo ? "chiudi il gesto (Esc) prima di correre" : null),
});
// Il blocco «Risultati» e la striscia dell'M srotolato: leggono lo stato, non lo tengono.
// `esito` riceve lo **stato** (con `lavoro`), `srotolato` e `piano` la **vista** (R10).
const esito = creaEsito(document, {
  // Il passo torna a `null` (l'ultimo) a ogni cambio di caso: il passo 37 della pushover non
  // vuol dire niente sul modo 2, e riportarlo indietro tornando alla pushover sarebbe una
  // memoria che nessuno ha chiesto. L'animazione invece resta: è una preferenza di chi guarda.
  // Il caso che cambia azzera anche la **fase**: quella su cui si era fermato il modo 2 non vuol
  // dire niente sul modo 6, e riprenderla lo disegnava a metà corsa col badge «ferma» di prima.
  suCambio: ({ caso, vista, scalaMano }) => {
    if (!risultati) return;
    if (caso !== risultati.caso) animazione.azzera();
    risultati = { ...risultati, caso, vista, scalaMano, passo: null };
    ridisegna();
  },
  suAvviso: dì,   // una scala illeggibile torna ad auto, e la riga del messaggio lo dice
});
const confronto = creaConfronto(document, { suErrore: (msg) => dì(msg) });
// Il clic sulla curva della pushover: la striscia dice **quale** passo, lo stato lo tiene qui.
const srotolato = creaSrotolato($("srotolato"), {
  suPasso: (k) => { if (risultati) { risultati = { ...risultati, passo: k }; ridisegna(); } },
});
// L'animazione dei modi: un fotogramma ridisegna **solo** piano, striscia e 3D — non
// `ridisegna()` intero, che rifarebbe albero, pannello e barra sessanta volte al secondo per
// un disegno che è l'unica cosa a muoversi (Global Constraints). `movimentoRidotto()` non si
// chiama qui dentro: la legge `ridisegna` (R13).
const animazione = creaAnimazione({
  suFotogramma: (fattore) => {
    const m = corrente(cronologia);
    const inVista = disegnaPiano(m, fattore, { striscia: false });
    spazio?.disegna(m, { selezione, deformata: deformataInVista(m, inVista) });
  },
});

// La riga del solutore prima di qualunque gesto. Un secondo tentativo dopo un attimo: un
// ricaricamento mentre la `verifica` di prima è ancora sul sidecar prende un 409, e senza il
// secondo giro la riga restava «in verifica…» per sempre (visto sul Chrome headless).
const chiediSalute = (ritenta) => chiediJson("/api/salute")
  .then((s) => corsa.impostaSolutore(s.solutore))
  .catch((e) => { if (ritenta) setTimeout(() => chiediSalute(false), 1500); else dì(e.message); });
chiediSalute(true);

// La palette non è un secondo programma: passa voce e valore ai rami del tasto, e l'esito è
// quello del tasto **a gesto chiuso**. **R2** — se esegue, abbandona campo e modo insieme:
// cercare un comando mentre se ne stava facendo un altro è un ripensamento, e un ghost appeso a
// un gesto che nessuno finirà più è peggio di niente. Da qui l'elenco che le si passa: senza il
// modo non c'è più niente da girare né da confermare, e `direzione` e `conferma` sarebbero due
// voci che non fanno nulla; `palette` dentro la palette la farebbe lampeggiare.
//
// Chi la chiude con Esc invece non ha ripensato niente: `chiudi` non passa da `suScelta`, e il
// campo di prima è ancora lì col suo testo — `suChiusura` gli rimette il fuoco, che se no
// restava sul `body` e le cifre battute dopo non arrivavano da nessuna parte.
const VOCI_PALETTE = TASTI.filter((v) => !["direzione", "conferma", "palette"].includes(v.codice));
const palette = creaPalette($("palette"), {
  suScelta: (voce, valore) => { chiudiComando(); eseguiVoce(voce, valore); ridisegna(); },
  suChiusura: () => { if (comando) campoComando.focus(); },
});

// Aprire un modo lo rende il gesto della tastiera globale, quindi il fuoco deve lasciare
// il controllo su cui si trovava: `pannello.js` lo riporta apposta sul bottone dopo ogni
// ridisegno, e `Invio` su un bottone a fuoco lo **attiva** invece di confermare il gesto che
// la barra sta annunciando — si riscriverebbe il vincolo invece di chiudere l'asta.
function apriModo(nuovo) {
  modo = nuovo;
  document.activeElement?.blur?.();
  ridisegna();
}

// --- Il campo di comando -------------------------------------------------------------
// La differenza con `prompt` è tutta qui: mentre è aperto la pagina resta viva, il modello
// si vede, e il ghost si muove a ogni tasto invece di comparire dopo la conferma (P2, P4).

const rigaComando = $("comando");
const campoComando = $("comando-campo");
const etichettaComando = rigaComando.querySelector("label");
const aiutoComando = rigaComando.querySelector(".aiuto");

/** Apre il campo per una voce della tastiera (`N`, `B`, `M`, `R`). L'etichetta, l'aiuto e il
 *  segnaposto vengono da lì: la barra e il campo dicono la stessa cosa perché la leggono
 *  dallo stesso elenco. `bersaglio` è la selezione **al momento del tasto**, congelata: da
 *  aperto il campo non blocca più la pagina, e un clic nel piano sposterebbe la selezione
 *  sotto i piedi del comando — con `prompt` era impossibile, adesso no.
 *
 *  Congelato **e** scritto: l'etichetta nomina il bersaglio (`etichettaCampo`), perché un
 *  bersaglio che non si muove mentre la selezione si muove, e non è detto da nessuna parte,
 *  agisce su un nodo diverso da quello evidenziato a schermo. */
function apriComando(voce, { bersaglio = null, esempio = voce.esempio } = {}) {
  comando = { tipo: voce.codice, testo: "", bersaglio };
  campoComando.value = "";
  etichettaComando.textContent = etichettaCampo(voce, bersaglio);
  campoComando.placeholder = esempio;
  aiutoComando.textContent = voce.aiuto ?? "";
  dì(null);       // un errore di prima non resta a schermo sopra un campo appena aperto
  ridisegna();    // prima: il campo è `hidden` finché non serve, e `hidden` non prende fuoco
  campoComando.focus();
}

/** Chiude il campo e con lui il modo che gli appartiene: estrudendo il verso sta nel `modo`
 *  e la misura nel campo, quindi sono un gesto solo e si chiudono insieme — lasciare il modo
 *  aperto vorrebbe dire un ghost senza più nessuno che gli detti la lunghezza. Non ridisegna:
 *  chi chiude ridisegna comunque, e `ridisegna` chiude a sua volta quando il bersaglio sparisce. */
function chiudiComando() {
  comando = null;
  modo = null;
  campoComando.value = "";
  // Misurato in Chrome (09/09): un campo nascosto con `hidden` **tiene** il fuoco, e
  // `daControllo` continua a lasciargli i tasti — `Z` dopo un Invio non apriva niente e le
  // lettere finivano in un campo che nessuno vedeva. Il fuoco si toglie qui, a mano.
  if (document.activeElement === campoComando) campoComando.blur();
}

// Il testo è la sorgente del ghost, quindi ogni tasto ridisegna. `comando.testo` rispecchia
// il campo e non il contrario: riscrivere `value` a ogni ridisegno sposterebbe il cursore.
// `dì(null)` per la stessa ragione per cui lo fa `apriComando`: l'errore di prima parla di un
// testo che non c'è più, e un rosso sopra un campo che si sta scrivendo è un rimprovero a
// metà parola (`modo.js`, «un testo a metà non è un testo sbagliato»).
campoComando.addEventListener("input", () => {
  comando = { ...comando, testo: campoComando.value };
  dì(null);
  ridisegna();
});

// Esc e le frecce qui e non nel listener globale: `daControllo` si tiene ogni tasto che arriva
// da un campo di testo — è la stessa regola per cui `n` lì dentro scrive una lettera.
campoComando.addEventListener("keydown", (ev) => {
  if (ev.key === "Escape") {
    ev.preventDefault();
    chiudiComando();
    dì(null);
    ridisegna();
    return;
  }
  // Estrudendo la freccia gira il ghost invece di muovere il cursore: è il gesto obbligatorio
  // — la lunghezza si sta scrivendo, la direzione non la dà nient'altro — ed è quello che la
  // barra promette. Il prezzo, dichiarato: mentre si estrude ←→ non spostano il cursore nel
  // testo. Negli altri comandi la freccia resta del campo, e questo `if` non scatta.
  const girato = ruotaGhost(modo, ev.key);
  if (!girato) return;
  ev.preventDefault();
  modo = girato;
  ridisegna();
});

// Invio conferma perché il campo sta in un `<form>`: è il comportamento della piattaforma,
// non un tasto da riconoscere a mano. Da qui in poi ogni comando che chiedeva un testo passa
// di qui, e `window.prompt` non esiste più in nessuna strada del programma (P2).
rigaComando.addEventListener("submit", (ev) => {
  ev.preventDefault();
  conferma();
});

/** Il dispatch della conferma, fuori dal listener: `Invio` nel campo non è l'unica strada che
 *  porta qui. Il campo chiuso non ha niente da confermare, e tacere è la risposta giusta. */
function conferma() {
  if (!comando) return;
  if (comando.tipo === "estrudi") return confermaEstrusione();
  if (comando.tipo === "rinomina") return confermaNome();
  if (comando.tipo === "sezione") return confermaSezione();
  if (comando.tipo === "materiale") return confermaMateriale();
  if (comando.tipo === "danno") return confermaDanno();
  if (comando.tipo === "azione") return confermaAzione();
  if (comando.tipo === "carico") return confermaCarico();
  if (comando.tipo === "combinazione") return confermaCombinazione();
  // `nodo` e `sposta`: la stessa grammatica, «x; z». Esplicito e non per caduta, perché un
  // tipo nuovo dimenticato qui prendeva la grammatica del punto e leggeva «x; z» in un campo
  // che chiedeva altro — in silenzio. Ora si rompe subito, e dice quale tipo manca.
  if (comando.tipo === "nodo" || comando.tipo === "sposta") return confermaPunto();
  throw new Error(`comando senza conferma: ${comando.tipo}`);
}

// Campo vuoto: niente da eseguire **e** niente da dire. Un testo che c'è ma non si legge
// parla, e solo adesso — mentre si scriveva era un testo a metà, non uno sbagliato.
function confermaPunto() {
  const { punto, messaggio } = esitoComando(comando.testo);
  if (!punto) { if (messaggio) dì(messaggio); return; }
  const { x, z } = punto;
  if (comando.tipo === "sposta") {
    const id = comando.bersaglio.id;
    if (!esegui((m) => spostaNodo(m, { id, x, z }), `sposta nodo ${id}`)) { ridisegna(); return; }
    // Le aste seguono da sole: referenziano l'identificatore, non le coordinate.
    chiudiComando();
    ridisegna();
    return;
  }
  // Le stesse cifre dell'albero, e l'unità su ogni numero (PRODUCT.md): la cronologia
  // scriveva «nodo 1200; 3300» dove l'albero dice «1 200 mm; 3 300 mm» — due convenzioni
  // per lo stesso nodo, a due dita di distanza nella stessa pagina.
  const fatto = esegui((m) => creaNodo(m, { x, z }), `nodo ${quota(x)}; ${quota(z)}`);
  if (!fatto) { ridisegna(); return; }  // rifiutato (un nodo c'era già lì): il campo resta col testo
  // Il nodo appena posato è selezionato: è da lì che si estrude, e senza questo servirebbe
  // il mouse per riprenderlo — con il Goal che dice «senza il mouse».
  const m = corrente(cronologia);
  selezione = { tipo: "nodo", id: m.nodi[m.nodi.length - 1].id };
  chiudiComando();
  ridisegna();
}

// Estrude **il ghost che si sta guardando**, non un secondo conto sullo stesso testo: se il
// ghost non c'è non c'è niente da confermare, e il perché lo dice `esitoLunghezza` — che tace
// sul campo vuoto e parla su zero, negativo e illeggibile.
function confermaEstrusione() {
  const g = ghostDelComando(comando, modo);
  if (!g) {
    const { messaggio } = esitoLunghezza(comando.testo);
    if (messaggio) dì(messaggio);
    return;
  }
  if (esegui((m) => estrudi(m, g), `asta da ${g.da}`)) {
    // La punta è il `nodo_j` dell'asta appena nata, non l'ultimo nodo dell'elenco: quando
    // l'estrusione arriva su un nodo che c'era già, di nodi non ne nasce nessuno.
    const m = corrente(cronologia);
    selezione = { tipo: "nodo", id: m.aste[m.aste.length - 1].nodo_j };
    chiudiComando();
  }
  ridisegna();
}

// Il nome vuoto e quello di soli spazi li tratta `comandi.js:rinomina`, che è dove la regola
// stava già: il campo non ne scrive una seconda che diverga alla prima riflessione.
function confermaNome() {
  const { tipo, id } = comando.bersaglio;
  const nome = comando.testo;
  if (esegui((m) => rinomina(m, { tipo, id, nome }), `nome di ${tipo} ${id}`)) chiudiComando();
  ridisegna();
}

// `S` fa due cose con una grammatica sola, perché all'utente sono la stessa: dare una
// sezione a un'asta. «300 × 500» la disegna e gliela dà, il nome di una che c'è già gliela
// dà e basta — e nella Storia resta **una** voce, che dice tutto quello che è successo
// (P4: l'annulla è visibile solo se le sue voci sono leggibili).
function confermaSezione() {
  const testo = comando.testo.trim();
  if (testo === "") return;
  const m = corrente(cronologia);
  const dims = leggiDimensioni(testo);
  const esistente = dims ? null : m.sezioni.find((s) => s.nome === testo || String(s.id) === testo);
  if (!dims && !esistente) { dì(`«${testo}» non è né b × h né il nome di una sezione`); return; }
  const asta = comando.bersaglio?.id ?? null;
  // Il nome di una sezione che c'è già, e nessuna asta a cui darla: il modello non cambia.
  // Selezionarla e basta — una voce della Storia che non ha cambiato niente è una bugia
  // dentro l'unica lista che dice cosa è successo.
  if (!dims && asta === null) {
    selezione = { tipo: "sezione", id: esistente.id };
    chiudiComando();
    ridisegna();
    return;
  }
  // L'etichetta della Storia si compone **prima**: `applica` la riceve insieme al riduttore.
  // `materialiDiDefault` è pura e costa niente: qui dice cosa nascerà, dentro il riduttore
  // lo fa davvero sul modello che riceve.
  const { aggiunti } = dims ? materialiDiDefault(m) : { aggiunti: [] };
  const etichetta = (dims ? `sezione ${millimetri(dims.b)} × ${millimetri(dims.h)} mm` : `sezione ${esistente.nome}`)
    + (aggiunti.length ? `, con ${aggiunti.join(" e ")}` : "")
    + (asta !== null ? ` → asta ${asta}` : "");
  const fatto = esegui((stato) => {
    // Senza dimensioni resta solo l'assegnazione: il ramo «nome esistente e nessuna asta» è
    // già uscito qui sopra, quindi qui `asta` c'è per forza.
    if (!dims) return assegnaSezione(stato, { asta, sezione: esistente.id });
    // I due `find` non tornano `null` perché i materiali li ha appena messi la riga sopra:
    // gli id si prendono dal modello che `materialiDiDefault` restituisce, non da uno cercato
    // altrove dove la dipendenza non si vedrebbe.
    const conMateriali = materialiDiDefault(stato).modello;
    const cls = conMateriali.materiali.find((k) => k.tipo === "calcestruzzo").id;
    const acc = conMateriali.materiali.find((k) => k.tipo === "acciaio").id;
    const n = creaSezione(conMateriali, { b: dims.b, h: dims.h, calcestruzzo: cls, acciaio: acc });
    const id = n.sezioni[n.sezioni.length - 1].id;
    return asta === null ? n : assegnaSezione(n, { asta, sezione: id });
  }, etichetta);
  if (!fatto) { ridisegna(); return; }  // rifiutato: il campo resta col testo
  // Senza asta la sezione appena nata è il soggetto: l'editor si apre su di lei. Con l'asta
  // la selezione resta l'asta, che è quella che si sta armando.
  if (asta === null) { const n = corrente(cronologia); selezione = { tipo: "sezione", id: n.sezioni[n.sezioni.length - 1].id }; }
  chiudiComando();
  ridisegna();
}

// Il tipo lo dice la classe, non un secondo campo da scegliere: «C» e «B» sono le lettere
// della norma, e chiederlo due volte sarebbe chiedere all'utente di ripetersi.
function confermaMateriale() {
  const classe = comando.testo.trim();
  if (classe === "") return;
  const tipo = /^c\s*\d/i.test(classe) ? "calcestruzzo" : /^b\s*\d/i.test(classe) ? "acciaio" : null;
  if (!tipo) { dì("una classe comincia per C (calcestruzzo, C25/30) o per B (acciaio, B450C)"); return; }
  // `classi` solo se il catalogo è arrivato: senza server la classe si scrive comunque, ed
  // è il salvataggio a dire di no — meglio che un campo muto che rifiuta tutto (P5).
  if (esegui((m) => creaMateriale(m, { tipo, classe, classi: catalogo?.[tipo] ?? null }), `materiale ${classe}`)) {
    const n = corrente(cronologia);
    selezione = { tipo: "materiale", id: n.materiali[n.materiali.length - 1].id };
    chiudiComando();
  }
  ridisegna();
}

// «fE; ffc[; nota]», con il `;` di «x; z»: una grammatica sola per tutto il campo. I due
// fattori passano da `leggiEspressione`, quindi «1/1,25» vale quanto «0,8» (P9); i limiti
// (fra 0 escluso e 1) restano a `impostaDanno`, che è dove la regola sta già.
function confermaDanno() {
  if (comando.testo.trim() === "") return;
  const parti = comando.testo.split(";").map((p) => p.trim());
  if (parti.length < 2) { dì("scrivi due fattori, «E; fc», e se vuoi una nota: «0,8; 0,9; martinetto 3»"); return; }
  const [fattore_E, fattore_fc] = parti.slice(0, 2).map(leggiEspressione);
  const asta = comando.bersaglio.id;
  if (esegui((m) => impostaDanno(m, { asta, danno: { fattore_E, fattore_fc, nota: parti.slice(2).join("; ") } }),
             `danno dell'asta ${asta}`)) chiudiComando();
  ridisegna();
}

// --- azioni, carichi, combinazioni (story 26, 27, 28) --------------------------------------

// `leggiAzione` tace sul campo vuoto e parla su tutto il resto, come `esitoComando`: un testo a
// metà non è un testo sbagliato. Il nome dell'azione entra nella Storia, non il suo id — è
// quello che si è appena scritto, e l'annulla è visibile solo se le sue voci si leggono (P4).
function confermaAzione() {
  const { azione: letta, messaggio } = leggiAzione(comando.testo);
  if (messaggio) { dì(messaggio); return; }
  if (!letta) return;
  if (esegui((m) => creaAzione(m, letta), `azione «${letta.nome}» ${letta.natura}${letta.categoria ? ` ${letta.categoria}` : ""}`)) {
    const n = corrente(cronologia);
    // L'azione appena nata è quella a cui `Q` darà il carico: è il gesto che segue, sempre.
    azioneCorrente = n.azioni[n.azioni.length - 1].id;
    selezione = { tipo: "azione", id: azioneCorrente };
    chiudiComando();
  }
  ridisegna();
}

// Bersaglio **e** azione arrivano congelati dall'apertura del campo: da aperto la pagina resta
// viva, e un clic nel piano o nell'albero sposterebbe sotto i piedi del comando sia il nodo sia
// l'azione. L'etichetta nomina il primo, l'aiuto la seconda.
function confermaCarico() {
  const { tipo, id } = comando.bersaglio;
  const letto = tipo === "nodo" ? leggiNodale(comando.testo) : leggiDistribuito(comando.testo);
  if (letto.messaggio) { dì(letto.messaggio); return; }
  if (!letto.carico) return;
  const carico = tipo === "nodo"
    ? { tipo: "nodale", nodo: id, ...letto.carico }
    : { tipo: "distribuito", asta: id, ...letto.carico };
  const dest = comando.azione;
  const nome = azione(corrente(cronologia), dest)?.nome ?? String(dest);
  if (esegui((m) => aggiungiCarico(m, { azione: dest, carico }), `carico su ${tipo} ${id} → ${nome}`)) chiudiComando();
  ridisegna();
}

function confermaCombinazione() {
  const { combinazione: letta, messaggio } = leggiCombinazione(comando.testo);
  if (messaggio) { dì(messaggio); return; }
  if (!letta) return;
  if (esegui((m) => creaCombinazione(m, letta), `combinazione «${letta.nome}»${letta.tipo ? ` ${letta.tipo}` : ""}`)) {
    const n = corrente(cronologia);
    selezione = { tipo: "combinazione", id: n.combinazioni[n.combinazioni.length - 1].id };
    chiudiComando();
  }
  ridisegna();
}

/** Il «+» dell'editor: il carico vuoto del suo tipo, sul primo bersaglio del modello. Da lì si
 *  corregge nei campi, che si vedono — chiedere prima il nodo vorrebbe dire un secondo campo
 *  per un valore che poi si cambia comunque. Senza bersaglio non nasce, e dice cosa manca. */
function aggiungiCaricoVuoto(idAzione, tipo) {
  const m = corrente(cronologia);
  const { carico, messaggio } = caricoVuoto(m, tipo);
  if (!carico) { dì(messaggio); return; }
  const nome = azione(m, idAzione)?.nome ?? String(idAzione);
  esegui((s) => aggiungiCarico(s, { azione: idAzione, carico }), `carico ${NOME_TIPO[tipo] ?? tipo} → ${nome}`);
}

function esegui(fn, etichetta) {
  try {
    cronologia = applica(cronologia, fn, etichetta);
    dì(null);
    return true;
  } catch (e) {
    if (!(e instanceof ErroreComando)) throw e;  // un difetto del programma non si traveste da messaggio
    dì(e.rimedio ? `${e.message} — ${e.rimedio}` : e.message);
    return false;
  }
}

/** I numeri della corsa per l'ispettore: `{perCaso, caso, etichetta, modo}` presi dallo stato,
 *  senza passare dalla vista. `null` quando non c'è una corsa, o quando il caso scelto non è fra
 *  quelli corsi. L'etichetta è la chiave **in parole** — «modo 2», «pushover, passo 37» — perché
 *  nell'ispettore il termine si legge accanto ai numeri, e «modo:2» è la chiave grezza. */
function perCasoDelloStato() {
  const scelto = casoScelto(risultati, risultati?.caso, risultati?.passo);
  if (!scelto) return null;
  const etichetta = scelto.tipo === "modo" ? `modo ${scelto.n}`
    : scelto.tipo === "pushover" ? `pushover, passo ${scelto.k + 1}` : risultati.caso;
  return { perCaso: scelto.perCaso, caso: risultati.caso, etichetta, modo: scelto.modo ?? null };
}

/** La fase con cui disegnare **adesso**: quella dell'animazione se il caso è un modo e il sistema
 *  non chiede meno movimento, altrimenti 1 — la forma al massimo (D2a). La leggono `ridisegna` e
 *  il listener del `resize`: scritta in un posto solo perché il resize la sbagliava, ridisegnando
 *  a 1 un modo fermato a metà corsa e facendogli saltare la forma al massimo, dove restava.
 *  `motoRidotto` è quello letto all'ultimo gesto, mai rinfrescato qui (R13). */
const fattoreCorrente = () =>
  (risultati && tipoDelCaso(risultati.caso) === "modo" && !motoRidotto ? animazione.fattore() : 1);

/** La deformata per il 3D: la **stessa** del piano, fattore dell'animazione compreso. Scritta una
 *  volta perché `ridisegna` e il fotogramma la chiedano identica — due espressioni in due punti
 *  divergono al primo argomento aggiunto, e il 3D resterebbe fermo mentre il piano respira. */
const deformataInVista = (m, inVista) => (inVista?.vista === "deformata"
  ? { aste: puntiDeformata(m, inVista.perCaso, inVista.scala * inVista.fattore), stantia: inVista.stantia, uMax: inVista.uMax }
  : null);

/** Il piano e la striscia: i due che si misurano in pixel del proprio riquadro, e i soli che il
 *  `resize` deve rifare. Estratta perché `ridisegna` e il listener la chiamino con gli **stessi**
 *  argomenti: due `piano.disegna` scritte in due punti divergono al primo argomento aggiunto, e il
 *  disegno cambierebbe a seconda di chi l'ha chiesto. Rende la vista dei risultati, che serve anche
 *  a chi viene dopo (spazio e pannello). */
function disegnaPiano(m, fattore = 1, { striscia = true } = {}) {
  const ghost = comando ? ghostDelComando(comando, modo) : ghostDisegnabile(m, modo);
  const inVista = risultatiInVista(m, fattore);
  piano.disegna(m, { selezione, ghost, azioneInVista: azioneDestinazione(m),
                     proposte: rilievo ? proposteAperte(rilievo, m) : [], risultati: inVista });
  // La striscia non cambia da un fotogramma all'altro — l'M srotolato non c'è per un modo, e la
  // curva della pushover non si anima — quindi il ciclo la salta: ricostruirla sessanta volte al
  // secondo per rimettere in pagina lo stesso testo è lavoro per niente.
  if (striscia) srotolato.disegna({ risultati: inVista, modello: m, selezione });
  return inVista;
}

function ridisegna() {
  const m = corrente(cronologia);
  // R13: la preferenza di sistema si legge qui, al gesto, e mai dentro `suFotogramma`.
  motoRidotto = movimentoRidotto();
  // Sette tipi selezionabili da quando l'albero porta anche il rilievo: un tipo che non è
  // nell'elenco non esiste, e la selezione cade — non solleva.
  const esiste = (s) => ({ nodo: m.nodi, asta: m.aste, sezione: m.sezioni, materiale: m.materiali,
                           azione: m.azioni, combinazione: m.combinazioni,
                           rilievo: rilievo ? [{ id: 0 }] : [] }[s.tipo] ?? [])
    .some((e) => e.id === s.id);
  // Una selezione che punta a un oggetto sparito è peggio di nessuna selezione.
  if (selezione && !esiste(selezione)) selezione = null;
  // ⌘Z che disfa la creazione dell'azione corrente la fa sparire: senza questo il piano
  // disegnerebbe le frecce di un'azione che non c'è più. Azzerata, si torna all'ultima rimasta.
  if (azioneCorrente !== null && !azione(m, azioneCorrente)) azioneCorrente = null;
  // Il nodo di partenza di un modo sparito è nella stessa condizione di una selezione sparita.
  modo = modoValido(m, modo);
  // E il bersaglio di un comando aperto pure: ⌘Z lavora anche col campo aperto, e un campo
  // che chiede il nome di un nodo appena disfatto non ha più a chi parlare.
  if (comando?.bersaglio && !esiste(comando.bersaglio)) chiudiComando();
  // E l'azione a cui il campo consegna il carico: `Q` la fissa quando si apre (`comando.azione`),
  // e un ⌘Z col campo aperto la può portare via — `esiste` non la guarda, perché l'azione non è
  // il bersaglio della selezione.
  if (comando?.azione != null && !azione(m, comando.azione)) chiudiComando();

  // Un ghost solo, di due forme: la punta dell'asta — dal modo, o dal campo mentre si scrive
  // la lunghezza — oppure il punto in anteprima. Il secondo non è un `{da, dx, dz}`, non
  // parte da nessun nodo, e darglielo vorrebbe dire inventargli un'origine: `piano.js` lo
  // riconosce da `punto`.
  rigaComando.hidden = !comando;
  // L'animazione si decide **prima** del disegno, perché la fase da disegnare è la sua: ferma su
  // un modo la forma resta dov'era, non salta al massimo. Col moto ridotto invece il massimo è
  // proprio quel che D2a chiede, e con un caso che non è un modo il fattore non serve a nessuno.
  const animare = risultati?.animazione === "va" && risultati.vista === "deformata"
    && tipoDelCaso(risultati.caso) === "modo" && !motoRidotto;
  if (animare) animazione.avvia(); else animazione.ferma();
  const inVista = disegnaPiano(m, fattoreCorrente());
  // finché three.js non è arrivato, il piano regge da solo
  spazio?.disegna(m, { selezione, deformata: deformataInVista(m, inVista) });
  albero.disegna(m, { selezione, rilievo });
  const scelto = selezione?.tipo === "materiale" ? materiale(m, selezione.id) : null;
  pannello.disegna(m, selezione, {
    catalogo,
    legame: scelto ? legamePer(m, selezione.id) : null,
    tabella: scelto ? (tabelle.get(chiaveTabella(scelto)) ?? null) : null,
    rilievo,
    // L'ispettore prende i numeri dallo **stato**, non dalla vista: `0` spegne il disegno, non i
    // valori del nodo selezionato. Con `inVista` premere `0` svuotava anche le righe di
    // spostamenti e reazioni, che con il disegno non c'entrano niente.
    risultati: perCasoDelloStato(),
  });
  file.disegna({ percorso, impronta, modello: m });
  corsa.disegna({ modello: m });
  // `stantia` dallo **stato**, non dalla vista: il blocco «Risultati» c'è anche con `0` premuto,
  // e la riga dell'equilibrio deve dire lo stesso della riga della corsa.
  esito.disegna({ risultati, stantia: risultati ? stantia(risultati.lavoro, m) : false });
  confronto.disegna({ modello: m, telaio: ultimoTelaio, solido: ultimoSolido });
  storia.disegna(etichette(cronologia));
  disegnaBarra();
}

// Il piano si disegna in millimetri per pixel: cambiata la finestra, `s` cambia e con lui tratti,
// etichette e ostacoli — ma nessuno lo ridisegnava, e il disegno restava della misura di prima.
// Solo piano e striscia, non `ridisegna()`: sono i due che misurano il proprio riquadro, mentre
// albero, pannelli e vista 3D dalla larghezza della finestra non dipendono — e lo spazio, a ogni
// giro, ributta via le geometrie e ricalcola `puntiDeformata` per ogni asta.
// Una volta per frame: `resize` arriva a raffica durante il trascinamento del bordo.
let ridisegnoInCoda = false;
window.addEventListener("resize", () => {
  dimenticaMisure();
  if (ridisegnoInCoda) return;
  ridisegnoInCoda = true;
  requestAnimationFrame(() => { ridisegnoInCoda = false; disegnaPiano(corrente(cronologia), fattoreCorrente()); });
});

// Il modo presentazione (story 62): un attributo sul `body`; layout e misure del disegno li cambia
// `stile.css`. Cambiare la griglia non scatena `resize`, quindi dopo ogni cambio `ridisegna()`: piano e
// spazio rileggono le variabili e il proprio riquadro.
const bottonePannelli = $("riapri-pannelli");
const presentazione = () => document.body.hasAttribute("data-presentazione");
/** Lo stato del bottone scritto **a parole**, non solo in `aria-pressed`: premuto, a 8 m cambiava
 *  soltanto un attributo che nessuno vede (C6). E l'uscita dall'aula sta scritta lì sopra, perché
 *  a schermo quello è l'unico bottone e nessuno diceva come si torna indietro (C5). */
const scriviBottonePannelli = (aperti) => {
  bottonePannelli.setAttribute("aria-pressed", String(aperti));
  bottonePannelli.textContent = `${aperti ? "chiudi pannelli" : "pannelli"} · Esc esce`;
};
function alternaPresentazione(accesa = !presentazione()) {
  document.body.toggleAttribute("data-presentazione", accesa);
  // Si entra e si esce coi pannelli ritratti: aperti in un giro non restano aperti al giro dopo.
  document.body.removeAttribute("data-pannelli");
  scriviBottonePannelli(false);
  // Cambia `data-presentazione`/`data-pannelli` senza scatenare un `resize` (15b, Task 6): senza
  // dimenticare la cache, piano e spazio ridisegnerebbero con le misure di prima.
  dimenticaMisure();
  ridisegna();
}
bottonePannelli.addEventListener("click", () => {
  scriviBottonePannelli(document.body.toggleAttribute("data-pannelli"));
  ridisegna();
});

function disegnaBarra() {
  const contesto = contestoBarra(modo, selezione, comando);
  // Il tipo della selezione, non solo il contesto: `D` esiste sulla sola asta, e una barra
  // che lo promette con una sezione selezionata mente (story 14).
  $("barra").replaceChildren(...vociDellaBarra(contesto, selezione?.tipo ?? null, { risultati: Boolean(risultati) }).map((v) => {
    const span = document.createElement("span");
    span.className = "tasto";
    const kbd = document.createElement("kbd"); kbd.textContent = v.tasto;
    kbd.setAttribute("aria-label", nomeTasto(v.tasto));   // «comando invio», non i nomi Unicode dei glifi
    span.append(kbd, document.createTextNode(v.etichetta));
    if (v.aiuto) {
      const aiuto = document.createElement("span");
      aiuto.className = "aiuto"; aiuto.textContent = v.aiuto;
      span.append(aiuto);
    }
    return span;
  }));
}

// Un `keydown` solo su `window`, con la guardia in un posto solo: due listener sulla stessa
// finestra con regole d'ingresso diverse è il difetto, non il sintomo — quello delle frecce
// non ne aveva nessuna e rubava ↑↓←→ anche a chi stava scrivendo nel campo del percorso.
window.addEventListener("keydown", (ev) => {
  // Il controllo a fuoco si tiene i tasti che userebbe — le lettere in un campo, ⌫ e Spazio
  // su un bottone — e lascia passare gli altri: `daControllo` guarda il tasto, non solo il
  // bersaglio, altrimenti spegne dodici comandi ogni volta che il fuoco è su un controllo.
  if (daControllo(ev)) return;
  const voce = voceDaEvento(ev);
  if (!voce) return;

  // Prima del `preventDefault`: senza un'estrusione aperta la freccia non è nostra, e
  // rubarla vorrebbe dire togliere al browser lo scorrimento della pagina.
  if (voce.codice === "direzione") {
    const girato = ruotaGhost(modo, ev.key);
    if (girato) {
      ev.preventDefault();
      modo = girato;
      ridisegna();
      return;
    }
    // Senza ghost e con la pushover scelta, `←`/`→` scorrono i passi: è lo scrubber (D5a). Con
    // un ghost aperto no — la freccia lì è il verso dell'estrusione, e sono due gesti diversi
    // sullo stesso tasto. `↑`/`↓` restano al browser in ogni caso: la corsa ha una direzione sola.
    if (!modo && tipoDelCaso(risultati?.caso) === "pushover" && (ev.key === "ArrowLeft" || ev.key === "ArrowRight")) {
      const s = casoScelto(risultati, "pushover", risultati.passo);
      if (s) {
        ev.preventDefault();
        risultati = { ...risultati, passo: Math.min(s.quanti - 1, Math.max(0, s.k + (ev.key === "ArrowRight" ? 1 : -1))) };
        ridisegna();
      }
    }
    return;
  }
  ev.preventDefault();
  // La cifra premuta **è** il valore della voce `vista`: la stessa strada della palette, dove
  // «vista 2» arriva con `valore: "2"`. Le altre voci il valore non ce l'hanno dal tasto.
  eseguiVoce(voce, voce.codice === "vista" ? ev.key : null);
});

/** Una voce della tastiera, eseguita — dal tasto o dalla palette. Fuori dal listener perché
 *  `ev` qui dentro non serve più: il ramo `direzione`, l'unico che legge `ev.key`, resta di là.
 *  `valore` è quello scritto nella palette dopo il nome del comando; una voce che non apre il
 *  campo lo lascia cadere, che è quello che fa anche il tasto. */
function eseguiVoce(voce, valore = null) {
  dispatchVoce(voce, valore);
  // Il valore entra nel campo appena aperto e conferma subito: se il campo lo rifiuta resta
  // aperto col testo e col messaggio, esattamente come se fosse stato scritto a mano.
  //
  // **R4** — `voce.campo`, non `voce.codice !== "vista"`: la coda esiste per «il valore entra
  // nel campo appena aperto», e il campo lo apre `apriComando`, che è chiamato **solo** da voci
  // con `campo`. Una voce senza campo che porti un valore — `vista` è la prima, non sarà
  // l'ultima — con un campo aperto ma senza fuoco ci scriverebbe dentro «2» e lo confermerebbe:
  // un nodo creato per sbaglio. La guardia nomina la condizione, non la voce.
  if (comando && valore !== null && voce.campo) { campoComando.value = valore; comando.testo = valore; conferma(); }
}

// I rami escono con `return`: la coda di `eseguiVoce` deve girare dopo il dispatch intero, non
// dopo il primo ramo che ha risposto — da qui le due funzioni invece di una.
function dispatchVoce(voce, valore = null) {
  // Esc chiude il gesto aperto, e solo senza gesto esce dalla presentazione: col campo di comando aperto
  // il primo Esc chiude il campo, il secondo esce. La selezione non è un gesto: `G` poi Esc esce.
  if (voce.codice === "annulla") {
    const gesto = Boolean(modo || comando);
    modo = null; chiudiComando(); dì(null);
    if (!gesto && presentazione()) { alternaPresentazione(false); return; }
    ridisegna();
    return;
  }

  // Disfa e rifai funzionano anche con un modo aperto, come annulla: un ghost o un'asta
  // appesi a un nodo appena disfatto si chiudono da soli in `ridisegna` (`modoValido`).
  if (voce.codice === "disfa") {
    const nuova = indietro(cronologia);
    if (nuova !== cronologia) { cronologia = nuova; dì(null); ridisegna(); }
    return;
  }
  if (voce.codice === "rifai") {
    const nuova = avanti(cronologia);
    if (nuova !== cronologia) { cronologia = nuova; dì(null); ridisegna(); }
    return;
  }

  // Apri e salva stanno con disfa e rifai, e **sopra** la guardia del campo: `daControllo`
  // lascia passare il modificatore di comando apposta (è così che ⌘Z funziona mentre si
  // scrive), quindi ⌘S da dentro il campo arriva fin qui — e sotto la guardia finiva a
  // rimettere il fuoco dove già stava, con il `preventDefault` già fatto. Salvare mentre si
  // scrive un nome non faceva niente e non diceva niente.
  if (voce.codice === "apri") { file.apri(); return; }
  if (voce.codice === "salva") { file.salva(percorso, corrente(cronologia)); return; }
  // ⌘I sta con apri e salva, sopra la guardia del campo: da dentro il campo del percorso
  // importa lo stesso, come ⌘O — è lì che il percorso del prior si scrive.
  if (voce.codice === "importa") { file.importa(); return; }

  // ⌘K sta con apri e salva, sopra la guardia del campo: da dentro un comando aperto la palette
  // deve aprirsi lo stesso — è lì che serve di più, quando il comando in corso non è quello che
  // si voleva. Ri-premuto chiude, che è l'altra metà di una scorciatoia che alterna.
  if (voce.codice === "palette") {
    if (palette.aperta) { palette.chiudi(); return; }
    // **R2**: le disponibili si contano a gesto chiuso — né campo né modo — perché la palette
    // chiude entrambi quando esegue. Passando quelli veri, da dentro `B` sarebbe tutto «non
    // ora» mentre invece funziona tutto: la lista direbbe il falso su sé stessa.
    const disponibili = new Set(vociDellaBarra(contestoBarra(null, selezione, null), selezione?.tipo ?? null,
                                               { risultati: Boolean(risultati) }).map((v) => v.codice));
    palette.apri({ voci: VOCI_PALETTE, disponibili });
    return;
  }

  // Col campo aperto il gesto è la scrittura. Da dentro il campo qui arrivano solo le
  // combinazioni col modificatore, già servite qui sopra; ma il fuoco può uscire dal campo
  // con un clic nel piano, e da lì un tasto aprirebbe un secondo comando lasciando due
  // anteprime appese. Torna nel campo.
  if (comando) { campoComando.focus(); return; }

  // Corri e verifica sotto la guardia del campo (un ⌘⏎ mentre si scrive un comando è un Invio
  // sbagliato, non una corsa); la guardia del modo sta in `creaCorsa` (`prima`), una volta sola
  // per tasti e bottoni.
  if (voce.codice === "corri") { corsa.corri(); return; }
  if (voce.codice === "verifica") { corsa.verifica(); return; }

  // P sotto la guardia del campo (mentre si scrive è una lettera) e sopra quella del modo, come la
  // vista: cambiare schermo non è un secondo gesto sul disegno, e in modo asta alterna (R11).
  if (voce.codice === "presentazione") { alternaPresentazione(); return; }

  // La vista dei risultati sta con corri e verifica, sotto la guardia del campo: una cifra
  // mentre si scrivono delle coordinate è parte del numero, non un cambio di vista. Sopra la
  // guardia del modo, invece: guardare i diagrammi non è un secondo gesto sul disegno.
  if (voce.codice === "vista") {
    if (!risultati) { dì("nessuna corsa da mostrare: ⌘⏎ la lancia"); return; }
    // `[null, ...VISTE]` e non una tavola scritta a mano: quella era la quarta copia
    // dell'elenco delle viste, e il giorno di una vista in più tre copie su quattro sarebbero
    // rimaste indietro in silenzio. `0` è «niente», poi `VISTE` nel suo ordine.
    const tavola = [null, ...VISTE];
    const testo = String(valore ?? "").trim();
    const i = testo === "" ? NaN : Number(testo);
    if (!Number.isInteger(i) || i < 0 || i >= tavola.length) { dì(`la vista è una cifra da 0 a ${tavola.length - 1}`); return; }
    risultati = { ...risultati, vista: tavola[i] };
    dì(null); ridisegna();
    return;
  }

  // Spazio ferma e riprende l'animazione del modo (D2a). Solo con un modo scelto: su un caso
  // statico o sulla pushover non c'è niente che si muova, e fermare in silenzio un'animazione
  // che non c'è si legge come un tasto rotto. Con `prefers-reduced-motion` l'alternanza c'è
  // ancora ma non muove niente — a spegnerla è `ridisegna`, e il badge dice perché.
  if (voce.codice === "pausa") {
    if (tipoDelCaso(risultati?.caso) !== "modo") {
      dì("Spazio ferma l'animazione del modo: scegline uno dal menu");
      return;
    }
    risultati = { ...risultati, animazione: risultati.animazione === "va" ? "ferma" : "va" };
    dì(null); ridisegna();
    return;
  }

  // Qui sotto il modo può essere solo l'asta: l'estrusione vive con il campo aperto, e col
  // campo aperto si è già tornati indietro alla riga sopra. Passano conferma, annulla e la
  // selezione, che dell'asta **è** il gesto.
  if (modo && voce.codice !== "conferma" && voce.codice !== "seleziona") {
    dì(AVVISO_SECONDO_NODO);
    return;
  }

  // `N` non chiede più niente: apre il campo, e da lì in poi il ghost segue i tasti.
  // Con un modo già in corso non ci arriva mai — lo ferma la guardia qui sopra, che dice
  // di chiudere prima il ghost. Il comando non parte, e nessuno dei due stati resta appeso.
  if (voce.codice === "nodo") { apriComando(voce); return; }

  if (voce.codice === "seleziona") {
    // G gira fra i nodi in ordine di identificatore. In modo asta è il gesto stesso: passa
    // da `scegli`, che aggiorna anche `modo.a`, non solo `selezione`.
    const m = corrente(cronologia);
    if (m.nodi.length === 0) { dì("nessun nodo da selezionare: premi N"); return; }
    const ids = m.nodi.map((n) => n.id);
    const dove = selezione?.tipo === "nodo" ? ids.indexOf(selezione.id) : -1;
    scegli("nodo", ids[(dove + 1) % ids.length]);
    return;
  }

  if (voce.codice === "estrudi") {
    if (selezione?.tipo !== "nodo") { dì(serveUnNodo("estrudere")); return; }
    // Il modo tiene **solo** la direzione, in su di default: un versore, non una lunghezza —
    // quella la scrive il campo, e il ghost la stende (`ghostDelComando`). Le due metà si
    // aprono insieme e si chiudono insieme (`chiudiComando`), perché sono un gesto solo.
    modo = { tipo: "estrusione", da: selezione.id, dx: 0, dz: 1 };
    apriComando(voce, { bersaglio: { ...selezione } });
    return;
  }

  if (voce.codice === "asta") {
    if (selezione?.tipo !== "nodo") { dì(serveUnNodo("un'asta")); return; }
    apriModo({ tipo: "asta", da: selezione.id, a: null });
    return;
  }

  if (voce.codice === "vincolo") {
    if (selezione?.tipo !== "nodo") { dì(serveUnNodo("il vincolo")); return; }
    const n = nodo(corrente(cronologia), selezione.id);
    const id = selezione.id;
    // `V` alterna fra incastro e libero **dichiarato**: spegnere l'ultimo grado acceso
    // dichiara il nodo libero, non cancella il campo — sono due stati diversi per
    // `nova/check.py:274` (vedi la correzione C3 del brief). Le altre preimpostazioni e i
    // gradi singoli stanno nel pannello, dove si vedono.
    esegui((m) => impostaVincolo(m, { id, vincolo: alternaIncastro(n.vincolo) }),
           `vincolo del nodo ${id}`);
    ridisegna();
    return;
  }

  // L'estrusione la conferma Invio nel campo (`confermaEstrusione`): qui arriva solo l'asta.
  if (voce.codice === "conferma") {
    if (!modo) return;
    if (modo.a === null) { dì(AVVISO_SECONDO_NODO); return; }
    const { da, a } = modo;
    if (esegui((m) => collega(m, { da, a }), `asta ${da} → ${a}`)) { modo = null; selezione = { tipo: "nodo", id: a }; }
    ridisegna();
    return;
  }

  // `M` apre lo stesso campo di `N`, con la stessa grammatica: l'esempio sono le coordinate
  // di adesso, che dicono da dove si parte meglio di qualunque frase.
  if (voce.codice === "sposta") {
    if (selezione?.tipo !== "nodo") { dì(serveUnNodo("spostare")); return; }
    const n = nodo(corrente(cronologia), selezione.id);
    const q = (v) => stampaNumero(v, { decimali: 0 });
    apriComando(voce, { bersaglio: { ...selezione }, esempio: `${q(n.x)}; ${q(n.z)}` });
    return;
  }

  if (voce.codice === "elimina") {
    // Sezioni, materiali, azioni e combinazioni si eliminano come i nodi. Chi è ancora in uso
    // lo rifiuta da sé e dice **chi** lo usa (`comandi.js:eliminaSezione`, `eliminaAzione`):
    // una guardia qui sarebbe un secondo oracolo da tenere allineato a mano.
    const via = { sezione: eliminaSezione, materiale: eliminaMateriale,
                  azione: eliminaAzione, combinazione: eliminaCombinazione }[selezione?.tipo];
    if (via) {
      const { tipo, id } = selezione;
      esegui((m) => via(m, { id }), `elimina ${tipo} ${id}`);
      ridisegna();
      return;
    }
    // L'asta resta fuori davvero (`comandi.js` elimina solo nodi): la frase lo dice, invece
    // di lasciar credere che basti selezionarne una.
    if (selezione?.tipo !== "nodo") { dì(`${serveUnNodo("eliminare")} — l'asta non si elimina ancora`); return; }
    const id = selezione.id;
    esegui((m) => eliminaNodo(m, { id }), `elimina nodo ${id}`);
    ridisegna();
    return;
  }

  // `R` è testuale e basta: nessun ghost da mostrare, perché un nome non ha una geometria da
  // anticipare. L'esempio resta quello della tastiera; chi rinomina lo dice l'etichetta del
  // campo, che nomina il bersaglio congelato — il pannello no, quello segue la selezione, e
  // la selezione da qui in poi si può muovere.
  //
  // È l'unico comando che accetta anche un'asta, quindi non passa da `serveUnNodo`.
  if (voce.codice === "rinomina") {
    if (!selezione) { dì("rinominare vuole qualcosa di selezionato: premi G per girare fra i nodi, o clicca un'asta, una sezione o un materiale nell'albero"); return; }
    apriComando(voce, { bersaglio: { ...selezione } });
    return;
  }

  // `S` con un'asta selezionata è il gesto più frequente della giornata — disegnare la
  // sezione e darla all'asta — quindi il bersaglio si congela come per `M` e `R`, e
  // l'etichetta del campo lo nomina: «sezione di asta 3» dice a chi finirà.
  if (voce.codice === "sezione") {
    const bersaglio = selezione?.tipo === "asta" ? { ...selezione } : null;
    apriComando(bersaglio ? { ...voce, campo: "sezione di" } : voce, { bersaglio });
    return;
  }

  // `C` non chiede nessun bersaglio: un materiale non è di nessuno finché una sezione non
  // lo prende.
  if (voce.codice === "materiale") { apriComando(voce); return; }

  if (voce.codice === "danno") {
    if (selezione?.tipo !== "asta") { dì("il danno vuole un'asta: clicca un'asta nel piano o nell'albero"); return; }
    apriComando(voce, { bersaglio: { ...selezione } });
    return;
  }

  // `Q` congela due cose e non una: il bersaglio, come `M` e `R`, **e** l'azione di
  // destinazione. Sono due selezioni diverse — il nodo nel piano, l'azione nell'albero — e da
  // campo aperto tutte e due si possono muovere con un clic. L'etichetta nomina il bersaglio,
  // l'aiuto l'azione: chi confermerà sa a chi sta scrivendo, senza fidarsi di cosa è evidenziato.
  if (voce.codice === "carico") {
    if (selezione?.tipo !== "nodo" && selezione?.tipo !== "asta") {
      dì("il carico vuole un nodo o un'asta: clicca nel piano o nell'albero");
      return;
    }
    const dest = azioneDestinazione(corrente(cronologia));
    if (!dest) { dì("prima crea un'azione: premi Z"); return; }
    // L'esempio cambia col bersaglio perché la grammatica cambia: sul nodo sono componenti con
    // il nome («Fx 20000»), sull'asta un `q` in N/mm e basta.
    apriComando({ ...voce, aiuto: `${voce.aiuto} → azione «${dest.nome}»`,
                  esempio: selezione.tipo === "nodo" ? "Fx 20000" : "-12,5" },
                { bersaglio: { ...selezione } });
    // `comando` c'è per forza, e non è una scommessa: `apriComando` ridisegna, e il ridisegno
    // chiude il campo solo quando il bersaglio è sparito — qui il bersaglio è la selezione, che
    // lo stesso ridisegno ha appena validato due righe sopra. Un campo aperto su un bersaglio
    // che non passa da `selezione` avrebbe bisogno di un `comando?.` qui.
    comando.azione = dest.id;
    return;
  }

  // `Z` e `K` non chiedono nessun bersaglio: un'azione e una combinazione non sono di nessun
  // nodo — sono i carichi, dentro, a scegliersi il loro.
  if (voce.codice === "azione" || voce.codice === "combinazione") { apriComando(voce); return; }
}

ridisegna();
