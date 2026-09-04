# Fixture: prior sintetico di MeshRec (`12_wall.json`)

Prior geometrico pieno per i test dell'importatore di NOVA (ticket #16).
Generato **una volta** da MeshRec su un telaio sintetico con membrature ben
separate: la nuvola vera del laboratorio dà un prior vuoto, questa no.
Ogni numero con **[M]** è misurato, non dichiarato.

## Provenienza

- Comando (dalla cartella di questo README):
  `/Users/mario/GitHub/Tesi/meshrec/.venv/bin/python genera.py`
- Repo Tesi (MeshRec): commit `cb6ef7ea182390200a0b79123c12f01aac7d638b`
  (`git -C /Users/mario/GitHub/Tesi rev-parse HEAD`, albero pulito) **[M]**
- Data di generazione: 2026-09-05
- Python: 3.12.13 del venv della tesi **[M]**
- sha256 di `12_wall.json`:
  `ff6acbfa3c2ed072bbc1bacd218bd677d1afac2475031f7fb612ee18c2bd9b76` **[M]**
  (`shasum -a 256 12_wall.json`, 193 039 byte **[M]**)
- Rilancio: due esecuzioni consecutive danno un file identico byte per byte
  (`cmp`) **[M]**. `sample_frame_surface` è chiamata con `noise=0.0, seed=0`.
- Serializzazione: `json.dumps(indent=1, sort_keys=True, allow_nan=False,
  default=float, ensure_ascii=False)`. MeshRec scrive con `indent=2` e senza
  chiavi ordinate (`meshrec/core/pipeline.py:192`); il formato dei float è lo
  stesso (`float.__repr__`), cambia solo l'impaginazione.

## Telaio sintetico

È `TELAIO` di `meshrec/tests/test_wall.py:33`, campionato con
`synth.sample_frame_surface(TELAIO, SPAZIATURA)` (`meshrec/core/synth.py:194`),
`SPAZIATURA = 20,0` mm (`test_wall.py:39`). Quattro prismi, origine e
dimensioni in mm (x, y, z):

| membratura         | origine              | dimensioni            | sezione nominale |
|--------------------|----------------------|-----------------------|------------------|
| montante sinistro  | (0, −90, 0)          | (200, 180, 1600)      | 200 × 180        |
| montante destro    | (1400, −130, 0)      | (200, 260, 1600)      | 200 × 260        |
| traverso superiore | (0, −70, 1600)       | (1600, 140, 300)      | 140 × 300        |
| traverso inferiore | (0, −170, −300)      | (1600, 340, 300)      | 340 × 300        |

**Attenzione al ticket #10.** Le «6 membrature» e le sezioni nominali
`[700×250, 250×250, 172×172, 140×175]` citate lì vengono da
`meshrec/casi/lab_telaio.yaml:116-121`: sono i **riscontri del provino
reale** (tavola MURO 1, obra 0021), non un telaio sintetico. Nella tesi non
esiste un telaio sintetico a 6 membrature (`docs/ricerca/05-archeologia-linea-integrata.md:151`
di NOVA lo dice già: «banco sintetico … 4 membrature»). Questa fixture dà
quindi **4 membrature, non 6**; il test dell'importatore che parla di «sei
membrature → 120 aste» va letto come «4 membrature → 80 aste» (20 fette
ciascuna **[M]**), oppure il ticket #10 va corretto.

## Contenuto misurato

Da `genera.py` e da una lettura del JSON con la stdlib:

- membrature: **4 [M]**
- giunzioni: **4 [M]** (ogni montante cede a ogni traverso: `cede` ∈ {2, 3},
  `resta` ∈ {0, 1})
- scartate: **0 [M]**
- fette per membratura: **20 [M]** (`sezioni_fette`, `quote_fette`)
- `riscontri`: tutti `null` (nessuna aspettativa dichiarata) **[M]**
- nessun `NaN`/`inf`: `allow_nan=False` non ha sollevato **[M]**

Sezioni misurate (`sezione`, mm, arrotondate a 0,1) e lunghezze **[M]**:

| indice | sezione        | lunghezza |
|--------|----------------|-----------|
| 0      | 140,0 × 308,5  | 1601,6    |
| 1      | 340,0 × 380,9  | 1603,3    |
| 2      | 260,0 × 250,5  | 1660,9    |
| 3      | 180,0 × 221,6  | 1600,2    |

L'ordine degli indici è quello della scomposizione, non quello di `TELAIO`
(0 = traverso superiore, 1 = traverso inferiore, 2 = montante destro,
3 = montante sinistro, letti dallo spessore in y). La seconda dimensione delle
sezioni è più larga del nominale perché il campionamento include le facce
compenetrate alle giunzioni, come `sample_frame_surface` dichiara.

Chiavi di primo livello del JSON: `cell_side`, `celle_occupate`, `centro`,
`chiusura_volume`, `giunzioni`, `membrature`, `pavimento_punti`,
`pavimento_trovato`, `plane_distance`, `plane_points`, `planes_found`,
`punti_dopo`, `punti_per_regione`, `regioni_trovate`, `residual_points`,
`riscontri`, `scartate`, `spessore_mediano`, `terna`.

Chiavi di ogni membratura: `asse`, `asse_ideale`, `base_sezione`, `contorno`,
`esiti`, `fuori_piombo_deg`, `indici`, `lunghezza`, `origine`, `punti`,
`quote_fette`, `riempimento`, `rigonfiamento`, `scarto_asse_deg`, `sezione`,
`sezione_dispersione`, `sezioni_fette`, `volume`.

## Test

`test_fixture.py` (pytest, solo stdlib): file presente, JSON valido, chiavi
`membrature` e `giunzioni`, `len(membrature) == 4`; più le due guardie del
generatore (zero membrature → non scrive e riporta le `scartate`; NaN →
`ValueError`, non scrive). Nessuna dipendenza da MeshRec.
