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
    # Task 3: `vincoli_dedotti` non è più rinviato; su `telaio_2x1` la base è già incastrata.
    assert v["vincoli_dedotti"]["esito"] == "passato"


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


def _finto_che_fallisce(vero, cadute: set[int]):
    """`_lancia` che boccia sempre i sei modi, e boccia i tre modi alle chiamate elencate in
    `cadute` (numerate da 1). La prima chiamata a tre modi è il primo gradino della scala; le
    successive sono il rilancio dell'ultimo gradino buono, dove cade l'intermittenza
    misurata del solutore (stesso deck, uscita −5/−11 a giri alterni)."""
    giri = {"tre": 0}

    def finto(m, casi, cartella, n_modi, stato, t0):
        if n_modi == 6:
            return None, "", corsa._errore_solutore("finto: sei modi non si estraggono", "", cartella, t0)
        if n_modi == 3:
            giri["tre"] += 1
            if giri["tre"] in cadute:
                return None, "", corsa._errore_solutore("finto: intermittente", "", cartella, t0)
        return vero(m, casi, cartella, n_modi, stato, t0)
    return finto


def test_il_rilancio_dellultimo_buono_ha_un_secondo_colpo(chiedi, binario_opensees, tmp_path, monkeypatch):
    """Il gradino buono era appena passato: se il suo rilancio cade una volta è
    l'intermittenza del solutore, non il modello. Si riprova una volta sola."""
    monkeypatch.setattr(corsa, "_lancia", _finto_che_fallisce(corsa._lancia, {2}))
    (r,) = chiedi({"id": 1, "comando": "corsa", "modello": _modale(leggi_fixture("telaio_2x1.nova.json"),
                                                                   modi="auto"), "cartella": str(tmp_path)})
    fin = r[-1]
    assert fin["esito"] == "ok", fin
    assert fin["risultati"]["run"]["modi_provati"] == [3]
    assert fin["risultati"]["run"]["modi_falliti"] == [6]
    assert len(fin["risultati"]["modi"]) == 3


def test_il_rilancio_che_cade_due_volte_e_un_errore(chiedi, binario_opensees, tmp_path, monkeypatch):
    """Due cadute di fila sullo stesso gradino non sono intermittenza: è un errore, e la corsa
    lo dice invece di rilanciare all'infinito."""
    monkeypatch.setattr(corsa, "_lancia", _finto_che_fallisce(corsa._lancia, {2, 3}))
    (r,) = chiedi({"id": 1, "comando": "corsa", "modello": _modale(leggi_fixture("telaio_2x1.nova.json"),
                                                                   modi="auto"), "cartella": str(tmp_path)})
    assert r[-1]["esito"] == "errore" and r[-1]["fase"] == "solutore"


def test_se_il_primo_gradino_non_regge_la_corsa_e_un_errore(chiedi, binario_opensees, tmp_path, monkeypatch):
    """Nessun gradino buono alle spalle: non c'è niente a cui tornare, e l'errore è l'errore."""
    monkeypatch.setattr(corsa, "_lancia",
                        lambda m, casi, cartella, n, stato, t0:
                        (None, "", corsa._errore_solutore("finto: niente si estrae", "", cartella, t0)))
    (r,) = chiedi({"id": 1, "comando": "corsa", "modello": _modale(leggi_fixture("telaio_2x1.nova.json"),
                                                                   modi="auto"), "cartella": str(tmp_path)})
    assert r[-1]["esito"] == "errore" and r[-1]["fase"] == "solutore"


def test_il_rilievo_importato_gira_in_elastico(chiedi, binario_opensees, tmp_path):
    """Story 53: il rilievo, con i soli vincoli proposti, è subito calcolabile in elastico."""
    from conftest import FIXTURE
    from nova import importa

    imp = importa.importa(json.loads((FIXTURE / "prior_sintetico" / "12_wall.json").read_text(encoding="utf-8")))
    dati = json.loads(imp.modello.model_dump_json(exclude_none=True))
    for p in imp.proposte_vincoli:
        next(n for n in dati["nodi"] if n["id"] == p["nodo"])["vincolo"] = p["vincolo"]
    (r,) = chiedi({"id": 1, "comando": "corsa", "modello": dati, "cartella": str(tmp_path)})
    fin = r[-1]
    assert fin["esito"] == "ok", fin
    esiti = {v["controllo"]: v["esito"] for v in fin["risultati"]["verdetti"] if v["caso"]}
    assert esiti["reazioni"] == "passato"


# --- T4 Task 2: la statica non lineare a fibre sul binario vero -------------------------
#
# Misure del 05/09/2026, OpenSees 3.8.0, `~/.local/bin/OpenSees`. Dove il piano dava un
# oracolo che la misura contraddice, vince la misura e il numero sta scritto qui col perché.


def _a_fibre(m: dict, **campi) -> dict:
    for an in m["analisi"]:
        if an["tipo"] == "statica":
            an.update({"legami": "fibre", **campi})
    return m


def _trave_con_mezzeria(fattore_q: float = 1.0) -> dict:
    """La trave appoggiata con un **nodo** in mezzeria e non una suddivisione: `spostamenti`
    porta i soli nodi del modello, e la freccia di una suddivisione generata non ci arriva."""
    m = leggi_fixture("trave_appoggiata.nova.json")
    m["nodi"].insert(1, {"id": 3, "nome": "mezzeria", "x": 3000, "y": 0, "z": 0})
    m["aste"] = [{"id": 1, "nodo_i": 1, "nodo_j": 3, "sezione": 2},
                 {"id": 2, "nodo_i": 3, "nodo_j": 2, "sezione": 2}]
    m["azioni"][0]["carichi"] = [{"tipo": "distribuito", "asta": a, "q": -10.0 * fattore_q,
                                  "direzione": "z"} for a in (1, 2)]
    return m


def _gira(chiedi, m, tmp_path, casi=("Z1",)):
    (r,) = chiedi({"id": 1, "comando": "corsa", "modello": m, "cartella": str(tmp_path),
                   "casi": list(casi)})
    return r[-1]


def _verdetto(fin, controllo, caso=None):
    return next(v for v in fin["risultati"]["verdetti"]
                if v["controllo"] == controllo and (caso is None or v["caso"] == caso))


def test_il_telaio_a_fibre_tiene_l_equilibrio_del_caso_elastico(chiedi, tmp_path, binario_opensees):
    """L'equilibrio non dipende dal legame: Σ reazioni = Σ carichi comunque. Misurato il
    05/09/2026 lo scarto sta a 8,9e-13, 4,0e-13 e 1,7e-16 sui tre casi — la soglia è 1e-4."""
    casi = ["Z1", "Z2", "C1"]
    el = _gira(chiedi, leggi_fixture("telaio_2x1.nova.json"), tmp_path / "el", casi)
    fi = _gira(chiedi, _a_fibre(leggi_fixture("telaio_2x1.nova.json")), tmp_path / "fi", casi)
    assert el["esito"] == "ok" and fi["esito"] == "ok", fi
    for caso in casi:
        somma = {k: np.sum([v[:3] for v in d["risultati"]["per_caso"][caso]["reazioni"].values()], axis=0)
                 for k, d in (("el", el), ("fi", fi))}
        atteso = np.linalg.norm(somma["el"])
        assert np.linalg.norm(somma["fi"] - somma["el"]) <= 1e-4 * max(atteso, 1.0), caso


def test_lo_scarto_fra_elastico_e_fibre_e_quello_del_modulo_del_nucleo(chiedi, tmp_path, binario_opensees):
    """Il piano si aspettava il 3 %: la misura dice altro, e dice anche perché.

    Il nucleo confinato non ha `E_cm`. `Concrete02` non prende `Ec`: la rigidezza iniziale è
    `2 f_cc/ε_c2,c`, e con la [4.1.10] (`ε_c2,c = ε_c2 (f_cc/f_c)²`) vale `2 f_c²/(f_cc ε_c2)`,
    cioè **meno** di `E_cm` proprio perché il nucleo è confinato (doc 09 §1.3, §3.3: 92 % di
    `E_cm` nell'esempio). Il telaio 2×1 non è oltre la fessurazione — max |My| in C1 è
    4,67e7 N·mm contro un `M_cr` di 3,21e7 sulla 30×50 e 1,15e7 sulla 30×30 — quindi lo
    scarto che resta è quello del modulo, non il quadro fessurativo.

    Misurato il 05/09/2026: Z1 45,8 %, Z2 0,24 %, C1 8,27 %. Z1 è la freccia più piccola di
    tutte (0,0598 mm elastici), e il 45,8 % sono 0,027 mm: si pinza largo perché è rumore su
    un numero piccolo, non un fatto sul legame.
    """
    casi = ["Z1", "Z2", "C1"]
    el = _gira(chiedi, leggi_fixture("telaio_2x1.nova.json"), tmp_path / "el", casi)
    fi = _gira(chiedi, _a_fibre(leggi_fixture("telaio_2x1.nova.json")), tmp_path / "fi", casi)
    assert el["esito"] == "ok" and fi["esito"] == "ok", fi

    def u_max(d, caso):
        return max(np.linalg.norm(v[:3])
                   for v in d["risultati"]["per_caso"][caso]["spostamenti"].values())

    scarto = {c: abs(u_max(fi, c) - u_max(el, c)) / u_max(el, c) for c in casi}
    assert scarto["C1"] == pytest.approx(0.083, abs=0.02), scarto
    assert scarto["Z2"] < 0.01, scarto
    assert scarto["Z1"] < 0.6, scarto
    assert abs(u_max(fi, "Z1") - u_max(el, "Z1")) < 0.05, scarto  # 0,027 mm in valore assoluto


def test_la_statica_a_fibre_dichiara_la_convergenza_e_stampa_i_materiali(chiedi, tmp_path, binario_opensees):
    fin = _gira(chiedi, _a_fibre(leggi_fixture("telaio_2x1.nova.json")), tmp_path, ["C1"])
    assert fin["esito"] == "ok", fin
    v = _verdetto(fin, "convergenza", "C1")
    assert v["esito"] == "passato"
    assert v["valori"]["passi"] == 10 and v["valori"]["fattore"] == pytest.approx(1.0)
    assert v["valori"]["algoritmi"] == ["Newton"] * 10  # misurato il 05/09/2026
    run = fin["risultati"]["run"]
    assert run["legami"] == "fibre" and run["passi"] == 10
    # vincolo globale T4: i parametri del `.tcl` si stampano con la loro provenienza
    assert sorted(run["materiali"]) == ["1", "2"]
    nucleo = run["materiali"]["1"]["nucleo"]
    assert nucleo["confinamento"] == "ntc" and nucleo["fpc"] < 0 and "[4.1." in nucleo["articolo"]
    assert run["materiali"]["1"]["acciaio"]["Fy"] == pytest.approx(450.0)


def test_la_corsa_elastica_lascia_la_convergenza_non_applicabile(chiedi, tmp_path, binario_opensees):
    """Regressione T1: senza fibre non c'è né scala né passi, e il verdetto non è verde."""
    fin = _gira(chiedi, leggi_fixture("telaio_2x1.nova.json"), tmp_path, ["Z1"])
    assert fin["esito"] == "ok", fin
    v = _verdetto(fin, "convergenza", "Z1")
    assert v["esito"] == "non_applicabile" and "elastica" in v["ragione"]
    assert fin["risultati"]["run"]["materiali"] == {}


def test_un_passo_solo_e_un_analyze_solo(chiedi, tmp_path, binario_opensees):
    fin = _gira(chiedi, _a_fibre(_trave_con_mezzeria(), passi=1), tmp_path)
    assert fin["esito"] == "ok", fin
    v = _verdetto(fin, "convergenza", "Z1")
    assert v["valori"]["passi"] == 1 and v["valori"]["algoritmi"] == ["Newton"]
    assert v["valori"]["fattore"] == pytest.approx(1.0) and v["esito"] == "passato"


def test_oltre_la_fessurazione_la_trave_converge_e_scende_piu_dell_elastica(chiedi, tmp_path, binario_opensees):
    """Il piano diceva «q × 20»: la misura del 05/09/2026 dice che a q × 20 la trave è **rotta**
    (caduta al passo 3, λ = 0,2), e già a q × 4 non arriva in fondo. La 30×50 con 3Ø16 porta
    un `M_u` attorno a 1,1e8 N·mm, cioè circa q × 2,4 sui 6 m: q × 20 sta otto volte oltre.

    q × 2 è il carico che fessura senza rompere: freccia in mezzeria 7,141 mm contro i 3,142
    elastici, rapporto 2,273 (l'oracolo del piano chiedeva > 1,05).
    """
    el = _gira(chiedi, _trave_con_mezzeria(2.0), tmp_path / "el")
    fi = _gira(chiedi, _a_fibre(_trave_con_mezzeria(2.0)), tmp_path / "fi")
    assert el["esito"] == "ok" and fi["esito"] == "ok", fi
    ue = el["risultati"]["per_caso"]["Z1"]["spostamenti"]["3"][2]
    uf = fi["risultati"]["per_caso"]["Z1"]["spostamenti"]["3"][2]
    assert uf / ue > 1.05 and uf / ue == pytest.approx(2.273, abs=0.05)
    assert _verdetto(fi, "convergenza", "Z1")["esito"] == "passato"


def test_la_scala_di_algoritmi_entra_davvero_e_finisce_nel_verdetto(chiedi, tmp_path, binario_opensees):
    """Newton da solo non chiude sempre. A q × 3 in due passi, misurato il 05/09/2026, il
    secondo passo lo prende `KrylovNewton` dopo che `Newton` e `ModifiedNewton -initial`
    hanno fallito — ed è il verdetto a raccontarlo, perché i recorder rendono il solo stato
    finale. Qui l'oracolo è la **scala**, non la freccia: quella che ne esce è fuori da ogni
    senso fisico (3,77 m su una trave di sei) e nessun verdetto la contraddice, perché
    `solve.controlla_spostamenti` rifiuta a `u_max > dimensione` e 0,63 sta sotto. È un buco
    della soglia di T1, non di questo passo: segnalato, non allargato qui.
    """
    fin = _gira(chiedi, _a_fibre(_trave_con_mezzeria(3.0), passi=2), tmp_path)
    assert fin["esito"] == "ok", fin
    v = _verdetto(fin, "convergenza", "Z1")
    assert v["valori"]["algoritmi"] == ["Newton", "KrylovNewton"]
    assert "scala di algoritmi ai passi 2" in v["ragione"]
    assert abs(fin["risultati"]["per_caso"]["Z1"]["spostamenti"]["3"][2]) > 1000.0


def test_la_trave_rotta_dichiara_il_passo_e_il_fattore_invece_di_fingere_un_risultato(
        chiedi, tmp_path, binario_opensees):
    """q × 200 su una trave che si rompe a q × 2,4. Il piano ammetteva due esiti — errore del
    solutore, oppure `ok` con `convergenza: non_passato` — ma mai un `ok` verde. Misurato il
    05/09/2026: caduta al passo 2, λ = 0,05, dopo i sei dimezzamenti; `errore fase solutore`
    con il motivo che nomina il passo e il fattore, e il registro di OpenSees in `coda_log`.
    """
    fin = _gira(chiedi, _a_fibre(_trave_con_mezzeria(200.0)), tmp_path)
    if fin["esito"] == "ok":  # l'altro ramo che il piano ammette: mai un verde
        assert _verdetto(fin, "convergenza", "Z1")["esito"] == "non_passato", fin
        return
    assert fin["esito"] == "errore" and fin["fase"] == "solutore", fin
    assert "caduto al passo 2" in fin["motivo"] and "fattore 0.05" in fin["motivo"], fin["motivo"]
    assert "the Algorithm failed" in fin["coda_log"]


def test_la_sezione_senza_barre_rifiuta_una_statica_a_fibre_e_con_forza_corre(
        chiedi, tmp_path, binario_opensees):
    m = _a_fibre(_trave_con_mezzeria())
    m["sezioni"][0]["file"] = []
    (r,) = chiedi({"id": 1, "comando": "corsa", "modello": m, "cartella": str(tmp_path / "no")})
    assert r[-1]["esito"] == "rifiutato"
    v = next(x for x in r[-1]["verdetti_check"] if x["controllo"] == "armatura_mancante")
    assert v["esito"] == "non_passato" and v["oggetto"] == [2]
    (r,) = chiedi({"id": 1, "comando": "corsa", "modello": m, "cartella": str(tmp_path / "si"),
                   "forza": True})
    assert r[-1]["esito"] == "ok", r[-1]
    assert r[-1]["risultati"]["run"]["materiali"]["2"]["acciaio"] is None
