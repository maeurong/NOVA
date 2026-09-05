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


def test_la_sezione_confinata_registra_anche_le_quattro_fibre_di_copriferro(tmp_path):
    """Il copriferro schiaccia **per primo**: `epsU` = 0,35 % contro la `ε_cu2,c` della [4.1.11],
    che sulla 30×50 del telaio vale il triplo. Registrare il solo nucleo dava «elastica» a una
    sezione col copriferro già espulso, e la soglia che `passi._stato` promette non aveva una
    fibra su cui applicarsi."""
    m = _carica("trave_appoggiata.nova.json",
                analisi=[{"tipo": "statica", "casi": ["Z1"], "legami": "fibre"}])
    d = _deck.scrivi(m, ["Z1"], tmp_path)
    (fibre,) = d.fibre_registrate.values()
    copriferro = [f for f in fibre if f["ruolo"] == "copriferro"]
    assert {(f["y"], f["z"]) for f in copriferro} == {(-150.0, -250.0), (150.0, -250.0),
                                                      (150.0, 250.0), (-150.0, 250.0)}
    assert {f["mat"] for f in copriferro} == {2}  # secondo tag della terna nucleo, copriferro, acciaio
    assert len([f for f in fibre if f["ruolo"] == "nucleo"]) == 4
    assert d.materiali["2"]["copriferro"]["epsU"] == -0.0035
    assert d.materiali["2"]["nucleo"]["epsU"] < -0.0035  # ε_cu2,c > 0,35 %: il nucleo tiene di più


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


# --- fix round 3: R1 (avviso solo se il confinamento c'era) e R2 (guardia in un punto solo) ---

def _con_riduzione(rid=None, **legame):
    dati = leggi_fixture("trave_appoggiata.nova.json")
    dati["analisi"] = [{"tipo": "statica", "casi": ["Z1"], "legami": "fibre"}]
    if rid is not None:
        dati["sezioni"][0]["riduzione"] = rid
    if legame:
        dati["materiali"][0]["legame"] = legame
    return _modello.assicura_peso_proprio(_modello.carica(dati))


def test_il_confinamento_gia_escluso_non_avvisa_di_averlo_perso(tmp_path):
    """R1: l'avviso dice «hai perso il confinamento». Con `confinamento: nessuno` non c'era
    niente da perdere — il `.tcl` è identico con e senza riduzione — e un avviso su una riga
    che non cambia insegna a non leggere gli avvisi."""
    d = _deck.scrivi(_con_riduzione({"sup": 40, "inf": 0, "sx": 0, "dx": 0},
                                    confinamento="nessuno"), ["Z1"], tmp_path)
    assert d.resoconto["avvisi"] == []
    assert d.materiali["2"]["nucleo"]["confinamento"] == "nessuno"


def test_il_confinamento_escluso_senza_riduzione_non_dice_niente(tmp_path):
    d = _deck.scrivi(_con_riduzione(confinamento="nessuno"), ["Z1"], tmp_path)
    assert d.resoconto["avvisi"] == [] and d.resoconto["note"] == []


def test_il_confinamento_ntc_perso_per_riduzione_avvisa_ancora(tmp_path):
    """Il rovescio della medaglia: dove il confinamento c'era, l'avviso resta."""
    from nova import legami
    d = _deck.scrivi(_con_riduzione({"sup": 40, "inf": 0, "sx": 0, "dx": 0}), ["Z1"], tmp_path)
    assert d.resoconto["avvisi"] == [legami.AVVISO_RIDUZIONE]


def test_anche_il_deck_elastico_rifiuta_le_barre_fuori_dal_calcestruzzo(tmp_path):
    """R2: la `riduzione` non guarda il legame, e la guardia nemmeno. Prima stava nel solo ramo
    a fibre: in elastico una 300×500 con `riduzione {sup: 249}` scriveva tre `fiber` a 203 mm
    **sopra** la patch di calcestruzzo, e la corsa usciva `esito: ok`."""
    dati = leggi_fixture("trave_appoggiata.nova.json")
    dati["sezioni"][0]["riduzione"] = {"sup": 249, "inf": 0, "sx": 0, "dx": 0}
    m = _modello.assicura_peso_proprio(_modello.carica(dati))
    with pytest.raises(ValueError, match=r"sezione 2 «30×50 3\+3Ø16».*3 barre su 6 fuori dal calcestruzzo"):
        _deck.scrivi(m, ["Z1"], tmp_path)


def test_la_riduzione_a_zero_in_elastico_e_identica_a_nessuna_riduzione(tmp_path):
    dati = leggi_fixture("trave_appoggiata.nova.json")
    senza = _testo(_modello.assicura_peso_proprio(_modello.carica(dati)), ["Z1"], tmp_path / "a")
    dati["sezioni"][0]["riduzione"] = {"sup": 0, "inf": 0, "sx": 0, "dx": 0}
    con = _testo(_modello.assicura_peso_proprio(_modello.carica(dati)), ["Z1"], tmp_path / "b")
    assert con == senza


# --- T4 Task 3: la pushover, il deck senza binario ---

def _con_pushover(nome="telaio_2x1.nova.json", statica=True, modale=False, **campi):
    """Il telaio con una statica a fibre e una pushover: la pushover **richiede** le fibre."""
    dati = leggi_fixture(nome)
    analisi = []
    if statica:
        analisi.append({"tipo": "statica", "casi": ["Z1"], "legami": "fibre", "passi": 4})
    if modale:
        analisi.append({"tipo": "modale", "modi": 1})
    analisi.append({"tipo": "pushover", "distribuzione": "uniforme", "nodo_controllo": 4,
                    "dof": "ux", "incremento": 1.0, "spostamento_max": 60.0} | campi)
    dati["analisi"] = analisi
    return _modello.assicura_peso_proprio(_modello.carica(dati))


def test_la_pushover_scrive_displacement_control_la_scala_e_gli_otto_dimezzamenti(tmp_path):
    testo = _testo(_con_pushover(caso_gravita="Z3"), ["Z1", "Z3"], tmp_path)
    assert "integrator DisplacementControl 4 1 $_nova_d" in testo
    assert f"foreach alg {{{' '.join(_deck.SCALA_ALGORITMI)}}}" in testo
    assert f"$_nova_giro <= {_deck.DIMEZZAMENTI_PUSHOVER}" in testo and _deck.DIMEZZAMENTI_PUSHOVER == 8
    assert "algorithm ModifiedNewton -initial" in testo
    # la caduta si dichiara e **non** ferma la corsa: la curva fino a lì vale
    dopo = testo.split(_deck.MARCA_CADUTA, 1)[1].split("# ===== pushover")[0]
    assert "exit 1" not in dopo
    assert _deck.MARCA_PASSO_PUSHOVER in testo


def test_la_pushover_ripristina_il_passo_pieno_dopo_un_dimezzamento(tmp_path):
    """Il dimezzamento è del passo di turno, non dell'incremento dichiarato: `_nova_d` non si
    tocca mai, si dimezza `_nova_dp`, che riparte pieno a ogni giro del `while`."""
    testo = _testo(_con_pushover(), ["Z1", "Z3"], tmp_path)
    assert "set _nova_dp $_nova_d" in testo
    assert "set _nova_dp [expr {$_nova_dp / 2.0}]" in testo
    assert "set _nova_d [expr" not in testo  # l'incremento dichiarato resta quello


def test_la_pushover_uniforme_carica_i_soli_nodi_liberi_in_proporzione_alla_massa(tmp_path):
    """`uniforme` = forze ∝ massa lumped del deck lungo `dof`, normalizzate a Σ|F| = 1.

    I nodi bloccati nella direzione di spinta restano fuori: una `load` su un dof `fix` finisce
    dentro la reazione di quel nodo, e `taglio_base = −Σ reazioni` non sarebbe più il taglio.
    """
    testo = _testo(_con_pushover(), ["Z1", "Z3"], tmp_path)
    blocco = testo.split("# ===== pushover")[1]
    carichi = [r.split() for r in blocco.splitlines() if r.strip().startswith("load ")]
    assert {int(r[1]) for r in carichi} == {4, 5, 6}  # 1, 2, 3 sono incastrati
    assert sum(float(r[2]) for r in carichi) == pytest.approx(1.0)
    assert all(float(x) == 0.0 for r in carichi for x in r[3:])
    # ogni nodo porta metà delle travi che tocca: il 5 le tocca tutte e due, il 4 la campata
    # da 5000 e il 6 quella da 4000 — le luci del telaio 2×1 non sono uguali
    q = {int(r[1]): float(r[2]) for r in carichi}
    assert q[5] > q[4] > q[6]


def test_la_pushover_nodale_scrive_le_forze_dichiarate(tmp_path):
    m = _con_pushover(distribuzione="nodale",
                      forze_nodali=[{"nodo": 4, "fx": 1000.0}, {"nodo": 5, "fx": 2000.0}])
    blocco = _testo(m, ["Z1", "Z3"], tmp_path).split("# ===== pushover")[1]
    carichi = [r.split() for r in blocco.splitlines() if r.strip().startswith("load ")]
    assert [(int(r[1]), float(r[2])) for r in carichi] == [(4, 1000.0), (5, 2000.0)]


def test_la_pushover_modo1_legge_l_autovettore_nel_tcl(tmp_path):
    """φ₁ lo sa OpenSees dopo `eigen`, non NOVA prima di scrivere: la distribuzione si compone
    nel `.tcl` con `nodeEigenvector`, e il blocco sta **dopo** il passo modale."""
    testo = _testo(_con_pushover(distribuzione="modo1", modale=True), ["Z1", "Z3"], tmp_path)
    assert "nodeEigenvector $n 1 1" in testo
    assert testo.index("eigen -fullGenLapack") < testo.index("# ===== pushover")


def test_la_pushover_modo1_senza_modale_e_un_rifiuto_del_deck(tmp_path):
    """Il Check Model lo dice per primo, ma con «forza» il deck ci arriva lo stesso: senza
    `eigen`, `nodeEigenvector` è un errore Tcl a metà corsa invece di un rifiuto."""
    m = _con_pushover(distribuzione="modo1", modale=False)
    with pytest.raises(ValueError, match="modo1.*analisi modale"):
        _deck.scrivi(m, ["Z1", "Z3"], tmp_path)


def test_la_pushover_tiene_la_gravita_con_loadconst(tmp_path):
    testo = _testo(_con_pushover(caso_gravita="Z3"), ["Z1"], tmp_path)
    blocco = testo.split("# ===== pushover")[1]
    assert "loadConst -time 0.0" in blocco
    # la gravità è un pattern suo dentro il blocco: i casi statici finiscono con `reset`
    assert blocco.index("eleLoad") < blocco.index("loadConst -time 0.0")
    assert blocco.index("loadConst -time 0.0") < blocco.index("DisplacementControl")


def test_la_pushover_senza_gravita_non_scrive_loadconst(tmp_path):
    assert "loadConst" not in _testo(_con_pushover(), ["Z1", "Z3"], tmp_path)


def test_i_recorder_delle_fibre_sono_uno_per_fibra_e_raggruppati_per_sezione(tmp_path):
    """Misurato il 05/09/2026, OpenSees 3.8.0: un secondo `fiber … stressStrain` nello stesso
    `recorder` è **ignorato in silenzio** — il file esce identico a quello con una fibra sola.
    Quindi un recorder per fibra, e `-ele` con i soli elementi di quel tag di sezione."""
    d = _deck.scrivi(_con_pushover(), ["Z1", "Z3"], tmp_path)
    righe = [r.split() for r in d.percorso.read_text(encoding="utf-8").splitlines()
             if "_fibre" not in r and "stressStrain" in r and "push_" in r]
    # 11 fibre per tag: 4 spigoli di contorno (copriferro), 4 di nucleo, 3 barre estreme
    atteso = sum(len(f) for f in d.fibre_registrate.values()) * _deck.STAZIONI
    assert len(righe) == atteso == 2 * 11 * 5
    assert all(r.count("fiber") == 1 for r in righe)
    # tag 1 = sezione 1 in piedi (i tre pilastri), tag 2 = sezione 2 coricata (le due travi)
    per_file = {r[r.index("-file") + 1]: r for r in righe}
    ele = lambda nome: per_file[nome][per_file[nome].index("-ele") + 1:per_file[nome].index("section")]
    assert ele("push_sez1_st1_f0.out") == ["1", "2", "3"]
    assert ele("push_sez2_st1_f0.out") == ["4", "5"]
    assert "-time" in per_file["push_sez1_st1_f0.out"]


def test_la_statica_a_fibre_registra_le_fibre_per_lo_stato_delle_sezioni(tmp_path):
    """Task 2 aveva rinviato qui i recorder: senza, `per_caso[caso].stato_sezioni` non esiste."""
    d = _deck.scrivi(_con_pushover(), ["Z1", "Z3"], tmp_path)
    testo = d.percorso.read_text(encoding="utf-8")
    assert "recorder Element -file Z1_sez1_st1_f0.out" in testo
    # senza fibre non c'è niente da registrare: il ramo elastico resta com'era
    elastico = _testo(_carica("telaio_2x1.nova.json"), ["Z1"], tmp_path / "e")
    assert "stressStrain" not in elastico


def test_l_incremento_non_positivo_e_un_rifiuto_del_modello():
    for campo, valore in (("incremento", 0.0), ("incremento", -1.0), ("spostamento_max", 0.0)):
        with pytest.raises(ValueError, match=campo):
            _con_pushover(**{campo: valore})


# --- C1: quel che la pushover chiede al modello ---

def _riferimenti(m) -> dict:
    from nova import check
    return next(v for v in check.check_model(m) if v["controllo"] == "riferimenti")


def test_la_pushover_ben_posta_passa_i_riferimenti():
    assert _riferimenti(_con_pushover(caso_gravita="Z3"))["esito"] == "passato"


def test_il_nodo_di_controllo_inesistente_e_un_riferimento_rotto():
    v = _riferimenti(_con_pushover(nodo_controllo=99))
    assert v["esito"] == "non_passato" and {"analisi": "pushover", "nodo_controllo": 99} in v["oggetto"]


def test_il_nodo_di_controllo_vincolato_nella_direzione_di_spinta_e_un_rosso():
    v = _riferimenti(_con_pushover(nodo_controllo=1))  # il nodo 1 è incastrato
    assert v["esito"] == "non_passato"
    assert "il nodo di controllo è vincolato in ux" in v["ragione"]


def test_la_distribuzione_modo1_senza_modale_e_un_rosso():
    v = _riferimenti(_con_pushover(distribuzione="modo1", modale=False))
    assert v["esito"] == "non_passato"
    assert "la distribuzione modo1 richiede l'analisi modale" in v["ragione"]


def test_la_distribuzione_nodale_senza_forze_e_un_rosso():
    v = _riferimenti(_con_pushover(distribuzione="nodale"))
    assert v["esito"] == "non_passato" and "forze_nodali" in v["ragione"]


def test_il_caso_di_gravita_inesistente_e_un_riferimento_rotto():
    v = _riferimenti(_con_pushover(caso_gravita="Z9"))
    assert v["esito"] == "non_passato"
    assert {"analisi": "pushover", "caso_gravita": "Z9"} in v["oggetto"]


def test_la_pushover_senza_una_statica_a_fibre_e_un_rosso():
    """La pushover **è** un'analisi a fibre: senza una statica dichiarata «legami: fibre» il
    deck scriverebbe sezioni elastiche, e la curva sarebbe una retta con un nome non lineare."""
    v = _riferimenti(_con_pushover(statica=False))
    assert v["esito"] == "non_passato"
    assert "la pushover richiede sezioni a fibre" in v["ragione"]
