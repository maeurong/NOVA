# NOVA T5 — giornata 14a: modi animati e pushover

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** dopo una corsa con la modale, i **modi** entrano nel menu del caso («modo 2 · 31,85 Hz · ux 46 %») e la vista deformata li **anima** (parte da sola, `Spazio` la ferma e la riprende, ampiezza = la scala auto dichiarata nel badge con frequenza, periodo e massa partecipante accanto); dopo una corsa con la pushover, il caso «pushover» mostra la **curva taglio–spostamento** nella striscia sotto il piano con i passi cliccabili e `←`/`→` che li scorrono, la deformata del piano e del 3D che segue il passo (scrubber), lo **stato delle sezioni** per stazione a due canali (calcestruzzo: elastica/fessurata/schiacciata; acciaio: elastica/snervata/rotta) disegnato sull'asta deformata con una legenda, e la **caduta** segnata come fatto. Spostamenti del nodo per passo e forma modale per nodo nell'ispettore. Verifica: MURO 1 — il modo 2 nel piano animato; la pushover scorsa con lo scrubber; il fumo in Chrome lo prova.

**Architecture:** nessun cambio nel server: i modi (`modi[] = {n, f, T, forma{"<id>": [ux,uy,uz]}, massa_partecipante, cumulata}`, `nova/modale.py:60-97`) e la pushover (`passi[] = {n, spostamento, taglio_base, spostamenti{"<id>": [6]}, stato_sezioni{"<id asta>": [{calcestruzzo, acciaio}, …]}, algoritmo, incremento}`, `caduta`, `run.pushover.u0`, `nova/passi.py:187-252`) arrivano già in `lavoro.fin.risultati`. Il **caso** scelto (`risultati.caso` in `app.js`) diventa una chiave a tre forme: un caso statico (`"Z1"`), un modo (`"modo:2"`), la pushover (`"pushover"`); una funzione pura `casoScelto(risultati, caso, passo)` in `static/risultati.js` traduce ognuna in un `perCaso` **sintetico** (`{spostamenti}`) che piano, spazio, pannello e striscia già sanno disegnare — la forma modale è una deformata, il passo della pushover è una deformata. L'animazione è un modulo puro `static/animazione.js` (fase sinusoidale, `prefers-reduced-motion`, un ciclo al secondo) più un ciclo `requestAnimationFrame` in `app.js` che ridisegna solo piano e spazio con un `fattore` moltiplicativo della scala. La curva della pushover vive nella striscia (`static/esito.js` `creaSrotolato`, come oggi l'M srotolato), in pixel. Lo stato delle sezioni si disegna in `piano.js` sui punti della deformata (`r` = `x_rel` dei punti di `puntiDeformata`) con un simbolo a due canali. Il fumo prova modale e pushover sul MURO 1.

**Tech Stack:** moduli ES nativi, `node --test` col DOM finto di `piano.test.js`/`esito.test.js`, pytest + Chrome headless via CDP (`tests/fumo/`), three.js vendorizzato.

**Spec:** `docs/superpowers/specs/2026-09-05-nova-v1-design.md` — story 45 (riga 86: modi animati con frequenza e massa accanto e tasti per cambiarli — **i tasti `1 2 3` sono già le viste**, decisione D1a dell'autore: i modi stanno nel menu del caso), 48 (riga 92: curva con passi cliccabili e scrubber), 49 (riga 93: stato delle sezioni a quattro valori su due canali — il codice ne ha 3+3 per canale, `nova/passi.py:31-32`; decisione D4a: si tengono 3+3 e si disegnano su due canali), 50 (riga 94: la caduta dichiarata), 63 (un solo rosso, tratteggio), 64 (unità). «Risultati per corsa» righe 186-202 (`modi`, `passi`, `caduta`, `u0`: `passi[].spostamento` relativo a `u0`, `passi[].spostamenti[nodo]` assoluti). Calendario: `docs/superpowers/plans/2026-09-06-t5-interfaccia-bozza.md:21` (giornata 14; il Confronto è la 14b, decisione D8).

**Ricerca che questo piano applica** (`docs/ricerca/index.md:19`, ricerca 07; `:23`, ricerca 11): `07-ux-modellatore.md:103` (SAP2000: animazione con slider di velocità; modi a scala dichiarata, massa partecipante accanto al numero, NTC 7.3.3.1 85 %), `:99` (scala sempre stampata), `:100` (doppio canale: colore **e** forma), `:105` (Tufte, data-ink), `11-modi-sulla-tangente-opensees.md:212-226` (frequenze non fisiche: dalla PR #80 un modo con λ ≤ 0 ha `f: null`).

**Decisioni dell'autore (11/09, D1-D8):** D1a modi nel menu del caso, animati dalla vista deformata; D2a l'animazione parte da sola, `Spazio` ferma/riprende, ampiezza = scala auto, un ciclo al secondo, `prefers-reduced-motion` → ferma sul massimo; D3a tutti i modi nel menu con la massa accanto, i primi tre in testa; D4a stato 3+3 su due canali con simbolo; D5a curva nella striscia `#srotolato`, clic e `←`/`→` sul passo, deformata che segue; D6a/D7a Confronto rinviato alla 14b; D8 sì.

**Ramo:** `feat/interfaccia-14a-modi-pushover` da `main` `2a2a44a`, worktree `/Users/mario/GitHub/NOVA-wt/interfaccia-14a` (venv pronto, `nova ok 3.12.13`). PR verso `main`; merge solo con via libera dell'autore.

## Annotazione dell'architect (11/09/2026)

Scritta nel worktree `/Users/mario/GitHub/NOVA-wt/interfaccia-14a`, ramo
`feat/interfaccia-14a-modi-pushover`, HEAD **`ae93005`** (padre `2a2a44a`, il merge della PR #80 su
`main`; il solo file cambiato fra i due è questo piano). Ogni `file:riga` citata dal piano è stata
aperta contro il codice a `2a2a44a`: la sezione 1 elenca le dodici che non combaciavano, già
corrette nel testo. Punti di partenza **rimisurati qui**, non ricordati: `node --test` sui
ventitré file di `static/test/` → **761 pass, 0 fail** (406 ms); pytest sull'intera `tests/` →
**741 passed, 3 skipped in 106,76 s**, i tre skip tutti `lab_telaio_v2/wall_model.inp` non
versionato; `tests/test_fumo_chrome.py` ne raccoglie **16**. Tutte e tre le cifre dei Global
Constraints erano giuste e ora portano la data.

**La cosa che conta di più sta in R1-R3, ed è misurata sul MURO 1, non dedotta.** Il piano dà per
scontato che scegliere un modo dal menu lo faccia vedere. Su 42 modi del MURO 1, **venti non hanno
componente nel piano** e con `scalaAuto` uscirebbero «×1 (auto)», cioè indistinguibili
dall'ombra — e fra loro ci sono il modo 1 e il modo 3, due dei tre che il Task 5 chiede di
guardare a mano. **Nove** hanno la forma identicamente nulla sui nodi del modello: nessuna scala
li rende visibili. E la massa del modo 2, scritta «92 %» in quattro punti del piano, è
**45,6 %**.

### 0. Le due premesse che ho verificato per prime, perché tutto il resto ci poggia

**La forma modale è adimensionale e di ordine uno, non è in mm.** `nova/modale.py:86` legge
`modo_k.out`, che il deck scrive con `-unorm`: tre componenti per nodo, nessuna rotazione (il file
ha `3·n_nodi` colonne, non sei). Misurato l'11/09/2026, telaio 2×1 con tre modi: `max|forma|` =
0,499 / 0,665 / 0,465. MURO 1, 42 modi: 2,03 / 2,12 / 2,80 sui primi tre. Ordine uno, con
entrambi i segni. Quindi «5 % del lato = ampiezza» è la famiglia giusta — `scala125(0,05 · 2262 /
2,12) = 50`, ampiezza 106 mm su 2262, cioè il 4,7 % — **a patto** che il massimo si misuri sulla
componente giusta (R1).

**La forma modale è lineare fra i nodi, e non c'è niente da fare.** Due ragioni indipendenti, tutte
e due verificate: `forma` porta le chiavi di `tag_a_id`, cioè i soli nodi che l'utente ha disegnato
(`nova/modale.py:94`, e il docstring a `:66-67` lo dice per esteso), quindi i nodi delle
`suddivisioni` non ci sono; e `formaComeSpostamenti` mette le rotazioni a zero, quindi la cubica di
Hermite di `puntiDeformata` (`risultati.js:224`) degenera nella retta — con `p0 = p1 = 0` restano
i soli termini `(1 − 3s² + 2s³)w0 + (3s² − 2s³)w1`, che sommano a un'interpolazione lineare.
Misurato sul MURO 1: il modo 2 ha `forma` = {1: 0, 2: 0, 3: −2,1175, 4: −2,1175}, cioè i due
pilastri sono due segmenti inclinati e il traverso trasla — **un parallelogramma**, mentre la
deformata statica dello stesso muro passa per 3 stazioni interne
(`per_caso[C1].spostamenti_interni["1"]` ne ha tre, misurate). Vedi R4.

### 1. I puntamenti che non combaciavano

Dodici, tutte corrette nel testo. Nessuna cambia *cosa* fare; una (la nona) cambia *cosa* si
scrive in pagina.

| citato | vero | dove |
|---|---|---|
| `nova/modale.py:59-93` = il dizionario dei modi | **`:60-97`** (`leggi` apre a 60, il dizionario è 92-97) | riga 7, «Architecture» |
| `nova/modale.py:88-93` = le chiavi dei modi | **`:92-97`** (88-91 è il commento dell'issue #65) | riga 21, Global Constraints |
| `nova/passi.py:236-251` = `passi[k]`, `caduta`, `u0` | **`:236-252`** (`caduta` e `u0` escono a 252) | riga 21 |
| spec riga 84 = story 45 | **riga 86** (la 84 è la story 43, i modi «auto» fino all'85 %) | riga 11, «Spec» |
| spec righe 186-203 | **186-202** (203 è vuota; il contratto di `u0` è a 202) | riga 11 |
| `static/risultati.js:36-59` = `spostamenti_interni` | **`:46-59`** (36-45 è la coda di `latoMaggiore`) | riga 38 |
| `static/app.js:635-650` = `perCasoDelloStato` e `disegnaPiano` | **`:635-652`** (il `return inVista` è a 651-652) | riga 37 |
| `static/app.js:654-702` = `ridisegna` | **`:654-705`** | riga 37 |
| `static/piano.js:120-126` = il badge | **`:119-127`** (il `replaceChildren` che il Task 2 riscrive è la 127) | riga 39 |
| `static/tastiera.js:109-120` = `daControllo` | **`:114-125`**; la riga che decide su `Spazio` è **`:93`** (`ATTIVANO`) | righe 27 e 43 |
| `docs/caso-studio/README.md:200-211` = la pushover | **`:198-209`** (200 è la riga degli algoritmi, 211 è già la prosa dopo) | riga 47 |
| `11-modi-sulla-tangente-opensees.md:212-223` | **`:212-226`** (il blocco verbatim con `nan` chiude a 226) | righe 13 e 370 |

E due numeri sbagliati dentro i test scritti nel piano, che sarebbero caduti al primo giro:
`conciso(0,0314)` rende **«0,0314»**, non «0,031» (`numeri.js:182-195`: sotto 1 sono quattro
decimali, poi `senzaZeriInCoda`), quindi il badge del modo dice `T 0,0314 s` — corretto nelle
righe 68, 161 e 162; e `conciso` usa il **meno ASCII**, non U+2212, quindi il commento del
contratto che scrive «uz −0,03» descrive un'uscita che non esiste (il test alla riga 171 aveva
già la grafia giusta, `-0,03`).

**Combaciano invece**, aperte una per una in questa sessione e da non rileggere:
`nova/passi.py` `:31-32` (le due scale, nell'ordine dal meno grave al più grave), `:147-184`
`stato_sezioni` (con il salto della prima stazione interna a `:171-172`), `:187-252` `leggi`;
`nova/deck.py:33-34`; `nova/corsa.py:369-371` (`per_caso`, `modi`, `passi`, `caduta`) e `:365`
(`run.pushover.u0`); `static/app.js` `:57-77`, `:271-276`, `:684-685`, `:688-697`, `:702`,
`:714-717`, `:752-758`, `:770-780`, `:841-853`; `static/risultati.js` `:14`, `:18`, `:127`,
`:199`, `:345-353`, `:361`, `:377`, `:388`; `static/piano.js` `:161-250`, `:178-198`, `:251`,
`:400-402`, `:418`; `static/esito.js` `:12-67`, `:76-138` (con `W = clientWidth || 200`, `H = 96`,
`M = 14` a `:112`, e nessun `viewBox`, `:101-106`); `static/spazio.js:140-177` (e
`calcolaInquadratura` guarda i nodi **indeformati**, `:180`: l'inquadratura non balla durante
l'animazione); `static/pannello.js:40-49`; `static/tastiera.js` `:27`, `:78`, `:157-172`;
`static/index.html` `:41-43`, `:92-109`; `static/stile.css:66-73`; `static/legame.js:45-69`;
`static/test/piano.test.js:117-156`; `tests/fumo/fumo.mjs:33-63`;
`tests/test_fumo_chrome.py:99-104`; `tests/test_pushover_binario.py:24-31`;
`docs/caso-studio/README.md:142-152`; spec righe 92, 93, 94;
`docs/superpowers/plans/2026-09-06-t5-interfaccia-bozza.md:21`; `docs/ricerca/index.md:19` e
`:23`; `07-ux-modellatore.md` `:99`, `:100`, `:103`, `:105` — **tutte e quattro esatte**.

Una premessa del piano che **non è una riga sbagliata ma un'assenza**: `pianoFinto()`
(`piano.test.js:153-157`) rende `{ piano, svg, titolo }` e **non** `contenitore`, mentre i test del
Task 2 scritti nel piano lo destrutturano. I test della 13 che guardano il badge non usano
`pianoFinto`: costruiscono il contenitore a mano (`piano.test.js:416-418`, `:451-453`). I test
riscritti nella sezione 6 seguono quella strada.

### 2. I rischi, con il loro ruling

**R1 — `scalaAuto` non dimensiona un modo: misura solo il piano, e venti modi su 42 non ce
l'hanno.** *Ruling: entra `scalaModo(m, modo, frazione = 0.05)` in `risultati.js`, e
`risultatiInVista` la usa al posto di `scalaAuto` quando il caso è un modo.* `scalaAuto` passa da
`frecciaMassima` (`risultati.js:87-119`), che misura `hypot(p.x − base.x, p.z − base.z)`: la
componente `y` **non entra**, perché per una deformata statica nel piano non serve. Un modo fuori
piano ha `ux = uz = 0` per costruzione, quindi `valore` cade sotto `RUMORE · latoMaggiore`
(`:117`) e `scalaAuto` rende **1**. *Misurato l'11/09/2026 sul MURO 1, 42 modi:*

| modo | f [Hz] | direzione | `max\|forma\|` | massimo nel piano | `scalaAuto` | con `scalaModo` |
|---|---|---|---|---|---|---|
| 1 | 20,45 | uy | 2,030 | 2,2e-14 | **1** | 50 |
| 2 | 31,85 | ux | 2,118 | 2,118 | 50 | 50 |
| 3 | 35,85 | — (massa nulla) | 2,800 | 1,0e-13 | **1** | 50 |
| 5 | 87,07 | uz | 0,0751 | 0,0757 | 2000 | 2000 |

Venti modi su 42 stanno nella riga del modo 1. *Costo se sbagliato*: si sceglie «modo 1 · 20,45 Hz»
dal menu, il badge dice «×1 (auto)», il piano disegna una figura sovrapposta all'ombra e il 3D pure
— perché la scala è **una sola** e `spazio.js` riceve la stessa (`app.js:684-685`). Nessun test JS
lo prende: `scalaAuto` con quel `perCaso` rende 1 e 1 è la risposta giusta *per una statica*. Lo
vedrebbe solo l'occhio del Task 5, e su un modo fuori piano «non si muove» si legge come «modo
locale», non come difetto. Ponytail: `scalaModo` sono quattro righe e riusa `scala125` e
`latoMaggiore` che già ci sono; non tocca `scalaAuto`, che per i casi statici resta giusta.

**R2 — nove modi su 42 hanno la forma identicamente nulla sui nodi del modello.** *Ruling: si
mostrano lo stesso, e la voce del menu e il badge lo dicono in parole.* Misurato: modi **6, 8, 16,
17, 25, 26, 27, 35, 37** del MURO 1 hanno `forma` = 0 su tutti e quattro i nodi — il modo vive
tutto sui nodi delle `suddivisioni`, che `forma` non porta (§0). Nessuna scala li salva: anche
`scalaModo` rende 1, correttamente, perché non c'è niente da amplificare. *Ruling operativo*:
`scalaModo` che trova `dmax = 0` rende `1`, e il badge aggiunge **« · forma nulla sui nodi del
modello»**; la voce del menu resta com'è (la frequenza e la massa sono vere e servono). *Costo se
sbagliato*: il modo 6 del MURO 1 partecipa il **39,8 %** della massa in `y` — è un modo che conta,
e mostrarlo come una figura ferma senza dire perché fa credere che l'animazione sia rotta. Dirlo
costa una stringa; tacerlo costa la fiducia in tutta la vista.

**R3 — «ux 92 %» è inventato: il modo 2 del MURO 1 partecipa il 45,6 %, e il modo 3 non partecipa
affatto.** *Ruling: il numero diventa 46 % nel Goal, nel contratto e nel fumo; e `percento`
arrotonda all'intero, mentre sotto l'1 % la voce dice «massa trascurabile» invece di una
direzione.* Misurato: modo 2 → `{x: 0,456215, y: 0, z: 0}`; modo 3 → `{x: 0, y: 0, z: 0}`
**esatti**. Con `direzioneDominante` scritta come `reduce` su `["x","y","z"]` a partire da `"x"`,
un pareggio a zero rende `"x"`, e la voce direbbe «modo 3 · 35,85 Hz · ux 0 %» — mentre
`docs/caso-studio/README.md:151` chiama quel modo *uy, fuori piano*. *Costo se sbagliato*: un
numero falso stampato accanto a una frequenza vera è peggio di nessun numero, e questa è la riga
che `07-ux-modellatore.md:103` chiede di mettere «accanto al numero» proprio perché è quella su
cui si decide se un modo è locale. Nota di grafia: `percento` oggi renderebbe «45,62 %» —
`conciso(45,6215)` tiene due decimali sotto 100. In un menu di 46 voci i centesimi di punto non
dicono niente: `Math.round(100 · v)`, e i test del piano non cambiano (`0,92 → 92`, `0,01 → 1`).
*Le fixture a mano dei test del Task 1 restano con 92 %: `M2` è inventato apposta, e va bene così.*

**R4 — la forma modale è un parallelogramma sul MURO 1: si accetta, e si dichiara.** *Ruling: si
fa com'è scritto, e il limite entra nel badge con una parola sola.* Vedi §0 per la misura. Non si
può fare altrimenti dentro la 14a: i nodi interni della forma modale non esistono nel JSON, e
`spostamenti_interni` è esportato per i soli casi statici (`nova/corsa.py:336`) — aggiungerlo ai
modi è lavoro sotto `nova/`, che il Global Constraint esclude. *Cosa costa*: sul MURO 1 le aste
hanno `suddivisioni: 4`, quindi la deformata statica dello stesso muro è una spezzata che passa per
tre stazioni interne mentre il modo è un segmento — due figure vicine che il badge non distingue.
*Cosa si scrive*: niente di nuovo. Il badge del modo già non porta l'etichetta della freccia
(Task 2 step 3.2, ed è giusto: la forma è adimensionale); il limite va nel ticket di chiusura, voce
1 della sezione 6. **Non** è una domanda per l'autore: D8 ha già deciso che sotto `nova/` non si
tocca niente.

**R5 — il ridisegno per fotogramma non costa niente: nessun tetto di fps.** *Ruling: si fa com'è
scritto, senza `30 fps`, senza salti di fotogramma. Una sola economia, una riga.* *Misurato
l'11/09/2026* nel DOM finto di `piano.test.js:118-139`, MURO 1 (4 nodi, 4 aste, `suddivisioni: 4`),
2000 giri dopo scaldata:

| | ms/giro | quota di 16,7 ms |
|---|---|---|
| `piano.disegna` senza risultati | 0,0157 | 0,1 % |
| `piano.disegna` con la deformata | **0,0372** | **0,2 %** |
| `puntiDeformata` da sola | 0,0102 | |
| `frecciaMassima` da sola | 0,0097 | |

E su un telaio finto da 231 nodi e 210 aste (cinquanta volte il MURO 1): **1,13 ms**, il 7 % del
budget. Il DOM finto non misura il layout SVG vero del browser, quindi questi numeri sono un
**pavimento** e non il costo in pagina — ma il pavimento è a due ordini di grandezza dal tetto, e il
disegno del MURO 1 è una polilinea da nove punti per asta più quattro cerchi: un tetto di fps
sarebbe codice scritto contro un problema che non si è visto. Il piano ha già la leva vera nei
Global Constraints («il ridisegno per fotogramma tocca solo piano e spazio, non `ridisegna()`
intero»), ed è quella che conta. *L'unica economia che vale la riga*: nel ramo deformata di
`stratoDeiRisultati`, `frecciaMassima` si chiama **solo** quando l'etichetta si disegna — cioè non
per un modo e non per un passo, che il Task 2 step 3.2 già esclude. Sono 0,0097 ms, il **26 %** del
costo per fotogramma, e oggi si spendono per un'etichetta che poi non si scrive. *Se un giorno
servisse un tetto*, la misura da rifare è in Chrome vero con `performance.now()` attorno a
`suFotogramma`, non qui.

**R6 — `←`/`→` col fuoco su un radio della vista rubano la navigazione nativa del gruppo.**
*Ruling: le quattro frecce entrano in `ATTIVANO` (`tastiera.js:93`).* `daControllo` (`:114-125`)
per un `<input type="radio">` calcola `bottone = false` e `testuale = !NON_TESTUALI.has("radio")`
= **false** (`:94` contiene `"radio"`), quindi rende `ATTIVANO.has(key)` — e le frecce non ci sono.
Il keydown (`app.js:746`) le lascia passare, il ramo `direzione` del Task 4 step 7 fa
`preventDefault` e cambia il passo. In un gruppo di radio le frecce **sono** il modo di spostare la
selezione: è il pattern ARIA, ed è l'unico modo di cambiare vista da tastiera senza Tab. *Costo se
sbagliato*: con la pushover scelta e il fuoco su un radio (cioè subito dopo aver premuto `1` col
mouse sul blocco) `→` scorre i passi invece di passare a «M», e nessun messaggio spiega perché.
La guardia giusta sta in `daControllo`, che è il punto dove **tutti** i chiamanti passano —
metterla in `app.js` la lascerebbe fuori dalla palette e dal prossimo ramo che legge una freccia.
*Cosa si perde, dichiarato*: col fuoco su un bottone o su un `<li role="button">` dell'albero le
frecce non ruotano più il ghost. Oggi non lo fanno comunque per i campi di testo (`testuale` →
`true` già le blocca), e chi estrude clicca nel piano prima di ruotare.

**R7 — `Spazio` col fuoco su un controllo: già giusto, e la riga da citare è un'altra.** *Ruling:
si fa com'è scritto, senza aggiungere niente.* `ATTIVANO` (`tastiera.js:93`) contiene già `" "`
dal giorno in cui è stato scritto, quindi su un `<li role="button">` dell'albero o della Storia —
e su ogni bottone, campo e select — `daControllo` rende `true` e il keydown esce a `app.js:746`
prima di guardare la voce. Lo Spazio **attiva la voce**, che è il comportamento nativo di un
bottone e quello che WAI-ARIA prescrive per `role="button"`: sì, giusto così. La riga citata nei
Global Constraints era `:109-120`, che è in mezzo al docstring; ora è `:114-125` con `:93` accanto,
perché `:93` è la riga che decide davvero. *Costo se sbagliato*: nessuno — ma senza la riga giusta
citata, il primo che «semplificherà» `ATTIVANO` toglierà lo spazio e romperà l'albero.

**R8 — la deformata di un passo non passa per i nodi interni: è il contratto, non una svista.**
*Ruling: dichiarato, fuori scope, e la riga della spec lo prova.* Misurato sul telaio 2×1 con
`suddivisioni: 2` e 60 passi: `passi[k].spostamenti` ha le sole chiavi `1`-`6`, cioè i nodi del
modello, e non esiste `passi[k].spostamenti_interni`. La spec lo scrive alla riga **192**:
`passi [ ]{spostamento, taglio_base, spostamenti[nodo][6], stato_sezioni[asta][stazione],
algoritmo}` — `spostamenti_interni` compare alla riga 189, dentro `per_caso`, e solo lì.
*Differenza con R4*: qui le **rotazioni ci sono** (sei componenti per nodo), quindi la cubica di
Hermite non degenera e la deformata del passo è curva, non un segmento — è la stessa
approssimazione che la 13 ha spedito per i risultati corsi prima che `spostamenti_interni`
esistesse (`risultati.js:41-45`), con l'errore del 20 % che la spec riga 200 nomina. *Costo se
sbagliato*: i simboli dello stato delle sezioni si posano su una curva che nel mezzo è più piatta
del vero, cioè una cerniera segnata qualche millimetro fuori posto su un disegno che è già scalato
di ×20. Non si vede. Aggiungerlo è lavoro sotto `nova/`: va al ticket, voce 2.

**R9 — `stato_sezioni` per stazione: `4n + 1` confermato, e `stazioniDiAsta` regge. Ma le
stazioni possono portare `null`.** *Ruling: `stazioniDiAsta` si fa com'è scritta; `simboloStato`
deve reggere `null` **dentro** il dizionario, non solo il dizionario nullo.* Misurato sul telaio
2×1 con `suddivisioni: 2`, pushover uniforme, 60 passi: **9 stazioni per asta** su tutte e cinque,
a ogni passo — `4·2 + 1`, come `nova/passi.py:170-172` promette. `stazioniDiAsta({suddivisioni: 2},
9)` rende 9 e non ripiega sulle equispaziate: il ramo di ripiego esiste per i file di un'altra
versione, ed è giusto che ci sia. Le coppie di stato viste sulla corsa vera: `(elastica, elastica)`,
`(fessurata, elastica)`, `(fessurata, snervata)`, `(schiacciata, snervata)` — mai `rotta` su questa
spinta. *Il caso che il piano non enumera*: `_peggiore` (`nova/passi.py:109-110`) rende **`None`**
su una lista vuota, quindi una stazione può uscire `{calcestruzzo: null, acciaio: "elastica"}`
quando le fibre di un ruolo non sono registrate; e una corsa **elastica** rende `{}` per passo —
misurato sul MURO 1, dove `per_caso["C1"].stato_sezioni` è un dizionario vuoto senza nemmeno le
chiavi delle aste. `simboloStato` come scritta li regge tutti e due (`RIEMPIMENTO[null]` è
`undefined` → `null`), ma l'oracolo va scritto, o il primo che «semplifica» con
`stato.calcestruzzo ?? "elastica"` inventa un controllo che nessuno ha fatto — che è esattamente
quello che `nova/passi.py:155-157` si rifiuta di fare.

**R10 — il rosso del passo corrente è una selezione, ma con `stantia` sparisce: il raggio è il
canale che regge.** *Ruling: si fa com'è scritto, e il raggio va dichiarato portante, non
decorativo.* Sì, è una selezione, e la selezione è uno dei tre significati ammessi del rosso
(story 63). Il punto che il piano non vede: `esito.js:100` fa `colore = risultati.stantia ? ROSSO :
INCHIOSTRO`, quindi su una corsa stantia **la curva intera è rossa** e il punto corrente ci sparisce
dentro. Il secondo canale c'è già nel piano (`r = 4.5` contro `2.5`) ed è quello che porta
l'informazione quando il colore è saturo — `07-ux-modellatore.md:100`, doppio canale, WCAG 1.4.11.
*Cosa aggiungere*: niente codice, un test. Il test del Task 3 asserisce il raggio **e** il colore,
e ne asserisce uno anche con `stantia: true`, dove il colore non distingue più.

**R11 — 120 cerchi da 2,5 px su 400 px: il bersaglio del clic è 3,3 px, cioè non c'è.** *Ruling:
un `<rect>` trasparente a tutta altezza con **un solo** listener che converte `x → k`; i cerchi
restano il disegno e perdono il listener.* Misurato dal caso studio: la pushover del MURO 1 ha
**120 passi** (`README.md:199`), e la striscia si disegna sulla larghezza misurata del contenitore
— a 1280 px di finestra la colonna del piano sta attorno ai 400 px (è il numero che R7 della 13 ha
misurato), quindi il passo fra due cerchi è 3,3 px. Un cerchio da `r 2.5` è un bersaglio di 5 px:
WCAG 2.5.8 ne chiede 24. *Perché il `<rect>` è anche la strada pigra*: un rettangolo e un listener
sono meno righe di 120 `addEventListener`, funzionano a qualunque densità, e la larghezza del
bersaglio cresce da sola quando i passi sono pochi. La strada accessibile vera resta `←`/`→`, che
il piano ha già — il `<rect>` serve al mouse. *Sul `pointer-events`*: **non serve**. `#srotolato`
(`stile.css:66-73`) non tocca `pointer-events`, `#srotolato svg` è solo `display: block`
(`:68`), e un `<circle>` o un `<rect>` con `fill` prende i clic per default (`visiblePainted`). Un
`<rect>` invisibile però va riempito con `fill="transparent"`, **non** con `fill="none"`: con
`none` non c'è niente da colpire. Il `cursor: pointer` che il piano mette resta, sul `<rect>`.

**R12 — 46 voci nel menu del MURO 1: sì all'`<optgroup>`, e costa un test esistente.** *Ruling: un
`<optgroup>` per `tipo`, costruito dal campo `tipo` che `vociDelCaso` già rende.* Misurato: il
MURO 1 corre **quattro** casi statici (`C1`, `C2`, `C3`, `Z1` — il piano ne dice tre) e rende **42**
modi: 46 voci, che con la pushover diventano 47. In un `<select>` nativo sono una lista piatta in
cui «modo 2» sta fra «Z1» e altri quarantuno modi identici nella forma. L'`<optgroup>` è nativo,
gratis, e i lettori di schermo annunciano il gruppo: è il gradino 4 della scala (funzione nativa
della piattaforma prima di codice proprio). Tre etichette: «casi», «pushover», «modi». *Quel che
costa, ed è il motivo per cui sta qui e non in un ticket*: `esito.test.js:98` asserisce
`el("#risultati-caso")._figli.map((o) => o.value)`, e con gli `<optgroup>` i `_figli` del select
sono i gruppi, non le opzioni. Quel test va aggiornato nel Task 3, con `tutti(el("#risultati-caso"),
"option")` che il file ha già (`:45-49`). *Cosa non cambia*: la chiave di riscrittura di
`casiScritti` (`esito.js:45-48`) e la correzione del caso a `:50` lavorano sui **valori**, non sugli
elementi — passano da `casiDi` a `vociDelCaso` e basta.

**R13 — `movimentoRidotto()` a ogni `ridisegna`, mai dentro `suFotogramma`.** *Ruling: si fa com'è
scritto, e si scrive esplicitamente dove **non** va.* `matchMedia` è live e cambia a caldo, quindi
leggerla una volta sola al caricamento del modulo congelerebbe la preferenza per tutta la sessione —
sbagliato. Leggerla a ogni fotogramma costruisce 60 `MediaQueryList` al secondo per una preferenza
che cambia forse una volta in un'ora. Il piano la mette in `ridisegna` (Task 4 step 5), che gira
sui gesti dell'utente e non a 60 Hz: è il posto giusto, e un cambio a caldo si raccoglie al gesto
dopo. *Cosa **non** si fa*: nessun listener `change` sulla media query (YAGNI: si guadagna di
riprendere l'animazione senza toccare nulla, si paga un listener da togliere), e nessuna chiamata
a `movimentoRidotto()` dentro `suFotogramma`. Questa seconda riga va scritta nel Task 4, perché è
esattamente il posto dove verrebbe messa per «essere sicuri».

**R14 — `copione(...)` uccide node a 120 s: il copione della pushover non può aspettarne 180.**
*Ruling: si tiene il tetto a 120 s e si toglie il «180 s» dal copione; il margine basta.*
`tests/test_fumo_chrome.py:101` fa `subprocess.run([...], timeout=120)`, e il Task 4 step 2 scrive
«attesa fino a 180 s» dentro `fumo.mjs` — un `finche(..., 180000)` sotto un tetto di 120 s non
aspetta 180 s, fa fallire il test con un `TimeoutExpired` che parla del processo e non della corsa.
*Il margine c'è*: la pushover del MURO 1 gira in **≈ 2 s** (`README.md:208`) e la modale in **0,3 s**
misurati oggi in-process; il resto è caricamento della pagina e round trip CDP. Il copione
`risultati` di oggi (`fumo.mjs:39`) aspetta 90 s e passa. *Se un giorno servisse davvero di più*,
si alzano **tutti e due** i numeri insieme, e il commento dice perché — qui la trappola è che i due
tetti vivono in due file e in due linguaggi diversi.

**R15 — la legenda del Task 2 resta senza CSS finché non atterra il Task 3.** *Ruling: si tiene la
divisione dei file com'è, e il Task 2 non prova la legenda a occhio.* `stile.css` lo scrive **solo**
il Task 3 (`.risultati-legenda`, e la regola del cursore sulla striscia), mentre il `<p>` della
legenda lo crea il Task 2 in `piano.js`. I test del Task 2 guardano il DOM (`hidden`,
`textContent`), non l'impaginazione, quindi restano verdi; la prova a occhio della legenda è del
Task 4 e del Task 5, dopo che tutti e due sono atterrati. *L'alternativa* — spostare la regola CSS
nel Task 2 — romperebbe la disgiunzione dei file che rende 2 ‖ 3 possibile, per tre righe di stile.
Non vale.

### 3. Le domande aperte (nessun ruling: contraddirebbero D1-D8)

Nessuna. Tutti e quindici i ruling stanno dentro le otto decisioni dell'autore: R1 e R2 riguardano
**come** si calcola l'ampiezza che D2a chiama «scala auto», non se ci debba essere; R3 corregge un
numero, non una scelta; R6 e R7 stanno dentro «resta al controllo» di D2a; R11 e R12 sono forma
del gesto che D5a e D3a lasciano aperta. R4 e R8 toccano `nova/`, e infatti non li risolvono:
vanno al ticket.

### 4. Chi esegue, con quale modello, in quale ordine

| task | subagente | modello | skill-gate | giro | comincia dopo |
|---|---|---|---|---|---|
| 1 — `risultati.js` e `animazione.js`, le pure | `frontend-engineer` | **`opus`** | **sì** | A | — |
| 2 — il piano: fattore, stati, badge, legenda | `frontend-engineer` | **`opus`** | **sì**, `impeccable` in modo **Operate** | B | 1 |
| 3 — menu, curva nella striscia, `Spazio`, ispettore | `frontend-engineer` | **`opus`** | **sì**, `impeccable` in modo **Operate** | B | 1 |
| 4 — la cucitura in `app.js`, l'animazione, `←`/`→`, il fumo | `frontend-engineer` | **`opus`** | **sì** | C | 2, 3 |
| 5 — prova a mano, review di ramo, Esito | **il controller** col browser, poi i sei revisori in parallelo | — | — | D | 4 |

**Giri: A = 1; B = 2 ‖ 3; C = 4; D = 5.**

**Il parallelo di B è vero, e l'ho verificato file per file.**

| file | unico task che lo scrive |
|---|---|
| `static/risultati.js`, `static/test/risultati.test.js` | 1 |
| `static/animazione.js`, `static/test/animazione.test.js` | 1 |
| `static/piano.js`, `static/test/piano.test.js` | 2 |
| `static/esito.js`, `static/test/esito.test.js` | 3 |
| `static/tastiera.js`, `static/test/tastiera.test.js` | 3 |
| `static/pannello.js`, `static/test/pannello.test.js` | 3 |
| `static/index.html`, **`static/stile.css`** | 3 |
| `static/app.js` | 4 |
| `tests/fumo/fumo.mjs`, `tests/test_fumo_chrome.py` | 4 |

`stile.css` è **solo** del Task 3, come chiesto: la conseguenza è R15. Nessun altro file compare due
volte. Regola vincolante che si ripete perché è il punto dove si sbaglia, e due implementer nel
giro B condividono l'indice git: **`git add <percorso>` esplicito, mai `git commit -a`, mai
`git add .`**.

Il Task 1 apre da solo perché 2, 3 e 4 lo **importano**: non è una dipendenza di forma, è il
modulo. Il Task 4 dipende da 2 e da 3 tutti e due, perché il suo step 1.2 passa `fattore`/`stati`
a `piano.disegna` (Task 2) e il suo step 8 monta `creaSrotolato(…, {suPasso})` (Task 3).

**I modelli.** Quattro `opus` è più della 13, e la ragione è misurata: R1, R2 e R3 hanno riscritto
il Task 1, e R6, R11 e R12 il Task 3. Se `opus` è chiuso, il Task 3 è quello che scende a `sonnet`
per primo — la sezione 6 gli scrive i test per intero, che è la metà del lavoro. **Ciò che non va
fatto** è dispacciare il Task 1 con il piano com'era prima di R1: `scalaAuto` su un modo fuori
piano passa tutti i test e non mostra niente.

**Skill-gate `sì` su tutti e quattro**, nessuna deroga: nessuno è meccanico. Quale skill la sceglie
l'agente; `impeccable` in modo **Operate** è l'unica nominata, sui due che toccano superficie che
una persona guarda. Per `impeccable`: la palette è quella dei Global Constraints, il rosso è
**attenzione** e niente altro, i simboli dello stato sono inchiostro a due canali (riempimento e
contorno) e non colore — non è una scelta estetica da rinegoziare, è
`07-ux-modellatore.md:100` più la story 63.

### 5. La ricerca che regge ogni task

Aperto `docs/ricerca/index.md` prima di annotare: sono **quattordici** ricerche, la **07** alla riga
19 e la **11** alla riga 23, tutte e due citate dal piano e tutte e due esatte. Le sei righe
citate (`07:99`, `:100`, `:103`, `:105`, `11:212-226`) sono state riaperte una per una: esatte.

| task | riferimento | perché conta qui |
|---|---|---|
| 1 | `docs/ricerca/07-ux-modellatore.md:103` | «modi: animazione a scala dichiarata, massa partecipante accanto al numero (NTC 7.3.3.1 85%)» — è la riga che chiede insieme `scalaModo` (R1) e la massa nella voce (R3), e che il piano applicava a metà |
| 1 (le frequenze) | `docs/ricerca/11-modi-sulla-tangente-opensees.md:212-226` | «`eigen` non segnala nulla: `rc = 0`, la lista esce col numero negativo in testa» + il blocco verbatim con `nan` — la ragione per cui `f` può essere `null` e la voce deve saperlo dire. **Sul MURO 1 non capita**: tutti e 42 i modi hanno `f` finita e positiva, misurato oggi, quindi questa riga la prova solo il test JS, mai il fumo |
| 2 | `docs/ricerca/07-ux-modellatore.md:100` | «WCAG 1.4.11: parti di grafica necessarie a capire il contenuto ≥ 3:1» + doppio canale — riempimento **e** contorno per lo stato delle sezioni, non due colori; ed è la stessa riga che regge R10 |
| 2 (data-ink) | `docs/ricerca/07-ux-modellatore.md:105` | Tufte, data-ink e chartjunk: un simbolo per stazione e una legenda sola, non una legenda per asta |
| 3 | `docs/ricerca/07-ux-modellatore.md:99` | «The Auto option will automatically set the scale factor»; «The scale factor is displayed in the state block»; «View the displacement components for a single joint by right clicking on a joint» → la scala sempre stampata anche per un modo, e i valori del passo nell'ispettore. La regola P3 («nessuna deformata senza scala dichiarata») è ciò che rende R2 obbligatorio: se la scala è 1 perché non c'è niente da scalare, va **detto** |
| 4 | `docs/ricerca/07-ux-modellatore.md:103` | SAP2000 anima con uno slider di velocità; qui la velocità è fissa a un ciclo al secondo (D2a) e il badge porta la frequenza vera — la stessa riga, decisa in modo diverso e dichiarato |

**Quattro task su quattro con un riferimento, nessun «nessuno».** Il piano ne dichiarava già uno per
task: le righe qui sopra li confermano e ne aggiungono uno al Task 1. *Finding di contesto, non di
questo piano*: la misura dell'08/09 diceva nove ricerche citate nella spec e mai nei brief. Questo
è il secondo piano di fila (dopo la 13) in cui ogni task porta la sua riga — la deriva è chiusa.

### 6. I test del Task 2 e del Task 3, scritti per intero

Il piano li lasciava in commento (`/* … */`). Sono la parte che costa di più da indovinare e meno da
scrivere adesso, quindi stanno qui. Vanno in coda ai due file esistenti; gli helper che nominano
sono quelli già presenti, con i due nuovi dichiarati in testa.

#### Task 2 — in coda a `static/test/piano.test.js`

Gli helper esistenti da riusare: `contenitoreFinto()` (`:136-139`), `tutti(radice, nome)`
(`:143-147`), `traveR` (`:405-406`), `Z1R` (`:410`), `conRisultati(vista, extra)` (`:411`),
`strato(svg)` (`:412`), `badgeDi(contenitore)` (`:413`). **Non** `pianoFinto()`: non rende il
contenitore (vedi sezione 1). Uno solo è nuovo, e sta accanto a `badgeDi`:

```js
// La legenda degli stati è il quarto figlio del contenitore, come il badge è il terzo
// (`piano.js`: `replaceChildren(svg, titolo, badge, legenda)`).
const legendaDi = (contenitore) => contenitore._figli[3];
const statiDi = (svg) => tutti(svg, "circle").filter((c) => c.getAttribute("class") === "stato");
const nuovoPiano = () => {
  const contenitore = contenitoreFinto();
  const piano = creaPiano(contenitore, { suSelezione: () => {}, suSfondo: () => {} });
  return { contenitore, piano, svg: () => contenitore._figli[0] };
};
const ultimoPunto = (svg) =>
  tutti(strato(svg), "polyline")[0].getAttribute("points").split(" ").at(-1).split(",").map(Number);

// Una forma modale: nessuna rotazione, il nodo 2 alzato di 3 mm in z (R4: fra i nodi è una retta).
const FORMA_2 = { spostamenti: { 1: [0, 0, 0, 0, 0, 0], 2: [0, 0, -3, 0, 0, 0] } };
const MODO_2 = { n: 2, f: 31.85, T: 0.0314, massa_partecipante: { x: 0.456215, y: 0, z: 0 } };

test("piano: il fattore dell'animazione moltiplica la scala del disegno, non il numero nel badge", () => {
  const { contenitore, piano, svg } = nuovoPiano();
  const base = { vista: "deformata", caso: "modo:2", perCaso: FORMA_2, scala: 100, auto: true,
                 stantia: false, tipo: "modo", badge: { modo: MODO_2 } };
  piano.disegna(traveR, { risultati: { ...base, fattore: 1 } });
  const pieno = ultimoPunto(svg());
  piano.disegna(traveR, { risultati: { ...base, fattore: 0.5 } });
  const mezzo = ultimoPunto(svg());
  piano.disegna(traveR, { risultati: { ...base, fattore: 0 } });
  const fermo = ultimoPunto(svg());
  // Lo scostamento dall'indeformata (fattore 0) è esattamente la metà: niente `schermoDi` da
  // replicare, si confronta il disegno con sé stesso a tre fattori.
  assert.ok(Math.abs((mezzo[1] - fermo[1]) * 2 - (pieno[1] - fermo[1])) < 1e-9);
  assert.ok(Math.abs(pieno[1] - fermo[1]) > 1, "a fattore 1 la deformata si vede");
  // il badge dice la scala **dichiarata**, che è l'ampiezza massima: il fattore non ci entra
  assert.ok(badgeDi(contenitore).textContent.startsWith("modo 2 · 31,85 Hz"));
  assert.ok(badgeDi(contenitore).textContent.includes("×100 (auto)"));
});

test("piano: `fattore` assente vale 1, e a fattore 0 la deformata cade sull'ombra senza NaN", () => {
  const { piano, svg } = nuovoPiano();
  const base = { vista: "deformata", caso: "modo:2", perCaso: FORMA_2, scala: 100, auto: true,
                 stantia: false, tipo: "modo", badge: { modo: MODO_2 } };
  piano.disegna(traveR, { risultati: base });                      // niente `fattore`
  const senza = ultimoPunto(svg());
  piano.disegna(traveR, { risultati: { ...base, fattore: 1 } });
  assert.deepEqual(ultimoPunto(svg()), senza, "`fattore` assente = 1");
  piano.disegna(traveR, { risultati: { ...base, fattore: 0 } });
  assert.ok(ultimoPunto(svg()).every(Number.isFinite), "nessun NaN a fattore zero");
});

test("piano: gli stati delle sezioni sono simboli sulla deformata, con la legenda; senza `stati` niente", () => {
  const { contenitore, piano, svg } = nuovoPiano();
  const E = { calcestruzzo: "elastica", acciaio: "elastica" };
  const stati = { 1: [E, { calcestruzzo: "fessurata", acciaio: "snervata" },
                      { calcestruzzo: "schiacciata", acciaio: "rotta" }, E, E] };
  piano.disegna(traveR, { risultati: { vista: "deformata", caso: "pushover", perCaso: { spostamenti: {} },
                                       scala: 1, auto: true, stantia: false, stati, tipo: "pushover",
                                       badge: { passo: { k: 0, n: 1, u: 0.5, V: 1.2 } } } });
  const simboli = statiDi(svg());
  assert.equal(simboli.length, 5, "cinque stazioni di Lobatto su un'asta non suddivisa");
  assert.equal(simboli[0].getAttribute("fill-opacity"), "0");      // elastica: vuoto
  assert.equal(simboli[1].getAttribute("fill-opacity"), "0.5");    // fessurata: mezzo
  assert.equal(simboli[2].getAttribute("fill-opacity"), "1");      // schiacciata: pieno
  assert.ok(Number(simboli[1].getAttribute("stroke-width")) > Number(simboli[0].getAttribute("stroke-width")),
            "acciaio snervato: contorno spesso");
  assert.equal(tutti(svg(), "line").filter((l) => l.getAttribute("class") === "stato-croce").length, 2,
               "rotta: una croce, cioè due tratti");
  // I simboli sono inchiostro, non colore: il doppio canale è riempimento + contorno
  // (`07-ux-modellatore.md:100`). Il rosso resta a stantia e selezione.
  assert.equal(simboli[2].getAttribute("fill"), "#141414");
  assert.equal(legendaDi(contenitore).hidden, false);
  assert.ok(legendaDi(contenitore).textContent.startsWith("calcestruzzo:"));
  piano.disegna(traveR, { risultati: conRisultati("deformata") });
  assert.equal(statiDi(svg()).length, 0, "un caso statico non ha stati");
  assert.equal(legendaDi(contenitore).hidden, true);
});

test("piano: stati con un conteggio che non combacia → equispaziati; un'asta che non c'è → niente, mai un errore", () => {
  const { piano, svg } = nuovoPiano();
  const E = { calcestruzzo: "elastica", acciaio: "elastica" };
  const conStati = (stati) => ({ vista: "deformata", caso: "pushover", perCaso: { spostamenti: {} },
                                 scala: 1, auto: true, stantia: false, stati, tipo: "pushover",
                                 badge: { passo: { k: 0, n: 1, u: 0, V: 0 } } });
  piano.disegna(traveR, { risultati: conStati({ 1: [E, E] }) });
  assert.equal(statiDi(svg()).length, 2);
  piano.disegna(traveR, { risultati: conStati({ 99: [E] }) });
  assert.equal(statiDi(svg()).length, 0, "un'asta che non c'è non ha simboli");
  piano.disegna(traveR, { risultati: conStati({ 1: [] }) });
  assert.equal(statiDi(svg()).length, 0, "lista vuota: nessun simbolo");
});

test("piano: una stazione con uno stato sconosciuto o nullo si salta, le altre si disegnano (R9)", () => {
  const { piano, svg } = nuovoPiano();
  const E = { calcestruzzo: "elastica", acciaio: "elastica" };
  // `_peggiore` rende `null` su una lista vuota di fibre: è quel che arriva davvero dal server.
  const stati = { 1: [E, { calcestruzzo: null, acciaio: "elastica" }, null,
                      { calcestruzzo: "boh", acciaio: "elastica" }, E] };
  piano.disegna(traveR, { risultati: { vista: "deformata", caso: "pushover", perCaso: { spostamenti: {} },
                                       scala: 1, auto: true, stantia: false, stati, tipo: "pushover",
                                       badge: { passo: { k: 0, n: 1, u: 0, V: 0 } } } });
  assert.equal(statiDi(svg()).length, 2, "le due elastiche restano, le tre senza stato si saltano");
});

test("piano: con un modo o un passo non si scrive l'etichetta della freccia (R5), e in vista M il badge lo dice", () => {
  const { contenitore, piano, svg } = nuovoPiano();
  piano.disegna(traveR, { risultati: { vista: "deformata", caso: "modo:2", perCaso: FORMA_2, scala: 100,
                                       auto: true, stantia: false, fattore: 1, tipo: "modo",
                                       badge: { modo: MODO_2 } } });
  assert.deepEqual(tutti(strato(svg()), "text").map((t) => t.textContent), [],
                   "la forma modale è adimensionale: nessun numero sulla freccia");
  piano.disegna(traveR, { risultati: { vista: "M", caso: "modo:2", perCaso: FORMA_2, scala: 1,
                                       auto: true, stantia: false, tipo: "modo", badge: { modo: MODO_2 } } });
  assert.ok(badgeDi(contenitore).textContent.includes("nessun diagramma per un modo"));
});

test("piano: la legenda entra fra gli ostacoli, cioè nessuna etichetta le finisce sotto", () => {
  const { contenitore, piano, svg } = nuovoPiano();
  const E = { calcestruzzo: "elastica", acciaio: "elastica" };
  piano.disegna(traveR, { risultati: { vista: "deformata", caso: "pushover", perCaso: Z1R, scala: 100,
                                       auto: true, stantia: false, stati: { 1: [E, E, E, E, E] },
                                       tipo: "pushover", badge: { passo: { k: 0, n: 1, u: 1, V: 2 } } } });
  assert.equal(legendaDi(contenitore).hidden, false);
  // La legenda sta in px fuori dal `viewBox`, come il badge: l'ostacolo è il suo rettangolo, e
  // nessun `<text>` dello strato ci cade dentro (stessa prova del badge, R6 della 13).
  for (const t of tutti(strato(svg()), "text")) assert.ok(Number(t.getAttribute("y")) > 0);
});
```

#### Task 3 — in coda a `static/test/esito.test.js`, `tastiera.test.js`, `pannello.test.js`

In `esito.test.js`, gli helper esistenti: `elementoFinto` (`:9-22`), `radiceFinta()` (`:57-82`),
`contenitoreFinto(clientWidth)` (`:39-42`), `tutti(radice, nome)` (`:45-49`). **Da aggiornare**
prima di tutto il resto (R12): la riga `:98` diventa

```js
  assert.deepEqual(tutti(el("#risultati-caso"), "option").map((o) => o.value), ["Z1", "Z2"]);
```

perché con gli `<optgroup>` i `_figli` del select sono i gruppi. Poi, in coda:

```js
const M2 = { n: 2, f: 31.85, T: 0.0314, forma: { 1: [0, 0, 0], 3: [1, 0, -0.03] },
             massa_partecipante: { x: 0.456215, y: 0, z: 0 }, cumulata: { x: 0.95, y: 0.78, z: 1 } };
const PASSI = [
  { n: 1, spostamento: 0.5, taglio_base: 1200, spostamenti: { 3: [0.5, 0, 0, 0, 0, 0] }, stato_sezioni: {} },
  { n: 2, spostamento: 1.0, taglio_base: 2300, spostamenti: { 3: [1.0, 0, 0, 0, 0, 0] }, stato_sezioni: {} },
];
const conModiEPassi = () => ({
  lavoro: { fin: { risultati: {
    run: { carico_totale: { Z1: [0, 0, -60000] }, pushover: { u0: 0.0002494 } },
    per_caso: { Z1: { spostamenti: {}, reazioni: { 1: [0, 0, 60000, 0, 0, 0] }, sollecitazioni: {} } },
    modi: [M2], passi: PASSI, caduta: null } } },
  vista: "deformata", caso: "Z1", scalaMano: null });

test("creaEsito: il menu porta casi, pushover e modi, raggruppati; il valore scelto passa a suCambio", () => {
  const { radice, el } = radiceFinta();
  const cambi = [];
  const esito = creaEsito(radice, { suCambio: (c) => cambi.push(c) });
  esito.disegna({ risultati: conModiEPassi() });
  const select = el("#risultati-caso");
  assert.deepEqual(tutti(select, "option").map((o) => o.value), ["Z1", "pushover", "modo:2"]);
  assert.deepEqual(tutti(select, "option").map((o) => o.textContent),
                   ["Z1", "pushover · 2 passi", "modo 2 · 31,85 Hz · ux 46 %"]);
  // R12: tre gruppi nativi, non una lista piatta di 46 voci (MURO 1: 4 casi + 42 modi)
  assert.deepEqual(select._figli.map((g) => g.getAttribute("label")), ["casi", "pushover", "modi"]);
  select.value = "modo:2"; select.dispatch("change");
  assert.deepEqual(cambi.at(-1), { caso: "modo:2", vista: "deformata", scalaMano: null });
});

test("creaEsito: con un modo scelto l'equilibrio dice le masse; con la pushover dice i passi", () => {
  const { radice, el } = radiceFinta();
  const esito = creaEsito(radice, { suCambio: () => {} });
  esito.disegna({ risultati: { ...conModiEPassi(), caso: "modo:2" } });
  assert.equal(el("#risultati-equilibrio").textContent,
               "massa partecipante x 46 % · y 0 % · z 0 % · cumulata x 95 % · y 78 % · z 100 %");
  esito.disegna({ risultati: { ...conModiEPassi(), caso: "pushover" } });
  assert.equal(el("#risultati-equilibrio").textContent,
               "2 passi convergenti · u₀ 0,0002 mm · taglio massimo 2,3 kN al passo 2 · caduta: nessuna");
});

test("creaSrotolato con la pushover: la curva in pixel, un cerchio per passo, il corrente rosso, la caduta segnata", () => {
  const contenitore = contenitoreFinto(400);
  const passi = [];
  const striscia = creaSrotolato(contenitore, { suPasso: (k) => passi.push(k) });
  const curva = { punti: [{ k: 0, u: 0.5, V: 1.2 }, { k: 1, u: 1, V: 2.3 }], uMax: 1, vMax: 2.3,
                  caduta: { k: 1, u: 1, motivo: "non converge" } };
  striscia.disegna({ risultati: { tipo: "pushover", vista: "deformata", caso: "pushover",
                                  passo: { k: 1, n: 2, u: 1, V: 2.3 }, curva, stantia: false },
                     modello: null, selezione: null });
  assert.equal(contenitore.hidden, false);
  const [titolo] = contenitore._figli;
  assert.equal(titolo.textContent,
               "pushover · taglio alla base – spostamento del nodo di controllo · kN, mm");
  const svg = contenitore._figli[1];
  assert.equal(tutti(svg, "polyline").length, 1);
  const cerchi = tutti(svg, "circle").filter((c) => c.getAttribute("class") === "passo");
  assert.equal(cerchi.length, 2);
  assert.deepEqual(cerchi.map((c) => c.getAttribute("data-k")), ["0", "1"]);
  assert.equal(cerchi[1].getAttribute("fill"), "#b8321e", "il passo corrente è una selezione");
  assert.ok(Number(cerchi[1].getAttribute("r")) > Number(cerchi[0].getAttribute("r")),
            "R10: il raggio è il secondo canale, e regge anche quando la curva è tutta rossa");
  assert.deepEqual(cerchi.map((c) => c.getAttribute("aria-label")), ["passo 1", "passo 2"]);
  const testi = tutti(svg, "text").map((t) => t.textContent);
  assert.ok(testi.includes("u 1 mm") && testi.includes("V 2,3 kN"));
  assert.ok(testi.some((t) => t === "caduta al passo 2"));
  // nessuna coordinata fuori dalla larghezza misurata (la regola della 13, R7)
  for (const c of cerchi) assert.ok(Number(c.getAttribute("cx")) <= 400);
});

test("creaSrotolato: il clic su un passo lo dice, con un solo bersaglio largo quanto la striscia (R11)", () => {
  const contenitore = contenitoreFinto(400);
  const passi = [];
  const striscia = creaSrotolato(contenitore, { suPasso: (k) => passi.push(k) });
  const punti = Array.from({ length: 120 }, (_, k) => ({ k, u: (k + 1) / 2, V: k }));
  striscia.disegna({ risultati: { tipo: "pushover", vista: "deformata", caso: "pushover",
                                  passo: { k: 119, n: 120, u: 60, V: 119 },
                                  curva: { punti, uMax: 60, vMax: 119, caduta: null }, stantia: false },
                     modello: null, selezione: null });
  const svg = contenitore._figli[1];
  const bersaglio = tutti(svg, "rect").find((r) => r.getAttribute("class") === "passi");
  assert.ok(bersaglio, "un solo rettangolo, non 120 cerchi con un listener ciascuno");
  assert.equal(bersaglio.getAttribute("fill"), "transparent", "`none` non prenderebbe i clic");
  assert.equal(Number(bersaglio.getAttribute("width")), 400);
  bersaglio.dispatch("click", { offsetX: 0 });
  assert.equal(passi.at(-1), 0);
  bersaglio.dispatch("click", { offsetX: 400 });
  assert.equal(passi.at(-1), 119, "l'ultimo passo si prende dal bordo destro");
  bersaglio.dispatch("click", { offsetX: -50 });
  assert.equal(passi.at(-1), 0, "fuori a sinistra: stretto al primo");
});

test("creaSrotolato: senza `suPasso` un clic non solleva; con un passo solo la curva non divide per zero", () => {
  const contenitore = contenitoreFinto(400);
  const striscia = creaSrotolato(contenitore, {});
  striscia.disegna({ risultati: { tipo: "pushover", vista: "deformata", caso: "pushover",
                                  passo: { k: 0, n: 1, u: 0, V: 0 },
                                  curva: { punti: [{ k: 0, u: 0, V: 0 }], uMax: 0, vMax: 0, caduta: null },
                                  stantia: false }, modello: null, selezione: null });
  const svg = contenitore._figli[1];
  const [c] = tutti(svg, "circle").filter((x) => x.getAttribute("class") === "passo");
  assert.ok(Number.isFinite(Number(c.getAttribute("cx"))) && Number.isFinite(Number(c.getAttribute("cy"))));
  tutti(svg, "rect").find((r) => r.getAttribute("class") === "passi").dispatch("click", { offsetX: 10 });
});

test("creaSrotolato con un modo: la striscia dice che una forma modale non ha sollecitazioni", () => {
  const contenitore = contenitoreFinto(400);
  const striscia = creaSrotolato(contenitore, { suPasso: () => {} });
  striscia.disegna({ risultati: { tipo: "modo", vista: "deformata", caso: "modo:2",
                                  modo: M2, stantia: false }, modello: null, selezione: null });
  assert.equal(contenitore._figli.length, 1, "nessun svg");
  assert.equal(contenitore._figli[0].textContent, "modo 2: nessuna sollecitazione da srotolare");
});

test("creaSrotolato: un `tipo` sconosciuto o assente torna alla striscia di oggi", () => {
  const contenitore = contenitoreFinto(400);
  const striscia = creaSrotolato(contenitore, { suPasso: () => {} });
  striscia.disegna({ risultati: { vista: "M", caso: "Z1", perCaso: { sollecitazioni: {} }, stantia: false },
                     modello: { aste: [] }, selezione: null });
  assert.ok(contenitore._figli[0].textContent.includes("Seleziona un'asta"));
});
```

In `tastiera.test.js`:

```js
test("tastiera: Spazio è «pausa», e la barra lo promette solo con una corsa da mostrare", () => {
  assert.equal(voceDaEvento({ key: " " })?.codice, "pausa");
  assert.equal(voceDaEvento({ key: " ", metaKey: true }), undefined, "⌘Spazio è di Spotlight");
  assert.ok(vociDellaBarra("sempre", null, { risultati: true }).some((v) => v.codice === "pausa"));
  assert.ok(!vociDellaBarra("sempre", null, { risultati: false }).some((v) => v.codice === "pausa"));
  assert.ok(!vociDellaBarra("ghost", null, { risultati: true }).some((v) => v.codice === "pausa"),
            "col ghost aperto il gesto è un altro");
});

test("tastiera: `nomeTasto(\"Spazio\")` è una parola, per l'`aria-label` del `kbd`", () => {
  assert.equal(nomeTasto("Spazio"), "spazio");
});

test("tastiera: le frecce restano al controllo che le usa per navigare (R6)", () => {
  const radio = { tagName: "INPUT", type: "radio", getAttribute: () => null };
  const evento = (key, target) => ({ key, target: { closest: () => target } });
  assert.equal(daControllo(evento("ArrowRight", radio)), true,
               "in un gruppo di radio le frecce sono il modo di cambiare selezione (ARIA)");
  assert.equal(daControllo(evento(" ", radio)), true);
  assert.equal(daControllo(evento("n", radio)), false, "le lettere restano comandi");
  const voce = { tagName: "LI", type: "", getAttribute: (k) => (k === "role" ? "button" : null) };
  assert.equal(daControllo(evento(" ", voce)), true, "Spazio attiva la voce dell'albero");
  assert.equal(daControllo(evento("ArrowDown", voce)), true);
  assert.equal(daControllo(evento("n", voce)), false);
});
```

In `pannello.test.js`:

```js
test("pannello: il termine porta l'etichetta del caso, e con un modo la riga della forma", () => {
  const m2 = { n: 2, f: 31.85, T: 0.0314, forma: { 1: [1, 0, -0.03] },
               massa_partecipante: { x: 0.456215, y: 0, z: 0 }, cumulata: { x: 1, y: 1, z: 1 } };
  const r = righe(traveP, { tipo: "nodo", id: 1 }, { risultati: {
    perCaso: { spostamenti: { 1: [1, 0, -0.03, 0, 0, 0] } }, caso: "modo:2", etichetta: "modo 2", modo: m2 } });
  const termini = r.map(([k]) => k);
  assert.ok(termini.includes("spostamenti (modo 2)"), "l'etichetta, non la chiave grezza «modo:2»");
  assert.ok(termini.includes("forma modale (modo 2)"));
  const forma = r.find(([k]) => k === "forma modale (modo 2)")[1];
  assert.equal(forma, "ux 1 · uy 0 · uz -0,03");
});

test("pannello: con un passo della pushover il termine dice quale passo; senza `modo` niente riga della forma", () => {
  const r = righe(traveP, { tipo: "nodo", id: 1 }, { risultati: {
    perCaso: { spostamenti: { 1: [1, 0, 0, 0, 0, 0] } }, caso: "pushover",
    etichetta: "pushover, passo 37", modo: null } });
  const termini = r.map(([k]) => k);
  assert.ok(termini.includes("spostamenti (pushover, passo 37)"));
  assert.ok(!termini.some((k) => k.startsWith("forma modale")));
});

test("pannello: senza `etichetta` il termine ripiega sulla chiave, e un nodo senza numeri non ha righe in più", () => {
  const r = righe(traveP, { tipo: "nodo", id: 1 }, { risultati: {
    perCaso: { spostamenti: { 1: [0, 0, 0, 0, 0, 0] } }, caso: "Z1" } });
  assert.ok(r.map(([k]) => k).includes("spostamenti (Z1)"));
  const vuoto = righe(traveP, { tipo: "nodo", id: 9 }, { risultati: {
    perCaso: { spostamenti: {} }, caso: "Z1", etichetta: "Z1" } });
  assert.ok(!vuoto.map(([k]) => k).some((k) => k.startsWith("spostamenti")));
});
```

(`righe` e `traveP` sono i nomi che `pannello.test.js` usa già per l'elenco delle righe e per il
modello di prova: l'implementer li prende da lì invece di rifarli.)

### 7. La coerenza delle firme fra i task

Riletta contro il «Contratto dei moduli», e con le tre aggiunte dei ruling. Quel che ogni task
**riceve** e **rende**, alla lettera:

```js
// Task 1 → tutti gli altri
scalaModo(m, modo, frazione = 0.05)   // R1: nuova. max |u| sulle tre componenti di `modo.forma`;
                                      // dmax = 0 → 1 (R2), e chi la chiama lo dice nel badge
percento(v)                           // R3: `${Math.round(100 * v)} %`
direzioneDominante(mp)                // R3: null se max(mp) < 0.01 → la voce dice «massa trascurabile»

// Task 1 → Task 2, dentro `risultati` di `piano.disegna`
{ vista, caso, perCaso, scala, auto, stantia,
  fattore = 1,        // number in [-1, 1]; assente = 1
  stati = null,       // `passi[k].stato_sezioni`: { "<id asta>": [{calcestruzzo, acciaio}|null, …] }
  tipo,               // "caso" | "modo" | "pushover"
  badge }             // { modo?, passo?, caduta?, fermo?, motivoFermo? } → si spande in `testoBadge`

// Task 1 → Task 3, dentro `risultati` di `creaSrotolato().disegna`
{ ...il precedente, curva, passo }
// curva: { punti: [{k, u, V}], uMax, vMax, caduta: {k, n, u, motivo}|null }  — solo con tipo "pushover"
//   caduta.k = dove si ferma il disegno (stretto in [0, punti.length − 1]); caduta.n = il passo
//   come lo conta il server, ed è quello dei **testi**: con `non_convergenza` il passo caduto non
//   sta in `passi[]` (`tests/test_pushover_binario.py:153`: `caduta["passo"] == len(passi) + 1`)
// passo: { k, n, u, V }                                                      — solo con tipo "pushover"
//   qui `n` è il conteggio dei passi, e lo costruisce il Task 4 da `casoScelto(...).quanti`

// Task 3 → Task 4
creaSrotolato(contenitore, { suPasso })     // suPasso(k): k intero già stretto in [0, n)
creaEsito(radice, { suCambio, suAvviso })   // invariata

// Task 4 → Task 3 (il pannello)
{ perCaso, caso, etichetta, modo }
// etichetta: "Z1" | "modo 2" | "pushover, passo 37" — il termine dell'ispettore la usa,
// e ripiega su `caso` se manca. `modo` è l'oggetto intero o `null`.
```

**Tre disallineamenti chiusi qui**, tutti e tre fra il «Contratto dei moduli» e i task:

1. il contratto scrive `piano.disegna(…, { …, badge: {modo?, passo?, fermo?} })` mentre il Task 4
   step 2 ci mette anche `caduta` e `motivoFermo`: sono nel contratto qui sopra, perché `testoBadge`
   li legge (la sua firma li ha già tutti e due);
2. il contratto scrive `risultatiInVista(m, fattore = 1)` che rende `{…, curva, passo}` e insieme
   `piano.disegna` che **non** li nomina: li ignora, ed è giusto — la striscia e il piano ricevono
   lo **stesso** oggetto (`disegnaPiano` lo passa a tutti e due, `app.js:648-650`), quindi il
   contratto del piano è un sottoinsieme di quello della striscia, non un secondo oggetto;
3. il pannello riceve `{perCaso, caso, etichetta}` nel contratto e `{perCaso, caso, etichetta, modo}`
   nel Task 3: è il secondo, perché `righeModo` ha bisogno dell'oggetto del modo.

---

## Global Constraints

- **Lingua italiana** in interfaccia, commenti, commit; identificatori invariati. Chiavi dei risultati alla lettera: `modi[k] = {n, f, T, forma, massa_partecipante{x,y,z}, cumulata{x,y,z}}` (`nova/modale.py:92-97`; `f`/`T` possono essere `null` dalla PR #80), `passi[k]`, `caduta`, `run.pushover.u0` (`nova/passi.py:236-252`), `stato_sezioni[asta][stazione] = {calcestruzzo, acciaio}` con i valori di `nova/passi.py:31-32`.
- **Il caso è una chiave a tre forme**: `"<caso statico>"`, `"modo:<n>"`, `"pushover"`; `casoScelto` la traduce; nessun altro modulo interpreta la stringa.
- **Un ciclo al secondo, non la frequenza vera** (20 Hz non si vede): il badge dice la frequenza vera. `prefers-reduced-motion: reduce` → nessuna animazione, forma ferma al massimo (`fattore = 1`), badge «· ferma (preferenza di sistema)».
- **Il ridisegno per fotogramma tocca solo piano e spazio** (`disegnaPiano` + `spazio.disegna`), non `ridisegna()` intero; un fotogramma per `requestAnimationFrame`, mai un secondo `setInterval`.
- **Scala della deformata sempre stampata** anche per modi e passi; il **fattore** dell'animazione non entra nel badge (la scala dichiarata è l'ampiezza massima).
- **Un solo rosso** `#b8321e`: stantia, selezione — e il **passo corrente** sulla curva (è una selezione). I simboli dello stato delle sezioni sono inchiostro: riempimento (vuoto/mezzo/pieno) per il calcestruzzo, contorno (sottile/spesso/con croce) per l'acciaio, con la legenda stampata sotto il badge.
- **`←`/`→` cambiano il passo solo senza ghost e con la pushover scelta**; altrimenti restano al browser come oggi (`app.js:752-758`). `Spazio` ferma/riprende solo con un modo scelto; su un bottone o un campo a fuoco resta al controllo (`daControllo`, `tastiera.js:114-125`; `" "` è già in `ATTIVANO`, `:93`).
- **Lo stato vive in `app.js`** (`risultati = { lavoro, vista, caso, scalaMano, passo, animazione }`), fuori da modello e cronologia; «apri»/«importa» azzerano come oggi (`app.js:271-276` e gli azzeramenti esistenti).
- **Sotto `nova/` non cambia niente.**
- Nessun bundler, nessuna rete a tempo d'uso; WCAG AA; `kbd` con `aria-label` in parole (`nomeTasto`).
- Comando dei test JS: `env -C /Users/mario/GitHub/NOVA-wt/interfaccia-14a/static node --test test/*.test.js` — punto di partenza **761 pass, 0 fail** (406 ms), rimisurato l'11/09/2026 a `ae93005`. Pytest: `/Users/mario/GitHub/NOVA-wt/interfaccia-14a/.venv/bin/python -P -m pytest /Users/mario/GitHub/NOVA-wt/interfaccia-14a/tests -p no:cacheprovider --color=no --tb=short -rs --rootdir=/Users/mario/GitHub/NOVA-wt/interfaccia-14a` — punto di partenza **741 passed, 3 skipped in 106,76 s**, rimisurato l'11/09/2026 a `ae93005` (i tre skip sono `lab_telaio_v2/wall_model.inp`, non versionato); il fumo: **16** test raccolti in `tests/test_fumo_chrome.py`.
- Server per la prova: `env -C /Users/mario/GitHub/NOVA-wt/interfaccia-14a /Users/mario/GitHub/NOVA-wt/interfaccia-14a/.venv/bin/python -P -m nova --porta 8822`. **Mai la 8765, né 8766-8767, né 8817-8821.**
- Mai `git checkout --` per revertire un mutante; un comando per chiamata Bash, percorsi assoluti, `git -C`; commit per percorso, mai `-a`.

## Quel che c'è già, e non va reinventato

- `static/app.js:57-77` lo stato `risultati` e `risultatiInVista(m)` (`{vista, caso, perCaso, scala, auto, stantia}`, scala auto solo in vista deformata); `:271-276` `suEsito` (`casiDi` → primo caso, vista deformata); `:635-652` `perCasoDelloStato()` e `disegnaPiano(m)` (piano + striscia; usata anche dal `resize` a `:714-717`); `:654-705` `ridisegna` (spazio a `:684-685` con `puntiDeformata(m, inVista.perCaso, inVista.scala)`; pannello a `:688-697` con `risultati: perCasoDelloStato()`; `esito.disegna({risultati, stantia})` a `:702`); `:752-758` il ramo `direzione` del keydown (`ruotaGhost`, `return` se non gira); `:770-780` `eseguiVoce` (R4: la coda guarda `voce.campo`); `:841-853` il ramo `vista` (`[null, ...VISTE]`).
- `static/risultati.js`: `VISTE` (`:14`), `casiDi` (`:18`), `scalaAuto(m, perCaso)` (`:127`), `puntiDeformata(m, perCaso, scala, segmenti)` (`:199`: rende `[{id, punti: [{x, y, z, r}]}]`, con `r` = `x_rel` lungo l'asta; usa `spostamenti_interni` se c'è, `:46-59`), `testoBadge({vista, caso, scala, auto, stantia, ruotate})` (`:345-353`), `righeSpostamenti(perCaso, id)` (`:361`), `testoEquilibrio(risultati, caso)` (`:377`), `srotolato` (`:388`).
- `static/piano.js:161-250` `stratoDeiRisultati(m, attivo, vistaRis, s, {richieste, linee})` — ramo deformata a `:178-198` (polilinea da `puntiDeformata(m, attivo.perCaso, attivo.scala)`, etichetta della freccia da `frecciaMassima`); `:251` `disegna(m, {…, risultati})`; badge a `:119-127` e `:400-402`; ostacolo del badge a `:418`.
- `static/esito.js:12-67` `creaEsito` (select `#risultati-caso` con `casiDi`, radio, scala, equilibrio, `queueMicrotask(suCambio)`); `:76-138` `creaSrotolato` (striscia in pixel, `W = clientWidth || 200`, `H = 96`, titolo `.titolo`).
- `static/spazio.js:140-177` `disegna(m, {selezione, deformata})` con `deformata = {aste: puntiDeformata(...), stantia}`.
- `static/pannello.js:40-49` `righeDiNodo` con `risultati?.perCaso` → `righeSpostamenti` col caso nel termine.
- `static/tastiera.js:27` la voce `vista` (contesto `risultati`), `:78` le cifre, `:114-125` `daControllo` (con `ATTIVANO` a `:93`), `:157-172` `vociDellaBarra(contesto, tipo, {risultati})`.
- `static/index.html:41-43` `#srotolato`; `:92-109` il blocco `#risultati` (`#risultati-vuoto`, `#risultati-caso`, radio, `#risultati-scala`, `#risultati-equilibrio`). `static/stile.css:66-73` `#srotolato` e `.titolo`.
- `static/legame.js:45-69` `svgCurva` (stringa SVG con assi ed estremi: la forma della curva, non riusabile tal quale — restituisce una stringa, la striscia costruisce elementi cliccabili).
- `tests/fumo/fumo.mjs:33-63` il copione `risultati` (apri con `⌘O`, corri con `⌘⏎`, aspetta `#corsa-ultima`, `#risultati-controlli`); `tests/test_fumo_chrome.py:99-104` `copione(nome, porta, cdp, **extra)`, fixture `chrome_e_server`, `binario_opensees`.
- Fixture: `docs/caso-studio/muro_1.nova.json` (statica C1-C3 + modale «auto» → 42 modi, f1 = 20,45 Hz uy, f2 = 31,85 Hz ux, f3 = 35,85 Hz uy, `docs/caso-studio/README.md:142-152`); `docs/caso-studio/muro_1_pushover.nova.json` (statica a fibre C1/C3 con 10 passi + pushover uniforme, nodo 3, `ux`, incremento 0,5, max 60 → 120 passi, ≈ 2 s, `caduta: null`, taglio massimo 72 115 N al passo 109, `README.md:198-209`); `tests/test_pushover_binario.py:24-31` `_modello_pushover` sul telaio 2×1 (nodo 4, `ux`, 60 passi da 1 mm).
- Stazioni: `nova/deck.py:33-34` `STAZIONI = 5`, `XI_LOBATTO = (0.0, 0.1726731646, 0.5, 0.8273268354, 1.0)`; `nova/passi.py:149-172` `stato_sezioni` ha **le stesse stazioni** di `corsa._stazioni` (stazione 0 degli elementi interni saltata) → per un'asta con `suddivisioni = n` ci sono `4n + 1` stazioni con `x_rel = (k + ξ)/n`.

## Contratto dei moduli (le firme che i task condividono)

```js
// static/risultati.js — aggiunte, tutte pure
export const CHIAVE_MODO = (n) => `modo:${n}`;
export function vociDelCaso(risultati)
// → [{valore, testo, tipo: "caso"|"pushover"|"modo", n?}] nell'ordine: casi statici, «pushover · 120 passi» (se passi.length), modi
//   («modo 2 · 31,85 Hz · ux 46 %»; f null → «modo 3 · frequenza non fisica»; direzione = argmax di massa_partecipante, in %)
export function casoScelto(risultati, caso, passo = null)
// → null | { tipo: "caso", perCaso }
//   | { tipo: "modo", n, modo, perCaso: formaComeSpostamenti(modo) }
//   | { tipo: "pushover", k, quanti: passi.length, passo: passi[k], perCaso: { spostamenti: passi[k].spostamenti }, stati: passi[k].stato_sezioni, caduta, u0 }
//   `passo` null → l'ultimo (k = quanti − 1); fuori da [0, quanti) → stretto ai limiti
//   il conteggio è `quanti`, non `n`: nel ramo del modo `n` è il **numero** del modo
export function formaComeSpostamenti(modo)        // { spostamenti: { "<id>": [ux, uy, uz, 0, 0, 0] } } (niente rotazioni: la forma è lineare fra i nodi)
export function stazioniDiAsta(a, quante = null)  // [x_rel…] da XI_LOBATTO e `a.suddivisioni` (default 1); se `quante` è dato e non combacia → equispaziate su `quante`
export function scalaModo(m, modo, frazione = 0.05)
// R1: la scala di un modo si misura sulle **tre** componenti di `modo.forma`, non sul solo piano —
//     `scalaAuto` passa da `frecciaMassima`, che ignora `y`, e venti modi su 42 del MURO 1 escono
//     «×1 (auto)» cioè invisibili. `scala125(frazione · latoMaggiore(m) / max|u|)`; max = 0 → 1 (R2)
export function percento(v)                       // R3: `${Math.round(100 * v)} %`; `null` → «0 %»
export function direzioneDominante(mp)            // R3: "x"|"y"|"z", o `null` se il massimo è < 1 %
export function simboloStato(stato)               // { riempimento: 0|0.5|1, contorno: "sottile"|"spesso"|"croce" } | null
export function curvaPushover(passi, caduta)      // { punti: [{k, u, V}], uMax, vMax, caduta: {k, n, u, motivo}|null } — u in mm (relativo), V in kN
// caduta: `k` per il disegno (stretto alla lista), `n` per i testi (il passo del server, che con
// `non_convergenza` è `len(passi) + 1` e quindi **non** è un passo della lista)
export function testoBadge({ vista, caso, scala, auto, stantia, ruotate, modo, passo, caduta, fermo, motivoFermo })
// modo: «modo 2 · 31,85 Hz · T 0,0314 s · ux 46 % · ×n (auto)» + « · forma nulla sui nodi del modello» (R2)
//       + « · ferma» se fermo, « · ferma (preferenza di sistema)» se anche `motivoFermo`;
//       f null → «modo 3 · frequenza non fisica · ×n (auto)»; massa sotto l'1 % → «massa trascurabile» (R3)
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

- [x] **Step 1: i test** (in coda a `risultati.test.js`; fixture a mano):

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
  assert.equal(testoBadge({ vista: "deformata", caso: "modo:2", scala: 50, auto: true, modo: M2 }), "modo 2 · 31,85 Hz · T 0,0314 s · ux 92 % · ×50 (auto)");
  assert.equal(testoBadge({ vista: "deformata", caso: "modo:2", scala: 50, auto: true, modo: M2, fermo: true }), "modo 2 · 31,85 Hz · T 0,0314 s · ux 92 % · ×50 (auto) · ferma");
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

- [x] **Step 2: rosso** (`Cannot find module '../animazione.js'`, `vociDelCaso is not a function`).

- [x] **Step 3: il codice** — `animazione.js`:

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

- [x] **Step 4: verde**: `env -C …/static node --test test/risultati.test.js test/animazione.test.js`, poi tutti (761 + nuovi).
- [x] **Step 5: Commit** `feat(interfaccia): risultati.js — casi a tre forme (caso, modo, pushover), stazioni, stato delle sezioni, curva; animazione.js`.

## Ingressi degeneri
- `vociDelCaso(null)`, risultati senza `modi`/`passi` → solo i casi; `modi` con `f: null` → voce «frequenza non fisica»
- `casoScelto` con caso sconosciuto, modo assente, `passi` vuota → `null`; `passo` fuori da [0, n) → stretto ai limiti; `passo` non intero → l'ultimo
- `formaComeSpostamenti` con `forma` mancante o vettori corti → `{spostamenti: {}}` / componenti mancanti a 0
- `stazioniDiAsta` con `suddivisioni` 0, negativa, non numerica → come 1; `quante` che non combacia → equispaziate; `quante` 0 → `[]`
- `simboloStato` con valore sconosciuto o `null` → `null` (nessun simbolo)
- `curvaPushover` con `passi` non lista → vuota; `caduta.passo` fuori scala → stretto
- `creaAnimazione`: `avvia` due volte → una richiesta; `ferma` con fotogramma in volo → nessun fotogramma dopo; `ferma` senza `avvia` → non solleva
- **R1** `scalaModo` su un modo tutto fuori piano (`ux = uz = 0`, il modo 1 del MURO 1) → una scala che lo rende visibile, mai 1
- **R2** `scalaModo` su un modo con `forma` identicamente nulla (modo 6 del MURO 1) → 1, e chi la chiama può distinguerlo da «non ho misurato»
- **R3** `direzioneDominante` con le tre masse a zero esatto (modo 3 del MURO 1) → `null`, non «x» per pareggio; la voce dice «massa trascurabile», non «ux 0 %»
- **R3** `percento(0,456215)` → «46 %», intero; `percento(null)` → «0 %», non «NaN %»

Riferimento: `docs/ricerca/07-ux-modellatore.md:103` (animazione a scala dichiarata, massa accanto al numero), `11-modi-sulla-tangente-opensees.md:212-226` (frequenze non fisiche).

---

### Task 2: il piano — fattore dell'animazione, stato delle sezioni, badge e legenda

**Files:**
- Modify: `static/piano.js` (`stratoDeiRisultati` ramo deformata; badge; legenda)
- Test: `static/test/piano.test.js`

**Interfaces:** consuma `simboloStato`, `stazioniDiAsta`, `testoBadge`, `testoLegendaStati` (Task 1); `risultati` con `fattore`, `stati`, `tipo`, `badge`.

- [x] **Step 1: i test** (DOM finto già in `piano.test.js:117-156`; `traveR`/`Z1R` da lì):

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

- [x] **Step 2: rosso.**
- [x] **Step 3: il codice** in `piano.js`:
  1. In `creaPiano`, accanto al badge: `const legenda = document.createElement("p"); legenda.className = "risultati-legenda"; legenda.hidden = true; contenitore.replaceChildren(svg, titolo, badge, legenda);`.
  2. Nel ramo deformata di `stratoDeiRisultati`: la scala del disegno è `attivo.scala * (attivo.fattore ?? 1)` (sia `puntiDeformata` sia il punto della freccia); con `attivo.tipo === "modo"` o `"pushover"` **niente etichetta della freccia** (il badge dice già il numero: per un modo la forma è adimensionale, per un passo `u` è nel badge).
  3. Dopo le polilinee, se `attivo.stati`: per ogni asta `d` di `puntiDeformata` con `attivo.stati[String(d.id)]` lista non vuota: `const xr = stazioniDiAsta(asta, lista.length)`; per ogni stazione `k` il punto della deformata più vicino per `r` (`d.punti` portano `r`), il simbolo `simboloStato(lista[k])` (se `null` si salta): `<circle class="stato" r=3.5·s fill=colore fill-opacity=riempimento stroke=colore stroke-width=(contorno==="spesso" ? 2.5 : 1)·s>`; per `croce` due `<line class="stato-croce">` di ±4·s sulle diagonali. I cerchi entrano fra gli ostacoli (`linee`) e hanno `pointer-events: none` (ereditato dallo strato).
  4. Il badge: `testoBadge({ ...attivo, ...(attivo.badge ?? {}), ruotate: asteRuotate(m) })`; la legenda: `legenda.textContent = testoLegendaStati(); legenda.hidden = !(attivo && attivo.stati && vistaRis === "deformata")`; la legenda entra fra gli ostacoli come il badge (sotto di lui, `top: 38px`, altezza 14 px) quando non è `hidden`.
- [x] **Step 4: verde** (tutti i test JS); **Step 5: Commit** `feat(interfaccia): il piano anima la deformata col fattore, disegna lo stato delle sezioni a due canali e la legenda`.

## Ingressi degeneri
- `fattore` assente → 1; `fattore` 0 → deformata uguale all'ombra, nessun `NaN`
- `stati` con un'asta che non è nel modello → nessun simbolo, non solleva
- `stati[asta]` più corto o più lungo delle stazioni di Lobatto → simboli equispaziati
- `simboloStato` `null` → stazione senza simbolo
- vista M/V/N con `tipo` modo o pushover → strato vuoto, badge «nessun diagramma per un modo/passo»
- **R9** `stati[asta][k]` con `calcestruzzo: null` (fibre di un ruolo non registrate, `nova/passi.py:109-110`) → stazione senza simbolo, mai un simbolo inventato
- `stati[asta]` lista vuota → nessun simbolo per quell'asta, le altre si disegnano
- **R5** `tipo` modo o pushover → `frecciaMassima` non si chiama affatto (l'etichetta non si scrive comunque)

Riferimento: `docs/ricerca/07-ux-modellatore.md:100` (doppio canale: forma e riempimento, non colore), `:105` (data-ink).

---

### Task 3: il menu del caso, la curva nella striscia, `Spazio`, l'ispettore

**Files:**
- Modify: `static/esito.js` (`creaEsito` con `vociDelCaso`; `creaSrotolato(contenitore, {suPasso})` con la curva), `static/tastiera.js` (voce `pausa`, `[" ", "pausa"]`), `static/pannello.js` (`righeDiNodo` con `risultati.etichetta` e `righeModo`), `static/index.html` (`#risultati-vuoto`), `static/stile.css` (`.risultati-legenda`, curva)
- Test: `static/test/esito.test.js`, `static/test/tastiera.test.js`, `static/test/pannello.test.js`

**Interfaces:** consuma Task 1. Produce: `creaSrotolato(contenitore, { suPasso })`; il pannello riceve `risultati = { perCaso, caso, etichetta, modo }` (etichetta = testo fra parentesi: `Z1`, `modo 2`, `pushover, passo 37`).

- [x] **Step 1: i test** (DOM finto di `esito.test.js`; radice con `#risultati-caso` che tiene le `<option>`):

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

- [x] **Step 2: rosso.**
- [x] **Step 3: il codice**:
  - `esito.js` `creaEsito`: le `<option>` da `vociDelCaso(risultati)` (`value` = `valore`, `textContent` = `testo`), chiave di riscrittura = i valori uniti; `caso` corretto sul primo se non c'è; equilibrio da `testoEquilibrio(dati, caso)` (già estesa nel Task 1).
  - `creaSrotolato(contenitore, { suPasso = () => {} })`: se `risultati?.tipo === "pushover"` disegna la curva: titolo «pushover · taglio alla base – spostamento del nodo di controllo · kN, mm» (+ «stantia · »), `W = clientWidth || 200`, `H = 96`, margini 28 px a sinistra e 14 sopra/sotto; assi con gli estremi scritti («0», `uMax mm`, `vMax kN`); `<polyline>` dei punti; `<circle class="passo" r=2.5 data-k=k>` per passo, `pointer-events: all`, `click` → `suPasso(k)`; il corrente `r=4.5 fill=ROSSO`; due `<text>` accanto al corrente («u … mm», «V … kN»), a destra se `k < n/2` altrimenti a sinistra; caduta: `<line>` a croce sul punto `caduta.k` e `<text>` «caduta al passo k+1»; `aria-label` sui cerchi «passo k+1». Con `tipo === "modo"`: titolo «modo n: nessuna sollecitazione da srotolare». Altrimenti com'è.
  - `tastiera.js`: `{ codice: "pausa", tasto: "Spazio", etichetta: "ferma / riprendi", aiuto: "l'animazione del modo", contesto: "risultati" }` dopo `vista`; `[" ", "pausa"]` in `SENZA_MODIFICATORE`; `nomeTasto("Spazio")` → «spazio» (aggiungi a `PAROLE_DEI_GLIFI`).
  - `pannello.js` `righeDiNodo`: il termine usa `risultati.etichetta ?? risultati.caso`; se `risultati.modo` aggiunge `righeModo(risultati.modo, n.id)`.
  - `index.html` `#risultati-vuoto`: «Nessuna corsa da mostrare. Dopo ⌘⏎ scegli il caso, un modo o la pushover dal menu; `1` deformata, `2 3 4` M, V, N, `0` nessuna; `Spazio` ferma il modo, `← →` scorrono i passi.»
  - `stile.css`: `#piano .risultati-legenda { position: absolute; top: 38px; right: 8px; margin: 0; font: 11px var(--mono); color: var(--inchiostro); pointer-events: none; white-space: nowrap; }`; `#srotolato circle.passo { cursor: pointer; }`.
- [x] **Step 4: verde**; **Step 5: Commit** `feat(interfaccia): il menu del caso con modi e pushover, la curva taglio–spostamento nella striscia, Spazio, la forma modale nell'ispettore`.

## Ingressi degeneri
- `vociDelCaso` vuota → select vuoto e blocco nascosto come oggi
- curva con un passo solo → un cerchio, assi con `uMax`/`vMax` di quel passo; con `uMax` 0 → nessuna divisione per zero
- clic su un cerchio quando `suPasso` non è dato → non solleva
- `risultati.tipo` sconosciuto → la striscia come oggi (M/V/N srotolato)
- `Spazio` con il fuoco su un bottone → resta al bottone (`daControllo`, `tastiera.js:93`)
- **R6** `←`/`→` con il fuoco su un radio della vista → restano al gruppo di radio, il passo non cambia
- **R11** clic sul bersaglio fuori dalla striscia (`offsetX` negativo o oltre la larghezza) → `k` stretto in `[0, n)`, mai `suPasso(-1)`
- **R12** `vociDelCaso` senza modi e senza pushover → un solo `<optgroup>` «casi», non tre gruppi di cui due vuoti
- curva con `punti` vuota → titolo e assi, nessun cerchio, nessuna divisione per zero

Riferimento: `docs/ricerca/07-ux-modellatore.md:99` (clic sul punto → valore), spec story 48.

---

### Task 4: la cucitura in `app.js`, l'animazione, `←`/`→`, il fumo

**Files:**
- Modify: `static/app.js`
- Modify: `tests/fumo/fumo.mjs`, `tests/test_fumo_chrome.py`

**Interfaces:** consuma tutto. `risultati = { lavoro, vista, caso, scalaMano, passo, animazione }`.

- [x] **Step 1: `app.js`**:
  1. Stato: `risultati = { lavoro, vista: "deformata", caso: casi[0], scalaMano: null, passo: null, animazione: "va" }` in `suEsito`.
  2. `risultatiInVista(m, fattore = 1)`: `const scelto = casoScelto(risultati, risultati.caso, risultati.passo); if (!scelto) return null;` → `{ vista, caso, perCaso: scelto.perCaso, scala, auto, stantia, fattore, tipo: scelto.tipo, stati: scelto.stati ?? null, badge: …, curva: scelto.tipo === "pushover" ? curvaPushover(passi, scelto.caduta) : null, passo: scelto.tipo === "pushover" ? { k, n, u, V } : null }` con `badge = { modo: scelto.modo, passo: { k, n, u: passo.spostamento, V: passo.taglio_base / 1e3 }, caduta: curva.caduta, fermo: animazione ferma o movimento ridotto }`; la scala auto per un modo si calcola da `formaComeSpostamenti` come per un caso.
  3. `perCasoDelloStato()` → `{ perCaso: scelto.perCaso, caso, etichetta, modo: scelto.modo ?? null }` con `etichetta` = `caso` / `modo n` / `pushover, passo k+1`.
  4. `disegnaPiano(m, fattore = 1)` passa `risultatiInVista(m, fattore)` a piano e striscia; lo spazio riceve la deformata con `inVista.scala * inVista.fattore`.
  5. Animazione: `const animazione = creaAnimazione({ suFotogramma: (f) => { const m = corrente(cronologia); const inVista = disegnaPiano(m, f); spazio?.disegna(m, { selezione, deformata: … }); } });` — un `fattore` in `[−1, 1]`; in `ridisegna`, dopo il disegno: `const animare = risultati?.animazione === "va" && risultati.vista === "deformata" && risultati.caso.startsWith("modo:") && !movimentoRidotto(); if (animare) animazione.avvia(); else animazione.ferma();`. Con `movimentoRidotto()` il badge dice «· ferma (preferenza di sistema)» (passa `fermo: true` e un `motivoFermo`).
  6. `Spazio` (`voce.codice === "pausa"`): senza modo scelto → `dì("Spazio ferma l'animazione di un modo: scegline uno dal menu")`; altrimenti `risultati.animazione = animazione === "va" ? "ferma" : "va"; ridisegna()`.
  7. `←`/`→` nel keydown: `if (voce.codice === "direzione") { const girato = ruotaGhost(modo, ev.key); if (girato) { …come oggi… ; return; } if (!modo && risultati?.caso === "pushover" && (ev.key === "ArrowLeft" || ev.key === "ArrowRight")) { ev.preventDefault(); const s = casoScelto(risultati, "pushover", risultati.passo); risultati = { ...risultati, passo: Math.min(s.n - 1, Math.max(0, s.k + (ev.key === "ArrowRight" ? 1 : -1))) }; ridisegna(); } return; }`.
  8. `creaSrotolato($("srotolato"), { suPasso: (k) => { if (risultati) { risultati = { ...risultati, passo: k }; ridisegna(); } } })`.
  9. Cambio del caso dal menu (`suCambio`): `passo` torna `null` (l'ultimo), `animazione` resta.
- [x] **Step 2: il fumo** — copioni in `fumo.mjs`:

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

Test in `test_fumo_chrome.py` (con `binario_opensees`): `test_muro_1_il_modo_2_si_anima_e_spazio_lo_ferma` (voci contengono «modo 2 · 31,85 Hz · ux 46 %» (misurato l'11/09, R3) — controlla il numero esatto della massa dal run: se differisce, assert su `startsWith("modo 2 · 31,85 Hz")`; `siMuove` true; `ferma` true; `badge` comincia per «modo 2 · 31,85 Hz»; `badgeFerma` finisce per «· ferma»; messaggio vuoto) e `test_muro_1_la_pushover_si_scorre_con_le_frecce_e_il_clic` (`badge1` contiene «passo 120/120»; `cerchi == 120`; `badge2` contiene «passo 119/120»; `badge3` contiene «passo 1/120»; `stati > 0`; `legenda` false; nessuna sovrapposizione; messaggio vuoto). Fixture: `docs/caso-studio/muro_1.nova.json` e `muro_1_pushover.nova.json`.

- [x] **Step 3: tutti i test** (JS, pytest intero, fumo 18). **Step 4: Commit** `feat(interfaccia): modi animati e pushover nel piano — menu del caso, Spazio, ← → sui passi, fumo sul MURO 1`.

## Ingressi degeneri
- `suEsito` con risultati senza `modi` né `passi` → tutto come nella 13
- `Spazio` senza un modo scelto → messaggio, niente si rompe; con `prefers-reduced-motion` → il badge dice «ferma (preferenza di sistema)» e `Spazio` non anima
- `←`/`→` con un ghost aperto → girano il ghost come oggi; senza pushover → restano al browser
- cambio del caso mentre l'animazione gira → si ferma se il caso nuovo non è un modo, senza fotogrammi orfani
- «apri»/«importa» → `animazione.ferma()` insieme all'azzeramento
- corsa nuova durante l'animazione → `suEsito` rimette lo stato e riparte dalla deformata del primo caso (ferma)
- **R13** `movimentoRidotto()` si legge in `ridisegna`, mai dentro `suFotogramma`: la preferenza cambiata a caldo si raccoglie al gesto dopo
- corsa con `modi`/`passi` ma `per_caso` vuoto → `suEsito` non azzera: il caso di partenza è la prima voce di `vociDelCaso`, non `casiDi()[0]`
- **R14** il copione del fumo non aspetta più del tetto di `copione(...)` (`tests/test_fumo_chrome.py:101`, 120 s): il MURO 1 corre in ≈ 2 s

Riferimento: `docs/ricerca/07-ux-modellatore.md:103`, `:99`.

---

### Task 5: prova a mano su Chrome vero, review di ramo, Esito (controller)

MURO 1 modale: menu, modo 1/2/3 animati, `Spazio`, `0`-`4` con un modo (badge «nessun diagramma»), ispettore del nodo (forma modale), zoom 200 %. MURO 1 pushover: curva, clic sui passi, `←`/`→`, stati delle sezioni ai passi 1, 60, 120, legenda, stantia con un rinomina, 3D che segue. Telaio 2×1 statico: niente è cambiato. Review di ramo (il round qui sotto); fix; «Esito» in coda al piano; PR (merge domani).

Review di ramo **a sei, in parallelo**: `security-reviewer`, `code-reviewer`, `test-writer`,
`craft-reviewer`, più `spec-reviewer` (la spec e questo piano esistono) e `norme-reviewer` **solo
se** il diff tocca un numero con un articolo NTC accanto — qui non dovrebbe, perché sotto `nova/`
non si tocca niente. `rust-reviewer` no: nessun `.rs`.

## Ingressi degeneri
- nessun ingresso esterno
- il Task 5 non scrive codice di produzione: guarda in browser ciò che i Task 1-4 hanno
  scritto, e raccoglie i findings dei revisori
- un finding che contraddice un ruling di questa annotazione → si riapre il ruling con la misura
  accanto, non si applica il fix al volo

Riferimento: `docs/ricerca/07-ux-modellatore.md:99` (P3, «nessuna deformata senza scala
dichiarata»: è la riga che la prova a mano verifica su ogni modo, compresi i venti fuori piano di
R1 e i nove nulli di R2).

## Mutanti da provare a fine ramo (con controllo nullo)
- `fase` che rende `Math.cos` → cade «fase(0) = 0»; `creaAnimazione` senza la guardia `attiva` nel fotogramma → cade «ferma con fotogramma in volo».
- `casoScelto` che non stringe il passo → cade «99 → ultimo»; `formaComeSpostamenti` senza gli zeri di rotazione → cade il test del piano (`u.length >= 6`).
- `stazioniDiAsta` senza il salto della prima stazione interna → cade «9 con due».
- `piano.js` che moltiplica anche il badge per il fattore → cade «×100 (auto)».
- `simboloStato` con il riempimento della fessurata a 1 → cade il test del piano.
- `app.js`: `Spazio` che non ferma, `←` che cambia il passo con un ghost aperto → li vede solo il fumo (dichiarare).
- **R1** `scalaModo` che misura `hypot(ux, uz)` invece delle tre componenti → cade «un modo tutto
  fuori piano ha una scala che lo mostra». È il mutante che il piano di ieri **era**.
- **R3** `direzioneDominante` senza la soglia dell'1 % → cade «tre masse a zero → `null`».
- **R6** le frecce tolte da `ATTIVANO` → cade il test di `daControllo` sul radio; in pagina lo vede
  solo l'occhio.
- **R11** il bersaglio del clic che non stringe `k` ai limiti → cade «`offsetX` negativo → passo 0».
- `percento` senza `Math.round` → cade «`0,456215` → 46 %».


## Esito (11/09/2026, notte autonoma)

Ramo `feat/interfaccia-14a-modi-pushover` da `main` `2a2a44a`; codice fino a **7a8c15c**. Test finali: **819 test JS**, **744 pytest + 3 skip, invariati: niente sotto `nova/`**, **19 di fumo in Chrome headless** (16 della 13 più `modale` e `pushover` sul MURO 1 e la misura del fotogramma).

**Fatto come da piano e dalle decisioni D1-D8**: i modi nel menu del caso («modo 2 · 31,85 Hz · ux 46 %», «massa trascurabile» sotto l'1 %, `<optgroup>` per casi, pushover e 42 modi), la deformata che li anima a un ciclo al secondo con `Spazio` che ferma **sul posto** e riprende, `prefers-reduced-motion` che ferma al massimo e lo dice; la pushover con la curva taglio–spostamento nella striscia (clic su un bersaglio unico, `←`/`→`, il passo corrente rosso e più grande), la deformata che segue il passo nel piano e nel 3D, lo stato delle sezioni per stazione a due canali (riempimento per il calcestruzzo, contorno per l'acciaio) con la legenda, la caduta dichiarata come vuole la story 50 («al passo 110, u 55,2 mm, ultimo algoritmo KrylovNewton (non convergenza)» nell'equilibrio, corta nel badge e nella striscia); forma modale (adimensionale) e spostamenti per passo nell'ispettore; badge con frequenza, periodo e scala.

**Misurato dall'architect prima del dispatch** (la lezione della 13 applicata): la forma modale `-unorm` è adimensionale di ordine 1 e **venti modi su 42** del MURO 1 non hanno componente nel piano — `scalaAuto` li avrebbe resi invisibili (×1): `scalaModo` misura le tre componenti (modo 2 → ×50, 4,7 % del lato); nove modi hanno forma nulla e il badge lo dice; le stazioni sono `4n+1` come nel deck; il ridisegno per fotogramma costa 0,04 ms nel DOM finto e **0,24 ms** in Chrome sul MURO 1 (il resto è il vsync).

**Trovato dalle review e a mano**: la caduta per non convergenza sta **fuori** da `passi[]` (`passo = n+1`) e il testo scriveva il passo prima; con Spazio la forma saltava al massimo (ora `fattore()` dell'animazione ferma) e al **resize** saltava di nuovo (ora `fattoreCorrente()` serve `ridisegna` e il resize); la fase della pausa sopravviveva al cambio di caso (un modo nuovo disegnato sull'ombra del vecchio col badge «ferma»: ora `azzera()`); la scala auto della pushover si ricalcolava a ogni passo (×2 → ×10 scorrendo) e ora è fissa sul passo di |u| massimo; badge e legenda più larghi del piano a 1280 px — il badge della pushover accorciato, quello del modo a forma nulla **va a capo** e la legenda scende di quanto misura; l'etichetta «72,12 kN» dell'asse tagliata; `motivo` della caduta in chiaro («non_convergenza») ora in parole; le frecce in `ATTIVANO` anche sui bottoni spegnevano lo scrubber dall'albero; il menu non si aggiornava alla seconda corsa sullo stesso modello; l'ispettore stampava «mm» su una forma adimensionale; `n` voleva dire conteggio e numero del passo (ora `quanti`); `esito.js` conteneva un **NUL** letterale e git lo trattava come binario (la review del Task 3 ha letto il file, non il diff). Mutanti di ramo: 19 su 19 uccisi; la guardia delle frecce col ghost aperto ha un oracolo nel fumo (con `←` il mutante sopravviveva, col `→` muore).

**Ruling registrati** (`.superpowers/sdd/2026-09-11-t5-giornata-14a-modi-pushover/progress.md`): R1-R15 dell'architect; col fuoco sul menu `←`/`→` scelgono la voce (è un `<select>`), lo scrubber vuole il fuoco fuori — dichiarato nello stato vuoto; la forma nulla non ferma l'animazione (R2); scala della pushover una volta per corsa (e per modello); la massa partecipante sta nella voce del menu e nell'equilibrio, non nel badge (spazio).

**Debiti dichiarati**:
- La forma modale è **lineare fra i nodi** (niente rotazioni né nodi interni nei modi): sul MURO 1 il modo 2 è un parallelogramma (R4). I passi della pushover non portano `spostamenti_interni` (contratto della spec): la deformata di un passo passa dai soli nodi.
- `taglio_base` non passa da `_numero` nel server: un `inf` uscirebbe come `Infinity` e la curva collasserebbe (F4 della review del Task 1, `nova/`, fuori scope).
- Il fotogramma calcola `puntiDeformata` due volte e il 3D ricostruisce le geometrie: vale 0,01 ms su 0,24; la dedup pulita tocca tre punti di `piano.js` e il contratto di `disegnaPiano`, da fare quando una misura su un modello grande lo chiede.
- Senza test: la corsa nuova durante l'animazione (l'oracolo del fumo passerebbe per il motivo sbagliato); il cambio di caso da fermo è coperto solo a unità (nel fumo flakerebbe con la fase ≈ 1).
- Il badge a due righe e la legenda a capo prendono ~52 px in alto a destra: su un piano stretto le etichette hanno meno posto.
- `XI_LOBATTO` copiato in JS da `nova/deck.py:34`, con un test che rilegge il file.

**Lezioni**: misurare le convenzioni fisiche **prima** del dispatch ha funzionato (R1: nessun ritorno); il diff binario di un file con un NUL rende cieca una review — controllare `Bin` nei pacchetti; la scala di una serie (passi) si decide sulla serie, non sul campione corrente; un oracolo va mutato prima di fidarsi (il `←` sul passo 0); una scheda di Chrome in secondo piano non fa girare `requestAnimationFrame` — la prova a mano del moto vale solo con la scheda in vista.
