"""Il test di fumo dell'interfaccia: `app.js` in Chrome headless, tasti veri, DOM vero.

`node --test` prova le funzioni pure (`tests/test_js.py`); questo prova la cucitura — che la pagina
si apra, che la tastiera risponda, che il piano disegni. Salta se manca Chrome o node: non è un
fallimento, è un attrezzo assente. Debito dichiarato nella giornata 12 (`app.js` senza test).
"""
import json
import os
import shutil
import socket
import subprocess
import threading
import time
import urllib.request
from pathlib import Path

import pytest

RADICE = Path(__file__).resolve().parent.parent
FUMO = RADICE / "tests" / "fumo" / "fumo.mjs"
CANDIDATI_CHROME = (
    shutil.which("google-chrome"), shutil.which("chromium"), shutil.which("chromium-browser"),
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
)


def _chrome() -> str | None:
    for c in CANDIDATI_CHROME:
        if c and os.access(c, os.X_OK):
            return c
    return None


def _porta_libera() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def _termina(proc: subprocess.Popen, secondi: float = 5.0) -> None:
    proc.terminate()
    try:
        proc.wait(timeout=secondi)
    except subprocess.TimeoutExpired:
        proc.kill()


def _attendi_http(url: str, secondi: float = 15.0) -> None:
    fine = time.monotonic() + secondi
    while time.monotonic() < fine:
        try:
            urllib.request.urlopen(url, timeout=1).read()
            return
        except Exception:
            time.sleep(0.2)
    raise RuntimeError(f"{url} non risponde")


@pytest.fixture
def chrome_e_server(tmp_path):
    chrome = _chrome()
    if chrome is None:
        pytest.skip("Chrome non è installato: il fumo dell'interfaccia non si prova qui")
    if shutil.which("node") is None:
        pytest.skip("node non è installato: il fumo dell'interfaccia non si prova qui")
    import uvicorn
    from nova.server import SidecarInProcesso, create_app

    porta, cdp = _porta_libera(), _porta_libera()
    app = create_app(SidecarInProcesso(), tmp_path / "corse", porta=porta)
    server = uvicorn.Server(uvicorn.Config(app, host="127.0.0.1", port=porta, log_level="warning"))
    filo = threading.Thread(target=server.run, daemon=True)
    filo.start()
    _attendi_http(f"http://127.0.0.1:{porta}/api/salute")
    proc = subprocess.Popen([
        chrome, "--headless=new", f"--remote-debugging-port={cdp}",
        f"--user-data-dir={tmp_path / 'profilo'}", "--no-first-run", "--no-default-browser-check",
        "--window-size=1280,800", "about:blank",
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        _attendi_http(f"http://127.0.0.1:{cdp}/json/version")
        yield porta, cdp
    finally:
        _termina(proc)
        server.should_exit = True
        filo.join(timeout=5)


def copione(nome: str, porta: int, cdp: int, **extra) -> dict:
    arg = json.dumps({"porta": porta, "cdp": cdp, "copione": nome, **extra})
    esito = subprocess.run(["node", str(FUMO), arg], capture_output=True, text=True, cwd=RADICE, timeout=120)
    assert esito.returncode == 0, esito.stderr
    return json.loads(esito.stdout.strip().splitlines()[-1])


def test_la_pagina_si_apre_e_un_nodo_si_posa_da_tastiera(chrome_e_server):
    porta, cdp = chrome_e_server
    r = copione("pagina", porta, cdp)
    assert r["ok"], r
    assert r["errori"] == [], r["errori"]           # nessuna eccezione né errore in console
    assert r["trovato"]["cerchi"] >= 1               # il nodo è nel piano
    assert r["trovato"]["messaggio"] == ""           # e nessun messaggio d'errore
    assert "0 mm" in r["trovato"]["albero"]          # e nell'albero, con l'unità


def test_chrome_assente_salta_col_motivo(monkeypatch, tmp_path):
    monkeypatch.setattr("test_fumo_chrome._chrome", lambda: None)
    gen = chrome_e_server.__wrapped__(tmp_path)
    with pytest.raises(pytest.skip.Exception, match="Chrome non è installato"):
        next(gen)


def test_node_assente_salta_col_motivo(monkeypatch, tmp_path):
    monkeypatch.setattr("test_fumo_chrome._chrome", lambda: "/bin/true")
    monkeypatch.setattr(shutil, "which", lambda nome: None if nome == "node" else "/bin/true")
    gen = chrome_e_server.__wrapped__(tmp_path)
    with pytest.raises(pytest.skip.Exception, match="node non è installato"):
        next(gen)


def test_attendi_http_timeout_alza_runtimeerror_con_url():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        porta_chiusa = s.getsockname()[1]   # nessuno ascolta qui dopo la chiusura del socket
    url = f"http://127.0.0.1:{porta_chiusa}/json/version"
    with pytest.raises(RuntimeError, match=rf"^{url} non risponde$"):
        _attendi_http(url, secondi=0.3)


def test_copione_esce_diverso_da_zero_assert_mostra_stderr(monkeypatch, tmp_path):
    boom = tmp_path / "boom.mjs"
    boom.write_text('console.error("motivo del crollo"); process.exit(1);\n')
    monkeypatch.setattr("test_fumo_chrome.FUMO", boom)
    with pytest.raises(AssertionError, match="motivo del crollo"):
        copione("pagina", 0, 0)


def test_copione_legge_ultima_riga_fra_rumore(monkeypatch, tmp_path):
    rumoroso = tmp_path / "rumoroso.mjs"
    rumoroso.write_text(
        'console.log("riga di rumore prima");\n'
        'console.log(JSON.stringify({ok: true, trovato: {}, errori: []}));\n'
    )
    monkeypatch.setattr("test_fumo_chrome.FUMO", rumoroso)
    assert copione("pagina", 0, 0) == {"ok": True, "trovato": {}, "errori": []}


def test_termina_processo_che_ignora_terminate_finisce_col_kill():
    # Un processo che intrappola SIGTERM e dorme: `terminate()` da solo non lo tocca.
    proc = subprocess.Popen(
        ["python3", "-c", "import signal, time; signal.signal(signal.SIGTERM, signal.SIG_IGN); time.sleep(30)"]
    )
    try:
        t0 = time.monotonic()
        _termina(proc, secondi=0.5)
        assert time.monotonic() - t0 < 5    # non aspetta i 30 s del processo, kill() lo tronca
        assert proc.poll() is not None       # e il processo è morto per davvero
    finally:
        if proc.poll() is None:
            proc.kill()
