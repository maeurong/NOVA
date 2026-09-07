# Shape — la UX di modellazione di NOVA

> Brief di design, non piano di implementazione. Prodotto con `/impeccable shape` il 07/09/2026,
> a valle della giornata 11a. Non scrive codice e non decide il calendario.
>
> **Riscritto lo stesso giorno, dopo un rilievo dell'autore.** La prima stesura presentava come
> proprie due mosse che la ricerca UX aveva già scritto il 04/09 con le sue fonti. Questa versione
> è un **rendiconto della ricerca**: ogni mossa cita il principio che la impone, e i dieci principi
> sono verificati uno per uno contro il codice, con il controllo che li smentisce. Dove la ricerca
> ha già deciso, questo documento non ha opinioni.

## 0. Rendiconto: i dieci principi di `07-ux-modellatore.md` contro il codice

`P1–P10` sono i principi UX candidati della ricerca (riga 145 e seguenti), che `PRODUCT.md`
riporta e di cui raccomanda l'adozione immediata per 1, 5, 6, 7.

| # | principio | stato | prova |
|---|---|---|---|
| **P1** | Ogni numero mostrato porta il suo contraddittore | **non ancora esigibile** | Nessuna verifica e nessun risultato esistono. L'unico numero derivato è la lunghezza dell'asta (`pannello.js`, `Math.hypot`), e non ha contraddittore. Diventa esigibile alla giornata 12. |
| **P2** | Seleziona, poi agisci; **nessuna finestra che blocca** | **violato** | `app.js`, `chiedi()` chiama `window.prompt`. È il *requester* che Blender HIG — citato dalla ricerca — dice di non fare: «*doesn't pop up requesters that require the user to fill in data before things execute*». |
| **P3** | Tastiera prima, **palette** con conflitti in rosso | **a metà** | La tastiera c'è ed è primaria (`tastiera.js`, barra che stampa solo ciò che funziona). La palette `⌘K` **non esiste**: in `app.js` c'è solo il commento che la promette. |
| **P4** | **Anteprima prima del commit**, undo illimitato e visibile | **a metà** | Il ghost esiste per estrusione e asta (`modo.js`, `ghostDisegnabile`), **non** per la creazione del nodo. L'undo non esiste: `cronologia.js` esporta `indietro`/`avanti`, `app.js` non li importa. |
| **P5** | Attesa parlante, mai percentuale inventata | **non ancora esigibile** | Nessuna corsa dall'interfaccia. Giornata 12. |
| **P6** | Combinazioni generate dalla norma | **fuori scope v1** | La spec le mette in «Fuori scope → Studio italiano», insieme alle verifiche SLU/SLE e alla relazione §10.2.1. |
| **P7** | Risultati: colormap percettiva, **fallimento a doppio canale** | **applicato dove è già esigibile** | Nessun risultato ancora, ma il doppio canale è già la regola: bottone premuto = bordo 2px + peso 700, non solo colore; misurato. |
| **P8** | Divulgazione progressiva, **stati vuoti che insegnano** | **applicato** | «Nessun nodo. Premi `N` e scrivi le coordinate»; «Niente di selezionato. Premi `G` per girare fra i nodi». Il pannello ha quattro blocchi, il limite che la ricerca indica. |
| **P9** | **Unità ed espressioni nei campi**, unità dichiarate in un punto | **a metà** | Le unità sono dichiarate in un punto (blocco «Unità») e ogni numero le porta («0 mm»). Ma `numeri.js`, `leggiNumero` accetta solo numeri puri: non `2.5*9.81`, non `30cm` — gli esempi testuali della ricerca. |
| **P10** | Leggibile a 8 metri | **non ancora esigibile** | Modo Presentazione, giornata 15. |

**Conto:** applicati 2, a metà 3, violato 1, non ancora esigibili 3, fuori scope 1.

Il violato e i tre «a metà» hanno **una sola causa comune**, ed è il punto di questo brief.

## 1. Il debito ha un nome, una data e una scadenza scaduta

Non è una scoperta di oggi. Il piano della giornata 10 lo dichiara nel codice, accanto a `chiedi()`:

> *Il debito, detto per intero perché non se ne perda il conto: `prompt` **blocca la pagina**,
> quindi la story 2 («il ghost dell'asta mentre digito») oggi è soddisfatta solo a metà — il ghost
> compare **dopo** la conferma della lunghezza. Si chiude con la palette, non prima.*
> `ponytail: prompt oggi, campo nella palette domani.`

La palette `⌘K` era la **giornata 11** (story 8). La giornata 11 è stata divisa in 11a, 11b, 11c e
la palette è finita nell'ultima. **Il rimedio pianificato è in ritardo, e nel frattempo il debito
paga interessi su quattro principi invece che su uno.**

Questa è la lettura corretta dei dolori che l'autore ha elencato il 07/09: non sono cinque problemi
diversi, sono **un rimedio non ancora arrivato**.

| dolore riferito | principio | rimedio già pianificato |
|---|---|---|
| «i dialog che bloccano» | P2 violato | palette `⌘K`, giornata 11 → 11c |
| «scrivere le coordinate a mano» | P9 a metà | campo con espressioni e unità, stessa palette |
| «non poter disegnare col mouse» | P4 a metà | ghost esteso, gizmo+snap (mappa fase→pattern, riga 165) |
| «non poter tornare indietro» | P4 a metà | `⌘Z`, giornata 11c; il magazzino c'è dalla 10 |

## 2. Le tre mosse, ognuna con la sua fonte

Nessuna di queste è una mia proposta. Sono la ricerca, applicata.

**a) Il campo sostituisce il dialog, e il ghost si muove mentre digiti.**
Fonte: P2 (Blender HIG, «pannello contestuale al posto di dialoghi») e P4 («*Ghost dell'asta/carico
durante il dialogo; conferma = Invio*», riga 84). Il ghost esiste già in `modo.js`: va esteso alla
creazione del nodo e agganciato a un campo, non a un `prompt`. **Questo è letteralmente il testo
della story 2**, che il piano della giornata 10 dichiara soddisfatta a metà.

**b) I campi accettano espressioni e unità.**
Fonte: P9, con gli esempi testuali della ricerca — `25 kN/m`, `2.5*9.81`, `30cm`. Oggi
`leggiNumero` li rifiuta tutti. Questo è ciò che rende sopportabile digitare le coordinate, più
delle coordinate relative: `3000` e `2.5*1200` costano lo stesso sforzo se il campo li accetta
entrambi.

*Aggiunta mia, dichiarata come tale:* le coordinate **relative** dal nodo selezionato (`→ 2262`)
non sono nella ricerca. La mappa fase→pattern (riga 165) dice «gizmo drag + snap + **digita
valore**», che è vicino ma non uguale. La propongo, e va decisa: è l'unico punto di questo brief
che non ha una fonte.

**c) Il mouse crea, con aggancio.**
Fonte: mappa fase→pattern, riga 165, «Nodi/aste: gizmo drag + snap + digita valore; hover
highlight; select→operate», con riferimento a Rhino Gumball e Blender HIG. Resta l'aiuto: la
tastiera primaria è confermata dall'autore il 07/09.

## 3. La superficie che manca del tutto: l'importazione

Fonte: `nova/importa.py`, che esiste e non ha interfaccia.

**Il caso principale è il rifiuto.** Sul prior vero (`lab_telaio_v2`) l'importatore scarta ogni
regione e restituisce un modello vuoto. Il modulo è esplicito: *«non è un errore: è un rilievo che
ha bocciato tutto, e la sola risposta utile è il modello vuoto più il perché di ogni bocciatura,
una riga per controllo»*. Una schermata disegnata per il caso felice e poi svuotata mostrerebbe un
buco; va disegnata al contrario.

**Il materiale è già strutturato per P1.** Ogni riga di `scartate` porta `regione`, `punti`,
`controllo`, `valore`, `soglia`, `unita`, `spiegazione` — una riga **per controllo fallito**, non
per regione, perché «*la regione bocciata da due controlli ha due ragioni, e riassumerle perderebbe
quella che l'utente può correggere*». È già la forma che P1 chiede: il numero col suo
contraddittore. Non serve inventare, serve mostrare.

**E le tre cose accanto al modello, non dentro:** `proposte_vincoli` da confermare una per una,
`mancano` come elenco esplicito di decisioni pendenti, `giunzioni` scartate col loro conto. Questa
onestà — *«non inventa nulla che il rilievo non abbia misurato»* — è la cosa più preziosa che NOVA
ha, ed è oggi invisibile perché la superficie non esiste.

**Nota di calendario, non di design:** l'importazione era stata messa nel cassetto «dopo la tesi»
il 06/09; l'autore ha riaperto la decisione il 07/09. La collocazione va mappata, non decisa qui.

## 4. Confini

**Fuori, e dichiarato:** grafici e diagrammi (13), modi di vibrare (14 — **orizzonte confermato
dall'autore, non scopo**), sezioni e materiali (11b), Check Model e corsa (12). Combinazioni NTC,
verifiche SLU/SLE e relazione §10.2.1 sono **fuori dalla v1** per decisione scritta nella spec.

**Intoccabile:** la palette «colonna tensegrale» e il doppio canale; l'impronta che non si ricalcola
in JS; la distinzione fra vincolo non dichiarato e dichiarato libero; il modello immutabile.

**Anti-obiettivi:** nessuna finestra modale che blocchi (P2); nessun numero senza contraddittore
quando diventa esigibile (P1); nessuna geometria dedotta che il rilievo non abbia misurato; nessun
secondo colore d'accento accanto al rosso.

## 5. Decisioni che chi costruisce non deve inventare

1. **Dove collocare l'importazione nel calendario T5.** Riaperta il 07/09, da mappare.
2. **Se anticipare la palette `⌘K`.** È il rimedio già pianificato per il debito più costoso, ed è
   in ritardo di una giornata e mezza. Anticiparla chiude P2 e metà di P3, P4 e P9 in un colpo.
3. **Le coordinate relative**: l'unica proposta senza fonte in questo documento.
4. **Se il rendiconto d'importazione sia una schermata a sé o un pannello.**
5. **Fino a dove spingere l'aggancio del mouse** — solo griglia, o anche allineamenti.
