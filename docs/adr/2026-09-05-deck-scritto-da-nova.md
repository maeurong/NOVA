---
status: accepted
data: 2026-09-05
---

# Il deck `.tcl` lo scrive NOVA, non `opensees.scrivi_tcl`

`meshrec/core/opensees.py` entra in NOVA verbatim da Tesi @ `9716f6e` e porta un `scrivi_tcl` completo (fibre, `-GJ`, `geomTransf` con guardie), ma quel generatore deduce i vincoli dalla geometria (`_al_piede`), scrive il solo peso proprio come carico nodale (`_peso_nodale`) e accetta due soli casi (`GRAVITA`, `MODALE`): tre cose che il modello dati di NOVA contraddice (vincoli dichiarati per nodo, cinque tipi di carico, un caso per azione o combinazione). Decidiamo che il deck lo scrive `nova/deck.py`, riusando da `opensees.py` solo le letture (`_ultima_riga`, `leggi_frequenze`, `leggi_massa_modale`, `conta_avvisi`), le costanti (`NOME_FINE`, `MARCA_FINE`, `NOME_REGISTRO`) e `_costante_torsionale`, e lasciando `scrivi_tcl` nella copia senza chiamarlo.

## Opzioni considerate

- **Adattare la copia.** Aggiungere a `scrivi_tcl` i `fix` dichiarati, i carichi e i casi. Scartata: rompe la regola «copie verbatim con impronta sha256, adattamenti in `nova/`» che protegge la tracciabilità verso la tesi; e la funzione è già lunga, con la deduzione del piede intrecciata alla scrittura.
- **Costruire un `Telaio` di MeshRec dal modello NOVA e chiamare `scrivi_tcl`** (la via del prototipo #9, `da_nova`). Scartata: `Telaio` non ha posto per vincoli dichiarati, carichi nodali/distribuiti/cedimenti né combinazioni; ogni adattamento sarebbe una traduzione con perdita, e i recorder per stazione (`section k force`) mancherebbero comunque.
- **Scrivere il deck in NOVA** (scelta). Il generatore segue il modello dati e non il contrario; la copia resta intatta e verificabile; il non lineare di T4 (`Concrete02`/`Steel02`, `DisplacementControl`) si aggiunge qui senza toccare `meshrec/`.

## Conseguenze

- `nova/deck.py` ha un solo consumatore (`nova/corsa.py`) e nessun contratto con `scrivi_tcl`: le due scritture possono divergere, e lo fanno apposta.
- La terna locale (`vecxz = e2`, `localy = e1`, misurata in MeshRec il 30/08/2026) e la costante torsionale sono le uniche convenzioni ereditate: vanno dichiarate nel docstring di `deck.py`, non date per note.
- Un lettore che trova `scrivi_tcl` inutilizzato accanto a `deck.py` deve leggere questo file, non «ripristinare il riuso».
- Piano: `docs/superpowers/plans/2026-09-05-t0-t1-scaffold-modello-sidecar-statica.md`, Task 4. Spec: «Generazione del deck e adattamenti».
