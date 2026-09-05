"""Il pacchetto si importa e le copie di MeshRec sono quelle dichiarate."""
import hashlib
import re
from pathlib import Path

RADICE = Path(__file__).resolve().parent.parent


def test_i_moduli_si_importano():
    import nova  # noqa: F401
    from meshrec.core import armatura, config, materiali, opensees, solve, telaio  # noqa: F401


def test_le_impronte_coincidono_con_i_file():
    tabella = (RADICE / "meshrec" / "IMPRONTE.md").read_text(encoding="utf-8")
    righe = re.findall(r"^\| (\w+\.py) \| ([0-9a-f]{64}) \|$", tabella, flags=re.M)
    assert len(righe) == 6
    for nome, atteso in righe:
        vero = hashlib.sha256((RADICE / "meshrec" / "core" / nome).read_bytes()).hexdigest()
        assert vero == atteso, f"{nome}: la copia non è più quella dichiarata"
