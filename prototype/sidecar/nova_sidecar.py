"""PROTOTIPO usa-e-getta (#9): il sidecar OpenSees di NOVA.

Catena: modello NOVA (JSON, #6/#7) → Check Model (C1) → `Telaio` di MeshRec →
`opensees.scrivi_tcl` **as-is** → subprocess `OpenSees` → `leggi_uscite` →
verdetti → risultati NOVA (JSON per corsa).

Protocollo: una riga JSON per richiesta su stdin, una o piu' righe JSON per
risposta su stdout (eventi di fase prima, risposta finale poi). Vedi `README.md`.

Cosa si prende as-is: `meshrec/core/opensees.py`, `solve.py`, `armatura.py`,
`config.py`, `materiali.py` (copie verbatim, impronte nel README). Cosa si
adatta: sta tutto in questo file, e la sezione «Adattamenti» del README lo
elenca con la misura che lo giustifica.
"""
from __future__ import annotations

import json
import math
import shutil
import sys
import time
from pathlib import Path
from typing import NamedTuple

import numpy as np

from meshrec.core import armatura, config, opensees, solve

# ---------------------------------------------------------------- catalogo NTC (minimo, #6: classe -> valori)
CALCESTRUZZO = {
    "C25/30": config.Material(name="C25_30", young=31_476.0, poisson=0.2, density=2.5e-9),
    "C28/35": config.Material(name="C28_35", young=32_308.0, poisson=0.2, density=2.5e-9),
}
ACCIAIO = {"B450C": config.Material(name="B450C", young=200_000.0, poisson=0.3, density=7.85e-9)}


class _Dichiarato(NamedTuple):
    material: config.Material


class _Sezione(NamedTuple):
    calcestruzzo_confinato: _Dichiarato
    calcestruzzo_copriferro: _Dichiarato
    acciaio: _Dichiarato


class _Elemento(NamedTuple):
    membratura: int
    stazione: int
    nodo_i: int
    nodo_j: int
    sezione: tuple[float, float]
    e1: np.ndarray
    e2: np.ndarray
    barre: list
    riempimento_sezione: float = 1.0


class _Telaio(NamedTuple):
    nodi: np.ndarray
    elementi: list
    giunzioni: list
    materiali: dict


class _Armatura(NamedTuple):
    """Il sottoinsieme di `ArmaturaConfig` che `armatura.colloca` legge (duck typing)."""
    barre_tese: int
    diametro_teso: float
    barre_compresse: int
    diametro_compresso: float
    diametro_staffe: float
    passo_staffe: float
    copriferro_nominale: float


# ---------------------------------------------------------------- Check Model (C1)
TOLLERANZA_COINCIDENZA_M = 1e-3  # 1 mm


def check_model(m: dict) -> list[dict]:
    """I controlli C1 di v1, ognuno con l'oracolo scritto nel verdetto.

    Esito a tre valori (#7): `passato | non_passato | non_applicabile`.
    """
    nodi = {n["id"]: n for n in m.get("nodi", [])}
    aste = m.get("aste", [])
    sezioni = m.get("sezioni", {})
    v: list[dict] = []

    def verdetto(controllo, esito, ragione, oggetto=None):
        v.append({"controllo": controllo, "esito": esito, "ragione": ragione, "oggetto": oggetto})

    # 1. unità dichiarate
    if m.get("unita") == "mm-N-MPa-t-s":
        verdetto("unita", "passato", "unita = mm-N-MPa-t-s")
    else:
        verdetto("unita", "non_passato", f"unita = {m.get('unita')!r}: il modello dichiara un sistema diverso da mm-N-MPa-t-s o nessuno")

    # 2. nodi coincidenti (entro 1 mm)
    ids = list(nodi)
    coincidenti = []
    for i in range(len(ids)):
        for j in range(i + 1, len(ids)):
            a, b = nodi[ids[i]], nodi[ids[j]]
            if math.hypot(a["x"] - b["x"], a.get("y", 0) - b.get("y", 0), a["z"] - b["z"]) < TOLLERANZA_COINCIDENZA_M:
                coincidenti.append((ids[i], ids[j]))
    if coincidenti:
        verdetto("nodi_coincidenti", "non_passato", f"{len(coincidenti)} coppie entro {TOLLERANZA_COINCIDENZA_M * 1e3:g} mm: {coincidenti[:5]}", coincidenti)
    else:
        verdetto("nodi_coincidenti", "passato", f"nessuna coppia entro {TOLLERANZA_COINCIDENZA_M * 1e3:g} mm")

    # 3. aste: estremi esistenti, lunghezza > 0, duplicati
    sconnesse = [a["id"] for a in aste if a["i"] not in nodi or a["j"] not in nodi]
    corte = []
    for a in aste:
        if a["i"] in nodi and a["j"] in nodi:
            ni, nj = nodi[a["i"]], nodi[a["j"]]
            if math.hypot(nj["x"] - ni["x"], nj["z"] - ni["z"]) < TOLLERANZA_COINCIDENZA_M:
                corte.append(a["id"])
    coppie = {}
    duplicate = []
    for a in aste:
        k = frozenset((a["i"], a["j"]))
        if k in coppie:
            duplicate.append((coppie[k], a["id"]))
        coppie[k] = a["id"]
    verdetto("aste_sconnesse", "non_passato" if sconnesse else "passato", f"aste con un estremo inesistente: {sconnesse or 'nessuna'}", sconnesse or None)
    verdetto("aste_lunghezza_zero", "non_passato" if corte else "passato", f"aste piu' corte di {TOLLERANZA_COINCIDENZA_M * 1e3:g} mm: {corte or 'nessuna'}", corte or None)
    verdetto("aste_duplicate", "non_passato" if duplicate else "passato", f"aste sugli stessi due nodi: {duplicate or 'nessuna'}", duplicate or None)

    # 4. nodi liberi (nessuna asta)
    toccati = {a["i"] for a in aste} | {a["j"] for a in aste}
    liberi = [i for i in ids if i not in toccati]
    verdetto("nodi_liberi", "non_passato" if liberi else "passato", f"nodi senza aste: {liberi or 'nessuno'}", liberi or None)

    # 5. nodo che cade su un'asta senza esserne estremo (#6: errore, «spezza asta»)
    interni = []
    for a in aste:
        if a["i"] not in nodi or a["j"] not in nodi:
            continue
        ni, nj = nodi[a["i"]], nodi[a["j"]]
        for k, n in nodi.items():
            if k in (a["i"], a["j"]):
                continue
            L2 = (nj["x"] - ni["x"]) ** 2 + (nj["z"] - ni["z"]) ** 2
            if not L2:
                continue
            t = ((n["x"] - ni["x"]) * (nj["x"] - ni["x"]) + (n["z"] - ni["z"]) * (nj["z"] - ni["z"])) / L2
            if 1e-6 < t < 1 - 1e-6:
                d = math.hypot(n["x"] - (ni["x"] + t * (nj["x"] - ni["x"])), n["z"] - (ni["z"] + t * (nj["z"] - ni["z"])))
                if d < TOLLERANZA_COINCIDENZA_M:
                    interni.append((k, a["id"]))
    verdetto("nodo_su_asta", "non_passato" if interni else "passato", f"nodi su un'asta senza esserne estremo (spezzare l'asta): {interni or 'nessuno'}", interni or None)

    # 6. massa nulla / sezione nulla
    nulle = [a["id"] for a in aste if a.get("sezione") not in sezioni or sezioni[a["sezione"]]["b"] * sezioni[a["sezione"]]["h"] <= 0]
    verdetto("sezione_nulla", "non_passato" if nulle else "passato", f"aste senza sezione o con b*h = 0: {nulle or 'nessuna'}", nulle or None)
    if not aste:
        verdetto("massa_nulla", "non_passato", "nessuna asta: massa totale zero, la modale non ha nulla da muovere")
    else:
        verdetto("massa_nulla", "passato", f"{len(aste)} aste con sezione")

    # 7. vincoli: dichiarati (#6) contro dedotti da opensees.py (_al_piede)
    dichiarati = sorted(k for k, n in nodi.items() if n.get("vincolo"))
    if not dichiarati:
        verdetto("vincoli", "non_passato", "nessun nodo con vincolo dichiarato: il telaio e' un moto rigido")
    elif len(dichiarati) == len(nodi):
        verdetto("vincoli", "non_passato", "ogni nodo e' vincolato: non resta nulla da calcolare")
    else:
        verdetto("vincoli", "passato", f"{len(dichiarati)} nodi vincolati: {dichiarati}")
    if aste and nodi and not sconnesse and not corte:
        t = da_nova(m, con_barre=False)
        dedotti = sorted(ids[i] for i in opensees._al_piede(t.nodi, t.elementi))
        if dedotti != dichiarati:
            verdetto("vincoli_dedotti", "non_passato", f"opensees.py dedurrebbe il piede dalla geometria: {dedotti}; NOVA dichiara {dichiarati}. Finche' scrivi_tcl e' as-is, vince la deduzione", {"dedotti": dedotti, "dichiarati": dichiarati})
        else:
            verdetto("vincoli_dedotti", "passato", f"piede dedotto = dichiarato: {dedotti}")
    # 8. moti rigidi: si misurano dopo la corsa (autovalori ~ 0), non prima
    verdetto("moti_rigidi", "non_applicabile", "si legge dopo la corsa dalla prima frequenza (controllo `autovalori`)")
    return v


# ---------------------------------------------------------------- NOVA -> Telaio
def da_nova(m: dict, *, con_barre: bool = True) -> _Telaio:
    """Il modello NOVA (#6, m e kN a video, qui gia' in mm-N) nel `Telaio` che `scrivi_tcl` legge.

    Adattamento 1: NOVA e' nel piano XZ con Z verticale, in **m** nel JSON di
    prova; `Telaio.nodi` e' (m,3) in **mm**. Adattamento 2: e1/e2 per asta da
    `rotazione_deg` = 0 (h nel piano del telaio). Adattamento 3: le barre da
    `armatura.colloca` vanno **centrate sul baricentro** (colloca le da' dallo
    spigolo). Adattamento 4: una membratura per asta, stazione 0.
    """
    ids = [n["id"] for n in m["nodi"]]
    idx = {k: i for i, k in enumerate(ids)}
    nodi = np.array([[n["x"] * 1e3, n.get("y", 0.0) * 1e3, n["z"] * 1e3] for n in m["nodi"]], dtype=np.float64)
    elementi, materiali = [], {}
    for k, a in enumerate(m["aste"]):
        s = m["sezioni"][a["sezione"]]
        b, h = s["b"] * 1e3, s["h"] * 1e3
        asse = nodi[idx[a["j"]]] - nodi[idx[a["i"]]]
        verticale = abs(asse[2]) > abs(asse[0])
        # e1 = e2 x asse: per un'asta nel piano xz coricata e1=(0,1,0), e2=(0,0,1); in piedi e1=(1,0,0), e2=(0,1,0)
        if verticale:
            e1, e2 = np.array([1.0, 0.0, 0.0]), np.array([0.0, 1.0, 0.0])
            sezione = (h, b)  # lungo e1 (x) sta h, lungo e2 (y) sta b
        else:
            e1, e2 = np.array([0.0, 1.0, 0.0]), np.array([0.0, 0.0, 1.0])
            sezione = (b, h)  # lungo e1 (y) sta b, lungo e2 (z) sta h
        if asse[0] < 0 and not verticale or asse[2] < 0 and verticale:
            e1 = -e1  # e1 deve restare e2 x asse col verso
        barre = []
        if con_barre and s.get("file"):
            file = {f["lato"]: f for f in s["file"]}
            inf, sup = file.get("inf", {"n": 0, "diametro": 0}), file.get("sup", {"n": 0, "diametro": 0})
            arm = _Armatura(inf["n"], inf["diametro"], sup["n"], sup["diametro"], s["staffe"]["diametro"], s["staffe"]["passo"], s["copriferro"])
            for br in armatura.colloca(arm, sezione):
                barre.append(armatura.BarraCollocata(br.y - sezione[0] / 2, br.z - sezione[1] / 2, br.diametro))
        elementi.append(_Elemento(k, 0, idx[a["i"]], idx[a["j"]], sezione, e1, e2, barre))
        cls = CALCESTRUZZO[m["materiali"][s["calcestruzzo"]]["classe"]]
        acc = ACCIAIO[m["materiali"][s["acciaio"]]["classe"]]
        materiali[k] = _Sezione(_Dichiarato(cls), _Dichiarato(cls), _Dichiarato(acc))
    return _Telaio(nodi, elementi, [], materiali)


# ---------------------------------------------------------------- risultati -> NOVA (#7)
def risultati_nova(m: dict, telaio: _Telaio, out_dir: Path, esito: dict) -> dict:
    ids = [n["id"] for n in m["nodi"]]
    campi = opensees.leggi_uscite(out_dir, telaio)
    caso = "GRAVITA"
    U = campi.get(f"U_{caso}")
    per_caso = {caso: {"con_segno": True, "spostamenti": {ids[i]: [float(x) for x in U[i]] for i in range(len(ids))} if U is not None else {}}}
    if f"N_{caso}" in campi:
        # Adattamento 5: opensees.py da' N, V, M **all'estremo j e in modulo** (recorder `force`), non per stazione:
        # per le stazioni Lobatto del #7 serve `recorder Element ... section <i> force`, che scrivi_tcl non scrive.
        per_caso[caso]["sollecitazioni_estremo_j"] = {m["aste"][k]["id"]: {"N": float(campi[f"N_{caso}"][k]), "V": float(campi[f"V_{caso}"][k]), "M": float(campi[f"M_{caso}"][k])} for k in range(len(m["aste"]))}
    al_piede = opensees._al_piede(telaio.nodi, telaio.elementi)
    reaz = opensees._reazioni_al_piede(out_dir, caso, len(ids), al_piede)
    per_caso[caso]["reazioni"] = {ids[k - 1]: list(v) for k, v in reaz.items()}
    modi = []
    for n in range(1, esito.get("modi", 0) + 1):
        forma = campi.get(f"MODO_{n}")
        modi.append({"n": n, "f": esito["frequenze_hz"][n - 1] if n - 1 < len(esito["frequenze_hz"]) else None, "forma": {ids[i]: [float(x) for x in forma[i]] for i in range(len(ids))} if forma is not None else {}})
    return {"run": {"solutore": "OpenSees", "returncode": esito["returncode"], "deck": esito["tcl"], "log": esito["log"], "mappa_tag": {"nodo": {ids[i]: i + 1 for i in range(len(ids))}, "asta": {m["aste"][k]["id"]: k + 1 for k in range(len(m["aste"]))}}},
            "per_caso": per_caso, "modi": modi, "verdetti": [{"controllo": k, "esito": ("non_applicabile" if not c.get("applicabile", True) else "passato" if c.get("passato") else "non_passato"), "ragione": c.get("motivo") or c.get("ragione") or "", "valori": {kk: vv for kk, vv in c.items() if kk not in ("passato", "applicabile", "motivo", "ragione")}} for k, c in esito["controlli"].items()]}


# ---------------------------------------------------------------- comandi
def _solutore(percorso: str | None) -> config.SolutoreConfig:
    return config.SolutoreConfig(nome="opensees", percorso=Path(percorso) if percorso else None)


def comando_verifica(req: dict) -> dict:
    """«C'e' e funziona»: `solve.verifica` as-is (marcatore, non exit code)."""
    cfg = _solutore(req.get("solutore"))
    stato = solve.disponibilita(cfg)["opensees"]
    if not stato["disponibile"]:
        return {"esito": "assente", "motivo": stato["motivo"], "dove_prenderlo": stato["dove_prenderlo"]}
    prova = solve.verifica(cfg)
    return {"esito": "ok" if prova["funziona"] else "rotto", "percorso": str(stato["percorso"]), "motivo": prova["motivo"]}


def comando_check(req: dict) -> dict:
    v = check_model(req["modello"])
    return {"esito": "rifiutato" if any(x["esito"] == "non_passato" for x in v) else "ok", "verdetti": v}


def comando_corsa(req: dict, emetti) -> dict:
    m = req["modello"]
    t0 = time.perf_counter()
    emetti({"evento": "fase", "nome": "check model"})
    v = check_model(m)
    if any(x["esito"] == "non_passato" for x in v) and not req.get("forza"):
        return {"esito": "rifiutato", "verdetti": v, "secondi": time.perf_counter() - t0}
    telaio = da_nova(m)
    out = Path(req.get("cartella") or "corsa")
    out.mkdir(parents=True, exist_ok=True)
    emetti({"evento": "fase", "nome": "scrivo il .tcl e lancio OpenSees"})
    try:
        esito = opensees.esegui(out, telaio, _solutore(req.get("solutore")), casi_di_carico=["GRAVITA", "MODALE"], modi=int(req.get("analisi", {}).get("modi", 3)))
    except RuntimeError as e:  # marcatore di fine mancante: OpenSees non e' arrivato in fondo
        registro = (out / opensees.NOME_REGISTRO)
        coda = registro.read_text(encoding="utf-8", errors="replace")[-1500:] if registro.is_file() else ""
        return {"esito": "errore", "fase": "solutore", "motivo": str(e).split("Coda dell'uscita")[0].strip(), "coda_log": coda, "verdetti_check": v, "secondi": time.perf_counter() - t0}
    except ValueError as e:  # scrivi_tcl rifiuta: modello degenere che il check non ha preso
        return {"esito": "errore", "fase": "scrittura tcl", "motivo": str(e), "verdetti_check": v, "secondi": time.perf_counter() - t0}
    if not esito.get("eseguito"):
        return {"esito": "assente", "motivo": esito["motivo"], "dove_prenderlo": esito["dove_prenderlo"], "secondi": time.perf_counter() - t0}
    emetti({"evento": "fase", "nome": "leggo i recorder"})
    r = risultati_nova(m, telaio, out, esito)
    r["verdetti_check"] = v
    return {"esito": "ok", "risultati": r, "secondi": time.perf_counter() - t0}


def servi(ingresso=sys.stdin, uscita=sys.stdout):
    """Una riga JSON per richiesta; eventi e risposta finale come righe JSON con lo stesso `id`."""
    for riga in ingresso:
        riga = riga.strip()
        if not riga:
            continue
        try:
            req = json.loads(riga)
        except json.JSONDecodeError as e:
            uscita.write(json.dumps({"id": None, "esito": "errore", "motivo": f"richiesta non JSON: {e}"}) + "\n"); uscita.flush(); continue
        rid = req.get("id")
        emetti = lambda ev: (uscita.write(json.dumps({"id": rid, **ev}, ensure_ascii=False) + "\n"), uscita.flush())
        try:
            if req.get("comando") == "verifica":
                risp = comando_verifica(req)
            elif req.get("comando") == "check":
                risp = comando_check(req)
            elif req.get("comando") == "corsa":
                risp = comando_corsa(req, emetti)
            elif req.get("comando") == "fine":
                uscita.write(json.dumps({"id": rid, "esito": "ciao"}) + "\n"); uscita.flush(); return
            else:
                risp = {"esito": "errore", "motivo": f"comando sconosciuto: {req.get('comando')!r} (verifica | check | corsa | fine)"}
        except Exception as e:  # il sidecar sopravvive e riporta: mai morire in silenzio
            risp = {"esito": "errore", "fase": "sidecar", "motivo": f"{type(e).__name__}: {e}"}
        uscita.write(json.dumps({"id": rid, **risp}, ensure_ascii=False, default=str) + "\n"); uscita.flush()


if __name__ == "__main__":
    servi()
