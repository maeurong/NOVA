"""I moduli puri dell'interfaccia, provati con `node --test` da dentro pytest.

Cucitura 3 della spec («Testing Decisions»): le funzioni vere dei moduli JS, non il DOM.
Il DOM si guarda in browser, non si finge qui. Prior art: `tests/test_app_js.py` di MeshRec.
"""
import shutil
import subprocess
from pathlib import Path

import pytest

RADICE = Path(__file__).resolve().parent.parent

# Il modello glob, non la cartella: misurato il 06/09/2026 su node v26.7.0, `node --test
# static/test` prova a *importare* quel percorso come modulo e muore con MODULE_NOT_FOUND.
# Il glob lo espande node, non la shell: `subprocess.run` senza `shell=True` glielo passa
# alla lettera, ed è quel che serve.
MODELLO_TEST_JS = "static/test/*.test.js"


def test_moduli_puri_dell_interfaccia():
    node = shutil.which("node")
    if node is None:
        pytest.skip("node non è installato: i moduli puri dell'interfaccia non si provano qui")
    esito = subprocess.run([node, "--test", MODELLO_TEST_JS], capture_output=True, text=True, cwd=RADICE)
    assert esito.returncode == 0, esito.stdout + esito.stderr
