# NOVA T2 — modale con modi automatici, importatore dal prior, caso studio MURO 1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** una corsa che porta anche i modi (frequenze, forme, masse partecipanti) con il numero di modi che cresce da solo fino all'85 % NTC; un importatore che trasforma il prior `12_wall.json` di MeshRec in un modello NOVA (anche vuoto, con l'elenco delle scartate); il telaio di laboratorio MURO 1 come modello NOVA a mano dalle sezioni nominali, con statica e modale che girano.

**Architecture:** tutto dietro il protocollo del sidecar già in `main` (PR #21). La modale entra come blocco in coda al deck (`nova/deck.py`) e come lettura in `nova/corsa.py` (nuovo modulo `nova/modale.py` per il file `modalProperties`); il ciclo C2 «modi auto» sta nella corsa e rilancia il deck intero (una corsa costa 30 ms). L'importatore riusa **verbatim** `meshrec/core/telaio.py` (copiato da Tesi@`9716f6e` come gli altri, impronta in `IMPRONTE.md`) e traduce `Telaio` → `Modello` in `nova/importa.py`; comando `importa` del sidecar e rotta `/api/importa`. Il caso studio è un file `.nova.json` scritto a mano dalla scheda `docs/caso-studio/README.md`, con i test che lo fanno girare.

**Tech Stack:** come T1 (Python 3.12, pydantic v2, numpy, FastAPI, pytest; `OpenSees` 3.8.0 in `~/.local/bin`). Nessuna dipendenza nuova.

**Spec:** `docs/superpowers/specs/2026-09-05-nova-v1-design.md` — user story 43–45 (modale), 51–55 (importatore), «Modello dati», «Risultati per corsa» (`modi`), «Check Model (C1)» (`vincoli_dedotti`, C2), «Importatore dal prior», «Confronto» (i tre casi del deck), «Further Notes» (T2, fatti misurati). Scheda del caso studio: `docs/caso-studio/README.md` e `docs/caso-studio/corsa-ccx-2026-09-05.md`.

## Global Constraints

Valgono tutti quelli del piano T0+T1 (`docs/superpowers/plans/2026-09-05-t0-t1-scaffold-modello-sidecar-statica.md` §Global Constraints): unità `mm-N-MPa-t-s`, `g = 9806,65`, pydantic `extra="forbid"` + `allow_inf_nan=False`, il codice d'uscita non è il segnale, verdetto a tre valori, il sidecar non muore mai, copie di MeshRec verbatim con sha256, italiano, Conventional Commits con i trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` e `Claude-Session: https://claude.ai/code/session_01EdTcdzVMf1xmyTGxRwMKuN`, rami `feat/<slug>` + PR, test sul binario saltati senza `OpenSees`, percorsi assoluti. In più:

- **Soglia di massa partecipante 0,85** (NTC 2018 §7.3.3.1), non 0,90 della copia: `solve.controlla_massa_modale(masse, soglia=0.85)`.
- I verdetti C1 e C3 hanno la forma unica di `nova/check.py:_v` (chiavi `controllo, oggetto, stazione, caso, esito, ragione, articolo, valori, rimedio`).
- Il Check Model gira prima del deck; `forza: true` solo per le misure.
- `hash_modello` è l'impronta che `sidecar._carica` restituisce (prima del peso proprio), mai ricalcolata.
- Nessuna stringa libera del modello finisce nel `.tcl` (solo numeri, id, `caso` validato, `classe` validata da `FORMA_CLASSE` di `modello.py`).
- `meshrec/` non si modifica; `~/GitHub/Tesi` è sola lettura.
- Il tamponamento in muratura del MURO 1 **non** entra nel modello (decisione di Mario, 05/09/2026).

## Annotazione del controller (scritta al posto dell'architect, 05/09/2026 notte)

| Task | Subagente | Skill-gate | Sequenza |
|---|---|---|---|
| 1 modale | `backend-engineer` (opus: fisica e formati misurati) | true (TDD) | primo |
| 2 importatore | `backend-engineer` (opus: geometria e mapping) | true | dopo 1 (usa `corsa` con modale per il test sul sintetico) |
| 3 `vincoli_dedotti` | `backend-engineer` (sonnet) | true | dopo 2 (usa `importa.proposte_vincoli`) |
| 4 caso studio | `backend-engineer` (sonnet) | true | dopo 3 |

Tutto in sequenza su un ramo `feat/modale-importatore` da `main` @ `3921d10` (worktree `/Users/mario/GitHub/NOVA-wt/modale-importatore`). Round pre-merge a quattro (security su `importa` che legge un percorso dal corpo HTTP) e review finale come per T1.

Fatti già misurati che il piano usa (non riaprire): `opensees._passo_modale` scrive `recorder Node -file modo_{k}.out … "eigen {k}"`, `eigen N`, `modalProperties -print -file massa_modale.out -unorm`, `record` (`meshrec/core/opensees.py:495-511`); `opensees.leggi_frequenze(percorso)` legge la terza colonna del blocco `EIGENVALUE ANALYSIS` (`:813-850`), `opensees.leggi_massa_modale(percorso)` rende `{"catturata": [6], "disponibile": [100]*6}` dall'**ultima** riga del blocco `MASS RATIOS (%) (cumulative)` (`:765-810`); `solve.controlla_autovalori(frequenze_hz, soglia_relativa=0.2)` (`:466`), `solve.controlla_massa_modale(masse, soglia)` (`:954`, guarda solo x, y, z); `telaio.costruisci(prior, regioni)` (`9716f6e`, righe 287–415) vuole una `RegioneConfig(membratura=i, sezione=SezioneConfig(calcestruzzo_confinato, calcestruzzo_copriferro, acciaio: MaterialeDichiarato(material=Material(...), f_k=…), armatura=None))` per **ogni** membratura, solleva `ValueError` con zero membrature o senza `giunzioni`; `Telaio.nodi` (m,3) nelle coordinate della nuvola, `ElementoTelaio(membratura, stazione, nodo_i, nodo_j, sezione=(lungo e1, lungo e2), e1, e2, barre, riempimento_sezione)`, `Telaio.giunzioni[i]["nodo_telaio"]`/`["scostamento_nodo"]`; il prior sintetico ha 4 membrature × 20 fette = 80 aste, 4 giunzioni, `terna` 3×3 (righe = direzioni principali del pezzo, destrorsa), il prior vero (`lab_telaio_v2/12_wall.json`) ha `membrature: []`, `giunzioni: []`, `scartate` con 8 voci `{regione, punti, controlli_falliti: [...], esiti: {controllo: {passato, valore, soglia, unita, spiegazione}}}`; la corsa ccx del deck vero dà f1 = 21,0 Hz fuori piano, f2 = 34,0 Hz nel piano, massa 0,4331 t (`docs/caso-studio/corsa-ccx-2026-09-05.md`).

## File structure

```
meshrec/core/telaio.py            copia verbatim da Tesi@9716f6e (+ riga in meshrec/IMPRONTE.md)
nova/modale.py                    lettura di massa_modale.out (per modo e cumulata) e modo_k.out; ciclo C2
nova/deck.py                      blocco modale in coda: masse da azioni, eigen, modalProperties, recorder
nova/corsa.py                     `modi` nei risultati, verdetti autovalori/massa_modale, ciclo «auto»
nova/importa.py                   prior → Modello: rotazione, nodi, aste, sezioni «rilievo», scartate, proposte
nova/check.py                     `vincoli_dedotti` con oracolo (regola del piede)
nova/modello.py                   `Vincolo` esplicitamente libero (`{}`), `Nodo.vincolo` None = non dichiarato
nova/sidecar.py                   comando `importa`
nova/server.py                    POST /api/importa
docs/caso-studio/muro_1.nova.json il modello del caso studio (scritto a mano dalla scheda)
docs/caso-studio/README.md        §«Modello NOVA» con i numeri della corsa
tests/fixture/prior_vuoto/12_wall.json      copia del prior vero ridotta (scartate, zero membrature)
tests/fixture/prior_parziale/{genera.py,12_wall.json}   sintetico con 2 membrature scartate
tests/fixture/massa_modale_telaio_2x1.out   un file modalProperties vero, per i test senza binario
tests/test_modale.py, tests/test_importa.py, tests/test_caso_studio.py
```

---

### Task 1: Analisi modale con modi automatici (C2) e verdetti modali (C3)

**Files:**
- Create: `nova/modale.py`, `tests/test_modale.py`, `tests/fixture/massa_modale_telaio_2x1.out`
- Modify: `nova/deck.py` (blocco modale, `Deck.modale`), `nova/corsa.py` (`modi`, verdetti, ciclo auto), `nova/sidecar.py` (nessun comando nuovo: `corsa` porta la modale se il modello la dichiara), `tests/test_corsa_binario.py`

**Interfaces:**
- Consumes: `nova.modello.AnalisiModale(modi: int | "auto", masse_da_azioni: [{azione, coefficiente}])`, `Deck`, `Elemento`, `opensees._passo_modale`, `opensees.leggi_frequenze`, `opensees.leggi_massa_modale`, `opensees.NOME_MASSA_MODALE`, `solve.controlla_autovalori`, `solve.controlla_massa_modale`.
- Produces:
  - `nova.deck.scrivi(m, casi, cartella, modi: int | None = None) -> Deck` con `Deck.modi: int | None` e `Deck.massa_da_azioni: dict[int, tuple[float, float, float]]` (tag nodo → massa aggiunta [t] in x, y, z); quando `modi` è un intero il deck termina (dopo i casi statici e il `reset`) con le righe di `_passo_modale(modi, n_nodi)`; le masse da azioni vanno scritte come `mass tag mx my mz 0 0 0` accanto alle masse nodali (prima degli elementi);
  - `nova.modale.SOGLIA_MASSA = 0.85`; `nova.modale.leggi(cartella, modi, tag_a_id) -> list[dict]` → `[{"n", "f", "T", "forma": {id_nodo: [ux, uy, uz]}, "massa_partecipante": {"x","y","z"}, "cumulata": {"x","y","z"}}]` (frazioni 0–1, non percento);
  - `nova.modale.direzioni_con_massa(m: Modello) -> tuple[str, ...]`: le direzioni (`x`, `y`, `z`) in cui almeno un nodo ha il grado traslazionale libero; su un telaio piano con `uy` bloccato ovunque → `("x", "z")`;
  - `nova.modale.abbastanza(modi: list[dict], direzioni) -> bool`: cumulata dell'ultimo modo ≥ `SOGLIA_MASSA` su ogni direzione con massa;
  - `nova.modale.SCALA_MODI = (3, 6, 12, 24, 48)`: i tentativi di «auto», tetto = min(48, gradi liberi traslazionali);
  - `nova.corsa.esegui(...)`: se `m.analisi` contiene una `AnalisiModale`, dopo i casi statici la corsa porta `risultati["modi"]` e i verdetti `autovalori`, `massa_modale` reali (non più `non_applicabile`); con `modi: "auto"` la corsa ripete deck+lancio lungo `SCALA_MODI` finché `abbastanza`, e `run.modi_provati: [3, 6, ...]`;
  - eventi di fase: `"scrivo il deck e lancio OpenSees (modale, n modi)"` per ogni tentativo.

## Ingressi degeneri
- nessuna `AnalisiModale` nel modello → `modi: []`, `autovalori`/`massa_modale` `non_applicabile` come oggi, deck senza blocco modale (regressione: i 235 test di T1 restano verdi)
- `modi: 0` o negativo → rifiutato da pydantic (`Field(ge=1)` sull'intero), `fase: modello`
- `modi: 200` su un telaio con 24 gradi liberi → il deck chiede `min(modi, gradi_liberi)`; `eigen` oltre i gradi liberi fa fallire OpenSees, e il risultato dice quanti modi ha estratto davvero (`run.modi_richiesti`, `run.modi_estratti`)
- `modi: "auto"` su un telaio in cui 3 modi bastano → un solo tentativo, `run.modi_provati == [3]`
- `modi: "auto"` che non arriva all'85 % entro il tetto → `massa_modale: non_passato` con le frazioni per direzione, `run.modi_provati` con tutti i tentativi, nessuna eccezione, `esito: ok`
- `masse_da_azioni` che nomina un'azione inesistente → già `riferimenti: non_passato` in C1 (estendi il controllo: un test lo dimostra)
- `masse_da_azioni` con coefficiente `0` → nessuna riga `mass` aggiunta; con azione senza carichi → idem; con carico distribuito → massa = |w| · L / 2 / g sui due nodi di ogni elemento (solo la componente verticale z conta: NTC [2.5.7] parla di carichi gravitazionali) — dichiaralo nel docstring
- `masse_da_azioni` sull'azione di peso proprio generata → **rifiutato** in C1 `riferimenti` con ragione «il peso proprio è già massa (densità)»: contarlo due volte è l'errore che la story 44 vuole evitare
- direzione senza gradi liberi (telaio piano, `uy` bloccato ovunque) → esclusa da `abbastanza`; `massa_modale` guarda solo le direzioni con massa e lo dice nella ragione
- `massa_modale.out` assente dopo il marcatore → `errore fase solutore` che nomina il file; presente ma senza blocco cumulato → `modi: []` e `massa_modale: non_passato` «nessun modo estratto»
- `modo_k.out` con meno di `3·n_nodi` valori → `errore fase solutore` che nomina il file (`_ultima_riga` con `attesi`)
- prima frequenza ≈ 0 (nodo libero forzato con `forza: true`) → `autovalori: non_passato` (rapporto f1/f2 sotto 0,2), mai `passato`
- `forma` normalizzata da `-unorm` (spostamento massimo unitario): il test verifica `max |forma| == 1` sul modo 1 entro 1e-9

- [ ] **Step 1: Fixture del formato `modalProperties`**

Genera una volta il file vero: scrivi a mano (o con `deck.scrivi(..., modi=3)`) il deck del `telaio_2x1` con il blocco modale, lancialo con `/Users/mario/.local/bin/OpenSees` in una cartella temporanea, copia `massa_modale.out` in `tests/fixture/massa_modale_telaio_2x1.out`. Annota nel commento in testa a `nova/modale.py` le intestazioni trovate (blocchi `EIGENVALUE ANALYSIS`, `MASS RATIOS (%)` per modo, `MASS RATIOS (%) (cumulative)`; colonne `MODE MX MY MZ RMX RMY RMZ`), con la data. È una **misura**: le frequenze del telaio 2×1 vanno nel report.

- [ ] **Step 2: Test senza binario (falliscono)**

`tests/test_modale.py`:

```python
"""La modale: letture dal file di modalProperties, ciclo C2, forma dei risultati."""
from pathlib import Path

import numpy as np
import pytest

from conftest import FIXTURE, leggi_fixture
from nova import modale, modello


def test_leggi_frequenze_e_masse_dal_file_vero(tmp_path):
    (tmp_path / "massa_modale.out").write_bytes((FIXTURE / "massa_modale_telaio_2x1.out").read_bytes())
    n = 6
    for k in range(1, 4):  # forme finte: 3 valori per nodo, modo 1 con massimo unitario
        (tmp_path / f"modo_{k}.out").write_text(" ".join("1.0" if i == 0 else "0.5" for i in range(3 * n)) + "\n")
    modi = modale.leggi(tmp_path, 3, {t: t for t in range(1, n + 1)})
    assert [m["n"] for m in modi] == [1, 2, 3]
    assert modi[0]["f"] > 0 and modi[0]["T"] == pytest.approx(1 / modi[0]["f"])
    assert 0 <= modi[0]["massa_partecipante"]["x"] <= 1
    assert modi[2]["cumulata"]["x"] >= modi[0]["cumulata"]["x"]
    assert max(abs(v) for xyz in modi[0]["forma"].values() for v in xyz) == pytest.approx(1.0)


def test_senza_blocco_cumulato_nessun_modo(tmp_path):
    (tmp_path / "massa_modale.out").write_text("niente di utile\n")
    assert modale.leggi(tmp_path, 3, {1: 1}) == []


def test_modo_troncato_nomina_il_file(tmp_path):
    (tmp_path / "massa_modale.out").write_bytes((FIXTURE / "massa_modale_telaio_2x1.out").read_bytes())
    (tmp_path / "modo_1.out").write_text("1.0 0.0\n")
    with pytest.raises(ValueError, match="modo_1.out"):
        modale.leggi(tmp_path, 1, {t: t for t in range(1, 7)})


def test_direzioni_con_massa_su_telaio_piano():
    m = modello.carica(leggi_fixture("telaio_2x1.nova.json"))
    assert modale.direzioni_con_massa(m) == ("x", "z")


def test_abbastanza_guarda_solo_le_direzioni_con_massa():
    modi = [{"cumulata": {"x": 0.9, "y": 0.0, "z": 0.86}}]
    assert modale.abbastanza(modi, ("x", "z"))
    assert not modale.abbastanza(modi, ("x", "y", "z"))
    assert not modale.abbastanza([], ("x",))
```

Aggiungi in `tests/test_sidecar.py` (con `chiedi` e `tmp_path`, comando `deck`):

```python
def test_il_deck_modale_scrive_eigen_e_le_masse_da_azioni(chiedi, tmp_path):
    m = leggi_fixture("telaio_2x1.nova.json")
    m["analisi"].append({"tipo": "modale", "modi": 4, "masse_da_azioni": [{"azione": 1, "coefficiente": 0.3}]})
    (r,) = chiedi({"id": 1, "comando": "deck", "modello": m, "cartella": str(tmp_path)})
    assert r[-1]["esito"] == "ok"
    tcl = (tmp_path / "13_telaio.tcl").read_text()
    assert "eigen 4" in tcl and "modalProperties -print -file massa_modale.out -unorm" in tcl
    assert tcl.count('"eigen ') == 4
    # 0,3 · 12,5 N/mm · 9000 mm / g, metà per nodo, sui 4 nodi delle travi: l'x e l'y sono uguali allo z
    massa_tot = 0.3 * 12.5 * 9000 / 9806.65
    righe_mass = [x for x in tcl.splitlines() if x.startswith("mass ")]
    assert sum(float(x.split()[3]) for x in righe_mass) == pytest.approx(massa_tot, rel=1e-9)


def test_senza_modale_il_deck_non_ha_eigen(chiedi, tmp_path):
    (r,) = chiedi({"id": 1, "comando": "deck", "modello": leggi_fixture("telaio_2x1.nova.json"), "cartella": str(tmp_path)})
    assert "eigen" not in (tmp_path / "13_telaio.tcl").read_text()


def test_massa_dal_peso_proprio_generato_e_rifiutata(chiedi):
    m = leggi_fixture("telaio_2x1.nova.json")
    m["analisi"].append({"tipo": "modale", "modi": 3, "masse_da_azioni": [{"azione": 3, "coefficiente": 1.0}]})
    (r,) = chiedi({"id": 1, "comando": "check", "modello": m})
    v = next(v for v in r[-1]["verdetti"] if v["controllo"] == "riferimenti")
    assert v["esito"] == "non_passato" and "peso proprio" in v["ragione"]
```

(`azione: 3` è l'id che `assicura_peso_proprio` genera sul telaio 2×1: `contatori.azione = 2` → `Z3`. Verificalo con `casi_dichiarati`.)

Aggiungi in `tests/test_corsa_binario.py`:

```python
def test_la_modale_porta_i_modi_e_i_verdetti(chiedi, binario_opensees, tmp_path):
    m = leggi_fixture("telaio_2x1.nova.json")
    m["analisi"].append({"tipo": "modale", "modi": 3})
    (r,) = chiedi({"id": 1, "comando": "corsa", "modello": m, "cartella": str(tmp_path)})
    fin = r[-1]
    assert fin["esito"] == "ok"
    modi = fin["risultati"]["modi"]
    assert len(modi) == 3 and modi[0]["f"] < modi[1]["f"] < modi[2]["f"]
    assert set(modi[0]["forma"]) == {"1", "2", "3", "4", "5", "6"}
    esiti = {v["controllo"]: v["esito"] for v in fin["risultati"]["verdetti"]}
    assert esiti["autovalori"] == "passato"
    assert esiti["massa_modale"] in ("passato", "non_passato")  # 3 modi: il verdetto dice se bastano


def test_modi_auto_cresce_fino_all_85_per_cento(chiedi, binario_opensees, tmp_path):
    m = leggi_fixture("telaio_2x1.nova.json")
    m["analisi"].append({"tipo": "modale", "modi": "auto"})
    (r,) = chiedi({"id": 1, "comando": "corsa", "modello": m, "cartella": str(tmp_path)})
    fin = r[-1]
    assert fin["esito"] == "ok"
    provati = fin["risultati"]["run"]["modi_provati"]
    assert provati == sorted(provati) and provati[0] == 3
    ultimo = fin["risultati"]["modi"][-1]["cumulata"]
    esiti = {v["controllo"]: v["esito"] for v in fin["risultati"]["verdetti"]}
    if esiti["massa_modale"] == "passato":
        assert ultimo["x"] >= 0.85 and ultimo["z"] >= 0.85
    fasi = [x["nome"] for x in r if x.get("evento") == "fase"]
    assert sum("modale" in f for f in fasi) == len(provati)


def test_nodo_libero_forzato_ha_autovalori_non_passato(chiedi, binario_opensees, tmp_path):
    m = leggi_fixture("nodo_libero.nova.json")
    m["analisi"].append({"tipo": "modale", "modi": 3})
    (r,) = chiedi({"id": 1, "comando": "corsa", "modello": m, "cartella": str(tmp_path), "forza": True})
    fin = r[-1]
    assert fin["esito"] == "ok"
    esiti = {v["controllo"]: v["esito"] for v in fin["risultati"]["verdetti"]}
    assert esiti["autovalori"] == "non_passato"
```

- [ ] **Step 3: Verifica che falliscano**

Run: `/Users/mario/GitHub/NOVA-wt/modale-importatore/.venv/bin/python -P -m pytest tests/test_modale.py tests/test_sidecar.py -k "modale or peso_proprio_generato" -q`
Expected: FAIL (`ModuleNotFoundError: nova.modale`, `KeyError`/`AssertionError` sul deck).

- [ ] **Step 4: `nova/modale.py`**

```python
"""La modale: legge `modalProperties` e le forme, decide quando i modi bastano (C2).

Formato del file `massa_modale.out` misurato il <data> su OpenSees 3.8.0 (telaio 2×1):
<incolla le intestazioni trovate: EIGENVALUE ANALYSIS con MODE LAMBDA OMEGA FREQUENCY PERIOD;
MASS RATIOS (%) per modo e (cumulative), colonne MODE MX MY MZ RMX RMY RMZ>.
"""
from __future__ import annotations

from pathlib import Path

import numpy as np

from meshrec.core import opensees
from nova.modello import Modello

SOGLIA_MASSA = 0.85          # NTC 2018 §7.3.3.1 (la copia di MeshRec usa 0,90: EC8)
SCALA_MODI = (3, 6, 12, 24, 48)
_INTESTAZIONE_PER_MODO = "MASS RATIOS (%)"           # senza «(cumulative)»
_INTESTAZIONE_CUMULATA = opensees._INTESTAZIONE_CUMULATA


def _blocco(percorso: Path, intestazione: str, escludi: str | None = None) -> list[list[float]]:
    """Le righe numeriche (7 campi, il primo intero) sotto `intestazione`, fino alla prima riga non numerica."""
    righe: list[list[float]] = []
    dentro = False
    for riga in percorso.read_text(encoding="ascii", errors="ignore").splitlines():
        if intestazione in riga and (escludi is None or escludi not in riga):
            dentro, righe = True, []
            continue
        if not dentro:
            continue
        campi = riga.split()
        if len(campi) != 7 or not campi[0].isdigit():
            if righe:
                dentro = False
            continue
        righe.append([float(c) for c in campi[1:]])
    return righe


def leggi(cartella: Path, modi: int, tag_a_id: dict[int, int]) -> list[dict]:
    """I modi letti dalla cartella: frequenze da `leggi_frequenze`, masse per modo e cumulate dai
    due blocchi di `modalProperties`, forme da `modo_k.out` (3 valori per nodo, `-unorm`)."""
    cartella = Path(cartella)
    f_file = cartella / opensees.NOME_MASSA_MODALE
    frequenze = opensees.leggi_frequenze(f_file)
    per_modo = _blocco(f_file, _INTESTAZIONE_PER_MODO, escludi="cumulative")
    cumulate = _blocco(f_file, _INTESTAZIONE_CUMULATA)
    n = min(len(frequenze), len(per_modo), len(cumulate), modi)
    n_nodi = len(tag_a_id)
    modi_letti: list[dict] = []
    for k in range(1, n + 1):
        forma = opensees._ultima_riga(cartella / f"modo_{k}.out", 3 * n_nodi).reshape(n_nodi, 3)
        modi_letti.append({
            "n": k, "f": frequenze[k - 1], "T": (1.0 / frequenze[k - 1]) if frequenze[k - 1] > 0 else None,
            "forma": {str(tag_a_id[t]): [float(x) for x in forma[t - 1]] for t in tag_a_id},
            "massa_partecipante": dict(zip("xyz", (v / 100.0 for v in per_modo[k - 1][:3]))),
            "cumulata": dict(zip("xyz", (v / 100.0 for v in cumulate[k - 1][:3]))),
        })
    return modi_letti


def direzioni_con_massa(m: Modello) -> tuple[str, ...]:
    """Le direzioni in cui almeno un nodo ha il grado traslazionale libero."""
    libere = []
    for i, nome in enumerate("xyz"):
        if any(n.vincolo is None or not n.vincolo.gradi()[i] for n in m.nodi):
            libere.append(nome)
    return tuple(libere)


def abbastanza(modi: list[dict], direzioni) -> bool:
    if not modi:
        return False
    ultima = modi[-1]["cumulata"]
    return all(ultima[d] >= SOGLIA_MASSA for d in direzioni)


def gradi_liberi(m: Modello) -> int:
    """Tetto dei modi estraibili: i gradi traslazionali liberi (una massa lumped per direzione)."""
    return sum(3 if n.vincolo is None else sum(1 for g in n.vincolo.gradi()[:3] if not g) for n in m.nodi)
```

Se `_ultima_riga` solleva `ValueError` (file corto) il messaggio deve contenere il nome del file: verifica come lo compone `opensees._ultima_riga` e, se non lo nomina, rilancia `ValueError(f"{percorso.name}: {e}")`.

- [ ] **Step 5: Il deck**

In `nova/deck.py`:
- `scrivi(m, casi, cartella, modi: int | None = None)`; `Deck` guadagna `modi: int | None` e `massa_da_azioni: dict[int, tuple[float, float, float]]`.
- Prima delle righe `mass` dei nodi, calcola le masse da azioni: per ogni `AnalisiModale` in `m.analisi` (al più una: se sono due, `ValueError` «una sola analisi modale»), per ogni `MassaDaAzione` con coefficiente ≠ 0: azione = `m.azione(id)` (già validata da C1); carichi nodali → `massa = coeff · |Fz| / GRAVITA` sul nodo; distribuiti → `w` globale dell'azione sull'elemento (riusa la stessa proiezione di `_fattori`/`e.w`: qui serve il **solo** carico dell'azione, non del caso: calcolalo a parte con coefficiente 1 su `Z<id>`) → `massa = coeff · |wz| · L / 2 / GRAVITA` su `i` e `j` di ogni elemento; gravità (`CaricoGravita`) → `coeff · |fattore_z| · massa_lineare · L / 2` sui due nodi. Somma per tag; scrivi `mass tag mx my mz 0 0 0` con `mx = my = mz = massa` (la massa è scalare, la direzione la decide `eigen`).
- Dopo l'ultimo caso statico (dopo `reset`), se `modi` è un intero: `r += ["", "# ===== analisi modale ====="] + opensees._passo_modale(modi, n_nodi)`; poi il marcatore come oggi. Attenzione: `_passo_modale` scrive i recorder `modo_k.out` e chiede `record` e `remove recorders` — i recorder statici devono essere già rimossi (`remove recorders` dopo ogni caso, come già fai).
- `modi` effettivo = `min(modi, modale.gradi_liberi(m))` (importa `nova.modale` — nessun ciclo: `modale` importa solo `modello` e `opensees`).

- [ ] **Step 6: La corsa**

In `nova/corsa.py`:
- `esegui(m, casi, cartella, hash_modello, percorso_solutore=None, emetti=...)`: individua `an = next((a for a in m.analisi if a.tipo == "modale"), None)`. Se `None`: come oggi. Altrimenti `tentativi = [an.modi] if isinstance(an.modi, int) else [n for n in modale.SCALA_MODI if n <= max(3, modale.gradi_liberi(m))] or [3]`; per ogni `n`: `emetti({"evento": "fase", "nome": f"scrivo il deck e lancio OpenSees (modale, {n} modi)"})`, `_lancia(m, casi, cartella, n)` (estrai da `esegui` la parte deck+subprocess+marcatore in una funzione che rende `(d, registro)` o l'errore), leggi `risultati_da_uscite(...)` che ora chiama `modale.leggi(cartella, d.modi, tag_a_id)` e mette `modi`; se `an.modi == "auto"` e non `modale.abbastanza(modi, direzioni)` e non è l'ultimo tentativo → continua; altrimenti fine. `run["modi_richiesti"] = an.modi`, `run["modi_estratti"] = len(modi)`, `run["modi_provati"] = [...]`.
- `controlli(d, per_caso, registro, modi, direzioni)`: `autovalori` = `_verdetto("autovalori", solve.controlla_autovalori([x["f"] for x in modi]), ragione=...)`; `massa_modale` = `_verdetto("massa_modale", solve.controlla_massa_modale({"catturata": [100·cumulata x,y,z + 3 zeri], "disponibile": [100]*6} se modi else None, soglia=modale.SOGLIA_MASSA), ragione=f"cumulata {…} sulle direzioni con massa {direzioni}")`. Le direzioni senza massa: passa `disponibile = 0` su quella componente, così `controlla_massa_modale` la mette a `None` e non la conta (leggi `solve.py:954-1000`: `totale <= 0 → None`). `picco`/`vincolo_in_pianta` restano `non_applicabile`.
- `risultati_da_uscite` riceve `modi` (già letti) per non leggere due volte.

- [ ] **Step 7: Verifica**

Run: `/Users/mario/GitHub/NOVA-wt/modale-importatore/.venv/bin/python -P -m pytest tests -q`
Expected: tutti verdi, 0 warning. Nel report: le frequenze del telaio 2×1 a 3 e a N modi, `modi_provati` dell'auto, frazioni cumulate.

- [ ] **Step 8: Commit**

`feat(modale): analisi modale con modi automatici (C2) e verdetti autovalori e massa modale`

---

### Task 2: Importatore dal prior di MeshRec

**Files:**
- Create (copia verbatim): `meshrec/core/telaio.py` da `git -C /Users/mario/GitHub/Tesi show 9716f6e:meshrec/src/meshrec/core/telaio.py` (+ riga in `meshrec/IMPRONTE.md` con sha256 misurata; `tests/test_scaffold.py` aggiorna il conteggio a 6)
- Create: `nova/importa.py`, `tests/test_importa.py`, `tests/fixture/prior_vuoto/12_wall.json`, `tests/fixture/prior_parziale/genera.py`, `tests/fixture/prior_parziale/12_wall.json`
- Modify: `nova/sidecar.py` (comando `importa`, `COMANDI`), `nova/server.py` (`POST /api/importa`), `tests/test_sidecar.py`, `tests/test_server.py`

**Interfaces:**
- Consumes: `meshrec.core.telaio.costruisci(prior, regioni) -> Telaio`, `meshrec.core.config.{RegioneConfig, SezioneConfig, MaterialeDichiarato, Material}`, `nova.modello.*`, `nova.check.check_model`.
- Produces:
  - `nova.importa.importa(prior: dict, riferimento: str | None = None) -> Importato` (dataclass): `modello: Modello`, `scartate: list[dict]` (`{regione, punti, controllo, valore, soglia, unita, spiegazione}` una riga per ogni controllo fallito), `giunzioni: list[dict]` (`{nodo: id NOVA, scostamento_nodo, distanza_proiezione, cede, resta}`), `proposte_vincoli: list[dict]` (`{nodo: id, vincolo: {ux..rz tutti true}}`, dalla regola del piede di `opensees._al_piede`), `mancano: list[str]` (`["armature", "classe", "vincoli"]` quando ci sono aste; `[]` su prior vuoto), `resoconto: dict` (`membrature`, `aste`, `nodi`, `scartate`);
  - `nova.importa.MATRICE_TERNA(prior) -> np.ndarray (3,3)` e `nova.importa.ruota(prior, punti) -> np.ndarray`: coordinate nella terna del telaio: la direzione principale con l'estensione minima → `y` (fuori piano), fra le altre due quella più vicina alla `z` originale della nuvola → `z`, la terza → `x`; minimo di `x` e `z` all'origine, `y` **non** traslato (le quote fuori piano restano);
  - comando sidecar `importa {prior?: dict, percorso?: str}` → `{"esito": "ok", "modello", "scartate", "giunzioni", "proposte_vincoli", "mancano", "resoconto"}`; `percorso` inesistente → `errore fase importa`; prior senza `membrature`/`scartate`/`terna` → `errore fase importa` che nomina la chiave;
  - rotta `POST /api/importa {percorso}` → la risposta del sidecar (400 su `fase: importa`), il percorso non viene inoltrato a nulla che scriva.

Regole di traduzione (spec «Importatore dal prior»):
- un `ElementoTelaio` = un'`Asta` con `suddivisioni: 1`, `nome: f"membratura {k} fetta {s}"`, `origine: Origine(sorgente="rilievo", riferimento=riferimento, nota=f"riempimento {r:.2f}")`;
- ogni asta ha **la propria** `Sezione`: `b` = estensione lungo `e1` dell'elemento, `h` = lungo `e2`; `nome: f"rilievo m{k} s{s} {b:.0f}×{h:.0f}"`; `origine.nota: f"dispersione {sezione_dispersione}"`; `copriferro: 0`, `file: []`, `staffe: None` (nessuna armatura si inventa: `armatura_mancante` la nomina); `calcestruzzo`/`acciaio` → i due materiali di default;
- `rotazione_deg` dell'asta: l'angolo, attorno all'asse i→j, fra la `e2` che `deck._terna(asse, 0)` darebbe e la `e2` dell'elemento (ruotata anch'essa nella terna); misurato sul sintetico deve uscire ≈ 0 o ≈ 90 (le sezioni del sintetico sono allineate agli assi); un test lo pinza;
- materiali: `C25/30` e `B450C` con `origine.nota: "assunta: il rilievo non dice la classe"`;
- nodi: `Telaio.nodi` ruotati, id 1..m nell'ordine di `Telaio.nodi`, `vincolo: None` (non dichiarato); `origine.sorgente: "rilievo"`;
- `regioni` per `costruisci`: una `RegioneConfig(membratura=k, sezione=SezioneConfig(calcestruzzo_confinato=MD, calcestruzzo_copriferro=MD, acciaio=MD_acc, armatura=None))` per ogni membratura, con `MD = MaterialeDichiarato(material=Material(name="C25/30", young=E, poisson=nu, density=rho), f_k=25.0)` dai valori del catalogo (`materiali.trova("C25/30")`) — leggi `config.py:1308-1345` per i campi obbligatori di `MaterialeDichiarato` e `Material` (`config.py` copia: `class Material`);
- prior con zero membrature → `Modello(schema_version=1, unita=UNITA)` vuoto (accettato da `carica`), `scartate` piene, `mancano: []`, `proposte_vincoli: []` — **senza** chiamare `costruisci` (che solleva);
- prior con `scartate` e membrature → entrambe le liste piene;
- `contatori` coerenti con gli id assegnati.

## Ingressi degeneri
- prior vero `lab_telaio_v2/12_wall.json` ridotto (`tests/fixture/prior_vuoto`): 0 membrature, 8 scartate → `modello` vuoto che passa `carica`, `scartate` con 8+ righe ciascuna con `controllo` (`costanza_sezione`, …), `valore`, `soglia` presi da `esiti[controllo]`, nessuna eccezione
- prior sintetico → 80 aste, 80 sezioni, 4 membrature, nodi = `len(Telaio.nodi)` (misura: 4·21 − 4 unioni = 80? verifica e pinza il numero misurato), 4 giunzioni con `scostamento_nodo` finito, `mancano == ["armature", "classe", "vincoli"]`, e il modello importato passa `check_model` tranne `vincoli` (nessun vincolo dichiarato) → `rifiutato` con `vincoli: non_passato` e `armatura_mancante: non_applicabile`
- prior parziale (2 membrature tradotte, 2 scartate): 40 aste, `scartate` con 2 regioni, le giunzioni che nominano membrature scartate → **tolte** dal prior prima di `costruisci` (altrimenti `costruisci` solleva «nomina le membrature … ma il prior ne porta 2»), e riportate in `resoconto.giunzioni_scartate`
- `terna` assente o non 3×3 → `errore fase importa` che nomina `terna`; `membrature` assente → idem
- membratura con `sezioni_fette` a estensione nulla → `costruisci` solleva → `errore fase importa` con il messaggio di `telaio.py` (che nomina membratura e stazione), non traceback
- coordinate ruotate: sul sintetico `y` resta entro ±170 mm (gli spessori), `x` in [0, 1600 ± 20], `z` in [0, 2200 ± 20]; `min(x) == 0`, `min(z) == 0`, `y` non traslato (lo dimostra un nodo con `y ≠ 0`)
- il modello importato con i `proposte_vincoli` applicati (test: applicali a mano) e le sezioni com'è passa `check_model` e **gira** con il binario (statica sul peso proprio, `reazioni: passato`) — il rilievo è subito usabile in elastico (story 53)
- due chiamate a `importa` sullo stesso prior → stessa `impronta` del modello (determinismo)
- `percorso` che è una cartella o non JSON → `errore fase importa`, non `IsADirectoryError`
- `POST /api/importa` con `percorso` relativo → risolto rispetto alla cwd del server e riportato assoluto in `resoconto.percorso`; con `..` → lecito (è l'utente locale che apre il suo file), come `apri`

- [ ] **Step 1: Copia verbatim di `telaio.py` e fixture**

```bash
git -C /Users/mario/GitHub/Tesi show 9716f6e:meshrec/src/meshrec/core/telaio.py > /tmp/telaio.py && mv /tmp/telaio.py /Users/mario/GitHub/NOVA-wt/modale-importatore/meshrec/core/telaio.py
shasum -a 256 /Users/mario/GitHub/NOVA-wt/modale-importatore/meshrec/core/telaio.py
```
Aggiungi la riga a `meshrec/IMPRONTE.md`; `tests/test_scaffold.py` deve contare 6 impronte e importare `meshrec.core.telaio`.

`tests/fixture/prior_vuoto/12_wall.json`: dal prior vero, tieni `terna`, `centro`, `membrature: []`, `giunzioni: []`, `scartate` (tutte le 8 voci, ma **senza** liste di indici/punti lunghe: tieni `regione`, `punti`, `controlli_falliti`, `esiti`), `riscontri`, `chiusura_volume`; scrivi da dove viene in `tests/fixture/prior_vuoto/README.md` (run `lab_telaio_v2`, 02/09/2026, sha256 dell'originale).

`tests/fixture/prior_parziale/genera.py`: legge `../prior_sintetico/12_wall.json`, sposta le membrature 2 e 3 in `scartate` (`{regione: k, punti: voce["punti"], controlli_falliti: ["costanza_sezione"], esiti: {"costanza_sezione": {"passato": false, "valore": 0.31, "soglia": 0.15, "unita": "-", "spiegazione": "sintetico: scartata a mano per il test"}}}`), toglie dalle `giunzioni` quelle che le nominano, riscrive `regioni_trovate`, salva `12_wall.json` con `json.dumps(indent=1, sort_keys=True, allow_nan=False)`; il file generato si committa e un test verifica che rigenerandolo sia identico.

- [ ] **Step 2: Test (falliscono)**

`tests/test_importa.py`:

```python
"""L'importatore: dal prior di MeshRec al modello NOVA, anche quando il prior è vuoto."""
import json
import subprocess
import sys
from pathlib import Path

import numpy as np
import pytest

from conftest import FIXTURE
from nova import check, importa, modello

SINTETICO = FIXTURE / "prior_sintetico" / "12_wall.json"
VUOTO = FIXTURE / "prior_vuoto" / "12_wall.json"
PARZIALE = FIXTURE / "prior_parziale" / "12_wall.json"


def _prior(p: Path) -> dict:
    return json.loads(p.read_text(encoding="utf-8"))


def test_il_prior_vuoto_da_un_modello_vuoto_e_le_scartate():
    imp = importa.importa(_prior(VUOTO), riferimento="lab_telaio_v2")
    assert imp.modello.nodi == [] and imp.modello.aste == []
    assert len(imp.scartate) >= 8
    riga = next(s for s in imp.scartate if s["regione"] == 0)
    assert riga["controllo"] == "costanza_sezione" and riga["valore"] > riga["soglia"]
    assert imp.mancano == [] and imp.proposte_vincoli == []
    modello.carica(json.loads(imp.modello.model_dump_json()))  # riletto senza errori


def test_il_sintetico_da_80_aste_con_sezione_dal_rilievo():
    imp = importa.importa(_prior(SINTETICO), riferimento="prior_sintetico")
    m = imp.modello
    assert len(m.aste) == 80 and len(m.sezioni) == 80
    assert all(a.origine.sorgente == "rilievo" for a in m.aste)
    assert all(s.origine.sorgente == "rilievo" and s.file == [] for s in m.sezioni)
    assert imp.mancano == ["armature", "classe", "vincoli"]
    assert len(imp.giunzioni) == 4 and all(np.isfinite(g["scostamento_nodo"]) for g in imp.giunzioni)
    assert imp.resoconto["nodi"] == len(m.nodi)  # pinza il numero misurato nel report


def test_le_coordinate_sono_nella_terna_del_telaio():
    m = importa.importa(_prior(SINTETICO)).modello
    x = np.array([n.x for n in m.nodi]); y = np.array([n.y for n in m.nodi]); z = np.array([n.z for n in m.nodi])
    assert x.min() == pytest.approx(0.0, abs=1e-6) and z.min() == pytest.approx(0.0, abs=1e-6)
    assert 1580 <= x.max() <= 1620 and 2180 <= z.max() <= 2220
    assert np.abs(y).max() <= 170 and np.abs(y).max() > 0  # fuori piano conservato, non traslato


def test_la_rotazione_delle_sezioni_e_zero_o_novanta():
    m = importa.importa(_prior(SINTETICO)).modello
    for a in m.aste:
        r = abs(a.rotazione_deg) % 180
        assert min(r, abs(r - 90), abs(r - 180)) < 2.0, a.nome


def test_il_check_model_dice_cosa_manca():
    imp = importa.importa(_prior(SINTETICO))
    v = {x["controllo"]: x for x in check.check_model(imp.modello)}
    assert v["vincoli"]["esito"] == "non_passato"
    assert v["armatura_mancante"]["esito"] == "non_applicabile" and len(v["armatura_mancante"]["oggetto"]) == 80
    assert v["nodi_coincidenti"]["esito"] == "passato" and v["aste_sconnesse"]["esito"] == "passato"


def test_con_i_vincoli_proposti_il_modello_passa_il_check():
    imp = importa.importa(_prior(SINTETICO))
    dati = json.loads(imp.modello.model_dump_json(exclude_none=True))
    for p in imp.proposte_vincoli:
        next(n for n in dati["nodi"] if n["id"] == p["nodo"])["vincolo"] = p["vincolo"]
    m = modello.assicura_peso_proprio(modello.carica(dati))
    assert not check.rifiutato(check.check_model(m))
    assert len(imp.proposte_vincoli) >= 2  # i due montanti poggiano


def test_il_parziale_traduce_due_e_scarta_due():
    imp = importa.importa(_prior(PARZIALE))
    assert len(imp.modello.aste) == 40 and {s["regione"] for s in imp.scartate} == {2, 3}
    assert imp.resoconto["giunzioni_scartate"] >= 1


def test_il_parziale_e_riproducibile():
    atteso = PARZIALE.read_bytes()
    out = subprocess.run([sys.executable, str(PARZIALE.parent / "genera.py"), "--stdout"], capture_output=True, check=True)
    assert out.stdout == atteso


@pytest.mark.parametrize("chiave", ["terna", "membrature"])
def test_senza_una_chiave_l_errore_la_nomina(chiave):
    p = _prior(SINTETICO); del p[chiave]
    with pytest.raises(ValueError, match=chiave):
        importa.importa(p)


def test_due_import_stesso_prior_stessa_impronta():
    a = importa.importa(_prior(SINTETICO)).modello; b = importa.importa(_prior(SINTETICO)).modello
    assert modello.impronta(a) == modello.impronta(b)
```

In `tests/test_corsa_binario.py`:

```python
def test_il_rilievo_importato_gira_in_elastico(chiedi, binario_opensees, tmp_path):
    imp = importa.importa(json.loads((FIXTURE / "prior_sintetico" / "12_wall.json").read_text()))
    dati = json.loads(imp.modello.model_dump_json(exclude_none=True))
    for p in imp.proposte_vincoli:
        next(n for n in dati["nodi"] if n["id"] == p["nodo"])["vincolo"] = p["vincolo"]
    (r,) = chiedi({"id": 1, "comando": "corsa", "modello": dati, "cartella": str(tmp_path)})
    fin = r[-1]
    assert fin["esito"] == "ok", fin
    esiti = {v["controllo"]: v["esito"] for v in fin["risultati"]["verdetti"] if v["caso"]}
    assert all(e == "passato" for c, e in esiti.items() if c == "reazioni")
```

In `tests/test_sidecar.py` (comando `importa` con `prior` inline e con `percorso`), e in `tests/test_server.py` (`POST /api/importa` con percorso della fixture → 200 con `mancano`; inesistente → 400 `fase: importa`).

- [ ] **Step 3: `nova/importa.py`** — scrivi seguendo le regole di traduzione sopra; la rotazione:

```python
def matrice_terna(prior: dict) -> np.ndarray:
    """Righe = (x, y, z) del telaio nelle coordinate della nuvola.

    La terna del prior porta le direzioni principali del pezzo; quella con l'estensione minima
    dei nodi è il fuori piano (y). Fra le altre due, la più vicina alla z della nuvola è la z
    del telaio (il rilievo è fatto con il pezzo in piedi); la terza è x, e il verso di x si
    sceglie perché (x, y, z) sia destrorsa.
    """
```
Misura le estensioni **proiettando i nodi del Telaio** su ciascuna direzione della terna (non fidarti dell'ordine delle righe: la SVD ordina per varianza, e su un telaio alto e stretto la prima riga è la verticale — sul sintetico la riga 0 è ≈ (0,013, 0, 0,9999)).

- [ ] **Step 4: Sidecar e server** — `comando_importa(req)`: `prior = req.get("prior")` o `json.loads(Path(percorso).read_text())` (`OSError`/`ValueError` → `_Rifiuto("importa", …)`); `importa.importa(prior, riferimento=percorso o "prior")` (`ValueError` → `_Rifiuto("importa", …)`); risposta con `modello` = `model_dump(exclude_none=True)`. `COMANDI` guadagna `"importa"` (aggiorna il test del comando sconosciuto). Server: `ImportaReq(percorso: str)`, `POST /api/importa` → `_o_400` con `fase: importa` → 400.

- [ ] **Step 5: Verifica e commit**

Run: suite completa. Expected: verde, 0 warning. Report: numero di nodi del sintetico, angoli di rotazione trovati, estensioni x/y/z misurate, frequenze del rilievo importato se hai lanciato anche la modale.

`feat(importa): importatore dal prior di MeshRec con scartate, giunzioni e vincoli proposti`

---

### Task 3: `vincoli_dedotti` in C1 e vincolo esplicitamente libero

**Files:**
- Modify: `nova/check.py` (`vincoli_dedotti` con oracolo), `nova/modello.py` (docstring di `Nodo.vincolo`: `None` = non dichiarato, `{}` = dichiarato libero), `nova/importa.py` (esporta `piedi(m) -> list[int]` riusata dal check), `tests/test_sidecar.py`

**Interfaces:**
- Consumes: `nova.importa.piedi(m: Modello) -> list[int]` (id dei nodi al piede dalla regola di `opensees._al_piede`: trave di fondazione + piedi dei montanti; implementata sui nodi/aste NOVA, non sul `Telaio`).
- Produces: verdetto `vincoli_dedotti`: `passato` se ogni nodo al piede ha `vincolo` dichiarato (anche `{}` = libero, è una scelta); `non_passato` con `oggetto` = i nodi al piede con `vincolo: None`, `rimedio: "conferma i vincoli proposti al piede"`, `valori: {"proposti": [...]}`; `non_applicabile` su modello senza aste.

## Ingressi degeneri
- `telaio_2x1` (base incastrata) → `vincoli_dedotti: passato` (regressione: la fixture non cambia)
- nodo al piede con `vincolo: {}` esplicito → `passato` (è dichiarato libero: la scelta è dell'utente; `vincoli` C1 può comunque bocciare se nessun nodo è vincolato)
- nodo al piede con `vincolo: null` → `non_passato` con l'id e i gradi proposti
- sbalzo: l'estremo libero di un traverso che sta più in basso della sua radice → **non** è un piede (regola 2 di `_al_piede`: da lì la struttura non sale)
- trave di fondazione inclinata di 0,5° (nodi a quote diverse di pochi mm) → tutti i suoi nodi sono piedi (regola 1: si cammina lungo le aste coricate), non solo il più basso
- modello senza aste → `non_applicabile`
- il rilievo importato (Task 2) senza vincoli → `vincoli_dedotti: non_passato` con `valori.proposti == importa(...).proposte_vincoli`

Step: test rossi (`tests/test_sidecar.py`, comando `check` su varianti del `telaio_2x1` e sul sintetico importato) → `importa.piedi` → `check.py` → verde → commit `feat(check): vincoli dedotti dalla regola del piede, vincolo esplicitamente libero`.

---

### Task 4: Caso studio MURO 1 — modello a mano dalle sezioni nominali

**Files:**
- Create: `docs/caso-studio/muro_1.nova.json`, `tests/test_caso_studio.py`
- Modify: `docs/caso-studio/README.md` (§«Modello NOVA» con i numeri della corsa e le assunzioni)

**Il modello** (unità mm, N; da `docs/caso-studio/README.md`, tutto **[V]** dalla tavola salvo le assunzioni marcate):
- nodi: 1 `(0, 0, 0)`, 2 `(2262, 0, 0)` — sommità delle zapatas, **incastrati** (`ux uy uz rx ry rz`; le zapatas non si modellano: nota); 3 `(0, 0, 1607.5)`, 4 `(2262, 0, 1607.5)` — asse della trave superiore (1520 netti + 175/2); tutti i nodi con `uy` e `rx`, `rz` bloccati **solo se** serve al telaio piano: no — il telaio è 3D con `y` fuori piano, i nodi 3 e 4 restano liberi (la modale trova anche i modi fuori piano, come ccx: f1 = 21 Hz fuori piano);
- aste: 1 = 1→2 trave di fondazione, sezione «viga inferior» 250×250, `suddivisioni: 4`; 2 = 1→3 e 3 = 2→4 pilastri 172×172, `suddivisioni: 4`; 4 = 3→4 trave superiore 140×175 (b = 140 fuori piano, h = 175), `suddivisioni: 4`;
- sezioni (copriferro assunto 20; 25 per la trave di fondazione): pilastro `172×172`, 4Ø12 come `inf: 2Ø12` + `sup: 2Ø12`, staffe Ø4/35 (`bracci: 2`); trave superiore `140×175`, `sup: 2Ø10`, `inf: 2Ø8`, staffe Ø4/40; trave di fondazione `250×250`, `inf: 3Ø16`, `sup: 3Ø16`, staffe Ø8/100;
- materiali: 1 `C25/30` **personalizzato** con `valori: {"E": 31500, "nu": 0.2, "densita": 2.5493e-9}` (i valori del deck `wall_model.inp`, spec #11: il confronto usa gli stessi), `origine.nota: "assunta: la tavola non dichiara la classe; E, ν, ρ dal deck di MeshRec"`; 2 `B450C` (nota «assunto»);
- azioni (`assicura_peso_proprio` salta la generazione se un'azione ha già `generata: true`, `modello.py:349-357`; `natura: "Q"` vuole una `categoria` qualunque non vuota, `modello.py:200-204`): azione 1 «peso proprio» `natura: "G1"`, `generata: true`, `carichi: [{"tipo": "gravita", "fattore_z": -1}]` — dichiarata nel file così i casi restano `Z1, Z2, Z3` senza un `Z4` generato; azione 2 «spinta 0,1 g» `natura: "Q"`, `categoria: "spinta orizzontale"`, `carichi: [{"tipo": "gravita", "fattore_x": 0.10}]` — la spinta laterale **nel piano** (nel deck ccx è lungo `y` del solido, che è il piano del muro); azione 3 «carico in sommità» `natura: "Q"`, `categoria: "prova"`, `carichi: [{"tipo": "distribuito", "asta": 4, "direzione": "z", "q": -1200/2262}]` (1 200 N spalmati sulla trave superiore, come la faccia `TOP` del solido; usa i nomi di campo di `CaricoDistribuito` in `modello.py`);
- combinazioni: `C1` = 1,0·Z1 («GRAVITA»), `C2` = 1,0·Z1 + 1,0·Z2 («SPINTA_ORIZZONTALE»), `C3` = 1,0·Z1 + 1,0·Z3 («CARICO_TOP») — gli stessi tre passi del deck ccx;
- analisi: `statica` `["C1", "C2", "C3"]`; `modale` `"auto"`;
- `origine` (il `Modello` non ha un campo `origine`: va sui nodi 1 e 2 e nel README): `{"sorgente": "utente", "riferimento": "muro_1.pdf", "nota": "interasse dall'alzado (2262); la pianta dice 2000, da confermare con Mario"}`.

**Interfaces:** nessuna nuova. Il test usa `chiedi` + `binario_opensees` sul file in `docs/caso-studio/`.

## Ingressi degeneri
- il file passa `carica` con `extra="forbid"` (ogni chiave è del modello dati) e `check_model` senza `non_passato`; `armatura_mancante: non_applicabile` con `oggetto: None` (tutte le sezioni hanno barre)
- `casi_dichiarati` = `Z1, Z2, Z3, C1, C2, C3` e la corsa gira sui tre `C` senza `Z4` generato
- equilibrio su `C1`: Σ Rz = massa · g con la massa del telaio = Σ (area lorda · ρ + barre · ρ_s) · L — calcola a mano in test il valore atteso dalle sezioni nominali (pilastri 2 × 172² × 1607,5, trave 140 × 175 × 2262 (netta 2090? l'asse è 2262: dichiara la scelta), fondazione 250² × 2262) e confrontalo con `carico_totale` e con Σ reazioni entro 1e-6 relativo
- `C2`: Σ Rx = −0,10 · Σ Rz(C1) (la spinta è 0,1 g della massa del telaio), `C3`: Σ Rz = Σ Rz(C1) + 1 200
- la massa del telaio NOVA contro 0,4331 t del solido ccx: lo **scarto** si riporta nel README (le zapatas non ci sono, la trave di fondazione è per intero), nessun assert sul valore — è la prima riga della tabella di confronto di T3
- modale auto: `run.modi_provati` finisce con `massa_modale: passato` sulle direzioni con massa (x, y, z tutte libere ai nodi 3 e 4); `f` del primo modo **nel piano** (forma con `ux` dominante ai nodi 3-4) riportata nel README accanto ai 34,0 Hz di ccx, senza assert di vicinanza (T3 fa il confronto); assert che esista un modo con `ux` dominante e uno con `uy` dominante fra i primi 3
- `spostamenti: passato` su tutti i casi (nessuna unità sbagliata)

Step: fixture → test rossi → (nessun codice nuovo atteso: se serve un fix, è un finding sul core) → verde → README §«Modello NOVA» con: geometria scelta, assunzioni (copriferri, classi, interasse, asse della trave superiore, carico in sommità distribuito), tabella «massa telaio NOVA | massa solido ccx», reazioni per caso, primi 3 modi con la direzione dominante e i 21,0/34,0/42,8 Hz di ccx accanto **con la scritta «verifica del codice, non validazione»** → commit `docs(caso-studio): modello NOVA del MURO 1 dalle sezioni nominali, statica e modale`.

---

## Self-review

- Spec coverage: story 43 (auto 85 %) → Task 1; 44 (masse da azioni) → Task 1; 45 (modi animati) → T5 UI, fuori piano; 51–55 → Task 2 (51 vuoto+scartate, 52 fette→aste con sezione rilievo e giunzioni con scostamento, 53 classe assunta + ghost + mancano, 54 rotazione, 55 `origine.modificata` esiste dal modello dati, l'editing è T5); `vincoli_dedotti` → Task 3; T2 «caso studio a mano dalle nominali» → Task 4; «Confronto» prepara i tre casi identici al deck ccx → Task 4.
- Placeholder: lo Step 1 di Task 1 chiede una misura (intestazioni del file) e lo dice; il numero di nodi del sintetico è «da pinzare dopo la misura»; il nome della categoria di `Q` in Task 4 va letto da `modello.py:Azione` — sono misure dichiarate, non TBD.
- Coerenza: `Deck.modi`, `modale.leggi(cartella, modi, tag_a_id)`, `corsa.esegui` con `hash_modello` posizionale come in `main` (`corsa.py:76`), `importa.importa(prior, riferimento)` e `importa.piedi(m)` usati da Task 3 con lo stesso nome.
