import { test } from "node:test";
import assert from "node:assert/strict";
import { TASTI, voceDaEvento, vociDellaBarra, daControllo } from "../tastiera.js";

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

test("un tasto mappato si riconosce dall'evento", () => {
  assert.equal(voceDaEvento({ key: "n", metaKey: false, ctrlKey: false, altKey: false }).codice, "nodo");
  assert.equal(voceDaEvento({ key: "N", metaKey: false, ctrlKey: false, altKey: false }).codice, "nodo");
});

test("un tasto non mappato torna null", () => {
  assert.equal(voceDaEvento({ key: "q", metaKey: false, ctrlKey: false, altKey: false }), null);
});

test("un contesto sconosciuto dà le voci di sempre, non un'eccezione", () => {
  assert.deepEqual(vociDellaBarra("pinguino").map((v) => v.codice), vociDellaBarra("sempre").map((v) => v.codice));
});

test("con un'estrusione aperta la barra non mostra nodo né seleziona: non funzionano dietro un ghost", () => {
  const conGhost = vociDellaBarra("ghost").map((v) => v.codice);
  assert.ok(!conGhost.includes("nodo"), "N aprirebbe un prompt mentre app.js blocca i comandi da tastiera");
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

test("senza modificatore quelle lettere non fanno niente", () => {
  assert.equal(voceDaEvento({ key: "o", metaKey: false, ctrlKey: false, altKey: false }), null);
  assert.equal(voceDaEvento({ key: "s", metaKey: false, ctrlKey: false, altKey: false }), null);
});

test("una combinazione non mappata resta al browser", () => {
  // "z" non c'è più qui: dalla giornata 11c ⌘Z è mappato (disfa), vedi sotto.
  for (const key of ["n", "p", "w", "b", "k"]) {
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

test("nessuna coppia tasto+modificatore è assegnata due volte", () => {
  const chiavi = TASTI.map((v) => `${v.tasto}|${v.modificatore ?? ""}`);
  assert.equal(new Set(chiavi).size, chiavi.length, `doppione in: ${chiavi.join(" ")}`);
});

// Sostituisce «ogni voce si raggiunge davvero da un evento» della giornata 10, che provava
// i tasti senza modificatori e con `⌘O`/`⌘S` nella mappa fallirebbe. La sonda si deriva da
// `TASTI`: un elenco scritto a mano va alla deriva alla prima voce nuova.
test("ogni voce si raggiunge da un evento, col suo modificatore", () => {
  const KEY = { "⌫": "Backspace", "Invio": "Enter", "Esc": "Escape", "⌘O": "o", "⌘S": "s",
                "⌘Z": "z", "⇧⌘Z": "z", "← ↑ → ↓": "ArrowUp" };
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
