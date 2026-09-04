# Caso studio — telaio di laboratorio «MURO 1»

Tavola: [`muro_1.pdf`](muro_1.pdf) (Obra 0021, «PRUEBAS», NOV/2021, 1/4, Ing. J. A. Barros
Cabezas). Caricata da Mario il 05/09/2026. Tutti i numeri sotto sono letti dalla tavola **[V]**;
unità mm. **La tamponatura in blocchi («PARED», spessore 90) non entra nel modello**: NOVA
modella il solo telaio in cemento armato (decisione di Mario, 05/09/2026).

## Geometria (alzado, planta, corte A-A)

- Larghezza totale 2700 = 133 + 172 + 2090 + 172 + 133 (bordo, pilastro, luce netta, pilastro, bordo).
- Altezza: zapata 250 sotto quota 0; pilastri 1520 netti + trave superiore 175 = 1695; 1950 dalla
  base della zapata alla sommità (250 + 1520 + 180 in corte; 1945 in alzado: differenza di 5 mm fra
  le due viste, si prende 175 per la trave come nella tabella dei volumi).
- Pianta: due zapatas 700 × 700 alle estremità, trave inferiore 250 (larghezza) fra le due, pilastri
  172 × 172 sulle zapatas. In alzado i pilastri stanno a 133 dal bordo: asse a 133 + 86 = 219 dal
  bordo, **interasse 2262** (2090 netti + 172). In pianta i pilastri sembrano centrati sulle zapatas
  (asse a 350, interasse 2000): le due viste non coincidono. **Vale l'alzado (2262), da confermare
  con Mario.**

| membro | b × h | lunghezza | n. | volume cad. |
|---|---|---|---|---|
| zapata | 700 × 250 | 700 | 2 | 0,1225 m³ |
| viga inferior (trave di fondazione) | 250 × 250 | 1300 (fra le zapatas) | 1 | 0,0813 m³ |
| viga superior (trave superiore) | 140 × 175 | 2090 (netta) | 1 | 0,0512 m³ |
| columnas (pilastri) | 172 × 172 | 1695 | 2 | 0,0501 m³ |

Volume totale di calcestruzzo 0,4777 m³ (tabella della tavola; il solido di MeshRec misura 0,218 m³,
vedi spec «Fatti misurati»).

## Armature

| membro | longitudinali | staffe | copriferro |
|---|---|---|---|
| columna | 4 Ø12 (una per spigolo) | Ø4 passo 35 | non quotato: si assume 20 |
| viga superior | 2 Ø10 sup + 2 Ø8 inf | Ø4 passo 40 | non quotato: si assume 20 |
| viga inferior | 6 Ø16 (3 + 3, dal disegno della sezione) | Ø8 passo 100 | non quotato: si assume 25 |
| zapata | 20 Ø12 (Ø12, lunghezza 830) | — | — |

Tabella «Acero de refuerzo» della tavola: columnas 12 mm × 4 (lunghezza 2177) + staffe 5,5 mm × 53;
viga superior 8 mm × 2 (2575) + 10 mm × 2 (2695) + staffe 4 mm × 52; viga inferior 16 mm × 6 (3050)
+ staffe 8 mm × 13; zapata 12 mm × 20. Peso totale acciaio 70,71 kg.

## Materiali

Non dichiarati in tavola. Per il modello: `C25/30` e `B450C` **assunti** (`origine.nota`), con
`E`, ν, ρ presi dal deck `wall_model.inp` per il confronto (spec #11: 31 500 MPa, 0,2, 2,5493e-9).

## Come entra in NOVA (T2)

Telaio piano nel piano xz: trave di fondazione (250 × 250) sui due nodi al piede vincolati (le
zapatas non si modellano: incastro ai nodi di base, come il deck `BASE`), due pilastri 172 × 172,
trave superiore 140 × 175; luce dall'alzado, pilastri con `rotazione_deg: 0`; sezioni con le
armature qui sopra; `origine.sorgente: utente`, `riferimento: muro_1.pdf`. La statica con i tre
casi del deck e la modale sono l'oggetto del confronto (#11).
