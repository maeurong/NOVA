"""I sette verdetti C3 e la lettura del registro, senza binario: qui gli oracoli sono i casi degeneri."""
import math

from conftest import leggi_fixture
from nova import corsa
from nova import deck as _deck
from nova import modello as _modello


def _modello_e_deck(nome: str, tmp_path, casi=("Z1",)):
    m = _modello.assicura_peso_proprio(_modello.carica(leggi_fixture(nome)))
    return m, _deck.scrivi(m, list(casi), tmp_path)


def _verdetti(m, d, per_caso, registro=""):
    return {v["controllo"]: v for v in corsa.controlli(m, d, per_caso, registro)}


def _caso(spostamenti, reazioni=None):
    return {"Z1": {"spostamenti": spostamenti, "reazioni": reazioni or {}, "sollecitazioni": {}}}


def test_il_carico_totale_nullo_non_divide_per_zero(tmp_path):
    m, d = _modello_e_deck("trave_appoggiata.nova.json", tmp_path)
    d.carico_totale["Z1"] = (0.0, 0.0, 0.0)
    v = _verdetti(m, d, _caso({"1": [0.0] * 6}, {"1": [1.0] * 6}))
    assert v["reazioni"]["esito"] == "non_passato"
    assert v["reazioni"]["valori"]["scarto_relativo"] is None


def test_gli_spostamenti_vuoti_non_passano_invece_di_schiantare(tmp_path):
    m, d = _modello_e_deck("trave_appoggiata.nova.json", tmp_path)
    v = _verdetti(m, d, _caso({}))
    assert v["spostamenti"]["esito"] == "non_passato"
    assert v["spostamenti"]["valori"]["u_max"] is None


def test_il_modello_senza_estensione_non_passa_sugli_spostamenti(tmp_path):
    m, d = _modello_e_deck("trave_appoggiata.nova.json", tmp_path)
    d.nodi = {1: (0.0, 0.0, 0.0)}  # un nodo solo: dimensione zero, niente divisione
    v = _verdetti(m, d, _caso({"1": [1.0] + [0.0] * 5}))
    assert v["spostamenti"]["esito"] == "non_passato"
    assert v["spostamenti"]["valori"]["dimensione"] == 0.0


def test_u_max_non_finito_non_passa_mai(tmp_path):
    m, d = _modello_e_deck("trave_appoggiata.nova.json", tmp_path)
    for guasto in (math.inf, math.nan):
        v = _verdetti(m, d, _caso({"1": [guasto] + [0.0] * 5}))
        assert v["spostamenti"]["esito"] == "non_passato", guasto


def test_gli_avvisi_si_contano_sul_registro(tmp_path):
    m, d = _modello_e_deck("trave_appoggiata.nova.json", tmp_path)
    pulito = _verdetti(m, d, _caso({"1": [0.0] * 6}), "tutto liscio\n")
    assert pulito["avvisi"]["esito"] == "passato" and pulito["avvisi"]["valori"]["conteggio"] == 0
    sporco = _verdetti(m, d, _caso({"1": [0.0] * 6}), "WARNING uno\nWARNING due\n")
    assert sporco["avvisi"]["esito"] == "non_passato" and sporco["avvisi"]["valori"]["conteggio"] == 2


def test_i_quattro_controlli_fuori_dalla_statica_sono_non_applicabili(tmp_path):
    m, d = _modello_e_deck("trave_appoggiata.nova.json", tmp_path)
    v = _verdetti(m, d, _caso({"1": [0.0] * 6}))
    for controllo in ("picco", "vincolo_in_pianta", "autovalori", "massa_modale"):
        assert v[controllo]["esito"] == "non_applicabile", controllo
        assert v[controllo]["ragione"], controllo


def test_il_registro_senza_version_non_da_versione():
    assert corsa._versione("OpenSees -- Open System\nfinito\n") is None
    assert "3.8.0" in corsa._versione("OpenSees\nVersion 3.8.0\n")
