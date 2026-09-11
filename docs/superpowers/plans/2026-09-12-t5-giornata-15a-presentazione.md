# NOVA T5 — giornata 15a: modo presentazione e spostamenti in viridis

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** col tasto `P` l'interfaccia entra nel **modo presentazione** (story 62): albero, barra dei tasti e cronologia spariscono, piano e spazio prendono tutta la larghezza (≈ 60/40), sotto le viste resta una **striscia compatta** con i controlli dei risultati (caso, vista, scala, equilibrio) a ≥ 32 px; nel viewport etichette ≥ 46 px, aste ≥ 6 px, nodi ≥ 14 px, contrasto ≥ 3:1; `P` o `Esc` escono, un bottone «pannelli» li riapre senza uscire. La **deformata** si colora con lo **spostamento in viridis** (story 63, decisione P4b) — nel piano e nel 3D, sopra un bordo in inchiostro, con la legenda «|u| 0 mm ▮▮▮ 12,3 mm» sotto il badge. Il bianco e nero e le misure della presentazione si provano nel fumo. Verifica: MURO 1 a 1920 px in presentazione, misure sopra le soglie, zero sovrapposizioni, pagina in scala di grigi con i doppi canali intatti.

**Architecture:** nessun cambio nel server. Le **misure** del disegno escono da variabili CSS (`--nodo-raggio`, `--asta-tratto`, `--etichetta`, …) dichiarate in `:root` e ridefinite sotto `body[data-presentazione]`; un modulo puro `static/misure.js` le legge da `getComputedStyle` con i valori d'oggi come ripiego, e `piano.js`/`spazio.js` le usano al posto dei numeri scritti a mano (`piano.js:19`, `:340`, `:194-195`, `:408`, `:419`; `spazio.js:83-84`). Il layout della presentazione è **solo CSS** sulla griglia di `body` (`stile.css:20-38`): `#pannello` passa all'area «striscia» sotto le viste e mostra la sola sezione `#risultati` — nessun nodo DOM spostato né duplicato (`esito.js` lega gli elementi per id alla creazione: spostarli regge, duplicarli no). `app.js` alterna l'attributo e **ridisegna** (cambiare la griglia non scatena `resize`). Il modulo dello spostamento si calcola dove la deformata già si interpola: `puntiDeformata` aggiunge `u` = |u| in mm **senza scala** a ogni punto (`risultati.js:224-233`, i termini ci sono già); `viridis(t)` e le pure della legenda stanno in `risultati.js`. Nel piano la deformata diventa un bordo `<polyline>` in inchiostro più `<line>` colorate per tratto (SVG non ha gradienti lungo il percorso); stantia resta rossa tratteggiata e senza colori. Nel 3D le linee di WebGL non si ispessiscono (`spazio.js:152-155`, three.js r185 senza addons): aste e deformata diventano **cilindri** di raggio unitario scalati in `rendi()` sui pixel per unità di mondo, colorati per tratto.

**Tech Stack:** moduli ES nativi, `node --test` col DOM finto di `piano.test.js`, three.js r185 vendorizzato (`CylinderGeometry`, `MeshBasicMaterial`), pytest + Chrome headless via CDP (`tests/fumo/`, `Emulation.setDeviceMetricsOverride`, `Page.captureScreenshot`).

**Spec:** `docs/superpowers/specs/2026-09-05-nova-v1-design.md` — story 62 (riga 115: `P`, pannelli ritratti, barra e cronologia nascoste, viewport con scala stampata e striscia compatta, etichette ≥ 46 px, testo ≥ 32 px, aste ≥ 6 px, nodi ≥ 14 px, contrasto ≥ 3:1), 63 (riga 116: un solo rosso, diagrammi in inchiostro tratteggiato, **scalari in viridis con legenda**, tutto leggibile in B/N), 64 (riga 117: unità in un punto e su ogni numero). `PRODUCT.md:96-101` (aula: 2 m, 8 m, 1920 px → 45 px; «un layout a sé, non lo zoom del browser»), `:186-196` (convenzioni grafiche), `:255-261` (WCAG AA, il fallimento non viaggia sul solo colore). Calendario: `docs/superpowers/plans/2026-09-06-t5-interfaccia-bozza.md:22` (giornata 15; critique/polish/audit sono la **15b**).

**Ricerca che questo piano applica** (`docs/ricerca/index.md:19`, ricerca 07): `07-ux-modellatore.md:133` (proiezione in aula: ISO 9241-303 20-22 arcmin, proav 4 mm/m → 45 px a 8 m su 2 m e 1920 px), `:157` (principio 10: modo presentazione, pannelli ritratti, linee e nodi più spessi, contrasto ≥ 3:1), `:92` (pannello che si ritrae, Figma «Minimize UI»: il lavoro al centro), `:154` (principio 7: colormap percettiva, viridis, mai rainbow, stampabile in B/N), `:100` (doppio canale: colore **e** forma/parola, WCAG 1.4.11 ≥ 3:1 sulla grafica).

**Decisioni dell'autore (12/09, P1-P8):** P1a striscia compatta (albero e pannello ritratti, un bordo li riapre, barra e storia nascoste, `P`/`Esc` escono); P2a piano e spazio affiancati a tutta larghezza (≈ 60/40); P3a misure da variabili CSS lette da `piano.js`/`spazio.js`; **P4b spostamenti in viridis sulla deformata, con legenda**; P5a critique/polish/audit su tutta la pagina (→ 15b); P6a bianco e nero provato nel fumo con `grayscale` più uno screenshot; P7a nessun debito di codice nella 15; P8a verifica con lo zoom al 25 % più le misure del fumo.

**Ruling del controller prima del piano** (ledger `NOVA-wt/interfaccia/.superpowers/sdd/2026-09-12-t5-giornata-15-presentazione/progress.md`):
- **15a / 15b**: la critique del modo presentazione vuole il modo presentazione; la 15a lo costruisce, la 15b (P5a) critica, lucida e fa l'audit su tutta la pagina — due PR, come 14a/14b.
- **Viridis sopra un bordo in inchiostro**: il contrasto delle tappe di viridis su `#dcdad5` scende sotto 3:1 da t ≈ 0,56 (misurato: 10,91 → 1,11); il bordo tiene la forma a 13:1 sul fondo, il colore porta il valore, la luminanza monotona di viridis regge il B/N.
- **Il colore segue |u| vero, non il fattore dell'animazione**: la legenda resta ferma mentre il modo respira. Per la pushover |u|max si fissa sul passo di riferimento della corsa (come la scala, `app.js:83-89`): scorrere i passi non ricolora la legenda.
- **Stantia: rossa tratteggiata senza colori**, come oggi: numeri vecchi colorati come nuovi sarebbero la bugia peggiore; la legenda sparisce.
- **Un solo bottone «pannelli»** al posto di due bordi: riapre albero e pannello a caratteri da presentazione senza uscire.
- **Il 3D non ha legenda propria**: è la stessa scala del piano, affiancato.
- **L'Hermite dei modi a S** (`risultati.js:224` con rotazioni nulle da `formaComeSpostamenti`, `:531-536`) è un difetto della 14a: issue a parte, fuori dalla 15a (P7a).

**Ramo:** `feat/interfaccia-15-presentazione` da `main` `f277425`, worktree `/Users/mario/GitHub/NOVA-wt/interfaccia-15` (venv pronto, `nova ok 3.12.13`). PR verso `main`; merge solo con via libera dell'autore.

## Global Constraints

- **Lingua italiana** in interfaccia, commenti, commit; identificatori invariati.
- **Sotto `nova/` non cambia niente.**
- **Il modo presentazione è un layout, non uno zoom** (`PRODUCT.md:101`): nessun `zoom`, `transform: scale` o `font-size` sul `html`; solo la griglia di `body` e le variabili delle misure sotto `body[data-presentazione]`.
- **Le misure del disegno stanno in un posto**: le variabili CSS di `stile.css`; `piano.js` e `spazio.js` le leggono con `leggiMisure(getComputedStyle(contenitore))` a ogni `disegna`. I valori di ripiego di `misure.js` sono quelli d'oggi (raggio 5, tratto 2, scelta 3, deformata 2, carattere 11, ombra 0,3): fuori dalla presentazione il disegno non cambia di un pixel.
- **Soglie della presentazione** (story 62), sulle misure **rese** e non sugli attributi: etichette del viewport ≥ 46 px di corpo, testo della striscia ≥ 32 px, aste ≥ 6 px di tratto, nodi ≥ 14 px di diametro, contrasto ≥ 3:1 per ogni grafica sul fondo (ombra indeformata compresa).
- **Un solo rosso** `#b8321e` (attenzione: selezione, fallito, stantia). Viridis è una scala di **valori**, mai un giudizio: nessun colore di viridis su selezione, verdetti o classi.
- **Viridis**: le dieci tappe di matplotlib (`#440154 … #fde725`), interpolate in RGB; sempre sopra un bordo in inchiostro; legenda con estremi e unità («0 mm» … «12,3 mm»; per un modo «0» … «1 · forma normalizzata»).
- **`P` e `Esc`**: `P` alterna la presentazione (contesto `salvo-ghost`; in un campo di testo resta al campo, `daControllo`); `Esc` chiude prima il gesto aperto (ghost, campo di comando), e **solo senza gesti aperti** esce dalla presentazione.
- **Dopo ogni cambio di layout si ridisegna**: `ridisegna()` subito dopo aver scritto l'attributo — piano e spazio misurano il proprio riquadro.
- **Stato in `app.js`**, fuori da modello e cronologia; «apri»/«importa» non escono dalla presentazione.
- Nessun bundler, nessuna rete a tempo d'uso; WCAG AA; `kbd` con `aria-label` in parole (`nomeTasto`).
- Comando dei test JS: `cd /Users/mario/GitHub/NOVA-wt/interfaccia-15/static && node --test --test-reporter=tap test/*.test.js` (senza `tap` il riepilogo su più file non si stampa) — punto di partenza **848 pass, 0 fail**, misurato a `f277425`. Pytest: `cd /Users/mario/GitHub/NOVA-wt/interfaccia-15 && .venv/bin/python -P -m pytest tests -p no:cacheprovider --color=no --tb=short -rs` — **exit 0**, 745 passed + 3 skipped a `main`; fumo: **20** test raccolti in `tests/test_fumo_chrome.py`.
- Server per la prova: `cd /Users/mario/GitHub/NOVA-wt/interfaccia-15 && .venv/bin/python -P -m nova --porta 8824`. **Mai la 8765, né 8766-8767, né 8817-8823.**
- Mai `git checkout --` per revertire un mutante; un comando per chiamata Bash, percorsi assoluti, `git -C`; commit per percorso, mai `-a`.

## Quel che c'è già, e non va reinventato

- `static/stile.css:3-16` le variabili di `:root`; `:20-38` la griglia di `body` (colonne `minmax(180px, 15rem) 1fr minmax(220px, 20rem)`, righe `1fr auto auto auto`, aree `albero viste pannello / messaggio / comando / barra`, `overflow: hidden`); `:48-52` `#viste` (griglia `1fr 1fr` × `1fr auto`, `#spazio` in colonna 2 su tutte le righe); `:53` `#pannello`; `:54-55` `#barra`; `:57` `#piano, #spazio`; `:66-72` `#srotolato` (niente padding orizzontale: `clientWidth` misura la striscia); `:82-112` titolo, badge e legenda sopra il piano (numeri ricopiati in `piano.js`).
- `static/piano.js:19` `RAGGIO = 5`; `:23` `OFFSET_ETICHETTA = 16`; `:26` `LARGHEZZA_NOMINALE/ALTEZZA_NOMINALE`; `:40-44` colori a mano (le presentation attribute dell'SVG non risolvono `var(--…)`); `:51` `larghezzaMono` (6,6 px per carattere a 11 px); `:155-160` `millimetriPerPixel` (dal `clientWidth/clientHeight` di `#piano`); `:167-197` `stratoDeiRisultati` ramo deformata (`scalaDisegno = scala · fattore`, una `<polyline class="deformata">` per asta, tratteggio `6s 4s`, `stroke-width 2s`, `spezzata` per gli ostacoli); `:332-345` aste (`stroke-width (scelta ? 3 : 2)·s`, ombra `stroke-opacity 0.3`); `:400-432` nodi (`r (scelto ? RAGGIO·1,6 : RAGGIO)·s`, etichette `font-size 11·s`, box `larghezzaMono + 2` × 11 + 3); `:440-491` badge, legenda, titolo e i loro ostacoli (`top` 22 del badge, legenda sotto il badge misurato, titolo alto 20).
- `static/spazio.js:74-84` scena, colori, materiali (`LineBasicMaterial`, `PointsMaterial size 6/10, sizeAttenuation:false`); `:98-107` `ridimensiona`; `:109-122` `rendi` (orbita sferica, asse polare z); `:138` `resize` di finestra; `:140-185` `disegna(m, {selezione, deformata})` (butta le geometrie, aste come `Line`, deformata come `Line` rossa se stantia, nodi come `Points`, `ridimensiona()` e `rendi()` a ogni chiamata).
- `static/risultati.js:199-239` `puntiDeformata` (Hermite per tratto, 8 campioni, punto `{x, y, z, r}` già scalato); `:87-119` `frecciaMassima` (solo x–z); `:127-130` `scalaAuto`; `:345-397` `testoBadge`; `:639-640` `testoLegendaStati`.
- `static/app.js:83-89` `scalaDellaPushover` con cache per corsa; `:741` `fattoreCorrente`; `:747-749` `deformataInVista` (il 3D con lo stesso fattore); `:756-766` `disegnaPiano`; `:768-827` `ridisegna`; `:835-840` `resize` (solo il piano, una volta per frame); `:864-899` `keydown` (`daControllo` → `voceDaEvento` → frecce → `preventDefault` → `eseguiVoce`); `:919-921` `dispatchVoce` e il ramo `annulla` (chiude modo, campo e messaggio, sempre).
- `static/tastiera.js:14-57` `TASTI` (`codice`, `tasto`, `etichetta`, `aiuto`, `contesto`); `:71-88` `SENZA_MODIFICATORE`; `:98` `ATTIVANO`; `:126-139` `daControllo`; `:163-170` `nomeTasto`; `:172-193` `vociDellaBarra`. **`p` è libero**: `static/test/tastiera.test.js:56` asserisce «`p` nudo → null» e va aggiornato (il `⌘P` di `:86` resta `null`).
- `static/esito.js:30-60` `creaEsito` (elementi per id sulla radice, radio con `querySelectorAll('input[name="vista"]')`, listener agganciati una volta); `:162-259` la striscia (`W = clientWidth`, `H = 96`).
- `tests/fumo/cdp.mjs:7` `apri(url, cdp, {larghezza, altezza, dpr})`; `:29` `cmd`; `:37-38` `viewport(w, h, dpr)` (`Emulation.setDeviceMetricsOverride`); `:41` `ev`; `:51` `tasto(k, mods)`; `:73` `finche`; `tests/fumo/fumo.mjs:10-18` `SOVRAPPOSTE`, `:27-37` `apriECorri`, `:47-51` `staDentro`; `tests/test_fumo_chrome.py:96` Chrome a `--window-size=1280,800`, `:135-139` `copione` (tetto 120 s).
- Fixture: `tests/fixture/muro_1.nova.json` (4 nodi, 4 aste; statica C1-C3 + modale «auto», 42 modi); `tests/fixture/muro_1_pushover.nova.json` (120 passi); `tests/fixture/trave_appoggiata.nova.json`.

## Contratto dei moduli (le firme che i task condividono)

```js
// static/misure.js — nuovo, puro
export const MISURE_BASE = Object.freeze({ raggioNodo: 5, trattoAsta: 2, trattoScelta: 3, trattoDeformata: 2,
                                           bordoDeformata: 2, carattere: 11, ombra: 0.3 });
export const VARIABILI = Object.freeze({ raggioNodo: "--nodo-raggio", trattoAsta: "--asta-tratto",
                                         trattoScelta: "--asta-tratto-scelta", trattoDeformata: "--deformata-tratto",
                                         bordoDeformata: "--deformata-bordo", carattere: "--etichetta", ombra: "--ombra-opacita" });
export function leggiMisure(stile)      // { …MISURE_BASE } con ogni variabile finita e > 0 al posto del ripiego; stile null → MISURE_BASE
export const avanzamentoMono = (carattere) => 0.6 * carattere;   // px per carattere del mono (6,6 a 11 px)

// static/risultati.js — aggiunte, pure
export const VIRIDIS = [/* dieci tappe #440154 … #fde725 */];
export function viridis(t)              // "#rrggbb"; t fuori da [0, 1] stretto; NaN → tappa 0
export function massimoSpostamento(deformate)   // max di p.u sui punti di puntiDeformata; nessun punto → 0
export const coloreSpostamento = (u, uMax) => viridis(uMax > 0 ? u / uMax : 0);
export function testoScalaColori({ uMax, tipo })  // { min, max, titolo }: «0 mm» / «12,3 mm» / «|u|»; tipo "modo" → «0» / «1» / «|u| · forma normalizzata»
// puntiDeformata: ogni punto diventa { x, y, z, r, u } con u = |u| in mm SENZA scala (hypot di assiale, trasversale e y interpolati)

// static/piano.js
disegna(m, { …, risultati })   // risultati.uMax facoltativo (app.js lo passa); assente → massimoSpostamento delle deformate disegnate
// deformata non stantia: <polyline class="deformata-bordo"> inchiostro, poi <line class="deformata" stroke=viridis> per tratto
// deformata stantia: <polyline class="deformata"> rossa tratteggiata, come oggi; niente legenda dei colori
// legenda dei colori: <div class="risultati-colori"> sopra il piano, sotto la legenda degli stati (o il badge), misurata e ostacolo

// static/spazio.js
export function pixelInMondo(distanza, fovGradi, altezzaPx)   // 2·distanza·tan(fov/2) / altezzaPx; altezza ≤ 0 → 0
export function tratti(punti, uMax)     // [{ a: {x,y,z}, b: {x,y,z}, colore }] con colore = coloreSpostamento((a.u + b.u)/2, uMax)
disegna(m, { selezione, deformata })   // deformata = { aste, stantia, uMax }

// static/app.js
// presentazione: document.body.dataset.presentazione ("si" | assente); pannelli: document.body.dataset.pannelli ("aperti" | assente)
// risultatiInVista(m, fattore) aggiunge uMax (per la pushover fisso sul passo di riferimento, in cache con la scala)
```

---

### Task 1: le pure — `misure.js`, viridis e |u| in `risultati.js`, la voce `P`

**Files:**
- Create: `static/misure.js`, `static/test/misure.test.js`
- Modify: `static/risultati.js` (`puntiDeformata` `:233`; in coda: `VIRIDIS`, `viridis`, `massimoSpostamento`, `coloreSpostamento`, `testoScalaColori`), `static/test/risultati.test.js` (in coda)
- Modify: `static/tastiera.js` (`TASTI`, `SENZA_MODIFICATORE`), `static/test/tastiera.test.js` (`:56` e un test nuovo)

**Interfaces:** vedi «Contratto dei moduli». Nessuna dipendenza da altri task.

- [ ] **Step 1: i test**

`static/test/misure.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { MISURE_BASE, leggiMisure, avanzamentoMono } from "../misure.js";

const stile = (valori) => ({ getPropertyValue: (nome) => valori[nome] ?? "" });

test("leggiMisure: senza variabili le misure d'oggi — fuori dalla presentazione niente cambia", () => {
  assert.deepEqual(leggiMisure(stile({})), MISURE_BASE);
  assert.deepEqual(leggiMisure(null), MISURE_BASE);
  assert.deepEqual(MISURE_BASE, { raggioNodo: 5, trattoAsta: 2, trattoScelta: 3, trattoDeformata: 2, bordoDeformata: 2, carattere: 11, ombra: 0.3 });
});

test("leggiMisure: le variabili della presentazione, con le unità e gli spazi del CSS", () => {
  const m = leggiMisure(stile({ "--nodo-raggio": " 7px", "--asta-tratto": "6px", "--etichetta": "46px", "--ombra-opacita": "0.55" }));
  assert.equal(m.raggioNodo, 7);
  assert.equal(m.trattoAsta, 6);
  assert.equal(m.carattere, 46);
  assert.equal(m.ombra, 0.55);
  assert.equal(m.trattoScelta, 3, "una variabile assente resta al ripiego");
});

test("leggiMisure: un valore non finito, zero o negativo non entra", () => {
  const m = leggiMisure(stile({ "--nodo-raggio": "auto", "--asta-tratto": "0px", "--etichetta": "-4px" }));
  assert.equal(m.raggioNodo, 5);
  assert.equal(m.trattoAsta, 2);
  assert.equal(m.carattere, 11);
});

test("avanzamentoMono: 0,6 em — i 6,6 px a 11 px d'oggi, 27,6 a 46", () => {
  assert.equal(avanzamentoMono(11), 6.6);
  assert.ok(Math.abs(avanzamentoMono(46) - 27.6) < 1e-9);
});
```

In coda a `static/test/risultati.test.js` (importa anche `VIRIDIS, viridis, massimoSpostamento, coloreSpostamento, testoScalaColori`):

```js
test("viridis: gli estremi sono le tappe, il mezzo interpolato, fuori scala stretto", () => {
  assert.equal(VIRIDIS.length, 10);
  assert.equal(viridis(0), "#440154");
  assert.equal(viridis(1), "#fde725");
  assert.equal(viridis(-3), "#440154");
  assert.equal(viridis(7), "#fde725");
  assert.equal(viridis(NaN), "#440154");
  assert.equal(viridis(1 / 9), "#482878", "una tappa intera cade esatta");
  assert.match(viridis(0.5), /^#[0-9a-f]{6}$/);
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

test("testoScalaColori: estremi con l'unità; per un modo la forma normalizzata, senza mm", () => {
  assert.deepEqual(testoScalaColori({ uMax: 12.34, tipo: "caso" }), { min: "0 mm", max: "12,34 mm", titolo: "|u|" });
  assert.deepEqual(testoScalaColori({ uMax: 0.8, tipo: "modo" }), { min: "0", max: "1", titolo: "|u| · forma normalizzata" });
  assert.deepEqual(testoScalaColori({ uMax: 0, tipo: "pushover" }), { min: "0 mm", max: "0 mm", titolo: "|u|" });
});
```

In `static/test/tastiera.test.js`, `:56`: il tasto non mappato diventa `"w"`; e un test nuovo:

```js
test("P alterna la presentazione, nudo; ⌘P resta al browser (stampa)", () => {
  assert.equal(voceDaEvento({ key: "p", metaKey: false, ctrlKey: false, altKey: false }).codice, "presentazione");
  assert.equal(voceDaEvento({ key: "P", metaKey: false, ctrlKey: false, altKey: false }).codice, "presentazione");
  assert.equal(voceDaEvento({ key: "p", metaKey: true, ctrlKey: false, altKey: false }), null);
  assert.ok(vociDellaBarra("sempre").some((v) => v.codice === "presentazione"));
  assert.ok(!vociDellaBarra("ghost").some((v) => v.codice === "presentazione"), "col ghost aperto la barra non la promette");
});
```

- [ ] **Step 2: rosso** (`Cannot find module '../misure.js'`, `viridis is not a function`, `p` → null).
- [ ] **Step 3: il codice**

`static/misure.js`:

```js
// Le misure del disegno — raggio dei nodi, tratti, corpo delle etichette, opacità dell'ombra —
// dichiarate in un posto solo: le variabili CSS di `stile.css`, che `body[data-presentazione]`
// ridefinisce per l'aula (story 62, `PRODUCT.md:96-101`). Il piano e lo spazio le leggono a ogni
// disegno; i ripieghi sono i numeri che stavano scritti a mano in `piano.js` e `spazio.js`, così
// fuori dalla presentazione il disegno resta identico al pixel.
export const MISURE_BASE = Object.freeze({ raggioNodo: 5, trattoAsta: 2, trattoScelta: 3, trattoDeformata: 2,
                                           bordoDeformata: 2, carattere: 11, ombra: 0.3 });
export const VARIABILI = Object.freeze({ raggioNodo: "--nodo-raggio", trattoAsta: "--asta-tratto",
                                         trattoScelta: "--asta-tratto-scelta", trattoDeformata: "--deformata-tratto",
                                         bordoDeformata: "--deformata-bordo", carattere: "--etichetta", ombra: "--ombra-opacita" });

export function leggiMisure(stile) {
  const misure = { ...MISURE_BASE };
  for (const [chiave, nome] of Object.entries(VARIABILI)) {
    const n = parseFloat(stile?.getPropertyValue?.(nome));
    if (Number.isFinite(n) && n > 0) misure[chiave] = n;
  }
  return misure;
}

// ponytail: 0,6 em è l'avanzamento dei mono di sistema (SF Mono, Menlo); una stima, non una misura —
// `getComputedTextLength` vorrebbe disegnare, misurare e ridisegnare a ogni giro.
export const avanzamentoMono = (carattere) => 0.6 * carattere;
```

`static/risultati.js`, in `puntiDeformata` al posto di `punti.push({ x, y, z, r });` (`:233`):

```js
        // |u| **senza scala**: la scala e il fattore dell'animazione spostano il disegno, non il
        // valore — la legenda dei colori resta ferma mentre il modo respira (15a).
        const uy = (1 - s) * q0.u[1] + s * q1.u[1];
        punti.push({ x, y, z, r, u: Math.hypot(u, w, uy) });
```

(e la riga `const y = …` usa `scala * uy` al posto dell'espressione ripetuta). In coda a `risultati.js`:

```js
/** Viridis (matplotlib, van der Walt e Smith): percettiva, monotona in luminanza — si legge anche in
 *  bianco e nero (story 63, `docs/ricerca/07-ux-modellatore.md:154`). Dieci tappe, interpolate in RGB. */
export const VIRIDIS = ["#440154", "#482878", "#3e4989", "#31688e", "#26828e",
                        "#1f9e89", "#35b779", "#6ece58", "#b5de2b", "#fde725"];

export function viridis(t) {
  const x = Number.isFinite(t) ? Math.min(1, Math.max(0, t)) : 0;
  const pos = x * (VIRIDIS.length - 1);
  const i = Math.min(VIRIDIS.length - 2, Math.floor(pos)), f = pos - i;
  const a = parseInt(VIRIDIS[i].slice(1), 16), b = parseInt(VIRIDIS[i + 1].slice(1), 16);
  const canale = (sh) => Math.round(((a >> sh) & 255) * (1 - f) + ((b >> sh) & 255) * f);
  return `#${[16, 8, 0].map((sh) => canale(sh).toString(16).padStart(2, "0")).join("")}`;
}

export function massimoSpostamento(deformate) {
  let max = 0;
  for (const d of deformate ?? []) for (const p of d?.punti ?? []) if (Number.isFinite(p?.u) && p.u > max) max = p.u;
  return max;
}

export const coloreSpostamento = (u, uMax) => viridis(uMax > 0 ? u / uMax : 0);

export function testoScalaColori({ uMax, tipo }) {
  if (tipo === "modo") return { min: "0", max: "1", titolo: "|u| · forma normalizzata" };
  return { min: "0 mm", max: `${conciso(Number.isFinite(uMax) ? uMax : 0)} mm`, titolo: "|u|" };
}
```

(`conciso` è già importato da `numeri.js` in `risultati.js`; se non lo è, importarlo.) Per un modo `max` è «1» anche se |u|max vale 0,8: la forma è normalizzata, e un «0,8» senza unità si leggerebbe come una misura.

`static/tastiera.js`: in `TASTI`, dopo `palette`:

```js
  // La 15a: lo schermo per l'aula (story 62). Contesto `salvo-ghost`: dietro un'estrusione aperta
  // `P` è una lettera del gesto, non un cambio di layout.
  { codice: "presentazione", tasto: "P", etichetta: "presentazione", aiuto: "lo schermo per l'aula; P o Esc per uscire", contesto: "salvo-ghost" },
```

e in `SENZA_MODIFICATORE` la coppia `["p", "presentazione"]`.

- [ ] **Step 4: verde** (tutti i test JS).
- [ ] **Step 5: Commit** `feat(interfaccia): misure.js, viridis e |u| per punto della deformata, il tasto P`.

## Ingressi degeneri

- `leggiMisure(null)` / uno stile senza `getPropertyValue` → `MISURE_BASE`, non solleva.
- una variabile «auto», «0px», «-4px», stringa vuota → resta il ripiego.
- `viridis(NaN)`, `viridis(-3)`, `viridis(7)` → tappa 0 / tappa 0 / tappa 9, sempre `#rrggbb`.
- `puntiDeformata` con un nodo senza spostamenti → `u = 0` su quel lato, non `NaN`.
- `massimoSpostamento(null)`, `[]`, punti con `u` assente o `NaN` → 0.
- `coloreSpostamento(u, 0)` → la tappa bassa (niente divisione per zero).
- `testoScalaColori({ uMax: undefined, tipo: "caso" })` → «0 mm».

---

### Task 2: il piano — misure dalle variabili, deformata in viridis, legenda dei colori

**Files:**
- Modify: `static/piano.js` (misure al posto dei numeri; ramo deformata `:186-197`; badge, legenda e titolo `:440-491`; nuova `div.risultati-colori` accanto a badge e legenda in `creaPiano`)
- Modify: `static/stile.css` (solo le regole di `.risultati-colori` accanto a `.risultati-legenda` `:98-105`)
- Test: `static/test/piano.test.js`

**Interfaces:** consuma `leggiMisure`, `avanzamentoMono` (misure.js), `massimoSpostamento`, `coloreSpostamento`, `testoScalaColori`, `VIRIDIS` (risultati.js). `risultati.uMax` e `risultati.tipo` arrivano da `app.js` (Task 4); senza `uMax` il piano lo calcola dalle deformate che disegna.

- [ ] **Step 1: i test** (DOM finto già in `piano.test.js:117-156`; aggiungere al `contenitoreFinto` un facoltativo `stile` che `getComputedStyle` del `globalThis` finto restituisce):
  1. **Senza variabili il disegno è quello d'oggi**: nodo `r = 5·s`, asta `stroke-width = 2·s`, scelta `3·s`, etichetta `font-size = 11·s` — le asserzioni esistenti restano verdi senza toccarle.
  2. **Con le variabili della presentazione** (`--nodo-raggio 7px`, `--asta-tratto 6px`, `--asta-tratto-scelta 9px`, `--etichetta 46px`, `--ombra-opacita 0.55`): `r = 7·s` (scelto `7·1,6·s`), `stroke-width = 6·s` (scelta `9·s`), `font-size = 46·s`, ombra `stroke-opacity = 0.55`; il box dell'etichetta di un nodo è largo `(n·27,6 + 2)·s` e alto `46·s`.
  3. **Deformata non stantia**: una `polyline.deformata-bordo` per asta in inchiostro con `stroke-width = (2 + 2·2)·s` e tanti `line.deformata` quanti tratti (`punti − 1`), ognuno con `stroke` = `coloreSpostamento` della media dei due estremi; su una trave con un estremo fermo il primo tratto è più scuro dell'ultimo (luminanza); `polyline.deformata` **non** c'è. `ultimoPunto` di `:1024` legge ora la `polyline.deformata-bordo` (stessi punti).
  4. **Deformata stantia**: una `polyline.deformata` rossa tratteggiata come oggi, nessuna `line.deformata`, `div.risultati-colori` nascosta.
  5. **Legenda dei colori**: in vista deformata non stantia `div.risultati-colori` visibile con il titolo «|u»», gli estremi «0 mm» e «… mm» da `testoScalaColori({ uMax, tipo })`, e un `<svg>` con un `linearGradient` di dieci `stop` uguali a `VIRIDIS`; con `risultati.uMax = 12.34` il massimo è «12,34 mm» anche se le deformate disegnate arrivano a 6 (la pushover la fissa sul passo di riferimento); per un modo «0» / «1 · forma normalizzata»; in vista M nascosta.
  6. **Il fattore dell'animazione non ricolora**: due `disegna` con `fattore 1` e `0,3` danno gli stessi `stroke` sui `line.deformata`.
  7. **Ostacoli sopra il piano con caratteri grandi**: con `--etichetta 46px` il badge sta a `top` = 6 + altezza del titolo misurata (ripiego `carattere + 9` nel DOM finto), la legenda degli stati sotto il badge, la legenda dei colori sotto la legenda degli stati (o sotto il badge se questa è nascosta); ognuna è un ostacolo della sua altezza misurata.

- [ ] **Step 2: rosso.**
- [ ] **Step 3: il codice** in `piano.js`:
  - in `disegna`, prima di tutto: `const misure = leggiMisure(globalThis.getComputedStyle?.(contenitore));` e al posto di `RAGGIO`, `2`/`3` delle aste, `2` e `6s 4s` della deformata, `11` delle etichette, `0.3` dell'ombra i campi di `misure`; `larghezzaMono(testo, s, extra)` diventa `(testo.length * avanzamentoMono(misure.carattere) + extra) * s` e le altezze dei box `11·s`/`14·s` diventano `misure.carattere·s` / `(misure.carattere + 3)·s`. `OFFSET_ETICHETTA` scala col carattere: `max(16, misure.raggioNodo + misure.carattere·0,6)`. I simboli di vincoli e carichi restano come sono (non sono nelle soglie della story).
  - ramo deformata (`:186-197`):

```js
      const deformate = puntiDeformata(m, attivo.perCaso, scalaDisegno);
      // |u|max della legenda: quello che `app.js` passa (fisso per la corsa della pushover) o quello
      // che si vede. Stantia non si colora: numeri vecchi in viridis si leggerebbero come nuovi.
      const uMax = Number.isFinite(attivo.uMax) ? attivo.uMax : massimoSpostamento(deformate);
      for (const d of deformate) {
        const punti = d.punti.map((p) => ({ ...schermo(p), u: p.u }));
        const coppie = punti.map(coppia).join(" ");
        if (attivo.stantia) {
          g.append(el("polyline", { class: "deformata", points: coppie, fill: "none", stroke: ROSSO,
            "stroke-width": misure.trattoDeformata * s,
            "stroke-dasharray": `${6 * s} ${4 * s}`, "stroke-linejoin": "round" }));
        } else {
          // Viridis sotto 3:1 sul fondo da metà scala in su: il bordo in inchiostro tiene la forma, il
          // colore porta il valore (story 62-63). SVG non ha gradienti lungo il percorso: un tratto per
          // coppia di punti, del colore della loro media.
          g.append(el("polyline", { class: "deformata-bordo", points: coppie, fill: "none", stroke: INCHIOSTRO,
            "stroke-width": (misure.trattoDeformata + 2 * misure.bordoDeformata) * s,
            "stroke-linejoin": "round", "stroke-linecap": "round" }));
          for (let k = 1; k < punti.length; k++) {
            const a = punti[k - 1], b = punti[k];
            g.append(el("line", { class: "deformata", x1: a.x, y1: a.y, x2: b.x, y2: b.y,
              stroke: coloreSpostamento((a.u + b.u) / 2, uMax),
              "stroke-width": misure.trattoDeformata * s, "stroke-linecap": "round" }));
          }
        }
        spezzata(punti);
      }
```

  - la legenda dei colori: in `creaPiano`, accanto a `badge` e `legenda`, un `div.risultati-colori` con dentro `span.titolo`, `span.min`, un `svg` 120×10 con `defs > linearGradient#viridis-legenda` (dieci `stop` da `VIRIDIS`, `offset` k/9) e un `rect` riempito col gradiente e bordato in inchiostro, `span.max`; in `disegna` si scrivono i testi da `testoScalaColori({ uMax, tipo: attivo.tipo })` e `hidden = !(attivo && vistaRis === "deformata" && !attivo.stantia)`.
  - ostacoli sopra il piano: il titolo si **misura** (`titolo.offsetHeight || misure.carattere + 9`), il badge va a `top = 6 + altoTitolo` (scritto in `badge.style.top`), la legenda degli stati a `top = topBadge + altoBadge + 2`, la legenda dei colori sotto l'ultima visibile; ognuna diventa un ostacolo alto quanto misura (`offsetHeight` con ripiego).
  - `stile.css`: `.risultati-colori` come `.risultati-legenda` (`position: absolute; right: 8px; font: var(--etichetta) var(--mono)` via `font-size: var(--etichetta, 11px)`; `display: flex; gap: 6px; align-items: center`), e `font-size: var(--etichetta, 11px)` anche su `.carichi-titolo`, `.risultati-badge`, `.risultati-legenda` al posto degli 11 px scritti.
- [ ] **Step 4: verde**; **Step 5: Commit** `feat(interfaccia): il piano legge le misure dalle variabili CSS e colora la deformata con lo spostamento in viridis`.

## Ingressi degeneri

- `getComputedStyle` assente (DOM finto dei test vecchi) → `MISURE_BASE`, disegno identico a oggi.
- deformata di un'asta con un punto solo (asta a lunghezza nulla già scartata da `assiDi`) → bordo senza tratti, nessuna eccezione.
- `uMax = 0` (caso a spostamenti nulli) → tutti i tratti alla tappa bassa, legenda «0 mm … 0 mm».
- `attivo.uMax` non finito → calcolato dalle deformate.
- stantia → nessun `line.deformata`, legenda dei colori nascosta, badge «stantia».
- vista M/V/N → legenda dei colori nascosta, nessun bordo.
- titolo nascosto (nessuna azione in vista) → il badge a `top = 6`, non a `6 + 0 + gap` spurio.

---

### Task 3: il 3D — cilindri che si ispessiscono, deformata in viridis, nodi dalle misure

**Files:**
- Modify: `static/spazio.js` (materiali `:79-84`, `rendi` `:109-122`, `disegna` `:140-185`; due pure esportate)
- Test: `static/test/spazio.test.js`

**Interfaces:** consuma `leggiMisure` (misure.js), `coloreSpostamento` (risultati.js). Produce `pixelInMondo`, `tratti`. `disegna(m, { selezione, deformata })` con `deformata = { aste, stantia, uMax }` (Task 4 aggiunge `uMax`).

- [ ] **Step 1: i test** (pure, senza WebGL, come `calcolaAspect`):
  1. `pixelInMondo(1000, 90, 500)` = `2·1000·tan(45°)/500` = 4; `pixelInMondo(1000, 45, 0)` = 0; `pixelInMondo(NaN, 45, 500)` = 0.
  2. `tratti([{x:0,y:0,z:0,u:0}, {x:1,y:0,z:0,u:2}, {x:2,y:0,z:0,u:4}], 4)` → due tratti con `a`/`b` giusti e `colore` = `coloreSpostamento(1, 4)` e `coloreSpostamento(3, 4)`; `tratti([], 4)` e `tratti([p], 4)` → `[]`; `u` assente → colore della tappa bassa.
- [ ] **Step 2: rosso.**
- [ ] **Step 3: il codice** in `spazio.js`:
  - una `CylinderGeometry(1, 1, 1, 8)` **condivisa** creata una volta (asse y, alta 1, raggio 1); la pulizia di `disegna` (`:142`) salta la geometria condivisa (`if (o.geometry !== cilindro) o.geometry?.dispose()`).
  - `const cilindroFra = (a, b, materiale)`: `Mesh` con posizione a metà, `quaternion.setFromUnitVectors(new Vector3(0,1,0), direzione)`, `scale.y = lunghezza`, `userData.tratto = px` (il tratto voluto in pixel); le aste (`misure.trattoAsta`, scelta `misure.trattoScelta`) e la deformata (`misure.trattoDeformata`) diventano cilindri; l'ombra dell'indeformata con la deformata: materiale inchiostro trasparente a `misure.ombra`.
  - deformata non stantia: per ogni asta `tratti(d.punti, deformata.uMax)` → un cilindro colorato per tratto (`MeshBasicMaterial` presi da una `Map` colore → materiale, svuotata a ogni `disegna`); **bordo in inchiostro** come secondo cilindro coassiale di tratto `trattoDeformata + 2·bordoDeformata` con `depthWrite` normale e il colorato a `renderOrder` maggiore; stantia: cilindri rossi, nessun colore.
  - `rendi()`: prima di `renderer.render`, `const k = pixelInMondo(orbita.distanza, camera.fov, contenitore.clientHeight)`; per ogni mesh con `userData.tratto`, `mesh.scale.x = mesh.scale.z = k * mesh.userData.tratto / 2`. ponytail: `k` alla distanza del centro dell'orbita — un'asta vicina alla camera esce un po' più grossa, una lontana un po' più sottile; sui telai di NOVA (profondità ≪ distanza) lo scarto è sotto il pixel, e la misura esatta per asta si fa se un modello profondo lo chiede.
  - nodi: `puntoInchiostro.size = 2 * misure.raggioNodo`, `puntoRosso.size = 2 * misure.raggioNodo * 1.6` a ogni `disegna` (le misure si leggono con `leggiMisure(getComputedStyle(contenitore))`).
- [ ] **Step 4: verde** (i test JS; il 3D vero lo prova il fumo del Task 4 e la prova a mano); **Step 5: Commit** `feat(interfaccia): il 3D disegna aste e deformata come cilindri dello spessore voluto, colorata in viridis`.

## Ingressi degeneri

- `pixelInMondo` con altezza 0 (riquadro non ancora misurato) o distanza non finita → 0: i cilindri escono a spessore nullo fino al primo `rendi` misurato, non `NaN`/`Infinity` nella scala.
- tratto di lunghezza nulla (due punti coincidenti) → saltato (niente `setFromUnitVectors` su un vettore nullo).
- `deformata.uMax` assente → calcolato con `massimoSpostamento(deformata.aste)`.
- stantia → nessun materiale di viridis creato.
- `disegna` chiamato cento volte → la `Map` dei materiali non cresce (svuotata e i materiali `dispose()`), la geometria condivisa non si butta.

---

### Task 4: il layout della presentazione, `P` ed `Esc`, |u|max in `app.js`, il fumo

**Files:**
- Modify: `static/stile.css` (variabili in `:root`; blocco `body[data-presentazione]`)
- Modify: `static/index.html` (il bottone «pannelli»)
- Modify: `static/app.js` (`dispatchVoce`: `presentazione`, `annulla`; `risultatiInVista` con `uMax` e `tipo`; `deformataInVista` con `uMax`; il bottone)
- Modify: `tests/fumo/fumo.mjs` (copione `presentazione`), `tests/test_fumo_chrome.py` (un test)

**Interfaces:** consuma i Task 1-3.

- [ ] **Step 1: `stile.css`**:

```css
:root {
  /* …le variabili d'oggi… */
  /* Le misure del disegno (15a): i valori d'oggi, ridefiniti per l'aula qui sotto. `misure.js` li
     legge; cambiare un numero qui cambia il disegno, e nessun'altra copia resta indietro. */
  --nodo-raggio: 5px; --asta-tratto: 2px; --asta-tratto-scelta: 3px;
  --deformata-tratto: 2px; --deformata-bordo: 2px; --etichetta: 11px; --ombra-opacita: 0.3;
}

/* Il modo presentazione (story 62, `PRODUCT.md:96-101`): un layout, non uno zoom. 1920 px su 2 m
   letti da 8 m → 45 px di corpo (`docs/ricerca/07-ux-modellatore.md:133`). Le viste prendono la
   larghezza, il pannello scende a striscia sotto di loro con la sola sezione «Risultati». */
body[data-presentazione] {
  --nodo-raggio: 7px; --asta-tratto: 6px; --asta-tratto-scelta: 9px;
  --deformata-tratto: 6px; --deformata-bordo: 2px; --etichetta: 46px; --ombra-opacita: 0.55;
  grid-template-columns: 1fr;
  grid-template-rows: 1fr auto auto auto;
  grid-template-areas: "viste" "striscia" "messaggio" "comando";
  font-size: 32px;
}
body[data-presentazione] #colonna, body[data-presentazione] #barra { display: none; }
body[data-presentazione] #viste { grid-template-columns: 3fr 2fr; }
body[data-presentazione] #pannello { grid-area: striscia; border-left: 0; border-top: 1px solid var(--tratto);
                                     overflow: visible; padding: calc(var(--passo) / 2) var(--passo); }
body[data-presentazione] #pannello > :not(#risultati) { display: none; }
body[data-presentazione] #risultati-controlli:not([hidden]) { display: flex; flex-wrap: wrap; gap: 0 1em; align-items: baseline; }
/* «pannelli»: albero e ispettore tornano a colonna senza uscire dalla presentazione, coi caratteri
   dell'aula. */
body[data-presentazione][data-pannelli] { grid-template-columns: minmax(180px, 22rem) 1fr minmax(220px, 30rem);
  grid-template-rows: 1fr auto auto; grid-template-areas: "albero viste pannello" "messaggio messaggio messaggio" "comando comando comando"; }
body[data-presentazione][data-pannelli] #colonna { display: flex; }
body[data-presentazione][data-pannelli] #pannello { grid-area: pannello; border-top: 0; border-left: 1px solid var(--tratto); overflow: auto; }
body[data-presentazione][data-pannelli] #pannello > :not(#risultati) { display: revert; }
#riapri-pannelli { display: none; }
body[data-presentazione] #riapri-pannelli { display: block; position: fixed; top: var(--passo); left: var(--passo); z-index: 2; font: inherit; font-size: 32px; }
```

  (i numeri esatti di `grid-template` e dei `rem` li verifica l'architect a 1920 px; il `[hidden]` va rispettato: `:not([hidden])` sulle regole che scrivono `display`.)
- [ ] **Step 2: `index.html`**: prima di `<div id="colonna">`, `<button id="riapri-pannelli" type="button" aria-pressed="false">pannelli</button>` (nascosto dal CSS fuori dalla presentazione).
- [ ] **Step 3: `app.js`**:
  - `const presentazione = () => document.body.hasAttribute("data-presentazione");` e `function alternaPresentazione(accesa = !presentazione())` che scrive/toglie `data-presentazione`, toglie `data-pannelli` quando esce, aggiorna `aria-pressed` del bottone, poi `ridisegna()`.
  - in `dispatchVoce`, **sotto** la guardia del campo (`if (comando) { campoComando.focus(); return; }`): `if (voce.codice === "presentazione") { alternaPresentazione(); return; }`.
  - il ramo `annulla` (`:921`): `const gesto = Boolean(modo || comando); modo = null; chiudiComando(); dì(null); if (!gesto && presentazione()) { alternaPresentazione(false); return; } ridisegna(); return;`.
  - il bottone: `$("riapri-pannelli").addEventListener("click", () => { document.body.toggleAttribute("data-pannelli"); …aria-pressed…; ridisegna(); })`.
  - `risultatiInVista(m, fattore)`: aggiunge `tipo: scelto.tipo` e `uMax`: per la pushover `massimoSpostamento(puntiDeformata(m, { spostamenti: passoDiRiferimento.spostamenti }, 1))` in cache accanto a `scalaCache` (stessa chiave `passi`/`m`); per caso e modo `massimoSpostamento(puntiDeformata(m, scelto.perCaso, 1))`.
  - `deformataInVista`: passa `uMax: inVista.uMax` nella deformata per il 3D.
- [ ] **Step 4: il fumo** — copione `presentazione` in `fumo.mjs`:

```js
  // Il modo presentazione sul MURO 1 a 1920×1080 (story 62): P entra, le misure rese stanno sopra le
  // soglie, niente si sovrappone, la pagina non scorre; in scala di grigi i doppi canali restano
  // (story 63); Esc esce. Le misure si leggono sul **reso**: attributo × `getScreenCTM().a`.
  async presentazione() {
    await apri(url, arg.cdp, { larghezza: 1920, altezza: 1080 });
    // …come apriECorri, senza riaprire la scheda…
    await tasto("p");
    await pausa(400);
    const reso = (sel, attr, fattore = 1) => ev(`(() => { const v = [...document.querySelectorAll(${JSON.stringify(sel)})]
      .map((e) => parseFloat(e.getAttribute(${JSON.stringify(attr)})) * e.getScreenCTM().a * ${fattore}); return v.length ? Math.min(...v) : null; })()`);
    const misure = {
      etichette: await reso("#piano svg g[data-tipo=nodo] text", "font-size"),
      aste: await reso("#piano svg line[data-tipo=asta]", "stroke-width"),
      nodi: await reso("#piano svg g[data-tipo=nodo] circle", "r", 2),
      striscia: await ev(`parseFloat(getComputedStyle(document.getElementById("risultati-caso")).fontSize)`),
    };
    const nascosti = await ev(`["colonna", "barra", "storia-elenco"].map((id) => getComputedStyle(document.getElementById(id)).display === "none" || document.getElementById(id).offsetParent === null)`);
    const strisciaSotto = await ev(`document.getElementById("pannello").getBoundingClientRect().top >= document.getElementById("viste").getBoundingClientRect().bottom - 1`);
    const proporzione = await ev(`document.getElementById("piano").clientWidth / document.getElementById("spazio").clientWidth`);
    const sovrapposte = await ev(SOVRAPPOSTE);
    const scorre = await ev(`document.documentElement.scrollWidth > window.innerWidth`);
    const colori = await ev(`new Set([...document.querySelectorAll("#piano svg line.deformata")].map((l) => l.getAttribute("stroke"))).size`);
    const legendaColori = await ev(`(() => { const l = document.querySelector("#piano .risultati-colori"); return l && !l.hidden ? l.textContent : null; })()`);
    // Bianco e nero: il colore spento, i canali che restano. Il badge dice la scala a parole; il nodo
    // scelto è più grosso (non solo rosso); la deformata ha il bordo in inchiostro.
    await ev(`(() => { document.documentElement.style.filter = "grayscale(1)"; return true; })()`);
    await tasto("g");
    await pausa(200);
    const bn = {
      badge: await ev(`document.querySelector("#piano .risultati-badge").textContent`),
      raggi: await ev(`[...document.querySelectorAll("#piano svg g[data-tipo=nodo] circle")].map((c) => parseFloat(c.getAttribute("r")))`),
      bordo: await ev(`document.querySelectorAll("#piano svg polyline.deformata-bordo").length`),
    };
    if (arg.screenshot) { const { data } = await cmd("Page.captureScreenshot", { format: "png" }); (await import("node:fs")).writeFileSync(arg.screenshot, Buffer.from(data, "base64")); }
    await ev(`(() => { document.documentElement.style.filter = ""; return true; })()`);
    await tasto("Escape");   // chiude la selezione? no: G seleziona, non apre gesti — Esc esce dalla presentazione
    await pausa(300);
    const uscito = await ev(`!document.body.hasAttribute("data-presentazione") && getComputedStyle(document.getElementById("colonna")).display !== "none"`);
    const messaggio = await ev(`document.getElementById("messaggio").textContent`);
    return { misure, nascosti, strisciaSotto, proporzione, sovrapposte, scorre, colori, legendaColori, bn, uscito, messaggio };
  },
```

  e il test in `test_fumo_chrome.py`:

```python
def test_muro_1_in_presentazione_si_legge_da_otto_metri(chrome_e_server, binario_opensees, tmp_path):
    """P sul MURO 1 a 1920×1080: etichette ≥ 46 px, aste ≥ 6 px, nodi ≥ 14 px, striscia ≥ 32 px
    (story 62); niente si sovrappone; la deformata in viridis con la legenda; in scala di grigi la
    scala resta a parole, il nodo scelto più grosso, la deformata col bordo (story 63); Esc esce."""
    porta, cdp = chrome_e_server
    schermo = tmp_path / "presentazione-grigi.png"
    r = copione("presentazione", porta, cdp, fixture=str(FIXTURE / "muro_1.nova.json"), screenshot=str(schermo))
    assert r["ok"], r
    assert r["errori"] == [], r["errori"]
    t = r["trovato"]
    assert t["misure"]["etichette"] >= 46, t["misure"]
    assert t["misure"]["aste"] >= 6, t["misure"]
    assert t["misure"]["nodi"] >= 14, t["misure"]
    assert t["misure"]["striscia"] >= 32, t["misure"]
    assert all(t["nascosti"]), t["nascosti"]
    assert t["strisciaSotto"] is True
    assert 1.3 <= t["proporzione"] <= 1.7, t["proporzione"]
    assert t["sovrapposte"] == [], t["sovrapposte"]
    assert t["scorre"] is False
    assert t["colori"] >= 2, "la deformata non si colora con lo spostamento"
    assert t["legendaColori"] and "mm" in t["legendaColori"], t["legendaColori"]
    assert "×" in t["bn"]["badge"], t["bn"]["badge"]
    assert max(t["bn"]["raggi"]) > min(t["bn"]["raggi"]), "il nodo scelto non è più grosso: in B/N resta solo il colore"
    assert t["bn"]["bordo"] >= 1
    assert schermo.stat().st_size > 10_000, "lo screenshot in scala di grigi non è stato scritto"
    assert t["uscito"] is True
    assert t["messaggio"] == "", t["messaggio"]
```

  (la copia dello screenshot nel workspace per l'Esito la fa il controller; il fumo prova solo che si scrive.)
- [ ] **Step 5: tutti i test** (JS, fumo `-k presentazione`, pytest intero). **Step 6: Commit** `feat(interfaccia): il modo presentazione — P, striscia dei risultati, misure dell'aula, fumo a 1920 in scala di grigi`.

## Ingressi degeneri

- `P` senza nessuna corsa → presentazione accesa, striscia con lo stato vuoto di «Risultati» a 32 px, nessuna eccezione.
- `P` col fuoco nel campo del percorso → la lettera va nel campo (`daControllo`), il layout non cambia.
- `P` con un ghost aperto → la voce non è in contesto (`salvo-ghost`), niente cambia.
- `Esc` con un campo di comando aperto in presentazione → chiude il campo e **resta** in presentazione; il secondo `Esc` esce.
- «pannelli» fuori dalla presentazione → il bottone non si vede, nessun effetto.
- uscire con i pannelli aperti → `data-pannelli` tolto: rientrando i pannelli sono di nuovo chiusi.
- «apri» un altro modello in presentazione → resta in presentazione, le misure dell'aula restano.
- finestra ridimensionata in presentazione → il `resize` ridisegna il piano con le misure dell'aula (le variabili sono sul `body`, lette a ogni disegno).

---

### Task 5: prova a mano a 1920 e al 25 %, review di ramo, Esito (controller)

- [ ] Server `--porta 8824`; Chrome a 1920×1080: MURO 1 corso, `P`; zoom del browser al 25 % (P8a): scala, etichette dei nodi e numeri della striscia leggibili; uno screenshot a colori e uno in scala di grigi (dal fumo) nel workspace SDD; la pushover in presentazione (scrubber con `←`/`→`, colori fissi sui passi); un modo (colori fermi mentre respira); il 3D con aste spesse e deformata colorata.
- [ ] Review di ramo a cinque (`security-reviewer`, `code-reviewer`, `test-writer`, `craft-reviewer`, `spec-reviewer`) in parallelo, un giro di fix, re-review scoped; mutanti; Esito in coda a questo piano; PR; issue per l'Hermite dei modi.

## Ingressi degeneri

- nessun ingresso esterno (task del controller).

## Mutanti da provare a fine ramo (con controllo nullo)

1. `leggiMisure`: `n > 0` → `n >= 0` (uno zero entra) → muore in `misure.test.js`.
2. `viridis`: `Math.min(VIRIDIS.length - 2, …)` → `Math.floor(pos)` (t = 1 esce dall'array) → muore («viridis(1) = #fde725»).
3. `puntiDeformata`: `u: Math.hypot(u, w, uy)` → `Math.hypot(u, w)` (la y persa) → deve morire: aggiungere il caso con `uy ≠ 0` se non muore.
4. `piano.js`: il ramo stantia che colora lo stesso → muore («stantia: nessuna line.deformata»).
5. `piano.js`: `attivo.uMax` ignorato → muore («uMax 12,34 anche se le deformate arrivano a 6»).
6. `app.js`: `annulla` che esce dalla presentazione anche con un gesto aperto → controllo nullo nel fumo? **No** (il copione non apre un campo in presentazione): da provare a mano o con un secondo `Esc` nel copione.
7. `stile.css`: `--etichetta: 46px` → `40px` → muore nel fumo (`etichette >= 46`).
