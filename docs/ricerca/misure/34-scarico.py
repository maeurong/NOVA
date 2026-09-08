"""Appende al deck NOVA uno scarico in controllo di spostamento, con `eigen` prima e dopo.

Ricerca 11 (ticket #34): risponde a «tangente di scarico contro tangente al punto».
Si spinge fino a `spostamento_max` (il deck lo fa già), si prendono i modi, si torna
indietro di `DELTA` mm con incremento negativo, e si riprendono i modi allo stesso
spostamento che la spinta monotona aveva attraversato salendo.

    python docs/ricerca/misure/34-scarico.py IN.tcl OUT.tcl DELTA

Ingressi degeneri: deck senza la coda attesa → AssertionError; passo di scarico che non
converge → il ciclo si ferma e la riga N34SCA riporta lo spostamento davvero raggiunto.
"""
import sys
from pathlib import Path

CODA = """
# ===== sonda #34: modi al culmine, poi dopo lo scarico =====
set _s_u [expr {[nodeDisp 3 1] - $_nova_u0}]
set _s_rc [catch {eigen -fullGenLapack 3} _s_res]
puts "N34SCA culmine u=[format %.6g $_s_u] rc=$_s_rc val=$_s_res"
set _s_n [expr {int(__DELTA__/0.5)}]
integrator DisplacementControl 3 1 -0.5
algorithm Newton
for {set _s_i 0} {$_s_i < $_s_n} {incr _s_i} {
    if {[analyze 1] != 0} {puts "N34SCA scarico caduto al giro $_s_i"; break}
}
set _s_u2 [expr {[nodeDisp 3 1] - $_nova_u0}]
set _s_rc2 [catch {eigen -fullGenLapack 3} _s_res2]
puts "N34SCA scarico u=[format %.6g $_s_u2] rc=$_s_rc2 val=$_s_res2"
"""


def appendi(sorgente: str, delta: float) -> str:
    marca = "remove recorders\nwipeAnalysis\n\nwipe"
    assert marca in sorgente, "coda del deck non trovata"
    return sorgente.replace(marca, CODA.replace("__DELTA__", repr(delta)) + marca, 1)


if __name__ == "__main__":
    src, dst, delta = sys.argv[1], sys.argv[2], float(sys.argv[3])
    Path(dst).write_text(appendi(Path(src).read_text(), delta))
    print("scritto", dst)
