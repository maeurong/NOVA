# NOVA T5 — giornata 13: risultati statici nel piano

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** dopo una corsa il piano di lavoro mostra i risultati statici del caso scelto: la **deformata** con la scala sempre stampata «×n (auto | a mano)» sopra l'ombra indeformata; i diagrammi **M** (sul lato teso, etichetta al picco con segno), **V** e **N** (con segno, il verso locale i→j detto una volta nella legenda), disegnati **per stazione** — con un carico distribuito il momento fra gli estremi è una parabola, non una retta; l'**M srotolato** dell'asta selezionata in una striscia sotto il piano; **spostamenti e reazioni per nodo** su sei componenti nell'ispettore, con la riga Σ reazioni contro Σ carichi nel blocco; le **etichette non si sovrappongono** mai (priorità, linea guida, nascoste sotto soglia). I risultati stantii restano, in rosso. Prima di tutto questo, il **test di fumo** di `app.js` in Chrome headless lanciato da pytest, che salta se Chrome manca.

**Architecture:** nessun cambio nel server né nel contratto dei risultati: `GET /api/corsa/{run_id}` a lavoro finito porta già l'intero dict (`run, per_caso, modi, verdetti, passi, caduta`) e `corsa.js` lo consegna ad `app.js` con `suEsito(lavoro)` in `lavoro.fin.risultati` (`static/corsa.js:262-265`, `:301`). Due moduli puri nuovi: `static/risultati.js` (geometria: deformata di Hermite per asta, scala automatica in serie 1-2-5, diagrammi per stazione, picchi, testi con unità, righe per nodo, equilibrio) e `static/etichette.js` (disposizione delle etichette senza sovrapposizioni). `piano.js` riceve un'opzione `risultati` e disegna uno strato `<g class="risultati">` fra le aste e i nodi, più il badge della scala come `<p>` fuori dal `viewBox` (come il titolo dei carichi, `static/piano.js:88-96`). `spazio.js` riceve la sola deformata. Un modulo `static/esito.js` possiede il blocco «Risultati» nel pannello destro (caso, vista, scala a mano, equilibrio) e la striscia `#srotolato` sotto il piano. `app.js` tiene lo stato `{lavoro, vista, caso, scalaMano}` fuori dalla cronologia (come l'ultima corsa: `⌘Z` non lo tocca, «apri» lo azzera) e lo passa a piano, spazio, pannello ed esito. I tasti `0 1 2 3 4` scelgono la vista. Il test di fumo è `tests/test_fumo_chrome.py` + `tests/fumo/*.mjs`: pytest avvia il server su una porta libera, Chrome headless con `--remote-debugging-port`, e un copione node via CDP che preme tasti veri e legge il DOM vero.

**Tech Stack:** moduli ES nativi, `node --test` con il DOM finto di `piano.test.js` (`static/test/piano.test.js:117-156`), pytest + `uvicorn` in thread + Chrome headless via CDP (WebSocket nativo di node ≥ 22), three.js vendorizzato per la deformata 3D.

**Spec:** `docs/superpowers/specs/2026-09-05-nova-v1-design.md` — story 36-40 (righe 74-78), 63 (riga 116: «diagrammi in inchiostro tratteggiato», «un solo rosso»), 64 (riga 117: unità su ogni numero); «Risultati per corsa» (righe 182-193: `per_caso[caso]{spostamenti[nodo][6], reazioni[nodo][6], sollecitazioni[asta][stazione]{x_rel, N, Vy, Vz, T, My, Mz}}`; riga 197: «le stazioni sono i punti di integrazione (Lobatto) letti con un recorder per sezione, ricomposti sull'asta come `x_rel` fra 0 e 1»). Calendario: `docs/superpowers/plans/2026-09-06-t5-interfaccia-bozza.md:20` (giornata 13; verifica: «trave appoggiata: M(mid) = qL²/8 letto sull'etichetta; nessuna etichetta sovrapposta a 1280 e a 1920 px»). L'Esito della 12 (`docs/superpowers/plans/2026-09-10-t5-giornata-12-check-corsa.md`, «Debiti sanati») fissa il test di fumo come primo punto di questa giornata.

**Ricerca che questo piano applica** (`docs/ricerca/index.md`, riga 19, ricerca 07; riga 15, ricerca 03): `07-ux-modellatore.md:99` (SAP2000 «Auto… scale factor», «Wire Shadow… undeformed shape as a reference»; Abaqus: «The scale factor is displayed in the state block» → fattore sempre stampato, ombra di default, clic sul nodo → valore), `:98` (M sul lato teso, convenzione italiana — deciso qui con l'autore), `:100` (doppio canale: colore **e** parola), `:105` (Tufte, data-ink: niente riempimenti pesanti, tratteggio), `:65` (Abaqus scala automaticamente la deformata «to ensure that they are clearly visible»); `03-stack-tecnico.md:94` (deformata = ricampionare l'asta con funzioni di forma di Hermite su N punti moltiplicati per la scala). Mappa wayfinder #31: la 13 continua T5; la passata sull'uso viene dopo la 15.

**Ramo:** `feat/interfaccia-13-risultati` da `main` a `4e8cf0a`, worktree `/Users/mario/GitHub/NOVA-wt/interfaccia-13` (venv pronto, `nova ok 3.12.13`). PR verso `main`.

## Global Constraints

- **Lingua italiana** in interfaccia, commenti, messaggi di commit; identificatori tecnici invariati. Le chiavi dei risultati sono quelle di `nova/corsa.py:301-303` e `:317-326` alla lettera: `per_caso[caso].spostamenti["<id>"]` a sei componenti `[ux, uy, uz, rx, ry, rz]`, `reazioni["<id>"]` (solo i vincolati), `sollecitazioni["<id_asta>"]` lista di stazioni `{x_rel, N, Vy, Vz, T, My, Mz}`; unità del contratto **mm, N, N·mm, rad**.
- **Il piano è x–z** (`static/piano.js:5-6`): la deformata usa `ux` (indice 0), `uz` (indice 2) e la rotazione `ry` (indice 4) — tutti e tre **globali** (il recorder è `-dof 1 2 3 4 5 6 disp`, `nova/deck.py:1041`), quindi `ry` è davvero la rotazione attorno alla `y` globale. `uy`, `rx`, `rz` non si disegnano (si stampano nell'ispettore).
- **La grandezza nel piano dipende dall'asta, non è una costante** (R1, misurato): per una **trave** flettono nel piano `My` e `Vz`; per un **pilastro** `Mz` e `Vy`. La terna di `nova/deck.py:_terna` (`:172-191`) mette la `z` locale nel piano per un'asta coricata e **fuori** dal piano per un'asta in piedi (`:194-197`). Misurato sul telaio 2×1 il 10/09/2026: sui tre pilastri `|My|max ≈ 1e-9` contro `|Mz|max ≈ 7e6`, sulle due travi l'opposto. Una mappa `GRANDEZZA` costante disegnerebbe una riga piatta su ogni pilastro.
- **Segni del contratto** (`nova/corsa.py:31-39`, `tests/test_corsa_binario.py:51-55`; `N` negativo in compressione a `:42`): M positivo tende le fibre dalla parte di **−(asse trasversale locale)** — trave appoggiata: `My` = +qL²/8 in mezzeria, fibre inferiori tese; `Vz` +qL/2 all'estremo i, −qL/2 a j; `N` di compressione **negativo**.
- **M sul lato teso**: il diagramma di M si disegna dalla parte delle fibre tese, cioè verso **−n**, dove `n` è l'asse trasversale **del solutore** in coordinate schermo (`assiDi`, R1): `+e2` per una trave da sinistra a destra (quindi M positivo sotto), `−e2` per una trave da destra a sinistra (quindi M positivo ancora sotto: il verso non dipende dall'ordine dei nodi), `−e2` per un pilastro. V e N positivi verso **+n**, con la legenda «+ verso i→j» (V) e «+ trazione» (N) — che parlano del **segno**, non del lato, e restano vere per ogni giacitura. `e1 = (j − i)/L`, `e2` = normale sinistra `(−e1.z, e1.x)` (`static/carichi.js:172-173`).
- **Notazione numerica italiana** con `conciso`/`cifre` (`static/numeri.js:182-195`); unità su ogni numero (story 64): forze in **kN**, momenti in **kN·m**, spostamenti in **mm**, rotazioni in **mrad**. La riga «Unità» del pannello dichiara le due famiglie (modello e risultati).
- **Scala della deformata sempre stampata**: «deformata · Z1 · ×120 (auto)» o «×50 (a mano)». Auto = il massimo spostamento nel piano disegnato è il 5 % del lato maggiore del modello, arrotondato alla serie 1-2-5; con spostamenti tutti nulli la scala è ×1 e la deformata coincide con l'ombra.
- **Un solo rosso** `#b8321e` = attenzione: risultati **stantii** (lo snapshot a schermo non è quello della corsa, `static/corsa.js:93`) → l'intero strato dei risultati e il badge in rosso, con la parola «stantia» nel badge. Mai un secondo colore per i diagrammi: inchiostro `#141414` **tratteggiato** (story 63), riempimento al più `fill-opacity: 0.08`.
- **Zero sovrapposizioni fra etichette** (etichette dei nodi comprese) a 1280 e 1920 px e a zoom 200 % (viewport 640×400 con dpr 2): le etichette dei risultati passano da `etichette.js`, con gli ingombri delle etichette e dei cerchi dei nodi come ostacoli; un'etichetta che non trova posto si **nasconde**, non si sovrappone; un valore sotto il 2 % del massimo non si scrive.
- **Una vista alla volta**: `0` niente · `1` deformata · `2` M · `3` V · `4` N (decisione dell'autore, vedi sotto). Mai due diagrammi addosso.
- **Lo stato dei risultati vive in `app.js`, fuori da modello e cronologia** (`⌘Z` non lo tocca; «apri» e «importa» lo azzerano, come `corsa.azzera()` a `static/app.js:194,218`).
- **Sotto `nova/` non cambia niente.** `meshrec/` non si tocca. Il contratto dei risultati è quello della spec.
- **Nessun bundler, nessun `package.json`, nessuna rete a tempo d'uso.** Il test di fumo usa solo node (`WebSocket` globale, node ≥ 22) e il Chrome installato; **salta** con `pytest.skip` se manca Chrome o node, mai un fallimento.
- **WCAG AA**: doppio canale; i radio della vista con nome accessibile che comincia dal testo visibile; `kbd` con `aria-label` in parole (`nomeTasto`, `static/tastiera.js:146-150`).
- Comando dei test JS: `env -C /Users/mario/GitHub/NOVA-wt/interfaccia-13/static node --test test/*.test.js` — punto di partenza **649 pass, 0 fail**, rimisurato il 10/09/2026 su `56384df` (venti file in `static/test/`).
- Comando dei test Python: `/Users/mario/GitHub/NOVA-wt/interfaccia-13/.venv/bin/python -P -m pytest /Users/mario/GitHub/NOVA-wt/interfaccia-13/tests -p no:cacheprovider --color=no --tb=short -rs --rootdir=/Users/mario/GitHub/NOVA-wt/interfaccia-13` — punto di partenza **718 passed, 3 skipped in 48,68 s**, rimisurato il 10/09/2026 su `56384df` (i tre skip sono `lab_telaio_v2/wall_model.inp` non versionato); `pytest -q` in questo repo non stampa il riepilogo. I test che vogliono OpenSees usano `binario_opensees` (`tests/conftest.py:41-46`).
- Server per la prova in browser: `env -C /Users/mario/GitHub/NOVA-wt/interfaccia-13 /Users/mario/GitHub/NOVA-wt/interfaccia-13/.venv/bin/python -P -m nova --porta 8821`. **Mai la 8765, né 8766-8767, né 8817-8820.** `python -m nova` apre una scheda del browser a ogni avvio. Spegnerlo a fine prova.
- **Mai `git checkout --` per revertire un mutante**: copia del file prima, ripristino dalla copia.
- Un comando per chiamata Bash, percorsi assoluti, `git -C`; niente `cd … &&`. Due implementer nello stesso worktree condividono l'indice: **commit per percorso, mai `-a`**.

## Quel che c'è già, e non va reinventato

- `nova/corsa.py:277-306` `_stazioni`: 5 stazioni di Lobatto per elemento (`nova/deck.py:33-34`, `XI_LOBATTO = (0, 0.1727, 0.5, 0.8273, 1)`), la stazione 0 di un elemento interno scartata; `x_rel` sull'asta intera; sulla trave appoggiata (`suddivisioni: 2`) 9 stazioni con `x_rel = 0,5` esatto. `nova/corsa.py:309-355` `risultati_da_uscite`: `run.carico_totale[caso]` vettore a 3 (`:342`), `run.mappa_tag` (`:350-351`), `run.hash_modello`.
- `nova/server.py:352-365` `GET /api/corsa/{run_id}`: a lavoro finito spalma l'esito del solutore (`{"esito":"ok","risultati":{…},"secondi"}`, `nova/corsa.py:189`). `static/corsa.js:262-265`: `const { run_id, stato, fasi, secondi, ...fin } = s; lavoro = { run_id, secondi, fin, fasi, modello: m, solido, cartella }`; `:301` `suEsito(esito)` con `esito` = quel `lavoro`, oppure `null` dopo una `verifica` (`:329`); `:93` `stantia(lavoro, modello)`; `:350-355` `azzera()`.
- `static/app.js:31-53` lo stato (`cronologia`, `selezione`, `modo`, `comando`, `azioneCorrente`, `percorso`, `rilievo`); `:110-125` `scegli`; `:127` `creaPiano`; `:129-174` `creaPannello` con le azioni; `:181-182` `creaSpazio` (promessa); `:190-228` `creaFile` con `suApertura` (`corsa.azzera()` a `:194`) e `suImportazione` (`:218`); `:235-243` `creaCorsa` con `suEsito: () => ridisegna()`; `:262` `VOCI_PALETTE`; `:588-632` `ridisegna` (`piano.disegna` a `:617`, `spazio?.disegna` a `:619`, `pannello.disegna` a `:622-627`, `corsa.disegna` a `:629`); `:634-651` `disegnaBarra`; `:656-676` il `keydown` (`eseguiVoce(voce)` a `:675`); `:682-687` `eseguiVoce(voce, valore)`; `:691-` `dispatchVoce` (`corri`/`verifica` a `:740-741`, sopra la guardia del modo a `:746`).
- `static/piano.js:47-60` `estensione`; `:64-84` `versoLibero`; `:86-277` `creaPiano` — `schermo(n)` a `:107`, `millimetriPerPixel()` a `:118-122`, `disegna(m, {selezione, ghost, azioneInVista, proposte})` a `:126`, aste a `:131-142`, nodi con etichetta a `:185-210` (posizione `p.x + OFFSET_ETICHETTA·s·v.x`, `font-size: 11·s`, `text-anchor` da `v.x`), vincoli `:215-236`, frecce `:242-262`, titolo dei carichi `:267-271`, `svg.replaceChildren(gruppo)` a `:273`. Colori `INCHIOSTRO`/`ROSSO` scritti a mano (`:29-33`).
- `static/spazio.js:138-177` `disegna(m, {selezione})`: `THREE.Line` per asta con i materiali `inchiostro`/`rosso` (`:79-80`), punti dei nodi (`:81-82`), `calcolaInquadratura` (`:33-43`); il modulo si dichiara assente senza WebGL (`:184-191`).
- `static/pannello.js:39-53` `righeDiNodo(m, n, {rilievo})` → coppie `[termine, valore]`; `:63-74` `righeDiAsta`; `:800-826` `disegna(m, selezione, {catalogo, legame, tabella, rilievo})`.
- `static/tastiera.js:14-52` `TASTI` (campi `codice, tasto, etichetta, aiuto, contesto, esempio, campo, modificatore, tipi`); `:66-78` `SENZA_MODIFICATORE`; `:122-135` `voceDaEvento`; `:152-170` `vociDellaBarra(contesto, tipoSelezionato)`; `:146-150` `nomeTasto`.
- `static/numeri.js:155-167` `stampaNumero`, `:171` `millimetri`, `:182-195` `cifre`, `senzaZeriInCoda`, `conciso`.
- `static/carichi.js:165-176` `versoDistribuito` (la normale sinistra `e2`); `:180-226` `frecceDeiCarichi` (le frecce in px costanti che non entrano in `estensione`).
- `static/index.html:39-47` `#viste` con `#piano` e `#spazio`; `:49-86` il pannello destro (`Selezione`, `Unità` a `:57-58`, `Corsa` a `:63-83`, `Storia`). `static/stile.css:46` `#viste { display: grid; grid-template-columns: 1fr 1fr }`, `:51-58` `#piano`, `.carichi-titolo`; `:158` `.avviso`; `:187-188` `.vuoto`, `.vuoto kbd`; `:325` `#corsa-ultima.stantia`.
- `static/test/piano.test.js:117-156` il DOM finto per SVG (`elementoSvgFinto`, `globalThis.document`, `contenitoreFinto`, `tutti(radice, nome)`, `pianoFinto`); `static/test/corsa.test.js` i finti di radice con `querySelector` (da copiare, non importare: i test non condividono moduli).
- `tests/conftest.py:11-12` `leggi_fixture`; `:41-46` `binario_opensees`. `tests/fixture/trave_appoggiata.nova.json`: L = 6000, `q = −10 N/mm` lungo `z`, `suddivisioni: 2`, caso `Z1` → `My(0,5) = 45 000 000 N·mm = 45 kN·m`, `Vz(0) = 30 000 N = 30 kN`. `tests/fixture/telaio_2x1.nova.json`: tre casi (`Z1`, `Z2`, `Z3`).
- `nova/server.py:238` `create_app(sidecar, cartella_corse, statici=STATICI, porta=None, …)`; `:49-66` `SidecarInProcesso` (usa OpenSees dal PATH quando `solutore` è `None`); `nova/__main__.py:39-41` `uvicorn.run(app, host="127.0.0.1", port=porta, log_level="warning")`.
- Il pilota CDP già scritto e provato nelle giornate 11c-12 (fuori repo, `/Users/mario/.claude/jobs/4fd80bf5/tmp/cdp.mjs`): `Input.dispatchKeyEvent` con `text: "\r"` per l'Invio (submit implicito del `<form>`), `Network.setCacheDisabled` (il `?v=` non scavalca la cache dei moduli), `Emulation.setDeviceMetricsOverride` per 1280/1920 e per lo zoom 200 % (640×400, dpr 2). Task 1 lo porta in repo, riscritto per la porta parametrica.

## Quattro decisioni dell'autore (10/09/2026), non da scoprire in browser

1. **Una vista alla volta, tasti `0`-`4`**: 0 niente · 1 deformata con ombra · 2 M sul lato teso · 3 V · 4 N. Un solo strato sopra il modello, mai due diagrammi addosso. Dopo una corsa la vista parte da **deformata**.
2. **Spostamenti e reazioni per nodo nell'ispettore** del nodo selezionato (sei componenti; le reazioni solo se il nodo è vincolato), e nel blocco «Risultati» la riga **Σ reazioni contro Σ carichi** del caso.
3. **La deformata anche nello spazio 3D**, con l'ombra indeformata e la stessa scala del piano. I diagrammi M/V/N solo nel piano.
4. **La striscia del M srotolato mostra la sola asta selezionata, grande**; senza un'asta selezionata resta un rigo che dice il gesto («Seleziona un'asta per il suo M srotolato»); senza risultati la striscia non c'è.

Assunzioni fissate dal piano: il **caso** si sceglie da un `<select>` nel blocco «Risultati» (primo caso in ordine di `per_caso` di default); la **scala a mano** è un campo di testo nel blocco (vuoto = auto); il badge sta in alto a **destra** del piano (il titolo dei carichi è a sinistra); la striscia sta **sotto il piano**, nella colonna del piano di `#viste`.

## Annotazione dell'architect (10/09/2026)

Scritta nel worktree `/Users/mario/GitHub/NOVA-wt/interfaccia-13`, ramo
`feat/interfaccia-13-risultati`, HEAD **`56384df`** (padre `4e8cf0a`, il merge della 12 su `main`; il
solo file cambiato fra i due è questo piano — `git diff --stat`, una riga). Ogni `file:riga` citata dal
piano è stata aperta contro il codice a `4e8cf0a`: la sezione 1 elenca le sei che non combaciavano,
già corrette nel testo. Punti di partenza **rimisurati qui**, non ricordati: `node --test` sui venti
file di `static/test/` → **649 pass, 0 fail** (434 ms); pytest sull'intera `tests/` →
**718 passed, 3 skipped in 48,68 s**, i tre skip tutti `lab_telaio_v2/wall_model.inp` non versionato.
Tutte e due le righe dei Global Constraints erano giuste e ora portano la data e la provenienza.

**La cosa che conta di più in questa annotazione sta in R1, ed è misurata, non dedotta**: la mappa
`GRANDEZZA = { M: "My", V: "Vz", N: "N" }` è vera per le travi e **falsa per i pilastri**. Corretta nel
contratto, nel modulo, in quattro test e in tre punti di `piano.js`/`esito.js`.

### 0. La premessa che ho verificato per prima, perché tutto il resto ci poggia

`ry` letto dal recorder **è** la rotazione attorno alla `y` globale: `nova/deck.py:1041` scrive
`recorder Node -file {caso}_spostamenti.out -precision 12 -nodeRange 1 {n_nodi} -dof 1 2 3 4 5 6 disp`,
e i gradi di libertà nodali di OpenSees sono globali. Quindi `spostamenti[id] = [ux, uy, uz, rx, ry, rz]`
in terna globale, e l'assunzione del piano regge. Regge anche la sua conseguenza, `dw/ds = −θy`: con
`θ = (0, θy, 0)` e `r = s·L·(e1.x, 0, e1.z)`, `θ × r = (θy·rz, 0, −θy·rx)` e la proiezione sulla normale
del piano vale `−θy·sL` — per **qualunque** giacitura nel piano x–z, pilastri compresi. `pi = -ui[4]`
in `puntiDeformata` è corretto e non va toccato. La deformata è l'unica parte dei risultati che vive
tutta in terna globale, ed è per questo che è l'unica che non ha il problema di R1.

### 1. I puntamenti che non combaciavano

Sei, tutte corrette nel testo. Nessuna cambia *cosa* fare; tutte cambiano *dove guardare*.

| citato | vero | dove |
|---|---|---|
| `docs/ricerca/index.md` riga 13 = ricerca 03 | **riga 15** (la 13 è la ricerca 01) | riga 9, «Ricerca che questo piano applica» |
| spec riga 115 = story 63 | **riga 116** (la 115 è la story 62, il modo presentazione) | riga 8, «Spec» |
| spec riga 116 = story 64 | **riga 117** | riga 8 |
| «le stazioni sono i punti di integrazione (Lobatto)…» dentro le righe 182-193 | **riga 197**, fuori dal blocco | riga 8 |
| `2026-09-06-t5-interfaccia-bozza.md:19` = giornata 13 | **riga 20** (la 19 è la giornata 12) | riga 8 |
| `static/piano.js:184-210` = i nodi con etichetta | **185-210** (184 è `const etichettate = new Set()`) | riga 43, Task 4 step 3 punto 6 |

E due allineamenti minori: `piano.test.js:117-146` in *Tech Stack* → `:117-156`, che è il numero già
usato dieci righe più giù per la stessa cosa; e i «segni del contratto» citavano
`test_corsa_binario.py:51-55` anche per «`N` di compressione negativo», che sta invece a `:42`.

**Combaciano invece**, verificate una per una in questa sessione e da non rileggere:
`static/corsa.js` `:93` `stantia`, `:262-265` la destrutturazione di `lavoro`, `:301` `suEsito(esito)`,
`:329` il `return null` della `verifica`, `:350-355` `azzera`; `static/piano.js` `:5-6`, `:29-33`,
`:47-60`, `:64-84`, `:86-277`, `:88-96`, `:107`, `:118-122`, `:126`, `:131-142`, `:136-141`, `:215-236`,
`:242-262`, `:267-271`, `:273`; `static/app.js` `:31-53`, `:110-125`, `:127`, `:129-174`, `:181-182`,
`:190-228` con `:194` e `:218`, `:235-243` (`suEsito: () => ridisegna()` è a `:239`), `:262`, `:588-632`
con `:617`/`:619`/`:622-627`/`:629`, `:634-651`, `:656-676` con `:675`, `:682-687` e `:686`, `:691`,
`:740-741`, `:746`; `static/tastiera.js` `:14-52`, `:24-25`, `:66-78`, `:122-135`, `:146-150`,
`:152-170`; `static/pannello.js` `:39-53`, `:63-74`, `:146`, `:800-826`; `static/spazio.js` `:33-43`,
`:79-80`, `:81-82`, `:138-177`, `:184-191`; `static/carichi.js` `:165-176`, `:172-173`, `:180-226`;
`static/numeri.js` `:155-167`, `:158`, `:171`, `:182-195`, `:195`; `static/index.html` `:39-47`, `:40`,
`:49-86`, `:57-58`, `:63-83`; `static/stile.css` `:46`, `:51-58`, `:57-58`, `:158`, `:187-188`, `:325`;
`static/test/piano.test.js` `:117-133`, `:132`, `:117-156`; `nova/corsa.py` `:31-39`, `:189`, `:277-306`,
`:301-303`, `:309-355`, `:342`, `:350-351`; `nova/deck.py:33-34`; `nova/server.py` `:49`, `:49-66`,
`:238`, `:352-365`; `nova/__main__.py:39-41`; `tests/conftest.py` `:11-12` e `:41-46` (ed è davvero
`scope="session"`); `tests/test_corsa_binario.py:51-55`; `docs/ricerca/index.md:19`;
`07-ux-modellatore.md` `:65`, `:98`, `:99`, `:100`, `:101`, `:105` — **tutte e sei esatte**, e la `:98`
porta davvero il marchio `[INF, da verificare con Mario]` che il piano risolve con la decisione di
oggi; `03-stack-tecnico.md:94`; spec righe 74-78 e 182-193.

### 2. I rischi, con il loro ruling

**R1 — la grandezza nel piano non è una costante: su un pilastro sono `Mz` e `Vy`.** *Ruling: la
mappa `GRANDEZZA` si cancella, e al suo posto entra `assiDi(i, j)` che rende l'asse e le chiavi per
asta.* Il piano dava per scontato che «piano x–z» ⇒ `My`/`Vz` per tutti. La terna di
`nova/deck.py:_terna` (`:172-191`) però mette la `z` locale **nel** piano solo per un'asta coricata:
per un'asta in piedi la `z` locale è la `y` globale, cioè fuori dal piano, e in piano ci resta la `y`
locale. Le chiavi si scambiano. *Misurato*, non dedotto: corsa vera su
`tests/fixture/telaio_2x1.nova.json`, quattro casi, il 10/09/2026 —

| asta | max di My | max di Mz | max di Vy | max di Vz |
|---|---|---|---|---|
| 1-3, pilastri | ≤ 2,2e-9 | fino a 2,1e7 | fino a 1,3e4 | ≤ 5,4e-13 |
| 4-5, travi | fino a 5,4e7 | ≤ 9,3e-10 | ≤ 6,1e-14 | fino a 5,8e4 |

*Costo se sbagliato*: la giornata dei risultati disegna una **riga piatta su ogni pilastro**, con
l'etichetta del picco che non compare mai perché `sottoSoglia` la scarta a 1e-9 contro un massimo di
1e7 — e il test del piano sul pilastro sarebbe passato lo stesso, perché era scritto con un `My: 2e6`
inventato che nessun solutore produce. È il difetto più caro possibile: verde nei test, vuoto in
pagina, e proprio sul MURO 1, che di pilastri ne ha più che di travi.

Il ruling porta con sé due correzioni gratuite. La prima: `assiDi` normalizza anche il **verso** con
`sign(e1.x)`, quindi una trave inserita da destra a sinistra disegna M sotto come tutte le altre —
col `verso = -1` fisso del piano l'avrebbe disegnato sopra, sul lato compresso, e nessuno se ne
sarebbe accorto finché non fosse capitato. La seconda: `scalaDiagrammaAuto` somma nello stesso
massimo il `My` delle travi e il `Mz` dei pilastri, che nel piano **sono lo stesso momento**; con due
chiavi diverse la scala automatica avrebbe guardato solo metà del telaio. La coppia (asta, chiave)
vive in un punto solo, `asteConAssi`, così `scalaDiagrammaAuto` e `diagramma` non possono divergere.

Cosa **non** cambia: la deformata (§0), il badge («lato teso» resta vero per ogni giacitura; «+ verso
i→j» e «+ trazione» parlano del segno, non del lato) e il contratto del server, che non si tocca.

**R2 — `ry` è globale: la premessa regge.** Vedi §0. *Ruling: si fa com'è scritto,* `pi = -ui[4]`.
*Costo se sbagliato*: la deformata s'impenna dalla parte sbagliata, e sulla trave appoggiata la
mezzeria salirebbe invece di scendere — il test del piano lo prende (è il mutante 2).

**R3 — il fumo: `TestClient` non c'entra, e `should_exit` basta.** *Ruling: la fixture si fa com'è
scritta, con tre righe di conferma e una di correzione.* La corsa gira nel thread del lavoro
(`nova/server.py:296`, `threading.Thread(target=corri, daemon=True).start()`) e non nel thread della
richiesta, quindi il ruling R3 della 12 — che riguardava `TestClient`, il threadpool anyio e il
portale — **non si applica**: qui il server è un uvicorn vero su un socket vero, e il client è Chrome.
`server.should_exit = True` è letto dal `main_loop` di uvicorn a ogni decimo di secondo, e la fixture
lo mette **dopo** aver terminato Chrome, quindi non resta nessuna connessione keep-alive a tenere
aperto lo spegnimento graceful; e se anche restasse, il `filo.join(timeout=5)` limita l'attesa e il
thread è `daemon`, quindi pytest esce comunque. `lungo = sidecar_lungo or sidecar`
(`nova/server.py:245`) fa sì che `create_app(SidecarInProcesso(), …)` senza `sidecar_lungo` usi lo
stesso sidecar per la corsa, e `SidecarInProcesso` con `solutore=None` lascia passare l'OpenSees del
PATH (`:56`): la corsa del fumo è una corsa vera. **La riga che vale scritta**: `porta=porta` in
`create_app` non è una comodità, è obbligatoria — senza, `host_ammessi` (`:306`) non contiene
`127.0.0.1:<porta>` e il middleware `_blocca_host_estraneo` risponde 403 a ogni richiesta del browser,
cioè pagina bianca e nessun messaggio che spieghi perché. La fixture la passa; l'ingresso degenere la
nomina, così chi la toglierà per «semplificare» trova scritto cosa succede.

**R4 — la cifra della vista con un campo aperto: la guardia giusta non nomina `vista`.** *Ruling:
`if (comando && valore !== null && voce.campo)`.* Il piano aveva visto il difetto e proposto
`voce.codice !== "vista"`, che cura il sintomo. La causa è che la coda di `eseguiVoce` (`app.js:686`)
esiste per «il valore entra nel campo appena aperto», e il campo lo apre `apriComando` (`:296`),
chiamato **solo** da voci con un `campo` (nove punti: `:754`, `:773`, `:813`, `:846`, `:855`, `:861`,
`:865`, `:882`, `:895`). `voce.campo` è la condizione vera, copre `vista` e copre la prossima voce
senza campo che porti un valore. *Costo se sbagliato*: col campo aperto e il fuoco perso con un clic
nel piano, premere `2` scrive «2» nel campo e **conferma** — cioè crea un nodo, o sposta quello
selezionato, mentre l'utente credeva di cambiare vista. Silenzioso e distruttivo, e nessun test JS lo
prende: sta in `app.js`.

**R5 — lo strato fra aste e nodi: il mutante che il piano dava per non uccidibile si uccide.**
*Ruling: si aggiunge il test dell'ordine, tre righe.* Il DOM finto di `piano.test.js` tiene i figli in
un array ordinato (`append` fa `push`, `:123`), quindi `svg._figli[0]._figli` **è** l'ordine di
disegno, e l'indice dello strato si confronta con quello dell'ultima `data-tipo="asta"` e del primo
`data-tipo="nodo"`. Cade il mutante «`gruppo.append(g)` dopo il ciclo dei nodi». *Costo se sbagliato*:
il diagramma copre i cerchi dei nodi e un clic sul nodo prende il poligono — il `[data-tipo]` del
`closest` (`piano.js:100`) non lo trova e la selezione scivola su `suSfondo()`. Nota d'ordine: lo
strato si aggancia dopo le aste e **prima** del blocco del ghost (`:144-176`), quindi l'anteprima del
comando resta sopra i risultati — che è giusto: è l'unica cosa che si sta facendo adesso.

**R6 — il badge copre i picchi in alto a destra: si mette fra gli ostacoli.** *Ruling: sì, cinque
righe, e il debito sparisce invece di essere dichiarato.* Il badge è un `<p>` in px fuori dal
`viewBox`, quindi `disponi` non lo vede e un picco lì sotto si nasconde sotto di lui. Le etichette
**dei nodi** non le può spostare nessuno (le posa `versoLibero`, non `disponi`), ma i picchi sì, e
sono loro che devono cedere: il badge porta la scala dichiarata, che è la cosa che non può mai
mancare (P3, `07-ux-modellatore.md:99`, «nessuna deformata senza scala dichiarata»). La conversione
px → `viewBox` non è un semplice offset perché `preserveAspectRatio="xMidYMid meet"` (`piano.js:112`)
centra il riquadro: il bordo del viewport è il centro più mezza misura in pixel per `s`. *Costo se
sbagliato*: un numero che c'è, che serve, e che non si legge — e in una figura di tesi è il tipo di
cosa che si nota solo alla stampa.

**R7 — `preserveAspectRatio: "none"` sulla striscia: non si spedisce.** *Ruling: la striscia si
disegna in pixel, senza `viewBox`.* Con `viewBox="0 0 1000 100"` e `none`, a 1280 px la colonna del
piano è larga ~400 px: la `x` si comprime di 2,5 e la `y` si dilata, cioè glifi schiacciati di 2,4 a 1
e cerchi delle stazioni diventati ellissi. `vector-effect: non-scaling-stroke` salva il tratto e non
il resto. `piano.js` misura già il contenitore per la stessa ragione (`millimetriPerPixel`,
`:118-122`): stessa strada, tre righe, e il debito non nasce. *Limite dichiarato in cambio*: senza
`viewBox` la striscia non si riadatta da sola a un ridimensionamento della finestra, si rimisura al
prossimo `ridisegna`. È il comportamento che `piano.js` ha già oggi. *Costo se sbagliato*: la figura
della story 39 è illeggibile proprio nella misura in cui è utile, cioè larga.

**R8 — il CSS del blocco riscrive quattro regole che `stile.css` ha già.** *Ruling: si estendono i
selettori, non si copiano le dichiarazioni.* `#risultati-vista label` ripete `.vincolo-gradi label`
(`:99`); `#risultati-vista kbd` ripete `.vuoto kbd` (`:188-189`); `#risultati-scala` ripete
`#file-percorso, #comando-campo, #corsa-inp` (`:236-239`) e il loro `:focus-visible` (`:240-241`); e
serve `#risultati label` in `:235`. **È la R12 della 12, alla seconda occorrenza**, e la 12 aveva
lasciato scritto in `stile.css:232-234` perché non si fa. *Costo se sbagliato*: due definizioni della
stessa casella di testo che divergono al primo ritocco della palette. Resta una scelta di layout:
`class="vincolo-gradi"` sul `fieldset` è riuso buono (bordo, legenda, `accent-color`, anello di
fuoco), ma la sua griglia è `repeat(3, 1fr)` e i radio della vista sono cinque — 3 + 2. Si sovrascrive
la sola `grid-template-columns`, e il Task 6 lo guarda a 1280 px.

**R9 — `#viste` a due righe con `#spazio` su `grid-row: 1 / -1`: regge, e non serve altro.**
*Ruling: si fa com'è scritto.* Il `min-height: 0` che il fix round 1/E ha messo su `#viste` (`:43-46`)
resta nella regola nuova, e — la parte che conta — `:51` dà già `min-height: 0` a `#piano` **e** a
`#spazio`, quindi il canvas three.js non può rialzare il pavimento della riga `1fr` neppure
attraversandone due. `#srotolato` è l'unico elemento di griglia nuovo e la sua `min-height: 0` è nel
CSS del piano; quando è `hidden` fa `display: none` e la riga `auto` collassa a zero, cioè senza
risultati la geometria di oggi torna identica. *Costo se sbagliato*: la barra dei tasti tagliata di
21 px a ogni altezza di finestra, che è esattamente il difetto già pagato una volta.

**R10 — `esito.disegna` e `srotolato.disegna` prendono due forme diverse sotto lo stesso nome.**
*Ruling: si tiene, dichiarato, non si rinomina.* `esito` riceve lo **stato** (`{lavoro, vista, caso,
scalaMano}`) e legge `risultati.lavoro.fin.risultati`; `srotolato` e `piano` ricevono la **vista**
(`risultatiInVista(m)`). Passare l'uno per l'altro solleva. Ma i chiamanti sono due, tutti e due in
`ridisegna`, a tre righe di distanza, e il piano lo scrive già accanto: rinominare costerebbe più
righe di quante ne protegga. *Costo se sbagliato*: un `TypeError` alla prima corsa, cioè rumoroso —
ed è la ragione per cui si può lasciare.

### 3. Gli ingressi degeneri

Il piano non aveva **nessuna** sezione: ogni task ne ha ora una, con il minimo di due righe
`- condizione → oracolo`. Molti oracoli erano già dentro i test scritti nel piano — quelli li ho
raccolti; qui sotto, nella sezione 5, l'elenco di quelli che **mancavano** e che ho aggiunto.

**Per chi dispaccia**: il titolo nei task è `## Ingressi degeneri` alla lettera, non
`**Ingressi degeneri:**` in grassetto come nella 12. Così il brief si fa copiando, senza il passaggio
di ri-titolatura che l'hook `dispatch-gate.py` pretende e che è facile dimenticare.

### 4. Chi esegue, con quale modello, in quale ordine

| task | subagente | modello | skill-gate | giro | comincia dopo |
|---|---|---|---|---|---|
| 1 — il fumo in Chrome headless da pytest | `coder` | `sonnet` | **sì** | A | — |
| 2 — `risultati.js`, le pure | `frontend-engineer` | **`opus`** | **sì** | A | — |
| 3 — `etichette.js`, le pure | `frontend-engineer` | `sonnet` | **sì** | A | — |
| 4 — lo strato nel piano e la deformata 3D | `frontend-engineer` | **`opus`** | **sì**, `impeccable` in modo **Operate** | B | 2, 3 |
| 5 — il blocco, la striscia, i tasti, l'ispettore | `frontend-engineer` | **`opus`** | **sì**, `impeccable` in modo **Operate** | C | 1, 2, 4 |
| 6 — il fumo dei risultati e la prova a mano | `coder` per i copioni, poi **il controller** col browser | `sonnet` | **sì** (`coder`) | D | 5 |

**Giri: A = 1 ‖ 2 ‖ 3; B = 4; C = 5; D = 6.** Il Task 1 è `coder` e non `backend-engineer` perché non
tocca né API né logica di dominio: è un attrezzo di prova (un pilota CDP, una fixture pytest, un
processo Chrome), che è la definizione del ruolo. I Task 2 e 3 sono moduli puri senza superficie, ma
restano `frontend-engineer`: sono la geometria di ciò che il piano disegna, e chi scriverà il Task 4
deve poterli riconoscere come propri.

**Il parallelo di A è vero e va sorvegliato su un punto solo.** I file sono disgiunti — Task 1 scrive
`tests/fumo/*`, `tests/test_fumo_chrome.py`, `AGENTS.md`; Task 2 `static/risultati.js` e il suo test;
Task 3 `static/etichette.js` e il suo test — ma **tre implementer nello stesso worktree condividono
l'indice git**. Regola vincolante, già nei Global Constraints e ripetuta qui perché è il punto dove si
sbaglia: **`git add <percorso>` esplicito, mai `git commit -a`, mai `git add .`**. Un `-a` di uno dei
tre porta nel proprio commit i file mezzi scritti degli altri due.

Il Task 4 dipende dal **codice** di 2 e 3 (li importa), non solo dalle loro forme: per questo B non è
parallelo a niente. Il Task 5 dipende da 4 per `piano.disegna(…, {risultati})` e da 1 perché lo step 8
rilancia il fumo `pagina` sulla pagina col blocco nuovo.

| file | unico task che lo scrive |
|---|---|
| `tests/fumo/cdp.mjs`, `tests/test_fumo_chrome.py`, `AGENTS.md` | 1 |
| `tests/fumo/fumo.mjs` | 1 (il copione `pagina`), poi 6 (il copione `risultati`) — **mai insieme** |
| `static/risultati.js`, `static/test/risultati.test.js` | 2 |
| `static/etichette.js`, `static/test/etichette.test.js` | 3 |
| `static/piano.js`, `static/spazio.js`, `static/test/piano.test.js` | 4 |
| `static/stile.css` | 4 (il badge), poi 5 (`#viste`, `#srotolato`, il blocco) — **mai insieme** |
| `static/esito.js`, `static/test/esito.test.js`, `static/tastiera.js`, `static/test/tastiera.test.js`, `static/pannello.js`, `static/test/pannello.test.js`, `static/index.html`, `static/app.js` | 5 |

**I modelli.** `sonnet` è il default; `opus` va dove il piano lascia davvero da decidere. Ne restano
tre, e sono i tre che questa annotazione ha toccato di più:

- **Task 2 in `opus`**: è il task che R1 ha riscritto. Chi lo esegue deve tenere insieme tre terne
  (schermo, deck, sezione OpenSees) e due convenzioni di segno, e sbagliarne una dà un diagramma che
  **passa i test e mente in pagina**. È anche il modulo da cui dipendono tutti gli altri.
- **Task 4 in `opus`**: entra dentro `creaPiano`, che oggi ha un test solo e nessuna rete; l'ordine
  di disegno, gli ostacoli, l'ombreggiatura delle aste e il badge sono quattro innesti in quattro
  punti diversi di una funzione di 150 righe, con un `vista` da non ombreggiare (step 3).
- **Task 5 in `opus`**: è il più grande e il meno scritto — un modulo nuovo, sei innesti in `app.js`,
  la tastiera, il pannello, l'HTML, il CSS, e la trappola di R4 che nessun test prende.

Il Task 1 sta in `sonnet` perché il codice è scritto per intero nel piano; il Task 3 perché è puro,
piccolo e coi test già stesi; il Task 6 perché è un copione e due `assert`. **Se `opus` è chiuso**, i
tre si dispacciano su `sonnet` lo stesso: sono anche i tre che questa annotazione ha specificato di
più (R1, R4, R5, R6, R7, R8 stanno tutti lì). Ciò che **non** va fatto è dispacciarli con il piano
com'era prima di R1.

**Skill-gate `sì` su tutti e sei**, nessuna deroga: nessuno di questi è meccanico, nemmeno il Task 6
(il copione CDP decide cosa il fumo può vedere). Quale skill la sceglie l'agente assegnato;
`impeccable` in modo **Operate** è l'unica nominata, sui due task che toccano superficie che una
persona guarda. Per `impeccable`: la palette è quella dei Global Constraints, il rosso è
**attenzione** e niente altro, e l'inchiostro dei diagrammi è tratteggiato per la story 63 — non è una
scelta estetica da rinegoziare.

### 5. La ricerca che regge ogni task

Aperto `docs/ricerca/index.md` prima di annotare: la **03** è alla riga **15**, la **07** alla riga
**19** (il piano diceva 13 per la 03: corretto). Le sei righe di `07` e la riga di `03` che il piano
cita in testa sono **esatte tutte e sette**, riaperte una per una.

| task | riferimento | perché conta qui |
|---|---|---|
| 1 | `docs/ricerca/07-ux-modellatore.md:61` | «In casa: 27-34 s a freddo, "nulla lo dice"; "una corsa fallita non alza nessun allarme"» — il fumo è il primo attrezzo che guarda `app.js` mentre gira davvero, invece di fidarsi |
| 2 | `docs/ricerca/03-stack-tecnico.md:94` | «deformata = ricampionare l'asta con funzioni di forma (Hermite) su N punti moltiplicati per scala»: è la riga che `puntiDeformata` esegue alla lettera |
| 2 (la scala) | `docs/ricerca/07-ux-modellatore.md:65` | «the displacements are scaled automatically to ensure that they are clearly visible», fattore nello state block — `scalaAuto` al 5 % del lato, in serie 1-2-5 |
| 2 (il lato teso) | `docs/ricerca/07-ux-modellatore.md:98` | «Diagrammi M sul lato teso (convenzione italiana) [INF, **da verificare con Mario**]»: la ricerca lo lasciava aperto, la decisione di oggi lo chiude — ed è R1 a dire *dove* sia il lato teso |
| 3 | `docs/ricerca/07-ux-modellatore.md:100` | doppio canale, WCAG 1.4.11: un'etichetta che non trova posto si **nasconde**, non si sovrappone — un numero illeggibile non è un secondo canale |
| 4 | `docs/ricerca/07-ux-modellatore.md:99` | «The Auto option will automatically set the scale factor», «Wire Shadow… undeformed shape as a reference», «The scale factor is displayed in the state block» → badge sempre stampato **e** ombra: sono la stessa riga, e il badge è per questo un ostacolo prioritario (R6) |
| 4 (data-ink) | `docs/ricerca/07-ux-modellatore.md:105` | Tufte, data-ink e chartjunk: `fill-opacity: 0.08` e tratteggio invece di un riempimento pieno |
| 5 | `docs/ricerca/07-ux-modellatore.md:101` | «il "controllo che contraddice" = ricalcolo indipendente (es. Σ reazioni = Σ carichi) mostrato accanto»: la riga dell'equilibrio nel blocco **è** questa frase, non un di più |
| 5 (il valore sul nodo) | `docs/ricerca/07-ux-modellatore.md:99` | «View the displacement components for a single joint by right clicking on a joint» → qui il gesto è la selezione, che il programma ha già, e i sei componenti vanno nell'ispettore |
| 6 | `docs/ricerca/07-ux-modellatore.md:62` | ETABS section cut: «a time consuming process», «tedious» — leggere un valore non deve costare un gesto di costruzione; il fumo verifica che il numero sia **scritto**, non ricavabile |

**Sei task su sei con un riferimento, nessun «nessuno».** Il piano ne dichiarava due (07 e 03) e per
il Task 1 nessuno: ne ha uno, e non di sponda.

### 6. I debiti, per il ticket di chiusura

Dichiarati dal piano: `preserveAspectRatio: none` (**chiuso qui**, R7), la deformata 3D senza test, il
badge sopra un'etichetta di nodo (**chiuso qui**, R6). Aggiunti da questa annotazione:

1. **La deformata nello spazio 3D non ha e non avrà un test.** `spazio.js` si dichiara non provabile
   oltre le funzioni pure, e `puntiDeformata` è provata in `risultati.test.js`: ciò che resta senza
   rete è il *cablaggio* (materiale giusto, ombra allo 0,3, geometria costruita dai punti giusti).
   Lo guarda solo l'occhio del Task 6 step 4.
2. **`app.js` resta senza test automatico, ma per la prima volta non del tutto.** È la quinta giornata
   di fila che il task più cucito è il meno protetto (voce 8 dell'11b, 3 dell'11c, 1 dell'11d, 2 della
   12, questa) — con la differenza che il Task 1 di oggi costruisce l'attrezzo che chiude il buco. Il
   punto è che il Task 5 lo usa **una volta sola** (rilancia il copione `pagina`) invece di scriversi
   il proprio copione: la trappola di R4 — campo aperto, fuoco perso, cifra premuta — è tre righe di
   copione e non c'è. Questo è il debito da portare al ticket, non «app.js non ha test».
3. **La legenda di V e N dice il segno e non il lato.** «+ verso i→j» e «+ trazione» restano vere per
   ogni giacitura, ma dopo R1 il *lato* su cui il positivo viene disegnato cambia fra una trave e un
   pilastro, e il badge non lo dice. Su un telaio l'occhio se lo ricava; su un modello con aste
   inclinate, no. Non risolto oggi perché la frase giusta va provata a voce con l'autore.
4. **`sottoSoglia` usa il massimo globale, non quello dell'asta.** Con un pilastro da 2e7 accanto a
   una trave da 3e5, i picchi della trave finiscono sotto il 2 % e non si scrivono: il diagramma si
   vede e il numero no. È la scelta giusta per una figura sola (una scala, un confronto a occhio), ma
   va detta, perché a chi guarda sembra un'etichetta persa.
5. **`_porta_libera()` chiude il socket prima di usarlo.** Due porte prese così possono essere rubate
   fra la `close()` e il `bind` di uvicorn o di Chrome. Localmente non capita; quando capiterà, il
   fallimento sarà «`/json/version` non risponde» e non «porta occupata», cioè il messaggio sbagliato.
   Costo del rimedio (tenere il socket e passarlo) più alto del difetto: dichiarato, non risolto.

**Per il roster** (meta-roster, non scope di questo piano): R1 è il **secondo** difetto di questa
serie in cui un piano assume una convenzione di segno o di terna invece di misurarla — il primo è il
`SEGNO_MY`/`SEGNO_MZ` di `nova/corsa.py:31-39`, che porta ancora la data e il modo in cui è stato
misurato. Il roster non ha oggi un ruolo che, davanti a un piano che tocca grandezze fisiche con una
convenzione, **lanci il solutore e guardi i numeri** prima del dispatch: l'ha fatto questa
annotazione, ma perché il brief lo ha chiesto per nome. Vale guardarlo con `self-improving-agent`
prima della 14, che è la giornata dei modi e della pushover — cioè ancora più convenzioni di segno.

## Contratto dei moduli nuovi (le firme che i task condividono)

```js
// static/risultati.js — tutto puro, niente DOM
export const VISTE = ["deformata", "M", "V", "N"];
export function assiDi(i, j)                                  // {L, e1, e2, n, verticale, M, V, N}: l'asse trasversale del solutore in coordinate schermo e le chiavi che flettono su di lui (R1); aste di lunghezza nulla → null
export const casiDi = (risultati) => Object.keys(risultati?.per_caso ?? {});
export function scala125(v)                                   // 1-2-5: 37 → 20? no: → 50 (il più vicino nel rapporto); v ≤ 0 o non finito → 1
export function latoMaggiore(m)                               // max(estensione x, estensione z, 2000)
export function spostamentoMassimo(m, perCaso)                // max hypot(ux, uz) sui nodi del modello; 0 senza nodi/dati
export function scalaAuto(m, perCaso, frazione = 0.05)        // scala125(frazione·lato/dmax); dmax = 0 → 1
export function puntiDeformata(m, perCaso, scala, segmenti = 8) // [{id, punti: [{x, y, z}, …(segmenti+1)]}] per asta con entrambi i nodi; Hermite nel piano, y lineare
export function scalaDiagrammaAuto(m, perCaso, vista, frazione = 0.08) // mm per unità (N o N·mm); la chiave è per asta (`assiDi`); max nullo → 0
export function diagramma(m, perCaso, vista, scalaD)          // [{id, base: [pi, pj], punti: [{x, z, x_rel, valore}, …], chiave}] per asta con stazioni; M positivo verso −n, V/N verso +n
export function picchi(stazioni, grandezza)                   // [{x_rel, valore}] — il massimo in modulo; più l'estremo di segno opposto se ≥ 5 % del massimo; `grandezza` la dà `assiDi`, non è mai «My» a costante
export function testoValore(vista, v)                         // M → «45 kN·m»; V/N → «30 kN»; deformata → «3,4 mm»; non finito → «—»
export function testoBadge({vista, caso, scala, auto, stantia}) // «deformata · Z1 · ×120 (auto)» · «M · Z1 · kN·m · lato teso» · «V · Z1 · kN · + verso i→j» · «N · Z1 · kN · + trazione»; stantia → «stantia · » davanti
export function righeSpostamenti(perCaso, id)                 // [["spostamenti", "ux 0 mm · uy 0 mm · uz −3,4 mm"], ["rotazioni", "φx 0 mrad · φy 0,8 mrad · φz 0 mrad"]] o [] se il nodo non c'è
export function righeReazioni(perCaso, id)                    // [["reazioni", "Rx 0 kN · Ry 0 kN · Rz 30 kN"], ["momenti di reazione", "Mx 0 kN·m · My 0 kN·m · Mz 0 kN·m"]] o [] se non vincolato
export function testoEquilibrio(risultati, caso)              // «Σ reazioni (0; 0; 60) kN · Σ carichi (0; 0; −60) kN»; senza dati → «—»
export function srotolato(stazioni, grandezza)                // {punti: [{x_rel, valore}], massimo} — massimo in modulo, 0 se vuoto

// static/etichette.js — puro
export const siSovrappongono = (a, b) => …                    // due box {x0, y0, x1, y1}, bordi che si toccano NON si sovrappongono
export function disponi(richieste, ostacoli = [], { passo } = {}) // vedi Task 3: → [{id, testo, x, y, ancora, guida, nascosta, box}]
export const sottoSoglia = (v, massimo, soglia = 0.02) => …  // |v| < soglia·|massimo|

// static/piano.js
disegna(m, { selezione, ghost, azioneInVista, proposte, risultati })
// risultati: null | { vista, caso, perCaso, scala, auto, stantia, risultati: <dict intero> }

// static/spazio.js
disegna(m, { selezione, deformata })   // deformata: null | { aste: puntiDeformata(...), stantia }

// static/pannello.js
disegna(m, selezione, { catalogo, legame, tabella, rilievo, risultati })   // risultati come per piano (o null)

// static/esito.js
export function creaEsito(radice, { suCambio })   // blocco «Risultati»: disegna({ risultati, modello }); suCambio({ caso, vista, scalaMano })
export function creaSrotolato(contenitore)        // striscia: disegna({ risultati, modello, selezione })
```

Lo stato in `app.js`:

```js
// I risultati a schermo: l'ultima corsa con risultati, la vista scelta, il caso, la scala a mano.
// Fuori dalla cronologia come l'ultima corsa: ⌘Z non lo tocca, «apri» lo azzera.
let risultati = null;   // null | { lavoro, vista: "deformata"|"M"|"V"|"N"|null, caso, scalaMano: null|number }
```

e la funzione che lo traduce per i moduli:

```js
function risultatiInVista(m) {
  if (!risultati || !risultati.vista) return null;
  const r = risultati.lavoro.fin.risultati;
  const perCaso = r.per_caso?.[risultati.caso];
  if (!perCaso) return null;
  const auto = risultati.scalaMano === null;
  return { vista: risultati.vista, caso: risultati.caso, perCaso, risultati: r,
           scala: auto ? scalaAuto(m, perCaso) : risultati.scalaMano, auto,
           stantia: stantia(risultati.lavoro, m) };
}
```

---

### Task 1: il test di fumo di `app.js` in Chrome headless, da pytest

**Files:**
- Create: `tests/fumo/cdp.mjs` (pilota CDP: apri, tasto, scrivi, valuta, viewport)
- Create: `tests/fumo/fumo.mjs` (i copioni: `pagina` oggi; `risultati` nel Task 6)
- Create: `tests/test_fumo_chrome.py`
- Modify: `AGENTS.md` (una riga nella sezione dei test: cos'è il fumo e quando salta)

**Interfaces:**
- Consumes: `create_app` (`nova/server.py:238`), `SidecarInProcesso` (`:49`), `STATICI`; `uvicorn`.
- Produces: `python tests/fumo/fumo.mjs '{"porta": 8xxx, "cdp": 9xxx, "copione": "pagina", "larghezze": [1280, 1920]}'` → una riga JSON su stdout `{ "ok": true|false, "errori": [...], "console": [...], "trovato": {...} }`; la fixture pytest `chrome_e_server` che dà `(porta, cdp)`.

**Riferimento:** `docs/ricerca/07-ux-modellatore.md:61`

## Ingressi degeneri
- Chrome assente, o `node` assente → `pytest.skip` col motivo scritto in italiano, mai un fallimento
- Chrome installato che non risponde su `/json/version` entro 15 s → **fallisce** con `RuntimeError: http://127.0.0.1:<cdp>/json/version non risponde`, non salta: uno strumento che c'è e non parte è un ambiente rotto, e farne uno skip rende la suite verde per sempre
- il server non risponde su `/api/salute` entro 15 s → stesso `RuntimeError` con il proprio URL, e la fixture non cede il controllo al test
- `create_app` senza `porta=` → ogni richiesta del browser prende 403 dal middleware `_blocca_host_estraneo` (`nova/server.py:306`) e la pagina resta bianca: la fixture passa `porta=porta`, e il test se ne accorge perché nessun `#piano svg circle` compare
- il copione node esce con codice ≠ 0 → l'`assert` mostra lo `stderr` intero, e nessuno prova a leggere uno stdout vuoto
- lo stdout del copione porta righe di rumore prima del JSON → si legge **l'ultima** riga (`splitlines()[-1]`), non la prima
- Chrome non muore a `terminate()` entro 5 s → `kill()`, e la fixture finisce comunque

- [ ] **Step 1: il pilota CDP in repo**

`tests/fumo/cdp.mjs`:

```js
// Pilota minimo di Chrome headless via CDP: tasti veri, DOM vero. Niente dipendenze —
// `WebSocket` è globale in node dal 22. Usato solo dal test di fumo (`tests/test_fumo_chrome.py`).
let ws, id = 0;
const attese = new Map();
const eventi = [];   // `Runtime.exceptionThrown` e `Log.entryAdded` di livello error: il copione li legge alla fine

export async function apri(url, cdp, { larghezza = 1280, altezza = 800, dpr = 1 } = {}) {
  const r = await fetch(`http://127.0.0.1:${cdp}/json/new?${url}`, { method: "PUT" });
  const t = await r.json();
  ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((ok, no) => { ws.onopen = ok; ws.onerror = no; });
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && attese.has(d.id)) { attese.get(d.id)(d); attese.delete(d.id); return; }
    if (d.method === "Runtime.exceptionThrown") eventi.push(`eccezione: ${d.params.exceptionDetails?.exception?.description ?? d.params.exceptionDetails?.text}`);
    if (d.method === "Log.entryAdded" && d.params.entry.level === "error") eventi.push(`console: ${d.params.entry.text}`);
  };
  for (const m of ["Page.enable", "Runtime.enable", "Network.enable", "Log.enable"]) await cmd(m);
  await cmd("Network.setCacheDisabled", { cacheDisabled: true });  // `?v=` non scavalca la cache dei moduli
  await viewport(larghezza, altezza, dpr);
  await cmd("Page.reload", { ignoreCache: true });
  await pausa(1500);
  return t.id;
}

export function cmd(method, params = {}) {
  return new Promise((ok, no) => {
    const mio = ++id;
    attese.set(mio, (d) => (d.error ? no(new Error(`${method}: ${JSON.stringify(d.error)}`)) : ok(d.result)));
    ws.send(JSON.stringify({ id: mio, method, params }));
  });
}

export const viewport = (width, height, deviceScaleFactor = 1) =>
  cmd("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor, mobile: false });

/** Valuta un'espressione nella pagina e ne rende il valore (attende le promesse). */
export async function ev(expr) {
  const r = await cmd("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? JSON.stringify(r.exceptionDetails));
  return r.result.value;
}

const MOD = { alt: 1, ctrl: 2, meta: 4, shift: 8 };
const SPECIALI = { Enter: 13, Escape: 27, Backspace: 8, Tab: 9, ArrowUp: 38, ArrowDown: 40, ArrowLeft: 37, ArrowRight: 39 };

/** Un tasto come lo preme una persona: `tasto("n")`, `tasto("o", {meta: true})`, `tasto("Enter")`. */
export async function tasto(k, mods = {}) {
  const modifiers = Object.entries(mods).reduce((s, [n, v]) => s + (v ? MOD[n] : 0), 0);
  const speciale = k in SPECIALI;
  const code = speciale ? k : (/^[a-z]$/i.test(k) ? `Key${k.toUpperCase()}` : (/^[0-9]$/.test(k) ? `Digit${k}` : undefined));
  const base = { key: k, code, modifiers, windowsVirtualKeyCode: speciale ? SPECIALI[k] : k.toUpperCase().charCodeAt(0) };
  // Invio: `keyDown` con `text: "\r"`, altrimenti il `<form>` non fa il submit implicito (misurato nella 11c).
  const testo = k === "Enter" ? "\r" : (speciale || mods.meta || mods.ctrl ? undefined : k);
  await cmd("Input.dispatchKeyEvent", { type: testo === undefined ? "rawKeyDown" : "keyDown", text: testo, unmodifiedText: testo, ...base });
  await cmd("Input.dispatchKeyEvent", { type: "keyUp", ...base });
  await pausa(60);
}

/** Scrive un testo carattere per carattere nel controllo a fuoco (keydown + input veri). */
export async function scrivi(testo) {
  for (const ch of testo) {
    await cmd("Input.dispatchKeyEvent", { type: "keyDown", key: ch, text: ch, unmodifiedText: ch });
    await cmd("Input.dispatchKeyEvent", { type: "keyUp", key: ch });
  }
  await pausa(60);
}

/** Aspetta che `expr` sia vero, al più `ms` millisecondi; rende l'ultimo valore. */
export async function finche(expr, ms = 30000, ogni = 250) {
  const fine = Date.now() + ms;
  let v;
  while (Date.now() < fine) { v = await ev(expr); if (v) return v; await pausa(ogni); }
  throw new Error(`tempo scaduto su: ${expr} (ultimo valore ${JSON.stringify(v)})`);
}

export const pausa = (ms) => new Promise((ok) => setTimeout(ok, ms));
export const erroriRaccolti = () => [...eventi];
export function chiudi() { ws?.close(); }
```

- [ ] **Step 2: il copione `pagina`**

`tests/fumo/fumo.mjs`:

```js
// I copioni del test di fumo: pytest li lancia con un JSON in argv[2] e legge una riga JSON su
// stdout. Ogni copione preme tasti veri e legge il DOM vero: è l'unico test di `app.js`.
import { apri, tasto, scrivi, ev, finche, viewport, erroriRaccolti, chiudi, pausa } from "./cdp.mjs";

const arg = JSON.parse(process.argv[2] ?? "{}");
const url = `http://127.0.0.1:${arg.porta}/`;

// Le coppie di `<text>` dell'SVG del piano che si sovrappongono, come rettangoli a schermo.
// I bordi che si toccano non contano. Vuoto = nessuna sovrapposizione.
const SOVRAPPOSTE = `(() => {
  const r = [...document.querySelectorAll("#piano svg text")].map((t) => [t.textContent, t.getBoundingClientRect()]);
  const s = [];
  for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) {
    const a = r[i][1], b = r[j][1];
    if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) s.push([r[i][0], r[j][0]]);
  }
  return s;
})()`;

const COPIONI = {
  // La pagina si apre, la tastiera risponde dal primo secondo, un nodo si posa da tastiera.
  async pagina() {
    await apri(url, arg.cdp);
    await tasto("n"); await scrivi("0; 0"); await tasto("Enter");
    const cerchi = await finche(`document.querySelectorAll("#piano svg circle").length`, 5000);
    const messaggio = await ev(`document.getElementById("messaggio").textContent`);
    const albero = await ev(`document.getElementById("albero-elenco").textContent`);
    return { cerchi, messaggio, albero };
  },
};

let esito;
try {
  const trovato = await COPIONI[arg.copione]();
  esito = { ok: true, trovato, errori: erroriRaccolti() };
} catch (e) {
  esito = { ok: false, errori: [...erroriRaccolti(), String(e?.stack ?? e)] };
} finally {
  chiudi();
}
process.stdout.write(JSON.stringify(esito) + "\n");
process.exit(0);
```

- [ ] **Step 3: il test pytest, che salta senza Chrome**

`tests/test_fumo_chrome.py`:

```python
"""Il test di fumo dell'interfaccia: `app.js` in Chrome headless, tasti veri, DOM vero.

`node --test` prova le funzioni pure (`tests/test_js.py`); questo prova la cucitura — che la pagina
si apra, che la tastiera risponda, che il piano disegni. Salta se manca Chrome o node: non è un
fallimento, è un attrezzo assente. Debito dichiarato nella giornata 12 (`app.js` senza test).
"""
import json
import os
import shutil
import socket
import subprocess
import threading
import time
import urllib.request
from pathlib import Path

import pytest

RADICE = Path(__file__).resolve().parent.parent
FUMO = RADICE / "tests" / "fumo" / "fumo.mjs"
CANDIDATI_CHROME = (
    shutil.which("google-chrome"), shutil.which("chromium"), shutil.which("chromium-browser"),
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
)


def _chrome() -> str | None:
    for c in CANDIDATI_CHROME:
        if c and os.access(c, os.X_OK):
            return c
    return None


def _porta_libera() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def _attendi_http(url: str, secondi: float = 15.0) -> None:
    fine = time.monotonic() + secondi
    while time.monotonic() < fine:
        try:
            urllib.request.urlopen(url, timeout=1).read()
            return
        except Exception:
            time.sleep(0.2)
    raise RuntimeError(f"{url} non risponde")


@pytest.fixture
def chrome_e_server(tmp_path):
    chrome = _chrome()
    if chrome is None:
        pytest.skip("Chrome non è installato: il fumo dell'interfaccia non si prova qui")
    if shutil.which("node") is None:
        pytest.skip("node non è installato: il fumo dell'interfaccia non si prova qui")
    import uvicorn
    from nova.server import SidecarInProcesso, create_app

    porta, cdp = _porta_libera(), _porta_libera()
    app = create_app(SidecarInProcesso(), tmp_path / "corse", porta=porta)
    server = uvicorn.Server(uvicorn.Config(app, host="127.0.0.1", port=porta, log_level="warning"))
    filo = threading.Thread(target=server.run, daemon=True)
    filo.start()
    _attendi_http(f"http://127.0.0.1:{porta}/api/salute")
    proc = subprocess.Popen([
        chrome, "--headless=new", f"--remote-debugging-port={cdp}",
        f"--user-data-dir={tmp_path / 'profilo'}", "--no-first-run", "--no-default-browser-check",
        "--window-size=1280,800", "about:blank",
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        _attendi_http(f"http://127.0.0.1:{cdp}/json/version")
        yield porta, cdp
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()
        server.should_exit = True
        filo.join(timeout=5)


def copione(nome: str, porta: int, cdp: int, **extra) -> dict:
    arg = json.dumps({"porta": porta, "cdp": cdp, "copione": nome, **extra})
    esito = subprocess.run(["node", str(FUMO), arg], capture_output=True, text=True, cwd=RADICE, timeout=120)
    assert esito.returncode == 0, esito.stderr
    return json.loads(esito.stdout.strip().splitlines()[-1])


def test_la_pagina_si_apre_e_un_nodo_si_posa_da_tastiera(chrome_e_server):
    porta, cdp = chrome_e_server
    r = copione("pagina", porta, cdp)
    assert r["ok"], r
    assert r["errori"] == [], r["errori"]           # nessuna eccezione né errore in console
    assert r["trovato"]["cerchi"] >= 1               # il nodo è nel piano
    assert r["trovato"]["messaggio"] == ""           # e nessun messaggio d'errore
    assert "0 mm" in r["trovato"]["albero"]          # e nell'albero, con l'unità
```

- [ ] **Step 4: lanciare, e vedere che passa (o salta con il motivo)**

Run: `/Users/mario/GitHub/NOVA-wt/interfaccia-13/.venv/bin/python -P -m pytest /Users/mario/GitHub/NOVA-wt/interfaccia-13/tests/test_fumo_chrome.py -p no:cacheprovider --color=no --tb=short -rs --rootdir=/Users/mario/GitHub/NOVA-wt/interfaccia-13`
Expected: `1 passed` sul Mac dell'autore (Chrome in `/Applications`); `1 skipped` con il motivo altrove. Se fallisce con «tempo scaduto» su `circle`: la pagina non ha ricevuto il tasto — controllare che `Page.reload` sia seguito dalla pausa e che il fuoco sia sul `body`.

- [ ] **Step 5: una riga in `AGENTS.md`** nella sezione dei test: «`tests/test_fumo_chrome.py`: `app.js` in Chrome headless via CDP (`tests/fumo/`); salta senza Chrome o node; è l'unico test della cucitura».

- [ ] **Step 6: Commit**

```bash
git -C /Users/mario/GitHub/NOVA-wt/interfaccia-13 add tests/fumo/cdp.mjs tests/fumo/fumo.mjs tests/test_fumo_chrome.py AGENTS.md
git -C /Users/mario/GitHub/NOVA-wt/interfaccia-13 commit -m "test(interfaccia): il fumo di app.js in Chrome headless via CDP, da pytest"
```

---

### Task 2: `risultati.js` — la geometria dei risultati, pura

**Files:**
- Create: `static/risultati.js`
- Test: `static/test/risultati.test.js`

**Interfaces:**
- Consumes: `conciso` da `static/numeri.js:195`; `nodo`, `asta` da `static/modello.js`.
- Produces: le firme del «Contratto dei moduli nuovi». Le usano piano (Task 4), spazio (Task 4), pannello ed esito (Task 5).

**Riferimento:** `docs/ricerca/03-stack-tecnico.md:94` (Hermite), `docs/ricerca/07-ux-modellatore.md:65` (scala automatica), `:98` (M sul lato teso)

## Ingressi degeneri
- modello senza nodi o senza aste → `puntiDeformata` e `diagramma` rendono `[]`, `latoMaggiore` rende 2000, `scalaAuto` rende 1; nessuna funzione solleva
- asta orfana (un nodo che non esiste nel modello) → saltata da `puntiDeformata` e da `diagramma`, non disegnata a metà
- asta con i due nodi coincidenti (L = 0) → `assiDi` rende `null` e l'asta si salta: mai un `NaN` fra i punti
- `per_caso` con uno spostamento su un nodo che non è nel modello → ignorato: `spostamentoMassimo` non lo conta e nessuna asta lo cerca, quindi non alza la scala automatica
- spostamenti tutti nulli nel piano → `scalaAuto` rende **1**, non `Infinity`, e la deformata coincide con l'ombra
- `spostamenti[id]` con meno di sei componenti, o con un `null`/`NaN` dentro → trattato come assente (nodo fermo), mai un `NaN` propagato nel `points`
- due stazioni con lo stesso `x_rel` → `diagramma` rende due punti alla stessa ascissa e il poligono ci passa due volte; `picchi` ne sceglie **uno** solo, quindi l'etichetta si scrive una volta, non due sovrapposte
- `x_rel` non finito, o `My`/`Mz`/`Vy`/`Vz` non finiti → la stazione vale 0 nel disegno e viene scartata da `picchi` e da `srotolato`; il diagramma resta chiuso
- `scala` a mano enorme (la deformata esce dal `viewBox`) → il piano **non** ri-inquadra: `estensione` (`piano.js:47-60`) guarda i soli nodi e il ghost, e re-inquadrare farebbe rimpicciolire il modello a ogni giro della scala. Il badge dice `×n (a mano)`, ed è il numero che spiega perché non si vede più niente
- vista fuori da `M`/`V`/`N` passata a `diagramma` o a `scalaDiagrammaAuto` → solleva `vista sconosciuta: <x>`, non disegna qualcosa di plausibile
- massimo di una grandezza nullo su tutto il modello → `scalaDiagrammaAuto` rende **0** (diagramma piatto), non `Infinity`
- `testoEquilibrio` su un caso che non c'è, o senza `carico_totale` → `«—»`, e la metà che c'è si stampa lo stesso (`Σ reazioni (…) · Σ carichi —`)

- [ ] **Step 1: i test, con la trave appoggiata come oracolo**

`static/test/risultati.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { VISTE, assiDi, casiDi, scala125, latoMaggiore, spostamentoMassimo, scalaAuto, puntiDeformata,
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
  assert.equal(spostamentoMassimo(trave, perCaso), 3);
  assert.equal(scalaAuto(trave, perCaso), 100);   // 0,05·6000/3 = 100
  assert.equal(scalaAuto(trave, { spostamenti: {} }), 1, "senza spostamenti la scala è 1");
  assert.equal(scalaAuto(trave, Z1), 1, "spostamenti nulli nel piano: 1, non Infinity");
  assert.equal(scalaAuto({ nodi: [], aste: [] }, Z1), 1);
  assert.equal(spostamentoMassimo(trave, { spostamenti: { 1: [3, 0, 4, 0, 0, 0] } }), 5, "nel piano: hypot(ux, uz)");
  assert.equal(spostamentoMassimo(trave, { spostamenti: { 9: [100, 0, 0, 0, 0, 0] } }), 0, "un nodo che non è nel modello non conta");
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
  const [dV] = diagramma(pilastro, perCaso, "V", 1e-2);
  assert.equal(dV.chiave, "Vy");
  assert.ok(dV.punti[0].x > 0, "V positivo verso +n");
  const [dN] = diagramma(pilastro, perCaso, "N", 1e-2);
  assert.ok(dN.punti[0].x < 0, "N negativo (compressione) verso −n");
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
  assert.equal(testoBadge({ vista: "V", caso: "Z1" }), "V · Z1 · kN · + verso i→j");
  assert.equal(testoBadge({ vista: "N", caso: "Z1" }), "N · Z1 · kN · + trazione");
  assert.equal(testoBadge({ vista: "M", caso: "Z1", stantia: true }), "stantia · M · Z1 · kN·m · lato teso");
  assert.equal(testoBadge({ vista: null }), "");
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
```

- [ ] **Step 2: lanciare i test e vederli fallire** (`Cannot find module '../risultati.js'`)

Run: `env -C /Users/mario/GitHub/NOVA-wt/interfaccia-13/static node --test test/risultati.test.js`

- [ ] **Step 3: il modulo**

`static/risultati.js`:

```js
// La geometria dei risultati statici nel piano x–z, pura: niente DOM, niente three.js. Il piano
// e lo spazio disegnano quel che esce da qui; l'ispettore e il blocco «Risultati» stampano i testi.
//
// Il contratto è quello di `nova/corsa.py:_stazioni` e `risultati_da_uscite`: `per_caso[caso]` con
// `spostamenti["<id>"][6]` (ux uy uz rx ry rz in mm e rad), `reazioni["<id>"][6]` (N e N·mm, solo
// i vincolati), `sollecitazioni["<id_asta>"]` liste di stazioni `{x_rel, N, Vy, Vz, T, My, Mz}`.
// Nel piano x–z contano `My`, `Vz`, `N`, `ux`, `uz`, `ry`.

import { conciso } from "./numeri.js";
import { nodo } from "./modello.js";

export const VISTE = ["deformata", "M", "V", "N"];
const LATO_MINIMO = 2000;   // mm, come `piano.js`: un modello con un nodo non ha estensione
const COSENO_VERTICALE = 0.999;   // `_COSENO_VERTICALE`, `nova/deck.py:35`: la stessa soglia del deck

export const casiDi = (risultati) => Object.keys(risultati?.per_caso ?? {});

/** La serie 1-2-5: 37 → 50, 120 → 100, 1,4 → 1. Un valore non positivo o non finito dà 1. */
export function scala125(v) {
  if (!Number.isFinite(v) || v <= 0) return 1;
  const esp = Math.floor(Math.log10(v));
  const mantissa = v / 10 ** esp;
  // Il candidato più vicino nel rapporto (in scala logaritmica), fra 1, 2, 5 e 10.
  let scelto = 1, distanza = Infinity;
  for (const c of [1, 2, 5, 10]) {
    const d = Math.abs(Math.log10(mantissa / c));
    if (d < distanza) { distanza = d; scelto = c; }
  }
  return scelto * 10 ** esp;
}

export function latoMaggiore(m) {
  const nodi = m?.nodi ?? [];
  if (nodi.length === 0) return LATO_MINIMO;
  const xs = nodi.map((n) => n.x), zs = nodi.map((n) => n.z);
  return Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs), LATO_MINIMO);
}

const spostamentoDi = (perCaso, id) => {
  const u = perCaso?.spostamenti?.[String(id)];
  return Array.isArray(u) && u.length >= 6 && u.every(Number.isFinite) ? u : null;
};

export function spostamentoMassimo(m, perCaso) {
  let massimo = 0;
  for (const n of m?.nodi ?? []) {
    const u = spostamentoDi(perCaso, n.id);
    if (u) massimo = Math.max(massimo, Math.hypot(u[0], u[2]));
  }
  return massimo;
}

/** La scala che porta il massimo spostamento nel piano a `frazione` del lato maggiore, in 1-2-5.
 *  Spostamenti nulli → 1: la deformata coincide con l'ombra, e il badge dice «×1». */
export function scalaAuto(m, perCaso, frazione = 0.05) {
  const dmax = spostamentoMassimo(m, perCaso);
  return dmax > 0 ? scala125(frazione * latoMaggiore(m) / dmax) : 1;
}

/** La terna di un'asta nel piano **e** l'asse su cui il solutore misura la flessione in questo
 *  piano. `e1` lungo i→j, `e2` la normale sinistra dello schermo; `n` l'asse trasversale del
 *  solutore in coordinate schermo, ed è lui — non `e2` — che decide da che parte va disegnato
 *  un diagramma.
 *
 *  Perché non coincidono: `nova/deck.py:_terna` (`:172-191`) prende `e2_deck` = verticale
 *  proiettata e `e1_deck = e2_deck × a`. Per un'asta **coricata** `e2_deck` (la `z` locale) sta
 *  nel piano x–z e vale `sign(e1.x)·e2`; per un'asta **in piedi** `e2_deck` è la `y` globale,
 *  fuori dal piano, e quello che resta in piano è `e1_deck` (la `y` locale) = `−e2`. Da qui le
 *  due coppie di chiavi: trave → `My`/`Vz`, pilastro → `Mz`/`Vy`.
 *
 *  Misurato sul telaio 2×1 il 10/09/2026 (`tests/fixture/telaio_2x1.nova.json`, tutti i casi):
 *  pilastri `|My|max ≤ 2,2e-9` e `|Mz|max` fino a 2,1e7; travi `|Mz|max ≤ 9,3e-10` e `|My|max`
 *  fino a 5,4e7. Con una mappa costante `{M:"My"}` ogni pilastro sarebbe una riga piatta. */
export function assiDi(i, j) {
  const L = Math.hypot(j.x - i.x, j.z - i.z);
  if (!(L > 0)) return null;
  const e1 = { x: (j.x - i.x) / L, z: (j.z - i.z) / L };
  const e2 = { x: -e1.z, z: e1.x };
  const verticale = Math.abs(e1.z) > COSENO_VERTICALE;
  const s = verticale ? -1 : (Math.sign(e1.x) || 1);
  return { L, e1, e2, verticale, n: { x: s * e2.x, z: s * e2.z },
           M: verticale ? "Mz" : "My", V: verticale ? "Vy" : "Vz", N: "N" };
}

/** La deformata per asta, con le funzioni di forma di Hermite nel piano (`docs/ricerca/03-stack-tecnico.md:94`):
 *  spostamento assiale lineare, trasversale cubico dalle frecce e dalle rotazioni degli estremi.
 *  La rotazione attorno a `y` con la regola della mano destra dà `dw/ds = −θy` (θ × r sull'asse
 *  dell'asta, proiettato sulla normale sinistra). `y` fuori dal piano: lineare. */
export function puntiDeformata(m, perCaso, scala, segmenti = 8) {
  const n = Math.max(1, Math.floor(segmenti));
  const zero = [0, 0, 0, 0, 0, 0];
  const fuori = [];
  for (const a of m?.aste ?? []) {
    const i = nodo(m, a.nodo_i), j = nodo(m, a.nodo_j);
    if (!i || !j) continue;
    const t = assiDi(i, j);
    if (!t) continue;
    const ui = spostamentoDi(perCaso, i.id) ?? zero, uj = spostamentoDi(perCaso, j.id) ?? zero;
    const { L, e1, e2 } = t;
    const ai = ui[0] * e1.x + ui[2] * e1.z, aj = uj[0] * e1.x + uj[2] * e1.z;   // assiali
    const wi = ui[0] * e2.x + ui[2] * e2.z, wj = uj[0] * e2.x + uj[2] * e2.z;   // trasversali
    const pi = -ui[4], pj = -uj[4];                                               // dw/ds = −θy
    const punti = [];
    for (let k = 0; k <= n; k++) {
      const s = k / n, s2 = s * s, s3 = s2 * s;
      const w = (1 - 3 * s2 + 2 * s3) * wi + (s - 2 * s2 + s3) * L * pi + (3 * s2 - 2 * s3) * wj + (-s2 + s3) * L * pj;
      const u = (1 - s) * ai + s * aj;
      const x = i.x + e1.x * (s * L + scala * u) + e2.x * scala * w;
      const z = i.z + e1.z * (s * L + scala * u) + e2.z * scala * w;
      const y = i.y + s * (j.y - i.y) + scala * ((1 - s) * ui[1] + s * uj[1]);
      punti.push({ x, y, z });
    }
    fuori.push({ id: a.id, punti });
  }
  return fuori;
}

const controllaVista = (vista) => {
  if (!["M", "V", "N"].includes(vista)) throw new Error(`vista sconosciuta: ${vista}`);
  return vista;
};

const stazioniDi = (perCaso, id) => {
  const s = perCaso?.sollecitazioni?.[String(id)];
  return Array.isArray(s) ? s : [];
};

/** Le aste disegnabili con la loro chiave: la coppia (asta, chiave) in un punto solo, così
 *  `scalaDiagrammaAuto` e `diagramma` non possono divergere sul nome della grandezza. */
function asteConAssi(m, perCaso, vista) {
  const fuori = [];
  for (const a of m?.aste ?? []) {
    const i = nodo(m, a.nodo_i), j = nodo(m, a.nodo_j);
    if (!i || !j) continue;
    const t = assiDi(i, j);
    if (!t) continue;
    fuori.push({ a, i, j, t, chiave: t[vista], stazioni: stazioniDi(perCaso, a.id) });
  }
  return fuori;
}

/** Millimetri per unità (N o N·mm) che portano il massimo a `frazione` del lato maggiore.
 *  Il massimo si prende **con la chiave di ciascuna asta**: su un telaio la scala deve tenere
 *  insieme il `My` delle travi e il `Mz` dei pilastri, che sono lo stesso momento nel piano. */
export function scalaDiagrammaAuto(m, perCaso, vista, frazione = 0.08) {
  let massimo = 0;
  for (const { chiave, stazioni } of asteConAssi(m, perCaso, controllaVista(vista))) {
    for (const s of stazioni) if (Number.isFinite(s[chiave])) massimo = Math.max(massimo, Math.abs(s[chiave]));
  }
  return massimo > 0 ? frazione * latoMaggiore(m) / massimo : 0;
}

/** I diagrammi per stazione. M positivo (fibre tese) verso **−n**, V e N verso **+n**, dove `n`
 *  è l'asse trasversale del solutore (`assiDi`): sotto una trave qualunque sia l'ordine dei suoi
 *  nodi, a sinistra di un pilastro che sale. `chiave` esce insieme ai punti perché chi disegna
 *  i picchi e la striscia deve leggere le stesse stazioni con lo stesso nome. */
export function diagramma(m, perCaso, vista, scalaD) {
  controllaVista(vista);
  const verso = vista === "M" ? -1 : 1;
  const fuori = [];
  for (const { a, i, j, t, chiave, stazioni } of asteConAssi(m, perCaso, vista)) {
    if (stazioni.length === 0) continue;
    const { L, e1, n } = t;
    const punti = stazioni.map((s) => {
      const valore = Number.isFinite(s[chiave]) ? s[chiave] : 0;
      const d = verso * valore * scalaD;
      return { x: i.x + e1.x * s.x_rel * L + n.x * d, z: i.z + e1.z * s.x_rel * L + n.z * d, x_rel: s.x_rel, valore };
    });
    fuori.push({ id: a.id, chiave, base: [{ x: i.x, z: i.z }, { x: j.x, z: j.z }], punti });
  }
  return fuori;
}

/** I picchi da scrivere: il massimo in modulo e, se cambia segno in modo visibile (≥ 5 % del
 *  massimo), anche l'estremo opposto. Tutto nullo → niente da scrivere. */
export function picchi(stazioni, grandezza) {
  const valide = (stazioni ?? []).filter((s) => Number.isFinite(s?.[grandezza]) && Number.isFinite(s?.x_rel));
  if (valide.length === 0) return [];
  const max = valide.reduce((a, s) => (s[grandezza] > a[grandezza] ? s : a));
  const min = valide.reduce((a, s) => (s[grandezza] < a[grandezza] ? s : a));
  const [primo, secondo] = Math.abs(max[grandezza]) >= Math.abs(min[grandezza]) ? [max, min] : [min, max];
  if (primo[grandezza] === 0) return [];
  const fuori = [{ x_rel: primo.x_rel, valore: primo[grandezza] }];
  if (Math.sign(secondo[grandezza]) === -Math.sign(primo[grandezza]) &&
      Math.abs(secondo[grandezza]) >= 0.05 * Math.abs(primo[grandezza])) {
    fuori.push({ x_rel: secondo.x_rel, valore: secondo[grandezza] });
  }
  return fuori;
}

const UNITA = { M: [1e6, "kN·m"], V: [1e3, "kN"], N: [1e3, "kN"], deformata: [1, "mm"] };
export function testoValore(vista, v) {
  if (!Number.isFinite(v)) return "—";
  const [fattore, unita] = UNITA[vista] ?? [1, ""];
  return `${conciso(v / fattore)} ${unita}`.trim();
}

const LEGENDA = { M: "kN·m · lato teso", V: "kN · + verso i→j", N: "kN · + trazione" };
export function testoBadge({ vista, caso, scala, auto, stantia = false }) {
  if (!vista) return "";
  const coda = vista === "deformata" ? `×${conciso(scala)} (${auto ? "auto" : "a mano"})` : LEGENDA[vista];
  return `${stantia ? "stantia · " : ""}${vista} · ${caso} · ${coda}`;
}

const kN = (v) => `${conciso(v / 1e3)} kN`;
const kNm = (v) => `${conciso(v / 1e6)} kN·m`;
const mm = (v) => `${conciso(v)} mm`;
const mrad = (v) => `${conciso(v * 1e3)} mrad`;
const terna_ = (nomi, valori, f) => nomi.map((n, k) => `${n} ${f(valori[k])}`).join(" · ");

export function righeSpostamenti(perCaso, id) {
  const u = spostamentoDi(perCaso, id);
  if (!u) return [];
  return [["spostamenti", terna_(["ux", "uy", "uz"], u.slice(0, 3), mm)],
          ["rotazioni", terna_(["φx", "φy", "φz"], u.slice(3, 6), mrad)]];
}

export function righeReazioni(perCaso, id) {
  const r = perCaso?.reazioni?.[String(id)];
  if (!Array.isArray(r) || r.length < 6 || !r.every(Number.isFinite)) return [];
  return [["reazioni", terna_(["Rx", "Ry", "Rz"], r.slice(0, 3), kN)],
          ["momenti di reazione", terna_(["Mx", "My", "Mz"], r.slice(3, 6), kNm)]];
}

/** «Σ reazioni (0; 0; 60) kN · Σ carichi (0; 0; −60) kN»: il controllo che contraddice, accanto
 *  al numero (`docs/ricerca/07-ux-modellatore.md:101`). Il caso che non c'è dà un trattino. */
export function testoEquilibrio(risultati, caso) {
  const perCaso = risultati?.per_caso?.[caso];
  if (!perCaso) return "—";
  const somma = [0, 0, 0];
  for (const r of Object.values(perCaso.reazioni ?? {})) for (let k = 0; k < 3; k++) somma[k] += Number(r?.[k]) || 0;
  const vettore = (v) => `(${v.map((x) => conciso(x / 1e3)).join("; ")}) kN`;
  const carichi = risultati?.run?.carico_totale?.[caso];
  const testoCarichi = Array.isArray(carichi) && carichi.length >= 3 ? vettore(carichi.slice(0, 3)) : "—";
  return `Σ reazioni ${vettore(somma)} · Σ carichi ${testoCarichi}`;
}

export function srotolato(stazioni, grandezza) {
  const punti = (stazioni ?? []).filter((s) => Number.isFinite(s?.[grandezza]) && Number.isFinite(s?.x_rel))
    .map((s) => ({ x_rel: s.x_rel, valore: s[grandezza] }));
  return { punti, massimo: punti.reduce((a, p) => Math.max(a, Math.abs(p.valore)), 0) };
}
```

- [ ] **Step 4: lanciare i test e vederli passare**

Run: `env -C /Users/mario/GitHub/NOVA-wt/interfaccia-13/static node --test test/risultati.test.js`
Expected: tutti pass. Se `testoEquilibrio` stampa «-0»: `conciso(-0/1e3)` — `stampaNumero` già normalizza il `-0` (`numeri.js:158`); se un test lo mostra, sommare con `+ 0` prima di stampare.

- [ ] **Step 5: Commit**

```bash
git -C /Users/mario/GitHub/NOVA-wt/interfaccia-13 add static/risultati.js static/test/risultati.test.js
git -C /Users/mario/GitHub/NOVA-wt/interfaccia-13 commit -m "feat(interfaccia): risultati.js — deformata di Hermite, scala 1-2-5, diagrammi per stazione, picchi, testi con unità"
```

---

### Task 3: `etichette.js` — le etichette che non si sovrappongono

**Files:**
- Create: `static/etichette.js`
- Test: `static/test/etichette.test.js`

**Interfaces:**
- Consumes: niente.
- Produces: `disponi(richieste, ostacoli, {passo})`, `siSovrappongono(a, b)`, `sottoSoglia(v, massimo, soglia)`. Il piano (Task 4) e la striscia (Task 5) le usano.

Le coordinate sono quelle dello **schermo SVG** (`y` verso il basso), in millimetri del `viewBox`; chi chiama converte i pixel con `s` (`millimetriPerPixel`). Una richiesta: `{ id, x, y, testo, priorita, larghezza, altezza }` con `x, y` il punto da etichettare (il picco), `larghezza`/`altezza` l'ingombro del testo già in mm. Un ostacolo: `{ x0, y0, x1, y1 }`.

Algoritmo, deterministico: si ordinano le richieste per `priorita` decrescente (a parità, per ordine d'arrivo); per ciascuna si provano i candidati in quest'ordine — sopra, destra, sotto, sinistra a distanza `passo`, poi gli stessi quattro a `2·passo` e a `3·passo` (questi con la **linea guida** dal punto al bordo più vicino del box); il primo candidato il cui box non si sovrappone né a un ostacolo né a un'etichetta già posata vince; se nessuno va, l'etichetta è **nascosta** (`nascosta: true`, senza `x`/`y`). Rende un elemento per richiesta, nello stesso ordine di ingresso.

**Riferimento:** `docs/ricerca/07-ux-modellatore.md:100`

## Ingressi degeneri
- lista di richieste vuota, o `null` → `[]`, non solleva
- richiesta con `x` o `y` non finiti → `nascosta: true`, senza `x`/`y`: un punto senza coordinate non si etichetta
- richiesta con ingombro nullo (`larghezza: 0, altezza: 0`) → si posa lo stesso, non si nasconde
- `ostacoli` assente o `null` → default `[]`, nessuna sovrapposizione da controllare
- `priorita` assente o non finita → vale 0 e l'ordine d'arrivo decide; l'uscita ha comunque **un elemento per richiesta**, nello stesso ordine d'ingresso
- nessun candidato libero (un ostacolo che copre tutto) → `nascosta: true`, mai un'etichetta sovrapposta: meglio un picco non scritto che due testi addosso
- `passo` assente → un default, mai `NaN` nelle coordinate d'uscita
- `massimo` nullo o non finito in `sottoSoglia` → tutto è sotto soglia: di un diagramma piatto non si scrive niente

- [ ] **Step 1: i test**

`static/test/etichette.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { disponi, siSovrappongono, sottoSoglia } from "../etichette.js";

const box = (x0, y0, x1, y1) => ({ x0, y0, x1, y1 });
const richiesta = (id, x, y, extra = {}) => ({ id, x, y, testo: String(id), priorita: 1, larghezza: 60, altezza: 12, ...extra });
const nessunaSovrapposizione = (poste) => {
  const visibili = poste.filter((p) => !p.nascosta);
  for (let i = 0; i < visibili.length; i++) for (let j = i + 1; j < visibili.length; j++) {
    assert.ok(!siSovrappongono(visibili[i].box, visibili[j].box), `${visibili[i].id} e ${visibili[j].id} si sovrappongono`);
  }
};

test("siSovrappongono: i bordi che si toccano non contano", () => {
  assert.ok(siSovrappongono(box(0, 0, 10, 10), box(5, 5, 15, 15)));
  assert.ok(!siSovrappongono(box(0, 0, 10, 10), box(10, 0, 20, 10)));
  assert.ok(!siSovrappongono(box(0, 0, 10, 10), box(0, 10, 10, 20)));
  assert.ok(!siSovrappongono(box(0, 0, 10, 10), box(11, 11, 12, 12)));
});

test("disponi: una sola etichetta va sopra il punto, centrata, senza guida", () => {
  const [p] = disponi([richiesta("a", 100, 100)], [], { passo: 6 });
  assert.equal(p.nascosta, false);
  assert.equal(p.guida, null);
  assert.equal(p.ancora, "middle");
  assert.equal(p.x, 100);
  assert.ok(p.box.y1 <= 100 - 6 + 1e-9, "il box sta sopra il punto, a un passo");
  assert.ok(p.box.x0 < 100 && p.box.x1 > 100);
});

test("disponi: due etichette sullo stesso punto non si sovrappongono; la meno prioritaria si sposta", () => {
  const poste = disponi([richiesta("a", 100, 100, { priorita: 1 }), richiesta("b", 100, 100, { priorita: 2 })], [], { passo: 6 });
  nessunaSovrapposizione(poste);
  const a = poste.find((p) => p.id === "a"), b = poste.find((p) => p.id === "b");
  assert.equal(b.ancora, "middle", "la più prioritaria prende il primo posto (sopra)");
  assert.notEqual(a.ancora + a.x + a.y, b.ancora + b.x + b.y);
  assert.deepEqual(poste.map((p) => p.id), ["a", "b"], "l'ordine di uscita è quello d'ingresso");
});

test("disponi: un ostacolo su tutti i primi posti spinge l'etichetta a due passi, con la guida", () => {
  // Un ostacolo largo copre sopra, destra, sotto e sinistra al primo passo.
  const ostacolo = box(100 - 80, 100 - 25, 100 + 80, 100 + 25);
  const [p] = disponi([richiesta("a", 100, 100)], [ostacolo], { passo: 6 });
  assert.equal(p.nascosta, false);
  assert.ok(p.guida, "una linea guida dal punto all'etichetta");
  assert.deepEqual([p.guida.x1, p.guida.y1], [100, 100]);
  assert.ok(!siSovrappongono(p.box, ostacolo));
});

test("disponi: nessun posto libero → nascosta, mai sovrapposta", () => {
  const tutto = box(-1e9, -1e9, 1e9, 1e9);
  const [p] = disponi([richiesta("a", 0, 0)], [tutto], { passo: 6 });
  assert.equal(p.nascosta, true);
  assert.equal(p.testo, "a");
});

test("disponi: dieci etichette fitte — le visibili non si sovrappongono e ogni richiesta ha una risposta", () => {
  const richieste = Array.from({ length: 10 }, (_, k) => richiesta(`e${k}`, 100 + k * 3, 100, { priorita: 10 - k }));
  const poste = disponi(richieste, [], { passo: 6 });
  assert.equal(poste.length, 10);
  nessunaSovrapposizione(poste);
  assert.ok(poste.filter((p) => !p.nascosta).length >= 4, "almeno i quattro versi del primo passo si riempiono");
});

test("disponi: ingressi degeneri — lista vuota, richiesta senza ingombro, coordinate non finite", () => {
  assert.deepEqual(disponi([], [], { passo: 6 }), []);
  assert.deepEqual(disponi(null), []);
  const [p] = disponi([richiesta("a", 5, 5, { larghezza: 0, altezza: 0 })], [], { passo: 6 });
  assert.equal(p.nascosta, false);
  const [q] = disponi([richiesta("b", NaN, 5)], [], { passo: 6 });
  assert.equal(q.nascosta, true, "un punto senza coordinate non si etichetta");
  const [r] = disponi([richiesta("c", 5, 5)]);   // senza opzioni: un passo di default, non NaN
  assert.equal(r.nascosta, false);
  assert.ok(Number.isFinite(r.x) && Number.isFinite(r.y));
});

test("sottoSoglia: il 2 % del massimo; con massimo nullo tutto è sotto soglia", () => {
  assert.ok(sottoSoglia(1, 100));
  assert.ok(!sottoSoglia(3, 100));
  assert.ok(sottoSoglia(-1, -100));
  assert.ok(sottoSoglia(0, 0));
  assert.ok(sottoSoglia(5, 0));
  assert.ok(sottoSoglia(NaN, 100));
});
```

- [ ] **Step 2: lanciare i test e vederli fallire**

Run: `env -C /Users/mario/GitHub/NOVA-wt/interfaccia-13/static node --test test/etichette.test.js`

- [ ] **Step 3: il modulo**

`static/etichette.js`:

```js
// Le etichette dei risultati posate senza sovrapporsi: priorità, quattro versi a tre distanze,
// linea guida oltre il primo passo, nascosta quando non c'è posto. Deterministico: stessi
// ingressi, stesso disegno (`piano.js`, «a parità di punteggio vince la prima»).
//
// Coordinate dello schermo SVG (`y` in basso), in mm del `viewBox`: chi chiama converte i pixel.

export const siSovrappongono = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

/** |v| sotto `soglia` del massimo in modulo. Con massimo nullo o non finito tutto è sotto soglia:
 *  di un diagramma piatto non si scrive niente. */
export const sottoSoglia = (v, massimo, soglia = 0.02) =>
  !Number.isFinite(v) || !Number.isFinite(massimo) || Math.abs(v) < soglia * Math.abs(massimo);

// I quattro versi, nell'ordine fisso in cui si provano: sopra, destra, sotto, sinistra.
const VERSI = [
  { dx: 0, dy: -1, ancora: "middle" },
  { dx: 1, dy: 0, ancora: "start" },
  { dx: 0, dy: 1, ancora: "middle" },
  { dx: -1, dy: 0, ancora: "end" },
];

/** Il box di un testo ancorato in (x, y): `y` è il **centro verticale** del box, e chi disegna
 *  scrive il `<text>` con `dominant-baseline: middle`. Un solo modo di stare, così il box che
 *  si controlla e il testo che si vede combaciano. */
function boxDi(x, y, ancora, larghezza, altezza) {
  const x0 = ancora === "middle" ? x - larghezza / 2 : ancora === "end" ? x - larghezza : x;
  return { x0, y0: y - altezza / 2, x1: x0 + larghezza, y1: y + altezza / 2 };
}

export function disponi(richieste, ostacoli = [], { passo = 6 } = {}) {
  const lista = Array.isArray(richieste) ? richieste : [];
  const ordine = lista.map((r, k) => ({ r, k })).sort((a, b) => (b.r.priorita ?? 0) - (a.r.priorita ?? 0) || a.k - b.k);
  const posate = [];
  const fuori = new Array(lista.length);
  for (const { r, k } of ordine) {
    const larghezza = Math.max(0, r.larghezza ?? 0), altezza = Math.max(0, r.altezza ?? 0);
    let scelta = null;
    if (Number.isFinite(r.x) && Number.isFinite(r.y)) {
      cerca: for (const multiplo of [1, 2, 3]) {
        for (const v of VERSI) {
          const d = passo * multiplo;
          // Il punto d'ancoraggio: a un passo dal bordo del testo, non dal suo centro.
          const x = r.x + v.dx * d, y = r.y + v.dy * (d + (v.dy ? altezza / 2 : 0));
          const box = boxDi(x, y, v.ancora, larghezza, altezza);
          if ([...ostacoli, ...posate.map((p) => p.box)].some((o) => siSovrappongono(box, o))) continue;
          const guida = multiplo === 1 ? null : { x1: r.x, y1: r.y, x2: v.dx ? x : r.x, y2: v.dy ? (v.dy < 0 ? box.y1 : box.y0) : r.y };
          scelta = { x, y, ancora: v.ancora, box, guida };
          break cerca;
        }
      }
    }
    const posta = scelta
      ? { id: r.id, testo: r.testo, nascosta: false, ...scelta }
      : { id: r.id, testo: r.testo, nascosta: true, x: null, y: null, ancora: null, box: null, guida: null };
    if (scelta) posate.push(posta);
    fuori[k] = posta;
  }
  return fuori;
}
```

- [ ] **Step 4: lanciare i test e vederli passare**

Run: `env -C /Users/mario/GitHub/NOVA-wt/interfaccia-13/static node --test test/etichette.test.js`
Expected: tutti pass. Il test «un solo posto» chiede `p.box.y1 <= 100 − 6`: con «sopra» a un passo il centro del testo sta a `y − (passo + altezza/2)`, quindi `y1 = y − passo`. Il contratto è **`y` = centro verticale del box, `dominant-baseline: middle` nel `<text>`**.

- [ ] **Step 5: Commit**

```bash
git -C /Users/mario/GitHub/NOVA-wt/interfaccia-13 add static/etichette.js static/test/etichette.test.js
git -C /Users/mario/GitHub/NOVA-wt/interfaccia-13 commit -m "feat(interfaccia): etichette.js — disposizione senza sovrapposizioni con priorità, guida e soglia"
```

---

### Task 4: lo strato dei risultati nel piano e la deformata nello spazio

**Files:**
- Modify: `static/piano.js` (`disegna` con `risultati`; strato `<g class="risultati">`; badge `<p class="risultati-badge">`; ostacoli delle etichette dei nodi)
- Modify: `static/spazio.js:138-177` (`disegna(m, {selezione, deformata})`)
- Modify: `static/stile.css` (`.risultati-badge`, `.risultati-badge.stantia`)
- Test: `static/test/piano.test.js` (nuovi test in coda)

**Interfaces:**
- Consumes: `puntiDeformata`, `diagramma`, `scalaDiagrammaAuto`, `picchi`, `testoValore`, `testoBadge`, `spostamentoMassimo` (Task 2); `disponi`, `sottoSoglia` (Task 3). **Non** `GRANDEZZA` (non esiste più) e **non** `assiDi`: la chiave per asta esce già da `diagramma` come `d.chiave`.
- Produces: `piano.disegna(m, { …, risultati })` con `risultati = null | { vista, caso, perCaso, scala, auto, stantia }`; `spazio.disegna(m, { selezione, deformata })` con `deformata = null | { aste: [{id, punti:[{x,y,z}]}], stantia }`.

Regole di disegno (tutte in px apparenti × `s`, come il resto del piano):
- Lo strato sta **dopo le aste e prima dei nodi** (`static/piano.js:142` → inserire lì), così i nodi restano sopra.
- **Deformata**: una `<polyline class="deformata">` per asta, `stroke` inchiostro (rosso se stantia), `stroke-width: 2·s`, `stroke-dasharray: "6s 4s"`, `fill: none`, `stroke-linejoin: round`. Le aste del modello, con la vista deformata, diventano l'**ombra**: `stroke-opacity: 0.3` (l'asta selezionata resta piena e rossa).
- **M, V, N**: per asta un `<polygon class="diagramma">` chiuso `[pi, …punti, pj]` con `fill` inchiostro (rosso se stantia) `fill-opacity: 0.08`, `stroke` uguale, `stroke-width: 1.5·s`, `stroke-dasharray: "5s 3s"`; e per **ogni stazione** una `<line class="stazione">` dalla base al punto (`stroke-width: 0.75·s`, piena): le stazioni si vedono (story 38). La scala del diagramma è `scalaDiagrammaAuto(m, perCaso, vista)`, comune a tutte le aste.
- **Etichette dei picchi** (`picchi(stazioni, d.chiave)` per asta — la chiave la dà `diagramma`, ed è `Mz`/`Vy` sui pilastri — saltando quelle `sottoSoglia(valore, massimoGlobale)`): richieste con `x, y` = il punto del diagramma (schermo), `testo = testoValore(vista, valore)`, `priorita = |valore| / massimoGlobale`, `larghezza = testo.length · 6.6 · s`, `altezza = 12 · s`; ostacoli = i box delle etichette dei nodi (`x` dell'etichetta, `text-anchor`, `larghezza = testo.length · 6.6 · s`, `altezza = 11 · s`) e i cerchi dei nodi (`RAGGIO · s` attorno a `p`). Le posate si scrivono come `<text class="picco">` con `dominant-baseline: middle`, `font-size: 11·s`, `text-anchor` = `ancora`, `font-family: MONO`; la guida come `<line class="guida">` `stroke-width: 0.75·s`. Le nascoste non si scrivono (il valore resta nell'ispettore e nella striscia).
- **Con la deformata** l'etichetta del massimo spostamento: una sola, sul nodo con `hypot(ux, uz)` massimo, testo `testoValore("deformata", d)`, posata con lo stesso `disponi` (una richiesta) e gli stessi ostacoli.
- **Badge**: `<p class="risultati-badge">` creato una volta in `creaPiano` accanto al titolo dei carichi (`contenitore.replaceChildren(svg, titolo, badge)`), testo `testoBadge({...risultati})`, `hidden` senza risultati, classe `stantia` quando stantia.

**Riferimento:** `docs/ricerca/07-ux-modellatore.md:99` (scala dichiarata e ombra), `:105` (data-ink)

## Ingressi degeneri
- `risultati: null`, o `risultati.vista: null`, o l'opzione assente del tutto → nessuno strato `<g class="risultati">`, badge `hidden`, aste piene (nessuna `stroke-opacity`)
- modello con risultati e **senza aste** → strato vuoto, e il badge si scrive lo stesso: la scala dichiarata non dipende da cosa c'è da disegnare
- `perCaso` senza `sollecitazioni` (o con un'asta che non è nel modello) → nessun poligono, nessuna ordinata, nessun'etichetta orfana, non solleva
- `perCaso` senza `spostamenti` in vista deformata → la polilinea si disegna lo stesso e coincide con l'ombra; nessun testo, perché non c'è niente da scrivere
- `contenitore.clientWidth` o `clientHeight` a 0 (riquadro non ancora impaginato) → `|| 1` come `piano.js:119`, `s` finito, nessun `NaN` nel `points` né negli ostacoli del badge
- un picco sotto il 2 % del massimo globale → non si scrive: il valore resta nell'ispettore e nella striscia
- un'etichetta che non trova posto fra i cerchi, le etichette dei nodi e il badge → si nasconde, non si sovrappone
- `spazio.disegna` con una `deformata` quando WebGL manca → il modulo assente rende `disegna() {}` (`spazio.js:184-191`): nessuna chiamata a `THREE`, nessun errore in console

- [ ] **Step 1: i test nel DOM finto** (in coda a `static/test/piano.test.js`; il `pianoFinto()` esistente rende `contenitore._figli[0]` = svg e `[1]` = titolo; il badge sarà `[2]`)

```js
// --- lo strato dei risultati (giornata 13) ---------------------------------------
const traveR = (() => { let mo = modelloVuoto(); mo = creaNodo(mo, { x: 0, z: 0 }); mo = creaNodo(mo, { x: 6000, z: 0 });
  return { ...mo, aste: [{ id: 1, nodo_i: 1, nodo_j: 2 }] }; })();
const XI = [0, 0.1726731646, 0.5, 0.8273268354, 1];
const xRel = [...XI.map((x) => x / 2), ...XI.slice(1).map((x) => 0.5 + x / 2)];
const stazioniR = xRel.map((r) => ({ x_rel: r, N: 0, Vy: 0, Vz: 10 * (3000 - r * 6000), T: 0, My: 10 * r * 6000 * (6000 - r * 6000) / 2, Mz: 0 }));
const Z1R = { spostamenti: { 1: [0, 0, 0, 0, 0.004, 0], 2: [0, 0, 0, 0, -0.004, 0] }, reazioni: { 1: [0, 0, 30000, 0, 0, 0], 2: [0, 0, 30000, 0, 0, 0] }, sollecitazioni: { 1: stazioniR } };
const conRisultati = (vista, extra = {}) => ({ vista, caso: "Z1", perCaso: Z1R, scala: 100, auto: true, stantia: false, ...extra });
const strato = (svg) => tutti(svg, "g").find((g) => g.getAttribute("class") === "risultati");
const badgeDi = (contenitore) => contenitore._figli[2];

test("piano con vista M: un poligono tratteggiato, nove ordinate di stazione, l'etichetta «45 kN·m» al picco", () => {
  const contenitore = contenitoreFinto();
  const piano = creaPiano(contenitore, { suSelezione: () => {}, suSfondo: () => {} });
  piano.disegna(traveR, { risultati: conRisultati("M") });
  const svg = contenitore._figli[0];
  const g = strato(svg);
  assert.ok(g, "lo strato «risultati» c'è");
  const poligoni = tutti(g, "polygon");
  assert.equal(poligoni.length, 1);
  assert.ok(poligoni[0].getAttribute("stroke-dasharray"), "inchiostro tratteggiato (story 63)");
  assert.equal(poligoni[0].getAttribute("stroke"), "#141414");
  assert.equal(tutti(g, "line").filter((l) => l.getAttribute("class") === "stazione").length, 9);
  const testi = tutti(g, "text").map((t) => t.textContent);
  assert.ok(testi.includes("45 kN·m"), `il picco è scritto: ${testi}`);
  const badge = badgeDi(contenitore);
  assert.equal(badge.hidden, false);
  assert.equal(badge.textContent, "M · Z1 · kN·m · lato teso");
});

test("piano con vista M: il picco sta sotto la trave (lato teso), l'etichetta non tocca le etichette dei nodi", () => {
  const contenitore = contenitoreFinto();
  const piano = creaPiano(contenitore, { suSelezione: () => {}, suSfondo: () => {} });
  piano.disegna(traveR, { risultati: conRisultati("M") });
  const svg = contenitore._figli[0];
  const [poligono] = tutti(strato(svg), "polygon");
  const punti = poligono.getAttribute("points").split(" ").map((p) => p.split(",").map(Number));
  const yBase = punti[0][1];
  assert.ok(punti.some(([, y]) => y > yBase + 1), "in SVG y cresce in basso: il diagramma sta sotto");
  // Nessun `<text>` dello strato dei risultati ha lo stesso x e y di un'etichetta di nodo.
  const nodi = tutti(svg, "g").filter((g) => g.getAttribute("data-tipo") === "nodo").flatMap((g) => tutti(g, "text"));
  for (const t of tutti(strato(svg), "text")) for (const n of nodi) {
    assert.ok(t.getAttribute("x") !== n.getAttribute("x") || t.getAttribute("y") !== n.getAttribute("y"));
  }
});

test("piano con vista deformata: una polilinea tratteggiata per asta, le aste diventano ombra, il badge stampa la scala", () => {
  const contenitore = contenitoreFinto();
  const piano = creaPiano(contenitore, { suSelezione: () => {}, suSfondo: () => {} });
  piano.disegna(traveR, { risultati: conRisultati("deformata", { scala: 120, auto: true }) });
  const svg = contenitore._figli[0];
  const polilinee = tutti(strato(svg), "polyline");
  assert.equal(polilinee.length, 1);
  assert.ok(polilinee[0].getAttribute("stroke-dasharray"));
  const punti = polilinee[0].getAttribute("points").split(" ");
  assert.equal(punti.length, 9, "otto segmenti di Hermite");
  const aste = tutti(svg, "line").filter((l) => l.getAttribute("data-tipo") === "asta");
  assert.equal(aste[0].getAttribute("stroke-opacity"), "0.3", "l'indeformata è l'ombra");
  assert.equal(badgeDi(contenitore).textContent, "deformata · Z1 · ×120 (auto)");
  piano.disegna(traveR, { risultati: conRisultati("deformata", { scala: 50, auto: false }) });
  assert.equal(badgeDi(contenitore).textContent, "deformata · Z1 · ×50 (a mano)");
});

test("piano stantio: strato e badge in rosso, la parola «stantia» nel badge", () => {
  const contenitore = contenitoreFinto();
  const piano = creaPiano(contenitore, { suSelezione: () => {}, suSfondo: () => {} });
  piano.disegna(traveR, { risultati: conRisultati("V", { stantia: true }) });
  const svg = contenitore._figli[0];
  const [poligono] = tutti(strato(svg), "polygon");
  assert.equal(poligono.getAttribute("stroke"), "#b8321e");
  const badge = badgeDi(contenitore);
  assert.ok(badge.textContent.startsWith("stantia · V · Z1"));
  assert.equal(badge.className, "risultati-badge stantia");
});

test("piano senza risultati o con vista nulla: nessuno strato, badge nascosto, aste piene", () => {
  const contenitore = contenitoreFinto();
  const piano = creaPiano(contenitore, { suSelezione: () => {}, suSfondo: () => {} });
  piano.disegna(traveR, { risultati: null });
  assert.equal(strato(contenitore._figli[0]), undefined);
  assert.equal(badgeDi(contenitore).hidden, true);
  piano.disegna(traveR, { risultati: conRisultati(null) });
  assert.equal(strato(contenitore._figli[0]), undefined);
  piano.disegna(traveR, {});
  const aste = tutti(contenitore._figli[0], "line").filter((l) => l.getAttribute("data-tipo") === "asta");
  assert.equal(aste[0].getAttribute("stroke-opacity"), undefined);
});

test("piano con vista M: lo strato sta fra le aste e i nodi, non sopra i nodi", () => {
  // Il DOM finto tiene i figli in ordine, quindi l'ordine di disegno **è** verificabile: senza
  // questo test spostare `gruppo.append(g)` dopo il ciclo dei nodi resta verde, e in pagina il
  // diagramma copre i cerchi cliccabili. (Il mutante che il piano dava per non uccidibile, R5.)
  const contenitore = contenitoreFinto();
  const piano = creaPiano(contenitore, { suSelezione: () => {}, suSfondo: () => {} });
  piano.disegna(traveR, { risultati: conRisultati("M") });
  const figli = contenitore._figli[0]._figli[0]._figli;   // svg → gruppo → i figli, in ordine
  const tipi = figli.map((f) => f.getAttribute?.("data-tipo"));
  const iStrato = figli.findIndex((f) => f.getAttribute?.("class") === "risultati");
  assert.ok(iStrato > tipi.lastIndexOf("asta"), `strato ${iStrato} dopo l'ultima asta ${tipi.lastIndexOf("asta")}`);
  assert.ok(iStrato < tipi.indexOf("nodo"), `strato ${iStrato} prima del primo nodo ${tipi.indexOf("nodo")}`);
});

test("piano con vista M su un pilastro: si legge Mz, e il diagramma non è una riga piatta", () => {
  // La prova che una mappa costante non basta (R1): con `My` a 1e-9 il pilastro uscirebbe
  // schiacciato sul proprio asse e il picco non si scriverebbe mai.
  const pil = (() => { let mo = modelloVuoto(); mo = creaNodo(mo, { x: 0, z: 0 }); mo = creaNodo(mo, { x: 0, z: 3000 });
    return { ...mo, aste: [{ id: 1, nodo_i: 1, nodo_j: 2 }] }; })();
  const perCaso = { spostamenti: {}, reazioni: {}, sollecitazioni: { 1: [
    { x_rel: 0, N: -1000, Vy: 2000, Vz: 1e-10, T: 0, My: 1e-9, Mz: 6e6 },
    { x_rel: 0.5, N: -1000, Vy: 2000, Vz: 1e-10, T: 0, My: 1e-9, Mz: 3e6 },
    { x_rel: 1, N: -1000, Vy: 2000, Vz: 1e-10, T: 0, My: 1e-9, Mz: 0 }] } };
  const contenitore = contenitoreFinto();
  const piano = creaPiano(contenitore, { suSelezione: () => {}, suSfondo: () => {} });
  piano.disegna(pil, { risultati: conRisultati("M", { perCaso }) });
  const g = strato(contenitore._figli[0]);
  const xs = tutti(g, "polygon")[0].getAttribute("points").split(" ").map((p) => Number(p.split(",")[0]));
  assert.ok(Math.max(...xs) - Math.min(...xs) > 1, `il diagramma ha larghezza: ${xs}`);
  assert.ok(tutti(g, "text").map((t) => t.textContent).includes("6 kN·m"));
});

test("piano con risultati di un caso senza stazioni né spostamenti: strato vuoto, non solleva", () => {
  const contenitore = contenitoreFinto();
  const piano = creaPiano(contenitore, { suSelezione: () => {}, suSfondo: () => {} });
  piano.disegna(traveR, { risultati: conRisultati("M", { perCaso: { spostamenti: {}, reazioni: {}, sollecitazioni: {} } }) });
  assert.equal(tutti(strato(contenitore._figli[0]), "polygon").length, 0);
  piano.disegna(traveR, { risultati: conRisultati("deformata", { perCaso: { spostamenti: {} }, scala: 1 }) });
  assert.equal(tutti(strato(contenitore._figli[0]), "polyline").length, 1, "la deformata senza spostamenti è l'ombra, e si disegna");
  assert.equal(tutti(strato(contenitore._figli[0]), "text").length, 0, "niente da scrivere su spostamenti nulli");
});
```

Nota per l'implementer: il finto `createElement` (`piano.test.js:132`) dà `className: ""` e `hidden: false` — il badge si crea con `document.createElement("p")`, e i test leggono `className`/`hidden`/`textContent`. Il `<polygon>` scrive `points` come `"x,y x,y …"` con `Number` puliti (`String(x)`), senza arrotondare: i test lo rileggono.

- [ ] **Step 2: lanciare, vederli fallire** (`strato` undefined, `badgeDi` undefined).

- [ ] **Step 3: `piano.js`** — le modifiche, nell'ordine:

1. Import: `import { puntiDeformata, diagramma, scalaDiagrammaAuto, picchi, testoValore, testoBadge, spostamentoMassimo } from "./risultati.js"; import { disponi, sottoSoglia } from "./etichette.js";`
2. In `creaPiano`, accanto a `titolo`: 
```js
  const badge = document.createElement("p");
  badge.className = "risultati-badge";
  badge.hidden = true;
  contenitore.replaceChildren(svg, titolo, badge);
```
3. La firma: `function disegna(m, { selezione = null, ghost = null, azioneInVista = null, proposte = [], risultati = null } = {})`, e in testa `const vistaRis = risultati?.vista ?? null; const attivo = vistaRis ? risultati : null; let stratoRisultati = null;`. **`vistaRis` e non `vista`**: `creaPiano` ha già un `let vista` che è il **riquadro** (`:97`, quello che `inquadra` scrive e `schermo` legge), e un secondo `vista` dentro `disegna` lo ombreggerebbe — il punto 6 ha bisogno del riquadro proprio lì.
4. Le aste (`:136-141`): aggiungere `...(attivo && vistaRis === "deformata" && !scelta ? { "stroke-opacity": 0.3 } : {})`.
5. Subito dopo il ciclo delle aste, lo strato:
```js
    // Lo strato dei risultati fra le aste e i nodi: i nodi restano sopra e cliccabili. Un solo
    // colore, inchiostro; rosso quando la corsa è stantia — il rosso dice attenzione (story 63).
    const richiesteEtichette = [];   // i picchi (o il massimo spostamento): li posa `disponi` dopo i nodi
    if (attivo) {
      const colore = attivo.stantia ? ROSSO : INCHIOSTRO;
      // `stratoRisultati`, non un `g` locale: lo step 7 gli appende le etichette dopo i nodi,
      // e un `const g` qui dentro morirebbe con l'`if` (e collide col `g` della gravità a `:267`).
      stratoRisultati = el("g", { class: "risultati", "data-vista": vistaRis });
      const g = stratoRisultati;
      const coppia = (p) => `${p.x},${p.y}`;
      if (vistaRis === "deformata") {
        for (const d of puntiDeformata(m, attivo.perCaso, attivo.scala)) {
          g.append(el("polyline", { class: "deformata", points: d.punti.map((p) => coppia(schermo(p))).join(" "),
                                    fill: "none", stroke: colore, "stroke-width": 2 * s,
                                    "stroke-dasharray": `${6 * s} ${4 * s}`, "stroke-linejoin": "round" }));
        }
        const dmax = spostamentoMassimo(m, attivo.perCaso);
        if (dmax > 0) {
          const n = m.nodi.find((k) => { const u = attivo.perCaso.spostamenti?.[String(k.id)]; return u && Math.hypot(u[0], u[2]) === dmax; });
          if (n) {
            const u = attivo.perCaso.spostamenti[String(n.id)];
            const p = schermo({ x: n.x + attivo.scala * u[0], z: n.z + attivo.scala * u[2] });
            richiesteEtichette.push({ id: `u${n.id}`, x: p.x, y: p.y, testo: testoValore("deformata", dmax), priorita: 1 });
          }
        }
      } else {
        const scalaD = scalaDiagrammaAuto(m, attivo.perCaso, vistaRis);
        let massimo = 0;
        const diagrammi = diagramma(m, attivo.perCaso, vistaRis, scalaD);
        for (const d of diagrammi) for (const p of d.punti) massimo = Math.max(massimo, Math.abs(p.valore));
        for (const d of diagrammi) {
          const pi = schermo(d.base[0]), pj = schermo(d.base[1]);
          const punti = d.punti.map((p) => schermo(p));
          g.append(el("polygon", { class: "diagramma", points: [pi, ...punti, pj].map(coppia).join(" "),
                                   fill: colore, "fill-opacity": 0.08, stroke: colore, "stroke-width": 1.5 * s,
                                   "stroke-dasharray": `${5 * s} ${3 * s}` }));
          // Le ordinate per stazione: si vede dove il solutore ha misurato (story 38).
          for (const p of d.punti) {
            const b = schermo({ x: d.base[0].x + (d.base[1].x - d.base[0].x) * p.x_rel, z: d.base[0].z + (d.base[1].z - d.base[0].z) * p.x_rel });
            const q = schermo(p);
            g.append(el("line", { class: "stazione", x1: b.x, y1: b.y, x2: q.x, y2: q.y, stroke: colore, "stroke-width": 0.75 * s }));
          }
          // `d.chiave`, non una costante: sui pilastri è `Mz`/`Vy` (R1).
          for (const picco of picchi(attivo.perCaso.sollecitazioni?.[String(d.id)], d.chiave)) {
            if (sottoSoglia(picco.valore, massimo)) continue;
            const p = d.punti.find((q) => q.x_rel === picco.x_rel);
            if (!p) continue;
            const q = schermo(p);
            richiesteEtichette.push({ id: `${d.id}@${picco.x_rel}`, x: q.x, y: q.y, testo: testoValore(vistaRis, picco.valore),
                                      priorita: Math.abs(picco.valore) / massimo });
          }
        }
      }
      gruppo.append(g);
    }
```
6. Nel ciclo dei nodi (`:185-210`) raccogliere gli ostacoli: prima del ciclo `const ostacoli = [];`; dopo aver creato il cerchio `ostacoli.push({ x0: p.x - RAGGIO * s, y0: p.y - RAGGIO * s, x1: p.x + RAGGIO * s, y1: p.y + RAGGIO * s });`; dopo `testo.textContent = …` il box dell'etichetta: 
```js
        const larghezza = testo.textContent.length * 6.6 * s, altezza = 11 * s;
        const x = p.x + OFFSET_ETICHETTA * s * v.x, y = p.y - OFFSET_ETICHETTA * s * v.z;
        const x0 = v.x < -0.3 ? x - larghezza : v.x > 0.3 ? x : x - larghezza / 2;
        ostacoli.push({ x0, y0: y - altezza, x1: x0 + larghezza, y1: y });
```
   E, subito dopo il ciclo, il **badge**: sta fuori dal `viewBox` ma sopra il piano, quindi senza
   questo un picco in alto a destra gli finisce sotto (R6). `preserveAspectRatio="xMidYMid meet"`
   centra il riquadro, perciò il bordo del viewport in coordinate del `viewBox` è il centro più
   mezza misura in pixel per `s`:
```js
    if (attivo) {
      const cx = vista.x0 + vista.larghezza / 2, cy = vista.z0 + vista.altezza / 2;   // `vista` = il riquadro, `:97`
      const destra = cx + (contenitore.clientWidth || 1) * s / 2;
      const alto = cy - (contenitore.clientHeight || 1) * s / 2;
      ostacoli.push({ x0: destra - (testoBadge(attivo).length * 6.6 + 8) * s, y0: alto,
                      x1: destra, y1: alto + 20 * s });   // 6px di `top` + 14 di riga
    }
```
7. Dopo i vincoli e prima delle frecce, le etichette dei risultati (`stratoRisultati` è la variabile dichiarata al punto 3, `let stratoRisultati = null;`, assegnata al punto 5):
```js
    if (stratoRisultati && richiesteEtichette.length) {
      const colore = attivo.stantia ? ROSSO : INCHIOSTRO;
      const richieste = richiesteEtichette.map((r) => ({ ...r, larghezza: r.testo.length * 6.6 * s, altezza: 12 * s }));
      for (const e of disponi(richieste, ostacoli, { passo: 6 * s })) {
        if (e.nascosta) continue;   // meglio un picco non scritto che due testi addosso: il valore resta nell'ispettore e nella striscia
        if (e.guida) stratoRisultati.append(el("line", { class: "guida", x1: e.guida.x1, y1: e.guida.y1, x2: e.guida.x2, y2: e.guida.y2, stroke: colore, "stroke-width": 0.75 * s }));
        const t = el("text", { class: "picco", x: e.x, y: e.y, "font-size": 11 * s, fill: colore, "font-family": MONO,
                               "text-anchor": e.ancora, "dominant-baseline": "middle" });
        t.textContent = e.testo;
        stratoRisultati.append(t);
      }
    }
```
8. Il badge, accanto al titolo (`:268-271`):
```js
    badge.textContent = attivo ? testoBadge(attivo) : "";
    badge.hidden = !attivo;
    badge.className = attivo?.stantia ? "risultati-badge stantia" : "risultati-badge";
```

- [ ] **Step 4: `stile.css`** dopo `.carichi-titolo` (`:57-58`):
```css
/* Il badge dei risultati: la scala della deformata sempre stampata (story 36), la legenda di
   V e N una volta sola. In px costanti come il titolo dei carichi, in alto a destra. Stantia =
   rosso e la parola: il rosso da solo non basta (story 63). */
#piano .risultati-badge { position: absolute; top: 6px; right: 8px; margin: 0; text-align: right;
                          font: 11px var(--mono); color: var(--inchiostro); pointer-events: none; }
#piano .risultati-badge.stantia { color: var(--rosso); }
```

- [ ] **Step 5: `spazio.js`** — la deformata con l'ombra:
```js
  const inchiostroTenue = new THREE.LineBasicMaterial({ color: INCHIOSTRO, transparent: true, opacity: 0.3 });
  …
  function disegna(m, { selezione = null, deformata = null } = {}) {
    …
    for (const a of m.aste) {
      …
      const ombra = deformata && !scelto("asta", a.id);
      disegnato.add(new THREE.Line(g, scelto("asta", a.id) ? rosso : (ombra ? inchiostroTenue : inchiostro)));
    }
    // La deformata (giornata 13): la stessa `puntiDeformata` del piano, stessa scala; rossa se stantia.
    for (const d of deformata?.aste ?? []) {
      const g = new THREE.BufferGeometry().setFromPoints(d.punti.map((p) => new THREE.Vector3(p.x, p.y, p.z)));
      disegnato.add(new THREE.Line(g, deformata.stantia ? rosso : inchiostro));
    }
```
(la `docstring` in testa al modulo dice che i test coprono solo le funzioni pure: resta vero; `puntiDeformata` è provata in `risultati.test.js`).

- [ ] **Step 6: lanciare tutti i test JS**

Run: `env -C /Users/mario/GitHub/NOVA-wt/interfaccia-13/static node --test test/*.test.js`
Expected: tutti pass (649 + quelli dei Task 2-3 + 8 nuovi in `piano.test.js`).

- [ ] **Step 7: Commit**

```bash
git -C /Users/mario/GitHub/NOVA-wt/interfaccia-13 add static/piano.js static/spazio.js static/stile.css static/test/piano.test.js
git -C /Users/mario/GitHub/NOVA-wt/interfaccia-13 commit -m "feat(interfaccia): lo strato dei risultati nel piano — deformata con ombra e scala, M/V/N per stazione, picchi senza sovrapposizioni; deformata nello spazio"
```

---

### Task 5: il blocco «Risultati», la striscia dell'M srotolato, i tasti 0-4, l'ispettore

**Files:**
- Create: `static/esito.js` (`creaEsito`, `creaSrotolato`)
- Modify: `static/tastiera.js` (voce `vista`; `SENZA_MODIFICATORE` con le cifre; `vociDellaBarra` con `opzioni.risultati`)
- Modify: `static/pannello.js:39-53` (`righeDiNodo` con `risultati`), `:800` (`disegna` con `risultati`)
- Modify: `static/index.html` (riga «Unità»; blocco «Risultati» fra Corsa e Storia; `#srotolato` sotto `#piano`)
- Modify: `static/stile.css` (`#viste` a due righe; `#srotolato`; `#risultati-vista`)
- Modify: `static/app.js` (stato `risultati`, `risultatiInVista`, `suEsito`, `dispatchVoce("vista")`, azzeramenti, `ridisegna`, `disegnaBarra`)
- Test: `static/test/esito.test.js`, `static/test/tastiera.test.js`, `static/test/pannello.test.js`

**Interfaces:**
- Consumes: Task 2 — `esito.js` importa `casiDi`, `testoEquilibrio`, `srotolato`, `testoValore`, `picchi`, `assiDi`; `pannello.js` importa `righeSpostamenti`, `righeReazioni`; `app.js` importa `casiDi`, `scalaAuto`, `puntiDeformata`. (Elenco riscritto su ciò che il codice **importa**, non su ciò che sembra servire: `VISTE` non lo importa nessuno di questi tre.) Task 4 (`piano.disegna` con `risultati`, `spazio.disegna` con `deformata`), `stantia` (`static/corsa.js:93`).
- Produces: la voce `vista` di `TASTI` (`codice: "vista"`, `tasto: "0-4"`, `etichetta: "vista"`, `aiuto: "0 niente · 1 deformata · 2 M · 3 V · 4 N"`, `contesto: "risultati"`); `voceDaEvento` rende quella voce per `key` ∈ `0…4` senza modificatori; `vociDellaBarra(contesto, tipo, { risultati })` la include solo con `risultati: true` e contesto `sempre`/`selezione`; `dispatchVoce(voce, valore)` legge `valore` («0»…«4»).

**Riferimento:** `docs/ricerca/07-ux-modellatore.md:101` (il controllo che contraddice, Σ reazioni = Σ carichi), `:99` (i componenti di un nodo a portata di gesto)

## Ingressi degeneri
- corsa finita **senza** risultati (rifiutata, in errore, del solido) → `casiDi` rende `[]`, lo stato resta `null`, il blocco torna allo stato vuoto e la vista si spegne: i diagrammi di prima parlerebbero di una corsa che non è più l'ultima
- `verifica` (esito `null`) → non tocca né lo stato né la vista, ridisegna e basta
- «apri» o «importa» → `risultati = null` accanto a `corsa.azzera()`: un modello nuovo non porta la vista di un altro
- il caso scelto non è più fra quelli della corsa nuova → torna al primo, mai `undefined` nel `<select>`
- scala a mano illeggibile, «0» o negativa → auto, e il campo lo dice col segnaposto; il campo a fuoco non si riscrive sotto le dita di chi sta battendo
- cifra da `5` a `9`, o una cifra col tasto comando → `voceDaEvento` non rende nessuna voce: niente accade e niente si dice
- cifra `0`-`4` senza nessuna corsa da mostrare → `dì("nessuna corsa da mostrare: ⌘⏎ la lancia")`, e la vista non cambia
- cifra `0`-`4` con il campo di comando aperto e il fuoco **fuori** dal campo → il fuoco torna nel campo e la coda di `eseguiVoce` **non** scrive la cifra nel campo (`voce.campo` è falso per `vista`): mai un nodo creato per sbaglio (R4)
- nodo selezionato che non compare nei risultati del caso → `righeSpostamenti` e `righeReazioni` rendono `[]`, e l'ispettore mostra le sue righe di sempre
- nodo non vincolato → nessuna riga di reazione, e le righe di spostamento restano
- asta selezionata sparita, o senza stazioni per quel caso → la striscia dice cosa manca invece di sollevare; senza asta selezionata dice il gesto; senza risultati non c'è
- `#srotolato` con `clientWidth` a 0 → la striscia si disegna a 200 px, non a 0

- [ ] **Step 1: `index.html`**

Unità (`:57-58`) diventa:
```html
  <h2 class="staccato">Unità</h2>
  <p class="numero">modello: mm · N · MPa · t · s</p>
  <p class="numero">risultati: kN · kN·m · mm · mrad</p>
```
Dopo `</section>` di `#corsa` (`:83`) e prima di «Storia»:
```html
  <!-- I risultati dell'ultima corsa (story 36-40): il caso, la vista (una alla volta, tasti 0-4), la
       scala della deformata a mano, e la riga Σ reazioni contro Σ carichi — il controllo che
       contraddice, accanto al numero (`docs/ricerca/07-ux-modellatore.md:101`). -->
  <h2 class="staccato">Risultati</h2>
  <section id="risultati" aria-label="risultati">
    <p class="vuoto" id="risultati-vuoto">Nessuna corsa da mostrare. Dopo <kbd aria-label="comando invio">⌘⏎</kbd> premi <kbd>1</kbd> per la deformata, <kbd>2</kbd> <kbd>3</kbd> <kbd>4</kbd> per M, V, N, <kbd>0</kbd> per nessuna.</p>
    <div id="risultati-controlli" hidden>
      <label for="risultati-caso">caso</label>
      <select id="risultati-caso"></select>
      <fieldset id="risultati-vista" class="vincolo-gradi">
        <legend>vista</legend>
        <label><input type="radio" name="vista" value=""> niente <kbd>0</kbd></label>
        <label><input type="radio" name="vista" value="deformata"> deformata <kbd>1</kbd></label>
        <label><input type="radio" name="vista" value="M"> M <kbd>2</kbd></label>
        <label><input type="radio" name="vista" value="V"> V <kbd>3</kbd></label>
        <label><input type="radio" name="vista" value="N"> N <kbd>4</kbd></label>
      </fieldset>
      <label for="risultati-scala">scala della deformata (vuoto = auto)</label>
      <input id="risultati-scala" type="text" inputmode="decimal" spellcheck="false" placeholder="auto">
      <p id="risultati-equilibrio" class="numero"></p>
    </div>
  </section>
```
Sotto `#piano` in `#viste` (`:40`):
```html
  <section id="piano" aria-label="piano di lavoro"></section>
  <!-- L'M srotolato dell'asta selezionata (story 39): sotto il piano, nella sua colonna. Senza
       risultati non c'è; senza un'asta selezionata dice il gesto. -->
  <section id="srotolato" aria-label="M srotolato dell'asta selezionata" hidden></section>
```

- [ ] **Step 2: `stile.css`**
```css
#viste  { grid-area: viste; display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr auto; min-width: 0; min-height: 0; }
#spazio { grid-row: 1 / -1; }
#srotolato { border-right: 1px solid var(--tratto); border-top: 1px solid var(--tratto); padding: 4px 8px; min-height: 0; }
#srotolato svg { display: block; }
#srotolato .titolo { margin: 0 0 2px; font: 11px var(--mono); color: var(--inchiostro); }
#srotolato .titolo.stantia { color: var(--rosso); }
#risultati-vista { grid-template-columns: 1fr 1fr; }
#risultati-vista kbd { font-size: 10px; padding: 0 3px; }
```
E **tre selettori esistenti si estendono invece di ricopiarsi** (R8 — è la R12 della 12, seconda
occorrenza): `:99` `.vincolo-gradi label` copre già `display: flex; gap: 4px; align-items: center`,
quindi `#risultati-vista label` non si riscrive; `:188` `.vuoto kbd` porta già famiglia, bordo,
raggio e fondo del `kbd`; `:235` `#file label, #corsa label` → `+ #risultati label`; `:236` e `:240`
`#file-percorso, #comando-campo, #corsa-inp` → `+ #risultati-scala, #risultati-caso` (larghezza,
mono, fondo, bordo, padding e anello di fuoco, tutti già lì). Due caselle di testo definite due
volte divergono al primo ritocco della palette, e nessuno se ne accorge finché non si guardano
vicine — è esattamente ciò che la 12 ha già pagato una volta.

```css
.vuoto kbd, #risultati-vista kbd { /* la riga `:188-189`, con l'id aggiunto */ }
#file label, #corsa label, #risultati label { /* la riga `:235`, con l'id aggiunto */ }
#file-percorso, #comando-campo, #corsa-inp, #risultati-scala, #risultati-caso { /* `:236-239` */ }
#file-percorso:focus-visible, #comando-campo:focus-visible, #corsa-inp:focus-visible,
#risultati-scala:focus-visible, #risultati-caso:focus-visible { /* `:240-241` */ }
```
(`#viste` sostituisce la riga `:46`; `#spazio` occupa le due righe della griglia — `:51` gli dà già
`min-height: 0`, quindi il pavimento del canvas three.js resta risolto come nel fix round 1/E.
`#risultati-vista` usa `class="vincolo-gradi"` per bordo, legenda e `accent-color` e ne cambia solo
le colonne: cinque radio in `repeat(3, 1fr)` uscirebbero 3 + 2. Da confermare a 1280 px nel Task 6.)

- [ ] **Step 3: i test di `esito.js`** — `static/test/esito.test.js`, con il DOM finto copiato da `corsa.test.js` (radice con `querySelector`/`querySelectorAll`, elementi con `addEventListener`/`dispatch`, `replaceChildren`, `append`, `hidden`, `value`, `checked`, `textContent`, `className`, `_figli`, `_attrs`); `createElementNS` per l'SVG della striscia come in `piano.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { creaEsito, creaSrotolato } from "../esito.js";

// Il DOM finto, copiato (non importato) da `corsa.test.js`: `elementoFinto(nome)` con `_figli`,
// `_attrs`, `hidden`, `value`, `checked`, `className`, `textContent`, `setAttribute/getAttribute`,
// `append/replaceChildren`, `addEventListener(tipo, fn)` e `dispatch(tipo)` che chiama i listener;
// `radiceFinta()` rende `{ radice, el }` con `radice.querySelector("#id")` che cerca per id fra gli
// elementi creati (`#risultati-vuoto`, `#risultati-controlli`, `#risultati-caso`, `#risultati-scala`,
// `#risultati-equilibrio`) e `radice.querySelectorAll('input[name="vista"]')` che rende i cinque
// radio (`value` "", "deformata", "M", "V", "N"); `globalThis.document = { createElement, createElementNS, activeElement: null }`
// con `createElementNS` come in `piano.test.js:117-133`; `contenitoreFinto()` e `tutti(radice, nome)` come là.

const risultatiDi = (casi) => ({ lavoro: { fin: { risultati: { run: { carico_totale: Object.fromEntries(casi.map((c) => [c, [0, 0, -60000]])) },
  per_caso: Object.fromEntries(casi.map((c) => [c, { spostamenti: {}, reazioni: { 1: [0, 0, 60000, 0, 0, 0] }, sollecitazioni: { 1: [{ x_rel: 0, My: 0 }, { x_rel: 0.5, My: 45e6 }, { x_rel: 1, My: 0 }] } }])) } } },
  vista: "deformata", caso: casi[0], scalaMano: null });

test("creaEsito: senza risultati lo stato vuoto; con risultati il select dei casi, la vista spuntata, l'equilibrio", () => {
  const { radice, el } = radiceFinta();
  const cambi = [];
  const esito = creaEsito(radice, { suCambio: (c) => cambi.push(c) });
  esito.disegna({ risultati: null, modello: {} });
  assert.equal(el("#risultati-vuoto").hidden, false);
  assert.equal(el("#risultati-controlli").hidden, true);
  esito.disegna({ risultati: risultatiDi(["Z1", "Z2"]), modello: {} });
  assert.equal(el("#risultati-vuoto").hidden, true);
  assert.equal(el("#risultati-controlli").hidden, false);
  assert.deepEqual(el("#risultati-caso")._figli.map((o) => o.value), ["Z1", "Z2"]);
  assert.equal(el("#risultati-caso").value, "Z1");
  assert.equal(radice.querySelectorAll('input[name="vista"]').find((r) => r.checked).value, "deformata");
  assert.equal(el("#risultati-equilibrio").textContent, "Σ reazioni (0; 0; 60) kN · Σ carichi (0; 0; -60) kN");
  assert.equal(el("#risultati-scala").value, "", "scala auto: campo vuoto");
});

test("creaEsito: cambiare caso, vista o scala chiama suCambio con i tre valori; una scala illeggibile torna auto", () => {
  const { radice, el } = radiceFinta();
  const cambi = [];
  const esito = creaEsito(radice, { suCambio: (c) => cambi.push(c) });
  esito.disegna({ risultati: risultatiDi(["Z1", "Z2"]), modello: {} });
  el("#risultati-caso").value = "Z2"; el("#risultati-caso").dispatch("change");
  assert.deepEqual(cambi.at(-1), { caso: "Z2", vista: "deformata", scalaMano: null });
  const radioM = radice.querySelectorAll('input[name="vista"]').find((r) => r.value === "M");
  radioM.checked = true; radioM.dispatch("change");
  assert.deepEqual(cambi.at(-1), { caso: "Z2", vista: "M", scalaMano: null });
  el("#risultati-scala").value = "50"; el("#risultati-scala").dispatch("change");
  assert.equal(cambi.at(-1).scalaMano, 50);
  el("#risultati-scala").value = "1/4"; el("#risultati-scala").dispatch("change");
  assert.equal(cambi.at(-1).scalaMano, 0.25, "leggiEspressione: «1/4» è una scala");
  el("#risultati-scala").value = "boh"; el("#risultati-scala").dispatch("change");
  assert.equal(cambi.at(-1).scalaMano, null, "illeggibile = auto");
  el("#risultati-scala").value = "0"; el("#risultati-scala").dispatch("change");
  assert.equal(cambi.at(-1).scalaMano, null, "zero o negativo = auto");
});

test("creaEsito: un ridisegno con lo stesso caso non riscrive il select (il fuoco resta), con un caso sparito torna al primo", () => {
  const { radice, el } = radiceFinta();
  const esito = creaEsito(radice, { suCambio: () => {} });
  esito.disegna({ risultati: risultatiDi(["Z1", "Z2"]), modello: {} });
  const opzioniPrima = el("#risultati-caso")._figli;
  esito.disegna({ risultati: { ...risultatiDi(["Z1", "Z2"]), caso: "Z2" }, modello: {} });
  assert.equal(el("#risultati-caso")._figli, opzioniPrima, "stesse opzioni: non si ricostruiscono");
  assert.equal(el("#risultati-caso").value, "Z2");
  esito.disegna({ risultati: { ...risultatiDi(["Z1"]), caso: "Z9" }, modello: {} });
  assert.equal(el("#risultati-caso").value, "Z1");
});

test("creaSrotolato: senza risultati nascosta; con risultati e nessuna asta il gesto; con l'asta il diagramma e il picco scritto", () => {
  const contenitore = contenitoreFinto();
  const striscia = creaSrotolato(contenitore);
  const modello = { nodi: [{ id: 1, x: 0, z: 0 }, { id: 2, x: 6000, z: 0 }], aste: [{ id: 1, nodo_i: 1, nodo_j: 2 }] };
  striscia.disegna({ risultati: null, modello, selezione: { tipo: "asta", id: 1 } });
  assert.equal(contenitore.hidden, true);
  const inVista = { vista: "M", caso: "Z1", perCaso: risultatiDi(["Z1"]).lavoro.fin.risultati.per_caso.Z1, stantia: false };
  striscia.disegna({ risultati: inVista, modello, selezione: null });
  assert.equal(contenitore.hidden, false);
  assert.ok(contenitore._figli[0].textContent.includes("Seleziona un'asta"));
  striscia.disegna({ risultati: inVista, modello, selezione: { tipo: "asta", id: 1 } });
  const svg = contenitore._figli.find((f) => f.nome === "svg");
  assert.ok(svg, "un SVG per l'asta");
  assert.equal(contenitore._figli[0].textContent, "M dell'asta 1 · Z1 · kN·m");
  const testi = tutti(svg, "text").map((t) => t.textContent);
  assert.ok(testi.includes("45 kN·m"));
  assert.equal(tutti(svg, "circle").length, 3, "un punto per stazione");
  striscia.disegna({ risultati: { ...inVista, stantia: true }, modello, selezione: { tipo: "asta", id: 1 } });
  assert.equal(contenitore._figli[0].className, "titolo stantia");
});

test("creaSrotolato: un'asta senza stazioni o sparita non solleva e dice che non c'è niente", () => {
  const contenitore = contenitoreFinto();
  const striscia = creaSrotolato(contenitore);
  const modello = { nodi: [], aste: [{ id: 7, nodo_i: 1, nodo_j: 2 }] };
  const inVista = { vista: "deformata", caso: "Z1", perCaso: { sollecitazioni: {} }, stantia: false };
  striscia.disegna({ risultati: inVista, modello, selezione: { tipo: "asta", id: 7 } });
  assert.equal(contenitore.hidden, false);
  assert.ok(contenitore._figli[0].textContent.includes("nessuna stazione"));
  striscia.disegna({ risultati: inVista, modello, selezione: { tipo: "asta", id: 99 } });
  assert.ok(contenitore._figli[0].textContent.includes("Seleziona un'asta"));
});
```

- [ ] **Step 4: `esito.js`**

```js
// Il blocco «Risultati» del pannello destro e la striscia dell'M srotolato sotto il piano
// (giornata 13). Lo stato non vive qui: `app.js` lo tiene e lo passa a `disegna`; i controlli
// chiamano `suCambio` con i tre valori, e `app.js` ridisegna.

import { casiDi, testoEquilibrio, srotolato, testoValore, picchi, assiDi } from "./risultati.js";
import { leggiEspressione } from "./numeri.js";
import { nodo } from "./modello.js";

const NS = "http://www.w3.org/2000/svg";
const INCHIOSTRO = "#141414", ROSSO = "#b8321e", MONO = 'ui-monospace, "SF Mono", "Menlo", monospace';

export function creaEsito(radice, { suCambio }) {
  const q = (sel) => radice.querySelector(sel);
  const vuotoEl = q("#risultati-vuoto"), controlliEl = q("#risultati-controlli");
  const casoEl = q("#risultati-caso"), scalaEl = q("#risultati-scala"), equilibrioEl = q("#risultati-equilibrio");
  const radio = () => [...radice.querySelectorAll('input[name="vista"]')];
  let stato = null;   // l'ultimo `risultati` disegnato: i controlli leggono da qui, non dal DOM
  let casiScritti = null;

  const cambio = () => {
    if (!stato) return;
    const vista = radio().find((r) => r.checked)?.value ?? "";
    // Una scala che non si legge, zero o negativa è «auto»: il campo lo dice con il segnaposto.
    const letta = scalaEl.value.trim() === "" ? null : leggiEspressione(scalaEl.value);
    const scalaMano = Number.isFinite(letta) && letta > 0 ? letta : null;
    suCambio({ caso: casoEl.value, vista: vista === "" ? null : vista, scalaMano });
  };
  casoEl.addEventListener("change", cambio);
  scalaEl.addEventListener("change", cambio);
  for (const r of radio()) r.addEventListener("change", cambio);

  function disegna({ risultati, modello }) {
    stato = risultati;
    vuotoEl.hidden = Boolean(risultati);
    controlliEl.hidden = !risultati;
    if (!risultati) { casiScritti = null; return; }
    const dati = risultati.lavoro.fin.risultati;
    const casi = casiDi(dati);
    // Le opzioni si riscrivono solo se i casi sono cambiati: ricostruirle a ogni ridisegno
    // staccherebbe dal DOM il select che l'utente sta usando (stessa regola di `pannello.js`).
    const chiave = casi.join("|");
    if (chiave !== casiScritti) {
      casoEl.replaceChildren(...casi.map((c) => { const o = document.createElement("option"); o.value = c; o.textContent = c; return o; }));
      casiScritti = chiave;
    }
    const caso = casi.includes(risultati.caso) ? risultati.caso : casi[0];
    casoEl.value = caso;
    for (const r of radio()) r.checked = r.value === (risultati.vista ?? "");
    if (document.activeElement !== scalaEl) scalaEl.value = risultati.scalaMano === null ? "" : String(risultati.scalaMano).replace(".", ",");
    equilibrioEl.textContent = testoEquilibrio(dati, caso);
    void modello;
  }
  return { disegna };
}

/** La striscia dell'M srotolato: l'asta selezionata, tutte le stazioni, i picchi scritti. */
export function creaSrotolato(contenitore) {
  const el = (nome, attributi = {}) => { const e = document.createElementNS(NS, nome); for (const [k, v] of Object.entries(attributi)) e.setAttribute(k, v); return e; };
  const titolo = () => { const p = document.createElement("p"); p.className = "titolo"; return p; };

  function disegna({ risultati, modello, selezione }) {
    contenitore.hidden = !risultati;
    if (!risultati) { contenitore.replaceChildren(); return; }
    const p = titolo();
    if (risultati.stantia) p.className = "titolo stantia";
    const id = selezione?.tipo === "asta" ? selezione.id : null;
    const asta = id !== null ? (modello?.aste ?? []).find((a) => a.id === id) : null;
    if (!asta) { p.textContent = "Seleziona un'asta per il suo M srotolato."; contenitore.replaceChildren(p); return; }
    const stazioni = risultati.perCaso?.sollecitazioni?.[String(asta.id)];
    // La chiave la decide la giacitura dell'asta, non una costante: su un pilastro è `Mz` (R1).
    // Un'asta i cui nodi non ci sono più non ha assi: allora niente chiave e niente striscia.
    const assi = assiDi(nodo(modello, asta.nodo_i) ?? {}, nodo(modello, asta.nodo_j) ?? {});
    const chiave = assi?.M ?? "My";
    const { punti, massimo } = srotolato(assi ? stazioni : null, chiave);
    p.textContent = `${risultati.stantia ? "stantia · " : ""}M dell'asta ${asta.id} · ${risultati.caso} · kN·m`;
    if (punti.length === 0) { p.textContent += " · nessuna stazione per quest'asta"; contenitore.replaceChildren(p); return; }
    const colore = risultati.stantia ? ROSSO : INCHIOSTRO;
    // Niente `viewBox`: si disegna **in pixel**, misurando il contenitore come fa `piano.js`
    // (`millimetriPerPixel`, `:118-122`). Un `viewBox` con `preserveAspectRatio="none"` stira
    // il disegno a tutta larghezza e con lui i glifi e i cerchi delle stazioni — a 1280 px la
    // colonna del piano è larga ~400 px contro i 1000 del `viewBox`, cioè testo schiacciato di
    // 2,4 a 1 (R7). Limite dichiarato: la striscia si rimisura al prossimo `ridisegna`, quindi
    // un ridimensionamento della finestra senza toccare niente la lascia della larghezza di prima.
    const W = Math.max(contenitore.clientWidth || 0, 200), H = 96, M = 14;
    const svg = el("svg", { width: W, height: H, "aria-label": `M srotolato dell'asta ${asta.id}` });
    const y0 = H / 2;
    const y = (v) => (massimo > 0 ? y0 + (v / massimo) * (H / 2 - M) : y0);   // M positivo verso il basso: il lato teso
    const x = (r) => r * W;
    svg.append(el("line", { x1: 0, y1: y0, x2: W, y2: y0, stroke: colore, "stroke-width": 1 }));
    svg.append(el("polygon", { points: [`0,${y0}`, ...punti.map((q) => `${x(q.x_rel)},${y(q.valore)}`), `${W},${y0}`].join(" "),
                               fill: colore, "fill-opacity": 0.08, stroke: colore, "stroke-width": 1.5, "stroke-dasharray": "5 3" }));
    for (const q of punti) svg.append(el("circle", { cx: x(q.x_rel), cy: y(q.valore), r: 2.5, fill: colore }));
    for (const picco of picchi(stazioni, chiave)) {
      const sopra = picco.valore > 0;   // il testo dalla parte opposta al diagramma, che qui è sotto per M > 0
      const t = el("text", { x: x(picco.x_rel), y: sopra ? y0 - 4 : y0 + 12, "font-size": 11, fill: colore, "font-family": MONO,
                             "text-anchor": picco.x_rel < 0.1 ? "start" : picco.x_rel > 0.9 ? "end" : "middle" });
      t.textContent = testoValore("M", picco.valore);
      svg.append(t);
    }
    contenitore.replaceChildren(p, svg);
  }
  return { disegna };
}
```
(La striscia è in pixel e non ha `viewBox`: nessuna deformazione dei glifi, e il `M` positivo va
verso il basso — nella striscia srotolata «in basso» è una convenzione di lettura, non il lato teso
geometrico, che sul pilastro sarebbe un lato dello schermo. Scritto qui perché non venga «corretto».)

- [ ] **Step 5: `tastiera.js`** — in `TASTI` dopo `verifica`/`corri` (`:24-25`):
```js
  // I risultati (giornata 13): una vista alla volta. Compare solo con una corsa da mostrare.
  { codice: "vista",     tasto: "0-4",   etichetta: "vista",     aiuto: "0 niente · 1 deformata · 2 M · 3 V · 4 N", contesto: "risultati" },
```
in `SENZA_MODIFICATORE`: `["0", "vista"], ["1", "vista"], ["2", "vista"], ["3", "vista"], ["4", "vista"],`; in `vociDellaBarra(contesto, tipoSelezionato = null, { risultati = false } = {})`, prima della riga `if (v.codice === "seleziona")`: `if (v.contesto === "risultati") return risultati && (contesto === "sempre" || contesto === "selezione");`. Test in `tastiera.test.js`:
```js
test("vista: le cifre 0-4 senza modificatore sono la voce «vista»; con ⌘ no; la barra la promette solo con risultati", () => {
  for (const k of ["0", "1", "4"]) assert.equal(voceDaEvento({ key: k })?.codice, "vista");
  assert.equal(voceDaEvento({ key: "5" }), null);
  assert.equal(voceDaEvento({ key: "1", metaKey: true }), null);
  assert.ok(!vociDellaBarra("sempre").some((v) => v.codice === "vista"));
  assert.ok(vociDellaBarra("sempre", null, { risultati: true }).some((v) => v.codice === "vista"));
  assert.ok(vociDellaBarra("selezione", "nodo", { risultati: true }).some((v) => v.codice === "vista"));
  assert.ok(!vociDellaBarra("ghost", null, { risultati: true }).some((v) => v.codice === "vista"));
  assert.equal(nomeTasto("0-4"), "0-4");
});
```

- [ ] **Step 6: `pannello.js`** — `righeDiNodo(m, n, { rilievo = null, risultati = null } = {})`: dopo la riga `vincolo`, se `risultati?.perCaso`: `righe.push(...righeSpostamenti(risultati.perCaso, n.id).map(([k, v]) => [`${k} (${risultati.caso})`, v]), ...righeReazioni(risultati.perCaso, n.id).map(([k, v]) => [`${k} (${risultati.caso})`, v]));` (import da `./risultati.js`). `disegna(m, selezione, { …, risultati = null })` passa `risultati` nelle `opzioni`. Test in `pannello.test.js`:
```js
test("ispettore del nodo con risultati: sei spostamenti e, se vincolato, sei reazioni, col caso nel termine", () => {
  const perCaso = { spostamenti: { 1: [0.5, 0, -3.456, 0, 0.0008, 0] }, reazioni: { 1: [0, 0, 30000, 0, 0, 0] } };
  const r = righe(m1, { tipo: "nodo", id: 1 }, { risultati: { caso: "Z1", perCaso } });   // `righe` è già esportata (`pannello.js:146`)
  const termini = r.map(([k]) => k);
  assert.ok(termini.includes("spostamenti (Z1)") && termini.includes("rotazioni (Z1)"));
  assert.ok(termini.includes("reazioni (Z1)") && termini.includes("momenti di reazione (Z1)"));
  assert.equal(r.find(([k]) => k === "spostamenti (Z1)")[1], "ux 0,5 mm · uy 0 mm · uz -3,46 mm");
  const senza = righe(m1, { tipo: "nodo", id: 1 }, { risultati: null }).map(([k]) => k);
  assert.ok(!senza.some((k) => k.startsWith("spostamenti")));
});
```
(`m1` = un modello con il nodo 1: usare quello che `pannello.test.js` costruisce già in testa; se il nodo 1 non è vincolato lì, le righe delle reazioni ci sono lo stesso: `righeReazioni` guarda `perCaso.reazioni`, non il vincolo — il contratto del server scrive le reazioni solo per i vincolati.)

- [ ] **Step 7: `app.js`** — la cucitura:
1. Import: `import { creaEsito, creaSrotolato } from "./esito.js"; import { casiDi, scalaAuto, puntiDeformata } from "./risultati.js"; import { stantia } from "./corsa.js";`
2. Lo stato e `risultatiInVista(m)` come nel «Contratto dei moduli nuovi», dopo `let rilievo = null;`.
3. `creaCorsa` (`:235-243`): 
```js
  suEsito: (esito) => {
    // Una corsa con risultati diventa la vista: parte dalla deformata, primo caso. Una corsa
    // senza (rifiutata, in errore, del solido) azzera la vista: i diagrammi di prima parlerebbero
    // di una corsa che non è più l'ultima. La `verifica` (esito `null`) non tocca niente.
    if (esito === null) { ridisegna(); return; }
    const casi = casiDi(esito?.fin?.risultati);
    risultati = casi.length ? { lavoro: esito, vista: "deformata", caso: casi[0], scalaMano: null } : null;
    ridisegna();
  },
```
4. In `suApertura` e `suImportazione`, accanto a `corsa.azzera()`: `risultati = null;`.
5. Dopo `creaCorsa`: 
```js
const esito = creaEsito(document, {
  suCambio: ({ caso, vista, scalaMano }) => { if (risultati) { risultati = { ...risultati, caso, vista, scalaMano }; ridisegna(); } },
});
const srotolato = creaSrotolato($("srotolato"));
```
6. In `ridisegna`, prima di `piano.disegna`: `const inVista = risultatiInVista(m);`; poi `piano.disegna(m, { …, risultati: inVista })`; `spazio?.disegna(m, { selezione, deformata: inVista?.vista === "deformata" ? { aste: puntiDeformata(m, inVista.perCaso, inVista.scala), stantia: inVista.stantia } : null })`; `pannello.disegna(m, selezione, { …, risultati: inVista })`; dopo `corsa.disegna`: `esito.disegna({ risultati, modello: m }); srotolato.disegna({ risultati: inVista, modello: m, selezione });`. Attenzione: `esito.disegna` riceve lo **stato** (`risultati`, con `lavoro`), `srotolato` e `piano` la **vista** (`inVista`).
7. `disegnaBarra`: `vociDellaBarra(contesto, selezione?.tipo ?? null, { risultati: Boolean(risultati) })`.
8. Il `keydown` (`:675`): `eseguiVoce(voce, voce.codice === "vista" ? ev.key : null);` e `eseguiVoce(voce, valore)` → `dispatchVoce(voce, valore)`. **Attenzione alla coda di `eseguiVoce`** (`:686`): `if (comando && valore !== null) { campoComando.value = valore; … conferma(); }` — con un campo aperto ma **senza fuoco** (il fuoco esce con un clic nel piano, e `daControllo` a `:660` non ferma più il tasto) `2` diventerebbe il testo del campo e lo confermerebbe. La guardia giusta non nomina `vista`, nomina la condizione: **`voce.campo`** (`if (comando && valore !== null && voce.campo)`). La coda esiste per «il valore entra nel campo appena aperto», e il campo lo apre `apriComando` (`:296`), che è chiamato **solo** da voci con `campo` (`:754`, `:773`, `:813`, `:846`, `:855`, `:861`, `:865`, `:882`, `:895`). Così coperta, la trappola non si ripresenta per la prossima voce senza campo che porti un valore (R4). In `dispatchVoce(voce, valore = null)`, sopra la guardia del modo (accanto a `corri`/`verifica`, `:740-741`; sotto la guardia del campo a `:735`, che è il motivo per cui la coda di `eseguiVoce` va guardata a sua volta):
```js
  if (voce.codice === "vista") {
    if (!risultati) { dì("nessuna corsa da mostrare: ⌘⏎ la lancia"); return; }
    const scelta = { 0: null, 1: "deformata", 2: "M", 3: "V", 4: "N" }[String(valore ?? "").trim()];
    if (scelta === undefined) { dì("la vista è 0, 1, 2, 3 o 4"); return; }
    risultati = { ...risultati, vista: scelta };
    dì(null); ridisegna();
    return;
  }
```
(la palette: «vista 2» arriva con `valore: "2"` per la stessa strada.)

- [ ] **Step 8: tutti i test JS e pytest**

Run: `env -C /Users/mario/GitHub/NOVA-wt/interfaccia-13/static node --test test/*.test.js` → tutti pass.
Run: il comando pytest dei Global Constraints → `test_js` verde, il fumo `pagina` ancora verde (la pagina si apre con il blocco nuovo).

- [ ] **Step 9: Commit**

```bash
git -C /Users/mario/GitHub/NOVA-wt/interfaccia-13 add static/esito.js static/test/esito.test.js static/tastiera.js static/test/tastiera.test.js static/pannello.js static/test/pannello.test.js static/index.html static/stile.css static/app.js
git -C /Users/mario/GitHub/NOVA-wt/interfaccia-13 commit -m "feat(interfaccia): blocco «Risultati» (caso, vista 0-4, scala a mano, equilibrio), M srotolato dell'asta selezionata, spostamenti e reazioni nell'ispettore"
```

---

### Task 6: il fumo dei risultati — qL²/8 sull'etichetta, zero sovrapposizioni a 1280 e 1920 — e la prova a mano

**Files:**
- Modify: `tests/fumo/fumo.mjs` (copione `risultati`)
- Modify: `tests/test_fumo_chrome.py` (due test con `binario_opensees`)
- Modify: `docs/superpowers/plans/2026-09-10-t5-giornata-13-risultati.md` (sezione «Esito», a fine giornata)

**Interfaces:**
- Consumes: Task 1 (fixture `chrome_e_server`, `copione`), tutto il ramo.
- Produces: `copione("risultati", porta, cdp, fixture="<percorso assoluto>", vista="2", larghezze=[1280, 1920])` → `{ ok, errori, trovato: { ultima, etichette: [...], sovrapposte: { "1280": [...], "1920": [...] }, badge } }`.

**Riferimento:** `docs/ricerca/07-ux-modellatore.md:62`

## Ingressi degeneri
- OpenSees assente dal PATH → `binario_opensees` salta i due test dei risultati; il test della pagina del Task 1 resta verde, perché non corre niente
- Chrome o node assenti → skip, come nel Task 1
- la corsa non finisce entro 90 s → `finche` solleva «tempo scaduto su: … (ultimo valore …)» e il test **fallisce col motivo**, non resta appeso
- il modello non si apre (percorso sbagliato, JSON storto) → `finche` sui `circle` scade a 10 s, e il `messaggio` letto alla fine entra nel report invece di restare a schermo di un browser che nessuno guarda
- una coppia di `<text>` si sovrappone a una sola delle larghezze → l'`assert` nomina la larghezza **e** le due stringhe, così si sa quale etichetta ha ceduto e dove
- l'etichetta esiste ma con un'altra grafia («45,0 kN·m») → il difetto è in `conciso`/`testoValore`, non nel copione: il messaggio d'errore stampa l'elenco intero di `etichette`
- la vista chiesta non produce nessuna etichetta (tutto sotto soglia) → `etichette` è `[]` e l'assert sulle sovrapposizioni passa a vuoto: il test dei picchi è quello sulla trave appoggiata, e va tenuto separato apposta

- [ ] **Step 1: il copione**

In `COPIONI` di `tests/fumo/fumo.mjs`:
```js
  // Apre un modello, lo corre, sceglie una vista, legge le etichette del piano e cerca le
  // sovrapposizioni fra i `<text>` a ogni larghezza chiesta.
  async risultati() {
    await apri(url, arg.cdp);
    await ev(`(() => { const c = document.getElementById("file-percorso"); c.value = ${JSON.stringify(arg.fixture)}; return true; })()`);
    await tasto("o", { meta: true });
    await finche(`document.querySelectorAll("#piano svg circle").length > 0`, 10000);
    await tasto("Enter", { meta: true });   // ⌘⏎: corri
    const ultima = await finche(`(() => { const t = document.getElementById("corsa-ultima").textContent; return t.startsWith("corsa") ? t : ""; })()`, 90000, 500);
    await finche(`!document.getElementById("risultati-controlli").hidden`, 5000);
    await tasto(arg.vista ?? "2");
    await pausa(300);
    const etichette = await ev(`[...document.querySelectorAll("#piano svg g.risultati text")].map((t) => t.textContent)`);
    const badge = await ev(`document.querySelector("#piano .risultati-badge").textContent`);
    const sovrapposte = {};
    for (const w of arg.larghezze ?? [1280, 1920]) {
      await viewport(w, Math.round(w * 0.625), 1);
      await pausa(300);
      sovrapposte[String(w)] = await ev(SOVRAPPOSTE);
    }
    // Lo zoom 200 %: 640×400 con dpr 2, come nelle giornate 11c-12.
    await viewport(640, 400, 2); await pausa(300);
    sovrapposte.zoom200 = await ev(SOVRAPPOSTE);
    const messaggio = await ev(`document.getElementById("messaggio").textContent`);
    return { ultima, etichette, badge, sovrapposte, messaggio };
  },
```

- [ ] **Step 2: i test**

In `tests/test_fumo_chrome.py`:
```python
FIXTURE = RADICE / "tests" / "fixture"


def test_trave_appoggiata_il_momento_in_mezzeria_e_sull_etichetta(chrome_e_server, binario_opensees):
    """La verifica della giornata 13 (bozza T5, riga 19): M(mid) = qL²/8 = 45 kN·m letto sull'etichetta."""
    porta, cdp = chrome_e_server
    r = copione("risultati", porta, cdp, fixture=str(FIXTURE / "trave_appoggiata.nova.json"), vista="2")
    assert r["ok"], r
    assert r["errori"] == [], r["errori"]
    assert r["trovato"]["ultima"].startswith("corsa")
    assert "45 kN·m" in r["trovato"]["etichette"], r["trovato"]
    assert r["trovato"]["badge"] == "M · Z1 · kN·m · lato teso"
    for larghezza, coppie in r["trovato"]["sovrapposte"].items():
        assert coppie == [], f"etichette sovrapposte a {larghezza}: {coppie}"


@pytest.mark.parametrize("vista", ["1", "2", "3", "4"])
def test_telaio_2x1_nessuna_etichetta_sovrapposta_in_ogni_vista(chrome_e_server, binario_opensees, vista):
    porta, cdp = chrome_e_server
    r = copione("risultati", porta, cdp, fixture=str(FIXTURE / "telaio_2x1.nova.json"), vista=vista)
    assert r["ok"], r
    assert r["errori"] == [], r["errori"]
    assert r["trovato"]["messaggio"] == ""
    for larghezza, coppie in r["trovato"]["sovrapposte"].items():
        assert coppie == [], f"vista {vista}, etichette sovrapposte a {larghezza}: {coppie}"
```
(`binario_opensees` è `scope="session"` e salta se manca; la fixture `chrome_e_server` è per test: cinque avvii di Chrome, ~5 s l'uno.)

- [ ] **Step 3: lanciare** il file: `… -m pytest tests/test_fumo_chrome.py --tb=short -rs …` → `6 passed` (o `5 skipped` senza OpenSees). Se «45 kN·m» manca ma le etichette contengono «45,0 kN·m» o simile, il difetto è in `conciso`/`testoValore`, non nel copione; se una coppia si sovrappone, riportarla nell'Esito con le due stringhe e sistemare in `piano.js` (ostacoli mancanti) o in `etichette.js`.

- [ ] **Step 4: la prova a mano** (il controller, su Chrome vero, porta 8821): trave appoggiata → `⌘⏎`, `1 2 3 4 0`; MURO 1 (`docs/caso-studio/muro_1.nova.json`) → tutte le viste, cambio caso dal select, scala «50» e «boh», selezione di un'asta per la striscia, `⌘Z` fino a stantia (badge rosso), pannello del nodo con spostamenti e reazioni; zoom 200 %; VoiceOver a orecchio sui radio della vista. Quel che si rompe entra come fix con test.

- [ ] **Step 5: la sezione «Esito»** in coda a questo piano: conteggi finali dei test, difetti trovati dal fumo e a mano, debiti dichiarati (fra i noti: `preserveAspectRatio: none` sulla striscia; la deformata 3D senza test; il badge che copre l'etichetta di un nodo in alto a destra su un modello che riempie il riquadro — se si vede, va fra gli ostacoli).

- [ ] **Step 6: Commit**

```bash
git -C /Users/mario/GitHub/NOVA-wt/interfaccia-13 add tests/fumo/fumo.mjs tests/test_fumo_chrome.py docs/superpowers/plans/2026-09-10-t5-giornata-13-risultati.md
git -C /Users/mario/GitHub/NOVA-wt/interfaccia-13 commit -m "test(interfaccia): il fumo dei risultati — qL²/8 sull'etichetta, nessuna sovrapposizione a 1280, 1920 e zoom 200 %"
```

---

## Mutanti da provare a fine ramo (con controllo nullo)

Copia del file in tmp prima, ripristino dalla copia, mai `git checkout --`.
- `risultati.js`: `verso = 1` anche per M (M sul lato compresso) → deve cadere il test «M positivo sotto la trave»; `pi = ui[4]` (segno della rotazione) → deve cadere «la mezzeria scende»; `scala125` che rende `v` → cade «120 → 100».
- `risultati.js`, R1: `assiDi` che rende sempre `{M:"My", V:"Vz"}` (la vecchia mappa costante) → devono cadere «assiDi: una trave flette con My/Vz, un pilastro con Mz/Vy», «diagramma su un pilastro verticale» e il test del piano sul pilastro; `s = 1` sempre (via `sign(e1.x)`) → cade «il verso di M non dipende dall'ordine dei nodi»; `verticale` con `>= 1` invece di `> 0,999` → cade la riga del pilastro.
- `etichette.js`: `siSovrappongono` con `<=` → cade «i bordi che si toccano»; `disponi` senza il controllo degli ostacoli → cade «un ostacolo su tutti i primi posti».
- `piano.js`: strato appeso **dopo** i nodi → cade «lo strato sta fra le aste e i nodi» (il DOM finto tiene i figli in ordine: il mutante che il piano dava per non uccidibile ora si uccide); il badge tolto dagli ostacoli → nessun test JS cade, e resta un limite dichiarato che il fumo vede solo se un picco capita in alto a destra.
- `app.js`: `suEsito` che non azzera su corsa senza risultati → il fumo non lo vede: limite dichiarato. La coda di `eseguiVoce` senza `voce.campo` → nessun test JS cade (è in `app.js`), e il fumo la prende solo con il copione che apre il campo, lo perde di fuoco e preme una cifra: **non c'è**, e va scritto nell'Esito.
- **Controllo nullo**: un mutante che nessun test prende è un test che manca, non un test buono.
