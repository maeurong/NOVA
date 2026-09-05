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

from nova import ccx as _ccx, check, confronto as _confronto, modale as _modale, modello as _modello
from nova.deck import GRAVITA

FILE_MODELLO = Path(__file__).parents[1] / "docs" / "caso-studio" / "muro_1.nova.json"
DECK_VERO = Path(__file__).resolve().parents[1] / "lab_telaio_v2" / "wall_model.inp"


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


# --- il tetto dei modi con le aste suddivise ---------------------------------------------

def test_il_tetto_dei_modi_conta_i_nodi_delle_suddivisioni():
    """Quattro aste con `suddivisioni: 4`: dodici nodi interni, liberi e con la massa
    dell'elemento addosso, più i nodi 3 e 4 liberi. Il tetto di «auto» è 42, non 6, e con 6
    la massa modale in z non arrivava mai all'85 %."""
    m = _modello.carica(_leggi_muro_1())
    assert all(a.suddivisioni == 4 for a in m.aste)
    assert _modale.gradi_liberi(m) == 42


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

    assert ris["run"]["modi_provati"][-1] == 42, ris["run"]["modi_provati"]

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


# --- T4, ingresso degenere: la corsa elastica non guadagna niente ------------------------

def test_la_corsa_elastica_del_muro_1_non_ha_passi_ne_pushover(chiedi, binario_opensees, tmp_path):
    """`muro_1.nova.json` resta elastico — è il modello del confronto ccx — e il JSON della
    sua corsa non cambia forma con il non lineare: `passi` vuoto, `caduta` e `run.pushover`
    a `null`, `convergenza` non applicabile su ogni caso con la sua ragione.

    Regressione dei campi di T1-T3: `run` porta le stesse chiavi e `per_caso` le stesse
    quattro, con `stato_sezioni` vuoto (una `patch` di `uniaxialMaterial Elastic` non ha
    uno stato di sezione da leggere, e inventarne uno elastico direbbe di un controllo che
    nessuno ha fatto).
    """
    fin = _corsa(chiedi, tmp_path)
    assert fin["esito"] == "ok", fin
    ris = fin["risultati"]
    assert ris["passi"] == [] and ris["caduta"] is None
    assert ris["run"]["pushover"] is None
    assert ris["run"]["legami"] == "elastico" and ris["run"]["passi"] == 0
    assert ris["run"]["materiali"] == {}
    for caso in ("C1", "C2", "C3"):
        v = next(x for x in ris["verdetti"]
                 if x["controllo"] == "convergenza" and x["caso"] == caso)
        assert v["esito"] == "non_applicabile" and "corsa elastica" in v["ragione"]
        assert set(ris["per_caso"][caso]) == {"con_segno", "spostamenti", "reazioni",
                                              "sollecitazioni", "stato_sezioni"}
        assert ris["per_caso"][caso]["stato_sezioni"] == {}
    # C1 dedicato: senza spinta dichiarata il controllo esce lo stesso, non applicabile
    v = next(x for x in fin["verdetti_check"] if x["controllo"] == "pushover")
    assert v["esito"] == "non_applicabile"


# --- T4: la pushover del MURO 1 -----------------------------------------------------------
#
# Il file della spinta è **separato** da `muro_1.nova.json`, e non è una duplicazione per
# comodità: `deck._legami_dichiarati` sceglie i legami per **tutto** il deck, quindi una
# statica «legami: fibre» dentro `muro_1.nova.json` avrebbe reso a fibre anche i casi
# C1/C2/C3 del confronto con ccx, che è lineare elastico. I due file portano la stessa
# struttura e differiscono nelle sole analisi: il test qui sotto lo pinza.

FILE_PUSHOVER = FILE_MODELLO.parent / "muro_1_pushover.nova.json"
CSV_PUSHOVER = FILE_MODELLO.parent / "pushover.csv"


def test_il_file_della_spinta_e_lo_stesso_telaio_con_altre_analisi():
    """La sola deriva possibile fra i due file è la geometria, e questo la chiude."""
    base = _leggi_muro_1()
    push = json.loads(FILE_PUSHOVER.read_text(encoding="utf-8"))
    assert {k: v for k, v in base.items() if k != "analisi"} == \
           {k: v for k, v in push.items() if k != "analisi"}
    assert push["analisi"] == [
        {"tipo": "statica", "casi": ["C1", "C3"], "legami": "fibre", "passi": 10},
        {"tipo": "pushover", "distribuzione": "uniforme", "nodo_controllo": 3, "dof": "ux",
         "incremento": 0.5, "spostamento_max": 60.0, "caso_gravita": "C1"}]
    m = _modello.carica(push)
    verdetti = {v["controllo"]: v for v in check.check_model(m)}
    assert verdetti["pushover"]["esito"] == "passato", verdetti["pushover"]
    # con una statica a fibre il controllo dell'armatura ha un oracolo, e le sezioni ce l'hanno
    assert verdetti["armatura_mancante"]["esito"] == "passato"


@pytest.fixture(scope="module")
def spinta_muro_1(tmp_path_factory, binario_opensees):
    from nova import sidecar
    cartella = tmp_path_factory.mktemp("pushover_muro_1")
    r = sidecar.rispondi({"comando": "corsa",
                          "modello": json.loads(FILE_PUSHOVER.read_text(encoding="utf-8")),
                          "cartella": str(cartella), "casi": ["C1", "C3"]}, lambda ev: None)
    return r, cartella


def test_pushover_muro_1(spinta_muro_1):
    """Misurato il 05/09/2026, OpenSees 3.8.0, ≈ 2 s: 120 passi da 0,5 mm fino a 60,000 mm,
    **nessuna caduta**, taglio alla base massimo 72 115,2 N al passo 109 (54,5 mm) e 70 932,9 N
    all'ultimo. Scala di algoritmi ai passi 18, 36, 89, 113 (`KrylovNewton`).

    Gli oracoli sono proprietà, non i numeri: la spinta arriva in fondo senza cadere,
    l'equilibrio `taglio_base = −Σ reazioni` tiene a ogni passo, il massimo **non** è
    l'ultimo passo (c'è un ramo calante) e le sezioni che cedono sono quelle del meccanismo
    a nodi fissi: i due piedi dei pilastri e i due estremi della trave superiore.
    I numeri stanno nel report e in `docs/caso-studio/pushover.csv`.

    **Verifica del codice, non validazione**: nessuna prova ai pistoni è documentata sulla
    tavola, e nessun numero qui è confrontato con una misura di laboratorio.
    """
    import numpy as np

    r, cartella = spinta_muro_1
    assert r["esito"] == "ok", r.get("motivo") or r
    ris = r["risultati"]
    passi = ris["passi"]

    assert ris["caduta"] is None, ris["caduta"]
    assert len(passi) == 120 and [p["n"] for p in passi] == list(range(1, 121))
    assert passi[0]["spostamento"] == pytest.approx(0.5, abs=1e-3)
    assert passi[-1]["spostamento"] == pytest.approx(60.0, abs=1e-3)
    assert all(b["spostamento"] > a["spostamento"] for a, b in zip(passi, passi[1:]))

    # l'equilibrio per passo, letto dal recorder e non dal JSON che lo compone
    R = np.loadtxt(cartella / "push_reazioni.out")
    tag = {int(k): v for k, v in ris["run"]["mappa_tag"]["nodo"].items()}
    for k, p in enumerate(passi):
        atteso = -sum(R[k, 1 + 6 * (tag[t] - 1)] for t in (1, 2))
        assert p["taglio_base"] == pytest.approx(atteso, rel=1e-6, abs=1e-6), k

    tagli = [p["taglio_base"] for p in passi]
    assert tagli.index(max(tagli)) < len(tagli) - 1  # il ramo calante c'è
    assert max(tagli) == pytest.approx(72115.2, rel=1e-3)

    # il meccanismo: piedi dei pilastri (aste 2 e 3, stazione 0) e i due estremi della trave
    # superiore (asta 4, stazioni 0 e 16), e nessun'altra stazione
    ultimo = passi[-1]["stato_sezioni"]
    ceduto = {(a, i) for a, st in ultimo.items() for i, s in enumerate(st)
              if s["calcestruzzo"] == "schiacciata" or s["acciaio"] == "rotta"}
    assert ceduto == {("2", 0), ("3", 0), ("4", 0), ("4", 16)}, sorted(ceduto)
    for asta, stazione in ceduto:
        assert ultimo[asta][stazione] == {"calcestruzzo": "schiacciata", "acciaio": "rotta"}
    assert {s["calcestruzzo"] for st in passi[0]["stato_sezioni"].values() for s in st} == {"elastica"}

    v = next(x for x in ris["verdetti"]
             if x["controllo"] == "convergenza" and x["caso"] == "pushover")
    assert v["esito"] == "passato" and v["valori"]["caduta"] is None


def test_la_curva_esportata_e_quella_della_corsa(spinta_muro_1):
    """`docs/caso-studio/pushover.csv` non si scrive a mano: le righe vengono dai `passi[]`
    della corsa, e questo test le rimette a confronto passo per passo."""
    passi = spinta_muro_1[0]["risultati"]["passi"]
    righe = CSV_PUSHOVER.read_text(encoding="utf-8").splitlines()
    assert righe[0] == "passo;spostamento_mm;taglio_base_N;algoritmo"
    assert len(righe) - 1 == len(passi)
    for riga, p in zip(righe[1:], passi):
        n, u, taglio, algoritmo = riga.split(";")
        assert int(n) == p["n"] and algoritmo == p["algoritmo"]
        assert float(u) == pytest.approx(p["spostamento"], abs=1e-6)
        assert float(taglio) == pytest.approx(p["taglio_base"], rel=1e-6, abs=1e-3)


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


# --- Task 3: tabella di confronto sul deck vero -------------------------------------------
# Ogni test è ancorato a una riga di «Ingressi degeneri» del brief Task 3; la mappa
# riga -> test sta nel report.

# `assi`: la x del telaio (nel piano del muro) è la y del deck solido, che ha il muro sul
# piano y-z. Senza la dichiarazione f1 leggerebbe il modo fuori piano del solido.
MAPPA_CASI_MURO_1 = {"C1": "GRAVITA", "C2": "SPINTA_ORIZZONTALE", "C3": "CARICO_TOP",
                     "nodi_sommita": [3, 4], "assi": {"x": "y", "y": "x", "z": "z"}}


def _assicura_ok(fin: dict) -> dict:
    """Il motivo nel messaggio d'errore su un esito diverso da `ok`, mai un `KeyError`."""
    assert fin.get("esito") == "ok", fin.get("motivo") or fin
    return fin["risultati"]


# --- riga 4: solido senza modi -> f1/f2/f3 non_confrontabile con ragione, esportati comunque

def test_righe_dei_modi_non_confrontabili_quando_il_solido_non_ha_modi(tmp_path):
    telaio = {
        "run": {"casi": [], "carico_totale": {}, "mappa_tag": {"nodo": {"3": 3, "4": 4}}},
        "per_caso": {},
        "modi": [
            {"f": 10.0, "forma": {"3": [1.0, 0.0, 0.0], "4": [1.0, 0.0, 0.0]},
             "massa_partecipante": {"x": 0.7, "y": 0.0, "z": 0.0},
             "cumulata": {"x": 0.7, "y": 0.0, "z": 0.0}},
            {"f": 15.0, "forma": {"3": [0.0, 1.0, 0.0], "4": [0.0, 1.0, 0.0]},
             "massa_partecipante": {"x": 0.0, "y": 0.7, "z": 0.0},
             "cumulata": {"x": 0.7, "y": 0.7, "z": 0.0}},
            {"f": 22.0, "forma": {"3": [0.0, 0.0, 1.0], "4": [0.0, 0.0, 1.0]},
             "massa_partecipante": {"x": 0.0, "y": 0.0, "z": 0.7},
             "cumulata": {"x": 0.7, "y": 0.7, "z": 0.7}},
        ],
    }
    solido = {"massa": None, "passi": {}, "modi": []}  # deck senza *FREQUENCY
    tabella = _confronto.confronta(telaio, solido, None, {"nodi_sommita": [3, 4]})
    righe_f = {r.grandezza: r for r in tabella.righe if r.grandezza in ("f1", "f2", "f3")}
    for etichetta in ("f1", "f2", "f3"):
        assert righe_f[etichetta].classe_solido == "non_confrontabile"
        assert righe_f[etichetta].ragione, etichetta

    file = _confronto.esporta(tabella, tmp_path)
    csv_testo = file["csv"].read_text(encoding="utf-8")
    for etichetta in ("f1", "f2", "f3"):
        assert etichetta in csv_testo  # il .md le riporta comunque: l'export non le filtra


# --- righe 1 e 2: deck o binari assenti -> il test salta, non fallisce; il caso studio vero:
# NOVA (Task 2) contro il solido ccx (Task 1) sul deck vero -------------------------------

def test_confronto_sul_deck_vero(chiedi, tmp_path, binario_opensees, binario_ccx):
    if not DECK_VERO.is_file():
        pytest.skip(f"{DECK_VERO} non c'è (2,5 MB, non versionato)")

    # "Z1" oltre a C1-C3: la massa del telaio (prima riga) viene dal carico_totale di
    # un'azione di solo peso proprio (`_caso_gravita`), non da una combinazione C<id>.
    fin = _corsa(chiedi, tmp_path / "nova", casi=["Z1", "C1", "C2", "C3"])
    telaio = _assicura_ok(fin)

    esito_ccx = _ccx.esegui(DECK_VERO, tmp_path / "ccx")
    solido = _assicura_ok(esito_ccx)

    tabella = _confronto.confronta(telaio, solido, None, MAPPA_CASI_MURO_1)

    assert tabella.righe[0].grandezza == "massa"
    scarto_massa = tabella.righe[0].scarto_solido_pct
    assert scarto_massa is not None
    # Misurato il 05/09/2026: 38,6 % (denominatore = massa del solido, il riferimento).
    # Atteso, non un difetto: la trave di fondazione e la trave superiore stanno
    # sull'interasse nel telaio, zapatas e tamponatura fuori dal solido.
    assert 37.6 < scarto_massa < 39.6, scarto_massa

    per_grandezza = {r.grandezza: r for r in tabella.righe if r.grandezza in ("f1", "f2", "f3")}
    for etichetta in ("f1", "f2", "f3"):
        assert per_grandezza[etichetta].classe_solido != "non_confrontabile", per_grandezza[etichetta]

    file = _confronto.esporta(tabella, tmp_path / "export")
    tex_testo = file["tex"].read_text(encoding="utf-8")
    csv_testo = file["csv"].read_text(encoding="utf-8")
    assert _confronto.AVVERTENZA in tex_testo
    assert _confronto.AVVERTENZA in csv_testo
