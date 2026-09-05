"""La modale: letture dal file di modalProperties, ciclo C2, forma dei risultati."""
import pytest

from conftest import FIXTURE, leggi_fixture
from nova import modale, modello


def _con_massa_modale(tmp_path):
    (tmp_path / "massa_modale.out").write_bytes((FIXTURE / "massa_modale_telaio_2x1.out").read_bytes())


def test_leggi_frequenze_e_masse_dal_file_vero(tmp_path):
    _con_massa_modale(tmp_path)
    n = 6
    for k in range(1, 4):  # forme finte: 3 valori per nodo, modo 1 con massimo unitario
        (tmp_path / f"modo_{k}.out").write_text(" ".join("1.0" if i == 0 else "0.5" for i in range(3 * n)) + "\n")
    modi = modale.leggi(tmp_path, 3, {t: t for t in range(1, n + 1)})
    assert [m["n"] for m in modi] == [1, 2, 3]
    assert modi[0]["f"] > 0 and modi[0]["T"] == pytest.approx(1 / modi[0]["f"])
    assert 0 <= modi[0]["massa_partecipante"]["x"] <= 1
    assert modi[2]["cumulata"]["x"] >= modi[0]["cumulata"]["x"]
    assert max(abs(v) for xyz in modi[0]["forma"].values() for v in xyz) == pytest.approx(1.0)


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
