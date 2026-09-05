"""I sette verdetti C3 e la lettura del registro, senza binario: qui gli oracoli sono i casi degeneri."""
import math

import pytest

from conftest import leggi_fixture
from nova import corsa
from nova import deck as _deck
from nova import modale as _modale
from nova import modello as _modello


def _modello_e_deck(nome: str, tmp_path, casi=("Z1",)):
    m = _modello.assicura_peso_proprio(_modello.carica(leggi_fixture(nome)))
    return m, _deck.scrivi(m, list(casi), tmp_path)


def _verdetti(m, d, per_caso, registro=""):
    return {v["controllo"]: v for v in corsa.controlli(d, per_caso, registro)}


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
    assert "3.8.0" in corsa._versione("OpenSees\nVersion 3.8.0 64-Bit\n")


def test_la_versione_e_il_banner_non_una_riga_qualunque():
    """Un avviso che nomina «Version» non è il banner: la riga della versione comincia per «Version»."""
    registro = "WARNING: Version mismatch in element 3\nVersion 3.8.0 64-Bit\n"
    assert corsa._versione(registro) == "Version 3.8.0 64-Bit"


# --- Review finale: una forma sola per i verdetti, e l'hash che non si ricalcola ---

CHIAVI_VERDETTO = {"controllo", "oggetto", "stazione", "caso", "esito", "ragione",
                   "articolo", "valori", "rimedio"}


def test_i_verdetti_c1_e_c3_hanno_le_stesse_chiavi(tmp_path):
    """Spec «Modello dati»: una forma sola, `{controllo, oggetto?, stazione?, caso?,
    esito, ragione, articolo?, valori{}}`. C1 dava cinque chiavi, C3 altre cinque."""
    from nova import check as _check

    m, d = _modello_e_deck("trave_appoggiata.nova.json", tmp_path)
    c1 = _check.check_model(m)
    c3 = corsa.controlli(d, _caso({"1": [0.0] * 6}), "")
    assert c1 and c3
    for v in c1 + c3:
        assert set(v) == CHIAVI_VERDETTO, v["controllo"]


def test_risultati_da_uscite_pretende_lhash_del_modello(tmp_path):
    """Il fallback `hash_modello or impronta(m)` ricalcolava dopo il peso proprio: via."""
    m, d = _modello_e_deck("trave_appoggiata.nova.json", tmp_path)
    with pytest.raises(TypeError):
        corsa.risultati_da_uscite(m, d, tmp_path, "")


# --- T2: i due verdetti modali ---

def test_nessun_modo_estratto_non_e_non_applicabile(tmp_path):
    """Il passo modale c'è stato e non ha reso niente: è un rosso, non una terza cosa."""
    m, d = _modello_e_deck("trave_appoggiata.nova.json", tmp_path)
    v = {x["controllo"]: x for x in corsa.controlli(d, _caso({"1": [0.0] * 6}), "", [], ("x", "z"))}
    assert v["autovalori"]["esito"] == "non_passato"
    assert v["massa_modale"]["esito"] == "non_passato"
    assert "nessun modo estratto" in v["massa_modale"]["ragione"]


def test_la_massa_modale_conta_solo_le_direzioni_con_massa(tmp_path):
    m, d = _modello_e_deck("trave_appoggiata.nova.json", tmp_path)
    modi = [{"f": 5.0, "cumulata": {"x": 0.9, "y": 0.0, "z": 0.86}}]
    v = {x["controllo"]: x for x in corsa.controlli(d, _caso({"1": [0.0] * 6}), "", modi, ("x", "z"))}
    assert v["massa_modale"]["esito"] == "passato"
    assert v["massa_modale"]["valori"]["per_direzione"]["y"] is None
    assert "x" in v["massa_modale"]["ragione"] and "z" in v["massa_modale"]["ragione"]
    stretto = {x["controllo"]: x for x in corsa.controlli(d, _caso({"1": [0.0] * 6}), "", modi, ("x", "y", "z"))}
    assert stretto["massa_modale"]["esito"] == "non_passato"


def test_senza_direzioni_con_massa_i_verdetti_modali_non_si_applicano(tmp_path):
    """Niente traslazioni libere con massa: la domanda «i modi bastano?» non ha senso qui,
    e non ha senso nemmeno «le frequenze sono sane?». Terza cosa, non un rosso."""
    m, d = _modello_e_deck("trave_appoggiata.nova.json", tmp_path)
    v = {x["controllo"]: x for x in corsa.controlli(d, _caso({"1": [0.0] * 6}), "", [], ())}
    for controllo in ("autovalori", "massa_modale"):
        assert v[controllo]["esito"] == "non_applicabile", controllo
        assert v[controllo]["ragione"] == "nessuna traslazione libera con massa: niente da estrarre"


def test_i_verdetti_modali_hanno_le_stesse_chiavi(tmp_path):
    """Parità delle chiavi anche sul ramo vero di `_verdetti_modali`, non solo sul `non_applicabile`."""
    m, d = _modello_e_deck("trave_appoggiata.nova.json", tmp_path)
    modi = [{"f": 5.0, "cumulata": {"x": 0.9, "y": 0.0, "z": 0.86}}]
    for c3 in (corsa.controlli(d, _caso({"1": [0.0] * 6}), "", modi, ("x", "z")),
               corsa.controlli(d, _caso({"1": [0.0] * 6}), "", [], ("x",)),
               corsa.controlli(d, _caso({"1": [0.0] * 6}), "", [], ())):
        assert c3
        for v in c3:
            assert set(v) == CHIAVI_VERDETTO, v["controllo"]


def test_la_scala_dei_modi_si_ferma_al_cappello():
    """Un modello molto suddiviso ha centinaia di gradi liberi, e l'ultimo giro li chiederebbe
    tutti a un solutore denso (il costo va col cubo). Il cappello è l'ultimo gradino della
    scala: sotto di esso il tetto chiude la scala come prima."""
    dati = leggi_fixture("telaio_2x1.nova.json")
    for a in dati["aste"]:
        a["suddivisioni"] = 20
    m = _modello.carica(dati)
    an = _modello.AnalisiModale(tipo="modale", modi="auto")
    assert _modale.gradi_liberi(m) > _modale.SCALA_MODI[-1]
    assert corsa._tentativi(m, an) == [3, 6, 12, 24, 48]


def test_sotto_il_cappello_la_scala_finisce_sul_tetto():
    m = _modello.carica(leggi_fixture("telaio_2x1.nova.json"))
    an = _modello.AnalisiModale(tipo="modale", modi="auto")
    assert corsa._tentativi(m, an) == [3, 6, 9]


def test_la_ragione_della_massa_modale_elenca_le_direzioni_in_prosa(tmp_path):
    """`['x', 'z']` è il `repr` di una lista Python dentro una frase che legge un ingegnere."""
    m, d = _modello_e_deck("trave_appoggiata.nova.json", tmp_path)
    modi = [{"f": 5.0, "cumulata": {"x": 0.9, "y": 0.0, "z": 0.86}}]
    v = {x["controllo"]: x for x in corsa.controlli(d, _caso({"1": [0.0] * 6}), "", modi, ("x", "z"))}
    assert v["massa_modale"]["ragione"].endswith("sulle direzioni con massa x, z")
