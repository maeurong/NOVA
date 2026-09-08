"""Cattura in `docs/ricerca/fonti/` i sorgenti OpenSees citati [V], con il sidecar.

Ricerca 11 (ticket #34). Scarica ogni file dal commit `6e55293…` — la build del binario
locale — e lo salva verbatim dentro un blocco di codice Markdown, con accanto il sidecar
a schema chiuso {derived_from{path, sha256, bytes}, tool, tool_version, extracted}.

    python docs/ricerca/misure/34-cattura-sorgenti.py

Ingressi degeneri: URL che non risponde 200 → alza RuntimeError con l'URL, non scrive un
file vuoto; cartella `fonti/` assente → viene creata.
"""
import hashlib
import json
import urllib.request
from datetime import date
from pathlib import Path

COMMIT = "6e55293513192aa05c7e1205e66a5a1a1ed088c4"
BASE = f"https://raw.githubusercontent.com/OpenSees/OpenSees/{COMMIT}/"
DEST = Path(__file__).resolve().parents[1] / "fonti"

FILE = [
    "SRC/analysis/analysis/StaticAnalysis.cpp",
    "SRC/analysis/integrator/EigenIntegrator.cpp",
    "SRC/analysis/integrator/DisplacementControl.cpp",
    "SRC/analysis/fe_ele/FE_Element.cpp",
    "SRC/tcl/commands.cpp",
    "SRC/system_of_eqn/eigenSOE/FullGenEigenSolver.cpp",
    "SRC/system_of_eqn/eigenSOE/ArpackSolver.cpp",
    "SRC/domain/domain/DomainModalProperties.cpp",
    "SRC/domain/domain/Domain.cpp",
    "SRC/material/uniaxial/Concrete02.cpp",
]


def slug(percorso: str) -> str:
    return "opensees-" + Path(percorso).stem.lower() + "-" + COMMIT[:7] + ".md"


if __name__ == "__main__":
    DEST.mkdir(parents=True, exist_ok=True)
    for percorso in FILE:
        url = BASE + percorso
        with urllib.request.urlopen(url, timeout=90) as r:
            if r.status != 200:
                raise RuntimeError(f"{url}: HTTP {r.status}")
            testo = r.read().decode("utf-8", errors="replace")
        dst = DEST / slug(percorso)
        dst.write_text(f"<!-- {percorso} di OpenSees/OpenSees @ {COMMIT}, salvato verbatim -->\n"
                       f"<!-- {url} -->\n\n```cpp\n{testo}\n```\n")
        dati = dst.read_bytes()
        (DEST / (dst.stem + ".provenance.json")).write_text(json.dumps({
            "derived_from": {"path": url,
                             "sha256": hashlib.sha256(dati).hexdigest(),
                             "bytes": len(dati)},
            "tool": "urllib.request", "tool_version": "python 3.12.13",
            "extracted": date.today().isoformat(),
        }, indent=1, ensure_ascii=False) + "\n")
        print(dst.name, len(dati), "byte")
