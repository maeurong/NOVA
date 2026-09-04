"""Il modello dati di NOVA v1 (spec: «Modello dati»). Un file JSON, unità dichiarate, extra vietati."""
from __future__ import annotations

import hashlib
import json
from typing import Annotated, Literal, Union

from pydantic import BaseModel, ConfigDict, Field, ValidationError, model_validator

from meshrec.core import materiali as _materiali

UNITA = "mm-N-MPa-t-s"
VERSIONE_SCHEMA = 1


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


class Materiale(_Base):
    id: int
    nome: str
    tipo: Literal["calcestruzzo", "acciaio"]
    classe: str
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
    casi: list[Annotated[str, Field(pattern=r"^[ZC]\d+$")]]


class MassaDaAzione(_Base):
    azione: int
    coefficiente: float


class AnalisiModale(_Base):
    tipo: Literal["modale"]
    modi: int | Literal["auto"] = "auto"
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


def carica(dati: dict) -> Modello:
    """Dizionario → Modello, con migrazioni e un messaggio che nomina il campo sbagliato."""
    if not isinstance(dati, dict):
        raise ValueError("il modello deve essere un oggetto JSON")
    versione = dati.get("schema_version", 1)
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
            righe.append(f"{dove}: {err['msg']}")
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
