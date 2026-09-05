"""Classe NTC → valori del materiale, con l'override «personalizzato»."""
from __future__ import annotations

from meshrec.core import materiali


def valori(materiale) -> dict[str, float]:
    """`E`, `densita`, `nu` sempre; `fck/fcm/fctm` per il calcestruzzo, `fyk` per l'acciaio.

    Ogni chiave è sovrascrivibile da `materiale.valori` quando `personalizzato` è vero:
    un valore scritto a mano vince sulla tabella, gli altri restano quelli di norma.
    """
    try:
        voce = materiali.trova(materiale.classe)
    except KeyError as e:
        raise ValueError(str(e.args[0])) from None
    if materiale.tipo == "calcestruzzo":
        base = {
            "E": voce.young, "nu": voce.poisson, "densita": voce.density,
            "fck": voce.f_k, "fcm": voce.f_k + 8.0, "fctm": voce.f_ctm,
        }
    else:
        base = {"E": voce.young, "nu": voce.poisson, "densita": voce.density, "fyk": voce.f_k}
    if materiale.personalizzato:
        base.update({k: float(v) for k, v in materiale.valori.items()})
    return base
