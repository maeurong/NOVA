"""Inietta una sonda `eigen` nel ciclo pushover di un deck NOVA già generato.

Ricerca 11 (ticket #34). Usa-e-getta: legge il `.tcl` che `nova/deck.py` scrive, ci
infila una `proc` che chiama `eigen` con le combinazioni di solutore chieste quando il
nodo di controllo passa uno dei livelli di spostamento, e riscrive il file.

    python docs/ricerca/misure/34-sonda-eigen.py IN.tcl OUT.tcl "5 10 20" ['{spec} …']

Ogni `spec` è una coppia Tcl `{opzioni nModi}`. Le righe di misura escono su stderr
(è lì che `puts` scrive con questo binario) con il prefisso `N34`.

Ingressi degeneri: deck senza l'ancora del pushover → AssertionError, non un file muto;
lista di livelli vuota → la `proc` non viene mai chiamata e la corsa resta quella normale.
"""
import sys
from pathlib import Path

DEFAULT_SPECS = ('{-genBandArpack 3} {-fullGenLapack 3} {-fullGenLapack 6} '
                 '{"-standard -symmBandLapack" 3}')

SONDA = """    set _u [expr {[nodeDisp 3 1] - $_nova_u0}]
    if {[llength $_n34_liv] > 0 && $_u >= [lindex $_n34_liv 0]} {
        set _n34_liv [lrange $_n34_liv 1 end]
        _n34_probe $_u
    }
"""

PROC = """
set _n34_liv {__LIV__}
proc _n34_probe {u} {
    set i 0
    foreach spec {__SPECS__} {
        incr i
        set sol [lindex $spec 0]
        set n [lindex $spec 1]
        set rc [catch {eval eigen $sol $n} res]
        puts "N34 u=[format %.4g $u] i=$i solver=$sol n=$n rc=$rc val=$res"
    }
    set rc [catch {eigen -fullGenLapack 3} res]
    if {$rc == 0} {
        puts "N34 u=[format %.4g $u] i=mp solver=-fullGenLapack n=3 rc=0 val=$res"
        set rc2 [catch {modalProperties -print -file mp_[format %.0f [expr {$u*10}]].out -unorm} m]
        puts "N34 u=[format %.4g $u] modalProperties rc=$rc2 $m"
    }
}
"""


def inietta(sorgente: str, livelli: str, specs: str = DEFAULT_SPECS) -> str:
    ancora = "set _nova_u0 [nodeDisp 3 1]"
    assert ancora in sorgente, "ancora del pushover non trovata nel deck"
    proc = PROC.replace("__LIV__", livelli).replace("__SPECS__", specs)
    t = sorgente.replace(ancora, proc + ancora, 1)
    marca = '    puts "NOVA_PUSHOVER: passo $_nova_passo'
    fine = t.index("\n", t.index(marca)) + 1
    return t[:fine] + SONDA + t[fine:]


if __name__ == "__main__":
    src, dst, livelli = sys.argv[1], sys.argv[2], sys.argv[3]
    specs = sys.argv[4] if len(sys.argv) > 4 else DEFAULT_SPECS
    testo = inietta(Path(src).read_text(), livelli, specs)
    Path(dst).write_text(testo)
    print("scritto", dst, len(testo.splitlines()), "righe")
