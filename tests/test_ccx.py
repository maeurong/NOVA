"""Corse vere di CalculiX 2.22 sul deck `.inp`: l'oracolo è l'equilibrio in forma chiusa.

Ogni test è ancorato a una riga di «Ingressi degeneri» del brief Task 1; la mappa
riga → test sta nel report. Dove il ccx vero non sa fallire a comando (un `.frd`
troncato, un timeout, un `.dat` corrotto) al suo posto va un finto ccx che riversa
uscite preparate: il codice sotto prova è la lettura, non il solutore.
"""
import json
import stat
import subprocess
from pathlib import Path

import pytest

from conftest import FIXTURE
from meshrec.core import solve
from nova import ccx as _ccx

TRAVE = FIXTURE / "solido_piccolo" / "trave.inp"
DECK_VERO = Path(__file__).resolve().parents[1] / "lab_telaio_v2" / "wall_model.inp"

# misure del 05/09/2026, ccx 2.22 (README della fixture)
PESO_LETTO = 487.668350        # N: (ρV − quota di BASE)·g, non ρVg
MASSA = 2.5493e-09 * 2.0e7     # t
QUOTA = 0.00127465             # t


def _finto_ccx(cartella: Path, corpo: str) -> str:
    p = cartella / "finto_ccx"
    p.write_text("#!/bin/sh\n" + corpo, encoding="ascii")
    p.chmod(p.stat().st_mode | stat.S_IXUSR)
    return str(p)


@pytest.fixture(scope="session")
def uscite_vere(tmp_path_factory, binario_ccx) -> Path:
    """Un `.dat` e un `.frd` veri della fixture, da riversare quando serve un ccx finto."""
    d = tmp_path_factory.mktemp("uscite_vere")
    (d / "solido.inp").write_bytes(TRAVE.read_bytes())
    subprocess.run([binario_ccx, "-i", "solido"], cwd=d, capture_output=True, timeout=300, check=False)
    assert (d / "solido.frd").is_file() and (d / "solido.dat").is_file()
    return d


def _variante(tmp_path, nome: str, cambia) -> Path:
    p = tmp_path / nome
    p.write_text(cambia(TRAVE.read_text(encoding="ascii")), encoding="ascii")
    return p


def _senza_modale(testo: str) -> str:
    return testo[:testo.index("** NOME PASSO: MODALE")]


def _verdetto(risultati: dict, controllo: str, caso: str | None = None) -> dict:
    return next(v for v in risultati["verdetti"] if v["controllo"] == controllo and v["caso"] == caso)


# --- il binario: c'è, non c'è ------------------------------------------------

def test_verifica_riconosce_ccx(binario_ccx):
    v = _ccx.verifica(None)
    assert v["esito"] == "ok" and v["percorso"] == binario_ccx


def test_senza_ccx_nel_path_la_corsa_e_assente(tmp_path, monkeypatch):
    monkeypatch.setenv("PATH", str(tmp_path))
    r = _ccx.esegui(TRAVE, tmp_path / "corsa")
    assert r["esito"] == "assente"
    assert r["dove_prenderlo"] == solve.DOVE_PRENDERLO["calculix"] and "ccx" in r["motivo"]


# --- il deck che non si legge (il binario non parte nemmeno) -----------------

def _errore_deck(percorso_inp, tmp_path) -> dict:
    # un solutore che esiste ma non verrà mai eseguito: l'errore è del deck, non del binario
    return _ccx.esegui(percorso_inp, tmp_path / "corsa", percorso_solutore=str(TRAVE))


def test_un_inp_che_non_esiste_e_errore_di_deck(tmp_path):
    manca = tmp_path / "no.inp"
    r = _errore_deck(manca, tmp_path)
    assert r["esito"] == "errore" and r["fase"] == "deck" and str(manca) in r["motivo"]


def test_una_cartella_non_e_un_deck(tmp_path):
    r = _errore_deck(tmp_path, tmp_path)
    assert r["esito"] == "errore" and r["fase"] == "deck" and str(tmp_path) in r["motivo"]


def test_un_file_binario_non_e_un_deck(tmp_path):
    p = tmp_path / "b.inp"
    p.write_bytes(b"\xff\xfe\x00\x01binario")
    r = _errore_deck(p, tmp_path)
    assert r["esito"] == "errore" and r["fase"] == "deck" and str(p) in r["motivo"]


def test_un_deck_senza_step_e_errore_di_deck(tmp_path):
    p = _variante(tmp_path, "vuoto.inp", lambda t: t[:t.index("** NOME PASSO: GRAVITA")])
    r = _errore_deck(p, tmp_path)
    assert r["esito"] == "errore" and r["fase"] == "deck" and "nessun passo" in r["motivo"]


def test_un_deck_con_include_e_errore_di_deck_e_ccx_non_parte(tmp_path):
    """`*INCLUDE` fa leggere a ccx un file che il parser non vede: la corsa si ferma prima
    di copiare il deck, e l'errore è del deck (fase «deck», HTTP 400)."""
    p = tmp_path / "include.inp"
    p.write_text("*INCLUDE, INPUT=/etc/passwd\n*STEP\n*STATIC\n*END STEP\n", encoding="ascii")
    r = _errore_deck(p, tmp_path)
    assert r["esito"] == "errore" and r["fase"] == "deck" and "INCLUDE" in r["motivo"]
    assert not (tmp_path / "corsa" / _ccx.NOME_DECK).exists()


# --- la corsa buona ----------------------------------------------------------

@pytest.fixture
def corsa(tmp_path, binario_ccx) -> dict:
    fasi: list[str] = []
    r = _ccx.esegui(TRAVE, tmp_path / "corsa", emetti=lambda ev: fasi.append(ev["nome"]))
    assert r["esito"] == "ok", r
    r["fasi"] = fasi
    return r


def test_le_tre_fasi_escono_in_ordine(corsa):
    assert corsa["fasi"] == ["copio il deck", "lancio ccx", "leggo .dat e .frd"]


def test_la_massa_e_quella_della_mesh_non_le_reazioni(corsa):
    run = corsa["risultati"]["run"]
    assert corsa["risultati"]["massa"] == pytest.approx(MASSA, rel=1e-9)
    assert run["volume"] == pytest.approx(2.0e7, rel=1e-9)
    assert run["quota_vincolati"] == pytest.approx(QUOTA, rel=1e-9)
    assert run["g"] == 9810.0 and run["solutore"] == "CalculiX" and "2.22" in run["versione"]
    assert (run["n_nodi"], run["n_elementi"], run["tipo_elemento"]) == (315, 960, "C3D4")
    assert Path(run["deck"]).name == "solido.inp" and len(run["sha256_deck"]) == 64


def test_le_reazioni_lette_stanno_sui_tre_passi_statici(corsa):
    passi = corsa["risultati"]["passi"]
    assert list(passi) == ["GRAVITA", "SPINTA_ORIZZONTALE", "CARICO_TOP"]  # il modale non è un passo statico
    assert passi["GRAVITA"]["reazioni_somma"][2] == pytest.approx(PESO_LETTO, rel=1e-6)
    assert passi["GRAVITA"]["n_reazioni"] == 15
    assert passi["SPINTA_ORIZZONTALE"]["reazioni_somma"][1] == pytest.approx(-0.1 * PESO_LETTO, rel=1e-5)
    assert passi["CARICO_TOP"]["reazioni_somma"][2] == pytest.approx(PESO_LETTO + 1200.0, rel=1e-6)


def test_lo_spostamento_di_top_viene_dal_frd(corsa):
    top = corsa["risultati"]["passi"]["GRAVITA"]["u_set"]["TOP"]
    assert top["medio"][2] == pytest.approx(-3.94202e-4, rel=1e-4)  # abbassamento, segno tenuto
    assert corsa["risultati"]["passi"]["CARICO_TOP"]["u_set"]["TOP"]["medio"][2] < top["medio"][2]


def test_i_modi_portano_frazioni_di_massa_partecipante(corsa):
    modi = corsa["risultati"]["modi"]
    assert len(modi) == 10
    assert modi[0]["f"] == pytest.approx(76.9531, rel=1e-5)
    assert modi[1]["f"] == pytest.approx(122.7747, rel=1e-5)
    assert modi[0]["massa_partecipante"]["y"] == pytest.approx(0.031054750 / 0.049180250, rel=1e-6)
    assert modi[-1]["cumulata"]["y"] == pytest.approx(0.046499950 / 0.049180250, rel=1e-6)
    for prima, dopo in zip(modi, modi[1:]):
        assert dopo["cumulata"]["y"] >= prima["cumulata"]["y"]  # è una cumulata, non può calare


def test_lequilibrio_e_verde_solo_dove_l_oracolo_esiste(corsa):
    ris = corsa["risultati"]
    v = _verdetto(ris, "reazioni", "GRAVITA")
    assert v["esito"] == "passato" and v["valori"]["scarto_relativo"] < solve._TOLLERANZA_REAZIONI
    assert v["valori"]["peso_atteso"] == [0.0, 0.0, pytest.approx((MASSA - QUOTA) * 9810.0, rel=1e-9)]
    for nome in ("SPINTA_ORIZZONTALE", "CARICO_TOP"):
        altro = _verdetto(ris, "reazioni", nome)
        assert altro["esito"] == "non_applicabile" and "carichi del deck non ricostruiti" in altro["ragione"]
    assert _verdetto(ris, "avvisi")["esito"] == "passato"
    assert _verdetto(ris, "marcatore")["esito"] == "passato"


def test_i_risultati_finiscono_su_disco(corsa, tmp_path):
    scritto = json.loads((tmp_path / "corsa" / _ccx.NOME_RISULTATI).read_text(encoding="utf-8"))
    assert scritto["massa"] == pytest.approx(MASSA, rel=1e-9) and scritto["run"]["id"]


def test_due_corse_nella_stessa_cartella_non_si_mescolano(tmp_path, binario_ccx):
    """La seconda corsa muore: di quella di prima non deve restare niente da rileggere.

    `.sta` e `.cvg` non stanno nell'elenco perché la corsa fallita se li riscrive da sé
    (misurato): quelli sulla cartella sono suoi, non della corsa di prima.
    """
    cartella = tmp_path / "corsa"
    assert _ccx.esegui(TRAVE, cartella)["esito"] == "ok"
    rotto = _variante(tmp_path, "rotto.inp", lambda t: t.replace("BASE, 1, 3", "NONESISTE, 1, 3"))
    assert _ccx.esegui(rotto, cartella)["esito"] == "errore"
    for nome in (_ccx.NOME_RISULTATI, "solido.frd"):
        assert not (cartella / nome).exists(), nome


# --- i modi di fallire del solutore -----------------------------------------

def test_un_deck_che_ccx_rifiuta_e_errore_di_solutore(tmp_path, binario_ccx):
    rotto = _variante(tmp_path, "rotto.inp", lambda t: t.replace("BASE, 1, 3", "NONESISTE, 1, 3"))
    r = _ccx.esegui(rotto, tmp_path / "corsa")
    assert r["esito"] == "errore" and r["fase"] == "solutore" and _ccx.MARCA_FINE in r["motivo"]
    assert any("*ERROR" in x for x in r["errori"]) and len(r["coda_log"]) <= 2000


def test_un_frd_troncato_e_errore_di_solutore(tmp_path, uscite_vere):
    """`ccx` ucciso a metà scrittura: `leggi_frd` conta i blocchi e lo dice."""
    tagliato = tmp_path / "tagliato"
    tagliato.mkdir()
    (tagliato / "solido.dat").write_bytes((uscite_vere / "solido.dat").read_bytes())
    righe = (uscite_vere / "solido.frd").read_text(encoding="ascii").splitlines()
    apre = next(i for i, r in enumerate(righe) if r.startswith(" -4"))
    fine = next(i for i, r in enumerate(righe) if i > apre and r.startswith(" -3"))
    (tagliato / "solido.frd").write_text("\n".join(righe[:fine]) + "\n", encoding="ascii")
    finto = _finto_ccx(tmp_path, f'cp "{tagliato}"/solido.dat "{tagliato}"/solido.frd . && echo "Job finished"\n')
    r = _ccx.esegui(TRAVE, tmp_path / "corsa", percorso_solutore=finto)
    assert r["esito"] == "errore" and r["fase"] == "solutore"
    assert "solido.frd" in r["motivo"] and "troncato" in r["motivo"]


def test_il_timeout_e_errore_di_solutore(tmp_path, monkeypatch):
    monkeypatch.setattr(_ccx, "_TIMEOUT_S", 0.5)
    finto = _finto_ccx(tmp_path, "sleep 5\n")
    r = _ccx.esegui(TRAVE, tmp_path / "corsa", percorso_solutore=finto)
    assert r["esito"] == "errore" and r["fase"] == "solutore" and "timeout" in r["motivo"]


def test_ccx_esce_zero_ma_senza_marcatore_e_errore_di_solutore(tmp_path):
    """`ccx -v` è il caso reale: esce 0 e non stampa mai «Job finished» — il codice
    d'uscita non è il segnale di fine, solo il marcatore lo è."""
    finto = _finto_ccx(tmp_path, "echo 'tutto tranquillo'\nexit 0\n")
    r = _ccx.esegui(TRAVE, tmp_path / "corsa", percorso_solutore=finto)
    assert r["esito"] == "errore" and r["fase"] == "solutore"
    assert _ccx.MARCA_FINE in r["motivo"] and "codice d'uscita 0" in r["motivo"]


def test_reazioni_che_non_tornano_bocciano_il_passo(tmp_path, uscite_vere):
    """Una riga del `.dat` corrotta: l'equilibrio è un controllo vero, non una tautologia."""
    guasto = tmp_path / "guasto"
    guasto.mkdir()
    (guasto / "solido.frd").write_bytes((uscite_vere / "solido.frd").read_bytes())
    righe = (uscite_vere / "solido.dat").read_text(encoding="ascii").splitlines()
    k = next(i for i, r in enumerate(righe) if r.split()[:1] == ["1"] and len(r.split()) == 4)
    campi = righe[k].split()
    righe[k] = f"         1  {float(campi[1]):E}  {float(campi[2]):E}  {2 * float(campi[3]):E}"
    (guasto / "solido.dat").write_text("\n".join(righe) + "\n", encoding="ascii")
    finto = _finto_ccx(tmp_path, f'cp "{guasto}"/solido.dat "{guasto}"/solido.frd . && echo "Job finished"\n')
    r = _ccx.esegui(TRAVE, tmp_path / "corsa", percorso_solutore=finto)
    assert r["esito"] == "ok", r
    v = _verdetto(r["risultati"], "reazioni", "GRAVITA")
    assert v["esito"] == "non_passato" and v["valori"]["scarto_relativo"] > solve._TOLLERANZA_REAZIONI


def test_senza_densita_la_massa_e_nulla_e_il_verdetto_non_si_applica(tmp_path, uscite_vere):
    """Il ccx vero non ci arriva («*ERROR in calinput: no density was assigned», misurato):
    la riga degenere vale sulla composizione dei risultati, e si prova con le uscite finte."""
    senza = _variante(tmp_path, "senza_rho.inp",
                      lambda t: _senza_modale(t).replace("*DENSITY\n2.5493e-09\n", ""))
    finto = _finto_ccx(tmp_path, f'cp "{uscite_vere}"/solido.dat "{uscite_vere}"/solido.frd . '
                                 f'&& echo "Job finished"\n')
    r = _ccx.esegui(senza, tmp_path / "corsa", percorso_solutore=finto)
    assert r["esito"] == "ok", r
    assert r["risultati"]["massa"] is None and r["risultati"]["run"]["quota_vincolati"] is None
    v = _verdetto(r["risultati"], "reazioni", "GRAVITA")
    assert v["esito"] == "non_applicabile" and "DENSITY" in v["ragione"]


def test_due_materiali_il_verdetto_dice_che_la_massa_non_e_rho_per_v(tmp_path, uscite_vere):
    """Due `*MATERIAL`: la prima `*DENSITY` non è la densità del solido, la massa non si
    calcola e la ragione lo dice — non «il deck non dichiara *DENSITY», che sarebbe falso."""
    due = _variante(tmp_path, "due_materiali.inp",
                    lambda t: _senza_modale(t).replace(
                        "*BOUNDARY\n",
                        "*MATERIAL, NAME=ACCIAIO\n*ELASTIC\n210000.0, 0.3\n*DENSITY\n7.85e-09\n"
                        "*BOUNDARY\n", 1))
    finto = _finto_ccx(tmp_path, f'cp "{uscite_vere}"/solido.dat "{uscite_vere}"/solido.frd . '
                                 f'&& echo "Job finished"\n')
    r = _ccx.esegui(due, tmp_path / "corsa", percorso_solutore=finto)
    assert r["esito"] == "ok", r
    assert r["risultati"]["massa"] is None
    v = _verdetto(r["risultati"], "reazioni", "GRAVITA")
    assert v["esito"] == "non_applicabile" and "due materiali" in v["ragione"]


def test_boundary_solo_nel_passo_il_verdetto_non_si_applica(tmp_path, uscite_vere):
    """F3: `*BOUNDARY` spostato dal vincolo globale dentro il primo `*STEP` (C11: non conta
    più fra i vincolati) lascia `quota_vincolati` a `None`: senza il fix il verdetto reazioni
    userebbe 0,0 come quota e fallirebbe per un motivo che non è del modello."""
    def sposta_boundary_nel_passo(t: str) -> str:
        t = t.replace("*BOUNDARY\nBASE, 1, 3\n", "", 1)
        return t.replace("*STEP\n*STATIC\n", "*STEP\n*STATIC\n*BOUNDARY\nBASE, 1, 3\n", 1)

    p = _variante(tmp_path, "boundary_nel_passo.inp", sposta_boundary_nel_passo)
    finto = _finto_ccx(tmp_path, f'cp "{uscite_vere}"/solido.dat "{uscite_vere}"/solido.frd . '
                                 f'&& echo "Job finished"\n')
    r = _ccx.esegui(p, tmp_path / "corsa", percorso_solutore=finto)
    assert r["esito"] == "ok", r
    assert r["risultati"]["run"]["quota_vincolati"] is None
    v = _verdetto(r["risultati"], "reazioni", "GRAVITA")
    assert v["esito"] == "non_applicabile" and "BOUNDARY" in v["ragione"]


# --- deck senza le carte che il lettore si aspetta ---------------------------

def test_un_deck_senza_passo_modale_non_ha_modi(tmp_path, binario_ccx):
    p = _variante(tmp_path, "statico.inp", _senza_modale)
    r = _ccx.esegui(p, tmp_path / "corsa")
    assert r["esito"] == "ok", r
    assert r["risultati"]["modi"] == []


def test_un_deck_senza_nset_top_lascia_u_set_vuoto(tmp_path, binario_ccx):
    def togli_top(t: str) -> str:
        return t[:t.index("*NSET, NSET=TOP")] + t[t.index("*SOLID SECTION"):]

    p = _variante(tmp_path, "senza_top.inp", togli_top)
    r = _ccx.esegui(p, tmp_path / "corsa")
    assert r["esito"] == "ok", r
    assert all(passo["u_set"] == {} for passo in r["risultati"]["passi"].values())


# --- il deck vero, se c'è ----------------------------------------------------

def test_deck_vero(tmp_path, binario_ccx):
    if not DECK_VERO.is_file():
        pytest.skip(f"{DECK_VERO} non c'è (2,5 MB, non versionato)")
    r = _ccx.esegui(DECK_VERO, tmp_path / "corsa")
    assert r["esito"] == "ok", r
    ris = r["risultati"]
    assert ris["passi"]["GRAVITA"]["reazioni_somma"][2] == pytest.approx(4248.58, abs=0.01)
    assert ris["massa"] == pytest.approx(0.5551, abs=0.0005)
    assert ris["run"]["volume"] == pytest.approx(2.177e08, rel=1e-3)
    assert ris["run"]["quota_vincolati"] == pytest.approx(0.12197, abs=0.0001)
    assert ris["modi"][0]["f"] == pytest.approx(21.007, abs=0.01)
    assert ris["modi"][1]["f"] == pytest.approx(34.011, abs=0.01)
    assert _verdetto(ris, "reazioni", "GRAVITA")["esito"] == "passato"


# --- fix round 1 ------------------------------------------------------------

def test_le_uscite_di_un_altro_lavoro_nella_cartella_sopravvivono(tmp_path, binario_ccx):
    """La cartella la sceglie il chiamante: `wall_model.dat` di MeshRec non è roba nostra.
    Si cancellano i nomi esatti della corsa, non tutto quello che finisce per `.dat`."""
    cartella = tmp_path / "corsa"
    cartella.mkdir()
    for nome in ("wall_model.dat", "wall_model.frd", "altro.12d"):
        (cartella / nome).write_text("roba di un altro lavoro\n", encoding="ascii")
    assert _ccx.esegui(TRAVE, cartella)["esito"] == "ok"
    for nome in ("wall_model.dat", "wall_model.frd", "altro.12d"):
        assert (cartella / nome).is_file(), nome


def test_un_passo_senza_reazioni_stampate_non_ha_somma(tmp_path, binario_ccx):
    """Zero reazioni non è «somma zero»: un `*NODE PRINT` che manca è un dato che non c'è."""
    p = _variante(tmp_path, "muto.inp", lambda t: t.replace("*NODE PRINT, NSET=BASE\nRF\n", "", 1))
    r = _ccx.esegui(p, tmp_path / "corsa")
    assert r["esito"] == "ok", r
    gravita = r["risultati"]["passi"]["GRAVITA"]
    assert gravita["n_reazioni"] == 0 and gravita["reazioni_somma"] is None
    v = _verdetto(r["risultati"], "reazioni", "GRAVITA")
    assert v["esito"] == "non_applicabile" and "nessuna reazione stampata" in v["ragione"]
    assert r["risultati"]["passi"]["CARICO_TOP"]["n_reazioni"] == 15  # gli altri passi restano interi


def test_lo_spostamento_viene_dall_ultimo_incremento():
    """Due `DISP` per lo stesso passo: `leggi_reazioni` prende l'ultimo blocco, e la sommità
    deve venire dallo stesso incremento — o si confrontano due istanti diversi."""
    import numpy as np
    from meshrec.core.solve import Blocco

    deck = _ccx._inp.leggi(TRAVE)
    nodi = np.array(deck.set_nodi["TOP"][:2])
    primo = Blocco("DISP", 1, False, 0.5, nodi, np.array([[0.0, 0.0, -1.0], [0.0, 0.0, -1.0]]))
    ultimo = Blocco("DISP", 1, False, 1.0, nodi, np.array([[0.0, 0.0, -2.0], [0.0, 0.0, -2.0]]))
    assert _ccx._sommita([primo, ultimo], 1, deck)["TOP"]["medio"][2] == -2.0


def test_la_versione_e_quella_del_banner_non_di_un_avviso():
    registro = "*WARNING in e_c3d: Version 1 element\nCalculiX Version 2.22, Copyright(C) 1998-2024\n"
    assert _ccx._versione(registro) == "CalculiX Version 2.22, Copyright(C) 1998-2024"
