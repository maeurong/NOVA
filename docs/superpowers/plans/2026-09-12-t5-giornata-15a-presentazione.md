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

## Annotazione dell'architect (12/09/2026)

Worktree `/Users/mario/GitHub/NOVA-wt/interfaccia-15`, ramo `feat/interfaccia-15-presentazione`, HEAD **`d5484aa`**
(questo piano, sopra `f277425`), albero pulito prima e dopo (`git -C … status --short` vuoto). Premesse
**misurate lanciando il codice**: server `.venv/bin/python -P -m nova --porta 8824` (serve
`interfaccia-15/nova/__init__.py`, verificato), Chrome headless pilotato con `tests/fumo/cdp.mjs` a
1920×1080, il CSS del Task 4 **iniettato nella pagina servita** (niente scritto in `static/`), MURO 1 e
MURO 1 pushover corsi davvero (OpenSees `~/.local/bin/OpenSees`). Script: `/tmp/misura15/misura.mjs`,
`/tmp/misura15/compatta.mjs`; contrasto con `/Users/mario/.claude/jobs/4fd80bf5/tmp/viridis-contrasto.py`.
Server e Chrome spenti alla fine. WebGL headless: «ANGLE Metal Renderer: Apple A18 Pro» — i millisecondi
del 3D sono di questa macchina.

**Cosa cambia il piano sta in R1-R8.** Il blocco CSS del Task 4 così com'è fa fallire il fumo: la striscia
esce a 10-12 px e alta 489 px, e `revert` fa riapparire gli elementi `hidden`. Il bordo coassiale del 3D,
come scritto, nasconde il colore. E l'allargamento del riquadro per i nomi, a 46 px, rimpicciolisce il
MURO 1 a 356×253 px.

### 0. Le premesse misurate

**Contrasto su `#dcdad5`** (WCAG, colore composto sul fondo):

| grafica | reso | contrasto |
|---|---|---|
| ombra inchiostro a 0,3 (oggi) | `#a09f9b` | **1,90** — sotto 3:1 |
| ombra a 0,55 (presentazione) | `#6e6d6b` | **3,70** ✅ |
| opacità minima per 3:1 | — | **0,4773** |
| rosso `#b8321e` | — | 4,28 ✅ |
| `--testo-tenue` `#141414a0` | `#5f5e5c` | 4,64 ✅ |
| inchiostro | — | 13,19 |
| bordo inchiostro **sull'ombra** a 0,55 | — | 3,56 ✅ |
| tappe di viridis sull'ombra a 0,55 | — | 2,95 (t=0) → 1,15 (t≈0,44) → 4,09 (t=1) |

0,55 basta. Fuori presentazione l'ombra resta a 1,90 come oggi: la soglia è dell'aula (story 62).

**Layout a 1920×1080 in presentazione** (`getBoundingClientRect`, `clientWidth/Height`):

| | CSS del Task 4 alla lettera | CSS di R1 |
|---|---|---|
| senza corsa: altezza della striscia | 553 px (`.vuoto` a `max-width: 24rem`, `stile.css:241`) | **102 px** |
| MURO 1 statica: piano / striscia | 1151×567 / **489 px** | **1151×944 / 112 px** |
| pushover: piano / srotolato / striscia | 1151×471 / 120 / 489 | **1151×801 / 120 / 159 px** |
| corpo di `select` · `label` · `legend` · `kbd` · `input` | **12 · 11 · 10 · 10 · 12 px** | 32 px tutti |
| `#messaggio` | 19,2 px | 32 px |
| `#piano` / `#spazio` (`clientWidth`) | 1151 / 768 = **1,499** | uguale |
| la pagina scorre | no | no |

A 12 px perché `font-size: 32px` su `body` **non arriva** dove un selettore scrive un corpo suo:
`stile.css:298` (`#risultati-controlli > label`, 11 px), `:299-303` (`#risultati-caso`, `#risultati-scala`,
12 px), `.vincolo-gradi label` 11 px e `legend` 10 px (`:129`, `:152`), `#risultati-vista kbd` 10 px
(`:246`). L'asserzione del fumo `striscia >= 32`, letta su `#risultati-caso`, leggerebbe **12**. A 489 px
perché il `width: 100%` di menu e campo (`:300`) e i radio a due colonne (`:311`) mettono ogni controllo su
una riga sua.

**I pannelli con `display: revert`**: `#pannello-dati` esce `display: block` **con `hidden = true`**.
`revert` torna all'origine del browser, e in Chrome l'attributo `hidden` è un hint di presentazione che lì
non c'è: **gli elementi `hidden` riappaiono** (il vuoto dell'ispettore anche con una selezione, gli editor
vuoti). E la Storia torna (`display: block`), contro P1a.

**Il bottone «pannelli»** a `top/left: 8px` occupa 126×52 px da (8, 8); il titolo dei carichi a 46 px
occupa 518×54 da (8, 6): **lo copre**.

**Le strisce sopra il piano** (`offsetHeight`):

| | titolo | badge | legenda degli stati | somma con i `top` |
|---|---|---|---|---|
| tutto a 46 px, statica (piano 944) | 54 | 54 | 216 | 332 px = 35 % |
| tutto a 46 px, pushover (piano 801) | 54 | 108 | 216 | 386 px = 48 %, + legenda dei colori ≈ 54 → **55 %** |
| titolo e legende a 32, badge a 46 | 38 | 54 / 108 | 114 | 214 / 268 (+38) = 23 % / **38 %** |

**Etichette dei nodi del MURO 1 a 46 px**, con le formule del Task 2 e le `estensione`/`versoLibero` vere
(`piano.js:69`, `:87`; nomi da `tests/fixture/muro_1.nova.json:123-173`: «piede sx», «piede dx», «sommità
sx», «sommità dx»). **Le etichette dei nodi non passano da `disponi`**: le posa `versoLibero` (`:417`);
`disponi` posa solo picchi e carichi (`:576`). Offset `max(16, 7 + 27,6)` = 34,6 px, box da 223-278 × 49
px. **Zero sovrapposizioni** fra etichette, cerchi e simboli, tutte dentro il ritaglio, su ogni riquadro
provato. Il riquadro invece no:

| piano | con l'allargamento del piano (`:315-326`) | minimo che basta |
|---|---|---|
| 1151×567 | non scatta (`W > 2P` falso): telaio 517×368 px | — |
| 1151×944 | scatta: telaio **356×253 px** | 545×387 |
| 1151×801 | scatta: telaio **194×138 px** | 545×387 |

L'extra va su **tutti e due** gli assi (`piano.js:80-81`) ed è calcolato sul lato che comanda; aggiunto,
comanda l'altro lato e `s` cresce. A 11 px non si vede: su 430×770 e 679×989 (le forme del piano a 1280 e
a 1920) il minimo simmetrico e quello solo in x coincidono (e = 390 e 75 mm, stesso telaio). Da qui R3.

**three.js r185** (`static/vendor/three.core.js:6`): `CylinderGeometry(1, 1, 1, 8)` sta sull'asse y,
centrata (box y ∈ [−0,5, 0,5]; `:30019`); `Quaternion.setFromUnitVectors` c'è (`:4337`); `BackSide` = 1
(`:104`); `PointsMaterial.size` × `pixelRatio` (`three.module.js:15272`). **Bordo coassiale**: una colonna
di pixel attraverso un cilindro r=10 inchiostro attorno a uno r=4 giallo:

- come dice il piano (colorato a `renderOrder` maggiore, `depthWrite` normale): **12 righe inchiostro,
  0 gialle** — il colorato sta dentro il bordo e il depth test lo scarta;
- bordo con `side: BackSide`: 4 inchiostro · 4 giallo · 4 inchiostro ✅;
- bordo con `depthWrite: false`: stesso disegno, ma il bordo smette di coprire quel che ha dietro.

**Quanti cilindri**: 4 aste × 4 suddivisioni × 8 campioni = **32 tratti per asta, 128 in tutto** (contati
sulle `polyline.deformata` della pagina corsa); 128 colorati + 128 bordi + 4 aste = **260 mesh**; la
pushover ha la stessa geometria (`muro_1_pushover.nova.json:183-207`). **Costo di un fotogramma** (260
`Mesh` rifatte + `render` + `gl.finish`, 768×591 px, 60 giri): materiali in una `Map` persistente
**0,78 ms** (max 1,5); `Map` svuotata con `dispose()` a ogni giro ma con un `MeshBasicMaterial` fisso ancora
vivo **2,45 ms**; senza nessun materiale vivo **5,15 ms, e 13,7 / 11,6 ms nei primi giri** (il programma si
butta e si ricompila). Colori distinti che `viridis` può rendere: **648** (t campionato a 10⁻⁶).

**Profondità vera nel 3D** (orbita di partenza θ 0,6, φ 1,1, `spazio.js:88`; distanza 4995 mm da
`calcolaInquadratura`): i nodi stanno da 3799 a 6192 mm di profondità. Con `k` preso al centro dell'orbita,
un tratto voluto di 6 px esce **4,84 px** al piede sx e **7,89 px** alla sommità dx: −19 % / +31 %, non
«sotto il pixel». Da qui R6.

**Le misure rese**: su un nodo del MURO 1 a 1920, `r · 2 · getScreenCTM().a` = **10,0000003** contro
`getBoundingClientRect().width` = 10, e `font-size · CTM.a` = 11,0000003; `a = d`, `b = c = 0`. Il metodo
regge; il rumore è ±3·10⁻⁸ relativo e può cadere sotto (R12).

**|u|max a ogni giro**: `puntiDeformata(m, perCaso, 1)` sul MURO 1 con tre stazioni interne per asta (33
punti per asta) costa **0,011-0,034 ms** a chiamata (node, 1000 giri). Da qui R7.

**Le pure del Task 1**: `0.6 * 11 === 6.6` → true; `0.6 * 46` = 27,599999999999998 (il test ha la
tolleranza); `viridis(1/9)` = `#482878` (`pos` = 1 esatto); `viridis(0.5)` = `#23908c`; `conciso(12.34)` =
«12,34» (`numeri.js:182-195`: due decimali sotto 100); la trave del test: `assiDi` (`risultati.js:157-167`)
dà `e2 = (−0, 1)`, quindi `w1 = −4`, `a1 = 3`, Hermite esatto a s = 1 → `hypot` = 5 esatto. Gli oracoli del
Task 1 passano come sono scritti; **il codice no** (R8). Il Task 3 invece ha un oracolo che non passa:
`pixelInMondo(1000, 90, 500)` rende **3,9999999999999996** (`Math.tan(π/4)` = 0,9999999999999999), e
`assert.equal(…, 4)` è rosso → tolleranza `< 1e-9`.

### 1. I puntamenti che non combaciano

Corretti qui, non nel corpo. Nessuno cambia *cosa* fare.

| citato | vero |
|---|---|
| `piano.js:26` `LARGHEZZA_NOMINALE` | **`:29`** |
| `piano.js:186-197` ramo deformata | **`:184-197`** (`:184` è l'`if`) |
| `piano.js:340` ombra | `:340` è il tratto delle aste; l'ombra è **`:344`** |
| `spazio.js:98-107` `ridimensiona` | **`:94-103`** |
| `spazio.js:109-122` `rendi` | **`:105-118`** |
| `stile.css:98-105` `.risultati-legenda` | la regola è **`:103-105`** (`:97-102` il commento) |
| `app.js:835-840` `resize` | il listener apre a **`:836`** |
| `app.js:919-921` | `dispatchVoce` **`:920`**, `annulla` `:921`; la guardia del campo sta a **`:965`** |
| «`risultati.tipo` arriva da `app.js` (Task 4)» | c'è già: `app.js:124` (`tipo: scelto.tipo`). Il Task 4 aggiunge solo `uMax` |
| `07-ux-modellatore.md:157` per i 46 px | la riga dice «scala tipo ×1,6»; i 46 px stanno a **`:133`** e in `PRODUCT.md:96-101` (11 → 46 è ×4,2) |

Combaciano, aperte qui: `risultati.js:87`, `:127`, `:199`, `:224`, `:229`, `:233`, `:345`, `:546`, `:639`;
`app.js:82-83`, `:99`, `:372-378`, `:398`, `:741`, `:747`, `:756`, `:768`, `:864`; `tastiera.js:14-57`,
`:71-88`, `:98`, `:126-139`, `:166-170`, `:172-193`; `tastiera.test.js:56`, `:86`; `piano.test.js:118-156`,
`:416`, `:453-467`, `:1017`, `:1024`; `palette.js:27`; `cdp.mjs:7`, `:29`, `:37-38`, `:41`, `:51`, `:73`;
`fumo.mjs:10-18`, `:27-35`, `:47-51`; `test_fumo_chrome.py:96`, `:135-139`; `stile.css:3-16`, `:20-38`,
`:48-53`, `:57`, `:66`, `:82`, `:93`; `docs/ricerca/index.md:19` (= ricerca 07); `07-ux-modellatore.md:92`,
`:100` (WCAG **1.4.11**, giusto), `:133`, `:154`; spec `:115-117`.

### 2. I rischi, con il ruling

**R1 — Il blocco CSS del Task 4 si sostituisce con questo**, misurato (colonna destra del §0). Nasconde con
`:not([data-pannelli])` invece di riaprire con `revert`; porta a 32 px i controlli che hanno un corpo loro;
mette la striscia in riga; tiene la Storia nascosta anche coi pannelli aperti (P1a).

```css
body[data-presentazione] {
  --nodo-raggio: 7px; --asta-tratto: 6px; --asta-tratto-scelta: 9px;
  --deformata-tratto: 6px; --deformata-bordo: 2px; --etichetta: 46px; --ombra-opacita: 0.55;
  grid-template-columns: 1fr; grid-template-rows: 1fr auto auto auto;
  grid-template-areas: "viste" "striscia" "messaggio" "comando"; font-size: 32px;
}
body[data-presentazione] #barra,
body[data-presentazione]:not([data-pannelli]) #colonna,
body[data-presentazione]:not([data-pannelli]) #pannello > :not(#risultati),
body[data-presentazione] #pannello > :is(#storia-elenco, h2:has(+ #storia-elenco)) { display: none; }
body[data-presentazione] #viste { grid-template-columns: 3fr 2fr; }
body[data-presentazione]:not([data-pannelli]) #pannello { grid-area: striscia; border-left: 0; border-top: 1px solid var(--tratto);
  overflow: visible; padding: calc(var(--passo) / 2) var(--passo); }
body[data-presentazione] :is(#risultati, #messaggio, #comando) :is(label, legend, select, input, kbd, p, span),
body[data-presentazione] #messaggio { font-size: 32px; }
body[data-presentazione] #risultati .vuoto { max-width: none; margin: 0; padding: 0; }
body[data-presentazione]:not([data-pannelli]) #risultati-controlli:not([hidden]) { display: flex; flex-wrap: wrap; gap: 0 1em; align-items: baseline; }
body[data-presentazione]:not([data-pannelli]) #risultati-controlli > label { display: inline; margin: 0; }
body[data-presentazione]:not([data-pannelli]) :is(#risultati-caso, #risultati-scala) { width: auto; }
body[data-presentazione]:not([data-pannelli]) #risultati-scala { width: 5em; }
body[data-presentazione]:not([data-pannelli]) #risultati-vista { display: flex; gap: 0 0.75em; align-items: baseline; margin: 0; }
body[data-presentazione]:not([data-pannelli]) #risultati-vista legend { float: left; margin: 0 0.25em 0 0; }
body[data-presentazione]:not([data-pannelli]) #risultati-equilibrio { margin: 0; }
body[data-presentazione][data-pannelli] { grid-template-columns: minmax(180px, 22rem) 1fr minmax(220px, 30rem);
  grid-template-rows: 1fr auto auto; grid-template-areas: "albero viste pannello" "messaggio messaggio messaggio" "comando comando comando"; }
body[data-presentazione] #piano :is(.carichi-titolo, .risultati-legenda, .risultati-colori) { font-size: 32px; }
#riapri-pannelli { display: none; }
body[data-presentazione] #riapri-pannelli { display: block; position: fixed; top: var(--passo); right: var(--passo); z-index: 2; font: inherit; font-size: 32px; }
```

`float` sulla `legend`: una legenda flottante smette di essere la legenda del fieldset e diventa un figlio
del flex (misurato: sta in riga). Coi pannelli aperti, misurato dopo `G`: Storia `none`, «Niente di
selezionato» resta `hidden`, `#pannello-dati` visibile. Le ultime tre regole (strisce a 32, bottone)
vengono da R2 e R9. **Costo se sbaglio:** il fumo rosso su `striscia >= 32`, il piano più basso del 40 %, e
coi pannelli aperti blocchi `hidden` in vista.

**R2 — Il bottone «pannelli» va in alto a destra**, sopra il 3D (regola in R1): a sinistra copre il titolo
dei carichi (misurato). Il 3D non ha niente in quell'angolo (`spazio.js:77`: il solo canvas) — posizione
**non misurata**, la prova il Task 5. Il bottone è primo nel DOM (`index.html`, prima di `#colonna`), quindi
in presentazione è la prima fermata di ⇥: WCAG 2.4.3 regge. 126×52 px ≥ 24: 2.5.8 regge. **Costo se
sbaglio:** il nome dell'azione illeggibile in aula.

**R3 — L'allargamento per i nomi va solo in x, calcolato sempre sulla larghezza** (Task 2). Il nome sta di
fianco al nodo (`versoLibero`: ←, →, ↖, ↗ sul MURO 1), e l'extra in z serve solo a far comandare l'altro
lato:

```js
// piano.js, estensione (:81): l'extra è dei nomi dei nodi, che stanno di fianco — in z non va.
  const mx = larghezza * MARGINE + extra, mz = altezza * MARGINE;
```

```js
// piano.js, disegna (:317-318): sempre la larghezza. Col lato che comanda, a 46 px l'extra finiva
// anche in z, comandava l'altro lato e il MURO 1 usciva 356×253 px su 1151×944 (minimo: 545×387).
    const W = pxL, L0 = vista.larghezza;
```

(`orizzontale` sparisce.) Nessun test chiama `estensione` col terzo argomento (`piano.test.js:79-107`).
Fuori presentazione, sui riquadri alti — l'unica forma che il piano ha a 1280 e a 1920 — il telaio esce
identico (misurato); cambia solo in un riquadro più largo che alto, dove oggi il conto usava l'altezza per
un'etichetta che è larga. **Costo se sbaglio:** in aula il telaio occupa il 31 % della larghezza del piano
(statica) o il 17 % (pushover).

**R4 — Il bordo del 3D è un cilindro coassiale con `side: THREE.BackSide`** (Task 3), senza
`renderOrder` né `depthWrite`: le sole facce posteriori del cilindro grosso lasciano passare il colorato al
centro e restano scure ai lati (misurato 4 · 4 · 4). Il `renderOrder` del piano rende un tubo nero.
**Costo se sbaglio:** nel 3D nessun colore, la legenda del piano non ha niente a cui riferirsi.

**R5 — I materiali di viridis stanno in una `Map` persistente, mai svuotata né buttata.** Il tetto è
misurato: 648 colori. Svuotarla a ogni `disegna` costa 3× (2,45 contro 0,78 ms), e se in scena non resta
un `MeshBasicMaterial` vivo il programma si ricompila (13,7 ms nei primi giri: fotogramma sforato). Il
materiale dell'ombra resta uno solo, trasparente a `misure.ombra`, riscritto a ogni `disegna`. Cambia
l'ingresso degenere del Task 3 (§7).

**R6 — Nel 3D lo spessore si misura sull'estremo più lontano di ogni cilindro**, non al centro
dell'orbita: su profondità vera lo scarto è −19 % / +31 % e l'asta lontana scende a 4,84 px, sotto i 6
della story. In `rendi()`, prima di `renderer.render`, con `userData.estremi = [a, b]` (due `Vector3`)
scritto da `cilindroFra`:

```js
    // ponytail: la distanza euclidea dell'estremo lontano, non la profondità lungo l'asse della camera:
    // è più grande, quindi il tratto esce appena più spesso e mai più sottile del voluto. Il capo vicino
    // ingrossa: è la prospettiva.
    for (const o of disegnato.children) if (o.userData.tratto) {
      const lontano = Math.max(...o.userData.estremi.map((p) => camera.position.distanceTo(p)));
      o.scale.x = o.scale.z = pixelInMondo(lontano, camera.fov, contenitore.clientHeight) * o.userData.tratto / 2;
    }
```

**Costo se sbaglio:** metà del telaio sotto soglia proprio nella vista che l'aula guarda di più.

**R7 — |u|max senza cache per caso e modo, e solo in vista deformata.** 0,011-0,034 ms a chiamata sul
MURO 1 contro 16,7 ms di fotogramma: una cache vorrebbe una chiave, e il `perCaso` di un modo è un oggetto
nuovo a ogni `casoScelto` (`risultati.js:562`). La pushover resta in cache accanto a `scalaCache`
(`app.js:82`) come scritto. In M/V/N `uMax` non si calcola: sta nello stesso ramo di `scalaDeformata`
(`app.js:109-112`). **Costo se sbaglio:** su un telaio di 80 aste ≈ 0,7 ms a fotogramma; misurabile, non
bloccante.

**R8 — `puntiDeformata`: `uy` si dichiara prima di `y`.** Il piano mette `const uy = …` al posto del `push`
(`:233`) e chiede a `const y` (`:229`) di usarlo: così è una `ReferenceError` (TDZ) al primo punto. Ordine
giusto: `const uy = (1 - s) * q0.u[1] + s * q1.u[1];` subito prima di `:229`, e `:229` diventa
`i.y + r * (j.y - i.y) + scala * uy`. **Costo se sbaglio:** ogni vista deformata solleva.

**R9 — Le misure dell'SVG: fuori dall'aula il disegno resta quello d'oggi, ripieghi compresi** (Task 2).
Ogni ripiego del DOM finto, a 11 px, deve dare il numero d'oggi:

- titolo: `titolo.offsetHeight || misure.carattere + 9` (= 20, `piano.js:489`);
- badge: `top = 6 + Math.max(16, titolo.offsetHeight || misure.carattere + 5)` (= 22 col titolo nascosto,
  come `stile.css:93`). Il piano scrive `6 + altoTitolo`, che col titolo nascosto dà 6 e sposta il badge
  **anche fuori dall'aula**; l'ingresso degenere «titolo nascosto → badge a `top = 6`» del Task 2 diventa
  «→ `top = 22` a 11 px»;
- riga del badge `badge.offsetHeight || misure.carattere + 3` (= 14, `:476`); legenda
  `|| 2 * (misure.carattere + 3)` (= 28, `:485`);
- picchi e freccia: `font-size: misure.carattere * s` (`:584`) e `altezza: (misure.carattere + 3) * s`
  (`:575`) — il piano nomina solo le etichette dei nodi, ma picchi a 11 px accanto a nomi da 46 non si
  leggono da 8 m;
- `RAGGIO` resta nei simboli dei vincoli (`:497`) e nel cerchio del ghost (`:363`): «i simboli restano come
  sono». `misure.raggioNodo` va solo a `:408` e `:411`;
- `div.risultati-colori` si appende **in coda** a `replaceChildren` (`:133`): `badgeDi` = `_figli[2]`
  (`piano.test.js:416`) e `legendaDi` = `_figli[3]` (`:1017`) restano validi;
- `.risultati-colori svg { width: 6em; height: 0.6em; }` invece di 120×10 fissi: a 32 px un'altezza di 10 è
  un filo;
- le strisce sopra il piano: il badge a `var(--etichetta)` (è la scala stampata della story 62); titolo,
  legenda degli stati e legenda dei colori a 32 px in presentazione (regola in R1), 11 px fuori. Misurato:
  sulla pushover il testo sopra il piano passa dal 55 % al 38 % dell'altezza.

**Costo se sbaglio:** i test d'oggi restano verdi ma il disegno fuori dall'aula cambia senza che nessuno se
ne accorga, oppure sulla pushover in aula metà piano è testo e i picchi non trovano posto.

**R10 — Nel 3D il disegno cambia anche fuori dall'aula**, per come il piano l'ha costruito: le aste passano
da una `Line` di 1 px (`spazio.js:167`) a cilindri di 2 px, e i nodi, con `size = 2 · raggioNodo`, da 6 a
10 px (inchiostro) e da 10 a 16 px (rosso) — le misure del piano SVG. «Il disegno non cambia di un pixel»
vale per l'SVG; per il 3D è un cambio dichiarato, da scrivere nell'Esito. Nessun ripiego apposta (P7a).

**R11 — `Esc` dopo la selezione.** `G` non è un gesto: `annulla` guarda solo `modo` e `comando`
(`app.js:921`), quindi `G` poi `Esc` esce dalla presentazione e il copione regge. Il suo commento
(«chiude la selezione? no…») va riscritto come frase. `P` sta sotto la guardia del campo (`:965`) e sopra
quella del modo, come `vista`: in modo asta `P` alterna — accettato.

**R12 — Il fumo con tolleranza e senza copie.** `reso(...)` legge 46,0000003 oppure 45,9999997, secondo il
CTM: soglie `>= 45.99`, `>= 5.99`, `>= 13.99`. `apriECorri(fixture, dimensioni)` passa le dimensioni ad
`apri(url, arg.cdp, dimensioni)`: niente «come apriECorri» ricopiato. `proporzione` misurata 1,499 ✅;
`strisciaSotto` ✅ (il pannello comincia a y 968, dove finiscono le viste).

**R13 — La palette.** `filtraVoci` dà 120 al tasto uguale alla query (`palette.js:27`): con «p»
`presentazione` scavalca `pausa` (100 per `codice`). Vale solo per la query di una lettera; «pa» e «pau»
restano a `pausa`. Accettato: è la regola di «n» → nodo.

**R14 — (g), (h), (i).** Pushover con |u|max fisso sul passo di riferimento: al passo 1 tutto viola, ed è
giusto, perché la legenda non respira. Deformata sopra l'ombra: il bordo inchiostro stacca l'ombra a 3,56:1;
le tappe basse di viridis sull'ombra scendono a 1,15, ma la forma la porta il bordo, e in B/N anche il
colore. WebGL assente: `assente` rende `disegna() {}` (`spazio.js:192-199`); `pixelInMondo` e `tratti` stanno
fuori da `costruisci`, quindi `spazio.test.js` le importa senza three.

### 3. Le domande aperte (senza ruling)

- **Il fuoco sul menu del caso.** Scelto il caso col mouse, il fuoco resta sul `select`, che si tiene le
  lettere (`tastiera.js:136`: `select` è «testuale»). `P` per uscire salta all'opzione «pushover» e **cambia
  il caso**; `Esc` non esce. Il rimedio (un `select` che lascia passare le lettere di comando) tocca tutti i
  menu dell'editor: decide l'autore, dopo la prova del Task 5.
- **Lo srotolato in presentazione**: 24 px con la statica, 120 con la pushover (la curva). P1a non lo
  nomina; oggi resta.
- **Le soglie nel 3D**: il fumo le misura solo sull'SVG. Nel 3D le reggono R6 e la prova a mano.

### 4. Chi esegue, con quale modello, in quale ordine

| Task | Subagente | Modello | Parallelo? | Skill-gate | Riferimento |
|---|---|---|---|---|---|
| 1 — `misure.js`, viridis, \|u\| per punto, `P` (R8) | `frontend-engineer` | `sonnet` | no, primo | **sì** | `docs/ricerca/07-ux-modellatore.md:154` |
| 2 — piano: misure, deformata in viridis, legenda, allargamento (R3, R9) | `frontend-engineer`, con `impeccable` | **`opus`** | **‖ Task 3**, dopo 1 | **sì** | `docs/ricerca/07-ux-modellatore.md:154` |
| 3 — 3D: cilindri, `BackSide`, spessore sull'estremo, `Map` persistente (R4-R6) | `frontend-engineer` | **`opus`** | **‖ Task 2**, dopo 1 | **sì** | `docs/ricerca/07-ux-modellatore.md:157` |
| 4 — CSS di R1, `P`/`Esc`, bottone, `uMax`, fumo (R1, R2, R7, R11, R12) | `frontend-engineer`, con `impeccable` | **`opus`** | no, dopo 2 **e** 3 | **sì** | `docs/ricerca/07-ux-modellatore.md:133` |
| 5 — prova a 1920 e al 25 %, review di ramo, Esito | controller | — | ultimo | — | `docs/ricerca/07-ux-modellatore.md:133` |

Riferimenti secondari per il brief: Task 2 anche `:100` (doppio canale) e `:133`; Task 4 anche `:157` e
`:92`.

**Disgiunzione, file per file.** Task 2 scrive `static/piano.js`, `static/stile.css` (solo
`.risultati-colori` e il `font-size` di `:83`, `:94`, `:104`), `static/test/piano.test.js`. Task 3 scrive
`static/spazio.js`, `static/test/spazio.test.js`. Tutti e due **leggono** `misure.js` e `risultati.js`,
nessuno li scrive: 2 ‖ 3 regge. Il Task 4 scrive `stile.css` **dopo** il Task 2 (stesso file) e `app.js`,
che passa `uMax` a entrambi: dopo tutti e due.

**Perché `opus` su 2, 3 e 4:** ognuno deve decidere mentre scrive — ripieghi che a 11 px diano i numeri
d'oggi (R9) e un allargamento che cambia asse (R3); profondità, facce e materiali del 3D (R4-R6); un CSS che
il fumo misura al pixel (R1). Il Task 1 ha oracoli e codice già scritti, verificati al §0, più una riga da
spostare (R8): `sonnet` basta.

### 5. La ricerca che regge ogni task

Aperte e confrontate: `07-ux-modellatore.md:92` (Figma «Minimize UI», pannelli che si ritraggono) ✅;
`:100` (doppio canale, WCAG **1.4.11** ≥ 3:1 sulla grafica) ✅; `:133` (ISO 9241-303, proav 4 mm/m, 20
arcmin ≈ 45 px su 2 m letti da 8 m) ✅; `:154` (principio 7: viridis, mai rainbow, stampabile in B/N) ✅;
`:157` (principio 10: modo presentazione, pannelli ritratti, contrasto ≥ 3:1) ✅ — ma il suo «×1,6» non è il
numero del piano: i 46 px vengono da `:133`. Nessun task senza riferimento.

### 6. I test del piano, letti col DOM finto in mano

- **Task 1**: tutti gli oracoli passano (§0). L'unico rosso sarebbe il codice (R8).
- **Task 2, test esistenti che cambiano.** `piano.test.js:453-467`: `polilinee.length === 1` regge (è il
  bordo), **`stroke-dasharray` no** (il bordo non è tratteggiato) → diventa «bordo senza tratteggio, otto
  `line.deformata`». `:532-533` (una polilinea con spostamenti vuoti) regge, e ora ha anche 8
  `line.deformata` alla tappa bassa. `:958` regge. `:1024` `ultimoPunto` prende la prima `polyline`, che è
  il bordo coi punti di sempre: **nessuna modifica**. Nessuna asserzione su `stroke-width`, `r` o
  `font-size` assoluti (`:1075` confronta due `stroke-width` fra loro).
- **Task 2, test nuovo 7**: ripiego del titolo `carattere + 9`, top del badge
  `6 + max(16, carattere + 5)` (R9) — a 46 px `top` 57, non «6 + 55».
- **Task 2, test nuovo sull'allargamento** (R3): MURO 1 su un contenitore 1151×944 con `--etichetta 46px` →
  `2262 / s ≥ 540`.
- **Task 3, test 1**: `pixelInMondo(1000, 90, 500)` = 3,9999999999999996 → `Math.abs(… - 4) < 1e-9`, non
  `assert.equal`.
- **`tastiera.test.js:56`** → `"w"`. `:86` (`p` col comando → null) regge. «Nessuna coppia
  tasto+modificatore due volte» e «ogni voce si raggiunge da un evento» reggono con `P`.
  `palette.test.js` conta `TASTI.length` (`:13`, `:19`, `:131`, `:220`, `:241`): regge da solo.

### 7. Firme e contratto degli ingressi

- `spazio.js` consuma anche `massimoSpostamento` (l'ingresso «`deformata.uMax` assente» lo usa): va
  nell'`import`, il contratto nomina solo `leggiMisure` e `coloreSpostamento`.
- `tratti(punti, uMax)` rende `a`/`b` come `{x, y, z}`; `cilindroFra` vuole `Vector3`: la conversione sta in
  `disegna`, non nella pura.
- `leggiMisure(globalThis.getComputedStyle?.(contenitore))` nel piano e nello spazio: le variabili stanno su
  `body` ed ereditano nei due contenitori ✅.
- `testoScalaColori({ uMax, tipo })` con `tipo` ∈ `"caso" | "modo" | "pushover"` (`risultati.js:553-565`) ✅.

Ingressi degeneri **in più**, da aggiungere alle sezioni dei task:

- Task 2 — MURO 1 su 1151×944 a 46 px → telaio largo ≥ 540 px, nessuna etichetta fuori dal ritaglio.
- Task 2 — titolo nascosto a 11 px → badge a `top` 22, come oggi (sostituisce «→ `top = 6`»).
- Task 3 — cilindro con gli estremi a distanze diverse dalla camera → raggio preso dall'estremo lontano,
  mai sotto `tratto / 2` px.
- Task 3 — cento `disegna` sugli stessi colori → nessun `MeshBasicMaterial` nuovo dopo il primo giro, la
  `Map` non supera i colori distinti già visti (sostituisce «svuotata e i materiali `dispose()`»).
- Task 4 — `P` col fuoco sul bottone «pannelli» → alterna (un bottone si tiene solo Invio, Spazio e ⌫).
- Task 4 — pannelli aperti con una selezione → «Niente di selezionato» resta nascosto, Storia nascosta.

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
