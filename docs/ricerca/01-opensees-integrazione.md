# Ricerca: OpenSees come solutore integrato — vie d'integrazione, fallimenti, licenza, catalogo, tempi

Ricerca del 04/09/2026, condotta da un `researcher` dispacciato in parallelo con altri sei. Riparte dalle due ricerche del 28/08/2026 in `~/GitHub/Tesi/docs/validazione/` (`ricerca-opensees-e-armature.md`, `ricerca-armature-opensees-fibre.md`), lette per intero e non ripetute.

Skill-gate: `tech-stack-evaluator` invocata; script (`ecosystem_analyzer.py`, ecc.) **non lanciati** — tarati su npm/GitHub web; metriche raccolte a mano da PyPI/GitHub API, struttura del confronto (piattaforme, manutenzione, licenza, integrazione) ripresa dalla skill. `caveman:caveman` attivo.

Premesse del brief ricontrollate: `README.md:4-13` ok (dice Abaqus, non CalculiX — coerente), `docs/validazione/README.md:3-11` ok, `modi-per-la-normativa.md:32-35` ok (51.913 tetraedri). Tesi HEAD `782f507` (2026-09-04). Nessuna premessa falsa.

Convenzione: **[V]** fonte primaria letta · **[M]** misurato in sessione · **[INF]** inferenza · **[NON TROVATO]**.

Misure fatte dallo scratchpad di sessione su Mac Apple A18 Pro, 8 GB, Python 3.14.7, `openseespy` 3.8.0.0 (wheel `openseespymac`), sparse-clone `OpenSees/OpenSees` a `2890cb3`.

## Artefatti consultati

| artefatto | provenienza | stato |
|---|---|---|
| sorgente OpenSees `master` `2890cb3` (14/08/2026) — **identico al 28/08** | github.com/OpenSees/OpenSees | sparse-clone `SRC/interpreter, tcl, handler, actor, analysis, element/{force,disp,elastic}BeamColumn, system_of_eqn/eigenSOE, material/section` [V] |
| `COPYRIGHT` repo OpenSees; `source/developer/license.rst` OpenSeesDocumentation | raw.githubusercontent.com | letti verbatim [V] |
| `openseespymac-3.8.0.0` wheel (10.115.801 B) | PyPI | scaricato, estratto, installato, **eseguito** [M] |
| `OpenSeesMac3.8.0-ARM.tar.gz` (10.334.335 B) | opensees.berkeley.edu | scaricato, **eseguito** in subprocess [M] |
| metadati PyPI: `openseespy*`, `opensees`, `xara`, `opstool`, `opsvis`, `veux`, `sees`, `osmg` | pypi.org JSON API | interrogati [M] |
| GitHub API: repo OpenSees, OpenSeesPy, xara, opstool, opsvis (push, stelle, commit dal 01/06, issue) | api.github.com | interrogata [M] |
| doc OpenSeesPy (`index`, `eigen`, `rigidDiaphragm`, `displacementControl`, `parallelcmds`) | openseespydoc.readthedocs.io | lette [V] |
| doc OpenSees (`responseSpectrumAnalysis`, `modalProperties`, `build`, `license`) | opensees.github.io | lette [V] |
| xara: README, `LICENSE.txt`, xara.so `output/`, `analysis/`, gallery `example1` | github/peer-open-source/xara, xara.so, gallery.stairlab.io | letti [V] |
| workshop PDF `OpenSeesSP.pdf` (McKenna) | opensees.berkeley.edu | letto 12 pagine [V] |
| anaconda.org API `opensees/opensees`, `conda-forge/opensees` | api.anaconda.org | interrogata [M] |

---

## 1. Vie di integrazione (2026)

### (a) `openseespy` da PyPI

Ombrello 3.8.0.0 (18/03/2026), stessa situazione del 28/08 — **nessuna release nuova**. Ruote [V, PyPI JSON]:

| pacchetto | ruota | Python | byte |
|---|---|---|---|
| `openseespymac` 3.8.0.0 | `py3-none-macosx_13_0_arm64` | `>=3.10` | 10.115.801 |
| `openseespywin` 3.8.0.0 | `py3-none-win_amd64` | `>=3.12` | 6.787.016 |
| `openseespylinux` 3.8.0.0 | `py3-none-any` | `>=3.12` | 86.251.016 |

Contenuto ruota mac: `opensees.so` 29.508.704 B + `LICENSE.md` 370 B + `__init__.py` [M `unzip -l`]. Nessuna ruota Intel mac, nessuna Windows ARM, nessuna Linux aarch64.

- Doc dice «Version 3.8.0.0 is released for Linux, Windows, and Mac (ARM64)! Python 3.12 is required» [V]. **Ma** su Python 3.14.7 mac: `pip install openseespy` ok, `ops.version()` → `3.8.0` [M]. Vincolo 3.12 reale solo su win/linux (metadati ruota).
- Modello: chiamate `ops.node(...)`, `ops.element(...)` → stato globale del modulo, un dominio per processo, `wipe()` azzera (già in `ricerca-opensees-e-armature.md` §4.2).
- Risultati in memoria: registrati in `PythonWrapper.cpp` — `nodeDisp nodeVel nodeAccel nodeReaction nodeEigenvector nodeMass nodeUnbalance eleForce eleResponse eleNodes basicDeformation basicForce sectionForce sectionDeformation sectionStiffness getEleTags getNodeTags nodeCoord getTime getLoadFactor printA printB systemSize modalProperties` [V grep `addCommand(`, 236 comandi registrati]. `modalProperties('-return')` rende dict Python [V doc]. Recorder su file: `Node/EnvelopeNode/Element/EnvelopeElement/PVD/...` (già §5.1 del 28/08).
- Manutenzione: repo `zhuminjie/OpenSeesPy` push 18/08/2026, 274 stelle, **76 commit dal 01/06/2026**, 42 issue aperte [M GitHub API]. Core `OpenSees/OpenSees`: 809 stelle, 73 commit dal 01/06, 60 issue, tag `v3.8.0` 18/02/2026, **release GitHub senza asset** (binari solo sul sito Berkeley) [M].
- Parallelo in `openseespy`: `getPID getNP barrier send recv Bcast partition` + `Mumps`, lancio `mpiexec -np np python filename.py`; «The parallel commands are currently only working in the Linux version» [V doc parallelcmds].

### (b) Binario Tcl `OpenSees` in subprocess

Download page Berkeley offre 3.8.0: `OpenSees3.8.0-x64.exe`, `OpenSeesMac3.8.0-x86.tar.gz`, `OpenSeesMac3.8.0-ARM.tar.gz`; **nessun Linux**, nessun SP/MP [V]. conda-forge `opensees` 3.8.0: `osx-64, win-64, linux-64` — **no osx-arm64** [M anaconda API].

Binario ARM [M]: `OpenSees3.8.0/bin/OpenSees` 30.277.608 B, Mach-O arm64; `otool -L` → solo `Accelerate`, `libSystem`, `CoreFoundation`, `libc++` (Tcl **linkato statico**, serve solo `lib/tcl8.6/init.tcl` accanto). Esecuzione `OpenSees ok.tcl` → `RESULT analyze=0 disp=0.01646090534979424702`, exit 0.

- Modello: file `.tcl` generato (artefatto testuale, `source`-abile) o stdin.
- Risultati: recorder su file (`-file`, `-xml`, `-binary`, `-tcp`) oppure `puts [nodeDisp ...]` su stdout da parsare.
- **Codice di uscita non segnala errore**: `bad.tcl` con `uniaxialMaterial DoesNotExist` → script interrotto (riga dopo non eseguita), traccia Tcl su stderr (`while executing "uniaxialMaterial DoesNotExist 1 1.0" (file "bad.tcl" line 2)`), **`EXIT 0`** [M]. Il chiamante deve parsare stderr. Comando Tcl `exit` = `Tcl_Finalize()` (`SRC/tcl/commands.cpp:8761`) [V].

### (c) `opensees` / `xara` (Claudio Perez, PEER/STAIRlab)

Cos'è [V README + xara.so]: fork/rifattorizzazione del runtime OpenSees — «The core OpenSees runtime has been redesigned so that all program state is encapsulated in user-instantiated classes, and global variables/singletons are avoided»; «drop-in replacement for both OpenSees.exe and OpenSeesPy»; «Switching Python scripts to use `opensees` typically results in a 4x to 5x performance boost» (claim, **non misurato** qui). Ex `OpenSeesRT` (repo `claudioperez/OpenSeesRT` ora redirect) [M API].

Tre API [V]:
```python
interp = opensees.tcl.Interpreter(); interp.eval("model Basic -ndm 2")   # Tcl in-process
import opensees.openseesrt                                               # compat OpenSeesPy, senza stato globale
model = xara.Model(ndm=2, ndf=2); model.node(1,(0.,0.)); model.element("Truss",1,(1,4),section=1)
xara.solve(model, loads); u4 = model.nodeDisp(4)
```
Risultati: `nodeDisp/nodeVel/nodeAccel/nodeResponse/eleResponse/getTangent/getResidual` + recorder `Node/EnvelopeNode/PVD/MPCO/GMSH` [V xara.so output]. «Easily return stiffness, mass, and damping matrices as NumPy arrays» [V README].

Stato [V/M]:
- README: «**This package is experimental and not yet intended for public use.**»; «eigenvalue analysis is currently broken on Windows»; «Python versions 3.7 - 3.12».
- PyPI `opensees` 0.1.31 (17/07/2026): ruote `manylinux_x86_64` cp39-cp313, `win_amd64` cp39-cp314t — **nessuna macOS**. Storico mac arm64: 0.1.8 (11/2024, `macosx_14_0`), 0.1.26/0.1.27 (01/2026, `macosx_15_0_arm64`, solo cp310/cp312/cp313). Supporto mac **intermittente** [M].
- `xara` 0.0.33 (02/09/2026): pura Python 118 KB, `requires opensees>=0.1.31, xsection, shps` → su mac arm64 oggi **non installabile** da ruota. Prova: `pip download opensees` su questo Mac py3.14 → pip ripiega su `opensees-0.0.23` (08/08/2022) [M]. Canale conda `opensees/opensees`: solo `linux-64` 0.0.24 [M].
- Repo `peer-open-source/xara`: push 04/09/2026, 65 stelle, **100 commit dal 01/06** (repo più attivo dei cinque), 21 issue [M]. Sviluppo vivo, singolo autore, versioning 0.x.

### (d) Build da sorgente CMake come libreria

`CMakeLists.txt` root [V]: `add_library(OpenSeesLIB EXCLUDE_FROM_ALL)` (r.601), `add_executable(OpenSees ...)` (r.656), `OpenSeesSP` (r.718) e `OpenSeesMP` (r.782) sotto `if(MPI_FOUND)`, `add_library(OpenSeesPy SHARED ...)` (r.845) = modulo Python (`PythonModule.cpp`). Su Clang/GNU/MSVC `set(BUILD_SHARED_LIBS OFF)` (r.57/81/95). Esiste target libreria (`OpenSeesLIB`), ma nessuna API C++ pubblica di embedding documentata: la doc build parla solo di target `OpenSees` e `OpenSeesPy` (`cmake --build . --target OpenSees -j8`, `--target OpenSeesPy -j8`), deps gfortran/LAPACK/MUMPS/HDF5, nota mac «Pre-installed python in /usr/bin may have problem especially on Apple Silicon Mac» [V]. Embedding C++ diretto = strada non tracciata da nessuna doc [NON TROVATO documentazione]; xara è l'unico che l'ha percorsa.

### (e) OpenSeesSP / OpenSeesMP

Workshop PDF McKenna [V]: «OpenSeesSP was created for analyzing large models on parallel machines», «Single interpreter running on P0 interpreting the input file», «Actor objects sitting on other processes»; MP = «The second interpreter», script per processo con `partition`. Comandi: `system Mumps`, `system diagonal`, `getPID/getNP`. Avvisi nel PDF: «The output files generated by the recorders are different... Use the -xml flag instead of -file flag»; «The eigen command does not work after the first analyze command»; SP «does not scale well». Doc dedicata su opensees.github.io: pagina `parallel` **404**, cartella `source/user/manual/parallel` inesistente [M]. Binari: nessuno sul sito Berkeley, nessuno su GitHub; build MPI da sorgente. Per un telaio da centinaia di elementi: irrilevante [INF].

### Tabella di sintesi

| via | macOS arm64 | Win | Linux | modello | risultati | isolamento errori | manutenzione |
|---|---|---|---|---|---|---|---|
| `openseespy` | sì (≥13, py≥3.10) | x64, py≥3.12 | x64, py≥3.12, 86 MB | chiamate Python, stato globale | in memoria + recorder | **no** (vedi §2) | attiva, 1 maintainer + core Berkeley |
| Tcl subprocess | sì ARM (Berkeley) | sì | conda-forge x64 | file `.tcl` | recorder file / stdout | **sì**, ma exit code sempre 0 | attiva |
| `xara` | **oggi no** | sì (eigen rotto) | x64 | `Model` senza globali | metodi + NumPy | **no** (in-process) | molto attiva, «experimental» |
| CMake lib | build propria | build | build | C++ | C++ | no | nessuna doc |
| SP/MP | build MPI | — | build MPI | Tcl | recorder `-xml` | processo separato | doc 404 |

---

## 2. Modello di fallimento

### Errori di input ordinari: eccezione, non crash [M]

`openseespy` alza `opensees.OpenSeesError` (definita in `PythonModule.cpp:552`, `PyErr_NewExceptionWithDoc("opensees.OpenSeesError", "Internal OpenSees errors.")`) [V]:
```
T1 element('elasticBeamColumn',1,1,2)      → OpenSeesError('See stderr output')
T2 uniaxialMaterial('DoesNotExist',...)    → OpenSeesError('See stderr output')
T4 eigen(1) su sistema singolare           → OpenSeesError('See stderr output')
missing node in forceBeamColumn            → OpenSeesError, "ERROR could not add element to domain."
```
Il **messaggio dell'eccezione non porta il testo**: porta `See stderr output` o `See log file`. Il testo di `opserr` va su `sys.stderr` di Python via `PySys_FormatStderr` (`PythonStream.h:err_out`) → **catturabile con `contextlib.redirect_stderr`**: misurato `'WARNING material type DoesNotExist is unknown\n'` [M]. Alternativa `ops.logFile('f.log','-noEcho')` → testo nel file, eccezione dice `See log file` [M]. Per una UI: wrapper che redirige stderr per chiamata e allega il buffer all'eccezione [INF].

### Fallimenti silenziosi di `analyze` [M]

| caso | ritorno `analyze(1)` | esito |
|---|---|---|
| `system('BandGeneral')`, nodo libero senza elementi | **0** | warning `factorization failed, matrix singular` su stderr, **`nodeDisp(2)` = 1000.0** (attesi ~1,6e-5 mm): spazzatura con codice di successo |
| `system('UmfPack')`, stesso modello | −3 | corretto |
| `algorithm('Newton')` non convergente | −3 | corretto |

Regola: **codice 0 non basta**, stderr va sempre letto; e la scelta del `system` cambia se l'errore viene rilevato.

### `exit()` nel nucleo: in-process NON è sicuro [V + M]

Conteggio `exit(` in `SRC` (sparse subset, `grep -rn --include='*.cpp'`): 113 file; per cartella `element` 318, `material` 271, `analysis` 129, `recorder` 40, `domain` 32, `system_of_eqn` 4 (`BandArpackSolver.cpp:252,274`, `SymArpackSolver.cpp:385,403`), `tcl` 4, `interpreter` 1 (`pythonMain.cpp:51`, solo main standalone). `ConsoleErrorHandler::fatal` → `exit(-1)` (`ConsoleErrorHandler.cpp:67`). `DisplacementControl.cpp:383` `exit(-1)` su out-of-memory. `ForceBeamColumn3d.cpp:538-589`: `exit(0)` su `setDomain` con nodo assente, dof errati, trasformazione fallita, **lunghezza zero**.

Misurato con `openseespy` 3.8.0.0 mac [M, script `t_exit.py`]:

| ingresso | esito processo Python |
|---|---|
| `forceBeamColumn` fra due nodi coincidenti | stderr `element has zero length`, **processo terminato, exit code 0** — nessuna eccezione, nessun codice d'errore |
| `elasticBeamColumn` fra due nodi coincidenti | `ElasticBeam3d::setDomain tag: 1 -- Error initializing coordinate transformation`, **processo terminato, exit 255** |
| `dispBeamColumn` fra due nodi coincidenti | warning, **elemento creato**, processo vivo |
| `forceBeamColumn` con nodo inesistente | `OpenSeesError` regolare |

Più il caso già misurato il 28/08: `eleResponse(…,'stresses')` su `TenNodeTetrahedron` → `malloc(): unaligned tcache chunk detected`, abort 134.

Conclusione: un errore di modello banale (due nodi coincidenti da rilievo, tipico per un generatore) **uccide il processo host senza eccezione**. Per una UI il solutore va in **processo separato obbligatorio** (subprocess Python con `openseespy`, o binario Tcl); in-process solo dentro un worker sacrificabile [INF dalla misura]. `xara` non cambia questo: stesso codice elemento [INF; 2196 file del repo xara portano l'intestazione Regents — M `gh api search/code`].

---

## 3. Licenza

### OpenSees — `COPYRIGHT` nel repo (nessun file `LICENSE`, [M listing root]) — verbatim [V]

> Copyright @ 1999-2020 The Regents of the University of California (The Regents). All Rights Reserved.
>
> The Regents grants permission, without fee and without a written license agreement, for (a) use, reproduction, modification, and distribution of this software and its documentation by educational, research, and non-profit entities for noncommercial purposes only; and (b) use, reproduction and modification of this software by other entities for internal purposes only. The above copyright notice, this paragraph and the following three paragraphs must appear in all copies and modifications of the software and/or documentation.
>
> Permission to incorporate this software into products for commercial distribution may be obtained by contacting the University of California Office of Technology Licensing 2150 Shattuck Avenue #510, Berkeley, CA 94720-1620, (510) 643-7201.
>
> This software program and documentation are copyrighted by The Regents of the University of California. The Regents does not warrant that the operation of the program will be uninterrupted or error-free. The end-user understands that the program was developed for research purposes and is advised not to rely exclusively on the program for any reason.
>
> IN NO EVENT SHALL REGENTS BE LIABLE TO ANY PARTY FOR DIRECT, INDIRECT, SPECIAL, INCIDENTAL, OR CONSEQUENTIAL DAMAGES, INCLUDING LOST PROFITS, ARISING OUT OF THE USE OF THIS SOFTWARE AND ITS DOCUMENTATION, EVEN IF REGENTS HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. REGENTS GRANTS NO EXPRESS OR IMPLIED LICENSE IN ANY PATENT RIGHTS OF REGENTS BUT HAS IMPLEMENTED AN INDIVIDUAL CONTRIBUTOR LICENSE AGREEMENT FOR THE OPENSEES PROJECT AT THE UNIVERISTY OF CALIFORNIA, BERKELEY TO BENEFIT THE END USER.
>
> REGENTS SPECIFICALLY DISCLAIMS ANY WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE. THE SOFTWARE AND ACCOMPANYING DOCUMENTATION, IF ANY, PROVIDED HEREUNDER IS PROVIDED "AS IS". REGENTS HAS NO OBLIGATION TO PROVIDE MAINTENANCE, SUPPORT, UPDATES, ENHANCEMENTS, OR MODIFICATIONS.

Intestazione di ogni sorgente (`PythonStream.h:9-12`): «Commercial use of this program without express permission of the University of California, Berkeley, is strictly prohibited.» [V]

`developer/license.rst` (doc ufficiale) aggiunge frase in chiaro + tre clausole BSD **assenti dal file `COPYRIGHT`** [V]:

> It is free for anybody to use, with the exception being that if you sell software that includes OpenSees source code you must obtain a license to do so from UC Berkeley, and like all software you use at your own risk.
>
> Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met: * Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer. * Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution. * Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

Le due versioni **non coincidono** (repo: noncommerciale/interno; doc: «free for anybody… if you sell»). Quale prevalga: questione legale, non tecnica [INF]. GitHub la classifica `NOASSERTION` [M].

### OpenSeesPy — `LICENSE.md` dentro la ruota, verbatim [V]

> OpenSeesPy is free for research, education, and internal use. Commercial redistribution of OpenSeesPy, such as, but not limited to, an application or cloud-based service that uses import openseespy, requires a license similar to that required for commercial redistribution of OpenSees.exe. Contact Dr. Minjie Zhu (zhum@oregonstate.edu) for commercial licensing details.

Doc index rimanda per il core a `opensees.github.io/.../developer/license.html` [V].

### xara — `LICENSE.txt` BSD-2-Clause «Copyright (c) 2024, Claudio M. Perez» [V]; xara.so dice «pure BSD». Ma 2196 file del repo portano «Regents of the University of California» [M] → il BSD copre i contributi Perez, i termini Regents restano sul codice ereditato [INF — da verificare legalmente].

### Cosa ne discende per un software terzo

| uso | OpenSees core | OpenSeesPy | xara |
|---|---|---|---|
| tesi / ricerca / interno | permesso esplicito | «free for research, education, and internal use» | BSD |
| distribuire l'app gratuita con la ruota dentro | testo repo: solo «educational, research, and non-profit entities for noncommercial purposes»; testo doc: BSD-like con attribuzione | «Commercial redistribution… requires a license» — *commerciale*; gratuita non nominata | BSD, con caveat sopra |
| vendere | licenza da UC OTL (indirizzo sopra) | licenza da Zhu + UC | codice Regents: idem |
| attribuzione | copyright + paragrafi devono comparire «in all copies» | — | notice BSD |

Via che evita ogni ambiguità: **non ridistribuire**; l'app chiede all'utente `pip install openseespy` o indica il binario Berkeley (installazione dell'utente = «use» permesso) [INF, raccomandazione in fondo].

Altri: `opstool` **GPL-3.0**, `opsvis` **GPL-3.0**, `osmg` **GPL** [M PyPI/GitHub] — importarli in un'app chiusa trascina la GPL [INF]. `veux` licenza **[NON TROVATO]** nei metadati PyPI. STKO commerciale (vedi `02-panorama-software.md`).

---

## 4. Catalogo minimo per telai in c.a. — tutto presente nell'interprete Python [V grep registri `SRC/interpreter/*Commands.cpp`, `PythonWrapper.cpp`]

| famiglia | registrato |
|---|---|
| elementi | `elasticBeamColumn dispBeamColumn forceBeamColumn nonlinearBeamColumn beamWithHinges ElasticTimoshenkoBeam zeroLength zeroLengthSection Truss twoNodeLink ShellMITC4 ShellDKGQ ASDShellQ4` |
| sezioni | `Fiber Aggregator Elastic Uniaxial NDFiber RCSection2d RCCircularSection LayeredShell PlateFiber Parallel Bidirectional` |
| materiali | `Concrete01 Concrete02 Concrete04 Concrete07 ConcreteCM Steel01 Steel02 Steel4 ReinforcingSteel Hysteretic ElasticPP` |
| `geomTransf` | `Linear PDelta Corotational` |
| vincoli | `fix sp equalDOF equalDOF_Mixed rigidLink rigidDiaphragm` — `rigidDiaphragm(perpDirn, rNodeTag, *cNodeTags)`, «To enforce this constraint, `Transformation` constraint handler is recommended» [V doc] |
| masse | `mass(nodeTag, *massValues)`; `-mass`/`-cMass` sugli elementi trave |
| statica | `integrator LoadControl / DisplacementControl(nodeTag, dof, incr, numIter=1, dUmin, dUmax) / ArcLength / MinUnbalDispNorm`; `algorithm Linear Newton ModifiedNewton KrylovNewton NewtonLineSearch BFGS Broyden…` |
| modale | `eigen(solver='-genBandArpack', numEigenvalues)`, solver `-genBandArpack` (default) `-fullGenLapack` `-symmBandLapack` `PythonSparse`, rende lista di autovalori [V doc]; `nodeEigenvector`; **`modalProperties(<-print> <-return> <-file> <-unorm>)`** → massa totale, baricentro, fattori e masse partecipanti, rapporti % e cumulati (Petracca, HRZ lumping) [V doc] |
| transiente | `integrator Newmark HHT GeneralizedAlpha TRBDF2 CentralDifference ExplicitDifference…`; `analysis Transient / VariableTransient` |
| smorzamento | `rayleigh`, `modalDamping`, `modalDampingQ` (richiedono `eigen` prima: «eigen command needs to be called first - NO MODAL DAMPING APPLIED», `OpenSeesCommands.cpp:2852`), `setElementRayleighDampingFactors`, comando `damping` per elemento tipi `Uniform SecStif URD` |
| spettro | **`responseSpectrumAnalysis`** — esiste, correzione al brief. Sintassi `responseSpectrumAnalysis $tsTag $direction <-scale> <-mode>` oppure `$direction -Tn $Tn -Sa $Sa`; «This command can be used only if a previous call to eigen Command and modalProperties Command has been performed»; «computes only the modal displacements, any modal combination is up to the user» (Petracca) [V doc] |

### Cosa OpenSees NON fa e resta in post-processing [V per assenza nei registri + doc citata]
- **Combinazione modale CQC/SRSS**: `responseSpectrumAnalysis` produce un passo per modo, i recorder registrano ogni modo; la combinazione la scrivi tu.
- **Combinazioni di carico** (SLU/SLE, inviluppi): nessun concetto di «load case» combinabile; un `pattern` per volta, `loadConst`, oppure una run per combinazione. `EnvelopeNode` dà solo max/min di una run.
- **Verifiche di norma**, domini M-N, armatura minima, gerarchia resistenze: assenti (già §5.3 del 28/08: `concreteproperties` fa i domini, non parla OpenSees).
- **Spettro NTC**: da costruire come liste `-Tn/-Sa` o `timeSeries Path`.
- **Peso proprio**: nessuna scheda gravità (già §6 del 28/08); `eleLoad -beamUniform` in coordinate locali.
- **Confinamento**: calcolo a monte (§3.4 del 28/08).

---

## 5. Tempi

Pubblicati: **[NON TROVATO]** (WebSearch «OpenSees benchmark solution time solid elements modal…» → nessun numero). Claim xara «4x to 5x» non misurato.

Misurato qui [M] — `openseespy` 3.8.0.0 mac arm64, Python 3.14.7, Apple A18 Pro, 8 GB, `numberer RCM`, `system UmfPack`, `algorithm Linear`, `eigen(20)` default `-genBandArpack`, single-thread (user 14,1 s ≈ real 16,7 s sul caso grande):

| modello | elementi | nodi | costruzione | statica | `eigen(20)` |
|---|---:|---:|---:|---:|---:|
| telaio 3D `elasticBeamColumn` 2×2×3 | 63 | 36 | 0,001 s | 0,004 s | 0,012 s |
| telaio 4×4×5 | 325 | 150 | 0,001 s | 0,004 s | 0,154 s |
| telaio 6×6×10 | 1.330 | 539 | 0,003 s | 0,022 s | 0,946 s |
| telaio 10×10×20 | 6.820 | 2.541 | 0,013 s | 0,202 s | **21,0 s** |
| `FourNodeTetrahedron` 4×4×40 | 3.840 | 1.025 | 0,02 s | 0,03 s | 0,60 s |
| `FourNodeTetrahedron` 8×8×135 (≈ caso tesi 51.913) | **51.840** | 11.016 (~32,8k DOF) | 0,23 s | **0,47 s** | **15,78 s**, RSS 1,67 GB |

Comandi: `venv/bin/python t_frame.py 4 4 5`, `/usr/bin/time -l venv/bin/python t_tet.py 8 8 135 20`. Script nello scratchpad di sessione (effimero): `t_fail.py, t_stderr.py, t_exit.py, t_frame.py, t_tet.py, tclbin/ok.tcl, tclbin/bad.tcl` — da rifare se servono, non versionati.

Letture: statica su 50k tetraedri lineari sotto il secondo; il costo è l'`eigen` bandato Arpack (cresce con la banda: il telaio a 6 dof/nodo 10×10×20 costa più dei tetraedri). Tetraedri quadratici (`TenNodeTetrahedron`, ~8× DOF) **non misurati** — e le tensioni comunque non leggibili (§1.4 del 28/08). Per «decine-centinaia di elementi trave» tutto sotto 0,2 s: il collo di bottiglia non sarà il solutore [INF].

---

## 6. Ecosistema Python

| pacchetto | versione (data) | licenza | attività | note |
|---|---|---|---|---|
| `opstool` | 1.0.26 (11/01/2026) | **GPL-3.0** | 139 stelle, 5 commit dal 01/06 | pre (fiber mesh, import Gmsh, unità, masse), post (xarray, netcdf/zarr), vis PyVista+Plotly+trame; **`python >=3.10,<3.13`**; 22 dipendenze pesanti (`gmsh`, `pyvista`, `trame`, `sectionproperties`…) [M PyPI] |
| `opsvis` | 1.3.7 (30/03/2026) | **GPL-3.0** | 57 stelle, 0 commit dal 01/06 | matplotlib, `fib_sec_list_to_cmds` (già §5.1 del 28/08) |
| `veux` (Perez) | 0.0.43 (**04/09/2026**) | [NON TROVATO] | — | «Fast and friendly finite element visualization for xara and OpenSees/OpenSeesPy» |
| `sees` (Perez) | 0.0.25 (16/11/2024) | — | fermo | sostituito da `veux` [INF] |
| `osmg` | 1.0.13 | **GPL** | — | «OpenSees Model Generator» |
| `xsection`, `shps` (Perez) | 0.0.33 / 0.0.34 (07–09/2026) | — | attivi | dipendenze di xara |
| doc `openseespydoc` | repo push 20/05/2026 | — | — | «Postprocessing Modules» elenca opsvis |

Riusabile senza GPL per un'app propria: PyVista/Plotly/matplotlib direttamente; `concreteproperties`/`sectionproperties` (MIT, §5.3 del 28/08) come oracolo sezioni [INF].

---

## Cosa è cambiato dal 28/08

- **Niente** nel core: `OpenSees/OpenSees` master ancora `2890cb3` (14/08); `openseespy` ancora 3.8.0.0 (18/03); i tre difetti del `TenNodeTetrahedron` restano.
- **Nuovo**: `xara` 0.0.33 (02/09) e `opensees` 0.1.31 (17/07) — quest'ultimo **senza ruota macOS** (le 0.1.26/27 di gennaio l'avevano); `veux` 0.0.43 uscito oggi.
- **Non coperto prima, ora verificato**: `responseSpectrumAnalysis` + `modalProperties` nativi; modello di fallimento misurato (eccezione vs `exit(0)` silenzioso); binario Tcl ARM eseguito; testi di licenza verbatim con la discrepanza repo/doc; conda-forge `opensees` 3.8.0 senza osx-arm64; `openseespy` gira su Python 3.14 mac nonostante la doc.

## Domande aperte per il brainstorming

1. Distribuzione: l'app **include** la ruota `openseespy` (licenza da chiarire) o la fa installare all'utente?
2. Sidecar: subprocess Python con `openseespy` (risultati in memoria via IPC/JSON) o binario Tcl (recorder su file, nessun Python richiesto all'utente)? Il `forceBeamColumn` a lunghezza zero uccide entrambi, ma solo il sidecar sopravvive.
3. Quale `system` di default: `UmfPack` rileva la singolarità, `BandGeneral` no — e `eigen` default resta bandato.
4. Il progetto vuole `xara` (API pulita, `Model` senza globali, matrici NumPy) accettando «experimental» e mac assente oggi, o `openseespy` stabile con stato globale?
5. CQC/SRSS, combinazioni, spettro NTC, verifiche: tutto codice proprio — perimetro delle «funzioni intelligenti».
6. GPL: `opstool`/`opsvis` fuori dall'app o app GPL?

## Raccomandazioni (non decisioni)

- **Solutore sempre fuori processo**: worker Python `openseespy` per job, stderr catturato per chiamata (`redirect_stderr`) e restituito con l'eccezione; considera morto il worker su qualunque uscita senza risultato, anche exit 0.
- **Validazione geometrica prima del solutore** (nodi coincidenti, nodi orfani, elementi a lunghezza zero): OpenSees non la fa per te e in due casi su tre termina il processo.
- `system('UmfPack')` come predefinito; controllo residuo/equilibrio proprio dopo ogni `analyze`.
- Tenere `openseespy` come base (stabile, mac/win/linux), tracciare `xara` come opzione futura quando torna la ruota mac e cade «experimental».
- Sul fronte licenza: **non ridistribuire** ruota/binario finché non c'è risposta scritta da Zhu/UC OTL; l'app installa o localizza il solutore.
- Evitare `opstool`/`opsvis` come dipendenza (GPL); visualizzazione con PyVista/Plotly direttamente.

## Fonti

- https://github.com/OpenSees/OpenSees (`COPYRIGHT`, `CMakeLists.txt`, `SRC/interpreter/PythonStream.{h,cpp}`, `PythonModule.cpp`, `PythonWrapper.cpp`, `OpenSeesCommands.cpp`, `SRC/element/forceBeamColumn/ForceBeamColumn3d.cpp`, `SRC/analysis/integrator/DisplacementControl.cpp`, `SRC/handler/ConsoleErrorHandler.cpp`, `SRC/tcl/commands.cpp`) — `2890cb3`
- https://raw.githubusercontent.com/OpenSees/OpenSeesDocumentation/master/source/developer/license.rst
- https://opensees.github.io/OpenSeesDocumentation/user/manual/analysis/responseSpectrumAnalysis.html · …/modalProperties.html · …/developer/build.html · …/developer/license.html
- https://openseespydoc.readthedocs.io/en/latest/ (index, `src/eigen.html`, `src/rigidDiaphragm.html`, `src/displacementControl.html`, `src/parallelcmds.html`)
- https://pypi.org/pypi/{openseespy,openseespymac,openseespywin,openseespylinux,opensees,xara,opstool,opsvis,veux,sees,osmg,xsection,shps}/json
- https://files.pythonhosted.org/packages/py3/o/openseespymac/openseespymac-3.8.0.0-py3-none-macosx_13_0_arm64.whl
- https://opensees.berkeley.edu/OpenSees/user/download.php · https://opensees.berkeley.edu/OpenSees/code/OpenSeesMac3.8.0-ARM.tar.gz · https://opensees.berkeley.edu/OpenSees/copyright.php
- https://opensees.berkeley.edu/OpenSees/workshops/parallel/OpenSeesSP.pdf
- https://github.com/peer-open-source/xara (README, `LICENSE.txt`) · https://xara.so/user/manual/output/index.html · https://xara.so/user/manual/analysis/index.html · https://gallery.stairlab.io/examples/example1/
- https://api.anaconda.org/package/opensees/opensees · https://api.anaconda.org/package/conda-forge/opensees
- https://api.github.com/repos/{OpenSees/OpenSees,zhuminjie/OpenSeesPy,peer-open-source/xara,yexiang92/opstool,sewkokot/opsvis}
- https://raw.githubusercontent.com/yexiang92/opstool/master/README.md
- Ricerca web (nessun numero utile): https://arxiv.org/pdf/2312.06060, https://www.mdpi.com/2075-5309/13/4/1078, https://opstool.readthedocs.io/en/latest/index.html, https://designsafe-ci.org/user-guide/tools/simulation/opensees/openseesSP/ (403 alla lettura)
- Locali: `/Users/mario/GitHub/Tesi/docs/validazione/ricerca-opensees-e-armature.md`, `/Users/mario/GitHub/Tesi/docs/validazione/ricerca-armature-opensees-fibre.md`, `/Users/mario/GitHub/Tesi/docs/validazione/modi-per-la-normativa.md:32-35`, `/Users/mario/GitHub/Tesi/README.md:4-13`, `/Users/mario/GitHub/Tesi/docs/validazione/README.md:3-11`
