"""La pushover su OpenSees vero: la curva, lo stato delle sezioni, la caduta dichiarata.

Gli oracoli sono tre, e nessuno dei tre è «il numero che è uscito»:

1. **l'equilibrio per passo** — `taglio_base[k] = −Σ reazioni` lungo il dof di controllo, letto
   dal recorder e non dal JSON che lo compone;
2. **la monotonia** dello spostamento di controllo, che è la definizione stessa del controllo
   di spostamento;
3. **il ramo calante**: una pushover a fibre che non perde rigidezza non ha fessurato niente,
   e allora lo stato delle sezioni sarebbe una decorazione.

I numeri pinzati sono misurati il 05/09/2026 con OpenSees 3.8.0 sul telaio 2×1, e la data sta
nel commento del test che li pinza: rimisurarli è lecito, cambiarli in silenzio no.
"""
import json

import numpy as np
import pytest

from conftest import leggi_fixture
from nova import corsa, deck as _deck, modello as _modello, passi as _passi, sidecar


def _modello_pushover(statica=("Z3",), **campi) -> dict:
    dati = leggi_fixture("telaio_2x1.nova.json")
    dati["analisi"] = [
        {"tipo": "statica", "casi": list(statica), "legami": "fibre", "passi": 4},
        {"tipo": "pushover", "distribuzione": "uniforme", "nodo_controllo": 4, "dof": "ux",
         "incremento": 1.0, "spostamento_max": 60.0, "caso_gravita": "Z3"} | campi,
    ]
    return dati


def _corri(cartella, modello, **extra) -> dict:
    return sidecar.rispondi({"comando": "corsa", "modello": modello, "cartella": str(cartella),
                             **extra}, lambda ev: None)


@pytest.fixture(scope="module")
def uniforme(tmp_path_factory, binario_opensees):
    """Una corsa sola per tutti i test che guardano la stessa pushover: 60 passi da 1 mm."""
    cartella = tmp_path_factory.mktemp("pushover_uniforme")
    return _corri(cartella, _modello_pushover()), cartella


def test_la_curva_e_monotona_in_spostamento_e_in_equilibrio_a_ogni_passo(uniforme):
    """Misurato il 05/09/2026, OpenSees 3.8.0: 60 passi da 1 mm, nessun dimezzamento."""
    r, cartella = uniforme
    assert r["esito"] == "ok", r
    ris = r["risultati"]
    passi = ris["passi"]
    assert len(passi) == 60 and ris["caduta"] is None
    assert [p["n"] for p in passi] == list(range(1, 61))
    assert all(b["spostamento"] > a["spostamento"] for a, b in zip(passi, passi[1:]))
    # passo costante di 1 mm: la gravità sposta il nodo di controllo prima che la spinta
    # cominci, quindi lo spostamento non è il numero del passo — l'incremento sì
    assert all(b["spostamento"] - a["spostamento"] == pytest.approx(1.0, abs=1e-9)
               for a, b in zip(passi, passi[1:]))
    assert all(p["incremento"] == 1.0 for p in passi)
    # nessun `nan` in tutta la curva, spostamenti dei nodi compresi
    assert all(x is not None for p in passi for x in (p["spostamento"], p["taglio_base"]))
    assert all(x is not None for p in passi for v in p["spostamenti"].values() for x in v)
    # l'equilibrio per passo, letto dal recorder e non dal JSON che lo compone
    R = np.loadtxt(cartella / "push_reazioni.out")
    tag = {int(k): v for k, v in ris["run"]["mappa_tag"]["nodo"].items()}
    vincolati = [tag[1], tag[2], tag[3]]
    for k, p in enumerate(passi):
        atteso = -sum(R[k, 1 + 6 * (t - 1)] for t in vincolati)
        assert p["taglio_base"] == pytest.approx(atteso, rel=1e-6, abs=1e-6), k


def test_il_taglio_alla_base_smette_di_crescere_prima_dei_sessanta_millimetri(uniforme):
    """Il ramo calante: massimo 90 901 N al passo 14 su 60, e 83 668 N all'ultimo — misurato il
    05/09/2026 (OpenSees 3.8.0). Il test pinza «il massimo non è l'ultimo passo», che è la
    proprietà che vale anche se i numeri cambiano; i numeri stanno nel report."""
    passi = uniforme[0]["risultati"]["passi"]
    tagli = [p["taglio_base"] for p in passi]
    assert tagli.index(max(tagli)) < len(tagli) - 1
    assert tagli[-1] < max(tagli)


def test_la_pushover_che_arriva_in_fondo_e_una_convergenza_passata(uniforme):
    ris = uniforme[0]["risultati"]
    v = next(x for x in ris["verdetti"] if x["controllo"] == "convergenza" and x["caso"] == "pushover")
    assert v["esito"] == "passato"
    assert v["valori"]["spostamento"] == pytest.approx(60.0, abs=1.0)


def test_lo_stato_delle_sezioni_parte_elastico_e_finisce_fessurato(uniforme):
    """Al passo 1 tutto elastico; a 60 mm il telaio ha fessurato e i piedi dei pilastri hanno
    snervato — misurato il 05/09/2026, OpenSees 3.8.0. Il test pinza le due proprietà."""
    passi = uniforme[0]["risultati"]["passi"]
    primo, ultimo = passi[0]["stato_sezioni"], passi[-1]["stato_sezioni"]
    assert primo, "lo stato delle sezioni non è stato composto"
    assert {s["calcestruzzo"] for st in primo.values() for s in st} == {"elastica"}
    assert {s["acciaio"] for st in primo.values() for s in st} == {"elastica"}
    assert "fessurata" in {s["calcestruzzo"] for st in ultimo.values() for s in st}
    assert "snervata" in {s["acciaio"] for st in ultimo.values() for s in st}
    # il piede del pilastro 1 è la stazione 0 dell'asta 1
    assert ultimo["1"][0]["calcestruzzo"] in ("fessurata", "schiacciata")


def test_lo_stato_delle_sezioni_della_statica_a_fibre_e_quello_dell_ultimo_passo(uniforme):
    """Task 2 aveva rinviato qui `per_caso[caso].stato_sezioni`: sotto il solo peso proprio il
    telaio non fessura, e tutte le stazioni restano elastiche."""
    per_caso = uniforme[0]["risultati"]["per_caso"]["Z3"]
    stato = per_caso["stato_sezioni"]
    assert set(stato) == set(per_caso["sollecitazioni"])
    assert all(len(stato[a]) == len(per_caso["sollecitazioni"][a]) for a in stato)
    assert {s["calcestruzzo"] for st in stato.values() for s in st} == {"elastica"}


def test_la_dimensione_del_json_dei_passi_sta_sotto_il_mezzo_megabyte(uniforme):
    """La misura che Task 4 usa per decidere il campionamento: 60 passi × (6 nodi × 6 dof +
    5 aste × 5 stazioni × 2 canali). Misurato il 05/09/2026; il tetto è largo, non stretto."""
    r, cartella = uniforme
    byte = (cartella / corsa.NOME_RISULTATI).stat().st_size
    solo_passi = len(json.dumps(r["risultati"]["passi"], ensure_ascii=False))
    assert solo_passi < 500_000, solo_passi
    assert byte < 1_000_000, byte


def test_uno_spostamento_troncato_nomina_il_file_e_il_passo(uniforme, tmp_path):
    """Un recorder interrotto a metà scrittura non è uno spostamento nullo: `passi.leggi` lo
    dichiara con il file e il passo, e `corsa` lo rende «errore fase solutore»."""
    r, cartella = uniforme
    m = _modello.assicura_peso_proprio(_modello.carica(_modello_pushover()))
    d = _deck.scrivi(m, ["Z3"], tmp_path)
    for f in [*cartella.glob("*.out"), cartella / "13_solver.log"]:
        (tmp_path / f.name).write_bytes(f.read_bytes())
    righe = (tmp_path / "push_spostamenti.out").read_text().splitlines()
    campi = righe[2].split()
    campi[3] = "nan"
    righe[2] = " ".join(campi)
    (tmp_path / "push_spostamenti.out").write_text("\n".join(righe) + "\n")
    with pytest.raises(ValueError, match=r"push_spostamenti\.out.*passo 3"):
        _passi.leggi(tmp_path, d)


def test_la_caduta_si_dichiara_e_la_curva_resta(tmp_path, binario_opensees):
    """Il telaio 2×1 regge molto più di quel che ha senso chiedergli: `Steel02` non ha rottura
    e `Concrete02` tiene la resistenza residua `fpcu`, quindi a 60 mm non cade nessuno. Cade a
    675 mm, misurato il 05/09/2026 (OpenSees 3.8.0) spingendo a 25 mm per passo verso i 5 000.
    Il numero pinzato non è il 675: è che la caduta è un **fatto** nel JSON, l'esito resta `ok`
    e il rosso è `convergenza`."""
    r = _corri(tmp_path, _modello_pushover(incremento=25.0, spostamento_max=5000.0))
    assert r["esito"] == "ok", r
    ris = r["risultati"]
    caduta = ris["caduta"]
    assert caduta is not None and ris["passi"], ris.get("caduta")
    assert caduta["passo"] == len(ris["passi"]) + 1
    assert 0.0 < caduta["spostamento"] < 5000.0
    assert caduta["algoritmo"] in _deck.SCALA_ALGORITMI
    v = next(x for x in ris["verdetti"] if x["controllo"] == "convergenza" and x["caso"] == "pushover")
    assert v["esito"] == "non_passato"
    assert f"caduta al passo {caduta['passo']}" in v["ragione"]
    assert "ultimo algoritmo" in v["ragione"]


def test_i_passi_max_raggiunti_sono_una_caduta_dichiarata(tmp_path, binario_opensees):
    r = _corri(tmp_path, _modello_pushover(passi_max=5))
    assert r["esito"] == "ok", r
    ris = r["risultati"]
    assert len(ris["passi"]) == 5
    assert ris["caduta"]["motivo"] == "passi_max"
    v = next(x for x in ris["verdetti"] if x["controllo"] == "convergenza" and x["caso"] == "pushover")
    assert v["esito"] == "non_passato"


def test_un_incremento_piu_grande_dello_spostamento_max_e_un_passo_solo(tmp_path, binario_opensees):
    r = _corri(tmp_path, _modello_pushover(incremento=20.0, spostamento_max=10.0))
    assert r["esito"] == "ok", r
    passi = r["risultati"]["passi"]
    assert len(passi) == 1 and passi[0]["spostamento"] > 10.0
    assert r["risultati"]["caduta"] is None


def test_la_sezione_senza_barre_lascia_il_canale_acciaio_a_null(tmp_path, binario_opensees):
    """Senza barre non c'è acciaio da giudicare: `null`, che non è «elastica». Serve `forza`
    perché `armatura_mancante` rifiuta — e deve rifiutare — una corsa a fibre così."""
    dati = _modello_pushover()
    dati["sezioni"][0]["file"] = []
    r = _corri(tmp_path, dati, forza=True)
    assert r["esito"] == "ok", r
    stato = r["risultati"]["passi"][0]["stato_sezioni"]
    assert all(s["acciaio"] is None for s in stato["1"])       # pilastro, sezione 1
    assert all(s["acciaio"] == "elastica" for s in stato["4"])  # trave, sezione 2


def test_la_distribuzione_modo1_gira_davvero_sul_binario(tmp_path, binario_opensees):
    """`nodeEigenvector` dentro il `.tcl` non lo prova nessun test sul deck: o `eigen` ha girato
    prima e la spinta ha una forma, o la corsa muore a metà. Misurato il 05/09/2026 (OpenSees
    3.8.0): 20 passi da 2 mm, f₁ = 5,8187 Hz, taglio finale 90 654 N."""
    dati = _modello_pushover(distribuzione="modo1", incremento=2.0, spostamento_max=40.0)
    dati["analisi"].append({"tipo": "modale", "modi": 3})
    r = _corri(tmp_path, dati)
    assert r["esito"] == "ok", r
    ris = r["risultati"]
    assert len(ris["passi"]) == 20 and ris["caduta"] is None
    assert ris["modi"][0]["f"] == pytest.approx(5.8187, rel=1e-3)
    assert ris["passi"][-1]["taglio_base"] > 0.0
