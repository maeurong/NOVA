# NOVA T3 — confronto telaio ↔ solido (CalculiX, CSV Abaqus) lato dati — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** NOVA localizza `ccx`, lancia da sé il deck solido `.inp` di MeshRec, ne legge reazioni, spostamenti in sommità, massa e modi; legge i risultati Abaqus da un CSV con schema dichiarato; produce la tabella di confronto (prima riga la massa) con scarto percentuale, classe di concordanza a tre valori e bias atteso, esportabile in CSV e LaTeX con provenienza. Nessuna UI (T5).

**Architecture:** un secondo «sidecar» logico dentro lo stesso processo: comando `ccx` del protocollo (`nova/ccx.py`, riusa `solve._trova`/`disponibilita` per localizzare `ccx`, `solve.leggi_reazioni`, `solve.leggi_frd`, `solve.leggi_frequenze`, `solve.leggi_massa_modale` per leggere `.dat`/`.frd`); un parser minimo del `.inp` (`nova/inp.py`: nomi dei passi dai commenti `** NOME PASSO:`, set di nodi, `*DENSITY`, `*DLOAD GRAV`) **senza meshio** (decisione: 40 righe di parsing contro una dipendenza nuova; la spec nominava meshio, il costo non si giustifica); `nova/confronto.py` costruisce la tabella da due file di risultati (telaio NOVA, solido) e da un CSV Abaqus; comandi `ccx` e `confronto`, rotte `/api/ccx`, `/api/confronto`; il caso studio chiude con la tabella sul deck vero.

**Tech Stack:** come T1/T2; `ccx` 2.22 in `~/.local/bin/ccx`. Nessuna dipendenza nuova (niente meshio, niente matplotlib: le figure sono T5/T6 nel browser).

**Spec:** `docs/superpowers/specs/2026-09-05-nova-v1-design.md` — user story 56–61, «Confronto», «Testing Decisions», «Further Notes» (fatti misurati: solido 14 116 nodi / 51 892 tetraedri; **nessuna prova di carico documentata: verifica del codice, non validazione**). Misure: `docs/caso-studio/corsa-ccx-2026-09-05.md` (exit 0 in 5,3 s; Σ Rz 4 248,58 N; massa 0,4331 t; f1 21,0 Hz fuori piano; f2 34,0 Hz nel piano; TOTAL EFFECTIVE MASS 95/96/94 %).

## Global Constraints

Tutti quelli di T1/T2. In più:
- **«Verifica del codice, non validazione»** è una stringa che ogni tabella e ogni export porta (`nova.confronto.AVVERTENZA`).
- La prima riga della tabella è sempre la massa (telaio | solido | scarto).
- Nessun pass/fail sul confronto: scarto percentuale + classe `concorde (≤ 5 %) | vicino (≤ 20 %) | lontano (> 20 %) | non_confrontabile` + `bias_atteso` (testo fisso per grandezza).
- L'unico verdetto vero sul solido è l'equilibrio (`reazioni`), come sul telaio.
- Il deck `.inp` non si modifica: si copia nella cartella della corsa e si lancia com'è.
- `g` del solido è quello scritto nel deck (`*DLOAD … GRAV, 9810`), letto e riportato, non assunto uguale a `GRAVITA`.
- Il deck vero (`lab_telaio_v2/wall_model.inp`, 2,5 MB, gitignored) **non** entra nei test: i test sul binario usano una fixture piccola generata (Task 1 Step 1) e saltano senza `ccx`; il caso studio lo lancia solo se il file c'è (skip altrimenti).

## Annotazione del controller (05/09/2026 notte)

| Task | Subagente | Skill-gate | Sequenza |
|---|---|---|---|
| 1 corsa ccx + parser `.inp` | `backend-engineer` (opus) | true | primo |
| 2 confronto + CSV Abaqus + export | `backend-engineer` (sonnet) | true | dopo 1 |
| 3 caso studio: tabella sul deck vero | `backend-engineer` (sonnet) | true | dopo 2 e dopo T2 Task 4 (usa `muro_1.nova.json`) |

Ramo `feat/confronto-calculix` da `main` dopo il merge di T2. Round pre-merge a quattro (security: `ccx` riceve il percorso di un `.inp` dal corpo HTTP e lo copia; `confronto` legge un CSV dal corpo). Fatti già misurati: `solve.leggi_reazioni(dat, passo=k)` (`:341`, ultimo blocco «forces» prima di `E I G E N V A L U E`, `passo` isola lo `S T E P n`); `solve.leggi_frd(frd) -> list[Blocco(grandezza, passo, modale, valore, nodi, dati)]` (`:245-300`, blocchi `-4 DISP` con 3+ componenti per nodo); `solve.leggi_frequenze(dat)`, `solve.leggi_massa_modale(dat)` (`:903`, `:1027`, con `righe=` per non rileggere); `solve._trova("calculix", percorso)`, `disponibilita(SolutoreConfig(nome="calculix", percorso=…))["calculix"]` (`:1279-1357`); `solve.risolvi` (`:1502`) è accoppiato alla pipeline di MeshRec (`AnalysisConfig`, `write_vtu`, trasformata) e **non** si riusa: si riusano i lettori. Il `.dat` del deck vero: `forces (fx,fy,fz) for set BASE and time  0.1000000E+01` per passo, 3 743 righe nodo; ccx non stampa i totali (niente `TOTALS=YES` nel deck) → si somma con numpy; il blocco modale ripete «forces» per ogni modo dopo `S T E P 4`: fermarsi lì (già in `leggi_reazioni`).

## File structure

```
nova/inp.py           parser minimo del deck ccx: passi (nome, tipo), set di nodi, densità, g, materiale
nova/ccx.py           localizza e lancia ccx, legge .dat/.frd, scrive risultati_solido.json, verdetti
nova/confronto.py     tabella di confronto, classe di concordanza, CSV Abaqus, export CSV/LaTeX, provenienza
nova/sidecar.py       comandi ccx, confronto
nova/server.py        POST /api/ccx, POST /api/confronto
tests/fixture/solido_piccolo/{genera.py, trave.inp}   un parallelepipedo a tetraedri (poche centinaia) con BASE/TOP e i 4 passi del deck vero
tests/fixture/abaqus_esempio.csv
tests/test_inp.py, tests/test_ccx.py (binario), tests/test_confronto.py
docs/caso-studio/confronto-<data>.md + confronto.csv + confronto.tex
```

---

### Task 1: Corsa CalculiX dal deck `.inp` e lettura dei risultati

**Files:**
- Create: `nova/inp.py`, `nova/ccx.py`, `tests/test_inp.py`, `tests/test_ccx.py`, `tests/fixture/solido_piccolo/genera.py`, `tests/fixture/solido_piccolo/trave.inp`, `tests/fixture/solido_piccolo/README.md`
- Modify: `nova/sidecar.py` (`ccx`, `COMANDI`), `nova/server.py` (`POST /api/ccx {inp}`), `tests/test_sidecar.py`, `tests/test_server.py`

**Interfaces:**
- `nova.inp.leggi(percorso: Path) -> Inp` (dataclass): `passi: list[Passo(nome, tipo: "statico"|"modale", n_modi: int | None)]` (nome dal commento `** NOME PASSO: X` che precede `*STEP`, altrimenti `f"passo {k}"`), `set_nodi: dict[str, list[int]]` (da `*NSET, NSET=…`, anche con `GENERATE`), `densita: float | None`, `elastico: tuple[E, nu] | None`, `g: float | None` (dal primo `*DLOAD … GRAV, g, …`), `n_nodi`, `n_elementi`, `tipo_elemento`;
- `nova.ccx.verifica(percorso: str | None) -> dict` come `corsa.verifica` ma per `calculix` (`esito ok | rotto | assente`, `dove_prenderlo`);
- `nova.ccx.esegui(inp: Path, cartella: Path, percorso_solutore=None, emetti=…) -> dict` con `esito: ok | errore | assente`; su `ok` scrive `cartella/risultati_solido.json`:
  ```
  run       {id, data, solutore: "CalculiX", versione, deck: <copia>, sha256_deck, registro, g, secondi, n_nodi, n_elementi, tipo_elemento}
  massa     float [t]  = Σ Rz del primo passo gravitazionale / g   (dichiarato: "massa dal solutore, non dal .vtu")
  passi     [nome]{reazioni_somma: [Fx, Fy, Fz], u_set: {TOP: {max: [3], medio: [3]}}, n_reazioni}
  modi      [n]{f, massa_partecipante{x,y,z}, cumulata{x,y,z}}   (frazioni 0–1, dal .dat: EFFECTIVE MODAL MASS / TOTAL EFFECTIVE MASS)
  verdetti  [reazioni per passo statico (Σ R contro −(peso + carichi dichiarati nel deck): solo per il passo gravitazionale, negli altri `non_applicabile` con ragione «carichi del deck non ricostruiti»), avvisi (conteggio `*WARNING` nello stdout), marcatore]
  ```
  Il marcatore di fine del ccx è la riga `Job finished` nello stdout **e** un `.frd` che `leggi_frd` chiude (aperti == chiusi); il codice d'uscita non è il segnale.
- Comando sidecar `ccx {inp, cartella, solutore?}` → la risposta di `esegui` con eventi di fase (`copio il deck`, `lancio ccx`, `leggo .dat e .frd`); rotta `POST /api/ccx {inp}` → `cartella_corse/<run_id>/`.

## Ingressi degeneri
- `ccx` non nel PATH → `assente` con `dove_prenderlo` (`solve.DOVE_PRENDERLO["calculix"]`)
- `.inp` inesistente / cartella / non testo → `errore fase deck` che nomina il percorso
- `.inp` senza `*STEP` → `errore fase deck` «nessun passo»; senza `*NSET TOP` → `u_set` vuoto, non `KeyError`; senza `*DENSITY` → `massa: null` e `reazioni: non_applicabile`
- ccx che esce senza `Job finished` (deck rotto: `*ERROR`) → `errore fase solutore` con `coda_log` (le ultime 2 000 caratteri) e le righe `*ERROR`
- `.frd` troncato → `errore fase solutore` con il messaggio di `leggi_frd` (nomina il file e i blocchi aperti/chiusi)
- `.dat` senza blocco modale → `modi: []`, `massa_modale` assente (il deck non chiedeva la modale)
- passo gravitazionale con Σ Rz ≠ m·g oltre `_TOLLERANZA_REAZIONI` → `reazioni: non_passato`; sulla fixture piccola Σ Rz = ρ · V · g entro 1e-6 (V del parallelepipedo noto)
- timeout (`_TIMEOUT_S = 1800` per il solido) → `errore fase solutore` «timeout»
- due corse nella stessa cartella → `.dat`, `.frd`, `.sta`, `.cvg`, `risultati_solido.json` cancellati prima; `spooles.out` e `.12d` idem (li lascia ccx)
- deck vero (2,5 MB) → se `lab_telaio_v2/wall_model.inp` esiste: exit 0, Σ Rz `GRAVITA` = 4 248,58 ± 0,01, f1 = 21,007 ± 0,01, f2 = 34,011 ± 0,01, massa 0,4331 ± 0,0001 (misure del 05/09); altrimenti `pytest.skip`
- `inp` dal corpo HTTP con `..` → lecito (utente locale), copiato nella cartella della corsa; il nome del file copiato è sempre `solido.inp` (nessun percorso dell'utente rientra nel comando `ccx -i`)

Step 1: `genera.py` scrive `trave.inp` (parallelepipedo 200×100×1000 mm, griglia 4×2×20 di esaedri spezzati in 6 tetraedri ciascuno → C3D4, `BASE` = nodi a z=0, `TOP` = nodi a z=1000, materiale C25/30 del deck vero, `*BOUNDARY BASE,1,3`, passi `GRAVITA`, `SPINTA_ORIZZONTALE` (0,1 g in y), `CARICO_TOP` (gravità + `*CLOAD` −1 200 N su TOP ripartiti), `MODALE` 10 modi — lo stesso schema del deck vero: leggi `lab_telaio_v2/wall_model.inp:67272-70360` per copiare le parole chiave esatte); README con volume, massa attesa, sha256; test di riproducibilità del generatore. Step 2: test rossi (`test_inp.py` sul `trave.inp` e sul deck vero se c'è; `test_ccx.py` con `binario_ccx` fixture in `conftest.py` come `binario_opensees`). Step 3-4: codice. Step 5: verifica + commit `feat(ccx): corsa CalculiX dal deck .inp con reazioni, sommità, massa e modi`.

---

### Task 2: Tabella di confronto, CSV Abaqus, export

**Files:**
- Create: `nova/confronto.py`, `tests/test_confronto.py`, `tests/fixture/abaqus_esempio.csv`
- Modify: `nova/sidecar.py` (`confronto`), `nova/server.py` (`POST /api/confronto`)

**Interfaces:**
- `nova.confronto.AVVERTENZA = "verifica del codice, non validazione"`; `SOGLIE = (0.05, 0.20)`; `classe(scarto) -> "concorde" | "vicino" | "lontano"`, `None` → `"non_confrontabile"`;
- `nova.confronto.leggi_csv(percorso) -> list[dict]` con schema **obbligatorio** `caso, grandezza, valore, unita, fonte` (intestazione esatta, `;` o `,` riconosciuti, virgola decimale ammessa);
- `nova.confronto.confronta(telaio: dict, solido: dict | None, abaqus: list[dict] | None, mappa_casi: dict[str, str]) -> Tabella` con `righe: list[Riga(grandezza, caso, unita, telaio, solido, abaqus, scarto_solido_pct, scarto_abaqus_pct, classe_solido, classe_abaqus, bias_atteso)]`, `provenienza: dict` (commit NOVA `git rev-parse` se disponibile, `run.id` dei due file, `sha256_deck`, versioni dei solutori, data), `avvertenza`;
  righe, nell'ordine: `massa` [t] (telaio: `Σ massa_lineare · L` + masse nodali, dal `run.carico_totale` del caso di solo peso / g; solido: `massa`); per ogni caso mappato: `reazione_x`, `reazione_z` [N] (Σ), `u_sommita_x`, `u_sommita_z` [mm] (telaio: nodo/i dichiarati in `mappa_casi["nodi_sommita"]`, media; solido: `u_set.TOP.medio`), `taglio_base` [N] (= Σ reazione x, solo sul caso di spinta); `f1`, `f2`, `f3` [Hz] appaiati per direzione dominante della forma (telaio: `forma` → asse con `max |u|`; solido: `massa_partecipante` → asse con il massimo), non per numero d'ordine; `massa_partecipante_x/y/z` [%] dell'ultimo modo;
  `bias_atteso` fisso per grandezza (dizionario in testa al modulo, testo dalla spec: «tetraedri lineari più rigidi → spostamenti e periodi del solido più piccoli», «telaio senza nodo rigido né fondazioni deformabili → telaio più deformabile», «massa: zapatas e tamponatura fuori dal telaio»);
- `nova.confronto.esporta(tabella, cartella) -> dict[str, Path]` scrive `confronto.json`, `confronto.csv` (virgola decimale **no**: CSV con punto, `;` come separatore, dichiarato nell'intestazione `# unita: mm N t Hz; separatore ;`), `confronto.tex` (`booktabs`, notazione italiana con la virgola, piè di tabella con provenienza e `AVVERTENZA`);
- comando `confronto {telaio: <percorso risultati.nova.risultati.json>, solido?: <percorso risultati_solido.json>, abaqus?: <percorso csv>, mappa_casi: {…}, cartella?}` → `{esito: ok, tabella, file}`; rotta `POST /api/confronto`.

## Ingressi degeneri
- solo `telaio` (né solido né CSV) → tabella con le colonne del solido vuote, classi `non_confrontabile`, nessuna eccezione
- CSV con intestazione diversa (`case,quantity,…`) → `errore fase confronto` che nomina le cinque colonne attese; riga con `valore` non numerico → errore che nomina la riga; `unita` diversa da quella del telaio per la stessa grandezza → `non_confrontabile` con ragione
- `mappa_casi` che nomina un caso assente nel telaio o un passo assente nel solido → `errore fase confronto` con i nomi validi
- massa del telaio 0 (modello senza aste, `forza`) → `scarto: null`, `non_confrontabile`, nessuna divisione per zero
- valore del solido 0 (spinta nulla) → `scarto: null`
- modi del telaio con tutte le forme fuori piano (nessun modo con x dominante) → `f` del piano `non_confrontabile` con ragione, non un accoppiamento per numero
- `esporta` in cartella non scrivibile → `errore fase confronto` con il motivo dell'OS
- LaTeX: numeri con la virgola (`3.141` → `3,141`), `%` scappato, nessun carattere non ASCII fuori da `\usepackage[utf8]`; un test compila? no (nessun `pdflatex` sulla macchina): il test verifica `\begin{tabular}`, `\bottomrule`, l'avvertenza e la provenienza nel piè
- CSV Abaqus con `fonte` vuota → accettato, `fonte: "?"` nella tabella

Step: fixture CSV (tre righe: `GRAVITA;reazione_z;4250,1;N;Abaqus 2024 su Windows, 02/09/2026`) → test rossi → `confronto.py` → sidecar/server → verde → commit `feat(confronto): tabella telaio-solido con classe di concordanza, CSV Abaqus, export CSV e LaTeX`.

---

### Task 3: Caso studio — tabella sul deck vero

**Files:**
- Create: `docs/caso-studio/confronto-<data>.md`, `docs/caso-studio/confronto.csv`, `docs/caso-studio/confronto.tex`, `tests/test_caso_studio.py::test_confronto_sul_deck_vero` (skip senza il deck o senza `ccx`)
- Modify: `docs/caso-studio/README.md` (§«Confronto»)

Procedura: corsa NOVA su `docs/caso-studio/muro_1.nova.json` (T2 Task 4), corsa `ccx` su `lab_telaio_v2/wall_model.inp`, `mappa_casi = {"C1": "GRAVITA", "C2": "SPINTA_ORIZZONTALE", "C3": "CARICO_TOP", "nodi_sommita": [3, 4]}`, `esporta` in `docs/caso-studio/`; nel `.md` la tabella in notazione italiana, la riga della massa per prima con lo scarto **dichiarato** (le zapatas e la trave di fondazione intera nel telaio; 0,4331 t dal solutore contro 0,555 t del `.vtu`: da riconciliare, vedi `corsa-ccx-2026-09-05.md`), l'avvertenza su ogni tabella, la provenienza (commit, sha256 del deck, versioni).

## Ingressi degeneri
- deck vero assente → il test salta con il motivo; il `.md` dice quando è stato generato e da quale commit
- `ccx` assente → idem
- le frequenze del telaio piano accoppiate per direzione: il modo fuori piano del solido (21,0 Hz) si confronta con un modo del telaio con `uy` dominante se esiste, altrimenti `non_confrontabile` con ragione (i nodi 3-4 sono liberi in y: dovrebbe esistere)

Commit `docs(caso-studio): confronto telaio NOVA contro solido CalculiX sul MURO 1`.

---

## Self-review

- Story 56 (scheda con scarto, classe, bias) → Task 2; 57 (massa prima riga) → Task 2; 58 (ccx localizzato, `.inp` importato, corsa lanciata) → Task 1; 59 (CSV Abaqus con schema) → Task 2; 60 (export PNG/SVG/CSV/LaTeX con provenienza) → CSV/LaTeX in Task 2, **PNG/SVG rinviati a T5** (grafici nel browser, dichiarato); 61 (avvertenza ovunque) → `AVVERTENZA` in ogni export.
- Deviazione dalla spec dichiarata: niente meshio (parser proprio del `.inp`), niente `solve.risolvi` (accoppiato alla pipeline; si riusano i lettori).
- Coerenza dei nomi: `risultati_solido.json` (Task 1) letto da `confronta` (Task 2) e dal caso studio (Task 3); `mappa_casi` con `nodi_sommita` in Task 2 e 3.
