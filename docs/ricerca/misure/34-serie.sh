#!/bin/sh
# Ricerca 11 (ticket #34): una corsa per livello di spostamento, `eigen` solo in coda.
#   sh docs/ricerca/misure/34-serie.sh <cartella-base> <solutore> <n-modi> <u1 u2 ...>
# INCR=<passo> in ambiente per cambiare l'incremento della spinta (default 0,5).
# Percorsi assoluti attesi. Scrive <base>/u<NN>/ e stampa le righe N34FIN.
set -e
BASE=$1; SOL=$2; NM=$3; shift 3
INCR=${INCR:-0.5}
WT=/Users/mario/GitHub/NOVA/.claude/worktrees/agent-aeb5a5396d580ff96
PY=$WT/.venv/bin/python
for U in "$@"; do
  D=$BASE/u$U
  PYTHONPATH=$WT $PY $WT/docs/ricerca/misure/34-genera-deck.py "$D" "$U" "$INCR" > /dev/null
  $PY -P $WT/docs/ricerca/misure/34-coda-eigen.py "$D/13_telaio.tcl" "$D/coda.tcl" "$SOL" "$NM" > /dev/null
  ( cd "$D" && /Users/mario/.local/bin/OpenSees coda.tcl > out.txt 2> err.txt || true )
  grep "N34FIN u" "$D/err.txt" || echo "N34FIN u=$U NESSUNA RIGA"
done
