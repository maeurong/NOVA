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
    """`b_i` è l'interasse fra barre consecutive lungo il perimetro, coi centri veri:
    `Σ b_i²` = 4·102² + 4·202² = 204 832, `α_n` 0,6594 · `α_s` 0,6937 → `α` = 0,4574;
    `σ_l` 2,1435 → `σ2` = 0,9804 ≤ 0,05·25 → [4.1.8] → `f_ck,c` 29,902, `ε_cu2,c` 0,011343.

    Il doc §3.3 dà 0,416 e 0,892 perché idealizza le barre d'angolo **sullo spigolo** del
    nucleo (`Σ b_i²` = 4·116² + 4·216², cioè `b_x/2` e `b_y/2`); i centri veri stanno 14 mm
    più dentro, fra linea media della staffa (30 + 8/2) e centro barra (30 + 8 + 20/2).
    """
    s = _pilastro().sezione(1)
    c = legami.confinamento_ntc(s.b, s.h, s.copriferro, s.staffe, _barre(s), 25.0)
    assert (c["bx"], c["by"]) == (232.0, 432.0)
    assert c["alpha_n"] == pytest.approx(0.65938, rel=5e-3)
    assert c["alpha_s"] == pytest.approx(0.69369, rel=5e-3)
    assert c["alpha"] == pytest.approx(0.45740, rel=5e-3)
    # `σ_l,x` e `σ_l,y` sono diverse fra loro e ciascuna al suo posto: asserire la sola media
    # geometrica `σ_l` = √(σ_lx σ_ly) lascerebbe passare uno scambio x↔y, che è simmetrico
    assert c["sigma_lx"] == pytest.approx(1.5708, rel=5e-3)  # A_st f_yk,st/(b_y s), [4.1.12.b]
    assert c["sigma_ly"] == pytest.approx(2.9249, rel=5e-3)  # A_st f_yk,st/(b_x s)
    assert c["sigma_l"] == pytest.approx(2.1435, rel=5e-3)
    assert c["sigma2"] == pytest.approx(0.98042, rel=5e-3)
    assert c["articolo"] == "[4.1.8]"
    assert c["fck_c"] == pytest.approx(29.902, rel=5e-3)
    assert c["epsc2_c"] == pytest.approx(0.0028612, rel=5e-3)
    assert c["epscu2_c"] == pytest.approx(0.011343, rel=5e-3)


def test_senza_barre_dangolo_trattenute_il_confinamento_non_si_applica():
    """Quattro barre a mezzeria delle facce: il reticolo delle [4.1.12.f-g] non ha vertici,
    e senza la regola d'angolo la sola `Σ b_i²` darebbe `α_n` = 0,659 — cioè lo stesso
    confinamento di otto barre ben disposte, da un'armatura che non ne trattiene nessuna."""
    m = _pilastro()
    dati = m.model_dump(mode="json", exclude_none=True)
    dati["sezioni"][0]["file"] = [{"lato": l, "n": 1, "diametro": 20} for l in ("inf", "sup", "sx", "dx")]
    s = modello.carica(dati).sezione(1)
    c = legami.confinamento_ntc(s.b, s.h, s.copriferro, s.staffe, _barre(s), 25.0)
    assert c["alpha_n"] == 0.0 and c["alpha"] == 0.0
    assert c["fck_c"] == pytest.approx(25.0) and c["epscu2_c"] == pytest.approx(0.0035)
    assert any("barre d'angolo" in n for n in c["note"])


def test_una_sola_barra_non_confina_e_non_solleva():
    m = _pilastro()
    dati = m.model_dump(mode="json", exclude_none=True)
    dati["sezioni"][0]["file"] = [{"lato": "inf", "n": 1, "diametro": 20}]
    s = modello.carica(dati).sezione(1)
    c = legami.confinamento_ntc(s.b, s.h, s.copriferro, s.staffe, _barre(s), 25.0)
    assert c["alpha"] == 0.0 and c["fck_c"] == pytest.approx(25.0)


def test_barre_solo_su_inf_e_sup_chiudono_il_perimetro_sui_due_lati_corti():
    """Nessuna barra `sx`/`dx`: il giro ha quattro `b_i` da 102 lungo le facce lunghe e due
    da 404 — l'altezza interna fra le barre d'angolo — lungo i lati corti, che restano senza
    barre intermedie. `Σ b_i²` = 4·102² + 2·404² = 368 048, `α_n` = 0,388."""
    m = _pilastro()
    dati = m.model_dump(mode="json", exclude_none=True)
    dati["sezioni"][0]["file"] = [{"lato": "inf", "n": 3, "diametro": 20},
                                  {"lato": "sup", "n": 3, "diametro": 20}]
    s = modello.carica(dati).sezione(1)
    c = legami.confinamento_ntc(s.b, s.h, s.copriferro, s.staffe, _barre(s), 25.0)
    assert c["alpha_n"] == pytest.approx(0.38796, rel=5e-3)
    assert c["alpha"] == pytest.approx(0.26912, rel=5e-3)
    assert c["fck_c"] == pytest.approx(27.884, rel=5e-3) and c["note"] == []


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
    assert fitto["fck_c"] == pytest.approx(34.065, rel=5e-3)
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
    """Il ramo `nessuno` non è un dizionario diverso: stesse chiavi degli altri due, con
    `confinamento` e `articolo` al loro posto, così chi legge non deve indovinare il ramo."""
    m = _pilastro()
    dati = m.model_dump(mode="json", exclude_none=True)
    dati["sezioni"][0].pop("staffe")
    dati["sezioni"][0]["file"] = []
    senza = modello.carica(dati)
    d = legami.calcestruzzo(senza.materiale(1), "media", senza.sezione(1))
    n, c = d["nucleo"], d["copriferro"]
    assert [n[k] for k in ("fpc", "epsc0", "fpcu", "epsU", "ft", "Ets", "Ec")] == \
           [c[k] for k in ("fpc", "epsc0", "fpcu", "epsU", "ft", "Ets", "Ec")]
    assert n["confinamento"] == "nessuno" and d["confinamento"] == "nessuno"
    assert n["articolo"] == c["articolo"]
    assert (n["alpha"], n["sigma2"]) == (0.0, 0.0) and n["fcc"] == pytest.approx(33.0)
    assert any("staffe" in x for x in d["note"])


def test_senza_confinamento_lepsU_del_nucleo_dichiarato_vale_lo_stesso():
    """`epsU_nucleo` è una deroga del materiale, non del ramo: vale anche quando il nucleo
    non è confinato, altrimenti chi lo dichiara lo vede sparire senza un motivo detto."""
    m = _con_legame(_pilastro(), 1, confinamento="nessuno", epsU_nucleo=0.008)
    d = legami.calcestruzzo(m.materiale(1), "media", m.sezione(1))
    assert d["nucleo"]["epsU"] == pytest.approx(-0.008)
    assert d["copriferro"]["epsU"] == pytest.approx(-0.0035)


def test_calcestruzzo_senza_barre_dangolo_degrada_a_confinamento_nessuno():
    """Il ramo `α_n` = 0 di `confinamento_ntc` non resta dentro il dizionario intermedio:
    `calcestruzzo()` lo vede (`conf["alpha"] == 0.0`) e scrive lo stesso legame del copriferro,
    con `confinamento: nessuno` — non un `Concrete02` confinato con resistenza nulla in più.
    Deferred della review round 1 (ledger T4), mai chiuso a livello di `calcestruzzo()`."""
    m = _pilastro()
    dati = m.model_dump(mode="json", exclude_none=True)
    dati["sezioni"][0]["file"] = [{"lato": l, "n": 1, "diametro": 20} for l in ("inf", "sup", "sx", "dx")]
    s = modello.carica(dati).sezione(1)
    d = legami.calcestruzzo(m.materiale(1), "media", s)
    assert d["confinamento"] == "nessuno"
    assert d["nucleo"]["fcc"] == pytest.approx(d["copriferro"]["fpc"] * -1)
    assert [d["nucleo"][k] for k in ("fpc", "epsc0", "epsU")] == \
           [d["copriferro"][k] for k in ("fpc", "epsc0", "epsU")]


def test_calcestruzzo_con_staffe_rade_degrada_a_confinamento_nessuno():
    """Stesso degrado, dall'altro fattore: `α_s` = 0 per passo ≥ 2·b_x, non `α_n`. Le due
    strade diverse devono arrivare allo stesso `nessuno` in `calcestruzzo()`, non solo in
    `confinamento_ntc()` (deferred della review round 1, ledger T4)."""
    m = _pilastro()
    dati = m.model_dump(mode="json", exclude_none=True)
    dati["sezioni"][0]["staffe"]["passo"] = 600
    s = modello.carica(dati).sezione(1)
    d = legami.calcestruzzo(m.materiale(1), "media", s)
    assert d["confinamento"] == "nessuno"
    assert d["nucleo"]["fcc"] == pytest.approx(33.0)  # f_cm senza incremento di confinamento


# --- il nucleo confinato dentro il legame ---

def test_nucleo_ntc_in_veste_media_ha_i_numeri_del_par_3_3():
    """La riga «con `f_cm` = 33» del §3.3, coi `b_i` veri: `f_c,c` = 37,902, `ε_c2,c` =
    0,0026383, `ε_cu2,c` = 0,0094420 (il doc dà 37,46/0,00258/0,0089 con `α` = 0,416)."""
    m = _pilastro()
    n = legami.calcestruzzo(m.materiale(1), "media", m.sezione(1))["nucleo"]
    assert n["tipo"] == "concrete02" and n["confinamento"] == "ntc"
    assert n["fcc"] == pytest.approx(37.902, rel=5e-3)
    assert n["epscc"] == pytest.approx(0.0026383, rel=5e-3)
    assert n["epscu"] == pytest.approx(0.0094420, rel=5e-3)
    assert n["fpc"] == pytest.approx(-n["fcc"]) and n["epsc0"] == pytest.approx(-n["epscc"])
    assert n["alpha"] == pytest.approx(0.45740, rel=5e-3)
    # l'articolo del nucleo porta anche la veste da cui esce `f_c`: la [4.1.8] è un fattore
    # moltiplicativo, e da sola non direbbe su quale resistenza ha moltiplicato (fix round 1, C8)
    assert n["articolo"] == "[11.2.2], [11.2.3a], [4.1.8]"


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
    assert n["fcc"] == pytest.approx(39.636, rel=5e-3)
    assert n["epscc"] == pytest.approx(0.0040110, rel=5e-3)
    assert n["epscc"] != pytest.approx(2 * n["fcc"] / E_CM_C25)  # non è la parabola di Concrete02
    assert "Mander" in n["articolo"]
    riga = legami.righe_tcl(7, n)[0]
    assert riga.startswith("uniaxialMaterial Concrete04 7 ")
    assert "Concrete02" not in riga


# --- §2: l'acciaio ---

def test_steel02_b450c_ha_i_numeri_del_par_2():
    """`b` = (k−1)·f_y/((ε_ud − f_y/E_s)·E_s) con **lo stesso** `f_y` che entra in `Fy`:
    con 450 vale 0,00517. Il doc §2 dà 0,0045 perché mette `f_yd` = 391,3 nel rapporto, e i
    valori di progetto stanno fuori dal legame (vincolo globale di T4)."""
    m = _pilastro()
    a = legami.acciaio(m.materiale(2), "media")
    assert a["tipo"] == "steel02"
    assert a["Fy"] == pytest.approx(450.0)
    assert a["E"] == pytest.approx(200000.0)
    assert a["b"] == pytest.approx(0.0052, abs=3e-4)
    assert a["eps_ud"] == pytest.approx(0.0675)
    assert (a["R0"], a["cR1"], a["cR2"]) == (18, 0.925, 0.15)


def test_fym_dichiarato_sposta_anche_il_ramo_incrudente():
    """`fym` da solo non tocca solo `Fy`: `b` è la pendenza della retta che parte da quel
    punto di snervamento, e lasciarlo al valore di catalogo darebbe una spezzata scollegata."""
    m = _con_legame(_pilastro(), 2, fym=600.0)
    a = legami.acciaio(m.materiale(2), "media")
    assert a["Fy"] == pytest.approx(600.0)
    assert a["b"] == pytest.approx(0.0069767, rel=5e-3)
    assert a["b"] > legami.acciaio(_pilastro().materiale(2), "media")["b"]


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
    assert a["b"] == pytest.approx(0.0055556, rel=5e-3)


def test_fym_e_b_dichiarati_vincono_tutti_e_due():
    """`b` dichiarato non si ricalcola nemmeno con `fym` accanto: due deroghe esplicite,
    nessuna delle due deve mangiarsi l'altra."""
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


def test_la_veste_sconosciuta_e_rifiutata_col_proprio_nome():
    m = _pilastro()
    with pytest.raises(ValueError, match="«medie»"):
        legami.calcestruzzo(m.materiale(1), "medie", m.sezione(1))
    with pytest.raises(ValueError, match="«medie»"):
        legami.acciaio(m.materiale(2), "medie")


@pytest.mark.parametrize("parametro", ["fpc", "epsc0", "fpcu", "epsU"])
def test_righe_tcl_rifiuta_una_compressione_positiva(parametro):
    """Guardia contro un segno scappato, su tutti e quattro e non sul solo `fpc`:
    `Concrete02` «compressive concrete parameters should be input as negative values»
    (doc OpenSees, doc 09 §1.1)."""
    m = _pilastro()
    c = dict(legami.calcestruzzo(m.materiale(1), "media", m.sezione(1))["copriferro"])
    c[parametro] = -c[parametro]
    with pytest.raises(ValueError, match=f"compressioni negative: {parametro} "):
        legami.righe_tcl(3, c)


def test_righe_tcl_rifiuta_una_rottura_prima_del_picco():
    """`|epsU| ≤ |epsc0|` è una parabola che si schiaccia prima di arrivare in cima:
    l'interprete la manda giù e il materiale non ha mai la sua resistenza di picco."""
    m = _con_legame(_pilastro(), 1, epsU_copriferro=0.001)  # < epsc0 = 0,0021
    c = legami.calcestruzzo(m.materiale(1), "media", m.sezione(1))["copriferro"]
    with pytest.raises(ValueError, match="precede il picco"):
        legami.righe_tcl(3, c)


def test_righe_tcl_scrive_i_sei_parametri_del_concrete04_nell_ordine_giusto():
    """`_ORDINE["concrete04"]` ha un ordine diverso dal `Concrete02` (niente `fpcu`/`lambda`,
    `Ec` esplicito al quarto posto): nessun test esistente lo verificava per intero, solo il
    prefisso `uniaxialMaterial Concrete04` (deferred della review round 1, ledger T4)."""
    m = _con_legame(_pilastro(), 1, confinamento="mander")
    n = legami.calcestruzzo(m.materiale(1), "media", m.sezione(1))["nucleo"]
    riga = legami.righe_tcl(9, n)[0]
    campi = riga.split(";#")[0].split()
    assert campi[:3] == ["uniaxialMaterial", "Concrete04", "9"]
    assert [float(x) for x in campi[3:9]] == pytest.approx(
        [n["fpc"], n["epsc0"], n["epsU"], n["Ec"], n["ft"], n["et"]])
    assert "Mander" in riga.split(";#")[1]


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


def test_il_legame_di_default_e_confinato_secondo_ntc():
    lg = Legame()
    assert lg.confinamento == "ntc"
    assert lg.epsU_copriferro == pytest.approx(0.0035) and lg.epsU_nucleo is None
    assert math.isclose(lg.fpcu_su_fpc, 0.2) and math.isclose(lg.Es, 200000.0)


@pytest.mark.parametrize("campo,valore", [
    ("Es", 0.0), ("epsU_copriferro", 0.0), ("R0", 0.0), ("fpcu_su_fpc", -0.1),
    ("epsU_nucleo", 0.0), ("b", -1.0), ("lambda", 1.5), ("lambda", -0.1),
    # I tetti fisici: senza, un numero enorme non è un rifiuto ma un `inf` dentro la riga
    # `uniaxialMaterial`, che l'interprete manda giù. `fpcu/fpc` è un rapporto di resistenze
    # (residua ≤ di picco), `epsU` una deformazione (10 % è già assurdo), `E_s` un modulo,
    # `b` il rapporto fra due pendenze, `R0` il parametro di transizione di Steel02 (18 di
    # prassi, la doc OpenSees consiglia 10÷20).
    ("fpcu_su_fpc", 1e307), ("fpcu_su_fpc", 1.5), ("Es", 1e307), ("epsU_copriferro", 1.0),
    ("epsU_nucleo", 1.0), ("R0", 1e307), ("b", 2.0),
])
def test_il_legame_rifiuta_i_numeri_che_non_stanno_in_piedi(campo, valore):
    """`Es` = 0 dà una divisione per zero in `b`, `epsU` = 0 un materiale senza ramo,
    `lambda` fuori da [0,1] un rapporto fra pendenze che pendenza non è. Il rifiuto sta nel
    modello dati e non in `legami.py`: così vale anche per un JSON scritto a mano."""
    with pytest.raises(ValueError, match=campo):
        modello.carica({"unita": "mm-N-MPa-t-s", "materiali": [
            {"id": 1, "nome": "C25/30", "tipo": "calcestruzzo", "classe": "C25/30",
             "legame": {campo: valore}}]})


# --- §4 (sicurezza): quel che `Materiale.valori` personalizzato può ancora far passare ---

def _personalizzato(id_materiale: int, **valori):
    """La stessa fixture con un materiale a valori scritti a mano: `catalogo.valori` li lascia
    passare per costruzione (è la via per un calcestruzzo misurato in opera), e i tetti del
    `Legame` non li vedono — sono l'ultimo ingresso libero che arriva fino alla riga Tcl."""
    dati = leggi_fixture("pilastro_30x50.nova.json")
    for mat in dati["materiali"]:
        if mat["id"] == id_materiale:
            mat["personalizzato"], mat["valori"] = True, dict(valori)
    return modello.carica(dati)


def test_righe_tcl_rifiuta_un_parametro_non_finito_e_lo_nomina():
    """`fcm: 1e308` fa traboccare `epsc0 = 2 f_c/E_cm` a `-inf` e `Ec` a `nan`: senza guardia
    la riga porta `-inf` nel `.tcl`, e `nan >= 0` è `False`, quindi il controllo dei segni la
    lascia passare. Il rifiuto nomina il parametro, come fa `passi._matrice` con i recorder."""
    m = _personalizzato(1, fcm=1e308)
    c = legami.calcestruzzo(m.materiale(1), "media", m.sezione(1))["copriferro"]
    assert not math.isfinite(c["epsc0"]) and not math.isfinite(c["Ec"])
    with pytest.raises(ValueError, match="epsc0 = -inf non è un numero finito"):
        legami.righe_tcl(3, c)


def test_righe_tcl_non_scrive_mai_inf_o_nan_nella_riga():
    """L'oracolo del brief §4: mai `inf` nel `.tcl`. Vale su tutti i parametri, non sui soli
    quattro di compressione — `Ets`, `ft`, `Ec` e i sei di `Steel02` non erano guardati."""
    m = _personalizzato(1, fctm=1e308)  # `Ets` = f_ct/ε_c2 trabocca, i segni restano buoni
    c = legami.calcestruzzo(m.materiale(1), "media", m.sezione(1))["copriferro"]
    assert not math.isfinite(c["Ets"])
    with pytest.raises(ValueError, match="Ets = inf non è un numero finito"):
        legami.righe_tcl(3, c)


# --- §6/W2: il ramo incrudente di `Steel02` non può scendere ---

def test_acciaio_rifiuta_una_deformazione_ultima_dentro_lo_snervamento():
    """`b` è la pendenza della retta da (ε_y, f_y) a (ε_ud, k f_y): con `ε_ud ≤ f_y/E_s` il
    denominatore è negativo (o nullo) e ne esce un `b` **negativo** — `Steel02` che perde
    resistenza dopo lo snervamento. Misurato dal reviewer: `epsuk 0.002` → −0,75 nel `.tcl`."""
    m = _personalizzato(2, epsuk=0.002)  # ε_ud = 0,0018 < f_y/E_s = 0,00225
    with pytest.raises(ValueError, match="B450C"):
        legami.acciaio(m.materiale(2), "media")


def test_acciaio_col_denominatore_esatto_non_divide_per_zero():
    """`ε_ud = f_y/E_s` **esatto** era una `ZeroDivisionError` nuda, non un rifiuto: la
    guardia è `<=` e non `<` proprio per questo. `f_ym` si prende dall'uguaglianza, che in
    virgola mobile chiude (`(ε_ud·E_s)/E_s == ε_ud`)."""
    base = legami.acciaio(_pilastro().materiale(2), "media")
    m = _con_legame(_pilastro(), 2, fym=base["eps_ud"] * base["E"])
    with pytest.raises(ValueError, match="oltre lo snervamento"):
        legami.acciaio(m.materiale(2), "media")


def test_acciaio_col_fym_oltre_lo_snervamento_nomina_il_materiale():
    """Ingresso degenere: `fym` dichiarato tale che `fym/E_s ≥ ε_ud`. Il rifiuto nomina il
    materiale — non è la classe a essere sbagliata, è la deroga scritta accanto."""
    m = _con_legame(_pilastro(), 2, fym=20000.0)  # 20000/200000 = 0,1 > ε_ud = 0,0675
    with pytest.raises(ValueError, match="B450C"):
        legami.acciaio(m.materiale(2), "media")


def test_righe_tcl_rifiuta_un_ramo_incrudente_calante():
    """Ultima rete, per un dizionario costruito a mano: `b < 0` non è un materiale."""
    m = _pilastro()
    a = dict(legami.acciaio(m.materiale(2), "media")) | {"b": -0.75}
    with pytest.raises(ValueError, match="b = -0.75"):
        legami.righe_tcl(3, a)
