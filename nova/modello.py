"""Il modello dati di NOVA v1 (spec: «Modello dati»). Un file JSON, unità dichiarate, extra vietati."""
from __future__ import annotations

import hashlib
import json
import math
import re
from typing import Annotated, Literal, Union

from pydantic import BaseModel, ConfigDict, Field, ValidationError, model_validator

from meshrec.core import materiali as _materiali

UNITA = "mm-N-MPa-t-s"
VERSIONE_SCHEMA = 1

# La forma di un caso di carico, in **un** punto solo: `AnalisiStatica` la dà a pydantic,
# `deck.py` e `server.py` la rileggono da qui. Chi la usa in Python passa da `caso_valido`
# e non da `match`: `$` di Python accetta l'a capo finale, e `int("1\n")` non se ne accorge.
FORMA_CASO = r"^[ZC][0-9]+$"
_FORMA_CASO = re.compile(FORMA_CASO)


def caso_valido(caso) -> bool:
    return isinstance(caso, str) and _FORMA_CASO.fullmatch(caso) is not None


class _Base(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)


class Origine(_Base):
    sorgente: Literal["rilievo", "utente"] = "utente"
    riferimento: str | None = None
    file: str | None = None
    nota: str | None = None
    modificata: bool = False


class Vincolo(_Base):
    ux: bool = False
    uy: bool = False
    uz: bool = False
    rx: bool = False
    ry: bool = False
    rz: bool = False

    def gradi(self) -> tuple[int, int, int, int, int, int]:
        return tuple(int(v) for v in (self.ux, self.uy, self.uz, self.rx, self.ry, self.rz))


class Nodo(_Base):
    id: int
    nome: str | None = None
    x: float
    y: float = 0.0
    z: float
    # `None` = vincolo non dichiarato (il check C1 lo segnala se il nodo è al piede);
    # `Vincolo()`/`{}` = dichiarato libero, tutti i gradi falsi: è una scelta dell'utente,
    # non una dimenticanza, e `vincoli_dedotti` la accetta senza chiedere conferma.
    vincolo: Vincolo | None = None
    massa_nodale: float = Field(default=0.0, ge=0.0)
    origine: Origine | None = None


class Danno(_Base):
    fattore_E: float = Field(gt=0.0, le=1.0)
    fattore_fc: float = Field(gt=0.0, le=1.0)
    nota: str


class Asta(_Base):
    id: int
    nome: str | None = None
    nodo_i: int
    nodo_j: int
    sezione: int
    rotazione_deg: float = 0.0
    suddivisioni: int = Field(default=1, ge=1)
    danno: Danno | None = None
    origine: Origine | None = None


class Fila(_Base):
    lato: Literal["sup", "inf", "sx", "dx"]
    n: int = Field(ge=1)
    diametro: float = Field(gt=0.0)


class Staffe(_Base):
    diametro: float = Field(gt=0.0)
    passo: float = Field(gt=0.0)
    bracci: int = Field(default=2, ge=2)


class Riduzione(_Base):
    sup: float = Field(default=0.0, ge=0.0)
    inf: float = Field(default=0.0, ge=0.0)
    sx: float = Field(default=0.0, ge=0.0)
    dx: float = Field(default=0.0, ge=0.0)


class Sezione(_Base):
    id: int
    nome: str
    tipo: Literal["rettangolare"] = "rettangolare"
    b: float = Field(gt=0.0)
    h: float = Field(gt=0.0)
    riduzione: Riduzione | None = None
    calcestruzzo: int
    acciaio: int
    copriferro: float = Field(ge=0.0)
    file: list[Fila] = []
    staffe: Staffe | None = None
    origine: Origine | None = None


def senza_barre(s: Sezione) -> bool:
    """La sezione non porta barre: nessuna fila dichiarata, o nessuna staffa da cui scostarle.

    Sta qui e non in `deck.py` perché il Check Model (C1) la legge **prima** del deck, e non
    deve tirarsi dietro il generatore del `.tcl` per una condizione sul modello dati.
    """
    return not s.file or s.staffe is None


class Materiale(_Base):
    id: int
    nome: str
    tipo: Literal["calcestruzzo", "acciaio"]
    # `deck.py` scrive questo campo in un commento Tcl (`;# {classe}`): il set di
    # caratteri chiude la Tcl injection (`\n`/`{`/`}` = un comando) SEMPRE, anche
    # con `personalizzato: true` — non solo quando la classe deve esistere a catalogo.
    classe: str = Field(pattern=r"^[A-Za-z0-9 /_.-]+$")
    origine: Origine | None = None
    valori: dict[str, float] = {}
    personalizzato: bool = False

    @model_validator(mode="after")
    def _la_classe_esiste_nel_catalogo(self):
        """Se non è un materiale a valori scritti a mano, la classe deve esistere di norma."""
        if not self.personalizzato:
            try:
                _materiali.trova(self.classe)
            except KeyError as e:
                raise ValueError(str(e.args[0])) from None
        return self


class CaricoNodale(_Base):
    tipo: Literal["nodale"]
    nodo: int
    Fx: float = 0.0
    Fy: float = 0.0
    Fz: float = 0.0
    Mx: float = 0.0
    My: float = 0.0
    Mz: float = 0.0


class CaricoDistribuito(_Base):
    tipo: Literal["distribuito"]
    asta: int
    q: float
    direzione: Literal["x", "y", "z", "locale_y", "locale_z"] = "z"


class CaricoGravita(_Base):
    tipo: Literal["gravita"]
    fattore_x: float = 0.0
    fattore_y: float = 0.0
    fattore_z: float = 0.0


class Cedimento(_Base):
    tipo: Literal["cedimento"]
    nodo: int
    ux: float | None = None
    uy: float | None = None
    uz: float | None = None
    rx: float | None = None
    ry: float | None = None
    rz: float | None = None


class Termico(_Base):
    tipo: Literal["termico"]
    asta: int
    dT_uniforme: float = 0.0
    gradiente: float | None = None


Carico = Annotated[
    Union[CaricoNodale, CaricoDistribuito, CaricoGravita, Cedimento, Termico],
    Field(discriminator="tipo"),
]


class Azione(_Base):
    id: int
    nome: str
    natura: Literal["G1", "G2", "Q", "E"]
    categoria: str | None = None
    generata: bool = False
    carichi: list[Carico] = []

    @model_validator(mode="after")
    def _q_ha_la_categoria(self):
        if self.natura == "Q" and not self.categoria:
            raise ValueError(f"azione {self.id} «{self.nome}»: natura Q senza categoria d'uso")
        return self


class Termine(_Base):
    azione: int
    coefficiente: float


class Combinazione(_Base):
    id: int
    nome: str
    termini: list[Termine]
    tipo: Literal["fondamentale", "caratteristica", "frequente", "quasi_permanente", "sismica"] | None = None
    generata: bool = False


class AnalisiStatica(_Base):
    tipo: Literal["statica"]
    casi: list[Annotated[str, Field(pattern=FORMA_CASO)]]


class MassaDaAzione(_Base):
    azione: int
    coefficiente: float = Field(ge=0)  # è la ψ di NTC [2.5.7]: una frazione, mai una massa che si toglie


class AnalisiModale(_Base):
    tipo: Literal["modale"]
    modi: Annotated[int, Field(ge=1)] | Literal["auto"] = "auto"
    masse_da_azioni: list[MassaDaAzione] = []


Analisi = Annotated[Union[AnalisiStatica, AnalisiModale], Field(discriminator="tipo")]


class ImpostazioniAnalisi(_Base):
    fibre: int = Field(default=10, ge=2)
    veste: Literal["caratteristica", "media", "progetto", "esistente"] = "media"


class Modello(_Base):
    schema_version: int = 1
    unita: Literal["mm-N-MPa-t-s"]
    contatori: dict[str, int] = {}
    nodi: list[Nodo] = []
    aste: list[Asta] = []
    sezioni: list[Sezione] = []
    materiali: list[Materiale] = []
    azioni: list[Azione] = []
    combinazioni: list[Combinazione] = []
    analisi: list[Analisi] = []
    impostazioni_analisi: ImpostazioniAnalisi = ImpostazioniAnalisi()

    def nodo(self, id: int) -> Nodo | None:
        return next((n for n in self.nodi if n.id == id), None)

    def sezione(self, id: int) -> Sezione | None:
        return next((s for s in self.sezioni if s.id == id), None)

    def materiale(self, id: int) -> Materiale | None:
        return next((m for m in self.materiali if m.id == id), None)

    def azione(self, id: int) -> Azione | None:
        return next((a for a in self.azioni if a.id == id), None)

    def combinazione(self, id: int) -> Combinazione | None:
        return next((c for c in self.combinazioni if c.id == id), None)

    @model_validator(mode="after")
    def _niente_id_duplicati(self):
        """Vincolo del piano: «Identificatori: interi per tipo, mai riusati»."""
        for tipo, lista in (("nodo", self.nodi), ("asta", self.aste), ("sezione", self.sezioni),
                            ("materiale", self.materiali), ("azione", self.azioni),
                            ("combinazione", self.combinazioni)):
            visti = set()
            for el in lista:
                if el.id in visti:
                    raise ValueError(f"id duplicato: {tipo} {el.id}")
                visti.add(el.id)
        return self


MIGRAZIONI: dict[int, callable] = {}  # {da_versione: fn(dati) -> dati}; vuoto finché lo schema è 1


# I `type` di pydantic più comuni, tradotti; gli altri passano col `msg` inglese di pydantic
# com'è (meglio un inglese leggibile che un buco nella traduzione). Le frasi si formattano
# col `ctx` dell'errore, che porta il limite vero (`gt`, `ge`, …).
_FRASI_ERRORE: dict[str, str] = {
    "missing": "campo obbligatorio",
    "extra_forbidden": "campo non previsto",
    "int_parsing": "deve essere un numero intero",
    "float_parsing": "deve essere un numero",
    "literal_error": "valore non ammesso",
    "string_pattern_mismatch": "non rispetta il formato richiesto",
    "finite_number": "deve essere un numero finito (niente NaN/Infinity)",
    "greater_than": "deve essere maggiore di {gt:g}",
    "greater_than_equal": "deve essere maggiore o uguale al minimo consentito",
}

# Pydantic incarta il `ValueError` di un validator scritto a mano in «Value error, …»:
# a chi legge il rifiuto quel prefisso non dice nulla che non sappia già.
_PREFISSO_PYDANTIC = "Value error, "


def _frase(err: dict) -> str:
    modello = _FRASI_ERRORE.get(err["type"])
    if modello is None:
        return err["msg"].removeprefix(_PREFISSO_PYDANTIC)
    return modello.format(**err.get("ctx", {}))


def carica(dati: dict) -> Modello:
    """Dizionario → Modello, con migrazioni e un messaggio che nomina il campo sbagliato."""
    if not isinstance(dati, dict):
        raise ValueError("il modello deve essere un oggetto JSON")
    versione = dati.get("schema_version", 1)
    # `bool` è un `int` per Python ma non è una versione di schema; il confronto con
    # `VERSIONE_SCHEMA` su una stringa o una lista darebbe `TypeError` invece del rifiuto.
    if type(versione) is not int:
        raise ValueError(f"schema_version deve essere un intero, non {type(versione).__name__}")
    while versione in MIGRAZIONI:
        dati = MIGRAZIONI[versione](dati)
        versione = dati["schema_version"]
    if versione > VERSIONE_SCHEMA:
        raise ValueError(
            f"schema_version {versione} non supportata: questa NOVA legge fino a {VERSIONE_SCHEMA}"
        )
    try:
        return Modello.model_validate(dati)
    except ValidationError as e:
        righe = []
        for err in e.errors():
            dove = ".".join(str(p) for p in err["loc"]) or "radice"
            righe.append(f"{dove}: {_frase(err)}")
        raise ValueError("modello rifiutato — " + "; ".join(righe)) from None


def impronta(m: Modello) -> str:
    canonico = json.dumps(m.model_dump(mode="json", exclude_none=True), sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonico.encode("utf-8")).hexdigest()


def assicura_peso_proprio(m: Modello) -> Modello:
    """L'unica azione che il programma genera: G1, gravità −1 lungo z, acciaio compreso (il deck la pesa)."""
    if any(a.generata for a in m.azioni):
        return m
    prossimo = max([m.contatori.get("azione", 0)] + [a.id for a in m.azioni]) + 1
    m.azioni.append(Azione(id=prossimo, nome="peso proprio", natura="G1", generata=True,
                           carichi=[CaricoGravita(tipo="gravita", fattore_z=-1.0)]))
    m.contatori["azione"] = prossimo
    return m


def casi_dichiarati(m: Modello) -> list[str]:
    return [f"Z{a.id}" for a in m.azioni] + [f"C{c.id}" for c in m.combinazioni]


def piedi(m: Modello) -> list[int]:
    """Gli id dei nodi che poggiano a terra, dedotti dalla struttura e non da una soglia.

    È la regola di `meshrec.core.opensees._al_piede`, riscritta sui nodi e sulle aste di
    NOVA (là vuole gli elementi di MeshRec). Nessuna tolleranza sulla quota, e la ragione è
    il difetto che quella regola ha sostituito: sul telaio sintetico la trave di fondazione
    ha l'asse fuori piano di mezzo grado e i suoi nodi si spandono di quindici millimetri in
    quota, così una tolleranza «entro un epsilon dalla quota minima» ne incastrava uno solo.

    1. La membratura coricata che tocca il punto più basso ci poggia per tutta la propria
       lunghezza: si parte dal nodo di quota minima e si cammina sulle sole aste coricate.
    2. Ogni nodo da cui la struttura sale soltanto, e sale in piedi: sotto non prosegue
       niente, quindi o poggia o penzola; che le aste siano in piedi esclude la punta di
       uno sbalzo.

    Sta qui e non in `nova.importa` perché il Check Model (C1, `nova.check`) la usa e gira
    **prima** del deck: `nova.importa` importa `nova.deck` (per la terna e le dimensioni di
    sezione), e farla dipendere da `check` la tirerebbe dentro quella catena.
    """
    nodi = {n.id: n for n in m.nodi}
    vicini: dict[int, list[tuple[int, bool]]] = {}
    for a in m.aste:
        i, j = nodi.get(a.nodo_i), nodi.get(a.nodo_j)
        if i is None or j is None or i.id == j.id:
            continue
        coricata = abs(j.z - i.z) < math.hypot(j.x - i.x, j.y - i.y)
        vicini.setdefault(i.id, []).append((j.id, coricata))
        vicini.setdefault(j.id, []).append((i.id, coricata))
    if not vicini:
        return []

    # `min` sui soli nodi che un'asta tocca, e a parità di quota l'id più piccolo: un nodo
    # isolato più in basso non è un piede, è un nodo da cui non si cammina da nessuna parte.
    partenza = min(vicini, key=lambda k: (nodi[k].z, k))
    a_terra = {partenza}
    da_visitare = [partenza]
    while da_visitare:
        for altro, coricata in vicini.get(da_visitare.pop(), ()):
            if coricata and altro not in a_terra:
                a_terra.add(altro)
                da_visitare.append(altro)
    a_terra.update(
        k for k, intorno in vicini.items()
        if all(not coricata and nodi[altro].z > nodi[k].z for altro, coricata in intorno)
    )
    return sorted(a_terra)


NOTA_TUTTI_AL_PIEDE = "tutti i nodi sarebbero al piede: nessuna proposta"


def proposte_vincoli(m: Modello) -> list[dict]:
    """Un incastro per ogni nodo al piede, da proporre e non da applicare: dove il pezzo
    poggia è una lettura, non una misura del rilievo.

    Nessuna proposta quando **ogni** nodo cadrebbe al piede — un rilievo della sola trave di
    fondazione: incastrare tutto è il modello che `check_model` rifiuta («non resta nulla da
    calcolare»), e proporlo sarebbe proporre una risposta sbagliata invece di nessuna.
    """
    a_terra = piedi(m)
    if not a_terra or len(a_terra) == len(m.nodi):
        return []
    incastro = {"ux": True, "uy": True, "uz": True, "rx": True, "ry": True, "rz": True}
    return [{"nodo": k, "vincolo": dict(incastro)} for k in a_terra]
