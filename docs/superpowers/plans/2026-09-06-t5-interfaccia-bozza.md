# NOVA T5 — interfaccia (giorni 10–15, con Mario) — BOZZA di piano

> **Bozza, non piano eseguibile.** Scritta dal controller nella notte fra il 5 e il 6/09/2026 per orientare le sei giornate di UI con Mario. Prima di ogni giornata: `superpowers:brainstorming` (percorso bounded, il flusso esiste già in `static/`) → design in chat → approvazione di Mario → `frontend-engineer` con `impeccable` (**mai** senza: PRODUCT.md e la nota [[feedback-prototipi-ai-slop]] valgono: zero sovrapposizioni, zero testo tagliato, verifica in browser a più larghezze) → review a quattro → PR. Ogni giornata chiude con `python -m nova` avviato e la funzione provata da Mario a mano.

**Goal:** tutta l'interfaccia della spec (story 1–14 spazio; 15–22 sezioni/armature/materiali; 23–28 vincoli/azioni/combinazioni; 29–35 check e corsa; 36–42 risultati statici; 45 modi animati; 48 curva pushover con scrubber; 56–57 scheda Confronto; 62–64 presentazione; 65–68 file). Variante **B «Doppia vista»** del prototipo #8 (ramo `prototype/spazio-di-modellazione`: `index.html`, `app.js`, `model.js`, `plane.js`, `fe.js`, `palette.js`), letta per la struttura e non per il dettaglio.

**Architecture (dalla spec «Interfaccia»):** JS a mano + three.js (CDN allowlist? no: NOVA è locale, i file stanno in `static/`, three.js copiato in `static/vendor/` con licenza MIT accanto); stato in memoria con uno snapshot per comando e cronologia lineare; selezione unica sincronizzata fra albero, piano (SVG), spazio (three.js) e pannello; risultati dal file della corsa via `/api/risultati/{run_id}`, marcati stantii per impronta; test con `node` sui moduli puri (`model.js`, riduttori dei comandi, layout delle etichette) come deciso in «Testing Decisions»; il server serve `static/` e le rotte di T1–T4. Tema chiaro «colonna tensegrale» (`#dcdad5`, `#141414`, `#b8321e`, mono tabulare), un solo rosso, unità in un punto.

## Backend già pronto (T1–T4) su cui la UI si appoggia

`GET /api/salute` · `POST /api/check` · `POST /api/corsa {modello, casi?}` → `run_id` · `GET /api/risultati/{run_id}` · `POST /api/modello/apri|salva` · `POST /api/importa {percorso}` (T2) · `POST /api/ccx {inp}`, `POST /api/confronto` (T3) · pushover e stato sezioni dentro `corsa` (T4). Forme: `verdetti[]{controllo, oggetto, stazione, caso, esito, ragione, articolo, valori, rimedio}`; `per_caso[caso]{spostamenti, reazioni, sollecitazioni[asta][stazione]{x_rel, N, Vy, Vz, T, My, Mz}}` (momento positivo tende le fibre inferiori, taglio dei manuali); `modi[n]{f, T, forma, massa_partecipante, cumulata}`; `passi[]{spostamento, taglio_base, spostamenti, stato_sezioni, algoritmo}` — `spostamento` (e `caduta.spostamento`) è **relativo** a `run.pushover.u0`, `spostamenti[nodo]` è **assoluto**, e i verdetti si leggono per `(controllo, caso)` perché `convergenza` e `spostamenti` escono anche con `caso: "pushover"`; `run.hash_modello` = impronta di `apri`/`salva`. Manca (da aggiungere in T5 se serve): un endpoint di streaming degli eventi di fase (oggi la risposta arriva intera; per l'«attesa parlante» serve SSE su `/api/corsa` o polling di `fasi` — decidere il giorno 12).

## Sei giornate (proposta, da confermare con Mario il giorno 10)

| giorno | consegna | story | verifica a fine giornata |
|---|---|---|---|
| 10 | **Spazio di modellazione**: piano SVG + spazio three.js affiancati e sincronizzati, nodi con `N` e `x; z`, estrusione `B` con ghost/Esc/Invio, selezione unica, albero a sinistra, barra dei tasti in basso, stati vuoti che insegnano il gesto | 1–7, 10–14 | telaio 2×1 disegnato da zero in < 2 min da Mario, cronometrato |
| 11 | **Pannello destro + palette + cronologia + file**: ispettore della selezione (nome, coordinate, vincolo con preimpostazioni incastro/cerniera/carrello), sezioni con editor delle barre (file per lato, staffe, copriferro, riduzione, danno), materiali per classe con «personalizzato» e veste, azioni/carichi/combinazioni, `⌘K` con valori nella query, `⌘Z`/`⇧⌘Z`, apri/salva, **asta fra due nodi scelti** (vedi sotto) | 8–9, 12, 15–28, 65–67 | il MURO 1 ricostruito da `docs/caso-studio/README.md` solo con tastiera e palette; salvato, riaperto, stessa impronta |
| 12 | **Check Model + corsa + attesa parlante**: verdetti a doppio canale con `rimedio` cliccabile (seleziona l'oggetto), localizzazione del solutore con «dove prenderlo», fasi nominate e durata misurata, errore del solutore con coda del registro, risultati stantii in rosso per impronta | 29–35, 41–42, 68 | corsa del telaio 2×1 e del MURO 1 dalla UI; un modello malato rifiutato con il rimedio che porta all'oggetto |
| 13 | **Risultati statici**: deformata con scala stampata «×n (auto \| a mano)» e ombra indeformata, M sul lato teso con etichetta al picco, V e N con segno e verso i→j in legenda, stazioni, M srotolato sotto il piano, spostamenti/reazioni per nodo; **collisioni delle etichette risolte** (leader line, priorità, nascondi sotto soglia) | 36–40 | trave appoggiata: M(mid) = qL²/8 letto sull'etichetta; nessuna etichetta sovrapposta a 1280 e a 1920 px |
| 14 | **Modi animati + pushover + Confronto**: modi con `1 2 3`, frequenza e massa partecipante accanto; curva taglio–spostamento con passi cliccabili e scrubber sulla deformata, stato delle sezioni a 4 valori su due canali; scheda Confronto con tabella (massa prima), classi, bias, export CSV/LaTeX e PNG/SVG delle figure | 45, 48–49, 56–61 | MURO 1: modo 2 nel piano animato; pushover scorsa con lo scrubber; tabella esportata uguale a `docs/caso-studio/confronto.csv` |
| 15 | **Presentazione + critique + polish**: tasto `P` (pannelli ritratti, etichette ≥ 46 px, testo ≥ 32 px, aste ≥ 6 px, nodi ≥ 14 px, contrasto ≥ 3:1), un solo rosso, viridis con legenda, leggibile in bianco e nero; `impeccable critique` + `polish` + `audit` (a11y, responsive); riserva per ciò che è scivolato | 62–64 + tutto | letto da 8 m su uno schermo di 2 m (prova in aula o con lo zoom del browser a 25 %); zero sovrapposizioni; `audit` senza finding Important |

## Deciso a fine giornata 10, guardando il prototipo accanto al lavoro fatto

Mario ha confrontato quel che c'è con il prototipo del ticket #8 e ha detto «manca tutto».
Il confronto è giusto e vale la pena capirlo, perché non si ripeta la sorpresa alla giornata 12.

**Il prototipo aveva un solutore finto.** `fe.js` — rigidezza diretta 2D scritta in JavaScript,
con `autotest()` sulla trave appoggiata — calcolava deformata, reazioni e M **nel browser**. Per
questo il giorno uno mostrava già i diagrammi negli screenshot. NOVA non può farlo: i risultati
devono venire da OpenSees attraverso il sidecar, e quella catena è check (12) → risultati (13).

Ne segue un **avvallamento strutturale**: la cosa vera sembra più povera del mock finché la
catena reale non atterra. Non è un difetto del lavoro, è una conseguenza dell'ordine — ed era
esattamente quel che il «filo verticale» proposto il giorno 10 evitava. Mario ha confermato
l'ordine orizzontale della bozza anche dopo aver visto l'effetto: **la giornata 11 resta
pannello, sezioni, materiali, carichi, palette, apri/salva.**

Tre decisioni:

1. **Ordine orizzontale confermato.** I risultati restano alla giornata 13. Chi legge questa
   bozza alla giornata 12 sappia che fino ad allora il programma disegna e non calcola, e che
   è una scelta presa due volte, non una svista.
2. **Asta fra due nodi scelti: entra nella giornata 11.** Oggi un'asta nasce solo per
   estrusione (lunghezza + freccia), e per chiudere una maglia bisogna indovinare la misura.
   Il riduttore `estrudi` riusa già il nodo d'arrivo entro `TOLLERANZA_MM`: serve solo il
   gesto — nodo selezionato, `B`, secondo nodo, Invio. Il prototipo lo aveva nella variante A.
3. **Importazione dal prior: fuori da T5, e fuori dal calendario della tesi.** Non era in
   nessuna delle sei giornate — buco del piano trovato da Mario. `/api/importa` esiste ed è
   testato lato dati dalla T2; manca solo la UI. Mario l'ha collocata «dopo T6», ma T6 sono i
   giorni 16-18 e il 19 è la consegna, dichiarata «niente sviluppo»: **una giornata dopo T6
   non esiste**. Va quindi nel cassetto «dopo la tesi», con finestra nativa e installer. Sul
   prior vero produrrebbe comunque un modello vuoto con otto regioni scartate: mostrerebbe un
   buco, non una capacità.

## Rischi noti e decisioni da prendere il giorno 10

- **AI slop del prototipo**: si riusa la struttura (doppia vista, albero, pannello, palette, tastiera), non il codice: `app.js`/`plane.js` del prototipo si leggono e si riscrivono con `impeccable`, non si copiano.
- **three.js**: in `static/vendor/three.module.js` (MIT, versione fissata e annotata) — nessun CDN: NOVA gira senza rete.
- **Test JS con node**: i moduli puri (stato, riduttori dei comandi, cronologia, layout etichette, formattazione italiana dei numeri) hanno test `node --test`; il DOM non si testa (si guarda in browser, con `frontend-engineer` che verifica davvero).
- **Attesa parlante**: SSE o polling — decidere con Mario; il sidecar emette già gli eventi di fase riga per riga.
- **Tagli** (spec «Further Notes»): se il tempo manca, in ordine: pushover con scrubber → stato sezioni → export PNG/SVG → Confronto in UI (resta l'export da riga di comando di T3). Mai: Check Model, controlli, scala stampata, presentazione.
- **Mobile**: fuori scope (app locale da scrivania); responsive solo fra 1280 e 2560 px.

## Cosa NON è in questa bozza

Codice, test, step: arrivano giornata per giornata dal brainstorming con Mario. La bozza serve a non ricominciare da zero il giorno 10 e a tenere l'ordine delle consegne allineato alle story e ai tagli.

## Collocato l'08/09/2026, dall'inventario previsto-contro-fatto

L'inventario (`docs/superpowers/specs/2026-09-08-inventario-previsto-fatto.md`) ha trovato **otto
voci senza una giornata né un'esclusione scritta**. L'autore ha chiesto di collocarle tutte. Questa
tabella è la fonte: chi pianifica una giornata la legge insieme alla tabella delle sei giornate
sopra, e le story qui elencate si **aggiungono** a quelle già assegnate.

La giornata 11 è divisa in quattro — 11a, 11b, 11c, 11d — perché l'importatore, riaperto dall'autore
il 07/09 dopo essere stato messo nel cassetto il giorno 10, non entra in nessuna delle tre senza
schiacciarle. Le story della 11c originale (25-27, 8) restano nella 11c.

| giornata | story aggiunte | cosa, e perché qui |
|---|---|---|
| **11a** ✓ chiusa | — | file, ispettore col vincolo, cucitura. PR #30. |
| **11b** | 15-22 (già assegnate) + **55** | sezioni, barre, materiali. La 55 — `origine.modificata` che oggi nessuno alza — entra qui perché è dove i comandi che modificano sezioni e materiali vengono scritti: **una riga in ognuno**. |
| **11c** | 25-27, **8** (palette `⌘K`), P3 | azioni, carichi, combinazioni; `⌘Z` è già fatto (giornata chiusa a metà il 07/09). La palette è l'ultimo «a metà» dei dieci principi. |
| **11d** *(nuova)* | **51, 52, 53, 54** | **l'importatore in interfaccia, come rendiconto**. Il brief di design esiste già (`docs/superpowers/specs/2026-09-07-shape-ux-modellazione.md`, §3): il caso principale è il rifiuto, le righe scartate hanno valore/soglia/spiegazione, `mancano` è un elenco di decisioni. Va **prima** della 12 perché usa la stessa grammatica dei verdetti del Check Model, e farla prima significa che la 12 la riusa invece di inventarne un'altra. |
| **12** | 29-32, 35, 41, 42 (già assegnate) + **6-7 parte corsa** | il pannello guadagna i controlli della corsa; l'albero non cambia. |
| **13** | 36-40, 63 (già assegnate) | invariata. |
| **14** | 45, 48, 49, 56 (già assegnate) + **43, 44, 46, 47** + **7 parte modi** | **l'interfaccia della modale** (modi fisso o «auto», masse con coefficiente) e **del non lineare** (fibre, pushover in controllo di spostamento) entrano qui, accanto ai modi animati e alla curva: sono le impostazioni di ciò che questa giornata mostra, e senza non si può lanciare la corsa che produce i risultati da animare. |
| **15** | 62, P10 (già assegnate) | invariata. |

**Fuori dal calendario della tesi, con la ragione:**

- **5** — più piani di lavoro. La giornata 10 è stata chiusa con un solo piano x–z, e il telaio della
  tesi è piano: un secondo piano non cambia nessun numero dell'appendice. **Dopo la tesi.**
- **60** — PNG/SVG e piccoli multipli del confronto. La bozza li elenca già nei tagli della 14 (riga
  63). Restano lì; se l'appendice ne ha bisogno, si esportano a mano dal JSON. **Dopo la tesi.**
- **66** — `MIGRAZIONI` vuoto. **Non è un buco**: la story è provabile solo quando lo schema passerà
  a 2, e oggi è a 1. Si chiude da sé alla prima migrazione.

**Per wayfinder:** ogni riga qui sopra è un ticket in potenza. Le story hanno il loro testo nella
spec (`docs/superpowers/specs/2026-09-05-nova-v1-design.md`, righe 27-124); la 11d ha già il brief
di design; le 43-47 hanno il backend pronto e testato (`nova/modale.py`, `nova/legami.py`,
`nova/deck.py`), quindi sono lavoro di sola superficie.
