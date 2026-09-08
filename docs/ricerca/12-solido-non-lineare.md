# Ricerca: solutore e legame per il solido non lineare

Ricerca dell'08/09/2026 per l'issue [#35](https://github.com/maeurong/NOVA/issues/35) della mappa wayfinder [#31](https://github.com/maeurong/NOVA/issues/31), condotta da un `researcher` AFK sul ramo `research/solido-non-lineare`. Domanda posta: con quale solutore e quale legame si fa una **pushover di un solido di calcestruzzo armato** da sovrapporre alla curva del telaio a fibre, con lo stesso nodo di controllo. Candidati da esaminare: CalculiX 2.22, OpenSees su esaedri, code_aster, Kratos. Per ognuno: maturità, licenza, piattaforma macOS arm64, come si scrive il deck da Python, come si legge lo stato di danno, tempi attesi su ~50.000 elementi, e cosa costa passare da tetraedri a esaedri.

**Skill-gate.** `research` invocata (questo file ne è il prodotto); `caveman:caveman` per il report al thread; `ponytail` nominata dal brief ma qui non si scrive codice. **Deroga dichiarata**: la skill `research` prescrive di dispacciare un agente in background — il brief dice esplicitamente «Nessun subagente», quindi il lavoro è stato fatto in proprio, tenendo il resto della skill (fonti primarie, un solo file Markdown, convenzione del repo).

**Premesse del brief verificate.** Tutte vere tranne una. `docs/ricerca/06-dominio-analisi-verifiche-formati.md:80` misura davvero l'abort di `TenNodeTetrahedron` e la nota «costa meno sugli esaedri di `hexa.py`» [V]; `nova/inp.py:40` rifiuta `USER MATERIAL` in `_CARTE_VIETATE` [V]; `nova/ccx.py:1-20` lancia ccx e riusa i lettori di MeshRec, deck lineare elastico [V]; `meshrec/core/hexa.py` produce esaedri strutturati [V, §6]. **Correzione**: la convenzione dei tag non sta a `docs/ricerca/README.md:33` ma a **`README.md:17`** — dettaglio marginale, corretto e proseguito.

Tag: **[V]** verificato su fonte primaria · **[M]** misurato in sessione con il comando indicato · **[INF]** inferenza o calcolo mio · **[NON TROVATO]**. Notazione numerica italiana (virgola decimale) fuori dalle citazioni verbatim. Unità del deck: mm, N, MPa, t, s.

## Artefatti consultati

| sorgente | come | cosa |
|---|---|---|
| CalculiX 2.22 USER'S MANUAL (Dhondt, 05/08/2024) | `curl http://www.dhondt.de/ccx_2.22.pdf` (6.224.727 B) → `pdftotext -layout` (40.448 righe) | §5.15, §6.2.34-36, §6.8.11, §6.8.12, §6.8.18, §7.89-90, §8.5 |
| `ccx` 2.22 installato in `~/.local/bin/ccx` | `file`, `nm -u`, `otool -L`, `strings -a`, corse vere | binario, simboli, materiali compilati, due pushover misurate |
| OpenSees Documentation (`opensees.github.io`, sorgente `.rst` su GitHub) | `curl` | `ASDConcrete3D`, `stdBrick`, `SSPbrick`, `ASDEmbeddedNodeElement` |
| `OpenSees/OpenSees` sorgente, tag `v3.4.0`, `v3.5.0`, `v3.8.0`, `master` | `gh api` | presenza dei materiali, firma di `PlasticDamageConcrete3d`, assenza di `setResponse` |
| code_aster DocAster (nuovo portale GitLab Pages) | `curl` | r7.01.04 `ENDO_ISOT_BETON`, r7.01.08 Mazars |
| `conda-forge/code-aster`, `PyPI/KratosMultiphysics`, `conda-forge/tfel` | `curl` API JSON | piattaforme delle ruote/pacchetti |
| `KratosMultiphysics/Kratos` README e `ConstitutiveLawsApplication` | `curl`, `gh api` | licenza, catalogo legami |
| MFront/TFEL gallery (`thelfer.github.io/tfel`) | `curl` | interfaccia CalculiX, modelli Mazars e Fichant-La Borderie |
| `~/GitHub/Tesi` (sola lettura) | `sed`, `grep` | `core/hexa.py`, `core/abaqus.py`, `core/config.py`, `core/pipeline.py` |
| `~/GitHub/NOVA/lab_telaio_v2/wall_model.inp` (sola lettura) | copiato in `/tmp`, mai modificato in loco | deck vero: 14.116 nodi, 51.892 `C3D4` |

**Fonti catturate**: 9 pagine in `docs/ricerca/fonti/`, ognuna col suo `.provenance.json`.

---

## 0. La risposta in una tabella

| | CalculiX 2.22 | OpenSees 3.8 esaedri | code_aster | Kratos 10.4 |
|---|---|---|---|---|
| **macOS arm64** | **sì, già installato** [M] | **sì**, ruota `openseespymac` 3.8.0.0 `macosx_13_0_arm64` [M in `01`] | **no binario** [M: conda-forge solo `linux-64`] | **no ruota** [M: PyPI solo `manylinux_x86_64` + `win_amd64`] |
| **legame per c.a.** | `COMPRESSION ONLY` (elastico non lineare, senza compressione non lineare) + Mohr-Coulomb | **`ASDConcrete3D`** plastico-danneggiante, documentato con esempi | `ENDO_ISOT_BETON`, `MAZARS` | famiglia `d+/d-`, `plastic_damage` |
| **armatura nel solido** | **nessuna via pulita** [V: no `*EMBEDDED`, no `*REBAR`; `T3D2` viene espanso in `C3D8I`] | `truss` + `ASDEmbeddedNodeElement`, o nodi condivisi | `BARRE`/`GRILLE`, MPC | `truss` + MPC |
| **stato di danno leggibile** | solo `SDV` di una UMAT che non c'è | `damage`, `cw` (apertura di fessura), `equivalentPlasticStrain` [V] | variabili interne V1..Vn | variabili sui punti di Gauss |
| **licenza** | GPL [V, manuale] | «Commercial use … strictly prohibited» / BSD-like: **discrepanza aperta** [V in `01`] | GPL v3 | BSD-4 (clausola pubblicitaria) |
| **costo per NOVA** | **zero**: il deck lo scrive già `abaqus.write_inp` | medio: scrivere un generatore esaedri → openseespy | alto: VM/container Linux | alto: build da sorgente |
| **misurato oggi** | pushover su 51.892 elementi in **7,52 s** [M] | — (non installato: il brief vieta installazioni) | — | — |

---

## 1. Il criterio: cosa deve fare la curva del solido

La decisione dell'autore dell'08/09 è **sovrapporre la pushover del solido a quella del telaio a fibre, stesso nodo di controllo**. Questo fissa cosa la curva del solido deve saper fare, e quindi cosa scarta i candidati:

1. **Degradare per fessurazione a trazione.** Senza questo la curva è una retta e il confronto non dice niente.
2. **Portare le barre.** Il telaio a fibre ha `Steel02` che snerva; senza armatura il solido non ha né la resistenza né la duttilità del telaio, e le due curve non sono confrontabili — sono due strutture diverse. **Misurato oggi** [M, §2.4]: sullo stesso muro, a 5 mm di spostamento in sommità, il taglio alla base passa da 84.928,5 N (elastico) a 14.701,9 N (solo compressione, senza barre): 5,78 volte. Quel fattore è l'armatura mancante.
3. **Restituire uno stato leggibile** — dove ha fessurato, dove ha schiacciato — altrimenti la curva è un numero senza diagnosi, e la relazione §10.2.1 non ha cosa mostrare.
4. **Convergere in softening.** Un legame con ramo discendente perde ellitticità: serve o controllo di spostamento, o IMPL-EX, o pilotaggio.

Tenendo questi quattro assi, la ricerca sotto risponde per solutore.

---

## 2. CalculiX 2.22

### 2.0 Piattaforma: **c'è già, ed è arm64 nativo** [M]

```
$ file ~/.local/bin/ccx
/Users/mario/.local/bin/ccx: Mach-O 64-bit executable arm64
$ ~/.local/bin/ccx -v
This is Version 2.22
$ otool -L ~/.local/bin/ccx
  @rpath/libarpack.2.dylib · @rpath/liblapack.3.dylib · @rpath/libblas.3.dylib
  @rpath/libgfortran.5.dylib · @rpath/libomp.dylib · /usr/lib/libSystem.B.dylib
```

Solutore lineare: **solo SPOOLES** (statico nel binario). Le stringhe `PARDISO`, `PASTIX`, `TAUCS` esistono nel binario ma sono le parole chiave del parser: nessuna di quelle librerie è linkata [M, `otool -L`]. Licenza: GPL [V, manuale riga 30799: «the present software is protected by the GNU General Public License»].

### 2.1 Il catalogo dei legami: cosa c'è davvero

Sezione 6.8 del manuale, per intero: elasticità lineare, Ciarlet, gas ideale, iperelastici/ipofoam, **deformation plasticity**, (visco)plasticità incrementale (decomposizione moltiplicativa e additiva), Johnson-Cook, **Mohr-Coulomb**, **tension-only / compression-only**, materiali fibrorinforzati (Holzapfel), Cailletaud, anisotropia elastica con viscoplasticità o creep, **user materials** [V].

Ricerca lessicale sul manuale intero (40.448 righe) [M]:

| parola | occorrenze |
|---|---:|
| `damage` | **0** |
| `embedded` | **0** |
| `rebar` | 3 (solo argomenti inutilizzati dell'interfaccia UMAT Abaqus: «lrebar currently not used») |
| `concrete` | 20 (di cui 3 in §5.15, il resto è «concrete node», «concrete pipes») |
| `riks`, `arc-length` | **0** |

Quindi, in modo verificato per assenza: **CalculiX non ha nessun modello di danno**, nessun elemento incorporato, nessun rebar layer, e **nessun metodo arc-length**. Il controllo di spostamento resta l'unica via per una pushover — che va benissimo, perché è la via che si vuole comunque.

### 2.2 `COMPRESSION ONLY`: cosa è, e cosa non è [V]

Manuale §6.8.12: si stabilisce una relazione di tipo Hooke fra tensioni e deformazioni **principali**, sopprimendo il ramo di trazione con la stessa funzione `atan` usata per il taglio di trazione del contatto a penalità. Due costanti: `E` e il valore assoluto della **massima trazione ammessa**. La trazione non è azzerata del tutto: il massimo vale `Eε/π`, e l'utente lo fissa direttamente.

Il nome del materiale **deve iniziare** con `COMPRESSION ONLY` e si dichiara con `*USER MATERIAL, CONSTANTS=2` — ma **non è una UMAT dell'utente**: è compilata dentro `ccx`. Verificato sul binario locale [M]:

```
$ strings -a ~/.local/bin/ccx | grep umat_
umat_abaqusnl.f  umat_abaqusnl_total.f  umat_aniso_creep.f
umat_compression_only.f  umat_elastic_fiber.f  umat_johnson_cook.f
umat_lin_el_corot.f  umat_main.f  umat_single_crystal_creep.f
umat_single_crystal.f  umat_tension_only.f  …
```

Cosa **non** è, e va detto in testa perché è la sua limitazione decisiva:

- è **elastico non lineare**, non plastico e non danneggiato: nessuna variabile interna, nessuna irreversibilità, nessuna isteresi. Su una pushover monotona non si vede; su un ciclo sì.
- **non ha alcuna non linearità in compressione**: nessun picco `f_c`, nessun ramo discendente, nessuno schiacciamento. La curva può solo perdere rigidezza per fessurazione, mai per crisi del calcestruzzo compresso.
- non ha energia di frattura né regolarizzazione: la risposta dipende dalla mesh, e nulla lo segnala.
- **non produce output di danno**: il `.frd` porta `S`, `E`, `U`; `SDV` esiste ma solo per `*USER MATERIAL` con `*DEPVAR`, e `COMPRESSION ONLY` non ne dichiara.

L'unico esempio ufficiale di calcestruzzo armato del manuale (§5.15, «Reinforced concrete cantilever beam») usa `COMPRESSION ONLY` per il calcestruzzo e un **layer di `*SHELL SECTION, COMPOSITE`** per l'acciaio, con `S8R` obbligatorio, notando esplicitamente «in reality the steel is placed within the concrete in the form of bars. The modeling as a thin layer is an approximation» e «this feature is not (yet) available for beam elements» [V]. **Il composito non esiste per gli elementi solidi**: quella strada non si trasporta su una mesh 3D.

### 2.3 Mohr-Coulomb: c'è, ed è la sola plasticità con attrito

`*MOHR COULOMB` (angolo d'attrito φ, angolo di dilatanza ψ) + `*MOHR COULOMB HARDENING` (curva coesione – deformazione plastica equivalente) [V, §7.89-7.90]. Non associativa, superficie di snervamento lineare a tratti; con φ = ψ diventa associativa, con φ = ψ = 0 si riduce a Tresca. File di prova: `mohr1`, `mohr2`.

Per il calcestruzzo è una scelta **legittima ma grossolana**: descrive bene la dipendenza dalla pressione, ma non ha né cut-off di trazione né danno, quindi in trazione resta con la resistenza data dalla coesione, che per il calcestruzzo è troppa. Nessuna calibrazione NTC pubblicata è stata trovata [NON TROVATO].

### 2.4 Misura: la pushover c'è davvero, e costa poco [M]

Due deck scritti in sessione a partire dal deck vero della tesi, copiato in `/tmp` (l'originale non è stato toccato). Testa identica (nodi, `C3D4`, `NSET`), coda diversa solo nel materiale:

```
*SOLID SECTION, ELSET=ALL_WALL, MATERIAL=COMPRESSION_ONLY
*MATERIAL, NAME=COMPRESSION_ONLY
*USER MATERIAL, CONSTANTS=2
31500.0, 1.8
*DENSITY
2.5493e-09
*BOUNDARY
BASE, 1, 3
*STEP, INC=1000
*STATIC
1.0, 1.0
*DLOAD, OP=NEW
ALL_WALL, GRAV, 9810.0, 0.0, 0.0, -1.0
*NODE PRINT, NSET=BASE
RF
*END STEP
*STEP, INC=1000
*STATIC
0.05, 1.0
*DLOAD, OP=NEW
ALL_WALL, GRAV, 9810.0, 0.0, 0.0, -1.0
*BOUNDARY
TOP, 2, 2, 5.0
*NODE PRINT, NSET=BASE, FREQUENCY=1
RF
*NODE PRINT, NSET=TOP, FREQUENCY=1
U
*END STEP
```

Nota di sintassi che è costata un giro: `*SOLID SECTION` deve nominare il materiale **con lo stesso nome del `*MATERIAL`**, e la forma che funziona è quella dell'esempio del manuale, `COMPRESSION_ONLY` con il trattino basso. Con `MATERIAL=CLS` e `NAME=COMPRESSION ONLY CLS` ccx esce 201 con `*ERROR reading *SOLID SECTION: nonexistent material` [M].

Comandi e tempi (`OMP_NUM_THREADS=6`, `/usr/bin/time -p`, Mac arm64, `ccx` 2.22):

| deck | elementi | materiale | esito | tempo reale | incrementi passo 2 | iterazioni N-R |
|---|---:|---|---|---:|---:|---:|
| `trave.inp` (fixture NOVA) | 960 `C3D4` | `*ELASTIC` | exit 0, «Job finished» | **0,12 s** | 1 | — |
| `trave.inp` | 960 `C3D4` | `COMPRESSION ONLY` | exit 0 | **0,20 s** | 7 | — |
| `wall_model.inp` (deck vero) | **51.892 `C3D4`** | `*ELASTIC` | exit 0 | **1,17 s** | 1 | — |
| `wall_model.inp` | **51.892 `C3D4`** | `COMPRESSION ONLY` | exit 0 | **7,52 s** reali, 10,75 s utente | 7 | 26 |

Curva misurata sul deck vero, Σ `RF` sui 3.743 nodi di `BASE` contro lo spostamento imposto in sommità (direzione y, cioè nel piano del telaio):

| u_y sommità [mm] | 0,259 | 0,508 | 0,883 | 1,444 | 2,286 | 3,550 | 5,000 |
|---|---:|---:|---:|---:|---:|---:|---:|
| taglio alla base [N] | 2.174,8 | 4.204,0 | 6.775,4 | 9.503,0 | 11.832,0 | 13.581,0 | **14.701,9** |
| rigidezza secante [N/mm] | 8.400 | 8.270 | 7.673 | 6.580 | 5.175 | 3.826 | **2.940** |

Rigidezza secante che scende di **2,86 volte**: la fessurazione c'è e si vede. E la Σ `Rz` resta **4.248,6 N** a ogni incremento — cioè esattamente il valore documentato in `docs/caso-studio/corsa-ccx-2026-09-05.md` per il passo di gravità: **l'oracolo di equilibrio regge anche in non lineare** [M]. Stesso deck in elastico: 84.928,5 N a 5 mm, contro 14.701,9 N — 5,78 volte più rigido.

**Lettura**: la strada CalculiX è a costo zero di integrazione (il deck lo scrive già `meshrec.core.abaqus.write_inp`, i lettori `.dat`/`.frd` già ci sono in `nova/ccx.py`) e costa 7,5 s. Ma la curva che produce è quella di un **muro di calcestruzzo non armato che non può tirare**: è un limite inferiore, non la capacità della struttura.

### 2.5 `*USER MATERIAL`: le tre strade, e cosa costano [V]

Manuale §8.5: tre interfacce (nativa CalculiX, Abaqus UMAT small-strain, ABAQUSNL finite-strain) e **due** modi di introdurle:

1. **Modificare i sorgenti e ricompilare.** Si scrive `umat_<nome>.f`, si aggiunge un `elseif(amat(1:14).eq.'DRUCKER-PRAGER')` in `umat_main.f`, si aggiunge il file a `Makefile.inc`, si rigenera l'eseguibile. Costo: avere i sorgenti, una toolchain gfortran, e da lì in poi **il binario di NOVA non è più quello che l'utente ha installato**.
2. **Libreria condivisa, senza ricompilare.** Nome del materiale che inizia con `@`, nella forma `@CALCULIXBEHAVIOURS CHABOCHE` (interfaccia nativa) o `@ABAQUS ABAQUSBEHAVIOURS CHABOCHE` (interfaccia Abaqus). Il manuale indica **MFront** (`http://tfel.sourceforge.net`) come generatore che rispetta la convenzione di nomi maiuscoli richiesta.

   **Blocco misurato su questa macchina** [M]: il `ccx` installato **non ha `dlopen`/`dlsym` fra i simboli indefiniti** (`nm -u ~/.local/bin/ccx | grep -i dl` → solo `_dlaev2_`, che è LAPACK). Nessuna stringa `EXTERNAL`/`BEHAVIOUR` nel binario. **La via delle librerie condivise non è compilata in questo build**: userebbe comunque una ricompilazione di ccx.

Su MFront: la gallery TFEL contiene **Mazars** e **Fichant-La Borderie** fra i modelli di danno, più i modelli di creep del calcestruzzo (`Burger_EDF_CIWAP_2021`, Torelli) [V]. Ma **non esiste un pacchetto `tfel` su conda-forge** (`https://api.anaconda.org/package/conda-forge/tfel` → 404) [M]: su macOS arm64 andrebbe compilato dai sorgenti.

**Sul divieto in `nova/inp.py:40`**: `_CARTE_VIETATE = ("INCLUDE", "RESTART", "USER MATERIAL")`, motivato a `inp.py:35-39` come «carte che portano dentro la corsa qualcosa che non sta nel deck», incluso «codice compilato dall'utente». La motivazione è **giusta per il caso 2** (una libreria `@…` è codice arbitrario) e **troppo larga per `COMPRESSION ONLY` e `TENSION ONLY`**, che sono compilate dentro ccx e non caricano niente. Se la strada scelta fosse questa, il rifiuto va ristretto da «la carta `*USER MATERIAL`» a «un nome di materiale che non sia in una lista chiusa di nomi built-in» — cioè un allowlist, non un blocklist. Non è una decisione che prendo io: è una riga da riscrivere e un test da aggiungere se e solo se la raccomandazione del §7 viene scartata.

### 2.6 Armatura in un solido: perché in CalculiX non c'è una via pulita

Non esistono `*EMBEDDED ELEMENT` né rebar layer [V, 0 occorrenze nel manuale]. Restano tre possibilità, tutte con un difetto:

- **`T3D2` che condivide i nodi degli esaedri.** Manuale §6.2.35: «This element is similar to the B31 beam element except that it cannot sustain bending … Apart from this all what is said about the B31 element also applies». E per B31 (riga 4089): «the B31 element is expanded into a C3D8I». Cioè **i truss di CalculiX vengono espansi internamente in esaedri**, occupano volume, e nei nodi in comune con altri tipi di elemento generano automaticamente un **knot** («several types of elements participate (e.g. shells and beams)» è una delle condizioni elencate) [V]. Barre annegate così non sono barre annegate: sono un secondo solido incollato con vincoli rigidi.
- **`*EQUATION`/MPC scritti a mano** fra i nodi della barra e i nodi dell'esaedro che la contiene, con i pesi delle funzioni di forma. Fattibile, ma è scrivere a mano ciò che OpenSees offre come elemento (`ASDEmbeddedNodeElement`), e le equazioni vanno generate per ogni nodo di barra, con localizzazione del punto nell'esaedro.
- **Smeared**: un `*ELSET` di esaedri con un materiale «calcestruzzo + acciaio omogeneizzato». Serve una UMAT → §2.5.

---

## 3. OpenSees su esaedri

### 3.0 Piattaforma: **sì, e la ruota c'è** [M in `01`]

`openseespymac` 3.8.0.0, ruota `py3-none-macosx_13_0_arm64`, 10.115.801 byte, `opensees.so` 29.508.704 byte; misurata funzionante anche su Python 3.14.7 nonostante la doc dica 3.12 [M, `docs/ricerca/01-opensees-integrazione.md:39-45`]. Il binario Tcl ARM di Berkeley esiste e gira [M, `01:55`]. **Nessuna installazione fatta in questa sessione**: il brief lo vieta, e i numeri di `01` sono già misurati.

**Licenza: la discrepanza resta aperta** — `COPYRIGHT` nel repo dice uso non commerciale, `license.rst` dice BSD-like [V, `01:168-181`]. Sta a monte di questa ricerca; non la riapro.

### 3.1 Quale esaedro: `SSPbrick` è l'equivalente di `C3D8I`

| elemento | integrazione | difetti | recorder |
|---|---|---|---|
| `stdBrick` | piena, 8 punti | **shear locking** su problemi flessionali | `'forces'`, `'stresses'`, `'strains'`, `'material $matNum <arg>'` [V] |
| `bbarBrick` | B-bar | corregge il locking **volumetrico**, non quello a taglio | idem |
| `SSPbrick` | **punto singolo stabilizzato** (enhanced assumed strain) | doc: «free from volumetric and shear locking … greater coarse mesh accuracy in bending dominated problems … Analysis times are generally faster than corresponding full integration elements» [V] | direttamente le risposte dell'`nDMaterial`: `'stress'`, `'strain'`, … |

Questa è la corrispondenza che chiude il cerchio con MeshRec. `meshrec/core/config.py:648-655` sceglie **`C3D8I` per default** con questa motivazione scritta: «un telaio lavora a flessione. C3D8 a integrazione piena si irrigidisce a taglio e restituisce spostamenti troppo piccoli, un errore invisibile guardando la mesh; C3D8R ha il problema opposto, i modi a clessidra» [V]. È **esattamente** il criterio che porta a `SSPbrick` e non a `stdBrick`: `C3D8I` (modi incompatibili) e `SSPbrick` (deformazioni assunte migliorate) risolvono lo stesso problema con due formulazioni della stessa famiglia. [INF] sull'equivalenza numerica — non l'ho misurata — ma la motivazione di progetto è la stessa, scritta da entrambe le parti.

Un punto di Gauss invece di otto significa anche **1/8 delle valutazioni del legame costitutivo**: su un legame plastico-danneggiante non è un dettaglio.

Tutti e tre accettano forze di volume `<$b1 $b2 $b3>` nella riga dell'elemento [V]: la gravità sul solido si mette lì, senza `eleLoad`.

### 3.2 `ASDConcrete3D`: il legame che risponde alla domanda [V]

`nDMaterial ASDConcrete3D $tag $E $v <-rho> <-fc> <-ft> <-Te -Ts <-Td>> <-Ce -Cs <-Cd>> <-implex> <-implexControl …> <-crackPlanes $nct $ncc $ang> <-eta> <-tangent> <-autoRegularization $lch_ref> <-Kc> <-cdf>`

Modello plastico-danneggiante di continuo, di M. Petracca (ASDEA Software), pubblicato in Petracca et al. 2022. Quel che conta qui:

- **Danno separato in trazione e compressione**, con leggi di incrudimento/softening date per punti (`-Te/-Ts/-Td`, `-Ce/-Cs/-Cd`) oppure **generate automaticamente da `fc` e `ft`**. Due numeri e si parte; poi si raffina con le curve NTC.
- **`-autoRegularization $lch_ref`**: l'area sotto la legge di softening viene trattata come energia di frattura e divisa per la lunghezza caratteristica dell'elemento. È la risposta alla dipendenza patologica dalla mesh che `ENDO_ISOT_BETON` dichiara come proprio limite (§4).
- **`-implex`**: schema misto implicito-esplicito (Oliver et al. 2008) per far convergere il softening, con `-implexControl $tol $limit` che fa **fallire il materiale** quando l'errore supera la tolleranza, così un passo adattivo può ridurre l'incremento. È esattamente il meccanismo che serve a una pushover con ramo discendente.
- «This makes it fast and robust, suitable for the simulation of large-scale structures» — la rivendicazione è del manuale, non mia.
- **`-Kc`** (forma della superficie in compressione triassiale) e **`-cdf`** (dilatanza; «0 is the optimal value for concrete»).

**Lettura dello stato di danno** — è la voce su cui questo materiale batte tutti gli altri [V]:

| risposta | componenti | cosa dice |
|---|---|---|
| `damage` / `Damage` | 2 (d⁺, d⁻) | danno di fessurazione in trazione e compressione |
| `equivalentPlasticStrain` | 2 | deformazioni plastiche equivalenti |
| `equivalentTotalStrain` | 2 | |
| `cw` / `crackWidth` | 1 | **apertura di fessura**: deformazione totale equivalente oltre la soglia, per la lunghezza caratteristica dell'elemento |
| `crackInfo $Nx $Ny $Nz` | 2 (ID, X) | il piano di fessura con normale più vicina alla direzione data |
| `crushInfo $Nx $Ny $Nz` | 2 | lo stesso per la compressione |

Con `-crackPlanes $nct $ncc $ang` le variabili interne diventano anisotrope, memorizzate su piani di fessura. Le varianti `-avg` danno la media invece del massimo sui piani.

**Maturità**: entrato con la PR #1087 (09/12/2022), migliorato con #1201 (05/2023), #1234, #1396 (04/2024, cross-damage-factor); ultimo commit al file **18/12/2023** [M, `gh api`]. **Nessuna issue aperta** che lo nomini (6 issue, tutte chiuse) [M]. Presente nel sorgente da **v3.5.0** (11/05/2023) — verificato per assenza in `v3.4.0` e presenza in `v3.5.0` — e presente in **v3.8.0** [M, `gh api contents … ?ref=…`]. La ruota `openseespymac` 3.8.0.0 è costruita dallo stesso albero, quindi lo contiene [INF]: si verifica in un minuto con `ops.nDMaterial('ASDConcrete3D', 1, 30000.0, 0.2, '-fc', 25.0, '-ft', 2.0)`.

Documentazione completa, con figure ed **esempi Python eseguibili** distribuiti nel repo della doc (`ASDConcrete3D_MakeLaws.py` genera le leggi tipiche per calcestruzzo ordinario; `ASDConcrete3D_Ex_CyclicUniaxialTension.py` e `…Compression.py` le provano in uniassiale) [V].

### 3.3 `PlasticDamageConcrete3d`: sconsigliato, e per due ragioni verificabili

Firma, dal sorgente: `nDMaterial PlasticDamageConcrete3d $tag $E $nu $ft $fc <$beta $Ap $An $Bn>`, default `beta=0,6`, `Ap=0,5`, `An=2,0`, `Bn=0,75`. Intestazione: «Written in Matlab: Thanh Do — Created: 07/16» [V, `SRC/material/nD/PlasticDamageConcrete3d.cpp`, tag `v3.8.0`].

1. **Non è documentato**: nella cartella `source/user/manual/material/ndMaterials` della doc ufficiale non esiste alcun `PlasticDamageConcrete*.rst` [M, `gh api contents`]. Nessuna nota su come calibrare `beta`, `Ap`, `An`, `Bn`.
2. **Il danno non si può registrare.** Il file **non definisce `setResponse`** (`grep -c setResponse` → 0 sulle 750 righe) [M]: eredita quello di `NDMaterial`, che espone tensione, deformazione e tangente. Le variabili `dp` e `dn` che il codice calcola (righe 390-417) restano interne e invisibili al recorder. Sul criterio 3 del §1, cade.

Esiste nello stesso albero, quindi come **secondo legame per un confronto incrociato** è gratis; come legame principale no.

### 3.4 L'armatura: `ASDEmbeddedNodeElement`, o i nodi condivisi [V]

`element ASDEmbeddedNodeElement $eleTag $Cnode $Rnode1 $Rnode2 $Rnode3 <$Rnode4> <-rot> <-p> <-K $K> <-KP $KP>`

È un vincolo, implementato come elemento perché in OpenSees un MPC può avere un solo nodo ritenuto. Impone che lo spostamento del nodo vincolato sia la **media pesata con le funzioni di forma** degli spostamenti dei nodi ritenuti, con il metodo delle penalità. In 3D su un solido i ritenuti sono **4, un tetraedro**. La penalità di default è 1,0e18, ma la doc raccomanda `-K` con un valore «equal to, or slightly larger than the Young's modulus», automaticamente moltiplicato per il volume del dominio così da restare indipendente dalla mesh. Nota esplicita: «it does not mean that you cannot embed a node in a … hexaedron. You just need to find the sub-tetrahedron … that contains the constrained node» [V].

Quindi la barra si modella come catena di `element truss` con `uniaxialMaterial Steel02`/`ReinforcingSteel` e area = area della barra, i cui nodi sono agganciati alla mesh con un `ASDEmbeddedNodeElement` ciascuno. Costo di attuazione: localizzare ogni nodo di barra nel suo esaedro e scegliere il sotto-tetraedro. Presente in `v3.8.0` (`SRC/element/CEqElement/`) [M].

**Alternativa più pigra, che la mesh di `hexa.py` rende disponibile**: la mesh è **strutturata per estrusione** lungo l'asse della membratura (§6), quindi i nodi giacciono su linee rette parallele all'asse. Una barra longitudinale posata su una di quelle linee di nodi è una catena di `truss` che **condivide i nodi degli esaedri**, senza alcun vincolo: aderenza perfetta, zero penalità, zero localizzazione. Il prezzo è che il copriferro si arrotonda alla linea di nodi più vicina, e che le staffe (trasversali) non hanno linee altrettanto comode. [INF] — non misurato, ma discende dalla costruzione di `mesh_prisma`.

### 3.5 Il deck da Python, e la lettura

Nessun lettore di `.inp` in OpenSees [V, già in `06`]: il modello si costruisce con chiamate. Due forme, entrambe fuori processo (vincolo architetturale già chiuso da `01`, `03`, `05`):

- `openseespy`: `ops.node(...)`, `ops.element('SSPbrick', ...)`, `ops.nDMaterial('ASDConcrete3D', ...)` in un worker. Costo di costruzione misurato: **0,23 s per 51.840 elementi** [M, `01:221`].
- Tcl generato e passato al binario: artefatto diffabile, isolamento del processo.

Lo stato di danno si legge in due modi: `recorder Element -eleRange 1 N -file danno.out material 1 damage` (su `stdBrick`, `$matNum` è il punto di Gauss) oppure `damage` diretto su `SSPbrick`; o `ops.eleResponse(tag, 'material', 1, 'damage')` passo per passo dal worker. Per 50.000 elementi × 100 passi il recorder su file è dell'ordine dei 10⁷ numeri: conviene registrare per `eleRange` ridotti o campionare i passi. [INF]

La pushover: `integrator('DisplacementControl', nodoControllo, dof, du)`, `analysis('Static')`, taglio alla base da `ops.reactions()` sui nodi vincolati — **la stessa forma della pushover del telaio a fibre**, che è precisamente ciò che rende le due curve sovrapponibili senza post-processing ad hoc.

### 3.6 Tempi attesi su ~50.000 elementi [INF]

Non misurabili in sessione (nessuna installazione). Base misurata da cui si estrapola [M, `01:221`]: **51.840 `FourNodeTetrahedron` lineari elastici, 11.016 nodi (~32,8k DOF), statica in 0,47 s**, `system UmfPack`, `algorithm Linear`, single-thread, RSS 1,67 GB su `eigen(20)`.

Estrapolazione, dichiarata come tale:

- una mesh **esaedrica** dello stesso volume ha circa 1/5 degli elementi di una tetraedrica a pari passo (5-6 tetraedri per esaedro), ma un numero di nodi paragonabile: il costo per fattorizzazione resta dello stesso ordine, ~0,5 s;
- una pushover a 100 incrementi con 4-6 iterazioni di Newton per incremento sono **400-600 fattorizzazioni** → **3-5 minuti** solo di solutore;
- va aggiunto il costo del legame: `SSPbrick` valuta `ASDConcrete3D` **una volta per elemento**, `stdBrick` otto. Con IMPL-EX il legame è esplicito e non itera al livello costitutivo (rivendicazione del manuale [V]).

Ordine di grandezza atteso: **minuti, non ore, ma neppure i 7,5 s di CalculiX**. Il confronto onesto con i 7,52 s misurati su ccx è: ccx fa 7 incrementi e 26 iterazioni con un legame elastico non lineare; una pushover strumentata ne farà 10-20 volte tanto con un legame che itera. [INF]

---

## 4. code_aster

### 4.0 Piattaforma: **nessun binario macOS, e va detto qui** [M]

`https://api.anaconda.org/package/conda-forge/code-aster`: `latest_version` 18.0.12, **un solo `subdir`: `linux-64`**. Nessun `osx-arm64`, nessun `osx-64`, nessun `win-64`. Il README del repo sorgente rimanda a **container Singularity** per l'installazione [V]. Su macOS arm64 significa: macchina virtuale Linux, o container, o niente. Costo che nessun legame giustifica da solo.

Il portale della documentazione è stato **rifatto**: i vecchi URL `https://www.code-aster.org/V2/doc/…` rispondono 404 [M]. La documentazione vive ora su `https://codeaster.gitlab.io/doc/docaster/manuals/man_r/…`.

### 4.1 `ENDO_ISOT_BETON` (r7.01.04): il limite è scritto nel documento [V]

Verbatim dal §1 «Introduction – Domaine d'application»:

> «cette loi d'endommagement vise à décrire la rupture du béton en traction; elle n'est donc **pas du tout adaptée** à la description du comportement non linéaire du béton en compression. Elle suppose donc que le béton reste dans un état de compression modéré.»

E, sulla convergenza:

> «La loi ENDO_ISOT_BETON présente de l'adoucissement, ce qui entraîne généralement une perte d'ellipticité … d'où une **dépendance pathologique au maillage**.»
> «le caractère adoucissant … entraîne également l'apparition d'instabilités … qui se traduisent par des snap-backs sur la réponse globale et rendent le **pilotage du chargement indispensable en statique**. Le pilotage de type PRED_ELAS [R5.03.80] apparaît alors comme le mode de contrôle du chargement le plus adapté.»

Danno scalare isotropo da 0 a 1, con distinzione trazione/compressione e **ripristino di rigidezza alla richiusura delle fessure**. Nessuna regolarizzazione integrata: va accoppiata a un modello non locale.

Detto in chiaro: **`ENDO_ISOT_BETON` ha lo stesso limite di `COMPRESSION ONLY` di CalculiX** (niente non linearità in compressione), ma con in più il danno vero e la richiusura, e in meno la semplicità.

### 4.2 Mazars (r7.01.08) [V]

Modello 3D isotropo elasto-danneggiante con criterio scritto in deformazione e dissimmetria trazione-compressione. Il documento dichiara: il modello originale non rende conto del ripristino di rigidezza alla richiusura, né delle deformazioni plastiche o degli effetti viscosi; la versione in code_aster è **riformulata** per descrivere meglio bi-compressione e taglio puro. La versione 1D con richiusura esiste **solo per le travi multifibra** (R5.03.09) [V] — non per il solido. Il documento ha una sezione «1.2 Limites et méthodes de régularisation» e una «4.5 Variables internes stockées», che è dove si legge il danno.

### 4.3 Verdetto

Il catalogo di legami è il migliore dei quattro, la documentazione è la più seria (ogni legge ha un documento R con teoria, identificazione dei parametri, validazione). Ma per NOVA su macOS arm64 il prezzo d'ingresso è una macchina Linux, un formato di comando (`.comm`) e un formato di mesh (MED) nuovi, e un post-processing nuovo. **Per questa tesi non si giustifica.** Vale come riferimento di letteratura per motivare le scelte di legame, non come solutore.

---

## 5. Kratos Multiphysics

### 5.0 Piattaforma: **nessuna ruota macOS, e va detto qui** [M]

`https://pypi.org/pypi/KratosMultiphysics/json`, versione **10.4.3 del 03/07/2026**: 14 file, tutti `manylinux_2_28_x86_64` o `win_amd64`, per cp38…cp314. **Nessuna ruota `macosx_*`**, né arm64 né x86_64. Il README dichiara «**Kratos** is __multiplatform__ and available for __Windows, Linux__ (several distros) and __macOS__» [V] — vero per la compilazione dai sorgenti, falso per l'installazione da ruota. Su macOS arm64: build da sorgente con CMake, Boost, e la lista delle applicazioni scelte.

Licenza **BSD-4** (con clausola pubblicitaria) [V, README e `kratos/license.txt`], più permissiva di GPL ma con l'obbligo di menzione.

### 5.1 Il catalogo [V]

`applications/ConstitutiveLawsApplication/custom_constitutive/small_strains/` è organizzato in `damage`, `plastic_damage`, `plasticity`, `viscoplasticity`, `fatigue`, `viscous`, `anisotropy_orthotropy`, `linear`. Dentro `damage`: `generic_small_strain_d_plus_d_minus_damage`, `d_plus_d_minus_damage_masonry_3d`, `generic_small_strain_isotropic_damage`, `small_strain_isotropic_damage_implex_3d`, `generic_small_strain_orthotropic_damage`, più le varianti in stato piano. È la stessa famiglia teorica di `ASDConcrete3D` (d⁺/d⁻ con IMPL-EX), il che non sorprende: sono gli stessi autori della scuola di Barcellona/Pescara.

### 5.2 Verdetto

Offre più o meno lo stesso legame che OpenSees offre già, dietro una build da sorgente e un modello di programmazione nuovo (`ProjectParameters.json`, `ModelPart`, `.mdpa`). Non compra niente che non ci sia già.

---

## 6. Cosa costa passare da tetraedri a esaedri: `hexa.py` letto davvero

`~/GitHub/Tesi/meshrec/src/meshrec/core/hexa.py`, 51.419 byte, letto in sola lettura.

**Cosa produce.** Non una mesh esaedrica di una nuvola: **prismi di membratura**. `mesh_prisma(contorno, origine, asse, lunghezza, cfg)` costruisce la sagoma di sezione nel piano locale, la fa ricombinare da **gmsh** in quadrilateri (`setRecombine`), la **estrude a strati** (`extrude(..., numElements=[strati], recombine=True)`) e poi ruota e trasla il prisma al suo posto con numpy. Il modulo lo dice di sé: «hexa.py **costruisce e non misura**: riceve da wall.py sezioni, assi e lunghezze già misurati e ne fa una mesh» [V, `hexa.py:1-6`]. L'ingresso sono quindi le **membrature del prior** (`12_wall.json`), non la nuvola.

Conseguenze che contano per questa domanda:

1. **La mesh è strutturata per estrusione.** I nodi giacciono su linee parallele all'asse della membratura. È ciò che rende praticabile l'armatura a nodi condivisi (§3.4).
2. **`min_layers` ≥ 3, imposto dal codice.** `passo_di_mesh` prende la dimensione minima della sezione e la divide per `min_layers`; il passo chiesto in configurazione «viene quindi ridotto fin dove serve, mai alzato» [V, `hexa.py:36-68`, `config.py:657-666`]. Con tre strati nello spessore la mesh esaedrica di un telaio è **molto più povera** dei 51.892 tetraedri del deck as-built: si guadagna un ordine di grandezza sul costo, si perde in dettaglio geometrico.
3. **`C3D8I` per default** [V, `config.py:648-655`] — vedi §3.1 per la mappatura a `SSPbrick`.
4. **Le membrature adiacenti non combaciano nodo a nodo.** `hexa.costruisci`: «ciascuna ha il passo della propria sezione, e due sezioni diverse danno due passi diversi — quindi il legame è un `*TIE` fra le superfici a contatto e non una fusione di nodi. **La mesh conforme multiblocco resta la via d'aggiornamento**» [V, `hexa.py:756-768`; il `*TIE` lo scrive `abaqus.py:183`].

   **Questo è il costo vero del passaggio a OpenSees**, e non è nella lista del ticket: **OpenSees non ha `*TIE`**. Un vincolo superficie-superficie fra due mesh non conformi in OpenSees si fa con contatto (`zeroLengthContactASDimplex`, `SimpleContact3D`) o con `ASDEmbeddedNodeElement` nodo per nodo — cioè si riscrive. Le tre uscite: (a) rendere conforme la mesh alle giunzioni (la «via d'aggiornamento» che il codice già indica), (b) agganciare i nodi della superficie minore con `ASDEmbeddedNodeElement` sui tetraedri della maggiore, (c) restare su CalculiX, dove il `*TIE` c'è. [INF]
5. **Il percorso parametrico non è mai stato eseguito sulla nuvola vera.** `pipeline.py:332-334`, commento nel codice: «se la generazione fallisce (**sulla nuvola vera fallisce, perché il prior non accetta membrature**), la cartella figlia non deve nascere…». Quindi non esiste oggi un deck esaedrico del caso studio, e **il numero di esaedri che ne uscirebbe è [NON TROVATO]** — non l'ho stimato perché dipende dalle sezioni misurate, che il prior oggi non produce. Prima di qualunque scelta di solutore su esaedri, questo va sbloccato.
6. `abaqus.write_inp` scrive **solo il maglio**: `*HEADING`, `*NODE`, `*ELEMENT`, `*NSET`, `*SURFACE`, `*TIE`, `*ELSET`. «Niente sezione, materiale, vincolo, passo, carico: sono decisioni di chi analizza» [V, `abaqus.py:59-77`]. Materiale e passi li aggiunge chi lancia — che è precisamente il punto d'innesto del §2.4.

---

## 7. Raccomandazione per NOVA

**Raccomandazione, non decisione.**

### Strada principale: OpenSees su `SSPbrick` + `ASDConcrete3D` + barre `truss`

È l'unica delle quattro che soddisfa tutti e quattro i criteri del §1 senza compromessi:

- **degrada** con danno separato trazione/compressione, regolarizzato con l'energia di frattura (`-autoRegularization`);
- **porta le barre** con `truss` + `Steel02`, agganciate con `ASDEmbeddedNodeElement` o — più pigro e più preciso — condividendo i nodi della mesh estrusa di `hexa.py`;
- **restituisce lo stato**: `damage`, `crackWidth`, `crushInfo` — cioè una mappa di fessurazione da mettere nella relazione, non solo una curva;
- **converge in softening** con IMPL-EX e controllo di spostamento;
- e in più: **stessa forma di pushover del telaio a fibre** (`DisplacementControl` sullo stesso nodo, taglio alla base da `reactions()`), stesso processo worker già progettato, stessa ruota `openseespymac` già misurata su questa macchina. Le due curve escono dallo stesso codice di post-processing.

Costo onesto: un generatore di modello esaedrico → openseespy (poche centinaia di righe, il modello dati c'è già), il posizionamento delle barre, e la risoluzione del `*TIE` alle giunzioni (§6 punto 4). Più il prerequisito del §6 punto 5.

### Piano B: CalculiX 2.22 con `COMPRESSION ONLY`, come **limite inferiore misurato**

Non è un ripiego di comodo: è un risultato che **esiste già oggi** e che ho misurato in questa sessione. 7,52 s sul deck vero, curva con rigidezza secante che cala di 2,86 volte, equilibrio verticale che regge a 4.248,6 N su tutti gli incrementi. Costa: quattro carte in coda al deck che `abaqus.write_inp` già produce, e una riga da riscrivere in `nova/inp.py:40` (da blocklist della carta ad allowlist dei nomi built-in, §2.5).

Va però **etichettato per quello che è**: la capacità di un muro di calcestruzzo non armato che non resiste a trazione. Sovrapposto alla curva del telaio a fibre è un **limite inferiore**, e la distanza fra i due (misurata: 5,78 volte fra elastico e non lineare senza barre) è il contributo dell'armatura. Come confronto è onesto solo se il grafico lo dichiara.

### Non raccomandati, con la ragione

- **code_aster**: catalogo e documentazione migliori di tutti, ma nessun binario macOS arm64 (solo `linux-64` su conda-forge, container Singularity). E `ENDO_ISOT_BETON` ha lo stesso limite in compressione di `COMPRESSION ONLY`.
- **Kratos**: nessuna ruota macOS su PyPI; offre la stessa famiglia d⁺/d⁻ che OpenSees ha già.
- **`PlasticDamageConcrete3d`**: non documentato e **il danno non è registrabile** (nessun `setResponse`). Utile solo come secondo legame per un confronto incrociato.
- **UMAT/MFront su CalculiX**: il `ccx` installato non ha `dlopen` — la via delle librerie condivise passa comunque per una ricompilazione, e TFEL non ha pacchetto conda-forge. Due build da sorgente per arrivare dove `ASDConcrete3D` arriva con `pip install`.

---

## 8. Domande aperte per l'autore

1. **Il modello esaedrico del caso studio esiste?** `pipeline.py:333` dice che il percorso parametrico fallisce sulla nuvola vera perché il prior non accetta membrature. Senza quel deck, la strada esaedrica non ha un ingresso. È un blocco da sbloccare prima, o si accetta di lavorare su una geometria sintetica?
2. **Le giunzioni: `*TIE` o mesh conforme?** `hexa.py:756-768` dichiara la mesh conforme multiblocco come «via d'aggiornamento». Su OpenSees il `*TIE` non esiste. Renderla conforme risolve il problema in un colpo solo per entrambi i solutori — vale la pena farlo ora?
3. **Da dove vengono le armature del solido?** Il telaio a fibre le prende da `ArmaturaConfig`/tavola `MURO 1`. Il solido ha bisogno delle stesse barre, con posizione 3D. Si riusa la stessa sorgente, o il solido usa un'armatura semplificata dichiarata come tale?
4. **La curva del solido è un risultato o un controllo?** Se è un controllo di codice (livello 5 di validazione), il piano B a 7,5 s basta e avanza. Se è un risultato di tesi da mettere accanto alla curva del telaio, serve la strada principale. Le due letture portano a due quantità di lavoro molto diverse.
5. **`nova/inp.py:40`**: se il piano B entra anche solo come confronto, il rifiuto di `*USER MATERIAL` va ristretto. Si scrive un allowlist dei nomi built-in (`COMPRESSION ONLY`, `TENSION ONLY`), o si tiene il divieto e il deck non lineare vive fuori da `nova.inp`?
6. **La licenza OpenSees** resta la discrepanza aperta di `01`. Se la strada principale è OpenSees, la domanda smette di riguardare solo il telaio.

---

## 9. Riferimenti

Ogni riferimento porta tre campi: URL · perché conta qui · cosa se ne prende.

### CalculiX

- **URL** http://www.dhondt.de/ccx_2.22.pdf · [V]
  **perché conta qui** è il manuale della versione esatta installata (2.22, 05/08/2024) — la domanda «cosa offre davvero CalculiX» si risponde solo qui
  **cosa se ne prende** §6.8 (catalogo completo dei legami), §6.8.12 (`COMPRESSION ONLY`: formulazione, due costanti, nome obbligatorio), §5.15 (l'unico esempio ufficiale di c.a., con il layer composito su `S8R`), §8.5 (le tre interfacce UMAT e la sintassi `@LIB FUNZIONE` delle librerie condivise), §7.89-90 (Mohr-Coulomb), §6.2.32/6.2.35 (i truss sono espansi in `C3D8I`), e le zero occorrenze di `damage`/`embedded`/`arc-length`
  **catturata in** `fonti/calculix-2.22-manuale-estratto.md`

- **URL** http://tfel.sourceforge.net — gallery https://thelfer.github.io/tfel/web/gallery.html · [V]
  **perché conta qui** è il generatore che il manuale CalculiX indica per le librerie di comportamento condivise
  **cosa se ne prende** che la gallery contiene **Mazars** e **Fichant-La Borderie** fra i modelli di danno — cioè la strada esiste — e che nessun pacchetto `tfel` sta su conda-forge, quindi su macOS arm64 va compilato

### OpenSees

- **URL** https://opensees.github.io/OpenSeesDocumentation/user/manual/material/ndMaterials/ASDConcrete3D.html · [V]
  **perché conta qui** è il solo legame per calcestruzzo, fra i quattro solutori, che sia insieme documentato, mantenuto, e con lo stato di danno leggibile dal recorder
  **cosa se ne prende** la firma completa; la generazione automatica delle leggi da `fc` e `ft`; `-autoRegularization` (energia di frattura sulla lunghezza caratteristica); `-implex` con `-implexControl` per il softening; e la tabella delle risposte `damage`, `cw`/`crackWidth`, `equivalentPlasticStrain`, `crackInfo`, `crushInfo`
  **catturata in** `fonti/opensees-asdconcrete3d.md`

- **URL** https://raw.githubusercontent.com/OpenSees/OpenSeesDocumentation/master/source/user/manual/model/elements/SSPbrick.rst · [V]
  **perché conta qui** `hexa.py` sceglie `C3D8I` per non irrigidirsi a taglio; serve sapere quale esaedro OpenSees ha lo stesso comportamento
  **cosa se ne prende** «free from volumetric and shear locking … greater coarse mesh accuracy in bending dominated problems … Analysis times are generally faster», il punto d'integrazione singolo (1/8 delle valutazioni del legame) e le forze di volume `<b1 b2 b3>` per la gravità
  **catturata in** `fonti/opensees-sspbrick.md`

- **URL** https://raw.githubusercontent.com/OpenSees/OpenSeesDocumentation/master/source/user/manual/model/elements/stdBrick.rst · [V]
  **perché conta qui** è l'esaedro di riferimento, e definisce la sintassi del recorder di materiale
  **cosa se ne prende** la sintassi `material $matNum matArg1 …` del recorder (è così che si legge `damage` per punto di Gauss su `stdBrick`) e il vincolo `-ndm 3 -ndf 3`
  **catturata in** `fonti/opensees-stdbrick.md`

- **URL** https://raw.githubusercontent.com/OpenSees/OpenSeesDocumentation/master/source/user/manual/model/elements/ASDEmbeddedNodeElement.rst · [V]
  **perché conta qui** è la risposta di OpenSees a `*EMBEDDED ELEMENT`, cioè a «come annegare le barre nel solido»
  **cosa se ne prende** la firma, i 4 nodi ritenuti (tetraedro) in 3D, la penalità `-K` da scegliere ≈ E e automaticamente scalata sul volume, e la nota che in un esaedro si usa il sotto-tetraedro che contiene il nodo
  **catturata in** `fonti/opensees-asdembeddednodeelement.md`

- **URL** https://github.com/OpenSees/OpenSees/blob/v3.8.0/SRC/material/nD/PlasticDamageConcrete3d.cpp · [V] [M]
  **perché conta qui** il ticket lo nomina come candidato: va scartato con una prova, non con un'impressione
  **cosa se ne prende** la firma `$tag $E $nu $ft $fc <$beta $Ap $An $Bn>` con i default 0,6 / 0,5 / 2,0 / 0,75; l'origine («Written in Matlab: Thanh Do, 07/16»); e soprattutto **zero occorrenze di `setResponse`** sulle 750 righe → le variabili di danno `dp`/`dn` non sono registrabili

- **URL** https://api.github.com/repos/OpenSees/OpenSees/contents/SRC/material/nD?ref=v3.5.0 · [M]
  **perché conta qui** serve sapere da quale rilascio `ASDConcrete3D` è disponibile, per dire se la ruota 3.8.0.0 lo contiene
  **cosa se ne prende** assente in `v3.4.0`, presente in `v3.5.0` (11/05/2023) e in `v3.8.0` (18/02/2026); `ASDEmbeddedNodeElement` presente in `v3.8.0` sotto `SRC/element/CEqElement/`

- **URL** `docs/ricerca/01-opensees-integrazione.md:39-45`, `:55`, `:168-181`, `:221` · [M, già in repo]
  **perché conta qui** piattaforma, licenza e tempi di OpenSees sono già stati misurati il 04/09; rimisurarli sarebbe rumore
  **cosa se ne prende** la ruota `openseespymac` 3.8.0.0 `macosx_13_0_arm64` funzionante su Python 3.14.7; la discrepanza di licenza `COPYRIGHT` vs `license.rst`; e la riga di base per l'estrapolazione dei tempi: 51.840 tetraedri, statica 0,47 s

### code_aster

- **URL** https://codeaster.gitlab.io/doc/docaster/manuals/man_r/r7/r7.01.04/Introduction___Domaine_d_application.html · [V]
  **perché conta qui** `ENDO_ISOT_BETON` è il candidato nominato dal ticket, e il suo limite decide se serve o no
  **cosa se ne prende** verbatim: «pas du tout adaptée à la description du comportement non linéaire du béton en compression»; la «dépendance pathologique au maillage»; e che il pilotaggio `PRED_ELAS` è «indispensable en statique» per via degli snap-back
  **catturata in** `fonti/code-aster-endo-isot-beton.md`

- **URL** https://codeaster.gitlab.io/doc/docaster/manuals/man_r/r7/r7.01.08/index.html · [V]
  **perché conta qui** Mazars è l'altro candidato nominato dal ticket
  **cosa se ne prende** che è 3D isotropo con criterio in deformazione, che la versione code_aster è riformulata per bi-compressione e taglio puro, e che **la richiusura delle fessure esiste solo nella versione 1D per travi multifibra** — non per il solido
  **catturata in** `fonti/code-aster-mazars.md`

- **URL** https://api.anaconda.org/package/conda-forge/code-aster · [M]
  **perché conta qui** la disponibilità su macOS arm64 è un ingresso degenere del brief, e va detta in testa alla sezione
  **cosa se ne prende** `latest_version` 18.0.12, un solo `subdir` — `linux-64`. Nessun `osx-arm64`
  **catturata in** `fonti/conda-forge-code-aster.md`

- **URL** https://www.code-aster.org/V2/doc/v14/en/man_r/r7/r7.01.04.pdf · [NON TROVATO]
  **perché conta qui** era l'URL storico dei documenti R, citato ovunque nella letteratura
  **cosa se ne prende** risponde 404: il portale è stato rifatto e la documentazione si è spostata su `codeaster.gitlab.io/doc/docaster`. Ogni riferimento bibliografico ai vecchi URL è oggi morto

### Kratos

- **URL** https://pypi.org/pypi/KratosMultiphysics/json · [M]
  **perché conta qui** stesso ingresso degenere: senza ruota macOS arm64 il candidato cade prima di guardare i legami
  **cosa se ne prende** versione 10.4.3 del 03/07/2026, 14 file, tutti `manylinux_2_28_x86_64` o `win_amd64`; nessun `macosx_*`; licenza BSD-4
  **catturata in** `fonti/pypi-kratosmultiphysics.md`

- **URL** https://github.com/KratosMultiphysics/Kratos/tree/master/applications/ConstitutiveLawsApplication/custom_constitutive/small_strains/damage · [V]
  **perché conta qui** per dire cosa si perderebbe scartando Kratos
  **cosa se ne prende** la famiglia `generic_small_strain_d_plus_d_minus_damage`, `d_plus_d_minus_damage_masonry_3d`, `small_strain_isotropic_damage_implex_3d` — la stessa teoria d⁺/d⁻ con IMPL-EX di `ASDConcrete3D`, cioè nessun guadagno netto

### MeshRec (sola lettura, `~/GitHub/Tesi`)

- **URL** `meshrec/src/meshrec/core/hexa.py:1-6`, `:36-68`, `:144-200`, `:756-768` · [V]
  **perché conta qui** il ticket chiede di leggere «cosa produce `hexa.py` davvero»
  **cosa se ne prende** che produce **prismi di membratura estrusi con gmsh** dalle sezioni già misurate dal prior — non una mesh esaedrica di una nuvola; che `min_layers` ≥ 3 è imposto dal codice; e che le membrature adiacenti sono legate da `*TIE` perché le mesh **non combaciano nodo a nodo**, con la mesh conforme multiblocco dichiarata come via d'aggiornamento

- **URL** `meshrec/src/meshrec/core/config.py:648-655` · [V]
  **perché conta qui** è la scelta di elemento già presa da MeshRec, e la sua motivazione mappa direttamente su quale esaedro scegliere in OpenSees
  **cosa se ne prende** `C3D8I` per default, con la ragione scritta: `C3D8` si irrigidisce a taglio, «un errore invisibile guardando la mesh», `C3D8R` ha i modi a clessidra → in OpenSees la stessa ragione porta a `SSPbrick`

- **URL** `meshrec/src/meshrec/core/pipeline.py:332-334` · [V]
  **perché conta qui** decide se la strada esaedrica ha oggi un ingresso
  **cosa se ne prende** il commento nel codice: sulla nuvola vera il modello parametrico **fallisce**, perché il prior non accetta membrature

- **URL** `meshrec/src/meshrec/core/abaqus.py:59-77`, `:183` · [V]
  **perché conta qui** dice esattamente dove si innesta il materiale non lineare nel deck
  **cosa se ne prende** `write_inp` scrive solo il maglio («Niente sezione, materiale, vincolo, passo, carico: sono decisioni di chi analizza»), e il `*TIE` esce da `abaqus.py:183`

### NOVA (in repo)

- **URL** `docs/caso-studio/corsa-ccx-2026-09-05.md` · [M, già in repo]
  **perché conta qui** dà la mesh vera e l'oracolo di equilibrio contro cui si confronta la corsa non lineare di oggi
  **cosa se ne prende** 14.116 nodi, 51.892 `C3D4`, `BASE` = 3.743 nodi, Σ Rz = 4.248,58 N nel passo di gravità — lo stesso numero che la corsa `COMPRESSION ONLY` restituisce a ogni incremento

- **URL** `nova/inp.py:35-40` · [V]
  **perché conta qui** è la riga che il piano B dovrebbe cambiare
  **cosa se ne prende** `_CARTE_VIETATE = ("INCLUDE", "RESTART", "USER MATERIAL")` con la motivazione «codice compilato dall'utente»: giusta per le librerie `@…`, troppo larga per `COMPRESSION ONLY`, che è compilata dentro ccx

### Misure di questa sessione [M]

- **URL** `ccx` 2.22 in `~/.local/bin/ccx`, comandi `file`, `nm -u`, `otool -L`, `strings -a` · [M]
  **perché conta qui** una funzionalità documentata nel manuale può non essere nel binario che si ha
  **cosa se ne prende** Mach-O arm64; solo `libarpack`/`liblapack`/`libblas`/`libgfortran`/`libomp` linkate (quindi solo SPOOLES); `umat_compression_only.f` e `umat_tension_only.f` **compilati dentro**; e **nessun `dlopen`/`dlsym`** → le librerie di comportamento esterne non sono attive in questo build

- **URL** corse `ccx -i` su `/tmp` (copie di `tests/fixture/solido_piccolo/trave.inp` e `~/GitHub/NOVA/lab_telaio_v2/wall_model.inp`, originali non toccati) · [M]
  **perché conta qui** è la sola misura diretta di una pushover non lineare su ~50.000 elementi che questa ricerca può produrre senza installare niente
  **cosa se ne prende** 51.892 `C3D4` con `COMPRESSION ONLY`: exit 0, **7,52 s** reali (`OMP_NUM_THREADS=6`), 7 incrementi, 26 iterazioni di Newton; taglio alla base da 2.174,8 N a 14.701,9 N per u_y da 0,259 a 5,0 mm; rigidezza secante ×0,35; Σ Rz costante a 4.248,6 N; contro 84.928,5 N dello stesso deck elastico
