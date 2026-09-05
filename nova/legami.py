"""Classe NTC + veste → parametri di `Concrete02`, `Concrete04` e `Steel02`.

Ricerca: `docs/ricerca/09-legami-costitutivi-ntc.md`. Le tre regole che comandano il modulo:

1. `Concrete02` vuole compressioni negative e non ha `Ec` fra i parametri: la rigidezza
   iniziale **è** `2 fpc/epsc0` (doc §1.1, `Concrete02.cpp:107,164`). Per il copriferro si
   pone `epsc0 = 2 f_c/E_cm` così che `Ec` torni `E_cm`; per il nucleo si tiene la `ε_c2,c`
   della [4.1.10] e la rigidezza che ne esce (92 % di `E_cm` nell'esempio del §3.3) si stampa.
2. Mai `f_cd`/`f_yd` dentro il legame (doc §7): dimezzano la rigidezza e non hanno fonte.
   La veste `progetto` resta ammessa perché è un campo del modello, ma produce un **avviso**.
3. Mander e `Concrete02` sono incompatibili (doc §3.4): l'`ε_cc` di Mander dentro `epsc0`
   abbassa la rigidezza del nucleo proprio quando lo si confina di più. Con `confinamento:
   "mander"` il nucleo diventa un `Concrete04`, dove `Ec` è un argomento indipendente.

Funzioni pure e dizionari: `deck.py` (T2) li legge, li scrive con `righe_tcl` — la sola
funzione che formatta — e li stampa nel `resoconto.materiali` con la loro provenienza
(`classe`, `veste`, `articolo`), come vuole il vincolo globale di T4.
"""
from __future__ import annotations

import math

from meshrec.core import materiali as _materiali
from nova import catalogo
from nova.modello import Materiale, Sezione, Staffe

# NTC §4.1.2.1.2.1, diagramma parabola-rettangolo del calcestruzzo non confinato (≤ C50/60).
EPS_C2 = 0.002
EPS_CU2 = 0.0035
# `f_yk` delle staffe nella [4.1.12.b]: B450C, l'acciaio che il §7.4.2.2 impone in zona sismica.
# Resta un parametro perché la sezione conosce l'id del proprio acciaio ma non il modello.
F_YK_ST = 450.0
AVVISO_PROGETTO = "veste di progetto nel legame: rigidezza dimezzata, non è la prassi"

_NOMI_TCL = {"concrete02": "Concrete02", "concrete04": "Concrete04", "steel02": "Steel02"}


def veste_valori(materiale: Materiale, veste: str) -> dict:
    """La resistenza che entra nel legame, vestita come chiede `impostazioni_analisi.veste`.

    `caratteristica` → `f_ck`/`f_ctk`/`f_yk`; `media` (default) → `f_cm` = `f_ck` + 8 [11.2.2],
    `f_ctm` [11.2.3a], `f_yk` (per `f_ym` del B450C non c'è fonte, doc §6.1); `progetto` →
    `f_cd` [4.1.3], `f_ctd`, `f_yd`, **con avviso**; `esistente` → le medie divise per il
    fattore di confidenza, che oggi vale 1,0 perché `FC` non è ancora un campo del modello.

    Prende il materiale e non la sola classe: senza, l'override `personalizzato` di
    `catalogo.valori` — la via per un calcestruzzo misurato in opera — sparirebbe qui.
    """
    v = catalogo.valori(materiale)
    avvisi = [AVVISO_PROGETTO] if veste == "progetto" else []
    note = (["veste «esistente»: valori medi con FC = 1,0, perché il fattore di confidenza "
             "non è ancora un campo del modello (Circolare C8.7.2.2)"] if veste == "esistente" else [])
    base = {"classe": materiale.classe, "veste": veste, "avvisi": avvisi, "note": note}
    if materiale.tipo == "calcestruzzo":
        fck, fcm, fctm = v["fck"], v["fcm"], v["fctm"]
        fctk = 0.7 * fctm  # §11.2.10.2
        fc, fct, articolo = {
            "caratteristica": (fck, fctk, "[11.2.1], §11.2.10.2"),
            "media": (fcm, fctm, "[11.2.2], [11.2.3a]"),
            "esistente": (fcm, fctm, "[11.2.2], [11.2.3a], C8.7.2.2 (FC = 1,0)"),
            "progetto": (_materiali.ALFA_CC * fck / _materiali.GAMMA_C, fctk / _materiali.GAMMA_C,
                         "[4.1.3], §4.1.2.1.1.2"),
        }[veste]
        return {**base, "fck": fck, "fc": fc, "fct": fct, "Ecm": v["E"], "articolo": articolo}
    fyk = v["fyk"]
    fy, articolo = {
        "caratteristica": (fyk, "Tab. 11.3.Ia"),
        "media": (fyk, "Tab. 11.3.Ia (f_ym senza fonte: si resta su f_yk)"),
        "esistente": (fyk, "Tab. 11.3.Ia, C8.7.2.2 (FC = 1,0)"),
        "progetto": (fyk / _materiali.GAMMA_S, "§4.1.2.1.1.3"),
    }[veste]
    return {**base, "fyk": fyk, "fy": fy, "ftk": v["ftk"], "epsuk": v["epsuk"], "articolo": articolo}


def _somma_bi2(barre, bx: float, by: float) -> float:
    """`Σ b_i²` della [4.1.12.f], con le barre di ciascuna faccia distribuite uniformemente
    sul lato del nucleo: `n` barre contenute su un lato lungo `L` danno `n−1` interassi
    `L/(n−1)`, cioè `L²/(n−1)`.

    Le barre si raggruppano per faccia dalle loro posizioni vere (`deck._barre`): sta a un
    diametro dalla faccia chi ci appartiene, e le barre d'angolo cadono in due gruppi, come
    devono, perché le staffe le trattengono in tutte e due le direzioni.

    Sul lato lungo si prende `L` = dimensione del nucleo alla linea media delle staffe e non
    la distanza fra i centri delle barre d'angolo: è l'ipotesi dell'esempio §3.3 del doc di
    ricerca (`Σ b_i²` = 4·116² + 4·216² con `b_x` 232 e `b_y` 432), che ignora i ~14 mm di
    scarto fra linea media della staffa e centro della barra d'angolo e sta **dalla parte
    della sicurezza** (`α` 0,416 contro 0,457 con i centri veri, misurato il 05/09/2026).
    """
    if not barre:
        return 0.0
    tolleranza = max(x.diametro for x in barre)
    ys = [x.y for x in barre]
    zs = [x.z for x in barre]
    somma = 0.0
    for coordinate, faccia, lato in ((zs, min(zs), bx), (zs, max(zs), bx),
                                     (ys, min(ys), by), (ys, max(ys), by)):
        n = sum(1 for c in coordinate if abs(c - faccia) <= tolleranza)
        if n >= 2:
            somma += lato ** 2 / (n - 1)
    return somma


def confinamento_ntc(b: float, h: float, copriferro: float, staffe: Staffe, barre,
                     f_c: float, f_yk_st: float = F_YK_ST) -> dict:
    """Il calcestruzzo confinato di NTC §4.1.2.1.2.1, espressioni [4.1.8]–[4.1.12.g].

    `f_c` è la resistenza già vestita (`f_ck` in veste caratteristica, `f_cm` in veste media):
    la norma scrive `f_ck`, ma la chiave `fck_c` che esce di qui porta la stessa veste che è
    entrata — la [4.1.8] è un fattore moltiplicativo, non un cambio di veste.

    Due degeneri che la formula da sola non regge: senza barre longitudinali contenute non
    c'è nessun `b_i` e `α_n` vale 0 (non 1, che sarebbe il confinamento perfetto); con staffe
    rade i due fattori negativi della [4.1.12.g] si moltiplicherebbero in un `α_s` positivo,
    e allora si azzera ciascuno dei due prima del prodotto.
    """
    bx = b - 2 * copriferro - staffe.diametro  # alla linea media delle staffe
    by = h - 2 * copriferro - staffe.diametro
    if bx <= 0 or by <= 0:
        raise ValueError(f"copriferro {copriferro:g} e staffa Ø{staffe.diametro:g} non lasciano "
                         f"nucleo dentro {b:g}×{h:g}")
    a_st = staffe.bracci * math.pi * staffe.diametro ** 2 / 4
    s = staffe.passo
    sigma_lx = a_st * f_yk_st / (by * s)  # [4.1.12.b]
    sigma_ly = a_st * f_yk_st / (bx * s)
    sigma_l = math.sqrt(sigma_lx * sigma_ly)  # [4.1.12.c]
    note: list[str] = []
    if barre:
        alpha_n = max(0.0, 1.0 - _somma_bi2(barre, bx, by) / (6 * bx * by))  # [4.1.12.f]
    else:
        alpha_n = 0.0
        note.append("nessuna barra longitudinale contenuta: α_n = 0, il nucleo non è confinato")
    alpha_s = max(0.0, 1.0 - s / (2 * bx)) * max(0.0, 1.0 - s / (2 * by))  # [4.1.12.g]
    if alpha_s == 0.0:
        note.append(f"staffe a passo {s:g} mm ≥ 2·{min(bx, by):g} mm: α_s = 0, nessun confinamento")
    alpha = alpha_n * alpha_s  # [4.1.12.e]
    sigma2 = alpha * sigma_l  # [4.1.12.a]
    if sigma2 <= 0.05 * f_c:
        fck_c, articolo = f_c * (1.0 + 5.0 * sigma2 / f_c), "[4.1.8]"
    else:
        fck_c, articolo = f_c * (1.125 + 2.5 * sigma2 / f_c), "[4.1.9]"
    return {"bx": bx, "by": by, "A_st": a_st, "s": s, "f_yk_st": f_yk_st,
            "sigma_lx": sigma_lx, "sigma_ly": sigma_ly, "sigma_l": sigma_l,
            "alpha_n": alpha_n, "alpha_s": alpha_s, "alpha": alpha, "sigma2": sigma2,
            "fck_c": fck_c, "epsc2_c": EPS_C2 * (fck_c / f_c) ** 2,  # [4.1.10]
            "epscu2_c": EPS_CU2 + 0.2 * sigma2 / f_c,  # [4.1.11]
            "articolo": articolo, "note": note}


def _concrete02(fc: float, epsc0: float, epsU: float, v: dict, lg, articolo: str) -> dict:
    """I sette parametri di `Concrete02` da una resistenza e due deformazioni, **positive**:
    il segno lo mette qui, in un punto solo, perché è il vincolo che la doc OpenSees ripete."""
    return {"tipo": "concrete02", "fpc": -fc, "epsc0": -epsc0, "fpcu": -lg.fpcu_su_fpc * fc,
            "epsU": -epsU, "lambda": lg.lambda_, "ft": v["fct"], "Ets": v["fct"] / EPS_C2,
            "Ec": 2 * fc / epsc0, "classe": v["classe"], "veste": v["veste"], "articolo": articolo}


def _mander(fc: float, conf: dict, v: dict, lg, epsU: float) -> dict:
    """`f'cc` ed `ε_cc` di Mander, Priestley, Park 1988, espressioni (29) e (5), con `k_e` = `α`.

    Due approssimazioni dichiarate, tutte e due dal doc §3.2. La (29) vale per pressioni
    laterali **uguali**, e per la sezione rettangolare l'articolo rimanda a una superficie di
    rottura senza forma chiusa: qui si usa la media di `f'_lx` e `f'_ly`, come fanno i tool.
    E `k_e` è l'`α` delle NTC [4.1.12.e], non il `k_e` della (22), che divide per (1 − ρ_cc)
    e misura distanze nette invece che interassi: le due efficienze non coincidono per
    costruzione (0,416 contro 0,472 nell'esempio §3.3).

    `ε_cu` resta quella della [4.1.11]: la deformazione ultima di Mander è un bilancio
    energetico senza forma chiusa (conclusione 5 dell'articolo), e non si inventa qui.
    """
    fl = conf["alpha"] * (conf["sigma_lx"] + conf["sigma_ly"]) / 2
    r = fl / fc
    fcc = fc * (-1.254 + 2.254 * math.sqrt(1.0 + 7.94 * r) - 2.0 * r)  # (29)
    ecc = EPS_C2 * (1.0 + 5.0 * (fcc / fc - 1.0))  # (5), con ε_co = 0,002
    return {"tipo": "concrete04", "fpc": -fcc, "epsc0": -ecc, "epsU": -epsU, "Ec": v["Ecm"],
            "ft": v["fct"], "et": v["fct"] / v["Ecm"], "fcc": fcc, "epscc": ecc, "epscu": epsU,
            "f_l": fl, "k_e": conf["alpha"], "alpha": conf["alpha"], "sigma2": conf["sigma2"],
            "classe": v["classe"], "veste": v["veste"],
            "articolo": f"Mander 1988 (29), (5) con k_e = α [4.1.12.e]; ε_cu [4.1.11] {conf['articolo']}"}


def calcestruzzo(materiale: Materiale, veste: str, sezione: Sezione) -> dict:
    """`{copriferro: {...}, nucleo: {...}}`, i due legami che la Circolare C4.1.2.1.2.1 vuole
    diversi («legami diversi per il nucleo confinato e per le zone esterne alle staffe»).

    Il copriferro è sempre un `Concrete02` non confinato con `epsU` = 0,35 %, che è la lettura
    letterale del §7.4.1 («perdita dei copriferri al raggiungimento … 0,35%»). Il nucleo segue
    `legame.confinamento`: `ntc` (default) `Concrete02` con [4.1.8]–[4.1.11], `mander`
    `Concrete04`, `nessuno` — o sezione senza staffe — lo stesso legame del copriferro.

    Le posizioni delle barre se le prende da `deck._barre` con un import pigro: servono per i
    `b_i` della [4.1.12.f], e a livello di modulo l'import sarebbe circolare (in T2 è `deck`
    che importa `legami`). Non è un parametro perché `_barre` scambia le coordinate per le
    aste in piedi, e una lista già ruotata darebbe `b_x` e `b_y` invertiti senza dirlo.
    """
    if materiale.tipo != "calcestruzzo":
        raise ValueError(f"materiale «{materiale.nome}» ({materiale.classe}) è di tipo "
                         f"{materiale.tipo}, non calcestruzzo")
    v = veste_valori(materiale, veste)
    lg = materiale.legame
    fc = v["fc"]
    copriferro = _concrete02(fc, 2 * fc / v["Ecm"], lg.epsU_copriferro, v, lg,
                             f"{v['articolo']}, [11.2.5], §7.4.1")
    note = list(v["note"])
    confinamento = lg.confinamento
    if confinamento != "nessuno" and sezione.staffe is None:
        confinamento = "nessuno"
        note.append(f"sezione {sezione.id} «{sezione.nome}» senza staffe: confinamento «nessuno», "
                    "il nucleo prende il legame del copriferro")
    if confinamento == "nessuno":
        nucleo = dict(copriferro)
    else:
        from nova.deck import _barre  # pigro: in T2 è `deck` a importare `legami`
        conf = confinamento_ntc(sezione.b, sezione.h, sezione.copriferro, sezione.staffe,
                                _barre(sezione, False), fc)
        note += conf["note"]
        epsU = lg.epsU_nucleo if lg.epsU_nucleo is not None else conf["epscu2_c"]
        if confinamento == "mander":
            nucleo = _mander(fc, conf, v, lg, epsU)
        else:
            nucleo = _concrete02(conf["fck_c"], conf["epsc2_c"], epsU, v, lg, conf["articolo"])
            nucleo |= {"fcc": conf["fck_c"], "epscc": conf["epsc2_c"], "epscu": epsU,
                       "alpha": conf["alpha"], "sigma2": conf["sigma2"]}
        nucleo["confinamento"] = conf
    return {"copriferro": copriferro, "nucleo": nucleo, "classe": v["classe"], "veste": veste,
            "confinamento": confinamento, "avvisi": list(v["avvisi"]), "note": note}


def acciaio(materiale: Materiale, veste: str) -> dict:
    """I sei parametri di `Steel02` più la `ε_ud` con cui controllare le fibre a valle.

    `b` è la pendenza del ramo incrudente del modello (a) di §4.1.2.1.2.2, la retta da
    (`ε_yd`, `f_yd`) a (`ε_ud`, `k f_yd`): un **rapporto**, non una resistenza, e l'unico
    punto in cui la norma definisce l'incrudimento. Con `k` = 1,15 e `ε_ud` = 0,9·`ε_uk`
    = 0,0675 vale 0,0045 per il B450C (doc §2). `Steel02` non ha tetto a `ε_ud`: il ramo è
    indefinito e la deformazione limite si controlla sulle fibre, non qui.
    """
    if materiale.tipo != "acciaio":
        raise ValueError(f"materiale «{materiale.nome}» ({materiale.classe}) è di tipo "
                         f"{materiale.tipo}, non acciaio")
    v = veste_valori(materiale, veste)
    lg = materiale.legame
    eps_ud = 0.9 * v["epsuk"]
    k = v["ftk"] / v["fyk"]
    fyd = v["fyk"] / _materiali.GAMMA_S
    b = lg.b if lg.b is not None else (k - 1.0) * fyd / ((eps_ud - fyd / lg.Es) * lg.Es)
    return {"tipo": "steel02", "Fy": lg.fym if lg.fym is not None else v["fy"], "E": lg.Es,
            "b": b, "R0": lg.R0, "cR1": lg.cR1, "cR2": lg.cR2, "eps_ud": eps_ud, "k": k,
            "classe": v["classe"], "veste": v["veste"], "avvisi": list(v["avvisi"]),
            "note": list(v["note"]),
            "articolo": f"{v['articolo']}, §4.1.2.1.2.2 (a); R0/cR1/cR2 dalla doc OpenSees"}


_ORDINE = {
    "concrete02": ("fpc", "epsc0", "fpcu", "epsU", "lambda", "ft", "Ets"),
    "concrete04": ("fpc", "epsc0", "epsU", "Ec", "ft", "et"),
    "steel02": ("Fy", "E", "b", "R0", "cR1", "cR2"),
}


def righe_tcl(tag: int, parametri: dict) -> list[str]:
    """L'unica funzione che formatta: da qui esce la riga `uniaxialMaterial`, con in coda la
    provenienza (`classe`, `veste`, `articolo`) che il vincolo globale di T4 chiede stampata.

    La guardia sul segno non è teorica: `fpc` e `epsc0` positivi sono ammessi dall'interprete
    e danno un materiale che si rompe a trazione e regge a compressione senza dirlo.
    """
    nome = _NOMI_TCL[parametri["tipo"]]
    if "fpc" in parametri and parametri["fpc"] >= 0:
        raise ValueError(f"{nome} vuole compressioni negative: fpc = {parametri['fpc']:g}")
    valori_ = " ".join(f"{parametri[k]:.10g}" for k in _ORDINE[parametri["tipo"]])
    return [f"uniaxialMaterial {nome} {tag} {valori_}"
            f"    ;# {parametri['classe']}, veste {parametri['veste']}, {parametri['articolo']}"]
