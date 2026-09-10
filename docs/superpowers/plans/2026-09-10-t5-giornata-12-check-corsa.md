# NOVA T5 — giornata 12: Check Model, corsa come lavoro, attesa parlante

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** dall'interfaccia si verifica il modello (Check Model, sedici controlli con controllo, oggetto, ragione e rimedio, e «vai» che seleziona l'oggetto) e si lancia la corsa di tutte le analisi che il modello dichiara; mentre gira, il pannello dice **quale fase** sta facendo e da **quanti secondi**, mai una percentuale; a fine corsa la durata misurata, i verdetti del Check e i sette controlli sui risultati a doppio canale, e l'ultima corsa che diventa **stantia** — filetto rosso e la parola — appena il modello cambia. Il solutore assente o rotto si dichiara con «dove prenderlo». Il solido si lancia con lo stesso gesto da un `.inp` (il minimo: esito, secondi, cartella; la vista del solido è T7).

**Architecture:** due cambi nel server, entrambi piccoli e testati con `TestClient`: (1) `SidecarProcesso` legge le righe da un thread lettore con un **soffitto** per riga (un sidecar muto diventa un errore `fase: sidecar`, non una richiesta appesa per sempre — issue #20) e accetta un callback per fase; (2) `create_app` riceve un **secondo sidecar** (`lungo`) per `corsa` e `ccx`, e le due rotte diventano **lavori**: `POST` risponde subito `202 {run_id}`, `GET /api/corsa/{run_id}` dà stato, fasi finora e secondi — così `/api/salute` e `/api/check` restano liberi durante una corsa (issue #22, per la parte che serve alla UI: una seconda corsa è 409). La scrittura dei risultati diventa atomica (#20). In interfaccia un modulo nuovo, `static/corsa.js`, sul modello di `file.js`: funzioni pure (righe dei verdetti, testi di stato e attesa, stantia) e `creaCorsa(radice, …)` che possiede il blocco «Corsa» fisso nel pannello destro, sopra la Storia, e interroga il lavoro ogni 500 ms. Nessun riduttore nuovo: la corsa non tocca il modello; lo stato dell'ultima corsa vive in `corsa.js`, fuori dalla cronologia, e «stantia» è l'identità dello snapshot (`corrente(cronologia) !== lavoro.modello`), più stretta e gratuita dell'impronta.

**Tech Stack:** FastAPI + `threading` nel server (già in uso), `pytest` con `TestClient`, moduli ES nativi, `node --test` con il DOM finto e la `fetch` finta di `file.test.js`, Chrome per la prova finale.

**Spec:** `docs/superpowers/specs/2026-09-05-nova-v1-design.md` — story 29-35 (righe 64-70), 41-42 (righe 79-80), 68 (riga 124), 7 (riga 33: «i controlli della corsa» nel pannello destro); «Protocollo del sidecar» (righe 135-153: eventi di fase riga per riga, `corsa → esito ok|rifiutato|errore{fase, motivo, coda_log}|assente, risultati, verdetti_check[], secondi`); «Check Model (C1) e controlli sui risultati (C3)» (righe 207-213); «Interfaccia» (righe 223-225: «fasi nominate e durata misurata», «verdetti a tre stati», «risultati marcati stantii per impronta»). Calendario: `docs/superpowers/plans/2026-09-06-t5-interfaccia-bozza.md:18` (giornata 12) e `:88` (le story 6-7 «parte corsa» si aggiungono); rischio dichiarato `:62` («Attesa parlante: SSE o polling — decidere con Mario» — deciso qui sotto: polling).

**Ricerca che questo piano applica** (`docs/ricerca/index.md`, riga 19, ricerca 07): `07-ux-modellatore.md:93` (NNG: sotto 1 s nessun indicatore, sopra 10 s fasi nominate senza percentuale), `:100` (verifica fallita = doppio canale: colore **e** parola **e** riga), `:101` (verifiche in chiaro: il controllo che contraddice accanto al numero), `:152` (P5: fasi nominate, durata misurata, errore con rimando al registro), `:169` (analisi: non bloccante, fasi nominate, esito con durata misurata). Mappa wayfinder #31: la 12 continua T5; la passata sull'uso viene dopo la 15.

**Ramo:** il piano lo chiamava `feat/interfaccia-12-check-corsa`, ma il ramo che **esiste** è `feat/interfaccia-12-importatore` — il nome è stato copiato da quello dell'11d (`feat/interfaccia-11d-importatore`) e non dice più di che giornata è (vedi l'annotazione, §0). Da `main` a `f5a41e1`, worktree `/Users/mario/GitHub/NOVA-wt/interfaccia-12` (venv pronto, `nova ok 3.12.13`). PR verso `main`.

## Global Constraints

- **Lingua italiana** in interfaccia, commenti, messaggi di commit; identificatori tecnici invariati. Le chiavi del modello e dei verdetti sono quelle di `nova/modello.py` e `nova/check.py:16-20` alla lettera.
- **Notazione numerica italiana**: `cifre`/`conciso` in uscita (`static/numeri.js:182-195`); i secondi come «3,2 s» (`conciso`), mai «3.2».
- **Palette «colonna tensegrale»**: fondo `#dcdad5`, inchiostro `#141414`, **un solo rosso** `#b8321e` = attenzione. Il rosso a 11-13 px non regge AA come colore di testo: il rosso è il **filetto** (`.avviso`, `.non-ora`, `.scartata`), la parola è il canale. Un verdetto «non passato» ha il punto rosso **e** la parola; «stantia» ha il filetto **e** la parola.
- **Mai una percentuale inventata** (P5, spec story 32): l'attesa mostra la fase corrente e i secondi trascorsi; la durata «misurata» è `secondi` del server, non il cronometro del browser.
- **Nessun bundler, nessun `package.json`, nessuna rete a tempo d'uso.**
- **WCAG AA**; nessuna informazione sul solo colore; fuoco sempre visibile; ogni controllo con nome accessibile che **comincia** dal testo visibile; i bottoni «vai» sono distinti per oggetto («vai al nodo 3»).
- **Zero sovrapposizioni, zero testo tagliato**, verificato a 1280 e 1920 px e a zoom 200 % (viewport 640×400 con dpr 2).
- **Sotto `nova/` cambiano solo `server.py`, `corsa.py`, `ccx.py`, `__main__.py`** (Task 1-2). `meshrec/` non si tocca. `nova/check.py` e `nova/sidecar.py` non cambiano: il protocollo del sidecar è quello della spec.
- **`solutore` e `cartella` non arrivano mai dal corpo HTTP** (ruling di sicurezza di T1, `nova/server.py:3-6`): i lavori non cambiano questo patto; `extra="forbid"` resta.
- **La corsa non tocca il modello né la cronologia**: `⌘Z` non disfa una corsa; l'ultima corsa vive in `corsa.js` e si azzera ad «apri» e a una nuova cronologia.
- **La corsa lancia tutte le analisi che il modello dichiara** (`casi: null`): nessun selettore di casi in questa giornata.
- Comando dei test JS (dalla cartella `static/`): `env -C /Users/mario/GitHub/NOVA-wt/interfaccia-12/static node --test test/*.test.js` — punto di partenza **610 pass**.
- Comando dei test Python: `/Users/mario/GitHub/NOVA-wt/interfaccia-12/.venv/bin/python -P -m pytest /Users/mario/GitHub/NOVA-wt/interfaccia-12/tests -p no:cacheprovider --color=no --rootdir=/Users/mario/GitHub/NOVA-wt/interfaccia-12` — punto di partenza **698 segni** (695 pass + 3 skip); i test che vogliono OpenSees usano la fixture `binario_opensees` (`tests/conftest.py:41-42`) e saltano se manca.
- Server per la prova in browser: `env -C /Users/mario/GitHub/NOVA-wt/interfaccia-12 /Users/mario/GitHub/NOVA-wt/interfaccia-12/.venv/bin/python -P -m nova --porta 8819`. **Mai la 8765, né 8766-8767, né 8818.** Spegnerlo a fine prova.
- **Mai `git checkout --` per revertire un mutante**: copia del file prima, ripristino dalla copia.
- Un comando per chiamata Bash, percorsi assoluti, `git -C`; niente `cd … &&`.

## Quel che il backend dà già, e non va reinventato

- `nova/server.py:62-110` `SidecarProcesso`: lock unico non bloccante → 409 `{"esito":"errore","fase":"sidecar","motivo":"il sidecar è occupato da un'altra corsa"}` (`:80-82`); `chiedi(req)` scrive una riga su stdin e legge con `readline()` finché non arriva la riga senza `evento` (`:90-106`), raccogliendo gli eventi di fase in `righe`; nessun timeout sul `readline` (`:94`). `SidecarInProcesso` (`:47-59`) chiama `_sidecar.rispondi(req, righe.append)` in memoria: è quello dei test.
- `nova/server.py:191-193` `/api/salute` → `{"nova": versione, "solutore": {esito: ok|rotto|assente, percorso, motivo, dove_prenderlo}}` (`nova/corsa.py:62-70`; `DOVE_PRENDERLO["opensees"]` in `meshrec/core/solve.py:1213-1227`). `:195-197` `/api/check {modello}` → `{"esito": "ok"|"rifiutato", "verdetti": [...]}`, 400 con `fase: "modello"`. `:206-212` `/api/corsa {modello, casi?}` sincrona → `{"run_id", "fasi": [...], ...fin}`; `:214-223` `/api/ccx {inp}` sincrona → `{"run_id", "cartella", "fasi", ...fin}`; `_o_400` (`:183-189`): 400 per `fase` ∈ modello|importa|confronto|deck, **200** per `fase: "solutore"` e `esito: "assente"`.
- `nova/sidecar.py:132-147` `comando_corsa(req, emetti)`: emette `{"evento":"fase","nome":"check model"}`, fa il Check, se rifiutato torna `{"esito":"rifiutato","verdetti_check":[…],"secondi"}` senza solutore; altrimenti `esito = _corsa.esegui(...)` con `verdetti_check` aggiunto. Le fasi della corsa: `"scrivo il deck e lancio OpenSees"` / `"… (modale, N modi)"` (`nova/corsa.py:159`), `"leggo i recorder"` (`:134`); di `ccx`: `"copio il deck"`, `"lancio ccx"`, `"leggo .dat e .frd"` (`nova/ccx.py:94,110,126`).
- `nova/corsa.py:155-156`: `(cartella / NOME_RISULTATI).write_text(json.dumps(risultati, …))` poi `{"esito": "ok", "risultati": risultati, "secondi": …}`; `nova/ccx.py:135-137` idem con `NOME_RISULTATI = "risultati_solido.json"`. `_errore_solutore` (`corsa.py:237`) → `{"esito":"errore","fase":"solutore","motivo","coda_log"(ultimi 2000 caratteri)}`; `_TIMEOUT_S = 600` (`corsa.py:40`), `1800` per ccx (`ccx.py:57`).
- `nova/check.py:16-20` `_v`: `{controllo, oggetto, stazione, caso, esito, ragione, articolo, valori, rimedio}`; `esito` ∈ `passato|non_passato|non_applicabile`; `articolo` sempre `None`; `rimedio` stringa o `None`. `oggetto` per controllo (`check.py:81-284`): `nodi_coincidenti` coppie `[id_nodo, id_nodo]`; `aste_sconnesse`, `aste_lunghezza_zero`, `sezione_nulla` liste di id d'asta; `aste_duplicate` coppie di id d'asta; `nodi_liberi`, `vincoli_dedotti` liste di id nodo; `nodo_su_asta` coppie `[id_nodo, id_asta]`; `armatura_mancante` id sezione; `carico_termico` coppie `(id_azione, id_asta)`; `riferimenti` e `pushover` liste di dict con chiavi che nominano il tipo (`sezione`, `calcestruzzo`, `acciaio`, `azione`, `nodo`, `asta`, `analisi`, `caso`, `nodo_controllo`); `massa_nulla`, `vincoli`, `unita`, `moti_rigidi` senza oggetto. I C3 (`corsa.py:340-354`) hanno la stessa forma con `caso` valorizzato e `controllo` ∈ `reazioni|spostamenti|convergenza|autovalori|massa_modale|avvisi|picco|vincolo_in_pianta`.
- `nova/__main__.py:31-43`: un solo `SidecarProcesso`, `create_app(sidecar, Path.cwd() / "corse", porta=porta)`, `terminate()` nel `finally`.
- `tests/test_server.py:19-30` fixture `cliente` con `SidecarInProcesso`; `:610-627` il 409 di `/api/salute` col lock preso (resta valido: è il sidecar breve); i test che oggi fanno `POST /api/corsa` e leggono la risposta sincrona: `:66`, `:168`, `:191`, `:202`, `:308`, `:314`, `:446`, `:641`; `POST /api/ccx`: `:534`, `:549`, `:557`, `:562`, `:571`, `:576`, `:606`. Il Task 2 li adegua con un helper che attende la fine del lavoro.
- `static/file.js:24-33` `chiediJson(rotta, corpo?)`: GET senza corpo, POST altrimenti; rete caduta → `Error("il server non risponde")`; risposta non ok → `Error(dati.motivo || "il server ha risposto N")`. `:73` `inCorso`, `:171` e `:181` il bottone «importazione…» disabilitato e ripristinato nel `finally`: **il modello di «corro…»**.
- `static/app.js:100-102` `$`, `messaggio`, `dì`; `:109` `scegli(tipo, id)` (passa da `esitoScelta`: è la porta di «vai»); `:182-188` `creaStoria`; `:189-224` `creaFile` con `suApertura`/`suImportazione` (dove l'ultima corsa si azzera); `:239` `VOCI_PALETTE = TASTI.filter(…)` (le voci nuove entrano da sole); `:553-563` `esegui`; `:565-608` `ridisegna` (in coda `file.disegna`, `storia.disegna`, `disegnaBarra`); `:631` il listener `keydown`; `:666-` `dispatchVoce`: `apri`/`salva`/`importa` a `:687-691` **sopra** la guardia del campo, `palette` a `:696`.
- `static/tastiera.js:14-50` `TASTI` (`importa` a `:23` con `modificatore: "comando"`, `contesto: "salvo-ghost"`); `:77` `CON_COMANDO`, `:79` `CON_COMANDO_E_SHIFT` (solo `z`); `:117-130` `voceDaEvento`; `:136-155` `vociDellaBarra`. Test in `static/test/tastiera.test.js` (`:77-96` le prove di ⌘/⇧⌘, `:149-150` la sonda dei tasti).
- `static/index.html:49-61` il pannello destro: `<h2>Selezione</h2>`, `#pannello-dati`, `#pannello-editor`, «Unità», «Storia» (`#storia-elenco`); `:63` `#messaggio` con `aria-live`. `static/stile.css:47` `#pannello`, `:60-61` `h2`, `:63` `.numero`, `:158` `.avviso` (filetto rosso), `:165-168` `.rendiconto .scartata` (il filetto come `.avviso`, testo inchiostro), `:187` `.vuoto`, `:225` `.staccato`, `:239-243` `.file-azioni` e i suoi bottoni, `:244` `#file-stato`, `:265` `#storia-elenco`.
- `static/test/file.test.js:9-53`: `elementoFinto()` con `dispatch`, `radiceFinta()` con `querySelector`, `fetchFinta({dati, ritardo, ok, stato})` che conta chiamate e corpi — **da copiare** in `corsa.test.js`, non da importare (i test non condividono moduli: quattro DOM finti dichiarati nell'Esito della 11c).

## Sei decisioni prese qui, non da scoprire in browser

1. **L'attesa parlante è un lavoro con polling, non SSE né una risposta sincrona.** `POST /api/corsa` → `202 {run_id, stato: "in corso"}`; `GET /api/corsa/{run_id}` → `{run_id, stato: "in corso"|"finita", fasi: [nomi finora], secondi, ...fin}`; la UI interroga ogni **500 ms** e mostra le fasi con l'ultima in grassetto e il cronometro. Sotto 1 s di corsa (telaio 2×1) l'attesa nemmeno si vede (NNG, `07-ux-modellatore.md:93`). Lo stesso per `/api/ccx`.
2. **Due sidecar, due lock, nessuna coda.** `create_app(sidecar, cartella_corse, statici, porta, sidecar_lungo=None)`: `verifica`, `check`, `importa`, `confronto` sul primo; `corsa` e `ccx` sul `lungo` (che di default è lo stesso oggetto: i test con `SidecarInProcesso` non cambiano forma). `python -m nova` ne avvia due. Una seconda corsa mentre una gira è **409** dal server (un lavoro in corso alla volta), non dal lock. Issue #22 resta aperta per la coda con id; #20 si chiude qui (soffitto e scrittura atomica).
3. **Il Check gira a richiesta e sempre prima della corsa.** «verifica» (`⇧⌘⏎`) chiama `/api/check`; «corri» (`⌘⏎`) lancia il lavoro, e il sidecar rifà il Check (`comando_corsa`) — un rifiuto arriva come `esito: "rifiutato"` con i verdetti. Niente check a ogni comando: un telaio a metà non è rosso tutto il tempo.
4. **Il blocco «Corsa» è fisso nel pannello destro, sopra la Storia** (story 7). Dall'alto: stato del solutore; i due bottoni; l'attesa (solo mentre gira); l'ultima corsa; i verdetti. Con niente da dire, uno stato vuoto che insegna il gesto («Premi ⌘⏎ per lanciare tutte le analisi del modello, ⇧⌘⏎ per il solo Check Model»).
5. **«Stantia» è l'identità dello snapshot, non l'impronta.** `creaCorsa` tiene `lavoro.modello` = l'oggetto immutabile passato a «corri»; a ogni `disegna({modello})` è stantia se `modello !== lavoro.modello`. `⌘Z` fino a quello snapshot la fa tornare fresca; «apri» e una cronologia nuova la azzerano. Equivale all'impronta (stesso oggetto ⇒ stessa impronta) senza una rotta in più.
6. **«Corri il solido» è il minimo**: un campo per il percorso del `.inp` e un bottone nel blocco; stesso lavoro, stessa attesa, stessi errori; esito «corsa del solido · 7,5 s · cartella …». Niente vista del solido (T7), niente verdetti (ccx non ne produce).

## Annotazione dell'architect (10/09/2026)

Scritta nel worktree `/Users/mario/GitHub/NOVA-wt/interfaccia-12`, ramo
`feat/interfaccia-12-check-corsa`, HEAD **`f084120`** (`f5a41e1` è il padre, il merge della 11d su
`main`). Ogni riga `file:riga` citata dal piano è stata aperta contro
il codice a `f5a41e1`; la sezione 1 elenca le quattordici che non combaciavano, già corrette nel
testo. Punti di partenza **rimisurati qui**, non ricordati: `node --test` sui diciannove file di
`static/test/` → **610 pass, 0 fail**; pytest sull'intera `tests/` → **695 passed, 3 skipped in
42,92 s** (698 raccolti, i tre skip sono `wall_model.inp` non versionato). Le righe 30 e 31 del piano
combaciano tutte e due. Nota d'attrezzo: `pytest -q` in questo repo **non stampa il riepilogo** —
per leggere i conteggi serve `--tb=no -rs` senza `-q`, altrimenti chi chiude la giornata non ha un
numero da confrontare.

### 0. Il ramo non si chiama come la giornata

Premessa del brief e riga 15 del piano: ramo `feat/interfaccia-12-check-corsa`. Il ramo che esiste è
**`feat/interfaccia-12-importatore`** (`git -C … branch --show-current`), e accanto a lui stanno
`feat/interfaccia-11c` **e** `feat/interfaccia-11c-azioni`: è la seconda volta che un ramo di questa
serie porta il nome di un'altra giornata. Il nome è stato copiato da `feat/interfaccia-11d-importatore`
e la 12 non importa niente — importa il Check Model e la corsa. **Non l'ho rinominato**: rinominare
sposta anche la PR, ed è una decisione di chi la apre. Ma va deciso **prima** del dispatch: un ramo
che mente sul proprio contenuto è il primo posto dove si va a cercare quando fra un mese si chiede
«dov'è finito il Check Model». La riga 15 del piano ora dice la verità; il ramo no.

### 1. I puntamenti che non combaciavano

Quattordici, in ventuno punti del testo. Nessuno cambia *cosa* fare; tutti cambiano *dove guardare*,
ed è il tipo di errore che costa mezz'ora a chi apre il file e non trova quello che il piano
promette. Corretti nel testo del piano.

| citato | vero | dove |
|---|---|---|
| `nova/server.py:61-110` `SidecarProcesso` | **62-110** (61 è vuota) | riga 38, Task 1 *Files*, Task 1 step 3 |
| `nova/server.py:46-58` `SidecarInProcesso` | **47-59** | riga 38, Task 1 *Files* |
| `SidecarInProcesso.chiedi` `:52-58` | **53-59** | Task 1 step 3 |
| «lo stdout chiuso, com'è oggi» `:96-98` | **95-98** (`if not riga:` è la 95) | Task 1, ingressi degeneri |
| `create_app` `:160`, rotte `:160-223` | **162**, **162-223** | Task 2 *Files*, Task 2 step 4 |
| `static/app.js:189-231` `creaFile` | **189-224** | riga 46 |
| `static/app.js:565-607` `ridisegna` | **565-608** (`file.disegna` è a 605, esatta) | riga 46 |
| `static/app.js:190-227` `suApertura`/`suImportazione` | **190-206** e **212-222** | Task 5 *Interfaces* |
| `static/tastiera.js:20-45` `TASTI` | **14-50** (`importa` a `:23` è esatta) | riga 47, Task 4 *Files* |
| `static/tastiera.js:118-131` `voceDaEvento` | **117-130** | riga 47 |
| `static/test/tastiera.test.js:77-95` | **77-96** | riga 47 |
| `static/index.html:47-57` il pannello | **49-61** (l'innesto è fra `:58` e `:59`) | riga 48, Task 4 *Files* |
| `static/stile.css:262` `#storia-elenco` | **265** | riga 48 |
| `static/test/file.test.js:9-52` | **9-53** | riga 49, Task 4 step 1 |

E un conteggio: il Task 4 dice «i dodici id» e ne elenca **tredici** (corretto). Sempre nel Task 4:
tredici `test(` in coda a `corsa.test.js`, uno scritto per esteso e **dodici** come commento — non
undici; vedi R8.

**Combaciano invece**, verificate in questa sessione e da non rileggere: `nova/server.py` `:3-6` il
ruling di sicurezza, `:35` `_RUN_ID_RE`, `:80-82` il lock non bloccante, `:90-106` il ciclo di
`chiedi` con il `readline()` a `:94` senza timeout, `:107-108` l'`except Exception`, `:113` `_finale`,
`:183-189` `_o_400`, `:191-193` `/api/salute`, `:195-197` `/api/check`, `:199-204` `/api/importa`,
`:206-212` `/api/corsa`, `:214-223` `/api/ccx`; `nova/sidecar.py:132-147` `comando_corsa`;
`nova/corsa.py` `:40` `_TIMEOUT_S = 600`, `:134` «leggo i recorder», `:155-156` la scrittura,
`:159` `_fase`, `:237` `_errore_solutore`, `:306` `versione_opensees` dentro `risultati["run"]` (la
chiave che il Task 4 legge esiste); `nova/ccx.py` `:57` `_TIMEOUT_S = 1800`, `:94`/`:110`/`:126` le
tre fasi, `:135-137` la scrittura; `nova/check.py:16-20` `_v` e `:81-284` `check_model`, con i
**sedici** controlli distinti contati uno per uno e le forme dell'`oggetto` esattamente come la riga
42 le descrive (`nodo_su_asta` rende `[id_nodo, id_asta]` a `:156`, `carico_termico` rende
`(id_azione, id_asta)` a `:239`, `armatura_mancante` id di sezione a `:254`); `nova/__main__.py:31-43`;
`tests/test_server.py` `:19-30` la fixture, `:610-627` il 409 col suo `_FintoProcesso` che ha davvero
`stdout = None`, `:634-651` la pushover, e **tutti e quindici** i numeri di riga delle `POST` da
adeguare (66, 168, 191, 202, 308, 314, 446, 641 per `corsa`; 534, 549, 557, 562, 571, 576, 606 per
`ccx`); `static/file.js` `:24-33` `chiediJson`, `:73` `inCorso`, `:116` `occupato()`, `:171`/`:181`
il bottone «importazione…»; `static/app.js` `:100-102`, `:109` `scegli`, `:182-188` `creaStoria`,
`:239` `VOCI_PALETTE`, `:553-563` `esegui`, `:631` il `keydown` con il `preventDefault` a `:649`,
`:666-696` `dispatchVoce` con `apri`/`salva`/`importa` a `:687-691` e `palette` a `:696`;
`static/tastiera.js` `:77` `CON_COMANDO` (dove `enter` **non** c'è: la casella è libera), `:79`
`CON_COMANDO_E_SHIFT`, `:104-115` `daControllo` che a `:107` lascia passare il modificatore di
comando, `:136-155` `vociDellaBarra`, e `test/tastiera.test.js:149-150` la sonda dei tasti;
`static/numeri.js:182-195`; `static/index.html:63` `#messaggio`; `static/stile.css` `:47`, `:60-63`,
`:158`, `:165-168`, `:187`, `:225`, `:239-244`; `docs/ricerca/index.md:19` (ricerca 07) e le cinque
righe di `07-ux-modellatore.md` — `:93`, `:100`, `:101`, `:152`, `:169` — tutte e cinque esatte.

### 2. I contratti fra task, e i sette che non combaciavano

Il piano dichiara le interfacce due volte: nelle *Interfaces* a parole, e nel blocco di codice sotto.
Dove le due stesure divergono, chi esegue copia il codice e legge le parole — e ci crede.

- **T1 → T2 — `chiedi(req, su_fase)`**: combacia. La firma dichiarata è `su_fase=None` e il Task 2
  la chiama posizionale, `lungo.chiedi(req, su_fase)`. Il *seam* è qui, ed è quello giusto: il
  callback è l'unica cosa nuova che il chiamante deve sapere per vedere le fasi mentre arrivano.
- **T1 → T2 — `occupato()`: non combacia, e va cancellato** (R9). Il Task 1 lo produceva su due
  classi, il Task 2 lo dichiarava fra i *Consumes*, e **nessuna riga del Task 2 lo chiama**: il 409
  lo decide il dizionario `lavori`, come la decisione 2 dice apposta. Prova di cancellazione: tolto,
  non ricompare complessità da nessuna parte. Tolto da `SidecarProcesso`, da `SidecarInProcesso`, da
  `_SidecarFermo` e dai *Consumes* del Task 2.
- **T2 → T4 — le forme HTTP**: combaciano tutte, verificate una per una. `POST` → 202
  `{run_id, stato}` (+`cartella` per ccx) contro la `fetchSequenza` del test del Task 4; `GET` in
  corso → `{run_id, stato, fasi, secondi}` **senza** `esito` (il test lo asserisce, e `base` non lo
  porta); `GET` finita → `{...base, secondi, ...fin}`; 400 sul `GET` per `fase ∈ modello|importa|
  confronto|deck`; 409 con `motivo: "un'altra corsa è in corso"`, che `chiediJson` (`file.js:31`)
  rende come `e.message` **già in italiano** — la traduzione difensiva nel `catch` di `corri()` è
  per il solo 409 senza corpo, e la nota del piano lo dice bene. Una cosa che il piano non dice e
  che vale scritta: `fasi` si riempie **solo** da `su_fase`, mentre la vecchia `POST` sincrona la
  ricavava dalle `righe` (`server.py:212`). Le due strade danno lo stesso elenco perché
  `sidecar.rispondi` passa a `emetti` esattamente ciò che accoda — e `_SidecarFermo`, che emette una
  fase da `su_fase` e la ripete in `righe`, lo prova: il test si aspetta `["check model"]`, una sola.
- **T2 — `_avvia_lavoro` aveva due firme nello stesso step** (R10): il blocco di codice la
  dichiarava `(req, extra: dict)` e nove righe sotto il piano si correggeva da sé in
  `(req, con_cartella: bool)`. Vale la seconda; i corpi delle due rotte e il `return` sono stati
  riscritti di conseguenza.
- **T3 → T4 — `testoSolutore`**: non combaciava. Dichiarata `testoSolutore(salute)`, scritta
  `testoSolutore(salute, versione = null)`, chiamata a due argomenti dal Task 4. Corretta la
  dichiarazione.
- **T3 → T4 — i *Consumes***: il Task 3 dichiarava `cifre` **e** `conciso` da `numeri.js`, il suo
  modulo importa solo `conciso` (che chiama `cifre` da sé, `numeri.js:195`); il Task 4 dichiarava
  «`cifre` per i secondi» e non importa niente da `numeri.js`. Corretti tutti e due. È lo stesso
  difetto trovato nell'11d, punto 6: le *Interfaces* elencano ciò che sembra servire, il codice
  importa ciò che serve.
- **T4 → T5 — il ritorno di `creaCorsa`**: non combaciava. La riga delle *Interfaces* ne elencava
  sei, il codice ne rende **sette**, e la settima è `impostaSolutore` — proprio quella che il Task 5
  chiama con la risposta di `/api/salute`. Corretta.
- **T4 → T5 — `suVai`** (R11): il piano scriveva `suVai: ({tipo, id}) => { scegli(tipo, id);
  ridisegna(); }`, ma `scegli` (`app.js:109-124`) chiama già `ridisegna()` in coda. Due passate di
  disegno per clic. Corretto in `suVai: ({tipo, id}) => scegli(tipo, id)`.
- **T4 → T5 — i tipi di «vai»**: combaciano. `OGGETTO_PER_CONTROLLO` e `TIPI_NEL_DICT` producono
  quattro tipi soli — `nodo`, `asta`, `sezione`, `azione` — e `ARTICOLO` ne copre quattro; `scegli`
  li accetta tutti (`selezione = {tipo, id}` senza elenco), e `esiste` in `ridisegna`
  (`app.js:567-570`) conosce tutti e quattro, quindi un «vai» su un oggetto sparito fa cadere la
  selezione invece di sollevare — che è l'ingresso degenere del Task 5, verificato nel codice.

### 3. I rischi, con il loro ruling

**R1 — il thread lettore regge, e `terminate()` non lo lascia appeso.** *Ruling: si fa com'è
scritto.* `text=True` dà un `TextIOWrapper` e in Python 3 `for riga in stdout` **è** `readline()`:
la trappola del read-ahead nascosto era di Python 2. `bufsize=1` è il line-buffering, e conta sullo
**stdin** che scriviamo — il `flush()` c'è già (`server.py:91`). A `terminate()` il figlio muore, la
pipe va in EOF, il `for` finisce e il `finally` mette `None` in coda; e il thread è `daemon`, quindi
non trattiene l'uscita neppure se restasse fermo. *Costo se sbagliato*: ogni richiesta finirebbe sul
soffitto invece che sulla risposta — un server che pare vivo e non risponde mai. **Coda del ruling**:
in `__main__` i due `SidecarProcesso(...)` stanno fuori dal `try`, quindi se il **secondo** `Popen`
fallisce il primo resta orfano. Lasciato com'è, dichiarato: stesso `sys.executable` e stesso comando,
o falliscono tutti e due o nessuno.

**R2 — il thread del lavoro ha una sola via d'uscita catturata, e non basta.** *Ruling: l'`except`
del thread deve prendere anche `Exception`, non solo `HTTPException`.* Il piano cattura il 409 del
lock e nient'altro. Ma `SidecarInProcesso.chiedi` **non ha nessuna rete**: `_sidecar.rispondi` lascia
risalire tutto — un `ValueError` di `_carica` su un modello storto, un `KeyError` di `su_fase` su un
evento senza `nome` — e `SidecarProcesso.chiedi` la sua rete ce l'ha solo *dentro* il `try` interno.
Un'eccezione che scappa dal thread non ha nessuno a cui risalire: il lavoro resta `stato: "in corso"`
**per sempre**, ogni corsa successiva è 409 «un'altra corsa è in corso» finché il server non
riparte, e l'interfaccia interroga in eterno con i bottoni spenti. *Costo se sbagliato*: un difetto
solo, e il prodotto è morto — e nessun test lo prende. Applicato allo step 4 del Task 2, con il suo
ingresso degenere e il mutante 11.

**R3 — `TestClient` e i thread: il thread parte, ma il test non deve scommetterci.** *Ruling: niente
`time.sleep(0.05)`; `_SidecarFermo` prende un secondo `Event`, `partito`, e il test fa
`assert fermo.partito.wait(2)`.* `_avvia_lavoro` chiama `start()` **prima** di rendere il 202,
quindi quando il client legge la risposta il thread esiste già; ma *quanto* ha girato dipende dallo
scheduler, e 50 ms sono una scommessa. Sul resto nessun problema: `TestClient` serve le rotte sync in
un threadpool anyio, il lavoro è un `threading.Thread` normale e non dipende dal portale — nessun
deadlock. *Costo se sbagliato*: un rosso a intermittenza in una suite di una persona sola, cioè il
modo più caro di smettere di credere ai test. Due righe.

**R4 — il 400 sul `GET` è idempotente, e va bene.** *Ruling: `_o_400` resta sul `GET`, e i due test
del `fase: "deck"` devono asserire il **codice**, non solo il corpo.* Il corpo del lavoro finito non
cambia più, quindi ogni `GET` dopo il primo 400 dà lo stesso 400: è un fatto stabile, non una
condizione di corsa. Ma se il test riscritto legge solo `d["fase"] == "deck"`, il mutante 4
sopravvive — senza `_o_400` la `GET` rende **200 con lo stesso corpo** e l'asserzione passa lo
stesso. *Costo se sbagliato*: un mutante dichiarato rosso che è verde, cioè una prova che mente.
**Costo dichiarato e non risolto oggi**: `chiediJson` tiene solo `dati.motivo` e butta il resto,
quindi sul `fase: "deck"` l'interfaccia mostra il motivo e perde i `verdetti_check` che
`comando_corsa` ha già messo nello stesso corpo — l'utente legge «una sola pushover per modello» e
non vede i sedici verdetti che glielo spiegano. In coda al piano, fra i debiti.

**R5 — «stantia» per identità dello snapshot: accettabile, e per una ragione più forte di quella
scritta.** *Ruling: si tiene l'identità, non l'impronta.* Il caso che il brief teme — «apri» dello
stesso file che crea un altro oggetto e marca stantia una corsa ancora buona — **non nasce**, perché
`suApertura` chiama `corsa.azzera()` (Task 5) e dopo un'apertura non c'è nessun lavoro da marcare.
Dentro una cronologia sola l'identità è poi *esatta*, non approssimata: `applica`
(`cronologia.js:20`) rende `c` **invariata** quando il riduttore restituisce lo stesso oggetto,
quindi un comando che non cambia niente non invecchia la corsa; e `indietro`/`avanti`
(`cronologia.js:28-29`) riusano gli **stessi** oggetti snapshot, quindi `⌘Z` fino allo snapshot della
corsa la fa tornare fresca davvero, non per caso. *Costo se sbagliato*: solo se qualcuno toglie
`azzera()` da `suApertura` — e quello è già un ingresso degenere del Task 5.

**R6 — `⌘⏎` e `⇧⌘⏎` sono liberi, ma la premessa era falsa.** *Ruling: si prendono tutti e due.*
Correzione della premessa del brief: **un `<form>` nella pagina c'è**, `static/index.html:88`
`<form id="comando" hidden>`. La conclusione regge lo stesso, per tre ragioni indipendenti: in Chrome
su Mac `⌘⏎` e `⇧⌘⏎` sono gesti da **link** (apri in scheda nuova, in secondo o in primo piano) e la
pagina non ha un solo `<a>`; `app.js:649` chiama `preventDefault()` **prima** di `eseguiVoce`, quindi
nessun default del browser sopravvive al dispatch; e dentro `#comando-campo` il tasto arriva sì fino
a `dispatchVoce` (`daControllo` lascia passare il modificatore, `tastiera.js:107`), ma lo ferma la
guardia del campo (`app.js:710`), che rimette il fuoco e torna. In `CON_COMANDO` (`tastiera.js:77`)
`enter` non c'è: `o, s, z, k, i` e basta. *Costo se sbagliato*: una scheda vuota che si apre mentre
la corsa parte — rumoroso, non silenzioso: la prima prova del Task 6 lo vede.

**R7 — la coda non svuotata: sì, il filtro sull'`id` le scarta.** *Ruling: sì, e i due costi vanno
scritti invece che scoperti.* Le righe in ritardo della richiesta 1 arrivano alla 2 e cadono sul
`if grezza.get("id") != rid: continue` — è il filtro che il protocollo ha già
(`docs/ricerca/03-stack-tecnico.md:195`). I due costi: (1) ogni riga stantia **rimette in moto** il
`get(timeout=self.soffitto_s)`, quindi la richiesta 2 può aspettare più del soffitto se la 1 sputa
righe a raffica; (2) dopo un soffitto il **processo** è ancora impegnato sulla richiesta 1, quindi la
2 entra in coda dietro di lei dentro il sidecar, e con un sidecar davvero piantato ogni corsa
successiva costa 660 s e finisce in errore, per la vita del server. La ricerca 03 (`:121`) chiede
«riavvio del sidecar al comando successivo» e il piano non lo fa. *Non ucciderlo oggi*: il soffitto è
l'ultima rete, non il caso normale, e riavviare vuol dire rifare anche il thread lettore. Il debito
va in coda al piano con il suo nome — fatto.

**R8 — i dodici corpi-commento sono una specifica, non un segnaposto.** *Ruling: l'implementer li
scrive **per esteso**, e il reviewer li conta.* In coda a `corsa.test.js` il Task 4 mette tredici
`test(`: uno scritto, dodici come commento (il piano diceva undici). Numero da verificare al
commit: `grep -c '^test(' static/test/corsa.test.js` deve dare **13** più i test del Task 3.
*Costo se sbagliato*: dodici comportamenti dichiarati e non provati, in un file dove **cinque dei
dieci mutanti** puntano proprio lì (6, 7, 8, 9 e, di riflesso, 10).

**R9 — `occupato()` non passa la prova di cancellazione.** Vedi §2. *Costo se sbagliato*: due metodi
morti su un'interfaccia che tre classi devono soddisfare per sempre.

**R10 — `_avvia_lavoro` a due firme.** Vedi §2. *Costo se sbagliato*: si copia il primo blocco, il
`cartella: None` finisce nel corpo della `POST /api/ccx` e la riga «corsa del solido … · cartella
null» arriva fino al browser.

**R11 — `suVai` disegnava due volte.** Vedi §2. *Costo se sbagliato*: nessuno visibile, due passate
di disegno per clic. È il tipo di riga che poi si copia per anni.

**R12 — il CSS del blocco riscrive regole che `stile.css` ha già.** *Ruling: `#corsa label` entra nel
selettore di `#file label` (`:232`), `#corsa-inp` in quello di `#file-percorso, #comando-campo`
(`:233`) e nel suo `:focus-visible` (`:237`).* Tre selettori estesi al posto di sei righe nuove.
*Costo se sbagliato*: due definizioni della stessa casella di testo, che divergono al primo ritocco
della palette e nessuno se ne accorge finché non le si guardano vicine.

**R13 — la fine della corsa non la sente nessuno.** *Ruling: `aria-live="polite"` su `#corsa-ultima`,
e **solo** lì.* L'errore passa già da `dì()` (`#messaggio`, `aria-live`, `index.html:63`), ma l'esito
buono non lo annuncia niente: chi non guarda lo schermo non sa che la corsa è finita. I secondi che
salgono ogni 500 ms in una regione viva sarebbero invece rumore continuo, e le fasi si riscrivono
per intero a ogni giro. Un attributo. *Costo se sbagliato*: un attributo di troppo; al contrario, la
fine di un'attesa invisibile a chi ascolta.

**R14 — il cronometro sfarfalla a quattro decimali.** *Ruling: `testoAttesa` arrotonda al decimo,
`testoUltima` no.* Sotto 1 `cifre` dà **quattro** decimali (`numeri.js:183`), quindi l'attesa
scriverebbe «0,5231 s» e ballerebbero tre cifre a ogni giro di polling. La durata **misurata** resta
intera: «1,25 s» è un fatto del server, e il test del Task 4 lo asserisce alla lettera. *Costo se
sbagliato*: un numero che balla mentre l'utente aspetta, cioè il contrario esatto di «attesa
parlante» (`07-ux-modellatore.md:152`).

**R15 — `fetchSequenza` muore sulla prima `GET` se copia `fetchFinta` alla lettera.** *Ruling: la
`fetch` finta accoda `opzioni.body ? JSON.parse(opzioni.body) : null`.* `fetchFinta`
(`file.test.js:44-53`) fa `JSON.parse(opzioni.body)` senza guardia perché finora ogni chiamata era
una `POST`; ma `chiediJson` senza corpo passa `{}` (`file.js:25`), e `JSON.parse(undefined)`
**solleva**. Il `null` tiene anche `spia.corpi` allineato a `spia.rotte`, che è quello che il primo
test asserisce (`spia.corpi[0]`). *Costo se sbagliato*: il primo test del Task 4 muore con un
`SyntaxError` che non c'entra niente con `creaCorsa`, e ci si perde mezz'ora a cercarlo in
`corsa.js`.

### 4. Gli ingressi degeneri: cosa c'era, cosa manca, cosa non era verificabile

Cinque task su sei scrivono codice e tutti e cinque avevano la sezione, tutti sopra il minimo di due
righe con condizione **e** oracolo: T1 cinque, T2 sei, T3 nove, T4 undici, T5 quattro. Il **Task 6
non scrive codice** (`Files: nessuno`) e porta già la forma rigida `- nessun ingresso esterno`: non
si tocca.

**Due righe avevano un oracolo sbagliato o non verificabile**, riscritte:

- T1 — «`scrivi_atomico` con `os.replace` che solleva → **la destinazione non esiste**» contraddice
  il test dello step 5, che asserisce che la destinazione **tiene il contenuto di prima**. Sono i due
  casi (prima scrittura, riscrittura), e l'oracolo li deve dire tutti e due.
- T2 — «con `SidecarInProcesso` il thread finisce **prima** che il client faccia la prima `GET`» non
  è un oracolo, è una scommessa sullo scheduler. Riscritto: la prima `GET` può dire l'una o l'altra,
  e `_attendi` arriva a `finita` in tutti e due i casi.

**Sei righe che nessun task enumerava**, aggiunte al task indicato:

- T1 — `due chiedi di fila sullo stesso sidecar dopo un soffitto → le righe in ritardo della prima
  (id 1) non entrano nella risposta della seconda: le scarta il filtro sull'id` (è R7, e senza questa
  riga il comportamento resta un'assunzione).
- T2 — `il sidecar solleva un'eccezione qualunque dentro chiedi (non un HTTPException) → il lavoro
  diventa finita con esito: "errore", fase: "sidecar", e la corsa successiva parte` (è R2, la riga
  più importante della giornata).
- T3 — `testoAttesa({fasi: []}, 1000) senza avvioMs → 0 s, mai «NaN s»`.
- T3 — `righeVerdetti con un esito fuori dai tre → parola è l'esito stesso e la riga resta, non
  sparisce` (il `?? String(x.esito)` c'è nel codice e non lo prova nessuno).
- T4 — `la GET risponde 404 a metà polling (server riavviato sotto) → suErrore("nessuna corsa <id>"),
  l'attesa sparisce, nessun lavoro registrato, i bottoni tornano attivi` (il piano copriva la rete
  caduta, non il server ripartito — e in una giornata di prove il server riparte spesso).

**Per chi dispaccia**: qui la sezione è `**Ingressi degeneri:**` in grassetto, ma
`dispatch-gate.py` pretende nel brief il **titolo** `## Ingressi degeneri`. Si copia il contenuto
sotto un titolo, non il grassetto. Stessa nota dell'11d, stesso hook.

### 5. Chi esegue, con quale modello, in quale ordine

| task | subagente | modello | skill-gate | giro | comincia dopo |
|---|---|---|---|---|---|
| 1 — `server.py` lettore + `corsa.py`/`ccx.py` atomici | `backend-engineer` | `sonnet` | **sì** | A | — |
| 2 — i lavori, il secondo sidecar, `__main__` | `backend-engineer` | **`opus`** | **sì** | B | 1 |
| 3 — le pure di `corsa.js` | `frontend-engineer` | `sonnet` | **sì** | A | — |
| 4 — `creaCorsa`, il blocco, `⌘⏎`/`⇧⌘⏎` | `frontend-engineer` | **`opus`** | **sì**, `impeccable` in modo **Operate** | B | 3 |
| 5 — la cucitura in `app.js` | `frontend-engineer` | `sonnet` | **sì**, `impeccable` in modo **Operate** | C | 1, 2, 3, 4 |
| 6 — la prova a mano | **il controller**, col browser | — | — | D | 5 |

**I giri del piano sono giusti, confermati: A = 1 ‖ 3, B = 2 ‖ 4, C = 5, D = 6.** Verificato file per
file che dentro un giro nessun implementer scrive dove scrive l'altro:

| file | unico task che lo scrive |
|---|---|
| `nova/server.py` | 1 (il lettore), poi 2 (i lavori) — **mai insieme**: da qui l'arco 2 ← 1 |
| `nova/corsa.py`, `nova/ccx.py`, `tests/test_corsa.py` | 1 |
| `nova/__main__.py` | 2 |
| `tests/test_server.py` | 1 (in coda), poi 2 (l'helper e i quindici adeguamenti) — **mai insieme** |
| `static/corsa.js`, `static/test/corsa.test.js` | 3 (le pure), poi 4 (`creaCorsa`) — **mai insieme** |
| `static/index.html`, `static/stile.css`, `static/tastiera.js`, `static/test/tastiera.test.js` | 4 |
| `static/app.js` | 5 |

Il Task 4 **non dipende dal codice** del Task 2, solo dalle sue forme: i suoi test hanno una `fetch`
finta, e il contratto sta scritto in §2. Per questo B è un parallelo vero e non un finto parallelo.

**I modelli.** Il tetto settimanale di `opus` del 09/09 sera potrebbe essere ancora chiuso, quindi
`sonnet` è il default e `opus` va chiesto solo dove il piano lascia davvero da decidere. Restano due:

- **Task 2 in `opus`**: è l'unico task dove il piano si contraddice da solo (due firme di
  `_avvia_lavoro`), dove entra la concorrenza vera (un thread, due lock, un dizionario condiviso),
  dove va aggiunto un ramo che il piano non aveva (R2), e dove quindici test esistenti vanno
  riscritti **uno per uno** con un salto da sincrono ad asincrono. È il task che, sbagliato, blocca
  il server per sempre.
- **Task 4 in `opus`**: è il più grande e il meno scritto — dodici corpi di test da scrivere per
  esteso, un DOM finto nuovo con sei capacità in più, una `fetch` a sequenza, ~150 righe di
  `creaCorsa`, il CSS, l'HTML, la tastiera. Cinque mutanti su dieci puntano qui.

Gli altri tre stanno in `sonnet` perché il codice è **scritto per intero nel piano** e i test pure:
il Task 1 (lettore e `scrivi_atomico`), il Task 3 (funzioni pure con i loro test già stesi), il Task
5 (dieci righe di cucitura, tutte elencate nelle *Interfaces*). **Se `opus` è chiuso**, il Task 2 e
il Task 4 si dispacciano su `sonnet` lo stesso: sono anche i due che questa annotazione ha specificato
di più (R2, R3, R4, R8, R10, R15 stanno tutti lì), e il divario si copre con quelle righe. Ciò che
**non** va fatto è dispacciarli con il piano com'era.

**Skill-gate `sì` su tutti e cinque i task che scrivono codice**, nessuna deroga: nessuno di questi
è meccanico. Quale skill, lo sceglie l'agente assegnato — `impeccable` in modo **Operate** è
l'unica nominata, sui due task che toccano superficie che una persona guarda (4 e 5), come chiede il
brief. `impeccable`: mai «cream palette», la palette è quella dei Global Constraints (riga 21), e il
rosso è il **filetto**, non il testo.

### 6. La ricerca che regge ogni task

Aperto `docs/ricerca/index.md` prima di annotare: la **03** è alla riga **15**, la **07** alla riga
**19**. Le cinque righe di `07` che il piano cita in testa sono esatte tutte e cinque (`:93`, `:100`,
`:101`, `:152`, `:169`), e la mappa dei dieci principi è la stessa dell'11c e dell'11d: 148 = P1,
149 = P2, 150 = P3, 151 = P4, **152 = P5**, 155 = P8.

**Il piano dichiarava una ricerca sola, la 07, e per T1-T2 non ne aveva nessuna. Ne ha una**, e non
di sponda: la **03** è la ricerca che ha deciso il sidecar, e parla proprio di quello che il Task 1
costruisce.

| task | riferimento | perché conta qui |
|---|---|---|
| 1 | `docs/ricerca/03-stack-tecnico.md:121` | «il ponte deve trattare la morte del figlio come esito normale: `exit_code`, ultime N righe stderr, stato "fallito", riavvio del sidecar al comando successivo» — il soffitto e `fase: "sidecar"` sono le prime due metà; il riavvio è la terza, e resta debito (R7) |
| 1 (il filtro `id`) | `docs/ricerca/03-stack-tecnico.md:195` | «una riga JSON per richiesta su stdin, una o più righe JSON su stdout con lo stesso `id`»: è il patto che rende innocue le righe in ritardo dopo un soffitto |
| 2 | `docs/ricerca/07-ux-modellatore.md:169` | «Analisi: non-blocking, fasi nominate, esito con durata misurata» — il lavoro con `202` **è** il non-blocking, e `secondi` del sidecar **è** la durata misurata |
| 2 (il secondo sidecar) | `docs/ricerca/03-stack-tecnico.md:121` | «il solutore **deve** vivere in un processo separato dalla UI»: due sidecar sono la stessa regola applicata due volte, così `/api/salute` non muore dietro una pushover |
| 3 | `docs/ricerca/07-ux-modellatore.md:100` | doppio canale: `PAROLA` **è** il canale testuale che affianca il punto rosso, e `righeVerdetti` non rende mai una `ragione` vuota |
| 3 (il «vai») | `docs/ricerca/07-ux-modellatore.md:101` | «il controllo che contraddice accanto al numero»: `vai` porta l'utente **sull'oggetto** che il verdetto nomina, invece di lasciargli cercare il nodo 3 in un albero |
| 4 | `docs/ricerca/07-ux-modellatore.md:152` | P5, attesa parlante mai percentuale inventata: fasi nominate, cronometro, «corro…» sul bottone, errore col motivo del server e il registro sotto un `<details>` |
| 4 (sotto il secondo) | `docs/ricerca/07-ux-modellatore.md:93` | NNG: sotto 1 s nessun indicatore, sopra 10 s fasi senza percentuale — è perché sul telaio 2×1 l'attesa quasi non si vede, e va bene così |
| 5 | `docs/ricerca/07-ux-modellatore.md:149` | P2, seleziona poi agisci, nessuna finestra che blocca: «vai» passa da `scegli`, la stessa porta di ogni altra selezione, e la corsa non apre niente |
| 6 | `docs/ricerca/07-ux-modellatore.md:169` | la prova a mano verifica esattamente quella riga, sul telaio 2×1, sul MURO 1 e su un modello malato |

**Sei task su sei con un riferimento, nessun «nessuno».** Come l'11c e l'11d, e all'opposto della
misura dell'08/09 (nove ricerche, un piano che ne cita una una volta).

### 7. I mutanti: due che non provano quello che dicono, uno che manca

Corretti nell'elenco in coda al piano.

- **Mutante 1 non fa rosso, fa appendere.** Togliere il `timeout=self.soffitto_s` non manda in rosso
  il test del sidecar muto: lo lascia bloccato su `queue.get()` **per sempre**, e un test appeso non
  è una prova (né si distingue da una suite lenta). Il mutante che vale è l'altro: **tieni** il
  timeout e togli il solo `except queue.Empty` — l'eccezione finisce nell'`except Exception` esterno,
  il motivo diventa «Empty: » invece di «nessuna risposta dal sidecar entro 0.2 s», e il test è rosso
  in 0,2 s.
- **Mutante 4 sopravvive** se il test riscritto legge solo `d["fase"]`. Vedi R4: serve
  `assert g.status_code == 400`.
- **Mutante 11, nuovo**: l'`except Exception` del thread tolto, con un sidecar finto che solleva un
  `RuntimeError`. Oggi non lo prende nessuno, ed è il difetto che blocca il server per sempre (R2).

Gli altri otto sono uccidibili dai test come sono scritti, verificato uno per uno. Due meritano una
nota: il **7** (`stantia` con `JSON.stringify`) muore solo perché il test usa `{ ...m }`, cioè una
copia **strutturalmente identica** — con un modello diverso passerebbe, e il commento nel piano lo
dice bene; il **9** (`generazione` non guardata) muore solo se il corpo-commento del test `azzera`
viene scritto davvero (R8).

### 8. I debiti, per il ticket di chiusura

Dichiarati dal piano stesso, in coda: SSE, la coda con id (#22), il selettore dei casi, la vista del
solido (T7), il rendering dei risultati (13), `articolo` nei verdetti, «Annulla» di una corsa,
l'importazione con la stessa attesa. Aggiunti là dalla presente annotazione: il riavvio del sidecar
dopo un soffitto, i `verdetti_check` persi sul 400, la potatura di `lavori`.

Visti qui e non scritti da nessuna parte:

1. **«Annulla» manca, ed è l'unico pezzo di P5 che manca.** `07-ux-modellatore.md:152` chiede cinque
   cose e la giornata ne dà quattro: fasi nominate ✓, durata misurata ✓, errore col rimando al
   registro ✓, niente percentuale ✓, **«Annulla sempre vivo» ✗**. Il piano lo mette fuori seduta per
   il motivo giusto (il sidecar non ha un comando d'interruzione, e il tetto è il timeout di
   OpenSees), ma sul MURO 1 questo vuol dire che chi ha lanciato per sbaglio aspetta e basta. Va
   detto che manca per un buco nel **protocollo**, non per una scelta d'interfaccia.
2. **Il Task 5 non ha un solo test automatico.** Sei innesti in `app.js`, quattro ingressi degeneri,
   un ramo nuovo in `dispatchVoce`, e l'unico oracolo è la prova a mano del Task 6. **È la quarta
   giornata di fila**: voce 8 dell'11b, voce 3 dell'11c, voce 1 dell'11d, questa. Il task più cucito
   è ancora il meno protetto, e non è un caso isolato ma la forma del piano.
3. **Il 409 dice due frasi diverse per la stessa cosa.** Il rifiuto locale di `creaCorsa` dice «una
   corsa è già in corso», il 409 del server dice «un'altra corsa è in corso». Sono davvero due casi
   (io sto già correndo / qualcun altro sta correndo), ma con una sola scheda aperta l'utente non
   può distinguerli, e leggerà due messaggi per un solo fatto.
4. **Una seconda scheda rompe il patto senza dirlo.** «Un lavoro alla volta» vive nel dizionario
   `lavori` del server, quindi vale su **tutte** le schede; ma l'ultima corsa e i verdetti vivono in
   `corsa.js`, cioè per scheda. Due schede sullo stesso server: la seconda vede 409 senza sapere
   perché, e il suo blocco «Corsa» resta vuoto mentre una corsa gira davvero.
5. **`fasi` può ripetersi e nessuno lo dichiara.** La modale rilancia OpenSees a scala di modi
   (`corsa.py:_tentativi`), quindi «scrivo il deck e lancio OpenSees (modale, N modi)» esce più volte
   con N diversi. L'`<ol>` li mostra tutti, ed è giusto — ma è anche il caso che il Task 6 step 5 si
   aspetta senza averlo mai scritto in un contratto.

**Per il roster** (meta-roster, non scope di questo piano): il debito 2 è alla **quarta** occorrenza
consecutiva, e l'11d lo aveva già segnalato. Il ruolo che scrive la cucitura non ha oggi un modo di
provarla che non sia un browser e una persona. Vale guardarlo con `self-improving-agent` **prima**
della 13, non dopo: alla quinta non è più un debito, è la definizione del processo.

## Struttura dei file

| file | responsabilità | unico task che lo scrive |
|---|---|---|
| `nova/server.py` | `SidecarProcesso` con lettore e soffitto e `su_fase`; `sidecar_lungo`; i lavori e le rotte `POST/GET /api/corsa`, `/api/ccx` | Task 1 (sidecar), Task 2 (lavori) |
| `nova/corsa.py`, `nova/ccx.py` | scrittura atomica dei risultati | Task 1 |
| `nova/__main__.py` | due sidecar | Task 2 |
| `tests/test_server.py` | i test dei due task, l'helper `_attendi` | Task 1, Task 2 |
| `static/corsa.js` (nuovo) | funzioni pure + `creaCorsa` | Task 3 (pure), Task 4 (`creaCorsa`) |
| `static/test/corsa.test.js` (nuovo) | i test dei due task | Task 3, Task 4 |
| `static/tastiera.js`, `static/test/tastiera.test.js` | `⌘⏎` corri, `⇧⌘⏎` verifica | Task 4 |
| `static/index.html`, `static/stile.css` | il blocco «Corsa» | Task 4 |
| `static/app.js` | la cucitura | Task 5 |

Giri: A = Task 1 ‖ Task 3; B = Task 2 ‖ Task 4; C = Task 5; D = Task 6 (prova a mano).

---

### Task 1: `SidecarProcesso` — il lettore col soffitto, il callback di fase, la scrittura atomica

**Files:**
- Modify: `nova/server.py:62-110` (`SidecarProcesso`), `nova/server.py:47-59` (`SidecarInProcesso.chiedi` accetta `su_fase`)
- Modify: `nova/corsa.py:155` e `nova/ccx.py:135` (scrittura atomica), `nova/corsa.py` (funzione `scrivi_atomico`)
- Test: `tests/test_server.py` (in coda), `tests/test_corsa.py` (in coda, per `scrivi_atomico`)

**Interfaces:**
- Consumes: niente di nuovo.
- Produces:
  - `SidecarProcesso(solutore=None, avvia=None, soffitto_s=660.0)`; `chiedi(req, su_fase=None) -> list[dict]` — `su_fase(evento_dict)` viene chiamato **mentre** le righe arrivano, una per evento di fase (prima di accodarle in `righe`); a riga muta oltre `soffitto_s` ritorna `[{"esito":"errore","fase":"sidecar","motivo":"nessuna risposta dal sidecar entro 660 s"}]` e il lock si libera. `SidecarInProcesso.chiedi(req, su_fase=None)` con la stessa firma (chiama `su_fase` su ogni evento).
  - `SOFFITTO_S = 660.0` (modulo `nova/server.py`): `_TIMEOUT_S` di OpenSees (`corsa.py:40`) più un minuto — una riga di fase arriva a ogni gradino della modale, quindi un sidecar sano non tace mai così a lungo.
  - `nova/corsa.py`: `scrivi_atomico(percorso: Path, testo: str) -> None` — scrive `percorso.with_suffix(percorso.suffix + ".tmp")` nella stessa cartella e poi `os.replace`.

**Ingressi degeneri:**
- il sidecar non risponde entro `soffitto_s` → `[{"esito":"errore","fase":"sidecar","motivo":"nessuna risposta dal sidecar entro N s"}]`, il lock è libero subito dopo, il processo non viene ucciso (è del chiamante)
- il sidecar chiude lo stdout → `{"esito":"errore","fase":"sidecar","motivo":"il sidecar ha chiuso lo stdout"}` (com'è oggi, `:95-98`)
- `su_fase` assente → nessuna chiamata, `righe` uguale a oggi
- `su_fase` che solleva → l'eccezione **non** uccide la lettura: si prende nel `except Exception` di `chiedi` (`:107-108`) come oggi per le righe non JSON; documentato, non protetto oltre
- `scrivi_atomico` con `os.replace` che solleva → la destinazione resta com'era (assente se non c'era, col contenuto di prima se c'era), il `.tmp` resta — è la prova dell'interruzione — e l'eccezione risale
- due `chiedi` di fila sullo stesso sidecar dopo un soffitto → le righe in ritardo della prima (`id` 1) non entrano nella risposta della seconda: le scarta il filtro sull'`id`

- [ ] **Step 1: Test rossi del lettore** — in coda a `tests/test_server.py`:

```python
# --- 12/T1: il lettore col soffitto, e le fasi che arrivano mentre arrivano --------------------

import io, threading, time


class _StdoutLento:
    """Uno stdout che consegna le righe quando glielo dici: `consegna(riga)`; `readline` aspetta."""
    def __init__(self):
        self._righe: list[str] = []
        self._c = threading.Condition()
    def consegna(self, riga: str) -> None:
        with self._c:
            self._righe.append(riga); self._c.notify()
    def readline(self) -> str:
        with self._c:
            while not self._righe:
                self._c.wait()
            return self._righe.pop(0)
    def __iter__(self):
        while True:
            r = self.readline()
            if r == "":
                return
            yield r


class _ProcessoFinto:
    def __init__(self):
        self.stdin = io.StringIO()
        self.stdout = _StdoutLento()


def _sp(soffitto_s=0.2):
    from nova.server import SidecarProcesso
    p = _ProcessoFinto()
    return SidecarProcesso(avvia=lambda: p, soffitto_s=soffitto_s), p


def test_un_sidecar_muto_e_un_errore_di_fase_sidecar_e_il_lock_si_libera():
    sp, p = _sp(soffitto_s=0.2)
    righe = sp.chiedi({"comando": "check", "modello": {}})
    assert righe == [{"esito": "errore", "fase": "sidecar", "motivo": "nessuna risposta dal sidecar entro 0.2 s"}]
    assert not sp._lock.locked()


def test_le_fasi_arrivano_al_callback_mentre_arrivano_non_alla_fine():
    sp, p = _sp(soffitto_s=2.0)
    viste: list[tuple[float, str]] = []
    esito: dict = {}

    def corsa():
        esito["righe"] = sp.chiedi({"comando": "corsa", "modello": {}},
                                   su_fase=lambda ev: viste.append((time.perf_counter(), ev["nome"])))
    t = threading.Thread(target=corsa); t.start()
    p.stdout.consegna('{"id": 1, "evento": "fase", "nome": "check model"}\n')
    time.sleep(0.05)
    t_fase = time.perf_counter()
    assert [n for _, n in viste] == ["check model"]          # già vista, e la corsa non è finita
    assert t.is_alive()
    p.stdout.consegna('{"id": 1, "esito": "ok", "secondi": 0.1}\n')
    t.join(timeout=2)
    assert esito["righe"][-1] == {"esito": "ok", "secondi": 0.1}
    assert viste[0][0] < t_fase


def test_una_riga_di_un_altro_id_non_conta_come_risposta():
    sp, p = _sp(soffitto_s=1.0)
    esito: dict = {}
    t = threading.Thread(target=lambda: esito.update(righe=sp.chiedi({"comando": "check", "modello": {}})))
    t.start()
    p.stdout.consegna('{"id": 99, "esito": "ok"}\n')
    p.stdout.consegna('{"id": 1, "esito": "rifiutato", "verdetti": []}\n')
    t.join(timeout=2)
    assert esito["righe"] == [{"esito": "rifiutato", "verdetti": []}]


def test_stdout_chiuso_resta_l_errore_di_oggi():
    sp, p = _sp(soffitto_s=1.0)
    esito: dict = {}
    t = threading.Thread(target=lambda: esito.update(righe=sp.chiedi({"comando": "check", "modello": {}})))
    t.start()
    p.stdout.consegna("")
    t.join(timeout=2)
    assert esito["righe"][-1]["motivo"] == "il sidecar ha chiuso lo stdout"


def test_sidecar_in_processo_chiama_su_fase_per_ogni_evento(tmp_path):
    from nova.server import SidecarInProcesso
    nomi: list[str] = []
    righe = SidecarInProcesso().chiedi({"comando": "corsa", "modello": leggi_fixture("telaio_2x1.nova.json"),
                                       "casi": None, "cartella": str(tmp_path / "c"), "solutore": "/nessun/OpenSees"},
                                      su_fase=lambda ev: nomi.append(ev["nome"]))
    assert nomi[0] == "check model"
    assert righe[-1]["esito"] in ("assente", "errore", "ok")
```

(`leggi_fixture` è già importata in testa a `tests/test_server.py`, come mostrano `:66` e `:191`.)

- [ ] **Step 2: Rosso** — `… -m pytest tests/test_server.py -k "muto or callback or altro_id or stdout_chiuso or su_fase" -p no:cacheprovider -q`: `TypeError` su `soffitto_s`/`su_fase`.

- [ ] **Step 3: Il lettore** — in `nova/server.py`, sostituisci `SidecarProcesso` (`:62-110`) con:

```python
SOFFITTO_S = 660.0   # `_corsa._TIMEOUT_S` (600) più un minuto: una riga di fase arriva a ogni gradino


class SidecarProcesso:
    """`python -m nova.sidecar` a vita lunga; una richiesta alla volta (lock non bloccante: la
    seconda è un 409 subito). Le righe le legge un thread e le mette in coda: `chiedi` le
    prende con un soffitto, così un sidecar muto è un errore di fase `sidecar` e non una
    richiesta HTTP appesa per sempre (#20)."""

    def __init__(self, solutore: str | None = None, avvia: Callable[[], subprocess.Popen] | None = None,
                 soffitto_s: float = SOFFITTO_S):
        avvia = avvia or (lambda: subprocess.Popen(
            [sys.executable, "-m", "nova.sidecar"], cwd=str(STATICI.parent),
            stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True, bufsize=1))
        self.p = avvia()
        self.solutore = solutore
        self.soffitto_s = soffitto_s
        self.n = 0
        self._lock = threading.Lock()
        self._righe: queue.Queue[str | None] = queue.Queue()
        threading.Thread(target=self._leggi, daemon=True).start()

    def _leggi(self) -> None:
        # `for riga in stdout` legge riga per riga con `bufsize=1`; a EOF esce, e `None` in
        # coda è il segnale che lo stdout è chiuso.
        try:
            for riga in self.p.stdout:
                self._righe.put(riga)
        finally:
            self._righe.put(None)

    def chiedi(self, req: dict, su_fase: Callable[[dict], None] | None = None) -> list[dict]:
        if not self._lock.acquire(blocking=False):
            raise HTTPException(409, detail={"esito": "errore", "fase": "sidecar",
                                             "motivo": "il sidecar è occupato da un'altra corsa"})
        try:
            self.n += 1
            rid = self.n
            corpo = {**req, "id": rid}
            if self.solutore and req.get("comando") not in _COMANDI_SENZA_SOLUTORE:
                corpo["solutore"] = self.solutore
            try:
                self.p.stdin.write(json.dumps(corpo) + "\n")
                self.p.stdin.flush()
                righe: list[dict] = []
                while True:
                    try:
                        riga = self._righe.get(timeout=self.soffitto_s)
                    except queue.Empty:
                        return [{"esito": "errore", "fase": "sidecar",
                                 "motivo": f"nessuna risposta dal sidecar entro {self.soffitto_s:g} s"}]
                    if riga is None or riga == "":
                        righe.append({"esito": "errore", "fase": "sidecar",
                                      "motivo": "il sidecar ha chiuso lo stdout"})
                        return righe
                    grezza = json.loads(riga)
                    if grezza.get("id") != rid:
                        continue
                    d = {k: v for k, v in grezza.items() if k != "id"}   # `id` non esce mai nel corpo HTTP
                    if "evento" in d and su_fase is not None:
                        su_fase(d)
                    righe.append(d)
                    if "evento" not in d:
                        return righe
            except Exception as e:  # pipe chiusa, riga non JSON: un errore di dominio, non un 500 muto
                return [{"esito": "errore", "fase": "sidecar", "motivo": f"{type(e).__name__}: {e}"}]
        finally:
            self._lock.release()
```

e `import queue` fra gli import (`:10-16`). In `SidecarInProcesso.chiedi` (`:53-59`):

```python
    def chiedi(self, req: dict, su_fase: Callable[[dict], None] | None = None) -> list[dict]:
        if self.solutore and req.get("comando") not in _COMANDI_SENZA_SOLUTORE:
            req = {**req, "solutore": self.solutore}
        righe: list[dict] = []

        def emetti(ev: dict) -> None:
            if su_fase is not None:
                su_fase(ev)
            righe.append(ev)

        righe.append(_sidecar.rispondi(req, emetti))
        return righe
```

Nota sul test 409 esistente (`tests/test_server.py:610-627`): il suo `_FintoProcesso` ha `stdout = None`, e il thread lettore farebbe `for riga in None` → `TypeError` nel thread (innocuo ma sporco). Cambia quel finto in `stdout = iter(())` (un iterabile vuoto): il lettore esce subito e mette `None` in coda; il test resta com'è.

- [ ] **Step 4: Verde** — gli stessi `-k` di prima, e `tests/test_server.py` intero: `test_sidecar_occupato_e_409…` deve restare verde.

- [ ] **Step 5: Scrittura atomica, test rosso** — in coda a `tests/test_corsa.py`:

```python
def test_scrivi_atomico_lascia_il_file_intero_o_niente(tmp_path, monkeypatch):
    from nova.corsa import scrivi_atomico
    import os
    dest = tmp_path / "risultati.nova.risultati.json"
    scrivi_atomico(dest, '{"a": 1}')
    assert dest.read_text(encoding="utf-8") == '{"a": 1}'
    assert not list(tmp_path.glob("*.tmp"))
    # il rename cade: la destinazione tiene il contenuto di prima, non un troncato
    def cade(*a, **k):
        raise OSError("disco pieno")
    monkeypatch.setattr(os, "replace", cade)
    with pytest.raises(OSError):
        scrivi_atomico(dest, '{"a": 2}')
    assert dest.read_text(encoding="utf-8") == '{"a": 1}'
```

- [ ] **Step 6: `scrivi_atomico`** — in `nova/corsa.py`, sopra `esegui`:

```python
def scrivi_atomico(percorso: Path, testo: str) -> None:
    """Il file dei risultati o è intero o non c'è (#20): tmp nella stessa cartella, poi
    `os.replace`, che sullo stesso filesystem è atomico. Un `.tmp` rimasto è la prova di
    un'interruzione, e `/api/risultati` non lo vede (cerca il nome finale)."""
    tmp = percorso.with_suffix(percorso.suffix + ".tmp")
    tmp.write_text(testo, encoding="utf-8")
    os.replace(tmp, percorso)
```

(`import os` in testa a `corsa.py`, `:4-11`.) Poi `corsa.py:155` diventa `scrivi_atomico(cartella / NOME_RISULTATI, json.dumps(risultati, ensure_ascii=False, indent=1))` e `ccx.py:135-136` `_corsa.scrivi_atomico(cartella / NOME_RISULTATI, json.dumps(risultati, ensure_ascii=False, indent=1))` con `from nova import corsa as _corsa` fra gli import di `ccx.py` (`:22-30`; `corsa.py` non importa `ccx`: niente ciclo — verificalo con `grep -n "import" nova/corsa.py`).

- [ ] **Step 7: Suite Python intera** verde (698 → 704 segni: sei test in più). `test_ccx_fa_il_giro_sul_protocollo` e i test che leggono `risultati_solido.json` restano verdi: il nome finale non cambia.

- [ ] **Step 8: Commit** — `feat(server): il sidecar legge con un soffitto e riporta le fasi mentre arrivano; risultati scritti atomici`

---

### Task 2: la corsa come lavoro, e il secondo sidecar

**Files:**
- Modify: `nova/server.py:162-223` (`create_app`, le rotte `corsa` e `ccx`), `nova/__main__.py:31-43`
- Test: `tests/test_server.py` (helper `_attendi`, i test elencati sopra, i test nuovi)

**Interfaces:**
- Consumes: `SidecarProcesso.chiedi(req, su_fase)` (Task 1). **Non** `occupato()`: il 409 lo decide il dizionario `lavori`, come dice la decisione 2 — vedi R9 dell'annotazione.
- Produces:
  - `create_app(sidecar, cartella_corse, statici=STATICI, porta=None, sidecar_lungo=None)`; `lungo = sidecar_lungo or sidecar`.
  - `POST /api/corsa {modello, casi?}` → **202** `{"run_id": "<12 hex>", "stato": "in corso"}`; **409** `{"esito":"errore","fase":"sidecar","motivo":"un'altra corsa è in corso"}` se un lavoro è in corso; 422 come oggi per i corpi malformati.
  - `GET /api/corsa/{run_id}` → 200 `{"run_id", "stato": "in corso", "fasi": [...], "secondi": <trascorsi>}` finché gira; a fine: `{"run_id", "stato": "finita", "fasi": [...], "secondi": <del sidecar, o trascorsi se manca>, ...fin}` con `fin` = la risposta finale del sidecar (`esito`, `verdetti_check`, `risultati`, `fase`, `motivo`, `coda_log`…); **400** con `fin` come corpo se `fin.fase` ∈ modello|importa|confronto|deck (la regola di `_o_400`, applicata al `GET`); 404 `{"motivo": "nessuna corsa <run_id>"}` se ignoto o malformato.
  - `POST /api/ccx {inp}` → 202 `{"run_id", "cartella", "stato": "in corso"}`; `GET /api/corsa/{run_id}` serve anche i lavori del solido (stessa forma, più `cartella`).
  - `Lavori` è un dict `run_id → {"stato", "fasi", "t0", "fin", "cartella"?}` protetto da un `threading.Lock`; **un lavoro in corso alla volta** su tutto il server (controllato sul dict, non sul lock del sidecar: vale anche per `SidecarInProcesso`).
  - `tests/test_server.py`: `_attendi(cliente, run_id, secondi=60) -> dict` — interroga `GET /api/corsa/{run_id}` ogni 10 ms finché `stato == "finita"` e ritorna la risposta JSON; fallisce con `assert` dopo `secondi`.

**Ingressi degeneri:**
- `GET /api/corsa/abc` (non 12 hex) → 404, mai un'eccezione
- `GET` di un lavoro finito con `fase: "deck"` → 400 con il corpo del sidecar (com'era sulla `POST` sincrona)
- `POST /api/corsa` mentre un lavoro è in corso → 409 immediato, il lavoro in corso non si accorge di niente
- il sidecar risponde con l'errore del soffitto (Task 1) → il lavoro diventa `finita` con `esito: "errore", fase: "sidecar"`, e il lavoro successivo **può partire** (il lock del sidecar è libero)
- `POST /api/corsa` con `SidecarInProcesso` → la prima `GET` può dire «in corso» o «finita» (dipende dallo scheduler, e il test non deve sceglierne una): `_attendi` arriva a `finita` con le fasi complete in tutti e due i casi
- il sidecar solleva un'eccezione qualunque dentro `chiedi` (non un `HTTPException`) → il lavoro diventa `finita` con `esito: "errore", fase: "sidecar"`, e la corsa successiva parte
- `su_fase` riempie `fasi` **mentre** la corsa gira: la `GET` a metà corsa le mostra (prova con un sidecar finto fermo su un `Event`)

- [ ] **Step 1: L'helper e i test adeguati** — in `tests/test_server.py`, dopo `_app_con_solutore` (`:26-30`):

```python
def _attendi(cliente, run_id: str, secondi: float = 60.0) -> dict:
    """Il lavoro dalla 12 è asincrono: la `POST` torna subito, l'esito si legge dalla `GET`."""
    import time
    t0 = time.perf_counter()
    while True:
        r = cliente.get(f"/api/corsa/{run_id}")
        assert r.status_code in (200, 400), r.text
        d = r.json()
        if d.get("stato") == "finita" or r.status_code == 400:
            return d
        assert time.perf_counter() - t0 < secondi, f"il lavoro {run_id} non finisce"
        time.sleep(0.01)


def _corsa(cliente, corpo: dict) -> dict:
    r = cliente.post("/api/corsa", json=corpo)
    assert r.status_code == 202, r.text
    return _attendi(cliente, r.json()["run_id"])
```

Poi adegua i test che oggi leggono la `POST` sincrona, uno per uno (i numeri di riga sono quelli a `f5a41e1`, prima delle tue aggiunte):
- `:65-71` `test_corsa_e_risultati`: `r = _corsa(cliente, {...})`, poi `r["esito"] == "ok"` e `cliente.get(f"/api/risultati/{r['run_id']}")`.
- `:164-173` `test_impronta_di_salva_uguale_a_hash_modello_di_una_corsa`: `r_corsa = _corsa(cliente, {"modello": m})` e leggi `r_corsa[...]` dove leggeva `r_corsa.json()[...]`.
- `:189-194` (solutore assente) e `:198-205` (solutore rotto, `coda_log`): erano 200 sincroni; ora `d = _corsa(cliente, ...)` e le stesse asserzioni su `d` (il `GET` è 200: `assente` e `fase: solutore` non sono 400, come prima).
- `:307-317` (campi extra → 422) e `:445-449` (caso con a capo → 422): restano sulla `POST`, invariati.
- `:634-651` pushover: `r = _corsa(cliente, {"modello": modello})`, `r["esito"] == "ok"`, poi `/api/risultati/{r['run_id']}` come oggi.
- `/api/ccx` a `:534`, `:571`, `:576` (giro riuscito) e `:549` (`..` lecito): `r = cliente.post("/api/ccx", ...)`, `assert r.status_code == 202`, poi `d = _attendi(cliente, r.json()["run_id"])` e le asserzioni su `d` (compreso `d["cartella"]`); `:557` e `:606` (`fase: deck` → 400): il 400 arriva dalla `GET`, e va **asserito come 400**, non solo letto — `rid = cliente.post(...).json()["run_id"]`, `_attendi(cliente, rid)`, poi `g = cliente.get(f"/api/corsa/{rid}")` con `assert g.status_code == 400 and g.json()["fase"] == "deck"`. Senza l'asserzione sullo stato il mutante 4 sopravvive (R4 dell'annotazione); `:562` (`cartella` nel corpo → 422): invariato.

- [ ] **Step 2: Test nuovi** — in coda a `tests/test_server.py`:

```python
# --- 12/T2: la corsa come lavoro: 202, fasi mentre arrivano, salute libera, 409 --------------

class _SidecarFermo:
    """Un sidecar che emette «check model», poi aspetta il via: serve a guardare il lavoro a metà.

    `partito` è l'appiglio del test: `time.sleep(0.05)` sarebbe una scommessa sullo scheduler,
    e un rosso a intermittenza costa più di un rosso (R3 dell'annotazione)."""
    def __init__(self):
        self.via = threading.Event()
        self.partito = threading.Event()
    def chiedi(self, req, su_fase=None):
        if req["comando"] == "verifica":
            return [{"esito": "assente", "percorso": None, "motivo": "finto", "dove_prenderlo": "—"}]
        if su_fase:
            su_fase({"evento": "fase", "nome": "check model"})
        self.partito.set()
        self.via.wait(timeout=5)
        return [{"evento": "fase", "nome": "check model"}, {"esito": "ok", "secondi": 0.5, "risultati": {}}]


def _cliente_con_lavoro_fermo(tmp_path):
    from nova.server import SidecarInProcesso, create_app
    fermo = _SidecarFermo()
    c = TestClient(create_app(SidecarInProcesso(), tmp_path / "corse", sidecar_lungo=fermo),
                   raise_server_exceptions=False, base_url="http://127.0.0.1")
    return c, fermo


def test_la_corsa_torna_subito_e_la_get_dice_la_fase_mentre_gira(tmp_path):
    c, fermo = _cliente_con_lavoro_fermo(tmp_path)
    r = c.post("/api/corsa", json={"modello": leggi_fixture("telaio_2x1.nova.json")})
    assert r.status_code == 202 and r.json()["stato"] == "in corso"
    rid = r.json()["run_id"]
    assert fermo.partito.wait(2), "il thread del lavoro non è partito"
    g = c.get(f"/api/corsa/{rid}").json()
    assert g["stato"] == "in corso" and g["fasi"] == ["check model"] and g["secondi"] >= 0
    assert "esito" not in g
    fermo.via.set()
    d = _attendi(c, rid)
    assert d["esito"] == "ok" and d["secondi"] == 0.5 and d["fasi"] == ["check model"]


def test_salute_e_check_restano_liberi_mentre_una_corsa_gira(tmp_path):
    c, fermo = _cliente_con_lavoro_fermo(tmp_path)
    rid = c.post("/api/corsa", json={"modello": leggi_fixture("telaio_2x1.nova.json")}).json()["run_id"]
    assert c.get("/api/salute").status_code == 200
    assert c.post("/api/check", json={"modello": leggi_fixture("telaio_2x1.nova.json")}).status_code == 200
    fermo.via.set(); _attendi(c, rid)


def test_una_seconda_corsa_mentre_una_gira_e_409(tmp_path):
    c, fermo = _cliente_con_lavoro_fermo(tmp_path)
    rid = c.post("/api/corsa", json={"modello": leggi_fixture("telaio_2x1.nova.json")}).json()["run_id"]
    r2 = c.post("/api/corsa", json={"modello": leggi_fixture("telaio_2x1.nova.json")})
    assert r2.status_code == 409 and "in corso" in r2.json()["motivo"]
    fermo.via.set(); _attendi(c, rid)
    # finita la prima, la seconda parte
    assert c.post("/api/corsa", json={"modello": leggi_fixture("telaio_2x1.nova.json")}).status_code == 202


def test_get_di_una_corsa_ignota_o_malformata_e_404(cliente):
    assert cliente.get("/api/corsa/abc").status_code == 404
    assert cliente.get("/api/corsa/0123456789ab").status_code == 404


def test_con_il_sidecar_in_processo_la_get_dice_subito_finita_con_le_fasi(cliente):
    d = _corsa(cliente, {"modello": leggi_fixture("telaio_2x1.nova.json")})
    assert d["stato"] == "finita" and d["fasi"][0] == "check model"


def test_un_rifiuto_del_check_e_una_corsa_finita_con_i_verdetti(cliente):
    m = leggi_fixture("telaio_2x1.nova.json")
    m["nodi"].append({"id": 99, "x": 5000.0, "z": 5000.0})   # nodo libero
    d = _corsa(cliente, {"modello": m})
    assert d["esito"] == "rifiutato"
    assert any(v["controllo"] == "nodi_liberi" and v["esito"] == "non_passato" for v in d["verdetti_check"])
```

- [ ] **Step 3: Rosso** — `-k "torna_subito or restano_liberi or seconda_corsa or ignota or dice_subito or rifiuto_del_check"`: 405/404 sulla `GET`, 200 invece di 202.

- [ ] **Step 4: I lavori** — in `nova/server.py`, la firma di `create_app` (`:162`) diventa

```python
def create_app(sidecar, cartella_corse: Path, statici: Path = STATICI, porta: int | None = None,
               sidecar_lungo=None) -> FastAPI:
    app = FastAPI(title="NOVA")
    cartella_corse = Path(cartella_corse)
    cartella_corse.mkdir(parents=True, exist_ok=True)
    # Il sidecar lungo prende le corse; l'altro resta libero per salute, check, importa e
    # confronto (#22, la parte che serve alla UI). Uno solo: è quello di prima.
    lungo = sidecar_lungo or sidecar
    lavori: dict[str, dict] = {}
    lavori_lock = threading.Lock()

    def _avvia_lavoro(req: dict, con_cartella: bool = False) -> dict:
        """Un lavoro alla volta: la seconda corsa è un 409 subito, e chi gira non se ne accorge."""
        with lavori_lock:
            if any(l["stato"] == "in corso" for l in lavori.values()):
                raise HTTPException(409, detail={"esito": "errore", "fase": "sidecar",
                                                 "motivo": "un'altra corsa è in corso"})
            run_id = secrets.token_hex(6)
            lavoro = {"stato": "in corso", "fasi": [], "t0": time.perf_counter(), "fin": None}
            if con_cartella:
                lavoro["cartella"] = str(cartella_corse / run_id)
            lavori[run_id] = lavoro
        req = {**req, "cartella": str(cartella_corse / run_id)}

        def corri() -> None:
            def su_fase(ev: dict) -> None:
                with lavori_lock:
                    lavoro["fasi"].append(ev["nome"])
            try:
                fin = _finale(lungo.chiedi(req, su_fase))
            except HTTPException as e:   # il 409 del lock del sidecar, se mai: è un esito, non un 500
                fin = e.detail if isinstance(e.detail, dict) else {"esito": "errore", "fase": "sidecar", "motivo": str(e.detail)}
            except Exception as e:
                # R2: un thread non ha nessuno a cui risalire. Senza questo ramo il lavoro resta
                # «in corso» per sempre, ogni corsa dopo è 409, e la UI interroga in eterno.
                fin = {"esito": "errore", "fase": "sidecar", "motivo": f"{type(e).__name__}: {e}"}
            with lavori_lock:
                lavoro["fin"] = fin
                lavoro["stato"] = "finita"

        threading.Thread(target=corri, daemon=True).start()
        return {"run_id": run_id, "stato": "in corso",
                **({"cartella": lavoro["cartella"]} if con_cartella else {})}
```

(`import time` fra gli import.) Le rotte:

```python
    @app.post("/api/corsa", status_code=202)
    def corsa(corpo: CorsaReq):
        return _avvia_lavoro({"comando": "corsa", "modello": corpo.modello, "casi": corpo.casi})

    @app.post("/api/ccx", status_code=202)
    def ccx(corpo: CcxReq):
        """Il deck del solido, dal disco dell'utente locale: `..` è lecito, il file si legge
        e basta, e la copia nella cartella della corsa si chiama sempre `solido.inp`."""
        return _avvia_lavoro({"comando": "ccx", "inp": str(Path(corpo.inp).resolve())}, con_cartella=True)

    @app.get("/api/corsa/{run_id}")
    def stato_corsa(run_id: str):
        if not _RUN_ID_RE.fullmatch(run_id) or run_id not in lavori:
            raise HTTPException(404, detail={"motivo": f"nessuna corsa {run_id}"})
        with lavori_lock:
            l = dict(lavori[run_id]); fasi = list(l["fasi"])
        base = {"run_id": run_id, "stato": l["stato"], "fasi": fasi}
        if l.get("cartella"):
            base["cartella"] = l["cartella"]
        if l["stato"] == "in corso":
            return {**base, "secondi": time.perf_counter() - l["t0"]}
        fin = _o_400({**l["fin"]})   # 400 per modello|importa|confronto|deck, come sulla POST di prima
        return {**base, "secondi": fin.get("secondi", time.perf_counter() - l["t0"]), **fin}
```

(Una firma sola, `con_cartella: bool`: nel piano ce n'erano due, e la seconda si correggeva da sé nove righe sotto — R10 dell'annotazione. `secrets` è già importato (`server.py:12`); `time` e `queue` no.)

- [ ] **Step 5: `__main__`** — `nova/__main__.py:31-43`:

```python
    sidecar = SidecarProcesso(solutore=args.solutore)
    lungo = SidecarProcesso(solutore=args.solutore)   # il secondo prende le corse (#22)
    try:
        app = create_app(sidecar, Path.cwd() / "corse", porta=porta, sidecar_lungo=lungo)
        ...
    finally:
        sidecar.p.terminate()
        lungo.p.terminate()
```

- [ ] **Step 6: Suite Python intera** verde (704 → 710 segni). Se `binario_opensees` c'è, i test veri della corsa passano dal lavoro: `_attendi` con 60 s basta (la pushover del 2×1 dura secondi).

- [ ] **Step 7: Commit** — `feat(server): la corsa è un lavoro con POST 202 e GET dello stato; un secondo sidecar per le corse`

---

### Task 3: `corsa.js` — le funzioni pure: verdetti, stato del solutore, attesa, stantia

**Files:**
- Create: `static/corsa.js`
- Test: `static/test/corsa.test.js`

**Interfaces:**
- Consumes: `conciso` (`static/numeri.js:195`) — `cifre` (`:182`) **non** si importa: `conciso` la chiama già.
- Produces (tutte esportate da `static/corsa.js`):
  - `OGGETTO_PER_CONTROLLO`: `{ nodi_coincidenti: "nodo", aste_sconnesse: "asta", aste_lunghezza_zero: "asta", aste_duplicate: "asta", nodi_liberi: "nodo", nodo_su_asta: "nodo", sezione_nulla: "asta", armatura_mancante: "sezione", carico_termico: "azione", vincoli_dedotti: "nodo" }` — il tipo dell'oggetto **selezionabile**; delle coppie si prende il primo elemento; `riferimenti` e `pushover` si leggono dai dict (`sezione` → sezione, `azione` → azione, `nodo`/`nodo_controllo` → nodo, `asta` → asta; `analisi`/`caso`/`calcestruzzo`/`acciaio` → nessun «vai»: il materiale non è selezionabile dall'ispettore).
  - `PAROLA = { passato: "passato", non_passato: "non passato", non_applicabile: "non applicabile" }`.
  - `righeVerdetti(verdetti) -> [{ controllo, esito, parola, ragione, rimedio, caso, vai: {tipo, id} | null, chiave }]` — una riga per verdetto; `vai` dal primo oggetto; `chiave` = `${controllo}|${caso ?? ""}` (per la coppia `(controllo, caso)` dei C3, dove `convergenza` esce per ogni caso a fibre); `ragione` mai vuota («—» se manca).
  - `testoSolutore(salute, versione = null) -> string`: `{esito:"ok", percorso}` → `OpenSees · <percorso>` (con `versione` se la si conosce: `OpenSees 3.8.0 · <percorso>`); `assente` → `OpenSees assente — <dove_prenderlo>`; `rotto` → `OpenSees rotto: <motivo>`; `null`/`undefined` → `solutore: in verifica…`.
  - `testoAttesa(lavoro, adessoMs) -> { fasi: string[], corrente: string | null, secondi: string }` — `secondi` = `conciso((adessoMs - lavoro.avvioMs) / 1000)` + « s»; `corrente` = l'ultima fase o `null`.
  - `testoUltima(lavoro) -> string`: `corsa <run_id> · 3,2 s` (`conciso(lavoro.secondi)`), per il solido `corsa del solido <run_id> · 7,5 s`; rifiutata → `corsa <run_id> · rifiutata dal Check Model`; errore → `corsa <run_id> · errore in <fase>: <motivo>`; assente → `corsa <run_id> · OpenSees assente`.
  - `stantia(lavoro, modello) -> boolean`: `Boolean(lavoro && lavoro.modello !== modello)`; senza lavoro `false`.
  - `verdettiDi(fin) -> object[]`: `fin.verdetti_check ?? []` seguiti da `fin.risultati?.verdetti ?? []` (i C3), in quest'ordine.

**Ingressi degeneri:**
- `righeVerdetti([])` → `[]`; `righeVerdetti(null)` → `[]`, non solleva
- verdetto con `oggetto: null` (`vincoli`, `massa_nulla`) → `vai: null`
- verdetto con `oggetto: []` → `vai: null`
- `oggetto` coppia `[3, 5]` di `nodi_coincidenti` → `vai: {tipo: "nodo", id: 3}`; `[2, 7]` di `nodo_su_asta` → `{tipo: "nodo", id: 2}`; `["Z1", 4]` di `carico_termico` → `{tipo: "azione", id: "Z1"}` se l'id è già un numero lo lascia numero
- `riferimenti` con `oggetto: [{"analisi": "statica", "caso": "Z9"}]` → `vai: null`; con `[{"azione": 3, "carico": 0, "nodo": 12}]` → `{tipo: "azione", id: 3}` (la prima chiave selezionabile nell'ordine `sezione, azione, nodo, asta`)
- `testoSolutore({esito: "assente", dove_prenderlo: null})` → `OpenSees assente — dove prenderlo: non dichiarato`
- `testoAttesa(lavoro, adessoMs)` con `adessoMs < avvioMs` → `0 s`, non un negativo
- `stantia(null, m)` → `false`; `stantia(lavoro, undefined)` → `true` (un modello che non c'è non è quello della corsa)
- `verdettiDi({})` → `[]`
- `testoAttesa({ fasi: [] }, 1000)` senza `avvioMs` → `0 s`, mai «NaN s»
- `righeVerdetti` con un `esito` fuori dai tre → `parola` è l'esito stesso e la riga resta, non sparisce

- [ ] **Step 1: Test rossi** — `static/test/corsa.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { OGGETTO_PER_CONTROLLO, PAROLA, righeVerdetti, testoSolutore, testoAttesa, testoUltima, stantia, verdettiDi }
  from "../corsa.js";

const v = (controllo, esito, extra = {}) => ({ controllo, oggetto: null, stazione: null, caso: null, esito,
  ragione: "r", articolo: null, valori: {}, rimedio: null, ...extra });

test("righeVerdetti: una riga per verdetto, la parola e il «vai» dal primo oggetto", () => {
  const righe = righeVerdetti([
    v("nodi_coincidenti", "non_passato", { oggetto: [[3, 5]], rimedio: "unisci i nodi" }),
    v("nodo_su_asta", "non_passato", { oggetto: [[2, 7]] }),
    v("carico_termico", "non_passato", { oggetto: [["Z1", 4]] }),
    v("armatura_mancante", "non_passato", { oggetto: [2] }),
    v("vincoli", "non_passato", { rimedio: "vincola un nodo" }),
    v("unita", "passato"),
    v("moti_rigidi", "non_applicabile", { ragione: "" }),
  ]);
  assert.equal(righe.length, 7);
  assert.deepEqual(righe[0].vai, { tipo: "nodo", id: 3 });
  assert.equal(righe[0].parola, "non passato");
  assert.equal(righe[0].rimedio, "unisci i nodi");
  assert.deepEqual(righe[1].vai, { tipo: "nodo", id: 2 });
  assert.deepEqual(righe[2].vai, { tipo: "azione", id: "Z1" });
  assert.deepEqual(righe[3].vai, { tipo: "sezione", id: 2 });
  assert.equal(righe[4].vai, null);
  assert.equal(righe[5].parola, "passato");
  assert.equal(righe[6].parola, "non applicabile");
  assert.equal(righe[6].ragione, "—", "la ragione non è mai vuota");
  assert.equal(righe[0].chiave, "nodi_coincidenti|");
});

test("righeVerdetti: riferimenti e pushover leggono il dict, e non promettono un «vai» che non c'è", () => {
  const righe = righeVerdetti([
    v("riferimenti", "non_passato", { oggetto: [{ analisi: "statica", caso: "Z9" }] }),
    v("riferimenti", "non_passato", { oggetto: [{ azione: 3, carico: 0, nodo: 12 }] }),
    v("riferimenti", "non_passato", { oggetto: [{ sezione: 4, calcestruzzo: 9 }] }),
    v("pushover", "non_passato", { oggetto: [{ analisi: "pushover", nodo_controllo: 4 }] }),
  ]);
  assert.equal(righe[0].vai, null);
  assert.deepEqual(righe[1].vai, { tipo: "azione", id: 3 });
  assert.deepEqual(righe[2].vai, { tipo: "sezione", id: 4 });
  assert.deepEqual(righe[3].vai, { tipo: "nodo", id: 4 });
});

// Ingressi degeneri: liste vuote o assenti, oggetto vuoto.
test("righeVerdetti: niente non solleva, e un oggetto vuoto non ha «vai»", () => {
  assert.deepEqual(righeVerdetti([]), []);
  assert.deepEqual(righeVerdetti(null), []);
  assert.deepEqual(righeVerdetti(undefined), []);
  assert.equal(righeVerdetti([v("nodi_liberi", "passato", { oggetto: [] })])[0].vai, null);
});

test("righeVerdetti: i C3 portano il caso nella chiave — convergenza esce per ogni caso a fibre", () => {
  const righe = righeVerdetti([v("convergenza", "passato", { caso: "Z1" }), v("convergenza", "passato", { caso: "Z2" })]);
  assert.deepEqual(righe.map((r) => r.chiave), ["convergenza|Z1", "convergenza|Z2"]);
  assert.equal(new Set(Object.values(PAROLA)).size, 3);
  assert.equal(OGGETTO_PER_CONTROLLO.vincoli_dedotti, "nodo");
});

test("testoSolutore: ok con percorso e versione, assente con dove prenderlo, rotto col motivo, niente in verifica", () => {
  assert.equal(testoSolutore({ esito: "ok", percorso: "/opt/homebrew/bin/OpenSees" }), "OpenSees · /opt/homebrew/bin/OpenSees");
  assert.equal(testoSolutore({ esito: "ok", percorso: "/x/OpenSees" }, "3.8.0"), "OpenSees 3.8.0 · /x/OpenSees");
  assert.equal(testoSolutore({ esito: "assente", dove_prenderlo: "da https://opensees.berkeley.edu/" }),
               "OpenSees assente — da https://opensees.berkeley.edu/");
  assert.equal(testoSolutore({ esito: "assente", dove_prenderlo: null }), "OpenSees assente — dove prenderlo: non dichiarato");
  assert.equal(testoSolutore({ esito: "rotto", motivo: "esce 1" }), "OpenSees rotto: esce 1");
  assert.equal(testoSolutore(null), "solutore: in verifica…");
});

test("testoAttesa: le fasi finora, la corrente, i secondi con la virgola — mai negativi", () => {
  const lavoro = { avvioMs: 1000, fasi: ["check model", "scrivo il deck e lancio OpenSees"] };
  const a = testoAttesa(lavoro, 4250);
  assert.deepEqual(a.fasi, lavoro.fasi);
  assert.equal(a.corrente, "scrivo il deck e lancio OpenSees");
  assert.equal(a.secondi, "3,25 s");
  assert.equal(testoAttesa({ avvioMs: 1000, fasi: [] }, 500).secondi, "0 s");
  assert.equal(testoAttesa({ avvioMs: 1000, fasi: [] }, 500).corrente, null);
});

test("testoUltima: ok, solido, rifiutata, errore, assente", () => {
  assert.equal(testoUltima({ run_id: "a1b2c3d4e5f6", secondi: 3.2, fin: { esito: "ok" } }), "corsa a1b2c3d4e5f6 · 3,2 s");
  assert.equal(testoUltima({ run_id: "a1b2c3d4e5f6", secondi: 7.5, solido: true, fin: { esito: "ok" } }), "corsa del solido a1b2c3d4e5f6 · 7,5 s");
  assert.equal(testoUltima({ run_id: "a1b2c3d4e5f6", secondi: 0.1, fin: { esito: "rifiutato" } }), "corsa a1b2c3d4e5f6 · rifiutata dal Check Model");
  assert.equal(testoUltima({ run_id: "a1b2c3d4e5f6", secondi: 2, fin: { esito: "errore", fase: "solutore", motivo: "esce 1" } }),
               "corsa a1b2c3d4e5f6 · errore in solutore: esce 1");
  assert.equal(testoUltima({ run_id: "a1b2c3d4e5f6", secondi: 0, fin: { esito: "assente" } }), "corsa a1b2c3d4e5f6 · OpenSees assente");
});

test("stantia: è l'identità dello snapshot, non un confronto di contenuto", () => {
  const m = { nodi: [] }, m2 = { nodi: [] };
  assert.equal(stantia({ modello: m }, m), false);
  assert.equal(stantia({ modello: m }, m2), true, "stesso contenuto, altro snapshot: stantia");
  assert.equal(stantia(null, m), false);
  assert.equal(stantia({ modello: m }, undefined), true);
});

test("verdettiDi: prima i verdetti del Check, poi i sette controlli sui risultati; niente → []", () => {
  const fin = { verdetti_check: [v("unita", "passato")], risultati: { verdetti: [v("reazioni", "passato", { caso: "Z1" })] } };
  assert.deepEqual(verdettiDi(fin).map((x) => x.controllo), ["unita", "reazioni"]);
  assert.deepEqual(verdettiDi({}), []);
  assert.deepEqual(verdettiDi({ verdetti_check: null }), []);
});
```

- [ ] **Step 2: Rosso** — `env -C …/static node --test test/corsa.test.js`: `Cannot find module`.

- [ ] **Step 3: Il modulo** — `static/corsa.js`:

```js
// La corsa dall'interfaccia (giornata 12): il Check Model, il lavoro con le sue fasi, l'ultima
// corsa che invecchia. Nessun riduttore: la corsa non tocca il modello. Le funzioni pure stanno
// in testa e si provano senza DOM; `creaCorsa` (Task 4) possiede il blocco del pannello.

import { conciso } from "./numeri.js";

/** Il tipo selezionabile dell'oggetto di un verdetto, per controllo (`nova/check.py:81-284`):
 *  delle coppie si prende il primo. `riferimenti` e `pushover` portano dict e si leggono da
 *  `TIPI_NEL_DICT`; i controlli senza oggetto non hanno «vai». */
export const OGGETTO_PER_CONTROLLO = Object.freeze({
  nodi_coincidenti: "nodo", aste_sconnesse: "asta", aste_lunghezza_zero: "asta", aste_duplicate: "asta",
  nodi_liberi: "nodo", nodo_su_asta: "nodo", sezione_nulla: "asta", armatura_mancante: "sezione",
  carico_termico: "azione", vincoli_dedotti: "nodo",
});
// Nell'ordine in cui si preferiscono: la sezione senza materiale si corregge dalla sezione.
const TIPI_NEL_DICT = [["sezione", "sezione"], ["azione", "azione"], ["nodo", "nodo"], ["nodo_controllo", "nodo"], ["asta", "asta"]];

export const PAROLA = Object.freeze({ passato: "passato", non_passato: "non passato", non_applicabile: "non applicabile" });

function vaiDi(verdetto) {
  const primo = Array.isArray(verdetto.oggetto) ? verdetto.oggetto[0] : null;
  if (primo === null || primo === undefined) return null;
  if (primo && typeof primo === "object" && !Array.isArray(primo)) {
    for (const [chiave, tipo] of TIPI_NEL_DICT) if (primo[chiave] !== undefined && primo[chiave] !== null) return { tipo, id: primo[chiave] };
    return null;
  }
  const tipo = OGGETTO_PER_CONTROLLO[verdetto.controllo];
  if (!tipo) return null;
  const id = Array.isArray(primo) ? primo[0] : primo;
  return id === undefined || id === null ? null : { tipo, id };
}

/** Una riga per verdetto, nella forma che il blocco disegna: la parola è il canale (WCAG 1.4.1). */
export function righeVerdetti(verdetti) {
  return (Array.isArray(verdetti) ? verdetti : []).map((x) => ({
    controllo: x.controllo, esito: x.esito, parola: PAROLA[x.esito] ?? String(x.esito),
    ragione: x.ragione || "—", rimedio: x.rimedio || null, caso: x.caso ?? null,
    vai: vaiDi(x), chiave: `${x.controllo}|${x.caso ?? ""}`,
  }));
}

export function testoSolutore(salute, versione = null) {
  if (!salute) return "solutore: in verifica…";
  const nome = versione ? `OpenSees ${versione}` : "OpenSees";
  if (salute.esito === "ok") return `${nome} · ${salute.percorso}`;
  if (salute.esito === "assente") return `OpenSees assente — ${salute.dove_prenderlo || "dove prenderlo: non dichiarato"}`;
  return `OpenSees rotto: ${salute.motivo || "—"}`;
}

const secondiTesto = (s) => `${conciso(Math.max(0, s))} s`;
// R14: sotto 1 s `cifre` dà quattro decimali (`numeri.js:183`), e un cronometro che scrive
// «0,5231 s» ogni mezzo secondo è rumore, non attesa parlante. L'attesa arrotonda al decimo;
// la durata **misurata** (`testoUltima`) no: «1,25 s» è un fatto del server.
const secondiAttesa = (s) => `${conciso(Math.round(Math.max(0, s) * 10) / 10)} s`;

export function testoAttesa(lavoro, adessoMs) {
  const fasi = lavoro.fasi ?? [];
  const trascorsi = (adessoMs - lavoro.avvioMs) / 1000;
  return { fasi, corrente: fasi.length ? fasi[fasi.length - 1] : null,
           secondi: secondiAttesa(Number.isFinite(trascorsi) ? trascorsi : 0) };
}

export function testoUltima(lavoro) {
  const testa = `corsa${lavoro.solido ? " del solido" : ""} ${lavoro.run_id}`;
  const fin = lavoro.fin ?? {};
  if (fin.esito === "ok") return `${testa} · ${secondiTesto(lavoro.secondi ?? 0)}`;
  if (fin.esito === "rifiutato") return `${testa} · rifiutata dal Check Model`;
  if (fin.esito === "assente") return `${testa} · OpenSees assente`;
  return `${testa} · errore in ${fin.fase ?? "—"}: ${fin.motivo ?? "—"}`;
}

/** Stantia = il modello a schermo non è lo snapshot su cui la corsa ha girato. L'identità
 *  dell'oggetto immutabile della cronologia è più stretta dell'impronta e non costa una rotta:
 *  `⌘Z` fino a quello snapshot la fa tornare fresca. */
export const stantia = (lavoro, modello) => Boolean(lavoro && lavoro.modello !== modello);

export const verdettiDi = (fin) => [...(fin?.verdetti_check ?? []), ...(fin?.risultati?.verdetti ?? [])];
```

- [ ] **Step 4: Verde** — `node --test test/corsa.test.js`. `conciso(3.25)` → «3,25»; `conciso(0)` → «0»; `conciso(3.2)` → «3,2».

- [ ] **Step 5: Commit** — `feat(corsa): le righe dei verdetti con il «vai», i testi del solutore e dell'attesa, la corsa stantia`

---

### Task 4: `creaCorsa` — il blocco «Corsa» nel pannello, il lavoro con il polling, `⌘⏎` e `⇧⌘⏎`

**Files:**
- Modify: `static/corsa.js` (in coda: `creaCorsa`), `static/index.html:49-61` (il blocco fra «Unità» e «Storia», cioè fra la riga `:58` delle unità e l'`<h2>` della Storia a `:59`), `static/stile.css` (in coda), `static/tastiera.js:14-50,77-79`
- Test: `static/test/corsa.test.js` (in coda), `static/test/tastiera.test.js`

**Interfaces:**
- Consumes: le pure del Task 3; `chiediJson` (`static/file.js:24-33`). Nessun import da `numeri.js`: i secondi passano tutti da `testoAttesa`/`testoUltima`.
- Produces:
  - `creaCorsa(radice, { modello, suVai, suErrore, suEsito, orologio = () => Date.now(), attesaMs = 500 })` → `{ verifica(), corri(), corriSolido(), disegna({ modello }), azzera(), impostaSolutore(salute, versione), inCorso() }` — sette, non sei: `impostaSolutore` è quella che il Task 5 chiama con `/api/salute`.
    - `modello()` → lo snapshot corrente (`corrente(cronologia)` in `app.js`): si legge **al momento del gesto**.
    - `verifica()`: `POST /api/check {modello}` → i verdetti nel blocco (senza «ultima corsa»); il bottone «verifica» dice «verifico…» finché dura.
    - `corri()`: `POST /api/corsa {modello, casi: null}` → 202 → interroga `GET /api/corsa/{run_id}` ogni `attesaMs` finché `stato === "finita"`; mentre gira: attesa con fasi e cronometro (aggiornato a ogni giro di polling — non serve un timer a parte), i bottoni disabilitati, «corri» dice «corro…»; a fine: `lavoro = {run_id, secondi, fin, fasi, modello: <snapshot>, solido: false}`, i verdetti da `verdettiDi(fin)`, `suEsito(lavoro)`.
    - `corriSolido()`: il percorso dal campo `#corsa-inp`; `POST /api/ccx {inp}` → stessa attesa; `lavoro.solido = true`, niente verdetti, riga «corsa del solido … · cartella <cartella>».
    - `disegna({ modello })`: riscrive la riga dell'ultima corsa con `stantia(lavoro, modello)` — filetto rosso e la parola «stantia» in coda; e lo stato vuoto quando non c'è né lavoro né verdetti.
    - `azzera()`: dimentica lavoro e verdetti (lo chiama `app.js` ad «apri», a un'importazione e a un modello nuovo).
    - `inCorso()`: `true` mentre un lavoro o una verifica gira.
    - Gli errori: 409 → `suErrore("un'altra corsa è in corso")`; 400 → `suErrore(motivo)`; rete → `suErrore("il server non risponde")`; `esito: "errore"` con `fase: "solutore"` → riga «errore in solutore: motivo» **e** un `<details>` «registro del solutore» con `coda_log` in un `<pre>`; `assente` → la riga del solutore si aggiorna con «dove prenderlo».
  - Lo stato del solutore: `impostaSolutore(salute, versione)` esposto in ritorno (`app.js` lo chiama con la risposta di `/api/salute` all'avvio, e con `fin.risultati.run.versione_opensees` dopo una corsa buona).
  - Markup (`index.html`, fra «Unità» e «Storia»):

```html
  <h2 class="staccato">Corsa</h2>
  <section id="corsa" aria-label="corsa">
    <p id="corsa-solutore" class="numero">solutore: in verifica…</p>
    <div class="file-azioni">
      <button id="corsa-verifica" type="button" title="⇧⌘⏎ — il Check Model, senza corsa">verifica</button>
      <button id="corsa-corri" type="button" title="⌘⏎ — tutte le analisi che il modello dichiara">corri</button>
    </div>
    <label for="corsa-inp">deck del solido (.inp)</label>
    <input id="corsa-inp" type="text" spellcheck="false" placeholder="docs/caso-studio/muro_1.inp">
    <div class="file-azioni"><button id="corsa-corri-solido" type="button">corri il solido</button></div>
    <div id="corsa-attesa" hidden>
      <ol id="corsa-fasi" aria-label="fasi della corsa"></ol>
      <p id="corsa-secondi" class="numero"></p>
    </div>
    <p id="corsa-ultima" class="numero" aria-live="polite" hidden></p>
    <details id="corsa-registro" hidden><summary>registro del solutore</summary><pre id="corsa-coda"></pre></details>
    <p class="vuoto" id="corsa-vuoto">Premi <kbd>⌘⏎</kbd> per lanciare tutte le analisi del modello, <kbd>⇧⌘⏎</kbd> per il solo Check Model.</p>
    <ul id="corsa-verdetti" aria-label="verdetti" hidden></ul>
  </section>
```

  - Ogni verdetto è un `<li class="verdetto <esito>">` con: `<span class="punto" aria-hidden="true">●</span>` (pieno per `passato`, `○` per `non_applicabile`, `●` con classe `non_passato` = rosso), `<span class="controllo">nodi_liberi</span>`, `<span class="parola">non passato</span>`, `<span class="ragione">…</span>`, `<span class="rimedio">→ elimina il nodo</span>` se c'è, e `<button type="button" aria-label="vai al nodo 3">vai</button>` se c'è `vai` (il nome comincia dal testo visibile «vai»). Il `caso` dei C3 sta prima del controllo: «Z1 · reazioni».
  - Tastiera: in `TASTI` due voci, dopo `importa` (`tastiera.js:23`):

```js
  { codice: "verifica",  tasto: "⇧⌘⏎",  etichetta: "verifica",  aiuto: "il Check Model",       contesto: "salvo-ghost", modificatore: "comando" },
  { codice: "corri",     tasto: "⌘⏎",   etichetta: "corri",     aiuto: "tutte le analisi del modello", contesto: "salvo-ghost", modificatore: "comando" },
```

    e nelle mappe: `CON_COMANDO` (`:77`) `["enter", "corri"]`, `CON_COMANDO_E_SHIFT` (`:79`) `["enter", "verifica"]`. Entrano nella barra e nella palette da soli (`VOCI_PALETTE`, `app.js:239`).

**Ingressi degeneri:**
- «corri» mentre un lavoro gira → `suErrore("una corsa è già in corso")`, nessuna richiesta (come `occupato()` di `file.js:116`)
- la `POST` risponde 409 → `suErrore("un'altra corsa è in corso")`, i bottoni tornano attivi
- la `GET` cade (rete) a metà polling → `suErrore("il server non risponde")`, l'attesa sparisce, nessun lavoro registrato, i bottoni tornano attivi
- `fin.esito === "rifiutato"` → riga «rifiutata dal Check Model» e i verdetti; niente `<details>`
- `fin.esito === "errore"`, `fase: "solutore"`, `coda_log` vuota → il `<details>` non compare
- `fin.esito === "assente"` → riga «OpenSees assente» **e** `impostaSolutore({esito: "assente", dove_prenderlo: fin.dove_prenderlo})`
- `corriSolido()` col campo vuoto → `suErrore("scrivi il percorso di un deck .inp")`, nessuna richiesta
- `verifica()` con risposta `{esito: "ok", verdetti: [...]}` → i verdetti anche se tutti passati (sedici righe: il verde si vede)
- `disegna({modello})` senza lavoro → la riga dell'ultima resta `hidden`, lo stato vuoto visibile solo se non ci sono nemmeno verdetti
- `azzera()` durante un lavoro → il lavoro finisce ma non si registra (`generazione` incrementata: la risposta arriva a un'altra generazione e si butta)
- la `GET` risponde 404 a metà polling (server riavviato sotto) → `suErrore("nessuna corsa <id>")`, l'attesa sparisce, nessun lavoro registrato, i bottoni tornano attivi
- il `keydown` di `⌘⏎` dentro il campo di comando → **non** corre (sotto la guardia del campo in `dispatchVoce`, Task 5): `daControllo` lo lascia passare (`metaKey`), è `app.js` che lo ferma

- [ ] **Step 1: Test rossi** — in coda a `static/test/corsa.test.js`, copiando il DOM finto di `file.test.js:9-53` (con `disabled`, `hidden`, `textContent`, `_attrs`, `setAttribute`, `replaceChildren`, `append`, `querySelector` sulla radice per i tredici id: `#corsa-solutore`, `#corsa-verifica`, `#corsa-corri`, `#corsa-inp`, `#corsa-corri-solido`, `#corsa-attesa`, `#corsa-fasi`, `#corsa-secondi`, `#corsa-ultima`, `#corsa-registro`, `#corsa-coda`, `#corsa-vuoto`, `#corsa-verdetti`) e una `fetch` finta **a sequenza**: `fetchSequenza([{stato: 202, dati: {...}}, {stato: 200, dati: {...}}, ...])` che risponde nell'ordine e registra rotta e corpo. I test:

```js
test("creaCorsa: corri fa la POST, interroga finché non è finita, e scrive fasi, secondi e verdetti", async () => {
  const m = { nodi: [{ id: 1 }] };
  const spia = fetchSequenza([
    { stato: 202, dati: { run_id: "a1b2c3d4e5f6", stato: "in corso" } },
    { stato: 200, dati: { run_id: "a1b2c3d4e5f6", stato: "in corso", fasi: ["check model"], secondi: 0.4 } },
    { stato: 200, dati: { run_id: "a1b2c3d4e5f6", stato: "finita", fasi: ["check model", "leggo i recorder"], secondi: 1.25,
                          esito: "ok", verdetti_check: [v("unita", "passato")], risultati: { verdetti: [v("reazioni", "passato", { caso: "Z1" })], run: { versione_opensees: "3.8.0" } } } },
  ]);
  const { radice, el } = radiceCorsa();
  const esiti = [];
  const c = creaCorsa(radice, { modello: () => m, suVai: () => {}, suErrore: () => {}, suEsito: (l) => esiti.push(l), attesaMs: 1 });
  const p = c.corri();
  assert.equal(el("#corsa-corri").disabled, true);
  assert.equal(el("#corsa-corri").textContent, "corro…");
  await p;
  assert.deepEqual(spia.rotte, ["/api/corsa", "/api/corsa/a1b2c3d4e5f6", "/api/corsa/a1b2c3d4e5f6"]);
  assert.deepEqual(spia.corpi[0], { modello: m, casi: null });
  assert.equal(el("#corsa-attesa").hidden, true);
  assert.equal(el("#corsa-ultima").textContent, "corsa a1b2c3d4e5f6 · 1,25 s");
  assert.equal(el("#corsa-verdetti")._figli.length, 2);
  assert.equal(el("#corsa-corri").disabled, false);
  assert.equal(esiti.length, 1);
  assert.equal(esiti[0].modello, m, "il lavoro porta lo snapshot su cui ha girato");
});

test("creaCorsa: mentre gira l'attesa dice la fase corrente e i secondi; la corrente è in grassetto", async () => { /* fetch che si ferma su una promessa risolta dal test dopo aver letto #corsa-fasi e #corsa-secondi: la voce corrente ha `aria-current="step"` e classe `corrente` */ });

test("creaCorsa: stantia — dopo un altro snapshot la riga porta la parola e la classe", async () => {
  /* dopo una corsa ok su m: c.disegna({ modello: m }) → textContent senza «stantia», className senza «stantia»;
     c.disegna({ modello: { ...m } }) → textContent finisce con « · stantia», className include «stantia»;
     c.disegna({ modello: m }) → torna fresca */
});

test("creaCorsa: 409 dice che un'altra corsa è in corso e libera i bottoni", async () => { /* fetchSequenza([{stato: 409, dati: {motivo: "un'altra corsa è in corso"}}]) → suErrore chiamata, disabled false */ });

test("creaCorsa: la rete che cade a metà polling non lascia un lavoro a metà", async () => { /* 202 poi fetch che rigetta → suErrore("il server non risponde"), attesa hidden, ultima hidden, bottoni liberi */ });

test("creaCorsa: rifiutata dal Check Model — riga e verdetti, niente registro", async () => { /* fin = {esito: "rifiutato", verdetti_check: [v("nodi_liberi","non_passato",{oggetto:[3], rimedio:"elimina il nodo"})]} → #corsa-ultima «… · rifiutata dal Check Model», #corsa-registro hidden, un <li class="verdetto non_passato"> con il bottone aria-label «vai al nodo 3» che premuto chiama suVai({tipo:"nodo", id:3}) */ });

test("creaCorsa: errore del solutore — motivo nella riga e la coda del registro nel details", async () => { /* fin = {esito:"errore", fase:"solutore", motivo:"esce 1", coda_log:"...ultime righe"} → #corsa-coda.textContent === "...ultime righe", #corsa-registro.hidden === false; con coda_log "" → hidden true */ });

test("creaCorsa: solutore assente — la riga del solutore si aggiorna con dove prenderlo", async () => { /* fin = {esito:"assente", dove_prenderlo:"da X"} → #corsa-solutore «OpenSees assente — da X» */ });

test("creaCorsa: verifica fa la POST a /api/check e mostra i verdetti anche se tutti passati", async () => { /* {esito:"ok", verdetti:[v("unita","passato"), v("vincoli","passato")]} → due li, il bottone «verifico…» durante, #corsa-vuoto hidden */ });

test("creaCorsa: corri mentre gira è un rifiuto che parla, senza richiesta", async () => { /* seconda corri() durante la prima → suErrore("una corsa è già in corso"), spia.chiamate invariata */ });

test("creaCorsa: corri il solido — campo vuoto rifiuta; con il percorso fa la POST a /api/ccx e scrive la cartella", async () => { /* "" → suErrore("scrivi il percorso di un deck .inp"); poi 202 {run_id, cartella:"/c/x", stato:"in corso"} e GET finita {esito:"ok", secondi:7.5, cartella:"/c/x"} → «corsa del solido … · 7,5 s · cartella /c/x», #corsa-verdetti hidden */ });

test("creaCorsa: azzera dimentica lavoro e verdetti e rimette lo stato vuoto; una risposta in ritardo non lo riporta", async () => { /* ... */ });

test("creaCorsa: ogni bottone ha un nome accessibile che comincia dal testo visibile, e i «vai» sono distinti", async () => { /* WCAG 2.5.3: aria-label ?? textContent startsWith textContent; i «vai» di due nodi diversi hanno aria-label diversi */ });
```

Scrivi **tutti** i test per esteso (i corpi nei commenti sono la specifica; il DOM finto e `fetchSequenza` stanno in testa al file). E in `static/test/tastiera.test.js`, accanto a `:77-95`:

```js
test("⌘⏎ è corri e ⇧⌘⏎ è verifica; Invio nudo resta conferma", () => {
  assert.equal(voceDaEvento({ key: "Enter", metaKey: true }).codice, "corri");
  assert.equal(voceDaEvento({ key: "Enter", metaKey: true, shiftKey: true }).codice, "verifica");
  assert.equal(voceDaEvento({ key: "Enter" }).codice, "conferma");
});
```

e nella sonda a `:149-150` aggiungi `"⌘⏎": "Enter", "⇧⌘⏎": "Enter"`.

- [ ] **Step 2: Rosso** — `node --test test/corsa.test.js test/tastiera.test.js`.

- [ ] **Step 3: `creaCorsa`** — in coda a `static/corsa.js`:

```js
import { chiediJson } from "./file.js";

const PUNTO = { passato: "●", non_passato: "●", non_applicabile: "○" };

export function creaCorsa(radice, { modello, suVai, suErrore, suEsito, orologio = () => Date.now(), attesaMs = 500 }) {
  const q = (sel) => radice.querySelector(sel);
  const solutoreEl = q("#corsa-solutore"), bVerifica = q("#corsa-verifica"), bCorri = q("#corsa-corri");
  const campoInp = q("#corsa-inp"), bSolido = q("#corsa-corri-solido");
  const attesaEl = q("#corsa-attesa"), fasiEl = q("#corsa-fasi"), secondiEl = q("#corsa-secondi");
  const ultimaEl = q("#corsa-ultima"), registroEl = q("#corsa-registro"), codaEl = q("#corsa-coda");
  const vuotoEl = q("#corsa-vuoto"), verdettiEl = q("#corsa-verdetti");

  let lavoro = null;        // l'ultima corsa: {run_id, secondi, fin, fasi, modello, solido, cartella?}
  let verdetti = [];        // le righe a schermo (dal Check o dall'ultima corsa)
  let occupato = false;     // una verifica o un lavoro in corso: uno scatto alla volta, come `file.js`
  let generazione = 0;      // `azzera()` la incrementa: una risposta di prima non si registra
  let salute = null, versione = null;

  const bottoni = (liberi) => { for (const b of [bVerifica, bCorri, bSolido]) if (b) b.disabled = !liberi; };

  function impostaSolutore(s, v = versione) { salute = s ?? salute; versione = v ?? versione; solutoreEl.textContent = testoSolutore(salute, versione); }

  function disegnaVerdetti() {
    const righe = righeVerdetti(verdetti);
    verdettiEl.hidden = righe.length === 0;
    verdettiEl.replaceChildren(...righe.map((r) => {
      const li = document.createElement("li"); li.className = `verdetto ${r.esito}`;
      const punto = document.createElement("span"); punto.className = "punto"; punto.setAttribute("aria-hidden", "true"); punto.textContent = PUNTO[r.esito] ?? "●";
      const controllo = document.createElement("span"); controllo.className = "controllo numero"; controllo.textContent = r.caso ? `${r.caso} · ${r.controllo}` : r.controllo;
      const parola = document.createElement("span"); parola.className = "parola"; parola.textContent = r.parola;
      const ragione = document.createElement("span"); ragione.className = "ragione"; ragione.textContent = r.ragione;
      li.append(punto, controllo, parola, ragione);
      if (r.rimedio) { const s = document.createElement("span"); s.className = "rimedio"; s.textContent = `→ ${r.rimedio}`; li.append(s); }
      if (r.vai) {
        li.className += " con-vai";
        const b = document.createElement("button"); b.type = "button"; b.textContent = "vai";
        b.setAttribute("aria-label", `vai ${ARTICOLO[r.vai.tipo]} ${r.vai.id}`);   // «vai al nodo 3»: comincia dal visibile, distinto per oggetto
        b.addEventListener("click", () => suVai(r.vai));
        li.append(b);
      }
      return li;
    }));
    vuotoEl.hidden = righe.length > 0 || lavoro !== null;
  }
```

con, in testa al modulo, `const ARTICOLO = { nodo: "al nodo", asta: "all'asta", sezione: "alla sezione", azione: "all'azione" };`.

```js
  function disegnaUltima(m) {
    if (!lavoro) { ultimaEl.hidden = true; ultimaEl.className = "numero"; return; }
    const vecchia = stantia(lavoro, m);
    let testo = testoUltima(lavoro);
    if (lavoro.solido && lavoro.cartella) testo += ` · cartella ${lavoro.cartella}`;
    ultimaEl.textContent = vecchia ? `${testo} · stantia` : testo;   // la parola è il canale, il filetto lo accompagna
    ultimaEl.className = vecchia ? "numero stantia" : "numero";
    ultimaEl.hidden = false;
  }

  function disegnaAttesa(l) {
    const a = testoAttesa(l, orologio());
    fasiEl.replaceChildren(...a.fasi.map((nome, i) => {
      const li = document.createElement("li"); li.textContent = nome;
      if (i === a.fasi.length - 1) { li.className = "corrente"; li.setAttribute("aria-current", "step"); }
      return li;
    }));
    secondiEl.textContent = a.secondi;
    attesaEl.hidden = false;
  }

  const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

  /** Il lavoro: POST, poi la GET ogni `attesaMs` finché non è finita. Ritorna il corpo finale. */
  async function lavora(rotta, corpo, solido) {
    const m = modello();
    const mia = generazione;
    const avvio = await chiediJson(rotta, corpo);             // 202 {run_id, stato, cartella?}
    const l = { run_id: avvio.run_id, fasi: [], avvioMs: orologio(), modello: m, solido, cartella: avvio.cartella ?? null };
    disegnaAttesa(l);
    while (true) {
      await pausa(attesaMs);
      const s = await chiediJson(`/api/corsa/${l.run_id}`);
      l.fasi = s.fasi ?? [];
      if (s.stato !== "finita") { disegnaAttesa(l); continue; }
      attesaEl.hidden = true;
      if (mia !== generazione) return null;                    // azzerato nel frattempo: si butta
      const { run_id, stato, fasi, secondi, ...fin } = s;
      lavoro = { run_id: l.run_id, secondi: secondi ?? 0, fin, fasi: l.fasi, modello: m, solido, cartella: s.cartella ?? l.cartella };
      return lavoro;
    }
  }

  async function corri() {
    if (occupato) return suErrore("una corsa è già in corso");
    occupato = true; bottoni(false); bCorri.textContent = "corro…";
    try {
      const l = await lavora("/api/corsa", { modello: modello(), casi: null }, false);
      if (!l) return;
      verdetti = verdettiDi(l.fin);
      registroEl.hidden = !(l.fin.esito === "errore" && l.fin.coda_log); codaEl.textContent = l.fin.coda_log ?? "";
      if (l.fin.esito === "assente") impostaSolutore({ esito: "assente", dove_prenderlo: l.fin.dove_prenderlo });
      if (l.fin.esito === "ok" && l.fin.risultati?.run?.versione_opensees) impostaSolutore(salute, l.fin.risultati.run.versione_opensees);
      disegnaVerdetti(); disegnaUltima(l.modello);
      suEsito(l);
    } catch (e) {
      attesaEl.hidden = true; suErrore(e.message === "il server ha risposto 409" ? "un'altra corsa è in corso" : e.message);
    } finally {
      occupato = false; bottoni(true); bCorri.textContent = "corri";
    }
  }
```

(Il 409 arriva con `motivo` nel corpo, quindi `chiediJson` dà già «un'altra corsa è in corso»: la traduzione qui sopra è solo per un 409 senza corpo. Scrivi `suErrore(e.message)` e basta se il test lo conferma.)

```js
  async function verifica() {
    if (occupato) return suErrore("una corsa è già in corso");
    occupato = true; bottoni(false); bVerifica.textContent = "verifico…";
    try {
      const r = await chiediJson("/api/check", { modello: modello() });
      verdetti = r.verdetti ?? [];
      disegnaVerdetti();
    } catch (e) { suErrore(e.message); }
    finally { occupato = false; bottoni(true); bVerifica.textContent = "verifica"; }
  }

  async function corriSolido() {
    if (occupato) return suErrore("una corsa è già in corso");
    const inp = (campoInp?.value ?? "").trim();
    if (inp === "") return suErrore("scrivi il percorso di un deck .inp");
    occupato = true; bottoni(false); bSolido.textContent = "corro il solido…";
    try {
      const l = await lavora("/api/ccx", { inp }, true);
      if (!l) return;
      verdetti = []; registroEl.hidden = !(l.fin.esito === "errore" && l.fin.coda_log); codaEl.textContent = l.fin.coda_log ?? "";
      disegnaVerdetti(); disegnaUltima(l.modello); suEsito(l);
    } catch (e) { attesaEl.hidden = true; suErrore(e.message); }
    finally { occupato = false; bottoni(true); bSolido.textContent = "corri il solido"; }
  }

  function azzera() { generazione++; lavoro = null; verdetti = []; registroEl.hidden = true; codaEl.textContent = ""; disegnaVerdetti(); disegnaUltima(null); }
  function disegna({ modello: m }) { disegnaUltima(m); }

  bVerifica.addEventListener("click", () => verifica());
  bCorri.addEventListener("click", () => corri());
  bSolido?.addEventListener("click", () => corriSolido());
  campoInp?.addEventListener("keydown", (ev) => { if (ev.key === "Enter") { ev.preventDefault(); corriSolido(); } });
  disegnaVerdetti(); disegnaUltima(null);

  return { verifica, corri, corriSolido, disegna, azzera, impostaSolutore, inCorso: () => occupato };
}
```

Nota su `modello: m` nell'oggetto ritornato da `lavora` e su `stantia`: `m` è letto **all'avvio** del gesto, non alla fine — se durante la corsa l'utente aggiunge un nodo, la corsa appena finita è già stantia, ed è giusto così.

- [ ] **Step 4: CSS** — in coda a `stile.css`:

```css
/* Il blocco «Corsa» (giornata 12). Le fasi sono un elenco ordinato: la corrente in grassetto
   con `aria-current`; i verdetti a doppio canale — il punto (pieno, vuoto, rosso) e la parola.
   Il rosso resta un filetto o un punto, mai il colore del testo (AA a 11 px). */
/* R12: `#corsa label` va aggiunta al selettore di `#file label` (`:232`), `#corsa-inp` a quello
   di `#file-percorso, #comando-campo` (`:233`) e al suo `:focus-visible` (`:237`). Le tre righe
   qui sotto sono la forma **da non scrivere**: restano per dire cosa devono valere. */
#corsa label { display: block; font-size: 11px; color: var(--testo-tenue); margin: 8px 0 4px; }
#corsa-inp { width: 100%; font-family: var(--mono); font-size: 12px; background: var(--pannello);
             color: var(--inchiostro); border: 1px solid var(--tratto-forte); padding: 3px 6px; box-sizing: border-box; }
#corsa-inp:focus-visible { outline: 2px solid var(--rosso); outline-offset: 1px; }
#corsa-fasi { margin: 8px 0 0; padding-left: 1.2em; font-size: 11px; }
#corsa-fasi .corrente { font-weight: 700; }
#corsa-secondi { margin: 2px 0 0; font-size: 11px; }
#corsa-ultima { margin: 8px 0 0; font-size: 11px; }
#corsa-ultima.stantia { border-left: 3px solid var(--rosso); padding-left: 6px; }
#corsa-registro { margin-top: 6px; font-size: 11px; }
#corsa-coda { margin: 4px 0 0; max-height: 9rem; overflow: auto; font-size: 10px; white-space: pre-wrap; }
#corsa-verdetti { margin: 8px 0 0; padding: 0; list-style: none; }
.verdetto { display: grid; grid-template-columns: 1em 1fr auto; column-gap: 6px; font-size: 11px; padding: 3px 0;
            border-top: 1px solid var(--tratto); }
.verdetto .punto { grid-row: 1 / span 2; }
.verdetto.non_passato .punto { color: var(--rosso); }
.verdetto.non_applicabile .punto, .verdetto.non_applicabile .parola { color: var(--testo-tenue); }
.verdetto .parola { grid-column: 3; text-align: right; }
.verdetto .ragione, .verdetto .rimedio { grid-column: 2 / span 2; color: var(--testo-tenue); }
.verdetto button { grid-column: 3; grid-row: 1; justify-self: end; font: inherit; font-size: 11px; padding: 0 8px;
                   border: 1px solid var(--tratto-forte); background: var(--pannello); cursor: pointer; }
.verdetto button:focus-visible { outline: 2px solid var(--rosso); outline-offset: 1px; }
```

(Con il bottone «vai» la parola scende alla riga della ragione: `grid-column: 3; grid-row: 2` per `.parola` quando c'è il bottone — usa una classe `.verdetto.con-vai .parola { grid-row: 2; }` e aggiungi `con-vai` nel `className` del `<li>`.)

- [ ] **Step 5: Verde** — `node --test test/corsa.test.js test/tastiera.test.js`, poi la suite intera (610 + i nuovi).

- [ ] **Step 6: Commit** — `feat(corsa): il blocco Corsa con verifica, corri e corri il solido; l'attesa a fasi; ⌘⏎ e ⇧⌘⏎`

---

### Task 5: `app.js` — la cucitura

**Files:**
- Modify: `static/app.js` (import, `creaCorsa` accanto a `creaFile`, `suApertura`/`suImportazione`, `ridisegna`, `dispatchVoce`, la `salute` all'avvio)

**Interfaces:**
- Consumes: `creaCorsa` (Task 4), `scegli` (`app.js:109`), `corrente(cronologia)`, `chiediJson`.
- Produces:
  - `const corsa = creaCorsa(document, { modello: () => corrente(cronologia), suVai: ({ tipo, id }) => scegli(tipo, id), suErrore: (msg) => dì(msg), suEsito: () => ridisegna() });` subito dopo `creaFile` (`:231`).
  - All'avvio: `chiediJson("/api/salute").then((s) => corsa.impostaSolutore(s.solutore)).catch((e) => dì(e.message));` — la riga del solutore dice «OpenSees · percorso» prima di qualunque gesto.
  - `suApertura` (`:190-206`) e `suImportazione` (`:212-222`): `corsa.azzera();` — l'ultima corsa non sopravvive a un altro modello.
  - `ridisegna` (`:605` circa, accanto a `file.disegna`): `corsa.disegna({ modello: m });`.
  - `dispatchVoce` (`:687-691`): **sotto** la guardia del campo (non accanto ad `apri`/`salva`): `if (voce.codice === "corri") { corsa.corri(); return; }` e `if (voce.codice === "verifica") { corsa.verifica(); return; }` — un `⌘⏎` mentre si scrive un comando è un Invio sbagliato, non una corsa.
  - `scegli(tipo, id)` per `sezione`/`azione`: già gestito da `esitoScelta` per tipo stringa (`modo.js:64`); nessuna aggiunta.

**Ingressi degeneri:**
- «vai» su un nodo che nel frattempo è sparito (⌘Z dopo la corsa) → `scegli` non trova la selezione e `ridisegna` la fa cadere (`esiste`, `app.js:569-575`): nessun errore
- «apri» durante una corsa → il lavoro finisce ma `azzera()` l'ha già dimenticato; nessuna riga «ultima corsa» del modello vecchio
- `/api/salute` che risponde 409 all'avvio (l'altro sidecar occupato: possibile solo con due schede) → `dì(motivo)`, la riga resta «in verifica…»; una corsa dopo la aggiorna
- `⌘⏎` con un modo aperto (ghost dell'estrusione) → `contesto: "salvo-ghost"` lo tiene fuori dalla barra; `dispatchVoce` lo esegue lo stesso? No: mettilo sotto la guardia del modo come `apri` non è — regola: `if (modo) { dì("chiudi il gesto (Esc) prima di correre"); return; }` prima di `corsa.corri()`

- [ ] **Step 1: I rami e i callback**, `node --check static/app.js`, la suite verde (nessun test tocca `app.js`).
- [ ] **Step 2: Prova a mano breve** (server 8819): apri `tests/fixture/telaio_2x1.nova.json`, `⇧⌘⏎` → sedici righe (quindici passate, `moti_rigidi` non applicabile); `⌘⏎` → attesa (breve), «corsa … · N s», i C3 sotto; `N` «9000; 9000» → «stantia»; `⌘Z` → fresca.
- [ ] **Step 3: Commit** — `feat(app): la corsa dall'interfaccia — verifica, corri, vai sui verdetti, l'ultima corsa che invecchia`

---

### Task 6: la verifica che conta

**Files:** nessuno — la prova a mano sul telaio 2×1, sul MURO 1 e su un modello malato.

**Ingressi degeneri:**
- nessun ingresso esterno

- [ ] **Step 1: Server** su `8819`; Chrome (estensione, o headless via CDP con la cache spenta).
- [ ] **Step 2: Il solutore.** All'apertura la riga dice «OpenSees · /percorso» (dopo la prima corsa «OpenSees 3.8.0 · …»). Con `--solutore /nessuno/OpenSees` la riga dice «OpenSees assente — OpenSees da https://opensees.berkeley.edu/…» e `⌘⏎` dà «corsa … · OpenSees assente», bottoni liberi.
- [ ] **Step 3: Il telaio 2×1.** Apri la fixture; `⇧⌘⏎` → sedici verdetti, tutti passati tranne `moti_rigidi` (vuoto, «non applicabile»); `⌘⏎` → «corsa <id> · 0,x s», i verdetti del Check e i sette C3 (`reazioni Z1 passato`, …); in console nessun errore; `curl http://127.0.0.1:8819/api/risultati/<id>` risponde il file intero.
- [ ] **Step 4: Un modello malato.** `N` «9000; 9000» (nodo libero) → `⌘⏎` → «rifiutata dal Check Model», la riga `nodi_liberi · non passato · → elimina il nodo` con «vai» → il nodo 7 selezionato nell'albero e nel piano; `⌫` lo elimina; `⌘⏎` → corsa buona; `⌘Z` due volte → «stantia» (filetto e parola); `⇧⌘Z` due volte → fresca.
- [ ] **Step 5: Il MURO 1** (`docs/caso-studio/muro_1_pushover.nova.json`): `⌘⏎` → le fasi si vedono una dopo l'altra («check model», «scrivo il deck e lancio OpenSees», «scrivo il deck e lancio OpenSees (modale, N modi)»…, «leggo i recorder») con il cronometro che sale; **durante** la corsa `⇧⌘⏎` dice «una corsa è già in corso», ma `apri` di un altro file funziona (salute e check liberi: la riga del solutore non va in 409); a fine «corsa … · N s» con i C3 (`massa_modale`, `convergenza` per caso).
- [ ] **Step 6: Il solido.** Nel campo «deck del solido» il `.inp` di `tests/fixture/` che i test di `ccx` usano (`_trave()` in `tests/test_server.py`), «corri il solido» → fasi «copio il deck · lancio ccx · leggo .dat e .frd», «corsa del solido <id> · N s · cartella …». Percorso inesistente → 400 «…No such file…» nella riga rossa, bottoni liberi.
- [ ] **Step 7: Errori.** `python -m nova --solutore /bin/false --porta 8820` → `⌘⏎` → «errore in solutore: …» e il `<details>` «registro del solutore» con la coda. Server spento a metà polling → «il server non risponde», attesa sparita, bottoni liberi.
- [ ] **Step 8: Larghezze e zoom** — 1280, 1920, zoom 200 % (viewport 640×400, dpr 2): i verdetti scorrono nel pannello, nessun testo tagliato, i «vai» raggiungibili con ⇥ e con il fuoco visibile.
- [ ] **Step 9: Spegni i server.** Conteggi finali JS e pytest (698 → 710 segni Python; i test JS di `corsa.test.js` e `tastiera.test.js`).

## Mutanti da dichiarare rossi, per chi esegue

Con controllo nullo verde prima di ogni mutante; copia del file prima, ripristino dalla copia.

1. `server.py:SidecarProcesso.chiedi` — **tieni** il `timeout=self.soffitto_s` e togli il solo `except queue.Empty`: la `queue.Empty` finisce nell'`except Exception` esterno e il motivo diventa «Empty: » invece di «nessuna risposta dal sidecar entro 0.2 s» → rosso in 0,2 s. (Togliere il *timeout*, come diceva la prima stesura, non fa rosso: fa **appendere** il test per sempre, e un test appeso non è una prova.)
2. `server.py:SidecarProcesso.chiedi` — `su_fase` chiamata **dopo** il ciclo invece che dentro → «le fasi arrivano al callback mentre arrivano» rosso.
3. `server.py:_avvia_lavoro` — il controllo «un lavoro in corso» tolto → «una seconda corsa … è 409» rosso.
4. `server.py:stato_corsa` — `_o_400` tolto dal `GET` → il test di `fase: deck` (ex `:606`) rosso **solo se** quel test asserisce `status_code == 400` (R4): leggendo il solo `d["fase"]` il mutante passa, perché senza `_o_400` la `GET` rende 200 con lo stesso corpo.
5. `corsa.py:scrivi_atomico` — `write_text` diretto sulla destinazione → «lascia il file intero o niente» rosso.
6. `corsa.js:vaiDi` — il primo elemento della coppia sostituito dal secondo → «vai dal primo oggetto» rosso.
7. `corsa.js:stantia` — `!==` → `JSON.stringify(a) !== JSON.stringify(b)` → «è l'identità dello snapshot» rosso.
8. `corsa.js:creaCorsa.lavora` — il `while` che si ferma alla prima `GET` senza guardare `stato` → «interroga finché non è finita» rosso.
9. `corsa.js:creaCorsa` — `generazione` non guardata → «azzera … una risposta in ritardo non lo riporta» rosso.
10. `tastiera.js` — `["enter", "corri"]` messo in `SENZA_MODIFICATORE` → «Invio nudo resta conferma» rosso (una `Map` tiene l'ultima chiave uguale: `conferma` viene scavalcata).
11. `server.py:_avvia_lavoro` — l'`except Exception` del thread tolto, con un sidecar finto che solleva un `RuntimeError` → rosso l'ingresso degenere nuovo del Task 2 («il sidecar solleva un'eccezione qualunque»). Senza quel test non lo prende nessuno, ed è il difetto che blocca il server per sempre (R2).

## Fuori da questa seduta

Il **riavvio del sidecar dopo un soffitto** (`docs/ricerca/03-stack-tecnico.md:121` lo chiede alla lettera: «riavvio del sidecar al comando successivo»): dopo un soffitto il processo resta impegnato sulla richiesta di prima, e ogni corsa successiva costa 660 s e finisce in errore per la vita del server. I **`verdetti_check` persi sul 400**: `chiediJson` (`file.js:31`) tiene solo `dati.motivo`, quindi su `fase: "deck"` l'interfaccia mostra il motivo e butta i verdetti che lo spiegano. La **potatura di `lavori`**: ogni corsa lascia in RAM il suo `fin` intero, e una pushover del 2×1 pesa 192 kB (`tests/test_server.py:79`). SSE (deciso polling). La coda con id per il sidecar (#22 resta aperto per quella parte: `/api/salute` e `/api/check` sono liberi, una seconda corsa è 409). Il selettore dei casi. La vista del solido (T7). Il rendering dei risultati e la deformata (13). `articolo` nei verdetti (`None` oggi). «Annulla» di una corsa in corso (P5 lo chiede: il sidecar non ha un comando di interruzione; il timeout di OpenSees è il tetto). L'importazione con la stessa attesa parlante (oggi «importazione…» sul bottone basta: dura meno di un secondo).

## Esito (10/09/2026, chiusura del ramo)

Sei task su sei con `subagent-driven-development` (ledger in `.superpowers/sdd/2026-09-10-t5-giornata-12-check-corsa/progress.md`): 15 commit da `f5a41e1`, **643 test JS** (da 610) e **713 pytest** (711 pass + 3 skip, da 695 + 3). Il Task 6 l'ha fatto il controller su **Chrome vero** (estensione accesa, server del worktree sulla 8819 e un secondo con `--solutore /bin/false` sulla 8820): solutore con percorso e poi versione, 16 verdetti dalla verifica, corsa del telaio 2×1 in 0,13 s con i 17 C3, modello malato rifiutato con «vai al nodo 7» che seleziona, elimina/corsa/`⌘Z` → «stantia»/`⇧⌘Z` → fresca, MURO 1 pushover con le fasi live e la corrente in grassetto, `⇧⌘⏎` durante rifiutato con parola, `/api/salute` 200 mentre gira, solido in 0,32 s con cartella, 400 sul percorso inesistente, solutore assente con «dove prenderlo», server spento → «il server non risponde»; 1920 px e zoom 200 % (640×400, dpr 2) sul Chrome headless via CDP: niente scorrimento orizzontale né testo tagliato.

**Quota.** Opus è tornato dal mattino del 10/09: architect, Task 2, Task 4 e le review grosse su Opus; il resto su Sonnet. Due implementer in parallelo nello stesso worktree hanno condiviso l'indice git: un `commit -a` del Task 2 si è portato dentro i file del Task 4 (`a9cff1d`, disfatto dall'implementer stesso e ricommesso per percorso) — **commit per percorso, mai `-a`, quando due lavorano nello stesso albero**.

**Decisioni prese con l'autore** (in testa al piano): polling e non SSE; due sidecar senza coda; check a richiesta e sempre prima della corsa; blocco «Corsa» fisso nel pannello; «stantia» per identità dello snapshot; «corri il solido» minimo.

**Ruling** (tutti nel ledger): R1-R15 dell'architect (fra cui: `occupato()` cancellato, `except Exception` nel thread del lavoro, `Event` al posto di `sleep` nei test, il 400 sul `GET` con il codice asserito, `testoAttesa` al decimo, `aria-live` solo su `#corsa-ultima`, la `fetch` finta che accoda `null` sulle `GET`); il «vai» dei verdetti punta al **contenitore** sano (combinazione/sezione/azione), non al riferimento rotto, e `nodo_controllo` solo se il nodo esiste (con `dof`); il tetto dei giri del polling resta fuori (il soffitto è nel server: un tetto client ucciderebbe una modale lunga legittima); il 409 porta il `run_id` con un motivo azionabile, il riaggancio della UI è debito; `prima()` in `creaCorsa` per la guardia del modo su tasti e bottoni, non sul solido.

**Difetti visti solo a schermo o nelle review di ramo, chiusi in `c3238fc` e `0f739ff`**: `⌘⏎` col fuoco nel campo del percorso riapriva il file (e nella palette sceglieva la voce); la durata «0,1291 s»; la riga del solutore con «Version 3.8.0 64-Bit (hash)» intera; la salute che restava «in verifica…» dopo un ricaricamento (409 sulla prima); i bottoni che saltavano la guardia del modo; **il sentinella EOF del lettore consumato una volta sola** (misurato dal code-reviewer: con un sidecar morto ogni richiesta dopo la prima aspettava 660 s); `verifica` senza la guardia di `generazione` (i verdetti del file vecchio sotto il nuovo); il messaggio «una corsa è già in corso» che restava dopo la corsa; le ragioni con float grezzi che sfondavano la griglia.

**Premesse false trovate dalle review**: «nella pagina non ci sono form» (`<form id="comando">` c'è; la conclusione su `⌘⏎` reggeva lo stesso); il ramo si chiamava `-importatore` (lo script del worktree aveva copiato la 11d); «220 px di pannello a 1280» (sono 320, `minmax(220px, 20rem)`); 14 puntamenti `file:riga` del piano scivolati; il piano dei mutanti non trovato dall'implementer del Task 4 (`grep "Mutante 8"`: l'elenco è numerato senza la parola); `pytest -q` che non stampa il riepilogo (serve `--tb=short -rs` senza `-q`).

**Fix che hanno creato o rischiato un difetto nuovo**: il mutante «`prima()` ignorata» ha **appeso** il test finché la `fetch` finta non è stata fatta cadere a sequenza finita (il polling non ha tetto: un test che lo apre deve chiudersi da solo); `prima()` fermava anche il solido (B2 della review di ramo, tolto); il formattatore a due decimali sui millimetri delle giunzioni (giornata 11d) ha il suo gemello qui in `secondiTesto`, tenuto separato da `testoAttesa` (R14).

**Debiti dichiarati, non pagati qui**: `lavori` non si pota (192 kB per pushover); il riavvio del sidecar dopo un soffitto (R7: dopo un soffitto il processo resta impegnato e ogni corsa successiva costa 660 s); il riaggancio della UI a una corsa in corso dopo un ricaricamento (il 409 porta il `run_id`, `chiediJson` tiene solo il motivo); i `verdetti_check` persi sul 400 di `fase: deck` (R4); il tetto dei giri del polling e «annulla» di una corsa (P5 lo chiede, il sidecar non ha un comando); le `ragione` lunghe e con float grezzi che il server manda nei verdetti (`picco`, `vincolo_in_pianta`, `reazioni`: testo del server, fuori diff); i tre involucri uguali di `corri`/`verifica`/`corriSolido` (B5); `con_cartella` (B6); `kbd` con glifi combinati da provare con lo screen reader (P2); `app.js` senza test automatici (quinta giornata: l'architect chiede `self-improving-agent` prima della 13); `chiediSalute` non testata; `CONTENITORI` con la chiave ridondante.

**Verdetto di ramo**: security approvato; test-writer approvato (11/11 mutanti coperti); spec conforme (unico scostamento R4, dichiarato); code non approvato (1 alta, 2 medie, 6 basse) e craft non approvato (2 P1, 1 P2) → fix di fine ramo `0f739ff`; re-review scoped: 9 su 9 chiusi, un difetto nuovo dal fix (`dì(null)` in `suEsito` cancellava qualunque messaggio a fine corsa) chiuso in `566c301` con due test; **mergiabile**.

### Debiti sanati prima del merge (10/09, su richiesta dell'autore: «sana i debiti prima»)

Commit `1b438ec`, `921bed6`, `f086bd3`, `5a6ffea`, `a799d0b` (review scoped Opus → fix → re-review Sonnet: tutto chiuso; lo zombie dopo `kill()` raccolto); **648 test JS** (da 643) e **718 pytest + 3 skip** (da 711 + 3):
- **Il riavvio del sidecar** (R7, `docs/ricerca/03-stack-tecnico.md:121`): dopo un soffitto, uno stdout chiuso, una pipe rotta o un processo uscito (`poll()`), il comando successivo riparte da un sidecar nuovo con la sua coda e il suo lettore. La prova dal vivo con `pkill -f nova.sidecar` sotto il server ha scoperto che la pipe rotta sulla scrittura non segnava il sidecar come rotto: senza il kill vero il difetto non si vedeva, i finti del test hanno uno stdin che non si rompe.
- **`lavori` si pota** oltre `max_lavori` (20, i più vecchi finiti); i risultati restano su disco in `corse/`. La cartella c'è per tutti i lavori (`con_cartella` via).
- **Il riaggancio**: un 409 con `run_id` (la pagina ricaricata a metà corsa) non rifiuta più — `corsa.js` segue quella corsa con la `GET` e la registra **stantia**, perché lo snapshot su cui gira non si conosce. `chiediJson` porta ora il corpo e lo stato dell'errore.
- **I `verdetti_check` sul 400** di `fase: deck` (R4) si mostrano accanto al motivo.
- **Le ragioni delle reazioni** in notazione italiana («Σ reazioni (0, 0, 112 500) contro Σ carichi (0, 0, 112 500), scarto 2,12e-18») al posto dei `repr` dei float.
- I tre involucri di `corri`/`verifica`/`corriSolido` in uno (`conBottone`), con `suEsito` fuori dal `try` ma non muto, e il modello letto una volta per gesto; `CONTENITORI` senza la chiave doppia.
- **La review dei debiti** (Opus) ha trovato un alto vero: il riaggancio non guardava il **tipo** di lavoro — «corri il solido» durante una corsa del telaio l'avrebbe presentata come solido, senza verdetti e senza «stantia». Ora il 409 e la `GET` portano il `comando` e ci si riaggancia solo se combacia; la `GET` legge sotto lock (la potatura da un altro thread dava 500 al posto di 404); il riavvio termina, aspetta due secondi e uccide (`wait` **solleva** `TimeoutExpired`: il primo `kill()` stava in un ramo irraggiungibile); `_num_it` non stampa «-0»; il cronometro di una riagganciata parte dai secondi del server.

**Restano, perché non sono codice**: il `kbd` con i glifi combinati da provare con lo screen reader; `app.js` senza test automatici (metodo: prima della 13, come chiede l'architect). Il tetto dei giri del polling resta fuori per scelta (il soffitto è nel server). Nota per l'autore: `python -m nova` apre una scheda del browser a ogni avvio; le prove di questa giornata ne hanno aperte alcune sul tuo Chrome (8818, 8819, 8820) che si possono chiudere.
