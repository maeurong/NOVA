import io
import json
import shutil
from pathlib import Path

import pytest

FIXTURE = Path(__file__).parent / "fixture"


def leggi_fixture(nome: str) -> dict:
    return json.loads((FIXTURE / nome).read_text(encoding="utf-8"))


@pytest.fixture
def chiedi():
    """Una richiesta sul protocollo, in memoria: rende le righe di risposta (eventi + finale)."""
    from nova import sidecar

    def _chiedi(*richieste: dict) -> list[list[dict]]:
        ingresso = io.StringIO("".join(json.dumps(r) + "\n" for r in richieste))
        uscita = io.StringIO()
        sidecar.servi(ingresso, uscita)
        righe = [json.loads(r) for r in uscita.getvalue().splitlines() if r.strip()]
        per_id: dict = {}
        for riga in righe:
            per_id.setdefault(riga.get("id"), []).append(riga)
        return [per_id.get(r.get("id"), []) for r in richieste]

    return _chiedi


@pytest.fixture(scope="session")
def binario_ccx() -> str:
    percorso = shutil.which("ccx")
    if percorso is None:
        pytest.skip("ccx non è nel PATH: la corsa vera non si prova qui")
    return percorso


@pytest.fixture(scope="session")
def binario_opensees() -> str:
    percorso = shutil.which("OpenSees")
    if percorso is None:
        pytest.skip("OpenSees non è nel PATH: la corsa vera non si prova qui")
    return percorso
