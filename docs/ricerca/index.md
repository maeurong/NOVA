# Ricerche — indice

Una riga per ricerca: la domanda che copre, lo stato, la data. È l'unico punto
d'ingresso: `architect` annota i piani citando `docs/ricerca/<file>.md:<riga>`, e in
questo repo l'hook `dispatch-gate.py` nega un brief di dispatch che non cita una
ricerca né dichiara `- nessun riferimento pertinente`. La sintesi ragionata delle prime
sette sta in [`README.md`](README.md); i tag `[V]/[M]/[INF]/[NON TROVATO]` valgono in
tutti i file.

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
| `research/desktop-macos` | — in corso su branch, senza file ancora committato — | in corso | 08/09/2026 |
| `research/solido-calculix` | — in corso su branch, senza file ancora committato — | in corso | 08/09/2026 |
| `research/studio-italiano` | — in corso su branch, senza file ancora committato — | in corso | 08/09/2026 |
| `research/model-updating` | — in corso su branch, senza file ancora committato — | in corso | 08/09/2026 |

Le nove ricerche fatte precedono il criterio a tre campi (URL · perché conta qui · cosa
se ne prende) introdotto l'08/09/2026 in `~/.claude`: citano per URL con tag, non con i
tre campi. Il retrofit di quel campo è rimandato a quando le quattro ricerche in corso
saranno confluite, per non toccare la cartella mentre altri ci scrivono. Una ricerca
nuova che atterra qui aggiunge la propria riga e sostituisce quella «in corso».
