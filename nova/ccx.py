"""Lancia CalculiX sul deck `.inp`, legge `.dat` e `.frd`, scrive `risultati_solido.json`.

Non si riusa `solve.risolvi` di MeshRec — è incollato alla sua pipeline (`AnalysisConfig`,
`write_vtu`, la trasformata) — ma si riusano i suoi **lettori**, che sono già misurati
contro ccx vero: `leggi_frd`, `leggi_reazioni`, `leggi_frequenze`, `leggi_massa_modale`.

Due cose che questo modulo dichiara e che non sono ovvie:

1. **La massa è quella della mesh (ρ·V), non Σ Rz / g.** `ccx` non riporta, nella `RF` di un
   nodo vincolato che porta anche `*DLOAD, GRAV`, la quota di gravità che gli elementi
   assegnano a quel nodo (manuale CalculiX §6.11.5). Σ Rz è quindi `(ρV − quota)·g`: sul
   deck vero varrebbe 0,4331 t contro i 0,5551 t veri, il 22 % in meno. Misurato il
   05/09/2026 su tutti e due i deck, l'identità torna a 1,3e-8.
2. **Il verdetto sulle reazioni confronta Σ R con −(ρV − quota)·g**, cioè con la stessa
   identità: è un controllo vero di equilibrio (una lettura parziale del `.dat`, un vincolo
   di sbieco, una deriva fra deck e lettura lo fanno cadere), non una tautologia come
   sarebbe confrontare Σ Rz con una massa ricavata da Σ Rz.

Il codice d'uscita di ccx non è il segnale (`ccx -v` funziona ed esce 201): il marcatore di
fine è la riga «Job finished» nello stdout **e** un `.frd` che `leggi_frd` chiude.
"""
from __future__ import annotations

import datetime as _dt
import hashlib
import json
import shutil
import subprocess
import time
import uuid
from pathlib import Path

import numpy as np

from meshrec.core import solve
from meshrec.core.config import SolutoreConfig
from nova import inp as _inp
from nova.corsa import non_applicabile, testo, verdetto  # stessa forma dei verdetti del telaio

# `solve._TOLLERANZA_REAZIONI` e `solve._INTESTAZIONE_MODALE` sono privati di MeshRec e si
# usano lo stesso: `meshrec/` non si tocca (vincolo del piano), e ricopiarne il valore qui
# vorrebbe dire tenerne due che possono divergere in silenzio.
NOME_RISULTATI = "risultati_solido.json"
_NOME = "solido"
NOME_DECK = f"{_NOME}.inp"
NOME_REGISTRO = "ccx_stdout.log"
MARCA_FINE = "Job finished"

# Il set di cui si riportano gli spostamenti. Uno solo e non tutti: `BASE` è vincolato
# (spostamenti nulli per costruzione) e le facce laterali non servono al confronto col
# telaio, che guarda la sommità. Se un giorno servisse un secondo set, `u_set` è già un
# dizionario per nome.
SET_SOMMITA = "TOP"

# Mezz'ora: il deck vero (14 116 nodi, 40 modi) ci mette 5,3 s, ma un solido raffinato di
# MeshRec sta su un altro ordine di grandezza e un timeout stretto lo ucciderebbe a metà.
_TIMEOUT_S = 1800

# Quello che una corsa lascia in cartella e che una corsa nuova non deve poter rileggere.
# `.12d` e `spooles.out` li scrive ccx da sé, anche vuoti. **Nomi esatti, non `*.dat`**: la
# cartella la sceglie chi chiama, e un glob ci cancellerebbe il `wall_model.dat` di MeshRec.
_USCITE = (f"{_NOME}.dat", f"{_NOME}.frd", f"{_NOME}.sta", f"{_NOME}.cvg", f"{_NOME}.12d",
           "spooles.out", NOME_RISULTATI)


def _solutore(percorso: str | None) -> SolutoreConfig:
    return SolutoreConfig(nome="calculix", percorso=Path(percorso) if percorso else None)


def verifica(percorso: str | None) -> dict:
    """Come `corsa.verifica`, ma per CalculiX."""
    prova = solve.verifica(_solutore(percorso))
    dove = solve.DOVE_PRENDERLO["calculix"]
    if not prova["disponibile"]:
        return {"esito": "assente", "percorso": None, "motivo": prova["motivo"], "dove_prenderlo": dove}
    return {"esito": "ok" if prova["funziona"] else "rotto", "percorso": str(prova["percorso"]),
            "motivo": prova["motivo"], "dove_prenderlo": dove}


def esegui(inp: str | Path, cartella: str | Path, percorso_solutore: str | None = None,
           emetti=lambda ev: None) -> dict:
    """Il deck si **copia** nella cartella della corsa come `solido.inp` e si lancia com'è.

    Copiato e non letto dove sta: il deck è dell'utente, la corsa no, e `ccx -i` prende
    sempre `solido` — nessun pezzo di percorso dell'utente entra nella riga di comando.
    """
    t0 = time.perf_counter()
    stato = solve.disponibilita(_solutore(percorso_solutore))["calculix"]
    if not stato["disponibile"]:
        return {"esito": "assente", "motivo": stato["motivo"], "dove_prenderlo": stato["dove_prenderlo"],
                "secondi": time.perf_counter() - t0}
    cartella = Path(cartella)
    cartella.mkdir(parents=True, exist_ok=True)
    emetti({"evento": "fase", "nome": "copio il deck"})
    copia = cartella / NOME_DECK
    try:
        deck = _inp.leggi(inp)
    except ValueError as e:
        return {"esito": "errore", "fase": "deck", "motivo": str(e), "secondi": time.perf_counter() - t0}
    try:
        # prima si pulisce, poi si copia: un `.dat` di ieri letto come il risultato di oggi
        # è il modo peggiore di sbagliare, perché il numero esce plausibile
        for nome in _USCITE:
            (cartella / nome).unlink(missing_ok=True)
        shutil.copyfile(inp, copia)
    except OSError as e:
        return {"esito": "errore", "fase": "deck", "motivo": f"{Path(inp)}: non si copia nella cartella "
                f"della corsa ({e})", "secondi": time.perf_counter() - t0}

    emetti({"evento": "fase", "nome": "lancio ccx"})
    try:
        processo = subprocess.run([str(stato["percorso"]), "-i", copia.stem], cwd=cartella,
                                  capture_output=True, timeout=_TIMEOUT_S)
    except subprocess.TimeoutExpired as e:
        return _errore(f"ccx non è finito entro il timeout di {_TIMEOUT_S:g} s",
                       testo(e.stdout) + testo(e.stderr), cartella, t0)
    except (OSError, subprocess.SubprocessError) as e:
        return _errore(f"«{stato['percorso']}» non è eseguibile: {e}", "", cartella, t0)
    registro = testo(processo.stdout) + testo(processo.stderr)
    if MARCA_FINE not in registro:
        return _errore(f"ccx non ha scritto «{MARCA_FINE}»: la corsa non è arrivata in fondo "
                       f"(codice d'uscita {processo.returncode}, che non è il segnale)",
                       registro, cartella, t0)
    (cartella / NOME_REGISTRO).write_text(registro, encoding="utf-8")

    emetti({"evento": "fase", "nome": "leggo .dat e .frd"})
    dat = cartella / f"{copia.stem}.dat"
    try:
        blocchi = solve.leggi_frd(cartella / f"{copia.stem}.frd")
        righe = dat.read_text(encoding="ascii", errors="ignore").splitlines()
    except (ValueError, OSError) as e:
        return _errore(str(e), registro, cartella, t0)
    risultati = _componi(deck, copia, dat, blocchi, righe, registro, cartella)
    risultati["run"]["secondi"] = time.perf_counter() - t0
    (cartella / NOME_RISULTATI).write_text(json.dumps(risultati, ensure_ascii=False, indent=1),
                                           encoding="utf-8")
    return {"esito": "ok", "risultati": risultati, "secondi": risultati["run"]["secondi"]}


def _errore(motivo: str, registro: str, cartella: Path, t0: float) -> dict:
    """Il registro finisce su disco anche qui: la corsa andata male è quella che si va a leggere."""
    (cartella / NOME_REGISTRO).write_text(registro, encoding="utf-8")
    return {"esito": "errore", "fase": "solutore", "motivo": motivo,
            "errori": [r.strip() for r in registro.splitlines() if "*ERROR" in r],
            "coda_log": registro[-2000:], "secondi": time.perf_counter() - t0}


def _versione(registro: str) -> str | None:
    """La riga del banner: «CalculiX Version 2.22, Copyright(C) 1998-2024 Guido Dhondt»."""
    # «CalculiX Version», non «Version»: un `*WARNING` che nomina la versione di un elemento
    # non è la versione del solutore
    return next((r.strip() for r in registro.splitlines() if "CalculiX Version" in r), None)


def _sommita(blocchi: list, passo: int, deck: _inp.Inp) -> dict:
    """Lo spostamento `medio` per componente, sui soli nodi del set di sommità. Set assente o
    nessun blocco per quel passo: dizionario vuoto, non un `KeyError` — un deck che non
    dichiara `TOP` non è un deck rotto."""
    nodi = deck.set_nodi.get(SET_SOMMITA)
    if not nodi:
        return {}
    # a ritroso: l'ultimo incremento scritto per quel passo è quello a cui `leggi_reazioni`
    # legge le forze, e sommità e reazioni devono venire dallo stesso istante
    for b in reversed(blocchi):
        if b.grandezza != "DISP" or b.modale or b.passo != passo:
            continue
        dati = b.dati[np.isin(b.nodi, np.array(nodi))][:, :3]
        if not len(dati):
            break
        return {SET_SOMMITA: {"medio": [float(x) for x in dati.mean(axis=0)]}}
    return {}


def _masse_per_modo(righe: list[str]) -> list[list[float]]:
    """Le righe per modo del blocco `EFFECTIVE MODAL MASS`. `leggi_massa_modale` legge il
    solo totale, che qui è il denominatore: il numeratore è modo per modo."""
    masse: list[list[float]] = []
    dentro = False
    for riga in righe:
        if solve._INTESTAZIONE_MODALE in riga:
            dentro = True
            continue
        if not dentro:
            continue
        campi = riga.split()
        if len(campi) == 7 and campi[0].isdigit():
            masse.append([float(x) for x in campi[1:]])
        elif masse:  # la riga `TOTAL` chiude il blocco
            break
    return masse


def _modi(dat: Path, righe: list[str]) -> list[dict]:
    """Frequenze e massa partecipante per modo, in frazione della massa efficace totale.

    Lista vuota se il deck non chiedeva la modale: non è uno zero, è «non c'era».
    """
    frequenze = solve.leggi_frequenze(dat, righe=righe)
    totali = solve.leggi_massa_modale(dat, righe=righe)
    per_modo = _masse_per_modo(righe)
    modi: list[dict] = []
    cumulata = {"x": 0.0, "y": 0.0, "z": 0.0}
    for k, f in enumerate(frequenze):
        quota = {}
        for j, asse in enumerate("xyz"):
            disponibile = totali["disponibile"][j] if totali else 0.0
            quota[asse] = per_modo[k][j] / disponibile if k < len(per_modo) and disponibile else 0.0
            cumulata[asse] += quota[asse]
        modi.append({"f": f, "massa_partecipante": quota, "cumulata": dict(cumulata)})
    return modi


def _verdetto_reazioni(passo: _inp.Passo, reazioni: dict, deck: _inp.Inp) -> dict:
    if not reazioni:
        return non_applicabile("reazioni", "nessuna reazione stampata per questo passo: il deck "
                               "non ci ha messo un *NODE PRINT con RF", passo.nome)
    if not passo.gravita:
        return non_applicabile("reazioni", "carichi del deck non ricostruiti: fuori dal passo "
                               "gravitazionale il peso atteso non si conosce", passo.nome)
    if deck.massa is None or passo.g is None or deck.quota_vincolati is None:
        manca = ("due materiali, la massa non è ρ·V" if deck.n_materiali > 1 else
                 "il deck non dichiara *DENSITY" if deck.densita is None else
                 f"elemento {deck.tipo_elemento}: volume e quota tributaria sono esatti solo "
                 f"su {_inp.TIPO_ESATTO}" if deck.massa is None else
                 "*BOUNDARY solo dentro *STEP: nessun vincolo globale, la quota tributaria "
                 "non si calcola")
        return non_applicabile("reazioni", f"{manca}: il peso atteso non si calcola", passo.nome)
    # la reazione è opposta al carico, e `Passo.gravita` ha già preteso che la gravità
    # del passo vada esattamente lungo −z: il peso atteso in reazione è quindi +z
    atteso = (0.0, 0.0, (deck.massa - deck.quota_vincolati) * passo.g)
    c = solve.controlla_reazioni(reazioni, atteso, solve._TOLLERANZA_REAZIONI)
    return verdetto("reazioni", c, passo.nome,
                     f"Σ reazioni {c['somma']} contro (ρV − quota dei vincolati)·g {atteso}, "
                     f"scarto {c['scarto_relativo']}")


def _componi(deck: _inp.Inp, copia: Path, dat: Path, blocchi: list, righe: list[str],
             registro: str, cartella: Path) -> dict:
    passi: dict[str, dict] = {}
    verdetti: list[dict] = []
    for numero, passo in enumerate(deck.passi, start=1):
        if passo.tipo != "statico":
            continue  # il blocco «forces» dopo il passo modale appartiene ai modi, non a un passo
        reazioni = solve.leggi_reazioni(dat, passo=numero, righe=righe)
        # nessuna reazione stampata non è «somma zero»: è un dato che non c'è
        somma = ([float(x) for x in np.sum(np.array(list(reazioni.values())), axis=0)]
                 if reazioni else None)
        passi[passo.nome] = {"reazioni_somma": somma, "n_reazioni": len(reazioni),
                             "u_set": _sommita(blocchi, numero, deck)}
        verdetti.append(_verdetto_reazioni(passo, reazioni, deck))
    avvisi = registro.count("*WARNING")
    verdetti.append(verdetto("avvisi", solve.controlla_avvisi(avvisi), None,
                              f"{avvisi} *WARNING nel registro"))
    verdetti.append(verdetto("marcatore", {"passato": True, "marcatore": MARCA_FINE}, None,
                              f"«{MARCA_FINE}» nello stdout e {len(blocchi)} blocchi chiusi nel .frd"))
    return {
        "run": {"id": uuid.uuid4().hex[:12], "data": _dt.datetime.now().isoformat(timespec="seconds"),
                "solutore": "CalculiX", "versione": _versione(registro), "deck": str(copia),
                "sha256_deck": hashlib.sha256(copia.read_bytes()).hexdigest(),
                "registro": str(cartella / NOME_REGISTRO), "g": deck.g,
                "n_nodi": deck.n_nodi, "n_elementi": deck.n_elementi,
                "tipo_elemento": deck.tipo_elemento, "volume": deck.volume,
                "quota_vincolati": deck.quota_vincolati},
        "massa": deck.massa, "passi": passi, "modi": _modi(dat, righe), "verdetti": verdetti,
    }
