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
    assert _esiti(r[-1]["verdetti"])["carico_termico"] == "non_passato"


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
