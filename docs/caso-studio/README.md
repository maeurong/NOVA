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

## Modello NOVA (T2, task 4)

File: [`muro_1.nova.json`](muro_1.nova.json). Corsa vera su OpenSees 3.8.0 (`chiedi` +
`binario_opensees`, `tests/test_caso_studio.py`), esito **[M]** misurato il 05/09/2026.

### Geometria e assunzioni

- Nodi 1 `(0, 0, 0)` e 2 `(2262, 0, 0)`, sommità delle zapatas (non modellate: incastro pieno,
  come il deck `BASE`); nodi 3 `(0, 0, 1607,5)` e 4 `(2262, 0, 1607,5)`, asse della trave
  superiore (1520 netti + 175/2), **liberi** su tutti e sei i gradi — il telaio è 3D con `y`
  fuori piano, non un telaio piano incastrato in sommità: la modale deve poter trovare anche i
  modi fuori piano, come ccx (f1 fuori piano).
- Interasse **2262** (alzado), non la luce netta 2090 né i 2000 della pianta: le due viste della
  tavola non coincidono, vale l'alzado, da confermare con Mario (`origine.nota` sui nodi 1 e 2).
- Trave superiore fra i nodi 3 e 4 sull'**interasse** 2262, non sulla luce netta 2090: decisione
  del controller, coerente con l'uso dell'interasse anche per la trave di fondazione (sotto).
- Trave di fondazione (viga inferior) sull'intero interasse **2262** fra i nodi 1 e 2, non sui
  1300 mm «fra le zapatas» della tavola: le zapatas non ci sono nel modello, la trave le
  sostituisce per l'intera luce.
- Copriferro **assunto**: 20 mm per pilastri e trave superiore, 25 mm per la trave di fondazione
  (non quotati in tavola).
- Materiali **assunti** (non dichiarati in tavola): `C25/30` **personalizzato** con `E` 31 500 MPa,
  ν 0,2, densità 2,5493 · 10⁻⁹ t/mm³ — gli stessi valori del deck ccx `wall_model.inp`, per il
  confronto; `B450C` di catalogo.
- Carico in sommità: 1 200 N spalmati sulla trave superiore come carico distribuito
  (`q = −1200 / 2262` N/mm, direzione `z`), come la faccia `TOP` del solido ccx.
- `suddivisioni: 4` su ogni asta. Il modello aveva `1` come aggiramento di quello che sembrava
  un limite documentato del core: `modale.gradi_liberi` contava i soli nodi **dichiarati**, il
  tetto della scala «auto» restava sotto i gradi liberi veri e `massa_modale` usciva
  `non_passato` con le aste suddivise. Era un difetto del core, non un finding sul modello —
  `deck.scrivi` crea i nodi interni delle suddivisioni, dà `-mass` a ogni elemento e scrive
  `fix` per i soli nodi dichiarati, quindi quei nodi hanno massa e tre gradi liberi ciascuno.
  Corretto in questa ondata (`nova/modale.py`, `_traslazioni_libere`): il tetto di `muro_1` è
  **42** (2 nodi liberi × 3 + 12 nodi interni × 3), non 6.
- `masse_da_azioni` **vuoto**: nella modale pesa il solo peso proprio delle sezioni (la densità,
  che il deck mette in `-mass`). I 1 200 N del carico in sommità non entrano nella massa — scelta
  dichiarata, non una dimenticanza: il confronto con ccx guarda il telaio scarico. Chiederli
  significherebbe aggiungere una riga a `masse_da_azioni` con l'azione 3 e il suo coefficiente ψ.

### Massa: NOVA (sezioni nominali) contro il solido ccx

| voce | valore |
|---|---|
| massa telaio NOVA (Σ Rz del caso C1 / g) | **0,7694 t** |
| massa solido ccx (ρ · V della mesh, `corsa-ccx-2026-09-05.md`, corretta il 06/09) | 0,5551 t |
| scarto relativo | **+38,6 %** |

Atteso e non un difetto: il telaio NOVA porta l'intera trave di fondazione sull'interasse (2262,
non i 1300 mm «fra le zapatas») e la trave superiore sull'interasse (non la luce netta 2090),
mentre il solido ccx (0,2177 m³) è più piccolo del volume nominale della tavola (0,4777 m³ con le
zapatas). Il numero 0,4331 t che circolava era Σ Rz / g, cioè la massa **meno** la quota tributaria
dei nodi di `BASE` (vedi `corsa-ccx-2026-09-05.md`, corretto il 06/09/2026). Verifica del codice,
non validazione.

### Reazioni per caso (Σ sui nodi vincolati 1 e 2)

| caso | Σ Rx [N] | Σ Rz [N] | verdetto `reazioni` | verdetto `spostamenti` |
|---|---|---|---|---|
| C1 (gravità) | 0,00 | 7 545,44 | passato | passato |
| C2 (+ spinta 0,1 g) | −754,54 | 7 545,44 | passato | passato |
| C3 (+ carico in sommità) | 0,00 | 8 745,44 | passato | passato |

Equilibrio: Σ Rz(C1) = massa NOVA · g (entro 1e-6 relativo); Σ Rx(C2) = −0,10 · Σ Rz(C1) (la
spinta è 0,1 g della massa del telaio, entro 1e-6); Σ Rz(C3) = Σ Rz(C1) + 1 200 N (entro 1e-6) —
gli stessi tre passi del deck ccx (`GRAVITA`, `SPINTA_ORIZZONTALE`, `CARICO_TOP`).

### Modale (auto, `massa_modale: passato` al tetto di 42 modi)

Scala «auto» percorsa: `modi_provati` **[3, 6, 12, 24, 42]**, 42 modi estratti all'ultimo giro
(il tetto sono i gradi traslazionali liberi del deck). Cumulata al 42° modo: 100 % su x, y e z.

| modo NOVA | f [Hz] | direzione dominante (nodi 3-4) | ccx |
|---|---|---|---|
| 1 | 20,45 | uy (fuori piano) | f1 = 21,0 Hz, fuori piano |
| 2 | 31,85 | ux (nel piano) | f2 = 34,0 Hz, nel piano |
| 3 | 35,85 | uy (fuori piano) | f3 = 42,8 Hz, torsionale |

Il modo 2 (31,85 Hz, `ux` dominante ai nodi 3-4) è quello nel piano, da affiancare ai 34,0 Hz di
ccx: **verifica del codice, non validazione**, nessuna vicinanza attesa fra i due numeri — il
telaio NOVA è una trave di fondazione più due pilastri e una trave, senza zapatas, tamponatura né
la massa reale della fondazione ccx. Il codice trova comunque, fra i primi tre modi, un modo con
`ux` dominante e uno con `uy` dominante, che è quel che il confronto (#11) chiede di verificare.

Le frequenze sono quelle delle aste suddivise in quattro, e non sono le stesse della corsa con
`suddivisioni: 1` (18,64 / 24,46 / 28,90 Hz): con un solo elemento per membratura la massa
lumped di `forceBeamColumn -mass` si concentra ai quattro nodi del modello, che è un modello di
inerzia più grossolano. Massa totale e reazioni non cambiano — quelle le porta il carico, non la
discretizzazione — ed è la prova che le due corse descrivono lo stesso telaio.
