"""Unità pure di `passi.py`: soglie di `_stato` e `_peggiore`, senza binario e senza modello.

`_stato` decide con `<=`/`>=`: un confine letto con lo stretto opposto (`<`/`>`) sposterebbe
una fibra fra `elastica` e la sua rottura senza che una corsa vera se ne accorga, perché nessun
passo tocca esattamente la soglia per caso. Il presente file lo tocca apposta.
"""
from nova import passi as _passi

# calcestruzzo: `epsU` negativo (compressione), `ft`/`Ec` positivo (trazione) — dal dizionario
# che esce da `legami._concrete02`
_PAR_CLS = {"epsU": -0.0035, "ft": 2.565, "Ec": 31475.0}
# acciaio: dal dizionario che esce da `legami.acciaio`
_PAR_ACC = {"eps_ud": 0.0675, "Fy": 450.0, "E": 200000.0}


def test_calcestruzzo_al_confine_esatto_di_epsU_e_gia_schiacciata():
    assert _passi._stato(_PAR_CLS["epsU"], _PAR_CLS, "calcestruzzo") == "schiacciata"
    assert _passi._stato(_PAR_CLS["epsU"] + 1e-9, _PAR_CLS, "calcestruzzo") == "elastica"


def test_calcestruzzo_al_confine_esatto_di_ft_su_ec_e_gia_fessurata():
    soglia = _PAR_CLS["ft"] / _PAR_CLS["Ec"]
    assert _passi._stato(soglia, _PAR_CLS, "calcestruzzo") == "fessurata"
    assert _passi._stato(soglia - 1e-9, _PAR_CLS, "calcestruzzo") == "elastica"


def test_calcestruzzo_fra_le_due_soglie_e_elastica_in_compressione_e_in_trazione():
    """Una compressione moderata (metà di `epsU`) non è `schiacciata`: il segno conta, e
    scambiare `<=` con `>=` su un valore negativo la manderebbe subito in rottura."""
    assert _passi._stato(0.0, _PAR_CLS, "calcestruzzo") == "elastica"
    assert _passi._stato(_PAR_CLS["epsU"] / 2, _PAR_CLS, "calcestruzzo") == "elastica"


def test_acciaio_al_confine_esatto_di_eps_ud_e_gia_rotta_in_entrambi_i_segni():
    assert _passi._stato(_PAR_ACC["eps_ud"], _PAR_ACC, "acciaio") == "rotta"
    assert _passi._stato(-_PAR_ACC["eps_ud"], _PAR_ACC, "acciaio") == "rotta"


def test_acciaio_al_confine_esatto_di_snervamento_e_gia_snervata():
    soglia = _PAR_ACC["Fy"] / _PAR_ACC["E"]
    assert _passi._stato(soglia, _PAR_ACC, "acciaio") == "snervata"
    assert _passi._stato(soglia - 1e-12, _PAR_ACC, "acciaio") == "elastica"


def test_peggiore_di_una_lista_vuota_e_none_non_un_errore():
    assert _passi._peggiore([], _passi.SCALA_CALCESTRUZZO) is None


def test_peggiore_prende_il_piu_grave_non_l_ultimo_letto():
    assert _passi._peggiore(["fessurata", "elastica"], _passi.SCALA_CALCESTRUZZO) == "fessurata"
    assert _passi._peggiore(["rotta", "snervata"], _passi.SCALA_ACCIAIO) == "rotta"
