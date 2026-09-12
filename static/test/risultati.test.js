import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { VISTE, assiDi, asteRuotate, casiDi, scala125, latoMaggiore, frecciaMassima, scalaAuto, puntiDeformata,
         scalaDiagrammaAuto, diagramma, picchi, testoValore, testoBadge, righeSpostamenti, righeReazioni,
         testoEquilibrio, srotolato,
         vociDelCaso, casoScelto, formaComeSpostamenti, stazioniDiAsta, scalaModo, ampiezzaModo,
         percento, direzioneDominante, simboloStato, curvaPushover, testoLegendaStati, legendaStatiServe, righeModo,
         tipoDelCaso, passoDiRiferimento, motivoInParole,
         VIRIDIS, viridis, massimoSpostamento, coloreSpostamento, testoScalaColori } from "../risultati.js";

// C7a — `testoBadge` mette uno spazio insecabile **prima** di ogni `·`, così il badge va a capo
// dopo il separatore e la scala scende intera invece di aprire la riga con «· ×2 (auto)». Qui gli
// assert confrontano il testo normalizzato: l'insecabile ha un test suo, e negli altri conta cosa
// il badge dice, non dove si spezza.
const badge = (o) => testoBadge(o).replaceAll("\u00a0", " ");

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
  assert.deepEqual(d.punti[0], { x: 0, y: 0, z: 0, r: 0, u: 0 });
  assert.deepEqual(d.punti[8], { x: 6000, y: 0, z: 0, r: 1, u: 0 });
  assert.ok(d.punti[4].z < -1, `la mezzeria scende: z = ${d.punti[4].z}`);
  assert.ok(Math.abs(d.punti[4].x - 3000) < 1e-9);
  // La scala moltiplica gli spostamenti, non le coordinate.
  const [d10] = puntiDeformata(trave, perCaso, 10, 8);
  assert.ok(Math.abs(d10.punti[4].z - 10 * d.punti[4].z) < 1e-9);
  // Uno spostamento assiale di j allunga l'asta; uno lungo y (fuori dal piano) va lineare.
  const [e] = puntiDeformata(trave, { spostamenti: { 1: [0, 0, 0, 0, 0, 0], 2: [6, 8, 0, 0, 0, 0] } }, 1, 2);
  assert.deepEqual(e.punti[2], { x: 6006, y: 8, z: 0, r: 1, u: 10 });
  assert.deepEqual(e.punti[1], { x: 3003, y: 4, z: 0, r: 0.5, u: 5 });
});

test("puntiDeformata: forma di un modo — fra i nodi è una retta, non una S (#84)", () => {
  // `modale: true`, come lo dichiara `formaComeSpostamenti`: solo con quel segnale la retta è la
  // verità. A s = 0,5 lo smoothstep del difetto vale già la stessa cosa della retta (0,000 mm di
  // scarto misurato sul MURO 1): un test lì passerebbe anche col difetto dentro. Lo scarto vero
  // sta ai quarti, dove lo smoothstep vale 0,15625/0,84375 invece di 0,25/0,75.
  const perCaso = { modale: true, spostamenti: { 1: [0, 0, 0, 0, 0, 0], 2: [0, 0, -4, 0, 0, 0] } };
  const [d] = puntiDeformata(trave, perCaso, 1, 8);
  assert.ok(Math.abs(d.punti[2].z - -1) < 1e-9, `a s = 0,25 atteso z = -1, letto ${d.punti[2].z}`);
  assert.ok(Math.abs(d.punti[4].z - -2) < 1e-9, "a s = 0,5 retta e smoothstep coincidono già: nessuna prova qui");
  assert.ok(Math.abs(d.punti[6].z - -3) < 1e-9, `a s = 0,75 atteso z = -3, letto ${d.punti[6].z}`);
});

test("puntiDeformata: una sola rotazione nulla, non modale — resta sull'Hermite", () => {
  // p0 = 0, p1 ≠ 0, nessun `modale`: deve restare sulla cubica.
  const perCaso = { spostamenti: { 1: [0, 0, 0, 0, 0, 0], 2: [0, 0, 0, 0, -0.02, 0] } };
  const [d] = puntiDeformata(trave, perCaso, 1, 8);
  assert.ok(Math.abs(d.punti[4].z - -15) < 1e-9, `a s = 0,5 atteso z = -15 (Hermite), letto ${d.punti[4].z}`);
});

test("puntiDeformata: incastro-incastro vero, rotazioni zero esatto ma non modale — curva, non retta (#84 fix round 1)", () => {
  // Le rotazioni a zero non bastano a dire «è un modo» (fix round 1): un `fix` in OpenSees le
  // azzera anche in una statica vera (`nova/corsa.py:328-335`, `nova/deck.py:1029`). Stesso
  // ingresso numerico del test sopra — p0 = p1 = 0, frecce diverse — ma senza `modale: true`:
  // deve uscire la cubica (freccia in mezzo che non coincide con la retta), non la retta.
  const perCaso = { spostamenti: { 1: [0, 0, 0, 0, 0, 0], 2: [0, 0, -6, 0, 0, 0] } };
  const [d] = puntiDeformata(trave, perCaso, 1, 8);
  assert.ok(Math.abs(d.punti[2].z - -0.9375) < 1e-9,
    `incastro-incastro: atteso z = -0,9375 a s = 0,25 (Hermite), letto ${d.punti[2].z} — la retta darebbe -1,5`);
});

test("puntiDeformata: ingressi degeneri — asta orfana saltata, nodo senza spostamenti fermo, lista vuota", () => {
  assert.deepEqual(puntiDeformata({ nodi: [], aste: [] }, Z1, 1), []);
  const orfana = { nodi: trave.nodi, aste: [{ id: 7, nodo_i: 1, nodo_j: 99 }] };
  assert.deepEqual(puntiDeformata(orfana, Z1, 1), []);
  const [d] = puntiDeformata(trave, { spostamenti: {} }, 100, 4);
  assert.deepEqual(d.punti[2], { x: 3000, y: 0, z: 0, r: 0.5, u: 0 }, "senza spostamenti la deformata è l'ombra");
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
  assert.equal(badge({ vista: "deformata", caso: "Z1", scala: 120, auto: true }), "deformata · Z1 · ×120 (auto)");
  assert.equal(badge({ vista: "deformata", caso: "Z1", scala: 50, auto: false }), "deformata · Z1 · ×50 (a mano)");
  assert.equal(badge({ vista: "M", caso: "Z1" }), "M · Z1 · kN·m · lato teso");
  // Il lato del positivo è nella legenda perché ora è uno solo per tutto il disegno.
  assert.equal(badge({ vista: "V", caso: "Z1" }), "V · Z1 · kN · + verso i→j, a sinistra di i→j");
  assert.equal(badge({ vista: "N", caso: "Z1" }), "N · Z1 · kN · + trazione, a sinistra di i→j");
  assert.equal(badge({ vista: "M", caso: "Z1", stantia: true }), "stantia · M · Z1 · kN·m · lato teso");
  assert.equal(badge({ vista: null }), "");
});

test("testoBadge: le aste con la sezione ruotata si contano, e non nella deformata", () => {
  assert.equal(badge({ vista: "M", caso: "Z1", ruotate: 1 }),
    "M · Z1 · kN·m · lato teso · 1 asta con sezione ruotata non disegnata");
  assert.equal(badge({ vista: "V", caso: "Z1", ruotate: 3 }),
    "V · Z1 · kN · + verso i→j, a sinistra di i→j · 3 aste con sezione ruotata non disegnate");
  assert.equal(badge({ vista: "M", caso: "Z1", ruotate: 0 }), "M · Z1 · kN·m · lato teso");
  assert.equal(badge({ vista: "deformata", caso: "Z1", scala: 1, auto: true, ruotate: 2 }),
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
  for (const g of [90, -90, 45]) {
    const storta = { nodi: trave.nodi, aste: [{ id: 1, nodo_i: 1, nodo_j: 2, rotazione_deg: g }] };
    assert.equal(asteRuotate(storta), 1, `rotazione_deg ${g} porta la terna fuori dal piano`);
    assert.deepEqual(diagramma(storta, Z1, "M", 1), []);
  }
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
  assert.deepEqual(d.punti[4], { x: 6000, y: 0, z: 0, r: 1, u: 0 });
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
  assert.equal(d.punti[8].r, 0.5);
  assert.ok(Math.abs(d.punti[8].z - (-1.5709)) < 1e-12, `la mezzeria è il nodo interno: ${d.punti[8].z}`);
  assert.deepEqual(d.punti[0], { x: 0, y: 0, z: 0, r: 0, u: 0 }, "gli estremi restano sui nodi del modello");
  assert.deepEqual(d.punti[16], { x: 6000, y: 0, z: 0, r: 1, u: 0 });
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
  assert.deepEqual(senza.punti.map((p) => p.r), [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1]);
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
  assert.equal(d.punti[4].r, 0.25);
  assert.ok(Math.abs(d.punti[4].z - (-1)) < 1e-12);
});

test("puntiDeformata: stazioni interne in disordine si riordinano, non ripiegano l'asta", () => {
  const disordine = { 1: [{ x_rel: 0.75, u: [0, 0, -1, 0, 0, 0] }, { x_rel: 0.25, u: [0, 0, -3, 0, 0, 0] }] };
  const [d] = puntiDeformata(trave, { spostamenti: {}, spostamenti_interni: disordine }, 1, 2);
  // Tre tratti — [0; 0,25], [0,25; 0,75], [0,75; 1] — da due segmenti l'uno: sette punti, e i
  // campioni **non** sono equispaziati. È il motivo per cui ogni punto porta la sua `r`.
  assert.deepEqual(d.punti.map((p) => p.r), [0, 0.125, 0.25, 0.5, 0.75, 0.875, 1]);
  assert.ok(d.punti.every((p, k) => k === 0 || p.x >= d.punti[k - 1].x), "le ascisse non tornano indietro");
});

test("frecciaMassima: col nodo interno la freccia è quella vera, e sta dove sta lui", () => {
  const perCaso = { spostamenti: {}, spostamenti_interni: { 1: [{ x_rel: 0.25, u: [0, 0, -4, 0, 0, 0] }] } };
  const f = frecciaMassima(trave, perCaso);
  assert.equal(f.valore, 4);
  assert.deepEqual(f.indeformato, { x: 1500, z: 0 }, "il punto indeformato è a x_rel 0,25, non a metà campioni");
});

// --- la coda della review dei debiti ----------------------------------------------

test("puntiDeformata: due stazioni interne sulla stessa ascissa non fanno un tratto lungo zero", () => {
  const doppia = { 1: [{ x_rel: 0.5, u: [0, 0, -2, 0, 0, 0] }, { x_rel: 0.5, u: [0, 0, -9, 0, 0, 0] }] };
  const [d] = puntiDeformata(trave, { spostamenti: {}, spostamenti_interni: doppia }, 1, 4);
  assert.equal(d.punti.length, 9, "due tratti da quattro segmenti, non tre");
  assert.ok(d.punti.every((p) => Number.isFinite(p.x) && Number.isFinite(p.z)), "nessun NaN da `Lt = 0`");
  assert.ok(Math.abs(d.punti[4].z - (-2)) < 1e-12, `vince la prima: ${d.punti[4].z}`);
  assert.deepEqual(d.punti.map((p) => p.r), [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1]);
});

// --- la 14a: i casi a tre forme (caso, modo, pushover) -----------------------------

const M2 = { n: 2, f: 31.85, T: 0.0314, forma: { 1: [0, 0, 0], 3: [1, 0, -0.03] }, massa_partecipante: { x: 0.92, y: 0, z: 0.01 }, cumulata: { x: 0.95, y: 0.78, z: 1 } };
const M3 = { n: 3, f: null, T: null, forma: { 1: [0, 0, 0], 3: [0, 1, 0] }, massa_partecipante: { x: 0, y: 0.1, z: 0 }, cumulata: { x: 0.95, y: 0.88, z: 1 } };
const PASSI = [{ n: 1, spostamento: 0.5, taglio_base: 1200, spostamenti: { 3: [0.5, 0, 0, 0, 0, 0] }, stato_sezioni: { 1: [{ calcestruzzo: "elastica", acciaio: "elastica" }] } },
               { n: 2, spostamento: 1.0, taglio_base: 2300, spostamenti: { 3: [1.0, 0, 0, 0, 0, 0] }, stato_sezioni: { 1: [{ calcestruzzo: "fessurata", acciaio: "snervata" }] } }];
const R = { lavoro: { fin: { risultati: { per_caso: { Z1: { spostamenti: {} } }, modi: [M2, M3], passi: PASSI, caduta: null,
                                          run: { pushover: { u0: 0.0002 } } } } }, caso: "Z1", vista: "deformata", scalaMano: null };

test("vociDelCaso: casi, poi pushover, poi i modi con frequenza e direzione; f null → non fisica", () => {
  const v = vociDelCaso(R);
  assert.deepEqual(v.map((x) => x.valore), ["Z1", "pushover", "modo:2", "modo:3"]);
  assert.equal(v[1].testo, "pushover · 2 passi");
  assert.equal(v[2].testo, "modo 2 · 31,85 Hz · ux 92 %");
  assert.equal(v[3].testo, "modo 3 · frequenza non fisica");
  assert.deepEqual(vociDelCaso(null), []);
  assert.deepEqual(vociDelCaso({ lavoro: { fin: { risultati: { per_caso: { Z1: {} } } } } }).map((x) => x.valore), ["Z1"]);
});
test("casoScelto: le tre forme, il passo di default è l'ultimo, un passo fuori scala si stringe", () => {
  assert.equal(casoScelto(R, "Z1").tipo, "caso");
  const m = casoScelto(R, "modo:2");
  assert.equal(m.tipo, "modo"); assert.equal(m.n, 2);
  assert.deepEqual(m.perCaso.spostamenti[3], [1, 0, -0.03, 0, 0, 0]);
  const p = casoScelto(R, "pushover");
  assert.equal(p.k, 1); assert.equal(p.quanti, 2); assert.deepEqual(p.perCaso.spostamenti[3], [1, 0, 0, 0, 0, 0]);
  assert.equal(p.n, undefined, "il conteggio dei passi si chiama `quanti`: `n` è il numero del modo");
  assert.equal(casoScelto(R, "pushover", 0).k, 0);
  assert.equal(casoScelto(R, "pushover", 99).k, 1);
  assert.equal(casoScelto(R, "pushover", -3).k, 0);
  assert.equal(casoScelto(R, "modo:9"), null);
  assert.equal(casoScelto(R, "Z9"), null);
  assert.equal(casoScelto(null, "Z1"), null);
});
test("stazioniDiAsta: 5 con una suddivisione, 9 con due, equispaziate se il conteggio non combacia", () => {
  assert.deepEqual(stazioniDiAsta({ suddivisioni: 1 }).map((x) => Number(x.toFixed(4))), [0, 0.1727, 0.5, 0.8273, 1]);
  assert.equal(stazioniDiAsta({ suddivisioni: 2 }).length, 9);
  assert.equal(stazioniDiAsta({}).length, 5);
  assert.deepEqual(stazioniDiAsta({ suddivisioni: 1 }, 3), [0, 0.5, 1]);
  assert.deepEqual(stazioniDiAsta({ suddivisioni: 1 }, 1), [0.5]);
});
test("simboloStato: due canali, sconosciuto → null", () => {
  assert.deepEqual(simboloStato({ calcestruzzo: "elastica", acciaio: "elastica" }), { riempimento: 0, contorno: "sottile" });
  assert.deepEqual(simboloStato({ calcestruzzo: "fessurata", acciaio: "snervata" }), { riempimento: 0.5, contorno: "spesso" });
  assert.deepEqual(simboloStato({ calcestruzzo: "schiacciata", acciaio: "rotta" }), { riempimento: 1, contorno: "croce" });
  assert.equal(simboloStato({ calcestruzzo: "boh", acciaio: "elastica" }), null);
  assert.equal(simboloStato(null), null);
});
test("curvaPushover: u in mm e V in kN, massimi, caduta", () => {
  const c = curvaPushover(PASSI, { passo: 2, spostamento: 1.0, motivo: "non converge" });
  assert.deepEqual(c.punti, [{ k: 0, u: 0.5, V: 1.2 }, { k: 1, u: 1, V: 2.3 }]);
  assert.equal(c.uMax, 1); assert.equal(c.vMax, 2.3);
  assert.deepEqual(c.caduta, { k: 1, n: 2, u: 1, motivo: "non converge", algoritmo: null });
  assert.deepEqual(curvaPushover([], null), { punti: [], uMax: 0, vMax: 0, caduta: null });
  assert.deepEqual(curvaPushover(undefined, null).punti, []);
});
test("testoBadge per modo e pushover", () => {
  assert.equal(badge({ vista: "deformata", caso: "modo:2", scala: 50, auto: true, modo: M2 }), "modo 2 · 31,85 Hz · T 0,0314 s · ×50 (auto)");
  assert.equal(badge({ vista: "deformata", caso: "modo:2", scala: 50, auto: true, modo: M2, fermo: true }), "modo 2 · 31,85 Hz · T 0,0314 s · ×50 (auto) · ferma");
  assert.equal(badge({ vista: "deformata", caso: "modo:2", scala: 50, auto: true, modo: M2, fermo: true, motivoFermo: "preferenza di sistema" }),
               "modo 2 · 31,85 Hz · T 0,0314 s · ×50 (auto) · ferma (preferenza di sistema)");
  assert.equal(badge({ vista: "deformata", caso: "modo:2", scala: 50, auto: true, modo: M2, motivoFermo: "preferenza di sistema" }),
               "modo 2 · 31,85 Hz · T 0,0314 s · ×50 (auto)", "senza `fermo` il motivo non si stampa");
  assert.equal(badge({ vista: "deformata", caso: "modo:3", scala: 1, auto: true, modo: M3 }), "modo 3 · frequenza non fisica · ×1 (auto)");
  assert.equal(badge({ vista: "deformata", caso: "pushover", scala: 20, auto: true, passo: { k: 1, quanti: 2, u: 1, V: 2.3 } }), "pushover · 2/2 · u 1 mm · V 2,3 kN · ×20 (auto)");
  assert.equal(badge({ vista: "deformata", caso: "pushover", scala: 20, auto: true, passo: { k: 1, quanti: 2, u: 1, V: 2.3 }, caduta: { k: 1, n: 2, motivo: "non converge" } }),
               "pushover · 2/2 · u 1 mm · V 2,3 kN · ×20 (auto) · caduta al passo 2: non converge");
  assert.equal(badge({ vista: "M", caso: "pushover", passo: { k: 1, quanti: 2, u: 1, V: 2.3 } }), "pushover · 2/2 · M · nessun diagramma per un passo");
  // A: a 1280 px la colonna del piano è ~430 px e il badge intero veniva tagliato a sinistra.
  // «passo» via, e il taglio a una cifra: «70,93 kN» sono tre caratteri di troppo per un
  // centesimo di kN che su una spinta non guarda nessuno.
  assert.equal(badge({ vista: "deformata", caso: "pushover", scala: 2, auto: true, passo: { k: 119, quanti: 120, u: 60, V: 70.9284 } }),
               "pushover · 120/120 · u 60 mm · V 70,9 kN · ×2 (auto)");
});

test("tipoDelCaso: la chiave a tre forme si legge in un posto solo", () => {
  assert.equal(tipoDelCaso("Z1"), "caso");
  assert.equal(tipoDelCaso("modo:2"), "modo");
  assert.equal(tipoDelCaso("pushover"), "pushover");
  // Chi la chiama le passa `risultati?.caso`, che senza corsa non c'è: non è un modo e non è la
  // pushover, ed è quello che le tre guardie di `app.js` devono leggere.
  assert.equal(tipoDelCaso(undefined), "caso");
  assert.equal(tipoDelCaso(null), "caso");
  // «modo» senza due punti è un caso statico che si chiama così, non un modo.
  assert.equal(tipoDelCaso("modo"), "caso");
});

test("passoDiRiferimento: il passo di spostamento massimo, non l'ultimo", () => {
  assert.equal(passoDiRiferimento(PASSI), 1);
  // C: la scala della pushover si misura qui, e una corsa che dopo il picco **scende** (softening,
  // o un controllo in spostamento che torna indietro) ha il massimo in mezzo, non in coda. Con
  // l'ultimo passo la deformata del picco sarebbe uscita fuori dal riquadro.
  assert.equal(passoDiRiferimento([{ spostamento: 1 }, { spostamento: 9 }, { spostamento: 4 }]), 1);
  // Il modulo, non il segno: una spinta verso −x ha spostamenti negativi e una scala positiva.
  assert.equal(passoDiRiferimento([{ spostamento: -9 }, { spostamento: 4 }]), 0);
  assert.equal(passoDiRiferimento([]), null, "nessun passo, nessun riferimento");
  assert.equal(passoDiRiferimento(null), null);
  // Tutti a zero: il primo, e chi chiama ci fa `scalaAuto` su una deformata nulla → 1.
  assert.equal(passoDiRiferimento([{ spostamento: 0 }, { spostamento: 0 }]), 0);
});
test("righeModo e testoEquilibrio per modo e pushover", () => {
  assert.deepEqual(righeModo(M2, 3), [["forma modale (modo 2, adimensionale)", "ux 1 · uy 0 · uz -0,03"]]);
  assert.deepEqual(righeModo(M2, 9), []);
  assert.equal(testoEquilibrio(R.lavoro.fin.risultati, "modo:2"), "massa partecipante x 92 % · y 0 % · z 1 % · cumulata x 95 % · y 78 % · z 100 %");
  assert.equal(testoEquilibrio(R.lavoro.fin.risultati, "pushover"), "2 passi convergenti · u₀ 0,0002 mm · taglio massimo 2,3 kN al passo 2 · caduta: nessuna");
  assert.equal(testoEquilibrio(R.lavoro.fin.risultati, "modo:9"), "—");
});

// --- gli ingressi degeneri, e i ruling R1-R3 e R9 -----------------------------------

test("R1: la scala di un modo misura le tre componenti, non il solo piano", () => {
  // `trave` è lunga 6000 in x, quindi `latoMaggiore` = 6000. Un modo tutto in `y` è il caso dei
  // venti modi su 42 del MURO 1 che `scalaAuto` rende «×1», cioè invisibili.
  const fuoriPiano = { n: 1, f: 20.45, T: 0.0489, forma: { 1: [0, 0, 0], 2: [0, 2, 0] }, massa_partecipante: { x: 0, y: 0.8, z: 0 } };
  assert.equal(scalaAuto(trave, formaComeSpostamenti(fuoriPiano)), 1, "`scalaAuto` non lo vede: ignora la `y`");
  assert.equal(scalaModo(trave, fuoriPiano), 200, "scala125(0,05 · 6000 / 2)");
});
test("R2: la forma identicamente nulla rende 1, e `ampiezzaModo` la distingue", () => {
  const nulla = { n: 6, f: 62.3, T: 0.016, forma: { 1: [0, 0, 0], 2: [0, 0, 0] }, massa_partecipante: { x: 0, y: 0.398, z: 0 } };
  assert.equal(scalaModo(trave, nulla), 1);
  assert.equal(ampiezzaModo(nulla), 0, "zero: non c'è niente da amplificare");
  assert.ok(ampiezzaModo(M2) > 0, "un modo misurato non si confonde con quello nullo");
  assert.equal(ampiezzaModo(null), 0);
  assert.equal(scalaModo(trave, { forma: {} }), 1);
  assert.ok(badge({ vista: "deformata", caso: "modo:6", scala: 1, auto: true, modo: nulla })
              .includes("forma nulla sui nodi"));
});
test("R3: `percento` intero, `direzioneDominante` null sotto l'1 %", () => {
  assert.equal(percento(0.456215), "46 %");
  assert.equal(percento(0.92), "92 %");
  assert.equal(percento(0.01), "1 %");
  assert.equal(percento(null), "0 %");
  assert.equal(percento(undefined), "0 %");
  assert.equal(percento("boh"), "0 %");
  assert.equal(direzioneDominante({ x: 0.456215, y: 0, z: 0 }), "x");
  assert.equal(direzioneDominante({ x: 0, y: 0.1, z: 0 }), "y");
  assert.equal(direzioneDominante({ x: 0, y: 0, z: 0 }), null, "tre masse a zero: nessuna direzione, non «x» per pareggio");
  assert.equal(direzioneDominante({ x: 0.009, y: 0.001, z: 0 }), null, "sotto l'1 % non è una direzione");
  assert.equal(direzioneDominante(null), null);
});
test("R3: un modo senza massa dice «massa trascurabile», non «ux 0 %»", () => {
  const senzaMassa = { n: 3, f: 35.85, T: 0.0279, forma: { 1: [0, 0, 0], 2: [0, 2.8, 0] }, massa_partecipante: { x: 0, y: 0, z: 0 } };
  const stato = { lavoro: { fin: { risultati: { per_caso: {}, modi: [senzaMassa] } } } };
  assert.equal(vociDelCaso(stato)[0].testo, "modo 3 · 35,85 Hz · massa trascurabile");
  assert.equal(badge({ vista: "deformata", caso: "modo:3", scala: 50, auto: true, modo: senzaMassa }),
               "modo 3 · 35,85 Hz · T 0,0279 s · ×50 (auto)");
});
test("formaComeSpostamenti: forma mancante o vettori corti", () => {
  assert.deepEqual(formaComeSpostamenti(null), { modale: true, spostamenti: {} });
  assert.deepEqual(formaComeSpostamenti({}), { modale: true, spostamenti: {} });
  assert.deepEqual(formaComeSpostamenti({ forma: { 7: [0.5] } }).spostamenti[7], [0.5, 0, 0, 0, 0, 0]);
  assert.deepEqual(formaComeSpostamenti({ forma: { 7: null } }).spostamenti[7], [0, 0, 0, 0, 0, 0]);
});
test("casoScelto: senza passi, e il passo non intero è l'ultimo", () => {
  const senzaPassi = { lavoro: { fin: { risultati: { per_caso: { Z1: {} }, modi: [], passi: [] } } } };
  assert.equal(casoScelto(senzaPassi, "pushover"), null);
  assert.equal(casoScelto(R, "pushover", 0.5).k, 1, "non intero → l'ultimo");
  assert.equal(casoScelto(R, "pushover", null).k, 1);
  assert.equal(casoScelto(R, null), null);
  assert.equal(casoScelto(R, "pushover").u0, undefined, "`u0` lo legge `testoEquilibrio` da `run`, non di qui");
  assert.deepEqual(casoScelto(R, "pushover").stati, PASSI[1].stato_sezioni);
});
test("stazioniDiAsta: suddivisioni guaste valgono 1, `quante` a zero rende la lista vuota", () => {
  for (const s of [0, -3, "boh", null, undefined, NaN]) {
    assert.equal(stazioniDiAsta({ suddivisioni: s }).length, 5, `suddivisioni ${s}`);
  }
  assert.deepEqual(stazioniDiAsta(null).map((x) => Number(x.toFixed(4))), [0, 0.1727, 0.5, 0.8273, 1]);
  assert.deepEqual(stazioniDiAsta({ suddivisioni: 2 }, 0), []);
  assert.deepEqual(stazioniDiAsta({ suddivisioni: 2 }, -1), []);
  // 9 combacia con `4n + 1`: le stazioni vere di Lobatto, non le equispaziate (R9).
  assert.equal(stazioniDiAsta({ suddivisioni: 2 }, 9)[1], 0.1726731646 / 2);
});
test("R9: una stazione con un canale nullo non ha simbolo", () => {
  assert.equal(simboloStato({ calcestruzzo: null, acciaio: "elastica" }), null);
  assert.equal(simboloStato({ calcestruzzo: "elastica", acciaio: null }), null);
  assert.equal(simboloStato({}), null);
  assert.equal(simboloStato(undefined), null);
});
test("curvaPushover: una caduta fuori scala si stringe, e i passi guasti valgono zero", () => {
  assert.deepEqual(curvaPushover(PASSI, { passo: 99, spostamento: 5, motivo: "diverge" }).caduta, { k: 1, n: 99, u: 5, motivo: "diverge", algoritmo: null });
  assert.deepEqual(curvaPushover(PASSI, { passo: 0, spostamento: 0, motivo: "" }).caduta, { k: 0, n: 0, u: 0, motivo: "", algoritmo: null });
  assert.equal(curvaPushover(PASSI, { passo: null }).caduta, null);
  assert.deepEqual(curvaPushover([{ n: 1 }], null).punti, [{ k: 0, u: 0, V: 0 }]);
});
test("F1: il passo caduto per non convergenza non sta in `passi[]` — `k` per il disegno, `n` per i testi", () => {
  // La forma vera: `tests/test_pushover_binario.py:153` asserisce `caduta["passo"] == len(passi) + 1`.
  const c = curvaPushover(PASSI, { passo: 3, spostamento: 1.4, motivo: "non_convergenza" });
  assert.equal(c.caduta.k, 1, "il disegno si ferma sull'ultimo passo che esiste");
  assert.equal(c.caduta.n, 3, "il testo dice il numero del server, non l'indice stretto");
  assert.equal(badge({ vista: "deformata", caso: "pushover", scala: 20, auto: true, passo: { k: 1, quanti: 2, u: 1, V: 2.3 }, caduta: c.caduta }),
               "pushover · 2/2 · u 1 mm · V 2,3 kN · ×20 (auto) · caduta al passo 3: non convergenza");
  assert.ok(testoEquilibrio({ passi: PASSI, caduta: { passo: 3, spostamento: 1.4, motivo: "non_convergenza" }, run: { pushover: { u0: 0.0002 } } }, "pushover")
              .endsWith("caduta: al passo 3, u 1,4 mm, ultimo algoritmo — (non convergenza)"));
  // `passi_max`: il passo c'è (`caduta["passo"] == len(passi)`), e i due numeri coincidono.
  const m = curvaPushover(PASSI, { passo: 2, spostamento: 1, motivo: "passi_max" });
  assert.equal(m.caduta.k, 1); assert.equal(m.caduta.n, 2);
});
test("testoEquilibrio: la pushover con una caduta, e senza passi", () => {
  const conCaduta = { passi: PASSI, caduta: { passo: 2, spostamento: 1, motivo: "non converge" }, run: { pushover: { u0: 0.0002 } } };
  assert.equal(testoEquilibrio(conCaduta, "pushover"),
               "2 passi convergenti · u₀ 0,0002 mm · taglio massimo 2,3 kN al passo 2 · caduta: al passo 2, u 1 mm, ultimo algoritmo — (non converge)");
  assert.equal(testoEquilibrio({ passi: [] }, "pushover"), "—");
  assert.equal(testoEquilibrio(null, "pushover"), "—");
  assert.ok(testoEquilibrio({ passi: PASSI }, "pushover").includes("u₀ —"), "senza `run.pushover.u0` non si inventa uno zero");
});
test("testoBadge: uno spazio insecabile prima di ogni `·` — la scala non resta orfana del separatore", () => {
  // C7a: misurato a 1920 in presentazione, il badge della pushover andava a capo **prima** del
  // separatore e la seconda riga apriva con «· ×2 (auto)». Con l'insecabile la riga si spezza
  // dopo il `·`, che resta in coda alla prima, e la scala scende intera.
  const t = testoBadge({ vista: "deformata", caso: "pushover", scala: 2, auto: true,
                         passo: { k: 119, quanti: 120, u: 60, V: 70.9284 } });
  assert.ok(t.includes("\u00a0· "), `nessuno spazio insecabile nel badge: ${JSON.stringify(t)}`);
  assert.equal(t.includes(" · "), false, `separatore spezzabile rimasto: ${JSON.stringify(t)}`);
  assert.equal(t.replaceAll("\u00a0", " "), "pushover · 120/120 · u 60 mm · V 70,9 kN · ×2 (auto)");
  // Un badge senza separatori non guadagna insecabili dal nulla.
  assert.equal(testoBadge({ vista: null }), "");
});

test("legendaStatiServe: parla solo se un simbolo non è quello dell'elastica", () => {
  const E = { calcestruzzo: "elastica", acciaio: "elastica" };
  assert.equal(legendaStatiServe({ 1: [E, E], 2: [E] }), false, "tutte elastiche: i simboli sono tutti uguali");
  assert.equal(legendaStatiServe({ 1: [E, { calcestruzzo: "fessurata", acciaio: "elastica" }] }), true);
  assert.equal(legendaStatiServe({ 1: [E, { calcestruzzo: "elastica", acciaio: "snervata" }] }), true);
  // Uno stato senza simbolo non è uno stato diverso: `simboloStato` lo salta, e il disegno pure.
  assert.equal(legendaStatiServe({ 1: [E, null, { calcestruzzo: null, acciaio: "rotta" }] }), false);
  assert.equal(legendaStatiServe(null), false);
  assert.equal(legendaStatiServe({}), false);
  assert.equal(legendaStatiServe({ 1: [] }), false);
});

test("testoLegendaStati: i due canali in una riga", () => {
  const t = testoLegendaStati();
  for (const p of ["elastica", "fessurata", "schiacciata", "snervata", "rotta"]) assert.ok(t.includes(p), p);
});

test("testoLegendaStati: in aula il testo compatto sta in **una** riga — 38 caratteri (15b, R18)", () => {
  // La proprietà verificabile senza browser è il conteggio dei caratteri. Il tetto si conta sul corpo
  // **reso** della striscia, che in aula è 32 px (`stile.css:549` batte per specificità il
  // `var(--etichetta, 11px)` di `:110`), non sui 46 di `--etichetta`, che sono le etichette dentro
  // l'SVG: 0,602 em × 32 = 19,26 px per carattere, e nei 751 px utili di un piano a 1280×657 una
  // riga ne tiene **38**. Contato a 46 il tetto uscirebbe 27, e la legenda resterebbe amputata di
  // undici caratteri che stavano sulla stessa riga.
  const t = testoLegendaStati(true);
  assert.ok(t.length <= 38, `«${t}» è di ${t.length} caratteri: a 32 px non sta in una riga`);
  // Ogni simbolo che si mostra porta il suo nome: a 8 m un glifo nudo non si decifra. `○` non c'è —
  // è la sezione illesa, e la legenda parla solo quando qualcosa non è più elastico.
  for (const p of ["◐ fessurata", "● schiacciata", "✕ rotta"]) assert.ok(t.includes(p), `manca «${p}»`);
  // Alla scrivania il testo lungo ci sta, e resta quello: il compatto è una perdita di parole
  // accettata per l'aula, non un miglioramento da estendere a tutti.
  assert.ok(testoLegendaStati().length > 38, "il testo lungo non va accorciato di riflesso");
  assert.notEqual(t, testoLegendaStati());
});
test("i casi statici di `testoBadge` non cambiano", () => {
  assert.equal(badge({ vista: "deformata", caso: "Z1", scala: 10, auto: true }), "deformata · Z1 · ×10 (auto)");
  assert.equal(badge({ vista: "M", caso: "Z1", ruotate: 1 }), "M · Z1 · kN·m · lato teso · 1 asta con sezione ruotata non disegnata");
  assert.equal(badge({ vista: null, caso: "Z1" }), "");
});

test("i motivi della caduta si leggono in italiano, e uno sconosciuto esce grezzo", () => {
  // I due che il server emette (`nova/deck.py:982,997`).
  assert.equal(motivoInParole("non_convergenza"), "non convergenza");
  assert.equal(motivoInParole("passi_max"), "tetto dei passi");
  // Una versione nuova del solutore ne porterà altri: meglio un identificatore brutto che una
  // riga vuota dove c'era un fatto, o una parola inventata al posto di quella vera.
  assert.equal(motivoInParole("boh"), "boh");
  // Vuoto o assente: la caduta c'è lo stesso, e una riga muta la nasconderebbe.
  assert.equal(motivoInParole(undefined), "motivo sconosciuto");
  assert.equal(motivoInParole(""), "motivo sconosciuto");
});

test("story 50: la caduta dichiara passo, spostamento e ultimo algoritmo", () => {
  const caduta = { passo: 110, spostamento: 55.2, algoritmo: "KrylovNewton", motivo: "non_convergenza" };
  const c = curvaPushover(PASSI, caduta);
  assert.equal(c.caduta.n, 110, "il numero del server, non l'indice stretto alla lista");
  assert.equal(c.caduta.u, 55.2);
  assert.equal(c.caduta.algoritmo, "KrylovNewton");
  assert.equal(testoEquilibrio({ passi: PASSI, caduta, run: { pushover: { u0: 0.0002 } } }, "pushover")
                 .split(" · caduta: ")[1],
               "al passo 110, u 55,2 mm, ultimo algoritmo KrylovNewton (non convergenza)");
  // Il badge del piano ne tiene la versione corta: lì di larghezza ce n'è ~430 px.
  assert.ok(badge({ vista: "deformata", caso: "pushover", scala: 2, auto: true,
                         passo: { k: 1, quanti: 2, u: 1, V: 2.3 }, caduta: c.caduta })
              .endsWith(" · caduta al passo 110: non convergenza"));
  // `algoritmo` che il server non manda: il trattino, la stessa grafia degli altri numeri assenti.
  const senzaAlgoritmo = { passo: 2, spostamento: 1, motivo: "passi_max" };
  assert.equal(curvaPushover(PASSI, senzaAlgoritmo).caduta.algoritmo, null);
  assert.ok(testoEquilibrio({ passi: PASSI, caduta: senzaAlgoritmo }, "pushover")
              .includes("ultimo algoritmo — (tetto dei passi)"));
});

test("XI_LOBATTO è la copia di `nova/deck.py`, e il test la confronta col file vero", () => {
  // La tavola è duplicata in due linguaggi per necessità (il browser non legge Python): quel che
  // si può fare è accorgersene quando divergono, invece di scoprirlo da simboli posati storti.
  const deck = readFileSync(new URL("../../nova/deck.py", import.meta.url), "utf8");
  const riga = deck.match(/^XI_LOBATTO = \(([^)]*)\)/m);
  assert.ok(riga, "`XI_LOBATTO` non si trova più in `nova/deck.py`: il confronto è cieco");
  const dalFile = riga[1].split(",").map((v) => Number(v.trim()));
  assert.deepEqual(dalFile, [0, 0.1726731646, 0.5, 0.8273268354, 1]);
  // E che la copia JS sia quella: `stazioniDiAsta` su un'asta indivisa rende le cinque ascisse.
  assert.deepEqual(stazioniDiAsta({ suddivisioni: 1 }), dalFile);
  assert.equal(Number(deck.match(/^STAZIONI = (\d+)/m)[1]), dalFile.length);
});

test("viridis: gli estremi sono le tappe, il mezzo interpolato, fuori scala stretto", () => {
  assert.equal(VIRIDIS.length, 10);
  assert.equal(viridis(0), "#440154");
  assert.equal(viridis(1), "#fde725");
  assert.equal(viridis(-3), "#440154");
  assert.equal(viridis(7), "#fde725");
  assert.equal(viridis(NaN), "#440154");
  assert.equal(viridis(1 / 9), "#482878", "una tappa intera cade esatta");
  assert.match(viridis(0.5), /^#[0-9a-f]{6}$/);
  // Fra due tappe il colore è la miscela, non la tappa più vicina: a t = 0,08 si sta al 72 % fra la prima e
  // la seconda, e «Math.round» al posto di «Math.floor» prenderebbe la seconda coppia di tappe.
  assert.equal(viridis(0.08), "#471d6e");
});

test("puntiDeformata: ogni punto porta |u| in mm senza scala — la scala sposta il disegno, non il valore", () => {
  // una trave orizzontale di 1000 mm, il nodo 2 abbassato di 4 mm e spostato di 3 in x
  const m = { nodi: [{ id: 1, x: 0, y: 0, z: 0 }, { id: 2, x: 1000, y: 0, z: 0 }], aste: [{ id: 1, nodo_i: 1, nodo_j: 2 }] };
  const perCaso = { spostamenti: { 1: [0, 0, 0, 0, 0, 0], 2: [3, 0, -4, 0, 0, 0] } };
  const a1 = puntiDeformata(m, perCaso, 1)[0].punti, a50 = puntiDeformata(m, perCaso, 50)[0].punti;
  assert.equal(a1.at(0).u, 0);
  assert.ok(Math.abs(a1.at(-1).u - 5) < 1e-9, "all'estremo 3-4-5");
  assert.deepEqual(a1.map((p) => p.u), a50.map((p) => p.u));
  assert.notDeepEqual(a1.map((p) => p.x), a50.map((p) => p.x));
});

test("massimoSpostamento: il massimo dei punti; niente punti o u non finiti → 0", () => {
  assert.equal(massimoSpostamento([{ punti: [{ u: 1 }, { u: 4 }] }, { punti: [{ u: 2 }] }]), 4);
  assert.equal(massimoSpostamento([]), 0);
  assert.equal(massimoSpostamento(null), 0);
  assert.equal(massimoSpostamento([{ punti: [{ u: NaN }, {}] }]), 0);
});

test("coloreSpostamento: la frazione sul massimo; massimo zero → la tappa bassa, non NaN", () => {
  assert.equal(coloreSpostamento(4, 4), "#fde725");
  assert.equal(coloreSpostamento(0, 4), "#440154");
  assert.equal(coloreSpostamento(3, 0), "#440154");
});

test("testoScalaColori: «spostamento |u|» per esteso, «max» sull'estremo, e il modo senza mm", () => {
  // C2 — «|u|» da solo è gergo a 8 m. C3 — il badge dice «u 60 mm» (il nodo di controllo) e la
  // legenda «64,34 mm» (il massimo su tutto il telaio): senza la parola «max» sono due numeri
  // diversi della stessa grandezza, e nulla dice quale è quale.
  assert.deepEqual(testoScalaColori({ uMax: 12.34, tipo: "caso" }),
                   { min: "0 mm", max: "max 12,34 mm", titolo: "spostamento |u|" });
  assert.deepEqual(testoScalaColori({ uMax: 64.34, tipo: "pushover" }),
                   { min: "0 mm", max: "max 64,34 mm", titolo: "spostamento |u|" });
  assert.deepEqual(testoScalaColori({ uMax: 0, tipo: "pushover" }),
                   { min: "0 mm", max: "max 0 mm", titolo: "spostamento |u|" });
  // Un modo non ha millimetri: la forma è normalizzata, e il titolo dice già cosa sono 0 e 1 —
  // «max» lì sarebbe un terzo modo di dire la stessa cosa.
  assert.deepEqual(testoScalaColori({ uMax: 0.8, tipo: "modo" }),
                   { min: "0", max: "1", titolo: "forma del modo · 0 fermo, 1 massimo" });
  // Un massimo che manca non diventa «NaN mm» né «undefined mm».
  assert.deepEqual(testoScalaColori({ uMax: undefined, tipo: "caso" }),
                   { min: "0 mm", max: "max 0 mm", titolo: "spostamento |u|" });
});

test("testoScalaColori: in aula il testo compatto sta in **una** riga — 38 caratteri (15b, Task 3)", () => {
  // Stesso tetto della legenda degli stati, e stesso conto: in aula la striscia rende a 32 px
  // (`stile.css:549` batte per specificità il `font-size: var(--etichetta, 11px)` di `stile.css:136`),
  // 0,602 em × 32 = 19,26 px per carattere, e nei 751 px utili di un piano a 1280×657 una riga ne
  // tiene 38. I caratteri non sono solo quelli scritti: la rampa è larga 6 em, cioè **dieci**
  // caratteri del mono, e i tre `gap` da 0,4 em ne valgono **due** — la stessa somma che `piano.js`
  // usa per l'ostacolo. Misurato in Chrome il 13/09: col testo intero la striscia va a capo su
  // 89 px e si posa sui due piedi del telaio; su una riga rende 47,59 px.
  const riga = ({ titolo, min, max }) => titolo.length + min.length + max.length + 10 + 2;
  for (const tipo of ["pushover", "caso", "modo"]) {
    const t = testoScalaColori({ uMax: 64.34, tipo, compatta: true });
    assert.ok(riga(t) <= 38,
              `«${t.titolo} ${t.min} ▮ ${t.max}» occupa ${riga(t)} caratteri: a 32 px non sta in una riga`);
  }
  // Quel che si perde è la parola «spostamento», che «|u|» ridice in tre caratteri. L'unità resta:
  // un numero senza millimetri non si legge, e accorciare non vuol dire smettere di dire di che
  // grandezza si parla — «max» resta per lo stesso motivo di C3 (il badge dice l'altro numero).
  assert.deepEqual(testoScalaColori({ uMax: 64.34, tipo: "pushover", compatta: true }),
                   { min: "0 mm", max: "max 64,34 mm", titolo: "|u|" });
  // Tutti gli spostamenti nulli: la legenda parla lo stesso, e nessuno divide per zero.
  assert.deepEqual(testoScalaColori({ uMax: 0, tipo: "pushover", compatta: true }),
                   { min: "0 mm", max: "max 0 mm", titolo: "|u|" });
  // Il modo perde la coda che spiega gli estremi: 0 e 1 stanno scritti ai due capi della rampa,
  // e ridirlo a parole è il terzo modo di dire la stessa cosa.
  assert.deepEqual(testoScalaColori({ uMax: 0.8, tipo: "modo", compatta: true }),
                   { min: "0", max: "1", titolo: "forma del modo" });
  // Alla scrivania il testo intero resta, parola per parola: il compatto è una perdita accettata
  // per l'aula, non un miglioramento da estendere a tutti.
  assert.equal(testoScalaColori({ uMax: 64.34, tipo: "pushover" }).titolo, "spostamento |u|");
  assert.ok(riga(testoScalaColori({ uMax: 64.34, tipo: "pushover" })) > 38,
            "il testo intero non va accorciato di riflesso: a 32 px non ci sta, ed è perché non ci sta che l'aula ne ha uno suo");
});
