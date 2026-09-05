"""La tabella di confronto telaio (NOVA/OpenSees) ↔ solido (CalculiX) ↔ Abaqus (CSV).

Nessun pass/fail: scarto percentuale, classe a tre valori (`concorde ≤ 5 % | vicino ≤ 20 %
| lontano`, `non_confrontabile` per un `None`) e `bias_atteso` fisso per grandezza. Ogni
export porta `AVVERTENZA`: «verifica del codice, non validazione», non una prova di carico.

Il solido e il CSV sono opzionali: senza uno dei due, le sue colonne restano `None` e le
classi `non_confrontabile` — nessuna eccezione. Il telaio, invece, è sempre obbligatorio.
"""
from __future__ import annotations

import csv
import dataclasses
import datetime as _dt
import io
import json
import math
import subprocess
from pathlib import Path

from nova.ccx import SET_SOMMITA
from nova.deck import GRAVITA

AVVERTENZA = "verifica del codice, non validazione"
SOGLIE = (0.05, 0.20)

# Il nome esatto, sul lato solido, del passo di spinta orizzontale — lo stesso su
# `tests/fixture/solido_piccolo/trave.inp` e sul deck vero (piano T3, Task 1 Step 1):
# `taglio_base` è una riga sola, non una per caso, e serve un modo di riconoscerla.
_PASSO_SPINTA = "SPINTA_ORIZZONTALE"

_COLONNE_CSV = ("caso", "grandezza", "valore", "unita", "fonte")

UNITA_ATTESA = {
    "massa": "t", "reazione_x": "N", "reazione_z": "N", "taglio_base": "N",
    "u_sommita_x": "mm", "u_sommita_z": "mm", "f1": "Hz", "f2": "Hz", "f3": "Hz",
    "massa_partecipante_x": "%", "massa_partecipante_y": "%", "massa_partecipante_z": "%",
}

_BIAS_RIGIDEZZA = ("tetraedri lineari più rigidi → spostamenti e periodi del solido più "
                   "piccoli; telaio senza nodo rigido né fondazioni deformabili → telaio "
                   "più deformabile")
BIAS_ATTESO = {
    "massa": "massa: zapatas e tamponatura fuori dal telaio",
    "u_sommita_x": _BIAS_RIGIDEZZA, "u_sommita_z": _BIAS_RIGIDEZZA,
    "f1": _BIAS_RIGIDEZZA, "f2": _BIAS_RIGIDEZZA, "f3": _BIAS_RIGIDEZZA,
}

# f1/f2/f3 sono l'asse dominante (x/y/z), non l'ordine di estrazione: «Decisioni del
# controller» del brief. x e y sono le due direzioni orizzontali (nel piano/fuori piano di
# un telaio piano), z quella verticale.
_ASSI_F = (("f1", "x"), ("f2", "y"), ("f3", "z"))

# Sotto questa quota di massa partecipante, un asse del solido non «ha» un modo: niente
# accoppiamento su un asse che il modo muove appena (Decisioni del controller, punto 1).
_SOGLIA_MASSA_ASSE = 0.05


@dataclasses.dataclass
class Riga:
    grandezza: str
    caso: str | None
    unita: str
    telaio: float | None
    solido: float | None
    abaqus: float | None
    scarto_solido_pct: float | None
    scarto_abaqus_pct: float | None
    classe_solido: str
    classe_abaqus: str
    bias_atteso: str
    # Non nell'elenco delle interfacce del brief, ma necessaria: più righe degeneri
    # chiedono «non_confrontabile con ragione», e senza un campo la ragione si perderebbe.
    ragione: str | None = None


@dataclasses.dataclass
class Tabella:
    righe: list[Riga]
    provenienza: dict
    avvertenza: str = AVVERTENZA


def classe(scarto: float | None) -> str:
    if scarto is None:
        return "non_confrontabile"
    if scarto <= SOGLIE[0]:
        return "concorde"
    if scarto <= SOGLIE[1]:
        return "vicino"
    return "lontano"


def _scarto_classe(telaio_val: float | None, altro_val: float | None) -> tuple[float | None, str]:
    """`None` (e quindi `non_confrontabile`) se uno dei due manca **o** uno dei due è zero:
    zero come riferimento divide per zero, zero come confronto renderebbe uno scarto senza
    un riferimento a cui appoggiarsi (Decisioni del controller — le due righe degeneri
    «massa del telaio 0» e «valore del solido 0» chiedono la stessa guardia simmetrica)."""
    if telaio_val is None or altro_val is None or telaio_val == 0 or altro_val == 0:
        return None, classe(None)
    scarto = abs(altro_val - telaio_val) / abs(telaio_val)
    return scarto * 100.0, classe(scarto)


# --- CSV Abaqus ----------------------------------------------------------------

def leggi_csv(percorso) -> list[dict]:
    p = Path(percorso)
    try:
        testo = p.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError) as e:
        raise ValueError(f"{p}: CSV Abaqus illeggibile ({e})") from None
    righe_testo = testo.splitlines()
    if not righe_testo:
        raise ValueError(f"{p}: CSV Abaqus vuoto, servono le colonne {', '.join(_COLONNE_CSV)}")
    delimitatore = ";" if ";" in righe_testo[0] else ","
    lettore = csv.reader(righe_testo, delimiter=delimitatore)
    intestazione = [c.strip() for c in next(lettore)]
    if tuple(intestazione) != _COLONNE_CSV:
        raise ValueError(f"{p}: intestazione CSV attesa «{', '.join(_COLONNE_CSV)}», "
                         f"trovata «{', '.join(intestazione)}»")
    dati: list[dict] = []
    for numero, campi in enumerate(lettore, start=2):
        if not campi or not any(c.strip() for c in campi):
            continue  # riga vuota: non è un dato mancante, è solo aria nel file
        if len(campi) != len(_COLONNE_CSV):
            raise ValueError(f"{p}, riga {numero}: {len(campi)} colonne invece di "
                             f"{len(_COLONNE_CSV)} ({', '.join(_COLONNE_CSV)})")
        d = dict(zip(_COLONNE_CSV, (c.strip() for c in campi)))
        try:
            d["valore"] = float(d["valore"].replace(",", "."))
        except ValueError:
            raise ValueError(f"{p}, riga {numero}: valore non numerico «{d['valore']}»") from None
        d["fonte"] = d["fonte"] or "?"
        dati.append(d)
    return dati


def _indicizza_abaqus(righe: list[dict]) -> dict[tuple[str, str], dict]:
    return {(r["caso"], r["grandezza"]): r for r in righe}


def _valore_abaqus(lookup: dict, caso: str, grandezza: str) -> tuple[float | None, str | None]:
    """`caso` vuoto per le grandezze che non sono legate a un passo (massa, f1-f3,
    massa_partecipante_*): l'utente scrive quelle righe del CSV con `caso` vuoto."""
    riga = lookup.get((caso, grandezza))
    if riga is None:
        return None, None
    atteso = UNITA_ATTESA[grandezza]
    if riga["unita"] != atteso:
        return None, (f"CSV Abaqus: unità «{riga['unita']}» per «{grandezza}» diversa da "
                      f"quella del telaio («{atteso}»): non confrontabile")
    return riga["valore"], None


# --- validazione di mappa_casi --------------------------------------------------

def _casi_mappati(mappa_casi: dict) -> dict:
    return {k: v for k, v in mappa_casi.items()
           if k not in ("nodi_sommita", "gravita", "spinta")}


def _valida(telaio: dict, solido: dict | None, mappa_casi: dict) -> None:
    casi_telaio = telaio.get("run", {}).get("casi", [])
    nodi_validi = telaio.get("run", {}).get("mappa_tag", {}).get("nodo", {})
    for nodo in mappa_casi.get("nodi_sommita", []):
        if str(nodo) not in nodi_validi:
            raise ValueError(f"mappa_casi[«nodi_sommita»] nomina il nodo {nodo}, assente nel "
                             f"telaio (nodi validi: {', '.join(sorted(nodi_validi, key=int))})")
    gravita = mappa_casi.get("gravita")
    if gravita is not None and gravita not in casi_telaio:
        raise ValueError(f"mappa_casi[«gravita»] nomina il caso «{gravita}», assente nel "
                         f"telaio (casi validi: {', '.join(casi_telaio)})")
    passi_solido = set(solido.get("passi", {})) if solido is not None else None
    for telaio_caso, solido_caso in _casi_mappati(mappa_casi).items():
        if telaio_caso not in casi_telaio:
            raise ValueError(f"mappa_casi nomina il caso «{telaio_caso}», assente nel telaio "
                             f"(casi validi: {', '.join(casi_telaio)})")
        if passi_solido is not None and solido_caso not in passi_solido:
            raise ValueError(f"mappa_casi nomina il passo «{solido_caso}», assente nel solido "
                             f"(passi validi: {', '.join(sorted(passi_solido))})")


# --- la massa (prima riga, sempre) ----------------------------------------------

def _e_azione(caso: str) -> bool:
    return caso[:1] == "Z" and caso[1:].isdigit()


def _caso_gravita(telaio: dict, mappa_casi: dict) -> str | None:
    dichiarato = mappa_casi.get("gravita")
    if dichiarato is not None:
        return dichiarato
    casi = telaio.get("run", {}).get("casi", [])
    # il peso proprio generato prende sempre lo `Z<id>` più alto: `assicura_peso_proprio`
    # (nova/modello.py:372) lo aggiunge per ultimo, oltre ogni azione dichiarata
    candidati = [c for c in casi if _e_azione(c)]
    return max(candidati, key=lambda c: int(c[1:])) if candidati else None


def _riga_massa(telaio: dict, solido: dict | None, lookup: dict, mappa_casi: dict) -> Riga:
    caso_g = _caso_gravita(telaio, mappa_casi)
    ragione_g = None
    massa_telaio = None
    if caso_g is not None:
        if _e_azione(caso_g):
            massa_telaio = -telaio["run"]["carico_totale"][caso_g][2] / GRAVITA
        else:
            # una combinazione (C<id>) può avere un coefficiente di gravità diverso da 1:
            # `carico_totale` non basta a ricavare la massa, serve un'azione a sé
            ragione_g = (f"il caso di gravità {caso_g} è una combinazione, serve "
                        f"un'azione Z<id> a coefficiente unitario")
    massa_solido = solido.get("massa") if solido is not None else None
    ab_val, ab_ragione = _valore_abaqus(lookup, "", "massa")
    s_pct, s_classe = _scarto_classe(massa_telaio, massa_solido)
    a_pct, a_classe = _scarto_classe(massa_telaio, ab_val)
    ragione = (ragione_g if s_classe == "non_confrontabile" and ragione_g
              else (ab_ragione if a_classe == "non_confrontabile" and ab_ragione else None))
    return Riga("massa", None, UNITA_ATTESA["massa"], massa_telaio, massa_solido, ab_val,
               s_pct, a_pct, s_classe, a_classe, BIAS_ATTESO["massa"], ragione)


# --- reazioni, spostamenti di sommità, taglio di base, per caso mappato --------

def _somma_reazioni(dati_caso: dict) -> tuple[float | None, float | None]:
    reazioni = dati_caso.get("reazioni") or {}
    if not reazioni:
        return None, None
    valori = list(reazioni.values())
    return (sum(v[0] for v in valori), sum(v[2] for v in valori))


def _media_sommita(dati_caso: dict, nodi_sommita: list) -> tuple[float | None, float | None]:
    sposta = dati_caso.get("spostamenti") or {}
    xs, zs = [], []
    for nodo in nodi_sommita:
        v = sposta.get(str(nodo))
        if v is not None:
            xs.append(v[0]); zs.append(v[2])
    return (sum(xs) / len(xs), sum(zs) / len(zs)) if xs else (None, None)


def _reazioni_solido(passo: dict | None) -> tuple[float | None, float | None, str | None]:
    if passo is None:
        return None, None, None
    somma = passo.get("reazioni_somma")
    if somma is None:
        return None, None, "reazioni non stampate dal solido"
    return somma[0], somma[2], None


def _u_sommita_solido(passo: dict | None) -> tuple[float | None, float | None, str | None]:
    if passo is None:
        return None, None, None
    top = (passo.get("u_set") or {}).get(SET_SOMMITA)
    if not top:
        return None, None, "spostamento di sommità non riportato dal solido (nessun set TOP)"
    medio = top["medio"]
    return medio[0], medio[2], None


def _riga_confronto(grandezza: str, caso: str | None, telaio_val, solido_val, lookup,
                    solido_caso: str, ragione_solido: str | None = None) -> Riga:
    ab_val, ab_ragione = _valore_abaqus(lookup, solido_caso, grandezza)
    s_pct, s_classe = _scarto_classe(telaio_val, solido_val)
    a_pct, a_classe = _scarto_classe(telaio_val, ab_val)
    ragione = (ragione_solido if s_classe == "non_confrontabile" and ragione_solido
              else (ab_ragione if a_classe == "non_confrontabile" and ab_ragione else None))
    return Riga(grandezza, caso, UNITA_ATTESA[grandezza], telaio_val, solido_val, ab_val,
               s_pct, a_pct, s_classe, a_classe, BIAS_ATTESO.get(grandezza, ""), ragione)


def _righe_caso(telaio: dict, solido: dict | None, lookup: dict, nodi_sommita: list,
                telaio_caso: str, solido_caso: str) -> tuple[list[Riga], tuple]:
    dati_caso = telaio.get("per_caso", {}).get(telaio_caso, {})
    tx, tz = _somma_reazioni(dati_caso)
    passo = (solido or {}).get("passi", {}).get(solido_caso) if solido is not None else None
    sx, sz, ragione_r = _reazioni_solido(passo) if solido is not None else (None, None, None)
    righe = [
        _riga_confronto("reazione_x", telaio_caso, tx, sx, lookup, solido_caso, ragione_r),
        _riga_confronto("reazione_z", telaio_caso, tz, sz, lookup, solido_caso, ragione_r),
    ]
    ux_t, uz_t = _media_sommita(dati_caso, nodi_sommita)
    ux_s = uz_s = None
    ragione_u = None
    if solido is not None:
        ux_s, uz_s, ragione_u = _u_sommita_solido(passo)
    righe.append(_riga_confronto("u_sommita_x", telaio_caso, ux_t, ux_s, lookup, solido_caso, ragione_u))
    righe.append(_riga_confronto("u_sommita_z", telaio_caso, uz_t, uz_s, lookup, solido_caso, ragione_u))
    return righe, (tx, sx)


# --- modi: appaiamento per direzione dominante, non per numero ------------------

def _asse_dominante_telaio(modo: dict, nodi_sommita: list) -> str | None:
    forma = modo.get("forma", {})
    massimi = [0.0, 0.0, 0.0]
    trovato = False
    for nodo in nodi_sommita:
        v = forma.get(str(nodo))
        if v is None:
            continue
        trovato = True
        for i in range(3):
            massimi[i] = max(massimi[i], abs(v[i]))
    if not trovato:
        return None
    return "xyz"[max(range(3), key=lambda i: massimi[i])]


def _primo_modo_telaio(modi: list[dict], nodi_sommita: list, asse: str) -> dict | None:
    return next((m for m in modi if _asse_dominante_telaio(m, nodi_sommita) == asse), None)


def _asse_dominante_solido(modo: dict) -> str | None:
    mp = modo.get("massa_partecipante", {})
    candidati = {k: v for k, v in mp.items() if v is not None and v >= _SOGLIA_MASSA_ASSE}
    return max(candidati, key=candidati.get) if candidati else None


def _primo_modo_solido(modi: list[dict], asse: str) -> dict | None:
    return next((m for m in modi if _asse_dominante_solido(m) == asse), None)


def _righe_modi(telaio: dict, solido: dict | None, lookup: dict, nodi_sommita: list) -> list[Riga]:
    modi_t = telaio.get("modi") or []
    modi_s = (solido or {}).get("modi") if solido is not None else None
    righe = []
    for etichetta, asse in _ASSI_F:
        modo_t = _primo_modo_telaio(modi_t, nodi_sommita, asse) if nodi_sommita else None
        modo_s = _primo_modo_solido(modi_s, asse) if modi_s else None
        f_t = modo_t["f"] if modo_t else None
        f_s = modo_s["f"] if modo_s else None
        ragione = None
        if f_t is None:
            ragione = f"nessun modo del telaio con asse {asse} dominante sui nodi di sommità"
        elif solido is not None and f_s is None:
            ragione = f"nessun modo del solido con asse {asse} dominante (massa partecipante ≥ 5 %)"
        righe.append(_riga_confronto(etichetta, None, f_t, f_s, lookup, "", ragione))
    return righe


def _righe_massa_partecipante(telaio: dict, solido: dict | None, lookup: dict) -> list[Riga]:
    modi_t = telaio.get("modi") or []
    modi_s = (solido or {}).get("modi") if solido is not None else None
    ultimo_t = modi_t[-1] if modi_t else None
    ultimo_s = modi_s[-1] if modi_s else None
    righe = []
    for asse in "xyz":
        grandezza = f"massa_partecipante_{asse}"
        vt = ultimo_t["massa_partecipante"][asse] * 100.0 if ultimo_t else None
        vs = ultimo_s["massa_partecipante"][asse] * 100.0 if ultimo_s else None
        righe.append(_riga_confronto(grandezza, None, vt, vs, lookup, ""))
    return righe


# --- provenienza -----------------------------------------------------------------

def _commit_nova() -> str | None:
    radice = Path(__file__).resolve().parent.parent
    try:
        r = subprocess.run(["git", "-C", str(radice), "rev-parse", "--short", "HEAD"],
                          capture_output=True, text=True, timeout=5)
    except (OSError, subprocess.SubprocessError):
        return None
    return r.stdout.strip() if r.returncode == 0 and r.stdout.strip() else None


def _provenienza(telaio: dict, solido: dict | None) -> dict:
    run_t, run_s = telaio.get("run", {}), (solido or {}).get("run", {})
    return {
        "commit_nova": _commit_nova(),
        "run_id_telaio": run_t.get("id"),
        "run_id_solido": run_s.get("id") if solido is not None else None,
        "sha256_deck_solido": run_s.get("sha256_deck") if solido is not None else None,
        "versione_opensees": run_t.get("versione_opensees"),
        "versione_calculix": run_s.get("versione") if solido is not None else None,
        "data": _dt.datetime.now().isoformat(timespec="seconds"),
    }


# --- la tabella --------------------------------------------------------------------

def confronta(telaio: dict, solido: dict | None, abaqus: list[dict] | None,
             mappa_casi: dict) -> Tabella:
    """Chiavi speciali di `mappa_casi`, oltre a `telaio_caso: passo_solido`:
    `"nodi_sommita"` (lista di id nodo), `"gravita"` (il caso telaio di solo peso proprio,
    se diverso dall'euristica automatica: lo `Z<id>` più alto), `"spinta"` (il caso telaio
    — già chiave di `mappa_casi` — da usare per `taglio_base`, se diverso dalla ricerca
    automatica del passo solido `SPINTA_ORIZZONTALE`; se nomina un caso non mappato, niente
    riga `taglio_base` e nessuna eccezione)."""
    mappa_casi = mappa_casi or {}
    _valida(telaio, solido, mappa_casi)
    lookup = _indicizza_abaqus(abaqus or [])
    nodi_sommita = mappa_casi.get("nodi_sommita", [])

    righe = [_riga_massa(telaio, solido, lookup, mappa_casi)]

    spinta_dichiarata = mappa_casi.get("spinta")
    per_caso_txsx = {}
    candidato_spinta = None
    for telaio_caso, solido_caso in _casi_mappati(mappa_casi).items():
        rc, (tx, sx) = _righe_caso(telaio, solido, lookup, nodi_sommita, telaio_caso, solido_caso)
        righe += rc
        per_caso_txsx[telaio_caso] = (solido_caso, tx, sx)
        if (spinta_dichiarata is None and candidato_spinta is None
               and solido_caso == _PASSO_SPINTA):
            candidato_spinta = (telaio_caso, solido_caso, tx, sx)
    if spinta_dichiarata is not None and spinta_dichiarata in per_caso_txsx:
        solido_caso, tx, sx = per_caso_txsx[spinta_dichiarata]
        candidato_spinta = (spinta_dichiarata, solido_caso, tx, sx)
    if candidato_spinta is not None:
        telaio_caso, solido_caso, tx, sx = candidato_spinta
        righe.append(_riga_confronto("taglio_base", telaio_caso, tx, sx, lookup, solido_caso))

    righe += _righe_modi(telaio, solido, lookup, nodi_sommita)
    righe += _righe_massa_partecipante(telaio, solido, lookup)

    return Tabella(righe=righe, provenienza=_provenienza(telaio, solido), avvertenza=AVVERTENZA)


# --- export: JSON, CSV (punto decimale), LaTeX (virgola, booktabs) ----------------

def _num_csv(x: float | None) -> str:
    return "" if x is None else f"{x:.6g}"


def _csv(tabella: Tabella) -> str:
    intestazione = ["grandezza", "caso", "unita", "telaio", "solido", "abaqus",
                    "scarto_solido_pct", "scarto_abaqus_pct", "classe_solido", "classe_abaqus",
                    "bias_atteso", "ragione"]
    buf = io.StringIO()
    buf.write("# unita: mm N t Hz; separatore ;\n")
    # csv.writer, non ";".join: bias_atteso contiene un ";" letterale, il join lo confonde
    # col separatore e sfalsa il numero di campi della riga.
    scrittore = csv.writer(buf, delimiter=";", lineterminator="\n")
    scrittore.writerow(intestazione)
    for r in tabella.righe:
        scrittore.writerow([
            r.grandezza, r.caso or "", r.unita, _num_csv(r.telaio), _num_csv(r.solido),
            _num_csv(r.abaqus), _num_csv(r.scarto_solido_pct), _num_csv(r.scarto_abaqus_pct),
            r.classe_solido, r.classe_abaqus, r.bias_atteso, r.ragione or "",
        ])
    return buf.getvalue()


def _escape_tex(s: str) -> str:
    return s.replace("\\", r"\textbackslash{}").replace("%", r"\%").replace("_", r"\_") \
            .replace("&", r"\&")


def _it(x: float | None) -> str:
    """Notazione posizionale sempre, 4 cifre significative, mai esponente: `.4g` sceglie da
    solo la notazione scientifica sopra 1e4 o sotto 1e-4 (LaTeX non la digerisce)."""
    if x is None:
        return "--"
    if x == 0:
        return "0"
    cifre_decimali = max(0, 3 - math.floor(math.log10(abs(x))))
    return f"{x:.{cifre_decimali}f}".replace(".", ",")


def _it_pct(x: float | None) -> str:
    return "--" if x is None else _it(x) + r"\%"


def _tex(tabella: Tabella) -> str:
    # bias_atteso e ragione restano fuori dalla tabella LaTeX (troppo lunghi per una cella):
    # CSV e JSON portano le colonne complete.
    corpo = []
    for r in tabella.righe:
        corpo.append(" & ".join([
            _escape_tex(r.grandezza), _escape_tex(r.caso or ""), _escape_tex(r.unita),
            _it(r.telaio), _it(r.solido), _it(r.abaqus),
            _it_pct(r.scarto_solido_pct), _it_pct(r.scarto_abaqus_pct),
            _escape_tex(r.classe_solido), _escape_tex(r.classe_abaqus),
        ]) + r" \\")
    p = tabella.provenienza
    piede = (f"commit NOVA {p.get('commit_nova') or 'n/d'}; run telaio {p.get('run_id_telaio')}; "
            f"run solido {p.get('run_id_solido') or 'n/d'}; sha256 deck solido "
            f"{p.get('sha256_deck_solido') or 'n/d'}; OpenSees {p.get('versione_opensees') or 'n/d'}; "
            f"CalculiX {p.get('versione_calculix') or 'n/d'}; {p.get('data')}. {tabella.avvertenza}.")
    return "\n".join([
        r"\begin{table}",
        r"\centering",
        r"\begin{tabular}{lllrrrrrll}",
        r"\toprule",
        r"grandezza & caso & unit\`a & telaio & solido & abaqus & scarto sol. & scarto abq. & "
        r"classe sol. & classe abq. \\",
        r"\midrule",
        *corpo,
        r"\bottomrule",
        r"\end{tabular}",
        r"\caption{" + _escape_tex(piede) + "}",
        r"\end{table}",
    ]) + "\n"


def esporta(tabella: Tabella, cartella) -> dict[str, Path]:
    cartella = Path(cartella)
    cartella.mkdir(parents=True, exist_ok=True)
    file = {"json": cartella / "confronto.json", "csv": cartella / "confronto.csv",
           "tex": cartella / "confronto.tex"}
    file["json"].write_text(json.dumps(dataclasses.asdict(tabella), ensure_ascii=False, indent=1),
                            encoding="utf-8")
    file["csv"].write_text(_csv(tabella), encoding="utf-8")
    file["tex"].write_text(_tex(tabella), encoding="utf-8")
    return file
