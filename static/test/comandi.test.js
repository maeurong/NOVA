import { test } from "node:test";
import assert from "node:assert/strict";
import { modelloVuoto } from "../modello.js";
import { ErroreComando, creaNodo, estrudi, spostaNodo, eliminaNodo, rinomina, collega, impostaVincolo,
         creaSezione, modificaSezione, impostaFila, assegnaSezione, eliminaSezione, creaMateriale,
         modificaMateriale, eliminaMateriale, impostaDanno, impostaVeste, materialiDiDefault,
         DEFAULT_CALCESTRUZZO, DEFAULT_ACCIAIO } from "../comandi.js";

test("crea un nodo con l'identificatore 1 e le coordinate date", () => {
  const m = creaNodo(modelloVuoto(), { x: 1200, z: 3400 });
  assert.equal(m.nodi.length, 1);
  assert.deepEqual(m.nodi[0], { id: 1, nome: null, x: 1200, y: 0, z: 3400 });
  assert.equal(m.contatori.nodo, 1);
});

test("il riduttore non tocca il modello che riceve", () => {
  const prima = modelloVuoto();
  creaNodo(prima, { x: 0, z: 0 });
  assert.deepEqual(prima.nodi, []);
});

test("coordinate che non sono numeri finiti si rifiutano", () => {
  for (const arg of [{ x: NaN, z: 0 }, { x: 0, z: Infinity }, { x: null, z: 0 }]) {
    assert.throws(() => creaNodo(modelloVuoto(), arg), ErroreComando);
  }
});

test("creaNodo su un punto già occupato entro la tolleranza si rifiuta", () => {
  const m = creaNodo(modelloVuoto(), { x: 0, z: 0 });
  assert.throws(() => creaNodo(m, { x: 0.5, z: 0 }), ErroreComando);
});

test("estrudi crea il nodo di arrivo e l'asta fra i due", () => {
  const m = estrudi(creaNodo(modelloVuoto(), { x: 0, z: 0 }), { da: 1, dx: 5000, dz: 0 });
  assert.equal(m.nodi.length, 2);
  assert.deepEqual(m.nodi[1], { id: 2, nome: null, x: 5000, y: 0, z: 0 });
  assert.deepEqual(m.aste[0], { id: 1, nome: null, nodo_i: 1, nodo_j: 2, sezione: null });
});

test("estrudi più corto della tolleranza si rifiuta: niente aste a lunghezza zero", () => {
  const uno = creaNodo(modelloVuoto(), { x: 0, z: 0 });
  assert.throws(() => estrudi(uno, { da: 1, dx: 0, dz: 0 }), ErroreComando);
  assert.throws(() => estrudi(uno, { da: 1, dx: 0.5, dz: 0 }), ErroreComando);
});

test("estrudi al confine esatto della tolleranza: 1,0 mm passa, 0,999 no", () => {
  const uno = creaNodo(modelloVuoto(), { x: 0, z: 0 });
  assert.doesNotThrow(() => estrudi(uno, { da: 1, dx: 1.0, dz: 0 }));
  assert.throws(() => estrudi(uno, { da: 1, dx: 0.999, dz: 0 }), ErroreComando);
});

test("estrudi che arriva su un nodo esistente lo riusa invece di sdoppiarlo", () => {
  let m = creaNodo(modelloVuoto(), { x: 0, z: 0 });
  m = creaNodo(m, { x: 5000, z: 0 });
  m = estrudi(m, { da: 1, dx: 5000, dz: 0 });
  assert.equal(m.nodi.length, 2, "il nodo di arrivo esisteva già");
  assert.equal(m.aste[0].nodo_j, 2);
});

test("estrudi da un nodo che non esiste si rifiuta", () => {
  assert.throws(() => estrudi(modelloVuoto(), { da: 9, dx: 1000, dz: 0 }), ErroreComando);
});

test("estrudi non tocca il modello che riceve", () => {
  const prima = creaNodo(modelloVuoto(), { x: 0, z: 0 });
  const snapshot = structuredClone(prima);
  estrudi(prima, { da: 1, dx: 5000, dz: 0 });
  assert.deepEqual(prima, snapshot);
});

test("sposta un nodo e le aste lo seguono senza cambiare", () => {
  let m = estrudi(creaNodo(modelloVuoto(), { x: 0, z: 0 }), { da: 1, dx: 5000, dz: 0 });
  const asteprima = structuredClone(m.aste);
  m = spostaNodo(m, { id: 2, x: 5000, z: 3000 });
  assert.deepEqual(m.aste, asteprima, "l'asta referenzia gli identificatori, non le coordinate");
  assert.equal(m.nodi[1].z, 3000);
});

test("spostaNodo non tocca il modello che riceve", () => {
  const prima = estrudi(creaNodo(modelloVuoto(), { x: 0, z: 0 }), { da: 1, dx: 5000, dz: 0 });
  const snapshot = structuredClone(prima);
  spostaNodo(prima, { id: 2, x: 5000, z: 3000 });
  assert.deepEqual(prima, snapshot);
});

test("spostaNodo su coordinate che coincidono con un altro nodo si rifiuta", () => {
  let m = creaNodo(modelloVuoto(), { x: 0, z: 0 });
  m = creaNodo(m, { x: 5000, z: 0 });
  assert.throws(() => spostaNodo(m, { id: 1, x: 5000, z: 0 }), ErroreComando);
  assert.deepEqual(m.nodi[0], { id: 1, nome: null, x: 0, y: 0, z: 0 }, "il modello resta intatto");
});

test("spostaNodo al confine esatto della tolleranza: 1,0 mm passa, 0,999 no", () => {
  let m = creaNodo(modelloVuoto(), { x: 0, z: 0 });
  m = creaNodo(m, { x: 5000, z: 0 });
  assert.doesNotThrow(() => spostaNodo(m, { id: 1, x: 4999, z: 0 }));       // distanza 1,0 mm
  assert.throws(() => spostaNodo(m, { id: 1, x: 4999.001, z: 0 }), ErroreComando); // distanza 0,999 mm
});

test("spostaNodo con coordinata non finita si rifiuta e lascia il modello intatto", () => {
  const m = creaNodo(modelloVuoto(), { x: 0, z: 0 });
  const snapshot = structuredClone(m);
  assert.throws(() => spostaNodo(m, { id: 1, x: NaN, z: 0 }), ErroreComando);
  assert.deepEqual(m, snapshot);
});

test("spostaNodo con la sola x aggiornata lascia z quella di prima", () => {
  const m = creaNodo(modelloVuoto(), { x: 100, z: 200 });
  const spostato = spostaNodo(m, { id: 1, x: 300 });
  assert.equal(spostato.nodi[0].x, 300);
  assert.equal(spostato.nodi[0].z, 200, "z non passata: deve restare quella di prima, mai undefined");
});

test("elimina un nodo e con lui aste e carichi che lo nominano", () => {
  let m = estrudi(creaNodo(modelloVuoto(), { x: 0, z: 0 }), { da: 1, dx: 5000, dz: 0 });
  m = { ...m, azioni: [{ id: 1, nome: "Q", natura: "Q", generata: false, carichi: [
    { tipo: "nodale", nodo: 2, fz: -1200 },
    { tipo: "distribuito", asta: 1, q: -3, direzione: "z" },
    { tipo: "gravita", fattore_z: -1 },
  ] }] };
  m = eliminaNodo(m, { id: 2 });
  assert.deepEqual(m.nodi.map((n) => n.id), [1]);
  assert.deepEqual(m.aste, [], "l'asta toccava il nodo eliminato");
  assert.deepEqual(m.azioni[0].carichi, [{ tipo: "gravita", fattore_z: -1 }],
    "restano solo i carichi che non nominano né il nodo né l'asta spariti");
});

test("elimina un nodo che non esiste si rifiuta e lascia il modello intatto", () => {
  const m = creaNodo(modelloVuoto(), { x: 0, z: 0 });
  assert.throws(() => eliminaNodo(m, { id: 9 }), ErroreComando);
  assert.equal(m.nodi.length, 1);
});

test("eliminaNodo non tocca il modello che riceve, aste e carichi compresi", () => {
  let m = estrudi(creaNodo(modelloVuoto(), { x: 0, z: 0 }), { da: 1, dx: 5000, dz: 0 });
  m = { ...m, azioni: [{ id: 1, nome: "Q", natura: "Q", generata: false, carichi: [
    { tipo: "nodale", nodo: 2, fz: -1200 },
    { tipo: "distribuito", asta: 1, q: -3, direzione: "z" },
    { tipo: "gravita", fattore_z: -1 },
  ] }] };
  const snapshot = structuredClone(m);
  eliminaNodo(m, { id: 2 });
  assert.deepEqual(m, snapshot);
});

test("rinomina cambia il nome e mai l'identificatore", () => {
  const m = rinomina(creaNodo(modelloVuoto(), { x: 0, z: 0 }), { tipo: "nodo", id: 1, nome: "piede sinistro" });
  assert.equal(m.nodi[0].nome, "piede sinistro");
  assert.equal(m.nodi[0].id, 1);
});

test("rinomina accetta un nome già usato: il nome è libero, l'identità no", () => {
  let m = estrudi(creaNodo(modelloVuoto(), { x: 0, z: 0 }), { da: 1, dx: 5000, dz: 0 });
  m = rinomina(m, { tipo: "nodo", id: 1, nome: "piede" });
  m = rinomina(m, { tipo: "nodo", id: 2, nome: "piede" });
  assert.deepEqual(m.nodi.map((n) => [n.id, n.nome]), [[1, "piede"], [2, "piede"]]);
});

test("rinomina a nome vuoto si rifiuta", () => {
  const m = creaNodo(modelloVuoto(), { x: 0, z: 0 });
  assert.throws(() => rinomina(m, { tipo: "nodo", id: 1, nome: "   " }), ErroreComando);
});

test("rinomina non tocca il modello che riceve", () => {
  const prima = creaNodo(modelloVuoto(), { x: 0, z: 0 });
  const snapshot = structuredClone(prima);
  rinomina(prima, { tipo: "nodo", id: 1, nome: "piede" });
  assert.deepEqual(prima, snapshot);
});

test("collega crea l'asta fra due nodi scelti", () => {
  let m = creaNodo(modelloVuoto(), { x: 0, z: 0 });
  m = creaNodo(m, { x: 5000, z: 0 });
  m = collega(m, { da: 1, a: 2 });
  assert.deepEqual(m.aste[0], { id: 1, nome: null, nodo_i: 1, nodo_j: 2, sezione: null });
});

test("collega non tocca il modello che riceve", () => {
  let m = creaNodo(modelloVuoto(), { x: 0, z: 0 });
  m = creaNodo(m, { x: 5000, z: 0 });
  const prima = structuredClone(m);
  collega(m, { da: 1, a: 2 });
  assert.deepEqual(m, prima);
});

test("collega un nodo a sé stesso si rifiuta", () => {
  const m = creaNodo(modelloVuoto(), { x: 0, z: 0 });
  assert.throws(() => collega(m, { da: 1, a: 1 }), ErroreComando);
});

test("collega nomina il nodo che non esiste", () => {
  const m = creaNodo(modelloVuoto(), { x: 0, z: 0 });
  assert.throws(() => collega(m, { da: 1, a: 9 }), /9/);
  assert.throws(() => collega(m, { da: 9, a: 1 }), /9/);
});

test("collega due nodi già uniti si rifiuta, in tutti e due i versi", () => {
  let m = creaNodo(modelloVuoto(), { x: 0, z: 0 });
  m = creaNodo(m, { x: 5000, z: 0 });
  m = collega(m, { da: 1, a: 2 });
  assert.throws(() => collega(m, { da: 1, a: 2 }), ErroreComando);
  assert.throws(() => collega(m, { da: 2, a: 1 }), ErroreComando);
});

test("impostaVincolo scrive i sei gradi e nient'altro", () => {
  const m = impostaVincolo(creaNodo(modelloVuoto(), { x: 0, z: 0 }),
    { id: 1, vincolo: { ux: true, uy: true, uz: true, rx: true, ry: true, rz: true, pinguino: true } });
  assert.deepEqual(m.nodi[0].vincolo, { ux: true, uy: true, uz: true, rx: true, ry: true, rz: true });
});

test("impostaVincolo con null libera il nodo e toglie il campo", () => {
  let m = impostaVincolo(creaNodo(modelloVuoto(), { x: 0, z: 0 }),
    { id: 1, vincolo: { ux: true, uy: true, uz: true, rx: true, ry: true, rz: true } });
  m = impostaVincolo(m, { id: 1, vincolo: null });
  assert.equal("vincolo" in m.nodi[0], false);
});

test("impostaVincolo non tocca il modello che riceve", () => {
  const m = creaNodo(modelloVuoto(), { x: 0, z: 0 });
  const prima = structuredClone(m);
  impostaVincolo(m, { id: 1, vincolo: { ux: true } });
  assert.deepEqual(m, prima);
});

test("impostaVincolo su un nodo che non esiste si rifiuta", () => {
  const m = creaNodo(modelloVuoto(), { x: 0, z: 0 });
  assert.throws(() => impostaVincolo(m, { id: 9, vincolo: null }), ErroreComando);
});

// --- giornata 11b: sezioni, materiali, danno, veste, origine -------------------------------

/** `assert.throws` con una regex guarda solo «nome: messaggio»; qui certi elenchi stanno nel
 *  rimedio, che è la seconda riga che l'interfaccia mostra. Si guardano tutti e due. */
const rifiuta = (fn, atteso) => assert.throws(fn, (e) => {
  assert.ok(e instanceof ErroreComando, `atteso un ErroreComando, arrivato ${e}`);
  assert.match(`${e.message} — ${e.rimedio ?? ""}`, atteso);
  return true;
});

const conMateriali = () => {
  let m = creaMateriale(modelloVuoto(), { tipo: "calcestruzzo", classe: "C25/30" });
  return creaMateriale(m, { tipo: "acciaio", classe: "B450C" });
};
const conSezione = () => creaSezione(conMateriali(), { b: 300, h: 500, calcestruzzo: 1, acciaio: 2 });
const staffate = () => modificaSezione(conSezione(), { id: 1, staffe: { diametro: 8, passo: 150, bracci: 2 } });

test("creaSezione: nome di default «300 × 500», copriferro 30, contatore aggiornato", () => {
  const m = conSezione();
  assert.deepEqual(m.sezioni[0], { id: 1, nome: "300 × 500", tipo: "rettangolare", b: 300, h: 500, calcestruzzo: 1, acciaio: 2, copriferro: 30, file: [], staffe: null });
  assert.equal(m.contatori.sezione, 1);
});

test("creaSezione rifiuta b e h che non sono misure positive, e dice come rimediare", () => {
  for (const misure of [{ b: 0, h: 500 }, { b: 300, h: -1 }, { b: NaN, h: 500 }, { b: "300", h: 500 }]) {
    assert.throws(() => creaSezione(conMateriali(), { ...misure, calcestruzzo: 1, acciaio: 2 }), (e) => {
      assert.ok(e instanceof ErroreComando, `atteso un ErroreComando, arrivato ${e}`);
      assert.ok(e.rimedio, "un rifiuto senza rimedio lascia l'utente fermo");
      return true;
    });
  }
});

test("creaSezione rifiuta un materiale del tipo sbagliato", () => {
  assert.throws(() => creaSezione(conMateriali(), { b: 300, h: 500, calcestruzzo: 2, acciaio: 1 }), /acciaio, non calcestruzzo/);
});

test("creaSezione rifiuta un materiale che non esiste", () => {
  rifiuta(() => creaSezione(conMateriali(), { b: 300, h: 500, calcestruzzo: 9, acciaio: 2 }), /il materiale 9 non esiste/);
});

test("creaSezione rifiuta un copriferro negativo", () => {
  rifiuta(() => creaSezione(conMateriali(), { b: 300, h: 500, calcestruzzo: 1, acciaio: 2, copriferro: -1 }),
          /il copriferro non può essere negativo/);
});

test("impostaFila poi modificaSezione che schiaccia h: rifiutata col messaggio della geometria", () => {
  let m = modificaSezione(conSezione(), { id: 1, staffe: { diametro: 8, passo: 150, bracci: 2 }, copriferro: 40 });
  m = impostaFila(m, { id: 1, lato: "inf", n: 1, diametro: 16 });
  assert.throws(() => modificaSezione(m, { id: 1, h: 100 }), /copriferri opposti/);
});

test("modificaSezione: togliere le staffe a una sezione con le file è accettato, non un errore", () => {
  const m = impostaFila(staffate(), { id: 1, lato: "inf", n: 3, diametro: 16 });
  const senza = modificaSezione(m, { id: 1, staffe: null });
  assert.equal(senza.sezioni[0].staffe, null);
  assert.deepEqual(senza.sezioni[0].file, [{ lato: "inf", n: 3, diametro: 16 }], "le file restano scritte");
});

test("modificaSezione: una riduzione parziale mette gli altri tre lati a zero, mai undefined", () => {
  const m = modificaSezione(conSezione(), { id: 1, riduzione: { sup: 20 } });
  assert.deepEqual(m.sezioni[0].riduzione, { inf: 0, sup: 20, sx: 0, dx: 0 });
  assert.equal("riduzione" in modificaSezione(m, { id: 1, riduzione: null }).sezioni[0], false);
});

test("impostaFila: lato ignoto rifiutato con i quattro lati, n = 0 toglie la fila", () => {
  const m = staffate();
  rifiuta(() => impostaFila(m, { id: 1, lato: "nord", n: 2, diametro: 16 }), /inf, sup, sx, dx/);
  const con = impostaFila(m, { id: 1, lato: "inf", n: 3, diametro: 16 });
  assert.deepEqual(con.sezioni[0].file, [{ lato: "inf", n: 3, diametro: 16 }]);
  assert.deepEqual(impostaFila(con, { id: 1, lato: "inf", n: 0, diametro: 16 }).sezioni[0].file, []);
  assert.throws(() => impostaFila(m, { id: 1, lato: "inf", n: 20, diametro: 16 }), /ingombrano/);
});

test("impostaFila rifiuta un numero di barre non intero e un diametro che non è una misura", () => {
  const m = staffate();
  rifiuta(() => impostaFila(m, { id: 1, lato: "inf", n: 2.5, diametro: 16 }), /intero/);
  rifiuta(() => impostaFila(m, { id: 1, lato: "inf", n: 2, diametro: 0 }), /maggiore di zero/);
});

test("impostaFila sostituisce la fila dello stesso lato e tiene l'ordine dei LATI", () => {
  let m = impostaFila(staffate(), { id: 1, lato: "sup", n: 2, diametro: 12 });
  m = impostaFila(m, { id: 1, lato: "inf", n: 3, diametro: 16 });
  m = impostaFila(m, { id: 1, lato: "sup", n: 4, diametro: 14 });
  assert.deepEqual(m.sezioni[0].file, [
    { lato: "inf", n: 3, diametro: 16 },
    { lato: "sup", n: 4, diametro: 14 },
  ], "una sola fila per lato, nell'ordine di LATI");
});

test("assegnaSezione: null toglie, una sezione assente rifiuta", () => {
  let m = estrudi(creaNodo(conSezione(), { x: 0, z: 0 }), { da: 1, dx: 3000, dz: 0 });
  m = assegnaSezione(m, { asta: 1, sezione: 1 });
  assert.equal(m.aste[0].sezione, 1);
  assert.equal(assegnaSezione(m, { asta: 1, sezione: null }).aste[0].sezione, null);
  assert.throws(() => assegnaSezione(m, { asta: 1, sezione: 9 }), /sezione 9 non esiste/);
  assert.throws(() => assegnaSezione(m, { asta: 9, sezione: 1 }), /asta 9 non esiste/);
});

test("eliminaSezione rifiuta se un'asta la usa e nomina le aste", () => {
  let m = estrudi(creaNodo(conSezione(), { x: 0, z: 0 }), { da: 1, dx: 3000, dz: 0 });
  m = assegnaSezione(m, { asta: 1, sezione: 1 });
  assert.throws(() => eliminaSezione(m, { id: 1 }), /aste 1/);
  const via = eliminaSezione(assegnaSezione(m, { asta: 1, sezione: null }), { id: 1 });
  assert.deepEqual(via.sezioni, []); assert.equal(via.contatori.sezione, 1);
});

test("creaMateriale: tipo ignoto, classe vuota, classe fuori catalogo", () => {
  rifiuta(() => creaMateriale(modelloVuoto(), { tipo: "legno", classe: "x" }), /calcestruzzo o acciaio/);
  rifiuta(() => creaMateriale(modelloVuoto(), { tipo: "acciaio", classe: "  " }), /vuota/);
  rifiuta(() => creaMateriale(modelloVuoto(), { tipo: "calcestruzzo", classe: "C99/99", classi: ["C25/30"] }), /C25\/30/);
  const m = creaMateriale(modelloVuoto(), { tipo: "calcestruzzo", classe: "C99/99" });  // senza catalogo: passa, giudica il server
  assert.equal(m.materiali[0].classe, "C99/99");
});

test("modificaMateriale fonde i valori, null toglie una chiave, un testo si rifiuta", () => {
  let m = modificaMateriale(conMateriali(), { id: 1, personalizzato: true, valori: { E: 31000, fck: 28 } });
  m = modificaMateriale(m, { id: 1, valori: { fck: null, nu: 0.2 } });
  assert.deepEqual(m.materiali[0].valori, { E: 31000, nu: 0.2 });
  assert.throws(() => modificaMateriale(m, { id: 1, valori: { E: "x" } }), ErroreComando);
});

test("modificaMateriale: i valori su un materiale non personalizzato restano scritti", () => {
  const m = modificaMateriale(conMateriali(), { id: 1, valori: { E: 31000 } });
  assert.deepEqual(m.materiali[0].valori, { E: 31000 }, "la riga resta: contano solo con personalizzato");
  assert.equal(m.materiali[0].personalizzato, false);
});

test("eliminaMateriale rifiuta se una sezione lo usa", () => {
  assert.throws(() => eliminaMateriale(conSezione(), { id: 1 }), /sezioni 1/);
  assert.equal(eliminaMateriale(conMateriali(), { id: 1 }).materiali.length, 1);
});

test("impostaDanno: fuori intervallo rifiutato, nota di default vuota, null toglie", () => {
  let m = estrudi(creaNodo(modelloVuoto(), { x: 0, z: 0 }), { da: 1, dx: 3000, dz: 0 });
  assert.throws(() => impostaDanno(m, { asta: 1, danno: { fattore_E: 0, fattore_fc: 1 } }), /fra 0 escluso e 1 compreso/);
  assert.throws(() => impostaDanno(m, { asta: 1, danno: { fattore_E: 1.2, fattore_fc: 1 } }), ErroreComando);
  m = impostaDanno(m, { asta: 1, danno: { fattore_E: 0.8, fattore_fc: 0.9 } });
  assert.deepEqual(m.aste[0].danno, { fattore_E: 0.8, fattore_fc: 0.9, nota: "" });
  assert.equal("danno" in impostaDanno(m, { asta: 1, danno: null }).aste[0], false);
});

test("impostaVeste: ignota rifiutata, altrimenti scrive le impostazioni anche se mancano", () => {
  rifiuta(() => impostaVeste(modelloVuoto(), { veste: "mediana" }), /caratteristica, media, progetto, esistente/);
  const m = modelloVuoto(); delete m.impostazioni_analisi;
  assert.deepEqual(impostaVeste(m, { veste: "progetto" }).impostazioni_analisi, { fibre: 10, veste: "progetto" });
});

test("materialiDiDefault non tocca un modello che ha già i due tipi", () => {
  const m = conMateriali();
  const { modello, aggiunti } = materialiDiDefault(m);
  assert.deepEqual(aggiunti, []); assert.deepEqual(modello, m);
  assert.deepEqual(materialiDiDefault(modelloVuoto()).aggiunti, [DEFAULT_CALCESTRUZZO, DEFAULT_ACCIAIO]);
});

test("story 55: spostare un nodo importato lo marca modificato, uno disegnato resta senza origine", () => {
  let m = creaNodo(modelloVuoto(), { x: 0, z: 0 });
  m.nodi[0].origine = { sorgente: "rilievo", modificata: false };
  m = spostaNodo(m, { id: 1, x: 10 });
  assert.equal(m.nodi[0].origine.modificata, true);
  const n = spostaNodo(creaNodo(modelloVuoto(), { x: 0, z: 0 }), { id: 1, x: 10 });
  assert.equal("origine" in n.nodi[0], false);
});

test("story 55: anche rinomina e impostaVincolo marcano l'origine modificata", () => {
  const m = creaNodo(modelloVuoto(), { x: 0, z: 0 });
  m.nodi[0].origine = { sorgente: "rilievo", modificata: false };
  assert.equal(rinomina(m, { tipo: "nodo", id: 1, nome: "piede" }).nodi[0].origine.modificata, true);
  assert.equal(impostaVincolo(m, { id: 1, vincolo: { ux: true } }).nodi[0].origine.modificata, true);
  assert.equal(m.nodi[0].origine.modificata, false, "il modello in ingresso resta com'era");
});

test("nessun riduttore nuovo tocca il modello che riceve", () => {
  let m = estrudi(creaNodo(conSezione(), { x: 0, z: 0 }), { da: 1, dx: 3000, dz: 0 });
  m = assegnaSezione(m, { asta: 1, sezione: 1 });
  m = modificaSezione(m, { id: 1, staffe: { diametro: 8, passo: 150 } });
  m.nodi[0].origine = { sorgente: "rilievo", modificata: false };
  const prima = structuredClone(m);
  modificaSezione(m, { id: 1, b: 400 });
  impostaFila(m, { id: 1, lato: "inf", n: 2, diametro: 16 });
  assegnaSezione(m, { asta: 1, sezione: null });
  creaMateriale(m, { tipo: "acciaio", classe: "B450A" });
  modificaMateriale(m, { id: 1, valori: { E: 31000 } });
  impostaDanno(m, { asta: 1, danno: { fattore_E: 0.8, fattore_fc: 0.9 } });
  impostaVeste(m, { veste: "progetto" });
  materialiDiDefault(m);
  spostaNodo(m, { id: 1, x: 10 });
  assert.deepEqual(m, prima);
});
