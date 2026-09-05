"""Il parser del deck `.inp` di ccx, sulla fixture generata e sul deck vero se c'è.

Ogni test è ancorato a una riga di «Ingressi degeneri» del brief Task 1; la mappa
riga → test sta nel report.
"""
import sys
from pathlib import Path

import pytest

from conftest import FIXTURE

sys.path.insert(0, str(FIXTURE / "solido_piccolo"))
import genera  # noqa: E402  (il generatore della fixture, non un modulo di nova)

from nova import inp as _inp  # noqa: E402

TRAVE = FIXTURE / "solido_piccolo" / "trave.inp"
DECK_VERO = Path(__file__).resolve().parents[1] / "lab_telaio_v2" / "wall_model.inp"


def _deck_vero():
    if not DECK_VERO.is_file():
        pytest.skip(f"{DECK_VERO} non c'è (2,5 MB, non versionato): la corsa vera non si prova qui")
    return _inp.leggi(DECK_VERO)


# --- il generatore della fixture --------------------------------------------

def test_il_generatore_riscrive_la_fixture_byte_per_byte(tmp_path):
    """La fixture sta nel repo, il generatore è la sua provenienza: devono coincidere."""
    assert genera.scrivi(tmp_path).read_bytes() == TRAVE.read_bytes()


def test_la_fixture_ha_il_volume_del_parallelepipedo():
    assert _inp.leggi(TRAVE).volume == pytest.approx(200.0 * 100.0 * 1000.0, rel=1e-12)


# --- la forma del deck ------------------------------------------------------

def test_i_passi_prendono_il_nome_dal_commento():
    d = _inp.leggi(TRAVE)
    assert [p.nome for p in d.passi] == ["GRAVITA", "SPINTA_ORIZZONTALE", "CARICO_TOP", "MODALE"]
    assert [p.tipo for p in d.passi] == ["statico", "statico", "statico", "modale"]
    assert [p.n_modi for p in d.passi] == [None, None, None, 10]


def test_un_passo_senza_commento_prende_il_numero(tmp_path):
    p = tmp_path / "b.inp"
    p.write_text("*STEP\n*STATIC\n*END STEP\n*STEP\n*FREQUENCY\n3\n*END STEP\n", encoding="ascii")
    assert [x.nome for x in _inp.leggi(p).passi] == ["passo 1", "passo 2"]


def test_gravitazionale_e_solo_il_passo_col_peso_e_nientaltro():
    """`SPINTA_ORIZZONTALE` porta due `*DLOAD` e `CARICO_TOP` un `*CLOAD`: su quei passi
    la somma delle reazioni non è più il solo peso, e il verdetto non può fingere di sì."""
    assert [p.gravita for p in _inp.leggi(TRAVE).passi] == [True, False, False, False]


def test_set_di_nodi_materiale_e_gravita():
    d = _inp.leggi(TRAVE)
    assert d.set_nodi["BASE"] == sorted(d.set_nodi["BASE"]) and len(d.set_nodi["BASE"]) == 15
    assert len(d.set_nodi["TOP"]) == 15
    assert d.vincolati == d.set_nodi["BASE"]
    assert d.densita == pytest.approx(2.5493e-09) and d.elastico == (31500.0, 0.2)
    assert d.g == 9810.0
    assert (d.n_nodi, d.n_elementi, d.tipo_elemento) == (315, 960, "C3D4")


def test_massa_e_quota_tributaria_dei_vincolati():
    """Il peso che `ccx` **non** riporta nelle reazioni di `BASE`: un quarto del tetraedro
    a ogni suo nodo vincolato. Oracolo in forma chiusa, non un numero copiato dal solutore."""
    d = _inp.leggi(TRAVE)
    assert d.massa == pytest.approx(2.5493e-09 * 2.0e7, rel=1e-12)
    assert d.quota_vincolati == pytest.approx(0.00127465, rel=1e-9)


# --- `*NSET` nelle sue due forme -------------------------------------------

def test_nset_con_generate_viene_espanso(tmp_path):
    p = tmp_path / "g.inp"
    p.write_text("*NSET, NSET=SPIGOLO, GENERATE\n1, 9, 2\n*STEP\n*STATIC\n*END STEP\n", encoding="ascii")
    assert _inp.leggi(p).set_nodi["SPIGOLO"] == [1, 3, 5, 7, 9]


def test_nset_su_piu_righe_si_concatena(tmp_path):
    p = tmp_path / "m.inp"
    p.write_text("*NSET, NSET=TOP\n1, 2, 3\n4, 5\n*STEP\n*STATIC\n*END STEP\n", encoding="ascii")
    assert _inp.leggi(p).set_nodi["TOP"] == [1, 2, 3, 4, 5]


# --- ingressi degeneri ------------------------------------------------------

def test_un_deck_senza_step_dice_nessun_passo(tmp_path):
    p = tmp_path / "vuoto.inp"
    p.write_text("*HEADING\nniente passi\n", encoding="ascii")
    with pytest.raises(ValueError) as e:
        _inp.leggi(p)
    assert "nessun passo" in str(e.value) and str(p) in str(e.value)


def test_un_percorso_che_non_esiste_si_nomina(tmp_path):
    p = tmp_path / "no.inp"
    with pytest.raises(ValueError) as e:
        _inp.leggi(p)
    assert str(p) in str(e.value)


def test_una_cartella_non_e_un_deck(tmp_path):
    with pytest.raises(ValueError) as e:
        _inp.leggi(tmp_path)
    assert str(tmp_path) in str(e.value)


def test_un_file_binario_non_e_un_deck(tmp_path):
    p = tmp_path / "b.inp"
    p.write_bytes(b"\xff\xfe\x00\x01binario")
    with pytest.raises(ValueError) as e:
        _inp.leggi(p)
    assert str(p) in str(e.value)


def test_senza_densita_la_massa_e_nulla(tmp_path):
    p = tmp_path / "senza.inp"
    p.write_text(TRAVE.read_text(encoding="ascii").replace("*DENSITY\n2.5493e-09\n", ""), encoding="ascii")
    d = _inp.leggi(p)
    assert d.densita is None and d.massa is None and d.quota_vincolati is None
    assert d.volume == pytest.approx(2.0e7, rel=1e-12)  # il volume c'è lo stesso


def test_senza_nset_top_il_set_non_c_e(tmp_path):
    p = tmp_path / "senza_top.inp"
    testo = TRAVE.read_text(encoding="ascii")
    inizio = testo.index("*NSET, NSET=TOP")
    p.write_text(testo[:inizio] + testo[testo.index("*SOLID SECTION"):], encoding="ascii")
    assert "TOP" not in _inp.leggi(p).set_nodi


# --- il deck vero, se c'è ---------------------------------------------------

def test_deck_vero_mesh_massa_e_quota():
    d = _deck_vero()
    assert (d.n_nodi, d.n_elementi, d.tipo_elemento) == (14116, 51892, "C3D4")
    assert [p.nome for p in d.passi] == ["GRAVITA", "SPINTA_ORIZZONTALE", "CARICO_TOP", "MODALE"]
    assert [p.gravita for p in d.passi] == [True, False, False, False]
    assert d.g == 9810.0 and d.densita == pytest.approx(2.5493e-09)
    assert len(d.vincolati) == 3743 and len(d.set_nodi["TOP"]) == 3030
    assert d.volume == pytest.approx(2.17728627e08, rel=1e-8)   # 0,2177 m³
    assert d.massa == pytest.approx(0.5550556, rel=1e-6)        # t
    assert d.quota_vincolati == pytest.approx(0.1219690, rel=1e-6)
