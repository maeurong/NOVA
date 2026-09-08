"""Aggiunge una massa rotazionale fittizia a ogni nodo di un deck NOVA.

Ricerca 11 (ticket #34): serve a separare le due cause dello sbandamento di λ₁ dopo la
pushover — la tangente che salta ramo, e la matrice delle masse **singola** sulle
rotazioni, che rende il fascio (K, M) mal condizionato. Il deck di NOVA non scrive
righe `mass` quando la massa viene tutta da `forceBeamColumn -mass` (lumped, solo
traslazioni): qui se ne aggiunge una per nodo con `J` sulle tre rotazioni.

    python docs/ricerca/misure/34-massa-rotazionale.py IN.tcl OUT.tcl 1e-2

Ingressi degeneri: deck senza righe `node` → AssertionError invece di un file identico
all'ingresso; `J` = 0 → rifiutato, sarebbe l'ingresso di partenza.
"""
import re
import sys
from pathlib import Path

NODO = re.compile(r"^node (\d+) ", re.M)


def aggiungi(sorgente: str, j: float) -> str:
    assert j > 0, "J deve essere positivo, altrimenti non cambia niente"
    tag = NODO.findall(sorgente)
    assert tag, "nessuna riga `node` nel deck"
    righe = "\n".join(f"mass {t} 0 0 0 {j:.10g} {j:.10g} {j:.10g}" for t in tag)
    ultima = sorgente.rindex("\nnode ")
    fine = sorgente.index("\n", ultima + 1)
    return sorgente[:fine] + "\n" + righe + sorgente[fine:]


if __name__ == "__main__":
    src, dst, j = sys.argv[1], sys.argv[2], float(sys.argv[3])
    testo = aggiungi(Path(src).read_text(), j)
    Path(dst).write_text(testo)
    print("scritto", dst, "con massa rotazionale J =", j, "t·mm² per nodo")
