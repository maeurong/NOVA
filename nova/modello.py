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

    def libero(self, i: int) -> bool:
        """Il grado `i` (l'ordine di `gradi`) non è bloccato."""
        return not self.gradi()[i]


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

    # `deck`, `check` e `modale` chiedevano «questo grado è libero?» in cinque modi diversi,
    # ognuno con la propria gestione del vincolo assente. Le due domande stanno qui.
    def libero(self, i: int) -> bool:
        """Il grado `i` è libero. Vincolo non dichiarato = tutti e sei liberi."""
        return self.vincolo is None or self.vincolo.libero(i)

    def vincolato(self) -> bool:
        """Almeno un grado bloccato: è il nodo per cui il deck scrive una riga `fix`."""
        return not all(self.libero(i) for i in range(6))


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


class Legame(_Base):
    """Il legame costitutivo non lineare di un materiale: tutti campi, tutti sovrascrivibili.

    I default sono quelli che `nova/legami.py` deriva dalla classe NTC e dalla veste; qui
    stanno solo le scelte che la norma non fissa (`lambda`, `fpcu/fpc`, `R0 cR1 cR2`) e le
    deroghe a quelle che fissa (`epsU_nucleo` contro la [4.1.11], `fym` contro `f_yk`).
    `None` non vuol dire zero: vuol dire «lo decide la norma».

    `lambda` è una parola riservata di Python. Il campo si chiama `lambda_` e l'alias tiene
    il nome che il JSON e la riga `uniaxialMaterial` portano davvero; `populate_by_name` e
    `serialize_by_alias` fanno sì che entrambe le grafie entrino e che il `model_dump` che
    `server.py` risalva si rilegga da solo, che con `extra="forbid"` non è scontato.
    """
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    # Il materiale non dichiara il proprio `uniaxialMaterial`: lo decide `confinamento` per il
    # calcestruzzo (`Concrete02` di norma, `Concrete04` con Mander) e la famiglia per l'acciaio.
    confinamento: Literal["nessuno", "ntc", "mander"] = "ntc"
    epsU_copriferro: float = Field(0.0035, gt=0)
    epsU_nucleo: float | None = Field(None, gt=0)  # None → ε_cu2,c dalla [4.1.11]
    lambda_: float = Field(0.1, ge=0, le=1, alias="lambda")  # è un rapporto fra pendenze
    fpcu_su_fpc: float = Field(0.2, ge=0)  # 0 = copriferro che si sbriciola (RCFrameGravity)
    Es: float = Field(200000.0, gt=0)
    fym: float | None = None  # None → f_yk della classe (450 per B450C): f_ym non ha fonte
    b: float | None = Field(None, ge=0)  # None → da k e ε_ud della classe; 0 = elastico-perfetto
    R0: float = Field(18, gt=0)
    cR1: float = 0.925
    cR2: float = 0.15


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
    legame: Legame = Legame()

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
    """`legami: "fibre"` è la stessa statica con le sezioni non lineari e il carico applicato in
    `passi` incrementi (`LoadControl 1/passi`) invece che in una botta sola.

    La veste dei legami **non** sta qui: è `impostazioni_analisi.veste`, una per modello, perché
    un pilastro non può essere di calcestruzzo medio in una corsa e caratteristico in un'altra
    dentro lo stesso deck — i tag di sezione sono gli stessi.
    """
    tipo: Literal["statica"]
    casi: list[Annotated[str, Field(pattern=FORMA_CASO)]]
    legami: Literal["elastico", "fibre"] = "elastico"
    passi: int = Field(10, ge=1)


class MassaDaAzione(_Base):
    azione: int
    coefficiente: float = Field(ge=0)  # è la ψ di NTC [2.5.7]: una frazione, mai una massa che si toglie


class AnalisiModale(_Base):
    tipo: Literal["modale"]
    modi: Annotated[int, Field(ge=1)] | Literal["auto"] = "auto"
    masse_da_azioni: list[MassaDaAzione] = []


class ForzaNodale(_Base):
    nodo: int
    fx: float = 0.0
    fy: float = 0.0
    fz: float = 0.0


class AnalisiPushover(_Base):
    """La pushover monotona in controllo di spostamento: si spinge il `nodo_controllo` lungo
    `dof` a passi di `incremento` fino a `spostamento_max`, e si legge il taglio alla base.

    `caso_gravita` è il caso statico applicato **prima** e tenuto addosso alla struttura con
    `loadConst -time 0.0`: senza, la pushover partirebbe da una struttura scarica, che non è
    la condizione in cui un edificio prende il sisma.

    Non porta `legami`: la pushover **è** a fibre, e il Check Model rifiuta un modello che
    non dichiari almeno una statica «legami: fibre» — i tag di sezione sono gli stessi per
    tutto il deck, e una pushover su sezioni elastiche sarebbe una retta con un nome non lineare.
    """
    tipo: Literal["pushover"]
    distribuzione: Literal["nodale", "uniforme", "modo1"]
    nodo_controllo: int
    dof: Literal["ux", "uy", "uz"]
    incremento: float = Field(gt=0)
    spostamento_max: float = Field(gt=0)
    forze_nodali: list[ForzaNodale] = []
    caso_gravita: Annotated[str, Field(pattern=FORMA_CASO)] | None = None
    passi_max: int = Field(2000, ge=1)


Analisi = Annotated[Union[AnalisiStatica, AnalisiModale, AnalisiPushover],
                    Field(discriminator="tipo")]


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



def grafo(m: Modello) -> dict[int, list[tuple[int, bool]]]:
    """Nodo → lista di `(vicino, coricata)`: il grafo su cui camminano `piedi` e `numero_componenti`.

    È pubblico perché `check.py` chiede a entrambe la loro risposta per lo stesso verdetto, e
    costruirlo due volte era camminare due volte le stesse aste.
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
    return vicini


def _componenti(vicini: dict[int, list[tuple[int, bool]]]) -> list[set[int]]:
    """I nodi del grafo raggruppati per componente connessa, qualunque sia l'asta che li lega."""
    visti: set[int] = set()
    gruppi: list[set[int]] = []
    for partenza in vicini:
        if partenza in visti:
            continue
        gruppo, coda = {partenza}, [partenza]
        while coda:
            for altro, _ in vicini.get(coda.pop(), ()):
                if altro not in gruppo:
                    gruppo.add(altro)
                    coda.append(altro)
        visti |= gruppo
        gruppi.append(gruppo)
    return gruppi


def piedi(m: Modello, vicini: dict | None = None) -> list[int]:
    """Gli id dei nodi che poggiano a terra, dedotti dalla struttura e non da una soglia.

    È la regola di `meshrec.core.opensees._al_piede`, riscritta sui nodi e sulle aste di
    NOVA (là vuole gli elementi di MeshRec). Nessuna tolleranza sulla quota, e la ragione è
    il difetto che quella regola ha sostituito: sul telaio sintetico la trave di fondazione
    ha l'asse fuori piano di mezzo grado e i suoi nodi si spandono di quindici millimetri in
    quota, così una tolleranza «entro un epsilon dalla quota minima» ne incastrava uno solo.

    1. La membratura coricata che tocca il punto più basso ci poggia per tutta la propria
       lunghezza: si parte dal nodo di quota minima e si cammina sulle sole aste coricate.
       **Per componente connessa**, non sul modello intero: un modello con due sottostrutture
       non collegate (due torri, ciascuna con la propria fondazione) ha un minimo di quota a
       testa, non uno solo — un solo minimo globale perderebbe la fondazione della torre più alta.
    2. Ogni nodo da cui la struttura sale soltanto, e sale in piedi: sotto non prosegue
       niente, quindi o poggia o penzola; che le aste siano in piedi esclude la punta di
       uno sbalzo. Questa regola guarda solo i vicini del nodo, quindi vale già per componente.

    Sta qui e non in `nova.importa` perché il Check Model (C1, `nova.check`) la usa e gira
    **prima** del deck: `nova.importa` importa `nova.deck` (per la terna e le dimensioni di
    sezione), e farla dipendere da `check` la tirerebbe dentro quella catena.
    """
    nodi = {n.id: n for n in m.nodi}
    vicini = grafo(m) if vicini is None else vicini
    if not vicini:
        return []

    a_terra: set[int] = set()
    for gruppo in _componenti(vicini):
        # `min` sui soli nodi che un'asta tocca, e a parità di quota l'id più piccolo: un nodo
        # isolato più in basso non è un piede, è un nodo da cui non si cammina da nessuna parte.
        partenza = min(gruppo, key=lambda k: (nodi[k].z, k))
        raggiunti, da_visitare = {partenza}, [partenza]
        while da_visitare:
            for altro, coricata in vicini.get(da_visitare.pop(), ()):
                if coricata and altro not in raggiunti:
                    raggiunti.add(altro)
                    da_visitare.append(altro)
        a_terra |= raggiunti
    a_terra.update(
        k for k, intorno in vicini.items()
        if all(not coricata and nodi[altro].z > nodi[k].z for altro, coricata in intorno)
    )
    return sorted(a_terra)


def numero_componenti(m: Modello, vicini: dict | None = None) -> int:
    """Quante sottostrutture sconnesse vede `piedi`: un telaio sano ne ha una sola."""
    return len(_componenti(grafo(m) if vicini is None else vicini))


NOTA_TUTTI_AL_PIEDE = "tutti i nodi sarebbero al piede: nessuna proposta"


def proposte_vincoli(m: Modello, piede: list[int] | None = None) -> list[dict]:
    """Un incastro per ogni nodo al piede, da proporre e non da applicare: dove il pezzo
    poggia è una lettura, non una misura del rilievo.

    `piede`, se il chiamante l'ha già calcolato (`check.py` lo fa per il proprio verdetto),
    evita di camminare due volte lo stesso grafo; se assente lo calcola qui.

    Nessuna proposta quando **ogni** nodo cadrebbe al piede — un rilievo della sola trave di
    fondazione: incastrare tutto è il modello che `check_model` rifiuta («non resta nulla da
    calcolare»), e proporlo sarebbe proporre una risposta sbagliata invece di nessuna.
    """
    a_terra = piedi(m) if piede is None else piede
    if not a_terra or len(a_terra) == len(m.nodi):
        return []
    incastro = {"ux": True, "uy": True, "uz": True, "rx": True, "ry": True, "rz": True}
    return [{"nodo": k, "vincolo": dict(incastro)} for k in a_terra]
