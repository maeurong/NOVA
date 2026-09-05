"""Corse vere su OpenSees 3.8.0: gli oracoli sono l'equilibrio e la trave appoggiata."""
import json

import numpy as np
import pytest

from conftest import leggi_fixture
from nova import corsa


def _corsa(chiedi, nome, tmp_path, **extra):
    (r,) = chiedi({"id": 1, "comando": "corsa", "modello": leggi_fixture(nome), "cartella": str(tmp_path), **extra})
    return r


def _mezzeria(stazioni):
    return min(stazioni, key=lambda s: abs(s["x_rel"] - 0.5))


def test_telaio_2x1_equilibrio_per_ogni_caso(chiedi, tmp_path, binario_opensees):
    r = _corsa(chiedi, "telaio_2x1.nova.json", tmp_path)
    assert [x["nome"] for x in r if x.get("evento") == "fase"] == [
        "check model", "scrivo il deck e lancio OpenSees", "leggo i recorder"]
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


def test_il_pilastro_sotto_il_peso_proprio_e_compresso(chiedi, tmp_path, binario_opensees):
    fin = _corsa(chiedi, "telaio_2x1.nova.json", tmp_path)[-1]
    assert fin["esito"] == "ok", fin
    piede = fin["risultati"]["per_caso"]["Z3"]["sollecitazioni"]["1"][0]
    assert piede["x_rel"] == 0.0 and piede["N"] < 0.0  # N di compressione è negativo


def test_trave_appoggiata_momento_in_mezzeria(chiedi, tmp_path, binario_opensees):
    fin = _corsa(chiedi, "trave_appoggiata.nova.json", tmp_path, casi=["Z1"])[-1]
    assert fin["esito"] == "ok", fin
    st = fin["risultati"]["per_caso"]["Z1"]["sollecitazioni"]["1"]
    mezzo = _mezzeria(st)
    assert abs(mezzo["x_rel"] - 0.5) < 1e-9  # con 2 suddivisioni la stazione 5 del primo elemento è a metà
    assert mezzo["My"] == pytest.approx(10.0 * 6000 ** 2 / 8, rel=1e-3)  # positivo: fibre inferiori tese
    # taglio dei manuali: +qL/2 all'estremo i, −qL/2 all'estremo j, zero in mezzeria
    assert st[0]["Vz"] == pytest.approx(10.0 * 6000 / 2, rel=1e-3)
    assert st[-1]["Vz"] == pytest.approx(-10.0 * 6000 / 2, rel=1e-3)
    assert abs(mezzo["Vz"]) < 1.0
    assert abs(st[0]["N"]) < 1.0


def test_due_casi_sono_indipendenti(chiedi, tmp_path, binario_opensees):
    """Il secondo caso porta il proprio qL²/8 e non un grammo del primo: `reset` azzera davvero.

    Misurato il 05/09/2026 (OpenSees 3.8.0): Z1 (q = 10 N/mm) rende 45 000 000 N·mm in
    mezzeria, Z2 (solo peso proprio, 22 876 N su 6 m = 3,8127 N/mm) rende 17 157 256 N·mm,
    che è il suo qL²/8 al netto di ogni residuo di Z1.
    """
    fin = _corsa(chiedi, "trave_appoggiata.nova.json", tmp_path, casi=["Z1", "Z2"])[-1]
    assert fin["esito"] == "ok", fin
    ris = fin["risultati"]
    for caso in ("Z1", "Z2"):
        q = -ris["run"]["carico_totale"][caso][2] / 6000.0
        atteso = q * 6000 ** 2 / 8
        assert _mezzeria(ris["per_caso"][caso]["sollecitazioni"]["1"])["My"] == pytest.approx(atteso, rel=1e-3), caso


def test_asta_a_lunghezza_zero_forzata_mostra_lo_squilibrio(chiedi, tmp_path, binario_opensees):
    """OpenSees la risolve senza un `WARNING`: l'unico segnale è il verdetto sulle reazioni."""
    fin = _corsa(chiedi, "asta_lunghezza_zero.nova.json", tmp_path, forza=True)[-1]
    assert fin["esito"] == "ok", fin
    reazioni = [v for v in fin["risultati"]["verdetti"] if v["controllo"] == "reazioni"]
    assert len(reazioni) == 4 and all(v["esito"] == "non_passato" for v in reazioni), reazioni


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


def test_il_file_dei_risultati_c_e_anche_col_verdetto_rosso(chiedi, tmp_path, binario_opensees):
    """Un caso a carico nullo: `reazioni` non passa, ma il file dei risultati si scrive lo stesso."""
    m = leggi_fixture("trave_appoggiata.nova.json")
    m["azioni"].append({"id": 2, "nome": "niente", "natura": "G2",
                        "carichi": [{"tipo": "nodale", "nodo": 1, "Fx": 0}]})
    (r,) = chiedi({"id": 1, "comando": "corsa", "modello": m, "cartella": str(tmp_path), "casi": ["Z2"]})
    fin = r[-1]
    assert fin["esito"] == "ok", fin
    rosso = [v for v in fin["risultati"]["verdetti"] if v["controllo"] == "reazioni"]
    assert rosso and rosso[0]["esito"] == "non_passato"
    assert (tmp_path / "risultati.nova.risultati.json").is_file()


def test_mz_segue_la_stessa_convenzione_di_my(chiedi, tmp_path, binario_opensees):
    """La stessa trave caricata lungo la y locale: il momento in mezzeria è positivo come My."""
    m = leggi_fixture("trave_appoggiata.nova.json")
    m["azioni"][0]["carichi"][0]["direzione"] = "locale_y"
    (r,) = chiedi({"id": 1, "comando": "corsa", "modello": m, "cartella": str(tmp_path), "casi": ["Z1"]})
    assert r[-1]["esito"] == "ok", r[-1]
    mezzo = _mezzeria(r[-1]["risultati"]["per_caso"]["Z1"]["sollecitazioni"]["1"])
    assert mezzo["Mz"] == pytest.approx(10.0 * 6000 ** 2 / 8, rel=1e-3)


def test_il_taglio_lungo_laltro_asse_ha_lo_stesso_segno(chiedi, tmp_path, binario_opensees):
    """Stessa convenzione di `Vz`: +qL/2 all'estremo i, −qL/2 a j, sull'asse y locale."""
    m = leggi_fixture("trave_appoggiata.nova.json")
    m["azioni"][0]["carichi"][0]["direzione"] = "locale_y"
    (r,) = chiedi({"id": 1, "comando": "corsa", "modello": m, "cartella": str(tmp_path), "casi": ["Z1"]})
    assert r[-1]["esito"] == "ok", r[-1]
    st = r[-1]["risultati"]["per_caso"]["Z1"]["sollecitazioni"]["1"]
    assert st[0]["Vy"] == pytest.approx(10.0 * 6000 / 2, rel=1e-3)
    assert st[-1]["Vy"] == pytest.approx(-10.0 * 6000 / 2, rel=1e-3)


def test_la_sezione_senza_barre_corre_e_resta_un_non_applicabile(chiedi, tmp_path, binario_opensees):
    """Il segnale che stava solo nel `resoconto` del deck ora arriva nei verdetti C1 della corsa."""
    m = leggi_fixture("telaio_2x1.nova.json")
    del m["sezioni"][0]["staffe"]
    (r,) = chiedi({"id": 1, "comando": "corsa", "modello": m, "cartella": str(tmp_path), "casi": ["Z3"]})
    fin = r[-1]
    assert fin["esito"] == "ok", fin
    v = {x["controllo"]: x for x in fin["verdetti_check"]}
    assert v["armatura_mancante"]["esito"] == "non_applicabile" and v["armatura_mancante"]["oggetto"] == [1]
    assert v["vincoli_dedotti"]["esito"] == "non_applicabile"


# --- T2: la corsa modale sul binario vero ---

def _modale(m, **campi):
    m["analisi"].append({"tipo": "modale", **campi})
    return m


def test_la_modale_porta_i_modi_e_i_verdetti(chiedi, binario_opensees, tmp_path):
    m = _modale(leggi_fixture("telaio_2x1.nova.json"), modi=3)
    (r,) = chiedi({"id": 1, "comando": "corsa", "modello": m, "cartella": str(tmp_path)})
    fin = r[-1]
    assert fin["esito"] == "ok", fin
    modi = fin["risultati"]["modi"]
    assert len(modi) == 3 and modi[0]["f"] < modi[1]["f"] < modi[2]["f"]
    assert set(modi[0]["forma"]) == {"1", "2", "3", "4", "5", "6"}
    assert fin["risultati"]["run"]["modi_richiesti"] == 3
    assert fin["risultati"]["run"]["modi_estratti"] == 3
    esiti = {v["controllo"]: v["esito"] for v in fin["risultati"]["verdetti"]}
    assert esiti["autovalori"] == "passato"
    assert esiti["massa_modale"] in ("passato", "non_passato")  # 3 modi: il verdetto dice se bastano


def test_modi_auto_cresce_fino_all_85_per_cento(chiedi, binario_opensees, tmp_path):
    m = _modale(leggi_fixture("telaio_2x1.nova.json"), modi="auto")
    (r,) = chiedi({"id": 1, "comando": "corsa", "modello": m, "cartella": str(tmp_path)})
    fin = r[-1]
    assert fin["esito"] == "ok", fin
    provati = fin["risultati"]["run"]["modi_provati"]
    assert provati == sorted(provati) and provati[0] == 3
    ultimo = fin["risultati"]["modi"][-1]["cumulata"]
    esiti = {v["controllo"]: v["esito"] for v in fin["risultati"]["verdetti"]}
    if esiti["massa_modale"] == "passato":
        assert ultimo["x"] >= 0.85 and ultimo["z"] >= 0.85
    fasi = [x["nome"] for x in r if x.get("evento") == "fase"]
    assert sum("modale" in f for f in fasi) == len(provati)


def test_lultimo_tentativo_di_auto_e_il_tetto_dei_gradi_liberi(chiedi, binario_opensees, tmp_path):
    """Misura del 05/09/2026: a sei modi il telaio 2×1 cattura 75,15 % in z, a nove il 100 %.
    La scala salta da sei a dodici, che è oltre le nove traslazioni libere: l'ultimo tentativo
    è il tetto, e con il tetto i modi bastano sempre quando la struttura li ha."""
    m = _modale(leggi_fixture("telaio_2x1.nova.json"), modi="auto")
    (r,) = chiedi({"id": 1, "comando": "corsa", "modello": m, "cartella": str(tmp_path)})
    fin = r[-1]
    assert fin["esito"] == "ok", fin
    assert fin["risultati"]["run"]["modi_provati"] == [3, 6, 9]
    massa = next(v for v in fin["risultati"]["verdetti"] if v["controllo"] == "massa_modale")
    assert massa["esito"] == "passato"
    assert min(massa["valori"]["per_direzione"].values()) >= 0.85


def test_modi_auto_si_ferma_al_primo_tentativo_che_basta(chiedi, binario_opensees, tmp_path):
    """Con `uz` bloccato in testa restano x e y, e tre modi le coprono già: un solo giro."""
    m = leggi_fixture("telaio_2x1.nova.json")
    for n in m["nodi"]:
        if n["id"] in (4, 5, 6):
            n["vincolo"] = {"uz": True}
    (r,) = chiedi({"id": 1, "comando": "corsa", "modello": _modale(m, modi="auto"),
                   "cartella": str(tmp_path)})
    fin = r[-1]
    assert fin["esito"] == "ok", fin
    assert fin["risultati"]["run"]["modi_provati"] == [3]
    esiti = {v["controllo"]: v["esito"] for v in fin["risultati"]["verdetti"]}
    assert esiti["massa_modale"] == "passato"


def test_i_modi_chiesti_di_troppo_dicono_quanti_ne_ha_estratti(chiedi, binario_opensees, tmp_path):
    m = _modale(leggi_fixture("telaio_2x1.nova.json"), modi=200)
    (r,) = chiedi({"id": 1, "comando": "corsa", "modello": m, "cartella": str(tmp_path)})
    fin = r[-1]
    assert fin["esito"] == "ok", fin
    assert fin["risultati"]["run"]["modi_richiesti"] == 200
    assert fin["risultati"]["run"]["modi_estratti"] == 9  # le traslazioni libere del telaio


def test_il_nodo_libero_forzato_non_e_verde_sulla_massa_modale(chiedi, binario_opensees, tmp_path):
    """Il meccanismo non lo vede `autovalori` (il rapporto f1/f2 resta sopra 0,2: misurato
    il 05/09/2026, 14,695 e 20,2161 Hz), lo vede la massa che i modi non catturano."""
    m = _modale(leggi_fixture("nodo_libero.nova.json"), modi=3)
    (r,) = chiedi({"id": 1, "comando": "corsa", "modello": m, "cartella": str(tmp_path), "forza": True})
    fin = r[-1]
    assert fin["esito"] == "ok", fin
    esiti = {v["controllo"]: v["esito"] for v in fin["risultati"]["verdetti"]}
    assert esiti["massa_modale"] == "non_passato"


def test_la_modale_scrive_le_masse_da_azioni_e_abbassa_le_frequenze(chiedi, binario_opensees, tmp_path):
    """La massa aggiunta è massa vera: la prima frequenza cala rispetto alla stessa corsa senza."""
    def prima(masse, cartella):
        m = _modale(leggi_fixture("telaio_2x1.nova.json"), modi=3, masse_da_azioni=masse)
        (r,) = chiedi({"id": 1, "comando": "corsa", "modello": m, "cartella": str(cartella)})
        assert r[-1]["esito"] == "ok", r[-1]
        return r[-1]["risultati"]["modi"][0]["f"]

    assert prima([{"azione": 1, "coefficiente": 1.0}], tmp_path / "con") < prima([], tmp_path / "senza")



def _senza_traslazioni_libere():
    """Telaio 2×1 con le tre teste libere di ruotare ma non di traslare: la statica gira,
    e la massa lumped di `forceBeamColumn -mass` sta sulle sole traslazioni, quindi di modi
    non ce n'è nessuno da estrarre."""
    m = leggi_fixture("telaio_2x1.nova.json")
    for n in m["nodi"]:
        if n["id"] in (4, 5, 6):
            n["vincolo"] = {"ux": True, "uy": True, "uz": True}
    return m


@pytest.mark.parametrize("modi", [3, "auto"])
def test_senza_traslazioni_libere_non_ce_niente_da_estrarre(chiedi, binario_opensees, tmp_path, modi):
    (r,) = chiedi({"id": 1, "comando": "corsa", "modello": _modale(_senza_traslazioni_libere(), modi=modi),
                   "cartella": str(tmp_path)})
    fin = r[-1]
    assert fin["esito"] == "ok", fin
    assert fin["risultati"]["modi"] == []
    assert fin["risultati"]["run"]["modi_richiesti"] == modi
    assert fin["risultati"]["run"]["modi_estratti"] == 0
    assert fin["risultati"]["run"]["modi_provati"] == []
    assert "eigen" not in (tmp_path / "13_telaio.tcl").read_text()
    for controllo in ("autovalori", "massa_modale"):
        v = next(x for x in fin["risultati"]["verdetti"] if x["controllo"] == controllo)
        assert v["esito"] == "non_applicabile", v
        assert v["ragione"] == "nessuna traslazione libera con massa: niente da estrarre"


def test_il_gradino_che_non_regge_torna_allultimo_buono(chiedi, binario_opensees, tmp_path, monkeypatch):
    """Sei modi rifiutati dal solutore: la corsa non muore, torna a tre e rilancia — così il
    deck, i `.out` e `risultati.nova.risultati.json` sulla cartella sono dello stesso giro."""
    vero = corsa._lancia

    def finto(m, casi, cartella, n_modi, stato, t0):
        if n_modi == 6:
            return None, "", corsa._errore_solutore("finto: sei modi non si estraggono", "", cartella, t0)
        return vero(m, casi, cartella, n_modi, stato, t0)

    monkeypatch.setattr(corsa, "_lancia", finto)
    (r,) = chiedi({"id": 1, "comando": "corsa", "modello": _modale(leggi_fixture("telaio_2x1.nova.json"),
                                                                   modi="auto"), "cartella": str(tmp_path)})
    fin = r[-1]
    assert fin["esito"] == "ok", fin
    assert fin["risultati"]["run"]["modi_provati"] == [3]
    assert fin["risultati"]["run"]["modi_falliti"] == [6]
    assert fin["risultati"]["run"]["modi_estratti"] == 3
    assert len(fin["risultati"]["modi"]) == 3
    assert "eigen -fullGenLapack 3" in (tmp_path / "13_telaio.tcl").read_text()


def test_se_il_primo_gradino_non_regge_la_corsa_e_un_errore(chiedi, binario_opensees, tmp_path, monkeypatch):
    """Nessun gradino buono alle spalle: non c'è niente a cui tornare, e l'errore è l'errore."""
    monkeypatch.setattr(corsa, "_lancia",
                        lambda m, casi, cartella, n, stato, t0:
                        (None, "", corsa._errore_solutore("finto: niente si estrae", "", cartella, t0)))
    (r,) = chiedi({"id": 1, "comando": "corsa", "modello": _modale(leggi_fixture("telaio_2x1.nova.json"),
                                                                   modi="auto"), "cartella": str(tmp_path)})
    assert r[-1]["esito"] == "errore" and r[-1]["fase"] == "solutore"
