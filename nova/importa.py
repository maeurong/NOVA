"""Dal prior geometrico di MeshRec (`12_wall.json`) al modello NOVA (spec: «Importatore dal prior»).

Tre cose che questo modulo fa e nessun'altra parte può fare al posto suo.

**Gira le coordinate.** Il prior sta nelle coordinate della nuvola, dove «alto» è dove
capitava lo scanner. NOVA vuole `z` in su e `y` fuori piano, perché è così che `deck.py`
orienta le sezioni e deduce i piedi. La rotazione è quella che il prior stesso ha misurato
(`terna`), letta però sui nodi: le righe della terna arrivano ordinate per varianza, non
per ruolo.

**Non inventa nulla che il rilievo non abbia misurato.** Nessuna armatura, nessun vincolo,
nessuna classe di materiale: le due classi di default si dichiarano assunte nella loro
`origine`, i vincoli escono come *proposte* accanto al modello e non dentro, e `mancano`
elenca per nome ciò che l'utente deve ancora decidere. Un modello che arrivasse al
solutore con barre dedotte a caso sarebbe peggio di un modello che dice di non averne.

**Riporta le regioni scartate.** Un prior che non ha trovato nessuna membratura — il caso
vero di `lab_telaio_v2` — non è un errore: è un rilievo che ha bocciato tutto, e la sola
risposta utile è il modello vuoto più il perché di ogni bocciatura, una riga per controllo.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field

import numpy as np

from meshrec.core import materiali as _materiali
from meshrec.core import telaio as _telaio
from meshrec.core.config import Material, MaterialeDichiarato, RegioneConfig, SezioneConfig
from nova import deck as _deck
from nova.modello import UNITA, Asta, Materiale, Modello, Nodo, Origine, Sezione

CLASSE_CALCESTRUZZO = "C25/30"
CLASSE_ACCIAIO = "B450C"
NOTA_CLASSE = "assunta: il rilievo non dice la classe"
MANCANO = ["armature", "classe", "vincoli"]

# Le chiavi del prior senza le quali non si comincia. `giunzioni` non è qui: il suo rifiuto
# lo scrive `telaio.costruisci`, e ripeterlo darebbe due frasi diverse per lo stesso difetto.
_CHIAVI = ("terna", "membrature", "scartate")


@dataclass
class Importato:
    """Il modello tradotto e tutto ciò che gli sta accanto senza entrarci dentro."""

    modello: Modello
    scartate: list[dict] = field(default_factory=list)
    giunzioni: list[dict] = field(default_factory=list)
    proposte_vincoli: list[dict] = field(default_factory=list)
    mancano: list[str] = field(default_factory=list)
    resoconto: dict = field(default_factory=dict)


def _terna_del_prior(prior: dict) -> np.ndarray:
    terna = np.asarray(prior["terna"], dtype=np.float64)
    if terna.shape != (3, 3):
        raise ValueError(f"il prior porta una `terna` {terna.shape}, non 3×3: "
                         "senza le tre direzioni principali non si sa come sta in piedi il pezzo")
    return terna


def matrice_terna(prior: dict, punti) -> np.ndarray:
    """Righe = `(x, y, z)` del telaio, nelle coordinate della nuvola.

    La terna del prior porta le direzioni principali del pezzo, ma non dice quale sia quale:
    l'SVD le ordina per varianza, e su un telaio alto e stretto la prima riga è la verticale
    (sul sintetico ≈ (0,013, 0, 0,9999)). Il ruolo si legge dunque sui punti, non sull'ordine:
    la direzione con l'estensione minima è il fuori piano (`y`), fra le altre due la più
    vicina alla `z` della nuvola è la verticale (il rilievo è fatto col pezzo in piedi, e il
    verso si prende quello che punta in su), la terza è `x` col verso che rende la terna
    destrorsa.
    """
    terna = _terna_del_prior(prior)
    estensioni = np.ptp(np.asarray(punti, dtype=np.float64) @ terna.T, axis=0)
    fuori_piano = int(np.argmin(estensioni))
    altre = [i for i in range(3) if i != fuori_piano]
    verticale = max(altre, key=lambda i: abs(terna[i, 2]))
    ey = terna[fuori_piano]
    ez = terna[verticale] if terna[verticale, 2] >= 0.0 else -terna[verticale]
    return np.array([np.cross(ey, ez), ey, ez])


def ruota(prior: dict, punti) -> np.ndarray:
    """I punti nella terna del telaio, con `x` e `z` al minimo e il fuori piano dov'era.

    `y` non si trasla: le quote fuori piano sono il fuori piombo che il rilievo ha misurato,
    e portarle a zero butterebbe via proprio ciò che distingue un rilievo da un disegno.
    """
    girati = np.asarray(punti, dtype=np.float64) @ matrice_terna(prior, punti).T
    girati[:, 0] -= girati[:, 0].min()
    girati[:, 2] -= girati[:, 2].min()
    return girati


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


def proposte_vincoli(m: Modello) -> list[dict]:
    """Un incastro per ogni nodo al piede, da proporre e non da applicare: dove il pezzo
    poggia è una lettura, non una misura del rilievo."""
    incastro = {"ux": True, "uy": True, "uz": True, "rx": True, "ry": True, "rz": True}
    return [{"nodo": k, "vincolo": dict(incastro)} for k in piedi(m)]


def _scartate(prior: dict) -> list[dict]:
    """Una riga per ogni controllo fallito, non una per regione: la regione bocciata da due
    controlli ha due ragioni, e riassumerle in una perderebbe quella che l'utente può correggere."""
    righe = []
    for voce in prior["scartate"]:
        for controllo in voce.get("controlli_falliti", []):
            esito = voce.get("esiti", {}).get(controllo, {})
            righe.append({"regione": voce.get("regione"), "punti": voce.get("punti"),
                          "controllo": controllo, "valore": esito.get("valore"),
                          "soglia": esito.get("soglia"), "unita": esito.get("unita"),
                          "spiegazione": esito.get("spiegazione")})
    return righe


def _dichiarato(classe: str) -> MaterialeDichiarato:
    """La voce di catalogo nella forma che `telaio.costruisci` vuole. `Material.name` non
    ammette la barra di «C25/30»: il nome è un `*ELSET` di Abaqus, non la classe."""
    voce = _materiali.trova(classe)
    return MaterialeDichiarato(
        material=Material(name=classe.replace("/", "_"), young=voce.young,
                          poisson=voce.poisson, density=voce.density),
        f_k=voce.f_k, provenienza="catalogo", classe=classe, norma=voce.fonte)


def _regioni(quante: int) -> dict[str, RegioneConfig]:
    sezione = SezioneConfig(calcestruzzo_confinato=_dichiarato(CLASSE_CALCESTRUZZO),
                            calcestruzzo_copriferro=_dichiarato(CLASSE_CALCESTRUZZO),
                            acciaio=_dichiarato(CLASSE_ACCIAIO), armatura=None)
    return {f"membratura_{k}": RegioneConfig(membratura=k, sezione=sezione) for k in range(quante)}


def _senza_giunzioni_orfane(prior: dict) -> tuple[dict, int]:
    """Le giunzioni che nominano una membratura scartata si tolgono prima di `costruisci`.

    Gli indici delle giunzioni contano le membrature *accettate*: in un prior a cui ne sono
    state tolte due (o in una fixture costruita così) restano indici di una lista che non
    c'è più, e `costruisci` rifiuta l'intero telaio per una giunzione che non lo riguarda.
    Quante ne sono cadute lo dice il resoconto: la correzione si mostra, non si tace.
    """
    if "giunzioni" not in prior:  # il rifiuto è di `costruisci`, che lo spiega meglio
        return prior, 0
    quante = len(prior["membrature"])
    tenute = [g for g in prior["giunzioni"]
              if 0 <= int(g["cede"]) < quante and 0 <= int(g["resta"]) < quante]
    return {**prior, "giunzioni": tenute}, len(prior["giunzioni"]) - len(tenute)


def _materiali_di_default() -> list[Materiale]:
    origine = Origine(sorgente="rilievo", nota=NOTA_CLASSE)
    return [Materiale(id=1, nome=f"calcestruzzo {CLASSE_CALCESTRUZZO}", tipo="calcestruzzo",
                      classe=CLASSE_CALCESTRUZZO, origine=origine),
            Materiale(id=2, nome=f"acciaio {CLASSE_ACCIAIO}", tipo="acciaio",
                      classe=CLASSE_ACCIAIO, origine=origine)]


def _rotazione_deg(asse: np.ndarray, e2: np.ndarray) -> float:
    """L'angolo, attorno all'asse i→j, fra la `e2` che il deck darebbe da sé e quella misurata.

    È la sola grandezza che porta l'orientamento della sezione fino al `.tcl`: `deck._terna`
    ricostruisce la coppia `(e1, e2)` da asse e rotazione, e con questo angolo la ricostruisce
    uguale a quella dell'elemento.
    """
    _, e2_default = _deck._terna(asse, 0.0)
    seno = float(np.cross(e2_default, e2) @ asse)
    return round(math.degrees(math.atan2(seno, float(e2_default @ e2))), 6)


def _base_e_altezza(sezione: tuple[float, float], verticale: bool) -> tuple[float, float]:
    """`(b, h)` dalle due estensioni misurate `(lungo e1, lungo e2)`.

    Lo scambio sulle aste in piedi non è un capriccio: `deck._dimensioni_lungo` legge `h`
    lungo `e1` e `b` lungo `e2` quando l'asta è verticale, e senza scambiarle qui la `patch
    rect` del `.tcl` uscirebbe ruotata di novanta gradi rispetto alla sezione rilevata.
    """
    lungo_e1, lungo_e2 = sezione
    return (lungo_e2, lungo_e1) if verticale else (lungo_e1, lungo_e2)


def importa(prior: dict, riferimento: str | None = None) -> Importato:
    """Il prior di MeshRec come modello NOVA, con le scartate, le giunzioni e i vincoli proposti."""
    if not isinstance(prior, dict):
        raise ValueError("il prior deve essere un oggetto JSON")
    for chiave in _CHIAVI:
        if chiave not in prior:
            raise ValueError(f"il prior non porta la chiave `{chiave}`: non è un "
                             "`12_wall.json` di MeshRec")
    _terna_del_prior(prior)
    scartate = _scartate(prior)
    membrature = prior["membrature"]
    resoconto = {"membrature": len(membrature), "aste": 0, "nodi": 0,
                 "scartate": len(prior["scartate"]), "giunzioni_scartate": 0}
    if not membrature:
        # Non è un errore: è un rilievo che ha bocciato ogni regione. `costruisci` solleverebbe.
        return Importato(modello=Modello(schema_version=1, unita=UNITA), scartate=scartate,
                         resoconto=resoconto)

    utile, resoconto["giunzioni_scartate"] = _senza_giunzioni_orfane(prior)
    telaio = _telaio.costruisci(utile, _regioni(len(membrature)))

    rotazione = matrice_terna(prior, telaio.nodi)
    posizioni = ruota(prior, telaio.nodi)
    origine_nodo = Origine(sorgente="rilievo", riferimento=riferimento)
    nodi = [Nodo(id=k + 1, x=float(p[0]), y=float(p[1]), z=float(p[2]), origine=origine_nodo)
            for k, p in enumerate(posizioni)]

    aste: list[Asta] = []
    sezioni: list[Sezione] = []
    for numero, elemento in enumerate(telaio.elementi, start=1):
        voce = membrature[elemento.membratura]
        asse = posizioni[elemento.nodo_j] - posizioni[elemento.nodo_i]
        asse = asse / float(np.linalg.norm(asse))
        verticale = abs(float(asse[2])) > _deck._COSENO_VERTICALE
        b, h = _base_e_altezza(elemento.sezione, verticale)
        dispersione = voce.get("sezione_dispersione") or (0.0, 0.0)
        sezioni.append(Sezione(
            id=numero, nome=f"rilievo m{elemento.membratura} s{elemento.stazione} {b:.0f}×{h:.0f}",
            b=b, h=h, calcestruzzo=1, acciaio=2, copriferro=0.0, file=[], staffe=None,
            origine=Origine(sorgente="rilievo", riferimento=riferimento,
                            nota=f"dispersione {float(dispersione[0]):.2f}×{float(dispersione[1]):.2f} mm")))
        aste.append(Asta(
            id=numero, nome=f"membratura {elemento.membratura} fetta {elemento.stazione}",
            nodo_i=elemento.nodo_i + 1, nodo_j=elemento.nodo_j + 1, sezione=numero,
            rotazione_deg=_rotazione_deg(asse, rotazione @ np.asarray(elemento.e2)),
            suddivisioni=1,
            origine=Origine(sorgente="rilievo", riferimento=riferimento,
                            nota=f"riempimento {elemento.riempimento_sezione:.2f}")))

    m = Modello(schema_version=1, unita=UNITA, nodi=nodi, aste=aste, sezioni=sezioni,
                materiali=_materiali_di_default(),
                contatori={"nodo": len(nodi), "asta": len(aste), "sezione": len(sezioni),
                           "materiale": 2})
    giunzioni = [{"nodo": int(g["nodo_telaio"]) + 1, "scostamento_nodo": float(g["scostamento_nodo"]),
                  "distanza_proiezione": float(g["distanza_proiezione"]),
                  "cede": int(g["cede"]), "resta": int(g["resta"])} for g in telaio.giunzioni]
    resoconto.update(aste=len(aste), nodi=len(nodi))
    return Importato(modello=m, scartate=scartate, giunzioni=giunzioni,
                     proposte_vincoli=proposte_vincoli(m), mancano=list(MANCANO),
                     resoconto=resoconto)
