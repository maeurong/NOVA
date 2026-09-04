# Ricerca: funzioni «intelligenti» per modellatore strutturale su OpenSees

Ricerca del 04/09/2026, condotta da un `researcher` dispacciato in parallelo con altri sei (vedi `README.md` di questa cartella). Domanda posta: che cosa può voler dire «intelligente» in un modellatore strutturale con solutore OpenSees, con evidenze.

Skill-gate: `tech-stack-evaluator` **saltata** — task è censimento/ricerca, non confronto fra librerie o stack; nessun candidato tecnologico da mettere in tabella TCO.

Convenzione tag: **[V]** verificato su fonte primaria in sessione · **[M]** misurato/eseguito in sessione · **[INF]** inferenza · **[NON TROVATO]** cercato, non trovato.

## Artefatti consultati

Repo `~/GitHub/Tesi`, branch `feat/il-numero-di-prima`, HEAD `782f507` [M].

| artefatto | esito |
|---|---|
| `/Users/mario/GitHub/Tesi/README.md:4-13` | premessa brief confermata: nuvola → 11 step → deck `.inp`, «MeshRec costruisce il modello, non lo risolve» [V] |
| `/Users/mario/GitHub/Tesi/PRODUCT.md:76-78, 186-201` | principio «ogni numero ha un controllo che lo contraddice» (r.77) e «non fabbricare precisione che non esiste» (r.193) confermati [V]. Nota: r.64-67 dichiara il solutore integrato **rimosso** il 02/09/2026 — coerente col «progetto nuovo e separato» del brief |
| `/Users/mario/GitHub/Tesi/docs/validazione/modi-per-la-normativa.md` | intero. Misura 26/08/2026: 90% massa partecipante raggiunto a **32 modi** su entrambi i corpi, pianerottolo largo (~94%) da 37-38; predefinito scelto **40**; la frazione sale **a gradini** (coppie di modi) e il bordo del gradino si sposta col maglio (r.56-75). Citazione norma: EN 1998-1 §4.3.3.3.1(3) + NTC 2018 §7.3.3.1 (r.8-10) [V] |
| `.../ricerca-opensees-e-armature.md:16-21` | convenzione tag adottata qui [V] |
| `.../ricerca-armature-librerie-python.md:58-78` | censimento librerie sezioni: `structuralcodes` 0.7.1 Apache-2.0, `concreteproperties` 0.8.0 MIT, `sectionproperties` 3.10.2 MIT — riusabile per candidata C7 [V] |
| NTC 2018 cap. 10 (PDF GU 20/02/2018, `studiopetrillo.com/files/ntc2018/cap10.pdf`, estratto con `pdftotext`) | §10.2, §10.2.1, §10.2.2 letti verbatim [V] |
| Circolare 21/01/2019 n.7 (PDF `sttan.it`, 11.940.321 B, `pdftotext`) | C10.2.1 lett. b.1-b.4, C10.2.2 letti verbatim [V] |
| `platform.claude.com/docs/en/about-claude/pricing` | tabella prezzi completa [V] |
| `platform.claude.com/docs/en/manage-claude/api-and-data-retention` | 56 KB, letto per grep [V] |
| `privacy.claude.com/.../7996866` | retention default 30 gg [V] |
| `platform.claude.com/docs/en/build-with-claude/structured-outputs` | [V] |
| arXiv 2507.02938, 2603.07728, 2604.09866, 2606.06525, 2510.11004, 2512.20732, 2509.21079, 2603.21011, 2605.28978, 2510.21993 | abstract/HTML letti [V] |
| GitHub `viktor-platform/opensees-ai-agent`, `BentleySystems/openstaad-mcp`, `Hanlin-Dong/SmartAnalyze`, `DelosLiang/masse`, `rafse/norma-ntc` | README letti [V] |
| Doc OpenSees/OpenSeesPy: `modalProperties`, `reactions`, `analyze`, `analysis`; opstool `pre` API | [V] |
| ETABS *Check Model*, RFEM 6 *Model Check*, Karamba3D *EigenModes*, Dlubal KB 002032 (MCP), Dlubal Mia, Onshape AI Advisor (critica TexoCAD), AEC Magazine su Bentley | [V] |
| `pypi.org/pypi/opensees-mcp/json` | **404** → pacchetto non esiste [M] |

Fonti non aperte (403/404): Ansys product page, Autodesk blog Assistant, CSI KB error codes, OpenSees `LICENSE` su GitHub, `masse/LICENSE`. Dove usate, tag [NON TROVATO] o «via risultato di ricerca, pagina non aperta».

---

## 1. LLM/agenti per modellazione strutturale — stato dell'arte 2024-2026

Cluster dominante: gruppo Cheng (Univ. Miami) + Frangopol/Bocchini (Lehigh). Cinque paper in 12 mesi, stessa pipeline: testo → agente → **codice OpenSeesPy/SAP2000/ETABS** → esecuzione → confronto con soluzione di riferimento.

| paper | cosa fa | benchmark | accuratezza | failure mode documentati | codice/licenza |
|---|---|---|---|---|---|
| **Liu et al., arXiv 2507.02938** (27/06/2025; accettato *Structure and Infrastructure Engineering* 02/2026, DOI 10.1080/15732479.2026.2630123) | agente Llama-3.3-70B + CoT + few-shot → OpenSeesPy, travi | **8 problemi di trave**, soluzione analitica, **500 run** per caso, carichi spostati a passi di 1 m | agente **>99,0%**; LLM nudo 87,1% (appoggiata + concentrato), 93,6% (distribuito), 75,8/73,1% (combinati), **<10%** su sbalzi con carico in aggetto | «hallucinates an additional roller support» all'estremo libero; estende il carico distribuito (0-2 m invece di 1-2 m). Ablazione: senza esempio completo → **0%**; senza esempi d'uso funzioni → 2,6-62,3% | paper CC BY 4.0; **codice [NON TROVATO]** [V] |
| **Geng et al., arXiv 2603.07728** (08/03/2026) | multi-agente (planning / nodi+elementi / carichi / traduttore), GPT-OSS-120B + Llama-3.3-70B → OpenSeesPy, telai 2D | **20 telai × 10 trial** | 100% su 18 casi, 90% su 2; baseline sequenziale 80% (60% sui complessi); **Gemini 2.5 Pro 37%, GPT-4o 0%** | GPT: allucina in mapping/traduzione; Llama: in reasoning; Qwen: entrambi | demo `civilbot.netlify.app`; codice «upon reasonable request» [V] |
| **Geng et al., arXiv 2604.09866** (10/04/2026) | JSON intermedio unificato → script ETABS / SAP2000 / OpenSees | 20 telai × 10 trial | OpenSees **98%**, SAP2000 100%, ETABS 99% | OpenSees: «duplicate node definitions, undefined or missing elements, incompatible variable formats» | «upon reasonable request» [V] |
| **Geng et al., arXiv 2606.06525** (02/06/2026) | telai 3D irregolari → **SAP2000** (non OpenSees) | **10 telai 3D** | ~90% medio | non dettagliati | CC BY 4.0, codice [NON TROVATO] [V] |
| **MASSE, Liang et al., arXiv 2510.11004** (13/10/2025) | multi-agente AutoGen, GPT-4o (Claude opzionale): interpreta norma, calcola carichi, verifica capacità | non quantificato in abstract | «da ~2 h a minuti» | non documentati | GitHub `DelosLiang/masse`, 10 stelle; disclaimer «solely for academic research»; licenza **[NON TROVATO]** (LICENSE 404) [V] |

Benchmark fuori-OpenSees, utili per dimensionare l'errore:

- **FEM-Bench (arXiv 2512.20732)**: 33 task di meccanica computazionale; Gemini 3 Pro risolve 30/33 almeno una volta ma **26/33 su tutti e 5 i tentativi**; miglior joint success (GPT-5) 73,8% [V].
- **SoM-1K (arXiv 2509.21079, rev. 01/08/2026)**: 1.065 problemi di scienza delle costruzioni con diagrammi; **miglior modello 56,6%**; VLM su immagine peggio di LLM su descrizione testuale del diagramma → «visual misinterpretation» è il failure mode primario [V].
- **ALL-FEM (arXiv 2603.21011)**: FEniCS, corpus 1000+ script verificati, fine-tuned GPT-OSS-120B **71,79%** su 39 benchmark; licenza CC BY-NC-SA [V].
- **VFEAgent (arXiv 2605.28978)**: VLM legge blueprint → Abaqus; **nessun numero** in abstract [V]. **FeaGPT (2510.21993)**: CalculiX, turbomacchine, nessuna metrica di accuratezza [V].

Repo:

| repo | cosa | stato | licenza |
|---|---|---|---|
| `viktor-platform/opensees-ai-agent` | chat → OpenSeesPy, piattaforme in acciaio; OpenAI + Instructor (structured outputs) | 12 stelle, **1 commit** | README avverte: OpenSeesPy libero solo per ricerca/interno, redistribuzione commerciale richiede licenza UC Berkeley [V] |
| `BentleySystems/openstaad-mcp` | MCP ufficiale per STAAD.Pro: tool `discover_api`, `read_skills`, `list_instances`, `execute_code` (Python validato via AST, sandbox), `get_status`; tutto locale, no telemetria | 41 stelle, doc agg. 30/07/2026 | **MIT** [V] |
| MCP per OpenSees | — | `opensees-mcp` su PyPI **404** [M]; GitHub: nessun risultato [NON TROVATO] | — |

**Lettura [INF]:** i numeri >90% valgono su problemi da libro (travi, telai regolari, 8-20 casi, condizioni al contorno esplicite). Nessun paper misura: edifici reali, sezioni in c.a. con armature, unità miste, spettro NTC. L'ablazione di 2507.02938 (0% senza esempio completo) dice che il risultato è **few-shot engineering**, non comprensione: fuori dal template l'accuratezza crolla.

## 2. Intelligenza senza LLM — censimento

### 2.1 Controllo automatico del modello

| controllo | precedente commerciale | come si fa in OpenSees/Python | fonte |
|---|---|---|---|
| nodi coincidenti / entro tolleranza | ETABS *Check Model*: «Joints/Joints within Tolerance», «Joints/Frames», «Joints/Shells», «Frame Overlaps», «Frame Intersections within Tolerance», «Shell Overlaps», parametro «Length Tolerance for Checks» | KD-tree su coordinate (scipy) | `docs.csiamerica.com/help-files/etabs/Menus/Analyze/Check_Model.htm` [V] |
| membrature che si incrociano senza nodo comune; membrature sovrapposte; nodi identici | RFEM 6 *Model Check*: «Identical Nodes», «Crossing or Not Connected Lines/Members», «Overlapping Lines/Members» | segment-segment distance, tolleranza | `dlubal.com/.../rfem-6/000437` [V] |
| nodi liberi (non attaccati a elementi) | opstool `find_void_nodes()` / `remove_void_nodes()` | già in libreria | `opstool.readthedocs.io/en/latest/src/api/pre.html` [V] |
| **meccanismi / labilità** | Karamba3D: «Values of zero or nearly zero indicate rigid body modes» dagli EigenModes; ETABS: «Structure is unstable or ill-conditioned» quando perdita ≥ **11 cifre** (fonte secondaria, KB CSI non aperta) | `eigen` → autovalori ~0 = moti rigidi; oppure `opstool.get_mck('K')` → rank/condizionamento | manuale Karamba §3.5.6 [V]; sheerforceeng.com [secondaria] |
| masse nulle / masse nodali | opstool `get_node_mass()` include masse da nodi **e** elementi | somma per direzione = 0 → errore prima di `eigen` | opstool [V] |
| **equilibrio globale** (reazioni = carichi applicati) | prassi; Circolare C10.2.1 chiede «schemi grafici con la rappresentazione delle azioni applicate e delle corrispondenti reazioni vincolari» | `reactions()` poi `nodeReaction()`; Σ reazioni vs Σ carichi per direzione | doc `reactions` [V]; Circolare r.20392-20393 [V] |
| unità incoerenti | opstool `UnitSystem(length, force, time)` | PRODUCT.md impone unità in un solo punto (r.125-126) | [V] |
| rigidezze anomale | [NON TROVATO] prodotto che lo faccia esplicito; ETABS lo cattura indirettamente con le cifre perse | rapporto max/min diagonale K; E fuori range per materiale dichiarato | [INF] |

### 2.2 Numero di modi automatico (≥ 90% massa, NTC §7.3.3.1)

- OpenSees ha già `modalProperties(-print, -file, -unorm, -return)`: calcola fattori di partecipazione, masse modali, **cumulate e rapporti percentuali**, per masse nodali e distribuite (HRZ per masse consistenti) [V]. `-return` dà un dict Python → il loop «aumenta modi finché cumulata ≥ 90% in ogni direzione traslazionale» è ~15 righe.
- **Misura interna già disponibile**: `modi-per-la-normativa.md` r.42-54 — su telaio C3D4 14.103 nodi: 20 modi → 87,46% verticale; 32 → 90,83%; 40 → 93,98%; costo 9,9 s vs 4,9 s (r.88) [V]. Insegnamento trasferibile (r.56-75): la curva è **a gradini**, quindi «primo N che supera 90%» sta sul bordo; regola robusta = fermarsi al primo pianerottolo con margine (es. ≥ 90% **e** ΔN modi successivi non cambiano di >0,5 punti) [INF, derivata dalla misura].
- Precedente commerciale con iterazione automatica dei modi: [NON TROVATO]. SAP2000/ETABS mostrano i rapporti ma l'utente sceglie N.

### 2.3 Combinazioni di carico NTC/EC automatiche

- Open source Python: **`norma-ntc`** (`rafse/norma-ntc`, MIT, 17 stelle, test pytest presenti, PyPI `norma-ntc`): `slu_combination`, `sle_characteristic/frequent/quasi_permanent`, `seismic_combination`, `exceptional_combination`, `combination_coefficients(category)`, `partial_safety_factors(load_type, favorable, approach)`; formule [2.5.1]-[2.5.7]; funzioni decorate `@ntc_ref(article, table, formula)` [V]. **Limite**: restituisce `float` — combina valori, non genera l'**insieme** di combinazioni per il solutore (permutazioni azione dominante, ±E, 30% ortogonale). Da verificare sul sorgente prima di adottarla [INF].
- Commerciali: CSI Italia *Combinator* (plugin SAP2000/ETABS, NTC 2018 + EC0), NextFEM «Genera combinazioni» (SLU/SLE/sismica 2-3 direzioni), Geostru Geoapp [V via pagine prodotto]. Il video Marco De Pisapia cita **606 combinazioni SLU** come ordine di grandezza per un caso reale [secondaria].

### 2.4 Verifica/suggerimento sezioni e armature

- Librerie censite in `ricerca-armature-librerie-python.md:65-75`: `structuralcodes` (Apache-2.0, EC2/MC2010, barre come punti), `concreteproperties` (MIT, dominio M-N), `sectionproperties` (MIT) [V]. Verifica = deterministica; «suggerimento» = ricerca su catalogo discreto (b, h, φ, n) con vincolo domini → ottimizzazione combinatoria piccola, no LLM [INF].

### 2.5 Convergenza automatica

- OpenSees nativo: `analysis Transient -numSubLevels $x -numSubSteps $y` suddivide automaticamente il passo su fallimento; `VariableTransient` con `analyze N dt dtMin dtMax Jd` adatta il passo alle iterazioni; `analyze` ritorna 0 = ok, <0 = fallito [V].
- **SmartAnalyze** (`Hanlin-Dong/SmartAnalyze`, **MIT**, 26 stelle, Tcl + Python): su fallimento aumenta iterazioni se norma vicina, poi cambia algoritmo (`tryAlterAlgoTypes`), poi suddivide il passo [V]. **opstool lo ha già incorporato**: `opstool.anlys._smart_analyze` [V via URL sorgente].
- Pattern nudo dai forum OpenSees: loop `while` su return code, `Newton` → `Newton -initial` → `KrylovNewton`, dt/2 [V, community].

### 2.6 Risultati sospetti

Nessun prodotto commerciale trovato con «detector» esplicito [NON TROVATO]. Regole deterministiche componibili [INF]: (a) squilibrio reazioni/carichi > tolleranza; (b) spostamento/altezza > soglia SLD; (c) T1 fuori dall'intervallo della formula NTC §7.3.3.2 (T1 = C1·H^¾) di un fattore >2; (d) sforzo normale colonne ≠ peso tributario ±20%; (e) cifre perse (condizionamento K). Tutte hanno oracolo numerico → testabili.

### 2.7 Ottimizzazione parametrica

Dlubal RFEM 6 add-on «Optimization & Costs / CO₂» [V pagina prodotto]; Bentley: «AI narrows the search space… while the software still performs the authoritative simulation» [V AEC Mag]. Con OpenSeesPy = sweep su griglia + Pareto; precedente interno: motore di sweep di MeshRec (`PRODUCT.md:116-117`) [V].

## 3. AI nei prodotti CAE/CAD — rilasciato davvero

| vendor | rilasciato | natura | fonte |
|---|---|---|---|
| **Dlubal RFEM 6** | **MCP server** incluso in 6.13.0002 (19/01/2026): crea/modifica geometria, definisce casi di carico, lancia calcolo, legge risultati — «everything that is possible via the API»; nessuna validazione descritta | agentic, esecuzione | KB 002032 [V] |
| Dlubal | **Mia**: chatbot su documentazione, ChatGPT-4, dal 13/03/2024 | Q&A doc | feature 002793 [V] |
| **Bentley STAAD.Pro** | `openstaad-mcp` ufficiale MIT (GitHub, doc 30/07/2026); Copilot in 2025.00.01 = **early access, Q&A su documentazione**; AI Transparency Card pubblicata | MCP esecuzione + Q&A doc | GitHub [V]; readme 2025.00.01 [V via ricerca] |
| **Autodesk Revit 2027** (07/04/2026) | Autodesk Assistant **Tech Preview** (22/04/2026): query modello, viste/abachi, editing parametri, guida; analytical model «structurally aware» è rule-based | assistente, no analisi | AEC Tech Drop [V via ricerca; pagina 403] |
| **Onshape** (PTC) | AI Advisor in-app, Bedrock; **«It can't see your model. It can't read your feature tree»** — critica utente | Q&A doc, FeatureScript autocomplete | PTC news 2025; TexoCAD [V] |
| **Ansys 2026 R1** (11/03/2026) | SimAI Pro (surrogati su GPU locale), Engineering Copilot in medini/ModelCenter/Rocky | surrogati ML + Q&A | press Synopsys [V via ricerca; pagina 403] |
| **Altair HyperWorks 2026** | PhysicsAI: predizione campi da dati CAE storici | surrogati ML | engineering.com [secondaria] |
| **CSI SAP2000/ETABS** | **nessuna funzione AI nativa** dichiarata; enhancements 2025-2026 = Revit exchange, BucklingFEM | — | csiamerica.com [V] |
| Karamba3D / Speckle | nessuna AI nativa; Speckle Automate = CI/CD su modelli (validazione, report) | automazione | [V] |
| Shapr3D | Generative Render, chatbot help center | render, Q&A | [V] |
| Dassault | 3DEXPERIENCE/SIMULIA: nessun rilascio AI strutturale specifico trovato | — | [NON TROVATO] |

**Pattern che emerge [INF]:** in strutturale nessuno ha rilasciato «AI che calcola». Tre forme sole: (1) chatbot su documentazione; (2) **MCP/API** che lascia eseguire il solutore a un agente esterno (Dlubal, Bentley); (3) surrogati ML per esplorazione rapida (Ansys, Altair), con il solutore come autorità. Bentley esplicita: «AI must operate within the bounds of engineering logic… validated by design codes» [V].

## 4. Pattern d'integrazione affidabili e rischi

**Pattern con evidenza:**

1. **LLM = generatore di input, solutore = calcolatore.** È l'intera letteratura §1: il numero lo produce OpenSees, l'LLM scrive nodi/elementi/carichi. Riformulare come «code generation» porta Llama da <10% a >99% (2507.02938) [V].
2. **Rappresentazione intermedia strutturata + traduttore deterministico.** 2604.09866 usa JSON unificato → script per 3 solutori; gli errori restano in mapping/traduzione [V]. Con Claude: **structured outputs** garantiscono conformità allo schema via constrained decoding, ma la doc avverte: «does NOT guarantee semantic correctness… Always validate business logic separately»; **non supporta `minimum`/`maximum`/`multipleOf`** → i vincoli numerici vanno verificati fuori dal modello [V].
3. **Tool-use verso API del modellatore, non testo libero.** MCP (spec 2026-07-28, stdio locale o HTTP) [V]; precedenti Dlubal e Bentley. openstaad-mcp valida il codice con AST prima di eseguirlo [V] — pattern riusabile.
4. **Testo > immagine per i disegni.** SoM-1K: LLM con descrizione testuale batte VLM su immagine [V]. Da-disegno-a-modello resta il fronte più fragile.
5. **Verifica contro regole deterministiche (§2)**: ogni output LLM passa il *Check Model* prima di andare al solutore; il verdetto è del controllo, non del modello [INF, coerente con PRODUCT.md r.188-190].

**Rischi:**

- Allucinazioni geometriche documentate: vincolo aggiunto, carico esteso, nodi duplicati, elementi mancanti (§1) [V]. Sono errori **silenziosi**: il modello gira e converge.
- Instabilità fra trial: stesso problema, 10 run, 90-100% → serve ripetibilità o revisione umana su ogni generazione [V].
- Rate d'errore su numerica pura: FAITH riporta crollo da 95,6% a ~0% su calcoli multivariati [secondaria, Patsnap] — l'LLM non deve mai emettere il numero finale.

**Responsabilità professionale (fonti primarie):**

- **NTC 2018 §10.2**: «il progettista, dovrà controllare l'affidabilità dei codici utilizzati e verificare l'attendibilità dei risultati ottenuti»; la documentazione del software «dovrà contenere una esauriente descrizione delle basi teoriche e degli algoritmi impiegati, l'individuazione dei campi d'impiego, nonché **casi prova interamente risolti e commentati**, per i quali dovranno essere forniti i file di input necessari a riprodurre l'elaborazione» [V].
- **§10.2.1**: relazione deve riportare «titolo, autore, produttore, versione, estremi della licenza» del codice; «combinazioni di carico adottate… motivato l'impiego» [V].
- **§10.2.2 / C10.2.2**: valutazione indipendente con «programmi di calcolo diversi da quelli usati originariamente» [V].
- **Circolare 2019 C10.2.1 lett. b.3-b.4**: «esame preliminare, condotto dal progettista delle strutture, di valutazione dell'affidabilità e soprattutto dell'idoneità del programma nel caso specifico»; «esame della documentazione… sulle modalità e procedure seguite per la **validazione** del programma» [V].
- Conseguenza [INF]: un software con LLM dentro deve poter dimostrare che il numero **non dipende** dall'LLM (riproducibilità: stesso input → stesso deck → stesso risultato). Un deck generato da LLM e non riproducibile bit-a-bit viola la riproducibilità chiesta da §10.2.1. Serve: deck salvato come artefatto firmabile, LLM solo a monte, log della generazione.
- Odorizzi (Ingenio, 06/08/2026): «Never… can the user defer to software choices that are only theirs»; AI = «tools, not responsibilities» [V, opinione].

## 5. Claude come backend — solo fonti Anthropic

**Prezzi** (`platform.claude.com/docs/en/about-claude/pricing`, USD/MTok, letti 04/09/2026) [V]:

| modello | input | output | batch (−50%) | cache hit |
|---|---|---|---|---|
| Haiku 4.5 | 1 | 5 | 0,50 / 2,50 | 0,10 |
| Sonnet 5 | **2** | **10** (introduttivo reso definitivo; l'aumento a 3/15 del 01/09/2026 «will not occur») | 1 / 5 | 0,20 |
| Sonnet 4.6 | 3 | 15 | 1,50 / 7,50 | 0,30 |
| Opus 5 / 4.8 | 5 | 25 | 2,50 / 12,50 | 0,50 |
| Fable 5.1 | 10 | 50 | 5 / 25 | 0,25 |

Note: modelli ≥ 4.7 hanno tokenizer che produce ~30% token in più a parità di testo [V]; tool use aggiunge 354-474 token di system prompt su Sonnet 5 [V]; contesto 1M a prezzo standard su ≥ 4.6 [V]. Costo di una chiamata «genera modello»: 6k token in + 2k out su Sonnet 5 = 0,012 + 0,020 = **~0,03 $**; 100 chiamate/giorno ≈ 1 $/giorno [INF, aritmetica sui prezzi sopra].

**Vincoli d'uso** [V]:

- **Offline: non esiste.** Pesi non distribuiti; nessuna opzione on-prem/air-gapped nella doc Anthropic. Le uniche vie: API diretta, Claude Platform on AWS, Bedrock, Vertex, Microsoft Foundry. [Doc Anthropic non contiene l'opzione; conferma negativa da fonti secondarie] → app locale deve funzionare **senza** LLM, con LLM come accessorio online.
- Dati: commerciale/API → **non usati per training** di default; retention **30 giorni** poi cancellati; **ZDR** su richiesta commerciale, per organizzazione; ZDR **non** copre Batch, Files API, code execution, MCP connector; **Fable 5.x e Mythos 5.x richiedono 30 gg retention** e non sono ZDR; T&S può trattenere fino a 2 anni [V].
- Structured outputs: vedi §4 punto 2 [V].
- Rate limit a tier; sconti accademici «may be available» [V].

---

## Lista ordinata di candidate funzioni intelligenti

Ordine = valore per l'ingegnere che verifica a NTC 2018 × verificabilità ÷ effort. Effort **[INF]**: S ≈ giorni, M ≈ 1-2 settimane, L ≈ >1 mese.

| # | funzione | valore utente | fattibilità | verificabilità (il controllo che la smentisce) | precedente | effort |
|---|---|---|---|---|---|---|
| **C1** | **Check Model deterministico** pre-solutore: nodi coincidenti/entro tolleranza, membrature incrociate senza nodo, sovrapposte, nodi liberi, massa nulla per direzione, moti rigidi (autovalori ~0), unità dichiarate | evita l'errore più comune e più silenzioso; Circolare b.3 chiede idoneità al caso | alta: scipy KD-tree + `eigen` + opstool | test unitari con modelli-trappola (un nodo staccato, una cerniera di troppo); ogni check ha oracolo booleano | ETABS Check Model, RFEM Model Check, Karamba EigenModes [V] | **M** |
| **C2** | **Modi automatici fino a ≥ 90% massa** con margine di pianerottolo, verdetto per direzione | obbligo §7.3.3.1; oggi l'utente indovina N | alta: `modalProperties('-return')` | riporta la cumulata **misurata** per ogni direzione, non l'N scelto; test: telaio con verticale in ritardo (caso già misurato) | **misura interna** `modi-per-la-normativa.md` [V] | **S** |
| **C3** | **Equilibrio globale e sanity check** post-solutore: Σreazioni vs Σcarichi, drift, T1 vs formula NTC, N colonne vs peso tributario, condizionamento | Circolare chiede azioni + reazioni; intercetta risultati «ordini di grandezza sbagliati» | alta: `reactions()` + regole | ogni regola è una disuguaglianza numerica con soglia dichiarata; test con carico non trasmesso | ETABS «lost digits ≥ 11» [secondaria] | **S-M** |
| **C4** | **Generatore combinazioni NTC/EC** (SLU, SLE ×3, sismica ±E, 30% ortogonale, eccezionale), con γ/ψ tracciati per riferimento di norma | 100-600 combinazioni a mano = impossibile; §10.2.1 chiede di motivarle | alta | conteggio atteso deterministico; confronto con Combinator/NextFEM su un caso; ogni coefficiente cita tabella NTC | `norma-ntc` MIT (da verificare se genera l'insieme) [V] | **M** |
| **C5** | **Convergenza adattiva** pushover/transient: sub-step nativo + SmartAnalyze via opstool; log di ogni switch | analisi non lineari NTC §7.3.4 senza babysitting | alta: già in libreria | il log dichiara dove ha cambiato algoritmo; risultato deve coincidere con run a passo fisso fine (test di regressione) | SmartAnalyze MIT, OpenSees `-numSubLevels` [V] | **S** |
| **C6** | **Relazione di calcolo §10.2.1-conforme** auto-generata: tipo analisi, codice+versione+licenza, combinazioni, materiali, verifiche, azioni/reazioni, provenienza (config hash, commit) | obbligo di legge; oggi copia-incolla | alta: template da dati strutturati | ogni numero nel report punta all'artefatto che lo produce (principio 4 di PRODUCT.md) | MeshRec registro corse [V] | **M** |
| **C7** | **Verifica sezioni c.a. + suggerimento armatura** da catalogo discreto | chiude il ciclo analisi→verifica | media: `structuralcodes`/`concreteproperties` | dominio M-N calcolato da libreria terza, confronto con caso prova a mano | censimento interno [V] | **M-L** |
| **C8** | **LLM → modello via JSON intermedio + C1** («descrivi il telaio», «aggiungi carico neve cat. …»): Claude con structured outputs produce solo lo schema; traduttore deterministico → OpenSeesPy; C1 obbligatorio prima del solve; diff visuale da approvare | avvio rapido, editing in linguaggio naturale | media: pattern provato in letteratura al 90-99% su telai regolari | (a) mai un numero dall'LLM; (b) C1+C3 passano; (c) deck salvato e riproducibile senza LLM; (d) test set stile 2603.07728 (20 telai × 10 run) con accuratezza misurata **e pubblicata** | 2507.02938, 2603.07728, Dlubal MCP [V] | **L** |
| **C9** | **Spiegazione dei risultati** con dati strutturati (LLM riceve tabella verdetti C2/C3/C7 e produce prosa; ogni frase cita l'id del dato) | utente successivo che non conosce la pipeline (PRODUCT.md principio 5) | alta | prosa verificabile riga per riga contro la tabella; un test: frase senza riferimento = errore | Onshape/Bentley Copilot (solo doc) [V] | **S-M** |
| **C10** | **MCP server del modellatore** (tool: crea nodo/elemento, carico, run, leggi verdetti) — espone C1-C5 a qualunque agente esterno | interoperabilità; il numero resta nel solutore | alta: SDK MCP; sandbox AST come openstaad-mcp | ogni tool ritorna anche il verdetto C1/C3; nessun tool «calcola» | openstaad-mcp MIT, RFEM 6.13 [V] | **M** |
| **C11** | **Da disegno (immagine/PDF) a modello** via VLM | alto in teoria | **bassa**: SoM-1K 56,6% best, «visual misinterpretation» [V]; VFEAgent senza numeri | difficile; solo con C1+revisione umana su ogni elemento | VFEAgent [V] | **L**, sconsigliata ora |
| **C12** | Ottimizzazione parametrica (sweep + Pareto) | secondaria per verifica NTC | alta | ogni punto = corsa riproducibile | MeshRec sweep [V] | **M** |

**Vincolo trasversale trovato, non nel brief:** OpenSeesPy «free for research, education, and internal use. Commercial redistribution… such as… an application or cloud-based service that uses import openseespy, requires a license» (`openseespydoc.readthedocs.io`, front page) [V]. Se il prodotto va distribuito, serve licenza UC Berkeley o uso del binario OpenSees Tcl (licenza da verificare: GitHub `LICENSE` 404 in sessione) [NON TROVATO].

## Domande aperte per il brainstorming

1. Distribuzione: interno/ricerca (OpenSeesPy ok) o prodotto distribuito (licenza Berkeley)?
2. LLM opzionale e online, o requisito? Offline non esiste (§5) → l'app deve essere completa senza C8/C9.
3. Dati cliente: basta retention 30 gg + no-training, o serve ZDR (contratto commerciale, per organizzazione)?
4. Chi firma? Se il progettista è l'utente, il report C6 deve dichiarare cosa ha generato l'LLM e cosa no — formato?
5. `norma-ntc` genera l'insieme di combinazioni o solo il valore combinato? Da leggere il sorgente prima di adottarla.
6. Target: telai 1D (dove la letteratura è al 90-99%) o anche solidi/shell (dove non c'è alcun benchmark)?
7. Soglia di margine per C2: replicare la regola «pianerottolo largo» misurata su un solo caso, o rimisurare su telai 1D?

## Raccomandazioni (non decisioni)

- **Raccomandazione 1**: costruire prima C1-C6 (tutto deterministico, tutto con oracolo). Sono anche il prerequisito che rende C8 verificabile: senza Check Model e equilibrio, l'LLM non ha un giudice.
- **Raccomandazione 2**: se LLM, adottare il pattern JSON-intermedio + traduttore deterministico + structured outputs, e **misurare** su un benchmark proprio (≥ 20 casi × 10 run) prima di esporlo — pubblicare il numero nel report, come fa `modi-per-la-normativa.md`.
- **Raccomandazione 3**: esporre il modellatore come MCP (C10) invece di incorporare l'agente: separa il numero (solutore, locale, riproducibile) dall'intelligenza (esterna, sostituibile, opzionale). È la forma che Dlubal e Bentley hanno scelto.
- **Raccomandazione 4**: rinviare C11 (disegno → modello) finché un benchmark supera ~90% su disegni strutturali; oggi il best è 56,6%.
- **Raccomandazione 5**: trattare la licenza OpenSeesPy come decisione di prodotto da chiudere prima del codice.

## Fonti

- NTC 2018 cap. 10: https://www.studiopetrillo.com/files/ntc2018/cap10.pdf · Circolare 7/2019: https://www.sttan.it/norme/NTC2018/NTC2018_Circ_21_01_2019_n7-CS_LL_PP.pdf
- arXiv: https://arxiv.org/abs/2507.02938 · https://arxiv.org/html/2603.07728v1 · https://arxiv.org/html/2604.09866v1 · https://arxiv.org/abs/2606.06525 · https://arxiv.org/abs/2510.11004 · https://arxiv.org/abs/2512.20732 · https://arxiv.org/abs/2509.21079 · https://arxiv.org/abs/2603.21011 · https://arxiv.org/abs/2605.28978 · https://arxiv.org/abs/2510.21993 · DOI 10.1080/15732479.2026.2630123
- GitHub: https://github.com/viktor-platform/opensees-ai-agent · https://github.com/bentleysystems/openstaad-mcp · https://github.com/Hanlin-Dong/SmartAnalyze · https://github.com/DelosLiang/masse · https://github.com/rafse/norma-ntc · https://rafse.github.io/norma-ntc/actions/combinations/
- OpenSees/opstool: https://openseespydoc.readthedocs.io/en/latest/ · https://openseespydoc.readthedocs.io/en/latest/src/modalProperties.html · https://openseespydoc.readthedocs.io/en/latest/src/reactions.html · https://opensees.github.io/OpenSeesDocumentation/user/manual/analysis/analyze.html · https://opensees.github.io/OpenSeesDocumentation/user/manual/analysis/analysis.html · https://opstool.readthedocs.io/en/latest/src/api/pre.html · https://pypi.org/pypi/openseespy/json
- Prodotti: https://docs.csiamerica.com/help-files/etabs/Menus/Analyze/Check_Model.htm · https://www.dlubal.com/en/downloads-and-information/documents/online-manuals/rfem-6/000437 · https://www.dlubal.com/en/support-and-learning/support/knowledge-base/002032 · https://www.dlubal.com/en/support-and-learning/support/product-features/002793 · https://manual.karamba3d.com/3-in-depth-component-reference/3.5-algorithms/3.5.6-eigen-modes · https://aecmag.com/ai/bentley-systems-shapes-its-ai-future/ · https://docs.bentley.com/LiveContent/web/STAAD.Pro-v2025.0.1/ReadMe/en/topics/ReadMe/c-stpst_Revision_History_250001.html · https://www.autodesk.com/blogs/aec/2026/04/22/autodesk-assistant-in-revit-tech-preview/ · https://www.ptc.com/en/news/2025/ptc-announces-latest-onshape-ai-advisor-release · https://blog.texocad.ai/posts/onshape-ai-advisor · https://news.synopsys.com/2026-03-11-Synopsys-Launches-Ansys-2026-R1-to-Re-Engineer-Engineering-with-Joint-Solutions-and-AI-Powered-Products · https://www.csiamerica.com/products/sap2000/enhancements · https://www.csi-italia.eu/software/combinator/ · https://www.nextfem.it/webManuals/it/00000026.htm · https://sheerforceeng.com/2021/12/17/structure-is-unstable-or-ill-conditioned-etabs-warning-fix/ · https://www.ingenio-web.it/articoli/modellazione-strutturale-maturita-tecnica-responsabilita-progettista/
- Anthropic: https://platform.claude.com/docs/en/about-claude/pricing · https://platform.claude.com/docs/en/manage-claude/api-and-data-retention · https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data · https://privacy.claude.com/en/articles/7996868-is-my-data-used-for-model-training · https://platform.claude.com/docs/en/build-with-claude/structured-outputs · https://modelcontextprotocol.io/

Staleness: prezzi Claude e stato Tech Preview Autodesk/Bentley cambiano per trimestre; letteratura §1 è tutta 2025-2026, benchmark piccoli (8-20 casi): numeri da rileggere se il progetto parte fra >3 mesi.
