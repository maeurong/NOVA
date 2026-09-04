# NOVA — Nonlinear OpenSees Visualization & Analysis

Software di modellazione e analisi strutturale per telai in cemento armato, con
[OpenSees](https://opensees.berkeley.edu/) come solutore e le verifiche a
NTC 2018. Applicazione locale, per macOS e Windows.

## Stato al 04/09/2026

**Non esiste codice.** Esiste una ricerca preliminare, chiusa il 04/09/2026, e
nient'altro. Il brainstorming di prodotto non è ancora stato fatto: nessuna
decisione su perimetro, utenti, stack, licenza o nome è stata presa. Le
diciassette domande che il brainstorming deve chiudere stanno in
[`docs/ricerca/README.md`](docs/ricerca/README.md), §3.

Tre fatti sono già stabiliti dalla ricerca, misurati e non opinabili:

- **Il solutore vive fuori processo.** Un errore di modello banale — due nodi
  coincidenti — termina il processo Python che ospita OpenSees, senza eccezione
  e con codice d'uscita 0. Misurato su `openseespy` 3.8.0.0
  (`docs/ricerca/01-opensees-integrazione.md`, §2).
- **La licenza di OpenSees/OpenSeesPy va chiusa prima del codice.** Il file
  `COPYRIGHT` del repository e la documentazione ufficiale non coincidono; la
  ruota OpenSeesPy vieta la redistribuzione commerciale senza licenza
  (`docs/ricerca/01-opensees-integrazione.md`, §3).
- **Circa 1.500 righe sono già scritte e testate**, nella cronologia di MeshRec
  a `9716f6e`: scrittura del modello a fibre per OpenSees, telaio dal prior
  geometrico, collocazione delle armature, combinazioni NTC
  (`docs/ricerca/05-archeologia-linea-integrata.md`, §7).

## A chi serve

L'utente primario è l'autore, ingegnere strutturale. Chi altro lo userà non è
deciso. Il contesto d'uso è locale e a utente singolo, come per MeshRec.

## Relazione con MeshRec

MeshRec (`~/GitHub/Tesi`) porta un rilievo
fotogrammetrico di una struttura in c.a. fino a un deck `.inp` e si ferma lì per
scelta di prodotto. Questo progetto ne completa il lato analisi: prende un
telaio — dal prior geometrico di MeshRec, o costruito da zero, o entrambi: non è
deciso — lo analizza con OpenSees e lo verifica a norma.

Non sostituisce MeshRec e non lo riscrive. `~/GitHub/Tesi` non si tocca da qui:
il codice riusabile si legge dalla sua cronologia git, non si modifica.

## Dove guardare

- [`docs/ricerca/README.md`](docs/ricerca/README.md) — sintesi delle otto
  ricerche: cosa dicono insieme, dove si contraddicono, le diciassette domande
  aperte, le raccomandazioni convergenti. Si parte da qui.
- [`docs/ricerca/01-*.md` … `08-*.md`](docs/ricerca/) — gli otto report, con i
  numeri e le fonti.
- [`CONTEXT.md`](CONTEXT.md) — glossario del dominio: i termini che il progetto
  usa e le distinzioni che contano.
- [`PRODUCT.md`](PRODUCT.md) — bozza di prodotto; i campi non ancora decisi sono
  marcati come tali.

## Come si contribuisce

Vedi [`AGENTS.md`](AGENTS.md): stato e fase del progetto, cosa non fare adesso,
vincoli, convenzioni.

## Licenza

**Non decisa.** La scelta è una delle domande aperte del brainstorming
(`docs/ricerca/README.md`, §3, domanda 9) e dipende anche dalla licenza di
OpenSees (domanda 8). Fino ad allora nessun file di questo repository dichiara
una licenza.
