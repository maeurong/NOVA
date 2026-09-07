# Confronto telaio NOVA (OpenSees) — solido CalculiX, MURO 1

Rigenerato il 07/09/2026 dopo il cambio d'interasse (2262 → 2000, decisione di Mario del
06/09/2026: vale la pianta — pilastri centrati sulle zapatas — non l'alzado, le due viste
della tavola non coincidono). Corsa NOVA su [`muro_1.nova.json`](muro_1.nova.json) (casi
Z1/C1/C2/C3), corsa `ccx` sul deck vero `lab_telaio_v2/wall_model.inp` (non versionato, 2,5 MB,
**non toccato da questo cambio**). Tabella prodotta da `nova.confronto.confronta` e
`nova.confronto.esporta`: [`confronto.json`](confronto.json), [`confronto.csv`](confronto.csv),
[`confronto.tex`](confronto.tex) stanno nella stessa cartella — rigenerati da questi file, mai
scritti a mano.

## Provenienza

| voce | valore |
|---|---|
| commit NOVA (albero al momento della corsa, prima del commit di questo lavoro) | `0b81606` |
| run telaio | `a0269271362e` |
| run solido | `78943eeab16e` |
| hash modello telaio | `f723261ee14a47869eaf9528fbfc28aa27d608aae19a55614349d84104b7d2ec` |
| sha256 deck | `c8d0565587822bc5a4a5f2f83478f0f31cff3bd093d2813d97084c8bde973126` (identico al 05/09: il deck ccx non è cambiato) |
| OpenSees | Version 3.8.0 64-Bit (6e55293513192aa05c7e1205e66a5a1a1ed088c4) |
| CalculiX | CalculiX Version 2.22, Copyright(C) 1998-2024 Guido Dhondt |
| data corsa | 2026-09-07T08:59:35 |
| `mappa_casi` | `{"C1": "GRAVITA", "C2": "SPINTA_ORIZZONTALE", "C3": "CARICO_TOP", "nodi_sommita": [3, 4], "assi": {"x": "y", "y": "x", "z": "z"}}` |

**AVVERTENZA: verifica del codice, non validazione — non è una prova di carico.**

## Massa (prima riga, sempre)

| grandezza | telaio [t] | solido [t] | scarto | classe | bias atteso |
|---|---|---|---|---|---|
| massa | 0,7093 | 0,5551 | 27,79 % | lontano | zapatas e tamponatura fuori dal telaio |

Scarto sceso da +38,62 % (interasse 2262, 05/09) a +27,79 %: la massa del **telaio** è scesa con
l'interasse più corto (meno calcestruzzo su trave di fondazione e trave superiore), la massa del
**solido** non si è mossa (0,5551 t, stesso deck, stesso sha256) — atteso, non un difetto.

## Reazioni, spostamenti di sommità (media su nodi 3-4), taglio di base

**AVVERTENZA: verifica del codice, non validazione.**

| grandezza | caso | telaio | solido | scarto | classe | ragione (se non_confrontabile) |
|---|---|---|---|---|---|---|
| reazione_x [N] | C1 | 0 | 0,0000170 | — | non_confrontabile | entrambi i valori sotto il pavimento di rumore per «N» (< 0.01) |
| reazione_z [N] | C1 | 6 955,6 | 4 248,6 | 63,72 % | lontano | — |
| u_sommita_x [mm] | C1 | 0 | −0,001161 | — | non_confrontabile | il telaio vale 0 mm, sotto il pavimento (< 0.0001); il riferimento -0,001161: i due non concordano |
| u_sommita_z [mm] | C1 | −0,001948 | −0,02101 | 90,73 % | lontano | — |
| reazione_x [N] | C2 | −695,6 | −0,0000148 | — | non_confrontabile | il riferimento vale -0,00001480 N, sotto il pavimento (< 0.01); il telaio -695,6: i due non concordano |
| reazione_z [N] | C2 | 6 955,6 | 4 248,6 | 63,72 % | lontano | — |
| u_sommita_x [mm] | C2 | 0,02522 | −0,0009278 | 2 818 % | lontano | — |
| u_sommita_z [mm] | C2 | −0,001948 | −0,02122 | 90,82 % | lontano | — |
| reazione_x [N] | C3 | 0 | −0,0000165 | — | non_confrontabile | entrambi i valori sotto il pavimento di rumore per «N» (< 0.01) |
| reazione_z [N] | C3 | 8 155,6 | 5 448,6 | 49,68 % | lontano | — |
| u_sommita_x [mm] | C3 | 0 | −0,001515 | — | non_confrontabile | il telaio vale 0 mm, sotto il pavimento (< 0.0001); il riferimento -0,001515: i due non concordano |
| u_sommita_z [mm] | C3 | −0,002892 | −0,03291 | 91,21 % | lontano | — |
| taglio_base [N] | C2 | −695,6 | −0,0000148 | — | non_confrontabile | il riferimento vale -0,00001480 N, sotto il pavimento (< 0.01); il telaio -695,6: i due non concordano |

Reazioni verticali più basse che il 05/09 (interasse più corto → meno massa → meno Rz), ma la
lettura non cambia: `u_sommita_x`/`reazione_x`/`taglio_base` restano `non_confrontabile` dove il
solido non riporta un valore misurabile sopra il pavimento di rumore, `lontano` altrove — stesso
schema, numeri diversi.

## Modi

**AVVERTENZA: verifica del codice, non validazione.**

| grandezza | telaio [Hz] | solido [Hz] | scarto | classe |
|---|---|---|---|---|
| f1 (nel piano) | 33,68 | 34,01 | 0,980 % | concorde |
| f2 (fuori piano) | 21,60 | 21,01 | 2,825 % | concorde |
| f3 (asse verticale) | 105,93 | 90,32 | 17,28 % | **vicino** (era `concorde`, 3,59 %, a interasse 2262) |

| grandezza | telaio | solido | scarto | classe |
|---|---|---|---|---|
| massa_partecipante_x | 100,0 % | 95,66 % | 4,538 % | concorde |
| massa_partecipante_y | 100,0 % | 96,14 % | 4,012 % | concorde |
| massa_partecipante_z | 100,0 % | 93,94 % | 6,448 % | vicino |

Il solido (colonna destra, entrambe le tabelle) è **identico** al 05/09: stesso deck, stessa
mesh, stesse frequenze. A muoversi è solo il telaio — più corto, più rigido: `f1` e `f2` salgono
di circa 2-6 Hz e restano `concorde`/vicino a ccx come prima; `f3` (asse verticale, flessione
delle travi sull'interasse più corto) sale da 87,07 a 105,93 Hz e la classe peggiora da
`concorde` a `vicino`. **Verifica del codice, non validazione**: nessuna vicinanza è attesa fra
telaio e solido su questo asse, la classe è un'etichetta automatica su uno scarto, non un
giudizio sul modello.

## Cosa non è coperto

- Nessun CSV Abaqus per questo caso studio: le colonne/`classe_abaqus` sono tutte `non_confrontabile`
  per assenza di dato, non per un difetto.
- Nessuna prova di carico: ogni scarto qui è verifica del codice (telaio e solido descrivono geometrie
  diverse per costruzione — zapatas, tamponatura, interasse), non un giudizio sul modello reale.
- Il lato solido non è stato rigenerato: [`corsa-ccx-2026-09-05.md`](corsa-ccx-2026-09-05.md) resta
  la fotografia della scansione, e i suoi numeri non dipendono dall'interasse del telaio.
