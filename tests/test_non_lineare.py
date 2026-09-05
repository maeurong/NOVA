"""Il deck a fibre non lineare e la statica a passi, senza binario.

La prima prova non è sul non lineare: è la **regressione elastica** sul `.tcl` del `telaio_2x1`,
byte per byte. La riga d'intestazione non porta data né versione, quindi il confronto è
sull'intero file, nessuna riga esclusa.

`tests/fixture/telaio_2x1_riferimento.tcl` **non è più** l'uscita di `main` @ `2c120fa`: il fix
del round 1 (`algorithm Newton` al posto di `Linear` nel ramo elastico, che su un telaio
iperstatico con `eleLoad` non chiudeva l'equilibrio) cambia due righe per caso, e il riferimento
è stato rigenerato dal codice corretto. Da lì in poi morde come prima: qualunque riga che si
muova senza che nessuno l'abbia voluta fa cadere questo test. Si rigenera con

    .venv/bin/python -c "
    import json
    from pathlib import Path
    from nova import deck, modello as _m, sidecar
    m = _m.assicura_peso_proprio(_m.carica(json.loads(
        Path('tests/fixture/telaio_2x1.nova.json').read_text(encoding='utf-8'))))
    d = deck.scrivi(m, sidecar._casi_delle_analisi(m), Path('tests/fixture/_rif'))
    Path('tests/fixture/telaio_2x1_riferimento.tcl').write_text(
        d.percorso.read_text(encoding='utf-8'), encoding='utf-8')"

e poi si cancella `tests/fixture/_rif`. Rigenerarlo è una scelta che si dichiara nel commit,
non un modo di far tacere il test.
"""
import pytest

from conftest import FIXTURE, leggi_fixture
from nova import deck as _deck
from nova import legami as _legami
from nova import modello as _modello
from nova import sidecar as _sidecar

RIFERIMENTO = FIXTURE / "telaio_2x1_riferimento.tcl"


def _carica(nome: str, **modifiche):
    dati = leggi_fixture(nome)
    dati.update(modifiche)
    return _modello.assicura_peso_proprio(_modello.carica(dati))


def _fibre(dati: dict, **campi) -> dict:
    """La stessa fixture con la statica dichiarata a fibre (e quel che serve al caso)."""
    for an in dati["analisi"]:
        if an["tipo"] == "statica":
            an.update({"legami": "fibre", **campi})
    return dati


def _testo(m, casi, tmp_path, **extra) -> str:
    return _deck.scrivi(m, list(casi), tmp_path, **extra).percorso.read_text(encoding="utf-8")


# --- regressione: `legami: elastico` (default) scrive quel che scriveva prima del refactor ---

def test_il_deck_elastico_del_telaio_2x1_e_identico_al_riferimento(tmp_path):
    m = _carica("telaio_2x1.nova.json")
    casi = _sidecar._casi_delle_analisi(m)
    assert casi == ["Z1", "Z2", "C1", "Z3"]  # l'ordine è quello del riferimento
    assert _testo(m, casi, tmp_path) == RIFERIMENTO.read_text(encoding="utf-8")


# --- le sezioni a fibre non lineari ---

def test_la_statica_a_fibre_scrive_tre_materiali_per_sezione_con_tag_distinti(tmp_path):
    """Due sezioni sullo stesso C25/30 e sullo stesso B450C non condividono un materiale: il
    confinamento dipende dalla sezione (staffe, barre, b×h), quindi ogni sezione ha la sua terna."""
    m = _carica("telaio_2x1.nova.json", **{"analisi": [{"tipo": "statica", "casi": ["Z1"],
                                                        "legami": "fibre"}]})
    d = _deck.scrivi(m, ["Z1"], tmp_path)
    righe = [r for r in d.percorso.read_text(encoding="utf-8").splitlines()
             if r.startswith("uniaxialMaterial")]
    assert len(righe) == 6  # due sezioni × (nucleo, copriferro, acciaio)
    tag = [int(r.split()[2]) for r in righe]
    assert tag == sorted(set(tag)) and tag[0] == 1  # distinti, consecutivi, nessuna collisione
    assert [r.split()[1] for r in righe] == ["Concrete02"] * 2 + ["Steel02"] + ["Concrete02"] * 2 + ["Steel02"]
    assert sum(r.endswith(f"nucleo, sezione {k}") for r in righe for k in (1, 2)) == 2
    assert set(d.materiali) == {"1", "2"}
    assert d.materiali["1"]["nucleo"]["confinamento"] == "ntc"
    assert d.legami == "fibre" and d.passi == 10


def test_la_sezione_a_fibre_ha_il_nucleo_alla_linea_media_delle_staffe_e_quattro_fasce(tmp_path):
    """`b_x = b − 2(c + φ_st/2)`: sulla 30×50 con copriferro 30 e staffe Ø8, 232 × 432 mm."""
    m = _carica("trave_appoggiata.nova.json",
                analisi=[{"tipo": "statica", "casi": ["Z1"], "legami": "fibre"}])
    d = _deck.scrivi(m, ["Z1"], tmp_path)
    patch = [r.split() for r in d.percorso.read_text(encoding="utf-8").splitlines()
             if r.strip().startswith("patch rect")]
    assert len(patch) == 5  # nucleo + quattro fasce di copriferro
    # `patch rect <mat> <nY> <nZ> y0 z0 y1 z1`: le coordinate cominciano al quinto campo
    assert [p[3:5] for p in patch] == [[str(m.impostazioni_analisi.fibre)] * 2] * 5
    assert [float(x) for x in patch[0][5:]] == pytest.approx([-116.0, -216.0, 116.0, 216.0])
    fasce = {tuple(round(float(x), 6) for x in p[5:]) for p in patch[1:]}
    assert fasce == {(-150.0, -250.0, 150.0, -216.0), (-150.0, 216.0, 150.0, 250.0),
                     (-150.0, -216.0, -116.0, 216.0), (116.0, -216.0, 150.0, 216.0)}
    assert {p[2] for p in patch[1:]} == {patch[1][2]}  # un solo copriferro, uno solo il suo tag
    assert patch[0][2] != patch[1][2]  # nucleo e copriferro sono due materiali


def test_le_fibre_registrate_sono_gli_spigoli_del_nucleo_e_le_barre_estreme(tmp_path):
    m = _carica("trave_appoggiata.nova.json",
                analisi=[{"tipo": "statica", "casi": ["Z1"], "legami": "fibre"}])
    d = _deck.scrivi(m, ["Z1"], tmp_path)
    (fibre,) = d.fibre_registrate.values()
    nucleo = {(f["y"], f["z"]) for f in fibre if f["ruolo"] == "nucleo"}
    assert nucleo == {(-116.0, -216.0), (116.0, -216.0), (116.0, 216.0), (-116.0, 216.0)}
    # una barra per verso, non quattro barre: su una fila `inf`/`sup` la barra d'angolo serve
    # due versi, e le posizioni si uniscono. L'oracolo è che gli estremi ci siano tutti e quattro.
    acciaio = [f for f in fibre if f["ruolo"] == "acciaio"]
    assert min(f["z"] for f in acciaio) == -204.0 and max(f["z"] for f in acciaio) == 204.0
    assert min(f["y"] for f in acciaio) == -104.0 and max(f["y"] for f in acciaio) == 104.0
    assert {f["mat"] for f in acciaio} == {3}  # il terzo tag della terna nucleo, copriferro, acciaio


def test_il_confinamento_mander_scrive_concrete04_sul_nucleo_e_concrete02_sul_copriferro(tmp_path):
    dati = leggi_fixture("trave_appoggiata.nova.json")
    dati["analisi"] = [{"tipo": "statica", "casi": ["Z1"], "legami": "fibre"}]
    dati["materiali"][0]["legame"] = {"confinamento": "mander"}
    m = _modello.assicura_peso_proprio(_modello.carica(dati))
    righe = [r.split()[1] for r in _testo(m, ["Z1"], tmp_path).splitlines()
             if r.startswith("uniaxialMaterial")]
    assert righe == ["Concrete04", "Concrete02", "Steel02"]  # nucleo, copriferro, acciaio


# --- gli ingressi degeneri ---

def test_senza_staffe_la_sezione_a_fibre_e_una_patch_di_copriferro_e_non_un_rifiuto(tmp_path):
    """Il nucleo confinato da un'armatura trasversale che non c'è sarebbe resistenza inventata:
    una patch sola, il legame del copriferro ovunque, e la nota nel resoconto."""
    dati = leggi_fixture("trave_appoggiata.nova.json")
    dati["analisi"] = [{"tipo": "statica", "casi": ["Z1"], "legami": "fibre"}]
    del dati["sezioni"][0]["staffe"]
    m = _modello.assicura_peso_proprio(_modello.carica(dati))
    d = _deck.scrivi(m, ["Z1"], tmp_path)
    testo = d.percorso.read_text(encoding="utf-8")
    assert len([r for r in testo.splitlines() if r.strip().startswith("patch rect")]) == 1
    assert len([r for r in testo.splitlines() if r.startswith("uniaxialMaterial")]) == 1
    assert d.materiali["2"]["nucleo"]["confinamento"] == "nessuno"
    assert d.materiali["2"]["acciaio"] is None  # senza staffe `_barre` non colloca niente
    assert any("senza staffe" in n for n in d.resoconto["note"]), d.resoconto["note"]


def test_il_copriferro_che_mangia_il_nucleo_e_un_errore_che_nomina_la_sezione(tmp_path):
    """`copriferro + φ_st/2 ≥ min(b, h)/2`: il nucleo ha area nulla. Senza barre dichiarate la
    guardia di `_barre` non scatta, e senza questa il `.tcl` porterebbe una patch rovesciata."""
    dati = leggi_fixture("trave_appoggiata.nova.json")
    dati["analisi"] = [{"tipo": "statica", "casi": ["Z1"], "legami": "fibre"}]
    dati["sezioni"][0] |= {"copriferro": 150, "file": []}
    m = _modello.assicura_peso_proprio(_modello.carica(dati))
    with pytest.raises(ValueError, match=r"sezione 2 «30×50 3\+3Ø16».*non lasciano nucleo"):
        _deck.scrivi(m, ["Z1"], tmp_path)


def test_la_sezione_senza_barre_a_fibre_scrive_nucleo_e_copriferro_senza_acciaio(tmp_path):
    dati = leggi_fixture("trave_appoggiata.nova.json")
    dati["analisi"] = [{"tipo": "statica", "casi": ["Z1"], "legami": "fibre"}]
    dati["sezioni"][0]["file"] = []
    m = _modello.assicura_peso_proprio(_modello.carica(dati))
    d = _deck.scrivi(m, ["Z1"], tmp_path)
    righe = [r.split()[1] for r in d.percorso.read_text(encoding="utf-8").splitlines()
             if r.startswith("uniaxialMaterial")]
    # senza barre contenute `α_n` = 0 (NTC [4.1.12.f]): il nucleo **non** è confinato, e il suo
    # legame torna quello del copriferro. Una patch e un materiale, nessuno `Steel02`.
    assert righe == ["Concrete02"]
    assert d.materiali["2"]["acciaio"] is None
    assert d.materiali["2"]["nucleo"]["confinamento"] == "nessuno"


def test_la_statica_a_fibre_su_sezione_senza_barre_e_un_non_passato_del_check_model():
    from nova import check
    dati = leggi_fixture("trave_appoggiata.nova.json")
    dati["analisi"] = [{"tipo": "statica", "casi": ["Z1"], "legami": "fibre"}]
    dati["sezioni"][0]["file"] = []
    m = _modello.assicura_peso_proprio(_modello.carica(dati))
    v = next(x for x in check.check_model(m) if x["controllo"] == "armatura_mancante")
    assert v["esito"] == "non_passato" and v["oggetto"] == [2]
    assert check.rifiutato(check.check_model(m))


def test_la_stessa_sezione_scoperta_resta_non_applicabile_in_una_corsa_elastica():
    from nova import check
    dati = leggi_fixture("trave_appoggiata.nova.json")
    dati["sezioni"][0]["file"] = []
    m = _modello.assicura_peso_proprio(_modello.carica(dati))
    v = next(x for x in check.check_model(m) if x["controllo"] == "armatura_mancante")
    assert v["esito"] == "non_applicabile" and v["oggetto"] == [2]


def test_la_veste_di_progetto_avvisa_nel_resoconto_e_non_rifiuta(tmp_path):
    dati = leggi_fixture("trave_appoggiata.nova.json")
    dati["analisi"] = [{"tipo": "statica", "casi": ["Z1"], "legami": "fibre"}]
    dati["impostazioni_analisi"] = {"veste": "progetto"}
    m = _modello.assicura_peso_proprio(_modello.carica(dati))
    d = _deck.scrivi(m, ["Z1"], tmp_path)
    assert d.resoconto["avvisi"] == [_legami.AVVISO_PROGETTO]
    assert d.percorso.is_file() and "veste progetto" in d.percorso.read_text(encoding="utf-8")


def test_un_passo_solo_scrive_un_loadcontrol_pieno(tmp_path):
    m = _carica("trave_appoggiata.nova.json",
                analisi=[{"tipo": "statica", "casi": ["Z1"], "legami": "fibre", "passi": 1}])
    testo = _testo(m, ["Z1"], tmp_path)
    assert "set dt [expr {1.0/1}]" in testo
    assert _deck.scrivi(m, ["Z1"], tmp_path).passi == 1


def test_il_blocco_a_fibre_porta_la_scala_di_algoritmi_e_i_dimezzamenti(tmp_path):
    m = _carica("trave_appoggiata.nova.json",
                analisi=[{"tipo": "statica", "casi": ["Z1"], "legami": "fibre"}])
    testo = _testo(m, ["Z1"], tmp_path)
    assert "foreach alg {Newton ModifiedNewton KrylovNewton}" in testo
    assert "algorithm ModifiedNewton -initial" in testo
    assert f"for {{set giro 0}} {{$giro <= {_deck.DIMEZZAMENTI}}}" in testo
    assert "set d [expr {$d / 2.0}]" in testo
    assert f"{_deck.MARCA_PASSO}: caso Z1 passo $passo algoritmo $usato" in testo
    assert "è caduto al passo $passo, fattore" in testo
    assert "algorithm Linear" not in testo  # il blocco lineare non resta di fianco a quello a passi


# --- fix round 1: C2, C3, C5, C6, C7 ---

def test_il_test_di_convergenza_delle_fibre_e_relativo(tmp_path):
    """C2: 1e-6 **mm** è un incremento che un modello rigido non raggiunge, e la norma assoluta
    chiuderebbe alla prima iterazione senza che Newton abbia corretto niente."""
    m = _carica("trave_appoggiata.nova.json",
                analisi=[{"tipo": "statica", "casi": ["Z1"], "legami": "fibre"}])
    testo = _testo(m, ["Z1"], tmp_path)
    assert "test RelativeNormDispIncr 1e-06 50" in testo
    assert "NormDispIncr 1e-06" not in testo.replace("RelativeNormDispIncr", "")


def test_il_ciclo_a_passi_ha_un_tetto_ai_giri(tmp_path):
    """C3: il passo riparte pieno dopo ogni dimezzamento riuscito, quindi il `while` da solo
    può girare 64 volte per passo dichiarato. Senza tetto l'unico freno è il timeout della
    corsa, che non dice **perché** si è fermata."""
    m = _carica("trave_appoggiata.nova.json",
                analisi=[{"tipo": "statica", "casi": ["Z1"], "legami": "fibre", "passi": 4}])
    testo = _testo(m, ["Z1"], tmp_path)
    assert f"if {{$passo > {_deck.GIRI_PER_PASSO * 4}}}" in testo
    assert "non converge, $passo giri contro 4 passi dichiarati" in testo


def test_una_patch_sola_guarda_i_parametri_e_non_il_commento(tmp_path):
    """C5: `righe_tcl` appende classe, veste e articolo. Due legami con gli stessi numeri e
    articoli diversi sono un materiale solo, e il confronto sulla riga formattata li
    scriverebbe due volte — due `patch rect` dello stesso calcestruzzo."""
    from nova import legami
    a = {"tipo": "concrete02", "fpc": -33.0, "epsc0": -0.002, "fpcu": -6.6, "epsU": -0.0035,
         "lambda": 0.1, "ft": 2.5, "Ets": 1250.0, "classe": "C25/30", "veste": "media",
         "articolo": "[11.2.2]"}
    assert legami.stesso_legame(a, a | {"articolo": "[4.1.8]", "veste": "caratteristica"})
    assert not legami.stesso_legame(a, a | {"fpc": -34.0})
    assert not legami.stesso_legame(a, {**a, "tipo": "concrete04"})


def test_la_patch_unica_registra_fibre_di_copriferro_e_non_di_nucleo(tmp_path):
    """C6: la patch unica **è** il copriferro. Chiamare «nucleo» le sue fibre estreme direbbe
    a Task 3 di leggerle con le soglie del confinato, che lì non c'è."""
    dati = leggi_fixture("trave_appoggiata.nova.json")
    dati["analisi"] = [{"tipo": "statica", "casi": ["Z1"], "legami": "fibre"}]
    del dati["sezioni"][0]["staffe"]
    m = _modello.assicura_peso_proprio(_modello.carica(dati))
    (fibre,) = _deck.scrivi(m, ["Z1"], tmp_path).fibre_registrate.values()
    assert {f["ruolo"] for f in fibre} == {"copriferro"}
    assert {(f["y"], f["z"]) for f in fibre} == {(-150.0, -250.0), (150.0, -250.0),
                                                 (150.0, 250.0), (-150.0, 250.0)}


def test_la_riduzione_dentro_il_copriferro_lascia_il_nucleo_nominale(tmp_path):
    """F1(a): la gabbia delle staffe non si sposta quando si toglie calcestruzzo da una faccia.

    Il nucleo resta il rettangolo **nominale** dove stanno barre e staffe, l'`α` resta quello
    nominale, e le fasce di copriferro sono quel che avanza fra nucleo e contorno ridotto.
    Il round 1 ricentrava il nucleo sul contorno e lasciava barre e gabbia dov'erano: su questa
    stessa sezione finivano fuori dalla patch di nucleo 4 barre su 6, con `α` 0,117 su un
    rettangolo che il `.tcl` non disegnava.
    """
    dati = leggi_fixture("trave_appoggiata.nova.json")
    dati["analisi"] = [{"tipo": "statica", "casi": ["Z1"], "legami": "fibre"}]
    dati["sezioni"][0]["riduzione"] = {"sup": 30, "inf": 0, "sx": 30, "dx": 0}
    m = _modello.assicura_peso_proprio(_modello.carica(dati))
    d = _deck.scrivi(m, ["Z1"], tmp_path)
    patch = [[float(x) for x in r.split()[5:]]
             for r in d.percorso.read_text(encoding="utf-8").splitlines()
             if r.strip().startswith("patch rect")]
    assert len(patch) == 5
    assert patch[0] == pytest.approx([-116.0, -216.0, 116.0, 216.0])  # nominale, centrato su 0
    assert d.materiali["2"]["nucleo"]["alpha"] == pytest.approx(0.209387, abs=1e-5)  # nominale
    # ogni barra sta dentro il rettangolo di nucleo **scritto nel .tcl**, non in uno teorico
    yc0, zc0, yc1, zc1 = patch[0]
    for b in _deck._barre(m.sezione(2), False):
        assert yc0 <= b.y <= yc1 and zc0 <= b.z <= zc1, b
    # le quattro fasce coprono esattamente quel che resta: Σ aree = area del contorno
    area = lambda r: (r[2] - r[0]) * (r[3] - r[1])
    contorno = (-150.0 + 30, -250.0, 150.0, 250.0 - 30)
    assert sum(area(r) for r in patch) == pytest.approx(area(contorno))


def test_la_riduzione_tangente_al_nucleo_omette_la_fascia_a_spessore_zero(tmp_path):
    """Riduzione su un lato **esattamente** pari a `copriferro + φ_st/2` = 34 mm: il contorno
    tocca il nucleo senza tagliarlo. Due patch, e la fascia di quel lato non si scrive — una
    `patch rect` di area nulla è una riga che non aggiunge una fibra."""
    dati = leggi_fixture("trave_appoggiata.nova.json")
    dati["analisi"] = [{"tipo": "statica", "casi": ["Z1"], "legami": "fibre"}]
    dati["sezioni"][0]["riduzione"] = {"sup": 34, "inf": 0, "sx": 0, "dx": 0}
    m = _modello.assicura_peso_proprio(_modello.carica(dati))
    d = _deck.scrivi(m, ["Z1"], tmp_path)
    patch = [[float(x) for x in r.split()[5:]]
             for r in d.percorso.read_text(encoding="utf-8").splitlines()
             if r.strip().startswith("patch rect")]
    assert len(patch) == 4  # nucleo + tre fasce: quella sopra ha spessore zero
    assert patch[0] == pytest.approx([-116.0, -216.0, 116.0, 216.0])
    area = lambda r: (r[2] - r[0]) * (r[3] - r[1])
    assert sum(area(r) for r in patch) == pytest.approx(300.0 * (500.0 - 34))


def test_la_riduzione_a_zero_e_identica_a_nessuna_riduzione(tmp_path):
    """Byte per byte: una riduzione dichiarata tutta a zero non è una sezione diversa."""
    dati = leggi_fixture("trave_appoggiata.nova.json")
    dati["analisi"] = [{"tipo": "statica", "casi": ["Z1"], "legami": "fibre"}]
    senza = _testo(_modello.assicura_peso_proprio(_modello.carica(dati)), ["Z1"], tmp_path / "a")
    dati["sezioni"][0]["riduzione"] = {"sup": 0, "inf": 0, "sx": 0, "dx": 0}
    con = _testo(_modello.assicura_peso_proprio(_modello.carica(dati)), ["Z1"], tmp_path / "b")
    assert con == senza


def test_la_riduzione_che_entra_nel_nucleo_toglie_il_confinamento(tmp_path):
    """F1(b): il contorno ridotto taglia il nucleo nominale. Una patch sola di copriferro sul
    contorno, nessun `Concrete02` confinato, e l'avviso che lo dice."""
    from nova import legami
    dati = leggi_fixture("trave_appoggiata.nova.json")
    dati["analisi"] = [{"tipo": "statica", "casi": ["Z1"], "legami": "fibre"}]
    dati["sezioni"][0]["riduzione"] = {"sup": 40, "inf": 40, "sx": 40, "dx": 40}
    m = _modello.assicura_peso_proprio(_modello.carica(dati))
    d = _deck.scrivi(m, ["Z1"], tmp_path)
    righe = d.percorso.read_text(encoding="utf-8").splitlines()
    patch = [r for r in righe if r.strip().startswith("patch rect")]
    assert len(patch) == 1
    assert [float(x) for x in patch[0].split()[5:]] == pytest.approx([-110.0, -210.0, 110.0, 210.0])
    assert len([r for r in righe if r.startswith("uniaxialMaterial Concrete02")]) == 1
    assert d.materiali["2"]["nucleo"]["confinamento"] == "nessuno"
    assert d.materiali["2"]["nucleo"]["alpha"] == 0.0
    assert legami.AVVISO_RIDUZIONE in d.resoconto["avvisi"]


def test_la_riduzione_che_lascia_una_barra_fuori_e_un_rifiuto_che_nomina_la_sezione(tmp_path):
    """F1(c): una barra nel vuoto è un modello sbagliato, non una patch da aggiustare."""
    dati = leggi_fixture("trave_appoggiata.nova.json")
    dati["analisi"] = [{"tipo": "statica", "casi": ["Z1"], "legami": "fibre"}]
    dati["sezioni"][0]["riduzione"] = {"sup": 60, "inf": 60, "sx": 40, "dx": 40}
    m = _modello.assicura_peso_proprio(_modello.carica(dati))
    with pytest.raises(ValueError, match=r"sezione 2 «30×50 3\+3Ø16».*barre.*fuori dal calcestruzzo"):
        _deck.scrivi(m, ["Z1"], tmp_path)


def test_senza_staffe_e_una_patch_anche_con_epsU_nucleo_dichiarato(tmp_path):
    """F3: senza staffe il nucleo non esiste per definizione, e `_nucleo` ci si schiantava
    (`AttributeError` su `staffe.diametro`) perché `epsU_nucleo` rendeva i due legami diversi
    e `una_patch` diceva di no. `epsU_nucleo` si ignora, e la nota lo dichiara."""
    dati = leggi_fixture("trave_appoggiata.nova.json")
    dati["analisi"] = [{"tipo": "statica", "casi": ["Z1"], "legami": "fibre"}]
    dati["materiali"][0]["legame"] = {"epsU_nucleo": 0.01}
    del dati["sezioni"][0]["staffe"]
    m = _modello.assicura_peso_proprio(_modello.carica(dati))
    d = _deck.scrivi(m, ["Z1"], tmp_path)
    righe = d.percorso.read_text(encoding="utf-8").splitlines()
    assert len([r for r in righe if r.strip().startswith("patch rect")]) == 1
    assert len([r for r in righe if r.startswith("uniaxialMaterial")]) == 1
    assert d.materiali["2"]["nucleo"]["epsU"] == pytest.approx(-0.0035)  # quello del copriferro
    assert any("epsU_nucleo" in n and "ignorato" in n for n in d.resoconto["note"]), d.resoconto["note"]


def test_senza_staffe_e_senza_barre_non_dice_niente_su_epsU_nucleo(tmp_path):
    """La nota parla solo se c'è qualcosa da dichiarare: `epsU_nucleo` non dichiarato,
    nessuna riga in più nel resoconto."""
    dati = leggi_fixture("trave_appoggiata.nova.json")
    dati["analisi"] = [{"tipo": "statica", "casi": ["Z1"], "legami": "fibre"}]
    del dati["sezioni"][0]["staffe"]
    dati["sezioni"][0]["file"] = []
    m = _modello.assicura_peso_proprio(_modello.carica(dati))
    d = _deck.scrivi(m, ["Z1"], tmp_path)
    assert len([r for r in d.percorso.read_text(encoding="utf-8").splitlines()
                if r.strip().startswith("patch rect")]) == 1
    assert not any("epsU_nucleo" in n for n in d.resoconto["note"]), d.resoconto["note"]


def test_il_confinamento_nessuno_con_copriferro_grosso_e_un_rifiuto_e_non_una_patch_rovesciata(tmp_path):
    """F2: `confinamento: nessuno` più `epsU_nucleo` non passa da `confinamento_ntc`, quindi la
    guardia che stava solo là non scattava e il `.tcl` portava una `patch rect` con `y0 > y1`
    — che OpenSees accetta senza fiatare. La guardia è tornata in `_nucleo`, per cui si passa
    sempre."""
    dati = leggi_fixture("trave_appoggiata.nova.json")
    dati["analisi"] = [{"tipo": "statica", "casi": ["Z1"], "legami": "fibre"}]
    dati["materiali"][0]["legame"] = {"confinamento": "nessuno", "epsU_nucleo": 0.01}
    dati["sezioni"][0] |= {"copriferro": 150, "file": []}
    m = _modello.assicura_peso_proprio(_modello.carica(dati))
    with pytest.raises(ValueError, match=r"sezione 2 «30×50 3\+3Ø16».*non lasciano nucleo"):
        _deck.scrivi(m, ["Z1"], tmp_path)
