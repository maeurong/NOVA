"""Appende un `eigen` **in coda** al deck NOVA, dopo il ciclo pushover.

Ricerca 11 (ticket #34). È la «via diretta» del ticket: si spinge fino allo spostamento
voluto, si chiude il ciclo, e solo allora si chiedono i modi — una corsa per livello,
nessuna `eigen` dentro il ciclo che possa perturbarlo.

    python docs/ricerca/misure/34-coda-eigen.py IN.tcl OUT.tcl "-fullGenLapack" 3

Ingressi degeneri: deck senza il `remove recorders` finale → AssertionError; `eigen` che
fallisce → `catch` cattura e la riga N34FIN esce con rc diverso da 0, il deck non muore.
"""
import sys
from pathlib import Path

CODA = """
# ===== sonda #34: modi sulla tangente dello stato raggiunto =====
set _n34_u [expr {[nodeDisp 3 1] - $_nova_u0}]
set _n34_rc [catch {eigen __SOL__ __N__} _n34_res]
puts "N34FIN u=[format %.6g $_n34_u] solver=__SOL__ n=__N__ rc=$_n34_rc val=$_n34_res"
if {$_n34_rc == 0} {
    set _n34_rc2 [catch {modalProperties -print -file mp_fine.out -unorm} _n34_m]
    puts "N34FIN modalProperties rc=$_n34_rc2 $_n34_m"
}
"""


def appendi(sorgente: str, solutore: str, n: int) -> str:
    marca = "remove recorders\nwipeAnalysis\n\nwipe"
    assert marca in sorgente, "coda del deck non trovata"
    coda = CODA.replace("__SOL__", solutore).replace("__N__", str(n))
    return sorgente.replace(marca, coda + marca, 1)


if __name__ == "__main__":
    src, dst, sol, n = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4])
    Path(dst).write_text(appendi(Path(src).read_text(), sol, n))
    print("scritto", dst)
