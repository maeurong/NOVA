# Ricerca: dominio — analisi, verifiche NTC 2018/EC8, ingresso/uscita del modello, caso studio

Ricerca del 04/09/2026, condotta da un `researcher` dispacciato in parallelo con altri sei. Domanda posta: quali analisi e verifiche un modellatore per telai in c.a. a NTC 2018 deve offrire, come entra ed esce un modello, cosa serve al caso studio della tesi.

Provenienza: repo `/Users/mario/GitHub/Tesi`, branch `feat/il-numero-di-prima`, HEAD `782f507`. Norme lette da PDF scaricati in scratchpad ed estratti con `pdftotext` (NTC 2018 cap. 3/4/7/10 da studiopetrillo.com, Circolare cap. 7, EN 1998-1:2004). `Norme/markdown/` citato dalle ricerche in casa **non esiste su questa macchina** [M]. `meshrec/runs/` vuota qui [M]: i numeri delle corse vengono dai doc, non rimisurati.

**Skill-gate.** `tech-stack-evaluator` invocata; script `ecosystem_analyzer.py`/`stack_comparator.py` non producono output su pacchetti Python (orientati npm) [M]. Metriche ecosistema raccolte a mano via API PyPI/GitHub il 04/09/2026 [M]. `caveman:caveman` invocata.

Tag: **[V]** verificato su fonte primaria · **[M]** misurato in sessione · **[INF]** inferenza · **[NON TROVATO]**.

## Premesse del brief ricontrollate

| premessa | esito |
|---|---|
| `abaqus.py:1` «Scrittura del deck Abaqus (.inp), compatibile anche con CalculiX» | vera [V] |
| `core/wall.py` prior geometrico, membrature prismatiche | vera; ha anche `giunzioni()` e `nodo_di_giunzione()` (`wall.py:988`, `:838`) — connettività già misurata [V] |
| modale «massa partecipante ≥ 90%» come criterio NTC | **falsa a metà**: NTC 2018 §7.3.3.1 chiede **85%** totale + tutti i modi >5%; EN 1998-1 §4.3.3.3.1(3) chiede **90%** + modi >5%. `modi-per-la-normativa.md:9-10` dice «NTC §7.3.3.1 riporta lo stesso criterio» → errato. Marginale, corretto qui |
| «ricerca fibre ne conta sedici» | vera (`ricerca-armature-opensees-fibre.md:959`) [V] |
| nessuna validazione Abaqus | vera (`PRODUCT.md:180`, `fase-5-analisi.md:672`) [V] |
| **non detto nel brief, cambia il quadro** | a `4386c22^` esistevano e sono stati cancellati il 02/09/2026: `core/opensees.py` (1037 righe: scrittura `.tcl`, sezioni a fibre, passo statico+modale, lettori uscite), `core/telaio.py` (452: telaio da prior + giunzioni, nodo condiviso, lunghezza nodo-nodo), `core/armatura.py` (308: collocazione barre + verdetti minimi NTC), `core/combinazioni.py` (530: ψ/γ Tab. 2.5.I/2.6.I, sei combinazioni, statica equivalente §7.3.3.2) [V]. Strada (b) del punto 3 **già prototipata**, recuperabile con `git show 4386c22^:meshrec/src/meshrec/core/<file>`. `core/materiali.py` (catalogo classi NTC con fonte/origine) **resta in albero** [V]. Dettaglio completo in `05-archeologia-linea-integrata.md` |

---

## 1. Catalogo delle analisi

| analisi | norma | OpenSees nativo | da fare nel nuovo software |
|---|---|---|---|
| statica lineare | NTC §2.5.3 combinazioni [2.5.1]–[2.5.4]; §4.1.1 | `analysis Static`, `LoadControl`, `algorithm Linear` [V] | combinazioni di carico: **non native**; un `pattern` per azione, poi sovrapposizione lineare o un `loadConst`+pattern per combinazione. Il vecchio `combinazioni.py` le proponeva già |
| modale | NTC §7.3.3.1 (85%, modi >5%); EC8 §4.3.3.3.1(3) (90%, >5%); EC8 (4.13)-(4.14) `k ≥ 3√n`, `T_k ≤ 0,20 s` se non si raggiunge | `eigen`, `modalProperties` → MPF, masse partecipanti, cumulate, `-return` dict [V] | controllo soglia 85/90 % per direzione; già misurato in casa: 40 modi sul telaio tet (`modi-per-la-normativa.md`) |
| spettro di risposta + CQC + 30% | NTC §7.3.3.1 [7.3.4] CQC, [7.3.5a/b] ρ_ij; §7.3.5 [7.3.10] `1,00 Ex + 0,30 Ey + 0,30 Ez` permutata; EC8 §4.3.3.3.2 (4.15)-(4.16) SRSS se `T_j ≤ 0,9 T_i`, altrimenti CQC; §4.3.3.5 (4.19)-(4.22) | `responseSpectrumAnalysis(direction, '-Tn', Tn, '-Sa', Sa)` calcola **solo gli spostamenti modali**, un modo per volta, una direzione per chiamata; verbatim: «The modal combination of these modal displacements (and derived results such as beam forces) is up to the user»; richiede `eigen` + `modalProperties` prima [V] https://openseespydoc.readthedocs.io/en/latest/src/responseSpectrumAnalysis.html | **CQC/SRSS e regola 30% in post-processing**, sui risultati modali registrati (forze elemento per modo). Spettro NTC [3.2.2]-[3.2.7] (ag, F0, TC*, S=SS·ST, η, TB=TC/3, TD=4ag/g+1,6) e di progetto §3.2.3.5 (η→1/q, `Sd ≥ 0,2ag`) da calcolare in casa; parametri di sito da tabella INGV/allegati (non letti) |
| statica lineare con q | NTC §7.3.1 [7.3.1] `q_lim = q0·KR` (KR 1 / 0,8), Tab. 7.3.II (telaio c.a. CD"A" 4,5 αu/α1, CD"B" 3,0 αu/α1), [7.3.2] `q_ND`; statica equivalente §7.3.3.2 [7.3.6]-[7.3.7]; spostamenti §7.3.3.3 [7.3.8]-[7.3.9] `μ_d ≤ 5q−4`, SLC = 1,25·SLV | nulla | tutto in post: q, spettro ridotto, forze di piano, μ_d. Vecchio `combinazioni.py` aveva `periodo_fondamentale`, `forza_di_base`, `forze_di_piano` |
| P-Δ | NTC §7.3.1 [7.3.3] `θ = P·dEr/(V·h)`; <0,1 trascura; 0,1–0,2 ×1/(1−θ); 0,2–0,3 non lineare; mai >0,3. EC8 §4.4.2.2(2)-(4) (4.28) identico | `geomTransf PDelta` / `Corotational` [V] | calcolo θ per piano in post (P, V, dr, h); su un telaio monopiano un solo θ |
| pushover | NTC §7.3.4.2: ≥2 distribuzioni (Gruppo 1: modale/statica se massa 1° modo ≥75%, o forze di piano da modale ≥85%, obbligatoria se `T1 > 1,3 TC`; Gruppo 2: uniforme/adattiva/multimodale ≥6 modi), ± verso, punto di controllo = CM ultimo livello. Circolare C7.3.4.2: sistema SDOF equivalente [C7.3.3]-[C7.3.5] Γ, bilineare passante per 0,6·Fbu* e uguale area fino a caduta 0,15·Fbu*, `T*` [C7.3.6], domanda [C7.3.7]/[C7.3.8] (Metodo A = N2), Metodo B = spettro di capacità ADRS con ξ_eq [C7.3.10]. EC8 §4.3.3.4.2 + Annex B (B.2)-(B.11) | `integrator DisplacementControl(nodeTag, dof, incr, ...)` [V], sezioni a fibre, `forceBeamColumn` | curva di capacità → SDOF → bilineare → target displacement: **tutto in post**. Analisi non lineare NTC §7.3.4 usi elencati (spostamenti, duttilità SLC, αu/α1, esistenti) |
| dinamica non lineare | NTC §7.3.4.1 (obbligo confronto con modale a spettro sul taglio alla base); §7.3.5: ≥3 storie → valori più sfavorevoli, ≥7 → media; §3.2.3.6 coerenza spettrale: media ≥ −10% su 0,15 s ÷ max(2,0 s; 2T) (SLU), ≤ +30% per registrate | `pattern UniformExcitation(tag, dir, '-accel', tsTag, '-fact', f)` [V]; `integrator Newmark`; `modalDamping(factor)` dopo `eigen` [V]; Rayleigh | selezione/scaling accelerogrammi e controllo di coerenza spettrale: post; inviluppi/medie: post |
| regolarità | NTC §7.2.1 «Regolarità» criteri a)-c) pianta (rientranze ≤5%, lati <4, impalcato rigido), d)-g) altezza (massa ±25%, rigidezza −30%/+10%, C/D ±30%, rientri 10%/30%) [V]; EC8 §4.2.3.2-3 | nulla | automatizzabile a)-b), d), e) (massa) da geometria; c), e) rigidezza, f) richiedono analisi; su un monopiano quasi tutto banale |

Nota: NTC §7.3.2: modale con spettro è **il metodo lineare di riferimento**; statica solo se modi superiori irrilevanti + regolare in altezza + `T1 ≤ 2,5 TC` o `TD` (§7.3.3.2).

---

## 2. Catalogo delle verifiche

| verifica | articolo | ingressi da OpenSees | ingressi che il modello non ha |
|---|---|---|---|
| SLU flessione / pressoflessione | NTC §4.1.2.3.4.2 [4.1.18a] `M_Rd(N_Ed) ≥ M_Ed`; eccentricità min `e ≥ max(h/200, 20 mm)`; deviata [4.1.19] con α da Tab. (ν 0,1→1,0; 0,7→1,5; 1,0→2,0) | N, My, Mz per sezione | armature (As, posizione), fck, fyk, γc=1,5, γs=1,15, αcc=0,85 (`ricerca-ntc-2018…` §3) |
| SLU taglio | §4.1.2.3.5.1 [4.1.23] senza staffe (k, ρl ≤0,02, σcp ≤0,2fcd, vmin); §4.1.2.3.5.2 [4.1.25] `1 ≤ cotθ ≤ 2,5`, [4.1.27] VRsd, [4.1.28] VRcd (ν=0,5, αc), [4.1.29] min | V, N | Asw, s, α, bw, d |
| duttilità di curvatura | §4.1.2.3.4.2 μφ = φu/φ'yd; §7.4.4.1.2 [7.4.3] domanda; §7.3.6.1 DUT: 1,2× domanda locale SLV (lineare) o domanda SLC (non lineare); non dovuta se q ≤ 1,5 | momento-curvatura da fibre (`zeroLengthSection`) | confinamento (staffe), legami |
| gerarchia resistenze | §7.4.4.2.1 [7.4.4] `ΣMc,Rd ≥ γRd ΣMb,Rd` (γRd 1,30 CD"A"/CD"B", Tab. 7.2.I); taglio trave §7.4.4.1.1 (γRd 1,20/1,10), taglio pilastro [7.4.5] (1,30/1,10); ν_d ≤ 0,55/0,65 | N nei pilastri (combo sismica), V | Mb,Rd, Mc,Rd → armature |
| nodi | §7.4.4.3.1 [7.4.6]-[7.4.12] (γRd 1,20/1,10; αj 0,6/0,48) | Vc pilastro sopra il nodo | As1, As2, Ash, bj, hjc |
| SLE tensioni | §4.1.2.2.5 [4.1.15] `σc ≤ 0,60fck` (caratt.), [4.1.16] `0,45fck` (q.p.), [4.1.17] `σs ≤ 0,8fyk` | N, M per combo | armature, n omogeneizzazione |
| SLE fessurazione | §4.1.2.2.4 w1/w2/w3 = 0,2/0,3/0,4 mm, Tab. 4.1.IV, [4.1.14] `wk = 1,7 εsm·Δsm` (formule εsm, Δsm rimandate a «documenti di comprovata validità» → EC2 §7.3.4) | M per combo frequente/q.p. | armature, copriferro, φ, classe esposizione |
| SLE deformazione | §4.1.2.2.2: limiti «da documentazione di comprovata validità» (EC2 L/250) | frecce | nessuno (elastico) |
| drift di piano | §7.3.6.1 [7.3.11a/b] `q·dr ≤ 0,0050h` fragili / `0,0075h` duttili, [7.3.12] `≤ 0,0100h`; CU III/IV: 2/3; EC8 §4.4.3.2 (4.31)-(4.33) con ν | dr per piano | tipo tamponatura, CU |
| P-Δ θ | §7.3.1 [7.3.3] | P, V, dr, h | — |
| minimi armatura | §4.1.6.1.1 [4.1.45], §4.1.6.1.2 [4.1.46], §7.4.6.2.1/2 (già in `ricerca-ntc-2018…` §6) | — | armature |

Automatizzabili da sole sollecitazioni OpenSees: **drift, θ, SLE deformazione, regolarità di massa**. Tutto il resto pretende **armature + classe**, che né nuvola né deck contengono; per un edificio esistente entra §8.5.4 con fattori di confidenza FC (Tab. C8.5.IV, già in `ricerca-ntc-2018…` §12).

**Librerie Python, aggiornato al 04/09/2026** [M, PyPI/GitHub API]:

| pacchetto | versione | rilascio | stelle / issue / push | licenza | serve a |
|---|---|---|---|---|---|
| `structuralcodes` (fib) | 0.7.1 | 10/06/2026 | 295 / 95 / 31/08/2026 | Apache-2.0 | EC2 2004+2023, MC2010/2020, sezioni, domini N-M, M-χ, `FiberIntegrator.triangulate` |
| `concreteproperties` | 0.8.0 | 06/07/2026 | 241 / 14 / 06/07/2026 | MIT | M-χ, domini biassiali, fessurazione; AS/NZS, nessun EC |
| `sectionproperties` | 3.10.2 | 24/01/2026 | 552 / — | MIT | proprietà geometriche, J, ingobbamento |
| `opstool` | 1.0.26 | 11/01/2026 | (repo 404 su API) | — | pre/post OpenSeesPy: gmsh→ops, fibre, xarray, Tcl→Py, smart analyze, M-χ, buckling; spettro di risposta documentato [V] https://opstool.readthedocs.io/ |
| `opsvis` | 1.3.7 | 30/03/2026 | 57 / 17 | GPL-3.0 | plot + `fib_sec_list_to_cmds` |
| `openseespy` | 3.8.0.0 | 18/03/2026 | — | — | solutore; ruote win_amd64/macOS arm64/linux (`ricerca-opensees…` §4.4) |
| `PyNiteFEA` | 3.0.0 | 01/06/2026 | 737 / 22 / 01/09/2026 | MIT | telaio elastico puro Python; no c.a. |
| `anastruct` | 1.7.0 | 06/06/2026 | 463 | GPL-3.0 (PyPI) / LGPL (repo) | telaio 2D; no c.a. |
| `compas_fea2` | 0.2.1 | 15/05/2024 | — | MIT | **fermo da 16 mesi** |
| `ifcopenshell` | 0.8.5 | 13/04/2026 | 2751 / 1994 | LGPL-3.0 | IFC |

Nessuna libreria PyPI implementa **NTC 2018** (ricerca web: solo app web/desktop italiane) [NON TROVATO]. `ricerca-armature-librerie-python.md` §6.1 (28/08/2026) resta valida: `structuralcodes` unica con Eurocodice e provenienza normativa; versioni **immutate** da allora salvo push repo. Le verifiche NTC (γ, formule taglio [4.1.23]/[4.1.28], nodi, gerarchia) vanno scritte in casa; `structuralcodes` copre M-N e M-χ con EC2 (formalmente ≈ NTC per flessione: stesse ipotesi §4.1.2.3.4.1).

---

## 3. Ingresso del modello: tre strade

**(a) importare il `.inp` di MeshRec (solido).** Fattibile: OpenSees non ha lettore di deck [V, `ricerca-opensees…` §4.3]; `meshio` (MIT) legge Abaqus `.inp` [V] https://github.com/nschloe/meshio → ciclo `node()`/`element()`. Cosa si perde/costa (tutto già misurato in `ricerca-opensees-e-armature.md` §1): `TenNodeTetrahedron` non documentato, permutazione nodi 9-10 diversa da Abaqus, **`eleResponse 'stresses'` abortisce** (`malloc(): unaligned tcache chunk`), `PVDRecorder` non lo scrive; `FourNodeTetrahedron` 37× più rigido su elemento singolo. Restano spostamenti, reazioni, frequenze. Zero verifiche di norma possibili (nessuna sollecitazione di sezione, nessuna armatura). Vale solo come **verifica incrociata di codice** (livello 5 del `README.md` validazione), e costa meno sugli esaedri di `hexa.py`.

**(b) prior geometrico → telaio a fibre.** I 16 dati mancanti (`ricerca-armature-opensees-fibre.md` §6): 4 ricavabili (e1/e2, vecxz, area dal contorno, nodi), 8 fuori nuvola (n. barre, φ, posizioni, copriferro, staffe, classe cls, acciaio, GJ), 3 da connettività (nodi condivisi, lunghezza nodo-nodo, vincoli), 1 discretizzazione. **Stato reale a `4386c22^`**: `wall.giunzioni` misura gli incontri (in albero), `telaio.py` faceva nodi condivisi + lunghezza nodo-nodo + una fetta/un'asta, `armatura.colloca` posava le barre da `ArmaturaConfig`, `opensees.scrivi_tcl` scriveva fibre/`forceBeamColumn`/5 punti Lobatto/patch 10×10/peso proprio/modale. Restano davvero da fuori: armature (tavola `MURO 1`, non versionata), classe, vincoli (lettura). Prezzo dichiarato: la sezione a fibre è costante per asta, butta `sezione_dispersione` e `rigonfiamento` (§6.5) — ma `telaio.py` con «una fetta, un'asta» lo mitigava.

**(c) manuale da zero nella UI.** Strumento generale; nessun legame con la tesi.

Convivenza: sì, se il **modello dati interno** è un telaio (nodi, aste, sezioni, armature, vincoli, azioni) e (a)/(b) sono importatori. (b) è «completamento della tesi» (scan → telaio a fibre → analisi/verifiche: livello di prova nuovo, non in `README.md` §1); (a) è verifica incrociata del deck; (c) generalità. [INF]

---

## 4. Formati di scambio (2026)

| formato | cos'è | stato/supporto | vale? |
|---|---|---|---|
| **SAF** 2.2.0 | schema Excel `.xlsx` aperto (Nemetschek/SCIA): materiali, sezioni, nodi, `StructuralCurveMember`, `StructuralSurfaceMember`, supporti, carichi, casi, combinazioni, **risultati** `ResultInternalForce1D` (N Vy Vz Mx My Mz per sezione, per caso o combinazione, «Combination key») [V] https://www.saf.guide/ | import+export: SCIA, RISA, Allplan, AxisVM, SOFiSTiK, Dlubal, IDEA StatiCa, MasterSap, ProtaStructure; import: FRILO, Archicad, FEM-Design, ConSteel, NextFEM [V] https://www.saf.guide/en/stable/getting-started/who-supports-saf.html; repo doc ultimo push 13/04/2023 [M] | **sì, lettura e scrittura**: unico formato analitico aperto con risultati e combinazioni; MasterSap italiano lo supporta. Armature: non parte del core [NON TROVATO] |
| IFC 4.3 `IfcStructuralAnalysisModel` | gruppo di `IfcStructuralMember`/`Connection`, `LoadedBy` (load groups), `HasResults` (`IfcStructuralResultGroup`) [V] https://ifc43-docs.standards.buildingsmart.org/IFC/RELEASE/IFC4x3/HTML/lexical/IfcStructuralAnalysisModel.htm | MVD «Structural Design to Structural Analysis» era IFC2x3; pagina MVD buildingSMART 403 in sessione [NON TROVATO stato 2026]; `ifcopenshell` 0.8.5 lo scrive | lettura opzionale (BIM→analitico); scrittura bassa priorità: pochi solutori lo leggono davvero [INF] |
| ETABS `.e2k` / SAP2000 `.s2k` | testo nativo CSI, esportabile/importabile in ETABS [V] https://wiki.csiamerica.com/pages/viewpage.action?pageId=7635910 | nessun parser Python open trovato; ETO importa `.s2k` in OpenSees [V] awesome-opensees | lettura `.s2k`/`.e2k` fattibile (formato testuale a blocchi `TABLE`), non prioritario |
| midas MGT/MCT | testo `*NODE`/`*ELEMENT`… [V] https://support.midasuser.com/hc/en-us/articles/29104598974873-Export | spec non aperta | no |
| OpenSees `printModel('-JSON', '-file', f)` | scrive il dominio in JSON, non rilegge [V] | — | utile come dump; **non** formato d'ingresso |
| opstool | xarray/NetCDF per risultati; gmsh→ops; Tcl→Py [V] | 1.0.26 | riuso interno, non scambio |
| Speckle `Objects.Structural` (Arup) | Node/Element1D/2D/Result | community thread [INF]; `specklepy` 2026.8.1 | nicchia; no |
| PyNite/compas_fea2 JSON | nessuno standard | — | no |
| CSV/JSON proprio | — | — | sì: tabelle sollecitazioni/verifiche per tesi (pandas) |

Concorrenti: SAF spinto da SCIA/Allplan/IDEA; MasterSap (ITA) SAF; NextFEM importa Abaqus/CalculiX, OpenSees, SAP, midas [V snippet].

---

## 5. Uscite

NTC 2018 §10.2.1 [V, testo integrale letto], la Relazione di calcolo deve contenere: tipo di analisi (statica/dinamica, lineare/non lineare) e motivazioni; metodo di risoluzione e di verifica; **combinazioni adottate** (e percorsi di carico se non lineare) motivate; **origine dei codici**: titolo, autore, produttore, **versione, licenza**; descrizione opera, inquadramento normativo, parametri di progetto, materiali, criteri di modellazione, combinazioni, codice, esito verifiche; **deformate, diagrammi delle caratteristiche di sollecitazione, inviluppi per combinazione, schemi carichi/reazioni**, con **convenzioni sui segni, valori numerici, unità** nei punti significativi; «informazioni generali sull'elaborazione» (controlli sul modello); **giudizio motivato di accettabilità**: confronto con calcoli semplici, **equilibrio reazioni/carichi**. Tabulati: **allegato, non parte della relazione**. §10.2: documentazione software con basi teoriche, campi d'impiego, **casi prova risolti con file di input**. §10.2.2: valutazione indipendente con programma diverso (→ il confronto OpenSees/Abaqus/CalculiX è esattamente questo).

Per la tesi: PNG/SVG vettoriali (deformate, modi, diagrammi M/V/N, curva pushover, spettro con punto di prestazione), tabelle Markdown/LaTeX/CSV, script riproducibile versionato (l'artefatto OpenSees è lo script, `ricerca-opensees…` §4.1), registro con commit/versioni (già stile MeshRec). Per uso professionale: PDF relazione §10.2.1 + allegato tabulati + casi prova.

---

## 6. Caso studio e benchmark

Dati in casa (`fase-4-materiale.md`, `lab_telaio.yaml`) [V]: zapata 700×250×700 ×2, viga inferior 250×250×1300, columna 172×172×1695 ×2, viga superior 140×175×2090; ingombro 2700×1945 mm; volume tavola 0,4777 m³; classe cls **non dichiarata** → assunto C25/30, E=31.500 MPa, ν=0,2, ρ=2,5493e-9 t/mm³; tamponamento (`PARED` 90 mm) assente nel provino. Carichi dichiarati dall'operatore, **non di prova**: spinta 0,10·g su y, 1200 N in sommità su `TOP`, gravità; vincolo `BASE` = fascia 132 mm sopra taglio a z=−498 (incastro perfetto, `fase-5-analisi.md:606-612`). Risultati esistenti (CalculiX, C3D4, `runs/lab_telaio_v2`, ora non presenti qui): u_max 0,0367/0,0446/0,0583 mm, vm max 0,51/0,68/0,81 MPa (`fase-5-analisi.md:448-452`); f1 e massa modale 40 modi.

Per OpenSees serve: (i) vincoli: zapatas incastrate o appoggio; (ii) carichi realistici: **nessuna prova di carico documentata** in repo [NON TROVATO] → dichiarare; (iii) armature dalla tavola `MURO 1` (non versionata) o ipotesi; (iv) classe; (v) confronto atteso con Abaqus/CalculiX sul **solido**: spostamenti, reazioni, f1-fn, massa partecipante, von Mises (`ricerca-opensees…` §5.3 «minimo comune»); (vi) confronto telaio-a-fibre vs solido: spostamento in sommità, taglio alla base, frequenze — nuovo livello di prova, mai fatto [INF].

Il provino (telaio monopiano monocampata con trave di fondazione, tamponamento previsto) è la geometria classica delle prove di **tamponature**. Benchmark:

| benchmark | dati | pertinenza |
|---|---|---|
| **Morandi, Hak, Magenes 2018**, Data in Brief 16:886-904, doi 10.1016/j.dib.2017.12.015, **CC BY 4.0**, xlsx 8,2 MB; telaio c.a. monopiano monocampata full-scale, TNT = telaio nudo fino a drift 3,5%, TA1-4 tamponati; C28/35 (fcm 34 MPa), B450C, 400 kN/colonna costanti [V] https://pmc.ncbi.nlm.nih.gov/articles/PMC5848065/ | curve F-d, materiali; geometria nel paper Eng. Struct. 156:503-521 | **alta**: stessa tipologia, telaio nudo TNT oracolo per pushover ciclico |
| JRC-ELSA: SPEAR (3 piani irregolare), ICONS (4 piani 3 campate anni '50), SERFIN; dataset FAIR «ELSA – Structure of the experimental datasets» 2025 [V] https://publications.jrc.ec.europa.eu/repository/handle/JRC141264; SERIES Data Access Portal http://www.dap.series.upatras.gr | download non verificato in sessione [NON TROVATO] | media: multipiano, buoni per modale/pushover di edificio |
| OpenSeesPy `RCFrameGravity`/`MomentCurvature` (oracoli numerici pubblicati, `ricerca-armature-opensees-fibre.md` §5.2) | codice | verifica del generatore |
| FP4026 database periodi telai tamponati (PMC5081420) [V snippet] | periodi | modale |

---

## Stato normativo al 04/09/2026

- **NTC 2018 ancora vigenti**; modifiche DM 09/03/2023 (GU 22/03/2023) [V] https://ediltecnico.it/aggiornamento-delle-norme-tecniche-per-le-costruzioni-ntc-2018-in-gazzetta-le-modifiche/. Revisione annunciata 2021 («nuova norma potrebbe arrivare già nel 2022», Braga) [V] https://www.ingenio-web.it/articoli/revisione-ntc-2018-quali-novita-per-il-mondo-delle-costruzioni-i-dettagli-nell-intervista-a-franco-braga/ — nessuna pubblicazione trovata [NON TROVATO].
- **Nuove Appendici Nazionali** agli Eurocodici: intesa Conferenza Unificata 07/07/2026, 1.169 NDP, in attesa GU [V] https://biblus.acca.it/eurocodici/.
- **Eurocodici 2ª generazione**: EN 1992-1-1:2023, EN 1998-1-1:2024 pubblicati; DoP nazionale 30/09/2027, ritiro 1ª gen. **30/03/2028** [V] https://www.scia.net/en/news/second-generation-eurocodes-approaching, https://knowledge.bsigroup.com/products/eurocode-8-design-of-structures-for-earthquake-resistance-general-rules-and-seismic-action. Appendici italiane 2ª gen.: non trovate [NON TROVATO]. Un software nuovo nel 2027-28 dovrà parlare EN 1998-1-1:2024 (dove la struttura di q e delle verifiche cambia) — da tenere nel modello dati come «norma» parametrica.

## Domande aperte per il brainstorming

1. Recuperare `opensees.py`/`telaio.py`/`armatura.py`/`combinazioni.py` da `4386c22^` nel nuovo repo, o riscrivere? Erano scritti per Tcl e per il contratto MeshRec.
2. Tcl generato (file diffabile, decisione #139 Q2) o `openseespy` in-process (necessario per `responseSpectrumAnalysis` con `-return`, opstool)?
3. Norma: solo NTC 2018 + Circolare, o NTC + EC8 2004 + EC8 2024 parametrici? Impatta il modello di «combinazione» e «verifica».
4. Le armature del caso studio: tavola `MURO 1` versionabile nel nuovo repo (ora esclusa) o ipotesi dichiarata?
5. Ambito verifiche v1: drift/θ/regolarità (senza armature) vs. set completo SLU/SLE/gerarchia (con armature)?
6. Il vecchio contratto «un campo per caso» escludeva CQC; il nuovo modello dati deve prevedere risultati **senza segno per combinazione modale** fin dall'inizio.
7. Carichi di prova del telaio di laboratorio: esistono? Senza, il confronto resta code verification, non validazione.

## Raccomandazioni (non decisioni)

- **Modello dati = telaio** (nodi, aste, sezione+armatura, vincoli, azioni con `natura`, combinazioni, norma); solido `.inp` solo come importatore di verifica incrociata.
- **Post-processing in casa**: CQC/SRSS, 30%, spettro NTC, N2/Metodo A, θ, drift. OpenSees dà modi, spostamenti modali, forze elemento per modo.
- **Verifiche v1**: `structuralcodes` per M-N/M-χ EC2; taglio/nodi/gerarchia NTC scritte in casa con registro fonte/origine come `materiali.py`/`soglie.py`.
- **Scambio**: SAF lettura+scrittura; CSV/JSON proprio; IFC solo lettura più avanti.
- **Benchmark**: Morandi-Hak-Magenes TNT come oracolo sperimentale aperto; `RCFrameGravity` come oracolo del generatore.
- **Relazione**: template su §10.2.1 con sezione «giudizio di accettabilità» alimentata dai controlli automatici (equilibrio reazioni, massa modale, confronto con calcolo semplice).

## Fonti

Repo: `/Users/mario/GitHub/Tesi/docs/validazione/README.md`, `modi-per-la-normativa.md`, `ricerca-opensees-e-armature.md`, `ricerca-armature-librerie-python.md`, `ricerca-armature-opensees-fibre.md`, `ricerca-ntc-2018-numeri-per-il-catalogo.md`; `/Users/mario/GitHub/Tesi/PRODUCT.md`; `meshrec/docs/fase-4-materiale.md`, `fase-5-analisi.md`, `fase-6-carichi.md`; `meshrec/casi/lab_telaio.yaml`; `meshrec/src/meshrec/core/wall.py`, `abaqus.py`, `materiali.py`; `analisi-abaqus/README.md`; git `4386c22`, `4386c22^`.
Norme (PDF → testo in scratchpad): NTC 2018 cap. 3, 4, 7, 10 https://www.studiopetrillo.com/files/ntc2018/cap{3,4,7,10}.pdf; Circolare 7/2019 cap. 7 https://www.studiopetrillo.com/files/ntc2018/circolare-ntc2018-cap7.pdf; EN 1998-1:2004 https://www.phd.eng.br/wp-content/uploads/2015/02/en.1998.1.2004.pdf.
OpenSeesPy: responseSpectrumAnalysis, modalProperties, modalDamping, uniformExcitation, displacementControl, geomTransf, printModel su https://openseespydoc.readthedocs.io/en/latest/src/.
Altri: https://www.saf.guide/ ; https://ifc43-docs.standards.buildingsmart.org/ ; https://opstool.readthedocs.io/ ; https://github.com/nschloe/meshio ; https://raw.githubusercontent.com/Hanlin-Dong/awesome-opensees/master/README.md ; https://pmc.ncbi.nlm.nih.gov/articles/PMC5848065/ ; https://publications.jrc.ec.europa.eu/repository/handle/JRC141264 ; https://biblus.acca.it/eurocodici/ ; https://www.scia.net/en/news/second-generation-eurocodes-approaching ; https://ediltecnico.it/aggiornamento-delle-norme-tecniche-per-le-costruzioni-ntc-2018-in-gazzetta-le-modifiche/ ; https://www.ingenio-web.it/articoli/revisione-ntc-2018-quali-novita-per-il-mondo-delle-costruzioni-i-dettagli-nell-intervista-a-franco-braga/ ; https://wiki.csiamerica.com/pages/viewpage.action?pageId=7635910 ; https://support.midasuser.com/hc/en-us/articles/29104598974873-Export ; PyPI JSON API e GitHub API (04/09/2026).
