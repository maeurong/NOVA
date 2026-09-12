# NOVA T5 — giornata 15b: critique, polish, audit, e i debiti della presentazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** chiudere T5 con una pagina che regge lo sguardo di un estraneo e la proiezione in aula. Tre cose insieme, nell'ordine: (1) una **critique** e un **audit** misurati su tutta la pagina (decisione P5a), non solo sul modo presentazione; (2) i **debiti della 15a** dell'issue #85 — le strisce più grandi del disegno a 1920 e a 1280, la coda chiara di viridis a 1,10:1, lo srotolato e la curva della pushover nascosti in aula, lo spessore dei cilindri che nessun test prova, il costo per fotogramma con un modo animato; (3) due difetti aperti da fuori: l'**Hermite dei modi** che disegna una S fra i nodi (#84) e le **grafie miste** nelle ragioni del Confronto (#82). Verifica di fine giornata: MURO 1 in pushover a 1920×1080 **e** a 1280×657 con il telaio più alto delle strisce che lo sovrastano e zero sovrapposizioni; nessun rilievo `Important` dell'audit che resti senza fix o senza issue; test JS, fumo e pytest verdi.

**Architecture:** nessun cambio nel server tranne una stringa di `nova/confronto.py` (#82). Il resto è interfaccia. Le **strisce** sopra il piano restano il punto che decide tutto: `piano.js` le scrive, le misura col browser e riserva la loro `fascia` prima di inquadrare (`static/piano.js:387-434`), quindi accorciarle è l'unica leva che restituisce altezza al disegno — spostare il telaio non la restituisce. La legenda dei colori esce dalla colonna delle strisce e si posa **in basso a sinistra del piano**, dove non ruba fascia; badge e legenda degli stati si accorciano a una riga sola. La **coda chiara di viridis** si risolve dove è nata: nessun ritocco alla rampa (la mappa percettiva è quella, e la legenda mostra la scala intera), ma la rampa e il suo intorno si posano su una **piastra d'inchiostro**, così il giallo di punta ha un fondo scuro sotto invece di `--fondo`. Lo **srotolato** e la **curva della pushover** tornano in aula con misure proprie: le stesse variabili CSS della 15a (`--etichetta` per i testi dell'SVG, un'altezza `--srotolato-alto`), lette dove oggi ci sono i numeri scritti a mano (`esito.js:162`, `:196`, `:203`). Lo **spessore dei cilindri** diventa osservabile: il ciclo di `rendi` (`spazio.js:182-184`) si estrae in una pura `scaleDeiTratti(oggetti, camera, altezza)` che i test chiamano senza WebGL, e il fumo legge un `data-` sul canvas. Il **costo per fotogramma** scende senza architettura nuova: `disegna` riusa le mesh già in scena quando il numero dei tratti non cambia (aggiorna posizione, scala, quaternione, colore), e `leggiMisure` si chiama **una volta per cambio di layout** invece che a ogni fotogramma — la cache si invalida su `resize` e sul cambio dell'attributo `data-presentazione`. L'**Hermite** (`risultati.js:224-233`) diventa lineare quando **entrambe** le rotazioni dei due capi sono nulle: è esattamente il caso della forma modale (`risultati.js:531-536`), e non tocca la deformata vera, che le rotazioni ce le ha.

**Tech Stack:** moduli ES nativi, `node --test` col DOM finto di `piano.test.js`, three.js r185 vendorizzato, pytest + Chrome headless via CDP (`tests/fumo/cdp.mjs`, `tests/fumo/fumo.mjs`, `tests/test_fumo_chrome.py`), skill `impeccable` (`critique`, `audit`, `polish`) per la ricognizione del Task 1.

**Spec:** `docs/superpowers/specs/2026-09-05-nova-v1-design.md` — story 62 (riga 115: etichette ≥ 46 px, testo ≥ 32 px, aste ≥ 6 px, nodi ≥ 14 px, contrasto ≥ 3:1), 63 (riga 116: un solo rosso, scalari in viridis con legenda, tutto leggibile in B/N), 64 (riga 117: unità in un punto e su ogni numero), 45 (modi), 48 (curva pushover), 39 (M srotolato), 56-57 (Confronto). `PRODUCT.md:94-101` (aula: 2 m, 8 m, 1920 px → 45 px; «è un layout a sé, non lo zoom del browser»), `:186-196` (convenzioni grafiche: viridis con legenda, mai rainbow, tutto leggibile in B/N), `:255-261` (WCAG AA; il fallimento non viaggia sul solo colore). Calendario: `docs/superpowers/plans/2026-09-06-t5-interfaccia-bozza.md:22` — giornata 15, «`impeccable critique` + `polish` + `audit` (a11y, responsive); riserva per ciò che è scivolato», verifica «zero sovrapposizioni; `audit` senza finding Important».

## Global Constraints

- **Niente sotto `nova/`** tranne la stringa delle ragioni di `nova/confronto.py` (Task 7), che è l'unico permesso di questo ramo. `meshrec/` non si tocca.
- **Un solo rosso** (`--rosso: #b8321e`), e vuol dire attenzione: selezione, fallito, stantio. Nessun secondo colore d'accento.
- **Ogni misura del disegno viene da una variabile CSS** letta da `misure.js` (`static/misure.js:6-20`): nessun numero di pixel nuovo scritto a mano in `piano.js`, `spazio.js`, `esito.js`. Una misura nuova si aggiunge a `:root` **e** a `body[data-presentazione]` **e** a `VARIABILI`.
- **Fuori dalla presentazione il disegno resta identico al pixel**: ogni task che tocca il disegno lo dichiara e lo prova (i test d'oggi sono la rete).
- **Contrasto ≥ 3:1** per le parti di grafica che servono a capire, ≥ 4,5:1 per il testo (WCAG AA). Le misure si fanno componendo sul fondo effettivo, non a occhio.
- **Ogni numero porta la sua unità**, e i numeri si scrivono all'italiana (virgola decimale, `−` tipografico): una sola grafia per frase.
- **Test**: nessun task si chiude senza `node --test static/test/` verde **e** il fumo lanciato quando tocca il DOM che il fumo legge (lezione della 15a: un task ruppe un copione e nessuno se ne accorse).
- Commit Conventional in italiano, per percorso, mai `git add -a`; trailer di sessione su ogni commit.

**Ricerca che questo piano applica** (`docs/ricerca/index.md:19`, ricerca 07): `07-ux-modellatore.md:133` (proiezione: ISO 9241-303 20-22 arcmin, proav 4 mm/m → 45 px a 8 m su 2 m e 1920 px), `:157` (principio 10, leggibile a 8 metri: linee e nodi più spessi, contrasto ≥ 3:1), `:154` (principio 7: colormap percettiva, viridis, mai rainbow, stampabile in B/N), `:100` (WCAG 1.4.11 ≥ 3:1 sulle parti di grafica che servono a capire; 2.4.13 Focus Appearance; testo sopra un viewport va su lastra opaca o con alone, non nudo), `:105` (data-ink: le note fuori dalle celle), `:120` (Munzner: la heuristic evaluation è validazione legittima al livello encoding, non sostituisce la prova con utenti), `:123` (impeccable critique dual-agent, e il suo limite dichiarato: «il detector non vede la tela WebGL»), `:126` (onestà sui punteggi: «non fabbricare precisione che non esiste»).

**Decisioni dell'autore già prese** (12/09, P1-P8, valgono per tutta la giornata 15): **P5a critique, polish e audit su tutta la pagina** — è il mandato di questa PR; P3a misure da variabili CSS; P4b spostamenti in viridis; P6a bianco e nero provato nel fumo; P8a verifica con lo zoom al 25 % più le misure del fumo. Tre scelte della 15a restano in piedi e non si rimettono in discussione qui: i pannelli riaperti in presentazione tengono i caratteri normali; col fuoco sul menu del caso `P` cambia caso e `Esc` esce sempre; lo srotolato nascosto in aula era un ripiego dichiarato — questa giornata lo toglie.

**Ruling del controller prima del piano:**
- **La critique viene prima dei fix, ma non li aspetta tutti.** Il Task 1 produce il verbale misurato; i Task 2-7 sono i debiti già misurati nella 15a e nelle issue, che non hanno bisogno di una critique per esistere. Il Task 8 raccoglie ciò che la critique aggiunge, con un tetto: i rilievi `Important` si chiudono o diventano issue **nominate**, i minori vanno in issue senza fix. Una critique che apre più lavoro di quanto una giornata ne chiuda è una critique che rimanda, non che migliora.
- **Le strisce si accorciano, il telaio non si sposta** (#85, dalla 15a): a 1280×657 in pushover le strisce prendono l'81 % dell'altezza. Riservare fascia a strisce troppo alte è il male minore già scelto; la cura è che siano basse.
- **Viridis resta intera.** Fermare la rampa a t ≈ 0,9 falserebbe la legenda (il massimo non sarebbe più il colore di punta). La coda chiara si posa su una piastra d'inchiostro: il contrasto lo dà il fondo, non l'amputazione della scala.
- **La forma di un modo è lineare** (#84): con entrambe le rotazioni nulle l'Hermite degenera in uno smoothstep, che è una curvatura che il solutore non ha calcolato. Lineare quando `p0` e `p1` sono **entrambi** zero; la deformata vera non cambia di un pixel.
- **Il costo per fotogramma si misura prima e dopo**, col `INTERVALLI` del fumo (`tests/fumo/fumo.mjs:97`), animazione accesa e ferma: senza il numero di prima, «ottimizzato» è un'opinione.
- **La cache delle misure ha un solo padrone**: `piano.js` e `spazio.js` la leggono, nessuno dei due la possiede — sta in `misure.js` con un'invalidazione esplicita, o due cache divergono come divergeva `uMax` nella 15a.

**Ramo:** `feat/interfaccia-15b-leggibilita` da `main` `35d30df`, worktree `/Users/mario/GitHub/NOVA-wt/interfaccia-15b` (venv pronto, `nova ok 3.12.13`). PR verso `main`; merge solo con via libera dell'autore.

## File Structure

| file | cosa cambia |
|---|---|
| `static/piano.js` | le strisce si accorciano; la legenda dei colori esce dalla colonna e si posa in basso a sinistra, fuori dal conto della `fascia`; la piastra d'inchiostro sotto la rampa; le misure lette dalla cache |
| `static/stile.css` | `.risultati-colori` in basso a sinistra con la sua piastra; misure d'aula per lo srotolato (`--srotolato-alto`, testi a `--etichetta`); badge e legenda stati su una riga |
| `static/misure.js` | `misureDi(elemento)` con cache e `dimenticaMisure()`; nuova variabile `--srotolato-alto` |
| `static/esito.js` | srotolato e curva della pushover con misure dalle variabili, niente più `11`/`96`/`14` scritti a mano |
| `static/spazio.js` | `scaleDeiTratti` estratta e provata; `disegna` riusa le mesh quando il conto dei tratti non cambia |
| `static/risultati.js` | `puntiDeformata`: lineare quando entrambe le rotazioni sono nulle (#84) |
| `nova/confronto.py` | le ragioni del pavimento in una sola grafia (#82) |
| `static/test/*.test.js` | i test dei cinque punti sopra |
| `tests/fumo/fumo.mjs`, `tests/test_fumo_chrome.py` | copione `aula1280`; misure dei cilindri e degli intervalli nei copioni esistenti |
| `docs/superpowers/plans/2026-09-13-…-15b-….md` | annotazione dell'architect, Esito |

---

### Task 1: critique e audit su tutta la pagina, misurati (ricognizione, nessun codice)

**Files:**
- Crea: `<workspace>/critique-15b.md` (il verbale; il workspace SDD di questo piano)
- Legge: `static/index.html`, `static/stile.css`, `PRODUCT.md`, la pagina viva a 1920×1080 e a 1280×657

**Interfaces:**
- Consuma: niente.
- Produce: l'elenco dei rilievi con severità (`Important` / minore), ognuno **con la sua misura** (px, rapporto di contrasto, selettore) e il file che lo ospita. Il Task 8 lo legge.

- [ ] **Step 1: la pagina viva, con dati veri**

Server sulla porta **8831** dal worktree, MURO 1 e MURO 1 pushover corsi davvero (non finti): senza risultati metà della pagina è uno stato vuoto e la critique guarderebbe un guscio.

```
/Users/mario/GitHub/NOVA-wt/interfaccia-15b/.venv/bin/python -P -m nova --porta 8831
```

- [ ] **Step 2: `impeccable critique` sulla pagina intera, modo Operate**

Non solo la presentazione: albero, ispettore, Check Model, Corsa, Risultati, Confronto, barra dei tasti, stati vuoti. Il verbale segna per ogni rilievo: cosa, dove (`file:riga` o selettore), la **misura** che lo dimostra, la severità, e il comando di rimedio. Vietato il punteggio senza misura (`07-ux-modellatore.md:126`).

- [ ] **Step 3: `impeccable audit` — a11y, responsive, focus**

Tastiera su tutti i controlli, `:focus-visible` con l'area e il contrasto di WCAG 2.4.13, nomi accessibili dei riquadri, contrasto del testo e delle parti di grafica, la pagina a 1280×657 e a 1920×1080 (e col solo zoom al 25 %, P8a). Il detector non vede la tela WebGL (`07-ux-modellatore.md:123`): il 3D si misura con le sonde del fumo, non col detector.

- [ ] **Step 4: il verbale, ordinato per severità**

Ogni riga: `severità · dove · misura · rimedio proposto · coperto dal Task N | nuovo`. I rilievi che i Task 2-7 già chiudono si marcano come coperti: il Task 8 lavora solo sul resto.

- [ ] **Step 5: commit del verbale**

```
git add docs/superpowers/plans/2026-09-13-t5-giornata-15b-critique-polish-audit.md
git commit -m "docs(piani): 15b — il verbale della critique e dell'audit"
```

## Ingressi degeneri

- pagina senza risultati (nessuna corsa) → la critique registra gli stati vuoti come tali, non come difetti
- riquadro del 3D senza WebGL → il rilievo è sulla riga che lo dichiara, non sulla tela assente

---

### Task 2: le strisce si accorciano — la legenda dei colori esce dalla colonna

**Files:**
- Modify: `static/piano.js:135-158` (creazione delle strisce), `:413-434` (i `top` e il conto della `fascia`), `:579-612` (i numeri della legenda e gli ostacoli)
- Modify: `static/stile.css` (blocco `.risultati-colori`, e il suo dentro `body[data-presentazione]`)
- Test: `static/test/piano.test.js`

**Interfaces:**
- Consuma: `leggiMisure` (`misure.js:13`), `testoScalaColori` (`risultati.js`).
- Produce: `fascia` che **non** conta più la legenda dei colori; la legenda resta un ostacolo per le etichette, alla sua nuova quota in basso.

- [ ] **Step 1: il test che fissa il patto — la legenda dei colori non alza la fascia**

In `piano.test.js`, accanto ai test della fascia: con badge e legenda dei colori visibili, il telaio deve stare **più in alto** di oggi della sola altezza della legenda dei colori; e la legenda dei colori deve avere `bottom` valorizzato, non `top`.

```js
test("la legenda dei colori sta in basso: non entra nella fascia, il telaio sale", () => {
  // stessa scena del test della fascia, deformata non stantia (colori visibili)
  const { piano, contenitore } = scenaConDeformata();
  const colori = contenitore.querySelector(".risultati-colori");
  assert.equal(colori.style.top, "", "niente top: la legenda non è più in colonna");
  assert.ok(parseFloat(colori.style.bottom) >= 0, "sta in basso");
  const altoPx = /* quota del nodo più alto, come nel test d'oggi */ 0;
  assert.ok(altoPx <= FASCIA_SENZA_COLORI + 1, "la fascia non conta più la legenda dei colori");
});
```

- [ ] **Step 2: lanciarlo e vederlo fallire**

Run: `node --test static/test/piano.test.js`
Atteso: FAIL — oggi `colori.style.top` è scritto da `scendi(...)`.

- [ ] **Step 3: togliere la legenda dalla colonna**

In `piano.js`: `colori` non passa più da `scendi`; il conto della `fascia` si ferma alla legenda degli stati; la posizione la dà il CSS (in basso a sinistra del riquadro, sopra il disegno). `nessunaStriscia` non guarda più `colori.hidden`.

```js
const topLegenda = scendi(badge, topBadge, altaBadge());
const fine = scendi(legenda, topLegenda, altaLegenda());
// La legenda dei colori è uscita dalla colonna (15b): sta in basso a sinistra, dove non ruba
// altezza al disegno. Resta un ostacolo per le etichette — alla sua quota, non a questa.
const nessunaStriscia = titolo.hidden && badge.hidden && legenda.hidden;
const fascia = nessunaStriscia ? 0 : Math.max(0, fine - 2) + carattere / 2;
```

- [ ] **Step 4: il CSS della nuova quota**

`.risultati-colori { position: absolute; left: 8px; bottom: 8px; top: auto; }` con la piastra del Task 3. In presentazione le stesse regole, corpo a 32 px come già previsto (`stile.css:512`).

- [ ] **Step 5: l'ostacolo segue la legenda in basso**

`ostacoloStriscia(colori, …)` prende la quota vera dal suo rettangolo (o dal ripiego per il DOM finto), non più `topColori`.

- [ ] **Step 6: badge e legenda degli stati su una riga in aula**

A 1280×657 la legenda degli stati va a tre righe con «rotta» da sola sull'ultima (misurato nella 15a). In presentazione `white-space: nowrap` non serve: serve un testo più corto — la legenda degli stati in aula dice i simboli separati da `·` senza le parole lunghe che si ripetono. Il testo esatto lo decide `testoLegendaStati` con un argomento `compatta = false`, provato a unità.

- [ ] **Step 7: test verdi e commit**

```
node --test static/test/
git add static/piano.js static/stile.css static/risultati.js static/test/
git commit -m "feat(piano): la legenda dei colori in basso, fuori dalla fascia delle strisce"
```

## Ingressi degeneri

- nessuna deformata (vista «niente») → nessuna legenda, `fascia = 0`, inquadratura identica a oggi
- riquadro più basso di `TELAIO_MINIMO` → la fascia non si riserva (regola W4 d'oggi), e la legenda in basso **non** copre il telaio perché è alta una riga
- deformata stantia → legenda dei colori nascosta, e la piastra sparisce con lei
- DOM finto senza `offsetHeight` → i ripieghi d'oggi valgono ancora, nessun `NaN` nelle quote

---

### Task 3: la coda chiara di viridis su una piastra d'inchiostro

**Files:**
- Modify: `static/piano.js:145-158` (il gruppo `.risultati-colori` e la sua rampa SVG)
- Modify: `static/stile.css`
- Test: `static/test/piano.test.js`

**Interfaces:**
- Consuma: `VIRIDIS`, `viridis(t)` (`risultati.js`).
- Produce: la rampa su fondo `--inchiostro`, testo della legenda in `--fondo` sopra la piastra.

- [ ] **Step 1: la misura che dimostra il difetto (nel commento, non solo in issue)**

`#fde725` su `#dcdad5` = **1,10:1**; su `#141414` = **14,6:1**. La piastra risolve l'estremo caldo senza toccare la scala.

- [ ] **Step 2: il test**

```js
test("la legenda dei colori ha una piastra d'inchiostro sotto la rampa", () => {
  const { contenitore } = scenaConDeformata();
  const piastra = contenitore.querySelector(".risultati-colori rect.piastra");
  assert.ok(piastra, "la piastra c'è");
  assert.equal(piastra.getAttribute("fill"), INCHIOSTRO);
});
```

- [ ] **Step 3: la piastra**

Un `rect` d'inchiostro dietro rampa e numeri, con 3 px di margine e gli angoli tondi; i numeri della legenda passano a `fill: var(--fondo)`. La rampa resta a 10 tappe, invariata.

- [ ] **Step 4: contrasto misurato in pagina, non dedotto**

Nel copione di fumo `presentazione`: il colore reso del testo della legenda contro il fondo reso della piastra ≥ 4,5:1.

- [ ] **Step 5: commit**

```
git add static/piano.js static/stile.css static/test/piano.test.js tests/fumo/fumo.mjs
git commit -m "fix(piano): la rampa di viridis su una piastra d'inchiostro (coda chiara a 1,10:1)"
```

## Ingressi degeneri

- legenda nascosta (stantia, vista non deformata) → nessuna piastra nel DOM
- `uMax = 0` (tutti gli spostamenti nulli) → la legenda dice `0 mm … 0 mm`, la piastra c'è lo stesso e nessuna divisione per zero

---

### Task 4: lo srotolato e la curva della pushover tornano in aula

**Files:**
- Modify: `static/esito.js:162` (`H = 96`, `M = 14`), `:196` (`H`, `M`, `ML`), `:203` (`font-size: 11`), e i testi della curva
- Modify: `static/misure.js` (nuova voce `srotolatoAlto` ← `--srotolato-alto`), `static/stile.css` (`:root` e `body[data-presentazione]`; via la regola `display: none`)
- Test: `static/test/esito.test.js`, `static/test/misure.test.js`

**Interfaces:**
- Consuma: `leggiMisure`/`misureDi` (Task 6 le dà la cache; fino ad allora `leggiMisure`).
- Produce: uno srotolato che in aula è alto `--srotolato-alto` (288 px) con testi a `--etichetta` (46 px), e fuori resta **identico a oggi** (96 px, 11 px).

- [ ] **Step 1: il test che fissa i due regimi**

```js
test("srotolato: fuori dall'aula 96 px e testi a 11; in aula prende le variabili", () => {
  const fuori = disegnaSrotolato({ stile: null });               // nessun getComputedStyle: ripieghi
  assert.equal(fuori.querySelector("svg").getAttribute("height"), "96");
  const aula = disegnaSrotolato({ stile: stileFinto({ "--srotolato-alto": "288px", "--etichetta": "46px" }) });
  assert.equal(aula.querySelector("svg").getAttribute("height"), "288");
  assert.equal(aula.querySelector("text").getAttribute("font-size"), 46);
});
```

- [ ] **Step 2: lanciarlo e vederlo fallire** — oggi i numeri sono costanti nel modulo.

- [ ] **Step 3: le misure dalle variabili**

`H` e `M` si ricavano da `srotolatoAlto` (margine = `carattere`); il `font-size` dei testi da `carattere`; `ML` dal testo più largo, cioè `avanzamentoMono(carattere) * 5`.

- [ ] **Step 4: togliere il `display: none` dell'aula**

Via `body[data-presentazione] #srotolato { display: none; }` (`stile.css:517`) e il commento C1 che lo giustificava, sostituito da una riga che dice cosa lo sostituisce.

- [ ] **Step 5: il piano non perde altezza**

La striscia sotto il piano ora è alta 288 px in aula: il riquadro del piano si accorcia, e l'inquadratura si rifà da sola al `resize`/`ridisegna`. Verifica nel fumo che il telaio resti sopra `TELAIO_MINIMO` px a 1280×657, altrimenti in aula lo srotolato si mostra **solo** con un'asta selezionata o con la pushover — regola da scrivere nel CSS, non nel JS.

- [ ] **Step 6: fumo e commit**

```
node --test static/test/
git add static/esito.js static/misure.js static/stile.css static/test/
git commit -m "feat(risultati): srotolato e curva della pushover con le misure dell'aula"
```

## Ingressi degeneri

- nessuna asta selezionata → la riga «Seleziona un'asta…» a 46 px in aula, non a 11
- curva con un solo passo (`uMax = vMax = 0`) → assi disegnati, punto nell'origine, nessun `NaN` (guardia d'oggi, `esito.js:200`)
- variabile CSS assente o `0` → ripiego ai numeri d'oggi (`MISURE_BASE`), disegno identico
- contenitore non ancora impaginato (`clientWidth = 0`) → i 200 px d'oggi, mai un massimo che allarghi il riquadro

---

### Task 5: lo spessore dei cilindri, provato; e il costo per fotogramma

**Files:**
- Modify: `static/spazio.js:165-189` (`rendi`), `:207-250` (`disegna`)
- Test: `static/test/spazio.test.js`
- Modify: `tests/fumo/fumo.mjs` (sonda dello spessore; `INTERVALLI` prima/dopo)

**Interfaces:**
- Consuma: `raggioCilindro` (`spazio.js:83`), `pixelInMondo` (`:51`).
- Produce: `scaleDeiTratti(oggetti, { posizione, fov }, altezza) → [{ scala }]`, pura, chiamata da `rendi`.

- [ ] **Step 1: il test che oggi non esiste — cancellare il ciclo deve rompere qualcosa**

```js
test("scaleDeiTratti: ogni tratto esce dello spessore voluto; senza il ciclo resterebbe 1", () => {
  const oggetti = [{ userData: { tratto: 6, estremi: [{ x: 0, y: 0, z: 1000 }, { x: 0, y: 0, z: 2000 }] } }];
  const [s] = scaleDeiTratti(oggetti, { posizione: { x: 0, y: 0, z: 0 }, fov: 90 }, 500);
  assert.ok(Math.abs(s - pixelInMondo(2000, 90, 500) * 3) < 1e-9);
  assert.notEqual(s, 1, "un raggio unitario vuol dire aste invisibili");
});
```

- [ ] **Step 2: estrarre la pura, `rendi` la applica**

```js
export function scaleDeiTratti(oggetti, camera, altezza) {
  return oggetti.map((o) => (o.userData?.tratto
    ? raggioCilindro(camera.posizione, o.userData.estremi, camera.fov, altezza, o.userData.tratto)
    : null));
}
```

- [ ] **Step 3: la sonda del fumo**

`rendi` scrive sul canvas `dataset.raggioTratto` (il raggio in mondo dell'ultimo giro, arrotondato); il copione `presentazione` asserisce che il tratto reso in px stia fra 5,5 e 7,5 con `--asta-tratto: 6px`.

- [ ] **Step 4: il costo di oggi, misurato prima di toccarlo**

Copione `presentazionePushover` (o un copione `modoAnimato`): `INTERVALLI` con animazione accesa e ferma, MURO 1 con un modo. Il numero va nel verbale: senza il prima, «migliorato» non è una misura.

- [ ] **Step 5: riuso delle mesh quando il conto non cambia**

In `disegna`: se il numero di tratti e il loro ordine coincidono col giro precedente, aggiorna `position`/`scale`/`quaternion`/`material` degli oggetti già in scena invece di ricrearli; altrimenti ricostruisci come oggi. `dispose` resta per i casi di ricostruzione.

- [ ] **Step 6: una lettura sola delle misure per layout**

`disegna` non chiama più `getComputedStyle` a ogni fotogramma: usa `misureDi(contenitore)` (Task 6), invalidata su `resize` e sul cambio di `data-presentazione`.

- [ ] **Step 7: il costo dopo, stesso copione, e commit**

```
node --test static/test/
git add static/spazio.js static/test/spazio.test.js tests/fumo/fumo.mjs
git commit -m "perf(spazio): mesh riusate fra i fotogrammi, e lo spessore dei cilindri provato"
```

## Ingressi degeneri

- modello senza aste → `scaleDeiTratti([])` rende `[]`, nessun `Math.max` su vuoto
- riquadro non misurato (`clientHeight = 0`) → raggio 0, mai `NaN` (regola d'oggi, `spazio.test.js`)
- WebGL assente → `creaSpazio` resta quello che si dichiara assente, e `disegna` non solleva
- numero di tratti cambiato fra due fotogrammi (passo della pushover con più aste) → ricostruzione piena, nessuna mesh orfana in scena

---

### Task 6: le misure lette una volta per layout

**Files:**
- Modify: `static/misure.js`
- Modify: `static/piano.js:380`, `static/spazio.js:213`, `static/app.js` (l'invalidazione)
- Test: `static/test/misure.test.js`

**Interfaces:**
- Produce: `misureDi(elemento)` (memoizzata) e `dimenticaMisure()`.

- [ ] **Step 1: il test**

```js
test("misureDi: legge una volta sola finché non si dimentica", () => {
  let letture = 0;
  const stile = { getPropertyValue: (n) => { letture++; return n === "--etichetta" ? "46px" : ""; } };
  globalThis.getComputedStyle = () => stile;
  const a = misureDi({}), b = misureDi({});
  assert.equal(a.carattere, 46);
  assert.equal(a, b, "stesso oggetto: nessuna seconda lettura");
  dimenticaMisure();
  misureDi({});
  assert.ok(letture > Object.keys(VARIABILI).length, "dopo dimenticaMisure rilegge");
});
```

- [ ] **Step 2: implementare cache + invalidazione**, e chiamare `dimenticaMisure()` in `app.js` sul `resize` e quando `data-presentazione`/`data-pannelli` cambiano.

- [ ] **Step 3: test verdi, fumo, commit**

```
git add static/misure.js static/piano.js static/spazio.js static/app.js static/test/misure.test.js
git commit -m "perf(misure): le variabili CSS lette una volta per cambio di layout"
```

## Ingressi degeneri

- `getComputedStyle` assente (test, DOM finto) → `MISURE_BASE`, e la cache non si popola con valori finti
- cambio di presentazione senza `resize` → `dimenticaMisure()` esplicito, o il disegno resterebbe con le misure di prima
- due elementi diversi (piano e spazio) → la cache è per elemento, non globale: le variabili stanno sul `body`, ma un giorno potrebbero non starci

---

### Task 7: due difetti aperti — l'Hermite dei modi (#84) e le grafie miste (#82)

**Files:**
- Modify: `static/risultati.js:224-233`
- Modify: `nova/confronto.py:124-135`
- Test: `static/test/risultati.test.js`, `tests/test_confronto.py`

**Interfaces:**
- Consuma: `formaComeSpostamenti` (`risultati.js:531-536`), che mette le rotazioni a zero.

- [ ] **Step 1: il test del punto interno (oggi fallisce)**

```js
test("forma di un modo: a metà asta la freccia è la media dei nodi, non uno smoothstep", () => {
  const punti = puntiDeformata(telaio, formaComeSpostamenti(modo), 1, 8);
  const mezzo = punti[0].punti.find((p) => Math.abs(p.r - 0.5) < 1e-9);
  assert.ok(Math.abs(mezzo.w - (w0 + w1) / 2) < 1e-9);
});
```

- [ ] **Step 2: lineare quando entrambe le rotazioni sono nulle**

```js
// Con `p0` e `p1` entrambi nulli l'Hermite degenera in uno smoothstep — una curvatura che il
// solutore non ha calcolato (#84). La forma di un modo arriva così da `formaComeSpostamenti`:
// lì la retta è la verità. La deformata vera ha le rotazioni e passa dal ramo di sempre.
const dritta = p0 === 0 && p1 === 0;
const w = dritta ? (1 - s) * w0 + s * w1
  : (1 - 3 * s2 + 2 * s3) * w0 + (s - 2 * s2 + s3) * Lt * p0 + (3 * s2 - 2 * s3) * w1 + (-s2 + s3) * Lt * p1;
```

- [ ] **Step 3: una sola grafia nelle ragioni del Confronto (#82)**

`{pavimento:g}` stampa `1e-04` col punto, mentre `_it()` scrive all'italiana: nella stessa frase convivono due grafie e due segni meno. Il pavimento passa da `_it`, e la frase usa `−` tipografico ovunque.

- [ ] **Step 4: il test della ragione**

```python
def test_la_ragione_del_pavimento_ha_una_sola_grafia():
    _, _, ragione = _scarto_classe(1e-9, 3.5, "mm")
    assert "e-" not in ragione and "1e-04" not in ragione
    assert "0,0001" in ragione
```

- [ ] **Step 5: test verdi e due commit separati**

```
node --test static/test/risultati.test.js
git add static/risultati.js static/test/risultati.test.js
git commit -m "fix(risultati): la forma di un modo è lineare fra i nodi, non una S"
git add nova/confronto.py tests/test_confronto.py
git commit -m "fix(confronto): una sola grafia dei numeri nelle ragioni del pavimento"
```

## Ingressi degeneri

- deformata vera con rotazioni non nulle → ramo Hermite di sempre, disegno identico al pixel
- una sola rotazione nulla (nodo incernierato di una deformata vera) → resta Hermite: non è una forma modale
- asta di lunghezza zero → nessun punto, come oggi
- pavimento assente per l'unità → il ramo dello zero esatto, che non stampa numeri

---

### Task 8: polish dei rilievi della critique, poi prova a mano, review di ramo, Esito (controller)

- [ ] **Step 1:** i rilievi `Important` del Task 1 non coperti dai Task 2-7: fix in questo ramo, uno per commit, oppure issue **nominata** con la misura dentro. Nessun rilievo resta senza destino.
- [ ] **Step 2:** prova a mano a **1920×1080** e a **1280×657**, statica e pushover, presentazione e scrivania; zoom al 25 % (P8a); screenshot a colori e in scala di grigi nel workspace.
- [ ] **Step 3:** fumo intero (`tests/test_fumo_chrome.py`), `node --test static/test/`, pytest.
- [ ] **Step 4:** review di ramo a cinque in parallelo (`security-reviewer`, `code-reviewer`, `test-writer`, `craft-reviewer`, `spec-reviewer`), giri di fix, re-review scoped.
- [ ] **Step 5:** mutanti con controllo nullo; Esito in coda a questo piano; PR; issue per ciò che resta.

## Ingressi degeneri

- nessun ingresso esterno (task del controller).

## Mutanti da provare a fine ramo (con controllo nullo)

1. `piano.js`: la legenda dei colori torna nel conto della `fascia` → deve morire nel test del Task 2.
2. `piano.js`: via la piastra d'inchiostro → muore nel test del Task 3 e nel fumo del contrasto.
3. `esito.js`: `H` fisso a 96 anche in aula → muore nel test del Task 4.
4. `spazio.js`: via il ciclo delle scale in `rendi` → **deve** morire nel test del Task 5 (oggi non muore: è il debito dell'issue #85).
5. `spazio.js`: riuso delle mesh anche quando il conto dei tratti cambia → muore su un passo della pushover con aste diverse.
6. `misure.js`: cache mai invalidata → muore nel test del Task 6.
7. `risultati.js`: `dritta` con `||` invece di `&&` → muore sul caso «una sola rotazione nulla».
8. `confronto.py`: il pavimento torna a `:g` → muore nel test del Task 7.
