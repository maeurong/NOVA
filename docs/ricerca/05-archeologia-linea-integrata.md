# Ricerca: archeologia della linea analisi integrata di MeshRec (rimossa 2-3/09/2026)

Ricerca del 04/09/2026, condotta da un `researcher` in sola lettura sulla cronologia git di `~/GitHub/Tesi`. Domanda posta: che cosa la linea rimossa aveva già costruito, cosa funzionava, perché è stata dismessa, cosa è riusabile.

Convenzione tag: **[V]** verificato leggendo sorgente/commit/issue · **[M]** misurato con comando · **[INF]** inferenza · **[NON TROVATO]**.

## 0. Skill-gate, provenienza

- **Skill-gate**: `tech-stack-evaluator` **saltata** — task = archeologia git su codice interno, nessun confronto fra stack. `graphify-out/graph.json` **assente** in `~/GitHub/Tesi` e `~/GitHub/Tesi/meshrec` [M: `ls`] → solo git.
- **cwd**: `/Users/mario/GitHub/Tesi`, branch `feat/il-numero-di-prima`, HEAD `782f507` (working tree sporco: `app.js`, `stile.css`, `test_app_js.py`, `.scratch-ui/` — non toccati) [M: `git status -sb`].
- Tutto via `git -C /Users/mario/GitHub/Tesi show <sha>:<path>`; file rimossi dumpati in scratchpad per lettura. Nessun checkout.
- **Base «tutto presente»**: `9716f6e` (2026-09-02) = parent del primo commit di rimozione [M: `git rev-parse 46f1248^`]. Il brief diceva `cb8cc7f`: è il commit prima ancora; `9716f6e` è solo docs, quindi entrambi validi, `9716f6e` è il vero ultimo.
- **Commit di rimozione (mappa #161, ramo `chore/161-la-linea-dell-analisi-esce`, fast-forward su main)** [V: `gh issue view 161`, `git log`]:

| sha | data | ticket | cosa | diff |
|---|---|---|---|---|
| `46f1248` | 02/09 | #162 | schermata UI + `MOSTRA_LINEA_ANALISI` | +64 / −3323 |
| `8b46114` | 02/09 | #163 | 11 rotte server + `meshrec dottore` + dep-check | +17 / −1516 |
| `4386c22` | 02/09 | #164 | 6 moduli core + step 13 + `tests/validazione/` (12 file) | +69 / −14731 |
| `a07c54d` | 02/09 | #165 | `SolutoreConfig`, `ArmaturaConfig`, `SezioneConfig` | +119 / −472 |
| `abd3b97` | 02/09 | #166 | `docs/linea-analisi-integrata.md` cancellato, PRODUCT.md | — |
| `3e4049e` | 03/09 | post-mappa | orfani: `core/soglie.py`, `valori_di_progetto`, `viewport.unitaDelCampo`… | +189 / −1550 |

Totale dichiarato in #161: «52 file · 315 righe dentro · 20.150 fuori · 5 commit»; test da 1738 a 1269 `def test_` [V: #161 commento chiusura].

**Premesse del brief corrette**: `meshrec/docs/fase-7-cantiere/` e `docs/superpowers/specs/*fase-7*` → **[NON TROVATO]** in tutta la cronologia (`git log --all --diff-filter=A`). Esiste `docs/superpowers/specs/2026-08-29-meshrec-fase-8-prior-esteso-design.md` (ancora in albero). La «spec dell'analisi strutturale» stava solo sul ramo `worktree-notte-analisi-strutturale`, eliminato locale+remoto; `git fsck --lost-found` → 0 dangling commit → **irrecuperabile** [M].

---

## 1. Inventario della linea rimossa

Misure a `9716f6e`, comando `git -C /Users/mario/GitHub/Tesi show 9716f6e:<path> | wc -l`; test contati con `grep -c 'def test_'` [M].

**Moduli core (sei della mappa + due collaterali):**

| modulo | righe | test file | righe test | `def test_` | nato |
|---|---|---|---|---|---|
| `core/solve.py` | 1776 | `tests/test_solve.py` | 2436 | 102 | `1b43914` 21/08 |
| `core/opensees.py` | 1037 | `tests/test_opensees.py` | 1191 | 55 | `0b86651` 30/08 |
| `core/telaio.py` | 452 | `tests/test_telaio.py` | 638 | 36 | `4c93962` 30/08 |
| `core/armatura.py` | 308 | `tests/test_armatura.py` | 385 | 26 | `495340b` 30/08 |
| `core/combinazioni.py` | 530 | `tests/test_combinazioni.py` | 445 | 35 | `fe05678` 30/08 |
| `core/convergenza.py` | 318 | `tests/test_convergenza.py` | 318 | 22 | `4e3c89b` 26/08 |
| `core/soglie.py` (orfano, 3e4049e) | 493 | `tests/test_soglie.py` | 349 | 23 | `dc43218` 26/08 |
| `tests/feasibility/test_calculix.py` | — | — | 1070 | 13 | Fase 0 |

Somma sei moduli = 4421 righe (coincide con #161) [M].

**Config rimossa** (`a07c54d`): `SolutoreConfig` (`nome: Literal["calculix","opensees"]`, `percorso: Path|None`), `ArmaturaConfig` (9 campi: `classe_calcestruzzo`, `classe_acciaio` B450A/C, `barre_tese`, `diametro_teso`, `barre_compresse`, `diametro_compresso`, `diametro_staffe`, `passo_staffe`, `copriferro_nominale`), `SezioneConfig` (`calcestruzzo_confinato`, `calcestruzzo_copriferro`, `acciaio`, `armatura`), `RegioneConfig.sezione` → collassa in `membratura + materiale` [V: config.py@9716f6e:575-1500].

**Pipeline** (`4386c22`): `_step_solutore`, `_step_telaio`, `_artefatto_del_solutore`, `risolvi_corsa`, step 13 da `STEP_KEYS`/`STEP_BLOCKS`, sottocomando `meshrec solve` [V: pipeline.py@9716f6e:503-600].

**Server** (`8b46114`), 11 rotte [M: `git diff 9716f6e 8b46114 -- server.py | grep '^-.*@app'`]:
`GET/POST /api/wall`, `POST /api/solve`, `GET /api/analisi`, `POST /api/solutore/verifica`, `POST /api/combinazioni`, `POST /api/model/{tipo}`, `GET /api/compare`, `GET /api/membrature`, `GET /api/rigonfiamento`, `GET /api/campo/{caso}/{grandezza}`. Più `meshrec dottore` (cli).

**UI** (`46f1248`): `app.js` −1397 righe (32 funzioni top-level, elenco in §5), `index.html` −188, `stile.css` −90 (26 regole), `viewport.js` −27 (`mostraNuvolaPerMembratura`); test: `test_app_js.py` −1607 righe (46 casi), `test_server.py` −29, `test_stile.py` −49.

**Validazione** (`4386c22`): 12 file su 13 di `tests/validazione/` (righe/test in §6). Resta `test_patch_test.py` (383 righe, 4+1 test).

---

## 2. OpenSees — `core/opensees.py`

**Via**: binario `OpenSees` in **subprocess**, script `.tcl` scritto su disco. Non `openseespy`. Decisione #139 (Mario 28-29/08): «usiamo opensees tcl» [V]. Tre argomenti verbatim (#139):
> 1. Un solutore che aborta non deve portarsi via il programma. […] `eleResponse` sul tetraedro quadratico […] aborta il processo con `exit 134`. Come modulo in-process, ucciderebbe il server.
> 2. Il `.tcl` è il gemello del `.inp`. […] una sequenza di chiamate Python non lascia niente a cui la provenienza possa attaccarsi
> 3. La simmetria fra i due solutori resta esatta: due scrittori di testo, due sottoprocessi, due lettori di uscite.

`openseespy` come subprocess considerato e scartato «per l'artefatto, non per l'esecuzione»: `.py` gira solo dove openseespy è installato, `.tcl` ovunque c'è la distribuzione standard [V: #139].

**Modello generato** [V: opensees.py@9716f6e:284-452, 514-642]:
- `model BasicBuilder -ndm 3 -ndf 6`
- nodi 1-based; `fix … 1 1 1 1 1 1` sui nodi al piede dedotti da `_al_piede` (nessuna tolleranza: trave coricata di quota minima + nodi da cui si sale solo in piedi)
- materiali: `uniaxialMaterial Elastic` per membratura, uno calcestruzzo + uno acciaio — **elastici lineari, dichiarato**: «§8.2 del sequenziamento dichiara non decisa la casella che dice che cosa il programma fa con f_cd/f_yd» → nessun `Concrete01`/`Steel02`
- sezione per stazione: `section Fiber <i> -GJ <G*K_Roark> { patch rect <conc> 10 10 -b/2 -h/2 b/2 h/2 ; fiber y z A <acc> … }` — una barra = una fibra, posizioni da `armatura.colloca` traslate al baricentro
- `geomTransf Linear <i> vecxz=e2`; guardie: `|asse·e2|<0.999`, `e1 ≈ e2×asse` (cos ≥ 0.999) → altrimenti `ValueError`
- `element forceBeamColumn i nI nJ 5 <sec> <transf> -mass <ρA acciaio compreso>` — 5 punti Gauss-Lobatto
- **No `TenNodeTetrahedron`, no `ASDEmbeddedNodeElement`**: scartati in ricerca #128 (TenNodeTet: `eleResponse` abort exit 134, `PVDRecorder` rifiuta, nodi 9-10 scambiati vs Abaqus; ASDEmbedded: quarto nodo passato come int → fallback silenzioso a 3 nodi) [V: #128]
- carichi: **solo peso proprio** nodale (`load i 0 0 -P 0 0 0`, metà per estremo, non `eleLoad -beamUniform` per rendere esatto l'equilibrio reazioni=peso); analisi: `constraints Transformation / numberer RCM / system BandGeneral / test NormDispIncr 1e-8 10 / algorithm Linear / integrator LoadControl 1.0 / analysis Static / if {[analyze 1]!=0} {exit 1}`
- modale: `recorder Node … "eigen k"`, `eigen N`, `modalProperties -print -file massa_modale.out -unorm`, `record`
- costanti: `_PUNTI_INTEGRAZIONE=5`, `_SUDDIVISIONI_PATCH=10` (commento ponytail: «il giorno in cui i materiali diventano non lineari, questo numero va misurato»), `_costante_torsionale` = Roark Tab. 10.1 caso 4, non Ip.

**Lettura risultati**: recorder `.out` con nomi `{caso}_spostamenti.out` (disp dof 1-3), `{caso}_reazioni.out` (dof 1-6), `{caso}_forze.out` (`recorder Element … force`, 12 numeri/elemento **globali** → N/V/M per proiezione sull'asse), `modo_n.out`, `massa_modale.out` (blocchi `EIGENVALUE ANALYSIS` col 3 = Hz; `MASS RATIOS (%) (cumulative)` ultima riga). `_ultima_riga` = stato finale, guardie su file vuoto e riga corta.

**Errori/crash** — tre fatti misurati 30/08 su OpenSees 3.8.0 [V: docstring modulo]:
> - `-GJ` è obbligatorio nelle sezioni a fibre 3D. Senza, […] lo script si ferma alla card della sezione
> - Il codice d'uscita non è il segnale. OpenSees esce con codice 0 anche quando lo script muore su un errore fatale
> - Il marcatore di avviso è `WARNING`, senza asterisco, dove `ccx` scrive `*WARNING`

Soluzione: marcatore `fine.out`/`MESHREC_FINE` scritto in coda al `.tcl`; `esegui` → `RuntimeError` se manca; `leggi_uscite` rifiuta cartella con `.out` ma senza marcatore; cwd=out_dir (recorder relativi); `.out` vecchi cancellati prima; `timeout=solve._TIMEOUT_S=600`.

**Firme pubbliche** [V]:
```python
MARCA_AVVISO = "WARNING"; NOME_MASSA_MODALE = "massa_modale.out"
NOME_TCL = "13_telaio.tcl"; NOME_REGISTRO = "13_solver.log"
NOME_FINE = "fine.out"; MARCA_FINE = "MESHREC_FINE"
def conta_avvisi(uscita: str) -> int
def scrivi_tcl(path: Path, telaio: "Telaio", *, casi_di_carico: list[str],
               modi: int | None = None, nome_peso_proprio: str = _NOME_PESO_PROPRIO) -> dict[str, object]
    # → {"tcl","nodi","elementi","barre","nodi_vincolati","casi_di_carico","modi","peso_proprio"}
def leggi_uscite(out_dir: Path, telaio: "Telaio") -> dict[str, np.ndarray]
    # U_<CASO> (n,3); N_/V_/M_<CASO> per cella; MODO_<n> (n,3); mai VM_
def leggi_massa_modale(percorso: Path) -> dict[str, list[float]] | None   # {"catturata":[6],"disponibile":[100]*6}
def leggi_frequenze(percorso: Path) -> list[float]
def esegui(out_dir: Path, telaio: "Telaio", solutore: "SolutoreConfig", *,
           casi_di_carico: list[str], modi: int | None = None) -> dict[str, object]
    # → {"eseguito","solutore","returncode","avvisi","controlli"(7 verdetti),"modi","frequenze_hz","telaio","tcl","log"}
```
Casi ammessi: primo = `AnalysisConfig.step_name` (peso proprio), opzionale `MODALE`; **ogni altro nome → ValueError** («Uno *STEP senza carichi darebbe spostamenti nulli e sette verdetti verdi su un modello mai caricato»).

**Test**: 55 in `test_opensees.py`; OpenSees finto via `monkeypatch(subprocess.run)`; 4 test `feasibility` col binario vero (`MESHREC_OPENSEES` o PATH): mensola a 4 tratti, oracolo chiuso `ρAgL²/(2EA)` con EA acciaio compreso, `rel=1e-6`; reazione = peso `rel=1e-9`; verso asse locale y; `solve.verifica` vs omonimo; catena intera `esegui` con 7 verdetti [V: test_opensees.py:747-815, 1140-1160]. **Su questa macchina OpenSees non è installato** (`which OpenSees` vuoto; `ccx` in `~/.local/bin`) [M] → quei 4 test saltavano qui.

---

## 3. CalculiX — `core/solve.py` e modello comune

**Via**: subprocess `[ccx, "-i", deck.stem]`, cwd=deck.parent, `encoding=utf-8, errors=replace`, timeout 600 s; `returncode != 0` → `RuntimeError`; rinomina `wall_model.frd/.dat` → `13_solution.frd/.dat`; scrive `13_solver.log` e `13_solution.vtu` [V: solve.py@9716f6e:1502-1776].

**Lettura**: `leggi_frd` a colonne fisse (`_COL_VALORE = slice(12,24)`, passo dal record `100CL`, flag `modale` perché `2MODAL` esce incollato, forme normalizzate sulla massa → mai VM); `.dat`: `leggi_reazioni` (si ferma a `E I G E N V A L U E   O U T P U T` perché `*NODE PRINT, RF` resta attivo nel passo modale), `leggi_frequenze`, `leggi_massa_modale` (`E F F E C T I V E   M O D A L   M A S S` / `T O T A L …`). `_quota_tributaria_gravita`: ccx non include in RF la gravità dei nodi vincolati → formule C3D4 (m/4) e C3D10 (−m/20 vertici, m/5 lati) [V].

**Firme** [V]:
```python
def leggi_frd(percorso: Path) -> list[Blocco]          # Blocco(passo, grandezza, modale, nodi, dati)
def leggi_reazioni(percorso, passo, *, righe=None) -> dict[int, tuple[float,float,float]]
def leggi_frequenze(percorso, *, righe=None) -> list[float]
def leggi_massa_modale(percorso, *, righe=None) -> dict | None
def von_mises(tensioni: np.ndarray) -> np.ndarray
def controlla_reazioni(reazioni, peso_atteso, *, tolleranza) / controlla_autovalori(frequenze_hz, soglia_relativa=0.2)
def controlla_picco(valori, quote, banda) / controlla_vincolo_in_pianta(minimo) / controlla_avvisi(conteggio)
def controlla_spostamenti(...) / controlla_massa_modale(masse)
def esito_non_applicabile(controllo, modello) -> dict | None
def verdetti_per_modello(modello, calcolo: Mapping[str, Callable]) -> dict[str, dict]
def eseguibile(cfg) -> Path|None ; def disponibilita(cfg=None) -> dict ; def verifica(cfg) -> dict
def valida_casi_di_carico(casi) -> list[str]
def risolvi(out_dir, deck, cfg: AnalysisConfig, nodes, elements, element_type, *,
            casi_di_carico, vincolo_in_pianta, trasformata, solutore=None) -> dict
```
`risolvi` **rifiuta** `solutore.nome != "calculix"` con `ValueError` che rimanda a `core/opensees.py` — i due rami sono fratelli (`pipeline._step_solutore` vs `_step_telaio`), instradati da `cfg.solutore.nome` [V: pipeline.py:503-596].

**Cosa era comune** (decisione #138, Mario 29/08) [V]:
- **Modello dati risultati = `.vtu` con campi nominati**: `U_<CASO>` (vettore nodale), `VM_<CASO>` (scalare nodale), `MODO_<n>`; telaio aggiunge **dati per cella** `N_/V_/M_<CASO>`. «Scartata esplicitamente la conversione a grandezza nodale»: spalmare M sui nodi «è precisamente la classe di falso che questo progetto è costruito per non produrre».
- **Sette verdetti** condivisi via `CONTROLLI_PER_MODELLO` (tabella `solido`/`telaio`, ogni casella «vale» o «non vale: <ragione>»): `reazioni`, `vincolo_in_pianta` (non vale su telaio: `constraint_plan_extent` rende 1,0 su una colonna sola), `autovalori`, `avvisi`, `spostamenti`, `massa_modale`, `picco` (non vale su telaio: tensione vive per fibra). `verdetti_per_modello` obbliga a passare dalla tabella; non applicabile ≠ non passato (`applicabile: False`, mai verde).
- **Dipendenze**: `_SOLUTORI` (ccx: `-v`, marcatore `Version`, esce **201**; OpenSees: stdin `puts "MESHREC_VERIFICA"`, marcatori `OpenSees` + eco — misurato che `/bin/cat` passava con un marcatore solo), `DOVE_PRENDERLO`, `_trova` (percorso dichiarato inesistente **non ripiega sul PATH**; cerca anche `.exe`).
- **Nessuna struttura «modello» indipendente dal solutore a monte**: il solido entra come deck `.inp` (step 11) + nodi/tet; il telaio come `Telaio` NamedTuple (§4). Ciò che è comune sta **a valle** (vtu, verdetti) e nell'infrastruttura (config `solutore`, disponibilità, un artefatto per corsa — #139 Q3: «Chi vuole confrontare i due solutori fa due corse»).

---

## 4. `core/telaio.py`, `core/armatura.py`, `core/combinazioni.py` — norma

**`telaio.py`** — «non misura niente»: compone prior (`12_wall.json`) + `regioni` in `Telaio(nodi (m,3), elementi: list[ElementoTelaio], giunzioni, materiali: dict[int, SezioneConfig])`; `ElementoTelaio(membratura, stazione, nodo_i, nodo_j, sezione (b,h), e1, e2, barre: list[BarraCollocata], riempimento_sezione)`. Firma pubblica: `costruisci(prior: dict, regioni: dict[str, RegioneConfig]) -> Telaio` [V: telaio.py:87-126, 287].
Tre scelte (decisioni #134/#142/#143, Mario 29/08): **una fetta = un'asta** (le 20 fette equispaziate di `wall.misura`, 6 membrature → 120 elementi; «non esiste un numero da tarare»); **lunghezza di calcolo nodo-nodo**, chi cede raggiunge l'asse di chi resta; **nodo condiviso = stazione più vicina** con `scostamento_nodo` mostrato. Guardie: `base_sezione` mancante, terna ≠ `e2 = asse×e1`, quote non crescenti, sezione nulla, NaN, anello di alias, membratura senza sezione dichiarata (nessun predefinito). Vincoli/modi/nome caso **non** nel `Telaio` (dedotti in opensees/config). Test 36, banco sintetico `synth.sample_frame_surface` (4 membrature, nuvola→prior→telaio→tcl; 21 nodi a terra della trave di fondazione misurati) [V: test_telaio.py:509-545].

**Cosa sopravvive in albero oggi** [M: grep su `wall.py` HEAD]: `Membratura.sezioni_fette`, `quote_fette`, `base_sezione`, `riempimento_sezione/stato`, `giunzioni` in `12_wall.json` — tutto l'ingresso di `telaio.costruisci` **è ancora prodotto**.

**`armatura.py`** — NTC 2018 implementate [V: armatura.py:1-130, 198-256]:
- `colloca(armatura, sezione) -> list[BarraCollocata]`: barre tese/compresse in una fila, da spigolo; solleva solo se non ci stanno («aritmetica che non parte»)
- `verdetti(armatura, sezioni_fette, quote_fette, f_ctm) -> list[VerdettoStazione]` **per stazione**: `d = h − c − Ø_st − Ø/2`, `mu = A_s/(b d)`, `mu_min = max(0,26 f_ctm/f_yk; 0,0013)` [§4.1.6.1.1, (4.1.45)], `mu_bil = α f_cd k_bil/f_yd` con `k_bil = ε_cu/(ε_cu + f_yd/E_s)`, `ALFA = 1 − ε_c2/(3 ε_cu) = 0,809524` [§4.1.2.1.2.1, CEB 123], verdetto `fragile | duttile | oltre_la_bilanciata`, `interferro_netto`, `copriferro_netto`. `bilanciata(f_cd, f_yd, E_s)`. Oracolo dispense: `R_ck=30`, B450C → `f_cd=14,11`, `k_bil=0,641`, `mu_bil≈1,87%` [V: #136]. **«Il programma rileva, non progetta»**: sotto minimo = mostrato, non rifiutato. Non fa: interferro min vs inerti (§4.1.6.1.3, manca `dg`), taglio, presso-flessione, ε_ud.
- `materiali.valori_di_progetto` con `ALFA_CC`, `GAMMA_C`, `GAMMA_S` — rimossi in `3e4049e` (31 righe, «corretti, senza nessuno che li chiedesse») [V: 3e4049e msg].

**`combinazioni.py`** [V: combinazioni.py:1-70, 262-300, 405-510]:
- registro `PSI` (Tab. 2.5.I, per categoria d'uso) e `GAMMA` (Tab. 2.6.I col. A1 STR), ogni voce con `fonte/origine/data/nota` (forma di `soglie.py`)
- `proponi(azioni: Mapping[nome, Natura|None], categoria_uso, *, azione_sismica=None) -> list[Combinazione]`: [2.5.1] fondamentale, [2.5.2] caratteristica, [2.5.3] frequente, [2.5.4] quasi permanente, [2.5.5] sismica; una per variabile di base; tutti γ **sfavorevoli** (§2.5.3: favorevoli si omettono); azione senza `natura` **ferma** la proposta
- `aggiorna(esistenti, …)`: rigenera solo `proposta=True`, non tocca corrette a mano
- sismica **statica lineare equivalente** §7.3.3.2: `periodo_fondamentale(spostamento_mm)` (Rayleigh, non `C_1 H^{3/4}` che «non esiste più nelle NTC 2018»), `coefficiente_lambda(T1, T_C, orizzontamenti)` (0,85/1,0), `forza_di_base(…, ordinata_spettro)` — `S_d(T_1)` **arriva da fuori**, sito non in configurazione; `forze_di_piano`
- **modale con spettro assente** per decisione: SRSS/CQC «produce una grandezza senza segno che non appartiene a nessun caso» ≠ contratto #138
- decisione 14 di #161: «la meno solida della mappa — è l'unico pezzo di norma fra ciò che si cancella, ed è citabile in tesi anche senza un solutore» [V]

**`convergenza.py`**: `ordine_osservato(f1,f2,f3,r21,r32)`, `stima(valori, dimensioni, *, fattore, ordine_formale) -> {esito ∈ asintotico|non_monotono|fuori_campo|rapporto_troppo_piccolo|valore_nullo, gci_fine, estrapolato, …}` (Celik et al. 2008, `r ≥ 1,3`, banda ordine 0,5-3×, `_GCI_SOTTO_RUMORE=1e-3`) [V].

---

## 5. Schermata dismessa e ragioni

**Struttura** [V: index.html@9716f6e:338-450]: `<section id="analisi">` con testata «Analisi strutturale — step 13» + «Torna alla pipeline»; **quattro stadi in ordine di dipendenza**, ciascuno con stato vuoto nel markup:
1. **Modello** — solido (step 11) o telaio (step 12), quale solutore instradato (`MODELLO_DEL_SOLUTORE`), frazione orfana; unico comando `#risolvi` → `POST /api/solve` (→ `meshrec solve` in subprocess) + `POST /api/solutore/verifica` dietro gesto
2. **Struttura** — membrature del prior, `sezione_dichiarata`, stazioni con verdetto `armatura.verdetti`, riempimento con soglia/affidabilità, giunzioni
3. **Pre-processore** — azioni dichiarate con `natura`, categorie ψ, proposta combinazioni (`POST /api/combinazioni` scrive `carichi.combinazioni` in config)
4. **Post-processore** — i 7 verdetti (`applicabile` vs `passato`), frequenze, campo colore via `GET /api/campo/{caso}/{grandezza}` (`mostraCampoDelloStep`, `mostraModoDelloStep`, p99); **mappe/deformate dichiarate assenti**: «quali risultati i due solutori abbiano in comune è una decisione ancora aperta»

Alimentata da una tratta sola `GET /api/analisi` (server.py:1569-1735) che rilegge `metrics.json`, `12_wall.json`, config, `solve.disponibilita`. Più pannello prior (`#pannello-prior`, `caricaPrior`, `disegnaMembrature/Scartate`, `mostraMembratureNelViewport`), schede «Modelli» e «Confronto» (`caricaConfronto`, `POST /api/model/{tipo}`).
32 funzioni JS rimosse [M: diff]: `ragioneDelPassaggio, aggiornaPassaggio, testoDelloStadioModello, aggiornaStadi, mostraAnalisi, mostraPipeline, cifra, misura, tabellaDiDati, ragioneDelSolutore, menuDelSolutore, schedaModello, nomeDellIncontro, schedaStruttura, schedaPreprocessore, apriProposta, propostaDelleCombinazioni, schedaPostprocessore, disegnaAnalisi, caricaAnalisi, apriVerifica, verificaSolutore, firmaDegliStep, rileggiSeServe, apriRisoluzione, risolvi, mostraCampoDelloStep, mostraModoDelloStep, pannelloCampo, attendiFineComando, caricaPrior, disegnaMembrature, disegnaScartate, mostraMembratureNelViewport, caricaConfronto`. 46 test rimossi (nomi tipo `test_i_sette_verdetti_distinguono_non_applicabile_da_non_passato`, `test_il_solutore_assente_e_quello_rotto_sono_due_diagnosi_diverse`, `test_le_quattro_schede_non_si_toccano_finche_la_richiesta_non_e_tornata`).

Il 31/08 (#160) era già **nascosta** dietro `MOSTRA_LINEA_ANALISI=false`: «Nascondere e non cancellare, perché quel codice non è morto» [V: PR 160].

**Ragioni dichiarate della dismissione** — tutto ciò che esiste per iscritto:

- #161 Notes: «**Perché.** Il 2 settembre 2026 l'autore ha provato l'interfaccia dell'analisi e ha deciso di dismettere la linea. I rami che la portavano avanti sono stati eliminati, locali e remoti, e il lavoro di due notti con essi.» / «**Il criterio, dichiarato dall'autore:** *cade ciò che non serve ad Abaqus.* Il prodotto scrive un deck; eseguirlo è mestiere di Abaqus, a mano, ed è così che la tesi difende i propri numeri.» [V]
- #127 chiusura: «## Abbandonata, non sbagliata — Il 2 settembre 2026 l'autore ha provato l'interfaccia di questa linea sulla corsa `lab_telaio_v2` e ha deciso di dismetterla. […] Quella specifica non verrà scritta: non perché le decisioni fossero sbagliate, ma perché il prodotto ha deciso di fermarsi al deck» [V]
- spec 31/08 nota 02/09: «Due giorni dopo l'autore ha provato l'interfaccia della linea parallela e l'ha dismessa» [V: `docs/superpowers/specs/2026-08-31-perimetro-del-progetto-design.md:6-19`]
- `docs/linea-analisi-integrata.md` (31/08, cancellato in `abd3b97`) — ragioni per cui stava **fuori perimetro** (non della dismissione): «La prima è di tempo: pre-processore, solutore e post-processore sono la parte del progetto che può non chiudere entro la tesi, perché dipende da eseguibili esterni, dalla convergenza, e dall'interpretazione dei risultati […] La seconda è di prova. La tesi presenta risultati Abaqus. Se il programma ne calcolasse altri con un solutore proprio, ogni scostamento fra i due motori diventerebbe qualcosa da spiegare» e la condizione di rientro: «quando i suoi risultati reggessero il confronto con Abaqus sullo stesso deck, in modo documentato e ripetibile» [V]
- #161 Out of scope: «Rifare l'analisi strutturale, dentro il programma o fuori. Se tornerà, sarà da zero e sarà un altro percorso.» [V]

**Ragione UX/architetturale specifica (cosa non reggeva vedendo la schermata): [NON TROVATO]** in commit, issue, doc. Ogni testo dice solo «ha provato l'interfaccia […] e ha deciso». Branch con eventuale diario eliminati, 0 dangling [M]. **[INF]**: indizi interni — la schermata era «VUOTA apposta» per costruzione (commento index.html: «Tutto ciò che mostrerà è un numero che qualcun altro sta ancora calcolando»), post-processore senza mappe/deformate, materiali solo elastici, un solo carico (peso proprio) sul telaio, nessun risultato Abaqus in `analisi-abaqus/` (solo README) → provata su `lab_telaio_v2` mostrava poco. Da confermare con Mario.

---

## 6. Validazione uscita — oracoli e numeri

Tutti nati 26/08 (`d39a8ba`, `40f5566`, `6c3e9af`, `4e3c89b`, `af8b326`), usciti in `4386c22`; deselezionati di default (`addopts = -m 'not feasibility and not validazione'`), giravano solo nel job CI `benchmark` [V: linea-analisi-integrata.md:75-81, #164]. **Costruivano il deck con `abaqus` (che resta) e usavano `solve` solo per lanciare ccx e rileggere** → «validavano il deck che resta» (#164). Tre opzioni proposte (A togliere, B tenere solve+convergenza come apparato, C riscrivere lanciando ccx come il patch test); raccomandata B, **Mario ha scelto A** [V: #164].

| test | righe/test | oracolo | numero raggiunto (ccx 2.21/2.22, unità mm-N-MPa-t) |
|---|---|---|---|
| `test_nafems_le10.py` | 295 / 5 | σ_yy in D = −5,38 MPa (numerico, «mesh refinement»); soglia \|scarto\|<0,35 | C3D4 −3,9084 (+27,35%, 1081 nodi); C3D10 −5,0767 (+5,64%, 6552 nodi); non-monotonia riprodotta +5,31%→+7,05% (Abaqus: +1,15%→+7,24%) [V: d39a8ba] |
| `test_nafems_fv52.py` | 204 / 3 | modi 4-10 set numerico `(44.092, 106.66, 106.66, 156.23, 193.58, 200.13, 200.13)` Hz; 3 rigidi a 0; scarto > −5%, \|s\|<15%; gemelli <5% | 44,031 (−0,14%), 106,513, 106,552, 160,755 (+2,90%), 193,599 (+0,01%), 201,025, 201,506 — ogni modo meglio del C3D10 Abaqus; gemelli 0,04% e 0,24% [V: 40f5566] |
| `test_mensola.py` | 530 / 5 | mensola 400×30×40, P=1000 N; Eulero-Bernoulli `PL³/3EI` e Timoshenko `+PL/kGA` (Gere-Timoshenko 1990); f1 Hurty-Rubinstein; tabella Benzley 1995 | freccia C3D4 3,90681 mm (−12,73%), C3D10 4,46354 (−0,29% da Timoshenko, +0,43% da EB); f1 C3D4 119,627 Hz (+11,71%), C3D10 106,882 (−0,19%); convergenza C3D4 −30,88→−17,63→−9,31%, C3D10 −0,35→−0,29→−0,28% [V: 6c3e9af] |
| `test_convergenza_mensola.py` | 136 / 3 | GCI Celik 2008, Fs=1,25, passi 10/14/20 mm | C3D4: p_oss 1,17, GCI 23,67%, errore vero 9,31%; C3D10: p_oss 5,89, GCI 0,0015%, errore vero 0,279% (186×) → «GCI non è barra d'errore verso il vero»; GCI 0,0015% macOS vs 0,0346% Linux stesso caso [V: docs/validazione/convergenza-di-maglio.md:17-58] |
| `test_patch_test.py` (**resta**) | 383 / 4+1 | Taylor-Simo-Zienkiewicz-Chan 1986, varianti A (campo lineare imposto) e B (forze consistenti) | verde, lancia ccx da sé |
| `test_risolvi_end_to_end.py` | 274 / 5 | cubo 100 mm C3D10, `_quota_tributaria` vs formula C3D4 → scarto 2,22e-1 contro tol 1e-4 | cablaggio #40 |
| altri | `test_equilibrio_reazioni` 138/2, `test_modello_mal_vincolato` 193/3, `test_sensibilita_materiali` 235/4, `test_combinazioni_ccx` 196/3, `test_ordine_frd` 251/4, `test_passi_oltre_nove` 237/4, `test_pressione_equilibrio` 168/1 | | |

**Docs restano in albero** (`docs/validazione/benchmark-nafems.md`, `mensola-benzley.md`, `convergenza-di-maglio.md`, `ricerca-vv-standard.md`, README con nota 03/09) [M: `ls`]. Geometrie NAFEMS (`elliptical_annulus_mesh`, piastra FV52) vivono in `synth` — **da verificare se ancora in albero** (non controllato).

**Nota**: questi oracoli sono per **solido tetraedrico + ccx**. Per il nuovo progetto OpenSees/telaio, riusabili come oracoli solo: mensola analitica (Gere-Timoshenko, Hurty-Rubinstein), FV52 se si modella piastra (no, è solido), patch test (no). L'unico oracolo **beam** già scritto è quello in `test_opensees.py:747`: accorciamento `ρAgL²/(2EA)` esatto a `1e-6` con EA acciaio compreso [V].

---

## 7. Lezioni riusabili

**Riusabile as-is (stesso autore, MIT)** — cherry-pick da `9716f6e`:
- `core/opensees.py` per intero: scrittore `.tcl` (fibre, `-GJ` Roark, `geomTransf` con guardie sui versi), lettore recorder, `fine.out`, marcatore `WARNING`, `_al_piede` senza tolleranza, `_peso_nodale`. È il pezzo più maturo: 55 test + 4 sul binario vero.
- `core/telaio.py` (`costruisci`) — dipende solo da `12_wall.json` + `RegioneConfig.sezione` (da ricreare: `SezioneConfig`/`ArmaturaConfig` sono in `config.py@9716f6e:1384-1500`).
- `core/armatura.py` (`colloca`, `verdetti`, costanti NTC) e `core/combinazioni.py` (registro ψ/γ, `proponi/aggiorna`, statica equivalente) — norma con fonte per ogni numero; #161 stessa: «citabile in tesi anche senza un solutore».
- Da `solve.py`: `CONTROLLI_PER_MODELLO` + `esito_non_applicabile` + `verdetti_per_modello` + i 7 `controlla_*` + `_SOLUTORI/_trova/disponibilita/verifica` (dep-check con marcatori, non exit code). Il resto di `solve.py` (frd/dat) è ccx-only.
- Le 19 ricerche di #127, in albero: `docs/validazione/ricerca-opensees-e-armature.md`, `ricerca-armature-opensees-fibre.md` (16 dati mancanti, idioma fibre 3 fonti, raccomandazione `Concrete01/04 + Steel02`), `ricerca-ntc-2018-numeri-per-il-catalogo.md`, `ricerca-armature-convenzioni-normative.md`. Issue #128, #130, #132, #134, #136, #138, #139, #141, #142, #143, #146.

**Da riscrivere / non risolto (per ammissione dell'autore, verbatim nel codice)**:
- **Materiali elastici**: «§8.2 del sequenziamento dichiara **non decisa** la casella che dice che cosa il programma fa con f_cd/f_yd quando […] `veste = "gia_ridotta"`» (opensees.py:290-293). `_SUDDIVISIONI_PATCH` «va misurato» con non-linearità.
- **Carichi sul telaio**: solo peso proprio; «Le azioni e le combinazioni sono del ramo G (§4.9)» mai scritto. `combinazioni.proponi` produceva `Combinazione` per il **deck ccx**, non per il `.tcl`.
- **Modale con spettro / SRSS-CQC**: «decisione che manca (#146, §8.1)»; spettro `S_d(T_1)` e parametri di sito fuori configurazione.
- **Post-processore**: «Mappe di colore, deformate e scelta delle grandezze non ci sono» (index.html); tensioni per fibra non lette (nessun recorder `section fiber`).
- **Verifiche di norma implementate = solo `armatura.verdetti`** (min armatura, bilanciata, interferro). Presso-flessione, taglio, minimi d'armatura completi erano **solo issue** nella mappa wayfinder del ramo eliminato (linea-analisi-integrata.md:37-41) → [NON TROVATO] codice.
- **`combinazioni.py` accoppiato a `PipelineConfig`** (`azioni_dichiarate(cfg)`, `Combinazione` pydantic): da disaccoppiare.
- Configurazione: `Combinazione.proposta` «campo OBBLIGATORIO che nessuno leggeva» (3e4049e); `SezioneConfig` a tre materiali di cui uno letto (#161 dec. 9).
- Assunzione strutturale: sezione rettangolare costante per tronco; `contorno` poligonale per fetta (`patch quad`) «via d'aggiornamento nominata e non presa» (#142 Q3).

**Sbagliato / costoso, misurato**: `_al_piede` con tolleranza relativa incastrava 1 nodo su 80 (opensees.py:194-203); «etichetta al posto del carico» (`casi_di_carico=["VENTO"]` scriveva gravità); `/bin/cat` passava la verifica con un marcatore; ccx esce 201 su `-v`; OpenSees esce 0 su errore fatale.

---

## Domande aperte per il brainstorming

1. **Perché davvero è stata dismessa** — nessuna fonte scritta oltre «ha provato […] e ha deciso». Mario deve dirlo: era la UI vuota-per-costruzione, i materiali elastici, i carichi mancanti, il tempo, il confronto con Abaqus?
2. Il nuovo progetto è **OpenSees per il telaio a fibre dal prior** (dove `opensees.py`+`telaio.py` valgono ~1500 righe pronte) o **OpenSees sul solido** (dove #128 ha misurato `TenNodeTetrahedron` rotto e nessuna armatura embedded praticabile)?
3. `.tcl` subprocess (decisione #139) o `openseespy` in-process — il nuovo progetto ha ancora il vincolo «artefatto che esce dal programma»? Con UI separata e nessun registro di impronte, l'argomento 2 di #139 pesa meno; l'argomento 1 (abort 134) resta.
4. Ingresso dati: legge `12_wall.json` + `config.yaml` di MeshRec (contratto stabile: `sezioni_fette`, `quote_fette`, `base_sezione`, `giunzioni` ancora in `wall.py`) o ridefinisce un proprio formato?
5. Le decisioni già prese in #134/#136/#138/#139/#142/#143/#146 (Mario, 28-29/08) valgono ancora o si riaprono?
6. Materiali non lineari (`Concrete01/04 + Steel02`) e la casella §8.2 (f_k vs gia_ridotta): decisione prima del codice.
7. Quali oracoli per beam/fibre: mensola analitica c'è; per sezione a fibre serve un caso con soluzione nota (es. M-χ di sezione rettangolare) — non esiste nel repo.
8. Verifiche NTC da coprire: solo quelle di `armatura.py` o anche presso-flessione/taglio/SLE? Erano ticket sul ramo perso.
9. OpenSees non è installato su questa macchina (ccx sì): test sul binario vero non girano qui.

## Raccomandazioni (non decisioni)

- **R1**: partire da cherry-pick di `opensees.py`, `telaio.py`, `armatura.py` da `9716f6e` + tabella `CONTROLLI_PER_MODELLO`/`verdetti_per_modello` da `solve.py`; non riscrivere da zero ciò che ha 55+36+26 test e 4 prove sul binario vero.
- **R2**: prima di codice, chiudere in brainstorming le tre caselle che l'autore stesso marca «non decise»: materiali non lineari/veste delle resistenze, carichi diversi dal peso proprio sul telaio, modale con spettro.
- **R3**: chiedere a Mario la ragione della dismissione prima di disegnare la UI nuova — altrimenti si rischia di ricostruire la stessa schermata a quattro stadi.
- **R4**: tenere `.tcl` come artefatto anche se si usa `openseespy` per l'esecuzione — solo se il vincolo «uscite che escono dal programma» resta; altrimenti openseespy in subprocess è più semplice (scartato in #139 solo per l'artefatto).
- **R5**: se il nuovo progetto legge `12_wall.json`, fissare subito un test di contratto sul prior vero (il vecchio `test_il_prior_vero_arriva_fino_al_tcl` è il modello).

Percorsi chiave: `/Users/mario/GitHub/Tesi` (git, base `9716f6e`). I dump leggibili dei file rimossi stavano nello scratchpad di sessione (effimero): per rileggerli, `git -C /Users/mario/GitHub/Tesi show 9716f6e:meshrec/src/meshrec/core/opensees.py` e analoghi.
