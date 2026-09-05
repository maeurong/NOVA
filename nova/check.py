"""Check Model (C1): i controlli deterministici prima di ogni corsa, ognuno con il suo oracolo.

Misurato sul prototipo #9: OpenSees gira con exit 0 e zero avvisi anche con un'asta a
lunghezza zero o un nodo libero. Questo modulo è l'unico segnale davanti al solutore.
"""
from __future__ import annotations

import math

from nova import modello as _modello
from nova.modello import Modello

TOLLERANZA_MM = 1.0


def _v(controllo, esito, ragione, oggetto=None, rimedio=None, valori=None) -> dict:
    """La forma unica del verdetto (spec «Modello dati»): le stesse nove chiavi di C3,
    a `None` o `{}` dove il controllo non le riempie. Un consumatore solo per le due liste."""
    return {"controllo": controllo, "oggetto": oggetto, "stazione": None, "caso": None,
            "esito": esito, "ragione": ragione, "articolo": None, "valori": valori or {}, "rimedio": rimedio}


def _dist(a, b) -> float:
    return math.dist((a.x, a.y, a.z), (b.x, b.y, b.z))


def _porta_il_peso_proprio(a) -> bool:
    """L'azione è il peso proprio: la gravità lungo z, generata dal programma o scritta a mano.

    Guardare il solo `generata` non bastava. La densità delle sezioni è già massa nel deck
    (`-mass` su ogni elemento), e un'azione `gravita fattore_z: -1` scritta a mano dentro
    `masse_da_azioni` la somma una seconda volta: la massa raddoppia, la prima frequenza
    scende di √2 (5,80 Hz → 4,10 sul telaio 2×1) e nessun verdetto la contraddice.

    La gravità orizzontale non è peso: `fattore_x` è la spinta (0,1 g del caso studio), e
    quella massa il deck non ce l'ha già.
    """
    return a.generata or any(c.tipo == "gravita" and c.fattore_z for c in a.carichi)


def check_model(m: Modello) -> list[dict]:
    v: list[dict] = []
    nodi = {n.id: n for n in m.nodi}
    sezioni = {s.id: s for s in m.sezioni}
    materiali = {mt.id: mt for mt in m.materiali}
    aste_ids = {a.id for a in m.aste}
    azioni_ids = {a.id for a in m.azioni}

    v.append(_v("unita", "passato", f"unita = {m.unita}"))  # il loader rifiuta già le altre

    ids = list(nodi)
    coincidenti = [[ids[i], ids[j]] for i in range(len(ids)) for j in range(i + 1, len(ids))
                   if _dist(nodi[ids[i]], nodi[ids[j]]) < TOLLERANZA_MM]
    v.append(_v("nodi_coincidenti", "non_passato" if coincidenti else "passato",
                f"coppie di nodi entro {TOLLERANZA_MM:g} mm: {coincidenti or 'nessuna'}", coincidenti or None,
                "unisci i nodi" if coincidenti else None))

    sconnesse = [a.id for a in m.aste if a.nodo_i not in nodi or a.nodo_j not in nodi or a.nodo_i == a.nodo_j]
    v.append(_v("aste_sconnesse", "non_passato" if sconnesse else "passato",
                f"aste con un estremo inesistente o i = j: {sconnesse or 'nessuna'}", sconnesse or None))

    corte = [a.id for a in m.aste if a.nodo_i in nodi and a.nodo_j in nodi and a.nodo_i != a.nodo_j
             and _dist(nodi[a.nodo_i], nodi[a.nodo_j]) < TOLLERANZA_MM]
    v.append(_v("aste_lunghezza_zero", "non_passato" if corte else "passato",
                f"aste più corte di {TOLLERANZA_MM:g} mm: {corte or 'nessuna'}", corte or None))

    # due aste "duplicate" possono appoggiarsi a nodi coincidenti ma con id diversi (es. nodo
    # doppione non ancora unito): si confrontano gli estremi per rappresentante di coincidenza,
    # non per id nudo, altrimenti la trave doppia sui nodi doppioni sfuggirebbe al controllo.
    rappresentante = {i: i for i in ids}
    for i, j in coincidenti:
        a_, b_ = rappresentante[i], rappresentante[j]
        if a_ != b_:
            lo, hi = min(a_, b_), max(a_, b_)
            for k in rappresentante:
                if rappresentante[k] == hi:
                    rappresentante[k] = lo
    viste: dict[frozenset, int] = {}
    duplicate = []
    for a in m.aste:
        k = frozenset((rappresentante.get(a.nodo_i, a.nodo_i), rappresentante.get(a.nodo_j, a.nodo_j)))
        if k in viste:
            duplicate.append([viste[k], a.id])
        viste.setdefault(k, a.id)
    v.append(_v("aste_duplicate", "non_passato" if duplicate else "passato",
                f"aste sugli stessi due nodi: {duplicate or 'nessuna'}", duplicate or None))

    toccati = {a.nodo_i for a in m.aste} | {a.nodo_j for a in m.aste}
    liberi = [i for i in ids if i not in toccati]
    v.append(_v("nodi_liberi", "non_passato" if liberi else "passato",
                f"nodi senza aste: {liberi or 'nessuno'}", liberi or None, "elimina il nodo" if liberi else None))

    interni = []
    for a in m.aste:
        if a.nodo_i not in nodi or a.nodo_j not in nodi or a.nodo_i == a.nodo_j:
            continue
        p, q = nodi[a.nodo_i], nodi[a.nodo_j]
        d = (q.x - p.x, q.y - p.y, q.z - p.z)
        L2 = sum(c * c for c in d)
        if L2 < TOLLERANZA_MM ** 2:
            continue
        for k, n in nodi.items():
            if k in (a.nodo_i, a.nodo_j):
                continue
            # un nodo entro tolleranza da un estremo è "nodi_coincidenti", non "sull'asta":
            # lo si esclude per distanza dagli estremi, non con un epsilon su t (che a lunghezze
            # reali in mm è troppo piccolo per corrispondere a 1 mm fisico).
            if _dist(n, p) < TOLLERANZA_MM or _dist(n, q) < TOLLERANZA_MM:
                continue
            t = ((n.x - p.x) * d[0] + (n.y - p.y) * d[1] + (n.z - p.z) * d[2]) / L2
            if not (0.0 < t < 1.0):
                continue
            piede = (p.x + t * d[0], p.y + t * d[1], p.z + t * d[2])
            if math.dist((n.x, n.y, n.z), piede) <= TOLLERANZA_MM:
                interni.append([k, a.id])
    v.append(_v("nodo_su_asta", "non_passato" if interni else "passato",
                f"nodi su un'asta senza esserne estremo: {interni or 'nessuno'}", interni or None,
                "spezza asta" if interni else None))

    nulle = [a.id for a in m.aste if a.sezione not in sezioni]
    v.append(_v("sezione_nulla", "non_passato" if nulle else "passato",
                f"aste con sezione inesistente nel catalogo: {nulle or 'nessuna'}", nulle or None))

    riferimenti = []
    for s in m.sezioni:
        if s.calcestruzzo not in materiali:
            riferimenti.append({"sezione": s.id, "calcestruzzo": s.calcestruzzo})
        if s.acciaio not in materiali:
            riferimenti.append({"sezione": s.id, "acciaio": s.acciaio})
    for a in m.azioni:
        for c in a.carichi:
            if c.tipo in ("nodale", "cedimento") and c.nodo not in nodi:
                riferimenti.append({"azione": a.id, "carico": c.tipo, "nodo": c.nodo})
            elif c.tipo == "distribuito" and c.asta not in aste_ids:
                riferimenti.append({"azione": a.id, "carico": c.tipo, "asta": c.asta})
    for comb in m.combinazioni:
        for t in comb.termini:
            if t.azione not in azioni_ids:
                riferimenti.append({"combinazione": comb.id, "azione": t.azione})
    dichiarati = set(_modello.casi_dichiarati(m))
    pesano_gia = {a.id for a in m.azioni if _porta_il_peso_proprio(a)}
    # un riferimento rotto si spiega da sé nel suo `repr`; questo no, e la spiegazione va
    # in testa alla ragione invece che dentro un dizionario che nessuno legge a voce
    note: list[str] = []
    for an in m.analisi:
        if an.tipo == "statica":
            for caso in an.casi:
                if caso not in dichiarati:
                    riferimenti.append({"analisi": "statica", "caso": caso})
        elif an.tipo == "modale":
            for massa in an.masse_da_azioni:
                if massa.azione not in azioni_ids:
                    riferimenti.append({"analisi": "modale", "azione": massa.azione})
                elif massa.azione in pesano_gia:
                    # contare il peso proprio due volte è l'errore che questo controllo evita:
                    # la densità del calcestruzzo è già la massa degli elementi (`-mass`)
                    riferimenti.append({"analisi": "modale", "azione": massa.azione})
                    note.append(f"il peso proprio è già massa (densità): togli l'azione "
                                f"{massa.azione} da masse_da_azioni")
    v.append(_v("riferimenti", "non_passato" if riferimenti else "passato",
                "; ".join([*note, f"riferimenti a oggetti inesistenti: {riferimenti or 'nessuno'}"]),
                riferimenti or None,
                note[0] if note else ("correggi il riferimento" if riferimenti else None)))

    v.append(_v("massa_nulla", "passato" if m.aste else "non_passato",
                f"{len(m.aste)} aste" if m.aste else "nessuna asta: massa totale zero"))

    vincolati = sorted(k for k, n in nodi.items() if n.vincolato())
    if not vincolati:
        v.append(_v("vincoli", "non_passato", "nessun nodo vincolato: il telaio è un moto rigido", None,
                    "vincola un nodo"))
    elif nodi and len(vincolati) == len(nodi) and all(
            not any(nodi[k].libero(i) for i in range(6)) for k in vincolati):
        v.append(_v("vincoli", "non_passato", "ogni nodo è incastrato: non resta nulla da calcolare"))
    else:
        v.append(_v("vincoli", "passato", f"{len(vincolati)} nodi vincolati: {vincolati}"))

    termici = [(a.id, c.asta) for a in m.azioni for c in a.carichi if c.tipo == "termico"]
    v.append(_v("carico_termico", "non_passato" if termici else "passato",
                "il carico termico non gira in v1 (forceBeamColumn a fibre non ha carico termico standard): "
                f"{termici}" if termici else "nessun carico termico", termici or None,
                "togli il carico termico" if termici else None))

    v.append(_v("moti_rigidi", "non_applicabile", "si legge dopo la corsa dalla prima frequenza (controllo autovalori)"))

    # Due controlli che in T1 non hanno un oracolo: dichiararli qui come «non applicabile» è
    # l'unico modo di non farli sembrare verdi. Il primo sostituisce `sezioni_senza_barre` del
    # resoconto del deck, che nessuno leggeva fuori dal comando `deck`.
    scoperte = [s.id for s in m.sezioni if _modello.senza_barre(s)]
    v.append(_v("armatura_mancante", "non_applicabile",
                "corse a fibre elastiche: le barre pesano nella massa, il controllo arriva "
                "con il non lineare (T4)", scoperte or None))
    vicini = _modello.grafo(m)
    piede = _modello.piedi(m, vicini)
    if not m.aste:
        v.append(_v("vincoli_dedotti", "non_applicabile", "nessuna asta: la regola del piede non si applica"))
    elif not piede:
        v.append(_v("vincoli_dedotti", "non_applicabile", "nessun piede individuato"))
    elif len(piede) == len(m.nodi):
        v.append(_v("vincoli_dedotti", "non_applicabile", _modello.NOTA_TUTTI_AL_PIEDE))
    else:
        # il conteggio componenti si mostra sempre qui: un modello spezzato in sottostrutture
        # non collegate resta leggibile nel verdetto, non solo nel comportamento di `piedi`
        componenti = f"{_modello.numero_componenti(m, vicini)} componenti"
        non_dichiarati = [k for k in piede if nodi[k].vincolo is None]
        if non_dichiarati:
            proposte = [p for p in _modello.proposte_vincoli(m, piede) if p["nodo"] in non_dichiarati]
            v.append(_v("vincoli_dedotti", "non_passato",
                        f"nodi al piede senza vincolo dichiarato: {non_dichiarati} ({componenti})",
                        non_dichiarati, "conferma i vincoli proposti al piede",
                        valori={"proposti": proposte}))
        else:
            v.append(_v("vincoli_dedotti", "passato",
                        f"{len(piede)} nodi al piede, tutti con vincolo dichiarato: {piede} ({componenti})"))
    return v


def rifiutato(verdetti: list[dict]) -> bool:
    return any(x["esito"] == "non_passato" for x in verdetti)
