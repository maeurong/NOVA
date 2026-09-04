# NOVA T0+T1 — scaffold, modello dati, sidecar OpenSees, statica elastica — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** dal nulla a un sidecar che prende un modello NOVA in JSON, lo controlla (Check Model), scrive il deck `.tcl`, lancia OpenSees, legge i recorder e rende risultati per corsa con i verdetti a tre valori; più un server FastAPI sottile davanti.

**Architecture:** tre processi (browser → FastAPI → sidecar a righe JSON); il core sta tutto dietro il protocollo del sidecar; il codice di MeshRec a `9716f6e` entra verbatim in `meshrec/core/` e gli adattamenti stanno in `nova/`. Il deck lo scrive NOVA (`nova/deck.py`) perché la copia verbatim deduce i vincoli dalla geometria e scrive solo il peso proprio; da `opensees.py` si riusano le letture (`_ultima_riga`, `leggi_frequenze`, `leggi_massa_modale`, `conta_avvisi`), da `solve.py` la localizzazione del binario e i sette controlli, da `armatura.py` la collocazione delle barre, da `materiali.py` il catalogo NTC.

**Tech Stack:** Python 3.12 (`uv`), pydantic v2, numpy, pyyaml (lo chiede `config.py` copiato), FastAPI + uvicorn + httpx (TestClient), pytest. Binari localizzati: `~/.local/bin/OpenSees` (3.8.0), non incorporati.

**Spec:** `docs/superpowers/specs/2026-09-05-nova-v1-design.md` — sezioni «Architettura», «Protocollo del sidecar», «Modello dati», «Risultati per corsa», «Generazione del deck e adattamenti», «Check Model (C1) e controlli sui risultati (C3)», «Testing Decisions».

## Global Constraints

- Unità interne **`mm-N-MPa-t-s`**, dichiarate nel file del modello; `g = 9806,65 mm/s²`.
- Identificatori: interi per tipo, mai riusati, contatori nel file; il tag OpenSees si deriva al deck e si salva solo in `run.mappa_tag`.
- Pydantic v2 con `extra="forbid"` su ogni modello; `schema_version: 1`.
- Il codice d'uscita di OpenSees **non è il segnale**: marcatore di fine `MESHREC_FINE` in `fine.out` e conteggio di `WARNING` (senza asterisco).
- Verdetto a tre valori in un solo enum: `passato | non_passato | non_applicabile`; `non_applicabile` non è mai verde.
- Un `non_passato` del Check Model rifiuta la corsa prima di scrivere il deck; `forza: true` serve solo alle misure.
- Il sidecar non muore mai: ogni eccezione diventa `{"esito": "errore", "fase": ..., "motivo": ...}`.
- Copie di MeshRec verbatim con sha256 in `meshrec/IMPRONTE.md`; nessuna modifica dentro `meshrec/`.
- Lingua italiana in codice (nomi, commenti, messaggi), commit Conventional Commits in italiano con i trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` e `Claude-Session: https://claude.ai/code/session_01EdTcdzVMf1xmyTGxRwMKuN`.
- Rami `feat/<slug>` da `main`, PR su GitHub; niente merge senza review.
- Nessun test tocca `~/GitHub/Tesi` in scrittura; i test sul binario sono saltati se `OpenSees` non è nel PATH.
- Percorsi assoluti nei comandi Bash (la cwd non sopravvive alla chiamata); `git -C /Users/mario/GitHub/NOVA ...`.

---

## File structure

```
pyproject.toml                  pacchetto `nova` + `meshrec`, dipendenze, pytest
meshrec/__init__.py             vuoto
meshrec/core/__init__.py        vuoto
meshrec/core/{opensees,solve,armatura,config,materiali}.py   copie verbatim da Tesi@9716f6e
meshrec/core/{abaqus,quality}.py                             stub vuoti (solve.py li importa)
meshrec/IMPRONTE.md             sha256 e comando di estrazione
nova/__init__.py                versione
nova/modello.py                 Pydantic: entità, `carica`, `impronta`, `assicura_peso_proprio`
nova/catalogo.py                classe NTC → valori (`materiali.trova`), override `personalizzato`
nova/check.py                   Check Model C1 → lista di verdetti
nova/deck.py                    modello + casi → `.tcl` (nodi, fix dichiarati, materiali elastici, sezioni a fibre, carichi per caso, recorder per stazione, marcatore)
nova/corsa.py                   lancia OpenSees, legge le uscite, compone i risultati, sette controlli C3
nova/sidecar.py                 protocollo a righe JSON: `servi(ingresso, uscita)`, `__main__`
nova/server.py                  FastAPI: `create_app`, rotte `/api/*`, statici
nova/__main__.py                `python -m nova` → server + browser
static/index.html               segnaposto («interfaccia in T5»)
tests/conftest.py               fixture `sidecar` (in memoria), `binario_opensees`
tests/fixture/*.nova.json       telaio 2×1, trave appoggiata, malati
tests/test_sidecar.py           cucitura principale: protocollo, modello, check, deck
tests/test_corsa_binario.py     corse vere (skip senza binario) + solutore finto
tests/test_server.py            rotte HTTP con TestClient
```

Rami: Task 1 su `feat/scaffold`; Task 2–6 su `feat/sidecar-statica` (aperto da `main` dopo il merge di `feat/scaffold`, oppure impilato su di esso se la review tarda).

---

### Task 1: Scaffold del pacchetto e copie verbatim di MeshRec

**Files:**
- Create: `pyproject.toml`, `nova/__init__.py`, `meshrec/__init__.py`, `meshrec/core/__init__.py`, `meshrec/core/abaqus.py`, `meshrec/core/quality.py`, `meshrec/IMPRONTE.md`, `tests/__init__.py`, `tests/test_scaffold.py`, `.gitignore` (aggiungere `.venv/`, `corse/`, `__pycache__/`, `.pytest_cache/`)
- Create (copie): `meshrec/core/opensees.py`, `meshrec/core/solve.py`, `meshrec/core/armatura.py`, `meshrec/core/config.py`, `meshrec/core/materiali.py`
- Modify: `AGENTS.md` (sezione «Cos'è e in che fase è»: la spec esiste, il codice si scrive dal piano), `README.md` («Stato»: scaffold presente, come avviare i test)

**Interfaces:**
- Consumes: niente.
- Produces: pacchetti importabili `nova`, `meshrec.core.opensees`, `meshrec.core.solve`, `meshrec.core.armatura`, `meshrec.core.config`, `meshrec.core.materiali`; comando `uv run pytest`.

- [ ] **Step 1: Ramo e ambiente**

```bash
git -C /Users/mario/GitHub/NOVA checkout -b feat/scaffold main
uv venv --python 3.12 /Users/mario/GitHub/NOVA/.venv
```

- [ ] **Step 2: `pyproject.toml`**

```toml
[project]
name = "nova"
version = "0.1.0"
description = "Nonlinear OpenSees Visualization & Analysis"
requires-python = ">=3.12"
license = "MIT"
dependencies = [
    "pydantic>=2.7",
    "numpy>=1.26",
    "pyyaml>=6",
    "fastapi>=0.115",
    "uvicorn>=0.30",
]

[project.optional-dependencies]
dev = ["pytest>=8", "httpx>=0.27"]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.hatch.build.targets.wheel]
packages = ["nova", "meshrec"]

[tool.pytest.ini_options]
testpaths = ["tests"]
addopts = "-q"
```

- [ ] **Step 3: Copie verbatim e impronte**

```bash
mkdir -p /Users/mario/GitHub/NOVA/meshrec/core
for f in opensees solve armatura config materiali; do git -C /Users/mario/GitHub/Tesi show 9716f6e:meshrec/src/meshrec/core/$f.py > /Users/mario/GitHub/NOVA/meshrec/core/$f.py; done
touch /Users/mario/GitHub/NOVA/meshrec/__init__.py /Users/mario/GitHub/NOVA/meshrec/core/__init__.py
printf '"""Stub: solve.py lo importa; NOVA non risolve solidi in Abaqus."""\n' > /Users/mario/GitHub/NOVA/meshrec/core/abaqus.py
printf '"""Stub: solve.py lo importa; la qualità della mesh non riguarda il telaio."""\n' > /Users/mario/GitHub/NOVA/meshrec/core/quality.py
(cd /Users/mario/GitHub/NOVA/meshrec/core && shasum -a 256 opensees.py solve.py armatura.py config.py materiali.py)
```

Verifica che le impronte coincidano con quelle del prototipo `prototype/sidecar/README.md` (`601049e7…`, `9af0c335…`, `330bcef8…`, `14a5036b…`, `d3d84029…`). Scrivi `meshrec/IMPRONTE.md`:

```markdown
# Copie verbatim da MeshRec (Tesi @ 9716f6e)

Estratte il 05/09/2026 con `git -C ~/GitHub/Tesi show 9716f6e:meshrec/src/meshrec/core/<file>.py`.
Non si modificano: gli adattamenti stanno in `nova/`. `abaqus.py` e `quality.py` sono stub
vuoti perché `solve.py` li importa.

| file | sha256 |
|---|---|
| opensees.py | <incolla> |
| solve.py | <incolla> |
| armatura.py | <incolla> |
| config.py | <incolla> |
| materiali.py | <incolla> |
```

(«incolla» va sostituito con i valori misurati dal comando sopra: è un dato, non un segnaposto.)

- [ ] **Step 4: Test di fumo**

`tests/test_scaffold.py`:

```python
"""Il pacchetto si importa e le copie di MeshRec sono quelle dichiarate."""
import hashlib
import re
from pathlib import Path

RADICE = Path(__file__).resolve().parent.parent


def test_i_moduli_si_importano():
    import nova  # noqa: F401
    from meshrec.core import armatura, config, materiali, opensees, solve  # noqa: F401


def test_le_impronte_coincidono_con_i_file():
    tabella = (RADICE / "meshrec" / "IMPRONTE.md").read_text(encoding="utf-8")
    righe = re.findall(r"^\| (\w+\.py) \| ([0-9a-f]{64}) \|$", tabella, flags=re.M)
    assert len(righe) == 5
    for nome, atteso in righe:
        vero = hashlib.sha256((RADICE / "meshrec" / "core" / nome).read_bytes()).hexdigest()
        assert vero == atteso, f"{nome}: la copia non è più quella dichiarata"
```

- [ ] **Step 5: Installa ed esegui**

```bash
uv pip install --python /Users/mario/GitHub/NOVA/.venv/bin/python -e "/Users/mario/GitHub/NOVA[dev]"
/Users/mario/GitHub/NOVA/.venv/bin/python -m pytest /Users/mario/GitHub/NOVA/tests -q
```

Expected: `2 passed`. Se `config.py` solleva all'import per una dipendenza mancante (`yaml`), aggiungila a `dependencies`, non toccare la copia.

- [ ] **Step 6: `nova/__init__.py`, `.gitignore`, `AGENTS.md`, `README.md`**

`nova/__init__.py`:

```python
"""NOVA — Nonlinear OpenSees Visualization & Analysis."""

__version__ = "0.1.0"
```

In `AGENTS.md`, sezione «Cos'è e in che fase è»: la fase 3 è chiusa il 05/09/2026 con la spec in `docs/superpowers/specs/2026-09-05-nova-v1-design.md`; il codice si scrive dai piani in `docs/superpowers/plans/`. In «Cosa NON fare adesso» togli «Nessun codice prima della spec» e sostituisci con «Nessun codice fuori da un piano». In «Struttura delle cartelle» aggiungi `nova/`, `meshrec/`, `tests/`, `static/`. In `README.md`, «Stato»: scaffold presente; test con `uv run pytest`.

- [ ] **Step 7: Commit e PR**

```bash
git -C /Users/mario/GitHub/NOVA add pyproject.toml nova meshrec tests .gitignore AGENTS.md README.md
git -C /Users/mario/GitHub/NOVA commit -F - <<'EOF'
chore(scaffold): pacchetto nova, copie verbatim di MeshRec, pytest

Le cinque copie da Tesi@9716f6e entrano con impronta sha256 verificata
da un test: gli adattamenti vivono in nova/, mai dentro meshrec/.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01EdTcdzVMf1xmyTGxRwMKuN
EOF
git -C /Users/mario/GitHub/NOVA push -u origin feat/scaffold
```

Apri la PR con `gh pr create --base main --head feat/scaffold --title "chore(scaffold): pacchetto nova e copie di MeshRec" --body-file <file>` (il corpo chiude con `🤖 Generated with [Claude Code](https://claude.com/claude-code)` e il link di sessione).

---

### Task 2: Modello dati e sidecar minimo

**Files:**
- Create: `nova/modello.py`, `nova/catalogo.py`, `nova/sidecar.py`, `tests/conftest.py`, `tests/fixture/telaio_2x1.nova.json`, `tests/test_sidecar.py`

**Interfaces:**
- Consumes: `meshrec.core.materiali.trova(classe) -> VoceMateriale` (campi `f_ck`, `E_cm`… vedi Step 3), `materiali._DENSITA_CALCESTRUZZO`, `materiali._DENSITA_ACCIAIO`.
- Produces:
  - `nova.modello.Modello` (pydantic) con `nodi`, `aste`, `sezioni`, `materiali`, `azioni`, `combinazioni`, `analisi`, `contatori`, `impostazioni_analisi`;
  - `nova.modello.carica(dati: dict) -> Modello` (solleva `ValueError` con messaggio leggibile);
  - `nova.modello.impronta(m: Modello) -> str` (sha256 canonico);
  - `nova.modello.assicura_peso_proprio(m: Modello) -> Modello`;
  - `nova.modello.casi_dichiarati(m: Modello) -> list[str]` (`"Z<id>"` per azione, `"C<id>"` per combinazione);
  - `nova.catalogo.valori(materiale: Materiale) -> dict[str, float]` con chiavi `E`, `densita`, `nu`, e per il calcestruzzo `fck`, `fcm`, `fctm`, per l'acciaio `fyk`;
  - `nova.sidecar.servi(ingresso, uscita)` e `nova.sidecar.rispondi(req: dict, emetti) -> dict`; comandi `verifica | check | deck | corsa | fine`, in questo task solo `fine`, sconosciuto, e `check` limitato alla validazione (`fase: modello`).

- [ ] **Step 1: Test del protocollo (falliscono)**

`tests/conftest.py`:

```python
import io
import json
import shutil
from pathlib import Path

import pytest

FIXTURE = Path(__file__).parent / "fixture"


def leggi_fixture(nome: str) -> dict:
    return json.loads((FIXTURE / nome).read_text(encoding="utf-8"))


@pytest.fixture
def chiedi():
    """Una richiesta sul protocollo, in memoria: rende le righe di risposta (eventi + finale)."""
    from nova import sidecar

    def _chiedi(*richieste: dict) -> list[list[dict]]:
        ingresso = io.StringIO("".join(json.dumps(r) + "\n" for r in richieste))
        uscita = io.StringIO()
        sidecar.servi(ingresso, uscita)
        righe = [json.loads(r) for r in uscita.getvalue().splitlines() if r.strip()]
        per_id: dict = {}
        for riga in righe:
            per_id.setdefault(riga.get("id"), []).append(riga)
        return [per_id.get(r.get("id"), []) for r in richieste]

    return _chiedi


@pytest.fixture(scope="session")
def binario_opensees() -> str:
    percorso = shutil.which("OpenSees")
    if percorso is None:
        pytest.skip("OpenSees non è nel PATH: la corsa vera non si prova qui")
    return percorso
```

`tests/test_sidecar.py` (prima parte):

```python
"""Cucitura principale: una riga JSON dentro, righe JSON fuori."""
import json

from conftest import leggi_fixture


def test_fine_risponde_ciao(chiedi):
    (risposte,) = chiedi({"id": 1, "comando": "fine"})
    assert risposte[-1] == {"id": 1, "esito": "ciao"}


def test_comando_sconosciuto_non_uccide_il_sidecar(chiedi):
    prima, dopo = chiedi({"id": 1, "comando": "boh"}, {"id": 2, "comando": "fine"})
    assert prima[-1]["esito"] == "errore"
    assert "boh" in prima[-1]["motivo"]
    assert dopo[-1]["esito"] == "ciao"


def test_riga_non_json_risponde_errore_e_continua(chiedi):
    from nova import sidecar
    import io
    uscita = io.StringIO()
    sidecar.servi(io.StringIO('{non json\n{"id": 2, "comando": "fine"}\n'), uscita)
    righe = [json.loads(r) for r in uscita.getvalue().splitlines()]
    assert righe[0]["esito"] == "errore" and righe[0]["id"] is None
    assert righe[1] == {"id": 2, "esito": "ciao"}


def test_check_rifiuta_un_campo_sconosciuto_con_il_suo_nome(chiedi):
    m = leggi_fixture("telaio_2x1.nova.json")
    m["nodi"][0]["colore"] = "rosso"
    (risposte,) = chiedi({"id": 1, "comando": "check", "modello": m})
    assert risposte[-1]["esito"] == "errore"
    assert risposte[-1]["fase"] == "modello"
    assert "colore" in risposte[-1]["motivo"]


def test_check_rifiuta_unita_diverse(chiedi):
    m = leggi_fixture("telaio_2x1.nova.json")
    m["unita"] = "m-kN"
    (risposte,) = chiedi({"id": 1, "comando": "check", "modello": m})
    assert risposte[-1]["esito"] == "errore" and risposte[-1]["fase"] == "modello"


def test_impronta_stabile_e_sensibile():
    from nova.modello import carica, impronta
    a = carica(leggi_fixture("telaio_2x1.nova.json"))
    b = carica(leggi_fixture("telaio_2x1.nova.json"))
    assert impronta(a) == impronta(b)
    b.nodi[0].x += 1.0
    assert impronta(a) != impronta(b)


def test_il_peso_proprio_e_generato_una_volta_sola():
    from nova.modello import assicura_peso_proprio, carica
    m = carica(leggi_fixture("telaio_2x1.nova.json"))
    m = assicura_peso_proprio(assicura_peso_proprio(m))
    generate = [a for a in m.azioni if a.generata]
    assert len(generate) == 1 and generate[0].natura == "G1"
    assert generate[0].carichi[0].tipo == "gravita" and generate[0].carichi[0].fattore_z == -1.0


def test_catalogo_c25_30_da_i_valori_ntc():
    from nova.catalogo import valori
    from nova.modello import Materiale
    v = valori(Materiale(id=1, nome="cls", tipo="calcestruzzo", classe="C25/30"))
    assert v["fck"] == 25.0 and 31000 < v["E"] < 32000 and v["densita"] == 2.5493e-9


def test_catalogo_personalizzato_vince_sulla_classe():
    from nova.catalogo import valori
    from nova.modello import Materiale
    v = valori(Materiale(id=1, nome="cls", tipo="calcestruzzo", classe="C25/30",
                         personalizzato=True, valori={"E": 20000.0}))
    assert v["E"] == 20000.0 and v["fck"] == 25.0
```

- [ ] **Step 2: Fixture `tests/fixture/telaio_2x1.nova.json`**

Telaio piano nel piano xz, tre pilastri 30×30 alti 3,2 m, due travi 30×50 di 5 m e 4 m, incastri al piede, carico distribuito 12,5 N/mm sulle travi (verso il basso) e 20 kN in testa al primo pilastro. Coordinate in **mm**.

```json
{
  "schema_version": 1,
  "unita": "mm-N-MPa-t-s",
  "contatori": {"nodo": 6, "asta": 5, "sezione": 2, "materiale": 2, "azione": 2, "combinazione": 1},
  "materiali": [
    {"id": 1, "nome": "C25/30", "tipo": "calcestruzzo", "classe": "C25/30"},
    {"id": 2, "nome": "B450C", "tipo": "acciaio", "classe": "B450C"}
  ],
  "sezioni": [
    {"id": 1, "nome": "30×30 4Ø16", "b": 300, "h": 300, "calcestruzzo": 1, "acciaio": 2, "copriferro": 30,
     "file": [{"lato": "inf", "n": 2, "diametro": 16}, {"lato": "sup", "n": 2, "diametro": 16}],
     "staffe": {"diametro": 8, "passo": 150, "bracci": 2}},
    {"id": 2, "nome": "30×50 3+3Ø16", "b": 300, "h": 500, "calcestruzzo": 1, "acciaio": 2, "copriferro": 30,
     "file": [{"lato": "inf", "n": 3, "diametro": 16}, {"lato": "sup", "n": 3, "diametro": 16}],
     "staffe": {"diametro": 8, "passo": 150, "bracci": 2}}
  ],
  "nodi": [
    {"id": 1, "x": 0, "y": 0, "z": 0, "vincolo": {"ux": true, "uy": true, "uz": true, "rx": true, "ry": true, "rz": true}},
    {"id": 2, "x": 5000, "y": 0, "z": 0, "vincolo": {"ux": true, "uy": true, "uz": true, "rx": true, "ry": true, "rz": true}},
    {"id": 3, "x": 9000, "y": 0, "z": 0, "vincolo": {"ux": true, "uy": true, "uz": true, "rx": true, "ry": true, "rz": true}},
    {"id": 4, "x": 0, "y": 0, "z": 3200},
    {"id": 5, "x": 5000, "y": 0, "z": 3200},
    {"id": 6, "x": 9000, "y": 0, "z": 3200}
  ],
  "aste": [
    {"id": 1, "nodo_i": 1, "nodo_j": 4, "sezione": 1},
    {"id": 2, "nodo_i": 2, "nodo_j": 5, "sezione": 1},
    {"id": 3, "nodo_i": 3, "nodo_j": 6, "sezione": 1},
    {"id": 4, "nodo_i": 4, "nodo_j": 5, "sezione": 2},
    {"id": 5, "nodo_i": 5, "nodo_j": 6, "sezione": 2}
  ],
  "azioni": [
    {"id": 1, "nome": "permanenti travi", "natura": "G2",
     "carichi": [{"tipo": "distribuito", "asta": 4, "q": -12.5, "direzione": "z"},
                 {"tipo": "distribuito", "asta": 5, "q": -12.5, "direzione": "z"}]},
    {"id": 2, "nome": "spinta in testa", "natura": "Q", "categoria": "vento",
     "carichi": [{"tipo": "nodale", "nodo": 4, "Fx": 20000}]}
  ],
  "combinazioni": [
    {"id": 1, "nome": "SLU", "tipo": "fondamentale",
     "termini": [{"azione": 1, "coefficiente": 1.5}, {"azione": 2, "coefficiente": 1.5}]}
  ],
  "analisi": [{"tipo": "statica", "casi": ["Z1", "Z2", "C1"]}]
}
```

Il peso proprio non sta nel file: lo genera `assicura_peso_proprio` (azione `Z3`, `generata: true`); il `contatori.azione` passa a 3 nel modello in memoria.

- [ ] **Step 3: `nova/catalogo.py`**

```python
"""Classe NTC → valori del materiale, con l'override «personalizzato» (spec #6, scelta 5)."""
from __future__ import annotations

from meshrec.core import materiali


def valori(materiale) -> dict[str, float]:
    """`E`, `densita`, `nu` sempre; `fck/fcm/fctm` per il calcestruzzo, `fyk` per l'acciaio.

    Ogni chiave è sovrascrivibile da `materiale.valori` quando `personalizzato` è vero:
    un valore scritto a mano vince sulla tabella, gli altri restano quelli di norma.
    """
    if materiale.tipo == "calcestruzzo":
        voce = materiali.trova(materiale.classe)
        base = {
            "E": float(voce.E_cm), "nu": materiali._POISSON_CALCESTRUZZO,
            "densita": materiali._DENSITA_CALCESTRUZZO,
            "fck": float(voce.f_ck), "fcm": float(voce.f_ck) + 8.0, "fctm": float(voce.f_ctm),
        }
    else:
        base = {
            "E": 200_000.0, "nu": materiali._POISSON_ACCIAIO,
            "densita": materiali._DENSITA_ACCIAIO, "fyk": 450.0,
        }
    if materiale.personalizzato:
        base.update({k: float(v) for k, v in materiale.valori.items()})
    return base
```

Prima di scrivere: leggi `meshrec/core/materiali.py` righe 104–146 (`VoceMateriale`) e 438–453 (`trova`) e usa i **nomi veri** dei campi (`f_ck`, `E_cm`, `f_ctm` sono l'ipotesi: se la classe li chiama diversamente, adegua qui, non lì). `trova` solleva su classe ignota: lascia salire, il sidecar la traduce in `errore fase modello`.

- [ ] **Step 4: `nova/modello.py`**

```python
"""Il modello dati di NOVA v1 (spec: «Modello dati»). Un file JSON, unità dichiarate, extra vietati."""
from __future__ import annotations

import hashlib
import json
from typing import Annotated, Literal, Union

from pydantic import BaseModel, ConfigDict, Field, ValidationError, model_validator

UNITA = "mm-N-MPa-t-s"


class _Base(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Origine(_Base):
    sorgente: Literal["rilievo", "utente"] = "utente"
    riferimento: str | None = None
    file: str | None = None
    nota: str | None = None
    modificata: bool = False


class Vincolo(_Base):
    ux: bool = False
    uy: bool = False
    uz: bool = False
    rx: bool = False
    ry: bool = False
    rz: bool = False

    def gradi(self) -> tuple[int, int, int, int, int, int]:
        return tuple(int(v) for v in (self.ux, self.uy, self.uz, self.rx, self.ry, self.rz))


class Nodo(_Base):
    id: int
    nome: str | None = None
    x: float
    y: float = 0.0
    z: float
    vincolo: Vincolo | None = None
    massa_nodale: float = Field(default=0.0, ge=0.0)
    origine: Origine | None = None


class Danno(_Base):
    fattore_E: float = Field(gt=0.0, le=1.0)
    fattore_fc: float = Field(gt=0.0, le=1.0)
    nota: str


class Asta(_Base):
    id: int
    nome: str | None = None
    nodo_i: int
    nodo_j: int
    sezione: int
    rotazione_deg: float = 0.0
    suddivisioni: int = Field(default=1, ge=1)
    danno: Danno | None = None
    origine: Origine | None = None


class Fila(_Base):
    lato: Literal["sup", "inf", "sx", "dx"]
    n: int = Field(ge=1)
    diametro: float = Field(gt=0.0)


class Staffe(_Base):
    diametro: float = Field(gt=0.0)
    passo: float = Field(gt=0.0)
    bracci: int = Field(default=2, ge=2)


class Riduzione(_Base):
    sup: float = Field(default=0.0, ge=0.0)
    inf: float = Field(default=0.0, ge=0.0)
    sx: float = Field(default=0.0, ge=0.0)
    dx: float = Field(default=0.0, ge=0.0)


class Sezione(_Base):
    id: int
    nome: str
    tipo: Literal["rettangolare"] = "rettangolare"
    b: float = Field(gt=0.0)
    h: float = Field(gt=0.0)
    riduzione: Riduzione | None = None
    calcestruzzo: int
    acciaio: int
    copriferro: float = Field(ge=0.0)
    file: list[Fila] = []
    staffe: Staffe | None = None
    origine: Origine | None = None


class Materiale(_Base):
    id: int
    nome: str
    tipo: Literal["calcestruzzo", "acciaio"]
    classe: str
    valori: dict[str, float] = {}
    personalizzato: bool = False


class CaricoNodale(_Base):
    tipo: Literal["nodale"]
    nodo: int
    Fx: float = 0.0
    Fy: float = 0.0
    Fz: float = 0.0
    Mx: float = 0.0
    My: float = 0.0
    Mz: float = 0.0


class CaricoDistribuito(_Base):
    tipo: Literal["distribuito"]
    asta: int
    q: float
    direzione: Literal["x", "y", "z", "locale_y", "locale_z"] = "z"


class CaricoGravita(_Base):
    tipo: Literal["gravita"]
    fattore_x: float = 0.0
    fattore_y: float = 0.0
    fattore_z: float = 0.0


class Cedimento(_Base):
    tipo: Literal["cedimento"]
    nodo: int
    ux: float | None = None
    uy: float | None = None
    uz: float | None = None
    rx: float | None = None
    ry: float | None = None
    rz: float | None = None


class Termico(_Base):
    tipo: Literal["termico"]
    asta: int
    dT_uniforme: float = 0.0
    gradiente: float | None = None


Carico = Annotated[
    Union[CaricoNodale, CaricoDistribuito, CaricoGravita, Cedimento, Termico],
    Field(discriminator="tipo"),
]


class Azione(_Base):
    id: int
    nome: str
    natura: Literal["G1", "G2", "Q", "E"]
    categoria: str | None = None
    generata: bool = False
    carichi: list[Carico] = []

    @model_validator(mode="after")
    def _q_ha_la_categoria(self):
        if self.natura == "Q" and not self.categoria:
            raise ValueError(f"azione {self.id} «{self.nome}»: natura Q senza categoria d'uso")
        return self


class Termine(_Base):
    azione: int
    coefficiente: float


class Combinazione(_Base):
    id: int
    nome: str
    termini: list[Termine]
    tipo: Literal["fondamentale", "caratteristica", "frequente", "quasi_permanente", "sismica"] | None = None
    generata: bool = False


class AnalisiStatica(_Base):
    tipo: Literal["statica"]
    casi: list[Annotated[str, Field(pattern=r"^[ZC]\d+$")]]


class MassaDaAzione(_Base):
    azione: int
    coefficiente: float


class AnalisiModale(_Base):
    tipo: Literal["modale"]
    modi: int | Literal["auto"] = "auto"
    masse_da_azioni: list[MassaDaAzione] = []


Analisi = Annotated[Union[AnalisiStatica, AnalisiModale], Field(discriminator="tipo")]


class ImpostazioniAnalisi(_Base):
    fibre: int = Field(default=10, ge=2)
    veste: Literal["caratteristica", "media", "progetto", "esistente"] = "media"


class Modello(_Base):
    schema_version: int = 1
    unita: Literal["mm-N-MPa-t-s"]
    contatori: dict[str, int] = {}
    nodi: list[Nodo] = []
    aste: list[Asta] = []
    sezioni: list[Sezione] = []
    materiali: list[Materiale] = []
    azioni: list[Azione] = []
    combinazioni: list[Combinazione] = []
    analisi: list[Analisi] = []
    impostazioni_analisi: ImpostazioniAnalisi = ImpostazioniAnalisi()

    def nodo(self, id: int) -> Nodo | None:
        return next((n for n in self.nodi if n.id == id), None)

    def sezione(self, id: int) -> Sezione | None:
        return next((s for s in self.sezioni if s.id == id), None)

    def materiale(self, id: int) -> Materiale | None:
        return next((m for m in self.materiali if m.id == id), None)

    def azione(self, id: int) -> Azione | None:
        return next((a for a in self.azioni if a.id == id), None)

    def combinazione(self, id: int) -> Combinazione | None:
        return next((c for c in self.combinazioni if c.id == id), None)


MIGRAZIONI: dict[int, callable] = {}  # {da_versione: fn(dati) -> dati}; vuoto finché lo schema è 1


def carica(dati: dict) -> Modello:
    """Dizionario → Modello, con migrazioni e un messaggio che nomina il campo sbagliato."""
    if not isinstance(dati, dict):
        raise ValueError("il modello deve essere un oggetto JSON")
    versione = dati.get("schema_version", 1)
    while versione in MIGRAZIONI:
        dati = MIGRAZIONI[versione](dati)
        versione = dati["schema_version"]
    try:
        return Modello.model_validate(dati)
    except ValidationError as e:
        righe = []
        for err in e.errors():
            dove = ".".join(str(p) for p in err["loc"]) or "radice"
            righe.append(f"{dove}: {err['msg']}")
        raise ValueError("modello rifiutato — " + "; ".join(righe)) from None


def impronta(m: Modello) -> str:
    canonico = json.dumps(m.model_dump(mode="json", exclude_none=True), sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonico.encode("utf-8")).hexdigest()


def assicura_peso_proprio(m: Modello) -> Modello:
    """L'unica azione che il programma genera: G1, gravità −1 lungo z, acciaio compreso (il deck la pesa)."""
    if any(a.generata for a in m.azioni):
        return m
    prossimo = max([m.contatori.get("azione", 0)] + [a.id for a in m.azioni]) + 1
    m.azioni.append(Azione(id=prossimo, nome="peso proprio", natura="G1", generata=True,
                           carichi=[CaricoGravita(tipo="gravita", fattore_z=-1.0)]))
    m.contatori["azione"] = prossimo
    return m


def casi_dichiarati(m: Modello) -> list[str]:
    return [f"Z{a.id}" for a in m.azioni] + [f"C{c.id}" for c in m.combinazioni]
```

- [ ] **Step 5: `nova/sidecar.py` (minimo)**

```python
"""Il sidecar: una riga JSON per richiesta su stdin, righe JSON con lo stesso `id` su stdout.

Eventi di fase prima (`{"evento": "fase", "nome": ...}`), risposta finale poi. Non muore mai:
ogni eccezione diventa `esito: errore` con `fase` e `motivo` (spec: «Protocollo del sidecar»).
"""
from __future__ import annotations

import json
import sys

from nova import modello as _modello

COMANDI = ("verifica", "check", "deck", "corsa", "fine")


def _carica(req: dict):
    try:
        return _modello.assicura_peso_proprio(_modello.carica(req.get("modello")))
    except ValueError as e:
        raise _Rifiuto("modello", str(e)) from None


class _Rifiuto(Exception):
    def __init__(self, fase: str, motivo: str):
        super().__init__(motivo)
        self.fase, self.motivo = fase, motivo


def comando_check(req: dict) -> dict:
    m = _carica(req)
    return {"esito": "ok", "verdetti": [], "nodi": len(m.nodi), "aste": len(m.aste)}


def rispondi(req: dict, emetti) -> dict:
    comando = req.get("comando")
    try:
        if comando == "check":
            return comando_check(req)
        if comando == "fine":
            return {"esito": "ciao"}
        return {"esito": "errore", "fase": "protocollo",
                "motivo": f"comando sconosciuto: {comando!r} (uno fra {', '.join(COMANDI)})"}
    except _Rifiuto as r:
        return {"esito": "errore", "fase": r.fase, "motivo": r.motivo}
    except Exception as e:  # il sidecar sopravvive e riporta
        return {"esito": "errore", "fase": "sidecar", "motivo": f"{type(e).__name__}: {e}"}


def servi(ingresso=sys.stdin, uscita=sys.stdout) -> None:
    def scrivi(riga: dict) -> None:
        uscita.write(json.dumps(riga, ensure_ascii=False, default=str) + "\n")
        uscita.flush()

    for riga in ingresso:
        if not riga.strip():
            continue
        try:
            req = json.loads(riga)
        except json.JSONDecodeError as e:
            scrivi({"id": None, "esito": "errore", "fase": "protocollo", "motivo": f"richiesta non JSON: {e}"})
            continue
        rid = req.get("id") if isinstance(req, dict) else None
        risposta = rispondi(req if isinstance(req, dict) else {}, lambda ev: scrivi({"id": rid, **ev}))
        scrivi({"id": rid, **risposta})
        if risposta.get("esito") == "ciao":
            return


if __name__ == "__main__":
    servi()
```

- [ ] **Step 6: Esegui i test**

Run: `/Users/mario/GitHub/NOVA/.venv/bin/python -m pytest /Users/mario/GitHub/NOVA/tests/test_sidecar.py -v`
Expected: tutti `PASSED`. Se `test_catalogo_c25_30_da_i_valori_ntc` fallisce sul nome dei campi di `VoceMateriale`, correggi `catalogo.py` con i nomi letti in `materiali.py`.

- [ ] **Step 7: Commit**

```bash
git -C /Users/mario/GitHub/NOVA checkout -b feat/sidecar-statica
git -C /Users/mario/GitHub/NOVA add nova/modello.py nova/catalogo.py nova/sidecar.py tests/conftest.py tests/fixture/telaio_2x1.nova.json tests/test_sidecar.py
git -C /Users/mario/GitHub/NOVA commit -F - <<'EOF'
feat(modello): modello dati v1 e sidecar a righe JSON

Pydantic con extra vietati e messaggi che nominano il campo; impronta
canonica del modello; peso proprio come unica azione generata;
catalogo NTC da meshrec.core.materiali con override personalizzato.
Il sidecar risponde sempre, anche a righe non JSON e comandi ignoti.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01EdTcdzVMf1xmyTGxRwMKuN
EOF
```

---

### Task 3: Check Model (C1)

**Files:**
- Create: `nova/check.py`, `tests/fixture/asta_lunghezza_zero.nova.json`, `tests/fixture/nodo_libero.nova.json`, `tests/fixture/nodi_coincidenti.nova.json`
- Modify: `nova/sidecar.py` (`comando_check` usa `check.check_model`), `tests/test_sidecar.py`

**Interfaces:**
- Consumes: `nova.modello.Modello`.
- Produces: `nova.check.check_model(m: Modello) -> list[dict]`, ogni verdetto `{"controllo": str, "esito": "passato"|"non_passato"|"non_applicabile", "ragione": str, "oggetto": list|dict|None, "azione": str|None}`; `nova.check.rifiutato(verdetti) -> bool`; costante `nova.check.TOLLERANZA_MM = 1.0`.

- [ ] **Step 1: Fixture malate**

Le tre fixture partono da `telaio_2x1.nova.json` e cambiano una cosa sola:
- `asta_lunghezza_zero.nova.json`: nodo 7 in `(0, 0, 3200.0001)`, asta 6 fra 4 e 7 con sezione 1; `contatori.nodo = 7`, `contatori.asta = 6`.
- `nodo_libero.nova.json`: nodo 7 in `(2500, 0, 6000)` senza aste; `contatori.nodo = 7`.
- `nodi_coincidenti.nova.json`: nodo 7 in `(5000, 0, 3200)` (coincide con 5) e asta 6 fra 4 e 7 con sezione 2 (duplica la trave 4–5); `contatori.nodo = 7`, `contatori.asta = 6`.

- [ ] **Step 2: Test (falliscono)**

Aggiungi a `tests/test_sidecar.py`:

```python
def _esiti(verdetti):
    return {v["controllo"]: v["esito"] for v in verdetti}


def test_telaio_sano_passa_il_check(chiedi):
    (r,) = chiedi({"id": 1, "comando": "check", "modello": leggi_fixture("telaio_2x1.nova.json")})
    assert r[-1]["esito"] == "ok"
    esiti = _esiti(r[-1]["verdetti"])
    assert esiti["nodi_coincidenti"] == "passato" and esiti["vincoli"] == "passato"
    assert esiti["moti_rigidi"] == "non_applicabile"
    assert set(esiti) >= {"unita", "nodi_coincidenti", "aste_sconnesse", "aste_lunghezza_zero", "aste_duplicate",
                          "nodi_liberi", "nodo_su_asta", "sezione_nulla", "massa_nulla", "vincoli",
                          "carico_termico", "moti_rigidi"}


def test_asta_a_lunghezza_zero_e_rifiutata(chiedi):
    (r,) = chiedi({"id": 1, "comando": "check", "modello": leggi_fixture("asta_lunghezza_zero.nova.json")})
    assert r[-1]["esito"] == "rifiutato"
    esiti = _esiti(r[-1]["verdetti"])
    assert esiti["aste_lunghezza_zero"] == "non_passato" and esiti["nodi_coincidenti"] == "non_passato"


def test_nodo_libero_e_rifiutato(chiedi):
    (r,) = chiedi({"id": 1, "comando": "check", "modello": leggi_fixture("nodo_libero.nova.json")})
    assert r[-1]["esito"] == "rifiutato"
    assert _esiti(r[-1]["verdetti"])["nodi_liberi"] == "non_passato"


def test_nodi_coincidenti_e_asta_duplicata_sono_rifiutati(chiedi):
    (r,) = chiedi({"id": 1, "comando": "check", "modello": leggi_fixture("nodi_coincidenti.nova.json")})
    esiti = _esiti(r[-1]["verdetti"])
    assert esiti["nodi_coincidenti"] == "non_passato" and esiti["aste_duplicate"] == "non_passato"


def test_nodo_su_asta_chiede_di_spezzare(chiedi):
    m = leggi_fixture("telaio_2x1.nova.json")
    m["nodi"].append({"id": 7, "x": 2500, "y": 0, "z": 3200})
    m["aste"].append({"id": 6, "nodo_i": 7, "nodo_j": 2, "sezione": 1})
    (r,) = chiedi({"id": 1, "comando": "check", "modello": m})
    v = next(v for v in r[-1]["verdetti"] if v["controllo"] == "nodo_su_asta")
    assert v["esito"] == "non_passato" and v["azione"] == "spezza asta" and [7, 4] in v["oggetto"]


def test_carico_termico_e_rifiutato_in_v1(chiedi):
    m = leggi_fixture("telaio_2x1.nova.json")
    m["azioni"][0]["carichi"].append({"tipo": "termico", "asta": 4, "dT_uniforme": 20})
    (r,) = chiedi({"id": 1, "comando": "check", "modello": m})
    assert _esiti(r[-1]["verdetti"])["carico_termico"] == "non_passato"


def test_riferimenti_rotti_sono_sconnessi(chiedi):
    m = leggi_fixture("telaio_2x1.nova.json")
    m["aste"][0]["nodo_j"] = 99
    (r,) = chiedi({"id": 1, "comando": "check", "modello": m})
    assert _esiti(r[-1]["verdetti"])["aste_sconnesse"] == "non_passato"


def test_modello_vuoto_e_rifiutato_senza_eccezioni(chiedi):
    m = {"schema_version": 1, "unita": "mm-N-MPa-t-s"}
    (r,) = chiedi({"id": 1, "comando": "check", "modello": m})
    assert r[-1]["esito"] == "rifiutato"
    assert _esiti(r[-1]["verdetti"])["massa_nulla"] == "non_passato"
```

- [ ] **Step 3: `nova/check.py`**

```python
"""Check Model (C1): i controlli deterministici prima di ogni corsa, ognuno con il suo oracolo.

Misurato sul prototipo #9: OpenSees gira con exit 0 e zero avvisi anche con un'asta a
lunghezza zero o un nodo libero. Questo modulo è l'unico segnale davanti al solutore.
"""
from __future__ import annotations

import math

from nova.modello import Modello

TOLLERANZA_MM = 1.0


def _v(controllo, esito, ragione, oggetto=None, azione=None) -> dict:
    return {"controllo": controllo, "esito": esito, "ragione": ragione, "oggetto": oggetto, "azione": azione}


def _dist(a, b) -> float:
    return math.dist((a.x, a.y, a.z), (b.x, b.y, b.z))


def check_model(m: Modello) -> list[dict]:
    v: list[dict] = []
    nodi = {n.id: n for n in m.nodi}
    sezioni = {s.id: s for s in m.sezioni}

    v.append(_v("unita", "passato", f"unita = {m.unita}"))  # il loader rifiuta già le altre

    ids = list(nodi)
    coincidenti = [[ids[i], ids[j]] for i in range(len(ids)) for j in range(i + 1, len(ids))
                   if _dist(nodi[ids[i]], nodi[ids[j]]) < TOLLERANZA_MM]
    v.append(_v("nodi_coincidenti", "non_passato" if coincidenti else "passato",
                f"coppie di nodi entro {TOLLERANZA_MM:g} mm: {coincidenti or 'nessuna'}", coincidenti or None,
                "unisci i nodi" if coincidenti else None))

    sconnesse = [a.id for a in m.aste if a.nodo_i not in nodi or a.nodo_j not in nodi or a.nodo_i == a.nodo_j]
    v.append(_v("aste_sconnesse", "non_passato" if sconnesse else "passato",
                f"aste con un estremo inesistente o i = j: {sconnesse or 'nessuna'}", sconnesse or None))

    corte = [a.id for a in m.aste if a.nodo_i in nodi and a.nodo_j in nodi
             and _dist(nodi[a.nodo_i], nodi[a.nodo_j]) < TOLLERANZA_MM]
    v.append(_v("aste_lunghezza_zero", "non_passato" if corte else "passato",
                f"aste più corte di {TOLLERANZA_MM:g} mm: {corte or 'nessuna'}", corte or None))

    viste: dict[frozenset, int] = {}
    duplicate = []
    for a in m.aste:
        k = frozenset((a.nodo_i, a.nodo_j))
        if k in viste:
            duplicate.append([viste[k], a.id])
        viste.setdefault(k, a.id)
    v.append(_v("aste_duplicate", "non_passato" if duplicate else "passato",
                f"aste sugli stessi due nodi: {duplicate or 'nessuna'}", duplicate or None))

    toccati = {a.nodo_i for a in m.aste} | {a.nodo_j for a in m.aste}
    liberi = [i for i in ids if i not in toccati]
    v.append(_v("nodi_liberi", "non_passato" if liberi else "passato",
                f"nodi senza aste: {liberi or 'nessuno'}", liberi or None, "elimina il nodo" if liberi else None))

    interni = []
    for a in m.aste:
        if a.nodo_i not in nodi or a.nodo_j not in nodi:
            continue
        p, q = nodi[a.nodo_i], nodi[a.nodo_j]
        d = (q.x - p.x, q.y - p.y, q.z - p.z)
        L2 = sum(c * c for c in d)
        if L2 < TOLLERANZA_MM ** 2:
            continue
        for k, n in nodi.items():
            if k in (a.nodo_i, a.nodo_j):
                continue
            t = ((n.x - p.x) * d[0] + (n.y - p.y) * d[1] + (n.z - p.z) * d[2]) / L2
            if 1e-6 < t < 1 - 1e-6:
                piede = (p.x + t * d[0], p.y + t * d[1], p.z + t * d[2])
                if math.dist((n.x, n.y, n.z), piede) < TOLLERANZA_MM:
                    interni.append([k, a.id])
    v.append(_v("nodo_su_asta", "non_passato" if interni else "passato",
                f"nodi su un'asta senza esserne estremo: {interni or 'nessuno'}", interni or None,
                "spezza asta" if interni else None))

    nulle = [a.id for a in m.aste if a.sezione not in sezioni or sezioni[a.sezione].b * sezioni[a.sezione].h <= 0]
    v.append(_v("sezione_nulla", "non_passato" if nulle else "passato",
                f"aste senza sezione nel catalogo o con b·h = 0: {nulle or 'nessuna'}", nulle or None))

    v.append(_v("massa_nulla", "passato" if m.aste else "non_passato",
                f"{len(m.aste)} aste" if m.aste else "nessuna asta: massa totale zero"))

    vincolati = sorted(k for k, n in nodi.items() if n.vincolo and any(n.vincolo.gradi()))
    if not vincolati:
        v.append(_v("vincoli", "non_passato", "nessun nodo vincolato: il telaio è un moto rigido", None, "vincola un nodo"))
    elif nodi and len(vincolati) == len(nodi) and all(all(nodi[k].vincolo.gradi()) for k in vincolati):
        v.append(_v("vincoli", "non_passato", "ogni nodo è incastrato: non resta nulla da calcolare"))
    else:
        v.append(_v("vincoli", "passato", f"{len(vincolati)} nodi vincolati: {vincolati}"))

    termici = [(a.id, c.asta) for a in m.azioni for c in a.carichi if c.tipo == "termico"]
    v.append(_v("carico_termico", "non_passato" if termici else "passato",
                "il carico termico non gira in v1 (forceBeamColumn a fibre non ha carico termico standard): "
                f"{termici}" if termici else "nessun carico termico", termici or None,
                "togli il carico termico" if termici else None))

    v.append(_v("moti_rigidi", "non_applicabile", "si legge dopo la corsa dalla prima frequenza (controllo autovalori)"))
    return v


def rifiutato(verdetti: list[dict]) -> bool:
    return any(x["esito"] == "non_passato" for x in verdetti)
```

Nota di perimetro: `vincoli_dedotti` (piede dedotto da `opensees._al_piede` ≠ dichiarato) **non** è un cancello in T1: NOVA scrive i `fix` dai vincoli dichiarati, quindi la deduzione serve solo all'importatore di T2 per proporre i vincoli. `armatura_mancante` entra in T4 con le corse a fibre non lineari.

- [ ] **Step 4: Aggancia al sidecar**

In `nova/sidecar.py`:

```python
from nova import check as _check

def comando_check(req: dict) -> dict:
    m = _carica(req)
    verdetti = _check.check_model(m)
    return {"esito": "rifiutato" if _check.rifiutato(verdetti) else "ok", "verdetti": verdetti}
```

- [ ] **Step 5: Esegui i test**

Run: `/Users/mario/GitHub/NOVA/.venv/bin/python -m pytest /Users/mario/GitHub/NOVA/tests -v`
Expected: tutti `PASSED`.

- [ ] **Step 6: Commit**

```bash
git -C /Users/mario/GitHub/NOVA add nova/check.py nova/sidecar.py tests
git -C /Users/mario/GitHub/NOVA commit -F - <<'EOF'
feat(check): Check Model C1 con dodici controlli e oracolo

Un non_passato rifiuta la corsa prima del deck: misurato sul prototipo
che OpenSees accetta in silenzio aste a lunghezza zero e nodi liberi.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01EdTcdzVMf1xmyTGxRwMKuN
EOF
```

---

### Task 4: Scrittura del deck `.tcl`

**Files:**
- Create: `nova/deck.py`, `tests/fixture/trave_appoggiata.nova.json`
- Modify: `nova/sidecar.py` (comando `deck`), `tests/test_sidecar.py`

**Interfaces:**
- Consumes: `nova.modello.*`, `nova.catalogo.valori`, `meshrec.core.armatura.colloca`, `meshrec.core.armatura.BarraCollocata`, `meshrec.core.opensees._costante_torsionale`, `meshrec.core.opensees.MARCA_FINE`, `NOME_FINE`.
- Produces:
  - `nova.deck.Deck` (dataclass): `percorso: Path`, `casi: list[str]`, `nodi: dict[int, tuple]` (tag → xyz), `mappa_nodo: dict[int, int]` (id → tag), `mappa_asta: dict[int, list[int]]` (id → tag degli elementi in ordine i→j), `elementi: list[Elemento]`, `vincolati: list[int]` (tag), `carico_totale: dict[str, tuple[float, float, float]]` (per caso, forze globali applicate, peso compreso), `resoconto: dict`;
  - `nova.deck.Elemento` (dataclass): `tag, asta, i, j, L, a, e1, e2, sezione_tag, massa_lineare, w: dict[str, tuple]` (per caso: carico per lunghezza globale);
  - `nova.deck.scrivi(m: Modello, casi: list[str], cartella: Path) -> Deck` (scrive `13_telaio.tcl`);
  - `nova.deck.NOME_TCL = "13_telaio.tcl"`, `nova.deck.STAZIONI = 5`, `nova.deck.XI_LOBATTO = (0.0, 0.1726731646, 0.5, 0.8273268354, 1.0)`, `nova.deck.GRAVITA = 9806.65`;
  - nomi delle uscite per caso: `f"{caso}_spostamenti.out"`, `f"{caso}_reazioni.out"`, `f"{caso}_localforce.out"`, `f"{caso}_sez{k}.out"` per `k` in 1..5;
  - comando sidecar `deck {modello, casi?, cartella}` → `{"esito": "ok", "tcl": str, "resoconto": {...}}`.

- [ ] **Step 1: Fixture `tests/fixture/trave_appoggiata.nova.json`**

Trave 30×50 di 6 m lungo x, cerniera in 1 (`ux, uy, uz, rx` bloccati) e carrello in 2 (`uy, uz, rx` bloccati; `ux` libero), `suddivisioni: 2`, carico distribuito `q = −10` N/mm lungo z. Materiali e sezione come nel telaio 2×1 (sezione id 2). Azioni: `Z1` con il distribuito; analisi statica `["Z1"]`. Nessun altro carico. Il momento in mezzeria atteso, **senza peso proprio**, è `qL²/8 = 10 · 6000² / 8 = 45 000 000 N·mm`; con il peso proprio generato (`Z2`) il caso `Z1` resta il solo distribuito, e `Z2` è il solo peso: i due casi si leggono separati.

- [ ] **Step 2: Test del deck (falliscono)**

```python
def test_il_deck_scrive_fix_dai_vincoli_dichiarati(chiedi, tmp_path):
    (r,) = chiedi({"id": 1, "comando": "deck", "modello": leggi_fixture("telaio_2x1.nova.json"), "cartella": str(tmp_path)})
    assert r[-1]["esito"] == "ok"
    tcl = (tmp_path / "13_telaio.tcl").read_text()
    assert tcl.count("\nfix ") == 3 and "fix 1 1 1 1 1 1 1" in tcl
    assert "eleLoad -ele" in tcl and "-beamUniform" in tcl
    assert "load 4 20000 0 0 0 0 0" in tcl
    assert "section 3 force" in tcl and "MESHREC_FINE" in tcl
    assert r[-1]["resoconto"]["casi"] == ["Z1", "Z2", "C1", "Z3"]  # Z3 = peso proprio generato


def test_la_combinazione_somma_i_carichi_con_i_coefficienti(chiedi, tmp_path):
    (r,) = chiedi({"id": 1, "comando": "deck", "modello": leggi_fixture("telaio_2x1.nova.json"),
                   "casi": ["C1"], "cartella": str(tmp_path)})
    tcl = (tmp_path / "13_telaio.tcl").read_text()
    assert "load 4 30000 0 0 0 0 0" in tcl  # 1,5 × 20 000
    tot = r[-1]["resoconto"]["carico_totale"]["C1"]
    assert abs(tot[0] - 30000) < 1e-6 and abs(tot[2] - (-1.5 * 12.5 * 9000)) < 1e-6


def test_il_carrello_lascia_ux_libero(chiedi, tmp_path):
    (r,) = chiedi({"id": 1, "comando": "deck", "modello": leggi_fixture("trave_appoggiata.nova.json"), "cartella": str(tmp_path)})
    tcl = (tmp_path / "13_telaio.tcl").read_text()
    assert "fix 1 1 1 1 1 0 0" in tcl and "fix 3 0 1 1 1 0 0" in tcl  # nodo 2 → tag 3 (il nodo interno prende il tag 2? no: vedi sotto)


def test_le_suddivisioni_creano_nodi_interni(chiedi, tmp_path):
    (r,) = chiedi({"id": 1, "comando": "deck", "modello": leggi_fixture("trave_appoggiata.nova.json"), "cartella": str(tmp_path)})
    res = r[-1]["resoconto"]
    assert res["nodi"] == 3 and res["elementi"] == 2 and res["mappa_asta"]["1"] == [1, 2]


def test_il_deck_rifiuta_un_caso_non_dichiarato(chiedi, tmp_path):
    (r,) = chiedi({"id": 1, "comando": "deck", "modello": leggi_fixture("telaio_2x1.nova.json"),
                   "casi": ["Z9"], "cartella": str(tmp_path)})
    assert r[-1]["esito"] == "errore" and r[-1]["fase"] == "deck" and "Z9" in r[-1]["motivo"]


def test_il_cedimento_scrive_sp(chiedi, tmp_path):
    m = leggi_fixture("telaio_2x1.nova.json")
    m["azioni"].append({"id": 3, "nome": "cedimento", "natura": "G1",
                        "carichi": [{"tipo": "cedimento", "nodo": 2, "uz": -5.0}]})
    m["contatori"]["azione"] = 3
    (r,) = chiedi({"id": 1, "comando": "deck", "modello": m, "casi": ["Z3"], "cartella": str(tmp_path)})
    assert "sp 2 3 -5" in (tmp_path / "13_telaio.tcl").read_text()
```

Sui tag dei nodi: i nodi del modello prendono i tag 1..N nell'ordine del file; i nodi interni delle suddivisioni prendono i tag da N+1 in poi. Nella trave appoggiata il nodo 2 del modello ha tag 2 e il nodo interno tag 3: correggi il test `test_il_carrello_lascia_ux_libero` in `"fix 2 0 1 1 1 0 0"` (la riga sopra porta un dubbio scritto apposta: risolvilo leggendo `scrivi`, e lascia il test coerente col codice).

- [ ] **Step 3: `nova/deck.py`**

```python
"""Modello NOVA → deck `.tcl` per il binario OpenSees.

Scritto da NOVA e non da `opensees.scrivi_tcl` (copia verbatim): quella deduce i vincoli
dalla geometria e scrive il solo peso proprio come carico nodale. Qui: `fix` dai vincoli
dichiarati, un caso di carico per azione o combinazione con i carichi già sommati, carichi
distribuiti come `eleLoad -beamUniform` proiettati nel riferimento locale, cedimenti come
`sp`, recorder per stazione (`section k force`), marcatore di fine come in MeshRec.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from pathlib import Path
from typing import NamedTuple

import numpy as np

from meshrec.core import armatura, opensees
from nova import catalogo
from nova.modello import Asta, Modello, Sezione

NOME_TCL = "13_telaio.tcl"
GRAVITA = 9806.65
STAZIONI = 5
XI_LOBATTO = (0.0, 0.1726731646, 0.5, 0.8273268354, 1.0)
_COSENO_VERTICALE = 0.999


class Barra(NamedTuple):
    y: float
    z: float
    diametro: float


@dataclass
class Elemento:
    tag: int
    asta: int
    i: int
    j: int
    L: float
    a: np.ndarray
    e1: np.ndarray
    e2: np.ndarray
    sezione_tag: int
    massa_lineare: float
    w: dict[str, tuple[float, float, float]] = field(default_factory=dict)


@dataclass
class Deck:
    percorso: Path
    casi: list[str]
    nodi: dict[int, tuple[float, float, float]]
    mappa_nodo: dict[int, int]
    mappa_asta: dict[int, list[int]]
    elementi: list[Elemento]
    vincolati: list[int]
    carico_totale: dict[str, tuple[float, float, float]]
    resoconto: dict


class _ArmaturaDuck(NamedTuple):
    """Il sottoinsieme di `ArmaturaConfig` che `armatura.colloca` legge."""
    barre_tese: int
    diametro_teso: float
    barre_compresse: int
    diametro_compresso: float
    diametro_staffe: float
    passo_staffe: float
    copriferro_nominale: float


def _terna(a: np.ndarray, rotazione_deg: float) -> tuple[np.ndarray, np.ndarray]:
    """`(e1, e2)`: e2 è la verticale proiettata (per un'asta verticale, la y globale),
    e1 = e2 × a. OpenSees deriva l'asse locale y come vecxz × asse, quindi vecxz = e2 e
    localy = e1 (misurato in MeshRec il 30/08/2026). `rotazione_deg` ruota la coppia attorno ad a."""
    z = np.array([0.0, 0.0, 1.0])
    if abs(float(np.dot(a, z))) > _COSENO_VERTICALE:
        e2 = np.array([0.0, 1.0, 0.0])
    else:
        e2 = z - np.dot(z, a) * a
        e2 /= np.linalg.norm(e2)
    e1 = np.cross(e2, a)
    if rotazione_deg:
        t = math.radians(rotazione_deg)
        e1, e2 = (math.cos(t) * e1 + math.sin(t) * e2, -math.sin(t) * e1 + math.cos(t) * e2)
    return e1, e2


def _dimensioni_lungo(s: Sezione, a: np.ndarray) -> tuple[float, float]:
    """(lungo e1, lungo e2): per un'asta coricata b sta lungo e1 (orizzontale) e h lungo e2 (verticale);
    per un'asta in piedi h sta lungo e1 (nel piano del telaio) e b lungo e2 (fuori piano)."""
    verticale = abs(float(a[2])) > _COSENO_VERTICALE
    return (s.h, s.b) if verticale else (s.b, s.h)


def _barre(s: Sezione, lungo_e1: float, lungo_e2: float) -> list[Barra]:
    """Posizioni delle barre centrate sul baricentro, y lungo e1 e z lungo e2.
    `inf`/`sup` passano da `armatura.colloca` (verificata in MeshRec); `sx`/`dx` a filo dei lati,
    equidistanti fra i due strati (ponytail: una fila per lato, senza interferro verificato)."""
    file = {f.lato: f for f in s.file}
    st = s.staffe
    if not file or st is None:
        return []
    inf, sup = file.get("inf"), file.get("sup")
    barre: list[Barra] = []
    if inf is not None:
        duck = _ArmaturaDuck(inf.n, inf.diametro, sup.n if sup else 0, sup.diametro if sup else inf.diametro,
                             st.diametro, st.passo, s.copriferro)
        for b in armatura.colloca(duck, (lungo_e1, lungo_e2)):
            barre.append(Barra(b.y - lungo_e1 / 2, b.z - lungo_e2 / 2, b.diametro))
    elif sup is not None:
        duck = _ArmaturaDuck(sup.n, sup.diametro, 0, sup.diametro, st.diametro, st.passo, s.copriferro)
        for b in armatura.colloca(duck, (lungo_e1, lungo_e2)):
            barre.append(Barra(b.y - lungo_e1 / 2, lungo_e2 / 2 - b.z, b.diametro))  # specchiata: sta in alto
    for lato, segno in (("sx", -1.0), ("dx", 1.0)):
        f = file.get(lato)
        if f is None:
            continue
        y = segno * (lungo_e1 / 2 - s.copriferro - st.diametro - f.diametro / 2)
        z0 = -(lungo_e2 / 2 - s.copriferro - st.diametro - f.diametro / 2)
        passo = (-2 * z0) / (f.n + 1)
        barre += [Barra(y, z0 + passo * (k + 1), f.diametro) for k in range(f.n)]
    return barre


def _massa_lineare(s: Sezione, barre: list[Barra], m: Modello) -> float:
    """t/mm: calcestruzzo (al netto delle riduzioni e delle barre) + acciaio."""
    r = s.riduzione
    b = s.b - ((r.sx + r.dx) if r else 0.0)
    h = s.h - ((r.sup + r.inf) if r else 0.0)
    area_barre = sum(math.pi * x.diametro ** 2 / 4 for x in barre)
    cls = catalogo.valori(m.materiale(s.calcestruzzo))
    acc = catalogo.valori(m.materiale(s.acciaio))
    return (b * h - area_barre) * cls["densita"] + area_barre * acc["densita"]


def _fattori(m: Modello, caso: str) -> dict[int, float]:
    """{id azione: coefficiente} del caso `Z<id>` o `C<id>`; solleva se il caso non esiste."""
    n = int(caso[1:])
    if caso[0] == "Z" and m.azione(n) is not None:
        return {n: 1.0}
    if caso[0] == "C" and m.combinazione(n) is not None:
        return {t.azione: t.coefficiente for t in m.combinazione(n).termini}
    raise ValueError(f"caso {caso} non dichiarato: i casi sono {[f'Z{a.id}' for a in m.azioni] + [f'C{c.id}' for c in m.combinazioni]}")


def scrivi(m: Modello, casi: list[str], cartella: Path) -> Deck:
    cartella = Path(cartella)
    cartella.mkdir(parents=True, exist_ok=True)
    nodi_xyz: dict[int, tuple[float, float, float]] = {}
    mappa_nodo: dict[int, int] = {}
    for tag, n in enumerate(m.nodi, start=1):
        mappa_nodo[n.id] = tag
        nodi_xyz[tag] = (n.x, n.y, n.z)
    prossimo_nodo = len(m.nodi) + 1

    sezioni_tag = {s.id: k for k, s in enumerate(m.sezioni, start=1)}
    elementi: list[Elemento] = []
    mappa_asta: dict[int, list[int]] = {}
    for a in m.aste:
        s = m.sezione(a.sezione)
        p = np.array(nodi_xyz[mappa_nodo[a.nodo_i]]); q = np.array(nodi_xyz[mappa_nodo[a.nodo_j]])
        L = float(np.linalg.norm(q - p)); asse = (q - p) / L
        e1, e2 = _terna(asse, a.rotazione_deg)
        lungo_e1, lungo_e2 = _dimensioni_lungo(s, asse)
        massa = _massa_lineare(s, _barre(s, lungo_e1, lungo_e2), m)
        tags_nodi = [mappa_nodo[a.nodo_i]]
        for k in range(1, a.suddivisioni):
            xyz = tuple(float(v) for v in p + (q - p) * k / a.suddivisioni)
            nodi_xyz[prossimo_nodo] = xyz; tags_nodi.append(prossimo_nodo); prossimo_nodo += 1
        tags_nodi.append(mappa_nodo[a.nodo_j])
        mappa_asta[a.id] = []
        for i, j in zip(tags_nodi, tags_nodi[1:]):
            tag = len(elementi) + 1
            elementi.append(Elemento(tag, a.id, i, j, L / a.suddivisioni, asse, e1, e2, sezioni_tag[a.sezione], massa))
            mappa_asta[a.id].append(tag)

    # ---- carichi per caso: nodali (globali), distribuiti per elemento (vettore globale per lunghezza), cedimenti
    nodali: dict[str, dict[int, list[float]]] = {}
    cedimenti: dict[str, list[tuple[int, int, float]]] = {}
    carico_totale: dict[str, tuple[float, float, float]] = {}
    per_asta = {a.id: [e for e in elementi if e.asta == a.id] for a in m.aste}
    for caso in casi:
        fattori = _fattori(m, caso)
        nodali[caso] = {}; cedimenti[caso] = []
        for e in elementi:
            e.w[caso] = (0.0, 0.0, 0.0)
        for id_azione, coeff in fattori.items():
            for c in m.azione(id_azione).carichi:
                if c.tipo == "nodale":
                    v = nodali[caso].setdefault(mappa_nodo[c.nodo], [0.0] * 6)
                    for k, comp in enumerate((c.Fx, c.Fy, c.Fz, c.Mx, c.My, c.Mz)):
                        v[k] += coeff * comp
                elif c.tipo == "distribuito":
                    for e in per_asta[c.asta]:
                        d = {"x": (1, 0, 0), "y": (0, 1, 0), "z": (0, 0, 1), "locale_y": tuple(e.e1), "locale_z": tuple(e.e2)}[c.direzione]
                        e.w[caso] = tuple(w + coeff * c.q * dk for w, dk in zip(e.w[caso], d))
                elif c.tipo == "gravita":
                    for e in elementi:
                        g = e.massa_lineare * GRAVITA
                        e.w[caso] = tuple(w + coeff * g * f for w, f in zip(e.w[caso], (c.fattore_x, c.fattore_y, c.fattore_z)))
                elif c.tipo == "cedimento":
                    for dof, val in enumerate((c.ux, c.uy, c.uz, c.rx, c.ry, c.rz), start=1):
                        if val is not None:
                            cedimenti[caso].append((mappa_nodo[c.nodo], dof, coeff * val))
                # termico: rifiutato dal Check Model, qui non arriva
        tot = np.zeros(3)
        for v in nodali[caso].values():
            tot += np.array(v[:3])
        for e in elementi:
            tot += np.array(e.w[caso]) * e.L
        carico_totale[caso] = tuple(float(x) for x in tot)

    # ---- il file
    vincolati = [mappa_nodo[n.id] for n in m.nodi if n.vincolo and any(n.vincolo.gradi())]
    r = ["# Deck generato da NOVA (nova/deck.py). Unità: mm, N, MPa, t, s.",
         "# Si esegue con la cartella di lavoro sulla cartella di uscita.",
         "wipe", "model BasicBuilder -ndm 3 -ndf 6", "", "# --- nodi ---"]
    for tag, (x, y, z) in nodi_xyz.items():
        r.append(f"node {tag} {x:.10g} {y:.10g} {z:.10g}")
    for n in m.nodi:
        if n.massa_nodale:
            r.append(f"mass {mappa_nodo[n.id]} {n.massa_nodale:.10g} {n.massa_nodale:.10g} {n.massa_nodale:.10g} 0 0 0")
    r += ["", "# --- vincoli dichiarati ---"]
    for n in m.nodi:
        if n.vincolo and any(n.vincolo.gradi()):
            r.append(f"fix {mappa_nodo[n.id]} " + " ".join(str(g) for g in n.vincolo.gradi()))
    r += ["", "# --- materiali elastici (T1) e sezioni a fibre ---"]
    tag_mat = 1
    for s in m.sezioni:
        cls = catalogo.valori(m.materiale(s.calcestruzzo)); acc = catalogo.valori(m.materiale(s.acciaio))
        E_c = cls["E"] * (s_danno if (s_danno := 1.0) else 1.0)
        r.append(f"uniaxialMaterial Elastic {tag_mat} {E_c:.10g}    ;# {m.materiale(s.calcestruzzo).classe}, sezione {s.id}")
        r.append(f"uniaxialMaterial Elastic {tag_mat + 1} {acc['E']:.10g}    ;# {m.materiale(s.acciaio).classe}, sezione {s.id}")
        asse_tipo = next((e.a for e in elementi if e.sezione_tag == sezioni_tag[s.id]), np.array([1.0, 0, 0]))
        lungo_e1, lungo_e2 = _dimensioni_lungo(s, asse_tipo)
        rid = s.riduzione
        y0, y1 = -lungo_e1 / 2, lungo_e1 / 2
        z0, z1 = -lungo_e2 / 2, lungo_e2 / 2
        if rid:  # il contorno si restringe, le barre restano dove il copriferro nominale le mette
            verticale = abs(float(asse_tipo[2])) > _COSENO_VERTICALE
            y0 += rid.inf if verticale else rid.sx; y1 -= rid.sup if verticale else rid.dx
            z0 += rid.sx if verticale else rid.inf; z1 -= rid.dx if verticale else rid.sup
        G = cls["E"] / (2 * (1 + cls["nu"]))
        gj = G * opensees._costante_torsionale(lungo_e1, lungo_e2)
        n_f = m.impostazioni_analisi.fibre
        r.append(f"section Fiber {sezioni_tag[s.id]} -GJ {gj:.10g} {{")
        r.append(f"    patch rect {tag_mat} {n_f} {n_f} {y0:.10g} {z0:.10g} {y1:.10g} {z1:.10g}")
        for b in _barre(s, lungo_e1, lungo_e2):
            r.append(f"    fiber {b.y:.10g} {b.z:.10g} {math.pi * b.diametro ** 2 / 4:.10g} {tag_mat + 1}")
        r.append("}")
        tag_mat += 2
    r += ["", "# --- trasformazioni ed elementi ---"]
    for e in elementi:
        r.append(f"geomTransf Linear {e.tag} {e.e2[0]:.10g} {e.e2[1]:.10g} {e.e2[2]:.10g}")
        r.append(f"element forceBeamColumn {e.tag} {e.i} {e.j} {STAZIONI} {e.sezione_tag} {e.tag} -mass {e.massa_lineare:.10g}")
    n_nodi, n_el = len(nodi_xyz), len(elementi)
    for k, caso in enumerate(casi, start=1):
        r += ["", f"# ===== caso di carico {caso} =====", f"timeSeries Linear {k}", f"pattern Plain {k} {k} {{"]
        for tag, v in nodali[caso].items():
            r.append(f"    load {tag} " + " ".join(f"{x:.10g}" for x in v))
        for e in elementi:
            w = np.array(e.w[caso])
            if np.any(w):
                r.append(f"    eleLoad -ele {e.tag} -type -beamUniform {np.dot(w, e.e1):.10g} {np.dot(w, e.e2):.10g} {np.dot(w, e.a):.10g}")
        for tag, dof, val in cedimenti[caso]:
            r.append(f"    sp {tag} {dof} {val:.10g}")
        r.append("}")
        r += [f"recorder Node -file {caso}_spostamenti.out -precision 12 -nodeRange 1 {n_nodi} -dof 1 2 3 4 5 6 disp",
              f"recorder Node -file {caso}_reazioni.out -precision 12 -nodeRange 1 {n_nodi} -dof 1 2 3 4 5 6 reaction",
              f"recorder Element -file {caso}_localforce.out -precision 12 -eleRange 1 {n_el} localForce"]
        for st in range(1, STAZIONI + 1):
            r.append(f"recorder Element -file {caso}_sez{st}.out -precision 12 -eleRange 1 {n_el} section {st} force")
        r += ["constraints Transformation", "numberer RCM", "system BandGeneral", "test NormDispIncr 1.0e-8 10",
              "algorithm Linear", "integrator LoadControl 1.0", "analysis Static",
              "if {[analyze 1] != 0} {", f'    puts "{opensees.MARCA_FINE}_MANCA: il caso {caso} non è arrivato a convergenza"', "    exit 1", "}",
              "remove recorders", "wipeAnalysis", f"remove loadPattern {k}", "reset"]
    r += ["", "wipe", f'set _fine [open "{opensees.NOME_FINE}" w]', f'puts $_fine "{opensees.MARCA_FINE}"', "close $_fine", ""]
    percorso = cartella / NOME_TCL
    percorso.write_text("\n".join(r), encoding="utf-8")
    resoconto = {"tcl": str(percorso), "nodi": n_nodi, "elementi": n_el, "casi": list(casi),
                 "vincolati": len(vincolati), "carico_totale": carico_totale,
                 "mappa_nodo": {str(k): v for k, v in mappa_nodo.items()},
                 "mappa_asta": {str(k): v for k, v in mappa_asta.items()}}
    return Deck(percorso, list(casi), nodi_xyz, mappa_nodo, mappa_asta, elementi, vincolati, carico_totale, resoconto)
```

Due punti da chiudere leggendo e non assumendo: (1) la riga `E_c = cls["E"] * (...)` è un segnaposto sbagliato lasciato apposta come esempio di ciò che **non** si scrive — sostituiscila con `E_c = cls["E"]` in T1 (il `danno` per asta entra in T4 quando i materiali diventano per asta); (2) `reset` dopo ogni caso: verifica sul binario che il secondo caso parta da spostamenti nulli (test `test_due_casi_sono_indipendenti` in Task 5). Se `reset` non azzera, sostituisci con `remove loadPattern k; loadConst -time 0.0; reset` e annota la misura nel docstring.

- [ ] **Step 4: Comando `deck` nel sidecar**

```python
from pathlib import Path
from nova import deck as _deck
from nova.modello import casi_dichiarati

def comando_deck(req: dict) -> dict:
    m = _carica(req)
    casi = req.get("casi") or _casi_delle_analisi(m)
    try:
        d = _deck.scrivi(m, casi, Path(req.get("cartella") or "corsa"))
    except ValueError as e:
        raise _Rifiuto("deck", str(e)) from None
    return {"esito": "ok", "tcl": str(d.percorso), "resoconto": d.resoconto}


def _casi_delle_analisi(m) -> list[str]:
    """I casi delle analisi statiche dichiarate, più il peso proprio generato se non c'è già."""
    casi: list[str] = []
    for an in m.analisi:
        if an.tipo == "statica":
            casi += [c for c in an.casi if c not in casi]
    peso = next(f"Z{a.id}" for a in m.azioni if a.generata)
    if peso not in casi:
        casi.append(peso)
    return casi
```

e in `rispondi`: `if comando == "deck": return comando_deck(req)`.

- [ ] **Step 5: Esegui**

Run: `/Users/mario/GitHub/NOVA/.venv/bin/python -m pytest /Users/mario/GitHub/NOVA/tests -v`
Expected: `PASSED`. Poi lancia a mano il deck sul telaio 2×1 con il binario per vedere che OpenSees lo accetti:

```bash
cd /tmp && rm -rf nova_deck && mkdir nova_deck && printf '{"id":1,"comando":"deck","modello":%s,"cartella":"/tmp/nova_deck"}\n' "$(cat /Users/mario/GitHub/NOVA/tests/fixture/telaio_2x1.nova.json)" | /Users/mario/GitHub/NOVA/.venv/bin/python -m nova.sidecar
```

```bash
cd /tmp/nova_deck && /Users/mario/.local/bin/OpenSees 13_telaio.tcl; ls /tmp/nova_deck; cat /tmp/nova_deck/fine.out
```

Expected: `fine.out` con `MESHREC_FINE`, file `Z1_sez3.out` presenti. Conta le colonne di `Z1_sez1.out`: attese **4 per elemento** (`P Mz My T` della sezione a fibre 3D con `-GJ`); se sono diverse, annota il numero misurato in `corsa.py` (`_COLONNE_SEZIONE`).

- [ ] **Step 6: Commit**

```bash
git -C /Users/mario/GitHub/NOVA add nova/deck.py nova/sidecar.py tests
git -C /Users/mario/GitHub/NOVA commit -F - <<'EOF'
feat(deck): deck .tcl da NOVA con vincoli dichiarati e casi per azione

Sostituisce la scrittura di opensees.py (che deduce il piede e scrive
solo il peso proprio): fix dai vincoli, un pattern per caso con i
carichi sommati, eleLoad proiettato nel locale, sp per i cedimenti,
recorder per stazione, marcatore di fine.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01EdTcdzVMf1xmyTGxRwMKuN
EOF
```

---

### Task 5: Corsa, lettura delle uscite, risultati e controlli C3

**Files:**
- Create: `nova/corsa.py`, `tests/test_corsa_binario.py`
- Modify: `nova/sidecar.py` (comandi `verifica`, `corsa`), `tests/test_sidecar.py` (solutore finto)

**Interfaces:**
- Consumes: `nova.deck.scrivi`, `Deck`, `Elemento`, `XI_LOBATTO`, `STAZIONI`; `meshrec.core.opensees._ultima_riga(percorso, attesi)`, `opensees.conta_avvisi(testo)`, `opensees.NOME_FINE`, `MARCA_FINE`, `NOME_REGISTRO`; `meshrec.core.solve.disponibilita`, `solve.verifica`, `solve.controlla_reazioni`, `solve.controlla_spostamenti`, `solve.controlla_avvisi`, `solve.esito_non_applicabile`, `solve._TOLLERANZA_REAZIONI`; `meshrec.core.config.SolutoreConfig`.
- Produces:
  - `nova.corsa.esegui(m, casi, cartella, percorso_solutore=None, emetti=lambda ev: None) -> dict` con `esito: ok | errore | assente` e, su `ok`, `risultati` nella forma della spec (`run`, `per_caso`, `modi: []`, `verdetti`), `secondi`;
  - `nova.corsa.risultati_da_uscite(m, deck, cartella, registro: str) -> dict`;
  - `nova.corsa.controlli(m, deck, per_caso, registro) -> list[dict]` (sette verdetti a tre valori);
  - `nova.corsa.SEGNO_MY = +1.0` e `SEGNO_MZ = +1.0` (costanti misurate: il momento positivo tende le fibre inferiori);
  - comando sidecar `verifica {solutore?}` → `{esito: ok | rotto | assente, percorso, motivo, dove_prenderlo}`; `corsa {modello, casi?, cartella, solutore?, forza?}` → `{esito: ok | rifiutato | errore | assente, risultati?, verdetti_check, secondi}` con gli eventi di fase `check model`, `scrivo il deck e lancio OpenSees`, `leggo i recorder`.

- [ ] **Step 1: Test con il binario (saltano senza)**

`tests/test_corsa_binario.py`:

```python
"""Corse vere su OpenSees 3.8.0: gli oracoli sono l'equilibrio e la trave appoggiata."""
import json
import math

import numpy as np
import pytest

from conftest import leggi_fixture


def _corsa(chiedi, nome, tmp_path, **extra):
    (r,) = chiedi({"id": 1, "comando": "corsa", "modello": leggi_fixture(nome), "cartella": str(tmp_path), **extra})
    return r


def test_telaio_2x1_equilibrio_per_ogni_caso(chiedi, tmp_path, binario_opensees):
    r = _corsa(chiedi, "telaio_2x1.nova.json", tmp_path)
    assert [x["nome"] for x in r if x.get("evento") == "fase"] == ["check model", "scrivo il deck e lancio OpenSees", "leggo i recorder"]
    fin = r[-1]
    assert fin["esito"] == "ok", fin
    ris = fin["risultati"]
    for caso, dati in ris["per_caso"].items():
        somma = np.sum([v[:3] for k, v in dati["reazioni"].items()], axis=0)
        atteso = -np.array(ris["run"]["carico_totale"][caso])
        assert np.linalg.norm(somma - atteso) <= 1e-6 * max(np.linalg.norm(atteso), 1.0), caso
    esiti = {v["controllo"]: v["esito"] for v in ris["verdetti"] if v.get("caso") is None or v["caso"] == "C1"}
    assert esiti["reazioni"] == "passato" and esiti["avvisi"] == "passato" and esiti["spostamenti"] == "passato"
    assert esiti["picco"] == "non_applicabile" and esiti["vincolo_in_pianta"] == "non_applicabile"
    assert esiti["autovalori"] == "non_applicabile" and esiti["massa_modale"] == "non_applicabile"
    assert ris["run"]["mappa_tag"]["nodo"]["4"] == 4 and ris["run"]["hash_modello"]


def test_trave_appoggiata_momento_in_mezzeria(chiedi, tmp_path, binario_opensees):
    fin = _corsa(chiedi, "trave_appoggiata.nova.json", tmp_path, casi=["Z1"])[-1]
    assert fin["esito"] == "ok", fin
    st = fin["risultati"]["per_caso"]["Z1"]["sollecitazioni"]["1"]
    mezzo = min(st, key=lambda s: abs(s["x_rel"] - 0.5))
    assert abs(mezzo["x_rel"] - 0.5) < 1e-9  # con 2 suddivisioni la stazione 5 del primo elemento è a metà
    assert mezzo["My"] == pytest.approx(10.0 * 6000 ** 2 / 8, rel=1e-3)  # positivo: fibre inferiori tese
    assert abs(st[0]["Vz"]) == pytest.approx(10.0 * 6000 / 2, rel=1e-3)
    assert abs(st[0]["N"]) < 1.0


def test_due_casi_sono_indipendenti(chiedi, tmp_path, binario_opensees):
    fin = _corsa(chiedi, "trave_appoggiata.nova.json", tmp_path, casi=["Z1", "Z2"])[-1]
    a = fin["risultati"]["per_caso"]["Z1"]["sollecitazioni"]["1"]
    b = fin["risultati"]["per_caso"]["Z2"]["sollecitazioni"]["1"]
    assert abs(b[0]["My"] if False else min(b, key=lambda s: abs(s["x_rel"] - 0.5))["My"]) < min(a, key=lambda s: abs(s["x_rel"] - 0.5))["My"]
    # il peso proprio (Z2) pesa meno di q = 10 N/mm: 300×500 × 2,5493e-9 × 9806,65 ≈ 3,75 N/mm


def test_asta_a_lunghezza_zero_forzata_mostra_lo_squilibrio(chiedi, tmp_path, binario_opensees):
    fin = _corsa(chiedi, "asta_lunghezza_zero.nova.json", tmp_path, forza=True)[-1]
    assert fin["esito"] in ("ok", "errore")
    if fin["esito"] == "ok":
        assert any(v["controllo"] == "reazioni" and v["esito"] == "non_passato" for v in fin["risultati"]["verdetti"])


def test_senza_forza_il_check_rifiuta_prima_del_deck(chiedi, tmp_path):
    fin = _corsa(chiedi, "nodo_libero.nova.json", tmp_path)[-1]
    assert fin["esito"] == "rifiutato" and not (tmp_path / "13_telaio.tcl").exists()


def test_verifica_dice_dove_sta_il_binario(chiedi, binario_opensees):
    (r,) = chiedi({"id": 1, "comando": "verifica"})
    assert r[-1]["esito"] == "ok" and r[-1]["percorso"].endswith("OpenSees")


def test_i_risultati_sono_scritti_su_disco(chiedi, tmp_path, binario_opensees):
    fin = _corsa(chiedi, "telaio_2x1.nova.json", tmp_path)[-1]
    scritto = json.loads((tmp_path / "risultati.nova.risultati.json").read_text())
    assert scritto["run"]["hash_modello"] == fin["risultati"]["run"]["hash_modello"]
```

Aggiungi a `tests/test_sidecar.py` il solutore finto (gira senza binario):

```python
def test_solutore_che_non_scrive_il_marcatore_e_un_errore_di_fase_solutore(chiedi, tmp_path):
    finto = tmp_path / "OpenSees"
    finto.write_text("#!/bin/sh\necho 'OpenSees -- Open System For Earthquake Engineering Simulation'\necho 'Version 3.8.0'\necho WARNING finto\nexit 0\n")
    finto.chmod(0o755)
    (r,) = chiedi({"id": 1, "comando": "corsa", "modello": leggi_fixture("telaio_2x1.nova.json"),
                   "cartella": str(tmp_path / "c"), "solutore": str(finto)})
    assert r[-1]["esito"] == "errore" and r[-1]["fase"] == "solutore"
    assert "marcatore" in r[-1]["motivo"] and "WARNING finto" in r[-1]["coda_log"]


def test_solutore_assente_non_e_un_errore(chiedi, tmp_path):
    (r,) = chiedi({"id": 1, "comando": "corsa", "modello": leggi_fixture("telaio_2x1.nova.json"),
                   "cartella": str(tmp_path), "solutore": str(tmp_path / "non_esiste")})
    assert r[-1]["esito"] == "assente" and r[-1]["dove_prenderlo"]
```

- [ ] **Step 2: `nova/corsa.py`**

```python
"""Lancia OpenSees sul deck, legge i recorder, compone i risultati per corsa e i sette controlli C3."""
from __future__ import annotations

import datetime as _dt
import json
import subprocess
import time
import uuid
from pathlib import Path

import numpy as np

from meshrec.core import opensees, solve
from meshrec.core.config import SolutoreConfig
from nova import deck as _deck
from nova.modello import Modello, impronta

NOME_RISULTATI = "risultati.nova.risultati.json"
_COLONNE_SEZIONE = 4  # P Mz My T: misurato al primo lancio (Task 4, Step 5); correggi qui se diverso
SEGNO_MY = 1.0  # +1 se My del recorder tende già le fibre inferiori sotto carico verso il basso; −1 altrimenti (misura con la trave appoggiata)
SEGNO_MZ = 1.0
_TIMEOUT_S = 600


def _solutore(percorso: str | None) -> SolutoreConfig:
    return SolutoreConfig(nome="opensees", percorso=Path(percorso) if percorso else None)


def verifica(percorso: str | None) -> dict:
    stato = solve.disponibilita(_solutore(percorso))["opensees"]
    if not stato["disponibile"]:
        return {"esito": "assente", "percorso": None, "motivo": stato["motivo"], "dove_prenderlo": stato["dove_prenderlo"]}
    prova = solve.verifica(_solutore(percorso))
    return {"esito": "ok" if prova["funziona"] else "rotto", "percorso": str(stato["percorso"]), "motivo": prova["motivo"],
            "dove_prenderlo": stato["dove_prenderlo"]}


def esegui(m: Modello, casi: list[str], cartella: Path, percorso_solutore: str | None = None, emetti=lambda ev: None) -> dict:
    t0 = time.perf_counter()
    stato = solve.disponibilita(_solutore(percorso_solutore))["opensees"]
    if not stato["disponibile"]:
        return {"esito": "assente", "motivo": stato["motivo"], "dove_prenderlo": stato["dove_prenderlo"], "secondi": time.perf_counter() - t0}
    cartella = Path(cartella)
    cartella.mkdir(parents=True, exist_ok=True)
    for vecchia in cartella.glob("*.out"):
        vecchia.unlink()
    emetti({"evento": "fase", "nome": "scrivo il deck e lancio OpenSees"})
    d = _deck.scrivi(m, casi, cartella)
    processo = subprocess.run([str(stato["percorso"]), _deck.NOME_TCL], cwd=cartella, capture_output=True, timeout=_TIMEOUT_S)
    registro = (processo.stdout + processo.stderr).decode("utf-8", errors="replace")
    (cartella / opensees.NOME_REGISTRO).write_text(registro, encoding="utf-8")
    fine = cartella / opensees.NOME_FINE
    if not (fine.is_file() and opensees.MARCA_FINE in fine.read_text(encoding="ascii", errors="ignore")):
        return {"esito": "errore", "fase": "solutore",
                "motivo": f"OpenSees non ha scritto il marcatore di fine ({opensees.NOME_FINE}): la corsa non è arrivata in fondo "
                          f"(codice d'uscita {processo.returncode}, che non è il segnale)",
                "coda_log": registro[-2000:], "secondi": time.perf_counter() - t0}
    emetti({"evento": "fase", "nome": "leggo i recorder"})
    risultati = risultati_da_uscite(m, d, cartella, registro)
    risultati["run"]["secondi"] = time.perf_counter() - t0
    (cartella / NOME_RISULTATI).write_text(json.dumps(risultati, ensure_ascii=False, indent=1), encoding="utf-8")
    return {"esito": "ok", "risultati": risultati, "secondi": risultati["run"]["secondi"]}


def _stazioni(d: _deck.Deck, caso: str, cartella: Path) -> dict[str, list[dict]]:
    """Per asta: le stazioni di tutti i suoi elementi, con x_rel sull'asta, N/My/Mz/T dalla sezione, V dall'equilibrio."""
    n_el = len(d.elementi)
    sez = [opensees._ultima_riga(cartella / f"{caso}_sez{k}.out", _COLONNE_SEZIONE * n_el).reshape(n_el, _COLONNE_SEZIONE)
           for k in range(1, _deck.STAZIONI + 1)]
    locali = opensees._ultima_riga(cartella / f"{caso}_localforce.out", 12 * n_el).reshape(n_el, 12)
    per_asta: dict[str, list[dict]] = {}
    for id_asta, tags in d.mappa_asta.items():
        L_asta = sum(d.elementi[t - 1].L for t in tags)
        offset = 0.0
        stazioni = []
        for t in tags:
            e = d.elementi[t - 1]
            w = np.array(e.w[caso])
            wy, wz = float(np.dot(w, e.e1)), float(np.dot(w, e.e2))
            Fi = locali[t - 1, :6]  # forze d'estremità i nel locale: N, Vy, Vz, T, My, Mz
            for k, xi in enumerate(_deck.XI_LOBATTO):
                if stazioni and k == 0:
                    continue  # la stazione 0 di un elemento interno coincide con la 1 del precedente
                x = xi * e.L
                P, Mz, My, T = (float(v) for v in sez[k][t - 1, :4])
                stazioni.append({"x_rel": (offset + x) / L_asta, "N": -P if False else P,
                                 "Vy": -(float(Fi[1]) + wy * x), "Vz": -(float(Fi[2]) + wz * x),
                                 "T": T, "My": SEGNO_MY * My, "Mz": SEGNO_MZ * Mz})
            offset += e.L
        per_asta[str(id_asta)] = stazioni
    return per_asta


def risultati_da_uscite(m: Modello, d: _deck.Deck, cartella: Path, registro: str) -> dict:
    n_nodi = len(d.nodi)
    tag_a_id = {v: k for k, v in d.mappa_nodo.items()}
    per_caso: dict[str, dict] = {}
    for caso in d.casi:
        U = opensees._ultima_riga(cartella / f"{caso}_spostamenti.out", 6 * n_nodi).reshape(n_nodi, 6)
        R = opensees._ultima_riga(cartella / f"{caso}_reazioni.out", 6 * n_nodi).reshape(n_nodi, 6)
        per_caso[caso] = {
            "con_segno": True,
            "spostamenti": {str(tag_a_id[t]): [float(x) for x in U[t - 1]] for t in tag_a_id},
            "reazioni": {str(tag_a_id[t]): [float(x) for x in R[t - 1]] for t in d.vincolati},
            "sollecitazioni": _stazioni(d, caso, cartella),
        }
    verdetti = controlli(m, d, per_caso, registro)
    return {
        "run": {"id": uuid.uuid4().hex[:12], "data": _dt.datetime.now().isoformat(timespec="seconds"),
                "hash_modello": impronta(m), "versione_opensees": _versione(registro), "solutore": "OpenSees",
                "deck": str(d.percorso), "registro": str(cartella / opensees.NOME_REGISTRO),
                "carico_totale": d.carico_totale, "casi": d.casi,
                "mappa_tag": {"nodo": {str(k): v for k, v in d.mappa_nodo.items()},
                              "asta": {str(k): v for k, v in d.mappa_asta.items()}}},
        "per_caso": per_caso, "modi": [], "verdetti": verdetti,
    }


def _versione(registro: str) -> str | None:
    for riga in registro.splitlines():
        if "Version" in riga:
            return riga.strip()
    return None


def _esito(c: dict) -> str:
    if c.get("applicabile") is False:
        return "non_applicabile"
    return "passato" if c.get("passato") else "non_passato"


def _verdetto(controllo: str, c: dict, caso: str | None = None, ragione: str | None = None) -> dict:
    valori = {k: v for k, v in c.items() if k not in ("passato", "applicabile", "motivo", "controllo", "modello")}
    return {"controllo": controllo, "esito": _esito(c), "caso": caso,
            "ragione": ragione or c.get("motivo") or "", "valori": valori}


def controlli(m: Modello, d: _deck.Deck, per_caso: dict, registro: str) -> list[dict]:
    """I sette controlli di solve.py riletti nel verdetto a tre valori: uno per caso dove il caso conta."""
    v: list[dict] = []
    dimensione = float(np.linalg.norm(np.ptp(np.array(list(d.nodi.values())), axis=0)))
    for caso, dati in per_caso.items():
        reazioni = {int(k): tuple(x[:3]) for k, x in dati["reazioni"].items()}
        atteso = tuple(-x for x in d.carico_totale[caso])
        c = solve.controlla_reazioni(reazioni, atteso, solve._TOLLERANZA_REAZIONI)
        v.append(_verdetto("reazioni", c, caso, f"Σ reazioni {c['somma']} contro Σ carichi {atteso}, scarto {c['scarto_relativo']}"))
        u_max = max(float(np.linalg.norm(x[:3])) for x in dati["spostamenti"].values())
        c = solve.controlla_spostamenti(u_max, dimensione)
        v.append(_verdetto("spostamenti", c, caso, f"u_max = {u_max:.6g} mm su {dimensione:.6g} mm"))
    n = opensees.conta_avvisi(registro)
    v.append(_verdetto("avvisi", solve.controlla_avvisi(n), None, f"{n} WARNING nel registro"))
    for controllo in ("autovalori", "massa_modale"):
        v.append({"controllo": controllo, "esito": "non_applicabile", "caso": None,
                  "ragione": "nessuna analisi modale in questa corsa", "valori": {}})
    for controllo in ("picco", "vincolo_in_pianta"):
        v.append(_verdetto(controllo, solve.esito_non_applicabile(controllo, "telaio")))
    return v
```

Prima di eseguire: la riga `"N": -P if False else P` è una scrittura da togliere (lascia `"N": P` e verifica il segno con il test: N di compressione deve uscire negativo — nella trave appoggiata N ≈ 0, quindi aggiungi un'asserzione sul telaio 2×1: il pilastro 1 sotto peso proprio ha `N < 0` alla stazione 0). Anche l'espressione `abs(b[0]["My"] if False else ...)` nel test di indipendenza dei casi va semplificata in `min(b, key=...)["My"] < min(a, key=...)["My"]`.

- [ ] **Step 3: Sidecar: `verifica` e `corsa`**

```python
from nova import corsa as _corsa

def comando_verifica(req: dict) -> dict:
    return _corsa.verifica(req.get("solutore"))


def comando_corsa(req: dict, emetti) -> dict:
    m = _carica(req)
    t0 = time.perf_counter()
    emetti({"evento": "fase", "nome": "check model"})
    verdetti = _check.check_model(m)
    if _check.rifiutato(verdetti) and not req.get("forza"):
        return {"esito": "rifiutato", "verdetti_check": verdetti, "secondi": time.perf_counter() - t0}
    casi = req.get("casi") or _casi_delle_analisi(m)
    try:
        esito = _corsa.esegui(m, casi, Path(req.get("cartella") or "corsa"), req.get("solutore"), emetti)
    except ValueError as e:
        return {"esito": "errore", "fase": "deck", "motivo": str(e), "verdetti_check": verdetti, "secondi": time.perf_counter() - t0}
    esito["verdetti_check"] = verdetti
    return esito
```

(`import time` in testa; in `rispondi`: `if comando == "verifica": return comando_verifica(req)`, `if comando == "corsa": return comando_corsa(req, emetti)`.)

- [ ] **Step 4: Esegui**

Run: `/Users/mario/GitHub/NOVA/.venv/bin/python -m pytest /Users/mario/GitHub/NOVA/tests -v`
Expected: tutti `PASSED` con il binario nel PATH (`~/.local/bin/OpenSees`). Se `test_trave_appoggiata_momento_in_mezzeria` fallisce **solo per il segno** di `My`, metti `SEGNO_MY = -1.0` e scrivi nel commento la misura («misurato il 05/09/2026: il recorder rende My negativo con le fibre inferiori tese»). Se fallisce sul valore, il problema è l'`eleLoad` (proiezione nel locale) o `reset`: guarda `Z1_localforce.out` e confronta `Vz` all'estremo con `qL/2`.

- [ ] **Step 5: Commit**

```bash
git -C /Users/mario/GitHub/NOVA add nova/corsa.py nova/sidecar.py tests
git -C /Users/mario/GitHub/NOVA commit -F - <<'EOF'
feat(corsa): corsa OpenSees con risultati per stazione e controlli C3

Marcatore di fine come segnale, mai il codice d'uscita. Stazioni ai
punti di Lobatto da `section k force`, taglio dall'equilibrio con il
carico distribuito, reazioni sui soli nodi vincolati, sette verdetti a
tre valori con modale non applicabile finché non c'è.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01EdTcdzVMf1xmyTGxRwMKuN
EOF
```

---

### Task 6: Server FastAPI sottile e avvio

**Files:**
- Create: `nova/server.py`, `nova/__main__.py`, `static/index.html`, `tests/test_server.py`
- Modify: `README.md` (avvio: `uv run python -m nova`)

**Interfaces:**
- Consumes: `nova.sidecar.rispondi`.
- Produces:
  - `nova.server.SidecarInProcesso.chiedi(req: dict) -> list[dict]` (righe, eventi compresi) e `SidecarProcesso` (stesso metodo, su `python -m nova.sidecar` in sottoprocesso, una richiesta alla volta);
  - `nova.server.create_app(sidecar, cartella_corse: Path) -> FastAPI`;
  - rotte: `GET /api/salute` → `{"nova": versione, "solutore": <verifica>}`; `POST /api/check {modello}` → risposta finale del sidecar; `POST /api/corsa {modello, casi?}` → `{run_id, ...risposta finale}` con la corsa in `cartella_corse/<run_id>/`; `GET /api/risultati/{run_id}` → il JSON scritto; `POST /api/modello/apri {percorso}` → `{modello}`; `POST /api/modello/salva {percorso, modello}` → `{ok, impronta}`; `GET /` → `static/index.html`.

- [ ] **Step 1: Test (falliscono)**

```python
"""Rotte HTTP: il contratto vale sulla tratta, non sulla funzione (prior art: Tesi tests/test_server.py)."""
import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from conftest import leggi_fixture


@pytest.fixture
def cliente(tmp_path):
    from nova.server import SidecarInProcesso, create_app
    return TestClient(create_app(SidecarInProcesso(), tmp_path / "corse"), raise_server_exceptions=False)


def test_salute(cliente):
    r = cliente.get("/api/salute")
    assert r.status_code == 200 and "solutore" in r.json()


def test_check_passa_dal_sidecar(cliente):
    r = cliente.post("/api/check", json={"modello": leggi_fixture("nodo_libero.nova.json")})
    assert r.status_code == 200 and r.json()["esito"] == "rifiutato"


def test_check_con_modello_rotto_e_400_con_il_campo(cliente):
    m = leggi_fixture("telaio_2x1.nova.json"); m["aste"][0]["boh"] = 1
    r = cliente.post("/api/check", json={"modello": m})
    assert r.status_code == 400 and "boh" in r.json()["motivo"]


def test_apri_e_salva_fanno_il_giro(cliente, tmp_path):
    p = tmp_path / "t.nova.json"
    m = leggi_fixture("telaio_2x1.nova.json")
    r = cliente.post("/api/modello/salva", json={"percorso": str(p), "modello": m})
    assert r.status_code == 200 and r.json()["impronta"]
    r = cliente.post("/api/modello/apri", json={"percorso": str(p)})
    assert r.status_code == 200 and r.json()["modello"]["nodi"][0]["id"] == 1


def test_apri_un_file_che_non_esiste_e_404(cliente, tmp_path):
    r = cliente.post("/api/modello/apri", json={"percorso": str(tmp_path / "no.nova.json")})
    assert r.status_code == 404


def test_corsa_e_risultati(cliente, binario_opensees):
    r = cliente.post("/api/corsa", json={"modello": leggi_fixture("telaio_2x1.nova.json")})
    assert r.status_code == 200 and r.json()["esito"] == "ok"
    run_id = r.json()["run_id"]
    r2 = cliente.get(f"/api/risultati/{run_id}")
    assert r2.status_code == 200 and r2.json()["run"]["hash_modello"]


def test_la_radice_serve_la_pagina(cliente):
    assert cliente.get("/").status_code == 200
```

- [ ] **Step 2: `nova/server.py`**

```python
"""Il ponte sottile: HTTP davanti, righe JSON dietro. Nessuna logica di dominio qui."""
from __future__ import annotations

import json
import subprocess
import sys
import uuid
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

import nova
from nova import modello as _modello
from nova import sidecar as _sidecar

STATICI = Path(__file__).resolve().parent.parent / "static"


class SidecarInProcesso:
    def chiedi(self, req: dict) -> list[dict]:
        righe: list[dict] = []
        risposta = _sidecar.rispondi(req, righe.append)
        righe.append(risposta)
        return righe


class SidecarProcesso:
    """`python -m nova.sidecar` a vita lunga; una richiesta alla volta (ponytail: niente coda finché la UI è una sola)."""

    def __init__(self):
        self.p = subprocess.Popen([sys.executable, "-m", "nova.sidecar"], stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True, bufsize=1)
        self.n = 0

    def chiedi(self, req: dict) -> list[dict]:
        self.n += 1
        rid = self.n
        self.p.stdin.write(json.dumps({**req, "id": rid}) + "\n"); self.p.stdin.flush()
        righe: list[dict] = []
        while True:
            riga = self.p.stdout.readline()
            if not riga:
                righe.append({"esito": "errore", "fase": "sidecar", "motivo": "il sidecar ha chiuso lo stdout"})
                return righe
            d = json.loads(riga)
            if d.get("id") != rid:
                continue
            righe.append(d)
            if "evento" not in d:
                return righe


def _finale(righe: list[dict]) -> dict:
    return righe[-1]


def create_app(sidecar, cartella_corse: Path) -> FastAPI:
    app = FastAPI(title="NOVA")
    cartella_corse = Path(cartella_corse)
    cartella_corse.mkdir(parents=True, exist_ok=True)

    def _o_400(fin: dict) -> dict:
        if fin.get("esito") == "errore" and fin.get("fase") == "modello":
            raise HTTPException(400, detail=fin)
        return fin

    @app.get("/api/salute")
    def salute():
        return {"nova": nova.__version__, "solutore": _finale(sidecar.chiedi({"comando": "verifica"}))}

    @app.post("/api/check")
    def check(corpo: dict):
        return _o_400(_finale(sidecar.chiedi({"comando": "check", "modello": corpo.get("modello")})))

    @app.post("/api/corsa")
    def corsa(corpo: dict):
        run_id = uuid.uuid4().hex[:12]
        righe = sidecar.chiedi({"comando": "corsa", "modello": corpo.get("modello"), "casi": corpo.get("casi"),
                                "cartella": str(cartella_corse / run_id)})
        fin = _o_400(_finale(righe))
        return {"run_id": run_id, "fasi": [r["nome"] for r in righe if r.get("evento") == "fase"], **fin}

    @app.get("/api/risultati/{run_id}")
    def risultati(run_id: str):
        p = cartella_corse / run_id / "risultati.nova.risultati.json"
        if not p.is_file():
            raise HTTPException(404, detail=f"nessuna corsa {run_id}")
        return json.loads(p.read_text(encoding="utf-8"))

    @app.post("/api/modello/apri")
    def apri(corpo: dict):
        p = Path(corpo.get("percorso", ""))
        if not p.is_file():
            raise HTTPException(404, detail=f"{p} non esiste")
        try:
            m = _modello.carica(json.loads(p.read_text(encoding="utf-8")))
        except (ValueError, json.JSONDecodeError) as e:
            raise HTTPException(400, detail={"motivo": str(e)})
        return {"modello": m.model_dump(mode="json", exclude_none=True), "impronta": _modello.impronta(m)}

    @app.post("/api/modello/salva")
    def salva(corpo: dict):
        try:
            m = _modello.carica(corpo.get("modello"))
        except ValueError as e:
            raise HTTPException(400, detail={"motivo": str(e)})
        p = Path(corpo["percorso"])
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(json.dumps(m.model_dump(mode="json", exclude_none=True), ensure_ascii=False, indent=1), encoding="utf-8")
        return {"ok": True, "impronta": _modello.impronta(m)}

    @app.exception_handler(HTTPException)
    def _http(_, exc: HTTPException):
        corpo = exc.detail if isinstance(exc.detail, dict) else {"motivo": str(exc.detail)}
        return JSONResponse(status_code=exc.status_code, content=corpo)

    @app.get("/")
    def radice():
        return FileResponse(STATICI / "index.html")

    app.mount("/static", StaticFiles(directory=STATICI), name="static")
    return app
```

`nova/__main__.py`:

```python
"""`python -m nova`: server locale e browser."""
import threading
import webbrowser
from pathlib import Path

import uvicorn

from nova.server import SidecarProcesso, create_app

PORTA = 8765

if __name__ == "__main__":
    app = create_app(SidecarProcesso(), Path("corse"))
    threading.Timer(0.8, lambda: webbrowser.open(f"http://127.0.0.1:{PORTA}/")).start()
    uvicorn.run(app, host="127.0.0.1", port=PORTA, log_level="warning")
```

`static/index.html`: una pagina con titolo «NOVA», il testo «Interfaccia in costruzione (tappa T5). Il sidecar risponde su /api/salute.» e un `<pre id="salute">` riempito con `fetch("/api/salute")`. Tema chiaro: fondo `#dcdad5`, inchiostro `#141414`, font di sistema. Niente altro.

- [ ] **Step 3: Esegui**

Run: `/Users/mario/GitHub/NOVA/.venv/bin/python -m pytest /Users/mario/GitHub/NOVA/tests -v`
Expected: tutti `PASSED`. Poi `cd /Users/mario/GitHub/NOVA && .venv/bin/python -m nova` apre il browser su `http://127.0.0.1:8765/` con la pagina segnaposto e la risposta di `/api/salute`.

- [ ] **Step 4: Commit, push, PR**

```bash
git -C /Users/mario/GitHub/NOVA add nova/server.py nova/__main__.py static tests README.md
git -C /Users/mario/GitHub/NOVA commit -F - <<'EOF'
feat(server): ponte FastAPI sul sidecar e avvio da python -m nova

Rotte sottili: salute, check, corsa, risultati, apri/salva del modello.
Il sidecar gira in sottoprocesso a vita lunga; in test resta in memoria.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01EdTcdzVMf1xmyTGxRwMKuN
EOF
git -C /Users/mario/GitHub/NOVA push -u origin feat/sidecar-statica
```

PR `feat(sidecar): modello dati, Check Model, deck, corsa OpenSees, server` su `main` con il corpo che elenca gli oracoli verdi (equilibrio per caso, qL²/8, asta a lunghezza zero rifiutata, solutore finto) e i due numeri misurati (`_COLONNE_SEZIONE`, `SEGNO_MY`). Round di review pre-merge in parallelo: `security-reviewer` (input JSON da file e percorsi in `apri/salva`), `code-reviewer`, `test-writer` (con il `## Ingressi degeneri` del brief), `craft-reviewer` (README, messaggi).

---

## Self-review

**Spec coverage (T0+T1):** architettura a tre processi ✔ (Task 6); protocollo del sidecar con eventi di fase, `verifica|check|deck|corsa|fine`, errore che non uccide ✔ (Task 2, 5); modello dati con `extra="forbid"`, id interi, contatori, peso proprio generato, cinque carichi, combinazioni, analisi statica e modale nel formato ✔ (Task 2); impronta e risultati stantii lato dati ✔ (`hash_modello`); Check Model con dodici controlli + `carico_termico` ✔ (Task 3; `vincoli_dedotti` rinviato a T2, `armatura_mancante` a T4, dichiarato); deck con `fix` dichiarati, carichi oltre il peso proprio, casi per azione/combinazione, recorder per stazione ✔ (Task 4); risultati per corsa con `run`, `per_caso`, stazioni Lobatto, mappa tag ✔ (Task 5); sette controlli C3 a tre valori ✔ (Task 5); server HTTP sottile ✔ (Task 6). Fuori da questo piano, come da spec: modale e C2 (T2), importatore (T2), confronto (T3), non lineare e `danno` (T4), interfaccia (T5).

**Placeholder scan:** le due righe segnate come «da togliere» (`E_c = …` in `deck.py`, `"N": -P if False else P` in `corsa.py`) e il dubbio scritto nel test del carrello sono istruzioni esplicite con la risposta accanto, non buchi: l'esecutore le chiude nel passo in cui compaiono. `<incolla>` in `IMPRONTE.md` è un dato misurato dal comando dello stesso passo.

**Type consistency:** `chiedi` rende una lista per richiesta, l'ultima riga è la finale (usato uguale in tutti i test); `Deck.mappa_asta` ha chiavi `int` in memoria e `str` nel `resoconto`/`risultati` (JSON) — i test leggono `"1"`; `carico_totale` è per caso in `Deck` e ricopiato in `run` per l'oracolo dei test; `_Rifiuto` con `fase` ∈ {`modello`, `deck`}; i verdetti C1 hanno `azione`, i C3 hanno `caso` e `valori`.
