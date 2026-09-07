# Shape — la UX di modellazione di NOVA

> Brief di design, non piano di implementazione. Prodotto con `/impeccable shape` il 07/09/2026,
> a valle della giornata 11a. Non scrive codice e non decide il calendario.

## 1. Lavoro e pubblico

Un ingegnere strutturista — oggi solo l'autore — deve portare un telaio in cemento armato dentro
NOVA e renderlo analizzabile. Arriva in due stati d'animo opposti, e oggi l'interfaccia ne serve
uno solo:

- **Costruisce**, perché sta dimostrando il programma o preparando un caso di prova. Sa già la
  geometria, vuole vederla comparire in fretta.
- **Rivede**, perché la geometria arriva da un rilievo di MeshRec. Non sa cosa troverà: deve
  capire *che cosa il rilievo ha creduto di vedere* e decidere se fidarsi.

**Modo: Operate.** Il successo è un lavoro finito, non un'impressione. Il criterio esiste già nel
piano ed è un cronometro — telaio 2×1 da zero in meno di due minuti. Quel criterio misura solo il
primo stato d'animo, e questa è la prima cosa che il brief corregge.

## 2. Esito e prova

**Compito primario:** avere un modello di cui l'utente si fida abbastanza da mandarlo al solutore.

La fiducia, non la velocità, è la valuta. Un modello costruito in trenta secondi di cui non si sa
se i piedi sono vincolati non vale niente; un modello importato che dichiara «otto regioni scartate,
ecco perché» vale molto anche quando è vuoto.

**Verità specifica di questo prodotto, che nessun modellatore generico può rivendicare:**
l'importatore *non inventa niente che il rilievo non abbia misurato*. Nessuna armatura dedotta,
nessun vincolo messo d'ufficio: le classi di default si dichiarano assunte nella loro `origine`, i
vincoli escono come **proposte accanto al modello e non dentro**, e `mancano` elenca per nome ciò
che resta da decidere. Questa onestà è la cosa più preziosa che il programma ha, ed è oggi
completamente invisibile perché la superficie non esiste.

## 3. Direzione scelta

**Autorità visiva:** il mondo esiste e non si tocca — palette «colonna tensegrale», `#dcdad5` di
fondo, `#141414` d'inchiostro, un solo rosso `#b8321e` che vuol dire attenzione e nient'altro,
doppio canale su ogni stato, WCAG AA. Questo brief non ridisegna il look: ridisegna i **gesti**.

**Tesi strutturale, una frase:** *il numero e il disegno devono stare sulla stessa schermata, e il
disegno deve rispondere al numero mentre lo si scrive.*

Da qui discendono tutte e tre le mosse:

**a) Il dialog muore, l'anteprima nasce.** Il difetto di `window.prompt` non è che è brutto: è che
**stacca dal modello**. Mentre scrivi `0; 3000` non vedi dove finirà il nodo, e per sapere se hai
sbagliato devi confermare. Il ghost esiste già — `ghostDisegnabile` lo calcola per l'estrusione —
e va esteso alla creazione: si digita in una riga di comando ancorata alla vista, e il ghost si
muove a ogni tasto. Sbagliare diventa gratis, perché lo vedi prima di confermare.

**b) Le coordinate diventano relative.** Con la tastiera primaria confermata, la risposta alle
coordinate scritte a mano **non è il mouse**: è smettere di chiedere posizioni assolute. Da un nodo
selezionato, `→ 2262` dice più di `2262; 0` e richiede metà dei caratteri, zero aritmetica mentale,
e nessuna conoscenza dell'origine. È il gesto dei CAD veri, e su un telaio regolare è quasi tutto
ciò che serve. L'assoluto resta disponibile per il primo nodo e per chi lo vuole.

**c) Il mouse crea, ma resta l'aiuto.** Cliccare nel piano posa un nodo agganciato alla griglia e
ai nodi esistenti; trascinare da un nodo tira un'asta. Non sostituisce la tastiera e non diventa
l'unica via per nulla: è la scorciatoia per chi ha già la mano sul mouse a orientare la vista.

**Momento focale:** il primo tasto premuto dopo `N` deve muovere qualcosa a schermo. È lì che
l'interfaccia smette di sembrare un modulo da compilare.

## 4. La seconda superficie: l'importazione è un rendiconto, non un caricamento

Questa parte del brief riapre una decisione del giorno 10 e richiede una scelta di calendario che
non spetta a questo documento.

**Il caso principale è il rifiuto.** Sul prior vero — `lab_telaio_v2` — l'importatore scarta ogni
regione e restituisce un modello vuoto. `nova/importa.py` è esplicito: *«non è un errore: è un
rilievo che ha bocciato tutto, e la sola risposta utile è il modello vuoto più il perché di ogni
bocciatura, una riga per controllo»*. Una schermata progettata per il caso felice e poi svuotata
mostrerebbe un buco. Va progettata **al contrario**: il rendiconto è la schermata, il modello è ciò
che a volte ne esce.

**Il materiale c'è già ed è ricco.** Ogni riga di `scartate` porta `regione`, `punti`, `controllo`,
`valore`, `soglia`, `unita`, `spiegazione` — e c'è **una riga per controllo fallito, non per
regione**, apposta, perché una regione bocciata due volte ha due ragioni e l'utente può correggerne
una. Questa è già la forma dei verdetti del Check Model: stessa grammatica, stesso doppio canale,
stesso `rimedio`. Non serve inventare un linguaggio nuovo, serve riusare quello.

**Tre cose accanto al modello, non dentro:** le `proposte_vincoli` da confermare una per una,
`mancano` come elenco esplicito di decisioni pendenti, `giunzioni` scartate col loro conto. Il
resoconto (`membrature`, `aste`, `nodi`, `scartate`, `giunzioni_scartate`) è il titolo della
schermata, non una nota a piè di pagina.

## 5. Scope e confini

**Dentro:** il gesto di creazione (nodo, asta, estrusione), la riga di comando con anteprima viva,
le coordinate relative, il mouse che crea, la superficie di importazione col suo rendiconto.

**Fuori, e dichiarato:** i grafici e i diagrammi (giornata 13), i modi di vibrare (giornata 14 —
**orizzonte confermato dall'autore, non scopo**: le viste devono poter ospitare un'animazione
modale senza essere rifatte, e niente di più), sezioni, materiali e carichi (11b/11c), il Check
Model e la corsa (12).

**Intoccabile:** la palette e il doppio canale; il fatto che l'impronta non si ricalcoli in JS; la
distinzione fra vincolo non dichiarato e dichiarato libero, appena costruita e verificata
end-to-end; il modello immutabile con uno snapshot per comando.

**Anti-obiettivi:** nessuna finestra modale che blocchi; nessun numero mostrato senza il suo
contraddittore; nessuna geometria dedotta che il rilievo non abbia misurato; nessun secondo colore
d'accento accanto al rosso.

**Dipendenza dichiarata:** l'annulla (`⌘Z`) è in calendario alla 11c, ma tre dei quattro dolori
segnalati lo presuppongono. Un'anteprima viva riduce il bisogno di annullare — è il suo scopo — ma
non lo sostituisce.

## 6. Stati e intervalli reali

- **Primo avvio, nessun modello:** oggi la vista è vuota e l'albero insegna `N`. Regge, ma non dice
  che si può importare.
- **Importazione riuscita in pieno:** ~4-40 aste (il MURO 1 ne ha 4, un telaio reale poche decine).
- **Importazione che scarta tutto:** il caso vero. Modello vuoto, `scartate` con una riga per
  controllo fallito — sull'ordine delle decine.
- **Importazione parziale:** alcune membrature entrano, altre no. È lo stato più difficile da
  mostrare bene, perché il modello *sembra* buono e non lo è del tutto.
- **Geometria in costruzione:** nodo isolato, asta pendente, ghost aperto; e il caso che oggi
  esiste già, il nodo di partenza che sparisce mentre un modo è aperto.
- **Errore del server:** percorso inesistente, file che non è un prior, schema non supportato.

## 7. Interazione e disposizione

**Gerarchia:** la vista del modello resta il protagonista e non si restringe. La riga di comando è
ancorata sotto le viste, accanto alla barra dei tasti — non è un pannello, è una riga che compare
quando serve. Il rendiconto d'importazione è un pannello a piena altezza, perché non è un messaggio
ma un documento da leggere.

**Feedback:** ogni tasto della riga di comando muove il ghost. Ogni riga scartata è cliccabile e
punta alla regione. Ogni proposta di vincolo si accetta o si rifiuta singolarmente, e finché non lo
fai resta contata in `mancano`.

**Tastiera:** resta la via primaria, confermata. Ogni gesto nuovo entra nella barra con il suo
tasto, e vale la regola già scritta in `tastiera.js` — si stampano solo le scorciatoie che
funzionano.

**Responsività:** la colonna e il pannello reggono già a 1280 e 1920 verificati; la riga di comando
non deve rubare altezza alle viste sotto i 700px.

## 8. Decisioni che chi costruisce non deve inventare

1. **Dove collocare l'importazione nel calendario T5.** Il giorno 10 era stata messa nel cassetto
   «dopo la tesi»; l'autore l'ha riaperta il 07/09. Va mappata prima di essere scritta.
2. **Se la riga di comando sostituisce `window.prompt` ovunque o solo per la creazione.** `M`
   (sposta) e `R` (rinomina) hanno bisogni diversi: uno è geometrico e vuole l'anteprima, l'altro è
   testuale e forse no.
3. **Quanto in là spingere l'aggancio del mouse** — solo griglia, o anche allineamenti e
   perpendicolari. Ogni aggancio in più è potere per chi lo conosce e sorpresa per chi no.
4. **Se il rendiconto d'importazione sia una schermata a sé o un pannello dentro quella corrente.**
   Dipende da quanto spesso si torna a rileggerlo dopo aver importato.
