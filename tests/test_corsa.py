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


# --- T4 (#26): lo spostamento contro la luce, non contro la diagonale --------------------
#
# `solve.controlla_spostamenti` (T1) rifiuta a `u_max > dimensione` e su un telaio intero non
# morde: la trave di 6 000 mm che scende di 3 769 passa con 0,63 di diagonale. Gli oracoli qui
# sono i tre gradini della soglia nuova, e la luce è quella dell'**asta**, non dell'elemento.

def _trave_lunga(passo: float) -> dict:
    """Due aste in fila della lunghezza data, con il nodo 3 in mezzo: la luce del nodo 3 è
    `passo` e non la distanza fra gli appoggi."""
    dati = leggi_fixture("trave_appoggiata.nova.json")
    dati["nodi"][1]["x"] = 2 * passo
    dati["nodi"].insert(1, {"id": 3, "nome": "mezzeria", "x": passo, "y": 0, "z": 0})
    dati["aste"] = [{"id": 1, "nodo_i": 1, "nodo_j": 3, "sezione": 2},
                    {"id": 2, "nodo_i": 3, "nodo_j": 2, "sezione": 2}]
    return dati


def _spostamenti(m, tmp_path, u_z: float, passo: float = 3000.0):
    d = _deck.scrivi(_modello.assicura_peso_proprio(_modello.carica(m)), ["Z1"], tmp_path)
    per_caso = _caso({"1": [0.0] * 6, "2": [0.0] * 6, "3": [0.0, 0.0, u_z, 0.0, 0.0, 0.0]})
    return {v["controllo"]: v for v in corsa.controlli(d, per_caso, "")}["spostamenti"]


def test_lo_spostamento_oltre_un_decimo_della_luce_e_fuori_scala(tmp_path):
    """Il numero misurato da Task 2: 3 769 mm su una trave di 6 000, cioè 1,26 volte la
    semiluce di 3 000. Con la sola soglia di T1 era verde."""
    v = _spostamenti(_trave_lunga(3000.0), tmp_path, -3769.0)
    assert v["esito"] == "non_passato"
    assert "spostamento fuori scala" in v["ragione"] and "non descrive più la struttura" in v["ragione"]
    assert v["valori"]["rapporto"] == pytest.approx(3769.0 / 3000.0)
    assert v["valori"]["luce_minima"] == pytest.approx(3000.0) and v["valori"]["nodo"] == 3
    # il rapporto con la diagonale resta scritto, ed è quello che passava: 0,628 su 6 000
    assert v["valori"]["rapporto_diagonale"] == pytest.approx(3769.0 / 6000.0)


def test_fra_un_cinquantesimo_e_un_decimo_della_luce_e_verde_con_avviso(tmp_path):
    v = _spostamenti(_trave_lunga(3000.0), tmp_path, -150.0)  # 1/20 della luce
    assert v["esito"] == "passato" and "avviso: u/L" in v["ragione"]
    assert v["valori"]["rapporto"] == pytest.approx(0.05)


def test_due_millimetri_su_aste_da_cinquemila_passano_senza_avviso(tmp_path):
    """Ingresso degenere del brief Task 4: `u_max` su un nodo di sole aste lunghe (L = 5 000)
    con `u` = 2 mm — rapporto 1/2500, verde e senza una parola in più."""
    v = _spostamenti(_trave_lunga(5000.0), tmp_path, -2.0)
    assert v["esito"] == "passato" and "avviso" not in v["ragione"]
    assert v["valori"]["rapporto"] == pytest.approx(1 / 2500)
    assert v["valori"]["luce_minima"] == pytest.approx(5000.0)


def test_la_luce_e_dell_asta_e_non_dell_elemento_suddiviso(tmp_path):
    """`suddivisioni: 4` non accorcia la campata: la stessa freccia sulla stessa trave deve
    dare lo stesso rapporto, suddivisa o no. Senza questo la soglia sarebbe quattro volte
    più severa su un modello suddiviso."""
    intero = _trave_lunga(3000.0)
    suddiviso = _trave_lunga(3000.0)
    for a in suddiviso["aste"]:
        a["suddivisioni"] = 4
    a = _spostamenti(intero, tmp_path / "a", -150.0)
    b = _spostamenti(suddiviso, tmp_path / "b", -150.0)
    assert a["valori"]["rapporto"] == b["valori"]["rapporto"] == pytest.approx(0.05)


def test_nessun_nodo_con_aste_non_ha_una_luce_con_cui_confrontarsi(tmp_path):
    """Il Check Model boccia un modello senza aste, ma «forza» lo scavalca e gli spostamenti
    arrivano fin qui: `min` su un insieme vuoto solleverebbe. `rapporto` resta `null` — non
    verificato, non zero — e il verdetto è quello della sola diagonale di T1."""
    dati = leggi_fixture("trave_appoggiata.nova.json")
    dati["aste"], dati["azioni"][0]["carichi"] = [], []
    d = _deck.scrivi(_modello.carica(dati), ["Z1"], tmp_path)
    v = {x["controllo"]: x for x in corsa.controlli(
        d, _caso({"1": [0.0] * 6, "2": [0.0, 0.0, -1.0, 0.0, 0.0, 0.0]}), "")}["spostamenti"]
    assert v["valori"]["rapporto"] is None and v["valori"]["luce_minima"] is None
    assert v["valori"]["nodo"] is None and v["valori"]["avviso"] is False
    assert v["valori"]["rapporto_diagonale"] == pytest.approx(1.0 / 6000.0)


# --- review di Task 4: I2 (il nodo peggiore) e I3 (le due soglie hanno due nomi) -----------

def _trave_col_moncone() -> dict:
    """Due campate da 6 000 e un moncone da 200 in coda: il nodo più **spostato** sta in
    mezzeria (luce 6 000), il nodo peggiore è la punta del moncone (luce 200)."""
    dati = leggi_fixture("trave_appoggiata.nova.json")
    dati["nodi"][1]["x"] = 12000
    dati["nodi"].insert(1, {"id": 3, "nome": "mezzeria", "x": 6000, "y": 0, "z": 0})
    dati["nodi"].append({"id": 4, "nome": "punta", "x": 12200, "y": 0, "z": 0})
    dati["aste"] = [{"id": 1, "nodo_i": 1, "nodo_j": 3, "sezione": 2},
                    {"id": 2, "nodo_i": 3, "nodo_j": 2, "sezione": 2},
                    {"id": 3, "nodo_i": 2, "nodo_j": 4, "sezione": 2}]
    return dati


def test_il_rapporto_e_del_nodo_peggiore_non_di_quello_piu_spostato(tmp_path):
    """I2, misurato dal reviewer: `u_max` in mezzeria (500 mm su 6 000, 1/12) passava e la
    punta del moncone stava a 2,5 volte la soglia, con verdetto verde. Il rapporto è un
    massimo su **tutti** i nodi con aste, non il rapporto del solo nodo più spostato."""
    m = _modello.assicura_peso_proprio(_modello.carica(_trave_col_moncone()))
    d = _deck.scrivi(m, ["Z1"], tmp_path)
    per_caso = _caso({"1": [0.0] * 6, "3": [0.0, 0.0, -500.0, 0.0, 0.0, 0.0],
                      "2": [0.0] * 6, "4": [0.0, 0.0, -50.0, 0.0, 0.0, 0.0]})
    v = {x["controllo"]: x for x in corsa.controlli(d, per_caso, "")}["spostamenti"]
    assert v["esito"] == "non_passato"
    assert v["valori"]["u_max"] == pytest.approx(500.0)          # resta di T1
    assert v["valori"]["nodo"] == 4 and v["valori"]["u"] == pytest.approx(50.0)
    assert v["valori"]["luce_minima"] == pytest.approx(200.0)
    assert v["valori"]["rapporto"] == pytest.approx(0.25)
    assert "al nodo 4" in v["ragione"]


def test_le_due_soglie_portano_due_nomi_e_lavviso_e_un_campo(tmp_path):
    """I3: `soglia` era quella della **diagonale** anche quando a decidere era u/L, e l'avviso
    viveva nella sola prosa della ragione. Chi legge `valori` deve poter rifare il conto."""
    v = _spostamenti(_trave_lunga(3000.0), tmp_path, -150.0)  # 1/20: verde, con avviso
    assert "soglia" not in v["valori"]
    assert v["valori"]["soglia_luce"] == pytest.approx(corsa.SOGLIA_FUORI_SCALA)
    assert v["valori"]["soglia_avviso_luce"] == pytest.approx(corsa.SOGLIA_AVVISO_SCALA)
    assert v["valori"]["soglia_diagonale"] > 0.0
    assert v["esito"] == "passato" and v["valori"]["avviso"] is True


def test_sotto_la_soglia_davviso_il_campo_avviso_e_falso(tmp_path):
    v = _spostamenti(_trave_lunga(5000.0), tmp_path, -2.0)  # 1/2500
    assert v["valori"]["avviso"] is False


def test_un_solo_nodo_con_aste_e_fermo_da_rapporto_zero_e_non_none(tmp_path):
    """Ingresso degenere: i nodi con aste sono fermi (`u` = 0) e il solo nodo spostato non ha
    aste, quindi non entra nel massimo. `0.0` è falso in Python, e un `rapporto or None` da
    qualche parte lo trasformerebbe in «non verificato» — che è la terza cosa, non un rapporto
    nullo. Verde, e senza una parola in più."""
    dati = leggi_fixture("trave_appoggiata.nova.json")
    dati["nodi"].append({"id": 3, "nome": "isolato", "x": 0, "y": 0, "z": 3000})
    dati["aste"] = [{"id": 1, "nodo_i": 1, "nodo_j": 2, "sezione": 2}]
    dati["azioni"][0]["carichi"] = []
    d = _deck.scrivi(_modello.carica(dati), ["Z1"], tmp_path)
    v = {x["controllo"]: x for x in corsa.controlli(
        d, _caso({"1": [0.0] * 6, "2": [0.0] * 6,
                  "3": [0.0, 0.0, -500.0, 0.0, 0.0, 0.0]}), "")}["spostamenti"]
    assert v["esito"] == "passato" and v["valori"]["rapporto"] == 0.0
    assert v["valori"]["u_max"] == pytest.approx(500.0) and v["valori"]["nodo"] in (1, 2)
    assert v["valori"]["avviso"] is False and "avviso" not in v["ragione"]


def test_fuori_scala_non_e_un_avviso_ma_un_rosso(tmp_path):
    """`avviso` marca la sola banda verde fra 1/50 e 1/10: sopra 1/10 il verdetto è rosso, e
    un `avviso: true` accanto direbbe che c'è ancora qualcosa da valutare a occhio."""
    v = _spostamenti(_trave_lunga(3000.0), tmp_path, -3769.0)
    assert v["esito"] == "non_passato" and v["valori"]["avviso"] is False


# --- §2/W1: i passi di gravità della spinta non sono i passi del caso statico --------------

def _con_spinta(tmp_path, caso_gravita: str, passi: int = 10):
    dati = leggi_fixture("telaio_2x1.nova.json")
    dati["analisi"] = [
        {"tipo": "statica", "casi": ["Z1"], "legami": "fibre", "passi": passi},
        {"tipo": "pushover", "distribuzione": "uniforme", "nodo_controllo": 4, "dof": "ux",
         "incremento": 1.0, "spostamento_max": 60.0, "caso_gravita": caso_gravita}]
    m = _modello.assicura_peso_proprio(_modello.carica(dati))
    return _deck.scrivi(m, ["Z1"], tmp_path)


def _registro_passi(caso: str, n: int) -> str:
    return "\n".join(f"{_deck.MARCA_PASSO}: caso {caso} passo {k} algoritmo Newton "
                      f"fattore {k / n:.6g}" for k in range(1, n + 1))


def test_i_passi_di_gravita_della_spinta_non_gonfiano_il_caso_statico(tmp_path):
    """W1, misurato sul modello pubblicato: il blocco di gravità della pushover riusa
    `_blocco_statico` con lo **stesso** nome di caso, e `(convergenza, Z1)` diceva «20 passi
    su 10 dichiarati» con `valori.algoritmi` lungo 20 — un rosso su una statica arrivata."""
    d = _con_spinta(tmp_path, "Z1")
    registro = _registro_passi("Z1", 10) + "\n" + _registro_passi("pushover/Z1", 10)
    per = {(x["controllo"], x["caso"]): x for x in
           corsa.controlli(d, _caso({"1": [0.0] * 6}), registro)}
    v = per[("convergenza", "Z1")]
    assert v["esito"] == "passato" and v["valori"]["passi"] == 10
    assert len(v["valori"]["algoritmi"]) == 10
    assert "10 passi su 10 dichiarati" in v["ragione"]


def test_la_gravita_fuori_dai_casi_non_lascia_un_verdetto_di_convergenza_suo(tmp_path):
    """Ingresso degenere: `caso_gravita` non è fra i casi statici dichiarati. Nessun verdetto
    `(convergenza, Z3)` spurio — l'unico verdetto della spinta è `(convergenza, pushover)`."""
    d = _con_spinta(tmp_path, "Z3")
    registro = _registro_passi("Z1", 10) + "\n" + _registro_passi("pushover/Z3", 10)
    chiavi = {(x["controllo"], x["caso"]) for x in
              corsa.controlli(d, _caso({"1": [0.0] * 6}), registro)}
    assert ("convergenza", "Z3") not in chiavi
    assert ("convergenza", "Z1") in chiavi and ("convergenza", "pushover") in chiavi
