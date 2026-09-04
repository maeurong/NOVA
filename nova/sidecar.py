"""Il sidecar: una riga JSON per richiesta su stdin, righe JSON con lo stesso `id` su stdout.

Eventi di fase prima (`{"evento": "fase", "nome": ...}`), risposta finale poi. Non muore mai:
ogni eccezione diventa `esito: errore` con `fase` e `motivo` (spec: «Protocollo del sidecar»).
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

from nova import check as _check
from nova import deck as _deck
from nova import modello as _modello

COMANDI = ("verifica", "check", "deck", "corsa", "fine")


class _Rifiuto(Exception):
    def __init__(self, fase: str, motivo: str):
        super().__init__(motivo)
        self.fase, self.motivo = fase, motivo


def _carica(req: dict):
    """Modello + impronta, calcolata sul modello com'è nel file **prima** del peso proprio."""
    try:
        m = _modello.carica(req.get("modello"))
        imp = _modello.impronta(m)
        return _modello.assicura_peso_proprio(m), imp
    except ValueError as e:
        raise _Rifiuto("modello", str(e)) from None


def comando_check(req: dict) -> dict:
    m, _ = _carica(req)
    verdetti = _check.check_model(m)
    return {"esito": "rifiutato" if _check.rifiutato(verdetti) else "ok", "verdetti": verdetti}


def _casi_delle_analisi(m) -> list[str]:
    """I casi delle analisi statiche dichiarate, più il peso proprio generato se non c'è già."""
    casi: list[str] = []
    for an in m.analisi:
        if an.tipo == "statica":
            casi += [c for c in an.casi if c not in casi]
    peso = next((f"Z{a.id}" for a in m.azioni if a.generata), None)
    if peso is None:
        raise _Rifiuto("deck", "nessuna azione di peso proprio nel modello")
    if peso not in casi:
        casi.append(peso)
    return casi


def comando_deck(req: dict) -> dict:
    """Il deck si scrive dopo il Check Model: `forza` scavalca il rifiuto, non lo cancella."""
    m, _ = _carica(req)
    verdetti = _check.check_model(m)
    if _check.rifiutato(verdetti) and not req.get("forza"):
        bocciati = [v["controllo"] for v in verdetti if v["esito"] == "non_passato"]
        return {"esito": "errore", "fase": "check", "verdetti": verdetti,
                "motivo": f"il Check Model rifiuta il modello: {', '.join(bocciati)} "
                          "(rilancia con «forza»: true per scrivere lo stesso)"}
    try:
        d = _deck.scrivi(m, req.get("casi") or _casi_delle_analisi(m), Path(req.get("cartella") or "corsa"))
    except (ValueError, OSError) as e:
        raise _Rifiuto("deck", str(e)) from None
    return {"esito": "ok", "tcl": str(d.percorso), "resoconto": d.resoconto}


def rispondi(req: dict, emetti) -> dict:
    comando = req.get("comando")
    try:
        if comando == "check":
            return comando_check(req)
        if comando == "deck":
            return comando_deck(req)
        if comando == "fine":
            return {"esito": "ciao"}
        return {"esito": "errore", "fase": "protocollo",
                "motivo": f"comando sconosciuto: {comando!r} (uno fra {', '.join(COMANDI)})"}
    except _Rifiuto as r:
        return {"esito": "errore", "fase": r.fase, "motivo": r.motivo}
    except Exception as e:  # il sidecar sopravvive e riporta
        return {"esito": "errore", "fase": "sidecar", "motivo": f"{type(e).__name__}: {e}"}


def servi(ingresso=sys.stdin, uscita=sys.stdout) -> None:
    def scrivi(riga: dict) -> None:
        uscita.write(json.dumps(riga, ensure_ascii=False, default=str) + "\n")
        uscita.flush()

    for riga in ingresso:
        if not riga.strip():
            continue
        try:
            req = json.loads(riga)
        except json.JSONDecodeError as e:
            scrivi({"id": None, "esito": "errore", "fase": "protocollo", "motivo": f"richiesta non JSON: {e}"})
            continue
        if not isinstance(req, dict):
            scrivi({"id": None, "esito": "errore", "fase": "protocollo",
                    "motivo": "la richiesta deve essere un oggetto JSON"})
            continue
        rid = req.get("id")
        risposta = rispondi(req, lambda ev: scrivi({"id": rid, **ev}))
        scrivi({"id": rid, **risposta})
        if risposta.get("esito") == "ciao":
            return


if __name__ == "__main__":
    servi()
