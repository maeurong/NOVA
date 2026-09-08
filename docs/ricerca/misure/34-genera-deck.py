"""Genera il deck di `muro_1_pushover.nova.json` con spinta e incremento a scelta.

Ricerca 11 (ticket #34). Usa-e-getta: serve solo a produrre le varianti di corsa
(spostamento massimo più lungo, incremento più fitto) su cui gira `34-sonda-eigen.py`.

    python docs/ricerca/misure/34-genera-deck.py CARTELLA SPOST_MAX INCREMENTO

Nessun ingresso esterno oltre argv: numeri non validi alzano ValueError da float().
"""
import json
import sys
from pathlib import Path

from nova import deck, modello

RADICE = Path(__file__).resolve().parents[2]
MODELLO = RADICE / "caso-studio" / "muro_1_pushover.nova.json"

if __name__ == "__main__":
    cartella, spost, incr = Path(sys.argv[1]), float(sys.argv[2]), float(sys.argv[3])
    dati = json.loads(MODELLO.read_text())
    for a in dati["analisi"]:
        if a["tipo"] == "pushover":
            a["spostamento_max"], a["incremento"] = spost, incr
    cartella.mkdir(parents=True, exist_ok=True)
    d = deck.scrivi(modello.carica(dati), ["C1", "C3"], cartella, modi=3)
    print("scritto", d.percorso, "spinta", spost, "incremento", incr)
