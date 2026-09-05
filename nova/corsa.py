"""Lancia OpenSees sul deck, legge i recorder, compone i risultati per corsa e i sette controlli C3."""
from __future__ import annotations

import datetime as _dt
import json
import math
import subprocess
import time
import uuid
from pathlib import Path

import numpy as np

from meshrec.core import opensees, solve
from meshrec.core.config import SolutoreConfig
from nova import deck as _deck
from nova.modello import Modello

NOME_RISULTATI = "risultati.nova.risultati.json"

# Le colonne che un `recorder Element ... section k force` scrive per elemento.
# Quattro, nell'ordine P, Mz, My, T: misurato il 05/09/2026 con OpenSees 3.8.0 sul
# telaio 2×1 (`Z1_sez1.out`: 20 numeri su 5 elementi) e sulla trave appoggiata, dove
# il carico lungo z globale — cioè lungo la z locale — muove la sola terza colonna.
_COLONNE_SEZIONE = 4

# Il segno con cui il momento del recorder diventa quello della spec («positivo se
# tende le fibre inferiori»). I due assi **non** hanno lo stesso segno, ed è il motivo
# per cui sono due costanti e non una: la sezione a fibre di OpenSees porta Mz e My con
# convenzioni opposte. Misurato il 05/09/2026 sulla trave appoggiata di 6 m con
# q = 10 N/mm, OpenSees 3.8.0: carico lungo −z locale, terza colonna in mezzeria
# −45 000 000 N·mm; stesso carico lungo −y locale, seconda colonna +45 000 000 N·mm.
# In tutti e due i casi il valore atteso è +qL²/8 = +45 000 000.
SEGNO_MY = -1.0
SEGNO_MZ = 1.0

_TIMEOUT_S = 600


def _solutore(percorso: str | None) -> SolutoreConfig:
    return SolutoreConfig(nome="opensees", percorso=Path(percorso) if percorso else None)


def verifica(percorso: str | None) -> dict:
    """Una sola ricerca del binario: `solve.verifica` dice già se c'è e se risponde."""
    prova = solve.verifica(_solutore(percorso))
    dove = solve.DOVE_PRENDERLO["opensees"]
    if not prova["disponibile"]:
        return {"esito": "assente", "percorso": None, "motivo": prova["motivo"], "dove_prenderlo": dove}
    return {"esito": "ok" if prova["funziona"] else "rotto", "percorso": str(prova["percorso"]),
            "motivo": prova["motivo"], "dove_prenderlo": dove}


def _numero(x) -> float | None:
    """`null` al posto di `inf`/`nan`: il JSON standard non li ha e `JSON.parse` rifiuta la riga.

    Il verdetto non si ammorbidisce — `controlli` rilegge i `None` come `nan` e il controllo
    resta `non_passato`: qui si cambia solo come il numero guasto **si scrive**.
    """
    x = float(x)
    return x if math.isfinite(x) else None


def _reale(x) -> float:
    return math.nan if x is None else float(x)


def _pulito(v):
    if isinstance(v, float):
        return _numero(v)
    if isinstance(v, (list, tuple)):
        return [_pulito(x) for x in v]
    return v


def esegui(m: Modello, casi: list[str], cartella: Path, hash_modello: str,
           percorso_solutore: str | None = None, emetti=lambda ev: None) -> dict:
    """Scrive il deck, lancia il binario, legge le uscite. `hash_modello` è l'impronta del
    modello **prima** del peso proprio generato: qui `m` ce l'ha già dentro e ricalcolarla
    darebbe una seconda impronta per lo stesso file. Per questo è obbligatoria e senza
    ripiego: un default silenzioso rimetterebbe in piedi proprio quella seconda impronta."""
    t0 = time.perf_counter()
    stato = solve.disponibilita(_solutore(percorso_solutore))["opensees"]
    if not stato["disponibile"]:
        return {"esito": "assente", "motivo": stato["motivo"], "dove_prenderlo": stato["dove_prenderlo"],
                "secondi": time.perf_counter() - t0}
    cartella = Path(cartella)
    cartella.mkdir(parents=True, exist_ok=True)
    emetti({"evento": "fase", "nome": "scrivo il deck e lancio OpenSees"})
    d = _deck.scrivi(m, casi, cartella)  # prima il deck: se lo rifiuta, la corsa di ieri resta intera
    for vecchia in [*cartella.glob("*.out"), cartella / NOME_RISULTATI]:
        vecchia.unlink(missing_ok=True)  # un'uscita di ieri si legge come il risultato di oggi
    try:
        processo = subprocess.run([str(stato["percorso"]), _deck.NOME_TCL], cwd=cartella,
                                  capture_output=True, timeout=_TIMEOUT_S)
    except subprocess.TimeoutExpired as e:
        return _errore_solutore(f"OpenSees non è finito entro il timeout di {_TIMEOUT_S:g} s",
                                _testo(e.stdout) + _testo(e.stderr), cartella, t0)
    except (OSError, subprocess.SubprocessError) as e:
        # esiste ma non parte: permessi, architettura sbagliata, script senza shebang
        return _errore_solutore(f"«{stato['percorso']}» non è eseguibile: {e}", "", cartella, t0)
    registro = _testo(processo.stdout) + _testo(processo.stderr)
    (cartella / opensees.NOME_REGISTRO).write_text(registro, encoding="utf-8")
    fine = cartella / opensees.NOME_FINE
    if not (fine.is_file() and opensees.MARCA_FINE in fine.read_text(encoding="ascii", errors="ignore")):
        return _errore_solutore(
            f"OpenSees non ha scritto il marcatore di fine ({opensees.NOME_FINE}): la corsa non è "
            f"arrivata in fondo (codice d'uscita {processo.returncode}, che non è il segnale)",
            registro, cartella, t0)
    emetti({"evento": "fase", "nome": "leggo i recorder"})
    try:
        risultati = risultati_da_uscite(m, d, cartella, registro, hash_modello)
    except (ValueError, OSError) as e:  # `FileNotFoundError` è un `OSError`
        return _errore_solutore(f"uscita del solutore illeggibile: {e}", registro, cartella, t0)
    risultati["run"]["secondi"] = time.perf_counter() - t0
    (cartella / NOME_RISULTATI).write_text(json.dumps(risultati, ensure_ascii=False, indent=1), encoding="utf-8")
    return {"esito": "ok", "risultati": risultati, "secondi": risultati["run"]["secondi"]}


def _testo(grezzo: bytes | None) -> str:
    """`replace` e non `ignore`: qui non si contano campi, si mostra il registro a una persona."""
    return "" if grezzo is None else grezzo.decode("utf-8", errors="replace")


def _errore_solutore(motivo: str, registro: str, cartella: Path, t0: float) -> dict:
    """Il registro finisce su disco anche qui: la corsa andata male è quella che si va a leggere."""
    (cartella / opensees.NOME_REGISTRO).write_text(registro, encoding="utf-8")
    return {"esito": "errore", "fase": "solutore", "motivo": motivo, "coda_log": registro[-2000:],
            "secondi": time.perf_counter() - t0}


def _stazioni(d: _deck.Deck, caso: str, cartella: Path) -> dict[str, list[dict]]:
    """Per asta: le stazioni di tutti i suoi elementi, con x_rel sull'asta, N/My/Mz/T dalla sezione, V dall'equilibrio."""
    n_el = len(d.elementi)
    sez = [opensees._ultima_riga(cartella / f"{caso}_sez{k}.out", _COLONNE_SEZIONE * n_el).reshape(n_el, _COLONNE_SEZIONE)
           for k in range(1, _deck.STAZIONI + 1)]
    locali = opensees._ultima_riga(cartella / f"{caso}_localforce.out", 12 * n_el).reshape(n_el, 12)
    per_asta: dict[str, list[dict]] = {}
    for id_asta, tags in d.mappa_asta.items():
        L_asta = sum(d.elementi[t - 1].L for t in tags)
        offset = 0.0
        stazioni: list[dict] = []
        for t in tags:
            e = d.elementi[t - 1]
            w = np.array(e.w[caso])
            wy, wz = float(np.dot(w, e.e1)), float(np.dot(w, e.e2))
            Fi = locali[t - 1, :6]  # forze d'estremità i nel locale: N, Vy, Vz, T, My, Mz
            for k, xi in enumerate(_deck.XI_LOBATTO):
                if stazioni and k == 0:
                    continue  # la stazione 0 di un elemento interno coincide con la 1 del precedente
                x = xi * e.L
                P, Mz, My, T = (float(v) for v in sez[k][t - 1, :4])
                # taglio dei manuali: +qL/2 all'estremo i, −qL/2 a j. Misurato il 05/09/2026 sulla
                # trave appoggiata (q = 10 N/mm, L = 6000): `localForce` rende Vz_i = +30 000, che è
                # già il segno giusto — il taglio si somma al carico, non si cambia di segno.
                stazioni.append({"x_rel": _numero((offset + x) / L_asta), "N": _numero(P),
                                 "Vy": _numero(float(Fi[1]) + wy * x), "Vz": _numero(float(Fi[2]) + wz * x),
                                 "T": _numero(T), "My": _numero(SEGNO_MY * My), "Mz": _numero(SEGNO_MZ * Mz)})
            offset += e.L
        per_asta[str(id_asta)] = stazioni
    return per_asta


def risultati_da_uscite(m: Modello, d: _deck.Deck, cartella: Path, registro: str,
                        hash_modello: str) -> dict:
    n_nodi = len(d.nodi)
    tag_a_id = {v: k for k, v in d.mappa_nodo.items()}
    per_caso: dict[str, dict] = {}
    for caso in d.casi:
        U = opensees._ultima_riga(cartella / f"{caso}_spostamenti.out", 6 * n_nodi).reshape(n_nodi, 6)
        R = opensees._ultima_riga(cartella / f"{caso}_reazioni.out", 6 * n_nodi).reshape(n_nodi, 6)
        per_caso[caso] = {
            "con_segno": True,
            "spostamenti": {str(tag_a_id[t]): [_numero(x) for x in U[t - 1]] for t in tag_a_id},
            "reazioni": {str(tag_a_id[t]): [_numero(x) for x in R[t - 1]] for t in d.vincolati},
            "sollecitazioni": _stazioni(d, caso, cartella),
        }
    verdetti = controlli(d, per_caso, registro)
    return {
        "run": {"id": uuid.uuid4().hex[:12], "data": _dt.datetime.now().isoformat(timespec="seconds"),
                "hash_modello": hash_modello, "versione_opensees": _versione(registro),
                "solutore": "OpenSees", "deck": str(d.percorso),
                "registro": str(cartella / opensees.NOME_REGISTRO),
                "carico_totale": d.carico_totale, "casi": d.casi,
                "mappa_tag": {"nodo": {str(k): v for k, v in d.mappa_nodo.items()},
                              "asta": {str(k): v for k, v in d.mappa_asta.items()}}},
        "per_caso": per_caso, "modi": [], "verdetti": verdetti,
    }


def _versione(registro: str) -> str | None:
    """La riga del banner, che **comincia** per «Version»: un `WARNING` che nomina una versione
    di elemento non è la versione del solutore."""
    for riga in registro.splitlines():
        if riga.strip().startswith("Version"):
            return riga.strip()
    return None


def _esito(c: dict) -> str:
    if c.get("applicabile") is False:
        return "non_applicabile"
    return "passato" if c.get("passato") else "non_passato"


def _verdetto(controllo: str, c: dict, caso: str | None = None, ragione: str | None = None) -> dict:
    """Stessa forma dei verdetti C1 (`check._v`): le nove chiavi ci sono sempre."""
    valori = {k: _pulito(v) for k, v in c.items()
              if k not in ("passato", "applicabile", "motivo", "controllo", "modello")}
    return {"controllo": controllo, "oggetto": None, "stazione": None, "caso": caso,
            "esito": _esito(c), "ragione": ragione or c.get("motivo") or "",
            "articolo": None, "valori": valori, "rimedio": None}


def controlli(d: _deck.Deck, per_caso: dict, registro: str) -> list[dict]:
    """I sette controlli di solve.py riletti nel verdetto a tre valori: uno per caso dove il caso conta."""
    v: list[dict] = []
    dimensione = float(np.linalg.norm(np.ptp(np.array(list(d.nodi.values())), axis=0)))
    for caso, dati in per_caso.items():
        # i `None` della composizione tornano `nan`: un numero guasto deve **fallire** il controllo
        reazioni = {int(k): tuple(_reale(y) for y in x[:3]) for k, x in dati["reazioni"].items()}
        atteso = tuple(-x for x in d.carico_totale[caso])
        c = solve.controlla_reazioni(reazioni, atteso, solve._TOLLERANZA_REAZIONI)
        v.append(_verdetto("reazioni", c, caso,
                           f"Σ reazioni {c['somma']} contro Σ carichi {atteso}, scarto {c['scarto_relativo']}"))
        # nessuno spostamento non è uno spostamento nullo: `None` dichiara «non verificato»
        u_max = max((float(np.linalg.norm([_reale(y) for y in x[:3]]))
                     for x in dati["spostamenti"].values()), default=None)
        c = solve.controlla_spostamenti(u_max, dimensione)
        v.append(_verdetto("spostamenti", c, caso,
                           f"u_max = {'assente' if u_max is None else format(u_max, '.6g')} mm "
                           f"su {dimensione:.6g} mm"))
    n = opensees.conta_avvisi(registro)
    v.append(_verdetto("avvisi", solve.controlla_avvisi(n), None, f"{n} WARNING nel registro"))
    # `esito_non_applicabile` rende `None` dove il controllo **varrebbe** sul telaio (autovalori e
    # massa modale): non c'è analisi modale in questa corsa, e il verdetto lo dice qui.
    for controllo, ragione in (("autovalori", "nessuna analisi modale in questa corsa"),
                               ("massa_modale", "nessuna analisi modale in questa corsa"),
                               ("picco", "non calcolato in una corsa statica"),
                               ("vincolo_in_pianta", "non calcolato in una corsa statica")):
        c = solve.esito_non_applicabile(controllo, "telaio")
        v.append(_verdetto(controllo, c) if c else
                 {"controllo": controllo, "oggetto": None, "stazione": None, "caso": None,
                  "esito": "non_applicabile", "ragione": ragione, "articolo": None,
                  "valori": {}, "rimedio": None})
    return v
