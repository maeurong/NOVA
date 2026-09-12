import { test } from "node:test";
import assert from "node:assert/strict";
import { dimensioniSicure, calcolaAspect, calcolaInquadratura, creaSpazio, pixelInMondo, tratti,
         trattiDellaDeformata, raggioCilindro, scaleDeiTratti, orbitaDaTasto,
         capoLontano, diametroInPixel } from "../spazio.js";
import { coloreSpostamento, massimoSpostamento, VIRIDIS } from "../risultati.js";

test("contenitore di dimensione 0: nessun NaN nell'aspect della camera", () => {
  assert.deepEqual(dimensioniSicure(0, 0), { w: 1, h: 1 });
  assert.equal(calcolaAspect(0, 0), 1);
  assert.ok(Number.isFinite(calcolaAspect(0, 0)));
});

test("modello vuoto: centro nell'origine, nessuna divisione per zero nella distanza", () => {
  const { centro, distanza } = calcolaInquadratura([]);
  assert.deepEqual(centro, { x: 0, y: 0, z: 0 });
  assert.equal(distanza, 4000);
  assert.ok(Number.isFinite(distanza) && distanza > 0);
});

test("modello con un solo nodo: distanza minima fissa, non zero", () => {
  const { centro, distanza } = calcolaInquadratura([{ x: 1200, y: 300, z: 900 }]);
  assert.deepEqual(centro, { x: 1200, y: 300, z: 900 });
  assert.equal(distanza, 4000); // l'estensione è zero: vince la distanza minima, non 0
});

test("three.js/WebGL assente: creaSpazio non solleva, dichiara indisponibile, scrive nel riquadro", async () => {
  // node non ha DOM/WebGL: `new THREE.WebGLRenderer()` fallisce qui esattamente come su un
  // browser senza WebGL. `assente()` tocca `document`, quindi lo stub minimo copre solo quello.
  const scritti = [];
  globalThis.document = { createElement: () => ({ set className(v) {}, set textContent(v) { scritti.push(v); } }) };
  const contenitore = { clientWidth: 0, clientHeight: 0, replaceChildren(...figli) { this.figli = figli; } };
  try {
    const s = await creaSpazio(contenitore);
    assert.equal(s.disponibile, false);
    assert.equal(scritti.length, 1); // il riquadro riceve un messaggio, non resta bianco
    assert.doesNotThrow(() => s.disegna({ nodi: [], aste: [] }));
  } finally {
    delete globalThis.document;
  }
});

test("pixelInMondo: mm per pixel alla distanza data; riquadro non misurato o distanza non finita → 0", () => {
  assert.ok(Math.abs(pixelInMondo(1000, 90, 500) - 4) < 1e-9); // 2·1000·tan 45° / 500, rende 3,9999999999999996
  assert.equal(pixelInMondo(1000, 45, 0), 0);
  assert.equal(pixelInMondo(NaN, 45, 500), 0);
  assert.equal(pixelInMondo(Infinity, 45, 500), 0);
});

test("tratti: uno per coppia di punti consecutivi, colorato sulla media di |u|", () => {
  const p = [{ x: 0, y: 0, z: 0, u: 0 }, { x: 1, y: 0, z: 0, u: 2 }, { x: 2, y: 0, z: 0, u: 4 }];
  assert.deepEqual(tratti(p, 4), [
    { a: { x: 0, y: 0, z: 0 }, b: { x: 1, y: 0, z: 0 }, colore: coloreSpostamento(1, 4) },
    { a: { x: 1, y: 0, z: 0 }, b: { x: 2, y: 0, z: 0 }, colore: coloreSpostamento(3, 4) },
  ]);
  assert.deepEqual(tratti([], 4), []);
  assert.deepEqual(tratti([p[0]], 4), []);
});

test("tratti: u assente → colore della tappa bassa", () => {
  const [t] = tratti([{ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 5 }], 4);
  assert.equal(t.colore, VIRIDIS[0]);
});

test("tratti: due punti coincidenti (o non finiti) → saltati, niente direzione nulla", () => {
  const p = [{ x: 1, y: 1, z: 1, u: 1 }, { x: 1, y: 1, z: 1, u: 1 }, { x: 2, y: 1, z: 1, u: 1 }, { x: NaN, y: 1, z: 1, u: 1 }];
  const fuori = tratti(p, 1);
  assert.equal(fuori.length, 1);
  assert.deepEqual(fuori[0].a, { x: 1, y: 1, z: 1 });
  assert.deepEqual(fuori[0].b, { x: 2, y: 1, z: 1 });
});

test("trattiDellaDeformata: la scala arriva da `app.js`, non se la ricalcola (N6)", () => {
  const aste = [{ id: 1, punti: [{ x: 0, y: 0, z: 0, u: 0 }, { x: 1, y: 0, z: 0, u: 8 }] },
                { id: 2, punti: [{ x: 1, y: 0, z: 0, u: 8 }, { x: 1, y: 0, z: 1, u: 2 }] }];
  assert.deepEqual(trattiDellaDeformata({ aste, stantia: false, uMax: 10 }).map((t) => t.colore),
                   [coloreSpostamento(4, 10), coloreSpostamento(5, 10)]);
  // **N6** — il massimo aveva tre padroni (`app.js`, `piano.js`, questo) e coincidevano solo perché
  // `u` non porta la scala. Ora lo calcola `app.js` e basta: senza, la rampa resta alla tappa bassa
  // invece di inventare una scala che diverga da quella del piano e della legenda.
  assert.deepEqual(trattiDellaDeformata({ aste, stantia: false }).map((t) => t.colore),
                   [VIRIDIS[0], VIRIDIS[0]]);
  assert.equal(massimoSpostamento(aste), 8, "il massimo si sa ancora calcolare: lo fa `app.js`");
  assert.deepEqual(trattiDellaDeformata(null), []);
});

test("trattiDellaDeformata: stantia → tratti senza colore (rossi, nessun materiale di viridis)", () => {
  const aste = [{ id: 1, punti: [{ x: 0, y: 0, z: 0, u: 0 }, { x: 1, y: 0, z: 0, u: 8 }] }];
  const fuori = trattiDellaDeformata({ aste, stantia: true });
  assert.equal(fuori.length, 1);
  assert.equal(fuori[0].colore, null);
});

test("raggioCilindro: preso sull'estremo lontano, mai sotto tratto/2 px su nessuno dei due capi", () => {
  const occhio = { x: 0, y: 0, z: 0 };
  const estremi = [{ x: 0, y: 0, z: 1000 }, { x: 0, y: 0, z: 2000 }];
  const r = raggioCilindro(occhio, estremi, 90, 500, 6);
  assert.ok(Math.abs(r - pixelInMondo(2000, 90, 500) * 3) < 1e-9);
  for (const p of estremi) {
    const pxAlCapo = r / pixelInMondo(Math.hypot(p.x, p.y, p.z), 90, 500);
    assert.ok(pxAlCapo >= 3 - 1e-9, `capo a ${p.z}: ${pxAlCapo} px`);
  }
  assert.equal(raggioCilindro(occhio, estremi, 90, 0, 6), 0); // riquadro non misurato: spessore nullo, non NaN
});

// #85, fix finale — il conto della sonda dello spessore, provato a unità. Finora stava tutto dentro
// `sonda`, che senza WebGL non gira: i quattro assert del fumo che ne dipendono cadrebbero insieme a
// lui, e quell'attrezzo ha già mentito una volta (9,48 px letti contro 6,03 veri).

test("capoLontano: il capo più lontano, in qualunque ordine arrivi; elenco vuoto o assente → null", () => {
  const occhio = { x: 0, y: 0, z: 0 };
  const vicino = { x: 0, y: 0, z: 1000 }, lontano = { x: 0, y: 0, z: 2000 };
  assert.equal(capoLontano(occhio, [vicino, lontano]), lontano);
  assert.equal(capoLontano(occhio, [lontano, vicino]), lontano, "non è «l'ultimo dell'elenco», è il più lontano");
  // Euclidea, non profondità lungo un asse: di sbieco vince chi è davvero più distante.
  const sbieco = { x: 3000, y: 0, z: 0 };
  assert.equal(capoLontano(occhio, [sbieco, lontano]), sbieco);
  // L'occhio non è l'origine: la distanza si misura da lui.
  assert.equal(capoLontano({ x: 0, y: 0, z: 2100 }, [vicino, lontano]), vicino);
  assert.equal(capoLontano(occhio, []), null);
  assert.equal(capoLontano(occhio, undefined), null);
});

test("capoLontano: è lo stesso capo su cui `raggioCilindro` prende la misura (l'invariante della sonda)", () => {
  // La sonda proietta **questo** punto e `raggioCilindro` ci prende la misura: finché erano due
  // conti paralleli, divergere voleva dire un diametro reso più sottile del voluto e nessun test che
  // lo vedesse. Ora è la stessa funzione, e questa riga lo pinza.
  const occhio = { x: 0, y: 0, z: 0 };
  const estremi = [{ x: 0, y: 0, z: 2000 }, { x: 0, y: 0, z: 1000 }];
  const p = capoLontano(occhio, estremi);
  const d = Math.hypot(p.x - occhio.x, p.y - occhio.y, p.z - occhio.z);
  assert.ok(Math.abs(raggioCilindro(occhio, estremi, 90, 500, 6) - (pixelInMondo(d, 90, 500) * 6) / 2) < 1e-9);
});

test("diametroInPixel: uno scarto di un raggio in NDC vale un diametro sulla larghezza intera", () => {
  // x in NDC copre [-1, 1] sulla larghezza, cioè metà larghezza per unità: uno scarto di 0,01 —
  // che è un **raggio** — su un riquadro di 1200 px fa 12 px di **diametro**.
  assert.ok(Math.abs(diametroInPixel(0.2, 0.21, 1200) - 12) < 1e-9);
  assert.ok(Math.abs(diametroInPixel(0.21, 0.2, 1200) - 12) < 1e-9, "il verso non conta: è un modulo");
  assert.equal(diametroInPixel(0.2, 0.2, 1200), 0, "raggio nullo: diametro nullo, non NaN");
});

test("scaleDeiTratti: il raggio è quello che rende il tratto voluto, e senza il ciclo resterebbe 1", () => {
  // L'atteso è calcolato a mano, non ricopiato da `pixelInMondo`: con `fov` 90° la finestra è alta
  // quanto il doppio della distanza (tan 45° = 1), quindi a 2000 mm un riquadro di 500 px vale
  // 4000/500 = **8 mm per pixel**. Un tratto di 6 px vuole 48 mm di diametro, cioè 24 mm di raggio.
  const asta = { userData: { tratto: 6, estremi: [{ x: 0, y: 0, z: 1000 }, { x: 0, y: 0, z: 2000 }] } };
  const [s] = scaleDeiTratti([asta], { posizione: { x: 0, y: 0, z: 0 }, fov: 90 }, 500);
  assert.ok(Math.abs(s - 24) < 1e-9, `raggio ${s}, atteso 24 mm`);
  assert.notEqual(s, 1, "un raggio unitario vuol dire aste invisibili (#85)");
});

test("scaleDeiTratti: il raggio raddoppia col doppio della distanza, del tratto e di metà riquadro", () => {
  // Tre relazioni, non la formula: reggono qualunque sia la costante davanti, e cadono se la
  // prospettiva, il tratto o l'altezza del riquadro smettono di entrare nel conto.
  const con = (z, tratto, altezza) => scaleDeiTratti(
    [{ userData: { tratto, estremi: [{ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z }] } }],
    { posizione: { x: 0, y: 0, z: 0 }, fov: 45 }, altezza)[0];
  const base = con(1000, 4, 600);
  assert.ok(base > 0);
  assert.ok(Math.abs(con(2000, 4, 600) - 2 * base) < 1e-9, "il doppio della distanza vuole il doppio del raggio");
  assert.ok(Math.abs(con(1000, 8, 600) - 2 * base) < 1e-9, "il doppio del tratto vuole il doppio del raggio");
  assert.ok(Math.abs(con(1000, 4, 300) - 2 * base) < 1e-9, "metà riquadro vuole il doppio del raggio");
});

test("scaleDeiTratti: niente aste, oggetti senza tratto, riquadro non misurato, elenco che cambia", () => {
  const camera = { posizione: { x: 0, y: 0, z: 0 }, fov: 45 };
  assert.deepEqual(scaleDeiTratti([], camera, 500), []); // modello senza aste: nessun Math.max su vuoto
  const asta = { userData: { tratto: 2, estremi: [{ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 900 }] } };
  const punti = { userData: {} };   // i punti dei nodi: nessun `tratto`, e in scena stanno accanto alle aste
  const fuori = scaleDeiTratti([punti, asta, {}], camera, 500);
  assert.equal(fuori.length, 3, "l'array resta lungo quanto i figli, non quanto i soli cilindri");
  assert.deepEqual([fuori[0], fuori[2]], [null, null], "chi non è un cilindro prende null, non uno zero che lo scalerebbe via");
  assert.ok(fuori[1] > 0);
  // Riquadro non ancora misurato: spessore nullo, mai `NaN` — è la regola di `pixelInMondo`, e da
  // qui ci passa la scala che three.js scriverebbe nella matrice.
  const [zero] = scaleDeiTratti([asta], camera, 0);
  assert.equal(zero, 0);
  assert.ok(!Number.isNaN(zero));
  // Nessuno stato fra due giri: un passo della pushover con aste diverse non lascia raggi stantii.
  assert.equal(scaleDeiTratti([asta, asta], camera, 500).length, 2);
  assert.equal(scaleDeiTratti([asta], camera, 500).length, 1);
});

// R5 della critique 15b: orbita e zoom stavano solo su `pointer` e `wheel`, e da tastiera il 3D non
// si toccava (WCAG 2.1.1). Il conto sta qui, fuori da `creaSpazio`, per la ragione scritta in testa
// al modulo: senza WebGL il ciclo di `rendi` non gira, e una rotazione provata solo in browser
// sarebbe un numero che nessun test rilegge.

test("orbitaDaTasto: le frecce girano nel verso del trascinamento, e non toccano l'orbita di prima", () => {
  // Il verso e' quello del mouse (`pointermove`: theta -= dx, phi -= dy), non l'opposto: sono lo
  // stesso gesto su due periferiche, e due versi diversi sarebbero due modelli mentali.
  // Il passo qui e' 0,25 e non quello vero: e' esatto in binario, e l'uguaglianza misura la
  // rotazione invece dell'aritmetica in virgola mobile.
  const o = { theta: 1, phi: 1.5 };
  assert.deepEqual(orbitaDaTasto(o, "ArrowRight", 0.25), { theta: 0.75, phi: 1.5 });
  assert.deepEqual(orbitaDaTasto(o, "ArrowLeft", 0.25), { theta: 1.25, phi: 1.5 });
  assert.deepEqual(orbitaDaTasto(o, "ArrowDown", 0.25), { theta: 1, phi: 1.25 });
  assert.deepEqual(orbitaDaTasto(o, "ArrowUp", 0.25), { theta: 1, phi: 1.75 });
  assert.deepEqual(o, { theta: 1, phi: 1.5 }, "l'orbita in ingresso non si muta: chi la applica e' `rendi`");
});

test("orbitaDaTasto: phi resta nella banda del trascinamento, i poli non si attraversano", () => {
  // Gli stessi due estremi di `pointermove` (0,05 e pi meno 0,05), non altri: oltre il polo la
  // camera si capovolge, e `lookAt` con `up` sull'asse z darebbe un'inquadratura che si ribalta.
  assert.equal(orbitaDaTasto({ theta: 0, phi: 0.1 }, "ArrowDown", 1).phi, 0.05);
  assert.equal(orbitaDaTasto({ theta: 0, phi: 3.1 }, "ArrowUp", 1).phi, Math.PI - 0.05);
  // E un passo enorme non salta la banda: una pressione sola non porta mai fuori.
  assert.equal(orbitaDaTasto({ theta: 0, phi: 1.5 }, "ArrowUp", 100).phi, Math.PI - 0.05);
  assert.equal(orbitaDaTasto({ theta: 0, phi: 1.5 }, "ArrowDown", 100).phi, 0.05);
});

test("orbitaDaTasto: il passo di default e' quello dichiarato, non uno qualunque", () => {
  // I tre test qui sopra passano il passo a mano, quindi `PASSO_ORBITA` non lo guardava nessuno:
  // un passo dieci volte piu' piccolo li lasciava tutti verdi e in pagina la freccia non avrebbe
  // mosso niente di visibile. Il numero e' 0,12 rad — lo stesso ordine di grandezza dei 0,006 rad
  // per pixel del trascinamento, cioe' venti pixel di mouse per pressione.
  assert.equal(orbitaDaTasto({ theta: 0, phi: 1 }, "ArrowLeft").theta, 0.12);
  assert.equal(orbitaDaTasto({ theta: 0, phi: 1 }, "ArrowRight").theta, -0.12);
});

test("orbitaDaTasto: un tasto che non e' una freccia torna null, e non lo ruba a nessuno", () => {
  // E' la guardia dell'ingresso degenere: il `keydown` della tela ferma il tasto **solo** quando
  // questa ha qualcosa da renderne. `null` vuol dire che P resta la presentazione, Esc resta Esc,
  // e una lettera scritta in un campo resta di chi la scrive.
  for (const k of ["p", "n", " ", "Enter", "Escape", "ArrowUpLeft", "arrowright", "", undefined, null])
    assert.equal(orbitaDaTasto({ theta: 0, phi: 1 }, k), null, `il tasto ${JSON.stringify(k)} non e' una freccia`);
});
