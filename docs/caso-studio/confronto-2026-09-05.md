# Confronto telaio NOVA (OpenSees) — solido CalculiX, MURO 1

Generato il 05/09/2026, **rigenerato il 05/09/2026 dopo il fix #25** e di nuovo a fine T4
(branch `feat/non-lineare`, `.superpowers/sdd/2026-09-06-t4-non-lineare/`): il ramo elastico del
deck itera con `Newton` invece di `Linear`, e gli **spostamenti** del telaio cambiano. Reazioni,
massa e frequenze **no**: quelle le porta il carico, non l'algoritmo. L'ultima passata
(`516cefd`) non muove nessun numero della tabella — muove `hash_modello`, che ora esclude i
default (§«Che cosa è cambiato»), e rifà **tutte** le celle del documento dal JSON: quelle di
`u_sommita_x` C2 erano rimaste alla corsa di prima del fix #25. Corsa NOVA su [`muro_1.nova.json`](muro_1.nova.json)
(T2, Task 4), corsa `ccx` sul deck vero `lab_telaio_v2/wall_model.inp` (non versionato, 2,5 MB).
Tabella prodotta da `nova.confronto.confronta` e `nova.confronto.esporta`: [`confronto.json`](confronto.json),
[`confronto.csv`](confronto.csv), [`confronto.tex`](confronto.tex) stanno nella stessa cartella —
rigenerati da questi file, mai scritti a mano.

## Provenienza

| voce | valore |
|---|---|
| commit NOVA (codice che ha prodotto questi export) | `516cefd` |
| run telaio | `f9ea10a953ef` |
| run solido | `150e375a6ab0` |
| hash modello telaio | `9fa9b29a2eb61384ceec4041ed49a7c5675471ba2a0bacca135dd512f4608db3` |
| sha256 deck | `c8d0565587822bc5a4a5f2f83478f0f31cff3bd093d2813d97084c8bde973126` |
| OpenSees | Version 3.8.0 64-Bit (6e55293513192aa05c7e1205e66a5a1a1ed088c4) |
| CalculiX | CalculiX Version 2.22, Copyright(C) 1998-2024 Guido Dhondt |
| data corsa | 2026-09-05T17:26:24 |
| `mappa_casi` | `{"C1": "GRAVITA", "C2": "SPINTA_ORIZZONTALE", "C3": "CARICO_TOP", "nodi_sommita": [3, 4], "assi": {"x": "y", "y": "x", "z": "z"}}` |

**AVVERTENZA: verifica del codice, non validazione — non è una prova di carico.**

## Massa (prima riga, sempre)

| grandezza | telaio [t] | solido [t] | scarto | classe | bias atteso |
|---|---|---|---|---|---|
| massa | 0,7694 | 0,5551 | 38,62 % | lontano | zapatas e tamponatura fuori dal telaio |

Scarto dichiarato: **+38,62 %**, denominatore la massa del **solido** (il riferimento), non più
il telaio: `nova.confronto._scarto_classe` usa sempre l'altro termine (solido o Abaqus) come
riferimento, per ogni riga della tabella. Atteso e non un difetto: il telaio NOVA porta l'intera
trave di fondazione e l'intera trave superiore sull'interasse (2262 mm), mentre il solido non ha
le zapatas (700×700, 2 pezzi) né la tamponatura — è più leggero del volume nominale di tavola
(0,4777 m³) e più leggero del telaio NOVA.

## Reazioni, spostamenti di sommità (media su nodi 3-4), taglio di base

**AVVERTENZA: verifica del codice, non validazione.**

| grandezza | caso | telaio | solido | scarto | classe | ragione (se non_confrontabile) |
|---|---|---|---|---|---|---|
| reazione_x [N] | C1 | 0 | 0,00001705 | — | non_confrontabile | entrambi i valori sotto il pavimento di rumore per «N» (< 0.01) |
| reazione_z [N] | C1 | 7545 | 4249 | 77,60 % | lontano | — |
| u_sommita_x [mm] | C1 | 0 [^zero] | −0,001161 | — | non_confrontabile | il telaio vale 0 mm, sotto il pavimento (< 0.0001); il riferimento -0,001161: i due non concordano, la percentuale non è un numero utile |
| u_sommita_z [mm] | C1 | −0,002077 | −0,02101 | 90,11 % | lontano | — |
| reazione_x [N] | C2 | −754,5 | −0,00001480 | — | non_confrontabile | il riferimento vale -0,00001480 N, sotto il pavimento (< 0.01); il telaio -754,5: i due non concordano, la percentuale non è un numero utile |
| reazione_z [N] | C2 | 7545 | 4249 | 77,60 % | lontano | — |
| u_sommita_x [mm] | C2 | 0,02791 | −0,0009278 | 3108 % | lontano | — |
| u_sommita_z [mm] | C2 | −0,002077 | −0,02122 | 90,21 % | lontano | — |
| reazione_x [N] | C3 | 0 | −0,00001648 | — | non_confrontabile | entrambi i valori sotto il pavimento di rumore per «N» (< 0.01) |
| reazione_z [N] | C3 | 8745 | 5449 | 60,51 % | lontano | — |
| u_sommita_x [mm] | C3 | 0 [^zero] | −0,001515 | — | non_confrontabile | il telaio vale 0 mm, sotto il pavimento (< 0.0001); il riferimento -0,001515: i due non concordano, la percentuale non è un numero utile |
| u_sommita_z [mm] | C3 | −0,003021 | −0,03291 | 90,82 % | lontano | — |
| taglio_base [N] | C2 | −754,5 | −0,00001480 | — | non_confrontabile | il riferimento vale -0,00001480 N, sotto il pavimento (< 0.01); il telaio -754,5: i due non concordano, la percentuale non è un numero utile |

[^zero]: `u_sommita_x` del telaio a C1 e C3 è **zero esatto** dopo il fix #25 (prima del fix era
rumore in virgola mobile, ≈ 5·10⁻¹⁶ mm): i due casi non hanno spinta orizzontale, il telaio è
simmetrico e lo spostamento atteso è esattamente zero — con `Newton` al posto di `Linear` la
simmetria si chiude senza residuo. Il pavimento di rumore per unità (`mm` sotto 0,0001, fix round C, `nova/confronto.py:64`) marca queste
righe `non_confrontabile` con una di due ragioni distinte, mai «entrambi sotto» qui: il telaio è
sotto il pavimento ma il solido (−0,001161 mm a C1, −0,001515 mm a C3) è un valore vero, sopra
soglia — la ragione lo dice esplicitamente («il telaio vale …, sotto il pavimento […]; il
riferimento …: i due non concordano»), non un «entrambi sotto» generico.

`reazione_z`, `u_sommita_z`, `taglio_base` sono `lontano` sui casi dove il confronto ha un
riferimento (il denominatore è ora il solido, per il fix di §5: prima del fix era il telaio, e
gli scarti su queste stesse righe erano numeri diversi, non confrontabili con quelli qui). Bias
atteso: tetraedri lineari più rigidi → solido più deformabile in proporzione, ma qui il telaio è
comunque molto più deformabile in assoluto — coerente con l'assenza di zapatas/fondazioni
deformabili sul lato telaio e con la massa maggiore del telaio.

`u_sommita_x` C2 non è più `non_confrontabile`: col pavimento a 0,0001 mm (fix round C, `nova/confronto.py:64`; prima era
0,001) né il telaio (0,02791 mm) né il solido (−0,0009278 mm) restano sotto soglia, ed esce
`lontano` con uno scarto vero (3108 %, denominatore il solido) — un segnale, non rumore: col vecchio
pavimento il lato solido sarebbe finito sotto soglia e la riga sarebbe stata scartata come
`non_confrontabile` per un valore che non era rumore.

`reazione_x` e `taglio_base` a C2 restano `non_confrontabile`, ma non per rumore reciproco: il
telaio riporta una spinta orizzontale vera (−754,5 N, 0,1 g della massa), il solido ccx sotto lo
stesso passo di spinta orizzontale **non la riporta** (−0,00001480 N, sotto il pavimento di rumore
per «N»). È un fatto del deck ccx da guardare — la corsa non estrae una reazione orizzontale
misurabile sotto spinta — non un difetto del confronto: la ragione lo dice nominando i due valori,
non chiamandolo genericamente «rumore».

## Modi

**AVVERTENZA: verifica del codice, non validazione.**

| grandezza | telaio [Hz] | solido [Hz] | scarto | classe |
|---|---|---|---|---|
| f1 | 31,85 | 34,01 | 6,362 % | vicino |
| f2 | 20,45 | 21,01 | 2,633 % | concorde |
| f3 | 87,07 | 90,32 | 3,594 % | concorde |

| grandezza | telaio | solido | scarto | classe |
|---|---|---|---|---|
| massa_partecipante_x | 100,0 % | 95,66 % | 4,538 % | concorde |
| massa_partecipante_y | 100,0 % | 96,14 % | 4,012 % | concorde |
| massa_partecipante_z | 100,0 % | 93,94 % | 6,448 % | vicino |

La massa partecipante è la **cumulata** dell'ultimo modo, non la quota del solo ultimo modo: sul
telaio arriva al 100 % (42 modi, il tetto dei gradi liberi traslazionali del deck — `README.md`
§Modale), sul solido al 94-96 % (40 modi, `corsa-ccx-2026-09-05.md` §Modale: «95 % / 96 % / 94 %»,
stesso ordine di grandezza dei numeri qui sopra).

### Lettura dei modi

`mappa_casi["assi"] = {"x": "y", "y": "x", "z": "z"}` dichiara che l'asse `x` del telaio (nel
piano del muro) corrisponde all'asse `y` del solido, e viceversa: la tabella sopra appaia quindi
`f1`/`f2`/`f3` **per direzione fisica**, non per lettera. Motivo geometrico: il telaio NOVA ha `x`
lungo l'interasse (nel piano) e `y` fuori piano, mentre il solido ccx ha `x` lungo lo spessore del
muro (fuori piano) e `y` lungo la larghezza (nel piano) — bounding box del deck, x 0…875 mm
(spessore), y 0…2698 mm (larghezza) (`corsa-ccx-2026-09-05.md`). Con `assi` dichiarato: `f1` è la
coppia **nel piano** (31,85 Hz telaio ↔ 34,01 Hz solido), `f2` la coppia **fuori piano** (20,45 Hz
↔ 21,01 Hz), `f3` la coppia sull'asse verticale `z` (87,07 Hz ↔ 90,32 Hz). Nessun accoppiamento a
mano: lo fa `nova.confronto._righe_modi` con la dichiarazione degli assi.

## Che cosa è cambiato con #25

Le righe che si muovono sono **tutti e sei** gli spostamenti di sommità: i tre verticali, i due
`u_sommita_x` a C1/C3 che diventano zero esatto, e `u_sommita_x` a C2, che cambia sull'ultima
cifra significativa. Le altre — massa, reazioni, frequenze, masse partecipanti — sono **byte per
byte** quelle di prima.

| riga | prima di #25 | dopo #25 | scarto contro il solido |
|---|---|---|---|
| `u_sommita_z` C1 | −0,001897 mm | **−0,002077 mm** | 90,97 % → **90,11 %** |
| `u_sommita_z` C2 | −0,001897 mm | **−0,002077 mm** | 91,06 % → **90,21 %** |
| `u_sommita_z` C3 | −0,002840 mm | **−0,003021 mm** | 91,37 % → **90,82 %** |
| `u_sommita_x` C1, C3 | ≈ 5·10⁻¹⁶ mm | **0 esatto** | invariato (non confrontabile) |
| `u_sommita_x` C2 | 0,02790 mm | **0,02791 mm** | 3107 % → **3108 %** |

L'ultima riga è quella che il documento aveva sbagliato: le celle di `u_sommita_x` C2 erano
rimaste al JSON di prima di #25 mentre tutte le altre erano state rifatte. Da questa passata le
celle si generano dal JSON in blocco, così una riga non può restare indietro da sola.

`+9,5 %` sulla freccia verticale: `algorithm Linear` non chiudeva l'equilibrio sul telaio con
`eleLoad -beamUniform` su `forceBeamColumn`, e la sottostimava. Il telaio resta molto più
deformabile del solido, e la lettura della tabella non cambia.

L'**impronta del modello** è cambiata due volte senza che [`muro_1.nova.json`](muro_1.nova.json)
sia stato toccato: `a0768dcb…` → `2bf56c67…` quando T4 ha aggiunto campi al modello dati
(`legami`, `passi`, `impostazioni_analisi`), perché `modello.impronta` serializzava il modello
**con** i suoi default, e poi `2bf56c67…` → `9fa9b29a…` con il fix che toglie i default dal
canonico (`model_dump(exclude_defaults=True)`). Questa è l'**ultima migrazione dell'impronta**:
da qui in avanti un campo aggiunto allo schema non muove più `hash_modello` di nessun modello.
Ogni `hash_modello` scritto prima si legge come stantio, ed è la volta buona.

## Cosa non è coperto

- Nessun CSV Abaqus per questo caso studio: le colonne/`classe_abaqus` sono tutte `non_confrontabile`
  per assenza di dato, non per un difetto.
- Nessuna prova di carico: ogni scarto qui è verifica del codice (telaio e solido descrivono geometrie
  diverse per costruzione — zapatas, tamponatura, interasse), non un giudizio sul modello reale.
