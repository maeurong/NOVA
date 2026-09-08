"""Aggiunge a ogni riferimento [V] della ricerca 11 il link alla pagina catturata.

Ricerca 11 (ticket #34). Usa-e-getta: si esegue una volta dopo `34-cattura-sorgenti.py`.
Idempotente — se il link c'è già, la riga non combacia più e non viene toccata.

Ingressi degeneri: file di ricerca assente → FileNotFoundError; nessun riferimento da
aggiornare → stampa 0 e non riscrive nulla di diverso.
"""
from pathlib import Path

RICERCA = Path(__file__).resolve().parents[1] / "11-modi-sulla-tangente-opensees.md"
COMMIT = "6e55293"

MAPPA = {
    "SRC/analysis/analysis/StaticAnalysis.cpp": "staticanalysis",
    "SRC/analysis/fe_ele/FE_Element.cpp": "fe_element",
    "SRC/analysis/integrator/EigenIntegrator.cpp": "eigenintegrator",
    "SRC/analysis/integrator/DisplacementControl.cpp": "displacementcontrol",
    "SRC/tcl/commands.cpp": "commands",
    "SRC/system_of_eqn/eigenSOE/FullGenEigenSolver.cpp": "fullgeneigensolver",
    "SRC/system_of_eqn/eigenSOE/ArpackSolver.cpp": "arpacksolver",
    "SRC/domain/domain/DomainModalProperties.cpp": "domainmodalproperties",
    "SRC/domain/domain/Domain.cpp": "domain",
    "SRC/material/uniaxial/Concrete02.cpp": "concrete02",
}

if __name__ == "__main__":
    testo = RICERCA.read_text()
    fatti = 0
    for percorso, nome in MAPPA.items():
        slug = f"opensees-{nome}-{COMMIT}.md"
        vecchio = f"/{percorso} · [V]\n"
        nuovo = f"/{percorso} · [V] · catturata in [`fonti/{slug}`](fonti/{slug})\n"
        if vecchio in testo:
            testo = testo.replace(vecchio, nuovo, 1)
            fatti += 1
    RICERCA.write_text(testo)
    print("riferimenti collegati:", fatti)
