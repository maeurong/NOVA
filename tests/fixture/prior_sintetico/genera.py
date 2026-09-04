"""Rigenera `12_wall.json` dal telaio sintetico di MeshRec.

Lancio (venv della tesi, nulla da installare):

    /Users/mario/GitHub/Tesi/meshrec/.venv/bin/python genera.py

Il telaio e' `TELAIO` di `meshrec/tests/test_wall.py`, campionato con
`synth.sample_frame_surface` a rumore zero e seed fisso: stesso commit di
Tesi, stesso JSON. Scrive accanto a se'.
"""

import json
import sys
from pathlib import Path

TESI = Path("/Users/mario/GitHub/Tesi/meshrec")
QUI = Path(__file__).resolve().parent


def scrivi(esito: dict, percorso: Path) -> None:
    if not esito["membrature"]:
        sys.exit(
            "zero membrature: fixture non scritta. scartate: "
            + json.dumps(esito.get("scartate", []), ensure_ascii=False)
        )
    # serializza prima di aprire il file: un NaN fa saltare qui, non a meta' scrittura
    testo = json.dumps(
        esito, indent=1, sort_keys=True, allow_nan=False, default=float, ensure_ascii=False
    )
    Path(percorso).write_text(testo + "\n", encoding="utf-8")


def main() -> None:
    sys.path[:0] = [str(TESI / "src"), str(TESI / "tests")]
    from test_wall import SPAZIATURA, TELAIO
    from meshrec.core import synth, wall
    from meshrec.core.config import SegmentConfig, WallConfig

    punti = synth.sample_frame_surface(TELAIO, SPAZIATURA, noise=0.0, seed=0)
    esito = wall.prior(punti, SegmentConfig(), WallConfig(), SPAZIATURA)
    scrivi(esito, QUI / "12_wall.json")
    print(
        f"membrature {len(esito['membrature'])} "
        f"giunzioni {len(esito['giunzioni'])} "
        f"scartate {len(esito['scartate'])}"
    )


if __name__ == "__main__":
    main()
