import { test } from "node:test";
import assert from "node:assert/strict";
import { MISURE_BASE, VARIABILI, leggiMisure, avanzamentoMono, misureDi, dimenticaMisure } from "../misure.js";

const stile = (valori) => ({ getPropertyValue: (nome) => valori[nome] ?? "" });

test("leggiMisure: senza variabili le misure d'oggi — fuori dalla presentazione niente cambia", () => {
  assert.deepEqual(leggiMisure(stile({})), MISURE_BASE);
  assert.deepEqual(leggiMisure(null), MISURE_BASE);
  assert.deepEqual(MISURE_BASE, { raggioNodo: 5, trattoAsta: 2, trattoScelta: 3, trattoDeformata: 2, bordoDeformata: 2, carattere: 11, ombra: 0.3, srotolatoAlto: 96, curvaAlta: 96 });
});

test("leggiMisure: le variabili della presentazione, con le unità e gli spazi del CSS", () => {
  const m = leggiMisure(stile({ "--nodo-raggio": " 7px", "--asta-tratto": "6px", "--etichetta": "46px", "--ombra-opacita": "0.55",
                                "--srotolato-alto": "160px", "--curva-alta": "240px" }));
  assert.equal(m.raggioNodo, 7);
  assert.equal(m.trattoAsta, 6);
  assert.equal(m.carattere, 46);
  assert.equal(m.ombra, 0.55);
  assert.equal(m.srotolatoAlto, 160, "l'altezza dello srotolato in aula (15b)");
  assert.equal(m.curvaAlta, 240, "l'altezza della curva in aula");
  assert.equal(m.trattoScelta, 3, "una variabile assente resta al ripiego");
});

test("leggiMisure: un valore non finito, zero o negativo non entra", () => {
  const m = leggiMisure(stile({ "--nodo-raggio": "auto", "--asta-tratto": "0px", "--etichetta": "-4px", "--srotolato-alto": "0px", "--curva-alta": "0px" }));
  assert.equal(m.raggioNodo, 5);
  assert.equal(m.trattoAsta, 2);
  assert.equal(m.carattere, 11);
  assert.equal(m.srotolatoAlto, 96, "una variabile a zero non entra: lo srotolato resta quello d'oggi");
  assert.equal(m.curvaAlta, 96, "a zero resta quella d'oggi");
});

test("avanzamentoMono: 0,6 em — i 6,6 px a 11 px d'oggi, 27,6 a 46", () => {
  assert.equal(avanzamentoMono(11), 6.6);
  assert.ok(Math.abs(avanzamentoMono(46) - 27.6) < 1e-9);
});

// Il mock di `getComputedStyle` e la cache di `misureDi` sono globali quanto lei: un `assert` che
// cade a metà test, senza pulizia in un gancio del runner, lascerebbe il mock montato e la cache
// sporca per i test dopo — un rosso vero che ne genera uno fantasma altrove. `t.after` gira sempre,
// fallito o no.
const conGetComputedStyle = (t, fn) => {
  const prima = globalThis.getComputedStyle;
  t.after(() => { if (prima === undefined) delete globalThis.getComputedStyle; else globalThis.getComputedStyle = prima; dimenticaMisure(); });
  globalThis.getComputedStyle = fn;
};

test("misureDi: legge una volta sola finché non si dimentica", (t) => {
  dimenticaMisure();
  let letture = 0;
  conGetComputedStyle(t, () => ({ getPropertyValue: (n) => { letture++; return n === "--etichetta" ? "46px" : ""; } }));
  const a = misureDi({}), b = misureDi({});
  assert.equal(a.carattere, 46);
  assert.equal(a, b, "stesso oggetto: nessuna seconda lettura, piano e spazio condividono la cache");
  dimenticaMisure();
  misureDi({});
  assert.ok(letture > Object.keys(VARIABILI).length, "dopo dimenticaMisure rilegge");
});

test("misureDi: senza getComputedStyle torna al ripiego e non avvelena la cache", (t) => {
  dimenticaMisure();
  conGetComputedStyle(t, undefined);
  assert.deepEqual(misureDi(), MISURE_BASE, "DOM finto dei test: nessun getComputedStyle, i numeri d'oggi");
  let letture = 0;
  globalThis.getComputedStyle = () => ({ getPropertyValue: (n) => { letture++; return n === "--etichetta" ? "46px" : ""; } });
  assert.equal(misureDi().carattere, 46, "arrivato getComputedStyle, non resta bloccata sul ripiego cachato per errore");
  assert.ok(letture > 0);
});

test("misureDi: dopo dimenticaMisure, una variabile CSS tolta a caldo torna al ripiego e non resta stantia", (t) => {
  dimenticaMisure();
  conGetComputedStyle(t, () => ({ getPropertyValue: (n) => (n === "--etichetta" ? "46px" : "") }));
  assert.equal(misureDi().carattere, 46, "in presentazione");
  dimenticaMisure();
  globalThis.getComputedStyle = () => ({ getPropertyValue: () => "" });
  assert.equal(misureDi().carattere, 11, "la variabile è sparita: il ripiego, non il 46 di prima");
});

test("dimenticaMisure: due volte di fila non solleva e non causa una seconda rilettura", (t) => {
  dimenticaMisure();
  let letture = 0;
  conGetComputedStyle(t, () => ({ getPropertyValue: (n) => { letture++; return n === "--etichetta" ? "46px" : ""; } }));
  assert.doesNotThrow(() => { dimenticaMisure(); dimenticaMisure(); });
  misureDi();
  const dopoLaPrima = letture;
  misureDi();
  assert.equal(letture, dopoLaPrima, "dimenticare due volte è dimenticare una volta: la cache tiene alla seconda chiamata");
});
