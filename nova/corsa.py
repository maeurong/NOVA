"""Lancia OpenSees sul deck, legge i recorder, compone i risultati per corsa e i sette controlli C3."""
from __future__ import annotations

import datetime as _dt
import json
import math
import re
import subprocess
import time
import uuid
from pathlib import Path

import numpy as np

from meshrec.core import opensees, solve
from meshrec.core.config import SolutoreConfig
from nova import deck as _deck
from nova import modale
from nova.modello import AnalisiModale, Modello

NOME_RISULTATI = "risultati.nova.risultati.json"

# Le colonne che un `recorder Element ... section k force` scrive per elemento.
# Quattro, nell'ordine P, Mz, My, T: misurato il 05/09/2026 con OpenSees 3.8.0 sul
# telaio 2×1 (`Z1_sez1.out`: 20 numeri su 5 elementi) e sulla trave appoggiata, dove
# il carico lungo z globale — cioè lungo la z locale — muove la sola terza colonna.
_COLONNE_SEZIONE = 4

# Il segno con cui il momento del recorder diventa quello della spec («positivo se
# tende le fibre inferiori»). I due assi **non** hanno lo stesso segno, ed è il motivo
# per cui sono due costanti e non una: la sezione a fibre di OpenSees porta Mz e My con
# convenzioni opposte. Misurato il 05/09/2026 sulla trave appoggiata di 6 m con
# q = 10 N/mm, OpenSees 3.8.0: carico lungo −z locale, terza colonna in mezzeria
# −45 000 000 N·mm; stesso carico lungo −y locale, seconda colonna +45 000 000 N·mm.
# In tutti e due i casi il valore atteso è +qL²/8 = +45 000 000.
SEGNO_MY = -1.0
SEGNO_MZ = 1.0

_TIMEOUT_S = 600

# La riga che il ciclo Tcl della statica a fibre scrive a ogni passo convergente
# (`deck._blocco_statico`). È il solo racconto di **come** l'analisi è arrivata in fondo:
# i recorder rendono l'ultimo stato e non dicono quanti algoritmi ci sono voluti.
_RIGA_PASSO = re.compile(
    re.escape(_deck.MARCA_PASSO) + r": caso (\S+) passo (\d+) algoritmo (\S+) fattore (\S+)")


def _solutore(percorso: str | None) -> SolutoreConfig:
    return SolutoreConfig(nome="opensees", percorso=Path(percorso) if percorso else None)


def verifica(percorso: str | None) -> dict:
    """Una sola ricerca del binario: `solve.verifica` dice già se c'è e se risponde."""
    prova = solve.verifica(_solutore(percorso))
    dove = solve.DOVE_PRENDERLO["opensees"]
    if not prova["disponibile"]:
        return {"esito": "assente", "percorso": None, "motivo": prova["motivo"], "dove_prenderlo": dove}
    return {"esito": "ok" if prova["funziona"] else "rotto", "percorso": str(prova["percorso"]),
            "motivo": prova["motivo"], "dove_prenderlo": dove}


def _numero(x) -> float | None:
    """`null` al posto di `inf`/`nan`: il JSON standard non li ha e `JSON.parse` rifiuta la riga.

    Il verdetto non si ammorbidisce — `controlli` rilegge i `None` come `nan` e il controllo
    resta `non_passato`: qui si cambia solo come il numero guasto **si scrive**.
    """
    x = float(x)
    return x if math.isfinite(x) else None


def _reale(x) -> float:
    return math.nan if x is None else float(x)


def _pulito(v):
    if isinstance(v, float):
        return _numero(v)
    if isinstance(v, (list, tuple)):
        return [_pulito(x) for x in v]
    return v


def esegui(m: Modello, casi: list[str], cartella: Path, hash_modello: str,
           percorso_solutore: str | None = None, emetti=lambda ev: None) -> dict:
    """Scrive il deck, lancia il binario, legge le uscite. `hash_modello` è l'impronta del
    modello **prima** del peso proprio generato: qui `m` ce l'ha già dentro e ricalcolarla
    darebbe una seconda impronta per lo stesso file. Per questo è obbligatoria e senza
    ripiego: un default silenzioso rimetterebbe in piedi proprio quella seconda impronta."""
    t0 = time.perf_counter()
    stato = solve.disponibilita(_solutore(percorso_solutore))["opensees"]
    if not stato["disponibile"]:
        return {"esito": "assente", "motivo": stato["motivo"], "dove_prenderlo": stato["dove_prenderlo"],
                "secondi": time.perf_counter() - t0}
    cartella = Path(cartella)
    cartella.mkdir(parents=True, exist_ok=True)
    an = modale.analisi(m)
    provati: list[int] = []   # i gradini che il solutore ha estratto davvero
    falliti: list[int] = []   # quelli che ha rifiutato: restano scritti, non si nascondono
    risultati = None
    for n_modi in _tentativi(m, an):
        emetti({"evento": "fase", "nome": _fase(n_modi)})
        d, registro, errore = _lancia(m, casi, cartella, n_modi, stato, t0)
        ripiego = False
        if errore is not None:
            if not provati:  # nessun giro buono alle spalle: non c'è niente a cui tornare
                return errore
            # il gradino non sta in piedi: si torna all'ultimo che ci stava e si **rilancia**,
            # così deck, `.out` e `risultati.nova.risultati.json` sulla cartella sono dello
            # stesso giro. Tenere in memoria il risultato di prima lascerebbe sul disco un
            # deck che chiede modi che quel risultato non ha.
            falliti.append(n_modi)
            n_modi, ripiego = provati[-1], True
            # due colpi e non uno: quel gradino era appena passato, quindi la prima caduta è
            # l'intermittenza misurata del solutore (stesso deck, uscita −5/−11 a giri
            # alterni) e non il modello. La seconda di fila non è più intermittenza.
            for _ in range(2):
                emetti({"evento": "fase", "nome": _fase(n_modi)})
                d, registro, errore = _lancia(m, casi, cartella, n_modi, stato, t0)
                if errore is None:
                    break
            else:
                return errore
        emetti({"evento": "fase", "nome": "leggo i recorder"})
        try:
            risultati = risultati_da_uscite(m, d, cartella, registro, hash_modello)
        except (ValueError, OSError) as e:  # `FileNotFoundError` è un `OSError`
            return _errore_solutore(f"uscita del solutore illeggibile: {e}", registro, cartella, t0)
        if an is None:
            break
        if d.modi and not ripiego:
            provati.append(d.modi)
        risultati["run"].update({"modi_richiesti": an.modi, "modi_estratti": len(risultati["modi"]),
                                 "modi_provati": list(provati)})
        if falliti:
            risultati["run"]["modi_falliti"] = list(falliti)
        # `not d.modi`: niente da estrarre, e rilanciare il binario altre quattro volte per
        # riottenere lo stesso nulla è solo tempo perso
        if ripiego or not d.modi or isinstance(an.modi, int) \
                or modale.abbastanza(risultati["modi"], modale.direzioni_con_massa(m)):
            break
        # l'ultimo tentativo resta com'è: sotto soglia il verdetto è rosso, non un'eccezione
    assert risultati is not None  # `_tentativi` non rende mai la lista vuota
    risultati["run"]["secondi"] = time.perf_counter() - t0
    (cartella / NOME_RISULTATI).write_text(json.dumps(risultati, ensure_ascii=False, indent=1), encoding="utf-8")
    return {"esito": "ok", "risultati": risultati, "secondi": risultati["run"]["secondi"]}


def _fase(n_modi: int | None) -> str:
    return ("scrivo il deck e lancio OpenSees" if n_modi is None
            else f"scrivo il deck e lancio OpenSees (modale, {n_modi} modi)")


def _tentativi(m: Modello, an: AnalisiModale | None) -> list[int | None]:
    """I numeri di modi che la corsa proverà, in ordine. `[None]` senza analisi modale (una
    corsa statica sola), `[n]` con i modi imposti, con «auto» la scala di `modale.SCALA_MODI`
    **sotto** il tetto più il tetto stesso.

    Il tetto chiude sempre la scala e non si salta: `SCALA_MODI` va di raddoppi, e sul telaio
    2×1 (nove traslazioni libere) si fermerebbe a sei, cioè al 75,15 % di massa in z, mentre
    a nove modi la cumulata è 100 % su tutte e tre le direzioni (misurato il 05/09/2026,
    OpenSees 3.8.0). Un verdetto rosso per un gradino mancante, non per il modello.

    ponytail: il tetto porta un cappello all'ultimo gradino della scala (48). `gradi_liberi`
    conta anche i nodi delle suddivisioni, quindi un modello molto suddiviso ne ha centinaia,
    e l'ultimo giro li chiederebbe tutti a un solutore denso — il costo va col cubo. Sopra i
    48 modi il verdetto sulla massa resta quello che 48 modi dicono; se un modello vero non
    ci arriva, il cappello vuole una rimisura, non un altro raddoppio.
    """
    if an is None or modale.gradi_liberi(m) == 0:
        # nessuna traslazione libera con massa: `eigen` non ha niente da estrarre, e chiederglielo
        # scriverebbe un passo modale che rende una cartella senza forme. Un giro statico e basta.
        return [None]
    if isinstance(an.modi, int):
        return [an.modi]
    tetto = min(modale.gradi_liberi(m), modale.SCALA_MODI[-1])
    return [n for n in modale.SCALA_MODI if n < tetto] + [tetto]


def _lancia(m: Modello, casi: list[str], cartella: Path, n_modi: int | None, stato: dict,
            t0: float) -> tuple[_deck.Deck | None, str, dict | None]:
    """Un giro di deck → subprocess → marcatore di fine. `(deck, registro, None)` se il
    binario è arrivato in fondo, `(None, "", errore)` altrimenti."""
    d = _deck.scrivi(m, casi, cartella, n_modi)  # prima il deck: se lo rifiuta, la corsa di ieri resta intera
    for vecchia in [*cartella.glob("*.out"), cartella / NOME_RISULTATI]:
        vecchia.unlink(missing_ok=True)  # un'uscita di ieri si legge come il risultato di oggi
    try:
        processo = subprocess.run([str(stato["percorso"]), _deck.NOME_TCL], cwd=cartella,
                                  capture_output=True, timeout=_TIMEOUT_S)
    except subprocess.TimeoutExpired as e:
        return None, "", _errore_solutore(f"OpenSees non è finito entro il timeout di {_TIMEOUT_S:g} s",
                                          testo(e.stdout) + testo(e.stderr), cartella, t0)
    except (OSError, subprocess.SubprocessError) as e:
        # esiste ma non parte: permessi, architettura sbagliata, script senza shebang
        return None, "", _errore_solutore(f"«{stato['percorso']}» non è eseguibile: {e}", "", cartella, t0)
    registro = testo(processo.stdout) + testo(processo.stderr)
    (cartella / opensees.NOME_REGISTRO).write_text(registro, encoding="utf-8")
    fine = cartella / opensees.NOME_FINE
    if not (fine.is_file() and opensees.MARCA_FINE in fine.read_text(encoding="ascii", errors="ignore")):
        # il deck sa **perché** si è fermato (il caso, il passo, il fattore λ) e lo scrive nel
        # registro prima di `exit 1`: senza ripescarla, il motivo direbbe solo che il marcatore
        # manca, e chi legge dovrebbe aprire il log per sapere quale caso è caduto e dove
        return None, registro, _errore_solutore(
            _dichiarato(registro) or
            f"OpenSees non ha scritto il marcatore di fine ({opensees.NOME_FINE}): la corsa non è "
            f"arrivata in fondo (codice d'uscita {processo.returncode}, che non è il segnale)",
            registro, cartella, t0)
    return d, registro, None


def _dichiarato(registro: str) -> str | None:
    """Il motivo che il deck ha dichiarato prima di uscire, se c'è: la riga `MARCA_FINE_MANCA`."""
    marca = f"{opensees.MARCA_FINE}_MANCA:"
    for riga in registro.splitlines():
        if marca in riga:
            return f"OpenSees si è fermato: {riga.split(marca, 1)[1].strip()}"
    return None


def testo(grezzo: bytes | None) -> str:
    """Pubblica, come `verdetto` e `non_applicabile`: le usa anche `nova/ccx.py`.

    `replace` e non `ignore`: qui non si contano campi, si mostra il registro a una persona."""
    return "" if grezzo is None else grezzo.decode("utf-8", errors="replace")


def _errore_solutore(motivo: str, registro: str, cartella: Path, t0: float) -> dict:
    """Il registro finisce su disco anche qui: la corsa andata male è quella che si va a leggere."""
    (cartella / opensees.NOME_REGISTRO).write_text(registro, encoding="utf-8")
    return {"esito": "errore", "fase": "solutore", "motivo": motivo, "coda_log": registro[-2000:],
            "secondi": time.perf_counter() - t0}


def _stazioni(d: _deck.Deck, caso: str, cartella: Path) -> dict[str, list[dict]]:
    """Per asta: le stazioni di tutti i suoi elementi, con x_rel sull'asta, N/My/Mz/T dalla sezione, V dall'equilibrio."""
    n_el = len(d.elementi)
    sez = [opensees._ultima_riga(cartella / f"{caso}_sez{k}.out", _COLONNE_SEZIONE * n_el).reshape(n_el, _COLONNE_SEZIONE)
           for k in range(1, _deck.STAZIONI + 1)]
    locali = opensees._ultima_riga(cartella / f"{caso}_localforce.out", 12 * n_el).reshape(n_el, 12)
    per_asta: dict[str, list[dict]] = {}
    for id_asta, tags in d.mappa_asta.items():
        L_asta = sum(d.elementi[t - 1].L for t in tags)
        offset = 0.0
        stazioni: list[dict] = []
        for t in tags:
            e = d.elementi[t - 1]
            w = np.array(e.w[caso])
            wy, wz = float(np.dot(w, e.e1)), float(np.dot(w, e.e2))
            Fi = locali[t - 1, :6]  # forze d'estremità i nel locale: N, Vy, Vz, T, My, Mz
            for k, xi in enumerate(_deck.XI_LOBATTO):
                if stazioni and k == 0:
                    continue  # la stazione 0 di un elemento interno coincide con la 1 del precedente
                x = xi * e.L
                P, Mz, My, T = (float(v) for v in sez[k][t - 1, :4])
                # taglio dei manuali: +qL/2 all'estremo i, −qL/2 a j. Misurato il 05/09/2026 sulla
                # trave appoggiata (q = 10 N/mm, L = 6000): `localForce` rende Vz_i = +30 000, che è
                # già il segno giusto — il taglio si somma al carico, non si cambia di segno.
                stazioni.append({"x_rel": _numero((offset + x) / L_asta), "N": _numero(P),
                                 "Vy": _numero(float(Fi[1]) + wy * x), "Vz": _numero(float(Fi[2]) + wz * x),
                                 "T": _numero(T), "My": _numero(SEGNO_MY * My), "Mz": _numero(SEGNO_MZ * Mz)})
            offset += e.L
        per_asta[str(id_asta)] = stazioni
    return per_asta


def risultati_da_uscite(m: Modello, d: _deck.Deck, cartella: Path, registro: str,
                        hash_modello: str) -> dict:
    n_nodi = len(d.nodi)
    tag_a_id = {v: k for k, v in d.mappa_nodo.items()}
    per_caso: dict[str, dict] = {}
    for caso in d.casi:
        U = opensees._ultima_riga(cartella / f"{caso}_spostamenti.out", 6 * n_nodi).reshape(n_nodi, 6)
        R = opensees._ultima_riga(cartella / f"{caso}_reazioni.out", 6 * n_nodi).reshape(n_nodi, 6)
        per_caso[caso] = {
            "con_segno": True,
            "spostamenti": {str(tag_a_id[t]): [_numero(x) for x in U[t - 1]] for t in tag_a_id},
            "reazioni": {str(tag_a_id[t]): [_numero(x) for x in R[t - 1]] for t in d.vincolati},
            "sollecitazioni": _stazioni(d, caso, cartella),
        }
    # `None` = nessuna analisi modale nel modello; `[]` = dichiarata, ma o non c'era niente da
    # estrarre (nessuna direzione con massa) o il passo non ha reso niente
    if d.modi:
        modi, direzioni = modale.leggi(cartella, d.modi, tag_a_id, n_nodi), modale.direzioni_con_massa(m)
    elif modale.analisi(m) is not None:
        modi, direzioni = [], modale.direzioni_con_massa(m)
    else:
        modi, direzioni = None, ()
    verdetti = controlli(d, per_caso, registro, modi, direzioni)
    return {
        "run": {"id": uuid.uuid4().hex[:12], "data": _dt.datetime.now().isoformat(timespec="seconds"),
                "hash_modello": hash_modello, "versione_opensees": _versione(registro),
                "solutore": "OpenSees", "deck": str(d.percorso),
                "registro": str(cartella / opensees.NOME_REGISTRO),
                "carico_totale": d.carico_totale, "casi": d.casi,
                # vincolo globale T4: ogni parametro entrato nel `.tcl` dei materiali si stampa
                # con la sua provenienza (`classe`, `veste`, `articolo`). Vuoto se elastico.
                "legami": d.legami, "passi": d.passi, "materiali": d.materiali,
                "mappa_tag": {"nodo": {str(k): v for k, v in d.mappa_nodo.items()},
                              "asta": {str(k): v for k, v in d.mappa_asta.items()}}},
        "per_caso": per_caso, "modi": modi or [], "verdetti": verdetti,
    }


def _versione(registro: str) -> str | None:
    """La riga del banner, che **comincia** per «Version»: un `WARNING` che nomina una versione
    di elemento non è la versione del solutore."""
    for riga in registro.splitlines():
        if riga.strip().startswith("Version"):
            return riga.strip()
    return None


def _esito(c: dict) -> str:
    if c.get("applicabile") is False:
        return "non_applicabile"
    return "passato" if c.get("passato") else "non_passato"


def verdetto(controllo: str, c: dict, caso: str | None = None, ragione: str | None = None) -> dict:
    """Stessa forma dei verdetti C1 (`check._v`): le nove chiavi ci sono sempre."""
    valori = {k: _pulito(v) for k, v in c.items()
              if k not in ("passato", "applicabile", "motivo", "controllo", "modello")}
    return {"controllo": controllo, "oggetto": None, "stazione": None, "caso": caso,
            "esito": _esito(c), "ragione": ragione or c.get("motivo") or "",
            "articolo": None, "valori": valori, "rimedio": None}


def non_applicabile(controllo: str, ragione: str, caso: str | None = None) -> dict:
    """Il verdetto a tre valori dove `solve.esito_non_applicabile` non ha una riga in tabella:
    stessa forma, `non_applicabile`, e la ragione la dà chi sa perché."""
    return {"controllo": controllo, "oggetto": None, "stazione": None, "caso": caso,
            "esito": "non_applicabile", "ragione": ragione, "articolo": None,
            "valori": {}, "rimedio": None}


def _verdetto_convergenza(d: _deck.Deck, caso: str, registro: str) -> dict:
    """«La statica non lineare è arrivata in fondo, e come?» — story 50.

    Verde solo se il registro racconta un passo dopo l'altro fino a `λ = 1`. Una corsa che
    arriva qui con meno di così è arrivata con `esito: ok` e i recorder pieni: senza questo
    verdetto l'ultimo stato convergente si leggerebbe come il risultato del carico intero.
    La corsa elastica non ha scala né passi: `non_applicabile`, che non è né verde né rosso.
    """
    if d.legami != "fibre":
        return non_applicabile("convergenza", "corsa elastica: il carico si applica in un passo "
                               "solo, senza passi né scala di algoritmi", caso)
    passi = [(int(k), alg, float(lam)) for c, k, alg, lam in _RIGA_PASSO.findall(registro) if c == caso]
    fattore = passi[-1][2] if passi else 0.0
    c = {"passato": bool(passi) and fattore >= 1.0 - 1e-6,
         "passi": len(passi), "passi_dichiarati": d.passi, "fattore": fattore,
         # per passo, non l'insieme: «quali algoritmi» non dice **dove** la scala è servita
         "algoritmi": [alg for _, alg, _ in passi]}
    scesi = [str(k) for k, alg, _ in passi if alg != _deck.SCALA_ALGORITMI[0]]
    return verdetto("convergenza", c, caso,
                    f"{len(passi)} passi su {d.passi} dichiarati, fattore λ = {fattore:.6g}"
                    + (f"; scala di algoritmi ai passi {', '.join(scesi)}" if scesi
                       else "; Newton a ogni passo"))


def _verdetti_modali(modi: list[dict], direzioni: tuple[str, ...]) -> list[dict]:
    """`autovalori` e `massa_modale` quando il modello dichiara un'analisi modale.

    Senza direzioni con massa i due verdetti non si applicano: «le frequenze sono sane?» e
    «i modi bastano?» non hanno risposta su una struttura che non ha una traslazione libera
    da muovere, e un rosso direbbe che qualcosa è andato storto quando non c'era niente da fare.

    `disponibile` vale 100 sulle sole direzioni con massa e 0 sulle altre: `controlla_massa_modale`
    mette a `None` la direzione con totale nullo e non la conta (`solve.py`, «massa disponibile
    nulla in una direzione»). È così che un telaio piano non viene bocciato per una direzione
    in cui è incastrato ovunque.
    """
    if not direzioni:
        return [non_applicabile(x, "nessuna traslazione libera con massa: niente da estrarre")
                for x in ("autovalori", "massa_modale")]
    autovalori = solve.controlla_autovalori([x["f"] for x in modi])
    prima = autovalori.get("prima_frequenza_hz")
    v = [verdetto("autovalori", autovalori, ragione=(
        f"prima frequenza {'assente' if prima is None else format(prima, '.6g') + ' Hz'} "
        f"su {len(modi)} modi estratti"))]
    if modi:
        cumulata = modi[-1]["cumulata"]
        masse = {"catturata": [100.0 * cumulata[x] for x in "xyz"] + [0.0] * 3,
                 "disponibile": [100.0 if x in direzioni else 0.0 for x in "xyz"] + [0.0] * 3}
        ragione = ("cumulata " + ", ".join(f"{x} {cumulata[x]:.4g}" for x in direzioni)
                   + f" sulle direzioni con massa {', '.join(direzioni)}")
    else:
        masse, ragione = None, "nessun modo estratto: la massa partecipante non è verificata"
    v.append(verdetto("massa_modale", solve.controlla_massa_modale(masse, soglia=modale.SOGLIA_MASSA),
                       ragione=ragione))
    return v


def controlli(d: _deck.Deck, per_caso: dict, registro: str, modi: list[dict] | None = None,
              direzioni: tuple[str, ...] = ()) -> list[dict]:
    """I sette controlli di solve.py riletti nel verdetto a tre valori: uno per caso dove il caso conta.

    `modi` a `None` è la corsa senza passo modale, e i due verdetti modali restano
    `non_applicabile`; la lista vuota è il passo modale che non ha estratto niente, che è
    un rosso.
    """
    v: list[dict] = []
    dimensione = float(np.linalg.norm(np.ptp(np.array(list(d.nodi.values())), axis=0)))
    for caso, dati in per_caso.items():
        # i `None` della composizione tornano `nan`: un numero guasto deve **fallire** il controllo
        reazioni = {int(k): tuple(_reale(y) for y in x[:3]) for k, x in dati["reazioni"].items()}
        atteso = tuple(-x for x in d.carico_totale[caso])
        c = solve.controlla_reazioni(reazioni, atteso, solve._TOLLERANZA_REAZIONI)
        v.append(verdetto("reazioni", c, caso,
                           f"Σ reazioni {c['somma']} contro Σ carichi {atteso}, scarto {c['scarto_relativo']}"))
        # nessuno spostamento non è uno spostamento nullo: `None` dichiara «non verificato»
        u_max = max((float(np.linalg.norm([_reale(y) for y in x[:3]]))
                     for x in dati["spostamenti"].values()), default=None)
        c = solve.controlla_spostamenti(u_max, dimensione)
        v.append(verdetto("spostamenti", c, caso,
                           f"u_max = {'assente' if u_max is None else format(u_max, '.6g')} mm "
                           f"su {dimensione:.6g} mm"))
        v.append(_verdetto_convergenza(d, caso, registro))
    n = opensees.conta_avvisi(registro)
    v.append(verdetto("avvisi", solve.controlla_avvisi(n), None, f"{n} WARNING nel registro"))
    # `esito_non_applicabile` rende `None` dove il controllo **varrebbe** sul telaio (autovalori e
    # massa modale): senza analisi modale in questa corsa, il verdetto lo dice qui.
    if modi is None:
        modali = (("autovalori", "nessuna analisi modale in questa corsa"),
                  ("massa_modale", "nessuna analisi modale in questa corsa"))
    else:
        modali = ()
        v += _verdetti_modali(modi, direzioni)
    for controllo, ragione in (*modali,
                               ("picco", "non calcolato in una corsa statica"),
                               ("vincolo_in_pianta", "non calcolato in una corsa statica")):
        c = solve.esito_non_applicabile(controllo, "telaio")
        v.append(verdetto(controllo, c) if c else non_applicabile(controllo, ragione))
    return v
