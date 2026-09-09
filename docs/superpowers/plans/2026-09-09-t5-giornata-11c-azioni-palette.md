# NOVA T5 — giornata 11c: azioni, carichi, combinazioni, palette ⌘K

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** il telaio 2×1 della fixture si ricostruisce da zero **con i suoi carichi**: `Z` «permanenti travi; G2» crea l'azione, `Q` su un'asta «−12,5» le mette il distribuito, `Q` su un nodo «Fx 20000» il nodale, `K` «SLU; fondamentale» la combinazione con i coefficienti scritti nell'ispettore; il piano disegna le frecce dell'azione in vista; `⌘K` apre una palette che trova ogni comando per nome, con la scorciatoia accanto, e accetta il valore nella query («sezione 300 × 500», «q -12,5»); il file salvato ha la stessa forma di `tests/fixture/telaio_2x1.nova.json`.

**Architecture:** nessuna rotta nuova — il backend ha già le cinque classi di carico, l'azione con natura NTC, la combinazione a termini e il caso `Z<id>`/`C<id>` (`nova/modello.py:231-306`). Due moduli puri nuovi (`carichi.js`: costanti, grammatiche del campo, testo e frecce dei carichi; `palette.js`: filtro fuzzy con valore, e il riquadro) e dieci riduttori in `comandi.js`; l'ispettore guadagna due editor con la forma di `editorAsta`, l'albero due rami, la tastiera tre lettere e una combinazione. La palette non esegue niente da sé: passa la voce e il valore allo **stesso** ramo di `app.js` che serve il tasto, così un comando che «non si può ora» risponde con la frase che il tasto darebbe.

**Tech Stack:** moduli ES nativi, `node --test` per i moduli puri e per gli editor sul DOM finto, `pytest` invariato (nessun file sotto `nova/` cambia), il server FastAPI di T1 solo per la prova in browser.

**Spec:** `docs/superpowers/specs/2026-09-05-nova-v1-design.md` — story 25-27 (righe 57-59), 28 (riga 60, «un caso di carico è una corsa sola»: qui si mostra il nome del caso, la corsa è T6), 24 (riga 56, il peso proprio è l'unica azione generata), 8 (riga 34, palette `⌘K`), forma del file (riga 157). Calendario: `docs/superpowers/plans/2026-09-06-t5-interfaccia-bozza.md:85` (11c = 25-27, 8, P3).

**Ricerca che questo piano applica** (`docs/ricerca/index.md`): riga 19, ricerca 07 — `07-ux-modellatore.md:81` (Plasticity: palette con esecuzione per nome, conflitti evidenziati; «ricerca fuzzy di ogni comando + valori»), `:150` (P3 «Tastiera prima, palette con conflitti in rosso»), `:146-157` (P2 nessuna finestra che blocca, P4 anteprima e undo, P8 divulgazione progressiva, P9 unità ed espressioni nei campi); riga 20, ricerca 08 — `08-modelli-dati-riferimento.md:195` («natura del carico e norma sono dato, non commento»: la natura è un campo obbligatorio dell'azione, non un testo libero), `:216-217` (R3: vocabolario SAF per nature e categorie — `G1/G2/Q/E` e la categoria d'uso sono già nel modello). Mappa wayfinder #31: la 11c è l'ultima giornata «a metà» del calendario T5 prima della passata sull'uso.

**Ramo:** `feat/interfaccia-11c-azioni` da `main` a `c1a0337`, worktree `/Users/mario/GitHub/NOVA-wt/interfaccia-11c` (venv pronto, `nova ok 3.12.13`). PR verso `main`.

## Global Constraints

- **Lingua italiana** in interfaccia, commenti, messaggi di commit; identificatori tecnici invariati. Le chiavi del modello sono quelle di `nova/modello.py` **alla lettera** (`Fx`, `fattore_z`, `dT_uniforme`, `quasi_permanente`): `extra="forbid"` (`nova/modello.py:40`) rifiuta al salvataggio qualunque chiave inventata qui.
- **Notazione numerica italiana**: la virgola separa i decimali; `stampaNumero`/`cifre` in uscita, `leggiNumero`/`leggiEspressione` in ingresso (`static/numeri.js:15,58`).
- **Unità `mm-N-MPa-t-s`**, dichiarate su ogni numero: forze in **N**, momenti in **N·mm**, carico distribuito in **N/mm**, cedimenti in **mm** e **rad**, temperatura in **°C** e gradiente in **°C/mm**.
- **Palette «colonna tensegrale»**: fondo `#dcdad5`, inchiostro `#141414`, **un solo rosso** `#b8321e` = attenzione. Mai «cream palette». Il rosso a 11 px misura 4,28:1 su `--fondo` (`static/stile.css:133`): il testo in rosso sta a **13 px o più**, oppure è inchiostro con filetto rosso come `.avviso` (`stile.css:139`).
- **Nessun bundler, nessun `package.json`, nessuna rete a tempo d'uso.**
- **WCAG AA**; nessuna informazione sul solo colore; fuoco sempre visibile; ogni campo con nome accessibile che **comincia** dal testo visibile della sua etichetta (WCAG 2.5.3, `pannello.js:135-141`).
- **Zero sovrapposizioni, zero testo tagliato**, verificato a 1280 e 1920 px e a zoom 200 %.
- **Nessun file sotto `nova/` né `meshrec/` cambia.** Nessun test Python cambia.
- Riduttori **puri**: `(modello, argomenti) → modello nuovo`, `structuredClone`, mai mutare l'ingresso; un comando che non cambia niente restituisce **il modello ricevuto** per riferimento (`comandi.js:37-46`, `cronologia.js:12-27`).
- I comandi con un `<campo>` testuale non hanno ghost: `ghostDelComando` (`modo.js:126-141`) ha l'elenco esplicito di chi ne ha uno (`nodo`, `sposta`, `estrudi`) e **non si tocca**.
- Comando dei test JS (dalla cartella `static/`): `node --test test/*.test.js` — punto di partenza **444 pass**.
- Comando dei test Python (non cambiano, si rilanciano a fine ramo):
  `/Users/mario/GitHub/NOVA-wt/interfaccia-11c/.venv/bin/python -P -m pytest /Users/mario/GitHub/NOVA-wt/interfaccia-11c/tests -p no:cacheprovider --color=no --rootdir=/Users/mario/GitHub/NOVA-wt/interfaccia-11c`
  `pytest -q` **non stampa il riepilogo**: vale l'exit code, e il conteggio si ricava con `tr -cd '.sFEx' | wc -c`. Punto di partenza **698**.
- Server per la prova in browser: `env -C /Users/mario/GitHub/NOVA-wt/interfaccia-11c .venv/bin/python -P -m nova --porta 8817`. **Mai la 8765, né 8766-8767.** Spegnerlo a fine prova.
- **Mai `git checkout --` per revertire un mutante**: copiare il file prima, ripristinare dalla copia.
- Un comando per chiamata Bash, percorsi assoluti, `git -C`; niente `cd … &&`.

## Quel che il backend dà già, e non va reinventato

- `nova/modello.py:231-240` — `CaricoNodale{tipo:"nodale", nodo:int, Fx Fy Fz Mx My Mz: float = 0}`; `:243-247` `CaricoDistribuito{tipo:"distribuito", asta:int, q:float, direzione ∈ x|y|z|locale_y|locale_z = "z"}`; `:250-254` `CaricoGravita{fattore_x, fattore_y, fattore_z: float = 0}`; `:257-265` `Cedimento{nodo, ux uy uz rx ry rz: float|None = None}`; `:268-272` `Termico{asta, dT_uniforme: float = 0, gradiente: float|None = None}`. Unione discriminata su `tipo` (`:275-278`).
- `nova/modello.py:281-293` — `Azione{id, nome, natura ∈ G1|G2|Q|E, categoria: str|None = None, generata=False, carichi=[]}`; validator: **natura `Q` senza categoria è rifiutata** («natura Q senza categoria d'uso»). `:296-306` `Termine{azione:int, coefficiente:float}`, `Combinazione{id, nome, termini:[Termine], tipo ∈ fondamentale|caratteristica|frequente|quasi_permanente|sismica|None, generata=False}`. `:308-319` `AnalisiStatica{tipo:"statica", casi:[^[ZC][0-9]+$], legami, passi}`: il caso di un'azione è `Z<id>`, di una combinazione `C<id>`.
- `nova/modello.py:497-505` `assicura_peso_proprio` — la chiama **il sidecar alla corsa** (`nova/sidecar.py:36`): l'interfaccia non crea mai il peso proprio, e un'azione `generata: true` letta da un file si mostra come tale. `nova/check.py:28-38` `_porta_il_peso_proprio`: vale anche una gravità scritta a mano con `fattore_z`.
- `nova/check.py:164-203` `riferimenti` — un carico su un nodo o un'asta inesistente, un termine su un'azione inesistente, un caso non dichiarato: **rifiutati dal Check Model**. I riduttori qui li rifiutano prima, con la stessa sostanza. `:238-241` `carico_termico`: **non passato** se c'è un termico, rimedio «togli il carico termico». Il modello lo accetta (`Termico` è nel formato): story 26 alla lettera.
- `nova/deck.py:296-311` `_fattori` — `Z<id>` → `{id: 1.0}`; `C<id>` → due termini sulla stessa azione **si sommano**. L'editor tiene **un** termine per azione: la somma resta possibile da file, non nasce dall'interfaccia.
- `tests/fixture/telaio_2x1.nova.json` — azione 1 «permanenti travi» `G2` con due `distribuito{asta: 4|5, q: -12.5, direzione: "z"}`; azione 2 «spinta in testa» `Q` categoria «vento» con `nodale{nodo: 4, Fx: 20000}`; combinazione 1 «SLU» `fondamentale`, termini `1 × 1,5` e `2 × 1,5`; `contatori.azione = 2`, `contatori.combinazione = 1`. È la forma che il Task 9 deve riprodurre.
- `static/modello.js:14-17` `LISTE` ha già `azione: "azioni"` e `combinazione: "combinazioni"`; `:19-33` `modelloVuoto()` ha `azioni: []`, `combinazioni: []`, `analisi: []`; `:37-43` `prossimoId(m, "azione")` funziona già.
- `static/comandi.js:17-22` `ErroreComando(messaggio, rimedio)`; `:25-28` `numero(v, nome)`; `:30` `copia`; `:35` `marcaModificata` (le azioni non hanno `origine`: non si usa); `:46` `cambiata`; `:109-121` `eliminaNodo` **filtra già** i carichi per `c.nodo` e per le aste che spariscono (`c.asta`); `:123` `LISTE` di `rinomina` ha **quattro** tipi: senza `azione` e `combinazione`, `R` su un'azione solleva «tipo sconosciuto». `:200-215` `positivo`, `sezioneEsistente` come stampo dei controlli.
- `static/test/comandi.test.js:114` usa `fz` minuscolo in un carico nodale: lo schema vuole `Fz`. Il test passa perché `eliminaNodo` guarda solo `nodo` e `asta` — si corregge (Task 2) perché una fixture con una chiave che il server rifiuterebbe è una premessa falsa in attesa.
- `static/tastiera.js:15-41` `TASTI` (voci con `codice, tasto, etichetta, aiuto, contesto, esempio?, campo?, tipi?, modificatore?`); `:56-68` le tre mappe; `:93` `daControllo` (un `<input type="text">` a fuoco si tiene **tutti** i tasti senza modificatore, e lascia passare `⌘`); `:106` `voceDaEvento`; `:125-143` `vociDellaBarra(contesto, tipoSelezionato)`. `etichettaCampo(voce, bersaglio)` (`:76-77`) stampa «`campo` `tipo` `id`».
- `static/app.js` — stato `cronologia, selezione, modo, comando, percorso, impronta` (`:25-42`); `scegli(tipo, id)` (`:97-110`); `creaPannello(…, callback)` (`:113-133`); `creaFile` con `suApertura` che azzera `selezione` e `modo` (`:143-158`); `apriComando(voce, {bersaglio, esempio})` (`:192-201`); `chiudiComando` (`:207-211`); `submit` del campo con il dispatch per `comando.tipo` (`:248-257`); `confermaDanno` come stampo di un conferma a grammatica «a; b; c» (`:385-394`); `esegui(fn, etichetta)` (`:396-406`); `ridisegna` con la guardia `esiste` a **quattro** vie (`:408-440`); `disegnaBarra` (`:442-458`); `keydown` con i rami su `voce.codice` (`:466-635`) — il ramo `elimina` (`:573-590`) ha già la mappa `sezione|materiale`.
- `static/pannello.js:18` `CERCA`, `:81` `RIGHE`, `:505` `EDITORI` — tre tabelle a quattro vie; `:150-163` `campoNumero({etichetta, nome, valore, unita, alCambio, suAvviso})` (testo vuoto → avviso «non è un numero», il campo torna com'era); `:165-177` `scelta({etichetta, nome, opzioni:[[v, testo]], valore, alCambio})`; `:179-189` `gruppo(legenda, classe, nota)`; `:191-196` `bottone(testo, alClic)`; `:250-282` `editorAsta` come stampo (ritorna `{elementi, controlli}`); `:507-550` `creaPannello` ritrova il fuoco **per nome accessibile**.
- `static/albero.js:22-57` — `gruppo(nome, quante)` salta i gruppi vuoti; voci `{tipo, id, testo, conta?}`; «1 asta» al singolare (`:39-46`).
- `static/piano.js:82-175` — `creaPiano(contenitore, {suSelezione, suSfondo})`, `disegna(m, {selezione, ghost})`; `schermo(n)` specchia `z`; `millimetriPerPixel()` (`:104-108`) è il fattore `s` con cui ogni misura in px diventa mm nel `viewBox`; costanti `INCHIOSTRO`, `ROSSO`, `MONO`, `RAGGIO`, `OFFSET_ETICHETTA` (`:11-32`); `el(nome, attributi)` (`:34`). `estensione(m, ghost)` (`:45`) inquadra **solo nodi e ghost**: una freccia lunga in px non sposta il riquadro.
- `static/modo.js:64-78` `esitoScelta` — in modo asta rifiuta ogni tipo che non sia `nodo` con una frase generica: un'azione cliccata nell'albero cade lì senza modifiche. `:148-151` `contestoBarra`.
- `static/index.html:69-80` il `<form id="comando">` con `label`, `#comando-campo`, `.aiuto`; `:81` `<footer id="barra">`. `stile.css:20-38` la griglia del `body` (`overflow: hidden`), `:179-192` `#comando`.
- DOM finto dei test: `test/pannello.test.js:10-35` (`elementoFinto` con `value`, `selected`, `innerHTML`, `dispatch(ev, bersaglio)`, `focus()`), `:169-178` `pannelloFinto` con la lista `AZIONI` dei callback (`:161-162`); `test/piano.test.js:115-138` (`elementoSvgFinto`, `tutti(radice, nome)`, `pianoFinto`); `test/albero.test.js:8-30`.
- Prototipo della palette: `git show prototype/spazio-di-modellazione:prototype/spazio-di-modellazione/palette.js` — `filtra(q)` separa le parole numeriche, `punteggio(nome, q)` (sottostringa → `100 − indice`, altrimenti sottosequenza), ↑↓ Invio Esc con `stopPropagation`. Si legge per la struttura; l'`innerHTML` con i dati dentro **non si copia**.

## Quattro decisioni prese qui, non da scoprire in browser

1. **Il peso proprio non nasce in interfaccia.** Lo aggiunge il sidecar alla corsa (`nova/sidecar.py:36`). Un'azione o una combinazione con `generata: true` letta da un file si mostra con la parola «generata» nell'albero e nell'ispettore; i riduttori **non toccano** il flag. Il «[DA DECIDERE] generata vs corretta» di `CONTEXT.md:119-176` si risolve così per v1: la distinzione «corretta a mano» arriva col generatore di combinazioni (fase 2), non prima.
2. **`Q` ha un'azione di destinazione, e la nomina.** È l'ultima azione scelta nell'albero o creata con `Z`; se non c'è, l'ultima della lista; se il modello non ha azioni, `Q` rifiuta con «prima crea un'azione: premi Z». L'aiuto del campo la scrive («→ azione «permanenti travi»»), l'etichetta della Storia pure, e il piano disegna **i suoi** carichi col nome in alto a sinistra. Uno stato solo (`azioneCorrente`), una regola sola.
3. **Il termico entra, e l'editor avverte.** Il formato lo prevede e il Check Model lo rifiuta (story 26): l'editor lo ammette e mostra sotto il carico l'avviso «attenzione: il Check Model rifiuta il carico termico in v1 (`nova/check.py`)». Nessun rifiuto in interfaccia: sarebbe una seconda verità sul formato.
4. **La palette elenca tutto, e dice cosa non si può ora.** Ogni voce di `TASTI` compare con la scorciatoia accanto; quelle che la barra non promette in questo contesto (`vociDellaBarra`) restano in lista, in rosso a 13 px con la parola «non ora» (P3: i conflitti si vedono, non si nascondono). Invio su una di quelle passa dallo stesso ramo del tasto, che risponde con la sua frase («il danno vuole un'asta»). Il valore nella query è **tutto ciò che segue la prima parola**: entra nel campo di comando e conferma subito; se il campo lo rifiuta, resta aperto col testo e col messaggio, come se lo si fosse scritto a mano.

## Struttura dei file

| file | responsabilità | puro |
|---|---|---|
| `static/carichi.js` | `NATURE`, `TIPI_CARICO`, `DIREZIONI`, `TIPI_COMBINAZIONE`, `COMPONENTI`, `GRADI_CEDIMENTO`; `normalizzaCarico`, `leggiAzione`, `leggiNodale`, `leggiDistribuito`, `leggiCombinazione`, `testoCarico`, `frecceDeiCarichi` | sì |
| `static/modello.js` | `azione`, `combinazione`, `combinazioniDellAzione`, `analisiCheUsano`, `nomeCaso` | sì |
| `static/comandi.js` | `+10` riduttori: `creaAzione`, `modificaAzione`, `aggiungiCarico`, `modificaCarico`, `togliCarico`, `eliminaAzione`, `creaCombinazione`, `modificaCombinazione`, `impostaTermine`, `eliminaCombinazione`; `rinomina` su sei tipi | sì |
| `static/tastiera.js` | `Z` azione, `Q` carico (solo nodo o asta), `K` combinazione, `⌘K` palette | sì |
| `static/palette.js` | `filtraVoci(voci, query)` puro; `creaPalette(radice, {suScelta})` con `apri({voci, disponibili})`, `chiudi`, `aperta` | metà |
| `static/albero.js` | rami «Azioni» e «Combinazioni» | no |
| `static/pannello.js` | `editorAzione`, `editorCombinazione`; righe per azione e combinazione; `campoNumero` con `vuotoAmmesso` | no |
| `static/piano.js` | le frecce dei carichi dell'azione in vista, col nome in alto a sinistra | no |
| `static/app.js` | cucitura: `azioneCorrente`, tre conferme, `eseguiVoce` estratto dal `keydown`, la palette, `esiste` a sei vie, `⌫` su azioni e combinazioni | no |
| `static/index.html`, `static/stile.css` | `#palette`; stile della palette, di `.non-ora`, dei carichi nell'editor | — |

---

### Task 1: `carichi.js` e i lookup di `modello.js` — costanti, grammatiche, testo, frecce

**Files:**
- Create: `static/carichi.js`, `static/test/carichi.test.js`
- Modify: `static/modello.js:45-54` (cinque export in coda ai lookup)
- Test: `static/test/modello.test.js`

**Interfaces:**
- Consumes: `leggiEspressione` (`numeri.js:58`, `null` se non valida), `cifre` (`legame.js:49`), `nodo`, `asta` (`modello.js:45-46`).
- Produces (tutto esportato):
  - `NATURE = ["G1", "G2", "Q", "E"]`; `TIPI_CARICO = ["nodale", "distribuito", "gravita", "cedimento", "termico"]`; `DIREZIONI = ["x", "y", "z", "locale_y", "locale_z"]`; `TIPI_COMBINAZIONE = ["fondamentale", "caratteristica", "frequente", "quasi_permanente", "sismica"]`; `COMPONENTI = ["Fx", "Fy", "Fz", "Mx", "My", "Mz"]`; `GRADI_CEDIMENTO = ["ux", "uy", "uz", "rx", "ry", "rz"]`.
  - `NOME_TIPO = {nodale: "nodale", distribuito: "distribuito", gravita: "gravità", cedimento: "cedimento", termico: "termico"}`; `NOME_TIPO_COMBINAZIONE = {fondamentale: "fondamentale (SLU)", caratteristica: "caratteristica (rara)", frequente: "frequente", quasi_permanente: "quasi permanente", sismica: "sismica"}`.
  - `normalizzaCarico(c) → {carico, messaggio}`: `carico` ha **solo** le chiavi dello schema del suo tipo, coi default del backend; `messaggio` (e `carico: null`) se il tipo è sconosciuto, un numero non è finito, una direzione non è in `DIREZIONI`, manca `nodo`/`asta` dove serve. I riferimenti (il nodo esiste?) **non** si guardano qui: li guarda `comandi.js`, che ha il modello.
  - `leggiAzione(testo) → {azione: {nome, natura, categoria} | null, messaggio}` — grammatica «nome; natura; categoria», natura maiuscola in `NATURE`, `Q` vuole la categoria; testo vuoto → `{azione: null, messaggio: null}`.
  - `leggiNodale(testo) → {carico: {Fx?, …} | null, messaggio}` — grammatica «Fx 20000; Fz -5000», nomi senza distinzione di maiuscole, valori con `leggiEspressione`.
  - `leggiDistribuito(testo) → {carico: {q, direzione} | null, messaggio}` — «−12,5» oppure «−12,5; x»; direzione di default `"z"`.
  - `leggiCombinazione(testo) → {combinazione: {nome, tipo} | null, messaggio}` — «SLU; fondamentale», tipo facoltativo, «quasi permanente» accettato come `quasi_permanente`.
  - `testoCarico(c) → string` — una riga per persona con le unità.
  - `frecceDeiCarichi(m, azione, lunghezza) → [{da: {x, z}, a: {x, z}, testo: string|null}]` in mm: una freccia per carico nodale (la punta sul nodo, il verso di `(Fx, Fz)`), tre per carico distribuito (a ¼, ½, ¾ dell'asta, il verso del carico, il testo solo su quella di mezzo); gravità, cedimento e termico non hanno frecce; `azione` nulla → `[]`.
  - In `modello.js`: `azione(m, id)`, `combinazione(m, id)` (come `sezione`), `combinazioniDellAzione(m, id)` (le combinazioni con un termine su quell'azione), `analisiCheUsano(m, caso)` (le analisi statiche il cui `casi` contiene quel caso), `nomeCaso(tipo, id)` → `"Z3"` per `azione`, `"C1"` per `combinazione`.
  - Avvisi esportati: `AVVISO_AZIONE`, `AVVISO_NODALE`, `AVVISO_DISTRIBUITO`, `AVVISO_COMBINAZIONE` (le stringhe qui sotto).

**Ingressi degeneri:**
- `normalizzaCarico({tipo: "vento"})` → `{carico: null, messaggio}` che elenca i cinque tipi
- `normalizzaCarico({tipo: "nodale", nodo: 4})` → `{Fx: 0, Fy: 0, Fz: 0, Mx: 0, My: 0, Mz: 0}` compilati, nessuna chiave in più; con `Fx: "20"` (stringa) o `NaN` → `messaggio`
- `normalizzaCarico({tipo: "distribuito", asta: 1, q: -12.5, direzione: "nord"})` → `messaggio` che elenca le direzioni; senza `direzione` → `"z"`; con `q` mancante → `messaggio` («q è obbligatorio»)
- `normalizzaCarico({tipo: "cedimento", nodo: 1})` → i sei gradi a `null` (tutti liberi è lecito per lo schema, `nova/modello.py:257-265`); `ux: "x"` → `messaggio`
- `normalizzaCarico({tipo: "termico", asta: 1})` → `dT_uniforme: 0, gradiente: null`
- `normalizzaCarico({tipo: "nodale", nodo: 4, colore: "rosso"})` → la chiave in più **sparisce** (il server la rifiuterebbe), nessun messaggio
- `leggiAzione("")` → `{azione: null, messaggio: null}`; `leggiAzione("permanenti travi")` → `messaggio` (manca la natura); `leggiAzione("spinta; q")` → `messaggio` («Q vuole la categoria»); `leggiAzione("spinta; q; vento")` → `{nome: "spinta", natura: "Q", categoria: "vento"}`; `leggiAzione("x; G3")` → `messaggio` che elenca le nature; `leggiAzione("; G1")` → `messaggio` (nome vuoto)
- `leggiNodale("Fx 20000")` → `{Fx: 20000}`; `leggiNodale("fz -5000; mx 2000000")` → `{Fz: -5000, Mx: 2000000}`; `leggiNodale("Mx 2e6")` → `messaggio` (misurato nel worktree: `leggiEspressione("2e6")` è `null`, la notazione esponenziale non è nella grammatica di `numeri.js`); `leggiNodale("20000")` → `messaggio` (senza nome della componente non si sa dove va); `leggiNodale("Fw 3")` → `messaggio`; `leggiNodale("Fx (1+1)*10000")` → `{Fx: 20000}` (P9); `leggiNodale("Fx 1; Fx 2")` → `messaggio` (componente ripetuta)
- `leggiDistribuito("-12,5")` → `{q: -12.5, direzione: "z"}`; `"-12,5; x"` → `direzione: "x"`; `"-12,5; locale z"` → `"locale_z"`; `"abc"` → `messaggio`; `"0"` → `{q: 0, …}` (zero è un carico che si può scrivere: lo rifiuta nessuno)
- `leggiCombinazione("SLU")` → `{nome: "SLU", tipo: null}`; `"SLU; fondamentale"` → `tipo: "fondamentale"`; `"rara; quasi permanente"` → `"quasi_permanente"`; `"x; slu"` → `messaggio` che elenca i tipi
- `testoCarico({tipo: "nodale", nodo: 4, Fx: 20000, Fy: 0, …})` → «nodo 4 · Fx 20 000 N»; tutte le componenti a zero → «nodo 4 · nullo»; distribuito → «asta 4 · q −12,5 N/mm lungo z»; gravità con solo `fattore_z: -1` → «gravità · z ×−1»; cedimento con solo `uz: -5` → «cedimento nodo 2 · uz −5 mm»; termico senza gradiente → «termico asta 3 · ΔT 20 °C»
- `frecceDeiCarichi(m, null, 500)` → `[]`; azione senza carichi → `[]`; nodale su un nodo che non esiste → **saltato**, non un'eccezione; nodale con solo `Fy` o solo momenti → nessuna freccia (fuori dal piano x–z); distribuito con `q: 0` → nessuna freccia; distribuito con direzione `y` o `locale_y` → nessuna freccia; distribuito lungo `z` con `q < 0` su una trave orizzontale → tre frecce che **scendono** (`da.z > a.z`); `locale_z` su un pilastro verticale → frecce perpendicolari all'asta

- [ ] **Step 1: I test** — `static/test/carichi.test.js`, un `test(…)` per riga qui sopra. Stampo:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { NATURE, TIPI_CARICO, DIREZIONI, TIPI_COMBINAZIONE, COMPONENTI, normalizzaCarico, leggiAzione,
         leggiNodale, leggiDistribuito, leggiCombinazione, testoCarico, frecceDeiCarichi } from "../carichi.js";
import { creaNodo, estrudi } from "../comandi.js";
import { modelloVuoto } from "../modello.js";
import { cifre } from "../legame.js";

// Una trave orizzontale 0→5000 (asta 1) e un pilastro 0→3000 in su (asta 2).
const telaio = () => {
  let m = creaNodo(modelloVuoto(), { x: 0, z: 0 });
  m = estrudi(m, { da: 1, dx: 5000, dz: 0 });
  return estrudi(m, { da: 1, dx: 0, dz: 3000 });
};

test("normalizzaCarico: un nodale porta le sei componenti a zero e nessuna chiave in più", () => {
  const { carico, messaggio } = normalizzaCarico({ tipo: "nodale", nodo: 4, colore: "rosso" });
  assert.equal(messaggio, null);
  assert.deepEqual(carico, { tipo: "nodale", nodo: 4, Fx: 0, Fy: 0, Fz: 0, Mx: 0, My: 0, Mz: 0 });
});
test("normalizzaCarico: tipo sconosciuto, numero non finito, direzione sconosciuta", () => {
  assert.match(normalizzaCarico({ tipo: "vento" }).messaggio, /nodale, distribuito, gravita, cedimento, termico/);
  assert.notEqual(normalizzaCarico({ tipo: "nodale", nodo: 1, Fx: "20" }).messaggio, null);
  assert.match(normalizzaCarico({ tipo: "distribuito", asta: 1, q: -1, direzione: "nord" }).messaggio, /x, y, z, locale_y, locale_z/);
  assert.notEqual(normalizzaCarico({ tipo: "distribuito", asta: 1 }).messaggio, null);
});
test("normalizzaCarico: cedimento tutto libero e termico senza gradiente sono leciti", () => {
  assert.deepEqual(normalizzaCarico({ tipo: "cedimento", nodo: 1 }).carico,
                   { tipo: "cedimento", nodo: 1, ux: null, uy: null, uz: null, rx: null, ry: null, rz: null });
  assert.deepEqual(normalizzaCarico({ tipo: "termico", asta: 1 }).carico, { tipo: "termico", asta: 1, dT_uniforme: 0, gradiente: null });
});
test("leggiAzione: la natura è obbligatoria, Q vuole la categoria", () => {
  assert.deepEqual(leggiAzione(""), { azione: null, messaggio: null });
  assert.notEqual(leggiAzione("permanenti travi").messaggio, null);
  assert.notEqual(leggiAzione("spinta; q").messaggio, null);
  assert.deepEqual(leggiAzione("spinta; q; vento").azione, { nome: "spinta", natura: "Q", categoria: "vento" });
  assert.match(leggiAzione("x; G3").messaggio, /G1, G2, Q, E/);
  assert.notEqual(leggiAzione("; G1").messaggio, null);
});
test("leggiNodale: coppie nome valore, senza distinzione di maiuscole, con le espressioni", () => {
  assert.deepEqual(leggiNodale("Fx 20000").carico, { Fx: 20000 });
  assert.deepEqual(leggiNodale("fz -5000; mx 2000000").carico, { Fz: -5000, Mx: 2000000 });
  assert.deepEqual(leggiNodale("Fx (1+1)*10000").carico, { Fx: 20000 });
  for (const t of ["20000", "Fw 3", "Fx 1; Fx 2", "Mx 2e6"]) assert.notEqual(leggiNodale(t).messaggio, null, t);
});
test("leggiDistribuito: q e direzione facoltativa", () => {
  assert.deepEqual(leggiDistribuito("-12,5").carico, { q: -12.5, direzione: "z" });
  assert.deepEqual(leggiDistribuito("-12,5; x").carico, { q: -12.5, direzione: "x" });
  assert.deepEqual(leggiDistribuito("-12,5; locale z").carico, { q: -12.5, direzione: "locale_z" });
  assert.deepEqual(leggiDistribuito("0").carico, { q: 0, direzione: "z" });
  assert.notEqual(leggiDistribuito("abc").messaggio, null);
});
test("leggiCombinazione: il tipo è facoltativo e «quasi permanente» si scrive con lo spazio", () => {
  assert.deepEqual(leggiCombinazione("SLU").combinazione, { nome: "SLU", tipo: null });
  assert.deepEqual(leggiCombinazione("rara; quasi permanente").combinazione, { nome: "rara", tipo: "quasi_permanente" });
  assert.match(leggiCombinazione("x; slu").messaggio, /fondamentale, caratteristica, frequente, quasi_permanente, sismica/);
});
test("testoCarico: unità su ogni numero, e le componenti nulle non si stampano", () => {
  // `cifre(20000)` separa le migliaia con U+202F (`numeri.js:148`): la stringa attesa si
  // costruisce con la stessa funzione, così il test non dipende da uno spazio invisibile.
  assert.equal(testoCarico({ tipo: "nodale", nodo: 4, Fx: 20000, Fy: 0, Fz: 0, Mx: 0, My: 0, Mz: 0 }), `nodo 4 · Fx ${cifre(20000)} N`);
  assert.equal(testoCarico({ tipo: "nodale", nodo: 4, Fx: 0, Fy: 0, Fz: 0, Mx: 0, My: 0, Mz: 0 }), "nodo 4 · nullo");
  assert.equal(testoCarico({ tipo: "distribuito", asta: 4, q: -12.5, direzione: "z" }), "asta 4 · q −12,5 N/mm lungo z");
  assert.equal(testoCarico({ tipo: "gravita", fattore_x: 0, fattore_y: 0, fattore_z: -1 }), "gravità · z ×−1");
  assert.equal(testoCarico({ tipo: "cedimento", nodo: 2, ux: null, uy: null, uz: -5, rx: null, ry: null, rz: null }), "cedimento nodo 2 · uz −5 mm");
  assert.equal(testoCarico({ tipo: "termico", asta: 3, dT_uniforme: 20, gradiente: null }), "termico asta 3 · ΔT 20 °C");
});
test("frecceDeiCarichi: un distribuito verso il basso su una trave dà tre frecce che scendono", () => {
  const az = { id: 1, nome: "g", natura: "G2", categoria: null, generata: false,
               carichi: [{ tipo: "distribuito", asta: 1, q: -12.5, direzione: "z" }] };
  const f = frecceDeiCarichi(telaio(), az, 500);
  assert.equal(f.length, 3);
  for (const k of f) { assert.ok(k.da.z > k.a.z); assert.equal(k.da.z - k.a.z, 500); }
  assert.deepEqual(f.map((k) => k.a.x), [1250, 2500, 3750]);
  assert.equal(f.filter((k) => k.testo).length, 1);
  assert.match(f[1].testo, /12,5 N\/mm/);
});
test("frecceDeiCarichi: il nodale punta sul nodo nel verso della forza", () => {
  const az = { id: 1, nome: "s", natura: "Q", categoria: "vento", generata: false,
               carichi: [{ tipo: "nodale", nodo: 3, Fx: 20000, Fy: 0, Fz: 0, Mx: 0, My: 0, Mz: 0 }] };
  const [f] = frecceDeiCarichi(telaio(), az, 500);
  assert.deepEqual(f.a, { x: 0, z: 3000 });
  assert.deepEqual(f.da, { x: -500, z: 3000 });
});
test("frecceDeiCarichi: niente frecce per gravità, y, momenti, q nullo, riferimenti rotti, azione nulla", () => {
  const m = telaio();
  const con = (c) => frecceDeiCarichi(m, { id: 1, nome: "x", natura: "G1", categoria: null, generata: false, carichi: [c] }, 500);
  assert.deepEqual(frecceDeiCarichi(m, null, 500), []);
  assert.deepEqual(con({ tipo: "gravita", fattore_x: 0, fattore_y: 0, fattore_z: -1 }), []);
  assert.deepEqual(con({ tipo: "distribuito", asta: 1, q: -1, direzione: "y" }), []);
  assert.deepEqual(con({ tipo: "distribuito", asta: 1, q: 0, direzione: "z" }), []);
  assert.deepEqual(con({ tipo: "distribuito", asta: 9, q: -1, direzione: "z" }), []);
  assert.deepEqual(con({ tipo: "nodale", nodo: 1, Fx: 0, Fy: 100, Fz: 0, Mx: 0, My: 5, Mz: 0 }), []);
  assert.deepEqual(con({ tipo: "nodale", nodo: 9, Fx: 1, Fy: 0, Fz: 0, Mx: 0, My: 0, Mz: 0 }), []);
});
test("frecceDeiCarichi: locale_z su un pilastro è perpendicolare all'asta", () => {
  const az = { id: 1, nome: "w", natura: "Q", categoria: "vento", generata: false,
               carichi: [{ tipo: "distribuito", asta: 2, q: 3, direzione: "locale_z" }] };
  const [f] = frecceDeiCarichi(telaio(), az, 500);
  assert.equal(f.a.z - f.da.z, 0);        // nessuna componente lungo il pilastro
  assert.equal(Math.abs(f.a.x - f.da.x), 500);
});
```

E in `static/test/modello.test.js`:

```js
import { azione, combinazione, combinazioniDellAzione, analisiCheUsano, nomeCaso } from "../modello.js";

test("lookup delle azioni e delle combinazioni, e chi usa chi", () => {
  const m = modelloVuoto();
  m.azioni.push({ id: 1, nome: "g", natura: "G2", categoria: null, generata: false, carichi: [] });
  m.combinazioni.push({ id: 1, nome: "SLU", termini: [{ azione: 1, coefficiente: 1.5 }], tipo: null, generata: false });
  m.analisi.push({ tipo: "statica", casi: ["Z1", "C1"] });
  assert.equal(azione(m, 1).nome, "g");
  assert.equal(azione(m, 2), null);
  assert.equal(combinazione(m, 1).nome, "SLU");
  assert.deepEqual(combinazioniDellAzione(m, 1).map((c) => c.id), [1]);
  assert.deepEqual(combinazioniDellAzione(m, 7), []);
  assert.equal(analisiCheUsano(m, "Z1").length, 1);
  assert.equal(analisiCheUsano(m, "Z9").length, 0);
  assert.equal(nomeCaso("azione", 3), "Z3");
  assert.equal(nomeCaso("combinazione", 1), "C1");
});
```

- [ ] **Step 2: Rosso** — `node --test test/carichi.test.js test/modello.test.js`: `ERR_MODULE_NOT_FOUND` e «is not a function».

- [ ] **Step 3: `modello.js`**, in coda ai lookup (`:45-54`):

```js
export const azione = (m, id) => m.azioni.find((a) => a.id === id) ?? null;
export const combinazione = (m, id) => m.combinazioni.find((c) => c.id === id) ?? null;
export const combinazioniDellAzione = (m, id) => m.combinazioni.filter((c) => c.termini.some((t) => t.azione === id));
/** Le analisi statiche che nominano quel caso (`nova/modello.py:308-319`): un'azione o una
 *  combinazione che una corsa aspetta non si elimina sotto i suoi piedi. */
export const analisiCheUsano = (m, caso) => (m.analisi ?? []).filter((a) => a.tipo === "statica" && (a.casi ?? []).includes(caso));
/** `Z<id>` per un'azione, `C<id>` per una combinazione: il nome del caso è quello che la corsa
 *  riceve (`nova/deck.py:296-311`), e l'ispettore lo stampa perché è ciò che si scrive in `analisi`. */
export const nomeCaso = (tipo, id) => `${tipo === "azione" ? "Z" : "C"}${id}`;
```

- [ ] **Step 4: `carichi.js`**:

```js
// I carichi e le azioni: costanti dello schema, le grammatiche del campo di comando, il testo
// per una persona e le frecce per il piano. Puro: niente DOM, niente modello mutato.
// Le costanti sono quelle di `nova/modello.py:231-306` **alla lettera**: `extra="forbid"`
// rifiuta al salvataggio qualunque chiave o valore inventato qui.

import { leggiEspressione } from "./numeri.js";
import { cifre } from "./legame.js";
import { nodo, asta } from "./modello.js";

export const NATURE = ["G1", "G2", "Q", "E"];
export const TIPI_CARICO = ["nodale", "distribuito", "gravita", "cedimento", "termico"];
export const DIREZIONI = ["x", "y", "z", "locale_y", "locale_z"];
export const TIPI_COMBINAZIONE = ["fondamentale", "caratteristica", "frequente", "quasi_permanente", "sismica"];
export const COMPONENTI = ["Fx", "Fy", "Fz", "Mx", "My", "Mz"];
export const GRADI_CEDIMENTO = ["ux", "uy", "uz", "rx", "ry", "rz"];

// A schermo: la chiave grezza è un nome di variabile, non una parola.
export const NOME_TIPO = { nodale: "nodale", distribuito: "distribuito", gravita: "gravità", cedimento: "cedimento", termico: "termico" };
export const NOME_TIPO_COMBINAZIONE = {
  fondamentale: "fondamentale (SLU)", caratteristica: "caratteristica (rara)", frequente: "frequente",
  quasi_permanente: "quasi permanente", sismica: "sismica",
};

export const AVVISO_AZIONE = "azione non letta: scrivi «nome; natura» — le nature sono G1, G2, Q, E; con Q anche la categoria: «spinta; Q; vento»";
export const AVVISO_NODALE = `carico non letto: scrivi «Fx 20000», o più componenti «Fx 20000; Fz -5000» — le componenti sono ${COMPONENTI.join(", ")} (N, N·mm)`;
export const AVVISO_DISTRIBUITO = `carico non letto: scrivi q in N/mm, «-12,5», e se serve la direzione «-12,5; x» — le direzioni sono ${DIREZIONI.join(", ")}`;
export const AVVISO_COMBINAZIONE = `combinazione non letta: scrivi «nome» o «nome; tipo» — i tipi sono ${TIPI_COMBINAZIONE.join(", ")}`;

const finito = (v) => typeof v === "number" && Number.isFinite(v);
const finitoONullo = (v) => v === null || v === undefined || finito(v);
const parti = (testo) => String(testo ?? "").split(";").map((p) => p.trim());
// «locale z» e «quasi permanente» come li scrive una persona: lo spazio vale l'underscore.
const chiave = (testo) => String(testo ?? "").trim().toLowerCase().replace(/\s+/g, "_");

/** Il carico con le sole chiavi del suo schema e i default del backend, o il messaggio. */
export function normalizzaCarico(c) {
  const tipo = c?.tipo;
  const no = (messaggio) => ({ carico: null, messaggio });
  if (!TIPI_CARICO.includes(tipo)) return no(`tipo di carico «${tipo}» sconosciuto: i tipi sono ${TIPI_CARICO.join(", ")}`);
  if (tipo === "nodale") {
    if (!Number.isInteger(c.nodo)) return no("il carico nodale vuole un nodo");
    const out = { tipo, nodo: c.nodo };
    for (const k of COMPONENTI) { const v = c[k] ?? 0; if (!finito(v)) return no(`${k} deve essere un numero`); out[k] = v; }
    return { carico: out, messaggio: null };
  }
  if (tipo === "distribuito") {
    if (!Number.isInteger(c.asta)) return no("il carico distribuito vuole un'asta");
    if (!finito(c.q)) return no("q è obbligatorio, in N/mm");
    const direzione = c.direzione ?? "z";
    if (!DIREZIONI.includes(direzione)) return no(`direzione «${direzione}» sconosciuta: le direzioni sono ${DIREZIONI.join(", ")}`);
    return { carico: { tipo, asta: c.asta, q: c.q, direzione }, messaggio: null };
  }
  if (tipo === "gravita") {
    const out = { tipo };
    for (const k of ["fattore_x", "fattore_y", "fattore_z"]) { const v = c[k] ?? 0; if (!finito(v)) return no(`${k} deve essere un numero`); out[k] = v; }
    return { carico: out, messaggio: null };
  }
  if (tipo === "cedimento") {
    if (!Number.isInteger(c.nodo)) return no("il cedimento vuole un nodo");
    const out = { tipo, nodo: c.nodo };
    for (const k of GRADI_CEDIMENTO) { const v = c[k] ?? null; if (!finitoONullo(v)) return no(`${k} deve essere un numero, o vuoto per «libero»`); out[k] = v; }
    return { carico: out, messaggio: null };
  }
  if (!Number.isInteger(c.asta)) return no("il carico termico vuole un'asta");
  const dT = c.dT_uniforme ?? 0, gradiente = c.gradiente ?? null;
  if (!finito(dT)) return no("dT_uniforme deve essere un numero");
  if (!finitoONullo(gradiente)) return no("il gradiente deve essere un numero, o vuoto");
  return { carico: { tipo, asta: c.asta, dT_uniforme: dT, gradiente }, messaggio: null };
}

/** «nome; natura; categoria». Il campo vuoto non è un testo sbagliato (`modo.js:esitoComando`). */
export function leggiAzione(testo) {
  if (String(testo ?? "").trim() === "") return { azione: null, messaggio: null };
  const [nome, natura0 = "", categoria0 = "", ...altro] = parti(testo);
  const natura = natura0.toUpperCase();
  if (!nome || !NATURE.includes(natura) || altro.length) return { azione: null, messaggio: AVVISO_AZIONE };
  const categoria = categoria0 || null;
  if (natura === "Q" && !categoria) return { azione: null, messaggio: "natura Q senza categoria d'uso: scrivi «nome; Q; categoria», per esempio «spinta; Q; vento»" };
  return { azione: { nome, natura, categoria }, messaggio: null };
}

/** «Fx 20000; Fz -5000»: coppie nome-valore. Un numero da solo non dice dove va. */
export function leggiNodale(testo) {
  if (String(testo ?? "").trim() === "") return { carico: null, messaggio: null };
  const carico = {};
  for (const p of parti(testo)) {
    const [nome, ...resto] = p.split(/\s+/);
    const k = COMPONENTI.find((c) => c.toLowerCase() === (nome ?? "").toLowerCase());
    const v = leggiEspressione(resto.join(" "));
    if (!k || v === null || k in carico) return { carico: null, messaggio: AVVISO_NODALE };
    carico[k] = v;
  }
  return { carico, messaggio: null };
}

/** «q» oppure «q; direzione». Zero è un carico che si può scrivere. */
export function leggiDistribuito(testo) {
  if (String(testo ?? "").trim() === "") return { carico: null, messaggio: null };
  const [q0, direzione0 = "z", ...altro] = parti(testo);
  const q = leggiEspressione(q0);
  const direzione = chiave(direzione0);
  if (q === null || !DIREZIONI.includes(direzione) || altro.length) return { carico: null, messaggio: AVVISO_DISTRIBUITO };
  return { carico: { q, direzione }, messaggio: null };
}

/** «nome» oppure «nome; tipo». */
export function leggiCombinazione(testo) {
  if (String(testo ?? "").trim() === "") return { combinazione: null, messaggio: null };
  const [nome, tipo0 = "", ...altro] = parti(testo);
  const tipo = tipo0 ? chiave(tipo0) : null;
  if (!nome || altro.length || (tipo !== null && !TIPI_COMBINAZIONE.includes(tipo))) return { combinazione: null, messaggio: AVVISO_COMBINAZIONE };
  return { combinazione: { nome, tipo }, messaggio: null };
}

// `cifre(-12.5)` stampa «-12,50» (due decimali sotto 100, `legame.js:49-52`): gli zeri in coda
// dopo la virgola cadono, come fa `conciso` in `pannello.js:16`, e il meno diventa tipografico.
const num = (v) => cifre(v).replace(/(,\d*?)0+$/, "$1").replace(/,$/, "").replace("-", "−");

/** Una riga per persona, unità su ogni numero, e le componenti nulle taciute. */
export function testoCarico(c) {
  if (c.tipo === "nodale") {
    const p = COMPONENTI.filter((k) => c[k]).map((k) => `${k} ${num(c[k])} ${k[0] === "F" ? "N" : "N·mm"}`);
    return `nodo ${c.nodo} · ${p.length ? p.join(" · ") : "nullo"}`;
  }
  if (c.tipo === "distribuito") return `asta ${c.asta} · q ${num(c.q)} N/mm lungo ${c.direzione.replace("_", " ")}`;
  if (c.tipo === "gravita") {
    const p = ["x", "y", "z"].filter((k) => c[`fattore_${k}`]).map((k) => `${k} ×${num(c[`fattore_${k}`])}`);
    return `gravità · ${p.length ? p.join(" · ") : "nulla"}`;
  }
  if (c.tipo === "cedimento") {
    const p = GRADI_CEDIMENTO.filter((k) => c[k] !== null && c[k] !== undefined).map((k) => `${k} ${num(c[k])} ${k[0] === "u" ? "mm" : "rad"}`);
    return `cedimento nodo ${c.nodo} · ${p.length ? p.join(" · ") : "nessuna componente"}`;
  }
  const g = c.gradiente === null || c.gradiente === undefined ? "" : ` · gradiente ${num(c.gradiente)} °C/mm`;
  return `termico asta ${c.asta} · ΔT ${num(c.dT_uniforme)} °C${g}`;
}

/** Il versore nel piano x–z lungo cui spinge un distribuito, o `null` se è fuori dal piano. */
function versoDistribuito(c, i, j) {
  const segno = Math.sign(c.q);
  if (c.direzione === "x") return { x: segno, z: 0 };
  if (c.direzione === "z") return { x: 0, z: segno };
  if (c.direzione === "locale_z") {
    const L = Math.hypot(j.x - i.x, j.z - i.z) || 1;
    // La normale sinistra al tratto i→j: per una trave da sinistra a destra è «in su».
    return { x: (-(j.z - i.z) / L) * segno, z: ((j.x - i.x) / L) * segno };
  }
  return null;  // y e locale_y: fuori dal piano di lavoro
}

/** Le frecce di un'azione, in mm, lunghe `lunghezza`: la punta sta dove il carico agisce.
 *  Chi non ha una geometria nel piano (gravità, cedimento, termico, momenti, `y`) non ne ha. */
export function frecceDeiCarichi(m, azione, lunghezza) {
  const frecce = [];
  for (const c of azione?.carichi ?? []) {
    if (c.tipo === "nodale") {
      const n = nodo(m, c.nodo);
      const modulo = Math.hypot(c.Fx ?? 0, c.Fz ?? 0);
      if (!n || modulo === 0) continue;
      const ux = (c.Fx ?? 0) / modulo, uz = (c.Fz ?? 0) / modulo;
      const forze = ["Fx", "Fz"].filter((k) => c[k]).map((k) => `${k} ${num(c[k])} N`).join(" · ");
      frecce.push({ da: { x: n.x - ux * lunghezza, z: n.z - uz * lunghezza }, a: { x: n.x, z: n.z }, testo: forze });
    } else if (c.tipo === "distribuito") {
      const a = asta(m, c.asta);
      const i = a && nodo(m, a.nodo_i), j = a && nodo(m, a.nodo_j);
      if (!i || !j || !c.q) continue;
      const verso = versoDistribuito(c, i, j);
      if (!verso) continue;
      for (const t of [0.25, 0.5, 0.75]) {
        const p = { x: i.x + (j.x - i.x) * t, z: i.z + (j.z - i.z) * t };
        frecce.push({ da: { x: p.x - verso.x * lunghezza, z: p.z - verso.z * lunghezza }, a: p,
                      testo: t === 0.5 ? `q ${num(c.q)} N/mm` : null });
      }
    }
  }
  return frecce;
}
```

- [ ] **Step 5: Verde** — `node --test test/*.test.js` → 444 + i nuovi, 0 fail. Attenzione a `testoCarico` del nodale: `cifre(20000)` mette il separatore delle migliaia ` ` (`numeri.js:148`), e il test lo aspetta.
- [ ] **Step 6: Commit** — `feat(carichi): costanti, grammatiche, testo e frecce dei carichi; lookup di azioni e combinazioni`

---

### Task 2: i riduttori — azioni, carichi, combinazioni, termini

**Files:**
- Modify: `static/comandi.js` (import da `carichi.js` e `modello.js`; `LISTE` a `:123`; dieci riduttori in coda)
- Test: `static/test/comandi.test.js` (e la correzione `fz` → `Fz` a `:114`)

**Interfaces:**
- Consumes: `TIPI_CARICO`, `NATURE`, `TIPI_COMBINAZIONE`, `normalizzaCarico` (Task 1); `azione`, `combinazione`, `combinazioniDellAzione`, `analisiCheUsano`, `nomeCaso`, `nodo`, `asta`, `prossimoId` (`modello.js`); `ErroreComando`, `numero`, `copia`, `cambiata` (`comandi.js:17-46`).
- Produces (tutto esportato):
  - `creaAzione(m, {nome, natura, categoria = null})` → `{id, nome, natura, categoria, generata: false, carichi: []}` in coda, `contatori.azione = id`.
  - `modificaAzione(m, {id, nome?, natura?, categoria?})` — solo i campi presenti; il risultato deve restare valido (Q con categoria).
  - `aggiungiCarico(m, {azione, carico})` — `normalizzaCarico`, poi il nodo/l'asta devono esistere; appende.
  - `modificaCarico(m, {azione, indice, carico})` — sostituisce **tutto** il carico a quell'indice (l'editor ricostruisce il carico con il campo cambiato); stesse guardie.
  - `togliCarico(m, {azione, indice})`.
  - `eliminaAzione(m, {id})` — rifiuta se una combinazione ha un termine su di lei («la usano le combinazioni 1, 2») o se un'analisi statica nomina `Z<id>` («la usa un'analisi: togli il caso Z3 dall'analisi, poi elimina»).
  - `creaCombinazione(m, {nome, tipo = null})` → `{id, nome, termini: [], tipo, generata: false}`.
  - `modificaCombinazione(m, {id, nome?, tipo?})` — `tipo: null` è lecito e lo scrive.
  - `impostaTermine(m, {id, azione, coefficiente})` — un termine per azione: sostituisce quello sull'azione, o lo aggiunge in coda; `coefficiente: null` lo toglie; l'azione deve esistere.
  - `eliminaCombinazione(m, {id})` — rifiuta se un'analisi statica nomina `C<id>`.
  - `rinomina` accetta `azione` e `combinazione` (`LISTE` a sei voci).

**Ingressi degeneri:**
- `creaAzione` con `natura: "G3"` → `ErroreComando` che elenca le nature; `natura: "Q"` senza categoria → `ErroreComando` «natura Q senza categoria d'uso» (la stessa frase del backend, `nova/modello.py:290`); `nome: ""` → `ErroreComando`
- `creaAzione` su un modello con `contatori.azione: 5` e nessuna azione → `id 6` (un identificatore eliminato non si riusa)
- `modificaAzione` con `natura: "Q"` su un'azione senza categoria → `ErroreComando`; con `categoria: null` su una `Q` → `ErroreComando`; con gli stessi valori → **il modello ricevuto** (non entra nella Storia); `id` inesistente → `ErroreComando`
- `aggiungiCarico` con `carico.tipo: "vento"` → `ErroreComando` (il messaggio di `normalizzaCarico`); nodale su `nodo: 99` → `ErroreComando` «il nodo 99 non esiste»; distribuito su `asta: 99` → `ErroreComando`; gravità → accettata senza riferimenti; termico → **accettato** (story 26: lo rifiuta il Check Model, non il modello)
- `aggiungiCarico` con una chiave in più (`colore`) → salvata **senza** quella chiave
- `modificaCarico` con `indice: 5` su un'azione con due carichi → `ErroreComando` «l'azione 1 ha 2 carichi»; `indice: -1` → `ErroreComando`; con lo stesso carico → il modello ricevuto
- `togliCarico` sull'ultimo carico → `carichi: []`, l'azione resta
- `eliminaAzione` usata da una combinazione → `ErroreComando` con gli identificatori delle combinazioni; usata da `analisi[0].casi = ["Z1"]` → `ErroreComando` con «Z1»; libera → sparisce, `contatori.azione` resta
- `creaCombinazione` con `tipo: "slu"` → `ErroreComando` che elenca i tipi; `tipo` assente → `null`
- `impostaTermine` con `azione: 9` inesistente → `ErroreComando`; `coefficiente: NaN` → `ErroreComando`; due volte sulla stessa azione → **un** termine, l'ultimo coefficiente; `coefficiente: null` → il termine sparisce; `null` su un'azione che non aveva termine → il modello ricevuto; `coefficiente: 0` → termine con `0` (zero è un numero, non un'assenza)
- `eliminaCombinazione` nominata da `analisi[0].casi = ["C1"]` → `ErroreComando`; libera → sparisce
- `rinomina(m, {tipo: "azione", id, nome})` → il nome cambia; `tipo: "combinazione"` idem
- `eliminaNodo` su un nodo con un carico nodale e un cedimento → entrambi spariscono; il carico di gravità della stessa azione **resta** (non ha `nodo`)
- ogni riduttore: il modello in ingresso resta intatto (`deepEqual` prima/dopo)

- [ ] **Step 1: Test** — in `static/test/comandi.test.js`, aggiungi agli import: `creaAzione, modificaAzione, aggiungiCarico, modificaCarico, togliCarico, eliminaAzione, creaCombinazione, modificaCombinazione, impostaTermine, eliminaCombinazione`. Correggi la riga 114: `fz: -5000` → `Fz: -5000`. Un `test(…)` per riga qui sopra; stampo:

```js
const conAzione = () => {
  let m = creaNodo(modelloVuoto(), { x: 0, z: 0 });
  m = estrudi(m, { da: 1, dx: 5000, dz: 0 });
  return creaAzione(m, { nome: "permanenti travi", natura: "G2" });
};

test("creaAzione: natura obbligatoria, Q con categoria, identificatore mai riusato", () => {
  const m = conAzione();
  assert.deepEqual(m.azioni[0], { id: 1, nome: "permanenti travi", natura: "G2", categoria: null, generata: false, carichi: [] });
  assert.equal(m.contatori.azione, 1);
  assert.throws(() => creaAzione(m, { nome: "x", natura: "G3" }), /G1, G2, Q, E/);
  assert.throws(() => creaAzione(m, { nome: "x", natura: "Q" }), /natura Q senza categoria d'uso/);
  assert.throws(() => creaAzione(m, { nome: "", natura: "G1" }), ErroreComando);
  const salto = { ...modelloVuoto(), contatori: { azione: 5 } };
  assert.equal(creaAzione(salto, { nome: "x", natura: "G1" }).azioni[0].id, 6);
});
test("aggiungiCarico: normalizza, controlla i riferimenti, ammette il termico", () => {
  const m = conAzione();
  const n = aggiungiCarico(m, { azione: 1, carico: { tipo: "distribuito", asta: 1, q: -12.5, colore: "rosso" } });
  assert.deepEqual(n.azioni[0].carichi, [{ tipo: "distribuito", asta: 1, q: -12.5, direzione: "z" }]);
  assert.throws(() => aggiungiCarico(m, { azione: 1, carico: { tipo: "nodale", nodo: 99 } }), /il nodo 99 non esiste/);
  assert.throws(() => aggiungiCarico(m, { azione: 1, carico: { tipo: "distribuito", asta: 99, q: 1 } }), /l'asta 99 non esiste/);
  assert.throws(() => aggiungiCarico(m, { azione: 1, carico: { tipo: "vento" } }), ErroreComando);
  assert.doesNotThrow(() => aggiungiCarico(m, { azione: 1, carico: { tipo: "termico", asta: 1, dT_uniforme: 20 } }));
  assert.deepEqual(m.azioni[0].carichi, [], "il modello ricevuto resta intatto");
});
test("impostaTermine: un termine per azione, null lo toglie, zero resta", () => {
  let m = creaCombinazione(conAzione(), { nome: "SLU", tipo: "fondamentale" });
  m = impostaTermine(m, { id: 1, azione: 1, coefficiente: 1.3 });
  m = impostaTermine(m, { id: 1, azione: 1, coefficiente: 1.5 });
  assert.deepEqual(m.combinazioni[0].termini, [{ azione: 1, coefficiente: 1.5 }]);
  assert.deepEqual(impostaTermine(m, { id: 1, azione: 1, coefficiente: 0 }).combinazioni[0].termini, [{ azione: 1, coefficiente: 0 }]);
  const senza = impostaTermine(m, { id: 1, azione: 1, coefficiente: null });
  assert.deepEqual(senza.combinazioni[0].termini, []);
  assert.equal(impostaTermine(senza, { id: 1, azione: 1, coefficiente: null }), senza, "niente da togliere: non è un comando");
  assert.throws(() => impostaTermine(m, { id: 1, azione: 9, coefficiente: 1 }), /l'azione 9 non esiste/);
  assert.throws(() => impostaTermine(m, { id: 1, azione: 1, coefficiente: NaN }), ErroreComando);
});
test("eliminaAzione ed eliminaCombinazione rifiutano se qualcuno le usa, e dicono chi", () => {
  let m = creaCombinazione(conAzione(), { nome: "SLU" });
  m = impostaTermine(m, { id: 1, azione: 1, coefficiente: 1.5 });
  assert.throws(() => eliminaAzione(m, { id: 1 }), /combinazioni 1/);
  const conAnalisi = { ...m, analisi: [{ tipo: "statica", casi: ["C1"] }] };
  assert.throws(() => eliminaCombinazione(conAnalisi, { id: 1 }), /C1/);
  const libera = impostaTermine(m, { id: 1, azione: 1, coefficiente: null });
  assert.deepEqual(eliminaAzione(libera, { id: 1 }).azioni, []);
  assert.equal(eliminaAzione(libera, { id: 1 }).contatori.azione, 1);
  assert.deepEqual(eliminaCombinazione(m, { id: 1 }).combinazioni, []);
});
```

- [ ] **Step 2: Rosso.**
- [ ] **Step 3: I riduttori**, in coda a `comandi.js`. Import da aggiungere: `import { TIPI_COMBINAZIONE, NATURE, normalizzaCarico } from "./carichi.js";` e, in `modello.js` già importato, `azione, combinazione, combinazioniDellAzione, analisiCheUsano, nomeCaso, asta`. `LISTE` a `:123` diventa `{ nodo: "nodi", asta: "aste", sezione: "sezioni", materiale: "materiali", azione: "azioni", combinazione: "combinazioni" }`.

```js
// --- azioni e carichi (story 25-26) --------------------------------------------------------
const azioneEsistente = (m, id) => {
  const a = azione(m, id);
  if (!a) throw new ErroreComando(`l'azione ${id} non esiste`, "seleziona un'azione nell'albero e ripeti");
  return a;
};
const combinazioneEsistente = (m, id) => {
  const c = combinazione(m, id);
  if (!c) throw new ErroreComando(`la combinazione ${id} non esiste`, "seleziona una combinazione nell'albero e ripeti");
  return c;
};
// La stessa regola del backend (`nova/modello.py:288-292`), con la stessa frase: l'azione che
// il riduttore accetta è quella che il server accetterà al salvataggio.
const azioneValida = (a) => {
  if (typeof a.nome !== "string" || a.nome.trim() === "") throw new ErroreComando("l'azione vuole un nome", "scrivi «nome; natura»");
  if (!NATURE.includes(a.natura)) throw new ErroreComando(`natura «${a.natura}» sconosciuta`, `le nature sono ${NATURE.join(", ")}`);
  if (a.natura === "Q" && !a.categoria) throw new ErroreComando(`azione ${a.id} «${a.nome}»: natura Q senza categoria d'uso`, "scrivi la categoria, per esempio «vento» o «residenziale»");
};
/** Il carico con le sole chiavi dello schema, e i riferimenti che esistono davvero. */
const caricoAccettabile = (m, c) => {
  const { carico, messaggio } = normalizzaCarico(c);
  if (!carico) throw new ErroreComando(messaggio, "scegli un tipo fra nodale, distribuito, gravita, cedimento, termico");
  if ("nodo" in carico && !nodo(m, carico.nodo)) throw new ErroreComando(`il nodo ${carico.nodo} non esiste`, "scegli un nodo del modello");
  if ("asta" in carico && !asta(m, carico.asta)) throw new ErroreComando(`l'asta ${carico.asta} non esiste`, "scegli un'asta del modello");
  return carico;
};
const indiceValido = (a, indice) => {
  if (!Number.isInteger(indice) || indice < 0 || indice >= a.carichi.length) {
    throw new ErroreComando(`l'azione ${a.id} ha ${a.carichi.length} carichi`, "scegli un carico dell'elenco");
  }
};

export function creaAzione(m, { nome, natura, categoria = null }) {
  const n = copia(m);
  const id = prossimoId(n, "azione");
  const a = { id, nome, natura, categoria, generata: false, carichi: [] };
  azioneValida(a);
  n.azioni.push(a);
  n.contatori.azione = id;
  return n;
}

export function modificaAzione(m, { id, ...campi }) {
  const vecchia = azioneEsistente(m, id);
  const n = copia(m);
  const a = n.azioni.find((k) => k.id === id);
  for (const k of ["nome", "natura", "categoria"]) if (k in campi) a[k] = campi[k];
  if (a.categoria === "") a.categoria = null;  // il campo svuotato è «nessuna categoria», non una stringa vuota
  azioneValida(a);
  return cambiata(vecchia, a) ? n : m;
}

export function aggiungiCarico(m, { azione: idAzione, carico }) {
  azioneEsistente(m, idAzione);
  const c = caricoAccettabile(m, carico);
  const n = copia(m);
  n.azioni.find((k) => k.id === idAzione).carichi.push(c);
  return n;
}

export function modificaCarico(m, { azione: idAzione, indice, carico }) {
  const a = azioneEsistente(m, idAzione);
  indiceValido(a, indice);
  const c = caricoAccettabile(m, carico);
  if (!cambiata(a.carichi[indice], c)) return m;
  const n = copia(m);
  n.azioni.find((k) => k.id === idAzione).carichi[indice] = c;
  return n;
}

export function togliCarico(m, { azione: idAzione, indice }) {
  const a = azioneEsistente(m, idAzione);
  indiceValido(a, indice);
  const n = copia(m);
  n.azioni.find((k) => k.id === idAzione).carichi.splice(indice, 1);
  return n;
}

export function eliminaAzione(m, { id }) {
  azioneEsistente(m, id);
  const usata = combinazioniDellAzione(m, id).map((c) => c.id);
  if (usata.length) throw new ErroreComando(`l'azione ${id} la usano le combinazioni ${usata.join(", ")}`, "togli il termine dalle combinazioni, poi elimina");
  const caso = nomeCaso("azione", id);
  if (analisiCheUsano(m, caso).length) throw new ErroreComando(`l'azione ${id} la usa un'analisi`, `togli il caso ${caso} dall'analisi, poi elimina`);
  const n = copia(m);
  n.azioni = n.azioni.filter((a) => a.id !== id);
  return n;  // i contatori restano: un identificatore eliminato non si riusa
}

// --- combinazioni (story 27) ---------------------------------------------------------------
const tipoCombinazioneValido = (tipo) => {
  if (tipo !== null && !TIPI_COMBINAZIONE.includes(tipo)) {
    throw new ErroreComando(`tipo di combinazione «${tipo}» sconosciuto`, `i tipi sono ${TIPI_COMBINAZIONE.join(", ")}, o nessuno`);
  }
};

export function creaCombinazione(m, { nome, tipo = null }) {
  if (typeof nome !== "string" || nome.trim() === "") throw new ErroreComando("la combinazione vuole un nome", "scrivi «nome» o «nome; tipo»");
  tipoCombinazioneValido(tipo);
  const n = copia(m);
  const id = prossimoId(n, "combinazione");
  n.combinazioni.push({ id, nome, termini: [], tipo, generata: false });
  n.contatori.combinazione = id;
  return n;
}

export function modificaCombinazione(m, { id, ...campi }) {
  const vecchia = combinazioneEsistente(m, id);
  if ("tipo" in campi) tipoCombinazioneValido(campi.tipo);
  if ("nome" in campi && (typeof campi.nome !== "string" || campi.nome.trim() === "")) throw new ErroreComando("la combinazione vuole un nome", "scrivi un nome");
  const n = copia(m);
  const c = n.combinazioni.find((k) => k.id === id);
  for (const k of ["nome", "tipo"]) if (k in campi) c[k] = campi[k];
  return cambiata(vecchia, c) ? n : m;
}

/** Un termine per azione, dall'interfaccia: due termini sulla stessa azione il deck li somma
 *  (`nova/deck.py:305-309`), e una somma nascosta in un elenco è una bugia da leggere. */
export function impostaTermine(m, { id, azione: idAzione, coefficiente }) {
  const vecchia = combinazioneEsistente(m, id);
  azioneEsistente(m, idAzione);
  if (coefficiente !== null) numero(coefficiente, "il coefficiente");
  const n = copia(m);
  const c = n.combinazioni.find((k) => k.id === id);
  c.termini = c.termini.filter((t) => t.azione !== idAzione);
  if (coefficiente !== null) {
    const dove = vecchia.termini.findIndex((t) => t.azione === idAzione);
    c.termini.splice(dove === -1 ? c.termini.length : dove, 0, { azione: idAzione, coefficiente });
  }
  return cambiata(vecchia, c) ? n : m;
}

export function eliminaCombinazione(m, { id }) {
  combinazioneEsistente(m, id);
  const caso = nomeCaso("combinazione", id);
  if (analisiCheUsano(m, caso).length) throw new ErroreComando(`la combinazione ${id} la usa un'analisi`, `togli il caso ${caso} dall'analisi, poi elimina`);
  const n = copia(m);
  n.combinazioni = n.combinazioni.filter((c) => c.id !== id);
  return n;
}
```

- [ ] **Step 4: Verde; commit** — `feat(comandi): azioni, carichi, combinazioni e termini come riduttori puri`

---

### Task 3: `tastiera.js` — `Z`, `Q`, `K`, `⌘K`

**Files:**
- Modify: `static/tastiera.js:15-41` (quattro voci), `:56-66` (tre chiavi nude e una col comando)
- Test: `static/test/tastiera.test.js`

**Interfaces:**
- Produces: voci
  - `{codice: "azione", tasto: "Z", etichetta: "azione", aiuto: "nome; natura (G1, G2, Q con categoria, E)", contesto: "salvo-ghost", esempio: "permanenti travi; G2", campo: "azione"}`
  - `{codice: "carico", tasto: "Q", etichetta: "carico", aiuto: "su un nodo «Fx 20000», su un'asta «q» in N/mm", contesto: "selezione", esempio: "-12,5", campo: "carico su", tipi: ["nodo", "asta"]}`
  - `{codice: "combinazione", tasto: "K", etichetta: "combinazione", aiuto: "nome; tipo (facoltativo)", contesto: "salvo-ghost", esempio: "SLU; fondamentale", campo: "combinazione"}`
  - `{codice: "palette", tasto: "⌘K", etichetta: "comandi", aiuto: "cerca un comando, anche col valore", contesto: "salvo-ghost", modificatore: "comando"}`
  - `SENZA_MODIFICATORE` con `z`, `q`, `k`; `CON_COMANDO` con `["k", "palette"]`.

**Ingressi degeneri:**
- `voceDaEvento({key: "k"})` → `combinazione`; `{key: "k", metaKey: true}` → `palette`; `{key: "k", ctrlKey: true}` → `palette` (PC); `{key: "K", shiftKey: true}` → `combinazione`
- `voceDaEvento({key: "z", metaKey: true})` resta `disfa` e `{key: "z"}` nudo → `azione` (lo stesso patto di `S`/`⌘S`)
- `vociDellaBarra("selezione", "sezione")` → **senza** `carico` (vale su nodo e asta soltanto); `vociDellaBarra("selezione", "asta")` → con `carico`; `vociDellaBarra("sempre", null)` → con `azione`, `combinazione`, `palette`, senza `carico`
- `vociDellaBarra("comando")` → ancora `["conferma", "annulla"]`
- nessuna lettera nuda serve due codici (il test già in `tastiera.test.js` che scorre l'alfabeto **deve restare verde**: `z`, `q`, `k` erano libere)

- [ ] **Step 1: Test**

```js
test("Z nudo è azione, ⌘Z resta disfa; K nudo è combinazione, ⌘K la palette (anche Ctrl)", () => {
  assert.equal(voceDaEvento({ key: "z" })?.codice, "azione");
  assert.equal(voceDaEvento({ key: "z", metaKey: true })?.codice, "disfa");
  assert.equal(voceDaEvento({ key: "k" })?.codice, "combinazione");
  assert.equal(voceDaEvento({ key: "K", shiftKey: true })?.codice, "combinazione");
  assert.equal(voceDaEvento({ key: "k", metaKey: true })?.codice, "palette");
  assert.equal(voceDaEvento({ key: "k", ctrlKey: true })?.codice, "palette");
  assert.equal(voceDaEvento({ key: "q" })?.codice, "carico");
});
test("Q vale su nodo e asta, non su sezione o materiale; la palette e le altre due sono di sempre", () => {
  const codici = (c, t) => vociDellaBarra(c, t).map((v) => v.codice);
  assert.ok(codici("selezione", "asta").includes("carico"));
  assert.ok(codici("selezione", "nodo").includes("carico"));
  assert.ok(!codici("selezione", "sezione").includes("carico"));
  for (const c of ["azione", "combinazione", "palette"]) assert.ok(codici("sempre", null).includes(c), c);
  assert.ok(!codici("sempre", null).includes("carico"));
  assert.deepEqual(codici("comando"), ["conferma", "annulla"]);
});
```

- [ ] **Step 2: Rosso; Step 3:** le quattro voci dopo `danno` in `TASTI`; in `SENZA_MODIFICATORE`: `["z", "azione"], ["q", "carico"], ["k", "combinazione"],` con il commento «`z` nudo e `⌘Z`, `k` nudo e `⌘K`: due mappe, il modificatore le separa prima del `get`»; in `CON_COMANDO`: `["k", "palette"]`.
- [ ] **Step 4: Verde; commit** — `feat(tastiera): Z azione, Q carico, K combinazione, ⌘K palette`

---

### Task 4: `albero.js` — i rami «Azioni» e «Combinazioni»

**Files:**
- Modify: `static/albero.js:22-57`
- Test: `static/test/albero.test.js`

**Interfaces:**
- Consumes: `NOME_TIPO_COMBINAZIONE` (Task 1).
- Produces: voci `{tipo: "azione", id, testo}` con testo `«${nome} · ${natura}${categoria ? " " + categoria : ""} · ${n} carichi»` (+ « · generata» se `generata`; «1 carico» al singolare); voci `{tipo: "combinazione", id, testo}` con testo `«${nome} · ${tipo ? NOME_TIPO_COMBINAZIONE[tipo] : "senza tipo"} · ${n} termini»` (+ « · generata»; «1 termine»). Gruppi «Azioni» e «Combinazioni» dopo «Materiali», saltati se vuoti.

**Ingressi degeneri:**
- modello con un'azione e nessuna combinazione → gruppo «Azioni» presente, «Combinazioni» assente
- azione `Q` categoria «vento» con un carico → «spinta in testa · Q vento · 1 carico»
- azione `generata: true` → il testo finisce con « · generata»
- combinazione senza tipo e senza termini → «SLU · senza tipo · 0 termini»
- il clic su una voce azione chiama `suSelezione("azione", id)` (lo stesso listener delle altre voci: nessun codice nuovo lì, ma il test lo prova)

- [ ] **Step 1: Test** — con `creaAzione`, `aggiungiCarico`, `creaCombinazione` di Task 2 e lo stampo di `albero.test.js:50-63`:

```js
test("l'albero elenca azioni e combinazioni, con natura, categoria, conteggi al singolare e «generata»", () => {
  let m = creaNodo(modelloVuoto(), { x: 0, z: 0 });
  m = creaAzione(m, { nome: "spinta in testa", natura: "Q", categoria: "vento" });
  m = aggiungiCarico(m, { azione: 1, carico: { tipo: "nodale", nodo: 1, Fx: 20000 } });
  m = creaAzione(m, { nome: "peso proprio", natura: "G1" });
  m.azioni[1].generata = true;
  m = creaCombinazione(m, { nome: "SLU" });
  const { elenco, albero } = alberoFinto();
  albero.disegna(m);
  const testi = elenco._figli.map((li) => li.textContent);
  assert.ok(testi.includes("Azioni"));
  assert.ok(testi.includes("spinta in testa · Q vento · 1 carico"));
  assert.ok(testi.includes("peso proprio · G1 · 0 carichi · generata"));
  assert.ok(testi.includes("Combinazioni"));
  assert.ok(testi.includes("SLU · senza tipo · 0 termini"));
});
test("senza azioni né combinazioni i due gruppi non compaiono", () => {
  const { elenco, albero } = alberoFinto();
  albero.disegna(creaNodo(modelloVuoto(), { x: 0, z: 0 }));
  const testi = elenco._figli.map((li) => li.textContent);
  assert.ok(!testi.includes("Azioni") && !testi.includes("Combinazioni"));
});
```

(`alberoFinto` è a `albero.test.js:33`; import da aggiungere: `creaAzione, aggiungiCarico, creaCombinazione` da `../comandi.js`, `creaNodo` se manca.)

- [ ] **Step 2: Rosso; Step 3:** dopo il ciclo dei materiali (`albero.js:50-56`):

```js
    const plurale = (n, uno, molti) => `${n} ${n === 1 ? uno : molti}`;
    gruppo("Azioni", m.azioni.length);
    for (const a of m.azioni) {
      righe.push({
        tipo: "azione", id: a.id,
        testo: `${a.nome} · ${a.natura}${a.categoria ? ` ${a.categoria}` : ""} · ${plurale(a.carichi.length, "carico", "carichi")}${a.generata ? " · generata" : ""}`,
      });
    }
    gruppo("Combinazioni", m.combinazioni.length);
    for (const c of m.combinazioni) {
      righe.push({
        tipo: "combinazione", id: c.id,
        testo: `${c.nome} · ${c.tipo ? NOME_TIPO_COMBINAZIONE[c.tipo] : "senza tipo"} · ${plurale(c.termini.length, "termine", "termini")}${c.generata ? " · generata" : ""}`,
      });
    }
```

Import: `import { NOME_TIPO_COMBINAZIONE } from "./carichi.js";`.

- [ ] **Step 4: Verde; commit** — `feat(albero): i rami Azioni e Combinazioni`

---

### Task 5: `pannello.js` — l'editor dell'azione e quello della combinazione

**Files:**
- Modify: `static/pannello.js` (`:18` `CERCA`, `:81` `RIGHE`, `:150-163` `campoNumero`, `:505` `EDITORI`, due editor e due funzioni di righe)
- Modify: `static/stile.css` (`.carico` come sotto-gruppo)
- Test: `static/test/pannello.test.js`

**Interfaces:**
- Consumes: `azione`, `combinazione`, `nomeCaso` (`modello.js`); `NATURE`, `TIPI_CARICO`, `DIREZIONI`, `TIPI_COMBINAZIONE`, `COMPONENTI`, `GRADI_CEDIMENTO`, `NOME_TIPO`, `NOME_TIPO_COMBINAZIONE`, `testoCarico` (Task 1).
- Produces:
  - `campoNumero({…, vuotoAmmesso = false})`: con `vuotoAmmesso`, un testo vuoto chiama `alCambio(null)` invece dell'avviso (i gradi di un cedimento, il gradiente termico, il coefficiente di un termine: vuoto vuol dire «nessuno»).
  - `righeDiAzione(m, a)` → `[["identificatore"], ["nome"], ["natura", "Q · vento"], ["caso", "Z2"], ["carichi", "1"], ["generata", "sì"/"no"]]`; `righeDiCombinazione(m, c)` → `identificatore, nome, tipo (NOME_TIPO_COMBINAZIONE o «—»), caso «C1», termini (n), generata`.
  - `editorAzione(m, a, azioni)` → `{elementi, controlli}`: gruppo «natura» (`scelta` natura fra `NATURE`, `input` testo categoria con nome «categoria d'uso dell'azione ‹nome›»); gruppo «carichi» con un `<fieldset class="carico">` per carico (legenda `«carico ${i+1} · ${NOME_TIPO[tipo]}»`, i campi del tipo, bottone «togli carico ${i+1}»), sotto un termico il `<p class="avviso">` «attenzione: il Check Model rifiuta il carico termico in v1 (nova/check.py)», e in coda una `scelta` «aggiungi carico» con `["", "— scegli il tipo"]` + i cinque tipi. Callback: `azioni.suAzione(id, campi)`, `azioni.suCarico(idAzione, indice, caricoIntero)`, `azioni.suTogliCarico(idAzione, indice)`, `azioni.suAggiungiCarico(idAzione, tipo)`, `azioni.suAvviso`.
  - `editorCombinazione(m, c, azioni)` → gruppo «tipo» (`scelta` con `["", "— nessuno"]` + `TIPI_COMBINAZIONE` etichettati da `NOME_TIPO_COMBINAZIONE`); gruppo «termini» con un `campoNumero` per **ogni azione del modello** (etichetta `a.nome`, nome «coefficiente di ‹nome azione› in ‹nome combinazione›», valore il coefficiente o `null`, `vuotoAmmesso: true`), nota «vuoto = l'azione non entra». Senza azioni nel modello la nota dice «nessuna azione nel modello: premi Z». Callback: `azioni.suCombinazione(id, campi)`, `azioni.suTermine(idCombinazione, idAzione, coefficiente|null)`.
  - Campi per tipo di carico nell'editor dell'azione (ognuno con nome accessibile che comincia dall'etichetta visibile): **nodale** → `scelta` nodo (fra `m.nodi`, testo `n.nome ?? «nodo n»`) + sei `campoNumero` `Fx … Mz` (unità « N» e « N·mm»); **distribuito** → `scelta` asta + `campoNumero` q (« N/mm») + `scelta` direzione; **gravità** → tre `campoNumero` «fattore x/y/z»; **cedimento** → `scelta` nodo + sei `campoNumero` `ux … rz` con `vuotoAmmesso` (unità « mm» e « rad»); **termico** → `scelta` asta + `campoNumero` «ΔT uniforme» (« °C») + `campoNumero` «gradiente» (« °C/mm», `vuotoAmmesso`). Ogni cambio chiama `suCarico(a.id, i, {...carico, [campo]: valore})` — il carico intero, così il riduttore lo normalizza e lo confronta.

**Ingressi degeneri:**
- `righe(m, {tipo: "azione", id: 9})` → `null` (sparita); `{tipo: "combinazione", id}` → le righe
- `disegna(m, {tipo: "azione", id})` su un'azione senza carichi → il gruppo «carichi» ha solo la nota «nessun carico: premi Q su un nodo o un'asta, o scegli un tipo qui sotto» e la `scelta` «aggiungi»
- «aggiungi carico» lasciata su «— scegli il tipo» → nessun callback; scelta «termico» → `suAggiungiCarico(id, "termico")` e il select **torna** su «— scegli il tipo» al ridisegno (è un comando, non uno stato)
- il campo `Fx` con «ventimila» → `suAvviso(«ventimila» non è un numero)`, nessun `suCarico`, il campo torna a «20 000»
- il campo `uz` di un cedimento svuotato → `suCarico(id, i, {…, uz: null})` (non un avviso)
- il coefficiente di un termine svuotato → `suTermine(idC, idA, null)`; scritto «1,5» → `suTermine(idC, idA, 1.5)`
- `categoria` svuotata → `suAzione(id, {categoria: null})`
- un'azione `generata: true` → l'editor **c'è** lo stesso (decisione 1: il flag si mostra, non blocca) e la riga «generata» dice «sì»
- il fuoco: dopo «togli carico 1» il controllo a fuoco non esiste più → il fuoco va al primo controllo dell'editor, mai a `body` (`creaPannello:507-520` lo fa già per nome; il test lo prova su un carico tolto)
- il nome accessibile di **ogni** controllo dei due editor comincia dal testo visibile della sua etichetta (estendi il test WCAG 2.5.3 già presente ai tipi `azione` e `combinazione`)

- [ ] **Step 1: Test** — aggiungi a `AZIONI` (`pannello.test.js:161-162`): `"suAzione", "suCarico", "suTogliCarico", "suAggiungiCarico", "suCombinazione", "suTermine"`. Stampo:

```js
import { creaAzione, aggiungiCarico, creaCombinazione, impostaTermine } from "../comandi.js";

const conCarichi = () => {
  let m = CON_CERNIERA();
  m = creaAzione(m, { nome: "permanenti travi", natura: "G2" });
  m = aggiungiCarico(m, { azione: 1, carico: { tipo: "distribuito", asta: 1, q: -12.5 } });
  m = aggiungiCarico(m, { azione: 1, carico: { tipo: "nodale", nodo: 2, Fx: 20000 } });
  return m;
};
// I controlli dell'editor, a qualunque profondità, che portano un `aria-label`.
const controlliCon = (radice, testo) => tutti(radice).filter((e) => (e._attrs["aria-label"] ?? "").includes(testo));
function tutti(radice) {
  const out = [radice];
  for (const f of radice._figli ?? []) out.push(...tutti(f));
  return out;
}

test("righe di un'azione: natura con categoria, il nome del caso, il conteggio dei carichi", () => {
  let m = creaAzione(modelloVuoto(), { nome: "spinta", natura: "Q", categoria: "vento" });
  assert.deepEqual(righe(m, { tipo: "azione", id: 1 }),
    [["identificatore", "1"], ["nome", "spinta"], ["natura", "Q · vento"], ["caso", "Z1"], ["carichi", "0"], ["generata", "no"]]);
  assert.equal(righe(m, { tipo: "azione", id: 9 }), null);
  m = creaCombinazione(m, { nome: "SLU", tipo: "fondamentale" });
  assert.deepEqual(righe(m, { tipo: "combinazione", id: 1 }),
    [["identificatore", "1"], ["nome", "SLU"], ["tipo", "fondamentale (SLU)"], ["caso", "C1"], ["termini", "0"], ["generata", "no"]]);
});
test("editor dell'azione: il campo q cambiato manda il carico intero, e un testo illeggibile solo un avviso", () => {
  const { p, editor, chiamate } = pannelloFinto();
  p.disegna(conCarichi(), { tipo: "azione", id: 1 });
  const [q] = controlliCon(editor, "q del carico 1");
  q.value = "-15"; q.dispatch("change");
  assert.deepEqual(chiamate.suCarico, [[1, 0, { tipo: "distribuito", asta: 1, q: -15, direzione: "z" }]]);
  q.value = "molto"; q.dispatch("change");
  assert.equal(chiamate.suCarico.length, 1);
  assert.equal(chiamate.suAvviso.length, 1);
  assert.equal(q.value, "-15");
});
test("editor dell'azione: «aggiungi carico» è un comando, togli passa l'indice, il termico avverte", () => {
  const { p, editor, chiamate } = pannelloFinto();
  let m = conCarichi();
  p.disegna(m, { tipo: "azione", id: 1 });
  const [aggiungi] = controlliCon(editor, "aggiungi carico");
  aggiungi.value = "termico"; aggiungi.dispatch("change");
  assert.deepEqual(chiamate.suAggiungiCarico, [[1, "termico"]]);
  const togli = tutti(editor).find((e) => e.textContent === "togli carico 2");
  togli.dispatch("click");
  assert.deepEqual(chiamate.suTogliCarico, [[1, 1]]);
  m = aggiungiCarico(m, { azione: 1, carico: { tipo: "termico", asta: 1, dT_uniforme: 20 } });
  p.disegna(m, { tipo: "azione", id: 1 });
  assert.ok(tutti(editor).some((e) => e.className === "avviso" && /Check Model/.test(e.textContent)));
});
test("editor dell'azione: il grado di un cedimento svuotato è «libero», non un avviso", () => {
  const { p, editor, chiamate } = pannelloFinto();
  let m = creaAzione(CON_CERNIERA(), { nome: "cedimento appoggio", natura: "G1" });
  m = aggiungiCarico(m, { azione: 1, carico: { tipo: "cedimento", nodo: 1, uz: -5 } });
  p.disegna(m, { tipo: "azione", id: 1 });
  const [uz] = controlliCon(editor, "uz del carico 1");
  uz.value = ""; uz.dispatch("change");
  assert.equal(chiamate.suAvviso.length, 0);
  assert.deepEqual(chiamate.suCarico[0][2].uz, null);
});
test("editor della combinazione: un campo per azione, vuoto toglie, il tipo si sceglie", () => {
  const { p, editor, chiamate } = pannelloFinto();
  let m = creaCombinazione(conCarichi(), { nome: "SLU" });
  m = impostaTermine(m, { id: 1, azione: 1, coefficiente: 1.5 });
  p.disegna(m, { tipo: "combinazione", id: 1 });
  const [coeff] = controlliCon(editor, "coefficiente di permanenti travi");
  assert.equal(coeff.value, "1,500");
  coeff.value = "1,3"; coeff.dispatch("change");
  coeff.value = ""; coeff.dispatch("change");
  assert.deepEqual(chiamate.suTermine, [[1, 1, 1.3], [1, 1, null]]);
  const [tipo] = controlliCon(editor, "tipo della combinazione");
  tipo.value = "sismica"; tipo.dispatch("change");
  assert.deepEqual(chiamate.suCombinazione, [[1, { tipo: "sismica" }]]);
});
test("dopo «togli carico» il fuoco non cade su body", () => {
  const { p, editor } = pannelloFinto();
  let m = conCarichi();
  p.disegna(m, { tipo: "azione", id: 1 });
  tutti(editor).find((e) => e.textContent === "togli carico 2").focus();
  m = { ...m, azioni: [{ ...m.azioni[0], carichi: m.azioni[0].carichi.slice(0, 1) }] };
  p.disegna(m, { tipo: "azione", id: 1 });
  assert.notEqual(globalThis.document.activeElement, null);
  assert.ok(tutti(editor).includes(globalThis.document.activeElement));
});
```

Nel test WCAG 2.5.3 già presente (cerca «comincia» in `pannello.test.js`), aggiungi i due tipi con `conCarichi()` e una combinazione con un termine.

- [ ] **Step 2: Rosso; Step 3: il codice.** `campoNumero` (`:150-163`) guadagna `vuotoAmmesso = false` e, prima di `leggiNumero`: `if (vuotoAmmesso && c.value.trim() === "") { alCambio(null); return; }`; `testoNumero(null)` dà già `""`. Poi:

```js
import { NATURE, TIPI_CARICO, DIREZIONI, TIPI_COMBINAZIONE, COMPONENTI, GRADI_CEDIMENTO, NOME_TIPO,
         NOME_TIPO_COMBINAZIONE, testoCarico } from "./carichi.js";
import { nodo, asta, sezione, materiale, azione, combinazione, asteDellaSezione, vesteDi, nomeCaso } from "./modello.js";

const CERCA = { nodo, asta, sezione, materiale, azione, combinazione };

function righeDiAzione(m, a) {
  return [["identificatore", String(a.id)], ["nome", a.nome],
          ["natura", a.categoria ? `${a.natura} · ${a.categoria}` : a.natura],
          ["caso", nomeCaso("azione", a.id)], ["carichi", String(a.carichi.length)],
          ["generata", a.generata ? "sì" : "no"]];
}
function righeDiCombinazione(m, c) {
  return [["identificatore", String(c.id)], ["nome", c.nome],
          ["tipo", c.tipo ? NOME_TIPO_COMBINAZIONE[c.tipo] : "—"],
          ["caso", nomeCaso("combinazione", c.id)], ["termini", String(c.termini.length)],
          ["generata", c.generata ? "sì" : "no"]];
}
const RIGHE = { nodo: righeDiNodo, asta: righeDiAsta, sezione: righeDiSezione, materiale: righeDiMateriale,
                azione: righeDiAzione, combinazione: righeDiCombinazione };

const nomeNodo = (n) => n.nome ?? `nodo ${n.id}`;
const nomeAsta = (a) => a.nome ?? `asta ${a.id}`;

/** I campi di un carico, per tipo, appesi nel `box` del carico. Ogni cambio manda **il carico
 *  intero** con il campo nuovo: il riduttore lo normalizza e lo confronta, e qui non si tiene
 *  un secondo stato. Niente `DocumentFragment`: il DOM finto dei test non lo ha, e il box c'è già. */
function campiDelCarico(m, c, i, box, invia, azioni, controlli) {
  const chi = `del carico ${i + 1}`;
  const agg = (x) => { box.append(x.etichetta); controlli.push(x.controllo); };
  const num = (campo, etichetta, unita, vuotoAmmesso = false) =>
    agg(campoNumero({ etichetta, nome: `${etichetta} ${chi}`, valore: c[campo], unita, vuotoAmmesso,
                      alCambio: (v) => invia({ ...c, [campo]: v }), suAvviso: azioni.suAvviso }));
  const rif = (campo, lista, nome) =>
    agg(scelta({ etichetta: campo, nome: `${campo} ${chi}`, opzioni: lista.map((e) => [e.id, nome(e)]),
                 valore: c[campo], alCambio: (v) => invia({ ...c, [campo]: Number(v) }) }));
  if (c.tipo === "nodale") { rif("nodo", m.nodi, nomeNodo); for (const k of COMPONENTI) num(k, k, k[0] === "F" ? " N" : " N·mm"); }
  else if (c.tipo === "distribuito") {
    rif("asta", m.aste, nomeAsta); num("q", "q", " N/mm");
    agg(scelta({ etichetta: "direzione", nome: `direzione ${chi}`, opzioni: DIREZIONI.map((d) => [d, d.replace("_", " ")]),
                 valore: c.direzione, alCambio: (v) => invia({ ...c, direzione: v }) }));
  }
  else if (c.tipo === "gravita") { for (const k of ["x", "y", "z"]) num(`fattore_${k}`, `fattore ${k}`, ""); }
  else if (c.tipo === "cedimento") { rif("nodo", m.nodi, nomeNodo); for (const k of GRADI_CEDIMENTO) num(k, k, k[0] === "u" ? " mm" : " rad", true); }
  else { rif("asta", m.aste, nomeAsta); num("dT_uniforme", "ΔT uniforme", " °C"); num("gradiente", "gradiente", " °C/mm", true); }
}

function editorAzione(m, a, azioni) {
  const controlli = [];
  const nat = gruppo("natura", "editor");
  const n = scelta({ etichetta: "natura", nome: `natura dell'azione ${a.nome}`, opzioni: NATURE.map((k) => [k, k]),
                     valore: a.natura, alCambio: (v) => azioni.suAzione(a.id, { natura: v }) });
  nat.append(n.etichetta); controlli.push(n.controllo);
  const et = document.createElement("label");
  const cat = document.createElement("input");
  cat.type = "text"; cat.value = a.categoria ?? "";
  cat.setAttribute("aria-label", `categoria d'uso dell'azione ${a.nome}`);
  cat.addEventListener("change", () => azioni.suAzione(a.id, { categoria: cat.value.trim() || null }));
  et.append(document.createTextNode("categoria d'uso"), cat); nat.append(et); controlli.push(cat);

  const car = gruppo("carichi", "editor",
                     a.carichi.length ? null : "nessun carico: premi Q su un nodo o un'asta, o scegli un tipo qui sotto");
  a.carichi.forEach((c, i) => {
    const box = gruppo(`carico ${i + 1} · ${NOME_TIPO[c.tipo]}`, "editor editor-campi carico");
    campiDelCarico(m, c, i, box, (nuovo) => azioni.suCarico(a.id, i, nuovo), azioni, controlli);
    if (c.tipo === "termico") {
      const p = document.createElement("p"); p.className = "avviso";
      p.textContent = "attenzione: il Check Model rifiuta il carico termico in v1 (nova/check.py)";
      box.append(p);
    }
    const via = bottone(`togli carico ${i + 1}`, () => azioni.suTogliCarico(a.id, i));
    box.append(via); controlli.push(via);
    car.append(box);
  });
  // Un comando, non uno stato: al ridisegno il select torna sulla prima voce, e la Storia lo racconta.
  const agg = scelta({ etichetta: "aggiungi carico", nome: "aggiungi carico: scegli il tipo",
                       opzioni: [["", "— scegli il tipo"], ...TIPI_CARICO.map((t) => [t, NOME_TIPO[t]])], valore: "",
                       alCambio: (v) => { if (v) azioni.suAggiungiCarico(a.id, v); } });
  car.append(agg.etichetta); controlli.push(agg.controllo);
  return { elementi: [nat, car], controlli };
}

function editorCombinazione(m, c, azioni) {
  const controlli = [];
  const tipo = gruppo("tipo", "editor");
  const t = scelta({ etichetta: "tipo", nome: `tipo della combinazione ${c.nome}`,
                     opzioni: [["", "— nessuno"], ...TIPI_COMBINAZIONE.map((k) => [k, NOME_TIPO_COMBINAZIONE[k]])],
                     valore: c.tipo ?? "", alCambio: (v) => azioni.suCombinazione(c.id, { tipo: v || null }) });
  tipo.append(t.etichetta); controlli.push(t.controllo);
  const ter = gruppo("termini", "editor editor-campi",
                     m.azioni.length ? "coefficiente per azione; vuoto = l'azione non entra" : "nessuna azione nel modello: premi Z");
  for (const a of m.azioni) {
    const coeff = c.termini.find((k) => k.azione === a.id)?.coefficiente ?? null;
    const campo = campoNumero({ etichetta: a.nome, nome: `coefficiente di ${a.nome} in ${c.nome}`, valore: coeff,
                                vuotoAmmesso: true, alCambio: (v) => azioni.suTermine(c.id, a.id, v), suAvviso: azioni.suAvviso });
    ter.append(campo.etichetta); controlli.push(campo.controllo);
  }
  return { elementi: [tipo, ter], controlli };
}

const EDITORI = { nodo: editorVincolo, asta: editorAsta, sezione: editorSezione, materiale: editorMateriale,
                  azione: editorAzione, combinazione: editorCombinazione };
```

In `stile.css`, dopo `.editor-valori`: `.carico { border-left: 2px solid var(--tratto); padding-left: 6px; margin-top: 6px; }`.

- [ ] **Step 4: Verde; commit** — `feat(pannello): editor dell'azione con i cinque carichi, editor della combinazione a termini`

---

### Task 6: `piano.js` — le frecce dei carichi

**Files:**
- Modify: `static/piano.js:111-175` (`disegna` guadagna `azione`)
- Test: `static/test/piano.test.js`

**Interfaces:**
- Consumes: `frecceDeiCarichi(m, azione, lunghezza)` (Task 1).
- Produces: `disegna(m, {selezione, ghost, azione = null})`: per ogni freccia una `<line class="carico">` da `da` ad `a` più due segmenti di punta (lunghi `6·s`, a ±30° dal fusto) in `INCHIOSTRO`, `stroke-width 1.5·s`; il `testo` (se c'è) in `<text>` `MONO` `11·s` accanto alla coda; in alto a sinistra del riquadro un `<text class="carichi-titolo">` «carichi: ‹nome azione›» (più « · g z ×−1» se l'azione ha una gravità, perché quella non ha frecce). Lunghezza delle frecce `28·s` mm (28 px). Con `azione: null` niente di tutto questo.

**Ingressi degeneri:**
- `disegna(m, {azione: null})` → nessuna `line.carico`, nessun titolo
- azione con solo una gravità → nessuna `line.carico`, titolo «carichi: peso proprio · g z ×−1»
- azione con un nodale su un nodo sparito → nessuna freccia per lui (lo salta `frecceDeiCarichi`), il resto si disegna
- il `viewBox` **non cambia** aggiungendo un'azione (le frecce non entrano in `estensione`): il test confronta l'attributo prima e dopo

- [ ] **Step 1: Test** — con `pianoFinto` e `tutti` di `piano.test.js:115-138`:

```js
import { creaAzione, aggiungiCarico } from "../comandi.js";
const linee = (svg) => tutti(svg, "line").filter((l) => l.getAttribute("class") === "carico");

test("creaPiano: l'azione in vista disegna le frecce e il titolo, senza toccare il riquadro", () => {
  const { piano, svg } = pianoFinto();
  let m = estrudi(creaNodo(modelloVuoto(), { x: 0, z: 0 }), { da: 1, dx: 5000, dz: 0 });
  m = creaAzione(m, { nome: "permanenti travi", natura: "G2" });
  m = aggiungiCarico(m, { azione: 1, carico: { tipo: "distribuito", asta: 1, q: -12.5 } });
  piano.disegna(m, {});
  const riquadro = svg.getAttribute("viewBox");
  assert.equal(linee(svg).length, 0);
  piano.disegna(m, { azione: m.azioni[0] });
  assert.equal(linee(svg).length, 3);
  assert.equal(svg.getAttribute("viewBox"), riquadro);
  assert.ok(tutti(svg, "text").some((t) => t.textContent === "carichi: permanenti travi"));
});
test("creaPiano: la sola gravità non ha frecce ma sta nel titolo", () => {
  const { piano, svg } = pianoFinto();
  let m = creaAzione(creaNodo(modelloVuoto(), { x: 0, z: 0 }), { nome: "peso proprio", natura: "G1" });
  m = aggiungiCarico(m, { azione: 1, carico: { tipo: "gravita", fattore_z: -1 } });
  piano.disegna(m, { azione: m.azioni[0] });
  assert.equal(linee(svg).length, 0);
  assert.ok(tutti(svg, "text").some((t) => /carichi: peso proprio · g z ×−1/.test(t.textContent)));
});
```

- [ ] **Step 2: Rosso; Step 3:** in `disegna`, dopo il ciclo delle aste e prima del ghost:

```js
    // I carichi dell'azione in vista, in px costanti: una freccia non è una misura del modello
    // e non entra in `estensione` — il riquadro non si muove quando si aggiunge un carico.
    if (azione) {
      const L = 28 * s;
      for (const f of frecceDeiCarichi(m, azione, L)) {
        const pa = schermo(f.a), pd = schermo(f.da);
        gruppo.append(el("line", { x1: pd.x, y1: pd.y, x2: pa.x, y2: pa.y, stroke: INCHIOSTRO,
                                   "stroke-width": 1.5 * s, class: "carico" }));
        const ang = Math.atan2(pa.y - pd.y, pa.x - pd.x);
        for (const d of [-1, 1]) {
          const a2 = ang + Math.PI + d * Math.PI / 6;
          gruppo.append(el("line", { x1: pa.x, y1: pa.y, x2: pa.x + Math.cos(a2) * 6 * s, y2: pa.y + Math.sin(a2) * 6 * s,
                                     stroke: INCHIOSTRO, "stroke-width": 1.5 * s, class: "carico-punta" }));
        }
        if (f.testo) {
          const t = el("text", { x: pd.x + 4 * s, y: pd.y - 4 * s, "font-size": 11 * s, fill: INCHIOSTRO, "font-family": MONO });
          t.textContent = f.testo; gruppo.append(t);
        }
      }
      const g = azione.carichi.find((c) => c.tipo === "gravita");
      const titolo = el("text", { x: vista.x0 + 8 * s, y: vista.z0 + 14 * s, "font-size": 11 * s, fill: INCHIOSTRO,
                                  "font-family": MONO, class: "carichi-titolo" });
      titolo.textContent = `carichi: ${azione.nome}${g ? ` · ${testoCarico(g).replace("gravità · ", "g ")}` : ""}`;
      gruppo.append(titolo);
    }
```

Firma: `function disegna(m, { selezione = null, ghost = null, azione = null } = {})`; import `frecceDeiCarichi, testoCarico` da `./carichi.js`. Il titolo in alto a sinistra usa `vista.x0`/`vista.z0` che sono le coordinate **schermo** del riquadro (`inquadra`, `:98-102`): non passano da `schermo()`.

- [ ] **Step 4: Verde; commit** — `feat(piano): le frecce dei carichi dell'azione in vista`

---

### Task 7: `palette.js` — la ricerca con il valore, e il riquadro

**Files:**
- Create: `static/palette.js`, `static/test/palette.test.js`
- Modify: `static/index.html` (il riquadro, prima del `<form id="comando">`), `static/stile.css`

**Interfaces:**
- Consumes: `TASTI` (forma delle voci: `codice, tasto, etichetta, aiuto, modificatore?`) — passati da fuori, il modulo non importa `tastiera.js`.
- Produces:
  - `filtraVoci(voci, query) → [{voce, valore, punti}]` (puro, esportato): `query` vuota → tutte le voci nell'ordine ricevuto con `valore: null`; altrimenti la **prima parola** cerca la voce (sottostringa in `etichetta` o `codice` → `100 − indice`; uguale al `tasto` senza modificatore, senza distinzione di maiuscole → `120`; sottosequenza → `3 × lettere trovate`; zero se manca una lettera), il resto della query è `valore` (`null` se non c'è); ordinate per punti decrescenti, a parità nell'ordine ricevuto; al massimo **9**.
  - `punteggio(nome, q)` (esportato per il test).
  - `creaPalette(radice, {suScelta}) → {apri({voci, disponibili}), chiudi(), aperta}`: `radice` è il `<div id="palette" hidden>` con dentro `<input id="palette-campo" role="combobox">` e `<ul id="palette-voci" role="listbox">`. `apri` svuota il campo, mostra, dà il fuoco; ogni `input` ridisegna; ↑↓ spostano l'attiva (`aria-selected`), Invio chiama `suScelta(voce, valore)` e chiude, Esc chiude; clic su una voce come Invio. `disponibili` è un `Set` di codici: le voci fuori dal set prendono `class="non-ora"` e il testo «non ora» dopo l'etichetta. Ogni voce stampa `etichetta`, il `valore` in `<b>` se c'è, `aiuto` in `<small>`, e `<kbd>tasto</kbd>` a destra. Nessuna voce → un `<li>` «nessun comando: prova «nodo», «sezione», «carico»». Il `keydown` del campo fa `stopPropagation` per ↑↓ Invio Esc (il listener globale di `app.js` non li deve vedere), non per gli altri tasti.

**Ingressi degeneri:**
- `filtraVoci(voci, "")` e `filtraVoci(voci, "   ")` → tutte, `valore: null`, ordine di `TASTI`
- `filtraVoci(voci, "sezione 300 × 500")` → prima `sezione`, `valore: "300 × 500"`
- `filtraVoci(voci, "q -12,5")` → prima `carico` (`tasto` `Q`), `valore: "-12,5"`
- `filtraVoci(voci, "sz")` → `sezione` c'è (sottosequenza); `"xyz"` → `[]`
- `filtraVoci(voci, "rinomina piede sinistro")` → `valore: "piede sinistro"` (il valore può avere spazi)
- `filtraVoci(voci, "a")` → al massimo 9 voci, e `asta`/`azione`/`annulla`/`apri` prima di chi ha la `a` in mezzo
- `filtraVoci([], "nodo")` → `[]`
- `apri` due volte → un riquadro solo, campo svuotato; `chiudi` su una palette chiusa → niente
- Invio senza voci → non chiama `suScelta`, resta aperta
- ↑ sulla prima voce resta sulla prima; ↓ sull'ultima resta sull'ultima

- [ ] **Step 1: Test** (puro; il riquadro si prova a mano nel Task 9, come i controlli degli altri moduli DOM che il DOM finto non copre — i `keydown` con `stopPropagation` non stanno nel finto):

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { filtraVoci, punteggio } from "../palette.js";
import { TASTI } from "../tastiera.js";

const primo = (q) => filtraVoci(TASTI, q)[0];

test("query vuota: tutte le voci, nell'ordine della tastiera, senza valore", () => {
  const r = filtraVoci(TASTI, "  ");
  assert.equal(r.length, Math.min(9, TASTI.length));
  assert.deepEqual(r.map((x) => x.voce.codice), TASTI.slice(0, 9).map((v) => v.codice));
  assert.ok(r.every((x) => x.valore === null));
});
test("la prima parola trova il comando, il resto è il valore", () => {
  assert.equal(primo("sezione 300 × 500").voce.codice, "sezione");
  assert.equal(primo("sezione 300 × 500").valore, "300 × 500");
  assert.equal(primo("rinomina piede sinistro").valore, "piede sinistro");
  assert.equal(primo("nodo").valore, null);
});
test("il tasto vale come nome: «q -12,5» è il carico", () => {
  assert.equal(primo("q -12,5").voce.codice, "carico");
  assert.equal(primo("q -12,5").valore, "-12,5");
});
test("sottosequenza e assenza", () => {
  assert.ok(filtraVoci(TASTI, "sz").some((x) => x.voce.codice === "sezione"));
  assert.deepEqual(filtraVoci(TASTI, "xyz"), []);
  assert.deepEqual(filtraVoci([], "nodo"), []);
});
test("punteggio: la sottostringa in testa vale più di quella in coda, e più della sottosequenza", () => {
  assert.ok(punteggio("asta", "a") > punteggio("materiale", "a"));
  assert.ok(punteggio("sezione", "sez") > punteggio("sezione", "sz"));
  assert.equal(punteggio("nodo", "x"), 0);
});
```

- [ ] **Step 2: Rosso; Step 3: `palette.js`**

```js
// La palette ⌘K (story 8, P3): cerca ogni comando per nome, mostra la scorciatoia accanto, e
// accetta il valore nella query — «sezione 300 × 500», «q -12,5». Non esegue niente da sé:
// passa voce e valore a `app.js`, che li serve con lo stesso ramo del tasto.

export function punteggio(nome, q) {
  if (!q) return 1;
  const i = nome.indexOf(q);
  if (i >= 0) return 100 - i;
  let k = 0, p = 0;
  for (const ch of nome) if (ch === q[k]) { k++; p += 3; }
  return k === q.length ? p : 0;
}

/** Le voci che rispondono alla query, con il valore che la segue. Al massimo nove. */
export function filtraVoci(voci, query) {
  const testo = String(query ?? "").trim();
  if (testo === "") return voci.slice(0, 9).map((voce) => ({ voce, valore: null, punti: 1 }));
  const [parola, ...resto] = testo.split(/\s+/);
  const q = parola.toLowerCase();
  const valore = resto.length ? resto.join(" ") : null;
  return voci
    .map((voce, ordine) => {
      const tasto = voce.modificatore ? "" : String(voce.tasto).toLowerCase();
      const punti = tasto === q ? 120 : Math.max(punteggio(voce.etichetta.toLowerCase(), q), punteggio(voce.codice.toLowerCase(), q));
      return { voce, valore, punti, ordine };
    })
    .filter((x) => x.punti > 0)
    .sort((a, b) => b.punti - a.punti || a.ordine - b.ordine)
    .slice(0, 9)
    .map(({ voce, valore: v, punti }) => ({ voce, valore: v, punti }));
}

export function creaPalette(radice, { suScelta }) {
  const campo = radice.querySelector("input");
  const elenco = radice.querySelector("ul");
  let voci = [], disponibili = new Set(), risultati = [], attiva = 0;

  function disegna() {
    risultati = filtraVoci(voci, campo.value);
    attiva = Math.min(attiva, Math.max(0, risultati.length - 1));
    elenco.replaceChildren(...(risultati.length ? risultati.map((r, i) => {
      const li = document.createElement("li");
      li.setAttribute("role", "option");
      li.setAttribute("aria-selected", String(i === attiva));
      li.dataset.i = i;
      const ora = disponibili.has(r.voce.codice);
      if (!ora) li.className = "non-ora";
      const nome = document.createElement("span");
      nome.append(document.createTextNode(r.voce.etichetta));
      if (r.valore) { const b = document.createElement("b"); b.textContent = ` ${r.valore}`; nome.append(b); }
      if (!ora) nome.append(document.createTextNode(" · non ora"));
      if (r.voce.aiuto) { const s = document.createElement("small"); s.textContent = r.voce.aiuto; nome.append(s); }
      const kbd = document.createElement("kbd"); kbd.textContent = r.voce.tasto;
      li.append(nome, kbd);
      return li;
    }) : [(() => { const li = document.createElement("li"); li.className = "nulla"; li.textContent = "nessun comando: prova «nodo», «sezione», «carico»"; return li; })()]));
  }
  const scegli = (i) => { const r = risultati[i]; if (!r) return; chiudi(); suScelta(r.voce, r.valore); };
  function chiudi() { radice.hidden = true; }

  campo.addEventListener("input", () => { attiva = 0; disegna(); });
  campo.addEventListener("keydown", (ev) => {
    if (ev.key === "ArrowDown") { attiva = Math.min(risultati.length - 1, attiva + 1); disegna(); }
    else if (ev.key === "ArrowUp") { attiva = Math.max(0, attiva - 1); disegna(); }
    else if (ev.key === "Enter") scegli(attiva);
    else if (ev.key === "Escape") chiudi();
    else return;  // le lettere restano al campo, e non arrivano al listener globale perché `daControllo` le lascia lì
    ev.preventDefault(); ev.stopPropagation();
  });
  elenco.addEventListener("click", (ev) => { const li = ev.target.closest("[data-i]"); if (li) scegli(Number(li.dataset.i)); });

  return {
    apri({ voci: v, disponibili: d }) { voci = v; disponibili = d; campo.value = ""; attiva = 0; radice.hidden = false; disegna(); campo.focus(); },
    chiudi,
    get aperta() { return !radice.hidden; },
  };
}
```

In `index.html`, prima del `<form id="comando">`:

```html
<!-- La palette ⌘K (story 8, P3): non è una finestra che blocca — il modello resta sotto, e Esc la
     chiude. Le voci non eseguibili adesso restano in lista con «non ora»: il tasto esiste, si
     impara da qui, e Invio risponde con la stessa frase che darebbe il tasto. -->
<div id="palette" role="dialog" aria-label="comandi" hidden>
  <input id="palette-campo" type="text" role="combobox" aria-expanded="true" aria-controls="palette-voci"
         aria-label="cerca un comando, anche con il valore: «sezione 300 × 500», «q -12,5»"
         placeholder="comando, anche col valore: «sezione 300 × 500», «q -12,5»" spellcheck="false" autocomplete="off">
  <ul id="palette-voci" role="listbox" aria-label="comandi trovati"></ul>
</div>
```

In `stile.css`, in coda:

```css
/* La palette: sopra le viste, non al posto loro. Fisso perché il body è una griglia con
   `overflow: hidden` e non ha un contenitore posizionato. */
#palette { position: fixed; top: 12vh; left: 50%; transform: translateX(-50%); width: min(34rem, 92vw);
           background: var(--pannello); border: 1px solid var(--tratto-forte); border-radius: 4px;
           box-shadow: 0 8px 24px rgba(20, 20, 20, 0.18); padding: 6px; z-index: 10; }
#palette[hidden] { display: none; }
#palette-campo { width: 100%; box-sizing: border-box; font: inherit; font-family: var(--mono); font-size: 14px;
                 padding: 6px 8px; border: 1px solid var(--tratto-forte); border-radius: 3px;
                 background: var(--fondo); color: var(--inchiostro); caret-color: var(--rosso); }
#palette-campo:focus-visible { outline: 2px solid var(--rosso); outline-offset: 1px; }
#palette-voci { list-style: none; margin: 6px 0 0; padding: 0; max-height: 50vh; overflow: auto; }
#palette-voci li { display: flex; justify-content: space-between; align-items: baseline; gap: 12px;
                   padding: 4px 8px; border-radius: 3px; font-size: 13px; }
#palette-voci li[aria-selected="true"] { outline: 2px solid var(--rosso); outline-offset: -2px; }
#palette-voci li small { display: block; color: var(--testo-tenue); font-size: 11px; }
#palette-voci li kbd { font-family: var(--mono); font-size: 12px; border: 1px solid var(--tratto-forte); border-radius: 3px; padding: 0 5px; }
/* «non ora»: il rosso è il filetto, la parola è il canale che conta. Il rosso come colore del
   testo a 13 px non regge AA (4,28:1 su --fondo, `stile.css:133`), e il colore da solo non
   basta comunque (WCAG 1.4.1). */
#palette-voci li.non-ora { color: var(--testo-tenue); border-left: 3px solid var(--rosso); }
#palette-voci li.nulla { color: var(--testo-tenue); }
```

- [ ] **Step 4: Verde; commit** — `feat(palette): ricerca dei comandi con il valore nella query, e il riquadro ⌘K`

---

### Task 8: `app.js` — la cucitura

**Files:**
- Modify: `static/app.js` (import `:7-23`; stato `:25-42`; `scegli` `:97-110`; callback del pannello `:113-133`; `suApertura` `:143-158`; `submit` `:248-257`; `ridisegna` `:408-440`; il `keydown` `:466-635` con l'estrazione di `eseguiVoce`)

**Interfaces:**
- Consumes: tutto quanto sopra. `creaPalette` (Task 7), `TASTI` (`tastiera.js`), `leggiAzione`, `leggiNodale`, `leggiDistribuito`, `leggiCombinazione`, `AVVISO_*` (Task 1), i dieci riduttori (Task 2), `azione` e `nomeCaso` (`modello.js`).
- Produces:
  - stato `let azioneCorrente = null;` e `azioneDestinazione(m)` → l'azione con id `azioneCorrente` se esiste in `m`, altrimenti l'ultima di `m.azioni`, altrimenti `null`. `scegli("azione", id)` la aggiorna; `suApertura` la azzera; `ridisegna` la azzera se sparita.
  - `eseguiVoce(voce, valore = null)`: il corpo del `keydown` da «`ev.preventDefault()`» in poi (`:479-635`), con `ev` non più disponibile: il ramo `direzione` resta **nel listener** prima della chiamata (ha bisogno di `ev.key`), tutti gli altri passano. Se dopo il dispatch `comando` è aperto e `valore !== null`: `campoComando.value = valore; comando.testo = valore; conferma();`. Il listener diventa: guardie (`daControllo`, `voceDaEvento`, `direzione`), `ev.preventDefault()`, `eseguiVoce(voce)`.
  - `conferma()`: il corpo del `submit` (`:248-257`) estratto, con i tre casi nuovi: `azione` → `confermaAzione`, `carico` → `confermaCarico`, `combinazione` → `confermaCombinazione`. Il listener `submit` chiama `conferma()` dopo `preventDefault`.
  - `confermaAzione`: `leggiAzione(comando.testo)`; messaggio → `dì`; azione → `esegui((m) => creaAzione(m, azione), \`azione «${nome}» ${natura}\`)`; a successo `azioneCorrente = id nuovo`, `selezione = {tipo: "azione", id}`, `chiudiComando()`; `ridisegna()`.
  - `confermaCarico`: per `comando.bersaglio.tipo`: `nodo` → `leggiNodale`, carico `{tipo: "nodale", nodo: bersaglio.id, ...letto}`; `asta` → `leggiDistribuito`, carico `{tipo: "distribuito", asta: bersaglio.id, ...letto}`; destinazione `comando.azione` (congelata all'apertura, come il bersaglio); `esegui((m) => aggiungiCarico(m, {azione, carico}), \`carico su ${tipo} ${id} → ${nome azione}\`)`; a successo `chiudiComando()`; `ridisegna()`.
  - `confermaCombinazione`: `leggiCombinazione` → `creaCombinazione`; a successo `selezione = {tipo: "combinazione", id}`, `chiudiComando()`; `ridisegna()`.
  - rami nuovi in `eseguiVoce`: `azione` → `apriComando(voce)`; `combinazione` → `apriComando(voce)`; `carico` → se `selezione?.tipo` non è `nodo` né `asta` → `dì("il carico vuole un nodo o un'asta: clicca nel piano o nell'albero")`; se `azioneDestinazione(m)` è `null` → `dì("prima crea un'azione: premi Z")`; altrimenti `apriComando({...voce, aiuto: \`${voce.aiuto} → azione «${dest.nome}»\`, esempio: tipo === "nodo" ? "Fx 20000" : "-12,5"}, {bersaglio: {...selezione}})` e `comando.azione = dest.id`; `palette` → se aperta `chiudi()`, altrimenti `apri({voci: TASTI, disponibili: new Set(vociDellaBarra(contestoBarra(modo, selezione, comando), selezione?.tipo ?? null).map((v) => v.codice))})`. **`palette` sta sopra la guardia `if (comando)`** come `apri`/`salva`: da dentro il campo `⌘K` deve aprire lo stesso.
  - `elimina` (`:573-590`): la mappa diventa `{sezione: eliminaSezione, materiale: eliminaMateriale, azione: eliminaAzione, combinazione: eliminaCombinazione}` e il ramo copre i quattro tipi.
  - `esiste` (`:412-413`) a sei vie: `azione: m.azioni, combinazione: m.combinazioni`.
  - `ridisegna`: `piano.disegna(m, { selezione, ghost, azione: azioneDestinazione(m) })`.
  - callback del pannello: `suAzione: (id, campi) => esegui((m) => modificaAzione(m, {id, ...campi}), \`azione ${id}: ${chiavi}\`)`; `suCarico: (azione, indice, carico) => esegui((m) => modificaCarico(m, {azione, indice, carico}), \`carico ${indice + 1} dell'azione ${azione}\`)`; `suTogliCarico`; `suAggiungiCarico: (id, tipo)` → il carico di default per tipo: `nodale` e `cedimento` sul **primo nodo** (`m.nodi[0]`; senza nodi → `dì("serve un nodo: premi N")`), `distribuito` e `termico` sulla **prima asta** (senza aste → `dì("serve un'asta")`), `gravita` con `fattore_z: -1`; poi `aggiungiCarico`; etichetta `\`carico ${NOME_TIPO[tipo]} → ${nome azione}\``; `suCombinazione: (id, campi) => modificaCombinazione`; `suTermine: (id, azione, coefficiente) => impostaTermine`, etichetta `\`termine ${azione} della combinazione ${id}\``. Tutte seguite da `ridisegna()`.
  - la palette: `const palette = creaPalette($("palette"), { suScelta: (voce, valore) => { eseguiVoce(voce, valore); ridisegna(); } });`
  - `chiudiComando` azzera anche `comando.azione` (è dentro `comando`, quindi già così).

**Ingressi degeneri:**
- `Q` con una sezione selezionata → messaggio «il carico vuole un nodo o un'asta…», nessun campo aperto
- `Q` su un nodo con zero azioni → «prima crea un'azione: premi Z»
- `Q` su un'asta, poi clic su un altro nodo, poi Invio → il carico va **sull'asta congelata** nel bersaglio, e all'azione congelata in `comando.azione` (anche se nel frattempo si è cliccata un'altra azione nell'albero)
- Invio su «20000» con un nodo → `AVVISO_NODALE` a schermo, il campo resta aperto col testo
- `Z` «spinta; Q» → il messaggio della categoria, campo aperto; «spinta; Q; vento» → azione creata, selezionata, `azioneCorrente` = lei, la Storia dice «azione «spinta» Q»
- `⌘K` → palette aperta con le voci; `⌘K` di nuovo → chiusa; Esc → chiusa; da dentro il campo di comando `⌘K` apre lo stesso
- palette «sezione 300 × 500» Invio senza asta selezionata → la sezione nasce (come `S` e poi Invio); «q -12,5» con un'asta selezionata → il carico nasce sull'asta, la palette e il campo si chiudono; «q -12,5» **senza** selezione → «il carico vuole un nodo o un'asta…», nessun campo
- palette «danno» con un nodo selezionato (voce «non ora») Invio → «il danno vuole un'asta…» (la frase del tasto)
- palette «sezione trecento» → il campo resta aperto con «trecento» e il messaggio «non è né b × h né il nome di una sezione»: lo stesso che a mano
- `⌫` su un'azione usata da una combinazione → il messaggio del riduttore («la usano le combinazioni 1»), l'azione resta
- aprire un file → `azioneCorrente = null`, il piano mostra i carichi dell'**ultima** azione del file, col suo nome
- `⌘Z` che disfa la creazione dell'azione corrente → `ridisegna` la azzera (sparita), il piano passa all'ultima rimasta o a niente

- [ ] **Step 1: Estrarre `eseguiVoce` e `conferma`** senza cambiare comportamento: `node --test test/*.test.js` verde (nessun test tocca `app.js`) e una prova a mano di `N`, `B`, `S` in browser. Commit `refactor(app): eseguiVoce e conferma estratti dal keydown e dal submit`.
- [ ] **Step 2: I rami nuovi, le tre conferme, i callback, la palette, `esiste`, `elimina`, `azioneCorrente`.** Import da aggiungere: `TASTI` da `tastiera.js`; `creaPalette` da `./palette.js`; `leggiAzione, leggiNodale, leggiDistribuito, leggiCombinazione, NOME_TIPO` da `./carichi.js`; i dieci riduttori da `./comandi.js`; `azione` da `./modello.js`. Il commento in testa allo stato `comando` (`:31-36`) dice «sette comandi»: aggiornalo a dieci (`N B M R S C D Z Q K`).

```js
let azioneCorrente = null;
/** L'azione a cui `Q` dà il carico e di cui il piano disegna le frecce: l'ultima scelta o
 *  creata, altrimenti l'ultima del modello. Una regola sola, scritta nell'aiuto del campo. */
function azioneDestinazione(m) {
  return azione(m, azioneCorrente) ?? m.azioni[m.azioni.length - 1] ?? null;
}

function confermaAzione() {
  const { azione: letta, messaggio } = leggiAzione(comando.testo);
  if (messaggio) { dì(messaggio); return; }
  if (!letta) return;
  if (esegui((m) => creaAzione(m, letta), `azione «${letta.nome}» ${letta.natura}${letta.categoria ? ` ${letta.categoria}` : ""}`)) {
    const n = corrente(cronologia);
    azioneCorrente = n.azioni[n.azioni.length - 1].id;
    selezione = { tipo: "azione", id: azioneCorrente };
    chiudiComando();
  }
  ridisegna();
}

function confermaCarico() {
  const { tipo, id } = comando.bersaglio;
  const letto = tipo === "nodo" ? leggiNodale(comando.testo) : leggiDistribuito(comando.testo);
  if (letto.messaggio) { dì(letto.messaggio); return; }
  if (!letto.carico) return;
  const carico = tipo === "nodo" ? { tipo: "nodale", nodo: id, ...letto.carico } : { tipo: "distribuito", asta: id, ...letto.carico };
  const dest = comando.azione;
  const nome = azione(corrente(cronologia), dest)?.nome ?? String(dest);
  if (esegui((m) => aggiungiCarico(m, { azione: dest, carico }), `carico su ${tipo} ${id} → ${nome}`)) chiudiComando();
  ridisegna();
}

function confermaCombinazione() {
  const { combinazione: letta, messaggio } = leggiCombinazione(comando.testo);
  if (messaggio) { dì(messaggio); return; }
  if (!letta) return;
  if (esegui((m) => creaCombinazione(m, letta), `combinazione «${letta.nome}»${letta.tipo ? ` ${letta.tipo}` : ""}`)) {
    const n = corrente(cronologia);
    selezione = { tipo: "combinazione", id: n.combinazioni[n.combinazioni.length - 1].id };
    chiudiComando();
  }
  ridisegna();
}
```

Il ramo `carico` in `eseguiVoce` (dopo `danno`):

```js
  if (voce.codice === "carico") {
    if (selezione?.tipo !== "nodo" && selezione?.tipo !== "asta") { dì("il carico vuole un nodo o un'asta: clicca nel piano o nell'albero"); return; }
    const dest = azioneDestinazione(corrente(cronologia));
    if (!dest) { dì("prima crea un'azione: premi Z"); return; }
    apriComando({ ...voce, aiuto: `${voce.aiuto} → azione «${dest.nome}»`, esempio: selezione.tipo === "nodo" ? "Fx 20000" : "-12,5" },
                { bersaglio: { ...selezione } });
    comando.azione = dest.id;  // congelata come il bersaglio: un clic nell'albero non la sposta
    return;
  }
  if (voce.codice === "azione" || voce.codice === "combinazione") { apriComando(voce); return; }
```

E la coda di `eseguiVoce`:

```js
  // Il valore arrivato dalla palette entra nel campo appena aperto e conferma subito: se il
  // campo lo rifiuta resta aperto col testo e col messaggio, come se fosse stato scritto a mano.
  if (comando && valore !== null) { campoComando.value = valore; comando.testo = valore; conferma(); }
```

Il ramo `palette`, sopra `if (comando) { campoComando.focus(); return; }`:

```js
  if (voce.codice === "palette") {
    if (palette.aperta) { palette.chiudi(); return; }
    const disponibili = new Set(vociDellaBarra(contestoBarra(modo, selezione, comando), selezione?.tipo ?? null).map((v) => v.codice));
    palette.apri({ voci: TASTI, disponibili });
    return;
  }
```

- [ ] **Step 3: Verde (444 + nuovi), prova a mano breve** (`Z`, `Q`, `K`, `⌘K`), **commit** — `feat(app): azioni, carichi e combinazioni dal campo e dall'ispettore; la palette ⌘K`

---

### Task 9: la verifica che conta

**Files:** nessuno — è la prova a mano, e chiude la 11c: il telaio 2×1 con i suoi carichi, disegnato da zero e salvato nella forma della fixture.

- [ ] **Step 1: Server** su `8817` (Global Constraints), Chrome su `http://127.0.0.1:8817/?v=11c`.
- [ ] **Step 2: Il telaio.** Apri `tests/fixture/telaio_2x1.nova.json`: nell'albero compaiono «Azioni» con «permanenti travi · G2 · 2 carichi» e «spinta in testa · Q vento · 1 carico», «Combinazioni» con «SLU · fondamentale (SLU) · 2 termini». Il piano disegna in alto a sinistra «carichi: spinta in testa» (l'ultima) con una freccia orizzontale sul nodo 4 e «Fx 20 000 N». Clic su «permanenti travi»: sei frecce che scendono sulle due travi, «q −12,5 N/mm».
- [ ] **Step 3: Da zero.** Nuovo modello (ricarica la pagina): `N` «0; 0», `B` «3000» ↑, `B` «4000» →, `B` «3000» ↓, poi `A` per chiudere e la seconda campata come vuoi. `S` «300 × 500» sulle aste. `Z` «permanenti travi; G2» Invio: l'azione nasce, selezionata, l'ispettore dice «caso Z1». Clic su una trave, `Q`: l'etichetta dice «carico su asta 4», l'aiuto «… → azione «permanenti travi»»; «-12,5» Invio: tre frecce sulla trave. `Q` sull'altra trave. `Z` «spinta in testa; Q» → il messaggio della categoria; «spinta in testa; Q; vento» Invio. Clic sul nodo in testa, `Q` «Fx 20000» Invio: la freccia orizzontale. `K` «SLU; fondamentale» Invio: la combinazione nasce e l'editor mostra due campi vuoti, «permanenti travi» e «spinta in testa»: scrivi 1,5 in entrambi. L'albero dice «SLU · fondamentale (SLU) · 2 termini».
- [ ] **Step 4: L'editor.** Seleziona «spinta in testa»: cambia la natura in G1 → la categoria resta scritta (lecito); svuota la categoria e rimetti Q → il messaggio «natura Q senza categoria d'uso», la natura resta G1 nel modello (la Storia non cresce). «aggiungi carico» → «termico»: compare «carico 2 · termico» con l'avviso del Check Model; «togli carico 2». Scrivi «ventimila» in Fx: il messaggio, il campo torna a «20 000».
- [ ] **Step 5: La palette.** `⌘K`: la lista con le scorciatoie; scrivi «sez»: «sezione S» in cima; «q -12,5» senza selezione, Invio → «il carico vuole un nodo o un'asta…»; seleziona una trave, `⌘K` «q -12,5» Invio → un terzo distribuito sulla trave, palette e campo chiusi. `⌘K` «danno» con un nodo selezionato: la voce è «non ora» col filetto rosso; Invio → «il danno vuole un'asta». `⌘K` «rinomina piede sinistro» con un nodo selezionato → rinominato senza passare dal campo. Esc chiude. Da dentro il campo di `N`, `⌘K` apre lo stesso.
- [ ] **Step 6: Elimina e disfa.** `⌫` su «permanenti travi» → «la usano le combinazioni 1». Svuota i suoi coefficienti in SLU, `⌫` → sparisce; `⌘Z` → torna, con i carichi. `⌘Z` fino a prima di `Z`: il titolo dei carichi sparisce dal piano.
- [ ] **Step 7: Il file.** `⌘S` su `/tmp/telaio-11c.nova.json`: salvato. Apri il JSON: `azioni[0].carichi[0]` è `{"tipo": "distribuito", "asta": …, "q": -12.5, "direzione": "z"}`, `azioni[1]` ha `"categoria": "vento"` e `{"tipo": "nodale", "nodo": …, "Fx": 20000, "Fy": 0, …}`, `combinazioni[0].termini` due termini a 1,5, `contatori.azione` e `contatori.combinazione` giusti. **Stessa forma della fixture**: lancia `/api/check` dal terminale (`curl -s -X POST http://127.0.0.1:8817/api/check -H 'content-type: application/json' -d @/tmp/telaio-11c.nova.json`) e leggi `riferimenti: passato`, `carico_termico: passato`.
- [ ] **Step 8: Larghezze e zoom.** 1280 e 1920 px, zoom 200 %: la palette sta nella finestra, l'editor dell'azione con tre carichi scorre in verticale e mai in orizzontale, le frecce non spingono il riquadro.
- [ ] **Step 9: Spegni il server.** Conteggi finali: JS e pytest (698, invariato) come da Global Constraints, riportati nel report con i numeri.

## Mutanti da dichiarare rossi, per chi esegue

Con controllo nullo verde prima di ogni mutante; copia del file prima, ripristino dalla copia.

1. `carichi.js:normalizzaCarico` — la chiave in più non si scarta (`return {carico: {...c}}` sul nodale) → «nessuna chiave in più» rosso.
2. `carichi.js:frecceDeiCarichi` — `versoDistribuito` restituisce `{x: 0, z: 1}` senza il segno di `q` → «tre frecce che scendono» rosso.
3. `carichi.js:leggiAzione` — la guardia `Q` senza categoria tolta → rosso.
4. `comandi.js:impostaTermine` — il `filter` che toglie il termine vecchio rimosso → «un termine per azione» rosso.
5. `comandi.js:eliminaAzione` — la guardia sulle combinazioni tolta → «dicono chi» rosso.
6. `comandi.js:modificaCarico` — `cambiata` ignorata (sempre `n`) → il test «lo stesso carico → il modello ricevuto» rosso (aggiungilo se manca).
7. `tastiera.js` — `["q", "carico"]` rimossa → rosso; `tipi` tolto dalla voce `carico` → «non su sezione» rosso.
8. `albero.js` — «1 carico» stampato «1 carichi» → rosso.
9. `pannello.js:campoNumero` — `vuotoAmmesso` ignorato → «svuotato è libero» rosso.
10. `pannello.js:editorAzione` — l'avviso del termico rimosso → rosso.
11. `piano.js` — le frecce disegnate anche con `azione: null` → rosso; il titolo omesso con la gravità → rosso.
12. `palette.js:filtraVoci` — `tasto === q` non dà 120 → «q -12,5 è il carico» rosso; `slice(0, 9)` tolto → «al massimo 9» rosso.

## Fuori da questa seduta

`analisi` (i casi da lanciare, `AnalisiStatica.casi`) e il bottone della corsa: T6 (#43-#46) — qui l'ispettore stampa il nome del caso e basta. Il generatore di combinazioni dalla norma (P6, fase 2) e il significato di «corretta» su una combinazione generata. Le masse da azioni per la modale (story 44, T7). Le frecce dei carichi nella vista 3D (`spazio.js`). L'ordine dei carichi nell'editor (si aggiungono in coda, non si spostano). Un secondo termine sulla stessa azione (il deck li somma, l'interfaccia ne tiene uno). L'importatore in interfaccia (11d).
