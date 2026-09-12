import { test } from "node:test";
import assert from "node:assert/strict";
import { MISURE_BASE, leggiMisure, avanzamentoMono } from "../misure.js";

const stile = (valori) => ({ getPropertyValue: (nome) => valori[nome] ?? "" });

test("leggiMisure: senza variabili le misure d'oggi — fuori dalla presentazione niente cambia", () => {
  assert.deepEqual(leggiMisure(stile({})), MISURE_BASE);
  assert.deepEqual(leggiMisure(null), MISURE_BASE);
  assert.deepEqual(MISURE_BASE, { raggioNodo: 5, trattoAsta: 2, trattoScelta: 3, trattoDeformata: 2, bordoDeformata: 2, carattere: 11, ombra: 0.3, srotolatoAlto: 96 });
});

test("leggiMisure: le variabili della presentazione, con le unità e gli spazi del CSS", () => {
  const m = leggiMisure(stile({ "--nodo-raggio": " 7px", "--asta-tratto": "6px", "--etichetta": "46px", "--ombra-opacita": "0.55",
                                "--srotolato-alto": "160px" }));
  assert.equal(m.raggioNodo, 7);
  assert.equal(m.trattoAsta, 6);
  assert.equal(m.carattere, 46);
  assert.equal(m.ombra, 0.55);
  assert.equal(m.srotolatoAlto, 160, "l'altezza dello srotolato in aula (15b)");
  assert.equal(m.trattoScelta, 3, "una variabile assente resta al ripiego");
});

test("leggiMisure: un valore non finito, zero o negativo non entra", () => {
  const m = leggiMisure(stile({ "--nodo-raggio": "auto", "--asta-tratto": "0px", "--etichetta": "-4px", "--srotolato-alto": "0px" }));
  assert.equal(m.raggioNodo, 5);
  assert.equal(m.trattoAsta, 2);
  assert.equal(m.carattere, 11);
  assert.equal(m.srotolatoAlto, 96, "una variabile a zero non entra: lo srotolato resta quello d'oggi");
});

test("avanzamentoMono: 0,6 em — i 6,6 px a 11 px d'oggi, 27,6 a 46", () => {
  assert.equal(avanzamentoMono(11), 6.6);
  assert.ok(Math.abs(avanzamentoMono(46) - 27.6) < 1e-9);
});
