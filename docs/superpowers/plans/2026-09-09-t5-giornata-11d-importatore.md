# NOVA T5 — giornata 11d: l'importatore in interfaccia, come rendiconto

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** il prior `12_wall.json` di MeshRec si importa dall'area file (bottone «importa» o `⌘I`) e l'interfaccia rende conto di ciò che il rilievo ha dato e di ciò che ha bocciato: il modello importato (nodi, aste, sezioni con `origine: rilievo`), le regioni scartate con controllo, valore, soglia e spiegazione, le giunzioni con lo scostamento, i vincoli proposti come ghost da confermare uno per uno o tutti insieme, l'elenco «dal rilievo mancano». Il caso principale è il prior **vuoto** (il rilievo vero del laboratorio): modello vuoto e quattordici righe che dicono perché.

**Architecture:** nessuna rotta nuova — `POST /api/importa {percorso}` c'è dalla T2 e restituisce già tutto (`nova/sidecar.py:comando_importa`). Un modulo puro nuovo (`static/rilievo.js`) traduce la risposta in uno **stato di rendiconto** che vive in `app.js` accanto al modello, non dentro (la spec lo dice: «le tre cose accanto al modello»); l'area file guadagna il terzo verbo; l'albero un ramo «Rilievo» con una voce sola; l'ispettore un rendiconto quando quella voce è selezionata; il piano i simboli dei vincoli, tratteggiati finché sono proposte; i nodi e le aste importati mostrano l'origine con la sua nota. Confermare una proposta è `impostaVincolo`, il riduttore della 11a: nessun riduttore nuovo.

**Tech Stack:** moduli ES nativi, `node --test` per il modulo puro e per gli editor sul DOM finto, `pytest` invariato (nessun file sotto `nova/`), il server FastAPI di T1 per la prova in browser.

**Spec:** `docs/superpowers/specs/2026-09-05-nova-v1-design.md` — story 51-54 (righe 98-101), 55 (riga 102, fatta nella 11b), sezione «Importatore dal prior» (righe 215-218), contratto `importa → esito, modello, scartate[], mancano[]` (riga 146). Brief di design: `docs/superpowers/specs/2026-09-07-shape-ux-modellazione.md` §3 (righe 83-104: «il caso principale è il rifiuto», «il materiale è già strutturato per P1», «le tre cose accanto al modello, non dentro») e §5 punto 4 (riga 129: «se il rendiconto sia una schermata a sé o un pannello» — deciso qui sotto). Calendario: `docs/superpowers/plans/2026-09-06-t5-interfaccia-bozza.md:86` (11d = 51-54, «prima della 12 perché usa la stessa grammatica dei verdetti»).

**Ricerca che questo piano applica** (`docs/ricerca/index.md`): riga 17, ricerca 05 — `05-archeologia-linea-integrata.md:150-151` (`telaio.py` «non misura niente»: una fetta = un'asta, le decisioni #134/#142/#143) e `:176` (la vecchia linea mostrava «membrature del prior, sezione dichiarata, stazioni con verdetto, riempimento con soglia, giunzioni»: è la stessa lista, qui ridotta a ciò che il modello NOVA porta); riga 19, ricerca 07 — `07-ux-modellatore.md:148` (P1: ogni numero col suo contraddittore — valore **e** soglia su ogni scartata), `:149` (P2: nessuna finestra che blocca — il rendiconto è un pannello), `:152` (P5: attesa parlante — «importazione in corso» sul bottone), `:155` (P8: divulgazione progressiva — la voce «Rilievo» compare solo dopo un'importazione). Mappa wayfinder #31: la 11d chiude la giornata 11; dopo, la passata sull'uso.

**Ramo:** `feat/interfaccia-11d-importatore` da `main` a `a8905d1`, worktree `/Users/mario/GitHub/NOVA-wt/interfaccia-11d` (venv pronto, `nova ok 3.12.13`). PR verso `main`.

## Global Constraints

- **Lingua italiana** in interfaccia, commenti, messaggi di commit; identificatori tecnici invariati. Le chiavi del modello sono quelle di `nova/modello.py` alla lettera: il modello importato arriva dal server già valido e **non si tocca** in JS se non con i riduttori esistenti.
- **Notazione numerica italiana**: `cifre`/`conciso`/`millimetri` in uscita (`static/numeri.js:182-195,171`), `leggiNumero` in ingresso. Unità su ogni numero: scostamenti in **mm**, punti come conteggio con migliaia, valori delle scartate con l'`unita` che il prior dichiara (`frazione`, `-`, `mm`).
- **Palette «colonna tensegrale»**: fondo `#dcdad5`, inchiostro `#141414`, **un solo rosso** `#b8321e` = attenzione. Mai «cream palette». Il rosso a 11-13 px non regge AA come colore di testo (`stile.css:133`): il rosso è il **filetto** (`.avviso`, `.non-ora`, `li.scelto`), la parola è il canale.
- **Nessun bundler, nessun `package.json`, nessuna rete a tempo d'uso.**
- **WCAG AA**; nessuna informazione sul solo colore; fuoco sempre visibile; ogni campo con nome accessibile che **comincia** dal testo visibile (`pannello.js:140-144` circa, test «comincia dal testo visibile» in `pannello.test.js`).
- **Zero sovrapposizioni, zero testo tagliato**, verificato a 1280 e 1920 px e a zoom 200 % (viewport 640×400 con dpr 2, non `zoom` CSS: misurato il 09/09).
- **Nessun file sotto `nova/` né `meshrec/` cambia.** Nessun test Python cambia.
- **Niente geometria dedotta che il rilievo non abbia misurato** (brief §4): il rendiconto stampa, non calcola; l'unico gesto che scrive nel modello è confermare una proposta di vincolo, e passa da `impostaVincolo`.
- **Il rendiconto non entra nel modello né nel file**: vive in `app.js` come `rilievo`, si azzera ad «apri» e a un nuovo modello, e **non** entra nella cronologia (⌘Z non lo tocca: è una lettura, non un comando). Riaprire un file importato ieri non lo riporta: dichiarato, nell'Esito e nell'ispettore («rendiconto disponibile solo nella sessione dell'importazione»).
- Riduttori **puri**; un comando che non cambia niente restituisce il modello ricevuto (`comandi.js`, `cronologia.js:12-27`).
- `ghostDelComando` (`modo.js:126`) **non si tocca**: l'importazione non apre il campo di comando.
- Comando dei test JS (dalla cartella `static/`): `node --test test/*.test.js` — punto di partenza **570 pass** (il glob da `node` v26 vuole i file elencati o `env -C … node --test test/*.test.js` dalla shell).
- Comando dei test Python (non cambiano):
  `/Users/mario/GitHub/NOVA-wt/interfaccia-11d/.venv/bin/python -P -m pytest /Users/mario/GitHub/NOVA-wt/interfaccia-11d/tests -p no:cacheprovider --color=no --rootdir=/Users/mario/GitHub/NOVA-wt/interfaccia-11d` — punto di partenza **698 segni** (695 pass + 3 skip).
- Server per la prova in browser: `env -C /Users/mario/GitHub/NOVA-wt/interfaccia-11d .venv/bin/python -P -m nova --porta 8818`. **Mai la 8765, né 8766-8767.** Spegnerlo a fine prova. Chrome: l'estensione se risponde; altrimenti il Chrome headless via CDP (`/Users/mario/.claude/jobs/4fd80bf5/tmp/cdp.mjs`, con `Network.setCacheDisabled`: `?v=` non scavalca la cache dei moduli).
- **Mai `git checkout --` per revertire un mutante**: copia del file prima, ripristino dalla copia.
- Un comando per chiamata Bash, percorsi assoluti, `git -C`; niente `cd … &&`.

## Quel che il backend dà già, e non va reinventato

- `nova/server.py:135-136` `ImportaReq{percorso}`; `:199-204` `POST /api/importa` risolve il relativo nella cwd del server e passa al sidecar; errori come `HTTPException(400, {fase: "importa", motivo})` (`tests/test_server.py:485-523`, i due 400 a 496-511: percorso inesistente e prior mutilato sono **400**, mai 200).
- `nova/sidecar.py:96-125` `comando_importa` → `{esito: "ok", modello, scartate, giunzioni, proposte_vincoli, mancano, resoconto}`. `modello` è `model_dump(mode="json", exclude_none=True)`: la stessa forma di `/api/modello/apri`, e `nuovaCronologia(m)` lo prende com'è.
- `nova/importa.py:56-64` `Importato`; `:117-128` `_scartate`: **una riga per controllo fallito**, `{regione, punti, controllo, valore, soglia, unita, spiegazione}`; `:171-176` i due materiali di default con `origine {sorgente: "rilievo", nota: "assunta: il rilievo non dice la classe"}`; `:202-267` `importa`: sezioni `nome "rilievo m0 s0 140×281"`, `copriferro 0`, `file []`, origine con nota «dispersione 0.00×0.06 mm»; aste `nome "membratura 0 fetta 0"`, origine con nota «riempimento 1.00»; nodi con `origine {sorgente, riferimento: "12_wall.json"}` e `y` non nullo (la terna ruotata, story 54); `giunzioni = [{nodo, scostamento_nodo, distanza_proiezione, cede, resta}]` (nodo già **1-based**); `proposte_vincoli = [{nodo, vincolo: {sei gradi true}}]` (`nova/modello.py:603-618`: un incastro per ogni nodo al piede, «da proporre e non da applicare»); `mancano = ["armature", "classe", "vincoli"]`; `resoconto = {membrature, aste, nodi, scartate, giunzioni_scartate, nota_vincoli?, percorso}` con `nota_vincoli = "tutti i nodi sarebbero al piede: nessuna proposta"` (`nova/modello.py:600`).
- **Misurato sulle tre fixture** (09/09, `importa()` diretto): `tests/fixture/prior_vuoto/12_wall.json` → 0 nodi, 0 aste, **0 materiali**, 14 righe di scartate (8 regioni, `resoconto.scartate = 8`), `mancano = []`, prima riga `{regione: 0, punti: 4 215 879, controllo: "costanza_sezione", valore: 1.187, soglia: 0.1, unita: "frazione"}`; `prior_parziale` → 42 nodi, 40 aste, 2 scartate (`unita: "-"`, spiegazione «sintetico: scartata a mano per il test»), 0 proposte con `nota_vincoli`; `prior_sintetico` → 80 nodi, 80 aste, 80 sezioni, 0 scartate, 4 giunzioni (`scostamento_nodo` 27,2 mm), **21 proposte**, `mancano` a tre.
- `nova/check.py:262-272` il verdetto `vincoli_dedotti` con la stessa nota: dopo la conferma delle proposte, `vincoli` passa e `vincoli_dedotti` legge il modello confermato.
- `static/file.js:24-33` `chiediJson(rotta, corpo)` (POST se `corpo` c'è; l'errore porta `motivo` o «il server non risponde»); `:63-179` `creaFile(radice, {suApertura, suSalvataggio, suErrore, deposito})` con `apri` (`:117-136`: `inCorso`, `salvato = JSON.stringify(modello)`, `ricorda(p)`, `suApertura(p, modello, impronta)`), `salva` (`:138-160`), il listener di `#file-apri` (`:165`), `disegna` (`:167`), il ritorno `{disegna, apri, salva, percorsoCorrente}` (`:179`). `testoStato` (`:46-49`).
- `static/index.html:11-27` la sezione `#file` (`#file-percorso`, `.file-azioni` con `#file-apri` e `#file-salva`, `#file-stato`, recenti); `:28` `<nav id="albero">`. `stile.css:219-245` lo stile dell'area file (`.file-azioni button` a `:229`).
- `static/app.js:30` `selezione`, `:43` `azioneCorrente`; `:105` `scegli(tipo, id)`; `:122-124` `piano`, `albero`, `pannello` con i callback; `:170-181` `creaFile` con `suApertura` che ricomincia la cronologia, chiude il campo, azzera selezione e modo; `:214` `apriModo`; `:530-560` `ridisegna` con `esiste` a sei vie (`:534`) e `piano.disegna(m, {selezione, ghost, azioneInVista})` (`:558`); `:619` `eseguiVoce`, `:628` `dispatchVoce`, `:649` il ramo `apri` **sopra** la guardia del campo; `:711` il ramo `vincolo` (`V` alterna con `alternaIncastro`).
- `static/tastiera.js:14-41` `TASTI` (la voce `apri` a `:21` è lo stampo: `{codice, tasto: "⌘O", etichetta, aiuto: null, contesto: "salvo-ghost", modificatore: "comando"}`), `:76` `CON_COMANDO` con `o, s, z, k`.
- `static/pannello.js:15` `CERCA` a sei vie, `:26` `testoOrigine` (sorgente + «modificata», **senza la nota**), `:28` `righeDiNodo`, `:42` `righeDiAsta`, `:59` `righeDiSezione`, `:71` `righeDiMateriale`, `:95` `RIGHE`, `:174` `campoNumero`, `:194` `scelta`, `:208` `gruppo(legenda, classe, nota)`, `:220` `bottone`, `:242` `editorVincolo(m, n, azioni)`, `:647` `EDITORI`, `:650` `creaPannello({dati, vuoto, editor}, azioni)` con `disegna(m, selezione, {catalogo, legame, tabella})` che ritrova il fuoco per nome.
- `static/vincoli.js:5` `GRADI`, `:12` `PREIMPOSTAZIONI` (incastro, cerniera, carrello…), `:25` `nomePreimpostazione(vincolo)`, `:35` `descrizione(vincolo)` («incastro», «libero (dichiarato)», …). `static/comandi.js:169` `impostaVincolo(m, {id, vincolo})` (marca `origine.modificata`).
- `static/albero.js:23-84` `disegna`: `gruppo(nome, quante)` salta i gruppi vuoti; le voci `{tipo, id, testo}`; il ramo «Combinazioni» a `:73` è l'ultimo; `vuoto.hidden` a `:84`.
- `static/piano.js:15` `RAGGIO`, `:19` `OFFSET_ETICHETTA`, `:46` `estensione(m, ghost)` (solo nodi e ghost), `:83` `creaPiano`, `:123` `disegna(m, {selezione, ghost, azioneInVista})`; i nodi si disegnano dopo le aste e prima delle frecce (11c); **nessun simbolo di vincolo esiste oggi** nel piano.
- `static/modo.js:64` `esitoScelta(modo, tipo)`: in modo asta rifiuta ogni tipo che non sia `nodo` con una frase generica — una voce «rilievo» cliccata cade lì senza modifiche.
- DOM finti dei test: `test/file.test.js:11-37` (`elementoFinto`, `radiceFinta()` con `querySelector` da una mappa di selettori), `test/pannello.test.js:38` `tutti`, `:175` `AZIONI`, `:181` `pannelloFinto`, `:845` `CASI_EDITOR` (il ciclo WCAG 2.5.3); `test/albero.test.js:33` `alberoFinto`; `test/piano.test.js:152` `pianoFinto`.
- `CONTEXT.md:111-115` «Origine» (l'editing non la cancella: la marca), `:294-301` «Importatore» («prende quello che c'è, anche nulla, elenca le regioni scartate con il controllo che le ha bocciate, propone i vincoli dalla geometria e dice cosa manca»), `:303-308` «Prior geometrico».

## Quattro decisioni prese qui, non da scoprire in browser

1. **Il rendiconto è un pannello, non una schermata** (brief §5.4). Vive nell'ispettore, come ogni altra cosa selezionata: dopo l'importazione la selezione è `{tipo: "rilievo", id: 0}`, l'albero porta un ramo «Rilievo» con quella voce sola, e cliccarla riporta al rendiconto. Niente finestra che blocca (P2), niente terza colonna.
2. **Il caso principale è il rifiuto, e il rendiconto è disegnato al contrario** (brief §3): la prima sezione è «scartate» (una riga per controllo, con valore **e** soglia **e** unità, e la spiegazione sotto), poi «mancano», poi le giunzioni, poi le proposte. Il modello vuoto non è un errore: la Storia dice «importato 12_wall.json: nessuna membratura, 8 regioni scartate».
3. **Le proposte si confermano, non si applicano**: nel piano i vincoli proposti sono simboli **tratteggiati** ai nodi (il ghost della 11a, nella sua forma), quelli dichiarati sono pieni; il rendiconto ha «conferma» per nodo e «conferma tutte»; l'ispettore del nodo dice «vincolo proposto dal rilievo: incastro» col suo «conferma». Confermare passa da `impostaVincolo`: una voce nella Storia per proposta («vincolo del nodo 22 dal rilievo»), `⌘Z` la disfa. Una proposta su un nodo che ha già un vincolo dichiarato non si mostra più.
4. **Importare sostituisce il modello aperto come «apri»** (nessuna conferma: la Storia ricomincia con la riga «importato …», e il file resta com'era su disco); il percorso importato **non** entra nei recenti (sono modelli `.nova.json`) e **non resta nel campo** (il campo è la destinazione di «salva», e un `.nova.json` sopra il prior sarebbe una perdita: `file.importa` lo svuota, il percorso del prior sta nel rendiconto), quindi «salva» chiede un percorso nuovo come per un modello mai salvato.

## Annotazione dell'architect (09/09/2026)

Scritta nel worktree `/Users/mario/GitHub/NOVA-wt/interfaccia-11d`, ramo
`feat/interfaccia-11d-importatore`, HEAD **`5333e1d`** (`a8905d1`, che il brief chiamava HEAD, è il
**padre**: `chore: graphify ignora static/vendor` su `main` — la riga 15 del piano, «da `main` a
`a8905d1`», è giusta). Ogni riga `file:riga` citata dal piano è stata aperta: la sezione 3 elenca
quelle che non combaciano. Punti di partenza rimisurati qui: `node --test test/*.test.js` da
`static/` → **570 pass, 0 fail**; `pytest tests` → **695 passed, 3 skipped** (698 raccolti). Le tre
fixture rimisurate con `importa()` diretto: i numeri della riga 42 combaciano tutti, `prior_vuoto`
**0 materiali** compresi.

### 1. Chi esegue, con quale modello, in quale ordine

| task | subagente | modello | skill-gate | gruppo | comincia dopo |
|---|---|---|---|---|---|
| 1 — `rilievo.js` | `frontend-engineer` | `opus` | **sì** | A | — |
| 2 — `file.js`, `tastiera.js`, il bottone | `frontend-engineer` | `sonnet` | **sì**, `impeccable` in modo **Operate** | A | — |
| 3 — `albero.js` | `frontend-engineer` | `sonnet` | **sì**, `impeccable` in modo **Operate** | B | 1 |
| 4 — `piano.js` | `frontend-engineer` | `opus` | **sì**, `impeccable` in modo **Operate** | A | — |
| 5 — `pannello.js`, `stile.css` | `frontend-engineer` | `opus` | **sì**, `impeccable` in modo **Operate** | B | 1 |
| 6 — `app.js` | `frontend-engineer` | `opus` | **sì** | C | 1, 2, 3, 4, 5 |
| 7 — la verifica | **il controller**, a mano, col browser | — | — | D | 6 |

Gruppi paralleli: **A** = 1 ‖ 2 ‖ 4; **B** = 3 ‖ 5; **C** = 6; **D** = 7. **Quattro giri invece di
sette.**

Il Task 1 resta `opus` benché il codice sia scritto per intero nel piano: è il modulo che cinque task
importano, e i suoi testi sono asseriti alla lettera a valle — un carattere diverso e tre suite vanno
rosse insieme. Il Task 2 va `sonnet` perché le tre modifiche sono scritte per intero (una funzione,
una riga di `TASTI`, una di `CON_COMANDO`, un `<button>`), ma il gate resta **sì**: il bottone e il
suo stato «importazione…» sono superficie che una persona guarda.

`impeccable`: mai «cream palette» — la palette è quella dei Global Constraints (riga 21). Il rosso
del filetto `.scartata` è `--rosso`, non testo rosso.

**Nessun implementer in parallelo sullo stesso file.** Verificato file per file: nessun file è scritto
da due task.

| file | unico task che lo scrive |
|---|---|
| `static/rilievo.js`, `static/test/rilievo.test.js` | 1 |
| `static/file.js`, `static/test/file.test.js`, `static/tastiera.js`, `static/test/tastiera.test.js`, `static/index.html` | 2 |
| `static/albero.js`, `static/test/albero.test.js` | 3 |
| `static/piano.js`, `static/test/piano.test.js` | 4 |
| `static/pannello.js`, `static/test/pannello.test.js`, `static/stile.css` | 5 |
| `static/app.js` | 6 |

A differenza della 11c **non c'è un file condiviso**: `stile.css` lo tocca solo il Task 5,
`index.html` solo il Task 2. Ogni arco di sequenza qui sotto è di codice, nessuno è di merge.

### 2. Le dipendenze vere, un arco per riga

Il piano lascia intendere una catena 1 → 2 → 3 → 4 → 5 → 6. Aperti i file, **due archi non
esistono**: il Task 2 e il Task 4 non toccano `rilievo.js`, né nel codice né nei test.

- **1 ← nessuno** — `rilievo.js` importa `cifre, conciso` da `numeri.js` (182 e 195, presenti);
  `rilievo.test.js` importa `creaNodo, impostaVincolo` da `comandi.js` (169) e `modelloVuoto` da
  `modello.js`: tutto già in albero.
- **2 ← nessuno** — `file.js` passa a `suImportazione` la **risposta grezza** del server, non un
  rilievo: nessun import da `rilievo.js`. Il test del Task 2 stubba `fetch` e asserisce sul corpo
  grezzo. `tastiera.js` non conosce il rilievo. `i` è libera in `CON_COMANDO` (`tastiera.js:76`:
  solo `o, s, z, k`), verificato lettera per lettera.
- **4 ← nessuno** — `piano.js` riceve `proposte` come `[{nodo, vincolo}]` letterali; importa `GRADI,
  nomePreimpostazione` da `vincoli.js` (5 e 25) e ha già `nodo` da `modello.js`. Il test importa
  `impostaVincolo` da `comandi.js`. **Nessun arco verso il Task 1.**
- **3 ← 1** — codice **e** test: `albero.js` importa `riassunto`, `albero.test.js` importa
  `daRisposta`.
- **5 ← 1** — codice **e** test: sei funzioni da `rilievo.js`, e `daRisposta` nel test.
- **6 ← 1, 2, 3, 4, 5** — è la cucitura: `daRisposta`, `etichettaStoria`, `proposteAperte`,
  `propostaPerNodo`, `file.importa`, il ramo `importa` di `dispatchVoce`, le tre `disegna` nuove.
- **7 ← 6** — è la prova a mano.

Ciò che il Task 4 e il Task 6 innestano esiste già nello scope dove il piano lo mette, verificato:
in `piano.js` `disegna` (123) hanno `s` (125), `gruppo` (126), `el`, `schermo` (104), `INCHIOSTRO`
(31) e `nodo` importato; i nodi si disegnano a 183 e le frecce dopo 211, quindi «dopo i nodi, prima
delle frecce» è un punto che esiste. In `app.js`: `esegui(fn, etichetta)` (518),
`nuovaCronologia(m, etichetta)` (`cronologia.js:6`, il secondo argomento c'è), `dì` (98),
`percorso`/`impronta` (48), `chiudiComando` (253), e `esiste` (534) che fa
`.some((e) => e.id === s.id)` — quindi `rilievo: rilievo ? [{ id: 0 }] : []` funziona così com'è
scritto.

### 3. I punti dove il piano si rompe

**R1 — il caso `rilievo` in `CASI_EDITOR` fa rosso il test WCAG 2.5.3 che il Task 5 ordina di
estendere.** Il Task 5, step 1, prima riga: «a `CASI_EDITOR` (`:845`) il caso `rilievo`». Ma i due
cicli che consumano `CASI_EDITOR` (`pannello.test.js:861` e `:877`) chiamano
`p.disegna(m, selezione, { catalogo: null, legame: LEGAME_C25 })` — **opzioni fisse, senza
`rilievo`**. Con `CERCA.rilievo = (m, id, opzioni) => opzioni?.rilievo ?? null` l'entità è `null`,
l'editor non si disegna, e il primo ciclo muore sulla riga
`assert.ok(coppie.length > 0, "l'editor ha almeno un campo etichettato")`. E anche passando il
rilievo resterebbe rosso: `nomiDeiCampi` (`:718-726`) costruisce le coppie da un elemento che ha **un
figlio nodo di testo** *e* un figlio con `aria-label` — la forma etichetta + campo. `editorRilievo`
non ha un solo `<input>` né un `<select>`: solo bottoni, che portano testo e `aria-label` sullo
**stesso** elemento e che `nomiDeiCampi` non guarda affatto. `coppie` resta `[]` in ogni caso.
**Rimedio più corto**: lasciare `CASI_EDITOR` com'è e scrivere per `rilievo` un test suo, che legge
i bottoni con `tutti(editor)` e asserisce `_attrs["aria-label"].startsWith(textContent)` — che è poi
la regola vera per un bottone. Il secondo ciclo (nomi unici) va invece esteso volentieri: con 21
proposte i bottoni con `aria-label` in un solo editor diventano 22, ed è lì che un nome ripetuto
farebbe danno (`creaPannello` ritrova il fuoco per nome).

**R2 — il Task 7 pretende in browser un testo che il Task 1 non produce.** Step 2: ««1,1872 contro
soglia 0,1 frazione»». Il valore vero della prima scartata di `prior_vuoto` è
`1.1872108072168421`, e `righeScartate` lo stampa con `conciso`, che sotto 100 tiene **due**
decimali: misurato qui, `conciso(1.1872108072168421)` è **«1,19»**. Il test del Task 1 (riga 142)
asserisce giustamente `"1,19 contro soglia 0,1 frazione"`. Chi esegue la verifica a mano leggendo lo
step 2 troverà «1,19», crederà a un difetto e andrà a cercarlo. **La riga sbagliata è quella del Task
7**, non il contratto: si corregge in «1,19 contro soglia 0,1 frazione». (Misurati insieme, per lo
stesso step: `cifre(4215879)` = «4 215 879» con U+202F, `conciso(27.173303579686976)` = «27,17»,
`conciso(153.6026707628659)` = «154», `conciso(0.1)` = «0,1».)

**R3 — la decisione 4 e il codice del Task 2 dicono il contrario sullo stesso campo.** La decisione
4 (riga 61): «il percorso importato **non** entra nei recenti … **ma va nel campo**». Il Task 2, che
la implementa, scrive `campo.value = ""` con il commento «il campo è la destinazione di «salva»: un
`.nova.json` sopra il prior sarebbe una perdita», e il suo ingresso degenere lo asserisce
(`campo.value === ""`). Il Task 6, nelle sue *Interfaces*, sta con la decisione («`⌘S` chiede il
percorso dal campo, **che porta il prior**») e, otto righe sotto, nei suoi *Ingressi degeneri*, sta
col Task 2 («il campo è stato svuotato da `file.importa`»). Il Task 7 sta col Task 2 in due punti
(step 2 «Il campo è vuoto», step 5 «`⌘S` senza percorso → "scrivi il percorso dove salvare"»).

**Non lo risolvo qui: è una delle quattro decisioni, e la decide chi le ha prese.** Ma va risolto
**prima** del dispatch del Task 2, non in browser, perché sono due prodotti diversi: o `⌘S` propone
di salvare sopra il `12_wall.json` del rilievo (campo pieno, la perdita è a un tasto di distanza),
o chiede dove (campo vuoto, e il percorso del prior vive solo nel rendiconto). Quattro voci del piano
su cinque stanno con il campo vuoto; se è quella la scelta, **la riga da correggere è la decisione 4**
— «va nel campo» diventa «resta nel rendiconto, non nel campo».

**Sette righe di puntamento che non combaciano.** Nessuna cambia *cosa* fare; la 5 cambia un numero
che il Task 7 deve dichiarare a fine giornata.

1. `nova/sidecar.py`: `comando_importa` sta a **96-125**, non `:95-127` (riga 40 e riga 11). Il
   contratto restituito è esattamente quello descritto.
2. `nova/importa.py`: `_scartate` finisce a **128**, non 129; `importa` finisce a **267**, non 268.
   I due `def` (117 e 202) e `class Importato` (56) combaciano.
3. `static/numeri.js`: `millimetri` sta a **171**, non `:167` (riga 20) — 167 è dentro
   `stampaNumero`. `cifre` 182 e `conciso` 195 combaciano.
4. `tests/test_server.py`: i quattro test di contratto stanno a **485-523**, non `:485-521`. Il
   `:496-511` dei due 400 (riga 39) è **esatto**.
5. **Il punto di partenza pytest non è 698 «pass»**: misurato qui è **695 passed, 3 skipped**, 698
   raccolti (riga 32 e Task 7 step 9). Chi chiude la giornata deve confrontare `695 passed, 3
   skipped`, altrimenti dichiarerà una regressione che non c'è.
6. Task 1, *Interfaces*: «Consumes: `cifre`, `conciso`, `millimetri` (`numeri.js`), `descrizione`
   (`vincoli.js:35`)». Il codice del Task 1, otto righe sotto, importa **solo `cifre, conciso`** — e
   fa bene: i millimetri li scrive `num()` a mano, `descrizione` la chiama `pannello.js`.
   `vincoli.js:35` è `descrizione` e c'è; l'arco `1 ← vincoli.js` non c'è.
7. `static/index.html:11-27` per la sezione `#file` e `:28` per `<nav id="albero">` sono **esatti**
   (`</section>` a 27); il `:16-19` del Task 2 per `.file-azioni` pure.

**Combaciano invece**, verificate in questa sessione e non da rileggere: `nova/server.py`
`ImportaReq` 135-136 e la rotta 199-204; `nova/modello.py` `NOTA_TUTTI_AL_PIEDE` **600** e
`proposte_vincoli` **603-618** («da proporre e non da applicare», nessuna proposta quando ogni nodo
cadrebbe al piede); `nova/importa.py` `_materiali_di_default` **171-176** con
`nota: "assunta: il rilievo non dice la classe"`; `static/file.js` `chiediJson` 24, `testoStato` 46,
`creaFile` 63-179, `apri` 117-136 (con `if (inCorso) return occupato();` a 118: la forma che il Task
2 copia esiste), `salva` 138-160, il listener di `#file-apri` 165, `disegna` 167, il ritorno 179;
`static/tastiera.js` `TASTI` 14 con `apri` a **21** nella forma esatta dello stampo, `CON_COMANDO`
**76**; `static/pannello.js` `CERCA` 15, `testoOrigine` **26** (sorgente + «modificata», **senza
riferimento e senza nota**: il Task 5 li aggiunge entrambi), `righeDiNodo` 28, `righeDiAsta` 42,
`righeDiSezione` 59, `righeDiMateriale` 71, `RIGHE` 95, `righe(m, selezione)` **102 a due
argomenti**, `entitaSelezionata(m, selezione)` **20 a due argomenti** (è quella che va adattata a
ricevere le opzioni), `campoNumero` 174, `scelta` 194, `gruppo` 208, `bottone` 220, `editorVincolo`
242, `EDITORI` 647, `creaPannello` 650, e `descrizione` **già importata** in testa (riga 12);
`static/albero.js` `creaAlbero` 8, `disegna` 23, «Combinazioni» 73, `vuoto.hidden = righe.length > 0`
**84** — copre già il caso «solo rilievo, modello vuoto» senza toccarlo; `static/piano.js` `RAGGIO`
15, `OFFSET_ETICHETTA` 19, `estensione` 46, `creaPiano` 83, `disegna` 123, e **nessun simbolo di
vincolo** oggi; `static/vincoli.js` `GRADI` 5, `PREIMPOSTAZIONI` 12, `nomePreimpostazione` 25,
`descrizione` 35; `static/comandi.js:169` `impostaVincolo`; `static/modo.js` `esitoScelta` 64,
`ghostDelComando` 126; `static/app.js` `selezione` 30, `azioneCorrente` 43, `scegli` 105, i tre
`crea*` 122-124, `creaFile` 170-181, `apriModo` 214, `ridisegna` 530 con `esiste` 534 e
`piano.disegna` 558, `eseguiVoce` 619, `dispatchVoce` 628, il ramo `apri` 649, il ramo `vincolo` 711;
i DOM finti `test/file.test.js` `elementoFinto` 11 e `radiceFinta` 29, `test/pannello.test.js`
`tutti` 38, `AZIONI` 175, `pannelloFinto` 181, `CASI_EDITOR` 845, `test/albero.test.js:33`,
`test/piano.test.js:152`; `static/stile.css` 219-245 per l'area file, `.file-azioni button` 229.

**Le tre fixture, rimisurate** (`importa()` diretto, 09/09, worktree `interfaccia-11d`):
`prior_vuoto` → 0 nodi, 0 aste, 0 sezioni, **0 materiali**, **14** righe di scartate,
`resoconto.scartate = 8`, `mancano = []`, prima riga `{regione: 0, punti: 4215879, controllo:
"costanza_sezione", valore: 1.1872108072168421, soglia: 0.1, unita: "frazione"}`; `prior_parziale`
→ 42 nodi, 40 aste, 40 sezioni, 2 materiali, **2** scartate (`unita: "-"`, «sintetico: scartata a
mano per il test»), 0 proposte, `nota_vincoli` presente, `resoconto.membrature = 2`, `mancano` a tre;
`prior_sintetico` → 80/80/80, 0 scartate, **4** giunzioni (`nodo: 41`, `scostamento_nodo:
27.173303579686976`, `distanza_proiezione: 153.6026707628659`), **21** proposte, `mancano` a tre. La
riga 42 del piano combacia in tutto.

### 4. Gli ingressi degeneri: cosa c'è e cosa manca

Sei task su sette scrivono codice e tutti e sei hanno la sezione, tutti sopra il minimo di due righe
con condizione **e** oracolo: Task 1 sette, Task 2 sette, Task 3 quattro, Task 4 cinque, Task 5 sei,
Task 6 otto. **Il Task 7 non scrive codice** (`Files: nessuno`) e porta già la forma rigida,
`- nessun ingresso esterno`: non va toccato.

Due righe portano condizione e oracolo ma **non la freccia `→`**, ed è la prima cosa che si perde nel
passaggio al brief. Riscritte qui, senza toccare gli step:

- Task 4 — `la stessa disegna con e senza proposte → attributo viewBox identico (le proposte non entrano in estensione)`
- Task 5 — `ogni bottone dei due editor toccati → aria-label che comincia dal testo visibile, e unico dentro l'editor anche con 21 proposte`

Tre condizioni che le fixture rendono obbligatorie e che nessun task enumera — da aggiungere alla
sezione del task indicato, non da scoprire in browser:

- Task 1 — `daRisposta sul prior_parziale (membrature 2, mancano a tre, nota_vincoli presente, zero proposte) → riassunto «12_wall.json · 2 membrature → 40 aste, 42 nodi · 2 scartate · mancano: armature, classe, vincoli»`
- Task 5 — `resoconto con membrature > 0 e nota_vincoli insieme → la riga «nota» c'è e il gruppo «vincoli proposti» mostra la nota, non «nessuna proposta aperta»` (è esattamente `prior_parziale`, la fixture dello step 3 del Task 7)
- Task 6 — `importare un prior con 0 materiali (prior_vuoto) → l'albero non ha il ramo «Materiali», l'ispettore non solleva, «mancano» resta vuoto` (misurato: `prior_vuoto` importa **zero** materiali, non i due di default)

**Per chi dispaccia**: qui la sezione è `**Ingressi degeneri:**` in grassetto, ma l'hook
`dispatch-gate.py` pretende nel brief il **titolo** `## Ingressi degeneri`. Si copia il contenuto
sotto un titolo, non il grassetto.

### 5. La ricerca che regge ogni task

Aperto `docs/ricerca/index.md` prima di annotare: la **05** è alla riga **17**, la **07** alla riga
**19**, come dice il piano. La tabella dei dieci principi di `07` mappa così, verificata riga per
riga: 148 = P1, 149 = P2, 150 = P3, 151 = P4, 152 = P5, 153 = P6, 154 = P7, 155 = P8, 156 = P9,
157 = P10 — la stessa mappa dell'annotazione 11c.

| task | riferimento | perché conta qui |
|---|---|---|
| 1 | `docs/ricerca/07-ux-modellatore.md:148` | P1, ogni numero col suo contraddittore: `righeScartate` stampa valore **e** soglia **e** unità, mai il solo verdetto |
| 1 (una fetta = un'asta) | `docs/ricerca/05-archeologia-linea-integrata.md:150-151` | `telaio.py` «non misura niente», decisioni #134/#142/#143: il rendiconto stampa ciò che il rilievo ha misurato, non lo interpreta |
| 2 | `docs/ricerca/07-ux-modellatore.md:152` | P5, attesa parlante mai percentuale inventata: «importazione…» sul bottone, `disabled`, e l'errore col motivo del server |
| 3 | `docs/ricerca/07-ux-modellatore.md:155` | P8, divulgazione progressiva: il ramo «Rilievo» compare solo dopo un'importazione, i gruppi vuoti non compaiono |
| 4 | `docs/ricerca/07-ux-modellatore.md:151` | P4, anteprima prima del commit: il tratteggio **è** l'anteprima, il pieno è il commit |
| 5 | `docs/ricerca/07-ux-modellatore.md:149` | P2, seleziona poi agisci, nessuna finestra che blocca: il rendiconto è un pannello nell'ispettore (decisione 1) |
| 5 (la lista) | `docs/ricerca/05-archeologia-linea-integrata.md:176` | la linea rimossa mostrava «membrature del prior, sezione dichiarata, stazioni con verdetto, riempimento con soglia, giunzioni»: è la stessa lista, ridotta a ciò che il modello NOVA porta |
| 6 | `docs/ricerca/07-ux-modellatore.md:151` | P4, undo illimitato e **visibile**: una voce di Storia per proposta confermata, `⌘Z` la disfa |
| 7 | `docs/ricerca/05-archeologia-linea-integrata.md:176` | la prova a mano verifica proprio quella lista, sulle tre fixture e sul rilievo vero |

**Sette task su sette con un riferimento, nessun «nessuno».** Come la 11c, e all'opposto della misura
dell'08/09 (nove ricerche, un piano che ne cita una una volta): le due ricerche dichiarate in testa
tornano entrambe con righe interne, non con la riga d'indice.

### 6. I debiti, per il ticket di chiusura

Dichiarati dal piano stesso («Fuori da questa seduta», in coda): il Check Model in interfaccia (12),
il rendiconto persistito, le sezioni senza armatura, la giunzione come entità del modello, un simbolo
diverso per cerniera e carrello, il prior dal corpo della richiesta, il nit della 11a sul fuoco.

Visti qui, e non scritti da nessuna parte:

1. **Il Task 6 non ha un solo test automatico.** Otto ingressi degeneri, sei callback, `esiste` a
   sette vie, tre `disegna` con opzioni nuove, un ramo in `dispatchVoce` — l'unico oracolo è la prova
   a mano del Task 7. **È la terza giornata di fila**: stesso debito della voce 8 dell'11b e della
   voce 3 dell'11c, mai pagato. Il task più cucito è ancora il meno protetto, e non è più un caso
   isolato ma la forma del piano.
2. **`prior_vuoto` importa zero materiali, e nessun task lo mette a contratto.** Misurato: 0, non i
   due di default — `_materiali_di_default` non entra senza membrature. È il **caso principale della
   giornata** (riga 5 del piano), e il modello che ne esce non ha materiali, non ha sezioni, e
   `mancano` è vuoto: l'interfaccia non ha una sola riga che dica all'utente «da qui non si riparte».
   Il rendiconto racconta il rifiuto; il modello accanto è muto.
3. **⌘Z rimette i tratteggi per caso, non per patto.** `proposteAperte` ricalcola dal modello a ogni
   `ridisegna`, quindi disfare una conferma fa ricomparire la proposta. Funziona finché nessuno
   consuma `rilievo.proposte`; il giorno che una conferma togliesse la proposta dallo stato, `⌘Z` non
   la riporterebbe e nessun test se ne accorgerebbe — il rilievo, per scelta, è fuori dalla
   cronologia.
4. **Metà del rendiconto è già persistita, l'altra metà no.** Il piano dichiara «il rendiconto vale
   per questa sessione», ma il modello salvato porta `origine.riferimento: "12_wall.json"` e le note
   («riempimento 1.00», «dispersione …», «assunta: la classe») su ogni nodo, asta, sezione e
   materiale: riaprendo, l'ispettore le mostra ancora. Scartate, giunzioni e proposte spariscono.
   L'asimmetria non è dichiarata da nessuna parte, e all'utente sembrerà arbitraria.
5. **Il ciclo WCAG 2.5.3 non guarda i bottoni.** `nomiDeiCampi` (`pannello.test.js:718-726`) coppia
   un nodo di testo con un figlio che ha `aria-label`: la forma etichetta + campo, e nient'altro. Ogni
   bottone con `aria-label` diverso dal testo visibile passa non visto, oggi e da prima della 11d.
   Con questa giornata i bottoni con `aria-label` in un solo editor arrivano a 22.
6. **Il percorso del prior non vive in nessun posto riusabile** (se R3 si chiude sul campo vuoto).
   Fuori dai recenti per decisione, svuotato dal campo dal Task 2: resta solo in `rilievo.percorso` e
   nella riga «file» del rendiconto, che muoiono con la sessione. Reimportare lo stesso prior è
   riscriverlo a mano ogni volta. Il costo non è scritto da nessuna parte: manca un secondo posto,
   non un secondo campo.

**Per il roster** (segnalazione di meta-roster, non scope di questo piano): il debito 1 è alla terza
occorrenza consecutiva. Il ruolo che scrive la cucitura non ha oggi un modo di provarla che non sia
un browser e una persona; è il tipo di buco che vale la pena guardare con `self-improving-agent`
prima della giornata 12, non dopo.

## Struttura dei file

| file | responsabilità | puro |
|---|---|---|
| `static/rilievo.js` | `daRisposta`, `righeScartate`, `giunzioneDelNodo`, `propostaPerNodo`, `proposteAperte`, `riassunto`, `etichettaStoria`, `testoMancano` | sì |
| `static/file.js` | `importa(percorso)` → `POST /api/importa`, `suImportazione`; bottone `#file-importa` | no |
| `static/tastiera.js` | `⌘I` importa | sì |
| `static/albero.js` | ramo «Rilievo» con una voce | no |
| `static/pannello.js` | `righeDiRilievo`, `editorRilievo`; `testoOrigine` con la nota; giunzione e proposta nelle righe/editor del nodo; tabelle a sette vie | no |
| `static/piano.js` | simboli dei vincoli: pieni per i dichiarati, tratteggiati per le proposte | no |
| `static/app.js` | stato `rilievo`, `suImportazione`, `esiste` a sette vie, i callback di conferma, `⌘I` | no |
| `static/index.html`, `static/stile.css` | `#file-importa`; stile del rendiconto (`.rendiconto`, `.scartata`) | — |

---

### Task 1: `rilievo.js` — lo stato del rendiconto e i suoi testi

**Files:**
- Create: `static/rilievo.js`, `static/test/rilievo.test.js`

**Interfaces:**
- Consumes: `cifre`, `conciso` (`numeri.js:182-195`).
- Produces (tutto esportato):
  - `daRisposta(risposta, percorso) → rilievo`: `{percorso, nome, resoconto, scartate, giunzioni, proposte, mancano}` con `nome` = ultimo segmento del percorso; liste sempre presenti (`?? []`), `resoconto` sempre oggetto. `risposta` è il corpo di `/api/importa`.
  - `righeScartate(rilievo) → [{titolo, valore, spiegazione}]` — una riga per elemento di `scartate`: `titolo = «regione ${regione} · ${cifre(punti)} punti · ${controllo}»`, `valore = «${conciso(valore)} contro soglia ${conciso(soglia)}${unita && unita !== "-" ? " " + unita : ""}»`, `spiegazione` com'è (o «—»).
  - `giunzioneDelNodo(rilievo, idNodo) → giunzione | null`.
  - `propostaPerNodo(rilievo, idNodo) → vincolo | null`.
  - `proposteAperte(rilievo, m) → [{nodo, vincolo}]` — le proposte il cui nodo esiste in `m` e ha `vincolo` **non dichiarato** (`null`/assente: `nova/modello.py`, «una scelta dell'utente, non una dimenticanza»).
  - `riassunto(rilievo) → string` — «‹nome› · ‹membrature› membrature → ‹aste› aste, ‹nodi› nodi · ‹scartate› scartate · mancano: armature, classe, vincoli» (senza «mancano» se la lista è vuota; «nessuna membratura» se `membrature === 0`).
  - `etichettaStoria(rilievo) → string` — «importato ‹nome›: ‹aste› aste, ‹scartate› regioni scartate» oppure «importato ‹nome›: nessuna membratura, ‹scartate› regioni scartate».
  - `testoMancano(mancano) → string` — «armature, classe, vincoli» o «niente: il rilievo ha dato tutto» (lista vuota **con** membrature) — il chiamante decide quando mostrarla.
  - `testoGiunzione(g) → string` — «nodo ‹nodo› · scostamento ‹mm› mm · proiezione ‹mm› mm · membratura ‹cede› cede a ‹resta›».

**Ingressi degeneri:**
- `daRisposta({}, "x/12_wall.json")` → liste vuote, `resoconto: {}`, `nome: "12_wall.json"`; `daRisposta(null, "")` → lo stesso con `nome: ""`
- `righeScartate` con `valore: null` o `soglia: null` → «—» al posto del numero, nessuna eccezione; `unita: "-"` → nessuna unità stampata; `unita: "frazione"` → « frazione»
- `righeScartate` con `punti: 4215879` → «4 215 879 punti» (migliaia con U+202F, `cifre`)
- `proposteAperte` con un nodo sparito dal modello → esclusa; con un nodo che ha `vincolo: {ux: false, …}` (libero **dichiarato**) → esclusa (dichiarato è dichiarato); con `vincolo: null` → inclusa
- `riassunto` con `resoconto` vuoto → «‹nome› · nessuna membratura · 0 scartate»
- `etichettaStoria` col prior vuoto (0 aste, 8 scartate) → «importato 12_wall.json: nessuna membratura, 8 regioni scartate»
- `testoGiunzione` con `scostamento_nodo: 27.1733` → «27,17 mm» (`conciso`: due decimali sotto 100, zeri in coda tolti); `distanza_proiezione: 153.6` → «154 mm» (sopra 100 niente decimali: è la regola di `cifre`, `numeri.js:182-195`)

- [ ] **Step 1: Test** — `static/test/rilievo.test.js`, un `test` per riga:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { daRisposta, righeScartate, giunzioneDelNodo, propostaPerNodo, proposteAperte, riassunto,
         etichettaStoria, testoMancano, testoGiunzione } from "../rilievo.js";
import { cifre } from "../numeri.js";
import { creaNodo, impostaVincolo } from "../comandi.js";
import { modelloVuoto } from "../modello.js";

const vuoto = () => daRisposta({
  esito: "ok", modello: {}, scartate: [
    { regione: 0, punti: 4215879, controllo: "costanza_sezione", valore: 1.1872, soglia: 0.1, unita: "frazione", spiegazione: "dispersione relativa della sezione lungo l'asse" },
    { regione: 0, punti: 4215879, controllo: "copertura_faccia", valore: null, soglia: 0.5, unita: "-", spiegazione: null },
  ], giunzioni: [], proposte_vincoli: [], mancano: [],
  resoconto: { membrature: 0, aste: 0, nodi: 0, scartate: 8, giunzioni_scartate: 0 },
}, "/Users/mario/GitHub/NOVA/lab_telaio_v2/12_wall.json");

const sintetico = () => daRisposta({
  esito: "ok", modello: {}, scartate: [],
  giunzioni: [{ nodo: 41, scostamento_nodo: 27.1733, distanza_proiezione: 153.6, cede: 2, resta: 1 }],
  proposte_vincoli: [{ nodo: 1, vincolo: { ux: true, uy: true, uz: true, rx: true, ry: true, rz: true } },
                     { nodo: 2, vincolo: { ux: true, uy: true, uz: true, rx: true, ry: true, rz: true } }],
  mancano: ["armature", "classe", "vincoli"],
  resoconto: { membrature: 4, aste: 80, nodi: 80, scartate: 0, giunzioni_scartate: 0 },
}, "tests/fixture/prior_sintetico/12_wall.json");

test("daRisposta: liste sempre presenti, il nome è l'ultimo segmento", () => {
  assert.equal(vuoto().nome, "12_wall.json");
  const r = daRisposta({}, "x/12_wall.json");
  assert.deepEqual([r.scartate, r.giunzioni, r.proposte, r.mancano, r.resoconto], [[], [], [], [], {}]);
  assert.equal(daRisposta(null, "").nome, "");
});
test("righeScartate: valore contro soglia con l'unità, migliaia sui punti, trattino dove manca", () => {
  const [a, b] = righeScartate(vuoto());
  assert.equal(a.titolo, `regione 0 · ${cifre(4215879)} punti · costanza_sezione`);
  assert.equal(a.valore, "1,19 contro soglia 0,1 frazione");  // `cifre` sotto 100 tiene due decimali
  assert.equal(a.spiegazione, "dispersione relativa della sezione lungo l'asse");
  assert.equal(b.valore, "— contro soglia 0,5");
  assert.equal(b.spiegazione, "—");
});
test("giunzione e proposta per nodo, null se non ci sono", () => {
  assert.equal(giunzioneDelNodo(sintetico(), 41).cede, 2);
  assert.equal(giunzioneDelNodo(sintetico(), 7), null);
  assert.equal(propostaPerNodo(sintetico(), 1).ux, true);
  assert.equal(propostaPerNodo(sintetico(), 9), null);
});
test("proposteAperte: solo i nodi che esistono e non hanno un vincolo dichiarato", () => {
  let m = creaNodo(creaNodo(modelloVuoto(), { x: 0, z: 0 }), { x: 1000, z: 0 });
  assert.deepEqual(proposteAperte(sintetico(), m).map((p) => p.nodo), [1, 2]);
  m = impostaVincolo(m, { id: 1, vincolo: { ux: false, uy: false, uz: false, rx: false, ry: false, rz: false } });
  assert.deepEqual(proposteAperte(sintetico(), m).map((p) => p.nodo), [2], "libero dichiarato è dichiarato");
  assert.deepEqual(proposteAperte(sintetico(), creaNodo(modelloVuoto(), { x: 0, z: 0 })).map((p) => p.nodo), [1]);
});
test("riassunto ed etichetta della Storia, sul vuoto e sul pieno", () => {
  assert.equal(riassunto(vuoto()), "12_wall.json · nessuna membratura · 8 scartate");
  assert.equal(riassunto(sintetico()), "12_wall.json · 4 membrature → 80 aste, 80 nodi · 0 scartate · mancano: armature, classe, vincoli");
  assert.equal(etichettaStoria(vuoto()), "importato 12_wall.json: nessuna membratura, 8 regioni scartate");
  assert.equal(etichettaStoria(sintetico()), "importato 12_wall.json: 80 aste, 0 regioni scartate");
  assert.equal(riassunto(daRisposta({}, "a.json")), "a.json · nessuna membratura · 0 scartate");
});
test("testoMancano e testoGiunzione", () => {
  assert.equal(testoMancano(["armature", "classe", "vincoli"]), "armature, classe, vincoli");
  assert.equal(testoMancano([]), "niente: il rilievo ha dato tutto");
  // `cifre` sopra 100 non tiene decimali: 153,6 esce «154» (numeri.js:182-195).
  assert.equal(testoGiunzione(sintetico().giunzioni[0]), "nodo 41 · scostamento 27,17 mm · proiezione 154 mm · membratura 2 cede a 1");
});
```

- [ ] **Step 2: Rosso** — `ERR_MODULE_NOT_FOUND`.
- [ ] **Step 3: `rilievo.js`**

```js
// Il rendiconto dell'importazione: ciò che il rilievo ha dato e ciò che ha bocciato, tradotto
// in testi per una persona. Puro. Vive **accanto** al modello, non dentro (spec v1, «Importatore
// dal prior»; brief 2026-09-07 §3): non entra nel file, non entra nella cronologia.

import { cifre, conciso } from "./numeri.js";

const num = (v) => (v === null || v === undefined || !Number.isFinite(v) ? "—" : conciso(v));

/** La risposta di `POST /api/importa` nello stato che l'interfaccia tiene. Liste sempre
 *  presenti: un rendiconto senza `scartate` è un rendiconto con zero scartate, non un errore. */
export function daRisposta(risposta, percorso) {
  const r = risposta ?? {};
  const p = typeof percorso === "string" ? percorso : "";
  return {
    percorso: p,
    nome: p.slice(p.lastIndexOf("/") + 1),
    resoconto: r.resoconto ?? {},
    scartate: r.scartate ?? [],
    giunzioni: r.giunzioni ?? [],
    proposte: r.proposte_vincoli ?? [],
    mancano: r.mancano ?? [],
  };
}

/** Una riga per controllo fallito, com'è nel prior (P1: il valore col suo contraddittore). */
export function righeScartate(rilievo) {
  return rilievo.scartate.map((s) => ({
    titolo: `regione ${s.regione ?? "—"} · ${s.punti == null ? "—" : cifre(s.punti)} punti · ${s.controllo ?? "—"}`,
    valore: `${num(s.valore)} contro soglia ${num(s.soglia)}${s.unita && s.unita !== "-" ? ` ${s.unita}` : ""}`,
    spiegazione: s.spiegazione || "—",
  }));
}

export const giunzioneDelNodo = (rilievo, id) => rilievo.giunzioni.find((g) => g.nodo === id) ?? null;
export const propostaPerNodo = (rilievo, id) => rilievo.proposte.find((p) => p.nodo === id)?.vincolo ?? null;

/** Le proposte ancora da decidere: il nodo esiste e non ha un vincolo **dichiarato** — libero
 *  dichiarato è dichiarato (`nova/modello.py`: «una scelta dell'utente, non una dimenticanza»). */
export function proposteAperte(rilievo, m) {
  return rilievo.proposte.filter((p) => {
    const n = m.nodi.find((k) => k.id === p.nodo);
    return n && (n.vincolo === null || n.vincolo === undefined);
  });
}

export const testoMancano = (mancano) => (mancano.length ? mancano.join(", ") : "niente: il rilievo ha dato tutto");

export function riassunto(rilievo) {
  const r = rilievo.resoconto;
  const corpo = r.membrature ? `${r.membrature} membrature → ${r.aste ?? 0} aste, ${r.nodi ?? 0} nodi` : "nessuna membratura";
  const mancano = rilievo.mancano.length ? ` · mancano: ${rilievo.mancano.join(", ")}` : "";
  return `${rilievo.nome} · ${corpo} · ${r.scartate ?? 0} scartate${mancano}`;
}

export function etichettaStoria(rilievo) {
  const r = rilievo.resoconto;
  const corpo = r.membrature ? `${r.aste ?? 0} aste` : "nessuna membratura";
  return `importato ${rilievo.nome}: ${corpo}, ${r.scartate ?? 0} regioni scartate`;
}

export const testoGiunzione = (g) =>
  `nodo ${g.nodo} · scostamento ${num(g.scostamento_nodo)} mm · proiezione ${num(g.distanza_proiezione)} mm · membratura ${g.cede} cede a ${g.resta}`;
```

- [ ] **Step 4: Verde; commit** — `feat(rilievo): lo stato del rendiconto dell'importazione e i suoi testi`

---

### Task 2: `file.js` e `tastiera.js` — il terzo verbo, «importa», e `⌘I`

**Files:**
- Modify: `static/file.js:63-179` (`importa`, il listener di `#file-importa`, il ritorno), `static/index.html:16-19` (il bottone), `static/tastiera.js:14-41,76` (la voce e la mappa)
- Test: `static/test/file.test.js`, `static/test/tastiera.test.js`

**Interfaces:**
- Produces:
  - `creaFile(radice, {suApertura, suSalvataggio, suImportazione, suErrore, deposito})`: `suImportazione(percorso, modello, risposta)` con la risposta intera di `/api/importa`.
  - `importa(percorso?)`: come `apri` — `inCorso`, campo vuoto → «scrivi il percorso di un 12_wall.json», `POST /api/importa {percorso}`, a successo **`campo.value = ""`** (il campo è la destinazione del prossimo «salva», e un `.nova.json` scritto sopra il prior sarebbe una perdita: il percorso del prior resta nel rendiconto), `salvato = null` (un modello importato non è mai su disco), **niente** `ricorda(p)` (decisione 4), `suImportazione(p, modello, risposta)`; a errore `suErrore(e.message)` e il campo resta com'era. Mentre gira, `#file-importa` ha `disabled` e testo «importazione…» (P5), poi torna «importa».
  - Il ritorno di `creaFile` porta anche `importa`.
  - `<button id="file-importa" type="button">importa</button>` dopo «salva», con `title="il prior 12_wall.json di MeshRec"`.
  - Voce `{codice: "importa", tasto: "⌘I", etichetta: "importa", aiuto: "il 12_wall.json scritto nel campo", contesto: "salvo-ghost", modificatore: "comando"}` dopo `salva`; `CON_COMANDO` con `["i", "importa"]`.

**Ingressi degeneri:**
- `importa()` con il campo vuoto → `suErrore("scrivi il percorso di un 12_wall.json")`, nessuna richiesta
- `importa()` con una richiesta già in corso → «un'operazione sul file è già in corso», nessuna seconda richiesta
- il server risponde 400 `{fase: "importa", motivo}` → `suErrore(motivo)`, `suImportazione` **non** chiamata, il campo resta com'era, il bottone torna «importa»
- il server non risponde → `suErrore("il server non risponde")`
- successo → `suImportazione(p, modello, risposta)` una volta sola, `salvato === null`, recenti invariati, `campo.value === ""` (svuotato: la destinazione di «salva» non è il prior)
- `voceDaEvento({key: "i", metaKey: true})` → `importa`; `{key: "i"}` nudo → `null` (nessun comando su `i`)
- `vociDellaBarra("sempre")` → contiene `importa`; `vociDellaBarra("comando")` → ancora `[conferma, annulla]`

- [ ] **Step 1: Test** — in `file.test.js`, con `radiceFinta()` (`:29-37`) e uno stub di `fetch` come i test di `apri` già presenti (leggi come fanno a `:179-200`):

```js
test("importa: campo vuoto, richiesta in corso, 400 e successo", async () => {
  const radice = radiceFinta();
  const chiamate = { imp: [], err: [] };
  const f = creaFile(radice, { suApertura() {}, suSalvataggio() {}, suImportazione: (...a) => chiamate.imp.push(a), suErrore: (m) => chiamate.err.push(m) });
  await f.importa("");
  assert.deepEqual(chiamate.err, ["scrivi il percorso di un 12_wall.json"]);
  globalThis.fetch = async () => ({ ok: false, status: 400, json: async () => ({ fase: "importa", motivo: "il prior non porta la chiave `terna`" }) });
  await f.importa("/x/12_wall.json");
  assert.equal(chiamate.err.at(-1), "il prior non porta la chiave `terna`");
  assert.equal(chiamate.imp.length, 0);
  const risposta = { esito: "ok", modello: { nodi: [] }, scartate: [], giunzioni: [], proposte_vincoli: [], mancano: [], resoconto: {} };
  globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => risposta });
  await f.importa("/x/12_wall.json");
  assert.equal(chiamate.imp.length, 1);
  assert.equal(chiamate.imp[0][0], "/x/12_wall.json");
  assert.deepEqual(chiamate.imp[0][2], risposta);
  assert.equal(radice.querySelector("#file-percorso").value, "", "il campo è la destinazione di «salva»: non deve puntare al prior");
  assert.equal(radice.querySelector("#file-recenti").hidden, true, "un prior non è un modello recente");
});
```

E in `tastiera.test.js`:

```js
test("⌘I importa, i nuda non fa niente, la voce sta nella barra di sempre", () => {
  assert.equal(voceDaEvento({ key: "i", metaKey: true })?.codice, "importa");
  assert.equal(voceDaEvento({ key: "i" }), null);
  assert.ok(vociDellaBarra("sempre", null).some((v) => v.codice === "importa"));
  assert.deepEqual(vociDellaBarra("comando").map((v) => v.codice), ["conferma", "annulla"]);
});
```

(`radiceFinta` deve conoscere `#file-importa`: aggiungi il selettore alla mappa, con un `elementoFinto()` che ha `disabled` e `textContent`.)

- [ ] **Step 2: Rosso; Step 3:** in `file.js`, dopo `salva`:

```js
  /** Il prior di MeshRec come modello. Come `apri`, con tre differenze dette dal patto: il
   *  percorso non entra nei recenti (sono modelli `.nova.json`), `salvato` resta `null` (un
   *  modello importato non è mai stato su disco: «salva» chiederà dove), e chi chiama riceve
   *  la risposta intera — scartate, giunzioni, proposte, mancano — perché il rendiconto sta
   *  accanto al modello, non dentro. */
  async function importa(percorso) {
    if (inCorso) return occupato();
    const p = (typeof percorso === "string" ? percorso : campo.value).trim();
    if (p === "") return suErrore("scrivi il percorso di un 12_wall.json");
    inCorso = true;
    if (bottoneImporta) { bottoneImporta.disabled = true; bottoneImporta.textContent = "importazione…"; }  // P5
    try {
      const risposta = await chiediJson("/api/importa", { percorso: p });
      campo.value = "";   // il campo è la destinazione di «salva»: un .nova.json sopra il prior sarebbe una perdita
      salvato = null;
      suImportazione(p, risposta.modello, risposta);
    } catch (e) {
      suErrore(e.message);
    } finally {
      inCorso = false;
      if (bottoneImporta) { bottoneImporta.disabled = false; bottoneImporta.textContent = "importa"; }
    }
  }
```

con `const bottoneImporta = radice.querySelector("#file-importa");` in testa a `creaFile`, `bottoneImporta?.addEventListener("click", () => importa());` accanto a quello di `#file-apri`, `suImportazione` fra i parametri, e `importa` nel ritorno. `index.html`: il bottone dopo `#file-salva`. `tastiera.js`: la voce e `["i", "importa"]`.

- [ ] **Step 4: Verde; commit** — `feat(file): importa un prior di MeshRec dall'area file, anche con ⌘I`

---

### Task 3: `albero.js` — il ramo «Rilievo»

**Files:**
- Modify: `static/albero.js:23-84` (`disegna(m, {selezione, rilievo})`)
- Test: `static/test/albero.test.js`

**Interfaces:**
- Consumes: `riassunto(rilievo)` (Task 1).
- Produces: `disegna(m, {selezione = null, rilievo = null})`: con `rilievo` non nullo, **prima** di «Nodi», il gruppo «Rilievo» con una voce `{tipo: "rilievo", id: 0, testo: riassunto(rilievo)}`; senza, niente (P8). La voce è selezionabile come le altre (`data-tipo="rilievo"`, `data-id="0"`, `▸` e `scelto`). Con un rilievo **e** un modello vuoto, `vuoto.hidden` è `true` e l'elenco mostra la sola voce.

**Ingressi degeneri:**
- `disegna(m, {})` → nessun gruppo «Rilievo», stesso albero di prima (i test esistenti restano verdi)
- `disegna(modelloVuoto(), {rilievo})` → l'elenco ha «Rilievo» e la voce, lo stato vuoto «Nessun nodo. Premi N…» è nascosto
- clic sulla voce → `suSelezione("rilievo", 0)`
- `selezione = {tipo: "rilievo", id: 0}` → la voce porta «▸» e la classe `scelto`

- [ ] **Step 1: Test** (con `alberoFinto` a `:33` e `daRisposta` del Task 1):

```js
import { daRisposta } from "../rilievo.js";
const rilievoVuoto = () => daRisposta({ scartate: [{ regione: 0, punti: 1, controllo: "x", valore: 1, soglia: 0.5, unita: "-", spiegazione: "" }], resoconto: { membrature: 0, aste: 0, nodi: 0, scartate: 8 } }, "lab/12_wall.json");

test("con un rilievo l'albero apre col ramo «Rilievo», anche a modello vuoto, e la voce si seleziona", () => {
  const { elenco, vuoto, albero, scelte } = alberoFinto();  // `alberoFinto` a `:33-36` ritorna `{albero, elenco, vuoto, scelte}`
  albero.disegna(modelloVuoto(), { rilievo: rilievoVuoto(), selezione: { tipo: "rilievo", id: 0 } });
  const testi = elenco._figli.map((li) => li.textContent);
  assert.equal(testi[0], "Rilievo");
  assert.equal(testi[1], "▸ 12_wall.json · nessuna membratura · 8 scartate");
  assert.equal(vuoto.hidden, true);
  assert.equal(elenco._figli[1].dataset.tipo, "rilievo");
  elenco._figli[1].dispatch("click");
  assert.deepEqual(scelte.at(-1), ["rilievo", 0]);
});
test("senza rilievo l'albero non ha il ramo", () => {
  const { elenco, albero } = alberoFinto();
  albero.disegna(creaNodo(modelloVuoto(), { x: 0, z: 0 }), {});
  assert.ok(!elenco._figli.map((li) => li.textContent).includes("Rilievo"));
});
```

(`alberoFinto` è a `albero.test.js:33-36`.)

- [ ] **Step 2: Rosso; Step 3:** in `disegna`, prima di `gruppo("Nodi", …)`:

```js
    // Il rendiconto del rilievo viene prima del modello: è da lì che il modello importato
    // arriva, ed è l'unica voce che resta quando il rilievo non ha dato niente (P8: il ramo
    // compare solo dopo un'importazione).
    if (rilievo) {
      righe.push({ gruppo: "Rilievo" });
      righe.push({ tipo: "rilievo", id: 0, testo: riassunto(rilievo) });
    }
```

Firma `disegna(m, { selezione = null, rilievo = null } = {})`; import di `riassunto`. Verifica che la riga `vuoto.hidden = righe.length > 0` (`:84`) copra già il caso.

- [ ] **Step 4: Verde; commit** — `feat(albero): il ramo Rilievo con il riassunto dell'importazione`

---

### Task 4: `piano.js` — i simboli dei vincoli, pieni e proposti

**Files:**
- Modify: `static/piano.js:123-…` (`disegna(m, {…, proposte})`)
- Test: `static/test/piano.test.js`

**Interfaces:**
- Consumes: `nomePreimpostazione`, `GRADI` (`vincoli.js`).
- Produces: `disegna(m, {selezione, ghost, azioneInVista, proposte = []})`: per ogni nodo con un vincolo **dichiarato** con almeno un grado `true`, un simbolo pieno sotto il nodo (una base orizzontale lunga `2·RAGGIO·3·s` a `RAGGIO·2·s` sotto il centro, più due tratti obliqui che la uniscono al nodo: il triangolo del vincolo nel disegno tecnico; per l'incastro la base porta tre tratti corti di «terra»); per ogni `{nodo, vincolo}` in `proposte` lo stesso simbolo **tratteggiato** (`stroke-dasharray`), in `INCHIOSTRO` — è un ghost, non un errore: niente rosso. Classe `vincolo` sui pieni, `vincolo-proposto` sui tratteggiati. I simboli non entrano in `estensione` (px costanti, come le frecce) e si disegnano **dopo** i nodi.

**Ingressi degeneri:**
- nodo con `vincolo: null` e nessuna proposta → nessun simbolo
- nodo con libero **dichiarato** (sei `false`) → nessun simbolo (non c'è niente da disegnare, e la distinzione la dice l'ispettore)
- proposta su un nodo che non esiste → saltata
- proposta su un nodo che ha già un vincolo dichiarato → il chiamante non la passa (`proposteAperte`); se la passa, il piano disegna **solo** il pieno (il pieno vince)
- il `viewBox` non cambia con o senza proposte

- [ ] **Step 1: Test** — con `pianoFinto` (`:152`) e `tutti`:

```js
import { impostaVincolo } from "../comandi.js";
const INCASTRO = { ux: true, uy: true, uz: true, rx: true, ry: true, rz: true };
const simboli = (svg, classe) => tutti(svg, "line").filter((l) => l.getAttribute("class") === classe);

test("creaPiano: un vincolo dichiarato è pieno, una proposta è tratteggiata, il libero dichiarato non si disegna", () => {
  const { piano, svg } = pianoFinto();
  let m = estrudi(creaNodo(modelloVuoto(), { x: 0, z: 0 }), { da: 1, dx: 0, dz: 3000 });
  m = impostaVincolo(m, { id: 1, vincolo: INCASTRO });
  piano.disegna(m, {});
  assert.ok(simboli(svg, "vincolo").length >= 3);
  assert.equal(simboli(svg, "vincolo-proposto").length, 0);
  const riquadro = svg.getAttribute("viewBox");
  piano.disegna(m, { proposte: [{ nodo: 2, vincolo: INCASTRO }, { nodo: 9, vincolo: INCASTRO }] });
  const proposti = simboli(svg, "vincolo-proposto");
  assert.ok(proposti.length >= 3 && proposti.every((l) => l.getAttribute("stroke-dasharray")));
  assert.equal(svg.getAttribute("viewBox"), riquadro);
  m = impostaVincolo(m, { id: 1, vincolo: { ux: false, uy: false, uz: false, rx: false, ry: false, rz: false } });
  piano.disegna(m, {});
  assert.equal(simboli(svg, "vincolo").length, 0);
});
test("creaPiano: una proposta su un nodo già vincolato disegna solo il pieno", () => {
  const { piano, svg } = pianoFinto();
  const m = impostaVincolo(creaNodo(modelloVuoto(), { x: 0, z: 0 }), { id: 1, vincolo: INCASTRO });
  piano.disegna(m, { proposte: [{ nodo: 1, vincolo: INCASTRO }] });
  assert.equal(simboli(svg, "vincolo-proposto").length, 0);
});
```

- [ ] **Step 2: Rosso; Step 3:** in `disegna`, dopo il ciclo dei nodi e prima delle frecce:

```js
    // I vincoli: il triangolo del disegno tecnico sotto il nodo, pieno se dichiarato,
    // tratteggiato se è una proposta del rilievo — un ghost, non un errore, quindi inchiostro.
    // Px costanti come le frecce: non entrano in `estensione`.
    const dichiarati = new Set();
    const simbolo = (n, incastro, classe, tratteggio) => {
      const p = schermo(n);
      const b = RAGGIO * 2 * s, w = RAGGIO * 3 * s;
      const attr = { stroke: INCHIOSTRO, "stroke-width": 1.5 * s, class: classe, ...(tratteggio ? { "stroke-dasharray": `${3 * s} ${3 * s}` } : {}) };
      gruppo.append(el("line", { x1: p.x - w, y1: p.y + b, x2: p.x + w, y2: p.y + b, ...attr }));
      gruppo.append(el("line", { x1: p.x - w, y1: p.y + b, x2: p.x, y2: p.y, ...attr }));
      gruppo.append(el("line", { x1: p.x + w, y1: p.y + b, x2: p.x, y2: p.y, ...attr }));
      if (incastro) for (const k of [-1, 0, 1]) {  // i tratti di «terra» dell'incastro
        gruppo.append(el("line", { x1: p.x + k * w * 0.6, y1: p.y + b, x2: p.x + k * w * 0.6 - 3 * s, y2: p.y + b + 4 * s, ...attr }));
      }
    };
    for (const n of m.nodi) {
      if (n.vincolo && GRADI.some((g) => n.vincolo[g])) { dichiarati.add(n.id); simbolo(n, nomePreimpostazione(n.vincolo) === "incastro", "vincolo", false); }
    }
    for (const p of proposte) {
      const n = nodo(m, p.nodo);
      if (n && !dichiarati.has(n.id)) simbolo(n, nomePreimpostazione(p.vincolo) === "incastro", "vincolo-proposto", true);
    }
```

Firma `disegna(m, { selezione = null, ghost = null, azioneInVista = null, proposte = [] } = {})`; import `GRADI, nomePreimpostazione` da `./vincoli.js`. Verifica che `nomePreimpostazione` risponda «incastro» ai sei `true` (`vincoli.js:25`); altrimenti confronta i sei gradi.

- [ ] **Step 4: Verde; commit** — `feat(piano): i vincoli dichiarati pieni, le proposte del rilievo tratteggiate`

---

### Task 5: `pannello.js` — il rendiconto, e il rilievo nelle righe del nodo

**Files:**
- Modify: `static/pannello.js` (`:15` `CERCA`, `:26` `testoOrigine`, `:28` `righeDiNodo`, `:95` `RIGHE`, `:242` `editorVincolo`, `:647` `EDITORI`, `:650` `creaPannello.disegna` con l'opzione `rilievo`), `static/stile.css` (`.rendiconto`, `.scartata`)
- Test: `static/test/pannello.test.js`

**Interfaces:**
- Consumes: `righeScartate`, `giunzioneDelNodo`, `propostaPerNodo`, `proposteAperte`, `testoMancano`, `testoGiunzione` (Task 1); `descrizione` (`vincoli.js:35`).
- Produces:
  - `testoOrigine(o)` → «rilievo (12_wall.json), modificata · assunta: il rilievo non dice la classe»: sorgente, riferimento fra parentesi se c'è, «, modificata» se alzata, « · nota» se c'è. Tutte le righe che lo usano (nodo, asta, sezione, materiale) ne beneficiano: è ciò che rende visibile la story 53 («classe assunta») e la 52 (dispersione, riempimento).
  - `righeDiNodo(m, n, {rilievo})`: dopo «vincolo», se `giunzioneDelNodo` → `["giunzione", "scostamento 27,17 mm · membratura 2 cede a 1"]`; se `propostaPerNodo` e vincolo non dichiarato → `["vincolo proposto", "incastro (dal rilievo)"]`.
  - `editorVincolo(m, n, azioni, {rilievo})`: con una proposta aperta, un gruppo «dal rilievo» in testa con la nota «il rilievo propone: incastro — una lettura della geometria, non una misura» e `bottone("conferma il vincolo proposto", () => azioni.suConfermaVincolo(n.id))`.
  - `righeDiRilievo(m, r)` → `[["file", r.nome], ["membrature", …], ["aste", …], ["nodi", …], ["regioni scartate", …], ["giunzioni scartate", …], ["mancano", testoMancano(r.mancano)]]` (+ `["nota", r.resoconto.nota_vincoli]` se c'è).
  - `editorRilievo(m, r, azioni)` → `{elementi, controlli}`: gruppo «scartate» (`editor rendiconto`) con una `<div class="scartata">` per riga di `righeScartate`: `<p class="titolo">`, `<p class="numero">` col valore, `<p class="nota">` con la spiegazione; senza scartate la nota «nessuna regione scartata»; gruppo «dal rilievo mancano» con una `<ul>` delle voci (o la nota «niente») — **sono decisioni**, quindi ogni voce dice il gesto: «armature — apri una sezione e aggiungi le file», «classe — apri un materiale e scegli la classe», «vincoli — conferma le proposte qui sotto, o V su un nodo»; gruppo «giunzioni» con una riga `testoGiunzione` per giunzione (nota «nessuna giunzione» se vuoto); gruppo «vincoli proposti» con `proposteAperte(r, m)`: una riga per nodo «nodo ‹id› · incastro» con `bottone("conferma", …)` → `azioni.suConfermaVincolo(id)`, e in testa `bottone("conferma tutte", …)` → `azioni.suConfermaTutti()` quando ce n'è più d'una; senza proposte aperte la nota (`r.resoconto.nota_vincoli` se c'è, altrimenti «nessuna proposta aperta»); in coda la nota «il rendiconto vale per questa sessione: riaprendo il file non torna».
  - `CERCA.rilievo`, `RIGHE.rilievo = righeDiRilievo`, `EDITORI.rilievo = editorRilievo`; `disegna(m, selezione, {catalogo, legame, tabella, rilievo})`: con `selezione.tipo === "rilievo"` l'entità è `rilievo` (o `null` se non c'è: allora si mostra il vuoto). La funzione esportata `righe(m, selezione, opzioni = {})` guadagna il terzo argomento (`{rilievo}`) e lo passa a `entitaSelezionata` e alle righe: i chiamanti esistenti a due argomenti restano validi.
  - CSS: `.rendiconto .scartata { border-left: 3px solid var(--rosso); padding-left: 6px; margin: 6px 0; }` (il rosso è il filetto: la regione è bocciata), `.scartata .titolo { margin: 0; font-size: 11px; }`, `.scartata .numero { margin: 0; }`, `.rendiconto ul { margin: 2px 0 0; padding-left: 1.2em; font-size: 11px; }`.

**Ingressi degeneri:**
- `disegna(m, {tipo: "rilievo", id: 0}, {})` senza `rilievo` → il vuoto («Niente di selezionato…»), nessuna eccezione
- rilievo del prior vuoto → 14 `.scartata`, «mancano» con la nota «niente: il rilievo ha dato tutto»? **No**: con `membrature === 0` la riga «mancano» dice «— (nessuna membratura importata)»; `testoMancano([])` vale solo con membrature. Test.
- rilievo con 21 proposte → 21 bottoni «conferma» + «conferma tutte»; dopo `impostaVincolo` su un nodo, ridisegnando quel nodo sparisce dall'elenco (`proposteAperte`)
- nodo con giunzione e senza proposta → la riga «giunzione» c'è, «vincolo proposto» no
- `testoOrigine({sorgente: "rilievo"})` → «rilievo»; con `riferimento` → «rilievo (12_wall.json)»; con `nota` → « · nota»; `null` → «—»
- ogni controllo dei due editor toccati ha il nome accessibile che comincia dal testo visibile; per `rilievo` **non** si estende `CASI_EDITOR` (i suoi cicli, `pannello.test.js:861,877`, contano coppie testo+campo e il rendiconto ha solo bottoni: `coppie.length > 0` sarebbe rosso per costruzione) ma si scrive un test dedicato: ogni `<button>` dell'editor del rilievo ha `aria-label` che comincia dal proprio `textContent`, e i nomi sono unici anche con 21 «conferma» (nome «conferma il vincolo proposto del nodo ‹id›»)

- [ ] **Step 1: Test** — aggiungi a `AZIONI` (`:175`) `"suConfermaVincolo", "suConfermaTutti"`; **non** toccare `CASI_EDITOR` (ruling R1 dell'architect): il test WCAG del rendiconto è dedicato (sotto). Stampo:

```js
import { daRisposta } from "../rilievo.js";
const INCASTRO = { ux: true, uy: true, uz: true, rx: true, ry: true, rz: true };
const rilievoPieno = () => daRisposta({
  scartate: [{ regione: 2, punti: 3866, controllo: "costanza_sezione", valore: 0.31, soglia: 0.15, unita: "-", spiegazione: "sintetico" }],
  giunzioni: [{ nodo: 2, scostamento_nodo: 27.1733, distanza_proiezione: 153.6, cede: 2, resta: 1 }],
  proposte_vincoli: [{ nodo: 1, vincolo: INCASTRO }, { nodo: 2, vincolo: INCASTRO }],
  mancano: ["armature", "classe", "vincoli"], resoconto: { membrature: 4, aste: 80, nodi: 80, scartate: 1, giunzioni_scartate: 0 },
}, "tests/fixture/prior_sintetico/12_wall.json");

test("righe del rilievo e testoOrigine con riferimento e nota", () => {
  assert.deepEqual(righe(modelloVuoto(), { tipo: "rilievo", id: 0 }, { rilievo: rilievoPieno() })[0], ["file", "12_wall.json"]);
  const m = CON_CERNIERA();
  m.nodi[0].origine = { sorgente: "rilievo", riferimento: "12_wall.json", modificata: true, nota: "riempimento 1.00" };
  assert.ok(righe(m, { tipo: "nodo", id: 1 }).some(([k, v]) => k === "origine" && v === "rilievo (12_wall.json), modificata · riempimento 1.00"));
});
test("rendiconto: scartate col filetto, mancano come gesti, proposte con conferma e conferma tutte", () => {
  const { p, editor, chiamate } = pannelloFinto();
  p.disegna(CON_CERNIERA(), { tipo: "rilievo", id: 0 }, { rilievo: rilievoPieno() });
  assert.equal(tutti(editor).filter((e) => e.className === "scartata").length, 1);
  assert.ok(tutti(editor).some((e) => /armature — apri una sezione/.test(e.textContent)));
  const conferme = tutti(editor).filter((e) => e.textContent === "conferma");
  assert.equal(conferme.length, 2);
  conferme[1].dispatch("click");
  assert.deepEqual(chiamate.suConfermaVincolo, [2]);
  tutti(editor).find((e) => e.textContent === "conferma tutte").dispatch("click");
  assert.equal(chiamate.suConfermaTutti.length, 1);
});
test("rendiconto senza rilievo mostra il vuoto; il nodo con giunzione e proposta le dice", () => {
  const { p, vuoto, dati } = pannelloFinto();
  p.disegna(CON_CERNIERA(), { tipo: "rilievo", id: 0 }, {});
  assert.equal(vuoto.hidden, false);
  p.disegna(CON_CERNIERA(), { tipo: "nodo", id: 2 }, { rilievo: rilievoPieno() });
  const testi = dati._figli.map((e) => e.textContent);
  assert.ok(testi.includes("giunzione") && testi.includes("vincolo proposto") && testi.includes("incastro (dal rilievo)"));
});
test("rendiconto: ogni bottone ha un nome accessibile che comincia dal testo visibile, e i nomi sono unici (WCAG 2.5.3)", () => {
  const { p, editor } = pannelloFinto();
  p.disegna(CON_CERNIERA(), { tipo: "rilievo", id: 0 }, { rilievo: rilievoPieno() });
  const bottoni = tutti(editor).filter((e) => e.type === "button" || (e._attrs["aria-label"] && e.textContent));
  const nomi = bottoni.map((b) => b._attrs["aria-label"] ?? b.textContent);
  for (const b of bottoni) assert.ok((b._attrs["aria-label"] ?? b.textContent).startsWith(b.textContent), b.textContent);
  assert.equal(new Set(nomi).size, nomi.length);
});
test("editor del nodo con una proposta aperta: il bottone conferma chiama suConfermaVincolo", () => {
  const { p, editor, chiamate } = pannelloFinto();
  p.disegna(CON_CERNIERA(), { tipo: "nodo", id: 1 }, { rilievo: rilievoPieno() });
  tutti(editor).find((e) => e.textContent === "conferma il vincolo proposto").dispatch("click");
  assert.deepEqual(chiamate.suConfermaVincolo, [1]);
});
```

- [ ] **Step 2: Rosso; Step 3: il codice.**

```js
import { righeScartate, giunzioneDelNodo, propostaPerNodo, proposteAperte, testoMancano, testoGiunzione } from "./rilievo.js";

const testoOrigine = (o) => {
  if (!o) return "—";
  const rif = o.riferimento ? ` (${o.riferimento})` : "";
  return `${o.sorgente}${rif}${o.modificata ? ", modificata" : ""}${o.nota ? ` · ${o.nota}` : ""}`;
};

const GESTI_MANCANO = {
  armature: "armature — apri una sezione e aggiungi le file",
  classe: "classe — apri un materiale e scegli la classe",
  vincoli: "vincoli — conferma le proposte qui sotto, o V su un nodo",
};

function righeDiRilievo(m, r) {
  const c = r.resoconto;
  const righe = [["file", r.nome], ["membrature", String(c.membrature ?? 0)], ["aste", String(c.aste ?? 0)],
                 ["nodi", String(c.nodi ?? 0)], ["regioni scartate", String(c.scartate ?? 0)],
                 ["giunzioni scartate", String(c.giunzioni_scartate ?? 0)],
                 ["mancano", c.membrature ? testoMancano(r.mancano) : "— (nessuna membratura importata)"]];
  if (c.nota_vincoli) righe.push(["nota", c.nota_vincoli]);
  return righe;
}

function editorRilievo(m, r, azioni) {
  const controlli = [];
  const paragrafo = (classe, testo) => { const p = document.createElement("p"); p.className = classe; p.textContent = testo; return p; };
  // Il caso principale è il rifiuto (brief §3): le scartate vengono prima di tutto.
  const scartate = gruppo("scartate", "editor rendiconto", r.scartate.length ? null : "nessuna regione scartata");
  for (const riga of righeScartate(r)) {
    const box = document.createElement("div"); box.className = "scartata";
    box.append(paragrafo("titolo", riga.titolo), paragrafo("numero", riga.valore), paragrafo("nota", riga.spiegazione));
    scartate.append(box);
  }
  const mancano = gruppo("dal rilievo mancano", "editor rendiconto", r.resoconto.membrature ? null : "nessuna membratura importata: niente da completare");
  if (r.resoconto.membrature && r.mancano.length) {
    const ul = document.createElement("ul");
    for (const voce of r.mancano) { const li = document.createElement("li"); li.textContent = GESTI_MANCANO[voce] ?? voce; ul.append(li); }
    mancano.append(ul);
  }
  const giunzioni = gruppo("giunzioni", "editor rendiconto", r.giunzioni.length ? null : "nessuna giunzione");
  for (const g of r.giunzioni) giunzioni.append(paragrafo("numero", testoGiunzione(g)));
  const aperte = proposteAperte(r, m);
  const proposte = gruppo("vincoli proposti", "editor rendiconto",
                          aperte.length ? "una lettura della geometria, non una misura: ogni conferma è un comando" : (r.resoconto.nota_vincoli ?? "nessuna proposta aperta"));
  if (aperte.length > 1) {
    const tutte = bottone("conferma tutte", () => azioni.suConfermaTutti());
    tutte.setAttribute("aria-label", `conferma tutte le ${aperte.length} proposte di vincolo`);
    proposte.append(tutte); controlli.push(tutte);
  }
  for (const p of aperte) {
    const riga = document.createElement("div"); riga.className = "proposta";
    riga.append(paragrafo("numero", `nodo ${p.nodo} · ${descrizione(p.vincolo)}`));
    const b = bottone("conferma", () => azioni.suConfermaVincolo(p.nodo));
    b.setAttribute("aria-label", `conferma il vincolo proposto del nodo ${p.nodo}`);
    riga.append(b); controlli.push(b); proposte.append(riga);
  }
  const nota = gruppo("nota", "editor", "il rendiconto vale per questa sessione: riaprendo il file non torna");
  return { elementi: [scartate, mancano, giunzioni, proposte, nota], controlli };
}
```

In `righeDiNodo(m, n, { rilievo = null } = {})`, dopo la riga «vincolo»: la giunzione e la proposta (con `n.vincolo == null`). In `editorVincolo(m, n, azioni, { rilievo = null } = {})`, in testa: il gruppo «dal rilievo» quando `rilievo && propostaPerNodo(rilievo, n.id) && n.vincolo == null`, con la nota e il bottone «conferma il vincolo proposto» (`aria-label` = lo stesso testo). `righeDe`/`RIGHE` e `EDITORI` passano le opzioni; `CERCA.rilievo = (m, id, opzioni) => opzioni?.rilievo ?? null` (adatta `entitaSelezionata` a ricevere le opzioni). In `disegna`, `rilievo` entra nelle opzioni come `catalogo`.

- [ ] **Step 4: Verde; commit** — `feat(pannello): il rendiconto del rilievo nell'ispettore, con le proposte da confermare`

---

### Task 6: `app.js` — la cucitura

**Files:**
- Modify: `static/app.js` (stato, `creaFile`, `scegli`, callback del pannello, `ridisegna`, `dispatchVoce`)

**Interfaces:**
- Consumes: tutto quanto sopra; `daRisposta`, `etichettaStoria`, `proposteAperte`, `propostaPerNodo` (Task 1); `impostaVincolo` (`comandi.js:169`); `descrizione` (`vincoli.js`).
- Produces:
  - `let rilievo = null;`
  - `suImportazione: (p, m, risposta) => { cronologia = nuovaCronologia(m, etichettaStoria(daRisposta(risposta, p))); rilievo = daRisposta(risposta, p); chiudiComando(); selezione = { tipo: "rilievo", id: 0 }; modo = null; azioneCorrente = null; percorso = null; impronta = null; dì(null); ridisegna(); }` — `percorso = null` perché il modello non è su disco: `file.disegna` dice «nessun modello aperto» finché non si salva, e `⌘S` chiede il percorso dal campo (che porta il prior: l'utente lo cambia).
  - `suApertura`: `rilievo = null` in più.
  - `esiste` a sette vie: `rilievo: rilievo ? [{ id: 0 }] : []`.
  - `ridisegna`: `albero.disegna(m, { selezione, rilievo })`; `pannello.disegna(m, selezione, { catalogo, legame, tabella, rilievo })`; `piano.disegna(m, { selezione, ghost, azioneInVista: azioneDestinazione(m), proposte: rilievo ? proposteAperte(rilievo, m) : [] })`.
  - callback: `suConfermaVincolo: (id) => { const v = propostaPerNodo(rilievo, id); if (!v) return; esegui((m) => impostaVincolo(m, { id, vincolo: v }), \`vincolo del nodo ${id} dal rilievo: ${descrizione(v)}\`); ridisegna(); }`; `suConfermaTutti: () => { for (const p of proposteAperte(rilievo, corrente(cronologia))) esegui((m) => impostaVincolo(m, { id: p.nodo, vincolo: p.vincolo }), \`vincolo del nodo ${p.nodo} dal rilievo: ${descrizione(p.vincolo)}\`); ridisegna(); }` — una voce della Storia per nodo (⌘Z le disfa una per una: è il patto della cronologia lineare).
  - `dispatchVoce`: `if (voce.codice === "importa") { file.importa(); return; }` accanto ad `apri`/`salva`, **sopra** la guardia del campo.
  - `scegli("rilievo", 0)`: passa da `esitoScelta` come gli altri tipi; nessuna aggiunta.

**Ingressi degeneri:**
- importare con un campo aperto (`N` con «0;») → il campo si chiude, la Storia ricomincia, la selezione è il rilievo
- importare il prior vuoto → albero con la sola voce «Rilievo», ispettore col rendiconto (14 scartate), Storia «importato 12_wall.json: nessuna membratura, 8 regioni scartate», piano vuoto, nessun errore in console
- «conferma tutte» sul sintetico → 21 voci nella Storia, 21 simboli pieni, zero tratteggiati, il gruppo «vincoli proposti» dice «nessuna proposta aperta»; `⌘Z` → torna una proposta tratteggiata
- «conferma» su un nodo poi `V` sullo stesso → `V` alterna (spegne l'incastro → libero dichiarato): la proposta **non** ricompare (libero dichiarato è dichiarato)
- `⌘I` da dentro il campo di comando → importa lo stesso (come `⌘O`)
- «apri» dopo un'importazione → `rilievo = null`, il ramo «Rilievo» sparisce, l'ispettore torna vuoto
- `⌘S` subito dopo un'importazione → «scrivi il percorso dove salvare» (il campo è stato svuotato da `file.importa`, Task 2: un `.nova.json` sopra il prior sarebbe una perdita; il percorso del prior resta in `rilievo.percorso` e nella riga «file» del rendiconto)
- `rilievo` con un modello poi modificato a mano (nodi eliminati) → `proposteAperte` filtra i nodi spariti, il rendiconto non solleva

- [ ] **Step 1: I rami e i callback**, `node --check`, la suite verde (nessun test tocca `app.js`).
- [ ] **Step 2: Prova a mano breve** (server 8818): importa il sintetico, conferma tutte, `⌘Z`, apri la fixture 2×1.
- [ ] **Step 3: Commit** — `feat(app): l'importazione del prior con il rendiconto, le proposte confermate una per una`

---

### Task 7: la verifica che conta

**Files:** nessuno — è la prova a mano, sulle tre fixture e sul rilievo vero.

**Ingressi degeneri:**
- nessun ingresso esterno

- [ ] **Step 1: Server** su `8818`; Chrome (estensione, o headless via CDP con la cache spenta).
- [ ] **Step 2: Il vuoto, prima di tutto.** Nel campo `tests/fixture/prior_vuoto/12_wall.json`, «importa»: durante la richiesta il bottone dice «importazione…»; poi l'albero ha solo «Rilievo · 12_wall.json · nessuna membratura · 8 scartate», l'ispettore mostra 14 righe di scartate (la prima: «regione 0 · 4 215 879 punti · costanza_sezione», «1,19 contro soglia 0,1 frazione» — `conciso` tiene due decimali sotto 100 — la spiegazione sotto), «dal rilievo mancano: nessuna membratura importata», il piano vuoto, la Storia «importato 12_wall.json: nessuna membratura, 8 regioni scartate». Il campo è vuoto e lo stato del file dice «nessun modello aperto».
- [ ] **Step 3: Il parziale.** `prior_parziale`: 40 aste, 2 scartate («sintetico: scartata a mano per il test», unità «-» non stampata), la nota «tutti i nodi sarebbero al piede: nessuna proposta» nel gruppo «vincoli proposti» e nelle righe. Clic su un'asta: «origine: rilievo (12_wall.json) · riempimento 1.00»; sulla sua sezione: nome «rilievo m0 s0 140×281», origine con «dispersione …»; su un materiale: «rilievo · assunta: il rilievo non dice la classe».
- [ ] **Step 4: Il sintetico.** `prior_sintetico`: 80 aste, 4 giunzioni («nodo 41 · scostamento 27,17 mm …»), 21 proposte tratteggiate nel piano; clic sul nodo 41: la riga «giunzione». Clic su un nodo proposto: «vincolo proposto: incastro (dal rilievo)» e il bottone nell'editor; «conferma il vincolo proposto» → simbolo pieno, Storia «vincolo del nodo N dal rilievo: incastro». Torna al rilievo: «conferma tutte» → 20 voci in più, nessun tratteggio. `⌘Z` due volte: due tratteggi tornano. `V` su un nodo confermato: passa a libero dichiarato, la proposta non ricompare. Check Model (`/api/check` via `curl`, o dal Task 12 quando ci sarà): `vincoli` passato.
- [ ] **Step 5: Salva e riapri.** `⌘S` senza percorso → «scrivi il percorso dove salvare»; scrivi `/tmp/sintetico-11d.nova.json`, `⌘S` → salvato, impronta; «apri» lo stesso file → il ramo «Rilievo» **non** c'è (dichiarato), i vincoli confermati sì, le origini «rilievo (12_wall.json)» sì.
- [ ] **Step 6: Il rilievo vero**, se c'è: `~/GitHub/NOVA/lab_telaio_v2/12_wall.json` (fuori dal repo). Stesso esito del vuoto, con i numeri veri.
- [ ] **Step 7: Errori.** Percorso inesistente → «…: [Errno 2]…» del server nella riga rossa, il modello aperto resta; un `.nova.json` al posto del prior → «il prior non porta la chiave `terna`…».
- [ ] **Step 8: Larghezze e zoom.** 1280, 1920, zoom 200 % vero: il rendiconto scorre in verticale, le 14 scartate non tagliano il testo, i simboli dei vincoli stanno sotto i nodi senza toccare le etichette.
- [ ] **Step 9: Spegni il server.** Conteggi finali JS e pytest (698, invariato).

## Mutanti da dichiarare rossi, per chi esegue

Con controllo nullo verde prima di ogni mutante; copia del file prima, ripristino dalla copia.

1. `rilievo.js:proposteAperte` — il filtro sul vincolo dichiarato tolto → «libero dichiarato è dichiarato» rosso.
2. `rilievo.js:righeScartate` — `unita` stampata anche quando è «-» → rosso.
3. `rilievo.js:riassunto` — «nessuna membratura» sostituito da «0 membrature → 0 aste» → rosso.
4. `file.js:importa` — `ricorda(p)` aggiunto → «un prior non è un modello recente» rosso.
5. `file.js:importa` — `suImportazione` chiamata anche a 400 → rosso.
6. `tastiera.js` — `["i", "importa"]` messa in `SENZA_MODIFICATORE` → «i nuda non fa niente» rosso.
7. `albero.js` — il gruppo «Rilievo» stampato anche con `rilievo: null` → rosso.
8. `piano.js` — la proposta disegnata anche sul nodo già vincolato → rosso; `stroke-dasharray` tolto dai proposti → rosso.
9. `pannello.js:testoOrigine` — la nota omessa → rosso.
10. `pannello.js:editorRilievo` — «conferma tutte» mostrato con una proposta sola → aggiungi il test (una proposta → nessun «conferma tutte») e dichiaralo rosso.

## Fuori da questa seduta

Il Check Model e la corsa in interfaccia (12): qui il Check si prova da `curl`. Il rendiconto persistito nel file (oggi vale per la sessione: dichiarato nell'ispettore e nell'Esito). Le sezioni del rilievo senza armatura e con `copriferro 0`: l'editor della 11b le mostra e le lascia completare — «mancano: armature» è il rimando. La giunzione come entità nel modello (oggi è solo nel rendiconto). Un simbolo per la cerniera e il carrello diverso dall'incastro (oggi: triangolo, con i tratti di terra solo per l'incastro). Il prior dal corpo della richiesta (`{prior}`) invece che da un percorso: il sidecar lo accetta, l'interfaccia locale non ne ha bisogno. Il nit della 11a sul fuoco che resta nel campo del percorso dopo «apri»/«importa» (passata sull'uso).
