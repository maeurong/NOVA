"""La modale: legge `modalProperties` e le forme, decide quando i modi bastano (C2).

Formato di `massa_modale.out` **misurato il 05/09/2026** su OpenSees 3.8.0, telaio 2×1 con
tre modi (`tests/fixture/massa_modale_telaio_2x1.out` è quel file, verbatim). Il rapporto
porta dieci blocchi numerati; questo modulo ne legge tre:

    * 2. EIGENVALUE ANALYSIS:
    #          MODE        LAMBDA         OMEGA     FREQUENCY        PERIOD
                  1       1327.27       36.4317       5.79829      0.172465
    * 9. MODAL PARTICIPATION MASS RATIOS (%):
    #          MODE            MX            MY            MZ           RMX           RMY           RMZ
                  1             0       99.4517             0             0             0     0.0260106
    * 10. MODAL PARTICIPATION MASS RATIOS (%) (cumulative):
    #          MODE            MX            MY            MZ           RMX           RMY           RMZ
                  3        99.999       99.4588   1.52392e-05             0    0.00083455       98.8938

Gli altri sette (DOMAIN SIZE, TOTAL MASS, TOTAL FREE MASS, CENTER OF MASS, PARTICIPATION
FACTORS, PARTICIPATION MASSES e il loro cumulato) non servono al verdetto e non si leggono.
Le righe di dati hanno sette campi e cominciano col numero del modo; le intestazioni
cominciano per `#` o per `*`, ed è così che i blocchi si separano.

I ratios sono in **percento** nel file e in **frazione 0–1** qui: la soglia di NTC è 0,85 e
un verdetto che confronta 85 con 0,85 è il difetto che questa conversione chiude in un punto.
"""
from __future__ import annotations

from pathlib import Path

from meshrec.core import opensees
from nova.modello import Modello

SOGLIA_MASSA = 0.85          # NTC 2018 §7.3.3.1 (la copia di MeshRec usa 0,90: EC8)
SCALA_MODI = (3, 6, 12, 24, 48)
_INTESTAZIONE_PER_MODO = "MASS RATIOS (%)"           # senza «(cumulative)»
_INTESTAZIONE_CUMULATA = opensees._INTESTAZIONE_CUMULATA


def _blocco(percorso: Path, intestazione: str, escludi: str | None = None) -> list[list[float]]:
    """Le righe numeriche (7 campi, il primo intero) sotto `intestazione`, fino alla prima
    riga non numerica. `escludi` distingue il blocco per modo da quello cumulato, che
    portano la stessa intestazione con un suffisso in più."""
    righe: list[list[float]] = []
    dentro = False
    for riga in percorso.read_text(encoding="ascii", errors="ignore").splitlines():
        if intestazione in riga and (escludi is None or escludi not in riga):
            dentro, righe = True, []
            continue
        if not dentro:
            continue
        campi = riga.split()
        if len(campi) != 7 or not campi[0].isdigit():
            if righe:
                dentro = False
            continue
        righe.append([float(c) for c in campi[1:]])
    return righe


def leggi(cartella: Path, modi: int, tag_a_id: dict[int, int], n_nodi: int | None = None) -> list[dict]:
    """I modi letti dalla cartella: frequenze da `leggi_frequenze`, masse per modo e cumulate
    dai due blocchi di `modalProperties`, forme da `modo_k.out` (3 valori per nodo, `-unorm`).

    `n_nodi` è il conteggio dei nodi del **deck**, che con le aste suddivise è più grande di
    `len(tag_a_id)`: il registratore scrive `-nodeRange 1 n_nodi`, e contare i nodi del
    modello accuserebbe di troncamento un file sano. La `forma` resta sui soli nodi del
    modello, che sono quelli che l'utente ha disegnato.

    Il file assente **solleva**: è una corsa che non ha scritto, e `corsa.esegui` la rende
    «errore fase solutore». Il file presente senza blocco cumulato rende invece la lista
    vuota: il passo modale c'è stato e non ha estratto niente, che è un'altra cosa.
    """
    cartella = Path(cartella)
    f_file = cartella / opensees.NOME_MASSA_MODALE
    if not f_file.is_file():
        raise FileNotFoundError(f"{f_file}: il passo modale non ha scritto "
                                f"{opensees.NOME_MASSA_MODALE}")
    frequenze = opensees.leggi_frequenze(f_file)
    per_modo = _blocco(f_file, _INTESTAZIONE_PER_MODO, escludi="cumulative")
    cumulate = _blocco(f_file, _INTESTAZIONE_CUMULATA)
    n = min(len(frequenze), len(per_modo), len(cumulate), modi)
    if n_nodi is None:
        n_nodi = len(tag_a_id)
    modi_letti: list[dict] = []
    for k in range(1, n + 1):
        forma = opensees._ultima_riga(cartella / f"modo_{k}.out", 3 * n_nodi).reshape(n_nodi, 3)
        f = frequenze[k - 1]
        modi_letti.append({
            "n": k, "f": f, "T": (1.0 / f) if f > 0 else None,
            "forma": {str(tag_a_id[t]): [float(x) for x in forma[t - 1]] for t in tag_a_id},
            "massa_partecipante": dict(zip("xyz", (v / 100.0 for v in per_modo[k - 1][:3]))),
            "cumulata": dict(zip("xyz", (v / 100.0 for v in cumulate[k - 1][:3]))),
        })
    return modi_letti


def direzioni_con_massa(m: Modello) -> tuple[str, ...]:
    """Le direzioni in cui almeno un nodo ha il grado traslazionale libero.

    Una direzione bloccata ovunque non ha massa da catturare, e chiederle l'85 % vorrebbe
    dire bocciare ogni telaio piano modellato in tre dimensioni.
    """
    libere = []
    for i, nome in enumerate("xyz"):
        if any(n.vincolo is None or not n.vincolo.gradi()[i] for n in m.nodi):
            libere.append(nome)
    return tuple(libere)


def abbastanza(modi: list[dict], direzioni) -> bool:
    if not modi:
        return False
    ultima = modi[-1]["cumulata"]
    return all(ultima[d] >= SOGLIA_MASSA for d in direzioni)


def gradi_liberi(m: Modello) -> int:
    """Tetto dei modi estraibili: i gradi traslazionali liberi (una massa lumped per direzione).

    Misurato il 05/09/2026 su OpenSees 3.8.0, telaio 2×1: `eigen -fullGenLapack 9` (nove
    traslazioni libere) rende nove modi, `12` fa uscire il processo con segnale 11. La
    massa lumped di `forceBeamColumn -mass` sta sulle sole traslazioni, quindi il numero di
    modi che il problema generalizzato porta è quello, non i sei gradi per nodo.

    Conta i soli nodi del modello: i nodi che le suddivisioni aggiungono portano massa
    anche loro, quindi il tetto vero è più alto e questo resta dalla parte prudente.
    """
    return sum(3 if n.vincolo is None else sum(1 for g in n.vincolo.gradi()[:3] if not g)
               for n in m.nodi)


def analisi(m: Modello):
    """L'analisi modale del modello, se c'è. Al più una: `deck.scrivi` rifiuta le altre."""
    return next((a for a in m.analisi if a.tipo == "modale"), None)


def modi_dichiarati(m: Modello) -> int | None:
    """I modi che il deck scrive quando nessuno li impone: `None` senza analisi modale, il
    numero chiesto se è un numero, il primo gradino della scala se è «auto».

    «auto» è un ciclo, e un ciclo il deck non lo sa fare: chi lo guida è `corsa.esegui`, che
    passa il tentativo di turno. Il comando `deck` da solo scrive il primo gradino, che è
    l'anteprima onesta di quel che la corsa farebbe per prima cosa.
    """
    an = analisi(m)
    if an is None:
        return None
    return an.modi if isinstance(an.modi, int) else SCALA_MODI[0]
