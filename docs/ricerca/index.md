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
