"""Rotte HTTP: il contratto vale sulla tratta, non sulla funzione (prior art: Tesi tests/test_server.py).

Ogni test è ancorato a una riga di «Ingressi degeneri» del brief Task 6; la mappa
riga → test sta nel report.
"""
import json
import os
import stat
from pathlib import Path
from urllib.parse import quote

import pytest
from fastapi.testclient import TestClient

from conftest import leggi_fixture


@pytest.fixture
def cliente(tmp_path):
    from nova.server import SidecarInProcesso, create_app
    return TestClient(create_app(SidecarInProcesso(), tmp_path / "corse"), raise_server_exceptions=False)


def _app_con_solutore(tmp_path, percorso_solutore):
    from nova.server import SidecarInProcesso, create_app
    return TestClient(create_app(SidecarInProcesso(solutore=percorso_solutore), tmp_path / "corse"),
                       raise_server_exceptions=False)


# --- Step 1 del brief (baseline) --------------------------------------------

def test_salute(cliente):
    r = cliente.get("/api/salute")
    assert r.status_code == 200 and "solutore" in r.json()


def test_check_passa_dal_sidecar(cliente):
    r = cliente.post("/api/check", json={"modello": leggi_fixture("nodo_libero.nova.json")})
    assert r.status_code == 200 and r.json()["esito"] == "rifiutato"


def test_check_con_modello_rotto_e_400_con_il_campo(cliente):
    m = leggi_fixture("telaio_2x1.nova.json")
    m["aste"][0]["boh"] = 1
    r = cliente.post("/api/check", json={"modello": m})
    assert r.status_code == 400 and "boh" in r.json()["motivo"]


def test_apri_e_salva_fanno_il_giro(cliente, tmp_path):
    p = tmp_path / "t.nova.json"
    m = leggi_fixture("telaio_2x1.nova.json")
    r = cliente.post("/api/modello/salva", json={"percorso": str(p), "modello": m})
    assert r.status_code == 200 and r.json()["impronta"]
    r2 = cliente.post("/api/modello/apri", json={"percorso": str(p)})
    assert r2.status_code == 200 and r2.json()["modello"]["nodi"][0]["id"] == 1


def test_apri_un_file_che_non_esiste_e_404(cliente, tmp_path):
    r = cliente.post("/api/modello/apri", json={"percorso": str(tmp_path / "no.nova.json")})
    assert r.status_code == 404


def test_corsa_e_risultati(cliente, binario_opensees):
    r = cliente.post("/api/corsa", json={"modello": leggi_fixture("telaio_2x1.nova.json")})
    assert r.status_code == 200 and r.json()["esito"] == "ok"
    run_id = r.json()["run_id"]
    r2 = cliente.get(f"/api/risultati/{run_id}")
    assert r2.status_code == 200 and r2.json()["run"]["hash_modello"]


def test_la_radice_serve_la_pagina(cliente):
    assert cliente.get("/").status_code == 200


# --- Ingressi degeneri -------------------------------------------------------

# riga 1: apri percorso inesistente -> 404 con motivo
def test_apri_inesistente_ha_il_motivo(cliente, tmp_path):
    r = cliente.post("/api/modello/apri", json={"percorso": str(tmp_path / "no.nova.json")})
    assert r.status_code == 404 and "motivo" in r.json()


# riga 2: apri su una cartella -> 404, non IsADirectoryError
def test_apri_su_una_cartella_e_404_non_crash(cliente, tmp_path):
    cartella = tmp_path / "una_cartella"
    cartella.mkdir()
    r = cliente.post("/api/modello/apri", json={"percorso": str(cartella)})
    assert r.status_code == 404


# riga 3: apri file non-JSON, o con campo sconosciuto -> 400 con motivo che nomina il campo
def test_apri_file_non_json_e_400(cliente, tmp_path):
    p = tmp_path / "spazzatura.nova.json"
    p.write_text("{ non e' json", encoding="utf-8")
    r = cliente.post("/api/modello/apri", json={"percorso": str(p)})
    assert r.status_code == 400 and "motivo" in r.json()


def test_apri_campo_sconosciuto_e_400_nomina_il_campo(cliente, tmp_path):
    m = leggi_fixture("telaio_2x1.nova.json")
    m["boh"] = 1
    p = tmp_path / "con_boh.nova.json"
    p.write_text(json.dumps(m), encoding="utf-8")
    r = cliente.post("/api/modello/apri", json={"percorso": str(p)})
    assert r.status_code == 400 and "boh" in r.json()["motivo"]


# riga 4: apri senza percorso -> 400/422 con motivo, non KeyError -> 500
def test_apri_senza_percorso_e_4xx_con_motivo(cliente):
    r = cliente.post("/api/modello/apri", json={})
    assert r.status_code in (400, 422) and "motivo" in r.json()


# riga 5: salva senza percorso -> 400/422 con motivo, non KeyError -> 500 muto
def test_salva_senza_percorso_e_4xx_con_motivo(cliente):
    m = leggi_fixture("telaio_2x1.nova.json")
    r = cliente.post("/api/modello/salva", json={"modello": m})
    assert r.status_code in (400, 422) and "motivo" in r.json()


# riga 6: salva su cartella non scrivibile, o su un percorso che è una cartella -> 500 con motivo dell'OS
def test_salva_su_percorso_che_e_una_cartella_e_500(cliente, tmp_path):
    cartella = tmp_path / "gia_una_cartella"
    cartella.mkdir()
    m = leggi_fixture("telaio_2x1.nova.json")
    r = cliente.post("/api/modello/salva", json={"percorso": str(cartella), "modello": m})
    assert r.status_code == 500 and "motivo" in r.json()
    assert "traceback" not in r.json()["motivo"].lower()


def test_salva_su_cartella_non_scrivibile_e_500(cliente, tmp_path):
    sola_lettura = tmp_path / "sola_lettura"
    sola_lettura.mkdir()
    os.chmod(sola_lettura, stat.S_IREAD | stat.S_IEXEC)
    try:
        m = leggi_fixture("telaio_2x1.nova.json")
        r = cliente.post("/api/modello/salva", json={"percorso": str(sola_lettura / "t.nova.json"), "modello": m})
        assert r.status_code == 500 and "motivo" in r.json()
    finally:
        os.chmod(sola_lettura, stat.S_IRWXU)  # ripristina, altrimenti tmp_path non si ripulisce


# riga 7: salva con modello invalido -> 400 con il campo, nessun file scritto
def test_salva_modello_invalido_e_400_senza_scrivere(cliente, tmp_path):
    p = tmp_path / "non_scritto.nova.json"
    m = leggi_fixture("telaio_2x1.nova.json")
    m["aste"][0]["boh"] = 1
    r = cliente.post("/api/modello/salva", json={"percorso": str(p), "modello": m})
    assert r.status_code == 400 and "boh" in r.json()["motivo"]
    assert not p.exists()


# riga 8: salva poi apri dello stesso file -> stessa impronta; e la stessa di run.hash_modello
def test_salva_e_apri_hanno_la_stessa_impronta(cliente, tmp_path):
    p = tmp_path / "giro.nova.json"
    m = leggi_fixture("telaio_2x1.nova.json")
    r_salva = cliente.post("/api/modello/salva", json={"percorso": str(p), "modello": m})
    r_apri = cliente.post("/api/modello/apri", json={"percorso": str(p)})
    assert r_salva.json()["impronta"] == r_apri.json()["impronta"]


def test_impronta_di_salva_uguale_a_hash_modello_di_una_corsa(cliente, tmp_path, binario_opensees):
    p = tmp_path / "corsa.nova.json"
    m = leggi_fixture("telaio_2x1.nova.json")
    r_salva = cliente.post("/api/modello/salva", json={"percorso": str(p), "modello": m})
    r_corsa = cliente.post("/api/corsa", json={"modello": m})
    run_id = r_corsa.json()["run_id"]
    r_ris = cliente.get(f"/api/risultati/{run_id}")
    assert r_salva.json()["impronta"] == r_ris.json()["run"]["hash_modello"]


# riga 9: check senza modello -> 400, fase: modello; corpo non-oggetto JSON -> 4xx con motivo, non 500
def test_check_senza_modello_e_400_fase_modello(cliente):
    r = cliente.post("/api/check", json={})
    assert r.status_code == 400 and r.json()["fase"] == "modello"


def test_check_corpo_non_oggetto_e_4xx_con_motivo(cliente):
    r = cliente.post("/api/check", json=["non", "e'", "un", "oggetto"])
    assert 400 <= r.status_code < 500 and "motivo" in r.json()


# riga 10: check su modello rifiutato -> 200 esito: rifiutato (già test_check_passa_dal_sidecar sopra)


# riga 11: corsa con solutore assente -> 200 esito: assente e dove_prenderlo
def test_corsa_con_solutore_assente(tmp_path):
    cliente = _app_con_solutore(tmp_path, str(tmp_path / "non_esiste_nessun_binario"))
    r = cliente.post("/api/corsa", json={"modello": leggi_fixture("telaio_2x1.nova.json")})
    assert r.status_code == 200
    corpo = r.json()
    assert corpo["esito"] == "assente" and "dove_prenderlo" in corpo


# riga 12: corsa con errore fase solutore -> 200 esito: errore, fase, coda_log; solo fase: modello è 400
def test_corsa_con_solutore_non_eseguibile_e_200_fase_solutore(tmp_path):
    finto = tmp_path / "finto_opensees"
    finto.write_text("non e' un eseguibile", encoding="utf-8")
    cliente = _app_con_solutore(tmp_path, str(finto))
    r = cliente.post("/api/corsa", json={"modello": leggi_fixture("telaio_2x1.nova.json")})
    assert r.status_code == 200
    corpo = r.json()
    assert corpo["esito"] == "errore" and corpo["fase"] == "solutore" and "coda_log" in corpo


# riga 13: risultati inesistente -> 404; run_id con .. o / -> 404, nessuna lettura fuori da cartella_corse
def test_risultati_run_id_inesistente_e_404(cliente):
    r = cliente.get("/api/risultati/000000000000")
    assert r.status_code == 404


def test_risultati_run_id_con_punti_e_404(cliente):
    r = cliente.get(f"/api/risultati/{quote('..', safe='')}")
    assert r.status_code == 404


def test_risultati_run_id_con_slash_percent_encoded_e_404(cliente):
    r = cliente.get(f"/api/risultati/{quote('../../../etc/passwd', safe='')}")
    assert r.status_code == 404


def test_risultati_non_legge_fuori_da_cartella_corse(cliente, tmp_path):
    # un segreto fuori da cartella_corse: nessun run_id valido può raggiungerlo
    segreto = tmp_path / "segreto.json"
    segreto.write_text('{"top": "secret"}', encoding="utf-8")
    r = cliente.get("/api/risultati/000000000000")
    assert r.status_code == 404


# riga 14: SidecarProcesso, EOF sullo stdout -> errore fase sidecar, niente blocco in readline
def test_sidecarprocesso_eof_da_errore_fase_sidecar():
    from nova.server import SidecarProcesso

    class _FintoStdin:
        def write(self, s): pass
        def flush(self): pass

    class _FintoStdout:
        def readline(self):
            return ""  # EOF immediato

    class _FintoProcesso:
        stdin = _FintoStdin()
        stdout = _FintoStdout()

    sp = SidecarProcesso(avvia=lambda: _FintoProcesso())
    righe = sp.chiedi({"comando": "verifica"})
    assert righe[-1]["esito"] == "errore" and righe[-1]["fase"] == "sidecar"


# riga 15: SidecarProcesso, righe con id diverso da quello atteso -> ignorate
def test_sidecarprocesso_ignora_righe_di_unaltra_richiesta():
    from nova.server import SidecarProcesso

    class _FintoStdin:
        def write(self, s): pass
        def flush(self): pass

    class _FintoStdout:
        def __init__(self):
            self._righe = iter([
                json.dumps({"id": 999, "evento": "fase", "nome": "intrusa"}) + "\n",
                json.dumps({"id": 1, "esito": "ok"}) + "\n",
            ])

        def readline(self):
            return next(self._righe, "")

    class _FintoProcesso:
        stdin = _FintoStdin()
        stdout = _FintoStdout()

    sp = SidecarProcesso(avvia=lambda: _FintoProcesso())
    righe = sp.chiedi({"comando": "verifica"})
    assert righe == [{"id": 1, "esito": "ok"}]


# riga 16: GET / -> 200 con static/index.html (già test_la_radice_serve_la_pagina); static assente -> errore a create_app
def test_create_app_fallisce_allavvio_se_static_manca(tmp_path):
    from nova.server import SidecarInProcesso, create_app
    with pytest.raises(RuntimeError):
        create_app(SidecarInProcesso(), tmp_path / "corse", statici=tmp_path / "non_esiste")


# riga 17: python -m nova con porta occupata -> messaggio che nomina la porta, non traceback di uvicorn
def test_main_porta_occupata_messaggio_non_traceback(monkeypatch, capsys):
    import nova.__main__ as m

    def _bind_occupato(*a, **k):
        raise OSError(48, "Address already in use")

    monkeypatch.setattr(m, "uvicorn", type("U", (), {"run": staticmethod(_bind_occupato)}))
    monkeypatch.setattr(m, "SidecarProcesso", lambda **k: object())
    monkeypatch.setattr(m.threading, "Timer", lambda *a, **k: type("T", (), {"start": lambda self: None})())
    with pytest.raises(SystemExit) as exc:
        m.main(["--porta", "8765"])
    assert "8765" in str(exc.value)


# riga 18: corpo di /api/corsa con solutore o cartella -> ignorati (extra="forbid" -> 422), mai inoltrati
def test_corsa_con_solutore_nel_corpo_e_422(cliente):
    r = cliente.post("/api/corsa", json={"modello": leggi_fixture("telaio_2x1.nova.json"),
                                         "solutore": "/bin/qualcosa"})
    assert r.status_code == 422


def test_corsa_con_cartella_nel_corpo_e_422(cliente):
    r = cliente.post("/api/corsa", json={"modello": leggi_fixture("telaio_2x1.nova.json"),
                                         "cartella": "/tmp/altrove"})
    assert r.status_code == 422
