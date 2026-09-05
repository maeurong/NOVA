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
AVVISO_RIDUZIONE = "la riduzione entra nel nucleo confinato: sezione non confinata"
# Quanto una barra può stare dentro lo spigolo del nucleo e valere ancora come barra d'angolo
# trattenuta: il gancio della staffa più il raggio della barra, con 5 mm di gioco di posa.
GIOCO_ANGOLO = 5.0

_NOMI_TCL = {"concrete02": "Concrete02", "concrete04": "Concrete04", "steel02": "Steel02"}
_VESTI = ("caratteristica", "media", "progetto", "esistente")


def veste_valori(materiale: Materiale, veste: str) -> dict:
    """La resistenza che entra nel legame, vestita come chiede `impostazioni_analisi.veste`.

    `caratteristica` → `f_ck`/`f_ctk`/`f_yk`; `media` (default) → `f_cm` = `f_ck` + 8 [11.2.2],
    `f_ctm` [11.2.3a], `f_yk` (per `f_ym` del B450C non c'è fonte, doc §6.1); `progetto` →
    `f_cd` [4.1.3], `f_ctd`, `f_yd`, **con avviso**; `esistente` → le medie divise per il
    fattore di confidenza, che oggi vale 1,0 perché `FC` non è ancora un campo del modello.

    Prende il materiale e non la sola classe: senza, l'override `personalizzato` di
    `catalogo.valori` — la via per un calcestruzzo misurato in opera — sparirebbe qui.
    """
    if veste not in _VESTI:
        raise ValueError(f"veste «{veste}» sconosciuta: le vesti sono {', '.join(_VESTI)}")
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


def riduzione_taglia_il_nucleo(sezione: Sezione) -> bool:
    """Il contorno ridotto **taglia** il rettangolo di nucleo, invece di contenerlo.

    La gabbia delle staffe non si sposta quando si toglie calcestruzzo da una faccia: il nucleo
    resta il rettangolo nominale `b − 2c − φ_st` centrato dove stanno barre e staffe. Finché la
    riduzione si mangia solo copriferro il nucleo è intatto e il confinamento è quello nominale;
    quando entra oltre `copriferro + φ_st/2` su un lato taglia la staffa, e senza reticolo chiuso
    le [4.1.12.f-g] non descrivono più niente.

    È la stessa cosa del contenimento geometrico, scritta una volta sola: il nucleo dista
    `c + φ_st/2` da ciascuna faccia nominale, quindi «contorno dentro il nucleo» e «riduzione
    maggiore di `c + φ_st/2`» sono la stessa disuguaglianza. Il confronto è per lato e non sulla
    somma: basta una faccia. Tangente (riduzione **uguale** a `c + φ_st/2`) è ancora contenimento.
    """
    r = sezione.riduzione
    if r is None or sezione.staffe is None:
        return False
    return max(r.sup, r.inf, r.sx, r.dx) > sezione.copriferro + sezione.staffe.diametro / 2


def _somma_bi2(barre) -> float:
    """`Σ b_i²` della [4.1.12.f] letterale: `b_i` è l'interasse fra barre longitudinali
    **consecutive** contenute, cioè la distanza fra i loro centri veri lungo il perimetro
    del nucleo — le barre trattenute ne sono i vertici, e il giro si chiude sull'ultima.

    L'ordine lungo il perimetro è l'ordine angolare attorno al baricentro: le barre di
    `deck._barre` stanno tutte sul contorno di un rettangolo centrato lì, e per un contorno
    convesso i due ordini coincidono (inf da sx a dx, dx dal basso in alto, sup, sx).

    Sul pilastro del doc §3.3 esce `Σ b_i²` = 4·102² + 4·202² = 204 832 e `α` = 0,457, non i
    4·116² + 4·216² e `α` = 0,416 del doc: quell'esempio idealizza le barre d'angolo **sullo
    spigolo** del nucleo, mentre i loro centri stanno ~14 mm più dentro (linea media della
    staffa a copriferro + φ_st/2 = 34 mm dalla faccia, centro della barra a copriferro + φ_st
    + φ/2 = 48). Qui contano le posizioni vere, che sono quelle che la [4.1.12.f] nomina.
    """
    if len(barre) < 2:
        return 0.0
    giro = sorted(barre, key=lambda x: math.atan2(x.z, x.y))
    return sum(math.dist((a.y, a.z), (b.y, b.z)) ** 2
               for a, b in zip(giro, giro[1:] + giro[:1]))


def _angoli_trattenuti(barre, bx: float, by: float, phi_st: float) -> bool:
    """Ogni spigolo del nucleo ha la sua barra longitudinale trattenuta dal gancio della staffa.

    È il presupposto del confinamento di norma: le [4.1.12.f-g] misurano l'efficienza di un
    reticolo che ha i vertici agli spigoli, e senza barre d'angolo non c'è nessun puntone
    diagonale da attivare. Quattro barre a mezzeria delle facce darebbero `Σ b_i²` piccolo e
    quindi `α_n` alto — confinamento massimo da un'armatura che non confina niente.
    """
    spigoli = ((-bx / 2, -by / 2), (bx / 2, -by / 2), (bx / 2, by / 2), (-bx / 2, by / 2))
    return all(any(math.dist((x.y, x.z), s) <= phi_st + x.diametro / 2 + GIOCO_ANGOLO
                   for x in barre) for s in spigoli)


def confinamento_ntc(b: float, h: float, copriferro: float, staffe: Staffe, barre,
                     f_c: float, f_yk_st: float = F_YK_ST) -> dict:
    """Il calcestruzzo confinato di NTC §4.1.2.1.2.1, espressioni [4.1.8]–[4.1.12.g].

    `f_c` è la resistenza già vestita (`f_ck` in veste caratteristica, `f_cm` in veste media):
    la norma scrive `f_ck`, ma la chiave `fck_c` che esce di qui porta la stessa veste che è
    entrata — la [4.1.8] è un fattore moltiplicativo, non un cambio di veste.

    Tre degeneri che la formula da sola non regge: senza barre longitudinali contenute non
    c'è nessun `b_i` e `α_n` vale 0 (non 1, che sarebbe il confinamento perfetto); senza una
    barra a ciascuno spigolo del nucleo il reticolo delle [4.1.12.f-g] non esiste e vale lo
    stesso 0; con staffe rade i due fattori negativi della [4.1.12.g] si moltiplicherebbero
    in un `α_s` positivo, e allora si azzera ciascuno dei due prima del prodotto.
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
    if not barre:
        alpha_n = 0.0
        note.append("nessuna barra longitudinale contenuta: α_n = 0, il nucleo non è confinato")
    elif not _angoli_trattenuti(barre, bx, by, staffe.diametro):
        alpha_n = 0.0
        note.append("senza barre d'angolo trattenute il confinamento NTC non si applica; "
                    "nucleo = copriferro")
    else:
        alpha_n = max(0.0, 1.0 - _somma_bi2(barre) / (6 * bx * by))  # [4.1.12.f]
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


def _mander(fc: float, conf: dict, v: dict, epsU: float) -> dict:
    """`f'cc` ed `ε_cc` di Mander, Priestley, Park 1988, espressioni (29) e (5), con `k_e` = `α`.

    Due approssimazioni dichiarate, tutte e due dal doc §3.2. La (29) vale per pressioni
    laterali **uguali**, e per la sezione rettangolare l'articolo rimanda a una superficie di
    rottura senza forma chiusa: qui si usa la media di `f'_lx` e `f'_ly`, come fanno i tool.
    E `k_e` è l'`α` delle NTC [4.1.12.e], non il `k_e` della (22), che divide per (1 − ρ_cc)
    e misura distanze nette invece che interassi: le due efficienze non coincidono per
    costruzione (0,457 contro 0,472 nell'esempio §3.3, con i `b_i` veri).

    `ε_cu` resta quella della [4.1.11]: la deformazione ultima di Mander è un bilancio
    energetico senza forma chiusa (conclusione 5 dell'articolo), e non si inventa qui.
    """
    fl = conf["alpha"] * (conf["sigma_lx"] + conf["sigma_ly"]) / 2
    r = fl / fc
    fcc = fc * (-1.254 + 2.254 * math.sqrt(1.0 + 7.94 * r) - 2.0 * r)  # (29)
    ecc = EPS_C2 * (1.0 + 5.0 * (fcc / fc - 1.0))  # (5), con ε_co = 0,002
    return {"tipo": "concrete04", "fpc": -fcc, "epsc0": -ecc, "epsU": -epsU, "Ec": v["Ecm"],
            "ft": v["fct"], "et": v["fct"] / v["Ecm"], "confinamento": "mander",
            "fcc": fcc, "epscc": ecc, "epscu": epsU, "f_l": fl,
            "alpha": conf["alpha"], "sigma2": conf["sigma2"],
            "classe": v["classe"], "veste": v["veste"],
            "articolo": f"Mander 1988 (29), (5) con k_e = α [4.1.12.e]; ε_cu [4.1.11] {conf['articolo']}"}


def calcestruzzo(materiale: Materiale, veste: str, sezione: Sezione) -> dict:
    """`{copriferro: {...}, nucleo: {...}}`, i due legami che la Circolare C4.1.2.1.2.1 vuole
    diversi («legami diversi per il nucleo confinato e per le zone esterne alle staffe»).

    Il copriferro è sempre un `Concrete02` non confinato con `epsU` = 0,35 %, che è la lettura
    letterale del §7.4.1 («perdita dei copriferri al raggiungimento … 0,35%»). Il nucleo segue
    `legame.confinamento`: `ntc` (default) `Concrete02` con [4.1.8]–[4.1.11], `mander`
    `Concrete04`, `nessuno` — o sezione senza staffe, o `α` = 0 — lo stesso legame del
    copriferro, con lo stesso corredo di chiavi (`confinamento`, `articolo`, `fcc`, `epscc`,
    `epscu`, `alpha`, `sigma2`) così che chi legge il dizionario non debba chiedere quale ramo
    l'ha scritto. `confinamento` racconta il ramo **applicato**, che non è sempre quello chiesto.

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
    epsc0 = 2 * fc / v["Ecm"]
    copriferro = _concrete02(fc, epsc0, lg.epsU_copriferro, v, lg,
                             f"{v['articolo']}, [11.2.5], §7.4.1")
    note = list(v["note"])
    conf = None
    avvisi = list(v["avvisi"])
    # «senza nucleo» non è «senza confinamento»: qui il rettangolo di nucleo **non esiste**
    # (niente staffe, niente gabbia) o non è più tutto calcestruzzo (la riduzione ci entra
    # dentro). Il deck ci scrive una patch sola, e il legame è quello del copriferro **esatto**:
    # un `epsU_nucleo` dichiarato non ha su cosa applicarsi, e onorarlo qui darebbe due
    # materiali diversi per una patch sola.
    senza_nucleo = sezione.staffe is None or riduzione_taglia_il_nucleo(sezione)
    if senza_nucleo:
        if sezione.staffe is None:
            note.append(f"sezione {sezione.id} «{sezione.nome}» senza staffe: non c'è nucleo, "
                        "il legame è quello del copriferro su tutta la sezione")
        elif lg.confinamento != "nessuno":
            # l'avviso dice «hai perso il confinamento». Con `confinamento: nessuno` non c'era
            # niente da perdere: il `.tcl` è lo stesso con e senza riduzione, e un avviso su una
            # riga che non cambia insegna a non leggere gli avvisi.
            avvisi.append(AVVISO_RIDUZIONE)
        if lg.epsU_nucleo is not None:
            note.append(f"sezione {sezione.id} «{sezione.nome}»: senza nucleo l'«epsU_nucleo» "
                        f"dichiarato ({lg.epsU_nucleo:g}) è ignorato")
    elif lg.confinamento != "nessuno":
        from nova.deck import _barre  # pigro: in T2 è `deck` a importare `legami`
        barre = _barre(sezione, False)  # fuori dal `try`: si nomina già da sé, e il prefisso
        try:                            # qui sotto lo scriverebbe due volte
            conf = confinamento_ntc(sezione.b, sezione.h, sezione.copriferro, sezione.staffe,
                                    barre, fc)
        except ValueError as e:
            # `confinamento_ntc` prende numeri e non sa quale sezione stia misurando: il
            # rifiuto lo nomina qui, che è il primo punto della catena che ha la sezione
            raise ValueError(f"sezione {sezione.id} «{sezione.nome}»: {e}") from None
        note += conf["note"]
        if conf["alpha"] == 0.0:  # la nota che dice perché l'ha già scritta `confinamento_ntc`
            conf = None
    if conf is None:  # nucleo = copriferro; `epsU_nucleo` vale solo se un nucleo c'è
        epsU = (lg.epsU_copriferro if senza_nucleo or lg.epsU_nucleo is None
                else lg.epsU_nucleo)
        nucleo = _concrete02(fc, epsc0, epsU, v, lg, copriferro["articolo"]) | {
            "confinamento": "nessuno", "fcc": fc, "epscc": epsc0, "epscu": epsU,
            "alpha": 0.0, "sigma2": 0.0}
    else:
        epsU = lg.epsU_nucleo if lg.epsU_nucleo is not None else conf["epscu2_c"]
        if lg.confinamento == "mander":
            nucleo = _mander(fc, conf, v, epsU)
        else:
            nucleo = _concrete02(conf["fck_c"], conf["epsc2_c"], epsU, v, lg,
                                 f"{v['articolo']}, {conf['articolo']}") | {
                "confinamento": "ntc", "fcc": conf["fck_c"], "epscc": conf["epsc2_c"],
                "epscu": epsU, "alpha": conf["alpha"], "sigma2": conf["sigma2"]}
    return {"copriferro": copriferro, "nucleo": nucleo, "classe": v["classe"], "veste": veste,
            "confinamento": nucleo["confinamento"], "avvisi": avvisi, "note": note}


def acciaio(materiale: Materiale, veste: str) -> dict:
    """I sei parametri di `Steel02` più la `ε_ud` con cui controllare le fibre a valle.

    `b` è la pendenza del ramo incrudente del modello (a) di §4.1.2.1.2.2, la retta da
    (`ε_y`, `f_y`) a (`ε_ud`, `k f_y`): un rapporto, e l'unico punto in cui la norma
    definisce l'incrudimento. Si calcola con **lo stesso `f_y` che entra in `Fy`** — quello
    della veste, o il `fym` dichiarato — e non con `f_yd` come fa il doc §2: il vincolo
    globale di T4 tiene i valori di progetto fuori dal legame, e un `b` che li usasse
    descriverebbe una retta che non passa per il punto di snervamento del materiale scritto.
    Con `f_y` = 450, `k` = 1,15 e `ε_ud` = 0,9·`ε_uk` = 0,0675 vale 0,0052 (con `f_yd` sarebbe
    0,0045, il numero del doc). `Steel02` non ha tetto a `ε_ud`: il ramo è indefinito e la
    deformazione limite si controlla sulle fibre, non qui.
    """
    if materiale.tipo != "acciaio":
        raise ValueError(f"materiale «{materiale.nome}» ({materiale.classe}) è di tipo "
                         f"{materiale.tipo}, non acciaio")
    v = veste_valori(materiale, veste)
    lg = materiale.legame
    eps_ud = 0.9 * v["epsuk"]
    k = v["ftk"] / v["fyk"]
    fy = lg.fym if lg.fym is not None else v["fy"]
    b = lg.b if lg.b is not None else (k - 1.0) * fy / ((eps_ud - fy / lg.Es) * lg.Es)
    return {"tipo": "steel02", "Fy": fy, "E": lg.Es,
            "b": b, "R0": lg.R0, "cR1": lg.cR1, "cR2": lg.cR2, "eps_ud": eps_ud, "k": k,
            "classe": v["classe"], "veste": v["veste"], "avvisi": list(v["avvisi"]),
            "note": list(v["note"]),
            "articolo": f"{v['articolo']}, §4.1.2.1.2.2 (a); R0/cR1/cR2 dalla doc OpenSees"}


_ORDINE = {
    "concrete02": ("fpc", "epsc0", "fpcu", "epsU", "lambda", "ft", "Ets"),
    "concrete04": ("fpc", "epsc0", "epsU", "Ec", "ft", "et"),
    "steel02": ("Fy", "E", "b", "R0", "cR1", "cR2"),
}


def stesso_legame(a: dict, b: dict) -> bool:
    """I due dizionari descrivono lo stesso `uniaxialMaterial`: stesso tipo e stessi parametri.

    Il confronto è sui soli valori che entrano nella riga. Classe, veste e articolo raccontano
    la **provenienza**, non il materiale: due nuclei con gli stessi numeri e articoli diversi
    restano un materiale solo, e confrontare la riga formattata — commento compreso — li
    scriverebbe due volte.
    """
    return a["tipo"] == b["tipo"] and all(a[k] == b[k] for k in _ORDINE[a["tipo"]])


def righe_tcl(tag: int, parametri: dict) -> list[str]:
    """L'unica funzione che formatta: da qui esce la riga `uniaxialMaterial`, con in coda la
    provenienza (`classe`, `veste`, `articolo`) che il vincolo globale di T4 chiede stampata.

    Le guardie non sono teoriche: l'interprete accetta i segni sbagliati e ne esce un materiale
    che si rompe a trazione e regge a compressione senza dirlo. Tutti e quattro i parametri di
    compressione vanno negativi, non il solo `fpc`, e la deformazione ultima deve stare **oltre**
    quella di picco — `|epsU| ≤ |epsc0|` è una curva che si schiaccia prima di arrivare in cima.
    """
    nome = _NOMI_TCL[parametri["tipo"]]
    for k in ("fpc", "epsc0", "fpcu", "epsU"):
        if k in parametri and parametri[k] >= 0:
            raise ValueError(f"{nome} vuole compressioni negative: {k} = {parametri[k]:g}")
    if "epsU" in parametri and abs(parametri["epsU"]) <= abs(parametri["epsc0"]):
        raise ValueError(f"{nome}: epsU = {parametri['epsU']:g} non va oltre epsc0 = "
                         f"{parametri['epsc0']:g}, la deformazione ultima precede il picco")
    valori_ = " ".join(f"{parametri[k]:.10g}" for k in _ORDINE[parametri["tipo"]])
    return [f"uniaxialMaterial {nome} {tag} {valori_}"
            f"    ;# {parametri['classe']}, veste {parametri['veste']}, {parametri['articolo']}"]
