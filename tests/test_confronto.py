"""La tabella di confronto telaio ↔ solido, il CSV Abaqus, l'export.

Ogni test è ancorato a una riga di «Ingressi degeneri» del brief Task 2; la mappa
riga → test sta nel report. Due dict scritti a mano per il grosso dei casi
(nessuna corsa vera da lanciare per provare una guardia), un test end-to-end
con una corsa vera del telaio 2×1 e una del solido `trave.inp` — che non hanno
senso fisico insieme: è un test del codice, non una validazione fisica.
"""
from __future__ import annotations

import csv
import json
import stat
from pathlib import Path

import pytest

from conftest import FIXTURE, leggi_fixture
from nova import confronto as _confronto

ABAQUS_CSV = FIXTURE / "abaqus_esempio.csv"


# --- fixture: telaio e solido scritti a mano ---------------------------------

def _telaio(casi=("Z1", "Z2", "Z3"), carico_totale=None, per_caso=None, modi=None,
            nodi=("1", "2", "3", "4")) -> dict:
    carico_totale = carico_totale if carico_totale is not None else {
        "Z1": [0.0, 0.0, 0.0], "Z2": [20000.0, 0.0, 0.0], "Z3": [0.0, 0.0, -1000.0],
    }
    per_caso = per_caso if per_caso is not None else {
        "Z2": {"spostamenti": {"4": [5.0, 0.0, 0.1, 0, 0, 0]},
               "reazioni": {"1": [-20000.0, 0.0, 0.0, 0, 0, 0]}, "sollecitazioni": {}},
        "Z3": {"spostamenti": {"4": [0.2, 0.0, -0.05, 0, 0, 0]},
               "reazioni": {"1": [0.0, 0.0, 1000.0, 0, 0, 0]}, "sollecitazioni": {}},
    }
    return {
        "run": {"id": "telaio-abc123", "data": "2026-09-06T00:00:00", "hash_modello": "hash",
                "versione_opensees": "Version 3.8.0", "solutore": "OpenSees", "deck": "13_telaio.tcl",
                "registro": "log.txt", "carico_totale": carico_totale, "casi": list(casi),
                "mappa_tag": {"nodo": {n: int(n) for n in nodi}, "asta": {}}},
        "per_caso": per_caso,
        "modi": modi if modi is not None else [
            {"n": 1, "f": 5.0, "T": 0.2, "forma": {"4": [1.0, 0.01, 0.0]},
             "massa_partecipante": {"x": 0.7, "y": 0.0, "z": 0.0},
             "cumulata": {"x": 0.7, "y": 0.0, "z": 0.0}},
            {"n": 2, "f": 8.0, "T": 0.125, "forma": {"4": [0.02, 0.0, 1.0]},
             "massa_partecipante": {"x": 0.0, "y": 0.0, "z": 0.6},
             "cumulata": {"x": 0.7, "y": 0.0, "z": 0.6}},
        ],
        "verdetti": [],
    }


def _solido(massa=0.5, passi=None, modi=None) -> dict:
    passi = passi if passi is not None else {
        "GRAVITA": {"reazioni_somma": [0.0, 0.0, 4900.0], "n_reazioni": 4,
                   "u_set": {"TOP": {"max": [0.0, 0.0, -0.06], "medio": [0.0, 0.0, -0.05]}}},
        "SPINTA_ORIZZONTALE": {"reazioni_somma": [-19500.0, 0.0, 0.0], "n_reazioni": 4,
                               "u_set": {"TOP": {"max": [5.2, 0.0, 0.0], "medio": [5.1, 0.0, 0.0]}}},
    }
    return {
        "run": {"id": "solido-xyz789", "data": "2026-09-06T00:00:00", "solutore": "CalculiX",
                "versione": "CalculiX Version 2.22, Copyright(C) 1998-2024", "deck": "solido.inp",
                "sha256_deck": "f" * 64, "registro": "ccx_stdout.log", "g": 9810.0,
                "n_nodi": 100, "n_elementi": 300, "tipo_elemento": "C3D4", "volume": 2e7,
                "quota_vincolati": 1e-3},
        "massa": massa, "passi": passi,
        "modi": modi if modi is not None else [
            {"f": 20.0, "massa_partecipante": {"x": 0.65, "y": 0.0, "z": 0.0},
             "cumulata": {"x": 0.65, "y": 0.0, "z": 0.0}},
            {"f": 33.0, "massa_partecipante": {"x": 0.0, "y": 0.0, "z": 0.55},
             "cumulata": {"x": 0.65, "y": 0.0, "z": 0.55}},
        ],
        "verdetti": [],
    }


MAPPA = {"Z2": "SPINTA_ORIZZONTALE", "Z3": "GRAVITA", "nodi_sommita": [4]}


def _riga(tabella, grandezza, caso=None):
    return next(r for r in tabella.righe if r.grandezza == grandezza and r.caso == caso)


# --- classe() -----------------------------------------------------------------

def test_classe_concorde_vicino_lontano_non_confrontabile():
    assert _confronto.classe(0.0) == "concorde"
    assert _confronto.classe(0.05) == "concorde"
    assert _confronto.classe(0.06) == "vicino"
    assert _confronto.classe(0.20) == "vicino"
    assert _confronto.classe(0.21) == "lontano"
    assert _confronto.classe(None) == "non_confrontabile"


# --- leggi_csv ------------------------------------------------------------------

def test_leggi_csv_legge_le_tre_righe_e_la_virgola_decimale():
    righe = _confronto.leggi_csv(ABAQUS_CSV)
    assert len(righe) == 3
    prima = righe[0]
    assert prima == {"caso": "GRAVITA", "grandezza": "reazione_z", "valore": pytest.approx(4250.1),
                     "unita": "N", "fonte": "Abaqus 2024 su Windows, 02/09/2026"}


def test_leggi_csv_fonte_vuota_diventa_punto_interrogativo():
    righe = _confronto.leggi_csv(ABAQUS_CSV)
    ultima = righe[-1]
    assert ultima["grandezza"] == "u_sommita_z" and ultima["fonte"] == "?"


def test_leggi_csv_intestazione_diversa_nomina_le_cinque_colonne(tmp_path):
    p = tmp_path / "male.csv"
    p.write_text("case,quantity,value,unit,source\nA,b,1,N,x\n", encoding="utf-8")
    with pytest.raises(ValueError) as e:
        _confronto.leggi_csv(p)
    for colonna in ("caso", "grandezza", "valore", "unita", "fonte"):
        assert colonna in str(e.value)


def test_leggi_csv_valore_non_numerico_nomina_la_riga(tmp_path):
    p = tmp_path / "guasto.csv"
    p.write_text("caso;grandezza;valore;unita;fonte\nGRAVITA;massa;boh;t;x\n", encoding="utf-8")
    with pytest.raises(ValueError) as e:
        _confronto.leggi_csv(p)
    assert "riga 2" in str(e.value)


# --- confronta: la prima riga è sempre la massa --------------------------------

def test_prima_riga_e_sempre_la_massa():
    tabella = _confronto.confronta(_telaio(), _solido(), None, MAPPA)
    assert tabella.righe[0].grandezza == "massa"


def test_massa_dal_carico_totale_del_caso_di_solo_peso_individuato_da_z_piu_alto():
    """Nessun `mappa_casi["gravita"]` dichiarato: si prende lo `Z<id>` più alto, che è
    quello che `assicura_peso_proprio` genera per ultimo (`nova/modello.py:372`)."""
    telaio = _telaio(carico_totale={"Z1": [0.0, 0.0, -500.0], "Z9": [0.0, 0.0, -2000.0]},
                     casi=("Z1", "Z9"))
    tabella = _confronto.confronta(telaio, _solido(), None, {"nodi_sommita": [4]})
    riga = _riga(tabella, "massa")
    assert riga.telaio == pytest.approx(2000.0 / _confronto.GRAVITA)


def test_massa_dichiarata_con_mappa_casi_gravita():
    telaio = _telaio(carico_totale={"Z1": [0.0, 0.0, -500.0], "Z9": [0.0, 0.0, -2000.0]},
                     casi=("Z1", "Z9"))
    tabella = _confronto.confronta(telaio, _solido(), None, {"gravita": "Z1", "nodi_sommita": [4]})
    riga = _riga(tabella, "massa")
    assert riga.telaio == pytest.approx(500.0 / _confronto.GRAVITA)


def test_bias_atteso_e_fisso_per_grandezza():
    tabella = _confronto.confronta(_telaio(), _solido(), None, MAPPA)
    assert "zapatas" in _riga(tabella, "massa").bias_atteso
    assert "più deformabile" in _riga(tabella, "u_sommita_x", "Z2").bias_atteso


def test_provenienza_porta_run_id_sha256_e_data():
    tabella = _confronto.confronta(_telaio(), _solido(), None, MAPPA)
    p = tabella.provenienza
    assert p["run_id_telaio"] == "telaio-abc123" and p["run_id_solido"] == "solido-xyz789"
    assert p["sha256_deck_solido"] == "f" * 64 and p["data"]
    assert tabella.avvertenza == _confronto.AVVERTENZA


def test_reazioni_e_spostamenti_di_sommita_per_caso_mappato():
    tabella = _confronto.confronta(_telaio(), _solido(), None, MAPPA)
    rx = _riga(tabella, "reazione_x", "Z2")
    assert rx.telaio == pytest.approx(-20000.0) and rx.solido == pytest.approx(-19500.0)
    ux = _riga(tabella, "u_sommita_x", "Z2")
    assert ux.telaio == pytest.approx(5.0) and ux.solido == pytest.approx(5.1)


def test_taglio_base_solo_sul_caso_di_spinta():
    tabella = _confronto.confronta(_telaio(), _solido(), None, MAPPA)
    taglio = _riga(tabella, "taglio_base", "Z2")
    assert taglio.telaio == pytest.approx(-20000.0) and taglio.solido == pytest.approx(-19500.0)
    # nessuna riga taglio_base sul caso di gravità
    assert not [r for r in tabella.righe if r.grandezza == "taglio_base" and r.caso == "Z3"]


def test_senza_caso_di_spinta_niente_riga_taglio_base():
    tabella = _confronto.confronta(_telaio(), _solido(), None, {"Z3": "GRAVITA", "nodi_sommita": [4]})
    assert not [r for r in tabella.righe if r.grandezza == "taglio_base"]


def test_modi_appaiati_per_direzione_dominante_non_per_numero():
    """Il modo 1 del telaio è x-dominante (f=5), il modo 2 z-dominante (f=8); il modo 1 del
    solido è x-dominante (f=20), il modo 2 z-dominante (f=33): f1 appaia i due modi n=1
    (stesso ordine), f3 appaia i due modi n=2 — nessuna sorpresa qui, il test dell'ordine
    sta nel prossimo (forme in ordine invertito)."""
    tabella = _confronto.confronta(_telaio(), _solido(), None, MAPPA)
    f1 = _riga(tabella, "f1")
    assert f1.telaio == pytest.approx(5.0) and f1.solido == pytest.approx(20.0)
    f3 = _riga(tabella, "f3")
    assert f3.telaio == pytest.approx(8.0) and f3.solido == pytest.approx(33.0)


def test_modi_appaiati_per_direzione_anche_se_invertiti_nellordine_destratto():
    """Il modo 1 del telaio è z-dominante, il modo 2 x-dominante: l'appaiamento segue la
    direzione, non l'ordine di estrazione — altrimenti f1 leggerebbe il modo sbagliato."""
    telaio = _telaio(modi=[
        {"n": 1, "f": 9.0, "T": None, "forma": {"4": [0.01, 0.0, 1.0]},
         "massa_partecipante": {"x": 0.0, "y": 0.0, "z": 0.7}, "cumulata": {"x": 0.0, "y": 0.0, "z": 0.7}},
        {"n": 2, "f": 4.0, "T": None, "forma": {"4": [1.0, 0.0, 0.02]},
         "massa_partecipante": {"x": 0.6, "y": 0.0, "z": 0.0}, "cumulata": {"x": 0.6, "y": 0.0, "z": 0.7}},
    ])
    tabella = _confronto.confronta(telaio, _solido(), None, MAPPA)
    f1 = _riga(tabella, "f1")
    assert f1.telaio == pytest.approx(4.0)  # il modo n=2, x-dominante, non il primo estratto


def test_massa_partecipante_dellultimo_modo():
    tabella = _confronto.confronta(_telaio(), _solido(), None, MAPPA)
    mx = _riga(tabella, "massa_partecipante_x")
    assert mx.telaio == pytest.approx(0.0) and mx.solido == pytest.approx(0.0)
    mz = _riga(tabella, "massa_partecipante_z")
    assert mz.telaio == pytest.approx(60.0) and mz.solido == pytest.approx(55.0)


# --- Ingressi degeneri ----------------------------------------------------------

def test_solo_telaio_colonne_del_solido_vuote_nessuna_eccezione():
    """Riga: «solo telaio (né solido né CSV) → tabella con le colonne del solido vuote,
    classi non_confrontabile, nessuna eccezione»."""
    tabella = _confronto.confronta(_telaio(), None, None, MAPPA)
    for r in tabella.righe:
        assert r.solido is None and r.abaqus is None
        assert r.classe_solido == "non_confrontabile" and r.classe_abaqus == "non_confrontabile"
    assert tabella.righe[0].grandezza == "massa"


def test_csv_unita_diversa_e_non_confrontabile_con_ragione(tmp_path):
    """Riga: «unita diversa da quella del telaio per la stessa grandezza →
    non_confrontabile con ragione»."""
    p = tmp_path / "unita.csv"
    p.write_text("caso;grandezza;valore;unita;fonte\nGRAVITA;reazione_z;4900;kN;x\n", encoding="utf-8")
    abaqus = _confronto.leggi_csv(p)
    tabella = _confronto.confronta(_telaio(), _solido(), abaqus, MAPPA)
    rz = _riga(tabella, "reazione_z", "Z3")
    assert rz.abaqus is None and rz.classe_abaqus == "non_confrontabile" and rz.ragione


def test_mappa_casi_caso_assente_nel_telaio_e_errore_con_nomi_validi():
    with pytest.raises(ValueError) as e:
        _confronto.confronta(_telaio(), _solido(), None, {"Z99": "GRAVITA", "nodi_sommita": [4]})
    assert "Z99" in str(e.value) and "Z1" in str(e.value)


def test_mappa_casi_passo_assente_nel_solido_e_errore_con_nomi_validi():
    with pytest.raises(ValueError) as e:
        _confronto.confronta(_telaio(), _solido(), None, {"Z3": "NONESISTE", "nodi_sommita": [4]})
    assert "NONESISTE" in str(e.value) and "GRAVITA" in str(e.value)


def test_mappa_casi_nodo_sommita_inesistente_e_errore_con_lid():
    with pytest.raises(ValueError) as e:
        _confronto.confronta(_telaio(), _solido(), None, {"Z3": "GRAVITA", "nodi_sommita": [999]})
    assert "999" in str(e.value)


def test_massa_del_telaio_zero_scarto_null_nessuna_divisione_per_zero():
    """Riga: «massa del telaio 0 (modello senza aste, forza) → scarto: null,
    non_confrontabile, nessuna divisione per zero»."""
    telaio = _telaio(carico_totale={"Z1": [0.0, 0.0, 0.0], "Z3": [0.0, 0.0, 0.0]}, casi=("Z1", "Z3"))
    tabella = _confronto.confronta(telaio, _solido(), None, {"nodi_sommita": [4]})
    riga = _riga(tabella, "massa")
    assert riga.telaio == 0.0
    assert riga.scarto_solido_pct is None and riga.classe_solido == "non_confrontabile"


def test_valore_del_solido_zero_scarto_null():
    """Riga: «valore del solido 0 (spinta nulla) → scarto: null»."""
    solido = _solido(passi={
        "GRAVITA": {"reazioni_somma": [0.0, 0.0, 4900.0], "n_reazioni": 4, "u_set": {}},
        "SPINTA_ORIZZONTALE": {"reazioni_somma": [0.0, 0.0, 0.0], "n_reazioni": 4, "u_set": {}},
    })
    tabella = _confronto.confronta(_telaio(), solido, None, MAPPA)
    rx = _riga(tabella, "reazione_x", "Z2")
    assert rx.solido == 0.0
    assert rx.scarto_solido_pct is None and rx.classe_solido == "non_confrontabile"


def test_modi_del_telaio_tutti_fuori_piano_f_del_piano_non_confrontabile():
    """Riga: «modi del telaio con tutte le forme fuori piano (nessun modo con x dominante)
    → f del piano non_confrontabile con ragione, non un accoppiamento per numero»."""
    telaio = _telaio(modi=[
        {"n": 1, "f": 5.0, "T": 0.2, "forma": {"4": [0.0, 1.0, 0.0]},
         "massa_partecipante": {"x": 0.0, "y": 0.7, "z": 0.0}, "cumulata": {"x": 0.0, "y": 0.7, "z": 0.0}},
        {"n": 2, "f": 8.0, "T": 0.125, "forma": {"4": [0.0, 1.0, 0.0]},
         "massa_partecipante": {"x": 0.0, "y": 0.6, "z": 0.0}, "cumulata": {"x": 0.0, "y": 1.0, "z": 0.0}},
    ])
    tabella = _confronto.confronta(telaio, _solido(), None, MAPPA)
    f1 = _riga(tabella, "f1")
    assert f1.telaio is None and f1.classe_solido == "non_confrontabile" and f1.ragione


def test_esporta_in_cartella_non_scrivibile_e_errore_os(tmp_path):
    """Riga: «esporta in cartella non scrivibile → errore fase confronto con il motivo
    dell'OS»."""
    sola_lettura = tmp_path / "sola_lettura"
    sola_lettura.mkdir()
    sola_lettura.chmod(stat.S_IRUSR | stat.S_IXUSR)
    tabella = _confronto.confronta(_telaio(), _solido(), None, MAPPA)
    try:
        with pytest.raises(OSError):
            _confronto.esporta(tabella, sola_lettura / "sotto")
    finally:
        sola_lettura.chmod(stat.S_IRWXU)  # altrimenti pytest non pulisce tmp_path


def test_csv_abaqus_fonte_vuota_accettata_punto_interrogativo():
    """Riga: «CSV Abaqus con fonte vuota → accettato, fonte: "?"»."""
    righe = _confronto.leggi_csv(ABAQUS_CSV)
    assert all(r["fonte"] for r in righe)  # nessuna stringa vuota, «?» al suo posto


def test_solido_con_reazioni_somma_null_non_confrontabile_non_typeerror():
    """Riga: «solido con reazioni_somma: null su un passo (nessuna reazione stampata) →
    non_confrontabile con ragione «reazioni non stampate dal solido», non TypeError»."""
    solido = _solido(passi={
        "GRAVITA": {"reazioni_somma": None, "n_reazioni": 0, "u_set": {}},
        "SPINTA_ORIZZONTALE": {"reazioni_somma": [-19500.0, 0.0, 0.0], "n_reazioni": 4, "u_set": {}},
    })
    tabella = _confronto.confronta(_telaio(), solido, None, MAPPA)
    rz = _riga(tabella, "reazione_z", "Z3")
    assert rz.solido is None and rz.classe_solido == "non_confrontabile"
    assert rz.ragione == "reazioni non stampate dal solido"


def test_solido_con_massa_null_riga_massa_non_confrontabile():
    """Riga: «solido con massa: null (mesh non C3D4) → riga massa non_confrontabile»."""
    tabella = _confronto.confronta(_telaio(), _solido(massa=None), None, MAPPA)
    riga = _riga(tabella, "massa")
    assert riga.solido is None and riga.classe_solido == "non_confrontabile"


# --- Fix round 1 (review su 0865075) --------------------------------------------

def test_mappa_casi_spinta_assente_dal_telaio_nessuna_riga_taglio_base_nessuna_eccezione():
    """Riga: «mappa_casi["spinta"] che nomina un caso assente dal telaio → nessuna riga
    taglio_base, nessuna eccezione»."""
    tabella = _confronto.confronta(_telaio(), _solido(), None,
                                   {"Z2": "SPINTA_ORIZZONTALE", "spinta": "Z9",
                                    "nodi_sommita": [4]})
    assert not [r for r in tabella.righe if r.grandezza == "taglio_base"]


def test_taglio_base_usa_mappa_casi_spinta_dichiarata_con_passo_diverso_da_spinta_orizzontale():
    """Critical 3: `mappa_casi["spinta"]` dichiarato vince sul letterale SPINTA_ORIZZONTALE —
    passo solido con un nome diverso, la riga taglio_base compare comunque."""
    telaio = _telaio(carico_totale={"Z1": [0.0, 0.0, 0.0], "C2": [20000.0, 0.0, 0.0]},
                     per_caso={"C2": {"spostamenti": {"4": [5.0, 0.0, 0.1, 0, 0, 0]},
                                       "reazioni": {"1": [-20000.0, 0.0, 0.0, 0, 0, 0]},
                                       "sollecitazioni": {}}},
                     casi=("Z1", "C2"))
    solido = _solido(passi={"PUSH": {"reazioni_somma": [-19500.0, 0.0, 0.0], "n_reazioni": 4,
                                     "u_set": {"TOP": {"max": [5.2, 0.0, 0.0], "medio": [5.1, 0.0, 0.0]}}}})
    tabella = _confronto.confronta(telaio, solido, None,
                                   {"C2": "PUSH", "spinta": "C2", "nodi_sommita": [4]})
    taglio = _riga(tabella, "taglio_base", "C2")
    assert taglio.telaio == pytest.approx(-20000.0) and taglio.solido == pytest.approx(-19500.0)


def test_gravita_su_combinazione_massa_non_confrontabile_con_ragione():
    """Critical 4: `mappa_casi["gravita"] = C<id>` → riga massa non_confrontabile con ragione,
    tabella intera comunque prodotta (non solleva)."""
    telaio = _telaio(casi=("Z1", "Z2", "Z3", "C1"))
    tabella = _confronto.confronta(telaio, _solido(), None, {"gravita": "C1", "nodi_sommita": [4]})
    riga = _riga(tabella, "massa")
    assert riga.telaio is None and riga.classe_solido == "non_confrontabile"
    assert riga.ragione == ("il caso di gravità C1 è una combinazione, serve un'azione "
                            "Z<id> a coefficiente unitario")
    assert len(tabella.righe) > 1  # tabella intera comunque prodotta


def test_commit_nova_git_assente_ritorna_none(monkeypatch):
    """Riga: «subprocess.run che solleva FileNotFoundError in _commit_nova → None»."""
    def niente_git(*a, **k):
        raise FileNotFoundError("git non trovato")
    monkeypatch.setattr(_confronto.subprocess, "run", niente_git)
    assert _confronto._commit_nova() is None


# --- esporta: CSV e LaTeX --------------------------------------------------------

def test_esporta_scrive_i_tre_file(tmp_path):
    tabella = _confronto.confronta(_telaio(), _solido(), None, MAPPA)
    file = _confronto.esporta(tabella, tmp_path)
    assert set(file) == {"json", "csv", "tex"}
    for p in file.values():
        assert p.is_file()
    scritto = json.loads(file["json"].read_text(encoding="utf-8"))
    assert scritto["righe"][0]["grandezza"] == "massa"


def test_csv_esportato_ha_punto_decimale_e_punto_e_virgola(tmp_path):
    tabella = _confronto.confronta(_telaio(), _solido(), None, MAPPA)
    file = _confronto.esporta(tabella, tmp_path)
    testo = file["csv"].read_text(encoding="utf-8")
    assert testo.startswith("# unita: mm N t Hz; separatore ;")
    riga_reazione = next(r for r in testo.splitlines() if r.startswith("reazione_x;Z2"))
    assert "-20000" in riga_reazione and "," not in riga_reazione.split(";")[3]


def test_csv_riletto_ha_lo_stesso_numero_di_campi_su_ogni_riga(tmp_path):
    """Critical 1 + riga degenere «testo di bias con ; → CSV con tanti campi quanti
    l'intestazione su ogni riga (csv.writer quota)»: `_BIAS_RIGIDEZZA` contiene un `;`
    letterale, il vecchio `";".join(...)` lo confondeva col separatore su ogni riga con
    bias_atteso (f1..f3, u_sommita_*)."""
    tabella = _confronto.confronta(_telaio(), _solido(), None, MAPPA)
    file = _confronto.esporta(tabella, tmp_path)
    righe_testo = [r for r in file["csv"].read_text(encoding="utf-8").splitlines()
                  if not r.startswith("#")]
    lettore = list(csv.reader(righe_testo, delimiter=";"))
    intestazione, dati = lettore[0], lettore[1:]
    assert all(len(riga) == len(intestazione) for riga in dati)
    grandezze = {riga[0] for riga in dati}
    assert "f1" in grandezze and "u_sommita_x" in grandezze


def test_tex_esportato_e_notazione_italiana_booktabs_avvertenza_provenienza(tmp_path):
    tabella = _confronto.confronta(_telaio(), _solido(), None, MAPPA)
    file = _confronto.esporta(tabella, tmp_path)
    tex = file["tex"].read_text(encoding="utf-8")
    assert r"\begin{tabular}" in tex and r"\bottomrule" in tex and r"\toprule" in tex
    assert _confronto.AVVERTENZA in tex
    assert "telaio-abc123" in tex and "solido-xyz789" in tex
    assert r"\%" in tex          # «%» scappato
    assert "-20000" in tex       # notazione posizionale, non "-2e+04"
    assert "e+" not in tex and "e-" not in tex
    assert "20000.0" not in tex  # niente punto come decimale nel corpo della tabella
    assert tex.isascii()         # nessun carattere non ASCII (Minor 6: "unità" → "unit\`a")


def test_it_tex_zero_e_negativo_piccolo_notazione_posizionale_mai_esponente(tmp_path):
    """Critical 2 + righe degeneri: 0 → "0" (mai log10(0)); −0,01234 → "-0,01234" (mai
    esponente)."""
    riga = _confronto.Riga("prova", None, "N", 0.0, -0.01234, None, None, None,
                           "non_confrontabile", "non_confrontabile", "")
    tabella = _confronto.Tabella(righe=[riga], provenienza={})
    file = _confronto.esporta(tabella, tmp_path)
    tex = file["tex"].read_text(encoding="utf-8")
    assert "N & 0 & -0,01234" in tex
    assert "e+" not in tex and "e-" not in tex


# --- end-to-end: corsa vera del telaio 2×1 e del solido trave.inp ---------------
# Non hanno senso fisico insieme (due modelli scorrelati): è un test del codice
# — le righe non crashano e portano numeri veri — non una validazione fisica.

def test_end_to_end_telaio_2x1_contro_trave_inp(chiedi, tmp_path, binario_opensees, binario_ccx):
    from nova.ccx import esegui as ccx_esegui

    m = leggi_fixture("telaio_2x1.nova.json")
    m["analisi"].append({"tipo": "modale", "modi": 6})
    (r,) = chiedi({"id": 1, "comando": "corsa", "modello": m, "cartella": str(tmp_path / "telaio")})
    fin = r[-1]
    assert fin["esito"] == "ok", fin
    telaio = fin["risultati"]

    trave = FIXTURE / "solido_piccolo" / "trave.inp"
    esito_ccx = ccx_esegui(trave, tmp_path / "solido")
    assert esito_ccx["esito"] == "ok", esito_ccx
    solido = esito_ccx["risultati"]

    mappa = {"Z2": "SPINTA_ORIZZONTALE", "Z3": "GRAVITA", "nodi_sommita": [4, 5, 6]}
    tabella = _confronto.confronta(telaio, solido, None, mappa)
    assert tabella.righe[0].grandezza == "massa"
    grandezze = [r.grandezza for r in tabella.righe]
    assert grandezze.count("f1") == 1 and grandezze.count("f2") == 1 and grandezze.count("f3") == 1
    assert all(r.classe_solido in ("concorde", "vicino", "lontano", "non_confrontabile") for r in tabella.righe)
    assert tabella.avvertenza == _confronto.AVVERTENZA
    assert tabella.provenienza["run_id_telaio"] == telaio["run"]["id"]
    assert tabella.provenienza["run_id_solido"] == solido["run"]["id"]

    file = _confronto.esporta(tabella, tmp_path / "confronto")
    assert all(p.is_file() for p in file.values())


# --- sidecar/server: la cucitura -------------------------------------------------

def test_comando_confronto_via_sidecar(chiedi, tmp_path):
    telaio_p = tmp_path / "telaio.json"
    telaio_p.write_text(json.dumps(_telaio()), encoding="utf-8")
    solido_p = tmp_path / "solido.json"
    solido_p.write_text(json.dumps(_solido()), encoding="utf-8")
    (r,) = chiedi({"id": 1, "comando": "confronto", "telaio": str(telaio_p), "solido": str(solido_p),
                   "mappa_casi": MAPPA})
    fin = r[-1]
    assert fin["esito"] == "ok", fin
    assert fin["tabella"]["righe"][0]["grandezza"] == "massa"


def test_comando_confronto_esporta_quando_c_e_la_cartella(chiedi, tmp_path):
    telaio_p = tmp_path / "telaio.json"
    telaio_p.write_text(json.dumps(_telaio()), encoding="utf-8")
    (r,) = chiedi({"id": 1, "comando": "confronto", "telaio": str(telaio_p), "mappa_casi": MAPPA,
                   "cartella": str(tmp_path / "out")})
    fin = r[-1]
    assert fin["esito"] == "ok", fin
    assert set(fin["file"]) == {"json", "csv", "tex"}
    assert Path(fin["file"]["json"]).is_file()


def test_comando_confronto_senza_telaio_e_errore():
    from nova import sidecar
    r = sidecar.rispondi({"comando": "confronto", "mappa_casi": {}}, lambda ev: None)
    assert r["esito"] == "errore" and r["fase"] == "confronto"


def test_comando_confronto_csv_rotto_e_errore_fase_confronto(tmp_path):
    from nova import sidecar
    telaio_p = tmp_path / "telaio.json"
    telaio_p.write_text(json.dumps(_telaio()), encoding="utf-8")
    csv_p = tmp_path / "male.csv"
    csv_p.write_text("case,quantity\nA,1\n", encoding="utf-8")
    r = sidecar.rispondi({"comando": "confronto", "telaio": str(telaio_p), "abaqus": str(csv_p),
                          "mappa_casi": MAPPA}, lambda ev: None)
    assert r["esito"] == "errore" and r["fase"] == "confronto"
