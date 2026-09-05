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
