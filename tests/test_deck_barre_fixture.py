"""La fixture delle barre è vera per il deck: se `deck._barre` cambia, questo test cade
prima che il disegno dell'ispettore menta (Task 3 della giornata 11b)."""
import json
from pathlib import Path

from nova import modello as _modello
from nova.deck import _barre

FIXTURE = Path(__file__).parent / "fixture" / "barre_300x500.json"


def test_la_fixture_delle_barre_coincide_con_deck_barre():
    d = json.loads(FIXTURE.read_text(encoding="utf-8"))
    s = _modello.Sezione(**d["sezione"])
    attese = sorted((b["y"], b["z"], b["diametro"]) for b in d["barre"])
    vere = sorted((round(b.y, 9), round(b.z, 9), b.diametro) for b in _barre(s, False))
    assert vere == attese
