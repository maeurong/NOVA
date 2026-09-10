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
from meshrec.core import materiali as _materiali


@pytest.fixture
def cliente(tmp_path):
    from nova.server import SidecarInProcesso, create_app
    return TestClient(create_app(SidecarInProcesso(), tmp_path / "corse"), raise_server_exceptions=False,
                       base_url="http://127.0.0.1")


def _app_con_solutore(tmp_path, percorso_solutore):
    from nova.server import SidecarInProcesso, create_app
    return TestClient(create_app(SidecarInProcesso(solutore=percorso_solutore), tmp_path / "corse"),
                       raise_server_exceptions=False, base_url="http://127.0.0.1")


def _attendi(cliente, run_id: str, secondi: float = 60.0) -> dict:
    """Il lavoro dalla 12 è asincrono: la `POST` torna subito, l'esito si legge dalla `GET`."""
    import time
    t0 = time.perf_counter()
    while True:
        r = cliente.get(f"/api/corsa/{run_id}")
        assert r.status_code in (200, 400), r.text
        d = r.json()
        if d.get("stato") == "finita" or r.status_code == 400:
            return d
        assert time.perf_counter() - t0 < secondi, f"il lavoro {run_id} non finisce"
        time.sleep(0.01)


def _corsa(cliente, corpo: dict) -> dict:
    r = cliente.post("/api/corsa", json=corpo)
    assert r.status_code == 202, r.text
    return _attendi(cliente, r.json()["run_id"])


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
    r = _corsa(cliente, {"modello": leggi_fixture("telaio_2x1.nova.json")})
    assert r["esito"] == "ok"
    run_id = r["run_id"]
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
    r_corsa = _corsa(cliente, {"modello": m})
    run_id = r_corsa["run_id"]
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
    corpo = _corsa(cliente, {"modello": leggi_fixture("telaio_2x1.nova.json")})
    assert corpo["esito"] == "assente" and "dove_prenderlo" in corpo


# riga 12: corsa con errore fase solutore -> 200 esito: errore, fase, coda_log; solo fase: modello è 400
def test_corsa_con_solutore_non_eseguibile_e_200_fase_solutore(tmp_path):
    finto = tmp_path / "finto_opensees"
    finto.write_text("non e' un eseguibile", encoding="utf-8")
    cliente = _app_con_solutore(tmp_path, str(finto))
    corpo = _corsa(cliente, {"modello": leggi_fixture("telaio_2x1.nova.json")})
    assert corpo["esito"] == "errore" and corpo["fase"] == "solutore" and "coda_log" in corpo


# riga 13: risultati inesistente -> 404; run_id con .. o / -> 404, nessuna lettura fuori da cartella_corse
def test_risultati_run_id_inesistente_e_404(cliente):
    r = cliente.get("/api/risultati/000000000000")
    assert r.status_code == 404


def test_risultati_run_id_con_punti_non_legge_fuori_da_cartella_corse(cliente, tmp_path):
    # un file col nome giusto ma un livello sopra cartella_corse: se ".." risalisse
    # davvero, lo troverebbe. Deve restare 404 e il segreto non deve comparire.
    from nova.corsa import NOME_RISULTATI
    segreto = tmp_path / NOME_RISULTATI
    segreto.write_text('{"top": "secret"}', encoding="utf-8")
    r = cliente.get(f"/api/risultati/{quote('..', safe='')}")
    assert r.status_code == 404
    assert "secret" not in r.text


def test_risultati_run_id_con_slash_percent_encoded_e_404(cliente):
    r = cliente.get(f"/api/risultati/{quote('../../../etc/passwd', safe='')}")
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

        def __iter__(self):  # il thread lettore itera lo stdout, non chiama più readline() a mano
            while True:
                r = self.readline()
                if r == "":
                    return
                yield r

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

        def __iter__(self):  # il thread lettore itera lo stdout, non chiama più readline() a mano
            while True:
                r = self.readline()
                if r == "":
                    return
                yield r

    class _FintoProcesso:
        stdin = _FintoStdin()
        stdout = _FintoStdout()

    sp = SidecarProcesso(avvia=lambda: _FintoProcesso())
    righe = sp.chiedi({"comando": "verifica"})
    assert righe == [{"esito": "ok"}]  # l'`id` di correlazione non esce mai (fix wave, finding 1)


# riga 16: GET / -> 200 con static/index.html (già test_la_radice_serve_la_pagina); static assente -> errore a create_app
def test_create_app_fallisce_allavvio_se_static_manca(tmp_path):
    from nova.server import SidecarInProcesso, create_app
    with pytest.raises(RuntimeError):
        create_app(SidecarInProcesso(), tmp_path / "corse", statici=tmp_path / "non_esiste")


def _finto_sidecar(terminato: list):
    """Un finto **nuovo** a ogni chiamata, e `terminate` accoda l'identità del sottoprocesso:
    con un finto solo, due `terminate()` sullo stesso passerebbero per due sidecar terminati."""
    p = type("P", (), {"terminate": lambda self: terminato.append(id(self))})()
    return type("F", (), {"p": p})()


# riga 17: python -m nova con porta occupata -> messaggio che nomina la porta, non traceback di uvicorn
def test_main_porta_occupata_messaggio_non_traceback(monkeypatch, capsys, tmp_path):
    import nova.__main__ as m

    monkeypatch.chdir(tmp_path)  # altrimenti main() crea "corse/" nella cwd di pytest

    def _bind_occupato(*a, **k):
        raise OSError(48, "Address already in use")

    terminato = []

    monkeypatch.setattr(m, "uvicorn", type("U", (), {"run": staticmethod(_bind_occupato)}))
    monkeypatch.setattr(m, "SidecarProcesso", lambda **k: _finto_sidecar(terminato))
    monkeypatch.setattr(m.threading, "Timer", lambda *a, **k: type("T", (), {"start": lambda self: None})())
    with pytest.raises(SystemExit) as exc:
        m.main(["--porta", "8765"])
    assert "8765" in str(exc.value)
    # due sottoprocessi **distinti**, non due volte lo stesso
    assert len(terminato) == 2 and terminato[0] != terminato[1]


def test_main_se_il_secondo_sidecar_non_parte_il_primo_non_resta_orfano(monkeypatch, tmp_path):
    """Il secondo `SidecarProcesso` stava fuori dal `try`: se il suo `Popen` sollevava, il primo
    restava orfano e il commento dentro il `try` diceva il contrario."""
    import nova.__main__ as m

    monkeypatch.chdir(tmp_path)
    terminato = []
    fatti = []

    def _fabbrica(**k):
        fatti.append(True)
        if len(fatti) == 2:
            raise OSError("nessun python per il secondo sidecar")
        return _finto_sidecar(terminato)

    monkeypatch.setattr(m, "SidecarProcesso", _fabbrica)
    with pytest.raises(SystemExit) as exc:
        m.main([])
    assert "nessun python per il secondo sidecar" in str(exc.value)
    assert len(terminato) == 1   # il primo è terminato lo stesso, e il secondo non esiste


# riga 18: corpo di /api/corsa con solutore o cartella -> ignorati (extra="forbid" -> 422), mai inoltrati
def test_corsa_con_solutore_nel_corpo_e_422(cliente):
    r = cliente.post("/api/corsa", json={"modello": leggi_fixture("telaio_2x1.nova.json"),
                                         "solutore": "/bin/qualcosa"})
    assert r.status_code == 422


def test_corsa_con_cartella_nel_corpo_e_422(cliente):
    r = cliente.post("/api/corsa", json={"modello": leggi_fixture("telaio_2x1.nova.json"),
                                         "cartella": "/tmp/altrove"})
    assert r.status_code == 422


# --- Fix wave (finding 1, critical): SidecarProcesso non deve far uscire l'`id`
# di correlazione del protocollo nel corpo HTTP. Sul sottoprocesso vero, non su
# SidecarInProcesso (che non ha mai avuto `id`: da qui il buco era invisibile).

@pytest.fixture
def cliente_sottoprocesso(tmp_path):
    from nova.server import SidecarProcesso, create_app
    sp = SidecarProcesso()
    cliente = TestClient(create_app(sp, tmp_path / "corse"), raise_server_exceptions=False,
                         base_url="http://127.0.0.1")
    yield cliente
    sp.p.terminate()
    # chiudere le pipe e attendere il figlio, non solo `terminate`: con `filterwarnings = error`
    # il `ResourceWarning` del `Popen.__del__` sporcherebbe l'uscita della suite
    sp.p.stdin.close()
    sp.p.stdout.close()
    sp.p.wait()


def test_sidecarprocesso_reale_non_espone_id_nel_corpo(cliente_sottoprocesso):
    r = cliente_sottoprocesso.get("/api/salute")
    assert r.status_code == 200 and "id" not in r.json()


def test_sidecarprocesso_reale_check_non_espone_id_nel_corpo(cliente_sottoprocesso):
    r = cliente_sottoprocesso.post("/api/check", json={"modello": leggi_fixture("nodo_libero.nova.json")})
    assert r.status_code == 200 and "id" not in r.json()


# --- Fix wave (finding 3, important): DNS rebinding — Host/Origin estranei -> 403

def test_host_estraneo_e_403(cliente):
    r = cliente.get("/api/salute", headers={"Host": "evil.example"})
    assert r.status_code == 403 and "motivo" in r.json()


def test_origin_estraneo_e_403(cliente):
    r = cliente.get("/api/salute", headers={"Origin": "http://evil.example"})
    assert r.status_code == 403 and "motivo" in r.json()


def test_host_con_porta_configurata_e_ammesso(tmp_path):
    from nova.server import SidecarInProcesso, create_app
    app = create_app(SidecarInProcesso(), tmp_path / "corse", porta=8765)
    cliente = TestClient(app, raise_server_exceptions=False, base_url="http://127.0.0.1:8765")
    r = cliente.get("/api/salute")
    assert r.status_code == 200


# --- Fix wave (finding 4, important): SidecarProcesso.chiedi senza `except` —
# pipe chiusa o riga corrotta diventano 500 col traceback invece di un errore di dominio

def test_sidecarprocesso_pipe_chiusa_diventa_errore_fase_sidecar():
    from nova.server import SidecarProcesso

    class _FintoStdin:
        def write(self, s):
            raise BrokenPipeError("il sidecar ha già chiuso stdin")
        def flush(self): pass

    class _FintoProcesso:
        stdin = _FintoStdin()
        stdout = iter(())  # scrivere in stdin fallisce prima di leggere: il thread lettore esce subito

    sp = SidecarProcesso(avvia=lambda: _FintoProcesso())
    righe = sp.chiedi({"comando": "verifica"})
    assert righe[-1]["esito"] == "errore" and righe[-1]["fase"] == "sidecar"


def test_sidecarprocesso_riga_corrotta_diventa_errore_fase_sidecar():
    from nova.server import SidecarProcesso

    class _FintoStdin:
        def write(self, s): pass
        def flush(self): pass

    class _FintoStdout:
        def __init__(self):
            self._righe = iter(["questa non è una riga JSON\n"])
        def readline(self):
            return next(self._righe, "")

        def __iter__(self):  # il thread lettore itera lo stdout, non chiama più readline() a mano
            while True:
                r = self.readline()
                if r == "":
                    return
                yield r

    class _FintoProcesso:
        stdin = _FintoStdin()
        stdout = _FintoStdout()

    sp = SidecarProcesso(avvia=lambda: _FintoProcesso())
    righe = sp.chiedi({"comando": "verifica"})
    assert righe[-1]["esito"] == "errore" and righe[-1]["fase"] == "sidecar"


# --- Review finale: gli ingressi degeneri che arrivano dalla tratta HTTP -------

VERSIONI_NON_INTERE = ["2", None, [1], True, 1.5]


@pytest.mark.parametrize("versione", VERSIONI_NON_INTERE)
def test_apri_schema_version_non_intera_e_400_non_500(cliente, tmp_path, versione):
    p = tmp_path / "modello.nova.json"
    p.write_text(json.dumps(leggi_fixture("telaio_2x1.nova.json") | {"schema_version": versione}),
                 encoding="utf-8")
    r = cliente.post("/api/modello/apri", json={"percorso": str(p)})
    assert r.status_code == 400 and "schema_version" in r.json()["motivo"]


@pytest.mark.parametrize("versione", VERSIONI_NON_INTERE)
def test_salva_schema_version_non_intera_e_400_non_500(cliente, tmp_path, versione):
    fuori = tmp_path / "mai.json"
    r = cliente.post("/api/modello/salva", json={
        "percorso": str(fuori),
        "modello": leggi_fixture("telaio_2x1.nova.json") | {"schema_version": versione}})
    assert r.status_code == 400 and "schema_version" in r.json()["motivo"]
    assert not fuori.exists()


def test_risultati_troncati_sono_404_non_500(cliente, tmp_path):
    from nova.corsa import NOME_RISULTATI

    run_id = "0123456789ab"
    cartella = tmp_path / "corse" / run_id
    cartella.mkdir(parents=True)
    (cartella / NOME_RISULTATI).write_text('{"tronc', encoding="utf-8")
    r = cliente.get(f"/api/risultati/{run_id}")
    assert r.status_code == 404 and "illeggibili" in r.json()["motivo"]


def test_corsa_con_un_caso_che_porta_un_a_capo_e_422(cliente):
    r = cliente.post("/api/corsa", json={"modello": leggi_fixture("telaio_2x1.nova.json"),
                                         "casi": ["Z1\n"]})
    assert r.status_code == 422 and "casi" in r.json()["motivo"]


def test_main_senza_static_termina_il_sidecar_e_dice_perche(monkeypatch, tmp_path):
    """`create_app` stava fuori dal `try`: se sollevava, il sottoprocesso restava orfano."""
    import nova.__main__ as m

    monkeypatch.chdir(tmp_path)
    terminato = []
    monkeypatch.setattr(m, "SidecarProcesso", lambda **k: _finto_sidecar(terminato))

    def _static_assente(*a, **k):
        raise RuntimeError("Directory 'static' does not exist")

    monkeypatch.setattr(m, "create_app", _static_assente)
    with pytest.raises(SystemExit) as exc:
        m.main([])
    # tutti e due i sidecar, il breve e il lungo, e sono due sottoprocessi distinti
    assert "static" in str(exc.value)
    assert len(terminato) == 2 and terminato[0] != terminato[1]


def test_main_passa_una_cartella_corse_assoluta(monkeypatch, tmp_path):
    import nova.__main__ as m

    monkeypatch.chdir(tmp_path)
    visti = []
    monkeypatch.setattr(m, "SidecarProcesso", lambda **k: _finto_sidecar([]))
    monkeypatch.setattr(m, "create_app", lambda _s, cartella, **k: visti.append(cartella))
    monkeypatch.setattr(m, "uvicorn", type("U", (), {"run": staticmethod(lambda *a, **k: None)}))
    monkeypatch.setattr(m.threading, "Timer", lambda *a, **k: type("T", (), {"start": lambda self: None})())
    m.main([])
    assert visti[0].is_absolute() and visti[0].name == "corse"


# --- POST /api/importa (Task 2) ---------------------------------------------

def test_importa_dalla_fixture(cliente):
    from conftest import FIXTURE

    p = FIXTURE / "prior_sintetico" / "12_wall.json"
    r = cliente.post("/api/importa", json={"percorso": str(p)})
    assert r.status_code == 200
    corpo = r.json()
    assert corpo["mancano"] == ["armature", "classe", "vincoli"]
    assert len(corpo["modello"]["aste"]) == 80


def test_importa_un_percorso_inesistente_e_400(cliente, tmp_path):
    r = cliente.post("/api/importa", json={"percorso": str(tmp_path / "no.json")})
    assert r.status_code == 400 and r.json()["fase"] == "importa"


def test_importa_un_prior_mutilato_e_400_e_non_200(cliente, tmp_path):
    from conftest import FIXTURE

    prior = json.loads((FIXTURE / "prior_sintetico" / "12_wall.json").read_text(encoding="utf-8"))
    prior["membrature"][0].pop("riempimento")
    p = tmp_path / "12_wall.json"
    p.write_text(json.dumps(prior), encoding="utf-8")
    r = cliente.post("/api/importa", json={"percorso": str(p)})
    assert r.status_code == 400 and r.json()["fase"] == "importa"
    assert "riempimento" in r.json()["motivo"]


def test_importa_un_percorso_relativo_e_risolto_dal_server(cliente, tmp_path, monkeypatch):
    """Il percorso relativo lo risolve la rotta, nella cwd del server: il sidecar può girare
    da un'altra cartella (in processo separato è la radice del pacchetto)."""
    from conftest import FIXTURE

    (tmp_path / "12_wall.json").write_bytes((FIXTURE / "prior_sintetico" / "12_wall.json").read_bytes())
    monkeypatch.chdir(tmp_path)
    r = cliente.post("/api/importa", json={"percorso": "12_wall.json"})
    assert r.status_code == 200
    percorso = Path(r.json()["resoconto"]["percorso"])
    assert percorso.is_absolute() and percorso == (tmp_path / "12_wall.json").resolve()


# --- POST /api/ccx (Task 1 di T3) -------------------------------------------

def _trave() -> Path:
    from conftest import FIXTURE
    return FIXTURE / "solido_piccolo" / "trave.inp"


def test_ccx_gira_nella_cartella_della_corsa(cliente, tmp_path, binario_ccx):
    r = cliente.post("/api/ccx", json={"inp": str(_trave())})
    assert r.status_code == 202, r.text
    corpo = _attendi(cliente, r.json()["run_id"])
    assert corpo["esito"] == "ok" and corpo["fasi"] == ["copio il deck", "lancio ccx", "leggo .dat e .frd"]
    cartella = tmp_path / "corse" / corpo["run_id"]
    assert (cartella / "solido.inp").is_file() and (cartella / "risultati_solido.json").is_file()
    assert corpo["risultati"]["run"]["deck"] == str(cartella / "solido.inp")


def test_ccx_accetta_un_percorso_con_puntini_e_lo_copia_come_solido(cliente, tmp_path, binario_ccx):
    """Percorso dell'utente locale: `..` è lecito. Quello che non deve succedere è che un
    suo pezzo entri nel comando: il file copiato si chiama sempre `solido.inp`."""
    dentro = tmp_path / "giu"
    dentro.mkdir()
    (dentro / "mio.inp").write_bytes(_trave().read_bytes())
    r = cliente.post("/api/ccx", json={"inp": f"{dentro}/../giu/mio.inp"})
    assert r.status_code == 202, r.text
    corpo = _attendi(cliente, r.json()["run_id"])
    assert corpo["esito"] == "ok"
    assert Path(corpo["risultati"]["run"]["deck"]).name == "solido.inp"


def test_ccx_con_un_inp_che_non_esiste(cliente, tmp_path):
    r = cliente.post("/api/ccx", json={"inp": str(tmp_path / "no.inp")})
    assert r.status_code == 202, r.text
    rid = r.json()["run_id"]
    d = _attendi(cliente, rid)
    assert d["esito"] == "errore" and d["fase"] == "deck"
    # il 400 arriva dalla `GET`, e resta lo stesso a ogni ripetizione: il codice va asserito,
    # non solo il corpo — senza `_o_400` la `GET` renderebbe 200 con lo stesso corpo
    g = cliente.get(f"/api/corsa/{rid}")
    assert g.status_code == 400 and g.json()["fase"] == "deck"


def test_ccx_rifiuta_la_cartella_dal_corpo(cliente):
    r = cliente.post("/api/ccx", json={"inp": str(_trave()), "cartella": "/tmp"})
    assert r.status_code == 422 and "cartella" in r.json()["motivo"]


def test_il_solutore_di_opensees_non_finisce_dentro_ccx(tmp_path, binario_ccx):
    """`--solutore` di `python -m nova` è il binario di OpenSees: passarlo a `ccx` come
    percorso dichiarato farebbe lanciare quello. Qui il «solutore» non è nemmeno
    eseguibile, e la corsa deve riuscire lo stesso perché ccx si cerca nel PATH."""
    cliente = _app_con_solutore(tmp_path, str(_trave()))
    r = cliente.post("/api/ccx", json={"inp": str(_trave())})
    assert r.status_code == 202, r.text
    assert _attendi(cliente, r.json()["run_id"])["esito"] == "ok"


def test_i_risultati_del_solido_si_rileggono_dal_run_id(cliente, tmp_path, binario_ccx):
    r = cliente.post("/api/ccx", json={"inp": str(_trave())})
    assert r.status_code == 202, r.text
    corpo = _attendi(cliente, r.json()["run_id"])
    assert corpo["cartella"] == str(tmp_path / "corse" / corpo["run_id"])
    riletti = cliente.get(f"/api/risultati/{corpo['run_id']}")
    assert riletti.status_code == 200, riletti.text
    assert riletti.json()["massa"] == corpo["risultati"]["massa"]


# --- ondata finale: percorsi risolti, deck = 400, sidecar occupato = 409 -----------

def test_confronto_risolve_i_tre_percorsi_relativi(cliente, tmp_path, monkeypatch):
    """C5: `/api/importa` risolve il relativo perché il sidecar può girare in un altro
    processo con un'altra cwd; `/api/confronto` no, e «telaio.json» era un altro file."""
    monkeypatch.chdir(tmp_path)
    r = cliente.post("/api/confronto", json={"telaio": "manca.json"})
    assert r.status_code == 400, r.text
    assert str(tmp_path.resolve() / "manca.json") in r.json()["motivo"]


def test_confronto_con_telaio_vuoto_e_422_non_400(cliente):
    """F5: `Path("").resolve()` è la cwd, non un errore: `""` deve fermarsi a pydantic
    (422) prima del sidecar, mai arrivare a un 400 con «Is a directory» sulla radice."""
    r = cliente.post("/api/confronto", json={"telaio": ""})
    assert r.status_code == 422, r.text


def test_ccx_con_un_deck_rifiutato_e_400_non_200(cliente, tmp_path):
    """C6: `fase: deck` è un errore di chi ha scritto il deck, come `modello` e `importa`:
    200 lo faceva sembrare una corsa andata a buon fine."""
    r = cliente.post("/api/ccx", json={"inp": str(tmp_path / "no.inp")})
    assert r.status_code == 202, r.text
    rid = r.json()["run_id"]
    _attendi(cliente, rid)
    g = cliente.get(f"/api/corsa/{rid}")
    assert g.status_code == 400 and g.json()["fase"] == "deck"


def test_sidecar_occupato_e_409_e_il_lock_resta_di_chi_lo_tiene(tmp_path):
    """C7: una corsa di ccx può tenere il sidecar per mezz'ora, e la seconda richiesta
    restava appesa sul lock senza che nessuno lo sapesse. Ora è un 409 immediato, e la
    richiesta rifiutata non tocca il lock di chi sta lavorando."""
    from nova.server import SidecarProcesso, create_app

    class _FintoProcesso:
        stdin = None
        stdout = iter(())

    sp = SidecarProcesso(avvia=lambda: _FintoProcesso())
    assert sp._lock.acquire(blocking=False)
    cliente = TestClient(create_app(sp, tmp_path / "corse"), raise_server_exceptions=False,
                         base_url="http://127.0.0.1")
    r = cliente.get("/api/salute")
    assert r.status_code == 409, r.text
    assert r.json()["fase"] == "sidecar" and "occupato" in r.json()["motivo"]
    assert sp._lock.locked()   # il lock resta di chi lo ha preso
    sp._lock.release()


# --- T4: la corsa con pushover passa intera dalla `/api/risultati` --------------------------
# Ingresso degenere del brief Task 4: nessun campionamento, nessuna paginazione — il file
# cresce e l'endpoint lo rende tutto. La dimensione è misurata qui e riportata nel report.

def test_risultati_di_una_pushover_e_il_json_intero(cliente, binario_opensees):
    modello = leggi_fixture("telaio_2x1.nova.json")
    modello["analisi"] = [
        {"tipo": "statica", "casi": ["Z1"], "legami": "fibre", "passi": 4},
        {"tipo": "pushover", "distribuzione": "uniforme", "nodo_controllo": 4, "dof": "ux",
         "incremento": 2.0, "spostamento_max": 20.0, "caso_gravita": "Z1"},
    ]
    r = _corsa(cliente, {"modello": modello})
    assert r["esito"] == "ok", r
    r2 = cliente.get(f"/api/risultati/{r['run_id']}")
    assert r2.status_code == 200
    ris = r2.json()
    assert len(ris["passi"]) == 10 and ris["caduta"] is None
    assert ris["run"]["pushover"]["distribuzione"] == "uniforme"
    # tetto largo del brief: `< 5e6` byte. Misurato sul telaio 2×1 a 60 passi: 192 kB.
    assert len(r2.content) < 5e6
    # i passi ci sono tutti, uno per uno: nessun campionamento fra il file e la risposta
    assert [p["n"] for p in ris["passi"]] == list(range(1, 11))


# --- giornata 11b: catalogo e legame ------------------------------------------

def _cls(**extra):
    return {"id": 1, "nome": "cls", "tipo": "calcestruzzo", "classe": "C25/30", **extra}


def _acc(**extra):
    return {"id": 2, "nome": "acc", "tipo": "acciaio", "classe": "B450C", **extra}


def test_catalogo_elenca_le_classi_e_le_vesti(cliente):
    r = cliente.get("/api/catalogo")
    assert r.status_code == 200
    d = r.json()
    assert "C25/30" in d["calcestruzzo"] and "B450C" in d["acciaio"]
    assert "C25/30" not in d["acciaio"] and "B450C" not in d["calcestruzzo"]
    assert d["vesti"] == ["caratteristica", "media", "progetto", "esistente"]
    # famiglia, non f_ctm: tutte le voci di CATALOGO stanno in una delle due liste,
    # e nessuna finisce in entrambe
    tutte = d["calcestruzzo"] + d["acciaio"]
    assert len(tutte) == len(_materiali.CATALOGO)
    assert len(set(d["calcestruzzo"]) & set(d["acciaio"])) == 0


def test_legame_del_calcestruzzo_in_veste_media(cliente):
    r = cliente.post("/api/materiale/legame", json={"materiale": _cls(), "veste": "media"})
    assert r.status_code == 200
    d = r.json()
    assert d["valori"]["fc"] == 33.0 and d["legame"]["tipo"] == "concrete02"
    assert d["legame"]["fpc"] == -33.0 and d["legame"]["epsc0"] < 0
    assert d["catalogo"]["fck"] == 25.0 and "densita" in d["catalogo"]


def test_legame_dell_acciaio(cliente):
    r = cliente.post("/api/materiale/legame", json={"materiale": _acc()})
    assert r.status_code == 200
    d = r.json()
    assert d["legame"]["tipo"] == "steel02" and d["legame"]["Fy"] == 450.0
    assert d["valori"]["veste"] == "media"


def test_legame_con_classe_sconosciuta_e_400_con_le_classi(cliente):
    r = cliente.post("/api/materiale/legame", json={"materiale": _cls(classe="C99/99")})
    assert r.status_code == 400
    assert "C99/99" in r.json()["motivo"] and "C25/30" in r.json()["motivo"]


def test_legame_con_veste_sconosciuta_e_400(cliente):
    r = cliente.post("/api/materiale/legame", json={"materiale": _cls(), "veste": "mediana"})
    assert r.status_code == 400 and "caratteristica" in r.json()["motivo"]


def test_legame_con_campo_in_piu_e_422_con_il_campo(cliente):
    # `extra="forbid"` su `_CorpoBase` → `RequestValidationError` → 422 dal gestore di `server.py`,
    # come per gli altri corpi (vedi `solutore_nel_corpo`): non 400, che è il rifiuto del *modello*
    r = cliente.post("/api/materiale/legame", json={"materiale": _cls(), "veste": "media", "boh": 1})
    assert r.status_code == 422 and "boh" in json.dumps(r.json())


def test_legame_acciaio_sotto_lo_snervamento_e_400(cliente):
    r = cliente.post("/api/materiale/legame",
                     json={"materiale": _acc(personalizzato=True, valori={"epsuk": 0.001})})
    assert r.status_code == 400 and "snervamento" in r.json()["motivo"]


def test_legame_in_veste_progetto_porta_l_avviso(cliente):
    r = cliente.post("/api/materiale/legame", json={"materiale": _cls(), "veste": "progetto"})
    assert r.status_code == 200 and r.json()["valori"]["avvisi"]


# --- fix di fine ramo 11b: la famiglia della classe, e i `type` di pydantic ----

def test_legame_calcestruzzo_con_classe_di_acciaio_e_400_non_500(cliente):
    # `Materiale` accettava la coppia e `veste_valori` moltiplicava un `None`: TypeError,
    # che `server.py` non prendeva -> 500 nudo. Ora la coppia si rifiuta a monte.
    r = cliente.post("/api/materiale/legame", json={"materiale": _cls(classe="B450C")})
    assert r.status_code == 400
    motivo = r.json()["motivo"]
    assert "B450C" in motivo and "acciaio" in motivo and "calcestruzzo" in motivo


def test_legame_acciaio_con_classe_di_calcestruzzo_e_400_non_numeri_finti(cliente):
    # Questa coppia rispondeva 200 con `Fy` = 25: la classe di un calcestruzzo letta come
    # acciaio. Un numero finto e' peggio di un rifiuto.
    r = cliente.post("/api/materiale/legame", json={"materiale": _acc(classe="C25/30")})
    assert r.status_code == 400
    motivo = r.json()["motivo"]
    assert "C25/30" in motivo and "calcestruzzo" in motivo and "acciaio" in motivo


def test_legame_senza_il_campo_legame_nel_corpo_risponde_col_tipo(cliente):
    # `Materiale.legame` ha un default: il corpo che non lo porta e' il caso normale
    # dell'interfaccia, e finora era coperto solo per omissione.
    corpo = _cls()
    assert "legame" not in corpo
    r = cliente.post("/api/materiale/legame", json={"materiale": corpo, "veste": "media"})
    assert r.status_code == 200
    assert r.json()["legame"]["tipo"] == "concrete02"


def test_legame_acciaio_in_veste_progetto(cliente):
    r = cliente.post("/api/materiale/legame", json={"materiale": _acc(), "veste": "progetto"})
    assert r.status_code == 200
    d = r.json()
    assert d["valori"]["fy"] == pytest.approx(450.0 / _materiali.GAMMA_S)
    assert d["valori"]["fy"] < d["valori"]["fyk"]
    assert d["valori"]["avvisi"]


def test_salva_con_sezione_nulla_dice_deve_essere_un_numero_intero(cliente, tmp_path):
    m = leggi_fixture("telaio_2x1.nova.json")
    m["aste"][0]["sezione"] = None
    r = cliente.post("/api/modello/salva",
                     json={"percorso": str(tmp_path / "t.nova.json"), "modello": m})
    assert r.status_code == 400
    motivo = r.json()["motivo"]
    assert "aste.0.sezione" in motivo and "deve essere un numero intero" in motivo


def test_legame_personalizzato_non_scavalca_la_famiglia(cliente):
    # Il gemello del test qui sopra con `personalizzato: true`: la spunta non e' una deroga
    # sul tipo, e il rifiuto resta in italiano — mai il gergo di un'eccezione Python.
    r = cliente.post("/api/materiale/legame",
                     json={"materiale": _acc(classe="C25/30", personalizzato=True,
                                             valori={"fyk": 450.0})})
    assert r.status_code == 400
    motivo = r.json()["motivo"]
    assert "C25/30" in motivo and "calcestruzzo" in motivo and "acciaio" in motivo
    for gergo in ("Traceback", "TypeError", "KeyError", "unsupported operand", "NoneType"):
        assert gergo not in motivo, motivo


# --- 12/T1: il lettore col soffitto, e le fasi che arrivano mentre arrivano --------------------

import io, threading, time


class _StdoutLento:
    """Uno stdout che consegna le righe quando glielo dici: `consegna(riga)`; `readline` aspetta."""
    def __init__(self):
        self._righe: list[str] = []
        self._c = threading.Condition()
    def consegna(self, riga: str) -> None:
        with self._c:
            self._righe.append(riga); self._c.notify()
    def readline(self) -> str:
        with self._c:
            while not self._righe:
                self._c.wait()
            return self._righe.pop(0)
    def __iter__(self):
        while True:
            r = self.readline()
            if r == "":
                return
            yield r


class _ProcessoFinto:
    def __init__(self):
        self.stdin = io.StringIO()
        self.stdout = _StdoutLento()


def _sp(soffitto_s=0.2):
    from nova.server import SidecarProcesso
    p = _ProcessoFinto()
    return SidecarProcesso(avvia=lambda: p, soffitto_s=soffitto_s), p


def test_un_sidecar_muto_e_un_errore_di_fase_sidecar_e_il_lock_si_libera():
    sp, p = _sp(soffitto_s=0.2)
    righe = sp.chiedi({"comando": "check", "modello": {}})
    assert righe == [{"esito": "errore", "fase": "sidecar", "motivo": "nessuna risposta dal sidecar entro 0.2 s"}]
    assert not sp._lock.locked()


def test_le_fasi_arrivano_al_callback_mentre_arrivano_non_alla_fine():
    sp, p = _sp(soffitto_s=2.0)
    viste: list[tuple[float, str]] = []
    esito: dict = {}

    def corsa():
        esito["righe"] = sp.chiedi({"comando": "corsa", "modello": {}},
                                   su_fase=lambda ev: viste.append((time.perf_counter(), ev["nome"])))
    t = threading.Thread(target=corsa); t.start()
    p.stdout.consegna('{"id": 1, "evento": "fase", "nome": "check model"}\n')
    time.sleep(0.05)
    t_fase = time.perf_counter()
    assert [n for _, n in viste] == ["check model"]          # già vista, e la corsa non è finita
    assert t.is_alive()
    p.stdout.consegna('{"id": 1, "esito": "ok", "secondi": 0.1}\n')
    t.join(timeout=2)
    assert esito["righe"][-1] == {"esito": "ok", "secondi": 0.1}
    assert viste[0][0] < t_fase


def test_una_riga_di_un_altro_id_non_conta_come_risposta():
    sp, p = _sp(soffitto_s=1.0)
    esito: dict = {}
    t = threading.Thread(target=lambda: esito.update(righe=sp.chiedi({"comando": "check", "modello": {}})))
    t.start()
    p.stdout.consegna('{"id": 99, "esito": "ok"}\n')
    p.stdout.consegna('{"id": 1, "esito": "rifiutato", "verdetti": []}\n')
    t.join(timeout=2)
    assert esito["righe"] == [{"esito": "rifiutato", "verdetti": []}]


# --- 12/debiti: il sidecar riparte al comando successivo (ricerca 03:121, R7) ------------------

def _sp_riavviabile(soffitto_s=0.2):
    from nova.server import SidecarProcesso
    processi: list[_ProcessoFinto] = []

    def avvia():
        processi.append(_ProcessoFinto())
        return processi[-1]
    return SidecarProcesso(avvia=avvia, soffitto_s=soffitto_s), processi


def _rispondi_in_un_attimo(p: _ProcessoFinto, riga: str) -> None:
    threading.Timer(0.05, lambda: p.stdout.consegna(riga)).start()


def test_dopo_un_soffitto_il_comando_successivo_riparte_da_un_sidecar_nuovo():
    sp, processi = _sp_riavviabile(soffitto_s=0.2)
    assert sp.chiedi({"comando": "check", "modello": {}})[-1]["fase"] == "sidecar"   # muto: soffitto
    assert len(processi) == 1
    # il secondo comando parte su un processo nuovo, e quello risponde
    _rispondi_in_un_attimo_dopo = threading.Timer(0.05, lambda: processi[-1].stdout.consegna('{"id": 2, "esito": "ok"}\n'))
    _rispondi_in_un_attimo_dopo.start()
    righe = sp.chiedi({"comando": "check", "modello": {}})
    assert len(processi) == 2 and sp.riavvii == 1
    assert righe[-1] == {"esito": "ok"}
    assert not sp._lock.locked()


def test_dopo_uno_stdout_chiuso_il_comando_successivo_riparte():
    sp, processi = _sp_riavviabile(soffitto_s=1.0)
    processi[0].stdout.consegna("")
    assert sp.chiedi({"comando": "check", "modello": {}})[-1]["motivo"] == "il sidecar ha chiuso lo stdout"
    threading.Timer(0.05, lambda: processi[-1].stdout.consegna('{"id": 2, "esito": "ok"}\n')).start()
    assert sp.chiedi({"comando": "check", "modello": {}})[-1] == {"esito": "ok"}
    assert len(processi) == 2


def test_stdout_chiuso_resta_l_errore_di_oggi():
    sp, p = _sp(soffitto_s=1.0)
    esito: dict = {}
    t = threading.Thread(target=lambda: esito.update(righe=sp.chiedi({"comando": "check", "modello": {}})))
    t.start()
    p.stdout.consegna("")
    t.join(timeout=2)
    assert esito["righe"][-1]["motivo"] == "il sidecar ha chiuso lo stdout"
    # Uno stdout chiuso segna il sidecar come rotto: il comando successivo riparte da un
    # processo nuovo (`test_dopo_uno_stdout_chiuso_il_comando_successivo_riparte`), non
    # aspetta il soffitto sul morto.
    assert sp._rotto is True


def test_sidecar_in_processo_chiama_su_fase_per_ogni_evento(tmp_path):
    from nova.server import SidecarInProcesso
    nomi: list[str] = []
    righe = SidecarInProcesso().chiedi({"comando": "corsa", "modello": leggi_fixture("telaio_2x1.nova.json"),
                                       "casi": None, "cartella": str(tmp_path / "c"), "solutore": "/nessun/OpenSees"},
                                      su_fase=lambda ev: nomi.append(ev["nome"]))
    assert nomi[0] == "check model"
    assert righe[-1]["esito"] in ("assente", "errore", "ok")


# --- 12/T2: la corsa come lavoro: 202, fasi mentre arrivano, salute libera, 409 --------------

class _SidecarFermo:
    """Un sidecar che emette «check model», poi aspetta il via: serve a guardare il lavoro a metà.

    `partito` è l'appiglio del test: `time.sleep(0.05)` sarebbe una scommessa sullo scheduler,
    e un rosso a intermittenza costa più di un rosso (R3 dell'annotazione)."""
    def __init__(self):
        self.via = threading.Event()
        self.partito = threading.Event()
    def chiedi(self, req, su_fase=None):
        if req["comando"] == "verifica":
            return [{"esito": "assente", "percorso": None, "motivo": "finto", "dove_prenderlo": "—"}]
        if su_fase:
            su_fase({"evento": "fase", "nome": "check model"})
        self.partito.set()
        self.via.wait(timeout=5)
        return [{"evento": "fase", "nome": "check model"}, {"esito": "ok", "secondi": 0.5, "risultati": {}}]


def _cliente_con_lavoro_fermo(tmp_path):
    from nova.server import SidecarInProcesso, create_app
    fermo = _SidecarFermo()
    c = TestClient(create_app(SidecarInProcesso(), tmp_path / "corse", sidecar_lungo=fermo),
                   raise_server_exceptions=False, base_url="http://127.0.0.1")
    return c, fermo


def test_la_corsa_torna_subito_e_la_get_dice_la_fase_mentre_gira(tmp_path):
    c, fermo = _cliente_con_lavoro_fermo(tmp_path)
    r = c.post("/api/corsa", json={"modello": leggi_fixture("telaio_2x1.nova.json")})
    assert r.status_code == 202 and r.json()["stato"] == "in corso"
    rid = r.json()["run_id"]
    assert fermo.partito.wait(2), "il thread del lavoro non è partito"
    g = c.get(f"/api/corsa/{rid}").json()
    assert g["stato"] == "in corso" and g["fasi"] == ["check model"] and g["secondi"] >= 0
    assert "esito" not in g
    fermo.via.set()
    d = _attendi(c, rid)
    assert d["esito"] == "ok" and d["secondi"] == 0.5 and d["fasi"] == ["check model"]


def test_salute_e_check_restano_liberi_mentre_una_corsa_gira(tmp_path):
    c, fermo = _cliente_con_lavoro_fermo(tmp_path)
    rid = c.post("/api/corsa", json={"modello": leggi_fixture("telaio_2x1.nova.json")}).json()["run_id"]
    assert c.get("/api/salute").status_code == 200
    assert c.post("/api/check", json={"modello": leggi_fixture("telaio_2x1.nova.json")}).status_code == 200
    fermo.via.set(); _attendi(c, rid)


def test_una_seconda_corsa_mentre_una_gira_e_409(tmp_path):
    c, fermo = _cliente_con_lavoro_fermo(tmp_path)
    rid = c.post("/api/corsa", json={"modello": leggi_fixture("telaio_2x1.nova.json")}).json()["run_id"]
    r2 = c.post("/api/corsa", json={"modello": leggi_fixture("telaio_2x1.nova.json")})
    assert r2.status_code == 409 and "in corso" in r2.json()["motivo"]
    # chi ricarica la pagina a metà corsa si riaggancia dal `run_id` che il 409 porta
    assert r2.json()["run_id"] == rid
    # anche il solido passa dallo stesso lavoro: un sidecar solo, una corsa alla volta
    assert c.post("/api/ccx", json={"inp": str(_trave())}).status_code == 409
    fermo.via.set(); _attendi(c, rid)
    # finita la prima, la seconda parte
    assert c.post("/api/corsa", json={"modello": leggi_fixture("telaio_2x1.nova.json")}).status_code == 202


def test_i_lavori_finiti_si_potano_oltre_max_lavori(tmp_path):
    from nova.server import SidecarInProcesso, create_app
    c = TestClient(create_app(SidecarInProcesso(), tmp_path / "corse", max_lavori=2),
                   raise_server_exceptions=False, base_url="http://127.0.0.1")
    ids = [_corsa(c, {"modello": leggi_fixture("telaio_2x1.nova.json")})["run_id"] for _ in range(3)]
    assert c.get(f"/api/corsa/{ids[0]}").status_code == 404, "il più vecchio se n'è andato"
    assert c.get(f"/api/corsa/{ids[1]}").status_code in (200, 400)
    assert c.get(f"/api/corsa/{ids[2]}").status_code in (200, 400)
    assert "cartella" in c.get(f"/api/corsa/{ids[2]}").json(), "la cartella c'è anche per il telaio"


def test_get_di_una_corsa_ignota_o_malformata_e_404(cliente):
    assert cliente.get("/api/corsa/abc").status_code == 404
    assert cliente.get("/api/corsa/0123456789ab").status_code == 404


def test_con_il_sidecar_in_processo_la_get_dice_subito_finita_con_le_fasi(cliente):
    d = _corsa(cliente, {"modello": leggi_fixture("telaio_2x1.nova.json")})
    assert d["stato"] == "finita" and d["fasi"][0] == "check model"


def test_un_rifiuto_del_check_e_una_corsa_finita_con_i_verdetti(cliente):
    m = leggi_fixture("telaio_2x1.nova.json")
    m["nodi"].append({"id": 99, "x": 5000.0, "z": 5000.0})   # nodo libero
    d = _corsa(cliente, {"modello": m})
    assert d["esito"] == "rifiutato"
    assert any(v["controllo"] == "nodi_liberi" and v["esito"] == "non_passato" for v in d["verdetti_check"])


class _SidecarCheScoppia:
    """Il sidecar in processo non ha nessuna rete: un `ValueError` di `_carica`, un `KeyError`
    su un evento storto, e l'eccezione scappa dal thread del lavoro."""
    def chiedi(self, req, su_fase=None):
        raise RuntimeError("il sidecar è esploso")


def test_uneccezione_nel_thread_chiude_il_lavoro_invece_di_bloccare_il_server(tmp_path):
    from nova.server import SidecarInProcesso, create_app
    c = TestClient(create_app(SidecarInProcesso(), tmp_path / "corse", sidecar_lungo=_SidecarCheScoppia()),
                   raise_server_exceptions=False, base_url="http://127.0.0.1")
    rid = c.post("/api/corsa", json={"modello": leggi_fixture("telaio_2x1.nova.json")}).json()["run_id"]
    d = _attendi(c, rid, secondi=5)   # il finto solleva subito: senza il ramo il lavoro non finisce mai
    assert d["stato"] == "finita" and d["esito"] == "errore" and d["fase"] == "sidecar"
    assert "RuntimeError" in d["motivo"]
    # senza il ramo l'unico lavoro resta «in corso» per sempre, e ogni corsa dopo è 409
    assert c.post("/api/corsa", json={"modello": leggi_fixture("telaio_2x1.nova.json")}).status_code == 202


class _SidecarInSoffitto:
    """Il soffitto del Task 1: `chiedi` **rende** l'errore, non lo solleva."""
    def chiedi(self, req, su_fase=None):
        return [{"esito": "errore", "fase": "sidecar", "motivo": "nessuna risposta dal sidecar entro 660 s"}]


def test_lerrore_del_soffitto_chiude_il_lavoro_e_il_prossimo_parte(tmp_path):
    from nova.server import SidecarInProcesso, create_app
    c = TestClient(create_app(SidecarInProcesso(), tmp_path / "corse", sidecar_lungo=_SidecarInSoffitto()),
                   raise_server_exceptions=False, base_url="http://127.0.0.1")
    rid = c.post("/api/corsa", json={"modello": leggi_fixture("telaio_2x1.nova.json")}).json()["run_id"]
    d = _attendi(c, rid)
    assert d["stato"] == "finita" and d["esito"] == "errore" and d["fase"] == "sidecar"
    assert c.post("/api/corsa", json={"modello": leggi_fixture("telaio_2x1.nova.json")}).status_code == 202


def test_un_thread_che_non_parte_non_lascia_il_lavoro_in_corso(cliente, monkeypatch):
    """`Thread.start()` può sollevare (`can't start new thread`): senza la potatura il lavoro
    resta «in corso» per sempre e ogni corsa dopo è 409."""
    import nova.server as ns

    class _ThreadCheNonParte:
        def __init__(self, *a, **k):
            pass

        def start(self):
            raise RuntimeError("can't start new thread")

    # solo il nome `threading` dentro `nova.server`: il modulo vero resta com'è per TestClient
    monkeypatch.setattr(ns, "threading", type("T", (), {"Thread": _ThreadCheNonParte}))
    r = cliente.post("/api/corsa", json={"modello": leggi_fixture("telaio_2x1.nova.json")})
    assert r.status_code == 500
    monkeypatch.undo()
    assert cliente.post("/api/corsa", json={"modello": leggi_fixture("telaio_2x1.nova.json")}).status_code == 202
