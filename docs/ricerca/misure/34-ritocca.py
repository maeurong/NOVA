"""Ritocchi puntuali alla ricerca 11 dopo la cattura dei sorgenti in `fonti/`.

Ricerca 11 (ticket #34). Usa-e-getta: sostituzioni letterali, ognuna obbligatoria — se
una non combacia il file è cambiato sotto e lo script alza AssertionError invece di
scrivere un risultato parziale.
"""
from pathlib import Path

RICERCA = Path(__file__).resolve().parents[1] / "11-modi-sulla-tangente-opensees.md"

SOSTITUZIONI = [
    ("| `SRC/material/uniaxial/Concrete02.cpp` | idem | letto [V] |",
     "| `SRC/material/uniaxial/Concrete02.cpp` | idem | letto [V] |\n"
     "| i dieci sorgenti qui sopra, verbatim | idem | catturati in `fonti/` con sidecar [V] |"),
    ("Gli script di misura stanno in [`misure/`](misure/) — sei file, usa-e-getta",
     "Gli script di misura stanno in [`misure/`](misure/) — usa-e-getta"),
    ("5. **Copiare sorgente OpenSees in `fonti/`?** Le citazioni al sorgente sono pinnate al "
     "commit `6e55293` — immutabili per costruzione — e non sono state copiate nel repo: "
     "copiarle sarebbe una decisione di licenza, e `docs/ricerca/01-opensees-integrazione.md` "
     "ha già documentato che `COPYRIGHT` e `license.rst` di OpenSees non coincidono. "
     "In `fonti/` stanno solo le pagine **mutabili** (blog e doc ufficiale). Va bene così, "
     "o il criterio va cambiato?",
     "5. **I dieci sorgenti OpenSees copiati in `fonti/` sono un problema di licenza?** "
     "La regola d'indice chiede che ogni pagina citata [V] sia salvata, e sono stati salvati "
     "(≈ 600 kB, di cui 319 kB il solo `commands.cpp`). Ma `docs/ricerca/01-opensees-integrazione.md` "
     "ha già documentato che `COPYRIGHT` e `license.rst` di OpenSees **non coincidono** — uno dice "
     "uso non commerciale/interno, l'altro è BSD-like. Le citazioni sono comunque pinnate al commit "
     "`6e55293`, quindi immutabili anche senza la copia: se la copia dà fastidio, si tolgono i dieci "
     "file e i riferimenti restano verificabili. Decisione dell'autore, non del `researcher`."),
]

if __name__ == "__main__":
    testo = RICERCA.read_text()
    for vecchio, nuovo in SOSTITUZIONI:
        assert vecchio in testo, f"non combacia: {vecchio[:60]}…"
        testo = testo.replace(vecchio, nuovo, 1)
    RICERCA.write_text(testo)
    print("ritocchi applicati:", len(SOSTITUZIONI))
