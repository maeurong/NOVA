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

test("ogni voce si raggiunge davvero da un evento", () => {
  const raggiunti = new Set();
  for (const key of ["n", "Tab", "b", "m", "r", "F2", "Backspace", "Delete", "Enter", "Escape"]) {
    const v = voceDaEvento({ key, metaKey: false, ctrlKey: false, altKey: false });
    if (v) raggiunti.add(v.codice);
  }
  for (const v of TASTI) {
    assert.ok(raggiunti.has(v.codice), `${v.codice} è nella barra ma nessun tasto lo raggiunge`);
  }
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

test("con un modificatore non si intercetta niente: ⌘K e ⌘Z sono di domani", () => {
  assert.equal(voceDaEvento({ key: "n", metaKey: true, ctrlKey: false, altKey: false }), null);
  assert.equal(voceDaEvento({ key: "z", metaKey: true, ctrlKey: false, altKey: false }), null);
});

test("la barra mostra le voci del contesto più quelle di sempre", () => {
  const sempre = vociDellaBarra("sempre").map((v) => v.codice);
  const conSelezione = vociDellaBarra("selezione").map((v) => v.codice);
  assert.ok(sempre.includes("nodo"));
  assert.ok(sempre.includes("seleziona"), "senza selezione, ⇥ è l'unico modo di averne una");
  assert.ok(!sempre.includes("estrudi"), "estrudere richiede un nodo selezionato");
  assert.ok(!sempre.includes("sposta"), "spostare richiede un nodo selezionato");
  assert.ok(conSelezione.includes("estrudi"));
  assert.ok(conSelezione.includes("sposta"));
  assert.ok(conSelezione.includes("nodo"), "le voci di sempre restano");
});

test("un contesto sconosciuto dà le voci di sempre, non un'eccezione", () => {
  assert.deepEqual(vociDellaBarra("pinguino").map((v) => v.codice), vociDellaBarra("sempre").map((v) => v.codice));
});
