#!/bin/sh
# Ricerca 11 (ticket #34): come 34-serie.sh, ma con massa rotazionale fittizia m*r²,
# per vedere se lo sbandamento di λ₁ resta quando la matrice delle masse non è più singola.
#   sh docs/ricerca/misure/34-serie-rot.sh <base> <r-mm> <u1 u2 ...>
set -e
BASE=$1; R=$2; shift 2
WT=/Users/mario/GitHub/NOVA/.claude/worktrees/agent-aeb5a5396d580ff96
PY=$WT/.venv/bin/python
M=$WT/docs/ricerca/misure
for U in "$@"; do
  D=$BASE/u$U
  PYTHONPATH=$WT $PY $M/34-genera-deck.py "$D" "$U" 0.5 > /dev/null
  $PY -P $M/34-massa-rotazionale.py "$D/13_telaio.tcl" "$D/rot.tcl" "$R" > /dev/null
  $PY -P $M/34-coda-eigen.py "$D/rot.tcl" "$D/coda.tcl" -fullGenLapack 3 > /dev/null
  ( cd "$D" && /Users/mario/.local/bin/OpenSees coda.tcl > out.txt 2> err.txt || true )
  grep "N34FIN u" "$D/err.txt" || echo "N34FIN u=$U NESSUNA RIGA"
done
