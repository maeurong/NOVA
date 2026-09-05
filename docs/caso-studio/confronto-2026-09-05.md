# Confronto telaio NOVA (OpenSees) — solido CalculiX, MURO 1

Generato il 05/09/2026, rigenerato dopo l'ondata finale di fix (branch `feat/confronto-calculix`,
`.superpowers/sdd/2026-09-06-t3-confronto-calculix/`). Corsa NOVA su [`muro_1.nova.json`](muro_1.nova.json)
(T2, Task 4), corsa `ccx` sul deck vero `lab_telaio_v2/wall_model.inp` (non versionato, 2,5 MB).
Tabella prodotta da `nova.confronto.confronta` e `nova.confronto.esporta`: [`confronto.json`](confronto.json),
[`confronto.csv`](confronto.csv), [`confronto.tex`](confronto.tex) stanno nella stessa cartella —
rigenerati da questi file, mai scritti a mano.

## Provenienza

| voce | valore |
|---|---|
| commit NOVA (codice che ha prodotto questi export) | `a188ac9` |
| run telaio | `6e46946c1f78` |
| run solido | `bb6466716691` |
| hash modello telaio | `a0768dcb8a9a00c7bdc55bfe906a324f55884608cb66a6cb22025e488f267c9c` |
| sha256 deck | `c8d0565587822bc5a4a5f2f83478f0f31cff3bd093d2813d97084c8bde973126` |
| OpenSees | Version 3.8.0 64-Bit (6e55293513192aa05c7e1205e66a5a1a1ed088c4) |
| CalculiX | CalculiX Version 2.22, Copyright(C) 1998-2024 Guido Dhondt |
| data corsa | 2026-09-05T10:27:51 |
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
| reazione_x [N] | C1 | 0 | 0,00001705 | — | non_confrontabile | telaio zero esatto (guardia simmetrica dello scarto) |
| reazione_z [N] | C1 | 7545 | 4249 | 77,60 % | lontano | — |
| u_sommita_x [mm] | C1 | ≈ 0 [^zero] | −0,001161 | — | non_confrontabile | valori sotto il pavimento di rumore per «mm» (< 0,001) |
| u_sommita_z [mm] | C1 | −0,001897 | −0,02101 | 90,97 % | lontano | — |
| reazione_x [N] | C2 | −754,5 | −0,00001480 | — | non_confrontabile | valori sotto il pavimento di rumore per «N» (< 0,01) |
| reazione_z [N] | C2 | 7545 | 4249 | 77,60 % | lontano | — |
| u_sommita_x [mm] | C2 | 0,02790 | −0,0009278 | — | non_confrontabile | valori sotto il pavimento di rumore per «mm» (< 0,001) |
| u_sommita_z [mm] | C2 | −0,001897 | −0,02122 | 91,06 % | lontano | — |
| reazione_x [N] | C3 | 0 | −0,00001648 | — | non_confrontabile | telaio zero esatto (guardia simmetrica dello scarto) |
| reazione_z [N] | C3 | 8745 | 5449 | 60,51 % | lontano | — |
| u_sommita_x [mm] | C3 | ≈ 0 [^zero] | −0,001515 | — | non_confrontabile | valori sotto il pavimento di rumore per «mm» (< 0,001) |
| u_sommita_z [mm] | C3 | −0,002840 | −0,03291 | 91,37 % | lontano | — |
| taglio_base [N] | C2 | −754,5 | −0,00001480 | — | non_confrontabile | valori sotto il pavimento di rumore per «N» (< 0,01) |

[^zero]: `u_sommita_x` del telaio a C1 e C3 è rumore in virgola mobile (≈ 5·10⁻¹⁶ mm, non zero
esatto): i due casi non hanno spinta orizzontale, il telaio è simmetrico e lo spostamento atteso
è esattamente zero. Con C8 (pavimento di rumore per unità) questa riga non finisce più in una
divisione con uno scarto assurdo: il codice la marca `non_confrontabile` con la ragione in
tabella («sotto il pavimento di rumore per «mm»»), non solo in questa nota.

`reazione_z`, `u_sommita_z`, `taglio_base` sono `lontano` sui casi dove il confronto ha un
riferimento (il denominatore è ora il solido, per il fix di §5: prima del fix era il telaio, e
gli scarti su queste stesse righe erano numeri diversi, non confrontabili con quelli qui). Bias
atteso: tetraedri lineari più rigidi → solido più deformabile in proporzione, ma qui il telaio è
comunque molto più deformabile in assoluto — coerente con l'assenza di zapatas/fondazioni
deformabili sul lato telaio e con la massa maggiore del telaio. `reazione_x`/`u_sommita_x`/`taglio_base`
sono `non_confrontabile`: o il telaio dà zero esatto (guardia simmetrica), o uno dei due valori
sta sotto il pavimento di rumore della sua unità — mai una divisione per un numero senza contenuto.

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

La massa partecipante è la **cumulata** dell'ultimo modo (C1 dell'ondata finale), non la quota
del solo ultimo modo: sul telaio arriva al 100 % (42 modi, il tetto dei gradi liberi traslazionali
del deck — `README.md` §Modale), sul solido al 94-96 % (40 modi, `corsa-ccx-2026-09-05.md`
§Modale: «95 % / 96 % / 94 %», stesso ordine di grandezza dei numeri qui sopra).

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

## Cosa non è coperto

- Nessun CSV Abaqus per questo caso studio: le colonne/`classe_abaqus` sono tutte `non_confrontabile`
  per assenza di dato, non per un difetto.
- Nessuna prova di carico: ogni scarto qui è verifica del codice (telaio e solido descrivono geometrie
  diverse per costruzione — zapatas, tamponatura, interasse), non un giudizio sul modello reale.
