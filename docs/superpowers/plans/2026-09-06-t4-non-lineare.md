# NOVA T4 — non lineare lato dati: legami da classe e veste, statica non lineare, pushover, stato delle sezioni, scala di algoritmi — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** la stessa corsa statica con sezioni a fibre e legami non lineari (`Concrete02` copriferro/nucleo NTC, `Steel02`), una pushover monotona in controllo di spostamento con curva taglio alla base–spostamento, lo stato delle sezioni per stazione a quattro valori su due canali, una scala di algoritmi con passo dimezzato che dichiara la caduta invece di fingere un collasso. Nessuna UI (T5).

**Architecture:** `nova/legami.py` deriva i parametri dei materiali OpenSees dalla classe NTC e dalla veste (`impostazioni_analisi.veste`, default `media`) con il confinamento NTC [4.1.8]–[4.1.12.i] di default e Mander opzionale (→ `Concrete04`); `nova/deck.py` scrive, quando l'analisi lo chiede, sezioni a fibre a due patch (nucleo entro la linea media delle staffe, copriferro fuori) con i materiali non lineari, e i blocchi d'analisi non lineari (statica a passi con scala di algoritmi; pushover con `DisplacementControl` e ciclo Tcl che dimezza il passo) più i recorder delle fibre estreme; `nova/corsa.py` legge i passi (`passi[]`), compone curva e stato delle sezioni e i verdetti nuovi (`armatura_mancante` diventa un vero controllo, `convergenza`, `caduta`); protocollo e server invariati salvo i campi nuovi. Il refactor di `deck.scrivi` (ticket #19) si fa **qui**, nel Task 2, perché è qui che i confini servono.

**Tech Stack:** come T1–T3. `OpenSees` 3.8.0.

**Spec:** `docs/superpowers/specs/2026-09-05-nova-v1-design.md` — user story 46–50, «Generazione del deck e adattamenti» (`Concrete02`/`Steel02` dalla classe e dalla veste, `Concrete04` con Mander opzionale, pushover con `DisplacementControl` e scala di algoritmi; valori dichiarati `f_ym` B450C = 450, `epsU` copriferro = 0,0035, `E_s` = 200 000, `ε_cu` nucleo da NTC [4.1.11]; **tutti campi del materiale, sovrascrivibili e stampati**), «Risultati per corsa» (`passi[]{spostamento, taglio_base, spostamenti[nodo][6], stato_sezioni[asta][stazione], algoritmo}`), «Check Model» (`armatura_mancante` per le corse a fibre). Ricerca: `docs/ricerca/09-legami-costitutivi-ntc.md` (ora su `main`): §1.2–1.3 tabella e numeri di `Concrete02`, §2 `Steel02`, §3.1 formule NTC del confinamento, §3.4 incompatibilità Mander ↔ `Concrete02`, §7 raccomandazione con gli **oracoli**: C25/30 media → `E_c` = 2·33/0,0021 = 31 429 ≈ `E_cm` 31 476; pilastro 30×50 φ8/100 8φ20 → `α` = 0,416, `σ2` = 0,892 MPa, `f_ck,c` = 29,46, `ε_cu2,c` = 0,0106; B450C `k` = 1,15 → `b` = 0,0045. Decisioni di Mario (ticket #12, #13): legami a fibre con valori **medi**, veste come campo del materiale, confinamento NTC di default; statica non lineare poi pushover monotona (nodale / uniforme / modo 1), curva + scrubber (T5) + stato sezioni a 4 valori; `f_ym` 450, `epsU` 0,0035, `E_s` 200 000.

## Global Constraints

Tutti quelli di T1–T3. In più:
- Mai `f_cd`/`f_yd` dentro il legame (doc 09 §1.3, §7): la veste `progetto` esiste come campo ma nell'analisi a fibre produce un **avviso** nel resoconto («veste di progetto nel legame: rigidezza dimezzata, non è la prassi») e non un rifiuto.
- Ogni parametro che entra nel `.tcl` dei materiali è stampato nel `resoconto.materiali` della corsa con la sua provenienza (`classe`, `veste`, `articolo`).
- `Concrete02` vuole compressioni negative e `Ec = 2·fpc/epsc0`: `epsc0 = 2·f_cm/E_cm` così `Ec ≈ E_cm` (doc 09 §1.3).
- La caduta della pushover si dichiara (`caduta: {passo, spostamento, algoritmo, motivo}`) e non si presenta come collasso; la curva resta fino all'ultimo passo convergente.
- `armatura_mancante` in una corsa a fibre non lineare → `non_passato` (rifiuta), non più `non_applicabile`.
- Il numero di fibre resta `impostazioni_analisi.fibre` (default 10) per patch; il nucleo e il copriferro hanno ciascuno la propria `patch`.

## Annotazione del controller (05/09/2026 notte)

| Task | Subagente | Skill-gate | Sequenza |
|---|---|---|---|
| 1 legami | `backend-engineer` (opus: formule di norma con oracoli) | true | primo |
| 2 deck a fibre non lineare + refactor `scrivi` + statica non lineare | `backend-engineer` (opus) | true | dopo 1 |
| 3 pushover, passi, stato sezioni, scala di algoritmi | `backend-engineer` (opus) | true | dopo 2 |
| 4 verdetti, protocollo, server, telaio 2×1 end-to-end | `backend-engineer` (sonnet) | true | dopo 3 |

Ramo `feat/non-lineare` da `main` dopo il merge di T3 (o di T2 se T3 tarda: T4 non dipende da T3). Ticket #19 si chiude nel Task 2. Round pre-merge a quattro; review finale opus.

Fatti già misurati che il piano usa: il deck di T1 scrive `section Fiber {tag} -GJ {gj} { patch rect … ; fiber y z A mat }` con `uniaxialMaterial Elastic` (`nova/deck.py:283-311` a `main` @ `3921d10`), gli elementi `forceBeamColumn … {STAZIONI} {sezione} {transf} -mass …` con 5 punti Lobatto (`:314-318`), i recorder `section k force` per stazione (`corsa._stazioni`, `_COLONNE_SEZIONE = 4`, ordine `P Mz My T`); `opensees._passo_statico` (`meshrec/core/opensees.py:455-494`) è il modello dei blocchi d'analisi (`constraints Transformation`, `numberer RCM`, `system BandGeneral`, `test NormDispIncr`, `if {[analyze 1] != 0} {puts MARCA_MANCA; exit 1}`); `sp` su dof già `fix` funziona con Transformation (misurato 05/09).

## File structure

```
nova/legami.py         classe + veste → parametri Concrete02/Concrete04/Steel02; confinamento NTC e Mander; oracoli
nova/modello.py        Materiale.legame (campi sovrascrivibili), AnalisiStatica.legami, AnalisiPushover
nova/deck.py           refactor: _geometria(m) / _sezioni(m, geometria, legami) / _carichi(...) / _scrivi(...); sezioni a due patch; blocchi non lineari; recorder delle fibre
nova/passi.py          lettura dei passi (recorder con -time), curva, stato delle sezioni a 4 valori su 2 canali
nova/corsa.py          corsa non lineare e pushover, verdetti convergenza/caduta/armatura_mancante, resoconto.materiali
tests/test_legami.py, tests/test_non_lineare.py (deck, senza binario), tests/test_pushover_binario.py
tests/fixture/pilastro_30x50.nova.json   il pilastro degli oracoli di doc 09 §3.3 (8φ20, staffe φ8/100)
```

---

### Task 1: Legami da classe e veste

**Files:**
- Create: `nova/legami.py`, `tests/test_legami.py`, `tests/fixture/pilastro_30x50.nova.json`
- Modify: `nova/modello.py` (`Legame`, `Materiale.legame`), `nova/catalogo.py` (`valori` porta anche `fcm`, `fctm`, `Ecm`, `fyk`, `ftk`, `epsuk` per veste)

**Interfaces:**
- `nova.modello.Legame(_Base)`: `tipo: Literal["elastico", "concrete02", "concrete04", "steel02"] = "elastico"`, `confinamento: Literal["nessuno", "ntc", "mander"] = "ntc"`, `epsU_copriferro: float = 0.0035`, `epsU_nucleo: float | None = None` (None → NTC [4.1.11]), `lambda_: float = Field(0.1, alias="lambda")`, `fpcu_su_fpc: float = 0.2`, `Es: float = 200000.0`, `fym: float | None = None` (None → `fyk` = 450 per B450C), `b: float | None = None` (None → da `k` = 1,15 e `ε_ud` = 0,0675: 0,0045), `R0: float = 18`, `cR1: float = 0.925`, `cR2: float = 0.15`; `Materiale.legame: Legame = Legame()`;
- `nova.legami.calcestruzzo(materiale, veste, sezione, staffe, barre) -> dict` con `copriferro: {tipo, fpc, epsc0, fpcu, epsU, lambda, ft, Ets, Ec}` e `nucleo: {…, fcc, epscc, epscu, alpha, sigma2, articolo}` (per `confinamento: "ntc"`: [4.1.8]–[4.1.12.i]; `"mander"` → `Concrete04` con `Ec = E_cm` e `fcc`, `ecc` di Mander 1988; `"nessuno"` → nucleo = copriferro);
- `nova.legami.acciaio(materiale, veste) -> dict` `{tipo: "steel02", Fy, E, b, R0, cR1, cR2, eps_ud}`;
- `nova.legami.righe_tcl(tag, parametri) -> list[str]` (la sola funzione che formatta: `uniaxialMaterial Concrete02 tag fpc epsc0 fpcu epsU lambda ft Ets ;# classe, veste, articolo`);
- `nova.legami.veste_valori(classe, veste) -> dict`: `caratteristica` → `f_ck`, `f_ctk`, `f_yk`; `media` → `f_cm = f_ck + 8`, `f_ctm`, `f_ym = fym or f_yk`; `progetto` → `f_cd = 0,85 f_ck/1,5`, `f_ctd`, `f_yd = f_yk/1,15` (+ avviso); `esistente` → media/FC con `FC = 1,0` (campo futuro, oggi come media con nota);
- `nova.legami.confinamento_ntc(b, h, copriferro, staffe: Staffe, barre: list[Barra], f_yk_st=450) -> dict` con `bx, by, alpha_n, alpha_s, alpha, sigma_l, sigma2, fck_c, epsc2_c, epscu2_c` (formule [4.1.8]–[4.1.12.g]; `b_i` = interassi fra barre consecutive contenute, calcolati dalle posizioni delle barre di `deck._barre`; `A_st` = `bracci · π φ²/4`).

## Ingressi degeneri
- C25/30 veste media → `fpc = −33`, `epsc0 = −2·33/E_cm` con `E_cm = 22000·(33/10)^0,3 = 31 476` → `−0,002097`, `Ec = 2·fpc/epsc0 = 31 476 ± 1`, `ft = f_ctm = 2,565`, `Ets = ft/0,002`, `fpcu = −6,6`, `epsU = −0,0035` (copriferro) — gli oracoli di doc 09 §1.3 e §7
- veste `caratteristica` → `fpc = −25`; `progetto` → `fpc = −14,17` **e** un avviso nel dizionario (`avvisi: ["veste di progetto nel legame …"]`), mai un'eccezione
- pilastro 30×50, C25/30, B450C, 8φ20 (3 inf + 3 sup + 1+1 laterali), staffe φ8/100 a 2 bracci, copriferro 30 → `alpha = 0,416 ± 0,005`, `sigma2 = 0,892 ± 0,01`, `fck_c = 29,46 ± 0,05`, `epscu2_c = 0,0106 ± 0,0002` (doc 09 §3.3 e §7)
- `σ2 ≤ 0,05 f_ck` → [4.1.8]; `σ2 > 0,05 f_ck` → [4.1.9] (test ai due lati della soglia, con il passo delle staffe che cambia)
- staffe assenti → `confinamento: "nessuno"` forzato con nota, nucleo = copriferro, nessuna eccezione
- `s ≥ 2·b_x` (staffe rade) → `alpha_s ≤ 0` → `alpha = 0`, `fck_c = f_ck`, non negativo
- B450C → `Fy = 450`, `E = 200 000`, `b = 0,0045 ± 0,0005`, `eps_ud = 0,0675`; `fym: 480` sovrascrive `Fy`; `b: 0.01` sovrascrive `b`
- `epsU_nucleo` dichiarato → vince su [4.1.11]; `epsU_copriferro: 0.01` → prassi, accettato
- `confinamento: "mander"` → `Concrete04` con `Ec = E_cm` esplicito, `fcc` e `ecc` di Mander con `k_e` = `alpha`; l'`ecc` di Mander **non** finisce in un `Concrete02` (doc 09 §3.4)
- classe di acciaio `B450A` → `eps_ud = 0,9·0,025 = 0,0225`, `b` ricalcolato (doc 09 §2)
- `righe_tcl` con `fpc` positivo → `ValueError` «Concrete02 vuole compressioni negative» (guardia contro un segno scappato)

Step: fixture del pilastro → test rossi → `legami.py` + `Legame` → verde → commit `feat(legami): Concrete02, Concrete04 e Steel02 dalla classe NTC e dalla veste, confinamento NTC e Mander`.

---

### Task 2: Deck a fibre non lineare e statica non lineare (con il refactor di `scrivi`, #19)

**Files:**
- Modify: `nova/deck.py` (refactor in `_geometria`, `_sezioni`, `_carichi`, `_scrivi`; `scrivi(m, casi, cartella, modi=None, legami="elastico")`; sezioni a due patch; blocchi statici non lineari), `nova/modello.py` (`AnalisiStatica.legami: Literal["elastico", "fibre"] = "elastico"`, `AnalisiStatica.passi: int = Field(10, ge=1)`), `nova/check.py` (`armatura_mancante` `non_passato` se una statica a fibre è dichiarata e una sezione usata non ha barre), `nova/corsa.py` (`resoconto.materiali`, `convergenza` per caso), `tests/test_non_lineare.py`, `tests/test_corsa_binario.py`

**Interfaces:**
- `Deck` guadagna `legami: str`, `materiali: dict` (i parametri stampati per sezione: `{sezione_id: {copriferro, nucleo, acciaio}}`), `SCALA_ALGORITMI = ("Newton", "ModifiedNewton", "KrylovNewton")`;
- sezione a fibre non lineare: `patch rect <nucleo> nf nf` sul rettangolo interno alla linea media delle staffe (`b_x = b − 2(c + φ_st/2)`, `b_y = h − 2(c + φ_st/2)`), quattro `patch rect <copriferro>` sulle fasce esterne, barre `fiber … <acciaio>`; tre `uniaxialMaterial` per sezione (nucleo, copriferro, acciaio) da `legami.righe_tcl`; `-GJ` come oggi;
- blocco statico non lineare per caso (`legami == "fibre"`): `integrator LoadControl {1/passi}`, `test NormDispIncr 1e-6 50`, ciclo Tcl sui passi con la scala: per ogni passo prova `Newton`, se `analyze 1 != 0` prova `ModifiedNewton -initial`, poi `KrylovNewton`, poi dimezza il passo (`integrator LoadControl {dt/2}`, fino a 6 dimezzamenti); se fallisce comunque → `puts "MARCA_MANCA: caso X caduto al passo k, fattore λ"`, `exit 1`; ogni passo convergente scrive `puts` nel registro «caso X passo k algoritmo A fattore λ» (la corsa lo legge per `convergenza`);
- recorder delle fibre per stazione: `recorder Element -file {caso}_sez{k}_fibre.out -eleRange 1 n section k fiber <y> <z> <mat> stressStrain` per le **quattro** fibre estreme del calcestruzzo (angoli del nucleo) e per le barre estreme (una per lato) — le posizioni le decide `_sezioni` e le riporta in `Deck.fibre_registrate[sezione_tag]`; in T4 basta l'ultimo passo per la statica (stato finale), la pushover li legge per passo (Task 3);
- `corsa.risultati_da_uscite` → `per_caso[caso]["stato_sezioni"]` (Task 3 lo generalizza ai passi) e `run.materiali`.

## Ingressi degeneri
- `legami: "elastico"` (default) → deck identico a oggi byte per byte sul `telaio_2x1` (test di regressione: confronto con un `.tcl` di riferimento salvato in fixture, generato a `main` prima del refactor, salvo la riga di intestazione)
- refactor: le 235+ test di T1/T2 restano verdi senza modifiche ai test (solo aggiunte)
- statica a fibre su sezione senza barre → `armatura_mancante: non_passato` in C1, la corsa è `rifiutata`; con `forza` il deck scrive comunque (nucleo + copriferro senza acciaio)
- staffe assenti con barre presenti → sezione a **una** patch con il copriferro ovunque (`confinamento: nessuno` con nota nel resoconto), non `ValueError`
- `copriferro + φ_st/2 ≥ min(b, h)/2` → il nucleo ha area nulla → `errore fase deck` che nomina la sezione (già respinto in T1 per le barre: qui anche senza barre)
- telaio 2×1 statica a fibre con i carichi di T1 (elastici di fatto: tensioni sotto `f_ctm`) → Σ reazioni uguali al caso elastico entro 1e-4 relativo; spostamenti entro 3 % (le fibre non lineari in campo elastico hanno `Ec ≈ E_cm`, non `E` del catalogo elastico: dichiara lo scarto misurato)
- carico che porta la trave oltre la fessurazione (moltiplica `q` per 20 sul `trave_appoggiata`) → converge con la scala, `convergenza: passato` con l'elenco degli algoritmi usati per passo, `u_mezzeria` maggiore dell'elastico (test: rapporto > 1,05)
- carico che rompe la trave (`q` × 200) → `errore fase solutore` con «caduto al passo k» e il fattore λ nel motivo, `coda_log` con le righe di OpenSees; oppure `esito: ok` con `convergenza: non_passato` se la scala regge fino all'ultimo dimezzamento — la misura decide, il test accetta l'uno o l'altro **ma non** un `esito: ok` con `convergenza: passato`
- `passi: 1` → un solo passo (come `LoadControl 1`); `passi: 1000` → 1000 `analyze`, lecito, il test non lo lancia
- `veste: progetto` → `resoconto.avvisi` con l'avviso di `legami`, corsa non rifiutata

Step: fixture `.tcl` di riferimento → test rossi → refactor (i test vecchi verdi) → sezioni a due patch → blocchi non lineari → verde → commit `feat(deck): sezioni a fibre non lineari e statica a passi con scala di algoritmi` (chiude #19).

---

### Task 3: Pushover, passi, curva, stato delle sezioni

**Files:**
- Create: `nova/passi.py`, `tests/test_pushover_binario.py`
- Modify: `nova/modello.py` (`AnalisiPushover`), `nova/deck.py` (blocco pushover), `nova/corsa.py` (`passi`, `caduta`, `stato_sezioni` per passo), `nova/check.py` (`riferimenti`: nodo/dof di controllo esistenti; `pushover senza modale` con `distribuzione: modo1`)

**Interfaces:**
- `nova.modello.AnalisiPushover(_Base)`: `tipo: Literal["pushover"]`, `distribuzione: Literal["nodale", "uniforme", "modo1"]`, `nodo_controllo: int`, `dof: Literal["ux", "uy", "uz"]`, `incremento: float = Field(gt=0)`, `spostamento_max: float = Field(gt=0)`, `forze_nodali: list[{nodo, fx, fy, fz}] = []` (per `nodale`), `caso_gravita: str | None` (il caso statico applicato prima, mantenuto con `loadConst -time 0.0`), `passi_max: int = 2000`;
- deck: dopo i casi statici e la modale (se `modo1`: la modale è **obbligatoria** e la distribuzione è `φ1[i] · m[i]` sui nodi con massa, normalizzata), `pattern Plain … { load … }` con la distribuzione, `integrator DisplacementControl {nodo} {dof} {incremento}`, `analysis Static`, ciclo Tcl: `while {[nodeDisp nodo dof] < spostamento_max && passo < passi_max}`: prova la scala di algoritmi, dimezza l'incremento (fino a 8 volte) e lo ripristina dopo un passo riuscito; ogni passo riuscito → `record` e `puts "passo k algoritmo A incremento d"`; caduta → `puts "MARCA_CADUTA: passo k spostamento d algoritmo A"`, **niente `exit 1`**: la curva fino a lì vale, poi il marcatore di fine normale; recorder `-time` per spostamenti (tutti i nodi, 6 dof), reazioni (vincolati), fibre estreme per stazione;
- `nova.passi.leggi(cartella, deck) -> dict` → `passi: [{n, spostamento, taglio_base (= −Σ reazioni lungo dof), spostamenti[nodo][6], stato_sezioni[asta][stazione]{calcestruzzo, acciaio}, algoritmo, incremento}]`, `caduta: None | {passo, spostamento, algoritmo, motivo}`;
- stato a 4 valori: `elastica` (|ε_c| < ε_ct = f_ctm/E_cm in trazione e |ε_c| < 0,3·ε_c0 in compressione, acciaio < f_y/E), `fessurata` (ε_t,c ≥ ε_ct), `snervata` (|ε_s| ≥ f_y/E_s), `schiacciata` (ε_c ≤ −epsU del copriferro nella fibra di copriferro, o ≤ −ε_cu2,c nel nucleo); due canali: `calcestruzzo ∈ {elastica, fessurata, schiacciata}`, `acciaio ∈ {elastica, snervata, rotta (ε ≥ ε_ud)}`; soglie dai parametri stampati in `run.materiali`, non ricalcolate.

## Ingressi degeneri
- `nodo_controllo` inesistente / `dof` bloccato dal vincolo → `riferimenti: non_passato` in C1 con l'id («il nodo di controllo è vincolato in ux»)
- `distribuzione: modo1` senza `AnalisiModale` nel modello → C1 `non_passato` «la distribuzione modo1 richiede l'analisi modale»
- `nodale` senza `forze_nodali` → C1 `non_passato`; `uniforme` → forze ∝ massa di ogni nodo (masse lumped del deck) lungo `dof`
- `incremento` maggiore di `spostamento_max` → un passo solo, lecito
- telaio 2×1, pushover `uniforme` in `ux` sul nodo 4, incremento 1 mm, max 60 mm, con `caso_gravita: "Z3"` → `esito: ok`; curva monotona in spostamento (`passi[i+1].spostamento > passi[i].spostamento` sempre); `taglio_base` cresce poi cala o si appiattisce (test: il massimo non è l'ultimo passo **oppure** la caduta è dichiarata prima di 60 mm); `taglio_base[k] == −Σ reazioni_x[k]` entro 1e-6 per ogni passo (equilibrio per passo); nessun `nan` nella curva
- caduta prima di `spostamento_max` → `caduta` piena, `passi` non vuoti, `esito: ok`, verdetto `caduta: non_passato`? no: `caduta` è un **fatto**, il verdetto è `convergenza: non_passato` con `ragione` «caduta al passo k, spostamento d, ultimo algoritmo A» (story 50)
- pushover che arriva a `spostamento_max` senza caduta → `caduta: null`, `convergenza: passato`
- `passi_max` raggiunto → `caduta.motivo: "passi_max"`, dichiarato
- stato delle sezioni: al passo 1 tutte `elastica`; all'ultimo passo convergente almeno una stazione `fessurata` (il telaio 2×1 spinto di 60 mm fessura) e, se la caduta non arriva prima, almeno una `snervata` ai piedi dei pilastri — la misura decide, il test pinza ciò che misuri con la data nel commento
- stato con `forza` su sezione senza barre → canale `acciaio: null` (non «elastica»: non c'è acciaio)
- `spostamenti[nodo]` del passo k con un `null` (recorder troncato) → `errore fase solutore` che nomina il file e il passo

Step: test rossi (deck senza binario: comandi presenti; binario: la curva) → `AnalisiPushover` → deck → `passi.py` → corsa → verde → commit `feat(pushover): pushover in controllo di spostamento con curva, stato delle sezioni e caduta dichiarata`.

---

### Task 4: Verdetti, protocollo, server, telaio 2×1 end-to-end

**Files:**
- Modify: `nova/corsa.py` (`controlli`: `convergenza`, `armatura_mancante` reale in una corsa a fibre), `nova/sidecar.py` (nessun comando nuovo; `corsa` porta `passi` e `caduta`), `nova/server.py` (`/api/risultati` invariata: il file cresce), `README.md`, `docs/caso-studio/README.md` (pushover del MURO 1: distribuzione `uniforme`, nodo 3, `ux`, con la curva in CSV in `docs/caso-studio/pushover.csv` **solo se** il binario c'è al momento del commit, altrimenti dichiarato «da generare»)
- Create: `tests/test_caso_studio.py::test_pushover_muro_1` (binario)

## Ingressi degeneri
- corsa elastica (T1) → `passi: []`, `caduta: null`, `convergenza: non_applicabile` con ragione (regressione dei test di T1)
- corsa a fibre statica → `convergenza` per caso con gli algoritmi usati; pushover → un verdetto `convergenza` per la pushover
- `risultati.nova.risultati.json` di una pushover da 2 000 passi × 6 nodi × 6 dof → sotto 5 MB (test: `< 5e6` byte sul telaio 2×1 a 60 mm); se cresce oltre, `spostamenti` per passo si campionano ogni `passo_campionamento` (campo di `AnalisiPushover`, default 1) — decidilo con la misura e dichiaralo
- MURO 1 pushover → curva con `taglio_base` massimo riportato nel README con la scritta «verifica del codice, non validazione» (nessuna prova ai pistoni documentata)

Commit `feat(corsa): verdetti di convergenza e armatura, pushover nel protocollo; pushover del MURO 1`.

---

## Self-review

- Story 46 → Task 1+2; 47 → Task 3; 48 (curva con passi cliccabili e scrubber) → dati in Task 3, UI in T5; 49 → Task 3 (stato a 4 valori, due canali); 50 → Task 2+3 (scala, dimezzamento, caduta dichiarata).
- Spec «tutti campi del materiale, sovrascrivibili e stampati» → `Legame` + `run.materiali`.
- Placeholder: nessun TBD; le misure (scarto elastico/fibre, stato delle sezioni al passo finale, dimensione del file) sono dichiarate come misure con oracolo aperto («la misura decide, il test pinza»).
- Coerenza: `SCALA_ALGORITMI` in `deck` e letta da `corsa`/`passi`; `Deck.fibre_registrate` scritta in Task 2 e letta in Task 3; `legami.righe_tcl` unica formattazione; `armatura_mancante` cambia esito in Task 2 e il verdetto è lo stesso oggetto di `check._v`.
