# NOVA T5 — giornata 14a: modi animati e pushover

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** dopo una corsa con la modale, i **modi** entrano nel menu del caso («modo 2 · 31,85 Hz · ux 92 %») e la vista deformata li **anima** (parte da sola, `Spazio` la ferma e la riprende, ampiezza = la scala auto dichiarata nel badge con frequenza, periodo e massa partecipante accanto); dopo una corsa con la pushover, il caso «pushover» mostra la **curva taglio–spostamento** nella striscia sotto il piano con i passi cliccabili e `←`/`→` che li scorrono, la deformata del piano e del 3D che segue il passo (scrubber), lo **stato delle sezioni** per stazione a due canali (calcestruzzo: elastica/fessurata/schiacciata; acciaio: elastica/snervata/rotta) disegnato sull'asta deformata con una legenda, e la **caduta** segnata come fatto. Spostamenti del nodo per passo e forma modale per nodo nell'ispettore. Verifica: MURO 1 — il modo 2 nel piano animato; la pushover scorsa con lo scrubber; il fumo in Chrome lo prova.

**Architecture:** nessun cambio nel server: i modi (`modi[] = {n, f, T, forma{"<id>": [ux,uy,uz]}, massa_partecipante, cumulata}`, `nova/modale.py:59-93`) e la pushover (`passi[] = {n, spostamento, taglio_base, spostamenti{"<id>": [6]}, stato_sezioni{"<id asta>": [{calcestruzzo, acciaio}, …]}, algoritmo, incremento}`, `caduta`, `run.pushover.u0`, `nova/passi.py:187-252`) arrivano già in `lavoro.fin.risultati`. Il **caso** scelto (`risultati.caso` in `app.js`) diventa una chiave a tre forme: un caso statico (`"Z1"`), un modo (`"modo:2"`), la pushover (`"pushover"`); una funzione pura `casoScelto(risultati, caso, passo)` in `static/risultati.js` traduce ognuna in un `perCaso` **sintetico** (`{spostamenti}`) che piano, spazio, pannello e striscia già sanno disegnare — la forma modale è una deformata, il passo della pushover è una deformata. L'animazione è un modulo puro `static/animazione.js` (fase sinusoidale, `prefers-reduced-motion`, un ciclo al secondo) più un ciclo `requestAnimationFrame` in `app.js` che ridisegna solo piano e spazio con un `fattore` moltiplicativo della scala. La curva della pushover vive nella striscia (`static/esito.js` `creaSrotolato`, come oggi l'M srotolato), in pixel. Lo stato delle sezioni si disegna in `piano.js` sui punti della deformata (`r` = `x_rel` dei punti di `puntiDeformata`) con un simbolo a due canali. Il fumo prova modale e pushover sul MURO 1.

**Tech Stack:** moduli ES nativi, `node --test` col DOM finto di `piano.test.js`/`esito.test.js`, pytest + Chrome headless via CDP (`tests/fumo/`), three.js vendorizzato.

**Spec:** `docs/superpowers/specs/2026-09-05-nova-v1-design.md` — story 45 (riga 84: modi animati con frequenza e massa accanto e tasti per cambiarli — **i tasti `1 2 3` sono già le viste**, decisione D1a dell'autore: i modi stanno nel menu del caso), 48 (riga 92: curva con passi cliccabili e scrubber), 49 (riga 93: stato delle sezioni a quattro valori su due canali — il codice ne ha 3+3 per canale, `nova/passi.py:31-32`; decisione D4a: si tengono 3+3 e si disegnano su due canali), 50 (riga 94: la caduta dichiarata), 63 (un solo rosso, tratteggio), 64 (unità). «Risultati per corsa» righe 186-203 (`modi`, `passi`, `caduta`, `u0`: `passi[].spostamento` relativo a `u0`, `passi[].spostamenti[nodo]` assoluti). Calendario: `docs/superpowers/plans/2026-09-06-t5-interfaccia-bozza.md:21` (giornata 14; il Confronto è la 14b, decisione D8).

**Ricerca che questo piano applica** (`docs/ricerca/index.md:19`, ricerca 07; `:23`, ricerca 11): `07-ux-modellatore.md:103` (SAP2000: animazione con slider di velocità; modi a scala dichiarata, massa partecipante accanto al numero, NTC 7.3.3.1 85 %), `:99` (scala sempre stampata), `:100` (doppio canale: colore **e** forma), `:105` (Tufte, data-ink), `11-modi-sulla-tangente-opensees.md:212-223` (frequenze non fisiche: dalla PR #80 un modo con λ ≤ 0 ha `f: null`).

**Decisioni dell'autore (11/09, D1-D8):** D1a modi nel menu del caso, animati dalla vista deformata; D2a l'animazione parte da sola, `Spazio` ferma/riprende, ampiezza = scala auto, un ciclo al secondo, `prefers-reduced-motion` → ferma sul massimo; D3a tutti i modi nel menu con la massa accanto, i primi tre in testa; D4a stato 3+3 su due canali con simbolo; D5a curva nella striscia `#srotolato`, clic e `←`/`→` sul passo, deformata che segue; D6a/D7a Confronto rinviato alla 14b; D8 sì.

**Ramo:** `feat/interfaccia-14a-modi-pushover` da `main` `2a2a44a`, worktree `/Users/mario/GitHub/NOVA-wt/interfaccia-14a` (venv pronto, `nova ok 3.12.13`). PR verso `main`; merge solo con via libera dell'autore.

## Global Constraints

- **Lingua italiana** in interfaccia, commenti, commit; identificatori invariati. Chiavi dei risultati alla lettera: `modi[k] = {n, f, T, forma, massa_partecipante{x,y,z}, cumulata{x,y,z}}` (`nova/modale.py:88-93`; `f`/`T` possono essere `null` dalla PR #80), `passi[k]`, `caduta`, `run.pushover.u0` (`nova/passi.py:236-251`), `stato_sezioni[asta][stazione] = {calcestruzzo, acciaio}` con i valori di `nova/passi.py:31-32`.
- **Il caso è una chiave a tre forme**: `"<caso statico>"`, `"modo:<n>"`, `"pushover"`; `casoScelto` la traduce; nessun altro modulo interpreta la stringa.
- **Un ciclo al secondo, non la frequenza vera** (20 Hz non si vede): il badge dice la frequenza vera. `prefers-reduced-motion: reduce` → nessuna animazione, forma ferma al massimo (`fattore = 1`), badge «· ferma (preferenza di sistema)».
- **Il ridisegno per fotogramma tocca solo piano e spazio** (`disegnaPiano` + `spazio.disegna`), non `ridisegna()` intero; un fotogramma per `requestAnimationFrame`, mai un secondo `setInterval`.
- **Scala della deformata sempre stampata** anche per modi e passi; il **fattore** dell'animazione non entra nel badge (la scala dichiarata è l'ampiezza massima).
- **Un solo rosso** `#b8321e`: stantia, selezione — e il **passo corrente** sulla curva (è una selezione). I simboli dello stato delle sezioni sono inchiostro: riempimento (vuoto/mezzo/pieno) per il calcestruzzo, contorno (sottile/spesso/con croce) per l'acciaio, con la legenda stampata sotto il badge.
- **`←`/`→` cambiano il passo solo senza ghost e con la pushover scelta**; altrimenti restano al browser come oggi (`app.js:752-758`). `Spazio` ferma/riprende solo con un modo scelto; su un bottone o un campo a fuoco resta al controllo (`daControllo`, `tastiera.js:109-120`).
- **Lo stato vive in `app.js`** (`risultati = { lavoro, vista, caso, scalaMano, passo, animazione }`), fuori da modello e cronologia; «apri»/«importa» azzerano come oggi (`app.js:271-276` e gli azzeramenti esistenti).
- **Sotto `nova/` non cambia niente.**
- Nessun bundler, nessuna rete a tempo d'uso; WCAG AA; `kbd` con `aria-label` in parole (`nomeTasto`).
- Comando dei test JS: `env -C /Users/mario/GitHub/NOVA-wt/interfaccia-14a/static node --test test/*.test.js` — punto di partenza **761 pass**. Pytest: `/Users/mario/GitHub/NOVA-wt/interfaccia-14a/.venv/bin/python -P -m pytest /Users/mario/GitHub/NOVA-wt/interfaccia-14a/tests -p no:cacheprovider --color=no --tb=short -rs --rootdir=/Users/mario/GitHub/NOVA-wt/interfaccia-14a` — punto di partenza **741 pass + 3 skip**; il fumo: 16 test in `tests/test_fumo_chrome.py`.
- Server per la prova: `env -C /Users/mario/GitHub/NOVA-wt/interfaccia-14a /Users/mario/GitHub/NOVA-wt/interfaccia-14a/.venv/bin/python -P -m nova --porta 8822`. **Mai la 8765, né 8766-8767, né 8817-8821.**
- Mai `git checkout --` per revertire un mutante; un comando per chiamata Bash, percorsi assoluti, `git -C`; commit per percorso, mai `-a`.

## Quel che c'è già, e non va reinventato

- `static/app.js:57-77` lo stato `risultati` e `risultatiInVista(m)` (`{vista, caso, perCaso, scala, auto, stantia}`, scala auto solo in vista deformata); `:271-276` `suEsito` (`casiDi` → primo caso, vista deformata); `:635-650` `perCasoDelloStato()` e `disegnaPiano(m)` (piano + striscia; usata anche dal `resize` a `:714-717`); `:654-702` `ridisegna` (spazio a `:684-685` con `puntiDeformata(m, inVista.perCaso, inVista.scala)`; pannello a `:688-697` con `risultati: perCasoDelloStato()`; `esito.disegna({risultati, stantia})` a `:702`); `:752-758` il ramo `direzione` del keydown (`ruotaGhost`, `return` se non gira); `:770-780` `eseguiVoce` (R4: la coda guarda `voce.campo`); `:841-853` il ramo `vista` (`[null, ...VISTE]`).
- `static/risultati.js`: `VISTE` (`:14`), `casiDi` (`:18`), `scalaAuto(m, perCaso)` (`:127`), `puntiDeformata(m, perCaso, scala, segmenti)` (`:199`: rende `[{id, punti: [{x, y, z, r}]}]`, con `r` = `x_rel` lungo l'asta; usa `spostamenti_interni` se c'è, `:36-59`), `testoBadge({vista, caso, scala, auto, stantia, ruotate})` (`:345-353`), `righeSpostamenti(perCaso, id)` (`:361`), `testoEquilibrio(risultati, caso)` (`:377`), `srotolato` (`:388`).
- `static/piano.js:161-250` `stratoDeiRisultati(m, attivo, vistaRis, s, {richieste, linee})` — ramo deformata a `:178-198` (polilinea da `puntiDeformata(m, attivo.perCaso, attivo.scala)`, etichetta della freccia da `frecciaMassima`); `:251` `disegna(m, {…, risultati})`; badge a `:120-126` e `:400-402`; ostacolo del badge a `:418`.
- `static/esito.js:12-67` `creaEsito` (select `#risultati-caso` con `casiDi`, radio, scala, equilibrio, `queueMicrotask(suCambio)`); `:76-138` `creaSrotolato` (striscia in pixel, `W = clientWidth || 200`, `H = 96`, titolo `.titolo`).
- `static/spazio.js:140-177` `disegna(m, {selezione, deformata})` con `deformata = {aste: puntiDeformata(...), stantia}`.
- `static/pannello.js:40-49` `righeDiNodo` con `risultati?.perCaso` → `righeSpostamenti` col caso nel termine.
- `static/tastiera.js:27` la voce `vista` (contesto `risultati`), `:78` le cifre, `:109-120` `daControllo`, `:157-172` `vociDellaBarra(contesto, tipo, {risultati})`.
- `static/index.html:41-43` `#srotolato`; `:92-109` il blocco `#risultati` (`#risultati-vuoto`, `#risultati-caso`, radio, `#risultati-scala`, `#risultati-equilibrio`). `static/stile.css:66-73` `#srotolato` e `.titolo`.
- `static/legame.js:45-69` `svgCurva` (stringa SVG con assi ed estremi: la forma della curva, non riusabile tal quale — restituisce una stringa, la striscia costruisce elementi cliccabili).
- `tests/fumo/fumo.mjs:33-63` il copione `risultati` (apri con `⌘O`, corri con `⌘⏎`, aspetta `#corsa-ultima`, `#risultati-controlli`); `tests/test_fumo_chrome.py:99-104` `copione(nome, porta, cdp, **extra)`, fixture `chrome_e_server`, `binario_opensees`.
- Fixture: `docs/caso-studio/muro_1.nova.json` (statica C1-C3 + modale «auto» → 42 modi, f1 = 20,45 Hz uy, f2 = 31,85 Hz ux, f3 = 35,85 Hz uy, `docs/caso-studio/README.md:142-152`); `docs/caso-studio/muro_1_pushover.nova.json` (statica a fibre C1/C3 con 10 passi + pushover uniforme, nodo 3, `ux`, incremento 0,5, max 60 → 120 passi, ≈ 2 s, `caduta: null`, taglio massimo 72 115 N al passo 109, `README.md:200-211`); `tests/test_pushover_binario.py:24-31` `_modello_pushover` sul telaio 2×1 (nodo 4, `ux`, 60 passi da 1 mm).
- Stazioni: `nova/deck.py:33-34` `STAZIONI = 5`, `XI_LOBATTO = (0.0, 0.1726731646, 0.5, 0.8273268354, 1.0)`; `nova/passi.py:149-172` `stato_sezioni` ha **le stesse stazioni** di `corsa._stazioni` (stazione 0 degli elementi interni saltata) → per un'asta con `suddivisioni = n` ci sono `4n + 1` stazioni con `x_rel = (k + ξ)/n`.

## Contratto dei moduli (le firme che i task condividono)

```js
// static/risultati.js — aggiunte, tutte pure
export const CHIAVE_MODO = (n) => `modo:${n}`;
export function vociDelCaso(risultati)
// → [{valore, testo, tipo: "caso"|"pushover"|"modo", n?}] nell'ordine: casi statici, «pushover · 120 passi» (se passi.length), modi
//   («modo 2 · 31,85 Hz · ux 92 %»; f null → «modo 3 · frequenza non fisica»; direzione = argmax di massa_partecipante, in %)
export function casoScelto(risultati, caso, passo = null)
// → null | { tipo: "caso", perCaso }
//   | { tipo: "modo", n, modo, perCaso: formaComeSpostamenti(modo) }
//   | { tipo: "pushover", k, n: passi.length, passo: passi[k], perCaso: { spostamenti: passi[k].spostamenti }, stati: passi[k].stato_sezioni, caduta, u0 }
//   `passo` null → l'ultimo (k = n − 1); fuori da [0, n) → stretto ai limiti
export function formaComeSpostamenti(modo)        // { spostamenti: { "<id>": [ux, uy, uz, 0, 0, 0] } } (niente rotazioni: la forma è lineare fra i nodi)
export function stazioniDiAsta(a, quante = null)  // [x_rel…] da XI_LOBATTO e `a.suddivisioni` (default 1); se `quante` è dato e non combacia → equispaziate su `quante`
export function simboloStato(stato)               // { riempimento: 0|0.5|1, contorno: "sottile"|"spesso"|"croce" } | null
export function curvaPushover(passi, caduta)      // { punti: [{k, u, V}], uMax, vMax, caduta: {k, u, motivo}|null } — u in mm (relativo), V in kN
export function testoBadge({ vista, caso, scala, auto, stantia, ruotate, modo, passo, fermo })
// modo: «modo 2 · 31,85 Hz · T 0,031 s · ux 92 % · ×n (auto)» + « · ferma» se fermo; f null → «modo 3 · frequenza non fisica · ×n (auto)»
// pushover: «pushover · passo 37/120 · u 18,5 mm · V 42,3 kN · ×n (auto)» + « · caduta al passo 89: <motivo>» se caduta
export function testoLegendaStati()               // «calcestruzzo: ○ elastica · ◐ fessurata · ● schiacciata — acciaio: contorno sottile elastica · spesso snervata · ✕ rotta»
export function righeModo(modo, id)               // [["forma modale (modo 2)", "ux 0,12 · uy 0 · uz −0,03"]] o []
export function testoEquilibrio(risultati, caso)  // invariata per i casi; per "modo:n" → «massa partecipante x 92 % · y 0 % · z 1 % · cumulata x 95 % · y 78 % · z 100 %»; per "pushover" → «120 passi convergenti · u₀ 0,0002 mm · taglio massimo 72,1 kN al passo 109 · caduta: nessuna»

// static/animazione.js — puro + un runner
export const PERIODO_MS = 1000;
export const fase = (t, periodo = PERIODO_MS) => Math.sin(2 * Math.PI * (t / periodo));
export const movimentoRidotto = (finestra = globalThis) => Boolean(finestra.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
export function creaAnimazione({ suFotogramma, orologio = () => performance.now(), richiedi = (f) => requestAnimationFrame(f) })
// → { avvia(), ferma(), inCorso() }: avvia chiama suFotogramma(fase(t − t0)) a ogni fotogramma finché ferma(); avvia due volte non raddoppia

// static/esito.js
creaEsito(radice, { suCambio, suAvviso })   // suCambio({ caso, vista, scalaMano }) come oggi; le opzioni del select da vociDelCaso
creaSrotolato(contenitore, { suPasso })     // disegna({ risultati, modello, selezione }): con risultati.tipo === "pushover" la curva, altrimenti come oggi

// static/piano.js
disegna(m, { …, risultati })   // risultati: null | { vista, caso, perCaso, scala, auto, stantia, fattore = 1, stati = null, tipo, badge: {modo?, passo?, fermo?} }
// la deformata usa scala·fattore; `stati` (pushover) → simboli per stazione sulla polilinea; badge da testoBadge; legenda sotto il badge in vista deformata con `stati`

// static/app.js
// risultati = { lavoro, vista, caso, scalaMano, passo: null, animazione: "va" }
// risultatiInVista(m, fattore = 1) → usa casoScelto; pannello riceve { perCaso, caso, etichetta }
```

---

### Task 1: `risultati.js` e `animazione.js` — le pure

**Files:**
- Modify: `static/risultati.js` (aggiunte in coda e `testoBadge`/`testoEquilibrio` estese)
- Create: `static/animazione.js`
- Test: `static/test/risultati.test.js` (in coda), `static/test/animazione.test.js`

**Interfaces:** vedi «Contratto dei moduli». `vociDelCaso` e `casoScelto` leggono `risultati.lavoro.fin.risultati` (`per_caso`, `modi`, `passi`, `caduta`, `run.pushover`).

- [ ] **Step 1: i test** (in coda a `risultati.test.js`; fixture a mano):

```js
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
  assert.equal(p.k, 1); assert.equal(p.n, 2); assert.deepEqual(p.perCaso.spostamenti[3], [1, 0, 0, 0, 0, 0]);
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
  assert.deepEqual(c.caduta, { k: 1, u: 1, motivo: "non converge" });
  assert.deepEqual(curvaPushover([], null), { punti: [], uMax: 0, vMax: 0, caduta: null });
  assert.deepEqual(curvaPushover(undefined, null).punti, []);
});
test("testoBadge per modo e pushover", () => {
  assert.equal(testoBadge({ vista: "deformata", caso: "modo:2", scala: 50, auto: true, modo: M2 }), "modo 2 · 31,85 Hz · T 0,031 s · ux 92 % · ×50 (auto)");
  assert.equal(testoBadge({ vista: "deformata", caso: "modo:2", scala: 50, auto: true, modo: M2, fermo: true }), "modo 2 · 31,85 Hz · T 0,031 s · ux 92 % · ×50 (auto) · ferma");
  assert.equal(testoBadge({ vista: "deformata", caso: "modo:3", scala: 1, auto: true, modo: M3 }), "modo 3 · frequenza non fisica · ×1 (auto)");
  assert.equal(testoBadge({ vista: "deformata", caso: "pushover", scala: 20, auto: true, passo: { k: 1, n: 2, u: 1, V: 2.3 } }), "pushover · passo 2/2 · u 1 mm · V 2,3 kN · ×20 (auto)");
  assert.equal(testoBadge({ vista: "deformata", caso: "pushover", scala: 20, auto: true, passo: { k: 1, n: 2, u: 1, V: 2.3 }, caduta: { k: 1, motivo: "non converge" } }),
               "pushover · passo 2/2 · u 1 mm · V 2,3 kN · ×20 (auto) · caduta al passo 2: non converge");
  assert.equal(testoBadge({ vista: "M", caso: "pushover", passo: { k: 1, n: 2, u: 1, V: 2.3 } }), "pushover · passo 2/2 · M · nessun diagramma per un passo");
});
test("righeModo e testoEquilibrio per modo e pushover", () => {
  assert.deepEqual(righeModo(M2, 3), [["forma modale (modo 2)", "ux 1 · uy 0 · uz -0,03"]]);
  assert.deepEqual(righeModo(M2, 9), []);
  assert.equal(testoEquilibrio(R.lavoro.fin.risultati, "modo:2"), "massa partecipante x 92 % · y 0 % · z 1 % · cumulata x 95 % · y 78 % · z 100 %");
  assert.equal(testoEquilibrio(R.lavoro.fin.risultati, "pushover"), "2 passi convergenti · u₀ 0,0002 mm · taglio massimo 2,3 kN al passo 2 · caduta: nessuna");
  assert.equal(testoEquilibrio(R.lavoro.fin.risultati, "modo:9"), "—");
});
```

`static/test/animazione.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { fase, movimentoRidotto, creaAnimazione, PERIODO_MS } from "../animazione.js";

test("fase: seno di un ciclo al secondo", () => {
  assert.equal(fase(0), 0);
  assert.ok(Math.abs(fase(250) - 1) < 1e-9);
  assert.ok(Math.abs(fase(750) + 1) < 1e-9);
  assert.ok(Math.abs(fase(PERIODO_MS)) < 1e-9);
  assert.ok(Math.abs(fase(500, 2000) - 1) < 1e-9);
});
test("movimentoRidotto: legge matchMedia, senza matchMedia è falso", () => {
  assert.equal(movimentoRidotto({ matchMedia: () => ({ matches: true }) }), true);
  assert.equal(movimentoRidotto({ matchMedia: () => ({ matches: false }) }), false);
  assert.equal(movimentoRidotto({}), false);
});
test("creaAnimazione: i fotogrammi arrivano finché non si ferma; avvia due volte non raddoppia", () => {
  const coda = [];
  let t = 0;
  const fotogrammi = [];
  const a = creaAnimazione({ suFotogramma: (f) => fotogrammi.push(f), orologio: () => t, richiedi: (fn) => coda.push(fn) });
  assert.equal(a.inCorso(), false);
  a.avvia(); a.avvia();
  assert.equal(coda.length, 1, "una sola richiesta in volo");
  t = 250; coda.shift()();          // primo fotogramma
  assert.ok(Math.abs(fotogrammi[0] - 1) < 1e-9);
  assert.equal(coda.length, 1);
  a.ferma();
  t = 500; coda.shift()();          // un fotogramma già richiesto arriva dopo `ferma`: non chiama più
  assert.equal(fotogrammi.length, 1);
  assert.equal(coda.length, 0);
  assert.equal(a.inCorso(), false);
});
```

- [ ] **Step 2: rosso** (`Cannot find module '../animazione.js'`, `vociDelCaso is not a function`).

- [ ] **Step 3: il codice** — `animazione.js`:

```js
// L'animazione dei modi: una fase sinusoidale a un ciclo al secondo (la frequenza vera non si
// vede: il badge la dice), e un runner con un solo fotogramma in volo. `prefers-reduced-motion`
// spegne il moto: la forma resta ferma al massimo, e il badge lo dice (D2a).
export const PERIODO_MS = 1000;
export const fase = (t, periodo = PERIODO_MS) => Math.sin(2 * Math.PI * (t / periodo));
export const movimentoRidotto = (finestra = globalThis) => Boolean(finestra.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);

export function creaAnimazione({ suFotogramma, orologio = () => performance.now(), richiedi = (f) => requestAnimationFrame(f) }) {
  let attiva = false, inVolo = false, t0 = 0;
  const passo = () => {
    inVolo = false;
    if (!attiva) return;           // fermata dopo la richiesta: il fotogramma arriva e non disegna
    suFotogramma(fase(orologio() - t0));
    inVolo = true; richiedi(passo);
  };
  return {
    avvia() { if (attiva) return; attiva = true; t0 = orologio(); if (!inVolo) { inVolo = true; richiedi(passo); } },
    ferma() { attiva = false; },
    inCorso: () => attiva,
  };
}
```

`risultati.js` (in coda; `XI_LOBATTO` copiato da `nova/deck.py:34` con il commento):

```js
export const CHIAVE_MODO = (n) => `modo:${n}`;
const XI_LOBATTO = [0, 0.1726731646, 0.5, 0.8273268354, 1];   // `nova/deck.py:34`, 5 punti per elemento
const percento = (v) => `${conciso(100 * (Number(v) || 0))} %`;
const direzioneDominante = (mp) => ["x", "y", "z"].reduce((a, k) => ((mp?.[k] ?? 0) > (mp?.[a] ?? 0) ? k : a), "x");

const modiDi = (risultati) => (Array.isArray(risultati?.modi) ? risultati.modi : []);
const passiDi = (risultati) => (Array.isArray(risultati?.passi) ? risultati.passi : []);

export function vociDelCaso(stato) {
  const r = stato?.lavoro?.fin?.risultati;
  if (!r) return [];
  const voci = casiDi(r).map((c) => ({ valore: c, testo: c, tipo: "caso" }));
  const passi = passiDi(r);
  if (passi.length) voci.push({ valore: "pushover", testo: `pushover · ${passi.length} ${passi.length === 1 ? "passo" : "passi"}`, tipo: "pushover" });
  for (const m of modiDi(r)) {
    const d = direzioneDominante(m.massa_partecipante);
    const testo = Number.isFinite(m.f) && m.f > 0
      ? `modo ${m.n} · ${conciso(m.f)} Hz · u${d} ${percento(m.massa_partecipante?.[d])}`
      : `modo ${m.n} · frequenza non fisica`;
    voci.push({ valore: CHIAVE_MODO(m.n), testo, tipo: "modo", n: m.n });
  }
  return voci;
}

export const formaComeSpostamenti = (modo) => ({
  spostamenti: Object.fromEntries(Object.entries(modo?.forma ?? {}).map(([id, u]) => [id, [...u.slice(0, 3).map((v) => Number(v) || 0), 0, 0, 0]])),
});

export function casoScelto(stato, caso, passo = null) {
  const r = stato?.lavoro?.fin?.risultati;
  if (!r || typeof caso !== "string") return null;
  if (caso === "pushover") {
    const passi = passiDi(r);
    if (!passi.length) return null;
    const k = Math.min(passi.length - 1, Math.max(0, Number.isInteger(passo) ? passo : passi.length - 1));
    return { tipo: "pushover", k, n: passi.length, passo: passi[k], perCaso: { spostamenti: passi[k].spostamenti ?? {} },
             stati: passi[k].stato_sezioni ?? null, caduta: r.caduta ?? null, u0: r.run?.pushover?.u0 ?? null };
  }
  if (caso.startsWith("modo:")) {
    const n = Number(caso.slice(5));
    const modo = modiDi(r).find((m) => m.n === n);
    return modo ? { tipo: "modo", n, modo, perCaso: formaComeSpostamenti(modo) } : null;
  }
  const perCaso = r.per_caso?.[caso];
  return perCaso ? { tipo: "caso", perCaso } : null;
}

/** Le stazioni di un'asta come le scrive `nova/passi.py:stato_sezioni`: 5 di Lobatto per elemento,
 *  la prima degli elementi interni saltata → 4n + 1. `quante` è il conteggio letto dai risultati:
 *  se non combacia (un file di un'altra versione) si ripiega su stazioni equispaziate. */
export function stazioniDiAsta(a, quante = null) {
  const n = Math.max(1, Math.floor(Number(a?.suddivisioni) || 1));
  const x = [];
  for (let e = 0; e < n; e++) for (let k = 0; k < XI_LOBATTO.length; k++) { if (e > 0 && k === 0) continue; x.push((e + XI_LOBATTO[k]) / n); }
  if (quante === null || quante === x.length) return x;
  if (quante <= 0) return [];
  return quante === 1 ? [0.5] : Array.from({ length: quante }, (_, k) => k / (quante - 1));
}

const RIEMPIMENTO = { elastica: 0, fessurata: 0.5, schiacciata: 1 };
const CONTORNO = { elastica: "sottile", snervata: "spesso", rotta: "croce" };
export function simboloStato(stato) {
  const r = RIEMPIMENTO[stato?.calcestruzzo], c = CONTORNO[stato?.acciaio];
  return r === undefined || c === undefined ? null : { riempimento: r, contorno: c };
}

export function curvaPushover(passi, caduta) {
  const lista = Array.isArray(passi) ? passi : [];
  const punti = lista.map((p, k) => ({ k, u: Number(p.spostamento) || 0, V: (Number(p.taglio_base) || 0) / 1e3 }));
  const uMax = punti.reduce((a, p) => Math.max(a, p.u), 0), vMax = punti.reduce((a, p) => Math.max(a, p.V), 0);
  const c = caduta && Number.isFinite(caduta.passo)
    ? { k: Math.min(lista.length - 1, Math.max(0, caduta.passo - 1)), u: Number(caduta.spostamento) || 0, motivo: String(caduta.motivo ?? "") } : null;
  return { punti, uMax, vMax, caduta: c };
}

export const testoLegendaStati = () =>
  "calcestruzzo: ○ elastica · ◐ fessurata · ● schiacciata — acciaio: contorno sottile elastica · spesso snervata · ✕ rotta";

export function righeModo(modo, id) {
  const u = modo?.forma?.[String(id)];
  if (!Array.isArray(u) || u.length < 3) return [];
  return [[`forma modale (modo ${modo.n})`, `ux ${conciso(u[0])} · uy ${conciso(u[1])} · uz ${conciso(u[2])}`]];
}
```

`testoBadge` diventa:

```js
export function testoBadge({ vista, caso, scala, auto, stantia = false, ruotate = 0, modo = null, passo = null, caduta = null, fermo = false }) {
  if (!vista) return "";
  const testa = stantia ? "stantia · " : "";
  const scalaTesto = `×${conciso(scala)} (${auto ? "auto" : "a mano"})`;
  if (modo) {
    const d = direzioneDominante(modo.massa_partecipante);
    const f = Number.isFinite(modo.f) && modo.f > 0
      ? `${conciso(modo.f)} Hz · T ${conciso(modo.T)} s · u${d} ${percento(modo.massa_partecipante?.[d])}` : "frequenza non fisica";
    if (vista !== "deformata") return `${testa}modo ${modo.n} · ${vista} · nessun diagramma per un modo`;
    return `${testa}modo ${modo.n} · ${f} · ${scalaTesto}${fermo ? " · ferma" : ""}`;
  }
  if (passo) {
    const p = `pushover · passo ${passo.k + 1}/${passo.n}`;
    if (vista !== "deformata") return `${testa}${p} · ${vista} · nessun diagramma per un passo`;
    const c = caduta ? ` · caduta al passo ${caduta.k + 1}: ${caduta.motivo}` : "";
    return `${testa}${p} · u ${conciso(passo.u)} mm · V ${conciso(passo.V)} kN · ${scalaTesto}${c}`;
  }
  // …il corpo di oggi per i casi statici, invariato…
}
```

`testoEquilibrio(risultati, caso)`: in testa, se `caso` comincia per `modo:` → la riga delle masse (o «—» se il modo non c'è); se `caso === "pushover"` → «N passi convergenti · u₀ … mm · taglio massimo … kN al passo k · caduta: nessuna | al passo k (motivo)» (o «—» senza passi); altrimenti il corpo di oggi.

- [ ] **Step 4: verde**: `env -C …/static node --test test/risultati.test.js test/animazione.test.js`, poi tutti (761 + nuovi).
- [ ] **Step 5: Commit** `feat(interfaccia): risultati.js — casi a tre forme (caso, modo, pushover), stazioni, stato delle sezioni, curva; animazione.js`.

## Ingressi degeneri
- `vociDelCaso(null)`, risultati senza `modi`/`passi` → solo i casi; `modi` con `f: null` → voce «frequenza non fisica»
- `casoScelto` con caso sconosciuto, modo assente, `passi` vuota → `null`; `passo` fuori da [0, n) → stretto ai limiti; `passo` non intero → l'ultimo
- `formaComeSpostamenti` con `forma` mancante o vettori corti → `{spostamenti: {}}` / componenti mancanti a 0
- `stazioniDiAsta` con `suddivisioni` 0, negativa, non numerica → come 1; `quante` che non combacia → equispaziate; `quante` 0 → `[]`
- `simboloStato` con valore sconosciuto o `null` → `null` (nessun simbolo)
- `curvaPushover` con `passi` non lista → vuota; `caduta.passo` fuori scala → stretto
- `creaAnimazione`: `avvia` due volte → una richiesta; `ferma` con fotogramma in volo → nessun fotogramma dopo; `ferma` senza `avvia` → non solleva

Riferimento: `docs/ricerca/07-ux-modellatore.md:103` (animazione a scala dichiarata, massa accanto al numero), `11-modi-sulla-tangente-opensees.md:212-223` (frequenze non fisiche).

---

### Task 2: il piano — fattore dell'animazione, stato delle sezioni, badge e legenda

**Files:**
- Modify: `static/piano.js` (`stratoDeiRisultati` ramo deformata; badge; legenda)
- Test: `static/test/piano.test.js`

**Interfaces:** consuma `simboloStato`, `stazioniDiAsta`, `testoBadge`, `testoLegendaStati` (Task 1); `risultati` con `fattore`, `stati`, `tipo`, `badge`.

- [ ] **Step 1: i test** (DOM finto già in `piano.test.js:117-156`; `traveR`/`Z1R` da lì):

```js
test("piano: il fattore dell'animazione moltiplica la scala della deformata, non il badge", () => {
  const { piano, svg, contenitore } = pianoFinto();   // adatta a come `pianoFinto` rende badge/contenitore (Task 4 della 13: badge = contenitore._figli[2])
  const perCaso = { spostamenti: { 1: [0, 0, 0, 0, 0, 0], 2: [0, 0, -3, 0, 0, 0] } };
  piano.disegna(traveR, { risultati: { vista: "deformata", caso: "modo:2", perCaso, scala: 100, auto: true, stantia: false, fattore: 0.5, tipo: "modo",
                                       badge: { modo: { n: 2, f: 31.85, T: 0.0314, massa_partecipante: { x: 0.92, y: 0, z: 0.01 } } } } });
  const [pl] = tutti(svg, "polyline").filter((p) => p.getAttribute("class") === "deformata");
  const ultimo = pl.getAttribute("points").split(" ").at(-1).split(",").map(Number);
  // il nodo 2 scende di 3·100·0,5 = 150 mm sullo schermo (y in basso)
  assert.ok(Math.abs((ultimo[1] - schermoDi(traveR, 2).y) - 150) < 1e-6);
  assert.ok(badgeDi(contenitore).textContent.startsWith("modo 2 · 31,85 Hz"));
  assert.ok(badgeDi(contenitore).textContent.includes("×100 (auto)"), "la scala dichiarata è l'ampiezza massima, non il fattore");
});
test("piano: gli stati delle sezioni sono simboli sulla deformata, con la legenda; senza `stati` niente", () => {
  const { piano, svg, contenitore } = pianoFinto();
  const stati = { 1: [{ calcestruzzo: "elastica", acciaio: "elastica" }, { calcestruzzo: "fessurata", acciaio: "snervata" },
                     { calcestruzzo: "schiacciata", acciaio: "rotta" }, { calcestruzzo: "elastica", acciaio: "elastica" }, { calcestruzzo: "elastica", acciaio: "elastica" }] };
  piano.disegna(traveR, { risultati: { vista: "deformata", caso: "pushover", perCaso: { spostamenti: {} }, scala: 1, auto: true, stantia: false, stati, tipo: "pushover",
                                       badge: { passo: { k: 0, n: 1, u: 0.5, V: 1.2 } } } });
  const simboli = tutti(svg, "circle").filter((c) => c.getAttribute("class") === "stato");
  assert.equal(simboli.length, 5);
  assert.equal(simboli[0].getAttribute("fill-opacity"), "0");
  assert.equal(simboli[1].getAttribute("fill-opacity"), "0.5");
  assert.equal(simboli[2].getAttribute("fill-opacity"), "1");
  assert.ok(Number(simboli[1].getAttribute("stroke-width")) > Number(simboli[0].getAttribute("stroke-width")), "acciaio snervato: contorno spesso");
  assert.equal(tutti(svg, "line").filter((l) => l.getAttribute("class") === "stato-croce").length, 2, "rotta: una croce (due tratti)");
  assert.equal(legendaDi(contenitore).hidden, false);
  assert.ok(legendaDi(contenitore).textContent.startsWith("calcestruzzo:"));
  piano.disegna(traveR, { risultati: { vista: "deformata", caso: "Z1", perCaso: Z1R, scala: 100, auto: true, stantia: false } });
  assert.equal(tutti(contenitore._figli[0], "circle").filter((c) => c.getAttribute("class") === "stato").length, 0);
  assert.equal(legendaDi(contenitore).hidden, true);
});
test("piano: stati con un conteggio che non combacia con le stazioni di Lobatto → equispaziati, mai un errore", () => {
  const { piano, svg } = pianoFinto();
  const stati = { 1: [{ calcestruzzo: "elastica", acciaio: "elastica" }, { calcestruzzo: "elastica", acciaio: "elastica" }] };
  piano.disegna(traveR, { risultati: { vista: "deformata", caso: "pushover", perCaso: { spostamenti: {} }, scala: 1, auto: true, stantia: false, stati, tipo: "pushover", badge: { passo: { k: 0, n: 1, u: 0, V: 0 } } } });
  assert.equal(tutti(svg, "circle").filter((c) => c.getAttribute("class") === "stato").length, 2);
  piano.disegna(traveR, { risultati: { vista: "deformata", caso: "pushover", perCaso: { spostamenti: {} }, scala: 1, auto: true, stantia: false, stati: { 99: [{ calcestruzzo: "elastica", acciaio: "elastica" }] }, tipo: "pushover", badge: { passo: { k: 0, n: 1, u: 0, V: 0 } } } });
  assert.equal(tutti(svg, "circle").filter((c) => c.getAttribute("class") === "stato").length, 0, "un'asta che non c'è non ha simboli");
});
```

(`schermoDi(m, id)` e `legendaDi(contenitore)` sono due helper da scrivere nel test: il primo replica `schermo` con `estensione`, il secondo prende il quarto figlio del contenitore.)

- [ ] **Step 2: rosso.**
- [ ] **Step 3: il codice** in `piano.js`:
  1. In `creaPiano`, accanto al badge: `const legenda = document.createElement("p"); legenda.className = "risultati-legenda"; legenda.hidden = true; contenitore.replaceChildren(svg, titolo, badge, legenda);`.
  2. Nel ramo deformata di `stratoDeiRisultati`: la scala del disegno è `attivo.scala * (attivo.fattore ?? 1)` (sia `puntiDeformata` sia il punto della freccia); con `attivo.tipo === "modo"` o `"pushover"` **niente etichetta della freccia** (il badge dice già il numero: per un modo la forma è adimensionale, per un passo `u` è nel badge).
  3. Dopo le polilinee, se `attivo.stati`: per ogni asta `d` di `puntiDeformata` con `attivo.stati[String(d.id)]` lista non vuota: `const xr = stazioniDiAsta(asta, lista.length)`; per ogni stazione `k` il punto della deformata più vicino per `r` (`d.punti` portano `r`), il simbolo `simboloStato(lista[k])` (se `null` si salta): `<circle class="stato" r=3.5·s fill=colore fill-opacity=riempimento stroke=colore stroke-width=(contorno==="spesso" ? 2.5 : 1)·s>`; per `croce` due `<line class="stato-croce">` di ±4·s sulle diagonali. I cerchi entrano fra gli ostacoli (`linee`) e hanno `pointer-events: none` (ereditato dallo strato).
  4. Il badge: `testoBadge({ ...attivo, ...(attivo.badge ?? {}), ruotate: asteRuotate(m) })`; la legenda: `legenda.textContent = testoLegendaStati(); legenda.hidden = !(attivo && attivo.stati && vistaRis === "deformata")`; la legenda entra fra gli ostacoli come il badge (sotto di lui, `top: 38px`, altezza 14 px) quando non è `hidden`.
- [ ] **Step 4: verde** (tutti i test JS); **Step 5: Commit** `feat(interfaccia): il piano anima la deformata col fattore, disegna lo stato delle sezioni a due canali e la legenda`.

## Ingressi degeneri
- `fattore` assente → 1; `fattore` 0 → deformata uguale all'ombra, nessun `NaN`
- `stati` con un'asta che non è nel modello → nessun simbolo, non solleva
- `stati[asta]` più corto o più lungo delle stazioni di Lobatto → simboli equispaziati
- `simboloStato` `null` → stazione senza simbolo
- vista M/V/N con `tipo` modo o pushover → strato vuoto, badge «nessun diagramma per un modo/passo»

Riferimento: `docs/ricerca/07-ux-modellatore.md:100` (doppio canale: forma e riempimento, non colore), `:105` (data-ink).

---

### Task 3: il menu del caso, la curva nella striscia, `Spazio`, l'ispettore

**Files:**
- Modify: `static/esito.js` (`creaEsito` con `vociDelCaso`; `creaSrotolato(contenitore, {suPasso})` con la curva), `static/tastiera.js` (voce `pausa`, `[" ", "pausa"]`), `static/pannello.js` (`righeDiNodo` con `risultati.etichetta` e `righeModo`), `static/index.html` (`#risultati-vuoto`), `static/stile.css` (`.risultati-legenda`, curva)
- Test: `static/test/esito.test.js`, `static/test/tastiera.test.js`, `static/test/pannello.test.js`

**Interfaces:** consuma Task 1. Produce: `creaSrotolato(contenitore, { suPasso })`; il pannello riceve `risultati = { perCaso, caso, etichetta, modo }` (etichetta = testo fra parentesi: `Z1`, `modo 2`, `pushover, passo 37`).

- [ ] **Step 1: i test** (DOM finto di `esito.test.js`; radice con `#risultati-caso` che tiene le `<option>`):

```js
test("creaEsito: il menu porta casi, pushover e modi con i testi di vociDelCaso; il valore scelto passa a suCambio", () => { /* select con 4 opzioni, value "modo:2" → suCambio({caso: "modo:2", …}); equilibrio = testoEquilibrio del modo */ });
test("creaSrotolato con la pushover: la curva in pixel, un cerchio per passo, il corrente rosso, la caduta segnata, clic → suPasso", () => {
  // risultati: { tipo: "pushover", vista: "deformata", caso: "pushover", passo: { k: 1, n: 2, u: 1, V: 2.3 }, curva: curvaPushover(PASSI, {passo: 2, spostamento: 1, motivo: "x"}), stantia: false }
  // → titolo «pushover · taglio alla base – spostamento del nodo di controllo · kN, mm», polyline con 2 punti, 2 circle.passo (il secondo con fill rosso e r maggiore),
  //   text «u 1 mm» e «V 2,3 kN» accanto al corrente, un `text` «caduta al passo 2» ; dispatch("click") sul primo cerchio → suPasso(0)
});
test("creaSrotolato con un modo: la striscia dice che la forma modale non ha sollecitazioni", () => { /* titolo «modo 2: nessuna sollecitazione da srotolare» e nessun svg */ });
test("tastiera: Spazio è «pausa», solo con risultati nella barra", () => { assert.equal(voceDaEvento({ key: " " })?.codice, "pausa"); assert.ok(vociDellaBarra("sempre", null, { risultati: true }).some((v) => v.codice === "pausa")); });
test("pannello: il termine porta l'etichetta del caso; con un modo la riga della forma", () => { /* righe(m, {tipo:"nodo", id:1}, {risultati: {perCaso, caso: "modo:2", etichetta: "modo 2", modo: M2}}) → "forma modale (modo 2)" presente, "spostamenti (modo 2)" presente */ });
```

- [ ] **Step 2: rosso.**
- [ ] **Step 3: il codice**:
  - `esito.js` `creaEsito`: le `<option>` da `vociDelCaso(risultati)` (`value` = `valore`, `textContent` = `testo`), chiave di riscrittura = i valori uniti; `caso` corretto sul primo se non c'è; equilibrio da `testoEquilibrio(dati, caso)` (già estesa nel Task 1).
  - `creaSrotolato(contenitore, { suPasso = () => {} })`: se `risultati?.tipo === "pushover"` disegna la curva: titolo «pushover · taglio alla base – spostamento del nodo di controllo · kN, mm» (+ «stantia · »), `W = clientWidth || 200`, `H = 96`, margini 28 px a sinistra e 14 sopra/sotto; assi con gli estremi scritti («0», `uMax mm`, `vMax kN`); `<polyline>` dei punti; `<circle class="passo" r=2.5 data-k=k>` per passo, `pointer-events: all`, `click` → `suPasso(k)`; il corrente `r=4.5 fill=ROSSO`; due `<text>` accanto al corrente («u … mm», «V … kN»), a destra se `k < n/2` altrimenti a sinistra; caduta: `<line>` a croce sul punto `caduta.k` e `<text>` «caduta al passo k+1»; `aria-label` sui cerchi «passo k+1». Con `tipo === "modo"`: titolo «modo n: nessuna sollecitazione da srotolare». Altrimenti com'è.
  - `tastiera.js`: `{ codice: "pausa", tasto: "Spazio", etichetta: "ferma / riprendi", aiuto: "l'animazione del modo", contesto: "risultati" }` dopo `vista`; `[" ", "pausa"]` in `SENZA_MODIFICATORE`; `nomeTasto("Spazio")` → «spazio» (aggiungi a `PAROLE_DEI_GLIFI`).
  - `pannello.js` `righeDiNodo`: il termine usa `risultati.etichetta ?? risultati.caso`; se `risultati.modo` aggiunge `righeModo(risultati.modo, n.id)`.
  - `index.html` `#risultati-vuoto`: «Nessuna corsa da mostrare. Dopo ⌘⏎ scegli il caso, un modo o la pushover dal menu; `1` deformata, `2 3 4` M, V, N, `0` nessuna; `Spazio` ferma il modo, `← →` scorrono i passi.»
  - `stile.css`: `#piano .risultati-legenda { position: absolute; top: 38px; right: 8px; margin: 0; font: 11px var(--mono); color: var(--inchiostro); pointer-events: none; white-space: nowrap; }`; `#srotolato circle.passo { cursor: pointer; }`.
- [ ] **Step 4: verde**; **Step 5: Commit** `feat(interfaccia): il menu del caso con modi e pushover, la curva taglio–spostamento nella striscia, Spazio, la forma modale nell'ispettore`.

## Ingressi degeneri
- `vociDelCaso` vuota → select vuoto e blocco nascosto come oggi
- curva con un passo solo → un cerchio, assi con `uMax`/`vMax` di quel passo; con `uMax` 0 → nessuna divisione per zero
- clic su un cerchio quando `suPasso` non è dato → non solleva
- `risultati.tipo` sconosciuto → la striscia come oggi (M/V/N srotolato)
- `Spazio` con il fuoco su un bottone → resta al bottone (`daControllo`)

Riferimento: `docs/ricerca/07-ux-modellatore.md:99` (clic sul punto → valore), spec story 48.

---

### Task 4: la cucitura in `app.js`, l'animazione, `←`/`→`, il fumo

**Files:**
- Modify: `static/app.js`
- Modify: `tests/fumo/fumo.mjs`, `tests/test_fumo_chrome.py`

**Interfaces:** consuma tutto. `risultati = { lavoro, vista, caso, scalaMano, passo, animazione }`.

- [ ] **Step 1: `app.js`**:
  1. Stato: `risultati = { lavoro, vista: "deformata", caso: casi[0], scalaMano: null, passo: null, animazione: "va" }` in `suEsito`.
  2. `risultatiInVista(m, fattore = 1)`: `const scelto = casoScelto(risultati, risultati.caso, risultati.passo); if (!scelto) return null;` → `{ vista, caso, perCaso: scelto.perCaso, scala, auto, stantia, fattore, tipo: scelto.tipo, stati: scelto.stati ?? null, badge: …, curva: scelto.tipo === "pushover" ? curvaPushover(passi, scelto.caduta) : null, passo: scelto.tipo === "pushover" ? { k, n, u, V } : null }` con `badge = { modo: scelto.modo, passo: { k, n, u: passo.spostamento, V: passo.taglio_base / 1e3 }, caduta: curva.caduta, fermo: animazione ferma o movimento ridotto }`; la scala auto per un modo si calcola da `formaComeSpostamenti` come per un caso.
  3. `perCasoDelloStato()` → `{ perCaso: scelto.perCaso, caso, etichetta, modo: scelto.modo ?? null }` con `etichetta` = `caso` / `modo n` / `pushover, passo k+1`.
  4. `disegnaPiano(m, fattore = 1)` passa `risultatiInVista(m, fattore)` a piano e striscia; lo spazio riceve la deformata con `inVista.scala * inVista.fattore`.
  5. Animazione: `const animazione = creaAnimazione({ suFotogramma: (f) => { const m = corrente(cronologia); const inVista = disegnaPiano(m, f); spazio?.disegna(m, { selezione, deformata: … }); } });` — un `fattore` in `[−1, 1]`; in `ridisegna`, dopo il disegno: `const animare = risultati?.animazione === "va" && risultati.vista === "deformata" && risultati.caso.startsWith("modo:") && !movimentoRidotto(); if (animare) animazione.avvia(); else animazione.ferma();`. Con `movimentoRidotto()` il badge dice «· ferma (preferenza di sistema)» (passa `fermo: true` e un `motivoFermo`).
  6. `Spazio` (`voce.codice === "pausa"`): senza modo scelto → `dì("Spazio ferma l'animazione di un modo: scegline uno dal menu")`; altrimenti `risultati.animazione = animazione === "va" ? "ferma" : "va"; ridisegna()`.
  7. `←`/`→` nel keydown: `if (voce.codice === "direzione") { const girato = ruotaGhost(modo, ev.key); if (girato) { …come oggi… ; return; } if (!modo && risultati?.caso === "pushover" && (ev.key === "ArrowLeft" || ev.key === "ArrowRight")) { ev.preventDefault(); const s = casoScelto(risultati, "pushover", risultati.passo); risultati = { ...risultati, passo: Math.min(s.n - 1, Math.max(0, s.k + (ev.key === "ArrowRight" ? 1 : -1))) }; ridisegna(); } return; }`.
  8. `creaSrotolato($("srotolato"), { suPasso: (k) => { if (risultati) { risultati = { ...risultati, passo: k }; ridisegna(); } } })`.
  9. Cambio del caso dal menu (`suCambio`): `passo` torna `null` (l'ultimo), `animazione` resta.
- [ ] **Step 2: il fumo** — copioni in `fumo.mjs`:

```js
  // Modale sul MURO 1: scegli il modo 2, la deformata si muove; Spazio la ferma.
  async modale() {
    await apri(url, arg.cdp);
    await ev(`(() => { const c = document.getElementById("file-percorso"); c.value = ${JSON.stringify(arg.fixture)}; return true; })()`);
    await tasto("o", { meta: true });
    await finche(`document.querySelectorAll("#piano svg circle").length > 0`, 10000);
    await tasto("Enter", { meta: true });
    await finche(`(() => { const t = document.getElementById("corsa-ultima").textContent; return t.startsWith("corsa") ? t : ""; })()`, 120000, 500);
    await finche(`!document.getElementById("risultati-controlli").hidden`, 5000);
    const voci = await ev(`[...document.querySelectorAll("#risultati-caso option")].map((o) => o.textContent)`);
    await ev(`(() => { const s = document.getElementById("risultati-caso"); s.value = "modo:2"; s.dispatchEvent(new Event("change", { bubbles: true })); return true; })()`);
    await pausa(400);
    const punti = () => ev(`document.querySelector("#piano svg polyline.deformata")?.getAttribute("points") ?? ""`);
    const a = await punti(); await pausa(160); const b = await punti();
    const badge = await ev(`document.querySelector("#piano .risultati-badge").textContent`);
    await tasto(" ");
    await pausa(200);
    const c = await punti(); await pausa(160); const d = await punti();
    const badgeFerma = await ev(`document.querySelector("#piano .risultati-badge").textContent`);
    const messaggio = await ev(`document.getElementById("messaggio").textContent`);
    return { voci, siMuove: a !== b, ferma: c === d, badge, badgeFerma, messaggio };
  },
  // Pushover sul MURO 1: il caso «pushover», la curva, ← →, il clic sul primo passo, gli stati.
  async pushover() {
    …apri e corri come sopra (attesa fino a 180 s)…
    await ev(`… s.value = "pushover" … change …`);
    await pausa(300);
    const badge1 = await ev(`document.querySelector("#piano .risultati-badge").textContent`);
    const cerchi = await ev(`document.querySelectorAll("#srotolato circle.passo").length`);
    await tasto("ArrowLeft"); await tasto("ArrowLeft"); await tasto("ArrowRight");
    await pausa(200);
    const badge2 = await ev(`document.querySelector("#piano .risultati-badge").textContent`);
    await ev(`(() => { document.querySelector("#srotolato circle.passo").dispatchEvent(new MouseEvent("click", { bubbles: true })); return true; })()`);
    await pausa(200);
    const badge3 = await ev(`document.querySelector("#piano .risultati-badge").textContent`);
    const stati = await ev(`document.querySelectorAll("#piano svg circle.stato").length`);
    const legenda = await ev(`document.querySelector("#piano .risultati-legenda").hidden`);
    const sovrapposte = await ev(SOVRAPPOSTE);
    const messaggio = await ev(`document.getElementById("messaggio").textContent`);
    return { badge1, badge2, badge3, cerchi, stati, legenda, sovrapposte, messaggio };
  },
```

Test in `test_fumo_chrome.py` (con `binario_opensees`): `test_muro_1_il_modo_2_si_anima_e_spazio_lo_ferma` (voci contengono «modo 2 · 31,85 Hz · ux 92 %» — controlla il numero esatto della massa dal run: se differisce, assert su `startsWith("modo 2 · 31,85 Hz")`; `siMuove` true; `ferma` true; `badge` comincia per «modo 2 · 31,85 Hz»; `badgeFerma` finisce per «· ferma»; messaggio vuoto) e `test_muro_1_la_pushover_si_scorre_con_le_frecce_e_il_clic` (`badge1` contiene «passo 120/120»; `cerchi == 120`; `badge2` contiene «passo 119/120»; `badge3` contiene «passo 1/120»; `stati > 0`; `legenda` false; nessuna sovrapposizione; messaggio vuoto). Fixture: `docs/caso-studio/muro_1.nova.json` e `muro_1_pushover.nova.json`.

- [ ] **Step 3: tutti i test** (JS, pytest intero, fumo 18). **Step 4: Commit** `feat(interfaccia): modi animati e pushover nel piano — menu del caso, Spazio, ← → sui passi, fumo sul MURO 1`.

## Ingressi degeneri
- `suEsito` con risultati senza `modi` né `passi` → tutto come nella 13
- `Spazio` senza un modo scelto → messaggio, niente si rompe; con `prefers-reduced-motion` → il badge dice «ferma (preferenza di sistema)» e `Spazio` non anima
- `←`/`→` con un ghost aperto → girano il ghost come oggi; senza pushover → restano al browser
- cambio del caso mentre l'animazione gira → si ferma se il caso nuovo non è un modo, senza fotogrammi orfani
- «apri»/«importa» → `animazione.ferma()` insieme all'azzeramento
- corsa nuova durante l'animazione → `suEsito` rimette lo stato e riparte dalla deformata del primo caso (ferma)

Riferimento: `docs/ricerca/07-ux-modellatore.md:103`, `:99`.

---

### Task 5: prova a mano su Chrome vero, review di ramo, Esito (controller)

MURO 1 modale: menu, modo 1/2/3 animati, `Spazio`, `0`-`4` con un modo (badge «nessun diagramma»), ispettore del nodo (forma modale), zoom 200 %. MURO 1 pushover: curva, clic sui passi, `←`/`→`, stati delle sezioni ai passi 1, 60, 120, legenda, stantia con un rinomina, 3D che segue. Telaio 2×1 statico: niente è cambiato. Review di ramo a cinque; fix; «Esito» in coda al piano; PR (merge domani).

## Mutanti da provare a fine ramo (con controllo nullo)
- `fase` che rende `Math.cos` → cade «fase(0) = 0»; `creaAnimazione` senza la guardia `attiva` nel fotogramma → cade «ferma con fotogramma in volo».
- `casoScelto` che non stringe il passo → cade «99 → ultimo»; `formaComeSpostamenti` senza gli zeri di rotazione → cade il test del piano (`u.length >= 6`).
- `stazioniDiAsta` senza il salto della prima stazione interna → cade «9 con due».
- `piano.js` che moltiplica anche il badge per il fattore → cade «×100 (auto)».
- `simboloStato` con il riempimento della fessurata a 1 → cade il test del piano.
- `app.js`: `Spazio` che non ferma, `←` che cambia il passo con un ghost aperto → li vede solo il fumo (dichiarare).
