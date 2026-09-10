import { test } from "node:test";
import assert from "node:assert/strict";
import { TASTI, voceDaEvento, vociDellaBarra, daControllo, etichettaCampo, nomeTasto } from "../tastiera.js";

// I glifi dei tasti a voce sono parole: lo screen reader legge «comando invio», non i nomi
// Unicode dei simboli. Le lettere restano lettere.
test("nomeTasto: i glifi diventano parole, nell'ordine in cui si premono", () => {
  assert.equal(nomeTasto("⌘⏎"), "comando invio");
  assert.equal(nomeTasto("⇧⌘⏎"), "maiuscolo comando invio");
  assert.equal(nomeTasto("⇧⌘Z"), "maiuscolo comando Z");
  assert.equal(nomeTasto("⌘O"), "comando O");
  assert.equal(nomeTasto("N"), "N");
  assert.equal(nomeTasto("⌫"), "cancella");
  assert.equal(nomeTasto("Invio"), "invio");
  assert.equal(nomeTasto("← ↑ → ↓"), "frecce");
  assert.equal(nomeTasto(undefined), "");
  for (const v of TASTI) assert.ok(!/[⇧⌘⏎⌫←↑→↓]/.test(nomeTasto(v.tasto)), `${v.tasto}: nessun glifo nel nome`);
});

test("nessun codice compare due volte", () => {
  const codici = TASTI.map((v) => v.codice);
  assert.equal(new Set(codici).size, codici.length);
});

test("nessun tasto è assegnato a due comandi", () => {
  // `DA_KEY` è una Map: due voci sullo stesso tasto non danno errore, una delle due
  // semplicemente non arriva mai. Il conflitto va visto qui, non in aula.
  const tasti = TASTI.map((v) => v.tasto);
  assert.equal(new Set(tasti).size, tasti.length, `tasto doppio in: ${tasti.join(" ")}`);
});

test("ogni voce ha tasto ed etichetta da stampare nella barra", () => {
  for (const v of TASTI) {
    assert.ok(v.tasto && v.tasto.trim() !== "", `${v.codice} senza tasto stampabile`);
    assert.ok(v.etichetta && v.etichetta.trim() !== "", `${v.codice} senza etichetta`);
  }
});

// L'etichetta è il nome con cui la voce si cerca nella palette: due voci che la condividono
// diventano indistinguibili lì dentro, dove il tasto è una scritta a destra e non il modo
// in cui ci sei arrivato. ⌘Z e Esc dicevano tutte e due «annulla» (fix round 1, punto 4).
test("nessuna etichetta è di due voci: nella palette si cercano per nome", () => {
  const etichette = TASTI.map((v) => v.etichetta);
  assert.equal(new Set(etichette).size, etichette.length,
    `etichette ripetute: ${etichette.filter((e, i) => etichette.indexOf(e) !== i)}`);
});

test("un tasto mappato si riconosce dall'evento", () => {
  assert.equal(voceDaEvento({ key: "n", metaKey: false, ctrlKey: false, altKey: false }).codice, "nodo");
  assert.equal(voceDaEvento({ key: "N", metaKey: false, ctrlKey: false, altKey: false }).codice, "nodo");
});

test("un tasto non mappato torna null", () => {
  assert.equal(voceDaEvento({ key: "p", metaKey: false, ctrlKey: false, altKey: false }), null);
});

test("un contesto sconosciuto dà le voci di sempre, non un'eccezione", () => {
  assert.deepEqual(vociDellaBarra("pinguino").map((v) => v.codice), vociDellaBarra("sempre").map((v) => v.codice));
});

test("con un'estrusione aperta la barra non mostra nodo né seleziona: non funzionano dietro un ghost", () => {
  const conGhost = vociDellaBarra("ghost").map((v) => v.codice);
  assert.ok(!conGhost.includes("nodo"), "N aprirebbe un secondo campo mentre app.js blocca i comandi da tastiera");
  assert.ok(!conGhost.includes("seleziona"), "⇥ cambierebbe la selezione sotto il ghost, bloccato da app.js");
  // `direzione` sì: col ghost aperto la freccia è il gesto obbligatorio, e finora la barra
  // taceva proprio sull'unico tasto che serviva (B3).
  assert.deepEqual(conGhost.sort(), ["annulla", "conferma", "direzione"]);
});

test("il modificatore di comando apre e salva, su Mac e su PC", () => {
  assert.equal(voceDaEvento({ key: "o", metaKey: true, ctrlKey: false, altKey: false }).codice, "apri");
  assert.equal(voceDaEvento({ key: "o", metaKey: false, ctrlKey: true, altKey: false }).codice, "apri");
  assert.equal(voceDaEvento({ key: "s", metaKey: true, ctrlKey: false, altKey: false }).codice, "salva");
});

test("senza modificatore quella lettera non fa niente", () => {
  // `s` nudo non è più fra queste: dal Task 6 apre `sezione` (vedi i test dedicati sotto).
  assert.equal(voceDaEvento({ key: "o", metaKey: false, ctrlKey: false, altKey: false }), null);
});

test("una combinazione non mappata resta al browser", () => {
  // "z" e "k" non ci sono più qui: dalla giornata 11c ⌘Z è mappato (disfa) e ⌘K (palette),
  // vedi sotto.
  for (const key of ["n", "p", "w", "b"]) {
    assert.equal(voceDaEvento({ key, metaKey: true, ctrlKey: false, altKey: false }), null, key);
  }
});

// --- disfa/rifai (giornata 11c, P4) -----------------------------------------
// Mutante 2 del brief: ⇧⌘Z fa annulla invece di rifà.

test("⌘Z è disfa, ⇧⌘Z è rifai — non si scambiano", () => {
  assert.equal(voceDaEvento({ key: "z", metaKey: true, ctrlKey: false, altKey: false, shiftKey: false }).codice, "disfa");
  assert.equal(voceDaEvento({ key: "z", metaKey: true, ctrlKey: false, altKey: false, shiftKey: true }).codice, "rifai");
  assert.equal(voceDaEvento({ key: "Z", metaKey: true, ctrlKey: false, altKey: false, shiftKey: true }).codice, "rifai");
});

test("⇧⌘S e ⇧⌘O restano al browser anche dopo aver aperto la porta a ⇧⌘Z", () => {
  assert.equal(voceDaEvento({ key: "s", metaKey: true, ctrlKey: false, altKey: false, shiftKey: true }), null);
  assert.equal(voceDaEvento({ key: "o", metaKey: true, ctrlKey: false, altKey: false, shiftKey: true }), null);
});

// --- corri e verifica (giornata 12) ------------------------------------------
// `⌘⏎` e `⇧⌘⏎` sono le uniche due combinazioni col comando che non sono una lettera: Invio
// nudo resta «conferma» del ghost, e le due mappe lo separano prima del `get`.
test("⌘⏎ è corri e ⇧⌘⏎ è verifica; Invio nudo resta conferma", () => {
  assert.equal(voceDaEvento({ key: "Enter", metaKey: true }).codice, "corri");
  assert.equal(voceDaEvento({ key: "Enter", metaKey: true, shiftKey: true }).codice, "verifica");
  assert.equal(voceDaEvento({ key: "Enter" }).codice, "conferma");
});

// L'ingresso degenere del Task 4: `⌘⏎` premuto **dentro** il campo di comando. `daControllo`
// lo lascia passare — col modificatore un campo di testo non si tiene niente — ed è `app.js`
// (Task 5) che lo ferma sotto la guardia del campo. Qui si prova solo che passa di qui.
test("⌘⏎ nel campo di comando non resta al campo: la guardia è di app.js, non di daControllo", () => {
  const evento = { key: "Enter", metaKey: true, ctrlKey: false, altKey: false,
                   target: { closest: () => ({ tagName: "INPUT", type: "text" }) } };
  assert.equal(daControllo(evento), false);
});

test("alt non è mai il modificatore di comando", () => {
  assert.equal(voceDaEvento({ key: "o", metaKey: false, ctrlKey: false, altKey: true }), null);
  assert.equal(voceDaEvento({ key: "n", metaKey: false, ctrlKey: false, altKey: true }), null);
});

test("⌘⇧S resta al browser: «salva con nome» non è nostra", () => {
  assert.equal(voceDaEvento({ key: "s", metaKey: true, ctrlKey: false, altKey: false, shiftKey: true }), null);
  assert.equal(voceDaEvento({ key: "o", metaKey: true, ctrlKey: false, altKey: false, shiftKey: true }), null);
});

test("i comandi senza modificatore continuano a rifiutare i modificatori", () => {
  assert.equal(voceDaEvento({ key: "n", metaKey: true, ctrlKey: false, altKey: false }), null);
  assert.equal(voceDaEvento({ key: "a", metaKey: true, ctrlKey: false, altKey: false }), null);
});

test("A collega, V vincola, entrambe con una selezione", () => {
  assert.equal(voceDaEvento({ key: "a", metaKey: false, ctrlKey: false, altKey: false }).codice, "asta");
  assert.equal(voceDaEvento({ key: "v", metaKey: false, ctrlKey: false, altKey: false }).codice, "vincolo");
  const conSelezione = vociDellaBarra("selezione").map((v) => v.codice);
  assert.ok(conSelezione.includes("asta"));
  assert.ok(conSelezione.includes("vincolo"));
});

test("scegliendo il secondo nodo la barra mostra solo quel che serve", () => {
  const codici = vociDellaBarra("asta").map((v) => v.codice);
  assert.deepEqual(codici.sort(), ["annulla", "conferma", "seleziona"].sort());
});

// Col campo di comando aperto la barra promette due tasti soli: `N` lì dentro scrive una
// lettera (`daControllo`) e le frecce muovono il cursore nel testo, non il ghost.
test("col campo di comando aperto la barra promette solo Invio ed Esc", () => {
  const codici = vociDellaBarra("comando").map((v) => v.codice);
  assert.deepEqual(codici.sort(), ["annulla", "conferma"].sort());
});

// Estrudendo la freccia non è una comodità, è il gesto che resta da fare: la lunghezza si
// sta scrivendo, la direzione la danno solo ←↑→↓. Mutante 3 del brief.
test("col campo aperto su `estrudi` la barra promette anche le frecce", () => {
  const codici = vociDellaBarra("comando-direzione").map((v) => v.codice);
  assert.deepEqual(codici.sort(), ["annulla", "conferma", "direzione"].sort());
});

// Ogni comando che apre il campo porta il suo esempio: il segnaposto è la sola cosa che
// dice *come* si scrive prima che ci sia scritto qualcosa.
test("i quattro comandi del campo hanno un esempio da mettere nel segnaposto", () => {
  for (const codice of ["nodo", "estrudi", "sposta", "rinomina"]) {
    const voce = TASTI.find((v) => v.codice === codice);
    assert.equal(typeof voce.esempio, "string", codice);
    assert.notEqual(voce.esempio.trim(), "", codice);
  }
});

test("nessuna coppia tasto+modificatore è assegnata due volte", () => {
  const chiavi = TASTI.map((v) => `${v.tasto}|${v.modificatore ?? ""}`);
  assert.equal(new Set(chiavi).size, chiavi.length, `doppione in: ${chiavi.join(" ")}`);
});

// Sostituisce «ogni voce si raggiunge davvero da un evento» della giornata 10, che provava
// i tasti senza modificatori e con `⌘O`/`⌘S` nella mappa fallirebbe. La sonda si deriva da
// `TASTI`: un elenco scritto a mano va alla deriva alla prima voce nuova.
test("ogni voce si raggiunge da un evento, col suo modificatore", () => {
  const KEY = { "⌫": "Backspace", "Invio": "Enter", "Esc": "Escape", "⌘O": "o", "⌘S": "s",
                "⌘Z": "z", "⇧⌘Z": "z", "⌘K": "k", "⌘I": "i", "← ↑ → ↓": "ArrowUp",
                // «0-4» è un intervallo di tasti, non un tasto: la sonda ne prova uno, e che
                // ci siano tutti e cinque lo prova il test della voce «vista» qui sotto.
                "⌘⏎": "Enter", "⇧⌘⏎": "Enter", "0-4": "0" };
  for (const v of TASTI) {
    const comando = v.modificatore === "comando";
    const shift = v.tasto.startsWith("⇧");
    const key = KEY[v.tasto] ?? v.tasto.toLowerCase();
    const trovata = voceDaEvento({ key, metaKey: comando, ctrlKey: false, altKey: false, shiftKey: shift });
    assert.equal(trovata?.codice, v.codice, `${v.codice} non si raggiunge con «${v.tasto}»`);
  }
});

test("le voci di sempre restano nei contesti reali, non solo nel proprio", () => {
  for (const contesto of ["sempre", "selezione"]) {
    const codici = vociDellaBarra(contesto).map((v) => v.codice);
    for (const atteso of ["nodo", "seleziona", "apri", "salva"]) {
      assert.ok(codici.includes(atteso), `${atteso} manca nel contesto ${contesto}`);
    }
  }
});

test("lo shift da solo non blocca: ⇧N crea un nodo", () => {
  assert.equal(voceDaEvento({ key: "N", metaKey: false, ctrlKey: false, altKey: false, shiftKey: true }).codice, "nodo");
});

// --- fix round 1, A2: ⇥ non è più mappato, torna del tutto al browser ---

test("⇥ non è più un tasto nostro: nessuna voce lo usa, e non gira più i nodi", () => {
  assert.equal(voceDaEvento({ key: "Tab", metaKey: false, ctrlKey: false, altKey: false }), null);
  assert.ok(!TASTI.some((v) => v.tasto === "⇥"));
});

test("G gira fra i nodi, il tasto che sostituisce ⇥", () => {
  assert.equal(voceDaEvento({ key: "g", metaKey: false, ctrlKey: false, altKey: false }).codice, "seleziona");
  assert.equal(voceDaEvento({ key: "G", metaKey: false, ctrlKey: false, altKey: false }).codice, "seleziona");
});

// --- B1: la guardia dipende dal tasto, non dal solo controllo -------------------
// La versione precedente asseriva che *qualunque* tasto premuto su *qualunque* controllo
// restasse al controllo: quell'asserzione fissava il difetto, perché col fuoco su un bottone
// dell'editor o nel campo del percorso spegneva dodici comandi in silenzio. Il caso che
// l'aveva motivata — ⌫ su «cerniera» che non deve eliminare il nodo — resta qui sotto.

function eventoDa(tag, { tipo = "", key = "n", comando = false } = {}) {
  const elemento = { tagName: tag.toUpperCase(), type: tipo };
  return {
    key, metaKey: comando, ctrlKey: false, altKey: false,
    target: { closest: (sel) => (sel.includes(tag) ? elemento : null) },
  };
}

test("daControllo: nel campo di testo le lettere nude sono sue — ci si sta scrivendo", () => {
  for (const key of ["n", "g", "b", "a", "v", "m", "r"]) {
    assert.equal(daControllo(eventoDa("input", { tipo: "text", key })), true, key);
  }
  assert.equal(daControllo(eventoDa("input", { tipo: "text", key: "Backspace" })), true);
  assert.equal(daControllo(eventoDa("textarea", { key: "n" })), true);
});

test("daControllo: nel campo di testo ⌘S e ⌘O passano — non scrivono niente lì dentro", () => {
  assert.equal(daControllo(eventoDa("input", { tipo: "text", key: "s", comando: true })), false);
  assert.equal(daControllo(eventoDa("input", { tipo: "text", key: "o", comando: true })), false);
});

test("daControllo: nel campo di testo le frecce sono sue — muovono il cursore, non il ghost", () => {
  for (const key of ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"]) {
    assert.equal(daControllo(eventoDa("input", { tipo: "text", key })), true, key);
  }
});

test("daControllo: su un bottone ⌫ Spazio e Invio restano suoi — lì sopra non si elimina", () => {
  assert.equal(daControllo(eventoDa("button", { key: "Backspace" })), true);
  assert.equal(daControllo(eventoDa("button", { key: "Delete" })), true);
  assert.equal(daControllo(eventoDa("button", { key: " " })), true);
  assert.equal(daControllo(eventoDa("button", { key: "Enter" })), true);
  assert.equal(daControllo(eventoDa("input", { tipo: "checkbox", key: " " })), true);
});

test("daControllo: su un bottone le lettere passano — N crea un nodo anche da «cerniera»", () => {
  for (const key of ["n", "g", "b", "a", "v", "m", "r"]) {
    assert.equal(daControllo(eventoDa("button", { key })), false, key);
    assert.equal(daControllo(eventoDa("input", { tipo: "checkbox", key })), false, key);
  }
});

// Regressione: i bottoni dell'area file sono `button` come quelli dell'editor, e dopo un
// clic su «apri» il fuoco resta lì. Da lì la tastiera deve continuare a funzionare tutta.
test("daControllo: i bottoni dell'area file non si tengono i comandi", () => {
  for (const key of ["n", "g", "Escape"]) {
    assert.equal(daControllo(eventoDa("button", { key })), false, key);
  }
  assert.equal(daControllo(eventoDa("button", { key: "s", comando: true })), false);
});

// --- 11c/A: le voci dell'albero e della Storia sono `<li tabindex=0 role="button">` ---
// Un `<li>` non è un `<button>` per il selettore, ma per chi lo usa sì. Cercando i soli tag,
// l'Invio che salta a uno snapshot risaliva **anche** al listener globale, che lo leggeva
// come «conferma»: il comando eseguito lì potava la coda del rifà (`cronologia.js:applica`)
// e tutti gli snapshot dopo il salto sparivano, senza che nessun annulla li riportasse.

function eventoDaVoce({ key = "Enter", comando = false } = {}) {
  const elemento = { tagName: "LI", getAttribute: (n) => (n === "role" ? "button" : null) };
  return {
    key, metaKey: comando, ctrlKey: false, altKey: false,
    target: { closest: (sel) => (sel.includes('[role="button"]') ? elemento : null) },
  };
}

test("daControllo: Invio su una voce role=button resta suo — non risale come «conferma»", () => {
  assert.equal(daControllo(eventoDaVoce({ key: "Enter" })), true);
  assert.equal(daControllo(eventoDaVoce({ key: " " })), true);
});

test("daControllo: ⌫ su una voce role=button resta suo — lì sopra non si elimina", () => {
  assert.equal(daControllo(eventoDaVoce({ key: "Backspace" })), true);
  assert.equal(daControllo(eventoDaVoce({ key: "Delete" })), true);
});

// L'altra metà, e senza di lei tornerebbe la guardia larga: una voce a fuoco non è un campo
// di testo, quindi le lettere devono continuare a passare — `N` da lì apre il comando.
test("daControllo: su una voce role=button le lettere passano — N apre il campo lo stesso", () => {
  for (const key of ["n", "g", "b", "a", "v", "m", "r"]) {
    assert.equal(daControllo(eventoDaVoce({ key })), false, key);
  }
});

test("daControllo: ⌘S su una voce role=button passa — salvare non è un gesto della voce", () => {
  assert.equal(daControllo(eventoDaVoce({ key: "s", comando: true })), false);
});

// La mappa riconosce anche i tasti di chi non lavora su un Mac: l'etichetta stampata resta
// `R`, ma su un PC `F2` è il gesto che rinomina — e toglierlo lasciava i test verdi.
test("F2 rinomina come R: la mappa riconosce anche la tastiera di un PC", () => {
  const evento = (key) => ({ key, metaKey: false, ctrlKey: false, altKey: false });
  assert.equal(voceDaEvento(evento("F2")).codice, "rinomina");
  assert.equal(voceDaEvento(evento("r")).codice, "rinomina");
  assert.equal(voceDaEvento(evento("Delete")).codice, "elimina");
});

test("daControllo: il corpo della pagina non tiene per sé niente", () => {
  assert.equal(daControllo({ key: "Backspace", target: { closest: () => null } }), false);
});

test("daControllo: un target senza `closest` (es. il `document`) non solleva, e non è un controllo", () => {
  assert.equal(daControllo({ key: "n", target: {} }), false);
  assert.equal(daControllo({ key: "n", target: null }), false);
  assert.equal(daControllo({}), false);
  assert.equal(daControllo(null), false);
  assert.equal(daControllo(undefined), false);
});

// --- B3: le frecce sono un comando nostro, e la barra le nomina -----------------

test("le frecce girano il ghost: sono un codice della mappa, non una tabella a parte", () => {
  for (const key of ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]) {
    assert.equal(voceDaEvento({ key, metaKey: false, ctrlKey: false, altKey: false }).codice,
                 "direzione", key);
  }
});

test("col ghost la barra nomina la freccia, che è il gesto obbligatorio dell'estrusione", () => {
  assert.ok(vociDellaBarra("ghost").map((v) => v.codice).includes("direzione"));
});

test("la freccia non compare dove non fa niente: in asta il ghost segue il secondo nodo", () => {
  for (const contesto of ["asta", "sempre", "selezione"]) {
    assert.ok(!vociDellaBarra(contesto).map((v) => v.codice).includes("direzione"), contesto);
  }
});

// --- fix round 2, grave 1: l'etichetta del campo nomina il bersaglio -------------
// Il difetto dal vivo: nodo 1 selezionato, `R`, clic sul nodo 6 (che si evidenzia nel
// pannello e nel piano), Invio → rinominato il nodo 1. Il bersaglio è congelato apposta
// all'apertura, ma niente a schermo lo diceva: una regressione contro il `prompt`, che
// scriveva «Nome per nodo 1» dentro il testo della finestra.

test("etichettaCampo: col bersaglio dice su cosa agisce, non solo il verbo", () => {
  const rinomina = TASTI.find((v) => v.codice === "rinomina");
  const etichetta = etichettaCampo(rinomina, { tipo: "nodo", id: 1 });
  assert.ok(etichetta.includes("nodo 1"), `l'etichetta non nomina il bersaglio: «${etichetta}»`);
});

test("etichettaCampo: l'etichetta segue il bersaglio congelato, non l'ultimo cliccato", () => {
  const sposta = TASTI.find((v) => v.codice === "sposta");
  assert.notEqual(etichettaCampo(sposta, { tipo: "nodo", id: 1 }),
                  etichettaCampo(sposta, { tipo: "nodo", id: 6 }));
  assert.ok(etichettaCampo(sposta, { tipo: "nodo", id: 1 }).includes("nodo 1"));
});

test("etichettaCampo: senza bersaglio resta il solo sostantivo (N non ha un bersaglio)", () => {
  const nodo = TASTI.find((v) => v.codice === "nodo");
  assert.equal(etichettaCampo(nodo, null), nodo.campo);
  assert.ok(!etichettaCampo(nodo, null).includes("nodo"));
});

test("ogni comando che apre il campo ha il sostantivo di ciò che ci si scrive", () => {
  // `<label>` risponde a «cosa va in questa casella», non «che tasto ho premuto»: il verbo
  // lo dice già la barra. I sette che aprono il campo sono N, B, M, R, S, C, D.
  for (const codice of ["nodo", "estrudi", "sposta", "rinomina", "sezione", "materiale", "danno"]) {
    const v = TASTI.find((x) => x.codice === codice);
    assert.ok(v.campo && v.campo.trim() !== "", `${codice} senza sostantivo per l'etichetta`);
  }
  // I tre della 11b, per esteso: un sostantivo qualunque passerebbe il controllo qui sopra.
  assert.deepEqual(["sezione", "materiale", "danno"].map((c) => TASTI.find((x) => x.codice === c).campo),
    ["sezione", "classe", "danno di"]);
});

test("S nudo è sezione, ⌘S resta salva", () => {
  assert.equal(voceDaEvento({ key: "s" })?.codice, "sezione");
  assert.equal(voceDaEvento({ key: "s", metaKey: true })?.codice, "salva");
  assert.equal(voceDaEvento({ key: "S", shiftKey: true })?.codice, "sezione");
});
test("C e D aprono materiale e danno", () => {
  assert.equal(voceDaEvento({ key: "c" })?.codice, "materiale");
  assert.equal(voceDaEvento({ key: "d" })?.codice, "danno");
});
test("ogni codice a lettera singola è raggiunto da esattamente una lettera", () => {
  // Un `Set` collasserebbe due lettere sullo stesso codice in una sola voce, lasciando
  // passare un doppione (`["k", "materiale"]` accanto a `["c", "materiale"]`): si conta,
  // non si insiema. `f2` (rinomina) e `backspace`/`delete` (elimina) non sono lettere e
  // non entrano in questo conteggio.
  const perCodice = new Map();
  for (const k of "abcdefghijklmnopqrstuvwxyz") {
    const v = voceDaEvento({ key: k });
    if (v) perCodice.set(v.codice, (perCodice.get(v.codice) ?? 0) + 1);
  }
  const attesi = TASTI.filter((v) => !v.modificatore && /^[A-Z]$/.test(v.tasto)).map((v) => v.codice);
  for (const codice of attesi) {
    assert.equal(perCodice.get(codice), 1, `${codice} raggiunto da ${perCodice.get(codice) ?? 0} lettere`);
  }
});
test("col campo aperto la barra resta a due voci", () => {
  assert.deepEqual(vociDellaBarra("comando").map((v) => v.codice), ["conferma", "annulla"]);
});

// --- Z azione, Q carico, K combinazione, ⌘K palette (giornata 11c, Task 3) --------------

test("Z nudo è azione, ⌘Z resta disfa; K nudo è combinazione, ⌘K la palette (anche Ctrl)", () => {
  assert.equal(voceDaEvento({ key: "z" })?.codice, "azione");
  assert.equal(voceDaEvento({ key: "z", metaKey: true })?.codice, "disfa");
  assert.equal(voceDaEvento({ key: "k" })?.codice, "combinazione");
  assert.equal(voceDaEvento({ key: "K", shiftKey: true })?.codice, "combinazione");
  assert.equal(voceDaEvento({ key: "k", metaKey: true })?.codice, "palette");
  assert.equal(voceDaEvento({ key: "k", ctrlKey: true })?.codice, "palette");
  assert.equal(voceDaEvento({ key: "q" })?.codice, "carico");
});
test("Q vale su nodo e asta, non su sezione o materiale; la palette e le altre due sono di sempre", () => {
  const codici = (c, t) => vociDellaBarra(c, t).map((v) => v.codice);
  assert.ok(codici("selezione", "asta").includes("carico"));
  assert.ok(codici("selezione", "nodo").includes("carico"));
  assert.ok(!codici("selezione", "sezione").includes("carico"));
  for (const c of ["azione", "combinazione", "palette"]) assert.ok(codici("sempre", null).includes(c), c);
  assert.ok(!codici("sempre", null).includes("carico"));
  assert.deepEqual(codici("comando"), ["conferma", "annulla"]);
});
test("⌘Q resta al browser: Q da solo basta per il carico, il comando non è nostro", () => {
  assert.equal(voceDaEvento({ key: "q", metaKey: true }), null);
});


// --- fix di fine ramo 11b: la barra non promette un comando che non c'è ---
// `D` con una sezione selezionata prometteva «danno», e `app.js` rispondeva «vuole un'asta».

test("D compare nella barra solo con un'asta selezionata", () => {
  assert.ok(vociDellaBarra("selezione", "asta").map((v) => v.codice).includes("danno"));
  for (const tipo of ["nodo", "sezione", "materiale", null]) {
    assert.ok(!vociDellaBarra("selezione", tipo).map((v) => v.codice).includes("danno"), String(tipo));
  }
});

test("⌘I importa, i nuda non fa niente, la voce sta nella barra di sempre", () => {
  assert.equal(voceDaEvento({ key: "i", metaKey: true })?.codice, "importa");
  assert.equal(voceDaEvento({ key: "i" }), null);
  assert.ok(vociDellaBarra("sempre", null).some((v) => v.codice === "importa"));
  assert.deepEqual(vociDellaBarra("comando").map((v) => v.codice), ["conferma", "annulla"]);
});

test("il filtro per tipo non tocca gli altri tasti della selezione", () => {
  const conSezione = vociDellaBarra("selezione", "sezione").map((v) => v.codice);
  for (const atteso of ["estrudi", "asta", "vincolo", "sposta", "rinomina", "elimina"]) {
    assert.ok(conSezione.includes(atteso), atteso);
  }
});

test("vista: le cifre 0-4 senza modificatore sono la voce «vista»; con ⌘ no; la barra la promette solo con risultati", () => {
  for (const k of ["0", "1", "4"]) assert.equal(voceDaEvento({ key: k })?.codice, "vista");
  assert.equal(voceDaEvento({ key: "5" }), null);
  assert.equal(voceDaEvento({ key: "1", metaKey: true }), null);
  assert.ok(!vociDellaBarra("sempre").some((v) => v.codice === "vista"));
  assert.ok(vociDellaBarra("sempre", null, { risultati: true }).some((v) => v.codice === "vista"));
  assert.ok(vociDellaBarra("selezione", "nodo", { risultati: true }).some((v) => v.codice === "vista"));
  assert.ok(!vociDellaBarra("ghost", null, { risultati: true }).some((v) => v.codice === "vista"));
  assert.equal(nomeTasto("0-4"), "0-4");
});

// La voce non apre nessun campo: è la condizione che la coda di `eseguiVoce` guarda (R4).
// Senza questo, un `campo` aggiunto per sbaglio farebbe scrivere «2» nel campo di comando.
test("vista: la voce non ha `campo`, e col campo di comando aperto la barra non la promette", () => {
  assert.equal(TASTI.find((v) => v.codice === "vista").campo, undefined);
  assert.ok(!vociDellaBarra("comando", null, { risultati: true }).some((v) => v.codice === "vista"));
});
