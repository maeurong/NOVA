"""Modello NOVA → deck `.tcl` per il binario OpenSees.

Scritto da NOVA e non da `opensees.scrivi_tcl` (copia verbatim): quella deduce i vincoli
dalla geometria e scrive il solo peso proprio come carico nodale. Qui: `fix` dai vincoli
dichiarati, un caso di carico per azione o combinazione con i carichi già sommati, carichi
distribuiti come `eleLoad -beamUniform` proiettati nel riferimento locale, cedimenti come
`sp`, recorder per stazione (`section k force`), marcatore di fine come in MeshRec.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from pathlib import Path
from typing import NamedTuple

import numpy as np

from meshrec.core import armatura, opensees
from nova import catalogo, modale
from nova.modello import Modello, Sezione, caso_valido, casi_dichiarati, senza_barre

NOME_TCL = "13_telaio.tcl"
GRAVITA = 9806.65
STAZIONI = 5
XI_LOBATTO = (0.0, 0.1726731646, 0.5, 0.8273268354, 1.0)
_COSENO_VERTICALE = 0.999


class Barra(NamedTuple):
    y: float
    z: float
    diametro: float


@dataclass
class Elemento:
    tag: int
    asta: int
    i: int
    j: int
    L: float
    a: np.ndarray
    e1: np.ndarray
    e2: np.ndarray
    sezione_tag: int
    massa_lineare: float
    w: dict[str, tuple[float, float, float]] = field(default_factory=dict)


@dataclass
class Deck:
    percorso: Path
    casi: list[str]
    nodi: dict[int, tuple[float, float, float]]
    mappa_nodo: dict[int, int]
    mappa_asta: dict[int, list[int]]
    elementi: list[Elemento]
    vincolati: list[int]
    carico_totale: dict[str, tuple[float, float, float]]
    resoconto: dict
    modi: int | None = None


class _ArmaturaDuck(NamedTuple):
    """Il sottoinsieme di `ArmaturaConfig` che `armatura.colloca` legge."""
    barre_tese: int
    diametro_teso: float
    barre_compresse: int
    diametro_compresso: float
    diametro_staffe: float
    copriferro_nominale: float


def _terna(a: np.ndarray, rotazione_deg: float) -> tuple[np.ndarray, np.ndarray]:
    """`(e1, e2)`: e2 è la verticale proiettata (per un'asta verticale, la y globale),
    e1 = e2 × a. OpenSees deriva l'asse locale y come vecxz × asse, quindi vecxz = e2 e
    localy = e1 (misurato in MeshRec il 30/08/2026).

    `rotazione_deg` ruota la coppia attorno ad `a` in verso **destrorso rispetto all'asse i→j**:
    su un'asta lungo +x (a = +X, e1 = +Y, e2 = +Z), `+90` porta l'asse locale y da +Y a +Z e il
    `vecxz` da +Z a −Y; `−90` fa il contrario.
    """
    z = np.array([0.0, 0.0, 1.0])
    if abs(float(np.dot(a, z))) > _COSENO_VERTICALE:
        e2 = np.array([0.0, 1.0, 0.0])
    else:
        e2 = z - np.dot(z, a) * a
        e2 /= np.linalg.norm(e2)
    e1 = np.cross(e2, a)
    if rotazione_deg:
        t = math.radians(rotazione_deg)
        e1, e2 = (math.cos(t) * e1 + math.sin(t) * e2, -math.sin(t) * e1 + math.cos(t) * e2)
    return e1, e2


def _dimensioni_lungo(s: Sezione, verticale: bool) -> tuple[float, float]:
    """(lungo e1, lungo e2): per un'asta coricata b sta lungo e1 (orizzontale) e h lungo e2 (verticale);
    per un'asta in piedi h sta lungo e1 (nel piano del telaio) e b lungo e2 (fuori piano)."""
    return (s.h, s.b) if verticale else (s.b, s.h)


def _barre(s: Sezione, verticale: bool) -> list[Barra]:
    """Posizioni delle barre nel piano locale (e1, e2), centrate sul baricentro.

    Convenzione, **per qualunque orientamento dell'asta**: `inf`/`sup` sono le file alle due facce
    perpendicolari ad `h` (distese lungo `b`), `sx`/`dx` quelle alle facce perpendicolari a `b`
    (distese lungo `h`). `colloca` riceve sempre la sezione nominale `(b, h)` e le coordinate si
    portano sugli assi locali dopo, con la stessa rotazione della `patch rect`: un pilastro 300×600
    con `inf` tiene le barre a −252 dal baricentro lungo `h` (600/2 − copriferro 30 − staffa 8
    − diametro/2 10), non spalmate sui 600.

    `inf`/`sup` passano da `armatura.colloca` (verificata in MeshRec); `sx`/`dx` a filo dei lati,
    equidistanti fra i due strati (ponytail: una fila per lato, senza interferro verificato).
    La geometria impossibile che `colloca` solleva si rilancia col numero della sezione: il
    messaggio di MeshRec parla di millimetri e non sa quale sezione stia misurando.

    `colloca` guarda la sola altezza utile e non si accorge del caso in cui i due copriferri
    opposti si scavalcano: misurato il 05/09/2026 su una 300×100 con copriferro 40, staffe Ø8
    e barre Ø16 (40 + 8 + 8 = 56 > 50), dove le barre `inf` finivano a z = +6, cioè **sopra**
    il baricentro, e le `sx`/`dx` si ammucchiavano attorno a zero con passo negativo. La
    guardia sta qui e non in `meshrec/`, che è copia verbatim.

    Quella guardia è **per gruppo di file**, non per sezione: `inf`/`sup` misurano la sola `h`,
    `sx`/`dx` misurano `h` e `b`. Il fit lungo `b` di una fila `inf`/`sup` lo fa già `colloca`
    (`n·Ø ≤ b − 2·(copriferro + staffa)`, `armatura._fila`), e ricontrollarlo qui rifiutava una
    96×500 con una sola Ø20 `inf` che sta in piedi benissimo — per giunta dicendo «copriferri
    opposti su b», dove di file opposte non ce n'è nessuna.
    """
    lati = [f.lato for f in s.file]
    doppio = next((x for x in lati if lati.count(x) > 1), None)
    if doppio:
        raise ValueError(f"sezione {s.id} «{s.nome}»: due file sul lato {doppio}, una fila per lato in v1")
    if senza_barre(s):
        return []
    file = {f.lato: f for f in s.file}
    st = s.staffe
    # Ogni gruppo di file guarda **solo** le dimensioni su cui può scavalcarsi davvero.
    # Lungo `h` si misurano tutte: `inf`/`sup` con lo scostamento delle due facce, `sx`/`dx`
    # con `z0` e `passo`. Lungo `b` solo `sx`/`dx`: per `inf`/`sup` il fit lungo `b` è il
    # `n·Ø ≤ b − 2·(copriferro + staffa)` che `armatura.colloca` controlla già, e ricontrollarlo
    # qui rifiuterebbe sezioni sane (una 96×500 con una sola Ø20 `inf` sta in piedi benissimo).
    # `sx`/`dx` invece `colloca` non lo chiamano mai: là la guardia è l'unica che guarda.
    for quota, dimensione, gruppo in (("h", s.h, ("inf", "sup", "sx", "dx")), ("b", s.b, ("sx", "dx"))):
        diametri = [f.diametro for f in s.file if f.lato in gruppo]
        if not diametri:
            continue
        mezza_barra = max(diametri) / 2
        ingombro = s.copriferro + st.diametro + mezza_barra
        if 2 * ingombro >= dimensione:  # «≥ dimensione/2», scritto senza dividere
            raise ValueError(
                f"sezione {s.id} «{s.nome}»: i copriferri opposti si sovrappongono su {quota} "
                f"(copriferro {s.copriferro:g} + staffa {st.diametro:g} + mezza barra "
                f"{mezza_barra:g} = {ingombro:g} mm, metà di {quota} = {dimensione / 2:g} mm)")
    inf, sup = file.get("inf"), file.get("sup")
    piano: list[Barra] = []  # y lungo b, z lungo h, dal baricentro
    try:
        if inf is not None:
            duck = _ArmaturaDuck(inf.n, inf.diametro, sup.n if sup else 0,
                                 sup.diametro if sup else inf.diametro, st.diametro, s.copriferro)
            for b in armatura.colloca(duck, (s.b, s.h)):
                piano.append(Barra(b.y - s.b / 2, b.z - s.h / 2, b.diametro))
        elif sup is not None:
            duck = _ArmaturaDuck(sup.n, sup.diametro, 0, sup.diametro, st.diametro, s.copriferro)
            for b in armatura.colloca(duck, (s.b, s.h)):
                piano.append(Barra(b.y - s.b / 2, s.h / 2 - b.z, b.diametro))  # specchiata: sta in alto
    except ValueError as e:
        raise ValueError(f"sezione {s.id} «{s.nome}»: {e}") from None
    for lato, segno in (("sx", -1.0), ("dx", 1.0)):
        f = file.get(lato)
        if f is None:
            continue
        y = segno * (s.b / 2 - s.copriferro - st.diametro - f.diametro / 2)
        z0 = -(s.h / 2 - s.copriferro - st.diametro - f.diametro / 2)
        passo = (-2 * z0) / (f.n + 1)
        piano += [Barra(y, z0 + passo * (k + 1), f.diametro) for k in range(f.n)]
    # l'asta in piedi porta h lungo e1 e b lungo e2: le due coordinate si scambiano
    return [Barra(x.z, x.y, x.diametro) for x in piano] if verticale else piano


def _versore(e: Elemento, direzione: str) -> tuple[float, float, float]:
    """Il versore globale della direzione che un carico distribuito dichiara sull'elemento `e`.
    `locale_y` e `locale_z` sono gli assi della terna dell'asta, che il carico segue quando ruota."""
    return {"x": (1.0, 0.0, 0.0), "y": (0.0, 1.0, 0.0), "z": (0.0, 0.0, 1.0),
            "locale_y": tuple(e.e1), "locale_z": tuple(e.e2)}[direzione]


def _massa_lineare(s: Sezione, barre: list[Barra], m: Modello) -> float:
    """t/mm: calcestruzzo (al netto delle riduzioni e delle barre) + acciaio."""
    r = s.riduzione
    b = s.b - ((r.sx + r.dx) if r else 0.0)
    h = s.h - ((r.sup + r.inf) if r else 0.0)
    area_barre = sum(math.pi * x.diametro ** 2 / 4 for x in barre)
    cls = catalogo.valori(m.materiale(s.calcestruzzo))
    acc = catalogo.valori(m.materiale(s.acciaio))
    return (b * h - area_barre) * cls["densita"] + area_barre * acc["densita"]


def _fattori(m: Modello, caso: str) -> dict[int, float]:
    """{id azione: coefficiente} del caso `Z<id>` o `C<id>`; solleva se il caso non esiste.

    La forma si guarda prima dell'`int`: un caso che arriva da fuori può essere qualunque cosa,
    e `int("ippo")` direbbe «invalid literal» invece di dire quali sono i casi.
    """
    if caso_valido(caso):
        n = int(caso[1:])
        if caso[0] == "Z" and m.azione(n) is not None:
            return {n: 1.0}
        if caso[0] == "C" and m.combinazione(n) is not None:
            fattori: dict[int, float] = {}
            for t in m.combinazione(n).termini:  # due termini sulla stessa azione si sommano
                fattori[t.azione] = fattori.get(t.azione, 0.0) + t.coefficiente
            return fattori
    raise ValueError(f"caso {caso!r} non dichiarato: i casi sono {casi_dichiarati(m)}")


def _masse_da_azioni(m: Modello, elementi: list[Elemento], per_asta: dict[int, list[Elemento]],
                     mappa_nodo: dict[int, int]) -> dict[int, float]:
    """{tag nodo: massa [t]} dalle azioni che l'analisi modale dichiara come massa sismica.

    Solo la componente **verticale** del carico diventa massa: NTC 2018 [2.5.7] combina i
    carichi gravitazionali, e una spinta orizzontale di vento non è un peso. Quindi
    `massa = coefficiente · |componente z| / g`, con `g = 9806,65 mm/s²`:

    Le componenti verticali si sommano **con segno dentro l'azione**, e il modulo si prende
    sul netto: due carichi opposti sullo stesso nodo o sullo stesso elemento si elidono,
    invece di sommarsi in una massa doppia che nessuno ha appeso.

    - carico nodale: `Fz` sul nodo che lo porta;
    - carico distribuito: `q · versore_z` su ogni elemento dell'asta, dove il versore è
      quello della direzione dichiarata (anche `locale_y` e `locale_z` passano di qui: la
      direzione la decide l'asta, la componente utile è z);
    - gravità: `fattore_z · massa_lineare · g` su ogni elemento — la massa c'è già, e infatti
      il Check Model rifiuta di prendere il peso proprio generato.

    Il netto per elemento diventa `|wz| · L / 2` su ciascuno dei due estremi.

    Coefficiente zero, azione senza carichi, nessuna analisi modale: nessuna riga, e non uno
    zero scritto. Una `mass` a zero e una massa mai chiesta si leggono uguali nel `.tcl`, ma
    la prima dice «l'ho calcolata» di una cosa che nessuno ha calcolato.
    """
    modali = [a for a in m.analisi if a.tipo == "modale"]
    if len(modali) > 1:
        raise ValueError(f"una sola analisi modale per modello, e ne sono dichiarate {len(modali)}")
    masse: dict[int, float] = {}

    def aggiungi(tag: int, quanta: float) -> None:
        if quanta:
            masse[tag] = masse.get(tag, 0.0) + quanta

    for voce in (modali[0].masse_da_azioni if modali else []):
        if not voce.coefficiente:
            continue
        azione = m.azione(voce.azione)
        if azione is None:  # riferimento rotto: il Check Model lo rifiuta, «forza» lo scavalca
            continue
        # prima si somma **con segno** dentro l'azione, il modulo viene alla fine: due carichi
        # opposti sullo stesso posto si elidono, come fanno nella realtà, e non si sommano in
        # una massa doppia che nessuno ha appeso
        fz_nodo: dict[int, float] = {}       # forza verticale netta per nodo [N]
        wz_elemento: dict[int, float] = {}   # carico verticale netto per elemento [N/mm]
        for c in azione.carichi:
            if c.tipo == "nodale":
                tag = mappa_nodo[c.nodo]
                fz_nodo[tag] = fz_nodo.get(tag, 0.0) + c.Fz
            elif c.tipo == "distribuito":
                for e in per_asta[c.asta]:
                    wz_elemento[e.tag] = wz_elemento.get(e.tag, 0.0) + c.q * _versore(e, c.direzione)[2]
            elif c.tipo == "gravita":
                for e in elementi:
                    wz_elemento[e.tag] = (wz_elemento.get(e.tag, 0.0)
                                          + c.fattore_z * e.massa_lineare * GRAVITA)
        for tag, fz in fz_nodo.items():
            aggiungi(tag, voce.coefficiente * abs(fz) / GRAVITA)
        for e in elementi:
            wz = wz_elemento.get(e.tag, 0.0)
            meta = voce.coefficiente * abs(wz) * e.L / 2 / GRAVITA
            aggiungi(e.i, meta); aggiungi(e.j, meta)
    return masse


def scrivi(m: Modello, casi: list[str], cartella: Path, modi: int | None = None) -> Deck:
    """Scrive `13_telaio.tcl` nella cartella e rende quel che serve a leggerne le uscite.

    `modi` intero aggiunge in coda il passo modale, dopo l'ultimo caso statico e il suo
    `reset`: i registratori di `eigen` chiedono `record` e vogliono la cartella pulita dai
    registratori statici, che ogni caso rimuove già da sé.

    I cedimenti finiscono in `sp` dentro il pattern del caso, anche su un dof che i vincoli
    dichiarati hanno già bloccato con `fix`: misurato il 05/09/2026 con OpenSees 3.8.0 e
    `constraints Transformation`, `fix 2 1 1 1 0 0 0` più `sp 2 3 -5.0` dà `analyze` a 0,
    `nodeDisp 2 3 = -5` e la reazione EA/L·5 corretta. Il `fix` non va tolto.
    """
    cartella = Path(cartella)
    casi = list(dict.fromkeys(casi))  # due volte lo stesso caso sono due pattern e un'uscita sola
    for s in m.sezioni:
        r = s.riduzione
        if r and (r.sup + r.inf >= s.h or r.sx + r.dx >= s.b):
            raise ValueError(f"sezione {s.id} «{s.nome}»: la riduzione ({r.sup:g}+{r.inf:g} su h={s.h:g}, "
                             f"{r.sx:g}+{r.dx:g} su b={s.b:g}) non lascia sezione")
        # come per le aste senza sezione: con «forza» il riferimento rotto arriva fin qui, e
        # `catalogo.valori(None)` farebbe `AttributeError` su `materiale.classe`. Qui, e non
        # in `catalogo`, perché il rifiuto deve nominare la sezione che sta sbagliando.
        for campo, id_materiale in (("calcestruzzo", s.calcestruzzo), ("acciaio", s.acciaio)):
            if m.materiale(id_materiale) is None:
                raise ValueError(f"sezione {s.id} «{s.nome}»: il materiale {campo} {id_materiale} non esiste")

    nodi_xyz: dict[int, tuple[float, float, float]] = {}
    mappa_nodo: dict[int, int] = {}
    for tag, n in enumerate(m.nodi, start=1):
        mappa_nodo[n.id] = tag
        nodi_xyz[tag] = (n.x, n.y, n.z)
    prossimo_nodo = len(m.nodi) + 1

    # una sezione a fibre per (sezione, orientamento): la stessa 300×500 in piedi e coricata sono due
    # geometrie diverse nel piano locale, e un tag solo darebbe alla trave l'inerzia del pilastro
    sezioni_tag: dict[tuple[int, bool], int] = {}
    elementi: list[Elemento] = []
    mappa_asta: dict[int, list[int]] = {}
    for a in m.aste:
        # con «forza» il Check Model è già stato scavalcato: il riferimento rotto arriva fin qui,
        # e senza guardia diventerebbe un `AttributeError` su `None` invece di un rifiuto leggibile
        s = m.sezione(a.sezione)
        if s is None:
            raise ValueError(f"asta {a.id}: la sezione {a.sezione} non esiste")
        p = np.array(nodi_xyz[mappa_nodo[a.nodo_i]]); q = np.array(nodi_xyz[mappa_nodo[a.nodo_j]])
        L = float(np.linalg.norm(q - p))
        if L == 0.0:
            raise ValueError(f"asta {a.id}: i nodi {a.nodo_i} e {a.nodo_j} coincidono, la lunghezza è zero")
        asse = (q - p) / L
        e1, e2 = _terna(asse, a.rotazione_deg)
        verticale = abs(float(asse[2])) > _COSENO_VERTICALE
        tag_sezione = sezioni_tag.setdefault((a.sezione, verticale), len(sezioni_tag) + 1)
        massa = _massa_lineare(s, _barre(s, verticale), m)
        tags_nodi = [mappa_nodo[a.nodo_i]]
        for k in range(1, a.suddivisioni):
            xyz = tuple(float(v) for v in p + (q - p) * k / a.suddivisioni)
            nodi_xyz[prossimo_nodo] = xyz; tags_nodi.append(prossimo_nodo); prossimo_nodo += 1
        tags_nodi.append(mappa_nodo[a.nodo_j])
        mappa_asta[a.id] = []
        for i, j in zip(tags_nodi, tags_nodi[1:]):
            tag = len(elementi) + 1
            elementi.append(Elemento(tag, a.id, i, j, L / a.suddivisioni, asse, e1, e2, tag_sezione, massa))
            mappa_asta[a.id].append(tag)

    # ---- carichi per caso: nodali (globali), distribuiti per elemento (vettore globale per lunghezza), cedimenti
    nodali: dict[str, dict[int, list[float]]] = {}
    cedimenti: dict[str, list[tuple[int, int, float]]] = {}
    carico_totale: dict[str, tuple[float, float, float]] = {}
    per_asta = {a.id: [e for e in elementi if e.asta == a.id] for a in m.aste}
    for caso in casi:
        fattori = _fattori(m, caso)
        nodali[caso] = {}; cedimenti[caso] = []
        for e in elementi:
            e.w[caso] = (0.0, 0.0, 0.0)
        for id_azione, coeff in fattori.items():
            azione = m.azione(id_azione)
            if azione is None:  # un termine di combinazione che punta a un'azione cancellata
                raise ValueError(f"caso {caso}: l'azione {id_azione} non esiste")
            for c in azione.carichi:
                if c.tipo == "nodale":
                    v = nodali[caso].setdefault(mappa_nodo[c.nodo], [0.0] * 6)
                    for k, comp in enumerate((c.Fx, c.Fy, c.Fz, c.Mx, c.My, c.Mz)):
                        v[k] += coeff * comp
                elif c.tipo == "distribuito":
                    for e in per_asta[c.asta]:
                        d = _versore(e, c.direzione)
                        e.w[caso] = tuple(float(w + coeff * c.q * dk) for w, dk in zip(e.w[caso], d))
                elif c.tipo == "gravita":
                    for e in elementi:
                        g = e.massa_lineare * GRAVITA
                        e.w[caso] = tuple(w + coeff * g * f
                                          for w, f in zip(e.w[caso], (c.fattore_x, c.fattore_y, c.fattore_z)))
                elif c.tipo == "cedimento":
                    for dof, val in enumerate((c.ux, c.uy, c.uz, c.rx, c.ry, c.rz), start=1):
                        if val is not None:
                            cedimenti[caso].append((mappa_nodo[c.nodo], dof, coeff * val))
                # termico: rifiutato dal Check Model, qui non arriva
        tot = np.zeros(3)
        for v in nodali[caso].values():
            tot += np.array(v[:3])
        for e in elementi:
            tot += np.array(e.w[caso]) * e.L
        carico_totale[caso] = tuple(float(x) for x in tot)

    # ---- il file
    vincolati = [mappa_nodo[n.id] for n in m.nodi if n.vincolato()]
    r = ["# Deck generato da NOVA (nova/deck.py). Unità: mm, N, MPa, t, s.",
         "# Si esegue con la cartella di lavoro sulla cartella di uscita.",
         "wipe", "model BasicBuilder -ndm 3 -ndf 6", "", "# --- nodi ---"]
    for tag, (x, y, z) in nodi_xyz.items():
        r.append(f"node {tag} {x:.10g} {y:.10g} {z:.10g}")
    # la massa è scalare e uguale sulle tre traslazioni: la direzione la decide `eigen`
    da_azioni = _masse_da_azioni(m, elementi, per_asta, mappa_nodo)
    masse_nodo = {mappa_nodo[n.id]: float(n.massa_nodale) for n in m.nodi if n.massa_nodale}
    for tag, quanta in da_azioni.items():
        masse_nodo[tag] = masse_nodo.get(tag, 0.0) + quanta
    for tag in sorted(masse_nodo):
        massa = masse_nodo[tag]
        r.append(f"mass {tag} {massa:.10g} {massa:.10g} {massa:.10g} 0 0 0")
    r += ["", "# --- vincoli dichiarati ---"]
    for n in m.nodi:
        if n.vincolato():
            r.append(f"fix {mappa_nodo[n.id]} " + " ".join(str(g) for g in n.vincolo.gradi()))
    r += ["", "# --- materiali elastici (T1) e sezioni a fibre ---"]
    sezioni_senza_barre: list[int] = []
    tag_mat = 1
    for (id_sezione, verticale), tag_sezione in sezioni_tag.items():
        s = m.sezione(id_sezione)
        cls = catalogo.valori(m.materiale(s.calcestruzzo)); acc = catalogo.valori(m.materiale(s.acciaio))
        r.append(f"uniaxialMaterial Elastic {tag_mat} {cls['E']:.10g}"
                 f"    ;# {m.materiale(s.calcestruzzo).classe}, sezione {s.id}")
        r.append(f"uniaxialMaterial Elastic {tag_mat + 1} {acc['E']:.10g}"
                 f"    ;# {m.materiale(s.acciaio).classe}, sezione {s.id}")
        lungo_e1, lungo_e2 = _dimensioni_lungo(s, verticale)
        rid = s.riduzione
        y0, y1 = -lungo_e1 / 2, lungo_e1 / 2
        z0, z1 = -lungo_e2 / 2, lungo_e2 / 2
        if rid:  # il contorno si restringe, le barre restano dove il copriferro nominale le mette
            y0 += rid.inf if verticale else rid.sx; y1 -= rid.sup if verticale else rid.dx
            z0 += rid.sx if verticale else rid.inf; z1 -= rid.dx if verticale else rid.sup
        G = cls["E"] / (2 * (1 + cls["nu"]))
        gj = G * opensees._costante_torsionale(lungo_e1, lungo_e2)
        n_f = m.impostazioni_analisi.fibre
        r.append(f"section Fiber {tag_sezione} -GJ {gj:.10g} {{")
        r.append(f"    patch rect {tag_mat} {n_f} {n_f} {y0:.10g} {z0:.10g} {y1:.10g} {z1:.10g}")
        barre = _barre(s, verticale)
        if not barre and s.id not in sezioni_senza_barre:
            sezioni_senza_barre.append(s.id)
        for b in barre:
            r.append(f"    fiber {b.y:.10g} {b.z:.10g} {math.pi * b.diametro ** 2 / 4:.10g} {tag_mat + 1}")
        r.append("}")
        tag_mat += 2
    r += ["", "# --- trasformazioni ed elementi ---"]
    for e in elementi:
        r.append(f"geomTransf Linear {e.tag} {e.e2[0]:.10g} {e.e2[1]:.10g} {e.e2[2]:.10g}")
        r.append(f"element forceBeamColumn {e.tag} {e.i} {e.j} {STAZIONI} {e.sezione_tag} {e.tag} "
                 f"-mass {e.massa_lineare:.10g}")
    n_nodi, n_el = len(nodi_xyz), len(elementi)
    for k, caso in enumerate(casi, start=1):
        r += ["", f"# ===== caso di carico {caso} =====", f"timeSeries Linear {k}", f"pattern Plain {k} {k} {{"]
        for tag, v in nodali[caso].items():
            r.append(f"    load {tag} " + " ".join(f"{x:.10g}" for x in v))
        for e in elementi:
            w = np.array(e.w[caso])
            if np.any(w):
                r.append(f"    eleLoad -ele {e.tag} -type -beamUniform "
                         f"{np.dot(w, e.e1):.10g} {np.dot(w, e.e2):.10g} {np.dot(w, e.a):.10g}")
        for tag, dof, val in cedimenti[caso]:
            r.append(f"    sp {tag} {dof} {val:.10g}")
        r.append("}")
        r += [f"recorder Node -file {caso}_spostamenti.out -precision 12 -nodeRange 1 {n_nodi} -dof 1 2 3 4 5 6 disp",
              f"recorder Node -file {caso}_reazioni.out -precision 12 -nodeRange 1 {n_nodi} -dof 1 2 3 4 5 6 reaction",
              f"recorder Element -file {caso}_localforce.out -precision 12 -eleRange 1 {n_el} localForce"]
        for st in range(1, STAZIONI + 1):
            r.append(f"recorder Element -file {caso}_sez{st}.out -precision 12 -eleRange 1 {n_el} section {st} force")
        r += ["constraints Transformation", "numberer RCM", "system BandGeneral", "test NormDispIncr 1.0e-8 10",
              "algorithm Linear", "integrator LoadControl 1.0", "analysis Static",
              "if {[analyze 1] != 0} {",
              f'    puts "{opensees.MARCA_FINE}_MANCA: il caso {caso} non è arrivato a convergenza"',
              "    exit 1", "}",
              # `remove loadPattern` + `reset` bastano a rendere i casi indipendenti: misurato il
              # 05/09/2026 con OpenSees 3.8.0 sul telaio 2×1, il caso Z2 (sola spinta in testa) dopo
              # Z1 (solo distribuito) dà somma delle reazioni z = 0, cioè zero residuo del caso prima.
              "remove recorders", "wipeAnalysis", f"remove loadPattern {k}", "reset"]
    if modi is None:
        modi = modale.modi_dichiarati(m)
    n_modi = min(modi, modale.gradi_liberi(m)) if modi else None
    if n_modi:
        blocco = opensees._passo_modale(n_modi, n_nodi)
        # `-fullGenLapack` e non l'Arpack che `_passo_modale` scrive: con la massa lumped di
        # `forceBeamColumn -mass` la matrice delle masse è singola sulle rotazioni, e l'Arnoldi
        # si ferma molto prima dei gradi liberi. Misurato il 05/09/2026, OpenSees 3.8.0, telaio
        # 2×1 (nove traslazioni libere): `eigen 5` esce con «Could not build an Arnoldi
        # factorization», `eigen -fullGenLapack 9` rende nove modi. La scala di «auto» parte da
        # tre e sale a sei: con Arpack il secondo giro non arriverebbe mai in fondo.
        # `.index` e non una sostituzione a tentoni: se MeshRec cambia quella riga, si rompe qui.
        blocco[blocco.index(f"eigen {n_modi}")] = f"eigen -fullGenLapack {n_modi}"
        r += ["", *blocco]
    r += ["", "wipe", f'set _fine [open "{opensees.NOME_FINE}" w]', f'puts $_fine "{opensees.MARCA_FINE}"',
          "close $_fine", ""]
    cartella.mkdir(parents=True, exist_ok=True)  # dopo le validazioni: un rifiuto non lascia cartelle
    percorso = cartella / NOME_TCL
    percorso.write_text("\n".join(r), encoding="utf-8")
    resoconto = {"tcl": str(percorso), "nodi": n_nodi, "elementi": n_el, "casi": list(casi),
                 "vincolati": len(vincolati), "carico_totale": carico_totale,
                 "sezioni_senza_barre": sezioni_senza_barre, "modi": n_modi,
                 "massa_da_azioni": sum(da_azioni.values()),
                 "mappa_nodo": {str(k): v for k, v in mappa_nodo.items()},
                 "mappa_asta": {str(k): v for k, v in mappa_asta.items()}}
    return Deck(percorso, list(casi), nodi_xyz, mappa_nodo, mappa_asta, elementi, vincolati,
                carico_totale, resoconto, n_modi)
