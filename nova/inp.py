"""Parser minimo del deck `.inp` di CalculiX: le sole carte che servono a leggere una corsa.

Niente meshio: settanta righe di parsing contro una dipendenza nuova (decisione del piano
T3). Legge quello che MeshRec scrive — nodi, tetraedri, set di nodi, vincoli, materiale,
gravità, passi — e ignora tutto il resto senza lamentarsi: un deck può portare carte che
qui non contano, e rifiutarlo per quelle sarebbe rifiutare un deck valido.

Il volume e la **quota tributaria dei nodi vincolati** stanno qui e non in `ccx.py` perché
vengono dalla mesh, non dalla corsa: sono l'oracolo con cui si legge il `.dat`, e vanno
calcolabili senza aver lanciato niente.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import numpy as np

_MARCA_NOME = "** NOME PASSO:"

# Il tetraedro lineare è l'unico elemento su cui volume e quota tributaria sono esatti:
# le funzioni di forma sono lineari, l'integrale della gravità è V/4 a ciascuno dei quattro
# vertici. Su C3D10 sarebbero -V/20 ai vertici e +V/5 ai nodi di lato, e il volume del
# tetraedro a lati dritti non è nemmeno quello vero (`meshrec/core/solve.py:1091`, che quel
# conto ce l'ha ma **non è riusabile**: chiama `abaqus.NODI_PER_ELEMENTO`, che in questo
# checkout non esiste, e solleva `AttributeError`. `meshrec/` non si tocca).
# Con un altro elemento volume e massa restano `None` e il verdetto sulle reazioni esce
# `non_applicabile`, che è la risposta onesta: non un numero plausibile e sbagliato.
TIPO_ESATTO = "C3D4"

# Il grado di libertà lungo z. La quota tributaria si somma sui soli nodi bloccati in
# quella direzione: `Passo.gravita` pretende una gravità lungo −z, e un vincolo di
# simmetria (`*BOUNDARY SIMM, 1, 2`) non regge un grammo di quel peso.
_DOF_VERTICALE = 3


@dataclass(frozen=True)
class Passo:
    """Un `*STEP` del deck. `gravita` è vero solo sul passo che porta il **solo** peso
    proprio: un `*DLOAD … GRAV` verso il basso e nient'altro. Sugli altri la somma delle
    reazioni non è più il peso, e nessun oracolo chiuso la prevede senza ricostruire i
    carichi del deck."""

    nome: str
    tipo: str            # "statico" | "modale"
    n_modi: int | None
    gravita: bool
    g: float | None      # il `GRAV` di **questo** passo, non il primo del file


@dataclass(frozen=True)
class Inp:
    passi: list[Passo]
    set_nodi: dict[str, list[int]]
    vincoli: list[tuple[str, int, int]]   # (set o nodo, dof iniziale, dof finale)
    densita: float | None
    elastico: tuple[float, float] | None
    g: float | None
    tipo_elemento: str | None
    nodi: dict[int, tuple[float, float, float]]
    elementi: list[tuple[int, ...]]

    @property
    def vincolati(self) -> list[int]:
        """I nodi bloccati lungo z, gli unici che portano via una quota del peso."""
        nodi: set[int] = set()
        for nome, inizio, fine in self.vincoli:
            if inizio <= _DOF_VERTICALE <= fine:
                nodi.update([int(nome)] if nome.lstrip("+-").isdigit() else self.set_nodi.get(nome, ()))
        return sorted(nodi)

    @property
    def n_nodi(self) -> int:
        return len(self.nodi)

    @property
    def n_elementi(self) -> int:
        return len(self.elementi)

    def _volumi(self) -> np.ndarray | None:
        """Il volume con segno di ogni tetraedro, in valore assoluto. `None` se la mesh non
        è di C3D4: vedi `TIPO_ESATTO`."""
        if self.tipo_elemento != TIPO_ESATTO or not self.elementi:
            return None
        ids = sorted(self.nodi)
        posto = {n: i for i, n in enumerate(ids)}
        punti = np.array([self.nodi[n] for n in ids], dtype=np.float64)
        try:
            celle = np.array([[posto[n] for n in e[:4]] for e in self.elementi], dtype=np.int64)
        except KeyError as e:
            raise ValueError(f"il deck cita il nodo {e.args[0]} in un elemento ma non lo definisce") from None
        a = punti[celle[:, 1]] - punti[celle[:, 0]]
        b = punti[celle[:, 2]] - punti[celle[:, 0]]
        c = punti[celle[:, 3]] - punti[celle[:, 0]]
        return np.abs(np.einsum("ij,ij->i", a, np.cross(b, c))) / 6.0

    @property
    def volume(self) -> float | None:
        v = self._volumi()
        return None if v is None else float(v.sum())

    @property
    def massa(self) -> float | None:
        """ρ·V della mesh, non Σ Rz / g: le due cose differiscono di `quota_vincolati`."""
        v = self.volume
        return None if v is None or self.densita is None else self.densita * v

    @property
    def quota_vincolati(self) -> float | None:
        """La massa che il carico di gravità assegna **direttamente** ai nodi vincolati.

        È la quota che `ccx` non riporta nella `RF` di quei nodi (manuale CalculiX §6.11.5:
        «RF gives you the sum of the reaction forces and the loading forces»), e senza
        toglierla dal peso atteso il controllo di equilibrio è falso: sulla fixture piccola
        vale il 2,5 % del peso, sul deck vero il 22 % (3 743 nodi vincolati su 14 116).
        """
        v = self._volumi()
        if v is None or self.densita is None:
            return None
        vincolati = set(self.vincolati)
        quanti = np.array([sum(n in vincolati for n in e[:4]) for e in self.elementi], dtype=np.float64)
        return float(self.densita * (v * quanti / 4.0).sum())


def _carta(riga: str) -> tuple[str, dict[str, str]]:
    """`*NODE PRINT, NSET=BASE` → `("NODE PRINT", {"NSET": "BASE"})`.

    La parola chiave è tutto ciò che precede la prima virgola, spazi normalizzati: senza
    questo `*NODE PRINT` e `*NODE FILE` conterebbero come `*NODE` e ogni loro riga di dati
    finirebbe fra i nodi della mesh.
    """
    pezzi = [x.strip() for x in riga.split(",")]
    parametri: dict[str, str] = {}
    for x in pezzi[1:]:
        chiave, _, valore = x.partition("=")
        parametri[chiave.strip().upper()] = valore.strip()
    return " ".join(pezzi[0][1:].upper().split()), parametri


def _gravitazionale(passo: dict) -> bool:
    """Il solo peso proprio e nient'altro: un `*CLOAD`, una pressione `*DSLOAD` o un secondo
    `*DLOAD` qualsiasi tolgono il passo dai gravitazionali, perché la somma delle reazioni
    non è più il peso e nessun oracolo chiuso la prevede."""
    return (passo["tipo"] == "statico" and not passo["altri"] and len(passo["dload"]) == 1
            and passo["dload"][0][1] == (0.0, 0.0, -1.0))


def leggi(percorso: str | Path) -> Inp:
    """Il deck, o il motivo per cui non è un deck. Solleva `ValueError` nominando il file."""
    p = Path(percorso)
    try:
        righe = p.read_text(encoding="utf-8").splitlines()
    except (OSError, UnicodeDecodeError) as e:
        raise ValueError(f"{p} non è un deck .inp leggibile: {e}") from None

    nodi: dict[int, tuple[float, float, float]] = {}
    elementi: list[tuple[int, ...]] = []
    set_nodi: dict[str, list[int]] = {}
    vincoli: list[tuple[str, int, int]] = []
    passi: list[Passo] = []
    tipi: set[str] = set()
    densita = elastico = g = None
    sezione, parametri, nome_atteso, aperto, continua = None, {}, None, None, False

    for numero, riga in enumerate(righe, start=1):
        pulita = riga.strip()
        if not pulita:
            continue
        if pulita.startswith("**"):
            if pulita.upper().startswith(_MARCA_NOME):
                nome_atteso = pulita[len(_MARCA_NOME):].strip()
            continue
        if pulita.startswith("*"):
            sezione, parametri = _carta(pulita)
            continua = False
            if sezione == "STEP":
                aperto = {"nome": nome_atteso or f"passo {len(passi) + 1}", "tipo": "statico",
                          "n_modi": None, "dload": [], "altri": False, "g": None}
                nome_atteso = None
            elif aperto is not None and sezione == "FREQUENCY":
                aperto["tipo"] = "modale"
            elif aperto is not None and sezione == "END STEP":
                if any(x.nome == aperto["nome"] for x in passi):
                    raise ValueError(f"{p}, riga {numero}: nome di passo duplicato «{aperto['nome']}». "
                                     "I risultati sono per nome di passo, e due passi con lo stesso "
                                     "nome ne lascerebbero uno solo")
                passi.append(Passo(aperto["nome"], aperto["tipo"], aperto["n_modi"],
                                   _gravitazionale(aperto), aperto["g"]))
                aperto = None
            elif sezione == "ELEMENT":
                tipi.add(parametri.get("TYPE", "").upper())
            elif sezione == "NSET":
                set_nodi.setdefault(parametri.get("NSET", "").upper(), [])
            continue
        campi = [x.strip() for x in pulita.split(",")]
        try:
            if sezione == "NODE":
                nodi[int(campi[0])] = tuple(float(x) for x in campi[1:4])
            elif sezione == "ELEMENT":
                numeri = [int(x) for x in campi if x]
                # una riga che finisce in virgola continua nella successiva: senza questo
                # la continuazione diventerebbe un elemento in più
                if continua:
                    elementi[-1] = (*elementi[-1], *numeri)
                else:
                    elementi.append(tuple(numeri[1:]))
                continua = pulita.endswith(",")
            elif sezione == "NSET":
                numeri = [int(x) for x in campi if x]
                if "GENERATE" in parametri:
                    inizio, fine, salto = (numeri + [1])[:3]
                    numeri = list(range(inizio, fine + 1, salto))
                set_nodi[parametri.get("NSET", "").upper()] += numeri
            elif sezione == "BOUNDARY":
                # i dof contano: `BASE, 1, 3` regge il peso, `SIMM, 1, 2` no
                vincoli.append((campi[0].upper(), int(campi[1]), int(campi[2] if len(campi) > 2 else campi[1])))
            elif sezione == "DENSITY" and densita is None:
                densita = float(campi[0])
            elif sezione == "ELASTIC" and elastico is None:
                elastico = (float(campi[0]), float(campi[1]))
            elif sezione == "FREQUENCY" and aperto is not None and aperto["n_modi"] is None:
                aperto["n_modi"] = int(campi[0])
            elif sezione == "DLOAD" and aperto is not None:
                if len(campi) >= 6 and campi[1].upper() == "GRAV":
                    aperto["dload"].append((float(campi[2]), tuple(float(x) for x in campi[3:6])))
                    aperto["g"] = aperto["g"] if aperto["g"] is not None else float(campi[2])
                    g = g if g is not None else float(campi[2])
                else:
                    aperto["altri"] = True
            elif sezione in ("CLOAD", "DSLOAD") and aperto is not None:
                aperto["altri"] = True
        except (ValueError, IndexError) as e:
            raise ValueError(f"{p}, riga {numero}: riga di dati illeggibile sotto *{sezione} ({e}). "
                             f"Riga letta: {riga!r}") from None

    if not passi:
        raise ValueError(f"{p}: nessun passo (*STEP) nel deck, non c'è niente da risolvere")
    # più tipi di elemento nella stessa mesh: il nome li porta tutti, e `_volumi` si ferma —
    # senza questo numpy solleverebbe sulle righe di lunghezza diversa, a corsa già fatta
    return Inp(passi=passi, set_nodi=set_nodi, vincoli=vincoli, densita=densita, elastico=elastico,
               g=g, tipo_elemento="+".join(sorted(tipi)) or None, nodi=nodi, elementi=elementi)
