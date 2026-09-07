import { test } from "node:test";
import assert from "node:assert/strict";
import { TASTI, voceDaEvento, vociDellaBarra } from "../tastiera.js";

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
  assert.deepEqual(conGhost.sort(), ["annulla", "conferma"]);
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
  for (const key of ["n", "p", "w", "b", "z", "k"]) {
    assert.equal(voceDaEvento({ key, metaKey: true, ctrlKey: false, altKey: false }), null, key);
  }
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

test("nessuna coppia tasto+modificatore è assegnata due volte", () => {
  const chiavi = TASTI.map((v) => `${v.tasto}|${v.modificatore ?? ""}`);
  assert.equal(new Set(chiavi).size, chiavi.length, `doppione in: ${chiavi.join(" ")}`);
});

// Sostituisce «ogni voce si raggiunge davvero da un evento» della giornata 10, che provava
// i tasti senza modificatori e con `⌘O`/`⌘S` nella mappa fallirebbe. La sonda si deriva da
// `TASTI`: un elenco scritto a mano va alla deriva alla prima voce nuova.
test("ogni voce si raggiunge da un evento, col suo modificatore", () => {
  const KEY = { "⇥": "Tab", "⌫": "Backspace", "Invio": "Enter", "Esc": "Escape", "⌘O": "o", "⌘S": "s" };
  for (const v of TASTI) {
    const comando = v.modificatore === "comando";
    const key = KEY[v.tasto] ?? v.tasto.toLowerCase();
    const trovata = voceDaEvento({ key, metaKey: comando, ctrlKey: false, altKey: false, shiftKey: false });
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
