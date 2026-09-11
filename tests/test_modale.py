"""La modale: letture dal file di modalProperties, ciclo C2, forma dei risultati."""
import json
import math

import pytest

from conftest import FIXTURE, leggi_fixture
from nova import modale, modello


def _con_massa_modale(tmp_path):
    (tmp_path / "massa_modale.out").write_bytes((FIXTURE / "massa_modale_telaio_2x1.out").read_bytes())


def test_leggi_frequenze_e_masse_dal_file_vero(tmp_path):
    """Forme vere, non scritte dal test: `modo_1.out` è quello della stessa corsa del
    05/09/2026. `-unorm` normalizza sul massimo di **tutti e sei** i gradi di libertà,
    rotazioni comprese, mentre il registratore scrive i soli `-dof 1 2 3`: il massimo
    traslazionale del primo modo vale 0,499046, non 1. Asserirlo sul file vero è l'unico
    modo di accorgersi se un giorno `leggi` riscalasse le forme."""
    _con_massa_modale(tmp_path)
    n = 6
    (tmp_path / "modo_1.out").write_bytes((FIXTURE / "modo_1_telaio_2x1.out").read_bytes())
    for k in (2, 3):
        (tmp_path / f"modo_{k}.out").write_text(" ".join(["0.5"] * (3 * n)) + "\n")
    modi = modale.leggi(tmp_path, 3, {t: t for t in range(1, n + 1)})
    assert [m["n"] for m in modi] == [1, 2, 3]
    assert modi[0]["f"] > 0 and modi[0]["T"] == pytest.approx(1 / modi[0]["f"])
    assert 0 <= modi[0]["massa_partecipante"]["x"] <= 1
    assert modi[2]["cumulata"]["x"] >= modi[0]["cumulata"]["x"]
    massimo = max(abs(v) for xyz in modi[0]["forma"].values() for v in xyz)
    assert massimo == pytest.approx(0.499046, abs=1e-6)


def test_le_frequenze_sono_quelle_misurate_sul_telaio_2x1(tmp_path):
    """Misura del 05/09/2026, OpenSees 3.8.0: 5,79829 / 8,70049 / 10,9984 Hz."""
    _con_massa_modale(tmp_path)
    for k in range(1, 4):
        (tmp_path / f"modo_{k}.out").write_text(" ".join(["0.0"] * 18) + "\n")
    modi = modale.leggi(tmp_path, 3, {t: t for t in range(1, 7)})
    assert [m["f"] for m in modi] == [pytest.approx(x) for x in (5.79829, 8.70049, 10.9984)]
    # frazioni 0-1, non percento: il file porta 99,999 % sulla x cumulata al terzo modo
    assert modi[2]["cumulata"]["x"] == pytest.approx(0.99999)
    assert modi[2]["cumulata"]["z"] == pytest.approx(1.52392e-07)


def test_senza_blocco_cumulato_nessun_modo(tmp_path):
    (tmp_path / "massa_modale.out").write_text("niente di utile\n")
    assert modale.leggi(tmp_path, 3, {1: 1}) == []


def test_modo_troncato_nomina_il_file(tmp_path):
    _con_massa_modale(tmp_path)
    (tmp_path / "modo_1.out").write_text("1.0 0.0\n")
    with pytest.raises(ValueError, match="modo_1.out"):
        modale.leggi(tmp_path, 1, {t: t for t in range(1, 7)})


def test_massa_modale_assente_nomina_il_file(tmp_path):
    """Assente non è «nessun modo»: è una corsa che non ha scritto, e `esegui` la rende
    «errore fase solutore» perché `OSError` risale."""
    with pytest.raises(OSError, match="massa_modale.out"):
        modale.leggi(tmp_path, 3, {1: 1})


def test_i_nodi_intermedi_non_scalano_la_forma(tmp_path):
    """Il registratore scrive tutti i nodi del deck, non i soli nodi del modello: con
    un'asta suddivisa `3·len(tag_a_id)` sarebbe il conteggio sbagliato."""
    _con_massa_modale(tmp_path)
    (tmp_path / "modo_1.out").write_text(" ".join(["0.5"] * 30) + "\n")  # 10 nodi nel deck
    modi = modale.leggi(tmp_path, 1, {t: t for t in range(1, 7)}, n_nodi=10)
    assert set(modi[0]["forma"]) == {"1", "2", "3", "4", "5", "6"}


def test_direzioni_con_massa_sul_telaio_2x1():
    """I nodi 4, 5 e 6 non portano vincolo: le tre traslazioni sono tutte libere."""
    m = modello.carica(leggi_fixture("telaio_2x1.nova.json"))
    assert modale.direzioni_con_massa(m) == ("x", "y", "z")


def test_direzioni_con_massa_esclude_la_direzione_bloccata_ovunque():
    m = leggi_fixture("telaio_2x1.nova.json")
    for n in m["nodi"]:
        n.setdefault("vincolo", {})["uy"] = True
    assert modale.direzioni_con_massa(modello.carica(m)) == ("x", "z")


def test_abbastanza_guarda_solo_le_direzioni_con_massa():
    modi = [{"cumulata": {"x": 0.9, "y": 0.0, "z": 0.86}}]
    assert modale.abbastanza(modi, ("x", "z"))
    assert not modale.abbastanza(modi, ("x", "y", "z"))
    assert not modale.abbastanza([], ("x",))


def test_abbastanza_ignora_la_cumulata_del_modo_senza_frequenza_fisica():
    """Review su #65: `modi[-1]` non è più «l'ultimo modo», è «l'ultimo modo buono» -- un
    modo con `f: None` in coda non deve far passare una direzione che il modo vero non
    raggiunge."""
    modi = [{"f": 5.0, "cumulata": {"x": 0.5, "y": 0.0, "z": 0.5}},
            {"f": None, "cumulata": {"x": 1.0, "y": 1.0, "z": 1.0}}]
    assert not modale.abbastanza(modi, ("x",))
    assert not modale.abbastanza([{"f": None, "cumulata": {"x": 1.0}}], ("x",))


def test_i_gradi_liberi_sono_il_tetto_dei_modi():
    """Telaio 2×1: tre nodi incastrati, tre liberi, nove traslazioni con massa."""
    m = modello.carica(leggi_fixture("telaio_2x1.nova.json"))
    assert modale.gradi_liberi(m) == 9


def test_i_gradi_liberi_non_contano_il_nodo_che_nessuna_asta_tocca():
    """`nodo_libero` ha il nodo 7 scollegato: nessuna asta gli dà massa, e i suoi tre gradi
    non portano nessun modo. Contarli alzava il tetto di «auto» sopra i modi che il problema
    generalizzato ha davvero, e l'ultimo tentativo faceva uscire OpenSees (codice −5,
    misurato il 05/09/2026)."""
    m = modello.carica(leggi_fixture("nodo_libero.nova.json"))
    assert modale.gradi_liberi(m) == 9


def test_direzioni_con_massa_ignora_il_nodo_senza_massa():
    """`nodo_libero` col solo nodo 7 scollegato libero in y: la y non ha massa da catturare,
    e contarla mandava «auto» su tutta la scala per poi bocciare una direzione vuota."""
    m = leggi_fixture("nodo_libero.nova.json")
    for n in m["nodi"]:
        if n["id"] != 7:
            n.setdefault("vincolo", {})["uy"] = True
    assert modale.direzioni_con_massa(modello.carica(m)) == ("x", "z")


def test_i_gradi_liberi_contano_i_nodi_delle_suddivisioni():
    """`deck.scrivi` crea i nodi interni delle `suddivisioni`, dà `-mass` a ogni elemento e
    scrive `fix` per i soli nodi dichiarati: quei nodi hanno massa e tutti e tre i gradi
    liberi. Non contarli teneva il tetto di «auto» sotto i modi che il problema generalizzato
    ha davvero, e la massa modale non arrivava mai all'85 % su un modello sano."""
    m = leggi_fixture("telaio_2x1.nova.json")
    for a in m["aste"]:
        a["suddivisioni"] = 4
    # nove traslazioni dichiarate libere + cinque aste × tre nodi interni × tre gradi
    assert modale.gradi_liberi(modello.carica(m)) == 9 + 45


# --- issue #65: una frequenza non finita non deve entrare in `modi[]` come `nan` ---

_MODALPROPERTIES_CON_NAN = (
    "* 2. EIGENVALUE ANALYSIS:\n"
    "#          MODE        LAMBDA         OMEGA     FREQUENCY        PERIOD\n"
    "              1           nan           nan           nan           nan\n"
    "              2       2988.46       54.6668       8.70049      0.114936\n"
    "\n\n"
    "* 9. MODAL PARTICIPATION MASS RATIOS (%):\n"
    "#          MODE            MX            MY            MZ           RMX           RMY           RMZ\n"
    "              1             0          50.0             0             0             0             0\n"
    "              2             0          50.0             0             0             0             0\n"
    "\n\n"
    "* 10. MODAL PARTICIPATION MASS RATIOS (%) (cumulative):\n"
    "#          MODE            MX            MY            MZ           RMX           RMY           RMZ\n"
    "              1             0          50.0             0             0             0             0\n"
    "              2             0         100.0             0             0             0             0\n"
)


def test_una_frequenza_non_finita_non_lascia_nan_nei_modi(tmp_path):
    """issue #65: con un autovalore λ negativo (rigidezza tangente non definita positiva,
    tipico dopo una pushover) OpenSees scrive `nan` nella colonna FREQUENCY.
    `opensees.leggi_frequenze` (meshrec, non si tocca) la legge com'è -- `float('nan')`
    non solleva. Un modo così non deve restare un `nan` in `modi[]`: JSON non ce l'ha, e
    `json.dumps` lo scrive come `NaN`, che il browser rifiuta (misurato: oggi
    `modi[0]['f']` è `nan` e `json.dumps(modi, allow_nan=False)` solleva `ValueError`)."""
    (tmp_path / "massa_modale.out").write_text(_MODALPROPERTIES_CON_NAN)
    for k in (1, 2):
        (tmp_path / f"modo_{k}.out").write_text(" ".join(["0.0"] * 18) + "\n")
    modi = modale.leggi(tmp_path, 2, {t: t for t in range(1, 7)})
    assert not any(f is not None and (math.isnan(f) or math.isinf(f))
                   for f in (m["f"] for m in modi))
    json.dumps(modi, allow_nan=False)  # non deve sollevare: nessun nan/inf residuo


def test_direzioni_con_massa_vede_la_direzione_libera_sui_soli_nodi_interni():
    """`uy` bloccato su ogni nodo **dichiarato**, ma i nodi interni delle suddivisioni restano
    liberi e portano la massa dell'elemento: in y c'è massa da catturare, e chiuderla fuori
    voleva dire non chiedere l'85 % a una direzione in cui il telaio si muove."""
    m = leggi_fixture("telaio_2x1.nova.json")
    for n in m["nodi"]:
        n.setdefault("vincolo", {})["uy"] = True
    for a in m["aste"]:
        a["suddivisioni"] = 4
    assert modale.direzioni_con_massa(modello.carica(m)) == ("x", "y", "z")
