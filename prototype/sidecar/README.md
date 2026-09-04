# Prototipo usa-e-getta — sidecar OpenSees con Check Model (ticket #9)

**Domanda:** la catena modello NOVA → `.tcl` (riusando `opensees.py`) →
`OpenSees` → recorder → verdetti regge? Cosa passa fra UI e sidecar? Cosa di
`opensees.py` si prende as-is e cosa si adatta? Cosa succede con un'asta a
lunghezza zero e con un nodo libero?

**Avvio** (Python 3.12 con numpy, pydantic, pyyaml; il venv di MeshRec li ha):
```
cd prototype/sidecar
/Users/mario/GitHub/Tesi/meshrec/.venv/bin/python prove/misure.py      # le 4 misure → prove/MISURE.md
echo '{"id":1,"comando":"verifica"}' | /Users/mario/GitHub/Tesi/meshrec/.venv/bin/python nova_sidecar.py
```

## Protocollo UI ↔ sidecar

Processo Python a vita lunga, avviato da NOVA. **Una riga JSON per richiesta
su stdin; una o più righe JSON su stdout**, tutte con l'`id` della richiesta:
prima gli eventi di fase (attesa parlante), poi la risposta finale.

| richiesta | campi | risposta finale |
|---|---|---|
| `verifica` | `solutore?` (percorso) | `esito: ok \| rotto \| assente`, `percorso`, `motivo`, `dove_prenderlo` |
| `check` | `modello` | `esito: ok \| rifiutato`, `verdetti[]` |
| `corsa` | `modello`, `analisi{modi}`, `cartella`, `forza?` | `esito: ok \| rifiutato \| errore \| assente`, `risultati` (#7), `verdetti_check[]`, `secondi` |
| `fine` | — | `esito: ciao` |

Eventi: `{"id", "evento": "fase", "nome": "check model" | "scrivo il .tcl e lancio OpenSees" | "leggo i recorder"}`.
Un errore del sidecar non lo uccide: risponde `esito: errore` con `fase` e
`motivo`. `esito: errore, fase: solutore` porta la coda del registro
(`13_solver.log`): è il caso «marcatore di fine mancante».

Il modello è il JSON di #6 (unità dichiarate `mm-N-MPa-t-s`; nel prototipo le
coordinate del JSON di prova sono in m e `da_nova` le porta in mm). I
risultati sono nella forma di #7 (`run`, `per_caso`, `modi`, `verdetti`), con
la mappa tag↔id.

## Controlli C1 di v1, con oracolo (`check_model`)

| controllo | oracolo (non_passato se…) |
|---|---|
| `unita` | `unita ≠ "mm-N-MPa-t-s"` |
| `nodi_coincidenti` | due nodi a distanza < 1 mm |
| `aste_sconnesse` | un estremo non esiste fra i nodi |
| `aste_lunghezza_zero` | lunghezza < 1 mm |
| `aste_duplicate` | due aste sugli stessi due nodi |
| `nodi_liberi` | nodo senza aste |
| `nodo_su_asta` | nodo a < 1 mm da un'asta senza esserne estremo (#6: «spezza asta») |
| `sezione_nulla` | sezione mancante o b·h = 0 |
| `massa_nulla` | nessuna asta |
| `vincoli` | nessun nodo vincolato, oppure tutti |
| `vincoli_dedotti` | il piede che `opensees.py` deduce dalla geometria ≠ i vincoli dichiarati |
| `moti_rigidi` | non applicabile prima della corsa: lo dice `autovalori` dopo |

Con almeno un `non_passato` la corsa è **rifiutata** prima di scrivere il
`.tcl`; `forza: true` la lancia lo stesso (serve solo per misurare).

## Misure (prove/MISURE.md, OpenSees 3.8.0 ARM, 04/09/2026)

- **Telaio 2×1 sano**: 0,04 s; Σ Rz = 55 273 N = peso proprio; `reazioni`,
  `autovalori`, `avvisi`, `spostamenti` passati; modi 5,85 / 8,78 / 11,10 Hz.
- **Asta a lunghezza zero (0,1 µm)**: OpenSees **gira, exit 0, zero avvisi** e
  rende Σ Rz = **−635 726 N** (segno e modulo sbagliati). Lo prende il Check
  Model prima, e `reazioni` dopo. Il solutore da solo non se ne accorge.
- **Nodo libero**: OpenSees **gira, exit 0** e rende Σ Rz = 4,16·10¹⁰ N, tre
  modi a 0,110 Hz. Lo prende il Check Model; senza, lo prendono `reazioni`,
  `spostamenti`, `avvisi`.
- **Nodi coincidenti** (nodo sovrapposto + asta duplicata): OpenSees gira e i
  verdetti del solutore passano (è geometricamente una seconda trave):
  **solo** il Check Model lo vede.

Conclusione: exit code e avvisi non bastano mai; il Check Model davanti e i
controlli C3 dietro sono l'unico segnale, come la ricerca 01 e 05 dicevano.

## As-is e adattato

**As-is** (copie verbatim in `meshrec/core/`, impronte sha256):
`opensees.py` `601049e7…`, `solve.py` `9af0c335…`, `config.py` `330bcef8…`,
`armatura.py` `14a5036b…`, `materiali.py` `d3d84029…`. `abaqus.py` e
`quality.py` sono stub vuoti: importati, mai chiamati.

**Adattato** (tutto in `nova_sidecar.py`):
1. `da_nova`: modello NOVA → `Telaio` (m → mm; una membratura per asta; e1/e2 da `rotazione_deg = 0`; barre di `armatura.colloca` centrate sul baricentro; `_Armatura` duck-typed su `ArmaturaConfig`).
2. Materiali: `config.Material` vuole `name` senza `/` → `C25_30`.
3. `risultati_nova`: `leggi_uscite` dà N, V, M **in modulo all'estremo j** (recorder `force`), non per stazione: per le stazioni Lobatto di #7 serve `recorder Element … section <i> force` in `scrivi_tcl`.

**Da adattare per v1 (non nel prototipo)**, misurato leggendo `opensees.py`:
- i vincoli sono **dedotti** dalla geometria (`_al_piede`), non letti dal modello: v1 scrive `fix` dai vincoli dichiarati di #6;
- i carichi sono solo il **peso proprio** (`_peso_nodale`): v1 aggiunge nodali, distribuiti, cedimenti di #7 e le combinazioni come casi;
- materiali **elastici** (`uniaxialMaterial Elastic`): la fase b di #13 scrive `Concrete02`/`Steel02`;
- `massa_modale` usa la soglia 0,90 di `solve._FRAZIONE_MASSA_MINIMA`: NTC §7.3.3.1 dice 0,85;
- `casi_di_carico` accetta solo `GRAVITA` e `MODALE`.
