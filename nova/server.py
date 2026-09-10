"""Il ponte sottile: HTTP davanti, righe JSON dietro. Nessuna logica di dominio qui.

`solutore` e `cartella` non arrivano mai dal corpo HTTP (ruling di sicurezza, Task 6):
i modelli dei corpi hanno `extra="forbid"` e non li dichiarano nemmeno; il solutore, se
configurato, lo porta il wrapper del sidecar (dal PATH o da `--solutore` di `python -m
nova`), la cartella la genera sempre il server come `cartella_corse / run_id`.
"""
from __future__ import annotations

import json
import queue
import re
import secrets
import subprocess
import sys
import threading
from pathlib import Path
from typing import Annotated, Callable

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, Field

import nova
from nova import catalogo as _catalogo
from nova import ccx as _ccx
from nova import corsa as _corsa
from nova import legami as _legami
from nova import modello as _modello
from nova import sidecar as _sidecar
from meshrec.core import materiali as _materiali

STATICI = Path(__file__).resolve().parent.parent / "static"
_RUN_ID_RE = re.compile(r"^[0-9a-f]{12}$")

# `--solutore` di `python -m nova` è il binario di OpenSees: dichiararlo a `ccx` gli farebbe
# lanciare quello (`solve._trova` prende il percorso dichiarato e **non** ripiega sul PATH).
# CalculiX si cerca nel PATH, che è come `DOVE_PRENDERLO` dice di installarlo.
_COMANDI_SENZA_SOLUTORE = ("ccx",)

# I due nomi che una cartella di corsa può portare: il telaio e il solido. `/api/risultati`
# li prova tutti e due, o il `run_id` che `/api/ccx` ha appena reso non si rileggerebbe.
_NOMI_RISULTATI = (_corsa.NOME_RISULTATI, _ccx.NOME_RISULTATI)


class SidecarInProcesso:
    """Il sidecar in memoria: comodo per i test, nessun sottoprocesso."""

    def __init__(self, solutore: str | None = None):
        self.solutore = solutore

    def chiedi(self, req: dict, su_fase: Callable[[dict], None] | None = None) -> list[dict]:
        if self.solutore and req.get("comando") not in _COMANDI_SENZA_SOLUTORE:
            req = {**req, "solutore": self.solutore}
        righe: list[dict] = []

        def emetti(ev: dict) -> None:
            if su_fase is not None:
                su_fase(ev)
            righe.append(ev)

        righe.append(_sidecar.rispondi(req, emetti))
        return righe


SOFFITTO_S = 660.0   # `_corsa._TIMEOUT_S` (600) più un minuto: una riga di fase arriva a ogni gradino


class SidecarProcesso:
    """`python -m nova.sidecar` a vita lunga; una richiesta alla volta (lock non bloccante: la
    seconda è un 409 subito). Le righe le legge un thread e le mette in coda: `chiedi` le
    prende con un soffitto, così un sidecar muto è un errore di fase `sidecar` e non una
    richiesta HTTP appesa per sempre (#20)."""

    def __init__(self, solutore: str | None = None, avvia: Callable[[], subprocess.Popen] | None = None,
                 soffitto_s: float = SOFFITTO_S):
        # `cwd` esplicito: il sottoprocesso deve trovare `nova.sidecar` a partire dalla
        # radice del pacchetto, non dalla cwd di chi ha lanciato `python -m nova`.
        avvia = avvia or (lambda: subprocess.Popen(
            [sys.executable, "-m", "nova.sidecar"], cwd=str(STATICI.parent),
            stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True, bufsize=1))
        self.p = avvia()
        self.solutore = solutore
        self.soffitto_s = soffitto_s
        self.n = 0
        self._lock = threading.Lock()
        self._righe: queue.Queue[str | None] = queue.Queue()
        threading.Thread(target=self._leggi, daemon=True).start()

    def _leggi(self) -> None:
        # `for riga in stdout` legge riga per riga con `bufsize=1`; a EOF esce, e `None` in
        # coda è il segnale che lo stdout è chiuso.
        try:
            for riga in self.p.stdout:
                self._righe.put(riga)
        finally:
            self._righe.put(None)

    def chiedi(self, req: dict, su_fase: Callable[[dict], None] | None = None) -> list[dict]:
        # senza `blocking=False` la seconda richiesta resta appesa qui finché la prima non
        # finisce: una corsa di ccx può tenere il sidecar fino al suo timeout di mezz'ora
        if not self._lock.acquire(blocking=False):
            raise HTTPException(409, detail={"esito": "errore", "fase": "sidecar",
                                             "motivo": "il sidecar è occupato da un'altra corsa"})
        try:
            self.n += 1
            rid = self.n
            corpo = {**req, "id": rid}
            if self.solutore and req.get("comando") not in _COMANDI_SENZA_SOLUTORE:
                corpo["solutore"] = self.solutore
            try:
                self.p.stdin.write(json.dumps(corpo) + "\n")
                self.p.stdin.flush()
                righe: list[dict] = []
                while True:
                    try:
                        riga = self._righe.get(timeout=self.soffitto_s)
                    except queue.Empty:
                        return [{"esito": "errore", "fase": "sidecar",
                                 "motivo": f"nessuna risposta dal sidecar entro {self.soffitto_s:g} s"}]
                    if riga is None or riga == "":
                        righe.append({"esito": "errore", "fase": "sidecar",
                                      "motivo": "il sidecar ha chiuso lo stdout"})
                        return righe
                    grezza = json.loads(riga)
                    if grezza.get("id") != rid:
                        # riga in ritardo di una richiesta precedente andata in soffitto (R7):
                        # il filtro sull'`id` la scarta, e resta lì solo se un secondo `chiedi`
                        # arriva prima che il sidecar la scriva — riavvio del sidecar è debito
                        # dichiarato, non coperto qui
                        continue
                    # `id` è solo correlazione del protocollo: non esce mai nel corpo HTTP.
                    d = {k: v for k, v in grezza.items() if k != "id"}
                    if "evento" in d and su_fase is not None:
                        su_fase(d)
                    righe.append(d)
                    if "evento" not in d:
                        return righe
            except Exception as e:  # pipe chiusa, riga non JSON: un errore di dominio, non un 500 muto
                return [{"esito": "errore", "fase": "sidecar", "motivo": f"{type(e).__name__}: {e}"}]
        finally:
            self._lock.release()


def _finale(righe: list[dict]) -> dict:
    return righe[-1]


class _CorpoBase(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ApriReq(_CorpoBase):
    percorso: str


class SalvaReq(_CorpoBase):
    percorso: str
    modello: dict


class LegameReq(_CorpoBase):
    materiale: dict
    veste: str = "media"


class ImportaReq(_CorpoBase):
    percorso: str


class CheckReq(_CorpoBase):
    modello: dict | None = None


class CorsaReq(_CorpoBase):
    modello: dict | None = None
    # stessa forma del modello dati: un caso malformato si ferma sul bordo HTTP, non nel deck
    casi: list[Annotated[str, Field(pattern=_modello.FORMA_CASO)]] | None = None


class CcxReq(_CorpoBase):
    inp: str


class ConfrontoReq(_CorpoBase):
    # F5: `Path("").resolve()` è la cwd, non un errore — senza `min_length` una stringa
    # vuota arriverebbe fino al sidecar e uscirebbe 400 con «Is a directory» sulla radice
    telaio: str = Field(min_length=1)
    solido: str | None = Field(default=None, min_length=1)
    abaqus: str | None = Field(default=None, min_length=1)
    mappa_casi: dict = Field(default_factory=dict)


def create_app(sidecar, cartella_corse: Path, statici: Path = STATICI, porta: int | None = None) -> FastAPI:
    app = FastAPI(title="NOVA")
    cartella_corse = Path(cartella_corse)
    cartella_corse.mkdir(parents=True, exist_ok=True)

    # DNS rebinding: un sito che risolve un nome verso 127.0.0.1 potrebbe far leggere/scrivere
    # modelli al browser di chi ci naviga sopra. Solo l'`Host` locale (con la porta vera, se
    # nota) è ammesso; l'`Origin`, quando c'è, deve essere lo stesso. Il bind resta 127.0.0.1.
    host_ammessi = {"127.0.0.1", "localhost"} | ({f"127.0.0.1:{porta}", f"localhost:{porta}"} if porta else set())
    origin_ammessi = {f"http://127.0.0.1:{porta}", f"http://localhost:{porta}"} if porta else set()

    @app.middleware("http")
    async def _blocca_host_estraneo(request: Request, call_next):
        host = request.headers.get("host", "")
        if host not in host_ammessi:
            return JSONResponse(status_code=403, content={"motivo": f"host non ammesso: {host}"})
        origin = request.headers.get("origin")
        if origin is not None and origin not in (origin_ammessi or {f"http://{host}"}):
            return JSONResponse(status_code=403, content={"motivo": f"origin non ammesso: {origin}"})
        return await call_next(request)

    def _o_400(fin: dict) -> dict:
        # `deck` come `modello`/`importa`/`confronto`: è un errore di chi ha scritto il
        # deck, non del server. `solutore` e `assente` restano 200: là la richiesta era
        # buona, è la macchina a non avere il solutore.
        if fin.get("esito") == "errore" and fin.get("fase") in ("modello", "importa", "confronto", "deck"):
            raise HTTPException(400, detail=fin)
        return fin

    @app.get("/api/salute")
    def salute():
        return {"nova": nova.__version__, "solutore": _finale(sidecar.chiedi({"comando": "verifica"}))}

    @app.post("/api/check")
    def check(corpo: CheckReq):
        return _o_400(_finale(sidecar.chiedi({"comando": "check", "modello": corpo.modello})))

    @app.post("/api/importa")
    def importa(corpo: ImportaReq):
        # Il relativo si risolve **qui**: il sidecar può girare in un altro processo, con la
        # cwd sulla radice del pacchetto, e là «12_wall.json» sarebbe un altro file.
        percorso = str(Path(corpo.percorso).resolve())
        return _o_400(_finale(sidecar.chiedi({"comando": "importa", "percorso": percorso})))

    @app.post("/api/corsa")
    def corsa(corpo: CorsaReq):
        run_id = secrets.token_hex(6)
        righe = sidecar.chiedi({"comando": "corsa", "modello": corpo.modello, "casi": corpo.casi,
                                "cartella": str(cartella_corse / run_id)})
        fin = _o_400(_finale(righe))
        return {"run_id": run_id, "fasi": [r["nome"] for r in righe if r.get("evento") == "fase"], **fin}

    @app.post("/api/ccx")
    def ccx(corpo: CcxReq):
        """Il deck del solido, dal disco dell'utente locale: `..` è lecito, il file si legge
        e basta, e la copia nella cartella della corsa si chiama sempre `solido.inp`."""
        run_id = secrets.token_hex(6)
        righe = sidecar.chiedi({"comando": "ccx", "inp": str(Path(corpo.inp).resolve()),
                                "cartella": str(cartella_corse / run_id)})
        fin = _o_400(_finale(righe))
        return {"run_id": run_id, "cartella": str(cartella_corse / run_id),
                "fasi": [r["nome"] for r in righe if r.get("evento") == "fase"], **fin}

    @app.post("/api/confronto")
    def confronto(corpo: ConfrontoReq):
        """`telaio`/`solido`/`abaqus` sono percorsi dell'utente locale, letti e basta; la
        cartella d'export è sempre quella che il server genera, come `corsa` e `ccx`.

        I relativi si risolvono **qui**, come in `importa`: il sidecar può girare in un
        altro processo, con la cwd sulla radice del pacchetto, e là «telaio.json» sarebbe
        un altro file."""
        run_id = secrets.token_hex(6)
        righe = sidecar.chiedi({"comando": "confronto",
                                "telaio": str(Path(corpo.telaio).resolve()),
                                "solido": str(Path(corpo.solido).resolve()) if corpo.solido else None,
                                "abaqus": str(Path(corpo.abaqus).resolve()) if corpo.abaqus else None,
                                "mappa_casi": corpo.mappa_casi,
                                "cartella": str(cartella_corse / run_id)})
        fin = _o_400(_finale(righe))
        return {"run_id": run_id, "cartella": str(cartella_corse / run_id), **fin}

    @app.get("/api/risultati/{run_id}")
    def risultati(run_id: str):
        rifiuta = HTTPException(404, detail={"motivo": f"nessuna corsa {run_id}"})
        if not _RUN_ID_RE.fullmatch(run_id):
            raise rifiuta
        radice = cartella_corse.resolve()
        for nome in _NOMI_RISULTATI:
            p = (cartella_corse / run_id / nome).resolve()
            if radice not in p.parents or not p.is_file():
                continue
            try:  # una corsa interrotta lascia un file troncato: è una corsa che non c'è, non un 500
                return json.loads(p.read_text(encoding="utf-8"))
            except (ValueError, OSError) as e:
                raise HTTPException(404, detail={"motivo": f"risultati illeggibili per la corsa {run_id}: {e}"})
        raise rifiuta

    @app.get("/api/catalogo")
    def catalogo():
        # `VoceMateriale.famiglia` (`meshrec/core/materiali.py:134`) è la riga che divide
        # le due famiglie: campo esplicito, non il proxy `f_ctm is None` dell'acciaio.
        voci = list(_materiali.CATALOGO)
        return {"calcestruzzo": [v.classe for v in voci if v.famiglia == "calcestruzzo"],
                "acciaio": [v.classe for v in voci if v.famiglia == "acciaio"],
                "vesti": list(_legami.VESTI)}

    @app.post("/api/materiale/legame")
    def legame(corpo: LegameReq):
        try:
            mat = _modello.Materiale.model_validate(corpo.materiale)
            # `_catalogo.valori(mat)` gira anche dentro `veste_valori`: `veste_valori` non
            # prende valori già calcolati, e non è di questo giro toccare `legami.py`.
            tabella = _catalogo.valori(mat)
            valori = _legami.veste_valori(mat, corpo.veste)
            curva = (_legami.legame_copriferro(mat, corpo.veste) if mat.tipo == "calcestruzzo"
                     else _legami.acciaio(mat, corpo.veste))
        # Solo `ValueError`. `TypeError` e `KeyError` ci erano finiti quando la coppia
        # tipo/classe incoerente arrivava fin qui; adesso `Materiale` la rifiuta prima, e
        # una classe fuori catalogo la rifiuta `catalogo.valori` con un `ValueError` suo.
        # Prenderle qui non serviva più e portava il gergo di un'eccezione Python nel
        # `motivo` che l'utente legge.
        except ValueError as e:  # pydantic.ValidationError è un ValueError
            raise HTTPException(400, detail={"motivo": str(e)})
        return {"valori": valori, "catalogo": tabella, "legame": curva}

    @app.post("/api/modello/apri")
    def apri(corpo: ApriReq):
        p = Path(corpo.percorso)
        if not p.is_file():
            raise HTTPException(404, detail={"motivo": f"{p} non esiste"})
        try:
            m = _modello.carica(json.loads(p.read_text(encoding="utf-8")))
        except ValueError as e:  # json.JSONDecodeError è già un ValueError
            raise HTTPException(400, detail={"motivo": str(e)})
        return {"modello": m.model_dump(mode="json", exclude_none=True), "impronta": _modello.impronta(m)}

    @app.post("/api/modello/salva")
    def salva(corpo: SalvaReq):
        try:
            m = _modello.carica(corpo.modello)
        except ValueError as e:
            raise HTTPException(400, detail={"motivo": str(e)})
        p = Path(corpo.percorso)
        try:
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text(json.dumps(m.model_dump(mode="json", exclude_none=True), ensure_ascii=False, indent=1),
                         encoding="utf-8")
        except OSError as e:
            raise HTTPException(500, detail={"motivo": str(e)})
        return {"ok": True, "impronta": _modello.impronta(m)}

    @app.exception_handler(HTTPException)
    def _http(_, exc: HTTPException):
        corpo = exc.detail if isinstance(exc.detail, dict) else {"motivo": str(exc.detail)}
        return JSONResponse(status_code=exc.status_code, content=corpo)

    @app.exception_handler(RequestValidationError)
    def _val(_, exc: RequestValidationError):
        motivi = "; ".join(f"{'.'.join(str(p) for p in e['loc'])}: {e['msg']}" for e in exc.errors())
        return JSONResponse(status_code=422, content={"motivo": motivi})

    @app.get("/")
    def radice():
        return FileResponse(statici / "index.html")

    app.mount("/static", StaticFiles(directory=statici), name="static")
    return app
