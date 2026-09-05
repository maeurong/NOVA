"""L'importatore: dal prior di MeshRec al modello NOVA, anche quando il prior è vuoto.

Ogni test è ancorato a una riga di «Ingressi degeneri» del brief Task 2; la mappa
riga → test sta nel report.
"""
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


# --- il prior vero, che non ha trovato niente -------------------------------

def test_il_prior_vuoto_da_un_modello_vuoto_e_le_scartate():
    imp = importa.importa(_prior(VUOTO), riferimento="lab_telaio_v2")
    assert imp.modello.nodi == [] and imp.modello.aste == []
    assert imp.mancano == [] and imp.proposte_vincoli == []
    assert imp.resoconto["membrature"] == 0 and imp.resoconto["aste"] == 0
    modello.carica(json.loads(imp.modello.model_dump_json()))  # riletto senza errori


def test_le_scartate_portano_una_riga_per_controllo_fallito():
    prior = _prior(VUOTO)
    attese = sum(len(s["controlli_falliti"]) for s in prior["scartate"])
    imp = importa.importa(prior)
    assert len(imp.scartate) == attese == 14
    riga = next(s for s in imp.scartate if s["regione"] == 0)
    esito = prior["scartate"][0]["esiti"]["costanza_sezione"]
    assert riga == {"regione": 0, "punti": prior["scartate"][0]["punti"],
                    "controllo": "costanza_sezione", "valore": esito["valore"],
                    "soglia": esito["soglia"], "unita": esito["unita"],
                    "spiegazione": esito["spiegazione"]}
    assert riga["valore"] > riga["soglia"]


# --- il prior sintetico, che ha trovato tutto -------------------------------

def test_il_sintetico_da_80_aste_con_sezione_dal_rilievo():
    imp = importa.importa(_prior(SINTETICO), riferimento="prior_sintetico")
    m = imp.modello
    assert len(m.aste) == 80 and len(m.sezioni) == 80
    assert all(a.origine.sorgente == "rilievo" and a.suddivisioni == 1 for a in m.aste)
    assert all(s.origine.sorgente == "rilievo" and s.file == [] and s.staffe is None for s in m.sezioni)
    assert all(a.origine.riferimento == "prior_sintetico" for a in m.aste)
    assert imp.mancano == ["armature", "classe", "vincoli"]
    assert len(imp.giunzioni) == 4 and all(np.isfinite(g["scostamento_nodo"]) for g in imp.giunzioni)
    assert {g["nodo"] for g in imp.giunzioni} <= {n.id for n in m.nodi}
    assert imp.resoconto == {"membrature": 4, "aste": 80, "nodi": 80, "scartate": 0,
                             "giunzioni_scartate": 0}
    assert len(m.nodi) == 80


def test_i_materiali_di_default_dichiarano_di_essere_un_assunzione():
    m = importa.importa(_prior(SINTETICO)).modello
    assert [x.classe for x in m.materiali] == ["C25/30", "B450C"]
    assert all(x.origine.nota == "assunta: il rilievo non dice la classe" for x in m.materiali)


def test_le_coordinate_sono_nella_terna_del_telaio():
    m = importa.importa(_prior(SINTETICO)).modello
    x = np.array([n.x for n in m.nodi]); y = np.array([n.y for n in m.nodi]); z = np.array([n.z for n in m.nodi])
    assert x.min() == pytest.approx(0.0, abs=1e-9) and z.min() == pytest.approx(0.0, abs=1e-9)
    assert x.max() == pytest.approx(1626.85, abs=1.0)   # misurato, non atteso
    assert z.max() == pytest.approx(1934.45, abs=1.0)
    assert np.abs(y).max() <= 170.0  # il fuori piano sta dentro gli spessori


def test_ruota_conserva_il_fuori_piano_e_non_lo_trasla():
    """Il sintetico ha i nodi complanari: l'unico modo di provare che `y` non si trasla
    è darle un fuori piano che il prior non ha, e ritrovarlo con il suo segno."""
    prior = _prior(SINTETICO)
    estremi = np.array([np.asarray(v["origine"], dtype=float) + t * v["lunghezza"] * np.asarray(v["asse"], dtype=float)
                        for v in prior["membrature"] for t in (0.0, 1.0)])
    fuori = importa.matrice_terna(prior, estremi)[1]  # la direzione fuori piano, nella nuvola
    campione = np.vstack([estremi, estremi[0] + 137.0 * fuori, estremi[0] - 40.0 * fuori])
    ruotati = importa.ruota(prior, campione)
    assert ruotati[:, 1].max() == pytest.approx(137.0, abs=1e-6)
    assert ruotati[:, 1].min() == pytest.approx(-40.0, abs=1e-6)
    assert ruotati[:, 0].min() == pytest.approx(0.0, abs=1e-9)
    assert ruotati[:, 2].min() == pytest.approx(0.0, abs=1e-9)


def test_la_rotazione_delle_sezioni_e_zero_o_novanta():
    m = importa.importa(_prior(SINTETICO)).modello
    for a in m.aste:
        r = abs(a.rotazione_deg) % 180.0
        assert min(r, abs(r - 90.0), abs(r - 180.0)) < 2.0, a.nome


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
    assert len(imp.proposte_vincoli) >= 2  # la trave di fondazione poggia


def test_due_import_stesso_prior_stessa_impronta():
    a = importa.importa(_prior(SINTETICO)).modello
    b = importa.importa(_prior(SINTETICO)).modello
    assert modello.impronta(a) == modello.impronta(b)


# --- il prior a metà --------------------------------------------------------

def test_il_parziale_traduce_due_e_scarta_due():
    imp = importa.importa(_prior(PARZIALE))
    assert len(imp.modello.aste) == 40
    assert {s["regione"] for s in imp.scartate} == {2, 3}
    assert imp.resoconto["giunzioni_scartate"] >= 1
    assert imp.giunzioni == []  # tutte e quattro nominavano una membratura scartata


def test_il_parziale_e_riproducibile():
    atteso = PARZIALE.read_bytes()
    out = subprocess.run([sys.executable, str(PARZIALE.parent / "genera.py"), "--stdout"],
                         capture_output=True, check=True)
    assert out.stdout == atteso


# --- prior malformati -------------------------------------------------------

@pytest.mark.parametrize("chiave", ["terna", "membrature", "scartate"])
def test_senza_una_chiave_l_errore_la_nomina(chiave):
    p = _prior(SINTETICO)
    del p[chiave]
    with pytest.raises(ValueError, match=chiave):
        importa.importa(p)


def test_una_terna_che_non_e_3x3_e_rifiutata():
    p = _prior(SINTETICO)
    p["terna"] = [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0]]
    with pytest.raises(ValueError, match="terna"):
        importa.importa(p)


def test_una_sezione_di_estensione_nulla_esce_col_messaggio_di_telaio():
    p = _prior(SINTETICO)
    p["membrature"][0]["sezioni_fette"][0] = [0.0, 300.0]
    with pytest.raises(ValueError, match=r"stazione 0 della membratura 0"):
        importa.importa(p)
