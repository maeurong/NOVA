"""Le misure del ticket #9, sul binario vero. Scrive prove/MISURE.md.

Quattro casi: telaio 2×1 sano; asta a lunghezza zero; nodo libero; nodi
coincidenti. Per i tre malati si misura **due volte**: col Check Model davanti
(cosa dice il sidecar) e senza (`forza: true`: cosa fa OpenSees da solo).
"""
from __future__ import annotations

import copy
import json
import shutil
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import nova_sidecar as sc  # noqa: E402


def telaio_2x1() -> dict:
    N = lambda i, x, z, v=None: {"id": f"N{i}", "x": x, "z": z, "vincolo": v}
    inc = {"ux": 1, "uz": 1, "ry": 1}
    return {
        "schema_version": 1, "unita": "mm-N-MPa-t-s",
        "nodi": [N(1, 0, 0, inc), N(2, 5, 0, inc), N(3, 9, 0, inc), N(4, 0, 3.2), N(5, 5, 3.2), N(6, 9, 3.2)],
        "aste": [{"id": "A1", "i": "N1", "j": "N4", "sezione": "S1"}, {"id": "A2", "i": "N2", "j": "N5", "sezione": "S1"}, {"id": "A3", "i": "N3", "j": "N6", "sezione": "S1"},
                 {"id": "A4", "i": "N4", "j": "N5", "sezione": "S3"}, {"id": "A5", "i": "N5", "j": "N6", "sezione": "S3"}],
        "sezioni": {
            "S1": {"nome": "30×30", "tipo": "rettangolare", "b": 0.3, "h": 0.3, "calcestruzzo": "M1", "acciaio": "M2", "copriferro": 30, "file": [{"lato": "inf", "n": 2, "diametro": 16}, {"lato": "sup", "n": 2, "diametro": 16}], "staffe": {"diametro": 8, "passo": 150, "bracci": 2}},
            "S3": {"nome": "30×50", "tipo": "rettangolare", "b": 0.3, "h": 0.5, "calcestruzzo": "M1", "acciaio": "M2", "copriferro": 30, "file": [{"lato": "inf", "n": 3, "diametro": 16}, {"lato": "sup", "n": 3, "diametro": 16}], "staffe": {"diametro": 8, "passo": 150, "bracci": 2}},
        },
        "materiali": {"M1": {"tipo": "calcestruzzo", "classe": "C25/30"}, "M2": {"tipo": "acciaio", "classe": "B450C"}},
    }


def corsa(m, cartella, forza=False):
    eventi = []
    risp = sc.comando_corsa({"modello": m, "cartella": str(cartella), "forza": forza, "analisi": {"modi": 3}}, eventi.append)
    return eventi, risp


def coda_log(cartella):
    p = Path(cartella) / sc.opensees.NOME_REGISTRO
    return p.read_text(errors="replace")[-600:] if p.is_file() else "(nessun registro)"


def main():
    base = Path(tempfile.mkdtemp(prefix="nova-sidecar-"))
    righe = ["# Misure del sidecar — OpenSees 3.8.0 ARM, 04/09/2026", "", f"Cartella: `{base}`", ""]
    casi = {}
    sano = telaio_2x1()
    casi["sano"] = sano
    zero = copy.deepcopy(sano); zero["nodi"].append({"id": "N7", "x": 9, "z": 3.2, "vincolo": None}); zero["aste"].append({"id": "A6", "i": "N6", "j": "N7", "sezione": "S1"})
    zero["nodi"][-1]["x"] = 9.0000001  # 0,1 µm: sotto la tolleranza, non identico
    casi["asta_lunghezza_zero"] = zero
    libero = copy.deepcopy(sano); libero["nodi"].append({"id": "N7", "x": 12, "z": 3.2, "vincolo": None})
    casi["nodo_libero"] = libero
    coinc = copy.deepcopy(sano); coinc["nodi"].append({"id": "N7", "x": 5, "z": 3.2, "vincolo": None}); coinc["aste"].append({"id": "A6", "i": "N7", "j": "N6", "sezione": "S3"})
    casi["nodi_coincidenti"] = coinc

    righe += ["## Verifica del binario", "", "```", json.dumps(sc.comando_verifica({}), ensure_ascii=False, indent=1), "```", ""]
    for nome, m in casi.items():
        righe += [f"## {nome}", ""]
        ev, r = corsa(m, base / nome)
        righe += ["**Col Check Model davanti**", "", f"- esito: `{r['esito']}` in {r.get('secondi', 0):.2f} s; fasi: {[e['nome'] for e in ev]}"]
        for v in r.get("verdetti") or r.get("verdetti_check") or []:
            if v["esito"] != "passato":
                righe.append(f"- `{v['controllo']}` → {v['esito']}: {v['ragione']}")
        if r["esito"] == "ok":
            res = r["risultati"]
            reaz = res["per_caso"]["GRAVITA"]["reazioni"]
            somma = sum(v[2] for v in reaz.values())
            righe += [f"- reazioni al piede su {sorted(reaz)}: Σ Rz = {somma:.3f} N", f"- verdetti del solutore: " + ", ".join(f"`{v['controllo']}`={v['esito']}" for v in res["verdetti"]), f"- modi: " + ", ".join(f"{md['n']}: {md['f']:.3f} Hz" for md in res["modi"]), f"- deck: `{res['run']['deck']}`"]
        else:
            righe += [f"- motivo: {r.get('motivo', '')[:300]}"]
        if nome != "sano":
            ev, r = corsa(m, base / (nome + "_forzato"), forza=True)
            righe += ["", "**Senza Check Model (`forza: true`), cosa fa OpenSees**", "", f"- esito: `{r['esito']}` (fase: {r.get('fase', '-')}) in {r.get('secondi', 0):.2f} s"]
            if r["esito"] == "errore":
                righe += [f"- motivo: {r.get('motivo', '')[:400]}", "", "```", (r.get('coda_log') or coda_log(base / (nome + '_forzato')))[-600:], "```"]
            elif r["esito"] == "ok":
                res = r["risultati"]; reaz = res["per_caso"]["GRAVITA"]["reazioni"]
                righe += [f"- OpenSees ha girato lo stesso: reazioni su {sorted(reaz)}, Σ Rz = {sum(v[2] for v in reaz.values()):.3f} N; verdetti: " + ", ".join(f"`{v['controllo']}`={v['esito']}" for v in res["verdetti"]), f"- modi: " + ", ".join(f"{md['n']}: {md['f']:.3f} Hz" if md['f'] else f"{md['n']}: —" for md in res["modi"]), f"- returncode {res['run']['returncode']}; avvisi nel log: {coda_log(base / (nome + '_forzato')).count('WARNING')}"]
        righe.append("")
    out = Path(__file__).with_name("MISURE.md")
    out.write_text("\n".join(righe), encoding="utf-8")
    print(out)
    print("\n".join(righe))


if __name__ == "__main__":
    main()
