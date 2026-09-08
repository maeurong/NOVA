"""Coda che chiama `eigen` più volte, con o senza `wipeAnalysis` prima della sequenza.

Ricerca 11 (ticket #34): serve a isolare *perché* il secondo `eigen` di una sessione
risponde diverso dal primo, e se `wipeAnalysis` — che NOVA già emette fra un caso e
l'altro — lo neutralizza.

    python docs/ricerca/misure/34-coda-doppia.py IN.tcl OUT.tcl [viva|wipe]

`viva`: la sequenza gira con l'analisi della pushover ancora in piedi, e in coda si
ripete dopo un `wipeAnalysis`. `wipe`: `wipeAnalysis` prima di tutto.

Ingressi degeneri: deck senza la coda attesa → AssertionError; `eigen` che fallisce →
`catch`, riga con rc diverso da 0, il deck non muore.
"""
import sys
from pathlib import Path

SEQUENZA = """
foreach s {-fullGenLapack -fullGenLapack -genBandArpack -fullGenLapack -genBandArpack} {
    set rc [catch {eigen $s 3} res]
    puts "N34DOP __ETICHETTA__ u=[format %.6g $_d_u] solver=$s rc=$rc val=$res"
}
"""

TESTA = """
# ===== sonda #34: sequenza di eigen =====
set _d_u [expr {[nodeDisp 3 1] - $_nova_u0}]
"""


def appendi(sorgente: str, modo: str) -> str:
    marca = "remove recorders\nwipeAnalysis\n\nwipe"
    assert marca in sorgente, "coda del deck non trovata"
    assert modo in ("viva", "wipe"), "modo: viva oppure wipe"
    if modo == "viva":
        coda = (TESTA + SEQUENZA.replace("__ETICHETTA__", "viva")
                + "wipeAnalysis\n" + SEQUENZA.replace("__ETICHETTA__", "dopo-wipe"))
    else:
        coda = TESTA + "wipeAnalysis\n" + SEQUENZA.replace("__ETICHETTA__", "wipe-prima")
    return sorgente.replace(marca, coda + marca, 1)


if __name__ == "__main__":
    src, dst = sys.argv[1], sys.argv[2]
    modo = sys.argv[3] if len(sys.argv) > 3 else "viva"
    Path(dst).write_text(appendi(Path(src).read_text(), modo))
    print("scritto", dst, modo)
