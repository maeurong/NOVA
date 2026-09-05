"""Genera `trave.inp`: un parallelepipedo a tetraedri con lo schema del deck vero.

Deterministico — stessa uscita byte per byte a ogni giro, e `tests/test_inp.py` lo verifica:
la fixture sta nel repo, il generatore è la sua provenienza, e i due devono coincidere.

Le parole chiave e l'ordine dei passi sono copiati da `lab_telaio_v2/wall_model.inp`
(righe 67272-70360, deck di MeshRec del 02/09/2026): stessa forma, ma 960 tetraedri
invece di 51 892, così `ccx` la risolve in pochi secondi.

    python tests/fixture/solido_piccolo/genera.py
"""
from __future__ import annotations

import hashlib
import itertools
from pathlib import Path

NOME = "trave.inp"
LATI = (200.0, 100.0, 1000.0)   # mm, x per y per z
DIVISIONI = (4, 2, 20)          # celle per lato: 315 nodi, 960 C3D4
DENSITA = 2.5493e-09            # t/mm3, il C25/30 del deck vero
E, NU = 31500.0, 0.2            # MPa
G = 9810.0                      # mm/s2: quello del deck vero, non i 9806,65 di NOVA
SPINTA = 981.0                  # 0,1 g lungo +y
CARICO_TOP = -1200.0            # N in sommità, ripartiti sui nodi di TOP
MODI = 10

VOLUME = LATI[0] * LATI[1] * LATI[2]
MASSA = DENSITA * VOLUME
PESO = MASSA * G


def _nodi() -> dict[tuple[int, int, int], int]:
    """Numerazione dei nodi: x più veloce, z più lenta. Da 1, come vuole ccx."""
    nx, ny, nz = DIVISIONI
    return {(i, j, k): 1 + i + (nx + 1) * (j + (ny + 1) * k)
            for k in range(nz + 1) for j in range(ny + 1) for i in range(nx + 1)}


def _coord(g: tuple[int, int, int]) -> tuple[float, float, float]:
    return tuple(g[a] * LATI[a] / DIVISIONI[a] for a in range(3))


def _volume6(p: list[tuple[float, float, float]]) -> float:
    """Sei volte il volume con segno del tetraedro: il determinante dei tre spigoli."""
    a = [p[1][n] - p[0][n] for n in range(3)]
    b = [p[2][n] - p[0][n] for n in range(3)]
    c = [p[3][n] - p[0][n] for n in range(3)]
    return (a[0] * (b[1] * c[2] - b[2] * c[1])
            - a[1] * (b[0] * c[2] - b[2] * c[0])
            + a[2] * (b[0] * c[1] - b[1] * c[0]))


def _elementi() -> list[tuple[int, int, int, int]]:
    """Ogni cella spezzata nei 6 tetraedri di Kuhn: sempre la stessa diagonale, quindi
    le facce combaciano fra celle vicine. L'ordine dei nodi si raddrizza sul volume con
    segno — un C3D4 rovesciato ccx lo rifiuta («nonpositive jacobian»)."""
    nodi = _nodi()
    nx, ny, nz = DIVISIONI
    assi = [(1, 0, 0), (0, 1, 0), (0, 0, 1)]
    elementi: list[tuple[int, int, int, int]] = []
    for k in range(nz):
        for j in range(ny):
            for i in range(nx):
                base = (i, j, k)
                for perm in itertools.permutations(assi):
                    passi = [base]
                    for a in perm:
                        passi.append(tuple(passi[-1][n] + a[n] for n in range(3)))
                    quattro = [passi[0], passi[1], passi[2], passi[3]]
                    if _volume6([_coord(g) for g in quattro]) < 0:
                        quattro[1], quattro[2] = quattro[2], quattro[1]
                    elementi.append(tuple(nodi[g] for g in quattro))
    return elementi


def _set_di_quota(k: int) -> list[int]:
    nodi = _nodi()
    return sorted(n for g, n in nodi.items() if g[2] == k)


def _righe_set(numeri: list[int]) -> list[str]:
    """Otto per riga, come le scrive MeshRec."""
    return [", ".join(str(n) for n in numeri[p:p + 8]) for p in range(0, len(numeri), 8)]


def _passo_statico(nome: str, corpo: list[str]) -> list[str]:
    return [f"** NOME PASSO: {nome}", "*STEP", "*STATIC", *corpo,
            "*NODE PRINT, NSET=BASE", "RF", "*NODE FILE", "U", "*EL FILE", "S, E", "*END STEP"]


def testo() -> str:
    nodi, elementi = _nodi(), _elementi()
    base, top = _set_di_quota(0), _set_di_quota(DIVISIONI[2])
    quota = CARICO_TOP / len(top)
    peso = ["*DLOAD, OP=NEW", f"ALL_WALL, GRAV, {G}, 0.0, 0.0, -1.0"]
    righe = [
        "*HEADING",
        "fixture solido_piccolo di NOVA, generata da genera.py (mm, N, MPa, t, s)",
        "*NODE",
        *[f"{n}, " + ", ".join(f"{v:.9e}" for v in _coord(g))
          for g, n in sorted(nodi.items(), key=lambda kv: kv[1])],
        "*ELEMENT, TYPE=C3D4, ELSET=ALL_WALL",
        *[f"{t}, " + ", ".join(str(n) for n in e) for t, e in enumerate(elementi, start=1)],
        "*NSET, NSET=BASE", *_righe_set(base),
        "*NSET, NSET=TOP", *_righe_set(top),
        "*SOLID SECTION, ELSET=ALL_WALL, MATERIAL=CALCESTRUZZO_C25_30",
        "*MATERIAL, NAME=CALCESTRUZZO_C25_30",
        "*ELASTIC", f"{E}, {NU}",
        "*DENSITY", f"{DENSITA:.4e}",
        "*BOUNDARY", "BASE, 1, 3",
        *_passo_statico("GRAVITA", peso),
        *_passo_statico("SPINTA_ORIZZONTALE", [*peso, f"ALL_WALL, GRAV, {SPINTA}, 0.0, 1.0, 0.0"]),
        *_passo_statico("CARICO_TOP", [*peso, "*CLOAD, OP=NEW",
                                       *[f"{n}, 3, {quota:.9e}" for n in top]]),
        "** NOME PASSO: MODALE", "*STEP", "*FREQUENCY", str(MODI), "*NODE FILE", "U", "*END STEP",
    ]
    return "\n".join(righe) + "\n"


def scrivi(cartella: Path | None = None) -> Path:
    percorso = Path(cartella or Path(__file__).parent) / NOME
    percorso.write_text(testo(), encoding="ascii")
    return percorso


if __name__ == "__main__":
    p = scrivi()
    print(f"{p}: {len(p.read_bytes())} byte, sha256 {hashlib.sha256(p.read_bytes()).hexdigest()}")
    print(f"volume {VOLUME:.6g} mm3, massa {MASSA:.6g} t, peso {PESO:.6g} N con g = {G:g}")
