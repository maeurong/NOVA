"""Il prior sintetico con due membrature bocciate: quello che l'importatore vede a metà rilievo.

Sposta le membrature 2 e 3 in `scartate` e lascia le `giunzioni` **com'erano**. Non è una
dimenticanza: quegli indici ora nominano membrature che il prior non porta più, ed è
esattamente la condizione che `telaio.costruisci` rifiuta («nomina le membrature … ma il
prior ne porta 2»). Toglierle qui vorrebbe dire scrivere la fixture attorno alla guardia
che l'importatore deve avere, e nessun test la vedrebbe mai scattare.

`python genera.py` riscrive `12_wall.json`; `python genera.py --stdout` ne stampa i byte
(un test controlla che il file committato sia ancora quello che questo script produce).
"""
import json
import sys
from pathlib import Path

QUI = Path(__file__).resolve().parent
SORGENTE = QUI.parent / "prior_sintetico" / "12_wall.json"
SCARTATE = (2, 3)


def costruisci() -> bytes:
    prior = json.loads(SORGENTE.read_text(encoding="utf-8"))
    membrature = prior["membrature"]
    prior["scartate"] = [
        {
            "regione": k,
            "punti": membrature[k]["punti"],
            "controlli_falliti": ["costanza_sezione"],
            "esiti": {
                "costanza_sezione": {
                    "passato": False,
                    "valore": 0.31,
                    "soglia": 0.15,
                    "unita": "-",
                    "spiegazione": "sintetico: scartata a mano per il test",
                }
            },
        }
        for k in SCARTATE
    ]
    prior["membrature"] = [v for k, v in enumerate(membrature) if k not in SCARTATE]
    prior["regioni_trovate"] = len(prior["membrature"])
    testo = json.dumps(prior, indent=1, sort_keys=True, allow_nan=False, ensure_ascii=False) + "\n"
    return testo.encode("utf-8")


if __name__ == "__main__":
    dati = costruisci()
    if "--stdout" in sys.argv[1:]:
        sys.stdout.buffer.write(dati)
    else:
        (QUI / "12_wall.json").write_bytes(dati)
