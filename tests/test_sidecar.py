"""Cucitura principale: una riga JSON dentro, righe JSON fuori."""
import io
import json
import math

import pytest

from conftest import leggi_fixture


def test_fine_risponde_ciao(chiedi):
    (risposte,) = chiedi({"id": 1, "comando": "fine"})
    assert risposte[-1] == {"id": 1, "esito": "ciao"}


def test_comando_sconosciuto_non_uccide_il_sidecar(chiedi):
    prima, dopo = chiedi({"id": 1, "comando": "boh"}, {"id": 2, "comando": "fine"})
    assert prima[-1]["esito"] == "errore"
    assert "boh" in prima[-1]["motivo"]
    assert dopo[-1]["esito"] == "ciao"


def test_riga_non_json_risponde_errore_e_continua(chiedi):
    from nova import sidecar
    uscita = io.StringIO()
    sidecar.servi(io.StringIO('{non json\n{"id": 2, "comando": "fine"}\n'), uscita)
    righe = [json.loads(r) for r in uscita.getvalue().splitlines()]
    assert righe[0]["esito"] == "errore" and righe[0]["id"] is None
    assert righe[1] == {"id": 2, "esito": "ciao"}


def test_check_rifiuta_un_campo_sconosciuto_con_il_suo_nome(chiedi):
    m = leggi_fixture("telaio_2x1.nova.json")
    m["nodi"][0]["colore"] = "rosso"
    (risposte,) = chiedi({"id": 1, "comando": "check", "modello": m})
    assert risposte[-1]["esito"] == "errore"
    assert risposte[-1]["fase"] == "modello"
    assert "colore" in risposte[-1]["motivo"]


def test_check_rifiuta_unita_diverse(chiedi):
    m = leggi_fixture("telaio_2x1.nova.json")
    m["unita"] = "m-kN"
    (risposte,) = chiedi({"id": 1, "comando": "check", "modello": m})
    assert risposte[-1]["esito"] == "errore" and risposte[-1]["fase"] == "modello"


def test_impronta_stabile_e_sensibile():
    from nova.modello import carica, impronta
    a = carica(leggi_fixture("telaio_2x1.nova.json"))
    b = carica(leggi_fixture("telaio_2x1.nova.json"))
    assert impronta(a) == impronta(b)
    b.nodi[0].x += 1.0
    assert impronta(a) != impronta(b)


def test_il_peso_proprio_e_generato_una_volta_sola():
    from nova.modello import assicura_peso_proprio, carica
    m = carica(leggi_fixture("telaio_2x1.nova.json"))
    m = assicura_peso_proprio(assicura_peso_proprio(m))
    generate = [a for a in m.azioni if a.generata]
    assert len(generate) == 1 and generate[0].natura == "G1"
    assert generate[0].carichi[0].tipo == "gravita" and generate[0].carichi[0].fattore_z == -1.0


def test_catalogo_c25_30_da_i_valori_ntc():
    from nova.catalogo import valori
    from nova.modello import Materiale
    v = valori(Materiale(id=1, nome="cls", tipo="calcestruzzo", classe="C25/30"))
    assert v["fck"] == 25.0 and 31000 < v["E"] < 32000 and v["densita"] == 2.5493e-9


def test_catalogo_personalizzato_vince_sulla_classe():
    from nova.catalogo import valori
    from nova.modello import Materiale
    v = valori(Materiale(id=1, nome="cls", tipo="calcestruzzo", classe="C25/30",
                         personalizzato=True, valori={"E": 20000.0}))
    assert v["E"] == 20000.0 and v["fck"] == 25.0


# --- Ingressi degeneri non coperti dai test sopra --------------------------


def test_riga_vuota_ignorata_nessuna_risposta():
    from nova import sidecar
    uscita = io.StringIO()
    sidecar.servi(io.StringIO('\n   \n{"id": 1, "comando": "fine"}\n'), uscita)
    righe = [json.loads(r) for r in uscita.getvalue().splitlines()]
    assert righe == [{"id": 1, "esito": "ciao"}]


@pytest.mark.parametrize("corpo", ["[1, 2]", '"ciao"', "42"])
def test_riga_json_non_oggetto_risponde_errore_protocollo(corpo):
    from nova import sidecar
    uscita = io.StringIO()
    sidecar.servi(io.StringIO(corpo + "\n"), uscita)
    riga = json.loads(uscita.getvalue().splitlines()[0])
    assert riga["esito"] == "errore" and riga["fase"] == "protocollo" and riga["id"] is None
    assert riga["motivo"] == "la richiesta deve essere un oggetto JSON"


def test_richiesta_senza_id_risponde_id_null():
    from nova import sidecar
    uscita = io.StringIO()
    sidecar.servi(io.StringIO('{"comando": "fine"}\n'), uscita)
    riga = json.loads(uscita.getvalue().splitlines()[0])
    assert riga["id"] is None and riga["esito"] == "ciao"


def test_comando_sconosciuto_nomina_i_cinque_comandi(chiedi):
    (risposte,) = chiedi({"id": 1, "comando": "boh"})
    motivo = risposte[-1]["motivo"]
    for nome in ("verifica", "check", "deck", "corsa", "fine"):
        assert nome in motivo


def test_eof_senza_fine_non_solleva():
    from nova import sidecar
    uscita = io.StringIO()
    # nessuna richiesta "fine": se servi() sollevasse, il test fallirebbe qui
    sidecar.servi(io.StringIO('{"id": 1, "comando": "check", "modello": null}\n'), uscita)
    assert json.loads(uscita.getvalue().splitlines()[0])["esito"] == "errore"


def test_check_modello_assente_o_null(chiedi):
    (risposte,) = chiedi({"id": 1, "comando": "check", "modello": None})
    assert risposte[-1] == {"id": 1, "esito": "errore", "fase": "modello",
                             "motivo": "il modello deve essere un oggetto JSON"}


def test_check_modello_vuoto_e_ora_rifiutato_dal_check_model(chiedi):
    # Task 2 stubbava comando_check a "ok" sempre; Task 3 introduce i controlli veri
    # e un modello senza nodi/aste non ha massa ne' vincoli: deve essere rifiutato.
    m = {"schema_version": 1, "unita": "mm-N-MPa-t-s"}
    (risposte,) = chiedi({"id": 1, "comando": "check", "modello": m})
    assert risposte[-1]["esito"] == "rifiutato"


def test_schema_version_assente_e_trattata_come_1():
    from nova.modello import carica
    d = leggi_fixture("telaio_2x1.nova.json")
    del d["schema_version"]
    assert carica(d).schema_version == 1


def test_schema_version_maggiore_rifiutata_esplicitamente():
    from nova.modello import carica
    d = leggi_fixture("telaio_2x1.nova.json")
    d["schema_version"] = 2
    with pytest.raises(ValueError, match="2"):
        carica(d)


def test_nan_e_infinity_rifiutati():
    from nova.modello import carica
    d = leggi_fixture("telaio_2x1.nova.json")
    d["nodi"][0]["x"] = math.nan
    with pytest.raises(ValueError):
        carica(d)
    d2 = leggi_fixture("telaio_2x1.nova.json")
    d2["nodi"][0]["x"] = math.inf
    with pytest.raises(ValueError):
        carica(d2)


def test_azione_q_senza_categoria_nomina_lazione():
    from nova.modello import carica
    d = leggi_fixture("telaio_2x1.nova.json")
    del d["azioni"][1]["categoria"]
    with pytest.raises(ValueError, match="spinta in testa"):
        carica(d)


def test_materiale_classe_ignota_nomina_classe_e_catalogo():
    from nova.modello import carica
    d = leggi_fixture("telaio_2x1.nova.json")
    d["materiali"][0]["classe"] = "C99/99"
    with pytest.raises(ValueError, match="C99/99"):
        carica(d)


@pytest.mark.parametrize("chiave, tipo", [
    ("nodi", "nodo"), ("aste", "asta"), ("sezioni", "sezione"),
    ("materiali", "materiale"), ("azioni", "azione"), ("combinazioni", "combinazione"),
], ids=["nodo", "asta", "sezione", "materiale", "azione", "combinazione"])
def test_id_duplicato_e_rifiutato_in_fase_modello(chiedi, chiave, tipo):
    m = leggi_fixture("telaio_2x1.nova.json")
    m[chiave].append(dict(m[chiave][0]))  # stesso id del primo elemento della lista: id riusato
    (r,) = chiedi({"id": 1, "comando": "check", "modello": m})
    assert r[-1]["esito"] == "errore" and r[-1]["fase"] == "modello"
    assert tipo in r[-1]["motivo"] and str(m[chiave][0]["id"]) in r[-1]["motivo"]


def test_personalizzato_con_valori_vuoti_prende_la_norma():
    from nova.catalogo import valori
    from nova.modello import Materiale
    v = valori(Materiale(id=1, nome="cls", tipo="calcestruzzo", classe="C25/30",
                          personalizzato=True, valori={}))
    assert v["fck"] == 25.0


def test_non_personalizzato_ignora_i_valori_scritti_a_mano():
    from nova.catalogo import valori
    from nova.modello import Materiale
    v = valori(Materiale(id=1, nome="cls", tipo="calcestruzzo", classe="C25/30",
                          personalizzato=False, valori={"E": 1.0}))
    assert v["E"] != 1.0


def test_nuovo_id_azione_non_riusa_il_massimo_dei_contatori():
    from nova.modello import assicura_peso_proprio, carica
    d = leggi_fixture("telaio_2x1.nova.json")
    d["azioni"].append({"id": 5, "nome": "extra", "natura": "G2", "carichi": []})
    d["contatori"]["azione"] = 1
    m = assicura_peso_proprio(carica(d))
    generata = [a for a in m.azioni if a.generata][0]
    assert generata.id == 6


def test_carica_restituisce_modello_e_impronta_senza_peso_proprio():
    from nova import sidecar
    from nova.modello import carica, impronta
    d = leggi_fixture("telaio_2x1.nova.json")
    attesa = impronta(carica(d))  # impronta calcolata sul modello com'è nel file, senza peso proprio
    m, imp = sidecar._carica({"modello": d})
    assert imp == attesa
    assert any(a.generata for a in m.azioni)


def test_impronta_di_carica_stabile_su_chiamate_ripetute():
    from nova import sidecar
    d = leggi_fixture("telaio_2x1.nova.json")
    _, imp1 = sidecar._carica({"modello": d})
    _, imp2 = sidecar._carica({"modello": d})
    assert imp1 == imp2


def test_impronta_invariante_a_ordine_chiavi_e_null_espliciti():
    from nova.modello import carica, impronta
    d = leggi_fixture("telaio_2x1.nova.json")
    a = carica(d)
    n0 = d["nodi"][0]
    riordinato = json.loads(json.dumps(d))
    riordinato["nodi"][0] = {
        "vincolo": n0["vincolo"], "nome": None, "z": n0["z"], "y": n0.get("y", 0),
        "x": n0["x"], "id": n0["id"],
    }
    b = carica(riordinato)
    assert impronta(a) == impronta(b)


# --- Task 3: Check Model (C1) -----------------------------------------------


def _esiti(verdetti):
    return {v["controllo"]: v["esito"] for v in verdetti}


def test_telaio_sano_passa_il_check(chiedi):
    (r,) = chiedi({"id": 1, "comando": "check", "modello": leggi_fixture("telaio_2x1.nova.json")})
    assert r[-1]["esito"] == "ok"
    esiti = _esiti(r[-1]["verdetti"])
    assert esiti["nodi_coincidenti"] == "passato" and esiti["vincoli"] == "passato"
    assert esiti["moti_rigidi"] == "non_applicabile"
    assert set(esiti) >= {"unita", "nodi_coincidenti", "aste_sconnesse", "aste_lunghezza_zero", "aste_duplicate",
                          "nodi_liberi", "nodo_su_asta", "sezione_nulla", "riferimenti", "massa_nulla", "vincoli",
                          "carico_termico", "moti_rigidi"}


def test_asta_a_lunghezza_zero_e_rifiutata(chiedi):
    (r,) = chiedi({"id": 1, "comando": "check", "modello": leggi_fixture("asta_lunghezza_zero.nova.json")})
    assert r[-1]["esito"] == "rifiutato"
    esiti = _esiti(r[-1]["verdetti"])
    assert esiti["aste_lunghezza_zero"] == "non_passato" and esiti["nodi_coincidenti"] == "non_passato"


def test_nodo_libero_e_rifiutato(chiedi):
    (r,) = chiedi({"id": 1, "comando": "check", "modello": leggi_fixture("nodo_libero.nova.json")})
    assert r[-1]["esito"] == "rifiutato"
    assert _esiti(r[-1]["verdetti"])["nodi_liberi"] == "non_passato"


def test_nodi_coincidenti_e_asta_duplicata_sono_rifiutati(chiedi):
    (r,) = chiedi({"id": 1, "comando": "check", "modello": leggi_fixture("nodi_coincidenti.nova.json")})
    esiti = _esiti(r[-1]["verdetti"])
    assert esiti["nodi_coincidenti"] == "non_passato" and esiti["aste_duplicate"] == "non_passato"


def test_nodo_su_asta_chiede_di_spezzare(chiedi):
    m = leggi_fixture("telaio_2x1.nova.json")
    m["nodi"].append({"id": 7, "x": 2500, "y": 0, "z": 3200})
    m["aste"].append({"id": 6, "nodo_i": 7, "nodo_j": 2, "sezione": 1})
    (r,) = chiedi({"id": 1, "comando": "check", "modello": m})
    v = next(v for v in r[-1]["verdetti"] if v["controllo"] == "nodo_su_asta")
    assert v["esito"] == "non_passato" and v["azione"] == "spezza asta" and [7, 4] in v["oggetto"]


def test_carico_termico_e_rifiutato_in_v1(chiedi):
    m = leggi_fixture("telaio_2x1.nova.json")
    m["azioni"][0]["carichi"].append({"tipo": "termico", "asta": 4, "dT_uniforme": 20})
    (r,) = chiedi({"id": 1, "comando": "check", "modello": m})
    v = next(v for v in r[-1]["verdetti"] if v["controllo"] == "carico_termico")
    assert v["esito"] == "non_passato" and v["azione"] == "togli il carico termico"


def test_riferimenti_rotti_sono_sconnessi(chiedi):
    m = leggi_fixture("telaio_2x1.nova.json")
    m["aste"][0]["nodo_j"] = 99
    (r,) = chiedi({"id": 1, "comando": "check", "modello": m})
    assert _esiti(r[-1]["verdetti"])["aste_sconnesse"] == "non_passato"


def test_modello_vuoto_e_rifiutato_senza_eccezioni(chiedi):
    m = {"schema_version": 1, "unita": "mm-N-MPa-t-s"}
    (r,) = chiedi({"id": 1, "comando": "check", "modello": m})
    assert r[-1]["esito"] == "rifiutato"
    esiti = _esiti(r[-1]["verdetti"])
    assert esiti["massa_nulla"] == "non_passato" and esiti["vincoli"] == "non_passato"


# --- Ingressi degeneri non coperti dal blocco sopra -------------------------


def test_aste_sconnesse_nomina_id_non_solleva(chiedi):
    m = leggi_fixture("telaio_2x1.nova.json")
    m["aste"][0]["nodo_j"] = 99
    (r,) = chiedi({"id": 1, "comando": "check", "modello": m})
    v = next(v for v in r[-1]["verdetti"] if v["controllo"] == "aste_sconnesse")
    assert v["esito"] == "non_passato" and v["oggetto"] == [1]


def test_asta_auto_riferita_e_sconnessa_non_lunghezza_zero(chiedi):
    m = leggi_fixture("telaio_2x1.nova.json")
    m["aste"][0]["nodo_j"] = m["aste"][0]["nodo_i"]  # nodo_i == nodo_j: due nodi veri, stesso id
    (r,) = chiedi({"id": 1, "comando": "check", "modello": m})
    esiti = _esiti(r[-1]["verdetti"])
    assert esiti["aste_sconnesse"] == "non_passato"
    assert esiti["aste_lunghezza_zero"] == "passato"  # richiede due nodi distinti, qui non ci sono


def test_tre_nodi_coincidenti_tutte_le_coppie(chiedi):
    m = leggi_fixture("telaio_2x1.nova.json")
    m["nodi"].append({"id": 7, "x": 5000.0002, "y": 0, "z": 3200})  # 0.2 micron da nodo 5
    m["nodi"].append({"id": 8, "x": 5000.0004, "y": 0, "z": 3200})  # 0.4/0.2 micron da 5/7
    m["contatori"]["nodo"] = 8
    (r,) = chiedi({"id": 1, "comando": "check", "modello": m})
    v = next(v for v in r[-1]["verdetti"] if v["controllo"] == "nodi_coincidenti")
    coppie = {frozenset(p) for p in v["oggetto"]}
    assert coppie == {frozenset((5, 7)), frozenset((5, 8)), frozenset((7, 8))}


def test_nodo_a_esattamente_1mm_non_coincidente(chiedi):
    m = leggi_fixture("telaio_2x1.nova.json")
    # esattamente 1.0 mm da nodo 5: la soglia nodi_coincidenti e' "<", non "<=" -> non coincide
    m["nodi"].append({"id": 7, "x": 5001.0, "y": 0, "z": 3200})
    m["contatori"]["nodo"] = 7
    (r,) = chiedi({"id": 1, "comando": "check", "modello": m})
    assert _esiti(r[-1]["verdetti"])["nodi_coincidenti"] == "passato"


def test_aste_duplicate_anche_con_verso_invertito(chiedi):
    m = leggi_fixture("telaio_2x1.nova.json")
    m["aste"].append({"id": 6, "nodo_i": 5, "nodo_j": 4, "sezione": 2})  # asta 4 e' 4->5, questa e' 5->4
    m["contatori"]["asta"] = 6
    (r,) = chiedi({"id": 1, "comando": "check", "modello": m})
    v = next(v for v in r[-1]["verdetti"] if v["controllo"] == "aste_duplicate")
    assert v["esito"] == "non_passato" and [4, 6] in v["oggetto"]


def test_nodo_vicino_a_un_estremo_e_coincidente_non_su_asta(chiedi):
    m = leggi_fixture("telaio_2x1.nova.json")
    m["nodi"].append({"id": 7, "x": 0.5, "y": 0, "z": 3200})  # 0.5 mm da nodo 4, estremo delle aste 1 e 4
    m["contatori"]["nodo"] = 7
    (r,) = chiedi({"id": 1, "comando": "check", "modello": m})
    esiti = _esiti(r[-1]["verdetti"])
    assert esiti["nodi_coincidenti"] == "non_passato"
    assert esiti["nodo_su_asta"] == "passato"  # sull'estremo (t~0): e' coincidenza, non "sull'asta"


def test_nodo_a_1mm_da_asta_e_rifiutato(chiedi):
    m = leggi_fixture("telaio_2x1.nova.json")
    m["nodi"].append({"id": 7, "x": 2500, "y": 1.0, "z": 3200})  # 1.0 mm dall'asse dell'asta 4: soglia inclusiva
    m["contatori"]["nodo"] = 7
    (r,) = chiedi({"id": 1, "comando": "check", "modello": m})
    v = next(v for v in r[-1]["verdetti"] if v["controllo"] == "nodo_su_asta")
    assert v["esito"] == "non_passato" and [7, 4] in v["oggetto"]


def test_nodo_a_2mm_da_asta_passa(chiedi):
    m = leggi_fixture("telaio_2x1.nova.json")
    m["nodi"].append({"id": 7, "x": 2500, "y": 2.0, "z": 3200})  # 2 mm: fuori tolleranza
    m["contatori"]["nodo"] = 7
    (r,) = chiedi({"id": 1, "comando": "check", "modello": m})
    assert _esiti(r[-1]["verdetti"])["nodo_su_asta"] == "passato"


def test_sezione_inesistente_nomina_id(chiedi):
    m = leggi_fixture("telaio_2x1.nova.json")
    m["aste"][0]["sezione"] = 99
    (r,) = chiedi({"id": 1, "comando": "check", "modello": m})
    v = next(v for v in r[-1]["verdetti"] if v["controllo"] == "sezione_nulla")
    assert v["esito"] == "non_passato" and v["oggetto"] == [1]


def test_riferimenti_nomina_sezione_e_materiale(chiedi):
    m = leggi_fixture("telaio_2x1.nova.json")
    m["sezioni"][0]["calcestruzzo"] = 9
    (r,) = chiedi({"id": 1, "comando": "check", "modello": m})
    v = next(v for v in r[-1]["verdetti"] if v["controllo"] == "riferimenti")
    assert v["esito"] == "non_passato" and v["azione"] == "correggi il riferimento"
    assert {"sezione": 1, "calcestruzzo": 9} in v["oggetto"]


@pytest.mark.parametrize("muta", [
    lambda m: m["sezioni"][0].__setitem__("calcestruzzo", 99),
    lambda m: m["sezioni"][0].__setitem__("acciaio", 99),
    lambda m: m["azioni"][1]["carichi"][0].__setitem__("nodo", 99),
    lambda m: m["azioni"][0]["carichi"].append({"tipo": "cedimento", "nodo": 99}),
    lambda m: m["azioni"][0]["carichi"][0].__setitem__("asta", 99),
    lambda m: m["combinazioni"][0]["termini"][0].__setitem__("azione", 99),
    lambda m: m["analisi"][0].__setitem__("casi", ["Z1", "Z99", "C1"]),
], ids=["sezione-calcestruzzo", "sezione-acciaio", "carico-nodale-nodo", "cedimento-nodo",
        "distribuito-asta", "termine-azione", "analisi-caso"])
def test_riferimento_rotto_e_rifiutato_prima_del_deck(chiedi, muta):
    m = leggi_fixture("telaio_2x1.nova.json")
    muta(m)
    (r,) = chiedi({"id": 1, "comando": "check", "modello": m})
    assert _esiti(r[-1]["verdetti"])["riferimenti"] == "non_passato"


def test_nodi_liberi_azione_ed_id(chiedi):
    (r,) = chiedi({"id": 1, "comando": "check", "modello": leggi_fixture("nodo_libero.nova.json")})
    v = next(v for v in r[-1]["verdetti"] if v["controllo"] == "nodi_liberi")
    assert v["oggetto"] == [7] and v["azione"] == "elimina il nodo"


def test_nessun_nodo_vincolato_e_rifiutato(chiedi):
    m = leggi_fixture("telaio_2x1.nova.json")
    for n in m["nodi"]:
        n.pop("vincolo", None)
    (r,) = chiedi({"id": 1, "comando": "check", "modello": m})
    v = next(v for v in r[-1]["verdetti"] if v["controllo"] == "vincoli")
    assert v["esito"] == "non_passato" and v["azione"] == "vincola un nodo"


def test_tutti_i_nodi_incastrati_su_sei_gradi_e_rifiutato(chiedi):
    m = leggi_fixture("telaio_2x1.nova.json")
    incastro = {"ux": True, "uy": True, "uz": True, "rx": True, "ry": True, "rz": True}
    for n in m["nodi"]:
        n["vincolo"] = incastro
    (r,) = chiedi({"id": 1, "comando": "check", "modello": m})
    v = next(v for v in r[-1]["verdetti"] if v["controllo"] == "vincoli")
    assert v["esito"] == "non_passato" and "nulla da calcolare" in v["ragione"]


def test_un_solo_dof_bloccato_su_un_nodo_basta(chiedi):
    m = leggi_fixture("telaio_2x1.nova.json")
    for n in m["nodi"]:
        n.pop("vincolo", None)
    m["nodi"][0]["vincolo"] = {"uz": True}  # un solo grado, un solo nodo: non e' un falso rifiuto
    (r,) = chiedi({"id": 1, "comando": "check", "modello": m})
    assert _esiti(r[-1]["verdetti"])["vincoli"] == "passato"


# ---------------------------------------------------------------- il deck .tcl


def _deck(chiedi, cartella, modello, **extra):
    (r,) = chiedi({"id": 1, "comando": "deck", "modello": modello, "cartella": str(cartella), **extra})
    return r[-1]


def _tcl(cartella):
    return (cartella / "13_telaio.tcl").read_text(encoding="utf-8")


def test_il_deck_scrive_fix_dai_vincoli_dichiarati(chiedi, tmp_path):
    r = _deck(chiedi, tmp_path, leggi_fixture("telaio_2x1.nova.json"))
    assert r["esito"] == "ok"
    tcl = _tcl(tmp_path)
    assert tcl.count("\nfix ") == 3 and "fix 1 1 1 1 1 1 1" in tcl
    assert "eleLoad -ele" in tcl and "-beamUniform" in tcl
    assert "load 4 20000 0 0 0 0 0" in tcl
    assert "section 3 force" in tcl and "MESHREC_FINE" in tcl
    assert r["resoconto"]["casi"] == ["Z1", "Z2", "C1", "Z3"]  # Z3 = peso proprio generato


def test_la_combinazione_somma_i_carichi_con_i_coefficienti(chiedi, tmp_path):
    r = _deck(chiedi, tmp_path, leggi_fixture("telaio_2x1.nova.json"), casi=["C1"])
    assert "load 4 30000 0 0 0 0 0" in _tcl(tmp_path)  # 1,5 × 20 000
    tot = r["resoconto"]["carico_totale"]["C1"]
    assert abs(tot[0] - 30000) < 1e-6 and abs(tot[2] - (-1.5 * 12.5 * 9000)) < 1e-6


def test_il_carrello_lascia_ux_libero(chiedi, tmp_path):
    _deck(chiedi, tmp_path, leggi_fixture("trave_appoggiata.nova.json"))
    tcl = _tcl(tmp_path)
    # i nodi del modello tengono i tag 1..N: il nodo interno della suddivisione prende il 3
    assert "fix 1 1 1 1 1 0 0" in tcl and "fix 2 0 1 1 1 0 0" in tcl


def test_le_suddivisioni_creano_nodi_interni(chiedi, tmp_path):
    r = _deck(chiedi, tmp_path, leggi_fixture("trave_appoggiata.nova.json"))
    res = r["resoconto"]
    assert res["nodi"] == 3 and res["elementi"] == 2 and res["mappa_asta"]["1"] == [1, 2]
    assert res["mappa_nodo"] == {"1": 1, "2": 2}


@pytest.mark.parametrize("caso", ["Z9", "C9"])
def test_il_deck_rifiuta_un_caso_non_dichiarato(chiedi, tmp_path, caso):
    r = _deck(chiedi, tmp_path, leggi_fixture("telaio_2x1.nova.json"), casi=[caso])
    assert r["esito"] == "errore" and r["fase"] == "deck" and caso in r["motivo"]
    assert "Z1" in r["motivo"] and "C1" in r["motivo"]  # i casi validi
    assert not (tmp_path / "13_telaio.tcl").exists()


@pytest.mark.parametrize("caso", ["pippo", 5, "Z"])
def test_il_deck_rifiuta_un_caso_di_forma_sbagliata(chiedi, tmp_path, caso):
    r = _deck(chiedi, tmp_path, leggi_fixture("telaio_2x1.nova.json"), casi=[caso])
    assert r["esito"] == "errore" and r["fase"] == "deck" and str(caso) in r["motivo"]
    assert not (tmp_path / "13_telaio.tcl").exists()


def test_il_cedimento_scrive_sp(chiedi, tmp_path):
    m = leggi_fixture("telaio_2x1.nova.json")
    m["azioni"].append({"id": 3, "nome": "cedimento", "natura": "G1",
                        "carichi": [{"tipo": "cedimento", "nodo": 2, "uz": -5.0}]})
    m["contatori"]["azione"] = 3
    _deck(chiedi, tmp_path, m, casi=["Z3"])
    assert "sp 2 3 -5" in _tcl(tmp_path)  # uz del nodo 2, già bloccato dal suo fix


def test_il_cedimento_tutto_nullo_non_scrive_sp(chiedi, tmp_path):
    m = leggi_fixture("telaio_2x1.nova.json")
    m["azioni"].append({"id": 3, "nome": "cedimento", "natura": "G1",
                        "carichi": [{"tipo": "cedimento", "nodo": 2}]})
    m["contatori"]["azione"] = 3
    r = _deck(chiedi, tmp_path, m, casi=["Z3"])
    assert r["esito"] == "ok" and "\n    sp " not in _tcl(tmp_path)


def test_senza_analisi_statiche_resta_il_solo_peso_proprio(chiedi, tmp_path):
    m = leggi_fixture("telaio_2x1.nova.json")
    m["analisi"] = []
    r = _deck(chiedi, tmp_path, m, casi=[])
    assert r["resoconto"]["casi"] == ["Z3"]


def test_i_casi_duplicati_danno_un_solo_pattern(chiedi, tmp_path):
    r = _deck(chiedi, tmp_path, leggi_fixture("telaio_2x1.nova.json"), casi=["Z1", "Z1"])
    tcl = _tcl(tmp_path)
    assert r["resoconto"]["casi"] == ["Z1"]
    assert tcl.count("pattern Plain") == 1 and tcl.count("Z1_spostamenti.out") == 1


def test_azione_senza_carichi_da_pattern_vuoto(chiedi, tmp_path):
    m = leggi_fixture("telaio_2x1.nova.json")
    m["azioni"][1]["carichi"] = []
    r = _deck(chiedi, tmp_path, m, casi=["Z2"])
    assert r["esito"] == "ok" and r["resoconto"]["carico_totale"]["Z2"] == [0.0, 0.0, 0.0]
    assert "pattern Plain 1 1 {\n}" in _tcl(tmp_path)


def test_asta_a_lunghezza_zero_forzata_nomina_lasta(chiedi, tmp_path):
    m = leggi_fixture("asta_lunghezza_zero.nova.json")
    m["nodi"][6]["z"] = 3200  # esattamente sopra il nodo 4: l'asta 6 è lunga zero
    r = _deck(chiedi, tmp_path, m, forza=True)
    assert r["esito"] == "errore" and r["fase"] == "deck" and "asta 6" in r["motivo"]
    assert not (tmp_path / "13_telaio.tcl").exists()


def test_asta_di_un_millimetro_con_una_suddivisione(chiedi, tmp_path):
    m = leggi_fixture("trave_appoggiata.nova.json")
    m["nodi"][1]["x"] = 1
    m["aste"][0]["suddivisioni"] = 1
    r = _deck(chiedi, tmp_path, m)
    assert r["esito"] == "ok" and r["resoconto"]["elementi"] == 1
    assert "node 2 1 0 0" in _tcl(tmp_path)


@pytest.mark.parametrize("asse", [(0.0, 0.0, 1.0), (0.0316069, 0.0, 0.9995004)])
def test_lasta_verticale_prende_la_y_globale(asse):
    import numpy as np
    from nova.deck import _terna
    e1, e2 = _terna(np.array(asse), 0.0)
    assert tuple(e2) == (0.0, 1.0, 0.0) and not np.isnan(e1).any()


def test_lasta_a_coseno_099_prende_la_proiezione_di_z():
    import numpy as np
    from nova.deck import _terna
    a = np.array([math.sqrt(1 - 0.99 ** 2), 0.0, 0.99])
    e1, e2 = _terna(a, 0.0)
    assert abs(float(np.dot(e2, a))) < 1e-12 and e2[2] > 0.0
    assert abs(float(np.linalg.norm(e2)) - 1.0) < 1e-12 and not np.isnan(e1).any()


@pytest.mark.parametrize("gradi", [90, -90])
def test_la_rotazione_cambia_il_vecxz(chiedi, tmp_path, gradi):
    dritta = leggi_fixture("trave_appoggiata.nova.json")
    ruotata = leggi_fixture("trave_appoggiata.nova.json")
    ruotata["aste"][0]["rotazione_deg"] = gradi
    _deck(chiedi, tmp_path / "a", dritta)
    r = _deck(chiedi, tmp_path / "b", ruotata)
    assert r["esito"] == "ok"
    prima = [x for x in _tcl(tmp_path / "a").splitlines() if x.startswith("geomTransf")]
    dopo = [x for x in _tcl(tmp_path / "b").splitlines() if x.startswith("geomTransf")]
    assert prima != dopo and "nan" not in "".join(dopo)


def test_sezione_senza_staffe_finisce_in_sezioni_senza_barre(chiedi, tmp_path):
    m = leggi_fixture("telaio_2x1.nova.json")
    del m["sezioni"][0]["staffe"]
    r = _deck(chiedi, tmp_path, m)
    assert r["esito"] == "ok" and r["resoconto"]["sezioni_senza_barre"] == [1]


def test_barre_che_non_ci_stanno_nominano_la_sezione(chiedi, tmp_path):
    m = leggi_fixture("telaio_2x1.nova.json")
    m["sezioni"][0]["copriferro"] = 140  # 140 + 8 + 8 ≥ 300/2: i due strati si attraversano
    r = _deck(chiedi, tmp_path, m)
    assert r["esito"] == "errore" and r["fase"] == "deck" and "sezione 1" in r["motivo"]


def test_la_riduzione_che_divora_la_sezione_e_rifiutata(chiedi, tmp_path):
    m = leggi_fixture("telaio_2x1.nova.json")
    m["sezioni"][0]["riduzione"] = {"sup": 150, "inf": 150}
    r = _deck(chiedi, tmp_path, m)
    assert r["esito"] == "errore" and r["fase"] == "deck" and "sezione 1" in r["motivo"]
    assert not (tmp_path / "13_telaio.tcl").exists()


def test_classe_di_materiale_ignota_e_leggibile(chiedi, tmp_path):
    m = leggi_fixture("telaio_2x1.nova.json")
    m["materiali"][0].update({"classe": "C99/110", "personalizzato": True})
    r = _deck(chiedi, tmp_path, m)
    assert r["esito"] == "errore" and "C99/110" in r["motivo"]


def test_il_distribuito_nullo_non_scrive_eleload(chiedi, tmp_path):
    m = leggi_fixture("telaio_2x1.nova.json")
    for c in m["azioni"][0]["carichi"]:
        c["q"] = 0
    r = _deck(chiedi, tmp_path, m, casi=["Z1"])
    assert r["esito"] == "ok" and "eleLoad" not in _tcl(tmp_path)


def test_la_massa_nodale_nulla_non_scrive_mass(chiedi, tmp_path):
    m = leggi_fixture("telaio_2x1.nova.json")
    m["nodi"][3]["massa_nodale"] = 0
    _deck(chiedi, tmp_path, m)
    assert "\nmass " not in _tcl(tmp_path)


def test_la_massa_nodale_dichiarata_scrive_mass(chiedi, tmp_path):
    m = leggi_fixture("telaio_2x1.nova.json")
    m["nodi"][3]["massa_nodale"] = 1.25
    _deck(chiedi, tmp_path, m)
    assert "mass 4 1.25 1.25 1.25 0 0 0" in _tcl(tmp_path)


def test_la_cartella_inesistente_viene_creata(chiedi, tmp_path):
    fuori = tmp_path / "corsa" / "uno"
    r = _deck(chiedi, fuori, leggi_fixture("telaio_2x1.nova.json"))
    assert r["esito"] == "ok" and (fuori / "13_telaio.tcl").exists()


def test_la_cartella_non_scrivibile_da_errore_di_fase_deck(chiedi, tmp_path):
    chiusa = tmp_path / "chiusa"
    chiusa.mkdir()
    chiusa.chmod(0o500)
    try:
        r = _deck(chiedi, chiusa / "dentro", leggi_fixture("telaio_2x1.nova.json"))
    finally:
        chiusa.chmod(0o700)
    assert r["esito"] == "errore" and r["fase"] == "deck" and "Errno 13" in r["motivo"]


def test_il_coefficiente_zero_azzera_e_il_negativo_inverte(chiedi, tmp_path):
    m = leggi_fixture("telaio_2x1.nova.json")
    m["combinazioni"][0]["termini"] = [{"azione": 1, "coefficiente": 0}, {"azione": 2, "coefficiente": -1}]
    r = _deck(chiedi, tmp_path, m, casi=["C1"])
    tcl = _tcl(tmp_path)
    assert r["esito"] == "ok" and "load 4 -20000 0 0 0 0 0" in tcl and "eleLoad" not in tcl


def test_il_carico_totale_del_peso_proprio_pesa_le_aste(chiedi, tmp_path):
    r = _deck(chiedi, tmp_path, leggi_fixture("telaio_2x1.nova.json"), casi=["Z3"])
    tot = r["resoconto"]["carico_totale"]["Z3"]
    # volume 2 214·10⁶ mm³: cls solo → 55 350 N, con le barre d'acciaio poco più
    assert abs(tot[0]) < 1e-9 and abs(tot[1]) < 1e-9 and -57000 < tot[2] < -55000


def test_il_deck_rifiuta_il_modello_bocciato_dal_check(chiedi, tmp_path):
    m = leggi_fixture("nodo_libero.nova.json")
    r = _deck(chiedi, tmp_path, m)
    assert r["esito"] == "errore" and r["fase"] == "check"
    assert any(v["esito"] == "non_passato" for v in r["verdetti"])
    assert not (tmp_path / "13_telaio.tcl").exists()


def test_forza_scavalca_il_check(chiedi, tmp_path):
    r = _deck(chiedi, tmp_path, leggi_fixture("nodo_libero.nova.json"), forza=True)
    assert r["esito"] == "ok" and (tmp_path / "13_telaio.tcl").exists()
