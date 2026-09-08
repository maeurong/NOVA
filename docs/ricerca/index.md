# Ricerche — indice

Una riga per ricerca: la domanda che copre, lo stato, la data. È l'unico punto
d'ingresso: `architect` annota i piani citando `docs/ricerca/<file>.md:<riga>`, e in
questo repo l'hook `dispatch-gate.py` nega un brief di dispatch che non cita una
ricerca né dichiara `- nessun riferimento pertinente`. La sintesi ragionata delle prime
sette sta in [`README.md`](README.md); i tag `[V]/[M]/[INF]/[NON TROVATO]` valgono in
tutti i file; le pagine citate `[V]` dalle ricerche 10-15 sono salvate in
[`fonti/`](fonti/) con il loro sidecar di provenienza, le misure in [`misure/`](misure/).

| ricerca | domanda che copre | stato | data |
|---|---|---|---|
| [`01-opensees-integrazione.md`](01-opensees-integrazione.md) | Per quale via integrare OpenSees (openseespy, Tcl, xara, CMake, SP/MP), su quali piattaforme, e come fallisce il solutore | fatta | 04/09/2026 |
| [`02-panorama-software.md`](02-panorama-software.md) | Che cosa esiste già, cosa fa bene, dove sta il vuoto che un nuovo modellatore OpenSees con UI pulita e verifiche NTC 2018 andrebbe a riempire | fatta | 04/09/2026 |
| [`03-stack-tecnico.md`](03-stack-tecnico.md) | Con quale stack costruire un'app locale di modellazione e analisi con OpenSees: shell, viewport 3D, ponte solutore, firma e distribuzione | fatta | 04/09/2026 |
| [`04-funzioni-intelligenti.md`](04-funzioni-intelligenti.md) | Che cosa può voler dire «intelligente» in un modellatore strutturale con solutore OpenSees, con evidenze | fatta | 04/09/2026 |
| [`05-archeologia-linea-integrata.md`](05-archeologia-linea-integrata.md) | Che cosa la linea rimossa da MeshRec aveva già costruito, cosa funzionava, perché è stata dismessa, cosa è riusabile | fatta | 04/09/2026 |
| [`06-dominio-analisi-verifiche-formati.md`](06-dominio-analisi-verifiche-formati.md) | Quali analisi e verifiche un modellatore per telai in c.a. a NTC 2018 deve offrire, come entra ed esce un modello, cosa serve al caso studio | fatta | 04/09/2026 |
| [`07-ux-modellatore.md`](07-ux-modellatore.md) | Punti di dolore documentati del flusso di lavoro dell'ingegnere, pattern di interazione eccellenti, risultati strutturali come UX | fatta | 04/09/2026 |
| [`08-modelli-dati-riferimento.md`](08-modelli-dati-riferimento.md) | Come i formati e i progetti di riferimento rappresentano nodi, aste, sezioni, armature, carichi, combinazioni e risultati, e cosa insegnano | fatta | 04/09/2026 |
| [`09-legami-costitutivi-ntc.md`](09-legami-costitutivi-ntc.md) | Come si derivano i parametri di `Concrete02` e `Steel02` da una classe NTC (C25/30, B450C) e dalle staffe, e con quale veste per l'utente | fatta | 05/09/2026 |
| [`10-model-updating.md`](10-model-updating.md) | Quali metodi di model updating di un telaio in c.a. funzionano con poche frequenze e forme modali sperimentali (ticket #33) | fatta | 08/09/2026 |
| [`11-modi-sulla-tangente-opensees.md`](11-modi-sulla-tangente-opensees.md) | Come si calcolano i modi sulla rigidezza tangente dopo la pushover in OpenSees, e cosa misurano (ticket #34) | fatta | 08/09/2026 |
| [`12-solido-non-lineare.md`](12-solido-non-lineare.md) | Con quale solutore e quale legame si fa la pushover di un solido di c.a. da sovrapporre alla curva del telaio a fibre (ticket #35) | fatta | 08/09/2026 |
| [`13-solido-calculix.md`](13-solido-calculix.md) | Come NOVA pilota il solido lineare in CalculiX: carte, formati, sorgente 2.22 (ticket #36) | fatta | 08/09/2026 |
| [`14-studio-italiano.md`](14-studio-italiano.md) | Cosa serve a uno studio italiano: combinazioni NTC, verifiche c.a., relazione di calcolo §10.2.1, SAF (ticket #37) | fatta | 08/09/2026 |
| [`15-desktop-macos.md`](15-desktop-macos.md) | Finestra nativa, installer, firma e notarizzazione su macOS (ticket #38) | fatta | 08/09/2026 |

Le ricerche 10-15 nascono con il criterio a tre campi per riferimento (URL · perché
conta qui · cosa se ne prende); le 01-09 lo precedono e ricevono il campo in una
sezione «Cosa se ne prende» in coda a ciascuna. Una ricerca nuova aggiunge qui la
propria riga.

## Riferimenti da usare

Decisi da Mario l'08/09/2026: raccomandati dalle ricerche e mai ripresi a valle, entrano qui
come riferimenti che il primo piano su verifiche o validazione deve citare. Stessa forma a
tre campi; il dettaglio sta nelle ricerche, alle righe indicate.

- **URL** https://github.com/fib-international/structuralcodes · [V] sorgente letto — `14-studio-italiano.md:328-346`, `:652-664`; `06-dominio-analisi-verifiche-formati.md:63`, `:153`
  **perché conta qui** nessuna libreria PyPI implementa le NTC 2018 [NON TROVATO]; le formule NTC del taglio e della fessurazione sono le stesse di EN 1992-1-1 con i parametri dell'Appendice Nazionale gia' nel testo, e `structuralcodes` (fib, Apache-2.0, EC2-2004) e' l'unica libreria viva con Eurocodice e provenienza normativa
  **cosa se ne prende** il motore per M-N, M-χ, domini d'interazione, taglio e fessurazione — **come motore, non come autorita' normativa**: `alpha_cc=0.85` passato esplicitamente ovunque con un test che fallisce se manca (default 1,0 → f_cd del 17,6 % piu' alta); un guscio NTC sottile che possiede cio' che nessuna libreria ha (Tab. 4.1.IV, `[4.1.15]`-`[4.1.17]`, `[4.1.45]`/`[4.1.46]`, h/200 ≥ 20 mm, verdetti a tre valori); ogni funzione del guscio con l'articolo nel nome o nel docstring; `VRds` provata sul bordo 21,8°-45°

- **URL** https://doi.org/10.1016/j.dib.2017.12.015 · [V] — Morandi, Hak, Magenes 2018, *Data in Brief* 16:886-904, CC BY 4.0 — `06-dominio-analisi-verifiche-formati.md:126`, `:155`
  **perché conta qui** un telaio in c.a. monopiano monocampata in scala reale provato ciclicamente, stessa tipologia di NOVA: la configurazione TNT (telaio nudo fino a drift 3,5 %) e' un risultato di laboratorio, non un altro calcolo; C28/35 (f_cm 34 MPa), B450C, 400 kN costanti per colonna; geometria in *Eng. Struct.* 156:503-521
  **cosa se ne prende** l'oracolo sperimentale aperto per la pushover ciclica: curve F-d e materiali dall'xlsx (8,2 MB) da confrontare con la curva che NOVA calcola; in coppia con `RCFrameGravity` di OpenSees, che e' l'oracolo del generatore — uno prova il modello contro la fisica, l'altro il codice contro un risultato noto

