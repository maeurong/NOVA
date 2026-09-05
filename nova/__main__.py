"""`python -m nova`: server locale e browser.

`--porta`, poi `NOVA_PORTA` (env), poi 8765. `--solutore` è l'unico modo di scegliere
il binario: mai dalla richiesta HTTP (ruling di sicurezza, Task 6)."""
from __future__ import annotations

import argparse
import os
import sys
import threading
import webbrowser
from pathlib import Path

import uvicorn

from nova.server import SidecarProcesso, create_app

PORTA_DEFAULT = 8765


def _argomenti(argv: list[str] | None) -> argparse.Namespace:
    ap = argparse.ArgumentParser(prog="python -m nova")
    ap.add_argument("--porta", type=int, default=None)
    ap.add_argument("--solutore", default=None)
    return ap.parse_args(argv)


def main(argv: list[str] | None = None) -> None:
    args = _argomenti(argv)
    porta = args.porta or int(os.environ.get("NOVA_PORTA", PORTA_DEFAULT))
    sidecar = SidecarProcesso(solutore=args.solutore)
    try:
        # `create_app` sta dentro il `try`: `static/` assente la fa sollevare, e fuori di qui
        # il sottoprocesso del sidecar resterebbe orfano. La cartella delle corse è assoluta,
        # così non si sposta se qualcuno cambia la cwd del processo.
        app = create_app(sidecar, Path.cwd() / "corse", porta=porta)
        threading.Timer(0.8, lambda: webbrowser.open(f"http://127.0.0.1:{porta}/")).start()
        uvicorn.run(app, host="127.0.0.1", port=porta, log_level="warning")
    except (OSError, RuntimeError) as e:
        sys.exit(f"impossibile avviare NOVA sulla porta {porta}: {e}")
    finally:
        sidecar.p.terminate()  # niente sottoprocesso orfano, né sull'errore né all'uscita normale


if __name__ == "__main__":
    main()
