# Analisi strutturale — glossario

Modellazione e analisi di telai in cemento armato con OpenSees, verificati a
NTC 2018. Questo file fissa i termini che il progetto usa e le distinzioni che
contano. I termini marcati **[DA DECIDERE]** non hanno ancora una definizione
stabilita: la definizione riportata è quella che la ricerca usa, non una
decisione. Fonti: `docs/ricerca/05-*.md` (linea rimossa di MeshRec),
`docs/ricerca/06-*.md` (norma, analisi, formati), `docs/ricerca/01-*.md`
(solutore).

## Geometria e modello

**Telaio**:
La struttura intelaiata oggetto del calcolo: nodi, aste, sezioni, vincoli.
È il modello dati del progetto — non un solido, non una mesh.
_Avoid_: struttura, edificio, modello (da solo)

**Nodo**:
Punto del telaio dove un'asta inizia o finisce, dove si applica un vincolo o
un carico concentrato. Ha coordinate e gradi di libertà.
_Avoid_: giunto, vertice

**Asta**:
Elemento monodimensionale del telaio fra due nodi, con una sezione e un
materiale. È ciò che il solutore riceve come elemento beam. Nella linea rimossa
di MeshRec una fetta di membratura diventava un'asta («una fetta = un'asta»).
_Avoid_: elemento (da solo), trave/pilastro come sinonimo generico, membratura

**Membratura**:
Componente prismatica misurata dal prior geometrico di MeshRec (una viga, una
columna, una zapata). Una membratura genera una o più aste. Il termine
appartiene a MeshRec e si usa qui solo parlando dell'ingresso dal prior.
_Avoid_: asta (non è la stessa cosa), elemento strutturale

**Giunzione**:
Incontro fra due membrature del prior, misurato da MeshRec (`wall.giunzioni`).
Nel telaio diventa un nodo condiviso.
_Avoid_: nodo (finché non è tradotto), intersezione

**Sezione**:
Forma e dimensioni della sezione trasversale di un'asta (oggi: rettangolare
`b × h` costante per asta). Senza armatura.
_Avoid_: profilo

**Sezione a fibre**:
Discretizzazione della sezione in fibre di calcestruzzo e di acciaio, ciascuna
con il proprio materiale, per il solutore. Una barra = una fibra.
_Avoid_: sezione (da sola), mesh di sezione

**Armatura**:
Le barre longitudinali e le staffe di una sezione: numero, diametro, posizione,
copriferro, passo. Non sta né nella nuvola né nel deck: entra da fuori.
_Avoid_: ferri, rinforzo

**Materiale**:
Classe del calcestruzzo o dell'acciaio con i valori caratteristici e di
progetto (f_ck, f_cd, f_yk, f_yd, E). Il legame costitutivo usato dal solutore
(elastico o non lineare) è **[DA DECIDERE]**: la linea rimossa usava solo
elastico lineare e dichiarava non decisa la veste delle resistenze.
_Avoid_: legame (che è una proprietà del materiale, non il materiale)

**Vincolo**:
Condizione imposta ai gradi di libertà di un nodo (incastro, cerniera,
carrello).
_Avoid_: appoggio (è un tipo di vincolo, non il termine generico), supporto,
condizione al contorno

## Azioni e combinazioni

**Azione**:
Un carico o un insieme di carichi con una natura dichiarata (permanente,
variabile con categoria d'uso, sismica). Ha un nome. Un'azione senza natura non
può entrare in una combinazione.
_Avoid_: carico (da solo), forza

**Caso di carico**:
Un'analisi del solutore per una singola azione o per una singola combinazione,
con un risultato proprio e con segno. Nella linea rimossa: un campo per caso
(`U_<CASO>`, `N_<CASO>`…).
_Avoid_: combinazione, step, pattern

**Combinazione**:
Somma pesata di azioni secondo la norma (fondamentale, caratteristica,
frequente, quasi permanente, sismica), con i coefficienti γ e ψ che citano la
tabella da cui vengono. Una combinazione è generata dal programma o corretta a
mano: le due cose si distinguono. Come mostrarlo a video: **[DA DECIDERE]**.
_Avoid_: caso di carico, load case

**Inviluppo**:
Per ogni grandezza e ogni sezione, il massimo e il minimo su un insieme di
combinazioni, con l'indicazione di quale combinazione governa.
_Avoid_: massimo (da solo)

**Combinazione modale**:
Composizione dei risultati per modo (SRSS o CQC) e della regola del 30 % fra
direzioni. Produce grandezze **senza segno** che non appartengono a nessun caso
di carico: il modello dati deve prevederle come cosa distinta. La linea rimossa
le escludeva per contratto.
_Avoid_: combinazione (da sola), inviluppo

## Analisi

**Analisi statica**:
Soluzione lineare del telaio sotto un caso di carico.

**Analisi modale**:
Calcolo di modi, frequenze e masse partecipanti. Il numero di modi è
sufficiente quando la massa partecipante raggiunge la soglia della norma:
**85 %** per NTC 2018 §7.3.3.1, **90 %** per EC8 — non 90 % per entrambe.
_Avoid_: analisi dinamica (è più ampia)

**Analisi con spettro di risposta**:
Spostamenti modali per direzione da uno spettro; la combinazione modale e la
regola del 30 % sono post-processing del programma, non del solutore.
_Avoid_: analisi sismica (è ambiguo: anche la statica equivalente lo è)

**Analisi pushover**:
Analisi statica non lineare in controllo di spostamento con distribuzioni di
forze prescritte; curva di capacità, sistema equivalente, spostamento
obiettivo sono post-processing del programma. Se e quando entra in perimetro:
**[DA DECIDERE]**.

**Check Model**:
Controllo deterministico del modello prima di ogni corsa del solutore: nodi
coincidenti, aste sconnesse, nodi liberi, massa nulla, moti rigidi, unità.
Esiste perché un errore di modello banale uccide il solutore senza eccezione.
Nome definitivo **[DA DECIDERE]**; il termine viene da `04-*.md` C1.
_Avoid_: validazione (che qui vuol dire un'altra cosa), lint

## Verifiche ed esiti

**Verifica**:
Confronto fra una domanda e una capacità secondo un articolo di norma citato,
su una sezione o un elemento, per una combinazione. Produce un verdetto.
_Avoid_: check, controllo (che è il termine dei controlli sul modello e sui
risultati, non sulla norma)

**Verdetto**:
Esito di una verifica o di un controllo. Ha **tre** valori, non due: passato,
non passato, **non applicabile**. Non applicabile non è non passato e non è
passato: un controllo che non vale per un modello (`applicabile: False`) non è
mai verde. Ereditato dalla tabella dei sette verdetti di `solve.py`.
_Avoid_: esito (troppo generico), risultato, OK/KO

**Controllo**:
Regola che contraddice un numero mostrato se il risultato peggiora: equilibrio
reazioni contro carichi, massa partecipante, avvisi del solutore, spostamenti
fuori banda. Produce un verdetto. Non è una verifica di norma.
_Avoid_: verifica, sanity check

**Relazione di calcolo**:
Documento richiesto da NTC 2018 §10.2.1: tipo di analisi, combinazioni
motivate, origine e versione del codice, materiali, esito delle verifiche,
giudizio motivato di accettabilità. Se il programma la produce, in che forma e
con che perimetro: **[DA DECIDERE]**.
_Avoid_: report (che in MeshRec è un'altra cosa), tabulato (che è l'allegato,
non la relazione)

## Solutore

**Solutore**:
OpenSees, l'esecutore dell'analisi. Vive in un processo separato dal programma.
Via d'accesso (binario Tcl o `openseespy` in un worker): **[DA DECIDERE]**.
_Avoid_: motore, engine, backend

**Sidecar**:
Il processo separato che ospita il solutore e parla con il programma. Il
programma ne legge lo stderr e un marcatore di fine, non il codice d'uscita:
OpenSees esce 0 anche su errore fatale.
_Avoid_: worker (finché non è deciso che sia un worker Python), server

**Artefatto del solutore**:
Ciò che esce dal programma e ricostruisce la corsa senza il programma: script
`.tcl` o `.py` e uscite dei recorder. Se resta un requisito del nuovo
progetto: **[DA DECIDERE]** (era l'argomento 2 della decisione #139).
_Avoid_: output, dump

## Ingresso del modello

**Modello dati**:
La rappresentazione interna del telaio con sezioni, armature, materiali,
vincoli, azioni, combinazioni e norma. È indipendente dal solutore e dagli
importatori. Il formato su disco: **[DA DECIDERE]**.
_Avoid_: schema, modello (da solo)

**Importatore**:
Traduttore da un formato esterno al modello dati. Candidati dalla ricerca:
prior geometrico di MeshRec, deck `.inp` (solo per verifica incrociata), SAF.
Quali entrano in v1: **[DA DECIDERE]**.
_Avoid_: parser, reader, lettore

**Prior geometrico**:
Il risultato dello step 12 di MeshRec (`12_wall.json`): membrature, sezioni per
fetta, quote, giunzioni, misurate dalla scansione. È misura del rilievo, non
analisi. Contratto ancora prodotto da MeshRec al 04/09/2026.
_Avoid_: modello, telaio (non lo è finché non viene tradotto)

**Deck**:
Il file `.inp` in formato Abaqus/CalculiX che MeshRec scrive allo step 11: un
solido tetraedrico. Non è un telaio e non porta armature: qui entra al massimo
come importatore di verifica incrociata.
_Avoid_: modello, input file

## Da preservare alla lettera

Identificatori, non parole: restano ASCII e invariati in ogni lingua.

- Elementi e comandi OpenSees: `forceBeamColumn`, `elasticBeamColumn`,
  `dispBeamColumn`, `section Fiber`, `geomTransf`, `eigen`, `modalProperties`,
  `responseSpectrumAnalysis`, `analyze`.
- Contratto del prior di MeshRec: `12_wall.json`, `sezioni_fette`,
  `quote_fette`, `base_sezione`, `giunzioni`.
- Set del deck MeshRec: `BASE`, `TOP`, `C3D4`, `C3D10`.
- Marcatori della linea rimossa, se riusati: `MESHREC_FINE`, `fine.out`,
  `WARNING` (senza asterisco: `ccx` scrive `*WARNING`).
- Classi d'acciaio e calcestruzzo secondo NTC: `B450C`, `C25/30`.
- Nomi dei campi di risultato, se il contratto resta: `U_<CASO>`, `N_<CASO>`,
  `V_<CASO>`, `M_<CASO>`, `MODO_<n>`.
- Articoli di norma nella forma della norma: `§7.3.3.1`, `[4.1.45]`,
  `Tab. 2.5.I`.
