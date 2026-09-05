# NOVA — Nonlinear OpenSees Visualization & Analysis

Software di modellazione e analisi strutturale per telai in cemento armato, con
[OpenSees](https://opensees.berkeley.edu/) come solutore e le verifiche a
NTC 2018. Applicazione locale, per macOS e Windows.

## Stato al 05/09/2026

**Lo scaffold è presente.** Pacchetto `nova` installabile, copie verbatim di
MeshRec in `meshrec/core/` con impronta sha256 verificata da test
(`meshrec/IMPRONTE.md`). Test: `uv run pytest`.

Avvio: `uv run python -m nova` apre il server locale e il browser su
`http://127.0.0.1:8765/`. Porta e solutore si scelgono con `--porta`/`NOVA_PORTA`
e `--solutore`; nessuno dei due arriva mai dalla richiesta HTTP.

Tre fatti sono già stabiliti dalla ricerca, misurati e non opinabili:

- **Il solutore vive fuori processo.** Un errore di modello banale — due nodi
  coincidenti — termina il processo Python che ospita OpenSees, senza eccezione
  e con codice d'uscita 0. Misurato su `openseespy` 3.8.0.0
  (`docs/ricerca/01-opensees-integrazione.md`, §2).
- **La licenza di OpenSees/OpenSeesPy va chiusa prima del codice.** Il file
  `COPYRIGHT` del repository e la documentazione ufficiale non coincidono; la
  ruota OpenSeesPy vieta la redistribuzione commerciale senza licenza
  (`docs/ricerca/01-opensees-integrazione.md`, §3).
- **Circa 2.300 righe sono già scritte e testate** (misurate il 04/09/2026:
  1037+452+308+530), nella cronologia di MeshRec a `9716f6e`: scrittura del
  modello a fibre per OpenSees, telaio dal prior geometrico, collocazione
  delle armature, combinazioni NTC
  (`docs/ricerca/05-archeologia-linea-integrata.md`, §7).

## Il non lineare

I legami vengono dalla **classe** del materiale e dalla **veste**
(`impostazioni_analisi.veste`, default `media`), non da numeri scritti a mano:
`Concrete02` per nucleo e copriferro, `Steel02` per le barre, con il
confinamento NTC [4.1.8]–[4.1.12.i] di default e Mander opzionale
(→ `Concrete04`). Ogni parametro che finisce nel `.tcl` è stampato in
`run.materiali` con la sua provenienza (`classe`, `veste`, `articolo`): il deck
non porta un numero che il resoconto non dichiari. La veste `progetto` è
ammessa e produce un **avviso**, non un rifiuto («rigidezza dimezzata, non è la
prassi»).

Una statica dichiarata `legami: fibre` monta sezioni a fibre a due `patch`
(nucleo entro la linea media delle staffe, copriferro fuori) e applica il carico
in `passi` incrementi con una scala di algoritmi. La scelta è **del deck** e non
del caso: i tag di sezione sono uno per (sezione, orientamento), quindi un
modello con una statica a fibre ha il deck a fibre per **tutti** i suoi casi.

`AnalisiPushover` spinge un nodo di controllo lungo un dof in controllo di
spostamento (`DisplacementControl`), con il caso di gravità applicato prima e
tenuto addosso (`loadConst -time 0.0`). Rende la curva in `passi[]`
— spostamento, taglio alla base, spostamenti di tutti i nodi, algoritmo — e lo
**stato delle sezioni** per stazione su due canali: calcestruzzo
(`elastica`/`fessurata`/`schiacciata`) e acciaio
(`elastica`/`snervata`/`rotta`), `null` dove le barre non ci sono.

**La caduta si dichiara, non si traveste da collasso.** Quando la scala di
algoritmi e gli otto dimezzamenti del passo non bastano, la corsa scrive
`caduta: {passo, spostamento, algoritmo, motivo}`, tiene la curva fino
all'ultimo passo convergente e mette `convergenza: non_passato`. Una pushover
che arriva allo spostamento chiesto ha `caduta: null`.

Contratto del JSON, per chi lo legge: `passi[].spostamento` e
`caduta.spostamento` sono **relativi** a `run.pushover.u0` (lo spostamento che
il nodo di controllo aveva dopo la gravità), `passi[].spostamenti[nodo]` sono
**assoluti**. I verdetti si leggono per la coppia `(controllo, caso)`: una corsa
con statica a fibre e pushover porta due `convergenza` e due `spostamenti`, e
il `caso` (`"Z1"`, `"pushover"`) è quel che li distingue.

Nessun campionamento e nessun tetto ai file: la pushover del telaio 2×1 a
60 passi fa 192 kB di JSON e 231 file `.out`, quella del MURO 1 a 120 passi
774 kB e 514 file. `/api/risultati/{run_id}` rende il file intero.

Due misure che vale la pena conoscere prima di leggere i numeri:

- **#25 — il ramo elastico itera.** `algorithm Linear` su un telaio iperstatico
  con `eleLoad -beamUniform` su `forceBeamColumn` non chiude l'equilibrio: gli
  spostamenti elastici erano sbagliati fino a `+45,8 %` su un caso del telaio
  2×1. Con `Newton` lo scarto elastico ↔ fibre scende a `+0,03 %`. Gli
  spostamenti pubblicati prima del fix non sono confrontabili con quelli di oggi
  (reazioni e frequenze non cambiano: quelle le porta il carico, non
  l'algoritmo).
- **#26 — lo spostamento si misura sulla luce.** Un modello convergente può
  essere assurdo: la trave di 6 000 mm che scende di 3 769 passava il controllo
  di T1, che guarda la diagonale del modello. Ora `spostamenti` guarda anche il
  rapporto con la luce dell'asta più corta al nodo: oltre 1/10 è rosso, fra 1/50
  e 1/10 è verde con un avviso.

Caso studio con la pushover vera, curva e stato delle sezioni:
[`docs/caso-studio/README.md`](docs/caso-studio/README.md).

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

NOVA è rilasciato sotto licenza [MIT](LICENSE). OpenSees non è incluso: NOVA lo
cerca sul sistema e, se manca, dice dove trovarlo. OpenSees resta sotto i
termini dei Regents of the University of California (gratuito per uso di
ricerca, didattico e interno; vedi `docs/ricerca/01-opensees-integrazione.md`
§3).
