"""Il test di fumo dell'interfaccia: `app.js` in Chrome headless, tasti veri, DOM vero.

`node --test` prova le funzioni pure (`tests/test_js.py`); questo prova la cucitura — che la pagina
si apra, che la tastiera risponda, che il piano disegni. Salta se manca Chrome o node: non è un
fallimento, è un attrezzo assente. Debito dichiarato nella giornata 12 (`app.js` senza test).
"""
import contextlib
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
FIXTURE = RADICE / "tests" / "fixture"
CANDIDATI_CHROME = (
    shutil.which("google-chrome"), shutil.which("chromium"), shutil.which("chromium-browser"),
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
)


def _chrome() -> str | None:
    for c in CANDIDATI_CHROME:
        if c and os.access(c, os.X_OK):
            return c
    return None


def _porte_libere(quante: int = 2) -> list[int]:
    """Porte libere, prenotate **insieme**.

    Chiudere il primo socket prima di aprire il secondo lascia il sistema libero di ridare la
    stessa porta, e server e CDP finirebbero sulla stessa: un fallimento raro e illeggibile. Qui i
    socket restano aperti finché non sono state scelte tutte.
    """
    with contextlib.ExitStack() as pila:
        prese = [pila.enter_context(socket.socket()) for _ in range(quante)]
        for presa in prese:
            presa.bind(("127.0.0.1", 0))
        return [presa.getsockname()[1] for presa in prese]


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

    porta, cdp = _porte_libere(2)
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


def test_trave_appoggiata_il_momento_in_mezzeria_e_sull_etichetta(chrome_e_server, binario_opensees):
    """La verifica della giornata 13 (bozza T5, riga 19): M(mid) = qL²/8 = 45 kN·m letto sull'etichetta."""
    porta, cdp = chrome_e_server
    r = copione("risultati", porta, cdp, fixture=str(FIXTURE / "trave_appoggiata.nova.json"), vista="2")
    assert r["ok"], r
    assert r["errori"] == [], r["errori"]
    assert r["trovato"]["ultima"].startswith("corsa")
    assert "45 kN·m" in r["trovato"]["etichette"], r["trovato"]
    assert r["trovato"]["badge"] == "M · Z1 · kN·m · lato teso"
    for larghezza, coppie in r["trovato"]["sovrapposte"].items():
        assert coppie == [], f"etichette sovrapposte a {larghezza}: {coppie}"


@pytest.mark.parametrize("vista", ["1", "2", "3", "4"])
def test_telaio_2x1_nessuna_etichetta_sovrapposta_in_ogni_vista(chrome_e_server, binario_opensees, vista):
    porta, cdp = chrome_e_server
    r = copione("risultati", porta, cdp, fixture=str(FIXTURE / "telaio_2x1.nova.json"), vista=vista)
    assert r["ok"], r
    assert r["errori"] == [], r["errori"]
    assert r["trovato"]["messaggio"] == ""
    for larghezza, coppie in r["trovato"]["sovrapposte"].items():
        assert coppie == [], f"vista {vista}, etichette sovrapposte a {larghezza}: {coppie}"


# `app.js` non ha un file di test suo (nessun `app.test.js`): il banco di prova è il fumo, e sono
# questi tre a coprirne le cuciture — il fuoco del campo, l'azzeramento dei risultati, la verifica.


def test_le_cifre_della_vista_non_finiscono_nel_campo_di_comando(chrome_e_server):
    """Campo aperto e senza fuoco: `2` non posa il nodo né si scrive nel campo."""
    porta, cdp = chrome_e_server
    r = copione("campoSenzaFuoco", porta, cdp)
    assert r["ok"], r
    assert r["errori"] == [], r["errori"]
    t = r["trovato"]
    assert t["dopo"] == t["prima"], "nessun nodo nuovo: il campo non ha confermato da sé"
    assert "2" not in t["campo"], f"la cifra non entra nel campo: {t['campo']!r}"
    assert t["campo"] == "0; 0", f"e quel che si stava scrivendo resta: {t['campo']!r}"
    assert t["strati"] == 0, "senza corsa non c'è niente da disegnare"
    # Misurato: `#messaggio` resta **vuoto**, non dice «nessuna corsa da mostrare». Col campo di
    # comando aperto la cifra non arriva a `dispatchVoce`, quindi quel ramo (`app.js`,
    # `codice === "vista"`) non si esegue: lo raggiunge solo la cifra premuta a campo chiuso.
    # Qui conta che non si sia rotto niente in silenzio, e la riga muta è la prova.
    assert t["messaggio"] == "", f"nessun errore da mostrare: {t['messaggio']!r}"


def test_aprire_un_altro_modello_butta_i_risultati_della_corsa_di_prima(chrome_e_server, binario_opensees):
    """Numeri veri sul telaio sbagliato sarebbero il difetto peggiore: i risultati si azzerano."""
    porta, cdp = chrome_e_server
    r = copione("azzera", porta, cdp,
                fixture=str(FIXTURE / "trave_appoggiata.nova.json"),
                secondo=str(FIXTURE / "telaio_2x1.nova.json"))
    assert r["ok"], r
    assert r["errori"] == [], r["errori"]
    t = r["trovato"]
    assert t["conRisultati"]["controlli"] is True
    assert t["conRisultati"]["strati"] == 1, "prima dell'apertura il piano disegna M"
    assert t["dopoApertura"]["controlli"] is False, "il blocco «Risultati» sparisce"
    assert t["dopoApertura"]["vuoto"] is True, "e resta lo stato vuoto"
    assert t["dopoApertura"]["strati"] == 0, "nessuno strato sopra il telaio nuovo"


def test_la_verifica_del_modello_non_butta_i_risultati_in_vista(chrome_e_server, binario_opensees):
    """`⇧⌘⏎` verifica, non corre: quel che si sta guardando resta dov'è."""
    porta, cdp = chrome_e_server
    r = copione("verifica", porta, cdp, fixture=str(FIXTURE / "trave_appoggiata.nova.json"))
    assert r["ok"], r
    assert r["errori"] == [], r["errori"]
    t = r["trovato"]
    assert t["prima"]["poligoni"] >= 1, "prima della verifica lo strato M c'è"
    assert t["dopo"]["poligoni"] == t["prima"]["poligoni"], "e dopo è ancora lì"
    assert t["dopo"]["badge"] == t["prima"]["badge"], f"badge cambiato: {t['prima']['badge']!r} → {t['dopo']['badge']!r}"
    assert t["dopo"]["controlli"] is True




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
