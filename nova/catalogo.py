"""Classe NTC → valori del materiale, con l'override «personalizzato»."""
from __future__ import annotations

from meshrec.core import materiali


# NTC 2018 Tab. 11.3.Ia-b: per il B450C `(f_t/f_y)_k` sta fra 1,15 e 1,35 e l'allungamento
# uniforme al carico massimo `ε_uk` = `A_gt,k` vale 7,5 %; per il B450A, stessi 450 nominali
# (§11.3.2.2), `(f_t/f_y)_k` ≥ 1,05 e `ε_uk` = 2,5 %. Si prende il minimo della forcella:
# è il frattile che la norma garantisce, ed è quello che dà il `b` di `Steel02` del doc 09 §2.
# Stanno qui e non in `meshrec.core.materiali` (copia verbatim, la sua `VoceMateriale` porta
# il solo `f_k`), cioè nel punto dove la classe diventa numeri.
_SOVRARESISTENZA: dict[str, tuple[float, float]] = {"B450C": (1.15, 0.075), "B450A": (1.05, 0.025)}


def valori(materiale) -> dict[str, float]:
    """`E`, `densita`, `nu` sempre; `fck/fcm/fctm` per il calcestruzzo, `fyk/ftk/epsuk` per l'acciaio.

    `E` del calcestruzzo **è** `E_cm` della [11.2.5] (`meshrec.core.materiali._modulo_elastico`):
    non c'è una chiave `Ecm` separata perché sarebbe lo stesso numero con due nomi.

    Ogni chiave è sovrascrivibile da `materiale.valori` quando `personalizzato` è vero:
    un valore scritto a mano vince sulla tabella, gli altri restano quelli di norma. È anche
    la via per un acciaio fuori catalogo: la sua `ftk`/`epsuk` non stanno in `_SOVRARESISTENZA`
    e senza override prenderebbero quelle del B450C.
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
        k, epsuk = _SOVRARESISTENZA.get(materiale.classe.strip().upper(), _SOVRARESISTENZA["B450C"])
        base = {"E": voce.young, "nu": voce.poisson, "densita": voce.density, "fyk": voce.f_k,
                "ftk": k * voce.f_k, "epsuk": epsuk}
    if materiale.personalizzato:
        base.update({k: float(v) for k, v in materiale.valori.items()})
    return base
