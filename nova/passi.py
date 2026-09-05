"""I passi della pushover e lo stato delle sezioni: dai recorder al `passi[]` della corsa.

Tre uscite del deck confluiscono qui, e nessuna delle tre da sola basta:

- `push_spostamenti.out` e `push_reazioni.out`, una riga per passo convergente (`-time` in
  testa), da cui escono lo spostamento di controllo, il taglio alla base e gli spostamenti
  di tutti i nodi;
- `push_sez{tag}_st{k}_f{i}.out`, una riga per passo e **una coppia (σ, ε) per elemento** di
  quel tag di sezione, da cui esce lo stato a due canali per stazione;
- il registro, che è il solo posto dove sta scritto **come** ogni passo è arrivato in fondo
  (l'algoritmo della scala, l'incremento dopo i dimezzamenti) e **se** la corsa è caduta.

Le soglie non si ricalcolano: vengono dai parametri che il deck ha già stampato in
`resoconto.materiali` (vincolo globale di T4), cioè esattamente i numeri che sono finiti
nel `.tcl`. Ricalcolarli qui vorrebbe dire poter divergere dal materiale che ha risposto.
"""
from __future__ import annotations

import math
import re
from pathlib import Path

import numpy as np

from meshrec.core import opensees
from nova import deck as _deck
from nova import modello as _modello

# Lo stato di una fibra, dal meno grave al più grave: due canali, e l'ordine serve perché la
# stazione porta il **peggiore** delle sue fibre, non l'ultimo letto.
SCALA_CALCESTRUZZO = ("elastica", "fessurata", "schiacciata")
SCALA_ACCIAIO = ("elastica", "snervata", "rotta")

_RIGA_PASSO_SPINTA = re.compile(
    re.escape(_deck.MARCA_PASSO_PUSHOVER)
    + r": passo (\d+) algoritmo (\S+) incremento (\S+) spostamento (\S+)")
_RIGA_CADUTA = re.compile(
    re.escape(_deck.MARCA_CADUTA)
    + r": passo (\d+) spostamento (\S+) algoritmo (\S+) motivo (\S+)")
_RIGA_U0 = re.compile(re.escape(_deck.MARCA_U0) + r": (\S+)")


def _matrice(percorso: Path, colonne: int) -> np.ndarray:
    """Tutte le righe di un recorder, con le due guardie di `opensees._ultima_riga` estese a
    ogni riga e una terza che non c'era: nessun numero non finito.

    Le tre dicono la stessa cosa con tre facce: quel che c'è scritto nel file non è il campo
    che il recorder doveva scrivere. Un `nan` in mezzo alla curva è la faccia peggiore, perché
    `float("nan")` si legge senza errore e arriva fino al JSON come un numero.
    """
    righe = [r for r in percorso.read_text(encoding="ascii", errors="ignore").splitlines() if r.split()]
    if not righe:
        raise ValueError(f"{percorso} non porta nessuna riga: il registratore non ha scritto "
                         "niente. Non è uno stato nullo, è una corsa che non c'è stata")
    valori = []
    for k, riga in enumerate(righe, start=1):
        campi = riga.split()
        if len(campi) != colonne:
            raise ValueError(f"{percorso}, passo {k}: {len(campi)} numeri invece di {colonne}. "
                             "L'uscita è troncata e i valori letti sarebbero parziali")
        try:
            numeri = [float(x) for x in campi]
        except ValueError as e:  # un campo che non è un numero: byte finiti a metà scrittura
            raise ValueError(f"{percorso}, passo {k}: {e}") from None
        if not all(math.isfinite(x) for x in numeri):
            raise ValueError(f"{percorso}, passo {k}: un valore non è un numero finito "
                             f"({riga.strip()}). Il solutore ha scritto un risultato guasto")
        valori.append(numeri)
    return np.array(valori, dtype=np.float64)


def _righe_curva(percorso: Path, colonne: int, n: int) -> np.ndarray:
    """Le ultime `n` righe di un recorder di nodo, con la guardia che `_matrice` non può dare:
    il **numero** di righe. Meno righe dei passi che il registro dichiara vuol dire che il
    file è stato troncato in coda, e uno slice `[-n:]` più corto non solleva — solleva molto
    dopo, come `IndexError` nudo dentro la composizione dei passi.
    """
    dati = _matrice(percorso, colonne)
    if len(dati) < n:
        raise ValueError(f"{percorso}: {len(dati)} passi invece di {n} dichiarati dal registro. "
                         "L'uscita è troncata in coda")
    return dati[-n:]


def _stato(eps: float, par: dict, ruolo: str) -> str:
    """Lo stato di una fibra dalle sole soglie che il deck ha stampato.

    Calcestruzzo: `schiacciata` oltre `epsU` (che è il copriferro a 0,35 % sulla fibra di
    copriferro e la `ε_cu2,c` della [4.1.11] nel nucleo, già distinti nel dizionario del
    materiale), `fessurata` oltre `ε_ct = f_ctm/E_c`, `elastica` in mezzo. Il canale della
    stazione prende il **peggiore** fra le sue fibre, copriferro e nucleo insieme: il
    copriferro schiaccia per primo, e la promessa di questa soglia si mantiene solo perché
    `deck._fibre_estreme` registra i quattro spigoli del contorno anche sulle sezioni confinate.

    La soglia di compressione «0,3·ε_c0» che la spec nomina nella definizione di `elastica`
    **non discrimina**: il canale del calcestruzzo ha tre valori e nessuno di essi descrive
    una compressione non lineare che non ha ancora schiacciato. Chiamarla `fessurata`
    direbbe di una fessura che non c'è. Resta come definizione, non come confine.
    """
    if ruolo == "acciaio":
        if abs(eps) >= par["eps_ud"]:
            return "rotta"
        return "snervata" if abs(eps) >= par["Fy"] / par["E"] else "elastica"
    if eps <= par["epsU"]:  # `epsU` è negativo nel dizionario: compressione
        return "schiacciata"
    return "fessurata" if eps >= par["ft"] / par["Ec"] else "elastica"


def _peggiore(stati: list[str], scala: tuple[str, ...]) -> str | None:
    return max(stati, key=scala.index) if stati else None


def _fibre_lette(cartella: Path, d: _deck.Deck, prefisso: str, con_tempo: bool,
                 n_passi: int) -> dict[tuple[int, int], list[list[dict]]]:
    """`{(tag_sezione, stazione): [per passo: [{ruolo, colonna → ε}]]}`, letto una volta sola.

    I file sono tanti (2 tag × 5 stazioni × 7 fibre sul telaio 2×1) e ognuno porta tutta la
    curva di **tutti** gli elementi di quel tag: rileggerli per passo sarebbe lo stesso file
    aperto sessanta volte.
    """
    per_tag = _deck.elementi_per_sezione(d.elementi)
    letto: dict[tuple[int, int], list[list[dict]]] = {}
    for tag_sezione, fibre in sorted(d.fibre_registrate.items()):
        elementi = per_tag.get(tag_sezione, [])
        if not elementi:
            continue
        colonne = (1 if con_tempo else 0) + 2 * len(elementi)
        salto = 1 if con_tempo else 0
        for st in range(1, _deck.STAZIONI + 1):
            per_passo: list[list[dict]] = [[] for _ in range(n_passi)]
            for i, f in enumerate(fibre):
                percorso = cartella / _deck.nome_fibra(prefisso, tag_sezione, st, i)
                dati = _matrice(percorso, colonne)
                if len(dati) < n_passi:
                    raise ValueError(f"{percorso}: {len(dati)} passi invece di {n_passi}. "
                                     "Il registratore delle fibre si è fermato prima della curva")
                for k in range(n_passi):
                    riga = dati[len(dati) - n_passi + k]
                    per_passo[k].append({
                        "ruolo": f["ruolo"],
                        # una coppia (σ, ε) per elemento, nell'ordine di `elementi_per_sezione`
                        "eps": {t: float(riga[salto + 2 * j + 1]) for j, t in enumerate(elementi)}})
            letto[(tag_sezione, st)] = per_passo
    return letto


def stato_sezioni(cartella: Path, d: _deck.Deck, prefisso: str, *, con_tempo: bool,
                  n_passi: int) -> list[dict[str, list[dict]]]:
    """Per passo: `{asta: [per stazione: {calcestruzzo, acciaio}]}`.

    Le stazioni sono **le stesse** di `corsa._stazioni` — stessi elementi, stesso salto della
    prima stazione di un elemento interno — così che `sollecitazioni[asta][i]` e
    `stato_sezioni[asta][i]` parlino sempre dello stesso punto dell'asta.

    Senza fibre registrate (corsa elastica) la lista è di dizionari vuoti: non c'è uno stato
    di sezione da leggere su una `patch` di `uniaxialMaterial Elastic`, e inventarne uno
    «elastico» direbbe di un controllo che nessuno ha fatto.
    """
    if not d.fibre_registrate:
        return [{} for _ in range(n_passi)]
    letto = _fibre_lette(cartella, d, prefisso, con_tempo, n_passi)
    fuori: list[dict[str, list[dict]]] = []
    for k in range(n_passi):
        per_asta: dict[str, list[dict]] = {}
        for id_asta, tags in d.mappa_asta.items():
            stazioni: list[dict] = []
            for t in tags:
                e = d.elementi[t - 1]
                materiali = d.materiali.get(str(d.sezione_per_tag.get(e.sezione_tag)), {})
                for st in range(1, _deck.STAZIONI + 1):
                    if stazioni and st == 1:
                        continue  # coincide con l'ultima stazione dell'elemento precedente
                    cls, acc = [], []
                    for f in letto.get((e.sezione_tag, st), [[]] * n_passi)[k]:
                        par = materiali.get(f["ruolo"])
                        if par is None:
                            continue
                        s = _stato(f["eps"][e.tag], par, f["ruolo"])
                        (acc if f["ruolo"] == "acciaio" else cls).append(s)
                    stazioni.append({"calcestruzzo": _peggiore(cls, SCALA_CALCESTRUZZO),
                                     "acciaio": _peggiore(acc, SCALA_ACCIAIO)})
            per_asta[str(id_asta)] = stazioni
        fuori.append(per_asta)
    return fuori


def leggi(cartella: Path, d: _deck.Deck, registro: str | None = None) -> dict:
    """`{"passi": [...], "caduta": None | {...}, "u0": float | None}` della pushover di
    questo deck. `u0` è lo zero della curva — lo spostamento che il nodo di controllo aveva
    **prima** della spinta — e senza di lui `passi[].spostamento` non si sa da dove è misurato;
    è `None` solo quando il modello non dichiara nessuna pushover.

    `registro` a `None` — il default — lo legge dal file che `corsa._lancia` ha già scritto
    nella cartella: la firma resta quella del piano e chi ha già il testo in mano non lo
    rilegge dal disco.

    La curva si ferma all'ultimo passo che il **registro** dichiara convergente, e non
    all'ultima riga dei recorder: sono lo stesso numero quando tutto va bene, e quando non
    va bene è il registro ad avere ragione (un recorder può avere una riga in più dal
    passo di gravità, che nella curva non ci va).
    """
    cartella = Path(cartella)
    an = d.pushover
    if an is None:  # prima di leggere il registro: senza pushover non c'è niente da cercarci
        return {"passi": [], "caduta": None, "u0": None}
    if registro is None:
        registro = (cartella / opensees.NOME_REGISTRO).read_text(encoding="utf-8", errors="replace")
    dichiarati = [(int(k), alg, float(inc), float(u)) for k, alg, inc, u in _RIGA_PASSO_SPINTA.findall(registro)]
    caduta = None
    trovata = _RIGA_CADUTA.findall(registro)
    if trovata:
        k, u, alg, motivo = trovata[-1]
        caduta = {"passo": int(k), "spostamento": float(u), "algoritmo": alg, "motivo": motivo}
    trovato_u0 = _RIGA_U0.findall(registro)
    if not trovato_u0:
        raise ValueError(
            f"il registro non porta il marcatore «{_deck.MARCA_U0}»: senza lo spostamento del "
            "nodo di controllo prima della spinta la curva non ha uno zero, e leggerla come "
            "assoluta darebbe una corsa più lunga o più corta di quella chiesta")
    u0 = float(trovato_u0[-1])
    n = len(dichiarati)
    if n == 0:
        return {"passi": [], "caduta": caduta, "u0": u0}

    n_nodi = len(d.nodi)
    tag_a_id = {v: k for k, v in d.mappa_nodo.items()}
    dof = _modello.DOF_COLONNA[an.dof]
    U = _righe_curva(cartella / f"{_deck.PREFISSO_PUSHOVER}_spostamenti.out", 1 + 6 * n_nodi, n)
    R = _righe_curva(cartella / f"{_deck.PREFISSO_PUSHOVER}_reazioni.out", 1 + 6 * n_nodi, n)
    stati = stato_sezioni(cartella, d, _deck.PREFISSO_PUSHOVER, con_tempo=True, n_passi=n)
    tag_controllo = d.mappa_nodo[an.nodo_controllo]

    def colonna(tag: int, i: int) -> int:
        return 1 + 6 * (tag - 1) + i

    passi = []
    for k, (numero, algoritmo, incremento, _) in enumerate(dichiarati):
        passi.append({
            "n": numero,
            # relativo a `u0`: la curva parte da zero, non dalla quota che la gravità
            # ha lasciato al nodo di controllo
            "spostamento": float(U[k, colonna(tag_controllo, dof)]) - u0,
            # il taglio alla base **è** la somma delle reazioni cambiata di segno: la stessa
            # identità che il verdetto `reazioni` controlla sui casi statici, per passo
            "taglio_base": float(-sum(R[k, colonna(t, dof)] for t in d.vincolati)),
            "spostamenti": {str(tag_a_id[t]): [float(x) for x in U[k, colonna(t, 0):colonna(t, 6)]]
                            for t in tag_a_id},
            "stato_sezioni": stati[k],
            "algoritmo": algoritmo,
            "incremento": incremento,
        })
    return {"passi": passi, "caduta": caduta, "u0": u0}
