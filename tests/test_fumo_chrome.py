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
# Il MURO 1 — la modale con 42 modi, la pushover con 120 passi — vive in `tests/fixture` come
# copia **congelata** di `docs/caso-studio/muro_1*.nova.json`, e non si legge di là: quei file li
# rigenera chi lavora al caso studio, e i numeri asseriti qui sotto (31,85 Hz, 120 passi)
# cadrebbero per una ragione che non è la loro.
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
    # La pipe dello `stderr` (che dalla 14a c'è, per dire perché Chrome non è partito) va chiusa a
    # mano: il garbage collector che se ne accorge dopo la fa uscire come `ResourceWarning`, e
    # `-W error` la trasforma in un fallimento di un test che con Chrome non c'entra niente.
    if proc.stderr is not None:
        proc.stderr.close()


def _attendi_http(url: str, secondi: float = 15.0, proc: subprocess.Popen | None = None) -> None:
    """Aspetta che `url` risponda.

    Con `proc`: se quel processo muore prima, si smette subito invece di aspettare i quindici
    secondi interi — un Chrome che non parte non parte, e il suo `stderr` dice perché.
    """
    fine = time.monotonic() + secondi
    while time.monotonic() < fine:
        try:
            urllib.request.urlopen(url, timeout=1).read()
            return
        except Exception:
            if proc is not None and proc.poll() is not None:
                break
            time.sleep(0.2)
    raise RuntimeError(f"{url} non risponde{_perche(proc)}")


def _perche(proc: subprocess.Popen | None) -> str:
    if proc is None or proc.poll() is None:
        return ""
    testo = (proc.stderr.read() if proc.stderr else "") or ""
    return f" (uscito con {proc.returncode}: {testo.strip()[-400:] or 'nessun messaggio'})"


def _chrome_headless(chrome: str, cdp: int, profilo: Path) -> subprocess.Popen:
    return subprocess.Popen([
        chrome, "--headless=new", f"--remote-debugging-port={cdp}",
        f"--user-data-dir={profilo}", "--no-first-run", "--no-default-browser-check",
        "--window-size=1280,800", "about:blank",
    ], stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, text=True)


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
    # Misurato l'11/09: due avvii su sette muoiono con «`/json/version` non risponde», senza
    # lasciare processi in giro e prima che node parta. Un rilancio con un profilo pulito basta —
    # e se cade anche il secondo, il messaggio porta lo `stderr` di Chrome invece della sola
    # porta muta. Un tentativo solo, non un ciclo: due fallimenti di fila non sono più rumore.
    proc = _chrome_headless(chrome, cdp, tmp_path / "profilo")
    try:
        try:
            _attendi_http(f"http://127.0.0.1:{cdp}/json/version", proc=proc)
        except RuntimeError:
            _termina(proc)
            proc = _chrome_headless(chrome, cdp, tmp_path / "profilo-2")
            _attendi_http(f"http://127.0.0.1:{cdp}/json/version", proc=proc)
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


def senza_insecabili(t: str) -> str:
    """C7a — `testoBadge` attacca ogni `·` a quel che lo precede con uno spazio insecabile, così il
    badge va a capo **dopo** il separatore e la scala scende intera. Qui conta cosa il badge dice,
    non dove si spezza: il testo si legge normalizzato, e l'insecabile ha il suo test in
    `static/test/risultati.test.js`."""
    return t.replace("\u00a0", " ")


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
    assert senza_insecabili(r["trovato"]["badge"]) == "M · Z1 · kN·m · lato teso"
    for larghezza, coppie in r["trovato"]["sovrapposte"].items():
        assert coppie == [], f"etichette sovrapposte a {larghezza}: {coppie}"


def test_trave_appoggiata_la_freccia_in_mezzeria_e_quella_vera(chrome_e_server, binario_opensees):
    """La freccia esatta è 5qL⁴/(384EI) = 1,5709 mm.

    Con la cubica sui soli estremi ne usciva 1,2568 — i 4/5 dell'algebra — perché la mezzeria
    veniva interpolata invece che letta. Coi nodi interni delle `suddivisioni`
    (`spostamenti_interni`) la mezzeria **è** un nodo, e l'etichetta della deformata lo dice.
    """
    porta, cdp = chrome_e_server
    r = copione("risultati", porta, cdp, fixture=str(FIXTURE / "trave_appoggiata.nova.json"), vista="1")
    assert r["ok"], r
    assert r["errori"] == [], r["errori"]
    assert "1,57 mm" in r["trovato"]["etichette"], r["trovato"]["etichette"]


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
    assert t["dopoApertura"]["confrontoVuoto"] is True, "il «Confronto» torna allo stato vuoto"
    assert t["dopoApertura"]["confrontoTelaio"] == "", (
        f"il percorso del telaio e' della corsa di prima: {t['dopoApertura']['confrontoTelaio']!r}")
    assert t["dopoApertura"]["confrontoSolido"] == "", (
        f"e quello del solido pure: {t['dopoApertura']['confrontoSolido']!r}")


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


# La 14a: i modi animati e la pushover scorsa, sul MURO 1 vero. Sono le due cuciture che nessun
# test JS può vedere — che il disegno si **muova**, e che una freccia o un clic cambino il passo.


def test_muro_1_il_modo_2_si_anima_e_spazio_lo_ferma(chrome_e_server, binario_opensees):
    """Il modo 2 del MURO 1 (31,85 Hz, ux 46 %) si muove da solo, e Spazio lo ferma."""
    porta, cdp = chrome_e_server
    r = copione("modale", porta, cdp, fixture=str(FIXTURE / "muro_1.nova.json"))
    assert r["ok"], r
    assert r["errori"] == [], r["errori"]
    t = r["trovato"]
    # La voce del menu porta frequenza, direzione e massa partecipante accanto al numero del modo
    # (`docs/ricerca/07-ux-modellatore.md:103`): è la riga su cui si decide se un modo è locale.
    assert "modo 2 · 31,85 Hz · ux 46 %" in t["voci"], [v for v in t["voci"] if v.startswith("modo 2")]
    # Spazio sul caso statico di partenza: niente da fermare, e il messaggio dice dove si sceglie.
    assert t["senzaModo"] == "Spazio ferma l'animazione del modo: scegline uno dal menu", t["senzaModo"]
    assert t["siMuove"] is True, f"la deformata del modo non si muove, badge: {t['badge']!r}"
    # Senza la pushover scelta la freccia resta al browser: è lo scorrimento della pagina.
    assert t["frecciaLibera"] is False, "`→` senza pushover non deve essere intercettata"
    assert t["ferma"] is True, "dopo Spazio la deformata si muove ancora"
    assert senza_insecabili(t["badge"]).startswith("modo 2 · 31,85 Hz"), t["badge"]
    assert "(auto)" in t["badge"], f"la scala va dichiarata sempre (P3): {t['badge']!r}"
    assert senza_insecabili(t["badgeFerma"]).endswith(" · ferma"), t["badgeFerma"]
    # Il badge sta dentro `#piano` a 1280 px, anche quello lungo del modo a forma nulla.
    assert t["badgeDentro"] is True, f"badge tagliato: {t['badge']!r}"
    assert t["badgeNullaDentro"] is True, f"badge del modo a forma nulla tagliato: {t['badgeNulla']!r}"
    # Il `resize` ridisegna con la fase su cui il modo si è fermato, non con 1: con 1 la forma
    # saltava al massimo al primo trascinamento del bordo e ci restava.
    assert t["resizeTieneLaFase"] is True, "dopo il resize la deformata del modo fermo è cambiata"
    # R2: il modo 6 del MURO 1 ha la forma nulla sui nodi del modello — si mostra lo stesso, il
    # badge dice perché, e il disegno non porta un `NaN`.
    assert "forma nulla sui nodi" in t["badgeNulla"], t["badgeNulla"]
    assert t["nan"] is False, "un `NaN` nei punti della deformata"
    assert t["riparte"] is True, "Spazio non ha ripreso l'animazione"
    assert t["fermaDopoCambio"] is True, "il caso statico non ha fermato l'animazione del modo"
    # R13/D2a: con `prefers-reduced-motion: reduce` niente moto, e il badge ne dice il motivo —
    # un'animazione che non parte senza spiegazione si legge come rotta.
    assert senza_insecabili(t["badgeRidotto"]).endswith(" · ferma (preferenza di sistema)"), t["badgeRidotto"]
    assert t["fermaRidotto"] is True, "col moto ridotto la deformata si muove lo stesso"
    assert t["fermaRidottoDopoSpazio"] is True, "col moto ridotto Spazio fa ripartire l'animazione"
    assert t["messaggio"] == "", f"nessun errore da mostrare: {t['messaggio']!r}"
    # R5 diceva «nessun tetto di fps» su una misura nel DOM finto, che è un pavimento. Questo è il
    # browser vero: se il ridisegno sforasse il budget di un fotogramma, gli intervalli con
    # l'animazione in corso si allungherebbero. La soglia è larga apposta — serve a prendere una
    # regressione da ordine di grandezza, non a misurare il vsync di questa macchina.
    with_, senza = t["fotogramma"]["conAnimazione"], t["fotogramma"]["senzaAnimazione"]
    assert with_["media"] < 50, f"fotogrammi lenti con l'animazione: {with_} contro {senza}"


def test_muro_1_la_pushover_si_scorre_con_le_frecce_e_il_clic(chrome_e_server, binario_opensees):
    """120 passi: si parte dall'ultimo, `←←→` porta al 119, il clic sulla striscia al primo."""
    porta, cdp = chrome_e_server
    r = copione("pushover", porta, cdp, fixture=str(FIXTURE / "muro_1_pushover.nova.json"))
    assert r["ok"], r
    assert r["errori"] == [], r["errori"]
    t = r["trovato"]
    assert "120/120" in t["badge1"], t["badge1"]
    assert t["cerchi"] == 120, f"un cerchio per passo nella striscia: {t['cerchi']}"
    assert "119/120" in t["badge2"], t["badge2"]
    assert "1/120" in t["badge3"], t["badge3"]
    # 15a: |u|max della legenda è fisso sul passo di riferimento della corsa, come la scala: al passo 1
    # la deformata è tutta viola e la legenda non respira.
    assert t["colori1"] and "mm" in t["colori1"], t["colori1"]
    assert t["colori3"] == t["colori1"], f"|u|max cambia col passo: {t['colori1']!r} → {t['colori3']!r}"
    # C: la scala è **una per corsa**, non una per passo. Con `scalaAuto` sul passo corrente
    # usciva ×10 al passo 30 e ×2 al 120: scorrendo lo scrubber la deformata respirava invece di
    # crescere, e confrontare due passi — che è tutto il senso dello scrubber — diceva il falso.
    scale = {senza_insecabili(b).split(" · ")[-1] for b in (t["badge1"], t["badge2"], t["badge3"])}
    assert len(scale) == 1, f"la scala cambia da un passo all'altro: {scale}"
    assert t["stati"] > 0, "nessun simbolo dello stato delle sezioni sulla deformata"
    # C7b — la legenda degli stati parla solo se almeno un simbolo non è quello dell'elastica:
    # all'ultimo passo (120/120, dopo la caduta) il danno c'è e la riga si vede; al primo il telaio è
    # ancora sano, i simboli sono tutti uguali e quella riga sarebbe gergo — in aula, 114 px su tre
    # righe con «rotta» da sola sull'ultima.
    assert t["legendaUltimo"] is False, "all'ultimo passo le sezioni non sono tutte elastiche: la legenda deve parlare"
    assert t["legendaPasso1"] is True, "al primo passo i simboli sono tutti uguali: la legenda non ha niente da spiegare"
    # A e B: niente esce dal proprio riquadro a 1280 px. Il badge accorciato, la legenda che va a
    # capo, il taglio massimo scritto dentro il grafico — tre tagli visti a mano dal controller.
    assert t["dentro"] == {"badge": True, "legenda": True, "taglio": True}, t["dentro"]
    # Con un ghost aperto la freccia è del gesto, non dello scrubber: il passo non si muove.
    assert "1/120" in t["badgeConGhost"], t["badgeConGhost"]
    assert t["sovrapposte"] == [], f"etichette sovrapposte: {t['sovrapposte']}"
    assert t["messaggio"] == "", f"nessun errore da mostrare: {t['messaggio']!r}"


def test_muro_1_la_scheda_confronto_mostra_la_tabella_con_la_massa_prima(chrome_e_server, binario_opensees):
    """Telaio corso dalla UI, nessun solido, il CSV Abaqus d'esempio: la tabella arriva con la massa
    in testa (story 57), le note a piè e il conteggio con l'avvertenza (story 61); il pannello non
    si allarga e la pagina non scorre in orizzontale."""
    porta, cdp = chrome_e_server
    r = copione("confronto", porta, cdp, fixture=str(FIXTURE / "muro_1.nova.json"), csv=str(FIXTURE / "abaqus_esempio.csv"))
    assert r["ok"], r
    assert r["errori"] == [], r["errori"]
    t = r["trovato"]
    assert t["telaio"].endswith("/risultati.nova.risultati.json"), t["telaio"]
    assert t["nodi"] == "3; 4", t["nodi"]
    # run.casi del MURO 1 è ["C1","C2","C3","Z1"]: gli `Z<n>` restano col passo vuoto (`confronto.js`
    # non propone un passo del solido per un'azione del telaio).
    assert t["casi"] == ["C1→C1", "C2→C2", "C3→C3", "Z1→"], t["casi"]
    assert '"C1": "GRAVITA"' in t["json"], t["json"]
    # 1 massa + 3 casi × 4 grandezze + f1-f3 + massa partecipante x/y/z: Z1 non è mappato, niente
    # righe per lui.
    # «massa 1»: il richiamo della nota sta sull'intestazione di riga, la colonna che il `sticky`
    # tiene in vista — non nell'ultima cella, che a pannello stretto scorre via.
    assert t["righe"] == 19 and t["prima"] == "massa 1", (t["righe"], t["prima"])
    assert t["colonne"] == 9, "col CSV Abaqus le colonne sono nove"
    assert t["abaqusC1"] == "4 250", t["abaqusC1"]   # `conciso`: sopra cento niente decimali
    assert t["stato"] == "19 righe · 17 non confrontabili · verifica del codice, non validazione", t["stato"]
    # Nessun solido corso e il campo vuoto: la catena non lo nomina. Il confronto qui è a due lati.
    assert t["didascalia"] == "telaio ↔ Abaqus", t["didascalia"]
    # Due `bias_atteso` distinti (massa; tetraedri), nessuna `ragione` nella corsa: due note.
    assert t["note"] == 2, t["note"]
    assert t["provenienza"].startswith("commit "), t["provenienza"]
    assert t["percorso"] != "", "la cartella degli export si stampa"
    assert t["scorrePagina"] is False, "la pagina non deve scorrere in orizzontale"
    assert t["dentro"] is True, "il riquadro della tabella sta nel pannello"
    assert t["rossi"] == 0, "nessun rosso nella scheda: non è un pass/fail"
    assert t["messaggio"] == "", t["messaggio"]


def test_muro_1_in_presentazione_si_legge_da_otto_metri(chrome_e_server, binario_opensees, tmp_path):
    """P sul MURO 1 a 1920×1080: etichette ≥ 46 px, aste ≥ 6 px, nodi ≥ 14 px, striscia ≥ 32 px
    (story 62); niente si sovrappone; la deformata in viridis con la legenda; in scala di grigi la
    scala resta a parole, il nodo scelto più grosso, la deformata col bordo (story 63); Esc esce."""
    porta, cdp = chrome_e_server
    schermo = tmp_path / "presentazione-grigi.png"
    r = copione("presentazione", porta, cdp, fixture=str(FIXTURE / "muro_1.nova.json"), screenshot=str(schermo))
    assert r["ok"], r
    assert r["errori"] == [], r["errori"]
    t = r["trovato"]
    assert t["bottoneFuori"] == "none", "«pannelli» si vede fuori dalla presentazione"
    # Un decimo di tolleranza, come nel test qui sotto e per la stessa ragione misurata: `piano.js`
    # calcola i mm per pixel su `clientWidth`/`clientHeight`, che sono **arrotondati**, mentre il
    # browser rende sul riquadro vero. Qui il piano è largo 1151 di `clientWidth` contro 1152 veri, e
    # quel pixel basta a far uscire 45,9898 invece di 46.
    # Il 45,99 di prima non misurava questo: lo passava per **0,00035 px**. Misurato il 13/09 a
    # 1920×1080, statica, con la striscia dell'M srotolato accesa e spenta — 45,989835 e 45,990349,
    # cioè lo stesso numero: non è la striscia della 15b a spostarlo, è l'arrotondamento di sempre,
    # che stava mezzo decimillesimo dal lato buono della soglia. La grandezza dichiarata resta 46 px
    # (`--etichetta`) e la soglia della ricerca è 45 (`docs/ricerca/07-ux-modellatore.md:133`).
    assert t["misure"]["etichette"] >= 45.9, t["misure"]
    # Le due gemelle, allargate per la **stessa** ragione e prima che cadano: misurate 5,998674 e
    # 13,996906 contro soglie di 5,99 e 13,99, cioè 7-9 millesimi di pixel di margine su numeri che
    # un arrotondamento di `clientWidth` sposta di suo. Un test che cade fra due settimane per un
    # millesimo di pixel manda a caccia di un difetto che non esiste. Le grandezze dichiarate
    # restano 6 px (`--asta-tratto`) e 14 (`--nodo-raggio` × 2).
    assert t["misure"]["aste"] >= 5.9, t["misure"]
    assert t["misure"]["nodi"] >= 13.9, t["misure"]
    assert t["misure"]["striscia"] >= 32, t["misure"]
    assert all(t["nascosti"]), t["nascosti"]
    assert t["strisciaSotto"] is True
    assert 1.3 <= t["proporzione"] <= 1.7, t["proporzione"]
    assert t["sovrapposte"] == [], t["sovrapposte"]
    assert t["scorre"] is False
    assert t["colori"] >= 2, "la deformata non si colora con lo spostamento"
    assert t["legendaColori"] and "mm" in t["legendaColori"], t["legendaColori"]
    # La piastra (15b, Task 3) **anche qui**, a 1920: la legenda sta sopra il disegno a ogni misura, e
    # senza questi due assert il `background` potrebbe chiudersi in una media query ≤ 1280 senza far
    # cadere niente. L'alfa è quella che discrimina: un fondo trasparente lascia il testo sul viridis,
    # e un rapporto misurato contro un fondo che non copre non dice più niente.
    c = t["contrasto"]
    assert c is not None and c["alfa"] == 1, f"la piastra non è opaca a 1920: {c}"
    assert c["rapporto"] >= 4.5, c
    assert "×" in t["bn"]["badge"], t["bn"]["badge"]
    assert max(t["bn"]["raggi"]) > min(t["bn"]["raggi"]), "il nodo scelto non è più grosso: in B/N resta solo il colore"
    assert t["bn"]["bordo"] >= 1
    assert schermo.stat().st_size > 10_000, "lo screenshot in scala di grigi non è stato scritto"
    # E1 — R1 rendeva `altezzaStriscia` e `piano` senza che nessun assert li leggesse: col CSS del
    # brief (striscia alta 489 px) il test sarebbe restato verde. Misurati 112 e 944 in statica a
    # 1920: la striscia dei controlli resta una striscia, e il piano si prende il resto.
    assert t["altezzaStriscia"] <= 130, t["altezzaStriscia"]
    # 15b — la striscia dell'M srotolato è tornata in aula e il piano ne paga 49 px: 944 → 919. La
    # soglia resta 900 perché quel che promette è «il piano si prende il resto», non il numero di ieri.
    assert t["piano"][1] >= 900, t["piano"]
    # Senza un'asta scelta la striscia porta la sola riga «Seleziona un'asta per il suo M
    # srotolato.»: in aula è il testo che dice cosa fare **adesso**, e a 11 px da 8 m non si leggeva.
    s = t["srotolato"]
    assert s is not None and s["titolo"] >= 32, f"la riga dell'invito sotto i 32 px: {s}"
    assert s["svg"] is None and s["scatola"] <= 60, f"senza asta la striscia è la sola riga: {s}"
    assert t["uscito"] is True
    # Un modo: |u| sulla forma, adimensionale — la legenda dice 0 … 1, mai millimetri.
    assert t["legendaModo"] and "forma del modo" in t["legendaModo"] and "mm" not in t["legendaModo"], t["legendaModo"]
    assert t["menu"] == {"pTiene": True, "escEsce": True}, t["menu"]
    assert t["messaggio"] == "", t["messaggio"]


def test_presentazione_regge_i_bordi_senza_corsa(chrome_e_server):
    """Senza corsa, a 1920×1080: P nel campo del percorso scrive, P senza corsa accende con lo stato
    vuoto a 32 px, P sul bottone «pannelli» alterna, «apri» e il resize restano nell'aula, Esc col
    campo aperto chiude il campo prima di uscire, il ghost dell'estrusione si tiene P, i pannelli
    aperti non rimostrano stati vuoti né Storia, e uscire li richiude."""
    porta, cdp = chrome_e_server
    r = copione("presentazioneBordi", porta, cdp, fixture=str(FIXTURE / "trave_appoggiata.nova.json"))
    assert r["ok"], r
    assert r["errori"] == [], r["errori"]
    t = r["trovato"]
    assert t["bottoneFuori"] == "none", "«pannelli» si vede fuori dalla presentazione"
    assert t["campo"] == {"valore": "p", "acceso": False}, t["campo"]
    assert t["senzaCorsa"]["acceso"] is True, t["senzaCorsa"]
    assert t["senzaCorsa"]["visibile"] is True and t["senzaCorsa"]["vuoto"] >= 32, t["senzaCorsa"]
    assert t["senzaCorsa"]["bottone"] != "none", t["senzaCorsa"]
    # E1 — senza corsa la striscia porta il solo stato vuoto di «Risultati»: misurata 102 px.
    assert t["senzaCorsa"]["altezza"] <= 120, t["senzaCorsa"]
    assert t["pSulBottone"] is True, "P col fuoco su «pannelli» non esce dalla presentazione"
    assert t["aperto"]["acceso"] is True, t["aperto"]
    # Un decimo di tolleranza, e il motivo è misurato: `piano.js` calcola i millimetri per pixel su
    # `clientWidth`/`clientHeight`, che sono **arrotondati**, mentre il browser rende sul riquadro
    # vero. Qui il piano è 1151 × 383,52 e `clientHeight` dice 384: le due direzioni sono a un
    # capello l'una dall'altra (6,4639 contro 6,4665 mm/px), l'arrotondamento decide quale comanda,
    # e il corpo reso esce 45,982 invece di 46. La grandezza dichiarata resta 46 px (`--etichetta`) e
    # la soglia della ricerca è 45 (`docs/ricerca/07-ux-modellatore.md:133`): due centesimi non
    # spostano niente in aula. La radice — `s` su numeri arrotondati e il CTM su quelli veri — è un
    # debito della 15b, non una cosa da sistemare in un giro di fix.
    assert t["aperto"]["etichette"] is not None and t["aperto"]["etichette"] >= 45.9, t["aperto"]
    assert t["ridimensionato"] is not None and t["ridimensionato"] >= 45.9, t["ridimensionato"]
    assert t["primoEsc"] == {"campoAperto": True, "acceso": True, "campoChiuso": True}, t["primoEsc"]
    assert t["secondoEsc"] is True, "il secondo Esc non esce dalla presentazione"
    assert t["ghost"] == {"acceso": False, "campoAperto": True}, t["ghost"]
    assert t["pannelli"] == {"colonna": True, "dati": True, "vuotoNascosto": True, "storiaNascosta": True,
                             "premuto": "true", "scorre": False}, t["pannelli"]
    # E4 — il click su «pannelli» ridisegna **da sé**: misurato prima di premere G, che ridisegnava
    # comunque e mascherava un `ridisegna()` perso. Il piano cambia larghezza, e con lui `s` e le
    # etichette rese.
    rid = t["ridisegnoAlClick"]
    assert rid["prima"]["piano"] != rid["dopo"]["piano"], rid
    assert rid["prima"]["etichette"] != rid["dopo"]["etichette"], rid
    # E4 — il titolo della Storia, non solo la sua `ul`: la regola è `h2:has(+ #storia-elenco)`.
    assert t["titoloStoriaNascosto"] is True, t["titoloStoriaNascosto"]
    assert t["uscitoConPannelli"] == {"acceso": False, "pannelli": False, "premuto": "false"}, t["uscitoConPannelli"]
    assert t["rientro"] == {"acceso": True, "colonna": True}, t["rientro"]
    assert t["messaggio"] == "", t["messaggio"]


def test_il_telaio_non_finisce_sotto_le_strisce_in_presentazione(chrome_e_server, binario_opensees):
    """Il fix A della 15a: la pushover del MURO 1 a 1920×1080 in presentazione è il caso peggiore —
    badge su due righe, legenda degli stati a tutta larghezza, legenda dei colori. Nessun nome di
    nodo e nessun cerchio deve finire sotto una striscia, e nessuna striscia deve sforare il fondo
    del piano. Misurato prima del fix: telaio da 248, strisce fino a 308, e «sommità sx», «sommità
    dx» più i due nodi in cima sotto la legenda degli stati — con `sovrapposte` vuoto, perché
    confronta i `<text>` dell'SVG fra loro e i nomi dei nodi non ci passano."""
    porta, cdp = chrome_e_server
    r = copione("presentazionePushover", porta, cdp, fixture=str(FIXTURE / "muro_1_pushover.nova.json"))
    assert r["ok"], r
    assert r["errori"] == [], r["errori"]
    t = r["trovato"]
    # N5 — la corsa gira **dentro** la presentazione: prima il copione correva e poi entrava in aula,
    # quindi le regole `:has()` che riportano `#corsa-attesa` fra le viste (E5) non le guardava
    # nessuno, e cancellarle lasciava il fumo tutto verde. `offsetParent` nullo = una regola la
    # nasconde; le fasi scritte dicono che non è un riquadro vuoto rimasto in pagina.
    assert t["accesaPrimaDellaCorsa"] is True, "P prima di ⌘⏎: la corsa deve girare in presentazione"
    assert t["attesaInAula"]["fasi"] > 0, t["attesaInAula"]
    assert t["attesaInAula"]["corpo"] >= 32, f"le fasi della corsa in aula sotto i 32 px: {t['attesaInAula']}"
    # 15b — la striscia torna in aula con misure sue (C1 chiuso). A 1920×1080 ci sta, e ci si legge:
    # i suoi numeri a `--etichetta`, il titolo a 32 px come le altre strisce del piano. Qui il caso
    # è la **pushover**, quindi l'SVG è la curva e vale `--curva-alta`, non `--srotolato-alto`: i due
    # riquadri hanno altezze diverse dal fix round 1. Misurato: scatola 327, SVG 240, cinque testi a
    # 46, titolo 32. (I 160 dello srotolato non passano di qui: senza un'asta scelta l'SVG non c'è
    # affatto, e a provarli sono i test a unità di `esito.test.js`.)
    assert t["srotolatoInAula"] is True, "a 1920×1080 la striscia in aula ci sta: deve vedersi"
    s = t["srotolato"]
    assert s is not None, "la striscia non si vede: non c'è niente da misurare"
    assert s["quantiTesti"] > 0, f"nessun testo nella curva: il test sarebbe vuoto — {s}"
    assert s["corpo"] >= 46, f"i numeri della curva sotto i 46 px, illeggibili da 8 m: {s}"
    assert s["titolo"] >= 32, f"la riga che dice cosa si sta guardando sotto i 32 px: {s}"
    # R9 — la ragione dei 160 px è il **contenimento**: a 96 il numero del picco di sopra esce dal
    # riquadro di 12 px. Qui si misura sul reso, non sulla geometria dedotta.
    assert s["fuori"] == [], f"testi fuori dal proprio SVG: {s['fuori']}"
    # Fix round 1 — e non si posano uno sull'altro. È il controllo che mancava: `fuori` guarda se un
    # testo esce dall'SVG, `SOVRAPPOSTE` confronta i testi di #piano fra loro, e quelli della
    # striscia non passano né per l'uno né per l'altro. Con la curva a 160 px qui cadevano «60 mm»
    # e «V 70,93 kN», misurati addosso; a 240 l'area utile vale 123 px e non si toccano.
    assert s["addosso"] == [], f"due testi della striscia si sovrappongono: {s['addosso']}"
    assert s["svg"] == 240, f"la curva non legge `--curva-alta`: {s}"
    # Fix round 2 — e non solo all'ultimo passo. Il taglio massimo sta **fisso**, le due etichette del
    # passo seguono il punto: si incrociano quando il taglio è già alto e lo spostamento ancora
    # piccolo, cioè ai passi bassi. Guardare il solo ultimo passo è la ragione per cui il difetto è
    # sopravvissuto a due giri — misurati sul reso, col numero dentro il grafico erano 8 scontri su
    # 14 passi, e sopra l'asse ancora 3; sotto l'asse al centro nessuno.
    passi = t["srotolatoAiPassi"]
    assert len(passi) == 3, passi
    # Il test non è vuoto: i tre passi sono davvero tre, non tre misure sullo stesso.
    assert len({p["passo"] for p in passi}) == 3, [p["passo"] for p in passi]
    for p in passi:
        assert p["addosso"] == [], f"al passo {p['passo']} due testi si sovrappongono: {p['addosso']}"
        assert p["fuori"] == [], f"al passo {p['passo']} un testo esce dall'SVG: {p['fuori']}"
    # E il telaio deve reggere lo stesso: accendere la striscia gli ruba proprio l'altezza che i
    # Task 2 e 3 gli hanno appena restituito. Misurati, con la curva a 240: scatola 327, piano 594,
    # fascia 192, banda **402** — quattro volte `TELAIO_MINIMO`. Il tetto sulla scatola tiene conto
    # del titolo su due righe (76 px) più padding e bordo: 240 + 87 = 327.
    assert s["scatola"] <= 340, f"la striscia costa più di quanto il budget preveda: {s}"
    assert t["telaio"]["piano"] - t["telaio"]["fascia"] >= 100, t["telaio"]
    s = t["strisce"]
    # Il test non è vuoto: le tre strisce del caso peggiore ci sono davvero.
    assert set(s["visibili"]) >= {"badge", "stati", "colori"}, s["visibili"]
    assert s["addosso"] == [], s["addosso"]
    assert s["sforano"] == [], s["sforano"]
    assert t["sovrapposte"] == [], t["sovrapposte"]
    assert t["scorre"] is False
    assert t["legendaColori"] and "mm" in t["legendaColori"], t["legendaColori"]
    assert t["messaggio"] == "", t["messaggio"]


def test_aula_1280_la_legenda_dei_colori_sta_sulla_sua_piastra_e_non_sul_telaio(chrome_e_server, binario_opensees):
    """Il collaudo della 15b a **1280×657**, il riquadro che il fumo non guardava.

    Il copione d'oggi gira solo a 1920×1080, ed è per questo che nessuno ha visto il difetto: a 1280
    in aula la legenda dei colori, scesa in basso (15b), andava a capo su 89 px e si posava su
    «piede sx», «piede dx» e i loro cerchi. `SOVRAPPOSTE` non basta a vederlo — confronta i `<text>`
    dell'SVG fra loro, e i nomi dei nodi non passano da `disponi`: serve `STRISCE_ADDOSSO`, che
    misura i rettangoli veri. Qui si chiede anche il contrasto **reso** del testo sulla piastra di
    `--fondo`, che è l'oracolo della piastra: un `rect` nel DOM non c'è (`.risultati-colori` è un
    `div`, `piano.js:144`), e l'unica cosa che si può provare è il colore composto in pagina.
    """
    porta, cdp = chrome_e_server
    r = copione("aula1280", porta, cdp, fixture=str(FIXTURE / "muro_1_pushover.nova.json"))
    assert r["ok"], r
    assert r["errori"] == [], r["errori"]
    t = r["trovato"]
    assert t["accesa"] is True, "P prima di ⌘⏎: la corsa deve girare in presentazione"
    s = t["strisce"]
    # Il test non è vuoto: le tre strisce del caso peggiore ci sono davvero, a questa larghezza.
    assert set(s["visibili"]) >= {"badge", "stati", "colori"}, s["visibili"]
    assert s["addosso"] == [], s["addosso"]
    assert s["sforano"] == [], s["sforano"]
    assert t["sovrapposte"] == [], t["sovrapposte"]
    # La fascia **si riserva**: il telaio comincia sotto l'ultima striscia in colonna, e quel che
    # resta di disegno sta sopra `TELAIO_MINIMO` (100 px, `piano.js:36`). Senza la fascia il telaio
    # partirebbe da zero e i nomi in cima finirebbero sotto il badge.
    tel = t["telaio"]
    assert tel["cima"] >= tel["fascia"] - 0.5, tel
    # `TELAIO_MINIMO` si misura come lo misura W4: sul **riquadro che resta** sotto la fascia, non
    # sull'altezza resa dei cerchi — il MURO 1 è largo e basso, e a 1280 il suo telaio rende 54 px
    # di alto dentro una banda di 211. Quel che il criterio promette è la banda, non il disegno.
    assert tel["piano"] - tel["fascia"] >= 100, tel
    assert tel["alto"] > 0, "nessun nodo disegnato: il telaio non c'è"
    # 15b, R8 — a questo riquadro la striscia dell'M srotolato non ci sta a **nessuna** altezza
    # utile: accesa costa 285 px (il titolo va a capo tre volte a questa larghezza) su un piano di
    # 403 che ne riserva già 192 alle strisce, e al telaio resterebbero −74 px. La regola di ripiego
    # non è condizionale. L'oracolo non è «sparisce», è **il piano si tiene i suoi 403 px interi**:
    # senza la seconda riga, l'assert passerebbe identico anche se sparisse il piano con lei.
    assert t["srotolatoInAula"] is False, "a 1280×657 la striscia in aula si mangia tutto il disegno"
    assert t["srotolato"] is None, t["srotolato"]
    assert tel["piano"] == 403, f"il piano non si tiene la sua altezza: {tel}"
    # La legenda dei colori su **una** riga: è la leva che toglie i piedi da sotto di lei. A 32 px
    # una riga è alta ~38 px; le 89 misurate col testo intero erano tre righe.
    assert t["altaColori"] <= 70, t["altaColori"]
    # In aula il testo è quello compatto — «|u|», non «spostamento |u|» — e i millimetri restano.
    assert t["legendaColori"] and "mm" in t["legendaColori"], t["legendaColori"]
    assert "spostamento" not in t["legendaColori"], t["legendaColori"]
    # La piastra: fondo **opaco** (il testo sta sopra il disegno, `07-ux-modellatore.md:100`) e
    # contrasto reso ≥ 4,5:1 su di lui. È l'asserzione dell'alfa a morire se la riga sparisce dal
    # CSS: senza piastra il `backgroundColor` reso è `rgba(0, 0, 0, 0)`, e il rapporto continuerebbe
    # a dire 13,19 contro un fondo che non copre niente.
    c = t["contrasto"]
    assert c is not None, "la legenda dei colori non si vede: il contrasto non si misura"
    assert c["alfa"] == 1, f"la piastra non è opaca: {c}"
    assert c["rapporto"] >= 4.5, c
    assert t["scorre"] is False, "la pagina non deve scorrere in orizzontale"
    # Il riquadro strettissimo, 640×400 a dpr 2 (lo zoom 200 %): misurato, il piano scende a 518×99 px
    # e la legenda dei colori è alta 98 e larga 501 — con una piastra opaca non affolla il disegno, lo
    # **cancella**. Là si toglie di mezzo (`stile.css`, `@media (max-height: 480px)`), e nessun nome e
    # nessun cerchio le finisce più sotto. Quelli che restano addosso al badge e al titolo sono il
    # difetto della griglia a quella misura, che è un'altra issue della 15b.
    st = t["stretto"]
    assert st["colori"] is None, f"a 640×400 la piastra copre il disegno invece di lasciarlo vedere: {st}"
    addosso = [c for c in st["strisce"]["addosso"] if c[1] == "colori"]
    assert addosso == [], addosso
    # La promessa non è «la legenda sparisce», è «il disegno resta»: senza questa riga l'assert qui
    # sopra passerebbe identico anche se a quella misura sparisse il telaio intero. Misurato: il nodo
    # più alto sta a 18 px dentro un piano di 99.
    assert st["strisce"]["telaio"] is not None and st["strisce"]["piano"] > 0, st["strisce"]
    assert t["messaggio"] == "", t["messaggio"]


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


def test_attendi_http_smette_subito_se_il_processo_e_morto_e_dice_perche():
    """Il fix di E: un Chrome che non parte non si aspetta quindici secondi, e lo `stderr` si legge."""
    proc = subprocess.Popen(["python3", "-c", "import sys; sys.stderr.write('niente porta\\n'); sys.exit(3)"],
                            stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, text=True)
    proc.wait(timeout=5)
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        porta_chiusa = s.getsockname()[1]
    t0 = time.monotonic()
    try:
        with pytest.raises(RuntimeError, match=r"uscito con 3: niente porta"):
            _attendi_http(f"http://127.0.0.1:{porta_chiusa}/json/version", secondi=15, proc=proc)
        assert time.monotonic() - t0 < 5, "non ha aspettato i quindici secondi del tetto"
    finally:
        _termina(proc)


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
