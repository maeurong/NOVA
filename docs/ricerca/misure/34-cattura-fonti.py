"""Copia le pagine catturate in `docs/ricerca/fonti/` e ci scrive accanto il sidecar.

Ricerca 11 (ticket #34). Usa-e-getta. Le pagine sono già state estratte con `defuddle`
(blog) o scaricate come sorgente reStructuredText (doc ufficiale) in /tmp/fonti.

Sidecar a schema chiuso: derived_from{path, sha256, bytes}, tool, tool_version, extracted.
"""
import hashlib
import json
import shutil
from datetime import date
from pathlib import Path

DEST = Path(__file__).resolve().parents[1] / "fonti"
OGGI = date.today().isoformat()

# (file in /tmp/fonti, nome in fonti/, URL, strumento, versione)
FONTI = [
    ("pd-eigenvalues-during-an-analysis.md", "portwood-eigenvalues-during-an-analysis.md",
     "https://portwooddigital.com/2021/11/09/eigenvalues-during-an-analysis/", "defuddle", "0.19.1"),
    ("pd-why-your-eigenvalue-analysis-failed.md", "portwood-why-your-eigenvalue-analysis-failed.md",
     "https://portwooddigital.com/2026/01/27/why-your-eigenvalue-analysis-failed/", "defuddle", "0.19.1"),
    ("pd-another-way-bad-eigenvalues.md", "portwood-another-way-to-get-bad-eigenvalues.md",
     "https://portwooddigital.com/2022/11/11/another-way-to-get-bad-eigenvalues/", "defuddle", "0.19.1"),
    ("pd-one-way-bad-eigenvalues.md", "portwood-one-way-to-get-bad-eigenvalues.md",
     "https://portwooddigital.com/2022/11/10/one-way-to-get-bad-eigenvalues/", "defuddle", "0.19.1"),
    ("pd-eigen-almost-hear-you-sigh.md", "portwood-eigen-almost-hear-you-sigh.md",
     "https://portwooddigital.com/2025/12/30/eigen-almost-hear-you-sigh/", "defuddle", "0.19.1"),
    ("pd-ordinary-eigenvalues.md", "portwood-ordinary-eigenvalues.md",
     "https://portwooddigital.com/2020/11/13/ordinary-eigenvalues/", "defuddle", "0.19.1"),
    ("ops-doc-eigen.rst.txt", "opensees-doc-eigen.md",
     "https://opensees.github.io/OpenSeesDocumentation/_sources/user/manual/analysis/eigen.rst.txt",
     "curl", "8.7.1"),
    ("ops-doc-modalProperties.rst.txt", "opensees-doc-modalProperties.md",
     "https://opensees.github.io/OpenSeesDocumentation/_sources/user/manual/analysis/modalProperties.rst.txt",
     "curl", "8.7.1"),
]

if __name__ == "__main__":
    DEST.mkdir(parents=True, exist_ok=True)
    for sorgente, nome, url, tool, versione in FONTI:
        src = Path("/tmp/fonti") / sorgente
        assert src.is_file(), f"manca la cattura {src}"
        dst = DEST / nome
        if sorgente.endswith(".rst.txt"):
            dst.write_text(f"<!-- sorgente reStructuredText di {url}, salvato verbatim -->\n\n"
                           "```rst\n" + src.read_text() + "\n```\n")
        else:
            shutil.copyfile(src, dst)
        dati = dst.read_bytes()
        (DEST / (dst.stem + ".provenance.json")).write_text(json.dumps({
            "derived_from": {"path": url,
                             "sha256": hashlib.sha256(dati).hexdigest(),
                             "bytes": len(dati)},
            "tool": tool, "tool_version": versione, "extracted": OGGI,
        }, indent=1, ensure_ascii=False) + "\n")
        print(nome, len(dati), "byte")
