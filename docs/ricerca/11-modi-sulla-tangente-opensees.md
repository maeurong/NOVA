# Ricerca: modi sulla rigidezza tangente dopo la pushover in OpenSees

Ricerca dell'08/09/2026, ticket wayfinder [#34](https://github.com/maeurong/NOVA/issues/34) (figlio di #31, blocca #45 e #39). Domanda: **OpenSees può estrarre i modi di un modello a fibre dopo una statica non lineare, sulla tangente dello stato danneggiato?** È la via «previsione diretta»: spingere fino allo spostamento di ogni stato di danno, poi chiedere i modi.

Skill-gate: skill `research` invocata. La skill prescrive di dispacciare un agente in background; il brief del ticket vieta i subagenti, quindi la ricerca è stata condotta in proprio seguendo il resto della skill (fonti primarie, un file Markdown nella convenzione del repo, cattura delle pagine). `caveman` per il report a chi ha dispacciato, `ponytail` per gli script di misura.

Convenzione (`docs/ricerca/README.md:33`): **[V]** fonte primaria letta · **[M]** misurato in sessione con comando · **[INF]** inferenza · **[NON TROVATO]**. Virgola decimale fuori dalle citazioni verbatim.

Misure fatte da `/Users/mario/GitHub/NOVA/.claude/worktrees/agent-aeb5a5396d580ff96`, ramo `research/modi-tangente`, HEAD `0b81606`, con `~/.local/bin/OpenSees` — wrapper su `~/.local/opt/opensees/OpenSees3.8.0/bin/OpenSees`, che si dichiara `Version 3.8.0 64-Bit (6e55293513192aa05c7e1205e66a5a1a1ed088c4)` [M `OpenSees -version`]. Quel SHA è un commit reale di `OpenSees/OpenSees` datato 18/02/2026 [M `api.github.com/repos/OpenSees/OpenSees/commits/6e55293…`], e **tutte le citazioni al sorgente sono pinnate a quel commit**: sono il sorgente del binario che ha prodotto i numeri, non `master`.

Modello: `docs/caso-studio/muro_1_pushover.nova.json` (telaio a portale, 4 aste suddivise in 16 elementi `forceBeamColumn`, sezioni a fibre `Concrete02`/`Steel02`, pushover uniforme sul nodo 3 in `ux`, gravità C1 congelata con `loadConst`). Deck generato da `nova/deck.py` senza modificarlo: le sonde sono iniezioni Tcl nel file prodotto.

---

## Artefatti consultati

| artefatto | provenienza | stato |
|---|---|---|
| `SRC/analysis/analysis/StaticAnalysis.cpp`, `analysis/integrator/EigenIntegrator.cpp`, `analysis/integrator/DisplacementControl.cpp`, `analysis/fe_ele/FE_Element.cpp`, `analysis/model/AnalysisModel.cpp` | raw.githubusercontent.com @ `6e55293` | letti [V] |
| `SRC/tcl/commands.cpp` (`eigenAnalysis`, `modalProperties`) | idem | letto [V] |
| `SRC/system_of_eqn/eigenSOE/{FullGenEigenSolver,ArpackSolver,BandArpackSolver}.cpp` | idem | letti [V] |
| `SRC/domain/domain/{Domain,DomainModalProperties}.cpp` | idem | letti [V] |
| `SRC/material/uniaxial/Concrete02.cpp` | idem | letto [V] |
| i dieci sorgenti qui sopra, verbatim | idem | catturati in `fonti/` con sidecar [V] |
| doc ufficiale `eigen`, `modalProperties` (sorgente `.rst`) | opensees.github.io | letta [V], catturata in `fonti/` |
| 6 post di M. H. Scott su eigen | portwooddigital.com | letti [V], catturati in `fonti/` |
| `nova/deck.py`, `nova/modale.py`, `nova/legami.py`, `meshrec/core/opensees.py` | worktree | letti [V] |
| 7 corse OpenSees sul modello del caso studio (≈ 60 processi) | binario locale | eseguite [M] |

Gli script di misura stanno in [`misure/`](misure/) — usa-e-getta, riusabili così come sono:
`34-genera-deck.py` (deck con spinta e incremento a scelta), `34-coda-eigen.py` (un `eigen` in coda al ciclo), `34-sonda-eigen.py` (`eigen` **dentro** il ciclo, a livelli di spostamento), `34-coda-doppia.py` (sequenze di `eigen`, con e senza `wipeAnalysis`), `34-scarico.py` (spinta, poi ritorno), `34-massa-rotazionale.py` (massa rotazionale fittizia), `34-serie.sh` / `34-serie-rot.sh` (una corsa per livello), `34-degeneri.tcl` / `34-degeneri2.tcl` (gli ingressi degeneri).

---

## 1. Risposta breve

**Sì, la via diretta regge — ma il numero che ne esce non è una proprietà dello stato, è una proprietà dell'ultimo incremento.**

Tre cose, tutte misurate:

1. `eigen` dopo `analyze` funziona, assembla la **tangente corrente** e non tocca lo stato. Con un solo `eigen` per processo, `-genBandArpack` e `-fullGenLapack` concordano a **8-9 cifre** a ogni livello di spinta, fino a λ₁ = 212,9 [M].
2. Lo stesso stato di equilibrio, raggiunto con incrementi diversi, dà **frequenze diverse fino a un fattore 7**, con il taglio alla base identico a 4 cifre. A `u` = 55 mm il periodo T₁ vale 0,100 s con incremento 0,1 mm e 0,703 s con incremento 1,0 mm [M].
3. Il **secondo** `eigen` della sessione risponde diverso dal primo, e `wipeAnalysis` prima di `eigen` cambia ancora il numero: a `u` = 100 mm i tre valori sono +212,9, +2753,6 e −98,9 per lo stesso λ₁ [M].

Quindi: la via diretta si può percorrere, ma se NOVA pubblica «T₁ dello stato di danno = 0,25 s» senza dichiarare l'incremento e senza un solo `eigen` per corsa, pubblica un numero che nessuno può riprodurre.

---

## 2. Cosa fa `eigen` davvero

### 2.1 La matrice K è la tangente corrente, e non c'è un'opzione «iniziale»

Il comando Tcl `eigen` è registrato in `SRC/tcl/commands.cpp:921` e implementato in `eigenAnalysis` (riga 5663). Se esiste un'analisi statica, chiama `theStaticAnalysis->eigen(numEigen, generalizedAlgo, findSmallest)` (riga 5848) [V].

`StaticAnalysis::eigen` assembla K **a mano**, elemento per elemento (`StaticAnalysis.cpp:267-278`) [V]:

```cpp
while((elePtr = theEles()) != 0) {
  elePtr->zeroTangent();
  elePtr->addKtToTang(1.0);
  if (theEigenSOE->addA(elePtr->getTangent(0), elePtr->getID()) < 0) { … }
}
```

e `FE_Element::addKtToTang` prende `myEle->getTangentStiff()` (`FE_Element.cpp:352-363`) [V]. La stessa cosa passa per `EigenIntegrator::formEleTangK`, che fa `zeroTangent(); addKtToTang(1.0)` (`EigenIntegrator.cpp:191-196`) [V].

`getTangentStiff()` è la tangente **corrente** dell'elemento, quella dell'ultimo passo convergente. **Non esiste** un'opzione `-initial` sul comando `eigen`: le uniche opzioni riconosciute sono `frequency`/`generalized` (default), `standard`, `-findLargest`, `-genBandArpack`, `-symmBandLapack`, `-fullGenLapack` (`commands.cpp:5678-5713`) [V]. Chi vuole i modi sulla rigidezza iniziale deve prendere `eigen` prima di caricare, non chiederlo a `eigen`.

M. H. Scott lo dice con le stesse parole: «OpenSees will assemble the current tangent stiffness into the eigenvalue solver each time `eigen` is called […] This procedure will also work in a static pushover analysis, just be sure to define mass» [V].

### 2.2 `eigen` non tocca lo stato del materiale

In `StaticAnalysis::eigen` non c'è nessuna `commit`, `revertToLastCommit`, `update` o `setTrialStrain`: si azzerano A ed M, si assemblano, si risolve, si depositano autovalori e autovettori nei nodi (`StaticAnalysis.cpp:256-331`) [V]. La pushover può quindi proseguire dopo — **ma vedi §5**, perché il contorno dell'analisi viene toccato lo stesso.

### 2.3 I tre solutori, e cosa risolvono

Dal sorgente e dalla doc ufficiale [V]:

| opzione | SOE | problema | note |
|---|---|---|---|
| `-genBandArpack` (default) | `ArpackSOE` | generalizzato K φ = λ M φ | iterativo (Lanczos); **usa la `LinearSOE` dell'analisi** per i solve interni (`ArpackSolver.cpp:28-29`, `143`, `254-278`) — quindi il comando `system` conta |
| `-fullGenLapack` | `FullGenEigenSOE` | generalizzato | denso, LAPACK `dggev` (`FullGenEigenSolver.cpp:172-175`); la doc avverte «VERY SLOW for moderate to large models» |
| `-symmBandLapack` | `SymBandEigenSOE` | **standard** K x = λ x | la doc: «works only standard eigenvalue analysis of the stiffness matrix» |

`standard`/`-standard` e `generalized`/`-generalized` **esistono** in 3.8.0 (`commands.cpp:5680-5690`) [V]. Misurato sul modello del caso studio a `u` = 1 mm: `eigen -standard -symmBandLapack 3` rende 492,24 / 943,24 / 1491,7, che non sono ω² ma autovalori di K sola [M]. Utili come indice di «quanto è facile deformare il modello» (Scott, *Ordinary Eigenvalues*), inutili come frequenze.

### 2.4 `modalProperties` funziona sullo stato danneggiato

`modalProperties` legge gli autovalori già depositati (`DomainModalProperties.cpp:462`) e riassembla M da `element->getMass()` e `node->getMass()` (righe 605-622) [V]. La massa non dipende dal danno: quello che cambia sono le forme. La doc conferma che il comando «directly accesses the mass matrix of the model» e vale «only if a previous call to eigen has been performed» [V].

Misurato: `modalProperties -print -file … -unorm` ha reso `rc = 0` in **tutti** i 13 livelli di spinta provati, da 2 a 100 mm, scrivendo il rapporto a dieci blocchi che `nova/modale.py` già sa leggere [M].

Nota sulla normalizzazione, con una **discrepanza doc/sorgente**: la doc dice che `-fullGenLapack` usa una normalizzazione a spostamento e `-genBandArpack` a massa [V doc]; il sorgente di `FullGenEigenSolver::solve` normalizza a massa (`FullGenEigenSolver.cpp:213-247`, commento «mass normalize the eigenvalues», con un `if (factor >= 0)` che salta i modi il cui φᵀMφ è negativo) [V]. Per NOVA la questione è muta, perché il deck passa già `-unorm` (`meshrec/core/opensees.py:506`), che forza la normalizzazione a spostamento in ogni caso.

---

## 3. Le misure: le frequenze sulla tangente

### 3.1 Serie pulita — una corsa per livello, un solo `eigen`

Protocollo: per ogni spostamento obiettivo si genera il deck con `spostamento_max` = quel valore, si appende **un solo** `eigen -fullGenLapack 3` + `modalProperties` dopo il ciclo, si lancia un processo a sé. Nessun `eigen` dentro il ciclo. Incremento 0,5 mm (quello dichiarato nel modello). Comando: `sh docs/ricerca/misure/34-serie.sh /tmp/m34/serieL -fullGenLapack 3 2 5 10 …` [M].

Frequenze lette da `mp_fine.out`, blocco `2. EIGENVALUE ANALYSIS`:

| stato | λ₁ | f₁ [Hz] | T₁ [s] | f₂ [Hz] | f₃ [Hz] |
|---|---|---|---|---|---|
| riferimento: modello scarico, `eigen` prima della spinta | 16252,7 | 20,290 | 0,0493 | 31,590 | 35,643 |
| `u` = 2 mm | 11568,7 | 17,118 | 0,0584 | 18,962 | 30,912 |
| `u` = 5 mm | 7645,08 | 13,916 | 0,0719 | 14,649 | 27,269 |
| `u` = 10 mm | 1808,84 | 6,769 | 0,1477 | 14,144 | 26,425 |
| `u` = 20 mm | 3101,04 | 8,863 | 0,1128 | 13,305 | 25,161 |
| `u` = 30 mm | 652,016 | 4,064 | 0,2461 | 12,205 | 23,876 |
| `u` = 40 mm | 4025,57 | 10,098 | 0,0990 | 12,599 | 24,655 |
| `u` = 45 mm | 2536,18 | 8,015 | 0,1248 | 13,459 | 25,286 |
| `u` = 50 mm | 2994,30 | 8,709 | 0,1148 | 13,025 | 24,675 |
| `u` = 55 mm | 844,877 | 4,626 | 0,2162 | 13,155 | 24,525 |
| `u` = 60 mm | 2419,77 | 7,829 | 0,1277 | 11,329 | 23,413 |
| `u` = 70 mm | 5111,55 | 11,379 | 0,0879 | 12,285 | 23,392 |
| `u` = 80 mm | 325,855 | 2,873 | 0,3481 | 11,823 | 23,220 |
| `u` = 100 mm | 212,901 | 2,322 | 0,4306 | 10,130 | 21,581 |

Due letture opposte nella stessa tabella:

- **f₂ e f₃ scendono in modo pulito e monotono** (31,6 → 10,1 Hz e 35,6 → 21,6 Hz): sono modi governati da parti che restano elastiche.
- **f₁ sbanda**: 17,1 → 6,8 → 8,9 → 4,1 → 10,1 → 8,0 → 8,7 → 4,6 → 7,8 → 11,4 → 2,9 → 2,3 Hz. Fra `u` = 30 e `u` = 40 mm la frequenza **raddoppia** mentre il modello si danneggia.

E la curva di spinta, nel frattempo, è liscia: λ (fattore di carico, = taglio alla base con la distribuzione normalizzata a Σ|F| = 1) sale da 11.047 a 72.115 fino a `u` ≈ 57 mm e poi cala dolcemente, senza mai cambiare segno, su 200 passi [M, prima colonna dei recorder di fibra della corsa a 100 mm]. **Il comportamento globale è liscio, la tangente no.**

I due solutori, con un solo `eigen` per processo, sono d'accordo. Stessa serie con `-genBandArpack` (`34-serie.sh … -genBandArpack 3 …`) [M]:

| `u` [mm] | λ₁ `-fullGenLapack` | λ₁ `-genBandArpack` | scarto relativo |
|---|---|---|---|
| 10 | 1808,84334961 | 1808,84336875 | 1,1·10⁻⁸ |
| 30 | 652,015739639 | 652,015739821 | 2,8·10⁻¹⁰ |
| 80 | 325,855303286 | 325,855303217 | 2,1·10⁻¹⁰ |
| 100 | 212,901345642 | 212,901346582 | 4,4·10⁻⁹ |

Cioè: sullo stato danneggiato **non c'è un problema di solutore**, se lo si chiama una volta sola. Le divergenze fra solutori che si vedono in letteratura e nei primi tentativi di questa ricerca vengono da altro (§5).

### 3.2 La misura che decide: lo stesso stato, tre incrementi

Stessa spinta, stesso spostamento finale, solo `incremento` diverso nel modello (0,1 / 0,5 / 1,0 mm). Una corsa per casella, un solo `eigen` in coda [M `INCR=0.1 sh …/34-serie.sh …`]:

| `u` [mm] | λ₁ (incr. 0,5) | f₁ | λ₁ (incr. 0,1) | f₁ | λ₁ (incr. 1,0) | f₁ | T₁ min–max [s] |
|---|---|---|---|---|---|---|---|
| 5 | 7645,08 | 13,92 | 7645,07 | 13,92 | 8199,64 | 14,41 | 0,0694–0,0719 |
| 10 | 1808,84 | 6,769 | 3947,55 | 10,00 | 1873,09 | 6,888 | 0,100–0,148 |
| 20 | 3101,04 | 8,863 | 3474,92 | 9,382 | 1820,52 | 6,791 | 0,107–0,147 |
| 30 | 652,016 | 4,064 | 1729,12 | 6,618 | 3067,42 | 8,815 | 0,113–0,246 |
| 40 | 4025,57 | 10,10 | 1405,40 | 5,967 | 2092,23 | 7,280 | 0,0990–0,168 |
| 55 | 844,877 | 4,626 | 3933,37 | 9,982 | 79,9307 | 1,423 | **0,100–0,703** |
| 60 | 2419,77 | 7,829 | 3073,17 | 8,823 | 2419,91 | 7,829 | 0,113–0,128 |

E lo **stato** è lo stesso. A `u` = 30 mm, ultima riga dei recorder [M]:

| incremento | passi | λ finale (taglio alla base) | σ/ε fibra di copriferro tesa |
|---|---|---|---|
| 0,1 mm | 300 | 65 695,3 | 0 / 8,63983·10⁻² |
| 0,5 mm | 60 | 65 705,8 | 0 / 8,63617·10⁻² |
| 1,0 mm | 30 | 65 708,2 | 0 / 8,63524·10⁻² |

Taglio alla base uguale a **2·10⁻⁴** relativo, deformazione di fibra uguale a **5·10⁻⁴** relativo, e λ₁ che va da 652 a 3067 — **un fattore 4,7, cioè un fattore 2,2 sul periodo**. Non è rumore numerico: è la definizione stessa di tangente.

### 3.3 Perché sbanda: la tangente di `Concrete02` è quella del ramo appena percorso

Dal sorgente, `Concrete02::getTangent()` rende il membro `e`, che `setTrialStrain` assegna secondo il **ramo che l'incremento ha percorso** (`Concrete02.cpp:167-262`) [V]:

| condizione | `Ect` restituita | dove |
|---|---|---|
| carico sull'inviluppo, ε ≥ εc0 (parabola) | `Ec0·(1 − ε/εc0)` — **si annulla al picco e diventa negativa dopo** | riga 481 |
| ramo discendente lineare fino a εcu | `(fcu − fc)/(εcu − εc0)`, costante **negativa** | riga 487 |
| oltre εcu (attrito) | **`1,0e-10`**, non zero — un commento mostra che lo zero era la scelta di partenza | riga 493 |
| scarico/ricarico fra εmin e ept | `ec0 = 2·fc/εc0` oppure `er`, `0,5·er` | righe 219-229 |
| trazione oltre εu (fessura aperta) | `1,0e-10` | riga 451 |
| `\|Δε\| < DBL_EPSILON` | **`e` non viene ricalcolato**: resta il valore del passo prima | riga 180 |

Cioè: la **stessa fibra, alla stessa deformazione**, contribuisce `−606 MPa` se l'ultimo incremento l'ha portata giù per il ramo discendente, e `+29 450 MPa` (l'`Ec` iniziale del nucleo confinato del caso studio) se l'ultimo incremento l'ha scaricata. Cinquanta volte tanto, e di segno opposto. Con la fibra neutra che si sposta durante la spinta, quali fibre stiano caricando e quali scaricando alla fine dell'ultimo incremento dipende da quanto è lungo l'incremento — ed è esattamente ciò che la tabella §3.2 misura.

`Concrete02::revertToLastCommit` ripristina `e = eP` (riga 313) e `commitState` fa `eP = e` (riga 335) [V]: la tangente è uno **stato committato**, non una funzione della deformazione. Non c'è modo di chiedere «la tangente al punto» invece della «tangente del ramo».

### 3.4 Scarico contro carico: misurato

Spinta fino a 40 mm, poi ritorno in controllo di spostamento fino a 20 mm, `eigen` in tutti e due i punti (`34-scarico.py`) [M]:

| come si arriva a `u` = 20 mm | λ₁ | f₁ [Hz] |
|---|---|---|
| salendo, spinta monotona | 3101,04 | 8,863 |
| scendendo da 40 mm | 3085,17 | 8,840 |

Scarto 0,5 %. Sembra una buona notizia, e non lo è: significa che **anche salendo** la tangente era già dominata da fibre in scarico. Il valore «di carico» e quello «di scarico» coincidono per caso, non per costruzione, e la §3.2 mostra quanto poco basti a spostarli.

Degenere trovato per strada, e vale come avvertimento: partendo da `u` = 50 mm il **primo passo di inversione non converge** (`analyze` ≠ 0). Il ciclo si ferma, `nodeDisp` legge ancora 50 mm — e `eigen` lì rende λ₁ = 482,5 contro i 2994,3 dello stesso spostamento prima del tentativo [M]. Dopo un `analyze` fallito la tangente **non** è quella dell'ultimo stato committato: `eigen` non se ne accorge e non lo dice.

### 3.5 Non è la matrice delle masse

Il deck di NOVA non scrive righe `mass`: la massa viene tutta da `forceBeamColumn -mass`, che è **lumped e solo traslazionale**. M è quindi singolare sulle rotazioni — la condizione che la doc ufficiale e i post di Scott indicano come causa dei modi spuri e dei fallimenti ARPACK [V]. Poteva essere la spiegazione dello sbandamento.

Non lo è. Aggiungendo `mass tag 0 0 0 J J J` con `J` = 1,0 t·mm² a tutti i 16 nodi (`34-massa-rotazionale.py`), che rende M non singolare senza toccare i modi bassi, la serie **non cambia** [M]:

| `u` [mm] | λ₁ senza massa rotazionale | λ₁ con `J` = 1,0 | scarto |
|---|---|---|---|
| 2 | 11 568,744 | 11 568,425 | 2,8·10⁻⁵ |
| 20 | 3 101,043 | 3 100,994 | 1,6·10⁻⁵ |
| 30 | 652,0157 | 652,0069 | 1,4·10⁻⁵ |
| 80 | 325,8553 | 325,8503 | 1,5·10⁻⁵ |
| 100 | 212,9013 | 212,8981 | 1,5·10⁻⁵ |

Lo sbandamento di λ₁ è **fisico** (la tangente salta ramo), non un artefatto del condizionamento del fascio (K, M).

---

## 4. Frequenze negative e NaN

Su spinte più lunghe λ₁ diventa negativa. Misurato con `-fullGenLapack` a `u` = 45,25 / 55,25 / 57,75 / 60,25 / 65,25 / 80,25 / 100,2 mm nella corsa a sonda continua, con λ₁ fino a **−603,96** [M].

Cosa succede allora, misurato passo per passo:

1. `eigen` **non segnala nulla**: `rc = 0`, la lista degli autovalori esce col numero negativo in testa. Il sorgente lo conferma: `FullGenEigenSolver::solve` mette a `DBL_MAX` gli autovalori con `beta` sotto soglia e avvisa solo per gli autovalori **complessi** (`FullGenEigenSolver.cpp:194-210, 255-260`); il negativo passa liscio [V].
2. `modalProperties` scrive il rapporto lo stesso, e calcola `omega = std::sqrt(lambda)` senza guardia (`DomainModalProperties.cpp:935, 1044`) [V]. Risultato nel file, verbatim [M, `mp_602.out`]:

```
* 2. EIGENVALUE ANALYSIS:
#          MODE        LAMBDA         OMEGA     FREQUENCY        PERIOD
# ------------- ------------- ------------- ------------- -------------
              1      -603.962           nan           nan           nan
```

3. Il blocco 9 (massa partecipante) resta **pieno di numeri plausibili** per quel modo: `MX = 48,4848 %`, `RMY = 21,758 %` [M]. Un modo senza senso fisico con una massa partecipante che sembra buona.
4. **`meshrec/core/opensees.py:848` fa `float(campi[3])`, e `float("nan")` non solleva.** Misurato: `opensees.leggi_frequenze(Path("mp_602.out"))` rende `[nan, 9.95693, 20.8385]` [M]. NOVA porterebbe il NaN in avanti in silenzio, e `SOGLIA_MASSA` in `nova/modale.py:31` confronterebbe un cumulato calcolato su un modo che non esiste.

Lettura fisica [INF]: λ₁ < 0 significa che K tangente è indefinita, cioè che esiste un modo di deformazione che non genera forza resistente — softening. Scott: «Physically, the negative eigenvalue means the model has modes of deformation that do not generate any resisting force. The other positive eigenvalues computed by the solver are not meaningful for the model» [V]. È coerente con i rami discendenti di `Concrete02` (§3.3) e non è un errore del solutore: è il modello che lo dice.

---

## 5. La trappola grossa: `eigen` non è idempotente

Questa non l'ho trovata scritta da nessuna parte, e costa cara. **Il secondo `eigen` di una sessione può rispondere diverso dal primo, sullo stesso stato.**

Misura di controllo, cinque `eigen` di fila subito dopo la pushover, senza nessun `analyze` in mezzo (`34-coda-doppia.py`) [M]:

`u` = 30 mm, analisi della pushover ancora viva:

| chiamata | λ₁ |
|---|---|
| 1. `eigen -fullGenLapack 3` | 652,01573963940 |
| 2. `eigen -fullGenLapack 3` | 652,01573963940 (identica) |
| 3. `eigen -genBandArpack 3` | **2953,25855300** |
| 4. `eigen -fullGenLapack 3` | 651,81385915046 |

`u` = 100 mm, stessa sequenza:

| chiamata | λ₁ |
|---|---|
| 1-2. `-fullGenLapack` | 212,90134564179 |
| 3. `-genBandArpack` | **2753,55974669295** |
| 4. `-fullGenLapack` | 2753,55974040167 |

E con `wipeAnalysis` **prima** della sequenza, a `u` = 100 mm: tutte e cinque le chiamate, con tutti e due i solutori, danno λ₁ = **−98,8867722** — stabile, ripetibile, e **diverso da entrambi i valori di prima**, segno compreso [M].

Tre valori dello stesso λ₁ sullo stesso stato: **+212,90** (primo `eigen`, analisi viva), **+2753,56** (dopo un cambio di solutore), **−98,89** (dopo `wipeAnalysis`).

Il perché, dal sorgente [V] con l'ultimo anello [INF]:

- `StaticAnalysis::setEigenSOE` fa `domainStamp = 0` quando la classe della `EigenSOE` cambia (`StaticAnalysis.cpp:549-570`). Cambiare solutore fa esattamente questo.
- `StaticAnalysis::eigen` chiama `this->domainChanged()` ogni volta che lo stamp non combacia (`StaticAnalysis.cpp:243-254`).
- `StaticAnalysis::domainChanged()` fa `theAnalysisModel->clearAll()`, `theConstraintHandler->handle()`, rinumera i DOF, ridimensiona le SOE, e infine chiama `theIntegrator->domainChanged()` (`StaticAnalysis.cpp:360-440`).
- `DisplacementControl::domainChanged()` non si limita ad allocare: alza il tempo di dominio di 1, fa `theModel->applyLoadDomain(currentLambda)`, `this->formUnbalance()`, e poi rimette il tempo indietro (`DisplacementControl.cpp:515-522`), con tanto di commento «NOTE: this assumes unbalance at last was 0».
- Dopo `wipeAnalysis` non c'è più analisi, e `eigen` **se ne crea una transitoria da sé** — `Newmark(0.5,0.25)`, `NewtonRaphson`, `CTestNormUnbalance(1e-6,25)`, `ProfileSPDLinSOE` (`commands.cpp:5729-5765`) — con il suo `domainChanged` [V].
- [INF] Ognuno di questi giri rifà la determinazione di stato degli elementi, e le fibre atterrano su rami diversi: a §3.3 si è visto che basta poco. La prova indiretta: a `u` = 5 mm, dove quasi nessuna fibra è vicina a un cambio di ramo, le tre varianti concordano a 5 cifre (7645,031 / 7645,083 / 7645,031) [M]; a `u` = 100 mm divergono di segno.

**Corollario 1 — `eigen` dentro il ciclo di spinta perturba la spinta.** Confronto a parità di modello: senza sonde la spinta arriva a `u` = 60,0 mm al passo 120; con sette `eigen` iniettati nel ciclo arriva a 59,75 mm allo stesso passo, e 601 passi contro 600 per lo stesso spostamento massimo [M]. E i valori: λ₁ a `u` = 20 mm vale 3101,0 senza sonde nel ciclo, 1589,7 con sonde a un elenco di livelli, 589,6 con sonde a un altro elenco. Il ciclo `for i in range(Nsteps): … ops.eigen(Nmodes)` che Scott propone [V] va benissimo per **guardare** l'allungamento del periodo durante un'analisi; **non** va bene se il risultato della pushover deve restare quello di una corsa senza sonde.

**Corollario 2 — un solo `eigen`, e la scelta del solutore va fatta prima.** §3.1 mostra che i due solutori concordano a 8-9 cifre quando ciascuno è la sola chiamata del processo. La doc ufficiale prescrive proprio il contrappunto fra solutori come diagnosi degli autovettori sbagliati: «switch the solver used and check the results again» [V] — su un modello di NOVA questo va fatto in **due processi separati**, non in due chiamate di seguito.

---

## 6. Gli ingressi degeneri, misurati

Comandi: `OpenSees docs/ricerca/misure/34-degeneri.tcl` e `…/34-degeneri2.tcl`, in una cartella di lavoro vuota [M].

| caso | esito misurato | exit |
|---|---|---|
| **A** `modalProperties` senza `eigen`, dominio appena costruito | `modalProperties Error: no AnalysisModel available.`, `rc = 1` in Tcl, il processo sopravvive | 0 |
| **E** `modalProperties` senza `eigen`, ma con un'analisi statica già corsa | `Domain::getEigenvalues - Eigenvalues were never set` e **il processo muore**: nessuna riga dopo, nessun marcatore di fine | **255** |
| **B** `eigen -fullGenLapack 2` dopo `wipeAnalysis` | `rc = 0`, due autovalori (433,333 ripetuto). OpenSees si è creato un'analisi transitoria in silenzio | 0 |
| **C** `eigen 12` (Arpack) su un modello con 3 gradi dinamici | stderr: `ArpackSolver::Error with _saupd info = -3` / `NCV must be greater than NEV and less than or equal to N` / `WARNING DirectIntegrationAnalysis::eigen() - EigenSOE failed in solve()` — ma **`rc = 0` e risultato vuoto** | 0 |
| **D** `modalProperties` dopo un `eigen` riuscito | `rc = 0`, rapporto scritto | 0 |

Il caso **E** è la variante che riguarda NOVA: è la firma del `exit()` già catalogata in `docs/ricerca/01-opensees-integrazione.md`. Il sorgente lo dice: `DomainModalProperties.cpp:69` definisce `DMP_ERR(X)` come `opserr << … , exit(-1)` e riga 464 lo usa per «No Eigenvalue provided»; `Domain::getEigenvalues` fa `exit(-1)` quando gli autovalori non sono mai stati posati (`Domain.cpp:2362-2364`) [V]. Per NOVA la conseguenza è benigna solo perché `fine.out` non viene scritto e `corsa` lo legge come «errore fase solutore» — ma il messaggio che arriva all'utente non nomina il passo modale.

Il caso **C** è il più insidioso: **un `eigen` fallito non solleva in Tcl.** Il sorgente lo conferma: `eigenAnalysis` scrive il risultato solo `if (result == 0)` e poi fa `return TCL_OK` comunque (`commands.cpp:5847-5866`) [V]. Chi scrive un deck deve controllare che la lista **non sia vuota**, perché `catch` non basta.

Riferimento incrociato per i messaggi d'errore, tutti in tabella nel post di Scott del 27/01/2026 [V]: `info = -3` troppi modi · `info = -9` massa nulla · `info = -9999` K singolare **oppure** M di rango deficitario per DOF misti · «Maximum iterations reached» massa indefinita · autovalore negativo → K indefinita.

---

## 7. Cosa fa NOVA oggi

Letto in sessione [V]:

- `nova/deck.py:1052-1062`: il passo modale c'è, ma sta **prima** della pushover e dopo il `reset` dei casi statici — i modi che NOVA registra sono quelli del modello **scarico e integro**. La riga `blocco[blocco.index(f"eigen {n_modi}")] = f"eigen -fullGenLapack {n_modi}"` sostituisce l'Arpack che `meshrec/core/opensees.py:503` scriveva, con il motivo già documentato lì (massa lumped, «Could not build an Arnoldi factorization» sul telaio 2×1).
- `nova/deck.py:1063-1068`: la pushover viene dopo, e il commento spiega che è per far trovare φ₁ a `distribuzione: modo1`. Nessun `eigen` dopo la spinta.
- `meshrec/core/opensees.py:495-511`: `_passo_modale` scrive `k` recorder `"eigen k"`, poi `eigen`, poi `modalProperties -print -file massa_modale.out -unorm`, poi `record`, poi `remove recorders`.
- `nova/modale.py` legge il rapporto e applica `SOGLIA_MASSA = 0,85` (NTC 2018 §7.3.3.1).

Quindi: l'infrastruttura per prendere i modi c'è tutta, e riusarla dopo la pushover costa **cinque righe di Tcl in coda a `_blocco_pushover`**. Il costo di calcolo è irrilevante: la corsa completa a 120 passi del muro con `eigen` in coda impiega 2,71 s di wall clock [M `/usr/bin/time -p`].

---

## 8. Raccomandazione per NOVA

Non è una decisione: è quello che le misure suggeriscono.

**La via diretta regge. Va dichiarata, non nascosta.**

1. **Un solo `eigen` per processo, in coda alla spinta, senza `wipeAnalysis` prima e senza cambiare solutore.** È l'unica chiamata che vede lo stato committato dalla pushover senza un `domainChanged()` in mezzo (§5). Se servono più stati di danno, **una corsa per stato** — costa 2,7 s a corsa sul caso studio, e le corse sono già indipendenti.
2. **Restare su `-fullGenLapack`**, come già fa il passo modale. Non perché sia più accurato — a chiamata singola i due solutori concordano a 8-9 cifre (§3.1) — ma perché non impone il limite «N−1 modi con N gradi dinamici» che su una massa lumped morde molto prima del previsto [V doc + Scott]. Il contrappunto con `-genBandArpack`, se lo si vuole, va fatto in un **processo separato**.
3. **Dichiarare l'incremento accanto alla frequenza.** «T₁ = 0,246 s» non è un risultato; «T₁ = 0,246 s a `u` = 30 mm con incremento 0,5 mm, OpenSees 3.8.0» lo è. La tabella §3.2 è il motivo: lo stesso stato con incremento 1,0 mm dà 0,113 s.
4. **Guardia sui NaN, in un punto solo.** `meshrec/core/opensees.py:848` accetta `float("nan")` senza fiatare (§4). Serve un rifiuto esplicito — non uno zero, che sarebbe un meccanismo — con il numero del modo e il λ negativo nel messaggio. Stessa guardia vale per il conteggio della massa partecipante in `nova/modale.py`: un cumulato che include un modo NaN non è un cumulato.
5. **Verdetto invece di numero, sul primo modo.** f₂ e f₃ scendono in modo monotono e leggibile; f₁ no (§3.1). Un «T₁ dello stato di danno» pubblicato come singolo numero è fragile. Le tre forme che reggono, in ordine di onestà crescente: (a) T₁ con l'incremento dichiarato e un avviso; (b) T₁ con una fascia ottenuta ripetendo la corsa a due incrementi; (c) T₁ preso non dalla tangente ma dalla **secante** della curva di capacità (taglio/spostamento al passo), che è liscia e non dipende dall'incremento — ma è un'altra grandezza, e va chiamata con un altro nome.
6. **Non mettere `eigen` dentro il ciclo di spinta.** Cambia la spinta (§5, corollario 1). Se serve la storia dell'allungamento del periodo per una figura, va fatta in una corsa **dedicata** che non produce anche la curva di capacità.
7. **Trappole da scrivere nel codice, non nella testa**: `eigen` fallito rende `TCL_OK` con risultato vuoto → controllare la lunghezza della lista, non il codice di ritorno; `modalProperties` senza `eigen` uccide il processo → i due comandi vanno emessi insieme o nessuno dei due; dopo un `analyze` fallito la tangente non è quella committata (§3.4) → non chiedere `eigen` dopo una caduta della pushover, o dichiararlo.

---

## 9. Domande aperte per l'autore

1. **Che cosa serve davvero al capitolo?** Se serve «il periodo si allunga da 0,049 s a 0,43 s fra integro e SLC», la via diretta lo dà e la tabella §3.1 lo mostra. Se serve un T₁ **per ogni stato di danno**, da mettere in una formula (spettro, N2, domanda), allora la fragilità di §3.2 è un problema di sostanza, non di presentazione.
2. **Tangente o secante?** La secante della curva di capacità è liscia, riproducibile e ha un significato normativo (è la rigidezza del bilatero equivalente di NTC §7.3.4.2 / C7.3.4.2). La tangente ha il significato dinamico ma non è stabile. Le due rispondono a domande diverse: quale delle due chiede la tesi?
3. **Vale la pena di certificare quale dei tre valori di §5 è «il vero»?** Il primo `eigen` è l'unico senza un `domainChanged()` in mezzo, e per questo è il candidato — ma è un'[INF], non una prova. Una verifica indipendente (K da `printA`, M costruita a mano, autovalori in `numpy`) costa mezza giornata; va fatta ora o si accetta la raccomandazione «un solo `eigen`» come regola operativa senza dimostrarne l'ottimalità?
4. **Il modello del caso studio è un portale tozzo** (1607,5 mm di altezza, colonne 172×172): f₁ integro 20,3 Hz è alta, e i modi 2 e 3 sono vicini al primo. Su un telaio multipiano più flessibile lo sbandamento di §3.1 potrebbe essere meno violento (meno accoppiamento fra modi) o più (più cerniere che aprono e chiudono). **Nessuna misura su un telaio multipiano in questa ricerca**: `tests/fixture/telaio_2x1.nova.json` non ha pushover dichiarata e non è stato provato.
5. **I dieci sorgenti OpenSees copiati in `fonti/` sono un problema di licenza?** La regola d'indice chiede che ogni pagina citata [V] sia salvata, e sono stati salvati (≈ 600 kB, di cui 319 kB il solo `commands.cpp`). Ma `docs/ricerca/01-opensees-integrazione.md` ha già documentato che `COPYRIGHT` e `license.rst` di OpenSees **non coincidono** — uno dice uso non commerciale/interno, l'altro è BSD-like. Le citazioni sono comunque pinnate al commit `6e55293`, quindi immutabili anche senza la copia: se la copia dà fastidio, si tolgono i dieci file e i riferimenti restano verificabili. Decisione dell'autore, non del `researcher`.

---

## 10. Cosa non è stato coperto

- **Nessuna verifica indipendente degli autovalori** (`printA` + `numpy`): §5 resta con tre valori misurati e un'[INF] su quale sia il fedele.
- **Nessuna misura su un modello multipiano** né su `tests/fixture/telaio_2x1.nova.json` (§9.4).
- **`responseSpectrumAnalysis` sullo stato danneggiato**: non provato. La doc dice che le proprietà modali restano nel `Domain` e sono accessibili di lì [V], ma cosa significhi un'analisi con spettro su una tangente indefinita non è stato misurato né cercato.
- **Solutore `PythonSparse`**: esiste nella doc di `eigen` (OpenSeesPy soltanto) e permetterebbe `scipy.sparse.linalg.eigsh` con shift proprio [V]. Irrilevante finché NOVA sta sul binario Tcl; da tenere presente se si passasse a `openseespy`.
- **Buckling**: OpenSees «does not perform buckling eigenvalue analysis» [V Scott]. Se allo stato danneggiato interessasse la stabilità e non la vibrazione, `eigen` non è lo strumento.
- **Effetto del gestore dei vincoli**: la doc di Scott lo dice esplicito, «This post does not address multi-point constraints or the effect of constraint handlers on eigenvalue analysis» [V]. Il deck di NOVA usa `constraints Transformation` senza vincoli multipunto, quindi il caso non si presenta oggi — ma i diaframmi rigidi, quando arriveranno, lo aprono.

---

## Riferimenti

Sorgente OpenSees, tutti pinnati al commit **`6e55293513192aa05c7e1205e66a5a1a1ed088c4`**, che è la build del binario locale.

- **URL** https://github.com/OpenSees/OpenSees/blob/6e55293513192aa05c7e1205e66a5a1a1ed088c4/SRC/analysis/analysis/StaticAnalysis.cpp · [V] · catturata in [`fonti/opensees-staticanalysis-6e55293.md`](fonti/opensees-staticanalysis-6e55293.md)
  **perché conta qui** è il punto dove `eigen` costruisce K e M quando esiste un'analisi statica, cioè dopo una pushover
  **cosa se ne prende** righe 267-278: K viene da `addKtToTang(1.0)`, cioè dalla tangente corrente; righe 243-254: `domainChanged()` a ogni cambio di stamp; riga 569: `setEigenSOE` azzera lo stamp e questo spiega §5

- **URL** https://github.com/OpenSees/OpenSees/blob/6e55293513192aa05c7e1205e66a5a1a1ed088c4/SRC/analysis/fe_ele/FE_Element.cpp · [V] · catturata in [`fonti/opensees-fe_element-6e55293.md`](fonti/opensees-fe_element-6e55293.md)
  **perché conta qui** l'anello fra `addKtToTang` e il tangente dell'elemento
  **cosa se ne prende** righe 352-363: `const Matrix& Kt = myEle->getTangentStiff()` — nessuna via alla rigidezza iniziale

- **URL** https://github.com/OpenSees/OpenSees/blob/6e55293513192aa05c7e1205e66a5a1a1ed088c4/SRC/analysis/integrator/EigenIntegrator.cpp · [V] · catturata in [`fonti/opensees-eigenintegrator-6e55293.md`](fonti/opensees-eigenintegrator-6e55293.md)
  **perché conta qui** la via alternativa (analisi transitoria) all'assemblaggio di K
  **cosa se ne prende** righe 191-196: `formEleTangK` = `zeroTangent()` + `addKtToTang(1.0)`, stessa tangente corrente

- **URL** https://github.com/OpenSees/OpenSees/blob/6e55293513192aa05c7e1205e66a5a1a1ed088c4/SRC/tcl/commands.cpp · [V] · catturata in [`fonti/opensees-commands-6e55293.md`](fonti/opensees-commands-6e55293.md)
  **perché conta qui** è il comando `eigen` del binario Tcl che NOVA usa, non il ramo OpenSeesPy
  **cosa se ne prende** righe 5678-5713: l'elenco completo delle opzioni in 3.8.0 (`standard` e `generalized` ci sono, `-initial` no); righe 5729-5765: senza analisi `eigen` se ne crea una transitoria da sé; righe 5847-5866: `return TCL_OK` anche quando la soluzione fallisce — il degenere C di §6

- **URL** https://github.com/OpenSees/OpenSees/blob/6e55293513192aa05c7e1205e66a5a1a1ed088c4/SRC/system_of_eqn/eigenSOE/FullGenEigenSolver.cpp · [V] · catturata in [`fonti/opensees-fullgeneigensolver-6e55293.md`](fonti/opensees-fullgeneigensolver-6e55293.md)
  **perché conta qui** è il solutore che NOVA ha già scelto nel passo modale
  **cosa se ne prende** righe 172-175 LAPACK `dggev`; 194-210 gli autovalori negativi passano senza avviso, solo i complessi lo hanno; 213-247 la normalizzazione a massa, che **contraddice** la doc ufficiale

- **URL** https://github.com/OpenSees/OpenSees/blob/6e55293513192aa05c7e1205e66a5a1a1ed088c4/SRC/system_of_eqn/eigenSOE/ArpackSolver.cpp · [V] · catturata in [`fonti/opensees-arpacksolver-6e55293.md`](fonti/opensees-arpacksolver-6e55293.md)
  **perché conta qui** spiega perché il solutore di default dipende dal comando `system` dell'analisi
  **cosa se ne prende** righe 28-29 e 254-278: ARPACK usa la `LinearSOE` dell'analisi per i propri solve — il `system BandGeneral` del deck NOVA fa parte del problema agli autovalori

- **URL** https://github.com/OpenSees/OpenSees/blob/6e55293513192aa05c7e1205e66a5a1a1ed088c4/SRC/domain/domain/DomainModalProperties.cpp · [V] · catturata in [`fonti/opensees-domainmodalproperties-6e55293.md`](fonti/opensees-domainmodalproperties-6e55293.md)
  **perché conta qui** è `modalProperties`, cioè l'unica uscita strutturata di frequenze e massa partecipante che NOVA legge
  **cosa se ne prende** riga 462-464: senza autovalori è `DMP_ERR` → `exit(-1)` (degenere E); righe 605-622: M riassemblata da elementi e nodi, indipendente dal danno; righe 935 e 1044: `omega = sqrt(lambda)` senza guardia → i `nan` di §4

- **URL** https://github.com/OpenSees/OpenSees/blob/6e55293513192aa05c7e1205e66a5a1a1ed088c4/SRC/domain/domain/Domain.cpp · [V] · catturata in [`fonti/opensees-domain-6e55293.md`](fonti/opensees-domain-6e55293.md)
  **perché conta qui** chiude il degenere «modalProperties senza eigen»
  **cosa se ne prende** righe 2362-2364: `Domain::getEigenvalues` stampa «Eigenvalues were never set» e fa `exit(-1)` — il messaggio misurato con exit 255

- **URL** https://github.com/OpenSees/OpenSees/blob/6e55293513192aa05c7e1205e66a5a1a1ed088c4/SRC/material/uniaxial/Concrete02.cpp · [V] · catturata in [`fonti/opensees-concrete02-6e55293.md`](fonti/opensees-concrete02-6e55293.md)
  **perché conta qui** è il legame del calcestruzzo di NOVA (`nova/legami.py:189-196`), e la sua tangente è il cuore dello sbandamento di §3
  **cosa se ne prende** riga 481 tangente della parabola `Ec0(1−ε/εc0)`, negativa dopo il picco; 487 ramo discendente costante negativo; 451 e 493 `1,0e-10` invece di zero; 219-229 lo scarico torna a `ec0`; 180 con Δε nullo la tangente non si ricalcola; 308-320 e 335 la tangente è uno stato committato

- **URL** https://github.com/OpenSees/OpenSees/blob/6e55293513192aa05c7e1205e66a5a1a1ed088c4/SRC/analysis/integrator/DisplacementControl.cpp · [V] · catturata in [`fonti/opensees-displacementcontrol-6e55293.md`](fonti/opensees-displacementcontrol-6e55293.md)
  **perché conta qui** è l'integratore della pushover di NOVA, e il suo `domainChanged` è l'anello che spiega §5
  **cosa se ne prende** righe 515-522: `domainChanged()` applica il carico a λ+1, riforma lo sbilanciamento per ricostruire `phat`, e poi rimette il tempo — con il commento «this assumes unbalance at last was 0»

- **URL** https://opensees.github.io/OpenSeesDocumentation/user/manual/analysis/eigen.html · [V] · catturata in [`fonti/opensees-doc-eigen.md`](fonti/opensees-doc-eigen.md)
  **perché conta qui** è la doc ufficiale del comando, e contiene l'avvertimento sul contrappunto fra solutori
  **cosa se ne prende** i tre solutori con il limite «N−1 eigenvalues, where N is the number of inertial DOFs» per ARPACK; `-symmBandLapack` risolve solo il problema standard; e la prescrizione «switch the solver used and check the results again», che §3.1 esegue

- **URL** https://opensees.github.io/OpenSeesDocumentation/user/manual/analysis/modalProperties.html · [V] · catturata in [`fonti/opensees-doc-modalProperties.md`](fonti/opensees-doc-modalProperties.md)
  **perché conta qui** definisce il rapporto a dieci blocchi che `nova/modale.py` già legge
  **cosa se ne prende** «can be used only if a previous call to eigen has been performed»; la massa è letta dal modello (nodale + elemento, lumped o consistente); la nota sulla normalizzazione e sul ruolo di `-unorm`, che NOVA passa già

- **URL** https://portwooddigital.com/2021/11/09/eigenvalues-during-an-analysis/ · [V] · catturata in [`fonti/portwood-eigenvalues-during-an-analysis.md`](fonti/portwood-eigenvalues-during-an-analysis.md)
  **perché conta qui** è la fonte che risponde direttamente alla domanda del ticket
  **cosa se ne prende** «OpenSees will assemble the current tangent stiffness into the eigenvalue solver each time `eigen` is called» e «This procedure will also work in a static pushover analysis, just be sure to define mass»; e il consiglio di S. Mazzoni di chiamare `eigen` ogni N passi invece che a ogni passo — che §5 corollario 1 mostra non essere gratis

- **URL** https://portwooddigital.com/2026/01/27/why-your-eigenvalue-analysis-failed/ · [V] · catturata in [`fonti/portwood-why-your-eigenvalue-analysis-failed.md`](fonti/portwood-why-your-eigenvalue-analysis-failed.md)
  **perché conta qui** è il catalogo dei messaggi d'errore di `eigen`, del 27/01/2026, il più aggiornato
  **cosa se ne prende** la tabella errore → causa → rimedio (`info = -3`, `-9`, `-9999`, «Maximum iterations», autovalore negativo); «Physically, the negative eigenvalue means the model has modes of deformation that do not generate any resisting force»; il limite pratico «roughly half of the available modes» con DOF misti statici/dinamici

- **URL** https://portwooddigital.com/2022/11/11/another-way-to-get-bad-eigenvalues/ · [V] · catturata in [`fonti/portwood-another-way-to-get-bad-eigenvalues.md`](fonti/portwood-another-way-to-get-bad-eigenvalues.md)
  **perché conta qui** collega rigidezza negativa e autovalore negativo su un modello a **fibre**, che è il caso di NOVA
  **cosa se ne prende** «If negative mass can lead to negative eigenvalues, it follows that negative stiffness can lead to the same outcome», con l'esempio delle aree di fibra negative da patch definita in senso orario — un degenere che il generatore di sezioni di NOVA deve continuare a escludere

- **URL** https://portwooddigital.com/2022/11/10/one-way-to-get-bad-eigenvalues/ · [V] · catturata in [`fonti/portwood-one-way-to-get-bad-eigenvalues.md`](fonti/portwood-one-way-to-get-bad-eigenvalues.md)
  **perché conta qui** l'altra metà del degenere: la massa
  **cosa se ne prende** la massa negativa da `Pgrav/g` con `Pgrav` già negativo — controllo che vale la pena mettere nel Check Model quando NOVA convertirà carichi in masse

- **URL** https://portwooddigital.com/2025/12/30/eigen-almost-hear-you-sigh/ · [V] · catturata in [`fonti/portwood-eigen-almost-hear-you-sigh.md`](fonti/portwood-eigen-almost-hear-you-sigh.md)
  **perché conta qui** dice quando ARPACK dà autovettori sbagliati pur restituendo autovalori giusti
  **cosa se ne prende** i modi ripetuti o quasi-ripetuti accoppiano gli autovettori fra direzioni ortogonali pur restando M-ortonormali — rischio concreto su un telaio simmetrico, e motivo in più per il contrappunto con `-fullGenLapack`

- **URL** https://portwooddigital.com/2020/11/13/ordinary-eigenvalues/ · [V] · catturata in [`fonti/portwood-ordinary-eigenvalues.md`](fonti/portwood-ordinary-eigenvalues.md)
  **perché conta qui** spiega cosa sia `-standard`, l'opzione che il ticket chiede di provare
  **cosa se ne prende** `eigen standard -symmBandLapack` è la decomposizione spettrale di K sola, «the lower the eigenvalue, the easier it is for the model to deform in the shape of the associated eigenvector»; e «OpenSees does vibration eigenvalue analysis pretty well, but does not perform buckling eigenvalue analysis»
