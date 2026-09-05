"""Cucitura principale: una riga JSON dentro, righe JSON fuori."""
import io
import json
import math
import os

import pytest

from conftest import leggi_fixture
from nova.corsa import NOME_RISULTATI


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


# --- Fix wave: messaggi di carica() in italiano -----------------------------

def test_carica_senza_unita_dice_campo_obbligatorio_in_italiano():
    from nova.modello import carica
    d = leggi_fixture("telaio_2x1.nova.json")
    del d["unita"]
    with pytest.raises(ValueError, match=r"unita: campo obbligatorio"):
        carica(d)


def test_carica_con_campo_sconosciuto_dice_campo_non_previsto_in_italiano():
    from nova.modello import carica
    d = leggi_fixture("telaio_2x1.nova.json")
    d["nodi"][0]["colore"] = "rosso"
    with pytest.raises(ValueError, match=r"nodi\.0\.colore: campo non previsto"):
        carica(d)


# --- Fix wave: la Tcl injection sulla `classe` del materiale ----------------
# nova/deck.py scrive `m.materiale(...).classe` in un commento Tcl (`;# {classe}`):
# una `classe` libera con `\n` o `{` è un comando Tcl che il rifiuto qui a monte
# non lascia mai arrivare al deck, neanche con `personalizzato: true`.

def test_classe_con_a_capo_e_rifiutata_anche_personalizzata():
    from nova.modello import carica
    d = leggi_fixture("telaio_2x1.nova.json")
    d["materiali"][0]["personalizzato"] = True
    d["materiali"][0]["classe"] = "C25/30\nexec rm -rf /"
    with pytest.raises(ValueError, match=r"materiali\.0\.classe"):
        carica(d)


def test_classe_con_parentesi_graffa_e_rifiutata():
    from nova.modello import carica
    d = leggi_fixture("telaio_2x1.nova.json")
    d["materiali"][0]["personalizzato"] = True
    d["materiali"][0]["classe"] = "C25/30 {puts pwned}"
    with pytest.raises(ValueError):
        carica(d)


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
    # l'insieme dei controlli C1 è sempre lo stesso, e sono quindici: chi ne aggiunge uno
    # aggiorna qui, così una voce nuova non entra in silenzio senza il suo oracolo
    assert set(esiti) == {"unita", "nodi_coincidenti", "aste_sconnesse", "aste_lunghezza_zero", "aste_duplicate",
                          "nodi_liberi", "nodo_su_asta", "sezione_nulla", "riferimenti", "massa_nulla", "vincoli",
                          "carico_termico", "moti_rigidi", "armatura_mancante", "vincoli_dedotti"}


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
    assert v["esito"] == "non_passato" and v["rimedio"] == "spezza asta" and [7, 4] in v["oggetto"]


def test_carico_termico_e_rifiutato_in_v1(chiedi):
    m = leggi_fixture("telaio_2x1.nova.json")
    m["azioni"][0]["carichi"].append({"tipo": "termico", "asta": 4, "dT_uniforme": 20})
    (r,) = chiedi({"id": 1, "comando": "check", "modello": m})
    v = next(v for v in r[-1]["verdetti"] if v["controllo"] == "carico_termico")
    assert v["esito"] == "non_passato" and v["rimedio"] == "togli il carico termico"


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
    assert v["esito"] == "non_passato" and v["rimedio"] == "correggi il riferimento"
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


def test_nodi_liberi_rimedio_ed_id(chiedi):
    (r,) = chiedi({"id": 1, "comando": "check", "modello": leggi_fixture("nodo_libero.nova.json")})
    v = next(v for v in r[-1]["verdetti"] if v["controllo"] == "nodi_liberi")
    assert v["oggetto"] == [7] and v["rimedio"] == "elimina il nodo"


def test_nessun_nodo_vincolato_e_rifiutato(chiedi):
    m = leggi_fixture("telaio_2x1.nova.json")
    for n in m["nodi"]:
        n.pop("vincolo", None)
    (r,) = chiedi({"id": 1, "comando": "check", "modello": m})
    v = next(v for v in r[-1]["verdetti"] if v["controllo"] == "vincoli")
    assert v["esito"] == "non_passato" and v["rimedio"] == "vincola un nodo"


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
    r = _deck(chiedi, tmp_path, m)  # `casi` assente: decide il default delle analisi
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


@pytest.mark.parametrize("gradi,atteso", [(0, (0, 0, 1)), (90, (0, -1, 0)), (-90, (0, 1, 0))])
def test_la_rotazione_gira_il_vecxz_in_verso_destrorso(chiedi, tmp_path, gradi, atteso):
    # trave lungo +x: a vecxz fermo il local y è +Y, e +90 destrorsi lo portano a +Z
    m = leggi_fixture("trave_appoggiata.nova.json")
    m["aste"][0]["rotazione_deg"] = gradi
    r = _deck(chiedi, tmp_path, m)
    assert r["esito"] == "ok"
    righe = [x for x in _tcl(tmp_path).splitlines() if x.startswith("geomTransf")]
    vecxz = [float(v) for v in righe[0].split()[3:6]]
    assert all(abs(v - atteso[k]) < 1e-9 for k, v in enumerate(vecxz))


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
    if os.geteuid() == 0:
        pytest.skip("da root i permessi della cartella non fermano nulla")
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


# --------------------------------------------------- deck: giro di correzioni 1


def test_la_stessa_sezione_su_trave_e_pilastro_da_due_fibre(chiedi, tmp_path):
    m = leggi_fixture("telaio_2x1.nova.json")
    for a in m["aste"]:
        a["sezione"] = 2  # 300×500 su pilastri e travi: due orientamenti, due geometrie
    _deck(chiedi, tmp_path, m)
    tcl = _tcl(tmp_path)
    assert tcl.count("section Fiber") == 2
    assert "patch rect 1 10 10 -250 -150 250 150" in tcl  # pilastro: h lungo e1
    assert "patch rect 3 10 10 -150 -250 150 250" in tcl  # trave: b lungo e1, ±250 su local z


def test_leleload_porta_i_numeri_del_carico(chiedi, tmp_path):
    _deck(chiedi, tmp_path, leggi_fixture("telaio_2x1.nova.json"))
    tcl = _tcl(tmp_path)
    assert "eleLoad -ele 4 -type -beamUniform 0 -12.5 0" in tcl  # trave, carico in local z
    assert "eleLoad -ele 1 -type -beamUniform 0 0 -2.291814849" in tcl  # pilastro, peso assiale


def test_due_termini_sulla_stessa_azione_si_sommano(chiedi, tmp_path):
    m = leggi_fixture("telaio_2x1.nova.json")
    m["combinazioni"][0]["termini"] = [{"azione": 1, "coefficiente": 1.0}, {"azione": 1, "coefficiente": 1.0}]
    r = _deck(chiedi, tmp_path, m, casi=["C1"])
    assert abs(r["resoconto"]["carico_totale"]["C1"][2] - (-2 * 12.5 * 9000)) < 1e-6


def test_le_barre_inf_stanno_sulle_facce_di_h_anche_in_piedi(chiedi, tmp_path):
    m = leggi_fixture("telaio_2x1.nova.json")
    m["sezioni"][0].update({"b": 300, "h": 600, "file": [{"lato": "inf", "n": 3, "diametro": 20}]})
    _deck(chiedi, tmp_path, m)
    # pilastro: h sta lungo e1, quindi le barre «inf» stanno a −(600/2 − 30 − 8 − 10) sul local y
    blocco = _tcl(tmp_path).split("section Fiber")[1]  # la sezione 1, quella dei pilastri
    fibre = [x for x in blocco.splitlines() if x.strip().startswith("fiber ")]
    y = {float(x.split()[1]) for x in fibre}
    assert y == {-252.0} and len(fibre) == 3


def test_senza_azione_di_peso_proprio_e_un_rifiuto_di_fase_deck():
    from nova import modello, sidecar
    m = modello.carica(leggi_fixture("telaio_2x1.nova.json"))  # senza assicura_peso_proprio
    with pytest.raises(sidecar._Rifiuto) as e:
        sidecar._casi_delle_analisi(m)
    assert e.value.fase == "deck" and "peso proprio" in e.value.motivo


def test_due_file_sullo_stesso_lato_sono_rifiutate(chiedi, tmp_path):
    m = leggi_fixture("telaio_2x1.nova.json")
    m["sezioni"][0]["file"].append({"lato": "inf", "n": 2, "diametro": 20})
    r = _deck(chiedi, tmp_path, m)
    assert r["esito"] == "errore" and r["fase"] == "deck"
    assert "sezione 1" in r["motivo"] and "inf" in r["motivo"]


def test_il_rifiuto_non_crea_la_cartella(chiedi, tmp_path):
    fuori = tmp_path / "mai"
    r = _deck(chiedi, fuori, leggi_fixture("telaio_2x1.nova.json"), casi=["Z9"])
    assert r["esito"] == "errore" and not fuori.exists()


def test_il_carico_per_elemento_e_di_float_puri(tmp_path):
    from nova import deck as _d
    from nova import modello
    dati = leggi_fixture("telaio_2x1.nova.json")
    for c in dati["azioni"][0]["carichi"]:
        c["direzione"] = "locale_z"  # la direzione locale viene dai versori numpy
    m = modello.assicura_peso_proprio(modello.carica(dati))
    d = _d.scrivi(m, ["Z1", "Z3"], tmp_path)
    assert all(type(x) is float for e in d.elementi for w in e.w.values() for x in w)


# --- corsa con un solutore finto: la fase «solutore» senza binario vero ---------------------------

def _finto(tmp_path, corpo: str) -> str:
    """Un «OpenSees» di due righe: serve a provare le diagnosi, non la meccanica."""
    p = tmp_path / "OpenSees"
    p.write_text("#!/bin/sh\n" + corpo)
    p.chmod(0o755)
    return str(p)


def _corsa(chiedi, tmp_path, fixture="trave_appoggiata.nova.json", **extra):
    (r,) = chiedi({"id": 1, "comando": "corsa", "modello": leggi_fixture(fixture),
                   "cartella": str(tmp_path / "c"), "casi": ["Z1"], **extra})
    return r[-1]


def test_solutore_che_non_scrive_il_marcatore_e_un_errore_di_fase_solutore(chiedi, tmp_path):
    finto = tmp_path / "OpenSees"
    finto.write_text("#!/bin/sh\necho 'OpenSees -- Open System For Earthquake Engineering Simulation'\n"
                     "echo 'Version 3.8.0'\necho WARNING finto\nexit 0\n")
    finto.chmod(0o755)
    (r,) = chiedi({"id": 1, "comando": "corsa", "modello": leggi_fixture("telaio_2x1.nova.json"),
                   "cartella": str(tmp_path / "c"), "solutore": str(finto)})
    assert r[-1]["esito"] == "errore" and r[-1]["fase"] == "solutore"
    assert "marcatore" in r[-1]["motivo"] and "WARNING finto" in r[-1]["coda_log"]


def test_solutore_assente_non_e_un_errore(chiedi, tmp_path):
    (r,) = chiedi({"id": 1, "comando": "corsa", "modello": leggi_fixture("telaio_2x1.nova.json"),
                   "cartella": str(tmp_path), "solutore": str(tmp_path / "non_esiste")})
    assert r[-1]["esito"] == "assente" and r[-1]["dove_prenderlo"]
    assert "non_esiste" in r[-1]["motivo"]


def test_verifica_di_un_solutore_dichiarato_e_inesistente_e_assente(chiedi, tmp_path):
    (r,) = chiedi({"id": 1, "comando": "verifica", "solutore": str(tmp_path / "non_esiste")})
    assert r[-1]["esito"] == "assente" and r[-1]["dove_prenderlo"]
    assert "non_esiste" in r[-1]["motivo"]


def test_il_marcatore_e_il_testo_non_il_file(chiedi, tmp_path):
    fin = _corsa(chiedi, tmp_path, solutore=_finto(tmp_path, "echo NIENTE > fine.out\n"))
    assert fin["esito"] == "errore" and fin["fase"] == "solutore" and "marcatore" in fin["motivo"]


def test_analyze_fallito_nomina_il_caso_nella_coda_del_log(chiedi, tmp_path):
    corpo = "echo 'MESHREC_FINE_MANCA: il caso Z1 non è arrivato a convergenza'\nexit 1\n"
    fin = _corsa(chiedi, tmp_path, solutore=_finto(tmp_path, corpo))
    assert fin["esito"] == "errore" and fin["fase"] == "solutore"
    assert "il caso Z1" in fin["coda_log"]


@pytest.mark.parametrize("scrittura", [": > Z1_spostamenti.out", "echo '1.0 2.0' > Z1_spostamenti.out"],
                         ids=["vuoto", "troncato"])
def test_recorder_illeggibile_e_un_errore_di_fase_solutore_col_nome_del_file(chiedi, tmp_path, scrittura):
    fin = _corsa(chiedi, tmp_path, solutore=_finto(tmp_path, f"{scrittura}\necho MESHREC_FINE > fine.out\n"))
    assert fin["esito"] == "errore" and fin["fase"] == "solutore"
    assert "Z1_spostamenti.out" in fin["motivo"]


def test_recorder_mancante_dopo_il_marcatore_e_di_fase_solutore(chiedi, tmp_path):
    fin = _corsa(chiedi, tmp_path, solutore=_finto(tmp_path, "echo MESHREC_FINE > fine.out\n"))
    assert fin["esito"] == "errore" and fin["fase"] == "solutore"
    assert "Z1_spostamenti.out" in fin["motivo"]


def test_gli_out_di_una_corsa_precedente_sono_cancellati(chiedi, tmp_path):
    """Il file stantio è **ben formato** (3 nodi × 6 dof): se non venisse cancellato la lettura
    riuscirebbe e l'errore nominerebbe il file dopo, `Z1_reazioni.out`."""
    vecchia = tmp_path / "c"
    vecchia.mkdir()
    (vecchia / "Z1_spostamenti.out").write_text(" ".join(["1.0"] * 18) + "\n")
    fin = _corsa(chiedi, tmp_path, solutore=_finto(tmp_path, "echo MESHREC_FINE > fine.out\n"))
    assert fin["esito"] == "errore" and "Z1_spostamenti.out" in fin["motivo"]


def test_il_registro_con_byte_non_utf8_resta_leggibile(chiedi, tmp_path):
    fin = _corsa(chiedi, tmp_path, solutore=_finto(tmp_path, "printf 'strano \\377\\376 qui\\n'\n"))
    assert fin["esito"] == "errore" and fin["fase"] == "solutore"
    assert "strano" in fin["coda_log"] and "qui" in fin["coda_log"]


def test_la_corsa_oltre_il_timeout_e_un_errore_di_fase_solutore(chiedi, tmp_path, monkeypatch):
    from nova import corsa as _c
    monkeypatch.setattr(_c, "_TIMEOUT_S", 0.5)
    fin = _corsa(chiedi, tmp_path, solutore=_finto(tmp_path, "echo comincio\nsleep 5\n"))
    assert fin["esito"] == "errore" and fin["fase"] == "solutore" and "timeout" in fin["motivo"]
    assert "comincio" in (tmp_path / "c" / "13_solver.log").read_text()  # il registro c'è comunque


def test_forza_fa_partire_la_corsa_e_tiene_il_rifiuto_del_check(chiedi, tmp_path):
    fin = _corsa(chiedi, tmp_path, fixture="nodo_libero.nova.json", casi=None, forza=True,
                 solutore=_finto(tmp_path, "exit 0\n"))
    assert fin["esito"] == "errore" and fin["fase"] == "solutore"
    assert any(v["esito"] == "non_passato" for v in fin["verdetti_check"])
    assert (tmp_path / "c" / "13_telaio.tcl").is_file()


def test_il_solutore_fuori_dal_path_e_assente_non_un_errore(chiedi, tmp_path, monkeypatch):
    monkeypatch.setenv("PATH", str(tmp_path / "vuoto"))  # nessun OpenSees da nessuna parte
    fin = _corsa(chiedi, tmp_path)
    assert fin["esito"] == "assente" and fin["dove_prenderlo"]
    assert "non è nel PATH" in fin["motivo"]


_RECORDER_INF = """riga() { i=0; s=""; while [ $i -lt $1 ]; do s="$s inf"; i=$((i+1)); done; echo "$s" > "$2"; }
riga 18 Z1_spostamenti.out
riga 18 Z1_reazioni.out
riga 24 Z1_localforce.out
for k in 1 2 3 4 5; do riga 8 Z1_sez$k.out; done
echo MESHREC_FINE > fine.out
"""


def _rifiuta_costante(c):
    raise AssertionError(f"costante JSON non standard nella risposta: {c}")


def test_il_solutore_divergente_non_scrive_infinity_nel_json(tmp_path):
    """`Infinity` e `NaN` non stanno nel JSON standard: `JSON.parse` del browser li rifiuta."""
    from nova import sidecar
    req = {"id": 1, "comando": "corsa", "modello": leggi_fixture("trave_appoggiata.nova.json"),
           "cartella": str(tmp_path / "c"), "casi": ["Z1"], "solutore": _finto(tmp_path, _RECORDER_INF)}
    uscita = io.StringIO()
    sidecar.servi(io.StringIO(json.dumps(req) + "\n"), uscita)
    fin = json.loads(uscita.getvalue().splitlines()[-1], parse_constant=_rifiuta_costante)
    assert fin["esito"] == "ok", fin
    esiti = {(v["controllo"], v["caso"]): v["esito"] for v in fin["risultati"]["verdetti"]}
    assert esiti[("spostamenti", "Z1")] == "non_passato" and esiti[("reazioni", "Z1")] == "non_passato"
    assert fin["risultati"]["per_caso"]["Z1"]["spostamenti"]["1"] == [None] * 6
    json.loads((tmp_path / "c" / NOME_RISULTATI).read_text(), parse_constant=_rifiuta_costante)


def test_solutore_che_non_e_eseguibile_e_di_fase_solutore(chiedi, tmp_path):
    non_eseguibile = tmp_path / "OpenSees.txt"
    non_eseguibile.write_text("non sono un binario\n")
    non_eseguibile.chmod(0o644)
    fin = _corsa(chiedi, tmp_path, solutore=str(non_eseguibile))
    assert fin["esito"] == "errore" and fin["fase"] == "solutore"
    assert "OpenSees.txt" in fin["motivo"] and "non è eseguibile" in fin["motivo"]


def test_la_corsa_fallita_non_lascia_i_risultati_di_ieri(chiedi, tmp_path):
    vecchia = tmp_path / "c"
    vecchia.mkdir()
    (vecchia / NOME_RISULTATI).write_text('{"run": {"hash_modello": "di ieri"}}')
    fin = _corsa(chiedi, tmp_path, solutore=_finto(tmp_path, "exit 0\n"))
    assert fin["esito"] == "errore"
    assert not (vecchia / NOME_RISULTATI).exists()


def test_il_deck_rifiutato_non_tocca_le_uscite_precedenti(chiedi, tmp_path):
    vecchia = tmp_path / "c"
    vecchia.mkdir()
    (vecchia / "Z1_spostamenti.out").write_text("1.0\n")
    (vecchia / NOME_RISULTATI).write_text("{}")
    fin = _corsa(chiedi, tmp_path, casi=["Z9"], solutore=_finto(tmp_path, "exit 0\n"))
    assert fin["esito"] == "errore" and fin["fase"] == "deck"
    assert (vecchia / "Z1_spostamenti.out").is_file() and (vecchia / NOME_RISULTATI).is_file()


# --- Review finale: gli ingressi degeneri che il ramo non copriva ancora -------


@pytest.mark.parametrize("versione", ["2", None, [1], True, 1.5])
def test_schema_version_non_intera_e_un_rifiuto_di_fase_modello(chiedi, versione):
    """`versione > VERSIONE_SCHEMA` su una non-intera dava `TypeError` invece del rifiuto."""
    m = leggi_fixture("telaio_2x1.nova.json") | {"schema_version": versione}
    (r,) = chiedi({"id": 1, "comando": "check", "modello": m})
    assert r[-1]["esito"] == "errore" and r[-1]["fase"] == "modello"
    assert "schema_version deve essere un intero" in r[-1]["motivo"]


@pytest.mark.parametrize("lato", ["inf", "sup", "sx", "dx"])
def test_i_copriferri_opposti_che_si_sovrappongono_nominano_sezione_e_lato(chiedi, tmp_path, lato):
    """300×100 con copriferro 40, staffe Ø8 e barre Ø16: 40 + 8 + 8 ≥ 100/2, le barre
    finivano dalla parte sbagliata del baricentro senza che nulla sollevasse."""
    m = leggi_fixture("telaio_2x1.nova.json")
    m["sezioni"][0].update({"b": 300, "h": 100, "copriferro": 40,
                            "file": [{"lato": lato, "n": 2, "diametro": 16}]})
    r = _deck(chiedi, tmp_path, m)
    assert r["esito"] == "errore" and r["fase"] == "deck"
    assert "sezione 1" in r["motivo"] and "i copriferri opposti si sovrappongono su h" in r["motivo"]
    assert not (tmp_path / "13_telaio.tcl").exists()


def test_la_sezione_a_fibre_valida_resta_quella_di_prima(chiedi, tmp_path):
    """La guardia non tocca una 300×500 sana: barre a ±204 = ±(250 − 30 − 8 − 8)."""
    _deck(chiedi, tmp_path, leggi_fixture("trave_appoggiata.nova.json"))
    fibre = [x for x in _tcl(tmp_path).splitlines() if x.strip().startswith("fiber ")]
    assert sorted({float(x.split()[2]) for x in fibre}) == [-204.0, 204.0]
    assert sorted({float(x.split()[1]) for x in fibre}) == [-104.0, 0.0, 104.0]


def test_la_sezione_senza_barre_e_un_non_applicabile_del_check(chiedi):
    m = leggi_fixture("telaio_2x1.nova.json")
    del m["sezioni"][0]["staffe"]
    (r,) = chiedi({"id": 1, "comando": "check", "modello": m})
    assert r[-1]["esito"] == "ok"
    v = {x["controllo"]: x for x in r[-1]["verdetti"]}
    assert v["armatura_mancante"]["esito"] == "non_applicabile"
    assert v["armatura_mancante"]["oggetto"] == [1]
    assert "non lineare (T4)" in v["armatura_mancante"]["ragione"]


def test_i_due_controlli_rinviati_non_sono_mai_passato(chiedi):
    (r,) = chiedi({"id": 1, "comando": "check", "modello": leggi_fixture("telaio_2x1.nova.json")})
    v = {x["controllo"]: x for x in r[-1]["verdetti"]}
    assert v["armatura_mancante"]["esito"] == "non_applicabile" and v["armatura_mancante"]["oggetto"] is None
    assert v["vincoli_dedotti"]["esito"] == "non_applicabile"
    assert "importatore (T2)" in v["vincoli_dedotti"]["ragione"]


def test_il_caso_con_a_capo_e_rifiutato_e_non_finisce_nel_tcl(chiedi, tmp_path):
    """`$` di Python accetta l'a capo finale e `int("1\\n")` passa: il caso arrivava nel deck."""
    r = _deck(chiedi, tmp_path, leggi_fixture("telaio_2x1.nova.json"), casi=["Z1\n"])
    assert r["esito"] == "errore" and r["fase"] == "deck" and "Z1" in r["motivo"]
    assert not (tmp_path / "13_telaio.tcl").exists()


def test_forza_con_sezione_inesistente_nomina_lid(chiedi, tmp_path):
    m = leggi_fixture("telaio_2x1.nova.json")
    m["aste"][0]["sezione"] = 99
    r = _deck(chiedi, tmp_path, m, forza=True)
    assert r["esito"] == "errore" and r["fase"] == "deck"
    assert "99" in r["motivo"] and "AttributeError" not in r["motivo"]


def test_forza_con_azione_inesistente_in_combinazione_nomina_lid(chiedi, tmp_path):
    m = leggi_fixture("telaio_2x1.nova.json")
    m["combinazioni"][0]["termini"].append({"azione": 99, "coefficiente": 1.0})
    r = _deck(chiedi, tmp_path, m, forza=True, casi=["C1"])
    assert r["esito"] == "errore" and r["fase"] == "deck"
    assert "99" in r["motivo"] and "AttributeError" not in r["motivo"]


@pytest.mark.parametrize("comando", ["deck", "corsa"])
def test_la_lista_di_casi_vuota_e_un_rifiuto_non_il_default(chiedi, tmp_path, comando):
    (r,) = chiedi({"id": 1, "comando": comando, "modello": leggi_fixture("telaio_2x1.nova.json"),
                   "cartella": str(tmp_path / "c"), "casi": []})
    assert r[-1]["esito"] == "errore" and r[-1]["fase"] == "deck"
    assert "nessun caso richiesto" in r[-1]["motivo"]


def test_i_casi_assenti_restano_il_default_delle_analisi(chiedi, tmp_path):
    r = _deck(chiedi, tmp_path, leggi_fixture("telaio_2x1.nova.json"), casi=None)
    assert r["esito"] == "ok" and r["resoconto"]["casi"] == ["Z1", "Z2", "C1", "Z3"]


def test_sezione_con_base_nulla_dice_maggiore_di_zero_in_italiano(chiedi):
    m = leggi_fixture("telaio_2x1.nova.json")
    m["sezioni"][0]["b"] = 0
    (r,) = chiedi({"id": 1, "comando": "check", "modello": m})
    assert r[-1]["fase"] == "modello" and "deve essere maggiore di 0" in r[-1]["motivo"]


def test_il_validator_custom_non_porta_il_prefisso_di_pydantic(chiedi):
    m = leggi_fixture("telaio_2x1.nova.json")
    m["azioni"][1]["categoria"] = None  # natura Q senza categoria d'uso
    (r,) = chiedi({"id": 1, "comando": "check", "modello": m})
    assert r[-1]["fase"] == "modello" and "Value error" not in r[-1]["motivo"]
    assert "natura Q senza categoria" in r[-1]["motivo"]


@pytest.mark.parametrize("campo", ["calcestruzzo", "acciaio"])
def test_forza_con_materiale_inesistente_nomina_sezione_e_materiale(chiedi, tmp_path, campo):
    """Terzo riferimento rotto della stessa famiglia: `catalogo.valori(None)` faceva
    `AttributeError` su `materiale.classe` invece di un rifiuto di fase deck."""
    m = leggi_fixture("telaio_2x1.nova.json")
    m["sezioni"][0][campo] = 99
    r = _deck(chiedi, tmp_path, m, forza=True)
    assert r["esito"] == "errore" and r["fase"] == "deck"
    assert "sezione 1" in r["motivo"] and "99" in r["motivo"] and campo in r["motivo"]
    assert "AttributeError" not in r["motivo"]
    assert not (tmp_path / "13_telaio.tcl").exists()
