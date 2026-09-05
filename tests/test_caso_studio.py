"""Caso studio MURO 1 (docs/caso-studio/README.md): modello a mano dalle sezioni nominali
della tavola, statica sui tre casi del deck ccx e modale «auto». Ogni test è ancorato a una
riga di «Ingressi degeneri» del brief Task 4; la mappa riga -> test sta nel report.
"""
from __future__ import annotations

import json
import math
import socket
import subprocess
import sys
import time
from pathlib import Path

import pytest

from nova import check, modale as _modale, modello as _modello
from nova.deck import GRAVITA

FILE_MODELLO = Path(__file__).parents[1] / "docs" / "caso-studio" / "muro_1.nova.json"


def _leggi_muro_1() -> dict:
    return json.loads(FILE_MODELLO.read_text(encoding="utf-8"))


# --- riga 1: il file passa `carica` con extra="forbid"; check_model senza non_passato;
# armatura_mancante non_applicabile con oggetto None (tutte le sezioni hanno barre) -------

def test_carica_passa_e_check_model_non_ha_non_passato():
    m = _modello.carica(_leggi_muro_1())
    verdetti = check.check_model(m)
    non_passati = [v["controllo"] for v in verdetti if v["esito"] == "non_passato"]
    assert non_passati == []
    armatura = next(v for v in verdetti if v["controllo"] == "armatura_mancante")
    assert armatura["esito"] == "non_applicabile" and armatura["oggetto"] is None


# --- riga 2: casi_dichiarati = Z1, Z2, Z3, C1, C2, C3; nessun Z4 generato -----------------

def test_casi_dichiarati_sono_i_sei_attesi_senza_z4_generato():
    m = _modello.carica(_leggi_muro_1())
    m = _modello.assicura_peso_proprio(m)  # no-op: l'azione 1 è già generata=true nel file
    assert len(m.azioni) == 3
    assert _modello.casi_dichiarati(m) == ["Z1", "Z2", "Z3", "C1", "C2", "C3"]


def _massa_a_mano(m) -> float:
    """Massa del telaio dalle sezioni nominali, indipendente da `deck._massa_lineare`:
    stessa formula (area lorda meno barre in cls, più barre in acciaio) ma con le aree
    delle barre contate a mano dalla tavola invece che lette dal deck."""
    from nova import catalogo

    densita_cls = catalogo.valori(m.materiale(1))["densita"]
    densita_acc = catalogo.valori(m.materiale(2))["densita"]

    def area(n_diametri: list[tuple[int, float]]) -> float:
        return sum(n * math.pi * d ** 2 / 4 for n, d in n_diametri)

    # (b, h, L, [(n, diametro), ...])
    membri = [
        (172, 172, 1607.5, [(2, 12.0), (2, 12.0)]),  # columna sx: inf 2Ø12 + sup 2Ø12
        (172, 172, 1607.5, [(2, 12.0), (2, 12.0)]),  # columna dx
        (140, 175, 2262.0, [(2, 10.0), (2, 8.0)]),   # viga superior: sup 2Ø10 + inf 2Ø8
        (250, 250, 2262.0, [(3, 16.0), (3, 16.0)]),  # viga inferior: inf 3Ø16 + sup 3Ø16
    ]
    totale = 0.0
    for b, h, L, barre in membri:
        a_barre = area(barre)
        massa_lineare = (b * h - a_barre) * densita_cls + a_barre * densita_acc
        totale += massa_lineare * L
    return totale


def _corsa(chiedi, tmp_path, **extra) -> dict:
    (r,) = chiedi({"id": 1, "comando": "corsa", "modello": _leggi_muro_1(),
                   "cartella": str(tmp_path), "casi": ["C1", "C2", "C3"], **extra})
    return r[-1]


def _somma_reazioni(risultati: dict, caso: str) -> tuple[float, float, float]:
    import numpy as np
    reazioni = risultati["per_caso"][caso]["reazioni"]
    return tuple(float(x) for x in np.sum([v[:3] for v in reazioni.values()], axis=0))


# --- riga 3 (C1) e riga 4 (C2, C3): equilibrio con la massa dalle sezioni nominali --------

def test_equilibrio_c1_c2_c3_dalle_sezioni_nominali(chiedi, binario_opensees, tmp_path):
    fin = _corsa(chiedi, tmp_path)
    assert fin["esito"] == "ok", fin
    ris = fin["risultati"]
    assert ris["run"]["casi"] == ["C1", "C2", "C3"]  # niente Z4 nella corsa

    m = _modello.carica(_leggi_muro_1())
    massa = _massa_a_mano(m)

    for caso in ("C1", "C2", "C3"):
        somma = _somma_reazioni(ris, caso)
        atteso = tuple(-x for x in ris["run"]["carico_totale"][caso])
        scarto = math.dist(somma, atteso) / max(math.hypot(*atteso), 1.0)
        assert scarto <= 1e-6, (caso, somma, atteso)

    rz_c1 = _somma_reazioni(ris, "C1")[2]
    assert rz_c1 == pytest.approx(massa * GRAVITA, rel=1e-6)

    rx_c2 = _somma_reazioni(ris, "C2")[0]
    assert rx_c2 == pytest.approx(-0.10 * rz_c1, rel=1e-6)

    rz_c3 = _somma_reazioni(ris, "C3")[2]
    assert rz_c3 == pytest.approx(rz_c1 + 1200.0, rel=1e-6)


# --- riga 6: modale auto -> massa_modale passato; un modo con ux dominante ai nodi 3-4,
# uno con uy dominante fra i primi tre ------------------------------------------------------

def _asse_dominante(modo: dict, nodi=("3", "4")) -> str:
    massimi = {"x": 0.0, "y": 0.0, "z": 0.0}
    for nid in nodi:
        for asse, val in zip("xyz", modo["forma"][nid]):
            massimi[asse] = max(massimi[asse], abs(val))
    return max(massimi, key=massimi.get)


def test_modale_auto_massa_modale_passato_e_direzioni_dominanti(chiedi, binario_opensees, tmp_path):
    fin = _corsa(chiedi, tmp_path)
    assert fin["esito"] == "ok", fin
    ris = fin["risultati"]
    verdetti = {v["controllo"]: v for v in ris["verdetti"] if v.get("caso") is None}
    assert verdetti["massa_modale"]["esito"] == "passato", verdetti["massa_modale"]

    primi = ris["modi"][:3]
    dominanti = [_asse_dominante(modo) for modo in primi]
    assert "x" in dominanti, dominanti  # nel piano (ux ai nodi 3-4), da confrontare con 34,0 Hz ccx
    assert "y" in dominanti, dominanti  # fuori piano (uy ai nodi 3-4), da confrontare con 21,0 Hz ccx


# --- riga 7: spostamenti e reazioni passato su tutti i casi -------------------------------

def test_spostamenti_e_reazioni_passato_su_tutti_i_casi(chiedi, binario_opensees, tmp_path):
    fin = _corsa(chiedi, tmp_path)
    assert fin["esito"] == "ok", fin
    per_caso = {(v["controllo"], v["caso"]): v["esito"] for v in fin["risultati"]["verdetti"] if v["caso"]}
    for caso in ("C1", "C2", "C3"):
        assert per_caso[("spostamenti", caso)] == "passato", caso
        assert per_caso[("reazioni", caso)] == "passato", caso


# --- ultima riga: `python -m nova` + POST /api/modello/apri -> 200 con la stessa impronta
# di `carica` (prova reale con curl, porta libera >= 8793) ---------------------------------

def _porta_libera(minimo: int = 8793) -> int:
    for porta in range(minimo, minimo + 50):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(("127.0.0.1", porta)) != 0:
                return porta
    raise RuntimeError("nessuna porta libera trovata")


def _curl(*args: str) -> tuple[int, str]:
    """`curl -s -w "\\n%{http_code}"`: l'ultima riga dell'uscita è il codice, il resto il corpo."""
    r = subprocess.run(["curl", "-s", "-w", "\n%{http_code}", *args], capture_output=True, text=True, timeout=10)
    corpo, _, codice = r.stdout.rpartition("\n")
    return int(codice), corpo


def test_server_apri_muro_1_stessa_impronta_di_carica(tmp_path):
    porta = _porta_libera()
    processo = subprocess.Popen([sys.executable, "-m", "nova", "--porta", str(porta)], cwd=str(tmp_path),
                                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        base = f"http://127.0.0.1:{porta}"
        pronto = False
        for _ in range(50):
            try:
                codice, _ = _curl(f"{base}/api/salute")
                if codice == 200:
                    pronto = True
                    break
            except subprocess.TimeoutExpired:
                pass
            time.sleep(0.2)
        assert pronto, "il server non ha risposto entro il timeout"

        corpo_richiesta = json.dumps({"percorso": str(FILE_MODELLO.resolve())})
        codice, corpo = _curl("-X", "POST", f"{base}/api/modello/apri",
                              "-H", "Content-Type: application/json", "-d", corpo_richiesta)
        assert codice == 200, corpo
        impronta_server = json.loads(corpo)["impronta"]
    finally:
        processo.terminate()
        processo.wait(timeout=10)

    impronta_attesa = _modello.impronta(_modello.carica(_leggi_muro_1()))
    assert impronta_server == impronta_attesa
