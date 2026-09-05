# Confronto telaio NOVA (OpenSees) — solido CalculiX, MURO 1

Generato il 05/09/2026, Task 3 del piano T3 (`.superpowers/sdd/2026-09-06-t3-confronto-calculix/`).
Corsa NOVA su [`muro_1.nova.json`](muro_1.nova.json) (T2, Task 4), corsa `ccx` sul deck vero
`lab_telaio_v2/wall_model.inp` (non versionato, 2,5 MB). Tabella prodotta da `nova.confronto.confronta`
e `nova.confronto.esporta`: [`confronto.json`](confronto.json), [`confronto.csv`](confronto.csv),
[`confronto.tex`](confronto.tex) stanno nella stessa cartella.

## Provenienza

| voce | valore |
|---|---|
| commit NOVA | `9761e51` |
| run telaio | `026bce4d05e7` |
| run solido | `0cfd8bbf031b` |
| sha256 deck | `c8d0565587822bc5a4a5f2f83478f0f31cff3bd093d2813d97084c8bde973126` |
| OpenSees | Version 3.8.0 64-Bit (6e55293513192aa05c7e1205e66a5a1a1ed088c4) |
| CalculiX | CalculiX Version 2.22, Copyright(C) 1998-2024 Guido Dhondt |
| data corsa | 2026-09-05T09:37:18 |
| `mappa_casi` | `{"C1": "GRAVITA", "C2": "SPINTA_ORIZZONTALE", "C3": "CARICO_TOP", "nodi_sommita": [3, 4]}` |

**AVVERTENZA: verifica del codice, non validazione — non è una prova di carico.**

## Massa (prima riga, sempre)

| grandezza | telaio [t] | solido [t] | scarto | classe | bias atteso |
|---|---|---|---|---|---|
| massa | 0,7694 | 0,5551 | 27,86 % | lontano | zapatas e tamponatura fuori dal telaio |

Scarto dichiarato: **+27,86 %**, denominatore la massa del telaio (`0,7694 t`), la stessa convenzione
che `nova.confronto._scarto_classe` usa per ogni riga della tabella (non solo la massa). Atteso e non
un difetto: il telaio NOVA porta l'intera trave di fondazione e l'intera trave superiore sull'interasse
(2262 mm), mentre il solido non ha le zapatas (700×700, 2 pezzi) né la tamponatura — è più leggero del
volume nominale di tavola (0,4777 m³) e più leggero del telaio NOVA.

**Dubbio** (dichiarato, non aggiustato): il brief di Task 3 attendeva uno scarto di **+38,6 %**. Quel
numero viene dal denominatore opposto, `(0,7694 − 0,5551) / 0,5551`; il codice di Task 2 usa sempre la
massa del **telaio** come denominatore, dando **27,86 %**. Il numero misurato oggi (27,86 %) è quello
che il codice produce davvero e quello riportato qui; **+38,6 %** resta nel brief come stima fatta a
mano con l'altra convenzione.

## Reazioni, spostamenti di sommità (media su nodi 3-4), taglio di base

**AVVERTENZA: verifica del codice, non validazione.**

| grandezza | caso | telaio | solido | scarto | classe |
|---|---|---|---|---|---|
| reazione_x [N] | C1 | 0 | 0,00001705 | — | non_confrontabile |
| reazione_z [N] | C1 | 7545 | 4249 | 43,69 % | lontano |
| u_sommita_x [mm] | C1 | ≈ 0 [^zero] | −0,001161 | — [^zero] | lontano |
| u_sommita_z [mm] | C1 | −0,001897 | −0,02101 | 1008 % | lontano |
| reazione_x [N] | C2 | −754,5 | −0,00001480 | 100,00 % | lontano |
| reazione_z [N] | C2 | 7545 | 4249 | 43,69 % | lontano |
| u_sommita_x [mm] | C2 | 0,02790 | −0,0009278 | 103,3 % | lontano |
| u_sommita_z [mm] | C2 | −0,001897 | −0,02122 | 1019 % | lontano |
| reazione_x [N] | C3 | 0 | −0,00001648 | — | non_confrontabile |
| reazione_z [N] | C3 | 8745 | 5449 | 37,70 % | lontano |
| u_sommita_x [mm] | C3 | ≈ 0 [^zero] | −0,001515 | — [^zero] | lontano |
| u_sommita_z [mm] | C3 | −0,002840 | −0,03291 | 1059 % | lontano |
| taglio_base [N] | C2 | −754,5 | −0,00001480 | 100,00 % | lontano |

[^zero]: `u_sommita_x` del telaio a C1 e C3 è rumore in virgola mobile (≈ 5·10⁻¹⁶ mm, non zero esatto):
i due casi non hanno spinta orizzontale, il telaio è simmetrico e lo spostamento atteso è
esattamente zero. Lo scarto percentuale che il codice calcola su questa riga (23 e 15 cifre) è un
artefatto della divisione per un numero che non è zero solo per arrotondamento — riportato in tabella
com'è (il codice non filtra), letto qui come "non significativo", non aggiustato.

`reazione_z`, `u_sommita_z`, `taglio_base` sono `lontano` su tutti e tre i casi (bias atteso: tetraedri
lineari più rigidi → solido più deformabile del previsto in proporzione, ma qui il telaio è comunque
molto più deformabile in assoluto — coerente con l'assenza di zapatas/fondazioni deformabili sul lato
telaio e con la massa maggiore del telaio). `reazione_x` a C1/C3 è `non_confrontabile`: il telaio dà
zero esatto (nessuna spinta in quei casi), e lo scarto contro zero non ha un riferimento a cui
appoggiarsi (guardia simmetrica di `_scarto_classe`).

## Modi

**AVVERTENZA: verifica del codice, non validazione.**

| grandezza | telaio [Hz] | solido [Hz] | scarto | classe |
|---|---|---|---|---|
| f1 | 31,85 | 21,01 | 34,04 % | lontano |
| f2 | 20,45 | 34,01 | 66,28 % | lontano |
| f3 | 87,07 | 90,32 | 3,73 % | concorde |

| grandezza | telaio | solido | scarto | classe |
|---|---|---|---|---|
| massa_partecipante_x | 0 % | 0,03 % | — | non_confrontabile |
| massa_partecipante_y | 0 % | 74,54 % | — | non_confrontabile |
| massa_partecipante_z | 14,84 % | 0,15 % | 98,96 % | lontano |

### Lettura dei modi appaiati per direzione

`f1`/`f2`/`f3` in tabella appaiano lo stesso **nome** di asse fra telaio e solido (`x`↔`x`, `y`↔`y`,
`z`↔`z`: `nova/confronto.py` — `_ASSI_F`), ma i due assi `x` non sono la stessa direzione fisica su
questo deck: il telaio NOVA ha `x` lungo l'interasse (nel piano del telaio) e `y` fuori piano; il
solido ccx ha invece `x` lungo lo spessore del muro (fuori piano) e `y` lungo la larghezza (nel piano)
— bounding box del deck in `corsa-ccx-2026-09-05.md`, x 0…875 mm (spessore), y 0…2698 mm (larghezza).
La tabella sopra appaia quindi, per lettera, un modo nel piano del telaio con un modo fuori piano del
solido, e viceversa: leggerla per lettera è fuorviante su questo deck.

La lettura corretta, per direzione fisica:

- **nel piano** (`ux` del telaio ai nodi 3-4): telaio **31,85 Hz** ↔ ccx **f2 = 34,01 Hz** (massa
  partecipante `y` 77,5 %, la direzione larga del solido).
- **fuori piano** (`uy` del telaio ai nodi 3-4): telaio **20,45 Hz** ↔ ccx **f1 = 21,01 Hz** (massa
  partecipante `x` 72,2 %, lo spessore del solido).
- ccx **f3 = 42,79 Hz** è torsionale (rotazione attorno a z, massa partecipante traslazionale <
  0,01 % su ogni asse): non ha un modo del telaio piano da affiancare.

Le due coppie fisiche sono vicine (34,0 % e 66,3 % di scarto, entrambe `lontano` nella tabella
letterale sopra, che le confonde) — non `concorde`, ma è verifica del codice, non validazione: il
telaio NOVA non ha zapatas, tamponatura né la massa reale della fondazione del solido (stesso motivo
della riga massa). La riga `f3` della tabella (87,07 Hz telaio ↔ 90,32 Hz solido, `concorde`) è un
accostamento casuale fra due modi lontani nell'elenco (il quinto modo del telaio, dominante in `z`
verticale, e il quarto del solido, idem) e non è imparentata con la torsione di ccx a 42,79 Hz.

**Dubbio** (dichiarato, non corretto qui): l'appaiamento per lettera di `_righe_modi` presuppone che
gli assi locali del telaio e quelli globali del solido coincidano. È vero per le fixture di Task 2
(costruite apposta), falso su questo deck vero — dove il generatore MeshRec ha scelto un altro
orientamento globale. Non è nel perimetro di Task 3 cambiare l'algoritmo di appaiamento di
`nova/confronto.py` (Task 2, già in branch): qui si segnala e si legge a mano, come sopra.

## Cosa non è coperto

- Nessun CSV Abaqus per questo caso studio: le colonne/`classe_abaqus` sono tutte `non_confrontabile`
  per assenza di dato, non per un difetto.
- Nessuna prova di carico: ogni scarto qui è verifica del codice (telaio e solido descrivono geometrie
  diverse per costruzione — zapatas, tamponatura, interasse), non un giudizio sul modello reale.
