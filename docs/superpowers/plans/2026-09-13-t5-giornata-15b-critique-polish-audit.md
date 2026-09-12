# NOVA T5 — giornata 15b: critique, polish, audit, e i debiti della presentazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** chiudere T5 con una pagina che regge lo sguardo di un estraneo e la proiezione in aula. Tre cose insieme, nell'ordine: (1) una **critique** e un **audit** misurati su tutta la pagina (decisione P5a), non solo sul modo presentazione; (2) i **debiti della 15a** dell'issue #85 — le strisce più grandi del disegno a 1920 e a 1280, la coda chiara di viridis a 1,10:1, lo srotolato e la curva della pushover nascosti in aula, lo spessore dei cilindri che nessun test prova, il costo per fotogramma con un modo animato; (3) due difetti aperti da fuori: l'**Hermite dei modi** che disegna una S fra i nodi (#84) e le **grafie miste** nelle ragioni del Confronto (#82). Verifica di fine giornata (**riscritta dopo R2**, che ha misurato come il fallimento sia a monte: a 1280×657 in aula la fascia oggi **non si riserva affatto** e le strisce tornano sopra il telaio intero): MURO 1 in pushover a 1920×1080 **e** a 1280×657 con la **fascia che si riserva davvero** — cioè `W4` che passa — **e** zero sovrapposizioni; nessun rilievo `Important` dell'audit che resti senza fix o senza issue; test JS, fumo e pytest verdi.

**Architecture:** nessun cambio nel server tranne una stringa di `nova/confronto.py` (#82). Il resto è interfaccia. Le **strisce** sopra il piano restano il punto che decide tutto: `piano.js` le scrive, le misura col browser e riserva la loro `fascia` prima di inquadrare (`static/piano.js:387-434`), quindi accorciarle è l'unica leva che restituisce altezza al disegno — spostare il telaio non la restituisce. **Quale striscia si accorcia lo dice la misura, non l'intuizione** (annotazione, R1-R4): a 1280×657 in aula, in pushover, le quattro strisce fanno 346 px su un riquadro di 403, e la legenda dei colori ne è **38**. La leva vera è la **legenda degli stati** (152 px, quattro righe) e poi il badge (108 px, due righe irriducibili). La legenda dei colori esce lo stesso dalla colonna e si posa **in basso a sinistra del piano**, ma vale l'11 % del problema, non il suo cuore. Insieme portano la `fascia` da 367 px (oggi non riservata affatto: scatta W4) a **231 px riservati, con 172 px di banda per il telaio**. La **coda chiara di viridis** non si risolve con una piastra d'inchiostro: misurata, la piastra scura ribalta il difetto invece di toglierlo (giallo 1,11 → 14,59, viola 10,91 → **1,21**, R6). La piastra serve, ma è di `--fondo` — opaca, non scura: in basso la legenda sta **sopra il disegno**, e quel che le serve è un fondo che non sia un'asta in viridis (`07-ux-modellatore.md:100`), non un fondo nero. Il giallo di punta il suo bordo ce l'ha già: la rampa porta uno `stroke: INCHIOSTRO` da 1 px, 13,19:1 sul fondo. Lo **srotolato** e la **curva della pushover** tornano in aula con misure proprie: le stesse variabili CSS della 15a (`--etichetta` per i testi dell'SVG, un'altezza `--srotolato-alto`), lette dove oggi ci sono i numeri scritti a mano (`esito.js:162`, `:180`, `:196`, `:203`). L'altezza misurata è **160 px, non 288** (R8-R9), e a 1280×657 in aula lo srotolato **non si mostra affatto**: a 288 px lascerebbe al piano 137 px. Lo **spessore dei cilindri** diventa osservabile: il ciclo di `rendi` (`spazio.js:181-183`) si estrae in una pura `scaleDeiTratti(oggetti, camera, altezza)` che i test chiamano senza WebGL, e il fumo legge un `data-` sul canvas (sonda misurata: 0,332 µs a scrittura, R12). Il **costo per fotogramma** non si tocca: misurato prima, sta a **16,6-16,7 ms di mediana in tutte e quattro le condizioni** — animazione accesa e ferma, 1920 e 1280 — cioè al pavimento del vsync, con 68 mesh in scena (R11). Il riuso delle mesh esce dal ramo e va in issue col numero di prima; resta la lettura delle misure **una volta per cambio di layout** invece che a ogni fotogramma, che è una questione di padrone unico e non di millisecondi: la cache si invalida su `resize`, su `data-presentazione` e su `data-pannelli`. L'**Hermite** (`risultati.js:224`) diventa lineare quando **entrambe** le rotazioni dei due capi sono nulle: è esattamente il caso della forma modale (`risultati.js:531-536`), e non tocca la deformata vera, che le rotazioni ce le ha (scarto misurato a metà asta: 18,7 / 13,1 / 13,1 / 76,9 mm). Attenzione al punto dove si misura: **a metà asta lo smoothstep è già la media dei due nodi** (vale 0,5 a s = 0,5), quindi la S si vede a s = 0,25 e 0,75 e non a 0,5 (R13).

**Tech Stack:** moduli ES nativi, `node --test` col DOM finto di `piano.test.js`, three.js r185 vendorizzato, pytest + Chrome headless via CDP (`tests/fumo/cdp.mjs`, `tests/fumo/fumo.mjs`, `tests/test_fumo_chrome.py`), skill `impeccable` (`critique`, `audit`, `polish`) per la ricognizione del Task 1.

**Spec:** `docs/superpowers/specs/2026-09-05-nova-v1-design.md` — story 62 (riga 115: etichette ≥ 46 px, testo ≥ 32 px, aste ≥ 6 px, nodi ≥ 14 px, contrasto ≥ 3:1), 63 (riga 116: un solo rosso, scalari in viridis con legenda, tutto leggibile in B/N), 64 (riga 117: unità in un punto e su ogni numero), 45 (modi), 48 (curva pushover), 39 (M srotolato), 56-57 (Confronto). `PRODUCT.md:94-101` (aula: 2 m, 8 m, 1920 px → 45 px; «è un layout a sé, non lo zoom del browser»), `:186-196` (convenzioni grafiche: viridis con legenda, mai rainbow, tutto leggibile in B/N), `:255-261` (WCAG AA; il fallimento non viaggia sul solo colore). Calendario: `docs/superpowers/plans/2026-09-06-t5-interfaccia-bozza.md:22` — giornata 15, «`impeccable critique` + `polish` + `audit` (a11y, responsive); riserva per ciò che è scivolato», verifica «zero sovrapposizioni; `audit` senza finding Important».

## Global Constraints

- **Niente sotto `nova/`** tranne la stringa delle ragioni di `nova/confronto.py` (Task 7), che è l'unico permesso di questo ramo. `meshrec/` non si tocca.
- **Un solo rosso** (`--rosso: #b8321e`), e vuol dire attenzione: selezione, fallito, stantio. Nessun secondo colore d'accento.
- **Ogni misura del disegno viene da una variabile CSS** letta da `misure.js` (`static/misure.js:6-20`): nessun numero di pixel nuovo scritto a mano in `piano.js`, `spazio.js`, `esito.js`. Una misura nuova si aggiunge a `:root` **e** a `body[data-presentazione]` **e** a `VARIABILI`.
- **Fuori dalla presentazione il disegno resta identico al pixel**: ogni task che tocca il disegno lo dichiara e lo prova (i test d'oggi sono la rete).
- **Contrasto ≥ 3:1** per le parti di grafica che servono a capire, ≥ 4,5:1 per il testo (WCAG AA). Le misure si fanno componendo sul fondo effettivo, non a occhio.
- **Ogni numero porta la sua unità**, e i numeri si scrivono all'italiana (virgola decimale, `−` tipografico): una sola grafia per frase.
- **Test**: nessun task si chiude senza `node --test "static/test/*.test.js"` verde **e** il fumo lanciato quando tocca il DOM che il fumo legge (lezione della 15a: un task ruppe un copione e nessuno se ne accorse). **Il modello glob, non la cartella**: su node v26.7.0 `node --test static/test/` muore con `MODULE_NOT_FOUND` — sta scritto in `tests/test_js.py:14-17`, e il piano lo sbagliava in quattro punti (R15).
- Commit Conventional in italiano, per percorso, mai `git add -a`; trailer di sessione su ogni commit.

**Ricerca che questo piano applica** (`docs/ricerca/index.md:19`, ricerca 07): `07-ux-modellatore.md:133` (proiezione: ISO 9241-303 20-22 arcmin, proav 4 mm/m → 45 px a 8 m su 2 m e 1920 px), `:157` (principio 10, leggibile a 8 metri: linee e nodi più spessi, contrasto ≥ 3:1), `:154` (principio 7: colormap percettiva, viridis, mai rainbow, stampabile in B/N), `:100` (WCAG 1.4.11 ≥ 3:1 sulle parti di grafica che servono a capire; 2.4.13 Focus Appearance; testo sopra un viewport va su lastra opaca o con alone, non nudo), `:105` (data-ink: le note fuori dalle celle), `:120` (Munzner: la heuristic evaluation è validazione legittima al livello encoding, non sostituisce la prova con utenti), `:123` (impeccable critique dual-agent, e il suo limite dichiarato: «il detector non vede la tela WebGL»), `:126` (onestà sui punteggi: «non fabbricare precisione che non esiste»).

**Decisioni dell'autore già prese** (12/09, P1-P8, valgono per tutta la giornata 15): **P5a critique, polish e audit su tutta la pagina** — è il mandato di questa PR; P3a misure da variabili CSS; P4b spostamenti in viridis; P6a bianco e nero provato nel fumo; P8a verifica con lo zoom al 25 % più le misure del fumo. Tre scelte della 15a restano in piedi e non si rimettono in discussione qui: i pannelli riaperti in presentazione tengono i caratteri normali; col fuoco sul menu del caso `P` cambia caso e `Esc` esce sempre; lo srotolato nascosto in aula era un ripiego dichiarato — questa giornata lo toglie.

**Ruling del controller prima del piano:**
- **La critique viene prima dei fix, ma non li aspetta tutti.** Il Task 1 produce il verbale misurato; i Task 2-7 sono i debiti già misurati nella 15a e nelle issue, che non hanno bisogno di una critique per esistere. Il Task 8 raccoglie ciò che la critique aggiunge, con un tetto: i rilievi `Important` si chiudono o diventano issue **nominate**, i minori vanno in issue senza fix. Una critique che apre più lavoro di quanto una giornata ne chiuda è una critique che rimanda, non che migliora.
- **Le strisce si accorciano, il telaio non si sposta** (#85, dalla 15a): a 1280×657 in pushover le strisce prendono l'86 % dell'altezza del riquadro (346 px su 403, rimisurato il 13/09; l'81 % della 15a era su un riquadro diverso). Riservare fascia a strisce troppo alte è il male minore già scelto; la cura è che siano basse. **Ruling rivisto dopo la misura (13/09):** l'ordine delle leve è legenda degli stati (152 px) → badge (108 px, comprimibile solo nel testo) → legenda dei colori (38 px). Il Task 2 parte dalla legenda degli stati, non dai colori.
- **Viridis resta intera.** Fermare la rampa a t ≈ 0,9 falserebbe la legenda (il massimo non sarebbe più il colore di punta). **Ruling rivisto dopo la misura (13/09):** la piastra **non** è d'inchiostro. Misurata, una piastra scura porta il giallo da 1,11 a 14,59 e il viola da 10,91 a **1,21**: ribalta il difetto da un capo all'altro della rampa. La piastra è di `--fondo`, e il suo mestiere è un altro — rendere opaco quel che sta **dietro** la legenda quando scende in basso sul disegno (`07-ux-modellatore.md:100`). Il giallo di punta il bordo ce l'ha già: lo `stroke: INCHIOSTRO` da 1 px della rampa, 13,19:1 sul fondo.
- **La forma di un modo è lineare** (#84): con entrambe le rotazioni nulle l'Hermite degenera in uno smoothstep, che è una curvatura che il solutore non ha calcolato. Lineare quando `p0` e `p1` sono **entrambi** zero; la deformata vera non cambia di un pixel.
- **Il costo per fotogramma si misura prima e dopo**, col `INTERVALLI` del fumo (`tests/fumo/fumo.mjs:97`), animazione accesa e ferma: senza il numero di prima, «ottimizzato» è un'opinione. **Ruling rivisto dopo la misura (13/09):** il numero di prima dice che non c'è niente da migliorare — mediana **16,6-16,7 ms** con l'animazione accesa, ferma, a 1920×1080 e a 1280×657, cioè il pavimento del vsync a 60 Hz, con 68 mesh in scena sul modo 2 del MURO 1. Il riuso delle mesh esce dal Task 5 e va in issue, con questi numeri dentro. Applicare la regola fino in fondo vuol dire anche non ottimizzare quando il prima dice che non serve.
- **La cache delle misure ha un solo padrone**: `piano.js` e `spazio.js` la leggono, nessuno dei due la possiede — sta in `misure.js` con un'invalidazione esplicita, o due cache divergono come divergeva `uMax` nella 15a. **Ruling (13/09):** la cache è **globale**, non per elemento. `--etichetta` e le sue sei sorelle si definiscono in due punti soli — `:root` (`stile.css:18-19`) e `body[data-presentazione]` (`:488-489`) — e nessun elemento le ridefinisce: una cache per elemento sarebbe una `WeakMap` per una variabilità che non esiste, e contraddirebbe il test che il piano stesso scrive.

**Ramo:** `feat/interfaccia-15b-leggibilita` da `main` `35d30df`, worktree `/Users/mario/GitHub/NOVA-wt/interfaccia-15b` (venv pronto, `nova ok 3.12.13`). PR verso `main`; merge solo con via libera dell'autore.

## File Structure

| file | cosa cambia |
|---|---|
| `static/piano.js` | le strisce si accorciano; la legenda dei colori esce dalla colonna e si posa in basso a sinistra, fuori dal conto della `fascia`; le misure lette dalla cache |
| `static/stile.css` | `.risultati-colori` in basso a sinistra con la sua piastra di `--fondo` e `white-space: normal`; misure d'aula per lo srotolato (`--srotolato-alto: 160px`) e la sua soglia di altezza; legenda stati a una riga in aula |
| `static/misure.js` | `misureDi()` con cache **globale** e `dimenticaMisure()`; nuova variabile `--srotolato-alto` |
| `static/esito.js` | srotolato e curva della pushover con misure dalle variabili, niente più `11`/`96`/`14`/`28` scritti a mano (`:162`, `:180`, `:196`, `:203`) |
| `static/spazio.js` | `scaleDeiTratti` estratta e provata; `disegna` legge le misure dalla cache. **Niente riuso delle mesh**: non c'è niente da guadagnare (R11) |
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

### Task 2: le strisce si accorciano — la legenda degli stati a una riga, i colori fuori dalla colonna

**Files:**
- Modify: `static/piano.js:135-158` (creazione delle strisce), `:407` (`testoLegendaStati`), `:413-434` (i `top` e il conto della `fascia`), `:582-614` (i numeri della legenda e gli ostacoli)
- Modify: `static/stile.css` (blocco `.risultati-colori`, e il suo dentro `body[data-presentazione]`)
- Test: `static/test/piano.test.js`

**Interfaces:**
- Consuma: `leggiMisure` (`misure.js:13`), `testoScalaColori` (`risultati.js`).
- Produce: `fascia` che **non** conta più la legenda dei colori; la legenda resta un ostacolo per le etichette, alla sua nuova quota in basso.

- [ ] **Step 1: il test che fissa il patto — la fascia del caso di collaudo**

`scenaConDeformata` **non esiste**: gli aiuti veri di `piano.test.js` sono `pianoCon(stile, w, h)`, `badgeDi`, `legendaDi`, `coloriDi`, `PUSHOVER()`, `MURO`, `yDeiNodi(svg, w, h)`, `altezzaDelRiquadro(svg)`, `estensione` (`piano.test.js:1554-1700`). Il test va scritto con quelli, accanto ai test della fascia, e va **sul caso di collaudo**: 1280×657 in aula, pushover.

```js
test("15b: stati a una riga e colori fuori dalla colonna — la fascia si riserva e vale 231 px", () => {
  // Misurato in Chrome il 13/09: oggi le quattro strisce fanno 346 px su un riquadro di 403, la
  // fascia varrebbe 367 e W4 la rifiuta in blocco — i nodi partono da 152 px e dodici fra nomi,
  // cerchi e deformata finiscono sotto badge e legenda degli stati.
  const w = 1280, h = 403;
  const { contenitore, piano, svg } = pianoCon(PRESENTAZIONE, w, h);
  badgeDi(contenitore).offsetHeight = 108;    // due righe a 46 px: la scala non si tronca (15a)
  legendaDi(contenitore).offsetHeight = 38;   // una riga. **Il 54 scritto qui era sbagliato**: in aula
                                              // la striscia rende a 32 px (non ai 46 di `--etichetta`,
                                              // che valgono per le etichette dell'SVG), quindi una riga
                                              // è alta 38 px e il tetto vero è 38 caratteri, non 27.
  piano.disegna(MURO, { risultati: PUSHOVER() });
  assert.equal(coloriDi(contenitore).style.top, "", "niente top: la legenda dei colori non è in colonna");
  assert.ok(altezzaDelRiquadro(svg()) > estensione(MURO).altezza, "la fascia si riserva (W4 passa)");
  // 6 + 38 (titolo) → 44; + 108 + 2 → 154; + 54 + 2 → 210; − 2 + 23 = 231.
  assert.ok(Math.min(...yDeiNodi(svg(), w, h)) >= 231, "il nodo più alto sta sotto la fascia di 231 px");
});
```

- [ ] **Step 2: lanciarlo e vederlo fallire**

Run: `node --test static/test/piano.test.js`
Atteso: FAIL — oggi `colori.style.top` è scritto da `scendi(...)`, la fascia vale 367 e W4 non la riserva affatto.

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

```css
#piano .risultati-colori { left: 8px; bottom: 8px; top: auto; right: auto;
                           /* R5 — a 1280×657 in aula la legenda è larga 847 px e il riquadro 751:
                              con `nowrap` esce dal piano di 87 px. In basso è fuori dalla fascia,
                              quindi due righe non costano un pixel di disegno. */
                           white-space: normal; max-width: calc(100% - 16px); text-align: left; }
```

In presentazione le stesse regole, corpo a 32 px come già previsto (`stile.css:512`), più la piastra del Task 3. **La misura che lo impone** (R5): oggi, in colonna a destra con `nowrap`, la stessa legenda esce già dal riquadro **a sinistra** di 88 px (`left: −87,9` misurato a 1280×657 in aula) — un difetto aperto che nessuno aveva visto, perché `SOVRAPPOSTE` guarda i `<text>` dell'SVG e non le strisce HTML.

- [ ] **Step 5: l'ostacolo segue la legenda in basso**

`ostacoloStriscia(colori, …)` (`piano.js:613-614`) prende la quota vera dal suo rettangolo (o dal ripiego per il DOM finto), non più `topColori`. Con due righe l'altezza è `2 · (carattere + 3)` nel ripiego.

- [ ] **Step 6: la legenda degli stati su una riga in aula — è questa la leva, non i colori**

Misurato il 13/09 (font mono di sistema, avanzamento 0,602 em = 27,69 px a 46): il testo d'oggi è lungo **119 caratteri = 3 296 px**, e va a **quattro righe (152 px)** nei 751 px utili di 1280×657 in aula, tre (114 px) nei 1 135 di 1920. I candidati misurati:

> **Correzione misurata durante l'esecuzione — il tetto è 38, non 27.** Il conto qui sotto è fatto a
> **46 px**, che è il corpo delle **etichette dell'SVG**; le **strisce** in aula rendono invece a **32 px**
> (la regola della presentazione vince per specificità sul `font-size: var(--etichetta)`). A 32 px
> l'avanzamento è 19,26 px e nei 751 px utili ci stanno **38 caratteri**, non 27. È lo stesso scarto che
> ha fatto risultare la `fascia` **215** invece dei 231 previsti: la misura di R3 e R18 era giusta nel suo
> metro e sbagliata nel corpo. Il codice e i test applicano **38**; la tabella qui sotto resta com'era
> perché è il verbale della misura, non il patto.

| testo | caratteri | px a 46 | righe a 1280 aula |
|---|---|---|---|
| `calcestruzzo: ○ elastica · ◐ fessurata · ● schiacciata — acciaio: contorno sottile elastica · spesso snervata · ✕ rotta` (oggi) | 119 | 3 296 | 4 |
| `○ elastica · ◐ fessurata · ● schiacciata · ✕ rotta` | 50 | 1 385 | 2 |
| `○ ◐ ● cls · ✕ acciaio rotto` | 27 | 748 | **1** |

Il testo esatto lo decide `testoLegendaStati(compatta = false)`, provato a unità sul **conteggio dei caratteri** (**≤ 38**, vedi la correzione sopra), che è la proprietà verificabile senza browser. Il testo lungo resta alla scrivania, dove ci sta.

**Il badge non si comprime**: «pushover · 120/120 · u 60 mm · V 70,9 kN · ×2 (auto)» è 1 440 px a 46, e nemmeno la versione più corta ragionevole (`120/120 · 60 mm · 70,9 kN · ×2`, 831 px) entra nei 751. Resta a **due righe**, e non si tronca — ruling della 15a: la scala non può mancare. Le due righe sono un pavimento, non un difetto da chiudere qui.

- [ ] **Step 7: test verdi e commit**

```
node --test "static/test/*.test.js"
git add static/piano.js static/stile.css static/risultati.js static/test/
git commit -m "feat(piano): legenda stati a una riga in aula, colori fuori dalla fascia"
```

## Ingressi degeneri

- nessuna deformata (vista «niente») → nessuna legenda, `fascia = 0`, inquadratura identica a oggi
- riquadro più basso di `TELAIO_MINIMO` → la fascia non si riserva (regola W4 d'oggi), e la legenda in basso **non** copre il telaio perché è alta una o due righe
- deformata stantia → legenda dei colori nascosta, e la piastra sparisce con lei
- DOM finto senza `offsetHeight` → i ripieghi d'oggi valgono ancora, nessun `NaN` nelle quote
- legenda dei colori più larga del riquadro (847 px su 751, 1280×657 in aula) → va a capo dentro il piano, mai fuori dal suo bordo
- badge che non sta su una riga nemmeno a 1920 (1 440 px su 1 135) → due righe, mai troncato: la scala della deformata non può mancare

---

### Task 3: la piastra sotto la legenda scesa in basso — di `--fondo`, non d'inchiostro

**Files:**
- Modify: `static/stile.css` (il blocco `#piano .risultati-colori`) — **solo CSS**
- Modify: `tests/fumo/fumo.mjs` (il contrasto reso, nel copione `presentazione`)

**Interfaces:**
- Consuma: `--fondo`, `--inchiostro` (`stile.css:4-5`).
- Produce: la legenda dei colori su un fondo **opaco**, dovunque il disegno le passi sotto.

- [ ] **Step 1: la misura che cambia la decisione (R6-R7)**

Misurato in Chrome il 13/09, componendo sul fondo reso:

| | su `--fondo` `#dcdad5` (oggi) | su una piastra d'inchiostro `#141414` |
|---|---|---|
| testo della legenda | 13,19:1 | 13,19:1 (a testo invertito) |
| giallo di punta `#fde725` | **1,11:1** | 14,59:1 |
| viola di coda `#440154` | 10,91:1 | **1,21:1** |
| bordo della rampa `#141414` | 13,19:1 | **1,00:1** |

La piastra d'inchiostro **sposta** il difetto dal capo caldo a quello freddo e in più cancella il bordo della rampa, che oggi è proprio la cosa che stacca il giallo dal fondo. Non si fa. Quel che serve davvero, e che nasce dallo spostamento in basso del Task 2, è un fondo **opaco**: laggiù la legenda sta **sopra il disegno**, e senza piastra si legge sopra un'asta in viridis o sopra l'ombra dell'indeformata (`07-ux-modellatore.md:100`, «testo sopra un viewport va su lastra opaca o con alone, non nudo»).

**E il `rect.piastra` non ha dove stare** (R7): `.risultati-colori` è un `div` HTML (`piano.js:144`), e l'unico SVG che contiene è la rampa (`viewBox 0 0 120 10`, larga 6 em, alta 0,6 em, `piano.js:153-156`). Un `rect` là dentro non può finire dietro al testo HTML. Una dichiarazione CSS fa tutto: nessun nodo nuovo, nessuna modifica a `piano.js`, nessun test a unità su un attributo che non esiste.

- [ ] **Step 2: la piastra, in CSS**

```css
#piano .risultati-colori { background: var(--fondo); padding: 0.15em 0.35em; border-radius: 3px; }
```

La rampa resta a 10 tappe e tiene il suo `stroke: INCHIOSTRO` da 1 px (`piano.js:155`), che è il bordo da 13,19:1 che il giallo di punta ha già.

- [ ] **Step 3: il contrasto misurato in pagina, non dedotto**

Nel copione di fumo `presentazione`, alla quota nuova in basso: il colore reso del testo della legenda contro il fondo reso della piastra ≥ 4,5:1 (atteso 13,19:1), e il fondo reso della piastra **non trasparente** — è quest'ultima l'asserzione che muore se qualcuno toglie la riga.

- [ ] **Step 4: commit**

```
git add static/stile.css tests/fumo/fumo.mjs
git commit -m "fix(piano): la legenda dei colori su una piastra opaca, alla sua quota in basso"
```

## Ingressi degeneri

- legenda sopra un tratto in viridis (in basso il disegno le passa sotto) → il fondo reso è opaco e il testo resta ≥ 4,5:1 su di lui, mai sul colore dell'asta
- legenda nascosta (stantia, vista non deformata) → nessuna piastra resa: il `[hidden]` d'oggi (`stile.css:120`) la porta via con sé
- `uMax = 0` (tutti gli spostamenti nulli) → la legenda dice `0 mm … max 0 mm`, la piastra c'è lo stesso e nessuna divisione per zero

---

### Task 4: lo srotolato e la curva della pushover tornano in aula

**Files:**
- Modify: `static/esito.js:162` (`H = 96`, `M = 14`), **`:180` (`font-size: 11` dei picchi dello srotolato — il piano lo aveva dimenticato, R17)**, `:196` (`H`, `M`, `ML`), `:203` (`font-size: 11` dei testi della curva)
- Modify: `static/misure.js` (nuova voce `srotolatoAlto` ← `--srotolato-alto`), `static/stile.css` (`:root` e `body[data-presentazione]`; via la regola `display: none` di `:517`, e al suo posto la soglia di altezza)
- Test: `static/test/esito.test.js`, `static/test/misure.test.js`

**Interfaces:**
- Consuma: `misureDi` (`misure.js`, dal Task 6, che ora viene **prima**).
- Produce: uno srotolato che in aula è alto `--srotolato-alto` (**160 px**, non 288 — R8-R9) con testi a `--etichetta` (46 px), e fuori resta **identico a oggi** (96 px, 11 px). A 1280×657 in aula **non si mostra affatto**.

- [ ] **Step 1: il test che fissa i due regimi**

`creaSrotolato(contenitore, {suPasso})` rende `{ disegna }` e `disegnaSrotolato` è una chiusura interna (`esito.js:109-185`): il test passa dal costruttore vero e da un contenitore finto con `getComputedStyle`, come fa già `esito.test.js`.

```js
test("srotolato: fuori dall'aula 96 px e testi a 11; in aula 160 px e testi a 46", () => {
  const fuori = srotolatoCon(null);                                       // nessuna variabile: ripieghi
  assert.equal(svgDi(fuori).getAttribute("height"), "96");
  assert.equal(testiDi(fuori)[0].getAttribute("font-size"), "11");
  const aula = srotolatoCon({ "--srotolato-alto": "160px", "--etichetta": "46px" });
  assert.equal(svgDi(aula).getAttribute("height"), "160");
  assert.equal(testiDi(aula)[0].getAttribute("font-size"), "46");
});
```

- [ ] **Step 2: lanciarlo e vederlo fallire** — oggi i numeri sono costanti nel modulo.

- [ ] **Step 3: le misure dalle variabili — due margini, non uno**

`H` viene da `srotolatoAlto`; il `font-size` dei testi da `carattere` (`:180` **e** `:203`); gli scostamenti `4` e `12` dei picchi scalano col corpo (`4 * carattere / 11`, `12 * carattere / 11`).

Il **margine non è uno solo** (R10), e il piano lo dava per tale:
- **srotolato** (`:162`): `M = carattere / 2`. Con `M = carattere` l'ampiezza del diagramma è `H/2 − 46 = 34` px a `H = 160`; con `carattere/2` diventa 57. I testi non dipendono da `M`: stanno dentro comunque.
- **curva** (`:196`): `M ≥ 1,15 · carattere`. L'etichetta sotto l'asse sta a `y = H − M + 10·c/11` e scende di altri ~10,7 px sotto la linea di base (metriche misurate a 46 px: ascesa 43,3, discesa 10,7). Con `M = carattere` esce dall'SVG di ~5 px. `ML` scala com'è: `28 · carattere / 11`.

- [ ] **Step 4: togliere il `display: none` dell'aula — e metterci una soglia, non niente**

Via `body[data-presentazione] #srotolato { display: none; }` (`stile.css:517`) e il commento C1 che lo giustificava. Al suo posto la **regola di ripiego, che è obbligatoria e non condizionale** (R8): misurato a 1280×657 in aula, con lo srotolato acceso il riquadro del piano scende da 449 px a **329** (SVG a 96) o a **137** (SVG a 288), mentre le strisce, anche accorciate dal Task 2, ne vogliono 231. Non ci sta a nessuna altezza utile.

```css
:root { --srotolato-alto: 96px; }
body[data-presentazione] { --srotolato-alto: 160px; }
/* R8 — in aula lo srotolato costa `--srotolato-alto` + 24 px di titolo, padding e bordo. A
   1280×657 il piano ne ha 449 in tutto e le strisce ne chiedono 231: qualunque striscia sotto
   lascia meno dei 100 px di `TELAIO_MINIMO`. Sopra i 900 px di finestra ci sta (a 1080 restano
   ~500 px di banda), sotto no. La soglia è sull'altezza della finestra perché il CSS il riquadro
   del piano non lo sa; il numero viene dalla misura del 13/09, non da una taglia di schermo. */
@media (max-height: 899px) { body[data-presentazione] #srotolato { display: none; } }
```

- [ ] **Step 5: il piano non perde altezza — verificato nel fumo, col numero**

Copione `aula1280`: in presentazione a 1280×657 lo srotolato è `display: none` e il riquadro del piano resta 403 px. Copione `presentazione` a 1920×1080: lo srotolato si vede, è alto 184 px in tutto, e la banda che resta al telaio sta sopra `TELAIO_MINIMO`.

- [ ] **Step 6: fumo e commit**

```
node --test "static/test/*.test.js"
git add static/esito.js static/misure.js static/stile.css static/test/ tests/fumo/fumo.mjs
git commit -m "feat(risultati): srotolato e curva della pushover con le misure dell'aula"
```

## Ingressi degeneri

- nessuna asta selezionata → la riga «Seleziona un'asta…» a 46 px in aula, non a 11
- curva con un solo passo (`uMax = vMax = 0`) → assi disegnati, punto nell'origine, nessun `NaN` (guardia d'oggi, `esito.js:200`)
- variabile CSS assente o `0` → ripiego ai numeri d'oggi (`MISURE_BASE`), disegno identico
- contenitore non ancora impaginato (`clientWidth = 0`) → i 200 px d'oggi, mai un massimo che allarghi il riquadro
- finestra che lascerebbe al piano meno di `TELAIO_MINIMO` con lo srotolato acceso (1280×657 in aula: 137 px a 288) → lo srotolato non si mostra, e la regola sta in CSS, non in JS
- `M = carattere` sulla **curva** → l'etichetta sotto l'asse esce dall'SVG di ~5 px a 46: il margine della curva è `≥ 1,15 · carattere`, quello dello srotolato `carattere / 2`

---

### Task 5: lo spessore dei cilindri, provato; e il costo per fotogramma **registrato, non ottimizzato**

**Files:**
- Modify: `static/spazio.js:165-189` (`rendi`, il ciclo delle scale sta a `:181-183`), `:213` (la lettura delle misure)
- Test: `static/test/spazio.test.js`
- Modify: `tests/fumo/fumo.mjs` (sonda dello spessore; `INTERVALLI` registrato)

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

- [ ] **Step 3: la sonda del fumo — la strada del `dataset` regge (R12)**

`rendi` scrive sul canvas `dataset.raggioTratto` (il raggio in mondo dell'ultimo giro, arrotondato); il copione `presentazione` asserisce che il tratto reso in px stia fra 5,5 e 7,5 con `--asta-tratto: 6px`.

Misurato il 13/09 sul canvas vero di `#spazio`: **0,332 µs a scrittura** (19,9 ms per 60 000 scritture), cioè **0,0003 ms per fotogramma** con una scrittura per giro — invisibile dentro i 16,7 ms del vsync. WebGL vero c'è (`WebGL 2.0 (OpenGL ES 3.0 Chromium) / WebKit WebGL`), quindi i rilievi sul 3D si misurano davvero, non si marcano «non misurato».

- [ ] **Step 4: il costo di oggi, registrato — e la conclusione che ne segue**

Copione `modale` (l'`INTERVALLI` c'è già, `fumo.mjs:97` e `:280`): il numero di prima, misurato a 1920×1080 sul modo 2 del MURO 1, è

| condizione | mediana | media | massimo |
|---|---|---|---|
| animazione accesa, primo giro | 16,70 | 18,16 | 36,0 |
| animazione accesa, secondo giro | 16,70 | 16,66 | 17,5 |
| animazione ferma | 16,60-16,70 | 16,23-16,66 | 17,4-17,7 |
| ferma, a 1280×657 | 16,70 | 16,64 | 17,8 |

Sedici virgola sette millisecondi è **il periodo del vsync a 60 Hz**: il ridisegno non sfora il budget del fotogramma in nessuna condizione, e la differenza fra animazione accesa e ferma è dentro il rumore (il 18,16 del primo giro è il fotogramma di avvio, e sparisce alla seconda lettura — banda, non valore). Le mesh in scena sono **68** sul modo (4 aste + 2 × 32 tratti) e 260 sulla statica (4 + 2 × 128), che conferma il «68 mesh» del debito 15a.

- [ ] **Step 5: il riuso delle mesh non si fa — va in issue, col numero di prima dentro**

Il ruling del piano dice «senza il numero di prima, *ottimizzato* è un'opinione». Il numero di prima c'è, e dice che non c'è niente da guadagnare: qualunque riuso delle mesh produrrebbe un «dopo» identico al «prima», cioè un cambiamento che nessuna misura può difendere e nessun test può proteggere. Si apre un'issue con la tabella dello Step 4 e la soglia che la riaprirebbe (un modello che porti l'`INTERVALLI` sopra 16,7 ms di mediana).

- [ ] **Step 6: una lettura sola delle misure per layout**

`disegna` non chiama più `getComputedStyle` a ogni fotogramma (`spazio.js:213`): usa `misureDi()` del **Task 6, che ora viene prima** (R16). Non è una questione di millisecondi — è il padrone unico della cache, la stessa ragione per cui `uMax` è stato accentrato nella 15a.

- [ ] **Step 7: test verdi e commit**

```
node --test "static/test/*.test.js"
git add static/spazio.js static/test/spazio.test.js tests/fumo/fumo.mjs
git commit -m "test(spazio): lo spessore dei cilindri provato, e il costo per fotogramma registrato"
```

## Ingressi degeneri

- modello senza aste → `scaleDeiTratti([])` rende `[]`, nessun `Math.max` su vuoto
- riquadro non misurato (`clientHeight = 0`) → raggio 0, mai `NaN` (regola d'oggi, `spazio.test.js`)
- WebGL assente → `creaSpazio` resta quello che si dichiara assente, `disegna` non solleva e la sonda `dataset.raggioTratto` non c'è: il fumo salta l'asserzione invece di leggere `undefined` come 0
- oggetto senza `userData.tratto` fra i figli (i punti dei nodi) → `null` al suo posto nell'array, e `rendi` lo salta: la lunghezza resta quella dei figli, non quella dei soli cilindri
- `INTERVALLI` già al pavimento del vsync (16,7 ms) → il numero si **registra**, non si dichiara «migliorato»: un prima e un dopo indistinguibili non provano niente

---

### Task 6: le misure lette una volta per layout — **prima del Task 5**, non dopo (R16)

> **Ordine corretto il 13/09:** il ledger aveva messo 5 prima di 6, con lo Step 6 del Task 5 che «si verifica nel Task 6» — cioè un task che si chiude con uno step aperto. Il Task 6 non consuma niente del Task 5: si fa prima, e lo Step 6 del Task 5 diventa una chiamata a una funzione che esiste già. Restano sequenziali comunque: `spazio.js:213` sta dentro il `disegna` che il Task 5 tocca.

**Files:**
- Modify: `static/misure.js`
- Modify: `static/piano.js:380`, `static/spazio.js:213`, `static/app.js:850-853` (il `resize`) e `:870-874` (`alternaPresentazione`, che cambia `data-presentazione`/`data-pannelli` **senza** scatenare un `resize`)
- Test: `static/test/misure.test.js`

**Interfaces:**
- Produce: `misureDi()` (memoizzata, **globale**) e `dimenticaMisure()`. `leggiMisure(stile)` resta com'è: è la pura sotto, e i suoi test non si toccano.

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

Il test qui sopra chiama `misureDi()` **senza argomento** e si aspetta lo stesso oggetto due volte: è la forma giusta, perché la cache è globale (ruling del 13/09). Se la firma resta `misureDi(elemento)`, due letterali `{}` diversi sarebbero due chiavi diverse e il test non potrebbe passare — era la contraddizione fra il test del piano e il suo ingresso degenere (R14).

- [ ] **Step 2: implementare cache + invalidazione**, e chiamare `dimenticaMisure()` in `app.js` sul `resize` (`:850`) **e** dentro `alternaPresentazione` (`:870`), che cambia `data-presentazione` e `data-pannelli` senza passare dal `resize` — lo dice già il commento a `stile.css` lì accanto.

- [ ] **Step 3: test verdi, fumo, commit**

```
node --test "static/test/*.test.js"
git add static/misure.js static/piano.js static/spazio.js static/app.js static/test/misure.test.js
git commit -m "perf(misure): le variabili CSS lette una volta per cambio di layout"
```

## Ingressi degeneri

- `getComputedStyle` assente (test, DOM finto) → `MISURE_BASE`, e la cache non si popola con valori finti
- cambio di presentazione senza `resize` → `dimenticaMisure()` esplicito, o il disegno resterebbe con le misure di prima
- due chiamanti diversi (piano e spazio) → **stessa** cache e stessi numeri: le sette variabili si definiscono in due punti soli, `:root` (`stile.css:18-19`) e `body[data-presentazione]` (`:488-489`), e nessun elemento le ridefinisce
- `dimenticaMisure()` chiamata due volte di fila → la seconda non solleva e non rilegge: dimenticare due volte è dimenticare

---

### Task 7: due difetti aperti — l'Hermite dei modi (#84) e le grafie miste (#82)

**Files:**
- Modify: `static/risultati.js:224-233`
- Modify: `nova/confronto.py:124-135`
- Test: `static/test/risultati.test.js`, `tests/test_confronto.py`

**Interfaces:**
- Consuma: `formaComeSpostamenti` (`risultati.js:531-536`), che mette le rotazioni a zero.

- [ ] **Step 1: il test del punto interno — a metà asta NON si vede (R13)**

**Il test scritto nel piano passava già oggi**, cioè non falliva mai: con `p0 = p1 = 0` l'Hermite degenera nello smoothstep `3s² − 2s³`, che a `s = 0,5` vale esattamente `0,5` — lo stesso della retta. Misurato sul modo 2 del MURO 1 il 13/09: `scarto a metà asta = 0,000 mm` su tutte e quattro le aste, mentre lo scarto massimo vale **1,392 mm a s = 0,25 e 0,75**. Un test a metà asta sarebbe un test che non prova niente, e il mutante gli sopravviverebbe.

Lo smoothstep si stacca dalla retta al massimo a `s = 1/2 ∓ 1/(2√3)` ≈ 0,2113 e 0,7887, dove vale `0,0962 · (w1 − w0)`. Con `n = 8` campioni i punti disponibili più vicini sono `s = 0,25` e `0,75`, dove lo scarto vale `0,09375 · (w1 − w0)`.

```js
test("forma di un modo: fra i nodi è una retta, non una S (#84)", () => {
  const punti = puntiDeformata(telaio, formaComeSpostamenti(modo), 1, 8).find((d) => d.id === ASTA).punti;
  const a = punti[0], b = punti[punti.length - 1];
  for (const s of [0.25, 0.5, 0.75]) {
    const p = punti.find((q) => Math.abs(q.r - s) < 1e-9);
    const atteso = { x: a.x + s * (b.x - a.x), z: a.z + s * (b.z - a.z) };
    assert.ok(Math.hypot(p.x - atteso.x, p.z - atteso.z) < 1e-9, `a s = ${s} il punto non sta sulla retta`);
  }
  // La guardia contro un test vuoto: a metà asta lo smoothstep vale già 0,5, quindi il solo
  // s = 0,5 passerebbe anche col ramo d'oggi. È s = 0,25 e 0,75 a dire la verità.
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

- [ ] **Step 5: test verdi e due commit separati — e sono due task, non uno (R16)**

I due difetti non condividono niente: `static/risultati.js` da una parte, `nova/confronto.py` dall'altra. **Il 7b (`confronto.py`) va in parallelo dal primo minuto della giornata**, a `backend-engineer`; il 7a (`risultati.js`) va in parallelo alla catena 3-4-6-5, ma **dopo il Task 2**, che tocca `risultati.js` per `testoLegendaStati`.

```
node --test static/test/risultati.test.js
git add static/risultati.js static/test/risultati.test.js
git commit -m "fix(risultati): la forma di un modo è lineare fra i nodi, non una S"
git add nova/confronto.py tests/test_confronto.py
git commit -m "fix(confronto): una sola grafia dei numeri nelle ragioni del pavimento"
```

## Ingressi degeneri

- deformata vera con rotazioni non nulle → ramo Hermite di sempre, disegno identico al pixel. Misurato sul MURO 1 il 13/09, scarto della cubica dalla corda a metà asta: **18,7 / 13,1 / 13,1 / 76,9 mm** in statica C1 (33 punti per asta, quattro sotto-tratti), **14,8 / 14,7 / 0,1 mm** in pushover: le rotazioni ci sono, il ramo non cambia
- una sola rotazione nulla (nodo incernierato di una deformata vera) → resta Hermite: non è una forma modale
- asta di lunghezza zero → nessun punto, come oggi
- forma modale a spostamenti tutti nulli (nove modi su 42 del MURO 1) → retta degenere, nessun `NaN`, e il badge dice perché
- pavimento assente per l'unità → il ramo dello zero esatto, che non stampa numeri
- `pavimento` che `_it` renderebbe in notazione esponenziale (`1e-04`) → una sola grafia all'italiana nella frase, e il `−` tipografico anche nel numero del pavimento

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
2. `risultati.js`: `testoLegendaStati(compatta)` rende il testo lungo anche in aula → muore sul test del tetto dei caratteri del Task 2 (**38**, non i 27 scritti qui sotto: vedi la correzione allo Step 6).
3. `stile.css`: via il `background` della legenda dei colori → muore nel fumo del Task 3, sull'asserzione che il fondo reso **non** è trasparente.
4. `esito.js`: `H` fisso a 96 anche in aula → muore nel test del Task 4.
5. `stile.css`: via la `@media (max-height: 899px)` → muore nel copione `aula1280` del Task 4, dove il riquadro del piano crolla da 403 a 137 px.
6. `spazio.js`: via il ciclo delle scale in `rendi` → **deve** morire nel test del Task 5 (oggi non muore: è il debito dell'issue #85).
7. `misure.js`: cache mai invalidata → muore nel test del Task 6.
8. `risultati.js`: `dritta` con `||` invece di `&&` → muore sul caso «una sola rotazione nulla».
9. **Mutante del test, non del codice** — `risultati.js`: il ramo lineare resta, ma il test del Task 7a guarda solo `s = 0,5`. Rimettere lo smoothstep **non** fa morire quel test: è la prova che il punto di misura è `s = 0,25` e `0,75` (R13).
10. `confronto.py`: il pavimento torna a `:g` → muore nel test del Task 7b.

---

## Annotazione dell'architect (13/09/2026)

Misurata in Chrome, non dedotta. Provenienza di ogni numero: worktree `/Users/mario/GitHub/NOVA-wt/interfaccia-15b`, ramo `feat/interfaccia-15b-leggibilita`, HEAD `6a41839` sopra `main` `35d30df`, 13/09/2026.

### 0. Come ho misurato (rifacibile)

```
# server (la 8831 era libera: nessun ripiego; la 8765 con PID 54949 non è stata toccata)
/Users/mario/GitHub/NOVA-wt/interfaccia-15b/.venv/bin/python -P -m nova --porta 8831
# Chrome headless con WebGL vero
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
  --remote-debugging-port=9341 --user-data-dir=/tmp/misura15b/chromeprofile \
  --no-first-run --enable-unsafe-swiftshader --hide-scrollbars
# quattro copioni, che pilotano `tests/fumo/cdp.mjs` (apri/ev/tasto/finche/viewport)
node /tmp/misura15b/misura.mjs   docs/caso-studio/muro_1.nova.json          ""         1   # strisce, fascia, telaio
node /tmp/misura15b/misura.mjs   docs/caso-studio/muro_1_pushover.nova.json "pushover" 1
node /tmp/misura15b/C-modo.mjs                                                             # Hermite, INTERVALLI, sonda
node /tmp/misura15b/D-srotolato.mjs docs/caso-studio/muro_1.nova.json       ""             # srotolato, budget verticale
node /tmp/misura15b/E-testi.mjs                                                            # larghezze dei testi candidati
```

Modelli veri, corse vere con OpenSees (`~/.local/bin/OpenSees`): modale `corsa … · 0,34 s` (42 modi), pushover `corsa … · 2,32 s` (120 passi). Quattro configurazioni per copione: 1920×1080 e 1280×657, scrivania e aula. Niente `navigator.clipboard`. Niente scritto in `static/`: le prove sono iniezioni di `<style>` e di un clone della legenda, tolte a fine giro.

**Che cosa è risultato vero, senza rilievo:** `piano.js:425` (`topBadge`), `:431-434` (`nessunaStriscia`, `fascia`, `inquadra`), `:145-158` (il gruppo `.risultati-colori` con la rampa), `stile.css:517` (`display: none` in aula), `spazio.js:213` (`leggiMisure` dentro `disegna`, a ogni fotogramma), `esito.js:162` e `:196` (i numeri a mano), `confronto.py:124-135` (`{pavimento:g}` accanto a `_it()`), l'aritmetica del test di `scaleDeiTratti` scritto nel piano, i **68 mesh** del debito 15a, e tutti e otto i puntamenti alla ricerca 07 (`:100`, `:105`, `:120`, `:123`, `:126`, `:133`, `:154`, `:157`) — riga per riga, sono quel che il piano dice che siano.

### 1. I rilievi

**R1 — la legenda dei colori vale l'11 % del problema.** A 1280×657 in aula, pushover, le quattro strisce occupano 346 px su un riquadro di 403 (86 %). Altezze rese: titolo **38**, badge **108**, legenda stati **152**, legenda colori **38**. Guadagno misurato togliendo i colori dalla colonna (legenda schiacciata a 1 px, ridisegno forzato, telaio rimisurato):

| | telaio, cima prima → dopo | altezza del telaio |
|---|---|---|
| 1920×1080 scrivania | 381 → 375 | 370 → 370 (**+0**) |
| 1920×1080 aula, statica | 426 → 405 | 361 → 369 (**+8**) |
| 1920×1080 aula, pushover | 507 → 485 | 310 → 320 (**+10**) |
| 1280×657 scrivania | 219 → 213 | 143 → 143 (**+0**) |
| 1280×657 aula, statica | 308 → 287 | 61 → 67 (**+6**) |
| **1280×657 aula, pushover** | 152 → 152 | 126 → 126 (**+0**) |

Lo zero dell'ultima riga è il caso che il piano si dà come verifica di fine giornata. **Cosa cambia:** il Task 2 non parte dalla legenda dei colori. Parte dalla legenda degli stati (152 px), che è quattro volte più alta.

**R2 — a 1280×657 in aula la fascia non si riserva affatto.** `fascia` varrebbe 367 px e W4 (`piano.js:188`) rifiuta: `403 − 367 = 36 < TELAIO_MINIMO`. Le strisce tornano sopra il telaio intero, e **12 sovrapposizioni** misurate: «piede sx» e «piede dx» sotto la legenda degli stati, «sommità sx» e «sommità dx» sotto il badge, quattro cerchi di nodo e quattro polilinee della deformata sotto la legenda degli stati. Non è un difetto della legenda dei colori: sopravvive identico anche togliendola. **Cosa cambia:** la verifica di fine giornata va riscritta come «la fascia si riserva **e** zero sovrapposizioni», perché oggi il fallimento è a monte.

**R3 — il bersaglio numerico, che il piano non aveva.** Con la legenda degli stati a una riga (54 px) e i colori fuori dalla colonna: `6 + 38 → 44`, `+108 + 2 → 154`, `+54 + 2 → 210`, `−2 + 23` = **fascia 231 px**, `403 − 231 = 172 px` di banda per il telaio, sopra i 100 di `TELAIO_MINIMO`. Da 367 non riservati a 231 riservati. **Cosa cambia:** è l'asserzione dello Step 1 del Task 2, e sostituisce il `FASCIA_SENZA_COLORI` che il piano lasciava in bianco.

**R4 — «una riga» vuol dire 27 caratteri, e il badge non ci arriva.** Avanzamento del mono di sistema misurato: **0,602 em** (6,623 px a 11, 27,694 a 46) — l'`avanzamentoMono = 0,6 · carattere` di `misure.js:24` è giusto entro lo 0,3 %. Larghezza utile: 1 135 px a 1920 in aula, **751 px** a 1280. Quindi una riga = ≤ 40 caratteri a 1920, **≤ 27 a 1280**. Il testo di `testoLegendaStati` ne ha 119 (3 296 px, quattro righe). Il badge della pushover ne ha 52 (1 440 px): **non sta su una riga nemmeno a 1920**, e accorciarlo a 30 caratteri (831 px) non basta a 1280. **Cosa cambia:** il Task 2 Step 6 chiedeva «badge e legenda degli stati su una riga» — il badge resta a due righe, ed è un pavimento dichiarato, non un debito.

**R5 — la legenda dei colori esce già dal riquadro, oggi.** A 1280×657 in aula è larga 847 px in un riquadro di 751 e sta a `right: 8px` con `white-space: nowrap`: il suo bordo sinistro cade a **`left: −87,9`**, cioè 88 px fuori dal piano, tagliati. Difetto aperto che nessuno aveva misurato — `SOVRAPPOSTE` del fumo confronta i `<text>` dell'SVG fra loro e non vede le strisce HTML. Spostandola in basso a sinistra con `left: 8px` esce dall'altra parte di 87 px. **Cosa cambia:** il CSS dello Step 4 del Task 2 porta `white-space: normal` e `max-width`; in basso è fuori dalla fascia, quindi due righe non costano un pixel di disegno.

**R6 — la piastra d'inchiostro ribalta il difetto invece di toglierlo.** Contrasti resi, composti sul fondo effettivo: giallo `#fde725` **1,11:1** su `--fondo` → **14,59:1** su `#141414`; viola `#440154` **10,91:1** su `--fondo` → **1,21:1** su `#141414`; e il bordo della rampa, che è `#141414`, passa da 13,19:1 a **1,00:1** — sparisce proprio lo `stroke` che oggi stacca il giallo dal fondo. **Cosa cambia:** la piastra è di `--fondo`, opaca, e il suo mestiere è coprire il disegno che le passa sotto alla quota nuova (`07-ux-modellatore.md:100`), non scurire la rampa. Ruling del controller corretto nel piano.

**R7 — il `rect.piastra` non ha dove stare.** `.risultati-colori` è un `div` HTML (`piano.js:144`) e l'unico SVG che contiene è la rampa (`viewBox 0 0 120 10`, `piano.js:153-156`): un `rect` là dentro non può finire dietro al testo HTML. Il test del Task 3 interrogava un nodo impossibile. **Cosa cambia:** il Task 3 diventa **una dichiarazione CSS**, senza toccare `piano.js`, senza nodo nuovo e senza test a unità su un attributo inesistente; l'oracolo resta il contrasto reso nel fumo.

**R8 — `--srotolato-alto: 288px` non ci sta.** Riquadro del piano a 1280×657 in aula, con lo srotolato acceso a forza:

| SVG | riquadro srotolato | riquadro del piano | (senza srotolato: 449) |
|---|---|---|---|
| 96 | 120 | **329** | |
| 200 | 224 | **225** | |
| 288 | 312 | **137** | |
| 401 | 425 | **24** | telaio fuori dal riquadro |

Le strisce, anche accorciate dal Task 2, ne vogliono 231: `449 − S − 24 − 231 ≥ 100` dà `S ≤ 48`. **Non ci sta a nessuna altezza utile.** A 1920×1080 invece sì: con 288 il piano resta a 656, con 160 a ~784. **Cosa cambia:** la regola di ripiego del Task 4 Step 5 non è condizionale, è obbligatoria, e il piano ora porta la `@media (max-height: 899px)` scritta per intero.

**R9 — i testi a 46 px non si sovrappongono mai, a nessuna altezza.** Costruita la geometria di `esito.js` a mano nella pagina (stessa `y0 = H/2`, stessi scostamenti `4` e `12` scalati col corpo) e misurati i rettangoli veri: a `H = 96` il testo di sopra sta a `−12 … 42` e quello di sotto a `55 … 109` — distanti 13 px, mai sovrapposti; a `H = 160`, `20 … 74` e `87 … 141`. Il vincolo vero non è la sovrapposizione, è il **contenimento**: a `H = 96` il testo di sopra **esce dall'SVG di 12 px**. Serve `H ≥ 119` (metriche misurate a 46 px: ascesa 43,3, discesa 10,7). A `H = 160` l'ampiezza del diagramma torna ai 34 px d'oggi. **Cosa cambia:** `--srotolato-alto: 160px`, e la motivazione scritta nel piano («perché i testi non si sovrappongano») era falsa: si sovrappongono mai, escono sempre.

**R10 — i margini sono due, non uno.** `M = carattere` (come il piano chiedeva) schiaccia lo srotolato: ampiezza `H/2 − 46 = 34` px a `H = 160`, contro i 57 che dà `M = carattere/2`. Sulla **curva** il vincolo è opposto: l'etichetta sotto l'asse sta a `H − M + 10·c/11` e scende di altri 10,7 px, quindi vuole `M ≥ 1,15 · carattere` o esce dall'SVG di ~5 px. Due funzioni, due margini. **Cosa cambia:** scritto negli Step 3 e negli ingressi degeneri del Task 4.

**R11 — non c'è niente da ottimizzare per fotogramma.** `INTERVALLI` sul modo 2 del MURO 1, 30 fotogrammi per lettura, due letture per condizione: mediana **16,6-16,7 ms** con l'animazione accesa, ferma, a 1920×1080 e a 1280×657. È il periodo del vsync a 60 Hz. Banda dichiarata: la prima lettura con animazione dà media 18,16 e massimo 36,0 (fotogramma d'avvio), la seconda 16,66 e 17,5 — riporto la banda, non il primo numero. Mesh in scena: **68** sul modo (4 aste + 2 × 32 tratti), 260 sulla statica (4 + 2 × 128). **Cosa cambia:** lo Step 5 del Task 5 (riuso delle mesh) esce dal ramo e va in issue con questa tabella e con la soglia che la riaprirebbe. Il ruling del piano — «senza il numero di prima, *ottimizzato* è un'opinione» — applicato fino in fondo dice di non farlo.

**R12 — la sonda dello spessore regge.** Sul canvas vero di `#spazio`: `canvas.dataset.raggioTratto` costa **0,332 µs a scrittura** (19,9 ms per 60 000), cioè 0,0003 ms per fotogramma con una scrittura per giro — invisibile dentro 16,7 ms. Il valore si rilegge esatto. WebGL vero c'è: `WebGL 2.0 (OpenGL ES 3.0 Chromium) / WebKit WebGL`, canvas presente in tutte e quattro le configurazioni, quindi **nessun rilievo sul 3D va marcato «non misurato»**. La strada del `dataset` non va cambiata.

**R13 — l'Hermite a metà asta è già la media dei due nodi.** Con `p0 = p1 = 0` lo smoothstep `3s² − 2s³` vale `0,5` a `s = 0,5`: identico alla retta. Misurato sul modo 2 del MURO 1 (9 punti per asta, un solo tratto): scarto a metà asta **0,000 mm su tutte e quattro le aste**, scarto massimo **1,392 mm a s = 0,25 e 0,75**. Il test scritto nel Task 7 Step 1 **passa oggi**: lo Step 2 «lanciarlo e vederlo fallire» non sarebbe mai scattato, e il mutante che rimette lo smoothstep gli sopravviverebbe. La deformata vera, di contro, ha le rotazioni: scarto a metà asta 18,7 / 13,1 / 13,1 / 76,9 mm in statica C1, 14,8 / 14,7 / 0,1 mm in pushover — il ramo di sempre non cambia. **Cosa cambia:** il test guarda `s = 0,25`, `0,5` e `0,75`, e il mutante n. 9 esiste apposta per proteggere il punto di misura.

**R14 — il test del Task 6 contraddice il suo ingresso degenere.** Il test chiama `misureDi({})` due volte con due letterali diversi e pretende lo stesso oggetto; l'ingresso degenere dice «la cache è per elemento, non globale». Con una cache per elemento il test non può passare. Verificato nel CSS: le sette variabili di `VARIABILI` si definiscono in due punti soli, `:root` (`stile.css:18-19`) e `body[data-presentazione]` (`:488-489`), e nessun elemento le ridefinisce. **Cosa cambia:** cache **globale**, firma `misureDi()` senza argomento, e l'ingresso degenere riscritto. Una `WeakMap` per una variabilità che non esiste è un'astrazione non richiesta.

**R15 — `node --test static/test/` non gira.** Su node v26.7.0 muore con `MODULE_NOT_FOUND`: ci vuole il modello glob, `node --test "static/test/*.test.js"`, e sta scritto in `tests/test_js.py:14-17`. Il piano lo sbagliava nei Global Constraints e in tre Step di chiusura (Task 2, 4, 5). **Cosa cambia:** corretto in tutti e quattro i punti.

**R16 — l'ordine del ledger costa due task sul percorso critico.** (a) Il Task 5 si chiuderebbe con lo Step 6 aperto, perché aspetta il Task 6, che però non consuma niente del Task 5: **6 prima di 5**. (b) Il Task 7 sono due difetti senza niente in comune: `nova/confronto.py` è disgiunto da ogni file dell'interfaccia e **può partire dal primo minuto, in parallelo a tutto**; `static/risultati.js` è disgiunto dalla catena 3-4-6-5 ma non dal Task 2 (che tocca `testoLegendaStati`), quindi parte **dopo il 2** e corre accanto al resto. **Cosa cambia:** la tabella del § 2.

**R17 — tre puntamenti da correggere.** `esito.js:180` (il `font-size: 11` dei picchi dello **srotolato**) manca del tutto dai file del Task 4, che cita solo `:203` — che è la **curva**: senza `:180` i numeri dello srotolato restano a 11 px proprio nel task che esiste per portarli a 46. `piano.js:579-612` → **`582-614`** (`testoScalaColori` sta a 582, la chiamata di `ostacoloStriscia` sui colori a 613-614, fuori dal taglio). `spazio.js:182-184` → **`181-183`**. **Cosa cambia:** corretti nei file dei Task 2, 4, 5.

**R18 — la legenda degli stati compatta, misurata.** Tre candidati provati a 46 px nei 751 px utili di 1280 in aula: 119 caratteri = 3 296 px (4 righe, oggi), 50 caratteri = 1 385 px (2 righe), **27 caratteri = 748 px (1 riga)**. Solo il terzo entra. **Cosa cambia:** la tabella sta nel Task 2 Step 6, e il test a unità asserisce il **conteggio dei caratteri** (≤ 27), che è la proprietà verificabile col DOM finto.

### 2. Chi prende cosa, in quale ordine, con quale skill-gate

| task | subagente | ordine | skill-gate | riferimento |
|---|---|---|---|---|
| 7b · grafie miste (`nova/confronto.py`) | `backend-engineer` | **parallelo a tutto, dal minuto zero** | **false** — una stringa di formattazione col suo test | `docs/ricerca/07-ux-modellatore.md:156` |
| 1 · critique e audit | `frontend-engineer` | sequenziale, primo della catena | **true** | `docs/ricerca/07-ux-modellatore.md:120`, `:123`, `:126` |
| 2 · strisce | `frontend-engineer` | sequenziale, dopo 1 | **true** | `docs/ricerca/07-ux-modellatore.md:157`, `:133` |
| 7a · Hermite (`static/risultati.js`) | `frontend-engineer` | **parallelo alla catena 3-4-6-5, dopo il 2** | **false** — una condizione e un ramo lineare; ruling preso e punto di misura dato (R13) | `nessuno — la forma di un modo è geometria del solutore, non UX; il ruling sta in questo piano` |
| 3 · piastra | `frontend-engineer` | sequenziale, dopo 2 | **true** | `docs/ricerca/07-ux-modellatore.md:100`, `:154` |
| 4 · srotolato e curva | `frontend-engineer` | sequenziale, dopo 3 | **true** | `docs/ricerca/07-ux-modellatore.md:133`, `:157` |
| 6 · cache delle misure | `frontend-engineer` | sequenziale, dopo 4 | **false** — memoizzazione e invalidazione esplicita, nessun giudizio di disegno; il ruling sulla cache globale è già preso (R14) | `nessuno — memoizzazione di una lettura del CSS, nessuna ricerca la governa` |
| 5 · cilindri e fotogramma | `frontend-engineer` | sequenziale, dopo 6 | **true** | `docs/ricerca/07-ux-modellatore.md:123` |
| 8 · polish, review, Esito | controller | dopo tutti | **true** | `docs/ricerca/07-ux-modellatore.md:120`, `:126` |

Le catene sono forzate dai file in comune, non dal gusto: 3 e 4 condividono `stile.css` e `fumo.mjs`; 4 e 6 condividono `misure.js`; 5 e 6 condividono `spazio.js`; 4 e 5 condividono `fumo.mjs`. `7a` e `7b` non condividono niente con nessuno (tolto il Task 2 per `risultati.js`), ed è l'unico parallelismo vero della giornata.

Nei brief: i tre riferimenti «nessuno» diventano la riga esatta `- nessun riferimento pertinente`, e il motivo resta qui. Ogni brief nomina `skill-gate`, `caveman` e — chi scrive codice — `ponytail`, e cita almeno un `file.ext:riga` letto nella sessione di dispatch.

### 3. Cosa resta non misurato

- **La geometria della curva della pushover a 46 px**: ne ho misurato il **budget verticale** (riquadro del piano con lo srotolato acceso, R8) ma non i rettangoli dei suoi testi. Il vincolo `M ≥ 1,15 · carattere` dello R10 è **derivato** dalle metriche del glifo misurate (ascesa 43,3, discesa 10,7 a 46 px), non letto da un rendering della curva: il Task 4 lo verifica nel fumo.
- **L'altezza della legenda dei colori in basso**: il clone che ho posato in basso a sinistra ereditava la regola che schiacciava l'originale a 1 px, quindi la sua **larghezza** (847 px) e la sua **quota** sono misurate, l'altezza no — vale 38 px a 46, come in colonna, ma non l'ho letta.
- **Il verbale della critique**: è il Task 1 e resta del `frontend-engineer`; qui non l'ho anticipato. Il difetto dello R5 (legenda tagliata di 88 px) è un rilievo che la critique troverà da sé, e il Task 2 lo chiude comunque.

### 4. Nota sui riferimenti di ricerca

`docs/ricerca/index.md` elenca quindici ricerche; questo piano ne applica **una sola**, la 07, e per una giornata di leggibilità dell'interfaccia è la scelta giusta — le altre quattordici parlano di solutore, dominio, formati e distribuzione. Tre task su nove dichiarano «nessuno», tutti e tre con il motivo scritto. Non è il caso, misurato su NOVA l'08/09, del piano che dichiara «nessuno» a memoria: `index.md` è stato aperto prima di annotare, e gli otto puntamenti alla riga che il piano già portava sono stati verificati uno per uno.
