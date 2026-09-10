import { test } from "node:test";
import assert from "node:assert/strict";
import { VISTE, assiDi, asteRuotate, casiDi, scala125, latoMaggiore, frecciaMassima, scalaAuto, puntiDeformata,
         scalaDiagrammaAuto, diagramma, picchi, testoValore, testoBadge, righeSpostamenti, righeReazioni,
         testoEquilibrio, srotolato } from "../risultati.js";

// La trave appoggiata di `tests/fixture/trave_appoggiata.nova.json`: L = 6000, q = −10 N/mm, Z1.
const trave = { nodi: [{ id: 1, x: 0, y: 0, z: 0 }, { id: 2, x: 6000, y: 0, z: 0 }],
                aste: [{ id: 1, nodo_i: 1, nodo_j: 2 }] };
const L = 6000, q = 10;
// Nove stazioni come le scrive `nova/corsa.py:_stazioni` con `suddivisioni: 2`: M = q·x·(L−x)/2, V = q·(L/2 − x).
const XI = [0, 0.1726731646, 0.5, 0.8273268354, 1];
const xRel = [...XI.map((x) => x / 2), ...XI.slice(1).map((x) => 0.5 + x / 2)];
const stazioni = xRel.map((r) => ({ x_rel: r, N: 0, Vy: 0, Vz: q * (L / 2 - r * L), T: 0, My: q * r * L * (L - r * L) / 2, Mz: 0 }));
const Z1 = {
  con_segno: true,
  spostamenti: { 1: [0, 0, 0, 0, 0.0043, 0], 2: [0, 0, 0, 0, -0.0043, 0] },
  reazioni: { 1: [0, 0, 30000, 0, 0, 0], 2: [0, 0, 30000, 0, 0, 0] },
  sollecitazioni: { 1: stazioni },
};
const risultati = { run: { carico_totale: { Z1: [0, 0, -60000] } }, per_caso: { Z1 } };

test("casiDi: i casi in ordine di per_caso; senza risultati nessun caso, e non solleva", () => {
  assert.deepEqual(casiDi(risultati), ["Z1"]);
  assert.deepEqual(casiDi(null), []);
  assert.deepEqual(casiDi({}), []);
});

test("scala125: la serie 1-2-5, e gli ingressi degeneri danno 1", () => {
  assert.equal(scala125(120), 100);
  assert.equal(scala125(37), 50);
  assert.equal(scala125(14), 10);
  assert.equal(scala125(1.4), 1);
  assert.equal(scala125(0.3), 0.2);
  assert.equal(scala125(0), 1);
  assert.equal(scala125(-5), 1);
  assert.equal(scala125(NaN), 1);
  assert.equal(scala125(Infinity), 1);
});

test("scalaAuto: il massimo spostamento nel piano disegnato è il 5 % del lato maggiore, in 1-2-5", () => {
  const perCaso = { spostamenti: { 1: [0, 0, 0, 0, 0, 0], 2: [0, 0, -3, 0, 0, 0] } };
  assert.equal(latoMaggiore(trave), 6000);
  assert.equal(frecciaMassima(trave, perCaso).valore, 3);
  assert.equal(scalaAuto(trave, perCaso), 100);   // 0,05·6000/3 = 100
  assert.equal(scalaAuto(trave, { spostamenti: {} }), 1, "senza spostamenti la scala è 1");
  // Era «spostamenti nulli nel piano → 1»: falso, ed è il difetto visto a mano su Chrome. Gli
  // appoggi di Z1 non si spostano (`ux = uz = 0`), ma le rotazioni ±0,0043 portano la mezzeria a
  // L·θ/4 = 6000·0,0043/4 = 6,45 mm. La freccia c'è, e la scala la deve vedere.
  assert.equal(frecciaMassima(trave, Z1).valore.toFixed(2), "6.45", "la freccia sta in mezzeria, non sui nodi");
  assert.equal(scalaAuto(trave, Z1), 50, "0,05·6000/6,45 = 46,5 → 50");
  assert.equal(scalaAuto({ nodi: [], aste: [] }, Z1), 1);
  assert.equal(frecciaMassima(trave, { spostamenti: { 1: [3, 0, 4, 0, 0, 0] } }).valore, 5, "nel piano: hypot(ux, uz)");
  assert.equal(frecciaMassima(trave, { spostamenti: { 9: [100, 0, 0, 0, 0, 0] } }).valore, 0, "un nodo che non è nel modello non conta");
});

test("puntiDeformata: Hermite — gli estremi restano sui nodi spostati, la mezzeria scende, y lineare", () => {
  // Rotazioni di segno opposto agli estremi e frecce nulle: la mezzeria scende (dw/ds = −θy).
  const perCaso = { spostamenti: { 1: [0, 0, 0, 0, 0.01, 0], 2: [0, 0, 0, 0, -0.01, 0] } };
  const [d] = puntiDeformata(trave, perCaso, 1, 8);
  assert.equal(d.id, 1);
  assert.equal(d.punti.length, 9);
  assert.deepEqual(d.punti[0], { x: 0, y: 0, z: 0 });
  assert.deepEqual(d.punti[8], { x: 6000, y: 0, z: 0 });
  assert.ok(d.punti[4].z < -1, `la mezzeria scende: z = ${d.punti[4].z}`);
  assert.ok(Math.abs(d.punti[4].x - 3000) < 1e-9);
  // La scala moltiplica gli spostamenti, non le coordinate.
  const [d10] = puntiDeformata(trave, perCaso, 10, 8);
  assert.ok(Math.abs(d10.punti[4].z - 10 * d.punti[4].z) < 1e-9);
  // Uno spostamento assiale di j allunga l'asta; uno lungo y (fuori dal piano) va lineare.
  const [e] = puntiDeformata(trave, { spostamenti: { 1: [0, 0, 0, 0, 0, 0], 2: [6, 8, 0, 0, 0, 0] } }, 1, 2);
  assert.deepEqual(e.punti[2], { x: 6006, y: 8, z: 0 });
  assert.deepEqual(e.punti[1], { x: 3003, y: 4, z: 0 });
});

test("puntiDeformata: ingressi degeneri — asta orfana saltata, nodo senza spostamenti fermo, lista vuota", () => {
  assert.deepEqual(puntiDeformata({ nodi: [], aste: [] }, Z1, 1), []);
  const orfana = { nodi: trave.nodi, aste: [{ id: 7, nodo_i: 1, nodo_j: 99 }] };
  assert.deepEqual(puntiDeformata(orfana, Z1, 1), []);
  const [d] = puntiDeformata(trave, { spostamenti: {} }, 100, 4);
  assert.deepEqual(d.punti[2], { x: 3000, y: 0, z: 0 }, "senza spostamenti la deformata è l'ombra");
  const [z] = puntiDeformata(trave, Z1, 1, 0);
  assert.equal(z.punti.length, 2, "segmenti ≤ 1 diventa 1: i due estremi");
});

test("diagramma: M sul lato teso (positivo verso −e2), V e N verso +e2, ordinate per stazione", () => {
  const sc = 1 / 1e5;   // mm per N·mm
  const [dM] = diagramma(trave, Z1, "M", sc);
  assert.equal(dM.id, 1);
  assert.deepEqual(dM.base, [{ x: 0, z: 0 }, { x: 6000, z: 0 }]);
  assert.equal(dM.punti.length, 9);
  const mezzo = dM.punti[4];
  assert.ok(Math.abs(mezzo.x_rel - 0.5) < 1e-12);
  assert.ok(Math.abs(mezzo.valore - 45e6) < 1, `M(0,5) = qL²/8 = 45 000 000: ${mezzo.valore}`);
  assert.ok(Math.abs(mezzo.x - 3000) < 1e-9);
  assert.ok(Math.abs(mezzo.z - (-450)) < 1e-9, "M positivo sotto la trave (fibre inferiori tese)");
  const [dV] = diagramma(trave, Z1, "V", 1 / 100);
  assert.ok(Math.abs(dV.punti[0].z - 300) < 1e-9, "V = +30 000 N all'estremo i, sopra");
  assert.ok(Math.abs(dV.punti[8].z - (-300)) < 1e-9, "V = −30 000 N all'estremo j, sotto");
  assert.ok(Math.abs(dV.punti[4].z) < 1e-9, "V nullo in mezzeria");
});

test("diagramma: la parabola non è una retta — la stazione a un quarto sta a 3/4 del picco", () => {
  const [dM] = diagramma(trave, Z1, "M", 1);
  const quarto = dM.punti.find((p) => Math.abs(p.x_rel - 0.25) < 0.1);
  assert.ok(quarto, "c'è una stazione vicino a x/L = 0,25");
  const atteso = q * quarto.x_rel * L * (L - quarto.x_rel * L) / 2;
  assert.ok(Math.abs(quarto.valore - atteso) < 1);
});

test("assiDi: una trave flette con My/Vz, un pilastro con Mz/Vy, e `n` non è la normale sinistra", () => {
  const i = { x: 0, z: 0 };
  const dx = assiDi(i, { x: 6000, z: 0 });
  assert.deepEqual([dx.M, dx.V, dx.N], ["My", "Vz", "N"]);
  assert.equal(dx.verticale, false);
  assert.deepEqual(dx.n, { x: -0, z: 1 }, "trave da sinistra a destra: n = +e2 = in alto");
  // La stessa trave con i nodi scambiati: `n` non gira, così M resta sotto in tutti e due i casi.
  const sx = assiDi({ x: 6000, z: 0 }, i);
  assert.deepEqual([sx.M, sx.V], ["My", "Vz"]);
  assert.ok(Math.abs(sx.n.z - 1) < 1e-12 && Math.abs(sx.n.x) < 1e-12);
  const su = assiDi(i, { x: 0, z: 3000 });
  assert.deepEqual([su.M, su.V, su.N], ["Mz", "Vy", "N"], "pilastro: la z locale esce dal piano");
  assert.equal(su.verticale, true);
  assert.deepEqual(su.e2, { x: -1, z: 0 });
  assert.deepEqual(su.n, { x: 1, z: -0 }, "pilastro che sale: n = −e2 = verso +x");
  assert.equal(assiDi(i, { x: 0, z: 0 }), null, "asta di lunghezza nulla: nessun asse, non solleva");
});

test("diagramma su un pilastro verticale: si legge Mz (non My), e M positivo sta a −n = sinistra", () => {
  const pilastro = { nodi: [{ id: 1, x: 0, y: 0, z: 0 }, { id: 2, x: 0, y: 0, z: 3000 }], aste: [{ id: 1, nodo_i: 1, nodo_j: 2 }] };
  // Il pilastro reale: `My` è zero a meno del rumore numerico, la flessione nel piano è tutta in `Mz`
  // (misurato sul telaio 2×1 il 10/09/2026). Un diagramma che leggesse `My` sarebbe una riga piatta.
  const perCaso = { sollecitazioni: { 1: [{ x_rel: 0, N: -1000, Vy: 500, Vz: 1e-10, T: 0, My: 1e-9, Mz: 2e6 },
                                          { x_rel: 1, N: -1000, Vy: 500, Vz: 1e-10, T: 0, My: 1e-9, Mz: 2e6 }] } };
  const [dM] = diagramma(pilastro, perCaso, "M", 1e-4);
  assert.equal(dM.chiave, "Mz");
  assert.equal(dM.punti[0].valore, 2e6);
  // n = (+1, 0), M positivo verso −n: il lato teso di un pilastro spinto verso +x è quello a −x.
  assert.ok(dM.punti[0].x < 0 && Math.abs(dM.punti[0].x + 200) < 1e-9, `x = ${dM.punti[0].x}`);
  // V e N stanno **sempre** a sinistra di i→j (`e2`), non sull'asse del solutore: il lato è uno
  // solo per tutto il disegno e la legenda del badge lo può dichiarare in una riga. Un pilastro
  // che sale ha `e2 = (−1, 0)`, quindi il positivo va a −x.
  const [dV] = diagramma(pilastro, perCaso, "V", 1e-2);
  assert.equal(dV.chiave, "Vy");
  assert.ok(dV.punti[0].x < 0, `V positivo a sinistra di i→j: x = ${dV.punti[0].x}`);
  const [dN] = diagramma(pilastro, perCaso, "N", 1e-2);
  assert.ok(dN.punti[0].x > 0, "N negativo (compressione): dalla parte opposta, cioè +x");
});

test("diagramma: il verso di M non dipende dall'ordine dei nodi — sotto la trave in tutti e due i casi", () => {
  const rovescia = { nodi: trave.nodi, aste: [{ id: 1, nodo_i: 2, nodo_j: 1 }] };
  const [dritto] = diagramma(trave, Z1, "M", 1 / 1e5);
  const [rovescio] = diagramma(rovescia, Z1, "M", 1 / 1e5);
  const zDritto = Math.min(...dritto.punti.map((p) => p.z));
  const zRovescio = Math.min(...rovescio.punti.map((p) => p.z));
  assert.ok(zDritto < -400 && zRovescio < -400, `${zDritto} e ${zRovescio}: M sempre sotto`);
});

test("diagramma: ingressi degeneri — senza stazioni niente, scala 0 = diagramma piatto, vista ignota solleva", () => {
  assert.deepEqual(diagramma(trave, { sollecitazioni: {} }, "M", 1), []);
  assert.deepEqual(diagramma(trave, { sollecitazioni: { 1: [] } }, "M", 1), []);
  const [piatto] = diagramma(trave, Z1, "M", 0);
  assert.ok(piatto.punti.every((p) => Math.abs(p.z) < 1e-12));
  assert.throws(() => diagramma(trave, Z1, "T", 1), /vista sconosciuta: T/);
});

test("scalaDiagrammaAuto: il massimo in modulo disegnato è l'8 % del lato maggiore; senza valori 0", () => {
  assert.ok(Math.abs(scalaDiagrammaAuto(trave, Z1, "M") - 0.08 * 6000 / 45e6) < 1e-15);
  assert.ok(Math.abs(scalaDiagrammaAuto(trave, Z1, "V") - 0.08 * 6000 / 30000) < 1e-15);
  assert.equal(scalaDiagrammaAuto(trave, Z1, "N"), 0, "N tutto nullo → 0, non Infinity");
  assert.equal(scalaDiagrammaAuto(trave, { sollecitazioni: {} }, "M"), 0);
  // Una scala sola per il telaio: il `My` della trave e il `Mz` del pilastro entrano nello
  // stesso massimo, altrimenti i due diagrammi non si possono confrontare a occhio.
  const telaio = { nodi: [{ id: 1, x: 0, z: 0 }, { id: 2, x: 0, z: 3000 }, { id: 3, x: 6000, z: 3000 }],
                   aste: [{ id: 1, nodo_i: 1, nodo_j: 2 }, { id: 2, nodo_i: 2, nodo_j: 3 }] };
  const misto = { sollecitazioni: { 1: [{ x_rel: 0, My: 0, Mz: 9e7 }, { x_rel: 1, My: 0, Mz: 0 }],
                                    2: [{ x_rel: 0, My: 45e6, Mz: 0 }, { x_rel: 1, My: 0, Mz: 0 }] } };
  assert.ok(Math.abs(scalaDiagrammaAuto(telaio, misto, "M") - 0.08 * 6000 / 9e7) < 1e-18,
            "il massimo è il Mz del pilastro, non il My della trave");
});

test("picchi: il massimo in modulo; l'estremo opposto solo se ≥ 5 % del massimo; niente su vuoto", () => {
  assert.deepEqual(picchi(stazioni, "My"), [{ x_rel: 0.5, valore: 45e6 }]);
  const v = picchi(stazioni, "Vz");
  assert.equal(v.length, 2);
  assert.deepEqual(v[0], { x_rel: 0, valore: 30000 });
  assert.deepEqual(v[1], { x_rel: 1, valore: -30000 });
  assert.deepEqual(picchi([], "My"), []);
  assert.deepEqual(picchi(null, "My"), []);
  assert.deepEqual(picchi([{ x_rel: 0, My: 0 }, { x_rel: 1, My: 0 }], "My"), [], "tutto nullo: nessun picco da scrivere");
  // Un momento quasi costante con un piccolo segno opposto sotto il 5 %: un picco solo.
  assert.equal(picchi([{ x_rel: 0, My: 100 }, { x_rel: 0.5, My: 100 }, { x_rel: 1, My: -2 }], "My").length, 1);
});

test("testoValore: kN·m per M, kN per V e N, mm per la deformata, notazione italiana, trattino sul non finito", () => {
  assert.equal(testoValore("M", 45e6), "45 kN·m");
  assert.equal(testoValore("M", -12.34e6), "-12,34 kN·m");
  assert.equal(testoValore("V", 30000), "30 kN");
  assert.equal(testoValore("N", -1234.5), "-1,23 kN");
  assert.equal(testoValore("deformata", 3.456), "3,46 mm");
  assert.equal(testoValore("M", NaN), "—");
});

test("testoBadge: la scala sempre stampata, la legenda una volta, «stantia» davanti", () => {
  assert.equal(testoBadge({ vista: "deformata", caso: "Z1", scala: 120, auto: true }), "deformata · Z1 · ×120 (auto)");
  assert.equal(testoBadge({ vista: "deformata", caso: "Z1", scala: 50, auto: false }), "deformata · Z1 · ×50 (a mano)");
  assert.equal(testoBadge({ vista: "M", caso: "Z1" }), "M · Z1 · kN·m · lato teso");
  // Il lato del positivo è nella legenda perché ora è uno solo per tutto il disegno.
  assert.equal(testoBadge({ vista: "V", caso: "Z1" }), "V · Z1 · kN · + verso i→j, a sinistra di i→j");
  assert.equal(testoBadge({ vista: "N", caso: "Z1" }), "N · Z1 · kN · + trazione, a sinistra di i→j");
  assert.equal(testoBadge({ vista: "M", caso: "Z1", stantia: true }), "stantia · M · Z1 · kN·m · lato teso");
  assert.equal(testoBadge({ vista: null }), "");
});

test("testoBadge: le aste con la sezione ruotata si contano, e non nella deformata", () => {
  assert.equal(testoBadge({ vista: "M", caso: "Z1", ruotate: 1 }),
    "M · Z1 · kN·m · lato teso · 1 asta con sezione ruotata non disegnata");
  assert.equal(testoBadge({ vista: "V", caso: "Z1", ruotate: 3 }),
    "V · Z1 · kN · + verso i→j, a sinistra di i→j · 3 aste con sezione ruotata non disegnate");
  assert.equal(testoBadge({ vista: "M", caso: "Z1", ruotate: 0 }), "M · Z1 · kN·m · lato teso");
  assert.equal(testoBadge({ vista: "deformata", caso: "Z1", scala: 1, auto: true, ruotate: 2 }),
    "deformata · Z1 · ×1 (auto)", "la deformata è in terna globale: la rotazione non la tocca");
});

test("assiDi: il verticale si decide in 3D, con la y dei nodi dentro", () => {
  // La stessa riga del deck (`nova/deck.py:428`): `abs(asse[2]) > 0,999` sull'asse **3D**.
  const obliqua = assiDi({ x: 0, y: 0, z: 0 }, { x: 0, y: 4000, z: 3000 });
  assert.equal(obliqua.verticale, false, "3000 su 5000 di asse: 0,6, altro che verticale");
  assert.deepEqual([obliqua.M, obliqua.V], ["My", "Vz"]);
  const quasi = assiDi({ x: 0, y: 0, z: 0 }, { x: 0, y: 10, z: 6000 });
  assert.equal(quasi.verticale, true, "10 mm di sbieco su 6 m restano un pilastro");
  assert.deepEqual([quasi.M, quasi.V], ["Mz", "Vy"]);
  // `y` assente vale 0, che è come nascono i nodi del piano di lavoro.
  assert.equal(assiDi({ x: 0, z: 0 }, { x: 0, z: 3000 }).verticale, true);
});

test("aste con la sezione ruotata: fuori dai diagrammi, dentro la deformata", () => {
  const ruotata = { nodi: trave.nodi, aste: [{ id: 1, nodo_i: 1, nodo_j: 2, rotazione_deg: 30 }] };
  assert.equal(asteRuotate(ruotata), 1);
  assert.deepEqual(diagramma(ruotata, Z1, "M", 1), [], "la chiave sarebbe sbagliata: non si disegna");
  assert.equal(scalaDiagrammaAuto(ruotata, Z1, "M"), 0, "e non entra nemmeno nella scala");
  assert.equal(puntiDeformata(ruotata, Z1, 1)[0].punti.length, 9, "la deformata sì: è in terna globale");
  // 0 e 180 non ruotano la terna nel piano: quelle aste si disegnano.
  for (const g of [0, 180, -180, 360, null, undefined]) {
    const dritta = { nodi: trave.nodi, aste: [{ id: 1, nodo_i: 1, nodo_j: 2, rotazione_deg: g }] };
    assert.equal(asteRuotate(dritta), 0, `rotazione_deg ${g} non è una rotazione`);
    assert.equal(diagramma(dritta, Z1, "M", 1).length, 1);
  }
});

test("righeSpostamenti e righeReazioni: sei componenti in due righe, unità su ogni numero", () => {
  const perCaso = { spostamenti: { 3: [0.5, 0, -3.456, 0.001, 0.0008, 0] }, reazioni: { 3: [0, 0, 30000, 0, 2.5e6, 0] } };
  assert.deepEqual(righeSpostamenti(perCaso, 3), [
    ["spostamenti", "ux 0,5 mm · uy 0 mm · uz -3,46 mm"],
    ["rotazioni", "φx 1 mrad · φy 0,8 mrad · φz 0 mrad"],
  ]);
  assert.deepEqual(righeReazioni(perCaso, 3), [
    ["reazioni", "Rx 0 kN · Ry 0 kN · Rz 30 kN"],
    ["momenti di reazione", "Mx 0 kN·m · My 2,5 kN·m · Mz 0 kN·m"],
  ]);
  assert.deepEqual(righeSpostamenti(perCaso, 9), [], "un nodo senza spostamenti non ha righe");
  assert.deepEqual(righeReazioni(perCaso, 9), [], "un nodo non vincolato non ha reazioni");
  assert.deepEqual(righeSpostamenti(null, 3), []);
  assert.deepEqual(righeSpostamenti({ spostamenti: { 3: [1, 2] } }, 3), [], "meno di sei componenti: niente, non undefined");
});

test("testoEquilibrio: Σ reazioni contro Σ carichi del caso, in kN; senza dati un trattino", () => {
  assert.equal(testoEquilibrio(risultati, "Z1"), "Σ reazioni (0; 0; 60) kN · Σ carichi (0; 0; -60) kN");
  assert.equal(testoEquilibrio(risultati, "Z9"), "—");
  assert.equal(testoEquilibrio(null, "Z1"), "—");
  assert.equal(testoEquilibrio({ per_caso: { Z1: { reazioni: {} } }, run: {} }, "Z1"), "Σ reazioni (0; 0; 0) kN · Σ carichi —");
});

test("srotolato: i punti per x_rel e il massimo in modulo; vuoto → nessun punto e massimo 0", () => {
  const s = srotolato(stazioni, "My");
  assert.equal(s.punti.length, 9);
  assert.deepEqual(s.punti[4], { x_rel: 0.5, valore: 45e6 });
  assert.equal(s.massimo, 45e6);
  assert.deepEqual(srotolato([], "My"), { punti: [], massimo: 0 });
  assert.deepEqual(srotolato(undefined, "My"), { punti: [], massimo: 0 });
});

test("VISTE: le quattro viste, nell'ordine dei tasti 1-4", () => {
  assert.deepEqual(VISTE, ["deformata", "M", "V", "N"]);
});

// Gli oracoli del contratto degli ingressi che i test qui sopra non toccano.

test("degeneri: modello vuoto, asta orfana, asta di lunghezza nulla — niente disegno, nessun NaN", () => {
  assert.equal(latoMaggiore({ nodi: [], aste: [] }), 2000, "senza nodi il lato è il minimo di `piano.js`");
  assert.equal(latoMaggiore({}), 2000);
  assert.deepEqual(diagramma({ nodi: [], aste: [] }, Z1, "M", 1), []);
  const orfana = { nodi: trave.nodi, aste: [{ id: 1, nodo_i: 1, nodo_j: 99 }] };
  assert.deepEqual(diagramma(orfana, Z1, "M", 1), [], "asta orfana: non disegnata a metà");
  const nulla = { nodi: [{ id: 1, x: 0, y: 0, z: 0 }, { id: 2, x: 0, y: 0, z: 0 }],
                  aste: [{ id: 1, nodo_i: 1, nodo_j: 2 }] };
  assert.deepEqual(puntiDeformata(nulla, Z1, 1), [], "L = 0: l'asta si salta");
  assert.deepEqual(diagramma(nulla, Z1, "M", 1), []);
  assert.equal(scalaDiagrammaAuto(nulla, Z1, "M"), 0);
  // Un modello senza nodi ma con le aste non fa sollevare nemmeno le funzioni di scala.
  assert.equal(scalaAuto({ nodi: [], aste: orfana.aste }, Z1), 1);
  assert.deepEqual(puntiDeformata({ nodi: [], aste: orfana.aste }, Z1, 1), []);
});

test("degeneri: uno spostamento con un NaN o corto vale come assente, non si propaga nei punti", () => {
  const rotto = { spostamenti: { 1: [NaN, 0, 0, 0, 0, 0], 2: [0, 0, -3] } };
  assert.equal(frecciaMassima(trave, rotto).valore, 0, "né il NaN né la lista corta contano");
  assert.equal(scalaAuto(trave, rotto), 1);
  const [d] = puntiDeformata(trave, rotto, 100, 4);
  assert.ok(d.punti.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z)),
            "nodo fermo, non un NaN nel `points`");
  assert.deepEqual(d.punti[4], { x: 6000, y: 0, z: 0 });
  const conNull = { spostamenti: { 2: [0, 0, null, 0, 0, 0] } };
  assert.equal(frecciaMassima(trave, conNull).valore, 0);
});

test("degeneri: una stazione con valori non finiti vale 0 e sparisce da picchi e srotolato", () => {
  const rotte = [{ x_rel: 0, My: NaN }, { x_rel: NaN, My: 45e6 }, { x_rel: 1, My: Infinity }];
  const [d] = diagramma(trave, { sollecitazioni: { 1: rotte } }, "M", 1e-5);
  assert.equal(d.punti.length, 3, "il diagramma resta chiuso: una stazione, un punto");
  assert.ok(d.punti.every((p) => Number.isFinite(p.x) && Number.isFinite(p.z)));
  assert.deepEqual(d.punti.map((p) => p.valore), [0, 45e6, 0]);
  assert.deepEqual(picchi(rotte, "My"), [], "nessuna stazione buona: niente etichette");
  assert.deepEqual(srotolato(rotte, "My"), { punti: [], massimo: 0 });
});

test("degeneri: due stazioni sullo stesso x_rel — due punti nel poligono, una sola etichetta", () => {
  const doppia = [{ x_rel: 0, My: 0 }, { x_rel: 0.5, My: 45e6 }, { x_rel: 0.5, My: 45e6 }, { x_rel: 1, My: 0 }];
  const [d] = diagramma(trave, { sollecitazioni: { 1: doppia } }, "M", 1e-5);
  assert.equal(d.punti.length, 4);
  assert.deepEqual([d.punti[1].x, d.punti[1].z], [d.punti[2].x, d.punti[2].z], "stessa ascissa, stessa ordinata");
  assert.deepEqual(picchi(doppia, "My"), [{ x_rel: 0.5, valore: 45e6 }], "un picco solo, non due sovrapposti");
});

test("degeneri: anche `scalaDiagrammaAuto` rifiuta una vista che non esiste", () => {
  assert.throws(() => scalaDiagrammaAuto(trave, Z1, "deformata"), /vista sconosciuta: deformata/);
});

test("degeneri: `segmenti` non finito torna al default — 8 tratti, non un ciclo infinito", () => {
  // `segmenti = 8` è un default di parametro: copre `undefined`, non `Infinity` né `NaN`.
  assert.equal(puntiDeformata(trave, Z1, 1, Infinity)[0].punti.length, 9);
  assert.equal(puntiDeformata(trave, Z1, 1, NaN)[0].punti.length, 9);
  assert.equal(puntiDeformata(trave, Z1, 1, undefined)[0].punti.length, 9);
  assert.equal(puntiDeformata(trave, Z1, 1, -3)[0].punti.length, 2, "un numero finito assurdo resta un tratto solo");
});

test("degeneri: un modello con le aste ma senza `nodi` non fa sollevare `nodo()`", () => {
  const senzaNodi = { aste: [{ id: 1, nodo_i: 1, nodo_j: 2 }] };
  assert.deepEqual(puntiDeformata(senzaNodi, Z1, 1), []);
  assert.deepEqual(diagramma(senzaNodi, Z1, "M", 1), []);
  assert.equal(scalaDiagrammaAuto(senzaNodi, Z1, "M"), 0);
  assert.equal(frecciaMassima(senzaNodi, Z1).valore, 0);
  assert.equal(scalaAuto(senzaNodi, Z1), 1);
  assert.equal(latoMaggiore(senzaNodi), 2000);
});

// --- la freccia vera, non i nodi (fix di fine ramo) -------------------------------
// Misurato a mano su Chrome: col massimo preso sui nodi il badge diceva ×2e20 sulla trave
// appoggiata (rumore 1e-20 agli appoggi) e ×50 000 sul MURO 1 (0,0021 mm ai piedi).

test("frecciaMassima: la freccia sta in mezzeria, e dice dove", () => {
  const f = frecciaMassima(trave, Z1);
  assert.equal(f.valore.toFixed(2), "6.45", "L·θ/4 = 6000·0,0043/4");
  assert.equal(f.punto.x, 3000, "in mezzeria, non su un appoggio");
  assert.equal(f.indeformato.x, 3000);
  assert.equal(f.indeformato.z, 0);
  assert.ok(f.punto.z < 0, "la trave scende");
});

test("frecciaMassima: sotto un milionesimo del lato maggiore è rumore, non spostamento", () => {
  const rumore = { spostamenti: { 1: [1e-20, 0, 1e-20, 0, 0, 0], 2: [0, 0, -1e-20, 0, 1e-20, 0] } };
  assert.deepEqual(frecciaMassima(trave, rumore), { valore: 0, punto: null, indeformato: null });
  assert.equal(scalaAuto(trave, rumore), 1, "×1, non ×2e20: la deformata resta nel riquadro");
  // Il pavimento è relativo al modello: 1e-6·6000 = 0,006 mm.
  assert.equal(frecciaMassima(trave, { spostamenti: { 2: [0, 0, -0.005, 0, 0, 0] } }).valore, 0);
  assert.equal(frecciaMassima(trave, { spostamenti: { 2: [0, 0, -0.05, 0, 0, 0] } }).valore, 0.05);
});

test("frecciaMassima: un nodo che nessun'asta tocca vale per sé", () => {
  const conIsolato = { nodi: [...trave.nodi, { id: 3, x: 0, y: 0, z: 3000 }], aste: trave.aste };
  const f = frecciaMassima(conIsolato, { spostamenti: { 3: [10, 0, 0, 0, 0, 0] } });
  assert.equal(f.valore, 10);
  assert.deepEqual(f.punto, { x: 10, z: 3000 });
  assert.deepEqual(f.indeformato, { x: 0, z: 3000 });
});

// --- la soglia del verticale (review di ramo, mutante vivo) -----------------------
// `verticale` decide se un'asta legge `Mz`/`Vy` (pilastro) o `My`/`Vz` (trave). Tutte le fixture
// dei test avevano pilastri **esattamente** verticali, quindi `>= 1` al posto di `> 0,999` non
// faceva cadere niente: un pilastro storto di un millimetro sarebbe uscito come una riga piatta.

test("assiDi: un pilastro fuori piombo di 1 mm su 6 m è ancora un pilastro", () => {
  const t = assiDi({ x: 0, z: 0 }, { x: 1, z: 6000 });
  assert.equal(t.verticale, true, "cos ≈ 0,99999999 > 0,999");
  assert.deepEqual([t.M, t.V], ["Mz", "Vy"]);
});

test("assiDi: oltre la soglia l'asta inclinata torna a leggersi come una trave", () => {
  const t = assiDi({ x: 0, z: 0 }, { x: 300, z: 6000 });
  assert.ok(Math.abs(t.e1.z - 0.998752) < 1e-5, `cos = ${t.e1.z}: sotto 0,999, appena`);
  assert.equal(t.verticale, false);
  assert.deepEqual([t.M, t.V], ["My", "Vz"]);
});

// --- i nodi interni delle suddivisioni (debito 1) ---------------------------------
// Il limite dichiarato — mezzeria a −1,2568 invece di −1,5709, cioè 4/5 — era il prezzo di una
// cubica sui soli estremi. Col nodo interno vero la deformata ci passa sopra, esatta.

const INTERNO = { 1: [{ x_rel: 0.5, u: [0, 0, -1.5709, 0, 0, 0] }] };

test("puntiDeformata: col nodo interno la mezzeria è la freccia vera, non i 4/5 di Hermite", () => {
  const perCaso = { spostamenti: { 1: [0, 0, 0, 0, 0.0043, 0], 2: [0, 0, 0, 0, -0.0043, 0] },
                    spostamenti_interni: INTERNO };
  const [d] = puntiDeformata(trave, perCaso, 1, 8);
  assert.equal(d.punti.length, 17, "due tratti da otto segmenti, il nodo in comune una volta sola");
  assert.equal(d.xRel[8], 0.5);
  assert.ok(Math.abs(d.punti[8].z - (-1.5709)) < 1e-12, `la mezzeria è il nodo interno: ${d.punti[8].z}`);
  assert.deepEqual(d.punti[0], { x: 0, y: 0, z: 0 }, "gli estremi restano sui nodi del modello");
  assert.deepEqual(d.punti[16], { x: 6000, y: 0, z: 0 });
  // La scala moltiplica lo spostamento, il nodo interno compreso.
  const [d10] = puntiDeformata(trave, perCaso, 10, 8);
  assert.ok(Math.abs(d10.punti[8].z - (-15.709)) < 1e-11);
});

test("puntiDeformata: senza la chiave, o con la lista vuota, resta la cubica di prima", () => {
  const senza = puntiDeformata(trave, Z1, 1, 8)[0];
  const vuota = puntiDeformata(trave, { ...Z1, spostamenti_interni: { 1: [] } }, 1, 8)[0];
  const altra = puntiDeformata(trave, { ...Z1, spostamenti_interni: { 9: INTERNO[1] } }, 1, 8)[0];
  assert.equal(senza.punti.length, 9);
  assert.deepEqual(vuota.punti, senza.punti);
  assert.deepEqual(altra.punti, senza.punti, "gli interni di un'altra asta non toccano questa");
  assert.deepEqual(senza.xRel, [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1]);
});

test("puntiDeformata: una stazione interna guasta si salta, le buone restano", () => {
  const rotte = { 1: [
    { x_rel: 0, u: [0, 0, -9, 0, 0, 0] },        // 0 non è interno: è l'estremo, e lo darebbe due volte
    { x_rel: 1, u: [0, 0, -9, 0, 0, 0] },        // idem all'altro capo
    { x_rel: 1.5, u: [0, 0, -9, 0, 0, 0] },      // fuori dall'asta
    { x_rel: NaN, u: [0, 0, -9, 0, 0, 0] },
    { x_rel: 0.5, u: [0, 0, -1.5709] },          // lista corta
    { x_rel: 0.75, u: [0, 0, NaN, 0, 0, 0] },
    { x_rel: 0.25, u: [0, 0, -1, 0, 0, 0] },     // l'unica buona
  ] };
  const [d] = puntiDeformata(trave, { spostamenti: {}, spostamenti_interni: rotte }, 1, 4);
  assert.equal(d.punti.length, 9, "due tratti da quattro segmenti: una sola stazione è buona");
  assert.equal(d.xRel[4], 0.25);
  assert.ok(Math.abs(d.punti[4].z - (-1)) < 1e-12);
});

test("puntiDeformata: stazioni interne in disordine si riordinano, non ripiegano l'asta", () => {
  const disordine = { 1: [{ x_rel: 0.75, u: [0, 0, -1, 0, 0, 0] }, { x_rel: 0.25, u: [0, 0, -3, 0, 0, 0] }] };
  const [d] = puntiDeformata(trave, { spostamenti: {}, spostamenti_interni: disordine }, 1, 2);
  // Tre tratti — [0; 0,25], [0,25; 0,75], [0,75; 1] — da due segmenti l'uno: sette punti, e i
  // campioni **non** sono equispaziati. È il motivo per cui `xRel` esce insieme ai punti.
  assert.deepEqual(d.xRel, [0, 0.125, 0.25, 0.5, 0.75, 0.875, 1]);
  assert.ok(d.punti.every((p, k) => k === 0 || p.x >= d.punti[k - 1].x), "le ascisse non tornano indietro");
});

test("frecciaMassima: col nodo interno la freccia è quella vera, e sta dove sta lui", () => {
  const perCaso = { spostamenti: {}, spostamenti_interni: { 1: [{ x_rel: 0.25, u: [0, 0, -4, 0, 0, 0] }] } };
  const f = frecciaMassima(trave, perCaso);
  assert.equal(f.valore, 4);
  assert.deepEqual(f.indeformato, { x: 1500, z: 0 }, "il punto indeformato è a x_rel 0,25, non a metà campioni");
});
