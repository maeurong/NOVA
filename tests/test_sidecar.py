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


def test_check_accetta_modello_vuoto(chiedi):
    m = {"schema_version": 1, "unita": "mm-N-MPa-t-s"}
    (risposte,) = chiedi({"id": 1, "comando": "check", "modello": m})
    assert risposte[-1]["esito"] == "ok"


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
