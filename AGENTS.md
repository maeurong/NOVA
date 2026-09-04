# AGENTS.md

Istruzioni per chi lavora su NOVA (Nonlinear OpenSees Visualization & Analysis)
con un agente di codice.

## Cos'è e in che fase è

Software di modellazione e analisi strutturale per telai in cemento armato:
OpenSees come solutore, verifiche a NTC 2018, applicazione locale per macOS e
Windows. Completa il lato analisi di MeshRec (`~/GitHub/Tesi`), che si chiude al
deck `.inp`.

Il progetto attraversa tre fasi in sequenza. Al 05/09/2026 tutte e tre sono
chiuse:

1. **Ricerca** — chiusa il 04/09/2026. Otto report in `docs/ricerca/`, sintesi
   in `docs/ricerca/README.md`.
2. **Brainstorming** — chiuso. Le diciassette domande aperte di
   `docs/ricerca/README.md` §3 hanno prodotto le decisioni di prodotto.
3. **Spec** — chiusa il 05/09/2026:
   `docs/superpowers/specs/2026-09-05-nova-v1-design.md`.

Il codice si scrive dai piani in `docs/superpowers/plans/`, uno per task.

## Cosa NON fare adesso

- **Nessun codice fuori da un piano.** La spec è approvata, il codice si scrive
  dai piani in `docs/superpowers/plans/`, non a memoria. Un prototipo
  usa-e-getta per rispondere a una domanda di design è ammesso solo se
  dichiarato tale e non committato.
- **Nessuna modifica a `~/GitHub/Tesi`.** Il repository della tesi è in sola
  lettura da qui. Il codice riusabile si legge dalla sua cronologia git (vedi
  sotto), non si edita e non si copia in blocco.
- **Nessuna decisione di prodotto presa a memoria.** Perimetro, utenti,
  ingresso del modello, verifiche v1, relazione di calcolo, norma, licenze,
  stack, UX: sono le diciassette domande di `docs/ricerca/README.md` §3, e le
  chiude Mario nel brainstorming. Se un task le presuppone decise, fermati e
  chiedi. Le raccomandazioni in §4 dello stesso file sono raccomandazioni, non
  decisioni: ciascuna è marcata «non decisioni» nel report che la produce.
- **ADR solo per decisioni difficili da invertire**, in `docs/adr/`. Non ogni
  decisione ne merita uno.

## Vincoli già noti e misurati

Questi non si riaprono nel brainstorming: sono fatti misurati, non opinioni.

- **Il solutore vive fuori processo.** `openseespy` 3.8.0.0: `forceBeamColumn`
  fra due nodi coincidenti termina il processo Python con exit 0 e nessuna
  eccezione; `elasticBeamColumn` idem con exit 255; oltre 2.000 chiamate a
  `exit()` nel sorgente di OpenSees. Un errore di modello banale uccide il
  processo host. Fonte: `docs/ricerca/01-opensees-integrazione.md` §2. La
  linea rimossa di MeshRec aveva preso la stessa decisione (#139, 28-29/08)
  per lo stesso motivo: `docs/ricerca/05-archeologia-linea-integrata.md` §2.
- **La licenza di OpenSees/OpenSeesPy è aperta e si chiude prima del codice.**
  Il file `COPYRIGHT` del repository OpenSees (noncommerciale/interno) e
  `developer/license.rst` (BSD-like, «if you sell») non coincidono; la ruota
  OpenSeesPy dice «Commercial redistribution […] requires a license». Fonte:
  `docs/ricerca/01-opensees-integrazione.md` §3, testi verbatim. Fino alla
  decisione: non ridistribuire la ruota.
- **Il codice riusabile sta a `9716f6e` di Tesi.** Ultimo commit con la linea
  analisi integrata presente, prima della rimozione del 02/09/2026. Si legge
  così, senza checkout e senza toccare il working tree:

  ```bash
  git -C /Users/mario/GitHub/Tesi show 9716f6e:meshrec/src/meshrec/core/opensees.py
  git -C /Users/mario/GitHub/Tesi show 9716f6e:meshrec/src/meshrec/core/telaio.py
  git -C /Users/mario/GitHub/Tesi show 9716f6e:meshrec/src/meshrec/core/armatura.py
  git -C /Users/mario/GitHub/Tesi show 9716f6e:meshrec/src/meshrec/core/combinazioni.py
  ```

  Righe misurate il 04/09/2026: 1037, 452, 308, 530. Inventario, firme
  pubbliche, cosa è riusabile e cosa l'autore stesso marca «non deciso»:
  `docs/ricerca/05-archeologia-linea-integrata.md` §1, §2, §4, §7.
- **OpenSees è installato** (`~/.local/bin/OpenSees`, 3.8.0, misurato il
  05/09/2026). I test sul binario vero possono girare.

## Regola di casa, ereditata da MeshRec

**Ogni numero che il programma mostra ha un controllo che lo contraddice se il
risultato peggiora.** Una misura senza il suo controllo non è finita. Vale per
l'interfaccia quanto per il core: mostrare una grandezza è già sembrare di
averla verificata. Viene da `~/GitHub/Tesi/PRODUCT.md` (principio 1) e ha già
trovato difetti veri lì.

Un corollario che la ricerca ha già reso concreto: **non applicabile non è
non passato.** Un controllo che non vale per un modello (`applicabile: False`)
non è mai verde e non è mai rosso; è una terza cosa e va mostrata come tale
(`05-*.md` §3).

## Convenzioni

- **Lingua: italiano**, in documenti, commenti, messaggi di commit, interfaccia.
  Gli identificatori tecnici restano come sono (vedi `CONTEXT.md`, «Da
  preservare alla lettera»).
- **Tag di provenienza** in ogni documento che afferma qualcosa: **[V]**
  verificato su fonte primaria · **[M]** misurato in sessione con comando ·
  **[INF]** inferenza · **[NON TROVATO]**. Un'affermazione senza tag è
  un'affermazione da verificare.
- **Notazione numerica italiana**: la virgola separa i decimali, sempre; il
  punto separa le migliaia o le migliaia non si separano. Tre esenzioni:
  citazioni verbatim, numeri che sono nomi (sezioni di norma, versioni, DOI),
  blocchi di codice. Regola completa:
  `~/GitHub/Tesi/docs/validazione/README.md` §«Notazione numerica».
- **Commit** in italiano, formato Conventional Commits: il soggetto dice cosa
  cambia, il corpo — quando serve — dice perché.
- **Rami** da `main` con prefisso `feat/`, `fix/`, `docs/`, `chore/` e uno slug
  che dica la cosa. **Pull request** verso `main`.
- **Unità**: mm, N, MPa, tonnellata, secondo, dichiarate in un solo punto —
  come in MeshRec. Da confermare al brainstorming se il nuovo progetto
  eredita le stesse.

## Come citare le ricerche

Gli otto report sono la fonte di ogni affermazione sul dominio, sul mercato,
sullo stack e sulla UX finché il brainstorming non produce decisioni. Si citano
per file e sezione: `docs/ricerca/06-dominio-analisi-verifiche-formati.md` §2.
Se un'affermazione non sta in nessuno degli otto, non è stabilita: si scrive che
non è decisa, o si dispaccia un `researcher` mirato.

Le ricerche si contraddicono in sei punti (soglia di massa partecipante 85 %
NTC vs 90 % EC8, openseespy vs xara, Tcl vs openseespy, Python 3.12, riuso di
opstool, licenza OpenSees): la tabella in `docs/ricerca/README.md` §2 dice
quale versione vale e perché. Non citare la versione perdente.

## Struttura delle cartelle

Attuale:

```
.
├── README.md        cos'è, stato, dove guardare
├── CLAUDE.md        rimanda a questo file
├── AGENTS.md        questo file
├── CONTEXT.md       glossario del dominio
├── PRODUCT.md       bozza di prodotto, schema impeccable
├── pyproject.toml   pacchetto nova, dipendenze, config pytest
├── nova/            codice del prodotto
├── meshrec/         copie verbatim da MeshRec (Tesi@9716f6e), impronte in IMPRONTE.md
├── tests/           test pytest
└── docs/
    ├── README.md            indice di docs/
    ├── ricerca/             otto report + sintesi, chiusi il 04/09/2026
    ├── adr/                 decisioni architetturali difficili da invertire
    └── superpowers/
        ├── specs/           spec di design
        └── plans/           piani di esecuzione, uno per task
```

## Grafo di conoscenza (graphify)

Il repository ha un grafo in `graphify-out/` (non versionato, si rigenera),
costruito il 04/09/2026 sulle otto ricerche e sui file di base: 558 nodi,
1082 archi, 33 comunità etichettate. Serve a orientarsi senza rileggere 40 000
parole.

- Prima di grep sui documenti: `graphify query "<domanda>"`; per una relazione
  fra due concetti `graphify path "<A>" "<B>"`; per un concetto
  `graphify explain "<concetto>"`. Panoramica: `graphify-out/GRAPH_REPORT.md`.
- **Freschezza, vincolante**: dopo aver modificato o aggiunto documenti,
  `/graphify --update` prima di chiudere la sessione — non `graphify update .`
  da riga di comando (le due vie tengono contabilità diverse, vedi
  `~/CLAUDE.md`). Un grafo scaduto è falso in silenzio.
- Il grafo non contiene codice perché non esiste codice. Quando arriverà, la
  parte AST è gratuita; i documenti costano estrazione semantica.

## Agent skills

### Issue tracker

GitHub Issues su `maeurong/NOVA`, via `gh`; la mappa wayfinder e i suoi ticket
vivono lì. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context: `CONTEXT.md` alla radice, ADR in `docs/adr/` quando arriverà la
prima decisione. See `docs/agents/domain.md`.

## Roster e ciclo di sviluppo

Il roster dei subagenti, il ciclo di sviluppo e le sue regole vincolanti sono in
`~/CLAUDE.md` e nella skill `dev-workflow`. Non si duplicano qui.
