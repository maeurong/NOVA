"""Il prior sintetico con due membrature bocciate: quello che l'importatore vede a metà rilievo.

Le membrature 2 e 3 passano in `scartate` e la lista `membrature` si compatta. Le `giunzioni`
si rifanno **come le riscriverebbe MeshRec**: `wall.giunzioni` le calcola sulle sole membrature
accettate, e il suo docstring lo dichiara (Tesi@9716f6e `meshrec/src/meshrec/core/wall.py:997-1000`,
«`cede` e `resta` sono indici dentro la lista `membrature` ricevuta … e non identificatori di
regione»). Quindi qui: si buttano le giunzioni che nominano una membratura scartata — MeshRec
non le avrebbe nemmeno viste — e le superstiti si rinumerano sugli indici nuovi. Lasciare gli
indici vecchi darebbe una fixture che nessuna corsa di MeshRec può produrre, e in cui le
giunzioni superstiti punterebbero alla membratura sbagliata: `costruisci` incolperebbe la
geometria («lunghezza di calcolo −1675 mm») di un difetto di numerazione.

`scartate[i]["regione"]` resta invece il numero della regione nella segmentazione originale,
come lo scrive `wall.prior`: è per questo che le due numerazioni non si confrontano.

`python genera.py` riscrive `12_wall.json`; `python genera.py --stdout` ne stampa i byte
(un test controlla che il file committato sia ancora quello che questo script produce).
"""
import json
import sys
from pathlib import Path

QUI = Path(__file__).resolve().parent
SORGENTE = QUI.parent / "prior_sintetico" / "12_wall.json"
SCARTATE = (2, 3)


def costruisci(scartate: tuple[int, ...] = SCARTATE) -> bytes:
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
        for k in scartate
    ]
    tenute = [k for k in range(len(membrature)) if k not in scartate]
    nuovo_indice = {vecchio: nuovo for nuovo, vecchio in enumerate(tenute)}
    prior["membrature"] = [membrature[k] for k in tenute]
    prior["giunzioni"] = [
        {**g, "cede": nuovo_indice[g["cede"]], "resta": nuovo_indice[g["resta"]]}
        for g in prior["giunzioni"]
        if g["cede"] in nuovo_indice and g["resta"] in nuovo_indice
    ]
    prior["regioni_trovate"] = len(prior["membrature"])
    testo = json.dumps(prior, indent=1, sort_keys=True, allow_nan=False, ensure_ascii=False) + "\n"
    return testo.encode("utf-8")


if __name__ == "__main__":
    dati = costruisci()
    if "--stdout" in sys.argv[1:]:
        sys.stdout.buffer.write(dati)
    else:
        (QUI / "12_wall.json").write_bytes(dati)
