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


# --- fix round 1 ------------------------------------------------------------

def _scrivi(tmp_path, nome: str, testo: str) -> Path:
    p = tmp_path / nome
    p.write_text(testo, encoding="ascii")
    return p


def test_la_quota_conta_solo_i_nodi_bloccati_in_z(tmp_path):
    """`*BOUNDARY` porta i dof: un vincolo di simmetria (1,2) non regge il peso, e contarlo
    nella quota tributaria gonfierebbe il peso atteso con nodi che in z sono liberi."""
    testo = TRAVE.read_text(encoding="ascii")
    simmetria = "*NSET, NSET=SIMM\n" + ", ".join(str(n) for n in range(301, 316)) + "\n"
    p = _scrivi(tmp_path, "dof.inp", testo.replace(
        "*BOUNDARY\nBASE, 1, 3\n", simmetria + "*BOUNDARY\nBASE, 3, 3\nSIMM, 1, 2\n"))
    d = _inp.leggi(p)
    assert d.vincoli == [("BASE", 3, 3), ("SIMM", 1, 2)]
    assert d.vincolati == _inp.leggi(TRAVE).set_nodi["BASE"]   # `SIMM` non è bloccato in z
    assert d.quota_vincolati == pytest.approx(0.00127465, rel=1e-9)


def test_ogni_passo_porta_il_proprio_g(tmp_path):
    """`g` del passo, non il primo `GRAV` del file: un deck che apre con la spinta a 0,1 g
    darebbe 981 al passo del peso proprio, e il peso atteso sbaglierebbe di dieci volte."""
    p = _scrivi(tmp_path, "ordine.inp",
                "** NOME PASSO: SPINTA\n*STEP\n*STATIC\n*DLOAD\nA, GRAV, 981.0, 0.0, 1.0, 0.0\n*END STEP\n"
                "** NOME PASSO: GRAVITA\n*STEP\n*STATIC\n*DLOAD\nA, GRAV, 9810.0, 0.0, 0.0, -1.0\n*END STEP\n")
    d = _inp.leggi(p)
    assert [x.g for x in d.passi] == [981.0, 9810.0]
    assert [x.gravita for x in d.passi] == [False, True]
    assert d.g == 981.0  # il primo del file, per la sola provenienza


@pytest.mark.parametrize("prima", ["C3D4", "T3D2"])
def test_una_mesh_di_tipi_misti_non_ha_volume(tmp_path, prima):
    """Due `*ELEMENT` di tipo diverso: il volume non si calcola, e non deve nemmeno provarci
    (numpy solleverebbe sulle righe di lunghezza diversa, dopo la corsa)."""
    dopo = "T3D2" if prima == "C3D4" else "C3D4"
    quattro, due = "1, 1, 2, 3, 4\n", "2, 1, 2\n"
    p = _scrivi(tmp_path, f"misto_{prima}.inp",
                "*NODE\n1, 0.0, 0.0, 0.0\n2, 1.0, 0.0, 0.0\n3, 0.0, 1.0, 0.0\n4, 0.0, 0.0, 1.0\n"
                f"*ELEMENT, TYPE={prima}, ELSET=A\n{quattro if prima == 'C3D4' else due}"
                f"*ELEMENT, TYPE={dopo}, ELSET=B\n{due if prima == 'C3D4' else quattro}"
                "*DENSITY\n2.5e-09\n*STEP\n*STATIC\n*END STEP\n")
    d = _inp.leggi(p)
    assert d.tipo_elemento == "C3D4+T3D2" and d.n_elementi == 2
    assert d.volume is None and d.massa is None and d.quota_vincolati is None


def test_i_nomi_dei_set_non_distinguono_le_maiuscole(tmp_path):
    """`ccx` risolve gli `*NSET` senza distinguere il caso (`meshrec/core/config.py:43-55`)."""
    p = _scrivi(tmp_path, "caso.inp",
                "*NSET, NSET=Base\n1, 2\n*BOUNDARY\nBASE, 1, 3\n*STEP\n*STATIC\n*END STEP\n")
    d = _inp.leggi(p)
    assert list(d.set_nodi) == ["BASE"] and d.vincolati == [1, 2]


def test_una_pressione_toglie_il_passo_dai_gravitazionali(tmp_path):
    p = _scrivi(tmp_path, "pressione.inp",
                "*STEP\n*STATIC\n*DLOAD\nA, GRAV, 9810.0, 0.0, 0.0, -1.0\n"
                "*DSLOAD\nA, P1, 0.5\n*END STEP\n")
    assert _inp.leggi(p).passi[0].gravita is False


def test_due_passi_con_lo_stesso_nome_sono_un_rifiuto(tmp_path):
    p = _scrivi(tmp_path, "doppio.inp",
                "** NOME PASSO: GRAVITA\n*STEP\n*STATIC\n*END STEP\n"
                "** NOME PASSO: GRAVITA\n*STEP\n*STATIC\n*END STEP\n")
    with pytest.raises(ValueError) as e:
        _inp.leggi(p)
    assert "duplicato" in str(e.value) and "GRAVITA" in str(e.value)


# --- gap review pre-merge (Task 3) -------------------------------------------

def test_boundary_su_set_inesistente_non_solleva(tmp_path):
    """`*BOUNDARY` che nomina un set mai dichiarato (refuso nel nome): il vincolo resta
    registrato ma non blocca nessun nodo, nessuna `KeyError` — `vincolati` usa già
    `set_nodi.get(nome, ())` proprio per questo."""
    p = _scrivi(tmp_path, "set_fantasma.inp",
                "*BOUNDARY\nFANTASMA, 1, 3\n*STEP\n*STATIC\n*END STEP\n")
    d = _inp.leggi(p)
    assert d.vincoli == [("FANTASMA", 1, 3)]
    assert d.vincolati == []


def test_nset_dichiarato_due_volte_si_unisce(tmp_path):
    """Due carte `*NSET` separate con lo stesso nome (non una riga continuata): i numeri
    si sommano nello stesso set, `_carta` non azzera niente fra le due."""
    p = _scrivi(tmp_path, "doppio_nset.inp",
                "*NSET, NSET=TOP\n1, 2\n*NSET, NSET=TOP\n3, 4\n*STEP\n*STATIC\n*END STEP\n")
    assert _inp.leggi(p).set_nodi["TOP"] == [1, 2, 3, 4]


def test_elemento_su_due_righe_con_virgola_finale_si_concatena(tmp_path):
    """`*ELEMENT` che finisce in virgola: il tetraedro continua sulla riga dopo, non è un
    elemento a sé — senza `continua` la riga dopo diventerebbe un secondo elemento con un
    solo nodo."""
    p = _scrivi(tmp_path, "elemento_continua.inp",
                "*NODE\n1, 0.0, 0.0, 0.0\n2, 1.0, 0.0, 0.0\n3, 0.0, 1.0, 0.0\n4, 0.0, 0.0, 1.0\n"
                "*ELEMENT, TYPE=C3D4, ELSET=A\n1, 1, 2,\n3, 4\n"
                "*DENSITY\n2.5e-09\n*STEP\n*STATIC\n*END STEP\n")
    d = _inp.leggi(p)
    assert d.n_elementi == 1 and d.elementi == [(1, 2, 3, 4)]


# --- ondata finale: carte pericolose, tetto di GENERATE, materiali, righe lunghe ----

@pytest.mark.parametrize("carta", ["*INCLUDE, INPUT=x.inp", "*Include, input=x.inp",
                                   "*RESTART, READ", "*RESTART, WRITE", "*USER MATERIAL, CONSTANTS=2"])
def test_le_carte_che_portano_dentro_file_o_codice_sono_rifiutate(tmp_path, carta):
    """`ccx` esegue il deck com'è: `*INCLUDE` gli fa leggere un file che il parser non vede,
    `*RESTART` uno stato di un'altra corsa, `*USER MATERIAL` codice compilato dall'utente.
    Ignorarle qui vorrebbe dire lasciarle passare al solutore senza che nessuno le guardi."""
    p = _scrivi(tmp_path, "vietata.inp", f"{carta}\n*STEP\n*STATIC\n*END STEP\n")
    with pytest.raises(ValueError) as e:
        _inp.leggi(p)
    assert "non ammessa" in str(e.value) and carta.split(",")[0][1:].upper() in str(e.value)


def test_nset_generate_oltre_il_tetto_e_un_rifiuto_non_una_lista_da_dieci_miliardi(tmp_path):
    p = _scrivi(tmp_path, "enorme.inp",
                "*NSET, NSET=TUTTI, GENERATE\n1, 10000000000, 1\n*STEP\n*STATIC\n*END STEP\n")
    with pytest.raises(ValueError) as e:
        _inp.leggi(p)
    assert "tetto" in str(e.value) and "10 M" in str(e.value)


def test_nset_generate_con_salto_zero_e_un_rifiuto_non_un_range_che_esplode(tmp_path):
    p = _scrivi(tmp_path, "salto.inp",
                "*NSET, NSET=A, GENERATE\n1, 9, 0\n*STEP\n*STATIC\n*END STEP\n")
    with pytest.raises(ValueError) as e:
        _inp.leggi(p)
    assert "salto" in str(e.value)


def test_nset_generate_con_inizio_oltre_la_fine_e_un_set_vuoto(tmp_path):
    """Riga: «GENERATE con `inizio > fine` → lista vuota, nessuna eccezione, nessun tetto»."""
    p = _scrivi(tmp_path, "vuoto_gen.inp",
                "*NSET, NSET=A, GENERATE\n9, 1, 1\n*STEP\n*STATIC\n*END STEP\n")
    assert _inp.leggi(p).set_nodi["A"] == []


def test_due_materiali_lasciano_la_massa_nulla(tmp_path):
    """Due `*MATERIAL` nel deck: la prima `*DENSITY` non è la densità di tutto il solido, e
    ρ·V sarebbe un numero plausibile e sbagliato."""
    p = _scrivi(tmp_path, "due_materiali.inp",
                "*NODE\n1, 0.0, 0.0, 0.0\n2, 1.0, 0.0, 0.0\n3, 0.0, 1.0, 0.0\n4, 0.0, 0.0, 1.0\n"
                "*ELEMENT, TYPE=C3D4, ELSET=A\n1, 1, 2, 3, 4\n"
                "*MATERIAL, NAME=CLS\n*DENSITY\n2.5e-09\n"
                "*MATERIAL, NAME=ACCIAIO\n*DENSITY\n7.85e-09\n*STEP\n*STATIC\n*END STEP\n")
    d = _inp.leggi(p)
    assert d.n_materiali == 2 and d.densita is None and d.massa is None
    assert d.volume is not None  # il volume resta: è della mesh, non del materiale


def test_una_densita_senza_carta_material_resta_presa(tmp_path):
    """Riga: «deck con zero carte `*MATERIAL` ma una `*DENSITY` → densità presa»."""
    p = _scrivi(tmp_path, "senza_material.inp",
                "*DENSITY\n2.5e-09\n*STEP\n*STATIC\n*END STEP\n")
    d = _inp.leggi(p)
    assert d.n_materiali == 0 and d.densita == pytest.approx(2.5e-09)


def test_una_riga_di_dati_lunghissima_non_finisce_intera_nel_messaggio(tmp_path):
    p = _scrivi(tmp_path, "lunga.inp", "*NODE\n" + ", ".join(["boh"] * 200) + "\n")
    with pytest.raises(ValueError) as e:
        _inp.leggi(p)
    letta = str(e.value).split("Riga letta: ", 1)[1]
    assert letta.endswith("…'") and len(letta) < 100


def test_boundary_dentro_un_passo_non_conta_fra_i_vincoli_globali(tmp_path):
    """Un `*BOUNDARY` dentro `*STEP` è del passo, non del modello: contarlo nella quota
    tributaria gonfierebbe il peso atteso di tutti i passi."""
    testo = TRAVE.read_text(encoding="ascii")
    dentro = testo.replace("*STEP\n*STATIC\n*DLOAD, OP=NEW\n",
                           "*STEP\n*STATIC\n*BOUNDARY\nTOP, 1, 3\n*DLOAD, OP=NEW\n", 1)
    p = _scrivi(tmp_path, "vincolo_nel_passo.inp", dentro)
    d = _inp.leggi(p)
    atteso = _inp.leggi(TRAVE)
    assert d.vincoli == atteso.vincoli
    assert d.quota_vincolati == pytest.approx(atteso.quota_vincolati, rel=1e-12)


# --- fix round C -------------------------------------------------------------

_BASE_UN_TETRAEDRO = (
    "*NODE\n1, 0.0, 0.0, 0.0\n2, 1.0, 0.0, 0.0\n3, 0.0, 1.0, 0.0\n4, 0.0, 0.0, 1.0\n"
    "*ELEMENT, TYPE=C3D4, ELSET=A\n1, 1, 2, 3, 4\n"
    "*MATERIAL, NAME=CLS\n*DENSITY\n2.5e-09\n"
)


def test_boundary_solo_nel_passo_lascia_la_quota_non_calcolabile(tmp_path):
    """F3: `*BOUNDARY` visto solo dentro `*STEP` (mai come vincolo globale, C11) lascia
    `vincoli` vuoto: 0,0 sarebbe un peso atteso sbagliato per difetto (il verdetto reazioni
    fallirebbe per un motivo che non è del modello), non un numero vero."""
    p = _scrivi(tmp_path, "boundary_solo_nel_passo.inp", _BASE_UN_TETRAEDRO +
                "*STEP\n*STATIC\n*BOUNDARY\nTOP, 1, 3\n*END STEP\n")
    d = _inp.leggi(p)
    assert d.vincoli == [] and d.massa is not None
    assert d.quota_vincolati is None


def test_deck_senza_alcun_boundary_resta_come_prima(tmp_path):
    """Riga degenere di F3: senza `*BOUNDARY` da nessuna parte (né globale né nei passi) la
    quota resta 0,0 come sempre — la nuova regola scatta solo se un passo lo portava."""
    p = _scrivi(tmp_path, "senza_boundary.inp", _BASE_UN_TETRAEDRO +
                "*STEP\n*STATIC\n*END STEP\n")
    d = _inp.leggi(p)
    assert d.vincoli == [] and not d.boundary_nel_passo
    assert d.quota_vincolati == 0.0
