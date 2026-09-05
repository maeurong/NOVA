"""L'importatore: dal prior di MeshRec al modello NOVA, anche quando il prior è vuoto.

Ogni test è ancorato a una riga di «Ingressi degeneri» del brief Task 2; la mappa
riga → test sta nel report.
"""
import json
import subprocess
import sys
from pathlib import Path

import numpy as np
import pytest

from conftest import FIXTURE
from nova import check, importa, modello

SINTETICO = FIXTURE / "prior_sintetico" / "12_wall.json"
VUOTO = FIXTURE / "prior_vuoto" / "12_wall.json"
PARZIALE = FIXTURE / "prior_parziale" / "12_wall.json"


def _prior(p: Path) -> dict:
    return json.loads(p.read_text(encoding="utf-8"))


# --- il prior vero, che non ha trovato niente -------------------------------

def test_il_prior_vuoto_da_un_modello_vuoto_e_le_scartate():
    imp = importa.importa(_prior(VUOTO), riferimento="lab_telaio_v2")
    assert imp.modello.nodi == [] and imp.modello.aste == []
    assert imp.mancano == [] and imp.proposte_vincoli == []
    assert imp.resoconto["membrature"] == 0 and imp.resoconto["aste"] == 0
    modello.carica(json.loads(imp.modello.model_dump_json()))  # riletto senza errori


def test_le_scartate_portano_una_riga_per_controllo_fallito():
    prior = _prior(VUOTO)
    attese = sum(len(s["controlli_falliti"]) for s in prior["scartate"])
    imp = importa.importa(prior)
    assert len(imp.scartate) == attese == 14
    riga = next(s for s in imp.scartate if s["regione"] == 0)
    esito = prior["scartate"][0]["esiti"]["costanza_sezione"]
    assert riga == {"regione": 0, "punti": prior["scartate"][0]["punti"],
                    "controllo": "costanza_sezione", "valore": esito["valore"],
                    "soglia": esito["soglia"], "unita": esito["unita"],
                    "spiegazione": esito["spiegazione"]}
    assert riga["valore"] > riga["soglia"]


# --- il prior sintetico, che ha trovato tutto -------------------------------

def test_il_sintetico_da_80_aste_con_sezione_dal_rilievo():
    imp = importa.importa(_prior(SINTETICO), riferimento="prior_sintetico")
    m = imp.modello
    assert len(m.aste) == 80 and len(m.sezioni) == 80
    assert all(a.origine.sorgente == "rilievo" and a.suddivisioni == 1 for a in m.aste)
    assert all(s.origine.sorgente == "rilievo" and s.file == [] and s.staffe is None for s in m.sezioni)
    assert all(a.origine.riferimento == "prior_sintetico" for a in m.aste)
    dal_percorso = importa.importa(_prior(SINTETICO), riferimento=str(SINTETICO)).modello
    assert dal_percorso.nodi[0].origine.riferimento == "12_wall.json"  # il nome, non il percorso
    assert imp.mancano == ["armature", "classe", "vincoli"]
    assert len(imp.giunzioni) == 4 and all(np.isfinite(g["scostamento_nodo"]) for g in imp.giunzioni)
    assert {g["nodo"] for g in imp.giunzioni} <= {n.id for n in m.nodi}
    assert imp.resoconto == {"membrature": 4, "aste": 80, "nodi": 80, "scartate": 0,
                             "giunzioni_scartate": 0}
    assert len(m.nodi) == 80


def test_i_materiali_di_default_dichiarano_di_essere_un_assunzione():
    m = importa.importa(_prior(SINTETICO)).modello
    assert [x.classe for x in m.materiali] == ["C25/30", "B450C"]
    assert all(x.origine.nota == "assunta: il rilievo non dice la classe" for x in m.materiali)


def test_le_coordinate_sono_nella_terna_del_telaio():
    m = importa.importa(_prior(SINTETICO)).modello
    x = np.array([n.x for n in m.nodi]); y = np.array([n.y for n in m.nodi]); z = np.array([n.z for n in m.nodi])
    assert x.min() == pytest.approx(0.0, abs=1e-9) and z.min() == pytest.approx(0.0, abs=1e-9)
    assert x.max() == pytest.approx(1626.85, abs=1.0)   # misurato, non atteso
    assert z.max() == pytest.approx(1934.45, abs=1.0)
    # `|y| ≤ 170` (gli spessori) è **vacua** su questa fixture: il sintetico ha i quattro assi
    # complanari e y esce a 1e-12. La prova vera che il fuori piano si conserva è il test dopo.
    assert np.abs(y).max() <= 170.0


def test_ruota_conserva_il_fuori_piano_e_non_lo_trasla():
    """Il sintetico ha i nodi complanari: l'unico modo di provare che `y` non si trasla
    è darle un fuori piano che il prior non ha, e ritrovarlo con il suo segno."""
    prior = _prior(SINTETICO)
    estremi = np.array([np.asarray(v["origine"], dtype=float) + t * v["lunghezza"] * np.asarray(v["asse"], dtype=float)
                        for v in prior["membrature"] for t in (0.0, 1.0)])
    R = importa.matrice_terna(prior, estremi)
    campione = np.vstack([estremi, estremi[0] + 137.0 * R[1], estremi[0] - 40.0 * R[1]])
    ruotati = importa.ruota(campione, R)  # il riferimento si passa: non si rimisura sui punti dati
    assert ruotati[:, 1].max() == pytest.approx(137.0, abs=1e-6)
    assert ruotati[:, 1].min() == pytest.approx(-40.0, abs=1e-6)
    assert ruotati[:, 0].min() == pytest.approx(0.0, abs=1e-9)
    assert ruotati[:, 2].min() == pytest.approx(0.0, abs=1e-9)


def test_la_rotazione_delle_sezioni_e_zero_o_novanta():
    m = importa.importa(_prior(SINTETICO)).modello
    for a in m.aste:
        r = abs(a.rotazione_deg) % 180.0
        assert min(r, abs(r - 90.0), abs(r - 180.0)) < 2.0, a.nome


def test_il_check_model_dice_cosa_manca():
    imp = importa.importa(_prior(SINTETICO))
    v = {x["controllo"]: x for x in check.check_model(imp.modello)}
    assert v["vincoli"]["esito"] == "non_passato"
    assert v["armatura_mancante"]["esito"] == "non_applicabile" and len(v["armatura_mancante"]["oggetto"]) == 80
    assert v["nodi_coincidenti"]["esito"] == "passato" and v["aste_sconnesse"]["esito"] == "passato"


def test_vincoli_dedotti_non_passato_sul_sintetico_senza_vincoli():
    """Il rilievo non propone vincoli (spec «Importatore dal prior»): il check li deve chiedere."""
    imp = importa.importa(_prior(SINTETICO))
    v = {x["controllo"]: x for x in check.check_model(imp.modello)}["vincoli_dedotti"]
    assert v["esito"] == "non_passato"
    assert v["oggetto"] == modello.piedi(imp.modello)
    assert v["valori"]["proposti"] == imp.proposte_vincoli
    assert v["rimedio"] == "conferma i vincoli proposti al piede"


def test_con_i_vincoli_proposti_il_modello_passa_il_check():
    imp = importa.importa(_prior(SINTETICO))
    dati = json.loads(imp.modello.model_dump_json(exclude_none=True))
    for p in imp.proposte_vincoli:
        next(n for n in dati["nodi"] if n["id"] == p["nodo"])["vincolo"] = p["vincolo"]
    m = modello.assicura_peso_proprio(modello.carica(dati))
    assert not check.rifiutato(check.check_model(m))
    assert len(imp.proposte_vincoli) >= 2  # la trave di fondazione poggia


def test_due_import_stesso_prior_stessa_impronta():
    a = importa.importa(_prior(SINTETICO)).modello
    b = importa.importa(_prior(SINTETICO)).modello
    assert modello.impronta(a) == modello.impronta(b)


# --- il prior a metà --------------------------------------------------------

def test_il_parziale_traduce_due_e_scarta_due():
    imp = importa.importa(_prior(PARZIALE))
    assert len(imp.modello.aste) == 40
    assert {s["regione"] for s in imp.scartate} == {2, 3}
    assert imp.resoconto["giunzioni_scartate"] == 0
    assert imp.giunzioni == []  # tutte e quattro nascevano su una membratura scartata


def test_il_parziale_e_riproducibile():
    atteso = PARZIALE.read_bytes()
    out = subprocess.run([sys.executable, str(PARZIALE.parent / "genera.py"), "--stdout"],
                         capture_output=True, check=True)
    assert out.stdout == atteso


# --- prior malformati -------------------------------------------------------

@pytest.mark.parametrize("chiave", ["terna", "membrature", "scartate"])
def test_senza_una_chiave_l_errore_la_nomina(chiave):
    p = _prior(SINTETICO)
    del p[chiave]
    with pytest.raises(ValueError, match=chiave):
        importa.importa(p)


def test_una_terna_che_non_e_3x3_e_rifiutata():
    p = _prior(SINTETICO)
    p["terna"] = [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0]]
    with pytest.raises(ValueError, match="terna"):
        importa.importa(p)


def test_una_sezione_di_estensione_nulla_esce_col_messaggio_di_telaio():
    p = _prior(SINTETICO)
    p["membrature"][0]["sezioni_fette"][0] = [0.0, 300.0]
    with pytest.raises(ValueError, match=r"stazione 0 della membratura 0"):
        importa.importa(p)


def _genera():
    """`tests/fixture/prior_parziale/genera.py`, caricato dal suo percorso: è una fixture,
    non un modulo del pacchetto."""
    import importlib.util

    spec = importlib.util.spec_from_file_location("genera", PARZIALE.parent / "genera.py")
    modulo = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(modulo)
    return modulo


def test_il_parziale_senza_la_prima_membratura_tiene_le_giunzioni_giuste():
    """Togliendo la **prima** membratura gli indici delle giunzioni superstiti scalano: se
    nessuno li rinumera, `costruisci` incolpa la geometria («lunghezza di calcolo −1675»)."""
    prior = json.loads(_genera().costruisci(scartate=(0,)).decode("utf-8"))
    imp = importa.importa(prior)
    assert len(imp.modello.aste) == 60 and {s["regione"] for s in imp.scartate} == {0}
    assert len(imp.giunzioni) == 2
    assert all(np.isfinite(g["scostamento_nodo"]) and g["scostamento_nodo"] < 100.0 for g in imp.giunzioni)


def test_una_giunzione_che_nomina_una_membratura_assente_si_toglie_e_si_conta():
    """La guardia esiste per un prior scritto a mano o da una corsa vecchia: MeshRec scrive
    `cede`/`resta` come indici della lista `membrature` che sta scrivendo (wall.py:997-1000),
    quindi da una corsa sua questa condizione non esce."""
    prior = _prior(PARZIALE)
    prior["giunzioni"] = [{"cede": 3, "resta": 0, "nodo": [0.0, 0.0, 0.0],
                           "distanza_proiezione": 1.0, "tipo_incontro": "estremo"}]
    imp = importa.importa(prior)
    assert imp.giunzioni == [] and imp.resoconto["giunzioni_scartate"] == 1


def test_le_sezioni_tornano_come_il_deck_le_riscrive():
    """L'oracolo del ponte fra i due moduli: dalla `Sezione` NOVA e dalla `rotazione_deg` il
    deck deve ricostruire la sezione **misurata**, orientata come l'ha misurata il rilievo."""
    from meshrec.core import telaio as _telaio
    from nova import deck

    prior = _prior(SINTETICO)
    imp = importa.importa(prior)
    telaio = _telaio.costruisci(prior, importa._regioni(len(prior["membrature"])))
    R = importa.matrice_terna(prior, telaio.nodi)
    nodi = {n.id: n for n in imp.modello.nodi}
    sezioni = {s.id: s for s in imp.modello.sezioni}
    for asta, elemento in zip(imp.modello.aste, telaio.elementi):
        i, j = nodi[asta.nodo_i], nodi[asta.nodo_j]
        asse = np.array([j.x - i.x, j.y - i.y, j.z - i.z])
        asse /= np.linalg.norm(asse)
        verticale = abs(float(asse[2])) > deck._COSENO_VERTICALE
        assert deck._dimensioni_lungo(sezioni[asta.sezione], verticale) == pytest.approx(elemento.sezione)
        e1, e2 = deck._terna(asse, asta.rotazione_deg)
        assert e1 == pytest.approx(R @ np.asarray(elemento.e1), abs=1e-9), asta.nome
        assert e2 == pytest.approx(R @ np.asarray(elemento.e2), abs=1e-9), asta.nome


def test_una_terna_che_non_e_ortonormale_e_rifiutata():
    """Una terna scalata due volte non è una rotazione: passerebbe il controllo di forma e
    renderebbe un modello largo il doppio senza che nulla lo dica."""
    p = _prior(SINTETICO)
    p["terna"] = (2.0 * np.asarray(p["terna"], dtype=float)).tolist()
    with pytest.raises(ValueError, match="terna"):
        importa.importa(p)


def test_se_ogni_nodo_e_al_piede_non_si_propone_niente():
    """Una trave sola poggia tutta a terra: proporre l'incastro su ogni nodo darebbe un
    modello senza niente da calcolare (`check_model` lo rifiuta), quindi non si propone."""
    prior = _prior(SINTETICO)
    prior["membrature"] = [prior["membrature"][1]]  # la sola trave di fondazione
    prior["giunzioni"] = []
    imp = importa.importa(prior)
    assert modello.piedi(imp.modello) == [n.id for n in imp.modello.nodi]
    assert imp.proposte_vincoli == []
    assert imp.resoconto["nota_vincoli"] == "tutti i nodi sarebbero al piede: nessuna proposta"


def test_vincoli_dedotti_non_applicabile_se_tutti_i_nodi_sono_al_piede():
    """Coerente con `proposte_vincoli`: se il check chiedesse di confermare qui, chiederebbe
    di incastrare tutto, e `check_model` lo rifiuterebbe («non resta nulla da calcolare»)."""
    prior = _prior(SINTETICO)
    prior["membrature"] = [prior["membrature"][1]]  # la sola trave di fondazione
    prior["giunzioni"] = []
    imp = importa.importa(prior)
    v = {x["controllo"]: x for x in check.check_model(imp.modello)}["vincoli_dedotti"]
    assert v["esito"] == "non_applicabile"
    assert "tutti i nodi sarebbero al piede" in v["ragione"]


# --- Task 3: la regola del piede sui casi limite ----------------------------

def test_sbalzo_col_traverso_piu_basso_della_radice_non_e_un_piede():
    """Regola 2 di `piedi`: si sale solo lungo aste in piedi. Il traverso che scende dalla
    radice è coricato, quindi non promuove la propria punta a piede."""
    m = modello.Modello(schema_version=1, unita=modello.UNITA, nodi=[
        modello.Nodo(id=1, x=0, y=0, z=0),
        modello.Nodo(id=2, x=0, y=0, z=3000),
        modello.Nodo(id=3, x=2000, y=0, z=2500),  # punta dello sbalzo, più bassa della radice (nodo 2)
    ], aste=[
        modello.Asta(id=1, nodo_i=1, nodo_j=2, sezione=1),
        modello.Asta(id=2, nodo_i=2, nodo_j=3, sezione=1),
    ])
    assert modello.piedi(m) == [1]


def test_trave_di_fondazione_inclinata_ha_tutti_i_nodi_al_piede():
    """Regola 1: si cammina lungo le aste coricate dal nodo di quota minima. Uno 0,5° di
    fuori piombo (pochi mm su metri) non deve fermare il cammino a metà trave."""
    m = modello.Modello(schema_version=1, unita=modello.UNITA, nodi=[
        modello.Nodo(id=1, x=0, y=0, z=0),
        modello.Nodo(id=2, x=3000, y=0, z=20),
        modello.Nodo(id=3, x=6000, y=0, z=5),
    ], aste=[
        modello.Asta(id=1, nodo_i=1, nodo_j=2, sezione=1),
        modello.Asta(id=2, nodo_i=2, nodo_j=3, sezione=1),
    ])
    assert modello.piedi(m) == [1, 2, 3]


def test_due_torri_sconnesse_hanno_ciascuna_i_propri_piedi():
    """Fix round 1: `piedi` partiva da un solo minimo globale e perdeva la fondazione di
    ogni sottostruttura non collegata alla prima. La torre B (fondazione piatta a z=100,
    più alta della base di A) non deve sparire solo perché A è più in basso."""
    m = modello.Modello(schema_version=1, unita=modello.UNITA, nodi=[
        modello.Nodo(id=1, x=0, y=0, z=0),        # piede torre A
        modello.Nodo(id=2, x=0, y=0, z=3000),     # cima torre A
        modello.Nodo(id=3, x=5000, y=0, z=100),   # piede torre B
        modello.Nodo(id=4, x=6000, y=0, z=100),   # piede torre B
    ], aste=[
        modello.Asta(id=1, nodo_i=1, nodo_j=2, sezione=1),
        modello.Asta(id=2, nodo_i=3, nodo_j=4, sezione=1),  # fondazione di B, coricata
    ])
    assert modello.piedi(m) == [1, 3, 4]
    v = {x["controllo"]: x for x in check.check_model(m)}["vincoli_dedotti"]
    assert v["esito"] == "non_passato" and v["oggetto"] == [1, 3, 4]
    assert "2 componenti" in v["ragione"]


def test_aste_tutte_degeneri_non_danno_nessun_piede():
    """Un'asta i=j non entra nel grafo dei vicini: `piedi` resta vuoto anche con aste presenti,
    e `vincoli_dedotti` lo dichiara `non_applicabile` invece di sollevare o fingere un piede."""
    m = modello.Modello(schema_version=1, unita=modello.UNITA, nodi=[
        modello.Nodo(id=1, x=0, y=0, z=0),
        modello.Nodo(id=2, x=0, y=0, z=1000),
    ], aste=[modello.Asta(id=1, nodo_i=1, nodo_j=1, sezione=1)])
    assert modello.piedi(m) == []
    v = {x["controllo"]: x for x in check.check_model(m)}["vincoli_dedotti"]
    assert v["esito"] == "non_applicabile"
    assert "nessun piede" in v["ragione"]


def test_importa_non_riesporta_piedi():
    """`piedi` era importato in `nova/importa.py` e mai usato: un import inutile che i test
    prendevano da lì come se fosse casa sua. La regola del piede vive in `nova.modello`."""
    assert not hasattr(importa, "piedi")


def _rotazione_attorno_a_y(gradi: float) -> np.ndarray:
    c, s = np.cos(np.radians(gradi)), np.sin(np.radians(gradi))
    return np.array([[c, 0.0, s], [0.0, 1.0, 0.0], [-s, 0.0, c]])


def _prior_ruotato(prior: dict, R: np.ndarray) -> dict:
    """Lo stesso rilievo con la nuvola girata: ogni vettore in coordinate nuvola passa per `R`."""
    def g(v):
        return [float(x) for x in R @ np.asarray(v, dtype=float)]

    p = json.loads(json.dumps(prior))
    p["terna"] = [g(r) for r in p["terna"]]
    for v in p["membrature"]:
        for chiave in ("asse", "asse_ideale", "origine"):
            v[chiave] = g(v[chiave])
        v["base_sezione"] = [g(r) for r in v["base_sezione"]]
    for giunzione in p["giunzioni"]:
        giunzione["nodo"] = g(giunzione["nodo"])
    return p


def test_la_terna_ruotata_di_trenta_gradi_da_lo_stesso_telaio():
    """La nuvola girata di 30° attorno alla propria y è lo stesso pezzo visto da un altro
    scanner: i ruoli degli assi si leggono sui punti, non sull'ordine dell'SVD, e il modello
    che ne esce deve avere le stesse estensioni."""
    prior = _prior(SINTETICO)
    R = _rotazione_attorno_a_y(30.0)
    ruotato = _prior_ruotato(prior, R)

    def estremi(p: dict) -> np.ndarray:
        return np.array([np.asarray(v["origine"], dtype=float)
                         + t * v["lunghezza"] * np.asarray(v["asse"], dtype=float)
                         for v in p["membrature"] for t in (0.0, 1.0)])

    base = importa.matrice_terna(prior, estremi(prior))
    girata = importa.matrice_terna(ruotato, estremi(ruotato))

    assert np.allclose(girata @ girata.T, np.eye(3), atol=1e-9)      # ortonormale
    assert float(np.linalg.det(girata)) == pytest.approx(1.0, abs=1e-9)   # destrorsa
    # ey resta il fuori piano (estensione minima), ez segue la verticale del pezzo
    estensioni = np.ptp(estremi(ruotato) @ girata.T, axis=0)
    assert int(np.argmin(estensioni)) == 1
    assert float(girata[2] @ (R @ base[2])) == pytest.approx(1.0, abs=1e-9)
    assert np.allclose(girata, base @ R.T, atol=1e-9)

    m = importa.importa(ruotato).modello
    atteso = importa.importa(prior).modello
    for asse in ("x", "z"):
        misurato = [getattr(n, asse) for n in m.nodi]
        riferimento = [getattr(n, asse) for n in atteso.nodi]
        assert max(misurato) - min(misurato) == pytest.approx(
            max(riferimento) - min(riferimento), abs=1e-6), asse
