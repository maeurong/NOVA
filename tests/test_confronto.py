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


def test_massa_partecipante_e_la_cumulata_dellultimo_modo():
    """C1: la massa partecipante totale e' la `cumulata` dell'ultimo modo, non la quota di
    quel solo modo — stessa convenzione di `corsa.py:334` e `modale.py:141`. La fixture
    distingue le due apposta: quota x dell'ultimo modo 0,0, cumulata 0,7."""
    tabella = _confronto.confronta(_telaio(), _solido(), None, MAPPA)
    mx = _riga(tabella, "massa_partecipante_x")
    assert mx.telaio == pytest.approx(70.0) and mx.solido == pytest.approx(65.0)
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


def test_leggi_csv_con_bom_intestazione_riconosciuta_comunque(tmp_path):
    """Riga: «CSV Abaqus con BOM UTF-8 in testa → intestazione riconosciuta lo stesso»."""
    p = tmp_path / "bom.csv"
    p.write_bytes(b"\xef\xbb\xbf" + "caso;grandezza;valore;unita;fonte\nGRAVITA;massa;1,0;t;x\n"
                  .encode("utf-8"))
    righe = _confronto.leggi_csv(p)
    assert righe[0]["caso"] == "GRAVITA"


def test_leggi_csv_separatore_virgola_quando_manca_il_punto_e_virgola(tmp_path):
    """Riga: «CSV con separatore "," invece di ";" (nessun ";" nella prima riga) → letto lo
    stesso»: il delimitatore si sceglie dalla prima riga, non è fisso."""
    p = tmp_path / "virgola.csv"
    p.write_text("caso,grandezza,valore,unita,fonte\nGRAVITA,massa,1000.5,t,x\n", encoding="utf-8")
    righe = _confronto.leggi_csv(p)
    assert righe == [{"caso": "GRAVITA", "grandezza": "massa", "valore": pytest.approx(1000.5),
                      "unita": "t", "fonte": "x"}]


def test_leggi_csv_separatore_virgola_con_valore_a_virgola_decimale_e_errore_di_colonne(tmp_path):
    """Un CSV a virgola come separatore **e** un valore in notazione italiana è ambiguo per
    costruzione: la virgola del decimale diventa un campo di troppo, e l'errore lo dice —
    non una lettura silenziosa che sposta i valori nelle colonne sbagliate."""
    p = tmp_path / "ambiguo.csv"
    p.write_text("caso,grandezza,valore,unita,fonte\nGRAVITA,massa,1000,5,t,x\n", encoding="utf-8")
    with pytest.raises(ValueError) as e:
        _confronto.leggi_csv(p)
    assert "riga 2" in str(e.value) and "6 colonne" in str(e.value)


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
    assert testo.startswith("# unita: mm N t Hz %; separatore ;")
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


def test_comando_confronto_mappa_casi_non_dict_e_errore_non_crash(chiedi, tmp_path):
    """Riga: «mappa_casi non è un dict (es. una lista) → errore riportato, il sidecar non
    crasha»: `req.get("mappa_casi") or {}` lascia passare una lista non vuota così com'è,
    e `_valida` la userebbe come un dict; il guardrail che tiene in piedi il sidecar è il
    catch-all di `rispondi` (`nova/sidecar.py`), non un controllo dedicato su mappa_casi."""
    telaio_p = tmp_path / "telaio.json"
    telaio_p.write_text(json.dumps(_telaio()), encoding="utf-8")
    (r,) = chiedi({"id": 1, "comando": "confronto", "telaio": str(telaio_p), "mappa_casi": ["Z2"]})
    fin = r[-1]
    assert fin["esito"] == "errore"


def test_comando_confronto_csv_rotto_e_errore_fase_confronto(tmp_path):
    from nova import sidecar
    telaio_p = tmp_path / "telaio.json"
    telaio_p.write_text(json.dumps(_telaio()), encoding="utf-8")
    csv_p = tmp_path / "male.csv"
    csv_p.write_text("case,quantity\nA,1\n", encoding="utf-8")
    r = sidecar.rispondi({"comando": "confronto", "telaio": str(telaio_p), "abaqus": str(csv_p),
                          "mappa_casi": MAPPA}, lambda ev: None)
    assert r["esito"] == "errore" and r["fase"] == "confronto"


# --- ondata finale: denominatore, pavimento, assi, provenienza, cintura CSV -------

def test_lo_scarto_divide_per_il_riferimento_non_per_il_telaio():
    """§5: il riferimento è l'altro (solido o Abaqus), non il telaio. Massa telaio
    1000/g = 0,10194 t contro 0,5 t del solido: 79,6 % sul solido, non 390 % sul telaio."""
    tabella = _confronto.confronta(_telaio(), _solido(), None, MAPPA)
    riga = _riga(tabella, "massa")
    atteso = abs(0.5 - 1000.0 / _confronto.GRAVITA) / 0.5 * 100.0
    assert riga.scarto_solido_pct == pytest.approx(atteso)
    assert riga.scarto_solido_pct < 100.0


def test_valore_sotto_il_pavimento_di_rumore_non_e_confrontabile():
    """C8: −5e−16 mm contro −0,00116 mm sono due modi di dire «zero» in mm, e lo scarto fra
    i due non è un'informazione. Sopra il pavimento il confronto si fa come sempre."""
    telaio = _telaio(per_caso={
        "Z3": {"spostamenti": {"4": [0.2, 0.0, -5e-16, 0, 0, 0]},
               "reazioni": {"1": [0.0, 0.0, 1000.0, 0, 0, 0]}, "sollecitazioni": {}},
    })
    solido = _solido(passi={"GRAVITA": {"reazioni_somma": [0.0, 0.0, 4900.0], "n_reazioni": 4,
                                        "u_set": {"TOP": {"medio": [0.21, 0.0, -0.00116]}}}})
    tabella = _confronto.confronta(telaio, solido, None, {"Z3": "GRAVITA", "nodi_sommita": [4]})
    uz = _riga(tabella, "u_sommita_z", "Z3")
    assert uz.scarto_solido_pct is None and uz.classe_solido == "non_confrontabile"
    assert "pavimento" in uz.ragione
    ux = _riga(tabella, "u_sommita_x", "Z3")   # 0,2 mm: sopra il pavimento, si confronta
    assert ux.classe_solido != "non_confrontabile"


def test_unita_senza_pavimento_dichiarato_si_confronta_come_prima():
    """Riga: «`_PAVIMENTO` senza la chiave dell'unità di una riga → nessun pavimento»."""
    assert "kN" not in _confronto._PAVIMENTO
    pct, classe, ragione = _confronto._scarto_classe(1e-16, 2e-16, "kN")
    assert pct is not None and classe == "lontano" and ragione is None


# --- fix round C: F1 (due ragioni distinte), F2 (pavimento mm) ---------------

def test_pavimento_con_entrambi_i_lati_sotto_non_nomina_i_valori():
    """F1, ramo «entrambi sotto»: nessuno dei due regge, e la percentuale non avrebbe
    comunque senso — la ragione dice solo il pavimento, non i valori."""
    pct, classe, ragione = _confronto._scarto_classe(1e-6, -2e-6, "N")
    assert pct is None and classe == "non_confrontabile"
    assert ragione == "entrambi i valori sotto il pavimento di rumore per «N» (< 0.01)"


def test_pavimento_con_un_solo_lato_sotto_nomina_i_due_valori():
    """F1, ramo «uno solo sotto»: il caso reale del deck vero — il telaio regge (−754,5 N),
    il solido non riporta taglio (−1,48e−5 N). Non è rumore reciproco: è il solido che
    manca, e la ragione lo dice nominando entrambi i valori, non un generico «sotto»."""
    pct, classe, ragione = _confronto._scarto_classe(-754.5, -1.48e-5, "N")
    assert pct is None and classe == "non_confrontabile"
    assert ragione is not None and "non concordano" in ragione
    assert "754,5" in ragione and "sotto il pavimento" in ragione


def test_zero_esatto_su_entrambi_eredita_la_ragione_del_pavimento():
    """Aggiunta craft-reviewer: `reazione_x` C1/C3 del deck vero ha il telaio a 0 esatto
    contro un solido non nullo ma sotto il pavimento — deve uscire con la ragione del
    pavimento (0 è sotto qualunque pavimento positivo), non con `ragione: None`."""
    pct, classe, ragione = _confronto._scarto_classe(0.0, 1.7e-5, "N")
    assert pct is None and classe == "non_confrontabile"
    assert ragione == "entrambi i valori sotto il pavimento di rumore per «N» (< 0.01)"


def test_zero_esatto_senza_pavimento_dichiarato_ha_comunque_una_ragione():
    """Nessuna riga `non_confrontabile` deve avere `ragione` vuota (craft-reviewer): per
    un'unità senza pavimento lo zero esatto resta il vecchio caso «nessuno scarto», ma
    con una ragione invece del `None` di prima."""
    pct, classe, ragione = _confronto._scarto_classe(0.0, 5.0, "kN")
    assert pct is None and classe == "non_confrontabile"
    assert ragione == "valore zero esatto: nessuno scarto"


def test_valore_none_resta_manca_non_pavimento():
    """Ingresso degenere: un valore `None` prende il ramo già esistente («manca»), la
    guardia del pavimento non lo vede nemmeno."""
    pct, classe, ragione = _confronto._scarto_classe(None, -1.48e-5, "N")
    assert pct is None and classe == "non_confrontabile" and ragione is None


def test_pavimento_mm_piu_stretto_non_marca_rumore_un_valore_reale():
    """F2: `_PAVIMENTO["mm"]` passa da 1e-3 a 1e-4 — 1e-3 stava dentro la banda di uno
    spostamento vero (misurato: `u_sommita_z` a −0,0019 mm sopravviveva solo per 1,9×). Un
    valore di 5e-4 mm (sotto il vecchio pavimento, sopra il nuovo) deve confrontarsi come un
    numero vero."""
    assert _confronto._PAVIMENTO["mm"] == 1e-4
    pct, classe, ragione = _confronto._scarto_classe(5e-4, 5e-4, "mm")
    assert ragione is None and classe != "non_confrontabile"


def _modi_telaio_x_e_y():
    return [
        {"n": 1, "f": 5.0, "T": 0.2, "forma": {"4": [1.0, 0.0, 0.0]},
         "massa_partecipante": {"x": 0.7, "y": 0.0, "z": 0.0},
         "cumulata": {"x": 0.7, "y": 0.0, "z": 0.0}},
        {"n": 2, "f": 8.0, "T": 0.125, "forma": {"4": [0.0, 1.0, 0.0]},
         "massa_partecipante": {"x": 0.0, "y": 0.6, "z": 0.0},
         "cumulata": {"x": 0.7, "y": 0.6, "z": 0.0}},
    ]


def _modi_solido_y_e_x():
    return [
        {"f": 20.0, "massa_partecipante": {"x": 0.0, "y": 0.65, "z": 0.0},
         "cumulata": {"x": 0.0, "y": 0.65, "z": 0.0}},
        {"f": 33.0, "massa_partecipante": {"x": 0.55, "y": 0.0, "z": 0.0},
         "cumulata": {"x": 0.55, "y": 0.65, "z": 0.0}},
    ]


def test_assi_dichiarati_appaiano_i_modi_fra_terne_ruotate():
    """§6: la x del telaio è la y del solido (terne diverse fra i due modelli). Senza `assi`
    f1 leggerebbe il modo sbagliato pur essendo entrambi «x-dominanti» nel proprio sistema."""
    telaio = _telaio(modi=_modi_telaio_x_e_y())
    solido = _solido(modi=_modi_solido_y_e_x())
    mappa = {**MAPPA, "assi": {"x": "y", "y": "x", "z": "z"}}
    tabella = _confronto.confronta(telaio, solido, None, mappa)
    f1 = _riga(tabella, "f1")
    assert f1.telaio == pytest.approx(5.0) and f1.solido == pytest.approx(20.0)
    f2 = _riga(tabella, "f2")
    assert f2.telaio == pytest.approx(8.0) and f2.solido == pytest.approx(33.0)


def test_senza_assi_lappaiamento_resta_lettera_per_lettera():
    """Riga: «`mappa_casi["assi"]` assente → identità»: la stessa fixture senza `assi` appaia
    la x del telaio con la x del solido, e la tabella è quella di prima."""
    telaio = _telaio(modi=_modi_telaio_x_e_y())
    solido = _solido(modi=_modi_solido_y_e_x())
    tabella = _confronto.confronta(telaio, solido, None, MAPPA)
    f1 = _riga(tabella, "f1")
    assert f1.telaio == pytest.approx(5.0) and f1.solido == pytest.approx(33.0)


def test_assi_parziale_lascia_le_lettere_mancanti_allidentita():
    """Riga: «`assi` parziale (`{"x": "y"}`) → le lettere mancanti restano identità»."""
    telaio = _telaio(modi=_modi_telaio_x_e_y())
    solido = _solido(modi=_modi_solido_y_e_x())
    tabella = _confronto.confronta(telaio, solido, None, {**MAPPA, "assi": {"x": "y"}})
    assert _riga(tabella, "f1").solido == pytest.approx(20.0)   # x → y
    assert _riga(tabella, "f2").solido == pytest.approx(20.0)   # y → y, identità


@pytest.mark.parametrize("assi", [{"x": "w"}, {"w": "x"}, {"x": "yy"}])
def test_assi_con_una_lettera_fuori_da_xyz_e_errore_di_validazione(assi):
    """Riga: «`assi` con una lettera fuori da x/y/z → `ValueError` da `_valida`, non
    `KeyError` in loop»."""
    with pytest.raises(ValueError) as e:
        _confronto.confronta(_telaio(), _solido(), None, {**MAPPA, "assi": assi})
    assert "assi" in str(e.value)


def test_assi_non_iniettivo_e_errore_di_validazione():
    """F7: `{"x": "y", "y": "y"}` manda due lettere del telaio sulla stessa lettera del
    solido — un modo solido appaiato due volte, l'altro mai. Deve fermarsi come le lettere
    fuori da x/y/z, non passare in silenzio."""
    with pytest.raises(ValueError) as e:
        _confronto.confronta(_telaio(), _solido(), None,
                             {**MAPPA, "assi": {"x": "y", "y": "y"}})
    assert "assi" in str(e.value)


def test_provenienza_porta_lhash_del_modello_del_telaio():
    """C12: senza `hash_modello` la tabella non dice su quale modello è stata fatta."""
    tabella = _confronto.confronta(_telaio(), _solido(), None, MAPPA)
    assert tabella.provenienza["hash_modello"] == "hash"


def test_provenienza_senza_hash_modello_e_none_non_keyerror():
    """Riga: «`telaio["run"]` senza `hash_modello` → `None`, non `KeyError`»."""
    telaio = _telaio()
    del telaio["run"]["hash_modello"]
    tabella = _confronto.confronta(telaio, _solido(), None, MAPPA)
    assert tabella.provenienza["hash_modello"] is None


# --- 8a: i casi hanno la forma del modello, le celle testuali non aprono formule ---

def test_un_caso_del_telaio_fuori_forma_e_un_rifiuto():
    """8a: `telaio.json` arriva da un percorso e `json.loads` non vincola niente; un caso
    `=1+1` finirebbe as-is nella colonna `caso` del CSV."""
    telaio = _telaio(casi=("Z1", "=1+1"),
                     carico_totale={"Z1": [0.0, 0.0, -1000.0], "=1+1": [0.0, 0.0, 0.0]})
    with pytest.raises(ValueError) as e:
        _confronto.confronta(telaio, _solido(), None, {"nodi_sommita": [4]})
    assert "=1+1" in str(e.value) and "Z<n>" in str(e.value)


def test_una_chiave_speciale_sconosciuta_di_mappa_casi_e_un_rifiuto():
    """Riga: «`mappa_casi` con chiave speciale sconosciuta (`"pippo"`) → `ValueError` con il
    nome della chiave, non ignorata in silenzio»."""
    with pytest.raises(ValueError) as e:
        _confronto.confronta(_telaio(), _solido(), None, {**MAPPA, "pippo": "GRAVITA"})
    assert "pippo" in str(e.value)


def _tabella_di_una_riga(**extra):
    riga = _confronto.Riga("reazione_x", None, "N", -20000.0, None, None, None, None,
                           "non_confrontabile", "non_confrontabile", "", **extra)
    return _confronto.Tabella(righe=[riga], provenienza={})


def test_una_cella_testuale_che_apre_una_formula_viene_disinnescata(tmp_path):
    """8a, cintura: le celle testuali che iniziano per `=`, `+`, `-`, `@`, tab o CR prendono
    un apostrofo davanti (OWASP CSV injection); le colonne numeriche no, o `-20000`
    diventerebbe testo."""
    file = _confronto.esporta(_tabella_di_una_riga(ragione="=cmd()"), tmp_path)
    testo = file["csv"].read_text(encoding="utf-8")
    riga = next(r for r in testo.splitlines() if r.startswith("reazione_x"))
    assert "'=cmd()" in riga
    assert ";-20000;" in riga   # il numero negativo resta un numero


def test_una_cella_testuale_vuota_resta_vuota(tmp_path):
    """Riga: «cella testuale vuota (`""`) → resta vuota, nessun prefisso»."""
    file = _confronto.esporta(_tabella_di_una_riga(), tmp_path)
    riga = next(r for r in file["csv"].read_text(encoding="utf-8").splitlines()
                if r.startswith("reazione_x"))
    assert riga.endswith(";;")   # bias_atteso e ragione vuoti, senza apostrofo


# --- 8b: LaTeX ---------------------------------------------------------------------

def test_escape_tex_copre_tutti_e_dieci_i_caratteri_speciali():
    """8b: `#`, `$`, `{`, `}`, `~`, `^` uscivano nudi e rompevano la compilazione (o, con
    `\\`, la cambiavano). Il backslash diventa `\\textbackslash{}` e le sue graffe non
    vengono riscappate: la sostituzione è una passata sola, carattere per carattere."""
    fuori = _confronto._escape_tex(r"\ % _ & # $ { } ~ ^")
    assert fuori == (r"\textbackslash{} \% \_ \& \# \$ \{ \} "
                     r"\textasciitilde{} \textasciicircum{}")


def test_it_a_cavallo_della_potenza_di_dieci_resta_posizionale():
    """§3, comportamento dichiarato e non un difetto: quattro cifre significative più lo zero
    dell'arrotondamento sono ciò che `.4g` farebbe in posizionale. Mai un esponente."""
    assert _confronto._it(9999.5) == "10000"
    assert _confronto._it(0.00099995) == "0,0010000"


def test_comando_confronto_telaio_che_non_e_un_oggetto_e_fase_confronto(chiedi, tmp_path):
    """C4: un `telaio.json` che porta una lista finiva su `AttributeError` in `_valida` e
    usciva `fase: sidecar` — HTTP 200 con dentro il gergo di Python."""
    telaio_p = tmp_path / "telaio.json"
    telaio_p.write_text(json.dumps([1, 2, 3]), encoding="utf-8")
    (r,) = chiedi({"id": 1, "comando": "confronto", "telaio": str(telaio_p), "mappa_casi": MAPPA})
    fin = r[-1]
    assert fin["esito"] == "errore" and fin["fase"] == "confronto", fin
    assert "oggetto JSON" in fin["motivo"]


def test_comando_confronto_telaio_senza_carico_totale_e_fase_confronto(chiedi, tmp_path):
    """C4: il campo che manca detto per nome, non `KeyError: 'carico_totale'`."""
    telaio = _telaio()
    del telaio["run"]["carico_totale"]
    telaio_p = tmp_path / "telaio.json"
    telaio_p.write_text(json.dumps(telaio), encoding="utf-8")
    (r,) = chiedi({"id": 1, "comando": "confronto", "telaio": str(telaio_p), "mappa_casi": MAPPA})
    fin = r[-1]
    assert fin["esito"] == "errore" and fin["fase"] == "confronto", fin
    assert "carico_totale" in fin["motivo"] and "KeyError" not in fin["motivo"]
