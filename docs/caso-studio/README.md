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

File: [`muro_1.nova.json`](muro_1.nova.json), impronta
`9fa9b29a2eb61384ceec4041ed49a7c5675471ba2a0bacca135dd512f4608db3` (codice `516cefd`; l'impronta
esclude i default da questo commit — vedi `confronto-2026-09-05.md` §«Che cosa è cambiato»).
Corsa vera su OpenSees 3.8.0 (`chiedi` + `binario_opensees`, `tests/test_caso_studio.py`), esito
**[M]** misurato il 05/09/2026.

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

Le reazioni sono **le stesse** di prima del fix #25: le porta il carico, non l'algoritmo. Gli
**spostamenti no** — il ramo elastico del deck itera con `Newton` invece di `Linear`, che su un
telaio con `eleLoad -beamUniform` su `forceBeamColumn` non chiudeva l'equilibrio, e la freccia
verticale di sommità cresce del 9,5 %. Il prima/dopo riga per riga sta in
[`confronto-2026-09-05.md`](confronto-2026-09-05.md) §«Che cosa è cambiato con #25».

Spostamenti dopo #25 (corsa del 05/09/2026, OpenSees 3.8.0, codice `516cefd`), `u_max` sul
nodo 3 e verdetto `spostamenti` con la soglia nuova sulla luce (#26, `soglia_luce` 1/10, luce
minima 1 607,5 mm — il pilastro; il nodo peggiore per u/L è qui lo stesso di `u_max`):

| caso | u_max [mm] | u/L | verdetto |
|---|---|---|---|
| C1 | 0,002091 | 1,30 · 10⁻⁶ | passato |
| C2 | 0,02822 | 1,76 · 10⁻⁵ | passato |
| C3 | 0,003054 | 1,90 · 10⁻⁶ | passato |

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

## Pushover (T4)

**AVVERTENZA: verifica del codice, non validazione.** La tavola non documenta nessuna prova
ai pistoni: nessun numero qui è confrontato con una misura di laboratorio.

File: [`muro_1_pushover.nova.json`](muro_1_pushover.nova.json), impronta
`86a95ff5edb0d18adf161f0cd78182ad32abf6dc50ed088e64818091bf74c1b3` — **lo stesso telaio** di
`muro_1.nova.json`, con altre analisi. Sono due file e non uno per un motivo di codice, non di
comodità: `deck._legami_dichiarati` sceglie i legami per **tutto** il deck, quindi una statica
`legami: fibre` dentro `muro_1.nova.json` avrebbe reso a fibre anche i casi C1/C2/C3 del
confronto con ccx, che è lineare elastico. `tests/test_caso_studio.py::test_il_file_della_spinta_e_lo_stesso_telaio_con_altre_analisi`
pinza che i due file differiscano nelle **sole** analisi.

Analisi del file della spinta:

- statica `legami: fibre` sui casi `C1` e `C3`, 10 passi;
- pushover `uniforme` (forze ∝ massa lumped dei nodi liberi), nodo di controllo **3**,
  direzione **`ux`**, incremento **0,5 mm**, `spostamento_max` **60 mm**,
  `caso_gravita: "C1"`.

`spostamento_max` è **misurato**, non scelto a tavolino: a 40 mm (il valore di partenza) il
taglio alla base cresce ancora e il massimo cade sull'ultimo passo, cioè la curva non ha
ancora un ramo calante; a 60 mm il massimo è al passo 109 e il ramo calante c'è; a 120 mm la
curva **continua a non cadere** (240 passi, 72 115,2 N al passo 109, 69 763,7 N alla fine).
Si ferma a 60 mm: è dove la curva dice quel che ha da dire.

### La curva — misure del 05/09/2026, OpenSees 3.8.0, codice `516cefd`

Curva completa in [`pushover.csv`](pushover.csv) (`passo;spostamento_mm;taglio_base_N;algoritmo`),
scritta dai `passi[]` della corsa e mai a mano; il test la rimette a confronto passo per passo
(`::test_la_curva_esportata_e_quella_della_corsa`).

| grandezza | valore |
|---|---|
| passi convergenti | **120**, da 0,5 mm, nessun dimezzamento |
| algoritmi | `Newton` ovunque tranne i passi **18, 36, 89, 113**, che chiudono con `KrylovNewton` |
| `u0` (gravità prima della spinta, nodo 3, `ux`) | 0,0002494 mm |
| spostamento passo 1 → passo 120 | 0,500 → 60,000 mm (relativi a `u0`) |
| taglio alla base **massimo** | **72 115,2 N al passo 109**, a 54,5 mm |
| taglio alla base all'ultimo passo | 70 932,9 N (98,4 % del massimo) |
| **caduta** | **`null`** — la spinta arriva a `spostamento_max` senza cadere |
| verdetto `convergenza` (`caso: "pushover"`) | `passato` |
| verdetto `spostamenti` (`caso: "pushover"`) | `passato` con avviso: u/L = 0,0400 al nodo 4, luce minima 1 607,5 mm |
| tempo della corsa | ≈ 2 s |
| `risultati.nova.risultati.json` | ≈ 774 kB (≈ 495 kB sul filo di `/api/risultati`, senza indentazione); 514 file `.out` |

I byte sono arrotondati apposta: il JSON porta i percorsi del deck e del registro, che stanno in
una cartella temporanea diversa a ogni corsa, e le ultime centinaia di byte cambiano senza che
cambi un numero della curva.

La caduta è `null` e va detto per esteso: **non** significa che il telaio regge 60 mm. Significa
che il modello continua a convergere — `Steel02` non ha rottura e `Concrete02` tiene la
resistenza residua `fpcu` — mentre lo **stato delle sezioni** dice che i piedi dei pilastri
hanno già ceduto. È il motivo per cui lo stato è un canale separato dalla convergenza.

### Stato delle sezioni all'ultimo passo (60 mm)

68 stazioni (4 aste suddivise in 4, 17 stazioni per asta):

| canale | passo 1 | passo 120 |
|---|---|---|
| calcestruzzo | 68 `elastica` | 37 `fessurata`, 27 `elastica`, **4 `schiacciata`** |
| acciaio | 68 `elastica` | 62 `elastica`, 2 `snervata`, **4 `rotta`** |

Le quattro stazioni schiacciate — e sono le stesse quattro con l'acciaio `rotta` — sono i **piedi
dei pilastri** (aste 2 e 3, stazione 0, cioè i nodi 1 e 2 incastrati) e i **due estremi della
trave superiore** (asta 4, stazioni 0 e 16, cioè i nodi 3 e 4): il meccanismo del telaio a nodi
fissi, esattamente dove ci si aspetta le cerniere. Il taglio alla base smette di crescere a
54,5 mm, che è dove quel ceduto si fa sentire sulla curva.

## Confronto

Tabella completa telaio NOVA ↔ solido CalculiX sul deck vero: [`confronto-2026-09-05.md`](confronto-2026-09-05.md)
(`confronto.json`/`.csv`/`.tex` nella stessa cartella, rigenerati da `nova.confronto.confronta`/`esporta`
a fine T4 (commit `516cefd`), mai a mano;
`tests/test_caso_studio.py::test_confronto_sul_deck_vero`).
`confronto.tex` richiede `\usepackage{booktabs}` nel documento che lo include (i comandi
`\toprule`/`\midrule`/`\bottomrule` vengono da lì).

- Massa: telaio 0,7694 t, solido (ρ·V del deck) 0,5551 t, scarto **+38,62 %** (denominatore il
  solido, il riferimento — zapatas e tamponatura fuori dal telaio).
- Modi, appaiati per direzione fisica via `mappa_casi["assi"]` (non per lettera d'asse: il telaio e
  il solido non condividono l'orientamento degli assi su questo deck, vedi il `.md`): nel piano
  31,85 Hz telaio contro 34,01 Hz ccx (scarto 6,4 %); fuori piano 20,45 Hz telaio contro 21,01 Hz
  ccx (scarto 2,6 %); asse verticale 87,07 Hz telaio contro 90,32 Hz ccx (scarto 3,6 %).
- Massa partecipante (cumulata): ~100 % sul telaio (42 modi, il tetto dei gradi liberi), ~94-96 %
  sul solido (40 modi, `corsa-ccx-2026-09-05.md`).
