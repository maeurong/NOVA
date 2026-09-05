"""Il sidecar: una riga JSON per richiesta su stdin, righe JSON con lo stesso `id` su stdout.

Eventi di fase prima (`{"evento": "fase", "nome": ...}`), risposta finale poi. Non muore mai:
ogni eccezione diventa `esito: errore` con `fase` e `motivo` (spec: «Protocollo del sidecar»).
"""
from __future__ import annotations

import dataclasses
import json
import sys
import time
from pathlib import Path

from nova import ccx as _ccx
from nova import check as _check
from nova import confronto as _confronto
from nova import corsa as _corsa
from nova import deck as _deck
from nova import importa as _importa
from nova import modello as _modello

COMANDI = ("verifica", "check", "deck", "corsa", "ccx", "confronto", "importa", "fine")


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


def _casi(req: dict, m) -> list[str]:
    """`casi` assente o `null` = «decidi tu»; `casi: []` = «nessuno», che è una richiesta
    sbagliata e non il permesso di sostituirla in silenzio col default delle analisi."""
    casi = req.get("casi")
    if casi is None:
        return _casi_delle_analisi(m)
    if not casi:
        raise _Rifiuto("deck", "nessun caso richiesto: «casi» è una lista vuota")
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
        d = _deck.scrivi(m, _casi(req, m), Path(req.get("cartella") or "corsa"))
    except (ValueError, OSError) as e:
        raise _Rifiuto("deck", str(e)) from None
    return {"esito": "ok", "tcl": str(d.percorso), "resoconto": d.resoconto}


def _motivo_prior(e: Exception) -> str:
    """Il prior rotto detto a chi legge: «KeyError: 'riempimento'» è il gergo con cui Python
    parla a se stesso, e chi ha in mano un rilievo non sa che farsene."""
    if isinstance(e, KeyError):
        return f"il prior non è leggibile: manca il campo «{e.args[0]}»"
    return f"il prior non è leggibile: un campo porta un valore inatteso ({e})"


def comando_importa(req: dict) -> dict:
    """Il prior di MeshRec, dal corpo della richiesta o da un file, come modello NOVA.

    Il percorso si legge e basta: nessuna scrittura, e il file resta dov'è (`apri` fa lo
    stesso, ed è l'utente locale che apre il proprio rilievo).
    """
    prior, percorso = req.get("prior"), req.get("percorso")
    if prior is None:
        if not percorso:
            raise _Rifiuto("importa", "serve il prior: «prior» nella richiesta o «percorso» di un 12_wall.json")
        try:
            prior = json.loads(Path(percorso).read_text(encoding="utf-8"))
        except (OSError, ValueError) as e:  # cartella, file assente, JSON rotto: tutti «importa»
            raise _Rifiuto("importa", f"{percorso}: {e}") from None
    try:
        imp = _importa.importa(prior, riferimento=percorso or "prior")
    except ValueError as e:
        raise _Rifiuto("importa", str(e)) from None
    except (KeyError, TypeError, IndexError, AttributeError) as e:
        # Un prior mutilato non è un difetto del sidecar: senza questo ramo la risposta
        # uscirebbe con `fase: sidecar`, che il server passa come 200. `AttributeError` ci
        # sta perché una voce che non è un oggetto (`scartate: ["boh"]`) muore su `.get`.
        raise _Rifiuto("importa", _motivo_prior(e)) from None
    resoconto = dict(imp.resoconto)
    if percorso:
        resoconto["percorso"] = str(Path(percorso).resolve())
    return {"esito": "ok", "modello": imp.modello.model_dump(mode="json", exclude_none=True),
            "scartate": imp.scartate, "giunzioni": imp.giunzioni,
            "proposte_vincoli": imp.proposte_vincoli, "mancano": imp.mancano,
            "resoconto": resoconto}


def comando_verifica(req: dict) -> dict:
    return _corsa.verifica(req.get("solutore"))


def comando_corsa(req: dict, emetti) -> dict:
    """Check Model, poi la corsa: `forza` scavalca il rifiuto e se lo porta dietro nei verdetti."""
    m, imp = _carica(req)
    t0 = time.perf_counter()
    emetti({"evento": "fase", "nome": "check model"})
    verdetti = _check.check_model(m)
    if _check.rifiutato(verdetti) and not req.get("forza"):
        return {"esito": "rifiutato", "verdetti_check": verdetti, "secondi": time.perf_counter() - t0}
    try:
        esito = _corsa.esegui(m, _casi(req, m), Path(req.get("cartella") or "corsa"), imp,
                              req.get("solutore"), emetti)
    except (ValueError, OSError) as e:
        return {"esito": "errore", "fase": "deck", "motivo": str(e), "verdetti_check": verdetti,
                "secondi": time.perf_counter() - t0}
    esito["verdetti_check"] = verdetti
    return esito


def comando_ccx(req: dict, emetti) -> dict:
    """La corsa del solido: il deck `.inp` è già scritto (lo fa MeshRec), qui si copia e si lancia.

    Nessun Check Model davanti: quello vale sul modello NOVA del telaio, e un deck di
    CalculiX non è un modello NOVA.
    """
    percorso = req.get("inp")
    if not percorso:
        raise _Rifiuto("deck", "serve il deck: «inp» con il percorso di un file .inp")
    return _ccx.esegui(Path(percorso), Path(req.get("cartella") or "corsa"), req.get("solutore"), emetti)


def _leggi_json(percorso: str, che_cosa: str) -> dict:
    try:
        return json.loads(Path(percorso).read_text(encoding="utf-8"))
    except (OSError, ValueError) as e:
        raise _Rifiuto("confronto", f"{che_cosa} illeggibile ({percorso}): {e}") from None


def comando_confronto(req: dict) -> dict:
    """Il telaio e i due opzionali si leggono e basta: nessuna scrittura prima dell'export."""
    percorso_telaio = req.get("telaio")
    if not percorso_telaio:
        raise _Rifiuto("confronto", "serve il telaio: «telaio» con il percorso di un "
                       "risultati.nova.risultati.json")
    telaio = _leggi_json(percorso_telaio, "il telaio")
    solido = _leggi_json(req["solido"], "il solido") if req.get("solido") else None
    abaqus = None
    if req.get("abaqus"):
        try:
            abaqus = _confronto.leggi_csv(Path(req["abaqus"]))
        except (OSError, ValueError) as e:
            raise _Rifiuto("confronto", str(e)) from None
    try:
        tabella = _confronto.confronta(telaio, solido, abaqus, req.get("mappa_casi") or {})
    except ValueError as e:
        raise _Rifiuto("confronto", str(e)) from None
    file: dict = {}
    if req.get("cartella"):
        try:
            file = _confronto.esporta(tabella, Path(req["cartella"]))
        except OSError as e:
            raise _Rifiuto("confronto", str(e)) from None
    return {"esito": "ok", "tabella": dataclasses.asdict(tabella),
            "file": {k: str(v) for k, v in file.items()}}


def rispondi(req: dict, emetti) -> dict:
    comando = req.get("comando")
    try:
        if comando == "verifica":
            return comando_verifica(req)
        if comando == "corsa":
            return comando_corsa(req, emetti)
        if comando == "ccx":
            return comando_ccx(req, emetti)
        if comando == "confronto":
            return comando_confronto(req)
        if comando == "check":
            return comando_check(req)
        if comando == "deck":
            return comando_deck(req)
        if comando == "importa":
            return comando_importa(req)
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
