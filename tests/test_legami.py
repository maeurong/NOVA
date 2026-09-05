"""I legami non lineari dalla classe NTC e dalla veste (doc di ricerca 09 §1.3, §2, §3.3, §7).

Gli oracoli numerici sono quelli del §7 («Oracoli per il codice») e del §3.3: C25/30 veste
media → `E_c` = `E_cm` = 31 476; pilastro 30×50 con staffe Ø8/100 e 8Ø20 → `α` = 0,416,
`σ2` = 0,892 MPa, `f_ck,c` = 29,46 MPa, `ε_cu2,c` = 0,0106; B450C con `k` = 1,15 → `b` = 0,0045.
"""
import math

import pytest

from conftest import leggi_fixture
from nova import legami, modello
from nova.modello import Legame, Sezione, Staffe

E_CM_C25 = 31475.806210019346  # 22000·(33/10)^0,3, [11.2.5]


def _pilastro():
    return modello.carica(leggi_fixture("pilastro_30x50.nova.json"))


def _barre(s: Sezione):
    from nova.deck import _barre as posizioni
    return posizioni(s, False)


def _con_legame(m, id_materiale: int, **campi):
    """Lo stesso modello con un `Legame` diverso su un materiale: il legame è un campo del
    materiale, e i test lo cambiano senza riscrivere la fixture."""
    dati = m.model_dump(mode="json", exclude_none=True)
    for mat in dati["materiali"]:
        if mat["id"] == id_materiale:
            mat["legame"] = {**mat.get("legame", {}), **campi}
    return modello.carica(dati)


# --- §1.3: il copriferro C25/30 in veste media, parametro per parametro ---

def test_copriferro_c25_30_media_ha_i_numeri_del_par_1_3():
    """`Ec` non è un parametro di `Concrete02`: chi fissa `fpc` e `epsc0` l'ha già fissato.
    `epsc0 = 2 f_cm/E_cm` è l'unica coppia che restituisce `E_cm` (doc 09 §1.3)."""
    m = _pilastro()
    d = legami.calcestruzzo(m.materiale(1), "media", m.sezione(1))
    c = d["copriferro"]
    assert c["tipo"] == "concrete02"
    assert c["fpc"] == pytest.approx(-33.0)
    assert c["epsc0"] == pytest.approx(-0.002097, abs=1e-6)
    assert c["Ec"] == pytest.approx(E_CM_C25, abs=1.0)
    assert c["ft"] == pytest.approx(2.565, abs=1e-3)
    assert c["Ets"] == pytest.approx(c["ft"] / 0.002)
    assert c["fpcu"] == pytest.approx(-6.6)
    assert c["epsU"] == pytest.approx(-0.0035)
    assert c["lambda"] == pytest.approx(0.1)


def test_veste_caratteristica_e_di_progetto_cambiano_fpc_e_la_progetto_avvisa():
    """La veste `progetto` non è un rifiuto: è un avviso. Dimezzare la rigidezza è una
    scelta che si dichiara, non un errore da bloccare (vincolo globale T4)."""
    m = _pilastro()
    car = legami.calcestruzzo(m.materiale(1), "caratteristica", m.sezione(1))
    assert car["copriferro"]["fpc"] == pytest.approx(-25.0)
    assert car["avvisi"] == []
    pro = legami.calcestruzzo(m.materiale(1), "progetto", m.sezione(1))
    assert pro["copriferro"]["fpc"] == pytest.approx(-14.17, abs=5e-3)
    assert any("veste di progetto nel legame" in a for a in pro["avvisi"])


def test_veste_esistente_e_la_media_con_fc_uguale_a_uno_e_una_nota():
    m = _pilastro()
    esi = legami.calcestruzzo(m.materiale(1), "esistente", m.sezione(1))
    med = legami.calcestruzzo(m.materiale(1), "media", m.sezione(1))
    assert esi["copriferro"]["fpc"] == pytest.approx(med["copriferro"]["fpc"])
    assert any("FC" in n for n in esi["note"])
    assert esi["avvisi"] == []


# --- §3.3: il confinamento NTC sul pilastro 30×50 ---

def test_confinamento_ntc_sul_pilastro_del_par_3_3():
    """`Σ b_i²` = 4·116² + 4·216², `α_n` 0,600 · `α_s` 0,694 → `α` = 0,416; `σ_l` 2,143 →
    `σ2` = 0,892 ≤ 0,05·25 → [4.1.8] → `f_ck,c` = 29,46 e `ε_cu2,c` = 0,0106."""
    s = _pilastro().sezione(1)
    c = legami.confinamento_ntc(s.b, s.h, s.copriferro, s.staffe, _barre(s), 25.0)
    assert (c["bx"], c["by"]) == (232.0, 432.0)
    assert c["alpha_n"] == pytest.approx(0.600, abs=5e-4)
    assert c["alpha_s"] == pytest.approx(0.694, abs=5e-4)
    assert c["alpha"] == pytest.approx(0.416, abs=5e-3)
    assert c["sigma_l"] == pytest.approx(2.143, abs=1e-3)
    assert c["sigma2"] == pytest.approx(0.892, abs=1e-2)
    assert c["articolo"] == "[4.1.8]"
    assert c["fck_c"] == pytest.approx(29.46, abs=5e-2)
    assert c["epsc2_c"] == pytest.approx(0.00278, abs=1e-5)
    assert c["epscu2_c"] == pytest.approx(0.0106, abs=2e-4)


def test_la_soglia_di_005_fck_sceglie_fra_4_1_8_e_4_1_9():
    """Stesso pilastro, passo dimezzato: `σ2` passa da 0,036 `f_ck` a 0,087 `f_ck` e
    l'articolo cambia. La [4.1.9] deve restare continua nell'intorno della soglia."""
    s = _pilastro().sezione(1)
    largo = legami.confinamento_ntc(s.b, s.h, s.copriferro, Staffe(diametro=8, passo=100, bracci=3),
                                    _barre(s), 25.0)
    fitto = legami.confinamento_ntc(s.b, s.h, s.copriferro, Staffe(diametro=8, passo=50, bracci=3),
                                    _barre(s), 25.0)
    assert largo["sigma2"] <= 0.05 * 25.0 and largo["articolo"] == "[4.1.8]"
    assert fitto["sigma2"] > 0.05 * 25.0 and fitto["articolo"] == "[4.1.9]"
    assert fitto["fck_c"] == pytest.approx(33.53, abs=5e-2)
    assert fitto["fck_c"] > largo["fck_c"]


def test_sezione_senza_barre_non_divide_per_zero():
    """Nessuna barra longitudinale contenuta: `α_n` = 0, quindi `α` = 0 e nessun
    confinamento — non una divisione per zero sul numero di interassi."""
    s = _pilastro().sezione(1)
    c = legami.confinamento_ntc(s.b, s.h, s.copriferro, s.staffe, [], 25.0)
    assert c["alpha_n"] == 0.0 and c["alpha"] == 0.0
    assert c["sigma2"] == 0.0 and c["fck_c"] == pytest.approx(25.0)
    assert any("barra" in n for n in c["note"])


def test_staffe_rade_danno_alpha_zero_e_non_negativo():
    """`s ≥ 2 b_x` annulla `α_s` [4.1.12.g]: i due fattori negativi si moltiplicherebbero
    in un `α_s` positivo, e il nucleo risulterebbe confinato da staffe che non lo toccano."""
    s = _pilastro().sezione(1)
    c = legami.confinamento_ntc(s.b, s.h, s.copriferro, Staffe(diametro=8, passo=600, bracci=3),
                                _barre(s), 25.0)
    assert c["alpha_s"] == 0.0 and c["alpha"] == 0.0
    assert c["fck_c"] == pytest.approx(25.0)
    assert c["epscu2_c"] == pytest.approx(0.0035)


def test_senza_staffe_il_confinamento_si_spegne_e_il_nucleo_e_il_copriferro():
    m = _pilastro()
    dati = m.model_dump(mode="json", exclude_none=True)
    dati["sezioni"][0].pop("staffe")
    dati["sezioni"][0]["file"] = []
    senza = modello.carica(dati)
    d = legami.calcestruzzo(senza.materiale(1), "media", senza.sezione(1))
    assert d["nucleo"] == d["copriferro"]
    assert any("staffe" in n for n in d["note"])


# --- il nucleo confinato dentro il legame ---

def test_nucleo_ntc_in_veste_media_ha_i_numeri_del_par_3_3():
    """Con `f_cm` = 33: `f_c,c` = 37,46, `ε_c2,c` = 0,00258, `ε_cu2,c` = 0,0089 (doc 09 §3.3)."""
    m = _pilastro()
    n = legami.calcestruzzo(m.materiale(1), "media", m.sezione(1))["nucleo"]
    assert n["tipo"] == "concrete02"
    assert n["fcc"] == pytest.approx(37.46, abs=5e-2)
    assert n["epscc"] == pytest.approx(0.00258, abs=1e-5)
    assert n["epscu"] == pytest.approx(0.0089, abs=2e-4)
    assert n["fpc"] == pytest.approx(-n["fcc"]) and n["epsc0"] == pytest.approx(-n["epscc"])
    assert n["alpha"] == pytest.approx(0.416, abs=5e-3)
    assert n["articolo"] == "[4.1.8]"


def test_epsU_dichiarati_vincono_sulla_norma_e_sulla_prassi():
    """`epsU_nucleo` esplicito vince sulla [4.1.11]; `epsU_copriferro` 0,01 è la prassi di
    convergenza dopo l'espulsione del copriferro (doc 09 §1.3), e si accetta."""
    m = _con_legame(_pilastro(), 1, epsU_nucleo=0.02, epsU_copriferro=0.01)
    d = legami.calcestruzzo(m.materiale(1), "media", m.sezione(1))
    assert d["nucleo"]["epsU"] == pytest.approx(-0.02)
    assert d["copriferro"]["epsU"] == pytest.approx(-0.01)


def test_mander_scrive_un_concrete04_con_Ec_esplicito_e_non_un_concrete02():
    """L'`ε_cc` di Mander dentro `epsc0` di `Concrete02` abbasserebbe la rigidezza del nucleo
    proprio quando lo si confina di più (doc 09 §3.4): con Mander si passa a `Concrete04`,
    dove `Ec` è un argomento indipendente e vale `E_cm`."""
    m = _con_legame(_pilastro(), 1, confinamento="mander")
    d = legami.calcestruzzo(m.materiale(1), "media", m.sezione(1))
    n = d["nucleo"]
    assert n["tipo"] == "concrete04"
    assert n["Ec"] == pytest.approx(E_CM_C25, abs=1.0)
    assert n["fcc"] == pytest.approx(39.08, abs=5e-2)
    assert n["epscc"] == pytest.approx(0.003842, abs=1e-5)
    assert n["epscc"] != pytest.approx(2 * n["fcc"] / E_CM_C25)  # non è la parabola di Concrete02
    assert "Mander" in n["articolo"]
    riga = legami.righe_tcl(7, n)[0]
    assert riga.startswith("uniaxialMaterial Concrete04 7 ")
    assert "Concrete02" not in riga


# --- §2: l'acciaio ---

def test_steel02_b450c_ha_i_numeri_del_par_2():
    m = _pilastro()
    a = legami.acciaio(m.materiale(2), "media")
    assert a["tipo"] == "steel02"
    assert a["Fy"] == pytest.approx(450.0)
    assert a["E"] == pytest.approx(200000.0)
    assert a["b"] == pytest.approx(0.0045, abs=5e-4)
    assert a["eps_ud"] == pytest.approx(0.0675)
    assert (a["R0"], a["cR1"], a["cR2"]) == (18, 0.925, 0.15)


def test_b450a_cambia_eps_ud_e_ricalcola_b():
    """B450A ha gli stessi 450 nominali e cambia solo `ε_uk` (2,5 %): la differenza sta in
    `b` e nel limite di deformazione, non in `Fy` (doc 09 §2)."""
    m = _pilastro()
    dati = m.model_dump(mode="json", exclude_none=True)
    for mat in dati["materiali"]:
        if mat["id"] == 2:
            mat["classe"] = "B450A"
    a = legami.acciaio(modello.carica(dati).materiale(2), "media")
    assert a["Fy"] == pytest.approx(450.0)
    assert a["eps_ud"] == pytest.approx(0.0225)
    assert a["b"] == pytest.approx(0.00476, abs=1e-4)


def test_fym_e_b_dichiarati_vincono():
    m = _con_legame(_pilastro(), 2, fym=480.0, b=0.01)
    a = legami.acciaio(m.materiale(2), "media")
    assert a["Fy"] == pytest.approx(480.0)
    assert a["b"] == pytest.approx(0.01)


# --- il materiale sbagliato, e la sola funzione che formatta ---

def test_il_materiale_del_tipo_sbagliato_e_rifiutato_col_proprio_nome():
    m = _pilastro()
    with pytest.raises(ValueError, match="B450C"):
        legami.calcestruzzo(m.materiale(2), "media", m.sezione(1))
    with pytest.raises(ValueError, match="C25/30"):
        legami.acciaio(m.materiale(1), "media")


def test_righe_tcl_rifiuta_una_compressione_positiva():
    """Guardia contro un segno scappato: `Concrete02` «compressive concrete parameters
    should be input as negative values» (doc OpenSees, doc 09 §1.1)."""
    m = _pilastro()
    c = dict(legami.calcestruzzo(m.materiale(1), "media", m.sezione(1))["copriferro"])
    c["fpc"] = -c["fpc"]
    with pytest.raises(ValueError, match="compressioni negative"):
        legami.righe_tcl(3, c)


def test_righe_tcl_e_la_sola_formattazione_e_stampa_la_provenienza():
    m = _pilastro()
    d = legami.calcestruzzo(m.materiale(1), "media", m.sezione(1))
    riga = legami.righe_tcl(2, d["copriferro"])[0]
    campi = riga.split(";#")[0].split()
    assert campi[:3] == ["uniaxialMaterial", "Concrete02", "2"]
    assert [float(x) for x in campi[3:5]] == pytest.approx([-33.0, -0.002097], abs=1e-6)
    provenienza = riga.split(";#")[1]
    assert "C25/30" in provenienza and "media" in provenienza
    acciaio = legami.righe_tcl(3, legami.acciaio(m.materiale(2), "media"))[0]
    assert acciaio.split()[:3] == ["uniaxialMaterial", "Steel02", "3"]
    assert "B450C" in acciaio


# --- il campo `legame` nel modello dati ---

def test_lambda_si_carica_dal_json_col_suo_nome_di_norma():
    """`lambda` è una parola riservata di Python: il campo si chiama `lambda_` e l'alias
    tiene il nome che il file JSON e la riga Tcl portano davvero."""
    m = _con_legame(_pilastro(), 1, **{"lambda": 0.2})
    assert m.materiale(1).legame.lambda_ == pytest.approx(0.2)
    assert m.model_dump(mode="json")["materiali"][0]["legame"]["lambda"] == pytest.approx(0.2)
    assert Legame(lambda_=0.3).lambda_ == pytest.approx(0.3)


def test_il_legame_di_default_e_elastico_e_confinato_secondo_ntc():
    lg = Legame()
    assert (lg.tipo, lg.confinamento) == ("elastico", "ntc")
    assert lg.epsU_copriferro == pytest.approx(0.0035) and lg.epsU_nucleo is None
    assert math.isclose(lg.fpcu_su_fpc, 0.2) and math.isclose(lg.Es, 200000.0)
