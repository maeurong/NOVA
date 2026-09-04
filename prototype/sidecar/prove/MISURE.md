# Misure del sidecar — OpenSees 3.8.0 ARM, 04/09/2026

Cartella: `/var/folders/2t/qtg_pmb11f33dhg53xjlmx580000gn/T/nova-sidecar-sa8_z48r`

## Verifica del binario

```
{
 "esito": "ok",
 "percorso": "/Users/mario/.local/bin/OpenSees",
 "motivo": null
}
```

## sano

**Col Check Model davanti**

- esito: `ok` in 0.04 s; fasi: ['check model', 'scrivo il .tcl e lancio OpenSees', 'leggo i recorder']
- reazioni al piede su ['N1', 'N2', 'N3']: Σ Rz = 55273.395 N
- verdetti del solutore: `reazioni`=passato, `vincolo_in_pianta`=non_applicabile, `autovalori`=passato, `avvisi`=passato, `spostamenti`=passato, `massa_modale`=non_passato, `picco`=non_applicabile
- modi: 1: 5.854 Hz, 2: 8.784 Hz, 3: 11.104 Hz
- deck: `/var/folders/2t/qtg_pmb11f33dhg53xjlmx580000gn/T/nova-sidecar-sa8_z48r/sano/13_telaio.tcl`

## asta_lunghezza_zero

**Col Check Model davanti**

- esito: `rifiutato` in 0.00 s; fasi: ['check model']
- `nodi_coincidenti` → non_passato: 1 coppie entro 1 mm: [('N6', 'N7')]
- `aste_lunghezza_zero` → non_passato: aste piu' corte di 1 mm: ['A6']
- `moti_rigidi` → non_applicabile: si legge dopo la corsa dalla prima frequenza (controllo `autovalori`)
- motivo: 

**Senza Check Model (`forza: true`), cosa fa OpenSees**

- esito: `ok` (fase: -) in 0.03 s
- OpenSees ha girato lo stesso: reazioni su ['N1', 'N2', 'N3'], Σ Rz = -635725.858 N; verdetti: `reazioni`=non_passato, `vincolo_in_pianta`=non_applicabile, `autovalori`=passato, `avvisi`=passato, `spostamenti`=passato, `massa_modale`=non_passato, `picco`=non_applicabile
- modi: 1: 6.976 Hz, 2: 11.239 Hz, 3: 11.326 Hz
- returncode 0; avvisi nel log: 0

## nodo_libero

**Col Check Model davanti**

- esito: `rifiutato` in 0.00 s; fasi: ['check model']
- `nodi_liberi` → non_passato: nodi senza aste: ['N7']
- `moti_rigidi` → non_applicabile: si legge dopo la corsa dalla prima frequenza (controllo `autovalori`)
- motivo: 

**Senza Check Model (`forza: true`), cosa fa OpenSees**

- esito: `ok` (fase: -) in 0.03 s
- OpenSees ha girato lo stesso: reazioni su ['N1', 'N2', 'N3'], Σ Rz = 41608542258.800 N; verdetti: `reazioni`=non_passato, `vincolo_in_pianta`=non_applicabile, `autovalori`=passato, `avvisi`=non_passato, `spostamenti`=non_passato, `massa_modale`=non_passato, `picco`=non_applicabile
- modi: 1: 0.110 Hz, 2: 0.110 Hz, 3: 0.110 Hz
- returncode 0; avvisi nel log: 0

## nodi_coincidenti

**Col Check Model davanti**

- esito: `rifiutato` in 0.00 s; fasi: ['check model']
- `nodi_coincidenti` → non_passato: 1 coppie entro 1 mm: [('N5', 'N7')]
- `moti_rigidi` → non_applicabile: si legge dopo la corsa dalla prima frequenza (controllo `autovalori`)
- motivo: 

**Senza Check Model (`forza: true`), cosa fa OpenSees**

- esito: `ok` (fase: -) in 0.03 s
- OpenSees ha girato lo stesso: reazioni su ['N1', 'N2', 'N3'], Σ Rz = 70241.653 N; verdetti: `reazioni`=passato, `vincolo_in_pianta`=non_applicabile, `autovalori`=passato, `avvisi`=passato, `spostamenti`=passato, `massa_modale`=non_passato, `picco`=non_applicabile
- modi: 1: 4.425 Hz, 2: 6.524 Hz, 3: 7.946 Hz
- returncode 0; avvisi nel log: 0
