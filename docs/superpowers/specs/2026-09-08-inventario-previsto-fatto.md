# Inventario — previsto contro fatto

> 08/09/2026, ramo `feat/interfaccia-11c` a `174c7a7`. Ogni spunta è verificata nel codice, non sul
> titolo. Legenda: ✓ fatto · ◐ a metà (backend sì, interfaccia no, salvo nota) · ✗ non fatto.
> Le croci portano il perché: la giornata T5 che le programma, l'esclusione della spec, o **non
> programmato** — che è la categoria che conta.

## Le 68 story della spec

**Spazio di modellazione**

| | story | dove / perché |
|---|---|---|
| ✓ | 1 nodo con `N` e `x; z` | `app.js:366`, `modo.js:96` |
| ✓ | 2 asta per estrusione col ghost | `app.js:379-387`, `modo.js:123` |
| ✓ | 3 Esc annulla, Invio conferma | `app.js:164-191` |
| ✓ | 4 piano SVG + spazio 3D sincronizzati | `piano.js:112`, `spazio.js:138` |
| ✗ | 5 piano di lavoro attivo fra più piani | giornata 10 chiusa senza — `piano.js:83` ha solo x–z |
| ◐ | 6 albero del modello | nodi e aste sì; sezioni e carichi → 11b |
| ◐ | 7 pannello destro | ispettore e Storia sì; corsa → 12, modi → 14 |
| ✗ | 8 palette `⌘K` | programmato per la 11c, ultimo pezzo |
| ✓ | 9 cronologia navigabile | `cronologia.js:21-28`, `storia.js` |
| ✓ | 10 sposta nodo, aste seguono | `comandi.js:72-84` |
| ✓ | 11 elimina nodo con aste e carichi | `comandi.js:89-100` |
| ✓ | 12 nome libero senza cambiare identità | `comandi.js:106-117` |
| ✓ | 13 stati vuoti che insegnano | `index.html:25-53` |
| ✓ | 14 scorciatoie nella barra | `tastiera.js:118-133` |

**Sezioni, armature, materiali**

| | story | dove / perché |
|---|---|---|
| ◐ | 15 catalogo sezioni `b × h` | `modello.py:128-140`; interfaccia → 11b |
| ◐ | 16 armatura descrittiva | `modello.py:109-140`; interfaccia → 11b |
| ✗ | 17 editor grafico delle barre | programmato per la 11b |
| ◐ | 18 riduzione per lato | `modello.py:121-127`; interfaccia → 11b |
| ◐ | 19 danno su asta | `modello.py:91-105`; interfaccia → 11b |
| ◐ | 20 materiale per classe NTC | `modello.py:189-205`, `catalogo.py`; interfaccia → 11b |
| ◐ | 21 veste dei materiali | `modello.py:349-351`, `legami.py:139`; interfaccia → 11b |
| ✗ | 22 valori accanto a ogni curva | programmato per la 11b |
| ✓ | 23 vincolo a sei gradi con preimpostazioni | `vincoli.js`, `pannello.js:70-107` |
| ✓ | 24 peso proprio unica azione generata | `modello.py:475-483` |
| ◐ | 25 azioni con natura NTC | `modello.py:262-275`; interfaccia → 11c |
| ◐ | 26 cinque carichi, termico rifiutato | `modello.py:213-260`; interfaccia → 11c |
| ◐ | 27 combinazione come somma pesata | `modello.py:277-288`; interfaccia → 11c |
| ✓ | 28 caso di carico = una corsa sola | `modello.py:486`, `sidecar.py:47-61` |

**Check Model e corsa**

| | story | dove / perché |
|---|---|---|
| ◐ | 29 Check Model, 16 controlli | `check.py:81-286`; interfaccia → 12 |
| ◐ | 30 verdetto con controllo, oggetto, rimedio | `check.py:16-20`; interfaccia → 12 |
| ◐ | 31 localizza OpenSees con «dove prenderlo» | `corsa.py:67-69`; interfaccia → 12 |
| ◐ | 32 attesa parlante | eventi a `corsa.py:112-134`; interfaccia e streaming → 12 |
| ✓ | 33 errore strutturato, sidecar vivo | `corsa.py:240`, `sidecar.py:211` |
| ✓ | 34 file di risultati per corsa | `corsa.py:306-317` |
| ◐ | 35 risultati stantii | impronta a `corsa.py:306`; marcatura → 12 |

**Risultati statici e controlli**

| | story | dove / perché |
|---|---|---|
| ✗ | 36 deformata con scala stampata | programmato per la 13 |
| ✗ | 37 M sul lato teso, V e N con segno | programmato per la 13 |
| ◐ | 38 sollecitazioni per stazione | `corsa.py:245-268`; diagramma → 13 |
| ✗ | 39 M srotolato asta per asta | programmato per la 13 |
| ◐ | 40 spostamenti e reazioni per nodo | `corsa.py:286`; interfaccia → 13 |
| ◐ | 41 sette controlli a tre valori | `corsa.py:494-553`; interfaccia → 12 |
| ◐ | 42 verdetti a doppio canale | canale in uso altrove; verdetti → 12 |

**Analisi modale**

| | story | dove / perché |
|---|---|---|
| ◐ | 43 modale con modi fisso o «auto» | `modale.py:32,138`; **interfaccia non programmata** |
| ◐ | 44 masse da azioni con coefficiente | `modello.py:304-313`; **interfaccia non programmata** |
| ✗ | 45 modi animati con `1 2 3` | programmato per la 14 |

**Non lineare**

| | story | dove / perché |
|---|---|---|
| ◐ | 46 fibre e legami non lineari | `legami.py:139-214`, `deck.py:633`; **interfaccia non programmata** |
| ◐ | 47 pushover in controllo di spostamento | `modello.py:322`, `deck.py:880`; **interfaccia non programmata** |
| ✗ | 48 curva con passi cliccabili e scrubber | programmato per la 14 |
| ◐ | 49 stato sezioni su due canali | `passi.py:31-106`; interfaccia → 14 |
| ✓ | 50 scala di algoritmi con caduta dichiarata | `deck.py:697-749`, `passi.py:209` |

**Importatore dal prior**

| | story | dove / perché |
|---|---|---|
| ◐ | 51 importa prior anche vuoto, con scartate | `importa.py:202,117`; **interfaccia: rinviata «dopo la tesi», riaperta il 07/09** |
| ◐ | 52 fetta → asta, giunzione → nodo | `importa.py:202`; idem |
| ◐ | 53 pannello «mancano» | `importa.py:45-48`; idem |
| ◐ | 54 coordinate ruotate nella terna | `importa.py:80-116`; idem |
| ✗ | 55 editing marca l'origine come modificata | `modello.py:48` dichiarato, **nessuno lo alza, non programmato** |

**Confronto con il solido**

| | story | dove / perché |
|---|---|---|
| ◐ | 56 scheda «Confronto» | tabella a `confronto.py:454-495`; scheda → 14 |
| ✓ | 57 prima riga la massa | `confronto.py:259-284` |
| ✓ | 58 localizza `ccx`, importa `.inp` | `ccx.py:70-138`, `inp.py` |
| ✓ | 59 CSV Abaqus con schema | `confronto.py:33,142-175` |
| ◐ | 60 export con provenienza | JSON/CSV/TeX sì; **PNG/SVG e piccoli multipli nei tagli della 14** |
| ✓ | 61 «verifica, non validazione» ovunque | `confronto.py:25,492,518,576` |

**Presentazione e leggibilità**

| | story | dove / perché |
|---|---|---|
| ✗ | 62 modo presentazione con `P` | programmato per la 15 |
| ◐ | 63 un solo rosso, viridis, B/N | rosso e doppio canale sì; viridis → 13 |
| ✓ | 64 unità in un punto e su ogni numero | `index.html:56`, `albero.js:27` |

**File e riproducibilità**

| | story | dove / perché |
|---|---|---|
| ✓ | 65 un solo JSON con schema e unità | `modello.py:354`, `file.js:131-151` |
| ◐ | 66 migrazione da versione precedente | meccanismo a `modello.py:435`; `MIGRAZIONI` vuoto — **non provabile finché lo schema resta a 1** |
| ✓ | 67 campi sconosciuti rifiutati col nome | `modello.py:40,442-449` |
| ✓ | 68 deck e registro conservati | `corsa.py:307-308` |

**Conto: ✓ 27 · ◐ 31 · ✗ 10.** Delle 41 non intere, 33 hanno una giornata T5 o un'esclusione; **8 no**.

## Le dodici funzioni intelligenti della ricerca

| | funzione | dove / perché |
|---|---|---|
| ✓ | C1 Check Model deterministico | `check.py:81-286` |
| ✓ | C2 modi automatici fino alla massa | `modale.py:32,138` |
| ✓ | C3 equilibrio e sanity post-solutore | `corsa.py:494-553` |
| ✗ | C4 generatore combinazioni NTC | fuori scope per decisione, spec riga 245 |
| ✓ | C5 convergenza adattiva con log | `deck.py:697-749` |
| ✗ | C6 relazione di calcolo §10.2.1 | fuori scope per decisione, spec riga 245 |
| ✗ | C7 verifica sezioni c.a. | fuori scope per decisione |
| ✗ | C8 LLM → modello | fuori scope per decisione |
| ✗ | C9 spiegazione dei risultati con LLM | fuori scope per decisione |
| ✗ | C10 MCP server del modellatore | fuori scope per decisione |
| ✗ | C11 da disegno a modello | fuori scope, e la ricerca stessa lo sconsiglia |
| ✗ | C12 ottimizzazione parametrica | fuori scope per decisione |

La Raccomandazione 1 diceva «prima C1-C6»: fatte le quattro non escluse.

## I dieci principi UX della ricerca

| | principio | stato |
|---|---|---|
| ✗ | P1 ogni numero porta il contraddittore | non ancora esigibile: nessun risultato in interfaccia → 12-13 |
| ✓ | P2 nessuna finestra che blocca | `window.prompt` sparito, verificato |
| ◐ | P3 tastiera prima, palette con conflitti | tastiera sì; **palette `⌘K` → 11c** |
| ✓ | P4 anteprima prima del commit, undo visibile | ghost vivo + Storia |
| ✗ | P5 attesa parlante | non ancora esigibile; applicato dove lo è già (`index.html:44`) |
| ✗ | P6 combinazioni dalla norma | fuori scope v1 |
| ✓ | P7 colormap, doppio canale | applicato |
| ✓ | P8 divulgazione progressiva | applicato |
| ✓ | P9 unità ed espressioni nei campi | `numeri.js:58,121` |
| ✗ | P10 leggibile a 8 metri | → 15 |

## Gli otto buchi senza calendario, con la proposta

| story | cosa manca | proposta |
|---|---|---|
| 43, 44 | interfaccia della modale: scelta modi fisso/auto, masse | **programmare per la 14**, accanto ai modi animati |
| 46, 47 | interfaccia del non lineare: fibre, pushover | **programmare per la 14**, accanto alla curva |
| 51-54 | interfaccia dell'importatore | riaperta il 07/09: **da collocare in T5** — decisione di calendario, non di codice |
| 55 | `origine.modificata` che nessuno alza | **implementare nella 11b**, dove si editano sezioni e materiali: è una riga per comando |
| 60 | PNG/SVG del confronto | nei tagli dichiarati della 14: **dopo la tesi**, a meno che serva per l'appendice |
| 66 | `MIGRAZIONI` vuoto | **non è un buco**: la story è provabile solo quando lo schema passerà a 2 |
| 5 | più piani di lavoro | giornata 10 chiusa senza; il modello è spaziale ma il telaio è piano: **dopo la tesi** |
| 6, 7 | albero e pannello incompleti | si completano da sé con 11b (sezioni), 12 (corsa), 14 (modi) |
