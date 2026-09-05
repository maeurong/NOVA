# NOVA v1 — spec di design

Sintesi della mappa wayfinder [«Mappa NOVA v1 — dalla ricerca alla spec»](https://github.com/maeurong/NOVA/issues/1), chiusa il 04/09/2026 con quattordici ticket risolti. Ogni decisione qui riportata vive nel ticket che la contiene; questo file la ricompone in una forma leggibile da `superpowers:writing-plans`. Glossario: `CONTEXT.md`. Prodotto e convenzioni grafiche: `PRODUCT.md`. Consegna della tesi: **19/09/2026**, discussione dopo.

Notazione: numeri con la virgola decimale; identificatori tecnici invariati; unità interne mm-N-MPa-t-s.

## Problem Statement

L'autore, ingegnere strutturale, deve analizzare il telaio di laboratorio della tesi — un telaio in cemento armato rilevato con fotogrammetria da MeshRec, poi portato a rottura con i pistoni — e portare in appendice numeri riproducibili: statica, modale, confronto con il solido, e la via al non lineare. Oggi non esiste uno strumento che lo faccia: MeshRec si ferma al deck solido per scelta, la linea integrata è stata rimossa il 02/09/2026 perché la sua schermata a quattro stadi non reggeva, e i front-end OpenSees esistenti sono chiusi, solo Windows, senza norma italiana o con una licenza incompatibile. Il vuoto misurato dalla ricerca: nessuno dei venti e più strumenti censiti copre più di tre assi su sei fra gratuito, interfaccia moderna, multi-OS, telai c.a., verifiche NTC/EC, vivo.

Il dolore concreto, documentato dalla ricerca UX e vissuto sulla linea rimossa: un errore di modello banale uccide il solutore senza eccezione e con codice d'uscita zero; l'attesa del solutore è muta; i risultati si vedono ma non si esportano; ogni numero mostrato sembra verificato anche quando non lo è; le combinazioni si fanno a mano; l'interfaccia in aula non si legge.

## Solution

NOVA (Nonlinear OpenSees Visualization & Analysis) è un'applicazione locale, a utente singolo, per modellare un telaio in cemento armato in uno **spazio di modellazione** a doppia vista (piano di lavoro e spazio 3D sincronizzati), lanciarlo su OpenSees attraverso un **sidecar** fuori processo che non muore mai in silenzio, e leggere i risultati con la **regola di casa** ereditata da MeshRec: ogni numero mostrato ha un controllo che lo contraddice se il risultato peggiora.

In v1: modello dati proprio con sezioni, armature descrittive, materiali di norma, vincoli, azioni e combinazioni; **Check Model** deterministico prima di ogni corsa; analisi statica elastica su casi di carico; analisi modale con modi automatici fino all'85 % di massa partecipante (NTC 2018 §7.3.3.1); sette controlli sui risultati con verdetto a tre valori; statica con legami non lineari e pushover monotona con curva di capacità e stato delle sezioni; importatore dal prior geometrico di MeshRec che regge anche un prior vuoto; scheda «Confronto» telaio contro solido CalculiX/Abaqus come **verifica del codice**; modo presentazione per un'aula con schermo di 2 m e ultimo posto a 8 m. Interfaccia in italiano, tema chiaro «colonna tensegrale», un solo rosso.

NOVA è costruita come strumento generale, non su misura per il caso studio: il caso studio è il primo utente, non il perimetro.

## User Stories

Attori: **ingegnere** (l'autore, utente primario), **tesista** (collega o studente che riprende il modello), **commissione** (chi guarda dall'aula), **lettore dell'appendice** (chi legge la tesi senza il programma).

### Spazio di modellazione

1. Come ingegnere, voglio creare un nodo digitando `N` e le coordinate `x; z`, così da posare il telaio senza il mouse.
2. Come ingegnere, voglio creare un'asta per estrusione — nodo selezionato, `B`, lunghezza, freccia per la direzione, Invio — con il ghost dell'asta mentre digito, così da disegnare un telaio 2×1 in meno di due minuti.
3. Come ingegnere, voglio Esc per annullare il ghost e Invio per confermarlo, così da non committare nulla per sbaglio.
4. Come ingegnere, voglio vedere il piano di lavoro (SVG) e lo spazio 3D (three.js) affiancati e sincronizzati, così da modificare il piano selezionato e vedere il modello cambiare nello spazio nello stesso momento.
5. Come ingegnere, voglio scegliere il piano di lavoro attivo fra più piani del modello, così da modellare un telaio spaziale un piano alla volta.
6. Come ingegnere, voglio un albero del modello a sinistra (nodi, aste, sezioni, carichi) sincronizzato con la selezione, così da trovare un'entità per nome senza cercarla nel viewport.
7. Come ingegnere, voglio un pannello fisso a destra con l'ispettore della selezione, i controlli della corsa, i modi e la cronologia, così da non avere finestre flottanti che coprono il modello.
8. Come ingegnere, voglio una palette `⌘K` con i valori nella query («sezione 30x50», «q 12.5», «modo 2») e la scorciatoia visibile su ogni voce, così da comandare senza menu.
9. Come ingegnere, voglio una cronologia navigabile (`⌘Z`, `⇧⌘Z`, clic su una voce) con un'etichetta parlante per comando, così da tornare a uno stato preciso del modello.
10. Come ingegnere, voglio spostare un nodo e vedere le aste seguirlo, così da correggere le quote senza ridisegnare.
11. Come ingegnere, voglio eliminare un nodo e vedere sparire con lui le aste e i carichi che lo referenziano, così da non lasciare entità orfane.
12. Come ingegnere, voglio dare un nome libero a nodi, aste, sezioni e materiali senza che cambi la loro identità, così da rinominare senza rompere i riferimenti e i risultati.
13. Come ingegnere, voglio stati vuoti che insegnano il gesto (modello vuoto, nessun risultato, nessun solutore), così da non trovarmi davanti a una tela bianca senza istruzioni.
14. Come tesista, voglio le stesse scorciatoie stampate nella barra in basso, così da imparare il programma senza manuale.

### Sezioni, armature, materiali

15. Come ingegnere, voglio un catalogo di sezioni rettangolari `b × h` referenziate per nome dalle aste, così che cambiare una sezione cambi tutte le aste che la usano.
16. Come ingegnere, voglio descrivere l'armatura come la disegno — file per lato (quante barre, che diametro), staffe (diametro, passo, bracci), copriferro alla staffa — e lasciare a NOVA le posizioni e le fibre, così da non calcolare coordinate di barre a mano.
17. Come ingegnere, voglio una sezione dedicata graficamente all'editor delle barre, coerente con il resto dell'interfaccia, così da vedere la sezione mentre la descrivo.
18. Come ingegnere, voglio dichiarare una **riduzione** per lato (millimetri di copriferro espulso) su una sezione misurata sulla struttura danneggiata, con le barre che restano dove le mette il copriferro nominale, così da analizzare la struttura esattamente com'è.
19. Come ingegnere, voglio dichiarare un **danno** su un'asta (fattori 0–1 su modulo e resistenze del calcestruzzo, con una nota sull'origine), così da tenere il danno come dato del rilievo e non come materiale fantasma.
20. Come ingegnere, voglio scegliere un materiale per classe di norma (`C25/30`, `B450C`) con i valori NTC precompilati e sovrascrivibili quando lo marco «personalizzato», così da usare prove in situ senza inventare classi.
21. Come ingegnere, voglio scegliere la **veste** dei materiali (caratteristica, media, di progetto, esistente con fattore di confidenza) come impostazione dell'analisi, così che lo stesso `C25/30` faccia la modale con E_cm e il non lineare con i valori medi.
22. Come ingegnere, voglio vedere accanto a ogni curva i valori usati (`f_cm`, `E_cm`, `f_ym`, `epsU`, `E_s`), così che nessuna costante resti nascosta.

### Vincoli, azioni, combinazioni

23. Come ingegnere, voglio assegnare un vincolo a un nodo come sei gradi di libertà bloccati, con incastro, cerniera e carrello come preimpostazioni, così da non scrivere sei booleani a mano ogni volta.
24. Come ingegnere, voglio che il peso proprio sia l'unica azione generata dal programma e che ogni altro carico esista solo se lo inserisco, così da sapere sempre cosa c'è nel modello.
25. Come ingegnere, voglio raggruppare carichi in **azioni** con natura NTC dichiarata (G1, G2, Q con categoria, E), così che il generatore di combinazioni di fase 2 abbia ciò che gli serve.
26. Come ingegnere, voglio i carichi nodale, distribuito uniforme, gravità (fattore per asse), cedimento vincolare e termico nel formato, sapendo che il termico in v1 viene rifiutato dal Check Model con un messaggio chiaro, così da non ottenere un falso risultato elastico.
27. Come ingegnere, voglio scrivere una **combinazione** come somma pesata di azioni con un tipo NTC facoltativo, così da lanciare una corsa con i carichi già sommati.
28. Come ingegnere, voglio che un **caso di carico** sia una corsa sola (un'azione o una combinazione), mai una sovrapposizione nel post, così che la stessa via regga il non lineare.

### Check Model e corsa

29. Come ingegnere, voglio che prima di ogni corsa un Check Model deterministico rifiuti nodi coincidenti, aste sconnesse, aste a lunghezza zero, aste duplicate, nodi liberi, nodi che cadono su un'asta, sezioni nulle, massa nulla, vincoli assenti o totali, unità diverse da quelle dichiarate, così da non far girare un modello che il solutore accetterebbe in silenzio.
30. Come ingegnere, voglio che ogni verdetto del Check Model dica il controllo, l'oggetto, l'oracolo e l'azione (per esempio «spezza asta»), così da correggere senza indovinare.
31. Come ingegnere, voglio che NOVA localizzi il binario OpenSees sul Mac, dica se c'è, se funziona e dove prenderlo, senza incorporarlo, così da rispettare la licenza e sapere subito perché una corsa non parte.
32. Come ingegnere, voglio un'**attesa parlante** — fasi nominate (check model, scrivo il deck e lancio, leggo i recorder) e durata misurata a fine corsa, mai percentuali inventate — così da sapere cosa sta succedendo.
33. Come ingegnere, voglio che un errore del solutore torni come risposta strutturata con fase, motivo e coda del registro, senza che il sidecar muoia, così da non perdere il programma per un modello sbagliato.
34. Come ingegnere, voglio che ogni corsa scriva un file di risultati a sé, con l'impronta del modello, la versione di OpenSees, il deck e la mappa fra identificatori e tag, così da ricostruire la corsa senza il programma.
35. Come ingegnere, voglio che i risultati di una corsa restino visibili ma marcati **stantii** in rosso quando il modello cambia, mai cancellati, così da confrontare prima e dopo.

### Risultati statici e controlli

36. Come ingegnere, voglio la deformata con la scala sempre stampata «×n (auto | a mano)» e l'ombra indeformata, così che nessuna figura sia letta con una scala sbagliata.
37. Come ingegnere, voglio il diagramma M sul lato teso con l'etichetta al picco con segno, V e N con segno e verso locale i→j scritto una volta nella legenda, così da leggere i diagrammi con la convenzione italiana.
38. Come ingegnere, voglio le sollecitazioni per **stazione** lungo l'asta (punti di integrazione, ricomposti come frazione della lunghezza), così che con un carico distribuito il momento fra le estremità sia parabolico e non una retta.
39. Come ingegnere, voglio il diagramma M srotolato asta per asta sotto il piano di lavoro con i picchi scritti, così da leggere i valori senza cliccare.
40. Come ingegnere, voglio spostamenti e reazioni per nodo su sei componenti, così da controllare l'equilibrio.
41. Come ingegnere, voglio sette controlli sui risultati (Σ reazioni contro Σ carichi, autovalori, picco, vincolo in pianta, avvisi del solutore, spostamenti in banda, massa partecipante) con verdetto a **tre valori** — passato, non passato, non applicabile — così che un controllo che non vale per il mio modello non sia mai verde.
42. Come ingegnere, voglio i verdetti mostrati a doppio canale (punto pieno / vuoto / rosso e testo, più riga in tabella), così da leggerli anche stampati in bianco e nero.

### Analisi modale

43. Come ingegnere, voglio lanciare la modale con un numero di modi fisso o «automatico» che cresce fino all'85 % di massa partecipante, così da rispettare NTC 2018 §7.3.3.1 senza tentativi.
44. Come ingegnere, voglio dichiarare quali azioni contribuiscono alla massa con un coefficiente (NTC [2.5.7], ψ2 a mano in v1) oltre alla densità delle aste e alle masse nodali, così da non contare due volte il peso.
45. Come ingegnere, voglio i modi animati nel viewport con frequenza e massa partecipante accanto, e tasti `1 2 3` per cambiarli, così da riconoscere un modo locale a colpo d'occhio.

### Non lineare

46. Come ingegnere, voglio lanciare la stessa corsa statica con sezioni a fibre e legami non lineari (Concrete02/Steel02 dalla classe con veste media, nucleo confinato NTC di default, Mander opzionale), così da vedere dove il telaio fessura e snerva.
47. Come ingegnere, voglio una pushover monotona in controllo di spostamento con una distribuzione (nodale, uniforme, primo modo), un nodo e un grado di libertà di controllo, un incremento e uno spostamento massimo, così da riprodurre la prova ai pistoni.
48. Come ingegnere, voglio la curva taglio alla base – spostamento del nodo di controllo con i passi cliccabili e uno scrubber sulla deformata, così da vedere il telaio a ogni passo.
49. Come ingegnere, voglio lo stato delle sezioni per stazione a quattro valori (elastica, fessurata, snervata, schiacciata) su due canali, così da leggere la formazione delle cerniere.
50. Come ingegnere, voglio che il solutore provi una scala di algoritmi (Newton, ModifiedNewton, KrylovNewton) con passo dimezzato, e che la curva finisca dichiarando «caduta al passo n, spostamento d, ultimo algoritmo», così da non scambiare una caduta numerica per un collasso.

### Importatore dal prior di MeshRec

51. Come ingegnere, voglio importare il prior geometrico `12_wall.json` di MeshRec anche quando è vuoto, ottenendo l'elenco delle regioni scartate con controllo, valore e soglia, così da sapere cosa la scansione non ha separato.
52. Come ingegnere, voglio che ogni fetta di membratura diventi un'asta con la sua sezione dal rilievo (`origine: rilievo`) e che le giunzioni diventino nodi condivisi con lo scostamento mostrato, così da partire dal rilievo e non da zero.
53. Come ingegnere, voglio il modello importato subito usabile in elastico — classe di default marcata «assunta», vincoli proposti dalla geometria come ghost da confermare — con un pannello «dal rilievo mancano: armature, classe, vincoli», così da completare senza una procedura bloccante.
54. Come ingegnere, voglio che le coordinate del prior siano ruotate nella terna del telaio tenendo le quote fuori piano, così da non perdere la geometria misurata.
55. Come ingegnere, voglio che l'editing di un'entità importata non cancelli la sua origine ma la marchi come modificata, così da sapere cosa viene dal rilievo e cosa da me.

### Confronto con il solido

56. Come ingegnere, voglio una scheda «Confronto» con la stessa struttura risolta come telaio in NOVA e come solido in CalculiX o Abaqus, per caso e grandezza, con scarto percentuale, classe di concordanza (≤ 5 %, ≤ 20 %, oltre) e bias atteso accanto, così da verificare il codice senza fingere una validazione.
57. Come ingegnere, voglio che la prima riga della tabella sia la massa dei due modelli, così che lo scarto di geometria sia dichiarato prima dei risultati.
58. Come ingegnere, voglio che NOVA localizzi `ccx`, importi il deck `.inp` e lanci la corsa CalculiX da sé, così da non dipendere da una corsa fatta a mano.
59. Come ingegnere, voglio leggere i risultati Abaqus da un CSV con schema dichiarato (`caso, grandezza, valore, unita, fonte`), così da confrontare anche ciò che gira solo su Windows.
60. Come lettore dell'appendice, voglio tabella, piccoli multipli e frequenze affiancate esportati in PNG/SVG e CSV/LaTeX con provenienza in piè di tabella (commit, deck, versione del solutore), così da ricostruire da dove viene ogni numero.
61. Come lettore dell'appendice, voglio leggere «verifica del codice, non validazione» su ogni tabella e figura del confronto, così da non attribuire al programma ciò che non ha dimostrato.

### Presentazione e leggibilità

62. Come commissione, voglio che con il tasto `P` l'interfaccia entri in modo presentazione — pannelli ritratti, barra dei tasti e cronologia nascoste, viewport con scala stampata e striscia compatta dei controlli — con etichette ≥ 46 px nel viewport, testo ≥ 32 px nei pannelli, aste ≥ 6 px, nodi ≥ 14 px e contrasto ≥ 3:1, così da leggere da 8 m su uno schermo di 2 m.
63. Come commissione, voglio che il rosso voglia dire una cosa sola (attenzione: selezione, fallito, stantio), i diagrammi in inchiostro tratteggiato, gli scalari in viridis con legenda e tutto leggibile in bianco e nero, così da non confondere un colore con un giudizio.
64. Come commissione, voglio le unità dichiarate in un punto e su ogni numero, così da non chiedermi se un valore è in kN o in N.

### File e riproducibilità

65. Come ingegnere, voglio salvare il modello in un solo file JSON con versione dello schema e unità dichiarate, e i risultati in file separati per corsa, così da versionare il modello e conservare le corse.
66. Come tesista, voglio aprire un modello salvato con una versione precedente dello schema e vederlo migrato, così da non perdere lavoro.
67. Come tesista, voglio che un file con campi sconosciuti venga rifiutato con il nome del campo, così da scoprire un errore di battitura invece di perderlo in silenzio.
68. Come ingegnere, voglio che ogni corsa conservi il deck generato e il registro del solutore, così da ricostruire la corsa senza NOVA come chiede NTC §10.2.1.

## Implementation Decisions

### Architettura

- **Tre processi.** Il browser dell'utente (interfaccia in HTML/CSS/JS, viewport 3D in three.js, piano di lavoro in SVG); un server locale Python con FastAPI che serve gli statici e fa da ponte; uno o più **sidecar** Python a vita lunga che ospitano il core (modello dati, Check Model, generazione del deck, lancio del solutore, lettura dei recorder, controlli, importatore, confronto). Il solutore è **sempre** fuori dal processo del server: misurato che OpenSees esce con codice zero e nessun avviso anche su un'asta a lunghezza zero o un nodo libero.
- **Nessuna finestra nativa in v1**: si apre il browser. Finestra nativa (pywebview/Tauri) dopo la tesi. L'interfaccia è agnostica dal trasporto: parla HTTP con il server, e il server parla righe JSON con il sidecar.
- **Stack**: Python 3.12 (lo stesso venv usa numpy, scipy, pydantic v2, meshio), FastAPI, pytest; nessun bundler per il JS in v1 (moduli ES nativi, three.js vendorizzato). Licenza MIT; OpenSees e CalculiX **localizzati** sulla macchina, mai incorporati o ridistribuiti.
- **Riuso da MeshRec a `9716f6e`**, in sola lettura dalla cronologia git: scrittura del deck a fibre e lettura dei recorder (`opensees.py`), telaio dal prior (`telaio.py`), collocazione delle armature e minimi NTC (`armatura.py`), verdetti e lancio CalculiX (`solve.py`), configurazione e catalogo materiali. Le copie entrano in NOVA verbatim con impronta sha256 annotata; gli adattamenti stanno in moduli propri di NOVA, mai dentro le copie.

### Protocollo del sidecar

Processo Python avviato dal server, una riga JSON per richiesta su stdin, una o più righe JSON su stdout con lo stesso `id`: prima gli eventi di fase, poi la risposta finale. Un errore interno risponde `esito: errore` con `fase` e `motivo` e il processo resta vivo. Dal prototipo del ticket #9, confermato:

```
richiesta            → risposta finale
verifica {solutore?} → esito: ok | rotto | assente, percorso, motivo, dove_prenderlo
check    {modello}   → esito: ok | rifiutato, verdetti[]
corsa    {modello, analisi, cartella, forza?}
                     → esito: ok | rifiutato | errore{fase, motivo, coda_log} | assente,
                       risultati, verdetti_check[], secondi
importa  {prior}     → esito: ok, modello, scartate[], mancano[]
confronto{...}       → esito: ok, tabella[], provenienza
fine                 → esito: ciao

evento di fase: {"id", "evento": "fase", "nome": "check model" | "scrivo il deck e lancio OpenSees" | "leggo i recorder"}
```

Il sidecar CalculiX usa lo stesso protocollo con il comando `corsa` sul deck solido. `forza: true` salta il Check Model e serve solo alle misure, mai all'interfaccia.

### Modello dati

Un file JSON per modello (`.nova.json`), `schema_version`, unità dichiarate `mm-N-MPa-t-s`, Pydantic v2 con `extra="forbid"`, migrazioni nel caricatore. Identificatori interi per tipo, mai riusati, con contatori nel file; il nome è libero. Il tag OpenSees si deriva alla generazione del deck e si salva solo nella mappa dei risultati. Dai ticket #6, #7, #13:

```
Modello   {schema_version, unita, contatori{nodo, asta, sezione, materiale, azione, combinazione},
           nodi[], aste[], sezioni[], materiali[], azioni[], combinazioni[], analisi[],
           impostazioni_analisi{fibre: 10×10, veste}}
Nodo      {id, nome?, x, y, z (Z su), vincolo?{ux, uy, uz, rx, ry, rz}, massa_nodale?, origine?}
Asta      {id, nome?, nodo_i, nodo_j, sezione, rotazione_deg: 0, suddivisioni: 1,
           danno?{fattore_E, fattore_fc, nota}, origine?}
Sezione   {id, nome, tipo: "rettangolare", b, h, riduzione?{sup, inf, sx, dx},
           calcestruzzo, acciaio, copriferro, file[{lato, n, diametro}],
           staffe{diametro, passo, bracci}, origine?}
Materiale {id, nome, tipo: calcestruzzo | acciaio, classe, valori{…}, personalizzato: false}
origine   {sorgente: rilievo | utente, riferimento?, file?, nota?, modificata: false}

Azione       {id, nome, natura: G1 | G2 | Q{categoria} | E, generata, carichi[]}
Carico       nodale | distribuito | gravita | cedimento | termico  (union su `tipo`)
Combinazione {id, nome, termini[{azione, coefficiente}], tipo?, generata: false}
Analisi      statica{casi[]} | modale{modi: n | "auto", masse_da_azioni[]}
           | pushover{distribuzione: nodale{nodo, direzione} | uniforme | modo1,
                      nodo_controllo, dof, incremento, spostamento_max}
```

Regole: il peso proprio è un'azione G1 generata (gravità per densità, acciaio compreso); un nodo che cade su un'asta senza esserne estremo non la suddivide (errore del Check Model, azione «spezza asta»); posizioni delle barre, patch e layer sono **derivati** alla generazione del deck, mai salvati; la riduzione restringe il contorno e lascia le barre dove le mette il copriferro nominale; veste, finezza delle fibre e `GJ` sono impostazioni dell'analisi; il termico sta nel formato ma il Check Model lo rifiuta in v1.

### Risultati per corsa

Un file per corsa, mai dentro il modello:

```
run        {id, data, hash_modello, versione_opensees, deck, registro, mappa_tag{nodo, asta}}
per_caso   [caso]{con_segno: true, spostamenti[nodo][6], reazioni[nodo][6],
                  sollecitazioni[asta][stazione]{x_rel, N, Vy, Vz, T, My, Mz}}
modi       [n]{f, T, forma[nodo][3], massa_partecipante{x, y, z}, cumulata{x, y, z}}
passi      [ ]{spostamento, taglio_base, spostamenti[nodo][6], stato_sezioni[asta][stazione], algoritmo}
combinazione_modale  (posto riservato, con_segno: false)
verdetti   [ ]{controllo, oggetto?, stazione?, caso?, esito: passato | non_passato | non_applicabile,
               ragione, articolo?, valori{}}
```

`hash_modello` diverso dall'impronta corrente = risultati stantii, mostrati in rosso, mai cancellati. Le stazioni sono i punti di integrazione (Lobatto) letti con un recorder per sezione, ricomposti sull'asta come `x_rel` fra 0 e 1.

Contratto della curva (T4): `passi[].spostamento` e `caduta.spostamento` sono **relativi** a `run.pushover.u0`, cioè allo spostamento che il nodo di controllo aveva dopo il caso di gravità; `passi[].spostamenti[nodo]` sono **assoluti**, perché quello è il campo di spostamento vero che si disegna. `u0` è la chiave che riconcilia i due zeri.

I verdetti si leggono per la coppia `(controllo, caso)` e non per il solo nome: una corsa con statica a fibre e pushover porta due `convergenza` (`caso: "Z1"` e `caso: "pushover"`) e due `spostamenti`, e chi cerca per nome ne trova uno solo.

### Generazione del deck e adattamenti

Deck `.tcl` per il binario `OpenSees`, generato dal codice riusato; la lettura è da stderr e marcatore di fine, non dal codice d'uscita. Adattamenti dichiarati rispetto alla copia verbatim, ognuno con la misura che lo giustifica: `fix` scritti dai vincoli **dichiarati** (la copia li deduce dalla geometria); carichi nodali, distribuiti, gravità e cedimenti oltre il peso proprio; casi di carico oltre `GRAVITA`/`MODALE`, uno per azione o combinazione; recorder per sezione per le stazioni; soglia di massa partecipante 0,85 (la copia usa 0,90); `Concrete02`/`Steel02` dalla classe e dalla veste per il non lineare, `Concrete04` con Mander opzionale; pushover con `DisplacementControl` e scala di algoritmi. Valori dichiarati: `f_ym` di B450C = 450 MPa, `epsU` del copriferro = 0,0035, `E_s` = 200 000 MPa, deformazione ultima del nucleo da NTC [4.1.11]; tutti campi del materiale, sovrascrivibili e stampati.

### Check Model (C1) e controlli sui risultati (C3)

**Sedici** controlli C1 con oracolo, dodici dal prototipo #9: `unita`, `nodi_coincidenti` (< 1 mm), `aste_sconnesse`, `aste_lunghezza_zero`, `aste_duplicate`, `nodi_liberi`, `nodo_su_asta`, `sezione_nulla`, `massa_nulla`, `vincoli` (nessuno o tutti), `vincoli_dedotti`, `moti_rigidi` (non applicabile prima della corsa); più `carico_termico` (rifiuto dichiarato in v1), `riferimenti` (sezioni, materiali, carichi, combinazioni, casi delle statiche, azioni della modale), `armatura_mancante` per le corse a fibre e `pushover` (T4: nodo di controllo assente o vincolato nella direzione di spinta, caso di gravità assente, `modo1` senza modale, `nodale` senza forze, forza su un nodo assente, nessuna statica `legami: fibre`; `non_applicabile` quando il modello non dichiara una spinta). Un `non_passato` rifiuta la corsa prima di scrivere il deck.

Sette controlli C3 sui risultati, dal codice riusato, riletti nel verdetto a tre valori: `reazioni` (Σ reazioni contro Σ carichi per caso), `autovalori` (moti rigidi), `picco`, `vincolo_in_pianta`, `avvisi` (conteggio `WARNING`), `spostamenti` (in banda), `massa_modale` (≥ 85 %); più `convergenza` (T4: la statica a passi e la pushover sono arrivate in fondo, e con quali algoritmi). `spostamenti` guarda due scale (#26): la diagonale del modello, com'era in T1 (`valori.rapporto_diagonale`), e la **luce** dell'asta più corta che tocca il nodo di `u_max` (`valori.rapporto`) — oltre 1/10 è `non_passato` («il modello non descrive più la struttura»), fra 1/50 e 1/10 è verde con un avviso nella ragione.

C2: `modi: "auto"` fa crescere il numero di modi finché la massa partecipante cumulata raggiunge l'85 % su ogni direzione con massa.

### Importatore dal prior

Legge `12_wall.json` di MeshRec; riusa la costruzione del telaio dal prior as-is (una fetta = un'asta, nodo condiviso = stazione più vicina con scostamento mostrato); ogni asta ottiene la sua sezione nel catalogo con `origine: rilievo` e nota con riempimento e dispersione; `e2` diventa `rotazione_deg`; coordinate ruotate nella terna del telaio (u→x, v→z, n→y), minimo all'origine, `y ≠ 0` conservato. Con zero membrature restituisce un modello vuoto e l'elenco delle scartate con controllo, valore e soglia. Dopo l'import: classe `C25/30` assunta, vincoli proposti dalla regola del piede come ghost, pannello «mancano».

### Confronto

Telaio dalle sezioni nominali; solido dalla scansione. Casi: gli stessi tre statici del deck (peso proprio; più spinta 0,10 g laterale; più 1200 N in sommità) e la modale. Grandezze: spostamento in sommità, Σ reazioni per caso, taglio alla base sotto spinta, f1–f3 e masse partecipanti. `E`, ν, ρ del telaio presi dal deck. Prima riga: massa telaio | solido. Nessun pass/fail: scarto percentuale e classe di concordanza a tre valori con bias atteso (tetraedri lineari più rigidi; telaio senza nodo rigido né fondazioni deformabili). L'unico verdetto vero è l'equilibrio su entrambi. CalculiX: localizzato, `.inp` letto con meshio, corsa lanciata dal secondo sidecar, `.frd`/`.dat` letti dal codice riusato. Abaqus: CSV con schema. Uscite: tabella, piccoli multipli, export PNG/SVG/CSV/LaTeX, provenienza.

### Interfaccia

Variante **B «Doppia vista»** del prototipo #8, letta per la struttura e non per il dettaglio: il prototipo ha etichette sovrapposte e testi tagliati, e l'interfaccia vera passa per `impeccable` (critique, layout, polish) con collisioni delle etichette risolte e nessuna sovrapposizione. Stato in memoria con uno snapshot per comando e cronologia lineare (un telaio pesa pochi KB); selezione unica sincronizzata fra albero, piano, spazio e pannello; risultati letti dal file della corsa e marcati stantii per impronta. Convenzioni grafiche e modo presentazione come in `PRODUCT.md`: tema chiaro «colonna tensegrale» (`#dcdad5`, `#141414`, `#b8321e`, mono tabulare), un solo rosso, scala della deformata stampata, unità in un punto, fallimento a doppio canale, verdetti a tre stati, fasi nominate e durata misurata. Lingua: italiano.

## Testing Decisions

Un buon test prova il comportamento visibile da fuori attraverso una cucitura stabile, con un oracolo scritto nel nome del test, e non l'implementazione. Tre cuciture, una sola densa (scelta confermata da Mario il 05/09/2026):

1. **Protocollo del sidecar** — la cucitura principale. Un test scrive una riga JSON su uno stream in memoria e legge le righe di risposta; il binario OpenSees o `ccx` entra solo se presente sulla macchina, altrimenti il test è saltato con motivo. Dietro questa riga stanno modello dati (carico, migrazione, rifiuto dei campi sconosciuti), Check Model, generazione del deck, corsa, controlli C3, modale, non lineare, importatore, confronto. Oracoli: telaio 2×1 da JSON → Σ reazioni = Σ carichi entro 1e-6 relativo; asta a lunghezza zero → `rifiutato` con `aste_lunghezza_zero`; nodo libero → `rifiutato` con `nodi_liberi`; comando sconosciuto → `errore` e il processo risponde ancora; modale «auto» → cumulata ≥ 0,85; trave appoggiata con carico distribuito → M in mezzeria = qL²/8 alla stazione più vicina; pushover su telaio 2×1 → curva monotona con caduta dichiarata; prior vero → zero aste, otto scartate, nessuna eccezione; prior sintetico → quattro membrature (80 aste) tradotte con nodi condivisi; prior parziale → due tradotte, due in «mancano».
2. **HTTP** — ponte sottile provato con `TestClient` su poche rotte di contratto (apri/salva modello, check, corsa, risultati, importa, confronto), con il sidecar vero in memoria. Prior art: `tests/test_server.py` di MeshRec.
3. **Interfaccia** — le funzioni vere dei moduli JS (stato, cronologia, piano di lavoro, scala della deformata, controlli) eseguite con `node` su un DOM finto minimo; prior art: `tests/test_app_js.py` di MeshRec. Verifica visiva a più larghezze e in modo presentazione con il browser, nella tappa con Mario.

Fixture versionate: modelli `.nova.json` (telaio 2×1 sano, asta a lunghezza zero, nodo libero, nodi coincidenti con asta duplicata, trave appoggiata), prior sintetico generato una volta da MeshRec (task #16: quattro membrature, quattro giunzioni, zero scartate — il «sei membrature» del ticket #10 erano i riscontri del provino reale, non un telaio sintetico; comando, commit e impronta annotati), prior parziale a mano, CSV Abaqus d'esempio. Il prior vero e il deck solido stanno in `lab_telaio_v2/` non versionata: i test che li usano sono saltati se la cartella manca. I test sul binario riprendono la forma di `tests/feasibility/` di MeshRec.

Ogni brief di implementazione porta la sezione `## Ingressi degeneri` con condizione e oracolo; il round pre-commit (`security-reviewer`, `code-reviewer`, `test-writer`, `craft-reviewer` in parallelo) chiude riga per riga.

## Out of Scope

- Riscrivere o modificare MeshRec; separare le membrature del prior per orientamento quando gli spessori coincidono (lavoro di MeshRec, non di NOVA).
- Risolvere il solido in OpenSees (tetraedro quadratico misurato rotto sulle tensioni); il solido resta a CalculiX/Abaqus.
- Incorporare o ridistribuire OpenSees, CalculiX o la ruota OpenSeesPy; contribuire a `opensees-studio` (AGPL).
- Finestra nativa, installer, firma e notarizzazione: dopo la tesi.
- Studio italiano: generatore di combinazioni NTC, verifiche SLU/SLE complete, gerarchia delle resistenze, relazione di calcolo §10.2.1, import/export SAF, inviluppi con caso che governa, combinazione modale calcolata, spettro di risposta.
- Non lineare oltre v1: N2 e spostamento obiettivo, le due distribuzioni e i due versi di §7.3.4.2, fibre singole per passo, dinamica non lineare, danno sull'acciaio.
- Modello dati oltre v1: sezioni poligonali misurate, rilasci alle estremità, molle, diaframma rigido, carichi trapezoidali e concentrati su asta, termico sulle fibre, ψ2 dal registro, tabulato del modello leggibile.
- Funzioni con LLM, funzioni intelligenti C4–C12, tema scuro, vista tabellare, `openseespy`/xara in-process.

## Further Notes

### Sequenza dei quindici giorni (ticket #15)

Oggi 05/09/2026 = giorno 1. Il backend avanza da solo di notte (ha oracoli), l'interfaccia si fa con Mario di giorno.

| tappa | giorni | contenuto | fatto quando |
|---|---|---|---|
| T0 | notte 4→5 | spec, piano annotato, fixture #16, scaffold (pacchetto Python, FastAPI, statici, pytest) | spec e piano committati, `pytest` verde |
| T1 | 5–6 | modello dati con migrazioni; sidecar con Check Model; vincoli dichiarati; carichi; statica elastica; risultati per corsa; sette controlli C3 | telaio 2×1 → Σ reazioni = Σ carichi; asta a lunghezza zero rifiutata |
| T2 | 6–7 | modale con modi automatici; importatore con le tre fixture e «mancano»; caso studio a mano dalle nominali | f1–fn e masse ≥ 85 %; prior vero → vuoto senza crash |
| T3 | 7–8 | confronto lato dati: sidecar CalculiX, deck via meshio, CSV Abaqus, tabella ed export | tabella con massa, tre casi, modi e provenienza |
| T4 | 8–9 | non lineare lato dati: legami da classe e veste, statica non lineare, pushover con curva, stato delle sezioni, scala di algoritmi | curva su telaio 2×1; caduta dichiarata |
| T5 | 10–15, con Mario | tutta l'interfaccia: spazio B, albero, pannello, estrusione, palette, cronologia, ghost, deformata con scala, M per stazione, modi animati, editor delle barre, scheda Confronto, curva pushover con scrubber, modo presentazione, critique e polish | telaio 2×1 disegnato da zero in meno di due minuti; leggibile a 8 m; zero sovrapposizioni |
| T6 | 16–18 | caso studio completo, corse CalculiX e Abaqus, figure per l'appendice, riserva | tabella di confronto e figure esportate |
| 19 | consegna | | |

Tagli in ordine, se il tempo manca: pushover (resta la statica non lineare) → stato delle sezioni → CSV Abaqus (resta CalculiX) → importatore dal prior (il caso studio è a mano comunque) → export LaTeX. Mai: Check Model, controlli, scala stampata, modo presentazione.

### Fatti misurati che governano il design

- OpenSees gira con exit 0 e zero avvisi su un'asta a lunghezza zero (Σ Rz = −635 726 N contro +55 273 N attesi) e su un nodo libero (4,16·10¹⁰ N, tre modi a 0,110 Hz); nodi coincidenti con asta duplicata passano tutti i verdetti del solutore: solo il Check Model li vede.
- Sulla run vera `lab_telaio_v2` il prior è vuoto: una regione con 4 215 879 punti (98,7 % della nuvola) fallisce la costanza di sezione perché le membrature hanno spessori simili. Le nuvole danneggiate future avranno lo stesso vuoto.
- Il deck solido ha 14 116 nodi e 51 892 tetraedri lineari, massa 0,555 t, volume 0,218 m³ contro 0,478 m³ della tavola: lo scarto di geometria si dichiara in prima riga.
- Nessuna prova di carico documentata sul telaio: ogni confronto è verifica del codice.

### Riferimenti

- Ticket risolti: #2 tracciatura, #3 dati, #4 OpenSees 3.8.0, #5 Abaqus, #6 modello dati geometria, #7 azioni e risultati, #8 prototipo spazio (ramo `prototype/spazio-di-modellazione`), #9 prototipo sidecar (ramo `prototype/sidecar`), #10 importatore, #11 confronto, #12 legami (`docs/ricerca/09-*.md` su `research/legami-ntc`), #13 non lineare, #14 presentazione, #15 sequenza. #16 fixture del prior sintetico (ramo `chore/fixture-prior-sintetico`).
- Ricerca: `docs/ricerca/README.md` e gli otto report.
